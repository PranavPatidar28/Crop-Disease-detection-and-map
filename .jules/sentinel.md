## 2023-10-27 - [Sentinel's Daily Process]
**Vulnerability:** Missing rate limiting on sensitive `sendOtp` and `verifyOtp` endpoints.
**Learning:** Found that these authentication endpoints were vulnerable to brute-force and SMS-spam attacks since there was no built-in rate-limiter in the `apps/backend`.
**Prevention:** Configured `@nestjs/throttler` globally, but applied strict rate limits directly to the sensitive auth endpoints using the `@Throttle` decorator.
