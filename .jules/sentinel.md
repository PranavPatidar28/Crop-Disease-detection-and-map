## 2024-06-12 - Missing Rate Limiting on Authentication Endpoints
**Vulnerability:** The public authentication endpoints (`/auth/send-otp` and `/auth/verify-otp`) had no rate limiting applied.
**Learning:** These endpoints were vulnerable to SMS bombing and brute-forcing of OTPs because they did not restrict the number of requests per user or IP.
**Prevention:** Always implement a global rate limiting guard (e.g., using `@nestjs/throttler`) and apply stricter rate limits to sensitive routes like login, password reset, or OTP generation/verification.
