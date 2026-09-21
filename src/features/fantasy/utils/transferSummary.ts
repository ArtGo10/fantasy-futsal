import {
  isUnlimitedTransferChip,
  type FantasyChip,
} from "../../../../convex/fantasyChips";

export function getTransferSummary({
  activeChip,
  hasParticipated,
  freeTransfers,
  pendingTransfers,
  savedPenaltyPoints,
  penaltyPerTransfer,
}: {
  activeChip?: FantasyChip | null;
  hasParticipated: boolean;
  freeTransfers: number;
  pendingTransfers: number;
  savedPenaltyPoints: number;
  penaltyPerTransfer: number;
}) {
  const unlimited = !hasParticipated || isUnlimitedTransferChip(activeChip);
  const freeTransfersUsed = unlimited
    ? 0
    : Math.min(pendingTransfers, freeTransfers);
  const additionalTransfersUsed = unlimited
    ? 0
    : Math.max(0, pendingTransfers - freeTransfers);
  const pendingPenaltyPoints = additionalTransfersUsed * penaltyPerTransfer;
  return {
    freeTransfersValue: unlimited ? "∞" : String(freeTransfers),
    freeTransfersUsed: !hasParticipated ? pendingTransfers : freeTransfersUsed,
    additionalTransfersUsed,
    pendingPenaltyPoints,
    totalPenaltyPoints: unlimited
      ? 0
      : savedPenaltyPoints + pendingPenaltyPoints,
  };
}
