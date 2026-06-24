import { Pressable, Text, View } from "react-native";

import { styles } from "../../styles";
import type { AssignmentView, DashboardView } from "../../types";

export function DrawSetupPanel({
  currentAssignments,
  dashboard,
  drawIsLocked,
  drawLockText,
  errorText,
  isBusy,
  isViewer,
  maxUserAssignments,
  onSeedTeams,
  remainingTeamCount,
  statusText,
}: {
  currentAssignments: AssignmentView[];
  dashboard: DashboardView;
  drawIsLocked: boolean;
  drawLockText: string;
  errorText: string | null;
  isBusy: boolean;
  isViewer: boolean;
  maxUserAssignments: number;
  onSeedTeams: () => void;
  remainingTeamCount: number;
  statusText: string | null;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Игроки</Text>
          <Text style={styles.metric}>
            {dashboard.participantCount}/{dashboard.maxParticipants}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Зрители</Text>
          <Text style={styles.metric}>{dashboard.spectatorCount}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Свободные команды</Text>
          <Text style={styles.metric}>
            {remainingTeamCount}/{dashboard.totalTeams}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>{isViewer ? "Моя роль" : "Мой выбор"}</Text>
          <Text style={styles.metric}>{isViewer ? "Зритель" : `${currentAssignments.length}/${maxUserAssignments}`}</Text>
        </View>
      </View>

      {!dashboard.currentUser ? (
        <Text style={styles.errorText}>Ваш профиль ещё создаётся.</Text>
      ) : isViewer ? (
        <Text style={styles.mutedText}>
          Все {dashboard.maxParticipants} мест игроков уже заняты. Вы можете смотреть таблицу, но выбор команд для этого
          аккаунта закрыт.
        </Text>
      ) : drawIsLocked ? (
        <Text style={styles.mutedText}>{drawLockText}</Text>
      ) : null}

      {!dashboard.teamsReady ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Команды ещё не загружены.</Text>
          {dashboard.currentUser?.isAdmin ? (
            <Pressable
              style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]}
              disabled={isBusy}
              onPress={onSeedTeams}
            >
              <Text style={styles.secondaryButtonText}>Загрузить команды</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {statusText ? <Text style={styles.successText}>{statusText}</Text> : null}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
}
