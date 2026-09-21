import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import {
  ArrowUpFromLine,
  ChevronRight,
  CircleStar,
  Ticket,
  WandSparkles,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  FANTASY_CHIPS,
  getChipSeasonPeriod,
  type ChipCalendarGameweek,
  type FantasyChip,
  type TeamChipView,
} from "../../../../convex/fantasyChips";
import { AppLoadingOverlay } from "../../../components/common/AppLoadingOverlay";
import { useI18n } from "../../../i18n/I18nProvider";
import type { TranslationKey } from "../../../i18n/translations";
import { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import { BottomSheet } from "./BottomSheet";
import {
  TransferSummaryMetrics,
  type TransferSummary,
} from "./TransferSummaryMetrics";

const icons = {
  benchBoost: ArrowUpFromLine,
  tripleCaptain: CircleStar,
  wildcard: WandSparkles,
  freeHit: Ticket,
};

export function TeamChipTokenRail({
  view,
  gameweeks,
  seasonSlug,
  onViewPlayedGameweek,
  onPlayed,
  transferSummary,
  hasUnsavedChanges,
  isSaving,
}: {
  view?: TeamChipView | null;
  gameweeks?: readonly ChipCalendarGameweek[];
  seasonSlug?: string;
  onViewPlayedGameweek?: (gameweekNumber: number) => void;
  onPlayed?: (chip: FantasyChip) => void;
  transferSummary?: TransferSummary;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}) {
  const { t, language } = useI18n();
  const theme = useFantasySeasonTheme();
  const playChip = useMutation(api.fantasy.playMyChip);
  const cancelChip = useMutation(api.fantasy.cancelMyChip);
  const [selected, setSelected] = useState<FantasyChip | null>(null);
  const [confirmation, setConfirmation] = useState<"play" | "cancel" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const [railWidth, setRailWidth] = useState<number | null>(null);
  const visibleChips = transferSummary
    ? FANTASY_CHIPS.filter((chip) => chip === "wildcard" || chip === "freeHit")
    : FANTASY_CHIPS;
  const compactTransfers = Boolean(
    transferSummary && (railWidth === null || railWidth < 480),
  );
  const narrowTransfers = Boolean(
    transferSummary && (railWidth === null || railWidth < 352),
  );
  const compactLabels =
    compactTransfers || (railWidth !== null && railWidth < 352);
  // Revalidate an open confirmation if the deadline passes while it is on screen.
  useEffect(() => {
    if (!selected) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [selected]);
  useEffect(() => {
    setSelected(null);
    setConfirmation(null);
    setError(null);
  }, [seasonSlug, view?.gameweekId]);

  const item = view?.items.find((row) => row.id === selected);
  const deadlinePassed = !view?.deadlineAt || now >= view.deadlineAt;
  const blocked = busy || isSaving || hasUnsavedChanges || deadlinePassed;
  const Icon = selected ? icons[selected] : CircleStar;
  const name = selected ? t(`team.overview.${selected}`) : "";
  const playedLabel = (number: number | null) =>
    t("team.chips.played").replace("{gw}", String(number ?? ""));
  const statusLabel = (row?: TeamChipView["items"][number]) =>
    row?.status === "active"
      ? t("team.chips.active")
      : row?.status === "played"
        ? playedLabel(row.gameweekNumber)
        : t("team.chips.play");
  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(timestamp);
  const period =
    (gameweeks?.length ? getChipSeasonPeriod(gameweeks, seasonSlug) : null) ??
    view ??
    getChipSeasonPeriod([], seasonSlug);
  const periodText =
    period?.secondHalfStartGameweek != null
      ? t("team.chips.period")
          .replaceAll("{end}", String(period.firstHalfEndGameweek))
          .replace("{start}", String(period.secondHalfStartGameweek))
          .replace("{last}", String(period.lastGameweek))
      : "";

  function open(chip: FantasyChip) {
    const row = view?.items.find((item) => item.id === chip);
    if (row?.status === "played") {
      if (row.gameweekNumber != null) {
        setSelected(null);
        setConfirmation(null);
        onViewPlayedGameweek?.(row.gameweekNumber);
      }
      return;
    }
    setNow(Date.now());
    setSelected(chip);
    setConfirmation(null);
    setError(null);
  }
  async function submit() {
    if (busyRef.current || blocked || !selected || !view || !confirmation)
      return;
    if (confirmation === "play" ? !item?.canPlay : !item?.canCancel) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const args = {
        chip: selected,
        seasonSlug,
        gameweekId: view.gameweekId as Id<"fantasyGameweeks">,
      };
      if (confirmation === "play") await playChip(args);
      else await cancelChip(args);
      setSelected(null);
      setConfirmation(null);
      if (confirmation === "play") onPlayed?.(selected);
    } catch (caught) {
      const code =
        caught instanceof ConvexError && typeof caught.data === "string"
          ? caught.data
          : "";
      const reason = [
        "deadline",
        "used",
        "anotherChip",
        "consecutiveFreeHit",
        "missingBaseline",
        "incompleteSquad",
        "cannotCancel",
      ].find((key) => code === `chips.${key}`);
      setError(
        t(
          reason
            ? (`team.chips.${reason}` as TranslationKey)
            : "team.chips.failed",
        ),
      );
      setConfirmation(null);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const hint = !view
    ? t("team.chips.unavailable")
    : hasUnsavedChanges
      ? t("team.chips.saveFirst")
      : deadlinePassed
        ? t("team.chips.deadline")
        : item?.status === "available" && item.unavailableReason
          ? t(`team.chips.${item.unavailableReason}` as TranslationKey)
          : null;

  return (
    <>
      <View
        onLayout={(event) => setRailWidth(event.nativeEvent.layout.width)}
        style={[
          styles.teamChipTokenRail,
          local.rail,
          transferSummary && local.transferRail,
        ]}
      >
        {transferSummary ? (
          <TransferSummaryMetrics
            summary={transferSummary}
            compact={compactTransfers}
            narrow={narrowTransfers}
          />
        ) : null}
        {visibleChips.map((chip) => {
          const row = view?.items.find((item) => item.id === chip);
          const ChipIcon = icons[chip];
          const active = row?.status === "active";
          const played = row?.status === "played";
          const actionDisabled =
            busy ||
            isSaving ||
            (played && (!onViewPlayedGameweek || row.gameweekNumber == null));
          return (
            <Pressable
              key={chip}
              accessibilityRole="button"
              accessibilityLabel={`${t(`team.overview.${chip}`)}, ${statusLabel(row)}`}
              accessibilityState={{ disabled: actionDisabled }}
              onPress={() => open(chip)}
              disabled={actionDisabled}
              style={({ pressed }) => [
                styles.teamChipTokenCard,
                local.card,
                compactTransfers && local.compactCard,
                active && {
                  backgroundColor: theme.softColor,
                  borderColor: theme.primaryColor,
                },
                played && local.played,
                pressed && local.pressed,
                actionDisabled && local.disabled,
              ]}
            >
              <ChipIcon
                size={compactTransfers ? 16 : 20}
                color={played ? colors.text.muted : theme.primaryColor}
              />
              <View
                style={[
                  local.titleSlot,
                  compactTransfers && local.compactTitleSlot,
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[
                    styles.teamChipTokenTitle,
                    local.title,
                    compactTransfers && local.compactTitle,
                  ]}
                >
                  {t(`team.overview.${chip}`)}
                </Text>
              </View>
              <View
                style={[
                  local.statusSlot,
                  compactTransfers && local.compactStatusSlot,
                ]}
              >
                <View
                  style={[
                    local.cardAction,
                    compactTransfers && local.compactCardAction,
                    {
                      backgroundColor: played
                        ? "transparent"
                        : active
                          ? theme.softColor
                          : theme.primaryColor,
                    },
                    played && local.historyAction,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.teamChipTokenStatus,
                      local.status,
                      compactTransfers && local.compactStatus,
                      played && local.historyStatus,
                      played && compactLabels && local.compactHistoryStatus,
                      {
                        color:
                          played || active
                            ? theme.primaryColor
                            : colors.text.inverse,
                      },
                    ]}
                  >
                    {played
                      ? t(
                          narrowTransfers
                            ? "team.chips.playedNarrow"
                            : "team.chips.playedShort",
                        ).replace("{gw}", String(row.gameweekNumber ?? ""))
                      : statusLabel(row)}
                  </Text>
                  {played ? (
                    <ChevronRight
                      size={compactTransfers ? 6 : 8}
                      color={theme.primaryColor}
                      style={local.historyArrow}
                    />
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      <BottomSheet
        visible={selected !== null}
        onClose={() => {
          if (!busyRef.current) setSelected(null);
        }}
        sheetStyle={local.sheet}
        contentScrollEnabled={false}
      >
        <ScrollView
          style={local.body}
          contentContainerStyle={local.content}
          bounces={false}
        >
          <Icon size={48} color={theme.primaryColor} strokeWidth={1.8} />
          <Text accessibilityRole="header" style={local.heading}>
            {name}
          </Text>
          {confirmation ? (
            <>
              <Text style={local.description}>
                {t(
                  confirmation === "play"
                    ? "team.chips.confirmPlay"
                    : "team.chips.confirmCancel",
                )
                  .replace("{chip}", name)
                  .replace("{gw}", String(view?.gameweekNumber ?? ""))}
              </Text>
              <Text style={local.description}>
                {selected ? t(`team.chips.${selected}Cancel`) : ""}
              </Text>
            </>
          ) : (
            <>
              <Text style={local.description}>
                {selected ? t(`team.chips.${selected}Description`) : ""}
              </Text>
              <Text style={local.description}>
                {selected ? t(`team.chips.${selected}Cancel`) : ""}
              </Text>
              <Text style={local.description}>
                {t("team.chips.seasonAllowance")}
              </Text>
              {periodText ? (
                <Text style={local.description}>{periodText}</Text>
              ) : null}
              {period?.firstHalfDeadlineAt != null &&
              period.secondHalfStartGameweek != null ? (
                <Text style={local.description}>
                  {t("team.chips.resetDate").replace(
                    "{date}",
                    formatDate(period.firstHalfDeadlineAt),
                  )}
                </Text>
              ) : null}
              <Text style={local.description}>
                {t("team.chips.onePerWeek")}
              </Text>
              {item?.status === "active" && !item.canCancel ? (
                <Text style={local.note}>{t("team.chips.cannotCancel")}</Text>
              ) : null}
            </>
          )}
          {hint ? (
            <Text accessibilityLiveRegion="polite" style={local.note}>
              {hint}
            </Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={local.error}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <View style={local.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={
              blocked ||
              (confirmation === "cancel" ? !item?.canCancel : !item?.canPlay)
            }
            onPress={() =>
              confirmation ? void submit() : setConfirmation("play")
            }
            style={[
              local.button,
              { backgroundColor: theme.primaryColor },
              (blocked ||
                (confirmation === "cancel"
                  ? !item?.canCancel
                  : !item?.canPlay)) &&
                local.disabled,
            ]}
          >
            <Text style={local.buttonText}>
              {confirmation ? t("team.chips.confirm") : statusLabel(item)}
            </Text>
          </Pressable>
          {confirmation ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setConfirmation(null);
                setError(null);
              }}
              style={local.secondaryButton}
            >
              <Text
                style={[local.secondaryText, { color: theme.primaryColor }]}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
          ) : item?.canCancel ? (
            <Pressable
              accessibilityRole="button"
              disabled={blocked}
              onPress={() => setConfirmation("cancel")}
              style={[local.secondaryButton, blocked && local.disabled]}
            >
              <Text
                style={[local.secondaryText, { color: theme.primaryColor }]}
              >
                {t("team.chips.cancel")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheet>
      {busy ? <AppLoadingOverlay fullScreen /> : null}
    </>
  );
}

const local = StyleSheet.create({
  rail: {
    maxWidth: 560,
    alignSelf: "center",
    marginHorizontal: "auto",
    flexShrink: 0,
  },
  transferRail: { maxWidth: 760 },
  card: {
    height: 92,
    borderRadius: 8,
    paddingHorizontal: 1,
    paddingVertical: 8,
    gap: 4,
  },
  compactCard: { height: 72, paddingVertical: 6, gap: 3 },
  titleSlot: { height: 24, alignSelf: "stretch", justifyContent: "center" },
  compactTitleSlot: { height: 20 },
  title: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    paddingHorizontal: 0,
  },
  compactTitle: { fontSize: 9, lineHeight: 10 },
  statusSlot: {
    height: 20,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  compactStatusSlot: { height: 16 },
  cardAction: {
    minHeight: 20,
    maxWidth: "100%",
    flexShrink: 0,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  compactCardAction: {
    minHeight: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  status: { fontSize: 10, lineHeight: 14, flexShrink: 1 },
  compactStatus: { fontSize: 9, lineHeight: 12 },
  historyStatus: { fontSize: 10, lineHeight: 12, fontWeight: "600" },
  compactHistoryStatus: { fontSize: 8, lineHeight: 12 },
  historyAction: {
    flexDirection: "row",
    gap: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
  },
  historyArrow: { flexShrink: 0 },
  played: { backgroundColor: colors.surfaceSubtle },
  pressed: { opacity: 0.75 },
  sheet: { maxWidth: 600, alignSelf: "center" },
  body: { flexShrink: 1, minHeight: 0, width: "100%" },
  content: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.text.primary,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
    textAlign: "center",
    alignSelf: "stretch",
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.muted,
    textAlign: "center",
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.state.danger,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    flexShrink: 0,
    gap: 8,
    marginTop: 4,
  },
  button: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  secondaryText: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  disabled: { opacity: 0.45 },
});
