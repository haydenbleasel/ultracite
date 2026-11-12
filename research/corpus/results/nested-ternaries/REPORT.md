# Nested ternaries: measurement report

The data behind the post on nested ternaries, measured on 2026-11-11 and 2026-11-12 (the scripts in §9, run step by step). Generated tables are in `tables.md`. The machine-readable results are:

- `rules.json`: what Ultracite's presets set for every conditional-operator rule, per linter and preset (ESLint resolved per file type), fix kinds, Biome's rules with `biome explain`, the formatters' ternary options, the agent prompt's and AGENTS.md template's lines
- `census.json`: the inventory (every conditional expression, the ternary trees they form, positions, tests, branches; conditional types; if/else and guard chains; cognitive complexity of the functions that hold them), per repo and pooled, source and tests apart, with the prediction checks (rows in `out/nested-ternaries/census/`)
- `linters.json`: each rule alone in Oxlint, ESLint and Biome, raw and reported, every disagreement with a signature, every message and help text, and `prefer-ternary`'s reports by the shape of the if statement
- `rule-census.json`, `rule-census.md`: the shared Oxlint census with Ultracite's core, react and js-plugins presets
- `calibration.json`: 46 hand-written cases through every linter configuration, formatter and fix pass, and 13 runnable behaviour cases
- `format.json`: Oxfmt and Prettier (with and without `experimentalTernaries`) on every file with a nested ternary, and the fix-and-format ping-pong
- `rewrite.json`: every reported nested ternary rewritten in each way that applies, with lines, cognitive complexity, preset reports, fix passes and behaviour signs (rows in `out/nested-ternaries/rewrite/items.jsonl`)
- `fixes.json`: two fixes in the presets that write conditionals, applied alone to the corpus
- `history.json`, `history-labels.json`, `history-event-check.json`: events, diff sizes, keyword commits and their hand reading, bug fixes by construct
- `markers.json`: the projects' own settings and disable comments for these rules
- `sample.json`, `classifications.json`: the hand classification, both raters
- `agent-runs.json`: conditional expressions in the agent experiment's committed runs

The agent-experiment subjects are in `corpus/examples/nested-ternaries/`.

Terms:

- **Conditional:** a `ConditionalExpression`, `a ? b : c`. TypeScript's conditional types (`T extends U ? X : Y`) are counted apart.
- **Ternary tree:** a maximal group of conditionals joined through a direct test, consequent or alternate. Parentheses aren't nodes, so `a ? x : (b ? y : z)` is one tree. A TypeScript wrapper (`as`, `!`, `satisfies`) ends the tree, as it does for ESLint's rule. A **nested ternary** is a tree with two or more conditionals.
- **Shape:** *chain* (every nested conditional is an alternate: `a ? x : b ? y : z`, an else-if chain), *consequent*, *test*, or *mixed*.
- **Position:** where a tree's root sits once TypeScript wrappers are peeled. *Early-return* positions are a `return` and an arrow's concise body. *Statement* positions are a variable initializer, an assignment statement and an expression statement. Everything else (JSX, arguments, templates, properties, …) needs an *extraction*.
- **Indirect nesting:** a conditional inside another one's branch through other expressions (a call, a template, an object). Not a tree member.
- **Unit:** the outermost conditional of a group of conditionals that nest directly or indirectly. Used to compare linters that report different nodes.
- **Corpus, React set, external:** the eight repos of every topic; the four React codebases from the accessibility post; both. Ultracite's CLI is listed apart and never pooled.

## TL;DR

- **How common:** 943 nested ternaries in 1,143,356 lines of external source (8.2 per 10,000 lines; 12.2 per 10,000 JSX lines). 13.6% of the 15,805 conditionals sit in one.
  - **Corpus repos:** 406 (5.8 per 10k). **React set:** 537 (12.0 per 10k), 520 of them Supabase Studio's.
  - **Tests:** 17 in 516,920 lines. **Ultracite's CLI:** none.
  - **Shape:** 716 (75.9%) are chains, 146 nest in a consequent, 80 are mixed, 1 nests only in a test. 780 are two deep, 124 three, 39 four or more.
- **Where they sit, against Hayden's `if (bool) return x;`:**
  - **Early-return positions:** 70 (7.4%): 46 returns, 24 concise arrow bodies.
  - **Statement positions:** 355 (37.6%), almost all initializers (331).
  - **Need an extraction:** 518 (54.9%): JSX children 235, properties 109, JSX attributes 58, arguments 40, templates 27, operands 24 and others. In the React set, 366 of 537.
  - **Hand classification** (80, weighted): flat chains 78.9%; the best rewrite is a helper 39.6%, keep the ternary 31.4%, early returns 11.1%, if/else 10.4%, a lookup 2.8%, a child component 2.7%, a switch 1.9%. The rewrite reads better 47.7%, the same 43.8%, worse 8.5%.
- **What the rules report** (external source):
  - **no-nested-ternary:** 1,164 in ESLint, Oxlint and Biome alike (10.2 per 10k; 24th of the 1,242 rules Ultracite's Oxlint presets enable, by count). The three flag the same 892 units. ESLint and Oxlint report the conditional that has a nested branch, Biome the nested branch, once per parent.
  - **sonarjs/no-nested-conditional:** 1,391, and 125 units no-nested-ternary misses: conditionals inside a template (70, plus 4 combined with other paths), a call (18 + 2), a binary or logical expression (23 + 3), a member expression (7), and one that nests only in a test.
  - **unicorn/no-nested-ternary:** 925 (off in Ultracite). With tests, 940: 768 "should be parenthesised" (fixable) and 172 "too deep".
  - **Differences found in calibration:** Oxlint's no-nested-ternary sees through `as` and `!`; ESLint's and Biome's don't. Only sonarjs reports nesting in a test.
  - **Nobody configures them:** no repo turns on any nested-ternary rule; React Aria turned `no-nested-ternary` off when it moved to Oxlint. No disable comment names these rules.
- **prefer-ternary doesn't ask for nesting:** neither linter's prefer-ternary reports an if statement whose branch value is already a conditional (0 of 2,184 ESLint and 612 Oxlint reports). But they report very different things: ESLint's (unicorn 79, Ultracite's options) adds 1,440 flat early returns (`if (a) return x; return y;`) and 73 `let` + `if`, which Oxlint's port never reports.
- **What the rewrites cost** (942 reported trees, on copies):
  - **Every rewrite parses** and removes the report. Lines added after Oxfmt: early returns median +2, `let` + if/else +3, a helper +5, a switch +8, a lookup −2.
  - **Cognitive complexity:** sonarjs scores a ternary chain of k tests k(k+1)/2 (3, 6, 10). Early returns score k, an else-if chain with a final else k + 1, a switch 1, a lookup 0. A consequent ternary rewritten as if/else scores *more* (3 → 5), because sonarjs charges each `else`.
  - **Measured:** the enclosing function drops by a median of 1 with early returns (sum −70 over 70), 4 with a helper (1 once the helper's own score is added), 3 with a lookup or switch. `let` + if/else changes nothing at the median and raises 76 functions, all consequent or mixed shapes.
  - **Ultracite's own rules on the result:** Oxlint's prefer-ternary reports 97 of 329 `let` + if/else rewrites (the inner if/else of a consequent ternary). ESLint's reports 19 of 70 early-return rewrites, 90 `let` and 173 helpers. Other costs: `unicorn/no-useless-undefined` (133 helpers and 6 early returns write `return undefined`), `no-case-declarations` (10, a helper inside a `case`), `no-self-assign` (4), `prefer-destructuring` (21).
  - **The fix pass:** ESLint's `ultracite fix` turns part of 285 rewrites back into a ternary (20 early-return, 90 `let`, 175 helper), always one level, never nested again. Oxlint's and Biome's fix passes give back nothing.
  - **Lookups:** 80 of 942 trees compare one value with literals. Every lookup can match inherited keys; 12 would call functions eagerly, 10 read members eagerly, 23 have a branch that can be undefined and would fall to the default; 31 read their discriminant once instead of once per test.
- **Fixes that break code** (Oxlint, `ultracite fix --unsafe`): `unicorn/prefer-logical-operator-over-ternary` writes `x || y ? a : b` for `x ? x : y ? a : b`. On the corpus it changes the meaning of all 10 such conditionals, and produces a syntax error for 2 with an arrow alternate (`x || () => {}`). ESLint's version is a suggestion and parenthesises.
- **Another fix that nests:** ESLint's `react/jsx-no-leaked-render` (react preset) rewrites `count && (a ? x : y)` as `count ? (a ? x : y) : null`; on the corpus its fixes (2,252 reports) create 11 nested ternaries.
- **The ping-pong is real:** with unicorn/no-nested-ternary on, its fix and the formatter undo each other in 512 of 515 files (Oxlint + Oxfmt) and 497 (ESLint + Prettier).
- **The formatter:** Oxfmt and Prettier print every nested ternary with the same number of lines: 942 trees take 15,337 lines (median 5), and 274 grow. Chains step one indent per level outside JSX and stay at one indentation inside JSX. `experimentalTernaries` puts every nested test on its own line, flattens every chain, and saves 889 lines.
- **History** (eight repos, three years, 12,762 mainline commits):
  - **Bug fixes, size controlled:** nested ternaries 1.30 [1.00, 1.69], 1.10 [0.84, 1.43] once "has any conditional" is controlled, 1.02 [0.77, 1.35] among functions with a conditional. No robust effect.
  - **Keyword commits:** 2 real ternary bugs of 63 (VS Code, one level each, outside the measured directory: a precedence bug and swapped branches).
  - **"Hard to modify":** adding a branch is about the same size either way (median 5–6 lines), but a ternary almost always rewrites existing lines: 14.6% of extensions of a single ternary are pure insertions, against 58.5% for an else-if chain and 81.7% for a guard chain.
- **Agents** (264 committed runs): no agent wrote a nested ternary anywhere, including func-style's tempting variant. Agents turned an if into a ternary 5 times and never the reverse. ESLint's prefer-ternary rose by 8 in 5 runs; no retry prompt named a ternary rule.
- **Notes for Hayden** (§7):
  - `curly` rejects `if (bool) return x;` in every preset.
  - The Oxlint dangerous fix above.
  - The leaked-render fix.
  - ESLint's and Oxlint's prefer-ternary pull differently.
  - Disabling no-nested-ternary isn't enough in ESLint, because sonarjs reports too.
- **Subjects** (§10):
  - **A:** Next.js `denormalizePagePath` (early returns, clean).
  - **B:** Supabase `ExplorerNavNotebooks` (JSX inside wrappers; needs a variable, helper or child component).
  - **C:** Astro `getConfigAlias` (a lookup would run `++matchId` for every character).

## 1. Tools and configuration

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | v24.14.1 | system |
| Oxlint | 1.90.0 | root `node_modules` |
| Oxfmt | 0.75.0 | root `node_modules` |
| ESLint | 10.14.0 | `packages/cli` |
| @typescript-eslint/parser, eslint-plugin | 8.72.1 | `packages/cli` |
| TypeScript | 6.0.3 | as resolved by the parser |
| eslint-plugin-unicorn | 79.0.0 | `packages/cli` |
| eslint-plugin-sonarjs | 4.2.2 | `packages/cli` (ESLint), root (Oxlint JS plugin) |
| @biomejs/biome | 2.6.4 | `packages/cli` |
| Prettier | 3.9.10 | `packages/cli` |
| git | 2.54.0 | history clones, read-only, `GIT_NO_LAZY_FETCH=1` |
| gh | as installed | read-only: one Supabase file's commits, React Aria's config history, two VS Code commits |

Nothing was installed or run from any clone. Only configs were read from them.

- **Oxlint:** each rule alone (every category off) on a mirror with disable directives neutralised and on one as written, with `--disable-nested-config`; sonarjs through Oxlint's JS plugins. The rule census, calibration, rewrites and subjects use Ultracite's presets as `ultracite init` wires them.
- **ESLint:** the real rules run in the inventory's own `Linter` pass with Ultracite's options (checked against the resolved preset by `nested-ternaries-rules.cjs`). Inline config is ignored, except in files with a directive, which run again with it honoured. Calibration, rewrites and subjects also run Ultracite's ESLint core and react presets.
- **Biome:** each rule alone (`recommended: false`); the calibration, rewrites and subjects also run the core and react presets.
- **Copies:** all of them under `$NESTED_TERNARIES_TMP`.

## 2. Corpus

| Repo | Set | SHA | Source files | Source lines | Conditionals | Nested | Per 10k | Test files | Nested in tests |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zod | corpus | `284243fb0d` | 125 | 37,903 | 528 | 24 | 6.3 | 198 | 4 |
| hono | corpus | `f78a245abc` | 187 | 25,540 | 312 | 25 | 9.8 | 124 | 0 |
| trpc | corpus | `796700d865` | 176 | 25,948 | 169 | 2 | 0.8 | 314 | 10 |
| vite | corpus | `3b72997d42` | 124 | 45,885 | 570 | 25 | 5.4 | 89 | 0 |
| astro | corpus | `9050e3819c` | 635 | 82,969 | 789 | 32 | 3.9 | 568 | 1 |
| excalidraw | corpus | `4c00f31ddc` | 444 | 128,127 | 1,857 | 118 | 9.2 | 107 | 2 |
| next.js | corpus | `d8bfc3c994` | 1,416 | 276,128 | 3,284 | 164 | 5.9 | 154 | 0 |
| vscode | corpus | `959031245e` | 226 | 71,809 | 483 | 16 | 2.2 | 0 | 0 |
| shadcn | React set | `c2477f311c` | 165 | 18,473 | 82 | 1 | 0.5 | 0 | 0 |
| radix | React set | `eb3a2b7091` | 160 | 25,594 | 374 | 12 | 4.7 | 46 | 0 |
| react-aria | React set | `8e76acfbc6` | 71 | 22,407 | 233 | 4 | 1.8 | 86 | 0 |
| supabase | React set | `09f80f528e` | 2,759 | 382,573 | 7,124 | 520 | 13.6 | 458 | 0 |
| ultracite | dogfood | `cfa365be0a` | 56 | 18,818 | 348 | 0 | 0 | 52 | 0 |

## 3. Method

### 3.1 The inventory (`nested-ternaries-census.cjs`, `nested-ternaries-lib.cjs`)

One ESLint `Linter` pass per file, with the TypeScript parser, records:

- **Every conditional:** its slot in its parent conditional (test, consequent, alternate), its nearest conditional ancestor through any path and whether sonarjs's breaking nodes (arrays, objects, functions, JSX containers) lie between, whether it's parenthesised (ESLint's own `isParenthesised`), and its enclosing function.
- **Every tree:**
  - its members, depth, shape and parenthesised members
  - its position (and its TypeScript wrappers), the rewrite class that allows, and whether it sits inside a JSX element of the same function
  - its tests: *lookup* (one discriminant compared with string or number literals), *switch* (with other constants such as enum members), *thresholds* (one subject compared with `<` or `>`), otherwise *unrelated*
  - each branch's kind, and what evaluating it eagerly would do: *pure*, *jsx*, *reads* (member access), *effects* (calls, `new`, assignments), *await*, or *throws* (an IIFE that throws)
- **Also:**
  - conditional types and where they nest
  - every if/else chain head: its length, whether it has a final else, and whether every branch is one return or one assignment to the same target (*ternary-shaped*)
  - guard chains: runs of `if (c) return x;` ending in a `return`
  - every function's sonarjs cognitive complexity
- **Checks:** in every repo, with 0 mismatches:
  - ESLint's `no-nested-ternary` reports exactly the conditionals whose consequent or alternate is a conditional (1,164).
  - `unicorn/no-nested-ternary` reports exactly its predicted leaves and levels (925).
  - `sonarjs/no-nested-conditional` reports exactly the conditionals with an unbroken conditional ancestor (1,391).

### 3.2 The linters (`nested-ternaries-linters.cjs`)

Each nested-ternary report joins to the conditional it starts at, and through it to its unit. For each pair of implementations, units one flags and the other doesn't get a signature: how their conditionals relate (direct slots, or the first non-TypeScript node of an indirect path). Every `prefer-ternary` report joins to its if statement's shape: `if/else` with one statement per branch, a flat return, `let` plus `if`, `if` alone.

### 3.3 The rewrites (`nested-ternaries-rewrite.cjs`)

One copy per (tree, rewrite), so every difference is the rewrite's. Rewrites, as written by a careful person or an autofix, with braces:

- **early-return:** a `return` argument or concise body becomes `if (t1) { return v1; } … return vN;`. A consequent ternary becomes an if inside the if. A concise arrow body becomes a block.
- **let-if:** `const v = …` becomes `let v; if (t1) { v = v1; } else if … else { v = vN; }`, keeping the type annotation. One declarator with an identifier only.
- **if-statement:** an assignment statement or expression statement becomes if/else statements.
- **helper:** any position. `const selectN = () => { early returns };` goes just above the statement that holds the tree, in the same function (a concise arrow body becomes a block), and the tree becomes `selectN()` (an async helper and `await` when a branch awaits).
- **lookup:** chains on one discriminant with literal keys become `({ k1: v1, … })[d] ?? default`. **lookup-lazy:** the same with thunks, `[d]?.() ?? default`. **switch:** chains on one discriminant, in place at early-return positions, otherwise in a helper.

For each rewrite:

- **Parse:** whether the copy parses.
- **Lines added:** with both copies formatted by Oxfmt.
- **Cognitive complexity:** the enclosing function's before and after (its start doesn't move), and the helper's.
- **Preset reports:** what Ultracite's presets report on the copy minus the original: Oxlint (core, + react for `.tsx`), ESLint (core, + react, the rules that bear on control flow) and Biome (core, + react).
- **Fix passes:** each `ultracite fix` path (`oxlint --fix` then Oxfmt, `eslint --fix` then Prettier, `biome check --write`), run on a copy whose rewritten code sits between `/*NT{*/` and `/*}NT*/` comments. It counts the conditionals and nested ternaries the fix puts back between them.
- **Behaviour signs (static):** eager calls, awaits, throws and member reads in a lookup; a nullish branch replaced by `??`; inherited keys; number keys; a discriminant that is a call or a member read; an exported `const` that becomes `let`; an `await` moved into an async helper.

### 3.4–3.9

- **Formatters** (`nested-ternaries-format.cjs`): every file with a nested ternary, as written and formatted three ways, trees matched by order (0 mismatches).
- **Fixes** (`nested-ternaries-fixes.cjs`): `react/jsx-no-leaked-render`'s fix alone on every `.tsx`/`.jsx` source file; Oxlint's `prefer-logical-operator-over-ternary` with `--fix-dangerously` alone on every file with an `x ? x : …` conditional.
- **History** (`nested-ternaries-history.cjs`): `length-history.cjs`'s window (three years before each pinned commit, first-parent mainline), the measured package source in every layout it has had, with mass commits (50+ files) left out of the events.
  - **Events:** constructs matched within each function by name and by their tests. A hand check of 55 events (one rater) found 39 right, 9 partly right and 7 wrong; every "converted to lookup" it read was wrong.
  - **Diff sizes:** `git diff -U0` hunks inside the construct's new range, without `-w`.
  - **Bug fixes:** `length-history.cjs`'s `track` and logistic regressions with log own lines, log exposure and repo effects, file-clustered errors. The heuristic is 73.7% precise and misses 15.5% of real fixes (the length topic's hand check).
- **Policy** (`nested-ternaries-markers.cjs`): configs at each pinned commit, and directives.
- **Hand classification** (`nested-ternaries-sample.cjs`, seed 20261111): 80 reported trees in five strata, repos round-robin within each:
  - **D:** dispatch shapes (12)
  - **E:** early-return positions (14)
  - **S:** statement positions (16)
  - **J:** JSX (20)
  - **X:** other positions (18)

  Rater 1 saw the automatic labels; rater 2, blind, labelled 36. Shares are weighted by stratum population.
- **Agents** (`nested-ternaries-agent-runs.cjs`): every committed run, the subject as handed over against the final file and each attempt, with Oxlint core and the ESLint census pass on both.

## 4. Results

### 4.1 What Ultracite turns on

| Rule | Oxlint | ESLint | Biome |
| --- | --- | --- | --- |
| no-nested-ternary | core `"error"` | core `"error"` | `style/noNestedTernary` (core) |
| unicorn/no-nested-ternary | core `"off"`: "Its fixer wraps the inner ternary in parentheses that oxfmt strips, so every `fix` run ping-pongs" | `"off"`, same reason with Prettier | – |
| sonarjs/no-nested-conditional | js-plugins `"error"` | core `"error"` | – |
| no-ternary | `"off"` | `"off"` | – |
| unicorn/prefer-ternary | core `"error"` (no options; fix "pending") | `["error", "always", { checkComputedMemberAccess: true, checkVaryingBase: true }]`, autofix | – |
| unicorn/prefer-minimal-ternary, no-unnecessary-nested-ternary | – | core, autofix | – |
| prefer-logical-operator-over-ternary | core (fix: suggestion, applied by `--fix-dangerously`) | core (suggestion) | – |
| no-unneeded-ternary | core (dangerous fix) | core `{ defaultAssignment: true }` | `noUselessTernary` (unsafe fix) |
| no-negated-condition (+ unicorn's) | core (fix) | core | `noNegationElse` (safe fix) |
| no-else-return | core (conditional fix) | core `{ allowElseIf: true }` | `noUselessElse` (safe fix) |
| no-lonely-if (+ unicorn's) | core | core | `useCollapsedIf`, `useCollapsedElseIf` |
| curly | core `"error"` (= `"all"`, fix) | core `["error", "all"]` | `useBlockStatements` `{ fix: "safe" }` |
| cognitive complexity | js-plugins `sonarjs/cognitive-complexity` 20 | core, 20 | `noExcessiveCognitiveComplexity` 20 |
| react/jsx-no-leaked-render | – | react preset (fix) | `noLeakedRender` (react) |

- **Messages:**
  - **no-nested-ternary:** "Do not nest ternary expressions." in all three linters. Oxlint adds the help "Refactor nested ternary expressions into if-else statements for better readability."
  - **sonarjs:** "Extract this nested ternary operation into an independent statement."
  - **Oxlint's unicorn port:** "Unexpected nested ternary expression without parentheses." (help "Add parentheses around the nested ternary expression.") and "Unexpected deeply nested ternary expression." (help "Avoid nesting ternary expressions for more than one level.").
  - **ESLint's unicorn:** "Nested ternary expression should be parenthesized." and "Do not nest ternary expressions."
- **Fixes:** no linter fixes a nested ternary for no-nested-ternary or noNestedTernary; only unicorn's adds parentheses.
- **Formatters:** neither Ultracite's Oxfmt preset nor its Prettier config sets `experimentalTernaries`.
- **What agents are told:** the prompt asks for "the minimal change that resolves each issue", keeping "runtime behavior the same" for a style rule. It says an edit "that only hides the code from the rule (rewording it, re-spelling it, an equivalent construct) is not a fix", and forbids suppressions. The AGENTS.md template says "Prefer simple conditionals over nested ternary operators".

### 4.2 The inventory

External source.

- **Conditionals:** 15,805 (138.2 per 10k); corpus 115.1, React set 174.0 per 10k.
- **Nested ternaries:** 943, holding 2,153 conditionals (13.6%).
  - **Depth:** 2: 780, 3: 124, 4: 26, 5+: 13. **Lines:** median 5, p90 34, max 322; 794 span more than one line.
  - **Shape:** chain 716, consequent 146, mixed 80, test 1.
  - **Parentheses:** 870 have no parenthesised nested conditional, 58 have all of them parenthesised, 15 some.
  - **Positions:** initializer 332, JSX child 235, property 109, JSX attribute 58, return 46, argument 40, template 27, concise arrow body 24, operand 24, assignment statement 24, array element 13, spread 11. None is a default parameter or class field.
  - **Inside JSX:** 349 (331 in the React set, 18 in the corpus); 227 have a JSX branch.
- **Tests:** 821 unrelated, 80 lookup-shaped, 27 switch-shaped, 15 thresholds. Discriminants: 58 identifiers, 43 member reads, 3 `typeof`, 3 calls. No loose equality.
- **Branches:** literals 999, JSX 657, identifiers 269, member reads 245, calls 234, `undefined` 144, `null` 129. If evaluated eagerly: pure 1,768, JSX 454, reads 457, effects 409, await 5, throws 2. 296 trees have a branch that calls, awaits or throws.
- **Indirect nesting:** 1,050 conditionals sit in another's branch through other expressions; sonarjs counts 181 of them.
- **Conditional types:** 882, 364 nested (235 in the false branch, 123 in the true branch). No rule looks at them.
- **If statements:** 38,063 heads.
  - **Else-if chains:** 1,491 (1,158 of two tests, 205 of three, 128 longer), 144 of them ternary-shaped (73 assignments, 71 returns).
  - **Guard chains:** 3,091, 780 with two or more guards.
- **Functions with a nested ternary:** 745 of 52,834; cognitive median 10 (p90 36), against 3 (p90 16) for other functions with a conditional; 163 over 20.
- **Tests:** 17 nested ternaries in 516,920 lines. **Ultracite's CLI:** 348 conditionals, no nested ternary (its own preset enforces the rule).

### 4.3 What the rules report

External source, each rule alone. No measured file has a directive naming these rules, so raw equals reported for them.

| Rule | Oxlint | ESLint | Biome | Per 10k |
| --- | ---: | ---: | ---: | ---: |
| no-nested-ternary / noNestedTernary | 1,164 | 1,164 | 1,164 | 10.2 |
| sonarjs/no-nested-conditional | 1,391 | 1,391 | – | 12.2 |
| unicorn/no-nested-ternary | 925 | 925 | – | 8.1 |
| unicorn/prefer-ternary | 612 | 2,184 | – | 5.4 / 19.1 |
| prefer-logical-operator-over-ternary | 67 | 151 | – | |
| no-unneeded-ternary / noUselessTernary | 20 | 20 | 20 | |
| no-negated-condition / noNegationElse | 1,297 | – | 1,188 | |
| no-else-return / noUselessElse | 664 | 664 | 1,225 | |
| unicorn/prefer-minimal-ternary | – | 503 | – | |
| unicorn/no-unnecessary-nested-ternary | – | 18 | – | |

- **Units:** no-nested-ternary flags 892 units in all three linters (a unit merges a tree with trees inside its branches). sonarjs flags 1,017, unicorn 839.
- **Reports per unit:** 709 units get one no-nested-ternary report, 132 two, 30 three, 21 four to eight. sonarjs gives more (it reports every nested conditional); unicorn fewer (one per leaf chain).
- **With Ultracite's presets** (the shared census, core + react + js-plugins): no-nested-ternary 1,164 reports (rank 24 of 1,242 enabled rules), sonarjs/no-nested-conditional 1,391 (rank 20), `curly` 6,355 (rank 2).

### 4.4 Where the implementations disagree

| Pair | Both | Only first | Only second | Why |
| --- | ---: | ---: | ---: | --- |
| ESLint vs Oxlint no-nested-ternary | 892 | 0 | 0 | the same units; calibration c18 shows Oxlint also reports through `as` and `!`, which no corpus tree has |
| ESLint no-nested-ternary vs Biome noNestedTernary | 892 | 0 | 0 | the same units; ESLint reports the parent, Biome the nested branch (one per parent), so both count 1,164 |
| no-nested-ternary vs sonarjs | 892 | 0 | 125 | sonarjs also reports conditionals inside a template (70), a call (18), a binary expression (18), a member expression (7), a logical expression (5), combinations (6), and one test-only tree |
| ESLint vs Oxlint unicorn | 839 | 0 | 0 | the same units and counts; the per-unit counts differ slightly (which node gets "too deep") |
| ESLint vs Oxlint sonarjs | 1,017 | 0 | 0 | the same plugin |

**prefer-ternary** is two different rules under one name:

| Reported if statement | Both | ESLint only | Oxlint only |
| --- | ---: | ---: | ---: |
| `if/else`, one return each | 199 | – | 69 |
| `if/else`, one assignment each | 180 | 1 | 110 (+31 compound) |
| `if/else`, one call each (minimal ternary) | – | 199 | – |
| flat return, `if (a) return x; return y;` | – | 1,440 | – |
| `let` + `if` | – | 73 | – |
| `if` alone returning, other | – | 89 | – |
| `await`, `throw`, other | 3 | – | 20 |

- **ESLint's unicorn 79:**
  - It reports flat early returns, `let` + `if`, and same-callee calls (`checkVaryingBase`).
  - It skips an if that follows another if that returns, so a guard chain of two or more isn't reported.
  - It never merges branches that already hold a ternary.
- **Oxlint's port:**
  - It reports only if/else, with or without braces, and more assignment shapes.
  - In 27 of its reports a branch contains a conditional (inside an object literal or a call), so the ternary it asks for would hold another one indirectly.
- **Direct nesting:** in neither linter does any report have a branch whose value is itself a conditional, which would nest directly.

### 4.5 The formatter

| Version | Lines (942 trees) | Median | Nested test on its own line (all) | 3+ chains: stepped / flat | Parenthesised trees |
| --- | ---: | ---: | ---: | ---: | ---: |
| as written | 13,542 | 5 | 584 | 56 / 58 | 72 |
| Oxfmt | 15,337 | 5 | 661 | 65 / 50 | 44 |
| Prettier | 15,337 | 5 | 661 | 65 / 50 | 44 |
| Prettier `experimentalTernaries` | 14,448 | 5 | 942 | 0 / 115 | 0 |

- **Oxfmt equals Prettier** on every tree's line count.
- **Indentation shows the nesting outside JSX only:**
  - **Outside JSX:** a chain steps one indent per level (calibration c01: each nested `?` two spaces further right).
  - **JSX children:** stay at one indentation with parenthesised branches (c06).
  - **`experimentalTernaries`:** prints every chain as a flat list of `test ? value` lines (c17) and removes every parenthesis.
- **Formatting adds lines:** 274 trees grow (sum +1,795), 2 shrink. With `experimentalTernaries`, 344 grow and 398 shrink (sum +906).
- **The ping-pong:** 515 files have a tree where unicorn/no-nested-ternary's fix would add parentheses. In most of them, the fix and then the formatter give back the formatted file:

  | Fix + formatter | Files that cycle |
  | --- | ---: |
  | Oxlint + Oxfmt | 512 |
  | Oxlint + Prettier | 513 |
  | ESLint + Prettier | 497 |
  | ESLint + Oxfmt | 496 |

  The rest are files where the fix also changed something else. In calibration c23 every pair cycles; c17 (three deep, where "too deep" has no fix) converges.

### 4.6 Cognitive effort

What sonarjs counts (calibration c43, c44; Biome agrees on every case it reports):

| Four-way choice (c44) | sonarjs | cyclomatic |
| --- | ---: | ---: |
| nested ternary chain | 6 | 4 |
| `let` + else-if chain | 4 | 4 |
| early returns | 3 | 4 |
| switch | 1 | 4 |
| lookup with `??` | 0 | 2 |

- **A ternary chain is charged as nested ifs:** each conditional is +1 plus its nesting, so a chain of k tests scores k(k+1)/2 (3, 6, 10).
- **Statement forms are linear:** an else-if chain with a final else scores k + 1 (`if` +1, each `else if` and the `else` +1). Early returns score k.
- **Inside a loop** (c44 `insideLoop`), a two-test chain scores 6.
- **A consequent ternary is cheaper than its if/else** (c43): `a ? (b ? x : y) : z` scores 3, the if/else 5, early returns 3.
- **Measured on the rewrites** (942 trees; change in the enclosing function):

| Rewrite | n | Median change | Sum | With the helper's own score |
| --- | ---: | ---: | ---: | ---: |
| early returns | 70 | −1 | −70 | |
| `let` + if/else | 328 | 0 | −97 (76 functions rise, all consequent or mixed shapes) | |
| if/else statements | 24 | −1 | −22 | |
| helper | 939 | −4 | −5,617 | −2,547 (median −1) |
| lookup | 79 | −3 | −323 | |
| switch | 106 | −3 | −450 | −340 |

- **What the metric doesn't capture** (see `results/cognitive-complexity/REPORT.md`):
  - It scores structure, not names or formatting.
  - It doesn't see JSX: a JSX child chain scores like any other chain.
  - Class field initializers aren't functions, so a nested ternary there scores nothing (c09).
  - A helper moves the score to another function rather than removing it.
  - The lookup's 0 hides the evaluation-order risk in §4.7.

### 4.7 The rewrites

942 reported trees (source). Every rewrite built parses and removes its tree's report.

| Rewrite | Built | Lines added (median) | Oxlint presets add | ESLint presets add | ESLint fix gives a ternary back | … nested |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| early returns | 70 | +2 | no-useless-undefined 6 | prefer-ternary 19, no-useless-undefined 6 | 20 | 0 |
| `let` + if/else | 329 of 331 | +3 | prefer-ternary 97, prefer-destructuring 21 | prefer-ternary 90, prefer-switch 5 | 90 | 0 |
| if/else statements | 24 | +1 | no-self-assign 4, prefer-ternary 3 | no-lonely-if 1 | 0 | 0 |
| helper | 942 | +5 | no-useless-undefined 133, no-case-declarations 10, consistent-function-scoping 9 | prefer-ternary 173, no-useless-undefined 133 | 175 | 0 |
| lookup | 79 | −2 | object-shorthand 1 | prefer-ternary 1 | 0 | 0 |
| lookup of thunks | 79 | −1 | no-unstable-nested-components 3 | | 0 | 0 |
| switch | 106 | +8 | no-useless-undefined 11, consistent-function-scoping 4 | same | 0 | 0 |

- **Positions without a statement rewrite:** 519 of 942 trees (55.1%) can only be rewritten by extracting them (a helper, a variable, a lookup or a component).
- **Where prefer-ternary fires on the rewrite:** only where the tree nested in a consequent.
  - **Why:** `a ? (b ? x : y) : z` becomes `if (a) { if (b) … }`, and the inner if/else is a plain two-way choice again.
  - **Oxlint:** reports 97 such `let` rewrites and has no fix.
  - **ESLint:** reports and fixes them, giving back one ternary inside an if (for example hono `src/helper/html/index.ts` L52), never a nested one.
  - **Chains:** chains rewritten as early returns are never reported, because ESLint's rule skips an if after an if that returns.
- **Oxlint's and Biome's fix passes** give nothing back (0 in every rewrite).
- **Behaviour signs:**
  - **Statement rewrites and helpers:** none, except 1 exported `const` that becomes `let`, and 4 helpers whose `await` moves into an async helper (an extra tick).
  - **Lookups (79):**
    - inherited keys: all 79
    - the discriminant read once (31) or called once (1)
    - a branch that may be nullish and would fall to the `??` default: 23 (certain in 1)
    - eager calls: 12; eager member reads: 10
    - number keys that also match strings: 5
    - a value duplicated per key: 1

    The thunk lookup removes the eager evaluation but keeps the rest.
- **The behaviour cases confirm each sign** (calibration `behaviour/`):
  - **Same:** if/else and early returns (b11), a switch on literal keys (b02), a `Map` (b03), `Object.hasOwn` or a null-prototype lookup (b04), bound thunks (b06), `&&` with boolean conditions (b08).
  - **Changed:**
    - an eager lookup throws `JSON.parse` errors for other kinds (b02, 2 of 4 inputs)
    - it matches `"1"` (b03, 2 of 8)
    - it returns `Object.prototype` members for `"constructor"`, `"toString"`, `"__proto__"` and `"hasOwnProperty"` (b04, 4 of 7)
    - it replaces a legitimately undefined or null branch (b05, 2 of 4)
    - it loses `this` through a method reference (b06, 2 of 3)
    - a switch calls its discriminant once (b07, 3 of 4) and is strict where the chain used `==` (b12, 4 of 7)
    - `count && <X/>` renders 0 (b08, 1 of 3)
    - an `||` chain falls through `0` and `""` (b09, 3 of 5)
  - **Same results, different calls:** an eager lookup calls every loader (b01), and moving the inner ternary into a variable calls `expensive()` even when the outer test short-circuits (b10).

### 4.8 Fixes that write conditionals

- **Oxlint's `prefer-logical-operator-over-ternary` under `--fix-dangerously`** (`ultracite fix --unsafe`) drops the parentheses the alternate needs. Calibration c46:
  - `x ? x : y ? 1 : 2` becomes `x || y ? 1 : 2`, which is `(x || y) ? 1 : 2` (b13: 2 of 4 inputs change).
  - `x ? x : (y ? 1 : 2)` becomes `x || (y ? 1 : 2)`, which is right.
  - `onSelect ? onSelect : () => {}` becomes `onSelect || () => {}`, a syntax error.
  - **On the corpus:** 52 conditionals have the same test and consequent. All 10 with an unparenthesised conditional alternate change meaning (for example hono `serve-static.ts` L33, Excalidraw `restore.ts` L475 and `export.ts` L136, Supabase `ProviderForm.tsx` L105). The 2 with an arrow alternate (Excalidraw `CommandPalette.tsx`, `TTDDialogPanel.tsx`) no longer parse.
  - **The nested-ternary report disappears too**, because the result isn't nested.
  - **ESLint's version** offers suggestions (`a || (b ? b : "none")`), which `eslint --fix` doesn't apply.
- **ESLint's `react/jsx-no-leaked-render`** (react preset; with the default options, its fix writes a ternary):
  - **Calibration c45:** `{count && (urgent ? <b/> : <i/>)}` becomes `{count ? urgent ? <b/> : <i/> : null}`, which no-nested-ternary and sonarjs then report.
  - **Not reported at all:** a `&&` that is itself a ternary's branch (`loading ? … : count && <p/>`).
  - **On the corpus:** 2,252 reports in 872 of 2,793 JSX files; the fix creates 11 nested ternaries (350 → 361 in those files).
- **Other fixes and nesting:**
  - `no-negated-condition`'s fix flips `!ready ? "waiting" : failed ? "failed" : "ready"` into `ready ? (failed ? … ) : "waiting"`, moving a chain's nesting into the consequent (c37).
  - ESLint's `no-unnecessary-nested-ternary` fixes `a ? (b ? x : y) : y` into `a && b ? x : y` (c36). Oxlint and Biome have no such rule.

### 4.9 History

Eight repos, 2023-10 to 2026-10, 12,762 mainline commits, 28,086 file versions parsed (0 missing blobs, 0 parse errors).

- **Events** (non-mass commits; one rater's check: 39 of 55 right, 9 partly):
  - **Nested ternaries (485 commits):**
    - introduced 364 (223 with a new function)
    - extended 114 (88 a single ternary that became nested)
    - shrunk 12; reduced to one level 35
    - removed 187 (90 with their function)
    - converted to else-if, guard returns or if 21; to a switch 13; from if/else, switch or lookup 7
  - **Else-if chains (1,335 commits):**
    - introduced 1,069
    - extended 369 (213 from a lone `if`)
    - shortened 156
    - removed 657
    - converted to a switch 25; to a ternary 4; from a ternary 23
  - **Guard chains** gained a guard 64 times.
  - **Examples:**
    - Next.js dd57054647 (#59585, a bug fix) rewrote a returned nested ternary as guard returns.
    - Some conversions happened at the moment someone added a branch: Next.js 5261ed8db9 and Vite 4417b4f305 went to else-if, and 43273a1d21 and Astro 6e29a172f1 to a switch.
    - Hono went the other way twice: 43fe52ce33 (else-if to a nested ternary, for speed) and 95ae4d3721 (to shrink minified output).
- **Diff size of adding one branch** (inside the construct's new range):

| Adding one branch to … | n | Lines added (median) | Existing lines rewritten (median, p90) | Pure insertions |
| --- | ---: | ---: | ---: | ---: |
| an else-if chain | 147 | 6 | 0, 4 | 58.5% |
| a lone `if` (becomes else-if) | 193 | 6 | 1 | 39.4% |
| a guard chain | 60 | 4 | 0 | 81.7% |
| a single ternary (becomes nested) | 82 | 5 | 1, 3 | 14.6% |
| an already nested ternary | 24 | 5 | 1, 5 | 8.3% |

  The total diff is about the same size, but a ternary branch almost always rewrites a line that was there (the formatter re-wraps the chain). These are different changes in different code, not the same change written two ways.
- **Keyword commits:** 63, 50 of them in the measured source.
  - **Unrelated:** 43 ("precedence" of config, routes or CSS).
  - **Refactors:** 5 away from a ternary, 3 to one.
  - **Other:** 5 tooling, 2 fixes that added a branch to a ternary, 1 formatting, 1 parenthesised for readability.
  - **Bugs:** 2, both VS Code, both one level, both outside `src/vs/editor/common` (read with `gh api`): f294ac44d5 "debt - fix bugs around bad ternary operator use (#266364)" (`a ?? b ? c : d` read as `(a ?? b) ? c : d`) and 99323241e9 "Color Picker: fix incorrect ternary condition definition (#251090)" (branches swapped).
  - **Rule names:** no commit message names any of these rules or `experimentalTernaries`.
- **Bug fixes** (29,787 functions with 30+ days' exposure, 301 with a nested ternary, 5,571 touched by a fix):

| Model | Odds ratio [95% CI] |
| --- | --- |
| nested ternary, + size, exposure, repo | 1.30 [1.00, 1.69] |
| + has any conditional | 1.10 [0.84, 1.43] (any conditional 1.30 [1.17, 1.46]) |
| only functions with a conditional (n 3,849) | 1.02 [0.77, 1.35] |
| + cognitive complexity | 1.27 [0.97, 1.65] |
| else-if chain of 3+, + size, exposure, repo | 0.93 [0.70, 1.23] |
| changed functions, + number of changes: nested / else-if 3+ | 1.04 [0.75, 1.46] / 1.10 [0.79, 1.54] |

  Shares touched by a fix:

  | Group | Touched by a fix | Median own lines |
  | --- | ---: | ---: |
  | nested ternary | 51.2% | 52 |
  | else-if chain of 3+ | 46.0% | |
  | a ternary, not nested | 37.3% | |
  | no conditional | 15.8% | 5 |

  The difference is size and having any branch at all.

### 4.10 Policy

- **No repo enables a nested-ternary rule** (`no-nested-ternary`, unicorn's, sonarjs's, `noNestedTernary`), or `prefer-ternary`, `prefer-logical-operator-over-ternary`, `multiline-ternary` or `operator-linebreak`. None sets `experimentalTernaries`.
- **React Aria turned it off:** `.oxlintrc.json` L149 has `"no-nested-ternary": "off"`.
  - It came with b55427c9a5 ("chore: Migrate from eslint to oxlint (#10049)", 2026-05-12), which gives no reason.
  - That commit's parent had `'no-nested-ternary': ERROR` in `eslint.config.mjs`.
  - Its four nested ternaries all arrived later, in `Sheet.tsx` (d976503a3d, 2026-10-02).
- **Others:**
  - **Next.js:** `no-mixed-operators`, whose groups don't include `?:`.
  - **zod:** Biome `recommended` turns on `noUselessTernary` but not `noNestedTernary`.
  - **Supabase, shadcn:** extend `prettier` (eslint-config-prettier turns `unicorn/no-nested-ternary` off).
  - **Hono, Radix:** run Oxlint with the style category off.
- **Shared configs as installed:**
  - **unicorn 79's `recommended`:** turns core `no-nested-ternary` off and `unicorn/no-nested-ternary` on (Ultracite does the reverse).
  - **`@eslint/js` `all`:** turns on `no-nested-ternary` and `no-ternary`.
  - **sonarjs `recommended`:** turns on `no-nested-conditional`.
- **Disable comments:** none names these rules, in source or tests, in any repo.

### 4.11 Hand classification

| Field | Weighted shares (rater 1) | Agreement (36 blind) | κ |
| --- | --- | ---: | ---: |
| structure | flat chain 78.9%, nested 21.1% | 35/36 | 0.92 |
| reads (chosen rewrite vs ternary) | better 47.7%, same 43.8%, worse 8.5% | 26/36 | 0.52 |
| rewrite | helper 39.6%, keep 31.4%, early returns 11.1%, if/else 10.4%, lookup 2.8%, child component 2.7%, switch 1.9% | 19/36 | 0.38 |
| lookupSafe | n/a 88.6%, yes 5.7%, no 5.7% | 32/36 | 0.56 |

- **Rewrite agreement is low.** The raters agreed on the shape and mostly on whether a rewrite helps, but not on which rewrite: rater 2 chose "keep" for 19 of 36 (rater 1 for 22 of 80). Read the rewrite shares as one rater's judgement.
- **Where keep wins:**
  - short three-way choices in JSX attributes, call arguments and object properties, where a statement rewrite moves the decision away from its use
  - parallel expressions (Excalidraw's per-side geometry) whose symmetry a rewrite breaks
- **Where the automatic labels miss:**
  - Two "chains" read as nested, because the nesting runs through a JSX container or `+` (indirect, so outside the tree).
  - Two reported trees collapse to a single condition (`isGranted ? !hasPendingRemove : hasPendingAdd`).
  - Against the automatic shape, rater 1 agrees on 78 of 80.
- **Lookups:** of the 12 dispatch-shaped items, rater 1 called 6 safe and 6 unsafe (eager `.every`, `params(data)`, `getCurrentLocationUrl()`, `++matchId`, an open string key, a `false` key).

### 4.12 Calibration

46 cases (`tables.md` has the full matrix).

- **Reported by every no-nested-ternary:**
  - chains: c01, c04 (parenthesised), c17 (three deep)
  - consequent (c02, c36) and mixed (c21)
  - JSX attribute and child (c05, c06, c22)
  - template literals (c07, c39)
  - a default parameter (c08) and a class field (c09)
  - a statement (c41) and an assignment (c42)
  - `??` mixes (c11)
- **Only some:**
  - nesting only in a test: sonarjs only (c03)
  - through `as` or `!`: Oxlint only (c18)
  - through a call: sonarjs only (c19)
  - through an array, object or function: nobody (c20)
  - TypeScript conditional types: nobody (c10)
- **Gaming moves clear every nested-ternary rule:**
  - a helper that wraps the inner ternary (c31)
  - the inner ternary in a variable (c32)
  - an IIFE (c33): ESLint's prefer-ternary then reports the IIFE's body, and its fix makes it a ternary again, inside the IIFE
  - an `&&`/`||` chain (c35): nothing reports it

  Suppressions work per linter (c34).
- **`if (bool) return x;`** (c16): `curly` (Oxlint, ESLint) and `useBlockStatements` (Biome) report every guard, and every fix pass adds braces.
- **prefer-ternary on early returns** (c14, c24, c25):
  - **ESLint:** its fix turns `if (c) { return x; } return y;` into `return c ? x : y` (then a concise arrow), leaves a three-way guard chain alone, and suggests but doesn't fix `let` + `if`.
  - **Oxlint:** reports only `if/else` returns and has no fix; its `no-else-return` fix turns them into a guard.
  - **Biome:** has no prefer-ternary; `noUselessElse` removes the else.
- **The precedence trap** (c11): `name || anonymous ? "named" : "nobody"` is `(name || anonymous) ? …`, and no rule warns.

### 4.13 Agents in our own data

- **Runs:** 264 committed (132 per agent), 192 with attempts or steps; also 28 superseded and 64 prompt-revision runs, counted apart.
- **Nested ternaries:** none written, in any group, net or within an attempt. That includes func-style's subject A, whose tempting variant was nested ternaries (16 conditionals before and after). The three subjects that already had one kept all 24.
- **Conditionals added:** in 20 runs (Claude Code 13, Codex 7); 9 runs (13 conditionals) added a genuinely new test. Agents turned an if into a ternary 5 times (cognitive-complexity s2 ×2 by Claude Code, length-limits c ×3 by Codex) and never the reverse.
- **Reports caused:**
  - **ESLint's prefer-ternary:** 56 → 64 in 5 runs (length-limits c ×4, security-rules s1 ×1): new flat returns and `let` + `if`, written while splitting functions.
  - **Oxlint's prefer-ternary:** 24 → 24.
  - **Others:** no run added no-nested-ternary, no-else-return or curly.
- **Retries:** 0 of 312 prompts and 0 of 48 retry prompts listed a ternary rule.

## 5. Findings worth stating carefully

- **The rule mostly reports code where Hayden's preferred shape can't go.** Only 7.4% of nested ternaries are in a `return` or concise body. 55% are in JSX, arguments, properties and templates, where the fix is an extraction, which moves the complexity rather than removing it.
- **The cost is quadratic in the metric, not obviously in the code.**
  - **The metric:** sonarjs scores a k-way ternary chain k(k+1)/2, and early returns k. Most trees are two deep (3 against 2).
  - **The raters:** most rewrites read better or the same, and about a third of ternaries are clearest as they are.
- **No evidence that nested ternaries cause bugs.** Once function size and "has a branch" are controlled, the association is gone. Only 2 of 63 keyword commits were ternary bugs, and neither was nested.
- **"Hard to modify" holds in a narrow sense.** Adding a branch to a ternary rewrites existing lines in 85% of cases, against 42% for an else-if chain and 18% for a guard chain. The diffs are the same size.
- **The rules that pull against no-nested-ternary are mostly fixes, not prefer-ternary itself.** prefer-ternary never asks for direct nesting. But ESLint's fix turns the inner half of a rewritten consequent ternary back into a ternary, and two other fixes write nested or broken ternaries.

## 6. Caveats

- **Snapshot and mix:** HEADs from 2026-10. Supabase Studio has 55% of the nested ternaries and 85% of the React set's lines.
- **The rewrites are mechanical:**
  - They pick no better names and don't simplify conditions.
  - They keep `return undefined` and add no type annotations for `let`.
  - They aren't type-checked (only zod and hono resolve their imports), so a lookup's index type errors and a `let`'s evolving type aren't counted.
- **Behaviour signs are static:** "inherited keys" is possible for every plain-object lookup, but harmless when the discriminant's type is a closed union of the keys. There is no type information here.
- **Formatter matching** is by order within a file; it found the same trees in every version.
- **History:**
  - One rater for the keyword commits and the event check.
  - Event classes are about three in four right, so conversion counts are examples, not rates.
  - The bug-fix heuristic is 73.7% precise.
  - These are associations, not effects.
- **The raters are Claude models.** Rater 1 (a fork of the measuring session) saw the automatic labels. Rater 2 ran one `grep` through the shell on an allowed source file, which its brief didn't allow; it read no labels or results.
- **The agent runs** came from other topics; none was asked to fix a nested ternary.

## 7. Notes on Ultracite (for Hayden, not fixed)

1. **`curly` rejects `if (bool) return x;`** in every preset (Oxlint `curly` "all", ESLint `["error", "all"]`, Biome `useBlockStatements`), and every fix pass adds braces (c16). The early-return shape survives, but not the one-line form.
2. **`ultracite fix --unsafe` with Oxlint changes behaviour or breaks the file** on `x ? x : y ? a : b` and `x ? x : () => …`. Oxlint's `prefer-logical-operator-over-ternary` suggestion drops the alternate's parentheses: 10 meaning changes and 2 syntax errors in the corpus (c46, b13). It's an upstream Oxlint bug; ESLint's unicorn parenthesises.
3. **ESLint's `react/jsx-no-leaked-render` fix writes nested ternaries** that no-nested-ternary then reports (c45; 11 in the corpus), so `ultracite fix` leaves an error it created.
4. **ESLint's and Oxlint's `prefer-ternary` are different rules.**
   - **ESLint** (unicorn 79, `checkVaryingBase` and `checkComputedMemberAccess`) reports flat early returns and `let` + `if`, and fixes them.
   - **Oxlint's port** reports neither and has no fix.
   - **Effect:** ESLint users who write a two-way decision as Hayden prefers get it turned back into a ternary by `ultracite fix`.
5. **Disabling `no-nested-ternary` isn't enough in ESLint.** `sonarjs/no-nested-conditional` (in ESLint core; in Oxlint only through js-plugins) reports the same trees and more (templates, calls). The subjects' suppression variants leave it reporting.
6. **Turning `unicorn/no-nested-ternary` off is well founded:** the ping-pong happens in 512 of 515 corpus files.
7. **Outside this topic:** Oxlint core now sets `func-style: ["error", "expression"]` (no `allowArrowFunctions`) and `no-use-before-define: ["error", { variables: false }]`, which differ from what the func-style report recorded.

## 8. What the subjects need from the experiment

- **Lint:** Ultracite's presets as init wires them (Oxlint core, + react for B).
  - **A:** no-nested-ternary ×1, plus `func-style`, `prefer-const` and `no-negated-condition` (both) ×1 each.
  - **B:** no-nested-ternary ×1, plus `import/consistent-type-specifier-style` ×2 (one from the stub import).
  - **C:** no-nested-ternary ×1, plus `no-plusplus` on the same line, `curly` ×2, `require-unicode-regexp` ×3 and others.
  - **Handoff:** filter it to no-nested-ternary, or accept the extras. C's `no-plusplus` sits on the line that matters.
- **Strip** the header fields listed in `examples.json` `stripFields`.
- **Measure:**
  - the oracle's verdict
  - whether the nested-ternary rules (including ESLint's sonarjs) still report
  - the rules the edit adds (curly for one-line guards, prefer-ternary in ESLint, leaked-render for `&&`)
  - what was left for review

## 9. Reproducing

```sh
bash research/corpus/scripts/clone.sh && bash research/corpus/scripts/a11y-clone.sh
bash research/corpus/scripts/todo-history-clone.sh
NESTED_TERNARIES_TMP=<scratch dir> node research/corpus/scripts/nested-ternaries-run-all.cjs   # about 40 min; --skip-history, --skip-census, --skip-rewrite
```

- **Hand inputs:** `history-labels.json`, `history-event-check.json`, and the rater labels (`out/nested-ternaries/labels-rater{1,2}.json`, kept in `classifications.json`). `sample.json` is frozen.
- **Shared scripts:** none changed.

## 10. Agent-experiment subjects

| Subject | Source | Reported | What the project did | Right response | Tempting responses and gaming moves (measured) |
| --- | --- | --- | --- | --- | --- |
| **A** `nested-ternaries-a-next-denormalize-page-path.ts` (16 lines verbatim) | vercel/next.js `packages/next/src/shared/lib/page-path/denormalize-page-path.ts` @ `d8bfc3c9` | no-nested-ternary ×1 (a two-test chain in a `return`) | this shape since #36576 (0de109baab, 2022); the only later edit, #65092 (2024), re-indented the chain for Prettier 3 | **a01/a02/a04/a11:** early returns (or if/else, which trips no-else-return), same behaviour, no new reports in Oxlint (ESLint's prefer-ternary reports a11's inner pair). **a03** one-line guards: same behaviour, `curly` ×2 | **a05** `&&`/`\|\|` chain: 2 of 320 paths change (`/index/` returns `/index/`, not `''`). **a06** tests reordered: 19 change. **a07** suppressions: clean in Oxlint and Biome, ESLint's sonarjs still reports. **a08** IIFE, **a09** helper, **a10** variable: clean, same |
| **B** `nested-ternaries-b-supabase-explorer-nav-notebooks.tsx` (94 lines) | supabase/supabase `apps/studio/components/layouts/ExplorerLayout/ExplorerNavNotebooks.tsx` L21–114 @ `09f80f52` | no-nested-ternary ×1 (loading / empty / list, a JSX child inside two wrappers) | arrived with #49254 (2893c783d5, 2026-08-20), unchanged through #49321 … #50701 | **b01** `let content` + if/else (Biome adds `noImplicitAnyLet`, `noEvolvingTypes`), **b02** a helper with early returns (clean), **b03** a child component (ESLint `prefer-read-only-props` ×7). **b06** `&&` with booleans: same, but leaked-render rules report | **b04** `notebooks.length &&`: 24 of 80 renders show `0`. **b05** `&&` without `!isPending`: 40 of 80 change. **b07** suppressions, **b08** IIFE, **b09** helper, **b10** variable: same |
| **C** `nested-ternaries-c-astro-config-alias.ts` (61 lines) | withastro/astro `packages/astro/src/vite-plugin-config-alias/index.ts` L8–68 @ `9050e381` | no-nested-ternary ×1 (a `.map` callback's concise body; `++matchId` in the first branch) | the ternary since #1747 (2021); #13059 (e36837f914, 2025, by Matt Kane) fixed the counter's scope | **c01** early returns in the callback, **c02** a switch, **c03** a lookup of functions: same behaviour, clean | **c04** an object lookup: 185 of 240 configs change. **c05** the increment moved above the test: 185 change. **c06** one counter for every target (the bug #13059 fixed): 57 change. **c07** suppressions, **c08** IIFE, **c09** helper, **c10** variable, **c11** `&&`/`\|\|` (all branches truthy here): same |

- **Oracle:** A runs 320 paths, B renders 80 scenarios (with the hooks each render calls), C compiles 240 tsconfigs and resolves sample ids through every alias. Every trace starts with the import.
- **Type checks:** every subject and every right variant type-checks with its stub (strict).
- **Cognitive complexity:** A 4 → 3 with early returns; B 8 → 6 or 7; C 15 → 14 (early returns), 13 (switch), 12 (lookups).

## 11. Files

| Path (under `research/corpus/`) | Contents |
| --- | --- |
| `results/nested-ternaries/*.json`, `tables.md`, `README-section.md` | results, generated tables, the README section |
| `calibration/nested-ternaries/` | 46 cases and `behaviour/` (13 runnable cases) |
| `examples/nested-ternaries/` | subjects A, B, C, their stubs, `examples.json`, `tsconfig.json` (licenses: `examples/licenses/next.js-license.md`, `supabase-LICENSE`, `astro-LICENSE`) |
| `scripts/nested-ternaries-*.cjs` | the topic's 16 scripts |
| `out/nested-ternaries/` | gitignored rows, worksheets, rater labels, history rows |

## References

- **ESLint 10.14.0:** `no-nested-ternary`, `no-unneeded-ternary`, `no-negated-condition`, `no-else-return`, `no-lonely-if`, `curly`, `complexity`.
- **eslint-plugin-unicorn 79.0.0:** `no-nested-ternary`, `prefer-ternary`, `prefer-minimal-ternary`, `no-unnecessary-nested-ternary`, `prefer-logical-operator-over-ternary` (sources read in `packages/cli/node_modules`).
- **eslint-plugin-sonarjs 4.2.2:** S3358 `no-nested-conditional` (source), `cognitive-complexity`.
- **eslint-plugin-react:** `jsx-no-leaked-render`.
- **Oxlint 1.90.0:** `oxlint --rules`. **Biome 2.6.4:** `biome explain` for the rules in §4.1. **Prettier 3.9.10:** `experimentalTernaries`.
- **Projects:** vercel/next.js#36576, #65092, dd57054647 (#59585); supabase/supabase#49254; withastro/astro#1747, #13059; adobe/react-spectrum b55427c9a5 (#10049); microsoft/vscode f294ac44d5 (#266364), 99323241e9 (#251090); honojs/hono 43fe52ce33, 95ae4d3721.
- **Method:** Śliwerski, Zimmermann and Zeller, MSR 2005, [doi:10.1145/1083142.1083147](https://doi.org/10.1145/1083142.1083147) (records only; check before quoting).
