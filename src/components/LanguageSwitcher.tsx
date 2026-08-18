import { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { changeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { colors } from '../theme';

const NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  rw: 'Ikinyarwanda',
  fr: 'Français',
  sw: 'Kiswahili',
};

export function LanguageSwitcher({
  dark = true,
  appearance = 'default',
}: {
  dark?: boolean;
  appearance?: 'default' | 'plain';
}) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = (i18n.language as SupportedLanguage) in NATIVE_NAMES ? (i18n.language as SupportedLanguage) : 'en';

  const select = async (lng: SupportedLanguage) => {
    await changeLanguage(lng);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={appearance === 'plain'
          ? 'flex-row items-center px-3 py-2'
          : `flex-row items-center rounded-lg border px-3 py-2 ${dark ? 'border-white/40 bg-white/15' : 'border-border bg-white'}`}
      >
        {appearance === 'default' ? (
          <Ionicons name="globe-outline" size={16} color={dark ? '#fff' : colors.brand.DEFAULT} />
        ) : null}
        <Text className={`${appearance === 'plain' ? 'text-[16px] font-normal' : 'ml-2 text-[13px] font-semibold'} ${dark ? 'text-white' : 'text-gray-700'}`}>
          {NATIVE_NAMES[current]}
        </Text>
        {appearance === 'plain' ? (
          <Ionicons name="chevron-down" size={19} color={dark ? '#fff' : colors.text.secondary} style={{ marginLeft: 12 }} />
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 items-center justify-center px-10" style={{ backgroundColor: colors.overlay }} onPress={() => setOpen(false)}>
          <Pressable className="w-full rounded-lg bg-white p-4" onPress={() => {}}>
            <Text className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-gray-400">{t('common.language')}</Text>
            {SUPPORTED_LANGUAGES.map((lng) => {
              const selected = lng === current;
              return (
                <Pressable
                  key={lng}
                  onPress={() => select(lng)}
                  className={`mt-1 flex-row items-center justify-between rounded-md px-4 py-3 ${selected ? 'bg-brand-light' : ''}`}
                >
                  <View>
                    <Text className={`text-[15px] font-semibold ${selected ? 'text-brand-dark' : 'text-gray-800'}`}>
                      {NATIVE_NAMES[lng]}
                    </Text>
                    <Text className="text-[12px] text-gray-400">{t(`languages.${lng}`)}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.brand.DEFAULT} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
