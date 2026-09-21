export function fitSquadPitch({
  availableWidth,
  availableHeight,
  aspectRatio,
  sideWidth,
  bottomHeight,
  minimumFieldHeight,
}: {
  availableWidth: number;
  availableHeight?: number;
  aspectRatio: number;
  sideWidth: number;
  bottomHeight: number;
  minimumFieldHeight: number;
}) {
  // Keep a stable coordinate system so cards, rails and pitch grow together.
  const fieldHeight = Math.max(minimumFieldHeight, 300, 300 / aspectRatio);
  const width = fieldHeight * aspectRatio + sideWidth;
  const height = fieldHeight + bottomHeight;
  const scale = Math.max(
    0,
    Math.min(
      availableWidth / width,
      availableHeight === undefined ? Infinity : availableHeight / height,
    ),
  );
  return { width, height, scale };
}

export function fitRosterPitch({
  availableWidth,
  availableHeight,
  aspectRatio,
}: {
  availableWidth: number;
  availableHeight?: number;
  aspectRatio: number;
}) {
  // Five cards per row, with enough height for all three roster rows.
  const width = Math.max(360, aspectRatio * 300);
  const height = width / aspectRatio;
  const scale = Math.max(
    0,
    Math.min(
      availableWidth / width,
      availableHeight === undefined ? Infinity : availableHeight / height,
    ),
  );
  return { width, height, scale };
}
