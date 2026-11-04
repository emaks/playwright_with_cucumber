# План: Завершити складання залежностей через providers

## Мета

Явно визначати, де створюються залежності та хто відповідає за їхні ресурси, коли об'єкту
потрібні application-specific налаштування, decorator або окремий lifecycle. Для звичайних
сервісів і Page Objects залишити constructor injection через Cucumber-PicoContainer.

Поточний API client/reporting chain уже реалізовано. План фіксує цю роботу й описує, як
додавати providers під конкретні майбутні вимоги, не створюючи provider для кожного класу.

## Межі змін

- Залишити Cucumber-PicoContainer механізмом dependency injection.
- Application services і Page Objects мають отримувати залежності через конструктори.
- Збірку перевикористовуваних clients і reporting розміщувати в
  `testsupport.cucumber`.
- Збірку application-specific dependencies розміщувати поруч із відповідним test glue
  застосунку.
- Додавати provider лише тоді, коли цього вимагає створення, конфігурація, декорування
  або володіння ресурсом. Прості класи PicoContainer може створювати напряму через
  constructor injection.
- Не додавати service locator, інший DI framework, static registries або універсальні
  factories без конкретної потреби.
- Не додавати авторизацію, ролі, альтернативний transport або worker-scoped resources,
  доки користувач не визначить необхідну поведінку та lifecycle.

## Поточна реалізація

| Напрямок | Реалізована поведінка |
|----------|------------------------|
| API client provider | `testsupport.cucumber.api.ApiClientProvider` зареєстрований через `@CucumberPicoProvider` і повертає `AllureApiClient(PlaywrightApiClient(...))`. |
| Ін'єкція сервісу | `TransactionsService` отримує `ApiClient` через конструктор. Сервіс створює Cucumber-PicoContainer; окремого provider для нього немає. |
| Ін'єкція UI | `TransactionsPage` отримує `PageWrapper` через конструктор. Сторінку й компоненти створює Cucumber-PicoContainer. |
| Reporting | Allure request/response reporting залишається в decorator `AllureApiClient`, а не в application services. Transport exceptions додаються до звіту й повторно кидаються. |
| Cleanup ресурсів | API hooks закривають API client перед Playwright session. UI hooks, коли можливо, додають screenshot при падінні, а потім закривають Playwright session. |
| Scope сценарію | Cucumber-PicoContainer надає залежності в межах сценарію; static dependency registry не використовується. |

Це вже реалізована основа, а не вимога створювати окремий provider для кожного сервісу,
сторінки чи компонента.

## Етап 1. Зафіксувати поточний граф залежностей

- [x] Знайти `ApiClientProvider`, API/UI hooks, `TransactionsService`, `TransactionsPage`
  та їхні конструктори.
- [x] Підтвердити, що `ApiClientProvider` збирає `PlaywrightApiClient` разом із
  `AllureApiClient`.
- [x] Підтвердити, що сервіси й сторінки отримують залежності через constructor injection,
  а не через global registry.
- [x] Підтвердити, що API/UI hooks володіють cleanup і не приховують помилок закриття.
- [x] Після оновлення Cucumber glue запустити API та UI suites і перевірити Allure
  request/response attachments.

**Коментарі — виконано 2026-11-04:**

- `ApiClientProvider` розташований у `io.materialspace.testsupport.cucumber.api` і
  знаходиться Cucumber-PicoContainer через `@CucumberPicoProvider`.
- `TransactionsService(ApiClient)` та `TransactionsPage(PageWrapper)` створюються через
  constructor injection. Наразі жодному з цих класів не потрібен окремий provider.
- API suite додав request і response attachments для обох сценаріїв. API та UI suites
  пройшли: відповідно 2 сценарії / 8 кроків і 3 сценарії / 18 кроків.
- Порядок cleanup і агрегація помилок перевірені в попередньому плані розділення
  framework/application.

## Етап 2. Уточнити вимоги перед додаванням нового provider

Цей етап є точкою прийняття рішення. Не починати реалізацію, доки не визначено конкретну
залежність або інтеграційну потребу.

- [ ] Назвати споживача й залежність, яка йому потрібна.
- [ ] Визначити джерело її значень (конфігурація, secrets, scenario data або інша
  ін'єктована залежність). Не зберігати secrets у коді чи report attachments.
- [ ] Визначити lifetime: сценарій, worker або інший явно погоджений scope.
- [ ] Визначити власника, який закриває або скидає ресурс, і потрібний порядок cleanup.
- [ ] Уточнити, чи потрібен decorator (наприклад, reporting), інший transport або
  поведінка залежно від ролі.
- [ ] Перевірити, чи може Cucumber-PicoContainer створити залежність через конструктор.
  Якщо так, не додавати provider без потреби в окремому складанні чи керуванні ресурсом.
- [ ] Якщо поведінка або scope не визначені, запитати користувача, а не обирати default.

**Завершено, коли:** use case, конфігурація, lifetime і власник cleanup визначені.

**Коментарі:** _споживач, залежність, рішення та погодження користувача._

## Етап 3. Додати provider лише для погодженого use case

Залежить від етапу 2 та явного погодження користувача.

- [ ] Перевикористовувані transport/reporting providers розміщувати в
  `testsupport.cucumber`.
- [ ] Application-specific providers розміщувати поруч із відповідним test glue застосунку.
- [ ] Передавати залежності через конструктори або наявний механізм PicoContainer `Provider`.
  Не діставати їх зі static state чи через service locator.
- [ ] Повертати залежність через найвужчий наявний контракт (наприклад, `ApiClient`).
- [ ] Складати decorators на межі provider. Не викликати Allure з application services
  і зберігати передавання оригінальних exceptions.
- [ ] Явно визначати власника ресурсу: provider, hook або injected resource. Усі потрібні
  cleanup дії мають бути виконані; початкова помилка зберігається, наступні додаються
  як suppressed exceptions.
- [ ] Залишити наявний scenario scope, якщо користувач не погодив інший lifetime.
- [ ] Не змінювати сторонні Page Objects, сервіси, assertions, browser lifecycle або
  поведінку конфігурації.

**Завершено, коли:** погоджена залежність створюється один раз у потрібному scope,
споживачі отримують її через injection, а ресурс має одного власника cleanup.

**Коментарі:** _клас provider, граф залежностей, lifecycle, cleanup та відхилення._

## Етап 4. Перевірити нове складання залежностей

Залежить від етапу 3.

- [ ] Запустити найменший релевантний API/UI suite і підтвердити фактичну кількість
  виконаних сценаріїв.
- [ ] Переконатися, що Cucumber знаходить provider і він не створює дублікати instances
  в межах сценарію.
- [ ] Перевірити, що decorators додають потрібну діагностику й не приховують оригінальні
  exceptions.
- [ ] Переконатися, що ресурси закриваються після успішного й контрольовано невдалого
  сценарію.
- [ ] Запустити `mvn -q -DskipTests test-compile` та релевантні ArchUnit checks.
- [ ] Оновити план і contributor guide лише перевіреною поведінкою.

**Завершено, коли:** нове складання працює під час runtime, діагностика й cleanup
збережені, а package boundaries проходять перевірку.

**Коментарі:** _команди, кількість сценаріїв, attachments, результати cleanup і проблеми._

## Критерії завершення

- [x] Поточний API client/reporting provider описаний як реалізований.
- [x] Constructor injection є стандартом для сервісів і Page Objects.
- [x] Provider не додається лише для обгортання класу, який PicoContainer може створити напряму.
- [ ] Кожен новий provider має конкретний погоджений use case, явний lifetime і власника cleanup.
- [ ] Runtime tests підтверджують discovery, правильний scope instances, reporting і cleanup.

**Статус:** частково реалізовано. Поточне складання API client/reporting завершене;
етапи 2–4 залишаються планом до появи конкретної залежності, якій потрібен окремий provider.
