import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { LANGUAGE_OPTIONS } from "../../i18n/translations";
import { useI18n } from "../../i18n/I18nProvider";
import { styles } from "../../styles";

export function LanguageSwitcher({
  variant = "default",
}: {
  variant?: "default" | "app";
}) {
  const { language, setLanguage, t } = useI18n();
  const [optimisticLanguage, setOptimisticLanguage] = useState(language);
  const commitFrameRef = useRef<number | null>(null);

  const isAppVariant = variant === "app";

  useEffect(() => {
    setOptimisticLanguage(language);
  }, [language]);

  useEffect(() => {
    return () => {
      if (commitFrameRef.current !== null) {
        cancelAnimationFrame(commitFrameRef.current);
      }
    };
  }, []);

  const handleLanguagePress = (nextLanguage: typeof language) => {
    if (nextLanguage === optimisticLanguage) return;

    setOptimisticLanguage(nextLanguage);

    if (commitFrameRef.current !== null) {
      cancelAnimationFrame(commitFrameRef.current);
    }

    commitFrameRef.current = requestAnimationFrame(() => {
      commitFrameRef.current = null;
      setLanguage(nextLanguage);
    });
  };

  return (
    <View
      accessibilityLabel={t("common.language")}
      style={[
        styles.languageSwitcher,
        isAppVariant ? styles.languageSwitcherApp : null,
      ]}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const isActive = option.code === optimisticLanguage;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={option.code}
            onPress={() => handleLanguagePress(option.code)}
            style={[
              styles.languageButton,
              isAppVariant ? styles.languageButtonApp : null,
              isActive ? styles.languageButtonActive : null,
              isActive && isAppVariant ? styles.languageButtonActiveApp : null,
            ]}
          >
            <Text
              style={[
                isActive
                  ? styles.languageButtonTextActive
                  : styles.languageButtonText,
                isAppVariant && !isActive ? styles.languageButtonTextApp : null,
                isAppVariant && isActive
                  ? styles.languageButtonTextActiveApp
                  : null,
              ]}
            >
              {option.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
