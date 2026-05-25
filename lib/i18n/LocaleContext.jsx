"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "./dictionaries/en";
import ar from "./dictionaries/ar";

const LOCALE_STORAGE_KEY = "manzili_locale";

const dictionaries = { en, ar };

function getDeepValue(obj, path) {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return null;
    current = current[key];
  }
  return current ?? null;
}

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState("en");

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === "ar" || saved === "en") {
        setLocaleState(saved);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setLocale = useCallback((newLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage unavailable
    }
    document.documentElement.lang = newLocale;
    document.documentElement.dir = "ltr";
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const dict = dictionaries[locale] || en;
      let value = getDeepValue(dict, key);

      // Fallback to English
      if (value == null) {
        value = getDeepValue(en, key);
      }

      if (value == null) return key;

      // Replace {param} placeholders
      return String(value).replace(/\{(\w+)\}/g, (_, param) => {
        return params[param] !== undefined ? String(params[param]) : `{${param}}`;
      });
    },
    [locale],
  );

  const value = { locale, setLocale, t, dir: "ltr" };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}

export function useTranslate() {
  const { t } = useLocale();
  return t;
}
