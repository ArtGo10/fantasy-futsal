import { memo, useEffect, useState } from "react";
import { Image } from "expo-image";
import { UserRound } from "lucide-react-native";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

type PlayerAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type PlayerAvatarProps = {
  displayName: string;
  imagePriority?: "low" | "normal" | "high";
  iconSize?: number;
  isMuted?: boolean;
  photoUrl?: string | null;
  size?: PlayerAvatarSize;
  style?: StyleProp<ViewStyle>;
};

const AVATAR_SIZE_STYLES = {
  xs: styles.playerAvatarXs,
  sm: styles.playerAvatarSm,
  md: styles.playerAvatarMd,
  lg: styles.playerAvatarLg,
  xl: styles.playerAvatarXl,
};

const AVATAR_ICON_SIZES: Record<PlayerAvatarSize, number> = {
  xs: 14,
  sm: 18,
  md: 21,
  lg: 25,
  xl: 34,
};

export const PlayerAvatar = memo(function PlayerAvatar({
  displayName,
  iconSize,
  imagePriority = "normal",
  isMuted = false,
  photoUrl,
  size = "md",
  style,
}: PlayerAvatarProps) {
  const fantasyTheme = useFantasySeasonTheme();
  const [hasImageError, setHasImageError] = useState(false);
  const resolvedPhotoUrl = photoUrl && !hasImageError ? photoUrl : null;

  useEffect(() => {
    setHasImageError(false);
  }, [photoUrl]);

  return (
    <View
      accessibilityLabel={displayName}
      style={[
        styles.playerAvatarBase,
        AVATAR_SIZE_STYLES[size],
        {
          backgroundColor: fantasyTheme.softColor,
          borderColor: fantasyTheme.borderColor,
        },
        style,
        isMuted ? styles.playerAvatarMuted : null,
      ]}
    >
      {resolvedPhotoUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="cover"
          contentPosition="top center"
          onError={() => setHasImageError(true)}
          priority={imagePriority}
          source={{ uri: resolvedPhotoUrl }}
          style={styles.playerAvatarImage}
          transition={0}
        />
      ) : (
        <UserRound
          color={isMuted ? colors.text.muted : fantasyTheme.primaryColor}
          size={iconSize ?? AVATAR_ICON_SIZES[size]}
          strokeWidth={2.2}
        />
      )}
    </View>
  );
});
