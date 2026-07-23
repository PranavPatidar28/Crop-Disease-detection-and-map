## 2026-07-23 - Missing Rate Limit on Resource-Intensive ML Endpoint
**Vulnerability:** Missing rate limiting on the `/diseases/analyze` endpoint.
**Learning:** Resource-intensive endpoints, particularly those that download images or call external AI/ML APIs like Hugging Face, must be protected with `@UseGuards(ThrottlerGuard)` at the controller level to prevent resource exhaustion and DoS.
**Prevention:** Ensure all controllers with endpoints that perform heavy computations, external API calls, or image processing are explicitly decorated with `@UseGuards(ThrottlerGuard)`.
