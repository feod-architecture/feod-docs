import { mkdtempSync, readFileSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, expect, test } from "bun:test";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkerPath = join(projectRoot, "scripts/docs-check.mjs");
const tempRoots = [];

function copyProjectFixture() {
  const tempRoot = mkdtempSync(join(tmpdir(), "feod-docs-check-"));
  tempRoots.push(tempRoot);

  cpSync(projectRoot, tempRoot, {
    recursive: true,
    filter: (source) => {
      const name = basename(source);
      const relative = source.slice(projectRoot.length + 1);

      return (
        name !== ".git" &&
        name !== "node_modules" &&
        name !== ".omx" &&
        name !== ".playwright-mcp" &&
        relative !== "docs/.vitepress/cache" &&
        relative !== "docs/.vitepress/dist"
      );
    },
  });

  return tempRoot;
}

function runDocsCheck(cwd) {
  return spawnSync(process.execPath, ["run", checkerPath], {
    cwd,
    encoding: "utf8",
  });
}

function replaceInFile(file, search, replacement) {
  const content = readFileSync(file, "utf8");
  writeFileSync(file, content.replace(search, replacement), "utf8");
}

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("docs check fails for a broken frontmatter page link", () => {
  const fixture = copyProjectFixture();

  replaceInFile(
    join(fixture, "docs/index.md"),
    "link: /get-started/overview",
    "link: /missing-frontmatter-page",
  );

  const result = runDocsCheck(fixture);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Broken frontmatter link in docs/index.md: /missing-frontmatter-page");
});

test("docs check fails for a broken frontmatter public asset", () => {
  const fixture = copyProjectFixture();

  replaceInFile(join(fixture, "docs/index.md"), "src: /feod-logo.svg", "src: /missing-frontmatter-asset.svg");

  const result = runDocsCheck(fixture);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Broken frontmatter asset in docs/index.md: /missing-frontmatter-asset.svg");
});

test("docs check fails when a public page has no English translation", () => {
  const fixture = copyProjectFixture();

  rmSync(join(fixture, "docs/en/blog/index.md"));

  const result = runDocsCheck(fixture);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Missing English translation: docs/en/blog/index.md");
});

test("VitePress config warns when page description markdown cannot be read", async () => {
  const { readMarkdown } = await import("../docs/.vitepress/config.mts");
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(String(message));

  try {
    expect(readMarkdown("__missing__.md")).toBe("");
  } finally {
    console.warn = originalWarn;
  }

  expect(warnings.join("\n")).toContain("Unable to read Markdown file: __missing__.md");
});
