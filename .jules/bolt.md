## 2024-06-14 - Optimize Date Filtering via String Comparison
**Learning:** Instantiating `new Date(string).getTime()` inside a large `Array.prototype.filter()` loop causes significant O(n) performance degradation. However, because Prisma and our APIs use standard ISO 8601 strings (e.g., `YYYY-MM-DDTHH:mm:ss.sssZ`), they sort and compare lexicographically the same way they sort chronologically.
**Action:** Always pre-calculate cutoff dates as an `.toISOString()` string before large loops, and use native string comparison (`a < b`) to evaluate dates instead of parsing them.
