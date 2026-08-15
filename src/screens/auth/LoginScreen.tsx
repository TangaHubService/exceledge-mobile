import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { colors } from '../../theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => setSession(data),
  });

  const errorMessage =
    (mutation.error as any)?.response?.data?.error ??
    (mutation.isError ? t('auth.loginError') : null);

  return (
    <SafeAreaView className="flex-1 overflow-hidden" style={{ backgroundColor: colors.brand.darker }}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.topGlow} />
        <View style={styles.waveBack} />
        <View style={styles.waveMiddle} />
        <View style={styles.waveFront} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Image
              source={require('../../../assets/android-icon-foreground.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <View className="mt-10">
              <Text className="text-[27px] font-extrabold text-white">Welcome Back</Text>
              <Text className="mt-1.5 text-[16px] text-white/80">Sign in to continue</Text>
            </View>

            <View className="mt-9 rounded-lg bg-white p-1.5">
              <Text className="px-2.5 pb-1.5 pt-2 text-[14px] text-gray-700">Username / Phone / Employee ID</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Username / Phone / Employee ID"
                placeholderTextColor={colors.text.muted}
                className="min-h-12 rounded-md border border-gray-200 bg-white px-3.5 text-[16px] font-semibold text-gray-900"
              />

              <Text className="mb-1.5 mt-5 px-2.5 text-[14px] text-gray-700">Password</Text>
              <View className="min-h-12 flex-row items-center rounded-md border border-gray-200 bg-white px-3.5">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                  className="flex-1 py-3 text-[16px] font-semibold text-gray-900"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#0B0D0C" />
                </Pressable>
              </View>
            </View>

            {errorMessage ? (
              <Text className="mt-2 text-[13px] text-red-300">{errorMessage}</Text>
            ) : null}

            <Pressable
              onPress={() => mutation.mutate({ email, password })}
              disabled={!email || !password || mutation.isPending}
              className="mt-4 min-h-12 items-center justify-center rounded-lg bg-brand disabled:opacity-50"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-[17px] font-medium text-white">Login</Text>
              )}
            </Pressable>

            <Pressable className="mt-5 items-center">
              <Text className="text-[16px] text-white/90">Forgot Password?</Text>
            </Pressable>

            <View className="mt-7 items-center">
              <LanguageSwitcher appearance="plain" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 44,
    paddingBottom: 40,
  },
  logo: {
    width: 245,
    height: 112,
    alignSelf: 'flex-start',
  },
  topGlow: {
    position: 'absolute',
    top: 30,
    left: -135,
    width: 470,
    height: 470,
    borderRadius: 235,
    backgroundColor: '#006443',
    opacity: 0.2,
  },
  waveBack: {
    position: 'absolute',
    bottom: -142,
    left: -180,
    width: 720,
    height: 255,
    borderRadius: 180,
    backgroundColor: '#006040',
    opacity: 0.5,
    transform: [{ rotate: '-13deg' }],
  },
  waveMiddle: {
    position: 'absolute',
    bottom: -102,
    left: -105,
    width: 680,
    height: 150,
    borderRadius: 150,
    backgroundColor: '#008050',
    opacity: 0.28,
    transform: [{ rotate: '-10deg' }],
  },
  waveFront: {
    position: 'absolute',
    right: -310,
    bottom: -165,
    width: 720,
    height: 300,
    borderRadius: 200,
    backgroundColor: '#00543B',
    opacity: 0.62,
    transform: [{ rotate: '12deg' }],
  },
});
