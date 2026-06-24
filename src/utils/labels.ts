import type { MatchStage, TeamStage } from "../types";

export const MATCH_STAGE_LABELS: Record<MatchStage, string> = {
  group: "Группа",
  round_of_32: "1/16 финала",
  round_of_16: "1/8 финала",
  quarter_final: "1/4 финала",
  semi_final: "Полуфинал",
  third_place: "Матч за 3-е место",
  final: "Финал",
};

export const TEAM_STAGE_LABELS: Record<TeamStage, string> = {
  group: "Группа",
  round_of_32: "1/16 финала",
  round_of_16: "1/8 финала",
  quarter_final: "1/4 финала",
  semi_final: "Полуфинал",
  final: "Финал",
  champion: "Чемпион",
};
