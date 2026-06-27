## 2026-06-27 - Information Leakage in Exception Filter
**Vulnerability:** Generic `Error` instances in `AllExceptionsFilter` exposed their original `message` and `name` properties to API consumers, potentially leaking stack traces or internal implementation details.
**Learning:** By default, unhandled generic errors should never expose their details to the client. NestJS's default behavior handles this correctly, but custom exception filters often mistakenly re-expose these properties.
**Prevention:** In global exception filters, always log the actual `Error` details internally but only return a generic response (like "Internal server error") for non-HttpException errors.
