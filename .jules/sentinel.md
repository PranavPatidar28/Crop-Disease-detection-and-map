## 2024-05-15 - Prevent Information Leakage in AllExceptionsFilter
**Vulnerability:** The backend's `AllExceptionsFilter` leaked internal non-HTTP exception details (`exception.message` and `exception.name`) in the response body.
**Learning:** Returning detailed error messages and exception types for unhandled non-HTTP errors exposes internal application state and potential attack vectors to clients.
**Prevention:** Ensure that global exception handlers return generic error messages (e.g., 'Internal server error') for unhandled, non-HTTP exceptions, while securely logging the full details on the server.
