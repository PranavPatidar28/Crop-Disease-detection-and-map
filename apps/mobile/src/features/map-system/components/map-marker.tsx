import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { Severity } from '@/features/upload-report/types';
import { mapSeverityFill } from '@/features/map-system/utils/marker-colors';

interface MapMarkerProps {
  severity: Severity | null;
  cropEmoji?: string;
  /** Kept for API compatibility; no longer drives animation. */
  enablePulse?: boolean;
}

/**
 * Refined teardrop marker. Solid severity-colored body with a white crop emoji
 * and a tail that points to the exact coordinate (pair with the Marker's
 * `anchor={{ x: 0.5, y: 1 }}` so the tail tip marks the spot).
 *
 * No animation: react-native-maps rasterizes marker children into a one-time
 * bitmap clipped to the view bounds. The previous scaling pulse exceeded those
 * bounds and was clipped on zoom. Everything here sits inside a padded box, so
 * the static first frame is the complete, correct look.
 */
export function MapMarker({ severity, cropEmoji }: MapMarkerProps) {
  const fill = mapSeverityFill(severity);
  const size = 40;

  return (
    // Padding wrapper keeps body border + tail + shadow inside the bitmap bounds.
    <View style={{ paddingTop: 6, paddingHorizontal: 6, paddingBottom: 12, alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        {/* tail: rotated square peeking below the body */}
        <View
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -5,
            width: 14,
            height: 14,
            marginLeft: -7,
            borderRadius: 3,
            backgroundColor: fill,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: '#ffffff',
            shadowColor: '#282e26',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.32,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 18 }}>{cropEmoji ?? '🌿'}</Text>
        </View>
      </View>
    </View>
  );
}

interface MapClusterProps {
  count: number;
  highCount: number;
  mediumCount: number;
}

/**
 * Cluster bubble — gradient background based on severity mix.
 * - Brand gradient when no HIGH severity reports are inside.
 * - Danger gradient (orange→red) when any HIGH severity is inside.
 */
export function MapCluster({ count, highCount }: MapClusterProps) {
  const dangerous = highCount > 0;
  const gradientColors: [string, string] = dangerous
    ? ['#f97316', '#dc2626']
    : [palette.brand[500], palette.brand[600]];
  const shadowTint = dangerous ? '#dc2626' : palette.brand[600];

  const size = count >= 50 ? 56 : count >= 10 ? 48 : 40;
  const fontSize = count >= 100 ? 13 : 14;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
        overflow: 'hidden',
        shadowColor: shadowTint,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={{ fontSize, fontWeight: '700', color: '#ffffff' }}>
        {count >= 1000 ? `${Math.round(count / 100) / 10}k` : count}
      </Text>
    </View>
  );
}
