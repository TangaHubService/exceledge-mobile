import Toast, { type ToastConfig } from 'react-native-toast-message';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

const TINT: Record<string, string> = {
  success: colors.success,
  error: colors.danger,
  warning: colors.warning,
  info: colors.info,
};

export const toastConfig: ToastConfig = {
  success: (props) => renderToast(props, 'success'),
  error: (props) => renderToast(props, 'error'),
  warning: (props) => renderToast(props, 'warning'),
  info: (props) => renderToast(props, 'info'),
};

function renderToast(props: any, type: string) {
  return (
    <View className="mx-4 flex-row items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5"
      style={{ shadowColor: '#0B241A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
      <Ionicons name={ICONS[type]} size={22} color={TINT[type]} />
      <View className="flex-1">
        <Text className="text-[14px] font-bold text-gray-950">{props.text1}</Text>
        {props.text2 ? <Text className="mt-0.5 text-[12px] leading-4 text-gray-600">{props.text2}</Text> : null}
      </View>
    </View>
  );
}

export const toast = {
  success: (text1: string, text2?: string) => Toast.show({ type: 'success', text1, text2, visibilityTime: 3200 }),
  error: (text1: string, text2?: string) => Toast.show({ type: 'error', text1, text2, visibilityTime: 4000 }),
  warning: (text1: string, text2?: string) => Toast.show({ type: 'warning', text1, text2, visibilityTime: 3800 }),
  info: (text1: string, text2?: string) => Toast.show({ type: 'info', text1, text2, visibilityTime: 3200 }),
};