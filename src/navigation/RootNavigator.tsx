import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import OpenShiftScreen from '../screens/shift/OpenShiftScreen';
import AppTabs from './AppTabs';
import ProductSelectionScreen from '../screens/home/ProductSelectionScreen';
import BarcodeScannerScreen from '../screens/home/BarcodeScannerScreen';
import PumpSaleScreen from '../screens/home/PumpSaleScreen';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import MobileMoneyScreen from '../screens/cart/MobileMoneyScreen';
import EbmProcessingScreen from '../screens/cart/EbmProcessingScreen';
import SaleSuccessScreen from '../screens/cart/SaleSuccessScreen';
import PrintShareScreen from '../screens/cart/PrintShareScreen';
import SaleDetailScreen from '../screens/history/SaleDetailScreen';
import CustomerPickerScreen from '../screens/cart/CustomerPickerScreen';
import CloseShiftScreen from '../screens/shift/CloseShiftScreen';
import StartReturnScreen from '../screens/returns/StartReturnScreen';
import SelectReturnItemsScreen from '../screens/returns/SelectReturnItemsScreen';
import ReturnReasonScreen from '../screens/returns/ReturnReasonScreen';
import CustomerRefundScreen from '../screens/returns/CustomerRefundScreen';
import RefundSuccessfulScreen from '../screens/returns/RefundSuccessfulScreen';
import ReturnApprovalScreen from '../screens/returns/ReturnApprovalScreen';
import HeldSalesScreen from '../screens/held/HeldSalesScreen';
import OfflineModeScreen from '../screens/more/OfflineModeScreen';
import MoreScreen from '../screens/more/MoreScreen';
import PrinterSettingsScreen from '../screens/more/PrinterSettingsScreen';
import PaymentMethodsScreen from '../screens/more/PaymentMethodsScreen';
import SecurityScreen from '../screens/more/SecurityScreen';
import AboutScreen from '../screens/more/AboutScreen';
import RefundReceiptScreen from '../screens/returns/RefundReceiptScreen';
import type { Product } from '../api/products';
import { colors } from '../theme';

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  OpenShift: undefined;
  AppTabs: { screen?: 'Home' | 'Sales' | 'Products' | 'Customers' | 'More' } | undefined;
  ProductSelection: undefined;
  BarcodeScanner: undefined;
  PumpSale: { product: Product };
  Cart: undefined;
  CustomerPicker: { afterSave?: 'CHECKOUT' | 'BACK'; mode?: 'SELECT' | 'NEW' } | undefined;
  Checkout: undefined;
  MobileMoney: { amount: number };
  EbmProcessing: { saleId: number; mode: 'sale' | 'refund'; invoiceNumber?: string; totalAmount: number };
  SaleSuccess: { saleId: number; invoiceNumber?: string; totalAmount: number };
  PrintShare: { mode: 'sale' | 'refund'; saleId: number; invoiceNumber?: string; totalAmount: number };
  SaleDetail: { saleId: number };
  HeldSales: undefined;
  ProfileAccount: undefined;
  OfflineMode: undefined;
  PrinterSettings: undefined;
  PaymentMethods: undefined;
  Security: undefined;
  About: undefined;
  CloseShift: undefined;
  StartReturn: undefined;
  SelectReturnItems: { saleId: number };
  ReturnReason: { saleId: number };
  ReturnApproval: { saleId: number; reason: string; note?: string };
  CustomerRefund: { saleId: number; reason: string; note?: string };
  RefundSuccessful: { saleId: number; invoiceNumber?: string; totalAmount: number };
  RefundReceipt: { saleId: number; invoiceNumber?: string; totalAmount: number; action?: 'print' | 'share' };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-darker">
        <ActivityIndicator size="large" color={colors.text.inverse} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.brand.darker },
      }}
    >
      {accessToken ? (
        <>
          <Stack.Screen name="OpenShift" component={OpenShiftScreen} />
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen name="ProductSelection" component={ProductSelectionScreen} />
          <Stack.Screen
            name="BarcodeScanner"
            component={BarcodeScannerScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="PumpSale" component={PumpSaleScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Cart" component={CartScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="MobileMoney" component={MobileMoneyScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="EbmProcessing" component={EbmProcessingScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="SaleSuccess" component={SaleSuccessScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="PrintShare" component={PrintShareScreen} />
          <Stack.Screen name="CustomerPicker" component={CustomerPickerScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
          <Stack.Screen name="HeldSales" component={HeldSalesScreen} />
          <Stack.Screen name="ProfileAccount" component={MoreScreen} />
          <Stack.Screen name="OfflineMode" component={OfflineModeScreen} />
          <Stack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
          <Stack.Screen name="Security" component={SecurityScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="CloseShift" component={CloseShiftScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="StartReturn" component={StartReturnScreen} />
          <Stack.Screen name="SelectReturnItems" component={SelectReturnItemsScreen} />
          <Stack.Screen name="ReturnReason" component={ReturnReasonScreen} />
          <Stack.Screen name="ReturnApproval" component={ReturnApprovalScreen} />
          <Stack.Screen name="CustomerRefund" component={CustomerRefundScreen} />
          <Stack.Screen name="RefundSuccessful" component={RefundSuccessfulScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="RefundReceipt" component={RefundReceiptScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
