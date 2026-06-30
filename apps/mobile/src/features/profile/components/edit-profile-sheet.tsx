import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { forwardRef, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth.store';
import { Text, View } from '@/tw';

/**
 * Local-only profile editor. Edits name / district / state and persists via
 * `auth.store.setUser` (AsyncStorage). No backend call — the redesign scope is
 * on-device. Matches the plot-form-sheet visual conventions.
 */
export const EditProfileSheet = forwardRef<BottomSheetModal>(function EditProfileSheet(_props, ref) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [district, setDistrict] = useState(user?.district ?? '');
  const [state, setState] = useState(user?.state ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-sync the form whenever the underlying user changes (e.g. after save).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setName(user?.name ?? '');
    setDistrict(user?.district ?? '');
    setState(user?.state ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dismiss = () => {
    // @ts-expect-error: ref provided by parent
    ref?.current?.dismiss();
  };

  const handleSave = async () => {
    setError(null);
    if (!user) return;
    if (!name.trim()) return setError('Please enter your name.');
    setSaving(true);
    try {
      await setUser({
        ...user,
        name: name.trim(),
        district: district.trim(),
        state: state.trim(),
      });
      dismiss();
    } catch (err) {
      setError((err as Error).message ?? 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['70%']}
      backgroundStyle={{
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Text className="text-xl font-bold text-text">Edit profile</Text>
        <IconButton
          accessibilityLabel="Close"
          icon={<X size={18} color={theme.text} strokeWidth={2} />}
          onPress={dismiss}
        />
      </View>

      <BottomSheetScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 80 }}>
        <Field label="Full name">
          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ravi Kumar"
            placeholderTextColor={theme.textFaint}
            style={{ height: 48, color: theme.text, fontSize: 15 }}
          />
        </Field>

        <Field label="District">
          <BottomSheetTextInput
            value={district}
            onChangeText={setDistrict}
            placeholder="e.g. Nashik"
            placeholderTextColor={theme.textFaint}
            style={{ height: 48, color: theme.text, fontSize: 15 }}
          />
        </Field>

        <Field label="State">
          <BottomSheetTextInput
            value={state}
            onChangeText={setState}
            placeholder="e.g. Maharashtra"
            placeholderTextColor={theme.textFaint}
            style={{ height: 48, color: theme.text, fontSize: 15 }}
          />
        </Field>

        {error ? (
          <View className="rounded-xl border border-danger-tint bg-danger-tint px-3 py-2">
            <Text className="text-xs font-medium text-danger">{error}</Text>
          </View>
        ) : null}
      </BottomSheetScrollView>

      <View className="border-t border-border bg-surface px-5 py-4">
        <Button label="Save changes" variant="gradient" size="md" loading={saving} onPress={handleSave} />
      </View>
    </BottomSheetModal>
  );
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-text-subtle">
        {label}
      </Text>
      <View className="rounded-xl border border-border bg-surface px-3">{children}</View>
    </View>
  );
}
