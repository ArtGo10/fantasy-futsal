import { Text } from "react-native";

import { useFantasySeasonTheme } from "../../features/fantasy/utils/seasonThemeContext";
import { useI18n } from "../../i18n/I18nProvider";
import { styles } from "../../styles";

type LegalConsentTextProps = {
  onPrivacyPress: () => void;
  onTermsPress: () => void;
};

export function LegalConsentText({
  onPrivacyPress,
  onTermsPress,
}: LegalConsentTextProps) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();

  return (
    <Text style={styles.legalConsentText}>
      {t("auth.termsConsentPrefix")}
      <Text
        onPress={onTermsPress}
        style={[
          styles.legalConsentLinkText,
          { color: fantasyTheme.primaryColor },
        ]}
        suppressHighlighting
      >
        {t("auth.termsConsentTerms")}
      </Text>
      {t("auth.termsConsentJoin")}
      <Text
        onPress={onPrivacyPress}
        style={[
          styles.legalConsentLinkText,
          { color: fantasyTheme.primaryColor },
        ]}
        suppressHighlighting
      >
        {t("auth.termsConsentPrivacy")}
      </Text>
      {t("auth.termsConsentSuffix")}
    </Text>
  );
}
