import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  AuthButton,
  AuthInput,
  AuthLogo,
  AuthNotice,
  AuthScaffold,
} from '../../components/AuthScaffold';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Login'>;

function apiError(error: unknown, fallback: string): string {
  const responseMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return responseMessage || fallback;
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const setSession = useAuthStore((state) => state.setSession);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => setSession(data),
  });

  const submit = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFormError(t('auth.emailRequired'));
      return;
    }
    if (!password) {
      setFormError(t('auth.passwordRequired'));
      return;
    }
    if (mutation.isPending) return;
    setFormError(null);
    mutation.mutate({ email: normalizedEmail, password });
  };

  const errorMessage =
    formError || (mutation.isError ? apiError(mutation.error, t('auth.loginError')) : null);

  return (
    <AuthScaffold>
      <View style={styles.logoSection}>
        <AuthLogo />
      </View>

      <View style={styles.heading}>
        <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.signInToContinue')}</Text>
      </View>

      <View style={styles.form}>
        <AuthInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            setFormError(null);
            if (mutation.isError) mutation.reset();
          }}
          placeholder={t('auth.emailPlaceholder')}
          returnKeyType="next"
          textContentType="username"
          value={email}
        />

        <View style={styles.fieldSpacing}>
          <AuthInput
            autoCapitalize="none"
            autoComplete="current-password"
            onChangeText={(value) => {
              setPassword(value);
              setFormError(null);
              if (mutation.isError) mutation.reset();
            }}
            onSubmitEditing={submit}
            onToggleHidden={() => setShowPassword((visible) => !visible)}
            placeholder={t('auth.password')}
            returnKeyType="go"
            secureTextEntry={!showPassword}
            textContentType="password"
            hidden={!showPassword}
            value={password}
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorSpacing}>
            <AuthNotice message={errorMessage} />
          </View>
        ) : null}

        <View style={styles.buttonSpacing}>
          <AuthButton
            loading={mutation.isPending}
            onPress={submit}
            title={t('auth.login')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => navigation.navigate('ForgotPassword')}
          style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}
        >
          <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Excledge ERP</Text>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  logoSection: { marginTop: 2, alignItems: 'flex-start' },
  heading: { marginTop: 14 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '800' },
  subtitle: { marginTop: 6, color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  form: { marginTop: 24 },
  fieldSpacing: { marginTop: 16 },
  errorSpacing: { marginTop: 13 },
  buttonSpacing: { marginTop: 20 },
  forgotButton: {
    alignSelf: 'center',
    marginTop: 17,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  forgotText: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: '500' },
  footer: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 34,
  },
  footerBrand: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  pressed: { opacity: 0.55 },
});
