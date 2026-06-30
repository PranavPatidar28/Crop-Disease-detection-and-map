import { Circle } from 'react-native-maps';

import { TrackingMarker } from '@/features/map-system/components';
import type { OutbreakZone } from '@/features/map-system/types';
import { mapSeverityFill, zoneGlowSteps } from '@/features/map-system/utils/marker-colors';
import { Text, View } from '@/tw';

interface OutbreakZoneLayerProps {
  zone: OutbreakZone;
  onPress?: (zone: OutbreakZone) => void;
}

/** Two-hex-digit alpha suffix (00-ff) for an 0-1 opacity. */
function alphaHex(opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
}

/**
 * Outbreak zone: a radial-gradient glow (approximated by 3 stacked
 * stepped-opacity Circles, since react-native-maps Circle has no gradient
 * fill), a faint solid boundary ring at the true radius, and a center teardrop
 * hub with a report-count badge. Tapping the hub opens the detail sheet.
 *
 * The hub uses `TrackingMarker` so the custom view is captured into the native
 * bitmap reliably on Android (and re-captured whenever the content changes),
 * without leaving view-tracking on forever.
 */
export function OutbreakZoneLayer({ zone, onPress }: OutbreakZoneLayerProps) {
  const fill = mapSeverityFill(zone.severity);
  const dimmed = !zone.active;
  const steps = zoneGlowSteps(zone.severity);
  const dimFactor = dimmed ? 0.45 : 1;

  return (
    <>
      {/* Radial glow: outer (faint, large) first so inner (dense, small) layers on top */}
      {steps.map((step, i) => (
        <Circle
          key={`glow-${i}`}
          center={{ latitude: zone.latitude, longitude: zone.longitude }}
          radius={zone.radius * step.radiusFactor}
          fillColor={`${fill}${alphaHex(step.opacity * dimFactor)}`}
          strokeColor="transparent"
          strokeWidth={0}
          zIndex={i}
        />
      ))}

      {/* Boundary ring at the true outer radius */}
      <Circle
        center={{ latitude: zone.latitude, longitude: zone.longitude }}
        radius={zone.radius}
        fillColor="transparent"
        strokeColor={`${fill}${dimmed ? '55' : '99'}`}
        strokeWidth={1.5}
        zIndex={steps.length}
      />

      {/* Center hub teardrop with count badge */}
      <TrackingMarker
        contentKey={`${zone.disease}|${zone.reportCount}|${zone.severity}|${zone.active}`}
        coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
        anchor={{ x: 0.5, y: 1 }}
        onPress={() => onPress?.(zone)}
      >
        <View style={{ paddingTop: 8, paddingHorizontal: 10, paddingBottom: 12, alignItems: 'center' }}>
          <View style={{ width: 42, height: 42, opacity: dimmed ? 0.6 : 1 }}>
            {/* tail */}
            <View
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -5,
                width: 15,
                height: 15,
                marginLeft: -7.5,
                borderRadius: 3,
                backgroundColor: fill,
                transform: [{ rotate: '45deg' }],
              }}
            />
            {/* body */}
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
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
              <Text style={{ fontSize: 18 }}>🦠</Text>
            </View>
            {/* count badge */}
            <View
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 5,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                borderWidth: 2,
                borderColor: fill,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: fill }}>
                {zone.reportCount}
              </Text>
            </View>
          </View>
        </View>
      </TrackingMarker>
    </>
  );
}
