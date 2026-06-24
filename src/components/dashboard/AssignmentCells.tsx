import { Text, View } from "react-native";

import { POTS } from "../../constants";
import { styles } from "../../styles";
import type { AssignmentView } from "../../types";
import { getAssignmentPoints } from "../../utils/scoring";

export function AssignmentCells({
  assignments,
  pointsByTeamId,
}: {
  assignments: AssignmentView[];
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
            ]}
          >
            {assignment ? (
              <View style={styles.assignmentCellContent}>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentText} numberOfLines={2}>
                    {assignment.teamName}
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
