import { Pressable, Text, View } from "react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { formatFantasyMoney } from "../utils/money";
import { TeamKitAvatar } from "./TeamKitAvatar";

type FutsalCourtPlayer = {
  clubName: string | null;
  displayName: string;
  photoThumbnailUrl?: string | null;
  photoUrl?: string | null;
  position?: "goalkeeper" | "universal";
  price: number;
};

export type FutsalCourtSlot = {
  isSwapCandidate?: boolean;
  isSwapSource?: boolean;
  isSwapUnavailable?: boolean;
  label: string;
  player: FutsalCourtPlayer | null;
  positionLabel: string;
  rosterSlot: number;
};

function CourtSlot({
  isWide,
  noClubLabel,
  onPress,
  slot,
}: {
  isWide?: boolean;
  noClubLabel: string;
  onPress: (slot: FutsalCourtSlot) => void;
  slot: FutsalCourtSlot;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(slot)}
      style={[
        styles.futsalCourtSlot,
        isWide ? styles.futsalCourtSlotWide : null,
        slot.isSwapSource ? styles.squadSlotSwapSource : null,
        slot.isSwapCandidate ? styles.squadSlotSwapCandidate : null,
        slot.isSwapUnavailable ? styles.squadSlotSwapUnavailable : null,
      ]}
    >
      {slot.player ? (
        <>
          <TeamKitAvatar
            clubName={slot.player.clubName}
            displayName={slot.player.displayName}
            position={slot.player.position}
            size="xs"
          />
          <Text numberOfLines={1} style={styles.futsalCourtSlotName}>
            {slot.player.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.futsalCourtSlotMeta}>
            {slot.player.clubName ?? noClubLabel} ·{" "}
            {formatFantasyMoney(slot.player.price)}
          </Text>
        </>
      ) : (
        <>
          <Text numberOfLines={1} style={styles.futsalCourtSlotLabel}>
            {slot.label}
          </Text>
          <Text numberOfLines={1} style={styles.futsalCourtSlotMeta}>
            {slot.positionLabel}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function FutsalCourtPreview({
  onSlotPress,
  slots,
}: {
  onSlotPress: (slot: FutsalCourtSlot) => void;
  slots: FutsalCourtSlot[];
}) {
  const { t } = useI18n();
  const [firstSlot, secondSlot, thirdSlot, fourthSlot, goalkeeperSlot] = slots;

  return (
    <View style={styles.panel}>
      <View style={styles.squadSectionHeader}>
        <Text style={styles.sectionTitle}>{t("team.courtTitle")}</Text>
        <Text style={styles.squadRoleBadge}>x1</Text>
      </View>
      <View style={styles.futsalCourt}>
        <View pointerEvents="none" style={styles.futsalCourtCenterLine} />
        <View pointerEvents="none" style={styles.futsalCourtCenterCircle} />
        <View pointerEvents="none" style={styles.futsalCourtGoalBox} />
        <View style={styles.futsalCourtRow}>
          {firstSlot ? (
            <CourtSlot
              noClubLabel={t("players.noClub")}
              onPress={onSlotPress}
              slot={firstSlot}
            />
          ) : null}
          {secondSlot ? (
            <CourtSlot
              noClubLabel={t("players.noClub")}
              onPress={onSlotPress}
              slot={secondSlot}
            />
          ) : null}
        </View>
        <View style={styles.futsalCourtRow}>
          {thirdSlot ? (
            <CourtSlot
              noClubLabel={t("players.noClub")}
              onPress={onSlotPress}
              slot={thirdSlot}
            />
          ) : null}
          {fourthSlot ? (
            <CourtSlot
              noClubLabel={t("players.noClub")}
              onPress={onSlotPress}
              slot={fourthSlot}
            />
          ) : null}
        </View>
        <View style={styles.futsalCourtRow}>
          {goalkeeperSlot ? (
            <CourtSlot
              isWide
              noClubLabel={t("players.noClub")}
              onPress={onSlotPress}
              slot={goalkeeperSlot}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
