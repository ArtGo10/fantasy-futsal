import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { MatchStage } from "./validators";

type MatchSeed = {
  matchNumber: number;
  externalId: string;
  stage?: MatchStage;
  group: string;
  scheduledAt: string;
  sourceKickoff: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "completed";
  venue: string;
};

const MATCH_SEED: MatchSeed[] = [
  {"matchNumber":1,"externalId":"A1","group":"A","scheduledAt":"2026-06-11T19:00:00.000Z","sourceKickoff":"1:00 p.m. UTC−6","homeTeam":"Мексика","awayTeam":"ЮАР","homeScore":2,"awayScore":0,"status":"completed","venue":"Estadio Azteca, Mexico City"},
  {"matchNumber":2,"externalId":"A2","group":"A","scheduledAt":"2026-06-12T02:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−6","homeTeam":"Южная Корея","awayTeam":"Чехия","status":"scheduled","venue":"Estadio Akron, Zapopan"},
  {"matchNumber":3,"externalId":"A3","group":"A","scheduledAt":"2026-06-18T16:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−4","homeTeam":"Чехия","awayTeam":"ЮАР","status":"scheduled","venue":"Mercedes-Benz Stadium, Atlanta"},
  {"matchNumber":4,"externalId":"A4","group":"A","scheduledAt":"2026-06-19T01:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−6","homeTeam":"Мексика","awayTeam":"Южная Корея","status":"scheduled","venue":"Estadio Akron, Zapopan"},
  {"matchNumber":5,"externalId":"A5","group":"A","scheduledAt":"2026-06-25T01:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−6","homeTeam":"Чехия","awayTeam":"Мексика","status":"scheduled","venue":"Estadio Azteca, Mexico City"},
  {"matchNumber":6,"externalId":"A6","group":"A","scheduledAt":"2026-06-25T01:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−6","homeTeam":"ЮАР","awayTeam":"Южная Корея","status":"scheduled","venue":"Estadio BBVA, Guadalupe"},
  {"matchNumber":7,"externalId":"B1","group":"B","scheduledAt":"2026-06-12T19:00:00.000Z","sourceKickoff":"3:00 p.m. UTC−4","homeTeam":"Канада","awayTeam":"Босния и Герцеговина","status":"scheduled","venue":"BMO Field, Toronto"},
  {"matchNumber":8,"externalId":"B2","group":"B","scheduledAt":"2026-06-13T19:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−7","homeTeam":"Катар","awayTeam":"Швейцария","status":"scheduled","venue":"Levi's Stadium, Santa Clara"},
  {"matchNumber":9,"externalId":"B3","group":"B","scheduledAt":"2026-06-18T19:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−7","homeTeam":"Швейцария","awayTeam":"Босния и Герцеговина","status":"scheduled","venue":"SoFi Stadium, Inglewood"},
  {"matchNumber":10,"externalId":"B4","group":"B","scheduledAt":"2026-06-18T22:00:00.000Z","sourceKickoff":"3:00 p.m. UTC−7","homeTeam":"Канада","awayTeam":"Катар","status":"scheduled","venue":"BC Place, Vancouver"},
  {"matchNumber":11,"externalId":"B5","group":"B","scheduledAt":"2026-06-24T19:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−7","homeTeam":"Швейцария","awayTeam":"Канада","status":"scheduled","venue":"BC Place, Vancouver"},
  {"matchNumber":12,"externalId":"B6","group":"B","scheduledAt":"2026-06-24T19:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−7","homeTeam":"Босния и Герцеговина","awayTeam":"Катар","status":"scheduled","venue":"Lumen Field, Seattle"},
  {"matchNumber":13,"externalId":"C1","group":"C","scheduledAt":"2026-06-13T22:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−4","homeTeam":"Бразилия","awayTeam":"Марокко","status":"scheduled","venue":"MetLife Stadium, East Rutherford"},
  {"matchNumber":14,"externalId":"C2","group":"C","scheduledAt":"2026-06-14T01:00:00.000Z","sourceKickoff":"9:00 p.m. UTC−4","homeTeam":"Гаити","awayTeam":"Шотландия","status":"scheduled","venue":"Gillette Stadium, Foxborough"},
  {"matchNumber":15,"externalId":"C3","group":"C","scheduledAt":"2026-06-19T22:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−4","homeTeam":"Шотландия","awayTeam":"Марокко","status":"scheduled","venue":"Gillette Stadium, Foxborough"},
  {"matchNumber":16,"externalId":"C4","group":"C","scheduledAt":"2026-06-20T00:30:00.000Z","sourceKickoff":"8:30 p.m. UTC−4","homeTeam":"Бразилия","awayTeam":"Гаити","status":"scheduled","venue":"Lincoln Financial Field, Philadelphia"},
  {"matchNumber":17,"externalId":"C5","group":"C","scheduledAt":"2026-06-24T22:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−4","homeTeam":"Шотландия","awayTeam":"Бразилия","status":"scheduled","venue":"Hard Rock Stadium, Miami Gardens"},
  {"matchNumber":18,"externalId":"C6","group":"C","scheduledAt":"2026-06-24T22:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−4","homeTeam":"Марокко","awayTeam":"Гаити","status":"scheduled","venue":"Mercedes-Benz Stadium, Atlanta"},
  {"matchNumber":19,"externalId":"D1","group":"D","scheduledAt":"2026-06-13T01:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−7","homeTeam":"США","awayTeam":"Парагвай","status":"scheduled","venue":"SoFi Stadium, Inglewood"},
  {"matchNumber":20,"externalId":"D2","group":"D","scheduledAt":"2026-06-14T04:00:00.000Z","sourceKickoff":"9:00 p.m. UTC−7","homeTeam":"Австралия","awayTeam":"Турция","status":"scheduled","venue":"BC Place, Vancouver"},
  {"matchNumber":21,"externalId":"D3","group":"D","scheduledAt":"2026-06-19T19:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−7","homeTeam":"США","awayTeam":"Австралия","status":"scheduled","venue":"Lumen Field, Seattle"},
  {"matchNumber":22,"externalId":"D4","group":"D","scheduledAt":"2026-06-20T03:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−7","homeTeam":"Турция","awayTeam":"Парагвай","status":"scheduled","venue":"Levi's Stadium, Santa Clara"},
  {"matchNumber":23,"externalId":"D5","group":"D","scheduledAt":"2026-06-26T02:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−7","homeTeam":"Турция","awayTeam":"США","status":"scheduled","venue":"SoFi Stadium, Inglewood"},
  {"matchNumber":24,"externalId":"D6","group":"D","scheduledAt":"2026-06-26T02:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−7","homeTeam":"Парагвай","awayTeam":"Австралия","status":"scheduled","venue":"Levi's Stadium, Santa Clara"},
  {"matchNumber":25,"externalId":"E1","group":"E","scheduledAt":"2026-06-14T17:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−5","homeTeam":"Германия","awayTeam":"Кюрасао","status":"scheduled","venue":"NRG Stadium, Houston"},
  {"matchNumber":26,"externalId":"E2","group":"E","scheduledAt":"2026-06-14T23:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−4","homeTeam":"Кот-д’Ивуар","awayTeam":"Эквадор","status":"scheduled","venue":"Lincoln Financial Field, Philadelphia"},
  {"matchNumber":27,"externalId":"E3","group":"E","scheduledAt":"2026-06-20T20:00:00.000Z","sourceKickoff":"4:00 p.m. UTC−4","homeTeam":"Германия","awayTeam":"Кот-д’Ивуар","status":"scheduled","venue":"BMO Field, Toronto"},
  {"matchNumber":28,"externalId":"E4","group":"E","scheduledAt":"2026-06-21T00:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−5","homeTeam":"Эквадор","awayTeam":"Кюрасао","status":"scheduled","venue":"Arrowhead Stadium, Kansas City"},
  {"matchNumber":29,"externalId":"E5","group":"E","scheduledAt":"2026-06-25T20:00:00.000Z","sourceKickoff":"4:00 p.m. UTC−4","homeTeam":"Кюрасао","awayTeam":"Кот-д’Ивуар","status":"scheduled","venue":"Lincoln Financial Field, Philadelphia"},
  {"matchNumber":30,"externalId":"E6","group":"E","scheduledAt":"2026-06-25T20:00:00.000Z","sourceKickoff":"4:00 p.m. UTC−4","homeTeam":"Эквадор","awayTeam":"Германия","status":"scheduled","venue":"MetLife Stadium, East Rutherford"},
  {"matchNumber":31,"externalId":"F1","group":"F","scheduledAt":"2026-06-14T20:00:00.000Z","sourceKickoff":"3:00 p.m. UTC−5","homeTeam":"Нидерланды","awayTeam":"Япония","status":"scheduled","venue":"AT&T Stadium, Arlington"},
  {"matchNumber":32,"externalId":"F2","group":"F","scheduledAt":"2026-06-15T02:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−6","homeTeam":"Швеция","awayTeam":"Тунис","status":"scheduled","venue":"Estadio BBVA, Guadalupe"},
  {"matchNumber":33,"externalId":"F3","group":"F","scheduledAt":"2026-06-20T17:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−5","homeTeam":"Нидерланды","awayTeam":"Швеция","status":"scheduled","venue":"NRG Stadium, Houston"},
  {"matchNumber":34,"externalId":"F4","group":"F","scheduledAt":"2026-06-21T04:00:00.000Z","sourceKickoff":"10:00 p.m. UTC−6","homeTeam":"Тунис","awayTeam":"Япония","status":"scheduled","venue":"Estadio BBVA, Guadalupe"},
  {"matchNumber":35,"externalId":"F5","group":"F","scheduledAt":"2026-06-25T23:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−5","homeTeam":"Япония","awayTeam":"Швеция","status":"scheduled","venue":"AT&T Stadium, Arlington"},
  {"matchNumber":36,"externalId":"F6","group":"F","scheduledAt":"2026-06-25T23:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−5","homeTeam":"Тунис","awayTeam":"Нидерланды","status":"scheduled","venue":"Arrowhead Stadium, Kansas City"},
  {"matchNumber":37,"externalId":"G1","group":"G","scheduledAt":"2026-06-15T19:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−7","homeTeam":"Бельгия","awayTeam":"Египет","status":"scheduled","venue":"Lumen Field, Seattle"},
  {"matchNumber":38,"externalId":"G2","group":"G","scheduledAt":"2026-06-16T01:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−7","homeTeam":"Иран","awayTeam":"Новая Зеландия","status":"scheduled","venue":"SoFi Stadium, Inglewood"},
  {"matchNumber":39,"externalId":"G3","group":"G","scheduledAt":"2026-06-21T19:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−7","homeTeam":"Бельгия","awayTeam":"Иран","status":"scheduled","venue":"SoFi Stadium, Inglewood"},
  {"matchNumber":40,"externalId":"G4","group":"G","scheduledAt":"2026-06-22T01:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−7","homeTeam":"Новая Зеландия","awayTeam":"Египет","status":"scheduled","venue":"BC Place, Vancouver"},
  {"matchNumber":41,"externalId":"G5","group":"G","scheduledAt":"2026-06-27T03:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−7","homeTeam":"Египет","awayTeam":"Иран","status":"scheduled","venue":"Lumen Field, Seattle"},
  {"matchNumber":42,"externalId":"G6","group":"G","scheduledAt":"2026-06-27T03:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−7","homeTeam":"Новая Зеландия","awayTeam":"Бельгия","status":"scheduled","venue":"BC Place, Vancouver"},
  {"matchNumber":43,"externalId":"H1","group":"H","scheduledAt":"2026-06-15T16:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−4","homeTeam":"Испания","awayTeam":"Кабо-Верде","status":"scheduled","venue":"Mercedes-Benz Stadium, Atlanta"},
  {"matchNumber":44,"externalId":"H2","group":"H","scheduledAt":"2026-06-15T22:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−4","homeTeam":"Саудовская Аравия","awayTeam":"Уругвай","status":"scheduled","venue":"Hard Rock Stadium, Miami Gardens"},
  {"matchNumber":45,"externalId":"H3","group":"H","scheduledAt":"2026-06-21T16:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−4","homeTeam":"Испания","awayTeam":"Саудовская Аравия","status":"scheduled","venue":"Mercedes-Benz Stadium, Atlanta"},
  {"matchNumber":46,"externalId":"H4","group":"H","scheduledAt":"2026-06-21T22:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−4","homeTeam":"Уругвай","awayTeam":"Кабо-Верде","status":"scheduled","venue":"Hard Rock Stadium, Miami Gardens"},
  {"matchNumber":47,"externalId":"H5","group":"H","scheduledAt":"2026-06-27T00:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−5","homeTeam":"Кабо-Верде","awayTeam":"Саудовская Аравия","status":"scheduled","venue":"NRG Stadium, Houston"},
  {"matchNumber":48,"externalId":"H6","group":"H","scheduledAt":"2026-06-27T00:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−6","homeTeam":"Уругвай","awayTeam":"Испания","status":"scheduled","venue":"Estadio Akron, Zapopan"},
  {"matchNumber":49,"externalId":"I1","group":"I","scheduledAt":"2026-06-16T19:00:00.000Z","sourceKickoff":"3:00 p.m. UTC−4","homeTeam":"Франция","awayTeam":"Сенегал","status":"scheduled","venue":"MetLife Stadium, East Rutherford"},
  {"matchNumber":50,"externalId":"I2","group":"I","scheduledAt":"2026-06-16T22:00:00.000Z","sourceKickoff":"6:00 p.m. UTC−4","homeTeam":"Ирак","awayTeam":"Норвегия","status":"scheduled","venue":"Gillette Stadium, Foxborough"},
  {"matchNumber":51,"externalId":"I3","group":"I","scheduledAt":"2026-06-22T21:00:00.000Z","sourceKickoff":"5:00 p.m. UTC−4","homeTeam":"Франция","awayTeam":"Ирак","status":"scheduled","venue":"Lincoln Financial Field, Philadelphia"},
  {"matchNumber":52,"externalId":"I4","group":"I","scheduledAt":"2026-06-23T00:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−4","homeTeam":"Норвегия","awayTeam":"Сенегал","status":"scheduled","venue":"MetLife Stadium, East Rutherford"},
  {"matchNumber":53,"externalId":"I5","group":"I","scheduledAt":"2026-06-26T19:00:00.000Z","sourceKickoff":"3:00 p.m. UTC−4","homeTeam":"Норвегия","awayTeam":"Франция","status":"scheduled","venue":"Gillette Stadium, Foxborough"},
  {"matchNumber":54,"externalId":"I6","group":"I","scheduledAt":"2026-06-26T19:00:00.000Z","sourceKickoff":"3:00 p.m. UTC−4","homeTeam":"Сенегал","awayTeam":"Ирак","status":"scheduled","venue":"BMO Field, Toronto"},
  {"matchNumber":55,"externalId":"J1","group":"J","scheduledAt":"2026-06-17T01:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−5","homeTeam":"Аргентина","awayTeam":"Алжир","status":"scheduled","venue":"Arrowhead Stadium, Kansas City"},
  {"matchNumber":56,"externalId":"J2","group":"J","scheduledAt":"2026-06-17T04:00:00.000Z","sourceKickoff":"9:00 p.m. UTC−7","homeTeam":"Австрия","awayTeam":"Иордания","status":"scheduled","venue":"Levi's Stadium, Santa Clara"},
  {"matchNumber":57,"externalId":"J3","group":"J","scheduledAt":"2026-06-22T17:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−5","homeTeam":"Аргентина","awayTeam":"Австрия","status":"scheduled","venue":"AT&T Stadium, Arlington"},
  {"matchNumber":58,"externalId":"J4","group":"J","scheduledAt":"2026-06-23T03:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−7","homeTeam":"Иордания","awayTeam":"Алжир","status":"scheduled","venue":"Levi's Stadium, Santa Clara"},
  {"matchNumber":59,"externalId":"J5","group":"J","scheduledAt":"2026-06-28T02:00:00.000Z","sourceKickoff":"9:00 p.m. UTC−5","homeTeam":"Алжир","awayTeam":"Австрия","status":"scheduled","venue":"Arrowhead Stadium, Kansas City"},
  {"matchNumber":60,"externalId":"J6","group":"J","scheduledAt":"2026-06-28T02:00:00.000Z","sourceKickoff":"9:00 p.m. UTC−5","homeTeam":"Иордания","awayTeam":"Аргентина","status":"scheduled","venue":"AT&T Stadium, Arlington"},
  {"matchNumber":61,"externalId":"K1","group":"K","scheduledAt":"2026-06-17T17:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−5","homeTeam":"Португалия","awayTeam":"ДР Конго","status":"scheduled","venue":"NRG Stadium, Houston"},
  {"matchNumber":62,"externalId":"K2","group":"K","scheduledAt":"2026-06-18T02:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−6","homeTeam":"Узбекистан","awayTeam":"Колумбия","status":"scheduled","venue":"Estadio Azteca, Mexico City"},
  {"matchNumber":63,"externalId":"K3","group":"K","scheduledAt":"2026-06-23T17:00:00.000Z","sourceKickoff":"12:00 p.m. UTC−5","homeTeam":"Португалия","awayTeam":"Узбекистан","status":"scheduled","venue":"NRG Stadium, Houston"},
  {"matchNumber":64,"externalId":"K4","group":"K","scheduledAt":"2026-06-24T02:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−6","homeTeam":"Колумбия","awayTeam":"ДР Конго","status":"scheduled","venue":"Estadio Akron, Zapopan"},
  {"matchNumber":65,"externalId":"K5","group":"K","scheduledAt":"2026-06-27T23:30:00.000Z","sourceKickoff":"7:30 p.m. UTC−4","homeTeam":"Колумбия","awayTeam":"Португалия","status":"scheduled","venue":"Hard Rock Stadium, Miami Gardens"},
  {"matchNumber":66,"externalId":"K6","group":"K","scheduledAt":"2026-06-27T23:30:00.000Z","sourceKickoff":"7:30 p.m. UTC−4","homeTeam":"ДР Конго","awayTeam":"Узбекистан","status":"scheduled","venue":"Mercedes-Benz Stadium, Atlanta"},
  {"matchNumber":67,"externalId":"L1","group":"L","scheduledAt":"2026-06-17T20:00:00.000Z","sourceKickoff":"3:00 p.m. UTC−5","homeTeam":"Англия","awayTeam":"Хорватия","status":"scheduled","venue":"AT&T Stadium, Arlington"},
  {"matchNumber":68,"externalId":"L2","group":"L","scheduledAt":"2026-06-17T23:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−4","homeTeam":"Гана","awayTeam":"Панама","status":"scheduled","venue":"BMO Field, Toronto"},
  {"matchNumber":69,"externalId":"L3","group":"L","scheduledAt":"2026-06-23T20:00:00.000Z","sourceKickoff":"4:00 p.m. UTC−4","homeTeam":"Англия","awayTeam":"Гана","status":"scheduled","venue":"Gillette Stadium, Foxborough"},
  {"matchNumber":70,"externalId":"L4","group":"L","scheduledAt":"2026-06-23T23:00:00.000Z","sourceKickoff":"7:00 p.m. UTC−4","homeTeam":"Панама","awayTeam":"Хорватия","status":"scheduled","venue":"BMO Field, Toronto"},
  {"matchNumber":71,"externalId":"L5","group":"L","scheduledAt":"2026-06-27T21:00:00.000Z","sourceKickoff":"5:00 p.m. UTC−4","homeTeam":"Панама","awayTeam":"Англия","status":"scheduled","venue":"MetLife Stadium, East Rutherford"},
  {"matchNumber":72,"externalId":"L6","group":"L","scheduledAt":"2026-06-27T21:00:00.000Z","sourceKickoff":"5:00 p.m. UTC−4","homeTeam":"Хорватия","awayTeam":"Гана","status":"scheduled","venue":"Lincoln Financial Field, Philadelphia"},
];

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function insertSeedMatches(ctx: MutationCtx) {
  if (MATCH_SEED.length !== 72) {
    throw new Error("Список матчей должен содержать 72 матча группового этапа.");
  }

  const existingMatch = await ctx.db.query("matches").first();
  if (existingMatch) {
    const totalMatches = (await ctx.db.query("matches").collect()).length;
    return {
      inserted: 0,
      alreadySeeded: true,
      totalMatches,
    };
  }

  const teams = await ctx.db.query("teams").collect();
  const teamByName = new Map(teams.map((team) => [normalizeName(team.name), team]));
  const now = Date.now();

  for (const match of MATCH_SEED) {
    const homeTeam = teamByName.get(normalizeName(match.homeTeam));
    const awayTeam = teamByName.get(normalizeName(match.awayTeam));

    if (!homeTeam || !awayTeam) {
      throw new Error(`В списке матчей указана неизвестная команда: ${match.homeTeam} - ${match.awayTeam}.`);
    }

    await ctx.db.insert("matches", {
      externalId: match.externalId,
      matchNumber: match.matchNumber,
      stage: match.stage ?? "group",
      group: match.group,
      scheduledAt: Date.parse(match.scheduledAt),
      sourceKickoff: match.sourceKickoff,
      homeTeamId: homeTeam._id,
      awayTeamId: awayTeam._id,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      ...(match.homeScore === undefined ? {} : { homeScore: match.homeScore }),
      ...(match.awayScore === undefined ? {} : { awayScore: match.awayScore }),
      status: match.status,
      venue: match.venue,
      source: "wikipedia:fifa-scores-fixtures",
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    inserted: MATCH_SEED.length,
    alreadySeeded: false,
    totalMatches: MATCH_SEED.length,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("matches").collect();

    return matches
      .map((match) => ({
        id: match._id,
        externalId: match.externalId,
        matchNumber: match.matchNumber,
        stage: match.stage,
        group: match.group ?? null,
        scheduledAt: match.scheduledAt,
        sourceKickoff: match.sourceKickoff,
        homeTeam: {
          id: match.homeTeamId,
          name: match.homeTeamName,
        },
        awayTeam: {
          id: match.awayTeamId,
          name: match.awayTeamName,
        },
        homeScore: match.homeScore ?? null,
        awayScore: match.awayScore ?? null,
        winnerTeamId: match.winnerTeamId ?? null,
        decidedBy: match.decidedBy ?? null,
        homePenaltyScore: match.homePenaltyScore ?? null,
        awayPenaltyScore: match.awayPenaltyScore ?? null,
        status: match.status,
        venue: match.venue ?? null,
      }))
      .sort((a, b) => a.scheduledAt - b.scheduledAt || a.matchNumber - b.matchNumber);
  },
});

export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    return await insertSeedMatches(ctx);
  },
});
