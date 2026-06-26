## 2024-05-15 - Prevent Information Leakage in Exception Filters
**Vulnerability:** Generic Exception Filters returning raw Error instance messages and names to HTTP clients.
**Learning:** Default fallback handling for generic `Error` instances often naively copies `exception.message` and `exception.name` to the response body. In production, this can inadvertently expose database queries, internal file paths, or third-party service details to end users.
**Prevention:** In global exception filters (e.g., NestJS `ExceptionFilter`), always hardcode a generic response (like 'Internal server error') for unhandled exceptions, while logging the actual `exception.message` and `exception.stack` internally for debugging.
