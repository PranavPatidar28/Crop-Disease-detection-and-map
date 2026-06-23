## 2024-10-27 - Added Rate Limiting to OTP Endpoints
**Vulnerability:** Missing rate limiting on sensitive authentication endpoints (`/auth/send-otp` and `/auth/verify-otp`).
**Learning:** Without rate limiting, these endpoints are vulnerable to SMS bombing (repeatedly requesting OTPs to exhaust quota or harass users) and OTP brute-forcing (repeatedly guessing the 6-digit OTP).
**Prevention:** Always apply strict rate limiting (e.g., using `@nestjs/throttler`) to public-facing authentication endpoints. Ensure `ThrottlerGuard` is applied at the controller level rather than globally to avoid breaking WebSocket connections.
