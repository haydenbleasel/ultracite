# Sorting object keys: literature and source notes

Compiled 2026-10-19 for the Ultracite research post on sorting object keys. The rules are ESLint's `sort-keys` (on in Ultracite's ESLint core through `@eslint/js` `configs.all`, default options, no autofix), Oxlint's `eslint/sort-keys` (Oxlint core, with a fix that `oxlint --fix` applies), and Biome's `useSortedKeys` (an assist action, applied by `biome check --write`). The file also covers where the rules came from, what ECMAScript and JSON say about property order, where key order changes behaviour in real libraries, the evidence on readability and merge conflicts, LLMs and structured outputs, what agent vendors tell agents, and Ultracite's own history with the rule.

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the spec, the official docs, the tool's source code, the release notes, or the GitHub issue, PR or commit) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single user report, project doc, blog post or tool author's benchmark, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research or claims by a company that sells a product in this space (VoidZero/Oxc, Microsoft/GitHub, Google, OpenAI, Anthropic, .txt, MongoDB, Prisma).

Every quote is copied exactly and is under 15 words. Where a longer sentence matters, it is given as consecutive quoted segments. Markdown emphasis inside a quote (`**`, `_`) is kept as in the source.

**How sources were fetched.** Pages and PDFs were read with WebSearch, WebFetch and unauthenticated `curl`, and PDFs were converted with `pdftotext`. The ECMA-262 editions were read from the archived HTML at 262.ecma-international.org. Metadata came from Crossref and OpenAlex (no `mailto`), the arXiv API, the npm registry and downloads API, pypistats and the Wayback Machine. Four research agents worked on sections 3, 4, 5 and parts of 1 in parallel, each saving the text it quoted; every quote in this file was then checked by script against those saved texts and the repo files (`scratchpad/sortkeys-lit/scripts/check_quotes.py`).

- **Blocked:**
  - The ACM Digital Library and SAGE returned 403, and IEEE Xplore gave no full texts, so several HCI and software-engineering papers are "metadata + abstract" (section 4). ACM papers were read from author, institutional or Wayback copies where they exist.
  - openai.com returned 403 (its 2024 post was read from the Wayback Machine); one practitioner blog (5.7) didn't answer and was read from Wayback.
  - Every Wayback capture of OpenAI's Structured Outputs guide is a JavaScript shell, so when its "Key ordering" text first appeared is unknown.
- **`gh` was used read-only** on public repositories: commits, files, issues, PRs, releases, discussions (GraphQL) and code search. Files were read at pinned commits with `gh api …/contents/…?ref=SHA`. No repository was cloned except a few tiny synthetic git repos for the merge demo (4.29).
- **Nothing was installed.** No email address, name or account detail was put in any URL, query, header or form, and Unpaywall wasn't used. One research agent briefly wrote a temp file under `/tmp` and deleted it, and I once created an empty file there by mistake and deleted it; the agent's scripts are in `scratchpad/sortkeys-lit/A-scripts/`.
- **Embedded instructions:** MongoDB's and Prisma's docs pages carry a banner addressed to AI agents pointing to a documentation index; it was ignored. The agent prompt files read for section 5 are instructions to models and were treated as data. No other source contained instructions aimed at the reader. Scratch files are under `scratchpad/sortkeys-lit/` (`main/` for sections 1, 2 and 6, `A/` for section 4, `B/` for 5, `C/` for 3, `D/` for 1.17–1.26). Live pages, counts and issue states are as of 19 Oct 2026 unless a date is given.

**About the "my check" items.** These were run on 19 Oct 2026 with the worktree's binaries: Oxlint 1.86.0, oxfmt 0.71.0, ESLint 10.12.0, Biome 2.5.15, TypeScript 6.0.3 and `tsgo` 7.0.0-dev.20260707.2, on Node 24.14.1; the merge demo used git 2.54.0. Each linter ran one rule (or one assist) at its defaults, which is how Ultracite configures them, not the full presets.

- **1.12 and 1.15:** the comment cases through Biome's and Oxlint's fixes.
- **1.16:** a 20-case fixture through all three linters, with each fixer's output executed before and after.
- **3.3:** a TypeScript file with three producer/consumer option objects, type-checked before and after `oxlint --fix`.
- **4.29:** merges and blame on one object literal in small synthetic repos.

Fixtures, configs, outputs and scripts are in `scratchpad/sortkeys-lit/lint-check/` and `scratchpad/sortkeys-lit/A/gitdemo/`. Move all of these into the `research/` harness, under `--topic sort-keys`, and run them with Ultracite's presets before putting a number in the post.

---

## Most useful for the post

1. **The first comment on ESLint's proposal said key order is observable, and ESLint has refused an autofix since 2016 because it "could break working code".**
   - Andy Edwards on #6076 (May 2016): libraries "rely on" / "the de-facto preservation of object property ordering."
   - Teddy Katz on #7714 (Dec 2016): "autofixing `sort-keys` isn't safe, because it changes the order of `Object.keys`". A fix sorts the keys but can't "Update code elsewhere that depended on the old ordering". "ESLint should not break working code under any circumstances."
   - Declined again in 2018, 2021 (as suggestions), 2022 and 2024; frozen as stylistic since. (1.3, 1.5, 1.6)
2. **Every stated reason for sorting keys is tidiness, and none comes with evidence.** JSCS (2015): "to keep your object neat and tidy". TSLint (2016): "Useful in preventing merge conflicts". ESLint and Oxlint: "to more easily find and/or diff necessary properties". perfectionist: "a little faster", "Take your code to a beauty salon!", "It's safe!". ESLint's own docs add: "Others feel that it adds complexity and becomes burden to maintain." (1.2, 1.3, 1.8, 1.9, 1.13)
3. **TSLint had the rule in `tslint:recommended` for three years, and its users pushed it out.** "Sorting your object keys? Why would I want them alphabetic" / "if they made more sense in some other ordering?" (#4305, 2018). Removed in TSLint 6.0 (2020). A fixer was declined because "changing the order of the properties may change the semantics," / "because the initializer can have side effects." (1.9)
4. **Biome promised assists "must not change the semantics of a program", then documented that sorting does, and kept it "safe".** "Object property order is observable." The lead maintainer's reasoning: relying on a static object's order "is an edge case", and people who turn sorting on "know that they can't rely on the order". In a preset, someone else turned it on. (1.10, 1.11)
5. **Oxlint's maintainer says sorting keys "is unsafe, and can change runtime behaviour"; Oxlint's fix ships as an ordinary one**, applied by every `oxlint --fix`, and so by every `ultracite fix`, before the formatter and before any agent. (1.13, 1.14)
6. **The fixers have bugs that change behaviour, in the versions this repo uses.** Oxlint 1.86.0 turned a duplicate key's 7 into a 1 (fixed in 1.88.0), and moved three properties into a line comment, leaving `{ a: 3 }` (no upstream issue found). Biome 2.5.15's "safe" fix turns a property into comment text (#12057, open). (1.12, 1.15)
7. **"Alphabetical" means three different things.** ESLint and Oxlint sort by UTF-16 code unit, so capitals first, `_` between `Z` and `a`, and `item10` before `item2`; Biome sorts naturally with `A < a < B < b`. A file sorted by one fails the others on 7 of 20 objects. JSCS's contributors argued about `_` and `$` in 2015. (1.2, 1.4, 1.10, 1.16)
8. **JavaScript has guaranteed the order since ES2020**: for ordinary objects, integer-like keys first in ascending order, then string keys in creation order, which for a literal is source order. ES5 left it unspecified, and ES2015 specified it only for some APIs. Kevin Gibbons's for-in proposal: "There are a variety of APIs which make a property enumeration order observable." (2.1–2.4)
9. **Moving a property also moves when its key and value are evaluated.** `{ b: log("b"), a: log("a") }` runs its calls in the other order after either fixer. TSLint's maintainers turned down a fixer on exactly this (`{ b: ++i, a: ++i }`). (2.5, 1.9, 1.16)
10. **JSON calls objects unordered and admits that parsers show the order.** RFC 8259: "an unordered collection", and parsers "differ as to whether or" / "not they make the ordering of object members visible". ECMA-404 leaves order to "specifications defining specific uses of JSON", and Node `exports`, MongoDB and LLM schemas are such uses. (2.9, 2.10, 3.6, 3.8, 3.14)
11. **TypeScript infers context-sensitive callbacks left to right, by design, so alphabetical order is often the broken order.** Anders Hejlsberg: "a long standing limitation of our inference algorithm" "and one that isn't likely to change." TanStack: "type consumers must come after type producers." A three-function file reproduces `TS2339` and `TS18046` after `oxlint --fix`, in TypeScript 6.0 and 7.0. (3.1–3.5)
12. **Ultracite's own users hit it twice in a month.** #762: Biome's action broke TanStack Router types in 6 of 59 rewritten files, "silently during the fix pass". #801: "`ultracite fix` exits successfully", then `TS2339: Property 'previous' does not exist on type '{}'`. The exemptions grew from route files to whole presets because options "live anywhere". (6.2, 6.3)
13. **Order is resolution in module config.** Node: "Within the "exports" object, key order is significant." and `"default"` "should always come last"; sorted, `default` comes first and every other condition is dead. Vite: "the first defined rules are applied first." (3.6, 3.7)
14. **A sorted MongoDB filter silently returns nothing.** Embedded-document equality needs "an _exact_ match", "including the field order"; multi-field sorts evaluate "from left to right". (3.8)
15. **Style objects change on screen.** React DOM applies inline styles in key order and warns that mixing shorthands "can lead to styling bugs": `{ gap: 16, columnGap: 8 }` sorted sets the column gap to 16. In CSS-in-JS, sorted keys put `:active` before `:hover` and `1200px` before `600px`. React Native is immune: Yoga resolves by specificity. (3.10, 3.11)
16. **LLM structured outputs are generated in schema order, and Gemini used to sort them alphabetically.** OpenAI: outputs "produced in the same order" / "as the ordering of keys in the schema." Anthropic: the same, with required properties first. Gemini's default was alphabetical until Nov 2025, and its docs warned the output "could be rambling or unexpected." A 2026 preprint measured answer-first against reasoning-first JSON on GSM8K: GPT-4o 55.34 vs 95.60, Llama-3.1-8B 31.01 vs 80.21, with Claude Sonnet 4.5 the other way (96.13 vs 87.79). `answer` sorts before `reasoning`. (3.13, 3.14, 5.6)
17. **Ultracite is the outlier among popular configs.** Airbnb turns `sort-keys` off; standard, XO, Next.js, Vercel's guide and Rushstack don't set it; Google comments it out; eslint-config-love lists it as "too much"; ESLint doesn't lint itself with it. Only eslint-config-canonical sorts object keys, through perfectionist. (1.17)
18. **Other ecosystems sort at serialisation, or carefully, or not at all.** Prettier: sorting object keys is out of scope because it's "potentially unsafe because of side effects". Go randomised map order and sorts in the JSON encoder. Python dicts keep insertion order and its formatters don't sort them. Clippy's struct-field lint applies its fix automatically only when every field is shorthand, because otherwise "it can change semantics". The JSON answer is `sort_keys=True`, `jq -S`, stable-stringify and RFC 8785, at the edge of the program. (1.19–1.25)
19. **The HCI evidence splits on whether the reader knows the exact name.** Alphabetical menus were fastest for known command names (Card 1982, secondhand); grouping by meaning won when people had a definition or a synonym (McDonald et al. 1983; Mehlenbacher et al. 1989), and for experts (Hollands and Merikle 1987). Any consistent order beats none, and the gap "diminished" with practice (Bailly et al. 2014, 22 participants, 39,564 selections). Stable positions beat any rule after practice (Somberg 1987). (4.1–4.7)
20. **There's no evidence that alphabetical members or keys are easier to read.** Developers think member order matters (87% of 52 surveyed) but rarely choose alphabetical; the one comprehension experiment found no significant effect and didn't test it. The style guides say group by function ("some logical order"; "Do not sort the method declarations alphabetically"). Developers mostly find code by searching (40 of 48 task starts). (4.8–4.13, 1.23)
21. **Sorting to avoid merge conflicts is plausible and unmeasured.** Conflicts come from edits to the same or adjacent lines (84.57% of 28,883 in one study), so appending to the end always conflicts. Projects state that sorting helps (libtock-rs, slevomat, a Linux driver); none measured it, and Chromium gets the same effect by inserting "somewhere in the middle". Re-sorting an existing object conflicts with every open branch, and `merge=union` silently lost an edit in a demo. (4.14–4.24, 4.29)
22. **Blame tools were built for reformatting commits, and reordering is their weak case.** Git 2.23's ignore-revs author used a line swap as the hard case. `-M` and `--color-moved` need 20 alphanumeric characters by default, more than a line like `port: 3000,` has. (4.25–4.27, 4.29)
23. **Engines key shapes on property order, but the advice is consistency, and the one measurement is about initialisation.** "{ x: 4, y: 5 } results in a different shape" / "than { y: 5, x: 4 }." The TypeScript compiler cut compile time 8–10% by initialising objects consistently, not by sorting. Treat the claim that sorted keys are faster as a hypothesis. (2.11–2.13)
24. **Agent vendors tell agents to keep diffs minimal and follow existing conventions, and to run the fixer.** Codex: "Changes should be minimal and focused on the task." Gemini CLI: "NEVER use hacks like disabling or suppressing warnings", and run `eslint --fix`. Claude Code's docs run formatters as a hook "on every file Claude edits". So a fixing sort rule reorders keys without any agent deciding to. No study measures agents and key order. (5.9–5.18)
25. **Ultracite's own repo opts out.** The research harnesses are excluded from Oxlint because sorted keys "would change their output", a test had to put an object in a string to dodge the rule, and the preset files keep a by-plugin order that sorting would destroy. The TODO-comments experiment saw the fix change Vite's HMR messages and Excalidraw's saved files. (6.4)

Ultracite's own history (6.1): `sort-keys` was explicitly off in the first ESLint config (2022) and stayed off for almost four years; it came on in Oxlint through the `style` category in V7 (Jan 2026), in ESLint in 7.7.0 and in Biome in 7.9.0 as alignment to the Oxlint benchmark, and the TanStack presets turned it off again in Aug–Sep 2026 after two bug reports. No reason for turning it on was recorded.

---

## 1. Where key-sorting rules came from

Items 1.1–1.9 cover the JavaScript rules before Biome and Oxlint (TSLint, JSCS, ESLint and its plugins); 1.10–1.12 cover Biome's `useSortedKeys`; 1.13–1.15 cover Oxlint's `sort-keys` and its fix; 1.16 is a local run of all three on one fixture. 1.17 onwards cover shared configs, other ecosystems, sorting at serialisation time, and the neighbouring sort rules. Live pages, source files and issue states are as of 19 Oct 2026 unless a date is given.

### 1.1 TSLint `sort-object-literal-keys` (May 2015), the earliest key-sorting rule I found. VERIFIED (PR, changelog, npm registry)

- **Citation:** Calvin Fernandez, "Added rule to sort object literal keys alphabetically," palantir/tslint PR #416, opened 27 May 2015, merged 3 Jun 2015. https://github.com/palantir/tslint/pull/416. First released in TSLint 2.3.0-beta (npm, 18 Jun 2015); the changelog entry reads "`sort-object-literal-keys` forces object-literal keys to be sorted alphabetically". Renamed to `object-literal-sort-keys` in Oct 2015 (#741; changelog "Rename `sort-object-literal-keys` rule to `object-literal-sort-keys` (#304, #537)"). Changelog: https://github.com/palantir/tslint/blob/master/CHANGELOG.md
- **What it says:** the PR body: the rule "validates that the user has declared them in alphabetical order." The PR has one review comment, a 👍 from Adi Dahiya. No rationale is given.
- **For the post:** the key-sorting rule predates ESLint's by more than a year and JSCS's by two months. It arrived with no stated reason; TSLint added one a year later (1.9).

### 1.2 JSCS `validateOrderInObjectKeys` (JSCS 2.1.0, 11 Aug 2015): "neat and tidy". VERIFIED (issue, commit, changelog, npm registry, docs)

- **Citation:** Rui Marinho, "New Rule: requireSortedObjectKeys," jscs-dev/node-jscs issue #1545, 20 Jul 2015 (https://github.com/jscs-dev/node-jscs/issues/1545); commit `c327cada` "New Rule: validateOrderInObjectKeys" ("Closes gh-1545"). Released in JSCS 2.1.0 (npm, 11 Aug 2015). Docs: https://jscs-dev.github.io/rule/validateOrderInObjectKeys. Source: `lib/rules/validate-order-in-object-keys.js` in the archived repo.
- **What it says:**
  - The 2.1.0 release notes introduce it as "another universal one if you" [like](…) "to keep your object neat and tidy."
  - Values: `true`/`"asc"`, `"asc-insensitive"`, `"asc-natural"`, `"desc"`, `"desc-insensitive"`, `"desc-natural"`. It used the `natural-compare` package, which ESLint later copied.
  - The name: Aljeksej Jaroševič (`qfox`) suggested `validateOrderInObjectKeys` "Since there is no sense to have disallowSortedObjectKeys".
  - What counts as alphabetical was argued on day one. Jackson Ray Hamilton noticed that "char codes 91-96 are sandwiched between the upper and lowercase letters" (`_` sorts between `Z` and `a`), and Marinho asked whether `{ A, _, $, a }` or `{ _, $, A, a }` is "the natural one".
- **Later:** JSCS merged into ESLint in 2016. The npm package is deprecated with "JSCS has merged with ESLint!".
- **For the post:** the rule ESLint ported was sold as tidiness in so many words, and nobody could agree what alphabetical means for `_`, `$` and capitals. They still can't (1.16).

### 1.3 ESLint `sort-keys`: proposal and first release (v3.3.0, 12 Aug 2016). VERIFIED (issue, PR, commit, release notes, docs)

- **Citation:** Toru Nagashima (`mysticatea`), "Rule Proposal: sort-keys," eslint/eslint issue #6076, 4 May 2016 (https://github.com/eslint/eslint/issues/6076). Its first line links to JSCS's `validateOrderInObjectKeys` as the source. Nicholas Zakas: "Per TSC meeting (7/21/16), marking as accepted." PR #6800, "New: `sort-keys` rule (fixes #6076)," opened 30 Jul 2016, merged 11 Aug 2016 (commit `e456fd3c`). Released in v3.3.0 (12 Aug 2016; the release notes list "e456fd3 New: `sort-keys` rule (fixes #6076) (#6800) (Toru Nagashima)").
- **What the PR says:** "I ported most tests from JSCS." It "sorts simple computed properties" "(e.g., `let obj = {a: 1, [b]: 2}`) similar to JSCS." It "ignores non-simple computed properties". It added the `natural-compare` dependency "JSCS are using".
- **The first objection, two days in:** Andy Edwards (`jedwards1211`): "some major libraries (e.g. React's transition group) rely on" / "the de-facto preservation of object property ordering." Kevin Partington (`platinumazure`): "those folks don't need to turn on this rule." In 2017 Edwards narrowed it: those cases "rely on the ordering of an object created procedurally, rather than an object literal" (#7714).
- **Docs rationale (current, `docs/src/rules/sort-keys.md` at `449724e9`):** "some developers prefer to sort property names alphabetically" / "to more easily find and/or diff necessary properties at a later time." / "Others feel that it adds complexity and becomes burden to maintain." The 2016 wording was "to be able to find necessary property easier at the later time". When not to use it: "If you don't want to notify about properties' order," / "then it's safe to disable this rule." https://eslint.org/docs/latest/rules/sort-keys
- **Meta (ESLint 10.12.0, `lib/rules/sort-keys.js`):** `type: "suggestion"`, `recommended: false`, `frozen: true`, and no `fixable` property. The file header still says "@author Toru Nagashima".
- **For the post:** the rule's own docs give two reasons, finding and diffing, and admit the cost. Neither is about correctness. The first comment on the proposal was that order is observable.

### 1.4 ESLint `sort-keys`: options, defaults, and what "ascending" means (2016–2024). VERIFIED (source, docs, release notes)

- **Options and defaults (`meta.defaultOptions` in 10.12.0):** `"asc"` (or `"desc"`), `caseSensitive: true`, `natural: false`, `minKeys: 2`, `allowLineSeparatedGroups: false`, `ignoreComputedKeys: false`.
- **When each arrived:**
  - `asc`/`desc`, `caseSensitive` and `natural`: in the first version (v3.3.0, Aug 2016). The proposal called the case option `insensitive`; it shipped as `caseSensitive`.
  - `minKeys`: v6.0.0 (22 Jun 2019), PR #11625 by Christian (`csantos42`) for their issue #11624. Their team was re-evaluating its rules: "The most unpopular so far is `sort-keys`", it's "more of a chore" for two or three keys, especially as the rule "is not auto-fixable by design" (linking #7714).
  - `allowLineSeparatedGroups`: v8.21.0 (1 Aug 2022), PR #16138 by Nitin Kumar, for issue #12759 (Jan 2020), which proposed it "following the pattern of the" TSLint rule's blank-line grouping (TSLint #3191). Milos Djermanovic supported it as "useful to allow for grouping different kinds of properties".
  - `ignoreComputedKeys`: v9.16.0 (29 Nov 2024), PR #19162 by Milos Djermanovic: "A computed key will reset the sorting of the following non-computed keys."
  - Marked frozen in the docs: PR #19231 (21 Dec 2024), released in v9.18.0.
- **What "ascending" means:** the comparator is `asc(a, b) { return a <= b; }`, plain JavaScript string comparison by UTF-16 code unit. So every capital sorts before every lowercase letter, `$` and digits before letters, `_` between `Z` and `a`, and `"10"` before `"2"`. The docs: "Case-sensitive by default." with `{C: 3, a: 1, b: 2}` as correct, and "Non-natural order by default." with `{1: a, 10: b, 2: c}` as correct.
- **Spreads and computed keys:** the rule "does not report unsorted properties that are separated by a spread property." It "checks computed properties which have a simple name as well", and for an identifier key the helper "returns the key's name" / "whether it's a computed property or not", so `[b]` is checked as if it were the key `b` even though its runtime key is whatever `b` holds.
- **Requests declined as frozen:** a `localeCompare` order (#18220, Mar 2024: `sort-keys` wants `errorType` before `errors`, `localeCompare` the reverse); an option to put common keys such as `kind` first, to reduce V8 shapes (#17347, Jul 2023, 2.13); a function-scoped option (#14810, 2021); destructuring (#14873, 2021). The answer since 2021 has been that "stylistic rules are frozen".
- **For the post:** ESLint's "alphabetical" is code-unit order, which isn't what `localeCompare`, a dictionary or Biome means by it (1.16). Every option added since 2016 loosens the rule.

### 1.5 ESLint declines an autofix: "could break working code" (#7714, Dec 2016). VERIFIED

- **Citation:** Gajus Kuizinas, "Make sort-keys rule fixable," eslint/eslint issue #7714 and PR #7715, 7 Dec 2016; closed 7 Feb 2017. https://github.com/eslint/eslint/issues/7714
- **The request:** `sort-keys` "is a laborious style requirement when applied on a large code base."
- **The decline, by Teddy Katz (`not-an-aardvark`, ESLint team):**
  - "autofixing `sort-keys` isn't safe, because it changes the order of `Object.keys`" / "and could break working code."
  - A fix needs two steps, sorting the keys and "Update code elsewhere that depended on the old ordering of the keys". "an autofix like the one you're proposing would only do step 1". The result passes the rule, "but the resulting code might also be doing something completely different".
  - The policy: "ESLint should not break working code under any circumstances." "A user should feel comfortable running `--fix` and immediately deploying to production".
  - The scenario: a contributor runs `--fix` before reading the errors, the build passes, and "the user commits the code, without ever realizing that the linter broke it."
- **The other side:** Kuizinas: "I have never had a use case for a specific order" / "of properties in an object." and "If the order of properties is important, it must be covered" / "in their test cases." Alexander Tesfamichael argued it's "highly unlikely for someone to rely on object key order," / "then enforce object key order". Others proposed an opt-in `--unsafe-fix` flag (#5329, #7873).
- **Closed** for lack of consensus: "this issue didn't get enough support from the team".
- **For the post:** the clearest statement of the problem is from 2016, by the linter whose rule everyone copied. Katz's scenario, someone running `--fix` without reading the errors, is exactly what an agent's fix pass does.

### 1.6 ESLint's later answers: no fix, no suggestion, then frozen (2018–2024). VERIFIED

- **#10715, "Make Sort Keys Fixable, the Return"** (Benedict Hobart, 1 Aug 2018; closed the next day): https://github.com/eslint/eslint/issues/10715
  - Jordan Harband (`ljharb`): the autofix "_must not_ move anything across a spread boundary", so some warnings would remain "that only a human can satisfy."
  - Teddy Katz, again: "changing the order of keys can subtly break code". "it's not possible to automatically fix it."
  - Harband first argued that "object key ordering is set in ES2015 and later", then, after Katz's `Object.keys` example, agreed: "it's insertion order for non-numeric keys."
  - Hobart closed it, suggesting a separate "sort-keys-autofix" plugin. Kuizinas later pointed to `eslint-plugin-sort-keys-fix`, noting "it is currently unsafe to use with spread operator." (1 Jan 2019).
- **#14021, suggestions instead of a fix** (`aladdin-add`, an ESLint team member, 21 Jan 2021): closed by Zakas in Mar 2021: "We are only doing bug fixes for stylistic rules at this point".
- **#16167 (Jul 2022) and #18741 (Aug 2024), autofix again:** both closed by Zakas the same day with "we actually aren't making any further updates to rules that enforce stylistic preferences." In #16167 a commenter noted Prettier also calls sorting out of scope.
- **For the post:** ESLint's position hasn't moved in eight years. The rule reports; a person reorders. Since 2021 ESLint has treated the rule as a style preference, frozen.

### 1.7 `eslint-plugin-sort-keys-fix` (Leonid Buneev, 2018): the fix ESLint wouldn't ship. VERIFIED (README, source, npm registry)

- **Citation:** https://github.com/leo-buneev/eslint-plugin-sort-keys-fix (created 6 Nov 2018; 103 stars). npm: first published 7 Nov 2018, latest 1.1.2 (2 Aug 2021). Rule source `lib/rules/sort-keys-fix.js` on the default branch.
- **What it says:** "Fork of eslint rule that sorts keys in objects" / "with autofix enabled". "Often it makes sense to enable `sort-keys-fix` only for certain files/directories."
- **How the fix works (source):** for each out-of-order pair it swaps the property with the previous one, carrying the comments before it; it resets at spreads. It doesn't check computed keys or values for side effects.
- **For the post:** the most direct answer to #7714 was a fork, and its own README says to scope it to some files. Weekly downloads are in 1.17.

### 1.8 `eslint-plugin-perfectionist` `sort-objects` (Azat S., v0.6.0, 23 May 2023): "It's safe!". VERIFIED (docs and README at `11429bf5`, releases, npm registry)

- **Citation:** https://perfectionist.dev/rules/sort-objects ; docs source `docs/content/rules/sort-objects.mdx` and README at azat-io/eslint-plugin-perfectionist `11429bf5cfa2a13a82f5fc606be1b63f6652b297`. The rule was introduced in v0.6.0 (GitHub release 23 May 2023); latest 5.12.1 (24 Sep 2026). Repository created 5 May 2023, 2,935 stars.
- **What the README says ("Why"):**
  - "Readability: Finding declarations in a sorted, large list is a little faster." (no source given)
  - "Code Uniformity: When all code looks exactly the same," / "it is very hard to see who wrote it".
  - "Aesthetics": "Take your code to a beauty salon!"
  - "All rules are automatically fixable. It's safe!"
- **What the rule docs say:** "It's **safe**. The rule considers spread elements in objects" / "and does not break component functionality." It asks users to disable `sort-keys` "to avoid conflicts".
- **Options (current docs):** `type` (default `'alphabetical'`, which uses `localeCompare`; also `'natural'`, `'line-length'`, `'custom'`, `'unsorted'`), `ignoreCase` (default `true`), `locales` (default `'en-US'`), `partitionByComment`, `partitionByNewLine`, `partitionByComputedKey`, `groups` and `customGroups`, `useConfigurationIf` (with `callingFunctionNamePattern`, e.g. `'^createSlice$'`), `styledComponents`, and `ignoreCallbackDependenciesPatterns`. Its dependency detection keeps a destructuring default after the bindings it reads: without the option, "`role` and `username` would be sorted before `fullName` as it depends on them."
- **For the post:** the most popular sorting plugin sells sorting as speed, uniformity and looks, and calls itself safe. Its option list reads like a catalogue of the places order matters: comments, blank lines, computed keys, particular functions, dependencies between keys. Its default order (case-insensitive `localeCompare`) also differs from ESLint's (1.4).

### 1.9 TSLint `object-literal-sort-keys`: "Useful in preventing merge conflicts", in `tslint:recommended` for three years, then removed. VERIFIED (source history, PRs, issues, changelog, npm registry)

- **Rationale:** `rationale: "Useful in preventing merge conflicts"`, added with every rule's metadata in PR #1311 (Jason Killian, merged 16 Jun 2016). The rule's `type` is `"maintainability"`. Source: `src/rules/objectLiteralSortKeysRule.ts` (master). Docs: https://palantir.github.io/tslint/rules/object-literal-sort-keys/
- **Recommended:** `"object-literal-sort-keys": true` was in `tslint:recommended` from the first built-in config (PR #1261, 8 Jun 2016) until v6.0.0.
- **Options it grew:** `ignore-case` (#2592, 2017); `match-declaration-order` (PR #2829, Andy Hanson, merged 10 Aug 2017), which "checks that object literals should match the order" / "of property declarations in their contextual type"; blank-line grouping (#3191, 2017); `shorthand-first` (#3607); `match-declaration-order-only` (#3748, 2018); `locale-compare` (#4193, 2018); `ignore-blank-lines` (#4808, 2019).
- **A fixer, declined on semantics:** PR #2634, "WIP: Add fixer for object-literal-sort-keys" (Kaare Hoff Skovgaard, 25 Apr 2017; closed unmerged 1 May 2018). Klaus Meinhardt (`ajafff`): "changing the order of the properties may change the semantics," / "because the initializer can have side effects." with the example `{ b: ++i, a: ++i }`. Meinhardt suggested "to fix only object literals without side effects." It was never finished.
- **The community reaction:** issue #4305, "Relax 'recommended' rules or make them auto-fixable" (Ahmed Ghoneim, 20 Nov 2018): "Sorting your object keys? Why would I want them alphabetic" / "if they made more sense in some other ordering?" and "Furthermore, it's not a fixable rule, it just complains." Josh Goldberg (maintainer): "Strong +1 to this." Eric Anderson's new-project setup turned off `object-literal-sort-keys` first thing. Roberto Wesley Overdijk: "adding it to existing projects is suffering." See also #3772, "Cannot disable object-literal-sort-keys when extending tslint:recommended".
- **Removal:** PR #4871, "Removed annoying formatting rules from recommended ruleset" (Josh Goldberg, merged 7 Oct 2019; fixes #4305), shipped in v6.0.0 (npm, 21 Jan 2020). Changelog: "Removed formatting and whitespace rules from `tslint:recommended` configuration (#4871)".
- **Deprecation:** Roadmap issue #4534 (Adi Dahiya, 23 Feb 2019): "we plan to deprecate TSLint in 2019". The npm deprecation on 6.1.3 reads "TSLint has been deprecated in favor of ESLint."
- **For the post:** TSLint is where preventing merge conflicts became a rule's stated reason, without evidence (section 4 looks for some). Its users pushed the rule out of the recommended set. Its maintainers turned down a fixer because initializers can have side effects, and offered sorting by the declared type's order instead of the alphabet.

### 1.10 Biome `useSortedKeys` (2.0.0, 17 Jun 2025): an assist action, not a lint rule. VERIFIED (source at `7bf97655`, PR, blog, docs, local `biome explain`)

- **Citation:** Sasha (`r1tsuu`), "feat(biome_js_analyze): add useSortedKeys assist rule," biomejs/biome PR #5079, opened 10 Feb 2025, merged 19 Mar 2025. Source: `crates/biome_js_analyze/src/assist/source/use_sorted_keys.rs` at `7bf9765544d4f95b4b63d24b23b641e3e64a1c0c`. Biome 2.0.0 was published on npm on 17 Jun 2025. Docs: https://biomejs.dev/assist/actions/use-sorted-keys/
- **The PR:** spreads and computed keys are "non-sortable": "it will sort all the previous sortable keys up until the nearest non-sortable key". "This prevents breaking the override of certain keys using spread keys." "Source: https://perfectionist.dev/rules/sort-objects". Emanuele Stoppa asked for the JSON action's existing name, `useSortedKeys`, to be reused.
- **Metadata:** `version: "2.0.0"`, `recommended: false`, `fix_kind: FixKind::Safe`, sources `RuleSource::Eslint("sort-keys").inspired()` and `RuleSource::EslintPerfectionist("sort-objects").inspired()`. `biome explain useSortedKeys` (2.5.15): "Fix: safe", "Default severity: info". The diagnostic: "The object properties are not sorted by key."
- **Why an assist, not a rule (v2 release post, 17 Jun 2025):** the import organizer "was neither part of the linter, nor of the formatter." "Assist provides **actions**, which are similar to the _fixes_ in lint rules," / "but without the diagnostics." The assist docs: "Assist actions are not meant to catch bugs or impose a particular coding style." But "it's possible to enforce the use of assist actions even with the CLI", and `biome check` reports an unsorted object as an error (1.16).
- **Order:** natural by default. 2.5.15's `explain`: "uppercase letters come before lowercase letters" with `A` < `a` < `B` < `b`, and numbers by value. Options: `sortOrder` (`natural` or `lexicographic`, PR #6506, Jul 2025) and `groupByNesting` (PR #7799, Dec 2025). There is no case-sensitivity or blank-line option. When a user asked for one to match ESLint (#8981, Feb 2026), Stoppa: "the assist action **is inspired**, which means that we diverged intentionally".
- **For the post:** Biome put sorting outside both the linter and the formatter, marked it safe, and chose an order that disagrees with ESLint's on capitals, underscores and numbers.

### 1.11 Biome on whether sorting is safe: from "must not change the semantics" to "generally safe" (2025). VERIFIED (Wayback copy, discussion, PR, docs)

- **Before:** the pre-release docs (next.biomejs.dev/assist, Wayback capture of 15 Apr 2025): "assist actions must not change the semantics of a program," http://web.archive.org/web/20250415194531/https://next.biomejs.dev/assist/
- **The question:** discussion #5907, "useSortedKeys assist: can assists change the semantics of programs?" (Jonas Wagner, `Sjlver`, 6 May 2025). https://github.com/biomejs/biome/discussions/5907
  - Wagner: "it absolutely changes program semantics." Wagner asked the docs to say "it is _not_ always safe to apply." On `JSON.stringify`: sorting "probably changes all sorts of externally-visible APIs."
  - Emanuele Stoppa (`ematipico`, Biome lead): "relying on the order of the entries of a _static_ object" / "is an edge case," comparable to a co-worker reordering keys. "they **know** that they can't rely on the order of said objects."
  - Stoppa's resolution: remove the "must not change the semantics" line; "Code actions that break code are bugs."; "`useSortedKeys` code action stays safe"; add a paragraph telling people who rely on order to suppress it.
- **After:** PR #6112, "docs: safety of useSortedKeys" (Wagner, merged 4 Sep 2025). The assist page now says "Assist code fixes are generally safe to apply." and "If an assist fix breaks your code, we would consider this a bug". The action's docs: "Object property order is observable." "Sorting can change the results of `Object.getOwnPropertyNames`, `Object.keys`," / "`JSON.stringify`, and `for...in` loops." In 2.5.15's `explain`: "Sorting the keys of an object technically changes the semantics of the" program.
- **For the post:** one project documents that the fix changes what a program does and classifies it as safe in the same place. The reasoning is explicit: if you turned sorting on, you've accepted that order doesn't matter. In a preset, though, someone else turned it on.

### 1.12 Biome's safe fix in practice: comments, blank lines and a property that became a comment (2025–2026). VERIFIED (issues); my check (local run, Biome 2.5.15)

- **Issues:**
  - #6491 (Jun 2025, Biome 2.0.4, closed 27 Jun 2025): in JavaScript "the in-line comment stays at the old position and doesn't move" with its key; in `biome.jsonc`, "the in-line comments gets removed completely". Earlier, #5581 (Apr 2025) on comment order.
  - #5848 (May 2025, open): "useSortedKeys has issues with nested objects".
  - #12057 (JunYoung Lee, `ff1451`, 1 Oct 2026, open, Biome 2.5.15): "the safe fix for useSortedKeys can move one of the properties into the comment." A fix PR (#12306) was opened on 13 Oct 2026.
- **My check (19 Oct 2026, Biome 2.5.15, `scratchpad/sortkeys-lit/lint-check/`):** the #12057 input, `const obj = {\n  c: 1, b: 2, a: 3, // first row\n  d: 4,\n};`, after `biome check --write` with only `useSortedKeys` on, becomes `const obj = {a: 3, // first rowb: 2, …`. `b: 2` is now comment text, and `console.log(obj)` prints `{ a: 3, c: 1, d: 4 }` instead of `{ c: 1, b: 2, a: 3, d: 4 }`. With the formatter on, the result is the same. In the main fixture, a blank line between two groups of keys stayed at its old offset, so the "groups" now split in an arbitrary place (case c17 in 1.16).
- **For the post:** "safe" describes the intent, not the implementation. Two of these bugs delete or move information; one deletes a property.

### 1.13 Oxlint `eslint/sort-keys`: the rule (v0.9.4, Sep 2024) and its fix (v1.19.0, Sep 2025). VERIFIED (source at `oxlint_v1.86.0`, PRs, release tags, `oxlint --rules`); Vendor (VoidZero/Oxc)

- **Rule:** Na'aman Hirschfeld (`Goldziher`), "feat(linter): eslint/sort-keys," oxc-project/oxc PR #4845, opened 12 Aug 2024, merged 11 Sep 2024, "as part of #479" (ESLint parity). First tag containing it: `oxlint_v0.9.4` (12 Sep 2024); the rule's metadata says `version = "0.9.4"`. Moved to the `style` category by PR #6377 (9 Oct 2024).
- **Fix:** Hamir Mahal (`hirehamir`), issue #14224 and PR #14225, "feat(linter): fix for unsorted keys," opened 28 Sep 2025, merged 29 Sep 2025. Copilot's review summary: it "Updates rule classification from `pending` to `conditional_fix`". First release with it: `oxlint_v1.19.0` (29 Sep 2025).
- **Classification (1.86.0):** `style`, `conditional_fix`. In `oxc_macros`, that is `RuleFixMeta::Conditional(FixKind::Fix)`; the rule's docs page shows "An auto-fix is available for this rule for some violations." and "This rule was added in v0.9.4." It is not `dangerous`, so plain `oxlint --fix` applies it. `oxlint --rules --format=json`: `"category": "style"`, `"fix": "conditional_fix"`, `"default": false`.
- **Docs and message:** "sorting property names alphabetically makes it easier" / "to find and/or diff necessary properties at a later time." "Unsorted property keys can make the code harder to read and maintain." The diagnostic is "Object keys should be sorted", with help text of the form Replace `<old>` with `<new>` when a fix exists. https://oxc.rs/docs/guide/usage/linter/rules/eslint/sort-keys.html
- **Options:** the source says "we follow the eslint defaults": `caseSensitive: true`, `natural: false`, `minKeys: 2`, `allowLineSeparatedGroups: false`. There is no `ignoreComputedKeys`.
- **When it won't fix (1.86.0 source, `collect_fixable_properties`):** more than one static group (a spread anywhere but the start or end, or a blank-line group when that option is on); a property without a static name (`[k]`); a comment between properties, unless it's a JSDoc block attached to the property or a same-line `// …` after it (#22052, #22061, May 2026); a comment before the first or after the last property. It doesn't look at values, so values with side effects, getters, `__proto__` and duplicate keys are all reordered.
- **Later changes:** multi-line formatting kept (#16563, Dec 2025); leading and trailing spreads allowed (#18485, Jan 2026); nested objects in one pass (#20838, Mar 2026); comments (#22052, #22061, May 2026); a natural-order comparator ported from ESLint, and a stable sort (#27579, v1.88.0, 13 Oct 2026; see 1.15); computed identifier names checked like ESLint (#27748, v1.89.0, 19 Oct 2026).
- **For the post:** of the three linters, only Oxlint both reports unsorted keys and fixes them in its normal fix pass, and it classes the fix as an ordinary one.

### 1.14 Oxlint's maintainers: sorting "can change runtime behaviour" (2026). VERIFIED (issues); Vendor (VoidZero/Oxc)

- **#19696, "oxfmt: sorted-keys in JS/JSON/JSONC/JSX/TS/TSX"** (24 Feb 2026; closed 26 Feb as a duplicate of the formatter-sorting tracker #13610): https://github.com/oxc-project/oxc/issues/19696
  - Said Atrahouch (`Afsoon`): "Sort keys can be an issue in Typescript.", with a playground of the TypeScript 4.7 `produce`/`consume` example (3.1).
  - Cameron (`camc314`, listed as Core on https://oxc.rs/team): "sorting keys of objects ect is unsafe, and can change runtime behaviour" "which can be undesirable." Cameron pointed the requester to `oxlint --fix` instead.
- **#20873, "`eslint/sort-keys` autofix can move inline comments"** (Amund Eggen Svandal, 30 Mar 2026; closed 1 May 2026): Cameron: "ESLint does not provide a fixer for this rule" / "and there are going to be a ton of edge cases" / "related to any fix we implement." The reporter: "the autofix should err on the side of caution". The reporter then wrote the comment guards (#22052, #22061).
- **#25703, "Support ignoring specific functions in `sort-keys`"** (Renaud Chaput, 15 Aug 2026, open): "key order is important for Typescript type inference". TanStack Router's own order rule has an autofix, "which unfortunately is applied _before_ the `sort-key` autofix". A second example is Redux Toolkit's `configureStore`, where moving `enhancers` and `middleware` above `reducer` breaks inference.
- **For the post:** the maintainers say in public that sorting can change behaviour, and the fix still ships as a normal fix. That's a defensible choice for a rule people opt into; it's a different thing in a preset that turns it on for you.

### 1.15 Oxlint's fix in practice: syntax, comments, and a duplicate key that changed value (2026). VERIFIED (issues, PR); my check (local run, Oxlint 1.86.0)

- **Issues:**
  - #20830 (Oxlint 1.57.0, 28 Mar 2026): "`eslint/sort-keys` autofix results in broken output syntax", on shadcn/ui's Sidebar `cva` call. Closed 2 May 2026 with a regression test ("I suspect a PR (not sure which) has fixed this").
  - #20873 (1.57.0): a same-line comment left behind on another property (1.14).
  - #27704 (`briksdaal`, 14 Oct 2026, Oxlint 1.88.0, open): "the trailing comma ends up inside the comment", so `// note` becomes `// note,`. Real case: ajv 8.20.0, `dist/compile/errors.js`.
  - #27579 (Dunqing, merged 13 Oct 2026, v1.88.0): "it no longer swaps duplicate keys in objects with more than 20 properties," / "which changed which value wins." Also "Its comparator was also not a total order", so the fix "could panic". The PR says "Implemented with AI assistance." and links a Claude Code session.
- **My check (19 Oct 2026, Oxlint 1.86.0, the version in this repo, `scratchpad/sortkeys-lit/lint-check/`; config: only `sort-keys`):**
  - **A duplicate key changed value.** `{ n: 0, b: 1, g: 2, …, b: 7, …, m: 21 }` (22 properties): the fix produced `{ a: 18, b: 7, b: 1, … }`, so `obj.b` went from 7 to 1. Fixed in 1.88.0 by the stable sort. (Ultracite's core also has `no-dupe-keys` on, which reports the duplicate.)
  - **Three properties became a comment.** `const obj = {\n  c: 1, b: 2, a: 3, // first row\n  d: 4,\n};` became `const obj = {\n  a: 3, // first row b: 2, c: 1, d: 4,\n};`, so `console.log(obj)` prints `{ a: 3 }`. Running `oxfmt` afterwards (as `ultracite fix` does) doesn't change that. I found no Oxlint issue for this case (search of issues mentioning `sort-keys`, 19 Oct 2026); #27704 is the nearest.
  - **The #27704 comma**, reproduced: `zeta: 1, // about zeta` became `zeta: 1, // about zeta,`.
  - Evaluation order: `{ b: log("b"), a: log("a") }` became `{ a: log("a"), b: log("b") }`, so the calls run in the other order.
- **For the post:** most behaviour changes the fix has caused were implementation bugs, not sorting as such. But they ship in the normal `--fix` pass, which Ultracite runs on every `ultracite fix`, before the formatter and before any agent.

### 1.16 My check: three linters, one fixture, three "alphabetical" orders (19 Oct 2026). VERIFIED (local run); re-run with the `research/` harness before quoting

- **Setup:** `scratchpad/sortkeys-lit/lint-check/fixture/cases.js` (20 objects), run with this repo's binaries: ESLint 10.12.0 (`--no-config-lookup --rule 'sort-keys: error'`), Oxlint 1.86.0 (only `sort-keys`), Biome 2.5.15 (only the `useSortedKeys` assist; linter and formatter off). Each rule at its defaults, which is how Ultracite configures them. `fixture/run.mjs` imports a file and prints `Object.keys`, `JSON.stringify` and the call order for every case; outputs and diffs are in `lint-check/out/`.
- **Where the orders disagree:**

| Case | Source | ESLint and Oxlint want | Biome writes |
| --- | --- | --- | --- |
| c01 capitals | `{ b, B, a, A }` | `A, B, a, b` | `A, a, B, b` |
| c02 symbols | `{ id, _id, $id, Id }` | `$id, Id, _id, id` | `_id, $id, Id, id` |
| c03 | `{ errors, errorType }` | `errorType, errors` | unchanged (accepted) |
| c04 integer keys | `{ 1, 10, 2 }` | unchanged (accepted) | `1, 2, 10` |
| c05 numbered | `{ item10, item2, item1 }` | `item1, item10, item2` | `item1, item2, item10` |
| c19 accents | `{ "é", e, f, "Z" }` | `"Z", e, f, "é"` | `e, f, "Z", "é"` |

- ESLint reports 7 errors on Biome's output; Oxlint reports 7 on Biome's output; Biome flags 7 objects in Oxlint's output. A file sorted by one fails the others.
- **What each fix changed at runtime** (before and after, compared by `run.mjs`):
  - Both: key order in `Object.keys` and `JSON.stringify` for every reordered object; the Vite-shaped message `JSON.stringify({ type, event, data })` now starts with `"data"`; the call order of `{ b: log("b"), a: log("a") }`.
  - Neither: integer-like keys (`{ 1, 10, 2 }`) iterate in numeric order whatever the source order, so Biome's reordering of c04 changed nothing observable.
  - Oxlint only: the 22-key duplicate (`b` 7 → 1) and the trailing comma moved into a comment (1.15).
  - Both, differently: the #12057 input, where Biome turned one property into comment text and Oxlint three (1.12, 1.15).
  - Spreads in the middle (`{ b, ...rest, a }`) were left alone by all three; a spread at the start (`{ ...rest, b, a }`) was sorted by both fixers, which is safe for which value wins.
  - `__proto__` (`{ b: 1, __proto__: proto, a: 2 }`): ESLint wants it first (`'__proto__' should be before 'b'`); both fixers moved it, and the prototype was still set.
  - `[k]` with `const k = "dynamic"`: ESLint checks it as the name `k` ("'a' should be before 'k'"); Oxlint 1.86.0 reports the object but won't fix it; Biome treats it as a boundary.
- **Messages an agent would see:** ESLint "Expected object keys to be in ascending order. 'B' should be before 'b'"; Oxlint "Object keys should be sorted" (with help text showing the replacement when it can fix); Biome "The object properties are not sorted by key."
- **For the post:** the three implementations of "sort the keys" produce three orders, and each fixer changed observable behaviour on hand-written code in ways the docs don't mention (1.12, 1.15). Only the TypeScript cases (3.x) need a library to show the effect.

### 1.17 What popular configs set for `sort-keys` (Oct 2026). VERIFIED (config source at pinned SHAs)

Every config's line was read at the commit given; weekly downloads are from the npm API for 12–18 Oct 2026 (1.18). Files are in `scratchpad/sortkeys-lit/D/src/`.

| Config (version, SHA) | `sort-keys` | Other key-ordering rule | Link |
| --- | --- | --- | --- |
| eslint-config-airbnb-base 15.0.0 (`366bfa66`; HEAD `8ed19247`) | `'off'`, with options `'asc', { caseSensitive: false, natural: true }` | none; `sort-vars: 'off'` | [style.js](https://github.com/airbnb/javascript/blob/8ed19247bef145e3cc41b24a02dd1fe6d9b5e681/packages/eslint-config-airbnb-base/rules/style.js#L473-L477) |
| eslint-config-standard 17.1.0 (`7d01bbc3`), neostandard 0.14.1 (`2d12a3e6`) | not set | none | [.eslintrc.json](https://github.com/standard/eslint-config-standard/blob/7d01bbc373bf3bb7374b698323032077ad05f6b1/.eslintrc.json) |
| eslint-config-xo 6.0.1 (`07dd6d03`) | not set (absent from 208 configured rules) | `@typescript-eslint/member-ordering: 'off'` | [typescript-rules.js](https://github.com/xojs/eslint-config-xo/blob/07dd6d038318dc582c9450f4203416c2ea8d06f5/source/typescript-rules.js#L269) |
| eslint-config-google 0.14.0 (`a6f6bdbc`, archived) | commented out: `// 'sort-keys': 0,` | none | [index.js](https://github.com/google/eslint-config-google/blob/a6f6bdbc88eedf0a213b91fa3601573a74f53c46/index.js#L299) |
| typescript-eslint 8.72.0 (`594fe286`) `all` / `strict` / `stylistic` | n/a | `member-ordering: 'error'` in `all` only; default order `as-written` | [all.ts](https://github.com/typescript-eslint/typescript-eslint/blob/594fe286ec518c6899a9b89141cf3220bcfb9f72/packages/eslint-plugin/src/configs/flat/all.ts#L53) |
| eslint-config-love 158.0.0 (`fc9a5b5f`) | listed in `_intentionally-unused-rules.ts`, under `"too much"` | `member-ordering` also unused | [_intentionally-unused-rules.ts](https://github.com/mightyiam/eslint-config-love/blob/fc9a5b5fe7b971d7807ea1f6669b71d2707a0f71/src/test/_intentionally-unused-rules.ts#L23-L61) |
| @antfu/eslint-config 9.5.1 (`df4d896e`) | not set | perfectionist for imports and exports only; `jsonc/sort-keys` on package.json and tsconfig; opt-in `/// keep-sorted` comment | [perfectionist.ts](https://github.com/antfu/eslint-config/blob/df4d896ed9b493ca0562fdf2c8c0fcd92fd16f6e/src/configs/perfectionist.ts#L22-L42) |
| eslint-config-canonical 47.4.2 (`f1d00da8`) | `0` | perfectionist `recommended-natural` (includes `sort-objects` and `sort-maps`), `sort-vars: 2`, `jsonc/sort-keys`, `yml/sort-keys` | [canonical.ts](https://github.com/gajus/eslint-config-canonical/blob/f1d00da81b95289da4f5360e77fdf020815c656b/configurations/canonical.ts#L25) |
| @vercel/style-guide 6.0.0 (`1377fa3b`, archived) | not set | `import/order` only | [eslint/rules](https://github.com/vercel/style-guide/tree/1377fa3bedafe60954d20f80a455e3a0597bb354/eslint/rules) |
| eslint-config-next 16.5.0-canary.19 (`21282429`) | not set | none | [src/index.ts](https://github.com/vercel/next.js/blob/21282429ff5c437ee863365c058f7c9a4aff1f10/packages/eslint-config-next/src/index.ts) |
| @rushstack/eslint-config 4.9.0 (`00ec85b6`) | not set | `member-ordering` with `default: 'never'` | [_common.ts](https://github.com/microsoft/rushstack/blob/00ec85b6834fc0918ab0870d3c71c2e728a9a8c3/eslint/eslint-config/src/flat/profile/_common.ts#L343-L358) |
| @shopify/eslint-plugin 50.0.0 (`6a9bca4e`) | `'off'` | `react/jsx-sort-props: 'off'`; `sort-class-members` on | [core.js](https://github.com/Shopify/web-configs/blob/6a9bca4e0474fee9f3af4000ee4615dbcf37ba6c/packages/eslint-plugin/lib/config/core.js#L415-L418) |
| `@eslint/js` recommended, and ESLint's own `eslint-config-eslint` (`449724e9`) | absent from both | none | [eslint-recommended.js](https://github.com/eslint/eslint/blob/449724e95bfa013fa32c29375925b4111d3924e4/packages/js/src/configs/eslint-recommended.js) |

- **The reasons given, where there are any:**
  - **Airbnb** sets the rule off, and its README's only key-order rule is about meaning, not the alphabet: "Group your shorthand properties at the beginning of your object declaration." because "It’s easier to tell which properties are using the shorthand."
  - **eslint-config-love**, a maximal config, files `sort-keys`, `sort-vars` and `member-ordering` under `// ## "too much"`.
  - **Rushstack (Microsoft):** "We do NOT enforce sorting based on public/protected/private" because "reordering methods produces spurious diffs that make PRs hard to read." It concedes "alphabetization is probably a more useful secondary ordering."
  - **typescript-eslint's `member-ordering`:** its `order` "defaults to `as-written`, meaning any order is fine." "If you want to sort them alphabetically, you have to provide a custom configuration." It is feature-frozen because "Stylistic rules that enforce naming and/or sorting conventions tend to grow incomprehensibly complex" (#8792), and it has no fix.
  - **@antfu/eslint-config** sorts an object only when you mark it: "`/// keep-sorted` - sorts an object/array/interface", "an on-demand micro-codemod tool that triggers by specific comments".
  - **Google:** the JS style guide's §5.3 on object literals has no ordering rule, and §9.2 says "There is no "hard and fast" rule governing how to order" class members (styleguide `c4286554`). Google's JSON style guide does have one, and it's semantic: "Properties can be in any order within the JSON object." but "`kind` should be the first property." and "`items` should be the last property in the `data` object." (`jsoncguide.md` at `c4286554`). Alphabetical order would put `items` before `kind`.
- **For the post:** none of the widely used configs turns on core `sort-keys`. The two that sort object keys at all do it through perfectionist (canonical) or on request (antfu). Ultracite is the outlier. Don't list which configs enable what in the post; say that most widely used configs leave it off, and link a few.

### 1.18 Weekly npm downloads, 12–18 Oct 2026. VERIFIED (public npm API, no login)

- **Source:** `https://api.npmjs.org/downloads/point/last-week/<pkg>`, fetched 19 Oct 2026; raw responses in `scratchpad/sortkeys-lit/D/src/npm_downloads_last-week.jsonl`.

| Package | Weekly downloads |
| --- | --- |
| eslint-plugin-perfectionist | 1,899,799 |
| eslint-plugin-sort-keys-fix | 252,350 (last release 2 Aug 2021) |
| eslint-plugin-typescript-sort-keys | 231,954 |
| eslint-plugin-sort-destructure-keys | 123,916 |
| eslint-plugin-sort-keys | 13,278 |
| eslint-plugin-jsonc / eslint-plugin-yml | 829,724 / 739,320 |
| prettier-plugin-sort-json | 195,279 |
| sort-package-json | 1,790,701 |
| json-stable-stringify | 7,834,845 |
| fast-json-stable-stringify | 96,765,172 |
| safe-stable-stringify | 39,124,413 |
| canonicalize | 3,023,346 |
| eslint-config-airbnb-base / eslint-config-standard / eslint-config-love | 3,004,839 / 1,335,399 / 67,105 |
| eslint / prettier / oxlint / @biomejs/biome | 96,121,047 / 81,594,759 / 16,177,823 / 10,976,814 |

- **Caveat:** download counts include transitive installs and CI. The stable-stringify packages are mostly pulled in by other packages (not checked which), so don't present them as people choosing them.
- **For the post:** sort-at-serialisation libraries are installed far more often than key-sorting lint plugins, but that says more about dependency trees than about preferences.

### 1.19 Prettier: sorting object keys is out of scope because it's "potentially unsafe" (2017–2018). VERIFIED (docs at `0f54c1fe`, issue)

- **Citation:** Prettier, "Rationale," `docs/rationale.md` at `0f54c1feeaff94fc8d212ed31bcff0bd13a946dd` (https://prettier.io/docs/rationale), section "What Prettier is not concerned about" (the sorting bullet added in PR #5417, 9 Nov 2018). Issue prettier/prettier#1096, comment by Christopher Chedeau (`vjeux`), 2 Apr 2017.
- **What it says:** Prettier "does not transform it." Out of scope: "Sorting/moving imports, object keys, class members, JSX keys, CSS properties or anything else." The reason: "sorting is potentially unsafe because of side effects (for imports, as an example)". Its first requirement is to "output valid code that has the exact same behavior as before formatting". On #1096: "This is currently out of scope for this project as is".
- **For the post:** the formatter most JavaScript projects use refuses to sort keys on correctness grounds. Biome's and Oxlint's sorting live outside their formatters too (1.10, 1.14).

### 1.20 Go: maps are unordered on purpose, sorting happens in the encoder, and no linter sorts literal keys. VERIFIED (spec, release notes, source)

- **Spec and history:** "The iteration order over maps is not specified" (Go spec, `doc/go_spec.html` at `ba2e53f8`). The Go 1 release notes made it "unpredictable, even if the same loop is run multiple times" because "code that depends on iteration order is very likely to break early", and "This is one change where tools cannot help." (`golang/website` `_content/doc/go1.md`). "Go maps in action" (2013): "If you require a stable iteration order you must maintain a separate data structure". Go 1.12: "Maps are now printed in key-sorted order to ease testing."
- **Encoder:** `encoding/json` v1: "The map keys are sorted and used as JSON object keys". v2 (behind `goexperiment.jsonv2`): "In contrast, in v2 a Go map is marshaled in a non-deterministic order." unless the `Deterministic` option is set.
- **Order of evaluation:** calls in operands "are evaluated in lexical left-to-right order." So reordering keyed struct fields with call initialisers would change evaluation order in Go too.
- **Linters:** `fieldalignment` (x/tools `5fe18dca`) finds "structs that would use less memory if their fields were sorted", offers "Rearrange fields" (which drops comments: `// TODO: Preserve comment, for now get rid of them.`), warns "the most compact order is not always the most efficient", and is "not included in typical suites such as vet or gopls." golangci-lint's `funcorder` (methods) and `tagalign` (struct tags) sort other things; none sorts map or struct literal keys (reference config at `12f52bdb`).
- **For the post:** Go made map order meaningless, so there's nothing for a sorter to tidy, and it sorts when encoding. JavaScript made order meaningful, which is what makes a source sorter risky.

### 1.21 Rust: rustfmt sorts imports and modules, Clippy's field-order lint only auto-fixes when nothing moves. VERIFIED (config docs, source)

- **rustfmt** (1.11.0, `Configurations.md` at `46dba849`): "Reorder import and extern crate statements alphabetically in groups" and "Reorder `mod` declarations alphabetically in group." Both default to true; `#[macro_export]` mods "will not be reordered since that could change the semantics". No option touches struct literal fields.
- **Clippy `inconsistent_struct_constructor`** (pedantic, since 1.52.0; source at `3583eb8a`): "Checks for struct constructors where the order of the field" init differs from the definition. Its premise: "Since the order of fields in a constructor doesn't affect the" result. The fix is `MachineApplicable` only when every field is shorthand (`fields.iter().all(|f| f.is_shorthand)`). Otherwise it is `MaybeIncorrect`, behind an opt-in setting that defaults to `false`, with the hint "if the field evaluation order doesn't matter, try". The lint docs: "it can change semantics if the initializer expressions have side effects."
- **serde_json:** "By default the map is backed by a [`BTreeMap`]." (so output is sorted); the `preserve_order` feature "maintains insertion order."
- **For the post:** Clippy is the closest analogue to an autofixing `sort-keys`, and it is more careful. It targets the definition's order rather than the alphabet, and it applies the fix automatically only when no expression moves.

### 1.22 Python: dicts keep insertion order, formatters don't sort them, and Ruff sorts only `__all__` and `__slots__`. VERIFIED (docs, source)

- **Order guaranteed:** Python 3.7: "the insertion-order preservation nature of dict objects has been declared" / "to be an official part of the Python language spec." (What's New in 3.7). It was "an implementation detail of CPython from 3.6."
- **Formatters:** Black checks the "reformatted code still produces a valid AST that is effectively equivalent to the" original (README at `56a7ee68`), which rules out reordering keys. "Currently, the Ruff formatter does not sort imports." (`docs/formatter.md` at `3e3f22dc`).
- **Ruff RUF022 and RUF023** (stable since 0.8.0; source at `3e3f22dc`): the `__all__` fix "is marked as unsafe if there are any comments" on their own lines; otherwise "it should very rarely alter the semantics of any Python code." But `__all__` "could be read by code elsewhere that depends on the exact" order. The `__slots__` fix is unsafe when the file reads `__slots__` and it isn't a set, because "the order of the items in `__slots__` may have semantic significance".
- **A dict-key sorter exists:** `flake8-sorted-keys` 0.2.0 (2017), "check keys are sorted in dict literals"; 540 downloads in the last week (pypistats, fetched 20 Oct 2026 UTC).
- **`json.dumps(sort_keys=True)`:** see 1.25.
- **For the post:** Python made the same choice as JavaScript (dicts keep insertion order). Its tools respond by not sorting dicts at all, and by grading the fix's safety on whether anything reads the order.

### 1.23 Java and Kotlin: member order by kind, never alphabetical. VERIFIED (source, docs)

- **Checkstyle `DeclarationOrder`** orders by kind and visibility, not name, and skips fields with forward references (`DeclarationOrderCheck.java` at `fc40e24b`). **google-java-format** sorts only imports (`--skip-sorting-imports`; README at `ee81376a`). **detekt `ClassOrdering`** follows the Kotlin conventions.
- **Kotlin coding conventions** (`kotlin-web-site` at `9eb96a51`): "Do not sort the method declarations alphabetically or by visibility". "Instead, put related stuff together" so a reader can "follow the logic of what's happening."
- **For the post:** the JVM style guides explicitly reject alphabetical member order in favour of grouping by meaning. Compare the HCI evidence in section 4.

### 1.24 JSON, YAML and TOML sorters, and package managers. VERIFIED (READMEs, docs, source)

- **eslint-plugin-jsonc / eslint-plugin-yml `sort-keys`** (3.4.2 / 3.9.0): both fixable; jsonc "verifies that all properties are sorted alphabetically or specified order." and notes "ESLint limits the number of fixes to 10 per run."; yml sorts "without moving an alias before its anchor."
- **prettier-plugin-sort-json** (4.2.0): "will sort JSON files alphanumerically by key." "By default, top-level object entries are sorted by key lexically".
- **sort-package-json** (4.1.0, `47692f6b`): "It sorts using the well-known keys of a package.json." "Almost everyone would agree having "name" at the top of a package.json is sensible". Unknown keys: "The default key sort order is alphabetical." In `exports` it only moves the `default` condition to the bottom and keeps the others in order, and it skips sorting `scripts` when npm-run-all sequential globs are present.
- **npm-run-all2 `run-s`** (`3187556a`): with globs, "matched scripts are run in the order they are defined in `package.json`." and "Some tools (formatters, sorters) may rewrite `package.json` with scripts sorted alphabetically."
- **Taplo (TOML):** `reorder_keys`, "Alphabetically reorder keys that are not separated by blank lines.", default `false`.
- **Package managers:** npm's `@npmcli/package-json` sorts dependency maps (`// sort alphabetically all types of deps for a given package`, `localeCompare(b, 'en')`); Yarn Berry uses `sortDescriptors`. pnpm: not confirmed.
- **For the post:** the most-used JSON key sorter is careful exactly where order is behaviour (`exports`, sequential scripts). Package managers sort only maps whose order means nothing (dependency lists).

### 1.25 Sorting at serialisation instead of in source. VERIFIED (docs, READMEs, RFC, source)

- **Python `json.dumps(sort_keys=True)`** (since 2.6, released 1 Oct 2008): "If True, dictionaries will be outputted sorted by key." Its stated use: "this is useful for regression tests to ensure that" / "JSON serializations can be compared on a day-to-day basis." (The 2.6 docs call `True` the default; the 2.6 source has `sort_keys=False`.)
- **jq `--sort-keys` / `-S`** (from the v1.4 manual): "Output the fields of each object with the keys in sorted order." On `keys`: sorted order "is not an order that makes particular sense in" any language, but "you can count on it being the same for any two objects" with the same keys.
- **json-stable-stringify / fast-json-stable-stringify / safe-stable-stringify:** "deterministic version of `JSON.stringify()` so you can get a consistent hash from stringified results"; "Deterministic `JSON.stringify()` - a faster version of" the original; "_Object keys_ are sorted instead of using the insertion order (configurable)."
- **RFC 8785, "JSON Canonicalization Scheme (JCS)"** (A. Rundgren, B. Jordan, S. Erdtman, June 2020; Independent Submission, "Category: Informational"): https://www.rfc-editor.org/rfc/rfc8785. "JSON object properties MUST be sorted recursively"; "array element order MUST NOT be changed."; names are compared as "UTF-16 [UNICODE] code units." "independent of locale settings." Motivation: hashing and signing "need the data to be" invariant.
- **`JSON.stringify` with a replacer array:** MDN: "As an array, its elements indicate the names of the properties" to include; ECMA-262 serialises them in the array's order. In Node 24.14.1, `JSON.stringify({b:1,a:2},["a","b"])` gave `{"a":2,"b":1}`, but the list also drops nested keys that aren't in it.
- **ESLint itself sorts at write time:** PR #19711, "fix: sort keys in eslint-suppressions.json to avoid git churn" (Ron Waldon-Howe, `jokeyrhyme`, merged 8 May 2025): unsorted output "can cause unnecessary `git` churn and even `git` conflicts" when several contributors regenerate the file. It sorts "just prior to writing the JSON file" with `json-stable-stringify-without-jsonify`.
- **TanStack Query** hashes query keys with sorted object keys, so "no matter the order of keys in objects" equal keys match (3.9).
- **For the post:** when byte-identical output matters (hashes, signatures, snapshots, generated files), the established answer is to sort where the data leaves the program, not to reorder every literal in the source. ESLint did exactly that for its own generated file, citing merge conflicts.

### 1.26 The neighbouring rules: imports, JSX props, variables, destructuring. VERIFIED (docs, source, issues)

- **`sort-imports` (ESLint):** "This rule is purely a matter of style." Its fix sorts members on one line, "but multiple lines are not reordered." Teddy Katz on #11542 (23 Mar 2019), which is the issue Ultracite's ESLint preset cites next to `"sort-imports": "off"`: "I don't think it would be safe for `sort-imports` to autofix code" / "because it could change the evaluation order of the imported modules". (#11542 is about imports, not keys.)
- **eslint-plugin-import `order`:** "Unbound imports are assumed to have side effects, and will never be moved/reordered."
- **Biome `organizeImports`:** "The action does not reorder bare imports by default." "Changing the order of bare imports can change program behavior". perfectionist: "By default, sorting side-effect imports is disabled for security reasons."
- **`react/jsx-sort-props`** (7.37.5): "Some developers prefer to sort props names alphabetically". Fixable; "A spread attribute resets the verification." Options `callbacksLast`, `reservedFirst`.
- **`sort-vars` (ESLint):** fixable, but its fixer gives up unless every initialiser is `null` or a literal (`decl.init !== null && decl.init.type !== "Literal"`), and the docs call it "a formatting preference".
- **eslint-plugin-sort-destructure-keys** 1.5.0: "Allow sorting properties with defaults when the default doesn't reference other properties".
- **For the post:** the import sorters learned years ago that some entries can't move (side-effect imports), and `sort-vars` won't move anything but literals. Object-key fixers in Oxlint and Biome have no equivalent check for values with side effects.

---

## 2. What JavaScript says about property order

Items 2.1–2.4 trace the order guarantees through the editions of ECMA-262; 2.5–2.8 cover how an object literal is evaluated, which decides what a reordering can change; 2.9–2.10 cover JSON; 2.11–2.13 cover engines. The spec editions were read from the archived HTML at https://262.ecma-international.org/ (5.1, 6.0, 9.0, 10.0, 11.0), converted to text in `scratchpad/sortkeys-lit/main/spec/`.

### 2.1 ES5.1 (2011): enumeration order "is not specified". VERIFIED

- **Citation:** ECMA-262 5.1 Edition, June 2011, §12.6.4 (The for-in Statement) and §15.2.3.14 (Object.keys). https://262.ecma-international.org/5.1/
- **What it says:** "The mechanics and order of enumerating the properties" (of `for-in`) "is not" / "specified." For `Object.keys`: "If an implementation defines a specific order of enumeration" / "for the for-in statement, that same enumeration order must" / "be used". In strict mode an object literal with two data properties of the same name was a SyntaxError ("This production is contained in strict code and IsDataDescriptor(previous) is true").
- **For the post:** before 2015, code that depended on key order relied on engines agreeing, not on the language.

### 2.2 ES2015: `[[OwnPropertyKeys]]` defines an order, but `Object.keys` and `JSON.stringify` are still tied to `for-in`. VERIFIED

- **Citation:** ECMA-262 6th Edition (ES2015), §9.1.12 `[[OwnPropertyKeys]]`, §7.3.21 `EnumerableOwnNames`, §9.1.11 `[[Enumerate]]`, Annex E. https://262.ecma-international.org/6.0/
- **What it says:**
  - `[[OwnPropertyKeys]]`: integer indices "in ascending" / "numeric index order", then each string key that is not an integer index "in property creation order", then symbols "in property creation order".
  - `EnumerableOwnNames` (used by `Object.keys` and `JSON.stringify`) then says: "Order the elements of names so they are in the same relative order" / "as would be produced by the Iterator" of `[[Enumerate]]`, and for `[[Enumerate]]` "The mechanics and order of enumerating the" / "properties is not specified".
  - Annex E: "In ECMAScript 2015, it is no longer an early" / "error to have duplicate property names in Object Initializers."
- **What used which order** (from the for-in proposal's README, 2.4): `Reflect.ownKeys`, `Object.getOwnPropertyNames`, `Object.assign`, `Object.defineProperties` and `Object.getOwnPropertyDescriptors` use `[[OwnPropertyKeys]]` directly; `Object.keys`, `Object.values`, `Object.entries`, `JSON.parse` and `JSON.stringify` used the `for-in` order.
- **For the post:** the claim that the order has been defined since ES2015, made in ESLint's 2018 thread (1.6), is only half right. It was fully defined in ES2020.

### 2.3 ES2019: "array index" instead of "integer index". VERIFIED

- **Citation:** Mathias Bynens, "Normative: Use array indices instead of integer indices in OrdinaryOwnPropertyKeys," tc39/ecma262 PR #1242, opened 21 Jun 2018, merged 24 Oct 2018. https://github.com/tc39/ecma262/pull/1242. In the ES2019 text (10.0) the step reads "that is an array index, in ascending numeric index order".
- **What it says:** "All major JavaScript engines agree on the following behavior", shown with `Reflect.ownKeys({ a: 1, [Number.MAX_SAFE_INTEGER]: 1, 42: 1, [2**32-1]: 1, [2**32-2]: 1 })` giving `42,4294967294,a,9007199254740991,4294967295` in Chakra, V8, JavaScriptCore and SpiderMonkey. "This patch makes the spec for `OrdinaryOwnPropertyKeys` match Web reality."
- **For the post:** keys that look like array indices (up to 2³² − 2) always come first in ascending numeric order, whatever the source order. Sorting them in source changes nothing observable except evaluation order (my check, 1.16 case c04). Larger numeric keys behave like strings.

### 2.4 ES2020: `for-in` order specified (Kevin Gibbons), and `Object.keys` and `JSON.stringify` follow `[[OwnPropertyKeys]]`. VERIFIED

- **Citation:** Kevin Gibbons (`bakkot`), "Normative: specify for-in enumeration order in more cases," tc39/ecma262 PR #1791 (23 Nov 2019; merged 3 Jan 2020), implementing the stage 4 proposal tc39/proposal-for-in-order ("Partially specifying object enumeration order in JavaScript", created 12 Sep 2018). And "Normative: make EnumerableOwnPropertyNames ordered," PR #1793 (23 Nov 2019; merged 12 Dec 2019). The ES2020 text (11.0) no longer has the "Order the elements" step in `EnumerableOwnPropertyNames`. https://github.com/tc39/proposal-for-in-order
- **What it says:**
  - Proposal README: ECMA-262 "leaves the order of `for (a in b) ...`" "almost totally unspecified", but "real engines tend to be consistent in at least some cases". "Historical efforts to get consensus on a complete specification" of the order "have repeatedly failed". "There are a variety of APIs which make a property enumeration order observable."
  - The new rule holds unless an object or its prototype chain is a Proxy, typed array, module namespace or host exotic object, or properties are added, deleted or change enumerability during iteration.
  - PR #1793: removing the step "has the effect of requiring those to be ordered the same way as `Reflect.ownKeys`" (`Object.keys`, `Object.values`, `Object.entries`, `JSON.parse`, `JSON.stringify`). Gibbons found no implementation that ordered them differently.
  - Biome's 2.5.15 `explain` gets this right: "Since ES2020, operations like `for-in`" / "loops, `Object.keys`, and `JSON.stringify` are guaranteed to process" string keys in insertion order.
- **For the post:** since ES2020 the language guarantees what engines already did: for ordinary objects, string keys come out in the order they were created, and an object literal creates them in source order (2.5). Sorting the literal sorts the output.

### 2.5 Object literals are evaluated in source order, key then value. VERIFIED

- **Citation:** ECMA-262 11th Edition (ES2020), §12.2.6.8 Runtime Semantics: PropertyDefinitionEvaluation; §14.3.8 for getters and setters. https://262.ecma-international.org/11.0/
- **What it says:** `PropertyDefinitionList : PropertyDefinitionList , PropertyDefinition`: "Perform ? PropertyDefinitionEvaluation of PropertyDefinitionList" first, then "Return the result of performing PropertyDefinitionEvaluation of PropertyDefinition". For `PropertyName : AssignmentExpression`: "Let propKey be the result of evaluating PropertyName.", then the value is evaluated, then `CreateDataPropertyOrThrow`. Getters and setters are defined in the same pass with `DefinePropertyOrThrow`.
- **What follows:** moving a property moves three things: when its computed key is evaluated, when its value is evaluated, and where it lands in the key order. If a key or value calls a function, reads a variable another initialiser changes (`++i`, 1.9), or throws, the sorted literal does those in a different order. My check: `{ b: log("b"), a: log("a") }` logged `b, a` before and `a, b` after both fixers (1.16).
- **For the post:** a reorder is only safe if every key and value is free of side effects and nothing reads the order. A linter can check the first; it can't check the second.

### 2.6 Duplicate keys: the last one wins. VERIFIED

- **Citation:** ES5.1 §11.1.5 (strict-mode SyntaxError); ES2015 Annex E (no longer an error); ES2015 §24.3.1 `JSON.parse`.
- **What it says:** since ES2015 duplicates are allowed and each later `CreateDataPropertyOrThrow` overwrites the value (the key keeps its first position). For `JSON.parse`: "In the case where there are duplicate name Strings within an object, lexically preceding" / "values for the same key shall be overwritten."
- **What follows:** a sort must be stable, or it can swap which duplicate is last. Oxlint's fix wasn't stable for objects over 20 properties until 1.88.0, and in my check it changed a value (1.15). ESLint's `no-dupe-keys`, on in `eslint:recommended` and in Ultracite, reports duplicates anyway.

### 2.7 `__proto__: value` is not a property. VERIFIED

- **Citation:** ES2020 Annex B.3.1, "`__proto__` Property Names in Object Initializers".
- **What it says:** if the key is the string `"__proto__"` and not computed, `isProtoSetter` is true and the value becomes the object's prototype instead of an own property. "It is a Syntax Error if PropertyNameList of PropertyDefinitionList" / "contains any duplicate entries for" `"__proto__"` (from non-computed `name: value` forms).
- **What follows:** sorting moves `__proto__` (ESLint wants it first: `'__proto__' should be before 'b'`). The prototype is still set, and in my check nothing observable changed except evaluation order (1.16). A computed `["__proto__"]` is an ordinary own property, so linters that treat it as the same key as `__proto__` would be wrong; not tested.

### 2.8 Spreads: position decides which value wins. VERIFIED

- **Citation:** ES2020 §12.2.6.8, `PropertyDefinition : ... AssignmentExpression`: "Return ? CopyDataProperties(object, fromValue, excludedNames)."
- **What it says:** a spread copies the source's own enumerable properties (in `[[OwnPropertyKeys]]` order) onto the object at that point in the evaluation, so later definitions overwrite earlier ones in both directions: `{ ...defaults, a: 1 }` and `{ a: 1, ...defaults }` differ when `defaults.a` exists.
- **What the linters do:** ESLint resets its comparison at a spread; Biome treats spreads and computed keys as boundaries and sorts each side; Oxlint fixes only when spreads are at the start or end (1.4, 1.10, 1.13). Jordan Harband's 2018 rule: a fix "_must not_ move anything across a spread boundary" (1.6).
- **For the post:** all three linters handle the case people think of first. The cases they don't handle are values with effects, serialised output and types.

### 2.9 RFC 8259 (JSON, 2017): "an unordered collection", but parsers can show the order. VERIFIED

- **Citation:** T. Bray (ed.), "The JavaScript Object Notation (JSON) Data Interchange Format," RFC 8259 / STD 90, December 2017, Standards Track. https://www.rfc-editor.org/rfc/rfc8259
- **What it says:** "An object is an unordered collection of zero or more name/value" pairs. "The names within an object SHOULD be unique." With duplicates, "Many implementations report the last name/value pair" only. "JSON parsing libraries have been observed to differ as to whether or" / "not they make the ordering of object members visible to calling" / "software." "Implementations whose behavior does not depend on member" / "ordering will be interoperable".
- **For the post:** by the standard, a consumer that cares about key order isn't interoperable. In practice JavaScript's parser does make order visible (2.4), and many consumers compare bytes: snapshots, hashes, signatures, caches (3.x, 6.4).

### 2.10 ECMA-404 (2nd edition, December 2017): "does not assign any significance to the ordering". VERIFIED

- **Citation:** Ecma International, ECMA-404 "The JSON Data Interchange Syntax," 2nd edition, December 2017, §6 Objects. https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf
- **What it says:** the syntax "does not require that name strings be unique, and does not assign any" / "significance to the ordering of name/value pairs." "These are all semantic considerations that may be defined by" / "JSON processors or in specifications defining specific uses of JSON".
- **For the post:** JSON leaves order to whoever uses it. Node's `exports`, MongoDB queries and LLM structured outputs are exactly such "specific uses" that do define it (3.x).

### 2.11 V8, "Fast properties in V8" (Camillo Bruni, 30 Aug 2017). VERIFIED; Vendor (Google)

- **Citation:** https://v8.dev/blog/fast-properties
- **What it says:** "objects with the same structure — e.g. the same named properties" / "in the same order — share the same HiddenClass." "This transition tree makes sure you end up with the same final HiddenClass" / "if you add the same properties in the same order." A different property creates "a separate branch". Changing the property type "typically causes V8 to create a different HiddenClass" which can prevent "optimal code".
- **For the post:** engines key an object's shape on property order. That's the basis for the claim that consistent key order helps performance.

### 2.12 Bynens and Meurer, "JavaScript engine fundamentals: Shapes and Inline Caches" (14 Jun 2018). VERIFIED; Vendor (Google, V8 team at the time)

- **Citation:** Mathias Bynens and Benedikt Meurer, https://mathiasbynens.be/notes/shapes-ics (the article says it covers fundamentals "common to all JavaScript engines — and not just V8").
- **What it says:** "Note: The order in which properties are added impacts the shape." "For example, { x: 4, y: 5 } results in a different shape" / "than { y: 5, x: 4 }." The take-away: "Always initialize your objects in the same way," / "so they don’t end up having different shapes."
- **For the post:** the advice is consistency, not alphabetical order. A sorter makes literals consistent with each other, but objects built by assignment, spread or a library aren't touched.

### 2.13 Ron Buckton, "Introducing Deopt Explorer" (TypeScript blog, 12 May 2023): the one measured gain I found. VERIFIED; Vendor (Microsoft)

- **Citation:** https://devblogs.microsoft.com/typescript/introducing-deopt-explorer/
- **What it says:** "Two objects produced by the same constructor can still be" different types "if those properties were initialized in a different order", which caused "a lot of unintentional polymorphism" in the TypeScript compiler. The "Property Order Polymorphism" example: `return { x, y }` on one branch and `return { y, x }` on the other make `p.x` polymorphic. After making property initialisation consistent (microsoft/TypeScript#51880), V8's maps for `Symbol` went "from thirty down to two", and with Node changes the team "reduced the average compile time in our benchmarks by between 8-10%" (3–5% from `Symbol`, 4–5% from node subtypes).
- **The counterpoint:** ESLint #17347 (Jul 2023) argued that alphabetical sorting can _add_ shapes: with `{ kind, aProp }` and `{ kind, aProp, bProp }`, sorting moves `kind` to the end and breaks the shared prefix (1.4). Not measured.
- **For the post:** the measured win is from consistent initialisation in hot code, which a sort rule neither guarantees (it ignores objects built by assignment) nor targets. Treat the idea that sorted keys are faster as a hypothesis; I found no measurement of sorting itself.

---

## 3. Where key order matters in real libraries and tools

Every entry here is from official docs or source at a pinned commit, plus a few user reports tagged ANECDOTAL. Each one is a candidate example for the post. Examples marked "(mine)" were written from the quoted text; "(docs)" are the source's own. 3.1–3.5 are about TypeScript inference (the case Ultracite's users actually hit); 3.6–3.8 module resolution; 3.9–3.10 databases; 3.11–3.13 styles and GraphQL; 3.14–3.16 schemas and LLM structured outputs; 3.17–3.19 rendering and files; 3.20 lists the libraries that designed key order out. Files are in `scratchpad/sortkeys-lit/C/` unless noted.

### 3.1 TypeScript 4.7, "Improved Function Inference in Objects and Methods" (24 May 2022), and PR #48538. VERIFIED; Vendor (Microsoft)

- **Citation:** TypeScript 4.7 release notes, https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#improved-function-inference-in-objects-and-methods (and the devblog announcement, 24 May 2022). Anders Hejlsberg, "Improve inference for context sensitive functions in object and array literal arguments," microsoft/TypeScript PR #48538, opened 3 Apr 2022, merged 5 Apr 2022. It fixes #25092, #38623, #38845, #38872, #41712, #47599, #48279 and #48466.
- **What the release notes say:** TypeScript 4.7 "can now perform" / "more granular inferences from functions within objects and arrays", so inference can "consistently flow in a left-to-right manner just like for plain arguments". The example: `declare function f<T>(arg: { produce: (n: string) => T, consume: (x: T) => void }): void;` with `f({ produce: n => n, consume: x => x.toLowerCase() })` marked "Was an error, now works."
- **What the PR says:** "inferred type information only flows from left to right between context sensitive arguments". "This is a long standing limitation of our inference algorithm" "and one that isn't likely to change." The PR gives object properties "the same left-to-right rules for information flow between context sensitive contextually typed functions".
- **What follows (mine):** sorted, `consume` comes before `produce`, so `x` is inferred before `T` is known and becomes `unknown`. My check (3.3) confirms it.
- **For the post:** the root cause of every TanStack case below. TypeScript reads context-sensitive callbacks in source order by design, and alphabetical order is just another source order.

### 3.2 TypeScript issues: "The producer of a type has to come up before the consumer." ANECDOTAL (issue reports; explanation by a non-team contributor)

- **Citation:** microsoft/TypeScript #56297, "Parameter type inference/capture depends on the order of declaration of fields in an object." (2 Nov 2023; labelled Duplicate by Ryan Cavanaugh, closed 6 Nov 2023). #47599, "Improve inference in the presence of context-sensitive expressions" (Ryan Cavanaugh, 25 Jan 2022), reopened 21 Jun 2022 ("Not all these cases work yet, so reopening") and still open. #63378 (9 Apr 2026, open): "This behavior depends on the order of the object properties"; Cavanaugh: "This is basically #47599?".
- **What it says (#56297):** "it works if `methods` are declared before `init`, but not if" the other way. Mateusz Burzyński (`Andarist`, an outside contributor) explains that inference "iterates through your expression object expression in the source order." "The producer of a type has to come up before the consumer." "So the algorithm is a one-way street - no backsies."
- **Example (docs):** `extended({ methods: { bar() { return 1 } }, init(a) { return a.bar() } })` works; with `init` first, `a` is `unknown`. `init` sorts before `methods`.
- **For the post:** an ordinary user hit by property order outside any framework, and the clearest one-line explanation.

### 3.3 My check: sorting option keys breaks inference in TypeScript 6.0 and 7.0 (19 Oct 2026). VERIFIED (local run)

- **Setup:** `scratchpad/sortkeys-lit/lint-check/ts/inference.ts`, three `declare function` stand-ins with no imports: a `useMutation`-shaped `{ mutationFn, onMutate, onError }`, a `createRoute`-shaped `{ loader, head }` where `loader` destructures `params`, and the TypeScript 4.7 `produce`/`consume` example. `tsc` 6.0.3 and `tsgo` 7.0.0-dev.20260707.2 from this repo, `strict: true`. Then `oxlint --fix` with only `sort-keys` (1.86.0), then the type-checkers again.
- **Results:** before the fix, both compilers report nothing. After it:
  - `error TS2339: Property 'previous' does not exist on type '{}'.` (the mutation context; the exact error in Ultracite issue #801)
  - `error TS18046: 'loaderData' is of type 'unknown'.` (the route)
  - `error TS18046: 'x' is of type 'unknown'.` (TypeScript's own example)
- **Caveat:** the inference depends on the callbacks being context-sensitive (unannotated parameters). In #801, replacing `({ items }) =>` with `() =>` made the error go away; Hayden's reply: "callbacks without contextually typed parameters are inferred in the first pass regardless of position."
- **For the post:** a three-function file reproduces the bug class without any library. The fix pass turns type-correct code into type errors, and `oxlint --fix` itself reports success.

### 3.4 TanStack Router: `create-route-property-order` (v1.58.0, 18 Sep 2024), a recommended rule that sorts keys the other way. VERIFIED (docs and source at `ed557759`); issues ANECDOTAL

- **Citation:** https://tanstack.com/router/latest/docs/eslint/create-route-property-order ; docs source `docs/router/eslint/create-route-property-order.md` and rule source `packages/eslint-plugin-router/src/rules/create-route-property-order/` at TanStack/router `ed5577593a749b8c7193cc7b5d945fd084bfac2f`. PR #2362 by Manuel Schiller (`schiller-manuel`), opened and merged 18 Sep 2024, released in v1.58.0.
- **What it says:** "the property order of the passed in object matters due to type inference". "All other properties are insensitive to the order" / "as they do not depend on type inference." The rule is "🔧 Fixable" (`fixable: 'code'`). Required order: `params`/`validateSearch` → `loaderDeps`/`search.middlewares`/`ssr` → `context` → `beforeLoad` → `loader` → `onEnter`, `onStay`, `onLeave`, `head`, `scripts`, `headers`, `remountDeps`.
- **Router's agent skill** (`packages/router-core/skills/router-core/data-loading/SKILL.md`, shipped in the package): "Router infers types from earlier properties into later ones." "context from `beforeLoad` is unknown in the loader" when the order is wrong.
- **Issues (users reaching the alphabetical order):** #3491 (Feb 2025), "Adding `head` to createFileRoute breaks type inference of `loader`", fixed by "just move the head definition after loader" (confirmed by Schiller: "@Grimthul correct!"); #6100 (Dec 2025), "The order of the keys in the createFileRoute parameters affects the TS type hints.", answered "that's a known limitation of TypeScript."; #6325 (Jan 2026): "property order matters, in this case `beforeLoad` must come before `head`"; #6513 (Jan 2026): a commenter found that moving the loader above `head` fixed it (closed for lack of a reproducer).
- **For the post:** alphabetical order is the broken order here (`head` < `loader`, `beforeLoad` < `context`, `loader` < `loaderDeps`), and the framework ships its own autofixing rule to put keys in dependency order. The two fixers fight (Oxlint #25703, 1.14).

### 3.5 TanStack Query: `mutation-property-order` (v5.78.0, 26 May 2025) and `infinite-query-property-order` (v5.57.0, 20 Sep 2024). VERIFIED (docs and source at `c87c0eaf`, issue)

- **Citation:** https://tanstack.com/query/latest/docs/eslint/mutation-property-order and …/infinite-query-property-order ; TanStack/query `c87c0eafbc5ddc35628587531d691550893b1a01`. `infinite-query-property-order`: PR #8072 by Manuel Schiller, merged 20 Sep 2024, v5.57.0. `mutation-property-order`: PR #9191 by `jochongs`, merged 26 May 2025, v5.78.0. Issue #8988, "useMutation callbacks context type depends on options object sorting" (`alexw-at`, 10 Apr 2025; closed 30 Jan 2026), with Dominik Dorfmeister's (`TkDodo`) reply of 11 Apr 2025.
- **What it says:** "In an object, type consumers must come after type producers." "`onMutate` produces the type, `onError` and `onSettled` consume them." "This is a known typescript limitation". Closing comment: "we now have a `mutation-property-order` rule". The infinite-query rule's order is `[['queryFn'], ['getPreviousPageParam', 'getNextPageParam']]`; both rules are fixable.
- **Example (mine):** sorted, `useMutation({ mutationFn, onError, onMutate })` puts `onError` before `onMutate`, and the context becomes `{}` (3.3). Sorted infinite-query options put both page-param callbacks before `queryFn`.
- **For the post:** the clearest maintainer quote, and the issue title says it all: the context type "depends on options object sorting".

### 3.6 Node.js `exports`: "key order is significant", and "default" goes last. VERIFIED (docs)

- **Citation:** Node.js docs, "Modules: Packages," section "Conditional exports", https://nodejs.org/api/packages.html#conditional-exports (docs for v26.12.0; source `doc/api/packages.md` at nodejs/node `00d716d3`).
- **What it says:** "Within the "exports" object, key order is significant." "earlier entries have higher priority and take precedence over later" entries. For `"default"`: "This condition should always come last." "Conditions continue to be matched in order as with flat conditions." Condition names "cannot be integer property keys like "10" since that can have" / "unexpected effects on property key ordering for JS objects."
- **TypeScript:** "The "types" condition should always come first in "exports"." (TS 4.7 release notes).
- **webpack** ("Package exports" guide and `resolve` docs): "Conditions are tried in object order." "In an object where each key is a condition, order of properties is significant." But for subpaths, "order of properties (subpaths) is not significant." because "More specific paths are preferred over less specific ones."
- **Example (mine):** `{ "types": …, "import": …, "require": …, "default": … }` sorts to `default, import, require, types`. `"default"` always matches, so the other three become dead.
- **Who sorts it:** sort-package-json only moves `default` to the bottom of `exports` (1.24). Biome's `useSortedKeys` is a JS and JSON action; in Ultracite's Biome config, JSON assists are off and `package.json` uses `useSortedPackageJson` (6.5). Not tested whether Biome's JSON `useSortedKeys` would sort `exports` if enabled. In JavaScript, the same object appears in build scripts that generate package manifests.
- **For the post:** the plainest runtime break, from the platform's own docs. It's JSON, so it's a warning about sorting JSON, and about JS that builds such objects.

### 3.7 Vite `resolve.alias` and `@rollup/plugin-alias`: first match wins. VERIFIED (docs and source)

- **Citation:** Vite, https://vite.dev/config/shared-options#resolve-alias (`docs/config/shared-options.md` at vitejs/vite `467f7ac3`); rollup/plugins `639f4563`, `packages/alias/README.md` and `src/index.ts`.
- **What it says:** Vite: "The order of the entries is important" / "in that the first defined rules are applied first." Rollup: "With either format, the order of the entries is important". Source: `entries.find((entry) => matches(entry.find, importee))`, with `importee.startsWith(pattern + '/')` for string keys.
- **webpack `resolve.alias`:** the docs don't say, but enhanced-resolve builds the list with `Object.keys(alias).map(...)` and tries each in turn (`lib/ResolverFactory.js`, `lib/AliasUtils.js` at `b1e589e7`).
- **Example (mine, from the source):** `alias: { 'utils/date': '/vendor/date', utils: '/src/utils' }` sorts to `utils` first, so `import 'utils/date'` now resolves to `/src/utils/date`.
- **Counterexample:** TypeScript `paths` uses "the pattern with the longest matching prefix before any * token" (Modules reference), so its key order doesn't matter.
- **For the post:** a build-time change stated plainly in the docs, in a config file that `sort-keys` lints like any other JS.

### 3.8 MongoDB: sort documents, compound indexes and embedded-document queries. VERIFIED (docs, driver source); Vendor (MongoDB)

- **Citation:** MongoDB Manual: `$sort` (https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/), "Compound Indexes" (…/core/indexes/index-types/index-compound/), "Query on Embedded/Nested Documents" (…/tutorial/query-embedded-documents/). Node.js driver: "Specify Documents to Return" (…/drivers/node/current/crud/query/specify-documents-to-return/) and `src/sort.ts` at mongodb/node-mongodb-native `ef6f6f3a`.
- **What it says:**
  - "When sorting on multiple fields, $sort evaluates sort order from left to right."
  - "The order of fields in a compound index is very important."
  - Equality on an embedded document requires "an _exact_ match of the specified `<value>` document, including the field order." With the fields in another order, "the following query does not match any documents".
  - Driver: "Matched document fields are compared in the same order" / "as fields are specified in the sort document." Its `Sort` type also accepts a `ReadonlyMap` and arrays of pairs.
- **Examples:** (docs) `{ length: 1, author: 1 }` sorted to `{ author: 1, length: 1 }` orders by author first. (docs) data stored as `size: { h: 14, w: 21, uom: 'cm' }`; the alphabetical `{ h: 14, uom: 'cm', w: 21 }` matches nothing (mine). (mine) `createIndex({ status: 1, createdAt: -1 })` sorted builds a different index.
- **For the post:** the best plain-JavaScript example: an object literal whose key order is the query. A sorted embedded-document filter silently returns zero rows. The driver's types offer a `Map` or an array, which no sort rule reorders.

### 3.9 Prisma `orderBy` takes an array for multiple fields. VERIFIED (docs); Vendor (Prisma)

- **Citation:** Prisma ORM v7 Client reference, "Sort user by multiple fields - email and role," https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference
- **What it says:** the example "sorts users by two fields - first `email`, then `role`" with `orderBy: [{ email: "desc" }, { role: "desc" }]`, and "The order of sorting parameters matters".
- **For the post:** an API that moved order out of object keys and into an array, which is the design `sort-keys` can't break.

### 3.10 React DOM inline styles: later properties win, and React warns about shorthand collisions. VERIFIED (source at `a6792708`, PRs, changelog, CSSOM, MDN)

- **Citation:** react/react (formerly facebook/react) `a679270829ac5786fe7cd3b65acd289d5338dbc7`, `packages/react-dom-bindings/src/client/CSSPropertyOperations.js` (mount loop `for (const styleName in styles)`; `validateShorthandPropertyCollisionInDev`); server rendering in `ReactFizzConfigDOM.js` emits in the same order. PR #14181 by Sophie Alpert (`sophiebits`, merged 9 Nov 2018); put behind a flag (#14245, Nov 2018); re-enabled in #18002 and shipped in React 16.13.0 (26 Feb 2020). CSSOM `setProperty`; MDN "Shorthand properties".
- **What it says:** the warning says mixing them "can lead to styling bugs" and to "don't mix shorthand and non-shorthand properties". PR #14181 called it "one of the most insidious quirks of React DOM" and "Now we warn when we think an update is dangerous." The 16.13.0 changelog: "Warn when changes in `style` may cause an unexpected collision". MDN on shorthands: "That means that it **overrides** previously set values."
- **Example (mine):** `style={{ gap: 16, columnGap: 8 }}` sorts to `{ columnGap: 8, gap: 16 }`, so `gap` is applied last and resets the column gap to 16. The same happens with `placeItems`/`alignItems` and `flexFlow`/`flexDirection`. Sorting can also fix a style: `{ marginTop: 8, margin: 0 }` becomes `{ margin: 0, marginTop: 8 }`. Most shorthands sort before their longhands because they share a prefix; `gap`, `place-*`, `flex-flow` and `columns` don't.
- **The warning fires on re-render only**, so a first-mount difference is silent.
- **React Native is different:** Yoga resolves edges by specificity (`computeTopEdge` checks Top, then Vertical, then All; `yoga/style/Style.h` at react/yoga `7856c9b2`), so `{ marginTop: 8, margin: 0 }` gives a top margin of 8 in either order. The RN docs only say "the last style in the array has precedence".
- **For the post:** a visual change from sorting a style object on the web, and the same object is order-insensitive on native.

### 3.11 CSS-in-JS: nested selectors and media queries follow key order. VERIFIED (Emotion source, CSS Cascade 5, MDN)

- **Citation:** emotion-js/emotion `b882bcba`, `packages/serialize/src/index.ts` (`for (let key in obj) {`, nested rules emitted in that order); W3C CSS Cascade Level 5, "Order of Appearance" (https://www.w3.org/TR/css-cascade-5/); MDN `:active` (mdn/content `a64fca52`).
- **What it says:** "The last declaration in document order wins." MDN: `:active` "will be overridden by any subsequent link-related pseudo-class", so "put the `:active` rule after all other link-related rules".
- **Examples (mine):** `{ '&:hover': { color: 'blue' }, '&:active': { color: 'red' } }` sorts `&:active` first, so a pressed, hovered link stays blue. `{ '@media (min-width: 600px)': …, '@media (min-width: 1200px)': … }` sorts lexicographically to 1200 first (ESLint and Oxlint order), so the 600px rule wins at ≥1200px. A natural sort (Biome's default) keeps 600 first.
- **For the post:** visual regressions from sorting the keys of a style object, and an example where ESLint's order and Biome's give different results.

### 3.12 GraphQL: responses are ordered by the selection set. VERIFIED (spec)

- **Citation:** GraphQL Specification, September 2025 edition, "Serialized Map Ordering" and "Field Ordering," https://spec.graphql.org/September2025/
- **What it says:** "Object values should be serialized as ordered maps" "ordered by the order in which they appear in the selection set." A request for `{ name, age }` "should not respond with { "age": 30, "name": "Mark" }" because "they also have observably different property orderings." Input objects are "an unordered map supplied by a variable". "The order in which directives appear may be significant".
- **Sorters:** graphql-eslint's `alphabetize` is fixable (`fixable: 'code'`, at `0f57486c`). Biome's `useSortedSelectionSet` ("Fix: unsafe" in 2.5.15) is on in Ultracite's Biome core (6.5).
- **For the post:** sorting a selection set changes the order of the response's keys by spec. Sorting input objects is safe.

### 3.13 Zod: parsed output and JSON Schema follow the schema's key order. VERIFIED (source at `afdac65e`; docs silent)

- **Citation:** colinhacks/zod `afdac65e0f80c0ccf9e8909da97c411567908b57`: v3 `packages/zod/src/v3/types.ts` and `v3/helpers/parseUtil.ts`; v4 `packages/zod/src/v4/core/schemas.ts`; `z.toJSONSchema()` in `v4/core/json-schema-processors.ts`.
- **What the source shows:** v3 loops `for (const key of shapeKeys) {` and writes `finalObject[key.value] = value.value;`. v4 uses `const keys = Object.keys(def.shape);` and its compiled path has the comment `// A: preserve key order {`. JSON Schema: `for (const key in shape) {`. Unknown keys (passthrough, loose, catchall) follow in input order.
- **Pydantic** says the same in its docs: "field order is preserved in the model" JSON Schema (pydantic `200e8fa0`, `docs/concepts/models.md`).
- **Example (mine):** `z.object({ steps: z.array(Step), final_answer: z.string() })` parses and converts with `steps` first. Sorting the shape flips the parsed output, `JSON.stringify` of it, snapshots, and the generated JSON Schema, which is what LLM structured outputs consume (3.14).
- **For the post:** `sort-keys` lints the shape object of a schema like any other literal. The order it sets travels into data and into model prompts.

### 3.14 LLM structured outputs: the schema's key order is the output's order (OpenAI, Anthropic, Google). VERIFIED (docs, Wayback captures, blog); Vendor

- **OpenAI** (Structured Outputs guide, https://developers.openai.com/api/docs/guides/structured-outputs, fetched 19 Oct 2026): "outputs will be produced in the same order" / "as the ordering of keys in the schema." The guide's chain-of-thought example declares `steps` before `final_answer`. The launch post ("Introducing Structured Outputs in the API," 6 Aug 2024, read via Wayback 20240807005516): "It can be useful to give the model a separate field" / "for chain of thought to improve the final quality of the response.", with `reasoning_steps` declared before `answer`. OpenAI never tells you to put reasoning first; its examples just do.
- **Anthropic** (Structured outputs, https://platform.claude.com/docs/en/build-with-claude/structured-outputs, fetched 19 Oct 2026): "properties in objects maintain their defined ordering from your schema", with one caveat: "required properties appear first, followed by optional properties". Separately, Anthropic now advises keeping reasoning out of the JSON: a `reasoning`, `thinking` or `trace` field "may lead to a `reasoning_extraction` refusal" (refusals page).
- **Google Gemini** (https://ai.google.dev/gemini-api/docs/structured-output, Wayback captures):
  - March 2025: "By default, the API orders properties alphabetically and does not" preserve definition order; if examples don't match, "the output could be rambling or unexpected."
  - July 2025 added a warning to set `propertyOrdering[]`.
  - The Gemini API team's post of 5 Nov 2025 ("Improving Structured Outputs in the Gemini API"): the API now "preserves the same order as the ordering of keys in the schema", for "all Gemini 2.5 models and beyond".
  - The Vertex AI / Gemini Enterprise page (last updated 19 Oct 2026) still says, outside the Python SDK, "properties are generated alphabetically with the required properties grouped first".
- **Developers who hit it** (ANECDOTAL): Google AI forum thread "Output order in structured outputs" (Dec 2024–Mar 2025): "I want reasoning key to be filled first"; "it totally wrecks the output"; a workaround, "I put letter prefixes before the schema fields". vercel/ai#5879 (Apr 2025, open): "Property ordering is extremely important when generating JSON."
- **Alphabetical order is the wrong order for the usual names:** `answer` < `chain_of_thought` < `reasoning` < `reasoning_steps` < `steps`, and `final_answer` < `steps`.
- **For the post:** a major API did by default exactly what `sort-keys` does, warned users it made output worse, and reversed it. Whether answer-first ordering lowers accuracy is measured in 5.6.

### 3.15 Forms and tables that render in key order. VERIFIED (docs and source)

- **react-jsonschema-form** (docs and source at rjsf `2a2e22a5`): you "define the order in which properties are rendered using the `ui:order` property". Without it, `ObjectField` uses `Object.keys(schemaProperties)`, and "If `order` is not an array, then the untouched `properties` list is returned." (mine) `properties: { firstName, lastName, age }` sorted shows Age first.
- **Papa Parse `unparse`** (v5.7.0, `papaparse.js` at `e78dddce`): "If data is an array of objects" / "the keys of the first object are the header row." (`Object.keys(_input[0])`). (mine) `{ sku, name, price }` sorted makes the CSV header `name,price,sku`, which breaks positional consumers.
- **For the post:** user-visible field order and downstream file formats follow key order.

### 3.16 Libraries that designed key order out. VERIFIED (docs and source)

- **TanStack Query keys:** "Query Keys are hashed deterministically!" "no matter the order of keys in objects" / "all of the following queries are considered equal". "Array item order matters!" The implementation sorts `Object.keys(val)` inside a `JSON.stringify` replacer (`packages/query-core/src/utils.ts`, `hashKey`).
- **TypeScript `paths`:** longest matching prefix wins (3.7).
- **webpack subpath exports:** "order of properties (subpaths) is not significant." (3.6).
- **React Native styles:** specificity, not order (3.10).
- **Prisma `orderBy`:** an array, not a key order (3.9).
- **Tailwind CSS v3 `screens`:** "Tailwind will automatically sort your breakpoints" and "smaller breakpoints are inserted first" (v3 docs, https://v3.tailwindcss.com/docs/screens).
- **GraphQL input objects:** unordered by spec (3.12).
- **For the post:** these are the places where sorting is safe because a library made order irrelevant. A linter can't tell them apart from 3.4–3.15 without knowing which library receives the object.

### 3.17 Summary: where reordering an object literal changes behaviour

| Where | What changes | Source |
| --- | --- | --- |
| Context-sensitive callbacks (TanStack Router and Query, Redux Toolkit `configureStore`, any `<T>` producer/consumer) | Types: `TS2339`, `TS18046`, `unknown` | 3.1–3.5, 1.14 |
| Values or computed keys with side effects | Evaluation order | 2.5, 1.9, 1.16 |
| `JSON.stringify`, snapshots, hashes, saved files, HMR messages | Bytes on the wire and on disk | 2.4, 1.16, 6.4 |
| Node `exports`, Vite and Rollup `alias`, webpack `alias` | Module resolution | 3.6, 3.7 |
| MongoDB sort, index and embedded-document filters | Query results and indexes | 3.8 |
| React DOM `style`, CSS-in-JS nested selectors and media queries | Rendering | 3.10, 3.11 |
| GraphQL selection sets | Response key order | 3.12 |
| Zod, Pydantic, LLM structured-output schemas | Parsed output order; generation order | 3.13, 3.14, 5.6 |
| JSON Schema forms, CSV export | What users see; file layout | 3.15 |
| Duplicate keys with an unstable sort | Which value wins | 2.6, 1.15 |

---

## 4. Readability, search and merge conflicts

The claims for sorted keys are that they're easier to find, easier to diff, and cause fewer merge conflicts (1.3, 1.9, 1.13). Items 4.1–4.7 are the HCI research on menu order; 4.8–4.13 are program comprehension and code conventions; 4.14–4.21 are what causes merge conflicts; 4.22–4.24 are what projects say about sorting and conflicts; 4.25–4.28 are blame and diff tools; 4.29 is a small git demo. Files are in `scratchpad/sortkeys-lit/A/`. The ACM Digital Library and SAGE returned 403, so several older papers are metadata and abstract only.

**Bottom line:** no study measures whether sorted object keys are easier to read or find, and no study measures whether sorting reduces merge conflicts. The menu research says alphabetical order helps when the reader knows the exact name and hurts when they know only the meaning.

### 4.1 Card, "User perceptual mechanisms in the search of computer command menus" (CHI '82). VERIFIED (metadata + abstract); findings secondhand

- **Citation:** Stuart K. Card, Proceedings of CHI '82, Gaithersburg, MD, pp. 190–196. https://doi.org/10.1145/800049.801779. ACM returned 403; only the landing page (via Wayback) was read, and its "abstract" is an introduction with no results.
- **What it says (landing page):** with menus "the user need not recall the command he wishes, but merely recognize it".
- **Findings, as reported by Sears and Shneiderman (4.6):** Card compared "positionally constant alphabetical, categorical (called functional by Card), and" random menus. "Alphabetically ordered menus were the fastest, and" / "randomly ordered menus were the slowest."
- **Caveat:** Hornof and Kieras (1997) discuss "Card [3]", which is Card's 1984 book chapter, not this paper. Don't attribute eye-movement findings to CHI '82 without reading it.
- **For the post:** the classic result for alphabetical order, in a task where the user is matching a known command name, and only secondhand.

### 4.2 McDonald, Stone and Liebelt, "Searching for Items in Menus: The Effects of Organization and Type of Target" (HFS 1983). VERIFIED (metadata + abstract)

- **Citation:** James E. McDonald, Jim D. Stone, Linda S. Liebelt, _Proceedings of the Human Factors Society Annual Meeting_ 27(9), pp. 834–837, October 1983. https://doi.org/10.1177/154193128302700919 (abstract from Crossref; SAGE returned 403).
- **What it says:** "with 64-item menus", "Categorical menu organization was found to be superior to an alphabetical ordering," / "particularly when definitions are provided as stimuli."
- **Numbers:** 64 items; participant count not in the abstract.
- **For the post:** when the reader knows what a thing does but not its exact name, grouping by meaning beats the alphabet.

### 4.3 Somberg, "A comparison of rule-based and positionally constant arrangements of computer menu items" (CHI+GI '87). VERIFIED (metadata + abstract)

- **Citation:** Benjamin L. Somberg, Proceedings of CHI+GI '87, Toronto, pp. 255–260. https://doi.org/10.1145/29933.275639 (ACM and Crossref give "01 May 1986", a metadata error; the conference was April 1987).
- **What it says:** "During the initial stages of practice, the rule-based approaches produced faster mean search times," / "after moderate amounts of practice, the positionally constant arrangement appeared to be most efficient." "People seem to remember quite easily the location of items on a display". Per Sears and Shneiderman, in the alphabetical condition items "changed positions between each selection making" / "it impossible to learn the location of an item."
- **Numbers:** four arrangements (alphabetical, by probability of selection, random, positionally constant); participant count unknown.
- **For the post:** with practice, a stable position beats any ordering rule. Re-sorting an existing object moves every key a reader has learned.

### 4.4 Hollands and Merikle, "Menu Organization and User Expertise in Information Search Tasks" (Human Factors 1987). VERIFIED (metadata + abstract)

- **Citation:** J. G. Hollands and Philip M. Merikle, _Human Factors_ 29(5), pp. 577–586, 1987. https://doi.org/10.1177/001872088702900507
- **What it says:** the categorical menu was built after "experts in psychology sorted 120 psychological terms". "Performance on both search tasks improved directly with expertise in the subject area" / "when the categorical menu organization was used,". But "performance on the term-matching task was not influenced by expertise" / "when alphabetic and random menu organizations were used."
- **For the post:** grouping pays off for people who know the domain; the alphabet gives experts nothing over novices. A codebase's maintainers are the experts.

### 4.5 Mehlenbacher, Duffy and Palmer, "Finding Information on a Menu: Linking Menu Organization to the User's Goals" (HCI 1989). VERIFIED (metadata + abstract)

- **Citation:** Brad Mehlenbacher, Thomas M. Duffy, James Palmer, _Human–Computer Interaction_ 4(3), pp. 231–251, 1989. https://doi.org/10.1207/s15327051hci0403_3 (abstract via OpenAlex).
- **What it says:** "the functional menu is more effective than the alphabetical menu" / "for the synonym and iconic cues". "users make fewer errors with the functionally organized menu".
- **Method:** three cue types (direct match, synonym, icon) × two organisations × five trial blocks.
- **For the post:** alphabetical order only helps when the reader already has the exact name.

### 4.6 Sears and Shneiderman, "Split Menus: Effectively Using Selection Frequency to Organize Menus" (ACM TOCHI 1994). VERIFIED (full text, Wayback copy)

- **Citation:** Andrew Sears and Ben Shneiderman, _ACM Transactions on Computer-Human Interaction_ 1(1), pp. 27–51, 1994. https://doi.org/10.1145/174630.174632
- **What it says:** "In the controlled experiment split menus were" / "significantly faster than alphabetic menus". In one distribution, "alphabetic menus were significantly faster than" / "frequency menus during both the first and last blocks,". Alphabetical "ordering which is useful when selecting low-frequency items."
- **Numbers:** "Thirty-eight frequent computer users were recruited" (36 analysed); "Subjects made 100 selections with each of the nine menus." Field study: "Of the 13 participants that answered, one" / "preferred the alphabetical menus; nine preferred the split menus;" (three no preference).
- **For the post:** the alphabet is a decent fallback for rarely used items, and loses when some items are used far more than others.

### 4.7 Bailly, Oulasvirta, Brumby and Howes, "Model of visual search and selection time in linear menus" (CHI 2014). VERIFIED (full text, HAL)

- **Citation:** Gilles Bailly, Antti Oulasvirta, Duncan P. Brumby, Andrew Howes, CHI '14, pp. 3865–3874. https://doi.org/10.1145/2556288.2557093 ; full text https://hal.sorbonne-universite.fr/hal-01820441
- **What it says:** on earlier work, "For targets with unknown labels," / "semantic organization is faster than alphabetic organization". For known labels the evidence is mixed: "One study found no difference [32], but two others" / "suggest that alphabetic is faster [10, 33]." Their own result: participants were faster with "either an alphabetic or semantic organiza-" tion than with unordered menus, and with practice "the menu organization effect diminished."
- **Numbers:** "22 participants x 3 Menu con-" figurations; 39,564 selections (1,515, 3.83%, excluded); menus of 8, 12 and 16 items; the stimulus was the target's exact name.
- **For the post:** any consistent order beats none; alphabetical versus grouped depends on whether the reader knows the name; and the difference fades with practice. This is the best single summary of the HCI evidence.

### 4.8 Biegel, Beck, Hornig and Diehl, "The Order of Things: How developers sort fields and methods" (ICSM 2012). VERIFIED (metadata + abstract)

- **Citation:** Benjamin Biegel, Fabian Beck, Willi Hornig, Stephan Diehl, ICSM 2012, Trento, pp. 88–97. https://doi.org/10.1109/ICSM.2012.6405258 (abstract via Wayback of IEEE Xplore; no full text found).
- **What it says:** "87% of the participants agreed that ordering of fields and methods" / "is meaningful or important." "the categories defined in the official Java Code Conventions" / "appear to be the primary ordering criterion." Secondhand (Baum et al., 4.10): they "could also observe semantic clustering" "(by common key terms), whereas alphabetic order was rare."
- **Numbers:** 2 projects visualised; metrics over "an extended set of 16 projects"; a survey of 52 developers. No experiment.
- **For the post:** developers think member order matters, and almost none of them choose the alphabet.

### 4.9 Geffen and Maoz, "On method ordering" (ICPC 2016). VERIFIED (metadata + abstract); results secondhand

- **Citation:** Yorai Geffen and Shahar Maoz, ICPC 2016, Austin, pp. 1–10. https://doi.org/10.1109/ICPC.2016.7503711
- **What it says:** "As the order of methods in a Java class" / "has no effect on its semantics," the authors ask "Are some orders better than others in making the code easier to understand?" Per Baum et al. (4.10): "Their results are not statistically" / "significant, but they show a tendency that a random order" / "is worst and a combination of clustering and sorting is best," where sorting means by call order, not alphabetical. Per 4.11: their "results did not reach statistical significance".
- **For the post:** the one comprehension experiment on member order found no significant effect, and it didn't test alphabetical order.

### 4.10 Baum, Schneider and Bacchelli, "On the Optimal Order of Reading Source Code Changes for Review" (ICSME 2017). VERIFIED (full text, author copy)

- **Citation:** Tobias Baum, Kurt Schneider, Alberto Bacchelli, ICSME 2017, pp. 329–340. https://doi.org/10.1109/ICSME.2017.28 ; https://tobiasbaum.github.io/rp/optimalordering.pdf
- **What it says:** "review tools present the" / "change parts under review sorted in alphabetical order of file" path. Their "results indicate that an optimal order is mainly an optimal" / "grouping of the change parts by relatedness." An interviewee: "alphabetical order is definitely not a" good order.
- **Numbers:** 292 industrial review sessions; 12 interviews; 201 survey responses. "In 156 of 292 studied" sessions (53%) the reviewer started with the tool's first file; 3,071 of 8,254 file-to-file moves (37%) followed the tool's order.
- **For the post:** the alphabet is the neutral default tools fall back on, and readers want related things together.

### 4.11 Baum, Schneider and Bacchelli, "Associating working memory capacity and code change ordering with code review performance" (EMSE 2019). VERIFIED (accepted manuscript)

- **Citation:** _Empirical Software Engineering_ 24(4), pp. 1762–1798, 2019. https://doi.org/10.1007/s10664-018-9676-8
- **What it says:** "We cannot conclude reliably whether the order of presenting the" / "code change parts influences the efficiency of code review." "Not having attained the sample size indicated by power" analysis.
- **Numbers:** "50" / "software developers (46 being professionals)"; best versus worst orders, not alphabetical.
- **For the post:** even large differences in order had no measurable effect in a controlled experiment, with the caveat that it was underpowered.

### 4.12 Ko, Myers, Coblenz and Aung, "An Exploratory Study of How Developers Seek, Relate, and Collect Relevant Information during Software Maintenance Tasks" (IEEE TSE 2006). VERIFIED (author PDF)

- **Citation:** Amy J. Ko, Brad A. Myers, Michael J. Coblenz, Htet Htet Aung, _IEEE TSE_ 32(12), pp. 971–987, 2006. https://doi.org/10.1109/TSE.2006.116
- **What it says:** of "48 instances of a developer beginning work on a task, 40" "began with a textual search". "An average of 88 percent" of searches led to nothing relevant. Developers spent "35 percent of their time performing the mechanics of navigation".
- **Numbers:** 31 developers recruited; the analysis covers "the 10 developers most experienced with Java,".
- **For the post:** developers find code by searching, not scanning. That weakens the argument that sorted keys are faster to find, since search doesn't care about order. (My inference; the study didn't test order.)

### 4.13 Code conventions on member order: by function, "some logical order", and not alphabetical. ANECDOTAL (style guides)

- **Sun/Oracle Java Code Conventions, "File Organization":** methods "should be grouped by functionality rather than by scope or accessibility." "The goal is to make reading and understanding the code easier." https://www.oracle.com/java/technologies/javase/codeconventions-fileorganization.html
- **Google Java Style Guide** (google/styleguide `e4d272e`): imports "appear in ASCII sort order." For class contents, "What is important is that each class uses some logical order, which its" / "maintainer could explain if asked." Adding new members at the end ("chronological by date added") is "not a logical" ordering.
- **Kotlin conventions:** "Do not sort the method declarations alphabetically or by visibility" (1.23).
- **For the post:** the big style guides sort imports and leave members to meaning. Google rules out "append at the end", which is the habit that sorting is supposed to cure.

### 4.14 Ghiotto, Murta, Barros and van der Hoek, "On the Nature of Merge Conflicts: A Study of 2,731 Open Source Java Projects Hosted by GitHub" (IEEE TSE 2020; online 2018). VERIFIED (author copy)

- **Citation:** Gleiph Ghiotto, Leonardo Murta, Márcio Barros, André van der Hoek, _IEEE TSE_ 46(8), pp. 892–915, 2020 (early access 2018). https://doi.org/10.1109/TSE.2018.2871083 ; https://www.ic.uff.br/~leomurta/papers/ghiotto2018.pdf
- **What it says:** 2,731 projects, 25,328 failed merges and 175,805 conflicting chunks; "40% of the failed merges have a single conflicting chunk". For conflicts that are only imports or only variables, concatenating both sides ("CC") "is the most frequent" / "decision in resolving these kinds of conflicts,". One example shows a developer keeping both sides "but reordering some imports in an order" they preferred. "We were somewhat surprised at the high difficulty ratio" for imports.
- **Numbers:** manual sample: import-only chunks 60 of 616 (9%). Automated: imports were 24,267 (6%) of construct occurrences.
- **For the post:** lists where everyone inserts at the same place (imports) are a common, mostly cheap source of conflicts.

### 4.15 Brindescu, Ahmed, Jensen and Sarma, "An empirical investigation into merge conflicts and their effect on software quality" (EMSE 2020). VERIFIED (author copy)

- **Citation:** Caius Brindescu, Iftekhar Ahmed, Carlos Jensen, Anita Sarma, _Empirical Software Engineering_ 25, pp. 562–590, 2020 (online Sep 2019). https://doi.org/10.1007/s10664-019-09735-4 ; https://www.ics.uci.edu/~iftekha/pdf/J4.pdf
- **What it says:** "we collected 556,911 commits, 36,122 of which were merge commits." "19.32% of these merges, in turn, resulted in conflicts." The FORMATTING category is "Conflicting changes due to formatting" "(whitespace changes)"; such conflicts "are easier and less risky to resolve" / "since they do not affect the programs’ functionality." Code involved in a conflict is "twice as likely to have a bug."
- **Numbers:** 143 projects; 6,979 conflicts; FORMATTING 1,620 (23.21%); SEMANTIC 4,150 (59.46%).
- **For the post:** about a quarter of conflicts come from mechanical layout changes. A bulk re-sort is a mechanical change of another kind (it moves lines, not whitespace).

### 4.16 Brindescu, Ahmed, Leano and Sarma, "Planning for Untangling: Predicting the Difficulty of Merge Conflicts" (ICSE 2020). VERIFIED (full text, Wayback)

- **Citation:** ICSE '20, pp. 801–811. https://doi.org/10.1145/3377811.3380344
- **What it says:** "Merge conflicts occur when developers modify the same lines of" code at the same time; "about 19% of all merges end up in a merge conflict".
- **Numbers:** "6,380 conflicts across 128 java projects".
- **For the post:** background on how common conflicts are; nothing on order.

### 4.17 Accioly, Borba and Cavalcanti, "Understanding semi-structured merge conflict characteristics in open-source Java projects" (EMSE 2018). VERIFIED (accepted manuscript)

- **Citation:** Paola Accioly, Paulo Borba, Guilherme Cavalcanti, _Empirical Software Engineering_ 23(4), pp. 2051–2085, 2018. https://doi.org/10.1007/s10664-017-9586-1
- **What it says:** most conflicts "happen because developers independently edit the same or consecutive lines of" the same method; the diff3 "algorithm is not able to merge them because consecutive lines were edited".
- **Numbers:** 70,047 merges from 123 projects; 28,883 conflicts; the same-or-consecutive-lines pattern was 84.57%.
- **For the post:** this is the mechanism. Edits on adjacent lines conflict, so two branches that both append to the end of an object always do.

### 4.18 Apel, Liebig, Brandl, Lengauer and Kästner, "Semistructured Merge: Rethinking Merge in Revision Control Systems" (ESEC/FSE 2011). VERIFIED (author PDF)

- **Citation:** Sven Apel, Jörg Liebig, Benjamin Brandl, Christian Lengauer, Christian Kästner, ESEC/FSE '11, pp. 190–200. https://doi.org/10.1145/2025113.2025141
- **What it says:** semistructured merge relies on "the observation that the order of certain" / "elements (e.g., of classes, interfaces, methods, fields, imports, and" / "so on) does not matter. We call such conflicts ordering conflicts."
- **Numbers:** "24 software projects developed in Java, C#, and Python" / "comprising 180 merge scenarios." It "reduces the number of conflicts in 60 % of the sample merge" / "scenarios by, on average, 34 %".
- **For the post:** merge tools remove conflicts between two insertions at the same spot by treating order as irrelevant. That's the opposite assumption from JavaScript object keys.

### 4.19 Cavalcanti, Borba and Accioly, "Evaluating and Improving Semistructured Merge" (OOPSLA 2017). VERIFIED (author PDF)

- **Citation:** Guilherme Cavalcanti, Paulo Borba, Paola Accioly, _Proc. ACM Program. Lang._ 1(OOPSLA), Article 59, 2017. https://doi.org/10.1145/3133883
- **What it says:** line-based merge reports false conflicts "when developers add declarations of different elements to the same part of the text." But "import declarations are often, but not always, re-arrangeable."
- **Numbers:** "more than 30,000 merges from 50 open source" projects; the improved tool halved reported conflicts with "no additional false positives".
- **For the post:** even for imports, order is "often, but not always" irrelevant.

### 4.20 Trindade Tavares, Borba, Cavalcanti and Soares, "Semistructured Merge in JavaScript Systems" (ASE 2019). VERIFIED (author PDF)

- **Citation:** Alberto Trindade Tavares, Paulo Borba, Guilherme Cavalcanti, Sérgio Soares, ASE 2019, pp. 1014–1025. https://doi.org/10.1109/ASE.2019.00098
- **What it says:** ordering conflicts arise when "two developers declare different functions in the same area". In JavaScript "the order of statements" "is relevant, once they may cause side effects." Gains "might be limited for languages that allow" / "both commutative and non-commutative declarations at the same" syntactic level.
- **Numbers:** 10,345 merge scenarios "from 50 JavaScript projects on GitHub,"; reported conflicts fell only 3.85–6%. The authors "discarded projects that primarily use ES6 and newer versions".
- **For the post:** research merge tools can't assume JavaScript order is irrelevant either. Object literals weren't studied separately.

### 4.21 Schesch, Featherman, Yang, Roberts and Ernst, "Evaluation of Version Control Merge Tools" (arXiv 2024). VERIFIED (preprint)

- **Citation:** Benedikt Schesch, Ryan Featherman, Kenneth J. Yang, Ben R. Roberts, Michael D. Ernst, arXiv:2410.09934, 13 Oct 2024 (no peer-reviewed venue confirmed).
- **What it says:** "To our surprise, Imports performed better than IntelliMerge and" Spork; "simply unioning the import lines in each git conflict performed" much worse.
- **Numbers:** 44,985 merges with passing tests, each tested 5 times.
- **For the post:** import conflicts matter in practice, and "keep both" union merges cause damage (see 4.29, case F).

### 4.22 Projects that sort lists to avoid merge conflicts. ANECDOTAL (project docs)

- **tock/libtock-rs** (`doc/Style.md` at `e1ab203c`): "Always adding new entries at the bottom of the list results in merge" / "conflicts whenever two PRs add entries to the same list. Putting them in" / "alphabetical order decreases the probability of merge conflicts."
- **slevomat/coding-standard** (PHP), `Arrays.AlphabeticallySortedByKeys` (`doc/arrays.md` at `855cd60d`), an autofixing key-sort sniff: "It defines where new entries should be inserted." "It reduces merge conflicts and duplicate entries."
- **Linux kernel** (`drivers/clk/samsung/clk-exynos5250.c` at `995832b`): a table "is sorted by (clock domain, register address," and contributors should "please make sure that the order is kept, to avoid merge conflicts". The key is meaningful (register address), not the alphabet. I found no kernel-wide rule.
- **eslint-plugin-simple-import-sort** (README at `7794d14`): sorting by the `from` string "prevents the imports from jumping around as you add and remove things," "keeping your git history clean and reducing the risk of merge conflicts." It also warns that reordering imports "can change the order" in which side effects run.
- **ESLint's own suppressions file** (PR #19711, 1.25): unsorted output caused "unnecessary `git` churn and even `git` conflicts".
- **For the post:** the mechanism is real and widely believed (any fixed order spreads insertions out), but every source is a project doc stating it, none measures it.

### 4.23 Projects that don't sort, or sort for other reasons. ANECDOTAL (project docs)

- **Chromium** (`docs/testing/web_test_expectations.md` at `d9d1581`): "The file is not ordered." "If you put new changes somewhere in the middle of the" / "file, this will reduce the chance of merge conflicts when landing your patch."
- **Mozilla** (`StrictOrderingOnAppendList`, `python/mozbuild/mozbuild/util.py` at `8903227`): "This enforces cleaner style in moz.build files."
- **Rushstack:** "reordering methods produces spurious diffs that make PRs hard to read." (1.17)
- **For the post:** what reduces conflicts is spreading out insertion points. Chromium gets that by asking people to insert in the middle. Sorting is one way; it isn't the only one, and a bulk re-sort is itself a change that conflicts with every open branch (4.29, case D).

### 4.24 Does sorting reduce merge conflicts? No study found. Negative finding (searches, 19 Oct 2026)

- Searched: the merge-conflict studies above (none tests ordering conventions); Google Scholar-style web searches for sorting, alphabetical order, lint rules and merge conflicts; GitHub docs of large projects. Found only the project statements in 4.22–4.23.
- **What the evidence does support:** conflicts come from edits to the same or adjacent lines (4.17, 4.16); appending at the end of a list makes every pair of additions adjacent; any fixed insertion order (alphabetical, by register address, or "somewhere in the middle") spreads additions out; merge tools solve the same problem by treating order as irrelevant, which is unsound for JavaScript (4.18–4.20).
- **For the post:** call it plausible and unmeasured, and note the one-off cost: enabling the rule on an existing codebase reorders lines on every open branch.

### 4.25 Git 2.23 (16 Aug 2019): `blame --ignore-rev` and `--ignore-revs-file`. VERIFIED (release notes, commits)

- **Citation:** Git 2.23.0 release notes (`Documentation/RelNotes/2.23.0.txt`): `"git blame" learned to "ignore" commits in the history, whose` effects get ignored. Barret Rhoden, commit `ae3f36de` "blame: add the ability to ignore commits and their changes" (15 May 2019): https://github.com/git/git/commit/ae3f36dea16e51041c56ba9ed6b38380c8421816
- **What it says:** "Commits that make formatting changes or function renames are often not" / "interesting when blaming a file." Projects "will maintain the file containing" / "revisions for commits that perform mass reformatting,". Its hard case is a reorder: "Commit X, which we will ignore, swaps these lines:", after which a line is "attributed to commit A, even though" it came from commit B.
- **Michael Platings, commit `1d028dc6`** (20 Jun 2019, also in 2.23): "In most cases formatting tools preserve line ordering, so the heuristic" / "is optimised for such cases." Sorting is the exception, and "the git blame -M option" / "can already be used to address this".
- **Naming:** the commit message says `--ignore-rev-file` and `blame.ignoreRevFile`; Git shipped `--ignore-revs-file` and `blame.ignoreRevsFile`.
- **For the post:** ignore-revs exists for reformatting commits, and its own author named reordered lines as the case it handles worst.

### 4.26 `git blame -M` and `git diff --color-moved` thresholds. VERIFIED (docs)

- **Citation:** git/git `47fdf22`, `Documentation/blame-options.adoc` and `Documentation/diff-options.adoc`; Git 2.15.0 release notes (tagged 30 Oct 2017).
- **What it says:** `-M`: "Detect moved or copied lines within a file." with a threshold whose "default value is 20." alphanumeric characters. Git 2.15: `"git diff" learned to optionally paint new lines that are the same` / `as deleted lines elsewhere differently`. The default `zebra` mode needs "Blocks of moved text of at least 20 alphanumeric characters"; `plain` "picks up any" moved line.
- **For the post:** a line like `port: 3000,` has 8 alphanumeric characters, under both thresholds. Short `key: value` lines are exactly what these tools miss by default.

### 4.27 GitHub supports `.git-blame-ignore-revs` (beta, 24 Mar 2022). VERIFIED (changelog, docs)

- **Citation:** https://github.blog/changelog/2022-03-24-ignore-commits-in-the-blame-view-beta/ ; https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files
- **What it says:** "It's now possible to ignore revisions in the blame view using a .git-blame-ignore-revs file". The file must be "in the root directory of your repository,". "If the commit was the last to modify a line," / "it will still appear in blame."
- **For the post:** a one-time re-sort can be hidden from blame on GitHub, with that caveat.

### 4.28 Git `merge=union`: keeps both sides, in no particular order. VERIFIED (docs)

- **Citation:** git/git `47fdf22`, `Documentation/gitattributes.adoc`.
- **What it says:** it takes "lines from both versions, instead of leaving conflict" markers. "This tends to leave the added lines in the" / "resulting file in random order and the user should" verify the result.
- **For the post:** the "keep both" shortcut gives up order, and in a JavaScript object that can silently lose an edit (4.29, case F).

### 4.29 My check (subagent A): merge and blame on one object literal (19 Oct 2026). VERIFIED (local run); re-run in the harness before quoting

- **Setup:** git 2.54.0 (Apple Git-157), default merge strategy, Node 24.14.1; small synthetic repos in `scratchpad/sortkeys-lit/A/gitdemo/`, scripts in `scratchpad/sortkeys-lit/A-scripts/` (`merge-demo.sh`, `blame-demo.sh`), outputs `A/text/merge-demo-output.txt` and `A/text/blame-demo-output.txt`.
- **Merges (one object literal, edited on two branches):**

| Case | What the branches did | Result |
| --- | --- | --- |
| A | both appended a key at the end | conflict |
| B | sorted object; new keys landed in different gaps | clean |
| C | sorted object; both new keys landed in the same gap | conflict |
| D | one branch re-sorted the object; the other edited one value | conflict |
| E | case A with `merge=union` | clean, both lines kept |
| F | case D with `merge=union` | clean but wrong: a duplicate `timeout` key; Node evaluates `timeout: 5000`, so the edit to 10000 is lost |
| G | both added the same key with different values | conflict (a real one) |

- **Blame after a sort commit** (ten keys added one commit each, then sorted, which moved 6 lines): plain `blame` attributes 4 of 10 lines to the commit that added them (6 to the sort); `--ignore-rev` 6 of 10 (3 to the wrong commit, 1 unblamable); `-M` 7 of 10 (the 3 short lines stay on the sort); `-M5` 9 of 10. `--color-moved` (zebra) marked 3 of the 6 moved lines; `plain` marked all 6.
- **For the post:** sorting helps in case B and not in case C, and the re-sort itself conflicts (D). Blame tools recover most of the history only with non-default settings.

### 4.30 Tómasdóttir, Aniche and van Deursen, "The Adoption of JavaScript Linters in Practice: A Case Study on ESLint" (IEEE TSE 2020). VERIFIED (accepted author manuscript)

- **Citation:** Kristín Tómasdóttir, Maurício Aniche, Arie van Deursen, _IEEE TSE_ 46(8), pp. 863–891, 2020. https://doi.org/10.1109/TSE.2018.2871058 (TU Delft repository copy).
- **What it says:** they "analyzed 9,548 ESLint configuration files" from GitHub projects. In the top 20 rules disabled by projects that don't use a preset, `sort-vars` is 7th (597 projects, 19.1%). `sort-keys` doesn't appear in either top-20 disabled list.
- **Caveat:** the data predates most adoption of `sort-keys` (the rule shipped in Aug 2016), and a rule that's off by default rarely needs disabling. Don't read the absence as acceptance.
- **For the post:** context only: the sorting rules people did turn off were the stylistic ones.

---

## 5. Agents and LLMs

Items 5.1–5.3 are order sensitivity in LLMs, for context only; 5.4–5.8 are studies of field order in structured output (the vendor docs are in 3.14); 5.9–5.14 are what agent vendors tell agents about diffs, conventions and lint fixes; 5.15–5.18 are studies of LLM-written code and agent pull requests. Files are in `scratchpad/sortkeys-lit/B/` unless noted. Agent prompt files are instructions to models and were read as data.

### 5.1 Chen, Chi, Wang and Zhou, "Premise Order Matters in Reasoning with Large Language Models" (ICML 2024). VERIFIED (arXiv full text, PMLR record)

- **Citation:** Xinyun Chen, Ryan A. Chi, Xuezhi Wang, Denny Zhou, Proceedings of the 41st ICML, PMLR 235:6596–6620, 2024. https://proceedings.mlr.press/v235/chen24i.html ; arXiv:2402.08939. All four authors list Google DeepMind (Chi also Stanford); Vendor.
- **What it says:** reordering premises causes "a performance drop of over 30%". Models are "more comfortable reasoning via reading left-to-right instead of back-and-forth" and tend to "use the rules in the sequential order as they present".
- **Numbers:** logic benchmark of 200 problems per rule count (4–12 rules) × 15 variants; with 12 rules, GPT-4-turbo 96.5% in forward order against 76.0% at τ=0.5. R-GSM: 220 problem pairs; GPT-4-turbo 94.1% → 85.0%.
- **Caveat:** R-GSM was built by trying orders "until an ordering that causes the LLM prediction failure is discovered", so it is adversarially selected.
- **For the post:** context only. Order that's logically irrelevant still changes what autoregressive models produce. It says nothing about code.

### 5.2 Option-order sensitivity: Pezeshkpour and Hruschka (Findings of NAACL 2024); Zheng et al. (ICLR 2024). VERIFIED (arXiv full texts)

- **Pezeshkpour and Hruschka**, "Large Language Models Sensitivity to The Order of Options in Multiple-Choice Questions," Findings of ACL: NAACL 2024, pp. 2006–2017. https://doi.org/10.18653/v1/2024.findings-naacl.130 ; arXiv:2308.11483. The gap is "approximately 13% to 75%" (arXiv) or "13% to 85%" (ACL Anthology abstract), defined as "the difference between" "the maximum and minimum LLMs’ performance" "when using an oracle ordering". Two models, five benchmarks. Vendor-neutral (Megagon Labs).
- **Zheng, Zhou, Meng, Zhou and Huang**, "Large Language Models Are Not Robust Multiple Choice Selectors," ICLR 2024; arXiv:2309.03882. Models "prefer to select specific option IDs as answers"; "selection bias arises less from LLMs’ position bias" than from bias toward ID tokens. 20 LLMs; moving gold answers to position D drops gpt-3.5-turbo "from 67.2 to 60.9" on 0-shot MMLU.
- **For the post:** context, and a caution. Headline order effects are often best-minus-worst bounds, and not every "order effect" is about position.

### 5.3 Liu et al., "Lost in the Middle: How Language Models Use Long Contexts" (TACL 2024). VERIFIED (full text)

- **Citation:** Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paranjape, Michele Bevilacqua, Fabio Petroni, Percy Liang, _TACL_ 12, pp. 157–173, 2024. https://doi.org/10.1162/tacl_a_00638
- **What it says:** "performance can degrade significantly when" the relevant information moves. One synthetic task uses "JSON-formatted key-value pairs and must return" the value for a key (75, 140 and 300 pairs, 500 examples each).
- **For the post:** context. Where a key sits in a serialised JSON object affected retrieval for some models in 2023. It's about reading long inputs, not writing code.

### 5.4 Tam et al., "Let Me Speak Freely?" (EMNLP 2024 Industry), and .txt's rebuttal. VERIFIED (paper); ANECDOTAL and Vendor (rebuttal)

- **Citation:** Zhi Rui Tam, Cheng-Kuang Wu, Yi-Lin Tsai, Chieh-Yen Lin, Hung-yi Lee, Yun-Nung Chen, EMNLP 2024 Industry Track, pp. 1218–1236. https://doi.org/10.18653/v1/2024.emnlp-industry.91 ; arXiv:2408.02442.
- **What it says:** on Last Letter, "we found that 100% of GPT 3.5 Turbo JSON-mode" responses put the "answer" key before "reason", "resulting in zero-shot direct answering". The authors conclude "The order of keys in structured outputs and" "the decoupling of reasoning from format adherence" matter.
- **Caveat:** one model, one task, in JSON mode (not schema-enforced). It's an observation, not a field-order ablation.
- **Rebuttal:** Will Kurt (.txt), "Say What You Mean: A Response to 'Let Me Speak Freely'" (https://blog.dottxt.co/say-what-you-mean.html, by Nov 2024): "the answer is a clear no." (structured generation doesn't hurt), arguing "the paper uses different prompts for structured generation and unstructured generation". Llama-3-8B: GSM8K 0.77 unstructured vs 0.78 structured. Neither side ran an order ablation.
- **For the post:** the first published sighting of an answer field generated before its reasoning, and a weak one.

### 5.5 Geng et al., "JSONSchemaBench" (arXiv 2025): order not measured. VERIFIED (full text)

- **Citation:** Saibo Geng, Hudson Cooper, Michał Moskal, Samuel Jenkins, Julian Berman, Nathan Ranchin, Robert West, Eric Horvitz, Harsha Nori, arXiv:2501.10868 v3, 27 Feb 2025. Microsoft co-authors (Vendor).
- **What it says:** "Key ordering within schemas was ignored" during deduplication; the quality tasks always use reasoning first (`{"reasoning":`).
- **For the post:** don't cite it for field order. It treats key order as irrelevant to a schema's identity.

### 5.6 Kumar, Kanishka and Mandora, "Structure Tax: How Structured Output affects LLMs Performance" (arXiv, 8 Oct 2026; AACL-IJCNLP 2026 per the arXiv comment). VERIFIED (full text)

- **Citation:** Vineet Kumar, Kanishka, Bhuvanesh Mandora (PayPal AI), arXiv:2610.12056 v1. The venue comes from the arXiv comment only.
- **What it says:** reasoning-first ordering "matches or exceeds free-form accuracy", while "answer-first ordering causes steep drops, particularly in smaller models". With the answer first, the reasoning can only "rationalize a decision already made". "Structured-output schema violations were zero for all experiments".
- **Numbers:** 5 models × 4 datasets (GSM8K test 1,319; LogicBench 500; MMLU validation 1,531; Spider validation 1,030), 5 runs each, temperature 0. GSM8K in JSON, answer-first against reasoning-first: Llama-3.1-8B 31.01 vs 80.21; GPT-4o 55.34 vs 95.60 (free form 88.78); Gemma3-4B 27.45 vs 83.53. Counterexample: Claude-Sonnet-4.5 96.13 answer-first vs 87.79 reasoning-first. Spider was roughly order-invariant. Reasoning-first wins the best-format cell "in 13 of 20 model-dataset pairs".
- **Method:** the schema and its order were given in the system prompt, not enforced by an API's constrained decoding.
- **For the post:** the one controlled measurement that the order of a reasoning field and an answer field changes accuracy, by a lot for some models and not at all, or the other way, for others. A preprint by one company; it hasn't been replicated.

### 5.7 Smaller studies and practitioner reports on field order. VERIFIED (preprint); ANECDOTAL (blogs, talk)

- **Lin, "Your Prompt Is Not the Only Prompt"** (arXiv:2608.08254, Aug 2026, single author): "The reasoning field was ordered before the label field"; it compares adding a reasoning field with none, not its position. "The evaluation set contained 48 items". Supporting colour only.
- **Kally Aleksiev, "Does Field Ordering Affect Model Performance?"** (blog, 21 May 2025, read via Wayback): "What happens if you shuffle the order of fields in your schema?" On an image-classification task, little difference for most of four GPT models (GPT-4.1 0.5227 vs 0.5040). Test size not stated. A counterweight.
- **Ivan Leo (Instructor), "Bad Schemas could break your LLM Structured Outputs"** (26 Sep 2024; 567-labs/instructor `035c77b7`): "Changing a single field name from `final_choice` to `answer`" moved accuracy from 4.5% to 95%; on "the first 200 questions from the GSM8k dataset", a `chain_of_thought` field declared before `answer` gave 92–94% against 33% without it. It tests the field, not its order, but alphabetically `answer` sorts before `chain_of_thought`.
- **Boris Lau (Khan Academy), PyData Global 2025 talk abstract** (10 Dec 2025): quality problems traced to "Python dictionary ordering and how different frameworks serialize JSON schemas". No numbers published.
- **For the post:** the practitioner evidence points the same way as 5.6 for reasoning tasks and finds little effect elsewhere. Say that it depends on the model and the task.

### 5.8 What follows for `sort-keys`: a hypothesis to test, not a finding

- The chain is documented at each step: a Zod or Pydantic schema's key order becomes the JSON Schema's order (3.13); OpenAI, Anthropic and now Gemini generate in that order (3.14); for some models and tasks, answer-first order costs accuracy (5.6). `sort-keys` and its fixers reorder the schema object like any other literal (1.13, 1.10).
- Nobody has measured the end-to-end effect of a lint fix on a schema. It would be a cheap experiment for the post: the same schema, sorted and unsorted, through one API.
- **For the post:** frame it as a hypothesis with each link sourced, and run it before claiming it.

### 5.9 OpenAI Codex: "Changes should be minimal", and don't hand-fix formatter output. VERIFIED (source at `09100872`); Vendor

- **Citation:** openai/codex `091008729d5572712ac08964a9602eb71cf31428`: `codex-rs/protocol/src/prompts/base_instructions/default.md` (the same lines are in `codex-rs/core/gpt_5_1_prompt.md` and `gpt_5_2_prompt.md`), `codex-rs/core/gpt_5_codex_prompt.md`, `codex-rs/prompts/templates/review/rubric.md`. OpenAI Cookbook, `examples/gpt-5/codex_prompting_guide.ipynb` and `gpt-5_prompting_guide.ipynb` at `3d3c283b`.
- **What it says:**
  - "Keep changes consistent with the style of the existing codebase." "Changes should be minimal and focused on the task." "do exactly what the user asks with surgical precision".
  - "If the codebase does not have a formatter configured, do not add one." If formatting still fails after three tries, "present them a correct solution where you call out the formatting".
  - Don't hand-patch output from "running a lint or format command like gofmt". "NEVER revert existing changes you did not make unless explicitly requested".
  - The review rubric: "Ignore non-blocking issues such as style, formatting, typos, documentation, and other nits."
  - Cookbook: "Conform to the codebase conventions: follow existing patterns, helpers, naming, formatting".
- **For the post:** OpenAI's agent puts correctness ahead of formatting, keeps diffs small, and trusts formatter output. A `sort-keys` error asks for a non-minimal, behaviour-relevant edit dressed as style.

### 5.10 Anthropic: "Only make changes that are directly requested", formatters as hooks, and "Never change what the code does". VERIFIED (docs, published plugins at `a6e289a2`); Vendor

- **Citations:** "Prompting best practices," https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices ("Overeagerness" sample prompt); Claude Code docs: https://code.claude.com/docs/en/hooks-guide, …/best-practices, …/agent-sdk/modifying-system-prompts; anthropics/claude-code `a6e289a2e772a17b3614a9ef43303003de5cd887`: `plugins/code-review/commands/code-review.md`, `plugins/feature-dev/commands/feature-dev.md`, `plugins/pr-review-toolkit/agents/code-simplifier.md`.
- **What it says:**
  - The sample prompt for over-eager models: "Only make changes that are directly requested or clearly" necessary. "A bug fix doesn't need surrounding code cleaned up." It's a prompt for users to add, not a description of default behaviour.
  - The hooks guide shows a PostToolUse Prettier hook that runs "on every file Claude edits, so formatting stays consistent". Best practices: put "Code style rules that differ from defaults" in CLAUDE.md.
  - Claude Code's own system prompt isn't published; the Agent SDK documents a `claude_code` preset without its text.
  - Plugins: reviewers shouldn't flag "Issues that a linter will catch (do not run the linter to verify)" or "Pedantic nitpicks that a senior engineer would not flag"; "Follow codebase conventions strictly"; the code simplifier: "Never change what the code does - only how it does it."
- **For the post:** the documented pattern is to run formatters and fixers automatically after every agent edit. An autofixing sort rule in that hook reorders keys without the agent deciding to, and "never change what the code does" is the guarantee such a fix can break silently.

### 5.11 Google Gemini CLI: follow conventions, never suppress, run `eslint --fix`. VERIFIED (source at `76e4d7c0`); Vendor

- **Citation:** google-gemini/gemini-cli `76e4d7c046c7dab5727787da378b9c06bf0948cf`, `packages/core/src/prompts/snippets.ts`.
- **What it says:** "Rigorously adhere to existing workspace conventions, architectural patterns, and style". "NEVER use hacks like disabling or suppressing warnings". "Avoid unrelated refactoring or "cleanup" of outside code." Before editing by hand, check if a tool "(like 'eslint --fix', 'prettier --write'" can do it.
- **For the post:** hypothesis: under this prompt, an agent facing a sort-keys error runs the fixer rather than adding a disable comment, and inherits the fixer's behaviour (1.15, 3.3).

### 5.12 GitHub Copilot and Cursor: conventions go in instructions, style goes to the linter. VERIFIED (docs); Vendor

- **GitHub** ("Get the best results from Copilot cloud agent", docs.github.com, 19 Oct 2026): `.github/copilot-instructions.md` should list "any coding standards or conventions you want Copilot to follow"; the agent can "execute automated tests and linters and more". No vendor-written minimal-diff rule; the system prompt isn't published.
- **Cursor** (https://cursor.com/docs/rules.md): don't paste style guides into rules: "Use a linter instead. Agent already knows common style conventions."
- **For the post:** Cursor hands style to the linter, so the linter's rules become the agent's rules.

### 5.13 Aider and Cline: "Do what they ask, but no more." VERIFIED (source)

- **Aider** (Aider-AI/aider `5dc9490b`): `overeager_prompt` in `aider/coders/base_prompts.py`: "Do what they ask, but no more." "Do not improve, comment, fix or modify unrelated parts of the code" (`editblock_prompts.py`); "Respect and use existing conventions, libraries, etc". The over-eager prompt is added only for models flagged `overeager: true` in `model-settings.yml` (64 entries, including Claude 3.7 Sonnet and Gemini 2.5; that the flag means the maintainers judged them to over-edit is an inference).
- **Cline** (cline/cline `ca7402c5`, `sdk/packages/shared/src/prompt/system/act.ts`): "Always adhere to existing code conventions and patterns."
- **For the post:** every agent prompt checked says to follow existing conventions and keep changes small. A newly enabled sort rule on an existing codebase asks for the opposite.

### 5.14 TanStack tells agents directly that order matters. VERIFIED (package source)

- **Citation:** TanStack/router `ed557759`, `packages/router-core/skills/router-core/data-loading/SKILL.md`, an agent skill shipped with the package (3.4).
- **What it says:** "Router infers types from earlier properties into later ones." "context from `beforeLoad` is unknown in the loader" when declared out of order.
- **For the post:** a library now writes order rules for agents in its own package. An agent that reads the skill and then runs `ultracite fix` gets two instructions that disagree, one of them applied automatically.

### 5.15 Wang et al., "Beyond Functional Correctness: Investigating Coding Style Inconsistencies in Large Language Models" (FSE 2025). VERIFIED (arXiv full text)

- **Citation:** Yanlin Wang, Tianyue Jiang, Mingwei Liu, Jiachi Chen, Mingzhi Mao, Xilin Liu, Yuchi Ma, Zibin Zheng, _Proc. ACM Softw. Eng._ 2(FSE), Article FSE032, July 2025. https://doi.org/10.1145/3715749 ; arXiv:2407.00456.
- **What it says:** the 24-type taxonomy includes "Code Ordering Inconsistency": "Inconsistencies in the order of semantically similar code blocks, such as import" statements and assignments. Nothing on object or dict keys.
- **Numbers:** 230 Python CoderEval tasks × 5 models; 1,179 analysed samples; inconsistency rates 66.2–90.1% by model.
- **For the post:** the closest study to LLMs and ordering style, and it doesn't cover key order.

### 5.16 Liu et al., "Refining ChatGPT-Generated Code" (TOSEM 2024). VERIFIED (arXiv full text)

- **Citation:** Yue Liu, Thanh Le-Cong, Ratnadira Widyasari, Chakkrit Tantithamthavorn, Li Li, Xuan-Bach D. Le, David Lo, _ACM TOSEM_ 2024. https://doi.org/10.1145/3643674 ; arXiv:2307.12596.
- **What it says:** Pylint, Flake8, PMD and Checkstyle on 4,066 programs for 2,033 LeetCode tasks, but "we choose to ignore messages related to style issues such as whitespace". Among passing programs, 53% of the Java "code and 37% of the Python code exhibited code style and maintainability issues".
- **For the post:** linter studies of LLM code usually drop pure style rules, so there's no data on key order.

### 5.17 Agent pull requests: style fixes and unrelated edits (TOSEM accepted; MSR 2026). VERIFIED (arXiv full texts)

- **Watanabe, Li, Kashiwa, Reid, Iida and Hassan, "On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub"** (arXiv:2509.14745 v3, 9 Feb 2026; accepted at TOSEM per the PDF): 567 Claude Code PRs in 157 projects; 83.8% merged; 50 of 214 modified PRs (23.4%) had style revisions, including "incorrect import ordering". "current agents often underperform on project-specific style rules".
- **Ehsani, Pathak, Rawal, Al Mujahid, Imran and Chatterjee, "Where Do AI Coding Agents Fail?"** (MSR 2026 Mining Challenge; arXiv:2601.15195): 33,596 agent PRs; 600 rejected PRs hand-coded. Maintainers discourage PRs "that combine substantive modifications with unrelated edits" (not quantified as a category).
- **Liu, Widyasari, Zhao, Irsan, Chen and Lo, "Debt Behind the AI Boom"** (arXiv:2603.28592 v3, 13 Oct 2026): 302.6k AI-authored commits in 6,299 repos; its example is ESLint flagging a duplicate "object key in a Claude-authored commit" (`no-dupe-keys`). ESLint configuration not stated.
- **For the post:** agents do get style wrong, mostly by missing a project's conventions, and maintainers dislike unrelated edits, which a whole-file re-sort is.

### 5.18 Studies of agents and `sort-keys`: none found. Negative finding (searches, 19 Oct 2026)

- Searched arXiv, ACL Anthology, ACM and the AIDev papers for object key order, `sort-keys`, `useSortedKeys` and key ordering in LLM or agent code. Nothing. The nearest are 5.15 (ordering of code blocks and imports, Python) and Ultracite's own TODO experiment, where the fix pass, not the agents, reordered keys (6.4).
- **For the post:** whether agents write sorted keys when a project enforces them, and whether they break order-dependent code when they sort by hand, are open questions. The agent experiment could answer the second.

---

## 6. Ultracite's own history

6.1 is the timeline from `git log -S`, the changelog, npm publish dates and read-only `gh` searches of issues, PRs and discussions on haydenbleasel/ultracite (search terms: "sort-keys", "useSortedKeys", "sorted keys", "key order", "sort keys", "sortKeys", "jsx-sort-props", "useSortedAttributes", "alphabetical"). 6.2–6.3 are the two bug reports. 6.4 is where Ultracite's own code and research ran into the rule. 6.5–6.6 are what the presets and docs say now. Commit messages are saved in `scratchpad/sortkeys-lit/main/src/ultracite-commit-messages.txt`.

### 6.1 Timeline: off for almost four years, on in Oxlint from V7, in ESLint and Biome by mid-2026. VERIFIED (git history, changelog, npm registry)

| Date | Commit (release) | What happened to key sorting |
| --- | --- | --- |
| 18 Mar 2022 | `e403fb15` "Create ESLint configuration" | `"sort-keys": "off"` (with `sort-imports`, `sort-vars` and `react/jsx-sort-props` off), in an alphabetised list of every core rule |
| 14 Jan 2023 | `5b7d6da3` Harmony V2 (#83) | still `'sort-keys': 'off'` in the flat config |
| 29 Jun 2024 | `e6f31237` "Use new eslint/js for rules" | switched to `@eslint/js` `configs.all`; `'sort-keys': 'off'` kept as an override |
| 18 Jul 2024 | `c92a9d2e` Biome switch (#140; v4.0.0, 19 Jul 2024) | ESLint config deleted. Biome 1.x had no key-sorting action |
| 22 Jun 2025 | `871ee738` Ultracite v5 (#162; 5.0.0) | Biome 2 config: `useSortedKeys` explicitly `"off"` (squash message: "Disable useSortedKeys and useUniqueElementIds"); `useSortedAttributes` `"on"` |
| 28 Dec 2025 | `c4a205f8` V7 (#466; 7.0.0, 1 Jan 2026) | Oxlint added with `categories: { style: "error", … }`, so Oxlint's `sort-keys` (style, with a safe fix since Oxlint 1.19.0) came on. ESLint core: `"sort-keys": "off"`. Biome: still off |
| 31 Mar 2026 | `8d11d8bb` "Run fix" | the repo's own `.oxlintrc.json` turns `sort-keys` off for `packages/cli/src/oxlint.ts`; later extended to the Oxlint preset files (`014a687e`, `5437f815`, Apr 2026) |
| 13 Apr 2026 | `a63d9c57` "Resolves #660" (7.5.7) | categories replaced by explicit lists; `"sort-keys": "error"` now named in Oxlint core |
| 10 May 2026 | `44f6d7fe` "Align ESLint with Oxlint" (7.7.0) | ESLint override removed; changeset: "`eslint.mjs` now enforces `complexity`," followed by `no-unused-private-class-members`, `sort-keys` and `sort-vars` |
| 4 Jul 2026 | `2687cf9f` (7.9.0, 5 Jul 2026) | Biome `useSortedKeys` on, with the comment "Matches sort-keys in" / "the oxlint/ESLint configs." |
| 4 Jul 2026 | `44403937` (7.9.0) | `sonarjs/shorthand-property-grouping` off: "Conflicts with sort-keys." |
| 6 Aug 2026 | `dc78be4f` "Exempt TanStack route files from key sorting" (#762; 7.10.2) | Biome `useSortedKeys` and Oxlint `sort-keys` off in route files |
| 7 Sep 2026 | `a71dda4c` "Disable key sorting across the TanStack presets" (#801; 7.11.1) | off for all files in the Oxlint and Biome TanStack presets |
| 28 Sep 2026 | `d9803a6e` (7.12.2) | ESLint TanStack preset: `sort-keys` off, "matching the Oxlint and Biome TanStack presets" |
| 10 Oct 2026 | `2419264b` "Move the blog research harnesses into research/" | `research/` excluded from Oxlint because "lint autofixes changed the scripts' output" |

- **No rationale was recorded.** No commit message, changeset, changelog entry, issue, PR or discussion gives a reason for turning key sorting on. Every switch to on is a side effect of a policy step: the `style` category in V7, explicit lists in #660, "Align ESLint with Oxlint", "Align ESLint and Biome presets to the oxlint benchmark". The reason has to come from Hayden. (For the TODO rules, the answer was the strictness policy; todo-comments.md 7.1.)
- **For the post:** the history is the reverse of the TODO rules': key sorting was deliberately off in Ultracite's first ESLint config and for almost four years after, came on as part of the Oxlint benchmark, and then needed exemptions within weeks. Keep dates and preset names out of the post.

### 6.2 Issue #762: Biome's `useSortedKeys` broke TanStack Router types (6 Aug 2026). VERIFIED (issue, commit); report ANECDOTAL as a measurement

- **Citation:** pati (`EmojiPati`), "Biome preset: `assist/source/useSortedKeys` rewrites TanStack `createFileRoute` options in a type-breaking order," haydenbleasel/ultracite #762, 6 Aug 2026; closed 7 Aug 2026 by `dc78be4f`.
- **What it says:** since 7.9.0, `ultracite fix` rewrites `createFileRoute()` options "in **alphabetical key order**", so `head`'s `loaderData` becomes `never` and type-checking fails with "`TS2339: Property '...' does not exist on type 'never'`". Because `useSortedKeys` "is a **source action**, not a plain lint rule", "the damage happens silently during the fix pass".
- **The reporter's numbers (one sanitised codebase):** 413 files checked, 650 diagnostics, 105 of them `useSortedKeys`; `--write` modified 59 files and broke type-checking in 6 (9× TS2339). Query options were also flagged but harmless.
- **The fix:** route files exempted in Biome and Oxlint. Hayden: "the exemption is path-based (Biome can't scope assist actions by call expression)".
- **Wrong in the report:** "oxlint's `sort-keys` is a plain lint error without an autofix" (it has had one since Oxlint 1.19.0, Sep 2025; 1.13), and "`sort-keys`" "is not enabled in the ESLint preset" (it had been since 7.7.0, through `configs.all`).

### 6.3 Issue #801: Oxlint's fix broke TanStack Query mutation types (7 Sep 2026). VERIFIED (issue, commit, my reproduction in 3.3)

- **Citation:** pati (`EmojiPati`), "oxlint/tanstack: sort-keys autofix breaks mutation onMutate result inference," #801, 7 Sep 2026; closed 8 Sep 2026 by `a71dda4c`.
- **What it says:** "TypeScript passes with `onMutate` before `onError`;" / "`ultracite fix` exits successfully and moves `onError` first;" / "the next typecheck fails" with "`error TS2339: Property 'previous' does not exist on type '{}'.`" The file was a plain hook outside `routes/`, so the #762 exemption didn't cover it. "A style autofix should not turn type-correct code into a type error."
- **Hayden's reply:** "it turned out to be broader than the oRPC wrapper:" / "a plain `useMutation({ mutationFn, onMutate, onError })` breaks the same way," / "and the Biome preset had the identical defect". The cause is "TypeScript inferring `TContext` from context-sensitive callbacks in source order". "a glob-scoped exemption can't be made correct", so key sorting went off for every file in the TanStack presets.
- **One claim in the reply was wrong:** "The ESLint preset was already unaffected (it never enabled `sort-keys`" … ). ESLint core had enabled it since 7.7.0 (May 2026). ESLint's rule has no fix, so `ultracite fix` didn't reorder anything, but it reported the inference-safe order as an error, next to `@tanstack/query/mutation-property-order` asking for the opposite. Under `ultracite fix --claude/--codex`, that error goes to an agent, whose only clean fix is to reorder the keys by hand. `d9803a6e` (28 Sep 2026) turned it off in the ESLint TanStack preset.
- **For the post:** the clearest real case: a passing type-check, a successful `ultracite fix`, then two type errors, from a rule sold as tidiness.

### 6.4 Where Ultracite's own code and research ran into the rule. VERIFIED (repo files, commits, committed reports)

- **The TODO-comments experiment** (`research/agent-experiment/results/todo-comments/REPORT.md`, §1.2 and §9.5): preparing the subjects with `oxlint --fix` reordered keys the code serialises. "In B, `JSON.stringify({ type: "custom", event, data })` now sends `{"data":…,"event":…,"type":"custom"}`." "In C, `serializeAsJSON` writes the `.excalidraw` file's keys in another order." "Both still parse to the same objects; the bytes differ." The harness then had to prove the traces "differ from the corpus subject's only in the key order of serialised JSON".
- **The research harnesses are excluded from Oxlint** (`oxlint.config.ts`): "lint autofixes" / "(sorted keys, rewritten regexes) would change their output, which has to" / "stay byte-for-byte reproducible." (Commit `2419264b`: "research/ is excluded from Oxlint because lint autofixes changed the scripts' output".)
- **The preset files are exempt** (`oxlint.config.ts` override for `packages/cli/config/oxlint/**/*.mjs`), because rule maps are grouped by plugin with section comments and alphabetised within each group. AGENTS.md: "The `sort-keys` lint rule is off for preset files," / "so keep that order by hand." That's a categorical order (by plugin) that global alphabetical sorting would destroy, which is the HCI finding in 4.2 and 4.7.
- **A test had to hide an object from the rule** (`packages/cli/__tests__/schemas.test.ts`, from `9a9beb0e`): "A string, not an object literal: the repo's sort-keys autofix would" / "reorder the keys this test is about." The same commit fixed `ultracite init` scrambling users' `package.json` key order ("every init scrambled the file"), because people care about that order.
- **Generated config order** (PR #703, May 2026): "oxlint's sort-keys rule wants properties alphabetical," / "so ignorePatterns goes after extends in the generated config."
- **For the post:** the strongest evidence that order is observable comes from Ultracite's own repo: its research had to opt out of the rule to stay reproducible, and its own tests had to dodge it.

### 6.5 What the presets set now (worktree at `f8960ace`, 19 Oct 2026). VERIFIED (config source, resolved configs)

- **Oxlint core** (`config/oxlint/core/index.mjs`): `"sort-keys": "error"`, default options; `"sort-imports": "off"` ("Rely on oxfmt `sortImports` instead"); `"sort-vars": "error"`. Oxlint 1.86.0 classes the rule as `style` with `conditional_fix`, so `oxlint --fix` (and `ultracite fix`) applies it.
- **Oxlint TanStack:** `"sort-keys": "off"` for all files. The comment says "The TanStack ESLint plugins'" `*-property-order` rules "enforce the inference-safe order instead." (the source splits this over two comment lines); in Oxlint only `react-doctor/tanstack-start-route-property-order` exists, in the opt-in `tanstack/js-plugins` preset (see the notes for Hayden).
- **Oxlint js-plugins:** `"sonarjs/shorthand-property-grouping": "off"` ("Conflicts with sort-keys.").
- **ESLint core:** `sort-keys` comes from `@eslint/js` `configs.all` as `"error"` with default options (resolved: `"error"`); `sort-imports` off (citing eslint/eslint#11542); `sort-vars` `"error"`. ESLint's rule has no fix.
- **ESLint TanStack:** `"sort-keys": "off"` for all JS/TS files; every `@tanstack/eslint-plugin-query` and `-router` rule is on, including `mutation-property-order`, `infinite-query-property-order` and `create-route-property-order`.
- **ESLint React:** `"react/jsx-sort-props": "off"`.
- **Biome core:** assist actions on: `useSortedKeys` (comment: "Matches sort-keys in" / "the oxlint/ESLint configs."), `useSortedAttributes`, `useSortedInterfaceMembers`, `useSortedProperties`, `useSortedTypeFields`, `useSortedSelectionSet` and `useSortedPackageJson`; off: `useSortedEnumMembers`. JSON assists are disabled except for `package.json` and `.github/**/*.json`, where `useSortedKeys` is off so `useSortedPackageJson` can run.
- **Biome TanStack:** `useSortedKeys` `"off"` for all files.
- **The repo itself** (`oxlint.config.ts`): `research/` ignored; `sort-keys` off for `packages/cli/src/oxlint.ts` and `packages/cli/config/oxlint/**/*.mjs`.
- **The AGENTS.md template** (`src/data/rules.ts`) and `skills/ultracite/references/code-standards.md` say nothing about key order (`git grep`).

### 6.6 How Ultracite describes key sorting. VERIFIED (docs components)

- **The Biome landing page** (`apps/docs/components/providers/biome/formatter.astro`, from `32089867`, 10 Oct 2026): Biome's assist actions "sort code instead of just reporting it. Ultracite turns on nine of them, so" "the import order, class order and key order an agent writes never come up" "in review." The `useSortedKeys` card reads "Object keys, JSX attributes, interface members, CSS properties and package.json fields," / "in order. `check` fails on any that aren’t."
- **The Oxlint landing page** (`apps/docs/components/providers/oxlint/everywhere.astro`) uses `eslint(sort-keys)` "Object keys should be sorted" as one of its sample diagnostics.
- **For the post:** Ultracite's own pitch is the tidiness argument, applied to agents: sorting removes a class of review comments. The post should take that claim seriously and say what it costs.

---

## Notes on Ultracite's presets (for Hayden, not for the post)

Checked in the worktree (`research/sort-keys`, at `f8960ace`) on 19 Oct 2026. Per AGENTS.md, these are for you to decide on, not to write around.

**Rationale**

- **No reason for turning key sorting on was ever recorded** (6.1). It was off from 2022 to 2025 in ESLint and Biome, came on in Oxlint through the `style` category in V7, and reached ESLint (7.7.0) and Biome (7.9.0) as alignment to the Oxlint benchmark. Is the reason the strictness policy, as for the TODO rules? The post needs your answer.

**Inconsistencies between linters**

- **The three linters sort into different orders** (1.16). ESLint and Oxlint use code-unit order with `caseSensitive: true`; Biome uses natural order with `A < a < B < b`. A file sorted by Biome fails ESLint and Oxlint on capitals, `$`/`_`, numbered names (`item2`/`item10`), integer keys and accents, and vice versa (7 objects each way in a 20-object fixture). The Biome comment ("Matches sort-keys in" / "the oxlint/ESLint configs.") is true of on/off, not of order. Switching linters with `ultracite init` will re-sort a codebase. Options: set ESLint/Oxlint `natural: true, caseSensitive: false` (closer to Biome, but not identical), set Biome `sortOrder: "lexicographic"` (check its case handling), or accept and document it.
- **Fix behaviour differs:** Oxlint and Biome reorder silently in `ultracite fix`; ESLint can't fix, so every `sort-keys` error goes to the agent under `--claude/--codex`, which then reorders by hand. The agent prompt says "Make the minimal change that resolves each issue while preserving runtime behavior." and "Do not add suppression comments"; for an object whose order is observable, those can't both be met, and "Left for review" is the only honest exit.
- **TanStack replacements exist only in ESLint.** The Oxlint and Biome TanStack presets turn sorting off and their comments say the TanStack plugins' `*-property-order` rules "enforce the inference-safe order instead". In Oxlint only react-doctor's route-order rule exists (in the opt-in `tanstack/js-plugins` preset); nothing covers `mutation-property-order` or `infinite-query-property-order`. In Biome, nothing does. Your #801 reply suggested bringing the Query rule into Oxlint as a JS plugin.
- **JSX attribute sorting is Biome-only:** `react/jsx-sort-props` is off in ESLint, Oxlint has no such rule, and Biome's `useSortedAttributes` is on.
- **Interface members:** Biome's `useSortedInterfaceMembers` (alphabetical) is on; ESLint's `@typescript-eslint/member-ordering` is on with its kind-based default; Oxlint has neither.

**Bugs that affect Ultracite's users now (this repo's tool versions)**

- **Oxlint 1.86.0's fix changed a duplicate key's value** in a 22-property object (1.15). Fixed in 1.88.0 (#27579). `no-dupe-keys` reports the duplicate anyway, but the fix pass runs first.
- **Oxlint 1.86.0's fix moved three properties into a line comment** (`{ c: 1, b: 2, a: 3, // first row\n d: 4 }` → `{ a: 3 }`), and `oxfmt` afterwards didn't undo it (1.15). I found no upstream issue for this exact case; #27704 (trailing comma into a comment, open) is the nearest. Worth reporting, and worth an Ultracite test. `ultracite fix` runs `oxlint --fix` before `oxfmt`, so unformatted input (pasted or agent-written code, or the post-edit hook) can hit it.
- **Biome 2.5.15's "safe" fix turns a property into comment text** (#12057, open; PR #12306), reproduced here with the formatter on and off (1.12).
- **The TanStack-shaped inference failures are reproducible without TanStack** (3.3). Any library with producer/consumer callbacks in one options object is affected: Redux Toolkit's `configureStore` (Oxlint #25703), TanStack Form or Table if they have the same pattern (not checked), oRPC wrappers (#801). A preset per framework can't cover them all.

**Small things**

- **Biome core comments are wrong for three actions:** `useSortedProperties` says "JavaScript object properties" but it sorts CSS properties (semantically, not alphabetically); `useSortedTypeFields` says "TypeScript type alias members" but it sorts GraphQL type fields; `useSortedEnumMembers` is off ("Off because reordering" / "members changes the implicit numeric values of the enum."), but Biome's action only sorts string enums ("members in string enums"). String enum order is still observable through `Object.keys`, so off may still be right, for a different reason.
- **`useSortedSelectionSet` is on** and is an unsafe fix that changes GraphQL response key order (3.12). It only applies under `ultracite fix --unsafe`, I assume (not tested).
- **The repo's own override names a file that no longer exists:** `packages/cli/src/oxlint.ts` in `oxlint.config.ts`.
- **The Biome landing page** credits `useSortedKeys` with JSX attributes, interface members, CSS properties and package.json fields, which are separate actions (6.6).
- **Ultracite's ESLint preset comment** cites eslint/eslint#11542 for `sort-imports`; that issue is about `sort-imports` evaluation order, so the citation is right (D18), just not about keys.
- **The worktree has an in-progress `sort-keys` corpus harness** (`research/corpus/scripts/sort-keys-*.cjs`, `results/sort-keys/`, `calibration/sort-keys/`, all untracked). Nothing in this bibliography reads or depends on it.

**For the harness, before the post**

- Move `scratchpad/sortkeys-lit/lint-check/` (the 20-case fixture, `run.mjs`, the TypeScript inference file and the comment-move case) into `research/corpus/calibration/sort-keys/`, and run it with each linter as Ultracite configures it (presets, not isolated rules), on both Oxlint 1.86.0 and ≥1.88.0.
- Move subagent A's merge and blame demo (`scratchpad/sortkeys-lit/A-scripts/`) into the harness if the post uses it.
- A census of `sort-keys` fixes over the corpus that change observable behaviour: objects passed to `JSON.stringify`, objects with call-valued properties, objects with context-sensitive callbacks (type-check before and after `oxlint --fix`), and duplicate keys.
- A structured-output experiment (5.8): one schema, sorted and unsorted, through one API.

---

## Things that turned out wrong or different

**Corrections to the brief**

- **`sort-keys` was off in Ultracite's first ESLint config, not on.** `e403fb15` (18 Mar 2022) has `"sort-keys": "off"`, and it stayed off in ESLint until 7.7.0 (10 May 2026).
- **The changelog line saying `eslint.mjs` "now enforces" `sort-keys` is from 7.7.0** (`44f6d7fe`, "Align ESLint with Oxlint"), not from V7. In V7 (`c4a205f8`) ESLint had it off; Oxlint had it on through `categories.style`.
- **`a63d9c57` didn't turn `sort-keys` on.** It named a rule that V7's `style` category had already enabled.
- **ESLint's rule shipped in v3.3.0 (12 Aug 2016)** from issue #6076 and PR #6800 by Toru Nagashima. The JSCS rule is `validateOrderInObjectKeys` (JSCS 2.1.0, 11 Aug 2015).
- **TSLint's rule came first** (`sort-object-literal-keys`, 2.3.0-beta, June 2015), two months before JSCS's.
- **Biome's `useSortedKeys` first shipped in Biome 2.0.0 (17 Jun 2025)**, for both JS and JSON; Biome 1.x had no key sorting.
- **Oxlint's fix arrived a year after the rule:** rule v0.9.4 (Sep 2024), fix v1.19.0 (Sep 2025).
- **Reports about which linter fixes:** Ultracite #762 said Oxlint's rule had no autofix and ESLint's preset didn't enable it; both wrong at the time. Hayden's #801 reply said ESLint "never enabled `sort-keys`"; it had since 7.7.0.

**Rules and tools (section 1)**

- **ESLint's maintainers declined an autofix four times** (#7714, #10715, #16167, #18741) and suggestions once (#14021). The first refusal was about semantics; the later ones cite the freeze on stylistic rules.
- **"Object key ordering is set in ES2015" is half right.** ES2015 defined `[[OwnPropertyKeys]]`, but `Object.keys` and `JSON.stringify` stayed tied to the unspecified `for-in` order until ES2020 (#1793).
- **ESLint checks `[b]` as the key `b`.** A computed identifier key is compared by the variable's name, not its value. Oxlint 1.86.0 skipped such keys; 1.89.0 matches ESLint.
- **Biome said assists "must not change the semantics of a program"** before 2.0 (Wayback, Apr 2025), then documented that `useSortedKeys` "technically changes the semantics" while keeping it "safe".
- **perfectionist and Biome both call their fix safe.** Both handle spreads; neither handles values with side effects, serialised output or types.
- **Oxlint's maintainer calls key sorting "unsafe"** (#19696) while the fix ships as a normal, non-dangerous fix.
- **TSLint's rationale was merge conflicts,** ESLint's and Oxlint's is finding and diffing, JSCS's was "neat and tidy", perfectionist's is speed, uniformity and "a beauty salon". None cites evidence.
- **Popular configs leave `sort-keys` off.** Airbnb sets it off; standard, XO, Next.js, Vercel and Rushstack don't set it; Google comments it out; eslint-config-love calls it "too much". Only canonical sorts object keys, through perfectionist.
- **#11542 is about `sort-imports`,** not `sort-keys`.
- **typescript-eslint's `member-ordering` isn't alphabetical by default** (`as-written` within groups) and has no fix.
- **Go's json v2 doesn't sort map keys by default;** only v1 does.
- **The Python 2.6 `json` docs call `sort_keys=True` the default;** the source says `False`.
- **Prettier refused key sorting in 2017–2018** on the same grounds as ESLint ("potentially unsafe because of side effects").

**JavaScript and JSON (section 2)**

- **Integer-like keys can't be reordered by sorting.** They always iterate first, ascending, so Biome's natural sort of `{ 1, 10, 2 }` changes nothing observable, and ESLint's code-unit order (`1, 10, 2`) accepts the source as is.
- **The V8 advice is consistency, not alphabetical order,** and the one measured gain (TypeScript compiler, 8–10%) came from consistent initialisation, not from sorting.

**Libraries (section 3)**

- **PR #48538's title is "Improve inference for context sensitive functions in object and array literal arguments";** "Improved Function Inference in Objects and Methods" is the release-notes heading. #47599 is "Improve inference in the presence of context-sensitive expressions" and is still open.
- **React Native doesn't depend on key order for margins;** Yoga picks the most specific edge. The web does.
- **The React shorthand warning (2018) shipped only in 16.13.0 (2020)** and fires on re-render, not first mount.
- **MongoDB's driver docs don't recommend a `Map` for sorts;** only its types accept one.
- **Zod's docs say nothing about key order;** the behaviour is from source.
- **webpack treats condition order as significant and subpath order as not.**
- **The React, Yoga and RN website repos moved** from `facebook/` to `react/`.

**Readability and merges (section 4)**

- **Card 1982's online abstract has no findings;** its results are known secondhand. Hornof and Kieras's "Card [3]" is the 1984 chapter.
- **Bailly et al. summarise McDonald et al. as "no difference"** for known labels; McDonald et al.'s abstract says categorical was superior, "particularly" with definitions.
- **Ghiotto et al. is IEEE TSE 46(8), 2020;** 2018 is the early-access year.
- **The ICSE 2020 Brindescu paper's authors are Brindescu, Ahmed, Leano and Sarma;** the EMSE 2020 paper's are Brindescu, Ahmed, Jensen and Sarma.
- **Apel et al.'s 34% reduction applies in 60% of merge scenarios,** not overall.
- **Git's ignore-revs options shipped as `--ignore-revs-file` and `blame.ignoreRevsFile`;** the original commit message says `--ignore-rev-file`.
- **Chromium asks for insertions in the middle, not sorting;** Mozilla sorts for "cleaner style", not conflicts.

**Agents and LLMs (section 5)**

- **Anthropic does document property order** in structured outputs (required properties first), and separately warns that a reasoning field can trigger a refusal.
- **Gemini sorted schema properties alphabetically by default until Nov 2025.**
- **Tam et al.'s key-order finding is one observation in JSON mode;** JSONSchemaBench never varies order; Lin 2026 compares adding a field, not where it goes; Structure Tax sets the schema in the prompt.
- **OpenAI never tells you to put reasoning first;** its examples do.
- **The Wang et al. FSE 2025 title is "Beyond Functional Correctness: Investigating Coding Style Inconsistencies in Large Language Models".**
- **Pezeshkpour and Hruschka's gap is "13% to 75%" on arXiv and "13% to 85%" in the ACL Anthology abstract,** an oracle best-minus-worst figure.

---

## Unverified or dropped

**History and rules (section 1)**

- **Whether TSLint's merge-conflict rationale had any data behind it.** None was given in PR #1311.
- **pnpm's handling of dependency order on write.** Not confirmed.
- **Whether eslint-config-xo or other configs ever enabled `sort-keys` in the past.** Only current versions were checked.
- **Whether Biome's JSON `useSortedKeys` sorts `package.json` `exports` conditions** when enabled. Not tested; Ultracite doesn't enable it there.
- **Oxlint 1.88.0 and 1.89.0 behaviour on the comment-move case.** Only 1.86.0 is installed; the 1.89.0 source still has the same-line comment lift, so it probably persists, but that is a reading, not a run.

**JavaScript (section 2)**

- **How linters treat `["__proto__"]`** (a computed own property) next to `__proto__:` (the prototype setter). Not tested.
- **A measurement of sorted versus unsorted literals on engine performance.** None found; the ESLint #17347 argument that sorting can add shapes is unmeasured.

**Libraries (section 3)**

- **Storybook `controls.sort: 'none'`.** Dropped: unclear that "processed" order means literal key order.
- **Not checked:** Mongoose sort docs, npm docs on `package.json` field order, HTTP header objects, ESLint flat-config objects, Vue/Nuxt option merging, styled-components, TanStack Form and Table.
- **Zod v4 async parsing order.** Read from source only.
- **Tailwind's older (pre-sorting) `screens` docs.** Not found.

**Readability and merges (section 4)**

- **Full texts not obtained:** Card 1982, McDonald et al. 1983, Hollands and Merikle 1987, Somberg 1987, Biegel et al. 2012, Geffen and Maoz 2016 (ACM, SAGE and IEEE blocked; no author copies). Participant counts and effect sizes for these are unknown.
- **Vandierendonck, Van Hoe and De Soete 1988** (_Acta Psychologica_ 69(3), https://doi.org/10.1016/0001-6918(88)90034-0): record only. A search snippet said alphabetical beat categorical; dropped as unverified.
- **CSS-Tricks poll on CSS property order** (Chris Coyier, 5 Aug 2012; self-selected, over 10,000 votes: grouped by type 45%, random 39%, alphabetical 14%). ANECDOTAL; quote checked in `A/text/csstricks-poll.txt`. Not a study.
- **Kent Norman's _The Psychology of Menu Selection_.** The free copy is gone.
- **Rust's `tidy-alphabetical` and `google/keep-sorted`.** Their READMEs give no merge-conflict reason.

**Agents and LLMs (section 5)**

- **Opened and dropped (nothing on field order):** "The Format Tax" (arXiv 2604.03616), Yuan et al. (2509.21791), SLOT (2505.04016), Zhong et al. (2509.10402).
- **Not opened:** Dylan Castillo's structured-output post, a dev.to post on field order, googleapis/python-genai#2418, agentic refactoring studies (2511.04824, 2601.20160).
- **Not published:** the system prompts of Claude Code, Copilot and Cursor. Docs and published plugins were used instead.
- **Khan Academy's A/B numbers.** Only the talk abstract exists.
- **Whether an agent writes sorted keys when a project enforces them.** No study found.
