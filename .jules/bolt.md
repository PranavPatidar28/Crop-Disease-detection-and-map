## 2024-08-04 - Memoize map marker components to prevent O(N) re-render waterfall

**Learning:** In React Native apps using `react-native-maps`, rendering many custom markers or layers dynamically (like `TrackingMarker`, `MapMarker`, `MapCluster`, `OutbreakZoneLayer`) causes a massive O(N) re-render waterfall during map interactions such as panning, zooming, or filtering.

**Action:** Always wrap individual marker components in `React.memo()` using the named inner function pattern (e.g., `const MapMarker = memo(MapMarkerImpl)`) rather than an anonymous function. This optimizes map performance while preserving component display names and ensuring React Fast Refresh behavior continues working correctly.
