import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const LANGUAGE_STORAGE_KEY = 'agriconnect_language';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;

  const handleLanguageChange = async (code: SupportedLanguage) => {
    // Requirement 4.3: Apply new language without full reload
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  };

  return (
    <View style={styles.container}>
      {SUPPORTED_LANGUAGES.map((code) => (
        <TouchableOpacity
          key={code}
          style={[styles.option, currentLang === code && styles.selected]}
          onPress={() => handleLanguageChange(code)}
          accessibilityRole="button"
          accessibilityState={{ selected: currentLang === code }}
        >
          <Text style={[styles.optionText, currentLang === code && styles.selectedText]}>
            {LANGUAGE_NAMES[code]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedText: {
    color: '#fff',
  },
});

export default LanguageSwitcher;
