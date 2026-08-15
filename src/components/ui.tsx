import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  compact?: boolean;
  className?: string;
}

const variants: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: 'bg-brand', text: 'text-white' },
  secondary: { bg: 'bg-brand-light', text: 'text-brand-dark' },
  danger: { bg: 'bg-red-50', text: 'text-red-600' },
  success: { bg: 'bg-emerald-600', text: 'text-white' },
  ghost: { bg: 'bg-transparent', text: 'text-brand-dark', border: 'border border-brand-light' },
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  compact = false,
  className = '',
}: Props) {
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`min-h-11 flex-row items-center justify-center rounded-md ${v.bg} ${v.border ?? ''} ${
        fullWidth ? 'w-full' : 'px-4'
      } ${compact ? 'py-2' : 'py-3'} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.brand.dark : colors.text.inverse} />
      ) : (
        <>
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text className={`text-[14px] font-bold ${v.text}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function PressableCard({
  title,
  subtitle,
  icon,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-lg border border-border bg-white p-4"
      style={{ ...shadowsCard }}
    >
      {icon ? <View className="mr-3">{icon}</View> : null}
      <View className="flex-1">
        <Text style={typography.subheading}>{title}</Text>
        {subtitle ? <Text style={typography.caption} className="mt-0.5">{subtitle}</Text> : null}
      </View>
      {right ?? <Text className="text-gray-400">›</Text>}
    </Pressable>
  );
}

const shadowsCard = {
  shadowColor: '#0B241A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.035,
  shadowRadius: 5,
  elevation: 1,
};

export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: any }) {
  return (
    <View className={`rounded-lg border border-border bg-white p-4 ${className}`} style={{ ...shadowsCard, ...(style ?? {}) }}>
      {children}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
}) {
  const tones = {
    neutral: { bg: 'bg-gray-100', text: 'text-gray-600' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700' },
    danger: { bg: 'bg-red-50', text: 'text-red-600' },
    brand: { bg: 'bg-brand-light', text: 'text-brand-dark' },
  };
  const selectedTone = tones[tone];
  return (
    <View className={`rounded-full px-2 py-0.5 ${selectedTone.bg}`}>
      <Text className={`text-[11px] font-semibold ${selectedTone.text}`}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: string;
  title: string;
  message?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      {icon ? <Text className="mb-3 text-4xl">{icon}</Text> : null}
      <Text style={typography.subheading} className="text-center">{title}</Text>
      {message ? (
        <Text style={typography.body} className="mt-1.5 text-center leading-5">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      <Text style={typography.caption} className="mt-3">{label}</Text>
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  back,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
}) {
  return (
    <View className="min-h-14 flex-row items-center bg-brand-darker px-4 py-2.5">
      {back ? (
        <Pressable onPress={onBack} className="mr-2 h-9 w-9 items-center justify-center" hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.text.inverse} />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-white">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-[11px] text-white/65">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="mx-4 mb-3 rounded-md bg-red-50 px-4 py-3">
      <Text className="text-[13px] leading-5 text-red-600">{message}</Text>
    </View>
  );
}
