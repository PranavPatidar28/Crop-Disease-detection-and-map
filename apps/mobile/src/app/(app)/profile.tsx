import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Layers, LogOut, MapPin, Phone, Plus, Shield } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import type { Plot } from '@/features/plots/api/plots.api';
import { PlotCard, PlotFormSheet } from '@/features/plots/components';
import { useActivePlots } from '@/features/plots/hooks/use-plots';
import { onboardingStorage } from '@/features/plots/onboarding-storage';
import { MapPickerSheet } from '@/features/upload-report/components/map-picker-sheet';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth.store';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: plots } = useActivePlots();

  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const formRef = useRef<BottomSheetModal>(null);
  const mapPickerRef = useRef<BottomSheetModal>(null);

  const location =
    [user?.district, user?.state].filter(Boolean).join(', ') || 'Not set';

  const openCreate = () => {
    setEditingPlot(null);
    formRef.current?.present();
  };

  const openEdit = (plot: Plot) => {
    setEditingPlot(plot);
    formRef.current?.present();
  };

  const handleLogout = async () => {
    // Clear "skipped" flag too so a fresh login can re-onboard.
    await onboardingStorage.setSkipped(false);
    await logout();
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 16 }}
        >
          {/* Hero */}
          <View className="items-center gap-3 pb-2 pt-4">
            <View className="overflow-hidden rounded-full">
              <LinearGradient
                colors={[palette.brand[400], palette.brand[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0 }}
              />
              <View className="h-24 w-24 items-center justify-center">
                <Animated.View entering={FadeIn.duration(400)}>
                  <Avatar
                    name={user?.name}
                    fallback="🌾"
                    size="lg"
                    className="bg-transparent"
                  />
                </Animated.View>
              </View>
            </View>

            <Animated.View
              entering={FadeInDown.delay(80).duration(400)}
              className="items-center gap-1"
            >
              <Text className="text-2xl font-bold text-text">
                {user?.name ?? 'Welcome'}
              </Text>
              <Text className="text-sm text-text-muted">+91 {user?.phone ?? '—'}</Text>
            </Animated.View>
          </View>

          {/* Info card */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <GlassView
              glassEffectStyle="regular"
              tintColor={
                Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated
              }
              style={{ borderRadius: 24, overflow: 'hidden' }}
            >
              <View className="rounded-3xl border border-white/10">
                <Row
                  icon={<Phone size={18} color={theme.textMuted} strokeWidth={2} />}
                  label="Phone"
                  value={`+91 ${user?.phone ?? '—'}`}
                />
                <Divider />
                <Row
                  icon={<Shield size={18} color={theme.textMuted} strokeWidth={2} />}
                  label="Role"
                  value={user?.role ?? '—'}
                />
                <Divider />
                <Row
                  icon={<MapPin size={18} color={theme.textMuted} strokeWidth={2} />}
                  label="Location"
                  value={location}
                />
              </View>
            </GlassView>
          </Animated.View>

          {/* Plots */}
          <Animated.View entering={FadeInDown.delay(180).duration(400)} className="gap-3">
            <View className="flex-row items-end justify-between gap-2 px-1">
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-semibold text-text">Your plots</Text>
                <Text className="text-xs text-text-muted">
                  We&apos;ll alert you about disease outbreaks near these fields.
                </Text>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Add plot"
                onPress={openCreate}
                pressedScale={0.94}
                haptic="selection"
              >
                <View className="flex-row items-center gap-1 rounded-full bg-brand-500/15 px-3 py-1.5">
                  <Plus size={14} color={palette.brand[300]} strokeWidth={2.4} />
                  <Text className="text-xs font-semibold text-brand-300">Add plot</Text>
                </View>
              </PressableScale>
            </View>

            {plots && plots.length > 0 ? (
              <View className="gap-2">
                {plots.map((plot) => (
                  <PlotCard key={plot.id} plot={plot} onPress={openEdit} />
                ))}
              </View>
            ) : (
              <View className="items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-6">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15">
                  <Layers size={20} color={palette.brand[300]} strokeWidth={2} />
                </View>
                <Text className="text-sm font-semibold text-text">No plots yet</Text>
                <Text className="text-center text-xs text-text-muted">
                  Add your first field to start receiving outbreak notifications.
                </Text>
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(400)}>
            <Button
              label="Log out"
              variant="destructive"
              leftSlot={<LogOut size={18} color="#ffffff" strokeWidth={2} />}
              onPress={handleLogout}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <PlotFormSheet
        ref={formRef}
        plot={editingPlot}
        onOpenMapPicker={() => mapPickerRef.current?.present()}
      />
      <MapPickerSheet
        ref={mapPickerRef}
        initialLocation={null}
        onConfirm={() => {
          formRef.current?.present();
        }}
      />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-4">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-surface">{icon}</View>
      <View className="flex-1">
        <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
          {label}
        </Text>
        <Text className="text-base font-semibold text-text">{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="ml-16 h-px bg-white/10" />;
}
