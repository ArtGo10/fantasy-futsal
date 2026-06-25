import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./authHelpers";
import { matchDecisionValidator, matchStageValidator, matchStatusValidator } from "./validators";
import type { MatchStage, TeamStage } from "./validators";
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
type KnockoutMatchSeed = {
  matchNumber: number;
  externalId: string;
  stage: MatchStage;
  scheduledAt: string;
  sourceKickoff: string;
  homeSlot: string;
  awaySlot: string;
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
type EspnStandingUpdate = {
  group: string;
  teamName: string;
  rank: number | null;
  gamesPlayed: number | null;
  advanced: boolean;
  eliminated: boolean;
  note: string | null;
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

const KNOCKOUT_MATCH_SEED: KnockoutMatchSeed[] = [
  { matchNumber: 73, externalId: "M73", stage: "round_of_32", scheduledAt: "2026-06-28T19:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-7", homeSlot: "2-е место группы A", awaySlot: "2-е место группы B", venue: "SoFi Stadium, Inglewood" },
  { matchNumber: 74, externalId: "M74", stage: "round_of_32", scheduledAt: "2026-06-29T20:30:00.000Z", sourceKickoff: "4:30 p.m. UTC-4", homeSlot: "Победитель группы E", awaySlot: "3-е место группы A/B/C/D/F", venue: "Gillette Stadium, Foxborough" },
  { matchNumber: 75, externalId: "M75", stage: "round_of_32", scheduledAt: "2026-06-30T01:00:00.000Z", sourceKickoff: "7:00 p.m. UTC-6", homeSlot: "Победитель группы F", awaySlot: "2-е место группы C", venue: "Estadio BBVA, Guadalupe" },
  { matchNumber: 76, externalId: "M76", stage: "round_of_32", scheduledAt: "2026-06-29T17:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-5", homeSlot: "Победитель группы C", awaySlot: "2-е место группы F", venue: "NRG Stadium, Houston" },
  { matchNumber: 77, externalId: "M77", stage: "round_of_32", scheduledAt: "2026-06-30T21:00:00.000Z", sourceKickoff: "5:00 p.m. UTC-4", homeSlot: "Победитель группы I", awaySlot: "3-е место группы C/D/F/G/H", venue: "MetLife Stadium, East Rutherford" },
  { matchNumber: 78, externalId: "M78", stage: "round_of_32", scheduledAt: "2026-06-30T17:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-5", homeSlot: "2-е место группы E", awaySlot: "2-е место группы I", venue: "AT&T Stadium, Arlington" },
  { matchNumber: 79, externalId: "M79", stage: "round_of_32", scheduledAt: "2026-07-01T01:00:00.000Z", sourceKickoff: "7:00 p.m. UTC-6", homeSlot: "Победитель группы A", awaySlot: "3-е место группы C/E/F/H/I", venue: "Estadio Azteca, Mexico City" },
  { matchNumber: 80, externalId: "M80", stage: "round_of_32", scheduledAt: "2026-07-01T16:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-4", homeSlot: "Победитель группы L", awaySlot: "3-е место группы E/H/I/J/K", venue: "Mercedes-Benz Stadium, Atlanta" },
  { matchNumber: 81, externalId: "M81", stage: "round_of_32", scheduledAt: "2026-07-02T00:00:00.000Z", sourceKickoff: "5:00 p.m. UTC-7", homeSlot: "Победитель группы D", awaySlot: "3-е место группы B/E/F/I/J", venue: "Levi's Stadium, Santa Clara" },
  { matchNumber: 82, externalId: "M82", stage: "round_of_32", scheduledAt: "2026-07-01T20:00:00.000Z", sourceKickoff: "1:00 p.m. UTC-7", homeSlot: "Победитель группы G", awaySlot: "3-е место группы A/E/H/I/J", venue: "Lumen Field, Seattle" },
  { matchNumber: 83, externalId: "M83", stage: "round_of_32", scheduledAt: "2026-07-02T23:00:00.000Z", sourceKickoff: "7:00 p.m. UTC-4", homeSlot: "2-е место группы K", awaySlot: "2-е место группы L", venue: "BMO Field, Toronto" },
  { matchNumber: 84, externalId: "M84", stage: "round_of_32", scheduledAt: "2026-07-02T19:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-7", homeSlot: "Победитель группы H", awaySlot: "2-е место группы J", venue: "SoFi Stadium, Inglewood" },
  { matchNumber: 85, externalId: "M85", stage: "round_of_32", scheduledAt: "2026-07-03T03:00:00.000Z", sourceKickoff: "8:00 p.m. UTC-7", homeSlot: "Победитель группы B", awaySlot: "3-е место группы E/F/G/I/J", venue: "BC Place, Vancouver" },
  { matchNumber: 86, externalId: "M86", stage: "round_of_32", scheduledAt: "2026-07-03T22:00:00.000Z", sourceKickoff: "6:00 p.m. UTC-4", homeSlot: "Победитель группы J", awaySlot: "2-е место группы H", venue: "Hard Rock Stadium, Miami Gardens" },
  { matchNumber: 87, externalId: "M87", stage: "round_of_32", scheduledAt: "2026-07-04T01:30:00.000Z", sourceKickoff: "8:30 p.m. UTC-5", homeSlot: "Победитель группы K", awaySlot: "3-е место группы D/E/I/J/L", venue: "Arrowhead Stadium, Kansas City" },
  { matchNumber: 88, externalId: "M88", stage: "round_of_32", scheduledAt: "2026-07-03T18:00:00.000Z", sourceKickoff: "1:00 p.m. UTC-5", homeSlot: "2-е место группы D", awaySlot: "2-е место группы G", venue: "AT&T Stadium, Arlington" },
  { matchNumber: 89, externalId: "M89", stage: "round_of_16", scheduledAt: "2026-07-04T21:00:00.000Z", sourceKickoff: "5:00 p.m. UTC-4", homeSlot: "Победитель матча 74", awaySlot: "Победитель матча 77", venue: "Lincoln Financial Field, Philadelphia" },
  { matchNumber: 90, externalId: "M90", stage: "round_of_16", scheduledAt: "2026-07-04T17:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-5", homeSlot: "Победитель матча 73", awaySlot: "Победитель матча 75", venue: "NRG Stadium, Houston" },
  { matchNumber: 91, externalId: "M91", stage: "round_of_16", scheduledAt: "2026-07-05T20:00:00.000Z", sourceKickoff: "4:00 p.m. UTC-4", homeSlot: "Победитель матча 76", awaySlot: "Победитель матча 78", venue: "MetLife Stadium, East Rutherford" },
  { matchNumber: 92, externalId: "M92", stage: "round_of_16", scheduledAt: "2026-07-06T00:00:00.000Z", sourceKickoff: "6:00 p.m. UTC-6", homeSlot: "Победитель матча 79", awaySlot: "Победитель матча 80", venue: "Estadio Azteca, Mexico City" },
  { matchNumber: 93, externalId: "M93", stage: "round_of_16", scheduledAt: "2026-07-06T19:00:00.000Z", sourceKickoff: "2:00 p.m. UTC-5", homeSlot: "Победитель матча 83", awaySlot: "Победитель матча 84", venue: "AT&T Stadium, Arlington" },
  { matchNumber: 94, externalId: "M94", stage: "round_of_16", scheduledAt: "2026-07-07T00:00:00.000Z", sourceKickoff: "5:00 p.m. UTC-7", homeSlot: "Победитель матча 81", awaySlot: "Победитель матча 82", venue: "Lumen Field, Seattle" },
  { matchNumber: 95, externalId: "M95", stage: "round_of_16", scheduledAt: "2026-07-07T16:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-4", homeSlot: "Победитель матча 86", awaySlot: "Победитель матча 88", venue: "Mercedes-Benz Stadium, Atlanta" },
  { matchNumber: 96, externalId: "M96", stage: "round_of_16", scheduledAt: "2026-07-07T20:00:00.000Z", sourceKickoff: "1:00 p.m. UTC-7", homeSlot: "Победитель матча 85", awaySlot: "Победитель матча 87", venue: "BC Place, Vancouver" },
  { matchNumber: 97, externalId: "M97", stage: "quarter_final", scheduledAt: "2026-07-09T20:00:00.000Z", sourceKickoff: "4:00 p.m. UTC-4", homeSlot: "Победитель матча 89", awaySlot: "Победитель матча 90", venue: "Gillette Stadium, Foxborough" },
  { matchNumber: 98, externalId: "M98", stage: "quarter_final", scheduledAt: "2026-07-10T19:00:00.000Z", sourceKickoff: "12:00 p.m. UTC-7", homeSlot: "Победитель матча 93", awaySlot: "Победитель матча 94", venue: "SoFi Stadium, Inglewood" },
  { matchNumber: 99, externalId: "M99", stage: "quarter_final", scheduledAt: "2026-07-11T21:00:00.000Z", sourceKickoff: "5:00 p.m. UTC-4", homeSlot: "Победитель матча 91", awaySlot: "Победитель матча 92", venue: "Hard Rock Stadium, Miami Gardens" },
  { matchNumber: 100, externalId: "M100", stage: "quarter_final", scheduledAt: "2026-07-12T01:00:00.000Z", sourceKickoff: "8:00 p.m. UTC-5", homeSlot: "Победитель матча 95", awaySlot: "Победитель матча 96", venue: "Arrowhead Stadium, Kansas City" },
  { matchNumber: 101, externalId: "M101", stage: "semi_final", scheduledAt: "2026-07-14T19:00:00.000Z", sourceKickoff: "2:00 p.m. UTC-5", homeSlot: "Победитель матча 97", awaySlot: "Победитель матча 98", venue: "AT&T Stadium, Arlington" },
  { matchNumber: 102, externalId: "M102", stage: "semi_final", scheduledAt: "2026-07-15T19:00:00.000Z", sourceKickoff: "3:00 p.m. UTC-4", homeSlot: "Победитель матча 99", awaySlot: "Победитель матча 100", venue: "Mercedes-Benz Stadium, Atlanta" },
  { matchNumber: 103, externalId: "M103", stage: "third_place", scheduledAt: "2026-07-18T21:00:00.000Z", sourceKickoff: "5:00 p.m. UTC-4", homeSlot: "Проигравший матча 101", awaySlot: "Проигравший матча 102", venue: "Hard Rock Stadium, Miami Gardens" },
  { matchNumber: 104, externalId: "M104", stage: "final", scheduledAt: "2026-07-19T19:00:00.000Z", sourceKickoff: "3:00 p.m. UTC-4", homeSlot: "Победитель матча 101", awaySlot: "Победитель матча 102", venue: "MetLife Stadium, East Rutherford" },
];

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_GROUPS_URL = "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/1/groups?lang=en&region=us";
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
const espnStandingUpdateValidator = v.object({
  group: v.string(),
  teamName: v.string(),
  rank: nullableNumberValidator,
  gamesPlayed: nullableNumberValidator,
  advanced: v.boolean(),
  eliminated: v.boolean(),
  note: v.union(v.string(), v.null()),
});
const syncLogValidator = v.object({
  provider: v.string(),
  ok: v.boolean(),
  dateParam: v.optional(v.string()),
  fetched: v.optional(v.number()),
  normalized: v.optional(v.number()),
  matched: v.optional(v.number()),
  updated: v.optional(v.number()),
  completed: v.optional(v.number()),
  live: v.optional(v.number()),
  scheduled: v.optional(v.number()),
  unmatched: v.optional(v.number()),
  error: v.optional(v.string()),
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

function getEspnRefUrl(value: unknown) {
  const ref = getNestedString(getObject(value), "$ref");

  return ref ? ref.replace(/^http:\/\//, "https://") : null;
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

function findScoreLikeNumber(value: unknown, depth = 0): number | null {
  if (depth > 4) return null;

  const directScore = toNullableScore(value);
  if (directScore !== null) return directScore;

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findScoreLikeNumber(item, depth + 1);
      if (result !== null) return result;
    }

    return null;
  }

  const object = getObject(value);
  if (!object) return null;

  for (const key of ["score", "value", "displayValue", "shootoutScore", "penaltyScore", "penalties"]) {
    const result = findScoreLikeNumber(object[key], depth + 1);
    if (result !== null) return result;
  }

  for (const nestedValue of Object.values(object)) {
    const result = findScoreLikeNumber(nestedValue, depth + 1);
    if (result !== null) return result;
  }

  return null;
}

function getEspnPenaltyScore(competitor: Record<string, unknown> | null) {
  if (!competitor) return null;

  for (const key of Object.keys(competitor)) {
    if (!/(pen|shootout)/i.test(key)) continue;

    const result = findScoreLikeNumber(competitor[key]);
    if (result !== null) return result;
  }

  const linescores = Array.isArray(competitor.linescores) ? competitor.linescores : [];
  for (const rawLineScore of linescores) {
    const lineScore = getObject(rawLineScore);
    if (!lineScore) continue;

    const lineScoreText = [
      getNestedString(lineScore, "period"),
      getNestedString(lineScore, "periodName"),
      getNestedString(lineScore, "displayName"),
      getNestedString(lineScore, "name"),
      getNestedString(lineScore, "type"),
    ]
      .filter(Boolean)
      .join(" ");

    if (!/(pen|shootout)/i.test(lineScoreText)) continue;

    const result = findScoreLikeNumber(lineScore);
    if (result !== null) return result;
  }

  return null;
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
    homePenaltyScore: getEspnPenaltyScore(homeCompetitor),
    awayPenaltyScore: getEspnPenaltyScore(awayCompetitor),
    apiStatus,
    status: matchStatus,
    decidedBy: matchStatus === "completed" ? getEspnDecision(statusType) : undefined,
    homeWinner: getNestedBoolean(homeCompetitor, "winner"),
    awayWinner: getNestedBoolean(awayCompetitor, "winner"),
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

function getEspnCollectionRefs(collection: Record<string, unknown>) {
  const items = Array.isArray(collection.items) ? collection.items : [];

  return items
    .map(getEspnRefUrl)
    .filter((ref): ref is string => Boolean(ref));
}

function getEspnGroupLetter(group: Record<string, unknown>, fallbackIndex: number) {
  const groupName = [
    getNestedString(group, "name"),
    getNestedString(group, "abbreviation"),
  ]
    .filter(Boolean)
    .join(" ");
  const groupMatch = groupName.match(/\bGroup\s+([A-L])\b/i);

  if (groupMatch) return groupMatch[1].toLocaleUpperCase("en-US");

  const groupId = Number(toIdString(group.id));
  if (Number.isInteger(groupId) && groupId >= 1 && groupId <= 12) {
    return String.fromCharCode("A".charCodeAt(0) + groupId - 1);
  }

  return String.fromCharCode("A".charCodeAt(0) + fallbackIndex);
}

function getEspnTeamName(team: Record<string, unknown> | null) {
  return (
    getNestedString(team, "displayName") ??
    getNestedString(team, "shortDisplayName") ??
    getNestedString(team, "name") ??
    getNestedString(team, "location")
  );
}

function getEspnStandingStat(standing: Record<string, unknown>, statName: string) {
  const records = Array.isArray(standing.records) ? standing.records : [];
  const record = records.map(getObject).find(Boolean);
  const stats = record && Array.isArray(record.stats) ? record.stats : [];

  for (const rawStat of stats) {
    const stat = getObject(rawStat);
    if (!stat || getNestedString(stat, "name") !== statName) continue;

    return toNullableNumber(stat.value);
  }

  return null;
}

async function fetchEspnStandingTeamName(teamRef: string, cache: Map<string, string>) {
  const cachedName = cache.get(teamRef);
  if (cachedName) return cachedName;

  const teamPayload = await fetchEspnJson(teamRef);
  const teamName = getEspnTeamName(teamPayload);
  if (!teamName) {
    throw new Error(`ESPN standings содержит команду без названия: ${teamRef}.`);
  }

  const knownTeamName = toKnownTeamName(teamName);
  cache.set(teamRef, knownTeamName);

  return knownTeamName;
}

async function fetchEspnStandings() {
  const groupsCollection = await fetchEspnJson(ESPN_GROUPS_URL);
  const groupRefs = getEspnCollectionRefs(groupsCollection);
  const groupPayloads = await Promise.all(groupRefs.map(fetchEspnJson));
  const standingsPayloads = await Promise.all(
    groupPayloads.map(async (group, index) => {
      const groupLetter = getEspnGroupLetter(group, index);
      const standingsCollectionRef = getEspnRefUrl(group.standings);

      if (!standingsCollectionRef) {
        throw new Error(`ESPN не вернул standings для группы ${groupLetter}.`);
      }

      const standingsCollection = await fetchEspnJson(standingsCollectionRef);
      const standingsRefs = getEspnCollectionRefs(standingsCollection);
      const standingsRef = standingsRefs[0] ?? `${standingsCollectionRef.replace(/\?.*$/, "")}/0?lang=en&region=us`;
      const standingsPayload = await fetchEspnJson(standingsRef);

      return {
        group: groupLetter,
        standings: Array.isArray(standingsPayload.standings) ? standingsPayload.standings : [],
      };
    }),
  );
  const teamRefs = new Set<string>();

  for (const payload of standingsPayloads) {
    for (const rawStanding of payload.standings) {
      const standing = getObject(rawStanding);
      const teamRef = standing ? getEspnRefUrl(standing.team) : null;
      if (teamRef) teamRefs.add(teamRef);
    }
  }

  const teamNameByRef = new Map<string, string>();
  await Promise.all([...teamRefs].map((teamRef) => fetchEspnStandingTeamName(teamRef, teamNameByRef)));

  const updates: EspnStandingUpdate[] = [];

  for (const payload of standingsPayloads) {
    for (const rawStanding of payload.standings) {
      const standing = getObject(rawStanding);
      if (!standing) continue;

      const teamRef = getEspnRefUrl(standing.team);
      const teamName = teamRef ? teamNameByRef.get(teamRef) : null;
      if (!teamName) continue;

      const note = getNestedObject(standing, "note");
      const noteDescription = getNestedString(note, "description");
      const rank = getEspnStandingStat(standing, "rank") ?? toNullableNumber(note?.rank);
      const advancedValue = getEspnStandingStat(standing, "advanced") ?? 0;

      updates.push({
        group: payload.group,
        teamName,
        rank,
        gamesPlayed: getEspnStandingStat(standing, "gamesPlayed"),
        advanced: advancedValue >= 1,
        eliminated: /eliminated/i.test(noteDescription ?? ""),
        note: noteDescription,
      });
    }
  }

  return updates;
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

async function upsertKnockoutMatches(ctx: MutationCtx) {
  const now = Date.now();
  let inserted = 0;
  let updated = 0;

  for (const match of KNOCKOUT_MATCH_SEED) {
    const existingMatch = await ctx.db
      .query("matches")
      .withIndex("by_external_id", (q) => q.eq("externalId", match.externalId))
      .first();
    const scheduledAt = Date.parse(match.scheduledAt);

    if (existingMatch) {
      const patch: Partial<Doc<"matches">> = {
        matchNumber: match.matchNumber,
        stage: match.stage,
        scheduledAt,
        sourceKickoff: match.sourceKickoff,
        homeSlotName: match.homeSlot,
        awaySlotName: match.awaySlot,
        venue: match.venue,
        source: "wikipedia:2026-knockout-stage",
        updatedAt: now,
      };

      if (!existingMatch.homeTeamId) {
        patch.homeTeamName = match.homeSlot;
      }

      if (!existingMatch.awayTeamId) {
        patch.awayTeamName = match.awaySlot;
      }

      await ctx.db.patch(existingMatch._id, patch);
      updated += 1;
      continue;
    }

    await ctx.db.insert("matches", {
      externalId: match.externalId,
      matchNumber: match.matchNumber,
      stage: match.stage,
      scheduledAt,
      sourceKickoff: match.sourceKickoff,
      homeTeamName: match.homeSlot,
      awayTeamName: match.awaySlot,
      homeSlotName: match.homeSlot,
      awaySlotName: match.awaySlot,
      status: "scheduled",
      venue: match.venue,
      source: "wikipedia:2026-knockout-stage",
      createdAt: now,
      updatedAt: now,
    });
    inserted += 1;
  }

  return {
    inserted,
    updated,
    totalKnockoutMatches: KNOCKOUT_MATCH_SEED.length,
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
          id: match.homeTeamId ?? null,
          name: match.homeTeamName,
          slotName: match.homeSlotName ?? null,
        },
        awayTeam: {
          id: match.awayTeamId ?? null,
          name: match.awayTeamName,
          slotName: match.awaySlotName ?? null,
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

export const syncStatus = query({
  args: {},
  handler: async (ctx) => {
    const latestLog = await ctx.db
      .query("syncLogs")
      .withIndex("by_created_at")
      .order("desc")
      .first();
    const matches = await ctx.db.query("matches").collect();

    return {
      latest: latestLog
        ? {
            id: latestLog._id,
            provider: latestLog.provider,
            ok: latestLog.ok,
            dateParam: latestLog.dateParam ?? null,
            fetched: latestLog.fetched ?? null,
            normalized: latestLog.normalized ?? null,
            matched: latestLog.matched ?? null,
            updated: latestLog.updated ?? null,
            completed: latestLog.completed ?? null,
            live: latestLog.live ?? null,
            scheduled: latestLog.scheduled ?? null,
            unmatched: latestLog.unmatched ?? null,
            error: latestLog.error ?? null,
            createdAt: latestLog.createdAt,
          }
        : null,
      matches: {
        total: matches.length,
        scheduled: matches.filter((match) => match.status === "scheduled").length,
        live: matches.filter((match) => match.status === "live").length,
        completed: matches.filter((match) => match.status === "completed").length,
      },
    };
  },
});

export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    return await insertSeedMatches(ctx);
  },
});

export const seedKnockoutFromCode = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return await upsertKnockoutMatches(ctx);
  },
});

export const ensureKnockoutMatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await upsertKnockoutMatches(ctx);
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
      args.homeScore > args.awayScore && match.homeTeamId
        ? match.homeTeamId
        : args.awayScore > args.homeScore && match.awayTeamId
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
    await propagateKnockoutSlotsFromResults(ctx);
    await syncTeamProgressFromMatches(ctx);

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

export const adminSetMatchState = mutation({
  args: {
    externalId: v.string(),
    stage: v.optional(matchStageValidator),
    status: v.optional(matchStatusValidator),
    homeScore: v.optional(nullableNumberValidator),
    awayScore: v.optional(nullableNumberValidator),
    decidedBy: v.optional(matchDecisionValidator),
    homePenaltyScore: v.optional(nullableNumberValidator),
    awayPenaltyScore: v.optional(nullableNumberValidator),
    winnerSide: v.optional(v.union(v.literal("home"), v.literal("away"), v.literal("none"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const match = await ctx.db
      .query("matches")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId.trim()))
      .first();

    if (!match) {
      throw new Error(`Матч ${args.externalId} не найден.`);
    }

    const homeScore = args.homeScore === undefined ? match.homeScore ?? null : args.homeScore;
    const awayScore = args.awayScore === undefined ? match.awayScore ?? null : args.awayScore;
    const patch: Partial<Doc<"matches">> = {
      updatedAt: Date.now(),
    };

    if (args.stage !== undefined) patch.stage = args.stage;
    if (args.status !== undefined) patch.status = args.status;
    if (args.homeScore !== undefined) patch.homeScore = args.homeScore ?? undefined;
    if (args.awayScore !== undefined) patch.awayScore = args.awayScore ?? undefined;
    if (args.decidedBy !== undefined) patch.decidedBy = args.decidedBy;
    if (args.homePenaltyScore !== undefined) patch.homePenaltyScore = args.homePenaltyScore ?? undefined;
    if (args.awayPenaltyScore !== undefined) patch.awayPenaltyScore = args.awayPenaltyScore ?? undefined;

    if (args.winnerSide === "home") {
      patch.winnerTeamId = match.homeTeamId;
    } else if (args.winnerSide === "away") {
      patch.winnerTeamId = match.awayTeamId;
    } else if (args.winnerSide === "none") {
      patch.winnerTeamId = undefined;
    } else if (homeScore !== null && awayScore !== null) {
      patch.winnerTeamId =
        homeScore > awayScore && match.homeTeamId
          ? match.homeTeamId
          : awayScore > homeScore && match.awayTeamId
            ? match.awayTeamId
            : undefined;
    }

    await ctx.db.patch(match._id, patch);
    await propagateKnockoutSlotsFromResults(ctx);
    await syncTeamProgressFromMatches(ctx);

    return {
      id: match._id,
      externalId: match.externalId,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      status: patch.status ?? match.status,
      winnerTeamId: patch.winnerTeamId ?? null,
    };
  },
});

export const adminSetMatchTeams = mutation({
  args: {
    externalId: v.string(),
    homeTeamName: v.optional(v.string()),
    awayTeamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const match = await ctx.db
      .query("matches")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId.trim()))
      .first();

    if (!match) {
      throw new Error(`Матч ${args.externalId} не найден.`);
    }

    const teams = await ctx.db.query("teams").collect();
    const findTeamByName = (name: string) => {
      const normalizedTeamName = normalizeName(name).toLocaleLowerCase("ru-RU");

      return teams.find((team) => team.name.toLocaleLowerCase("ru-RU") === normalizedTeamName);
    };
    const patch: Partial<Doc<"matches">> = {
      updatedAt: Date.now(),
    };

    if (args.homeTeamName !== undefined) {
      const homeTeam = findTeamByName(args.homeTeamName);
      if (!homeTeam) throw new Error(`Команда ${args.homeTeamName} не найдена.`);
      patch.homeTeamId = homeTeam._id;
      patch.homeTeamName = homeTeam.name;
    }

    if (args.awayTeamName !== undefined) {
      const awayTeam = findTeamByName(args.awayTeamName);
      if (!awayTeam) throw new Error(`Команда ${args.awayTeamName} не найдена.`);
      patch.awayTeamId = awayTeam._id;
      patch.awayTeamName = awayTeam.name;
    }

    const nextHomeTeamId = patch.homeTeamId ?? match.homeTeamId;
    const nextAwayTeamId = patch.awayTeamId ?? match.awayTeamId;
    if (
      match.winnerTeamId &&
      match.winnerTeamId !== nextHomeTeamId &&
      match.winnerTeamId !== nextAwayTeamId
    ) {
      patch.winnerTeamId = undefined;
    }

    await ctx.db.patch(match._id, patch);
    await propagateKnockoutSlotsFromResults(ctx);
    await syncTeamProgressFromMatches(ctx);

    return {
      id: match._id,
      externalId: match.externalId,
      homeTeamName: patch.homeTeamName ?? match.homeTeamName,
      awayTeamName: patch.awayTeamName ?? match.awayTeamName,
    };
  },
});

function getRoundOf32KnownSlotName(group: string, rank: number | null) {
  if (rank === 1) return `Победитель группы ${group}`;
  if (rank === 2) return `2-е место группы ${group}`;

  return null;
}

export const applyEspnStandings = internalMutation({
  args: {
    standings: v.array(espnStandingUpdateValidator),
  },
  handler: async (ctx, args) => {
    const teams = await ctx.db.query("teams").collect();
    const matches = await ctx.db.query("matches").collect();
    const teamByComparableName = new Map(
      teams.map((team) => [normalizeComparableName(team.name), team]),
    );
    const standingsByGroup = new Map<string, EspnStandingUpdate[]>();
    const now = Date.now();
    let matched = 0;
    let updatedTeams = 0;
    let qualified = 0;
    let eliminated = 0;
    let updatedSlots = 0;
    const unmatched: Array<{ group: string; teamName: string; rank: number | null; note: string | null }> = [];

    for (const standing of args.standings) {
      const group = standing.group.toLocaleUpperCase("en-US");
      const groupStandings = standingsByGroup.get(group) ?? [];
      groupStandings.push(standing);
      standingsByGroup.set(group, groupStandings);
    }

    for (const [group, groupStandings] of standingsByGroup) {
      const groupComplete =
        groupStandings.length >= 4 &&
        groupStandings.every((standing) => (standing.gamesPlayed ?? 0) >= 3);

      for (const standing of groupStandings) {
        const teamName = toKnownTeamName(standing.teamName);
        const team = teamByComparableName.get(normalizeComparableName(teamName));

        if (!team) {
          unmatched.push({
            group,
            teamName,
            rank: standing.rank,
            note: standing.note,
          });
          continue;
        }

        matched += 1;

        const rank = standing.rank === null ? null : Math.trunc(standing.rank);
        const isStableTopTwo = groupComplete && (rank === 1 || rank === 2);
        const isKnownQualified = isStableTopTwo || standing.advanced;
        const isKnownEliminated = groupComplete && (standing.eliminated || (rank !== null && rank >= 4));
        const teamPatch: Partial<Doc<"teams">> = {};

        if (isKnownQualified) {
          const nextStage = getHigherTeamStage((team.stageReached ?? "group") as TeamStage, "round_of_32");
          if ((team.stageReached ?? "group") !== nextStage) teamPatch.stageReached = nextStage;
          if ((team.isEliminated ?? false) !== false) teamPatch.isEliminated = false;
          qualified += 1;
        } else if (isKnownEliminated) {
          if ((team.isEliminated ?? false) !== true) teamPatch.isEliminated = true;
          eliminated += 1;
        }

        if (Object.keys(teamPatch).length > 0) {
          await ctx.db.patch(team._id, {
            ...teamPatch,
            updatedAt: now,
          });
          Object.assign(team, teamPatch);
          updatedTeams += 1;
        }

        if (!isStableTopTwo) continue;

        const slotName = getRoundOf32KnownSlotName(group, rank);
        if (!slotName) continue;

        const match = matches.find(
          (item) =>
            item.stage === "round_of_32" &&
            (item.homeSlotName === slotName || item.awaySlotName === slotName),
        );
        if (!match) continue;

        const patch: Partial<Doc<"matches">> = {};

        if (match.homeSlotName === slotName && match.homeTeamId !== team._id) {
          patch.homeTeamId = team._id;
          patch.homeTeamName = team.name;
        }

        if (match.awaySlotName === slotName && match.awayTeamId !== team._id) {
          patch.awayTeamId = team._id;
          patch.awayTeamName = team.name;
        }

        if (Object.keys(patch).length === 0) continue;

        const nextHomeTeamId = patch.homeTeamId ?? match.homeTeamId;
        const nextAwayTeamId = patch.awayTeamId ?? match.awayTeamId;
        if (
          match.winnerTeamId &&
          match.winnerTeamId !== nextHomeTeamId &&
          match.winnerTeamId !== nextAwayTeamId
        ) {
          patch.winnerTeamId = undefined;
        }

        await ctx.db.patch(match._id, {
          ...patch,
          updatedAt: now,
        });
        Object.assign(match, patch);
        updatedSlots += 1;
      }
    }

    const progressResult = await syncTeamProgressFromMatches(ctx);

    return {
      received: args.standings.length,
      matched,
      updated: updatedTeams + updatedSlots,
      updatedTeams,
      updatedSlots,
      qualified,
      eliminated,
      progressUpdatedTeams: progressResult.updatedTeams,
      unmatched: unmatched.slice(0, 12),
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

const TEAM_STAGE_ORDER: TeamStage[] = [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
  "champion",
];

const NEXT_TEAM_STAGE_BY_MATCH_STAGE: Partial<Record<MatchStage, TeamStage>> = {
  round_of_32: "round_of_16",
  round_of_16: "quarter_final",
  quarter_final: "semi_final",
  semi_final: "final",
  final: "champion",
};

function getTeamFromMatchOutcome(match: Doc<"matches">, outcome: "winner" | "loser") {
  if (!match.winnerTeamId || !match.homeTeamId || !match.awayTeamId) return null;

  const winnerIsHome = match.winnerTeamId === match.homeTeamId;
  const teamId =
    outcome === "winner"
      ? match.winnerTeamId
      : winnerIsHome
        ? match.awayTeamId
        : match.homeTeamId;
  const teamName =
    teamId === match.homeTeamId
      ? match.homeTeamName
      : match.awayTeamName;

  return { teamId, teamName };
}

function getSlotSource(slotName: string | undefined) {
  const match = slotName?.match(/^(Победитель|Проигравший) матча (\d+)$/);
  if (!match) return null;

  return {
    outcome: match[1] === "Победитель" ? "winner" as const : "loser" as const,
    matchNumber: Number(match[2]),
  };
}

async function propagateKnockoutSlotsFromResults(ctx: MutationCtx) {
  const matches = await ctx.db.query("matches").collect();
  const matchByNumber = new Map(matches.map((match) => [match.matchNumber, match]));
  let updated = 0;

  for (const match of matches) {
    if (match.status === "completed") continue;

    const patch: Partial<Doc<"matches">> = {};

    for (const side of ["home", "away"] as const) {
      const slotName = side === "home" ? match.homeSlotName : match.awaySlotName;
      const source = getSlotSource(slotName);
      if (!source) continue;

      const sourceMatch = matchByNumber.get(source.matchNumber);
      if (!sourceMatch || sourceMatch.status !== "completed") continue;

      const sourceTeam = getTeamFromMatchOutcome(sourceMatch, source.outcome);
      if (!sourceTeam) continue;

      const currentTeamId = side === "home" ? match.homeTeamId : match.awayTeamId;
      if (currentTeamId === sourceTeam.teamId) continue;

      if (side === "home") {
        patch.homeTeamId = sourceTeam.teamId;
        patch.homeTeamName = sourceTeam.teamName;
      } else {
        patch.awayTeamId = sourceTeam.teamId;
        patch.awayTeamName = sourceTeam.teamName;
      }
    }

    if (Object.keys(patch).length === 0) continue;

    if (
      match.winnerTeamId &&
      match.winnerTeamId !== (patch.homeTeamId ?? match.homeTeamId) &&
      match.winnerTeamId !== (patch.awayTeamId ?? match.awayTeamId)
    ) {
      patch.winnerTeamId = undefined;
    }

    await ctx.db.patch(match._id, {
      ...patch,
      updatedAt: Date.now(),
    });
    updated += 1;
  }

  return { updatedBracketSlots: updated };
}

function getHigherTeamStage(first: TeamStage, second: TeamStage) {
  return TEAM_STAGE_ORDER.indexOf(second) > TEAM_STAGE_ORDER.indexOf(first) ? second : first;
}

async function syncTeamProgressFromMatches(ctx: MutationCtx) {
  const matches = await ctx.db.query("matches").collect();
  const teams = await ctx.db.query("teams").collect();
  const teamUpdates = new Map<Id<"teams">, { stageReached: TeamStage; isEliminated: boolean }>();

  const ensureTeamUpdate = (teamId: Id<"teams">) => {
    const existing = teamUpdates.get(teamId);
    if (existing) return existing;

    const team = teams.find((item) => item._id === teamId);
    const update = {
      stageReached: (team?.stageReached ?? "group") as TeamStage,
      isEliminated: team?.isEliminated ?? false,
    };
    teamUpdates.set(teamId, update);

    return update;
  };

  const markTeam = (teamId: Id<"teams"> | undefined, stageReached?: TeamStage, isEliminated?: boolean) => {
    if (!teamId) return;

    const update = ensureTeamUpdate(teamId);
    if (stageReached) {
      update.stageReached = getHigherTeamStage(update.stageReached, stageReached);
    }
    if (isEliminated !== undefined) {
      update.isEliminated = isEliminated;
    }
  };

  const roundOf32Matches = matches.filter((match) => match.stage === "round_of_32");
  const roundOf32TeamIds = new Set<Id<"teams">>();

  for (const match of roundOf32Matches) {
    if (match.homeTeamId) roundOf32TeamIds.add(match.homeTeamId);
    if (match.awayTeamId) roundOf32TeamIds.add(match.awayTeamId);
  }

  for (const teamId of roundOf32TeamIds) {
    markTeam(teamId, "round_of_32", false);
  }

  const roundOf32Ready =
    roundOf32Matches.length === 16 &&
    roundOf32Matches.every((match) => match.homeTeamId && match.awayTeamId);

  if (roundOf32Ready) {
    for (const team of teams) {
      if (!roundOf32TeamIds.has(team._id)) {
        markTeam(team._id, "group", true);
      }
    }
  }

  for (const match of matches) {
    if (match.status !== "completed" || match.stage === "group" || !match.winnerTeamId) continue;

    const winnerTeamId = match.winnerTeamId;
    const loserTeamId =
      match.homeTeamId === winnerTeamId
        ? match.awayTeamId
        : match.awayTeamId === winnerTeamId
          ? match.homeTeamId
          : undefined;

    if (match.stage === "third_place") {
      markTeam(winnerTeamId, "semi_final", true);
      markTeam(loserTeamId, "semi_final", true);
      continue;
    }

    const nextStage = NEXT_TEAM_STAGE_BY_MATCH_STAGE[match.stage];
    if (nextStage) {
      markTeam(winnerTeamId, nextStage, false);
    }

    if (match.stage === "semi_final") {
      markTeam(loserTeamId, "semi_final", false);
    } else if (match.stage === "final") {
      markTeam(loserTeamId, "final", true);
    } else {
      markTeam(loserTeamId, match.stage, true);
    }
  }

  const now = Date.now();
  let updated = 0;

  for (const [teamId, update] of teamUpdates) {
    const team = teams.find((item) => item._id === teamId);
    if (!team) continue;

    if (
      (team.stageReached ?? "group") === update.stageReached &&
      (team.isEliminated ?? false) === update.isEliminated
    ) {
      continue;
    }

    await ctx.db.patch(teamId, {
      stageReached: update.stageReached,
      isEliminated: update.isEliminated,
      updatedAt: now,
    });
    updated += 1;
  }

  return { updatedTeams: updated };
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

    const bracketResult = await propagateKnockoutSlotsFromResults(ctx);
    const progressResult = await syncTeamProgressFromMatches(ctx);

    return {
      received: args.fixtures.length,
      matched,
      updated,
      completed,
      live,
      scheduled,
      ...bracketResult,
      ...progressResult,
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

    const bracketResult = await propagateKnockoutSlotsFromResults(ctx);
    const progressResult = await syncTeamProgressFromMatches(ctx);

    return {
      received: args.fixtures.length,
      matched,
      updated,
      completed,
      live,
      scheduled,
      ...bracketResult,
      ...progressResult,
      unmatched: unmatched.slice(0, 12),
    };
  },
});

export const recordSyncLog = internalMutation({
  args: {
    log: syncLogValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncLogs", {
      ...args.log,
      createdAt: Date.now(),
    });
  },
});

function toOptionalLogNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toOptionalLogString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getUnmatchedLogCount(value: unknown) {
  return Array.isArray(value) ? value.length : toOptionalLogNumber(value);
}

async function recordActionSyncLog(ctx: ActionCtx, result: Record<string, unknown>) {
  const dateParam = toOptionalLogString(result.dateParam);
  const fetched = toOptionalLogNumber(result.fetched);
  const normalized = toOptionalLogNumber(result.normalized);
  const matched = toOptionalLogNumber(result.matched);
  const updated = toOptionalLogNumber(result.updated);
  const completed = toOptionalLogNumber(result.completed);
  const live = toOptionalLogNumber(result.live);
  const scheduled = toOptionalLogNumber(result.scheduled);
  const unmatched = getUnmatchedLogCount(result.unmatched);
  const error = toOptionalLogString(result.error);

  try {
    await ctx.runMutation(internal.matches.recordSyncLog, {
      log: {
        provider: String(result.provider ?? "unknown"),
        ok: result.ok === true,
        ...(dateParam === undefined ? {} : { dateParam }),
        ...(fetched === undefined ? {} : { fetched }),
        ...(normalized === undefined ? {} : { normalized }),
        ...(matched === undefined ? {} : { matched }),
        ...(updated === undefined ? {} : { updated }),
        ...(completed === undefined ? {} : { completed }),
        ...(live === undefined ? {} : { live }),
        ...(scheduled === undefined ? {} : { scheduled }),
        ...(unmatched === undefined ? {} : { unmatched }),
        ...(error === undefined ? {} : { error }),
      },
    });
  } catch {
    // Sync should still succeed even if logging fails.
  }
}

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
  let seedResult: Record<string, unknown> | null = null;

  try {
    seedResult = await ctx.runMutation(internal.matches.ensureKnockoutMatches, {}) as Record<string, unknown>;
    const url = new URL(ESPN_SCOREBOARD_URL);
    url.searchParams.set("dates", dateParam);

    const response = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const result = {
        ok: false,
        provider: "espn",
        dateParam,
        knockoutSeed: seedResult,
        error: `ESPN вернул HTTP ${response.status}.`,
      };

      await recordActionSyncLog(ctx, result);
      return result;
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
    let standingsResult: Record<string, unknown> | null = null;

    try {
      const standings = await fetchEspnStandings();
      standingsResult = await ctx.runMutation(internal.matches.applyEspnStandings, {
        standings,
      }) as Record<string, unknown>;
    } catch (standingsError) {
      standingsResult = {
        ok: false,
        error: getSyncErrorMessage(standingsError, "ESPN standings"),
      };
    }

    const result = {
      ok: true,
      provider: "espn",
      dateParam,
      fetched: rawEvents.length,
      normalized: fixtures.length,
      knockoutSeed: seedResult,
      standings: standingsResult,
      ...applyResult,
    };

    await recordActionSyncLog(ctx, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      provider: "espn",
      dateParam,
      knockoutSeed: seedResult,
      error: getSyncErrorMessage(error, "ESPN"),
    };

    await recordActionSyncLog(ctx, result);
    return result;
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
    const result = {
      ok: false,
      provider: "api-football",
      error: "Не настроены FOOTBALL_API_KEY, FOOTBALL_API_LEAGUE_ID или FOOTBALL_API_SEASON в Convex env.",
    };

    await recordActionSyncLog(ctx, result);
    return result;
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
      const result = {
        ok: false,
        provider: "api-football",
        leagueId,
        season,
        error: `API-Football вернул HTTP ${response.status}.`,
      };

      await recordActionSyncLog(ctx, result);
      return result;
    }

    const payload = await response.json() as Record<string, unknown>;
    if (hasApiFootballErrors(payload.errors)) {
      const result = {
        ok: false,
        provider: "api-football",
        leagueId,
        season,
        error: `API-Football вернул ошибку: ${JSON.stringify(payload.errors)}`,
      };

      await recordActionSyncLog(ctx, result);
      return result;
    }

    const rawFixtures = Array.isArray(payload.response) ? payload.response : [];
    const fixtures = rawFixtures
      .map(normalizeApiFootballFixture)
      .filter((fixture): fixture is ApiFootballFixtureUpdate => Boolean(fixture));
    const applyResult: Record<string, unknown> = await ctx.runMutation(internal.matches.applyApiFootballFixtures, {
      fixtures,
    });

    const result = {
      ok: true,
      provider: "api-football",
      leagueId,
      season,
      fetched: rawFixtures.length,
      normalized: fixtures.length,
      ...applyResult,
    };

    await recordActionSyncLog(ctx, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      provider: "api-football",
      leagueId,
      season,
      error: getSyncErrorMessage(error),
    };

    await recordActionSyncLog(ctx, result);
    return result;
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
