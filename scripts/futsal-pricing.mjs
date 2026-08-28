export const FANTASY_INITIAL_PRICE_MIN = 5.5;
export const FANTASY_INITIAL_PRICE_MAX = 14.0;
export const FANTASY_INITIAL_PRICE_STEP = 0.5;

const FANTASY_INITIAL_PRICE_BASE = 5.7;
export const POLISH_INITIAL_PRICE_MIN = 5.5;
export const POLISH_INITIAL_PRICE_MAX = 15.0;

const EXTRA_LEAGUE_STAT_WEIGHT = 1;
const FIRST_LEAGUE_STAT_WEIGHT = 0.25;

const CLUB_PRICE_BONUS_BY_EXTERNAL_ID = new Map([
  ["3438", 1.2], // ХІТ
  ["21695", 0.85], // SkyUp
  ["5586", 0.85], // Атлетік Футзал
  ["5584", 0.4], // Суха Балка
  ["3430", 0.4], // Сокіл
]);

const PLAYER_REPUTATION_BONUS_BY_NAME = new Map([
  ["Владислав Первєєв", 1.0],
  ["Євгеній Жук", 0.9],
  ["Андрій Мельник", 2.4],
]);

const POLISH_CLUB_BASE_PRICE_BY_EXTERNAL_ID = new Map([
  ["1164696", 7.75], // TEXOM Eurobus Przemyśl
  ["1068865", 7.75], // Piast Gliwice
  ["1069050", 7.5], // Constract Olsztyn
  ["1069049", 7.5], // GI Malepszy Leszno
  ["971760", 7.25], // Rekord Bielsko-Biała
  ["1100259", 7.0], // Legia Warszawa
  ["1164695", 6.75], // We-Met Sierakowice
  ["971765", 6.75], // AZS UŚ Katowice
  ["971771", 6.75], // FC Reiter Toruń
  ["971768", 6.5], // Red Dragons Pniewy
  ["1124279", 6.5], // BSF ABJ Bochnia
  ["1100261", 6.5], // Futsal Świecie
  ["1100264", 6.25], // JAXAN Śląsk Wrocław
  ["971766", 6.0], // Jagiellonia Białystok
  ["1203274", 5.75], // KKF Motus Kazimierza Wielka
  ["1261090", 5.5], // Wiara Lecha Poznań
]);

const POLISH_PLAYER_2025_26_PRODUCTION_BY_NAME = toPriceLookupMap([
  ["Rostysław Semenczenko", 47],
  ["Pedro Pereira", 35],
  ["Artem Fareniuk", 47],
  ["Breno Bertoline Rosa", 46],
  ["Vini Lazzaretti", 44],
  ["Miguel Pegacha", 43],
  ["Danyjił Abakszyn", 43],
  ["Rajmund Siecla", 41],
  ["Lion de Souza", 40],
  ["Rúben Santos", 37],
  ["Nazar Szwed", 37],
  ["Jani Korpela", 35],
  ["Kacper Sendlewski", 34],
  ["Remigiusz Spychalski", 34],
  ["Minor Cabalceta", 33],
  ["Eric Sylla", 33],
  ["Mateusz Madziąg", 32],
  ["Carlos Eduardo Gonçalves", 32],
  ["Brayan Mera", 31],
  ["Sebastian Leszczak", 30],
  ["Mateusz Lisowski", 30],
  ["Franco Spellanzon", 30],
  ["Paweł Budniak", 29],
  ["Henri Alamikkotervo", 29],
  ["Diniz", 28],
  ["Bruno Graça", 27],
  ["Janderson De Oliveira", 27],
  ["Jarosław Łebid´", 26],
  ["Krzysztof Elsner", 26],
  ["Mateusz Kostecki", 26],
  ["Aleksander Kozak", 25],
  ["Adrián Ramírez", 25],
  ["Mykyta Storożuk", 24],
  ["Léo Santana", 24],
  ["Daniel Gallego", 24],
  ["Víctor Delgado", 23],
  ["Piotr Kaczkowski", 23],
  ["Maciej Jankowski", 23],
  ["Guilherme Kadu", 23],
  ["Tomasz Lutecki", 22],
  ["Patryk Szczepaniak", 21],
  ["Adriano Lemos", 21],
  ["David Mataja", 20],
  ["Karol Czyszek", 20],
  ["Michał Kubik", 20],
  ["Marcin Mrówczyński", 19],
  ["Tiago Correia", 19],
  ["Savio Valadares", 19],
  ["Tomasz Kriezel", 19],
  ["Vinicius Teixeira", 19],
  ["Władysław Tkaczenko", 19],
  ["Piotr Błaszyk", 18],
  ["Szymon Licznerski", 18],
  ["Sebastian Szadurski", 18],
  ["Arkadiusz Szypczyński", 18],
  ["Artur Popławski", 18],
  ["Mikołaj Zastawnik", 18],
  ["Dominik Ostrák", 18],
  ["Rodrigo Dasaiev", 17],
  ["Serhij Małyszko", 17],
  ["Inácio", 17],
  ["Hugo Cardoso Alves", 17],
  ["Gabriel Rinaldin", 17],
  ["Facundo Setti", 16],
  ["Jarosław Zmijiwski", 16],
  ["Christian Rodríguez", 16],
  ["Sebastian Grubalski", 15],
  ["Guille", 15],
  ["Dominik Wilk", 15],
  ["Serhij Łapa", 15],
  ["Piotr Matras", 14],
  ["Patryk Widuch", 14],
  ["Stefano", 14],
  ["Oskar Szczepański", 14],
  ["Adrian Skrzypek", 14],
  ["Kevin Kollár", 14],
  ["Michał Marek", 14],
  ["Jonatan De Agostini Machado", 14],
  ["Wojciech Przybył", 14],
  ["Guilherme Gomes", 14],
  ["Wiaczesław Kożemjaka", 14],
  ["Miguel Kenji", 13],
  ["Davidson Silva", 13],
  ["Jakub Kąkol", 13],
  ["Martin Doša", 13],
  ["Fábio Cecílio", 12],
  ["Mykyta Możejko", 12],
  ["Kacper Pawlus", 12],
  ["Mateusz Mrowiec", 12],
  ["Paweł Kaniewski", 12],
  ["Miłosz Krzempek", 11],
  ["Luca Priori", 11],
  ["Hélder Semedo", 11],
  ["Christopher Moen", 11],
  ["Bruno Cintra", 11],
  ["Edgar Varela", 10],
  ["Mateusz Prokop", 10],
  ["Francisco", 10],
  ["Gustavo Henrique Steinwandter", 10],
  ["Artem Roś", 10],
  ["Mateusz Matlęga", 10],
  ["Krystian Kraśniewski", 10],
  ["Oliver Zaręba", 10],
  ["Oliwier Siuda", 9],
  ["Deiby Arango", 9],
  ["Krzysztof Iwanek", 9],
  ["Arkadiusz Budzyn", 9],
  ["Jakub Raszkowski", 8],
  ["Jakub Molicki", 8],
  ["Albert Betowski", 8],
  ["Dmytro Fedyk", 8],
  ["Michał Kałuża", 7],
  ["Michał Widuch", 7],
  ["Mateusz Cyman", 7],
  ["Bartłomiej Twarkowski", 7],
  ["Kacper Zboralski", 7],
  ["Dawid Witek", 7],
  ["Filip Vaktor", 7],
  ["Grzegorz Haraburda", 7],
]);

function normalizePriceLookupName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[łŁ]/g, (match) => (match === "Ł" ? "L" : "l"))
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[´’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toPriceLookupMap(entries) {
  return new Map(
    entries.map(([name, value]) => [normalizePriceLookupName(name), value]),
  );
}

function roundPrice(value) {
  return (
    Math.round(value / FANTASY_INITIAL_PRICE_STEP) * FANTASY_INITIAL_PRICE_STEP
  );
}

function clampPrice(value) {
  return Math.min(
    FANTASY_INITIAL_PRICE_MAX,
    Math.max(FANTASY_INITIAL_PRICE_MIN, value),
  );
}

function clampPolishPrice(value) {
  return Math.min(
    POLISH_INITIAL_PRICE_MAX,
    Math.max(POLISH_INITIAL_PRICE_MIN, value),
  );
}

function calculateCompetitionScore(stats) {
  if (!stats) return 0;

  return Math.max(
    0,
    stats.goals * 2.15 +
      stats.assists * 1.9 +
      stats.appearances * 0.2 -
      stats.yellowCards * 0.12 -
      stats.redCards * 0.55 -
      stats.ownGoals * 0.35,
  );
}

function calculatePerformanceBonus(score) {
  if (score <= 0) return 0;
  return Math.sqrt(score) * 0.72 + score * 0.04;
}

function calculatePolishPerformanceBonus(production) {
  if (production >= 47) return 7.25;
  if (production >= 45) return 6.75;
  if (production >= 42) return 5.75;
  if (production >= 38) return 5.25;
  if (production >= 34) return 4.75;
  if (production >= 30) return 4.0;
  if (production >= 26) return 3.25;
  if (production >= 22) return 2.75;
  if (production >= 18) return 2.25;
  if (production >= 14) return 1.5;
  if (production >= 10) return 1.0;
  if (production >= 6) return 0.5;
  if (production >= 3) return 0.25;
  return 0;
}

function calculatePolishSuggestedPrice({
  clubExternalId,
  displayName,
  position,
  statsByCompetition,
}) {
  const extraLeagueStats = statsByCompetition.extraLeague2025_26 ?? null;
  const firstLeagueStats = statsByCompetition.firstLeague2025_26 ?? null;
  const extraLeagueGoals = extraLeagueStats?.goals ?? 0;
  const firstLeagueGoals = firstLeagueStats?.goals ?? 0;
  const previousProduction =
    POLISH_PLAYER_2025_26_PRODUCTION_BY_NAME.get(
      normalizePriceLookupName(displayName),
    ) ?? 0;
  const sourceProduction = Math.max(
    extraLeagueGoals * 1.45,
    firstLeagueGoals * 0.75,
  );
  const production = Math.max(previousProduction, sourceProduction);
  const clubBase = POLISH_CLUB_BASE_PRICE_BY_EXTERNAL_ID.get(clubExternalId);
  const basePrice = clubBase ?? 7.25;
  const goalkeeperAdjustment =
    position === "goalkeeper" && production < 14
      ? basePrice <= 6.75
        ? -0.75
        : -0.5
      : 0;

  return roundPrice(
    clampPolishPrice(
      basePrice +
        calculatePolishPerformanceBonus(production) +
        goalkeeperAdjustment,
    ),
  );
}

export function calculateSuggestedPrice({
  clubExternalId,
  displayName,
  position,
  statsByCompetition,
}) {
  if (POLISH_CLUB_BASE_PRICE_BY_EXTERNAL_ID.has(clubExternalId)) {
    return calculatePolishSuggestedPrice({
      clubExternalId,
      displayName,
      position,
      statsByCompetition,
    });
  }

  const extraLeagueScore =
    calculateCompetitionScore(statsByCompetition.extraLeague2025_26 ?? null) *
    EXTRA_LEAGUE_STAT_WEIGHT;
  const firstLeagueScore =
    calculateCompetitionScore(statsByCompetition.firstLeague2025_26 ?? null) *
    FIRST_LEAGUE_STAT_WEIGHT;
  const performanceScore = Math.max(extraLeagueScore, firstLeagueScore);
  const clubBonus = CLUB_PRICE_BONUS_BY_EXTERNAL_ID.get(clubExternalId) ?? 0;
  const reputationBonus = PLAYER_REPUTATION_BONUS_BY_NAME.get(displayName) ?? 0;

  return roundPrice(
    clampPrice(
      FANTASY_INITIAL_PRICE_BASE +
        clubBonus +
        reputationBonus +
        calculatePerformanceBonus(performanceScore),
    ),
  );
}
