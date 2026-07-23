import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

const STORAGE_KEY = "cv-lang";
const savedLang = localStorage.getItem(STORAGE_KEY);
const initialLang = savedLang === "en" || savedLang === "ru" ? savedLang : "ru";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: initialLang,
  supportedLngs: ["ru", "en"],
  load: "languageOnly",
  nonExplicitSupportedLngs: true,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.setAttribute("lang", lng);
});

document.documentElement.setAttribute("lang", initialLang);

export default i18n;
