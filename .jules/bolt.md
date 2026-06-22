## 2024-05-30 - Initial Bolt Journal

## 2026-06-22 - Optimize Date Comparisons in Mobile Frontend Loops
**Learning:** Instantiating `new Date()` inside loops for timestamp comparison or sorting adds significant memory and processing overhead. Timestamps from Prisma are ISO 8601 strings, which are directly comparable via lexicographical sort (e.g. `a < b`, `a > b`, `a === b`).
**Action:** Use direct string comparison (`a > b ? -1 : a < b ? 1 : 0`) for sorting or compare ISO 8601 strings directly against a pre-computed `cutoffIso` inside map/filter functions instead of converting strings to Date objects. Avoid `localeCompare` as it introduces unicode collation overhead.
