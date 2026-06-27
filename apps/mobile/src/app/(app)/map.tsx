import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Home, MapPinOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CROP_BY_NAME } from '@/constants/crops';
import {
  HeatmapLayer,
  MapCluster,
  MapControls,
  MapFilterChips,
  MapFilterSheet,
  MapMarker,
  MapSearchBar,
  ReportDetailSheet,
  ReportsInViewSheet,
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
import { buildClusterIndex, getClusters } from '@/features/map-system/utils/cluster';
import { lightMapStyle } from '@/features/map-system/utils/map-style';
import {
  OutbreakDetailSheet,
  OutbreakZoneLayer,
} from '@/features/outbreak-system/components';
import { useOutbreaks } from '@/features/outbreak-system/hooks';
import { useActivePlots } from '@/features/plots/hooks/use-plots';
import { useSocket } from '@/providers/socket-provider';
import { palette } from '@/theme/colors';
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
  const listSheetRef = useRef<BottomSheet>(null);

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
  const initialCenteredRef = useRef(false);

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
    if (!region) return null;
    // Backend caps radius at 1000km. The initial country-wide fallback
    // (latitudeDelta=18 → ~1980km) would otherwise 400, so we clamp here.
    const rawRadius = Math.round(region.latitudeDelta * 110);
    const radiusKm = Math.min(1000, Math.max(20, rawRadius));
    return {
      lat: region.latitude,
      lng: region.longitude,
      radiusKm,
      limit: 200,
      severity:
        filters.severities.length === 1 ? filters.severities[0] : undefined,
      cropType: filters.crops.length === 1 ? filters.crops[0] : undefined,
      disease: filters.diseases.length === 1 ? filters.diseases[0] : undefined,
      since: windowToSinceIso(filters.window),
    };
  }, [region, filters.severities, filters.crops, filters.diseases, filters.window]);

  const nearby = useNearbyReports(nearbyParams);

  // Apply client-side filters on top of the store (to handle multi-select cases
  // that the server doesn't accept yet, plus live updates from sockets).
  const filteredReports = useMemo(() => {
    const all = Object.values(reportsById);
    // ⚡ Bolt: Use ISO string comparison instead of `new Date()` inside loop
    const cutoffIso = windowToSinceIso(filters.window);

    return all.filter((r) => {
      if (cutoffIso && r.createdAt < cutoffIso) return false;
      if (filters.severities.length > 0 && (!r.severity || !filters.severities.includes(r.severity))) {
        return false;
      }
      if (filters.crops.length > 0 && !filters.crops.includes(r.cropType)) return false;
      if (filters.diseases.length > 0 && (!r.disease || !filters.diseases.includes(r.disease))) {
        return false;
      }
      return true;
    });
  }, [reportsById, filters.severities, filters.crops, filters.diseases, filters.window]);

  // Clustering
  const clusterIndex = useMemo(() => buildClusterIndex(filteredReports), [filteredReports]);
  const clusters = useMemo(() => {
    return getClusters(clusterIndex, region as MapRegion);
  }, [clusterIndex, region]);

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
        {showHeatmap ? <HeatmapLayer reports={filteredReports} /> : null}

        {/* User's own plots — rendered subtly so they don't compete with reports */}
        {plots?.map((plot) => (
          <Marker
            key={`plot-${plot.id}`}
            coordinate={{ latitude: plot.latitude, longitude: plot.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
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
          </Marker>
        ))}

        {/* Outbreak zones — v7 */}
        {Object.values(outbreakById)
          .filter((zone) => (showResolved ? true : zone.active))
          .map((zone) => (
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
                  <Marker
                    key={`cluster-${props.cluster_id}`}
                    coordinate={{ latitude: lat as number, longitude: lng as number }}
                    onPress={() => {
                      const expansionZoom = clusterIndex.getClusterExpansionZoom(
                        props.cluster_id as number,
                      );
                      const factor = Math.max(2, Math.pow(2, expansionZoom - 6));
                      mapRef.current?.animateToRegion(
                        {
                          latitude: lat as number,
                          longitude: lng as number,
                          latitudeDelta: region.latitudeDelta / factor,
                          longitudeDelta: region.longitudeDelta / factor,
                        },
                        500,
                      );
                    }}
                    tracksViewChanges={false}
                  >
                    <MapCluster
                      count={props.point_count}
                      highCount={props.highCount}
                      mediumCount={props.mediumCount}
                    />
                  </Marker>
                );
              }

              const reportId = (props as { reportId: string }).reportId;
              const report = reportsById[reportId];
              if (!report) return null;
              const cropEmoji = CROP_BY_NAME[report.cropType.toLowerCase()]?.emoji;

              return (
                <Marker
                  key={report.id}
                  coordinate={{ latitude: report.latitude, longitude: report.longitude }}
                  onPress={() => handleMarkerPress(report)}
                  tracksViewChanges={false}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <MapMarker
                    severity={report.severity}
                    cropEmoji={cropEmoji}
                    enablePulse={report.severity === 'HIGH'}
                  />
                </Marker>
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
            <MapSearchBar
              isConnected={isConnected}
              reportCount={filteredReports.length}
              onPressSearch={() => filterSheetRef.current?.present()}
              onPressFilter={() => filterSheetRef.current?.present()}
            />
            <View pointerEvents="box-none" className="flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <MapFilterChips />
              </View>
              {nearby.isFetching ? (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#efeae0',
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
        style={{ position: 'absolute', top: 60, right: 0, bottom: 0, left: 0 }}
      >
        <View pointerEvents="box-none" style={{ alignItems: 'flex-end', paddingRight: 16 }}>
          <MapControls
            layerMode={layerMode}
            filtersActive={filtersActive}
            onLocate={locateMe}
            onLayerToggle={cycleLayer}
            onFilter={() => filterSheetRef.current?.present()}
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
              <MapPinOff size={16} color="#f59e0b" strokeWidth={2.2} />
              <Text className="flex-1 text-xs text-warning">
                Location permission is off. Enable it to see nearby reports.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => userLocation.refresh()}
              >
                <Text className="text-xs font-semibold text-warning">Allow</Text>
              </Pressable>
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
