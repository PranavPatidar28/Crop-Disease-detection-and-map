## 2024-05-20 - Fast ISO Date Comparison
**Learning:** Instantiating `new Date(isoString).getTime()` inside loops (like `.sort` or `.filter`) for ISO 8601 strings is a significant performance bottleneck due to parsing overhead. Because ISO 8601 strings are inherently lexically sortable, you can skip the Date object entirely.
**Action:** Always use direct lexicographical string comparison (e.g. `a > b ? 1 : -1`) when sorting or filtering large lists of records by ISO date strings on the frontend.
