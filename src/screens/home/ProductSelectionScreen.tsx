import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { useCartStore, selectCartCount, selectCartSubtotal } from '../../store/cartStore';
import { getProducts } from '../../api/products';
import type { Product } from '../../api/products';
import { API_URL } from '../../api/client';
import { colors, currency, typography } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = ['All', 'Fuel', 'Oil', 'Snacks', 'Others'];

function normalizeImageUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_URL.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

function ProductRow({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const isOut = product.quantity <= 0;
  const isFuel = (product.category ?? '').toLowerCase() === 'fuel';
  const stockQuantity = Math.max(0, Number(product.quantity) || 0);
  const price = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(product.unitPrice));

  return (
    <Pressable
      onPress={() => onAdd(product)}
      disabled={isOut}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${stockQuantity} in stock`}
      className={`mb-2.5 min-h-[96px] flex-row items-center rounded-xl border border-gray-200 bg-white px-4 py-3 ${isOut ? 'opacity-50' : ''}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : isOut ? 0.5 : 1 })}
    >
      <View className="h-[72px] w-[72px] items-center justify-center">
        {product.imageUrl ? (
          <Image
            source={{ uri: normalizeImageUrl(product.imageUrl) }}
            className="h-full w-full"
            resizeMode="contain"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-lg bg-brand-light">
            <Text className="text-[22px] font-extrabold text-brand">
              {product.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View className="ml-4 flex-1">
        <Text numberOfLines={1} className="text-[17px] font-extrabold text-gray-950">{product.name}</Text>
        <Text className="mt-1.5 text-[14px] text-gray-500">
          RWF {price}{isFuel ? ' / L' : ''}
        </Text>
        <View className="mt-2 flex-row items-center">
          <View className={`mr-2 h-2 w-2 rounded-full ${isOut ? 'bg-red-500' : 'bg-brand'}`} />
          <Text className={`text-[13px] font-medium ${isOut ? 'text-red-600' : 'text-green-600'}`}>
            {stockQuantity} {stockQuantity === 1 ? 'item' : 'items'} in stock
          </Text>
        </View>
      </View>

      <View
        className={`ml-3 h-11 w-11 items-center justify-center rounded-full ${isOut ? 'bg-gray-300' : 'bg-brand'}`}
      >
        <Ionicons name="add" size={29} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function ProductSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const searchInput = useRef<TextInput>(null);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const addToCart = useCartStore((s) => s.add);
  const cartCount = useCartStore(selectCartCount);
  const cartSubtotal = useCartStore(selectCartSubtotal);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  const apiCategory = category === 'All' || category === 'Others' ? undefined : category;
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['products', debouncedSearch, apiCategory, activeBranchId],
    queryFn: () =>
      getProducts({
        search: debouncedSearch || undefined,
        category: apiCategory,
        limit: 200,
        branchId: activeBranchId,
      }),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }, [queryClient])
  );

  const products = useMemo(() => {
    const available = (data?.data ?? []).filter((product) => product.itemType !== 'SERVICE');
    if (category !== 'Others') return available;

    return available.filter((product) => {
      const productCategory = (product.category ?? '').toLowerCase();
      return !['fuel', 'oil', 'snacks'].includes(productCategory);
    });
  }, [category, data]);

  const handleAdd = (product: Product) => {
    if ((product.category ?? '').toLowerCase() === 'fuel') {
      navigation.navigate('PumpSale', { product });
      return;
    }

    addToCart(
      {
        productId: product.id,
        name: product.name,
        unitPrice: Number(product.unitPrice),
        itemType: 'PRODUCT',
        stock: product.quantity,
        imageUrl: product.imageUrl,
      },
      false
    );
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('AppTabs');
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-6">
        <Pressable onPress={goBack} className="mr-8 h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="arrow-back" size={30} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-[22px] font-bold text-white">Products</Text>
        <Pressable onPress={() => searchInput.current?.focus()} className="h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="search" size={29} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-1 overflow-hidden rounded-t-[18px] bg-white">
        <View className="px-5 pb-3 pt-4">
          <View className="min-h-[46px] flex-row items-center rounded-lg border border-gray-200 bg-white">
            <Ionicons name="search" size={23} color="#777984" style={{ marginLeft: 15 }} />
            <TextInput
              ref={searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search products..."
              placeholderTextColor="#777984"
              className="ml-3 flex-1 py-3 text-[16px] text-gray-900"
              autoCorrect={false}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={19} color="#8B8D96" />
              </Pressable>
            ) : null}
            <View className="ml-3 h-[46px] w-12 items-center justify-center border-l border-gray-200">
              <Ionicons name="filter" size={23} color="#777984" />
            </View>
          </View>

          <View className="mt-3.5 flex-row" style={{ gap: 10 }}>
            {CATEGORIES.map((item) => {
              const selected = item === category;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  className={`min-h-10 flex-1 items-center justify-center rounded-lg border ${selected ? 'border-brand bg-brand-lighter' : 'border-transparent bg-gray-100'}`}
                >
                  <Text className={`text-[14px] font-medium ${selected ? 'text-green-600' : 'text-gray-950'}`}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center bg-white px-8">
            <Ionicons name="cloud-offline-outline" size={40} color={colors.text.muted} />
            <Text style={typography.subheading} className="mt-3 text-center">Could not load products</Text>
            <Text style={typography.body} className="mt-1 text-center">
              {(error as any)?.message ?? 'Check your connection and try again.'}
            </Text>
            <Pressable onPress={() => refetch()} className="mt-4 rounded-lg bg-brand px-6 py-3">
              <Text className="text-[14px] font-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : products.length === 0 ? (
          <View className="flex-1 items-center justify-center bg-white px-8">
            <Ionicons name="pricetags-outline" size={40} color={colors.text.muted} />
            <Text style={typography.subheading} className="mt-3 text-center">No products found</Text>
            <Text style={typography.body} className="mt-1 text-center">
              {debouncedSearch ? `No results for “${debouncedSearch}”.` : 'Products for this branch will appear here.'}
            </Text>
          </View>
        ) : (
          <FlatList
            className="flex-1"
            data={products}
            keyExtractor={(product) => String(product.id)}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand.DEFAULT} />}
            renderItem={({ item }) => <ProductRow product={item} onAdd={handleAdd} />}
          />
        )}

        {cartCount > 0 ? (
          <View className="border-t border-gray-200 bg-white px-5 pb-4 pt-3">
            <Pressable
              onPress={() => navigation.navigate('Cart')}
              accessibilityRole="button"
              accessibilityLabel={`View cart with ${cartCount} items`}
              className="min-h-[58px] flex-row items-center rounded-xl bg-brand px-4"
              style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Ionicons name="cart-outline" size={23} color="#fff" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-bold text-white">View Cart</Text>
                <Text className="mt-0.5 text-[12px] text-white/80">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
              <Text className="mr-2 text-[15px] font-bold text-white">{currency(cartSubtotal)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
