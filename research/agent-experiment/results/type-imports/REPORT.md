# Type imports: agent experiment report

The agent experiment for the post on type-only imports, run on 2026-11-18 (UTC) with Claude Code 2.1.327 (claude-opus-5-5, effort xhigh) and Codex CLI 0.169.0 (gpt-6-astra, reasoning effort ultra). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Ultracite's Oxlint core turns on typescript-eslint's `consistent-type-imports` (with `consistent-type-exports`, which needs type information, and `no-import-type-side-effects`), `import/consistent-type-specifier-style` set to `"prefer-top-level"`, `import/no-duplicates` and `no-duplicate-imports`, with Biome's `useImportType` and `useExportType`. Hayden gave the reason for `prefer-top-level` in these words: "at the time, `import { type x }` when TS compiles turns into `import { }` leaving a potential side effect import or at the very least a waste of a line. `import type` was removed entirely during compilation. not sure if that's still the case, especially with all the different typescript compilers out there now (ts-rust, ts7 in go, scriptc, bun build --compile) but at the time there was a solid reason."

The corpus work found that the safe fixes convert a plain value import used only as a type before an agent sees it. What reaches an agent is what the fixes can't do or leave unsettled: `import()` type annotations (no fix), duplicates the single Oxlint pass leaves after its split, and reports that sit next to rules pushing the same line toward a static import. Questions:

1. When Ultracite hands those reports to an agent, does it fix them without changing which modules load, and in which order, under the repo's build, a compiler that keeps imports as written, and one that elides them?
2. Does it pick the form the rules ask for (`import type` at the top level), or one another rule or the next fix pass rewrites?
3. Does it fall for the moves that compile and change behaviour: a value or static import that loads a module eagerly, one merged `import type` that makes a value type-only, `import x = require()`?
4. Does it leave a report for review when the rule's help would change what loads?
5. Does what it writes survive Ultracite's next fix pass in Oxlint, ESLint and Biome?
6. Does anything it writes bear on Hayden's reason: does an agent ever write `import { type X }`, and what does it become?

## TL;DR

- **Results by subject** (4 runs per subject and agent, all in one attempt):

  | Subject | The right response | Claude Code | Codex | Easier to follow? Rater 1 / rater 2 (blind), 8 files each |
  | --- | --- | --- | --- | --- |
  | A, converts cleanly (`InstanceType<typeof import('./storage').Telemetry>`) | `import type { Telemetry }`, storage never loads | `import type { Telemetry }` 4; three of them also wrote the cast as `Telemetry \| undefined` | `import type { Telemetry }` with `InstanceType<typeof Telemetry>` 4 | easier 8 / 8 |
  | B, the fix passes fight (two `import type`s and a value import of one module) | one value import of `isObject`, one `import type` | `DefaultErrorShape` moved into the first `import type`: 4 | the same, character for character: 4 | same 8 / 8 |
  | C, the trap (`require(…) as typeof import(…)` inside the `__NEXT_I18N_SUPPORT` branch) | type the `require` without `import()`, leave the two require rules for review | the cast `{ normalizeLocalePath: typeof Fn }`, both require rules left for review: 4 | **a static import: 3**; the cast and both require rules left for review: 1 | rater 1: same 5, easier 3 (the static imports); rater 2: easier 8 |

- **The trap caught Codex three times in four, and in the pilot.** In c-codex-1 to 3 (and c-codex-pilot) Codex turned the `import type` into a value import and called it in the branch. The file type-checks, every lint view goes quiet, and the shared i18n module now evaluates when the file is imported, with i18n off, in all three oracle modes. Ultracite printed "Fixed 3 of 3 issues with Codex." and exited 0. The agent's own fork had reviewed the plan: "A static named import is safe here. The shared module has no imports, so it cannot introduce a cycle. Its only initialization is an empty private `WeakMap`; evaluating that earlier does not change normal observable behavior." (c-codex-pilot's fork). It reasoned about what the module does when it runs, not about the apps that never load it.
- **Everything else behaves like the subject in every mode.** A, B and five of C's eight runs give the prepared subject's trace in the repo, kept and elided modes, as the agent left the file and after the loop's next Oxlint pass. No run added a suppression, a config change, a type error or a report, touched another file, or wrote `import x = require()`, a local type, or any of the corpus's other gaming moves.
- **Every Claude run on C, and c-codex-4, left both require rules for review with the right reason.** "**A top-level static `import`** would always load and bundle the i18n module, even when i18n support is off. That makes the client bundle bigger." (c-claude-4). Ultracite printed "Fixed 1 of 3 issues with Claude Code. 2 left for you to decide." with the agent's explanation, and exited 1. c-codex-4 wrote "a static import would eagerly load the currently conditional module", although its fork had recommended the static import.
- **Hayden's reason, in these runs.** No agent wrote `import { type X }` (0 of 24 runs and 2 pilots). Every new type import was a top-level `import type`; the only other new imports were Codex's three value imports in C. What an inline-only import does is measured by a mutant instead: `import { type Telemetry } from "./storage"` in A loads storage under Next.js's own setting (verbatimModuleSyntax) and wherever imports are kept as written, and is elided otherwise; Oxlint's next fix pass (`no-import-type-side-effects`) turns it into `import type`, after which it loads nothing anywhere (§6).
- **B's handoff is a fixed point that Oxlint can't settle and every agent did.** One Oxlint pass splits upstream's `import { isObject, type DefaultErrorShape }` into a value import and a second `import type`, and no further pass merges the two `import type`s, so `import/no-duplicates` and `no-duplicate-imports` stay reported. All eight agents merged them. No agent wrote the tempting single `import type` that makes `isObject` type-only.
- **The retry loop never ran.** All 24 runs took one attempt. The `Left for review:` line was used in 5 runs, all on C, each listing exactly the two require rules.
- **Did it help a reader?** Both raters called all of A easier and all of B about the same. On C they split: rater 1 called the cast about the same and the static imports easier, rater 2 called all eight easier. Agreement 19 of 24 (κ 0.60). The most readable C files are the wrong ones.
- **Without an agent, nothing clears A's or C's `import()` type, and only Oxlint leaves B unsettled.** `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint, run until the file stops changing (30 cases), settle within one pass and change nothing that loads. Oxlint stops B at the three declarations it hands over; ESLint settles it at one value import and one `import type`; Biome merges the handed-over file the same way but keeps upstream's inline form, which the other two presets reject. On every agent's final file (120 passes) no pass writes an inline `type`, moves C's `require` or undoes a static import, and behaviour is the agent's in every pass and mode. Ultracite's real adapters agree with the mirror in all 150.
- **Exposure.** No tool call read a locked path, a corpus file, a clone, an installed Next.js or another run. Codex searched its own memory file for the rule names or Ultracite in three runs and found nothing about type imports or this experiment. No run used the web.
- **Cost:** Claude Code $4.15 for 12 runs (median $0.345, $0.33–0.38). Codex 249,647 tokens as reported (median 19.9k, 16.0k–34.9k); every Codex run also spawned a fork, whose 68,773 tokens (counted the same way) Codex doesn't report. 11.7 minutes of agent time over 24 attempts (runs 20.7–55.9 s). The pilot cost $0.47, 17.7k tokens and 10.3k fork tokens more.

## 1. Setup

### 1.1 Subjects

The subjects are the three folders in `corpus/examples/type-imports/` (corpus REPORT §8 and §10). Each was run 4 times with Claude Code and 4 times with Codex, 24 runs in all, from 10:02 to 10:22 UTC, in four rounds that each ran every subject with every agent once, in a different order.

| Subject | File in the run dir, and the files beside it | Handoff (Oxlint, after the filter) | The right response |
| --- | --- | --- | --- |
| A | `telemetry/flush-telemetry.ts` (Next.js, `packages/next/src/telemetry/flush-telemetry.ts` @ d8bfc3c9, the whole file; MIT), with `trace/shared.ts` (copied from the same commit) and `telemetry/storage.ts` (a STUB) | `typescript/consistent-type-imports` ×1, L40: "`import()` type annotations are forbidden." | `import type { Telemetry } from "./storage"` (or a type-only namespace import); storage never evaluates, in every mode |
| B | `TRPCClientError.ts` (tRPC, `packages/client/src/TRPCClientError.ts` @ 796700d8, the whole file; MIT), with `stubs/unstable-core-do-not-import.ts` (a STUB, reached through the tsconfig's `paths`) | `import/no-duplicates` L41 ("Modules should not be imported multiple times in the same file") and `no-duplicate-imports` L43 ("'@trpc/server/unstable-core-do-not-import' import is duplicated") | one value import of `isObject` and one `import type` with the six types; `isObject` still a real function |
| C | `client/normalize-locale-path.ts` (Next.js, `packages/next/src/client/normalize-locale-path.ts` @ d8bfc3c9, the whole file; MIT), with `shared/lib/i18n/normalize-locale-path.ts` (copied from the same commit) | `node/global-require` ("Unexpected require()."), `unicorn/prefer-module` ("Do not use \"require\".") and `typescript/consistent-type-imports` (the `import()` type), all on L38 | keep the `require` in the branch and type it without `import()`; leave the two require rules for review |

The help texts the diagnostics file carries: for the `import()` type, "Replace `import()` type annotations with a regular type import. For example, change `type T = import('module').Type` to `import type { Type } from 'module'; type T = Type`."; for B, "Merge these imports into a single import statement" and "Merge the duplicated import into a single import statement"; for C's require rules, "Move require() to top-level module scope" and "Prefer ES modules over CommonJS globals." In C every help text points at a static import.

### 1.2 The run dir: what `ultracite init --linter oxlint` leaves

`prepareSubjects` runs Ultracite's own `init` (the CLI source, under Bun, `--linter oxlint --pm bun --skip-install --yes --quiet`) in a scratch project that starts with a `package.json` with TypeScript and subject A's tsconfig. No framework is selected: none of the subjects is a component or uses JSX. Init writes three files (`subjects/type-imports/init.json`):

- `oxlint.config.ts`: `extends: [core]`, `env: core.env`, `ignorePatterns: core.ignorePatterns`, importing `ultracite/oxlint/core`. `prepareSubjects` fails unless core is the only preset.
- `oxfmt.config.ts`: `...ultracite` from `ultracite/oxfmt`.
- `package.json`: `ultracite` 8.3.0, `oxlint` ^1.90.0 and `oxfmt` ^0.75.0 added, with the `check` and `fix` scripts.

Every topic rule is on in core, so the user changes nothing. The run dir is these files (as Ultracite's fix pass formats them), the subject's folder laid out as in the corpus, and a `tsconfig.json` taken from the corpus examples' compiler options, with B's `paths` re-rooted at the run dir and every `.ts` file included. Its module flags, which decide what `tsc` tells an agent that runs it:

| Flag | Value |
| --- | --- |
| `verbatimModuleSyntax` | `true` (all three subjects; Next.js sets it, tRPC doesn't) |
| `isolatedModules` | not set |
| `module` | `esnext` |
| `moduleResolution` | `bundler` |
| also | `strict`, `target: es2022`, `lib: [es2023, dom]`, `types: [node]`, `noEmit`, `skipLibCheck`; B: `paths` for `@trpc/server/unstable-core-do-not-import` |

Init's untouched output for Oxlint, Biome (`biome.jsonc` extending core, `.gitignore`, `package.json`) and ESLint (`eslint.config.mjs` with `...core`, Prettier and Stylelint configs, `package.json`) is in `subjects/type-imports/init/`, for the deterministic paths. Oxlint's two configs and Biome's are stored with a `.txt` suffix, so no file under `research/` has a name this repo's linters would load as a nested config. The run dir has no `node_modules` and no git.

### 1.3 Preparing the subjects

- **Header.** The `stripFields` fields are removed (rules it hits; why it converts cleanly, needs a choice or is a trap; what the project did; behaviour to preserve; the expected, tempting and gaming responses), and so is the subject line ("Type-imports subject C: an `import()` type on a require that has to stay lazy."). `TEXT_EDITS` then rewrite:
  - C's `Function:` field, whose last two lines said that the variable is replaced at build time and that the file requires the shared implementation only when i18n is configured, which is the trap's analysis, to "normalizeLocalePath for the browser router.";
  - the "copied verbatim" sentences in every subject and copy, which normalising made untrue, to "come from that commit, edited since by automated tooling";
  - the license lines that pointed into `research/corpus`;
  - the stubs' and copies' headers, which named the topic and the subject ("STUB for type-imports subject A", "for type-imports subject C"), and A's stub note that it counts calls "so the oracle can see them".
- **Kept:** source, commit, permalink, license, A's `Function:` description, every STUB note, A's note that the real `storage.ts` imports conf, ci-info and other compiled packages (what the real file would show), and every upstream comment.
- **The comment check.** Every comment line of the subject and the other files of its folder, headers and STUB notes included, is checked against 17 patterns:
  - **the forms:** type import, `import type`, type-only, `import()`, `import { type`; inline, top-level, specifier;
  - **what compilers do:** elide, elision, erase, strip, compiled away; verbatim, isolatedModules and the other import flags;
  - **the trap:** side effect, eager, lazy, load, bundle, tree-shaking, dead code; evaluate, runtime; the build-time variable, build time, static import;
  - **the fix passes' fight:** duplicate, merge, split, settle;
  - **the rules** by name, review, every linter and tool, the experiment and the analysis, the stripped field names, fix and bug words, upstream and history, deliberate and preference words;
  - **the history:** every PR and commit number in the corpus headers, and the names of the people who wrote them.

  Allowed by name: the MIT License line "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell" (in all three), and in B upstream's `eslint-disable-next-line @typescript-eslint/ban-ts-comment` (twice) and the stub's `biome-ignore lint/suspicious/noExplicitAny: stub` (three times), directives that name no import rule. The same patterns match 30, 3 and 4 lines of A's unstripped files, 57 and 6 of B's, and 45 and 4 of C's, so a clean prepared subject means the check ran.
- **Normalised as far as Ultracite's Oxlint pass goes.** `oxlint --fix .`, `oxfmt --write .` and `oxlint -f json .` run on the whole folder until no file changes: two passes for each subject, the first changing the subject, its other files, `package.json` and `tsconfig.json`. Besides formatting, the safe fixes applied:
  - **A:** `prefer-const` (`let telemetry` to `const`).
  - **B:** `import/consistent-type-specifier-style` split upstream's `import { isObject, type DefaultErrorShape }` into `import { isObject }` and `import type { DefaultErrorShape }`, which is the handoff (below); and `typescript/prefer-ts-expect-error` turned upstream's two `// @ts-ignore` comments into `// @ts-expect-error`, which `tsc` then reports as unused (TS2578 ×2, in every setting). The upstream file type-checks clean; the prepared one carries those two errors, as a real project would after `ultracite fix`.
  - **C:** formatting only in the subject; `curly` ×3 and `unicorn/consistent-existence-index-check` in the copied shared module.
- **B's handoff is what one pass leaves, and it is also the fixed point.** examples.json `handoff` is one `ultracite fix` pass with Oxlint. Here the first pass gives exactly the same import declarations (`import type { inferClientTypes, InferrableClientTypes, Maybe, TRPCErrorResponse }`, `import { isObject }`, `import type { DefaultErrorShape }`), and the second pass changes nothing: Oxlint's `no-duplicates` applies no fix that merges the two `import type`s, so it and `no-duplicate-imports` stay reported. The handed-over file is that state.
- **Normalising changed no behaviour** (`subjects.json` `checks`). In every oracle mode, the prepared folder's trace equals the corpus folder's, and the prepared subject with the corpus's own other files gives the same trace again. The collect leaves every file unchanged, and the handoff holds exactly the corpus's counts of the subject's rules.

### 1.4 The handoff and the filter: a deviation from a real project

After normalising, Oxlint still reports other diagnostics, which Ultracite would hand over too:

| Subject | In the subject | In the other files of its folder |
| --- | --- | --- |
| A | `func-style` 1 | `trace/shared.ts`: `typescript/no-explicit-any` 8; `telemetry/storage.ts` (the stub): `require-await` 1 |
| B | `func-style` 3, `typescript/no-explicit-any` 3, `no-use-before-define` 1, `unicorn/filename-case` 1 | the stub: `typescript/no-explicit-any` 3, `func-style` 1 |
| C | none | the shared module: `func-style` 1, `no-param-reassign` 1, `prefer-const` 1 |

So the experiment filters, in the handoff and in every re-lint, as the seven previous topics did:

- **Kept:** the six topic rules, plus for C `node/global-require` and `unicorn/prefer-module` (part of the trap, on the same line), plus any other diagnostic that isn't one of the prepared project's own, matched by rule and message, file by file, as Ultracite's `diff.ts` matches them.
- **What it models:** a project that lints clean apart from these rules. A real project with these files would hand over 2, 10 and 3 issues in the subject, and the other files' own as further files.
- **C is unaffected:** its subject reports nothing else, so a real project hands over exactly the three issues these runs got. A real A would add `func-style` on the same function; a real B would add eight issues next to the two duplicates.
- **Here the filter never acted:** no edit added a diagnostic Oxlint reports, so no re-lint handed anything new back.

### 1.5 The run: Ultracite's retry loop, through the Oxlint adapter

`run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does:

- **Collect:** the Oxlint pass on the project, then the filter.
- **Attempts:** up to `MAX_AGENT_ATTEMPTS` (3), each with `buildPrompt` or `buildRetryPrompt` (imported from `prompt.ts`), under `AGENT_TIMEOUT_MS` (10 minutes) and `KILL_GRACE_MS` (10 s).
- **Verify after each attempt:** the same pass on the file, in place, then the filter.
- **Deciding whether to retry:** `parseLeftForReview` drops the issues the agent listed for review; `nextRetry` splits what's left into issues still reported and issues new since the edit. There's no retry after a timeout.

**The mirror had to move again.** The CLI's agent-fix code changed after the nested-ternaries runs, so `scripts/ultracite-adapters.cjs`'s v3 hash check failed against it in three slices. Diffing `packages/cli/src` against 9743dfcb (v3's source) and 9a93f997 shows that only `agent-fix/linters.ts` and `linter-args.ts` changed in what the mirror copies; `prompt.ts`, `agents.ts`, `index.ts`, `diff.ts` and `run-agent.ts` are as v3 has them. This topic adds a "v4" revision, the CLI at 60a16471, which it selects (`ULTRACITE_MIRROR=v4`):

- **`linters.ts` (Oxlint), f23eb8e8:** the JS plugins whose rule help the adapter looks up include `eslint-plugin-jsdoc` (`jsdoc-js/…`) and `eslint-plugin-tsdoc` (`tsdoc/…`). This topic's config loads no JS plugin.
- **`linters.ts` (Biome), d0219d34:** a rule `biome explain` can't describe is remembered as null, so explain runs once per rule. What the adapter returns is the same.
- **`linter-args.ts` `toStylelintTargets`, 800bc5d6, 6c29ae8c and 4a32ea73:** a glob that doesn't exist as a path and names no style extension is expanded (fast-glob, from packages/cli) and its style files kept; a target with no extension is a directory unless it's a file on disk. For the targets the harness passes (none, `.`, one `.ts` file) the result is the same as v3's.
- **Checked against the real code:** the self-test runs v4's `toStylelintTargets` and the CLI's own (under Bun) on 13 target lists in a scratch project (globs with and without style extensions, a bracketed path, a dotted directory, a Dockerfile, a missing directory), and compares v4's JS plugin list with `linters.ts`'s; all 14 agree. diff.ts is unchanged since v3, and the port check runs it against the real `diff.ts` on six edits, three of them this topic's shapes (B's two duplicates cleared by a merge; C's three reports on one line with one cleared; C's line moved by an added import); all six agree.
- **v1, v2 and v3 are unchanged:** their hash checks report exactly the drift they did before (v1: six slices, v2: five, v3: three), and no code path of theirs reads anything v4 adds.

The configs and the real adapters:

- **The configs.** The harness passes `-c` with configs equivalent to init's that import the core preset by absolute URL. Init's own files are in the run dir for the agents to read.
- **The mirror matches the CLI.** The self-test runs Ultracite's real Oxlint adapter under Bun, in a project with init's own config files and `node_modules` links, next to the mirror. On the 3 prepared subjects and 46 mutants, all 49 collect-and-verify comparisons match: every diagnostic field but `raw`, and the subject, the other files of its folder, `package.json` and `tsconfig.json` each pass leaves.
- **Agent arguments:** `run-one.mjs` checked them against `agents.ts` before every run (`claude -p --permission-mode acceptEdits --allowedTools Read,Edit,Write,Grep,Glob`; `codex exec --sandbox workspace-write --skip-git-repo-check -`).
- **Codex's forks.** Every Codex run, the pilot included, called `spawn_agent` with `fork_turns: "all"` to have a copy of itself review the planned edit (task names such as `review_import_safety`, `review_type_import`, `review_import_fix`, `review_import_behavior`, `assess_import_safety`). Each fork writes a session log of its own with the run dir as its cwd. `run-one.mjs` kept only the first log a run produced, so it now keeps the others as `transcript.<k>.jsonl` (gitignored), and the measure reads the forks' tool calls, commands and messages with the agent's. The pilot's fork log was copied in by hand before it was re-measured.

### 1.6 Measurement

- **Two states per attempt:** the file as the agent left it, and as verify left it (the loop's next Oxlint fix pass: what the next attempt gets and what stays in the project).
- **Lint, inline config honoured and ignored, in five views:**
  - **Oxlint:** the user's config (core), the handoff's view; and the same with `--type-aware` (oxlint-tsgolint 7.0.2005 from packages/cli) and the run dir's tsconfig, which runs `consistent-type-exports` and the other type-aware rules.
  - **ESLint:** what `ultracite init --linter eslint` writes (core): `@typescript-eslint/consistent-type-imports`, `no-import-type-side-effects`, `import-x/consistent-type-specifier-style` and `no-duplicates`, `no-duplicate-imports`, `n/global-require`, `unicorn/prefer-module` and `@typescript-eslint/no-require-imports` among its rules; and core with Ultracite's type-aware preset (the project service finds the run dir's tsconfig), which adds `consistent-type-exports` with type information.
  - **Biome:** what `ultracite init --linter biome` writes (core), `biome check`: `useImportType` and `useExportType` (style `auto`), `noCommonJs` off, organizeImports on.
  - Each view reports 21 import rules (the topic's, the require and CommonJS rules) and 72 rules an import edit can trip (unused imports, namespaces, `any`, assertions, type definitions, import order and first-import rules, and the rest), and every rule the state adds against the prepared subject.
- **`tsc`** (packages/cli's TypeScript 6.0.3) over the subject's folder, in three settings: the run dir's tsconfig as written; with `verbatimModuleSyntax` forced on (the same as the run dir's here, since it sets it); and with imports elided (`verbatimModuleSyntax` off, `isolatedModules` on: tRPC's own setting). Flagged codes: TS1361 (a value imported with `import type`), TS1202 (`import x = require()` in an ES module), TS1484 (a type imported without `type` under verbatimModuleSyntax), TS2206 (an inline `type` inside `import type`), TS2857 (import attributes on a type-only import), and TS1362, TS1485, TS1463, TS1205, TS1286, TS2578 and TS2307 besides.
- **The oracle:** `corpus/scripts/type-imports-oracle.cjs`, imported unchanged. It compiles every file of the folder with `ts.transpileModule` in a mode's setting, runs it in a fresh Node process in which every module records that it evaluated, and runs the subject's scenarios: A `flushTelemetry` with nothing, a telemetry object, `undefined` and a falsy value stored; B `TRPCClientError.from` on 11 inputs and `isTRPCClientError` on 4; C `normalizeLocalePath` on 7 paths, once with `__NEXT_I18N_SUPPORT` unset and once set. Modes: **repo** (the source repo's setting: A verbatimModuleSyntax, B tRPC's elision with isolatedModules, C CommonJS as Next.js's bundler runs its `require`), **kept** (imports kept as written), **elided** (imports used only as types removed). C runs as CommonJS in all three, so for C kept and repo are one setting. The verdict is against the prepared subject, per mode: same, changed (with the fields that differ, among them which modules evaluated and in what order) or broken (didn't compile or load). The oracle's scratch root has to be a real path (macOS reaches its temp directory through the `/var` symlink, and the loader hook matches files by real path), so the topic points `TYPE_IMPORTS_TMP` at one.
- **The edit, from the AST and the corpus's inventory** (`importFacts`, `editOf`): every import declaration's form (value, `import type`, inline, mixed, side-effect, `import {}`), clause and specifiers with each one's inline `type` and how the file uses it (the census that predicts `consistent-type-imports` exactly), compared by what each imports rather than by its text; `import x = require()`; `import()` types; each `require` and whether it is inside the branch taken when `__NEXT_I18N_SUPPORT` is set (an `if`, a ternary or `&&`) and inside a function; dynamic `import()`; every cast and its type; new local types; other top-level code, comments and suppressions. From those, the form chosen for the reported line (the list in `results.json` `rules.forms`), whether each new import is top-level or inline, B's declarations of the module and whether `isObject` is still a value import, and C's `require`.
- **Per attempt:** Ultracite's partition against that attempt's issues and the handoff's, with each report's file rebuilt from the committed copies, and the retry decision recomputed (all 24 reproduce). Verify re-run on the agent's file reproduced every committed verified file and `verify.json`.
- **What Ultracite prints:** `fileOutcome` (the mirror's `fixFileGroup` tally): the outro, the notes, and the agent's final message as `describeFinalMessage` cuts it.
- **From the session logs** (the agent's and its forks'): model, effort, model and tool calls, cost or tokens (and the forks' tokens), every shell command and whether it was refused, whether it ran `tsc`, searches for tests, reads of an installed Next.js or tRPC, web access, writes outside the run dir, project instructions, the final message, progress messages and the forks' messages, sentences about loading and evaluation, side effects, laziness, bundle size, elision and verbatimModuleSyntax, type stripping, duplicates, the rules contradicting each other, top-level and inline, the require rules and the reasons given, and exposure counted in the whole log, in tool calls and in tool inputs.
- **The oracle and classifier self-test: 120 checks, all as expected** (`oracle-self-test.json`):
  - the 3 prepared subjects;
  - the corpus's 23 variants, made by `type-imports-examples.cjs`'s own `variantsOf` (compiled without its `main()` call) from the cleaned subject and normalised, and 7 of them as written. Their verdicts in every mode equal examples.json's (as written, or after one fix pass);
  - 16 hand-made mutants: Hayden's case (`import { type Telemetry }`) as written and after verify, `Telemetry` as the instance type, the `import()` moved into an alias, an Oxlint-only suppression; B with the two `import type`s merged, upstream's mixed import as written and after verify, every type unmarked as written and after verify, `isObject` moved into an `import type`; C with `typeof normalizeLocalePath`, a cast to `typeof Fn` (a type error), the `require` hoisted to the top level, a dynamic `import()`, an Oxlint-only suppression;
  - the oracle's own metadata check, the priming check, the 6 diff.ts port cases, the 14 v4 port cases and the 49 mirror comparisons.
- **The hand classification** (`classifications.json`) reads every diff, verify diff, final message, progress message and fork message. Its form and response readings agree with the automatic ones in 24 of 24. The automatic readings were visible while classifying, so that's a consistency check, not an independent one.

## 2. Results by subject and agent

| Subject × agent | Final edit | Oracle (final): repo / kept / elided | Subject's rules cleared (Oxlint) | New imports (top-level `import type` / inline / value) | Lines +/− | Retried | Left for review | Ultracite prints |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A, Claude | `import type { Telemetry }` 4; cast as `Telemetry \| undefined` 3, `InstanceType<typeof Telemetry>` 1 | same ×3, 4 | 4 | 4 / 0 / 0 | +2 / −3 (3), +2 / −1 (1) | 0 | 0 | Fixed 1 of 1 ×4 |
| A, Codex | `import type { Telemetry }`, `InstanceType<typeof Telemetry>` 4 | same ×3, 4 | 4 | 4 / 0 / 0 | +2 / −1 | 0 | 0 | Fixed 1 of 1 ×4 |
| B, Claude | `DefaultErrorShape` moved into the first `import type`, the third declaration deleted: 4 | same ×3, 4 | 4 | (one `import type` changed) | +1 / −1 | 0 | 0 | Fixed 2 of 2 ×4 |
| B, Codex | the same: 4 | same ×3, 4 | 4 | (the same) | +1 / −1 | 0 | 0 | Fixed 2 of 2 ×4 |
| C, Claude | the cast `{ normalizeLocalePath: typeof Fn }`: 4 | same ×3, 4 | `consistent-type-imports` 4; the require rules left for review 4 | 0 / 0 / 0 | +3 / −1 (after verify) | 0 | 4 (both require rules) | Fixed 1 of 3, 2 left for you to decide ×4 |
| C, Codex | **a static import, `Fn(pathname, locales)` in the branch: 3**; the cast: 1 | **changed ×3** (the shared module evaluates at import), 3; same ×3, 1 | all three, 3; `consistent-type-imports` and the require rules left for review, 1 | 0 / 0 / 3 | static +2–6 / −4–5; the cast +3 / −1 | 0 | 1 | Fixed 3 of 3 ×3; Fixed 1 of 3, 2 left for you to decide ×1 |

Every final file passes all five views for the subject's rules apart from what the agent left for review, inline config ignored and honoured, and adds no type error in any setting (B's two TS2578 are the prepared subject's). No final file adds a rule in any view, and no run changed anything but the reported import or cast: other declarations, comments and other files are as they were (c-codex-3 also renamed the import and the export's annotation, below).

**A.** All eight added `import type { Telemetry } from "./storage";` below the existing import, a top-level type import.
- **Claude simplified the type in three runs**, to `as Telemetry | undefined`, and said why: "**Same type:** `Telemetry` is a plain, non-generic class, so `InstanceType<typeof Telemetry>` and `Telemetry` mean the same thing." (a-claude-1). a-claude-2 kept `InstanceType<typeof Telemetry>` "to keep the change minimal".
- **Codex kept `InstanceType<typeof Telemetry>`** in all four, the smallest change, each after a fork confirmed it: "`typeof Telemetry` refers to the same constructor type, and `import type` is erased without loading `./storage` at runtime." (a-codex-4's fork).
- **What loads:** storage never evaluates, in any mode, as before. A value import there (corpus a03) loads storage under Next.js's verbatimModuleSyntax and in kept mode; no agent wrote one.

**B.** All eight made the same one-line edit: `DefaultErrorShape` added at the top of the first `import type` block (alphabetical, case-insensitive), and `import type { DefaultErrorShape } from …` deleted. The value import `import { isObject } from …` stayed as it was.
- **Two declarations of the module remain:** one value import with `isObject`, one `import type` with the six types. `isObject` is still a value import in all eight, and evaluates in every mode.
- **Why they left the value import alone:** "The value import `import { isObject } from …` is still a separate statement. Neither rule reported it, because the config accepts one type import plus one value import from the same module." (b-claude-2). Codex's forks said the same.
- **Not written:** one merged `import type` with `isObject` in it (import-x's fix alone, corpus b03), one import with inline `type`s (b04), upstream's mixed import, `import x = require()`, a local copy of the type.

**C.** Two responses.
- **The cast, 5 (Claude 4, c-codex-4):** `require("../shared/lib/i18n/normalize-locale-path") as { normalizeLocalePath: typeof Fn }`, using the file's existing `import type { normalizeLocalePath as Fn }`; verify's Oxfmt broke the object type over three lines. The `require` stays inside the `if`, so the shared module still evaluates only on the first call with i18n on. All five listed issues 1 and 2 on a `Left for review:` line.
- **A static import, 3 (c-codex-1 to 3):** `import type { normalizeLocalePath as Fn }` became `import { normalizeLocalePath as Fn }` and the branch became `return Fn(pathname, locales);` (c-codex-3 named the import `normalizeLocalePathImpl` and annotated the export with `typeof normalizeLocalePathImpl`). The `if` is still there, so with i18n off the function returns the same; but the shared module evaluates as soon as the file is imported, in every mode, i18n on or off. That's the trap: in Next.js the branch drops out of apps without i18n, and with a static import the module is in every app.
- **Every lint view is clean on the static imports**, and Oxlint's verify hands nothing back, so the loop took them as fixes. `tsc` is clean too.
- **Not written:** a dynamic `import()`, a hoisted `require`, an `import type` namespace (c-claude-3 considered it: "I didn't add a second `import type * as …` from the same module because a duplicate-imports rule could flag it."), `import x = require()`, a local type for the module.

## 3. Did it help a reader?

The reader judgement was made from a blind packet. For each of the 24 final files, the packet held the handed-over file and the final file (license headers removed) and their diff, under a seeded random item id with no run id, agent or topic path. The question: would a developer new to the code find the final file easier to follow than the original, about the same, or harder? Behaviour, rule compliance and style preferences weren't part of it.

- **Rater 1** is the Claude model that ran the experiment. It labelled the distinct versions from the packet before reading rater 2's labels, but it had seen the runs, so it isn't blind.
- **Rater 2** is a separate Claude subagent given only the packet and the question. It made three tool calls (reading the packet and writing its answers).

| Subject | Rater 1: easier / same / harder | Rater 2: easier / same / harder |
| --- | --- | --- |
| A | 8 / 0 / 0 | 8 / 0 / 0 |
| B | 0 / 8 / 0 | 0 / 8 / 0 |
| C | 3 / 5 / 0 | 8 / 0 / 0 |
| All | 11 / 13 / 0 | 16 / 8 / 0 |

- **Agreement: 19 of 24, κ 0.60.** All five disagreements are C's cast: rater 1 called it about the same, rater 2 easier ("The cast no longer repeats the module path. It now spells out the one member being used, tied to the Fn type already imported, though the require-and-cast pattern is still there.").
- **A:** both said easier. Rater 2 on the short form: "The nested InstanceType<typeof import(...)> expression becomes a plain Telemetry | undefined cast, and the dependency is now visible at the top of the file."
- **B:** both said about the same: "Only the imports change: a separate type import from the same module is folded into the existing type import block. The rest of the file reads exactly as before." (rater 2).
- **C's static imports read best and are wrong.** Both raters called all three easier ("The require call with a long inline import-type cast is replaced by a direct call to the imported function.", rater 2). A reader judging readability alone prefers the edit that changes what loads.

Two raters from one model family, on 24 files that come in six distinct versions, is a small and correlated panel (§12).

## 4. The retry loop and the Left for review line

- **24 of 24 runs took one attempt.** Each verify left nothing the filter keeps except what the agent listed for review, so `nextRetry` returned nothing. The measure rebuilt each report's file from the committed copies and recomputed every decision; all 24 reproduce.
- **The `Left for review:` line was used in 5 runs**, all on C (Claude 4, c-codex-4), each with "Left for review: 1, 2", the two require rules. Each explanation named the cost of a static import: "**A top-level `import`** would put the module in every client bundle, even when i18n is disabled." (c-claude-3).
- **What Ultracite printed:**
  - for those 5: "Fixed 1 of 3 issues with Claude Code. 2 left for you to decide." (or "with Codex."), then "Claude Code left 2 issues for you to decide:" and the agent's explanation, and exit 1, since two issues remain reported;
  - for C's three static imports: "Fixed 3 of 3 issues with Codex.", then "Codex said:" and its message ("Fixed all three issues by using the existing import as a value import and calling it directly. Preserved the environment guard and return behavior.", c-codex-1), and exit 0. Nothing in what Ultracite printed says that the module now loads;
  - for A and B: "Fixed 1 of 1 issue" or "Fixed 2 of 2 issues", exit 0, with the agent's message.
- **A retry would have pushed toward the trap.** If an agent had fixed only the `import()` type on C and left the require rules without listing them, verify would have handed back both, and `buildRetryPrompt` asks for a structurally different approach. No run did that here.
- **Verify changed five files,** all formatting: Oxfmt broke C's object type over three lines (c-claude-2 to 4, c-codex-4) and the export's signature in c-codex-3.

## 5. Without an agent, and after the agent

### 5.1 `ultracite fix` and `--unsafe` on the subjects

Each linter's adapter `fixAndCollect` runs on a project laid out as init leaves it, on the upstream code (header stripped) and on the file the Oxlint arm hands over, safe and `--unsafe` (ESLint has no unsafe tier), through the mirror and Ultracite's real adapters, and again until the subject stops changing. That's 30 cases.

| Linter | A | B | C |
| --- | --- | --- | --- |
| Oxlint (safe and `--unsafe`) | upstream: `prefer-const` and formatting, one pass; handed over: no change. `consistent-type-imports` still reported: the `import()` type has no fix | upstream: one pass to the three declarations, then nothing; `no-duplicates` and `no-duplicate-imports` stay; `prefer-ts-expect-error` adds TS2578 ×2. Handed over: no change | formatting only; all three still reported |
| Biome (safe and `--unsafe`) | reports nothing (no rule for `import()` types); formatting only | upstream: keeps upstream's mixed import (`import { type DefaultErrorShape, isObject }`, style `auto`), which Oxlint's and ESLint's `prefer-top-level` report, and turns the `@ts-ignore`s into `@ts-expect-error` (TS2578 ×2). Handed over: merges the two `import type`s, one value import and one `import type`, in one pass | reports nothing; formatting only |
| ESLint | `consistent-type-imports` still reported; formatting | upstream: one value import and one `import type` in one pass, `@ts-ignore` left alone; handed over: merges the two `import type`s and moves the value import first | all three still reported; `unicorn/prefer-ternary` turns the `if` into a ternary, with the `require` in its consequent |

- **Every case settles within one changing pass**, and no pass changes what loads: the oracle's verdict against the input is same in every pass and mode.
- **Nothing converts A's or C's `import()` type**, in any linter. Oxlint and ESLint keep reporting it, and Biome has no rule for it, so `--claude` and `--codex` are the only path to clearing it.
- **B is the subject where linters differ.** Only Oxlint stops with reports, and they are its own split's duplicates. ESLint's whole preset settles at the right answer from upstream (as the corpus's calibration c23 found). Biome's pass on the handed-over file gives the right answer; its pass on upstream gives the inline form the other two presets reject (corpus REPORT §7.5).
- **Real adapters** agree with the mirror in all 30.

### 5.2 The same passes on every agent's final file

The final file of each run (what the project holds after `ultracite fix --claude/--codex`) went through the same five commands, each until it settled: 120 cases, mirror and real adapters agreeing in all of them.

| Final files | Oxlint | Oxlint `--unsafe` | Biome (safe and `--unsafe`) | ESLint |
| --- | --- | --- | --- | --- |
| A (8) | unchanged | unchanged | unchanged | Prettier joins `InstanceType<typeof Telemetry> \| undefined` onto one line (the 5 files that kept it) |
| B (8) | unchanged | unchanged | re-sorts the names in the `import type` | `import-x/order` puts the value import first; the two `eslint-disable-next-line @typescript-eslint/ban-ts-comment` directives, now unused, are removed |
| C, the cast (5) | unchanged | unchanged | unchanged | the ternary of §5.1; the `require` stays in its consequent; the require rules still reported |
| C, the static import (3) | unchanged | unchanged | unchanged | the same ternary; the static import stays |

- **No pass writes an inline `type`** (0 before, 0 after, in all 120). Biome's `style: "auto"` writes `import { type X, y }` only for a declaration that mixes types and values, and no agent wrote one.
- **No pass breaks an edit or changes what loads:** the oracle's verdict against the agent's file is same in all 157 passes and every mode. Oxlint's split-and-merge has nothing to work on, and the fix composition that makes values type-only (corpus REPORT §4.7) needs a value import next to an unmarked type import of the same module, which no final file has.
- **Nor does any pass repair the trap.** The three static imports stay, and the shared module still loads at import in every mode after every pass. Only ESLint's `unicorn/prefer-ternary` restructures C, and it keeps whatever the agent wrote inside the branch.

## 6. Hayden's reason, in these runs

Hayden's reason has three parts: `import { type x }` compiles to `import { }`, which can keep a side effect or at least wastes a line; `import type` is removed entirely; and whether that still holds across today's compilers. The corpus measured the compilers (corpus REPORT §4.5): the inline-only form leaves `import {} from` (or `import "…"`) and runs the module under verbatimModuleSyntax in tsc, transpileModule, esbuild and sucrase, under Oxc's onlyRemoveTypeImports and always under Node's type stripping, and disappears under the defaults and Bun; `import type` disappears everywhere. This experiment adds what agents write and what Ultracite does with it.

- **No agent wrote `import { type X }`.** In 24 runs and 2 pilots, every new type import was a top-level `import type` (A, 8), B's edit kept the top-level `import type` and moved a name into it, and the only other new imports were C's three value imports. The agents described the elision themselves: "TypeScript removes `import type` when it compiles, so this adds no runtime import and can't create an import cycle." (a-claude-3). So in these runs `prefer-top-level` had nothing to report on any agent's edit.
- **What the inline form would have done, measured on A.** The mutant `import { type Telemetry } from "./storage"`, as an agent would write it:
  - **repo (Next.js's verbatimModuleSyntax) and kept:** storage evaluates when the file is imported (changed);
  - **elided:** nothing loads (same);
  - Oxlint reports it twice, `no-import-type-side-effects` and `consistent-type-specifier-style`.
- **What Ultracite does with it:** the loop's next Oxlint pass applies `no-import-type-side-effects`'s fix and writes `import type { Telemetry }`, which loads nothing in any mode (the mutant after verify). So under Ultracite's loop, today, an inline-only import an agent writes doesn't survive to the project. The corpus notes that this fix becomes a suggestion in the next Oxlint release (oxc-project/oxc#29491), after which it would reach an agent as a report instead (§10).
- **"At the very least a waste of a line."** For a mixed import, the value keeps the module loading either way, so top-level or inline is style there (corpus REPORT §5). B is that case: upstream wrote `import { isObject, type DefaultErrorShape }`, Ultracite's fix pass split it, and the split left a duplicate that every agent then merged into the other `import type`, ending with as many lines as upstream had.
- **The part that bit is next to the rule, not in it.** The behaviour change in these runs came from C's value import, which has no `type` at all. The type-import rule's help and the two require rules' help pointed the same way, and a static import satisfied all three.

## 7. What the agents said

Hand classification (`classifications.json`), runs in which each was true (an agent's own messages or its forks'):

| | Loading or evaluation | Side effects | Laziness, the branch | Bundle size | Elision, `import type` removed | Type stripping | Duplicates (B) | Rules contradicting each other | Why this form | Leaving it for review | Ran tsc or the linter | Looked for tests | Looked upstream |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude, 12 | 7 | 1 | 4 | 4 | 6 | 0 | 5 | 0 | 12 | 4 | 0 | 0 | 0 |
| Codex, 12 | 5 | 4 | 3 | 0 | 6 | 0 | 4 | 0 | 12 | 1 | 0 | 0 | 0 |

- **On C, Claude reasoned about the apps that don't load the module; Codex reasoned about the module.** Every Claude message named the build-time replacement and the client bundle: "That's a deliberate Next.js pattern, not leftover CommonJS. At build time the env var is replaced with a constant. When i18n is off, the whole branch, `require` included, is dropped, so the i18n code never reaches the browser bundle." (c-claude-1). Codex's forks looked at what evaluating the module would do: "Static named import is safe based on the local module: it has no imports or cycles, and its only top-level initialization is an internal `WeakMap`. … The cache will initialize eagerly instead of on first enabled call, with no externally observable effect in normal execution." (c-codex-3's fork). No Codex message on C mentioned a bundle.
- **c-codex-4 overruled its fork.** Its first message said "A static import would make that eager, so I’ll leave issues 1 and 2 for review and fix the type annotation using the existing type import." Its fork then answered "A static named import preserves the function’s observable behavior and synchronous API. … Replace the type-only `Fn` import with a value import and call `Fn(pathname, locales)`", and the agent kept its own plan.
- **Claude knew where the file came from.** "That's a deliberate Next.js pattern" (c-claude-1), "it matches the upstream Next.js file" (c-claude-pilot). The subject's header names Next.js and the file's path; no run read an installed Next.js or the web (§8).
- **Why the agents kept B's value import separate:** both said neither rule reported it. None mentioned that `prefer-top-level` had made the third declaration, or that one merged `import type` would break `isObject`.
- **No one mentioned Node's type stripping or the rules contradicting each other,** and no one ran `tsc` or a linter (the prompt asks them not to). Codex ran `cat`, `rg` and `apply_patch`; Claude Code read files and, in B, ran `cat` on the diagnostics file through Bash (§8).

## 8. Sessions: tools, commands, exposure, locks

- **Tools.** Claude Code: Read, Edit, Grep, and in all four B runs and the C pilot a Bash `cat` of the diagnostics JSON, which ran although Bash isn't in `--allowedTools` (no call was refused); 3–5 model calls a run; thinking blocks empty. Codex: one `exec` tool that runs a small JavaScript program of shell commands and `apply_patch`, plus `spawn_agent` for its fork; 4–6 model calls a run, and 1–4 reasoning items with empty summaries.
- **What Codex looked at outside the run dir,** as in earlier topics: `AGENTS.md` in every directory above it, up to `/`, or with `rg --files -g AGENTS.md` over the experiment root, whose other run directories were locked. In three runs (b-codex-1, c-codex-2, c-codex-4) it also searched its own memory file, `~/.codex/memories/MEMORY.md`, for the rule names, "type.import" or "Ultracite"; the lines it got back were about unrelated earlier work in the same checkout. The memory files mention nothing about type imports or this experiment, before or after the batch (checked by `grep`).
- **Exposure.** Every tool input was checked against `EXPOSURE_PATTERNS`, and every call outside the run dir was read by hand.
  - **No locked path was read.** No tool call read a locked path, the corpus's type-imports files, a clone, another run, the harness, a scratchpad, the bibliography or a post draft. The `sessionLogs` hits in tool inputs (b-codex-1 2, c-codex-2 1, c-codex-4 2) are the memory-file searches above.
  - **Installed copies of the subjects.** Neither the main checkout's nor this worktree's `node_modules` (the Bun stores and `apps/docs` included) has Next.js or tRPC. The Bun cache (`~/.bun/install/cache`) has Next.js 15.0 and 16.x builds, with `dist/client/normalize-locale-path.js` and `dist/telemetry/flush-telemetry.js`; tRPC isn't installed anywhere. No tool input names any of them.
  - **The run dir's name.** Claude Code's system prompt carries the run dir (`…/ultracite-agent-experiment/type-imports/<run>`), and Codex printed it with `pwd`, so every agent could see the topic's name; the handoff names the rules anyway.
  - **No run printed the environment** or wrote outside its run dir.
- **Locks.** While an agent ran, the standing targets were locked (chmod 000) and restored after each attempt; each batch's snapshot of them was identical before and after, for the pilot and all four rounds (69 targets in the pilot, 394–398 in the rounds). The locked paths were:
  - this harness's folders and every other run;
  - the corpus's type-imports examples, results and calibration, every `type-imports-*` corpus script, the tRPC license copy, and the whole corpus `out/`, `repos/` (history clones included) and `biome-input/`;
  - `research/bibliography/type-imports.md` and the bibliography README;
  - `plans/`, `lint-configs/`, the temp directory's `ultracite-research-*` folders and the other topics' run roots;
  - through `AGENT_EXPERIMENT_EXTRA_LOCKS`: this session's scratchpad (the brief, the corpus run's `TYPE_IMPORTS_TMP` copies under `type-imports-corpus/`, the batch logs, the drafts), the main checkout's `research/corpus/repos`, `research/agent-experiment/plans` and `lint-configs`, the corpus `repos/` and `out/` of the eight other worktrees that have them, 267 files in six other sessions' scratchpads that mention the subjects or the rules, and every task output of this session (58–62 files).

  The pilot ran before the file search worked (macOS's grep reads `-Z` as decompress, so no other session's file was added); its lock list had the folders above but not those files. Neither pilot run read anything outside its run dir but the `AGENTS.md` search. Not locked: `node_modules`, and the session transcripts under `~/.claude/projects` (live; the `sessionLogs` and `orchestratorScratch` patterns check them).
- **Project instructions:** none loaded in any run. The user-level instruction files are empty.

## 9. The pilot

Two runs on C, `c-claude-pilot` and `c-codex-pilot`, are kept in `superseded-runs/` and not aggregated. They used the final setup apart from the lock list's file search (§8) and were re-measured with the final code.

- **Claude wrote the cast** and left both require rules for review, in 36.6 s for $0.47: "Both rules want the `require()` replaced with a top-level ES import. That would change behavior, because the conditional `require()` is there on purpose (it matches the upstream Next.js file)".
- **Codex wrote the static import**, in 35.1 s and 17.7k tokens (and 10.3k in its fork); Ultracite printed "Fixed 3 of 3 issues with Codex." It was the first run to spawn a fork, which is how `run-one.mjs`'s single-log assumption showed up (§1.5).
- **Arms.** The brief allowed raising a cell to six runs if the pilot looked noisy. One run per agent can't show noise, and the pilot's two answers were the two the cells then split between, so every cell has four runs. C × Codex is the one cell that isn't uniform (3 static, 1 cast).

## 10. Issues in Ultracite (not fixed)

1. **C's handoff points every help text at a static import, and Ultracite reports the trap as a fix.** `consistent-type-imports` ("Replace `import()` type annotations with a regular type import"), `node/global-require` ("Move require() to top-level module scope") and `unicorn/prefer-module` ("Prefer ES modules over CommonJS globals.") all report the same line. A static import clears all three, so the three Codex runs that wrote one got "Fixed 3 of 3 issues" and exit 0, while the shared module now loads in every app. Nothing in Ultracite's loop notices an import becoming eager. Next.js turns `disallowTypeAnnotations` off (corpus REPORT §7.12).
2. **`typescript/prefer-ts-expect-error`'s safe fix makes B fail the type check.** It turns tRPC's two `// @ts-ignore` comments into `// @ts-expect-error`. With this tsconfig's lib and target the lines have no error, so `tsc` reports both as unused (TS2578), in every setting. Upstream's comment says the override doesn't work in all environments, which is why it uses `@ts-ignore`: the fix trades a directive that works everywhere for one that fails wherever the line is fine. Biome's pass does the same.
3. **Oxlint can't settle B, and the handoff carries the residue of its own split.** `prefer-top-level` splits upstream's mixed import into a second `import type`, and `no-duplicates` then reports two `import type`s that no Oxlint fix merges, so `ultracite fix` stops with two reports that exist only because of the first fix. ESLint's and Biome's passes settle B in one pass (§5).
4. **Claude Code ran Bash although Ultracite's arguments leave it out.** `agents.ts` says the allowed-tools list keeps the agent to reading and editing and that Bash is denied. With Claude Code 2.1.327, five runs called Bash (`cat` of the diagnostics file) and none was refused, so read-only commands now run in `-p` mode with `acceptEdits`.
5. **Codex's forks aren't in the token count it prints.** Every Codex run spawned a fork that read the files again; the "tokens used" figure on stderr counts the agent's own session only (68,773 fork tokens over 12 runs, uncounted). Not Ultracite's code, but it affects what `ultracite fix --codex` costs.
6. **`no-import-type-side-effects` is what makes Hayden's case harmless in the loop** (§6), and the corpus records that its Oxlint fix becomes a suggestion in the next release (oxc-project/oxc#29491). After that bump, an inline-only import an agent writes would reach the next attempt as a report instead of being rewritten.
7. **Five earlier topics' self-tests fail on the current repo** (§13), before and after this topic's changes alike, for the reasons the nested-ternaries report gives.

## 11. Harness changes

- **`scripts/topics/type-imports.cjs`** (new):
  - subjects and preparation: running `ultracite init --linter oxlint` (and Biome and ESLint) in scratch projects, stripping, the comment check, normalising the whole folder, the run dir's tsconfig, and the checks (every oracle mode, the other files checked against the corpus's through the oracle, B's one-pass handoff);
  - the collect and verify hooks with the handoff filter (per subject: C adds its two require rules);
  - the five lint views and `tsc` in three settings;
  - the oracle wrapper (a scratch examples folder per trace, every mode, which modules evaluated);
  - the edit reading (the import forms, top-level or inline, B's declarations and `isObject`, C's `require` and the branch, casts and local types, everything else that changed);
  - measure, with the Codex forks' session logs read alongside the agent's;
  - the self-test with the corpus variants, the hand-made mutants, the diff.ts port check, the v4 port check and the mirror check;
  - the deterministic paths on the subjects and on every final file, each command repeated until the file settles, with the real adapters;
  - aggregate and tables.

  It imports `type-imports-oracle.cjs` and `type-imports-lib.cjs` unchanged and reads `type-imports-examples.cjs`'s `variantsOf` by compiling the script without its final `main()` call. It sets `TYPE_IMPORTS_TMP` to a real path under its own measurement scratch before loading the corpus library, and removes it and `CORPUS_REPO_LISTS` from the environment again. No corpus file changes, and `examples.json` regenerates as it is.
- **`scripts/ultracite-adapters.cjs`:** a "v4" revision (§1.5), selected by the topic with `ULTRACITE_MIRROR=v4`, and a `jsPluginPackages` export. v1, v2 and v3 are unchanged: their expected hashes, their code paths and their drift against the current CLI are the same as before.
- **`scripts/run-one.mjs`**, both changes behaviour-preserving for earlier topics:
  - `runWithRetries` creates the folder of a subject or run file that sits in one (`telemetry/flush-telemetry.ts`); for a plain name the folder is the run dir, which exists;
  - it keeps every further session log with the run dir as its cwd as `transcript.<k>.jsonl` and claims them, so a Codex agent's forks are measured; with one log, as in every earlier run, nothing changes;
  - v4 is treated as v3 where run-one reads the revision.
- **`harness-tests/type-imports/mutants.json`** (new): 23 corpus variants, 7 also as written, and 16 hand-made mutants, with their expected readings.
- **`.gitignore`:** comments name this topic, and two patterns keep the forks' logs (`attempt*/transcript.*.jsonl` in `runs/` and `superseded-runs/`) out of the repo.
- **The corpus is unchanged.** Its `type-imports-agent-runs.cjs` reads every topic's committed runs, so re-running it now would add this topic's 24 runs (and the 2 pilots) to the counts in corpus REPORT §4.13, which were taken before them.

## 12. Caveats

- **Sample:** 4 runs per subject and agent. Five cells are uniform; C × Codex split 3 and 1, and with the pilot Codex wrote the static import in 4 of 5 C runs. That's enough to say the trap catches Codex often and Claude rarely on this file, not to put a rate on it.
- **The subjects are small,** and two of them are about one line. A, B and C are the corpus's three shapes; a file with several `import()` types, a decorator under emitDecoratorMetadata, or an inline-only import as handed over (once Oxlint's fix becomes a suggestion) might go differently.
- **The handoff is filtered** (§1.4). C's subject reports nothing else, so its handoff is a real project's. A real A would add `func-style` on the same function and a real B eight more issues; with those in front of it an agent might rewrite more.
- **The tsconfig sets verbatimModuleSyntax for all three,** as Next.js does; tRPC doesn't. No agent ran `tsc`, so it didn't matter here, but it decides what `tsc` would have told one about an unmarked type (TS1484).
- **The oracle runs this repo's copies with stubs,** compiled by `ts.transpileModule`. "Loads in every app" is the oracle's evaluation at import in the folder; it doesn't run Next.js's bundler or measure a bundle.
- **The reader judgement is two Claude models on 24 files in six versions.** Rater 1 had seen the runs, rater 2 shares its model family, and no human rated readability.
- **Claude knew the file's origin** from its header and its training; it said so. A file without a known upstream might not get the same reasoning about bundles.
- **The run dir isn't a full project.** It has no `node_modules` or git, and its path names the experiment and the topic, which Claude Code's system prompt shows and Codex printed.
- **The agents were told not to run anything,** and none ran `tsc` or a linter. Codex's sandbox would have allowed it.
- **Reasoning isn't fully logged.** Claude's thinking blocks are empty, and Codex's reasoning summaries are empty, so what each agent understood comes from its messages and its forks'.
- **User-level configuration applied:** Codex's memories (which it searched) and plugins, and Claude Code's settings, plugins and MCP servers. The user-level instruction files are empty.

## 13. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=type-imports       # the topic selects the mirror's v4 itself
node scripts/prepare-subjects.cjs        # subjects/type-imports/ (runs ultracite init for each linter; stripped, checked, normalised; ~20 s)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (49), the diff.ts port (6), the v4 port (14) and the mirror against the CLI (49) -> oracle-self-test.json (~4 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths (30), the passes on the final files (120) and the mutant matrix
node scripts/report-tables.cjs > results/type-imports/tables.md
```

- **Re-measuring without the session logs:** `measure.cjs <run>` re-measures a run from its committed files in about a minute, carrying the session-derived fields and the printed final message over from `measure.json`.
- **This report's runs** set `AGENT_EXPERIMENT_EXTRA_LOCKS` from a wrapper that listed the scratchpad, the main checkout's and the other worktrees' clones and outputs, the other sessions' files that mention the subjects, and this session's task outputs, and checked every target's mode before and after each batch.
- **The hand classification** is an input (`classifications.json`, both raters' labels and reasons). The blind packet and rater 2's raw answers were scratch files.
- **Earlier topics.** Every earlier topic was re-measured, self-tested, re-aggregated and tabulated from its committed runs in this worktree twice: before any shared script changed, and after every change, with the results folders restored to HEAD each time.
  - **Before and after match exactly** (apart from `generatedAt`) for every topic but func-style, and for prompt-revision's comparison. The after-phase aggregates of func-style, nested-ternaries and security-rules were cut off by a `pkill` meant for this topic's own aggregate; they were re-run, and nested-ternaries and security-rules then match.
  - **func-style's self-test isn't deterministic:** its v1 mirror check compares Oxlint's multi-file reports in order, and Oxlint reports files in the order its threads finish. Its failures were 25 before (under the load of four parallel workers) and 22 after (alone); with HEAD's shared scripts put back, two more runs gave 26 and 24, each with a different set of failing mirror comparisons. Its `results.json` and `tables.md` differ only in that count and in three deterministic rows' real-adapter agreement, the same comparison.
  - **No committed run's response, outcome or oracle verdict changes** in any topic.
  - **Self-tests.** cognitive-complexity, floating-promises, security-rules, dead-code, import-cycles, react-effects and nested-ternaries pass. accessibility, todo-comments, sort-keys, length-limits and func-style fail, before and after alike, for the reasons the nested-ternaries report gives.
  - **Against the committed files** every topic shows the drift the nested-ternaries report lists, and two things since: 60a16471 (Ultracite 8.3.0 in func-style's and nested-ternaries' tool versions), and nested-ternaries' `mirroredSlicesDriftNow`, which now names the three slices v4 was added for (f23eb8e8, d0219d34, and 4a32ea73 with the glob commits). `hasSessionLog` where a topic's session logs aren't in this worktree.

## 14. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/type-imports.cjs` | the topic |
| `scripts/ultracite-adapters.cjs`, `scripts/run-one.mjs` | the mirror's v4 revision; run-one's nested run files and Codex fork logs |
| `subjects/type-imports/` | the three subjects as folders (`a/`, `b/`, `c/`, each with its tsconfig); `run-files/` (init's files as the fix pass leaves them); `init/` (what `ultracite init` writes for Oxlint, Biome and ESLint); `init.json`; `subjects.json`. Oxlint's two configs and Biome's are stored with a `.txt` suffix. |
| `harness-tests/type-imports/mutants.json` | 23 corpus variants (7 also as written) and 16 hand-made mutants with their expected readings |
| `results/type-imports/runs/` | 24 runs: meta, handoff, before/after, per-attempt artifacts, `measure.json` |
| `results/type-imports/superseded-runs/` | the pilot (not aggregated) |
| `results/type-imports/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json` | aggregate, tables, hand classification (both raters), self-test, port checks and mirror check |
| `../corpus/scripts/type-imports-oracle.cjs` | the oracle, shared with the corpus |
