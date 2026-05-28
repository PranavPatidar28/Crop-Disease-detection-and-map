import { Marker, Circle } from 'react-native-maps';

import { useTheme } from '@/hooks/use-theme';
import type { OutbreakZone } from '@/features/map-system/types';
import { Text, View } from '@/tw';
import { severityVisuals } from '@/utils/severity';

import { HotspotAnimation } from './hotspot-animation';

interface OutbreakZoneLayerProps {
  zone: OutbreakZone;
  onPress?: (zone: OutbreakZone) => void;
}

/**
 * Renders an outbreak zone on the map: a translucent severity-tinted Circle
 * plus a center Marker that uses HotspotAnimation as its callout. Tapping the
 * marker opens the detail sheet.
 */
export function OutbreakZoneLayer({ zone, onPress }: OutbreakZoneLayerProps) {
  const visuals = severityVisuals(zone.severity);
  const theme = useTheme();
  void theme;

  return (
    <>
      <Circle
        center={{ latitude: zone.latitude, longitude: zone.longitude }}
        radius={zone.radius}
        fillColor={`${visuals.rawColor}26`}
        strokeColor={`${visuals.rawColor}AA`}
        strokeWidth={2}
      />

      <Marker
        coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
        onPress={() => onPress?.(zone)}
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HotspotAnimation severity={zone.severity} />

          <View
            style={{
              position: 'absolute',
              bottom: -22,
              backgroundColor: visuals.rawColor,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: '#ffffff',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
              {zone.disease}
            </Text>
            <View style={{ width: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
              {zone.reportCount}
            </Text>
          </View>
        </View>
      </Marker>
    </>
  );
}
