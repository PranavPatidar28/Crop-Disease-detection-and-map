/**
 * Lightweight logger abstraction for the backend.
 *
 * NestJS already provides per-class `Logger` for module-scoped logging via
 * `nestjs-pino`. This module is for **non-Nest contexts** — scripts, seed
 * helpers, and one-off utilities that don't have DI access.
 *
 * Production: forwards `warn` / `error` to stderr; `debug` / `info` are no-op.
 * Development: forwards everything to console.
 *
 * Replace the body to wire Sentry / Datadog later.
 */

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  debug(...args: unknown[]): void {
    if (!isProduction) console.debug(...args);
  },
  info(...args: unknown[]): void {
    if (!isProduction) console.info(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
