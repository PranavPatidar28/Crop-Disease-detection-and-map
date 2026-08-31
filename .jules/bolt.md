## 2024-08-11 - Optimize map markers
**Learning:** Rendering many custom markers dynamically causes a massive O(N) re-render waterfall during map interactions (panning, zooming, filtering). Wrapping them in React.memo() with the named inner function pattern is critical.
**Action:** Always wrap custom marker components used in react-native-maps in React.memo() using the named inner function pattern to optimize map performance.
