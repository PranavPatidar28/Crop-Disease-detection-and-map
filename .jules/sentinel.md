## 2025-06-30 - Add Rate Limiting to Auth Endpoints
**Vulnerability:** Missing rate limiting on authentication endpoints (e.g. `send-otp`). This can lead to brute force attacks on OTP generation and validation endpoints, or SMS pumping fraud in production.
**Learning:** The NestJS backend lacked rate limiting on sensitive routes, likely due to it being an MVP. `@nestjs/throttler` was not installed, meaning no global or route-specific protection was active. Also note that memory indicated `ThrottlerGuard` should be applied at the controller level when WebSockets are used.
**Prevention:** Always install and configure `@nestjs/throttler` and apply `ThrottlerGuard` to authentication-related controllers by default in NestJS projects.
