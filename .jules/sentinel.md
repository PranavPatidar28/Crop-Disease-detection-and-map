## 2024-05-18 - Stop Information Leakage in Generic Exception Filters
**Vulnerability:** The NestJS `AllExceptionsFilter` exposed `exception.message` and `exception.name` to the client for non-HTTP `Error` instances.
**Learning:** This exposes internal server error details, which may contain sensitive stack details, to the client interface.
**Prevention:** Generic, non-HTTP exceptions should return a standard generic error message ("Internal server error") and name ("InternalServerError"), while the actual error details are logged securely on the server-side.
