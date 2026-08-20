import './src/theme/global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';
import PinLockScreen from './src/components/PinLockScreen';
import { initI18n } from './src/i18n';
import { useAuthStore } from './src/store/authStore';
import { usePrinterStore } from './src/store/printerStore';
import { useSecurityStore } from './src/store/securityStore';
import { colors } from './src/theme';
import { toastConfig } from './src/utils/toast';
import Toast from 'react-native-toast-message';

const queryClient = new QueryClient();

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  const accessToken = useAuthStore((s) => s.accessToken);
  const securityHydrated = useSecurityStore((s) => s.isHydrated);
  const securityLocked = useSecurityStore((s) => s.locked);

  useEffect(() => {
    usePrinterStore.getState().hydrate();
    useSecurityStore.getState().hydrate();
  }, []);

  // Auto-lock when the app is backgrounded past the configured idle timeout.
  useEffect(() => {
    let backgroundedAt: number | null = null;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt = Date.now();
      } else if (nextState === 'active') {
        const store = useSecurityStore.getState();
        const timeoutMs = store.autoLockMinutes * 60_000;
        if (store.pinEnabled && store.hasPin && timeoutMs > 0 && backgroundedAt && Date.now() - backgroundedAt >= timeoutMs) {
          store.lock();
        }
        backgroundedAt = null;
      }
    });
    return () => subscription.remove();
  }, []);

  if (!i18nReady || !securityHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-darker">
        <ActivityIndicator size="large" color={colors.text.inverse} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            {accessToken && securityLocked ? <PinLockScreen /> : <RootNavigator />}
            <StatusBar style="light" />
          </NavigationContainer>
          <Toast config={toastConfig} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}