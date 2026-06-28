import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { styles } from "../../styles";
import type { ParticipantView, TeamPointDetails } from "../../types";
import { formatParticipantName } from "../../utils/names";
import { getTeamStageBonus } from "../../utils/scoring";

export function ScoringDetailsPanel({
  participants,
  detailsByTeamId,
}: {
  participants: ParticipantView[];
  detailsByTeamId: Map<string, TeamPointDetails>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const participantsWithAssignments = useMemo(
    () => participants.filter((participant) => participant.assignments.length > 0),
    [participants],
  );

  useEffect(() => {
    if (activeIndex < participantsWithAssignments.length) return;
    setActiveIndex(Math.max(0, participantsWithAssignments.length - 1));
  }, [activeIndex, participantsWithAssignments.length]);

  if (participantsWithAssignments.length === 0) return null;

  const activeParticipant = participantsWithAssignments[activeIndex] ?? participantsWithAssignments[0];
  const activeParticipantTotal = activeParticipant.assignments.reduce((total, assignment) => {
    const details = detailsByTeamId.get(assignment.teamId);
    return total + (details?.total ?? getTeamStageBonus(assignment.stageReached));
  }, 0);
  const canSwitchPlayers = participantsWithAssignments.length > 1;
  const goToPreviousPlayer = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? participantsWithAssignments.length - 1 : currentIndex - 1,
    );
  };
  const goToNextPlayer = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % participantsWithAssignments.length);
  };

  return (
    <View style={styles.pointsDetails}>
      <Text style={styles.scoringRulesTitle}>Детализация очков</Text>

      <View style={styles.pointsSliderHeader}>
        <Pressable
          style={[styles.pointsSliderButton, !canSwitchPlayers ? styles.pointsSliderButtonDisabled : null]}
          disabled={!canSwitchPlayers}
          onPress={goToPreviousPlayer}
        >
          <Text style={styles.pointsSliderButtonText}>‹</Text>
        </Pressable>

        <View style={styles.pointsSliderPlayerInfo}>
          <Text style={styles.pointsDetailsPlayerName}>
            {formatParticipantName(activeParticipant.name)} - {activeParticipantTotal}
          </Text>
        </View>

        <Pressable
          style={[styles.pointsSliderButton, !canSwitchPlayers ? styles.pointsSliderButtonDisabled : null]}
          disabled={!canSwitchPlayers}
          onPress={goToNextPlayer}
        >
          <Text style={styles.pointsSliderButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.pointsDetailsPlayer}>
        <View style={styles.pointsDetailsTeamList}>
          {activeParticipant.assignments.map((assignment) => {
            const details = detailsByTeamId.get(assignment.teamId) ?? {
              matchPoints: 0,
              stageBonus: 0,
              specialBonus: 0,
              total: getTeamStageBonus(assignment.stageReached),
              lines: [],
            };

            return (
              <View key={assignment.id} style={styles.pointsDetailsTeam}>
                <View style={styles.pointsDetailsInfo}>
                  <Text style={styles.pointsDetailsTeamName}>{assignment.teamName}</Text>
                  {details.lines.length > 0 ? (
                    <View style={styles.pointsDetailsLineList}>
                      {details.lines.map((line, index) => (
                        <Text key={`${assignment.id}-${index}`} style={styles.pointsDetailsText}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.pointsDetailsText}>Без очков</Text>
                  )}
                </View>
                <View style={styles.pointsDetailsTotalBox}>
                  <Text style={styles.pointsDetailsTotal}>{details.total}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
