import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { requestPasswordReset } from '../../api/auth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  AuthButton,
  AuthInput,
  AuthLogo,
  AuthNotice,
  AuthScaffold,
} from '../../components/AuthScaffold';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => {
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    },
  });

  const submit = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailError(t('auth.emailRequired'));
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setEmailError(t('auth.emailInvalid'));
      return;
    }

    setEmailError(null);
    mutation.mutate({ email: normalizedEmail });
  };

  const serverError = mutation.isError
    ? (mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
      t('auth.resetRequestError')
    : null;

  return (
    <AuthScaffold onBack={() => navigation.goBack()}>
      <View style={styles.logoSection}>
        <AuthLogo compact />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.resetTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.resetSubtitle')}</Text>

        <View style={styles.form}>
          <AuthInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            error={emailError}
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setEmailError(null);
              if (mutation.isError) mutation.reset();
            }}
            onSubmitEditing={submit}
            placeholder={t('auth.emailPlaceholder')}
            returnKeyType="send"
            textContentType="emailAddress"
            value={email}
          />

          {serverError ? (
            <View style={styles.noticeSpacing}>
              <AuthNotice message={serverError} />
            </View>
          ) : null}

          <View style={styles.buttonSpacing}>
            <AuthButton
              loading={mutation.isPending}
              onPress={submit}
              title={mutation.isPending ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
            />
          </View>
        </View>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  logoSection: { marginTop: 36, alignItems: 'center' },
  content: { marginTop: 46 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    maxWidth: 340,
    alignSelf: 'center',
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  form: { marginTop: 34 },
  noticeSpacing: { marginTop: 14 },
  buttonSpacing: { marginTop: 20 },
});
