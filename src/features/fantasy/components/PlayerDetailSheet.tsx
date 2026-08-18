import { Star } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { TranslationKey } from "../../../i18n/translations";
import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { formatFantasyMoney, formatFantasyMoneyDelta } from "../utils/money";
import { getPlayerPhoto } from "../utils/playerStats";
import { BottomSheet } from "./BottomSheet";
import { CheckBoxMark } from "./CheckBoxMark";
import { PlayerAvatar } from "./PlayerAvatar";

type PlayerPosition = "goalkeeper" | "universal";
type PlayerStatus =
  | "active"
  | "doubtful"
  | "injured"
  | "suspended"
  | "unavailable"
  | "left";

type PlayerDetail = {
  clubName: string | null;
  displayName: string;
  photoThumbnailUrl?: string | null;
  photoUrl?: string | null;
  appearances?: number | null;
  assists?: number | null;
  averagePointsPerGameweek?: number | null;
  goals?: number | null;
  managerAveragePointsPerGameweek?: number | null;
  managerLastGameweekPoints?: number | null;
  managerSeasonPoints?: number | null;
  penaltiesMissed?: number | null;
  penaltiesSaved?: number | null;
  position: PlayerPosition;
  price: number;
  previousPrice?: number | null;
  priceChangedAt?: number | null;
  priceDelta?: number | null;
  redCards?: number | null;
  seasonPoints?: number | null;
  selectedPercent?: number | null;
  status: PlayerStatus;
  statusDetails?: {
    message?: string | null;
    messageEn?: string | null;
    messageUk?: string | null;
    updatedAt?: number | null;
  } | null;
  statusMessage?: string | null;
  yellowCards?: number | null;
};

type PlayerDetailSheetProps = {
  canSetLeadership?: boolean;
  isCaptain?: boolean;
  isFavorite?: boolean;
  isViceCaptain?: boolean;
  mode: "market" | "squad";
  onClose: () => void;
  onRemove?: () => void;
  onReplace?: () => void;
  onSetCaptain?: () => void;
  onSetViceCaptain?: () => void;
  onSwap?: () => void;
  onToggleFavorite?: () => void;
  player: PlayerDetail | null;
  visible: boolean;
};

const POSITION_LABEL_KEYS: Record<PlayerPosition, TranslationKey> = {
  goalkeeper: "players.position.goalkeeper",
  universal: "players.position.universal",
};

function formatPlayerDetailNumber(value: number | null | undefined) {
  const normalized = Number((value ?? 0).toFixed(1));
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(1);
}

const STATUS_LABEL_KEYS: Record<PlayerStatus, TranslationKey> = {
  active: "players.playerStatus.active",
  doubtful: "players.playerStatus.doubtful",
  injured: "players.playerStatus.injured",
  left: "players.playerStatus.left",
  suspended: "players.playerStatus.suspended",
  unavailable: "players.playerStatus.unavailable",
};

type PlayerDetailHeroProps = {
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  player: PlayerDetail;
  t: (key: TranslationKey) => string;
};

function PlayerDetailHero({
  isFavorite,
  onToggleFavorite,
  player,
  t,
}: PlayerDetailHeroProps) {
  return (
    <View style={styles.playerDetailHero}>
      {onToggleFavorite ? (
        <Pressable
          accessibilityLabel={
            isFavorite
              ? t("playerDetails.removeFavorite")
              : t("playerDetails.addFavorite")
          }
          accessibilityRole="button"
          onPress={onToggleFavorite}
          style={styles.playerDetailFavoriteButton}
        >
          <Star
            color={isFavorite ? colors.brand.yellow : colors.text.inverse}
            fill={isFavorite ? colors.brand.yellow : "transparent"}
            size={21}
            strokeWidth={2.5}
          />
        </Pressable>
      ) : null}
      <PlayerAvatar
        displayName={player.displayName}
        photoUrl={getPlayerPhoto(player)}
        size="xl"
      />
      <View style={styles.playerDetailHeroText}>
        <Text style={styles.playerDetailPosition}>
          {t(POSITION_LABEL_KEYS[player.position])}
        </Text>
        <Text numberOfLines={2} style={styles.playerDetailName}>
          {player.displayName}
        </Text>
        <Text numberOfLines={1} style={styles.playerDetailClub}>
          {player.clubName ?? t("players.noClub")}
        </Text>
      </View>
    </View>
  );
}

export function PlayerDetailSheet({
  canSetLeadership,
  isCaptain,
  isFavorite,
  isViceCaptain,
  mode,
  onClose,
  onRemove,
  onReplace,
  onSetCaptain,
  onSetViceCaptain,
  onSwap,
  onToggleFavorite,
  player,
  visible,
}: PlayerDetailSheetProps) {
  const { t } = useI18n();

  if (!player) return null;

  const seasonPoints = formatPlayerDetailNumber(player.seasonPoints);
  const averagePoints = formatPlayerDetailNumber(
    player.averagePointsPerGameweek,
  );
  const selectedPercent = formatPlayerDetailNumber(player.selectedPercent);
  const priceDelta = Number((player.priceDelta ?? 0).toFixed(1));
  const hasPriceTrend = Math.abs(priceDelta) >= 0.1;
  const formattedPriceDelta = formatFantasyMoneyDelta(priceDelta);
  const cardCount = (player.yellowCards ?? 0) + (player.redCards ?? 0);
  const statusLabel = t(STATUS_LABEL_KEYS[player.status]);
  const statusMessage = player.status !== "active" ? player.statusMessage : null;
  const normalizedStatusLabel = statusLabel
    .replace(/[\s.!?:;]+/g, " ")
    .trim()
    .toLocaleLowerCase();
  const normalizedStatusMessage = (statusMessage ?? "")
    .replace(/[\s.!?:;]+/g, " ")
    .trim()
    .toLocaleLowerCase();
  const statusNoticeMessage =
    statusMessage && normalizedStatusMessage !== normalizedStatusLabel
      ? statusMessage
      : null;
  const isDoubtful = player.status === "doubtful";

  return (
    <BottomSheet
      contentScrollEnabled={false}
      onClose={onClose}
      sheetStyle={styles.playerDetailSheet}
      visible={visible && Boolean(player)}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.playerDetailScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.playerDetailScroll}
      >
        <PlayerDetailHero
          isFavorite={isFavorite}
          onToggleFavorite={mode === "market" ? onToggleFavorite : undefined}
          player={player}
          t={t}
        />

        <View style={styles.playerDetailQuickStats}>
          <View style={styles.playerDetailQuickStat}>
            <Text style={styles.playerDetailQuickLabel}>
              {t("players.priceLabel")}
            </Text>
            <Text
              style={[
                styles.playerDetailQuickValue,
                hasPriceTrend && priceDelta > 0
                  ? styles.playerDetailQuickValueUp
                  : null,
                hasPriceTrend && priceDelta < 0
                  ? styles.playerDetailQuickValueDown
                  : null,
              ]}
            >
              {formatFantasyMoney(player.price)}
            </Text>
            {hasPriceTrend ? (
              <Text
                style={
                  priceDelta > 0
                    ? styles.playerDetailPriceDeltaUp
                    : styles.playerDetailPriceDeltaDown
                }
              >
                {formattedPriceDelta}
              </Text>
            ) : null}
          </View>
          <View style={styles.playerDetailQuickStat}>
            <Text style={styles.playerDetailQuickLabel}>
              {t("playerDetails.selectedPercent")}
            </Text>
            <Text style={styles.playerDetailQuickValue}>
              {selectedPercent}%
            </Text>
          </View>
          <View style={styles.playerDetailQuickStat}>
            <Text style={styles.playerDetailQuickLabel}>
              {t("players.statusLabel")}
            </Text>
            <Text numberOfLines={1} style={styles.playerDetailQuickValueSmall}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {statusNoticeMessage ? (
          <View
            style={[
              styles.playerDetailStatusNotice,
              isDoubtful
                ? styles.playerDetailStatusNoticeWarning
                : styles.playerDetailStatusNoticeDanger,
            ]}
          >
            <Text
              style={[
                styles.playerDetailStatusNoticeText,
                isDoubtful
                  ? styles.playerDetailStatusNoticeTextWarning
                  : styles.playerDetailStatusNoticeTextDanger,
              ]}
            >
              {statusNoticeMessage}
            </Text>
          </View>
        ) : null}

        {mode === "squad" && canSetLeadership ? (
          <View style={styles.playerDetailLeadershipPanel}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(isCaptain) }}
              onPress={onSetCaptain}
              style={styles.playerDetailLeadershipOption}
            >
              <CheckBoxMark checked={Boolean(isCaptain)} />
              <Text numberOfLines={1} style={styles.playerDetailLeadershipText}>
                {t("playerDetails.captain")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(isViceCaptain) }}
              onPress={onSetViceCaptain}
              style={styles.playerDetailLeadershipOption}
            >
              <CheckBoxMark checked={Boolean(isViceCaptain)} />
              <Text numberOfLines={1} style={styles.playerDetailLeadershipText}>
                {t("playerDetails.viceCaptain")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.playerDetailStatsPanel}>
          <Text style={styles.playerDetailSectionTitle}>
            {t("playerDetails.currentSeason")}
          </Text>
          <View style={styles.playerDetailStatsGrid}>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>{seasonPoints}</Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("playerDetails.totalPoints")}
              </Text>
            </View>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>{averagePoints}</Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("playerDetails.averagePoints")}
              </Text>
            </View>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>
                {player.goals ?? 0}
              </Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("players.stats.goals")}
              </Text>
            </View>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>
                {player.assists ?? 0}
              </Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("players.stats.assists")}
              </Text>
            </View>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>
                {player.penaltiesMissed ?? 0}
              </Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("playerDetails.penaltiesMissed")}
              </Text>
            </View>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>
                {player.penaltiesSaved ?? 0}
              </Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("playerDetails.penaltiesSaved")}
              </Text>
            </View>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>
                {player.appearances ?? 0}
              </Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("players.stats.matches")}
              </Text>
            </View>
            <View style={styles.playerDetailStatCell}>
              <Text style={styles.playerDetailStatValue}>{cardCount}</Text>
              <Text style={styles.playerDetailStatLabel}>
                {t("players.stats.cards")}
              </Text>
            </View>
          </View>
        </View>

        {mode === "squad" && (onRemove || onReplace || onSwap) ? (
          <View style={styles.playerDetailActions}>
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                onPress={onRemove}
                style={styles.playerDetailActionDanger}
              >
                <Text
                  numberOfLines={1}
                  style={styles.playerDetailActionDangerText}
                >
                  {t("playerDetails.remove")}
                </Text>
              </Pressable>
            ) : null}
            {onReplace ? (
              <Pressable
                accessibilityRole="button"
                onPress={onReplace}
                style={styles.playerDetailActionSecondary}
              >
                <Text
                  numberOfLines={1}
                  style={styles.playerDetailActionSecondaryText}
                >
                  {t("playerDetails.replace")}
                </Text>
              </Pressable>
            ) : null}
            {onSwap ? (
              <Pressable
                accessibilityRole="button"
                onPress={onSwap}
                style={styles.playerDetailActionPrimary}
              >
                <Text
                  numberOfLines={1}
                  style={styles.playerDetailActionPrimaryText}
                >
                  {t("playerDetails.swap")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
