import { router } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DiseaseTrends,
  GreetingHeader,
  NearbyAlerts,
  OutbreakSummary,
  QuickUploadCTA,
  RecentReports,
} from '@/features/dashboard/components';
import { useDashboard } from '@/features/dashboard/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth.store';
import { View } from '@/tw';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();
  const { data, isPending, isRefetching, refetch } = useDashboard();

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 140,
            gap: 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <GreetingHeader user={user} onPressAvatar={() => router.push('/profile')} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <OutbreakSummary summary={data?.summary} loading={isPending} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <QuickUploadCTA />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(400)}>
            <RecentReports reports={data?.recentReports} loading={isPending} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(400)}>
            <DiseaseTrends trends={data?.trends} loading={isPending} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <NearbyAlerts alerts={data?.alerts} loading={isPending} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
