import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import type { DefaultTheme, HeadConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const siteDescriptions = {
  root: "Методология организации frontend-проектов вокруг модулей, public API и контролируемых зависимостей.",
  en: "A methodology for organizing frontend projects around modules, public APIs, and controlled dependencies.",
} as const;
const siteUrl = resolveSiteUrl(process.env.SITE_URL || process.env.VITEPRESS_SITE_URL);
const githubUrl = "https://github.com/feod-architecture/feod-docs";
const socialImagePath = "/feod-logo.png";
const themeColor = "#111827";
const inlineFavicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23111827'/%3E%3Cpath d='M12 42 29 8h23L36 30h14L22 58l8-22H12Z' fill='%23f97316'/%3E%3Cpath d='M25 38 36 15h9L29 36h11L25 50l5-12h-5Z' fill='%23fef3c7'/%3E%3C/svg%3E";

type LocaleKey = keyof typeof siteDescriptions;

const localeSeo = {
  root: {
    lang: "ru-RU",
    ogLocale: "ru_RU",
    alternateOgLocale: "en_US",
  },
  en: {
    lang: "en-US",
    ogLocale: "en_US",
    alternateOgLocale: "ru_RU",
  },
} as const;

const titleOverrides: Record<string, string> = {
  "index.md": "FEOD - Fractal Entity Oriented Design",
  "en/index.md": "FEOD - Fractal Entity Oriented Design",
  "get-started/overview.md": "FEOD: методология frontend-архитектуры",
  "en/get-started/overview.md": "FEOD: Frontend Architecture Methodology",
};

type SitemapItem = {
  url: string;
  [key: string]: unknown;
};

function resolveSiteUrl(value: string | undefined) {
  if (!value) {
    return "";
  }

  const url = new URL(value);
  const pathname = url.pathname.replace(/\/+$/, "");

  return `${url.origin}${pathname === "/" ? "" : pathname}`;
}

export function readMarkdown(relativePath: string) {
  try {
    return readFileSync(join(docsRoot, relativePath), "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[feod-docs] Unable to read Markdown file: ${relativePath}. ${message}`);
    return "";
  }
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function extractHomeTagline(markdown: string) {
  const match = markdown.match(/^\s*tagline:\s*(.+)$/m);

  return normalizeDescription(match?.[1] || "");
}

function resolveLocale(relativePath: string): LocaleKey {
  return relativePath === "en/index.md" || relativePath.startsWith("en/") ? "en" : "root";
}

function stripLocalePrefix(relativePath: string) {
  return relativePath.replace(/^en\//, "");
}

function localizedRelativePath(relativePath: string, locale: LocaleKey) {
  const cleanPath = stripLocalePrefix(relativePath);

  return locale === "en" ? `en/${cleanPath}` : cleanPath;
}

function extractPageDescription(relativePath: string) {
  const locale = resolveLocale(relativePath);
  const markdown = readMarkdown(relativePath);
  const fallbackDescription = siteDescriptions[locale];

  if (stripLocalePrefix(relativePath) === "index.md") {
    return extractHomeTagline(markdown) || fallbackDescription;
  }

  const content = stripFrontmatter(markdown);
  const lines = content.split(/\r?\n/);
  const paragraph: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    if (!trimmed) {
      if (paragraph.length > 0) {
        break;
      }

      continue;
    }

    if (paragraph.length === 0 && shouldSkipDescriptionLine(trimmed)) {
      continue;
    }

    if (paragraph.length > 0 && shouldStopDescriptionParagraph(trimmed)) {
      break;
    }

    paragraph.push(trimmed);
  }

  return normalizeDescription(paragraph.join(" ")) || fallbackDescription;
}

function shouldSkipDescriptionLine(line: string) {
  return (
    line.startsWith("#") ||
    line.startsWith(">") ||
    line.startsWith("|") ||
    line.startsWith(":::") ||
    line.startsWith("<") ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line)
  );
}

function shouldStopDescriptionParagraph(line: string) {
  return (
    line.startsWith("#") ||
    line.startsWith(">") ||
    line.startsWith("|") ||
    line.startsWith(":::") ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line)
  );
}

function normalizeDescription(value: string) {
  const text = value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return truncateDescription(text);
}

function truncateDescription(value: string, maxLength = 170) {
  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength + 1);
  const boundary = truncated.lastIndexOf(" ");
  const safeEnd = boundary > 80 ? boundary : maxLength;

  return `${truncated.slice(0, safeEnd).replace(/[.,;:!?-]+$/, "")}...`;
}

function pagePath(relativePath: string) {
  const cleanPath = relativePath
    .replace(/(^|\/)index\.md$/, "$1")
    .replace(/\.md$/, "");

  return `/${cleanPath}`;
}

function absoluteUrl(path: string) {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function isMetaPage(relativePath: string) {
  return stripLocalePrefix(relativePath).startsWith("meta/");
}

function resolvePageTitle(relativePath: string, fallbackTitle: string) {
  return titleOverrides[relativePath] || fallbackTitle || "FEOD";
}

function jsonLdHead(data: Record<string, unknown>): HeadConfig {
  return ["script", { type: "application/ld+json" }, JSON.stringify(data)];
}

function buildWebSiteStructuredData(relativePath: string, description: string) {
  const locale = resolveLocale(relativePath);
  const homePath = locale === "en" ? "/en/" : "/";

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FEOD",
    alternateName: "Fractal Entity Oriented Design",
    url: absoluteUrl(homePath),
    inLanguage: localeSeo[locale].lang,
    description,
    publisher: {
      "@type": "Organization",
      name: "FEOD",
      url: absoluteUrl("/"),
    },
  };
}

function buildBreadcrumbStructuredData(relativePath: string, title: string) {
  const locale = resolveLocale(relativePath);
  const homePath = locale === "en" ? "/en/" : "/";

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "FEOD",
        item: absoluteUrl(homePath),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: absoluteUrl(pagePath(relativePath)),
      },
    ],
  };
}

function buildStructuredDataHead(pageData: { relativePath: string; title: string }, description: string): HeadConfig[] {
  if (!siteUrl || isMetaPage(pageData.relativePath)) {
    return [];
  }

  if (stripLocalePrefix(pageData.relativePath) === "index.md") {
    return [jsonLdHead(buildWebSiteStructuredData(pageData.relativePath, description))];
  }

  return [jsonLdHead(buildBreadcrumbStructuredData(pageData.relativePath, pageData.title))];
}

function buildPageHead(pageData: { relativePath: string; title: string }, description: string): HeadConfig[] {
  const locale = resolveLocale(pageData.relativePath);
  const title = pageData.title || "FEOD";
  const robots = isMetaPage(pageData.relativePath) ? "noindex,nofollow" : "index,follow";
  const head: HeadConfig[] = [
    ["meta", { name: "robots", content: robots }],
    ["meta", { property: "og:title", content: title }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:locale", content: localeSeo[locale].ogLocale }],
    ["meta", { name: "twitter:title", content: title }],
    ["meta", { name: "twitter:description", content: description }],
  ];

  if (siteUrl) {
    const url = absoluteUrl(pagePath(pageData.relativePath));
    const imageUrl = absoluteUrl(socialImagePath);

    head.push(
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:image", content: imageUrl }],
      ["meta", { name: "twitter:image", content: imageUrl }],
    );

    if (!isMetaPage(pageData.relativePath)) {
      const ruPath = pagePath(localizedRelativePath(pageData.relativePath, "root"));
      const enPath = pagePath(localizedRelativePath(pageData.relativePath, "en"));

      head.push(
        ["link", { rel: "alternate", hreflang: "ru-RU", href: absoluteUrl(ruPath) }],
        ["link", { rel: "alternate", hreflang: "en-US", href: absoluteUrl(enPath) }],
        ["link", { rel: "alternate", hreflang: "x-default", href: absoluteUrl(ruPath) }],
        ["meta", { property: "og:locale:alternate", content: localeSeo[locale].alternateOgLocale }],
      );
    }
  }

  return head;
}

function writeRobotsTxt(outDir: string) {
  const lines = ["User-agent: *", "Allow: /", "Disallow: /meta/"];

  if (siteUrl) {
    lines.push("", `Sitemap: ${absoluteUrl("/sitemap.xml")}`);
  }

  writeFileSync(join(outDir, "robots.txt"), `${lines.join("\n")}\n`, "utf8");
}

function hideMermaidFallbackErrorText() {
  return {
    name: "hide-mermaid-fallback-error-text",
    enforce: "post" as const,
    generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || !output.code) {
          continue;
        }

        output.code = output.code
          .replaceAll('text("Syntax error in text")', 'text("")')
          .replace(/\.text\(`mermaid version \$\{[^}]+}`\)/g, '.text("")');
      }
    },
  };
}

const docsSidebar = [
  {
    text: "Get Started",
    items: [
      { text: "Обзор", link: "/get-started/overview" },
      { text: "Быстрый старт", link: "/get-started/quick-start" },
      { text: "FEOD за 5 минут", link: "/get-started/feod-in-5-minutes" },
      { text: "Подходит ли FEOD моему проекту", link: "/get-started/is-feod-for-my-project" },
      { text: "FAQ", link: "/get-started/faq" },
    ],
  },
  {
    text: "Tutorial",
    items: [
      { text: "Новый проект", link: "/tutorial/new-project" },
      { text: "Существующий проект", link: "/tutorial/existing-project" },
      { text: "Миграция пошагово", link: "/tutorial/migration-step-by-step" },
      { text: "Первый модуль", link: "/tutorial/first-module" },
      { text: "Разбор e-commerce проекта", link: "/tutorial/ecommerce-walkthrough" },
    ],
  },
  {
    text: "Core Concepts",
    items: [
      { text: "Модульность", link: "/core-concepts/modularity" },
      { text: "Фрактальность", link: "/core-concepts/fractality" },
      { text: "Сущность-ориентированность", link: "/core-concepts/entity-orientation" },
      { text: "Уровни", link: "/core-concepts/levels" },
      { text: "Публичный API", link: "/core-concepts/public-api" },
      { text: "Правила зависимостей", link: "/core-concepts/dependency-rules" },
    ],
  },
  {
    text: "Structure",
    items: [
      { text: "App", link: "/structure/app" },
      { text: "Pages", link: "/structure/pages" },
      { text: "Modules", link: "/structure/modules" },
      { text: "Common", link: "/structure/common" },
      { text: "Global", link: "/structure/global" },
    ],
  },
  {
    text: "Guides",
    items: [
      { text: "Где хранить код", link: "/guides/where-to-place-code" },
      { text: "Как проектировать модуль", link: "/guides/design-module" },
      { text: "Как разбивать большой модуль", link: "/guides/split-large-module" },
      { text: "Как работать с подмодулями", link: "/guides/submodules" },
      { text: "Как не превратить common в свалку", link: "/guides/common-boundaries" },
      { text: "Как писать README модуля", link: "/guides/module-readme" },
      { text: "Миграция с FSD", link: "/guides/migration-from-fsd" },
      { text: "Миграция с обычной модульной архитектуры", link: "/guides/migration-from-modular" },
      { text: "Code review checklist", link: "/guides/code-review" },
    ],
  },
  {
    text: "Reference",
    items: [
      { text: "Термины", link: "/reference/terms" },
      { text: "Матрица импортов", link: "/reference/import-matrix" },
      { text: "Контракт модуля", link: "/reference/module-contract" },
      { text: "Правила public API", link: "/reference/public-api" },
      { text: "Правила именования", link: "/reference/naming" },
      { text: "Code smells", link: "/reference/code-smells" },
      { text: "Глоссарий", link: "/reference/glossary" },
    ],
  },
  {
    text: "Framework appendices",
    items: [
      { text: "Обзор", link: "/frameworks/" },
      { text: "React", link: "/frameworks/react" },
      { text: "Vue", link: "/frameworks/vue" },
      { text: "Next.js и Nuxt", link: "/frameworks/next-nuxt" },
    ],
  },
  {
    text: "About",
    items: [
      { text: "Мотивация", link: "/about/motivation" },
      { text: "Сравнение с FSD", link: "/about/comparison-fsd" },
      { text: "Сравнение с NestJS-модулями", link: "/about/comparison-nestjs-modules" },
      { text: "Сравнение с Atomic Design", link: "/about/comparison-atomic-design" },
      { text: "Вариации FEOD", link: "/about/variations" },
      { text: "Roadmap", link: "/about/roadmap" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const enDocsSidebar = [
  {
    text: "Get Started",
    items: [
      { text: "Overview", link: "/en/get-started/overview" },
      { text: "Quick Start", link: "/en/get-started/quick-start" },
      { text: "FEOD in 5 Minutes", link: "/en/get-started/feod-in-5-minutes" },
      { text: "Is FEOD Right for My Project?", link: "/en/get-started/is-feod-for-my-project" },
      { text: "FAQ", link: "/en/get-started/faq" },
    ],
  },
  {
    text: "Tutorial",
    items: [
      { text: "New Project", link: "/en/tutorial/new-project" },
      { text: "Existing Project", link: "/en/tutorial/existing-project" },
      { text: "Step-by-Step Migration", link: "/en/tutorial/migration-step-by-step" },
      { text: "First Module", link: "/en/tutorial/first-module" },
      { text: "E-commerce Walkthrough", link: "/en/tutorial/ecommerce-walkthrough" },
    ],
  },
  {
    text: "Core Concepts",
    items: [
      { text: "Modularity", link: "/en/core-concepts/modularity" },
      { text: "Fractality", link: "/en/core-concepts/fractality" },
      { text: "Entity Orientation", link: "/en/core-concepts/entity-orientation" },
      { text: "Levels", link: "/en/core-concepts/levels" },
      { text: "Public API", link: "/en/core-concepts/public-api" },
      { text: "Dependency Rules", link: "/en/core-concepts/dependency-rules" },
    ],
  },
  {
    text: "Structure",
    items: [
      { text: "App", link: "/en/structure/app" },
      { text: "Pages", link: "/en/structure/pages" },
      { text: "Modules", link: "/en/structure/modules" },
      { text: "Common", link: "/en/structure/common" },
      { text: "Global", link: "/en/structure/global" },
    ],
  },
  {
    text: "Guides",
    items: [
      { text: "Where to Place Code", link: "/en/guides/where-to-place-code" },
      { text: "How to Design a Module", link: "/en/guides/design-module" },
      { text: "How to Split a Large Module", link: "/en/guides/split-large-module" },
      { text: "How to Work with Submodules", link: "/en/guides/submodules" },
      { text: "How to Keep common from Becoming a Dumping Ground", link: "/en/guides/common-boundaries" },
      { text: "How to Write a Module README", link: "/en/guides/module-readme" },
      { text: "Migrating from FSD", link: "/en/guides/migration-from-fsd" },
      { text: "Migrating from Regular Modular Architecture", link: "/en/guides/migration-from-modular" },
      { text: "Code Review Checklist", link: "/en/guides/code-review" },
    ],
  },
  {
    text: "Reference",
    items: [
      { text: "Terms", link: "/en/reference/terms" },
      { text: "Import Matrix", link: "/en/reference/import-matrix" },
      { text: "Module Contract", link: "/en/reference/module-contract" },
      { text: "Public API Rules", link: "/en/reference/public-api" },
      { text: "Naming Rules", link: "/en/reference/naming" },
      { text: "Code Smells", link: "/en/reference/code-smells" },
      { text: "Glossary", link: "/en/reference/glossary" },
    ],
  },
  {
    text: "Framework Appendices",
    items: [
      { text: "Overview", link: "/en/frameworks/" },
      { text: "React", link: "/en/frameworks/react" },
      { text: "Vue", link: "/en/frameworks/vue" },
      { text: "Next.js and Nuxt", link: "/en/frameworks/next-nuxt" },
    ],
  },
  {
    text: "About",
    items: [
      { text: "Motivation", link: "/en/about/motivation" },
      { text: "Comparison with FSD", link: "/en/about/comparison-fsd" },
      { text: "Comparison with NestJS Modules", link: "/en/about/comparison-nestjs-modules" },
      { text: "Comparison with Atomic Design", link: "/en/about/comparison-atomic-design" },
      { text: "FEOD Variations", link: "/en/about/variations" },
      { text: "Roadmap", link: "/en/about/roadmap" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const examplesSidebar = [
  {
    text: "Examples",
    items: [
      { text: "Минимальный SPA", link: "/examples/minimal-spa" },
      { text: "E-commerce", link: "/examples/ecommerce" },
      { text: "Dashboard / Admin Panel", link: "/examples/dashboard-admin" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const enExamplesSidebar = [
  {
    text: "Examples",
    items: [
      { text: "Minimal SPA", link: "/en/examples/minimal-spa" },
      { text: "E-commerce", link: "/en/examples/ecommerce" },
      { text: "Dashboard / Admin Panel", link: "/en/examples/dashboard-admin" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const simpleSidebar = (text: string, link: string) => [
  {
    text,
    items: [{ text, link }],
  },
];

const toolsSidebar = [
  {
    text: "Tools",
    items: [
      { text: "Обзор", link: "/tools/" },
      { text: "FEOD Analyzer", link: "/tools/feod-analyzer" },
      { text: "ESLint plugin", link: "/tools/eslint-plugin" },
      { text: "AI rules", link: "/tools/ai-rules" },
      { text: "FEOD config", link: "/tools/feod-config" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const enToolsSidebar = [
  {
    text: "Tools",
    items: [
      { text: "Overview", link: "/en/tools/" },
      { text: "FEOD Analyzer", link: "/en/tools/feod-analyzer" },
      { text: "ESLint Plugin", link: "/en/tools/eslint-plugin" },
      { text: "AI Rules", link: "/en/tools/ai-rules" },
      { text: "FEOD Config", link: "/en/tools/feod-config" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const communitySidebar = [
  {
    text: "Community",
    items: [
      { text: "Обзор", link: "/community/" },
      { text: "Как участвовать", link: "/community/contributing" },
      { text: "RFC process", link: "/community/rfc-process" },
      { text: "Как предлагать examples", link: "/community/examples" },
      { text: "Исключения из правил", link: "/community/exceptions" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const enCommunitySidebar = [
  {
    text: "Community",
    items: [
      { text: "Overview", link: "/en/community/" },
      { text: "How to Contribute", link: "/en/community/contributing" },
      { text: "RFC Process", link: "/en/community/rfc-process" },
      { text: "How to Propose Examples", link: "/en/community/examples" },
      { text: "Rule Exceptions", link: "/en/community/exceptions" },
    ],
  },
] satisfies DefaultTheme.SidebarItem[];

const sharedThemeConfig = {
  logo: {
    light: "/feod-logo.svg",
    dark: "/feod-logo.svg",
    alt: "FEOD",
  },
  socialLinks: [{ icon: "github", link: githubUrl }],
  search: {
    provider: "local",
    options: {
      locales: {
        root: {
          translations: {
            button: {
              buttonText: "Поиск",
              buttonAriaLabel: "Поиск",
            },
            modal: {
              displayDetails: "Показать подробный список",
              resetButtonTitle: "Сбросить поиск",
              backButtonTitle: "Закрыть поиск",
              noResultsText: "Ничего не найдено",
              footer: {
                selectText: "выбрать",
                selectKeyAriaLabel: "enter",
                navigateText: "перейти",
                navigateUpKeyAriaLabel: "стрелка вверх",
                navigateDownKeyAriaLabel: "стрелка вниз",
                closeText: "закрыть",
                closeKeyAriaLabel: "escape",
              },
            },
          },
        },
        en: {
          translations: {
            button: {
              buttonText: "Search",
              buttonAriaLabel: "Search",
            },
            modal: {
              displayDetails: "Display detailed list",
              resetButtonTitle: "Reset search",
              backButtonTitle: "Close search",
              noResultsText: "No results found",
              footer: {
                selectText: "select",
                selectKeyAriaLabel: "enter",
                navigateText: "navigate",
                navigateUpKeyAriaLabel: "up arrow",
                navigateDownKeyAriaLabel: "down arrow",
                closeText: "close",
                closeKeyAriaLabel: "escape",
              },
            },
          },
        },
      },
    },
  },
  outline: {
    level: [2, 3],
  },
} satisfies DefaultTheme.Config;

const ruThemeConfig = {
  ...sharedThemeConfig,
  nav: [
    { text: "Docs", link: "/get-started/overview" },
    { text: "Examples", link: "/examples/minimal-spa" },
    { text: "Tools", link: "/tools/" },
    { text: "Blog", link: "/blog/" },
    { text: "Community", link: "/community/" },
  ],
  sidebar: {
    "/get-started/": docsSidebar,
    "/tutorial/": docsSidebar,
    "/core-concepts/": docsSidebar,
    "/structure/": docsSidebar,
    "/guides/": docsSidebar,
    "/reference/": docsSidebar,
    "/frameworks/": docsSidebar,
    "/about/": docsSidebar,
    "/examples/": examplesSidebar,
    "/tools/": toolsSidebar,
    "/blog/": simpleSidebar("Blog", "/blog/"),
    "/community/": communitySidebar,
  },
  outline: {
    ...sharedThemeConfig.outline,
    label: "На этой странице",
  },
  docFooter: {
    prev: "Предыдущая",
    next: "Следующая",
  },
  lastUpdated: {
    text: "Обновлено",
    formatOptions: {
      dateStyle: "medium",
      timeStyle: "short",
    },
  },
  langMenuLabel: "Выбрать язык",
  returnToTopLabel: "Вернуться наверх",
  sidebarMenuLabel: "Меню",
  darkModeSwitchLabel: "Тема",
  lightModeSwitchTitle: "Переключить на светлую тему",
  darkModeSwitchTitle: "Переключить на тёмную тему",
} satisfies DefaultTheme.Config;

const enThemeConfig = {
  ...sharedThemeConfig,
  nav: [
    { text: "Docs", link: "/en/get-started/overview" },
    { text: "Examples", link: "/en/examples/minimal-spa" },
    { text: "Tools", link: "/en/tools/" },
    { text: "Blog", link: "/en/blog/" },
    { text: "Community", link: "/en/community/" },
  ],
  sidebar: {
    "/en/get-started/": enDocsSidebar,
    "/en/tutorial/": enDocsSidebar,
    "/en/core-concepts/": enDocsSidebar,
    "/en/structure/": enDocsSidebar,
    "/en/guides/": enDocsSidebar,
    "/en/reference/": enDocsSidebar,
    "/en/frameworks/": enDocsSidebar,
    "/en/about/": enDocsSidebar,
    "/en/examples/": enExamplesSidebar,
    "/en/tools/": enToolsSidebar,
    "/en/blog/": simpleSidebar("Blog", "/en/blog/"),
    "/en/community/": enCommunitySidebar,
  },
  outline: {
    ...sharedThemeConfig.outline,
    label: "On This Page",
  },
  docFooter: {
    prev: "Previous",
    next: "Next",
  },
  lastUpdated: {
    text: "Updated",
    formatOptions: {
      dateStyle: "medium",
      timeStyle: "short",
    },
  },
  langMenuLabel: "Change language",
  returnToTopLabel: "Return to top",
  sidebarMenuLabel: "Menu",
  darkModeSwitchLabel: "Theme",
  lightModeSwitchTitle: "Switch to light theme",
  darkModeSwitchTitle: "Switch to dark theme",
} satisfies DefaultTheme.Config;

export default withMermaid(defineConfig({
  lang: "ru-RU",
  title: "FEOD",
  description: siteDescriptions.root,
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: {
      label: "Русский",
      lang: "ru-RU",
      link: "/",
    },
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      title: "FEOD",
      description: siteDescriptions.en,
      themeConfig: enThemeConfig,
    },
  },
  mermaid: {
    theme: "base",
    htmlLabels: false,
    suppressErrorRendering: true,
    flowchart: {
      useMaxWidth: false,
      diagramPadding: 16,
      nodeSpacing: 24,
      rankSpacing: 32,
    },
    sequence: {
      useMaxWidth: false,
      diagramMarginX: 10,
      diagramMarginY: 10,
    },
    themeVariables: {
      primaryColor: "#ccfbf1",
      primaryTextColor: "#0f172a",
      primaryBorderColor: "#0f766e",
      lineColor: "#0f766e",
      secondaryColor: "#f8fafc",
      tertiaryColor: "#fff7ed",
      noteBkgColor: "#ecfeff",
      noteTextColor: "#0f172a",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "15px",
    },
  },
  sitemap: siteUrl
    ? {
        hostname: siteUrl,
        transformItems: (items: SitemapItem[]) =>
          items.filter((item) => !item.url.startsWith("meta/") && !item.url.startsWith("en/meta/")),
      }
    : undefined,
  vite: {
    plugins: [hideMermaidFallbackErrorText()],
  },
  buildEnd(siteConfig) {
    writeRobotsTxt(siteConfig.outDir);
  },
  transformPageData(pageData) {
    const description = extractPageDescription(pageData.relativePath);
    const title = resolvePageTitle(pageData.relativePath, pageData.title);
    const hasTitleOverride = Boolean(titleOverrides[pageData.relativePath]);

    pageData.title = title;
    pageData.frontmatter.title = title;

    if (hasTitleOverride) {
      pageData.titleTemplate = false;
      pageData.frontmatter.titleTemplate = false;
    }

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(...buildPageHead({ relativePath: pageData.relativePath, title }, description));
    pageData.frontmatter.head.push(...buildStructuredDataHead({ relativePath: pageData.relativePath, title }, description));

    return hasTitleOverride ? { title, titleTemplate: false, description } : { title, description };
  },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: inlineFavicon }],
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["link", { rel: "icon", href: "/favicon.ico", sizes: "any" }],
    ["link", { rel: "shortcut icon", href: "/favicon.ico" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" }],
    ["link", { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }],
    ["link", { rel: "manifest", href: "/site.webmanifest" }],
    ["meta", { name: "theme-color", content: themeColor }],
    ["meta", { property: "og:site_name", content: "FEOD" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
  themeConfig: ruThemeConfig,
}));
