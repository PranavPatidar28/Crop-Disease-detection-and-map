## 2024-12-16 - Missing Global Rate Limiter in NestJS
**Vulnerability:** The application lacked rate limiting on critical public endpoints (e.g., `/auth/send-otp`), leaving it susceptible to SMS spamming and brute-force guessing attacks.
**Learning:** NestJS does not include a global rate limiter out of the box. `@nestjs/throttler` must be explicitly installed and configured in `AppModule`. Additionally, sensitive endpoints like authentication need stricter overrides compared to the global baseline.
**Prevention:** Always configure `@nestjs/throttler` as a baseline defense-in-depth measure, and use the `@Throttle()` decorator to enforce tighter limits on high-risk routes.
