# FEOD Analyzer

FEOD Analyzer - CLI-инструмент для проверки FEOD-архитектуры в frontend-проекте. Он строит граф FEOD-сущностей, находит нарушения импортов и public API, а затем экспортирует JSON и статический HTML-отчёт.

Инструмент помогает ревью и CI, но не заменяет архитектурное решение команды.

## Когда подключать

Подключайте FEOD Analyzer, когда проект уже зафиксировал:

- уровни `app`, `pages`, `modules`, `common`, `global`;
- public API через root `index.ts`;
- aliases импортов;
- допустимые подмодули и исключения;
- правила, по которым CI должен блокировать изменения.

Если границы модулей ещё спорные, сначала согласуйте их в документации проекта или README.

## Что проверяет

Минимальный набор проверок:

| Проверка | Пример нарушения | Связанное правило |
| --- | --- | --- |
| Запрещённые зависимости уровней | `modules` импортирует `pages` | [Матрица импортов](../reference/import-matrix.md) |
| Deep imports | `@/modules/cart/model/cart-store` | [Public API](../reference/public-api.md) |
| Импорт чужого подмодуля | `@/modules/checkout/payment` | [Подмодули](../guides/submodules.md) |
| Прямой импорт `global` | `@/global/env` из модуля | [Global](../structure/global.md) |
| Отсутствие public API | нет root `index.ts` в модуле | [Контракт модуля](../reference/module-contract.md) |
| `export *` leaks | `export * from './model/internal'` | [Code smells](../reference/code-smells.md) |
| Циклы FEOD-сущностей | `cart -> checkout -> cart` | [Правила зависимостей](../core-concepts/dependency-rules.md) |

## Что получает команда

Анализатор генерирует два вида отчёта:

- `json` - машинно-читаемый отчёт для CI, bots и внутренних dashboards;
- `html` - статический отчёт с графом зависимостей, списком нарушений и деталями по FEOD-сущностям.

HTML-отчёт можно открыть как статические файлы или запустить локально через `--serve`.

## CLI

```bash
bunx @feod-architecture/analyzer analyze ./src --out ./dist/feod --formats html,json
npx @feod-architecture/analyzer analyze ./src --out ./dist/feod --formats html,json
pnpm dlx @feod-architecture/analyzer analyze ./src --out ./dist/feod --formats html,json
```

Полная форма:

```bash
feod-analyzer analyze [path] \
  --config feod-analyzer.yml \
  --out ./dist/feod \
  --formats html,json \
  --serve \
  --port 3123 \
  --fail-on error
```

Exit codes:

- `0` - анализ завершён без нарушений выбранного порога;
- `1` - найдены нарушения, соответствующие `--fail-on`;
- `2` - ошибка конфигурации, чтения проекта, анализа или экспорта.

## Package managers

Пакет можно запускать через `bunx`, `npx` и `pnpm dlx`. Репозиторий также поддерживает локальные команды `bun run`, `npm run` и `pnpm run` для build/test workflow.

## Конфигурация

Анализатор ищет конфигурацию в файлах:

- `feod-analyzer.yml`;
- `feod-analyzer.yaml`;
- `.feod-analyzer.yml`;
- `.feod-analyzer.yaml`.

Пример:

```yaml
srcDir: src
outputDir: dist/feod
outputFormats: [html, json]
excludeDirs: [node_modules, .git, dist, build, coverage]
aliases:
  "@": src
levels: [app, pages, modules, common, global]
segments: [ui, model, api, lib, config, types, test, tests]
submodules:
  enabled: true
  maxDepth: 2
ignoreRules: []
```

Config должен отражать правила проекта. Он не должен скрывать архитектурные исключения без причины.

## CI flow

Минимальный поток:

1. Сгенерировать отчёт в CI.
2. Использовать `--fail-on error` для блокировки критичных нарушений.
3. Публиковать HTML-отчёт как build artifact.
4. Для legacy-проекта временно фиксировать исключения и удалять их после миграции.

## Ограничения

Анализатор не решает:

- правильно ли выбрана продуктовая граница модуля;
- не раздут ли public API;
- оправдано ли исключение из правила;
- нужно ли переносить код в `common` по смыслу.

Эти решения остаются в архитектурном ревью.

## Связанные страницы

- [FEOD config](./feod-config.md)
- [Матрица импортов](../reference/import-matrix.md)
- [Public API](../reference/public-api.md)
- [Code review checklist](../guides/code-review.md)
