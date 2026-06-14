## 2024-05-18 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** The application was missing rate limiting, specifically on the authentication endpoints (`/auth/send-otp` and `/auth/verify-otp`).
**Learning:** This made the system vulnerable to brute-force attacks on OTP codes and SMS/OTP spamming, as there was nothing preventing an attacker from making a large number of rapid requests.
**Prevention:** We added a global rate limit of 100 requests per minute using `@nestjs/throttler` to prevent abusive behavior across all endpoints, including the critical authentication flows.
