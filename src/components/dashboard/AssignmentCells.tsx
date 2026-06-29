import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { POTS } from "../../constants";
import { styles } from "../../styles";
import type { AssignmentView } from "../../types";
import { formatTeamName } from "../../utils/names";
import { getAssignmentPoints } from "../../utils/scoring";

export function AssignmentCells({
  assignments,
  cellStyle,
  pointsByTeamId,
}: {
  assignments: AssignmentView[];
  cellStyle?: StyleProp<ViewStyle>;
  pointsByTeamId: Map<string, number>;
}) {
  return (
    <>
      {POTS.map((pot) => {
        const assignment = assignments.find((item) => item.pot === pot);
        const points = assignment ? getAssignmentPoints(assignment, pointsByTeamId) : 0;

        return (
          <View
            key={pot}
            style={[
              styles.playerTableCell,
              styles.playerTableTeamCell,
              assignment
                ? assignment.isEliminated
                  ? styles.playerTableTeamCellEliminated
                  : styles.playerTableTeamCellActive
                : null,
              !assignment ? styles.playerTableCellEmpty : null,
              cellStyle,
            ]}
          >
            {assignment ? (
              <View style={styles.assignmentCellContent}>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentText} numberOfLines={2}>
                    {formatTeamName(assignment.teamName)}
                  </Text>
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
