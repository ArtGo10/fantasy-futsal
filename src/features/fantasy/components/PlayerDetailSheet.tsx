import { Star } from "lucide-react-native";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import type { TranslationKey } from "../../../i18n/translations";
import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { formatFantasyMoney, formatFantasyMoneyDelta } from "../utils/money";
import { getPlayerPhoto } from "../utils/playerStats";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
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

export type PlayerDetail = {
  clubName: string | null;
  displayName: string;
  photoThumbnailUrl?: string | null;
  photoUrl?: string | null;
  appearances?: number | null;
  assists?: number | null;
  averagePointsPerGameweek?: number | null;
  cleanSheets?: number | null;
  goals?: number | null;
  goalsConceded?: number | null;
  managerAveragePointsPerGameweek?: number | null;
  managerLastGameweekPoints?: number | null;
  managerSeasonPoints?: number | null;
  ownGoals?: number | null;
  penaltiesMissed?: number | null;
  penaltiesSaved?: number | null;
  position: PlayerPosition;
  price: number;
  previousPrice?: number | null;
  priceChangedAt?: number | null;
  priceDelta?: number | null;
  redCards?: number | null;
  saves?: number | null;
  seasonPoints?: number | null;
  selectedPercent?: number | null;
  status: PlayerStatus;
  statusDetails?: {
    message?: string | null;
    messageEn?: string | null;
    messagePl?: string | null;
    messageUk?: string | null;
    updatedAt?: number | null;
  } | null;
  statusMessage?: string | null;
  yellowCards?: number | null;
};

export type PlayerDetailSeasonStatsPlayer = {
  appearances?: number | null;
  assists?: number | null;
  averagePointsPerGameweek?: number | null;
  cleanSheets?: number | null;
  goals?: number | null;
  goalsConceded?: number | null;
  ownGoals?: number | null;
  penaltiesMissed?: number | null;
  penaltiesSaved?: number | null;
  position: PlayerPosition;
  redCards?: number | null;
  saves?: number | null;
  seasonPoints?: number | null;
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

export function getPlayerDetailSeasonStatItems(
  player: PlayerDetailSeasonStatsPlayer,
  t: (key: TranslationKey) => string,
) {
  const items = [
    {
      key: "seasonPoints",
      label: t("playerDetails.totalPoints"),
      value: formatPlayerDetailNumber(player.seasonPoints),
    },
    {
      key: "averagePoints",
      label: t("playerDetails.averagePoints"),
      value: formatPlayerDetailNumber(player.averagePointsPerGameweek),
    },
    {
      key: "goals",
      label: t("players.stats.goals"),
      value: formatPlayerDetailNumber(player.goals),
    },
    {
      key: "assists",
      label: t("players.stats.assists"),
      value: formatPlayerDetailNumber(player.assists),
    },
    {
      key: "appearances",
      label: t("players.stats.matches"),
      value: formatPlayerDetailNumber(player.appearances),
    },
    {
      key: "yellowCards",
      label: t("playerDetails.yellowCards"),
      value: formatPlayerDetailNumber(player.yellowCards),
    },
    {
      key: "redCards",
      label: t("playerDetails.redCards"),
      value: formatPlayerDetailNumber(player.redCards),
    },
    {
      key: "ownGoals",
      label: t("playerDetails.ownGoals"),
      value: formatPlayerDetailNumber(player.ownGoals),
    },
    {
      key: "penaltiesMissed",
      label: t("playerDetails.penaltiesMissed"),
      value: formatPlayerDetailNumber(player.penaltiesMissed),
    },
  ];

  if (player.position === "goalkeeper") {
    items.push(
      {
        key: "cleanSheets",
        label: t("playerDetails.cleanSheets"),
        value: formatPlayerDetailNumber(player.cleanSheets),
      },
      {
        key: "goalsConceded",
        label: t("playerDetails.goalsConceded"),
        value: formatPlayerDetailNumber(player.goalsConceded),
      },
      {
        key: "saves",
        label: t("playerDetails.saves"),
        value: formatPlayerDetailNumber(player.saves),
      },
      {
        key: "penaltiesSaved",
        label: t("playerDetails.penaltiesSaved"),
        value: formatPlayerDetailNumber(player.penaltiesSaved),
      },
    );
  }

  return items;
}

const STATUS_LABEL_KEYS: Record<
  "active" | "doubtful" | "unavailable",
  TranslationKey
> = {
  active: "players.playerStatus.active",
  doubtful: "players.playerStatus.doubtful",
  unavailable: "players.playerStatus.unavailable",
};

const STATUS_REASON_LABEL_KEYS: Partial<Record<PlayerStatus, TranslationKey>> =
  {
    injured: "players.playerStatus.injured",
    left: "players.playerStatus.left",
    suspended: "players.playerStatus.suspended",
  };

function getPublicPlayerStatus(status: PlayerStatus) {
  if (status === "active" || status === "doubtful") return status;
  return "unavailable";
}

function normalizeStatusText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[\s.!?:;]+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

type PlayerDetailHeroProps = {
  isDesktopWeb?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  player: PlayerDetail;
  t: (key: TranslationKey) => string;
};

function PlayerDetailHero({
  isDesktopWeb,
  isFavorite,
  onToggleFavorite,
  player,
  t,
}: PlayerDetailHeroProps) {
  const fantasyTheme = useFantasySeasonTheme();

  return (
    <View
      style={[
        styles.playerDetailHero,
        { backgroundColor: fantasyTheme.primaryColor },
        isDesktopWeb ? styles.playerDetailHeroDesktop : null,
      ]}
    >
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
        iconSize={isDesktopWeb ? 54 : undefined}
        photoUrl={getPlayerPhoto(player)}
        size="xl"
        style={isDesktopWeb ? styles.playerDetailHeroAvatarDesktop : null}
      />
      <View
        style={[
          styles.playerDetailHeroText,
          isDesktopWeb ? styles.playerDetailHeroTextDesktop : null,
        ]}
      >
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
  const fantasyTheme = useFantasySeasonTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;

  if (!player) return null;

  const selectedPercent = formatPlayerDetailNumber(player.selectedPercent);
  const priceDelta = Number((player.priceDelta ?? 0).toFixed(1));
  const hasPriceTrend = Math.abs(priceDelta) >= 0.1;
  const formattedPriceDelta = formatFantasyMoneyDelta(priceDelta);
  const seasonStatItems = getPlayerDetailSeasonStatItems(player, t);
  const publicStatus = getPublicPlayerStatus(player.status);
  const statusLabel = t(STATUS_LABEL_KEYS[publicStatus]);
  const statusMessage =
    player.status !== "active" ? player.statusMessage?.trim() : null;
  const fallbackStatusReasonKey = STATUS_REASON_LABEL_KEYS[player.status];
  const fallbackStatusReason = fallbackStatusReasonKey
    ? t(fallbackStatusReasonKey)
    : null;
  const normalizedStatusLabel = normalizeStatusText(statusLabel);
  const normalizedStatusMessage = normalizeStatusText(statusMessage);
  const statusNoticeMessage =
    statusMessage && normalizedStatusMessage !== normalizedStatusLabel
      ? statusMessage
      : fallbackStatusReason;
  const isDoubtful = publicStatus === "doubtful";
  const quickStatsSection = (
    <View
      style={[
        styles.playerDetailQuickStats,
        isDesktopWeb ? styles.playerDetailQuickStatsDesktop : null,
      ]}
    >
      <View style={styles.playerDetailQuickStat}>
        <Text style={styles.playerDetailQuickLabel}>
          {t("players.priceLabel")}
        </Text>
        <Text
          style={[
            styles.playerDetailQuickValue,
            !hasPriceTrend
              ? { color: fantasyTheme.primaryColor }
              : null,
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
        <Text
          style={[
            styles.playerDetailQuickValue,
            { color: fantasyTheme.primaryColor },
          ]}
        >
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
  );
  const leadershipSection =
    mode === "squad" && canSetLeadership ? (
      <View
        style={[
          styles.playerDetailLeadershipPanel,
          isDesktopWeb ? styles.playerDetailLeadershipPanelDesktop : null,
        ]}
      >
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
    ) : null;

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
        <View
          style={[
            styles.playerDetailTopStack,
            isDesktopWeb ? styles.playerDetailTopGridDesktop : null,
          ]}
        >
          <View style={isDesktopWeb ? styles.playerDetailTopPaneDesktop : null}>
            <PlayerDetailHero
              isDesktopWeb={isDesktopWeb}
              isFavorite={isFavorite}
              onToggleFavorite={
                mode === "market" ? onToggleFavorite : undefined
              }
              player={player}
              t={t}
            />
          </View>

          {isDesktopWeb ? (
            <View style={styles.playerDetailSidePaneDesktop}>
              {quickStatsSection}
              {leadershipSection}
            </View>
          ) : (
            quickStatsSection
          )}
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

        {!isDesktopWeb ? leadershipSection : null}

        <View style={styles.playerDetailStatsPanel}>
          <Text style={styles.playerDetailSectionTitle}>
            {t("playerDetails.currentSeason")}
          </Text>
          <View
            style={[
              styles.playerDetailStatsGrid,
              isDesktopWeb ? styles.playerDetailStatsGridDesktop : null,
            ]}
          >
            {seasonStatItems.map((item) => (
              <View
                key={item.key}
                style={[
                  styles.playerDetailStatCell,
                  isDesktopWeb ? styles.playerDetailStatCellDesktop : null,
                ]}
              >
                <Text
                  style={[
                    styles.playerDetailStatValue,
                    { color: fantasyTheme.primaryColor },
                  ]}
                >
                  {item.value}
                </Text>
                <Text style={styles.playerDetailStatLabel}>{item.label}</Text>
              </View>
            ))}
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
                style={[
                  styles.playerDetailActionSecondary,
                  { borderColor: fantasyTheme.borderColor },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.playerDetailActionSecondaryText,
                    { color: fantasyTheme.primaryColor },
                  ]}
                >
                  {t("playerDetails.replace")}
                </Text>
              </Pressable>
            ) : null}
            {onSwap ? (
              <Pressable
                accessibilityRole="button"
                onPress={onSwap}
                style={[
                  styles.playerDetailActionPrimary,
                  { backgroundColor: fantasyTheme.primaryColor },
                ]}
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
