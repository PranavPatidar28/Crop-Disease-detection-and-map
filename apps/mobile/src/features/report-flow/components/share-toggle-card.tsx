import { Switch } from 'react-native';

import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';

interface ShareToggleCardProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function ShareToggleCard({ value, onChange }: ShareToggleCardProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-bold text-text">Add to outbreak map</Text>
        <Text className="text-xs text-text-muted">Helps nearby farmers act early.</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#e8e4dc', true: palette.brand[500] }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
