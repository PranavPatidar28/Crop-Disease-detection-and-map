import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import { forwardRef, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { CROPS, cropDisplayName } from '@/constants/crops';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { Text, View } from '@/tw';
import type { Severity } from '@/features/upload-report/types';

import { useLiveReportsStore } from '../store/live-reports.store';
import { useMapFiltersStore } from '../store/map-filters.store';
import type { DateWindow } from '../types';

interface MapFilterSheetProps {
  matchingCount: number;
}

const WINDOWS: { id: DateWindow; label: string }[] = [
  { id: '24h', label: 'Last 24h' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH'];

export const MapFilterSheet = forwardRef<BottomSheetModal, MapFilterSheetProps>(
  function MapFilterSheet({ matchingCount }, ref) {
    const theme = useTheme();
    const { language } = useTranslation();

    const crops = useMapFiltersStore((s) => s.crops);
    const diseases = useMapFiltersStore((s) => s.diseases);
    const severities = useMapFiltersStore((s) => s.severities);
    const window = useMapFiltersStore((s) => s.window);
    const setCrops = useMapFiltersStore((s) => s.setCrops);
    const setDiseases = useMapFiltersStore((s) => s.setDiseases);
    const setSeverities = useMapFiltersStore((s) => s.setSeverities);
    const setWindow = useMapFiltersStore((s) => s.setWindow);
    const showResolved = useMapFiltersStore((s) => s.showResolved);
    const setShowResolved = useMapFiltersStore((s) => s.setShowResolved);
    const reset = useMapFiltersStore((s) => s.reset);

    const liveById = useLiveReportsStore((s) => s.byId);
    const knownDiseases = useMemo(() => {
      const set = new Set<string>();
      Object.values(liveById).forEach((r) => {
        if (r.disease) set.add(r.disease);
      });
      return Array.from(set).sort();
    }, [liveById]);

    const dismiss = () => {
      // @ts-expect-error: ref provided
      ref?.current?.dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['85%']}
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
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
        )}
      >
        <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
          <Text className="text-xl font-bold text-text">Filters</Text>
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

        <BottomSheetScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 100 }}>
          <Section label="Time window">
            <View className="flex-row flex-wrap gap-2">
              {WINDOWS.map((w) => (
                <Chip
                  key={w.id}
                  label={w.label}
                  active={window === w.id}
                  onPress={() => setWindow(w.id)}
                />
              ))}
            </View>
          </Section>

          <Section label="Severity">
            <View className="flex-row flex-wrap gap-2">
              {SEVERITIES.map((s) => (
                <Chip
                  key={s}
                  label={s.charAt(0) + s.slice(1).toLowerCase()}
                  active={severities.includes(s)}
                  onPress={() => {
                    if (severities.includes(s)) {
                      setSeverities(severities.filter((x) => x !== s));
                    } else {
                      setSeverities([...severities, s]);
                    }
                  }}
                />
              ))}
            </View>
          </Section>

          <Section label="Crop type">
            <View className="flex-row flex-wrap gap-2">
              {CROPS.map((crop) => (
                <Chip
                  key={crop.id}
                  label={`${crop.emoji} ${cropDisplayName(crop, language)}`}
                  active={crops.includes(crop.name)}
                  onPress={() => {
                    if (crops.includes(crop.name)) {
                      setCrops(crops.filter((x) => x !== crop.name));
                    } else {
                      setCrops([...crops, crop.name]);
                    }
                  }}
                />
              ))}
            </View>
          </Section>

          {knownDiseases.length > 0 ? (
            <Section label="Disease">
              <View className="flex-row flex-wrap gap-2">
                {knownDiseases.map((d) => (
                  <Chip
                    key={d}
                    label={d}
                    active={diseases.includes(d)}
                    onPress={() => {
                      if (diseases.includes(d)) {
                        setDiseases(diseases.filter((x) => x !== d));
                      } else {
                        setDiseases([...diseases, d]);
                      }
                    }}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <Section label="Outbreak status">
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="Active only"
                active={!showResolved}
                onPress={() => setShowResolved(false)}
              />
              <Chip
                label="Show resolved"
                active={showResolved}
                onPress={() => setShowResolved(true)}
              />
            </View>
          </Section>
        </BottomSheetScrollView>

        <View className="flex-row gap-2 border-t border-border bg-surface-elevated px-5 py-4">
          <View className="flex-1">
            <Button label="Reset" variant="solid" size="md" onPress={reset} />
          </View>
          <View className="flex-[2]">
            <Button
              label={`Show ${matchingCount} ${matchingCount === 1 ? 'report' : 'reports'}`}
              variant="gradient"
              size="md"
              onPress={dismiss}
              leftSlot={<Check size={16} color="#fff" strokeWidth={2.4} />}
            />
          </View>
        </View>
      </BottomSheetModal>
    );
  },
);

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
        {label}
      </Text>
      {children}
    </View>
  );
}
