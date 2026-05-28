import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env, STORAGE_KEYS } from '@/constants';
import { secureStorage } from '@/services/storage/secure';
import { logger } from '@/utils/logger';

const TIMEOUT_MS = 15_000;
const MAX_5XX_RETRIES = 1;

interface RetryConfig extends InternalAxiosRequestConfig {
  /** internal flag — increments on each retry attempt */
  __retryCount?: number;
}

// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented entry point; the lint plugin's heuristic is wrong here.
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.get(STORAGE_KEYS.authToken);
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/**
 * Listener for 401 responses. Wired by the auth provider to logout on
 * unauthorized. Kept as a setter to avoid a circular import between the api
 * client and the auth store.
 */
let onUnauthorized: (() => void | Promise<void>) | null = null;
export const setUnauthorizedHandler = (handler: () => void | Promise<void>): void => {
  onUnauthorized = handler;
};

/**
 * Normalized error shape used across the app. The auth flow, the offline
 * queue, and any feature hook that catches an api error can branch on `code`
 * cleanly without sniffing axios internals.
 */
export interface NormalizedApiError {
  code: 'NETWORK_OFFLINE' | 'TIMEOUT' | 'UNAUTHORIZED' | 'CONFLICT' | 'BAD_REQUEST' | 'SERVER_ERROR' | 'UNKNOWN';
  status: number | null;
  message: string;
  cause: unknown;
}

function classify(error: AxiosError): NormalizedApiError {
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return {
      code: 'NETWORK_OFFLINE',
      status: null,
      message: "You're offline. We saved your work and will sync when you're back.",
      cause: error,
    };
  }
  if (error.code === 'ECONNABORTED') {
    return {
      code: 'TIMEOUT',
      status: null,
      message: 'The request took too long. Please try again.',
      cause: error,
    };
  }
  const status = error.response?.status ?? null;
  if (status === 401) {
    return { code: 'UNAUTHORIZED', status, message: 'Session expired. Please sign in again.', cause: error };
  }
  if (status === 409) {
    return { code: 'CONFLICT', status, message: 'Conflicting state — refresh and try again.', cause: error };
  }
  if (status && status >= 400 && status < 500) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    return { code: 'BAD_REQUEST', status, message: msg ?? error.message, cause: error };
  }
  if (status && status >= 500) {
    return { code: 'SERVER_ERROR', status, message: 'Server error. Please try again shortly.', cause: error };
  }
  return { code: 'UNKNOWN', status, message: error.message, cause: error };
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status ?? null;

    // Retry once on 5xx with jittered backoff (network blips during demos)
    if (
      config &&
      status !== null &&
      status >= 500 &&
      (config.__retryCount ?? 0) < MAX_5XX_RETRIES &&
      // Don't retry POSTs that are not idempotent (we use clientId for /reports
      // so it's safe; everything else is GET-only, so this guard is symbolic)
      (config.method?.toLowerCase() !== 'post' || (config.data?.toString().includes('"clientId"')))
    ) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      const delayMs = 200 + Math.floor(Math.random() * 200);
      logger.warn('[api] 5xx retry', config.method?.toUpperCase(), config.url, `attempt=${config.__retryCount}`);
      await new Promise((r) => setTimeout(r, delayMs));
      return apiClient.request(config);
    }

    if (env.isDev) {
      logger.warn(
        '[api]',
        error.config?.method?.toUpperCase(),
        error.config?.url,
        status,
        error.message,
      );
    }

    if (status === 401 && onUnauthorized) {
      try {
        await onUnauthorized();
      } catch {
        /* noop */
      }
    }

    // Attach the normalized shape so callers can branch without re-classifying.
    const normalized = classify(error);
    (error as AxiosError & { normalized?: NormalizedApiError }).normalized = normalized;

    return Promise.reject(error);
  },
);

/** Helper: pull the normalized shape off any axios error caught from `apiClient`. */
export function normalizeApiError(error: unknown): NormalizedApiError {
  // eslint-disable-next-line import/no-named-as-default-member -- axios.isAxiosError is the documented entry point.
  if (axios.isAxiosError(error)) {
    const tagged = error as AxiosError & { normalized?: NormalizedApiError };
    if (tagged.normalized) return tagged.normalized;
    return classify(error);
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', status: null, message: error.message, cause: error };
  }
  return { code: 'UNKNOWN', status: null, message: 'Unexpected error', cause: error };
}
