import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import { forwardRef } from 'react';

import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import {
  LANGUAGE_OPTIONS,
  type LanguageCode,
  usePreferencesStore,
} from '@/store/preferences.store';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

/**
 * Language picker. English and Hindi swap UI copy at runtime; the remaining
 * options are selectable but fall back to English, tagged "Coming soon".
 */
export const LanguageSheet = forwardRef<BottomSheetModal>(function LanguageSheet(_props, ref) {
  const theme = useTheme();
  const { t } = useTranslation();
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);

  const dismiss = () => {
    // @ts-expect-error: ref provided by parent
    ref?.current?.dismiss();
  };

  const select = (value: LanguageCode) => {
    void setLanguage(value);
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
            <Text className="text-xl font-bold text-text">{t('language.title')}</Text>
            <Text className="text-xs text-text-muted">{t('language.subtitle')}</Text>
          </View>
          <IconButton
            accessibilityLabel="Close"
            icon={<X size={18} color={theme.text} strokeWidth={2} />}
            onPress={dismiss}
          />
        </View>

        <View className="px-4 pt-3">
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = option.code === language;
            return (
              <PressableScale
                key={option.code}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => select(option.code)}
                haptic="selection"
                pressedScale={0.98}
                className="mb-2"
              >
                <View
                  className={`flex-row items-center gap-3 rounded-xl border px-4 py-3.5 ${
                    selected ? 'border-brand-200 bg-brand-50' : 'border-border bg-surface'
                  }`}
                >
                  <Text className="flex-1 text-base font-bold text-text">{option.label}</Text>
                  {!option.implemented ? (
                    <View className="rounded-full bg-surface-muted px-2 py-0.5">
                      <Text className="text-[10px] font-bold uppercase tracking-[0.5px] text-text-subtle">
                        {t('language.comingSoon')}
                      </Text>
                    </View>
                  ) : null}
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
