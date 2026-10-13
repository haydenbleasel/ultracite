---
name: ultracite
description: "Ultracite is a zero-config linting and formatting preset for JavaScript/TypeScript projects. Use when: (1) Setting up or initializing Ultracite in a project, or migrating its existing lint and format config onto Ultracite (ultracite init), (2) Running linting or formatting commands (check, fix, doctor), (3) Writing or reviewing JS/TS code in a project that uses Ultracite — to follow its code standards, (4) Troubleshooting linting/formatting issues, (5) Upgrading Ultracite or bringing its configuration up to a newer release (ultracite upgrade), (6) User mentions 'ultracite', 'lint', 'format', 'code quality', or 'biome/eslint/oxlint' in a project with Ultracite installed."
---

# Ultracite

Zero-config linting and formatting for JS/TS projects. Supports three linter backends: **Oxlint** + Oxfmt (recommended), **Biome**, and **ESLint** + Prettier + Stylelint.

## Detecting Ultracite

Check if `ultracite` is in `package.json` dependencies or devDependencies. Detect the active linter by looking for (searching upward from the current directory):

- `biome.json` / `biome.jsonc` → Biome
- `eslint.config.*` (`.mjs`, `.js`, `.cjs`, `.ts`, `.mts`, `.cts`) → ESLint (with Prettier for formatting)
- `oxlint.config.ts`, `oxlint.config.mts` or `.oxlintrc.json` → Oxlint (with `oxfmt.config.ts` or `oxfmt.config.mts` for formatting; init writes the `.mts` form in a package that isn't an ES module)

## CLI Commands

```bash
# Check for issues (read-only)
bunx ultracite check

# Auto-fix issues
bunx ultracite fix

# Diagnose setup problems
bunx ultracite doctor

# Initialize in a new project
bunx ultracite init
```

Replace `bunx` with `npx`, `pnpm exec`, or `yarn` depending on the package manager, so the project's installed Ultracite runs (`pnpm dlx` and `yarn dlx` download the latest release instead, and Yarn 1 has no `dlx`). Only `init` in a project without Ultracite needs a download runner such as `pnpm dlx`.

`check` and `fix` accept optional file paths: `bunx ultracite check src/index.ts`. Unknown options are passed through to the underlying linter (e.g. `bunx ultracite check --max-warnings 0`).

## Initialization

`bunx ultracite init` runs an interactive setup. For non-interactive (CI) use, pass flags:

```bash
bunx ultracite init \
  --pm bun \
  --linter biome \
  --editors universal \
  --agents claude copilot \
  --frameworks react next \
  --integrations husky lint-staged \
  --yes
```

**Flags:**

- `--pm` — `npm` | `yarn` | `pnpm` | `bun` | `deno` | `nub` | `aube`
- `--linter` — `oxlint` (recommended) | `biome` | `eslint`
- `--editors` — `universal` (writes `.vscode/settings.json` for every VS Code-based editor) | `vscode` | `cursor` | `devin` | `codebuddy` | `antigravity` | `bob` | `kiro` | `trae` | `void` | `zed`
- `--agents` — every choice writes the rules to `AGENTS.md`. `universal` writes only that; `claude`, `gemini`, `aider` and `replit` also add the import, settings or copy that agent needs to read them; IDs like `codex`, `copilot`, `cline`, `amp` and `cursor-cli` (40 agents supported) need nothing more
- `--frameworks` — `react` | `next` | `solid` | `vue` | `svelte` | `qwik` | `remix` | `tanstack` | `angular` | `astro` | `nestjs` | `jest` | `vitest` | `cypress` | `storybook`
- `--integrations` — `husky` | `lefthook` | `lint-staged` | `pre-commit`
- `--hooks` — Enable auto-fix hooks: `claude` | `codex` | `copilot` | `cursor` | `devin` | `codebuddy` | `deepagents` | `grok`
- `--js-plugins` — Opt-in Oxlint JS plugins: `@shadcn/lint` | `anti-slop` | `eslint-plugin-github` | `eslint-plugin-jsdoc` | `eslint-plugin-sonarjs` | `eslint-plugin-tsdoc` | `oxlint-plugin-react-doctor`
- `--type-aware` — Enable type-aware linting (ESLint and Biome: extend their `type-aware` preset; Oxlint: installs `oxlint-tsgolint` and sets `typeAware`), and turn on `strictNullChecks` in tsconfig files
- `--install-skill` — Install the reusable Ultracite skill after setup
- `--skip-install` — Skip dependency installation
- `--yes`, `-y` — Take the defaults without prompting (automatic when `CI=true` or there's no terminal); defaults to `oxlint` when `--linter` is omitted
- `--quiet` — Only print warnings and errors

Init creates config that extends Ultracite presets:

```jsonc
// biome.jsonc
{ "extends": ["ultracite/biome/core", "ultracite/biome/react"] }
```

```ts
// eslint.config.mjs — arrays of flat configs, spread together
import core from "ultracite/eslint/core";
import react from "ultracite/eslint/react";
export default [...core, ...react];
```

```ts
// oxlint.config.ts — imports passed to extends
import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
export default defineConfig({
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
});
```

Presets available per linter (`ultracite/<linter>/<preset>`): `core`, `react`, `next`, `solid`, `vue`, `svelte`, `qwik`, `remix`, `tanstack`, `angular`, `astro`, `nestjs`, `jest`, `vitest`, `cypress`, `storybook` (`cypress` and `storybook` only have rules on ESLint; on Oxlint and Biome they're empty). ESLint and Biome also have `type-aware`, the rules that need type information, and ESLint has a `<framework>/type-aware` add-on for `angular`, `jest`, `nestjs`, `qwik`, `tanstack` and `vitest`, extended after that framework's preset. Oxlint also has `js-plugins` (`eslint-plugin-github`, `eslint-plugin-sonarjs` and `oxlint-plugin-react-doctor` run through oxlint's JS plugin support, with `next/js-plugins` and `tanstack/js-plugins` adding framework-specific React Doctor rules), `anti-slop` and `shadcn`. These are opt-in: init only adds them when picked in its prompt or passed with `--js-plugins`. Oxlint and ESLint also have `gdp`, for codebases that use gdp-ts authorization proofs (`@gdp-ts/core` ships the plugin); init never adds it, so extend it by hand after `core`.

## Migrating an Existing Project

Migrating means moving the project's own ESLint, Prettier, Stylelint, Biome or Oxlint configuration onto Ultracite's presets; the project can keep its linter. Run `init` (it preselects the linter it finds), carry over rules the presets don't cover after Ultracite's presets, and run `ultracite fix` to format everything in one commit. Then fix what `check` still reports, or migrate progressively:

- Turn off each failing rule after Ultracite's presets: in `rules` for Oxlint (`ultracite check -f json` lists them as `plugin(rule)`, written `plugin/rule`), or `linter.rules` and `assist.actions.source` for Biome (`ultracite check --reporter=summary`). On ESLint, `ultracite check --suppress-all` records today's errors in `eslint-suppressions.json` instead.
- Turn them back on a few at a time: remove an override (or prune with `ultracite check --prune-suppressions`), run `ultracite fix`, fix the rest, one rule per change.

Full steps: https://www.ultracite.ai/docs/migrate.md

## Upgrading

```bash
npx ultracite@latest upgrade
```

`upgrade` installs the latest Ultracite (or the release `--version 7` names), reinstalls the linter at the versions that release supports, and runs `doctor`. Major releases also change how the configuration looks; `upgrade` lists the guides the project still needs, and with `--claude` or `--codex` it has that agent CLI apply them.

To apply them yourself, follow each guide that applies, oldest first. Each one says how to tell whether the project needs it:

- [references/upgrades/v5.md](references/upgrades/v5.md): Biome 1's config format to Biome 2's
- [references/upgrades/v6.md](references/upgrades/v6.md): the single `ultracite` preset to `ultracite/core` plus framework presets
- [references/upgrades/v7.md](references/upgrades/v7.md): `ultracite/<preset>` to `ultracite/biome/<preset>`, and the `lint` and `format` commands to `check` and `fix`
- [references/upgrades/v8.md](references/upgrades/v8.md): removing `prettier/prettier` from ESLint and Stylelint configs, the Cypress and Storybook presets, ESLint configs that set type-checked rules, Oxlint's `typeAware` option, `init --yes`, and Zed's formatter on ESLint

## Code Standards

When writing code in a project with Ultracite, follow these standards. For the full rules reference, see [references/code-standards.md](references/code-standards.md).

Key rules at a glance:

Formatting is handled by the project's configured linter/formatter. Respect the repository's existing formatter settings instead of forcing one fixed line width, quote style, or trailing comma policy.

**Type safety:** Use explicit types when they improve clarity. Prefer `unknown` over `any`. Use `as const` for immutable values and rely on type narrowing over blunt assertions.

**Modern JavaScript/TypeScript:** Prefer `const`, destructuring, optional chaining, nullish coalescing, template literals, `for...of`, and concise arrow functions.

**Async and correctness:** Always `await` promises in async functions. Prefer `async/await` over promise chains. Remove `console.log`, `debugger`, and `alert` from production code.

**React and accessibility:** Use function components, keep hooks top-level with correct deps, avoid nested component definitions, and use semantic HTML with the right labels, headings, alt text, and keyboard affordances.

**Organization, security, performance, and testing:** Keep functions focused, prefer early returns, avoid `dangerouslySetInnerHTML` and `eval()`, prefer specific imports and top-level regex, and keep tests free of `.only` and `.skip`.

## Troubleshooting

Run `bunx ultracite doctor` to diagnose. It checks:

1. Linter and formatter installation (Biome; or ESLint + Prettier + Stylelint; or Oxlint + oxfmt)
2. Config validity (extends the ultracite presets correctly)
3. Ultracite in package.json dependencies
4. Conflicting tools when not using the ESLint backend (legacy `.eslintrc.*` files, `.prettierrc.*`/`prettier.config.*`)

Common fixes:

- **Conflicting configs**: After moving to Oxlint or Biome, delete leftover `.eslintrc.*` and `.prettierrc.*` files. On ESLint, `.eslintrc.*` files are inert (ESLint 10 only reads `eslint.config.*`) and `.prettierrc.*` is the formatter's config, so neither is a conflict
- **Missing dependency**: Run `bunx ultracite init` again or manually add `ultracite` to devDependencies
- **Rules not applying**: Ensure config file extends the correct presets for your framework
