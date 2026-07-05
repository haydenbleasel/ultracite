---
name: ultracite
description: "Ultracite is a zero-config linting and formatting preset for JavaScript/TypeScript projects. Use when: (1) Setting up or initializing Ultracite in a project (ultracite init), (2) Running linting or formatting commands (check, fix, doctor), (3) Writing or reviewing JS/TS code in a project that uses Ultracite — to follow its code standards, (4) Troubleshooting linting/formatting issues, (5) User mentions 'ultracite', 'lint', 'format', 'code quality', or 'biome/eslint/oxlint' in a project with Ultracite installed."
---

# Ultracite

Zero-config linting and formatting for JS/TS projects. Supports three linter backends: **Biome** (recommended), **ESLint** + Prettier + Stylelint, and **Oxlint** + Oxfmt.

## Detecting Ultracite

Check if `ultracite` is in `package.json` dependencies or devDependencies. Detect the active linter by looking for (searching upward from the current directory):

- `biome.json` / `biome.jsonc` → Biome
- `eslint.config.*` (`.mjs`, `.js`, `.cjs`, `.ts`, `.mts`, `.cts`) → ESLint (with Prettier for formatting)
- `oxlint.config.ts` → Oxlint (with `oxfmt.config.ts` for formatting)

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

Replace `bunx` with `npx`, `pnpx`, or `yarn dlx` depending on the package manager.

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
  --quiet
```

**Flags:**

- `--pm` — `npm` | `yarn` | `pnpm` | `bun`
- `--linter` — `biome` (recommended) | `eslint` | `oxlint`
- `--editors` — `universal` (writes `.vscode/settings.json` for every VS Code-based editor) | `vscode` | `cursor` | `windsurf` | `codebuddy` | `antigravity` | `bob` | `kiro` | `trae` | `void` | `zed`
- `--agents` — `universal` (writes `AGENTS.md`) | `claude` | `codex` | `copilot` | `cline` | `amp` | `gemini` | `cursor-cli` + 34 more (41 agents supported)
- `--frameworks` — `react` | `next` | `solid` | `vue` | `svelte` | `qwik` | `remix` | `tanstack` | `angular` | `astro` | `nestjs` | `jest` | `vitest`
- `--integrations` — `husky` | `lefthook` | `lint-staged` | `pre-commit`
- `--hooks` — Enable auto-fix hooks: `claude` | `copilot` | `cursor` | `windsurf` | `codebuddy`
- `--type-aware` — Enable type-aware linting (Biome: extends the `type-aware` preset; Oxlint: installs `oxlint-tsgolint`)
- `--install-skill` — Install the reusable Ultracite skill after setup
- `--skip-install` — Skip dependency installation
- `--quiet` — Suppress prompts (auto-detected when `CI=true`)

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
  extends: [core],
  ignorePatterns: core.ignorePatterns,
});
```

Presets available per linter (`ultracite/<linter>/<preset>`): `core`, `react`, `next`, `solid`, `vue`, `svelte`, `qwik`, `remix`, `tanstack`, `angular`, `astro`, `nestjs`, `jest`, `vitest`. Biome also has `type-aware`; Oxlint also has `github` and `sonarjs` (ESLint plugins run via oxlint's JS plugin support, included by default on init).

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
4. Conflicting tools (legacy `.eslintrc.*` files; `.prettierrc.*`/`prettier.config.*` when not using the ESLint backend)

Common fixes:

- **Conflicting configs**: Delete legacy `.eslintrc.*` and `.prettierrc.*` files after migrating to Ultracite
- **Missing dependency**: Run `bunx ultracite init` again or manually add `ultracite` to devDependencies
- **Rules not applying**: Ensure config file extends the correct presets for your framework
