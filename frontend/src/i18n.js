import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
  resources: {
    es: {
      translation: {
        welcome: 'Bienvenido',
      },
    },
  },
});

export default i18n;
