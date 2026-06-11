import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./authHelpers";
import { Pot, potValidator } from "./validators";

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

  { name: "Мексика", pot: 2 },
  { name: "Сенегал", pot: 2 },
  { name: "Уругвай", pot: 2 },
  { name: "США", pot: 2 },
  { name: "Япония", pot: 2 },
  { name: "Швейцария", pot: 2 },
  { name: "Иран", pot: 2 },
  { name: "Турция", pot: 2 },
  { name: "Эквадор", pot: 2 },
  { name: "Австрия", pot: 2 },
  { name: "Южная Корея", pot: 2 },
  { name: "Австралия", pot: 2 },

  { name: "Алжир", pot: 3 },
  { name: "Египет", pot: 3 },
  { name: "Канада", pot: 3 },
  { name: "Норвегия", pot: 3 },
  { name: "Кот-д’Ивуар", pot: 3 },
  { name: "Панама", pot: 3 },
  { name: "Швеция", pot: 3 },
  { name: "Чехия", pot: 3 },
  { name: "Парагвай", pot: 3 },
  { name: "Шотландия", pot: 3 },
  { name: "Тунис", pot: 3 },
  { name: "ДР Конго", pot: 3 },

  { name: "Узбекистан", pot: 4 },
  { name: "Катар", pot: 4 },
  { name: "Ирак", pot: 4 },
  { name: "ЮАР", pot: 4 },
  { name: "Саудовская Аравия", pot: 4 },
  { name: "Иордания", pot: 4 },
  { name: "Босния и Герцеговина", pot: 4 },
  { name: "Кабо-Верде", pot: 4 },
  { name: "Гана", pot: 4 },
  { name: "Кюрасао", pot: 4 },
  { name: "Гаити", pot: 4 },
  { name: "Новая Зеландия", pot: 4 },
];

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function validateTeamSeed() {
  if (TEAM_SEED.length !== 48) {
    throw new Error("Team seed is not configured yet.");
  }

  const names = new Set<string>();
  for (const team of TEAM_SEED) {
    const normalized = normalizeName(team.name);
    if (!normalized) {
      throw new Error("Team names cannot be empty.");
    }
    if (names.has(normalized.toLowerCase())) {
      throw new Error(`Duplicate team in seed: ${normalized}`);
    }
    names.add(normalized.toLowerCase());
  }

  const potCounts = new Map<Pot, number>();
  for (const team of TEAM_SEED) {
    potCounts.set(team.pot, (potCounts.get(team.pot) ?? 0) + 1);
  }

  for (const pot of [1, 2, 3, 4] as const) {
    if ((potCounts.get(pot) ?? 0) !== 12) {
      throw new Error(`Pot ${pot} must contain exactly 12 teams.`);
    }
  }
}

async function insertSeedTeams(ctx: MutationCtx) {
  validateTeamSeed();

  const existingAssignments = await ctx.db.query("teamAssignments").first();
  if (existingAssignments) {
    throw new Error("Teams cannot be reseeded after the draw has started.");
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
      createdAt: now,
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
      }))
      .sort((a, b) => a.pot - b.pot || a.name.localeCompare(b.name));
  },
});

export const seedFromCode = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user || user.participantNumber !== 1) {
      throw new Error("Only participant #1 can seed teams.");
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
