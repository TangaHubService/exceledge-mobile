import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthLogo } from './AuthScaffold';
import { useSecurityStore } from '../store/securityStore';
import { colors } from '../theme';

const PIN_LENGTH = 4;

function Key({ label, onPress, icon }: { label?: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-[76px] w-[76px] items-center justify-center rounded-full"
      style={({ pressed }) => (pressed ? { backgroundColor: 'rgba(255,255,255,0.14)' } : undefined)}
      hitSlop={6}
    >
      {icon ? <Ionicons name={icon} size={28} color="#fff" /> : <Text className="text-[28px] font-bold text-white">{label}</Text>}
    </Pressable>
  );
}

export default function PinLockScreen() {
  const unlock = useSecurityStore((s) => s.unlock);
  const verifyPin = useSecurityStore((s) => s.verifyPin);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    let cancelled = false;
    verifyPin(pin).then((ok) => {
      if (cancelled) return;
      if (ok) {
        unlock();
      } else {
        setError(true);
        setPin('');
        setTimeout(() => setError(false), 900);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pin, unlock, verifyPin]);

  const pressKey = (digit: string) => {
    if (error || pin.length >= PIN_LENGTH) return;
    setPin((prev) => prev + digit);
  };

  const backspace = () => {
    if (error) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <View className="flex-1 items-center justify-center bg-brand-darker px-10">
      <AuthLogo compact />
      <Text className="mt-2 text-[13px] text-white/60">Enter your PIN to unlock</Text>

      <View className="mt-8 flex-row" style={{ gap: 16 }}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            className={`h-[18px] w-[18px] rounded-full border ${index < pin.length ? 'border-brand-solid bg-brand-solid' : 'border-white/50'}`}
          />
        ))}
      </View>
      {error ? <Text className="mt-4 text-[13px] font-semibold text-red-400">Incorrect PIN, try again</Text> : null}

      <View className="mt-10 flex-row" style={{ gap: 24 }}>
        {['1', '2', '3'].map((d) => <Key key={d} label={d} onPress={() => pressKey(d)} />)}
      </View>
      <View className="mt-4 flex-row" style={{ gap: 24 }}>
        {['4', '5', '6'].map((d) => <Key key={d} label={d} onPress={() => pressKey(d)} />)}
      </View>
      <View className="mt-4 flex-row" style={{ gap: 24 }}>
        {['7', '8', '9'].map((d) => <Key key={d} label={d} onPress={() => pressKey(d)} />)}
      </View>
      <View className="mt-4 flex-row" style={{ gap: 24 }}>
        <Key onPress={() => {}} />
        <Key label="0" onPress={() => pressKey('0')} />
        <Key icon="backspace-outline" onPress={backspace} />
      </View>
      <Text className="mt-8 text-center text-[11px] leading-4 text-white/40" style={{ color: colors.text.muted }}>
        Protected by the PIN you set in Settings → Security.
      </Text>
    </View>
  );
}