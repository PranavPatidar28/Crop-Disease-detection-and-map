import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Radius,
  Sprout,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ScrollView, Switch } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionLabel } from '@/components/ui/section-label';
import { TextButton } from '@/components/ui/text-button';
import type { Plot } from '@/features/plots/api/plots.api';
import { PlotCard, PlotFormSheet } from '@/features/plots/components';
import { useActivePlots } from '@/features/plots/hooks/use-plots';
import { onboardingStorage } from '@/features/plots/onboarding-storage';
import { AlertRadiusSheet, EditProfileSheet, LanguageSheet } from '@/features/profile/components';
import { MapPickerSheet } from '@/features/upload-report/components/map-picker-sheet';
import { useReportsCount } from '@/features/upload-report/hooks';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import { languageLabel, usePreferencesStore } from '@/store/preferences.store';
import { lightColors, palette } from '@/theme/colors';
import { Text, View } from '@/tw';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: plots } = useActivePlots();
  const { data: reportsCount, isPending: reportsCountPending } = useReportsCount();

  const notificationsEnabled = usePreferencesStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = usePreferencesStore((s) => s.setNotificationsEnabled);
  const alertRadiusKm = usePreferencesStore((s) => s.alertRadiusKm);
  const language = usePreferencesStore((s) => s.language);

  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const formRef = useRef<BottomSheetModal>(null);
  const mapPickerRef = useRef<BottomSheetModal>(null);
  const editProfileRef = useRef<BottomSheetModal>(null);
  const alertRadiusRef = useRef<BottomSheetModal>(null);
  const languageRef = useRef<BottomSheetModal>(null);

  const location = [user?.district, user?.state].filter(Boolean).join(', ') || t('profile.locationNotSet');
  const role = (user?.role ?? 'farmer').toLowerCase();
  const roleLabel = role === 'farmer' ? t('profile.roleFarmer') : role[0]!.toUpperCase() + role.slice(1);
  const reportsValue = reportsCountPending ? '—' : String(reportsCount ?? 0);

  const handleLogout = async () => {
    await onboardingStorage.setSkipped(false);
    await logout();
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 16, paddingTop: 8 }}
        >
          {/* Identity hero */}
          <Animated.View entering={FadeIn.duration(300)}>
            <Card variant="glow" padding="lg">
              <View className="flex-row items-center gap-4">
                <Avatar name={user?.name} fallback="🌾" size="xl" verified />
                <View className="flex-1">
                  <Text className="text-xl font-extrabold tracking-tight text-text" numberOfLines={1}>
                    {user?.name ?? t('profile.welcome')}
                  </Text>
                  <Text className="mt-0.5 text-sm text-text-muted">+91 {user?.phone ?? '—'}</Text>
                  <View className="mt-2 flex-row">
                    <Chip label={roleLabel} tone="brand" />
                  </View>
                </View>
                <IconButton
                  accessibilityLabel={t('profile.editProfile')}
                  variant="tint"
                  icon={<Pencil size={16} color={palette.brand[700]} strokeWidth={2.2} />}
                  onPress={() => editProfileRef.current?.present()}
                />
              </View>

              {/* Stats strip */}
              <View className="mt-5 flex-row gap-3">
                <StatTile
                  icon={<FileText size={15} color={palette.brand[700]} strokeWidth={2.3} />}
                  value={reportsValue}
                  label={t('profile.statReports')}
                />
                <StatTile
                  icon={<Sprout size={15} color={palette.brand[700]} strokeWidth={2.3} />}
                  value={String(plots?.length ?? 0)}
                  label={t('profile.statActivePlots')}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Plots */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View className="flex-row items-center justify-between px-1">
              <SectionLabel>{t('profile.plots')}</SectionLabel>
              <TextButton
                label={t('profile.addPlot')}
                size="sm"
                leftSlot={<Plus size={12} color={palette.brand[700]} strokeWidth={2.4} />}
                onPress={() => {
                  setEditingPlot(null);
                  formRef.current?.present();
                }}
              />
            </View>
            <View className="mt-2 gap-2">
              {plots && plots.length > 0 ? (
                plots.map((plot) => (
                  <PlotCard
                    key={plot.id}
                    plot={plot}
                    onPress={(p) => {
                      setEditingPlot(p);
                      formRef.current?.present();
                    }}
                  />
                ))
              ) : (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Add your first plot"
                  onPress={() => {
                    setEditingPlot(null);
                    formRef.current?.present();
                  }}
                  haptic="selection"
                  pressedScale={0.99}
                >
                  <View className="items-center gap-2 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-6">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                      <Sprout size={18} color={palette.brand[700]} strokeWidth={2.2} />
                    </View>
                    <Text className="text-sm font-bold text-text">{t('profile.noPlotsTitle')}</Text>
                    <Text className="max-w-[260px] text-center text-xs text-text-muted">
                      {t('profile.noPlotsDesc')}
                    </Text>
                  </View>
                </PressableScale>
              )}
            </View>
          </Animated.View>

          {/* Settings */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <SectionLabel>{t('profile.settings')}</SectionLabel>
            <View className="mt-2">
              <Card padding="none">
                <ListRow
                  isFirst
                  icon={<Bell size={18} color={palette.brand[700]} strokeWidth={2.2} />}
                  label={t('profile.notifications')}
                  value={notificationsEnabled ? t('profile.alertsOn') : t('profile.alertsOff')}
                  rightSlot={
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={(v) => void setNotificationsEnabled(v)}
                      trackColor={{ false: lightColors.borderStrong, true: palette.brand[500] }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={lightColors.borderStrong}
                    />
                  }
                />
                <ListRow
                  icon={<Radius size={18} color={palette.brand[700]} strokeWidth={2.2} />}
                  label={t('profile.alertRadius')}
                  value={t('profile.alertRadiusValue', { km: alertRadiusKm })}
                  onPress={() => alertRadiusRef.current?.present()}
                />
                <ListRow
                  icon={<Globe size={18} color={palette.brand[700]} strokeWidth={2.2} />}
                  label={t('profile.language')}
                  value={languageLabel(language)}
                  onPress={() => languageRef.current?.present()}
                />
                <ListRow
                  icon={<MapPin size={18} color={palette.brand[700]} strokeWidth={2.2} />}
                  label={t('profile.location')}
                  value={location}
                  onPress={() => editProfileRef.current?.present()}
                />
              </Card>
            </View>
          </Animated.View>

          {/* Sign out */}
          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('profile.signOut')}
              onPress={handleLogout}
              haptic="medium"
              pressedScale={0.98}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-danger-tint bg-danger-tint/40 px-4 py-3.5"
            >
              <LogOut size={16} color={palette.status.danger} strokeWidth={2.2} />
              <Text className="text-sm font-bold text-danger">{t('profile.signOut')}</Text>
            </PressableScale>
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
        onConfirm={() => formRef.current?.present()}
      />
      <EditProfileSheet ref={editProfileRef} />
      <AlertRadiusSheet ref={alertRadiusRef} />
      <LanguageSheet ref={languageRef} />
    </View>
  );
}

interface StatTileProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function StatTile({ icon, value, label }: StatTileProps) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-surface/70 px-4 py-3">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-[11px] font-bold uppercase tracking-[1px] text-text-subtle">
          {label}
        </Text>
      </View>
      <Text
        className="mt-1 font-extrabold text-brand-900"
        style={{ fontSize: 26, lineHeight: 30, letterSpacing: -0.8 }}
      >
        {value}
      </Text>
    </View>
  );
}

interface ListRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightSlot?: React.ReactNode;
  destructive?: boolean;
  isFirst?: boolean;
}

function ListRow({ icon, label, value, onPress, rightSlot, destructive, isFirst }: ListRowProps) {
  const content = (
    <View
      className={`flex-row items-center gap-3 px-4 py-3 ${isFirst ? '' : 'border-t border-border'}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50">{icon}</View>
      <View className="flex-1">
        <Text
          className={destructive ? 'text-sm font-bold text-danger' : 'text-sm font-bold text-text'}
        >
          {label}
        </Text>
        {value ? <Text className="text-xs text-text-muted">{value}</Text> : null}
      </View>
      {rightSlot ??
        (onPress ? (
          <ChevronRight size={16} color={palette.brand[700]} strokeWidth={2.2} />
        ) : null)}
    </View>
  );

  // A row with a control (rightSlot, e.g. a Switch) and no onPress shouldn't be
  // a button — the control handles its own interaction.
  if (!onPress) {
    return content;
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptic="selection"
      pressedScale={0.98}
    >
      {content}
    </PressableScale>
  );
}
