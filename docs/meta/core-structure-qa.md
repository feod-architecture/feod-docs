# QA Core Concepts и Structure

Статус: контрольный отчёт

Этот документ фиксирует проверку `Core Concepts`, `Structure`, `Матрицы импортов` и `Public API` после выполнения этапа core documentation.

## Проверенные страницы

Core Concepts:

- `docs/core-concepts/modularity.md`
- `docs/core-concepts/fractality.md`
- `docs/core-concepts/entity-orientation.md`
- `docs/core-concepts/levels.md`
- `docs/core-concepts/dependency-rules.md`

Structure:

- `docs/structure/app.md`
- `docs/structure/pages.md`
- `docs/structure/modules.md`
- `docs/structure/common.md`
- `docs/structure/global.md`

Reference:

- `docs/reference/import-matrix.md`
- `docs/reference/public-api.md`

## Проверка правил импортов

Правила `Core Concepts` и `Structure` сверены с `docs/reference/import-matrix.md`.

Результат:

- `app` импортирует `pages`, `modules`, `common` и не импортируется другими уровнями.
- `pages` импортирует `modules`, `common` и не импортирует `app`, другие страницы, `global`.
- `modules` импортирует `common`, public API других модулей и не импортирует `app`, `pages`, `global`.
- `common` импортирует только public API других сущностей `common` и внешние пакеты.
- `global` не является обычной прикладной зависимостью и не импортируется напрямую из продуктового кода.

Противоречий с матрицей импортов после правок не найдено.

## Проверка public API

Страницы согласованы с `docs/reference/public-api.md`.

Проверено:

- внешний код использует модуль через корневой `index.ts`;
- deep imports во внутренности модулей и `common` описаны как нарушение;
- подмодуль не становится внешним контрактом только из-за собственного `index.ts`;
- type-only imports не выделены как исключение из архитектурных правил.

Противоречий с `Public API` после правок не найдено.

## Good/bad examples

Каждый верхний уровень покрыт good/bad examples:

| Уровень | Где покрыт |
| --- | --- |
| `app` | `docs/core-concepts/levels.md`, `docs/structure/app.md` |
| `pages` | `docs/core-concepts/levels.md`, `docs/structure/pages.md` |
| `modules` | `docs/core-concepts/levels.md`, `docs/structure/modules.md` |
| `common` | `docs/core-concepts/levels.md`, `docs/structure/common.md` |
| `global` | `docs/core-concepts/levels.md`, `docs/structure/global.md` |

Каждый запрет, проверенный в рамках QA, имеет пример нарушения рядом с формулировкой или в связанной странице этого же раздела.

## Терминология

Проверены спорные термины:

- каноническое имя уровня - `global`;
- `globals` встречается только как пример недопустимой равноправной формы;
- `слой` используется только как пояснение для аудитории FSD;
- разговорные формы `public API` не используются;
- FEOD-сущность разведена с DDD entity.

## Исправления в рамках QA

В рамках проверки исправлено:

- в `docs/get-started/overview.md` и `docs/reference/import-matrix.md` уточнена роль `global`, чтобы он не читался как скрытый общий уровень;
- в `docs/core-concepts/levels.md` убрана формулировка `прикладной слой`;
- в `docs/structure/app.md`, `docs/structure/pages.md`, `docs/structure/modules.md` заголовок `Advanced patterns` заменён на `Углублённые паттерны`;
- в `docs/structure/common.md` и `docs/structure/global.md` убраны формулировки, которые могли вводить `shared-слой` как неутверждённый термин;
- в `docs/core-concepts/dependency-rules.md` подписи `Good example` и `Bad example` приведены к структуре шаблона.

## Результат

Открытых блокирующих замечаний по core/structure правилам не осталось. Следующие этапы могут использовать эти страницы как основу для guides, examples, glossary, code smells и финального content QA.
