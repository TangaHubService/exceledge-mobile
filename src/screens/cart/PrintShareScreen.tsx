import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getEbmReceipt, getSaleById } from '../../api/sales';
import { useAuthStore } from '../../store/authStore';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PrintShare'>;
type ShareMethod = 'WHATSAPP' | 'EMAIL' | 'SMS' | 'PDF' | 'LINK';

const methods: Array<{ key: ShareMethod; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { key: 'WHATSAPP', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#14A85B' },
  { key: 'EMAIL', label: 'Email', icon: 'mail', color: '#2385F5' },
  { key: 'SMS', label: 'SMS', icon: 'chatbubble', color: '#16A85A' },
  { key: 'PDF', label: 'Download PDF', icon: 'document', color: '#EE2029' },
  { key: 'LINK', label: 'Share PDF', icon: 'share-social', color: '#111827' },
];

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} RWF`;
}

function safe(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export default function PrintShareScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { mode, saleId, invoiceNumber, totalAmount } = route.params;
  const organization = useAuthStore((s) => s.organizations.find((item) => item.id === s.activeOrganizationId));
  const [method, setMethod] = useState<ShareMethod>('EMAIL');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const saleQuery = useQuery({ queryKey: ['sale', saleId], queryFn: () => getSaleById(saleId) });
  const receiptQuery = useQuery({ queryKey: ['ebmReceipt', saleId], queryFn: () => getEbmReceipt(saleId), retry: false });
  const sale = saleQuery.data;
  const invoice = sale?.invoiceNumber ?? invoiceNumber ?? sale?.saleNumber ?? `#${saleId}`;
  const amount = Number(sale?.totalAmount ?? totalAmount);
  const customerName = sale?.customer?.name ?? 'Customer';

  useEffect(() => {
    if (!sale) return;
    if (!recipient) setRecipient(sale.customer?.email ?? sale.customer?.phone ?? '');
    if (!subject) setSubject(`${mode === 'refund' ? 'Refund receipt' : 'Invoice'} ${invoice}`);
    if (!message) setMessage(`Dear ${customerName},\n\nPlease find attached ${mode === 'refund' ? 'refund receipt' : 'invoice'} ${invoice}.\n\nThank you!`);
  }, [customerName, invoice, message, mode, recipient, sale, subject]);

  const html = useMemo(() => {
    const rows = (sale?.saleItems ?? []).map((item) => `
      <tr>
        <td>${safe(item.product?.name ?? item.serviceName ?? `Item #${item.productId}`)}</td>
        <td style="text-align:center">${safe(item.quantity)}</td>
        <td style="text-align:right">${safe(money(item.totalPrice))}</td>
      </tr>`).join('');
    return `<!doctype html><html><body style="font-family:-apple-system,Arial;padding:28px;color:#111827">
      <h1 style="color:#00673e;margin-bottom:2px">${safe(organization?.name ?? 'Excel Edge POS')}</h1>
      <p style="color:#6b7280;margin-top:0">${mode === 'refund' ? 'Refund Receipt' : 'Sales Invoice'}</p>
      <hr style="border:0;border-top:1px solid #e5e7eb" />
      <p><strong>Invoice:</strong> ${safe(invoice)}</p>
      <p><strong>Date:</strong> ${safe(sale?.createdAt ? new Date(sale.createdAt).toLocaleString() : '')}</p>
      <p><strong>Customer:</strong> ${safe(sale?.customer?.name ?? 'Walk-in Customer')}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:20px" cellpadding="10">
        <thead><tr style="border-bottom:1px solid #d1d5db"><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h2 style="text-align:right;color:#00673e">Total: ${safe(money(amount))}</h2>
      ${receiptQuery.data?.ebm?.sdcId ? `<p><strong>SDC ID:</strong> ${safe(receiptQuery.data.ebm.sdcId)}</p>` : ''}
      ${receiptQuery.data?.ebm?.ebmInvoiceNumber ? `<p><strong>EBM invoice:</strong> ${safe(receiptQuery.data.ebm.ebmInvoiceNumber)}</p>` : ''}
    </body></html>`;
  }, [amount, invoice, mode, organization?.name, receiptQuery.data, sale]);

  const printReceipt = async () => {
    try { await Print.printAsync({ html }); }
    catch (error: any) { Alert.alert('Print failed', error?.message ?? 'Could not open the print dialog.'); }
  };
  const createPdf = async () => {
    const { uri } = await Print.printToFileAsync({ html });
    const fileName = `${String(invoice).replace(/[^a-zA-Z0-9_-]+/g, '-')}.pdf`;
    const source = new File(uri);
    const namedPdf = new File(Paths.cache, fileName);
    await source.copy(namedPdf, { overwrite: true });
    return namedPdf.uri;
  };
  const sharePdf = async (pdfUri: string) => {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: method === 'PDF' ? `Save ${invoice}.pdf` : `Share ${invoice}.pdf`,
    });
  };
  const performAction = async () => {
    const body = message || `${invoice} — ${money(amount)}`;
    try {
      const pdfUri = await createPdf();
      if (method === 'EMAIL') {
        if (await MailComposer.isAvailableAsync()) {
          await MailComposer.composeAsync({
            recipients: recipient.trim() ? [recipient.trim()] : undefined,
            subject,
            body,
            attachments: [pdfUri],
          });
        } else {
          await sharePdf(pdfUri);
        }
      } else {
        await sharePdf(pdfUri);
      }
    } catch (error: any) {
      Alert.alert('Sharing failed', error?.message ?? 'Please try again.');
    }
  };
  const actionLabel = method === 'EMAIL' ? 'Email PDF' : method === 'WHATSAPP' ? 'Share PDF via WhatsApp' : method === 'SMS' ? 'Share PDF via Messages' : method === 'PDF' ? 'Save PDF' : 'Share PDF';
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader
        title={mode === 'refund' ? 'Refund Receipt' : 'Print & Share'}
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={printReceipt} className="h-11 w-11 items-center justify-center"><Ionicons name="print-outline" size={25} color="#fff" /></Pressable>}
      />
      <View className="flex-1 bg-[#F8F9F8]">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="rounded-xl border border-gray-100 bg-white p-4" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <View className="flex-row items-center border-b border-gray-200 pb-4">
              <Text className="text-[16px] text-gray-600">Invoice</Text>
              <Text className="ml-3 flex-1 text-[17px] font-extrabold text-green-700">{invoice}</Text>
              <View className="rounded-md bg-green-50 px-3 py-2"><Text className="text-[13px] font-semibold text-green-700">{mode === 'refund' ? 'Refunded' : 'Paid'}</Text></View>
            </View>
            <Text className="mt-4 text-[15px] text-gray-600">Share via</Text>
            {methods.map((item, index) => {
              const selected = item.key === method;
              return (
                <Pressable key={item.key} onPress={() => setMethod(item.key)} className={`min-h-[54px] flex-row items-center ${index ? 'border-t border-gray-200' : ''}`}>
                  <View className="h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white">
                    <Ionicons name={item.icon} size={23} color={item.color} />
                  </View>
                  <Text className="ml-4 flex-1 text-[15px] font-medium text-gray-950">{item.label}</Text>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.brand.DEFAULT : '#A5ABB4'} />
                </Pressable>
              );
            })}

            {method === 'EMAIL' ? (
              <>
                <Text className="mb-2 mt-3 text-[13px] text-gray-600">Recipient</Text>
                <TextInput value={recipient} onChangeText={setRecipient} placeholder="customer@email.com" keyboardType="email-address" autoCapitalize="none" className="h-[50px] rounded-lg border border-gray-200 bg-white px-4 text-[15px]" />
              </>
            ) : null}
            {method === 'EMAIL' ? (
              <>
                <Text className="mb-2 mt-4 text-[13px] text-gray-600">Subject (Optional)</Text>
                <TextInput value={subject} onChangeText={setSubject} className="h-[50px] rounded-lg border border-gray-200 bg-white px-4 text-[15px]" />
              </>
            ) : null}
            {method === 'EMAIL' ? (
              <>
                <Text className="mb-2 mt-4 text-[13px] text-gray-600">Message (Optional)</Text>
                <TextInput value={message} onChangeText={setMessage} multiline textAlignVertical="top" className="min-h-[104px] rounded-lg border border-gray-200 bg-white px-4 py-3 text-[15px] leading-6" />
              </>
            ) : null}
            {method !== 'EMAIL' ? (
              <View className="mt-4 flex-row rounded-lg bg-brand-light p-3">
                <Ionicons name="information-circle-outline" size={22} color={colors.brand.dark} />
                <Text className="ml-2 flex-1 text-[13px] leading-5 text-brand-dark">
                  The PDF will be attached in the phone's share sheet. Choose {method === 'PDF' ? 'Save to Files to download it.' : `${method === 'WHATSAPP' ? 'WhatsApp' : method === 'SMS' ? 'Messages' : 'an app'} to send it.`}
                </Text>
              </View>
            ) : null}
            <Pressable onPress={performAction} className="mt-5 min-h-[52px] flex-row items-center justify-center rounded-lg bg-brand">
              <Ionicons name={method === 'PDF' ? 'download-outline' : 'paper-plane-outline'} size={21} color="#fff" />
              <Text className="ml-2 text-[16px] font-bold text-white">{actionLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      <ReferenceBottomBar active="Sales" onNavigate={goTab} />
    </SafeAreaView>
  );
}
