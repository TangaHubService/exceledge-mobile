import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useCartStore, selectCartCount, selectCartSubtotal } from '../../store/cartStore';
import { useShiftStore } from '../../store/shiftStore';
import { createHeldSale } from '../../api/heldSales';
import { API_URL } from '../../api/client';
import { ScreenHeader } from '../../components/ui';
import { colors, currency, typography } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function normalizeImageUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_URL.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

export default function CartScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const items = useCartStore((s) => s.items);
  const customer = useCartStore((s) => s.customer);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const activeShift = useShiftStore((s) => s.activeShift);

  const subtotal = useCartStore(selectCartSubtotal);
  const count = useCartStore(selectCartCount);

  const [holdError, setHoldError] = useState<string | null>(null);

  const holdMutation = useMutation({
    mutationFn: () =>
      createHeldSale({
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          itemType: i.itemType,
          imageUrl: i.imageUrl,
          stock: i.stock,
        })),
        customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone, TIN: customer.TIN } : null,
        shiftId: activeShift?.id ?? undefined,
      }),
    onSuccess: () => {
      clear();
      navigation.goBack();
    },
    onError: (e: any) => setHoldError(e?.response?.data?.error ?? e?.message ?? 'Failed to hold sale.'),
  });

  const handleHold = () => {
    if (items.length === 0) return;
    setHoldError(null);
    holdMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker">
      <ScreenHeader
        title={t('cart.title')}
        subtitle={`${count} ${t('cart.items')}`}
        back
        onBack={() => navigation.goBack()}
        right={items.length > 0 ? (
          <Pressable onPress={clear} className="flex-row items-center rounded-md bg-white/10 px-3 py-2">
            <Ionicons name="trash-outline" size={14} color="#fff" />
            <Text className="ml-1.5 text-[11px] font-bold text-white">{t('cart.clear')}</Text>
          </Pressable>
        ) : undefined}
      />

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center bg-background px-8">
          <Ionicons name="cart-outline" size={44} color={colors.text.muted} />
          <Text style={typography.subheading} className="mt-3">{t('cart.empty')}</Text>
          <Text style={typography.body} className="mt-1 text-center">
            {t('cart.emptyDesc')}
          </Text>
          <Pressable onPress={() => navigation.goBack()} className="mt-5 rounded-md bg-brand px-6 py-3">
            <Text className="text-sm font-semibold text-white">{t('cart.browseProducts')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          className="bg-background"
          data={items}
          keyExtractor={(i) => i.key}
          contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
          renderItem={({ item }) => (
            <View className="mb-3 rounded-lg border border-border bg-white p-4">
              <View className="flex-row">
                <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-brand-light">
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: normalizeImageUrl(item.imageUrl) }}
                      className="h-full w-full"
                      resizeMode="contain"
                    />
                  ) : (
                    <Text className="text-lg font-bold text-brand" style={{ opacity: 0.5 }}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text numberOfLines={2} className="text-[14px] font-semibold text-gray-800">{item.name}</Text>
                  <Text className="mt-0.5 text-[13px] font-bold tabular-nums text-brand-dark">{currency(item.unitPrice)}</Text>
                  {item.stock !== undefined ? (
                    <Text className="mt-1 text-[11px] text-gray-500">
                      {Math.max(0, Number(item.stock) - item.quantity)} remaining in stock
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => remove(item.key)} hitSlop={10}>
                  <Ionicons name="trash" size={19} color={colors.danger} />
                </Pressable>
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center rounded-md border border-border">
                  <Pressable onPress={() => decrement(item.key)} className="px-3 py-2">
                    <Ionicons name="remove" size={16} color={colors.text.secondary} />
                  </Pressable>
                  <Text className="min-w-8 text-center text-[15px] font-bold tabular-nums text-gray-800">{item.quantity}</Text>
                  <Pressable onPress={() => increment(item.key)} className="px-3 py-2">
                    <Ionicons name="add" size={16} color={colors.brand.DEFAULT} />
                  </Pressable>
                </View>
                <Text className="text-[15px] font-bold tabular-nums text-gray-900">
                  {currency(item.unitPrice * item.quantity)}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View className="mt-2">
              {holdError ? (
                <View className="mb-3 rounded-md bg-red-50 px-4 py-3">
                  <Text className="text-[13px] text-red-600">{holdError}</Text>
                </View>
              ) : null}
              <Pressable
                onPress={handleHold}
                disabled={holdMutation.isPending}
                className="flex-row items-center justify-center rounded-md border border-border bg-white py-3"
              >
                <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
                <Text className="ml-2 text-[14px] font-semibold text-gray-700">
                  {holdMutation.isPending ? t('cart.holding') : t('cart.holdSale')}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Summary footer */}
      {items.length > 0 ? (
        <View className="border-t border-border bg-white px-4 pb-4 pt-3">
          <Pressable
            onPress={() => navigation.navigate('CustomerPicker')}
            className="mb-3 flex-row items-center rounded-md border border-border bg-gray-50 px-4 py-3"
          >
            <Ionicons name="person-circle-outline" size={20} color={colors.brand.DEFAULT} />
            <View className="ml-2 flex-1">
              <Text style={typography.caption}>{t('cart.customer')}</Text>
              <Text className="text-[14px] font-semibold text-gray-800">{customer?.name ?? t('cart.walkIn')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </Pressable>

          <View className="mb-3 flex-row items-center justify-between px-1">
            <Text style={typography.body}>{t('cart.total')}</Text>
            <Text className="text-[20px] font-extrabold tabular-nums text-brand-dark">{currency(subtotal)}</Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate('CustomerPicker')}
            className="flex-row items-center justify-center rounded-lg bg-brand py-4"
          >
            <Text className="text-[15px] font-bold text-white">{t('cart.continue')} · {currency(subtotal)}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
