import { useLanguageContext } from '../providers/LanguageProvider';

export const useLanguage = () => {
  return useLanguageContext();
};
