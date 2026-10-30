# func-style and no-use-before-define: agent experiment report

The agent experiment for the post on how functions are written and ordered, run on 2026-10-30 (UTC) with Claude Code 2.1.314 (claude-opus-5-5, effort xhigh) and Codex CLI 0.164.0 (gpt-6-astra, reasoning effort xhigh). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Ultracite holds functions to `const` expressions: `func-style` is `["error", "expression", { allowArrowFunctions: true }]` in Oxlint and ESLint core, and `no-use-before-define` is on at its defaults. Hayden gave the reason in these words: "i preferred function expressions because they allow for dropping curly braces where appropriate and also i found them easier to assign types earlier on. i also didn't super-love the concept of hoisting originally as i felt like it compensated for the functions being in the wrong order, but honestly it was a personal preference." No linter has a fix that converts a declaration, so in a real project `ultracite fix --claude` or `--codex` is what converts. Questions:

1. When Ultracite hands these two rules' reports to an agent, does the agent convert the file without changing behaviour?
2. Does it reorder a top-down file correctly (B)?
3. What does it do when no order can satisfy `no-use-before-define` (C, a mutual recursion)?
4. Does the result use what Hayden's reasons point to: concise bodies, types on the variable, define-before-use order?
5. What do Ultracite's retry loop and its `Left for review:` line do?
6. What does a user get from `ultracite fix` and `--unsafe` with no agent, with each linter?

## TL;DR

- **Every final file behaves like the subject.**
  - The oracle found no difference in 24 of 24 runs, in every intermediate attempt, or in the exports' names: A 865 calls, B 300 field lists, C 318 props objects, each after importing the module.
  - No run added a type error, a suppression, a config change or a new Oxlint report, or touched another file.
  - The oracle does catch the wrong moves. Its self-test flags the corpus's `>=` slip (a04), the `??` slip (b05) and the nested helpers (c07), and a hand-made call at load time (ch3) throws at import.
- **Results by subject** (4 runs per subject and agent):

  | Subject | The right response | Claude Code | Codex | Easier to follow? Rater 1 / rater 2 (blind), 8 files each |
  | --- | --- | --- | --- | --- |
  | A, converts cleanly (5 declarations, already bottom-up) | convert each to a `const` arrow, keep types and JSDoc, move nothing | arrows, nothing moved: 4 | arrows 2, named function expressions 2; nothing moved: 4 | same 8 / 8 |
  | B, written top-down (3 exports above 5 helpers) | convert, and put each helper above its callers | arrows, helpers first, exports last: 4 | arrows 2, named function expressions 2; same order: 4 | same 8 / 6, harder 0 / 2 |
  | C, a mutual recursion (no order works) | convert what can be converted, say no order works, leave the rest for review | restructured: the recursive function passed in as a parameter 3, the three made methods of one object 1 | restructured: passed in as a parameter 4 | harder 7 / 7, same 1 / 1 |

  - **A and B were right in all 16 runs.** Every declaration was converted, every function kept its types and JSDoc, and no comment was lost. In B, all 8 moved the five helpers above the exports (57–71 lines), so every reference now points up.
  - **C was wrong in all 8.** Every run cleared both rules by changing the code's structure, the moves the corpus listed as gaming (c08, c06). No run left anything for review or kept a report.
  - **The agents knew it was a cycle.** All 8 named the mutual recursion and 7 said reordering couldn't fix it, then broke it anyway: "With `const` functions, no ordering of the three avoids a call to one that hasn't been defined yet, so I broke the loop" (c-claude-2). c-claude-1 wrote "(nothing left for review)".
- **Ultracite printed "Fixed N of N issues" for all 24** and exited 0, C included. Codex's C final messages don't say the structure changed ("Fixed all six reported issues in `serialize.ts`. Only that file changed.", c-codex-1), and Ultracite prints an agent's message only when it leaves something for review.
- **The prompt and the help point that way.**
  - The prompt says a diagnostic that still fires "is a failed fix" and to "rework the code so the rule genuinely no longer applies".
  - Oxlint's help for `no-use-before-define` is "Move the declaration before any references to it, or remove the reference if it is not needed." Passing the function in as a parameter removes the reference.
- **Hayden's three reasons, in these runs:**
  - **Dropping braces.** 42 of the 56 single-return bodies ended up concise, but the agents wrote only 19 of them. Verify's `arrow-body-style` fix made 23. The 14 left are in Codex's function expressions, where the rule doesn't apply. One Codex run chose function expressions on purpose: "The lint check caught an additional arrow-body rule, so I switched to named function expressions to keep the original bodies intact." (b-codex-3)
  - **Types on the variable.** None of the 133 converted functions; every one kept its inline parameter and return annotations.
  - **Define-before-use order.** All 8 B runs produced it correctly, and 23 of 24 final files read bottom-up. Neither rater found B's new order easier to follow. In C, the same rule produced the restructuring.
- **The retry loop ran 3 times,** all in Claude's C runs, all for `typescript/no-explicit-any`: their new function type used `any`. Ultracite matches diagnostics by rule and message, so each retry named the file's last `any`s, which were in the original code, not the new ones. All three agents then narrowed the exported `serializeProps(props: any)` to `Record<string, unknown>`, a change to an exported type.
- **Without an agent, nothing converts.**
  - `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint changed no function's form or order in any of 36 cases.
  - Oxlint and ESLint still report every declaration and every use before definition. Biome reports nothing for either rule.
  - Ultracite's real adapters agree with the mirror in all 36.
- **An alternative setting changes C.** With `no-use-before-define`'s `{ variables: false }`, C converted in place (c03) reports nothing in Oxlint or ESLint, and neither does B converted in place (b03). A call at load time above its definition, which throws at import (ch3), is still reported. `{ functions: false }` makes no difference once the functions are `const`.
- **Exposure.** No tool call read a locked path, a corpus file, a clone, or an installed Astro or Next.js. Six Codex runs listed the system temp directory and saw the name of the locked `ultracite-research-func-style` folder; the two that tried to read it were denied. No run used the web.
- **Cost:** Claude Code $8.27 for 12 runs (median $0.49, $0.40–1.35). Codex 477k tokens (median 35.8k, 22.7k–71.0k). 39 minutes of agent time over 27 attempts (runs 37–261 s). The pilot cost $1.54 and 35.9k tokens more.

## 1. Setup

### 1.1 Subjects

The subjects are the three in `corpus/examples/func-style/` (corpus REPORT §8 and §10). Each was run 4 times with Claude Code and 4 times with Codex, 24 runs in all, from 16:43 to 17:25 UTC, in four rounds that each ran every subject with every agent once, in a different order.

| Subject | File in the run dir | Handoff (Oxlint, after the filter) | The right response |
| --- | --- | --- | --- |
| A | `duration-to-string.ts` (Next.js, `packages/next/src/build/duration-to-string.ts` @ d8bfc3c9; MIT) | `func-style` ×5 | convert each to a `const` arrow, keeping types and JSDoc; the three single returns may become concise; nothing moves |
| B | `ConfigurationDriftPage.utils.ts` (Supabase Studio, `…/ConfigDrift/ConfigurationDriftPage.utils.ts` @ 09f80f52, L14-137; Apache-2.0), with `stubs.ts` | `func-style` ×8, `no-use-before-define` ×8 | convert, and move each helper above its callers (or the exports below) |
| C | `serialize.ts` (Astro, `packages/astro/src/runtime/server/serialize.ts` @ 9050e381, L4-115; MIT), with `stubs.ts` | `func-style` ×4, `no-use-before-define` ×2 ("'convertToSerializedForm' was used before it was defined.") | convert what can be converted (or leave the three recursive functions as declarations), say no order satisfies the rule for a mutual recursion, and list those issues under `Left for review:` |

What each handoff says:

| Rule | Message | Oxlint's help |
| --- | --- | --- |
| `func-style` | "Expected a function expression." | "Enforce the consistent use of either \`function\` declarations or expressions assigned to variables" (the rule's description) |
| `no-use-before-define` | "'getConfigFieldLabel' was used before it was defined." | "Move the declaration before any references to it, or remove the reference if it is not needed." |

**Arms.** The brief allowed raising a cell to six runs if the pilot looked noisy. Both pilot runs on C made the same move, and every final cell is uniform in the oracle's verdict and in the response, so every cell has four runs. What varies within a cell is the form: Codex's function expressions in A and B, and one object in C.

### 1.2 The run dir: what `ultracite init --linter oxlint` leaves

`prepareSubjects` runs Ultracite's own `init` (the CLI source, under Bun, `--linter oxlint --pm bun --skip-install --yes --quiet`) in a scratch project that starts with a `package.json` with TypeScript and the corpus examples' `tsconfig.json`. Init writes three files (`subjects/func-style/init.json`):

- `oxlint.config.ts`: `extends: [core]`, `env: core.env`, `ignorePatterns: core.ignorePatterns`, importing `ultracite/oxlint/core`
- `oxfmt.config.ts`: `...ultracite` from `ultracite/oxfmt`
- `package.json`: `ultracite` 8.1.0, `oxlint` ^1.89.0 and `oxfmt` ^0.74.0 added, with the `check` and `fix` scripts

Both rules are on in core, so the user changes nothing. The run dir is these files (as Ultracite's fix pass formats them), `tsconfig.json`, the subject, and, for B and C, its stub module `stubs.ts`.

Init's untouched output for Oxlint, Biome (which also writes a `.gitignore`) and ESLint is in `subjects/func-style/init/`, for the deterministic paths. Oxlint's two configs and Biome's are stored with a `.txt` suffix, so no file under `research/` has a name this repo's linters would load as a nested config. The run dir has no `node_modules` and no git.

### 1.3 Preparing the subjects

- **Header.** The `stripFields` fields are removed, and so is the subject line ("Function-style subject C: mutually recursive declarations that no order can satisfy."). `TEXT_EDITS` then rewrite:
  - B's `Functions:` field, which said the helpers are "below" the exports;
  - C's `Functions:` field, which listed the values the oracle generates;
  - the "copied verbatim" sentences, which normalising made untrue, to "copied, with their formatting changed";
  - the license lines that pointed into `research/corpus`. B's became the standard Apache 2.0 notice;
  - the stub module's name. The corpus calls it `func-style-b-stubs.ts`, which names the rule, so the run dir calls it `stubs.ts` and the subject imports `./stubs`;
  - the stubs' headers ("STUB for func-style subject B") and B's note that its `startCase` stand-in covers "the inputs the oracle uses".
- **The comment check.** Every comment line of the subject and its stub, header and STUB notes included, is checked against 18 patterns:
  - **The rules and function forms:** func-style, use-before-define, "used before", "defined before", hoisting, declaration, expression, arrow, `=>`, braces, concise, implicit return, body.
  - **Order:** order, reorder, top-down, bottom-up, above, below, first use, move.
  - **The trap:** mutual, recursion, cycle, circular, "each other", TDZ, "before initialization", ReferenceError.
  - **Review and intent:** review, decide, deliberate, intentional, preference.
  - **Tools, analysis and history:** every linter and Ultracite; agent, experiment, subject, corpus, research, oracle, scenario, verbatim, fix, bug; the stripped field names; upstream, later, history; every PR and commit number in the corpus headers.

  Two lines of the MIT license text ("The above copyright notice…") are allowed by name; nothing else matches. The same patterns match 34, 35 and 51 lines of the unstripped corpus subjects (3 and 2 of B's and C's stubs), so a clean prepared subject means the check ran.
- **Kept:** source, commit, permalink, license and every STUB note.
- **Normalised as far as Ultracite's Oxlint pass goes.** `oxlint --fix .`, `oxfmt --write .` and `oxlint -f json .` run until no file changes (two passes each). Besides the formatting, Oxlint's safe fixes applied:
  - `no-else-return` (A);
  - `curly`, `sort-keys` and the type-import style (B);
  - `arrow-body-style` on two callbacks and `unicorn/prefer-spread` (C);
  - in B's stub, `replace` with a global regex became `replaceAll`.
- **Normalising changed no behaviour** (`subjects.json` `checks`).
  - A's and C's traces equal the corpus subjects' in every scenario.
  - B's differ in 193 of 300 calls, only in object key order: `sort-keys` reordered the row objects `createConfigurationDriftRows` returns. With keys sorted, B is the same. The prepared subject is the reference, and every verdict below holds both exactly and ignoring key order.
  - The oracle loads the corpus's stub. B's normalised stub behaves the same as the corpus's on every input the oracle uses and more.
  - The exports' names and `length`s are unchanged, `tsc` is clean, the collect leaves every file unchanged, and the handoff holds exactly the corpus's counts of the two rules.

### 1.4 The handoff and the filter: a deviation from a real project

After normalising, Oxlint still reports other diagnostics. Ultracite would hand all of them over with the two rules:

- **A:** 6, all `no-inline-comments`.
- **B:** 6. In the subject, `typescript/no-non-null-assertion` and `unicorn/filename-case`; the other 4 are in the stub.
- **C:** 20. In the subject, 19 `typescript/no-explicit-any`; 1 in the stub.

So the experiment filters, in the handoff and in every re-lint, as the todo-comments, sort-keys, react-effects and length-limits topics did:

- **Kept:** `func-style` and `no-use-before-define`, plus any other diagnostic that isn't one of the prepared project's own, matched by rule and message, file by file, as Ultracite's `diff.ts` matches them.
- **What it models:** a project that lints clean apart from these two rules. A real project with these files would hand over 11, 22 and 26 issues at once.
- **The filter caused every retry.** All 3 were for `typescript/no-explicit-any`, reported 22 times instead of the subject's 19 (§4). A filter keeping the two rules alone (`verifyRemainingTopicRulesOnly`) would have retried nothing. In a real project C's 19 `any`s would have been in the first handoff.

### 1.5 The run: Ultracite's retry loop, through the Oxlint adapter

`run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does:

- **Collect:** the Oxlint pass on the project, then the filter.
- **Attempts:** up to `MAX_AGENT_ATTEMPTS` (3), each with `buildPrompt` or `buildRetryPrompt`, under `AGENT_TIMEOUT_MS` (300 s) and `KILL_GRACE_MS` (10 s).
- **Verify after each attempt:** the same pass on the file, in place, then the filter.
- **Deciding whether to retry:** `parseLeftForReview` drops the issues the agent listed for review. `nextRetry` splits what's left into issues still reported and issues new since the edit. There's no retry after a timeout.

The mirror and the configs:

- **The mirror is current.** `scripts/ultracite-adapters.cjs` hash-checks every slice of the CLI it copies, and the check passed before every run.
  - **Unchanged since the length-limits runs:** the CLI's agent-fix files (`prompt.ts` d4fd60cb…, `agents.ts` 2afbcf99…, `index.ts` e0b222a3…, `linters.ts` ba0fc725…, `run-agent.ts` da583d85…, `diff.ts` c164c983…).
  - **Changed:** the agent CLIs (Claude Code 2.1.310 → 2.1.314, Codex 0.155.1 → 0.164.0) and the version init writes (`ultracite` 8.0.2 → 8.1.0).
  - **Agent arguments:** `run-one.mjs` checked them against `agents.ts` before every run.
- **The configs.** The harness passes `-c` with configs equivalent to init's that import the preset by absolute URL. Init's own files are in the run dir for the agents to read.
- **The mirror matches the CLI.** The self-test runs Ultracite's real Oxlint adapter under Bun, in a project with init's own config files and `node_modules` links, next to the mirror. On the 3 prepared subjects and 34 mutants, all 37 collect-and-verify comparisons match: every diagnostic field but `raw`, and the subject, stub, `package.json` and `tsconfig.json` each pass leaves.

### 1.6 Measurement

- **Two states per attempt:** the file as the agent left it, and as verify left it (what the next attempt gets and what stays in the project).
- **Lint, inline config honoured and ignored, in eight views:**
  - **Oxlint:** the user's config; and with `no-use-before-define` set to `{ functions: false }` or `{ variables: false }`.
  - **ESLint:** init's core, which has `func-style`, `@typescript-eslint/no-use-before-define` and the base rule off for TypeScript. Typescript-eslint's rule with each option variant and the base rule at its defaults run under local aliases in the same pass.
  - **Biome:** init's core, `biome check`, which includes `noInvalidUseBeforeDeclaration`, `useArrowFunction` and `useConsistentArrowReturn`.
- **`tsc`** with the subject and its stub, flagging TS2448, TS2449, TS2450, TS2454 and TS2729, and any new error.
- **The oracle:** `corpus/scripts/func-style-oracle.cjs`, imported unchanged, against the prepared subject, exactly and ignoring key order. Its verdicts are same, changed, import-crash, exports-changed and oracle-error. The `./stubs` import is given the corpus stub's name back, and this topic adds each export's `name` and `length`.
- **The edit, from scope analysis:**
  - **Per function:** form (declaration, `const` arrow, `const` function expression, let or var, object or class member, nested, forward declaration, gone); body (concise, a block with a single return, a block); how its types were kept (inline, on the variable, `satisfies`, lost); its JSDoc.
  - **Order:** functions moved (outside the longest common subsequence of the order, the corpus's measure) and their lines; the reading direction from every reference between module-level functions; references above their definition; load-time references.
  - **Restructuring:** merged or inlined, nested, methods, a parameter added, a forward declaration.
  - **Everything else:** suppressions, comments lost, and the diff's size.
- **Per attempt:** Ultracite's partition against that attempt's issues and the handoff's. Verify re-run on the agent's file reproduced every committed verified file and `verify.json` (27 attempts).
- **From the session logs:** model and tool calls, cost or tokens, every shell command and whether it was refused, writes outside the run dir, commands that print the environment, searches for tests, reads of an installed Astro or Next.js, web access, project instructions, the final message, and exposure counted in the whole log, in tool calls and in tool inputs.
- **The oracle and classifier self-test: 37 cases, all as expected.**
  - the 3 prepared subjects;
  - the corpus's 25 variants, made by `func-style-examples.cjs`'s own `variantsOf` (compiled without its `main()` call) from the cleaned subject and normalised. Their oracle verdicts, Oxlint counts and moved functions equal `examples.json`'s;
  - 9 hand-made mutants: a reorder alone, a type on the variable, lost JSDoc, an inlined helper, a forward declaration, a call at load time that throws, a class, among others.
- **The hand classification** (`classifications.json`) reads every diff, final file and session text. Its edit and response readings agree with the automatic ones in 24 of 24. The automatic readings were visible while classifying, so this is a consistency check, not an independent one.

## 2. Results by subject and agent

| Subject × agent | Final edit | Oracle (final) | Both rules cleared | Retried | Left for review | Ultracite prints |
| --- | --- | --- | --- | --- | --- | --- |
| A, Claude | arrows, nothing moved 4 | same 4 | 4 | 0 | 0 | Fixed 5 of 5 ×4 |
| A, Codex | arrows 2, function expressions 2; nothing moved | same 4 | 4 | 0 | 0 | Fixed 5 of 5 ×4 |
| B, Claude | arrows, reordered 4 | same 4 | 4 | 0 | 0 | Fixed 16 of 16 ×4 |
| B, Codex | arrows 2, function expressions 2; reordered | same 4 | 4 | 0 | 0 | Fixed 16 of 16 ×4 |
| C, Claude | parameter added 3, methods of an object 1 | same 4 | 4 | 3 | 0 | Fixed 6 of 6 ×4 (3 "Took 2 attempts.") |
| C, Codex | parameter added 4 | same 4 | 4 | 0 | 0 | Fixed 6 of 6 ×4 |

Every final file passes all eight lint views for the two rules and adds no new rule in Oxlint.

**A.** All 40 functions were converted in place, keeping every parameter type, return type and JSDoc block.
- **Codex's function expressions.** a-codex-1 and a-codex-3 used `const x = function x(…) {…}`. a-codex-1 wrote them anonymous and verify's `func-names` fix added the names.
- **Concise bodies.** a-claude-4 made the three single-return bodies concise itself and kept `hrtimeToSeconds`'s inline comment. In the other four arrow runs, verify's `arrow-body-style` fix did it, and the comment ended up above the expression.
- **What Claude said.** Every Claude run said why losing hoisting is safe: "Declarations are hoisted and `const` bindings aren't, but every cross-reference … happens inside a function body. Those calls only run after the module has finished loading, so the change in definition order doesn't matter." (a-claude-1). Codex's messages say only that bodies and types are unchanged.

**B.** All 8 converted and moved the five helpers above the three exports, with no reference left pointing down.
- **Order.** Claude put the helpers in dependency order and the exports last, in four slightly different orders. Codex put `getConfigFieldLabel` first in three runs and `createConfigurationDriftRows` between the helpers and `groupConfigFieldsBySection`. 57–71 lines moved.
- **What Claude said.** "The order now matters, because a `const` can't be used before its line runs the way a `function` declaration could." (b-claude-2)
- **Codex's function expressions.** b-codex-3 switched on purpose, to keep block bodies (§6).
- **The generic helper** became `<T extends {…},>(…) => …` in every arrow run.

**C.** All 8 restructured; none left the cycle for review.
- **The converter as a parameter, 7.** Claude added it as the first or second parameter, with a `ConvertToSerializedForm` type alias and a comment saying why. Codex typed it `typeof convertToSerializedForm`, with no comment.
- **Methods of one object, 1.** c-claude-4 made `serializer` an object holding the three functions, with the keys sorted alphabetically "to avoid a new warning", and a two-line comment.
- **Exports unchanged at runtime.** The exported `serializeProps` keeps its name and arity everywhere, and behaviour is the same in all 318 scenarios.
- **Exported type narrowed.** In c-claude-1, c-claude-2 and c-claude-3, the retry changed the exported `props: any` to `props: Record<string, unknown>` (§4).
- **What the agents knew.** All 8 named the cycle, and 7 said reordering couldn't fix it:
  - "Turning them into top-level `const` arrow functions would always leave one used before it's defined, whatever the order. So they're now methods on one `serializer` object and call each other through `serializer.…`." (c-claude-4)
  - "The helpers are mutually recursive, so reordering them would move the use-before-definition errors elsewhere. I’m checking a forward declaration that preserves their call structure." (c-codex-1, a progress message)
- **The pilot's alternative.** The Claude pilot rejected a forward declaration on other grounds: "I also didn't use the other obvious workaround, declaring `let convertToSerializedForm;` early and assigning it later, because Ultracite's `prefer-const` rule would likely flag that."

## 3. Did it help a reader?

The reader judgement was made from a blind packet. For each of the 24 final files, the packet held the prepared subject, the final file (license headers removed) and their diff, under a seeded random item id with no run id or agent name. The question: would a developer new to the code find the final file easier to follow than the original, about the same, or harder? Behaviour, rule compliance and style preferences weren't part of it.

- **Rater 1** is the Claude model that ran the experiment. It rated from the packet but had seen the runs, so it isn't blind.
- **Rater 2** is a separate Claude subagent given only the packet and the codebook.

| Subject | Rater 1: easier / same / harder | Rater 2: easier / same / harder |
| --- | --- | --- |
| A | 0 / 8 / 0 | 0 / 8 / 0 |
| B | 0 / 8 / 0 | 0 / 6 / 2 |
| C | 0 / 1 / 7 | 0 / 1 / 7 |
| All | 0 / 17 / 7 | 0 / 15 / 9 |

- **Agreement: 22 of 24 (κ 0.81).** No file was rated easier by either rater.
- **The two disagreements** are B's function-expression runs (b-codex-2, b-codex-3). Rater 2 called them harder: "each declaration became a doubled-name `const x = function x(` header, some wrapped over three lines, which adds clutter to the reorder".
- **C's parameter versions are harder for both,** because the recursion now runs through an argument the reader has to trace to every call site. Rater 2 kept the two commented versions harder too: the comment "helps, but they stay 'harder'". The object version is about the same for both.
- **B's new order is about the same** for rater 1 in all 8 and for rater 2 in 6. Rater 1: "definitions precede uses, but a reader meets `formatScalarValue` before learning what the module is for".

Two raters from one model family, on 24 files, is a small and correlated panel (§11).

## 4. The retry loop and the Left for review line

- **21 of 24 runs took one attempt.**
- **The 3 retries** were all "new since the edit": "The previous edit resolved the issues it was given, but the linter now reports the new issues below".
  - **Why.** c-claude-1, c-claude-2 and c-claude-3 each added a function type alias that used `any`, taking the file from 19 to 22 or 23.
  - **The wrong lines.** `diff.ts` matches by rule and message, and every `no-explicit-any` message is identical. So the "new" issues handed back were the file's last matches: the original `Map<any, any>`, `Set<any>` and `props: any` at the bottom. The new ones near the top weren't named.
  - **What the agents did.** All three changed those lines, including the exported `serializeProps(props: any)` to `props: Record<string, unknown>`. They said so: "The TypeScript side effect: values typed as an `interface` with no index signature will no longer be accepted as `props`." (c-claude-1). The new `any`s stayed, and the count was back under the baseline, so verify passed.
- **A two-rule filter would have retried nothing** (§1.4).
- **The `Left for review:` line was used in none of the 24 runs.** C is what it exists for: the prompt says "If an issue needs a person's decision, leave it, explain why", and the agents explained exactly that, then restructured. c-claude-1's final message: "I fixed all six issues in `serialize.ts` (nothing left for review)."
- **What Ultracite printed:** "Fixed 5 of 5", "Fixed 16 of 16" and "Fixed 6 of 6 issues with …", with "Took 2 attempts." in the three retried runs, and exit 0 in all 24. Nothing the agents explained was printed.

## 5. Without an agent: `ultracite fix` and `--unsafe`, with each linter

Each linter's adapter `fixAndCollect` runs on a project laid out as init leaves it, on the upstream code (header stripped) and on the file the Oxlint arm hands over, safe and `--unsafe` (ESLint has no unsafe tier), through the mirror and through Ultracite's real adapters. That's 36 cases.

| Linter | Function forms or order changed | Still reported (A / B / C) | Help |
| --- | --- | --- | --- |
| Oxlint | none | func-style 5 / 8 / 4; no-use-before-define 0 / 8 / 2 | as in §1.1 |
| ESLint | none | func-style 5 / 8 / 4; @typescript-eslint/no-use-before-define 0 / 8 / 2 | "Disallow the use of variables before they are defined" (the rule's docs description) |
| Biome | none | nothing (no func-style equivalent is on, and `noInvalidUseBeforeDeclaration` reports only same-scope reads) | – |

- **The oracle:** same in all 36, ignoring key order. B's upstream code through Oxlint and Biome differs only in key order (their key-sorting fixes).
- **ESLint renames a function.** `unicorn/name-replacements`' autofix renames the non-exported `createConfigurationDriftValueDiff` to `createConfigDriftValueDiff` in B's four ESLint cases, and would rename `projectRef` to `projectReference`. Behaviour is unchanged.
- **Real adapters.** Ultracite's own Oxlint, Biome and ESLint adapters, run under Bun with init's config files and `node_modules` links, produce the same files and diagnostics as the mirror in all 36.

**Alternative settings,** from the mutant matrix (Oxlint and ESLint agree on every count):

| Text | Defaults | `{ functions: false }` | `{ variables: false }` | Biome | tsc |
| --- | --- | --- | --- | --- | --- |
| B converted in place (b03) | 8 | 8 | 0 | 0 | 0 |
| C converted in place (c03) | 2 | 2 | 0 | 0 | 0 |
| C converted, plus a call of `serializeProps` at load time above it (ch3, throws at import) | 3 | 3 | 1 | 1 | 2 (TS2448) |
| The prepared B (declarations) | 8 | 0 | 8 | 0 | 0 |

With `{ variables: false }`, the rule reports only the read that runs at load time, which is the one that crashes. The deferred references inside functions are what forced B's reorder and C's restructuring, and none of them crash.

## 6. What the agents said

Hand classification (`classifications.json`), runs in which each was true:

| | Hoisting | TDZ named | Mutual recursion | No order works | Claimed an order fixes it | Said why it ordered | When the calls run | `this` / `arguments` | Considered review | Looked for tests | Looked upstream | Own behaviour check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude, 12 | 10 | 0 | 4 | 4 | 0 | 12 | 7 | 11 | 1 | 0 | 0 | 0 |
| Codex, 12 | 0 | 0 | 4 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 9 |

- **Claude explained, Codex checked.** Every Claude message says why the conversion is safe (hoisting, `this`, when the calls run) and why the order is what it is. Codex's final messages are two sentences, and its reasoning is in progress messages. Codex compared its edit with the original in 9 runs ("All 26 runtime comparisons match the original behavior.", c-codex-1). Claude Code tried to lint or type-check in all 12 runs and was refused; 37 of its 51 shell commands were refused.
- **Nobody named the TDZ.** b-claude-2 described it ("a `const` can't be used before its line runs"), and four Claude runs checked that every call runs after the module loads.
- **On braces.** b-codex-3: "TypeScript passes. The lint check caught an additional arrow-body rule, so I switched to named function expressions to keep the original bodies intact." Claude's B runs made the single returns concise and cited the rule: "keeps Ultracite's `arrow-body-style` rule from flagging them" (b-claude-3).
- **On parameters.** c-claude-2: "One thing to check when it's re-linted: the helpers now take 4 parameters. If Ultracite turns on `max-params` with its default limit of 3, it would flag them."
- **An unchecked claim.** c-claude-2, narrowing the exported type: "Astro's own caller passes a `Record`, so it's unaffected." No run looked at Astro's code or history.

## 7. Sessions: tools, commands, exposure, locks

- **Tools.** Claude Code used Read, Edit, Bash, Glob and Grep: 5–21 tool calls a run, 4–19 model calls. Codex used `exec`, running shell commands, `apply_patch` and Node scripts: 6–18 tool calls, 7–19 model calls. No run used the web.
- **What Codex looked at outside the run dir,** as in earlier topics:
  - `AGENTS.md` in every directory from `/` down; it found none.
  - The main checkout's `node_modules/.bin/oxlint`, TypeScript and Ultracite's presets under `packages/cli/config/` (113 tool-input mentions of the checkout).
  - The npx and Bun caches.
- **Exposure.** Every tool input was checked against `EXPOSURE_PATTERNS`, and every call outside the run dir was read by hand.
  - **No locked path was read.** No tool call read a locked path, the corpus's func-style files, a clone, another run, the harness, the scratchpad, the bibliography or a post draft.
  - **Codex: six runs saw the locked folder's name.** They listed the system temp directory and saw `ultracite-research-func-style` (the oracle's scratch folder). b-codex-4's and c-codex-3's searches into it got "Permission denied". c-codex-4's test of a path inside it failed silently. c-codex-2's `rg` over the experiment folder, looking for tool binaries (it also globbed `*test*`), was denied every other run.
  - **Claude: refused or empty.** Its `ls` of the experiment root and its `cp` and `head` into `/tmp` were refused, and its Globs on the experiment root found nothing.
  - **Installed copies of the subjects.** The main checkout has Astro 7.3.2's built `serialize.js`, and the Bun cache has Next.js 16.2.9's `duration-to-string.js`. No tool input names either. Supabase Studio isn't published.
  - **No run printed the environment** or wrote outside its run dir.
- **Locks.** While an agent ran, 50–96 paths were locked (median 72), restored after each attempt. Each batch's snapshot (14 extra paths and 25 topic paths) was identical before and after, for the pilot and all four rounds. The locked paths were:
  - this harness's folders and every other run;
  - the corpus's func-style examples, results and calibration, every `func-style-*` script, and the whole corpus `out/` and `repos/` (history clones included);
  - `research/bibliography/func-style.md` and the README;
  - the main checkout's `research/agent-experiment/plans` and `lint-configs/`;
  - `ultracite-research-func-style`;
  - through `AGENT_EXPERIMENT_EXTRA_LOCKS`: the scratchpad and the corpus `repos/` and `out/` of the six other worktrees that have them.

  Not locked: `node_modules`.
- **Codex's memory.** `MEMORY.md` was rewritten during the pilot. No memory file mentions the experiment, the subjects or the rules (checked by `grep`).
- **Project instructions:** none loaded in any run.

## 8. The pilot

Two runs on C, `c-claude-pilot` and `c-codex-pilot`, are kept in `superseded-runs/` and not aggregated. They used the final setup and were re-measured with the final code.

- **Both passed the converter in as a parameter.** Behaviour was the same.
- **Claude retried once** for the same `no-explicit-any` reason as in the final runs. Cost: $1.54 over 289 s.
- **Codex** finished in one attempt: 35.9k tokens, 155 s.
- **The Claude pilot wrote outside its run dir.** It created `/tmp/lintcheck-serialize/oxlintrc.json`, which `acceptEdits` allows, and said so in its message. The file was deleted before the final runs, and the harness now records writes outside the run dir (`writesOutsideRunDir`). No final run made one.

## 9. Issues in Ultracite (not fixed)

1. **A mutual recursion is turned into a restructure and reported as fixed.**
   - What pushes it: the prompt says a diagnostic that still fires "is a failed fix" and to "rework the code so the rule genuinely no longer applies"; Oxlint's help adds "or remove the reference if it is not needed".
   - What happened: all 8 C runs restructured working code to satisfy an ordering rule, and Ultracite printed "Fixed 6 of 6".
   - In the corpus there are 23 such components in 21 files, and 119 statement lists with no valid order (corpus REPORT §4.4, §4.8).
2. **`func-style`'s help is the rule's description.** It doesn't say that arrows are allowed, or that converting makes order matter.
3. **Retries name the wrong lines when messages repeat.**
   - `diff.ts` matches by rule and message, so a "new" `no-explicit-any` is whichever one comes last in the file.
   - Three agents were sent to the original `any`s and changed an exported type, while the `any`s they had added stayed.
   - Related to length-limits issue 2 (counts in messages).
4. **ESLint core reports a multi-line single-return arrow either way.**
   - Written concise: `unicorn/consistent-arrow-return-style` ("Use an explicit return for a multiline arrow function body."). Written as a block: `arrow-body-style` ("Unexpected block statement surrounding arrow body…"). Checked on a minimal file with the core preset.
   - In B's six arrow runs, ESLint's `unicorn/consistent-arrow-return-style` reports 4 against the subject's 2. Oxlint core has no port of the unicorn rule.
5. **`no-use-before-define` at its defaults reports references that can't crash.**
   - With `{ variables: false }` it reports the read at load time and nothing else on these subjects (§5), so C converted in place would have been clean and B wouldn't have needed a move.
   - The corpus counts 36 same-scope reports against 5,428 at the defaults (corpus REPORT §4.5).
6. **Explanations are discarded unless an issue is left for review.** Claude's accounts of why C was restructured never reach the user (also length-limits §9.6 and react-effects §9.6).
7. **`unicorn/name-replacements`' autofix renames non-exported functions in `ultracite fix` with ESLint.** `createConfigurationDriftValueDiff` became `createConfigDriftValueDiff`. Not this topic's rule; noted.
8. **Biome users get no `func-style`** (corpus REPORT §7.1). Here Biome reports nothing on any subject.

Also noted, not Ultracite's code:

- Claude Code's `-p` permissions refused every lint and type-check, so no Claude run could verify its edit; Codex verified every run.
- Verify's fixes did part of the style work: `arrow-body-style` made 23 bodies concise, `func-names` named a-codex-1's function expressions, and in the self-test `no-var` turned the `var` gaming move into `const`.

## 10. Harness changes

- **`scripts/topics/func-style.cjs`** (new):
  - subjects and preparation: running `ultracite init` for each linter, stripping, the comment check, normalising and checks;
  - the collect and verify hooks with the handoff filter;
  - the eight lint views and `tsc`;
  - the oracle wrapper (the stub's name, export names);
  - the function and order facts from scope analysis, and the edit reading;
  - measure; the self-test with the corpus variants, the hand-made mutants and the mirror check;
  - the deterministic paths with the real adapters;
  - aggregate and tables.

  It imports `func-style-oracle.cjs` and `func-style-lib.cjs` unchanged. It reads `func-style-examples.cjs`'s `variantsOf` by compiling the script without its final `main()` call. No corpus file changes. It removes the `CORPUS_REPO_LISTS` variable the corpus library sets, so the agents' environment doesn't carry it.
- **`harness-tests/func-style/mutants.json`** (new): the 25 corpus variants and 9 hand-made mutants, with their expected readings.
- **`.gitignore`:** comments name this topic. The existing per-attempt patterns cover its session logs, stdout and stderr in `runs/` and `superseded-runs/`.
- **No other shared script changed.**

## 11. Caveats

- **Sample:** 4 runs per subject and agent. Every cell is uniform in behaviour and in the response, so the result on C (8 of 8 restructured) isn't noise. The split between arrows and function expressions in Codex is a 4-run observation.
- **The handoff is filtered** (§1.4), and the filter caused all 3 retries. With C's 19 `any`s in the first handoff, an agent might have worked differently.
- **The reader judgement is two Claude models on 24 files** (κ 0.81). Rater 1 had seen the runs, and no human rated readability.
- **The oracle checks runtime behaviour through the exports.** The narrowed exported type in three C runs is a type-level change it can't see, and `tsc` on the subject alone has no callers to fail.
- **One cycle shape.** C is a single three-function recursion. Agents might handle a two-function cycle, a cycle across modules or a load-time cycle differently.
- **The subjects are famous code,** and installed copies of A and C exist on this machine. No run read them or mentioned the projects' history or tests.
- **The run dir isn't a full project.** It has no `node_modules` or git, and its path names the experiment and topic, as in every topic.
- **The agents' environment** carried the harness's variables, `RESEARCH_TOPIC=func-style` among them, as in every topic. No run printed it.
- **Reasoning isn't fully logged.** Claude's thinking blocks and Codex's reasoning summaries are empty, so what each agent understood comes from its messages.
- **User-level configuration applied:** Codex's memories and plugins, and Claude Code's settings.

## 12. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=func-style
node scripts/prepare-subjects.cjs        # subjects/func-style/ (runs ultracite init for each linter; stripped, checked, normalised; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (37) and the mirror against the CLI (37) -> oracle-self-test.json (~3 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~10 min)
node scripts/report-tables.cjs > results/func-style/tables.md
```

- **Re-measuring without the session logs:** `measure.cjs <run>` re-measures a run from its committed files, carrying the session-derived fields over from `measure.json`.
- **The hand classification is an input** (`classifications.json`, both raters' labels and reasons). The blind packet and rater 2's raw labels were scratch files.
- **Earlier topics.** Every earlier topic was re-measured, re-aggregated and self-tested from its committed runs in this worktree, and its results folder was restored afterwards.
  - Every self-test passes.
  - No shared script changed, so the code the earlier topics run is the same before and after this topic's changes.
  - Against the committed files they show only the drift the length-limits report lists:

  | Topic | Against the committed files (apart from `generatedAt`) |
  | --- | --- |
  | cognitive-complexity | tool versions in `results.json` |
  | floating-promises | the known 947ca03e drift; tool versions |
  | security-rules | the known preset drift; Unicorn 79 and Biome 2.6 rules in the per-run counts and hits |
  | dead-code | the known `sonarjs/void-use` drift |
  | import-cycles | Unicorn 79 and Biome 2.6 rules; Biome's shorter barrel message |
  | accessibility | `hasSessionLog`; tool versions |
  | todo-comments | `hasSessionLog`; the 947ca03e drift; Unicorn 79 and Biome 2.6 rules |
  | sort-keys | `hasSessionLog`; Unicorn 79, Biome 2.6 and Oxlint 1.89 rules |
  | react-effects | `hasSessionLog`; Biome 2.6 and Unicorn 79 rules |
  | length-limits | `hasSessionLog`; the Bun version (1.4.2 → 1.4.4) |

  The corpus work's two backwards-compatible changes (`import-cycles-graph.cjs`, `length-history.cjs`) are in this worktree, and every topic reproduces with them.

## 13. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/func-style.cjs` | the topic |
| `subjects/func-style/` | the three subjects and B's and C's `stubs.ts`; `run-files/` (init's files as the fix pass leaves them, and `tsconfig.json`); `init/` (what `ultracite init` writes for Oxlint, Biome and ESLint); `init.json`; `subjects.json`. Oxlint's two configs and Biome's are stored with a `.txt` suffix. |
| `harness-tests/func-style/mutants.json` | 25 corpus variants and 9 hand-made mutants with their expected readings |
| `results/func-style/runs/` | 24 runs: meta, handoff, before/after, per-attempt artifacts, `measure.json` |
| `results/func-style/superseded-runs/` | the pilot (not aggregated) |
| `results/func-style/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json` | aggregate, tables, hand classification (both raters), self-test and mirror check |
| `../corpus/scripts/func-style-oracle.cjs` | the oracle, shared with the corpus |
