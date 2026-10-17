import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';

const KEY = 'market-day-lang';
function initialLang(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    /* storage blocked */
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(KEY, lng);
  } catch {
    /* ignore */
  }
});
document.documentElement.lang = i18n.language;

export default i18n;
