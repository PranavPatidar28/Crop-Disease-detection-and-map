/**
 * Light map style with off-white roads and muted greens.
 * Pulled from Snazzy Maps "Subtle Grayscale" base, tinted toward our palette.
 *
 * Applied via `customMapStyle` on Android only — Apple Maps on iOS doesn't
 * accept JSON styles.
 */
export const lightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#fbfaf7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fbfaf7' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eef3ec' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eef3ec' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dcebd9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f3f1ea' }] },
  { featureType: 'road.local', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dceaf3' }] },
];

/** Backwards-compat alias — some imports still reference darkMapStyle. */
export const darkMapStyle = lightMapStyle;
