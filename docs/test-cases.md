# Fantasy Futsal Manual Test Cases

Документ собран по текущему коду приложения: auth, fantasy shell, табы, экраны команды/лиги/маркет/сезон/профиль, админские Convex-flow и общие компоненты. Формат: P0 критично для первого теста, P1 важно, P2 косметика/регрессии.

## Тестовые роли и данные

- New user: новый email/Google/Apple аккаунт без fantasy team.
- Existing user without terms: аккаунт, созданный до обязательной галочки terms.
- Existing user with team: аккаунт с уже созданной командой из 12 игроков.
- Admin user: Clerk id входит в ADMIN_CLERK_IDS.
- Before deadline: текущий тур открыт, deadline в будущем.
- After deadline: deadline прошел, тур еще не завершен.
- Completed gameweek: все матчи тура completed, админ завершил тур.

## 0. Smoke / Build / Environment

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| SMK-01 | P0 | App start | Запустить preview build на iOS/Android | Приложение открывается без dev server, нет Missing Env |
| SMK-02 | P0 | App start | Проверить preview build | Подключение идет к preview/dev Clerk + Convex |
| SMK-03 | P0 | App start | Запустить без сети | Пользователь видит понятное состояние/ошибку, приложение не падает |
| SMK-04 | P1 | App start | Свернуть/развернуть приложение после логина | Сессия сохраняется, не выбрасывает на auth без причины |
| SMK-05 | P1 | App start | Сменить язык и перезапустить | Язык остается выбранным, основные тексты локализованы |

## 1. Auth: первый экран, вход, регистрация, reset password

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| AUTH-01 | P0 | Intro | Открыть приложение без сессии | Видно Fantasy Futsal intro, язык, Continue |
| AUTH-02 | P0 | Intro | Нажать Continue | Открывается форма входа/регистрации |
| AUTH-03 | P0 | Auth tabs | Ввести email/password на входе, переключиться на регистрацию | Email, password, code, ошибки сброшены |
| AUTH-04 | P0 | Sign up | Попробовать зарегистрироваться без галочки Terms | Кнопка disabled или появляется локализованная ошибка |
| AUTH-05 | P0 | Sign up | Ввести разные password/confirm password | Локализованная ошибка несовпадения паролей |
| AUTH-06 | P0 | Sign up | Ввести пароль короче 8 символов | Локализованная ошибка min length |
| AUTH-07 | P0 | Sign up | Зарегистрировать email/password аккаунт | Приходит verification code, после кода пользователь входит |
| AUTH-08 | P0 | Sign in | Войти существующим email/password | Пользователь попадает внутрь приложения |
| AUTH-09 | P0 | Sign in | Войти несуществующим email | Ошибка локализована, не сырой английский Clerk text |
| AUTH-10 | P1 | Sign in | Ввести неверный пароль | Локализованная ошибка неверных данных |
| AUTH-11 | P0 | Forgot password | Нажать Forgot password, отправить код | Показывается спокойное info-сообщение, код можно ввести |
| AUTH-12 | P0 | Forgot password | Ввести код и новый пароль | Пароль меняется, можно войти новым паролем |
| AUTH-13 | P1 | Forgot password | Ввести неверный code | Локализованная ошибка, экран не ломается |
| AUTH-14 | P0 | Social auth | Нажать Continue with Google | OAuth завершается, создается/открывается аккаунт |
| AUTH-15 | P1 | Social auth | Отменить OAuth в браузере | Возврат в приложение без зависшего loader |
| AUTH-16 | P1 | Keyboard | Открыть нижний input на auth форме | Клавиатура не перекрывает input, можно скроллить форму |
| AUTH-17 | P1 | Legal links | Открыть Terms/Privacy с формы регистрации | Дровер открывается, скролл работает, закрытие корректное |

## 2. Required Terms Gate после логина

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| LEGAL-01 | P0 | Terms gate | Войти аккаунтом без accepted terms | Показывается обязательный экран принятия условий |
| LEGAL-02 | P0 | Terms gate | Нажать Continue без галочки | Кнопка disabled или ошибка, внутрь приложения не пускает |
| LEGAL-03 | P0 | Terms gate | Поставить галочку и продолжить | Terms сохраняются в Convex, пользователь попадает в приложение |
| LEGAL-04 | P1 | Terms gate | Открыть Terms/Privacy links | Тексты открываются в sheet, скроллятся, закрываются |
| LEGAL-05 | P1 | Terms gate | Сменить язык до/после gate | Тексты gate локализованы |

## 3. Общий shell: header, tabs, notifications

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| SHELL-01 | P0 | Tabs | После входа открыть приложение | Активна первая таба Team |
| SHELL-02 | P0 | Tabs | Переключить Team/League/Market/Season/Profile | Каждая таба открывается без ошибки и лишнего loader |
| SHELL-03 | P1 | Header | Нажать колокольчик | Открывается Notifications screen |
| SHELL-04 | P1 | Notifications | Вернуться назад | Возврат на предыдущий экран/табу |
| SHELL-05 | P1 | Header overlays | На Pick Team сделать изменение | Появляется cancel/confirm overlay только где нужно |
| SHELL-06 | P1 | Background resume | Свернуть на внутреннем экране и вернуться | Сессия не теряется, нет ложного auth problem |

## 4. Team overview: нет команды / команда создана

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| TEAM-OV-01 | P0 | Team no team | Новый пользователь открывает Team | Видит welcome card, Pick Team, Rules; статистики нет |
| TEAM-OV-02 | P1 | Team no team | Нажать Rules | Открываются правила, скролл работает |
| TEAM-OV-03 | P0 | Team overview | Пользователь с командой открывает Team | Видит карточку команды и статистику |
| TEAM-OV-04 | P1 | Team overview | Проверить deadline справа в карточке | Дата не обрезается, нет многоточия в критичных местах |
| TEAM-OV-05 | P0 | Team overview | Free transfers до участия в туре | Показывается infinity / unlimited |
| TEAM-OV-06 | P0 | Team overview | Free transfers после завершенного тура | Показывается актуальное число бесплатных трансферов |
| TEAM-OV-07 | P1 | Points breakdown | Открыть детали очков тура | Видна разбивка по игрокам/линиям, пустое состояние корректно |

## 5. Создание команды

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| TEAM-CR-01 | P0 | Team setup | Нажать Pick Team на welcome | Открывается ввод team name + favorite club optional |
| TEAM-CR-02 | P0 | Team setup | Продолжить без team name | Ошибка/disabled state, дальше не пускает |
| TEAM-CR-03 | P1 | Team setup | Ввести слишком длинное название | Появляется ошибка длины |
| TEAM-CR-04 | P1 | Favorite club | Открыть список клубов | Все клубы видны, есть вертикальный скролл, optional вариант |
| TEAM-CR-05 | P0 | Create squad | Перейти к выбору состава | Видна схема 2 GK + 10 universal, budget 100M |
| TEAM-CR-06 | P0 | Create squad | Нажать пустой слот GK | Открывается picker только с вратарями |
| TEAM-CR-07 | P0 | Create squad | Нажать пустой universal slot | Открывается picker универсалов |
| TEAM-CR-08 | P0 | Player picker | Выбрать игрока | Слот заполняется футболкой клуба и фамилией |
| TEAM-CR-09 | P0 | Create squad | Выбрать 4-го игрока одного клуба | Backend/frontend блокирует лимит 3 из клуба |
| TEAM-CR-10 | P0 | Create squad | Попытаться уйти в отрицательный бюджет | Save disabled/ошибка, банк красный |
| TEAM-CR-11 | P0 | Create squad | Заполнить 12/12 в бюджет | Прогресс зеленый, банк зеленый, save active |
| TEAM-CR-12 | P0 | Create squad | Сохранить команду | Команда сохраняется, сразу открывается Pick Team на ближайший тур |
| TEAM-CR-13 | P1 | Create squad | Нажать Reset | Все слоты очищаются, бюджет возвращается |
| TEAM-CR-14 | P1 | Player detail | Открыть выбранного игрока при создании | Есть Remove/Replace, нет Swap |

## 6. Pick Team: выбор состава на тур

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| PICK-01 | P0 | Pick Team | Открыть Pick Team после создания | Видна площадка: старт, замена справа, резерв снизу |
| PICK-02 | P0 | Pick Team | Открыть карточку игрока | Капитан/вице-капитан чекбоксы в один ряд над статистикой |
| PICK-03 | P0 | Leadership | Выбрать капитана | На карточке/поле появляется C, сохранение возможно |
| PICK-04 | P0 | Leadership | Выбрать вице-капитана | На карточке/поле появляется VC, C и VC разные |
| PICK-05 | P0 | Leadership | Попытаться сделать резерв капитаном | Блокируется или появляется ошибка |
| PICK-06 | P0 | Swap | Нажать Swap у игрока | Игрок source подсвечен, допустимые цели подсвечены |
| PICK-07 | P0 | Swap | Поменять стартового с заменой/резервом | Игроки меняются местами, появляется cancel/confirm overlay |
| PICK-08 | P1 | Swap | Выбрать игрока и нажать на него же | Swap mode сбрасывается без изменения |
| PICK-09 | P1 | Swap | Перейти на List tab во время swap | Swap selection сбрасывается |
| PICK-10 | P1 | List view | Переключить Pitch/List | Список разделен на GK/Universals, без количества справа от категории |
| PICK-11 | P1 | List view | Проверить таблицу списка | Есть очки/цена/выбор/статус, нет лишней пустоты справа |
| PICK-12 | P0 | Save changes | Сделать swap и нажать Confirm | Состав сохраняется, overlay исчезает |
| PICK-13 | P0 | Cancel changes | Сделать swap и нажать Cancel | Все изменения откатываются |
| PICK-14 | P0 | Deadline | После deadline открыть Pick Team | Изменения заблокированы до завершения тура |
| PICK-15 | P1 | Injured/status | Игрок со warning/unavailable | На поле/списке виден warning marker и красное выделение имени |

## 7. Transfers

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| TR-01 | P0 | Transfers | Открыть Transfers до первого участия | Free transfers = unlimited, cost = 0 |
| TR-02 | P0 | Transfers | Открыть Transfers после участия | Free transfers = актуальное число |
| TR-03 | P1 | Transfers | Проверить карточки игроков | Цена внутри карточки над футболкой, нет C/VC badges |
| TR-04 | P0 | Add player | Нажать Add Player | Открывается общий picker игроков |
| TR-05 | P0 | Incoming player | Выбрать incoming player | Снизу появляется incoming card, недоступные цели disabled |
| TR-06 | P0 | Incoming player | Выбрать допустимую цель замены | Игрок заменяется, Next активируется |
| TR-07 | P0 | Budget | Выбрать игрока дороже банка | Цели, которые ведут к отрицательному банку, disabled |
| TR-08 | P0 | Position | Выбрать universal incoming | GK слоты disabled |
| TR-09 | P0 | Remove player | Открыть игрока и удалить | Слот пустой, Next неактивен, состав неполный |
| TR-10 | P0 | Removed slot | Нажать пустой слот после удаления | Sheet показывает полное имя игрока, Restore и Choose replacement |
| TR-11 | P0 | Restore | Нажать Restore | Игрок возвращается на место |
| TR-12 | P0 | Choose replacement | Нажать Choose replacement | Открывается стандартный picker, приложение не зависает |
| TR-13 | P0 | Review | Сделать 1+ замену и нажать Next | Открывается экран подтверждения transfer out/in |
| TR-14 | P0 | Review | Нажать Edit Transfers / back | Возврат на Transfers edit state |
| TR-15 | P0 | Confirm | Confirm transfers | Команда сохраняется, открывается Pick Team |
| TR-16 | P0 | Penalty | Сделать больше бесплатных трансферов после участия | В review считается additional transfers и штраф |
| TR-17 | P0 | Deadline | После deadline открыть Transfers | Изменения заблокированы до завершения тура |

## 8. Player picker и Player detail sheet

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| PLAYER-01 | P1 | Player picker | Быстро открыть/закрыть picker | Нет заметного рывка, лист открывается стабильно |
| PLAYER-02 | P1 | Player picker | Быстро скроллить большой список | Нет падения приложения, строки не ломаются |
| PLAYER-03 | P1 | Player picker | Проверить строки игроков | В больших списках используются футболки, логотипы клубов не грузятся |
| PLAYER-04 | P1 | Player picker | Проверить статус игрока | Warning/unavailable marker отображается |
| PLAYER-05 | P0 | Player detail | Открыть игрока из Market | Видны фото игрока, цена, selected %, статус, season stats |
| PLAYER-06 | P0 | Player detail | Открыть игрока из Pick Team | Есть leadership controls, корректные действия для режима |
| PLAYER-07 | P0 | Player detail | Открыть игрока из Transfers | Нет captain/vice controls, нет captain badge |
| PLAYER-08 | P1 | Player detail | Закрыть sheet свайпом вниз | Sheet закрывается без прозрачного/ломаного состояния |
| PLAYER-09 | P1 | Keyboard/search | Фокус на поиске в picker | Клавиатура не перекрывает input, sheet можно скроллить |

## 9. Market

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| MKT-01 | P0 | Market | Открыть Market | Список игроков отображается, нет Missing/loader forever |
| MKT-02 | P1 | Market filters | Поиск по имени/клубу/позиции | Список фильтруется локально |
| MKT-03 | P1 | Market filters | Фильтр по клубу | Показываются игроки клуба, выбор All возвращает полный список |
| MKT-04 | P1 | Market filters | Favorite toggle | Favorite сохраняется, вкладка favorites показывает только выбранных |
| MKT-05 | P1 | Market performance | Выключить favorites с малого списка на полный | Нет долгой блокировки UI |
| MKT-06 | P0 | Market player detail | Открыть игрока | Detail sheet корректный, без team-only actions |
| MKT-07 | P1 | Market price trend | До первого тура | Нет зеленых стрелок у базовых цен |
| MKT-08 | P1 | Market price trend | После завершенного тура с price changes | У выросших/упавших цен корректные стрелки/цвет |
| MKT-09 | P1 | Localization | Переключить EN/UK | Имена игроков/клубов отображаются на выбранном языке |

## 10. League

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| LG-01 | P0 | League | Открыть League | Таблица команд пользователей грузится |
| LG-02 | P1 | League ranking | Проверить сортировку | Рейтинг соответствует total points |
| LG-03 | P1 | League stats | Проверить колонки | Total, average per week, record week, last week видны корректно |
| LG-04 | P1 | League mode picker | Открыть выбор режима | BottomSheet открывается, скролл/закрытие работают |
| LG-05 | P1 | Empty state | Нет команд | Понятное пустое состояние |

## 11. Season: Fixtures, Table, Statistics, Match Details

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| SEAS-01 | P0 | Season | Открыть Season | Доступны tabs Matches/Table/Statistics |
| SEAS-02 | P1 | Fixtures | Матч до начала | Показывается дата/время |
| SEAS-03 | P1 | Fixtures | Completed match | Вместо времени показан счет |
| SEAS-04 | P0 | Match details | Нажать completed fixture | Открывается отдельная страница деталей матча |
| SEAS-05 | P0 | Match details | Проверить header | Есть счет и логотипы команд возле названий |
| SEAS-06 | P0 | Match details | Проверить events | Голы/ассисты/карточки/пенальти отображаются |
| SEAS-07 | P0 | Match details | Проверить lineups | Составы команд отображаются, пустое состояние корректно |
| SEAS-08 | P1 | Season table | Открыть таблицу | Команды/очки/места отображаются корректно |
| SEAS-09 | P1 | Statistics | Открыть статистику игроков | Таблица лучших игроков показывает points/avg/last/form по логике |
| SEAS-10 | P1 | Statistics | Сменить язык | Заголовки и команды локализованы |

## 12. Profile

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| PR-01 | P0 | Profile | Открыть Profile | Видны имя/email, language, legal, feedback, sign out |
| PR-02 | P1 | Language | Сменить язык | Все основные страницы переключаются без перезапуска |
| PR-03 | P0 | Sign out | Нажать Sign out | Показывается loader, затем auth intro/form, checkbox сброшен |
| PR-04 | P0 | Feedback | Отправить feedback | Сообщение сохраняется в Convex, success feedback виден |
| PR-05 | P1 | Feedback | Отправить пустое сообщение | Ошибка/disabled state |
| PR-06 | P1 | Legal | Открыть Terms/Privacy/Rules | Документы открываются и скроллятся |
| PR-07 | P0 | Delete account | Открыть delete account confirmation | Текст понятный, без упоминания Clerk для пользователя |
| PR-08 | P0 | Delete account | Подтвердить удаление | Удаляются user/team/picks/transfers/favorites/feedback refs, logout |
| PR-09 | P1 | Delete account | Отменить удаление | Аккаунт и данные остаются |

## 13. Admin tools в Profile

| ID | P | Страница | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| ADM-01 | P0 | Admin visibility | Зайти non-admin пользователем | Админский блок не виден |
| ADM-02 | P0 | Admin visibility | Зайти admin пользователем | Админский блок виден |
| ADM-03 | P0 | Fixture admin | Выбрать fixture | Открывается score/event/lineup editor |
| ADM-04 | P0 | Fixture score | Ввести счет и сохранить | Матч обновляется, Season показывает счет |
| ADM-05 | P0 | Fixture events | Добавить goal/assist/card/penalty event | Event сохраняется и виден в details |
| ADM-06 | P0 | Fixture lineups | Добавить игрока в lineup | Игрок считается вышедшим на поле при пересчете |
| ADM-07 | P1 | Fixture editor | Удалить event/lineup | Запись удаляется и не участвует в пересчете |
| ADM-08 | P0 | Recalculate | Нажать Recalculate до completed fixtures | Если не все матчи завершены, backend блокирует |
| ADM-09 | P0 | Complete GW | Завершить тур после completed fixtures | Считаются очки, цены, free transfers, current gameweek меняется |
| ADM-10 | P1 | Idempotency | Нажать Complete GW повторно | Не происходит двойной выдачи free transfers |

## 14. Backend scoring / deadlines / prices

| ID | P | Flow | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| BE-01 | P0 | Deadline lock | До deadline сделать saveMyTeam | Сохранение разрешено при валидном составе |
| BE-02 | P0 | Deadline lock | После deadline сделать saveMyTeam | Backend возвращает lock error |
| BE-03 | P0 | Initial unlimited | Новый/не участвовавший пользователь меняет состав | Трансферы unlimited, штрафов нет |
| BE-04 | P0 | Free transfers | После завершения первого участвовавшего тура | Команде начисляется free transfer, cap max 5 |
| BE-05 | P0 | Paid transfers | Сделать больше free transfers | Создаются fantasyTransfers со штрафом -4 за paid transfer |
| BE-06 | P0 | Budget | Цены игроков изменились после создания команды | budgetRemaining не пересчитывается сам, teamValue меняется |
| BE-07 | P0 | Transfer budget | Продать выросшего игрока и купить нового | Банк меняется только через transfer math |
| BE-08 | P0 | Club limit | SaveMyTeam с 4 игроками одного клуба | Backend блокирует |
| BE-09 | P0 | Squad structure | SaveMyTeam без 2 GK/10 universals | Backend блокирует |
| BE-10 | P0 | Captain rules | SaveMyTeam без C/VC или C=VC | Backend блокирует |
| BE-11 | P0 | Appearance | Игрок есть в lineup | Получает appearance points |
| BE-12 | P0 | Event without lineup | Игрок имеет event, но нет lineup | Считается, что он вышел на поле |
| BE-13 | P0 | Goalkeeper conceded | GK сыграл 2 матча в double GW | Conceded/clean sheet считаются отдельно по матчам |
| BE-14 | P0 | Bench multiplier | Игрок на замене приносит 0.5 от своих points | Team score использует коэффициент 0.5 |
| BE-15 | P0 | Captain multiplier | Captain приносит x2 стандартных points | Team score и breakdown показывают bonus |
| BE-16 | P0 | Price recalc | Завершить тур с хорошими/плохими результатами | Цена меняется шагом 0.5 по формуле, history сохраняется |
| BE-17 | P1 | Reset test data | Откатить тестовый тур/данные через admin/script | Price history/free transfers/scores возвращаются корректно |

## 15. Cross-cutting: UI, локализация, производительность

| ID | P | Область | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| UI-01 | P1 | Keyboard | Открыть input в auth/profile/admin/bottom sheet | Клавиатура не перекрывает активный input на iOS/Android |
| UI-02 | P1 | BottomSheet | Открыть длинный sheet | Есть вертикальный скролл, контент не обрезается |
| UI-03 | P1 | Images | Первый вход в Team/create/pick/market | Критичные картинки не мигают или мигают минимально |
| UI-04 | P1 | Lists | Market и player picker big list | Нет заметных задержек на toggle/filter/open |
| UI-05 | P1 | Localization | EN mode | Нет украинских/русских слов: Тур, SkyUp кириллицей, имена украинские |
| UI-06 | P1 | Localization | UK mode | Нет английских системных ошибок в пользовательских сценариях |
| UI-07 | P2 | Typography | Малые карточки игроков/чипы | Фамилии и названия жетонов не переносятся некрасиво |
| UI-08 | P1 | Offline/reconnect | Потерять сеть и вернуть | Convex reconnect не ломает экран, fatal log не приводит к crash |
| UI-09 | P1 | App state | Свернуть на Pick/Transfers и вернуться | Внутренний state по возможности сохраняется, нет возврата на дефолт без причины |
| UI-10 | P1 | Android back | Нажать system back в sheets/details | Закрывает верхний sheet/detail, не ломает tab state |

## P0 full-flow сценарий для первого тестового прогона

1. Установить preview build на чистое устройство.
2. Зарегистрировать нового пользователя email/password, принять Terms.
3. Создать команду: name, optional favorite club, 2 GK + 10 universals, budget >= 0, max 3 per club.
4. После save попасть сразу в Pick Team.
5. Выбрать captain и vice-captain, сохранить состав на тур.
6. Открыть Market, проверить фильтры, favorite, player detail.
7. Открыть Transfers, заменить одного игрока, пройти Review, Confirm, попасть обратно в Pick Team.
8. Admin: заполнить fixture lineups/events/score, completed fixtures, Complete GW.
9. Проверить Team overview: GW points, total points, free transfers, price changes.
10. Проверить League: total/average/record/last week.
11. Проверить Season match details: score, events, lineups.
12. Sign out, sign in обратно, убедиться, что команда/очки сохранились.
