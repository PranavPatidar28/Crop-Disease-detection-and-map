## 2026-06-17 - Added Rate Limiting to Authentication Endpoints
**Vulnerability:** The public authentication endpoints (`/auth/send-otp` and `/auth/verify-otp`) were missing rate limits, leaving the system vulnerable to brute force and spamming attacks.
**Learning:** These endpoints were created but lacked defense-in-depth protection despite handling sensitive OTP operations.
**Prevention:** Implement and configure `@nestjs/throttler` to provide generic rate-limiting globally (100 req/min) and specific, stricter limits for the authentication endpoints (3/min and 5/min respectively).
