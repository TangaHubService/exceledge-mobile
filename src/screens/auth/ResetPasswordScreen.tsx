import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { resetPassword, verifyPasswordResetCode } from '../../api/auth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  AuthButton,
  AuthInput,
  AuthLogo,
  AuthNotice,
  AuthScaffold,
} from '../../components/AuthScaffold';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type Route = RouteProp<RootStackParamList, 'ResetPassword'>;

function apiError(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback
  );
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const email = route.params.email;
  const [code, setCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [complete, setComplete] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: verifyPasswordResetCode,
    onSuccess: () => setCodeVerified(true),
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => setComplete(true),
  });

  const verifyCode = () => {
    if (!/^\d{6}$/.test(code)) {
      setCodeError(t('auth.otpLength'));
      return;
    }

    setCodeError(null);
    verifyMutation.mutate({ email, code });
  };

  const submitPassword = () => {
    const nextErrors: typeof passwordErrors = {};

    if (newPassword.length < 8) nextErrors.newPassword = t('auth.passwordMin');
    if (confirmPassword !== newPassword) nextErrors.confirmPassword = t('auth.passwordsMismatch');

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    resetMutation.mutate({ email, code, newPassword });
  };

  const goToLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (complete) {
    return (
      <AuthScaffold showLanguage={false}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{t('auth.resetSuccessTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.resetSuccessDescription')}</Text>
          <View style={styles.fullWidthButton}>
            <AuthButton onPress={goToLogin} title={t('auth.backToLogin')} />
          </View>
        </View>
      </AuthScaffold>
    );
  }

  if (!codeVerified) {
    const verifyError = verifyMutation.isError
      ? apiError(verifyMutation.error, t('auth.verifyCodeError'))
      : null;

    return (
      <AuthScaffold onBack={() => navigation.goBack()}>
        <View style={styles.logoSection}>
          <AuthLogo compact />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.verifyCodeTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.otpSentDescription', { email })}</Text>

          <View style={styles.otpForm}>
            <AuthInput
              autoFocus
              error={codeError}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => {
                setCode(value.replace(/\D/g, '').slice(0, 6));
                setCodeError(null);
                if (verifyMutation.isError) verifyMutation.reset();
              }}
              onSubmitEditing={verifyCode}
              placeholder={t('auth.otpPlaceholder')}
              returnKeyType="done"
              style={styles.otpInput}
              textContentType="oneTimeCode"
              value={code}
            />

            {verifyError ? (
              <View style={styles.noticeSpacing}>
                <AuthNotice message={verifyError} />
              </View>
            ) : null}

            <View style={styles.buttonSpacing}>
              <AuthButton
                loading={verifyMutation.isPending}
                onPress={verifyCode}
                title={verifyMutation.isPending ? t('auth.verifyingCode') : t('auth.verifyCode')}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('ForgotPassword')}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryActionText}>{t('auth.useAnotherEmail')}</Text>
            </Pressable>
          </View>
        </View>
      </AuthScaffold>
    );
  }

  const resetError = resetMutation.isError
    ? apiError(resetMutation.error, t('auth.resetError'))
    : null;

  return (
    <AuthScaffold onBack={() => setCodeVerified(false)}>
      <View style={styles.logoSectionSmall}>
        <AuthLogo compact />
      </View>

      <View style={styles.passwordContent}>
        <Text style={styles.title}>{t('auth.newPasswordTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.codeVerifiedDescription')}</Text>

        <View style={styles.passwordForm}>
          <AuthNotice message={t('auth.codeVerified')} tone="success" />

          <View style={styles.fieldSpacing}>
            <AuthInput
              autoCapitalize="none"
              autoComplete="new-password"
              error={passwordErrors.newPassword}
              hidden={!showNewPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setPasswordErrors((current) => ({ ...current, newPassword: undefined }));
                if (resetMutation.isError) resetMutation.reset();
              }}
              onToggleHidden={() => setShowNewPassword((visible) => !visible)}
              placeholder={t('auth.newPassword')}
              secureTextEntry={!showNewPassword}
              textContentType="newPassword"
              value={newPassword}
            />
          </View>

          <View style={styles.fieldSpacing}>
            <AuthInput
              autoCapitalize="none"
              autoComplete="new-password"
              error={passwordErrors.confirmPassword}
              hidden={!showConfirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setPasswordErrors((current) => ({ ...current, confirmPassword: undefined }));
                if (resetMutation.isError) resetMutation.reset();
              }}
              onSubmitEditing={submitPassword}
              onToggleHidden={() => setShowConfirmPassword((visible) => !visible)}
              placeholder={t('auth.confirmPassword')}
              returnKeyType="done"
              secureTextEntry={!showConfirmPassword}
              textContentType="newPassword"
              value={confirmPassword}
            />
          </View>

          {resetError ? (
            <View style={styles.noticeSpacing}>
              <AuthNotice message={resetError} />
            </View>
          ) : null}

          <View style={styles.buttonSpacing}>
            <AuthButton
              loading={resetMutation.isPending}
              onPress={submitPassword}
              title={resetMutation.isPending ? t('auth.resettingPassword') : t('auth.resetPassword')}
            />
          </View>
        </View>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  logoSection: { marginTop: 18, alignItems: 'center' },
  logoSectionSmall: { marginTop: 4, alignItems: 'center' },
  content: { marginTop: 40 },
  passwordContent: { marginTop: 16 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    maxWidth: 350,
    alignSelf: 'center',
    marginTop: 10,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  otpForm: { marginTop: 32 },
  passwordForm: { marginTop: 24 },
  otpInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  fieldSpacing: { marginTop: 16 },
  noticeSpacing: { marginTop: 13 },
  buttonSpacing: { marginTop: 20 },
  secondaryAction: { alignSelf: 'center', marginTop: 13, padding: 10 },
  secondaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  successContent: {
    flex: 1,
    minHeight: 580,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  successIcon: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 31,
    borderRadius: 46,
    backgroundColor: '#0866E5',
  },
  fullWidthButton: { width: '100%', marginTop: 34 },
});
