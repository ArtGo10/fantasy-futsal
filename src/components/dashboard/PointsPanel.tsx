import { View } from "react-native";

import { styles } from "../../styles";
import type { ParticipantView, TeamPointDetails } from "../../types";
import { ScoringDetailsPanel } from "./ScoringDetailsPanel";
import { ScoringRules } from "./ScoringRules";

export function PointsPanel({
  detailsByTeamId,
  participants,
}: {
  detailsByTeamId: Map<string, TeamPointDetails>;
  participants: ParticipantView[];
}) {
  return (
    <View style={styles.panel}>
      <ScoringRules />
      <ScoringDetailsPanel participants={participants} detailsByTeamId={detailsByTeamId} />
    </View>
  );
}
