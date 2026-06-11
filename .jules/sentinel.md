## 2026-06-11 - [Added rate limiting to auth endpoints]
**Vulnerability:** Missing rate limiting on sensitive endpoints such as OTP generation and verification.
**Learning:** Implementing `ThrottlerModule` and `ThrottlerGuard` from `@nestjs/throttler` provides out-of-the-box brute-force and spam protection for critical routes. In NestJS v6+ the `ttl` value expects milliseconds, not seconds.
**Prevention:** In the future, always apply rate limiting for sensitive endpoints, preferably at the global `APP_GUARD` level with appropriate `ttl` and `limit` settings.
