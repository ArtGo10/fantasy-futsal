import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { matchDecisionValidator, matchStatusValidator } from "./validators";
import type { MatchStage } from "./validators";
import { v } from "convex/values";

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

type MatchStatus = "scheduled" | "live" | "completed";
type ApiFootballFixtureUpdate = {
  fixtureId: number;
  kickoffAt: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  apiStatus: string;
  status: MatchStatus;
  decidedBy?: "regular" | "extra_time" | "penalties";
  homeWinner: boolean | null;
  awayWinner: boolean | null;
};
type EspnFixtureUpdate = {
  eventId: string;
  kickoffAt: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  apiStatus: string;
  status: MatchStatus;
  decidedBy?: "regular" | "extra_time" | "penalties";
  homeWinner: boolean | null;
  awayWinner: boolean | null;
};

const MATCH_SEED: MatchSeed[] = [
  {"matchNumber":1,"externalId":"A1","group":"A","scheduledAt":"2026-06-11T19:00:00.000Z","sourceKickoff":"1:00 p.m. UTC−6","homeTeam":"Мексика","awayTeam":"ЮАР","homeScore":2,"awayScore":0,"status":"completed","venue":"Estadio Azteca, Mexico City"},
  {"matchNumber":2,"externalId":"A2","group":"A","scheduledAt":"2026-06-12T02:00:00.000Z","sourceKickoff":"8:00 p.m. UTC−6","homeTeam":"Южная Корея","awayTeam":"Чехия","homeScore":2,"awayScore":1,"status":"completed","venue":"Estadio Akron, Zapopan"},
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

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_SYNC_WINDOW_BEFORE_MS = 2 * 24 * 60 * 60 * 1000;
const ESPN_SYNC_WINDOW_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
const LIVE_API_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const COMPLETED_API_STATUSES = new Set(["FT", "AET", "PEN"]);
const SCHEDULED_API_STATUSES = new Set(["TBD", "NS", "PST"]);
const API_TEAM_NAME_ALIASES: Record<string, string> = {
  argentina: "Аргентина",
  spain: "Испания",
  france: "Франция",
  england: "Англия",
  portugal: "Португалия",
  brazil: "Бразилия",
  morocco: "Марокко",
  netherlands: "Нидерланды",
  belgium: "Бельгия",
  germany: "Германия",
  croatia: "Хорватия",
  colombia: "Колумбия",
  mexico: "Мексика",
  senegal: "Сенегал",
  uruguay: "Уругвай",
  usa: "США",
  "united states": "США",
  japan: "Япония",
  switzerland: "Швейцария",
  iran: "Иран",
  turkey: "Турция",
  turkiye: "Турция",
  ecuador: "Эквадор",
  austria: "Австрия",
  "south korea": "Южная Корея",
  "korea republic": "Южная Корея",
  "republic of korea": "Южная Корея",
  australia: "Австралия",
  algeria: "Алжир",
  egypt: "Египет",
  canada: "Канада",
  norway: "Норвегия",
  "cote divoire": "Кот-д’Ивуар",
  "cote d ivoire": "Кот-д’Ивуар",
  "ivory coast": "Кот-д’Ивуар",
  panama: "Панама",
  sweden: "Швеция",
  czechia: "Чехия",
  "czech republic": "Чехия",
  paraguay: "Парагвай",
  scotland: "Шотландия",
  tunisia: "Тунис",
  "dr congo": "ДР Конго",
  "congo dr": "ДР Конго",
  "democratic republic of the congo": "ДР Конго",
  uzbekistan: "Узбекистан",
  qatar: "Катар",
  iraq: "Ирак",
  "south africa": "ЮАР",
  "saudi arabia": "Саудовская Аравия",
  jordan: "Иордания",
  "bosnia and herzegovina": "Босния и Герцеговина",
  "bosnia herzegovina": "Босния и Герцеговина",
  "bosnia-herzegovina": "Босния и Герцеговина",
  "cape verde": "Кабо-Верде",
  "cape verde islands": "Кабо-Верде",
  ghana: "Гана",
  curacao: "Кюрасао",
  haiti: "Гаити",
  "new zealand": "Новая Зеландия",
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeComparableName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("ru-RU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toKnownTeamName(name: string) {
  const comparableName = normalizeComparableName(name);

  return API_TEAM_NAME_ALIASES[comparableName] ?? normalizeName(name);
}

function getVisibleMatchStatus(status: MatchStatus, scheduledAt: number, now: number) {
  if (status === "scheduled" && scheduledAt <= now) return "live";

  return status;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getApiFootballMatchStatus(statusShort: string): MatchStatus | null {
  if (COMPLETED_API_STATUSES.has(statusShort)) return "completed";
  if (LIVE_API_STATUSES.has(statusShort)) return "live";
  if (SCHEDULED_API_STATUSES.has(statusShort)) return "scheduled";

  return null;
}

function getApiFootballDecision(statusShort: string) {
  if (statusShort === "AET") return "extra_time";
  if (statusShort === "PEN") return "penalties";

  return "regular";
}

const nullableNumberValidator = v.union(v.number(), v.null());
const nullableBooleanValidator = v.union(v.boolean(), v.null());
const apiFootballFixtureUpdateValidator = v.object({
  fixtureId: v.number(),
  kickoffAt: v.number(),
  homeTeamName: v.string(),
  awayTeamName: v.string(),
  homeScore: nullableNumberValidator,
  awayScore: nullableNumberValidator,
  homePenaltyScore: nullableNumberValidator,
  awayPenaltyScore: nullableNumberValidator,
  apiStatus: v.string(),
  status: matchStatusValidator,
  decidedBy: v.optional(matchDecisionValidator),
  homeWinner: nullableBooleanValidator,
  awayWinner: nullableBooleanValidator,
});
const espnFixtureUpdateValidator = v.object({
  eventId: v.string(),
  kickoffAt: v.number(),
  homeTeamName: v.string(),
  awayTeamName: v.string(),
  homeScore: nullableNumberValidator,
  awayScore: nullableNumberValidator,
  homePenaltyScore: nullableNumberValidator,
  awayPenaltyScore: nullableNumberValidator,
  apiStatus: v.string(),
  status: matchStatusValidator,
  decidedBy: v.optional(matchDecisionValidator),
  homeWinner: nullableBooleanValidator,
  awayWinner: nullableBooleanValidator,
});

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function getNestedObject(value: Record<string, unknown> | null, key: string) {
  return value ? getObject(value[key]) : null;
}

function getNestedString(value: Record<string, unknown> | null, key: string) {
  const result = value?.[key];

  return typeof result === "string" ? result : null;
}

function getNestedBoolean(value: Record<string, unknown> | null, key: string) {
  const result = value?.[key];

  return typeof result === "boolean" ? result : null;
}

function toNullableScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());

  return null;
}

function toIdString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
}

function getEspnStatus(statusType: Record<string, unknown> | null): MatchStatus | null {
  const state = getNestedString(statusType, "state");
  const completed = getNestedBoolean(statusType, "completed");

  if (completed || state === "post") return "completed";
  if (state === "in") return "live";
  if (state === "pre") return "scheduled";

  return null;
}

function getEspnDecision(statusType: Record<string, unknown> | null) {
  const statusText = [
    getNestedString(statusType, "name"),
    getNestedString(statusType, "description"),
    getNestedString(statusType, "detail"),
    getNestedString(statusType, "shortDetail"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en-US");

  if (statusText.includes("pen")) return "penalties";
  if (statusText.includes("aet") || statusText.includes("extra")) return "extra_time";

  return "regular";
}

function getEspnCompetitorName(competitor: Record<string, unknown> | null) {
  const team = getNestedObject(competitor, "team");

  return (
    getNestedString(team, "displayName") ??
    getNestedString(team, "shortDisplayName") ??
    getNestedString(team, "name") ??
    getNestedString(team, "location")
  );
}

function normalizeEspnEvent(rawEvent: unknown): EspnFixtureUpdate | null {
  const event = getObject(rawEvent);
  const rawCompetitions = event && Array.isArray(event.competitions) ? event.competitions : [];
  const competition = rawCompetitions.map(getObject).find(Boolean) ?? null;
  const status = getNestedObject(competition, "status") ?? getNestedObject(event, "status");
  const statusType = getNestedObject(status, "type");
  const matchStatus = getEspnStatus(statusType);
  const rawCompetitors = competition && Array.isArray(competition.competitors) ? competition.competitors : [];
  const competitors = rawCompetitors.map(getObject).filter((competitor): competitor is Record<string, unknown> => Boolean(competitor));
  const homeCompetitor = competitors.find((competitor) => getNestedString(competitor, "homeAway") === "home") ?? null;
  const awayCompetitor = competitors.find((competitor) => getNestedString(competitor, "homeAway") === "away") ?? null;
  const eventId = toIdString(event?.id ?? competition?.id);
  const kickoffAt = Date.parse(
    getNestedString(competition, "startDate") ??
    getNestedString(competition, "date") ??
    getNestedString(event, "date") ??
    "",
  );
  const homeTeamName = getEspnCompetitorName(homeCompetitor);
  const awayTeamName = getEspnCompetitorName(awayCompetitor);
  const apiStatus =
    getNestedString(statusType, "name") ??
    getNestedString(statusType, "description") ??
    getNestedString(statusType, "shortDetail") ??
    "UNKNOWN";

  if (
    !eventId ||
    !Number.isFinite(kickoffAt) ||
    !homeTeamName ||
    !awayTeamName ||
    !matchStatus
  ) {
    return null;
  }

  return {
    eventId,
    kickoffAt,
    homeTeamName,
    awayTeamName,
    homeScore: matchStatus === "scheduled" ? null : toNullableScore(homeCompetitor?.score),
    awayScore: matchStatus === "scheduled" ? null : toNullableScore(awayCompetitor?.score),
    homePenaltyScore: null,
    awayPenaltyScore: null,
    apiStatus,
    status: matchStatus,
    decidedBy: matchStatus === "completed" ? getEspnDecision(statusType) : undefined,
    homeWinner: getNestedBoolean(homeCompetitor, "winner"),
    awayWinner: getNestedBoolean(awayCompetitor, "winner"),
  };
}

function normalizeApiFootballFixture(rawFixture: unknown): ApiFootballFixtureUpdate | null {
  const fixtureResponse = getObject(rawFixture);
  const fixture = getNestedObject(fixtureResponse, "fixture");
  const fixtureStatus = getNestedObject(fixture, "status");
  const teams = getNestedObject(fixtureResponse, "teams");
  const homeTeam = getNestedObject(teams, "home");
  const awayTeam = getNestedObject(teams, "away");
  const goals = getNestedObject(fixtureResponse, "goals");
  const score = getNestedObject(fixtureResponse, "score");
  const penaltyScore = getNestedObject(score, "penalty");

  const fixtureId = toNullableNumber(fixture?.id);
  const timestamp = toNullableNumber(fixture?.timestamp);
  const fixtureDate = getNestedString(fixture, "date");
  const kickoffAt = timestamp !== null ? timestamp * 1000 : Date.parse(fixtureDate ?? "");
  const homeTeamName = getNestedString(homeTeam, "name");
  const awayTeamName = getNestedString(awayTeam, "name");
  const apiStatus = getNestedString(fixtureStatus, "short");
  const status = apiStatus ? getApiFootballMatchStatus(apiStatus) : null;

  if (
    fixtureId === null ||
    !Number.isFinite(kickoffAt) ||
    !homeTeamName ||
    !awayTeamName ||
    !apiStatus ||
    !status
  ) {
    return null;
  }

  return {
    fixtureId,
    kickoffAt,
    homeTeamName,
    awayTeamName,
    homeScore: toNullableNumber(goals?.home),
    awayScore: toNullableNumber(goals?.away),
    homePenaltyScore: toNullableNumber(penaltyScore?.home),
    awayPenaltyScore: toNullableNumber(penaltyScore?.away),
    apiStatus,
    status,
    decidedBy: status === "completed" ? getApiFootballDecision(apiStatus) : undefined,
    homeWinner: getNestedBoolean(homeTeam, "winner"),
    awayWinner: getNestedBoolean(awayTeam, "winner"),
  };
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
    const now = Date.now();

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
        status: getVisibleMatchStatus(match.status, match.scheduledAt, now),
        storedStatus: match.status,
        apiFootballFixtureId: match.apiFootballFixtureId ?? null,
        apiFootballStatus: match.apiFootballStatus ?? null,
        apiFootballUpdatedAt: match.apiFootballUpdatedAt ?? null,
        espnEventId: match.espnEventId ?? null,
        espnStatus: match.espnStatus ?? null,
        espnUpdatedAt: match.espnUpdatedAt ?? null,
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

export const setResult = mutation({
  args: {
    externalId: v.string(),
    homeScore: v.number(),
    awayScore: v.number(),
    decidedBy: v.optional(matchDecisionValidator),
    homePenaltyScore: v.optional(v.number()),
    awayPenaltyScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("matches")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    if (!match) {
      throw new Error(`Матч ${args.externalId} не найден.`);
    }

    const winnerTeamId =
      args.homeScore > args.awayScore
        ? match.homeTeamId
        : args.awayScore > args.homeScore
          ? match.awayTeamId
          : undefined;

    await ctx.db.patch(match._id, {
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      winnerTeamId,
      decidedBy: args.decidedBy ?? "regular",
      homePenaltyScore: args.homePenaltyScore,
      awayPenaltyScore: args.awayPenaltyScore,
      status: "completed",
      updatedAt: Date.now(),
    });

    return {
      id: match._id,
      externalId: match.externalId,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      winnerTeamId,
      status: "completed",
    };
  },
});

function findMatchForApiFixture(matches: Doc<"matches">[], fixture: ApiFootballFixtureUpdate) {
  const matchByFixtureId = matches.find((match) => match.apiFootballFixtureId === fixture.fixtureId);
  if (matchByFixtureId) return { match: matchByFixtureId, isReversed: false };

  const apiHomeTeamName = normalizeName(toKnownTeamName(fixture.homeTeamName));
  const apiAwayTeamName = normalizeName(toKnownTeamName(fixture.awayTeamName));
  const candidates = matches
    .map((match) => {
      const exactTeams = match.homeTeamName === apiHomeTeamName && match.awayTeamName === apiAwayTeamName;
      const reversedTeams = match.homeTeamName === apiAwayTeamName && match.awayTeamName === apiHomeTeamName;

      if (!exactTeams && !reversedTeams) return null;

      return {
        match,
        isReversed: reversedTeams,
        kickoffDiffMs: Math.abs(match.scheduledAt - fixture.kickoffAt),
      };
    })
    .filter((candidate): candidate is { match: Doc<"matches">; isReversed: boolean; kickoffDiffMs: number } => Boolean(candidate))
    .sort((first, second) => first.kickoffDiffMs - second.kickoffDiffMs);

  return candidates[0] ?? null;
}

function findMatchForEspnFixture(matches: Doc<"matches">[], fixture: EspnFixtureUpdate) {
  const matchByEventId = matches.find((match) => match.espnEventId === fixture.eventId);
  if (matchByEventId) return { match: matchByEventId, isReversed: false };

  const espnHomeTeamName = normalizeName(toKnownTeamName(fixture.homeTeamName));
  const espnAwayTeamName = normalizeName(toKnownTeamName(fixture.awayTeamName));
  const candidates = matches
    .map((match) => {
      const exactTeams = match.homeTeamName === espnHomeTeamName && match.awayTeamName === espnAwayTeamName;
      const reversedTeams = match.homeTeamName === espnAwayTeamName && match.awayTeamName === espnHomeTeamName;

      if (!exactTeams && !reversedTeams) return null;

      return {
        match,
        isReversed: reversedTeams,
        kickoffDiffMs: Math.abs(match.scheduledAt - fixture.kickoffAt),
      };
    })
    .filter((candidate): candidate is { match: Doc<"matches">; isReversed: boolean; kickoffDiffMs: number } => Boolean(candidate))
    .sort((first, second) => first.kickoffDiffMs - second.kickoffDiffMs);

  return candidates[0] ?? null;
}

function getLocalWinnerTeamId(
  match: Doc<"matches">,
  fixture: ApiFootballFixtureUpdate | EspnFixtureUpdate,
  isReversed: boolean,
  homeScore: number,
  awayScore: number,
): Id<"teams"> | undefined {
  if (homeScore > awayScore) return match.homeTeamId;
  if (awayScore > homeScore) return match.awayTeamId;

  const apiWinnerSide = fixture.homeWinner ? "home" : fixture.awayWinner ? "away" : null;
  if (!apiWinnerSide) return undefined;

  const localWinnerSide =
    !isReversed ? apiWinnerSide : apiWinnerSide === "home" ? "away" : "home";

  return localWinnerSide === "home" ? match.homeTeamId : match.awayTeamId;
}

export const applyApiFootballFixtures = internalMutation({
  args: {
    fixtures: v.array(apiFootballFixtureUpdateValidator),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db.query("matches").collect();
    const now = Date.now();
    let matched = 0;
    let updated = 0;
    let completed = 0;
    let live = 0;
    let scheduled = 0;
    const unmatched: Array<{ fixtureId: number; homeTeamName: string; awayTeamName: string; apiStatus: string }> = [];

    for (const fixture of args.fixtures) {
      const matchResult = findMatchForApiFixture(matches, fixture);

      if (!matchResult) {
        unmatched.push({
          fixtureId: fixture.fixtureId,
          homeTeamName: fixture.homeTeamName,
          awayTeamName: fixture.awayTeamName,
          apiStatus: fixture.apiStatus,
        });
        continue;
      }

      const { match, isReversed } = matchResult;
      const homeScore = isReversed ? fixture.awayScore : fixture.homeScore;
      const awayScore = isReversed ? fixture.homeScore : fixture.awayScore;
      const homePenaltyScore = isReversed ? fixture.awayPenaltyScore : fixture.homePenaltyScore;
      const awayPenaltyScore = isReversed ? fixture.homePenaltyScore : fixture.awayPenaltyScore;
      const patch: Partial<Doc<"matches">> = {
        apiFootballFixtureId: fixture.fixtureId,
        apiFootballStatus: fixture.apiStatus,
        apiFootballUpdatedAt: now,
        updatedAt: now,
      };

      matched += 1;

      if (fixture.status === "completed" && homeScore !== null && awayScore !== null) {
        patch.status = "completed";
        patch.homeScore = homeScore;
        patch.awayScore = awayScore;
        patch.homePenaltyScore = homePenaltyScore ?? undefined;
        patch.awayPenaltyScore = awayPenaltyScore ?? undefined;
        patch.decidedBy = fixture.decidedBy ?? "regular";
        patch.winnerTeamId = getLocalWinnerTeamId(match, fixture, isReversed, homeScore, awayScore);
        completed += 1;
      } else if (fixture.status === "live" && match.status !== "completed") {
        patch.status = "live";
        if (homeScore !== null && awayScore !== null) {
          patch.homeScore = homeScore;
          patch.awayScore = awayScore;
        }
        live += 1;
      } else if (fixture.status === "scheduled" && match.status !== "completed") {
        patch.status = "scheduled";
        scheduled += 1;
      }

      await ctx.db.patch(match._id, patch);
      Object.assign(match, patch);
      updated += 1;
    }

    return {
      received: args.fixtures.length,
      matched,
      updated,
      completed,
      live,
      scheduled,
      unmatched: unmatched.slice(0, 12),
    };
  },
});

export const applyEspnFixtures = internalMutation({
  args: {
    fixtures: v.array(espnFixtureUpdateValidator),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db.query("matches").collect();
    const now = Date.now();
    let matched = 0;
    let updated = 0;
    let completed = 0;
    let live = 0;
    let scheduled = 0;
    const unmatched: Array<{ eventId: string; homeTeamName: string; awayTeamName: string; apiStatus: string }> = [];

    for (const fixture of args.fixtures) {
      const matchResult = findMatchForEspnFixture(matches, fixture);

      if (!matchResult) {
        unmatched.push({
          eventId: fixture.eventId,
          homeTeamName: fixture.homeTeamName,
          awayTeamName: fixture.awayTeamName,
          apiStatus: fixture.apiStatus,
        });
        continue;
      }

      const { match, isReversed } = matchResult;
      const homeScore = isReversed ? fixture.awayScore : fixture.homeScore;
      const awayScore = isReversed ? fixture.homeScore : fixture.awayScore;
      const homePenaltyScore = isReversed ? fixture.awayPenaltyScore : fixture.homePenaltyScore;
      const awayPenaltyScore = isReversed ? fixture.homePenaltyScore : fixture.awayPenaltyScore;
      const patch: Partial<Doc<"matches">> = {
        espnEventId: fixture.eventId,
        espnStatus: fixture.apiStatus,
        espnUpdatedAt: now,
        updatedAt: now,
      };

      matched += 1;

      if (fixture.status === "completed" && homeScore !== null && awayScore !== null) {
        patch.status = "completed";
        patch.homeScore = homeScore;
        patch.awayScore = awayScore;
        patch.homePenaltyScore = homePenaltyScore ?? undefined;
        patch.awayPenaltyScore = awayPenaltyScore ?? undefined;
        patch.decidedBy = fixture.decidedBy ?? "regular";
        patch.winnerTeamId = getLocalWinnerTeamId(match, fixture, isReversed, homeScore, awayScore);
        completed += 1;
      } else if (fixture.status === "live" && match.status !== "completed") {
        patch.status = "live";
        if (homeScore !== null && awayScore !== null) {
          patch.homeScore = homeScore;
          patch.awayScore = awayScore;
        }
        live += 1;
      } else if (fixture.status === "scheduled" && match.status !== "completed") {
        patch.status = "scheduled";
        scheduled += 1;
      }

      await ctx.db.patch(match._id, patch);
      Object.assign(match, patch);
      updated += 1;
    }

    return {
      received: args.fixtures.length,
      matched,
      updated,
      completed,
      live,
      scheduled,
      unmatched: unmatched.slice(0, 12),
    };
  },
});

function formatEspnDateKey(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function normalizeEspnDateInput(value: string) {
  const trimmedValue = value.trim();

  if (/^\d{8}$/.test(trimmedValue)) return trimmedValue;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) return trimmedValue.replaceAll("-", "");

  throw new Error("Дата для ESPN sync должна быть в формате YYYYMMDD или YYYY-MM-DD.");
}

function getEspnDateParam(args: { date?: string; startDate?: string; endDate?: string }) {
  if (args.date) return normalizeEspnDateInput(args.date);

  if (args.startDate || args.endDate) {
    if (!args.startDate || !args.endDate) {
      throw new Error("Для диапазона ESPN sync нужно указать и startDate, и endDate.");
    }

    return `${normalizeEspnDateInput(args.startDate)}-${normalizeEspnDateInput(args.endDate)}`;
  }

  const now = Date.now();
  return `${formatEspnDateKey(now - ESPN_SYNC_WINDOW_BEFORE_MS)}-${formatEspnDateKey(now + ESPN_SYNC_WINDOW_AFTER_MS)}`;
}

function getSyncErrorMessage(error: unknown, provider = "провайдера") {
  return error instanceof Error ? error.message : `Неизвестная ошибка ${provider}.`;
}

async function syncFromEspnHandler(
  ctx: ActionCtx,
  args: { date?: string; startDate?: string; endDate?: string },
): Promise<Record<string, unknown>> {
  const dateParam = getEspnDateParam(args);

  try {
    const url = new URL(ESPN_SCOREBOARD_URL);
    url.searchParams.set("dates", dateParam);

    const response = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: "espn",
        dateParam,
        error: `ESPN вернул HTTP ${response.status}.`,
      };
    }

    const payload = await response.json() as Record<string, unknown>;
    const rawEvents = Array.isArray(payload.events) ? payload.events : [];
    const fixtureMap = new Map<string, EspnFixtureUpdate>();

    for (const rawEvent of rawEvents) {
      const fixture = normalizeEspnEvent(rawEvent);
      if (fixture) {
        fixtureMap.set(fixture.eventId, fixture);
      }
    }

    const fixtures = [...fixtureMap.values()];
    const applyResult: Record<string, unknown> = await ctx.runMutation(internal.matches.applyEspnFixtures, {
      fixtures,
    });

    return {
      ok: true,
      provider: "espn",
      dateParam,
      fetched: rawEvents.length,
      normalized: fixtures.length,
      ...applyResult,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "espn",
      dateParam,
      error: getSyncErrorMessage(error, "ESPN"),
    };
  }
}

export const syncFromEspn = action({
  args: {
    date: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await syncFromEspnHandler(ctx, args);
  },
});

export const syncFromEspnInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    return await syncFromEspnHandler(ctx, {});
  },
});

function hasApiFootballErrors(errors: unknown) {
  if (Array.isArray(errors)) return errors.length > 0;
  if (errors && typeof errors === "object") return Object.keys(errors).length > 0;

  return Boolean(errors);
}

async function syncFromApiFootballHandler(ctx: ActionCtx): Promise<Record<string, unknown>> {
  const apiKey = process.env.FOOTBALL_API_KEY;
  const leagueId = process.env.FOOTBALL_API_LEAGUE_ID;
  const season = process.env.FOOTBALL_API_SEASON;

  if (!apiKey || !leagueId || !season) {
    return {
      ok: false,
      provider: "api-football",
      error: "Не настроены FOOTBALL_API_KEY, FOOTBALL_API_LEAGUE_ID или FOOTBALL_API_SEASON в Convex env.",
    };
  }

  try {
    const url = new URL(`${API_FOOTBALL_BASE_URL}/fixtures`);
    url.searchParams.set("league", leagueId);
    url.searchParams.set("season", season);

    const response = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: "api-football",
        leagueId,
        season,
        error: `API-Football вернул HTTP ${response.status}.`,
      };
    }

    const payload = await response.json() as Record<string, unknown>;
    if (hasApiFootballErrors(payload.errors)) {
      return {
        ok: false,
        provider: "api-football",
        leagueId,
        season,
        error: `API-Football вернул ошибку: ${JSON.stringify(payload.errors)}`,
      };
    }

    const rawFixtures = Array.isArray(payload.response) ? payload.response : [];
    const fixtures = rawFixtures
      .map(normalizeApiFootballFixture)
      .filter((fixture): fixture is ApiFootballFixtureUpdate => Boolean(fixture));
    const applyResult: Record<string, unknown> = await ctx.runMutation(internal.matches.applyApiFootballFixtures, {
      fixtures,
    });

    return {
      ok: true,
      provider: "api-football",
      leagueId,
      season,
      fetched: rawFixtures.length,
      normalized: fixtures.length,
      ...applyResult,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "api-football",
      leagueId,
      season,
      error: getSyncErrorMessage(error),
    };
  }
}

export const syncFromApiFootball = action({
  args: {},
  handler: async (ctx) => {
    return await syncFromApiFootballHandler(ctx);
  },
});

export const syncFromApiFootballInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    return await syncFromApiFootballHandler(ctx);
  },
});

async function syncLiveStatusesInDb(ctx: MutationCtx, now: number) {
  const scheduledMatches = await ctx.db
    .query("matches")
    .withIndex("by_status", (q) => q.eq("status", "scheduled"))
    .collect();
  const startedMatches = scheduledMatches.filter((match) => match.scheduledAt <= now);

  for (const match of startedMatches) {
    await ctx.db.patch(match._id, {
      status: "live",
      updatedAt: now,
    });
  }

  return {
    updated: startedMatches.length,
    checked: scheduledMatches.length,
  };
}

export const syncLiveStatuses = mutation({
  args: {
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await syncLiveStatusesInDb(ctx, args.now ?? Date.now());
  },
});

export const syncLiveStatusesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await syncLiveStatusesInDb(ctx, Date.now());
  },
});
