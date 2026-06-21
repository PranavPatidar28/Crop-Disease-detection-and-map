
## 2024-05-18 - Information Leakage in Global Exception Filter
**Vulnerability:** The NestJS `AllExceptionsFilter` was capturing generic, unhandled `Error` instances and exposing their `message` and `name` properties directly to the client response. This can easily leak sensitive internal details, such as database query structures, failing file paths, or internal logic states.
**Learning:** Generic global exception handlers that aren't strict about returning normalized error payloads can inadvertently leak backend secrets when lower-level internal errors bubble up uncaught. Even though `HttpException` provides safe encapsulation, generic `Error` instances often contain developer-centric stack context meant only for logging.
**Prevention:** Unhandled generic exceptions must only be logged server-side and should always return a sanitized, non-specific response to the client (e.g., "Internal server error") to enforce defense-in-depth and avoid information leakage.
