---
name: ultracite
description: "Ultracite is a zero-config linting and formatting preset for JavaScript/TypeScript projects. Use when: (1) Setting up or initializing Ultracite in a project (ultracite init), (2) Running linting or formatting commands (check, fix, doctor), (3) Writing or reviewing JS/TS code in a project that uses Ultracite — to follow its code standards, (4) Troubleshooting linting/formatting issues, (5) User mentions 'ultracite', 'lint', 'format', 'code quality', or 'biome/eslint/oxlint' in a project with Ultracite installed."
---

# Ultracite

Zero-config linting and formatting for JS/TS projects. Supports three linter backends: **Biome** (recommended), **ESLint** + Prettier, and **Oxlint** + Oxfmt.

## Detecting Ultracite

Check if `ultracite` is in `package.json` devDependencies. Detect the active linter by looking for:
- `biome.jsonc` → Biome
- `eslint.config.mjs` → ESLint
- `.oxlintrc.json` → Oxlint

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

`check` and `fix` accept optional file paths: `bunx ultracite check src/index.ts`.

## Initialization

`bunx ultracite init` runs an interactive setup. For non-interactive (CI) use, pass flags:

```bash
bunx ultracite init \
  --pm bun \
  --linter biome \
  --editors vscode cursor \
  --agents claude copilot \
  --frameworks react next \
  --integrations husky lint-staged \
  --quiet
```

**Flags:**
- `--pm` — `npm` | `yarn` | `pnpm` | `bun`
- `--linter` — `biome` (recommended) | `eslint` | `oxlint`
- `--editors` — `vscode` | `zed` | `cursor` | `windsurf` | `antigravity` | `kiro` | `trae` | `void`
- `--agents` — `claude` | `codex` | `copilot` | `cline` | `amp` | `gemini` | `cursor-cli` + 19 more
- `--frameworks` — `react` | `next` | `solid` | `vue` | `svelte` | `qwik` | `remix` | `angular` | `astro` | `nestjs`
- `--integrations` — `husky` | `lefthook` | `lint-staged` | `pre-commit`
- `--hooks` — Enable auto-fix hooks for supported agents/editors
- `--type-aware` — Enable type-aware linting (oxlint only)
- `--skip-install` — Skip dependency installation
- `--quiet` — Suppress prompts (auto-detected when `CI=true`)

Init creates config that extends Ultracite presets:

```jsonc
// biome.jsonc
{ "extends": ["ultracite/biome/core", "ultracite/biome/react"] }
```

Framework presets available per linter: `core`, `react`, `next`, `solid`, `vue`, `svelte`, `qwik`, `remix`, `angular`, `astro`, `nestjs`.

## Code Standards

When writing code in a project with Ultracite, follow these standards. For the full rules reference, see [references/code-standards.md](references/code-standards.md).

Key rules at a glance:

**Formatting:** 2-space indent, semicolons, double quotes, 80-char width, ES5 trailing commas, LF line endings.

**Style:** Arrow functions preferred. `const` by default, never `var`. `for...of` over `.forEach()`. Template literals over concatenation. No enums (use objects with `as const`). No nested ternaries. Kebab-case filenames.

**Correctness:** No unused imports/variables. No `any` (use `unknown`). Always `await` promises in async functions. No `console.log`/`debugger`/`alert` in production.

**React:** Function components only. Hooks at top level. Exhaustive deps. `key` on iterables (no array index). No nested component definitions. Semantic HTML + ARIA.

**Performance:** No accumulating spread in loops. No barrel files. No namespace imports. Top-level regex.

**Security:** `rel="noopener"` on `target="_blank"`. No `dangerouslySetInnerHTML`. No `eval()`.

## Troubleshooting

Run `bunx ultracite doctor` to diagnose. It checks:
1. Linter installation (biome/eslint/oxlint binary available)
2. Config validity (extends ultracite presets correctly)
3. Ultracite in package.json dependencies
4. Conflicting tools (old `.eslintrc.*`, `.prettierrc.*` files)

Common fixes:
- **Conflicting configs**: Delete legacy `.eslintrc.*` and `.prettierrc.*` files after migrating to Ultracite
- **Missing dependency**: Run `bunx ultracite init` again or manually add `ultracite` to devDependencies
- **Rules not applying**: Ensure config file extends the correct presets for your framework
