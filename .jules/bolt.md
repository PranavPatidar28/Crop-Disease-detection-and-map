## 2024-06-12 - Fast Timestamp Comparisons
**Learning:** Instantiating `new Date()` inside tight loops or sorting operations `.sort()` on the frontend is a huge performance bottleneck. Since the backend sends ISO 8601 strings, their lexicographical order matches their chronological order exactly.
**Action:** Use fast string comparison (e.g. `>` or `<`) directly on the ISO 8601 timestamps instead of parsing them into Date objects for operations over large datasets.
