export function fitSquadPitch({
  availableWidth,
  availableHeight,
  aspectRatio,
  sideWidth,
  bottomHeight,
  minimumFieldHeight,
}: {
  availableWidth: number;
  availableHeight: number;
  aspectRatio: number;
  sideWidth: number;
  bottomHeight: number;
  minimumFieldHeight: number;
}) {
  const fieldHeight = Math.max(
    minimumFieldHeight,
    Math.min(
      (availableWidth - sideWidth) / aspectRatio,
      availableHeight - bottomHeight,
    ),
  );
  const width = fieldHeight * aspectRatio + sideWidth;
  const height = fieldHeight + bottomHeight;
  const scale = Math.max(
    0,
    Math.min(1, availableWidth / width, availableHeight / height),
  );
  return { width, height, scale };
}
