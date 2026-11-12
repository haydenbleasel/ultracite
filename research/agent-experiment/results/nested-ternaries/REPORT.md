# Nested ternaries: agent experiment report

The agent experiment for the post on nested ternaries, run on 2026-11-12 (UTC) with Claude Code 2.1.322 (claude-opus-5-5, effort xhigh) and Codex CLI 0.167.0 (gpt-6-astra, reasoning effort xhigh). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Ultracite turns ESLint's `no-nested-ternary` on in Oxlint and ESLint core, and Biome's `noNestedTernary`, with `unicorn/prefer-ternary`, `curly`, `no-else-return` and the other conditional rules around it. Hayden gave the reason in these words: "it was the strictness policy but also nested ternaries can require more cognitive effort to work through and are hard to easily modify vs simple if statements. when applicable, i prefer using `if (bool) return x;` so you can "short circuit" or end the loop early and keep the logic flat". No linter fixes a nested ternary, so in a real project `ultracite fix --claude` or `--codex` is what rewrites one. Questions:

1. When Ultracite hands the rule's report to an agent, does the agent rewrite it without changing behaviour?
2. Does it choose a rewrite that fits the position: early returns where there's a `return`, a variable, helper or component in JSX?
3. Does it fall for the rewrites that look equivalent and aren't: a lookup object that evaluates every branch (C), `&&` that renders `0` (B), an `||` chain (A)?
4. Does the result use Hayden's early-return shape, and does it read better?
5. What do Ultracite's other rules and fix passes (`curly`, ESLint's `prefer-ternary`, leaked-render) do to the agent's edit?
6. What do the retry loop and the `Left for review:` line do, and what does a user get from `ultracite fix` and `--unsafe` with no agent?

## TL;DR

- **Every final file behaves like the subject, in every run and every attempt.**
  - The oracle found no difference in 24 of 24 runs: A's 320 page paths, B's 80 renders (the tree as React shows it, and the hooks each render calls), C's 240 tsconfigs (each alias's regular expression, replacement and matches).
  - No run added a type error, a suppression, a config change or an Oxlint or ESLint report, or touched another file or any code outside the ternary.
  - The oracle does catch the wrong rewrites: its self-test flags the corpus's `&&`/`||` chain on A (2 of 320), the tests reordered (19), `notebooks.length &&` on B (24 of 80 render a `0`), `&&` without `!isPending` (40), C's object lookup (185 of 240), the increment moved above the test (185), one counter for every target (57), and a hand-made eager `Map` (185).
- **Results by subject** (4 runs per subject and agent, all in one attempt):

  | Subject | The right response | Claude Code | Codex | Easier to follow? Rater 1 / rater 2 (blind), 8 files each |
  | --- | --- | --- | --- | --- |
  | A, unnests cleanly (a two-test chain in a `return`) | early returns or if/else, same test order | two guards and a final return: 4 | one guard, the inner pair kept as a single ternary: 4 | easier 8 / 8 |
  | B, JSX (loading / empty / list inside two wrappers) | the content above the return (a variable or a helper), or a child component | `let content` + if/else if/else: 2; a `renderContent` helper with early returns: 2 | `let content` + if/else if/else: 4 | easier 8 / 8 |
  | C, the trap (`++matchId` in the first branch of a `.map` callback) | a block body with early returns, a switch or a lookup of functions, the counter only for `*` | block body, two guards: 4 | the same, character for character: 4 | easier 8 / 8 |

  - **Every rewrite fits its position.** Early returns where the ternary was a return value (A, C); in B, where no statement can go inside the JSX, the choice moved above the return, as a variable (6) or a helper (2). No run repeated B's wrappers, wrote a child component, or used a switch, a lookup, an IIFE or any of the corpus's gaming moves.
  - **No run fell for a trap.** No `&&` in B's JSX, no lookup in C; the counter is still in the `*` branch of all 8 C files. Every Claude message on C said so ("`*` still becomes `$1`, `$2`, … (with `matchId` incremented only for `*`)", c-claude-1); no Codex message mentioned it.
  - **The agents differ on A.** Claude unnested both tests; Codex made the smallest change that clears the rule, `if (…) { return _page.slice(6); }` then `return _page === "/index" ? "/" : _page;`, in all four runs.
- **Hayden's shape, in these runs.** 32 guards were added (A 12, B 4, C 16), every one braced by the agent itself; none is the one-line `if (bool) return x;`. So `curly` had nothing to report and no fix pass had anything to brace. Early returns appear wherever there was a `return` to short-circuit (16 of 16 A and C runs, and B's two helpers); B's other 6 runs are a flat if/else if/else chain assigning one variable.
- **Did it help a reader?** Both raters called all 24 final files easier to follow than the original (24 of 24 agreement; with no variation κ is undefined). Both are Claude models; rater 1 ran the experiment, rater 2 saw only a blind packet. The corpus scorer moves less: A 4 → 3, B 8 → 7 (`let`) or 6 (the helper), C's file 15 → 14 (its callback 3 → 2).
- **Ultracite's other rules and fix passes left the edits alone.**
  - **In the views:** ESLint's `unicorn/prefer-ternary`, `no-else-return`, `curly` and `react/jsx-no-leaked-render` report nothing on any final file. The one thing an edit added anywhere is Biome's `noImplicitAnyLet` and `noEvolvingTypes` on the untyped `let content;` (5 of B's 6 `let` runs; b-claude-4 typed it `JSX.Element`).
  - **`ultracite fix` and `--unsafe` on every final file,** with Oxlint, Biome and ESLint (120 passes): no pass wrote a ternary back, nested one, braced a guard or rewrote an `&&`. ESLint's `prefer-ternary` doesn't fire on a guard that follows another guard, or on a `return` whose value is already a ternary (Codex's A). What the passes did change is unrelated, and behaviour holds ignoring attribute and class order and regex flags (§5).
- **The retry loop never ran and nothing was left for review.** Every run cleared the rule in one attempt, so Ultracite printed "Fixed 1 of 1 issue with Claude Code." (or "Codex.") and exit 0 for all 24, followed by "Claude Code said:" or "Codex said:" and the end of the agent's final message, which current Ultracite prints whenever the agent left nothing for review.
- **Without an agent, nothing unnests.** `ultracite fix` and `--unsafe` with Oxlint, Biome and ESLint, on each subject as upstream wrote it and as handed over (30 cases), never touched a nested ternary; all three linters still report it, and ESLint also reports `sonarjs/no-nested-conditional`. Two passes rewrite code next to it: Oxlint `--unsafe` turns C's `++matchId` into `(matchId += 1)` (`no-plusplus`'s dangerous fix; same behaviour), and Biome's safe `useUnicodeRegex` adds a `u` flag to C's two regular expressions, which changes the regex objects `getConfigAlias` returns (79 of 240 results, by their printed flags) but not what they match on the sample ids. Ultracite's real adapters agree with the harness's mirror in all 150 passes.
- **Exposure.** No tool call read a locked path, a corpus file, a clone, an installed Astro or Next.js, or another run. Codex looked for an `AGENTS.md` above its run dir, up to `/` or across the experiment root, in 10 of 12 runs, as in earlier topics, and found none. No run used the web.
- **Cost:** Claude Code $3.88 for 12 runs (median $0.30, $0.29–0.44). Codex 225k tokens as reported (median 17.7k, 16.2k–31.6k). 9.7 minutes of agent time over 24 attempts (runs 14.5–47 s). The pilot cost $0.41 and 18.3k tokens more.

## 1. Setup

### 1.1 Subjects

The subjects are the three in `corpus/examples/nested-ternaries/` (corpus REPORT §8 and §10). Each was run 4 times with Claude Code and 4 times with Codex, 24 runs in all, from 07:13 to 07:27 UTC, in four rounds that each ran every subject with every agent once, in a different order.

| Subject | File in the run dir | Handoff (Oxlint, after the filter) | The right response |
| --- | --- | --- | --- |
| A | `denormalize-page-path.ts` (Next.js, `packages/next/src/shared/lib/page-path/denormalize-page-path.ts` @ d8bfc3c9, L4-19; MIT), with `stubs.ts` | `no-nested-ternary` ×1, L50: a two-test chain that is the function's whole return value | early returns (or if/else) testing the conditions in the same order; same result for every page path |
| B | `ExplorerNavNotebooks.tsx` (Supabase Studio, `apps/studio/components/layouts/ExplorerLayout/ExplorerNavNotebooks.tsx` @ 09f80f52, L21-114; Apache-2.0), with `stubs.tsx` | `no-nested-ternary` ×1, L119: loading / empty / list, a JSX child inside `ExplorerNavResourceWrapper` and a `div` | the content computed above the return (a variable set by if/else, or a helper that returns early), or a child component; same rendered tree and hooks |
| C | `index.ts` (Astro, `packages/astro/src/vite-plugin-config-alias/index.ts` @ 9050e381, L8-68; MIT), with `stubs.ts` | `no-nested-ternary` ×1, L93: a `.map` callback's concise body, `` segment === "*" ? `$${++matchId}` : segment === "$" ? "$$" : segment `` | a block body with early returns, a switch, or a lookup of functions, so `++matchId` runs once per `*` and in order; or leave it for review |

Every handoff is Oxlint's report: message "Do not nest ternary expressions.", help "Refactor nested ternary expressions into if-else statements for better readability.", and the rule's URL on oxc.rs.

### 1.2 The run dir: what `ultracite init --linter oxlint --frameworks react` leaves

`prepareSubjects` runs Ultracite's own `init` (the CLI source, under Bun, `--linter oxlint --frameworks react --pm bun --skip-install --yes --quiet`) in a scratch project that starts with a `package.json` with TypeScript and the corpus examples' `tsconfig.json`. React is selected with `--frameworks`, as a user of a React project would select it; the subjects' React imports are the stub module's, so the starting `package.json` lists TypeScript only, as in the func-style topic. Init writes three files (`subjects/nested-ternaries/init.json`):

- `oxlint.config.ts`: `extends: [core, react]`, `env: core.env`, `ignorePatterns: core.ignorePatterns`, importing `ultracite/oxlint/core` and `ultracite/oxlint/react`. `prepareSubjects` fails if the React preset isn't in `extends`.
- `oxfmt.config.ts`: `...ultracite` from `ultracite/oxfmt`.
- `package.json`: `ultracite` 8.2.0, `oxlint` ^1.90.0 and `oxfmt` ^0.75.0 added, with the `check` and `fix` scripts.

`no-nested-ternary` is on in core, so the user changes nothing. The run dir is these files (as Ultracite's fix pass formats them), `tsconfig.json`, the subject and its stub module.

Init's untouched output for Oxlint, Biome (`biome.jsonc` extending core and react, and a `.gitignore`) and ESLint (`eslint.config.mjs` with `...core, ...react`, Prettier and Stylelint configs) is in `subjects/nested-ternaries/init/`, for the deterministic paths. Oxlint's two configs and Biome's are stored with a `.txt` suffix, so no file under `research/` has a name this repo's linters would load as a nested config. The run dir has no `node_modules` and no git.

### 1.3 Preparing the subjects

- **Header.** The `stripFields` fields are removed (rules it hits; why it unnests cleanly, needs a restructure or is a trap; what the project did; behaviour to preserve; the expected, tempting and gaming responses), and so is the subject line ("Nested-ternaries subject C: a lookup that looks equivalent and isn't."). `TEXT_EDITS` then rewrite:
  - B's `Components:` field, which listed the chain's three branches (a loader, the empty message with its two texts, the list), to an identification;
  - C's `Function:` field, whose last sentence said each `*` "becomes a numbered capture reference (`$1`, `$2`, …)", which is the counter's job;
  - the "copied verbatim" sentences, which normalising made untrue, to "copied, with their formatting changed";
  - the license lines that pointed into `research/corpus`; B's became the standard Apache 2.0 notice;
  - the stub modules' names. The corpus calls them `nested-ternaries-a-stubs.ts` and so on, which names the topic, so the run dir calls them `stubs.ts` (A, C) and `stubs.tsx` (B), and the subjects import `./stubs`;
  - the stubs' headers ("STUB for nested-ternaries subject B"), B's stub notes that named the behaviour oracle and its renderer, and C's `ADDED for the behaviour oracle` comment.
- **The comment check.** Every comment line of the subject and its stub, header and STUB notes included, is checked against 21 patterns:
  - **The construct:** ternary, "conditional expression/operator/render", `? :`; nest; chain.
  - **The rewrites:** early return, guard, short-circuit, flat; `if (`, if/else, else, statement; lookup, switch, dispatch.
  - **The traps:** evaluate, eager, lazy; `&&`, `||`, leak, falsy, truthy, render `0`, zero; increment, `++`, counter, `matchId`, capture group or reference, numbered, `$1`; B's branches (empty, pending, loader, loading, "no notebooks", "none created"); "default case", fall through.
  - **Judgement:** readable, cognitive, complexity, easy, simple, clean, clear; review, decide, decision; deliberate, intentional, on purpose, by design, preference.
  - **Tools, analysis and history:** every linter, Ultracite, sonar, unicorn, curly; agent, experiment, subject, analysis, corpus, research, oracle, scenario, harness, verbatim, fix, bug, wrong; the stripped field names; upstream, later, history; every PR and commit number in the corpus headers, and the name of the person who wrote C's counter fix.

  One line is allowed by name: B's stub's `biome-ignore lint/style/noNamespace: JSX's own namespace`, a suppression its JSX namespace needs under Biome, which names no rule about conditionals. The same patterns match 46, 44 and 51 lines of the unstripped corpus subjects (3, 7 and 3 of their stubs), so a clean prepared subject means the check ran.
- **Kept:** source, commit, permalink, license, every STUB note and every upstream comment (C's "Internal index used to calculate the matching id in a replacement." among them).
- **Normalised as far as Ultracite's Oxlint pass goes.** `oxlint --fix .`, `oxfmt --write .` and `oxlint -f json .` run until no file changes (two passes each). Besides the formatting (double quotes, semicolons, two-space indents for C's tabs, 80 columns), Oxlint's safe fixes applied:
  - **A:** `prefer-const` (`let _page` to `const`) and `no-negated-condition` with unicorn's: the inner `_page !== '/index' ? _page : '/'` became `_page === "/index" ? "/" : _page`. The agents get the flipped chain.
  - **B:** the type-only imports split into `import type` (`import/consistent-type-specifier-style`); Oxfmt sorted the Tailwind classes in two `className`s.
  - **C:** braces on the two `if (…) return null;` guards (`curly`), `type Alias` became an `interface`, the type imports split.
  - **The stubs:** `replace` with a global regex became `replaceAll` (A, C); B's `IntrinsicElements` index signature became a `Record`.
- **Normalising changed no behaviour** (`subjects.json` `checks`).
  - A's and C's traces equal the corpus subjects' in every scenario.
  - B's differ in all 80 renders, only in the order of the classes in the two `className` strings Oxfmt sorted. With each `className`'s classes sorted, B is the same. The prepared subject is the reference for every run.
  - The oracle loads the corpus's stub. Each prepared stub, put in its place, gives the prepared subject the same trace in every scenario.
  - `tsc` is clean (strict, the examples' tsconfig, Node's types from this repo), the collect leaves every file unchanged, and the handoff is exactly one `no-nested-ternary`, as the corpus measured.

### 1.4 The handoff and the filter: a deviation from a real project

After normalising, Oxlint still reports other diagnostics, which Ultracite would hand over with the rule:

| Subject | In the subject | In the stub module |
| --- | --- | --- |
| A | `func-style` 1 (the exported function declaration) | `func-style` 2, `require-unicode-regexp` 1 |
| B | `unicorn/filename-case` 1 (`ExplorerNavNotebooks.tsx`) | `no-empty-function` 4, `typescript/no-namespace` 1 |
| C | `no-plusplus` 1 (on the line with the ternary), `prefer-named-capture-group` 1, `require-unicode-regexp` 3 | none |

So the experiment filters, in the handoff and in every re-lint, as the six previous topics did:

- **Kept:** `no-nested-ternary`, plus any other diagnostic that isn't one of the prepared project's own, matched by rule and message, file by file, as Ultracite's `diff.ts` matches them.
- **What it models:** a project that lints clean apart from this rule. A real project with these files would hand over 2, 2 and 6 issues in the subject (and the stub modules' own, as further files).
- **C is where it matters most:** a real handoff would put `no-plusplus` ("Unary operator '++' used.") on the same line as the nested ternary, pointing the agent at the counter.

### 1.5 The run: Ultracite's retry loop, through the Oxlint adapter

`run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does:

- **Collect:** the Oxlint pass on the project, then the filter.
- **Attempts:** up to `MAX_AGENT_ATTEMPTS` (3), each with `buildPrompt` or `buildRetryPrompt` (imported from `prompt.ts`), under `AGENT_TIMEOUT_MS` (now 10 minutes) and `KILL_GRACE_MS` (10 s).
- **Verify after each attempt:** the same pass on the file, in place, then the filter.
- **Deciding whether to retry:** `parseLeftForReview` drops the issues the agent listed for review; `nextRetry` splits what's left into issues still reported and issues new since the edit. There's no retry after a timeout.

**The mirror had to move.** The CLI's agent-fix code changed after the func-style runs, so `scripts/ultracite-adapters.cjs`'s hash check failed against it in four slices (`linters.ts` Oxlint, `index.ts` fixFileGroup, `run-agent.ts`, `diff.ts`). Its "v2" revision (the prompt-revision topic's) matched the CLI at 4236d848 exactly; since then d51d2433 (#866) and 872f9376 (#871) changed three slices. This topic adds a "v3" revision, the CLI at 9743dfcb (unchanged at cfa365be), which the topic selects (`ULTRACITE_MIRROR=v3`):

- **`diff.ts`, ported function by function:** a message keeps its numbers except a limit rule's and numbers that point at a line or count repeats; `recordSourceLines` keeps the whole file as the linter read it and returns the diagnostics to match; within one rule and message a fresh report pairs first with an original on an unchanged line, then with the original whose place it sits in (between the nearest lines that occur once in both files), then in file order, and an original fixed where it stood leaves a report elsewhere new; leftovers that differ only in numbers pair when they're on the original's unchanged line. `fingerprintSources` and `releaseSourceLines` are ported for multi-file runs.
- **`index.ts`:** `verifySafely` returns what `recordSourceLines` returns; `runAgentFix` records each file's issues at its turn. `run-one.mjs` does the same for the handed-over group under v3 (opt-in; v1 and v2 runs are unchanged).
- **`linters.ts` (Oxlint):** a JS-plugin rule's help is now looked up where Oxlint resolves the plugin from the config. The harness resolves plugins from this repo through its configs, so the mirror keeps v2's lookup; this topic's config loads no JS plugin.
- **Checked against the real code:** the self-test runs the port and the CLI's own `diff.ts` side by side on nine edits (a repeated message with a new report above the originals, one fixed in place and one added elsewhere, a limit rule's count, a line number in a message, a magic number fixed and another added, the ternary moved, rewritten with a new one elsewhere, a report on a line that reads the same elsewhere, no change). They agree in all nine.
- **Re-measurement is faithful too.** v2 re-measured from the committed JSON without source lines, so repeated reports paired in file order. Under v3 the measure rebuilds each report's file from the run's committed copies (the handoff from `before.<ext>`, each verify from that attempt's `verified.<ext>`), and recomputes every retry decision; all 24 reproduce the run's.
- **v1 and v2 are unchanged:** their hash checks report exactly the drift they did before the change (v1: four slices; v2: three), and no code path of theirs reads anything v3 adds.

The configs and the real adapters:

- **The configs.** The harness passes `-c` with configs equivalent to init's (core and react) that import the presets by absolute URL. Init's own files are in the run dir for the agents to read.
- **The mirror matches the CLI.** The self-test runs Ultracite's real Oxlint adapter under Bun, in a project with init's own config files and `node_modules` links, next to the mirror. On the 3 prepared subjects and 49 mutants, all 52 collect-and-verify comparisons match: every diagnostic field but `raw` (compared as a set, since Oxlint reports files in the order its threads finish), and the subject, stub, `package.json` and `tsconfig.json` each pass leaves.
- **Agent arguments:** `run-one.mjs` checked them against `agents.ts` before every run (`claude -p --permission-mode acceptEdits --allowedTools Read,Edit,Write,Grep,Glob`; `codex exec --sandbox workspace-write --skip-git-repo-check -`).

### 1.6 Measurement

- **Two states per attempt:** the file as the agent left it, and as verify left it (what the next attempt gets and what stays in the project).
- **Lint, inline config honoured and ignored, in three views:**
  - **Oxlint:** the user's config (core and react), the handoff's view.
  - **ESLint:** what `ultracite init --linter eslint --frameworks react` writes (core and react): `no-nested-ternary`, `sonarjs/no-nested-conditional`, `unicorn/prefer-ternary` with Ultracite's options (`"always"`, `checkComputedMemberAccess`, `checkVaryingBase`), `curly` (`"all"`), `no-else-return` (`allowElseIf`) and, for `.tsx`, `react/jsx-no-leaked-render` among its rules. React Doctor's rules are left out of every count: the plugin's licence restricts use of its output as evaluation data (as in the react-effects topic).
  - **Biome:** what `ultracite init --linter biome --frameworks react` writes (core and react), `biome check`: `noNestedTernary`, `useBlockStatements`, `noUselessElse`, `noLeakedRender` among its rules.
  - Each view reports the nested-ternary rules (`no-nested-ternary`, `unicorn/no-nested-ternary`, `sonarjs/no-nested-conditional`, `noNestedTernary`) and 49 conditional rules an edit can trip (prefer-ternary, curly, no-else-return, leaked-render, the `let` rules, the rules a helper or component trips, `no-plusplus`, complexity), and every rule the state adds against the prepared subject.
- **`tsc`** with the subject and its stub module, strict, the examples' tsconfig and Node's types. A module the run dir can't resolve (such as `react`) would be marked as the environment's; none appeared.
- **The oracle:** `corpus/scripts/nested-ternaries-oracle.cjs`, imported unchanged, against the prepared subject: A's 320 page paths, B's 80 renders (the rendered tree as React would show it, `0` included, and the hooks each render calls), C's 240 tsconfigs (each alias's regular expression and replacement, and what it does to 12 import ids), each after importing the module. Verdicts: same, changed (with the number of differing calls), hooks-changed, import-crash, exports-changed, oracle-error. A looser reading ignores object key order, class order in a `className` and a regular expression's printed flags, for the fix passes that change those (§5).
- **The edit, from the AST** (`editFacts`, `editOf`):
  - **the rewrite:** guards added (an `if` without `else` whose branch returns) and whether each is the one-line `if (bool) return x;` shape; if/else returns; a `let` assigned in branches; new helpers (with guards, if/else, a switch, or a body that is one ternary) and child components (a capitalised function returning JSX and rendered as an element); switches; lookups (an object literal indexed by a value, its values called or not), `Map#get`; IIFEs; `&&`/`||` replacing the chain, and `&&` in JSX with a bare `.length` operand; a new const initialised with a ternary; the nested trees and conditionals left (the corpus's inventory);
  - **C's counter:** every update of `matchId`, and the construct that decides whether it runs (a ternary branch, an `if` branch, a switch case, an object literal's value, a function in an object, unconditional);
  - **B's wrappers:** how many `ExplorerNavResourceWrapper`s the file renders;
  - **cost:** cognitive complexity of every function with the corpus's scorer (sonarjs at 0), the file's sum and the enclosing function's; lines added and removed;
  - **everything else:** other top-level code changed, the enclosing function's form and signature, type annotations, comments lost, suppressions, other files.
- **Per attempt:** Ultracite's partition against that attempt's issues and the handoff's, with each report's file rebuilt from the committed copies, and the retry decision recomputed. Verify re-run on the agent's file reproduced every committed verified file and `verify.json`.
- **What Ultracite prints:** `fileOutcome` (the mirror's `fixFileGroup` tally): the outro, the notes, and the agent's final message as `describeFinalMessage` cuts it (the last 8 lines, at most 800 characters), from the last attempt's stdout.
- **From the session logs:** model, effort, model and tool calls, cost or tokens, every shell command and whether it was refused, searches for tests, reads of an installed Astro or Next.js, web access, writes outside the run dir, project instructions, the final message and progress messages, sentences about evaluation order, side effects, the counter, `0`, the default branch, readability and the reasons given, and exposure counted in the whole log, in tool calls and in tool inputs.
- **The oracle and classifier self-test: 114 checks, all as expected** (`oracle-self-test.json`):
  - the 3 prepared subjects;
  - the corpus's 32 variants, made by `nested-ternaries-examples.cjs`'s own `variantsOf` (compiled without its `main()` call) from the cleaned subject and normalised, and 3 of them as written. Their verdicts, differing counts and Oxlint `no-nested-ternary` counts equal `examples.json`'s;
  - 14 hand-made mutants (a const arrow with guards, one guard and one ternary, `let` + if/else, one-line guards as written and normalised, swapped tests, early returns that repeat B's wrappers, a function-declaration helper, the chain moved into a const, C's one-line guards, a helper closed over the counter, an eager `Map`, a lookup with `matchId + 1`, an Oxlint-only suppression);
  - the 9 diff.ts port cases (§1.5) and the 52 mirror comparisons; and the priming check.
- **The hand classification** (`classifications.json`) reads every diff, final file, final message and progress message. Its edit and response readings agree with the automatic ones in 24 of 24. The automatic readings were visible while classifying, so that's a consistency check, not an independent one.


## 2. Results by subject and agent

| Subject × agent | Final edit | Oracle (final) | Rule cleared (Oxlint / ESLint / sonarjs / Biome) | Guards added (one-line) | Cognitive (file sum, before → after) | Lines +/− | Retried | Left for review | Ultracite prints |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A, Claude | early returns: two guards, a final return 4 | same 4 | 4 / 4 / 4 / 4 | 8 (0) | 4 → 3 | +7 / −5 | 0 | 0 | Fixed 1 of 1 ×4 |
| A, Codex | early returns: one guard, then `return _page === "/index" ? "/" : _page;` 4 | same 4 | 4 / 4 / 4 / 4 | 4 (0) | 4 → 3 | +4 / −5 | 0 | 0 | Fixed 1 of 1 ×4 |
| B, Claude | `let content` + if/else if/else 2 (one typed `JSX.Element`); a `renderContent` helper with early returns 2 | same 4 | 4 / 4 / 4 / 4 | 4 (0) | 8 → 7 (`let`), 6 (helper) | +28–31 / −23 | 0 | 0 | Fixed 1 of 1 ×4 |
| B, Codex | `let content` + if/else if/else 4 | same 4 | 4 / 4 / 4 / 4 | 0 | 8 → 7 | +28 / −23 | 0 | 0 | Fixed 1 of 1 ×4 |
| C, Claude | a block body with two guards 4 | same 4 | 4 / 4 / 4 / 4 | 8 (0) | 15 → 14 | +9 / −3 | 0 | 0 | Fixed 1 of 1 ×4 |
| C, Codex | the same block body 4 | same 4 | 4 / 4 / 4 / 4 | 8 (0) | 15 → 14 | +9 / −3 | 0 | 0 | Fixed 1 of 1 ×4 |

Every final file passes all three views for the nested-ternary rules, inline config ignored and honoured, and type-checks. No final file adds a rule in Oxlint or ESLint; in Biome, the untyped `let content;` adds `noImplicitAnyLet` and `noEvolvingTypes` (b-claude-1, b-codex-1 to 4). No run changed anything outside the ternary and the lines that compute its replacement: other declarations, the enclosing function's form and signature, comments and other files are as they were.

**A.** Every run kept the tests in the order the ternary had them (they're mutually exclusive, so the order couldn't change the result, which the self-test's swapped mutant confirms).
- **Claude unnested both tests**, to `if (…) { return _page.slice(6); }`, `if (_page === "/index") { return "/"; }`, `return _page;`, in all four runs. Its messages said why behaviour holds: "The checks run in the same order as before, and `isDynamicRoute` is still called only when the path starts with `/index/`." (a-claude-2).
- **Codex removed one level**: the first test became a guard and the rest stayed a ternary, `return _page === "/index" ? "/" : _page;`. That's the smallest change that clears the rule, and the prompt asks for the minimal change. All four Codex runs wrote it identically.
- **The fix pass's earlier flip shows.** Ultracite's `no-negated-condition` fix had already turned upstream's `_page !== '/index' ? _page : '/'` into `_page === "/index" ? "/" : _page` before the handoff (§1.3), so the agents' second test is the positive one.

**B.** Every run moved the choice above the `return` and rendered it as one child inside the `div`, so the two wrappers appear once, as before.
- **A variable, 6:** `let content;` set in `if (isPending) … else if (notebooks.length === 0) … else …`, and `{content}` in the JSX. Five left it untyped, which Biome reports twice; b-claude-4 typed it: "I typed `content` as `JSX.Element` rather than `React.ReactNode`. This file has no React types available, and `stubs.tsx` declares the global `JSX` namespace."
- **A helper, 2** (b-claude-2, b-claude-3): `const renderContent = () => { if (isPending) { return …; } if (notebooks.length === 0) { return (…); } return (…); };` inside the component, called as `{renderContent()}`. Both said it calls no hooks: "The helper runs on every render exactly where the ternary was, and it isn't a hook." (b-claude-2).
- **Nobody used `&&`, a child component or early returns from the component.** The inner `search ? "No notebooks found" : "No notebooks created yet"` stayed in every run ("the inner `search ? ... : ...` ternary is untouched because it isn't nested", b-claude-3).

**C.** All eight runs wrote the same callback, character for character:

```ts
.map((segment) => {
  if (segment === "*") {
    return `$${++matchId}`;
  }
  if (segment === "$") {
    return "$$";
  }
  return segment;
})
```

- **The counter.** The only update of `matchId` in every final file is the `++matchId` in the `*` branch's return (the edit reading records its context as "an if branch"), so it runs once per `*` and in order, and `let matchId = 0` stays inside the loop over values.
- **What they said.** Claude named the counter in all four: "`*` becomes `$1`, `$2`, … in order, and `matchId` goes up only when a `*` is found." (c-claude-4). Codex's messages are a line long: "Replaced the nested ternary in `index.ts` with explicit `if` returns, preserving behavior. No other files changed, and no checks run as requested." (c-codex-1).
- **Not chosen:** a switch, a lookup of either kind, a helper, or moving the increment; and no run left C for review.

## 3. Did it help a reader?

The reader judgement was made from a blind packet. For each of the 24 final files, the packet held the prepared subject, the final file (license headers removed) and their diff, under a seeded random item id with no run id, agent or topic path. The question: would a developer new to the code find the final file easier to follow than the original, about the same, or harder? Behaviour, rule compliance and style preferences weren't part of it.

- **Rater 1** is the Claude model that ran the experiment. It rated from the packet but had seen the runs, so it isn't blind.
- **Rater 2** is a separate Claude subagent given only the packet and the question. It read the packet and nothing else (four reads of the one file) and wrote its labels to a file.

| Subject | Rater 1: easier / same / harder | Rater 2: easier / same / harder |
| --- | --- | --- |
| A | 8 / 0 / 0 | 8 / 0 / 0 |
| B | 8 / 0 / 0 | 8 / 0 / 0 |
| C | 8 / 0 / 0 | 8 / 0 / 0 |
| All | 24 / 0 / 0 | 24 / 0 / 0 |

- **Agreement: 24 of 24.** With one label throughout, κ is undefined; agreement here says the rewrites were uniform, not that the judgement is reliable.
- **Their reasons are the same in kind.** Rater 2 on a C file: "The chained ternary in the map callback becomes two early returns, so the '*', '$' and default cases each sit on their own line and the side-effecting ++matchId is easier to spot." On an A file: "The nested ternary becomes guard clauses that read in the same order as the doc comment's examples, so it is immediately clear which input takes which branch." Rater 1 on B's `let` versions noted the one cost: "the reader has to look up from {content} to see them."
- **Codex's partial A** (one guard and a two-way ternary) was rated easier by both, as was Claude's full unnesting; neither rater was asked to compare the two.
- **The scorer agrees in direction, by little.** sonarjs counts a two-test chain as 3 and two guards as 2, so each subject's file drops by 1, or by 2 for B's helper (whose own 4 includes the `search` ternary). A two-deep chain is the cheapest nested ternary there is (corpus REPORT §4.6).

Two raters from one model family, on 24 files that come in six distinct versions, is a small and correlated panel (§11).

## 4. The retry loop and the Left for review line

- **24 of 24 runs took one attempt.** Each verify, with Oxlint's fix pass and Oxfmt on the agent's file, left nothing the filter keeps, so `nextRetry` returned nothing. The measure rebuilt each report's file from the committed copies and recomputed every decision; all 24 reproduce.
- **A rule-only filter would have retried nothing either**, and nothing an edit added was reported by Oxlint, so the filter didn't shape any run.
- **The `Left for review:` line was used in none of the 24.** C is the subject where the corpus work allowed leaving it for review; every agent rewrote it instead, correctly.
- **What Ultracite printed.** "Fixed 1 of 1 issue with Claude Code." or "Fixed 1 of 1 issue with Codex.", exit 0, and, new since the func-style runs, the agent's own words under "Claude Code said:" or "Codex said:" (the last 8 lines of its final message, at most 800 characters). So the user saw Claude's account of the counter for C, and Codex's short summaries. For example (b-claude-2): "The helper runs on every render exactly where the ternary was, and it isn't a hook. Nothing else in the file changed."
- **Verify changed four files,** all formatting: in B's four Codex runs, Oxfmt joined `<div …>`, `{content}` and `</div>` onto one line.

## 5. Without an agent, and after the agent

### 5.1 `ultracite fix` and `--unsafe` on the subjects

Each linter's adapter `fixAndCollect` runs on a project laid out as init leaves it (with React), on the upstream code (header stripped) and on the file the Oxlint arm hands over, safe and `--unsafe` (ESLint has no unsafe tier), through the mirror and through Ultracite's real adapters. That's 30 cases.

| Linter | Nested ternary rewritten | Still reported (A / B / C) | Help | Other changes, and the oracle |
| --- | --- | --- | --- | --- |
| Oxlint | never | `no-nested-ternary` 1 / 1 / 1 | "Refactor nested ternary expressions into if-else statements for better readability." | upstream: the normalisation of §1.3 (B's trace differs only in class order). `--unsafe` on C: `no-plusplus`'s dangerous fix writes `` `$${(matchId += 1)}` ``; same behaviour |
| Biome | never | `noNestedTernary` 1 / 1 / 1 | "Disallow nested ternary expressions. Nesting ternary expressions can make code more difficult to understand." | B: `useSortedAttributes` reorders JSX attributes, and classes are sorted; C: `useUnicodeRegex` adds a `u` flag to both regular expressions, `useSimplifiedLogicExpression` turns `!a \|\| !b \|\| !c` into `!(a && b && c)`. Exact traces differ (80 of 80, 79 of 240); ignoring attribute and class order and printed regex flags they're the same |
| ESLint | never | `no-nested-ternary` and `sonarjs/no-nested-conditional` 1 / 1 / 1 | "Disallow nested ternary expressions"; sonarjs "Ternary operators should not be nested" | B: `react/prefer-read-only-props` (`readonly`), `sonarjs/prefer-immediate-return`, a header comment re-wrapped; on the upstream input Prettier's Tailwind plugin also sorts the classes, so that trace is the same ignoring class order, and the handed-over one exactly |

- **No fix touches a nested ternary,** so `--claude` and `--codex` are the only path to clearing it, in all three linters.
- **The `u` flag is a real change to C's output.** `getConfigAlias` returns `RegExp`s, and Biome's safe fix gives them a flag the upstream code didn't have. On the oracle's 12 import ids every alias matches the same, but `u` changes what some patterns mean (identity escapes, `.` on astral characters), so this is a behaviour change on other inputs in principle. Outside this topic's rule; noted (§9).
- **Real adapters.** Ultracite's own Oxlint, Biome and ESLint adapters, run under Bun with init's config files and `node_modules` links, produce the same files and diagnostics as the mirror in all 30.

### 5.2 The same passes on every agent's final file

The final file of each run (what the project holds after `ultracite fix --claude/--codex`) went through the same five commands: 120 passes, mirror and real adapters agreeing in all of them.

| Final files | Oxlint | Oxlint `--unsafe` | Biome (safe and `--unsafe`) | ESLint |
| --- | --- | --- | --- | --- |
| A (8) | unchanged | unchanged | unchanged | unchanged |
| B (8) | unchanged | unchanged | attributes and classes sorted | `readonly` props, `prefer-immediate-return`, a comment re-wrapped |
| C (8) | unchanged | `++matchId` → `(matchId += 1)` | the `u` flags and the simplified guard | formatting only |

- **No pass wrote a ternary back,** nested one, braced a guard (none needed it) or rewrote an `&&` (none was written). `react/jsx-no-leaked-render` had nothing to do.
- **ESLint's `unicorn/prefer-ternary` stays quiet on every edit.** It skips an `if` that follows another `if` that returns, so two guards (Claude's A, every C, B's helper) are never reported, and it won't merge a branch that is already a ternary, so Codex's `if (…) { return …; } return _page === "/index" ? "/" : _page;` isn't either (corpus REPORT §4.4). A single guard followed by a plain `return y;` is the shape it would have turned back into a ternary; no agent wrote one.
- **Behaviour after every pass:** the same as the prepared subject's, ignoring attribute and class order and printed regex flags; exactly the same for Oxlint's and ESLint's passes.

## 6. What the agents said

Hand classification (`classifications.json`), runs in which each was true:

| | Evaluation order | Side effects | The counter (C) | `0` rendering (B) | Hooks (B) | The default branch | Readability | Why this rewrite | A lookup or switch | Leaving it for review | Looked for tests | Looked upstream | Own behaviour check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude, 12 | 9 | 4 | 4 | 0 | 2 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Codex, 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- **Claude explained, Codex didn't.** Every Claude message says the conditions run in the same order or names what each branch returns; on C each one says the counter only moves for `*`. Codex's final messages are a line long in all 12 ("Replaced the nested ternary with an early return, preserving runtime behavior. Only `denormalize-page-path.ts` was edited. No checks were run, as requested.", a-codex-1), and its progress messages say only what it will do next ("I’ll read the diagnostic and make the smallest behavior-preserving change in `index.ts`.", c-codex-3).
- **No one said why.** No run said why it chose a guard over if/else, a variable over a helper, or kept the inner pair as a ternary. Two said why they left the `search` ternary alone: it "was never nested, so I left it alone" (b-claude-4).
- **No one mentioned readability, `0` rendering, a lookup or a switch.** The agents weren't told the rule's reason, and none asked.
- **No one checked.** The prompt says not to run the linter or other commands, and none did: Claude Code made 2–5 tool calls (Read and Edit; b-claude-4 also grepped and read the stub module, looking for React's types), Codex 2–3 (`exec` with `cat`, `rg` and `apply_patch`), no command was refused, and no run wrote or ran a behaviour check.

## 7. Sessions: tools, commands, exposure, locks

- **Tools.** Claude Code: Read, Edit, and in b-claude-4 Grep; 3–6 model calls a run; its thinking blocks are empty. Codex: one `exec` tool that runs a small JavaScript program of shell commands and `apply_patch`; 3–4 model calls. No run used the web.
- **What Codex looked at outside the run dir,** as in earlier topics: `AGENTS.md` in every directory above it, up to `/` (9 runs), or with `rg --files -g AGENTS.md` over the experiment root (a-codex-4, and c-codex-3 as well). It found none. The experiment root's other run directories were locked.
- **Exposure.** Every tool input was checked against `EXPOSURE_PATTERNS`, and every call outside the run dir was read by hand.
  - **No locked path was read.** No tool call read a locked path, the corpus's nested-ternaries files, a clone, another run, the harness, a scratchpad, the bibliography or a post draft. The one pattern hit in a tool input (c-codex-1, `otherTopicRuns`) was its check for `…/ultracite-agent-experiment/AGENTS.md`, a false positive the pattern now excludes.
  - **Installed copies of the subjects.** The main checkout's Bun store has Astro 7.3.2's built `vite-plugin-config-alias/index.js`, and the Bun cache has Next.js 16.x's `denormalize-page-path.js`; both still hold the same nested ternary. No tool input names either. Supabase Studio isn't published. The whole-log counts for `installedAstro` and `installedSupabase` come from the subjects' own headers, which name their upstream paths.
  - **The run dir's name.** Claude Code's system prompt carries its memory path, which names the run dir (`…/ultracite-agent-experiment/nested-ternaries/<run>`), so every agent could see the topic's name; the handoff names the rule anyway.
  - **No run printed the environment** or wrote outside its run dir.
- **Locks.** While an agent ran, 82–128 paths were locked (median 105; more as runs accumulated), restored after each attempt. Each batch's snapshot of the 76 standing targets (the harness's 6 folders, 38 topic paths and 32 extra paths) was identical before and after, for the pilot and all four rounds. The locked paths were:
  - this harness's folders and every other run;
  - the corpus's nested-ternaries examples, results and calibration, every `nested-ternaries-*` corpus script, and the whole corpus `out/`, `repos/` (history clones included) and `biome-input/`;
  - `research/bibliography/nested-ternaries.md` and the bibliography README;
  - `plans/`, `lint-configs/`, the system temp directory's `ultracite-research-*` folders (the oracle's scratch among them) and the other topics' run roots;
  - through `AGENT_EXPERIMENT_EXTRA_LOCKS`: this session's scratchpad (the brief, the batch logs, the drafts), the scratchpads of six other sessions under the same temp root whose files mention the topic, seven background-job logs that do, the main checkout's `plans/`, `research/agent-experiment/plans`, `research/corpus/repos` and `lint-configs`, and the corpus `repos/` and `out/` of the seven other worktrees.

  Not locked: `node_modules`, and the session transcripts under `~/.claude/projects` (live, and symlinked from one session's task folder; the `sessionLogs` and `orchestratorScratch` patterns check them, and no tool input named them).
- **Codex's memory.** Codex's consolidation rewrote `phase2_workspace_diff.md` during the pilot. After the last batch, no memory file mentioned the experiment, the subjects or the rule (checked by `grep`).
- **Project instructions:** none loaded in any run. The user-level instruction files are empty.

## 8. The pilot

Two runs on C, `c-claude-pilot` and `c-codex-pilot`, are kept in `superseded-runs/` and not aggregated. They used the final setup and were re-measured with the final code.

- **Both wrote the same block body with two guards** as the 8 final C runs, in one attempt: Claude in 19.2 s for $0.41, Codex in 22.4 s and 18.3k tokens. Behaviour was the same.
- **Claude's message named the counter** ("with `matchId` going up only for `*`"); Codex's said "Replaced the nested ternary in `index.ts` with explicit conditional returns, preserving behavior."
- **Arms.** The brief allowed raising a cell to six runs if the pilot looked noisy. Both pilot runs agreed, and every final cell is uniform in the oracle's verdict and the edit (A's and B's splits are by agent, and B's Claude cell splits 2 and 2 between two right answers), so every cell has four runs.

## 9. Issues in Ultracite (not fixed)

1. **The prompt calls the fix for this rule a non-fix.** It says "An edit that only hides the code from the rule (rewording it, re-spelling it, an equivalent construct) is not a fix, even if the linter goes quiet. If that's the only way to clear an issue, leave it for review." For `no-nested-ternary` every fix is an equivalent construct: if/else is what a ternary means. The agents ignored the line, which was right here, but read literally it asks them to leave every nested ternary for review.
2. **Biome's safe `useUnicodeRegex` fix changes values the code returns.** On C it adds `u` to the regular expression `getConfigAlias` returns for `baseUrl` and to the escaping regex inside it, so `ultracite fix` with Biome changes the `RegExp`s the function hands to Vite (79 of the oracle's 240 results differ by their printed flags). They match the sample ids the same; in general `u` changes what a pattern means (an identity escape such as `\-` outside a class becomes a syntax error, `.` and classes see astral characters as one). Not this topic's rule.
3. **Biome reports the most common rewrite.** Five of B's eight final files declare `let content;` and assign it in if/else, which Biome's `noImplicitAnyLet` and `noEvolvingTypes` report. Oxlint and ESLint don't, so a Biome user's agent would get a second attempt, or a user new issues, for the rewrite most agents chose (also corpus b01).
4. **`curly` still rejects Hayden's shape** (corpus REPORT §7.1). No agent wrote `if (bool) return x;` here, every guard came braced, so it didn't come up; but the shape the maintainer prefers can't survive Ultracite's presets in any linter.
5. **ESLint's `prefer-ternary` would undo a one-guard rewrite** (corpus REPORT §4.4, c24): a single guard followed by a plain `return y;` is turned back into `return c ? x : y`. No agent wrote that shape here; Codex's one-guard A ends in a ternary, which the rule doesn't merge.
6. **Oxlint's `--unsafe` rewrites C's counter.** `no-plusplus`'s dangerous fix turns `` `$${++matchId}` `` into `` `$${(matchId += 1)}` `` in a template, on the subject and on every agent's file. Same behaviour; it is an expression-level rewrite of side-effecting code that `ultracite fix --unsafe` applies without a review.
7. **Five earlier topics' self-tests fail on the current repo** (§12), before and after this topic's changes alike. Accessibility's mirror check calls the v1 hash check strictly, which the CLI's agent-fix changes since 8be22672 trip; todo-comments' real adapter now fills in JS-plugin help that its v1 mirror doesn't (1341a85b); sort-keys', length-limits' and func-style's variants read differently since key sorting went off and `no-use-before-define`'s options changed in the presets (37ead86b, 8eb46ade). Their committed runs re-measure with no response, outcome or verdict changed.

Fixed since earlier topics, and visible here: Ultracite now prints the end of the agent's final message whenever the agent left nothing for review (1341a85b), so Claude's account of C's counter reached the user (func-style §9.6, length-limits §9.6, react-effects §9.6).

## 10. Harness changes

- **`scripts/topics/nested-ternaries.cjs`** (new):
  - subjects and preparation: running `ultracite init --frameworks react` for each linter, stripping, the comment check, normalising, checks (with the stub modules checked against the corpus's through the oracle);
  - the collect and verify hooks with the handoff filter;
  - the three lint views and `tsc`;
  - the oracle wrapper (the stub's name; key, class-order and regex-flag readings);
  - the edit reading from the AST (guards and their shape, helpers, components, `let`s, switches, lookups, IIFEs, `&&`, the counter's context, the wrappers, cognitive complexity, everything else that changed);
  - measure, which rebuilds each report's file from the committed copies under v3 and recomputes every retry decision; the self-test with the corpus variants, the hand-made mutants, the diff.ts port check and the mirror check;
  - the deterministic paths on the subjects and on every final file, with the real adapters;
  - aggregate and tables.

  It imports `nested-ternaries-oracle.cjs` and `nested-ternaries-lib.cjs` unchanged and reads `nested-ternaries-examples.cjs`'s `variantsOf` by compiling the script without its final `main()` call. The stub-module check points the corpus library's `EXAMPLES_DIR` at a scratch folder for one trace and puts it back; no corpus file changes, and `examples.json` regenerates as it is. It removes the `CORPUS_REPO_LISTS` variable the corpus library sets.
- **`scripts/ultracite-adapters.cjs`:** a "v3" revision (§1.5), selected by the topic with `ULTRACITE_MIRROR=v3`. v1 and v2 are unchanged: their expected hashes, their code paths and their drift against the current CLI are the same as before.
- **`scripts/run-one.mjs`:** under v3 only, the handed-over group is what `recordSourceLines` returns, and `meta.json` records `ultracite.mirrorRevision`. v1 and v2 runs are unchanged.
- **`harness-tests/nested-ternaries/mutants.json`** (new): the 32 corpus variants, 3 of them also as written, and 14 hand-made mutants, with their expected readings.
- **The corpus is unchanged.** Its `nested-ternaries-agent-runs.cjs` reads every topic's committed runs, so re-running it now would add this topic's 24 runs (and the 2 pilots) to the counts in corpus REPORT §4.13, which were taken before them.
- **`.gitignore`:** comments name this topic. The existing per-attempt patterns cover its session logs, stdout and stderr in `runs/` and `superseded-runs/`.

## 11. Caveats

- **Sample:** 4 runs per subject and agent, and every cell is uniform: 24 of 24 behaviour kept, every final file one of six versions. The traps didn't catch either agent on these subjects; a deeper chain, a lookup whose side effect is further from the test, or a JSX chain whose branches include a number might.
- **The subjects are small.** Each is a two-deep chain, the commonest shape in the corpus (780 of 943) and the cheapest one to unnest. A deep or mixed nested ternary, or one in a JSX attribute or argument, might go differently.
- **The handoff is filtered** (§1.4). A real project would hand over C's `no-plusplus` on the same line as the ternary, and A's `func-style` on the function; with those in front of it, an agent might also rewrite the increment or the declaration. Here the filter never had to act.
- **The reader judgement is two Claude models on 24 files in six versions,** and both said "easier" for all of them. Rater 1 had seen the runs, rater 2 shares its model family, and no human rated readability. "Easier to follow" is one reader's judgement of effort, not a measured comprehension task.
- **The oracle checks runtime behaviour through each file's export.** B renders through the corpus's stub renderer, not React, and records the hooks its stubs see; C records each alias's `RegExp` as a string and its matches on 12 ids.
- **"Hard to modify" isn't tested here.** No agent was asked to add a branch; the corpus history (corpus REPORT §4.9) is where that part of Hayden's reason is measured.
- **The subjects are famous code,** and installed copies of A and C exist on this machine, with the same nested ternary. No run read them or mentioned the projects' history or tests.
- **The run dir isn't a full project.** It has no `node_modules` or git, and its path names the experiment and topic (`…/ultracite-agent-experiment/nested-ternaries/<run>/`), which Claude Code's system prompt shows, as in every topic.
- **The agents were told not to run anything,** and didn't; no run checked its own edit. Codex's sandbox would have allowed it, as in earlier topics where it did.
- **The mirror is a port.** Its v3 matching was checked against `diff.ts` itself on nine edits and its passes against the real adapters on 202 comparisons, but these runs never retried, so the matching was exercised only by verify's single pass.
- **Reasoning isn't fully logged.** Claude's thinking blocks are empty, and Codex logged one short progress message a run, so what each agent understood comes from its messages.
- **User-level configuration applied:** Codex's memories and plugins, and Claude Code's settings. The user-level instruction files are empty.

## 12. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=nested-ternaries   # the topic selects the mirror's v3 itself
node scripts/prepare-subjects.cjs        # subjects/nested-ternaries/ (runs ultracite init --frameworks react for each linter; stripped, checked, normalised; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (52), the diff.ts port (9) and the mirror against the CLI (52) -> oracle-self-test.json (~5 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths (30), the passes on the final files (120) and the mutant matrix (~10 min)
node scripts/report-tables.cjs > results/nested-ternaries/tables.md
```

- **Re-measuring without the session logs:** `measure.cjs <run>` re-measures a run from its committed files in about 20 seconds, carrying the session-derived fields and the printed final message over from `measure.json`.
- **This report's runs** set `AGENT_EXPERIMENT_EXTRA_LOCKS` from a wrapper that listed the scratchpads, the job logs, the main checkout's plans and the other worktrees' clones and outputs, and checked every lock's mode before and after each batch.
- **The hand classification** is an input (`classifications.json`, both raters' labels and reasons). The blind packet and rater 2's raw labels were scratch files.
- **Earlier topics.** Every earlier topic was re-measured, self-tested, re-aggregated and tabulated from its committed runs in this worktree, twice: before any shared script changed (seven topics while this topic was being written; the rest after the runs, with `ultracite-adapters.cjs` and `run-one.mjs` put back to HEAD for the duration), and after every change. Results folders were restored to HEAD each time.
  - **Before and after match exactly** (apart from `generatedAt`) for all twelve: the eleven topics and prompt-revision. One run of func-style's self-test made under the load of four parallel workers had two more mirror-check failures (two `collect` comparisons, where Oxlint's multi-file report came back in another order; its v1 mirror compares in order); run again on its own with the final code, it is byte-identical to the before run.
  - **No committed run's response, outcome or oracle verdict changes** in any topic.
  - **Self-tests.** cognitive-complexity, floating-promises, security-rules, dead-code, import-cycles and react-effects pass. Five fail on the current repo, before and after alike, for reasons that predate this topic: accessibility's mirror check calls the v1 hash check strictly, which the CLI's agent-fix changes since 8be22672 trip; todo-comments' mirror check (40 cases) differs because the real adapter now fills in JS-plugin rules' help text (1341a85b); sort-keys', length-limits' and func-style's variants read differently because 37ead86b turned key sorting off in the presets and 8eb46ade/37ead86b changed `no-use-before-define`'s options.
  - **Against the committed files** they show drift from commits after each topic's runs: 3e83844c (Oxlint 1.90), 6675a904 (Oxfmt 0.75), 79d73d9e (Biome 2.6.4), 3572b864 (the ESLint plugins and react-doctor), 7a2d831c (`unicorn/consistent-arrow-return-style` off, `func-style`'s option dropped), 8eb46ade and 37ead86b (key sorting off and other preset changes), and `hasSessionLog` where a topic's gitignored session logs aren't in this worktree. It's in rule counts, messages, line numbers and, for every topic but prompt-revision, tool versions.

  | Topic | Against the committed files (apart from `generatedAt`) |
  | --- | --- |
  | cognitive-complexity | tool versions in `results.json` |
  | floating-promises | the known 947ca03e drift; `github/no-then` and `promise/prefer-await-to-then` in the full-preset counts (3572b864) |
  | security-rules | the known preset drift; Biome 2.6.4's `useUnicodeRegex` and parse changes in the per-run counts |
  | dead-code | the known `sonarjs/void-use` drift; Biome's `noVoid` |
  | import-cycles | rule counts, messages and lines in the import-graph rows (Oxlint 1.90, Biome 2.6.4) |
  | accessibility | `hasSessionLog`; `react/prefer-read-only-props`, `unicorn/name-replacements`, `unicorn/consistent-arrow-return-style` and `jsx-a11y/prefer-tag-over-role` in the counts |
  | todo-comments | `hasSessionLog`; `sonarjs/shorthand-property-grouping`, `unicorn/name-replacements`, `sonarjs/todo-tag` (off), `promise/prefer-await-to-then`, `unicorn/consistent-arrow-return-style` in the counts |
  | sort-keys | `hasSessionLog`; the sort counts (key sorting off), `unicorn/prefer-code-point`, Biome's `useUnicodeRegex` |
  | react-effects | `hasSessionLog`; `unicorn/name-replacements`, `unicorn/consistent-arrow-return-style` and the `react-hooks` rules in the counts |
  | length-limits | `hasSessionLog`; `unicorn/name-replacements`, `sort-keys` (off), `no-use-before-define`, `unicorn/consistent-arrow-return-style` and `max-statements` counts |
  | func-style | `hasSessionLog`; `unicorn/consistent-arrow-return-style` (off), `arrow-body-style`, `func-style` and `no-use-before-define` counts |
  | prompt-revision | `hasSessionLog` only |

## 13. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/nested-ternaries.cjs` | the topic |
| `scripts/ultracite-adapters.cjs`, `scripts/run-one.mjs` | the mirror's v3 revision, and run-one's v3 handoff |
| `subjects/nested-ternaries/` | the three subjects and their stub modules; `run-files/` (init's files as the fix pass leaves them, and `tsconfig.json`); `init/` (what `ultracite init --frameworks react` writes for Oxlint, Biome and ESLint); `init.json`; `subjects.json`. Oxlint's two configs and Biome's are stored with a `.txt` suffix. |
| `harness-tests/nested-ternaries/mutants.json` | 32 corpus variants (3 also as written) and 14 hand-made mutants with their expected readings |
| `results/nested-ternaries/runs/` | 24 runs: meta, handoff, before/after, per-attempt artifacts, `measure.json` |
| `results/nested-ternaries/superseded-runs/` | the pilot (not aggregated) |
| `results/nested-ternaries/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json` | aggregate, tables, hand classification (both raters), self-test, diff.ts port check and mirror check |
| `../corpus/scripts/nested-ternaries-oracle.cjs` | the oracle, shared with the corpus |
