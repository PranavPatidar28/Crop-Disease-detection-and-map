import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, Sparkles, X } from 'lucide-react-native';
import { forwardRef } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { OutbreakZone } from '@/features/map-system/types';
import { CROP_BY_NAME } from '@/constants/crops';
import { timeAgo } from '@/utils/severity';

import { useOutbreak } from '../hooks/use-outbreaks';

import { SeverityIndicator } from './severity-indicator';

import { SheetHero } from '@/features/map-system/components/sheet-hero';
import { SheetStatCard } from '@/features/map-system/components/sheet-stat-card';

interface OutbreakDetailSheetProps {
  outbreak: OutbreakZone | null;
}

export const OutbreakDetailSheet = forwardRef<BottomSheetModal, OutbreakDetailSheetProps>(
  function OutbreakDetailSheet({ outbreak }, ref) {
    const theme = useTheme();
    const { data, isPending } = useOutbreak(outbreak?.id ?? null);

    const dismiss = () => {
      // @ts-expect-error: ref provided
      ref?.current?.dismiss();
    };

    const cropList = outbreak?.affectedCropTypes ?? [];

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['45%', '92%']}
        backgroundStyle={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: '#efeae0',
          borderBottomWidth: 0,
        }}
        handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.45}
          />
        )}
      >
        {!outbreak ? null : (
          <BottomSheetScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <SheetHero
                  eyebrow={outbreak.active ? 'Active outbreak' : 'Resolved outbreak'}
                  title={outbreak.disease}
                  metric={`${outbreak.reportCount}`}
                  metricCaption="reports in this zone"
                  badge={<SeverityIndicator severity={outbreak.severity} variant="expanded" />}
                />
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={dismiss}
                haptic="selection"
                pressedScale={0.9}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface"
              >
                <X size={18} color={theme.text} strokeWidth={2} />
              </PressableScale>
            </View>

            <View className="flex-row gap-2">
              <SheetStatCard value={`${outbreak.highCount}`} label="High severity" tone="danger" />
              <SheetStatCard value={`${(outbreak.radius / 1000).toFixed(1)} km`} label="Radius" />
              <SheetStatCard value={timeAgo(outbreak.lastSeenAt)} label="Last report" />
            </View>

            {/* Affected crops */}
            {cropList.length > 0 ? (
              <View className="gap-2">
                <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Affected crops
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {cropList.map((crop) => {
                    const known = CROP_BY_NAME[crop.toLowerCase()];
                    return (
                      <View
                        key={crop}
                        className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5"
                      >
                        {known ? <Text className="text-base">{known.emoji}</Text> : null}
                        <Text className="text-xs font-semibold text-text">{crop}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Mini map preview */}
            <View
              className="h-44 overflow-hidden rounded-3xl border border-border"
              style={{ backgroundColor: theme.surface }}
            >
              <MapView
                style={{ flex: 1 }}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                pointerEvents="none"
                initialRegion={{
                  latitude: outbreak.latitude,
                  longitude: outbreak.longitude,
                  latitudeDelta: ((outbreak.radius / 1000) * 3) / 110,
                  longitudeDelta: ((outbreak.radius / 1000) * 3) / 110,
                }}
                liteMode
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Circle
                  center={{ latitude: outbreak.latitude, longitude: outbreak.longitude }}
                  radius={outbreak.radius}
                  fillColor="rgba(239, 68, 68, 0.18)"
                  strokeColor="rgba(239, 68, 68, 0.65)"
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude: outbreak.latitude, longitude: outbreak.longitude }}
                  pinColor={palette.brand[600]}
                  tracksViewChanges={false}
                />
              </MapView>
            </View>

            {/* Contributing reports */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-text">Recent contributing reports</Text>
              {isPending ? (
                <View className="items-center py-6">
                  <ActivityIndicator color={palette.brand[400]} />
                </View>
              ) : !data?.contributingReports.length ? (
                <Text className="text-xs text-text-muted">No contributing reports yet.</Text>
              ) : (
                <View className="gap-2">
                  {data.contributingReports.slice(0, 8).map((report) => (
                    <PressableScale
                      key={report.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${report.cropType} report`}
                      onPress={() => {
                        dismiss();
                        router.push({
                          pathname: '/reports/[id]',
                          params: { id: report.id },
                        });
                      }}
                      haptic="selection"
                      pressedScale={0.98}
                    >
                      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-2">
                        <Image
                          source={{ uri: report.imageUrl }}
                          style={{ width: 56, height: 56, borderRadius: 12 }}
                          contentFit="cover"
                          transition={200}
                        />
                        <View className="flex-1 gap-0.5">
                          <Text className="text-xs font-semibold text-text" numberOfLines={1}>
                            {report.cropType} · {report.disease ?? 'Unknown'}
                          </Text>
                          <Text className="text-[11px] text-text-muted">
                            {timeAgo(report.createdAt)} · {report.confidence ?? 0}% confidence
                          </Text>
                        </View>
                        <ChevronRight size={16} color={theme.textSubtle} strokeWidth={2} />
                      </View>
                    </PressableScale>
                  ))}
                </View>
              )}
            </View>

            {/* Prevention recommendations — derived from contributing reports */}
            {data?.contributingReports[0]?.recommendations.length ? (
              <View className="gap-2">
                <Text className="text-base font-semibold text-text">Prevention guidance</Text>
                <View className="gap-2">
                  {data.contributingReports[0].recommendations
                    .slice(0, 4)
                    .map((rec, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-3"
                      >
                        <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-2xl bg-brand-500/15">
                          <Sparkles
                            size={14}
                            color={palette.brand[600]}
                            strokeWidth={2.2}
                          />
                        </View>
                        <Text className="flex-1 text-xs leading-4 text-text">{rec}</Text>
                      </View>
                    ))}
                </View>
              </View>
            ) : null}
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);

