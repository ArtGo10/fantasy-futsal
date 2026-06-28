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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.playerTableScrollContent}
      >
        <View style={styles.playerTable}>
          <View style={[styles.playerTableRow, styles.playerTableHeaderRow]}>
            <View style={[styles.playerTableCell, styles.playerTableNameCell]}>
              <Text style={styles.playerTableHeaderText}>Игрок</Text>
            </View>
            {POTS.map((pot) => (
              <View key={pot} style={[styles.playerTableCell, styles.playerTableTeamCell]}>
                <Text style={styles.playerTableHeaderText}>Команда</Text>
              </View>
            ))}
            <View style={[styles.playerTableCell, styles.playerTableTotalCell]}>
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
              <View key={participant.id} style={styles.playerTableRow}>
                <View style={[styles.playerTableCell, styles.playerTableNameCell, playerStatusCellStyle]}>
                  <Text style={styles.playerName} numberOfLines={2}>
                    {formatParticipantName(participant.name)}
                  </Text>
                </View>
                <AssignmentCells assignments={participant.assignments} pointsByTeamId={pointsByTeamId} />
                <View style={[styles.playerTableCell, styles.playerTableTotalCell, playerStatusCellStyle]}>
                  <Text style={styles.playerTotalPoints}>{totalPoints}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
