type PlayerWithPhoto = {
  photoThumbnailUrl?: string | null;
  photoUrl?: string | null;
};

export function getPlayerPhoto(player: PlayerWithPhoto | null | undefined) {
  return player?.photoThumbnailUrl ?? player?.photoUrl ?? null;
}
