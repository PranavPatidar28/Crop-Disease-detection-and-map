## 2024-08-05 - Optimize React Native Maps Re-renders
**Learning:** Rendering many custom markers or layers dynamically (like `TrackingMarker`, `MapMarker`, `OutbreakZoneLayer`) in `react-native-maps` causes a massive O(N) re-render waterfall during map interactions such as panning, zooming, or filtering.
**Action:** Always wrap these individual marker components in `React.memo()` using the named inner function pattern (e.g. `const Component = memo(ComponentImpl)`) to optimize map performance and preserve component display names for React Fast Refresh.
