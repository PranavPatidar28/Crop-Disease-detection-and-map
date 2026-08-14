## 2024-05-30 - Missing SSRF guard in FastApiAiClient
**Vulnerability:** FastApiAiClient (`apps/backend/src/modules/ai/clients/fastapi.client.ts`) forwards user-supplied image URLs directly to a downstream FastAPI service without validating them.
**Learning:** The URL validation (using `assertPublicHttpUrl`) was implemented in the Hugging Face client but forgotten in the alternative FastAPI client, which performs similar logic. This allowed potential SSRF against the FastAPI server.
**Prevention:** Always validate caller-supplied URLs (via `assertPublicHttpUrl`) on the Node.js backend before passing them to any downstream service that performs HTTP fetching, regardless of the active AI provider.
