import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const distDir = join(root, "docs/.vitepress/dist");
const expectedSiteUrl = normalizeOrigin(process.env.EXPECT_SITE_URL);
const errors = [];

function normalizeOrigin(value) {
  if (!value) {
    return "";
  }

  return value.replace(/\/+$/, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readDistFile(path) {
  const fullPath = join(distDir, path);

  if (!existsSync(fullPath)) {
    errors.push(`Missing dist file: ${path}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function expectMatch(content, pattern, message) {
  if (!pattern.test(content)) {
    errors.push(message);
  }
}

function expectNoMatch(content, pattern, message) {
  if (pattern.test(content)) {
    errors.push(message);
  }
}

function getDescription(content, label) {
  const match = content.match(/<meta name="description" content="([^"]+)">/);

  if (!match) {
    errors.push(`Missing description meta in ${label}`);
    return "";
  }

  return match[1];
}

function expectPngBackedIco() {
  const icoPath = join(distDir, "favicon.ico");

  if (!existsSync(icoPath)) {
    errors.push("Missing favicon.ico in dist");
    return;
  }

  const header = readFileSync(icoPath).subarray(0, 4);
  const isIco = header[0] === 0 && header[1] === 0 && header[2] === 1 && header[3] === 0;

  if (!isIco) {
    errors.push("favicon.ico is not a valid ICO file");
  }
}

const indexHtml = readDistFile("index.html");
const overviewHtml = readDistFile("get-started/overview.html");
const enIndexHtml = readDistFile("en/index.html");
const enOverviewHtml = readDistFile("en/get-started/overview.html");
const enImportMatrixHtml = readDistFile("en/reference/import-matrix.html");
const enToolsHtml = readDistFile("en/tools/index.html");
const enCommunityHtml = readDistFile("en/community/index.html");
const metaHtml = readDistFile("meta/style-guide.html");
const manifest = readDistFile("site.webmanifest");
const robots = readDistFile("robots.txt");

expectMatch(indexHtml, /<link[^>]+rel="icon"[^>]+href="\/favicon\.ico"/, "Missing ICO favicon link");
expectMatch(indexHtml, /<link[^>]+rel="shortcut icon"[^>]+href="\/favicon\.ico"/, "Missing shortcut ICO favicon link");
expectMatch(indexHtml, /<link[^>]+rel="icon"[^>]+href="\/favicon-32x32\.png"/, "Missing 32x32 PNG favicon link");
expectMatch(indexHtml, /<link[^>]+rel="icon"[^>]+href="\/favicon-16x16\.png"/, "Missing 16x16 PNG favicon link");
expectMatch(indexHtml, /<link[^>]+rel="apple-touch-icon"[^>]+href="\/apple-touch-icon\.png"/, "Missing Apple touch icon link");
expectMatch(indexHtml, /<link[^>]+rel="manifest"[^>]+href="\/site\.webmanifest"/, "Missing web manifest link");
expectMatch(indexHtml, /<meta name="theme-color" content="#111827">/, "Missing theme-color meta");
expectMatch(indexHtml, /<meta property="og:site_name" content="FEOD">/, "Missing og:site_name meta");
expectMatch(indexHtml, /<meta property="og:type" content="website">/, "Missing og:type meta");
expectMatch(indexHtml, /<meta property="og:locale" content="ru_RU">/, "Missing ru_RU og:locale meta");
expectMatch(enIndexHtml, /<meta property="og:locale" content="en_US">/, "Missing en_US og:locale meta");
expectMatch(indexHtml, /<meta name="twitter:card" content="summary_large_image">/, "Missing twitter card meta");
expectMatch(indexHtml, /<meta name="robots" content="index,follow">/, "Missing public robots meta");
expectMatch(enIndexHtml, /<meta name="robots" content="index,follow">/, "Missing English public robots meta");
expectMatch(metaHtml, /<meta name="robots" content="noindex,nofollow">/, "Missing noindex robots meta for docs/meta");
expectMatch(manifest, /"name": "FEOD"/, "Manifest must include FEOD name");
expectMatch(manifest, /"src": "\/icon-512x512\.png"/, "Manifest must include 512 icon");
expectPngBackedIco();
expectMatch(robots, /User-agent: \*/, "robots.txt must define a user agent");
expectMatch(robots, /Disallow: \/meta\//, "robots.txt must disallow docs/meta");

const indexDescription = getDescription(indexHtml, "index.html");
const overviewDescription = getDescription(overviewHtml, "get-started/overview.html");
const enIndexDescription = getDescription(enIndexHtml, "en/index.html");
const enOverviewDescription = getDescription(enOverviewHtml, "en/get-started/overview.html");

if (indexDescription.length < 40) {
  errors.push("Index description is too short");
}

if (overviewDescription.length < 40) {
  errors.push("Overview description is too short");
}

if (enIndexDescription.length < 40) {
  errors.push("English index description is too short");
}

if (enOverviewDescription.length < 40) {
  errors.push("English overview description is too short");
}

if (indexDescription === overviewDescription) {
  errors.push("Index and overview descriptions should be page-specific");
}

if (enIndexDescription === enOverviewDescription) {
  errors.push("English index and overview descriptions should be page-specific");
}

for (const [label, content] of [
  ["en/reference/import-matrix.html", enImportMatrixHtml],
  ["en/tools/index.html", enToolsHtml],
  ["en/community/index.html", enCommunityHtml],
]) {
  expectMatch(content, /<meta name="robots" content="index,follow">/, `Missing public robots meta for ${label}`);
  getDescription(content, label);
}

if (expectedSiteUrl) {
  const escapedSiteUrl = escapeRegExp(expectedSiteUrl);

  expectMatch(indexHtml, new RegExp(`<link rel="canonical" href="${escapedSiteUrl}\\/?">`), "Missing canonical URL for index page");
  expectMatch(indexHtml, new RegExp(`<meta property="og:url" content="${escapedSiteUrl}\\/?">`), "Missing og:url for index page");
  expectMatch(indexHtml, new RegExp(`<meta property="og:image" content="${escapedSiteUrl}\\/feod-logo\\.png">`), "Missing absolute og:image");
  expectMatch(enIndexHtml, new RegExp(`<link rel="canonical" href="${escapedSiteUrl}\\/en\\/?">`), "Missing canonical URL for English index page");
  expectMatch(enIndexHtml, new RegExp(`<meta property="og:url" content="${escapedSiteUrl}\\/en\\/?">`), "Missing og:url for English index page");
  expectMatch(indexHtml, new RegExp(`<link rel="alternate" hreflang="en" href="${escapedSiteUrl}\\/en\\/?">`), "Missing English hreflang on index page");
  expectMatch(enIndexHtml, new RegExp(`<link rel="alternate" hreflang="ru" href="${escapedSiteUrl}\\/?">`), "Missing Russian hreflang on English index page");

  const sitemap = readDistFile("sitemap.xml");
  expectMatch(sitemap, new RegExp(`<loc>${escapedSiteUrl}\\/get-started\\/overview<\\/loc>`), "Missing overview URL in sitemap");
  expectMatch(sitemap, new RegExp(`<loc>${escapedSiteUrl}\\/en\\/get-started\\/overview<\\/loc>`), "Missing English overview URL in sitemap");
  expectNoMatch(sitemap, /\/meta\//, "Sitemap must not include docs/meta pages");
  expectMatch(robots, new RegExp(`Sitemap: ${escapedSiteUrl}\\/sitemap\\.xml`), "robots.txt must include sitemap URL");
} else {
  expectNoMatch(indexHtml, /<link rel="canonical"/, "Canonical URL must not be emitted without SITE_URL");
  expectNoMatch(indexHtml, /<meta property="og:url"/, "og:url must not be emitted without SITE_URL");
  expectNoMatch(indexHtml, /<meta property="og:image"/, "og:image must not be emitted without SITE_URL");
  expectNoMatch(enIndexHtml, /<link rel="canonical"/, "English canonical URL must not be emitted without SITE_URL");
  expectNoMatch(enIndexHtml, /<meta property="og:url"/, "English og:url must not be emitted without SITE_URL");
  expectNoMatch(enIndexHtml, /<meta property="og:image"/, "English og:image must not be emitted without SITE_URL");

  if (existsSync(join(distDir, "sitemap.xml"))) {
    errors.push("sitemap.xml must not be emitted without SITE_URL");
  }

  expectNoMatch(robots, /^Sitemap:/m, "robots.txt must not include sitemap URL without SITE_URL");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("docs seo check passed");
