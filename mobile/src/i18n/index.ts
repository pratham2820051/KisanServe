import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import mr from './locales/mr.json';
import te from './locales/te.json';
import ta from './locales/ta.json';
import ml from './locales/ml.json';

// Requirement 4.1: Support EN, HI, KN, MR, TE, TA, ML
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'kn', 'mr', 'te', 'ta', 'ml'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      kn: { translation: kn },
      mr: { translation: mr },
      te: { translation: te },
      ta: { translation: ta },
      ml: { translation: ml },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    // Requirement 4.3: Language change applies without full reload
    react: {
      useSuspense: false,
    },
  });

export default i18n;
