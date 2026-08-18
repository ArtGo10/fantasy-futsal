import type { LanguageCode } from "../i18n/translations";

export const LEGAL_VERSION = "2026-08-13";
export const LEGAL_EFFECTIVE_DATE = "August 13, 2026";
export const FUTSAL_DATA_SOURCE_URL = "https://futsal.com.ua";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalContent = {
  updatedAt: string;
  sections: LegalSection[];
};

export type LegalKind = "terms" | "privacy" | "rules";

const content: Record<LanguageCode, Record<LegalKind, LegalContent>> = {
  en: {
    terms: {
      updatedAt: LEGAL_EFFECTIVE_DATE,
      sections: [
        {
          title: "Service",
          body: [
            "Fantasy Futsal is an entertainment fantasy futsal application for creating virtual teams, following fixtures, and comparing fantasy points with other managers across supported leagues.",
            "The app is not an official betting, gambling, or prize-money service. Any prizes or league rules, if added later, must be described separately by the organizers.",
          ],
        },
        {
          title: "Account and team actions",
          body: [
            "You are responsible for the account you use and for the fantasy team actions made from it, including squad selection, captain choices, favourites, and profile settings.",
            "We may limit or remove access if an account is used to abuse the service, manipulate data, or interfere with other users.",
          ],
        },
        {
          title: "Fantasy data",
          body: [
            "Player, club, fixture, match, and statistics data may be compiled from publicly available sources for the selected league. For the Ukrainian Extra-liga, this may include futsal.com.ua. Third-party rights remain with their respective owners.",
            "Fantasy data can be incomplete, delayed, or corrected after review. We may recalculate points when source data changes or an error is found.",
          ],
        },
        {
          title: "Availability",
          body: [
            "The app may be updated, paused, or temporarily unavailable during maintenance, imports, or season setup.",
            "We do not guarantee uninterrupted access or perfectly accurate live updates.",
          ],
        },
        {
          title: "Changes",
          body: [
            "We may update these terms when the app rules, data model, or store requirements change. Continued use after an update means you accept the current version.",
          ],
        },
      ],
    },
    privacy: {
      updatedAt: LEGAL_EFFECTIVE_DATE,
      sections: [
        {
          title: "Data we use",
          body: [
            "We use account data provided by Clerk, such as your name, email address, and authentication identifier, to create and protect your app profile.",
            "We store fantasy data needed for the game: team name, squad picks, captain selections, favourites, points, and notification tokens if you allow push notifications.",
          ],
        },
        {
          title: "How data is used",
          body: [
            "We use this data to sign you in, show your team, calculate fantasy standings, deliver app notifications, and keep the shared league working.",
            "We do not use your fantasy profile for advertising targeting inside the app.",
          ],
        },
        {
          title: "Sources",
          body: [
            "Player, club, fixture, match, and statistics data may be compiled from publicly available sources for the selected league. For the Ukrainian Extra-liga, futsal.com.ua may be one of those sources. This data is used only to run the fantasy experience.",
          ],
        },
        {
          title: "Deletion",
          body: [
            "You can request account deletion from the Profile screen. When deletion is completed, we remove your app profile, fantasy teams, squad picks, favourites, scores, and push notification tokens from our app database.",
            "Some platform, security, or backup records may remain only as required by service providers or law.",
          ],
        },
        {
          title: "Contact",
          body: [
            "For privacy or account questions, contact support@fantasyfutsal.app or use the public support page.",
          ],
        },
      ],
    },
    rules: {
      updatedAt: LEGAL_EFFECTIVE_DATE,
      sections: [
        {
          title: "How the game works",
          body: [
            "Create one fantasy team for the 2026/27 season, pick real futsal players, choose your active lineup for every gameweek, and score points from real match events.",
            "The manager with the most fantasy points after all completed gameweeks wins the shared league table.",
          ],
        },
        {
          title: "Squad",
          body: [
            "Your squad has 12 players: a first five, a second four, and a reserve group.",
            "The first five must contain 1 goalkeeper and 4 universal players. These players score at the full fantasy rate.",
            "The second four contains 4 universal players. These players can also score, but their gameweek points are multiplied by 0.5.",
            "The reserve contains 1 goalkeeper and 2 universal players. Reserve players are used for cover and future lineup changes, but do not score unless an automatic substitution rule applies later.",
          ],
        },
        {
          title: "Squad limits",
          body: [
            "The squad must stay inside the season budget.",
            "You can own no more than 3 players from the same real club in the full squad.",
          ],
        },
        {
          title: "Captain and vice captain",
          body: [
            "Every gameweek you choose one captain and one vice captain from your first five or second four.",
            "The captain's points are doubled. If the captain does not appear and scores 0, the vice captain becomes the captain and receives the double-points bonus.",
            "Captain and vice captain must be two different players.",
          ],
        },
        {
          title: "Transfers and deadlines",
          body: [
            "Before the first deadline, you can change your team freely.",
            "After a gameweek deadline passes, that gameweek becomes live: submitted squads are fixed for scoring, and new team changes apply to the next gameweek.",
            "After each deadline, managers with a submitted full squad receive +1 free transfer for the next gameweek, up to a maximum bank of 5 free transfers.",
            "Extra transfers above your free-transfer balance cost penalty points. The exact penalty is stored in the season settings.",
          ],
        },
        {
          title: "Double and blank gameweeks",
          body: [
            "Some real clubs may play twice in one fantasy gameweek because of postponed or rescheduled matches. This is a double gameweek.",
            "Some clubs may have no match in a fantasy gameweek. This is a blank gameweek.",
            "The calendar screen highlights double and blank gameweeks when they exist, so managers can plan transfers and captain choices before the deadline.",
          ],
        },
        {
          title: "Player prices",
          body: [
            "Starting prices are based on player role, club strength, and available previous-season data.",
            "Prices can change after completed gameweeks based on fantasy points, recent form, regular appearances, and missed matches. Weekly price movement is capped by the season settings.",
          ],
        },
        {
          title: "Scoring",
          body: [
            "Appearance: +1 point.",
            "Universal player goal: +4. Goalkeeper goal: +8.",
            "Universal player assist: +2. Goalkeeper assist: +6.",
            "Goalkeeper conceded bonus: 0 conceded = +4, 1 conceded = +2, 2 conceded = +1. After 2 conceded goals, each extra conceded goal is -1.",
            "Yellow card: -1. Red card: -3. Own goal: -2. Penalty missed: -4. Penalty saved: +10.",
            "Goalkeeper conceded points apply only to goalkeepers who appeared in the match. Negative player points are supported.",
          ],
        },
        {
          title: "Standings",
          body: [
            "The league table sorts managers by total fantasy points from completed gameweeks.",
            "The app can also show average points per gameweek and best single-gameweek record when gameweek history is available.",
          ],
        },
      ],
    },
  },
  uk: {
    terms: {
      updatedAt: "11 серпня 2026",
      sections: [
        {
          title: "Сервіс",
          body: [
            "Fantasy Futsal - це розважальний fantasy-застосунок для футзалу, у якому можна створювати віртуальні команди, стежити за календарем і порівнювати fantasy-очки з іншими менеджерами в підтримуваних лігах.",
            "Застосунок не є офіційним беттингом, азартною грою чи сервісом грошових призів. Якщо призи або додаткові правила ліги з’являться пізніше, організатори опишуть їх окремо.",
          ],
        },
        {
          title: "Акаунт і дії з командою",
          body: [
            "Ви відповідаєте за свій акаунт і fantasy-дії, виконані з нього: вибір складу, капітанів, обраних гравців і налаштування профілю.",
            "Ми можемо обмежити або видалити доступ, якщо акаунт використовується для зловживань, маніпуляцій з даними або перешкоджання іншим користувачам.",
          ],
        },
        {
          title: "Fantasy-дані",
          body: [
            "Дані гравців, клубів, матчів і статистики можуть збиратися з відкритих джерел для вибраної ліги. Для української Екстра-ліги таким джерелом може бути futsal.com.ua. Права третіх сторін залишаються за їхніми власниками.",
            "Fantasy-дані можуть бути неповними, оновлюватися із затримкою або виправлятися після перевірки. Ми можемо перераховувати очки, якщо джерело оновило дані або була знайдена помилка.",
          ],
        },
        {
          title: "Доступність",
          body: [
            "Застосунок може оновлюватися, тимчасово призупинятися або бути недоступним під час технічних робіт, імпорту даних чи налаштування сезону.",
            "Ми не гарантуємо безперервний доступ або ідеально точні live-оновлення.",
          ],
        },
        {
          title: "Зміни",
          body: [
            "Ми можемо оновлювати ці умови, коли змінюються правила застосунку, модель даних або вимоги магазинів. Подальше використання означає згоду з актуальною версією.",
          ],
        },
      ],
    },
    privacy: {
      updatedAt: "11 серпня 2026",
      sections: [
        {
          title: "Дані, які ми використовуємо",
          body: [
            "Ми використовуємо дані акаунта, які надає Clerk: ім'я, email і ідентифікатор авторизації, щоб створити та захистити ваш профіль у застосунку.",
            "Ми зберігаємо fantasy-дані, потрібні для гри: назву команди, склад, капітанів, обраних гравців, очки та push-токени, якщо ви дозволили сповіщення.",
          ],
        },
        {
          title: "Як використовуються дані",
          body: [
            "Ці дані потрібні для входу, показу вашої команди, підрахунку таблиці, надсилання сповіщень і роботи загальної ліги.",
            "Ми не використовуємо fantasy-профіль для рекламного таргетингу всередині застосунку.",
          ],
        },
        {
          title: "Джерела",
          body: [
            "Дані гравців, клубів, матчів і статистики можуть збиратися з відкритих джерел для вибраної ліги. Для української Екстра-ліги futsal.com.ua може бути одним із таких джерел. Ці дані використовуються лише для fantasy-досвіду.",
          ],
        },
        {
          title: "Видалення",
          body: [
            "Ви можете запросити видалення акаунта на екрані Профілю. Після видалення ми прибираємо ваш профіль, fantasy-команди, склади, обраних гравців, очки та push-токени з бази застосунку.",
            "Деякі платформні, безпекові або резервні записи можуть зберігатися лише настільки, наскільки це потрібно сервіс-провайдерам або законом.",
          ],
        },
        {
          title: "Контакт",
          body: [
            "З питань приватності або акаунта пишіть на support@fantasyfutsal.app або використовуйте публічну сторінку підтримки.",
          ],
        },
      ],
    },
    rules: {
      updatedAt: "11 серпня 2026",
      sections: [
        {
          title: "Як працює гра",
          body: [
            "Створіть одну fantasy-команду на сезон Екстра-ліги 2026/27, обирайте реальних футзалістів, формуйте склад на кожен тур і набирайте очки за реальні події матчів.",
            "Менеджер із найбільшою кількістю fantasy-очок після всіх завершених турів перемагає в загальній таблиці ліги.",
          ],
        },
        {
          title: "Склад",
          body: [
            "Ваш склад містить 12 гравців: першу п'ятірку, другу четвірку та резерв.",
            "Перша п'ятірка складається з 1 воротаря та 4 універсалів. Ці гравці приносять очки за повним fantasy-коефіцієнтом.",
            "Друга четвірка складається з 4 універсалів. Вони також можуть приносити очки, але їхній результат за тур множиться на 0.5.",
            "Резерв складається з 1 воротаря та 2 універсалів. Резерв потрібен для покриття і майбутніх змін складу, але не приносить очки, якщо пізніше не спрацює правило автоматичної заміни.",
          ],
        },
        {
          title: "Ліміти складу",
          body: [
            "Склад має залишатися в межах бюджету сезону.",
            "У всьому складі можна мати максимум 3 гравців з одного реального клубу.",
          ],
        },
        {
          title: "Капітан і віце-капітан",
          body: [
            "Кожного туру ви обираєте одного капітана і одного віце-капітана з першої п'ятірки або другої четвірки.",
            "Очки капітана подвоюються. Якщо капітан не зіграв і набрав 0, віце-капітан стає капітаном і отримує бонус подвоєння.",
            "Капітан і віце-капітан мають бути різними гравцями.",
          ],
        },
        {
          title: "Трансфери та дедлайни",
          body: [
            "До першого дедлайну команду можна змінювати безкоштовно і без обмежень.",
            "Після дедлайну тур стає live: збережені склади фіксуються для нарахування очок, а нові зміни команди застосовуються вже до наступного туру.",
            "Після кожного дедлайну менеджери з повним збереженим складом отримують +1 безкоштовний трансфер на наступний тур, але банк не може перевищувати 5 трансферів.",
            "Додаткові трансфери понад безкоштовний баланс коштують штрафні очки. Точний штраф зберігається в налаштуваннях сезону.",
          ],
        },
        {
          title: "Подвійні та порожні тури",
          body: [
            "Деякі реальні клуби можуть зіграти двічі в одному fantasy-турі через перенесені або зміщені матчі. Це подвійний тур.",
            "Деякі клуби можуть не мати матчу в fantasy-турі. Це порожній тур для такої команди.",
            "Екран календаря підсвічує подвійні та порожні тури, якщо вони є, щоб менеджери могли планувати трансфери і вибір капітана до дедлайну.",
          ],
        },
        {
          title: "Ціни гравців",
          body: [
            "Стартові ціни залежать від позиції, сили клубу та доступної статистики попереднього сезону.",
            "Після завершених турів ціни можуть змінюватися на основі fantasy-очок, форми, регулярності появ і пропущених матчів. Максимальна зміна ціни за тиждень обмежена налаштуваннями сезону.",
          ],
        },
        {
          title: "Нарахування очок",
          body: [
            "Вихід на майданчик: +1 очко.",
            "Гол універсала: +4. Гол воротаря: +8.",
            "Асист універсала: +2. Асист воротаря: +6.",
            "Бонус воротаря за пропущені: 0 пропущених = +4, 1 пропущений = +2, 2 пропущені = +1. Після 2 пропущених кожен додатковий пропущений м'яч дає -1.",
            "Жовта картка: -1. Червона картка: -3. Автогол: -2. Незабитий пенальті: -4. Відбитий пенальті: +10.",
            "Очки воротаря за пропущені застосовуються лише до воротарів, які вийшли на майданчик. Від'ємні очки гравця підтримуються.",
          ],
        },
        {
          title: "Таблиця",
          body: [
            "Таблиця ліги сортує менеджерів за сумою fantasy-очок із завершених турів.",
            "Також застосунок може показувати середні очки за тур і найкращий результат одного туру, коли історія турів доступна.",
          ],
        },
      ],
    },
  },
};

export function getLegalContent(language: LanguageCode, kind: LegalKind) {
  return content[language]?.[kind] ?? content.en[kind];
}
