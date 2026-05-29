# FEOD Analyzer

FEOD Analyzer is a CLI tool for checking FEOD architecture in a frontend project. It builds a graph of FEOD entities, detects import and public API violations, and exports both JSON and a static HTML report.

The tool supports review and CI, but it does not replace the team's architectural decisions.

## When to connect it

Connect FEOD Analyzer when the project has already fixed:

- the `app`, `pages`, `modules`, `common`, and `global` levels;
- public API through root `index.ts` files;
- import aliases;
- allowed submodules and exceptions;
- the rules that CI should block.

If module boundaries are still disputed, document them in the project docs or README first.

## What it checks

Minimum checks:

| Check | Violation example | Related rule |
| --- | --- | --- |
| Forbidden level dependencies | `modules` imports `pages` | [Import matrix](../reference/import-matrix.md) |
| Deep imports | `@/modules/cart/model/cart-store` | [Public API](../reference/public-api.md) |
| External submodule imports | `@/modules/checkout/payment` | [Submodules](../guides/submodules.md) |
| Direct `global` imports | `@/global/env` from a module | [Global](../structure/global.md) |
| Missing public API | no root `index.ts` in a module | [Module contract](../reference/module-contract.md) |
| `export *` leaks | `export * from './model/internal'` | [Code smells](../reference/code-smells.md) |
| Cycles between FEOD entities | `cart -> checkout -> cart` | [Dependency rules](../core-concepts/dependency-rules.md) |

## What the team gets

The analyzer generates two report formats:

- `json` - a machine-readable report for CI, bots, and internal dashboards;
- `html` - a static report with a dependency graph, violation list, and FEOD entity details.

The HTML report can be opened as static files or served locally with `--serve`.

## CLI

```bash
bunx @feod-architecture/analyzer analyze ./src --out ./dist/feod --formats html,json
npx @feod-architecture/analyzer analyze ./src --out ./dist/feod --formats html,json
pnpm dlx @feod-architecture/analyzer analyze ./src --out ./dist/feod --formats html,json
```

Full form:

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

- `0` - analysis completed without violations at the selected threshold;
- `1` - violations matched `--fail-on`;
- `2` - configuration, project reading, analysis, or export error.

## Package managers

The package can be executed through `bunx`, `npx`, and `pnpm dlx`. The repository also supports local `bun run`, `npm run`, and `pnpm run` commands for build/test workflows.

## Configuration

The analyzer looks for configuration in:

- `feod-analyzer.yml`;
- `feod-analyzer.yaml`;
- `.feod-analyzer.yml`;
- `.feod-analyzer.yaml`.

Example:

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

The config should reflect the project's rules. It should not hide architectural exceptions without a reason.

## CI flow

Minimum flow:

1. Generate a report in CI.
2. Use `--fail-on error` to block critical violations.
3. Publish the HTML report as a build artifact.
4. For a legacy project, keep temporary exceptions explicit and remove them after migration.

## Limitations

The analyzer does not decide:

- whether a product module boundary is correct;
- whether public API is too large;
- whether a rule exception is justified;
- whether code belongs in `common` by meaning.

These decisions stay in architectural review.

## Related pages

- [FEOD config](./feod-config.md)
- [Import matrix](../reference/import-matrix.md)
- [Public API](../reference/public-api.md)
- [Code review checklist](../guides/code-review.md)
