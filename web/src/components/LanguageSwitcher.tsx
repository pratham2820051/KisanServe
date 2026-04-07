import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'हिंदी',
  kn: 'ಕನ್ನಡ',
  mr: 'मराठी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  ml: 'മലയാളം',
};

const LANGUAGE_STORAGE_KEY = 'KisanServe_language';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;

  const handleLanguageChange = (code: SupportedLanguage) => {
    // Requirement 4.3: Apply new language without full reload
    i18n.changeLanguage(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8 }}>
      {SUPPORTED_LANGUAGES.map((code) => (
        <button
          key={code}
          onClick={() => handleLanguageChange(code)}
          aria-pressed={currentLang === code}
          style={{
            padding: '4px 12px',
            borderRadius: 16,
            border: '1px solid',
            borderColor: currentLang === code ? '#4CAF50' : '#ccc',
            backgroundColor: currentLang === code ? '#4CAF50' : 'transparent',
            color: currentLang === code ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {LANGUAGE_NAMES[code]}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
