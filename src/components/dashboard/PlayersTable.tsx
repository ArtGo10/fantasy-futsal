import { ScrollView, Text, View } from "react-native";

import { POTS } from "../../constants";
import { styles } from "../../styles";
import type { ParticipantView } from "../../types";
import { formatParticipantName } from "../../utils/names";
import { getParticipantTotalPoints } from "../../utils/scoring";
import { AssignmentCells } from "./AssignmentCells";

export function PlayersTable({
  participants,
  pointsByTeamId,
}: {
  participants: ParticipantView[];
  pointsByTeamId: Map<string, number>;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.playerTable}>
        <View style={styles.playerTableFrozenLayout}>
          <View style={styles.playerTablePinnedColumn}>
            <View
              style={[
                styles.playerTableRow,
                styles.playerTableHeaderRow,
                styles.playerTableHeaderFixedRow,
              ]}
            >
              <View
                style={[
                  styles.playerTableCell,
                  styles.playerTableNameCell,
                  styles.playerTablePinnedNameCell,
                  styles.playerTableHeaderCell,
                ]}
              >
                <Text style={styles.playerTableHeaderText}>Игрок</Text>
              </View>
            </View>

            {participants.map((participant) => {
              const hasAssignments = participant.assignments.length > 0;
              const hasActiveTeam = participant.assignments.some((assignment) => !assignment.isEliminated);
              const playerStatusCellStyle = hasAssignments
                ? hasActiveTeam
                  ? styles.playerTableStatusCellActive
                  : styles.playerTableStatusCellEliminated
                : null;

              return (
                <View
                  key={participant.id}
                  style={[styles.playerTableRow, styles.playerTableDataRow]}
                >
                  <View
                    style={[
                      styles.playerTableCell,
                      styles.playerTableNameCell,
                      styles.playerTablePinnedNameCell,
                      styles.playerTableDataCell,
                      playerStatusCellStyle,
                    ]}
                  >
                    <Text style={styles.playerName} numberOfLines={2}>
                      {formatParticipantName(participant.name)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.playerTableScrollableColumn}
            contentContainerStyle={styles.playerTableScrollableContent}
          >
            <View style={styles.playerTableScrollableRows}>
              <View style={[styles.playerTableRow, styles.playerTableHeaderRow, styles.playerTableHeaderFixedRow]}>
                {POTS.map((pot) => (
                  <View
                    key={pot}
                    style={[
                      styles.playerTableCell,
                      styles.playerTableTeamCell,
                      styles.playerTableHeaderCell,
                    ]}
                  >
                    <Text style={styles.playerTableHeaderText}>Команда</Text>
                  </View>
                ))}
              </View>

              {participants.map((participant) => (
                <View key={participant.id} style={[styles.playerTableRow, styles.playerTableDataRow]}>
                  <AssignmentCells
                    assignments={participant.assignments}
                    cellStyle={styles.playerTableDataCell}
                    pointsByTeamId={pointsByTeamId}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.playerTablePinnedColumn}>
            <View
              style={[
                styles.playerTableRow,
                styles.playerTableHeaderRow,
                styles.playerTableHeaderFixedRow,
              ]}
            >
              <View
                style={[
                  styles.playerTableCell,
                  styles.playerTableTotalCell,
                  styles.playerTablePinnedTotalCell,
                  styles.playerTableHeaderCell,
                ]}
              >
                <Text style={styles.playerTableHeaderText}>Всего</Text>
              </View>
            </View>

            {participants.map((participant) => {
              const totalPoints = getParticipantTotalPoints(participant, pointsByTeamId);
              const hasAssignments = participant.assignments.length > 0;
              const hasActiveTeam = participant.assignments.some((assignment) => !assignment.isEliminated);
              const playerStatusCellStyle = hasAssignments
                ? hasActiveTeam
                  ? styles.playerTableStatusCellActive
                  : styles.playerTableStatusCellEliminated
                : null;

              return (
                <View
                  key={participant.id}
                  style={[styles.playerTableRow, styles.playerTableDataRow]}
                >
                  <View
                    style={[
                      styles.playerTableCell,
                      styles.playerTableTotalCell,
                      styles.playerTablePinnedTotalCell,
                      styles.playerTableDataCell,
                      playerStatusCellStyle,
                    ]}
                  >
                    <Text style={styles.playerTotalPoints}>{totalPoints}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
