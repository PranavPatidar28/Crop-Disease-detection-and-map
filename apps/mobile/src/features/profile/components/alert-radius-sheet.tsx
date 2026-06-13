import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import { forwardRef } from 'react';

import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import {
  ALERT_RADIUS_OPTIONS,
  type AlertRadiusKm,
  usePreferencesStore,
} from '@/store/preferences.store';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

const RADIUS_HINTS: Record<AlertRadiusKm, string> = {
  1: 'Just my immediate surroundings',
  3: 'My village and nearby fields',
  5: 'Recommended for most farmers',
  10: 'Wider regional coverage',
  25: 'Whole district awareness',
};

/**
 * Alert-radius picker. Writes to the preferences store immediately on select,
 * then dismisses. The chosen radius drives the dashboard / map context copy.
 */
export const AlertRadiusSheet = forwardRef<BottomSheetModal>(function AlertRadiusSheet(_props, ref) {
  const theme = useTheme();
  const alertRadiusKm = usePreferencesStore((s) => s.alertRadiusKm);
  const setAlertRadiusKm = usePreferencesStore((s) => s.setAlertRadiusKm);

  const dismiss = () => {
    // @ts-expect-error: ref provided by parent
    ref?.current?.dismiss();
  };

  const select = (value: AlertRadiusKm) => {
    void setAlertRadiusKm(value);
    dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backgroundStyle={{
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
    >
      <BottomSheetView style={{ paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between px-5 pb-1 pt-1">
          <View>
            <Text className="text-xl font-bold text-text">Alert radius</Text>
            <Text className="text-xs text-text-muted">How far around you we watch for outbreaks</Text>
          </View>
          <IconButton
            accessibilityLabel="Close"
            icon={<X size={18} color={theme.text} strokeWidth={2} />}
            onPress={dismiss}
          />
        </View>

        <View className="px-4 pt-3">
          {ALERT_RADIUS_OPTIONS.map((value) => {
            const selected = value === alertRadiusKm;
            return (
              <PressableScale
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${value} kilometres`}
                accessibilityState={{ selected }}
                onPress={() => select(value)}
                haptic="selection"
                pressedScale={0.98}
                className="mb-2"
              >
                <View
                  className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                    selected ? 'border-brand-200 bg-brand-50' : 'border-border bg-surface'
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-base font-bold text-text">{value} km</Text>
                    <Text className="text-xs text-text-muted">{RADIUS_HINTS[value]}</Text>
                  </View>
                  {selected ? (
                    <Check size={18} color={palette.brand[600]} strokeWidth={2.6} />
                  ) : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
