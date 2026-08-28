import type { LanguageCode } from "../../../i18n/translations";

type LocalizableClub = {
  id: string;
  city?: string | null;
  name: string;
  shortName?: string | null;
};

type LocalizablePlayerStatusDetails = {
  message?: string | null;
  messageEn?: string | null;
  messageUk?: string | null;
  updatedAt?: number | null;
} | null;

type LocalizablePlayer = {
  clubId?: string | null;
  clubName?: string | null;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  statusDetails?: LocalizablePlayerStatusDetails;
};

type LocalizableFixture = {
  awayClubId?: string | null;
  awayClubName: string;
  homeClubId?: string | null;
  homeClubName: string;
};

type LocalizableGameweek = {
  name: string;
  number: number;
};

type LocalizableTeamPick<TPlayer extends LocalizablePlayer> = {
  player: TPlayer | null;
};

type LocalizableFantasyTeam<TPlayer extends LocalizablePlayer> = {
  picks: Array<LocalizableTeamPick<TPlayer>>;
};

type ClubLocalization = {
  en: string;
  pl?: string;
  uk?: string;
  shortPl?: string;
  shortEn?: string;
  shortUk?: string;
};

type PlayerNameLocalization = {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
};

const CLUB_LOCALIZATIONS: Record<string, ClubLocalization> = {
  агромат: { en: "Agromat" },
  альянс: { en: "Alliance" },
  атлетик: { en: "Athletic" },
  "атлетик футзал": { en: "Athletic Futsal" },
  атлетік: { en: "Athletic" },
  "атлетік футзал": { en: "Athletic Futsal" },
  авалон: { en: "Avalon" },
  сокіл: { en: "Sokil" },
  сокол: { en: "Sokil" },
  скайап: { en: "SkyUp", uk: "SkyUp", shortEn: "SkyUp", shortUk: "SkyUp" },
  skyup: { en: "SkyUp", uk: "SkyUp", shortEn: "SkyUp", shortUk: "SkyUp" },
  "skyup futsal": {
    en: "SkyUp",
    uk: "SkyUp",
    shortEn: "SkyUp",
    shortUk: "SkyUp",
  },
  "суха балка": { en: "Sukha Balka" },
  ураган: { en: "Uragan" },
  фантом: { en: "Fantom" },
  хіт: { en: "HIT" },
  хит: { en: "HIT" },
  "texom eurobus przemyśl": {
    en: "TEXOM Eurobus Przemyśl",
    pl: "TEXOM Eurobus Przemyśl",
    uk: "TEXOM Євробус Перемишль",
    shortEn: "Eurobus Przemyśl",
    shortPl: "Eurobus Przemyśl",
    shortUk: "Євробус Перемишль",
  },
  "eurobus przemyśl": {
    en: "Eurobus Przemyśl",
    pl: "Eurobus Przemyśl",
    uk: "Євробус Перемишль",
  },
  "piast gliwice": {
    en: "Piast Gliwice",
    pl: "Piast Gliwice",
    uk: "Пяст Глівіце",
  },
  "constract olsztyn": {
    en: "Constract Olsztyn",
    pl: "Constract Olsztyn",
    uk: "Констракт Ольштин",
  },
  "gi malepszy leszno": {
    en: "GI Malepszy Leszno",
    pl: "GI Malepszy Leszno",
    uk: "GI Малепши Лешно",
  },
  "rekord bielsko-biała": {
    en: "Rekord Bielsko-Biała",
    pl: "Rekord Bielsko-Biała",
    uk: "Рекорд Бельсько-Бяла",
  },
  "legia warszawa": {
    en: "Legia Warszawa",
    pl: "Legia Warszawa",
    uk: "Легія Варшава",
  },
  "we-met futsal club gmina sierakowice": {
    en: "We-Met Futsal Club Gmina Sierakowice",
    pl: "We-Met Futsal Club Gmina Sierakowice",
    uk: "We-Met Futsal Club Гміна Сераковіце",
    shortEn: "We-Met Sierakowice",
    shortPl: "We-Met Sierakowice",
    shortUk: "We-Met Сераковіце",
  },
  "we-met sierakowice": {
    en: "We-Met Sierakowice",
    pl: "We-Met Sierakowice",
    uk: "We-Met Сераковіце",
  },
  "azs uś katowice": {
    en: "AZS UŚ Katowice",
    pl: "AZS UŚ Katowice",
    uk: "AZS UŚ Катовіце",
  },
  "fc reiter toruń": {
    en: "FC Reiter Toruń",
    pl: "FC Reiter Toruń",
    uk: "FC Reiter Торунь",
  },
  "red dragons pniewy": {
    en: "Red Dragons Pniewy",
    pl: "Red Dragons Pniewy",
    uk: "Ред Дрегонс Пнєви",
  },
  "bsf abj bochnia": {
    en: "BSF ABJ Bochnia",
    pl: "BSF ABJ Bochnia",
    uk: "BSF ABJ Бохня",
  },
  "futsal świecie": {
    en: "Futsal Świecie",
    pl: "Futsal Świecie",
    uk: "Футзал Свеце",
  },
  "jaxan śląsk wrocław": {
    en: "JAXAN Śląsk Wrocław",
    pl: "JAXAN Śląsk Wrocław",
    uk: "JAXAN Шльонськ Вроцлав",
  },
  "jagiellonia białystok": {
    en: "Jagiellonia Białystok",
    pl: "Jagiellonia Białystok",
    uk: "Ягеллонія Білосток",
  },
  "kkf motus kazimierza wielka": {
    en: "KKF Motus Kazimierza Wielka",
    pl: "KKF Motus Kazimierza Wielka",
    uk: "KKF Motus Казімежа-Велька",
    shortEn: "KKF Motus",
    shortPl: "KKF Motus",
    shortUk: "KKF Motus",
  },
  "kkf motus": {
    en: "KKF Motus",
    pl: "KKF Motus",
    uk: "KKF Motus",
  },
  "wiara lecha poznań": {
    en: "Wiara Lecha Poznań",
    pl: "Wiara Lecha Poznań",
    uk: "Вяра Леха Познань",
  },
};

const CITY_LOCALIZATIONS: Record<string, { en: string; pl?: string; uk?: string }> = {
  бровари: { en: "Brovary" },
  дніпро: { en: "Dnipro" },
  "жовті води": { en: "Zhovti Vody" },
  "івано-франківськ": { en: "Ivano-Frankivsk" },
  київ: { en: "Kyiv" },
  львів: { en: "Lviv" },
  хмельницький: { en: "Khmelnytskyi" },
  przemyśl: { en: "Przemyśl", pl: "Przemyśl", uk: "Перемишль" },
  gliwice: { en: "Gliwice", pl: "Gliwice", uk: "Глівіце" },
  olsztyn: { en: "Olsztyn", pl: "Olsztyn", uk: "Ольштин" },
  leszno: { en: "Leszno", pl: "Leszno", uk: "Лешно" },
  "bielsko-biała": {
    en: "Bielsko-Biała",
    pl: "Bielsko-Biała",
    uk: "Бельсько-Бяла",
  },
  warszawa: { en: "Warszawa", pl: "Warszawa", uk: "Варшава" },
  sierakowice: { en: "Sierakowice", pl: "Sierakowice", uk: "Сераковіце" },
  katowice: { en: "Katowice", pl: "Katowice", uk: "Катовіце" },
  toruń: { en: "Toruń", pl: "Toruń", uk: "Торунь" },
  pniewy: { en: "Pniewy", pl: "Pniewy", uk: "Пнєви" },
  bochnia: { en: "Bochnia", pl: "Bochnia", uk: "Бохня" },
  świecie: { en: "Świecie", pl: "Świecie", uk: "Свеце" },
  wrocław: { en: "Wrocław", pl: "Wrocław", uk: "Вроцлав" },
  białystok: { en: "Białystok", pl: "Białystok", uk: "Білосток" },
  "kazimierza wielka": {
    en: "Kazimierza Wielka",
    pl: "Kazimierza Wielka",
    uk: "Казімежа-Велька",
  },
  poznań: { en: "Poznań", pl: "Poznań", uk: "Познань" },
};

const NO_CLUB_STATUS_MESSAGES: Record<LanguageCode, string> = {
  en: "Without club right now.",
  pl: "Obecnie bez klubu.",
  uk: "Без клубу зараз.",
};

const LEGACY_LEFT_CLUB_STATUS_MESSAGES = new Set([
  "left club",
  "покинув клуб",
]);

function normalizePlayerStatusMessage(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[\s.!?:;]+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function getDisplayPlayerStatusMessage(
  player: LocalizablePlayer,
  language: LanguageCode,
) {
  const statusMessage = getLocalizedPlayerStatusMessage(
    player.statusDetails ?? null,
    language,
  );

  if (
    !player.clubId &&
    LEGACY_LEFT_CLUB_STATUS_MESSAGES.has(
      normalizePlayerStatusMessage(statusMessage),
    )
  ) {
    return NO_CLUB_STATUS_MESSAGES[language];
  }

  return statusMessage;
}

const UK_TO_LATIN_CHARS: Record<string, string> = {
  А: "A",
  Б: "B",
  В: "V",
  Г: "H",
  Ґ: "G",
  Д: "D",
  Е: "E",
  Є: "Ye",
  Ж: "Zh",
  З: "Z",
  И: "Y",
  І: "I",
  Ї: "Yi",
  Й: "Y",
  К: "K",
  Л: "L",
  М: "M",
  Н: "N",
  О: "O",
  П: "P",
  Р: "R",
  С: "S",
  Т: "T",
  У: "U",
  Ф: "F",
  Х: "Kh",
  Ц: "Ts",
  Ч: "Ch",
  Ш: "Sh",
  Щ: "Shch",
  Ь: "",
  Ю: "Yu",
  Я: "Ya",
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  ʼ: "",
  "'": "",
  "’": "",
};

const LATIN_TO_UKRAINIAN_SEQUENCES: Array<[string, string]> = [
  ["szcz", "щ"],
  ["dź", "дзь"],
  ["dzi", "дзі"],
  ["dż", "дж"],
  ["prz", "пш"],
  ["krz", "кш"],
  ["trz", "тш"],
  ["que", "ке"],
  ["qui", "кі"],
  ["nh", "нь"],
  ["lh", "ль"],
  ["ph", "ф"],
  ["cie", "це"],
  ["kie", "ке"],
  ["ch", "х"],
  ["cz", "ч"],
  ["sz", "ш"],
  ["rz", "ж"],
  ["dz", "дз"],
  ["ja", "я"],
  ["je", "є"],
  ["ju", "ю"],
  ["jo", "йо"],
  ["ci", "ці"],
  ["si", "сі"],
  ["zi", "зі"],
  ["ni", "ні"],
];

const LATIN_TO_UKRAINIAN_CHARS: Record<string, string> = {
  a: "а",
  á: "а",
  à: "а",
  ā: "а",
  â: "а",
  ã: "ан",
  ä: "а",
  ą: "он",
  b: "б",
  c: "ц",
  ć: "ць",
  ç: "с",
  d: "д",
  e: "е",
  é: "е",
  ē: "е",
  è: "е",
  ê: "е",
  ë: "е",
  ę: "ен",
  f: "ф",
  g: "г",
  h: "г",
  i: "і",
  í: "і",
  ī: "і",
  ì: "і",
  î: "і",
  ï: "і",
  j: "й",
  k: "к",
  l: "л",
  ļ: "ль",
  ł: "л",
  m: "м",
  n: "н",
  ñ: "нь",
  ń: "нь",
  o: "о",
  ó: "у",
  ò: "о",
  ô: "о",
  õ: "он",
  ö: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  ś: "сь",
  ş: "ш",
  t: "т",
  u: "у",
  ú: "у",
  ū: "у",
  ù: "у",
  û: "у",
  ü: "у",
  v: "в",
  w: "в",
  x: "кс",
  y: "и",
  z: "з",
  ź: "зь",
  ż: "ж",
  ž: "ж",
  š: "ш",
  č: "ч",
};

function normalizeLookup(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("uk-UA");
}

function normalizePlayerNameLookup(value: string | null | undefined) {
  return normalizeLookup(value)
    .replace(/[ł]/g, "l")
    .replace(/[đð]/g, "d")
    .replace(/[æ]/g, "ae")
    .replace(/[œ]/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[´`'’ʼ]/g, "")
    .replace(/[^a-zа-яіїєґ0-9]+/giu, " ")
    .trim();
}

const PLAYER_NAME_LOCALIZATIONS: Record<
  string,
  Partial<Record<LanguageCode, PlayerNameLocalization>>
> = {
  "adrian ramirez": {
    uk: {
      displayName: "Адріан Рамірес",
      firstName: "Адріан",
      lastName: "Рамірес",
    },
  },
  "adriano lemos": {
    uk: {
      displayName: "Адріано Лемос",
      firstName: "Адріано",
      lastName: "Лемос",
    },
  },
  "alexandre miranda": {
    uk: {
      displayName: "Александре Міранда",
      firstName: "Александре",
      lastName: "Міранда",
    },
  },
  amokachy: {
    uk: { displayName: "Амокачі", firstName: null, lastName: "Амокачі" },
  },
  "andres felipe castaneda": {
    uk: {
      displayName: "Андрес Феліпе Кастаньєда",
      firstName: "Андрес Феліпе",
      lastName: "Кастаньєда",
    },
  },
  "andrij jeliszew": {
    uk: {
      displayName: "Андрій Єлішев",
      firstName: "Андрій",
      lastName: "Єлішев",
    },
  },
  "andzejs mickevics": {
    uk: {
      displayName: "Анджей Міцкевичс",
      firstName: "Анджей",
      lastName: "Міцкевичс",
    },
  },
  "angelo carvalho": {
    uk: {
      displayName: "Анжело Карвалью",
      firstName: "Анжело",
      lastName: "Карвалью",
    },
  },
  "artem fareniuk": {
    uk: {
      displayName: "Артем Фаренюк",
      firstName: "Артем",
      lastName: "Фаренюк",
    },
  },
  "artemijs pilipcuks": {
    uk: {
      displayName: "Артемійс Піліпчукс",
      firstName: "Артемійс",
      lastName: "Піліпчукс",
    },
  },
  "benjamin tusar": {
    uk: {
      displayName: "Бенямін Тушар",
      firstName: "Бенямін",
      lastName: "Тушар",
    },
  },
  "brayan mera": {
    uk: {
      displayName: "Браян Мера",
      firstName: "Браян",
      lastName: "Мера",
    },
  },
  "brayan parra": {
    uk: {
      displayName: "Браян Парра",
      firstName: "Браян",
      lastName: "Парра",
    },
  },
  "bruno cintra": {
    uk: {
      displayName: "Бруно Сінтра",
      firstName: "Бруно",
      lastName: "Сінтра",
    },
  },
  "bruno graca": {
    uk: {
      displayName: "Бруно Граса",
      firstName: "Бруно",
      lastName: "Граса",
    },
  },
  "christian rodriguez": {
    uk: {
      displayName: "Крістіан Родрігес",
      firstName: "Крістіан",
      lastName: "Родрігес",
    },
  },
  "christopher moen": {
    uk: {
      displayName: "Крістофер Моен",
      firstName: "Крістофер",
      lastName: "Моен",
    },
  },
  claudinho: {
    uk: { displayName: "Клаудіньо", firstName: null, lastName: "Клаудіньо" },
  },
  "cristian neme": {
    uk: {
      displayName: "Крістіан Неме",
      firstName: "Крістіан",
      lastName: "Неме",
    },
  },
  "daniel gallego": {
    uk: {
      displayName: "Даніель Гальєго",
      firstName: "Даніель",
      lastName: "Гальєго",
    },
  },
  "danis hrgota": {
    uk: {
      displayName: "Даніс Хргота",
      firstName: "Даніс",
      lastName: "Хргота",
    },
  },
  "danyjil abakszyn": {
    uk: {
      displayName: "Даниіл Абакшин",
      firstName: "Даниіл",
      lastName: "Абакшин",
    },
  },
  "deiby arango": {
    uk: {
      displayName: "Дейбі Аранго",
      firstName: "Дейбі",
      lastName: "Аранго",
    },
  },
  "dmytro dibrowa": {
    uk: {
      displayName: "Дмитро Діброва",
      firstName: "Дмитро",
      lastName: "Діброва",
    },
  },
  "dmytro fedyk": {
    uk: {
      displayName: "Дмитро Федик",
      firstName: "Дмитро",
      lastName: "Федик",
    },
  },
  "dmytro rybicki": {
    uk: {
      displayName: "Дмитро Рибицький",
      firstName: "Дмитро",
      lastName: "Рибицький",
    },
  },
  "douglas risi": {
    uk: {
      displayName: "Дуглас Рісі",
      firstName: "Дуглас",
      lastName: "Рісі",
    },
  },
  "eric panes felix": {
    uk: {
      displayName: "Ерік Панес Фелікс",
      firstName: "Ерік Панес",
      lastName: "Фелікс",
    },
  },
  "fabio cecilio": {
    uk: {
      displayName: "Фабіо Сесіліо",
      firstName: "Фабіо",
      lastName: "Сесіліо",
    },
  },
  "facundo setti": {
    uk: {
      displayName: "Факундо Сетті",
      firstName: "Факундо",
      lastName: "Сетті",
    },
  },
  francisco: {
    uk: { displayName: "Франсиско", firstName: null, lastName: "Франсиско" },
  },
  "gabriel da silva shiga": {
    uk: {
      displayName: "Габріел да Сілва Шига",
      firstName: "Габріел",
      lastName: "да Сілва Шига",
    },
  },
  "gilberth vindas": {
    uk: {
      displayName: "Гілберт Віндас",
      firstName: "Гілберт",
      lastName: "Віндас",
    },
  },
  "guilherme gomes": {
    uk: {
      displayName: "Гільєрме Гомес",
      firstName: "Гільєрме",
      lastName: "Гомес",
    },
  },
  guille: {
    uk: { displayName: "Гільє", firstName: null, lastName: "Гільє" },
  },
  "gustavo henrique steinwandter": {
    uk: {
      displayName: "Густаво Енріке Штайнвандтер",
      firstName: "Густаво Енріке",
      lastName: "Штайнвандтер",
    },
  },
  "helder semedo": {
    uk: {
      displayName: "Елдер Семеду",
      firstName: "Елдер",
      lastName: "Семеду",
    },
  },
  "hryhorij zanko": {
    uk: {
      displayName: "Григорій Занько",
      firstName: "Григорій",
      lastName: "Занько",
    },
  },
  "hugo freitas": {
    uk: {
      displayName: "Уго Фрейташ",
      firstName: "Уго",
      lastName: "Фрейташ",
    },
  },
  "ihor korsun": {
    uk: {
      displayName: "Ігор Корсун",
      firstName: "Ігор",
      lastName: "Корсун",
    },
  },
  "jaroslaw lebid": {
    uk: {
      displayName: "Ярослав Лебідь",
      firstName: "Ярослав",
      lastName: "Лебідь",
    },
  },
  "jaroslaw zmijiwski": {
    uk: {
      displayName: "Ярослав Зміївський",
      firstName: "Ярослав",
      lastName: "Зміївський",
    },
  },
  "jason garcia gual": {
    uk: {
      displayName: "Джейсон Гарсія Гуаль",
      firstName: "Джейсон Гарсія",
      lastName: "Гуаль",
    },
  },
  "javier fuentealba": {
    uk: {
      displayName: "Хав'єр Фуентеальба",
      firstName: "Хав'єр",
      lastName: "Фуентеальба",
    },
  },
  "jean carlos": {
    uk: {
      displayName: "Жеан Карлос",
      firstName: "Жеан",
      lastName: "Карлос",
    },
  },
  "jefferson ortiz": {
    uk: {
      displayName: "Джефферсон Ортіс",
      firstName: "Джефферсон",
      lastName: "Ортіс",
    },
  },
  "jesus quiles": {
    uk: {
      displayName: "Хесус Кілес",
      firstName: "Хесус",
      lastName: "Кілес",
    },
  },
  "jewhenij kozlow": {
    uk: {
      displayName: "Євгеній Козлов",
      firstName: "Євгеній",
      lastName: "Козлов",
    },
  },
  "jonatan de agostini machado": {
    uk: {
      displayName: "Жонатан де Агостіні Машаду",
      firstName: "Жонатан де Агостіні",
      lastName: "Машаду",
    },
  },
  "juan emilio gil camacho": {
    uk: {
      displayName: "Хуан Еміліо Хіль Камачо",
      firstName: "Хуан Еміліо",
      lastName: "Хіль Камачо",
    },
  },
  juanqui: {
    uk: { displayName: "Хуанкі", firstName: null, lastName: "Хуанкі" },
  },
  "jurij kozaczenko": {
    uk: {
      displayName: "Юрій Козаченко",
      firstName: "Юрій",
      lastName: "Козаченко",
    },
  },
  kaka: {
    uk: { displayName: "Кака", firstName: null, lastName: "Кака" },
  },
  "leo santana": {
    uk: {
      displayName: "Лео Сантана",
      firstName: "Лео",
      lastName: "Сантана",
    },
  },
  "lion de souza": {
    uk: {
      displayName: "Ліон де Соуза",
      firstName: "Ліон",
      lastName: "де Соуза",
    },
  },
  "maksym pautiak": {
    uk: {
      displayName: "Максим Паутяк",
      firstName: "Максим",
      lastName: "Паутяк",
    },
  },
  "marek kusnir": {
    uk: {
      displayName: "Марек Кушнір",
      firstName: "Марек",
      lastName: "Кушнір",
    },
  },
  "mark fekete": {
    uk: {
      displayName: "Марк Фекете",
      firstName: "Марк",
      lastName: "Фекете",
    },
  },
  "martin solzi": {
    uk: {
      displayName: "Мартін Сольці",
      firstName: "Мартін",
      lastName: "Сольці",
    },
  },
  "matheus correa": {
    uk: {
      displayName: "Матеус Корреа",
      firstName: "Матеус",
      lastName: "Корреа",
    },
  },
  "matheus ferreira ribeiro": {
    uk: {
      displayName: "Матеус Феррейра Рібейро",
      firstName: "Матеус Феррейра",
      lastName: "Рібейро",
    },
  },
  "matus palfi": {
    uk: {
      displayName: "Матуш Палфі",
      firstName: "Матуш",
      lastName: "Палфі",
    },
  },
  "mihnea toader": {
    uk: {
      displayName: "Міхня Тоадер",
      firstName: "Міхня",
      lastName: "Тоадер",
    },
  },
  "miguel kenji": {
    uk: {
      displayName: "Мігел Кенджі",
      firstName: "Мігел",
      lastName: "Кенджі",
    },
  },
  "miguel pegacha": {
    uk: {
      displayName: "Мігел Пегача",
      firstName: "Мігел",
      lastName: "Пегача",
    },
  },
  "mikhael almeida carvalho": {
    uk: {
      displayName: "Мікаел Алмейда Карвалью",
      firstName: "Мікаел Алмейда",
      lastName: "Карвалью",
    },
  },
  "minor cabalceta": {
    uk: {
      displayName: "Мінор Кабальсета",
      firstName: "Мінор",
      lastName: "Кабальсета",
    },
  },
  "mykyta mozejko": {
    uk: {
      displayName: "Микита Можейко",
      firstName: "Микита",
      lastName: "Можейко",
    },
  },
  "mykyta storozuk": {
    uk: {
      displayName: "Микита Сторожук",
      firstName: "Микита",
      lastName: "Сторожук",
    },
  },
  "nazar szwed": {
    uk: {
      displayName: "Назар Швед",
      firstName: "Назар",
      lastName: "Швед",
    },
  },
  "nicolas tumkiewicz": {
    uk: {
      displayName: "Ніколас Тумкевич",
      firstName: "Ніколас",
      lastName: "Тумкевич",
    },
  },
  "noel bujan": {
    uk: {
      displayName: "Ноель Бухан",
      firstName: "Ноель",
      lastName: "Бухан",
    },
  },
  "oleh muryn": {
    uk: {
      displayName: "Олег Мурин",
      firstName: "Олег",
      lastName: "Мурин",
    },
  },
  "oleksandr bondar": {
    uk: {
      displayName: "Олександр Бондар",
      firstName: "Олександр",
      lastName: "Бондар",
    },
  },
  "oleksandr kolesnykow": {
    uk: {
      displayName: "Олександр Колесников",
      firstName: "Олександр",
      lastName: "Колесников",
    },
  },
  "oussama chefraou": {
    uk: {
      displayName: "Уссама Шефрау",
      firstName: "Уссама",
      lastName: "Шефрау",
    },
  },
  "pedro fininho": {
    uk: {
      displayName: "Педру Фінінью",
      firstName: "Педру",
      lastName: "Фінінью",
    },
  },
  "pedro papagaio": {
    uk: {
      displayName: "Педру Папагайо",
      firstName: "Педру",
      lastName: "Папагайо",
    },
  },
  "pedro pereira": {
    uk: {
      displayName: "Педру Перейра",
      firstName: "Педру",
      lastName: "Перейра",
    },
  },
  "rafa lopez": {
    uk: {
      displayName: "Рафа Лопес",
      firstName: "Рафа",
      lastName: "Лопес",
    },
  },
  "rafael cadini": {
    uk: {
      displayName: "Рафаел Кадіні",
      firstName: "Рафаел",
      lastName: "Кадіні",
    },
  },
  "rafael felix": {
    uk: {
      displayName: "Рафаел Фелікс",
      firstName: "Рафаел",
      lastName: "Фелікс",
    },
  },
  rafinha: {
    uk: { displayName: "Рафінья", firstName: null, lastName: "Рафінья" },
  },
  "rainers murnieks": {
    uk: {
      displayName: "Райнерс Мурнієкс",
      firstName: "Райнерс",
      lastName: "Мурнієкс",
    },
  },
  "renards udris": {
    uk: {
      displayName: "Ренардс Удріс",
      firstName: "Ренардс",
      lastName: "Удріс",
    },
  },
  "rostyslaw semenczenko": {
    uk: {
      displayName: "Ростислав Семенченко",
      firstName: "Ростислав",
      lastName: "Семенченко",
    },
  },
  "ruben gomez": {
    uk: {
      displayName: "Рубен Гомес",
      firstName: "Рубен",
      lastName: "Гомес",
    },
  },
  "ruben santos": {
    uk: {
      displayName: "Рубен Сантуш",
      firstName: "Рубен",
      lastName: "Сантуш",
    },
  },
  "rui pinto": {
    uk: {
      displayName: "Руї Пінту",
      firstName: "Руї",
      lastName: "Пінту",
    },
  },
  "sawa lutaj": {
    uk: {
      displayName: "Сава Лутай",
      firstName: "Сава",
      lastName: "Лутай",
    },
  },
  "sandor hadhazi": {
    uk: {
      displayName: "Шандор Гадгазі",
      firstName: "Шандор",
      lastName: "Гадгазі",
    },
  },
  "serhij lapa": {
    uk: {
      displayName: "Сергій Лапа",
      firstName: "Сергій",
      lastName: "Лапа",
    },
  },
  "serhij malyszko": {
    uk: {
      displayName: "Сергій Малишко",
      firstName: "Сергій",
      lastName: "Малишко",
    },
  },
  "sergejs motils": {
    uk: {
      displayName: "Сергейс Мотильс",
      firstName: "Сергейс",
      lastName: "Мотильс",
    },
  },
  "sirius coll": {
    uk: {
      displayName: "Сіріус Коль",
      firstName: "Сіріус",
      lastName: "Коль",
    },
  },
  "szymon mocie": {
    uk: {
      displayName: "Шимон Моцен",
      firstName: "Шимон",
      lastName: "Моцен",
    },
  },
  "tian ursic": {
    uk: {
      displayName: "Тіан Уршич",
      firstName: "Тіан",
      lastName: "Уршич",
    },
  },
  "tuukka pikkarainen": {
    uk: {
      displayName: "Туукка Піккарайнен",
      firstName: "Туукка",
      lastName: "Піккарайнен",
    },
  },
  "uriel cepeda": {
    uk: {
      displayName: "Уріель Сепеда",
      firstName: "Уріель",
      lastName: "Сепеда",
    },
  },
  "vesa lilja": {
    uk: {
      displayName: "Веса Лілья",
      firstName: "Веса",
      lastName: "Лілья",
    },
  },
  "victor delgado": {
    uk: {
      displayName: "Віктор Дельгадо",
      firstName: "Віктор",
      lastName: "Дельгадо",
    },
  },
  "victor dias": {
    uk: {
      displayName: "Віктор Діас",
      firstName: "Віктор",
      lastName: "Діас",
    },
  },
  "viktors kulepovs": {
    uk: {
      displayName: "Вікторс Кулеповс",
      firstName: "Вікторс",
      lastName: "Кулеповс",
    },
  },
  "vini lazzaretti": {
    uk: {
      displayName: "Віні Ладзаретті",
      firstName: "Віні",
      lastName: "Ладзаретті",
    },
  },
  "vinicius teixeira": {
    uk: {
      displayName: "Вінісіус Тейшейра",
      firstName: "Вінісіус",
      lastName: "Тейшейра",
    },
  },
  vitinho: {
    uk: { displayName: "Вітіньо", firstName: null, lastName: "Вітіньо" },
  },
  "wiaczeslaw kozemjaka": {
    uk: {
      displayName: "В'ячеслав Кожемяка",
      firstName: "В'ячеслав",
      lastName: "Кожемяка",
    },
  },
  "wladyslaw tkaczenko": {
    uk: {
      displayName: "Владислав Ткаченко",
      firstName: "Владислав",
      lastName: "Ткаченко",
    },
  },
  "yadali diaby": {
    uk: {
      displayName: "Ядалі Діабі",
      firstName: "Ядалі",
      lastName: "Діабі",
    },
  },
};

function getPlayerNameLocalization(
  player: LocalizablePlayer,
  language: LanguageCode,
) {
  const fallbackNames = splitDisplayName(player.displayName);
  const candidates = [
    player.displayName,
    [
      player.firstName ?? fallbackNames.firstName,
      player.lastName ?? fallbackNames.lastName,
    ]
      .filter(Boolean)
      .join(" "),
    player.lastName ?? fallbackNames.lastName,
  ];

  for (const candidate of candidates) {
    const key = normalizePlayerNameLookup(candidate);
    if (!key) continue;

    const localization = PLAYER_NAME_LOCALIZATIONS[key]?.[language];
    if (localization) return localization;
  }

  return null;
}

function replaceByCharacters(
  value: string,
  characterMap: Record<string, string>,
) {
  return Array.from(value)
    .map((character) => characterMap[character] ?? character)
    .join("");
}

function hasLatinLetters(value: string) {
  return /\p{Script=Latin}/u.test(value);
}

function hasCyrillicLetters(value: string) {
  return /[А-Яа-яІіЇїЄєҐґ]/.test(value);
}

function applyWordCase(source: string, value: string) {
  if (
    source.length > 1 &&
    hasLatinLetters(source) &&
    source === source.toLocaleUpperCase("pl-PL")
  ) {
    return source;
  }
  const firstCharacter = Array.from(source)[0] ?? "";
  if (firstCharacter === firstCharacter.toLocaleUpperCase("pl-PL")) {
    return value.slice(0, 1).toLocaleUpperCase("uk-UA") + value.slice(1);
  }
  return value;
}

function transliterateLatinWordToUkrainian(source: string) {
  if (
    source.length > 1 &&
    hasLatinLetters(source) &&
    source === source.toLocaleUpperCase("pl-PL")
  ) {
    return source;
  }

  const lowerSource = source.toLocaleLowerCase("pl-PL");
  let index = 0;
  let result = "";

  while (index < lowerSource.length) {
    const sequence = LATIN_TO_UKRAINIAN_SEQUENCES.find(([latin]) =>
      lowerSource.startsWith(latin, index),
    );

    if (sequence) {
      result += sequence[1];
      index += sequence[0].length;
      continue;
    }

    const character = lowerSource[index] ?? "";
    result += LATIN_TO_UKRAINIAN_CHARS[character] ?? character;
    index += 1;
  }

  return applyWordCase(source, result);
}

function transliterateLatinToUkrainian(value: string) {
  return value
    .split(/(\p{Script=Latin}+)/gu)
    .map((part) =>
      hasLatinLetters(part) ? transliterateLatinWordToUkrainian(part) : part,
    )
    .join("");
}

function localizeText(value: string, language: LanguageCode) {
  if (language === "uk") {
    if (hasLatinLetters(value) && !hasCyrillicLetters(value)) {
      return transliterateLatinToUkrainian(value);
    }
    return value;
  }
  if (language === "pl") {
    return hasCyrillicLetters(value)
      ? replaceByCharacters(value, UK_TO_LATIN_CHARS)
      : value;
  }
  return replaceByCharacters(value, UK_TO_LATIN_CHARS);
}

function getLocalizedGameweekName(
  gameweek: LocalizableGameweek,
  language: LanguageCode,
) {
  const sourceName = gameweek.name.trim();
  const normalizedName = normalizeLookup(sourceName);
  const defaultNameMatch = normalizedName.match(
    /^(тур|gameweek|gw|matchweek|mw)\s*(\d+)$/,
  );

  if (!sourceName || defaultNameMatch) {
    const gameweekNumber = Number(defaultNameMatch?.[2]) || gameweek.number;
    if (language === "uk") return "Тур " + gameweekNumber;
    if (language === "pl") return "Kolejka " + gameweekNumber;
    return "Gameweek " + gameweekNumber;
  }

  return localizeText(sourceName, language);
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: "" };
  if (parts.length === 1) return { firstName: null, lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function localizeFirstName(
  firstName: string | null | undefined,
  language: LanguageCode,
) {
  if (!firstName) return firstName ?? null;
  return localizeText(firstName, language);
}

function localizeLastName(lastName: string, language: LanguageCode) {
  return localizeText(lastName, language);
}

export function getLocalizedClubName(
  name: string | null | undefined,
  language: LanguageCode,
) {
  const value = (name ?? "").trim();
  if (!value) return value;

  const localized = CLUB_LOCALIZATIONS[normalizeLookup(value)];
  if (localized) {
    if (language === "en") return localized.en;
    if (language === "pl") {
      return localized.pl ?? localized.en ?? localized.uk ?? value;
    }
    return localized.uk ?? value;
  }

  return localizeText(value, language);
}

export function getLocalizedClubShortName(
  name: string | null | undefined,
  language: LanguageCode,
) {
  const value = (name ?? "").trim();
  if (!value) return value;

  const localized = CLUB_LOCALIZATIONS[normalizeLookup(value)];
  if (!localized) {
    return getLocalizedClubName(value, language);
  }

  if (language === "en") return localized.shortEn ?? localized.en;
  if (language === "pl") {
    return (
      localized.shortPl ??
      localized.pl ??
      localized.shortEn ??
      localized.en ??
      localized.shortUk ??
      localized.uk ??
      value
    );
  }
  return localized.shortUk ?? localized.uk ?? value;
}

function getLocalizedCity(
  city: string | null | undefined,
  language: LanguageCode,
) {
  const value = (city ?? "").trim();
  if (!value) return null;

  const localized = CITY_LOCALIZATIONS[normalizeLookup(value)];
  if (localized) {
    if (language === "en") return localized.en;
    if (language === "pl") return localized.pl ?? localized.en ?? value;
    return localized.uk ?? value;
  }

  return localizeText(value, language);
}

function getLocalizedPlayerNames(
  player: LocalizablePlayer,
  language: LanguageCode,
) {
  const localizedName = getPlayerNameLocalization(player, language);
  if (localizedName) {
    const fallbackLocalizedNames = splitDisplayName(localizedName.displayName);

    return {
      displayName: localizedName.displayName,
      firstName: localizedName.firstName ?? fallbackLocalizedNames.firstName,
      lastName: localizedName.lastName ?? fallbackLocalizedNames.lastName,
    };
  }

  const fallbackNames = splitDisplayName(player.displayName);
  const sourceFirstName = player.firstName ?? fallbackNames.firstName;
  const sourceLastName = player.lastName ?? fallbackNames.lastName;
  const firstName = localizeFirstName(sourceFirstName, language);
  const lastName = sourceLastName
    ? localizeLastName(sourceLastName, language)
    : "";
  const displayName =
    firstName && lastName
      ? firstName + " " + lastName
      : localizeText(player.displayName, language);

  return {
    displayName,
    firstName,
    lastName,
  };
}

export function localizeFantasyClubs<TClub extends LocalizableClub>(
  clubs: TClub[] | undefined,
  language: LanguageCode,
) {
  if (!clubs) return clubs;

  return clubs.map((club) => ({
    ...club,
    city: getLocalizedCity(club.city, language),
    name: getLocalizedClubName(club.name, language),
    shortName: club.shortName
      ? getLocalizedClubShortName(club.shortName, language)
      : club.shortName,
  }));
}

export function localizeFantasyPlayers<
  TPlayer extends LocalizablePlayer,
  TClub extends LocalizableClub,
>(
  players: TPlayer[] | undefined,
  language: LanguageCode,
  clubs: TClub[] | undefined,
) {
  if (!players) return players;

  const clubsById = new Map((clubs ?? []).map((club) => [club.id, club]));

  return players.map((player) =>
    localizeFantasyPlayer(player, language, clubsById),
  );
}

function getLocalizedPlayerStatusMessage(
  details: LocalizablePlayerStatusDetails,
  language: LanguageCode,
) {
  if (!details) return null;

  if (language === "uk") {
    return details.messageUk ?? details.message ?? details.messageEn ?? null;
  }
  if (language === "pl") {
    return details.messageEn ?? details.message ?? details.messageUk ?? null;
  }

  return details.messageEn ?? details.message ?? details.messageUk ?? null;
}

export function localizeFantasyPlayer<
  TPlayer extends LocalizablePlayer,
  TClub extends LocalizableClub,
>(player: TPlayer, language: LanguageCode, clubsById?: Map<string, TClub>) {
  const localizedNames = getLocalizedPlayerNames(player, language);
  const club = player.clubId ? clubsById?.get(player.clubId) : null;

  return {
    ...player,
    ...localizedNames,
    clubName:
      club?.name ??
      (player.clubName
        ? getLocalizedClubName(player.clubName, language)
        : player.clubName),
    statusMessage: getDisplayPlayerStatusMessage(player, language),
  };
}

export function localizeFantasyFixtures<
  TFixture extends LocalizableFixture,
  TClub extends LocalizableClub,
>(
  fixtures: TFixture[] | undefined,
  language: LanguageCode,
  clubs: TClub[] | undefined,
) {
  if (!fixtures) return fixtures;

  const clubsById = new Map((clubs ?? []).map((club) => [club.id, club]));

  return fixtures.map((fixture) => ({
    ...fixture,
    awayClubName: fixture.awayClubId
      ? (clubsById.get(fixture.awayClubId)?.name ??
        getLocalizedClubName(fixture.awayClubName, language))
      : getLocalizedClubName(fixture.awayClubName, language),
    homeClubName: fixture.homeClubId
      ? (clubsById.get(fixture.homeClubId)?.name ??
        getLocalizedClubName(fixture.homeClubName, language))
      : getLocalizedClubName(fixture.homeClubName, language),
  }));
}

export function localizeFantasyGameweeks<TGameweek extends LocalizableGameweek>(
  gameweeks: TGameweek[] | undefined,
  language: LanguageCode,
) {
  if (!gameweeks) return gameweeks;

  return gameweeks.map((gameweek) => ({
    ...gameweek,
    name: getLocalizedGameweekName(gameweek, language),
  }));
}

export function localizeFantasyTeam<
  TTeam extends LocalizableFantasyTeam<TPlayer> | null | undefined,
  TPlayer extends LocalizablePlayer,
  TClub extends LocalizableClub,
>(team: TTeam, language: LanguageCode, clubs: TClub[] | undefined): TTeam {
  if (!team) return team;

  const clubsById = new Map((clubs ?? []).map((club) => [club.id, club]));

  return {
    ...team,
    picks: team.picks.map((pick) => ({
      ...pick,
      player: pick.player
        ? localizeFantasyPlayer(pick.player, language, clubsById)
        : null,
    })),
  } as TTeam;
}
