import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { Crosshair, MapPin, Trash2, X } from 'lucide-react-native';
import { forwardRef, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { CROPS } from '@/constants/crops';
import { useCurrentLocation } from '@/features/upload-report/hooks/use-current-location';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import type { Plot } from '../api/plots.api';
import { useCreatePlot, useDeletePlot, useUpdatePlot } from '../hooks/use-plots';

interface PlotFormSheetProps {
  /** When provided, sheet acts as edit mode. */
  plot?: Plot | null;
  onSaved?: (plot: Plot) => void;
  onDeleted?: () => void;
  onOpenMapPicker?: (current: { lat: number; lng: number } | null) => void;
}

export const PlotFormSheet = forwardRef<BottomSheetModal, PlotFormSheetProps>(
  function PlotFormSheet({ plot, onSaved, onDeleted, onOpenMapPicker }, ref) {
    const theme = useTheme();
    const isEdit = !!plot;
    const [name, setName] = useState(plot?.name ?? '');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
      plot ? { lat: plot.latitude, lng: plot.longitude } : null,
    );
    const [crops, setCrops] = useState<string[]>(plot?.cropTypes ?? []);
    const [error, setError] = useState<string | null>(null);

    const locationCtl = useCurrentLocation(false);

    const create = useCreatePlot();
    const update = useUpdatePlot();
    const remove = useDeletePlot();

    /* eslint-disable react-hooks/set-state-in-effect */
    // Reset form whenever the plot prop changes (edit different plot, etc).
    useEffect(() => {
      setName(plot?.name ?? '');
      setCoords(plot ? { lat: plot.latitude, lng: plot.longitude } : null);
      setCrops(plot?.cropTypes ?? []);
      setError(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plot?.id]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const dismiss = () => {
      // @ts-expect-error: ref provided
      ref?.current?.dismiss();
    };

    const handleUseGps = async () => {
      await locationCtl.refresh();
      if (locationCtl.location) {
        setCoords({ lat: locationCtl.location.latitude, lng: locationCtl.location.longitude });
      }
    };

    // If location resolves after refresh
    useEffect(() => {
      if (locationCtl.location && !coords) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCoords({ lat: locationCtl.location.latitude, lng: locationCtl.location.longitude });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationCtl.location]);

    const toggleCrop = (cropName: string) => {
      setCrops((prev) =>
        prev.includes(cropName) ? prev.filter((c) => c !== cropName) : [...prev, cropName],
      );
    };

    const isPending = create.isPending || update.isPending;

    const handleSave = async () => {
      setError(null);
      if (!name.trim()) return setError('Give your plot a name.');
      if (!coords) return setError('Set the plot location.');
      try {
        if (isEdit && plot) {
          const next = await update.mutateAsync({
            id: plot.id,
            payload: {
              name: name.trim(),
              latitude: coords.lat,
              longitude: coords.lng,
              cropTypes: crops,
            },
          });
          onSaved?.(next);
        } else {
          const next = await create.mutateAsync({
            name: name.trim(),
            latitude: coords.lat,
            longitude: coords.lng,
            cropTypes: crops,
          });
          onSaved?.(next);
        }
        dismiss();
      } catch (err) {
        setError((err as Error).message ?? 'Could not save plot');
      }
    };

    const handleDelete = async () => {
      if (!plot) return;
      try {
        await remove.mutateAsync(plot.id);
        onDeleted?.();
        dismiss();
      } catch (err) {
        setError((err as Error).message ?? 'Could not delete plot');
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['85%']}
        backgroundStyle={{ backgroundColor: theme.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: theme.borderStrong }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
          />
        )}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
          <Text className="text-xl font-bold text-text">
            {isEdit ? 'Edit plot' : 'Add a plot'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={dismiss}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <X size={18} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>

        <BottomSheetScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 80 }}>
          <Section label="Plot name">
            <View className="rounded-2xl border border-border bg-surface px-3">
              <BottomSheetTextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. North field"
                placeholderTextColor={theme.textSubtle}
                style={{ height: 48, color: theme.text, fontSize: 15 }}
              />
            </View>
          </Section>

          <Section label="Location">
            <View className="gap-2">
              <View className="rounded-2xl border border-border bg-surface p-3">
                <View className="flex-row items-center gap-2">
                  <MapPin size={16} color={palette.brand[300]} strokeWidth={2.2} />
                  <Text className="flex-1 text-sm text-text">
                    {coords
                      ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                      : 'No location set'}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={handleUseGps}
                  disabled={locationCtl.status === 'fetching' || locationCtl.status === 'requesting'}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
                >
                  <View className="flex-row items-center justify-center gap-1.5 rounded-xl bg-surface py-2.5">
                    <Crosshair size={14} color={theme.text} strokeWidth={2.2} />
                    <Text className="text-xs font-semibold text-text">
                      {locationCtl.status === 'fetching' ? 'Locating…' : 'Use my GPS'}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onOpenMapPicker?.(coords)}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
                >
                  <View className="flex-row items-center justify-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 py-2.5">
                    <MapPin size={14} color={palette.brand[300]} strokeWidth={2.2} />
                    <Text className="text-xs font-semibold text-brand-300">Pick on map</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Section>

          <Section label="Crops grown here (optional)">
            <View className="flex-row flex-wrap gap-2">
              {CROPS.map((c) => {
                const selected = crops.includes(c.name);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    onPress={() => toggleCrop(c.name)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  >
                    <View
                      className={`rounded-full border px-3 py-1.5 ${
                        selected
                          ? 'border-brand-500 bg-brand-500/15'
                          : 'border-border bg-surface'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${selected ? 'text-brand-300' : 'text-text-muted'}`}
                      >
                        {c.emoji} {c.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {error ? (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2">
              <Text className="text-xs text-danger">{error}</Text>
            </View>
          ) : null}
        </BottomSheetScrollView>

        <View className="flex-row gap-2 border-t border-border bg-surface-elevated px-5 py-4">
          {isEdit ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleDelete}
              disabled={remove.isPending}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl border border-danger/40 bg-danger/10">
                <Trash2 size={16} color={theme.danger} strokeWidth={2.2} />
              </View>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            disabled={isPending}
            style={({ pressed }) => ({ flex: 1, opacity: isPending ? 0.6 : pressed ? 0.92 : 1 })}
          >
            <View className="overflow-hidden rounded-2xl">
              <LinearGradient
                colors={[palette.brand[500], palette.brand[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View className="h-12 flex-row items-center justify-center gap-2">
                  {isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">
                      {isEdit ? 'Save changes' : 'Add plot'}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </View>
          </Pressable>
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
