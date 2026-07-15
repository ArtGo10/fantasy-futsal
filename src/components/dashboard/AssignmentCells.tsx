import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { POTS } from "../../constants";
import { styles } from "../../styles";
import type { AssignmentView } from "../../types";
import { formatTeamName } from "../../utils/names";
import { getAssignmentPoints } from "../../utils/scoring";
import type { PrizePlace } from "../../utils/standings";

function getPrizeCellStyle(prizePlace: PrizePlace | null) {
  if (prizePlace === "gold") return styles.playerTablePrizeGoldCell;
  if (prizePlace === "silver") return styles.playerTablePrizeSilverCell;
  if (prizePlace === "bronze") return styles.playerTablePrizeBronzeCell;

  return null;
}

export function AssignmentCells({
  assignments,
  cellStyle,
  pointsByTeamId,
  prizePlace = null,
  tournamentIsComplete = false,
}: {
  assignments: AssignmentView[];
  cellStyle?: StyleProp<ViewStyle>;
  pointsByTeamId: Map<string, number>;
  prizePlace?: PrizePlace | null;
  tournamentIsComplete?: boolean;
}) {
  return (
    <>
      {POTS.map((pot) => {
        const assignment = assignments.find((item) => item.pot === pot);
        const points = assignment ? getAssignmentPoints(assignment, pointsByTeamId) : 0;
        const prizeCellStyle = getPrizeCellStyle(prizePlace);

        return (
          <View
            key={pot}
            style={[
              styles.playerTableCell,
              styles.playerTableTeamCell,
              !assignment ? styles.playerTableCellEmpty : null,
              tournamentIsComplete
                ? prizeCellStyle
                : assignment
                  ? assignment.isEliminated
                    ? styles.playerTableTeamCellEliminated
                    : styles.playerTableTeamCellActive
                  : null,
              cellStyle,
            ]}
          >
            {assignment ? (
              <View style={styles.assignmentCellContent}>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.footballAssignmentText}>{formatTeamName(assignment.teamName)}</Text>
                </View>
                <View style={styles.assignmentPointsBox}>
                  <Text style={styles.assignmentPoints}>{points}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyCellText}>-</Text>
            )}
          </View>
        );
      })}
    </>
  );
}
