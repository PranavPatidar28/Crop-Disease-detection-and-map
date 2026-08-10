## 2024-05-18 - Memoizing Map Components in React Native Maps
**Learning:** Rendering many custom markers or layers dynamically in `react-native-maps` causes a massive O(N) re-render waterfall during map interactions (panning, zooming, filtering).
**Action:** Always wrap individual marker components (like `TrackingMarker`, `MapMarker`, `OutbreakZoneLayer`) in `React.memo()` using the named inner function pattern to optimize map performance and ensure React Fast Refresh behavior works correctly.
