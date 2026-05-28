import { isAxiosError } from 'axios';

export interface NormalizedError {
  message: string;
  statusCode?: number;
  code?: string;
  cause?: unknown;
}

export function normalizeError(error: unknown): NormalizedError {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message ?? error.message;
    return {
      message,
      statusCode: error.response?.status,
      code: error.code,
      cause: error,
    };
  }
  if (error instanceof Error) return { message: error.message, cause: error };
  return { message: 'Unexpected error occurred', cause: error };
}
