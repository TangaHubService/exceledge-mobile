import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import POSHomeScreen from '../screens/home/POSHomeScreen';
import ProductSelectionScreen from '../screens/home/ProductSelectionScreen';
import SalesHistoryScreen from '../screens/history/SalesHistoryScreen';
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import SettingsScreen from '../screens/more/SettingsScreen';

export type AppTabParamList = {
  Home: undefined;
  Sales: undefined;
  Products: undefined;
  Customers: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const icons: Record<keyof AppTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Sales: 'cart-outline',
  Products: 'cube-outline',
  Customers: 'people-outline',
  More: 'ellipsis-horizontal',
};

const labels: Record<keyof AppTabParamList, string> = {
  Home: 'Home',
  Sales: 'Sales',
  Products: 'Products',
  Customers: 'Customers',
  More: 'More',
};

function ReferenceTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View
      className="flex-row border-t border-border bg-white"
      style={{ height: 58 + bottomPadding, paddingBottom: bottomPadding }}
    >
      {state.routes.map((route, index) => {
        const name = route.name as keyof AppTabParamList;
        const focused = state.index === index;
        const color = focused ? colors.brand.DEFAULT : '#777984';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            className="flex-1 items-center justify-center pt-2"
          >
            <Ionicons name={icons[name]} size={23} color={color} />
            <Text className="mt-1 text-[11px] font-medium" style={{ color }}>
              {labels[name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="initialRoute"
      tabBar={(props) => <ReferenceTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={POSHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Sales" component={SalesHistoryScreen} options={{ title: 'Sales' }} />
      <Tab.Screen name="Products" component={ProductSelectionScreen} options={{ title: 'Products' }} />
      <Tab.Screen name="Customers" component={CustomerListScreen} options={{ title: 'Customers' }} />
      <Tab.Screen name="More" component={SettingsScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
