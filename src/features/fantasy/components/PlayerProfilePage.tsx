import type { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import { useCachedPlayerProfile } from "../utils/playerProfileCacheContext";
import { usePlayerProfilePhoto } from "../utils/usePlayerProfilePhoto";
import type { PlayerDetail } from "./PlayerDetailSheet";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerProfileStatistics } from "./PlayerProfileStatistics";
import { PlayerProfileSkeleton } from "./PlayerProfileSkeleton";

export function PlayerProfilePage({
  actions,
  beforeStats,
  canQueryPrivateData = true,
  fallbackPlayer,
  headerAccessory,
  onBack,
  playerId,
  seasonSlug,
}: {
  actions?: ReactNode;
  beforeStats?: ReactNode;
  canQueryPrivateData?: boolean;
  fallbackPlayer?: PlayerDetail | null;
  headerAccessory?: ReactNode;
  onBack: () => void;
  playerId: Id<"fantasyPlayers">;
  seasonSlug?: string | null;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= WEB_DESKTOP_MIN_WIDTH;
  const profile = useCachedPlayerProfile(playerId, canQueryPrivateData, seasonSlug);
  const player = fallbackPlayer ?? profile?.player;
  const photo = usePlayerProfilePhoto(
    player?.photoUrl ?? player?.photoThumbnailUrl ?? null,
    canQueryPrivateData && profile !== null,
  );
  const isLoading = canQueryPrivateData && (profile === undefined || photo.isLoading);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={styles.playerProfilePage}>
      <View style={styles.teamWorkspaceHeader}>
        <Pressable
          accessibilityLabel={t("auth.back")}
          accessibilityRole="button"
          onPress={onBack}
          style={[
            styles.teamWorkspaceBackButton,
            { backgroundColor: fantasyTheme.softColor },
          ]}
        >
          <ArrowLeft
            color={fantasyTheme.primaryColor}
            size={22}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>
      {isLoading ? (
        <PlayerProfileSkeleton isDesktopWeb={isDesktopWeb} />
      ) : !player || !profile || !canQueryPrivateData ? (
        <Text style={styles.sectionTitle}>
          {t("team.viewer.playerUnavailable")}
        </Text>
      ) : (
        <>
          <View
            style={[
              styles.playerProfileHero,
              isDesktopWeb ? styles.playerProfileHeroDesktop : null,
              { backgroundColor: fantasyTheme.primaryColor },
            ]}
          >
            {headerAccessory}
            <PlayerAvatar
              displayName={player.displayName}
              iconSize={isDesktopWeb ? 112 : 72}
              photoUrl={photo.photoUrl}
              size="xl"
              style={[
                styles.playerProfileHeroAvatar,
                isDesktopWeb ? styles.playerProfileHeroAvatarDesktop : null,
              ]}
            />
            <View style={styles.playerProfileHeroText}>
              <Text style={styles.playerDetailPosition}>
                {t(
                  player.position === "goalkeeper"
                    ? "players.position.goalkeeper"
                    : "players.position.universal",
                )}
              </Text>
              <Text numberOfLines={2} style={styles.playerDetailName}>
                {player.displayName}
              </Text>
              <Text numberOfLines={1} style={styles.playerDetailClub}>
                {player.clubName ?? t("players.noClub")}
              </Text>
            </View>
          </View>
          <PlayerProfileStatistics
            player={player}
            profile={canQueryPrivateData ? profile : null}
          >
            {beforeStats}
          </PlayerProfileStatistics>
          {actions}
        </>
      )}
    </View>
  );
}
