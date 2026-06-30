import { useEffect, useState } from 'react';
import { Marker, type MapMarkerProps } from 'react-native-maps';

interface TrackingMarkerProps extends MapMarkerProps {
  /**
   * A signature of the marker's rendered content. When it changes, view
   * tracking is re-enabled briefly so the native bitmap is recaptured.
   */
  contentKey?: string;
  /** How long to keep capturing the view before freezing the bitmap (ms). */
  trackDurationMs?: number;
}

/**
 * A `Marker` that renders custom React children reliably on Android.
 *
 * react-native-maps rasterizes a custom marker's children into a bitmap, but
 * ONLY captures that bitmap while `tracksViewChanges` is true. If it starts
 * false, the marker frequently paints blank (or a default pin) on Android.
 * Leaving it true forever tanks performance (it re-rasterizes every frame).
 *
 * So we start tracking, then disable it once the content has had a chance to
 * lay out — and re-enable it whenever `contentKey` changes (e.g. severity or
 * count updates) so the new look is captured.
 */
export function TrackingMarker({
  contentKey,
  trackDurationMs = 600,
  children,
  ...markerProps
}: TrackingMarkerProps) {
  const [tracksChanges, setTracksChanges] = useState(true);
  const [prevKey, setPrevKey] = useState(contentKey);

  if (prevKey !== contentKey) {
    setPrevKey(contentKey);
    setTracksChanges(true);
  }

  useEffect(() => {
    const timer = setTimeout(() => setTracksChanges(false), trackDurationMs);
    return () => clearTimeout(timer);
  }, [contentKey, trackDurationMs]);

  return (
    <Marker {...markerProps} tracksViewChanges={tracksChanges}>
      {children}
    </Marker>
  );
}
