export type SwappableSquadSlot = {
  rosterSlot: number;
  position: "goalkeeper" | "universal";
  squadRole: "starter" | "bench" | "reserve";
};

export function canSwapSquadSlots(
  source: SwappableSquadSlot,
  target: SwappableSquadSlot,
  picks: Readonly<Record<number, unknown>>,
) {
  return Boolean(
    source.rosterSlot !== target.rosterSlot &&
    picks[source.rosterSlot] &&
    picks[target.rosterSlot] &&
    source.position === target.position &&
    source.squadRole !== target.squadRole,
  );
}

export function assignSquadLeadership(
  captain: number | null,
  viceCaptain: number | null,
  slot: number,
  role: "captain" | "viceCaptain",
) {
  return role === "captain"
    ? {
        captain: slot,
        viceCaptain: viceCaptain === slot ? captain : viceCaptain,
      }
    : { captain: captain === slot ? viceCaptain : captain, viceCaptain: slot };
}

export function getLeadershipSlotAfterSwap(
  current: number | null,
  source: SwappableSquadSlot,
  target: SwappableSquadSlot,
) {
  if (current !== source.rosterSlot && current !== target.rosterSlot)
    return current;
  if (source.squadRole === "reserve") return target.rosterSlot;
  if (target.squadRole === "reserve") return source.rosterSlot;
  return current === source.rosterSlot ? target.rosterSlot : source.rosterSlot;
}

export type DragPoint = { x: number; y: number };
export type DragBounds = DragPoint & { width: number; height: number };

export function findSquadDropTarget(
  point: DragPoint,
  bounds: ReadonlyMap<number, DragBounds>,
  canDrop: (slot: number) => boolean,
) {
  for (const [slot, rect] of bounds) {
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height &&
      canDrop(slot)
    )
      return slot;
  }
  return null;
}
