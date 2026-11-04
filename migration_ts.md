# Міграція на TypeScript + Playwright + Cucumber + Allure

## Статус і межі робіт

**Статус: план підготовлено; очікується ревью та підтвердження користувача.**

До підтвердження не створюємо реалізацію, не встановлюємо залежності та не змінюємо Java-код.
Повні права в межах репозиторію не скасовують контрольних точок ревью.

- Уся нова реалізація, конфігурація, залежності, локальна документація, перевірки й артефакти
  виконання розміщуються в `typescript_framework/`.
- Цей документ знаходиться в root за прямою вимогою користувача.
- Java-версія залишається робочим еталоном до окремого фінального ревью.
- `sales-analytics-qa-task/` використовується обома версіями без зміни застосунку.
- До фінального перенесення не редагуємо root `pom.xml`, `src/`, `.gitignore`, README та
  наявну документацію; нові правила ignore й інструкції створюємо всередині TS-директорії.
- Не змінюємо інші проєкти, системні налаштування або глобальні пакети. Додаткові права
  поза репозиторієм наразі не потрібні. Якщо виникне така потреба, спочатку запитуємо дозвіл.
- Старий проєкт `ui-automation-testing` уже переглянуто як приклад підходу; не копіюємо його
  Protractor-залежності, глобальний browser, файловий service locator або fixed sleeps.
- Не додаємо заплановане в `TESTS_COVERAGE.md` бізнес-покриття: переносимо реалізоване.
- Не створюємо коміти й не виконуємо push без окремої вказівки.

## Як відмічати виконання

`[ ]` означає незавершену дію; `[x]` — виконану й перевірену дію.
Критерії приймання етапу є обов'язковими, а не рекомендаціями.
Етап не закривається лише тому, що написано код.

Після кожного етапу обов'язково оновлюємо цей документ:

1. Позначаємо лише фактично виконані пункти.
2. Додаємо запис до журналу з файлами, змінами, перевірками та фактичними результатами.
3. Пояснюємо, як збережено поведінку Java-версії та чому потрібні відмінності.
4. Фіксуємо проблеми, незавершені перевірки й наступну дію.
5. Якщо потрібне нове рішення — пропонуємо конкретні варіанти, отримуємо підтвердження
   й лише після цього реалізуємо залежну частину.

Під час роботи документ ведемо українською. Після всіх погоджених етапів і перевірок
перекладаємо завершений документ англійською відповідно до contributor guide,
якщо користувач не погодить іншу мову.

## 0. Перевірений поточний стан

- [x] Переглянуто Maven-залежності, suites, hooks, конфігурацію та contributor guide.
- [x] Переглянуто API-контракти, клієнт, Allure-декоратор, моделі, builders і steps.
- [x] Переглянуто UI wrappers, сторінку, компоненти, PageFactory, lazy lists та їхні тести.
- [x] Переглянуто обидва feature-файли й правила ArchUnit.
- [x] Переглянуто `initChild()` і `ElementsArray` у старому TS-проєкті.
- [ ] Отримано підтвердження плану й рішень із розділу 1.
- [ ] Виконано Java baseline; фактичне виконання ще не перевірялось у межах цієї міграції.

Наявна структура залежностей:

```text
Gherkin -> definitions -> steps
                          |-> TransactionsService -> AllureApiClient -> PlaywrightApiClient
                          |-> TransactionsPage -> components -> controls -> Locator

testsupport -> scenario context, Cucumber hooks, providers, converters
framework   -> reusable infrastructure, без залежності на application/testsupport
```

Реалізовано два API-приклади й три UI-приклади: **п'ять виконуваних сценаріїв**.
Переносимо також підтримку Clear, усіх наявних контролів і filters/builders, навіть якщо
відповідний метод ще не використано в feature-файлі.

Важливі інваріанти:

| Поверхня | Поведінка, яку зберігаємо |
|---|---|
| Запуск | API/UI suites, Cucumber tag expressions, один worker і один retry за замовчуванням |
| Браузери | Chromium і Firefox; `headless=false`; viewport 1790 x 1120 |
| Таймаути | UI 10 000 ms; API 30 000 ms; request timeout `0` вимикає обмеження |
| API URL | Завершальний `/` у base URL; `transactions` не втрачає `/api` |
| Request options | Пропуск відсутніх filters; збереження явно заданого порожнього рядка; finite non-negative timeout |
| Assertions | Непорожні результати та перевірка всіх region/category значень, а не лише першого |
| UI synchronization | Очікування потрібного GET response до trigger; перевірка HTTP; очікування loading status |
| Ресурси | Окремий lifecycle на сценарій; API dispose; context close до browser close |
| Cleanup | Виконати всі дії; не втратити першу й наступні помилки; не перетворювати failure на success |
| Allure | Request до виклику; resolved URL і response після; stack trace при transport failure |
| Артефакти | Screenshot failed UI за наявності page; HAR із унікальним ім'ям; Environment; Cucumber JSON |
| Межі шарів | Framework не імпортує application/testsupport; application API/UI не імпортує testsupport |

Документація згадує failed-scenario list, але поточний `cucumber.properties` не містить
rerun formatter. У TS це буде явно погоджена можливість, а не твердження про наявний Java output.

## 1. Рішення, що потребують підтвердження

Наведені рекомендації **ще не є погодженими рішеннями**.
Ревью може підтвердити всі рекомендації або змінити окремі.
Якщо відповідь неоднозначна, запитуємо уточнення по одному питанню; не обираємо мовчки.

| ID | Питання | Рекомендація | Альтернатива / компроміс |
|---|---|---|---|
| D1 | Runtime та toolchain | Підтримуваний Node.js LTS, npm, ESM, strict TypeScript; компіляція `tsc` перед запуском | CommonJS або прямий TS runtime; додаткова runtime-залежність не потрібна при компіляції |
| D2 | `@FindBy` | Зберегти декларативний API; сучасні TS-декоратори, явний конструктор, власна невелика PageFactory | Legacy decorators з metadata; або `initChild()`, що змінює стиль оголошень |
| D3 | Assertions та unit tests | `node:assert/strict` і `node:test` для інфраструктури; зрозумілі assertion messages | Chai для fluent assertions; Vitest, якщо потрібні розширені mocks/runner можливості |
| D4 | DI | Cucumber World як scenario composition root; окремі providers; constructor injection у services/pages/steps | Scenario-scoped DI-контейнер, наприклад Awilix; більше залежностей і налаштувань |
| D5 | Конфігурація | JSON-файли середовищ, власний тонкий loader, environment overrides; документований mapping старих ключів | Залишити `.properties` із parser-бібліотекою; більш буквальний перенос формату |
| D6 | JSON mapping | Явні converters/decoders, перевірки лише потрібної сумісності з Java; не робити blanket `as T` | Zod для схем; сувора валідація всіх полів може змінити прийнятність response |
| D7 | `BigDecimal revenue` | `decimal.js` і перевірений lossless JSON parser, наприклад `lossless-json`; явний decoder моделі | JS `number` простіший, але не гарантує паритет точності; допустимий лише після окремого схвалення |
| D8 | Логування | Pino з console output і контекстом scenario/worker | `log4js` ближчий до поточної конфігурації; `console` без окремої бібліотеки простіший |
| D9 | Архітектурні перевірки | Dependency Cruiser для еквівалентів двох наявних ArchUnit-правил; ESLint для TS | ESLint boundaries замість окремого dependency checker |
| D10 | Retries і rerun | Default parallel=1, retry=1; override через CLI; rerun formatter та npm script | Retry тільки для `@flaky`, але це відрізняється від поточних defaults |
| D11 | Allure generation | `allure-cucumberjs`, `allure-js-commons`, локальний CLI; зберегти можливість single-file report | Інший підтримуваний Allure CLI після перевірки сумісності; окремо погодити зміну output |

Конкретні сумісні версії обираємо та фіксуємо lockfile на етапі 2 після перевірки
Node engines, peer dependencies, decorators і можливостей Allure CLI.
Не встановлюємо довільні `latest` без перевірки.
Якщо single-file generation потребує JVM, явно документуємо це: міграція тестового коду
на TS не означає автоматичного усунення JVM із генерації звітів.

## 2. Baseline і автономний TS skeleton

**Передумова:** підтверджені D1 та загальний план.

- [ ] Перевірити доступні Node/npm/Java/Maven і стан worktree; не змінювати сторонні правки.
- [ ] Узгодити місце Java baseline artifacts: копія Java-проєкту й outputs всередині
      `typescript_framework/`, без використання root `target/` для цієї міграції.
- [ ] Запустити API/UI Java baseline проти незміненого застосунку; записати п'ять сценаріїв,
      браузер, tags, timeouts та фактичні результати. Якщо baseline failed — зафіксувати,
      відокремити pre-existing defect і погодити вплив, не виправляти застосунок мовчки.
- [ ] Виконати наявні PageFactory й architecture tests; зберегти baseline їхніх результатів.
- [ ] Створити TS manifest, lockfile, tsconfig, локальний `.gitignore` та README.
- [ ] Підготувати build/typecheck/lint/unit/cucumber scripts з cwd у TS-директорії.
- [ ] Зафіксувати всі output paths усередині TS-директорії; не писати в root `target/`.
- [ ] Копіювати feature-файли без редагування тексту, tags і Examples.
- [ ] Перевірити discovery через dry-run; очікується рівно п'ять сценаріїв.
- [ ] Перевірити clean install і compilation skeleton; не встановлювати глобальні tools.

Цільова структура до фінального перенесення:

```text
typescript_framework/
  package.json
  package-lock.json
  tsconfig.json
  cucumber.mjs
  .gitignore
  README.md
  src/
    framework/
      api/clients/
      config/
      json/
      lifecycle/
      playwright/
      reporting/allure/
      ui/control/
      ui/pagefactory/
    salesanalytics/
      api/models/
      ui/component/
      steps/api/
      steps/ui/
      definitions/api/
      definitions/ui/
    testsupport/
      context/
      cucumber/api/
      cucumber/ui/
  resources/configs/
  features/be/
  features/fe/
  tests/architecture/
  tests/framework/
  tests/acceptance/
  scripts/
  dist/                         # generated, ignored
  target/                       # generated, ignored; baseline/results/HAR/rerun
  allure-report/                # generated, ignored
```

**Приймання:** TS-проєкт автономно встановлюється й компілюється; Java baseline
зафіксовано або його блокер явно погоджено; feature discovery не змінено.

## 3. Конфігурація, JSON і cleanup

**Передумови:** етап 2; підтверджені D5-D8.

- [ ] Перенести env selection, defaults та override precedence.
- [ ] Зберегти значення `local`; окремо відобразити CLI parameters Cucumber на Environment.
- [ ] Помилка відсутнього env-файлу має бути явною; не підставляти `local` мовчки.
- [ ] Перенести JSON serialization і conversion; перевірити `<empty>`, null/omitted values
      та numeric conversion там, де це підтримувала Java-версія.
- [ ] Узгодити contract decoder із Jackson: не додавати нові schema rejection rules без підтвердження.
- [ ] Перевірити lossless decimal parsing/serialization без проміжного округлення через JS `number`.
- [ ] Перенести асинхронний cleanup: виконати всі actions у заданому порядку, зберегти
      первинну помилку й наступні помилки в документованому error representation.
- [ ] Налаштувати логування без витоку secrets і без приховування помилок.
- [ ] Додати unit tests: overrides, missing env, invalid timeout, nullable/empty values,
      decimal precision, кілька cleanup failures та success path.

**Приймання:** конфігурація еквівалентна за змістом; decimal precision не втрачена;
cleanup не обриває решту дій і не маскує failures.

## 4. Playwright session і API framework

**Передумови:** етап 3.

- [ ] Перенести PlaywrightSession зі scenario-scoped resource ownership.
- [ ] Зберегти Chromium/Firefox, headless default, viewport та UI timeout.
- [ ] Створювати APIRequestContext без запуску браузера для API-only сценарію.
- [ ] Зберегти URL normalization, API default timeout та request override.
- [ ] Перенести ApiClient, ApiRequestOptions і ApiResponse, використовуючи Promise для I/O.
- [ ] Залишити ApiResponse Playwright-backed; не реалізовувати відкладений roadmap
      transport-neutral response в межах міграції.
- [ ] Зберегти defensive copy request parameters і omission semantics.
- [ ] Перенести provider chain `AllureApiClient -> PlaywrightApiClient`.
- [ ] Закривати API context через client; UI context до browser; не дублювати ownership.
- [ ] Використовувати унікальні HAR paths на scenario attempt.
- [ ] Додати тести URL resolution, params, timeout=0, HTTP response, transport failure,
      partial initialization та cleanup failure.

**Приймання:** API-only run не відкриває браузер; правильний `/api/transactions`;
success/error behavior і порядок закриття збережені.

## 5. Декоратори `@FindBy`, PageFactory і lazy collections

**Передумови:** етап 4; підтверджений D2.

Спершу доводимо життєздатність декораторів на мінімальному прикладі в реальному
toolchain. Не замінюємо їх на `initChild()` автоматично, якщо прототип не вдався.

- [ ] Перевірити сучасні decorators, field/accessor initialization та успадкування.
- [ ] Визначити єдиний контракт створення сторінок/компонентів після готовності PageWrapper:
      не ініціалізувати поля підкласу з BasePage constructor так, щоб вони перезаписувались.
- [ ] Реалізувати class selector metadata й explicit constructor reference для полів.
- [ ] Зберегти field selector precedence над class selector; fallback class selector.
- [ ] Задокументувати TS-відмінність: сам тип поля без декоратора не доступний у runtime;
      для class-selector fallback потрібна явна реєстрація поля, наприклад декоратор із
      конструктором без selector. Конкретний API погоджується в рамках D2.
- [ ] Реалізувати raw Locator leaf і вкладені wrappers/components з parent-scoped selectors.
- [ ] Не виконувати DOM reads/actions під час фабричної ініціалізації.
- [ ] Перенести lazy typed collection як окремий API, а не удаваний синхронний JS Array:
      async count/isEmpty/snapshot; повторна резолюція на наступній операції.
- [ ] Перевірити snapshot membership після додавання DOM-вузлів; не обіцяти стабільну
      ідентичність вузла при перестановці/видаленні positional Locator-ів, чого не гарантує Java.
- [ ] Перевірити успадкування metadata без її витоку до sibling subclasses.
- [ ] Зберегти cycle diagnostics із field chain, selector і причиною.
- [ ] Відхиляти invalid declarations; Java final/raw/wildcard-specific checks замінити
      відповідними TS compile-time/runtime перевірками, а не фіктивним reflection.
- [ ] Перенести всі поведінкові кейси `PageFactoryTest`, включно з real Chromium DOM test.

**Приймання:** типізовані компоненти створюються без DOM queries; precedence, nested
scoping, collections та diagnostics підтверджені тестами; decorators не залежать
від `as any`, прихованих globals чи непідтверджених compiler flags.

## 6. Sales Analytics API/UI та test steps

**Передумови:** етап 5; підтверджений D3.

- [ ] Перенести TransactionFilter, TransactionFilters і RequestOptionsBuilder.
- [ ] Перенести TransactionsResponse, включно з meta/filter fields і decimal revenue.
- [ ] Перенести TransactionsService без Allure/Cucumber залежностей.
- [ ] Перенести PageWrapper, BasePage, Button, Dropdown та Table.
- [ ] Перенести TransactionsPage, Filters і TransactionsGrid зі всіма поточними методами.
- [ ] Зберегти selectors, header mapping, trimming, select-by-value, Apply і Clear.
- [ ] Зареєструвати response wait до click; перевірити endpoint, GET і HTTP status.
- [ ] Зберегти loading synchronization без sleeps. Виявлені baseline race conditions
      описати й погодити окремо, не міняти поведінку під виглядом переносу.
- [ ] Перенести API/UI steps; assertions мають залишатися у steps, не у controls/services.
- [ ] Перевірити positive і negative paths, непорожні результати й усі значення filters.
- [ ] Порівняти перелік публічних операцій Java/TS; не пропустити невикористані в features методи.

**Приймання:** application layer функціонально еквівалентний; API/UI operations
не знають про lifecycle/container; бізнес-assertions залишилися в тестовому шарі.

## 7. Cucumber World, definitions, hooks і suite profiles

**Передумови:** етап 6; підтверджений D4.

- [ ] Створити scenario-scoped World і providers; constructor injection у звичайних класах.
- [ ] Зберегти роль Context/ContextKey; не вводити непогоджений context redesign.
- [ ] Врахувати async initialization і готовність page перед PageFactory/provider wiring.
- [ ] Не створювати API/browser resources для сценаріїв, що їх не потребують.
- [ ] Перенести definitions без зміни Gherkin expressions.
- [ ] Замість JVM DataTable transformers додати явні JS adapters із тим самим
      mapping: transpose filters, case-insensitive enum names, `<empty>`.
- [ ] Перенести shared status-code definition та @api/@ui hooks.
- [ ] Визначити behavior змішаних tags без double disposal; поточні features мають один тип.
- [ ] Створити API/UI profiles за feature paths, tag overrides і default all-scenarios profile.
- [ ] Зберегти Cucumber JSON і summary; вимкнути external publishing.
- [ ] Перевірити dry-run і послідовний запуск п'яти сценаріїв.

**Приймання:** API=2, UI=3, all=5; відсутні undefined/ambiguous bindings;
World і ресурси не спільні між сценаріями.

## 8. Allure і артефакти

**Передумови:** етап 7; підтверджений D11.

- [ ] Налаштувати Cucumber formatter та Allure runtime API із сумісними версіями.
- [ ] Прикріпляти request до transport call; URL/response після; failure stack trace й rethrow.
- [ ] Прикріпляти screenshot лише при failed UI з доступною page, до cleanup.
- [ ] Перевірити збереження screenshot/attachment error разом із cleanup error.
- [ ] Записувати effective Environment без конкурентного перезаписування worker-ами.
- [ ] Перевірити tags/labels/links: не вигадувати Jira/TestRail mappings, яких немає у Java.
- [ ] Додати generate/serve та підтверджений single-file command.
- [ ] Перевірити відсутність змішування baseline Java й TS results.
- [ ] Перевірити attachment contents, існування файлів, валідність JSON і згенерований report.

**Приймання:** звіт реально генерується й містить потрібні дані; жодна reporting
помилка не прихована; HAR finalization і screenshot підтверджені файлами.

## 9. Parallel, retries і failed-only rerun

**Передумови:** етап 8; підтверджений D10.

- [ ] Реалізувати default parallel=1/retry=1 та CLI overrides.
- [ ] Підготувати контрольовані fixtures під `tests/acceptance/`, не змінюючи application features.
- [ ] Показати фактичне перекриття інтервалів виконання мінімум двох сценаріїв;
      одного `--parallel 2` у команді недостатньо як доказ.
- [ ] Довести World/context/page/API isolation та відсутність attachment/HAR collisions.
- [ ] Перевірити failed-first/passed-second: рівно дві спроби, нові ресурси й повтор hooks.
- [ ] Перевірити permanently failed: максимум дві спроби й non-zero exit status.
- [ ] Перевірити retry=0 та, якщо погоджено, retry tag filter.
- [ ] Перевірити failed UI screenshots і HAR для різних attempts.
- [ ] Перевірити Allure retry grouping: одна logical test identity, видимі попередні
      attempts; не включати attempt ID до history identity.
- [ ] Додати rerun formatter; перевірити failed-only selection для Scenario Outline row.
- [ ] Використовувати rerun-файл із basename, що починається на `@`, наприклад
      `target/@rerun.txt`, згідно з вимогами обраної Cucumber.js версії.
- [ ] Перевірити порожній rerun: нуль сценаріїв, без випадкового запуску all profile.
- [ ] Не запускати rerun через `&&` після failed main run; scripts мають свідомо обробляти
      exit codes і не маскувати кінцевий failure.
- [ ] Виконати одночасний parallel+retry прогін; перевірити звіт і cleanup.

**Приймання:** доведені concurrency, isolation, attempt count, failed-only selection
та коректні exit codes. Синтетичні failures не забруднюють основний Allure report.

## 10. Архітектура, документація й повний паритет

**Передумови:** етап 9; підтверджений D9.

- [ ] Відтворити два чинні ArchUnit boundary rules для TS imports.
- [ ] Перевірити checker навмисним invalid import у fixture; позитивного запуску недостатньо.
- [ ] Перевірити typecheck, lint, unit/integration/acceptance tests.
- [ ] Виконати API, Chromium UI та Firefox UI; послідовно й у parallel режимі.
- [ ] Перевірити headed default, headless override, tags та suite profiles.
- [ ] Порівняти Java/TS scenario names, tags, filters, counts, status і assertions.
- [ ] Порівняти звіти за змістом, не вимагати побайтової рівності timestamps/UUID/layout.
- [ ] Підготувати локальний README і contributor guide: setup, configuration mapping,
      PageFactory API, lifecycle, commands, retries, rerun, reports та troubleshooting.
- [ ] Не стверджувати, що tests запущено, якщо перевірено лише compilation/dry-run.
- [ ] Перевірити clean install без глобальних npm tools і outputs поза TS-директорією.
- [ ] Підготувати exact file manifest фінального перенесення та перелік Java-only deletion paths.
- [ ] Підготувати mapping наявної roadmap документації; не втратити незавершені рішення.
- [ ] Надати користувачу підсумок, відмінності, blockers і команди перевірки для ревью.

**Приймання:** усі перевірки виконано або винятки явно погоджено; TS працює автономно;
Java ще не видалено; є точний manifest для наступного етапу.

## 11. Фінальне ревью та перенесення в root

**Окрема контрольна точка:** лише після підтвердження користувачем реалізації та manifest.
Ревью плану не є автоматичним дозволом виконати цей етап.

- [ ] Отримати явне підтвердження видалення Java й перенесення.
- [ ] Перевірити актуальний worktree і конфлікти з новими root файлами.
- [ ] Зберегти досяжну Git-версію Java; не робити destructive rollback commands.
- [ ] Перенести лише файли погодженого manifest; не переносити node_modules, baseline,
      dist, HAR, results або Allure report як source files.
- [ ] Видалити тільки погоджені Java source/resource/build файли за точними paths;
      не видаляти root чи весь `src/` рекурсивно без інвентаризації.
- [ ] Перенести TS configuration/resources/features/scripts і оновити cwd-relative paths.
- [ ] Інтегрувати root `.gitignore`, README, contributor guide та roadmap documentation,
      зберігши незалежні матеріали й `sales-analytics-qa-task/`.
- [ ] Зберегти `TESTS_COVERAGE.md`, якщо ревью не вимагає іншого; це бізнес-план, не Java-код.
- [ ] Повторно виконати install/build/typecheck/lint/tests, API/UI, parallel+retry,
      rerun та Allure generation вже з root.
- [ ] Прибрати лише власні тимчасові файли за відомими paths.
- [ ] Видалити TS staging-директорію лише після перевірки відсутності потрібних файлів.
- [ ] Завершити журнал, відмітити фактичні результати й погоджені відмінності.
- [ ] Перекласти завершену документацію згідно з погодженою мовною вимогою.

**Приймання:** root є єдиним робочим TS framework; Java видалено тільки після ревью;
команди й звіти працюють після зміни розміщення; застосунок не змінено.

## Блокери та правило отримання підтвердження

Якщо не вистачає даних, зупиняємо залежну дію, додаємо блокер сюди й ставимо конкретне
питання з варіантами. Можна продовжувати незалежні погоджені частини.

Обов'язково запитуємо перед:

- зміною assertions, synchronization, lifecycle або timeout defaults;
- округленням decimal до `number` чи зміною JSON validation contract;
- заміною декораторів на інший спосіб оголошення елементів;
- відмовою від Firefox, single-file report, retries/rerun або частини існуючих методів;
- виправленням pre-existing Java/application defects;
- створенням CI workflow, якщо поточний репозиторій не задає вимог до CI;
- діями поза репозиторієм, системними змінами або глобальними установками;
- фінальним видаленням Java й перенесенням у root.

## Журнал виконання

### 2026-11-05 — підготовка плану

- **Виконано:** read-only інвентаризацію поточної реалізації та старого TS-прикладу;
  створено цей план із checklist, gates і критеріями приймання.
- **Пояснення:** логічні шари зберігаємо; заміна JVM-механізмів DI/reflection/runner
  є необхідною мовною адаптацією, а не приводом реалізувати сторонній roadmap.
- **Виявлені нюанси:** `BigDecimal` потребує окремого рішення щодо точності; TS не може
  автоматично знайти тип неанотованого поля; lazy collection operations стають async;
  Java BasePage initialization order не можна копіювати буквально; rerun output наразі
  описаний у README, але не налаштований у Cucumber plugins.
- **Перевірки:** перегляд коду й конфігурації. Тести, build, install і report generation
  не запускались. Java-код і застосунок не змінювались.
- **Блокер:** потрібне ревью плану та підтвердження D1-D11.
- **Наступна дія:** після підтвердження — етап 2; фінальне перенесення залишається за
  окремою контрольною точкою.

### Шаблон запису після кожного наступного етапу

```text
Дата / етап:
Погоджені рішення:
Виконані checklist IDs / пункти:
Змінені файли:
Що змінено й навіщо:
Як збережено Java behavior:
Перевірки — команда, cwd, очікування, фактичний результат:
Погоджені відмінності:
Помилки / blockers / невиконані перевірки:
Статус етапу:
Наступна дія:
```
