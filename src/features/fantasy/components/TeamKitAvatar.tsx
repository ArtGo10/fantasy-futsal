import { Image } from "expo-image";
import { Shirt } from "lucide-react-native";
import { memo } from "react";
import { View } from "react-native";

import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import {
  FANTASY_STATIC_IMAGE_PROPS,
  getClubKitSource,
  type PlayerPosition,
} from "../assets/fantasyAssets";

type TeamKitAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type TeamKitAvatarProps = {
  clubName?: string | null;
  clubShortName?: string | null;
  displayName: string;
  isMuted?: boolean;
  position?: PlayerPosition | null;
  size?: TeamKitAvatarSize;
  variant?: "avatar" | "slot";
};

const KIT_SIZE_STYLES = {
  xs: styles.playerAvatarXs,
  sm: styles.playerAvatarSm,
  md: styles.playerAvatarMd,
  lg: styles.playerAvatarLg,
  xl: styles.playerAvatarXl,
};

const KIT_ICON_SIZES: Record<TeamKitAvatarSize, number> = {
  xs: 21,
  sm: 29,
  md: 35,
  lg: 43,
  xl: 76,
};

export const TeamKitAvatar = memo(function TeamKitAvatar({
  clubName,
  clubShortName,
  displayName,
  isMuted = false,
  position,
  size = "md",
  variant = "avatar",
}: TeamKitAvatarProps) {
  const kitSource = getClubKitSource(clubName, clubShortName, position);
  const isSlotVariant = variant === "slot";

  return (
    <View
      accessibilityLabel={displayName}
      style={[
        styles.playerAvatarBase,
        KIT_SIZE_STYLES[size],
        styles.teamKitAvatarBase,
        isSlotVariant ? styles.teamKitAvatarSlotBase : null,
        isMuted ? styles.playerAvatarMuted : null,
      ]}
    >
      {kitSource ? (
        <Image
          {...FANTASY_STATIC_IMAGE_PROPS}
          contentFit="contain"
          source={kitSource}
          style={[
            styles.teamKitAvatarImage,
            isSlotVariant ? styles.teamKitAvatarSlotImage : null,
          ]}
        />
      ) : (
        <Shirt
          color={isMuted ? colors.text.muted : colors.brand.blueDark}
          size={Math.round(KIT_ICON_SIZES[size] * (isSlotVariant ? 1.1 : 1))}
          strokeWidth={2.2}
        />
      )}
    </View>
  );
});
