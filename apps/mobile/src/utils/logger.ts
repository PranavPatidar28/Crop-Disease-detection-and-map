/**
 * Lightweight logger abstraction.
 *
 * - In development: forwards to `console.*` so logs show up in Metro / Expo.
 * - In production: no-op for `debug` / `info`, but still keeps `warn` / `error`
 *   so something like Sentry can pick them up later.
 *
 * Drop-in swap target for Sentry / LogRocket / Datadog: replace the body of
 * `warn` and `error` with a call to the SDK. Every consumer in the app reads
 * through this module, so there's exactly one file to change.
 */

const isDev = __DEV__;

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) console.debug(...args);
  },
  info(...args: unknown[]): void {
    if (isDev) console.info(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
