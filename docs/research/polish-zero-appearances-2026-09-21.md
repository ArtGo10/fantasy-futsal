# Польская лига: игроки без участия в первых пяти турах

Дата проверки: 21 сентября 2026. Сезон: `polish-futsal-ekstraklasa-2026-27`. Источник матчевых данных: production.

## Итог

- Проверены все 40 завершённых матчей туров 1-5. В каждом заполнены составы обеих команд.
- Найдены 73 записи игроков, привязанных к клубам, без участия в этих матчах по данным приложения.
- Для 13 игроков подтверждены уход или принадлежность другому клубу. Они сняты с клубных списков в production; результат проверен повторным чтением.
- Остальные 60 записей сохраняются. Отсутствие в пяти матчах само по себе не является основанием для удаления.
- Vinicius Teixeira уже был снят с Piast по предыдущему запросу и в эти 73 записи не входит. В текущем списке Piast других кандидатов нет.

### Что означает «без участия»

Игрок отсутствует во всех сохранённых составах и событиях туров 1-5, а сумма `appearances` в статистике этих туров равна нулю. Расхождений между этими источниками не обнаружено.

В приложении учитываются заявленные на матч игроки, включая запасных. Поэтому это список отсутствовавших в протоколах приложения, а не подтверждение нуля фактически сыгранных минут. Игрок, который находился в заявке, но не выходил на площадку, в этот список не попадает.

Проверялись официальные сайты клубов и лиги, сезонные обзоры и открытые публикации, в том числе через поиск по соцсетям. Проверка Instagram/Facebook ограничена публично доступными материалами; закрытые публикации и Stories не проверялись. Некоторые страницы состава и подвал сайта лиги содержат устаревший или противоречивый сезон, поэтому отсутствие фамилии там не использовалось как доказательство ухода.

## Подтверждённые изменения: 13

Снимается только привязка к клубу и доступность игрока. Сама запись игрока, история матчей и составы пользователей сохраняются. Восемь записей Jagiellonia относятся к игрокам других клубов: это исправление неверного назначения, а не утверждение, что они совершили трансфер из Jagiellonia.

| Игрок в приложении | Клуб в приложении | Подтверждённая информация | Источник |
| --- | --- | --- | --- |
| Francisco | BSF ABJ Bochnia | Francisco Javier Moreno Sánchez, он же Fran Moreno, покинул Bochnia перед сезоном 2026/27. Новый клуб не установлен. | [Обзор лиги, 16.08.2026][bochnia-preview] |
| Gabriel | Constract Olsztyn | Gabriel Rinaldin Bondaruk перешёл в Active Network. | [Обзор лиги, 26.08.2026][constract-preview] |
| Danis Hrgota | GI Malepszy Leszno | Клуб прямо сообщил о расставании. Новый клуб не установлен. | [Сообщение Leszno, 28.08.2026][leszno-news] |
| Facundo Setti | GI Malepszy Leszno | Клуб прямо сообщил о расставании. Новый клуб не установлен. | [Сообщение Leszno, 28.08.2026][leszno-news] |
| Bene Filppu | Jagiellonia Białystok | Игрок Widzew Łódź в сезоне 2026/27. | [Официальный Widzew, 19.09.2026][widzew-news] |
| Israr Megantara | Jagiellonia Białystok | Игрок Widzew Łódź в сезоне 2026/27. | [Официальный Widzew, 19.09.2026][widzew-news] |
| Kamil Izbiański | Jagiellonia Białystok | Игрок Widzew Łódź в сезоне 2026/27. | [Официальный Widzew, 19.09.2026][widzew-news] |
| Matúš Palfi | Jagiellonia Białystok | Игрок Widzew Łódź в сезоне 2026/27. | [Официальный Widzew, 19.09.2026][widzew-news] |
| Wiaczesław Kożemjaka | Jagiellonia Białystok | Игрок Widzew Łódź в сезоне 2026/27. | [Официальный Widzew, 19.09.2026][widzew-news] |
| Adam Wędzony | Jagiellonia Białystok | Перешёл из Bochnia в Ruch Chorzów. | [Обзор лиги, 16.08.2026][bochnia-preview] |
| Mateusz Mrowiec | Jagiellonia Białystok | Перешёл из AZS UŚ Katowice в Ruch Chorzów. | [Обзор лиги, 20.08.2026][katowice-preview] |
| Tomasz Golly | Jagiellonia Białystok | Подписал контракт с Ruch Chorzów до 30.04.2027. | [Публикация с комментариями клуба и игрока, 06.05.2026][golly-news] |
| Paweł Palko | TEXOM Eurobus Przemyśl | В официальном обзоре лиги указан среди ушедших. Новый клуб не установлен. | [Обзор лиги, 26.08.2026][eurobus-preview] |

Widzew, Ruch и Active Network не добавляются как новые клубы в текущий fantasy-турнир. Результаты матчей, очки и цены не меняются. Деплой кода или схемы не выполняется.

## Оставлены: 60

«Нет подтверждения» означает, что в доступных проверенных материалах не удалось надёжно установить уход или отсутствие сезонной регистрации. Это не утверждение об актуальной заявке.

| Клуб | Игрок | Найденная информация и основание сохранить |
| --- | --- | --- |
| AZS UŚ Katowice | Jakub Smoleń | Есть на [странице состава лиги][katowice-roster]. |
| AZS UŚ Katowice | Paweł Lisiński | Нет свежего подтверждения ухода; исходная запись относится к прошлому сезону. |
| BSF ABJ Bochnia | Rafał Dziurdzia | Есть на [странице состава лиги][bochnia-roster]. |
| BSF ABJ Bochnia | Szymon Mocię | Есть на [странице состава лиги][bochnia-roster]. |
| BSF ABJ Bochnia | Vesa Lilja | Есть в составе; [обзор нового сезона][bochnia-preview] подтверждает его приход. |
| Constract Olsztyn | Grzegorz Szauer | Указан как игрок Constract в [вызове сборной U19 в июне 2026][u19-callup]; подтверждения ухода нет. |
| Constract Olsztyn | Gutta | [Публикация о команде на новый сезон][constract-gutta] указывает его в клубе, в том числе как тренера вратарей. |
| Constract Olsztyn | Hubert Muszyński | Указан как игрок Constract в [вызове сборной U19 в июне 2026][u19-callup]; подтверждения ухода нет. |
| Constract Olsztyn | Jan Rutkowski | Есть на [странице состава лиги][constract-roster]. |
| FC Reiter Toruń | Kamil Wróblewski | Есть на [странице состава лиги][torun-roster]. |
| FC Reiter Toruń | Mateusz Suchocki | Указан среди пришедших в летнем [трансферном отчёте][transfers]; подтверждения последующего ухода нет. |
| Futsal Świecie | Bartłomiej Piórkowski | Есть в [прошлогодней базе состава][swiecie-old]; свежего подтверждения ухода нет. |
| Futsal Świecie | Brajan Olkiewicz | Есть на [странице состава лиги][swiecie-roster]. |
| Futsal Świecie | Daniel Semrau | Есть на [странице состава лиги][swiecie-roster]. |
| Futsal Świecie | Kacper Rybacki | Есть в [прошлогодней базе состава][swiecie-old]; свежего подтверждения ухода нет. |
| Futsal Świecie | Maciej Żurek | Есть в [прошлогодней базе состава][swiecie-old]; свежего подтверждения ухода нет. |
| Futsal Świecie | Maksymilian Lewandowski | Есть в [прошлогодней базе состава][swiecie-old]; свежего подтверждения ухода нет. |
| Futsal Świecie | Marcin Wanat | В [материале сентября 2025][wanat-old] назван помощником тренера. Это не доказывает отмену его регистрации как игрока. |
| Futsal Świecie | Mateusz Cyman | Есть на [странице состава лиги][swiecie-roster]. |
| Futsal Świecie | Oliver Zaręba | Есть в [прошлогодней базе состава][swiecie-old]; свежего подтверждения ухода нет. |
| Futsal Świecie | Yadali Diaby | [Обзор сезона 2026/27][swiecie-preview] подтверждает его приход. |
| Jagiellonia Białystok | Jakub Janiszewski | [Трансферный отчёт][transfers] связывает с Dreman. Прямого актуального подтверждения клуба не найдено; оставлен до уточнения. |
| Jagiellonia Białystok | Kacper Łupiński | Указан как игрок Jagiellonia в [вызове сборной U19 в июне 2026][u19-callup]. Участие в большом футболе не доказывает уход из футзала. |
| Jagiellonia Białystok | Maciej Dmochowski | Есть на [странице состава лиги][jagiellonia-roster]. |
| Jagiellonia Białystok | Maksym Pautiak | [Трансферный отчёт][transfers] указывает Ruch Chorzów. Прямого актуального подтверждения клуба не найдено; оставлен до уточнения. |
| Jagiellonia Białystok | Szymon Danilewicz | Есть в [составе 2025/26][jagiellonia-old]; свежего подтверждения ухода нет. |
| Jagiellonia Białystok | Wiktor Skała | [Трансферный отчёт][transfers] указывает Dreman; [AZS в июне 2026][skala-azs] также называет Dreman. Актуальная регистрация на сентябрь отдельно не подтверждена; оставлен до уточнения. |
| JAXAN Śląsk Wrocław | Artem Roś | Упоминался в [материале клуба в марте 2026][slask-march]; подтверждения ухода нет. |
| JAXAN Śląsk Wrocław | Bruno Cintra | [Официальный обзор нового сезона][slask-preview] подтверждает переход в Śląsk. |
| JAXAN Śląsk Wrocław | Jonatan De Agostini Machado | Есть на [сайте клуба в списке игроков][slask-roster]. |
| JAXAN Śląsk Wrocław | Kacper Zmorczyński | Упоминался в [материале клуба в марте 2026][slask-march]; подтверждения ухода нет. |
| JAXAN Śląsk Wrocław | Kamil Baranowski | Есть на [сайте клуба в списке игроков][slask-roster]. |
| JAXAN Śląsk Wrocław | Krystian Jajko | Найдены только старые сведения; подтверждения ухода нет. |
| JAXAN Śląsk Wrocław | Michał Kołodziejek | Есть на [сайте клуба в списке игроков][slask-roster]. |
| JAXAN Śląsk Wrocław | Rubén Gómez | Найдены только старые сведения; подтверждения ухода нет. |
| JAXAN Śląsk Wrocław | Stefano | Вероятный дубль игравшего вратаря Gustavo Stefano, а не отсутствующий отдельный игрок. Требует отдельного объединения записей. |
| KKF Motus Kazimierza Wielka | Andrzej Musiał | [Трансферный отчёт][transfers] сообщает об уходе тренера. Не установлено, отменена ли регистрация игрока. |
| KKF Motus Kazimierza Wielka | Jakub Cap | Свежего подтверждения ухода или отсутствия регистрации нет. |
| KKF Motus Kazimierza Wielka | Jakub Cieśla | Свежего подтверждения ухода или отсутствия регистрации нет. |
| KKF Motus Kazimierza Wielka | Krystian Jaszczyński | Есть на [странице состава лиги][motus-roster]. |
| KKF Motus Kazimierza Wielka | Oskar Nowak | Найден в [протоколе февраля 2026][motus-old]; подтверждения ухода нет. |
| KKF Motus Kazimierza Wielka | Tomasz Armatys | Найден в [протоколе февраля 2026][motus-old]; подтверждения ухода нет. |
| Legia Warszawa | Andrés Felipe Castañeda | Есть в [прошлогодней базе состава][legia-old]; свежего подтверждения ухода нет. |
| Legia Warszawa | Mateusz Majewski | Есть в [опубликованном клубом составе 2025/26][legia-roster]; свежего подтверждения ухода нет. |
| Red Dragons Pniewy | Bartosz Sobótka | Найдены старые клубные/юношеские сведения; подтверждения ухода нет. |
| Red Dragons Pniewy | Hubert Klatkiewicz | Найдены старые клубные/юношеские сведения; подтверждения ухода нет. |
| Red Dragons Pniewy | Nikodem Krajewski | Найдены старые клубные сведения; подтверждения ухода нет. |
| Red Dragons Pniewy | Patryk Hoły | Найдены старые клубные сведения; подтверждения ухода нет. |
| Red Dragons Pniewy | Rafał Szukała | Найдены старые клубные/юношеские сведения; подтверждения ухода нет. |
| Red Dragons Pniewy | Szymon Jokiel | Найдены старые клубные/юношеские сведения; подтверждения ухода нет. |
| Rekord Bielsko-Biała | Jakub Wiertelorz | Есть в материалах о [молодёжной команде Rekord][rekord-youth]; подтверждения ухода нет. |
| Rekord Bielsko-Biała | Piotr Wrona | Есть на [странице состава лиги][rekord-roster]. |
| TEXOM Eurobus Przemyśl | Aleksi Pirttijoki | [Официальный обзор сезона][eurobus-preview] подтверждает его приход. |
| TEXOM Eurobus Przemyśl | Hryhorij Zańko | Есть на [странице состава лиги][eurobus-roster]. |
| TEXOM Eurobus Przemyśl | Jarosław Łebid´ | Сохраняется известный со слов пользователя статус: тяжёлая травма колена. Есть в [списке игроков лиги][eurobus-roster]. |
| TEXOM Eurobus Przemyśl | Rafael Cadini | Найдены исторические сведения о переходе в Eurobus; свежего подтверждения ухода нет. |
| TEXOM Eurobus Przemyśl | Vitinho | Играл за Eurobus в [финале июня 2026][eurobus-final]; последующий уход не подтверждён. Не путать с Vitinho из Motus. |
| We-Met Futsal Club Gmina Sierakowice | Hugo Freitas | [Материал лиги января 2026][wemet-freitas] связывает его с We-Met; последующий уход не подтверждён. |
| Wiara Lecha Poznań | Christopher Moen | [Трансферный отчёт][transfers] сообщает о приходе из Śląsk. Подтверждения последующего ухода нет. |
| Wiara Lecha Poznań | Igor Gajewski | Есть в [материале клуба о резервной команде за февраль 2026][wiara-reserves]; подтверждения ухода нет. |

## Отдельные вопросы качества данных

1. У одиннадцати кандидатов Jagiellonia внешние идентификаторы имеют общий префикс импорта `pol-fp-transfer:971766`. В трансферном источнике после Jagiellonia идут разделы Dreman, Widzew и Ruch. Это похоже на ошибку определения границ разделов при импорте, но код импорта в рамках этой проверки не исправлялся. Восемь неверных привязок подтверждены независимыми публикациями; Janiszewski, Pautiak и Skała оставлены как спорные.
2. `Stefano` (`mn7a14a829bkbq1746fkmq648n8db4ag`, универсал) вероятно дублирует `Gustavo Stefano` (`mn7d8ts6na4mcxxztjs6y9a3nd8dad11`, вратарь №22). [Клуб][slask-roster] и [обзор лиги][slask-preview] называют Gustavo Stefano. Вторая запись уже имеет участие в матчах. Обе записи оставлены: объединение требует отдельной проверки пользовательских составов и связей.
3. Нулевая статистика не раскрывает причину отсутствия. Для сохранённых игроков новые травмы или дисквалификации по косвенным признакам не назначались. Статус Ярослава Лебедя не менялся.

## Проверка production

Обновление выполнено в production существующей операцией `fantasy:applyPlayerRosterCorrections`, без деплоя. Проверка завершена 21.09.2026 в 16:28 UTC.

- Изменены ровно 13 целевых записей: удалена привязка к клубу, очищены текущие внешние привязки к командам, установлен статус `left` с причиной на украинском, английском и польском.
- Все 13 исторических записей игроков сохранены. Остальные записи игроков совпадают с резервной копией целиком, включая статус травмы Ярослава Лебедя.
- Публичные списки игроков пяти затронутых клубов прочитаны повторно и содержат ровно ожидаемые составы без этих 13 игроков.
- Все 15 туров, 120 матчей, 1059 записей составов, 614 событий и 1059 записей статистики сезона совпадают с состоянием до операции. Пересчёт очков не требовался.
- Из 73 исходных кандидатов 60 оставлены без изменений. Спорные записи не удалены.

Резервная копия исходных матчей, игроков и анализа находится в `.expo/match-data-backups/2026-09-21-polish-zero-appearances-audit/`. Для операции снятия с клубов используется подпапка `confirmed-removals/` с состоянием до изменения, payload, ответом мутации и результатом контрольного чтения.

[bochnia-preview]: https://futsalekstraklasa.pl/aktualnosc/skarb-kibica-202627-bsj-abj-bochnia
[constract-preview]: https://www.futsalekstraklasa.pl/aktualnosc/skarb-kibica-constract-olsztyn
[leszno-news]: https://www.futsal.leszno.pl/2026/08/28/wracamy-do-gry-czas-na-inauguracje-sezonu-2026-2027-w-hali-trapez/
[widzew-news]: https://widzewfutsal.com/posts/misja-wracamy-start-na-poczatek-grodno-dabrowka/721
[katowice-preview]: https://www.futsalekstraklasa.pl/aktualnosc/skarb-kibica-202627-azs-us-katowice
[golly-news]: https://www.futsal-polska.pl/i-liga/2976-ruch-chorzow-futsal-po-spadku-pozegnanie-biela-pierwszy-transfer-i-plany-na-1-lige
[eurobus-preview]: https://futsalekstraklasa.pl/aktualnosc/skarb-kibica-202626-texom-eurobus-przemysl
[katowice-roster]: https://www.futsalekstraklasa.pl/zawodnicy/azs-us-katowice
[bochnia-roster]: https://www.futsalekstraklasa.pl/zawodnicy/bsf-abj-bochnia
[constract-roster]: https://www.futsalekstraklasa.pl/zawodnicy/constract-olsztyn
[torun-roster]: https://www.futsalekstraklasa.pl/zawodnicy/fc-reiter-torun
[swiecie-roster]: https://www.futsalekstraklasa.pl/zawodnicy/futsal-swiecie
[jagiellonia-roster]: https://www.futsalekstraklasa.pl/zawodnicy/jagiellonia-bialystok
[motus-roster]: https://www.futsalekstraklasa.pl/zawodnicy/kkf-motus-kazimierza-wielka
[rekord-roster]: https://www.futsalekstraklasa.pl/zawodnicy/rekord-bielsko-biala
[eurobus-roster]: https://www.futsalekstraklasa.pl/zawodnicy/texom-eurobus-przemysl
[u19-callup]: https://www.futsal-polska.pl/reprezentacja/2995-powolania-do-reprezentacji-polski-u-19-na-futsal-week-w-porecu
[constract-gutta]: https://uwmfm.pl/constract-lubawa-buduje-kadre-na-nowy-sezon/
[transfers]: https://www.futsal-polska.pl/transfery2026
[swiecie-old]: https://www.futsal-polska.pl/futsal-ekstraklasa/roster/81-fogo-futsal-ekstraklasa-2025-26/513-ks-futsal-swiecie
[wanat-old]: https://ksconstract.pl/2025/09/08/ks-constract-lubawa-futsal-swiecie-23/
[swiecie-preview]: https://www.futsalekstraklasa.pl/aktualnosc/skarb-kibica-202627-futsal-swiecie
[jagiellonia-old]: https://www.futsal-polska.pl/i-liga-grupa-i/roster/82-i-liga-grupa-i-polnocna-2025-26/521-jagiellonia-bialystok
[skala-azs]: https://pasja.azs.pl/znamy-sklady-polakow-na-ams-w-futsalu-w-warszawie-gra-w-tym-turnieju-to-duze-wyroznienie/
[slask-march]: https://www.futsalslaskwroclaw.pl/posts/co-za-mecz-w-hali-awf-ogrywamy-bochnie-i-opuszczamy-strefe-spadkowa/375
[slask-preview]: https://www.futsalekstraklasa.pl/aktualnosc/skarb-kibica-202627-jaxan-slask-wroclaw
[slask-roster]: https://www.futsalslaskwroclaw.pl/players
[motus-old]: https://www.futsal-polska.pl/i-liga-grupa-ii/tabela/matchreport/83-i-liga-grupa-ii-poludniowa-2025-26/7479-kkf-motus-kazimierza-wielka_moravia-tompawex-obice
[legia-old]: https://www.futsal-polska.pl/futsal-ekstraklasa/roster/81-fogo-futsal-ekstraklasa-2025-26/476-legia-warszawa-futsal
[legia-roster]: https://legiafutsal.com/kadra/
[rekord-youth]: https://bts.rekord.com.pl/rozgrywki/clj-u-19-w-futsalu-1
[eurobus-final]: https://slzpn.pl/piast-gliwice-futsal-mistrzem-polski/
[wemet-freitas]: https://www.futsalekstraklasa.pl/aktualnosc/progres-we-metu
[wiara-reserves]: https://www.wiaralecha.pl/index.php/2026/02/16/futsal-wiara-lecha-azs-uam-futsal-pila-54/
