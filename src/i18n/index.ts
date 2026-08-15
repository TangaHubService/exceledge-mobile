import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import rw from './locales/rw.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';

export const LANGUAGE_STORAGE_KEY = 'excel_edge_language';
export const SUPPORTED_LANGUAGES = ['en', 'rw', 'fr', 'sw'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = { en: { translation: en }, rw: { translation: rw }, fr: { translation: fr }, sw: { translation: sw } };

function detectDeviceLanguage(): SupportedLanguage {
  const code = Localization.getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? (code as SupportedLanguage) : 'en';
}

export async function initI18n(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const lng = (stored as SupportedLanguage | null) ?? detectDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export async function changeLanguage(lng: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
