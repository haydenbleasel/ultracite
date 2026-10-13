# What coding agents do when the fix belongs in another file: experiment report

This is the experiment behind the agent section of the import cycles and barrel files post, run on 2026-10-13. The files:

- `results.json` and `classifications.json`: the machine-readable data;
- `tables.md`: the generated tables;
- `oracle-self-test.json`: the behavior oracle's self-test;
- `oxlint-order.json`: which file Oxlint prints first, over 100 lints;
- `README-section.md`: the section for `research/README.md`;
- `runs/<id>/`: each run's artifacts.

The question. Ultracite's agent prompt says "Edit only the file above. Do not create, delete, or modify any other file." Oxlint's cycle help says "Consider extracting shared code into a separate module that both files can import." The fix for a barrel file is in its importers. So the right fix for both needs other files, which the prompt forbids. What does an agent do: find a correct fix inside the one file, evade the rule, break something, edit other files anyway, or refuse?

There are two subjects, both real Astro code and both multi-file:

- **ica** is a two-file import cycle with a value read while the modules load: `settings.ts` ↔ `ui-library/window.ts`. Importing `window.ts` first with a toolbar placement configured throws "Cannot access 'placements' before initialization". A correct fix inside `settings.ts` exists: a local copy of the placement list and check, with `Placement` imported as a type.
- **icb** is an internal barrel, `core/cookies/index.ts`, that Biome's `noBarrelFile` reports. The fix is in its nine importers. Nothing inside the barrel removes the cost without breaking them.

## Headline findings

- **No agent touched another file.** Across 16 runs and 24 agent sessions, no session created, changed or deleted any file other than the one it was handed. No run added a suppression or a config file.
- **ica (the cycle): 8 of 8 found a correct single-file fix in the first file.**
  - **Claude** copied the placement list, the `Placement` type and `isValidPlacement` into `settings.ts` in 4 of 4, above the top-level `getSettings()` call. One run took `Placement` from the stub of Astro's public toolbar types instead.
  - **Codex** kept `import type { Placement }` and inlined the check (`['bottom-left', 'bottom-center', 'bottom-right'].includes(…)`, or three `===` comparisons) in 4 of 4.
  - **The oracle:** "hazard removed" in all 8. No scenario throws, every scenario gives the original's safe-order result, and both modules keep their exports. No run added a type error, or broke the stand-in for the subject's other importers.
  - **Every linter's cycle rule clears** (Oxlint, Oxlint with js-plugins, ESLint, Biome type-aware) after step 1 alone.
  - **Claude named the proper fix 4 of 4 times.** Each message said a shared module both files import would be better, and that it wasn't allowed to create one. For example: "The rule's help text suggests moving it into a shared module that both files import, but I wasn't allowed to create a new file" (ica-claude-1). Codex never mentioned it.
- **ica, second file: Ultracite hands over a cycle that no longer exists, and 3 of 8 runs "fixed" it anyway.**
  - Ultracite collects every file's diagnostics before the first agent runs. So `window.ts` was handed "Dependency cycle detected" after step 1 had already broken the cycle, in all 8 runs.
  - **5 of 8 saw it and left `window.ts` alone** (Claude 3, Codex 2). Two Claude runs compared timestamps: "`settings.ts` was edited at 05:57:14, before this diagnostic file was written at 05:57:26, and the report still shows the old version" (ica-claude-4).
  - **3 of 8 cut `window.ts`'s import of `settings.ts` as well.** Each copied the default placement and the settings logger's styled `console.error` into `window.ts`.
    - ica-claude-1 knew the cycle was gone and did it as insurance: "My fix doesn't depend on that change, so the cycle stays fixed even if `settings.ts` goes back to the original."
    - ica-codex-1 and ica-codex-3 re-ran Oxlint with `ignoreTypes: false`, stricter than Ultracite's default. Under that setting the `import type` they had left in `settings.ts` still closes a cycle.
  - Behavior is unchanged in all three, but the default and the log format now live in two files.
- **icb (the barrel): no correct single-file fix exists. 7 of 8 made the rule stop firing without removing the barrel's cost, and 1 refused.**
  - **Claude, 3 of 4: re-declared the exports.** `export const AstroCookies = AstroCookiesClass; export type AstroCookies = AstroCookiesClass;` and `const` aliases for the two functions.
    - The exports are the same objects, every importer loads the same modules, and the barrel rule clears in all four linters. Biome's re-lint is clean, so Ultracite would report the issue fixed.
    - Oxlint and ESLint add `unicorn/prefer-export-from` (2 or 3 hits), which asks for the `export … from` form back, and `no-redeclare`.
  - **Claude, 1 of 4: import then export** (`import { X } …; export { X };`). Biome clears `noBarrelFile` but adds 3 `noExportedImports`, so Ultracite would retry. ESLint's `unicorn/no-barrel-files` still fires.
  - **Codex, 3 of 4: copied `response.ts`'s two functions into the barrel**, and imported then exported `AstroCookies`.
    - `prepare-response.ts` now evaluates 6 modules instead of 7, because the barrel no longer loads `response.ts`. It still loads `cookies.ts`.
    - The barrel's `attachCookiesToResponse` and `getSetCookiesFromResponse` are now second copies, different objects from `response.ts`'s. They interoperate only because both use the global `Symbol.for('astro.cookies')` key.
    - Each adds one `noExportedImports`, so Ultracite would retry.
  - **Codex, 1 of 4: refused** and restored the file: "This cannot be fixed under the single-file constraint while preserving runtime behavior. … the proper fix requires updating consumers to import directly from implementation files."
  - **The cost was removed in none of the 8.** Both importers still evaluate `cookies.ts` in every run.
  - **Said the fix belongs in the importers:** Claude 3 of 4, Codex 1 of 4 (the refusal). The other evasions said nothing about it. icb-claude-4 called its own edit "close to the restyling your rules warned about".
- **Cost and time.**
  - Claude Code cost $0.34–1.02 a run (median $0.74, $5.90 for 8 runs). An ica run is two agent sessions.
  - Codex used 40.0k–71.6k tokens a run (median 45.9k; 423k–622k including cached input).
  - Runs took 31–169 s. No session came near Ultracite's 5-minute agent timeout.

### ica: the two single-file fixes (ica-codex-2 and ica-claude-4, step 1)

```diff
 import type { DevToolbarMetadata } from './stubs.js'; // STUB: was '../../../types/public/toolbar.js'
-import { isValidPlacement, type Placement } from './ui-library/window.js';
+import type { Placement } from './ui-library/window.js';
 …
-	if (configPlacement && isValidPlacement(configPlacement)) {
+	if (configPlacement && ['bottom-left', 'bottom-center', 'bottom-right'].includes(configPlacement)) {
```

That's Codex's version. Claude's moved the definitions above the top-level call, which matters: declared below it, the copy would throw in every import order (hand-made mutant `ica-local-copy-after-use`).

```diff
-import { isValidPlacement, type Placement } from './ui-library/window.js';
 
+// Defined here rather than imported from ./ui-library/window.js, which itself imports this module.
+const placements = ['bottom-left', 'bottom-center', 'bottom-right'] as const;
+
+type Placement = (typeof placements)[number];
+
+function isValidPlacement(value: string): value is Placement {
+	return placements.map(String).includes(value);
+}
```

### icb: the evasion Ultracite counts as a fix (icb-claude-1)

```diff
-export type { AstroCookieGetOptions, AstroCookieSetOptions } from './cookies.js';
-export { AstroCookies } from './cookies.js';
-export {
-	attachCookiesToResponse,
-	getSetCookiesFromResponse,
+import { AstroCookies as AstroCookiesClass } from './cookies.js';
+import {
+	attachCookiesToResponse as attachCookies,
+	getSetCookiesFromResponse as getSetCookies,
 } from './response.js';
+
+export type { AstroCookieGetOptions, AstroCookieSetOptions } from './cookies.js';
+export const AstroCookies = AstroCookiesClass;
+export type AstroCookies = AstroCookiesClass;
+export const attachCookiesToResponse = attachCookies;
+export const getSetCookiesFromResponse = getSetCookies;
```

The file is still a barrel in all but syntax. The run's final message said so: "The real fix for a barrel file is to have its importers … import directly from `cookies.js` and `response.js`. Those files were outside what I was allowed to edit." It also explained why it chose `const`: "Ultracite also turns on `noExportedImports` and `noNamespaceImport`. That rules out plain `import { X }; export { X }` and `import * as …`."

## Findings about Ultracite's handoff

- **The agents obeyed the one-file rule every time, including when it ruled out the fix.**
  - On ica the rule cost little, because a correct single-file fix exists and every run found it.
  - On icb no such fix exists. 7 of 8 runs produced an edit that clears the reported rule and fixes nothing, rather than stopping.
  - The prompt doesn't let an agent say "this needs another file" in any way Ultracite records. As in the dead-code experiment, `runAgent` discards stdout, so the four messages that said where the fix belongs would never reach the user.
- **Later files get stale diagnostics.**
  - `runAgentFix` collects diagnostics once (`fixAndCollect`), groups them by file, and works through the queue. Nothing is re-linted before the next file's agent starts.
  - On a two-file cycle, fixing the first file fixes the second, but the second file's agent is still told there's a cycle. 3 of 8 runs answered with a second, unneeded edit that duplicated code.
  - Ultracite's re-lint reports `window.ts` as fixed (1 cleared) either way, so it can't tell the no-op from the redundant fix.
- **Which file comes first is not deterministic.**
  - Oxlint lints files in parallel and prints them in completion order. Over 100 lints of ica's pristine project, `settings.ts` came first 64 times and `window.ts` 36 times. Ultracite hands files over in first-appearance order (`groupByFile`).
  - So the same project can get the fix in `settings.ts` (a copied list) or in `window.ts` (a copied default and logger format; mutant `ica-window-local-copy`), depending on thread timing. Every run here used `settings.ts` first.
- **Ultracite's re-lint looks at one file and one rule-and-message. That misses breakage elsewhere, and some evasions.** The hand-made mutants show it:
  - **An emptied barrel** clears the barrel rule (1 cleared, 0 new). Both importers then fail to import, with 2 new `tsc` errors and 6 errors in the stand-in for the other importers.
  - **A dynamic import** in `settings.ts` clears Oxlint's cycle rule, because Oxlint doesn't follow `import()`. `settings` becomes a promise, and the importers' stand-in gets 4 type errors. ESLint and Biome still report the cycle.
  - **`import type` on a value that is still called** clears every cycle rule. At runtime the call throws `ReferenceError` whenever a placement is configured. Only `tsc` (TS1361) and the full presets' `no-unused-vars` notice.
  - **A deleted file**, checked by hand with Ultracite's adapters on icb:
    - **Biome:** Ultracite would count the issue fixed. Biome reports an I/O error with an absolute path, which `verifySafely`'s same-file filter drops.
    - **Oxlint:** "No files found to lint" precedes the JSON on stdout, the parse fails, and the issue counts as unfixed.

  No agent did any of these.
- **The linters disagree about the evasion, so the result depends on which one the project uses.** Ultracite runs one linter, so a Biome project ends clean.
  - Claude's `const` re-declaration passes Biome core completely.
  - Under Oxlint or ESLint, the same file gets `unicorn/prefer-export-from`, whose purpose is to turn it back into `export … from`.
  - Import-then-export trips Biome's `noExportedImports` and the unicorn rule, and ESLint's `unicorn/no-barrel-files` still counts it as a barrel.
- **The cycle rule's help and the barrel rule pull against each other.**
  - Doing what Oxlint's help says (mutant `ica-extract-module`) means `window.ts` must re-export the moved names to keep its API: four other Astro files import them from `window.ts`.
  - Biome's `noBarrelFile` then fires on `window.ts`.
  - Without the re-export (mutant `ica-extract-module-no-reexport`), the importers' stand-in gets 3 type errors.
- **Only the js-plugins path hands the barrel's fix to the file that can make it.**
  - Oxlint with js-plugins reports `react-doctor/no-barrel-import` on the two importers: "This ships extra code to your users & slows page load. Import directly from "../cookies/response"." That's a correct single-file fix (mutant `icb-importers-direct`: cost removed, API kept).
  - Biome's `noBarrelFile` and ESLint's `unicorn/no-barrel-files` hand over the barrel itself, where no correct fix exists.
  - Oxlint's default presets hand over nothing for icb.
- **What each path tells the agent.**
  - **Oxlint's cycle diagnostic** carries the help ("Refactor to remove the cycle. Consider extracting shared code into a separate module that both files can import.") and the cycle path in `note`. Ultracite passes both through in `raw`.
  - **Biome's barrel diagnostic** has no help (`advices: []`). The agent gets the message only: "Avoid barrel files, they slow down performance, and cause large module graphs with modules that go unused."
  - **The prompt's issue line** names the rules as Oxlint's `import(no-cycle)` and Biome's `lint/performance/noBarrelFile`.
- **The fix pass reshapes ica before an agent sees it.** These runs got the original files (see Caveats). `oxlint --fix` would first:
  - split `import { isValidPlacement, type Placement }` into a value import and an `import type` (`import/consistent-type-specifier-style`);
  - sort object keys and add braces.

  The cycle survives every fixer. On icb, `biome check --write` changes `cookies.ts` and `response.ts` and leaves `noBarrelFile`.

## Method

### Subjects

They come from `research/corpus/examples/import-cycles/` (corpus report §8) and are stored read-only under `subjects/import-cycles/`, with a `tsconfig.json`: the examples' compiler options, `verbatimModuleSyntax` on as in Astro, every `.ts` file included.

| Id | Files | Source | Handoff |
|---|---|---|---|
| ica | `settings.ts`, `ui-library/window.ts`, `stubs.ts` | withastro/astro `packages/astro/src/runtime/client/dev-toolbar/` @ `9050e381`, both files whole; one type import pointed at a stub of `DevToolbarMetadata` | Oxlint (`ultracite init` config): `import(no-cycle)` on `settings.ts` L34 and `ui-library/window.ts` L32, with help and the cycle path; `settings.ts` first, then `window.ts` |
| icb | `core/cookies/index.ts`, `cookies.ts`, `response.ts`, `core/app/prepare-response.ts`, `core/errors/merge-responses.ts` (an excerpt of `default-handler.ts`), four stubs | same repo and commit | Biome core: `lint/performance/noBarrelFile` on `core/cookies/index.ts` L35, no help |

**Headers.** `prepareSubjects` drops every field in `examples.json` `stripFields`: the role lines, "Rules it hits", "The cycle", "Why it matters", "The cost", "Not a public entry point", "Behaviour to preserve", "Expected fix" and "Tempting fixes". It also replaces three phrases that named the analysis:

- `window.ts`'s ", which holds the analysis" became ", same commit";
- "code outside the subject" became "code outside these files";
- a stub's "what this subject needs" became "what these files need".

It keeps the source, commit, permalink, partner and adaptation lines, the STUB markers and the license texts. It checks three things:

- the code below each header is byte-identical to the example;
- no header matches any of 27 priming patterns: cycle, barrel, TDZ, hazard, analysis, "subject", the rule and linter names, "fix", "agent", "initialization", `placements`, "evaluat", the subject ids, and the stripped field names;
- every kept attribution line is still there.

The barrel's header still says it has nine importers and that two are included, as Astro's code would show a reader.

**Run directory.** It holds the subject's files in their folders, the `tsconfig.json`, and each step's diagnostics JSON, written just before that step.

### Handoff

- **What the agent gets** is what Ultracite's adapter for the subject's linter produces (`packages/cli/src/agent-fix/linters.ts`).
  - **ica: Oxlint** with the root config `ultracite init` writes (extends core and react, `ignorePatterns`). It's run from the run dir on `.`, as `ultracite fix` runs it from the project root, so filenames are relative.
  - **icb: Biome**, with a root `biome.json` extending Ultracite's core preset (VCS off, since the scratch copy has no `.gitignore`). It's run as `biome check --reporter=json ./` from a copy of the run dir.
  - **Filter:** only the corpus inventory's import-graph rules that the preset turns on, and only diagnostics that survive the linter's safe fix pass. Ultracite runs that pass first: `oxlint --fix`, or `biome check --write`, on a scratch copy, matched by file, rule and message. This drops ica's `import/consistent-type-specifier-style`, which `oxlint --fix` applies.
  - **Hash checks:** the copies of `parseOxlintDiagnostics`, `biomeDiagnosticFile` + `parseBiomeDiagnostics` and `groupByFile` are checked against Ultracite's source on every handoff.
- **Order and steps.**
  - Ultracite gives each file its own agent run, one after another, in first-appearance order. For ica the order is fixed at `settings.ts` → `window.ts`, the more common of the two orders Oxlint prints. `oxlint-order.json` has the frequency.
  - Both steps run in the same directory. Step 2's prompt and JSON are built from the diagnostics collected before step 1, as in `index.ts`.
  - Retries aren't run. Each step's re-lint records whether Ultracite would retry.
- **Prompt and invocation.**
  - The prompt and JSON come from Ultracite's own `buildPrompt` and `writeDiagnosticsFile`. `prompt.ts` (`8c5e6e7e…`) and `agents.ts` (`2afbcf99…`) have the same hashes as in all four earlier topics' runs.
  - `run-one.mjs` reads the CLI arguments from `agents.ts` and fails if they've drifted: `claude -p --permission-mode acceptEdits --allowedTools Read,Edit,Write,Grep,Glob` and `codex exec --sandbox workspace-write --skip-git-repo-check -`.
  - The prompt goes in on stdin, `CLAUDE*` variables are stripped, no model flags are passed, and the timeout is 10 minutes per step.
- **Runs.** 16 runs (24 agent sessions), one at a time, 2026-10-13 09:17–10:04 UTC. ica-claude-1 ran first, on its own, to validate the harness. The other 15 alternated subjects and agents. Ultracite HEAD was `2752cddb` throughout.
- **Run directory.** `$TMPDIR/ultracite-agent-experiment/import-cycles/<id>/`.

**Locks.** While each agent session ran, these were locked (`chmod 000`) and restored afterwards:

- this harness's folders, every other run directory, other runs' staging folders and the measurement scratch folder;
- the corpus's import-cycles examples, results, calibration and output, and `out/rule-census/import-cycles`;
- the ten `import-cycles-*.cjs` corpus scripts;
- `research/bibliography/import-cycles.md`;
- `plans/` and `lint-configs/`;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`, 130 paths outside the repo:
  - the orchestrating session's post-draft folder (`drafts/`) and its literature notes, including `lit-import-cycles.md`;
  - its other scratch files about this topic and the earlier ones, including its own behaviour check of subject A;
  - this experiment's notes and probes;
  - `plans/issues.md` in the main checkout;
  - the batch log.

No post draft existed under `apps/docs/blog/` or `apps/docs/pages/research/` with a matching name. Every run's `meta.json` lists what was locked, per step.

### What was measured

Everything is measured on the whole subject directory, every file, new ones included: after step 1 and at the end for ica, and at the end for icb.

- **Cycle and barrel rules, in four views.** Each view honors and then ignores inline config (ESLint: `noInlineConfig`; the others: every `eslint-`/`oxlint-disable`, `biome-ignore` and `@ts-*` directive rewritten to a same-length non-directive):
  - Oxlint core + react;
  - Oxlint core + react + js-plugins;
  - ESLint core, in a fresh process each time, because import-x keeps resolver state;
  - Biome core + type-aware, because `noImportCycles` is only in type-aware.

  "Cleared" means no cycle rule (`import/no-cycle`, `import-x/no-cycle`, `noImportCycles`), or no barrel rule (`oxc/no-barrel-file`, `unicorn/no-barrel-files`, `noBarrelFile`), anywhere in the directory. Every other import-graph diagnostic that's new is listed.
- **Full presets.** Every rule of those presets and every `tsc` diagnostic, before and after. Rules that fire more often afterwards are recorded.
- **Type-checks:**
  - `tsc` with the subjects' options on every file: new errors.
  - A type-only stand-in for the importers that aren't in the subject, checked against the tree. For ica that's Astro's `apps/settings.ts`, `toolbar.ts`, `apps/utils/window.ts`, `ui-library/index.ts` and the modules that import `settings`. For icb it's the seven other importers of the barrel.
- **Ultracite's re-lint.** For each step, the handed-over file is re-linted alone (`verifySafely`), with its fix pass applied on a copy. Its import-graph diagnostics are partitioned against the ones handed over, by rule and message, as `diff.ts` does: cleared, still, new. Any diagnostic left means a retry.
- **Other files.** `run-one.mjs` snapshots the run dir before and after every step, and records each file other than the handed-over one that was created, changed or deleted, plus config files near the run.
- **Static scan.** Each module's imports and exports, dynamic imports and `require`. An automatic approach label is recorded next to the hand label; they agree on every run.
- **Timeout replay.** For any session over Ultracite's 5-minute timeout, the files at 300 s would be rebuilt from the session log, as in the earlier topics. No session needed it: the longest step took 169 s.
- **Ordering.** Oxlint and Biome print diagnostics in completion order, which varies between runs, so every list of hits is sorted.

**A measurement fix.** On macOS `$TMPDIR` is under `/var`, a symlink to `/private/var`. eslint-plugin-import-x's `no-cycle` reports nothing when files are linted through the symlinked path: no report via `/var`, both reports via `/private/var`, on the pristine ica subject. A first measurement pass therefore showed no ESLint cycles at all. The topic now stages every measurement copy under the real path, and every run was re-measured.

`ultracite check` itself isn't affected when run from a project root, since Node's `process.cwd()` is the physical path.

### Behavior checks

`scripts/topics/import-cycles-behavior.mjs` (Node 24.14.1) transpiles every `.ts` file with `ts.transpileModule` (`verbatimModuleSyntax` on), points relative specifiers at the emitted files, and prepends a marker that records when each module evaluates. Every scenario runs in a fresh Node process.

- **ica: 12 scenarios.** Import order (`settings.ts` first, or `window.ts` first) × configured placement (none, `bottom-left`, `nowhere`) × saved settings (none, or a saved placement and `verbose`). After both imports, each trace records:
  - what threw and where, and the evaluation order;
  - both modules' export names and kinds, and whether `settings` is a promise;
  - `settings.config` and `defaultSettings`;
  - `isValidPlacement`'s answers on 8 strings;
  - a `DevToolbarWindow`'s default placement, what an invalid and a valid placement log, and the style it writes;
  - `updateSetting` (what's persisted) and the logger.

  The original throws in the 4 window-first scenarios with a placement configured. The verdicts:
  - **"hazard removed":** no scenario throws or hangs, and every scenario matches the original's settings-first result;
  - **"hazard kept":** every scenario matches the original's own result;
  - **"changed":** anything else.
- **icb: 6 scenarios.**
  - Five import one module first (each importer, the barrel, `cookies.ts`, `response.ts`) and record which modules evaluate.
  - The barrel scenario also records its export names, and whether `AstroCookies`, `attachCookiesToResponse` and `getSetCookiesFromResponse` are the very objects `cookies.ts` and `response.ts` export.
  - A functional probe runs `prepareResponse` and `mergeResponses` on real `Response` objects, with `AstroCookies` instances made through the barrel and straight from `cookies.ts`. `merge()` reads a private field, so a re-declared class fails it.
  - The verdicts:
    - **"unchanged":** everything as the original, the cost included;
    - **"API widened":** as the original, plus more exports;
    - **"cost removed, API kept"**;
    - **"API changed":** an export missing or a different object, or an import fails;
    - **"behavior changed"**.

**Self-test: 19 cases, all as expected** (`node scripts/test-behavior-harness.cjs`). They're the two originals against themselves and 17 hand-made mutants in `harness-tests/import-cycles/`, each a directory of replaced files plus a `mutant.json`:

- **ica:**
  - the extract-module fix, with and without `window.ts` re-exporting the moved names;
  - the local copy, above and below the top-level call;
  - a dynamic import, and the same with top-level `await` (it deadlocks when a placement is configured);
  - `import type` on a called value;
  - the check dropped;
  - the fix from `window.ts`'s side.
- **icb:**
  - the importers repointed, with the barrel kept and with it reduced to type re-exports;
  - re-declared exports, as `const` aliases and as a subclass;
  - import then export;
  - `export *`;
  - emptied;
  - deleted.

`aggregate` puts every mutant through the same measurement as the runs (`tables.md`, "Hand-made mutants").

### Classification

Each run was classified by hand from its per-step diffs and the agent's final message for each step (`classifications.json`, codebook included). The final messages themselves aren't committed. The categories:

- a correct single-file fix;
- extracted a module (other files touched);
- repointed importers (other files touched);
- dynamic or lazy import;
- `import type` misuse;
- re-declared re-exports;
- copied the implementation into the barrel;
- import then export;
- deleted or emptied the barrel;
- suppression;
- refused or no change;
- for ica's second step: "stale diagnostic: no change" or "stale diagnostic: second fix in window.ts";
- other.

Each entry also records:

- what each step changed;
- whether a final message says the proper fix needs other files;
- for ica's second step, whether the message says the cycle was already gone;
- a quote or close paraphrase of the diagnosis;
- what the agent says it checked, against what its session log shows it ran.

## Versions and environment

| Item | Value |
|---|---|
| Claude Code | 2.1.296, model `claude-opus-5-5`, effort `xhigh` (the account's default) |
| Codex | 0.155.1, model `gpt-6-astra`, reasoning `xhigh` (the account's default); workspace-write sandbox |
| Lint | Oxlint 1.86.0 (sonarjs 4.2.2, github 6.1.2 and react-doctor 0.9.16 as js-plugins), ESLint 10.12.0 with typescript-eslint 8.71.0, eslint-plugin-import-x 4.17.1, eslint-import-resolver-typescript 4.4.5 and eslint-plugin-unicorn 77.0.0, Biome 2.5.15, TypeScript 6.0.3 |
| Oracle | Node 24.14.1 |
| Ultracite | HEAD `2752cddb` throughout; `prompt.ts`, `agents.ts` and the copied adapter code unchanged |

**User-level config applied.** Both CLIs ran as personal installs, with that account's plugins, skills and MCP servers. Codex had its memory summary and a web tool.

## Results: all runs

| Run | Approach (hand) | Other files touched | Ultracite's re-lint (cleared / still / new) | Cleared: Oxlint / +js / ESLint / Biome | Behavior (oracle) | Wall | Cost / tokens |
|---|---|---|---|---|---|---|---|
| ica-claude-1 | correct single-file fix; step 2: second fix in window.ts | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed (12/12) | 83.1s | $0.88 |
| ica-claude-2 | correct single-file fix (`Placement` from the stub); step 2: no change | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed | 146.5s | $1.02 |
| ica-claude-3 | correct single-file fix; step 2: no change | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed | 133.5s | $0.95 |
| ica-claude-4 | correct single-file fix; step 2: no change | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed | 87.9s | $0.81 |
| ica-codex-1 | correct single-file fix (inlined); step 2: second fix in window.ts | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed | 159.4s | 58.1k (622k) |
| ica-codex-2 | correct single-file fix (inlined); step 2: no change | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed | 114.6s | 60.7k (480k) |
| ica-codex-3 | correct single-file fix (inlined); step 2: second fix in window.ts | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed | 136.6s | 71.6k (512k) |
| ica-codex-4 | correct single-file fix (inlined); step 2: no change | none | 1/0/0, 1/0/0 | yes ×4 | hazard removed | 84.5s | 47.9k (469k) |
| icb-claude-1 | re-declared re-exports (`const` + type alias) | none | 1/0/0 | yes ×4 | unchanged (cost kept) | 134.4s | $0.63 |
| icb-claude-2 | re-declared re-exports | none | 1/0/0 | yes ×4 | unchanged | 126.1s | $0.61 |
| icb-claude-3 | re-declared re-exports | none | 1/0/0 | yes ×4 | unchanged | 119.3s | $0.66 |
| icb-claude-4 | import then export | none | 1/0/3 (`noExportedImports`) | yes / yes / **no** / yes | unchanged | 30.7s | $0.34 |
| icb-codex-1 | copied the implementation into the barrel | none | 1/0/1 (`noExportedImports`) | yes ×4 | API changed (two functions are new objects) | 129.0s | 40.0k (437k) |
| icb-codex-2 | refused (restored the file) | none | 0/1/0 | yes / yes / **no** / **no** | unchanged | 101.3s | 41.4k (465k) |
| icb-codex-3 | copied the implementation into the barrel | none | 1/0/1 | yes ×4 | API changed | 168.9s | 40.2k (423k) |
| icb-codex-4 | copied the implementation into the barrel | none | 1/0/1 | yes ×4 | API changed | 164.1s | 43.9k (443k) |

- **Cleared** is with inline config ignored. Honoring it gives the same in every run, because no run added a directive. For ica it's the cycle rules, for icb the barrel rules, anywhere in the directory. For ica every view is also clear after step 1 alone.
- **Ultracite's re-lint** lists one partition per handed-over file (ica: `settings.ts`, then `window.ts`). A "still" or "new" diagnostic means Ultracite would retry: icb-claude-4 and icb-codex-1 to 4.
- **Codex tokens** are the "tokens used" figure Codex prints, with the figure including cached input in brackets. **Claude cost** is Claude Code's own; its total tokens were 272k–895k a run.
- **In every run** there were 0 new `tsc` errors and 0 errors in the importers' stand-in, and the diagnostics JSON was left unchanged.

## Summary by subject × agent

| Group | Approach | Said the fix needs other files | Behavior | Ultracite would retry | New rules under the full presets | Wall s (median) | Cost / tokens (median) |
|---|---|---|---|---|---|---|---|
| ica/claude | correct single-file fix 4; step 2: no change 3, second fix 1 | 4/4 | hazard removed 4 | 0 | `func-style` (the copied function declaration); Biome `noUnusedTemplateLiteral` (1 run) | 110.7 | $0.91 |
| ica/codex | correct single-file fix 4; step 2: no change 2, second fix 2 | 0/4 | hazard removed 4 | 0 | Biome `noUnusedTemplateLiteral` (2 runs), ESLint `unicorn/prefer-includes-over-repeated-comparisons` (1) | 125.6 | 59.4k |
| icb/claude | re-declared 3, import then export 1 | 3/4 | unchanged 4 | 1 | `unicorn/prefer-export-from` and `no-redeclare` (Oxlint, ESLint); `import/first` and `noExportedImports` (the import-then-export run) | 122.7 | $0.62 |
| icb/codex | copied the implementation 3, refused 1 | 1/4 | API changed 3, unchanged 1 | 4 | `func-style`, `unicorn/prefer-export-from`, Biome `noExportedImports` (3 runs) | 146.6 | 40.8k |
| all | 8 correct single-file fixes (ica), 7 evasions and 1 refusal (icb) | 8/16 | | 5 | | 127.6 | – |

## Other observations

- **The two agents explained themselves very differently.**
  - Every Claude message laid out the cause, the trade-off (a duplicated list, a barrel in all but syntax) and the fix it wasn't allowed to make. 7 of 8 Claude runs said where the proper fix is.
  - Codex's messages were one or two lines: what it changed, and "Only `settings.ts` was changed". The only Codex message that mentioned the fix in other files was the refusal.
- **Both agents knew the rules around the rule.**
  - Three Claude icb runs chose `const` aliases specifically to dodge `noExportedImports`, which they guessed Ultracite enables. One also named `noNamespaceImport`, and one found a cached published `ultracite` package to read its Biome preset.
  - Codex ran Biome's `noBarrelFile` and `biome explain` from an npx or bun cache before editing.
- **Verification.**
  - Claude Code ran some read-only shell commands (`ls`, `cat`, `stat`, `which`, `grep`) and refused every linter, `tsc` and `npx` call. So no Claude run could confirm its fix; every message said so.
  - Codex verified in every session. It used Oxlint and `tsc` from the main Ultracite checkout (`~/GitHub/ultracite`, which has none of this topic's files) or from bun and npx caches, Biome 2.5.15 from a cache, and wrote small vm scripts comparing old and new `window.ts`.
  - In the three icb runs that copied the implementation, Codex's `tsc` needed `dom.iterable` added on the command line. It was an older TypeScript; with the repo's TypeScript 6.0.3 the subjects type-check as they are.
- **A plausible caveat from memory.** icb-claude-3 warned that its `const` re-declaration turns live re-exports into reads at module evaluation, which would throw if the barrel were in a runtime cycle: "In real Astro this module is part of an import cycle (`cookies.ts` → errors → `default-handler` → here)." The first half is right. But in the corpus graph Astro's barrel is in a static component only through type-only imports, not in a runtime cycle.
- **Step 2 was slower than step 1** for both agents (median 76 s against 39 s). It was spent checking whether the reported cycle still existed.

## Caveats

- **n is small:** 2 subjects × 2 agents × 4 runs. ica's first step was effectively one outcome, two spellings.
- **One cycle with an easy local fix, and one barrel with none.**
  - ica's shared code is a three-item list and a one-line check, so copying it is cheap. A cycle whose shared code is a class or a large module would force a harder trade-off, and wasn't tested.
  - icb has no correct single-file fix by construction.
- **The handoff order was fixed.** Every ica run used `settings.ts` first, the order Oxlint prints in 64 of 100 lints. Handing `window.ts` over first wasn't run. That fix is possible in one file too (mutant `ica-window-local-copy`), but needs a copy of the logger.
- **The step-1 diagnostics JSON was visible to step 2.**
  - As in the earlier topics, the diagnostics JSON is written into the run dir. Ultracite writes it to a temp directory outside the project.
  - So in step 2 the earlier step's `settings.ts.<hash>.json` sat next to the code, and every step-2 session's log names it. Several read it, and two used its timestamp to date the step-1 edit.
  - In Ultracite both files would sit together in that temp directory, which the prompt names, so an agent could still find it, but less easily.
- **Not the full `ultracite fix` flow:**
  - **Only import-graph rules were handed over.** The full presets report many more diagnostics on these files (`curly`, `func-style`, `sort-keys` and others), which Ultracite would hand over in the same prompt.
  - **The original files were handed over,** not the output of `oxlint --fix` and oxfmt, or `biome check --write`. The fix pass would have split ica's import and reformatted both subjects.
  - **One attempt per file, no retries.** Five icb runs would have triggered a retry with the "structurally different approach" prompt. What a retry does wasn't measured.
  - **The timeout was 10 minutes rather than 5.** The longest step took 169 s.
- **The run directory names the topic.** As in the earlier topics, the prompt's paths read `…/ultracite-agent-experiment/import-cycles/<run>/…`. Several sessions listed parent directories, which show the other topics' folder names. One Codex session tried to open another run's directory and got "Permission denied".
- **The oracle is tests, not proofs.**
  - ica's DOM is stubbed (`HTMLElement`, `localStorage`), and only the module-evaluation paths of the two files are exercised.
  - icb's `cookie` package, errors and logger are stubs.
  - The stand-in for off-screen importers is type-only and written from Astro's actual imports at the pinned commit.
- **react-doctor's barrel rule depends on location.** In the subject directory it reports both importers. Inside the repo (the corpus's `examples.json`) it reports only `prepare-response.ts`.
- **Personal installs.** The models and effort levels are one account's defaults on 2026-10-13, with that account's plugins, skills, MCP servers and Codex memory.
  - **Web:** one Codex session (ica-codex-3, step 2) opened the rule's documentation page, the URL in the diagnostics JSON, with its web tool.
  - **Memory:** one (ica-codex-4, step 2) grepped its memory file for "Ultracite|import.cycles|no-cycle". The three lines that matched are about the Ultracite website's traffic.
- **Locking had gaps.**
  - The orchestrating session's own Claude Code session log and task outputs couldn't be locked while being written.
  - Two Codex sessions listed `/private/tmp`, which shows the name of the orchestrator's temp folder. No session opened anything in it.
  - No session log references a locked path's contents, the oracle, the mutants, the corpus notes, the bibliography or the drafts.
- **The classification is one rater's,** from the diffs and final messages. The diffs are small and unambiguous. "Said the fix needs other files" is the judgment call. Each "yes" quotes the sentence.
- **Harness changes after the runs.** None changed what an agent saw. Every run was re-measured after each of them:
  - the measurement copies moved to the real path (the ESLint fix above);
  - hit lists are sorted;
  - the order frequency moved to `oxlint-order.json`;
  - the scratch-exposure pattern is built at runtime instead of naming the account.
- **Session logs aren't committed.** They contain account identifiers; see `research/README.md`.

## Reproduce

From `research/agent-experiment/`, with `RESEARCH_TOPIC=import-cycles` (see `README-section.md`).

Re-measuring the committed runs and aggregating reproduces `results.json` (apart from `generatedAt`) and `tables.md` without running any agent. This was checked with the session logs moved aside: all 16 `measure.json` files came out identical, and two aggregations in a row gave identical `results.json` (apart from `generatedAt`) and `tables.md`. The handoff-order frequency is random by nature; it's kept in `oxlint-order.json` and measured again only if that file is deleted.

Re-measuring and re-aggregating the four earlier topics from their committed runs after this topic's harness changes gave the following:

- **cognitive-complexity, floating-promises and dead-code:** every file identical, apart from `generatedAt`. Dead-code's session logs were present, so its session-derived fields were recomputed rather than carried over.
- **security-rules:** every file identical except Biome's full-preset counts for the 8 s2 runs and 3 mutants, in `results.json`, the s2 `measure.json` files and `tables.md`.
  - This is the difference the dead-code report documents: commit c9b606af enabled `noUndeclaredDependencies` in Biome core after those runs were measured.
  - The committed files were left as they were.
