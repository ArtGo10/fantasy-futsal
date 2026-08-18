import { ScrollView, Text, View } from "react-native";

import { useI18n } from "../../i18n/I18nProvider";
import { getLegalContent, LEGAL_VERSION, type LegalKind } from "../../legal/legalContent";
import { styles } from "../../styles";
import { BottomSheet } from "../../features/fantasy/components/BottomSheet";

export type LegalTextKind = LegalKind;

export function LegalTextSheet({
  kind,
  onClose,
  visible,
}: {
  kind: LegalTextKind;
  onClose: () => void;
  visible: boolean;
}) {
  const { language, t } = useI18n();
  const content = getLegalContent(language, kind);

  return (
    <BottomSheet contentScrollEnabled={false} onClose={onClose} sheetStyle={styles.legalSheet} visible={visible}>
      <View style={styles.legalHeaderGroup}>
        <Text style={styles.sectionTitle}>
          {kind === "terms"
            ? t("legal.termsTitle")
            : kind === "privacy"
              ? t("legal.privacyTitle")
              : t("legal.rulesTitle")}
        </Text>
        <Text style={styles.mutedText}>
          {t("legal.updatedAt")}: {content.updatedAt} · {t("legal.version")} {LEGAL_VERSION}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.legalScrollContent} style={styles.legalScrollArea}>
        {content.sections.map((section) => (
          <View key={section.title} style={styles.legalSection}>
            <Text style={styles.legalSectionTitle}>{section.title}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={styles.legalParagraph}>{paragraph}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
