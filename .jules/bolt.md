## 2024-11-20 - Fast Date Comparisons
**Learning:** Instantiating `new Date()` inside loops (like `.filter` or `.sort`) when working with large lists of records in the frontend creates significant GC churn and CPU overhead.
**Action:** Since the backend provides timestamps as ISO 8601 strings, we can take advantage of the fact that they are lexicographically sortable. Use direct string comparisons (e.g., `dateString < cutoffIso` or `a.createdAt < b.createdAt ? 1 : ...`) instead of parsing them into Date objects.
