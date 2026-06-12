import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./authHelpers";
import { POTS, Pot, TEAMS_PER_POT, potValidator, teamStageValidator } from "./validators";

type TeamSeed = {
  name: string;
  pot: Pot;
};

const TEAM_SEED: TeamSeed[] = [
  { name: "Аргентина", pot: 1 },
  { name: "Испания", pot: 1 },
  { name: "Франция", pot: 1 },
  { name: "Англия", pot: 1 },
  { name: "Португалия", pot: 1 },
  { name: "Бразилия", pot: 1 },
  { name: "Марокко", pot: 1 },
  { name: "Нидерланды", pot: 1 },
  { name: "Бельгия", pot: 1 },
  { name: "Германия", pot: 1 },
  { name: "Хорватия", pot: 1 },
  { name: "Колумбия", pot: 1 },
  { name: "Мексика", pot: 1 },
  { name: "Сенегал", pot: 1 },
  { name: "Уругвай", pot: 1 },
  { name: "США", pot: 1 },

  { name: "Япония", pot: 2 },
  { name: "Швейцария", pot: 2 },
  { name: "Иран", pot: 2 },
  { name: "Турция", pot: 2 },
  { name: "Эквадор", pot: 2 },
  { name: "Австрия", pot: 2 },
  { name: "Южная Корея", pot: 2 },
  { name: "Австралия", pot: 2 },
  { name: "Алжир", pot: 2 },
  { name: "Египет", pot: 2 },
  { name: "Канада", pot: 2 },
  { name: "Норвегия", pot: 2 },
  { name: "Кот-д’Ивуар", pot: 2 },
  { name: "Панама", pot: 2 },
  { name: "Швеция", pot: 2 },
  { name: "Чехия", pot: 2 },

  { name: "Парагвай", pot: 3 },
  { name: "Шотландия", pot: 3 },
  { name: "Тунис", pot: 3 },
  { name: "ДР Конго", pot: 3 },
  { name: "Узбекистан", pot: 3 },
  { name: "Катар", pot: 3 },
  { name: "Ирак", pot: 3 },
  { name: "ЮАР", pot: 3 },
  { name: "Саудовская Аравия", pot: 3 },
  { name: "Иордания", pot: 3 },
  { name: "Босния и Герцеговина", pot: 3 },
  { name: "Кабо-Верде", pot: 3 },
  { name: "Гана", pot: 3 },
  { name: "Кюрасао", pot: 3 },
  { name: "Гаити", pot: 3 },
  { name: "Новая Зеландия", pot: 3 },
];

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function validateTeamSeed() {
  if (TEAM_SEED.length !== 48) {
    throw new Error("Список команд ещё не настроен.");
  }

  const names = new Set<string>();
  for (const team of TEAM_SEED) {
    const normalized = normalizeName(team.name);
    if (!normalized) {
      throw new Error("Названия команд не могут быть пустыми.");
    }
    if (names.has(normalized.toLowerCase())) {
      throw new Error(`Команда повторяется в списке: ${normalized}`);
    }
    names.add(normalized.toLowerCase());
  }

  const potCounts = new Map<Pot, number>();
  for (const team of TEAM_SEED) {
    potCounts.set(team.pot, (potCounts.get(team.pot) ?? 0) + 1);
  }

  for (const pot of POTS) {
    if ((potCounts.get(pot) ?? 0) !== TEAMS_PER_POT) {
      throw new Error(`В корзине ${pot} должно быть ровно ${TEAMS_PER_POT} команд.`);
    }
  }
}

async function insertSeedTeams(ctx: MutationCtx) {
  validateTeamSeed();

  const existingAssignments = await ctx.db.query("teamAssignments").first();
  if (existingAssignments) {
    throw new Error("Нельзя перезагрузить команды после начала жеребьёвки.");
  }

  const existingTeams = await ctx.db.query("teams").collect();
  if (existingTeams.length > 0) {
    return {
      inserted: 0,
      alreadySeeded: true,
      totalTeams: existingTeams.length,
    };
  }

  const now = Date.now();
  for (const team of TEAM_SEED) {
    await ctx.db.insert("teams", {
      name: normalizeName(team.name),
      pot: team.pot,
      stageReached: "group",
      isEliminated: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    inserted: TEAM_SEED.length,
    alreadySeeded: false,
    totalTeams: TEAM_SEED.length,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    return teams
      .map((team) => ({
        id: team._id,
        name: team.name,
        pot: team.pot,
        stageReached: team.stageReached ?? "group",
        isEliminated: team.isEliminated ?? false,
      }))
      .sort((a, b) => a.pot - b.pot || a.name.localeCompare(b.name));
  },
});

export const seedFromCode = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user || user.participantNumber !== 1) {
      throw new Error("Загрузить команды может только игрок номер 1.");
    }

    return await insertSeedTeams(ctx);
  },
});

export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    return await insertSeedTeams(ctx);
  },
});

export const validatePot = mutation({
  args: {
    pot: potValidator,
  },
  handler: async (_ctx, args) => args.pot,
});

export const validateStageReached = mutation({
  args: {
    stageReached: teamStageValidator,
  },
  handler: async (_ctx, args) => args.stageReached,
});
