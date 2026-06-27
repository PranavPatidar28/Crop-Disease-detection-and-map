1. Fix information leakage in `AllExceptionsFilter` (`apps/backend/src/common/filters/all-exceptions.filter.ts`) by preventing generic `Error` properties from being returned to the client.
   - Remove `message = exception.message;` and `error = exception.name;` for generic errors, so they fall back to the secure defaults ("Internal server error").
2. Add a journal entry to `.jules/sentinel.md` documenting this security learning.
   - Format: `## YYYY-MM-DD - [Title]`, `**Vulnerability:** [What you found]`, `**Learning:** [Why it existed]`, `**Prevention:** [How to avoid next time]`.
3. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
   - Run linter, typecheck, and build to verify functionality.
4. Submit the change.
   - Commit with a descriptive message and PR title.
