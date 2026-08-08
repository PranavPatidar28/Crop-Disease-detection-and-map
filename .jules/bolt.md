## 2024-05-24 - React Native Maps Marker Performance
**Learning:** Rendering many custom markers or layers dynamically (like `TrackingMarker`, `MapMarker`, `OutbreakZoneLayer`) in `react-native-maps` causes a massive O(N) re-render waterfall during map interactions such as panning, zooming, or filtering.
**Action:** Always wrap these individual marker components in `React.memo()` using the named inner function pattern to optimize map performance and prevent unnecessary re-renders when their specific props haven't changed.
