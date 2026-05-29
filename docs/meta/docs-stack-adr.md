# ADR: Docs stack

## Решение

Для первой технической реализации FEOD Docs выбран VitePress.

## Рассмотренные варианты

| Стек | Сильные стороны | Ограничения для FEOD Docs |
| --- | --- | --- |
| VitePress | Markdown-first, file-based routing, default theme with nav/sidebar, local search, static deploy, built-in i18n model, low setup cost. | MDX не является основной моделью; кастомизация через Vue, если понадобится сложный UI. |
| Docusaurus | Сильная docs/blog модель, versioning, i18n, крупная экосистема. | Больше framework-слоя и конфигурации, чем нужно для текущего Markdown-first PRD. |
| Astro Starlight | Docs-focused Astro stack, доступность, built-in search, MDX/Markdoc options. | Новый слой Astro ради статичной методологической документации сейчас избыточен. |
| Nextra | Хорошая docs theme поверх Next.js, MDX, Pagefind search, i18n через Next.js. | Требует Next.js runtime/model, хотя PRD не требует app-framework возможностей. |

## Критерии

- Markdown support.
- Sidebar и top navigation.
- Search.
- Code blocks.
- i18n readiness.
- Static deploy.
- Theming и extensibility.
- Maintenance cost.

## Обоснование

VitePress напрямую соответствует PRD: готовые `.md` страницы можно оставить источником контента, top navigation и sidebar описываются в `docs/.vitepress/config.mts`, local search включается одной опцией, сборка даёт статический output.

Этот выбор не меняет содержательные решения PRD. Все контентные страницы остаются Markdown-файлами, а технический слой только добавляет навигацию, сборку и локальный preview.

## Источники

- VitePress: <https://vitepress.dev/>
- VitePress routing: <https://vitepress.dev/guide/routing>
- VitePress search: <https://vitepress.dev/reference/default-theme-search>
- VitePress i18n: <https://vitepress.dev/guide/i18n>
- VitePress deploy: <https://vitepress.dev/guide/deploy>
- Docusaurus sidebar: <https://docusaurus.io/docs/sidebar>
- Docusaurus i18n: <https://docusaurus.io/docs/i18n/introduction>
- Astro Starlight: <https://astro.build/themes/details/starlight/>
- Nextra docs theme: <https://nextra.site/docs/docs-theme/start>
