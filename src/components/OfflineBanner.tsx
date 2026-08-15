import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { colors, typography } from '../theme';

export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  return offline;
}

export function OfflineBanner() {
  const isOffline = useIsOffline();
  if (!isOffline) return null;

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <Ionicons name="cloud-offline" size={40} color={colors.danger} />
      </View>
      <Text style={typography.title} className="mt-5 text-center">You are offline</Text>
      <Text style={typography.body} className="mt-2 text-center leading-5">
        Sales cannot be recorded without an internet connection. Reconnect to continue selling.
      </Text>
      <Pressable onPress={() => NetInfo.fetch()} className="mt-7 w-full items-center rounded-md bg-brand py-3">
        <Text className="text-[14px] font-bold text-white">Try Again</Text>
      </Pressable>
    </View>
  );
}
