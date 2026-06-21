## 2024-05-01 - ISO 8601 Timestamp Sorting Optimization
**Learning:** Instantiating `new Date()` inside sorting loops is extremely slow (e.g. 182ms vs 7ms for 10k items). Timestamps returned by Prisma/the backend are provided as ISO 8601 strings, which are lexicographically sortable.
**Action:** When filtering or sorting large lists of records by date on the frontend, use direct lexicographical string comparison with basic operators (e.g., `<`, `>`) rather than instantiating `new Date()` inside loops or using `.localeCompare()` to dramatically improve performance.
