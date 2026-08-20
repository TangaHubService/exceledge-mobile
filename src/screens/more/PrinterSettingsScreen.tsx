import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePrinterStore } from '../../store/printerStore';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COPIES = [1, 2, 3];

export default function PrinterSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const autoPrintAfterSale = usePrinterStore((s) => s.autoPrintAfterSale);
  const copies = usePrinterStore((s) => s.copies);
  const setAutoPrintAfterSale = usePrinterStore((s) => s.setAutoPrintAfterSale);
  const setCopies = usePrinterStore((s) => s.setCopies);
  const [printing, setPrinting] = useState(false);

  const printTest = async () => {
    setPrinting(true);
    try {
      await Print.printAsync({
        html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{size:80mm auto;margin:0}body{font-family:monospace;font-size:12px;padding:16px;color:#111}.center{text-align:center}.b{border-top:1px dashed #333;margin:10px 0}</style></head><body>
<div class="center"><b>Excel Edge POS</b></div>
<div class="center">Test Print</div>
<div class="b"></div>
<div>Terminal: POS-01</div>
<div>Cashier: ${user?.name ?? '—'}</div>
<div>Date: ${new Date().toLocaleString()}</div>
<div class="b"></div>
<div class="center"><b>This receipt confirms your printer is working.</b></div>
</body></html>`,
      });
    } catch (error: any) {
      toast.error('Print failed', error?.message ?? 'Could not open the print dialog.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-5">
        <Pressable onPress={() => navigation.goBack()} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}><Ionicons name="arrow-back" size={30} color="#fff" /></Pressable>
        <Text className="text-[22px] font-bold text-white">Printer Settings</Text>
      </View>

      <ScrollView className="bg-[#F8F9F8]" contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View className="overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View className="flex-row items-center border-b border-gray-100 px-4 py-4">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-light">
              <Ionicons name="print-outline" size={25} color={colors.brand.dark} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[16px] font-extrabold text-gray-950">Receipt Printing</Text>
              <Text className="mt-1 text-[13px] text-[#596579]">Uses the device print dialog — no Bluetooth pairing required.</Text>
            </View>
          </View>

          <View className="flex-row items-center px-4 py-4">
            <View className="flex-1 pr-4">
              <Text className="text-[15px] font-semibold text-gray-950">Auto-print after sale</Text>
              <Text className="mt-1 text-[13px] text-[#596579]">Open the print dialog automatically when a sale is completed.</Text>
            </View>
            <Switch
              value={autoPrintAfterSale}
              onValueChange={setAutoPrintAfterSale}
              trackColor={{ false: '#E3E5E2', true: colors.brand.solid }}
              thumbColor="#fff"
            />
          </View>

          <View className="border-t border-gray-100 px-4 py-4">
            <Text className="text-[15px] font-semibold text-gray-950">Copies</Text>
            <Text className="mt-1 text-[13px] text-[#596579]">Number of copies for each receipt.</Text>
            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              {COPIES.map((count) => {
                const selected = count === copies;
                return (
                  <Pressable
                    key={count}
                    onPress={() => setCopies(count)}
                    className={`min-h-[44px] flex-1 items-center justify-center rounded-lg border ${selected ? 'border-brand bg-brand-light' : 'border-gray-200 bg-white'}`}
                  >
                    <Text className={`text-[15px] font-bold ${selected ? 'text-brand-dark' : 'text-gray-600'}`}>{count}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={22} color={colors.brand.dark} />
            <Text className="ml-2 flex-1 text-[13px] leading-5 text-[#596579]">
              Direct Bluetooth / thermal printer pairing is not available in this build. Receipts print through the operating system's print dialog, which supports AirPrint and most network printers.
            </Text>
          </View>
          <Pressable onPress={printTest} disabled={printing} className="mt-4 min-h-[52px] flex-row items-center justify-center rounded-lg bg-brand disabled:opacity-50">
            {printing ? <Text className="text-[15px] font-bold text-white">Opening print dialog…</Text> : (
              <>
                <Ionicons name="print-outline" size={21} color="#fff" />
                <Text className="ml-2 text-[15px] font-bold text-white">Print Test Receipt</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}