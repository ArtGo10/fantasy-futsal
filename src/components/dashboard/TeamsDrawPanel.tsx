import { Pressable, Text, View } from "react-native";

import { styles } from "../../styles";
import type { AssignmentView, DashboardView, Pot } from "../../types";
import { formatParticipantName } from "../../utils/names";

export function TeamsDrawPanel({
  currentAssignments,
  dashboard,
  drawCountdownText,
  drawIsLocked,
  isBusy,
  onDraw,
}: {
  currentAssignments: AssignmentView[];
  dashboard: DashboardView;
  drawCountdownText: string;
  drawIsLocked: boolean;
  isBusy: boolean;
  onDraw: (pot: Pot) => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Команды</Text>
      <View style={styles.teamColumns}>
        {dashboard.teamsByPot.map((pot) => {
          const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot.pot);
          const canDrawPot = Boolean(
            !drawIsLocked &&
              dashboard.currentUser?.isParticipant &&
              dashboard.teamsReady &&
              !alreadyDrawn &&
              pot.remaining > 0 &&
              !isBusy,
          );

          return (
            <View key={pot.pot} style={styles.teamColumn}>
              <View style={styles.teamColumnHeader}>
                <Text style={styles.label}>Корзина {pot.pot}</Text>
                <Text style={styles.potCount}>
                  {pot.remaining}/{pot.total}
                </Text>
              </View>

              <View style={styles.teamList}>
                {pot.teams.map((team) => (
                  <View
                    key={team.id}
                    style={[
                      styles.teamRow,
                      team.isEliminated ? styles.teamRowEliminated : styles.teamRowActive,
                      team.assignedTo ? styles.teamRowAssigned : null,
                    ]}
                  >
                    <Text
                      style={[
                        team.assignedTo ? styles.teamNameAssigned : styles.teamName,
                        team.isEliminated ? styles.teamNameEliminated : styles.teamNameActive,
                      ]}
                    >
                      {team.name}
                    </Text>
                    {team.assignedTo ? (
                      <Text style={styles.teamOwner}>
                        {team.assignedTo.participantNumber ? `#${team.assignedTo.participantNumber} ` : ""}
                        {formatParticipantName(team.assignedTo.name)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.primaryButton, !canDrawPot ? styles.buttonDisabled : null]}
                disabled={!canDrawPot}
                onPress={() => onDraw(pot.pot)}
              >
                <Text style={styles.primaryButtonText}>
                  {alreadyDrawn ? "Выбрано" : drawIsLocked ? drawCountdownText : isBusy ? "Выбираем..." : "Вытащить"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
