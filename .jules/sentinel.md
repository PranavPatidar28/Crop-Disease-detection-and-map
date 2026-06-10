## 2023-12-04 - [Missing Rate Limiting on Auth Endpoints]
**Vulnerability:** The authentication endpoints (`/auth/send-otp` and `/auth/verify-otp`) lacked rate limiting, making the application vulnerable to brute-force OTP guessing and SMS-pumping attacks.
**Learning:** The `@nestjs/throttler` dependency was absent and rate limiting was not configured either globally or on sensitive routes.
**Prevention:** Always implement rate limiting on authentication and sensitive endpoints. Install `@nestjs/throttler` (v6+ requires TTL in milliseconds) and configure it globally, then override with stricter limits on specific endpoints like OTP generation and verification.
