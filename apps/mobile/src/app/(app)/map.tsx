import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Home, MapPinOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CROP_BY_NAME } from '@/constants/crops';
import { TextButton } from '@/components/ui/text-button';
import {
  ConnectionPill,
  HeatmapLayer,
  MapCluster,
  MapControls,
  MapFilterChips,
  MapFilterSheet,
  MapMarker,
  MapSearchBar,
  ReportDetailSheet,
  ReportsInViewSheet,
  TrackingMarker,
} from '@/features/map-system/components';
import {
  useNearbyReports,
  useRealtimeReports,
  useUserLocation,
} from '@/features/map-system/hooks';
import { useLiveReportsStore } from '@/features/map-system/store/live-reports.store';
import {
  useMapFiltersStore,
  windowToSinceIso,
} from '@/features/map-system/store/map-filters.store';
import type { MapRegion, OutbreakZone } from '@/features/map-system/types';
import { buildClusterIndex, getClusters, zoomToLongitudeDelta } from '@/features/map-system/utils/cluster';
import { lightMapStyle } from '@/features/map-system/utils/map-style';
import {
  OutbreakDetailSheet,
  OutbreakZoneLayer,
} from '@/features/outbreak-system/components';
import { useOutbreaks } from '@/features/outbreak-system/hooks';
import { useActivePlots } from '@/features/plots/hooks/use-plots';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTranslation } from '@/i18n';
import { useSocket } from '@/providers/socket-provider';
import { lightColors, palette } from '@/theme/colors';
import type { Report } from '@/features/upload-report/types';
import { Text, View } from '@/tw';

const FALLBACK_REGION: Region = {
  // Centered on India by default
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 18,
  longitudeDelta: 18,
};

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const outbreakSheetRef = useRef<BottomSheetModal>(null);
  const listSheetRef = useRef<BottomSheetModal>(null);

  const { t } = useTranslation();
  const userLocation = useUserLocation(true);
  const { isConnected } = useSocket();

  // Filters
  const filters = useMapFiltersStore();
  const layerMode = useMapFiltersStore((s) => s.layerMode);
  const setLayerMode = useMapFiltersStore((s) => s.setLayerMode);
  const filtersActive = useMapFiltersStore((s) => s.hasActiveFilters());
  const showResolved = useMapFiltersStore((s) => s.showResolved);

  // Live reports + outbreaks
  const reportsById = useLiveReportsStore((s) => s.byId);
  const outbreakById = useLiveReportsStore((s) => s.outbreakById);

  // Initial outbreak fetch (also seeds the live store + 60s polling fallback).
  // The realtime hook keeps the store in sync; this provides the first paint.
  useOutbreaks({ active: showResolved ? undefined : true });

  // User's plots (rendered as their own markers so they see "X km from my plot")
  const { data: plots } = useActivePlots();

  // Track the user's current camera region — defaults to fallback then user's location
  const [region, setRegion] = useState<Region>(FALLBACK_REGION);
  // Free-text search over crop / disease names, applied client-side on top of
  // the structured filters below.
  const [searchQuery, setSearchQuery] = useState('');
  // Debounced region drives the network query + cluster rebuild, so a fast
  // pan/zoom doesn't fire a request (and recompute the supercluster index) on
  // every micro-movement. The live `region` still drives the camera instantly.
  const debouncedRegion = useDebouncedValue(region, 450);
  const initialCenteredRef = useRef(false);

  // Re-evaluate the relative time window as wall-clock time passes, so reports
  // age out of a finite window (e.g. "24h") during a long session — not only
  // when filters change. Ticks once a minute, and only while a finite window is
  // active (no point recomputing when showing "all").
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (filters.window === 'all') return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [filters.window]);

  // Once we have user location, center on it (one-shot)
  useEffect(() => {
    if (!userLocation.location || initialCenteredRef.current) return;
    initialCenteredRef.current = true;
    const next: Region = {
      latitude: userLocation.location.latitude,
      longitude: userLocation.location.longitude,
      latitudeDelta: 0.6,
      longitudeDelta: 0.6,
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 800);
  }, [userLocation.location]);

  // Subscribe to socket events
  useRealtimeReports();

  // Build a single nearby query from current region + filters
  const nearbyParams = useMemo(() => {
    if (!debouncedRegion) return null;
    // Backend caps radius at 1000km. The initial country-wide fallback
    // (latitudeDelta=18 → ~1980km) would otherwise 400, so we clamp here.
    const rawRadius = Math.round(debouncedRegion.latitudeDelta * 110);
    const radiusKm = Math.min(1000, Math.max(20, rawRadius));
    return {
      lat: debouncedRegion.latitude,
      lng: debouncedRegion.longitude,
      radiusKm,
      limit: 200,
      severity:
        filters.severities.length === 1 ? filters.severities[0] : undefined,
      cropType: filters.crops.length === 1 ? filters.crops[0] : undefined,
      disease: filters.diseases.length === 1 ? filters.diseases[0] : undefined,
      since: windowToSinceIso(filters.window),
    };
  }, [debouncedRegion, filters.severities, filters.crops, filters.diseases, filters.window]);

  const nearby = useNearbyReports(nearbyParams);

  // Apply client-side filters on top of the store (to handle multi-select cases
  // that the server doesn't accept yet, plus live updates from sockets).
  const filteredReports = useMemo(() => {
    const all = Object.values(reportsById);
    const q = searchQuery.trim().toLowerCase();
    const cutoff =
      filters.window === 'all'
        ? ''
        : new Date(nowTick -
          (filters.window === '24h' ? 24 : filters.window === '7d' ? 7 * 24 : 30 * 24) *
            60 *
            60 *
            1000).toISOString();

    return all.filter((r) => {
      if (filters.window !== 'all' && r.createdAt < cutoff) return false;
      if (filters.severities.length > 0 && (!r.severity || !filters.severities.includes(r.severity))) {
        return false;
      }
      if (filters.crops.length > 0 && !filters.crops.includes(r.cropType)) return false;
      if (filters.diseases.length > 0 && (!r.disease || !filters.diseases.includes(r.disease))) {
        return false;
      }
      if (q) {
        const haystack = `${r.cropType} ${r.disease ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reportsById, filters.severities, filters.crops, filters.diseases, filters.window, nowTick, searchQuery]);

  // Clustering
  const clusterIndex = useMemo(() => buildClusterIndex(filteredReports), [filteredReports]);
  const clusters = useMemo(() => {
    return getClusters(clusterIndex, debouncedRegion as MapRegion);
  }, [clusterIndex, debouncedRegion]);

  // Visible outbreak zones — memoized so a live report upsert (which changes
  // reportsById, not outbreakById) doesn't rebuild every OutbreakZoneLayer.
  const visibleZones = useMemo(
    () => Object.values(outbreakById).filter((zone) => (showResolved ? true : zone.active)),
    [outbreakById, showResolved],
  );

  // Selected report for detail sheet
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const handleMarkerPress = useCallback((report: Report) => {
    Haptics.selectionAsync().catch(() => undefined);
    setSelectedReport(report);
    detailSheetRef.current?.present();
  }, []);

  // Selected outbreak for detail sheet
  const [selectedOutbreak, setSelectedOutbreak] = useState<OutbreakZone | null>(null);
  const handleOutbreakPress = useCallback((zone: OutbreakZone) => {
    Haptics.selectionAsync().catch(() => undefined);
    setSelectedOutbreak(zone);
    outbreakSheetRef.current?.present();
  }, []);

  // Layer toggle: cycles markers → heatmap → both
  const cycleLayer = () => {
    setLayerMode(
      layerMode === 'markers' ? 'heatmap' : layerMode === 'heatmap' ? 'both' : 'markers',
    );
  };

  // Locate me
  const locateMe = useCallback(async () => {
    if (!userLocation.location) {
      await userLocation.refresh();
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.location.latitude,
        longitude: userLocation.location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      600,
    );
  }, [userLocation]);

  const showMarkers = layerMode === 'markers' || layerMode === 'both';
  const showHeatmap = layerMode === 'heatmap' || layerMode === 'both';

  return (
    <View className="flex-1 bg-bg">
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={FALLBACK_REGION}
        onRegionChangeComplete={(r) => setRegion(r)}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        customMapStyle={Platform.OS === 'android' ? lightMapStyle : undefined}
      >
        {showHeatmap ? (
          <HeatmapLayer reports={filteredReports} region={debouncedRegion as MapRegion} />
        ) : null}

        {/* User's own plots — rendered subtly so they don't compete with reports */}
        {plots?.map((plot) => (
          <TrackingMarker
            key={`plot-${plot.id}`}
            contentKey="plot"
            coordinate={{ latitude: plot.latitude, longitude: plot.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={1}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: `${palette.brand[500]}55`,
                borderWidth: 2,
                borderColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Home size={12} color="#ffffff" strokeWidth={2.6} />
            </View>
          </TrackingMarker>
        ))}

        {/* Outbreak zones — v7 */}
        {visibleZones.map((zone) => (
          <OutbreakZoneLayer
            key={zone.id}
            zone={zone}
            onPress={handleOutbreakPress}
          />
        ))}

        {showMarkers
          ? clusters.map((feature) => {
              const [lng, lat] = feature.geometry.coordinates;
              const props = feature.properties;

              if ('cluster' in props && props.cluster) {
                return (
                  <TrackingMarker
                    key={`cluster-${props.cluster_id}`}
                    contentKey={`${props.point_count}|${props.highCount}|${props.mediumCount}`}
                    coordinate={{ latitude: lat as number, longitude: lng as number }}
                    onPress={() => {
                      const expansionZoom = clusterIndex.getClusterExpansionZoom(
                        props.cluster_id as number,
                      );
                      // Derive the exact longitudeDelta for the expansion zoom,
                      // then keep the current aspect ratio for latitudeDelta.
                      const nextLngDelta = zoomToLongitudeDelta(expansionZoom);
                      const aspect =
                        debouncedRegion.latitudeDelta / debouncedRegion.longitudeDelta;
                      mapRef.current?.animateToRegion(
                        {
                          latitude: lat as number,
                          longitude: lng as number,
                          latitudeDelta: nextLngDelta * aspect,
                          longitudeDelta: nextLngDelta,
                        },
                        500,
                      );
                    }}
                  >
                    <MapCluster
                      count={props.point_count}
                      highCount={props.highCount}
                      mediumCount={props.mediumCount}
                    />
                  </TrackingMarker>
                );
              }

              const reportId = (props as { reportId: string }).reportId;
              const report = reportsById[reportId];
              if (!report) return null;
              const cropEmoji = CROP_BY_NAME[report.cropType.toLowerCase()]?.emoji;

              return (
                <TrackingMarker
                  key={report.id}
                  contentKey={`${report.severity}|${report.cropType}`}
                  coordinate={{ latitude: report.latitude, longitude: report.longitude }}
                  onPress={() => handleMarkerPress(report)}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <MapMarker
                    severity={report.severity}
                    cropEmoji={cropEmoji}
                    enablePulse={report.severity === 'HIGH'}
                  />
                </TrackingMarker>
              );
            })
          : null}
      </MapView>

      {/* Top search bar + filter chip rail */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        <Animated.View entering={FadeIn.duration(400)} pointerEvents="box-none">
          <View pointerEvents="box-none" className="gap-2 px-4 pt-2">
            <MapSearchBar value={searchQuery} onChangeText={setSearchQuery} />
            <View pointerEvents="box-none" className="flex-row items-center justify-between gap-2">
              <View pointerEvents="box-none" className="flex-1 flex-row items-center gap-2">
                <ConnectionPill isConnected={isConnected} reportCount={filteredReports.length} />
                <View className="flex-1">
                  <MapFilterChips />
                </View>
              </View>
              {nearby.isFetching ? (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: lightColors.surface,
                    borderWidth: 1,
                    borderColor: lightColors.border,
                  }}
                >
                  <ActivityIndicator color={palette.brand[600]} size="small" />
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Right floating controls */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 116, right: 0, bottom: 0, left: 0 }}
      >
        <View pointerEvents="box-none" style={{ alignItems: 'flex-end', paddingRight: 16 }}>
          <MapControls
            layerMode={layerMode}
            filtersActive={filtersActive}
            onLocate={locateMe}
            onLayerToggle={cycleLayer}
            onFilter={() => filterSheetRef.current?.present()}
            onList={() => listSheetRef.current?.present()}
          />
        </View>
      </SafeAreaView>

      {/* Permission denied banner */}
      {userLocation.permission === 'denied' ? (
        <SafeAreaView
          edges={['bottom']}
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 110 }}
        >
          <View pointerEvents="box-none" className="px-4">
            <View className="flex-row items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3">
              <MapPinOff size={16} color={lightColors.warning} strokeWidth={2.2} />
              <Text className="flex-1 text-xs text-warning">
                {t('map.locationOff')}
              </Text>
              <TextButton
                label={t('common.allow')}
                tone="warning"
                size="sm"
                onPress={() => userLocation.refresh()}
              />
            </View>
          </View>
        </SafeAreaView>
      ) : null}

      <ReportDetailSheet ref={detailSheetRef} report={selectedReport} userLocation={userLocation.location} />
      <OutbreakDetailSheet ref={outbreakSheetRef} outbreak={selectedOutbreak} />
      <MapFilterSheet ref={filterSheetRef} matchingCount={filteredReports.length} />
      <ReportsInViewSheet ref={listSheetRef} reports={filteredReports} />
    </View>
  );
}
