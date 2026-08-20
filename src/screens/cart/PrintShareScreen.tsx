import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
import { getInvoice } from '../../api/sales';
import { API_URL } from '../../api/client';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

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

function money(value: number, currency: string) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} ${currency}`;
}

export default function PrintShareScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { mode, saleId, invoiceNumber, totalAmount } = route.params;
  const [method, setMethod] = useState<ShareMethod>('EMAIL');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ['invoice', saleId],
    queryFn: () => getInvoice(saleId),
    retry: 1,
    // Fiscalization can complete just after checkout. Refresh while this screen
    // is open so mobile receives the same updated invoice as the web app.
    refetchInterval: 15_000,
  });
  const invoiceDocument = invoiceQuery.data;
  const invoice = invoiceDocument?.invoice.invoiceNumber ?? invoiceNumber ?? `#${saleId}`;
  const amount = Number(invoiceDocument?.totals.grandTotal ?? totalAmount);
  const currency = invoiceDocument?.invoice.currency ?? invoiceDocument?.company.currency ?? 'RWF';
  const customerName = invoiceDocument?.customer.name || 'Customer';

  useEffect(() => {
    if (!invoiceDocument) return;
    if (!recipient) setRecipient(invoiceDocument.customer.email ?? invoiceDocument.customer.phone ?? '');
    if (!subject) setSubject(`${mode === 'refund' ? 'Refund receipt' : 'Invoice'} ${invoice}`);
    if (!message) setMessage(`Dear ${customerName},\n\nPlease find attached ${mode === 'refund' ? 'refund receipt' : 'invoice'} ${invoice}.\n\nThank you!`);
  }, [customerName, invoice, invoiceDocument, message, mode, recipient, subject]);

  const html = useMemo(() => {
    if (!invoiceDocument?.renderedHtml) return null;
    const assetBaseUrl = `${API_URL.replace(/\/api\/?$/, '')}/`;
    // Expo Print expects a complete HTML document. The content itself comes
    // unchanged from the canonical backend renderer shared with the web app.
    return `<!doctype html><html><head><base href="${assetBaseUrl}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{size:A4 portrait;margin:6mm}html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rra-invoice .sheet{box-shadow:none!important;border-radius:0!important}</style></head><body>${invoiceDocument.renderedHtml}</body></html>`;
  }, [invoiceDocument?.renderedHtml]);

  const requireInvoiceHtml = () => {
    if (html) return html;
    toast.warning(
      invoiceQuery.isLoading ? 'Preparing invoice' : 'Invoice unavailable',
      invoiceQuery.isLoading
        ? 'The invoice is still loading. Please try again in a moment.'
        : 'The official invoice could not be prepared. Check your connection and retry.',
    );
    return null;
  };

  const printReceipt = async () => {
    const invoiceHtml = requireInvoiceHtml();
    if (!invoiceHtml) return;
    setIsPreparing(true);
    try { await Print.printAsync({ html: invoiceHtml }); }
    catch (error: any) { toast.error('Print failed', error?.message ?? 'Could not open the print dialog.'); }
    finally { setIsPreparing(false); }
  };
  const createPdf = async () => {
    const invoiceHtml = requireInvoiceHtml();
    if (!invoiceHtml) throw new Error('The official invoice is not ready yet.');
    const { uri } = await Print.printToFileAsync({ html: invoiceHtml });
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
    if (!html || isPreparing) {
      requireInvoiceHtml();
      return;
    }
    const body = message || `${invoice} — ${money(amount, currency)}`;
    setIsPreparing(true);
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
      toast.error('Sharing failed', error?.message ?? 'Please try again.');
    } finally {
      setIsPreparing(false);
    }
  };
  const actionLabel = method === 'EMAIL' ? 'Email PDF' : method === 'WHATSAPP' ? 'Share PDF via WhatsApp' : method === 'SMS' ? 'Share PDF via Messages' : method === 'PDF' ? 'Save PDF' : 'Share PDF';
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader
        title={mode === 'refund' ? 'Refund Receipt' : 'Print & Share'}
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={printReceipt} disabled={!html || isPreparing} className="h-11 w-11 items-center justify-center" style={{ opacity: html && !isPreparing ? 1 : 0.45 }}><Ionicons name="print-outline" size={25} color="#fff" /></Pressable>}
      />
      <View className="flex-1 bg-[#F8F9F8]">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="rounded-xl border border-gray-100 bg-white p-4" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <View className="flex-row items-center border-b border-gray-200 pb-4">
              <Text className="text-[16px] text-gray-600">Invoice</Text>
              <Text className="ml-3 flex-1 text-[17px] font-extrabold text-green-700">{invoice}</Text>
              <View className="rounded-md bg-green-50 px-3 py-2"><Text className="text-[13px] font-semibold text-green-700">{mode === 'refund' ? 'Refunded' : 'Paid'}</Text></View>
            </View>
            {invoiceDocument ? (
              <View className="mt-4 flex-row rounded-lg border border-gray-100 bg-gray-50 p-3">
                <View className="min-w-0 flex-1 pr-3">
                  <Text className="text-[12px] text-gray-500">Customer</Text>
                  <Text numberOfLines={1} className="mt-1 text-[14px] font-semibold text-gray-900">{customerName}</Text>
                  <Text numberOfLines={1} className="mt-1 text-[12px] text-gray-500">{invoiceDocument.company.name}</Text>
                </View>
                <View className="items-end border-l border-gray-200 pl-3">
                  <Text className="text-[12px] text-gray-500">Invoice total</Text>
                  <Text className="mt-1 text-[15px] font-extrabold text-brand-dark">{money(amount, currency)}</Text>
                </View>
              </View>
            ) : null}
            {invoiceQuery.isLoading ? (
              <View className="mt-4 flex-row items-center rounded-lg bg-brand-light p-3">
                <ActivityIndicator size="small" color={colors.brand.dark} />
                <Text className="ml-3 flex-1 text-[13px] leading-5 text-brand-dark">Preparing the same official invoice used on the web...</Text>
              </View>
            ) : invoiceQuery.isError || !html ? (
              <View className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <View className="flex-row items-start">
                  <Ionicons name="alert-circle-outline" size={21} color="#B42318" />
                  <Text className="ml-2 flex-1 text-[13px] leading-5 text-red-800">The official invoice could not be loaded. Check your connection, then retry.</Text>
                </View>
                <Pressable onPress={() => invoiceQuery.refetch()} className="mt-3 min-h-[44px] items-center justify-center rounded-lg bg-red-700">
                  <Text className="text-[14px] font-bold text-white">Retry invoice</Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-4 flex-row items-center rounded-lg bg-brand-light p-3">
                <Ionicons name={invoiceDocument?.certification.isCertified ? 'shield-checkmark' : 'document-text-outline'} size={21} color={colors.brand.dark} />
                <Text className="ml-2 flex-1 text-[13px] leading-5 text-brand-dark">
                  {invoiceDocument?.certification.isCertified ? 'RRA / EBM certified invoice ready.' : 'Invoice ready. EBM certification may still be processing.'}
                </Text>
              </View>
            )}
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
            <Pressable onPress={performAction} disabled={!html || isPreparing} className="mt-5 min-h-[52px] flex-row items-center justify-center rounded-lg bg-brand" style={{ opacity: html && !isPreparing ? 1 : 0.5 }}>
              {isPreparing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={method === 'PDF' ? 'download-outline' : 'paper-plane-outline'} size={21} color="#fff" />}
              <Text className="ml-2 text-[16px] font-bold text-white">{isPreparing ? 'Preparing PDF...' : actionLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      <ReferenceBottomBar active="Sales" onNavigate={goTab} />
    </SafeAreaView>
  );
}
