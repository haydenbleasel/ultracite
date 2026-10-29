# AGENTS.md

Guide for coding agents working in this repository. The generated code standards that Ultracite itself enforces live in `.claude/CLAUDE.md`; this file covers how the repo is put together and how to change it safely.

## What this is

Ultracite is a zero-config linting and formatting preset for JS/TS projects, published to npm as `ultracite`. It ships:

- **Presets** for three linter backends: Oxlint + Oxfmt (recommended), Biome, and ESLint + Prettier + Stylelint, each with core and per-framework variants.
- **A CLI** (`ultracite init | check | fix | doctor | upgrade`) that installs the toolchain, writes config files, wires editors, git hooks, and AI agent rules, and shells out to the chosen linter.
- **An agent skill** (`skills/ultracite`) that ships inside the npm package.

The docs site at https://www.ultracite.ai lives in this repo too.

## Repo map

```
packages/cli/                 The published `ultracite` package
  src/index.ts                Commander entry; every subcommand is registered here
  src/commands/               check, fix, doctor, upgrade
  src/initialize.ts           `ultracite init` orchestration (prompts + flags)
  src/linters/                One adapter per tool: biome, eslint, oxlint, oxfmt, prettier, stylelint
  src/integrations/           husky, lefthook, lint-staged, pre-commit
  src/agent-fix/              `fix --claude` / `fix --codex`: hand remaining diagnostics to an agent CLI
  src/data/                   Static tables: agents, editors, hooks, options, providers, rules (AGENTS.md template)
  src/dependencies.ts         Toolchain versions + peer ranges read from package.json; what `init` installs
  config/                     The presets (see "Presets" below)
  __tests__/                  bun:test suite, one file per source module, plus lint-for-real fixtures
  scripts/                    generate-dts, copy-skill, compare-rule-parity, vendor-anti-slop, and the Biome, ESLint and Stylelint smoke tests
  build.ts                    Bun.build -> dist/index.js (single minified ESM file, deps external)
apps/docs/                    Docs + marketing site (blume on Astro, deployed to Cloudflare Workers)
  docs/**/*.mdx               Documentation content; meta.ts files order the sidebar
  blog/*.mdx                  Research posts (served at /research), each with a page in pages/research (see "Research posts" below)
  pages/                      Custom .astro routes: the homepage, landing pages, the research index and posts
  blume.config.ts             Site config, content sources, redirects under /docs/*
packages/typescript-config/   Shared tsconfig bases (private)
skills/ultracite/             Source of the agent skill; copied into packages/cli/skills on pack
benchmark/                    PR-time performance regression gate for check/fix across all providers
research/                     Research harnesses: verified bibliography, real-codebase corpus, agent fix experiment (see research/README.md)
scripts/                      validate-configs (loads every preset + runs the ESLint/oxlint parity check)
patches/                      bun patchedDependencies (currently oxfmt)
.changeset/                   Changesets; every user-facing change needs one
tmp/                          Gitignored scratch area for hand-testing the CLI against a sample project
```

## Toolchain

- **Bun 1.4.x** is the package manager, test runner, script runner, and bundler. Never use npm/yarn/pnpm here. Lockfile is `bun.lock`.
- **Turbo** fans out `build`, `test`, `types`, `dev` across workspaces.
- **TypeScript** type checks run through `tsrs` (Rust TypeScript compiler). `bun run types` at the root.
- **The repo lints itself with Oxlint + Oxfmt** via `oxlint.config.ts` and `oxfmt.config.ts` at the root, which extend the shipped core, react, astro and anti-slop presets. Do not run Biome, ESLint or Prettier on repo source; those tools are dev dependencies only so the presets can be validated.
- The published CLI must run on **Node 22.22.2+, Node 24.15+ and Bun**, on Linux and Windows (`engines` in `packages/cli/package.json`). That floor is what `eslint-plugin-jsdoc`, which every ESLint setup installs, declares; 22.18 is the first Node 22 that loads the `oxlint.config.ts` init writes. Check a new runtime dependency's `engines` against the floor. `dependencies.test.ts` checks the `engines` of every package `init` installs (with an allowlist for framework plugins that declare more), and CI starts the built CLI on each runtime, including the floor versions. It spawns the linters rather than bundling them, so keep new runtime dependencies to a minimum and avoid Bun-only APIs in `src/`. (Scripts, tests and `build.ts` may use Bun APIs.)

## Commands

Run from the repo root unless noted.

| Task | Command |
| --- | --- |
| Install | `bun install` |
| Build the CLI | `bun run build --filter ultracite` |
| Build everything (incl. docs) | `bun run build` |
| Run all tests | `bun test` |
| Run one test file | `bun test packages/cli/__tests__/oxlint.test.ts` |
| Coverage | `bun run test:coverage` |
| Lint + format check (repo source) | `bun run check` |
| Auto-fix lint + format | `bun run fix` |
| Type check | `bun run types` |
| Validate every preset + rule parity | `bun run validate:configs` |
| Docs dev server | `bun run dev --filter docs` (or `cd apps/docs && bun dev`) |
| Benchmark a packed build | See `benchmark/README.md` |
| Add a changeset | `bun changeset` |

`bun run check` and `bun run fix` execute the CLI straight from source (`packages/cli/src/index.ts`), so they need no build step. The husky pre-commit hook runs, in order: CLI build, tests, check, types, validate:configs. Anything that fails there fails CI too.

### Before you finish a change

1. `bun run fix` (formats and autofixes), then `bun run check` must be clean.
2. `bun run types`
3. `bun test`
4. `bun run validate:configs` if you touched anything under `packages/cli/config`.
5. Add a changeset if the published package's behaviour changed (see Releasing).

## Presets (`packages/cli/config`)

Layout mirrors the package `exports` map in `packages/cli/package.json`:

```
config/oxlint/<preset>/index.mjs      ->  import "ultracite/oxlint/<preset>"
config/eslint/<preset>/eslint.config.mjs -> import "ultracite/eslint/<preset>"
config/biome/<preset>/biome.jsonc     ->  "extends": ["ultracite/biome/<preset>"]
config/oxfmt/index.mjs                ->  "ultracite/oxfmt"
config/prettier/prettier.config.mjs   ->  "ultracite/prettier"
config/stylelint/stylelint.config.mjs ->  "ultracite/stylelint"
config/shared/ignores.mjs             ->  canonical ignore list for every tool
```

Presets: `core` plus framework variants (`angular`, `astro`, `cypress`, `drizzle`, `jest`, `nestjs`, `next`, `playwright`, `qwik`, `react`, `react-native`, `remix`, `solid`, `storybook`, `svelte`, `tanstack`, `vitest`, `vue`; `cypress` and `storybook` only have rules on ESLint, and `drizzle`, `playwright` and `react-native` only on ESLint and Biome), for oxlint and eslint also `gdp` (opt-in, never added by init), for oxlint also `js-plugins`, `next/js-plugins`, `anti-slop`, `shadcn`, and for eslint and biome `type-aware`, plus `<framework>/type-aware` add-ons on eslint for frameworks whose plugins have type-aware rules.

### Rules for changing rules

- **Oxlint is the benchmark.** Decide a rule's severity in `config/oxlint/<preset>/index.mjs` first, then mirror it in ESLint and Biome. `packages/cli/scripts/compare-rule-parity.ts` fails CI on any ESLint/oxlint divergence that is not in its `allowlist` with a reason.
- **Prefer maximum strictness over parity with a tool's defaults.** Every non-nursery rule a plugin implements is listed explicitly in the oxlint presets; ESLint presets enable every non-deprecated plugin rule and then override to match oxlint. Turn a rule off only with a comment saying why (false positives, upstream bug with a link, conflicts with another rule).
- Framework presets must only contain rules from the plugins they enable. `__tests__/oxlint-config.test.ts` asserts this and also that mutually exclusive rules are never both on.
- Rules that need type information are opt-in and never run from `core`. ESLint keeps them in `eslint/type-aware` and the `eslint/<framework>/type-aware` add-ons (split out with `config/eslint/core/type-checked.mjs`; the ESLint smoke test lints every framework preset without type information to catch new ones), Biome in `biome/type-aware`, and Oxlint lists them in core but runs them only with `options.typeAware` and `oxlint-tsgolint`. `init --type-aware` turns them on for each linter.
- Ignore patterns go in `config/shared/ignores.mjs` only. The prebuild step syncs them into `biome/core/biome.jsonc` `files.includes`; the other tools import the module directly. `**/node_modules` must stay in that list (oxlint only skips node_modules via .gitignore; issue #737).
- Rule maps are grouped by plugin (`// ── eslint ──` style section comments) and alphabetised within each group. The `sort-keys` lint rule is off for preset files, so keep that order by hand.

### Generated files (do not hand-edit)

- `config/oxlint/**/index.d.mts` and `config/oxfmt/index.d.mts`: written by `packages/cli/scripts/generate-dts.ts` on every build (`prebuild`).
- `config/biome/core/biome.jsonc` -> `files.includes`: synced from `shared/ignores.mjs` by the same script.
- `config/oxlint/anti-slop/plugin.mjs` and `plugin.d.mts`: a vendored bundle of https://github.com/dmmulroy/anti-slop. Re-vendor with `bun run packages/cli/scripts/vendor-anti-slop.ts [ref]` and bump `PINNED_REF`; then update the rule list in `anti-slop/index.mjs`.
- `packages/cli/skills/`: gitignored copy of `skills/ultracite`, refreshed by `prepack`. Edit `skills/ultracite` at the repo root.

### Adding a framework preset

1. Add `config/oxlint/<name>/index.mjs`, `config/eslint/<name>/eslint.config.mjs` and `config/biome/<name>/biome.jsonc`.
2. Add the framework to `src/data/options.ts` and, for ESLint, the plugin versions to `src/dependencies.ts` (`eslintFrameworkDevDependencies`).
3. Make sure each linter adapter in `src/linters/` extends the new preset when the framework is selected, and add tests in the matching `__tests__` file. Add a fixture to `packages/cli/scripts/biome-smoke.ts` (it fails for a preset without one) and, for an ESLint preset with rules, to `eslint-smoke.ts`; both load the preset with the installed linter and check that its rules report.
4. Run `bun run validate:configs`; the parity script must pass or get an allowlisted, justified exception.
5. Document it in `apps/docs/docs/languages.mdx` and the provider pages.

### Oxlint JS plugins

`js-plugins` bridges `eslint-plugin-github`, `eslint-plugin-sonarjs` and `oxlint-plugin-react-doctor` through oxlint's `jsPlugins`. They are opt-in via `init --js-plugins` because they are much slower (issue #741 is why the benchmark exists). Their npm packages must be **root** devDependencies so a clean install can load `oxlint.config.ts`. `anti-slop`, `@shadcn/lint` and `gdp` are standalone presets extended directly, not through `selectJsPlugins`. `gdp` loads its plugin from `@gdp-ts/core`, which is a runtime library in user projects, so init must never install or prune it.

## The CLI (`packages/cli/src`)

- `index.ts` registers commands with Commander. `check` and `fix` pass unknown flags straight through to the underlying linter via `linter-args.ts`; keep that behaviour when adding options.
- Each `linters/*.ts` adapter exposes the same shape (`exists`, `create`, `update`, `check`, `fix`, ...) and is the only place that knows a tool's config filename and CLI flags. `utils.ts` holds the config-name tables and `detectLinter`.
- `config-resolution.ts` finds the active linter and config; throw `UltraciteSetupError` for user-facing setup problems and `LinterExitError` to propagate a linter's exit code (`run-command.ts`).
- Spawn processes through `spawn-sync.ts`, never `node:child_process` directly. It normalises Windows `.cmd` shims and is what tests mock.
- Write project files through `writeProjectFile` / `updatePackageJson` in `utils.ts`; they guard against writing outside the project.
- `data/rules.ts` is the template for the AGENTS.md / CLAUDE.md / rules files that `init` writes for users. `skills/ultracite/references/code-standards.md` carries the same standards for the skill. If you change one, change the other.
- `dependencies.ts` derives everything `init` and `upgrade` install from `packages/cli/package.json`. Do not hardcode versions elsewhere.
- No `catalog:` references in the published package; changesets cannot resolve them.

### Toolchain version bumps

`peerDependencies` in `packages/cli/package.json` are what `ultracite doctor` checks and what package managers warn about. When a bump enables rules or options older tool releases do not know:

1. Raise the matching peer range to the new minimum.
2. State the new minimum on its own line in the changeset (e.g. `Requires oxlint >= 1.82.0`).

`bun run bump-tools` updates the linter/formatter packages; `bun run bump-deps` updates everything else. Upgrading oxfmt has needed a clean reinstall (`rm -rf node_modules && bun install`) and a regenerated `patches/oxfmt@*.patch` in the past.

## Tests

- Runner is `bun:test`. Files live in `packages/cli/__tests__/<module>.test.ts`, one per source module. Root `bunfig.toml` preloads `packages/cli/__tests__/preload.ts`, so `bun test` works from the root or from `packages/cli`.
- The preload globally mocks `node:fs`, `fast-glob` and `find-workspaces`. `mock.module` in Bun is global and does not restore, so use `mockFileSystem` / `restoreFileSystemMock` from `__tests__/mock-fs.ts` and restore at the end of the test. Real implementations are stashed on `globalThis.__realReadFileSync`, `__realReaddirSync`, `__realSpawnSync`.
- `ULTRACITE_TEST=true` stops `index.ts` from parsing argv on import.
- `__tests__/fixtures/*` are small projects that get linted **for real** with the workspace `oxlint` binary (see `lintFixture` in `oxlint-config.test.ts`). Use this pattern when a change must prove a plugin loads or a rule fires. Fixtures are excluded from repo linting in `oxlint.config.ts`; add new ones there with a comment.
- Tests that touch paths must pass on Windows (CI runs the suite there). Use `path.join` and compare against `path.sep`-aware expectations.
- Assertions belong inside `test()`/`it()`. No `.only`, no `.skip`, no done callbacks. Prefer flat `describe` blocks.

## Releasing

- **Changesets drive releases.** Add one under `.changeset/` for any change to the published package: bug fixes, features, preset rule changes, toolchain bumps, docs that change usage. Skip it for internal refactors, tests, CI, and the docs site (the `docs` workspace is ignored by changesets).
- Severity: `patch` for fixes and rule tweaks, `minor` for new presets, options or commands, `major` for breaking changes. Write the body as a changelog entry for users, in full sentences, with backticked identifiers and links to upstream where relevant.
- On push to `main`, `release.yml` runs tests, builds, and either opens a "Version Packages" PR or publishes to npm. The docs site deploys **only** after a publish (or manual dispatch), never on a plain push.
- Commits: imperative subject line, a body that explains the why and the user-visible effect, and `Resolves #<n>` when closing an issue. No `Co-Authored-By` trailers.
- Do not edit `packages/cli/CHANGELOG.md` by hand; changesets generates it.
- Maintainer changes go straight to `main`. External contributions come in as PRs against `main`; CI (`validate.yml` + `benchmark.yml`) must pass.

## Docs site (`apps/docs`)

- Built with `blume` (an Astro-based docs framework) as a **server** build with the Cloudflare adapter. Every page is still prerendered; the small generated Worker exists so content routes honour `Accept: text/markdown`.
- Content is `docs/**/*.mdx`; sidebar order comes from `meta.ts` in each folder. The changelog page is generated from GitHub releases at build time.
- Redirects: paths under `/`, `/docs/*` and `/changelog/*` must be declared in `blume.config.ts` (the Worker never reads `_redirects`). Everything else goes in `public/_redirects`.
- Keep the site fully static Astro. Do not introduce React or client-side component libraries.
- Deploy is `wrangler deploy --config dist/server/wrangler.json` after `blume build`; CI handles it.

## Research posts (`apps/docs/blog`, served at `/research`)

The Research section at `/research` publishes long reads on the rules Ultracite turns on. Ultracite presents itself as a code quality research company, and these posts are where that has to be earned. The post sources live in `apps/docs/blog/` (an internal name), and the harnesses that produce their data live in `research/`. A post is not a rule reference page. It explains where a rule came from, how it works, what the research says, what it means for people and for agents writing the code, what it costs at scale, where it breaks, and how to use it well. Each post is the canonical answer to "why is this rule on?", so it has to hold up to an expert reader.

### Standards for a post

- **Do the homework, and show it.** Cite history, research papers and official specs, not just linter docs. Open every source and check it says what you claim; never cite from memory. Prefer primary sources (DOI or publisher pages, arXiv, official PDFs, the rule's own docs). Link sources inline and list them in a `## References` section at the end. Start from `research/bibliography/`, which holds sources already opened and checked, one file per topic, and add what you verify to it.
- **Keep it evergreen.** Posts should stay true as Ultracite and the linters change. Leave out details that will change: Ultracite's current thresholds and options, which preset or linter enables what, tool versions, whether a linter supports a rule natively, and CLI flags. Link to the docs for current settings instead (for example `/docs/configuration#overriding-rules`). Measurements and experiments are fine, since they're dated facts: say when they were run, and with what.
- **Every number is measured.** Get rule scores by running the actual rule. Get codebase statistics from real repos at pinned commits, and keep the commit SHAs and tool versions with the scripts. Get claims about agent behavior from running agents (`claude -p` or `codex exec`, with the prompt from `packages/cli/src/agent-fix/prompt.ts`), not from intuition. Keep the scripts so the numbers can be reproduced. The harnesses for all of this are in `research/` (see `research/README.md`): the corpus of eight pinned codebases, a scoring utility, and the agent experiment. Reuse and extend them rather than starting over, and commit each post's results under `results/<topic>/`.
- **Know what Ultracite ships before writing about it.** Read the rule's config in `packages/cli/config` for Oxlint core, the Oxlint JS plugins preset, Biome and ESLint, so nothing in the post contradicts it, even though the post won't list it. Run the rule in each linter on the same code: implementations of the "same" rule often score differently, which is worth explaining in general terms. If you find a preset inconsistency, raise it with Hayden rather than writing around it.
- **Find the real history of the decision.** Use `git log -S "<rule name>"`, `packages/cli/CHANGELOG.md`, and `gh issue list` / `gh pr list --search`, so the post's reasoning matches what actually happened. Don't invent a rationale. If none was recorded, ask Hayden.
- **Be honest about weaknesses.** Every post covers where the rule breaks: what it can't see, how it can be gamed, where the evidence is thin, and where implementations disagree. Frame hypotheses about agents as hypotheses unless a source or an experiment backs them.
- **Plain, specific prose.** Short sentences, concrete examples, no marketing language, and never call Ultracite a "thought leader". Code examples should be realistic and scored by the real rule.

### Adding a post

- A post is two files: the MDX at `apps/docs/blog/<slug>.mdx`, and a page at `apps/docs/pages/research/<slug>.astro`. The page template is in the comment at the top of `apps/docs/lib/blog.ts`. Every post needs its own static page, because Blume leaves dynamic `[slug].astro` routes out of the sitemap. The index fails the build if a post has no page.
- Frontmatter: `title`, `description` (used on the index, in meta tags and in search results), `date` (`2026-10-10`; used for ordering and structured data, never shown, so posts read as evergreen), `author` (a key of `authors` in `lib/blog.ts`), `rules` (config names, such as `sonarjs/cognitive-complexity`), `next` (two or so `label`/`href` links to the docs pages that put the post's advice to work, so settings that change stay in the docs), `results` (the `research/` harnesses holding the post's results, `corpus` and `agent-experiment`, each linked to its `results/<slug>/REPORT.md`), and optional `updated`. `lib/blog.ts` validates all of these at build time. End the body with `<NextSteps />` just above `## References`; it renders `next` and `results`, and the build fails without it.
- Vary the shape of titles. The index reads as a list, so not every title should be `Topic: hook`. A plain claim ("Security lint rules find the sink, not the bug"), a "what happens" or "why" phrase ("What happens to a promise nobody awaits") or "X and the Y" all work. Look at the existing titles before choosing one. Keep the rule's common name or its subject in the title for search, and don't open the description with the title's words.
- Don't repeat the title in the body. The layout renders the title, description, byline and reading time. `##` headings become the "In this post" rail, so keep them short.
- Write headings about this post, not the template. Every post covers the same ground (history, what the rules see, research, real code, agents, the experiment, weaknesses, advice), but the headings shouldn't show it: no "What the research says", "Where it breaks" or "Using it well". Name the finding, the question or what's at stake instead, like "Do types prevent bugs?", "Sixteen runs, three fixes" or "The cheapest change wins", and check the other posts so no two share a heading. `## References` is the only fixed one. When you rename a heading, update links to its anchor from other posts.
- Blume's MDX components (callouts with `:::note`, `CodeGroup`, `Tabs`, `Steps` and more) are wired in through `components/blog/post-components.ts`. To use another Blume component, add it there.
- Oxfmt formats code fences inside MDX: it moves trailing comments onto their own lines and restyles quoted code. Put `{/* prettier-ignore */}` on the line above a fence that has to stay as written, such as code with score annotations or a verbatim excerpt from another project.
- Shallow-clone repos you measure into the gitignored `research/corpus/repos/`, and never install or run their code. Only parse it with the repo's own tooling. Never commit agent session logs, stdout or stderr; the agent harness gitignores them and redacts what it copies back.
- Preview with `cd apps/docs && bun run dev --port 4377` (any non-default port), then check `/research` and `/research/<slug>` in light and dark mode and at 390px wide. `bun run build` in `apps/docs` checks routes and renders the share card at `/research/og/<slug>.png` from the post's `title` and `description` (`pages/research/_og-card.png.ts`; Blume's own cards for custom pages can't take a description).
- Known gap: there's no RSS feed (Blume only builds feeds from content sources, not custom pages).

## Gotchas

- `ultracite fix` on a project with no `.gitignore` used to rewrite `node_modules`. Any change to ignore handling needs a test proving `**/node_modules` survives.
- `oxlint` does not merge `settings` from extended configs. Anything that needs `settings` (react-doctor) must be hoisted onto the root config; see `jsPluginSettings` in `config/oxlint/js-plugins`.
- Biome's `extends` does not carry `files.includes` through a transitive chain when the consumer defines its own (#679), which is why the ignore list is inlined into `biome/core`.
- `tmp/` at the root is a gitignored scratch project for trying the CLI by hand (`cd tmp && bun ../packages/cli/src/index.ts init ...`). Nothing in it is source.
