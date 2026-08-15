import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useCartStore } from '../../store/cartStore';
import { AppButton, Card, ScreenHeader } from '../../components/ui';
import { colors, currency, typography } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PumpSale'>;

const PUMPS = ['01', '02', '03', '04', '05', '06'];
const NOZZLES = ['1', '2', '3', '4'];

function OptionRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-1.5 text-[13px] font-semibold text-gray-600">{label}</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {options.map((o) => {
          const selected = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => onSelect(o)}
              className={`rounded-md border px-4 py-2.5 ${selected ? 'border-brand bg-brand-light' : 'border-border bg-white'}`}
            >
              <Text className={`text-[14px] font-semibold ${selected ? 'text-brand-dark' : 'text-gray-700'}`}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function PumpSaleScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { product } = route.params;
  const addToCart = useCartStore((s) => s.add);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const [pump, setPump] = useState(PUMPS[2]);
  const [nozzle, setNozzle] = useState(NOZZLES[0]);
  const [quantityText, setQuantityText] = useState('');

  const unitPrice = Number(product.unitPrice);
  const quantity = Math.max(0, Number(quantityText) || 0);
  const total = useMemo(() => quantity * unitPrice, [quantity, unitPrice]);

  const handleAdd = () => {
    if (quantity <= 0) return;
    addToCart(
      {
        productId: product.id,
        name: product.name,
        unitPrice,
        itemType: 'PRODUCT',
        stock: product.quantity,
        imageUrl: product.imageUrl,
      },
      false
    );
    setQuantity(`p-${product.id}`, quantity, false);
    navigation.navigate('Cart');
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker">
      <ScreenHeader title="Pump Sale" subtitle={product.name} back onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Card>
            <OptionRow label="Pump" value={pump} options={PUMPS} onSelect={setPump} />
            <OptionRow label="Nozzle" value={nozzle} options={NOZZLES} onSelect={setNozzle} />

            <Text className="mb-1.5 mt-4 text-[13px] font-semibold text-gray-600">Fuel Type</Text>
            <View className="rounded-md border border-border bg-gray-50 px-4 py-3">
              <Text className="text-[15px] font-semibold text-gray-800">{product.name}</Text>
            </View>

            <Text className="mb-1.5 mt-4 text-[13px] font-semibold text-gray-600">Quantity (L)</Text>
            <View className="flex-row items-center rounded-md border border-border bg-white px-4">
              <TextInput
                value={quantityText}
                onChangeText={setQuantityText}
                keyboardType="numeric"
                placeholder="0"
                className="flex-1 py-3 text-lg font-bold"
              />
              <Text className="text-sm text-gray-400">L</Text>
            </View>

            <View className="mt-4 flex-row items-center justify-between border-t border-gray-50 pt-4">
              <Text style={typography.body}>Unit Price (RWF/L)</Text>
              <Text className="text-[15px] font-bold tabular-nums text-gray-800">{currency(unitPrice)}</Text>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Text style={typography.subheading}>Total Amount</Text>
              <Text className="text-[22px] font-extrabold tabular-nums text-brand-dark">{currency(total)}</Text>
            </View>
          </Card>

          <AppButton
            title="Add to Sale"
            onPress={handleAdd}
            disabled={quantity <= 0}
            className="mt-5"
            icon={<Ionicons name="add-circle" size={18} color="#fff" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
