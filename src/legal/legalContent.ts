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
      updatedAt: "August 29, 2026",
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
            "Universal player actions: goal +4, assist +3, missed 6-meter penalty -2, yellow card -1, red card -3, own goal -2.",
            "Goalkeeper actions: goal +7, assist +5, saved 6-meter penalty +2, missed 6-meter penalty -2, yellow card -1, red card -3, own goal -2.",
            "Goals conceded by the player's team apply to every player who appeared: 0 conceded = +4, 1 conceded = +2, 2-3 conceded = 0.",
            "Goals-conceded points are applied only after the match is completed. During live scoring, players receive only appearance points and recorded personal events.",
            "Starting from the fourth goal conceded, players lose 1 point for every 2 goals conceded: 4-5 = -1, 6-7 = -2, 8-9 = -3, and so on.",
            "No fantasy points are awarded for the player's team winning, drawing, losing, or scoring team goals. Negative player points are supported.",
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
      updatedAt: "29 серпня 2026",
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
            "Дії універсала: гол +4, асист +3, незабитий 6-метровий -2, жовта картка -1, червона картка -3, автогол -2.",
            "Дії воротаря: гол +7, асист +5, відбитий 6-метровий +2, незабитий 6-метровий -2, жовта картка -1, червона картка -3, автогол -2.",
            "Пропущені голи команди застосовуються до кожного гравця, який вийшов на майданчик: 0 пропущених = +4, 1 пропущений = +2, 2-3 пропущені = 0.",
            "Очки за пропущені голи застосовуються тільки після завершення матчу. Під час live-нарахування гравці отримують лише очки за вихід і записані персональні події.",
            "Починаючи з четвертого пропущеного гола, гравці втрачають 1 очко за кожні 2 пропущені голи: 4-5 = -1, 6-7 = -2, 8-9 = -3 і так далі.",
            "Fantasy-очки не нараховуються за перемогу, нічию, поразку або забиті командою голи. Від'ємні очки гравця підтримуються.",
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
  pl: {
    terms: {
      updatedAt: "13 sierpnia 2026",
      sections: [
        {
          title: "Usługa",
          body: [
            "Fantasy Futsal to rozrywkowa aplikacja fantasy dla futsalu, w której można tworzyć wirtualne drużyny, śledzić terminarz i porównywać punkty fantasy z innymi menedżerami w obsługiwanych ligach.",
            "Aplikacja nie jest oficjalnym serwisem bukmacherskim, hazardowym ani usługą z nagrodami pieniężnymi. Jeśli nagrody lub dodatkowe zasady ligi pojawią się później, organizatorzy opiszą je osobno.",
          ],
        },
        {
          title: "Konto i działania drużyny",
          body: [
            "Odpowiadasz za używane konto oraz działania fantasy wykonane z tego konta, w tym wybór składu, kapitanów, ulubionych zawodników i ustawienia profilu.",
            "Możemy ograniczyć albo usunąć dostęp, jeśli konto jest używane do nadużyć, manipulacji danymi albo utrudniania korzystania innym użytkownikom.",
          ],
        },
        {
          title: "Dane fantasy",
          body: [
            "Dane zawodników, klubów, meczów i statystyk mogą być kompilowane z publicznie dostępnych źródeł dla wybranej ligi. Dla ukraińskiej Extra-ligi może to obejmować futsal.com.ua, a dla polskiej Futsal Ekstraklasy publiczne źródła ligowe i statystyczne. Prawa osób trzecich pozostają przy ich właścicielach.",
            "Dane fantasy mogą być niepełne, opóźnione albo poprawiane po weryfikacji. Możemy przeliczać punkty, gdy źródło zmieni dane albo zostanie znaleziona pomyłka.",
          ],
        },
        {
          title: "Dostępność",
          body: [
            "Aplikacja może być aktualizowana, wstrzymywana albo czasowo niedostępna podczas prac technicznych, importu danych lub konfiguracji sezonu.",
            "Nie gwarantujemy nieprzerwanego dostępu ani idealnie dokładnych aktualizacji live.",
          ],
        },
        {
          title: "Zmiany",
          body: [
            "Możemy aktualizować te warunki, gdy zmieniają się zasady aplikacji, model danych albo wymagania sklepów. Dalsze korzystanie oznacza akceptację aktualnej wersji.",
          ],
        },
      ],
    },
    privacy: {
      updatedAt: "13 sierpnia 2026",
      sections: [
        {
          title: "Dane, których używamy",
          body: [
            "Używamy danych konta przekazywanych przez Clerk, takich jak imię, adres email i identyfikator logowania, aby utworzyć i chronić Twój profil w aplikacji.",
            "Przechowujemy dane fantasy potrzebne do gry: nazwę drużyny, wybory składu, kapitanów, ulubionych zawodników, punkty oraz tokeny powiadomień, jeśli zezwolisz na powiadomienia push.",
          ],
        },
        {
          title: "Jak używamy danych",
          body: [
            "Dane są używane do logowania, pokazywania drużyny, obliczania tabel fantasy, wysyłania powiadomień i utrzymania działania wspólnej ligi.",
            "Nie używamy profilu fantasy do targetowania reklam wewnątrz aplikacji.",
          ],
        },
        {
          title: "Źródła",
          body: [
            "Dane zawodników, klubów, meczów i statystyk mogą być kompilowane z publicznie dostępnych źródeł dla wybranej ligi. Dane te są używane tylko do obsługi doświadczenia fantasy.",
          ],
        },
        {
          title: "Usunięcie",
          body: [
            "Możesz poprosić o usunięcie konta na ekranie Profilu. Po zakończeniu usunięcia kasujemy profil aplikacji, drużyny fantasy, wybory składu, ulubionych zawodników, wyniki i tokeny powiadomień push z naszej bazy.",
            "Niektóre rekordy platformowe, bezpieczeństwa albo kopii zapasowych mogą pozostać tylko w zakresie wymaganym przez usługodawców lub prawo.",
          ],
        },
        {
          title: "Kontakt",
          body: [
            "W sprawach prywatności albo konta napisz na support@fantasyfutsal.app albo użyj publicznej strony pomocy.",
          ],
        },
      ],
    },
    rules: {
      updatedAt: "29 sierpnia 2026",
      sections: [
        {
          title: "Jak działa gra",
          body: [
            "Utwórz jedną drużynę fantasy na sezon 2026/27, wybieraj prawdziwych zawodników futsalu, ustawiaj aktywny skład na każdą kolejkę i zdobywaj punkty za prawdziwe wydarzenia meczowe.",
            "Menedżer z największą liczbą punktów fantasy po wszystkich zakończonych kolejkach wygrywa w tabeli ligi.",
          ],
        },
        {
          title: "Skład",
          body: [
            "Twój skład ma 12 zawodników: pierwszą piątkę, drugą czwórkę i rezerwę.",
            "Pierwsza piątka musi zawierać 1 bramkarza i 4 zawodników uniwersalnych. Ci zawodnicy punktują z pełnym współczynnikiem fantasy.",
            "Druga czwórka zawiera 4 zawodników uniwersalnych. Oni także mogą punktować, ale ich punkty w kolejce są mnożone przez 0.5.",
            "Rezerwa zawiera 1 bramkarza i 2 zawodników uniwersalnych. Rezerwowi służą do zabezpieczenia składu i przyszłych zmian, ale nie punktują, dopóki nie zostanie dodana reguła automatycznej zmiany.",
          ],
        },
        {
          title: "Limity składu",
          body: [
            "Skład musi mieścić się w budżecie sezonu.",
            "W całym składzie możesz mieć maksymalnie 3 zawodników z jednego realnego klubu.",
          ],
        },
        {
          title: "Kapitan i wicekapitan",
          body: [
            "W każdej kolejce wybierasz kapitana i wicekapitana z pierwszej piątki albo drugiej czwórki.",
            "Punkty kapitana są podwajane. Jeśli kapitan nie wystąpi i zdobędzie 0 punktów, wicekapitan zostaje kapitanem i otrzymuje bonus podwojenia.",
            "Kapitan i wicekapitan muszą być różnymi zawodnikami.",
          ],
        },
        {
          title: "Transfery i deadline'y",
          body: [
            "Przed pierwszym deadline'em możesz zmieniać drużynę bez ograniczeń.",
            "Po deadline'ie kolejka przechodzi live: zapisane składy są blokowane do punktacji, a nowe zmiany dotyczą następnej kolejki.",
            "Po każdym deadline'ie menedżerowie z zapisanym pełnym składem otrzymują +1 darmowy transfer na następną kolejkę, do maksymalnego banku 5 darmowych transferów.",
            "Dodatkowe transfery ponad darmowy balans kosztują punkty karne. Dokładna kara jest zapisana w ustawieniach sezonu.",
          ],
        },
        {
          title: "Podwójne i puste kolejki",
          body: [
            "Niektóre realne kluby mogą grać dwa razy w jednej kolejce fantasy z powodu przełożonych lub zmienionych terminów meczów. To podwójna kolejka.",
            "Niektóre kluby mogą nie mieć meczu w kolejce fantasy. To pusta kolejka.",
            "Ekran kalendarza wyróżnia podwójne i puste kolejki, jeśli istnieją, aby menedżerowie mogli planować transfery i wybór kapitana przed deadline'em.",
          ],
        },
        {
          title: "Ceny zawodników",
          body: [
            "Ceny startowe bazują na roli zawodnika, sile klubu i dostępnych danych z poprzedniego sezonu.",
            "Po zakończonych kolejkach ceny mogą zmieniać się na podstawie punktów fantasy, formy, regularności występów i opuszczonych meczów. Tygodniowa zmiana ceny jest ograniczona ustawieniami sezonu.",
          ],
        },
        {
          title: "Punktacja",
          body: [
            "Występ: +1 punkt.",
            "Akcje zawodnika uniwersalnego: gol +4, asysta +3, niewykorzystany rzut karny z 6 metrów -2, żółta kartka -1, czerwona kartka -3, gol samobójczy -2.",
            "Akcje bramkarza: gol +7, asysta +5, obroniony rzut karny z 6 metrów +2, niewykorzystany rzut karny z 6 metrów -2, żółta kartka -1, czerwona kartka -3, gol samobójczy -2.",
            "Gole stracone przez drużynę zawodnika dotyczą każdego zawodnika, który wystąpił: 0 straconych = +4, 1 stracony = +2, 2-3 stracone = 0.",
            "Punkty za gole stracone są naliczane dopiero po zakończeniu meczu. W trybie live zawodnicy otrzymują tylko punkty za występ i zapisane wydarzenia indywidualne.",
            "Od czwartego straconego gola zawodnicy tracą 1 punkt za każde 2 stracone gole: 4-5 = -1, 6-7 = -2, 8-9 = -3 i dalej według tej samej zasady.",
            "Punkty fantasy nie są przyznawane za zwycięstwo, remis, porażkę ani gole zdobyte przez drużynę zawodnika. Ujemne punkty zawodnika są obsługiwane.",
          ],
        },
        {
          title: "Tabela",
          body: [
            "Tabela ligi sortuje menedżerów według łącznej liczby punktów fantasy z zakończonych kolejek.",
            "Aplikacja może też pokazywać średnie punkty na kolejkę i najlepszy pojedynczy wynik kolejki, gdy historia kolejek jest dostępna.",
          ],
        },
      ],
    },
  },
};

export function getLegalContent(language: LanguageCode, kind: LegalKind) {
  return content[language]?.[kind] ?? content.en[kind];
}
