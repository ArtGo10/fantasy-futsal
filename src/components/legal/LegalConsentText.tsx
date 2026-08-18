import { Text } from "react-native";

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

  return (
    <Text style={styles.legalConsentText}>
      {t("auth.termsConsentPrefix")}
      <Text
        onPress={onTermsPress}
        style={styles.legalConsentLinkText}
        suppressHighlighting
      >
        {t("auth.termsConsentTerms")}
      </Text>
      {t("auth.termsConsentJoin")}
      <Text
        onPress={onPrivacyPress}
        style={styles.legalConsentLinkText}
        suppressHighlighting
      >
        {t("auth.termsConsentPrivacy")}
      </Text>
      {t("auth.termsConsentSuffix")}
    </Text>
  );
}
