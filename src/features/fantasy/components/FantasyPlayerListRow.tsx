import { Image } from "expo-image";
import { ArrowDown, ArrowUp, Coins, Star } from "lucide-react-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import type { TranslationKey } from "../../../i18n/translations";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import {
  FANTASY_STATIC_IMAGE_PROPS,
  getClubLogoSource,
} from "../assets/fantasyAssets";
import { formatFantasyMoney } from "../utils/money";
import { TeamKitAvatar } from "./TeamKitAvatar";

type PlayerPosition = "goalkeeper" | "universal";
type PlayerStatus =
  | "active"
  | "doubtful"
  | "injured"
  | "suspended"
  | "unavailable"
  | "left";
type Translate = (key: TranslationKey) => string;
export type FantasyPlayerListRowClub = {
  logoThumbnailUrl: string | null;
  logoUrl: string | null;
  name: string;
  shortName?: string | null;
};

export type FantasyPlayerListRowPlayer = {
  clubName: string | null;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  photoThumbnailUrl: string | null;
  photoUrl: string | null;
  appearances?: number | null;
  assists?: number | null;
  goals?: number | null;
  lastGameweekPoints?: number | null;
  penaltiesMissed?: number | null;
  penaltiesSaved?: number | null;
  position: PlayerPosition;
  price: number;
  previousPrice?: number | null;
  priceChangedAt?: number | null;
  priceDelta?: number | null;
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
  redCards?: number | null;
};

export const FANTASY_PLAYER_LIST_ROW_HEIGHT = 86;
export const FANTASY_PLAYER_PICKER_STATS_ROW_HEIGHT = 64;
export const FANTASY_PLAYER_LIST_SEPARATOR_HEIGHT = 12;
export const FANTASY_PLAYER_PICKER_STATS_SEPARATOR_HEIGHT = 0;
export const FANTASY_PLAYER_LIST_ITEM_HEIGHT =
  FANTASY_PLAYER_LIST_ROW_HEIGHT + FANTASY_PLAYER_LIST_SEPARATOR_HEIGHT;
export const FANTASY_PLAYER_PICKER_STATS_ITEM_HEIGHT =
  FANTASY_PLAYER_PICKER_STATS_ROW_HEIGHT +
  FANTASY_PLAYER_PICKER_STATS_SEPARATOR_HEIGHT;

const STATUS_LABEL_KEYS: Record<PlayerStatus, TranslationKey> = {
  active: "players.playerStatus.active",
  doubtful: "players.playerStatus.doubtful",
  injured: "players.playerStatus.injured",
  left: "players.playerStatus.left",
  suspended: "players.playerStatus.suspended",
  unavailable: "players.playerStatus.unavailable",
};

function getListInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase();
  return (words[0].slice(0, 1) + words[1].slice(0, 1)).toLocaleUpperCase();
}

function stripNameBrackets(value: string) {
  return value.replace(/^[\s(]+|[\s)]+$/g, "").trim();
}

export function formatFantasyPlayerListName(
  player: FantasyPlayerListRowPlayer,
) {
  const firstName = player.firstName?.trim();
  const lastName = player.lastName?.trim();
  const firstInitial = firstName ? Array.from(firstName)[0] : null;

  if (firstInitial && lastName) return `${firstInitial}. ${lastName}`;

  const nameParts = player.displayName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    const [fallbackFirstName, ...restParts] = nameParts;
    const [fallbackInitial] = Array.from(fallbackFirstName);
    return `${fallbackInitial}. ${restParts.join(" ")}`;
  }

  return player.displayName;
}

export function formatFantasyPlayerPickerName(
  player: FantasyPlayerListRowPlayer,
) {
  const lastName = stripNameBrackets(player.lastName?.trim() ?? "");
  if (lastName) return lastName;

  const nameParts = player.displayName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    return stripNameBrackets(nameParts.slice(1).join(" "));
  }

  return stripNameBrackets(player.displayName) || player.displayName;
}

export function getPositionShortLabelKey(
  position: PlayerPosition,
): TranslationKey {
  return position === "goalkeeper"
    ? "players.positionShort.goalkeeper"
    : "players.positionShort.universal";
}

export function FantasyPlayerStatusBadge({
  size = "md",
  status,
  t,
}: {
  size?: "sm" | "md";
  status: PlayerStatus;
  t: Translate;
}) {
  const isCompact = size === "sm";

  if (status === "active") {
    return (
      <View
        accessibilityLabel={t(STATUS_LABEL_KEYS[status])}
        style={[
          styles.marketStatusIcon,
          isCompact ? styles.fantasyPlayerStatusBadgeCompact : null,
          styles.marketStatusIconActive,
        ]}
      >
        <Text
          style={[
            styles.marketStatusIconText,
            isCompact ? styles.fantasyPlayerStatusTextCompact : null,
          ]}
        >
          ✓
        </Text>
      </View>
    );
  }

  const isDoubtful = status === "doubtful";

  return (
    <View
      accessibilityLabel={t(STATUS_LABEL_KEYS[status])}
      style={[
        styles.fantasyPlayerStatusTriangleWrap,
        isCompact ? styles.fantasyPlayerStatusTriangleWrapCompact : null,
      ]}
    >
      <View
        style={[
          styles.fantasyPlayerStatusTriangle,
          isDoubtful ? styles.fantasyPlayerStatusTriangleDoubtful : null,
          isCompact ? styles.fantasyPlayerStatusTriangleCompact : null,
        ]}
      />
      <Text
        style={[
          styles.fantasyPlayerStatusTriangleText,
          isDoubtful ? styles.fantasyPlayerStatusTriangleTextDoubtful : null,
          isCompact ? styles.fantasyPlayerStatusTriangleTextCompact : null,
        ]}
      >
        {isDoubtful ? "?" : "!"}
      </Text>
    </View>
  );
}

export function FantasyClubLogo({
  club,
  loadImage = true,
  size = "sm",
}: {
  club: FantasyPlayerListRowClub | null;
  loadImage?: boolean;
  size?: "sm" | "md";
}) {
  const logoSource = loadImage
    ? getClubLogoSource(club?.name, club?.shortName)
    : null;
  const logoStyle =
    size === "sm" ? styles.seasonClubLogoSm : styles.seasonClubLogoMd;
  const textStyle =
    size === "sm" ? styles.seasonClubLogoTextSm : styles.seasonClubLogoTextMd;

  return (
    <View style={[styles.seasonClubLogo, logoStyle]}>
      {logoSource ? (
        <Image
          {...FANTASY_STATIC_IMAGE_PROPS}
          contentFit="contain"
          source={logoSource}
          style={styles.seasonClubLogoImage}
        />
      ) : (
        <Text numberOfLines={1} style={[styles.seasonClubLogoText, textStyle]}>
          {getListInitials(club?.shortName ?? club?.name ?? "?")}
        </Text>
      )}
    </View>
  );
}

export function FantasyPlayerListSeparator() {
  return <View style={styles.marketListSeparator} />;
}

export function FantasyPlayerPickerStatsSeparator() {
  return <View style={styles.playerPickerStatsSeparator} />;
}

function formatListStat(value: number | null | undefined) {
  const rounded = Number((value ?? 0).toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function FantasyPlayerPickerMetric({
  isFirst = false,
  label,
  tone = "default",
  value,
  wide = false,
}: {
  isFirst?: boolean;
  label: string;
  tone?: "default" | "price";
  value: string;
  wide?: boolean;
}) {
  return (
    <View
      accessibilityLabel={label + ": " + value}
      style={[
        styles.playerPickerStatsMetric,
        isFirst ? styles.playerPickerStatsMetricFirst : null,
        wide ? styles.playerPickerStatsMetricWide : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.playerPickerStatsMetricValue,
          tone === "price" ? styles.playerPickerStatsMetricValuePrice : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function FantasyPlayerPickerMetricHeader({
  isFirst = false,
  label,
  tone = "default",
  wide = false,
}: {
  isFirst?: boolean;
  label: string;
  tone?: "default" | "price";
  wide?: boolean;
}) {
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.playerPickerStatsMetric,
        styles.playerPickerStatsMetricHeaderCell,
        isFirst ? styles.playerPickerStatsMetricFirst : null,
        wide ? styles.playerPickerStatsMetricWide : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.playerPickerStatsMetricHeaderText,
          tone === "price"
            ? styles.playerPickerStatsMetricHeaderTextPrice
            : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function FantasyPlayerPickerStatsHeader({ t }: { t: Translate }) {
  return (
    <View style={styles.playerPickerStatsHeaderRow}>
      <Text numberOfLines={1} style={styles.playerPickerStatsHeaderPlayer}>
        {t("team.playerTable.player")}
      </Text>
      <View style={styles.playerPickerStatsMetrics}>
        <FantasyPlayerPickerMetricHeader
          isFirst
          label={t("team.list.price")}
          wide
        />
        <FantasyPlayerPickerMetricHeader
          label={t("season.stats.pointsShort")}
        />
        <FantasyPlayerPickerMetricHeader label={t("team.list.form")} />
        <FantasyPlayerPickerMetricHeader label={t("team.list.selected")} wide />
        <FantasyPlayerPickerMetricHeader label={t("season.stats.appsShort")} />
        <FantasyPlayerPickerMetricHeader label={t("season.stats.goalsShort")} />
        <FantasyPlayerPickerMetricHeader
          label={t("season.stats.assistsShort")}
        />
        <FantasyPlayerPickerMetricHeader
          label={t("season.stats.yellowCardsShort")}
        />
        <FantasyPlayerPickerMetricHeader
          label={t("season.stats.redCardsShort")}
        />
      </View>
    </View>
  );
}

type FantasyPlayerListRowProps<TPlayer extends FantasyPlayerListRowPlayer> = {
  club: FantasyPlayerListRowClub | null;
  isDisabled?: boolean;
  isFavorite?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  loadImages?: boolean;
  onPress: (player: TPlayer) => void;
  player: TPlayer;
  stateLabel?: string | null;
  stateTone?: "danger" | "success";
  t: Translate;
  variant?: "market" | "pickerStats";
};

function FantasyPlayerListRowInner<TPlayer extends FantasyPlayerListRowPlayer>({
  club,
  isDisabled = false,
  isFavorite = false,
  isHighlighted = false,
  isSelected = false,
  onPress,
  player,
  stateLabel = null,
  stateTone = "success",
  t,
  variant = "market",
}: FantasyPlayerListRowProps<TPlayer>) {
  const sideTextStyle = isDisabled
    ? styles.marketSideValueMuted
    : styles.marketSideValue;
  const priceDelta = Number((player.priceDelta ?? 0).toFixed(1));
  const hasPriceTrend = Math.abs(priceDelta) >= 0.1 && !isDisabled;
  const priceTextStyle = isDisabled
    ? styles.marketPriceValueMuted
    : hasPriceTrend && priceDelta > 0
      ? styles.marketPriceValueUp
      : hasPriceTrend && priceDelta < 0
        ? styles.marketPriceValueDown
        : styles.marketPriceValue;
  const PriceTrendIcon = priceDelta > 0 ? ArrowUp : ArrowDown;
  const priceTrendColor =
    priceDelta > 0 ? colors.state.success : colors.state.danger;
  if (variant === "pickerStats") {
    return (
      <View
        style={[
          styles.playerPickerStatsPlayerRow,
          isHighlighted ? styles.playerPickerRowIncomingTransfer : null,
          isSelected ? styles.playerPickerRowSelected : null,
          isDisabled ? styles.playerPickerRowDisabled : null,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={isDisabled}
          onPress={() => onPress(player)}
          style={styles.playerPickerStatsPlayerCell}
        >
          <FantasyPlayerStatusBadge status={player.status} t={t} size="sm" />
          <TeamKitAvatar
            clubName={player.clubName}
            clubShortName={club?.shortName ?? club?.name ?? null}
            displayName={player.displayName}
            isMuted={isDisabled}
            position={player.position}
            size="xs"
          />
          <View style={styles.playerPickerStatsPlayerMain}>
            <View style={styles.playerPickerStatsNameLine}>
              <Text
                numberOfLines={1}
                style={styles.playerPickerStatsPlayerName}
              >
                {formatFantasyPlayerPickerName(player)}
              </Text>
              {isFavorite ? (
                <Star
                  color={colors.state.warning}
                  fill={colors.brand.yellow}
                  size={12}
                  strokeWidth={2.4}
                />
              ) : null}
            </View>
            <View style={styles.playerPickerStatsMetaLine}>
              <Text numberOfLines={1} style={styles.playerPickerStatsClubName}>
                {player.clubName ?? t("players.noClub")}
              </Text>
              {stateLabel ? (
                <Text
                  numberOfLines={1}
                  style={
                    stateTone === "danger"
                      ? styles.playerPickerStatsStateLabelDanger
                      : styles.playerPickerStatsStateLabelSuccess
                  }
                >
                  {stateLabel}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>

        <View style={styles.playerPickerStatsMetrics}>
          <FantasyPlayerPickerMetric
            isFirst
            label={t("team.list.price")}
            tone="price"
            value={formatFantasyMoney(player.price)}
            wide
          />
          <FantasyPlayerPickerMetric
            label={t("season.stats.pointsShort")}
            value={formatListStat(player.seasonPoints)}
          />
          <FantasyPlayerPickerMetric
            label={t("team.list.form")}
            value={formatListStat(player.lastGameweekPoints)}
          />
          <FantasyPlayerPickerMetric
            label={t("team.list.selected")}
            value={formatListStat(player.selectedPercent) + "%"}
            wide
          />
          <FantasyPlayerPickerMetric
            label={t("season.stats.appsShort")}
            value={formatListStat(player.appearances)}
          />
          <FantasyPlayerPickerMetric
            label={t("season.stats.goalsShort")}
            value={formatListStat(player.goals)}
          />
          <FantasyPlayerPickerMetric
            label={t("season.stats.assistsShort")}
            value={formatListStat(player.assists)}
          />
          <FantasyPlayerPickerMetric
            label={t("season.stats.yellowCardsShort")}
            value={formatListStat(player.yellowCards)}
          />
          <FantasyPlayerPickerMetric
            label={t("season.stats.redCardsShort")}
            value={formatListStat(player.redCards)}
          />
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={() => onPress(player)}
      style={[
        styles.marketPlayerRow,
        isHighlighted ? styles.playerPickerRowIncomingTransfer : null,
        isSelected ? styles.playerPickerRowSelected : null,
        isDisabled ? styles.playerPickerRowDisabled : null,
      ]}
    >
      <TeamKitAvatar
        clubName={player.clubName}
        clubShortName={club?.shortName ?? club?.name ?? null}
        displayName={player.displayName}
        isMuted={isDisabled}
        position={player.position}
        size="lg"
      />
      <View style={styles.marketPlayerMain}>
        <View style={styles.marketPlayerNameRow}>
          <FantasyPlayerStatusBadge status={player.status} t={t} />
          <Text numberOfLines={1} style={styles.marketPlayerName}>
            {formatFantasyPlayerListName(player)}
          </Text>
          {isFavorite ? (
            <Star
              color={colors.state.warning}
              fill={colors.brand.yellow}
              size={16}
              strokeWidth={2.4}
            />
          ) : null}
        </View>
        <View style={styles.marketPlayerClubRow}>
          <Text numberOfLines={1} style={styles.marketClubName}>
            {player.clubName ?? t("players.noClub")}
          </Text>
          <Text style={styles.marketPositionBadge}>
            {t(getPositionShortLabelKey(player.position))}
          </Text>
        </View>
      </View>
      <View style={styles.marketPlayerSide}>
        <View style={styles.marketSideLine}>
          <Text style={styles.marketSideLabel}>
            {t("market.fantasyPointsShort")}
          </Text>
          <Text style={sideTextStyle}>{player.seasonPoints ?? 0}</Text>
        </View>
        <View style={styles.marketSideLine}>
          <Coins
            color={isDisabled ? colors.text.muted : colors.brand.blueDark}
            size={15}
            strokeWidth={2.4}
          />
          <View style={styles.marketPriceTrendGroup}>
            <Text style={priceTextStyle}>
              {formatFantasyMoney(player.price)}
            </Text>
            {hasPriceTrend ? (
              <PriceTrendIcon
                color={priceTrendColor}
                size={13}
                strokeWidth={3}
              />
            ) : null}
          </View>
        </View>
        {stateLabel ? (
          <Text
            numberOfLines={1}
            style={
              stateTone === "danger"
                ? styles.marketSideStateLabelDanger
                : styles.marketSideStateLabelSuccess
            }
          >
            {stateLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const FantasyPlayerListRow = memo(
  FantasyPlayerListRowInner,
) as typeof FantasyPlayerListRowInner;
