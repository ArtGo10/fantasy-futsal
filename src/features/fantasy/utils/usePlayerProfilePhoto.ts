import { Image } from "expo-image";
import { useEffect, useState } from "react";

const PHOTO_TIMEOUT_MS = 5000;
const loadedPhotos = new Set<string>();

export function usePlayerProfilePhoto(url: string | null, enabled = true) {
  const [settledPhoto, setSettledPhoto] = useState<{
    url: string;
    loaded: boolean;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !url || loadedPhotos.has(url)) return;
    let active = true;
    const finish = (loaded: boolean) => {
      if (!active) return;
      active = false;
      clearTimeout(timeout);
      if (loaded) {
        // Avoid flashing the skeleton when revisiting a recently opened profile.
        loadedPhotos.add(url);
        if (loadedPhotos.size > 64) {
          loadedPhotos.delete(loadedPhotos.values().next().value!);
        }
      }
      setSettledPhoto({ url, loaded });
    };
    const timeout = setTimeout(() => finish(false), PHOTO_TIMEOUT_MS);
    void Image.prefetch(url, "memory-disk").then(finish, () => finish(false));
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [enabled, url]);

  const cached = Boolean(url && loadedPhotos.has(url));
  const settled = settledPhoto?.url === url;
  const isLoading = Boolean(enabled && url && !cached && !settled);
  return {
    isLoading,
    photoUrl: enabled && (cached || (settled && settledPhoto?.loaded)) ? url : null,
  };
}
