import { Image } from "expo-image";
import { memo } from "react";
import { View } from "react-native";

import { styles } from "../../../styles";
import {
  FANTASY_STATIC_IMAGE_PROPS,
  TSHIRT_PLACEHOLDER_IMAGE,
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
  const isPlaceholderKit = !kitSource;

  return (
    <View
      accessibilityLabel={displayName}
      pointerEvents="none"
      style={[
        styles.playerAvatarBase,
        KIT_SIZE_STYLES[size],
        styles.teamKitAvatarBase,
        isSlotVariant ? styles.teamKitAvatarSlotBase : null,
        isMuted ? styles.playerAvatarMuted : null,
      ]}
    >
      <Image
        {...FANTASY_STATIC_IMAGE_PROPS}
        draggable={false}
        contentFit="contain"
        source={kitSource ?? TSHIRT_PLACEHOLDER_IMAGE}
        style={[
          styles.teamKitAvatarImage,
          isSlotVariant ? styles.teamKitAvatarSlotImage : null,
          isPlaceholderKit ? styles.teamKitAvatarPlaceholderImage : null,
          isSlotVariant && isPlaceholderKit
            ? styles.teamKitAvatarSlotPlaceholderImage
            : null,
        ]}
      />
    </View>
  );
});
