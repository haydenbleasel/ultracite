# What coding agents do with a dead-code lint error: experiment report

This is the experiment behind the agent section of `/research/dead-code`, run on 2026-10-13. The files:

- `results.json` and `classifications.json`: the machine-readable data;
- `tables.md`: the generated tables;
- `oracle-self-test.json`: the behavior oracle's self-test;
- `README-section.md`: the section for `research/README.md`;
- `runs/<id>/`: each run's artifacts.

The question: when an agent gets an unused-variable or dead-store error, does it fix the problem the dead code points to, delete the dead code, or silence it? And does the answer depend on whether the dead code is a leftover or the symptom of a bug? There are three subjects, all real code:

- **dc1** is a dead store that is the symptom of a bug. Using the value fixes it.
- **dc2** is a leftover dead store, reported by ESLint. Deleting it is right.
- **dc3** is a leftover unused local, reported by Oxlint with its "start with a '_'" message. Deleting it is right.

## Headline findings

- **The agents deleted the dead code in 23 of 24 runs. Nobody silenced it.**
  - No run renamed a binding to `_x`, wrote `void x;` on it, added a suppression comment or a config file, or touched another file.
  - No run "used" a leftover to make the warning go away.
  - Every run cleared every linter's view of the dead binding, `tsc` included.
  - Every run kept the exported names and types, with 0 new type errors.
- **dc1 (the bug): 1 of 8 runs fixed it. 7 deleted the symptom and kept the bug.**
  - **Claude named the bug in 4 of 4 final messages.** Each one said the resolver's launch is thrown away and that the substitution should probably take `launch`.
    - **3 of those 4 then deleted the initializer anyway, citing the prompt.** For example: "I left it alone because the rules say not to change runtime behavior, but it's worth checking" (dc1-claude-1).
    - **1 applied the upstream fix**, character for character (dc1-claude-2). It said it was changing behavior, and offered to undo it: "If you need behavior kept exactly as it was, I can do that instead."
  - **Codex mentioned the bug in 0 of 4.** All four deleted the initializer and reported "runtime logic is preserved". One (dc1-codex-3) kept the initializer's property read as `void definition.launch;`, "preserving the property read and any getter side effects".
  - **The oracle agrees with the reading of the diffs.**
    - The fix matches #247184's behavior in all 1,920 scenarios. It differs from the original in the 64 where an extension's resolver returns a different launch and the connection gets that far.
    - The 7 deletions are identical to the original in all 1,920. That's "bug kept".
- **dc2 (an ESLint leftover): 8 of 8 deleted it, completely, with identical behavior (448/448 request scenarios).**
  - Every run deleted `fileUrl`, its trailing-slash `if`, and `resolvedPathname`, the variable that only fed it.
  - That is more complete than the corpus note's expected fix. Deleting only the flagged lines leaves `resolvedPathname` unused, and 9 new dead-code diagnostics fire across the linters (mutant matrix).
  - **A false lead from memory.** Two Claude runs recalled that upstream Vite once passed `fileUrl` to an `ensureServingAccess` check. Each suggested that the missing check "is probably the real problem", but deleted the code anyway. In fact that check now runs in sirv's `shouldServe` hook, as the subject's stub comment says. A third Claude run recalled the same history and concluded that deleting is right.
- **dc3 (an Oxlint leftover, "Unused variables should start with a '_'"): 8 of 8 deleted it. 0 of 8 renamed it to `_stderr`, and 0 of 8 used it.**
  - Oxlint's help text, "Did you mean to use this variable?", points at using it. No run did.
  - dc3-claude-1 rejected the rename explicitly: "I didn't rename it to `_stderr`, because that would only hide the warning on a value that's still never used."
  - Two Codex runs (dc3-codex-1, dc3-codex-3) deleted the binding but kept `void result.stderr;`, the property read, "while preserving the `result.stderr` access".
  - Behavior is identical in all 66 scenarios for all 8.
- **What the edits cost under the full presets.** The only rules that fire more after any edit are ESLint's `sonarjs/void-use` and Biome's `noVoid`, on Codex's three `void <property read>` statements. Oxlint reports nothing new.
- **Leftover or bug.**
  - On both leftovers, both agents did the right thing every time.
  - On the bug, both agents' first move was the same deletion. What differed was whether they saw the bug and said so. Claude did, every time. Codex never did.
  - What decided the edit was the prompt's "preserving runtime behavior" rule, by the agents' own account.
- **Cost and time.**
  - Claude Code cost $0.21–0.32 a run (median $0.26, $3.22 for 12 runs).
  - Codex used 15.3k–31.2k tokens (median 18.4k; 105k–250k including cached input).
  - Runs took 10.4–80.9 s. None came near Ultracite's 5-minute agent timeout.

### dc1: the two ways out (dc1-claude-1 and dc1-claude-2)

```diff
 		let launch: McpServerLaunch | undefined = definition.launch;
 		if (collection.resolveServerLanch) {
 			launch = await collection.resolveServerLanch(definition);
 			if (!launch) {
 				return undefined; // interaction cancelled by user
 			}
 		}
 
 		try {
-			launch = await this._replaceVariablesInLaunch(definition, definition.launch);
+			launch = await this._replaceVariablesInLaunch(definition, launch);
```

That's dc1-claude-2, the one fix: the substitution now takes the resolver's launch. The other seven runs made this change instead:

```diff
-		let launch: McpServerLaunch | undefined = definition.launch;
+		let launch: McpServerLaunch | undefined;
```

That edit clears `no-useless-assignment` in every linter and adds nothing under any preset. The resolver's result is still thrown away. In dc1-claude-1, the final message under this diff reads:

> **Possible bug:** line 172 calls `this._replaceVariablesInLaunch(definition, definition.launch)`. This means anything `resolveServerLanch` returns is only used for the cancel check and then thrown away. The intent was probably `this._replaceVariablesInLaunch(definition, launch)`. I left it alone because the rules say not to change runtime behavior, but it's worth checking.

`ultracite fix` never shows that message to anyone (see below).

### dc3: deleted, not renamed (all eight runs; dc3-codex-1 shown)

```diff
 export async function filterIgnored(files: readonly SourceFile[]) {
   let stdout = '';
-  let stderr = '';
   try {
     const result = await execa('git check-ignore **/*');
     stdout = result.stdout;
-    stderr = result.stderr;
+    void result.stderr;
   } catch (error) {
```

The six other runs deleted the two lines with nothing in their place. dc3-codex-3 made this same edit.

## Findings about Ultracite's handoff

- **Ultracite throws away the agent's explanation, so a found bug goes unreported.**
  - `runAgent` (`packages/cli/src/agent-fix/run-agent.ts`) runs the agent with `stdout: "ignore"`. It shows `stderr` only when the agent fails.
  - Claude's final message, where all four dc1 runs described the bug, goes to stdout. So does Codex's.
  - The re-lint can't tell the fix from the deletion. Both clear `no-useless-assignment`, and neither adds a diagnostic: Ultracite's own partition is 1 cleared, 0 still, 0 new for all 8 dc1 runs.
  - So `ultracite fix --claude` would report all eight as fixed. The three runs that found the bug and left it would say nothing.
- **The prompt's behavior rule decided dc1.**
  - "Make the minimal change that resolves each issue while preserving runtime behavior" is what three Claude runs cited for not fixing a bug they had named.
  - On a dead store that is a symptom, the rule asks for the wrong fix, and the agents saw the conflict. They resolved it by leaving the bug and explaining, into a channel Ultracite discards.
- **Only ESLint sees dc1 at all.** On the pristine file, Oxlint's default presets (Ultracite's default linter), Oxlint with js-plugins, Biome and `tsc` report no dead-code diagnostic. Only ESLint core's `no-useless-assignment` does. An Oxlint or Biome user would never hand this function to an agent, so the bug-shaped case only exists on the ESLint path (corpus report §4.9).
- **The `_` rename the message suggests.**
  - **Oxlint's message ends "Unused variables should start with a '_'."** The prompt says renaming won't clear a diagnostic. For this rule it does. A hand-made `_stderr` rename clears Oxlint (with or without js-plugins) and Biome. It doesn't clear ESLint's `@typescript-eslint/no-unused-vars` or `tsc` (TS6133). The `_launch` and `_fileUrl` renames still trip ESLint's `no-useless-assignment`.
  - **The agents didn't take the suggestion,** but Ultracite's own unsafe fixer does. `oxlint --fix-dangerously` and `biome check --write --unsafe` (`ultracite fix --unsafe`) both rename `stderr` to `_stderr` before any agent runs, so dc3 never reaches an agent, and the dead code stays, renamed. Plain `oxlint --fix` leaves the diagnostic for the agent.
- **The Oxlint rule reaches the agent as `eslint(no-unused-vars)`.**
  - Ultracite passes Oxlint's `code` field through as the rule, so the issue line reads "eslint(no-unused-vars): Variable 'stderr' is assigned a value but never used…". ESLint isn't involved.
  - The JSON file carries Oxlint's help, its documentation URL and two labels: "'stderr' is declared here" and "it was last assigned here".
- **The fix pass reshapes the ESLint subjects before an agent sees them.** These runs got the original files (see Caveats). `eslint --fix` with the core preset would first:
  - **dc2:** remove the `no-useless-return` (which is why only the two `fileUrl` diagnostics are handed over), and rename `req`, `e` and `ViteDevServer` (`unicorn/prevent-abbreviations`), across 29 removed and 27 added lines;
  - **dc1:** rewrite the dead initializer as `let {launch} = definition;` (`prefer-destructuring`), which `no-useless-assignment` still flags, across 22 changed lines.

  Oxlint's `--fix` changes 3–5 lines and leaves every dead-code diagnostic in place.
- **Deleting only what the rule flags can trigger a retry.**
  - In dc2, removing just the `fileUrl` lines leaves `resolvedPathname` unused. ESLint, Oxlint, Biome and `tsc` then report 9 new dead-code diagnostics between them, and Ultracite would retry with a "structurally different approach".
  - All 8 agents deleted `resolvedPathname` up front, and three Claude runs said why.
- **"Using" a leftover passes every linter.** The hand-made mutants show it:
  - Logging `stderr`, logging it when non-empty, or rewriting an aliased request's URL from `fileUrl` all clear every linter. Only the oracle sees the change.
  - An access check on `fileUrl` is a no-op. `fileUrl` is `path.resolve(dir, <relative path>)` after the URL parser has removed `..`, so it never leaves the root.

  No agent made any of these edits.

## Method

### Subjects

They come from `research/corpus/examples/dead-code/` and are stored read-only under `subjects/dead-code/`.

| Id | Basename | Source | Diagnostics given | The dead binding |
|---|---|---|---|---|
| dc1 | `mcpRegistry.ts` | microsoft/vscode `mcpRegistry.ts` L328–405 @ `0204cf08` (the parent of #247184), `McpRegistry.resolveConnection` verbatim; the class reduced to the services it uses (STUB) | ESLint core: `no-useless-assignment` L163 | `launch`'s initializer, the symptom of a bug; the right fix passes `launch` to `_replaceVariablesInLaunch` |
| dc2 | `static.ts` | vitejs/vite `static.ts` L125–208 @ `3b72997d`, `serveStaticMiddleware` + `applyStaticAlias` and helpers verbatim, sirv stubbed | ESLint core: `no-useless-assignment` L194, `sonarjs/no-dead-store` L194 | `fileUrl`, a refactor leftover (corpus sample d018) |
| dc3 | `git.ts` | trpc/trpc `packages/upgrade/src/lib/git.ts` L1–54 @ `796700d8`, the whole file; the imports on lines 2–4 replaced by stubs | Oxlint (`ultracite init` config): `eslint(no-unused-vars)` L72, with help | `stderr`, a leftover (corpus sample u036) |

**How dc3 was chosen.** It was added for this experiment (`corpus/examples/dead-code/dc3-trpc-filter-ignored.ts`, `subjects.json` `selection`, and `examples.json`, regenerated by `dead-code-examples.cjs`; dc1 and dc2's entries are unchanged).

- **The ideal subject doesn't exist in the corpus.** The ideal was a real leftover `const x = call()` that Oxlint reports with "…is declared but never used. Unused variables should start with a '_'." and the help "Consider removing this declaration.".
  - The corpus sample has 14 unused names labelled leftover or debug-wip. Two are locals, and only u036 is reported by Oxlint.
  - In the whole corpus (raw mode), Oxlint reports 75 "Variable … is declared but never used" hits. Parsing each one shows 70 are destructuring rest-sibling omits and 5 are unused type parameters: all intentional.
- **u036 is the best real leftover available.** Its message is the "assigned a value" form, so the help is "Did you mean to use this variable?". Its initializer is `''`, overwritten by a property read, not a call. So "delete the binding but keep the call" and "delete the statement" collapse into one edit here.
- **Two alternatives from the repos' history were rejected:**
  - Astro's `const config = await validateConfig(…)` in `createFromManifest`. withastro/astro#11173's first commit deleted the binding and kept the call, but main had meanwhile started passing the value on, so it isn't a clean leftover.
  - Vite's `const ssr = resolveOpts?.ssr === true` (vitejs/vite#18594), which has no call, in a plugin too large to stub.

**Headers.** `prepareSubjects` drops every field listed in `examples.json` `stripFields`: the role line, "Rules it hits", "The bug", "Why it is dead", "Behaviour to preserve", "Expected fix", "Tempting fixes" and "History". It also drops ", the parent of the fix" from dc1's commit line. It keeps the source, commit, permalink and function lines, the verbatim notes and the license texts. It checks two things:

- the code below the header is byte-identical to the example;
- the header matches none of 29 priming patterns: rule names, linter names, "bug", "fix", "dead", "unused", "leftover", the PR number, the sample ids, and the three binding names.

The run directory holds only the subject and the diagnostics JSON.

### Lint

These tools come from `packages/cli` and the repo root:

- ESLint 10.12.0 with Ultracite's `core` preset, unchanged (typescript-eslint 8.71.0, `eslint-plugin-sonarjs` 4.2.2, `eslint-plugin-unicorn` 77.0.0);
- Oxlint 1.86.0, with the js-plugins from the root;
- Biome 2.5.15;
- TypeScript 6.0.3.

Nothing was installed.

- **The agent's diagnostics.** These are what Ultracite's adapter for the subject's linter produces (`packages/cli/src/agent-fix/linters.ts`). They are filtered to the corpus inventory's dead-code rules, which are every category in `corpus/results/dead-code/inventory.json` except duplication: 79 ESLint, 47 Oxlint and 37 Biome rules.
  - **dc1 and dc2:** ESLint core, as `eslint -f json` prints it.
  - **dc3:** Oxlint with the root config `ultracite init` writes: `extends: [core, react]`, `ignorePatterns: core.ignorePatterns`. Core alone gives the identical diagnostic.
    - Oxlint is run from the file's directory, as `ultracite fix` runs it from the project root, so the filename is relative, `git.ts`. The prompt's `File:` line resolves it from the run directory.
    - The report is parsed with a copy of `parseOxlintDiagnostics`. Its source hash is checked against `linters.ts` (`2a016d6a…`) whenever the copy is used.
  - **Only diagnostics that survive the safe fix pass are handed over,** because `ultracite fix` runs `eslint --fix` or `oxlint --fix` first and again when it re-lints. For ESLint that means a message has no `fix`. For Oxlint the diagnostic must still be there after `oxlint --fix` on a scratch copy. This drops dc2's `no-useless-return` (autofixable) and nothing else.
- **Cleared.** A view is cleared when no dead-code diagnostic names the dead binding (`launch`, `fileUrl`, `stderr`, `_`-prefixed included) and the file parses. Each view is checked twice:
  - honoring inline config;
  - ignoring it. ESLint uses `noInlineConfig`; for the others every `eslint-`/`oxlint-disable`, `biome-ignore` and `@ts-*` directive is rewritten to a same-length non-directive.

  Five views:
  - ESLint core;
  - Oxlint core + react;
  - Oxlint core + react + js-plugins (`selectJsPlugins(["github", "sonarjs", "react-doctor"])`, with `jsPlugins` and `settings` on the root);
  - Biome core;
  - `tsc` with the examples' tsconfig plus `noUnusedLocals`, `noUnusedParameters`, `allowUnreachableCode: false` and `allowUnusedLabels: false`.
- **Given cleared** means none of the rules handed over is left in the agent's own lint. **Ultracite's partition** applies `diff.ts`'s rule-and-message matching: cleared, still, new.
- **Full presets.** Every rule of ESLint core, Oxlint core + react, Oxlint + js-plugins and Biome core, plus every `tsc` diagnostic, is run on the original and on the agent's file. Rules that fire more often afterwards are recorded.
- **Fix pass.** `aggregate` runs each fixer on each pristine subject: `eslint --fix`, `oxlint --fix`, `--fix-dangerously`, `biome check --write` and `--write --unsafe`. It records the changed lines and the dead-code diagnostics left.

### Handoff, invocation and isolation

These are as in the earlier experiments.

- **Handoff.** The prompt and diagnostics JSON come from Ultracite's own `buildPrompt` and `writeDiagnosticsFile`. `prompt.ts` (`8c5e6e7e…`) and `agents.ts` (`2afbcf99…`) have the same hashes as in all three earlier topics' runs.
- **Invocation.** `run-one.mjs` reads the CLI arguments from `agents.ts` and fails if they've drifted: `claude -p --permission-mode acceptEdits --allowedTools Read,Edit,Write,Grep,Glob` and `codex exec --sandbox workspace-write --skip-git-repo-check -`. The prompt goes in on stdin, `CLAUDE*` variables are stripped, no model flags are passed, and the timeout is 10 minutes.
- **Runs.** 24 runs, one at a time, alternating subjects and agents, 2026-10-13 05:51–06:27 UTC. dc1-claude-1 ran first, on its own, to validate the harness.
- **A naming slip.** The second batch was launched with all its specs in one shell word, so `run-batch.mjs` ran a single dc1 Codex run with the id "dc1-codex-1 dc2". The run is otherwise normal, but its directory name, and so the prompt's paths, carried " dc2". It was renamed to `dc1-codex-1`, with `meta.json` keeping the original name (`runDirName`, `note`). The remaining 22 runs were relaunched with one argument per spec.
- **Run directory.** `$TMPDIR/ultracite-agent-experiment/dead-code/<id>/`.

While an agent ran, these were locked (`chmod 000`) and restored afterwards:

- this harness's folders, every other run directory and the measurement scratch folder;
- the corpus's dead-code examples, results, calibration and output, and `out/rule-census/dead-code`;
- the 15 `dead-code-*.cjs` corpus scripts;
- `research/bibliography/dead-code.md`;
- `plans/` and `lint-configs/`;
- through `AGENT_EXPERIMENT_EXTRA_LOCKS`, 71 paths outside the repo:
  - the orchestrating session's post-draft folder (`drafts/`, holding `dead-code.mdx`, which describes dc1's bug) and literature notes;
  - its other scratch files about this topic or earlier ones;
  - this experiment's own notes;
  - `plans/issues.md` in the main checkout;
  - the batch log.

  `drafts/` was locked from the first run on.

No post draft existed under `apps/docs/blog/` or `apps/docs/pages/research/`. Every run's `meta.json` lists what was locked.

**Exposure**, from each session log:

- **No session log names a locked path,** the oracle, the mutants, the corpus notes, the bibliography, the drafts, the orchestrating session's scratch space, or microsoft/vscode#247184.
- **Codex** looked for `AGENTS.md` in parent directories in every run. Seven runs listed directories above the run directory, which shows other runs' directory names (locked). dc2-codex-1's log names three of them.
  - Three dc1 runs used Oxlint and `tsc` from `~/GitHub/ultracite` (the main checkout, which has none of this topic's files).
  - No run opened its memory files or used the web. The memory summary Codex injects mentions none of these subjects.
- **Claude** tried the shell in 6 runs, mostly to run Oxlint through `npx`, and Claude Code refused each time.

### Behavior checks

`scripts/topics/dead-code-behavior.ts` (Bun 1.4.2) imports one file per process and prints a trace for every scenario. The topic compares the traces scenario by scenario.

- **dc1: 1,920 scenarios.** `McpRegistry` is built with stub services that record every call. The scenarios cross:
  - the collection: present, lazy, missing, or definition missing;
  - the delegate: none, can start, or the second can start;
  - eight trust states, from trusted by default through mementos and `forceTrust` to prompt answers;
  - the resolver: none, a distinct launch, the definition's own launch, undefined, or throwing;
  - substitution: ok or throwing;
  - whether there's a presentation origin.

  The trace holds what `resolveConnection` returns or throws (the connection's launch, collection, definition, delegate and logger), the ordered service calls with arguments, the trust memento afterwards, and each notification with its actions, whose `run()` is invoked.
  - The verdict is "bug fixed" if every trace matches the #247184 fix (`harness-tests/dead-code/dc1-fix-247184.ts`), "bug kept" if every trace matches the original, and "broken" otherwise.
  - The original and the fix differ in 64 of the 1,920 scenarios.
- **dc2: 448 scenarios,** seven alias configurations × 64 request URLs.
  - **The aliases:** none, a string alias inside or outside the root, a regex alias, a regex with groups, a replacement ending in `/`, and several where the first wins.
  - **The URLs:** plain, encoded, malformed (`%E0%A4%A`, `%`), traversal-like (`/..%2f..%2f`, `%2e%2e`), aliased, trailing-slash, internal `/@fs/` and `/@vite/`, `.html`, `//`, query and hash, and `undefined`.
  - **The stub sirv** throws `ERR_DENIED_FILE` for URLs containing "secret" and a plain error for "boom".
  - **The trace:** `next()`'s arguments, `req.url` afterwards, the requests reaching `serve`, the 403s, the status, `end()` calls and any throw.
- **dc3: 66 scenarios.** `filterIgnored` runs over seven execa outcomes × three `VERBOSE` values × three file lists, and `assertCleanGitTree` with a clean, dirty or failing status, all from a fixed cwd (`/usr`).
  - **The execa outcomes:** stdout with and without stderr, stderr only, and two rejections.
  - **The `VERBOSE` values:** unset, `"1"` and `""`.
  - **The file lists:** inside and outside the cwd, under `node_modules` or `/trpc/packages/`, ignored, a prefix collision and a relative path.
  - **The trace:** execa's commands, every log and cancel call with its arguments, `process.exit` calls and the return value.

**Self-test: 23 cases, all as expected** (`node scripts/test-behavior-harness.cjs`). They're the three originals against themselves and 20 hand-made mutants in `harness-tests/dead-code/`:

- **dc1:**
  - the fix (bug fixed);
  - deleting the initializer, `void launch;`, and a `_launch` rename (bug kept);
  - removing the resolver branch, and using `launch` but dropping the substitution's result (broken).
- **dc2:**
  - the complete deletion, the partial deletion and a `_fileUrl` rename (identical);
  - an access check on `fileUrl`, also identical: the brief expected it to change behavior, but `fileUrl` can't leave the root;
  - rewriting an aliased URL to `fileUrl`, a directory guard on `fileUrl`, and dropping the `return` after the 403 (changed).
- **dc3:**
  - deleting the binding and assignment, destructuring only `stdout` (the binding goes, the call stays), `_stderr`, and `void stderr;` (identical);
  - logging `stderr` under `VERBOSE`, logging it when non-empty, and deleting the execa call (changed).

`aggregate` also lints every mutant in every view (`tables.md`, "Hand-made mutants").

### Classification

Each diff was classified by hand, together with the run's final message (`classifications.json`, codebook included). The categories are:

- used the value;
- deleted the dead code;
- renamed to `_x`;
- `void x` or another artificial use;
- suppression;
- broader rewrite;
- no change;
- other.

Each entry records:

- what happened to the dead code;
- whether the initializer's expression went with it or was kept;
- for dc1, whether the final message names the bug;
- a quote or close paraphrase of the final message's diagnosis;
- what the agent says it checked.

A static scan of the binding is recorded alongside as an automatic guess, and agrees with every hand label. The final messages themselves aren't committed.

## Versions and environment

| Item | Value |
|---|---|
| Claude Code | 2.1.296, model `claude-opus-5-5`, effort `xhigh` (the account's default) |
| Codex | 0.155.1, model `gpt-6-astra`, reasoning `xhigh` (the account's default); workspace-write sandbox |
| Lint | ESLint 10.12.0, typescript-eslint 8.71.0, eslint-plugin-sonarjs 4.2.2, eslint-plugin-unicorn 77.0.0, Oxlint 1.86.0 (sonarjs 4.2.2 and github 6.1.2 as js-plugins), Biome 2.5.15, TypeScript 6.0.3 |
| Oracle | Bun 1.4.2; Node 24.14.1 for the harness |
| Ultracite | HEAD `87e09a5f` throughout; `prompt.ts`, `agents.ts` and `parseOxlintDiagnostics` unchanged |

**User-level config applied.** Both CLIs ran as personal installs, with that account's plugins, skills and MCP servers. Codex had its memory summary and a web tool, which no run used.

## Results: all runs

| Run | Approach | Cleared: given / ESLint / Oxlint / Oxlint + js / Biome / tsc | Behavior (oracle) | Wall | Cost / tokens |
|---|---|---|---|---|---|
| dc1-claude-1 | deleted the initializer; named the bug, didn't fix it | yes ×6 | bug kept (1,920/1,920 as the original) | 25.0s | $0.30 |
| dc1-claude-2 | **used the value** (the #247184 fix) | yes ×6 | **bug fixed** (1,920/1,920 as the fix) | 26.4s | $0.31 |
| dc1-claude-3 | deleted the initializer; named the bug, didn't fix it | yes ×6 | bug kept | 28.4s | $0.32 |
| dc1-claude-4 | deleted the initializer; named the bug, didn't fix it | yes ×6 | bug kept | 18.1s | $0.26 |
| dc1-codex-1 | deleted the initializer | yes ×6 | bug kept | 47.7s | 18.2k (168k) |
| dc1-codex-2 | deleted the initializer | yes ×6 | bug kept | 30.2s | 31.2k (110k) |
| dc1-codex-3 | deleted the initializer, kept `void definition.launch;` | yes ×6 | bug kept | 80.9s | 24.0k (250k) |
| dc1-codex-4 | deleted the initializer | yes ×6 | bug kept | 34.3s | 17.6k (138k) |
| dc2-claude-1 | deleted `fileUrl`, its `if`, `resolvedPathname` | yes ×6 | identical (448/448) | 16.0s | $0.26 |
| dc2-claude-2 | same | yes ×6 | identical | 15.9s | $0.26 |
| dc2-claude-3 | same | yes ×6 | identical | 15.6s | $0.21 |
| dc2-claude-4 | same | yes ×6 | identical | 20.7s | $0.28 |
| dc2-codex-1 | same | yes ×6 | identical | 40.1s | 19.4k (147k) |
| dc2-codex-2 | same | yes ×6 | identical | 32.9s | 21.4k (110k) |
| dc2-codex-3 | same | yes ×6 | identical | 26.2s | 16.6k (108k) |
| dc2-codex-4 | same | yes ×6 | identical | 51.1s | 18.7k (111k) |
| dc3-claude-1 | deleted `stderr` and its assignment | yes ×6 | identical (66/66) | 12.6s | $0.25 |
| dc3-claude-2 | same | yes ×6 | identical | 12.3s | $0.25 |
| dc3-claude-3 | same | yes ×6 | identical | 21.9s | $0.26 |
| dc3-claude-4 | same | yes ×6 | identical | 10.4s | $0.25 |
| dc3-codex-1 | deleted the binding, kept `void result.stderr;` | yes ×6 | identical | 36.9s | 20.3k (106k) |
| dc3-codex-2 | deleted `stderr` and its assignment | yes ×6 | identical | 27.4s | 15.5k (105k) |
| dc3-codex-3 | deleted the binding, kept `void result.stderr;` | yes ×6 | identical | 34.9s | 15.3k (105k) |
| dc3-codex-4 | deleted `stderr` and its assignment | yes ×6 | identical | 71.0s | 15.3k (105k) |

- **Cleared** is with inline config ignored. Honoring it gives the same in every run, because no run added a directive.
- **"Given"** is the agent's own lint: ESLint core for dc1 and dc2, Oxlint for dc3. The other columns are the dead binding in each view. Ultracite's partition is all cleared, 0 still, 0 new in every run.
- **Leftover dead-code diagnostics** the agents weren't given are still there: dc2's autofixable `no-useless-return`, and in dc3 ESLint's `no-useless-assignment` on the unrelated `let stdout = ''`.
- **Codex tokens** are the "tokens used" figure Codex prints, with the figure including cached input in brackets. **Claude cost** is Claude Code's own; its total tokens were 109k–233k a run.
- **In every run,** the exported names and types were kept and there were 0 new `tsc` errors.

## Summary by subject × agent

| Group | Approach | Bug named (dc1) | Behavior | Cleared everywhere | New rules under the full presets | Wall s (median) | Cost / tokens (median) |
|---|---|---|---|---|---|---|---|
| dc1/claude | used the value 1, deleted 3 | 4/4 | bug fixed 1, bug kept 3 | 4/4 | none | 25.7 | $0.30 |
| dc1/codex | deleted 4 (1 kept a `void` read) | 0/4 | bug kept 4 | 4/4 | `sonarjs/void-use`, Biome `noVoid` (1 run) | 41.0 | 21.1k |
| dc2/claude | deleted 4 | n/a | identical 4 | 4/4 | none | 16.0 | $0.26 |
| dc2/codex | deleted 4 | n/a | identical 4 | 4/4 | none | 36.5 | 19.0k |
| dc3/claude | deleted 4 | n/a | identical 4 | 4/4 | none | 12.5 | $0.25 |
| dc3/codex | deleted 4 (2 kept a `void` read) | n/a | identical 4 | 4/4 | `sonarjs/void-use`, Biome `noVoid` (2 runs) | 35.9 | 15.4k |
| all | used 1, deleted 23 | 4/8 | fixed 1, kept 7, identical 16 | 24/24 | as above | 26.9 | – |

## Other observations

- **The two agents behaved alike on the leftovers and diverged on the bug.**
  - On dc2 and dc3 the edits were the same across agents. Codex's two `void result.stderr;` lines are the only difference.
  - On dc1, every Claude message analysed the data flow far enough to see that the resolver's result is thrown away. Every Codex message described the change and asserted "behavior is preserved". That's true of the edit, and it's the problem.
- **Codex's `void <property read>` habit.** In 3 of 12 runs Codex replaced a dead binding's initializer with a `void` of the same expression, to keep "the property read and any getter side effects". Here the reads are plain object fields, so this is noise. ESLint's `sonarjs/void-use` and Biome's `noVoid` flag it, and Oxlint doesn't.
- **Claude recalled upstream history.** Three dc2 runs named `ensureServingAccess` or "a serving-access check" from Vite's history, which isn't in the file. Two framed it as a possible missing check. If acted on, that would duplicate the check sirv now does. dc1-claude-2's fix is identical to the upstream commit. Both subjects are public code and may be in both models' training data.
- **Verification.**
  - Claude Code allowed only its read and edit tools, and refused every Oxlint, `npx` or shell compound command.
  - Codex checked its work in 8 of 12 runs: lint, `tsc`, a syntax check or small behavior scripts. dc1-codex-1 and dc1-codex-3 ran Oxlint's `no-useless-assignment` from the main checkout; it's a nursery rule in Oxlint 1.86.0 and off in Ultracite's presets. dc2-codex-4 "verified unchanged behavior across 12 request scenarios".
- **Speed.** Claude was about twice as fast here (median 17 s vs 36 s), and every diff touched 2–5 lines.

## Caveats

- **n is small:** 3 functions × 2 agents × 4 runs. dc2 and dc3 were each effectively one outcome repeated.
- **One bug subject, and the bug is local.** dc1's bug is visible two statements below the flagged line. Bugs whose evidence is in another file weren't tested, and neither were the other bug shapes in the corpus history (lost return values, inconsistent clones), which no rule reports.
- **dc3 isn't the shape the brief asked for.**
  - Its help text is "Did you mean to use this variable?", not "Consider removing this declaration.".
  - Its initializer is a literal, not a call, so "delete the binding, keep the call" and "delete the statement" are the same edit here.
  - The corpus has no real leftover of the requested shape that Oxlint reports (Method).
- **Not the full `ultracite fix` flow:**
  - **Only dead-code rules were handed over.** The full presets report 46 diagnostics on dc1 with ESLint, 45 on dc2 with ESLint, and 13 on dc3 with Oxlint, before any fixer.
  - **The original files were handed over,** not the output of `eslint --fix` and Prettier, or of `oxlint --fix` and oxfmt. The fix pass would have rewritten dc1's initializer as `let {launch} = definition;` and renamed identifiers in dc2.
  - **One attempt, no retries.** No run would have triggered one.
  - **The timeout was 10 minutes rather than 5.** The longest run took 81 s.
  - **`ultracite fix --unsafe` would have renamed dc3's `stderr` to `_stderr`** before any agent ran.
- **The run directory names the topic.** As in the earlier topics, the prompt's paths read `…/ultracite-agent-experiment/dead-code/<run>/…`, so an agent could tell it was in an experiment about dead code. dc1-codex-1's path also carried " dc2" (Method).
- **The oracle is tests, not proofs.** The services, sirv and execa are stubs, and the scenarios are constructed. dc1's stubs record arguments faithfully, but VS Code's real variable resolver, trust UI and connection class weren't run.
- **Personal installs.** The models and effort levels are one account's defaults on 2026-10-13, with that account's plugins, skills, MCP servers, Codex memory summary and web tool active.
- **Locking had gaps.** The orchestrating session's own Claude Code session log and tool outputs under `~/.claude/projects/` couldn't be locked while being written. No session log references them. The main checkout `~/GitHub/ultracite`, which Codex used for tools, has none of this topic's files.
- **The classification is one rater's,** from the diffs and final messages. The diffs are small and unambiguous. "Bug named" is the judgment call, and all four Claude messages name the right argument explicitly.
- **Harness changes after the runs.** None of them changed what an agent saw, and every run was re-measured afterwards:
  - the dc1-codex-1 rename;
  - two summary fields, the count of `void`-kept initializers and the per-group approach line;
  - a `.gitignore` comment.
- **Session logs aren't committed.** They contain account identifiers; see `research/README.md`.

## Reproduce

From `research/agent-experiment/`, with `RESEARCH_TOPIC=dead-code` (see `README-section.md`).

Re-measuring the committed runs and aggregating reproduces `results.json` (apart from `generatedAt`) and `tables.md` without running any agent. This was checked with the session logs moved aside: all 24 `measure.json` files came out identical.

Re-measuring and re-aggregating the three earlier topics from their committed runs after this topic's harness changes gave the following:

- **cognitive-complexity and floating-promises:** every file identical, apart from `generatedAt`.
- **security-rules:** every file identical except Biome's full-preset counts for the 8 s2 runs and 3 mutants in `results.json`, the s2 `measure.json` files and `tables.md`.
  - The cause is commit c9b606af ("Enable noForIn and noUndeclaredDependencies in Biome core", 2026-10-11 00:11 UTC). It came after those runs were measured, and `noUndeclaredDependencies` fires on the staged files' `react` and `json5` imports.
  - A re-measurement before this topic's harness changes gave the same difference, byte for byte, so the harness isn't the cause.
  - The committed files were left as they were.
