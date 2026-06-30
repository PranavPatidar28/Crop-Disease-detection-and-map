import { Bell, ClipboardList, House, Map, Plus, User } from 'lucide-react-native';

export type TabIconName = 'house' | 'map' | 'plus' | 'bell' | 'user' | 'reports';

interface TabBarIconProps {
  name: TabIconName;
  focused: boolean;
  color: string;
  size?: number;
}

const ICONS: Record<TabIconName, typeof House> = {
  house: House,
  map: Map,
  plus: Plus,
  bell: Bell,
  user: User,
  reports: ClipboardList,
};

export function TabBarIcon({ name, focused, color, size = 24 }: TabBarIconProps) {
  const Icon = ICONS[name];
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={focused ? 2.4 : 2}
      fill={focused && name !== 'plus' ? `${color}1A` : 'transparent'}
    />
  );
}
