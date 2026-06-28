## 2026-06-28 - Missing Rate Limiting on Authentication Endpoints
**Vulnerability:** The `/auth/send-otp` and `/auth/verify-otp` endpoints lacked rate limiting, making the application susceptible to brute-force attacks and SMS abuse.
**Learning:** We must apply `@nestjs/throttler` at the controller level (e.g., via `@UseGuards(ThrottlerGuard)`) rather than globally (`APP_GUARD`) in this application, because applying it globally will break WebSocket connections.
**Prevention:** Always implement `ThrottlerGuard` specifically on HTTP controllers, particularly those handling authentication, and use `@Throttle` to set stricter limits for sensitive endpoints.
