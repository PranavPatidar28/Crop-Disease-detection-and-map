## 2023-10-27 - Rate Limiting on Resource Intensive Endpoints
**Vulnerability:** The `/diseases/analyze` endpoint lacked strict rate limiting, despite downloading images and calling external AI APIs (Hugging Face).
**Learning:** Endpoints that perform expensive operations (network I/O, heavy computation, third-party API calls) are prime targets for DoS/resource exhaustion if left with default or no rate limits.
**Prevention:** Always apply `@Throttle` with strict limits (e.g., 5 req/min) to resource-intensive endpoints, particularly those processing media or interfacing with external ML models. Use `ThrottlerGuard` at the controller level in NestJS.
