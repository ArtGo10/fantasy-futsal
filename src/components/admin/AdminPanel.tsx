import { useAction } from "convex/react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import { styles } from "../../styles";
import type { SyncStatusView } from "../../types";
import { getErrorMessage } from "../../utils/auth";
import { formatDateTime } from "../../utils/dates";

export function AdminPanel({ syncStatus }: { syncStatus: SyncStatusView | undefined }) {
  const runEspnSync = useAction(api.matches.syncFromEspn);

  const [adminBusy, setAdminBusy] = useState(false);
  const [adminStatusText, setAdminStatusText] = useState<string | null>(null);
  const [adminErrorText, setAdminErrorText] = useState<string | null>(null);

  const handleRunSync = async () => {
    try {
      setAdminBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      const result = await runEspnSync({});
      const matched = typeof result.matched === "number" ? result.matched : 0;
      const updated = typeof result.updated === "number" ? result.updated : 0;
      const unmatched = Array.isArray(result.unmatched) ? result.unmatched.length : 0;
      setAdminStatusText(`ESPN sync: найдено ${matched}, обновлено ${updated}, не сопоставлено ${unmatched}.`);
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const latestSync = syncStatus?.latest;

  return (
    <View style={[styles.panel, styles.adminPanel]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Админ-панель</Text>
        <Text style={styles.adminBadge}>Игрок №1</Text>
      </View>

      <View style={styles.adminBlock}>
        <Text style={styles.adminBlockTitle}>Синхронизация ESPN</Text>
        <Text style={styles.mutedText}>
          {latestSync
            ? `${latestSync.ok ? "OK" : "Ошибка"} · ${formatDateTime(latestSync.createdAt)} · найдено ${latestSync.matched ?? 0}/${latestSync.normalized ?? 0}`
            : "Синхронизаций ещё не было."}
        </Text>
        {latestSync?.error ? <Text style={styles.errorText}>{latestSync.error}</Text> : null}
        <Text style={styles.mutedText}>
          Матчи: {syncStatus?.matches.completed ?? 0} завершено, {syncStatus?.matches.live ?? 0} live,{" "}
          {syncStatus?.matches.scheduled ?? 0} ожидают.
        </Text>
        <Pressable
          style={[styles.secondaryButton, adminBusy ? styles.buttonDisabled : null]}
          disabled={adminBusy}
          onPress={handleRunSync}
        >
          <Text style={styles.secondaryButtonText}>Запустить ESPN sync</Text>
        </Pressable>
      </View>

      {adminStatusText ? <Text style={styles.successText}>{adminStatusText}</Text> : null}
      {adminErrorText ? <Text style={styles.errorText}>{adminErrorText}</Text> : null}
    </View>
  );
}
