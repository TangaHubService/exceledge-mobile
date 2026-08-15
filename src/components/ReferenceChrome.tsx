import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export type ReferenceTab = 'Home' | 'Sales' | 'Products' | 'Customers' | 'More';

const tabs: Array<{ key: ReferenceTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Sales', label: 'Sales', icon: 'cart-outline' },
  { key: 'Products', label: 'Products', icon: 'cube-outline' },
  { key: 'Customers', label: 'Customers', icon: 'people-outline' },
  { key: 'More', label: 'More', icon: 'ellipsis-horizontal' },
];

export function ReferenceHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View className="h-[76px] flex-row items-center px-5">
      <Pressable onPress={onBack} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}>
        <Ionicons name="arrow-back" size={30} color="#fff" />
      </Pressable>
      <Text numberOfLines={1} className="flex-1 text-[21px] font-bold text-white">{title}</Text>
      {right ?? <View className="h-11 w-11" />}
    </View>
  );
}

export function ReferenceBottomBar({
  active = 'Home',
  onNavigate,
}: {
  active?: ReferenceTab;
  onNavigate: (tab: ReferenceTab) => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View
      className="flex-row border-t border-gray-200 bg-white"
      style={{ height: 58 + bottomPadding, paddingBottom: bottomPadding }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? colors.brand.DEFAULT : '#555E6D';
        return (
          <Pressable key={tab.key} onPress={() => onNavigate(tab.key)} className="flex-1 items-center justify-center pt-2">
            <Ionicons name={tab.icon} size={23} color={color} />
            <Text className="mt-1 text-[11px] font-medium" style={{ color }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
