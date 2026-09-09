## 2025-02-14 - Fix SSRF vulnerability in FastAPI client
**Vulnerability:** The `FastApiAiClient` passed the client-supplied `imageUrl` directly to an external FastAPI AI service without asserting it resolved to a public IP. An attacker could provide a malicious URL (like `http://169.254.169.254/latest/meta-data/` or a local network IP), potentially causing the FastAPI service to execute a Server-Side Request Forgery (SSRF) and leak internal data.
**Learning:** Even if your primary backend doesn't download the file itself, forwarding unsanitized URLs to internal microservices/APIs can shift the SSRF vulnerability to them.
**Prevention:** Always validate and enforce public-only IP resolution on client-provided URLs via utilities like `assertPublicHttpUrl` before forwarding them to any service, or ensure the downstream service runs in an isolated network environment with strict egress rules.

## 2023-10-27 - Rate Limiting on Resource Intensive Endpoints
**Vulnerability:** The `/diseases/analyze` endpoint lacked strict rate limiting, despite downloading images and calling external AI APIs (Hugging Face).
**Learning:** Endpoints that perform expensive operations (network I/O, heavy computation, third-party API calls) are prime targets for DoS/resource exhaustion if left with default or no rate limits.
**Prevention:** Always apply `@Throttle` with strict limits (e.g., 5 req/min) to resource-intensive endpoints, particularly those processing media or interfacing with external ML models. Use `ThrottlerGuard` at the controller level in NestJS.

## 2025-02-14 - Fix missing rate limit on AI job endpoints
**Vulnerability:** The `/reports` (create) and `/reports/:id/reprocess` endpoints spawned expensive asynchronous jobs (Hugging Face or FastAPI analysis) but lacked strict individual rate limiting, relying only on the default generous `ThrottlerGuard` limit. This allowed an attacker to overwhelm the AI service or exhaust background processor queues.
**Learning:** Endpoints that trigger expensive asynchronous background tasks (like `ReportsProcessor.schedule`) need strict rate limits just as much as endpoints that block synchronously. A controller-level `ThrottlerGuard` is often too permissive by default.
**Prevention:** Apply explicit `@Throttle` decorators with strict limits (e.g., 5 req/min) to any endpoint that enqueues resource-intensive tasks, such as image processing or external AI API calls.
