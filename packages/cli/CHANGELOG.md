## 7.6.3

### Patch Changes

- f584d93: Disable `unicorn/number-literal-case` due to [oxc-project/oxc#21949](https://github.com/oxc-project/oxc/issues/21949).

## 7.6.2

### Patch Changes

- 5be860c: Automatically detect frameworks during the `init` process.
- 10d9e95: Support `-v` as a short alias for `--version` on the CLI (previously only `-V` worked).
- 8ff1b96: Fix `update` command not migrating legacy `ultracite/<name>` extends entries to `ultracite/biome/<name>` (e.g. `ultracite/core`, `ultracite/react`, `ultracite/type-aware`, etc.).
- 5e055ce: Ignore Cloudflare Workers' generated `worker-configuration.d.ts` (produced by `wrangler types`), matching the existing handling of `next-env.d.ts`.
- 9cc7416: Add a `universal` editor target that creates `.vscode/settings.json` for every VS Code-based editor (VS Code, Cursor, Windsurf, CodeBuddy, Antigravity, IBM Bob, Kiro, Trae, Void) with a single selection. The `init` prompt now offers a "Universal" option, and `--editors universal` works as an alias on the CLI.

## 7.6.1

### Patch Changes

- 2fbded9: Disable the `typescript/prefer-readonly-parameter-types` Oxlint rule. While the rule is useful for user-authored types, it fires on virtually every parameter that touches a third-party type (Express `Request`/`Response`, React events, Node `Buffer`, ORM models, DOM APIs) because those types aren't deeply readonly internally — leaving users with unfixable violations. Matches the existing ESLint config, which already has this rule off.
- 617affd: Fix `dist/`, `.next/`, `**/*.gen.*`, and other strong-negation (`!!`) ignore globs being dropped when a consumer's `biome.jsonc` extends `ultracite/biome/core` and also defines its own `files.includes`. The globs moved into `config/shared/ignores.jsonc` in 7.5.9 were transitively extended through `biome/core`, and Biome's extend merge doesn't carry `files.includes` through a two-level chain when the middle config lacks its own entry. The patterns are now inlined directly in `biome/core`'s `files.includes` (still generated from `config/shared/ignores.mjs`), matching the pre-7.5.9 behavior.
- d681e08: Remove the nonexistent `import-x/enforce-node-protocol-usage` rule from the ESLint core config, which caused ESLint 9 to throw `Could not find "enforce-node-protocol-usage" in plugin "import-x"`. Node protocol enforcement is already covered by `unicorn/prefer-node-protocol`.

## 7.6.0

### Minor Changes

- 67227c9: Enable additional Biome rules across core and framework presets. Core gets `noUselessCatchBinding`, `noUselessUndefined`, `useConsistentArrowReturn`, `noUnusedExpressions`, and CSS `noEmptySource` (with `useMaxParams` and `noJsxLiterals` turned off); Next.js adds `noNextAsyncClientComponent`; Qwik adds `useQwikMethodUsage` and `useQwikValidLexicalScope`; React adds `noReactForwardRef`; Vue adds `noVueDataObjectDeclaration`, `noVueDuplicateKeys`, `noVueReservedKeys`, `noVueReservedProps`, and `noVueSetupPropsReactivityLoss`.
- f506624: Enable newly-available rules from oxlint 1.160.0. Core: `typescript/no-unnecessary-qualifier`, `typescript/no-unnecessary-type-parameters`, `typescript/no-useless-default-assignment`, `typescript/prefer-readonly-parameter-types`, `typescript/strict-void-return`, `unicorn/consistent-template-literal-escape`. Jest: `jest/prefer-ending-with-an-expect`, `jest/prefer-importing-jest-globals`, `jest/valid-expect-in-promise`. Vitest: `vitest/valid-expect-in-promise`.

### Patch Changes

- a684c4a: Fix Tanstack Query ESLint plugin import
- 4983eaa: Skip the init skill-install prompt when the Ultracite skill is already installed in the current project or globally.

## 7.5.9

### Patch Changes

- 77e9b41: Consolidate build-output, framework-generated, and lockfile ignore patterns (`**/dist`, `**/.next`, `**/.turbo`, `**/*.gen.*`, `bun.lock`, `pnpm-lock.yaml`, etc.) into a single canonical list at `config/shared/ignores.mjs`. A generated `config/shared/ignores.jsonc` is provided for Biome's `extends`, and the same module is imported directly by oxlint, oxfmt, and ESLint so every tool ignores the same paths.
- 73fc21c: Throw a descriptive error when `package.json` contains invalid JSON instead of surfacing a raw `SyntaxError` from `updatePackageJson`. Detect and report when a linter subprocess is terminated by a signal in `run-command`. Route `tsconfig` update warnings through `@clack/prompts`' `log.warn` for consistent CLI output, and silently return when no `tsconfig.json` files are found.
- 63f7426: Migrate remaining json parsing to jsonc-parser
- aa199d1: fix conflicting prefer-describe-function-title / valid-title rules in vitest
- 402908e: Replace custom yaml parser with dependency
- 3dbfe5c: Validate framework name to prevent injection
- a2cdc0f: Warn if the file looks like it has ultracite config but we couldn't parse it
- 95718bb: Use cross-spawn for cross-platform spawn compatibility
- d09174b: Ignore `.open-next` in the Biome and ESLint core presets.
- 71aeca4: Remove remaining execSync calls
- e81a604: Add zod for safer json parsing

## 7.5.8

### Patch Changes

- c35a1b3: Speed up the `doctor` command by running diagnostic checks synchronously with `readFileSync`/`existsSync` in a single pass instead of awaiting each check behind its own spinner, removing the per-check async overhead and startup delay.
- 56e4c00: Remove `process.exit()` - swap with typed Error
- d35d03c: Switch hot-path init and agent/editor/hook setup calls from async `mkdir`/`readFile` to their sync counterparts where I/O already happens serially, and batch the second `package.json` write (to add `check`/`fix` scripts) into the same `updatePackageJson` call that writes devDependencies in no-install mode, saving a redundant read/write per init.
- ee224a6: Read positional file arguments from Commander's action callback directly in the `check` and `fix` commands instead of re-parsing `process.argv` to separate files from passthrough flags.
- a2b7a46: Rewrite `doctor` around `detectLinter` so it only runs the checks relevant to the linter configured in the project (Biome, ESLint, or Oxlint) instead of running every check unconditionally. Generalize installation checks into a single `checkToolInstallation` helper and add detection for Prettier and Stylelint configuration conflicts.
- cf4a044: Fix angular eslint plugin typo
- 25eb24f: Pass the full dependency list to `addDevDependency` in one call during `init` instead of looping per-package, so package managers resolve and install all Ultracite devDependencies in a single invocation.
- b46537a: Convert `exists()` and `detectLinter()` in `utils.ts` from async (`fs.promises.access`) to sync (`accessSync`), and update all call sites across the linter, agent, editor, hook, and integration modules. The function is used in hot init paths where the async overhead gave no benefit.

## 7.5.7

### Patch Changes

- a63d9c5: Replace oxlint's `categories` block (`correctness`, `pedantic`, `perf`, `restriction`, `style`, and `suspicious` all set to `error`) in the core preset with an explicit, exhaustively-listed rule set. Category-level defaults were letting rules not present in the core config leak through to consumer configs that extended ours, producing unexpected violations.
- d18d0e7: Configure Prettier with frameworks context
- 1d6de0d: Add declaration files for `ultracite/oxlint/*` and `ultracite/oxfmt` so TypeScript config imports resolve without `ts(7016)` errors.
- 1073f34: Ensure init'ed JSON files have newlines

## 7.5.6

### Patch Changes

- acf4a97: Add newly-available oxlint jest rules: `jest/no-unneeded-async-expect-function`, `jest/padding-around-after-all-blocks`, `jest/prefer-mock-return-shorthand`, and `jest/prefer-snapshot-hint`. Reorganize the config so disabled rules (with their rationale comments) sit at the bottom of the rules block for readability.
- 6905932: Fix `vitest/no-importing-vitest-globals` conflict
- 4e4dc03: Add newly-available oxlint vitest rules: `vitest/consistent-each-for`, `vitest/hoisted-apis-on-top`, `vitest/prefer-called-exactly-once-with`, `vitest/prefer-called-once`, `vitest/prefer-describe-function-title`, `vitest/prefer-expect-type-of`, `vitest/prefer-import-in-mock`, `vitest/require-awaited-expect-poll`, and `vitest/require-mock-type-parameters`. Drop `vitest/prefer-lowercase-title`.
- 6a583d1: Fix the generated `oxfmt.config.ts` template, which was re-exporting Ultracite's config directly (a form oxfmt doesn't accept). Wrap it in `defineConfig({ extends: [ultracite] })` so oxfmt picks up the shared rules.

## 7.5.5

### Patch Changes

- 5437f81: Rename bundled oxlint and oxfmt config files from `.ts` to `.mjs` so consumers can load them without a TypeScript loader, and update Ultracite's own generated `oxlint.config.ts`/`oxfmt.config.ts` imports to match.

## 7.5.4

### Patch Changes

- 66999e0: Rename bundled oxlint and oxfmt configs from `.js` back to `.ts`, and fix the Next.js and React oxlint preset imports that were still pointing at the old extension.

## 7.5.3

### Patch Changes

- 97c3938: Fix oxlint and oxfmt import paths

## 7.5.2

### Patch Changes

- 22df7a5: Rename bundled oxlint and oxfmt configs from `.ts` to `.js` so consumers importing `ultracite/oxlint/*` no longer need a TypeScript loader at runtime, and update Ultracite's own generated `oxlint.config.ts` imports to match.

## 7.5.1

### Patch Changes

- e96c55a: Switch oxlint.config.ts to js imports

## 7.5.0

### Minor Changes

- 7861cf7: Migrate oxlint and oxfmt configurations from JSON to TypeScript using `defineConfig`. The CLI now generates `oxlint.config.ts` and `oxfmt.config.ts` instead of `.oxlintrc.json` and `.oxfmtrc.jsonc`, and all internal framework presets have been converted to TypeScript.

### Patch Changes

- fdb1493: Exclude package manager lock files (`bun.lock`, `bun.lockb`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) from Biome linting and formatting

## 7.4.4

### Patch Changes

- e9db6f1: Add IBM Bob agent, editor, and logo
- 5341bcc: Disable `vitest/prefer-strict-boolean-matchers` to resolve conflict with prefer-to-be-truthy and prefer-to-be-falsy

## 7.4.3

### Patch Changes

- 42b3552: Update the bundled VS Code settings to use `js/ts.tsdk.path` and `js/ts.tsdk.promptToUseWorkspaceVersion` instead of the deprecated `typescript.tsdk` setting.
- a0a03c6: Allow `utf-8` values in the `unicorn/text-encoding-identifier-case` rule across the bundled ESLint and Oxlint configs.

## 7.4.2

### Patch Changes

- 94e770e: Remove non-existent oxlint rules (`import/no-unresolved`, `vitest/no-done-callback`) for compatibility with oxlint 1.58.0+

## 7.4.1

### Patch Changes

- 7a14fb2: Prompt users to install the reusable Ultracite skill during `ultracite init` and add a `--install-skill` flag for non-interactive setup.
- 4f0cd02: Fix incorrect react-perf rule names (react_perf → react-perf)
- f78c934: Group agents that share the same rules file path (e.g. `AGENTS.md`) under a single prompt option during `ultracite init` instead of listing every agent individually, so selecting one creates the file once for all compatible agents. Adds a "Universal" option that writes `AGENTS.md` for the full set of agents that support it.
- 969b271: Add Svelte and Tailwind CSS plugins to Prettier config

## 7.4.0

### Minor Changes

- c189cf1: Add support for new agent integrations including Zencoder, Ona, OpenClaw, Continue, Snowflake Cortex, Deepagents, Qoder, Kimi CLI, Kode, MCPJam, Mux, Pi, Neovate, Pochi, and AdaL, plus add CodeBuddy as a supported editor.

### Patch Changes

- 04d8455: Add no-void rule with allowAsStatement to complement no-floating-promises
- e38d579: Fix DEP0190 deprecation warnings in `check`, `fix`, and `doctor` by routing CLI subprocesses through a shared `cross-spawn` runner with `shell: false`, while preserving Windows command resolution and direct file-path argument passing.
- 98cb8c2: Pin ESLint initialization to a peer-compatible dependency set so `ultracite init` no longer installs an incompatible `eslint@latest` with `eslint-plugin-github`
- fd7d05f: Disable conflicting `vitest/prefer-called-times` oxlint rule to resolve conflict with `vitest/prefer-called-once`
- 581ea40: Add typed `ultracite/oxlint` exports for use in `oxlint.config.ts`.

## 7.3.2

### Patch Changes

- 8ffeb33: Add support for .oxlintrc.mjs and oxlint.config.ts

## 7.3.1

### Patch Changes

- f84edff: Fix --type-aware for Biome
- acf301c: Migrate from eslint-plugin-import to import-x
- 5749eb1: Split Jest and Vitest rules out of the core presets into their own opt-in framework presets (`ultracite/biome/jest`, `ultracite/biome/vitest`, `ultracite/eslint/jest`, `ultracite/eslint/vitest`, `ultracite/oxlint/jest`, `ultracite/oxlint/vitest`), selectable through the framework selector during init. Resolves the oxlint rule overlap (#604) where jest and vitest blocks were both applied to every file in the core config.

## 7.3.0

### Minor Changes

- 0d27e68: fix `noUnusedImports` removing new imports in agent hooks

### Patch Changes

- 668fe62: Add --type-aware flag for biome
- 4280484: Disable max-statements in Oxlint
- d37b046: Disable `jsdoc/require-param-type` and `jsdoc/require-returns-type` for TS files

## 7.2.5

### Patch Changes

- 83bafe4: Disable `useValidLang` rule for SvelteKit app.html to prevent false positives from %lang% placeholder
- 4df6da9: Disable `noUndeclaredVariables` for Svelte files to fix false positives with template block variables like `{#each}`

## 5.6.0

## 7.2.4

### Patch Changes

- cfaa912: Remove Jest and Vitest rules from non-test files
- f72f2dc: Add support for copilot hooks
- 66d51fd: Disable `import/no-nodejs-modules` for Chris Consent
- d1e8490: Create skill

## 7.2.3

### Patch Changes

- 3cd6e7b: Upgrade Biome to 2.4

## 7.2.2

### Patch Changes

- 8db75d7: Only run shell: true on windows

## 7.2.1

### Patch Changes

- 0d21c46: Restore shell for windows

## 7.2.0

### Minor Changes

- fe9acf6: Use local binaries

### Patch Changes

- 357be7e: Store full package manager info from `detectPackageManager()`
- 8666788: Fix Husky precommit hook

## 7.1.5

### Patch Changes

- c8fdacf: fix: `detectLinter()` doesn't walk up directory tree, Breaks monorepo subdirectory usage
- c79c3b0: Fix lefthook file configuration
- 4b9d206: Make `useBlockStatements` fix safe
- 8e9e728: Add support for NestJS
- d0ae8f3: Fix: Biome removes all imports in Svelte files on save instead of organizing them

## 7.1.4

### Patch Changes

- 34c79bb: Fix conflicting oxlint rules

## 7.1.3

### Patch Changes

- c60533d: Fix oxlint `import/consistent-type-specifier-style`

## 7.1.2

### Patch Changes

- 9d443b6: Fix func-style config in oxlint
- 3d9b488: Fix: argument --unsafe cannot be used multiple times in this context
- f06808f: Don't pass options to formatters, only linters

## 7.1.1

### Patch Changes

- 0e9af01: Automatically add scripts to root `package.json`
- 656f6d7: fix(oxlint-remix): ignore unicorn rules for generated routeTree.gen.ts

## 7.1.0

### Minor Changes

- c201da4: Switch to commander.js, fix multiple agents args
- e022697: Add support for all provider flags

### Patch Changes

- 64e79c7: fix(eslint): fix eslint rules config
- a5ae91c: fix(eslint): Remove eslint-plugin-tailwindcss due to v4 incompatibility
- 5c349a9: Enable `tsconfig.json` to have comments

## 7.0.12

### Patch Changes

- f328fc6: Update nypm to remove dependency on corepack
- 6f638fa: Fix error message when exiting with code 1
- f328fc6: Fix eslint dependencies during initialization
- f328fc6: Allow comments in json files

## 7.0.11

### Patch Changes

- 79d2756: fix: exit with code 1 when check/fix finds errors
- c032612: Fix: Parser Errors on .jsonc Files Due to Comments
- a556651: Move oxlint to optionalDependencies or peerDependencies

## 7.0.10

### Patch Changes

- a7b34ed: Add Vercel Agent support
- b6658ce: Add Claude Code hook integration to run `ultracite fix` after `Write`/`Edit` tool usage.

## 7.0.9

### Patch Changes

- 95dd898: Disable sort-imports in favor of oxfmt
- c72d2b3: Disable `react/jsx-max-depth`
- 2ae8976: Disable `typescript/require-await`

## 7.0.8

### Patch Changes

- a9efe80: Add Cursor CLI as agent
- 00fb477: Add support for Mistral Vibe

## 7.0.7

### Patch Changes

- ea7a6dc: Fix oxlint import path
- a6e43a0: Add more CLI options for oxlint, oxfmt and biome
- ad52a16: Fix linter provider mention in agent rules

## 7.0.6

### Patch Changes

- 702f6b5: Upgrade Biome to 2.3.11

## 7.0.5

### Patch Changes

- ab47642: add --type-aware and --type-check flags for oxlint

## 7.0.4

### Patch Changes

- 7e9b76c: Fix legacy imports

## 7.0.3

### Patch Changes

- 92eaa89: Cleanup dist files

## 7.0.2

### Patch Changes

- 246c1fc: Update docs and README
  Remove catalog dependencies

## 7.0.1

### Patch Changes

- a8408b6: Fix bundling issues

## 7.0.0

### Major Changes

- c4a205f: Remove i18n docs
- c4a205f: Remove custom reporter
- c4a205f: Scaffold support for ESLint and Oxlint
- c4a205f: Add support for Amazon Q, Crush, Firebender, OpenCode, Qwen and Trae
- c4a205f: Move biome config under `biome`

### Patch Changes

- 5538022: Increase max allowed complexity
- 5508d47: Remove GraphQL override that disables formatter/linter
- e1b6be6: Fix undefined input to fix command
- 618ae17: Fix changesets
- Updated dependencies [c4a205f]
  - `@repo/data@2.0.0`

## 6.5.1

### Patch Changes

- 3998825: Fix undefined input to fix command

## 6.5.0

### Minor Changes

- 628a5c3: Disable most nursery rules in the core preset. Nursery rules are experimental and may change or be removed across Biome versions, so they're no longer enabled by default; `useSortedClasses` stays on due to popular demand.

### Patch Changes

- a942392: Switch `useConsistentTypeDefinitions` in the core preset from `type` to `interface`, matching TypeScript's recommended declaration style for object shapes.

## 6.4.3

### Patch Changes

- 393a0d1: Set `css.formatter.enabled: true` explicitly in the core preset so Biome always formats CSS files, rather than relying on the upstream default.
- 127c1c6: Show a hint in the `fix` reporter summary when suggested (unsafe) fixes are skipped, pointing users at `--unsafe` to apply them.
- 41a73ba: Widen the docs site's Next.js proxy matcher to exclude Next's file-based metadata routes (`icon.png`, `apple-icon.png`, `opengraph-image.png`, `twitter-image.png`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`) so they aren't rewritten.
- 43b07be: Rewrite `tsconfig` patching to edit files in place with `jsonc-parser`'s `modify`/`applyEdits` (preserving comments and formatting) instead of deep-merging and rewriting the whole file. Skip the write entirely when `strictNullChecks` is already enabled — either directly or via `strict: true`.
- 9d1d374: Add support for pre-commit (python)
- f9256db: Add support for Antigravity

## 6.4.2

### Patch Changes

- 42fc700: Disable Biome scanner-based rules in the core preset (`useAwaitThenable`, `useFind`, `useRegexpExec`, `noPrivateImports`, `noUndeclaredDependencies`, `useImportExtensions`). These rely on Biome's project scanner, which is significantly slower than single-file linting.
- aff09df: Silence noisy subprocess output during `init` by passing `silent: true` to `addDevDependency` and switching the Husky and Lefthook initialization `execSync` calls from `stdio: "inherit"` to `stdio: "pipe"`, so installer chatter no longer bleeds into the interactive CLI.
- 0f57252: Upgrade to Biome 2.3.9
- c15b770: Improve the custom reporter: show every remaining diagnostic instead of filtering to only un-fixable ones (if Biome fixed a finding it's already removed from the list), and append a documentation link (`https://biomejs.dev/linter/rules/<rule>/`) under each lint diagnostic.
- 99dda79: Switch the VS Code Biome extension installer's `stdio` from `inherit` to `pipe` and surface a clean status message based on exit code (`settings.json created and Biome extension installed.` on success, `settings.json created. Install Biome extension manually.` otherwise) instead of leaking `code --install-extension` output into the CLI.
- d759789: Bump Biome to 2.3.10

## 6.4.1

### Patch Changes

- a8570b3: Use the detected package manager (`npm`/`bun`/`yarn`/`pnpm`) when generating agent rules files, Claude hooks, and doctor messages, so emitted commands (`bun x ultracite fix`, `pnpm dlx ultracite fix`, etc.) match the project's tooling instead of being hardcoded to `npx`.

## 6.4.0

### Minor Changes

- 6201822: Replace Biome's default output with a custom Ultracite reporter (`packages/cli/src/reporter.ts`) that renders diagnostics, summary counts, durations, and per-rule details with color and formatting tailored to the CLI.

## 6.3.12

### Patch Changes

- 635acd1: Pipe the Lefthook `install` subprocess through `stdio: "inherit"` so its prompts reach the terminal, fixing the step appearing to be "canceled" when it was actually waiting on hidden input.

## 6.3.11

### Patch Changes

- 84d1cef: Add a `prepare: "lefthook install"` script to `package.json` when the Lefthook integration is selected, matching the Husky behavior so Lefthook hooks are reinstalled automatically after `install`.

## 6.3.10

### Patch Changes

- bc7d89f: Fix the `useAwait`-off override in the Next.js preset to match `**/next.config.*` instead of `next.config.*`, so Next config files nested inside monorepo apps are covered.
- d292922: Use `nypm`'s `dlxCommand` with the detected package manager when invoking Biome from `check`, `fix`, and `doctor`, instead of hardcoding `npx @biomejs/biome`.

## 6.3.9

### Patch Changes

- a13eb72: Add support for Factory Droid AI assistant

## 6.3.8

### Patch Changes

- e5e48db: Bump Biome to 2.3.8
- 0a525d9: Update docs

## 6.3.7

### Patch Changes

- fec49ac: added cloudflare wrangler generated file to the ignore list

## 6.3.6

### Patch Changes

- 99a417c: Fix docs on quotes
- 5fb7031: Pass `--max-diagnostics=none` to Biome in `check` and `fix` so the full list of diagnostics is reported instead of being truncated by Biome's default cap (stop-gap for #401).
- c66c232: Replace `process.exit()` calls across `check`, `fix`, `doctor`, and `initialize` with thrown `Error`s, so Ultracite can be invoked programmatically as a library without tearing down the host process.

## 6.3.5

### Patch Changes

- 1bccc30: Upgrade Biome to 2.3.7
- 3837d19: Remove the invalid `JSX` language block from the generated Zed settings. Zed doesn't recognize `JSX` as a language identifier, and the `TSX` block already covers JSX files.
- 06a8871: Switch core preset ignore globs from `!` to `!!` (force-ignore) so patterns like `**/dist/**`, `**/.next/**`, and `**/*.gen.*` can't be accidentally re-included by consumer configs.

## 6.3.4

### Patch Changes

- 3edc530: Bump glob to resolve dependency vulnerability
- 30ac12c: Update Biome to 2.3.6

## 6.3.3

### Patch Changes

- 9132af5: Upgrade to Biome 2.3.5

## 6.3.2

### Patch Changes

- 7537f01: Add a `--quiet` flag to `ultracite init` that skips all interactive prompts, suppresses ASCII art/spinners/log messages, applies sensible defaults, and exits 0/1 for pipeline consumption. Automatically enabled when `CI=true` or `CI=1`.

## 6.3.1

### Patch Changes

- 908ac57: Register the missing `--hooks` option on `ultracite init` so hook selections made via CLI flags are actually passed through to the router.

## 6.3.0

### Minor Changes

- a5a1510: Add a `--hooks` flag (and matching interactive prompt) to `ultracite init` for selecting agent hooks separately from agent rules. Split hook handling into its own `src/hooks/` module, and add Claude Code as a supported hook target alongside Cursor.

### Patch Changes

- 0fed52b: Upgrade Biome to 2.3.4
- a9347c8: Disable `noMagicNumbers` and `noConsole`
- aa7f769: Widen the JSON override's `includes` patterns in the core preset from repo-root-only (`package.json`, `tsconfig.json`, `tsconfig.*.json`) to recursive (`**/package.json`, `**/tsconfig.json`, `**/tsconfig.*.json`) so the JSON-specific settings apply to deeply-nested configs in monorepos.

## 6.2.1

### Patch Changes

- 527e737: Update to Biome 2.3.3
- d5f9d64: Disable `useAwait` on page.tsx and layout.tsx files in Next.js
- eb77e3f: add allowForLoopAfterthoughts to `noIncrementDecrement`

## 6.2.0

### Minor Changes

- 4035389: Generate a `.cursor/hooks.json` with an `afterFileEdit` command that runs `npx ultracite fix` when Cursor is selected during `init`, replacing the previous Cursor rules-file approach.
- 18ed1f3: Rewrite the bundled agent rules file (`.cursor/rules/ultracite.mdc`, `.claude/...`, etc.): collapse hundreds of short-hand directives into a shorter, structured markdown document tailored for AI coding agents, incorporating feedback from the Cursor team.

### Patch Changes

- 7aa5fd8: Add a `--diagnostic-level` option to `ultracite check` that forwards to Biome's `--diagnostic-level=info|warn|error`, letting users filter output down to warnings or errors only.
- f9e2141: Use `glob` to find every `tsconfig*.json` in the project and patch each one to enable `strictNullChecks`, instead of only creating/updating a single root `./tsconfig.json` (which broke monorepos with no root config).

## 6.1.0

### Minor Changes

- b6bdc8e: Introduce Warp agentic terminal support

### Patch Changes

- ba72503: Fix husky initialization
- b038a60: Fix overrides in Astro, Svelte, Vue presets having no effect
- b7451ee: Change the core preset's root include glob from `**/*` to `**` so directory-level ignores evaluate more efficiently.
- f7ebeb8: Improve test coverage for agents

## 6.0.5

### Patch Changes

- 5f00bd3: Move framework-specific rules (Next, Astro, Qwik, React, Remix, Solid, Svelte, Vue, Angular) into `overrides` blocks scoped to each framework's file patterns, so extending multiple presets no longer applies framework-only rules to unrelated files.
- 30f488e: Upgrade Biome to 2.3.2, add "`noIncrementDecrement`"

## 6.0.4

### Patch Changes

- b0a7281: setting cursor rule context to glob pattern instead of always apply

## 6.0.3

### Patch Changes

- 82e5353: Remove the legacy top-level `ultracite` preset (`config/ultracite/biome.jsonc`) that bundled `core + react + next`. Consumers now extend the specific presets they want (`ultracite/core`, `ultracite/react`, `ultracite/next`, etc.) directly.

## 6.0.2

### Patch Changes

- 9566f79: Upgrade to Biome 2.3.1

## 6.0.1

### Patch Changes

- 5848800: Fix the bundled legacy `ultracite` preset's `extends` paths — use relative file paths (`../core/biome.jsonc`, etc.) instead of package specifiers (`ultracite/core`), which Biome couldn't resolve from inside the package.

## 6.0.0

### Major Changes

- 86ee61e: Split the monolithic config into framework-specific presets (`ultracite/core`, `ultracite/react`, `ultracite/next`, `ultracite/angular`, `ultracite/astro`, `ultracite/qwik`, `ultracite/remix`, `ultracite/solid`, `ultracite/svelte`, `ultracite/vue`) that consumers compose via `extends`, and add framework selection to `ultracite init`.

### Minor Changes

- d704b5c: Add first-class support for Astro

### Patch Changes

- c5c7ca1: Disable Biome project-scanner rules (`noDeprecatedImports`, `noFloatingPromises`, `noMisusedPromises`, `noUnresolvedImports`, `noImportCycles`, `useExhaustiveSwitchCases`, `useJsonImportAttributes`) in the core preset — they rely on the slower project scanner, which was making Ultracite too slow to run on large codebases.
- ff83b52: Compress the agent rules bundled into `.cursor/rules/ultracite.mdc` and related files (abbreviate "TypeScript" to "TS", merge related patterns, drop redundant "don't use" prefixes) to fit under Windsurf's 12,000-character context limit — previously ~16,700.
- 8987c58: Upgrade to Biome 2.3.0
- acd8c42: Brand and docs update
- ed1bcb6: Docs updates and bump deps
- d0ba90b: Generate agent rules files from the same per-framework rule lists that drive the Biome presets, so selecting frameworks during `init` produces a `.cursor/rules/ultracite.mdc` scoped to exactly the frameworks in use.

## 5.6.4

### Patch Changes

- 679719b: Temporarily disable Qwik rules

## 5.6.3

### Patch Changes

- a167b1c: Update Biome to 2.2.6

## 5.6.2

### Patch Changes

- 7b515fe: Disable `useAwait` rule in next config files
- 7b515fe: Improve test coverage
- c3a9dad: Bump deps
- 3faa8c2: Add Roo Code editor rules support

## 5.6.1

### Patch Changes

- 44917fd: Fix package readme, move vitest to devDeps

### Minor Changes

- 762ef70: Replace `auto` with Changesets for release management — add `.changeset/config.json` and its README, move the release workflow from `release.yaml` to `release.yml`, delete `.autorc`, and update `CONTRIBUTING.md` to document the new flow.

### Patch Changes

- f3ec41b: Backport changelog

## 5.5.5

### Patch Changes

- Remove unused deps

## 5.5.4

### Patch Changes

- Potential fix for code scanning alert no. 13: Workflow does not contain permissions [#297](https://github.com/haydenbleasel/ultracite/pull/297)
- Potential fix for code scanning alert no. 12: Workflow does not contain permissions [#298](https://github.com/haydenbleasel/ultracite/pull/298)

## 5.5.3

### Patch Changes

- Increase branch test coverage from 89.21% → 91.02%
- Update `package.json`
- Fix unit tests
- Add Videos section to homepage
- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Handle `cancel` for the migrations, editor-config, and editor-rules `multiselect` prompts in `ultracite init` so Ctrl+C exits cleanly with a "cancelled" message instead of crashing (#280)
- Make migration dep parsing lazier
- Drop the custom `match` regex from `useFilenamingConvention` in `biome.jsonc` so the rule uses Biome's default matcher (#287)
- Enable Biome's HTML formatter (`html.formatter.enabled: true`) in the shipped config (#290)
- Configure `noUnusedImports` with `fix: "safe"` so unused imports are auto-removed on format rather than only reported (#294)

## 5.5.2

### Patch Changes

- Update logos

## 5.5.1

### Patch Changes

- Upgrade Biome to 2.2.5

## 5.5.0

### Minor Changes

- Bump `@types/node` from 24.5.2 to 24.6.1 [#292](https://github.com/haydenbleasel/ultracite/pull/292)
- Bump `@trpc/server` from 11.5.1 to 11.6.0 [#291](https://github.com/haydenbleasel/ultracite/pull/291)

## 5.4.7

### Patch Changes

- Extract and update logos

## 5.4.6

### Patch Changes

- fix: disable `useNamingConvention`; improve comments consistency [#289](https://github.com/haydenbleasel/ultracite/pull/289)

## 5.4.5

### Patch Changes

- Update open-in-chat.tsx

## 5.4.4

### Patch Changes

- Fix nav

## 5.4.3

### Patch Changes

- Fix docs layout
- Fix SVG attributes

## 5.4.2

### Patch Changes

- Update zero-config.tsx

## 5.4.1

### Patch Changes

- Update README.md

## 5.4.0

### Minor Changes

- Upgrade to Biome 2.2.4 [#283](https://github.com/haydenbleasel/ultracite/pull/283)

## 5.3.11

### Patch Changes

- Docs update [#282](https://github.com/haydenbleasel/ultracite/pull/282)

## 5.3.10

### Patch Changes

- Update ultracite.mdc
- Bump vite from 6.3.5 to 7.1.5 in the npm_and_yarn group across 1 directory [#279](https://github.com/haydenbleasel/ultracite/pull/279)

## 5.3.9

### Patch Changes

- Update validate.yml

## 5.3.8

### Patch Changes

- Rename file, cleanup steps

## 5.3.7

### Patch Changes

- Update build.yml

## 5.3.6

### Patch Changes

- Update workflows

## 5.3.5

### Patch Changes

- update docs with correct cli option for integrations [#281](https://github.com/haydenbleasel/ultracite/pull/281)

## 5.3.4

### Patch Changes

- Update monorepos.mdx turbo task names [#277](https://github.com/haydenbleasel/ultracite/pull/277)

## 5.3.3

### Patch Changes

- Point `biome.jsonc`'s `$schema` to `./node_modules/@biomejs/biome/configuration_schema.json` instead of a version-pinned `https://biomejs.dev/schemas/<version>/schema.json` URL, so the schema always tracks the installed Biome version
- Don't emit diagnostics on unhandled files

## 5.3.2

### Patch Changes

- Pass `--no-errors-on-unmatched` to Biome in `check` and `fix` so running Ultracite on a directory with no matching files exits cleanly instead of failing (#240)

## 5.3.1

### Patch Changes

- Rewrite the generated Husky pre-commit hook to run the formatter only against staged files, stash unstaged changes via `git stash push --keep-index` while it runs, re-stage the formatted files, and preserve partial staging — fixing earlier hook behavior that mangled unstaged work or failed on empty commits (#262)
- Update dependabot.yml
- Bump actions/checkout from 4 to 5 [#275](https://github.com/haydenbleasel/ultracite/pull/275)

## 5.3.0

### Minor Changes

- Rename the documented CLI subcommands `lint` → `check` and `format` → `fix` across the usage and monorepo guides to match the actual commands, and add a "Validating Setup" section covering `ultracite doctor` [#272](https://github.com/haydenbleasel/ultracite/pull/272)
- Release 5.3 [#270](https://github.com/haydenbleasel/ultracite/pull/270)

## 5.2.17

### Patch Changes

- Fix unit tests
- Restore the `npx` prefix on the `format` and `lint` subcommands — without it, Ultracite tried to invoke `@biomejs/biome` directly, which only works when Biome is globally installed (#263)

## 5.2.16

### Patch Changes

- Update push.yaml

## 5.2.12

### Patch Changes

- feat: ignore generated files [#216](https://github.com/haydenbleasel/ultracite/pull/216)
- Potential fix for code scanning alert no. 8: Workflow does not contain permissions [#261](https://github.com/haydenbleasel/ultracite/pull/261)
- Update push.yaml
- Ship an `overrides` block in `biome.jsonc` covering config files, scripts/CLI tools, Storybook stories, `.d.ts`, build output, JSON config files, and router-generated files — relaxing or disabling irrelevant rules (`noConsole` in scripts, `noUnusedVariables` in `.d.ts`, formatter/linter off for generated files, etc.) so Ultracite doesn't flag false positives in these file types (#255)

## 5.2.11

### Patch Changes

- Increase test coverage lines from 93.61% to 94.18%
- Increase test coverage lines from 88.43% to 93.61%
- Increase test coverage lines from 87.22% to 88.43%
- Add unit tests
- Wrap file-path arguments to Biome in single quotes (escaping any existing quotes) when they contain shell-special characters, and route the call through `shell: true` so paths with spaces, parens, `$`, etc. run correctly (#260)

## 5.2.10

### Patch Changes

- Replace execSync commands with spawnSync [#259](https://github.com/haydenbleasel/ultracite/pull/259)

## 5.2.9

### Patch Changes

- Ship a starter `lefthook.yml` in the Lefthook integration, and detect Lefthook's default commented `EXAMPLE USAGE` template so `ultracite init` overwrites it rather than appending the Ultracite config below (#205)

## 5.2.8

### Patch Changes

- Fix recharts dep

## 5.2.7

### Patch Changes

- Update `pnpm-lock.yaml`

## 5.2.6

### Patch Changes

- Bump deps
- Upgrade Biome to 2.2.2

## 5.2.5

### Patch Changes

- DOCS : Fix error in the troubleshooting page [#257](https://github.com/haydenbleasel/ultracite/pull/257)

## 5.2.4

### Patch Changes

- Docs: Fix the docs with the latest version in biome [#252](https://github.com/haydenbleasel/ultracite/pull/252)

## 5.2.3

### Patch Changes

- Update editor rules docs

## 5.2.2

### Patch Changes

- Support more AI agents [#250](https://github.com/haydenbleasel/ultracite/pull/250)

## 5.2.1

### Patch Changes

- Fix unit tests
- Create util for updating `package.json`

## 5.2.0

### Minor Changes

- Replace the hand-rolled package-manager detection and install helpers with `nypm`, which handles npm/pnpm/yarn/bun/deno detection, monorepo workspace targeting, and dlx-style commands through a single consistent API [#249](https://github.com/haydenbleasel/ultracite/pull/249)

## 5.1.9

### Patch Changes

- Run formatter
- Rename the `eslint-cleanup`/`prettier-cleanup` test and source files to `eslint`/`prettier` to match the CLI module layout, and consolidate the per-editor rules tests into a single location
- Enable `noBarrelFile` in `biome.jsonc` (was previously set to `off`) (#233)
- Disable `noImplicitCoercions` (e.g. `!!value`, `+string`) in `biome.jsonc`, and annotate the existing `noExcessiveLinesPerFunction: off` with a reference to the upstream TypeScript issue (microsoft/TypeScript#16655) that motivates it (#247)

## 5.1.8

### Patch Changes

- Add `"kiro"` to the accepted editor-rules values in the CLI router and `initialize.ts` so selecting Kiro via `--rules` no longer fails schema validation
- Fix missing Kiro option

## 5.1.7

### Patch Changes

- Widen ESLint cleanup's package-name detection to match all `@eslint/*` scoped packages (e.g. `@eslint/js`, `@eslint/eslintrc`), not only `@eslint/js` (#248)

## 5.1.6

### Patch Changes

- Disable `noExcessiveLinesPerFunction` and `noSolidDestructuredProps` in `biome.jsonc` — both produced too many false positives across general TS codebases (#246)

## 5.1.5

### Patch Changes

- Update zero-config.tsx

## 5.1.4

### Patch Changes

- Bump trpc-cli from 0.10.0 to 0.10.2 [#238](https://github.com/haydenbleasel/ultracite/pull/238)
- Bump zod from 4.0.5 to 4.0.14 [#239](https://github.com/haydenbleasel/ultracite/pull/239)

## 5.1.3

### Patch Changes

- Upgrade to Biome 2.2.0 [#245](https://github.com/haydenbleasel/ultracite/pull/245)

## 5.1.2

### Patch Changes

- feat: add --skip-install flag to skip installing dependencies [#231](https://github.com/haydenbleasel/ultracite/pull/231)

## 5.1.1

### Patch Changes

- Fix CLI to not prompt for features when other options are provided [#230](https://github.com/haydenbleasel/ultracite/pull/230)

## 5.1.0

### Minor Changes

- 5.1 [#228](https://github.com/haydenbleasel/ultracite/pull/228)
- feat: migrate cli from commander.js to trpc-cli with flag support [#215](https://github.com/haydenbleasel/ultracite/pull/215)
- Fix Bun detection for projects using `bun.lock` lockfile format [#227](https://github.com/haydenbleasel/ultracite/pull/227)
- Update vscode-settings.ts
- Update settings.json

## 5.0.49

### Patch Changes

- Update faq.mdx

## 5.0.48

### Patch Changes

- fix: updating claude desktop mcp file path [#225](https://github.com/haydenbleasel/ultracite/pull/225)

## 5.0.47

### Patch Changes

- Add YAML frontmatter to the generated `.cursor/rules/ultracite.mdc` (description, `globs`, `alwaysApply: true`) and to the generated `.github/copilot-instructions.md` (`applyTo` glob), so Cursor and Copilot scope the rules to JS/TS files instead of treating them as global prose (#221, #222)

## 5.0.46

### Patch Changes

- Update rules.mdx

## 5.0.45

### Patch Changes

- Update global.css

## 5.0.44

### Patch Changes

- Add Kiro IDE support with steering files integration [#220](https://github.com/haydenbleasel/ultracite/pull/220)

## 5.0.43

### Patch Changes

- Update shadcn/ui

## 5.0.42

### Patch Changes

- Fix skip-ci file path

## 5.0.41

### Patch Changes

- Revert "Update vercel.json"

## 5.0.40

### Patch Changes

- Update vercel.json

## 5.0.39

### Patch Changes

- Update route.ts

## 5.0.38

### Patch Changes

- Upgrade Biome version
- Bump deps
- Delete `package-lock.json`

## 5.0.37

### Patch Changes

- Migrate the docs MCP handler from `@vercel/mcp-adapter` to the `mcp-handler` package and move the endpoint from `/api/mcp/http` to `/api/mcp/mcp` to match the new handler's `basePath` convention (#217)

## 5.0.36

### Patch Changes

- Update sidebar.tsx

## 5.0.35

### Patch Changes

- Fix npm peer dependency conflicts when initializing Ultracite in Shadcn projects [#212](https://github.com/haydenbleasel/ultracite/pull/212)

## 5.0.34

### Patch Changes

- Upgrade to Biome 2.1.1 [#209](https://github.com/haydenbleasel/ultracite/pull/209)
- Add option to remove other formatters during init [#198](https://github.com/haydenbleasel/ultracite/pull/198)
- feat: Optimize AI assistant rules with structured markdown format [#183](https://github.com/haydenbleasel/ultracite/pull/183)

## 5.0.33

### Patch Changes

- feat: update filename convention rule to support $ prefix [#206](https://github.com/haydenbleasel/ultracite/pull/206)

## 5.0.32

### Patch Changes

- Bump next from 15.3.1 to 15.3.3 in /docs in the npm_and_yarn group across 1 directory [#204](https://github.com/haydenbleasel/ultracite/pull/204)

## 5.0.31

### Patch Changes

- Add monorepos docs [#201](https://github.com/haydenbleasel/ultracite/pull/201)

## 5.0.30

### Patch Changes

- Zed Settings [#191](https://github.com/haydenbleasel/ultracite/pull/191)

## 5.0.29

### Patch Changes

- Run formatter
- Update `pnpm-lock.yaml`
- Delete `package-lock.json`
- Bump Biome to 2.0.6 in the shipped `biome.jsonc` schema URL, install command, and docs (#195)

## 5.0.28

### Patch Changes

- Bump `@types/node` from 24.0.3 to 24.0.8 [#194](https://github.com/haydenbleasel/ultracite/pull/194)

## 5.0.27

### Patch Changes

- Update tweets.tsx

## 5.0.26

### Patch Changes

- Fix file path quoting for special characters in biome commands [#176](https://github.com/haydenbleasel/ultracite/pull/176)

## 5.0.25

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Create v5 migration guide
- Add ESLint and Prettier migration guides
- Update tweets.tsx
- Create biome migration guide
- Create llms.txt

## 5.0.24

### Patch Changes

- Improve biome update flow to support both `biome.json` and `biome.jsonc` [#185](https://github.com/haydenbleasel/ultracite/pull/185)

## 5.0.23

### Patch Changes

- Update meta.json

## 5.0.22

### Patch Changes

- Add support for lefthook as git hooks manager [#178](https://github.com/haydenbleasel/ultracite/pull/178)

## 5.0.21

### Patch Changes

- Fix Yarn monorepo support by removing invalid -W flag [#180](https://github.com/haydenbleasel/ultracite/pull/180)

## 5.0.20

### Patch Changes

- feat: Add TanStack Router file convention support to `useFilenamingConvention` rule [#174](https://github.com/haydenbleasel/ultracite/pull/174)
- Fix Yarn 4.9.2 compatibility by replacing --save-exact with -E flag [#173](https://github.com/haydenbleasel/ultracite/pull/173)
- fix: replace 'npx biome' with 'npx `@biomejs/biome`' [#170](https://github.com/haydenbleasel/ultracite/pull/170)
- feat: Add "tv" to allowed functions in linter options [#169](https://github.com/haydenbleasel/ultracite/pull/169)
- Update format.ts
- Delete `package-lock.json`
- Update tweets.tsx
- Resolves #167

## 5.0.19

### Patch Changes

- Update tweets.tsx

## 5.0.18

### Patch Changes

- Update rules.mdx

## 5.0.17

### Patch Changes

- feat: Add support for Claude Code and OpenAI Codex AI assistants [#166](https://github.com/haydenbleasel/ultracite/pull/166)

## 5.0.16

### Patch Changes

- Add more unit tests for jsonc files

## 5.0.15

### Patch Changes

- Fix unit tests, handle parsing issues gracefully
- Type parse responses correctly
- Parse all JSON files using jsonc-parser

## 5.0.14

### Patch Changes

- Run formatting
- Parse `biome.json` properly

## 5.0.13

### Patch Changes

- Fix: Add support for comments in VS Code settings.json [#165](https://github.com/haydenbleasel/ultracite/pull/165)

## 5.0.12

### Patch Changes

- Bump Biome to 2.0.5

## 5.0.11

### Patch Changes

- Remove -w flag from bun

## 5.0.10

### Patch Changes

- Update installer.tsx

## 5.0.9

### Patch Changes

- Update tweets.tsx

## 5.0.8

### Patch Changes

- Update package-manager.ts

## 5.0.7

### Patch Changes

- Update ultracite.mdc

## 5.0.6

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Run Ultracite

## 5.0.5

### Patch Changes

- Misc design fixes

## 5.0.4

### Patch Changes

- Drop schema rewrite (breaks types)

## 5.0.3

### Patch Changes

- Create dependabot.yml

## 5.0.2

### Patch Changes

- Update README.md

## 5.0.1

### Patch Changes

- Add support for installing in monorepos

## 5.0.0

### Major Changes

- Ultracite v5 [#162](https://github.com/haydenbleasel/ultracite/pull/162)
- Update `package.json`
- Update README.md

## 4.2.13

### Patch Changes

- Accept optional positional file arguments on `ultracite lint` and `ultracite format`, forwarding them to `npx biome check`/`biome check --write` instead of always targeting `./`

## 4.2.12

### Patch Changes

- Pin the Biome version installed by Ultracite's CLI and shown in the setup docs to `@biomejs/biome@1.9.4` — Biome 2.x had just released with breaking config changes that Ultracite's config doesn't yet support

## 4.2.11

### Patch Changes

- Feature/mobile menu [#161](https://github.com/haydenbleasel/ultracite/pull/161)

## 4.2.10

### Patch Changes

- Create opengraph-image.jpg

## 4.2.9

### Patch Changes

- New landing page [#160](https://github.com/haydenbleasel/ultracite/pull/160)

## 4.2.8

### Patch Changes

- Bump Commander

## 4.2.7

### Patch Changes

- Correct the `license` field in `package.json`

## 4.2.6

### Patch Changes

- Update bug_report.md

## 4.2.5

### Patch Changes

- Update OG image
- Fix opengraph metadata

## 4.2.4

### Patch Changes

- Update index.mdx

## 4.2.3

### Patch Changes

- Update goals.mdx

## 4.2.2

### Patch Changes

- New website [#158](https://github.com/haydenbleasel/ultracite/pull/158)

## 4.2.1

### Patch Changes

- Bump next from 15.2.3 to 15.2.4 in /website [#155](https://github.com/haydenbleasel/ultracite/pull/155)

## 4.2.0

### Minor Changes

- Bump next from 15.1.2 to 15.2.3 in /website [#154](https://github.com/haydenbleasel/ultracite/pull/154)

## 4.1.21

### Patch Changes

- Update action on save config [#153](https://github.com/haydenbleasel/ultracite/pull/153)

## 4.1.20

### Patch Changes

- Revert "Add support for init in monorepos"

## 4.1.19

### Patch Changes

- Add support for init in monorepos

## 4.1.18

### Patch Changes

- Add basic init command

## 4.1.17

### Patch Changes

- Update README.md

## 4.1.16

### Patch Changes

- Update README.md

## 4.1.15

### Patch Changes

- Hardcode the CLI's name/description in Commander instead of importing them from `package.json` via an import assertion — the assertion syntax was tripping up older Node versions consumers were running Ultracite on (#148)
- Bump next from 15.0.4 to 15.1.2 in /website [#149](https://github.com/haydenbleasel/ultracite/pull/149)

## 4.1.14

### Patch Changes

- Update README.md

## 4.1.13

### Patch Changes

- Remove the shipped `files.ignore: ["**/components/ui/**"]` block from `biome.json` — ignoring shadcn/ui components by default was surprising consumers who wanted Ultracite to run on every file in their project (#147)
- Bump nanoid from 3.3.7 to 3.3.8 in /website [#146](https://github.com/haydenbleasel/ultracite/pull/146)

## 4.1.12

### Patch Changes

- Replace the single-action `scripts/run.js` CLI with a Commander-based `scripts/run.mjs` that exposes `lint` and `format` subcommands (wrapping `biome check` and `biome check --write`), and add `commander` as a runtime dependency
- Update tailwind.css

## 4.1.11

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Update files
- Cleanup website deps

## 4.1.10

### Patch Changes

- Update octokit.ts

## 4.1.9

### Patch Changes

- Sync the shipped `biome.json` with the ruleset used by next-forge: turn off `noNodejsModules`, `noCommonJs`, `noSecrets`, `useConsistentCurlyBraces`, `noNamespaceImport`, `useNamingConvention`, `noArrayIndexKey`, `noBarrelFile`, and `noReExportAll`; configure `useSortedClasses` with `className`/`clsx`/`cva`/`tw`/`twMerge`/`cn`/`twJoin` recognition and a safe auto-fix

## 4.1.8

### Patch Changes

- Update push.yaml
- Bump cross-spawn from 7.0.3 to 7.0.6 in /website [#145](https://github.com/haydenbleasel/ultracite/pull/145)

## 4.1.7

### Patch Changes

- Update README.md
- Ship a `bin` entry (`ultracite` → `scripts/run.js`) with a minimal CLI that runs `npx biome check --write ./`, so users can invoke `npx ultracite` instead of calling Biome directly (#130)

## 4.1.6

### Patch Changes

- Bump deps
- Update `biome.json`
- Update `pnpm-lock.yaml`
- Bump micromatch from 4.0.7 to 4.0.8 in /website [#144](https://github.com/haydenbleasel/ultracite/pull/144)

## 4.1.5

### Patch Changes

- Bump biome

## 4.1.4

### Patch Changes

- Disable `useExplicitFunctionReturnType` and `useComponentExportOnlyModules` in the shipped `biome.json`; both were firing on too much valid TS/React code to be defaults (#142, #143)

## 4.1.3

### Patch Changes

- Update Biome
- Update `biome.json`

## 4.1.2

### Patch Changes

- Bump deps

## 4.1.1

### Patch Changes

- Update website

## 4.1.0

### Minor Changes

- Biome 1.9.0 [#141](https://github.com/haydenbleasel/ultracite/pull/141)

## 4.0.6

### Patch Changes

- Update tailwind.css

## 4.0.5

### Patch Changes

- Update README.md

## 4.0.4

### Patch Changes

- Update README.md

## 4.0.3

### Patch Changes

- Update README.md

## 4.0.2

### Patch Changes

- Disable `useExplicitLengthCheck`

## 4.0.1

### Patch Changes

- Disable `useSimplifiedLogicExpression`

## 4.0.0

### Major Changes

- Switch from ESLint, Prettier and Stylelint to Biome [#140](https://github.com/haydenbleasel/ultracite/pull/140)

## 3.9.11

### Patch Changes

- Fix website lockfile
- Turn off `github/unescaped-html-literal` and `unicorn/prefer-dom-node-dataset` — both conflicted with other rules in the config

## 3.9.10

### Patch Changes

- Ignore .next and .turbo folders by default
- Ignore dist and build folders by default

## 3.9.9

### Patch Changes

- Update settings.json
- Bump website deps
- Remove `useAsync` from exhaustive deps

## 3.9.8

### Patch Changes

- Update README.md

## 3.9.7

### Patch Changes

- Update inspector
- Rewrite the ESLint core rules config to extend `@eslint/js`'s `configs.all.rules` and override only a handful of rules (`id-length`, `max-*`, `no-ternary`, `prefer-destructuring`, `sort-imports`, etc.) instead of hand-listing every rule

## 3.9.6

### Patch Changes

- Update next.config.mjs

## 3.9.5

### Patch Changes

- Add Inspector to website

## 3.9.4

### Patch Changes

- Update README.md

## 3.9.3

### Patch Changes

- Update README.md

## 3.9.2

### Patch Changes

- Correct the `main` field in `package.json` so Ultracite resolves to the bundled ESLint config entrypoint

## 3.9.1

### Patch Changes

- Update README.md

## 3.9.0

### Minor Changes

- Add `@tanstack/eslint-plugin-query` [#137](https://github.com/haydenbleasel/ultracite/pull/137)

## 3.8.6

### Patch Changes

- Disable `unicorn/no-array-callback-reference`

## 3.8.5

### Patch Changes

- Disable `sonarjs/elseif-without-else`

## 3.8.4

### Patch Changes

- Revert `eslint-plugin-unused-imports` to ESLint 8 compatible version

## 3.8.3

### Patch Changes

- Swap no-undef-init for `unicorn/no-null`

## 3.8.2

### Patch Changes

- Disable `no-undef-init` (interferes with `unicorn/no-null`

## 3.8.1

### Patch Changes

- Add documentation on monorepos

## 3.8.0

### Minor Changes

- Add `eslint-plugin-github` [#136](https://github.com/haydenbleasel/ultracite/pull/136)

## 3.7.4

### Patch Changes

- Update unicorn's preventAbbreviations allowList for Next.js

## 3.7.3

### Patch Changes

- Fix release pagination

## 3.7.2

### Patch Changes

- Disable `unicorn/no-keyword-prefix` for React className

## 3.7.1

### Patch Changes

- Update README.md

## 3.7.0

### Minor Changes

- Add `eslint-plugin-unicorn` [#135](https://github.com/haydenbleasel/ultracite/pull/135)

## 3.6.2

### Patch Changes

- Add styles for GitHub Markdown alerts

## 3.6.1

### Patch Changes

- Improve page design

## 3.6.0

### Minor Changes

- Add `eslint-plugin-compat` [#134](https://github.com/haydenbleasel/ultracite/pull/134)

## 3.5.2

### Patch Changes

- Update README.md

## 3.5.1

### Patch Changes

- Update README.md
- Update settings.json
- Add React / React DOM devDeps
- Bump deps

## 3.5.0

### Minor Changes

- Add `eslint-plugin-html` [#133](https://github.com/haydenbleasel/ultracite/pull/133)

## 3.4.2

### Patch Changes

- Misc fix

## 3.4.1

### Patch Changes

- Bundle release notes on website on the same day

## 3.4.0

### Minor Changes

- Add SonarJS plugin [#132](https://github.com/haydenbleasel/ultracite/pull/132)
- Upgrade GitHub Actions workflow

## 3.3.7

### Patch Changes

- Update README.md

## 3.3.6

### Patch Changes

- Create apple-icon.png

## 3.3.5

### Patch Changes

- Add better feature definitions to README

## 3.3.4

### Patch Changes

- Update README.md

## 3.3.3

### Patch Changes

- Add an `exports` map to `package.json` so consumers can import `ultracite` (ESLint), `ultracite/prettier`, and `ultracite/stylelint` as separate entrypoints

## 3.3.2

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Document the file-based setup (`eslint.config.mjs`, `prettier.config.mjs`, `stylelint.config.mjs` with `export { default } from 'ultracite/...'`) and drop the old `package.json`-embedded `prettier`/`stylelint` keys
- Rename `prettier.js` / `stylelint.js` to `prettier.config.mjs` / `stylelint.config.mjs` and convert them from `module.exports =` to ESM `export default`

## 3.3.1

### Patch Changes

- Add `prettier.js`/`stylelint.js` to the tsup entry list and disable code splitting so each config bundles as a single output file

## 3.3.0

### Minor Changes

- Bundle [#131](https://github.com/haydenbleasel/ultracite/pull/131)

## 3.2.5

### Patch Changes

- Add Vercel Analytics to site

## 3.2.4

### Patch Changes

- Remove logo from readme

## 3.2.3

### Patch Changes

- Fix baseUrl on website

## 3.2.2

### Patch Changes

- Bump the pinned Ultracite version in the website's own `package.json` so the docs build against the current release

## 3.1.12

### Patch Changes

- Rebrand from `eslint-config-harmony` to `ultracite` [#129](https://github.com/haydenbleasel/ultracite/pull/129)
- Update `package.json`

## 3.1.11

### Patch Changes

- Update README.md

## 3.1.10

### Patch Changes

- Update README.md

## 3.1.9

### Patch Changes

- Update README.md

## 3.1.8

### Patch Changes

- Update README.md

## 3.1.7

### Patch Changes

- Create SECURITY.md
- Create license.md

## 3.1.6

### Patch Changes

- Drop `stylelint-config-prettier` and the `prettier/prettier` rule — Stylelint 15 stopped bundling conflicting formatting rules, so the Prettier compatibility shim is no longer needed. Replace the removed `declaration-block-trailing-semicolon` with `declaration-property-value-no-unknown`

## 3.1.5

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Remove ESLint 8.53 deprecated rules
- Bump deps
- Update settings.json

## 3.1.4

### Patch Changes

- Temporarily disable eslint-config-tailwindcss

## 3.1.3

### Patch Changes

- Bump deps

## 3.1.2

### Patch Changes

- Update README.md

## 3.1.1

### Patch Changes

- Update tailwindcss.mjs

## 3.1.0

### Minor Changes

- Add support for Tailwind rules [#127](https://github.com/haydenbleasel/ultracite/pull/127)

## 3.0.9

### Patch Changes

- Allow the single-letter identifiers `x`, `y`, `z` through ESLint's `id-length` rule, for code working with geometry/coordinate systems

## 3.0.8

### Patch Changes

- Bump deps

## 3.0.7

### Patch Changes

- Set `settings.react.version = 'detect'` in `eslint.config.mjs` so `eslint-plugin-react` auto-detects the consumer's installed React version

## 3.0.6

### Patch Changes

- Update README.md

## 3.0.5

### Patch Changes

- Update README.md
- Bump `@babel/traverse` from 7.23.0 to 7.23.2 [#126](https://github.com/haydenbleasel/ultracite/pull/126)

## 3.0.4

### Patch Changes

- Switch `@typescript-eslint/eslint-plugin` imports from namespace (`import * as typescript`) to default imports to match the plugin's ESM export shape
- Bump deps

## 3.0.3

### Patch Changes

- Switch from Yarn to pnpm, upgrade workflow

## 3.0.2

### Patch Changes

- Update eslint.config.mjs

## 3.0.1

### Patch Changes

- Update eslint.config.mjs

## 3.0.0

### Major Changes

- V3 [#125](https://github.com/haydenbleasel/ultracite/pull/125)
- Update push.yaml
- Create FUNDING.yml
- Bump postcss from 8.4.24 to 8.4.31 [#124](https://github.com/haydenbleasel/ultracite/pull/124)

## 2.5.3

### Patch Changes

- Automatically remove unused imports

## 2.5.2

### Patch Changes

- Configure `jsx-a11y/label-has-associated-control` to recognize custom component names (`Label`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`) with a depth of 3; the rule previously only matched native HTML elements

## 2.5.1

### Patch Changes

- Update README.md

## 2.5.0

### Minor Changes

- Add Storybook [#123](https://github.com/haydenbleasel/ultracite/pull/123)
- Bump word-wrap from 1.2.3 to 1.2.4 in /website [#122](https://github.com/haydenbleasel/ultracite/pull/122)
- Bump semver from 6.3.0 to 6.3.1 in /website [#121](https://github.com/haydenbleasel/ultracite/pull/121)
- Bump semver from 6.3.0 to 6.3.1 [#120](https://github.com/haydenbleasel/ultracite/pull/120)

## 2.4.6

### Patch Changes

- Bump `eslint-plugin-prettier` to `5.0.0-alpha.2` to pick up `synckit` support and restore compatibility with newer Prettier / ESLint flat configs

## 2.4.5

### Patch Changes

- Bump deps
- Bump stylelint from 15.8.0 to 15.10.1 [#119](https://github.com/haydenbleasel/ultracite/pull/119)
- Bump stylelint from 15.8.0 to 15.10.1 in /website [#118](https://github.com/haydenbleasel/ultracite/pull/118)

## 2.4.4

### Patch Changes

- Fix layout bug

## 2.4.3

### Patch Changes

- Fix up images and responsive layout

## 2.4.2

### Patch Changes

- Create favicon.ico

## 2.4.1

### Patch Changes

- Fix footer issue

## 2.4.0

### Minor Changes

- Enhance website, general updates [#116](https://github.com/haydenbleasel/ultracite/pull/116)

## 2.3.1

### Patch Changes

- Disable the `@typescript-eslint/*` stylistic/formatting rules (`block-spacing`, `brace-style`, `comma-dangle`, `indent`, `key-spacing`, `keyword-spacing`, `member-delimiter-style`, `quotes`, `semi`, `space-*`, `type-annotation-spacing`, etc.) that conflict with Prettier's formatting output

## 2.3.0

### Minor Changes

- Migrate to opt-in config [#115](https://github.com/haydenbleasel/ultracite/pull/115)

## 2.2.8

### Patch Changes

- Update README.md

## 2.2.7

### Patch Changes

- Remove AudioWorkletGlobalScope

## 2.2.6

### Patch Changes

- Attempt to patch AudioWorkletGlobalScope issue

## 2.2.5

### Patch Changes

- Create website [#114](https://github.com/haydenbleasel/ultracite/pull/114)

## 2.2.4

### Patch Changes

- Add Typescript import resolver

## 2.2.3

### Patch Changes

- Re-enable `eslint-plugin-import` and set `parserOptions.ecmaVersion = 'latest'` / `sourceType = 'module'` on the flat config so import rules parse modern ESM syntax correctly

## 2.2.2

### Patch Changes

- Register `.ts` and `.tsx` extensions with `import/parsers.espree` in the ESLint config so `eslint-plugin-import` parses TypeScript files through espree (workaround for import-js/eslint-plugin-import#2556)

## 2.1.3

### Patch Changes

- Bump version
- Re-enable `eslint-plugin-import` throughout the flat config (was commented out awaiting upstream fixes) and move the `AudioWorkletGlobalScope` globals patch up to a top-level `globals.browser` adjustment
- Disable ESLint's core `sort-imports` (eslint/eslint#11542) and configure `import/order` with explicit group ordering `builtin → external → internal → parent → sibling → index → object → type`

## 2.1.2

### Patch Changes

- Re-enable sorted imports

## 2.0.12

### Patch Changes

- Split the Yarn install step out of the `auto shipit` release step in the push workflow so dependencies install as a distinct, cacheable job step

## 2.0.11

### Patch Changes

- Update push.yaml
- Bump deps
- Delete dependabot.yaml
- Patch AudioWorkletGlobalScope issue
- Bump `@typescript-eslint/parser` from 5.50.0 to 5.57.0 [#112](https://github.com/haydenbleasel/ultracite/pull/112)
- Bump prettier-plugin-tailwindcss from 0.2.2 to 0.2.6 [#111](https://github.com/haydenbleasel/ultracite/pull/111)
- Bump `@next/eslint-plugin-next` from 13.1.6 to 13.2.4 [#110](https://github.com/haydenbleasel/ultracite/pull/110)
- Bump eslint from 8.33.0 to 8.37.0 [#109](https://github.com/haydenbleasel/ultracite/pull/109)
- Bump prettier from 2.8.3 to 2.8.7 [#108](https://github.com/haydenbleasel/ultracite/pull/108)
- Bump jest from 29.4.1 to 29.5.0 [#105](https://github.com/haydenbleasel/ultracite/pull/105)
- Bump stylelint-config-prettier from 9.0.4 to 9.0.5 [#101](https://github.com/haydenbleasel/ultracite/pull/101)
- Bump stylelint-prettier from 2.0.0 to 3.0.0 [#94](https://github.com/haydenbleasel/ultracite/pull/94)

## 2.0.10

### Patch Changes

- Add FAQ

## 2.0.9

### Patch Changes

- Add Cypress support
- Bump `@typescript-eslint/parser` from 5.48.1 to 5.50.0 [#88](https://github.com/haydenbleasel/ultracite/pull/88)
- Bump jest from 29.3.1 to 29.4.1 [#86](https://github.com/haydenbleasel/ultracite/pull/86)
- Bump eslint-plugin-react from 7.32.0 to 7.32.2 [#87](https://github.com/haydenbleasel/ultracite/pull/87)
- Bump eslint-plugin-import from 2.27.4 to 2.27.5 [#89](https://github.com/haydenbleasel/ultracite/pull/89)
- Bump `@next/eslint-plugin-next` from 13.1.2 to 13.1.6 [#90](https://github.com/haydenbleasel/ultracite/pull/90)
- Bump typescript from 4.9.4 to 4.9.5 [#91](https://github.com/haydenbleasel/ultracite/pull/91)
- Bump `@typescript-eslint/eslint-plugin` from 5.48.1 to 5.50.0 [#92](https://github.com/haydenbleasel/ultracite/pull/92)
- Bump prettier-plugin-tailwindcss from 0.2.1 to 0.2.2 [#93](https://github.com/haydenbleasel/ultracite/pull/93)
- Bump eslint from 8.31.0 to 8.33.0 [#85](https://github.com/haydenbleasel/ultracite/pull/85)

## 2.0.8

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Fix typo

## 2.0.7

### Patch Changes

- Fix typo

## 2.0.6

### Patch Changes

- Temporarily disable eslint-plugin-import

## 2.0.5

### Patch Changes

- Bump deps

## 2.0.4

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Add import/resolver settings

## 2.0.3

### Patch Changes

- Update README.md

## 2.0.2

### Patch Changes

- Update `package.json`

## 1.1.10

### Patch Changes

- V2 [#83](https://github.com/haydenbleasel/ultracite/pull/83)
- Fix typo
- Ensure package is public
- Remove tsup, fix typo
- Bump json5 from 1.0.1 to 1.0.2 [#84](https://github.com/haydenbleasel/ultracite/pull/84)
- Bump `@typescript-eslint/eslint-plugin` from 5.42.1 to 5.47.1 [#79](https://github.com/haydenbleasel/ultracite/pull/79)
- Bump eslint-plugin-react from 7.31.10 to 7.31.11 [#69](https://github.com/haydenbleasel/ultracite/pull/69)
- Bump eslint-plugin-jest from 27.1.5 to 27.2.0 [#73](https://github.com/haydenbleasel/ultracite/pull/73)
- Bump eslint from 8.27.0 to 8.31.0 [#74](https://github.com/haydenbleasel/ultracite/pull/74)
- Bump prettier from 2.7.1 to 2.8.1 [#75](https://github.com/haydenbleasel/ultracite/pull/75)
- Bump `@next/eslint-plugin-next` from 13.0.3 to 13.1.1 [#76](https://github.com/haydenbleasel/ultracite/pull/76)
- Bump prettier-plugin-tailwindcss from 0.1.13 to 0.2.1 [#77](https://github.com/haydenbleasel/ultracite/pull/77)
- Bump stylelint from 14.14.1 to 14.16.1 [#78](https://github.com/haydenbleasel/ultracite/pull/78)
- Bump `@typescript-eslint/parser` from 5.42.1 to 5.47.1 [#80](https://github.com/haydenbleasel/ultracite/pull/80)
- Bump eslint-plugin-n from 15.5.1 to 15.6.0 [#81](https://github.com/haydenbleasel/ultracite/pull/81)
- Bump typescript from 4.8.4 to 4.9.4 [#82](https://github.com/haydenbleasel/ultracite/pull/82)

## 1.1.9

### Patch Changes

- Allow finally in promises

## 1.1.8

### Patch Changes

- Turn off `n/no-missing-import` and `n/file-extension-in-import` — both fire constantly in TypeScript projects where imports resolve through the TS path map rather than literal file paths

## 1.1.7

### Patch Changes

- Update the ESLint `plugins` array from `'node'` to `'n'` to match the plugin rename from `eslint-plugin-node` to `eslint-plugin-n`

## 1.1.6

### Patch Changes

- Replace eslint-plugin-node with eslint-plugin-n

## 1.1.5

### Patch Changes

- Set `parserOptions.ecmaVersion = 'latest'` in the ESLint config so the parser accepts modern ES syntax

## 1.1.4

### Patch Changes

- Register `node` in the ESLint `plugins` array — the `n/*` rules defined in the config had no plugin declaration to bind to

## 1.1.3

### Patch Changes

- Bump deps, disable `promise/no-native`
- Bump `@typescript-eslint/parser` from 5.42.0 to 5.42.1 [#60](https://github.com/haydenbleasel/ultracite/pull/60)
- Bump stylelint-config-standard from 26.0.0 to 29.0.0 [#61](https://github.com/haydenbleasel/ultracite/pull/61)

## 1.1.2

### Patch Changes

- Add missing jest deps

## 1.0.32

### Patch Changes

- Update description, bump minor version
- Add eslint-plugin-node
- Add eslint-plugin-promise
- Fix devDeps -> peerDeps
- Bump `@typescript-eslint/eslint-plugin` from 5.36.1 to 5.42.1 [#62](https://github.com/haydenbleasel/ultracite/pull/62)
- Bump stylelint-config-idiomatic-order from 8.1.0 to 9.0.0 [#45](https://github.com/haydenbleasel/ultracite/pull/45)
- Bump typescript from 4.8.2 to 4.8.4 [#46](https://github.com/haydenbleasel/ultracite/pull/46)
- Bump stylelint-config-standard from 26.0.0 to 28.0.0 [#50](https://github.com/haydenbleasel/ultracite/pull/50)
- Bump eslint-plugin-jest from 27.0.1 to 27.1.3 [#53](https://github.com/haydenbleasel/ultracite/pull/53)
- Bump `@typescript-eslint/parser` from 5.36.1 to 5.42.0 [#55](https://github.com/haydenbleasel/ultracite/pull/55)
- Bump eslint from 8.23.0 to 8.26.0 [#56](https://github.com/haydenbleasel/ultracite/pull/56)
- Bump `@next/eslint-plugin-next` from 12.2.5 to 13.0.1 [#57](https://github.com/haydenbleasel/ultracite/pull/57)
- Bump eslint-plugin-react from 7.31.1 to 7.31.10 [#58](https://github.com/haydenbleasel/ultracite/pull/58)
- Bump stylelint from 14.11.0 to 14.14.0 [#59](https://github.com/haydenbleasel/ultracite/pull/59)

## 1.0.31

### Patch Changes

- Fix typo

## 1.0.30

### Patch Changes

- Add jest install to docs

## 1.0.29

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Fix prefix for jest rules

## 1.0.28

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Fix typo

## 1.0.27

### Patch Changes

- Bump runner to Node 16
- Add core Jest support
- Bump `@next/eslint-plugin-next` from 12.2.3 to 12.2.5 [#36](https://github.com/haydenbleasel/ultracite/pull/36)
- Bump eslint from 8.21.0 to 8.23.0 [#37](https://github.com/haydenbleasel/ultracite/pull/37)
- Bump `@typescript-eslint/parser` from 5.31.0 to 5.36.1 [#38](https://github.com/haydenbleasel/ultracite/pull/38)
- Bump stylelint from 14.9.1 to 14.11.0 [#39](https://github.com/haydenbleasel/ultracite/pull/39)
- Bump `@typescript-eslint/eslint-plugin` from 5.31.0 to 5.36.1 [#40](https://github.com/haydenbleasel/ultracite/pull/40)
- Bump typescript from 4.7.4 to 4.8.2 [#41](https://github.com/haydenbleasel/ultracite/pull/41)
- Bump eslint-plugin-react from 7.30.1 to 7.31.1 [#42](https://github.com/haydenbleasel/ultracite/pull/42)
- Bump `@typescript-eslint/eslint-plugin` from 5.30.0 to 5.31.0 [#29](https://github.com/haydenbleasel/ultracite/pull/29)
- Bump eslint from 8.18.0 to 8.21.0 [#30](https://github.com/haydenbleasel/ultracite/pull/30)
- Bump eslint-plugin-jsx-a11y from 6.6.0 to 6.6.1 [#31](https://github.com/haydenbleasel/ultracite/pull/31)
- Bump `@next/eslint-plugin-next` from 12.2.0 to 12.2.3 [#32](https://github.com/haydenbleasel/ultracite/pull/32)
- Bump prettier-plugin-tailwindcss from 0.1.11 to 0.1.13 [#33](https://github.com/haydenbleasel/ultracite/pull/33)
- Bump `@typescript-eslint/parser` from 5.30.0 to 5.31.0 [#34](https://github.com/haydenbleasel/ultracite/pull/34)

## 1.0.26

### Patch Changes

- Update README.md

## 1.0.25

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Comment out `@next/next/no-assign-module-variable` in the Next preset; the rule had been deprecated and was failing with an unknown-rule error

## 1.0.24

### Patch Changes

- Bump deps
- Update eslint-next.js

## 1.0.23

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Add react-native plugin dependency

## 1.0.22

### Patch Changes

- Split the ESLint config into `eslint.js` (core), `eslint-next.js` (Next.js-specific `@next/next/*` rules, extending core), and `eslint-expo.js` (React Native rules + `react-native` plugin, extending core) so consumers extend only what they need

## 1.0.21

### Patch Changes

- Switch the `stylelint` entry in `package.json` from a bare string (`./stylelint.js`) to Stylelint's object form (`{ extends: "./stylelint.js" }`) so Stylelint actually picks up the shared config
- Bump `@typescript-eslint/parser` from 5.22.0 to 5.27.0 [#24](https://github.com/haydenbleasel/ultracite/pull/24)
- Bump typescript from 4.6.4 to 4.7.2 [#28](https://github.com/haydenbleasel/ultracite/pull/28)
- Bump prettier-plugin-tailwindcss from 0.1.10 to 0.1.11 [#27](https://github.com/haydenbleasel/ultracite/pull/27)
- Bump eslint from 8.15.0 to 8.16.0 [#26](https://github.com/haydenbleasel/ultracite/pull/26)
- Bump eslint-plugin-react from 7.29.4 to 7.30.0 [#25](https://github.com/haydenbleasel/ultracite/pull/25)
- Bump stylelint from 14.8.2 to 14.8.5 [#23](https://github.com/haydenbleasel/ultracite/pull/23)
- Bump `@typescript-eslint/eslint-plugin` from 5.22.0 to 5.27.0 [#22](https://github.com/haydenbleasel/ultracite/pull/22)

## 1.0.20

### Patch Changes

- Allow HTTP header literals to break naming convention [#21](https://github.com/haydenbleasel/ultracite/pull/21)

## 1.0.19

### Patch Changes

- Merge branch 'main' of https://github.com/haydenbleasel/ultracite
- Use `next/core-web-vitals` instead of custom config
- Revert "Attempt fixing Next format"

## 1.0.18

### Patch Changes

- Attempt to register the Next.js ESLint plugin under the short `next/*` prefix instead of `@next/next/*` (reverted in v1.0.19 in favor of `next/core-web-vitals`)

## 1.0.17

### Patch Changes

- Remove extended Next configs, fix duplicate rules

## 1.0.16

### Patch Changes

- Fix package lockfile
- Drop `@next/next/no-assign-module-variable` and `@next/next/no-before-interactive-script-outside-document` from the Next preset; add `@next/next/link-passhref` and `@next/next/no-script-in-document`
- Bump deps

## 1.0.15

### Patch Changes

- Expand the Next preset with the current Next 12.1 rule set: `inline-script-id`, `next-script-for-ga`, `no-assign-module-variable`, `no-before-interactive-script-outside-document`, `no-duplicate-head`, `no-head-element`, `no-script-component-in-head`, `no-server-import-in-page`
- Bump `@typescript-eslint/parser` from 5.19.0 to 5.21.0 [#17](https://github.com/haydenbleasel/ultracite/pull/17)
- Bump eslint-plugin-import from 2.25.4 to 2.26.0 [#11](https://github.com/haydenbleasel/ultracite/pull/11)
- Bump stylelint from 14.6.1 to 14.8.1 [#12](https://github.com/haydenbleasel/ultracite/pull/12)
- Bump prettier from 2.6.1 to 2.6.2 [#13](https://github.com/haydenbleasel/ultracite/pull/13)
- Bump prettier-plugin-tailwindcss from 0.1.8 to 0.1.10 [#14](https://github.com/haydenbleasel/ultracite/pull/14)
- Bump eslint from 8.12.0 to 8.14.0 [#15](https://github.com/haydenbleasel/ultracite/pull/15)
- Bump eslint-config-next from 12.1.4 to 12.1.5 [#16](https://github.com/haydenbleasel/ultracite/pull/16)
- Bump `@typescript-eslint/eslint-plugin` from 5.17.0 to 5.21.0 [#18](https://github.com/haydenbleasel/ultracite/pull/18)
- Bump eslint-plugin-react-hooks from 4.4.0 to 4.5.0 [#19](https://github.com/haydenbleasel/ultracite/pull/19)
- Bump typescript from 4.6.3 to 4.6.4 [#20](https://github.com/haydenbleasel/ultracite/pull/20)

## 1.0.14

### Patch Changes

- Update README.md
- Remove React dependency
- Bump `@typescript-eslint/parser` from 5.16.0 to 5.19.0 [#10](https://github.com/haydenbleasel/ultracite/pull/10)
- Bump `@typescript-eslint/eslint-plugin` from 5.16.0 to 5.17.0 [#6](https://github.com/haydenbleasel/ultracite/pull/6)
- Bump stylelint from 14.6.0 to 14.6.1 [#7](https://github.com/haydenbleasel/ultracite/pull/7)
- Bump eslint-plugin-react-hooks from 4.3.0 to 4.4.0 [#8](https://github.com/haydenbleasel/ultracite/pull/8)
- Bump prettier from 2.6.0 to 2.6.1 [#2](https://github.com/haydenbleasel/ultracite/pull/2)
- Bump eslint from 8.11.0 to 8.12.0 [#3](https://github.com/haydenbleasel/ultracite/pull/3)
- Bump eslint-config-next from 12.1.0 to 12.1.4 [#9](https://github.com/haydenbleasel/ultracite/pull/9)
- Bump minimist from 1.2.5 to 1.2.6 [#1](https://github.com/haydenbleasel/ultracite/pull/1)

## 1.0.13

### Patch Changes

- Update README.md

## 1.0.12

### Patch Changes

- Add Typescript to peerDeps
- Fix devDeps, peerDeps, file formatting and installation

## 1.0.11

### Patch Changes

- Move files to root folder

## 1.0.10

### Patch Changes

- Update README.md

## 1.0.9

### Patch Changes

- Document that consumers need to set `parserOptions.project = './tsconfig.json'` alongside the Harmony `extends`, so type-aware TypeScript rules resolve correctly

## 1.0.8

### Patch Changes

- Add snake_case support for APIs, disable misused-promises error

## 1.0.7

### Patch Changes

- Add publishConfig

## 1.0.6

### Patch Changes

- Add VS Code extensions

## 1.0.5

### Patch Changes

- Temporarily document the configs with explicit `./node_modules/@haydenbleasel/harmony/src/<name>.js` paths in place of the short `@haydenbleasel/harmony/<name>` package-import form, as a workaround until the `exports` map resolved correctly in all tools

## 1.0.4

### Patch Changes

- Prefix the `exports` keys in `package.json` with `./` (`./eslint`, `./prettier`, `./stylelint`) so Node resolves `@haydenbleasel/harmony/eslint` etc. correctly

## 1.0.3

### Patch Changes

- Remove index file, expose multiple exports

## 1.0.2

### Patch Changes

- Run auto init, generate labels

## 1.0.1

### Patch Changes

- Fix deploy script
- Fix release
- Add Dependabot and Release config, update package name
- Eat own dogfood
- Improve README
- Create VSCode settings file
- Update description
- Create README.md
- Create Stylelint configuration
- Create Prettier configuration
- Create ESLint configuration
- Initial commit
