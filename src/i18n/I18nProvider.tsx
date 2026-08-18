import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getStoredLanguage, storeLanguage } from "./languageStorage";
import { DEFAULT_LANGUAGE, getTranslation, type LanguageCode, type TranslationKey } from "./translations";

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const fallbackI18n: I18nContextValue = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => undefined,
  t: (key) => getTranslation(DEFAULT_LANGUAGE, key),
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const languageRef = useRef<LanguageCode>(DEFAULT_LANGUAGE);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getStoredLanguage().then((storedLanguage) => {
      if (isMounted) {
        languageRef.current = storedLanguage;
        setLanguageState(storedLanguage);
      }
    });

    return () => {
      isMounted = false;
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    if (languageRef.current === nextLanguage) return;

    languageRef.current = nextLanguage;
    setLanguageState(nextLanguage);

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      void storeLanguage(nextLanguage);
    }, 0);
  }, []);

  const t = useCallback((key: TranslationKey) => getTranslation(language, key), [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext) ?? fallbackI18n;
}
