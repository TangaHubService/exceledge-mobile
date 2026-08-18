import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageSwitcher } from './LanguageSwitcher';

export const AUTH_BLUE = '#0866E5';

export function AuthScaffold({
  children,
  onBack,
  showLanguage = true,
}: {
  children: ReactNode;
  onBack?: () => void;
  showLanguage?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.topGlow} />
        <View style={styles.waveBack} />
        <View style={styles.waveMiddle} />
        <View style={styles.waveFront} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            {onBack ? (
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                hitSlop={12}
                onPress={onBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <Ionicons name="arrow-back" size={27} color="#FFFFFF" />
              </Pressable>
            ) : null}

            {showLanguage ? (
              <View style={styles.language}>
                <LanguageSwitcher appearance="plain" />
              </View>
            ) : null}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      accessibilityLabel="Excledge ERP"
      source={require('../../assets/logo.png')}
      resizeMode="contain"
      style={compact ? styles.compactLogo : styles.logo}
    />
  );
}

type AuthInputProps = TextInputProps & {
  error?: string | null;
  hidden?: boolean;
  onToggleHidden?: () => void;
};

export function AuthInput({
  error,
  hidden,
  onToggleHidden,
  style,
  ...props
}: AuthInputProps) {
  return (
    <View style={styles.inputGroup}>
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        <TextInput
          {...props}
          placeholderTextColor="#697077"
          selectionColor={AUTH_BLUE}
          style={[styles.input, style]}
        />
        {onToggleHidden ? (
          <Pressable
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={onToggleHidden}
            style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color="#5F666D"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}) {
  const inactive = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'outline' ? styles.outlineButton : styles.primaryButton,
        disabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : AUTH_BLUE} />
      ) : (
        <Text style={variant === 'primary' ? styles.primaryButtonText : styles.outlineButtonText}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function AuthNotice({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'success';
}) {
  return (
    <View style={[styles.notice, tone === 'success' ? styles.successNotice : styles.errorNotice]}>
      <Ionicons
        name={tone === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={19}
        color={tone === 'success' ? '#15803D' : '#C62828'}
      />
      <Text style={[styles.noticeText, tone === 'success' ? styles.successText : styles.errorText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, overflow: 'hidden', backgroundColor: '#003D2C' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 21, paddingBottom: 28 },
  topBar: { minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    position: 'absolute',
    top: 10,
    left: -10,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  language: { alignItems: 'center' },
  logo: { width: 245, height: 112, alignSelf: 'flex-start' },
  compactLogo: { width: 136, height: 84, alignSelf: 'center' },
  inputGroup: { width: '100%' },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D5D9DD',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  inputShellError: { borderColor: '#D14343' },
  input: {
    minHeight: 54,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: '#1C1E21',
    fontSize: 16,
    fontWeight: '400',
  },
  eyeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginRight: 12,
    borderRadius: 21,
  },
  fieldError: {
    marginTop: 6,
    marginLeft: 4,
    color: '#C62828',
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    width: '100%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderRadius: 999,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  primaryButton: { backgroundColor: AUTH_BLUE },
  outlineButton: { borderWidth: 1.5, borderColor: AUTH_BLUE, backgroundColor: '#FFFFFF' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '500' },
  outlineButtonText: { color: AUTH_BLUE, fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.55 },
  pressed: { opacity: 0.55 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  errorNotice: { borderColor: '#F2C5C5', backgroundColor: '#FFF4F4' },
  successNotice: { borderColor: '#B7E2C1', backgroundColor: '#F0FBF3' },
  noticeText: { flex: 1, marginLeft: 8, fontSize: 13, lineHeight: 19 },
  errorText: { color: '#9F2020' },
  successText: { color: '#166534' },
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
