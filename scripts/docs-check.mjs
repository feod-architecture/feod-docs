import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative } from "node:path";
import { JSDOM } from "jsdom";

const root = process.cwd();
const docsDir = join(root, "docs");
const vitePressConfig = join(docsDir, ".vitepress/config.mts");
const ignoredDirs = new Set(["node_modules", "docs/.vitepress/cache", "docs/.vitepress/dist"]);
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
const requiredPages = [
  "docs/get-started/feod-in-5-minutes.md",
  "docs/get-started/is-feod-for-my-project.md",
  "docs/get-started/faq.md",
  "docs/tutorial/new-project.md",
  "docs/tutorial/existing-project.md",
  "docs/tutorial/migration-step-by-step.md",
  "docs/tutorial/first-module.md",
  "docs/tutorial/ecommerce-walkthrough.md",
  "docs/core-concepts/public-api.md",
  "docs/reference/module-contract.md",
  "docs/tools/feod-analyzer.md",
  "docs/tools/eslint-plugin.md",
  "docs/tools/ai-rules.md",
  "docs/tools/feod-config.md",
  "docs/guides/code-review.md",
  "docs/frameworks/index.md",
  "docs/frameworks/react.md",
  "docs/frameworks/vue.md",
  "docs/frameworks/next-nuxt.md",
  "docs/community/contributing.md",
  "docs/community/rfc-process.md",
  "docs/community/examples.md",
  "docs/community/exceptions.md",
];

function toPosixPath(path) {
  return path.split("\\").join("/");
}

function shouldIgnore(path) {
  const rel = relative(root, path);
  return [...ignoredDirs].some((dir) => rel === dir || rel.startsWith(`${dir}/`));
}

function isRussianPublicMarkdown(file) {
  const rel = toPosixPath(relative(docsDir, file));

  return !rel.startsWith(".vitepress/") && !rel.startsWith("public/") && !rel.startsWith("meta/") && !rel.startsWith("en/");
}

function collectMarkdownFiles(dir) {
  const result = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (shouldIgnore(path)) {
      continue;
    }

    const stat = statSync(path);

    if (stat.isDirectory()) {
      result.push(...collectMarkdownFiles(path));
      continue;
    }

    if (stat.isFile() && extname(path) === ".md") {
      result.push(path);
    }
  }

  return result;
}

function stripAnchorAndQuery(link) {
  return link.split("#")[0].split("?")[0];
}

function resolveMarkdownTarget(sourceFile, rawLink) {
  const link = stripAnchorAndQuery(rawLink);

  if (!link || link.startsWith("http://") || link.startsWith("https://") || link.startsWith("mailto:")) {
    return null;
  }

  if (link.startsWith("/")) {
    const withoutSlash = link.slice(1);
    const withMd = withoutSlash.endsWith(".md") ? withoutSlash : `${withoutSlash}.md`;
    return join(docsDir, withMd);
  }

  return normalize(join(dirname(sourceFile), link));
}

function resolveSiteTarget(rawLink) {
  const link = stripAnchorAndQuery(rawLink);

  if (!link || !link.startsWith("/") || link.startsWith("//")) {
    return null;
  }

  const withoutSlash = link.slice(1);

  if (!withoutSlash || withoutSlash.endsWith("/")) {
    return join(docsDir, withoutSlash, "index.md");
  }

  const asMarkdown = join(docsDir, `${withoutSlash}.md`);
  const asIndex = join(docsDir, withoutSlash, "index.md");

  if (existsSync(asMarkdown)) {
    return asMarkdown;
  }

  return asIndex;
}

function resolvePublicAssetTarget(rawPath) {
  const path = stripAnchorAndQuery(rawPath);

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  return join(docsDir, "public", path.slice(1));
}

function extractMarkdownLinks(content) {
  const links = [];
  const markdownLinkPattern = /(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of content.matchAll(markdownLinkPattern)) {
    links.push(match[1]);
  }

  return links;
}

function normalizeFrontmatterValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.at(-1) === quote) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function extractFrontmatterReferences(content) {
  const lines = content.split(/\r?\n/);
  const references = [];

  if (lines[0]?.trim() !== "---") {
    return references;
  }

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "---") {
      break;
    }

    const match = line.match(/^\s*(link|src):\s*(.+?)\s*$/);

    if (match) {
      references.push({
        key: match[1],
        value: normalizeFrontmatterValue(match[2]),
      });
    }
  }

  return references;
}

function extractConfigLinks(content) {
  const links = [];
  const configLinkPattern = /link:\s*"([^"]+)"/g;

  for (const match of content.matchAll(configLinkPattern)) {
    links.push(match[1]);
  }

  return links;
}

function extractMermaidBlocks(content) {
  const blocks = [];
  const lines = content.split(/\r?\n/);
  let blockStart = null;
  let blockContent = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (blockStart === null) {
      if (trimmed === "```mermaid") {
        blockStart = index + 1;
        blockContent = [];
      }

      continue;
    }

    if (trimmed === "```") {
      blocks.push({
        line: blockStart,
        content: blockContent.join("\n"),
      });
      blockStart = null;
      blockContent = [];
      continue;
    }

    blockContent.push(line);
  }

  if (blockStart !== null) {
    blocks.push({
      line: blockStart,
      content: blockContent.join("\n"),
      unclosed: true,
    });
  }

  return blocks;
}

async function validateMermaidBlock(file, block) {
  const rel = relative(root, file);

  if (block.unclosed) {
    errors.push(`Unclosed Mermaid block in ${rel}:${block.line}`);
    return;
  }

  try {
    await mermaid.parse(block.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Invalid Mermaid block in ${rel}:${block.line}: ${message}`);
  }
}

const errors = [];
const markdownFiles = collectMarkdownFiles(docsDir);

for (const page of requiredPages) {
  const path = join(root, page);

  if (!existsSync(path)) {
    errors.push(`Missing required page: ${page}`);
  }
}

for (const file of markdownFiles.filter(isRussianPublicMarkdown)) {
  const rel = toPosixPath(relative(docsDir, file));
  const translatedPath = join(docsDir, "en", rel);

  if (!existsSync(translatedPath)) {
    errors.push(`Missing English translation: docs/en/${rel}`);
  }
}

for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");

  for (const block of extractMermaidBlocks(content)) {
    await validateMermaidBlock(file, block);
  }

  for (const link of extractMarkdownLinks(content)) {
    const target = resolveMarkdownTarget(file, link);

    if (!target) {
      continue;
    }

    if (!existsSync(target)) {
      errors.push(`Broken link in ${relative(root, file)}: ${link}`);
    }
  }

  for (const reference of extractFrontmatterReferences(content)) {
    const target =
      reference.key === "link" ? resolveSiteTarget(reference.value) : resolvePublicAssetTarget(reference.value);

    if (!target) {
      continue;
    }

    if (!existsSync(target)) {
      const type = reference.key === "link" ? "link" : "asset";
      errors.push(`Broken frontmatter ${type} in ${relative(root, file)}: ${reference.value}`);
    }
  }
}

if (existsSync(vitePressConfig)) {
  const content = readFileSync(vitePressConfig, "utf8");

  for (const link of extractConfigLinks(content)) {
    const target = resolveSiteTarget(link);

    if (!target) {
      continue;
    }

    if (!existsSync(target)) {
      errors.push(`Broken VitePress link in docs/.vitepress/config.mts: ${link}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("docs check passed");
