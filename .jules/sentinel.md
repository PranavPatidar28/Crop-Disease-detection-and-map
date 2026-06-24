
## 2024-03-20 - Adding Rate Limiting Defensively in NestJS with WebSockets
**Vulnerability:** The authentication endpoints (`/auth/send-otp` and `/auth/verify-otp`) were exposed without rate limits, opening the application to brute force and denial of service attacks.
**Learning:** Applying a global `APP_GUARD` rate limiter in a NestJS application that also supports WebSockets via `@nestjs/websockets` breaks the socket connections unless explicitly excluded or configured separately.
**Prevention:** Always apply the `ThrottlerGuard` at the controller or route level when integrating `@nestjs/throttler` in hybrid applications containing WebSockets to avoid unintended side-effects.
