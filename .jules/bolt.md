## 2025-06-11 - Fast Array Sorting with ISO Strings
**Learning:** Comparing ISO date strings directly (e.g. `b.createdAt < a.createdAt`) is significantly faster than instantiating `Date` objects and extracting `getTime()`. This works because ISO strings are lexically sortable.
**Action:** Use string comparison instead of `new Date().getTime()` when sorting arrays by ISO date strings in React Native and JS environments for better performance.
