## 2023-10-24 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Missing rate limiting on the `/auth/send-otp` and `/auth/verify-otp` endpoints allowed for potential brute forcing and abuse.
**Learning:** Even though the app uses mock/demo data for now, not having rate limiting opens up endpoints (especially authentication ones) to potential abuse that could lead to DoS or SMS spam/costs in production.
**Prevention:** Implement global rate limiting by default (e.g., using `@nestjs/throttler`), and configure stricter limits for sensitive endpoints like login, OTP generation, and verification.
