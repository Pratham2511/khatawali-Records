import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations } from '../i18n/translations';

const STORAGE_KEY = 'khatawali.language';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'mr' ? 'mr' : 'en';
  });

  const setLanguage = (nextLanguage) => {
    const safeLanguage = nextLanguage === 'mr' ? 'mr' : 'en';
    setLanguageState(safeLanguage);
    window.localStorage.setItem(STORAGE_KEY, safeLanguage);
  };

  const t = (key) => {
    return translations[language]?.[key] ?? translations.en?.[key] ?? key;
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguageContext = () => useContext(LanguageContext);
