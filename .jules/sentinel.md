## 2025-01-20 - Prevent WebSocket Disconnects with Rate Limiting
**Vulnerability:** Adding generic rate-limiting globally (via APP_GUARD) can severely disrupt real-time capabilities in NestJS, specifically causing unintended WebSocket drops.
**Learning:** By enforcing `ThrottlerGuard` specifically at the controller level instead of globally, it mitigates disruption to socket gateways. Sensitive endpoints such as OTP are also inherently better served by customized controller-level limits.
**Prevention:** Apply `@UseGuards(ThrottlerGuard)` strictly on specific HTTP controllers, especially when managing applications that rely on `@nestjs/websockets`.
