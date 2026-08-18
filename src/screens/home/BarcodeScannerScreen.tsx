import { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { getProducts } from '../../api/products';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function BarcodeScannerScreen() {
  const navigation = useNavigation<Nav>();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const addToCart = useCartStore((s) => s.add);
  const [permission, requestPermission] = useCameraPermissions();
  const [lookingUp, setLookingUp] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  // Camera keeps emitting frames for the same code while it's in view — this
  // latch stops a single physical scan from triggering repeated lookups.
  const scanLocked = useRef(false);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ProductSelection'));

  const handleScan = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanLocked.current || !data) return;
      scanLocked.current = true;
      setNotFound(null);
      setLookingUp(true);
      try {
        const res = await getProducts({ search: data, branchId: activeBranchId, limit: 10 });
        const products = res?.data ?? [];
        const match = products.find((p) => p.barcode === data) ?? products[0];

        if (!match) {
          setNotFound(data);
          scanLocked.current = false;
          return;
        }

        const isService = match.itemType === 'SERVICE';
        addToCart(
          {
            productId: match.id,
            name: match.name,
            unitPrice: Number(match.unitPrice),
            itemType: isService ? 'SERVICE' : 'PRODUCT',
            stock: isService ? undefined : match.quantity,
            imageUrl: match.imageUrl,
          },
          false
        );
        goBack();
      } catch {
        setNotFound(data);
        scanLocked.current = false;
      } finally {
        setLookingUp(false);
      }
    },
    [activeBranchId, addToCart]
  );

  const scanAgain = () => {
    setNotFound(null);
    scanLocked.current = false;
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <View className="h-[64px] flex-row items-center px-6">
        <Pressable onPress={goBack} className="h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text className="ml-2 text-[18px] font-bold text-white">Scan Barcode</Text>
      </View>

      <View className="flex-1 overflow-hidden">
        {!permission ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#fff" />
          </View>
        ) : !permission.granted ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="camera-outline" size={40} color="#fff" />
            <Text className="mt-3 text-center text-[15px] text-white">
              Camera access is needed to scan product barcodes.
            </Text>
            <Pressable onPress={requestPermission} className="mt-5 rounded-lg bg-brand px-6 py-3">
              <Text className="text-[14px] font-semibold text-white">Grant Camera Access</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={scanLocked.current ? undefined : handleScan}
            />
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <View className="h-[160px] w-[280px] rounded-2xl border-2 border-white/80" />
              <Text className="mt-6 text-[14px] text-white/90">Align the barcode within the frame</Text>
            </View>

            {lookingUp ? (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : null}

            {notFound ? (
              <View className="absolute inset-x-0 bottom-0 items-center bg-black/80 px-6 pb-10 pt-5">
                <Text className="text-center text-[15px] font-semibold text-white">
                  No product found for “{notFound}”
                </Text>
                <Pressable onPress={scanAgain} className="mt-4 rounded-lg bg-brand px-6 py-3">
                  <Text className="text-[14px] font-semibold text-white">Scan Again</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
