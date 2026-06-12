## 2024-06-12 - ISO string sorting without Date parsing on mobile
**Learning:** In real-time environments on mobile where state is updated frequently (like socket events capping arrays), parsing ISO 8601 strings into `Date` objects on every `.sort` comparison is extremely slow and causes unnecessary garbage collection.
**Action:** Always prefer standard lexicographical string comparisons (`a < b`) for ISO 8601 strings when sorting dates, and iterate directly over `Object.values()` instead of mapping `Object.keys()` to avoid intermediate array allocations.
