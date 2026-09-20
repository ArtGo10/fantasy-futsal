import { Star } from "lucide-react-native";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import type { TranslationKey } from "../../../i18n/translations";
import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { usePlayerProfilePhoto } from "../utils/usePlayerProfilePhoto";
import { useCachedPlayerProfile } from "../utils/playerProfileCacheContext";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import { BottomSheet } from "./BottomSheet";
import { CheckBoxMark } from "./CheckBoxMark";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerProfilePage } from "./PlayerProfilePage";
import { PlayerProfileStatistics } from "./PlayerProfileStatistics";
import { PlayerProfileSkeleton } from "./PlayerProfileSkeleton";

type PlayerPosition = "goalkeeper" | "universal";
type PlayerStatus =
  | "active"
  | "doubtful"
  | "injured"
  | "suspended"
  | "unavailable"
  | "left";

export type PlayerDetail = {
  id: Id<"fantasyPlayers">;
  clubName: string | null;
  displayName: string;
  photoThumbnailUrl?: string | null;
  photoUrl?: string | null;
  appearances?: number | null;
  assists?: number | null;
  averagePointsPerGameweek?: number | null;
  cleanSheets?: number | null;
  form?: number | null;
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

type PlayerDetailSheetProps = {
  canQueryPrivateData?: boolean;
  canSetLeadership?: boolean;
  isCaptain?: boolean;
  isFavorite?: boolean;
  isViceCaptain?: boolean;
  mode: "market" | "squad";
  onAdd?: () => void;
  onClose: () => void;
  onRemove?: () => void;
  onReplace?: () => void;
  onSetCaptain?: () => void;
  onSetViceCaptain?: () => void;
  onSwap?: () => void;
  onToggleFavorite?: () => void;
  player: PlayerDetail | null;
  playerId?: Id<"fantasyPlayers"> | null;
  presentation?: "sheet" | "page";
  visible: boolean;
};

const POSITION_LABEL_KEYS: Record<PlayerPosition, TranslationKey> = {
  goalkeeper: "players.position.goalkeeper",
  universal: "players.position.universal",
};

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

function getPlayerDetailNameLines(displayName: string) {
  const parts = displayName.replace(/\s+/g, " ").trim().split(" ");

  if (parts.length <= 1) {
    return [displayName];
  }

  return [parts[0], parts.slice(1).join(" ")];
}

type PlayerDetailHeroProps = {
  isDesktopWeb?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  player: PlayerDetail;
  photoUrl: string | null;
  t: (key: TranslationKey) => string;
};

function PlayerDetailHero({
  isDesktopWeb,
  isFavorite,
  onToggleFavorite,
  player,
  photoUrl,
  t,
}: PlayerDetailHeroProps) {
  const fantasyTheme = useFantasySeasonTheme();
  const playerNameLines = getPlayerDetailNameLines(player.displayName);

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
        iconSize={isDesktopWeb ? 112 : 72}
        photoUrl={photoUrl}
        size="xl"
        style={[
          styles.playerProfileHeroAvatar,
          isDesktopWeb ? styles.playerProfileHeroAvatarDesktop : null,
        ]}
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
        <View
          accessibilityLabel={player.displayName}
          accessible
          style={styles.playerDetailNameGroup}
        >
          {playerNameLines.map((line, index) => (
            <Text
              adjustsFontSizeToFit
              key={`${line}-${index}`}
              minimumFontScale={0.82}
              numberOfLines={1}
              style={styles.playerDetailName}
            >
              {line}
            </Text>
          ))}
        </View>
        <Text numberOfLines={1} style={styles.playerDetailClub}>
          {player.clubName ?? t("players.noClub")}
        </Text>
      </View>
    </View>
  );
}

export function PlayerDetailSheet({
  canQueryPrivateData = true,
  canSetLeadership,
  isCaptain,
  isFavorite,
  isViceCaptain,
  mode,
  onAdd,
  onClose,
  onRemove,
  onReplace,
  onSetCaptain,
  onSetViceCaptain,
  onSwap,
  onToggleFavorite,
  player,
  playerId,
  presentation = "sheet",
  visible,
}: PlayerDetailSheetProps) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const profile = useCachedPlayerProfile(
    player?.id ?? null,
    presentation === "sheet" && visible && canQueryPrivateData,
  );
  const photo = usePlayerProfilePhoto(
    player?.photoUrl ?? player?.photoThumbnailUrl ?? null,
    presentation === "sheet" && visible && canQueryPrivateData && profile !== null,
  );
  const isLoading = canQueryPrivateData && (profile === undefined || photo.isLoading);
  const isReady = canQueryPrivateData && Boolean(profile) && !isLoading;
  if (!player) {
    return presentation === "page" && visible && playerId ? (
      <PlayerProfilePage
        canQueryPrivateData={canQueryPrivateData}
        onBack={onClose}
        playerId={playerId}
      />
    ) : null;
  }

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
  const handleSetCaptainPress = () => {
    onSetCaptain?.();
    onClose();
  };
  const handleSetViceCaptainPress = () => {
    onSetViceCaptain?.();
    onClose();
  };
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
          onPress={handleSetCaptainPress}
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
          onPress={handleSetViceCaptainPress}
          style={styles.playerDetailLeadershipOption}
        >
          <CheckBoxMark checked={Boolean(isViceCaptain)} />
          <Text numberOfLines={1} style={styles.playerDetailLeadershipText}>
            {t("playerDetails.viceCaptain")}
          </Text>
        </Pressable>
      </View>
    ) : null;
  const actionBottomPadding = !isDesktopWeb ? Math.max(insets.bottom, 0) : 0;
  const showReplaceAction = !isDesktopWeb && Boolean(onReplace);
  const actionsSection =
    onAdd || (mode === "squad" && (onRemove || showReplaceAction || onSwap)) ? (
      <View
        style={[
          styles.playerDetailActions,
          actionBottomPadding > 0
            ? { paddingBottom: actionBottomPadding }
            : null,
        ]}
      >
        {onAdd ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAdd}
            style={[
              styles.playerDetailActionPrimary,
              isDesktopWeb ? styles.playerDetailActionDesktop : null,
              { backgroundColor: fantasyTheme.primaryColor },
            ]}
          >
            <Text numberOfLines={1} style={styles.playerDetailActionPrimaryText}>
              {t("playerDetails.add")}
            </Text>
          </Pressable>
        ) : null}
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRemove}
            style={[
              styles.playerDetailActionDanger,
              isDesktopWeb ? styles.playerDetailActionDesktop : null,
            ]}
          >
            <Text numberOfLines={1} style={styles.playerDetailActionDangerText}>
              {t("playerDetails.remove")}
            </Text>
          </Pressable>
        ) : null}
        {showReplaceAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onReplace}
            style={[
              styles.playerDetailActionSecondary,
              isDesktopWeb ? styles.playerDetailActionDesktop : null,
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
              isDesktopWeb ? styles.playerDetailActionDesktop : null,
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
    ) : null;

  const statusNotice = statusNoticeMessage ? (
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
  ) : null;

  if (presentation === "page") {
    return visible ? (
      <PlayerProfilePage
        actions={actionsSection}
        beforeStats={
          <>
            {statusNotice}
            {leadershipSection}
          </>
        }
        canQueryPrivateData={canQueryPrivateData}
        fallbackPlayer={player}
        headerAccessory={
          mode === "market" && onToggleFavorite ? (
            <Pressable
              accessibilityLabel={t(
                isFavorite
                  ? "playerDetails.removeFavorite"
                  : "playerDetails.addFavorite",
              )}
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
          ) : null
        }
        onBack={onClose}
        playerId={player.id}
      />
    ) : null;
  }

  return (
    <BottomSheet
      contentScrollEnabled={false}
      onClose={onClose}
      sheetStyle={[
        styles.playerDetailSheet,
        !isDesktopWeb ? styles.playerDetailSheetMobile : null,
      ]}
      visible={visible && Boolean(player)}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.playerDetailScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.playerDetailScroll}
      >
        {isLoading ? (
          <PlayerProfileSkeleton
            isDesktopWeb={isDesktopWeb}
            presentation="sheet"
          />
        ) : !isReady ? (
          <Text style={styles.mutedText}>{t("team.viewer.playerUnavailable")}</Text>
        ) : (
          <>
            <PlayerDetailHero
              isDesktopWeb={isDesktopWeb}
              isFavorite={isFavorite}
              onToggleFavorite={mode === "market" ? onToggleFavorite : undefined}
              player={player}
              photoUrl={photo.photoUrl}
              t={t}
            />
            <PlayerProfileStatistics player={player} profile={profile}>
              {statusNotice}
              {leadershipSection}
            </PlayerProfileStatistics>
          </>
        )}
      </ScrollView>
      {isReady ? actionsSection : null}
    </BottomSheet>
  );
}
