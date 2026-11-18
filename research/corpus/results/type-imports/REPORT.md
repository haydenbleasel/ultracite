# Type imports: measurement report

This is the data behind the post on type-only imports. It was measured on 2026-11-17 and 2026-11-18 with the scripts in §9. The generated tables are in `tables.md`. The machine-readable results are:

- `rules.json`: what Ultracite's presets set for every type-import rule, per linter and preset. ESLint is resolved per file type, plus the type-aware, nestjs and angular presets. It also has fix kinds, `biome explain` output, the comments above each setting and the agent prompt's lines. `optionDrift` is empty.
- `census.json`: the inventory, per repo, with source and tests apart.
  - Every import and export declaration, and every imported binding's use and what it is at its source.
  - `import()` types, decorators, and modules imported only for types, with their targets' side effects.
  - Each repo's tsconfig settings and build tool. Rows are in `out/type-imports/census/`.
- `compilers.json`: Hayden's reason for `prefer-top-level`, tested. It records what every installed compiler does with `import { type X }`, `import type { X }` and a mix, with the output run. It also covers every inline-only import in the corpus.
- `linters.json`: each rule and option variant alone in Oxlint, ESLint and Biome, raw and as reported. It also has the typed runs, TypeScript's own errors, every message and help text, and the disagreements.
- `rule-census.json`, `rule-census.md`: the shared Oxlint census with Ultracite's core, react and js-plugins presets.
- `fixes.json`: each linter's fix path on copies of every repo.
  - Lines changed, how imports changed, what's left, and what a second pass changes.
  - What each fixed file loads under nine compilers and modes, runtime cycles, decorator metadata and the type check.
- `fix-bugs.json`: every fixed file a fix broke, the same files fixed with Ultracite's whole preset, and every side-effect import a fix merged.
- `calibration.json`: 41 hand-written cases through every linter configuration and fix pass. Each is compiled six ways by TypeScript and by every per-file compiler, then run.
- `markers.json`: the projects' own settings, tsconfig flags and disable comments, and each build tool checked against its file.
- `history.json`, `history-labels.json`: conversions, config changes and keyword commits, and the hand reading of the 191 keyword commits.
- `sample.json`, `classifications.json`: the hand classification, with both raters.
- `agent-runs.json`: imports in the agent experiment's committed runs.

The subjects are in `corpus/examples/type-imports/`, with their checks in `examples.json`.

Terms:

- **Form** of an import declaration:
  - *value*: no `type` anywhere;
  - *type*: `import type …`;
  - *inline*: every specifier carries `type`, as in `import { type A, type B }`;
  - *mixed*: an inline `type` next to values;
  - *side-effect*: `import 'x'`.
- **Unmarked type-only binding:** an imported binding with no `type` marker whose every reference is a type reference. It's classified exactly as typescript-eslint's `consistent-type-imports` classifies it: a `typeof x` query and a computed key of a type literal count as type references, and `export { x }` keeps the import's kind. This is what the rule reports.
- **Elided** and **kept as written:**
  - A compiler that removes an import whose bindings are only used as types elides it: TypeScript's default, esbuild, Oxc, sucrase and Bun.
  - One that keeps imports as written doesn't: `verbatimModuleSyntax`, Node's type stripping, Oxc's `onlyRemoveTypeImports` and sucrase's `keepUnusedImports`.
- **Corpus, React set, external:**
  - the corpus is the eight repos every topic uses;
  - the React set is the four React codebases from the accessibility post;
  - external is both.
  - Ultracite's CLI is listed apart and never pooled.

## TL;DR

- **Hayden's reason holds, but only where imports are kept as written.**
  - `import { type X } from "./y"` leaves `import {} from "./y"` (or `import "./y"`), and `./y`'s side effect runs, in these setups:
    - under verbatimModuleSyntax in tsc, ts.transpileModule, esbuild and sucrase;
    - under Oxc's `onlyRemoveTypeImports`;
    - always under Node's type stripping.
  - TypeScript's default, esbuild, Oxc, sucrase and Bun drop it entirely. Bun drops it even with verbatimModuleSyntax in its tsconfig.
  - `import type` is dropped by every compiler in every mode.
  - The corpus has 249 inline-only imports, 212 of them in Supabase. The 246 that are the only import of their module become an empty or side-effect import under the keep-as-written modes, and disappear under the others.
- **How real code imports types.** External source has 1,143,356 lines and 42,297 import declarations.
  - **Forms:** value 34,117 (80.7%), `import type` 6,590 (15.6%), mixed 1,179 (2.8%), inline 228 (0.5%), side-effect 183.
  - **Bindings:** 70,642. Used only as types 15,332; used both ways 1,712. Of the marked ones, 9,884 are under `import type` and 1,891 inline.
  - **Unmarked type-only bindings:** 3,572 (31.2 per 10k lines), in three repos only: Supabase 1,557, VS Code 1,092 and React Aria 923. The other nine external repos have none; each enforces a type-import lint rule or verbatimModuleSyntax.
  - **What those bindings are at their source:** 1,625 types, 342 values that are also types (classes, enums), 14 plain values, 1 namespace, and 1,590 unresolved (mostly packages outside the clones).
  - **`import()` types:** 578 (508 with `typeof`), 565 of them in Next.js.
  - **Decorators:** 37, all in VS Code, in 15 files. 53 type references sit where emitDecoratorMetadata would serialise them, but no corpus repo has both decorators and that flag.
- **What the rules report** (external source, raw):
  - consistent-type-imports: 2,930 in ESLint, 2,929 in Oxlint (7th of the 1,242 rules Ultracite's Oxlint presets enable). That's 1,432 "all imports … only used as types", 920 "some", and 578 `import()` annotations.
  - prefer-top-level: 1,834 in ESLint, 1,891 in Oxlint. The opposite style, prefer-inline, would report 6,336.
  - no-import-type-side-effects: 228. no-duplicates: 584 in ESLint, 218 in Oxlint.
  - Biome's useImportType: 2,706.
  - TypeScript with verbatimModuleSyntax: 1,644 TS1484.
- **Where the implementations disagree:**
  - ESLint and Oxlint flag the same 2,351 declarations; one is ESLint-only.
  - **Biome reports 354 more.** 227 are inline-only imports. 127 are mostly React default and namespace imports used in JSX and in types, because Biome doesn't count JSX as a use of React.
  - **Biome's default style is inline.** For a mixed import its fix writes `import { type A, b }`, which Ultracite's Oxlint and ESLint presets then report.
  - **TypeScript's TS1484 covers 1,069 of the 2,352 declarations.** It doesn't report a class or enum used only as a type, or an import it can't resolve.
- **What the fixes do** (topic rules as Ultracite sets them, on copies):
  - **Oxlint changes 4,250 files:** 2,401 splits, 1,397 conversions, 246 inline-only imports to `import type`, and 197 merges.
  - **One Oxlint pass doesn't settle the imports in 95 files.** Its no-duplicates merge writes inline `type` specifiers, which prefer-top-level splits again.
  - **What Oxlint leaves:** 766 consistent-type-imports reports. 708 are `import()` annotations, which have no fix; 58 need another pass. Also 126 prefer-top-level, 59 no-duplicates and 48 no-duplicate-imports.
  - **ESLint and Biome settle their imports.** Their second-pass changes are formatter re-wraps only.
  - **Under each repo's own settings, no conversion changes which modules load,** because those builds already elide type-only imports. The exceptions are the fix bugs below.
  - **Where imports are kept as written,** the same Oxlint fix stops 1,664 imports loading in 1,042 files: Supabase 1,019 in 787 files, VS Code 519 in 157. It also removes runtime import cycles: VS Code 9 → 0 components, Supabase 11 → 8, Excalidraw 7 → 6.
- **Fixes that break code, with Ultracite's whole preset:**
  - **Fix composition, in both Oxlint 1.90.0 and ESLint** (typescript-eslint 8.72.1 with import-x 4.17.1). Take `import { A } from "./m"; import { b, c } from "./m"`, where A is a type and b and c are values.
    - consistent-type-imports' fix and no-duplicates' fix don't overlap, so both linters apply both in one pass, and the result is `import type { A, b, c } from "./m"`. Either fix alone is right.
    - With the whole preset, Oxlint breaks 4 React Aria files (`useCalendarState`, `parseColor`, …), which then call functions that no longer load (TS1361).
  - **ESLint (import-x 4.17.1)** also merges a mixed import into a neighbouring `import type`. The result is `import type { …, isObject, type DefaultErrorShape }`, which TypeScript rejects (TS2206) and Oxc refuses to compile.
    - Topic rules alone: 33 files.
    - Whole ESLint preset: 12 files (tRPC 3, React Aria 4, Supabase 4, Next.js 1). 7 have a value made type-only and 8 have the TS2206 form.
  - **Oxlint's prefer-top-level split copies import attributes onto the new `import type`.** That happens to 6 Next.js imports with `with { 'turbopack-transition': … }`; TypeScript rejects them (TS2857, TS1463).
  - **Evaluation order (Oxlint and ESLint):** no-duplicates merges a side-effect import into a value import of the same module. The merged import isn't a side-effect import any more, so the import sorter moves it.
    - Next.js's `next dev` imports `../server/lib/cpu-profile` first so the CPU profiler starts before anything else loads. After `ultracite fix` it's the 24th of 31 imports (Oxlint) or the 27th of 32 (ESLint).
    - `next start`, `next analyze` and the middleware template's `server/web/globals` move the same way.
    - Biome keeps side-effect imports where they are.
  - **Biome:** 140 files where React is used only by JSX become `import type React` or `import type * as React`.
    - 126 compile with the automatic runtime (`react-jsx`) and are fine.
    - tRPC's 2 compile with the classic runtime (`jsx: "react"`), so the output calls `React.createElement` with React no longer imported.
    - React Aria's 11 (`jsx: "preserve"`) and Radix's 1 depend on a bundler setting outside the tsconfig.
- **Decorator metadata:** with emitDecoratorMetadata on, a converted injected class gets `design:paramtypes` of `[Function]` from tsc and `[Object]` from ts.transpileModule. The calibration's DI container then fails to resolve the parameter. esbuild never emits the metadata. No corpus repo is exposed: VS Code has decorators but not the flag.
- **Node's type stripping** (24.14.1, on by default):
  - A type imported without `type` is a SyntaxError ("does not provide an export named").
  - `import { type X }` keeps the module loading.
  - Enums, namespaces with values, parameter properties and `import x = require()` are rejected outright.
  - `export { LocalInterface }` is a SyntaxError.
- **History** (21,927 commits read): 1,368 conversions to `import type`. 76.5% of them are in 9 mass commits that came with a rule or flag going on or with import sorting. 8,840 imports were added already typed, and 217 type imports went back to value imports. Of the 191 keyword commits, 5 are bugs.
- **Policy:**
  - No disable comment in any repo names these rules.
  - Next.js, Vite and Excalidraw turn `disallowTypeAnnotations` off.
  - shadcn's ESLint config asks for inline type specifiers.
  - Hono's Oxlint config sets `prefer-top-level`, as Ultracite does.
- **Agents** (288 committed runs, 144 per agent):
  - 30 runs added 34 imports (29 value, 5 `import type`), none with an unmarked type-only binding.
  - No prompt or retry named a type-import rule.
- **Notes for Hayden:** see §7.
- **Subjects** (§10):
  - **A:** Next.js `flushTelemetry`, an `import()` type that converts cleanly.
  - **B:** tRPC `TRPCClientError`. Two rules pull a mixed import apart and back; one value import plus one `import type` satisfies both.
  - **C:** Next.js `normalizeLocalePath`. An `import()` type on a lazy `require`, which a static import would load in every app.

## 1. Tools and configuration

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | v24.14.1 (type stripping on by default) | system |
| Bun | 1.4.4 | system |
| TypeScript 7 (bundled with Bun, run by `bun check`) | 7.0.2 | system |
| Oxlint | 1.90.0 | root `node_modules` |
| oxlint-tsgolint | 7.0.2005 | `packages/cli` |
| Oxfmt | 0.75.0 | root `node_modules` |
| ESLint | 10.14.0 | `packages/cli` |
| @typescript-eslint/parser, eslint-plugin | 8.72.1 | `packages/cli` |
| eslint-plugin-import-x | 4.17.1 | `packages/cli` |
| eslint-plugin-unused-imports | 4.4.1 | `packages/cli` |
| TypeScript | 6.0.3 | `packages/cli` |
| @biomejs/biome | 2.6.4 | `packages/cli` |
| Prettier | 3.9.10 | `packages/cli` |
| esbuild | 0.28.1 | the Bun store (a docs-site dependency) |
| rolldown (its Oxc transformer) | 1.2.13 | the Bun store |
| sucrase | 3.35.1 | the Bun store |
| git | 2.54.0 | history clones, read-only, `GIT_NO_LAZY_FETCH=1` |
| gh | as installed | read-only issue searches |

Not run:
- swc (not installed);
- Babel's TypeScript plugin (`@babel/core` 7.29.6 is in the Bun store without it);
- TypeScript 7's emit (no `tsgo` or `@typescript/native-preview`; Bun's TypeScript 7 only type-checks);
- ts-rust and scriptc: not run (not installed; see the bibliography).

Nothing was installed, downloaded or run from any clone.

- **Oxlint:**
  - Each rule runs alone: every category off, the typescript and import plugins on, `--disable-nested-config`. It runs on mirrors both with disable directives neutralised and as written.
  - `consistent-type-exports` runs with `--type-aware` and a generated tsconfig.
  - Calibration, the subjects and the whole-preset reruns use the root config `ultracite init` writes.
- **ESLint:**
  - The real rules run in the census's own `Linter` pass, with Ultracite's options (checked against the resolved preset by `type-imports-rules.cjs`).
  - Typed runs pass the census's TypeScript program through `parserOptions.programs`.
- **Biome:** each rule runs alone (`recommended: false`). Calibration and the subjects also run the core preset.
- **Copies:** all under `$TYPE_IMPORTS_TMP`.

## 2. Corpus

| Repo | Set | SHA | Source files | Source lines | Imports | Test files | Effective tsconfig flags (source) | Build |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| zod | corpus | `284243fb0d` | 125 | 37,903 | 348 | 198 | isolatedModules, emitDecoratorMetadata, experimentalDecorators | zshy (TypeScript's API) |
| hono | corpus | `f78a245abc` | 187 | 25,540 | 503 | 124 | none of them | `vp pack` (Vite+, rolldown with Oxc) |
| trpc | corpus | `796700d865` | 176 | 25,948 | 718 | 314 | none (`jsx: "react"`) | tsdown (rolldown with Oxc) |
| vite | corpus | `3b72997d42` | 124 | 45,885 | 1,196 | 89 | none | rolldown (Oxc) |
| astro | corpus | `9050e3819c` | 635 | 82,969 | 3,124 | 568 | verbatimModuleSyntax | esbuild (astro-scripts build), then `tsc -b` for declarations |
| excalidraw | corpus | `4c00f31ddc` | 444 | 128,127 | 3,155 | 107 | none (isolatedModules at the root) | esbuild; Vite for the app |
| next.js | corpus | `d8bfc3c994` | 1,416 | 276,128 | 7,015 | 154 | verbatimModuleSyntax | taskr with SWC |
| vscode | corpus | `959031245e` | 226 | 71,809 | 1,454 | 0 | experimentalDecorators; isolatedModules: false | gulp (TypeScript program); esbuild for watch |
| shadcn | React set | `c2477f311c` | 165 | 18,473 | 636 | 0 | isolatedModules | Next.js (SWC) |
| radix | React set | `eb3a2b7091` | 160 | 25,594 | 457 | 46 | (base outside the clone) | radix-build (outside the clone) |
| react-aria | React set | `8e76acfbc6` | 71 | 22,407 | 910 | 86 | isolatedModules | Parcel (SWC) |
| supabase | React set | `09f80f528e` | 2,759 | 382,573 | 22,781 | 458 | (base outside the clone) | Next.js (SWC); Vite |
| ultracite | dogfood | `60a164713b` | 56 | 19,253 | 413 | 52 | isolatedModules | Bun.build |

- **Flags** come from each file's nearest tsconfig.json and its `extends` chain. Radix's and Supabase's base configs are workspace packages outside their sparse clones, so their flags are unknown. Next.js requires isolatedModules for apps, which covers Supabase Studio and shadcn's app.
- **Builds** are read from each repo's package.json scripts at the pinned commit (`type-imports-markers.cjs` checks each evidence string). Every build but zod's and VS Code's compiles TypeScript one file at a time.

## 3. Method

### 3.1 The inventory (`type-imports-census.cjs`, `type-imports-lib.cjs`)

One ESLint `Linter` pass per file, with the TypeScript parser and its scope analysis, records:

- **Every import declaration:** its form, clause and attributes. For each binding, every reference, classified with typescript-eslint 8.72.1's own logic (`onlyHasTypeReferences`, copied with its reasons kept): value, type, `typeof`, type key, export or other.
  - JSX counts as a value use of `React`, as typescript-eslint's default `jsxPragma` makes it.
  - It also records type references where `emitDecoratorMetadata` serialises them. Only bare type references count, since TypeScript serialises a union with `undefined` as `Object` under strictNullChecks (calibration c07).
- **Other forms:** `import x = require()`, `import()` types (with `typeof`), dynamic `import()`, `require()`, decorators, enums and namespaces.
- **Exports:** `export … from` and its kind, `export *`, `export * as`, `export type *`, local `export { x }` lists, and exported type declarations.
- **The real rules in the same pass:** consistent-type-imports (default and `fixStyle: "inline-type-imports"`), no-import-type-side-effects, import-x's consistent-type-specifier-style (both styles) and no-duplicates (default and `prefer-inline`).
- **Check:** on every TypeScript file of every repo, consistent-type-imports reports exactly the declarations the inventory predicts. That's 2,409 declarations, with no mismatch in either direction.

One TypeScript program per repo adds three things:
- each specifier's target;
- each binding's symbol at its source;
- for local targets, their top-level code: statements, declarations whose evaluation runs code (a call or `new` outside a function, a decorated class, a static block), side-effect imports, or none.

### 3.2 The linters (`type-imports-linters.cjs`)

- Every diagnostic is joined to its declaration. For no-duplicates the unit is the module, since the linters report different declarations of it.
- Declarations one implementation reports and the other doesn't are given a shape from the inventory.
- TypeScript's errors come from the census program with verbatimModuleSyntax on (TS1484) and with isolatedModules on (TS1205). Each repo's share of resolved imports is recorded too.

### 3.3 The compilers (`type-imports-compilers.cjs`)

- **The cases:** `calibration/type-imports/compilers/y.ts` records that it evaluated. Eight entry files import from it: inline-only, two inline, `import type`, mixed, the split form, a type imported without `type`, an unused value, and a hand-written `import {}`.
- **The runs:** each compiler and mode compiles them. The output is classified by what it does with `./y.js`, then run in a fresh Node process. Bundles are classified by whether y's code is in them.
- **`--corpus`:** compiles every inline-only import's file with each per-file compiler in both modes.

### 3.4 The fixes (`type-imports-fixes.cjs`, `type-imports-fix-bugs.cjs`)

Each path runs on two copies of every repo: one only formatted (the baseline), and one fixed and then formatted.
- **Oxlint:** `--fix`, then Oxfmt with sortImports.
- **ESLint:** `verifyAndFix` (ten passes, as `eslint --fix`), then Prettier.
- **Biome:** `check --write` with organizeImports and the formatter.

The rules are the topic's, set as Ultracite sets them. For every changed file the script records:
- the import declarations before and after;
- the rules' reports after one pass, and what a second pass changes (imports, whitespace or other code);
- the module specifiers the original and fixed files load under nine compilers and modes;
- runtime cycles per compiler (strongly connected components of what each output loads);
- `design:*` metadata compiled with emitDecoratorMetadata;
- TypeScript's diagnostics.

`type-imports-fix-bugs.cjs` then finds every fixed file a fix broke:
- a value made type-only (TS1361). For a React import used only by JSX, it compiles the file with its own tsconfig's `jsx` to see whether React is still called;
- an inline `type` inside `import type` (TS2206);
- a file that no longer parses;
- every side-effect import merged into another import of its module, with where it moved.

It then refixes those files from the original with Ultracite's whole preset for that linter, the way `ultracite fix` runs (core, plus react for `.tsx`, then the formatter).

### 3.5 Calibration, policy, history, hand classification and agents

- **Calibration** (`type-imports-calibration.cjs`): 41 cases in `calibration/type-imports/cases/`.
  - They import modules in `lib/` that each record their evaluation: a class, an interface, enums, namespaces, a default-exported class, a module that registers a global, a module augmentation with a prototype method, and a small DI container that reads `design:paramtypes`.
  - Each case runs through every linter configuration and fix pass. It's then compiled by the TypeScript program in six modes (default, isolatedModules, verbatimModuleSyntax, experimentalDecorators, decoratorMetadata, decoratorMetadata with verbatim) and by every per-file compiler, and run in Node.
- **Policy** (`type-imports-markers.cjs`): the lint configs and tsconfigs at each pinned commit. It records the lines naming these rules and flags, the commit that added each line, and disable comments.
- **History** (`type-imports-history.cjs`):
  - `--churn` reads every mainline commit's import lines: conversions, back to value, inline and top-level, and mass conversions (20+ conversions or 10+ files).
  - `--adoption` runs `git log -S` on config files for each flag and rule.
  - `--keywords` collects commits mentioning type imports, read by hand into `history-labels.json`.
  - Next.js and VS Code are read over a three-year window.
- **Hand classification** (`type-imports-sample.cjs`, seed 20261117): 80 reported source declarations in eight strata.
  - Rater 1 is a subagent that saw the automatic facts. Rater 2 is a separate subagent that labelled 32 items blind (the code, the repo's settings and each fix's output).
  - Shares are weighted by stratum population.
- **Agents** (`type-imports-agent-runs.cjs`): every committed run, comparing the subject as handed over with the final file and each attempt.

## 4. Results

### 4.1 What Ultracite turns on

| Rule | Oxlint | ESLint | Biome |
| --- | --- | --- | --- |
| consistent-type-imports | core `"error"`, with defaults: `prefer: "type-imports"`, `fixStyle: "separate-type-imports"`, `disallowTypeAnnotations: true`. Fix: conditional. | core: every non-deprecated typescript-eslint rule at its defaults; fixable | `useImportType`, core `"error"`, style `"auto"`; safe fix |
| off in nestjs and angular | `"off"`: "The autofix turns the import of an injected class into `import type`. Constructor injection needs the class at runtime (`emitDecoratorMetadata` records it as the parameter's type), so the fix compiles and then fails to resolve the dependency." | `"off"`, the same reason, plus "typescript-eslint only holds back when it can see `emitDecoratorMetadata`, which takes type information." | `useImportType` `"off"` |
| consistent-type-exports | core `"error"`, type-aware (runs only with `options.typeAware`) | type-aware preset only | `useExportType`, core `"error"`; safe fix |
| no-import-type-side-effects | core `"error"`; fixable | core | (useImportType reports inline-only imports) |
| consistent-type-specifier-style | core `["error", "prefer-top-level"]`; conditional fix | `import-x/…` `["error", "prefer-top-level"]` | – (useImportType's `style`) |
| no-duplicates | `import/no-duplicates`, core `"error"`; conditional fix | `import-x/no-duplicates`, core | – (organizeImports merges) |
| no-duplicate-imports | core `["error", { allowSeparateTypeImports: true }]`; fix pending | core, same options | – |
| unused imports | `no-unused-vars` (its fix is dangerous, so `--fix` doesn't apply it) | `unused-imports/no-unused-imports` (fixable) | `noUnusedImports` with `fix: "safe"` |
| import order | Oxfmt `sortImports` | `import-x/order` | organizeImports `"on"` |

- **No preset sets** Biome's `jsxRuntime`, or `emitDecoratorMetadata` / `experimentalDecorators` in ESLint's parserOptions.
- **What agents are told:** the prompt says "Make the minimal change that resolves each issue. For a style rule, keep runtime behavior the same.", and "If a fix would change behavior and it isn't clear that's intended, leave the issue for review and say why." It forbids suppression comments. Neither the AGENTS.md template nor the skill's code standards mentions type imports.

### 4.2 How real code imports types

External source, 1,143,356 lines.

- **Declarations:** 42,297 (370 per 10k lines).
  - Forms: value 34,117, `import type` 6,590, mixed 1,179, inline 228, side-effect 183.
  - Clauses: named 38,678, default 2,418, namespace 814, default+named 203. No `import x = require()` anywhere.
- **Bindings:** 70,642.
  - Used only as values 53,515, only as types 15,332, both 1,712, re-exported 72, unused 11.
  - Of the bindings marked `type`, 9,884 are under `import type` and 1,891 inline. Where code marks types, five in six marks are top-level.
- **Unmarked type-only bindings: 3,572** (31.2 per 10k), in 2,352 declarations.

  | Repo | Unmarked type-only bindings | Per 10k lines | What enforces type imports |
  | --- | ---: | ---: | --- |
  | supabase | 1,557 | 40.7 | nothing |
  | vscode | 1,092 | 152.1 | nothing (isolatedModules off) |
  | react-aria | 923 | 411.9 | nothing |
  | the other nine | 0 | 0 | a lint rule (Hono, tRPC, Vite, Astro, Excalidraw, shadcn, Radix, Next.js), verbatimModuleSyntax (Next.js, Astro), Biome's recommended set (zod) |

  At their source those bindings are 1,625 types, 342 values that are also types, 14 plain values, 1 namespace, and 1,590 unresolved (React Aria's and Supabase's package imports).
- **Tests:** 9,756 declarations in 516,920 lines, with 62 unmarked type-only bindings, all in Supabase.
- **`import()` types:** 578, 508 of them with `typeof`. Next.js has 565, mostly typing a lazy `require()`, as in `require('./x') as typeof import('./x')`.
- **Exports:**
  - 5,716 exported type declarations.
  - 841 `export … from` (223 of them `export type … from`, 32 with an inline `type`).
  - 303 `export *` (23 `export type *`) and 64 `export * as`.
  - 101 local export lists that name a type, 5 of them without `type`.
- **Modules imported only for types** (counted per file and module): 5,976 are already marked and 1,397 aren't. The unmarked ones break down as:
  - 667 local targets with no top-level code;
  - 192 whose declarations run code at load;
  - 25 with top-level statements;
  - 102 unresolved local paths;
  - 411 packages outside the clones.

  All 1,397 are in VS Code, React Aria and Supabase, whose builds elide them, so none of those modules loads from these imports today.
- **Decorators:** 37, all in VS Code (its service-identifier decorators on constructor parameters), in 15 files, with 53 type references in metadata positions. VS Code sets experimentalDecorators but not emitDecoratorMetadata. zod sets both flags and has no decorators.
- **Ultracite's CLI:** 413 declarations (320 value, 93 `import type`), with no unmarked type-only binding and no inline `type`.

### 4.3 What the rules report

External source, each rule alone, raw. No directive names these rules, so raw equals reported.

| Rule | Oxlint | ESLint | Biome | Per 10k |
| --- | ---: | ---: | ---: | ---: |
| consistent-type-imports: "All imports in the declaration are only used as types. Use `import type`." | 1,424 | 1,432 | 1,760 (useImportType "All these imports …") | 12.5 |
| consistent-type-imports: "Imports … are only used as type." | 927 | 920 | 946 ("Some named imports …", "The default import …") | 8.1 |
| consistent-type-imports: "`import()` type annotations are forbidden." | 578 | 578 | – | 5.1 |
| no-import-type-side-effects | 228 | 228 | (inside useImportType's "all") | 2.0 |
| consistent-type-specifier-style `prefer-top-level` | 1,891 | 1,834 | 1,976 (`separatedType`, a different scope) | 16.5 |
| … `prefer-inline` (not Ultracite's) | 6,336 | 6,336 | 6,336 (`inlineType`) | 55.4 |
| no-duplicates | 218 | 584 | – | 1.9 / 5.1 |
| no-duplicates `prefer-inline` (not Ultracite's) | 906 | 2,017 | – | |
| consistent-type-exports (typed) | 28 (type-aware) | 29 | 7 (useExportType) | 0.3 |
| TypeScript TS1484 (verbatimModuleSyntax on) | | | | 1,644 errors: VS Code 600, React Aria 318, Supabase 726 |
| TypeScript TS1205 (isolatedModules on) | | | | 0 |

- **In Ultracite's Oxlint presets** (the shared census, core + react + js-plugins), ranked among 1,242 enabled rules:
  - consistent-type-imports 2,929 (7th);
  - consistent-type-specifier-style 1,891 (14th);
  - no-duplicate-imports 330 (73rd);
  - no-import-type-side-effects 228 (92nd);
  - import/no-duplicates 218 (94th);
  - consistent-type-exports 0 (it needs `--type-aware`).
- **Messages and help text** (what the agent handoff carries; Oxlint's help in brackets):
  - "All imports in the declaration are only used as types. Use `import type`." [help: "Replace the `import` declaration with `import type`. …"; note: "Using `import type` for type-only imports helps with tree-shaking, makes it clear that these imports don't affect runtime code, …"]
  - "Imports X are only used as type." [help: "Mark all type-only imports with the type specifier"]
  - "`import()` type annotations are forbidden." [help: "Replace `import()` type annotations with a regular type import. For example, change `type T = import('module').Type` to `import type { Type } from 'module'; type T = Type`."]
  - "TypeScript will only remove the inline type specifiers which will leave behind a side effect import at runtime." [help: "Convert this to a top-level type qualifier to properly remove the entire import."]
  - "Prefer using a top-level type-only import instead of inline type specifiers." [help: "Replace inline type specifiers with a top‐level import type statement."]
  - Oxlint's no-duplicates: "Module '…' is imported more than once in this file", or "Modules should not be imported multiple times in the same file" [help: "Merge these imports into a single import statement"]. import-x's: "'…' imported multiple times."
  - Biome: "All these imports are only used as types." and "Some named imports are only used as types." Its help is "Importing the types with import type ensures that they are removed by the compilers and avoids loading unnecessary modules."

### 4.4 Where the implementations disagree

Declarations, external source, raw.

| Pair | Both | Only first | Only second | Why |
| --- | ---: | ---: | ---: | --- |
| ESLint vs Oxlint consistent-type-imports | 2,351 | 1 | 0 | one Supabase default import used only as a type |
| ESLint vs Biome | 2,352 | 0 | 354 | Biome also reports inline-only imports (227), and 127 imports used in JSX and in types, mostly React default (54) and namespace (65) imports. Biome doesn't count JSX as a use of React (`jsxRuntime` defaults to `"transparent"`). |
| ESLint typed vs untyped | 2,352 | 0 | 0 | no corpus file has decorators under emitDecoratorMetadata, the only case the typed rule treats differently |
| `import()` types, ESLint vs Oxlint | 577 | 0 | 0 | |
| no-import-type-side-effects | 228 | 0 | 0 | |
| prefer-top-level, ESLint vs Oxlint | 1,407 | 0 | 0 | the same declarations |
| no-duplicates (modules), ESLint vs Oxlint | 211 | 0 | 6 | Oxlint also reports a mixed import next to a value import |
| consistent-type-exports, ESLint vs Oxlint (both typed) | 28 | 1 | 0 | |
| consistent-type-exports vs Biome useExportType | 4 | 25 | 3 | Biome can't see that `export * from './types'` re-exports only types |
| consistent-type-imports vs TS1484 | 1,069 | 1,283 | 0 | TypeScript doesn't report a class or enum used only as a type, or an import it can't resolve |

What consistent-type-exports reports is mostly `export *` from a module that exports only types, which its fix turns into `export type *`. TS1205 reports none: that form is valid under isolatedModules.

### 4.5 Compilers and `import { type X }`

Hayden's reason for `prefer-top-level`, verbatim (17 Nov 2026): "at the time, `import { type x }` when TS compiles turns into `import { }` leaving a potential side effect import or at the very least a waste of a line. `import type` was removed entirely during compilation. not sure if that's still the case, especially with all the different typescript compilers out there now (ts-rust, ts7 in go, scriptc, bun build --compile) but at the time there was a solid reason."

What each compiler does with the import of `./y.js`, which has a top-level side effect:

| Compiler, mode | `import { type X }` | `import type { X }` | mix (`{ type X, value }`) | hand-written `import {}` |
| --- | --- | --- | --- | --- |
| tsc 6, default or isolatedModules | dropped; y doesn't run | dropped | kept | dropped |
| tsc 6, verbatimModuleSyntax | `import {} from`; **y runs** | dropped | kept | kept |
| tsc 6, importsNotUsedAsValues "preserve" / preserveValueImports | TS5102 ("Option … has been removed"); emits as the default | | | |
| ts.transpileModule | as tsc | dropped | kept | as tsc |
| esbuild, default / verbatimModuleSyntax | dropped / `import {} from`, y runs | dropped | kept | dropped / kept |
| Oxc (rolldown), default / onlyRemoveTypeImports | dropped / `import "./y.js"`, y runs | dropped | kept | `import "./y.js"` in both |
| sucrase, default / keepUnusedImports | dropped / `import {} from`, y runs | dropped | kept | dropped / kept |
| Bun (`Bun.Transpiler`, `bun build`, `bun file.ts`), verbatimModuleSyntax off or on | dropped | dropped | kept | `import "./y.js"`, y runs |
| Node 24.14.1, `node file.ts` and `stripTypeScriptTypes` | `import {} from`; **y runs** | dropped | kept | kept |
| Node, `--experimental-transform-types` | `import "./y.js"`, y runs | dropped | kept | kept |
| esbuild bundle, default / verbatimModuleSyntax | y not bundled / bundled, runs | not bundled | bundled | not bundled / bundled |
| rolldown bundle, default / onlyRemoveTypeImports | not bundled / bundled, runs | not bundled | bundled | bundled |
| `bun build` bundle | not bundled | not bundled | bundled | bundled |
| TypeScript 7.0.2 (`bun check`) | type-checks only; reports what tsc 6 reports | | | |

- **The claim holds where imports are kept as written** and fails where they're elided. TypeScript's default, esbuild, Oxc, sucrase and Bun drop an inline-only import completely, and Bun ignores verbatimModuleSyntax here. `import type` disappears everywhere, which is the other half of the reason.
- **A type imported without any marker** is the bigger hazard under keep-as-written compilers:
  - tsc and TypeScript 7 report TS1484;
  - the output throws "SyntaxError: The requested module './y.js' does not provide an export named 'X'" in Node;
  - rolldown's bundler fails with `[MISSING_EXPORT]`.

  Where imports are elided, it compiles to nothing.
- **"At the time":** TypeScript 4.x isn't installed, so the behaviour then isn't measured here. TypeScript 6.0 rejects the two options that used to keep imports (TS5102).
- **In the corpus:** 249 inline-only imports (228 in source, 21 in tests): Supabase 212, Excalidraw 16, shadcn 10, tRPC 7, Vite 4.
  - The 246 that are the only import of their module become `import {} from` under ts.transpileModule, esbuild and sucrase in keep mode and under Node's stripping, and `import "…"` under Oxc's onlyRemoveTypeImports.
  - Every one disappears under the default modes and under Bun.
  - None of these repos sets verbatimModuleSyntax. Next.js, which does, has none (its ESLint config turns no-import-type-side-effects on).

### 4.6 What the fixes do

External repos; changed files include source and tests.

| | Oxlint | ESLint | Biome |
| --- | ---: | ---: | ---: |
| Files changed | 4,250 | 2,532 | 4,376 |
| Lines, against the formatted baseline | +7,446 −8,147 | +8,114 −9,088 | +22,764 −25,105 (organizeImports reorders) |
| Split into a value and a type declaration | 2,401 | 2,435 | 37 |
| Converted to `import type` | 1,397 | 1,429 | 1,513 |
| Inline-only → `import type` | 246 | 246 | 246 |
| Inline `type` added (Biome's style) | – | – | 909 |
| Merged | 197 | 204 | 193 |
| Changed again by a second pass | 176: imports 95, whitespace 80, other 1 | 77: whitespace (Prettier re-wraps) | 76: whitespace 74, other 2 |
| Left after one pass | consistent-type-imports 766 (708 `import()` annotations, 58 needing another pass), prefer-top-level 126, no-duplicates 59, no-duplicate-imports 48, no-import-type-side-effects 9 | consistent-type-imports 708 (`import()` annotations), no-duplicates 6, no-duplicate-imports 3 | none |
| Reports the fix created | no-duplicate-imports 23, prefer-top-level 19, no-duplicates 19, no-import-type-side-effects 5 | no-duplicate-imports 2 | none |

- **Oxlint's one pass doesn't settle the imports** in 95 files. Oxlint applies the fixes that don't overlap and leaves the rest, and its no-duplicates fix merges with inline `type` specifiers, which prefer-top-level splits again. `ultracite fix --claude` runs one pass before handing the rest to an agent.
- **Biome's fix writes the style Ultracite's other presets reject.** With useImportType's default `style: "auto"`, a mixed import becomes `import { type A, b }` (909 imports), and Oxlint's and ESLint's prefer-top-level then report each one.
- **Duplicates:** files with two same-kind declarations of one module fall from 198 to 74 (Oxlint), 180 to 22 (ESLint) and 199 to 49 (Biome).
- **The type check:** apart from §4.7's bugs, the fixes add no TypeScript error. TS2307 rises because a split of an unresolved import reports the module twice; it's kept apart in the tables.

### 4.7 What the fixes change at runtime

What the changed files load, Oxlint path, external repos (ESLint's and Biome's are in `tables.md`):

| Compiler, mode | Files whose loads change | Specifiers no longer loaded | Side-effect imports gone / new |
| --- | ---: | ---: | ---: |
| tsc (each repo's own program) | 4 | 4 | 4 / 0 |
| ts.transpileModule with repo flags; esbuild, Oxc and Bun default | 4 | 4 | 4 / 0 |
| ts.transpileModule, verbatimModuleSyntax; esbuild verbatim; Oxc onlyRemoveTypeImports; Node's stripping | 1,042 | 1,664 | 250 / 6 |

- **Under each repo's own build, conversions change nothing.**
  - The 4 files are React Aria's fix-composition bug.
  - The 4 side-effect imports are Next.js's merges (below): the module still loads, but no longer first.
  - Every other conversion removes an import the build already removed.
- **Where imports are kept as written,** the fixes stop 1,664 imports loading: Supabase 1,019 in 787 files, VS Code 519 in 157, React Aria 92 in 65, Excalidraw 15, shadcn 10, tRPC 5, Vite 4.
  - 250 inline-only imports stop running their module's side effects.
  - 6 new side-effect imports appear in Supabase, where Oxlint's merge writes inline-only imports.
  - Under that model the fixes only remove runtime cycle edges: VS Code's 9 cycle components (69 files) all go, Supabase's fall from 11 (30 files) to 8 (20), Excalidraw's from 7 (180) to 6 (171).
- **Decorator metadata:** compiled with emitDecoratorMetadata on, 15 decorated VS Code files change in 5 metadata slots. VS Code doesn't set the flag, so nothing changes in its build.
- **Fixes that break files** (`fix-bugs.json`, files, external):

  | Path | Topic rules | Ultracite's whole preset | What breaks |
  | --- | ---: | ---: | --- |
  | Oxlint | 4 (React Aria) | 4 | `import type { CalendarSelectionMode, CalendarState, useCalendarState } from "react-stately/useCalendarState"` |
  | ESLint | 33: tRPC 9, Supabase 10, Next.js 7, React Aria 5, Astro 1, Radix 1 | 12: React Aria 4, tRPC 3, Supabase 4, Next.js 1. 7 have a value made type-only; 8 have `import type { …, type X }` (TS2206) | `import type { inferClientTypes, …, isObject, type DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import"` |
  | Biome | 142 (140 React used only by JSX; 2 unparsable) | 140 | `import type React from "react"` and `import type * as React` |

  - **Fix composition, in both Oxlint and ESLint.** `import { A } from "./m"; import { b, c } from "./m";`, with A a type, becomes `import type { A, b, c } from "./m"`.
    - It happens with consistent-type-imports and no-duplicates in one pass, and with Ultracite's whole preset (calibration c40). The two fixes touch different ranges, so both linters apply both.
    - Either fix alone is right.
    - oxc-project/oxc#28068 (open) reports the same combination with no-import-type-side-effects. No upstream report for the ESLint pair was found.
  - **ESLint's import-x no-duplicates** also merges a mixed import into a neighbouring `import type`. The result is TS2206, which Oxc rejects, and TS1361 for the values.
    - un-ts/eslint-plugin-import-x#231 reported this shape and was closed on 2026-10-29 with #548. The installed 4.17.1 still does it.
    - The topic-only path also wrote one Supabase import that doesn't parse (`import pgMeta, type { … }`). With the whole preset it doesn't.
  - **Biome's 140 React files all rest on JSX.** With Biome's default `jsxRuntime`, JSX isn't a use of React.
    - 126 files compile with `react-jsx` (Excalidraw, Next.js, shadcn, Supabase) and are fine.
    - tRPC's 2 (`packages/react-query/src/rsc.tsx` and a test helper) compile with its `jsx: "react"`. The output still calls `React.createElement` and no longer imports React, so rendering throws.
    - React Aria's 11 use `jsx: "preserve"`, so Parcel's setting decides. Radix's 1 has no `jsx` in its clone.
    - Biome documents that the rule only exempts React with `"reactClassic"`.
  - **Two Next.js files fail to parse after the topic-only Biome path** (`export/worker.ts`, `telemetry/detached-flush.ts`). organizeImports moved an import away from the `;` that starts the next statement (`;(async () => …)()`). With Ultracite's whole Biome preset both files parse.
- **Import attributes:** Oxlint's prefer-top-level split copies an import's attributes onto the new `import type`, as in `import type { RouteMatch } from '…' with { 'turbopack-transition': 'next-ssr' }`.
  - This happens in 6 Next.js imports; TypeScript rejects them (TS2857 "Import attributes cannot be used with type-only imports or exports", TS1463).
  - ESLint's import-x drops the attributes from the new declaration.
  - Biome 2.6.4 already reports the original mixed import, `import { type A, b } from "…" with {…}`, as a syntax error ("Import attributes cannot be used with a type-only import."). TypeScript 6.0.3 accepts it (calibration c39). Biome then leaves those files alone. No upstream issue was found.
- **Evaluation order** (Next.js; `fix-bugs.json` `mergedSideEffectImports`):
  - `packages/next/src/cli/next-dev.ts` starts with `import '../server/lib/cpu-profile'` and, on the next line, `import { saveCpuProfile } from '../server/lib/cpu-profile'`. cpu-profile starts the V8 profiler at load when `NEXT_CPU_PROF` is set, which is why it's imported first.
  - no-duplicates (Oxlint's and import-x's) merges the two. The import sorter (Oxfmt's sortImports, import-x/order) then moves the merged import.
  - Where the module now loads:

    | File | Topic rules (Oxlint, with Oxfmt) | Whole preset (Oxlint) | Whole preset (ESLint) |
    | --- | --- | --- | --- |
    | `next-dev.ts` | 1st → 24th of 31 | 24th | 27th of 32 |
    | `next-analyze.ts` | 1st → 10th of 11 | 10th | 3rd |
    | `next-start.ts` | 1st → 5th of 8 | 5th | not merged |
    | middleware template (`server/web/globals`) | 3rd → 5th of 9 | 5th | 6th |

  - Biome keeps side-effect imports where they are.

### 4.8 Runtimes that strip types

Node 24.14.1 strips types by default (`process.features.typescript` is `"strip"`), and `module.stripTypeScriptTypes` gives the same output. On the calibration:

- **A type imported without `type`** (c01, c16, c24): "SyntaxError: The requested module '../lib/types.js' does not provide an export named 'Foo'". A class or enum imported without `type` loads (c02).
- **`import { type X }`** (c22): kept as `import {} from`, and the module evaluates. `import type` is removed.
- **`export { Local }` of a local interface** (c28): "SyntaxError: Export 'Local' is not defined in module". Biome's useExportType reports it, and its fix (`export type { Local, Other }`) runs. Ultracite's Oxlint and ESLint presets don't report it without type information.
- **A type re-exported without `type`** (c18, c19): "does not provide an export named". Every per-file compiler fails the same way, while tsc's program elides it.
- **Rejected outright** in strip mode (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`): enums ("TypeScript enum is not supported in strip-only mode"), namespaces with values, parameter properties, and `import x = require()`. Decorators fail to parse. `--experimental-transform-types` accepts enums, namespaces and parameter properties.
- **Bun** runs TypeScript with its own transpiler, which elides type-only and unused imports whatever the tsconfig says.

### 4.9 Calibration

There are 41 cases; `tables.md` has the full matrices.

- **Reported by consistent-type-imports in all three linters:**
  - an interface (c01), a class (c02), an enum (c08);
  - a namespace used for a type (c12, c13);
  - a default import (c14) and a namespace import (c15);
  - a value used only through `typeof` (c21, c30);
  - a module whose side effect or augmentation the file relies on (c16, c37, c38);
  - constructor injection (c06) and a decorated property (c07).
- **Not reported:** a value use (c03), `instanceof` (c04), `import type` of a value read with `typeof` (c20), unused imports (c27, left to the unused-import rules), `import x = require()` (c25), and re-exports of types (c18, c19) without type information.
- **`import()` types** (c26): Oxlint and ESLint report both annotations; neither has a fix.
- **Decorators** (c06, c35):
  - **ESLint** with `parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true }` reports neither decorated case. typescript-eslint skips imports in a decorated file when both options are set, and it reads them from parserOptions without a program. Oxlint and Biome report both and fix them.
  - **At runtime with emitDecoratorMetadata,** `design:paramtypes` is `[Service]` and the container resolves the parameter. After the fix it's `[Function]` (tsc's program) or `[Object]` (ts.transpileModule), and resolution fails with "cannot resolve a parameter of Consumer". esbuild emits no metadata. Oxc's output needs `@oxc-project/runtime`, which isn't installed.
- **Traps that compile after the fix and run differently,** wherever imports are kept as written:
  - **c37, a class from a module that registers a global:** verbatimModuleSyntax and Node's stripping load the module, so the global is set. After the fix it isn't. Under default elision it never was.
  - **c38, a module augmentation that installs a prototype method:** "hello from service" before, "greet is missing" after.
  - **c16, an interface from that module:** it fails before the fix under keep-as-written compilers (TS1484, "does not provide an export named"). The right form is c17 (`import "../lib/register.js"` plus `import type`); it works under every compiler and no rule reports it.
- **Interplay:**
  - **c23 and c41** (an `import type` next to a mixed import, tRPC's shape):
    - Oxlint's whole preset splits the mixed import and leaves a third declaration that no-duplicates and no-duplicate-imports report.
    - ESLint's whole preset settles on one value import and one `import type`.
    - Biome writes `import { Plugin, type Registry }`, which prefer-top-level reports.
  - **c40** reproduces the fix composition in Oxlint and ESLint: "ReferenceError: Plugin is not defined" under every compiler.
  - **c39** reproduces Oxlint's attribute copy and Biome's syntax error.
- **Gaming moves:**
  - **c31, stacked next-line directives:** each covers only the line below it, so only the last one (Biome's) works.
  - **c36, one `eslint-disable-next-line` naming both spellings:** silences Oxlint. ESLint reports the directive itself ("Definition for rule 'typescript/consistent-type-imports' was not found."), and Biome's directive one line further up doesn't apply.
  - **c32, `import type` plus a duplicate value import:** passes every rule, but loads the module.
  - **c33, a local structural type:** passes every rule and loses the link to the real type.

### 4.10 Policy

Lines at each pinned commit, with the commit that last changed each line.

| Repo | Type-import rules and options | tsconfig flags |
| --- | --- | --- |
| zod | Biome with its recommended set, which includes useImportType; `noUnusedImports` with `fix: "none"` (Zod 4, #4074) | isolatedModules, emitDecoratorMetadata, experimentalDecorators (#4074, 2025-05-19) |
| hono | Oxlint in `vite.config.ts`: consistent-type-imports, consistent-type-specifier-style `prefer-top-level`, no-duplicates (#5518, 2026-10-08; Oxlint replaced ESLint in #5443; the rule first went on in #27, 2022) | – |
| trpc | ESLint consistent-type-imports (on since #5274, 2024-01-07); consistent-type-exports `off` (#6164, 2024-10-30) | – |
| vite | consistent-type-imports `{ prefer: 'type-imports', disallowTypeAnnotations: false }` (on since #5835, 2021-12-19; this line from #16743); import-x/no-duplicates | isolatedDeclarations; the create-vite templates set verbatimModuleSyntax (#19892) |
| astro | Biome useImportType (#11848, 2024-08-27; moved with #12145) and useExportType (#15553, 2026-02-18), organizeImports off; ESLint's `'@typescript-eslint/consistent-type-imports': 'off', // Biome: style.useImportType` | verbatimModuleSyntax (configs/tsconfig.base.json, #16505; first in #6579, 2023-03-20) |
| excalidraw | consistent-type-imports `{ prefer: "type-imports", disallowTypeAnnotations: false, fixStyle: "separate-type-imports" }` (#7992, 2024-05-08) | isolatedModules (2020) |
| next.js | consistent-type-imports `{ disallowTypeAnnotations: false }`, no-import-type-side-effects (lines from #84800, 2025-10-13) | verbatimModuleSyntax (#56551, 2023-10-07, "enable `verbatimModuleSyntax` to make type imports/exports explicit") |
| vscode | `no-duplicate-imports: 'warn'` | experimentalDecorators; isolatedModules false ("because it prevents const enum inlining", per the hand reading) |
| shadcn | consistent-type-imports `{ prefer: "type-imports", fixStyle: "inline-type-imports" }` | isolatedModules |
| radix | Oxlint `typescript/consistent-type-imports: "warn"`; `no-duplicate-imports` warn, off in one override | (base outside the clone) |
| react-aria | – | isolatedModules |
| supabase | – | (base outside the clone) |

- **Disable comments:** none names any of these rules, in any repo.
- **Shared configs:** typescript-eslint ships consistent-type-imports in none of its configs except `all`. Biome's recommended set includes useImportType and useExportType.

### 4.11 History

8 repos and 21,927 commits: the six smaller repos over all the history their clones have, and Next.js and VS Code over the three years to their pinned commits, in the measured scopes.

- **Conversions to `import type`** (or an inline `type` added): 1,368 in total, and 76.5% came in 9 mass commits.
  - tRPC 213 (95% in #5274 "chore: add `consistent-type-(imports|exports)` lint rules", 203 in 74 files).
  - Excalidraw 537 (92%: #7992 "build: enable consistent type imports eslint rule", 437 in 206 files; #9163 "refactor: auto ordered imports", 56).
  - Vite 255 (88%: #5835 "chore: prefer type imports", 194; #23319 "chore: use oxfmt `sortImports`", 30).
  - Astro 188 (60%: #6502 "fix: Enforce the usage of type imports when possible", 62; #6579 "feat(all): Migrate to TypeScript 5.0", 40; #11645, 10).
  - Next.js 115 in the window (13%: #66186 "Bump React types to 19 rc", 15). Its verbatimModuleSyntax switch (#56551) is four days before the window.
  - Hono 50, zod 4, VS Code 6.
- **Once a rule or flag is on, new imports arrive typed:** 8,840 imports were added already typed, against 1,368 conversions. 217 type imports went back to value imports when the code started using the value.
- **Style churn:** 65 inline → top-level, 67 top-level → inline.
- **The 191 keyword commits, read by hand** (one rater):
  - unrelated 134, conversion 21, tooling 20, config 10, bug 5, style 1.
  - For Next.js and VS Code most labels rest on the message and file list, because their clones lack most old blobs.
- **The bugs:**
  - **astro #6650** (a0b6aac2f3, 2023-03-24, "fix(node): Fix http import to not be type-only"): a class extends `IncomingMessage`, so its `import type` had to become a value import. TypeScript catches this kind.
  - **astro #5639** (1ac1ed86e9, 2022-12-19, "Fix client only import with importsNotUsedAsValues error"): a project tsconfig with `importsNotUsedAsValues: "error"` kept `client:only` component imports. Astro forced esbuild's setting to `remove` so browser-only components don't load where they shouldn't.
  - **next.js 41ed440b50:** Turbopack's TypeScript transform gained `verbatimModuleSyntax`. The message reports that, under the classic JSX transform, the transform removed the `React` import before JSX became `React.createElement`, giving a runtime "React was not found". That's the same failure as Biome's fix under tRPC's settings in §4.7.
  - **vscode 995302fd69 ("fix #105345") and bb2e67f6d6 ("fix #105343"):** `node-pty` and `tas-client` load asynchronously, and `import type` guards against a static import. These may be startup-performance fixes rather than import bugs.
- **Other readings worth noting:**
  - zod 847cedf10d (2022-05-22, "Remove type only imports") rewrote inline `type` specifiers as top-level `import type` and pinned TypeScript to 4.1 in the same commit. Inline specifiers need TypeScript 4.5, which is another reason for the top-level form at the time.
  - VS Code turned isolatedModules off in `src/tsconfig.json` because it prevents const enum inlining (2456c4b2f5).
- **Config changes** (`git log -S` on config files) are complete for the six smaller repos. For Next.js and VS Code they're incomplete: their history clones are blob:none, and the search stops at the first missing blob (`history.json` `adoptionComplete`).

### 4.12 Hand classification

There are 80 reported source declarations in eight strata, from a population of 4,530:
- T1 (all bindings type-only, local target with top-level code): 210;
- T0 (all type-only, any other target): 1,213;
- M (some type-only): 911;
- I (`import()` type): 577;
- N (inline-only): 228;
- P (inline `type` next to values): 1,162;
- D (duplicates): 211;
- X (decorator positions): 18.

| Field | Weighted shares (rater 1) | Agreement, blind subset | κ |
| --- | --- | ---: | ---: |
| safe (the fixes change nothing at runtime) | yes 48.3%, n/a 40.7%, depends 8%, no 3% | 24/32 | 0.65 |
| runtimeChange (under the repo's own build) | none 97%, other 1.8%, value made type-only 1.2% | 32/32 | 1 |
| reliesOnEffect | no 100% | 32/32 | (both raters chose "no" for every item, so κ is undefined) |
| readability | better 35.8%, same 35.5%, worse 28.8% | 29/32 | 0.83 |
| rightResponse | keep 38%, convert 37%, split 20.3%, merge 3.6%, other 1.1% | 29/32 | 0.85 |

- **No file needed a target's side effect** from a reported import: every converted import was already elided by its build.
- **Where "depends" comes from:** every T1 item, because those imports would stop loading code where imports are kept as written.
- **Where "no" comes from:** ESLint's merge bugs in D and N (3 and 2 items).
- **What "keep" means:**
  - P: 8 of 8, because moving an inline `type` out of a value import is style only.
  - I: 10 of 12, because most `import()` types sit next to a lazy `require` or dynamic `import()` they describe.
- **Disagreements:** mostly yes/depends on T0 package targets (rater 2 more cautious) and keep/merge on D.

### 4.13 Agents in our own data

- **Runs:** 288 committed (144 per agent), 216 of them with attempts.
- **Imports added:** 30 runs (15 per agent) added 34 import declarations net: 29 value imports and 5 `import type`. 16 were new modules and 18 rewrote an import of a module the file already imported. None has an unmarked type-only binding.
- **The 5 `import type` rewrites** are all import-cycles runs (Claude Code 1, Codex 4). `import { isValidPlacement, type Placement }` became `import type { Placement }`, with the check inlined. That takes the edge out of the runtime cycle.
- **Reports caused:** none of the type-import rules rose in any run. prefer-top-level fell from 8 to 0 (the import-cycles subject). no-duplicates stayed at 16 (ESLint) and 8 (Oxlint) in the react-effects subjects.
- **Retries:** 0 of 336 prompts and 0 of 48 retry prompts listed a type-import rule.

## 5. Findings worth stating carefully

- **The rule is mostly already satisfied.** Nine of twelve external repos have no unmarked type-only import. They got there with a lint rule, verbatimModuleSyntax or Biome's recommended set, mostly in one mass commit, and new imports then arrived typed.
- **Under the build each project actually runs, a conversion changes nothing,** because every build here already drops imports used only as types. The consequences arrive where imports are kept as written: verbatimModuleSyntax, Node's type stripping, Oxc's onlyRemoveTypeImports. There the fix removes runtime imports, and with them runtime cycles and any side effect a file relied on.
- **`prefer-top-level` buys something at runtime only where imports are kept,** and only for inline-only imports, which no-import-type-side-effects already covers. For a mixed import the value keeps the module loading either way, so there the style is consistency.
- **The measured breakage is in composing fixes, not in deciding which bindings are types:**
  - two fixes that are each right, applied in one pass;
  - a side-effect import merged and then sorted out of first place;
  - attributes copied onto a type import;
  - React made type-only under the classic JSX runtime.
- **The decorator trap is real and absent from this corpus.** No measured repo combines decorators with emitDecoratorMetadata. The nestjs and angular exceptions protect code this corpus doesn't contain; the calibration shows the failure they prevent.

## 6. Caveats

- **Snapshot and mix:** HEADs are from 2026-10. Supabase Studio has 54% of the external imports and 44% of the unmarked type-only bindings.
- **Resolution:** packages outside the clones don't resolve. React Aria resolves 38% of its imports and Supabase 72%. So "what a binding is at its source" and TS1484 are lower bounds there, and a package target's side effects are unknown.
- **Build settings** are read from configs, not from running the builds. Radix's and Supabase's base tsconfigs aren't in their clones. SWC (Next.js, Parcel, Supabase) isn't installed; esbuild and Oxc stand in for "a per-file compiler".
- **The fix measurements use the topic's rules,** so the changes can be attributed. The whole-preset reruns cover the broken files and the merged side-effect imports. `ultracite fix` with the whole preset also changes other things in every file.
- **Side effects are read from syntax.** "declarations-run-code" means a top-level call or `new`, not that the call has an observable effect.
- **The keep-as-written numbers are counterfactual** for these repos, whose builds elide imports. They describe what the same code would do under verbatimModuleSyntax or Node's type stripping.
- **The raters are Claude subagents.** Rater 1 saw the automatic facts. History has one rater, and for Next.js and VS Code mostly from messages alone.
- **History clones:** Next.js's and VS Code's are blob:none, so their config-change search is incomplete. VS Code's measured scope yields only 862 commits in the window.
- **Agent runs** come from other topics; none was asked to fix a type import.

## 7. Notes on Ultracite (for Hayden, not fixed)

1. **`ultracite fix` can make values type-only, in Oxlint and in ESLint.** consistent-type-imports and no-duplicates, applied in one pass, write `import type { A, b, c }` from `import { A }` + `import { b, c }` (calibration c40).
   - With the whole preset this breaks 4 React Aria files (Oxlint) and 7 files (ESLint).
   - It's a fix-composition problem upstream. oxc-project/oxc#28068 reports the Oxlint pattern with no-import-type-side-effects; I found no report for the ESLint pair.
2. **ESLint's import-x 4.17.1 writes `import type { A, type B }`,** which TypeScript rejects (TS2206) and Oxc won't compile. That's 8 corpus files with the whole preset (tRPC, Supabase, Next.js). un-ts/eslint-plugin-import-x#231 was closed with #548 after this version, so an import-x bump may fix it.
3. **no-duplicates plus import sorting changes evaluation order.** Merging `import 'x'` into `import { a } from 'x'` lets Oxfmt's sortImports or import-x/order move it. In Next.js's CLI the CPU profiler goes from the first import to the 24th of 31. Biome keeps side-effect imports in place. Neither no-duplicates has an option to leave side-effect imports alone.
4. **Oxlint's prefer-top-level split copies import attributes onto `import type`,** which TypeScript rejects (6 Next.js imports).
5. **Biome's useImportType default `style: "auto"` writes inline `type` specifiers** for mixed imports, which Ultracite's Oxlint and ESLint presets report as prefer-top-level. Setting `"separatedType"` in `biome/core` would match the other two presets.
6. **Biome doesn't count JSX as a use of React.** It converts React imports used only by JSX, 140 files in the corpus. That's harmless with `react-jsx` but breaks the classic runtime: tRPC's packages use `jsx: "react"`, and next.js 41ed440b50 records the same failure in Turbopack. Ultracite's Biome presets don't set `jsxRuntime`; the React preset could set it, or the docs could say.
7. **Biome 2.6.4 reports valid TypeScript as a syntax error:** `import { type A, b } from "x" with {…}` (noTypeOnlyImportAttributes). No upstream issue found.
8. **Oxlint's one fix pass doesn't settle the imports** in 95 files: no-duplicates merges inline, and prefer-top-level splits. `ultracite fix --claude` hands the leftovers to an agent; a second Oxlint pass would clear most of them.
9. **The ESLint nestjs and angular comments** say typescript-eslint "only holds back when it can see `emitDecoratorMetadata`, which takes type information". It also reads `parserOptions.emitDecoratorMetadata` and `experimentalDecorators` without type information: in calibration, both decorated cases go unreported. The conclusion still holds, since Ultracite sets neither option.
10. **Oxlint's no-import-type-side-effects fix becomes a suggestion upstream** (oxc-project/oxc#29491, closed by #29502 on 2026-11-15). After the next Oxlint bump, `ultracite fix` stops converting inline-only imports and agents will see those reports. Worth adding to "Rules waiting on a release".
11. **consistent-type-exports needs type information in both linters,** so Ultracite's default Oxlint setup never runs it. Node's type stripping fails on `export { LocalInterface }` (c28), which only Biome reports by default.
12. **`disallowTypeAnnotations` (on by default) reports 578 `import()` types with no fix.** Next.js, Vite and Excalidraw turn it off. Subject C shows that following the rule's help can change what loads.

## 8. What the subjects need from the experiment

- **Handoff:** what one `ultracite fix` pass with Oxlint leaves (`examples.json` `handoff`):
  - **A:** `typescript/consistent-type-imports` "`import()` type annotations are forbidden." (L61 of the prepared file), plus func-style. ESLint leaves the same; Biome reports nothing for A.
  - **B:** `import/no-duplicates` (L68) and `no-duplicate-imports` (L70) on the second `import type` the fix wrote. Also func-style ×3, no-use-before-define, no-explicit-any ×3 and filename-case. ESLint and Biome leave none of the topic's rules, so B is an Oxlint subject.
  - **C:** `node/global-require`, `unicorn/prefer-module` and `typescript/consistent-type-imports` (`import()` type), all on L67. ESLint leaves the same; Biome nothing.
  - Filter to the topic's rules or accept the extras. C's require rules are part of the trap.
- **A plain value import used only as a type never reaches an agent** in Ultracite's loop unless the fix pass fails to settle: the safe fix converts it first in all three linters. That's why A is an `import()` type, the one form of the rule with no fix.
- **Strip** the header fields listed in `examples.json` `stripFields`.
- **Measure:**
  - the oracle's verdict in each mode (repo, kept, elided), on the agent's file and after the loop's next fix pass;
  - whether the type-import rules still report, and what the edit adds;
  - TS1361 and TS1202 from tsc, which flag the broken variants;
  - what was left for review, and why.
- **The oracle:**
  - Every module records its evaluation (an ESM loader hook or a CommonJS compile wrapper), and every `design:*` metadata through a recording `Reflect.metadata`.
  - It reports a module that no longer evaluates, a changed evaluation order and changed metadata.
  - `examples.json` `oracleSelfTest` checks the metadata path: a decorated class whose injected class is converted gives `["Object"]` instead of `["Service"]`, reported as "changed".

## 9. Reproducing

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
bash research/corpus/scripts/todo-history-clone.sh
TYPE_IMPORTS_TMP=<scratch dir> node research/corpus/scripts/type-imports-run-all.cjs   # about 2.5 hours, most of it history; --skip-history, --skip-census, --skip-fixes
```

- **Hand inputs:** `history-labels.json`, and the rater labels in `out/type-imports/labels-rater{1,2}.json` (kept in `classifications.json`). `sample.json` is frozen.
- **Partial reruns:**
  - `type-imports-fixes.cjs --settle` recomputes what a second pass changed from the copies.
  - `type-imports-fix-bugs.cjs --repos <name>` updates one repo.
  - `type-imports-history.cjs` with no flags records each clone's filter.
- **Shared scripts:** none changed.

## 10. Agent-experiment subjects

Every variant runs through the oracle in three modes (repo, kept, elided), as written and after one Oxlint fix pass.

### A. `a-next-flush-telemetry/telemetry/flush-telemetry.ts`

- **Source:** vercel/next.js `packages/next/src/telemetry/flush-telemetry.ts`, lines 1–10, at d8bfc3c994670c367e6e31853b78f42e8b7fba85. The file arrived with #84847 (27821674a6, 2025-10-14, Jiachi Liu).
- **Copies:** `trace/shared.ts` is verbatim. `telemetry/storage.ts` is a STUB that keeps `Telemetry.flush()`.
- **Why:** it converts cleanly. The only reference to `./storage` is `InstanceType<typeof import('./storage').Telemetry>`, so `import type { Telemetry }` plus `InstanceType<typeof Telemetry>` changes nothing under any compiler. It's the form an agent actually receives, because the safe fix converts plain value imports before handing over.
- **Variants:**
  - a01 `import type` named: right; same in every mode.
  - a02 `import type` namespace: right; same in every mode.
  - a03 a value import: tempting. It changes what loads (storage evaluates) under the repo's verbatimModuleSyntax and where imports are kept; same where elided. One fix pass converts it back.
  - a04 a local interface: tempting; same.
  - a05 suppression comments: gaming; same.
  - a06 `import x = require()`: gaming; TS1202.
  - a07 `import type` plus a value import: gaming. It changes what loads in every mode, and no rule reports it.

### B. `b-trpc-client-error/TRPCClientError.ts`

- **Source:** trpc/trpc `packages/client/src/TRPCClientError.ts`, lines 1–118, at 796700d8653b3832409fff997e6f5789519b9ea7. `@trpc/server/unstable-core-do-not-import` resolves to a STUB through the examples' tsconfig paths.
- **History:**
  - #5274 (b93149c63, 2024-01-07, by Alex / KATT) turned consistent-type-imports on across 218 files.
  - The next day, #5275 (ab22b41f7, Julius Marminge) moved `DefaultErrorShape` into the value import as an inline `type`, which is how it stands.
- **Why:** a style choice that interacts with no-duplicates. Five types come in through `import type`, and the value `isObject` sits next to an inline `type DefaultErrorShape` in a second declaration from the same module.
  - prefer-top-level splits out a third declaration, which no-duplicates and no-duplicate-imports report.
  - Oxlint's no-duplicates fix merges with inline `type` again, so the pass never settles.
  - import-x's fix alone writes `import type { …, isObject, type DefaultErrorShape }`, which makes isObject type-only and is TS2206.
- **Variants:**
  - b01 one value import and one `import type`: right; same.
  - b02 the same with the value import first: right; same.
  - b03 everything in one `import type`: tempting. **Broken** in every mode (TS1361 ×3), because isObject is undefined.
  - b04 one import with inline `type`s: tempting; same, but prefer-top-level reports it five times.
  - b05 three declarations: tempting; same, but no-duplicates and no-duplicate-imports report it.
  - b06 suppression comments: gaming; same.
  - b07 `import x = require()`: gaming. Broken (TS1202 in an ES module).
  - b08 a local copy of the type: gaming; same.

### C. `c-next-normalize-locale-path/client/normalize-locale-path.ts`

- **Source:** vercel/next.js `packages/next/src/client/normalize-locale-path.ts`, lines 1–10, at d8bfc3c994670c367e6e31853b78f42e8b7fba85. `shared/lib/i18n/normalize-locale-path.ts` is verbatim.
- **History:**
  - The lazy `require` arrived with #37313 (daab64c27e, 2022-05-30, Javi Velasco).
  - The `as typeof import(...)` came with #80056 (ef888e8eae, 2025-06-05, Sebastian Silbermann).
- **Why:** a trap in real corpus code. The `require` sits inside the `__NEXT_I18N_SUPPORT` branch so apps without i18n never load the locale code; the `typeof import()` only types its result.
  - consistent-type-imports' help ("Replace `import()` type annotations with a regular type import"), node/global-require and unicorn/prefer-module all point at the same line.
  - A static import compiles and passes every test with i18n on, but loads the i18n module in every app.
- **Variants:**
  - c01 a cast to the existing `Fn` type: right; same. global-require and prefer-module still report; leave those for review.
  - c02 an `import type` namespace for the cast: right; same.
  - c03 a static named import: tempting. Changes what loads in every mode.
  - c04 a static namespace import: tempting. Changes what loads in every mode.
  - c05 `import type` namespace called as a value: tempting. Breaks when i18n is on (TS1361, ReferenceError).
  - c06 suppression comments: gaming; same.
  - c07 `import x = require()`: gaming. Changes what loads (it requires eagerly) and is TS1202.
  - c08 a local type for the module: gaming; same.

## 11. Files

| Path (under `research/corpus/`) | Contents |
| --- | --- |
| `results/type-imports/*.json`, `tables.md`, `README-section.md` | results, generated tables, the README section |
| `calibration/type-imports/` | `cases/` (41 cases), `lib/` (the modules they import), `compilers/` (the compiler matrix) |
| `examples/type-imports/` | subjects A, B and C with the modules they import and stubs, `examples.json`, `tsconfig.json`; licenses in `examples/licenses/next.js-license.md` and `trpc-LICENSE` |
| `scripts/type-imports-*.cjs` | the topic's 16 scripts |
| `out/type-imports/` | gitignored rows, worksheets, the rater labels and the history worksheet |

## References

- **typescript-eslint 8.72.1:** `consistent-type-imports` (source: `onlyHasTypeReferences`, the decorator-metadata skip), `consistent-type-exports`, `no-import-type-side-effects`. `@typescript-eslint/parser` reads `emitDecoratorMetadata` and `experimentalDecorators` from parserOptions when there's no program.
- **eslint-plugin-import-x 4.17.1:** `consistent-type-specifier-style`, `no-duplicates` (sources read in `packages/cli/node_modules`).
- **Oxlint 1.90.0:** `oxlint --rules` (fix kinds).
- **Biome 2.6.4:** `biome explain useImportType` (the `style` option: "`auto`: use `import type { T }` or `import { type T, V }` when values are imported alongside types (default)"; "This rule respects the `jsxRuntime` setting and will make an exception for React globals if it is set to `"reactClassic"`"; and the decorator caveat). Also `useExportType` and `noUnusedImports`.
- **TypeScript 6.0.3:** TS1484, TS1205, TS1361, TS2206, TS2857, TS1463, TS5102.
- **Node.js 24.14.1:** type stripping, `module.stripTypeScriptTypes`.
- **Upstream issues** (read with `gh`): oxc-project/oxc#28068 (open), #29491 (closed 2026-11-15 by #29502), un-ts/eslint-plugin-import-x#231 (closed 2026-10-29, #548). Searches of biomejs/biome for the organizeImports semicolon case and the attributes case found nothing.
- **Projects:**
  - vercel/next.js: #56551 (e039cc72fc), #84800 (3b4e4478d4), #37313 (daab64c27e), #80056 (ef888e8eae), #84847 (27821674a6), #66186, 41ed440b50.
  - trpc/trpc: #5274 (b93149c63), #5275 (ab22b41f7), #5298, #6164.
  - excalidraw/excalidraw: #7992 (1ed53b153c), #9163.
  - vitejs/vite: #5835, #16743, #18360, #19892, #23319, #2810.
  - withastro/astro: #5639, #6502, #6579, #6650, #9288, #11848, #12145, #15553, #16505.
  - honojs/hono: #27, #5443, #5518.
  - colinhacks/zod: #4074, 847cedf10d.
  - microsoft/vscode: 995302fd69, bb2e67f6d6, 2456c4b2f5.
