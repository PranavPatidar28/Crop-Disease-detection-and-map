import { WifiOff } from 'lucide-react-native';

import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';

interface ConnectionPillProps {
  isConnected: boolean;
  reportCount: number;
}

/**
 * Soft Sage connection pill. Designed to live inside the map search bar's
 * right side — compact, non-glassy.
 */
export function ConnectionPill({ isConnected, reportCount }: ConnectionPillProps) {
  if (isConnected) {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full bg-success-tint px-2.5 py-1">
        <View
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: palette.status.success }}
        />
        <Text className="text-[11px] font-bold text-success">Live · {reportCount}</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-warning-tint px-2.5 py-1">
      <WifiOff size={11} color={palette.status.warning} strokeWidth={2.2} />
      <Text className="text-[11px] font-bold text-warning">Offline</Text>
    </View>
  );
}
