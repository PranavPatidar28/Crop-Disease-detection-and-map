## 2024-08-13 - Optimize React Native Map Markers

**Learning:** When mapping arrays to marker items in React Native apps using `react-native-maps`, rendering many custom markers dynamically causes a massive O(N) re-render waterfall.
**Action:** Always extract the inline `.map()` iterations into standalone memoized components *outside* the parent component using `React.memo()` so that their references are stable. Ensure that all inline props (like `children` or `onPress`) are properly refactored to prevent invalidating the memoization. Use `useCallback` hook in the parent to pass stable function references to the child components.
