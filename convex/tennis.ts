import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, isAdminUser } from "./authHelpers";
import {
  matchStatusValidator,
  TENNIS_COMPETITORS_PER_POT,
  TENNIS_MAX_PARTICIPANTS,
  TENNIS_POTS,
  tennisPotValidator,
  tennisStageValidator,
  tennisTourValidator,
} from "./validators";
import type { TennisPot, TennisStage, TennisTour } from "./validators";
import { v } from "convex/values";

type TournamentSlug = "wimbledon_atp_2026" | "wimbledon_wta_2026";
type TournamentConfig = {
  slug: TournamentSlug;
  title: string;
  tour: TennisTour;
  providerEventId: string;
  groupingSlug: "mens-singles" | "womens-singles";
  wikipediaTitle: string;
  year: number;
};
type NormalizedCompetitor = {
  espnAthleteId: string;
  name: string;
  shortName?: string;
  country?: string;
  flagUrl?: string;
  seed?: number;
  ranking?: number;
  rankingPoints?: number;
  entryOrder: number;
  sortOrder: number;
};
type NormalizedMatch = {
  espnCompetitionId: string;
  roundName: string;
  roundOrder: number;
  bracketOrder: number;
  scheduledAt: number;
  court?: string;
  player1EspnAthleteId?: string;
  player2EspnAthleteId?: string;
  player1Name: string;
  player2Name: string;
  player1SetScores: number[];
  player2SetScores: number[];
  winnerEspnAthleteId?: string;
  status: "scheduled" | "live" | "completed";
  espnStatus?: string;
  note?: string;
};
type TennisScoringRule = {
  stage: TennisStage;
  label: string;
  points: number;
  increment: number;
};
type TennisAssignmentView = {
  id: Id<"tennisAssignments">;
  pot: TennisPot;
  competitorId: Id<"tennisCompetitors">;
  competitorName: string;
  competitorCountry: string | null;
  competitorFlagUrl: string | null;
  stageReached: TennisStage;
  points: number;
  isEliminated: boolean;
  createdAt: number;
};

const ESPN_SITE_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/tennis";
const ESPN_CORE_BASE_URL = "https://sports.core.api.espn.com/v2/sports/tennis";
const TENNIS_TOURNAMENTS: Record<TournamentSlug, TournamentConfig> = {
  wimbledon_atp_2026: {
    slug: "wimbledon_atp_2026",
    title: "Wimbledon ATP",
    tour: "atp",
    providerEventId: "188-2026",
    groupingSlug: "mens-singles",
    wikipediaTitle: "2026 Wimbledon Championships – Men's singles",
    year: 2026,
  },
  wimbledon_wta_2026: {
    slug: "wimbledon_wta_2026",
    title: "Wimbledon WTA",
    tour: "wta",
    providerEventId: "188-2026",
    groupingSlug: "womens-singles",
    wikipediaTitle: "2026 Wimbledon Championships – Women's singles",
    year: 2026,
  },
};
const TENNIS_STAGE_ORDER: TennisStage[] = [
  "round_of_128",
  "round_of_64",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
  "champion",
];
const TENNIS_SCORING_VERSION = "wimbledon-balanced-v3";
const TENNIS_SCORING_DESCRIPTION =
  "Очки начисляются только за достигнутую стадию. Победа в матче равна проходу дальше, поэтому отдельных очков за матч нет.";
const TENNIS_SCORING_RULES: TennisScoringRule[] = [
  { stage: "round_of_64", label: "1/32", points: 2, increment: 2 },
  { stage: "round_of_32", label: "1/16", points: 5, increment: 3 },
  { stage: "round_of_16", label: "1/8", points: 9, increment: 4 },
  { stage: "quarter_final", label: "1/4", points: 14, increment: 5 },
  { stage: "semi_final", label: "1/2", points: 20, increment: 6 },
  { stage: "final", label: "Финал", points: 27, increment: 7 },
  { stage: "champion", label: "Чемпион", points: 35, increment: 8 },
];
const ROUND_TO_STAGE: Record<string, { current: TennisStage; next: TennisStage; order: number }> = {
  "Round 1": { current: "round_of_128", next: "round_of_64", order: 1 },
  "Round 2": { current: "round_of_64", next: "round_of_32", order: 2 },
  "Round 3": { current: "round_of_32", next: "round_of_16", order: 3 },
  "Round 4": { current: "round_of_16", next: "quarter_final", order: 4 },
  Quarterfinal: { current: "quarter_final", next: "semi_final", order: 5 },
  Semifinal: { current: "semi_final", next: "final", order: 6 },
  Final: { current: "final", next: "champion", order: 7 },
};
const tournamentSlugValidator = v.union(
  v.literal("wimbledon_atp_2026"),
  v.literal("wimbledon_wta_2026"),
);
const optionalNumberValidator = v.optional(v.number());
const normalizedCompetitorValidator = v.object({
  espnAthleteId: v.string(),
  name: v.string(),
  shortName: v.optional(v.string()),
  country: v.optional(v.string()),
  flagUrl: v.optional(v.string()),
  seed: optionalNumberValidator,
  ranking: optionalNumberValidator,
  rankingPoints: optionalNumberValidator,
  entryOrder: v.number(),
  sortOrder: v.number(),
});
const normalizedMatchValidator = v.object({
  espnCompetitionId: v.string(),
  roundName: v.string(),
  roundOrder: v.number(),
  bracketOrder: v.number(),
  scheduledAt: v.number(),
  court: v.optional(v.string()),
  player1EspnAthleteId: v.optional(v.string()),
  player2EspnAthleteId: v.optional(v.string()),
  player1Name: v.string(),
  player2Name: v.string(),
  player1SetScores: v.array(v.number()),
  player2SetScores: v.array(v.number()),
  winnerEspnAthleteId: v.optional(v.string()),
  status: matchStatusValidator,
  espnStatus: v.optional(v.string()),
  note: v.optional(v.string()),
});

function getTournamentConfig(slug: TournamentSlug) {
  return TENNIS_TOURNAMENTS[slug];
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isObject(value: Record<string, unknown> | null): value is Record<string, unknown> {
  return value !== null;
}

function getObjectArray(value: unknown) {
  return Array.isArray(value) ? value.map(getObject).filter(isObject) : [];
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const NAME_TRANSLITERATION_OVERRIDES: Record<string, string> = {
  alex: "Алекс",
  alexander: "Александр",
  alcaraz: "Алькарас",
  alejandro: "Алехандро",
  andreeva: "Андреева",
  andrey: "Андрей",
  arthur: "Артур",
  atmane: "Атман",
  aryna: "Арина",
  auger: "Оже",
  badosa: "Бадоса",
  barbora: "Барбора",
  basing: "Бейсинг",
  beatriz: "Беатрис",
  ben: "Бен",
  berrettini: "Берреттини",
  borges: "Боргеш",
  bublik: "Бублик",
  buse: "Бузе",
  cameron: "Кэмерон",
  carlos: "Карлос",
  casper: "Каспер",
  cerundolo: "Серундоло",
  coco: "Коко",
  cobolli: "Коболли",
  collignon: "Коллиньон",
  corentin: "Корантен",
  daniil: "Даниил",
  daria: "Дарья",
  darderi: "Дардери",
  davidovich: "Давидович",
  de: "де",
  denis: "Денис",
  dimitrov: "Димитров",
  djokovic: "Джокович",
  draper: "Дрэйпер",
  ekaterina: "Екатерина",
  elena: "Елена",
  elina: "Элина",
  etcheverry: "Этчеверри",
  felix: "Феликс",
  fearnley: "Фирнли",
  fernandez: "Фернандес",
  fils: "Фис",
  flavio: "Флавио",
  fokina: "Фокина",
  fonseca: "Фонсека",
  frances: "Фрэнсис",
  francisco: "Франсиско",
  fritz: "Фриц",
  gael: "Гаэль",
  gauff: "Гауфф",
  gill: "Гилл",
  griekspoor: "Грикспор",
  haddad: "Хаддад",
  harry: "Харри",
  holger: "Хольгер",
  humbert: "Эмбер",
  hurkacz: "Хуркач",
  iga: "Ига",
  ignacio: "Игнасио",
  jack: "Джек",
  jacob: "Джейкоб",
  jannik: "Янник",
  jasmine: "Жасмин",
  jaume: "Хауме",
  jessica: "Джессика",
  jiri: "Иржи",
  joao: "Жуан",
  jodar: "Джодар",
  juan: "Хуан",
  jakub: "Якуб",
  karen: "Карен",
  karolina: "Каролина",
  kasatkina: "Касаткина",
  kecmanovic: "Кецманович",
  keys: "Киз",
  khachanov: "Хачанов",
  kokkinakis: "Коккинакис",
  krejcikova: "Крейчикова",
  kudermetova: "Кудерметова",
  learner: "Лернер",
  lehecka: "Легечка",
  lorenzo: "Лоренцо",
  luciano: "Лучано",
  madison: "Мэдисон",
  majchrzak: "Майхшак",
  maia: "Майя",
  manuel: "Мануэль",
  martin: "Мартин",
  matteo: "Маттео",
  max: "Макс",
  medvedev: "Медведев",
  mensik: "Меншик",
  mertens: "Мертенс",
  minaur: "Минаур",
  mirra: "Мирра",
  mochizuki: "Мотидзуки",
  moutet: "Муте",
  muchova: "Мухова",
  munar: "Мунар",
  musetti: "Музетти",
  nakashima: "Накашима",
  nadal: "Надаль",
  navarro: "Наварро",
  navone: "Навоне",
  norrie: "Норри",
  noskova: "Носкова",
  novak: "Новак",
  ostapenko: "Остапенко",
  paolini: "Паолини",
  paul: "Пол",
  paula: "Паула",
  pegula: "Пегула",
  qinwen: "Циньвэнь",
  rafael: "Рафаэль",
  rinderknech: "Риндеркнех",
  rublev: "Рублёв",
  rune: "Руне",
  ruud: "Рууд",
  rybakina: "Рыбакина",
  sabalenka: "Сабаленка",
  sascha: "Саша",
  samsonova: "Самсонова",
  sebastian: "Себастьян",
  shapovalov: "Шаповалов",
  shelton: "Шелтон",
  shintaro: "Синтаро",
  shnaider: "Шнайдер",
  sinner: "Синнер",
  stefanos: "Стефанос",
  svitolina: "Свитолина",
  swiatek: "Швёнтек",
  tabilo: "Табило",
  tallon: "Таллон",
  taylor: "Тейлор",
  terence: "Теренс",
  thanasi: "Танаси",
  tiafoe: "Тиафо",
  tien: "Тьен",
  tommy: "Томми",
  tomas: "Томас",
  tsitsipas: "Циципас",
  ugo: "Уго",
  veronika: "Вероника",
  vondrousova: "Вондроушова",
  wendelken: "Венделкен",
  zandschulp: "Зандсхюлп",
  zheng: "Чжэн",
  zverev: "Зверев",
  zizou: "Зизу",
};

const LATIN_TO_RUSSIAN_RULES: Array<[string, string]> = [
  ["tch", "ч"],
  ["sch", "ш"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["zh", "ж"],
  ["kh", "х"],
  ["ts", "ц"],
  ["cz", "ч"],
  ["sz", "ш"],
  ["ck", "к"],
  ["ph", "ф"],
  ["th", "т"],
  ["qu", "кв"],
];

const LATIN_TO_RUSSIAN_CHARS: Record<string, string> = {
  a: "а",
  b: "б",
  d: "д",
  e: "е",
  f: "ф",
  h: "х",
  i: "и",
  j: "дж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  z: "з",
};

function normalizeLatinKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase();
}

function capitalizeRussianWord(value: string) {
  const chars = Array.from(value);
  const [first, ...rest] = chars;

  return first ? `${first.toUpperCase()}${rest.join("")}` : value;
}

function transliterateLatinWordToRussian(word: string) {
  const normalized = normalizeLatinKey(word);
  const override = NAME_TRANSLITERATION_OVERRIDES[normalized];
  if (override) return override;

  let result = "";
  let index = 0;

  while (index < normalized.length) {
    const rest = normalized.slice(index);
    const next = normalized[index + 1];

    if (index === 0 && rest.startsWith("ya")) {
      result += "я";
      index += 2;
      continue;
    }
    if (index === 0 && rest.startsWith("ye")) {
      result += "е";
      index += 2;
      continue;
    }
    if (index === 0 && rest.startsWith("yo")) {
      result += "ё";
      index += 2;
      continue;
    }
    if (index === 0 && rest.startsWith("yu")) {
      result += "ю";
      index += 2;
      continue;
    }
    if (index === 0 && rest.startsWith("ja")) {
      result += "я";
      index += 2;
      continue;
    }
    if (index === 0 && rest.startsWith("je")) {
      result += "е";
      index += 2;
      continue;
    }
    if (index === 0 && rest.startsWith("jo")) {
      result += "йо";
      index += 2;
      continue;
    }
    if (index === 0 && rest.startsWith("ju")) {
      result += "ю";
      index += 2;
      continue;
    }

    const rule = LATIN_TO_RUSSIAN_RULES.find(([latin]) => rest.startsWith(latin));
    if (rule) {
      result += rule[1];
      index += rule[0].length;
      continue;
    }

    const char = normalized[index];
    if (char === "c") {
      result += next && "eiy".includes(next) ? "с" : "к";
    } else if (char === "g") {
      result += next && "eiy".includes(next) ? "дж" : "г";
    } else if (char === "x") {
      result += "кс";
    } else if (char === "y") {
      result += index === normalized.length - 1 && normalized[index - 1] === "e" ? "й" : "и";
    } else {
      result += LATIN_TO_RUSSIAN_CHARS[char] ?? char;
    }

    index += 1;
  }

  return capitalizeRussianWord(result);
}

function transliterateNameToRussian(name: string) {
  return name
    .split(/([\s\-.,’']+)/)
    .map((part) => (/^[A-Za-z\u00C0-\u024F]+$/.test(part) ? transliterateLatinWordToRussian(part) : part))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function getEspnRefId(ref: unknown) {
  return getString(ref)?.match(/\/athletes\/(\d+)/)?.[1];
}

function getHigherStage(first: TennisStage, second: TennisStage) {
  return TENNIS_STAGE_ORDER.indexOf(second) > TENNIS_STAGE_ORDER.indexOf(first) ? second : first;
}

function getTennisStagePoints(stage: TennisStage) {
  return TENNIS_SCORING_RULES.find((rule) => rule.stage === stage)?.points ?? 0;
}

function getTennisScoringView() {
  return {
    version: TENNIS_SCORING_VERSION,
    description: TENNIS_SCORING_DESCRIPTION,
    rules: TENNIS_SCORING_RULES,
  };
}

function tennisPotLabel(pot: TennisPot) {
  return `корзина ${pot}`;
}

function getTennisDrawState(tournament: Doc<"tennisTournaments"> | null) {
  if (!tournament) {
    return {
      drawLocked: true,
      drawUnlockAt: null,
    };
  }

  const drawUnlockAt = tournament.drawUnlockAt ?? null;

  return {
    drawLocked: (drawUnlockAt !== null && Date.now() < drawUnlockAt) || (tournament.drawLocked ?? true),
    drawUnlockAt,
  };
}

function compareCompetitorsByRanking(first: Doc<"tennisCompetitors">, second: Doc<"tennisCompetitors">) {
  const firstRanking = first.ranking ?? Number.MAX_SAFE_INTEGER;
  const secondRanking = second.ranking ?? Number.MAX_SAFE_INTEGER;
  if (firstRanking !== secondRanking) return firstRanking - secondRanking;

  const firstSeed = first.seed ?? Number.MAX_SAFE_INTEGER;
  const secondSeed = second.seed ?? Number.MAX_SAFE_INTEGER;
  if (firstSeed !== secondSeed) return firstSeed - secondSeed;

  if (first.sortOrder !== second.sortOrder) return first.sortOrder - second.sortOrder;

  return first.name.localeCompare(second.name);
}

function getPotByRankingIndex(index: number): TennisPot {
  const potIndex = Math.min(
    TENNIS_POTS.length - 1,
    Math.floor(index / TENNIS_COMPETITORS_PER_POT),
  );

  return TENNIS_POTS[potIndex];
}

async function rebuildTournamentPots(ctx: MutationCtx, tournamentId: Id<"tennisTournaments">) {
  const [competitors, assignments] = await Promise.all([
    ctx.db
      .query("tennisCompetitors")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect(),
    ctx.db
      .query("tennisAssignments")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect(),
  ]);
  const competitorById = new Map(competitors.map((competitor) => [competitor._id, competitor]));
  const assignedPotByCompetitorId = new Map<Id<"tennisCompetitors">, TennisPot>();

  for (const assignment of assignments) {
    const competitor = competitorById.get(assignment.competitorId);
    const pot = assignment.pot ?? competitor?.pot;

    if (pot) {
      assignedPotByCompetitorId.set(assignment.competitorId, pot);
    }
  }

  const sortedCompetitors = [...competitors].sort(compareCompetitorsByRanking);
  const potByCompetitorId = new Map<Id<"tennisCompetitors">, TennisPot>();
  const potCounts = new Map<TennisPot, number>(TENNIS_POTS.map((pot) => [pot, 0]));
  let updatedPots = 0;

  for (const competitor of sortedCompetitors) {
    const assignedPot = assignedPotByCompetitorId.get(competitor._id);

    if (!assignedPot) continue;

    potByCompetitorId.set(competitor._id, assignedPot);
    potCounts.set(assignedPot, (potCounts.get(assignedPot) ?? 0) + 1);
  }

  let nextPotIndex = 0;

  for (const competitor of sortedCompetitors) {
    if (potByCompetitorId.has(competitor._id)) continue;

    while (
      nextPotIndex < TENNIS_POTS.length - 1 &&
      (potCounts.get(TENNIS_POTS[nextPotIndex]) ?? 0) >= TENNIS_COMPETITORS_PER_POT
    ) {
      nextPotIndex += 1;
    }

    const pot = TENNIS_POTS[nextPotIndex];
    potByCompetitorId.set(competitor._id, pot);
    potCounts.set(pot, (potCounts.get(pot) ?? 0) + 1);
  }

  for (const [index, competitor] of sortedCompetitors.entries()) {
    const pot = potByCompetitorId.get(competitor._id) ?? getPotByRankingIndex(index);

    if (competitor.pot === pot) continue;

    await ctx.db.patch(competitor._id, {
      pot,
      updatedAt: Date.now(),
    });
    updatedPots += 1;
  }

  return { updatedPots };
}

function toTennisAssignmentView(
  assignment: Doc<"tennisAssignments">,
  competitor: Doc<"tennisCompetitors">,
): TennisAssignmentView {
  const pot = assignment.pot ?? competitor.pot ?? 8;

  return {
    id: assignment._id,
    pot,
    competitorId: competitor._id,
    competitorName: competitor.nameRu ?? competitor.name,
    competitorCountry: competitor.country ?? null,
    competitorFlagUrl: competitor.flagUrl ?? null,
    stageReached: competitor.stageReached,
    points: getTennisStagePoints(competitor.stageReached),
    isEliminated: competitor.isEliminated,
    createdAt: assignment.createdAt,
  };
}

async function getTennisParticipantData(
  ctx: QueryCtx,
  tournamentId: Id<"tennisTournaments">,
  currentUserId: Id<"users"> | undefined,
) {
  const [assignments, competitors, users] = await Promise.all([
    ctx.db.query("tennisAssignments").withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId)).collect(),
    ctx.db.query("tennisCompetitors").withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId)).collect(),
    ctx.db.query("users").collect(),
  ]);
  const competitorById = new Map(competitors.map((competitor) => [competitor._id, competitor]));
  const userById = new Map(users.map((participant) => [participant._id, participant]));
  const assignmentsByUser = new Map<Id<"users">, TennisAssignmentView[]>();
  const firstAssignmentAtByUser = new Map<Id<"users">, number>();

  for (const assignment of assignments) {
    const competitor = competitorById.get(assignment.competitorId);
    if (!competitor) continue;

    const current = assignmentsByUser.get(assignment.userId) ?? [];
    current.push(toTennisAssignmentView(assignment, competitor));
    assignmentsByUser.set(assignment.userId, current);
    firstAssignmentAtByUser.set(
      assignment.userId,
      Math.min(firstAssignmentAtByUser.get(assignment.userId) ?? assignment.createdAt, assignment.createdAt),
    );
  }

  for (const participantAssignments of assignmentsByUser.values()) {
    participantAssignments.sort((first, second) => first.pot - second.pot || first.createdAt - second.createdAt);
  }

  const participantIds = [...assignmentsByUser.keys()].sort((firstId, secondId) => {
    const firstAt = firstAssignmentAtByUser.get(firstId) ?? 0;
    const secondAt = firstAssignmentAtByUser.get(secondId) ?? 0;
    if (firstAt !== secondAt) return firstAt - secondAt;

    return (userById.get(firstId)?.name ?? "").localeCompare(userById.get(secondId)?.name ?? "");
  });
  const participantNumberByUserId = new Map(
    participantIds.map((participantId, index) => [participantId, index + 1]),
  );
  const assignmentByCompetitorId = new Map(assignments.map((assignment) => [assignment.competitorId, assignment]));
  const potViews = TENNIS_POTS.map((pot) => {
    const competitorsInPot = competitors
      .filter((competitor) => competitor.pot === pot)
      .sort(compareCompetitorsByRanking);
    const assigned = competitorsInPot.filter((competitor) => assignmentByCompetitorId.has(competitor._id)).length;

    return {
      pot,
      label: tennisPotLabel(pot),
      total: competitorsInPot.length,
      assigned,
      remaining: Math.max(0, competitorsInPot.length - assigned),
      competitors: competitorsInPot.map((competitor) => {
        const assignment = assignmentByCompetitorId.get(competitor._id);
        const assignedUser = assignment ? userById.get(assignment.userId) : null;

        return {
          id: competitor._id,
          name: competitor.nameRu ?? competitor.name,
          originalName: competitor.name,
          country: competitor.country ?? null,
          flagUrl: competitor.flagUrl ?? null,
          seed: competitor.seed ?? null,
          ranking: competitor.ranking ?? null,
          rankingPoints: competitor.rankingPoints ?? null,
          pot,
          stageReached: competitor.stageReached,
          points: getTennisStagePoints(competitor.stageReached),
          isEliminated: competitor.isEliminated,
          sortOrder: competitor.sortOrder,
          assignedTo: assignedUser
            ? {
                id: assignedUser._id,
                name: assignedUser.name,
                participantNumber: participantNumberByUserId.get(assignedUser._id) ?? null,
              }
            : null,
        };
      }),
    };
  });
  const participants = participantIds
    .map((participantId) => {
      const participant = userById.get(participantId);
      if (!participant) return null;

      return {
        id: participant._id,
        name: participant.name,
        email: participant.email ?? null,
        participantNumber: participantNumberByUserId.get(participant._id) ?? 0,
        assignments: assignmentsByUser.get(participant._id) ?? [],
        isCurrentUser: currentUserId === participant._id,
      };
    })
    .filter((participant): participant is NonNullable<typeof participant> => participant !== null);

  return {
    assignments,
    competitors,
    participants,
    participantNumberByUserId,
    assignmentsByUser,
    competitorsByPot: potViews,
  };
}

async function fetchEspnJson(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN вернул HTTP ${response.status} для ${url}.`);
  }

  return await response.json() as Record<string, unknown>;
}

async function fetchWikipediaWikitext(title: string) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("rvprop", "content");
  url.searchParams.set("rvslots", "main");
  url.searchParams.set("titles", title);

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "wc2026-tennis-bracket-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia вернула HTTP ${response.status} для ${title}.`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const query = getObject(payload.query);
  const pages = getObject(query?.pages);
  const page = Object.values(pages ?? {}).map(getObject).find(Boolean);
  const revision = getObject((Array.isArray(page?.revisions) ? page.revisions : [])[0]);
  const slots = getObject(revision?.slots);
  const mainSlot = getObject(slots?.main);
  const content = getString(mainSlot?.["*"]);

  if (!content) {
    throw new Error(`Не удалось прочитать сетку Wikipedia: ${title}.`);
  }

  return content;
}

function getCompetitionIdNumber(competition: Record<string, unknown>) {
  const id = getString(competition.id);
  if (!id) return Number.MAX_SAFE_INTEGER;

  const numberId = Number(id);
  return Number.isFinite(numberId) ? numberId : Number.MAX_SAFE_INTEGER;
}

function getCompetitionScheduledAt(competition: Record<string, unknown>) {
  const scheduledAt = Date.parse(getString(competition.date) ?? getString(competition.startDate) ?? "");

  return Number.isFinite(scheduledAt) ? scheduledAt : Number.MAX_SAFE_INTEGER;
}

function normalizeBracketNameWords(name: string) {
  return name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/aleksandr/g, "alexander")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function getBracketNameVariants(name: string) {
  const words = normalizeBracketNameWords(name);
  const variants = new Set<string>();

  if (words.length === 0) return [];

  variants.add(words.join(""));
  variants.add([...words].sort().join(""));

  if (words.length > 1) {
    variants.add([...words].reverse().join(""));
  }

  if (words.length > 2) {
    variants.add(words.slice(1).join(""));
    variants.add(words.slice(-2).join(""));
    variants.add([...words.slice(-2)].sort().join(""));
  }

  return [...variants];
}

function getBracketPairKeys(firstName: string, secondName: string) {
  const firstVariants = getBracketNameVariants(firstName);
  const secondVariants = getBracketNameVariants(secondName);
  const keys = new Set<string>();

  for (const first of firstVariants) {
    for (const second of secondVariants) {
      keys.add([first, second].sort().join("|"));
    }
  }

  return [...keys];
}

function extractWikipediaPlayerName(teamValue: string) {
  const linkMatch = teamValue.match(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/);

  return linkMatch?.[1]?.trim() ?? "";
}

function parseWikipediaRoundOneBracketOrder(wikitext: string) {
  const orderByPairKey = new Map<string, number>();
  const sectionMatches = wikitext.match(/==== Section \d+ ====[\s\S]*?(?=\n==== Section \d+ ====|\n=== Bottom half ===|\n==\s*Seeded players\s*==|$)/g) ?? [];
  let bracketOrder = 0;

  for (const section of sectionMatches) {
    const teams = [...section.matchAll(/^\|\s*RD1-team(\d{2})\s*=\s*(.*)$/gm)]
      .sort((first, second) => Number(first[1]) - Number(second[1]))
      .map((match) => extractWikipediaPlayerName(match[2] ?? ""));

    for (let index = 0; index < teams.length; index += 2) {
      const firstName = teams[index];
      const secondName = teams[index + 1];

      if (firstName && secondName) {
        for (const key of getBracketPairKeys(firstName, secondName)) {
          if (!orderByPairKey.has(key)) {
            orderByPairKey.set(key, bracketOrder);
          }
        }
      }

      bracketOrder += 1;
    }
  }

  return orderByPairKey;
}

async function fetchWikipediaRoundOneBracketOrder(title: string) {
  return parseWikipediaRoundOneBracketOrder(await fetchWikipediaWikitext(title));
}

function getCompetitionStatus(competition: Record<string, unknown>) {
  const status = getObject(competition.status);
  const statusType = getObject(status?.type);
  const state = getString(statusType?.state);
  const completed = statusType?.completed === true;

  if (completed || state === "post") return "completed";
  if (state === "in") return "live";

  return "scheduled";
}

function getCompetitionEspnStatus(competition: Record<string, unknown>) {
  const status = getObject(competition.status);
  const statusType = getObject(status?.type);

  return (
    getString(statusType?.name) ??
    getString(statusType?.description) ??
    getString(statusType?.shortDetail)
  );
}

function getAthleteCountry(athlete: Record<string, unknown> | null) {
  const flag = getObject(athlete?.flag);

  return getString(flag?.alt);
}

function getAthleteFlagUrl(athlete: Record<string, unknown> | null) {
  const flag = getObject(athlete?.flag);

  return getString(flag?.href);
}

function getLineScores(competitor: Record<string, unknown>) {
  const linescores = Array.isArray(competitor.linescores) ? competitor.linescores : [];

  return linescores.map((lineScore) => getNumber(getObject(lineScore)?.value)).filter((value): value is number => value !== undefined);
}

function getCompetitionPlayers(competition: Record<string, unknown>) {
  return getObjectArray(competition.competitors).sort(
    (first, second) => (getNumber(first.order) ?? 99) - (getNumber(second.order) ?? 99),
  );
}

function getCompetitionPlayerName(competitor: Record<string, unknown> | undefined) {
  const athlete = getObject(competitor?.athlete);

  return getString(athlete?.displayName) ?? getString(competitor?.name) ?? "TBD";
}

function getWikipediaBracketOrderForCompetition(
  roundOneOrderByPairKey: Map<string, number>,
  competition: Record<string, unknown>,
) {
  const competitors = getCompetitionPlayers(competition);
  const firstName = getCompetitionPlayerName(competitors[0]);
  const secondName = getCompetitionPlayerName(competitors[1]);

  if (!firstName || !secondName || firstName === "TBD" || secondName === "TBD") {
    return undefined;
  }

  for (const key of getBracketPairKeys(firstName, secondName)) {
    const order = roundOneOrderByPairKey.get(key);

    if (order !== undefined) return order;
  }

  return undefined;
}

function toOptionalStringField(key: string, value: string | undefined) {
  return value === undefined ? {} : { [key]: value };
}

function toOptionalNumberField(key: string, value: number | undefined) {
  return value === undefined ? {} : { [key]: value };
}

async function fetchRankingsByAthleteId(tour: TennisTour) {
  const rankingsCollection = await fetchEspnJson(`${ESPN_CORE_BASE_URL}/leagues/${tour}/rankings?lang=en&region=us`);
  const firstRankingRef = getString(getObject((Array.isArray(rankingsCollection.items) ? rankingsCollection.items : [])[0])?.$ref);
  const rankingsByAthleteId = new Map<string, { ranking: number; rankingPoints?: number }>();

  if (!firstRankingRef) return rankingsByAthleteId;

  const rankingPayload = await fetchEspnJson(firstRankingRef.replace(/^http:\/\//, "https://"));
  const ranks = Array.isArray(rankingPayload.ranks) ? rankingPayload.ranks : [];

  for (const rawRank of ranks) {
    const rank = getObject(rawRank);
    const athleteId = getEspnRefId(getObject(rank?.athlete)?.$ref);
    const current = getNumber(rank?.current);

    if (!athleteId || current === undefined) continue;

    rankingsByAthleteId.set(athleteId, {
      ranking: current,
      rankingPoints: getNumber(rank?.points),
    });
  }

  return rankingsByAthleteId;
}

async function fetchTournamentFromEspn(config: TournamentConfig) {
  const [scoreboard, rankingsByAthleteId, roundOneOrderByPairKey] = await Promise.all([
    fetchEspnJson(`${ESPN_SITE_BASE_URL}/${config.tour}/scoreboard?dates=20260629`),
    fetchRankingsByAthleteId(config.tour),
    fetchWikipediaRoundOneBracketOrder(config.wikipediaTitle),
  ]);
  const events = getObjectArray(scoreboard.events);
  const event = events.find((item) => getString(item?.id) === config.providerEventId || getString(item?.name) === "Wimbledon");
  const groupings = getObjectArray(event?.groupings);
  const grouping = groupings.find((item) => getString(getObject(item?.grouping)?.slug) === config.groupingSlug);
  const allCompetitions = getObjectArray(grouping?.competitions);
  const competitions = allCompetitions.filter((competition) => {
    const roundName = getString(getObject(competition?.round)?.displayName);

    return Boolean(roundName && ROUND_TO_STAGE[roundName]);
  });
  const roundOneCompetitions = competitions.filter(
    (competition) => getString(getObject(competition?.round)?.displayName) === "Round 1",
  );
  const competitorsByAthleteId = new Map<string, NormalizedCompetitor>();
  let entryOrder = 0;

  for (const competition of roundOneCompetitions) {
    const competitors = getObjectArray(competition.competitors);

    for (const competitor of competitors) {
      const espnAthleteId = getString(competitor.id);
      const athlete = getObject(competitor.athlete);
      const name = getString(athlete?.displayName) ?? getString(competitor.name);
      if (!espnAthleteId || !name || competitorsByAthleteId.has(espnAthleteId)) continue;

      const seed = getNumber(getObject(competitor.curatedRank)?.current);
      const ranking = rankingsByAthleteId.get(espnAthleteId);
      entryOrder += 1;
      competitorsByAthleteId.set(espnAthleteId, {
        espnAthleteId,
        name,
        ...toOptionalStringField("shortName", getString(athlete?.shortName)),
        ...toOptionalStringField("country", getAthleteCountry(athlete)),
        ...toOptionalStringField("flagUrl", getAthleteFlagUrl(athlete)),
        ...toOptionalNumberField("seed", seed),
        ...toOptionalNumberField("ranking", ranking?.ranking),
        ...toOptionalNumberField("rankingPoints", ranking?.rankingPoints),
        entryOrder,
        sortOrder: seed ?? ranking?.ranking ?? 10000 + entryOrder,
      });
    }
  }

  const bracketOrderByCompetitionId = new Map<string, number>();
  const competitionsByRoundName = new Map<string, Record<string, unknown>[]>();

  for (const competition of competitions) {
    const roundName = getString(getObject(competition.round)?.displayName) ?? "Round 1";
    const roundCompetitions = competitionsByRoundName.get(roundName) ?? [];

    roundCompetitions.push(competition);
    competitionsByRoundName.set(roundName, roundCompetitions);
  }

  for (const [roundName, roundCompetitions] of competitionsByRoundName) {
    const sortedCompetitions = [...roundCompetitions].sort((first, second) => {
      if (roundName === "Round 1") {
        const firstWikipediaOrder = getWikipediaBracketOrderForCompetition(roundOneOrderByPairKey, first);
        const secondWikipediaOrder = getWikipediaBracketOrderForCompetition(roundOneOrderByPairKey, second);

        if (firstWikipediaOrder !== undefined && secondWikipediaOrder !== undefined) {
          return firstWikipediaOrder - secondWikipediaOrder;
        }
        if (firstWikipediaOrder !== undefined) return -1;
        if (secondWikipediaOrder !== undefined) return 1;
      }

      return (
        getCompetitionIdNumber(first) - getCompetitionIdNumber(second) ||
        getCompetitionScheduledAt(first) - getCompetitionScheduledAt(second)
      );
    });

    sortedCompetitions.forEach((competition, index) => {
      const competitionId = getString(competition.id);
      if (competitionId) {
        bracketOrderByCompetitionId.set(competitionId, index);
      }
    });
  }

  const normalizedMatches: NormalizedMatch[] = competitions.map((competition) => {
    const competitors = getCompetitionPlayers(competition);
    const first = competitors[0];
    const second = competitors[1];
    const firstAthlete = getObject(first?.athlete);
    const secondAthlete = getObject(second?.athlete);
    const firstAthleteId = getString(first?.id);
    const secondAthleteId = getString(second?.id);
    const winner = competitors.find((competitor) => competitor.winner === true);
    const scheduledAt = getCompetitionScheduledAt(competition);
    const roundName = getString(getObject(competition.round)?.displayName) ?? "Round 1";
    const round = ROUND_TO_STAGE[roundName] ?? ROUND_TO_STAGE["Round 1"];
    const espnCompetitionId = String(getString(competition.id) ?? "");
    const bracketOrder = bracketOrderByCompetitionId.get(espnCompetitionId) ?? 0;

    return {
      espnCompetitionId,
      roundName,
      roundOrder: round.order,
      bracketOrder,
      scheduledAt: scheduledAt === Number.MAX_SAFE_INTEGER ? Date.now() : scheduledAt,
      ...toOptionalStringField("court", getString(getObject(competition.venue)?.court)),
      ...toOptionalStringField("player1EspnAthleteId", firstAthleteId),
      ...toOptionalStringField("player2EspnAthleteId", secondAthleteId),
      player1Name: getCompetitionPlayerName(first),
      player2Name: getCompetitionPlayerName(second),
      player1SetScores: first ? getLineScores(first) : [],
      player2SetScores: second ? getLineScores(second) : [],
      ...toOptionalStringField("winnerEspnAthleteId", getString(winner?.id)),
      status: getCompetitionStatus(competition),
      ...toOptionalStringField("espnStatus", getCompetitionEspnStatus(competition)),
      ...toOptionalStringField("note", getString(getObject((Array.isArray(competition.notes) ? competition.notes : [])[0])?.text)),
    };
  });

  return {
    competitors: [...competitorsByAthleteId.values()].sort((first, second) => first.sortOrder - second.sortOrder),
    matches: normalizedMatches.sort(
      (first, second) =>
        first.roundOrder - second.roundOrder ||
        first.bracketOrder - second.bracketOrder ||
        first.scheduledAt - second.scheduledAt,
    ),
  };
}

async function getTournamentBySlug(ctx: MutationCtx, slug: TournamentSlug) {
  return await ctx.db
    .query("tennisTournaments")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
}

async function syncCompetitorProgress(ctx: MutationCtx, tournamentId: Id<"tennisTournaments">) {
  const [competitors, matches] = await Promise.all([
    ctx.db.query("tennisCompetitors").withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId)).collect(),
    ctx.db.query("tennisMatches").withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId)).collect(),
  ]);
  const updates = new Map<Id<"tennisCompetitors">, { stageReached: TennisStage; isEliminated: boolean }>();

  for (const competitor of competitors) {
    updates.set(competitor._id, {
      stageReached: "round_of_128",
      isEliminated: false,
    });
  }

  const markStage = (competitorId: Id<"tennisCompetitors"> | undefined, stageReached: TennisStage, isEliminated: boolean) => {
    if (!competitorId) return;

    const update = updates.get(competitorId);
    if (!update) return;

    update.stageReached = getHigherStage(update.stageReached, stageReached);
    update.isEliminated = isEliminated;
  };

  for (const match of matches) {
    if (match.status !== "completed" || !match.winnerCompetitorId) continue;

    const round = ROUND_TO_STAGE[match.roundName];
    if (!round) continue;

    const loserId =
      match.player1CompetitorId === match.winnerCompetitorId
        ? match.player2CompetitorId
        : match.player2CompetitorId === match.winnerCompetitorId
          ? match.player1CompetitorId
          : undefined;

    markStage(match.player1CompetitorId, round.current, false);
    markStage(match.player2CompetitorId, round.current, false);
    markStage(match.winnerCompetitorId, round.next, false);
    markStage(loserId, round.current, true);
  }

  const now = Date.now();
  let updatedCompetitors = 0;

  for (const competitor of competitors) {
    const update = updates.get(competitor._id);
    if (!update) continue;

    if (competitor.stageReached === update.stageReached && competitor.isEliminated === update.isEliminated) {
      continue;
    }

    await ctx.db.patch(competitor._id, {
      stageReached: update.stageReached,
      isEliminated: update.isEliminated,
      updatedAt: now,
    });
    updatedCompetitors += 1;
  }

  return { updatedCompetitors };
}

export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await getCurrentUser(ctx);
    if (!isAdminUser(identity, user)) {
      throw new Error("Это действие доступно только администратору.");
    }

    return true;
  },
});

export const getOverview = query({
  args: {
    slug: tournamentSlugValidator,
  },
  handler: async (ctx, args) => {
    const config = getTournamentConfig(args.slug);
    const { identity, user } = await getCurrentUser(ctx);
    const tournament = await ctx.db
      .query("tennisTournaments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!tournament) {
      return {
        tournament: {
          slug: config.slug,
          title: config.title,
          tour: config.tour,
          providerEventId: config.providerEventId,
          groupingSlug: config.groupingSlug,
          year: config.year,
        },
        currentUser: user
          ? {
              id: user._id,
              name: user.name,
              email: user.email ?? null,
              participantNumber: null,
              isParticipant: false,
              isAdmin: isAdminUser(identity, user),
              assignments: [],
            }
          : null,
        seeded: false,
        participants: [],
        participantCount: 0,
        maxParticipants: TENNIS_MAX_PARTICIPANTS,
        isFull: false,
        competitorsReady: false,
        competitorsByPot: TENNIS_POTS.map((pot) => ({
          pot,
          label: tennisPotLabel(pot),
          total: 0,
          assigned: 0,
          remaining: 0,
          competitors: [],
        })),
        scoring: getTennisScoringView(),
        competitors: [],
        matches: [],
        latestSync: null,
        stats: {
          participants: 0,
          competitors: 0,
          matches: 0,
          completedMatches: 0,
          liveMatches: 0,
          scheduledMatches: 0,
        },
      };
    }

    const [competitors, matches, latestSync] = await Promise.all([
      ctx.db.query("tennisCompetitors").withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id)).collect(),
      ctx.db.query("tennisMatches").withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id)).collect(),
      ctx.db
        .query("tennisSyncLogs")
        .withIndex("by_tournament_created_at", (q) => q.eq("tournamentId", tournament._id))
        .order("desc")
        .first(),
    ]);
    const participantData = await getTennisParticipantData(ctx, tournament._id, user?._id);
    const currentAssignments = user ? participantData.assignmentsByUser.get(user._id) ?? [] : [];
    const participantNumber = user ? participantData.participantNumberByUserId.get(user._id) ?? null : null;
    const drawState = getTennisDrawState(tournament);
    const competitorsReady =
      competitors.length >= TENNIS_POTS.length * TENNIS_COMPETITORS_PER_POT &&
      participantData.competitorsByPot.every((pot) => pot.total >= TENNIS_COMPETITORS_PER_POT);

    return {
      tournament: {
        id: tournament._id,
        slug: tournament.slug,
        title: tournament.title,
        tour: tournament.tour,
        providerEventId: tournament.providerEventId,
        groupingSlug: tournament.groupingSlug,
        year: tournament.year,
        drawLocked: drawState.drawLocked,
        drawUnlockAt: drawState.drawUnlockAt,
      },
      currentUser: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email ?? null,
            participantNumber,
            isParticipant: participantNumber !== null,
            isAdmin: isAdminUser(identity, user),
            assignments: currentAssignments,
          }
        : null,
      seeded: competitors.length > 0,
      participants: participantData.participants,
      participantCount: participantData.participants.length,
      maxParticipants: tournament.maxParticipants ?? TENNIS_MAX_PARTICIPANTS,
      isFull: participantData.participants.length >= (tournament.maxParticipants ?? TENNIS_MAX_PARTICIPANTS),
      competitorsReady,
      competitorsByPot: participantData.competitorsByPot,
      scoring: getTennisScoringView(),
      competitors: competitors
        .sort(compareCompetitorsByRanking)
        .map((competitor) => ({
          id: competitor._id,
          name: competitor.nameRu ?? competitor.name,
          originalName: competitor.name,
          country: competitor.country ?? null,
          flagUrl: competitor.flagUrl ?? null,
          seed: competitor.seed ?? null,
          ranking: competitor.ranking ?? null,
          rankingPoints: competitor.rankingPoints ?? null,
          pot: competitor.pot ?? null,
          stageReached: competitor.stageReached,
          points: getTennisStagePoints(competitor.stageReached),
          isEliminated: competitor.isEliminated,
          sortOrder: competitor.sortOrder,
        }))
        .sort((first, second) => (first.pot ?? 99) - (second.pot ?? 99) || first.sortOrder - second.sortOrder || first.name.localeCompare(second.name)),
      matches: matches
        .map((match) => ({
          id: match._id,
          espnCompetitionId: match.espnCompetitionId,
          roundName: match.roundName,
          roundOrder: match.roundOrder,
          bracketOrder: match.bracketOrder ?? null,
          scheduledAt: match.scheduledAt,
          court: match.court ?? null,
          player1CompetitorId: match.player1CompetitorId ?? null,
          player2CompetitorId: match.player2CompetitorId ?? null,
          player1Name: match.player1Name,
          player2Name: match.player2Name,
          player1SetScores: match.player1SetScores,
          player2SetScores: match.player2SetScores,
          winnerCompetitorId: match.winnerCompetitorId ?? null,
          status: match.status,
          note: match.note ?? null,
        }))
        .sort(
          (first, second) =>
            first.roundOrder - second.roundOrder ||
            (first.bracketOrder ?? 9999) - (second.bracketOrder ?? 9999) ||
            first.scheduledAt - second.scheduledAt,
        ),
      latestSync: latestSync
        ? {
            ok: latestSync.ok,
            provider: latestSync.provider,
            fetchedCompetitors: latestSync.fetchedCompetitors ?? null,
            fetchedMatches: latestSync.fetchedMatches ?? null,
            updatedCompetitors: latestSync.updatedCompetitors ?? null,
            updatedMatches: latestSync.updatedMatches ?? null,
            error: latestSync.error ?? null,
            createdAt: latestSync.createdAt,
          }
        : null,
      stats: {
        participants: participantData.participants.length,
        competitors: competitors.length,
        matches: matches.length,
        completedMatches: matches.filter((match) => match.status === "completed").length,
        liveMatches: matches.filter((match) => match.status === "live").length,
        scheduledMatches: matches.filter((match) => match.status === "scheduled").length,
      },
    };
  },
});

export const rebuildPots = mutation({
  args: {
    slug: tournamentSlugValidator,
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUser(ctx);
    if (!isAdminUser(identity, user)) {
      throw new Error("Это действие доступно только администратору.");
    }

    const tournament = await getTournamentBySlug(ctx, args.slug);
    if (!tournament) {
      throw new Error("Сначала загрузите турнир из ESPN.");
    }

    const result = await rebuildTournamentPots(ctx, tournament._id);

    return {
      updatedPots: result.updatedPots,
    };
  },
});

export const backfillRussianNames = mutation({
  args: {
    slug: tournamentSlugValidator,
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUser(ctx);
    if (!isAdminUser(identity, user)) {
      throw new Error("Это действие доступно только администратору.");
    }

    const tournament = await getTournamentBySlug(ctx, args.slug);
    if (!tournament) {
      throw new Error("Сначала загрузите турнир из ESPN.");
    }

    const competitors = await ctx.db
      .query("tennisCompetitors")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .collect();
    const now = Date.now();
    let updated = 0;

    for (const competitor of competitors) {
      if (competitor.nameRu && !args.overwrite) continue;

      const nameRu = transliterateNameToRussian(competitor.name);
      if (!nameRu || competitor.nameRu === nameRu) continue;

      await ctx.db.patch(competitor._id, {
        nameRu,
        updatedAt: now,
      });
      updated += 1;
    }

    return {
      slug: args.slug,
      total: competitors.length,
      updated,
    };
  },
});

export const updateRussianNames = mutation({
  args: {
    slug: tournamentSlugValidator,
    updates: v.array(v.object({
      competitorId: v.id("tennisCompetitors"),
      nameRu: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUser(ctx);
    if (!isAdminUser(identity, user)) {
      throw new Error("Это действие доступно только администратору.");
    }

    const tournament = await getTournamentBySlug(ctx, args.slug);
    if (!tournament) {
      throw new Error("Сначала загрузите турнир из ESPN.");
    }

    const now = Date.now();
    let updated = 0;
    let skipped = 0;

    for (const item of args.updates) {
      const nameRu = item.nameRu.trim();
      const competitor = await ctx.db.get(item.competitorId);

      if (!nameRu || !competitor || competitor.tournamentId !== tournament._id || competitor.nameRu === nameRu) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(competitor._id, {
        nameRu,
        updatedAt: now,
      });
      updated += 1;
    }

    return {
      slug: args.slug,
      total: args.updates.length,
      updated,
      skipped,
    };
  },
});

export const setDrawLock = mutation({
  args: {
    slug: tournamentSlugValidator,
    locked: v.boolean(),
    unlockAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUser(ctx);
    if (!isAdminUser(identity, user)) {
      throw new Error("Это действие доступно только администратору.");
    }

    const tournament = await getTournamentBySlug(ctx, args.slug);
    if (!tournament) {
      throw new Error("Сначала загрузите турнир из ESPN.");
    }

    const drawUnlockAt = args.unlockAt ?? undefined;
    await ctx.db.patch(tournament._id, {
      drawLocked: args.locked,
      drawUnlockAt,
      maxParticipants: TENNIS_MAX_PARTICIPANTS,
      updatedAt: Date.now(),
    });

    return {
      drawLocked: args.locked,
      drawUnlockAt: args.unlockAt ?? null,
    };
  },
});

export const drawCompetitor = mutation({
  args: {
    slug: tournamentSlugValidator,
    pot: tennisPotValidator,
  },
  handler: async (ctx, args) => {
    const tournament = await getTournamentBySlug(ctx, args.slug);
    if (!tournament) {
      throw new Error("Сначала нужно загрузить теннисистов из ESPN.");
    }

    const drawState = getTennisDrawState(tournament);
    if (drawState.drawLocked) {
      throw new Error("Жеребьёвка Wimbledon временно закрыта.");
    }

    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Ваш профиль ещё не готов.");
    }

    const assignments = await ctx.db
      .query("tennisAssignments")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .collect();
    const participantUserIds = new Set(assignments.map((assignment) => assignment.userId));
    const userAssignments = assignments.filter((assignment) => assignment.userId === user._id);

    if (userAssignments.length === 0 && participantUserIds.size >= (tournament.maxParticipants ?? TENNIS_MAX_PARTICIPANTS)) {
      throw new Error(`Все ${tournament.maxParticipants ?? TENNIS_MAX_PARTICIPANTS} мест игроков уже заняты. Можно смотреть турнир как зритель.`);
    }

    for (const assignment of userAssignments) {
      const competitor = await ctx.db.get(assignment.competitorId);
      const assignmentPot = assignment.pot ?? competitor?.pot;

      if (assignmentPot !== args.pot) continue;

      return {
        complete: false as const,
        alreadyAssigned: true as const,
        message: `Вы уже вытаскивали теннисиста из корзины ${args.pot}.`,
        competitor: competitor
          ? {
              id: competitor._id,
              name: competitor.nameRu ?? competitor.name,
              pot: assignmentPot,
            }
          : null,
      };
    }

    const competitorsInPot = await ctx.db
      .query("tennisCompetitors")
      .withIndex("by_tournament_pot", (q) => q.eq("tournamentId", tournament._id).eq("pot", args.pot))
      .collect();

    if (competitorsInPot.length < TENNIS_MAX_PARTICIPANTS) {
      throw new Error(`Корзина ${args.pot} ещё не готова: нужно ${TENNIS_MAX_PARTICIPANTS} теннисистов.`);
    }

    const assignedCompetitorIds = new Set(assignments.map((assignment) => assignment.competitorId));
    const availableCompetitors = competitorsInPot.filter((competitor) => !assignedCompetitorIds.has(competitor._id));

    if (availableCompetitors.length === 0) {
      throw new Error(`В корзине ${args.pot} не осталось свободных теннисистов.`);
    }

    const selectedCompetitor = availableCompetitors[Math.floor(Math.random() * availableCompetitors.length)];
    const existingAssignment = await ctx.db
      .query("tennisAssignments")
      .withIndex("by_competitor", (q) => q.eq("competitorId", selectedCompetitor._id))
      .first();

    if (existingAssignment) {
      throw new Error("Этого теннисиста только что вытащил другой игрок. Попробуйте ещё раз.");
    }

    await ctx.db.insert("tennisAssignments", {
      tournamentId: tournament._id,
      userId: user._id,
      competitorId: selectedCompetitor._id,
      pot: args.pot,
      createdAt: Date.now(),
    });

    return {
      complete: false as const,
      alreadyAssigned: false as const,
      competitor: {
        id: selectedCompetitor._id,
        name: selectedCompetitor.nameRu ?? selectedCompetitor.name,
        pot: args.pot,
      },
    };
  },
});

export const applyEspnSeed = internalMutation({
  args: {
    slug: tournamentSlugValidator,
    competitors: v.array(normalizedCompetitorValidator),
    matches: v.array(normalizedMatchValidator),
  },
  handler: async (ctx, args) => {
    const config = getTournamentConfig(args.slug);
    const now = Date.now();
    let tournament = await getTournamentBySlug(ctx, args.slug);

    if (!tournament) {
      const tournamentId = await ctx.db.insert("tennisTournaments", {
        slug: config.slug,
        title: config.title,
        tour: config.tour,
        provider: "espn",
        providerEventId: config.providerEventId,
        groupingSlug: config.groupingSlug,
        year: config.year,
        scoringVersion: TENNIS_SCORING_VERSION,
        scoringDescription: TENNIS_SCORING_DESCRIPTION,
        drawLocked: true,
        maxParticipants: TENNIS_MAX_PARTICIPANTS,
        createdAt: now,
        updatedAt: now,
      });
      tournament = await ctx.db.get(tournamentId) as Doc<"tennisTournaments">;
    } else {
      await ctx.db.patch(tournament._id, {
        title: config.title,
        tour: config.tour,
        provider: "espn",
        providerEventId: config.providerEventId,
        groupingSlug: config.groupingSlug,
        year: config.year,
        scoringVersion: TENNIS_SCORING_VERSION,
        scoringDescription: TENNIS_SCORING_DESCRIPTION,
        maxParticipants: TENNIS_MAX_PARTICIPANTS,
        updatedAt: now,
      });
    }

    const competitorIdByEspnAthleteId = new Map<string, Id<"tennisCompetitors">>();
    let updatedCompetitors = 0;

    for (const competitor of args.competitors) {
      const existingCompetitor = await ctx.db
        .query("tennisCompetitors")
        .withIndex("by_tournament_athlete", (q) =>
          q.eq("tournamentId", tournament._id).eq("espnAthleteId", competitor.espnAthleteId),
        )
        .first();
      const nameRu = existingCompetitor?.nameRu?.trim() || transliterateNameToRussian(competitor.name);
      const competitorPatch = {
        name: competitor.name,
        nameRu,
        ...toOptionalStringField("shortName", competitor.shortName),
        ...toOptionalStringField("country", competitor.country),
        ...toOptionalStringField("flagUrl", competitor.flagUrl),
        ...toOptionalNumberField("seed", competitor.seed),
        ...toOptionalNumberField("ranking", competitor.ranking),
        ...toOptionalNumberField("rankingPoints", competitor.rankingPoints),
        entryOrder: competitor.entryOrder,
        sortOrder: competitor.sortOrder,
        updatedAt: now,
      };

      if (existingCompetitor) {
        await ctx.db.patch(existingCompetitor._id, competitorPatch);
        competitorIdByEspnAthleteId.set(competitor.espnAthleteId, existingCompetitor._id);
      } else {
        const competitorId = await ctx.db.insert("tennisCompetitors", {
          tournamentId: tournament._id,
          espnAthleteId: competitor.espnAthleteId,
          ...competitorPatch,
          stageReached: "round_of_128",
          isEliminated: false,
          createdAt: now,
        });
        competitorIdByEspnAthleteId.set(competitor.espnAthleteId, competitorId);
      }
      updatedCompetitors += 1;
    }

    const potRebuild = await rebuildTournamentPots(ctx, tournament._id);

    let updatedMatches = 0;
    for (const match of args.matches) {
      const existingMatch = await ctx.db
        .query("tennisMatches")
        .withIndex("by_tournament_competition", (q) =>
          q.eq("tournamentId", tournament._id).eq("espnCompetitionId", match.espnCompetitionId),
        )
        .first();
      const matchPatch = {
        roundName: match.roundName,
        roundOrder: match.roundOrder,
        bracketOrder: match.bracketOrder,
        scheduledAt: match.scheduledAt,
        ...toOptionalStringField("court", match.court),
        player1CompetitorId: match.player1EspnAthleteId ? competitorIdByEspnAthleteId.get(match.player1EspnAthleteId) : undefined,
        player2CompetitorId: match.player2EspnAthleteId ? competitorIdByEspnAthleteId.get(match.player2EspnAthleteId) : undefined,
        player1Name: match.player1Name,
        player2Name: match.player2Name,
        player1SetScores: match.player1SetScores,
        player2SetScores: match.player2SetScores,
        winnerCompetitorId: match.winnerEspnAthleteId ? competitorIdByEspnAthleteId.get(match.winnerEspnAthleteId) : undefined,
        status: match.status,
        ...toOptionalStringField("espnStatus", match.espnStatus),
        ...toOptionalStringField("note", match.note),
        source: "espn:tennis-scoreboard",
        updatedAt: now,
      };

      if (existingMatch) {
        await ctx.db.patch(existingMatch._id, matchPatch);
      } else {
        await ctx.db.insert("tennisMatches", {
          tournamentId: tournament._id,
          espnCompetitionId: match.espnCompetitionId,
          ...matchPatch,
          createdAt: now,
        });
      }
      updatedMatches += 1;
    }

    const progress = await syncCompetitorProgress(ctx, tournament._id);
    await ctx.db.insert("tennisSyncLogs", {
      tournamentId: tournament._id,
      provider: "espn",
      ok: true,
      fetchedCompetitors: args.competitors.length,
      fetchedMatches: args.matches.length,
      updatedCompetitors: progress.updatedCompetitors,
      updatedMatches,
      createdAt: now,
    });

    return {
      tournamentId: tournament._id,
      fetchedCompetitors: args.competitors.length,
      fetchedMatches: args.matches.length,
      updatedCompetitors,
      updatedPots: potRebuild.updatedPots,
      updatedMatches,
      progressUpdatedCompetitors: progress.updatedCompetitors,
    };
  },
});

async function syncFromEspnHandler(ctx: ActionCtx, slug: TournamentSlug) {
  const internalApi = internal as any;
  await ctx.runQuery(internalApi.tennis.assertAdmin, {});

  const config = getTournamentConfig(slug);

  try {
    const result = await fetchTournamentFromEspn(config);

    return await ctx.runMutation(internalApi.tennis.applyEspnSeed, {
      slug,
      competitors: result.competitors,
      matches: result.matches,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка ESPN.";
    throw new Error(message);
  }
}

export const seedFromEspn = action({
  args: {
    slug: tournamentSlugValidator,
  },
  handler: async (ctx, args) => {
    return await syncFromEspnHandler(ctx, args.slug);
  },
});

export const syncFromEspn = action({
  args: {
    slug: tournamentSlugValidator,
  },
  handler: async (ctx, args) => {
    return await syncFromEspnHandler(ctx, args.slug);
  },
});
