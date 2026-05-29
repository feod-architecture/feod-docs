# Cross-links QA

Этот документ фиксирует проверку связей и дублирования после добавления guides, examples и reference polish.

## Проверенные области

- `docs/get-started/`
- `docs/core-concepts/`
- `docs/structure/`
- `docs/guides/`
- `docs/reference/`
- `docs/examples/`
- `docs/tools/`
- `docs/blog/`

## Результат

- Onboarding ведёт от краткого объяснения к `Core Concepts`, `Structure` и строгому `Reference`.
- Core Concepts и Structure страницы ссылаются на `reference/terms.md`, `reference/import-matrix.md`, `reference/public-api.md`, `reference/naming.md` и `reference/code-smells.md` там, где нужен строгий контракт.
- Guides ссылаются на канонические reference-страницы вместо повторного определения import rules и public API.
- Examples показывают локальные good/bad snippets и ведут к строгим правилам для проверки.
- Tools и Blog не содержат нормативных правил вместо Docs/Reference.
- Пользовательские страницы не ссылаются на бывший раздел `Прочее`.

## Проверки

- Markdown-ссылки внутри `docs/` разрешаются в существующие `.md` файлы.
- Абсолютные markdown-ссылки из пользовательских страниц заменены на относительные.
- Ссылки на `docs/meta/terminology.md` из пользовательских страниц заменены на `docs/reference/terms.md` или `docs/reference/glossary.md`.
- Bare references вида `Матрица импортов`, `Public API`, `Уровни` в блоках "Связанные страницы" заменены markdown-ссылками.

## Остаточные исключения

- Упоминания бывшего раздела `Прочее` остаются только в meta-документах аудита и IA, где они объясняют миграцию старого контента.
- Разговорные запрещённые формы вроде `паблик API` остаются только в `terms.md` и `style-guide.md` как anti-examples.
