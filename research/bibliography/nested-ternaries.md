# Nested ternaries and the rules around the conditional operator: literature and source notes

Compiled 2026-11-11 for the Ultracite research post on nested ternaries. The rules: ESLint's `no-nested-ternary` and its neighbours `no-ternary`, `no-unneeded-ternary`, `no-negated-condition`, `no-else-return`, `no-lonely-if`, `curly`, `multiline-ternary` and `operator-linebreak`; eslint-plugin-unicorn's `no-nested-ternary`, `prefer-ternary`, `prefer-logical-operator-over-ternary`, `prefer-minimal-ternary`, `no-negated-condition`, `no-lonely-if` and `no-useless-else`; SonarJS's `no-nested-conditional` and its cognitive complexity; Oxlint's ports; Biome's `noNestedTernary`, `noUselessTernary`, `noNegationElse`, `noUselessElse`, `useCollapsedIf`, `useCollapsedElseIf`, `useBlockStatements` and `noTernary`; and, for JSX, `react/jsx-no-leaked-render`, Biome's `noLeakedRender` and React Doctor's leaked-render rule. In Oxlint core Ultracite turns on `no-nested-ternary`, `no-unneeded-ternary`, `no-negated-condition`, `no-else-return`, `no-lonely-if`, `curly`, `unicorn/prefer-ternary`, `unicorn/prefer-logical-operator-over-ternary` and `unicorn/no-negated-condition`, and turns off `no-ternary` and `unicorn/no-nested-ternary` (because its fix and the formatter undo each other); ESLint core matches, with `unicorn/prefer-ternary` set to `"always"` plus two options and `unicorn/prefer-minimal-ternary` on; Biome core has the seven Biome rules above on and `noTernary` off (section 11). The question: what a nested ternary costs a reader, whether the rules' fixes (if/else, early returns, lookup objects, extracted helpers, `&&` in JSX) are better and when they change behaviour, what formatters do to nested ternaries, and what happens when agents are held to the rule. Comprehension and nesting research is in `cognitive-complexity.md` §3–4 (Sonar's scoring of ternaries in §2.1); splitting and readability models in `length-limits.md` (4.46–4.52, 4.61–4.65), ESLint config usage in `length-limits.md` 4.69 and `func-style.md` 7.3, JavaScript atoms of confusion in `func-style.md` 5.20, and LLMs and agents in `length-limits.md` §5 and `func-style.md` §8. This file cross-references them rather than repeating them.

**How to read the tags**

- **VERIFIED**: the primary source (the spec, the PDF, the publisher or arXiv record, the official docs, the tool's source code or published package, the release notes, or the GitHub issue, PR or commit) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex, Semantic Scholar or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single user report, project doc, blog post, maintainer's account or vendor document, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research or claims by a company that sells or owns a product in this space: Google, Microsoft/GitHub, Meta, Apple, Vercel, Anthropic, OpenAI, Anysphere (Cursor), JetBrains, Sonar, VoidZero/Oxc, Astral.
- **My check (local run)** marks results of running the tools here, with versions and the folder.

Every quote is copied exactly and is under 15 words. Where a longer sentence matters, it is given as consecutive quoted segments. Double quotes inside a quote are shown as single quotes. Every person is named or referred to as they/them.

**How sources were fetched.** Pages and PDFs were found with WebSearch and WebFetch and read from copies saved with unauthenticated `curl` (`--max-filesize 10000000`, a generic User-Agent) or read-only `gh api`; every quote was copied from the saved raw text, not from a summary. PDFs were converted with `pdftotext` (with and without `-layout`). Tool behaviour was read from source at pinned tags: ESLint `v10.14.0`, Oxlint `oxlint_v1.90.0` (oxc `9b6fff42`), Biome `@biomejs/biome@2.6.4` (`56538746`), eslint-plugin-unicorn `v79.0.0` (`d078ad9e`), eslint-plugin-sonarjs 4.2.2 and SonarSource/SonarJS `3d6a0250`, eslint-plugin-react `v7.37.5`, typescript-eslint 8.72.1, TypeScript 6.0.3, Prettier `3.9.10` (`1172b82c`), eslint-config-prettier `v10.1.8`, Oxfmt 0.75.0 (the installed package and `oxfmt_v0.75.0`), ESLint Stylistic `v5.10.0`, dprint-plugin-typescript `0.100.0`, and the other tags and commits named in each entry. The current spec is the ECMAScript 2027 draft as served on 11 Nov 2026 (`last-modified` 12 Nov 2026 00:38:34 GMT); ES1 is Ecma's PDF. Metadata came from Crossref and OpenAlex (no `mailto`), Semantic Scholar (no key), the arXiv API, Europe PMC and the Wayback Machine. Six research agents worked in parallel: sections 1 and 8 (`A/`), section 2 (`B/`), sections 3, 4 and 9 (`C/`), section 5 (`D/`), section 6 and 7.1–7.11 (`E/`), 7.12–7.31 and section 10 (`F/`); section 11 and the presets notes are mine (`main/`). Every quote in this file was then checked by script against the saved source texts only, never against drafts (`scratchpad/nested-ternaries-lit/scripts/check_quotes.py`, output in `scratchpad/nested-ternaries-lit/main/quote-check.txt`).

- **Blocked:** dl.acm.org returned 403; Springer served a bot challenge (Europe PMC's full text was used for da Costa et al.); academic.oup.com served a Cloudflare challenge (the 1963 CPL paper wasn't opened); Medium served a challenge (a Wayback copy was used); mathworks.com and one Knuth mirror returned 403; rules.sonarsource.com is a client-rendered app with no rule text in the HTML; Semantic Scholar returned 429 on searches; repositorio.ufc.br timed out; GitHub search was rate-limited for part of one search.
- **Over the size limit, not fetched:** AUTOSAR C++14 (10.76 MB). **Books not opened:** K&R, Fowler's _Refactoring_ (only the catalog pages), Beck's _Smalltalk Best Practice Patterns_ and _Implementation Patterns_, Dahl, Dijkstra and Hoare's _Structured Programming_, MISRA C:2012 (sold; one rule's text only as quoted on MISRA's forum). No shadow library was used.
- **`gh` was used read-only** on public repositories: commits, files, issues, PRs, releases, code and issue search. To find commenters' display names, one agent looked up about 15 public GitHub handles with `gh api users/<login>`; nothing about Hayden or anyone else's private data was sent, and names in the entries come only from saved files (commit metadata, changelogs, author lists); everyone else is cited by handle.
- **Nothing was installed.** The worktree's own Oxlint, ESLint (with its plugins), Biome, Prettier, Oxfmt and `tsc` were run on small hand-written files in the scratchpad; one agent used a PHP binary already on the machine. No email address, name or account detail was put in any URL, query, header or form, and Unpaywall wasn't used (links to it in search results and API responses were not followed). Email addresses in saved commits, mail and package metadata were removed or are not reproduced. Nothing was left running.
- **Embedded instructions:** OpenAlex API responses tell AI agents to request an API key by sending the user's email; the Claude Code docs pages open with a note telling agents to fetch an `llms.txt` index; a CodeRabbit review on Ultracite PR #791 carries a prompt block for AI agents; Biome issues carry an automated "AgentScan" comment; github/awesome-copilot, awesome-cursorrules and Vercel's React skill are instructions written for models. All were read as data and not followed. No source tried to direct the work.

**About the items tagged My check.** These were run on 11 Nov 2026 with the worktree's binaries (Oxlint 1.90.0, ESLint 10.14.0 with eslint-plugin-unicorn 79.0.0, eslint-plugin-sonarjs 4.2.2, eslint-plugin-react 7.37.5, eslint-plugin-react-doctor 0.9.21 and typescript-eslint 8.72.1, Biome 2.6.4, Prettier 3.9.10, Oxfmt 0.75.0, TypeScript 6.0.3, on Node 24.14.1). Each entry names its folder. They are illustrations on small files, not rates. The corpus measurements for this topic are being built separately in `research/corpus/results/nested-ternaries/`; nothing here depends on them. Move these checks into the harness before putting a number in the post.

Hayden gave the reason for Ultracite's setting on 11 Nov 2026, relayed while this file was compiled; it is recorded as Hayden's account in 11.13 and in the notes, with the sources that bear on each part of it.

---

## Most useful for the post

1. **The ternary exists because JavaScript splits statements from expressions, and JSX lives on the expression side.** ECMA-262 makes `?:` right-associative, lower than `||` and `??`, and evaluates exactly one branch; JSX children, attributes, template substitutions, defaults and concise arrow bodies take only expressions. Brendan Eich, when Rust dropped its ternary: "Wish I had made JS an expression language." and "The great statement/expression split motivates ?: but Rust is free of that,". (1.1, 1.3, 1.11)
2. **The conditional expression was invented so that only one branch runs.** McCarthy's FORTRAN `XIF` "had to be used sparingly, because all three arguments had to be evaluated before" "XIF was entered,"; "This led to the invention of the true" "conditional expression which evaluates only one of N1 and N2". A lookup object brings that problem back: every value is evaluated, and a value can throw from a branch that wasn't chosen; a plain object keyed by user input also returns inherited members such as `constructor`. (1.7, 8.8, 8.9)
3. **Chains are as old as the operator.** B's 1972 manual: "Binding is right to left. Thus a?b:c?d:e is a?b:(c?d:e)."; McCarthy's 1960 form was already a multi-way chain, and ALGOL 60 allowed nesting only in the `else` arm. (1.5–1.7)
4. **Languages that dropped or restricted `?:` cite nesting.** Go's FAQ: its designers "had seen the operation used too often to create impenetrably complex expressions." and "The `if-else` form, although longer," "is unquestionably clearer."; Rust removed it in 2012 because `if` is an expression; Kotlin and Swift use `if` expressions, and Swift's book warns against combining ternaries. (1.10–1.13)
5. **The one hard bug count is PHP's, and it is about grouping, not reading.** PHP grouped nested ternaries from the left; in the top 1,000 Composer packages, "9 of them are bugs, where a right-associative meaning was intended,"; PHP 7.4 deprecated unparenthesised nesting and PHP 8.0 made it a compile-time error. (1.14, 7.21)
6. **ESLint's rule has a one-sentence rationale and checks less than its name suggests.** "Nesting ternary expressions can make code more difficult to understand." It reports only a ternary directly in another's branches; a ternary in the test, behind `||`, in a call or a template literal passes. Every proposed exception (parentheses, chains, depth, conditional types) was declined, for rule-collision and maintenance reasons; on chains: "The whole point of the rule is that it's hard to read" "multiple ternary expressions." (2.1, 2.2, 2.21)
7. **The comprehension evidence is weaker than the rule's confidence.** In C the conditional operator is an atom of confusion (Gopstein et al., φ = 0.36): "?: leads to 31% more errors than if-statements." It was not significant in Java (Langhout and Aniche) or in either JavaScript experiment (Torres et al., p = 0.7905 and p = 0.1590). (6.1, 6.4, 6.5)
8. **The only nested ternary ever tested was no worse than the simple ones, but drew more kinds of wrong answer.** In Gopstein's data, 35 of 48 answered it correctly against 46 of 48 for the nested `if`; the two simple ternaries scored 37 of 48 and 37 of 49. It drew 8 distinct wrong answers against 3. One snippet. (6.2)
9. **Developers prefer the ternary even when they call `if` clearer.** 9 of 15 JavaScript practitioners interviewed preferred the ternary version, the only pattern where the form with the atom won; 8.25% of 97 C developers surveyed saw it as harmful. (6.5, 6.8)
10. **Nesting isn't a clean penalty, and the metrics don't track the results.** Nested `if`s were no harder than compound conditions, and only a balanced-tree shape cost something (Ajami et al.); readability models have no ternary or nesting-depth feature; cognitive complexity rates Gopstein's nested ternary simpler than the `if` version readers understood better. Sonar's score for the same four-way choice: chained ternary 6, `else if` chain 4, guards 3, `switch` 1, lookup with `??` 0. (6.11, 6.17, 6.18, 2.17)
11. **No study measures how hard nested ternaries are to modify.** In GCC, bug fixes removed conditional operators 1.37 times as often as other commits; in six Java projects ternaries changed in bug fixes because null checks were being added, "not due to their confusing nature"; maintainers accepted 2 and rejected 2 pull requests that replaced a ternary. The closest statements of the modification argument are practitioners': Prettier's design notes worry about diffs when a branch is added, and GitHub's Copilot docs say nested structures make it "difficult to modify or extend the logic". (7.1–7.4, 7.11, 5.4, 10.8)
12. **The real precedence bugs have an operator in front of `?`, not a nested ternary.** A Linux kernel selftest, an error toast that always dropped its prefix, ten broken JSX borders, a `??` case from the Prettier tracker, and phpMyAdmin all bind `+`, `&&`, `||` or `??` into the test. `no-nested-ternary` catches none of them, and nothing in Ultracite's presets flags `a && b ? c : d` or `a ?? b ? c : d` in plain JavaScript. (7.13, 7.14, 7.18–7.21, 7.31)
13. **Prettier changed its mind twice, and the fight was over whether the reader can see the tree.** Indented until 1.15 (2018), flattened else-branches until 3.1 (2023), indented again since; the revert request has 682 thumbs-up, and its top comment: "It erases the logical structure where one is implied." A maintainer: "in my opinion ternaries are the most cryptic syntax of all in JavaScript". (5.1, 5.3, 5.5)
14. **Prettier's own case for nested ternaries is that formatting, not refactoring, is the fix.** "Developers have long found them so confusing to read that they end up" "just refactoring their code to an ugly series of" `if`/`else` statements; the post's own case-style rewrite of its example gives a different answer in 2 of 8 input combinations. `--experimental-ternaries` is still opt-in three years later, and Oxfmt rejects the option. (5.6, 5.7, 5.11)
15. **Unicorn's rule and the formatters fight over one pair of parentheses, and neither side will move.** All three formatters strip parentheses around a nested ternary in the else branch; Unicorn's fix adds them; the loop never converges. Sorhus: "The parenthesization requirement is the core of this rule, not an incidental detail." and "Unicorn is an independent project, and Prettier compatibility is not a goal." eslint-config-prettier has turned the rule off since 2019; Ultracite did in September 2026 (#791). (5.13–5.16, 11.3)
16. **Formatters never rewrite a nested ternary, and the lint rules never see nested conditional types.** "Prettier only prints code. It does not transform it."; no nesting rule in ESLint, Oxlint or Biome reports `A extends B ? (C extends D ? …) : …`, where "Nested ternaries for conditional types is idiomatic,". (5.8, 1.15, 1.16, 2.2, 5.20)
17. **The rewrites can change behaviour.** Airbnb's guide hoists the inner ternary into a variable, which Mark S. Miller showed "is not equivalent."; `const` with a ternary to `let` plus `if`/`else` widens a TypeScript literal union to `string`; moving a ternary out of an argument list reorders evaluation; `switch (true)` matches only cases strictly equal to `true`; unicorn's first suggestion for `a ? a : b` is `a ?? b`, which differs for `""` and `0`. (4.4, 8.10, 8.16, 2.12)
18. **In Ultracite's ESLint preset, `prefer-ternary` turns Hayden's early return into a ternary; Oxlint's port doesn't.** Since unicorn v75 (Sep 2026) a lone `if (x) return a;` before `return b;` is reported and fixed to `return x ? a : b;`; Oxlint and Biome keep the guard. Before v76 and v79 the rule could cascade guards into nesting: "A full fix makes this a six-level nested ternary."; "the early return seems easier to follow than the resulting expression." (2.11, 2.18, 7.27, 8.17, 11.9)
19. **Hayden's exact line, `if (bool) return x;`, fails every Ultracite linter.** `curly` (Oxlint, ESLint) and `useBlockStatements` (Biome) report it and fix it to a braced block; Airbnb's guide lists `if (test) return false;` as good, and Google, Standard, love and Vercel allow it. Biome's reason: "Without braces, it is easy to add a second statement" "that looks like part of the block but is not." (2.8, 4.2, 4.5, 11.7)
20. **React's docs never mention nested ternaries, and one Ultracite fix creates them.** react.dev: "This style works well for simple conditions, but use it in moderation." and "If your components get messy with too much nested conditional markup," extract child components. `react/jsx-no-leaked-render`'s fix turns `count && (compact ? A : B)` into `count ? compact ? A : B : null`, which `no-nested-ternary` then reports, with no fix. (3.2, 3.6, 8.12, 11.10)
21. **Popular configs split, and Unicorn calls the ban opinionated.** Airbnb, XO (through Unicorn) and Vercel ban nested ternaries; Standard, Google, love, antfu and gts don't; Unicorn leaves its rule out of `unopinionated` as "Very opinionated; some projects need this"; of 11 large projects' own configs, 2 ban them, 2 turn the ban off (React, Prettier) and 7 don't set it. In 2017 configs, `no-ternary` was the least valued rule and the nesting rules made no top-20 list. RuboCop has banned nested ternaries by default since 0.9; clang-tidy added a check in 2024. (4.1–4.10, 4.13, 4.16, 9.1, 9.2)
22. **Early returns have no controlled study behind them either, and single exit isn't Dijkstra's idea.** Fowler's catalog names the refactoring; Dijkstra's 1968 letter says nothing about single exit and counts McCarthy's conditional expressions as structured; one entry, one exit appears in IBM's 1974 material as a property of control structures; JSF AV C++ keeps single exit but not when it "would obscure or otherwise" complicate control logic. (6.16, 8.1, 8.3–8.6)
23. **Nobody has measured nested ternaries in model-written code, and the vendors point toward flat code.** No study counts ternaries in LLM JavaScript or TypeScript; Sonar's LLM study includes the rule but reports no number for it; GitHub's docs say "Use early returns for error conditions"; OpenAI's guide quotes Cursor's prompt against "overly clever one-liners"; Ultracite's site says the rules catch "what agents get wrong: import cycles, nested ternaries, awaits inside loops", which no source here supports. (10.1–10.12, 11.11)
24. **Ultracite: on since the first commit, as policy, with Hayden's reasons now on record.** `no-nested-ternary` has been `"error"` since March 2022, arriving with every other rule (Biome-only Ultracite had no equivalent for ten weeks in 2024); the only change in the group was turning Unicorn's version off for the formatter fight. Hayden: "it was the strictness policy but also nested ternaries" "can require more cognitive effort to work through" "and are hard to easily modify vs simple if statements." (11.1–11.3, 11.13)

---

## 1. The conditional operator and its history

1.1–1.3 are the ECMAScript grammar and semantics (current draft, ES1, and the JSX grammar). 1.4–1.8 are the history: C, B, BCPL and CPL, McCarthy and ALGOL 60. 1.9–1.15 are how other languages chose differently (Java and C#, Python, Go, Rust, Kotlin, Swift, PHP). 1.15–1.16 are TypeScript's conditional types and whether the nesting rules see them.

### 1.1 The grammar makes `?:` right-associative and lower than `||` and `??`; only one branch runs. VERIFIED (ECMA-262 draft); My check (local run)

- **Citation:** Ecma International, _ECMAScript 2027 Language Specification_ (draft, as served 11 Nov 2026), §13.13 Binary Logical Operators, §13.14 Conditional Operator ( ? : ), §13.15 Assignment Operators. https://tc39.es/ecma262/#sec-conditional-operator
- **What it says:**
  - Grammar: `ConditionalExpression : ShortCircuitExpression ? AssignmentExpression : AssignmentExpression`, and `ShortCircuitExpression` is `LogicalORExpression` or `CoalesceExpression`. The spec has no precedence table; precedence falls out of where each production sits. The condition is a `ShortCircuitExpression`, so `a || b ? c : d` and `a ?? b ? c : d` test the whole `||` or `??` expression, and `+` binds tighter still. Both branches are `AssignmentExpression`s, and `AssignmentExpression` includes `ConditionalExpression`, `ArrowFunction` and assignment, so a branch can hold another conditional, an arrow or an assignment without parentheses. The condition can't be an unparenthesized conditional, so `a ? b : c ? d : e` can only parse as `a ? b : (c ? d : e)`.
  - The note on C and Java: "The grammar for a ConditionalExpression in ECMAScript is slightly different" "from that in C and Java," "which each allow the second subexpression to be an Expression" "but restrict the third expression to be a ConditionalExpression." The reason: "to allow an assignment expression to be governed by either arm of a conditional" "and to eliminate the confusing and fairly useless case" "of a comma expression as the centre expression."
  - Runtime semantics (§13.14.1): "Let leftValue be ToBoolean(? GetValue(leftRef))." "If leftValue is true, then" "Let trueRef be ? Evaluation of the first AssignmentExpression." Otherwise "Let falseRef be ? Evaluation of the second AssignmentExpression." The branch not taken is never evaluated.
  - My check (`A/check/precedence/precedence.mjs`, output in `precedence-output.txt`): `true ? 'true' : false ? 't' : 'f'` gives `"true"` while the left-grouped `(true ? 'true' : false) ? 't' : 'f'` gives `"t"`; `'Hello ' + user ? user.name : 'guest'` with `user = null` "threw TypeError: Cannot read properties of null (reading 'name')" because the condition is the concatenation, which is always truthy; `false ? 1 : target = 'assigned'` parses and assigns; `a ? b, c : d` is a "SyntaxError: Unexpected token ','" while `a ? (b, c) : d` parses.
- **Caveat:** the draft is a living document; the grammar and the note have been stable since ES1 (1.2) apart from `??` (ES2020) and the name `ShortCircuitExpression`.
- **For the post:** right associativity is why a chain reads like `if / else if / else` and why nesting in the false branch needs no parentheses. The concatenation case is a real precedence trap, but it's a trap of one ternary next to `+`, not of nesting.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/ecma262-draft.html`, `scratchpad/nested-ternaries-lit/A/text/ecma262-draft.txt`, `scratchpad/nested-ternaries-lit/A/check/precedence/precedence-output.txt`

### 1.2 ES1 (June 1997) had the same grammar, the same ten evaluation steps and the same note. VERIFIED (Ecma PDF)

- **Citation:** Ecma International, _ECMA-262, 1st edition_, June 1997, §11.12 Conditional operator ( ?: ). https://www.ecma-international.org/wp-content/uploads/ECMA-262_1st_edition_june_1997.pdf
- **What it says:**
  - Grammar: `ConditionalExpression : LogicalORExpression ? AssignmentExpression : AssignmentExpression` (no `??` yet).
  - Steps: "4. If Result(3) is false, go to step 8." "5. Evaluate the first AssignmentExpression." "8. Evaluate the second AssignmentExpression."
  - The discussion note is the ancestor of today's: "The grammar for a ConditionalExpression in ECMAScript is a little bit different" "from that in C and Java," with "the center expression" where the current draft says "centre".
- **Caveat:** none beyond the date; ES1 standardised Netscape's JavaScript 1.1-era language.
- **For the post:** the operator, its laziness and its right-nesting grammar were in the first standard unchanged; nothing about nesting has been added or taken away since.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/ECMA-262_1st_edition_june_1997.txt`, `scratchpad/nested-ternaries-lit/A/src/ECMA-262_1st_edition_june_1997.pdf`, `scratchpad/nested-ternaries-lit/A/text/ecma262-draft.txt`

### 1.3 It's an expression, and JSX, template literals, defaults, initialisers and concise arrow bodies only take expressions. VERIFIED (ECMA-262 draft; JSX spec at a pinned commit); My check (local run)

- **Citation:** ECMA-262 draft (1.1): `Initializer`, `TemplateLiteral`, §14.5 Expression Statement, §14.6 The if Statement, §15.3 Arrow Function Definitions (`ConciseBody`, `ExpressionBody`). facebook/jsx, _JSX_ draft specification, `spec.emu` at `d614ce76` (4 Aug 2022), https://github.com/facebook/jsx/blob/d614ce76e6ea996ea6dfa122f2a7be71ed96e6eb/spec.emu
- **What it says:**
  - `Initializer : = AssignmentExpression` (used by `const`/`let` initialisers and default parameters); `SubstitutionTemplate : TemplateHead Expression TemplateSpans`; `ExpressionBody : AssignmentExpression` for an arrow's concise body. An `if` is a statement (§14.6), so none of these positions accept it.
  - JSX: `JSXAttributeValue` includes `{ AssignmentExpression }`, and a child is `{ JSXChildExpression? }` with `JSXChildExpression : AssignmentExpression` or `... AssignmentExpression`. So inside JSX the only built-in conditional forms are `?:`, `&&`, `||` and `??`.
  - My check (`precedence-output.txt`): `const x = if (a) { 1 } else { 2 }` gave "SyntaxError: Unexpected token 'if'"; a ternary in a template substitution and in a default parameter parses.
- **Caveat:** the JSX spec is a draft maintained by Meta and hasn't changed since 2022; implementations (Babel, TypeScript, SWC, Oxc) follow it.
- **For the post:** this is the structural reason nested ternaries are common in React code: JSX children and attributes are expression slots. Every rewrite the rule asks for (8.x) either moves the logic out of the expression slot or wraps a statement in an expression (an IIFE, 8.11).
- **Text:** `scratchpad/nested-ternaries-lit/A/text/ecma262-draft.txt`, `scratchpad/nested-ternaries-lit/A/src/facebook-jsx-spec-d614ce76e6ea996ea6dfa122f2a7be71ed96e6eb.emu`, `scratchpad/nested-ternaries-lit/A/check/precedence/precedence-output.txt`

### 1.4 C: `?:` groups to the right because the third operand is a `conditional-expression`, and only one of the last two operands is evaluated. VERIFIED (WG14 drafts N1570 and N3220; C99 Rationale)

- **Citation:** ISO/IEC JTC1/SC22/WG14, N1570 (C11 committee draft, April 2011), §6.5.15 Conditional operator, https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf ; N3220 (ISO/IEC 9899:2024 working draft), §6.5.16 Conditional operator, https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf ; _Rationale for International Standard, Programming Languages, C_, Revision 5.10 (April 2003), §6.5.15, https://www.open-std.org/jtc1/sc22/wg14/www/C99RationaleV5.10.pdf
- **What it says:**
  - Grammar (both drafts): `conditional-expression: logical-OR-expression | logical-OR-expression ? expression : conditional-expression`. The middle operand is a full `expression` (commas allowed); the third must be another conditional, which is what makes `a ? b : c ? d : e` group to the right.
  - Semantics: "The second operand is evaluated only if the first compares unequal to 0;" "the third operand is evaluated only if the first compares equal to 0;". There is "a sequence point between its evaluation and the" evaluation of whichever operand runs. Footnote 110 in N1570: "A conditional expression does not yield an lvalue."
  - Rationale: "The syntactic restrictions on the middle operand of the conditional operator" "have been relaxed to" "include more than just logical-OR-expression: several extant implementations have adopted this" "practice."
- **Caveat:** these are free committee drafts, not the purchased ISO text. In C23's N3220 the clause is §6.5.16, not §6.5.15.
- **For the post:** JavaScript kept C's associativity and laziness but swapped which operands accept what (1.1's note). The case against nesting predates JavaScript; the grammar was designed to chain in the false branch.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/n1570.txt`, `scratchpad/nested-ternaries-lit/A/text/n3220.txt`, `scratchpad/nested-ternaries-lit/A/text/C99RationaleV5.10.txt`

### 1.5 B (1972) already had `?:` and already documented the chained reading. VERIFIED (Ritchie's transcriptions of the B manuals)

- **Citation:** Ken Thompson, _Users' Reference to B_, Bell Labs Technical Memorandum, 7 Jan 1972, §4.10 Conditional Expression, transcribed by Dennis Ritchie, https://www.nokia.com/bell-labs/about/dennis-m-ritchie/kbman.html ; S. C. Johnson, _Users' Reference to B on MH-TSS_, Bell Labs, §4.11, https://www.nokia.com/bell-labs/about/dennis-m-ritchie/bref.html ; Dennis M. Ritchie, "The Development of the C Language," HOPL-II (April 1993), _ACM SIGPLAN Notices_ 28(3):201–208, doi:10.1145/155360.155580, author's copy https://www.nokia.com/bell-labs/about/dennis-m-ritchie/chist.html (the old `bell-labs.com/usr/dmr/www/` URLs redirect there; `kbman.html` at the old URL returned 410).
- **What it says:**
  - Thompson: "Three rvalue expressions separated by ? and : form a conditional expression." Only the chosen operand runs: "If the result is non-zero, the second expression is" "evaluated and the third ignored." And: "Binding is right to left. Thus a?b:c?d:e is a?b:(c?d:e)."
  - Johnson's MH-TSS reference has the same section, the same "Binding is right to left." sentence, and the example "a<b?a:b" that "computes min(a,b)."
  - Ritchie's C history doesn't discuss `?:` at all: the tag-stripped text has no `?:` and its three uses of `conditional` are about `if` statements and the preprocessor.
- **Caveat:** Ritchie's note says the Thompson manual is "a rendition, after scanning, OCR, and editing," of the 1972 memo. The B manuals say B had the operator; they don't say where Thompson took it from.
- **For the post:** C inherited `?:` from B, not the other way round, and the first manual for it already spelled out how a nested chain parses. Don't attribute the operator's origin to Ritchie's history paper; it's silent on it.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/dmr-kbman.txt`, `scratchpad/nested-ternaries-lit/A/text/dmr-bref.txt`, `scratchpad/nested-ternaries-lit/A/text/dmr-chist.txt`, `scratchpad/nested-ternaries-lit/A/src/dmr-kbman.html`, `scratchpad/nested-ternaries-lit/A/src/dmr-bref.html`

### 1.6 BCPL (1967) wrote it `E1 -> E2, E3`, borrowed from CPL, and allowed nesting in both arms. VERIFIED (BCPL memo via Ritchie; Richards' preprint); the 1963 CPL paper not opened

- **Citation:** Martin Richards, _The BCPL Reference Manual_, MIT Project MAC Memorandum M-352, 21 Jul 1967, §5.5 Conditional Expressions, edited OCR by Dennis Ritchie, https://www.nokia.com/bell-labs/about/dennis-m-ritchie/bcpl.pdf (page: https://www.nokia.com/bell-labs/about/dennis-m-ritchie/bcpl.html). Martin Richards, "How BCPL Evolved from CPL," _The Computer Journal_ 56(5):664–670 (2013), doi:10.1093/comjnl/bxs026 (Crossref); author's preprint https://www.cl.cam.ac.uk/users/mr10/cpl2bcpl.pdf
- **What it says:**
  - BCPL §5.5: syntactic form `E1 → E2, E3`. "E2 and E3 may, in addition, be conditional expressions." Semantics: the value is the "Rvalue of E2 or E3 depending on whether the value of" the first "represents true or false respectively." "In either case only one alternative is evaluated."
  - Richards' preprint gives a CPL definition in the same notation, `let rec fact(n) = n = 0 -> 1, n * fact(n-1)`, and says "BCPL is essentially just CPL with all the difficult bits removed".
  - Ritchie's page: the memo is "Designated Memorandum M-352" "of MIT Project MAC," "dated July 21, 1967."
- **Caveat:** the 1963 paper (Barron, Buxton, Hartley, Nixon and Strachey, "The Main Features of CPL," _The Computer Journal_ 6(2):134–143, doi:10.1093/comjnl/6.2.134, checked in Crossref) was not opened: OUP served a Cloudflare challenge, and the only Wayback capture of the old PDF URL is the captured challenge page. The Richards preprint's masthead still reads "Vol. ??, No. ??"; the published version may differ. The 1967 PDF is Ritchie's edited OCR, and the OCR renders `E1` as `El`.
- **For the post:** the chain is older than C: BCPL let both arms nest, and the `->` arrow notation goes back through CPL to McCarthy (1.7). Whether B took `?:` from BCPL's arrow isn't stated in any source opened here.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/dmr-bcpl-1967.txt`, `scratchpad/nested-ternaries-lit/A/text/dmr-bcpl.txt`, `scratchpad/nested-ternaries-lit/A/text/richards-cpl2bcpl.txt`, `scratchpad/nested-ternaries-lit/A/src/crossref-cpl2bcpl-search.json`, `scratchpad/nested-ternaries-lit/A/src/crossref-cpl1963-search.json`

### 1.7 McCarthy invented the conditional expression because a function version evaluated every branch; ALGOL 60 made the chain grammar `if ... then ... else`. VERIFIED (McCarthy's own copies; ALGOL 60 report transcription; Crossref)

- **Citation:** John McCarthy, "Recursive Functions of Symbolic Expressions and Their Computation by Machine, Part I," _Communications of the ACM_ 3(4):184–195, April 1960, doi:10.1145/367177.367199; McCarthy's retyped copy https://jmc.stanford.edu/articles/recursive/recursive.pdf . John McCarthy, "History of Lisp" (draft of 12 Feb 1979; published in _ACM SIGPLAN Notices_ 13(8):217–223, 1978, doi:10.1145/960118.808387), https://jmc.stanford.edu/articles/lisp/lisp.pdf (on 12 Nov 2026 this redirected to a 404 at cs.stanford.edu; Wayback capture of 25 Dec 2024: https://web.archive.org/web/20241225232618/http://jmc.stanford.edu/articles/lisp/lisp.pdf , checked to contain the XIF passage). J. W. Backus et al., P. Naur (ed.), "Revised Report on the Algorithmic Language Algol 60," _CACM_ 6(1):1–17, 1963, doi:10.1145/366193.366201; transcription https://www.masswerk.at/algol60/report.htm
- **What it says:**
  - History of Lisp: McCarthy first wrote a FORTRAN function `XIF(M,N1,N2)`, which "had to be used sparingly, because all three arguments had to be evaluated before" "XIF was entered," "This led to the invention of the true" "conditional expression which evaluates only one of N1 and N2".
  - 1960 paper: a conditional expression is `(p1 → e1, ..., pn → en)`, a multi-way chain from the start; to evaluate it, "Examine the p’s from left to right." The footnote: "The notation given here was rejected for" "Algol 60, because it had been decided" "that no new mathematical notation should be allowed"; the `if ... then ... else` ALGOL 60 used instead "adopted was suggested by John Backus."
  - ALGOL 60 report, §3.3.1: `<arithmetic expression> ::= <simple arithmetic expression> | <if clause> <simple arithmetic expression> else <arithmetic expression>`, so only the `else` arm can hold another conditional without parentheses. §3.3.3: "The Boolean expressions of the if clauses are evaluated one by one" "in the sequence from left to right" "until one having the value true is found."
- **Caveat:** McCarthy's copy of the 1960 paper is a later retyping (its footnote mentions an apology CACM made afterwards), and "History of Lisp" here is the 1979 draft, not the typeset proceedings version. The ALGOL 60 text is a web transcription, not the CACM scan.
- **For the post:** two strong historical points. The operator exists because evaluating every branch was a problem (the same problem lookup objects bring back, 8.8). And the first conditional expressions were chains: `if / else if / else` in expression form is the design, not an abuse of it. ALGOL's grammar even put the nesting on the `else` side only, exactly where right associativity puts it.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/mccarthy-history-of-lisp.txt`, `scratchpad/nested-ternaries-lit/A/text/mccarthy-1960-recursive.txt`, `scratchpad/nested-ternaries-lit/A/text/algol60-revised-report-masswerk.txt`, `scratchpad/nested-ternaries-lit/A/src/crossref-10.1145_367177.367199.json`, `scratchpad/nested-ternaries-lit/A/src/crossref-10.1145_960118.808387.json`, `scratchpad/nested-ternaries-lit/A/src/crossref-10.1145_366193.366201.json`

### 1.8 Java and C# document the same right grouping, with the same example. VERIFIED (JLS SE 25; Microsoft Learn source). C#: Vendor (Microsoft)

- **Citation:** _The Java Language Specification, Java SE 25 Edition_, §15.25 Conditional Operator ? :, https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html ; Microsoft, "?: operator - the ternary conditional operator," C# language reference, source `docs/csharp/language-reference/operators/conditional-operator.md` at dotnet/docs `0dad19ab`, https://github.com/dotnet/docs/blob/0dad19ab65b096f0b86430c01b1b6a9e5832ea22/docs/csharp/language-reference/operators/conditional-operator.md
- **What it says:**
  - JLS: the "conditional operator is syntactically right-associative (it groups" "right-to-left). Thus, a?b:c?d:e?f:g means the same" "as a?b:(c?d:(e?f:g))." Neither the second nor the third operand may be a `void` method call.
  - C#: "The conditional operator is right-associative, that is, an expression of the form" `a ? b : c ? d : e` is evaluated as `a ? b : (c ? d : e)`; "Only `consequent` or `alternative` is evaluated." The page offers a mnemonic, `is this condition true ? yes : no`, and says nothing for or against nesting.
- **Caveat:** language references describe; neither gives style advice on nesting.
- **For the post:** every C-family reference treats the chain as well-defined. Readability, not ambiguity, is the case against it in these languages (PHP is the exception, 1.15).
- **Text:** `scratchpad/nested-ternaries-lit/A/text/jls-se25-15.txt`, `scratchpad/nested-ternaries-lit/A/src/jls-se25-15.html`, `scratchpad/nested-ternaries-lit/A/src/dotnet-docs-0dad19ab65b096f0b86430c01b1b6a9e5832ea22-conditional-operator.md`

### 1.9 Python added `x if c else y` in 2005, after a vote nobody won, and required short-circuiting. VERIFIED (PEP 308 at a pinned commit; the pronouncement; Python 3.15.2 reference)

- **Citation:** Guido van Rossum and Raymond Hettinger, PEP 308, "Conditional Expressions" (created 7 Feb 2003; Final; Python 2.5), source `peps/pep-0308.rst` at python/peps `f7e6f34d`, https://peps.python.org/pep-0308/ ; Guido van Rossum, "Conditional Expression Resolution," python-dev, 30 Sep 2005, https://mail.python.org/pipermail/python-dev/2005-September/056846.html ; Python Language Reference, "Conditional expressions" and "Operator precedence," `Doc/reference/expressions.rst` at CPython `v3.15.2`.
- **What it says:**
  - PEP 308: "On 9/29/2005, Guido decided to add conditional expressions in the" "form of 'X if C else Y'." "The motivating use case was the prevalence of error-prone attempts" "to achieve the same effect using 'and' and 'or'." The earlier vote drew 518 ballots, 82 rejecting every option and 436 ranked, and "no one format was able to draw majority support."
  - The C syntax was considered and rejected; one reason given: "for people not used to C-derived" "language, it is hard to understand." A built-in `cond()` function was rejected because "both expression1 and expression2 must be evaluated before the function" "is called." "The BDFL's position is that short-circuit behavior is essential" "for an if-then-else construct to be added to the language."
  - Pronouncement: `x = A if C else B if D else E` is allowed without parentheses, but `(A if C else B) if D else E` and `A if (X if C else Y) else B` need them: "Note that all these are intentionally ugly. :)" "In general, 'if' and 'else' bind less tight than everything except lambda."
  - Reference: "A conditional expression (sometimes called a 'ternary operator') is an" "alternative to the if-else statement." Its grammar is `or_test ["if" or_test "else" expression]`, so like C it chains in the `else` arm; the precedence table puts it just above `lambda`.
- **Caveat:** PEP 308's history section refers to van Rossum with a gendered pronoun; don't copy that wording. The pronouncement email shows an address; don't reproduce it.
- **For the post:** Python's designers made the else-chain the easy form and deliberately made the other nestings ugly, and treated laziness as the non-negotiable property, the same property lookup tables give up (8.8).
- **Text:** `scratchpad/nested-ternaries-lit/A/src/pep-0308-f7e6f34d7beffe1aa2ce0d8fd255976491a7a6a5.rst`, `scratchpad/nested-ternaries-lit/A/text/python-dev-2005-09-056846.txt`, `scratchpad/nested-ternaries-lit/A/src/cpython-v3.15.2-expressions.rst`

### 1.10 Go left `?:` out because of nesting, and still declines it. VERIFIED (Go FAQ at a pinned commit; golang/go issues). Vendor (Google)

- **Citation:** The Go Authors, "Frequently Asked Questions (FAQ)," "Why does Go not have the `?:` operator?", source `_content/doc/faq.md` at golang/website `9d2e951d` (10 Nov 2026), https://go.dev/doc/faq#Does_Go_have_a_ternary_form ; golang/go #232 (2009), #33171 "proposal: Go 2: add a ternary conditional operator" (18 Jul–1 Oct 2019), #36288 "x/website: reword FAQ answer on lack of ternary operator" (2019–2024).
- **What it says:**
  - FAQ: "There is no ternary testing operation in Go." "The reason `?:` is absent from Go is that the language's designers" "had seen the operation used too often to create impenetrably complex expressions." "The `if-else` form, although longer," "is unquestionably clearer." "A language needs only one conditional control flow construct."
  - #33171, Ian Lance Taylor for the proposal review: data was needed, and "arguments against the common concerns about the conditional operator," "such as that it makes code harder to read especially when nested." Then: "Once there are two ways of doing something (`if` or `?:`)," "each programmer will often have to decide which form to use," Declined: "We agree that there are cases where the `?:` syntax would be convenient," "but overall it doesn't seem worth adding to the language."
  - `gh search` finds at least 15 issues with `ternary` in the title in golang/go, all closed. #36288 asked to soften "unquestionably"; the FAQ still says it.
- **Caveat:** Google designs Go. The FAQ states the designers' experience, not a measurement; Taylor's comment asks for data and none was supplied by either side.
- **For the post:** the clearest primary statement that the objection is to nesting ("impenetrably complex expressions"), from a language that removed the operator entirely rather than lint it. Note Go's other reason, one way to do things, which is the opposite trade-off from JSX's expression slots (1.3).
- **Text:** `scratchpad/nested-ternaries-lit/A/src/golang-website-9d2e951dbfa18c495ec14086916e413e3554dea8-faq.md`, `scratchpad/nested-ternaries-lit/A/src/golang-go-issue-33171.json`, `scratchpad/nested-ternaries-lit/A/src/golang-go-issue-36288.json`, `scratchpad/nested-ternaries-lit/A/src/golang-go-issue-232.json`

### 1.11 Rust had `?:` in 2011 and removed it in January 2012 because `if` is an expression; Brendan Eich agreed. VERIFIED (Rust Reference at a pinned commit; rust-lang/rust #565 and #1698)

- **Citation:** _The Rust Reference_, "`if` expressions", `src/expressions/if-expr.md` at rust-lang/reference `bcd62f35`; rust-lang/rust #565 "Add ternary operator" (opened by `brson` 23 Jun 2011, closed 24 Jun 2011, no description), #1698 "Remove ternary operator" (opened by `brson`, 28–31 Jan 2012; done in PR #1705 per a comment on the issue).
- **What it says:**
  - Reference: "An `if` expression evaluates to the same value as the executed block," and "An `if` expression must have the same type in all situations."
  - #1698: someone asked after the 0.1 announcement "why we have a ternary operator," "since it is functionally the same as our `if` expressions." Brendan Eich, 28 Jan 2012: "Wish I had made JS an expression language." "The great statement/expression split motivates ?: but Rust is free of that," "and if-else suffices." A later comment: "This was done in pull req #1705."
- **Caveat:** issue comments, not a design document; Eich's remark is one sentence written 17 years after JavaScript's design. ANECDOTAL for the reasons; VERIFIED for the dates. #565 has no description, so when `?:` first landed in Rust isn't verified beyond that issue's dates; #1698 confirms it existed by January 2012.
- **For the post:** the creator of JavaScript, on the record, saying `?:` exists in JS because statements aren't expressions. That's the root of both the habit (JSX slots, 1.3) and the lint rule's fixes (moving to statements).
- **Text:** `scratchpad/nested-ternaries-lit/A/src/rust-reference-bcd62f35e8bf480ec5b0fa569b6d12ea5924030c-if-expr.md`, `scratchpad/nested-ternaries-lit/A/src/rust-issue-1698.json`, `scratchpad/nested-ternaries-lit/A/src/rust-issue-565.json`

### 1.12 Kotlin's docs said "there is no ternary operator" until 2025; they now say `if` serves its purpose. VERIFIED (kotlin-web-site at two commits). Vendor (JetBrains)

- **Citation:** JetBrains, "Conditions and loops," `docs/topics/control-flow.md` in JetBrains/kotlin-web-site, at `b496eb7e` (23 Jun 2025) and at `99e99803` (current), https://kotlinlang.org/docs/control-flow.html
- **What it says:**
  - Until mid-2025: "In Kotlin, `if` is an expression: it returns a value." "Therefore, there is no ternary operator (`condition ? then : else`)" "because ordinary `if` works fine in this role."
  - Now: "In this form, an `else` branch is required." "The `if` expression serves the same purpose as the ternary operator". The wording changed in commit `ba8a050d` ("feat: update conditions and loops page", authored 18 Jun 2025, committed 4 Aug 2025).
- **Caveat:** docs prose, no rationale document opened.
- **For the post:** a second language that answered the ternary question with `if`-as-expression; the "there is no ternary operator" wording is no longer on the live page, so cite the older commit if quoting it.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/kotlin-web-site-b496eb7eddb04b7fd3346d1f447cf3c4c49cb6ba-control-flow.md`, `scratchpad/nested-ternaries-lit/A/src/kotlin-web-site-99e9980398efbfc6e6696be708562d2b00ea6bd2-control-flow.md`, `scratchpad/nested-ternaries-lit/A/src/kotlin-web-site-commit-ba8a050d.json`

### 1.13 Swift's book warns against combining ternaries, and Swift 5.9 added `if` expressions partly for that reason. VERIFIED (swift-book and swift-evolution at pinned commits). Vendor (Apple)

- **Citation:** _The Swift Programming Language_, "Basic Operators," "Ternary Conditional Operator," `TSPL.docc/LanguageGuide/BasicOperators.md` at swiftlang/swift-book `16a2a4ca`; SE-0380 "`if` and `switch` expressions" (Status: Implemented (Swift 5.9)), `proposals/0380-if-switch-expressions.md` at swiftlang/swift-evolution `4c2e6b91`.
- **What it says:**
  - Book: "Use the ternary conditional operator with care, however." "Its conciseness can lead to hard-to-read code if overused." "Avoid combining multiple instances of the ternary conditional operator into one compound statement."
  - SE-0380's motivation shows a three-level chained ternary: "a user might be tempted to lean heavily on the harder-to-read ternary syntax" and "Opinions vary on this kind of code, from enthusiasm to horror," "but it's accepted that it's reasonable to find this syntax _too_ terse."
- **Caveat:** the book's source still carries a stale FIXME comment, "Swift doesn't have 'if' expressions.", from before 5.9. SE-0380 also notes a typing difference between the ternary and the new `if` expression, which isn't relevant to JavaScript.
- **For the post:** the closest official style advice to `no-nested-ternary` in any language's own book; it's a "with care" warning, not a ban, and the language's answer was to add `if` expressions, which JavaScript doesn't have (8.15).
- **Text:** `scratchpad/nested-ternaries-lit/A/src/swift-book-16a2a4caa408c86fc85bde1e1dfff4745b6e454c-BasicOperators.md`, `scratchpad/nested-ternaries-lit/A/src/swift-evolution-4c2e6b9152f859076b92b23d2bb7f65de33f7d30-0380-if-switch-expressions.md`

### 1.14 PHP's ternary was left-associative; 9 of 12 nested uses in the top 1,000 packages were bugs, and PHP 8.0 made unparenthesized nesting an error. VERIFIED (RFC page and raw export; PHP manual source)

- **Citation:** Nikita Popov, "PHP RFC: Deprecate left-associative ternary operator," 9 Apr 2019, status Implemented (PHP 7.4 and 8.0), https://wiki.php.net/rfc/ternary_associativity (raw export and rendered page saved); php/doc-en, `language/operators/comparison.xml` at `d67d8448`.
- **What it says:**
  - RFC: "Unlike most (all?) other languages, the ternary operator in PHP is left-associative" and "The left-associative behavior is generally not useful and confusing for" "programmers who switch between different languages." Its example chain `$a == 1 ? 'one' : $a == 2 ? 'two' : ...` would in PHP group from the left, "which is generally not what was intended."
  - Proposal: "In PHP 7.4 using nested ternaries without explicit parentheses will throw a deprecation warning." "In PHP 8.0 it will become a compile-time error instead." Exceptions: chained short ternaries `?:`, and "Parentheses are also not required when nesting into the middle operand,".
  - Evidence: "An analysis of the top 1000 composer packages found 12 instances" that the change affects; "9 of them are bugs, where a right-associative meaning was intended,". The other 3 were `$a ? $b : $c ?: $d` forms the author couldn't classify.
  - Vote (23 Apr–7 May 2019): 35 yes, 10 no.
  - Manual: "It is recommended to avoid 'stacking' ternary expressions." "As of PHP 8.0.0, the ternary operator is non-associative."
- **Caveat:** the 12-in-1,000-packages count is the RFC author's own analysis (a linked gist, not opened). The bugs came from PHP's unusual grouping, which JavaScript doesn't share.
- **For the post:** the one hard number on nested-ternary bugs is about associativity, not readability: when the grammar grouped against intuition, most real uses were wrong. JavaScript's grouping matches the intuitive reading (1.1), so this evidence doesn't transfer directly; it shows what readers assume, which is the right-nested chain.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/php-rfc-ternary_associativity.txt`, `scratchpad/nested-ternaries-lit/A/text/php-rfc-ternary_associativity.txt`, `scratchpad/nested-ternaries-lit/A/src/php-rfc-ternary_associativity.html`, `scratchpad/nested-ternaries-lit/A/src/php-doc-en-d67d84489b16d3fdf4cbe3815ed6f41340e333e0-comparison.xml`

### 1.15 TypeScript's conditional types are ternaries at the type level, and the standard library nests them. VERIFIED (PR #21316; handbook and 2.8 release notes at a pinned commit; lib.es5.d.ts 6.0.3). Vendor (Microsoft)

- **Citation:** Anders Hejlsberg, "Conditional types," microsoft/TypeScript PR #21316 (opened 20 Jan 2018, merged 3 Feb 2018), shipped in TypeScript 2.8; "Conditional Types", TypeScript Handbook, and "TypeScript 2.8" release notes, in microsoft/TypeScript-Website at `a93dd416`; `lib/lib.es5.d.ts` in the worktree's `typescript` 6.0.3.
- **What it says:**
  - PR: a conditional type "selects one of two possible types based on a condition" "expressed as a type relationship test". The PR's first example is a five-level chain, `type TypeName<T> = T extends string ? "string" : T extends number ? "number" : ...`; the handbook and release notes repeat it.
  - Handbook: "Conditional types take a form that looks a little like conditional expressions" and "When conditional types act on a generic type," "they become _distributive_ when given a union type." Wrapping both sides in brackets (`[Type] extends [any]`) turns that off.
  - `lib.es5.d.ts`: `Awaited<T>` nests in the true branch: `T extends null | undefined ? T : T extends object & { then(...) } ? F extends (...) ? Awaited<V> : never : T`, with a comment on every line.
- **Caveat:** none on the facts; whether nesting at the type level is readable is a separate question this entry doesn't answer.
- **For the post:** a nested ternary rule only polices values. TypeScript code that follows it may still be full of nested conditional types, including in TypeScript's own library, and nothing reports them (1.16).
- **Text:** `scratchpad/nested-ternaries-lit/A/src/ts-pr-21316.json`, `scratchpad/nested-ternaries-lit/A/src/ts-website-a93dd416c393cbc7570b829a9e0c753b2678249f-handbook-conditional-types.md`, `scratchpad/nested-ternaries-lit/A/src/ts-website-a93dd416c393cbc7570b829a9e0c753b2678249f-release-notes-2.8.md`, `scratchpad/nested-ternaries-lit/A/src/typescript-6.0.3-lib.es5.d.ts`

### 1.16 None of the four nesting rules report nested conditional types. My check (local run)

- **Citation:** my check, `scratchpad/nested-ternaries-lit/A/check/conditional-types/` (`nested-types.ts`, configs, outputs), run 11 Nov 2026.
- **What it says:** `nested-types.ts` has a three-level `TypeName<T>` chain, an `Unwrap<T>` that nests in the true branch like `Awaited`, and one value-level nested ternary on line 21 as a control.
  - Oxlint 1.90.0 (`no-nested-ternary`, `unicorn/no-nested-ternary`): two reports, both on line 21: "Do not nest ternary expressions." and "Unexpected nested ternary expression without parentheses."
  - ESLint 10.14.0 (`no-nested-ternary`, `unicorn/no-nested-ternary`, `sonarjs/no-nested-conditional`): three reports, all on line 21, including "Extract this nested ternary operation into an independent statement".
  - Biome 2.6.4 (`style/noNestedTernary`): one report, line 21.
  - No rule reported lines 2–17.
- **Caveat:** one small file. The rules match `ConditionalExpression` nodes; conditional types are `TSConditionalType` nodes in the ESTree TypeScript AST, so this is expected, but it was run rather than assumed. I didn't check whether cognitive-complexity rules count conditional types.
- **For the post:** say plainly that the rule is about runtime values, and that type-level nesting is idiomatic and unlinted.
- **Text:** `scratchpad/nested-ternaries-lit/A/check/conditional-types/oxlint-output.txt`, `scratchpad/nested-ternaries-lit/A/check/conditional-types/eslint-output.txt`, `scratchpad/nested-ternaries-lit/A/check/conditional-types/biome-output.txt`, `scratchpad/nested-ternaries-lit/A/check/conditional-types/nested-types.ts`

## 2. The rules: ESLint, eslint-plugin-unicorn, SonarJS, Oxlint and Biome

2.1–2.9 are ESLint's core rules, 2.10–2.15 and 2.23 eslint-plugin-unicorn's, 2.16–2.17 SonarJS's nested-conditional rule and cognitive complexity, 2.18–2.19 Oxlint's ports and their fixes, 2.20 Biome's rules, and 2.21–2.22 local runs of all three linters. Sources were read at pinned tags: ESLint `v10.14.0` (released 30 Oct 2026), eslint-plugin-unicorn `v79.0.0` (23 Oct 2026, the same code as the installed copy), eslint-plugin-sonarjs `4.2.2` (installed) and SonarSource/SonarJS at `3d6a0250`, Oxlint `oxlint_v1.90.0` (oxc `9b6fff42`), Biome `@biomejs/biome@2.6.4` (`56538746`). GitHub issues, PRs and commit lists are saved as text under `scratchpad/nested-ternaries-lit/B/text/gh/`; rule sources and docs under `scratchpad/nested-ternaries-lit/B/src/`.

**About the items tagged My check (local run).** Run on 11 Nov 2026 with the worktree's binaries: ESLint 10.14.0 with eslint-plugin-unicorn 79.0.0, eslint-plugin-sonarjs 4.2.2, eslint-plugin-react 7.37.5 and @typescript-eslint/parser 8.72.1; Oxlint 1.90.0; Biome 2.6.4; Node 24.14.1. The configs set only the rules in this section, with Ultracite's options (`scratchpad/nested-ternaries-lit/B/check/eslint.config.mjs`, `scratchpad/nested-ternaries-lit/B/check/oxlint/.oxlintrc.json`, `scratchpad/nested-ternaries-lit/B/check/biome/biome.json`), so other Ultracite rules (and the formatters) did not run. The hand-written inputs are in `scratchpad/nested-ternaries-lit/B/check/cases/`; each tool's output is a `.txt` in `scratchpad/nested-ternaries-lit/B/check/`, and each fixed copy is in a `fix-*` folder beside it. These are illustrations on small files, not rates. The preset-level runs in 11.7–11.10 agree on the cases both ran.

### 2.1 ESLint `no-nested-ternary` (Dec 2013, ESLint v0.2.0): one check, unchanged since the first commit. VERIFIED (commit, docs and source at `v10.14.0`, changelog)

- **Citation:** Ian Christian Myers, commit `70850e2b` "Rule no-nested-ternary," 16 Dec 2013, released in ESLint v0.2.0 (1 Jan 2014); `docs/src/rules/no-nested-ternary.md` and `lib/rules/no-nested-ternary.js` at `v10.14.0`. https://github.com/eslint/eslint/commit/70850e2becc06f95ce0c56f0b4c2f4b24f2a2479 , https://eslint.org/docs/latest/rules/no-nested-ternary
- **What it says:**
  - The commit message gives no issue number and no reason beyond "The `no-nested-ternary` rule disallows the use of nested ternary" expressions. No proposal issue was found in a search of eslint/eslint for the rule's name (100 results read by title, `search-eslint-no-nested-ternary.tsv`).
  - The 2013 docs: "Nesting ternary expressions makes code unclear." and the rule "aims to increase the clarity and readability of code". The docs at `v10.14.0` soften it to "Nesting ternary expressions can make code more difficult to understand." The suggested alternative in both is an `if`/`else if`/`else` chain that assigns a `let` (a `var` in 2013).
  - The check is the same in 2013 and 2026: report a `ConditionalExpression` whose `consequent` or `alternate` is itself a `ConditionalExpression`. Parentheses are not in the AST, so `a ? (b ? c : d) : e` is reported; a ternary in the test position, or one wrapped in anything else (`||`, a call, a template literal, a TypeScript `as`), is not.
  - Meta at `v10.14.0`: `type: "suggestion"`, `recommended: false`, `frozen: true`, `schema: []` (no options), no `fixable`, message "Do not nest ternary expressions." In 2013 it shipped off (`"no-nested-ternary": 0` in `conf/eslint.json`).
- **Caveat:** no recorded rationale for the rule or for having no fixer; nobody filed a request for a fixer that a title search found (`search-eslint-nested-ternary-fix.tsv`). Freezing is the general 2020 policy for stylistic rules (cross-reference `func-style.md` 3.10), not a decision about this rule.
- **For the post:** the rule's whole argument is one sentence, and it has never been stronger than "can make code more difficult". What it checks is narrower than its name: only direct nesting in the two branches.
- **Text:** `scratchpad/nested-ternaries-lit/B/text/gh/commits-eslint-origin-details.txt`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-nested-ternary-70850e2b.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-no-nested-ternary-70850e2b.js`, `scratchpad/nested-ternaries-lit/B/src/eslint/conf-eslint-70850e2b.json`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-nested-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-no-nested-ternary.js`, `scratchpad/nested-ternaries-lit/B/src/eslint/rules_meta-v10.14.0.json`, `scratchpad/nested-ternaries-lit/B/src/eslint/CHANGELOG-v10.14.0.md`, `scratchpad/nested-ternaries-lit/B/text/gh/search-eslint-no-nested-ternary.tsv`, `scratchpad/nested-ternaries-lit/B/text/gh/search-eslint-nested-ternary-fix.tsv`

### 2.2 Every proposed exception to `no-nested-ternary` was declined: parentheses, chains, depth, TypeScript types. VERIFIED (issues and PRs); ANECDOTAL as evidence of demand

- **Citation:** eslint/eslint #3480 (Qix-, Aug 2015), #10044 (lamflam, Mar 2018), #10321 and PR #10452 (zeorin, May–Jul 2018), #10352 (alexilyaev, May 2018), #12170 (arthurgeron, Aug 2019), #12641 (kaiyoma, Dec 2019), #13040 (hafezdivandari, Mar 2020), #19884 and PR #19908 (lumirlumir, Jun–Jul 2025). https://github.com/eslint/eslint/issues/3480
- **What it says:**
  - **Allow parenthesised nesting (#3480, 2015; again #13040, 2020).** The request came from xo (sindresorhus/xo#12). Sindre Sorhus: "I'm all for enforcing readability, which nested ternaries usually aren't," "but one extra level nested ternary wrapped in parens is pretty readable IMHO." Nicholas C. Zakas declined on rule interaction, not readability: "The trouble we'll run into is how this overlaps with `no-extra-parens`." "Since rules can't know about each other's settings," "this puts us in a tricky situation." The close: "Yeah, I don't think we can support this. Sorry, all." Kevin Partington (`platinumazure`): "We have to be extremely careful about rule collisions here,". A 2016 comment argued nested ternaries are hard to avoid in JSX, where the ternary is the only inline control flow. In 2020 Milos Djermanovic sketched a numeric depth option; Kai Cataldo: "My feeling in this case is that this would be a better fit" "for a 3rd party custom rule than a change in core." It auto-closed.
  - **Allow chains in the alternate (#10044, #10321, PR #10452, 2018).** Both cited a Medium post in favour of chained ternaries (`medium.com/javascript-scene/nested-ternaries-are-great-361bddd0f340`). Teddy Katz (`not-an-aardvark`): "I think most users who enable `no-nested-ternary` would want to disallow 'chaining' too." Ilya Volodin on the PR: "The whole point of the rule is that it's hard to read" "multiple ternary expressions." "What makes the first example easier to read is indentation and no negation." "It really feels like this enhancement breaks the purpose of the rule." The issue closed: "Closing because there does not seem to be team support for this proposal."
  - **Look deeper than direct children (#10352, #12170, #12641).** Kai Cataldo: "the `no-nested-ternary` rule doesn't traverse tree deeper than one level." Partington: "The rule is designed to catch directly nested conditional expressions." and suggested `no-restricted-syntax` with the selector `ConditionalExpression ConditionalExpression`, noting it also catches ternaries inside a nested function. Djermanovic (2019): "the rule targets only directly nested ternary expressions." Teddy Katz's objection to arbitrary depth was a ternary inside a function in a branch.
  - **Nested TypeScript conditional types (#19884, PR #19908, 2025).** Accepted by Zakas, then dropped. Kirk Waiblinger: "Nested ternaries for conditional types is idiomatic," and the pattern "doesn't really have a straightforward alternative the way non-type code does". Josh Goldberg (`JoshuaKGoldberg`): "That feels like a feature request on this frozen rule." Zakas closed the PR: "There's agreement to not move forward with this PR, so closing."
- **Caveat:** these threads show what maintainers would and would not maintain; they are not evidence about readability. Several closed by the 21-day auto-close bot rather than a decision.
- **For the post:** the arguments people bring for exceptions (parentheses, chains, JSX, conditional types) are the same ones the post should weigh. ESLint never ruled on them as readability claims; it declined them as maintenance and rule-collision problems, and for chains as against "the purpose of the rule".
- **Text:** `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-3480.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-10044.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-10321.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-10452.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-10352.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-12170.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-12641.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-13040.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-19884.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-19908.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/search-eslint-ternary-misc.tsv`, `scratchpad/nested-ternaries-lit/B/text/gh/github-profile-names.tsv`

### 2.3 ESLint `no-ternary` (Jul 2013, v0.0.9): a rule for teams that ban the operator outright. VERIFIED (commit, docs and source at `v10.14.0`)

- **Citation:** Ian Christian Myers, commit `53182da5` "Rule: no-ternary," 26 Jul 2013 (released in v0.0.9, 5 Oct 2013); docs and source at `v10.14.0`. https://eslint.org/docs/latest/rules/no-ternary
- **What it says:** the commit says it exists "as some people believe they reduce code clarity". The 2026 docs: "Some believe that the use of ternary operators leads to unclear code." Its "correct" example rewrites `return foo ? bar() : baz();` as an `if`/`else` with two returns, the shape `no-else-return` then reports. Meta: `frozen: true`, no options, no fix, message "Ternary operator used." Oxlint's port (`version = "0.2.14"`, Mar 2024, #2744) and Biome's `noTernary` (2.3.8) copy it; Biome claims it as the "same" as ESLint's.
- **Caveat:** the same author wrote `no-nested-ternary` five months later; neither commit cites a source.
- **For the post:** ESLint has offered a ban on every ternary since its first months, alongside the ban on nesting. Ultracite turns `no-ternary` off in all three linters, so its position is the narrower one.
- **Text:** `scratchpad/nested-ternaries-lit/B/text/gh/commits-eslint-origin-details.txt`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-ternary-53182da5.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-no-ternary.js`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/no_ternary.rs`

### 2.4 `no-unneeded-ternary` (May 2015, v0.21.0): its fixer has changed behaviour twice, and ESLint 10.14.0 still ships the second bug. VERIFIED (source and docs at `v10.14.0`, issues); my check (local run)

- **Citation:** Gyandeep Singh, commit `2247e0a0` (fixes #2391, a proposal by `michaelficarra`), v0.21.0 (9 May 2015); `defaultAssignment` from #3232 (v1.4.0, Sep 2015); fixer added in v3.13.0 (Jan 2017, #7540); Feross Aboukhadijeh, "Auto fix `no-unneeded-ternary` changes code behavior," #8507 (Apr 2017, fixed in v4.0.0-beta.0); `hoanle0126`, #21491 (5 Nov 2026), fixed by PR #21495 (merged 7 Nov 2026, after v10.14.0). https://github.com/eslint/eslint/issues/8507 , https://github.com/eslint/eslint/issues/21491
- **What it says:**
  - Reports a ternary whose two branches are boolean literals; with `defaultAssignment: false` it also reports `x ? x : expr` for an identifier `x`. The default is `true`, which allows `x ? x : expr`; Ultracite uses the default.
  - The fixer turns `x ? true : false` into `!!x`, or into the bare test when the test is a comparison, `in`, `instanceof` or `!`. It replaces `foo ? true : true` with `true` only when `foo` is an identifier, so a call's side effect is not dropped.
  - #8507: with `defaultAssignment: false`, `value ? value : canSet ? 'unset' : 'can not set'` was fixed to `value || canSet ? 'unset' : 'can not set'`, which binds differently. The fix now parenthesises the alternate.
  - #21491 (against 10.13.0): when the test is parenthesised, the fix drops the parentheses, "producing syntax errors or broken identifiers:", for example `return(a === b) ? false : true;` becomes `returna !== b;`.
- **My check (local run):** ESLint 10.14.0 `--fix` turned `return(a === b) ? false : true;` into `returna !== b;`, which parses and then throws `ReferenceError: returna is not defined` (`out-eslint-fix-diff.txt`, `out-node-semantics.txt`). Formatted code rarely has `return(` with no space, so the trigger is unusual.
- **For the post:** Fixes that simplify a ternary look trivial and have broken code more than once. The rule's docs also call `x ? x : 1` a "common mistake" while leaving it allowed by default; unicorn's `prefer-logical-operator-over-ternary` (2.12) is the rule that reports it in Ultracite.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-unneeded-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-no-unneeded-ternary.js`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-8507.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-14190.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-21491.txt`, `scratchpad/nested-ternaries-lit/B/src/eslint/CHANGELOG-v10.14.0.md`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-node-semantics.txt`

### 2.5 `no-negated-condition` (Oct 2015, v1.6.0) covers ternaries, and ESLint refused to give it a fixer. VERIFIED (docs and source at `v10.14.0`, issues)

- **Citation:** Alberto Rodríguez, commit `ebfc2908` (fixes #3740), v1.6.0 (2 Oct 2015); `fregante`, "Add autofix to `no-negated-condition`," #14792 (Jul 2021). https://eslint.org/docs/latest/rules/no-negated-condition , https://github.com/eslint/eslint/issues/14792
- **What it says:** the docs: "Negated conditions are more difficult to understand." It reports `if (!a) … else …`, `a != b` and `a !== b` with an `else`, and "ternary expressions" such as `!a ? c : b`; an `if` without `else`, or with `else if`, is allowed. No options, no fix, `frozen: true`. On #14792 Zakas: "The larger the area to fix, the more dangerous the fix becomes." Jordan Harband: "i extremely intentionally and strongly want the negated condition to go first," and preferred a suggestion. Zakas closed it: adding suggestions to frozen stylistic rules adds maintenance. Unicorn's version (2.15) is fixable and cites this refusal.
- **For the post:** `a !== undefined ? a : b` is reported as a negated condition. Both fixers (unicorn's, Oxlint's, Biome's) flip it to `a === undefined ? b : a`, which no rule then turns into `??` (2.12). The guard-clause style is safe from this rule: `if (!a) return;` has no `else`.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-negated-condition.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-no-negated-condition.js`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-14792.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/commits-eslint-origin-details.txt`

### 2.6 `no-else-return` (Aug 2013, v0.0.9) came from JSLint; `allowElseIf` defaults to `true`; it was not allowed to suggest ternaries. VERIFIED (commit, docs and source at `v10.14.0`, issues)

- **Citation:** Ian Christian Myers, commit `2d1874a6`, 12 Aug 2013 (v0.0.9); fixer v3.14.0 (Jan 2017, #7863); `allowElseIf` v4.9.0 (Oct 2017, #9228); name-collision guard v6.0.0 (#11069); JounQin, "[proposal] merge `unicorn/prefer-ternary` into `no-else-return`," #14121 (Feb 2021). https://github.com/eslint/eslint/issues/14121
- **What it says:** the commit: "This rule matches the same rule from JSLint:". It warns on an `else` after a chain of `if`s that all return; with `allowElseIf: true` (the default, and Ultracite's setting) `else if` is allowed and only the final `else` is reported. Message "Unnecessary 'else' after 'return'." The fixer unwraps the `else` block, and returns no fix when a `let`/`const` in the block would collide with a name in scope or when ASI could change meaning. #14121 asked for an option that rewrites `if (test) return 1; else return 2;` as `return test ? 1 : 2;`; Djermanovic: stylistic rules are frozen, "so we won't be able to accept this proposal."
- **For the post:** ESLint's own `else`-after-`return` rule points toward early returns, not ternaries. In Ultracite's ESLint config unicorn's `prefer-ternary` then turns the result into a ternary when only one guard is left (2.11, 2.22).
- **Text:** `scratchpad/nested-ternaries-lit/B/text/gh/commits-eslint-origin-details.txt`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-else-return.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-no-else-return.js`, `scratchpad/nested-ternaries-lit/B/text/gh/eslint_eslint-14121.txt`, `scratchpad/nested-ternaries-lit/B/src/eslint/CHANGELOG-v10.14.0.md`

### 2.7 `no-lonely-if` (Apr 2014, v0.6.0). VERIFIED (commit, docs and source at `v10.14.0`)

- **Citation:** Brandon Mills, commit `054fb714` (fixes #790), v0.6.0 (17 May 2014); fixer v3.8.0 (Oct 2016, #7202). https://eslint.org/docs/latest/rules/no-lonely-if
- **What it says:** reports an `if` that is the only statement in an `else` block and fixes it to `else if`. The docs: "it is often clearer to use an `else if` form." `frozen: true`, no options, fixable.
- **For the post:** it moves nested `if`/`else` toward flat chains, the same direction `no-else-return` and early returns take.
- **Text:** `scratchpad/nested-ternaries-lit/B/text/gh/commits-eslint-origin-details.txt`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-no-lonely-if.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-no-lonely-if.js`

### 2.8 `curly` (ESLint's first commit, 2013): default `"all"` reports `if (bool) return x;`, and it was never deprecated as a formatting rule. VERIFIED (source and docs at `v10.14.0`, early configs, the 8.53.0 announcement); my check (local run)

- **Citation:** Nicholas C. Zakas, first commit `a658d7b0` (29 Jun 2013) includes `lib/rules/curly.js`; `conf/eslint.json` at `v0.24.1` and `v1.0.0` (31 Jul 2015); docs and source at `v10.14.0`; ESLint team, "Deprecation of formatting rules," 26 Oct 2023 (v8.53.0, 3 Nov 2023). https://eslint.org/docs/latest/rules/curly , https://eslint.org/blog/2023/10/deprecating-formatting-rules/
- **What it says:**
  - Options: `"all"` (default), `"multi"`, `"multi-line"`, `"multi-or-nest"`, plus `"consistent"` with the `multi*` options. `defaultOptions: ["all"]`, `fixable: "code"`, `frozen: true`, `recommended: false`. Message "Expected { after '{{name}}' condition."
  - The rationale: "best practice to _never_ omit curly braces around blocks, even when they are optional," "because it can lead to bugs and reduces code clarity." The docs add that some prefer braces only for multiple statements.
  - It was on by default before 1.0 (`"curly": [2, "all"]` at `v0.24.1`) and off from 1.0 (`[0, "all"]`), when every rule became opt-in. It has never been in `eslint:recommended`.
  - It is not in the 8.53.0 list of deprecated formatting rules (`multiline-ternary` and `operator-linebreak` are, 2.9), and its meta at `v10.14.0` has no `deprecated`. eslint-config-prettier turns it off as one of its special rules (`specialRule` in its `index.js`); Ultracite turns it back on after spreading that config.
- **My check (local run):** `if (bool) return x;` is reported by ESLint `curly`, Oxlint `curly` and Biome `useBlockStatements`; all three fixes add braces (`if (bool) {return x;}` before formatting). A chain of one-line guards gets braces on every line (`out-eslint-check.txt`, `out-oxlint-check.txt`, `out-biome-lint.txt`, the `fix-*` folders).
- **For the post:** the exact spelling in Hayden's reason, `if (bool) return x;`, is an error under Ultracite in every linter; the braced form is what passes. The flatness survives, the one-liner does not.
- **Text:** `scratchpad/nested-ternaries-lit/B/text/gh/commits-eslint-origin-details.txt`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-curly.md`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-curly.js`, `scratchpad/nested-ternaries-lit/B/src/eslint/conf-eslint-v0.24.1.json`, `scratchpad/nested-ternaries-lit/B/src/eslint/conf-eslint-v1.0.0.json`, `scratchpad/nested-ternaries-lit/B/text/eslint-blog-2023-10-deprecating-formatting-rules.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-check.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-check.txt`, `scratchpad/nested-ternaries-lit/B/check/out-biome-lint.txt`

### 2.9 `multiline-ternary` and `operator-linebreak` were deprecated in 8.53.0 and leave core in 11.0.0. VERIFIED (source at `v10.14.0`, announcement)

- **Citation:** `lib/rules/multiline-ternary.js` (Kai Cataldo) and `lib/rules/operator-linebreak.js` at `v10.14.0`; "Deprecation of formatting rules" (2.8).
- **What it says:** both have `type: "layout"` and `deprecated` with `deprecatedSince: "8.53.0"`, `availableUntil: "11.0.0"`, message "Formatting rules are being moved out of ESLint core.", replaced by the same rules in `@stylistic/eslint-plugin`. The announcement's reason includes that the team had tried "freezing stylistic rules so that we were no longer chasing down corner cases" and it was not enough. eslint-config-prettier 10.1.8 turns both off (and their `@stylistic` copies). Neither is in Ultracite's three configs as an active rule.
- **For the post:** how a ternary is laid out is formatter territory in every Ultracite setup; the lint rules only decide whether it may exist. Section 5 covers what the formatters do.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/eslint/src-multiline-ternary.js`, `scratchpad/nested-ternaries-lit/B/src/eslint/src-operator-linebreak.js`, `scratchpad/nested-ternaries-lit/B/src/eslint/docs-multiline-ternary.md`, `scratchpad/nested-ternaries-lit/B/text/eslint-blog-2023-10-deprecating-formatting-rules.txt`

### 2.10 `unicorn/no-nested-ternary` (Sep 2019) exists because ESLint refused parentheses; its maintainer calls the parentheses the point. VERIFIED (issues, PR, docs and source at `v79.0.0`)

- **Citation:** Sindre Sorhus, "A better `no-nested-ternary` rule," sindresorhus/eslint-plugin-unicorn #50 (22 Sep 2016); George Karagkiaouris (`karaggeorge`), PR #296 (merged 16 Sep 2019, an IssueHunt bounty); report location changed in PR #844 (Sep 2020); `reteps`, #2901 (Feb 2026, declined 5 Jun 2026); docs and source at `v79.0.0`. https://github.com/sindresorhus/eslint-plugin-unicorn/issues/50 , https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2901
- **What it says:**
  - #50 opens "Since it was denied in ESLint:" and links #3480. Sam Verschueren asked whether to cap the depth; Sindre Sorhus: "Yes, forgot to mention that. Only one level. Shouldn't be configurable." and "this rule could be fixable, by just wrapping the nested ternary in parens." Jeroen Engels proposed ignoring ternaries inside calls in a branch; Sorhus agreed.
  - The rule: an innermost ternary one level deep must be parenthesised (message "Nested ternary expression should be parenthesized."); two levels or more is "Do not nest ternary expressions." Only the parenthesise case has a fix. Ternaries reached through anything other than direct `ConditionalExpression` parents are not counted.
  - The docs at `v79.0.0`: "This rule allows cases where the nested ternary is only one level" "and wrapped in parens." The reason: "Unparenthesized or deeply nested ternaries make readers track multiple conditions and branches at once," It is in unicorn's `recommended` config but not `unopinionated`, and unicorn's presets turn ESLint's `no-nested-ternary` off when it is on (`configs/core-rule-replacements.js`).
  - #2901 asked to allow `a ? b : c ? d : e` without parentheses so the rule could coexist with Prettier. Sorhus: "The parenthesization requirement is the core of this rule, not an incidental detail." and for Prettier users, "turning it off is the correct and intended resolution." #2604 (the Prettier conflict) was closed for the same reason.
- **My check (local run):** in ESLint and in Oxlint's port, `a ? (b ? "x" : "y") : "z"` and `a ? "x" : (b ? "y" : "z")` pass, the unparenthesised forms get the parenthesise message, and three levels get the depth message (`out-eslint-unicorn-no-nested-ternary.txt`, `out-oxlint-unicorn-no-nested-ternary.txt`).
- **For the post:** the two rule families disagree on one level of parenthesised nesting, and both maintainers have refused to meet in the middle. Ultracite takes ESLint's side, with the formatter fight as the stated reason (11.3; section 5).
- **Text:** `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-50.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-296.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-844.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-2901.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-2604.txt`, `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-no-nested-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-no-nested-ternary.js`, `scratchpad/nested-ternaries-lit/B/src/unicorn/configs-core-rule-replacements-v79.0.0.js`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-unicorn-no-nested-ternary.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-unicorn-no-nested-ternary.txt`

### 2.11 `unicorn/prefer-ternary` (Sep 2020): since v75 it rewrites a single guard plus `return` as a ternary, and since v76 and v79 it refuses to create nesting. VERIFIED (source and docs at `v79.0.0` and earlier commits, issues, PRs, release notes); my check (local run)

- **Citation:** `jmoore914`, PR #514 (merged 29 Sep 2020, fixes #486); `only-single-line` PR #1025 (Jan 2021, from #889); Abraham Guo (`abrahamguo`), #3656 → PR #3657 "Handle flat return statements," commit `2edc1587` (7 Sep 2026, v75.0.0, 16 Sep 2026); `Sli4o`, #3703 → PR #3709 "Preserve readable branches," `f7a35aea` (16 Sep 2026, v76.0.0, 19 Sep 2026); `checkVaryingBase` and `checkComputedMemberAccess` PR #3869 (v78.0.0, 12 Oct 2026); `ehoogeveen-medweb`, #3919 → PR #3945 "Preserve consecutive early-return guards," `3fa840fe` (22 Oct 2026, v79.0.0). Source and docs at `v79.0.0`. https://github.com/sindresorhus/eslint-plugin-unicorn/issues/3703 , https://github.com/sindresorhus/eslint-plugin-unicorn/issues/3919
- **What it says:**
  - **Original rationale (2020 docs):** "Using an `if-else` statement typically results in more lines of code" "than a single-line ternary expression," and `if`/`else` assignment forces a `let`.
  - **What it reports at `v79.0.0`:** an `if`/`else` whose branches return, assign the same target, `throw`, `await` or `yield` the same shape; with Ultracite's two options also calls that differ only in the callee or a computed key (`(test ? a : b)(value)`, `obj[a ? "open" : "close"]()`). Default option `"always"`. Message "This `if` statement can be replaced by a ternary expression."
  - **The flat form (the guard-then-return case):** since #3657 (v75.0.0, release note "`prefer-ternary`: Handle flat return statements (#3657)") an `if` without `else` that returns, followed directly by a `return`, is reported and fixed to `return test ? a : b;`. #3656 called it "philosophically identical to what this rule already reports,". No option turns this off; `only-single-line` only limits it to one-line code.
  - **Guards against nesting:** the 2020 version already skipped a branch whose returned or assigned value was itself a ternary, and a ternary test. #3703 showed `prefer-ternary` and `prefer-minimal-ternary` together turning a guard into a nested ternary: the pair "can force code with a clear early return into a nested ternary expression." and "In this case, the early return seems easier to follow than the resulting expression." #3709 (v76) added `hasTernary`, which skips any test or branch that contains a ternary anywhere, except inside a nested function. The v79 docs list this under "Readability boundaries" and show the example "Preserve the early return to avoid nesting ternaries."
  - **Guard chains:** #3919, against v78: for a run of guards the rule reported only the last `if`, and fixing it made the one before reportable, so "The only way to satisfy the rule is to collapse the whole chain" "into one expression." For a date comparator, "A full fix makes this a six-level nested ternary." The reporter's codebase got about 86 new reports on the update to 78.0.0, mostly good; "About a dozen were chains like the examples above." "For those, we added `eslint-disable-next-line` comments, because no rewrite read better than the original." #3945 (v79) skips an `if` whose previous statement is an `if` without `else` that returns: "Consecutive `if` guards without `else`, each containing only a `return`," "followed by a fallback `return`."
- **My check (local run, ESLint 10.14.0, unicorn 79.0.0, Ultracite's options):** reported and fixed: `if (isAdmin) return "admin"; return "user";` → `return isAdmin ? "admin" : "user";`; the braced `if (n > 10) { return "big"; } return "small";` → `return n > 10 ? "big" : "small";`; `if (bool) return x; return null;` → `return bool ? x : null;`. Not reported: a three-statement guard chain; an `if`/`else` whose branch returns a ternary; an `if`/`else if`/`else` chain; a guard followed by `return y ? 2 : 3;`. A plain `if`/`else` with two returns ended as a ternary after two passes (`no-else-return` first, then the flat-form fix). `let items = d; if (x) items = y;` is reported with a suggestion only. In 15 nesting shapes and 10 `if` shapes, no `prefer-ternary` fix produced a nested ternary; every nested ternary left after `--fix` was one I wrote (`out-eslint-check.txt`, `out-eslint-fix-diff.txt`, `out-eslint-after-fix.txt`). The preset-level run in 11.7–11.9 found the same for the flat forms.
  - **After v79:** Abraham Guo, #3960 (28 Oct 2026), asked for a way to turn the nesting guard off for projects without `no-nested-ternary`, since "it's a readability preference with no way to turn it off,". Sindre Sorhus merged PR #3965 the same day (`08de7889`, "`prefer-ternary`: Add `checkNestedTernaries` option (#3965)"), default off; per the proposal, a merged value that is a ternary gets parenthesised so one level still satisfies `unicorn/no-nested-ternary`. It is not in a release yet (latest release v79.0.0 when checked), so it does not affect Ultracite's installed version.
- **Caveat:** the "86" and "a dozen" are one reporter's count in one codebase. I could not run unicorn before v79 (nothing installed), so the v75–v78 cascades are from the issue reports.
- **For the post:** this is the rule in Ultracite's ESLint config that pulls against Hayden's stated style: a lone `if (bool) return x;` followed by a `return` is rewritten into a ternary. It stops at nesting, and since 23 Oct 2026 at guard chains, but only after users reported the cascade. Oxlint's port does neither (2.18).
- **Text:** `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-prefer-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-prefer-ternary.js`, `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-prefer-ternary-d59cf954.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-prefer-ternary-d59cf954.js`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-prefer-ternary-2edc158767.js`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-prefer-ternary-f7a35aeae3.js`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-prefer-ternary-3fa840fe7b.js`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-514.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3656.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3703.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3919.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3945.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3960.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3960-timeline.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/commits-unicorn-prefer-ternary-after-v79.tsv`, `scratchpad/nested-ternaries-lit/B/text/gh/releases-unicorn-latest.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/commits-unicorn-prefer-ternary.tsv`, `scratchpad/nested-ternaries-lit/B/text/gh/releases-unicorn-recent.md`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-check.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-after-fix.txt`

### 2.12 `unicorn/prefer-logical-operator-over-ternary` (Jun 2022) offers `??` first, which is not equivalent. VERIFIED (source and docs at `v79.0.0`, issue, PR); my check (local run)

- **Citation:** Fisker Cheung, #1798 "Rule proposal: `no-useless-ternary`" (Apr 2022) → PR #1830 (merged 30 Jun 2022); boolean-branch cases (v77, v78); docs and source at `v79.0.0`.
- **What it says:** reports `foo ? foo : bar`, `!bar ? foo : bar`, nullish checks such as `foo == null ? bar : foo`, and ternaries with one constant boolean branch. For `foo ? foo : bar` and `!bar ? foo : bar`, "the rule provides suggestions instead of automatic fixes" because `||` or `??` may be meant; the suggestions are offered in the order `??`, `||`. A nullish test gets a `??` suggestion only. `foo !== undefined ? foo : bar` is not reported (it checks only one of the two nullish values). Message "Prefer using a logical operator over a ternary." Fisker's proposal noted `no-unneeded-ternary` "only check identifier".
- **My check (local run):** ESLint's suggestions for `x ? x : y ? 1 : 2` are `x ?? (y ? 1 : 2)` and `x || (y ? 1 : 2)`, correctly parenthesised (`out-eslint-simple-suggestions.txt`). In Node, `a ? a : b` with `a = ""` gives `"fallback"`, the first suggestion `a ?? b` gives `""`; `!b ? a : b` with `b = 0` gives `"fallback"`, `b ?? a` gives `0` (`out-node-semantics.txt`). Only the `||` suggestion is equivalent for these two shapes.
- **For the post:** the rule replaces some ternaries with operators, but the first fix an editor offers can change falsy-value behaviour. That is why it is a suggestion, and why an agent accepting suggestions blindly is a risk. Oxlint's port applies its single suggestion under `--fix-dangerously` and gets the precedence wrong (2.19).
- **Text:** `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-prefer-logical-operator-over-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-prefer-logical-operator-over-ternary.js`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-1798.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-1830.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-simple-suggestions.txt`, `scratchpad/nested-ternaries-lit/B/check/out-node-semantics.txt`

### 2.13 `unicorn/prefer-minimal-ternary` (Jun 2026) and the two options Ultracite turns on. VERIFIED (source and docs at `v79.0.0`, PRs); my check (local run)

- **Citation:** Sindre Sorhus, PR #3222 (merged 14 Jun 2026, fixes #1625; v66.0.0); `checkComputedMemberAccess` PR #3241 (14 Jun 2026); `checkVaryingCallee` PR #3381 (21 Jun 2026), renamed `checkVaryingBase` in `825b7b9b` (Jul 2026); autofix PR #3716 (v76.0.0). https://github.com/sindresorhus/eslint-plugin-unicorn/pull/3222
- **What it says:** reports a ternary whose branches share an outer shape and differ in one part, and moves the ternary inward: `test ? call(a) : call(b)` → `call(test ? a : b)`. Both options default to `false`. On the PR, `fregante` (a unicorn collaborator): "I think I hate and disable every ternary rule." about `isMac ? event.metaKey : event.ctrlKey`; Sorhus: "I'm making it an option that's off by default:" (`checkComputedMemberAccess`). Ultracite's ESLint config turns both options on for this rule and for `prefer-ternary`, with the comment that both are off upstream.
- **My check (local run):** `a ? String(b ? 1 : 2) : String(3)` was not reported (moving the ternary in would nest it); `return b ? f(2) : f(3);` was fixed to `return f(b ? 2 : 3);`; `if (a) { obj.open(); } else { obj.close(); }` was fixed by `prefer-ternary` to `obj[a ? "open" : "close"]();`, which keeps `obj` as the receiver (`out-eslint-extra-check.txt`, `out-eslint-extra-fix-diff.txt`). Oxlint 1.90.0 has no port (`out-oxlint-rules-subset.txt`).
- **For the post:** a member of the plugin's own team disables these rules; Ultracite enables them beyond upstream defaults, on ESLint only.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-prefer-minimal-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-prefer-minimal-ternary.js`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3222.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/commits-unicorn-prefer-minimal-ternary.tsv`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-extra-check.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-extra-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-rules-subset.txt`

### 2.14 `unicorn/no-unnecessary-nested-ternary` (Jun 2026) removes the nesting by merging conditions. VERIFIED (source and docs at `v79.0.0`, issue, PR); my check (local run)

- **Citation:** Fisker Cheung, #2153 "Rule proposal: `no-identical-alternate`" (Jun 2023, accepted Jul 2023); Sindre Sorhus, PR #3023 (merged 6 Jun 2026); docs at `v79.0.0`; Biome port in progress, dyc3, PR biomejs/biome#13101 (opened 11 Nov 2026, open).
- **What it says:** when two branches are the same expression, `a ? (b ? c : d) : d` becomes `a && b ? c : d` and `a ? d : (b ? d : c)` becomes `a || b ? d : c`. Message "Do not use unnecessary nested ternary expressions." In both of unicorn's presets. The Biome PR's body says it was "implemented by Fable 5.2".
- **My check (local run):** ESLint fixed `a ? (b ? c : d) : d` to `a && b ? c : d` (`out-eslint-extra-fix-diff.txt`). Oxlint 1.90.0 has no port.
- **For the post:** one class of nested ternary has a mechanical, behaviour-preserving fix, and it is new.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-no-unnecessary-nested-ternary.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-no-unnecessary-nested-ternary.js`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-2153.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-3023.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/biomejs_biome-13101.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-extra-fix-diff.txt`

### 2.15 Unicorn's other neighbours: `no-negated-condition`, `no-lonely-if` and `prefer-early-return`, the rule closest to Hayden's reason. VERIFIED (docs and source at `v79.0.0`, PRs); my check (local run)

- **Citation:** `no-negated-condition`, Fisker Cheung, PR #1963 (Nov 2022); `no-lonely-if`, PR #936 (Dec 2020); `prefer-early-return`, PR #3131 (v66.0.0, Jun 2026), autofix PR #3212; docs at `v79.0.0`.
- **What it says:**
  - `no-negated-condition`: fixable, and covers "ternaries and `if`/`else` pairs, including the final `else if`/`else` pair." Its docs say ESLint's version is not fixable because "ESLint did not want to make it fixable." (2.5).
  - `no-lonely-if`: the inverse of ESLint's, an `if` that is the only statement in an `if` without `else`, merged with `&&`. "Nested `if` statements add indentation without adding an alternative branch,".
  - `prefer-early-return`: "Avoid wrapping the rest of a function body in a conditional." "A guard clause often makes the main path clearer by handling exceptional cases first." It reports a function whose last statement is an `if` without `else` with more than `maximumStatements` (default 1) statements, and fixes it to `if (!condition) return;` followed by the body.
  - All of these, and `prefer-ternary`, `prefer-minimal-ternary`, `prefer-logical-operator-over-ternary` and `no-unnecessary-nested-ternary`, are in both unicorn presets; `no-nested-ternary` is in `recommended` only.
- **My check (local run):** `x.prepare(); if (a) { x.run(); y.run(); }` was fixed to `if (!a) { return; }` plus the two calls (`out-eslint-extra-fix-diff.txt`). Ultracite's ESLint config turns on every unicorn rule, so `prefer-early-return` is on there; Oxlint 1.90.0 has no port.
- **For the post:** unicorn ships both directions: `prefer-early-return` pushes code into guards, `prefer-ternary` folds a lone guard into a ternary. Under Ultracite's ESLint config both are on.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-no-negated-condition.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-no-lonely-if.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-prefer-early-return.md`, `scratchpad/nested-ternaries-lit/B/text/gh/sindresorhus_eslint-plugin-unicorn-1963.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/releases-unicorn-recent.md`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-extra-fix-diff.txt`

### 2.16 SonarJS S3358 `no-nested-conditional`: any depth, except through arrays, objects, functions and JSX braces. VERIFIED (installed package, SonarJS source at `3d6a0250`, PRs); Vendor (Sonar)

- **Citation:** `cjs/S3358/rule.js` and `generated-meta.js` in eslint-plugin-sonarjs 4.2.2; `packages/analysis/src/jsts/rules/S3358/rule.ts`, `unit.test.ts` and `sonar-plugin/.../S3358.json` at SonarSource/SonarJS `3d6a0250`; Yassin Kammoun, SonarSource/SonarJS PR #2096 (Sep 2020); `francoismora`, PR #3279 "Add exception to S3358 and JSX" (Jul 2022). https://github.com/SonarSource/SonarJS/pull/2096 , https://github.com/SonarSource/SonarJS/pull/3279
- **What it says:**
  - Title "Ternary operators should not be nested"; `CODE_SMELL`, maintainability impact MEDIUM, default severity Major, tags `confusing` and `editable-source`, 5 min remediation, in the "Sonar way" and "Sonar agentic AI" profiles; `recommended: true` in the plugin; no fixer. Message "Extract this nested ternary operation into an independent statement."
  - Implementation: selector `ConditionalExpression ConditionalExpression` (any descendant, including the test), skipped if an `ArrayExpression`, `ObjectExpression`, `FunctionExpression`, `ArrowFunctionExpression` or `JSXExpressionContainer` sits between the two. It reports the inner ternary.
  - #2096 moved off ESLint's rule because "Issues are reported on the nesting ternary expression, not the nested one." and "Only direct children are considered." #3279 added the JSX exception; the approving review: "nice, many issues gone from ruling". The issue it fixes (#3244) is not readable: SonarJS has GitHub issues disabled.
- **My check (local run):** S3358 reports nesting that ESLint core, Oxlint and Biome miss: in the test, through `||`, inside a call, inside a template literal, inside TypeScript `as` and `!` (`out-eslint-check.txt`). It does not report a ternary inside JSX children or attributes within a ternary branch, or inside an array, object or arrow.
- **Caveat:** Sonar's rule description page is a client-rendered app and its public rules API needs an organisation; I could not save the description text, only the metadata and source.
- **For the post:** Ultracite's ESLint config and its opt-in Oxlint JS-plugins preset run a second, broader nested-ternary rule from a vendor, which counts any depth but exempts JSX. The two rules disagree in both directions.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/sonarjs/installed-4.2.2/rule.js`, `scratchpad/nested-ternaries-lit/B/src/sonarjs/installed-4.2.2/generated-meta.js`, `scratchpad/nested-ternaries-lit/B/src/sonarjs/SonarJS-S3358-rule-3d6a025054.ts`, `scratchpad/nested-ternaries-lit/B/src/sonarjs/SonarJS-S3358-unit.test-3d6a025054.ts`, `scratchpad/nested-ternaries-lit/B/src/sonarjs/SonarJS-3d6a025054-S3358.json`, `scratchpad/nested-ternaries-lit/B/text/gh/SonarSource_SonarJS-2096.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/SonarSource_SonarJS-3279.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/SonarSource_SonarJS-3244.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-check.txt`

### 2.17 Sonar's cognitive complexity scores the same four-way choice from 0 to 6, and the nested ternary scores worst. My check (local run); cross-reference `cognitive-complexity.md` §2.1, §2.4

- **Method:** `scratchpad/nested-ternaries-lit/B/check/cases/cc.js`, ten functions returning `"a"`–`"d"` or `1`–`3`; `sonarjs/cognitive-complexity` with threshold 0 in ESLint 10.14.0 (sonarjs 4.2.2), and again through Oxlint 1.90.0's `jsPlugins`, which gave identical scores.
- **Result:**

| Function                                               | Score |
| ------------------------------------------------------ | ----- |
| `x === 1 ? "a" : x === 2 ? "b" : x === 3 ? "c" : "d"`  | 6     |
| `if`/`else if`/`else if`/`else`, four returns          | 4     |
| three `if (…) { return …; }` guards, then `return "d"` | 3     |
| `switch` with four cases                               | 1     |
| `return LOOKUP[x] ?? "d";`                             | 0     |
| `a ? (b ? 1 : 2) : 3`                                  | 3     |
| `if (a) { if (b) { return 1; } return 2; } return 3;`  | 3     |
| `if (a) { return 1; } else { return 2; }`              | 2     |
| `if (a) { return 1; } return 2;`                       | 1     |
| `return a ? 1 : 2;`                                    | 1     |

- **What it shows:** the white paper's rules, as cross-referenced: a ternary is a structural increment that also nests, while `else if` and `else` are hybrid increments with no nesting penalty, and an early return costs nothing. So the chained ternary pays 1 + 2 + 3, the `else if` chain 1 per branch, the guards 1 each, `switch` 1, and a lookup with `??` nothing (SonarJS skips `??`, `cognitive-complexity.md` §2.4). Dropping an `else` after a `return` lowers the score by 1. S3776 also counts nesting through arrays, objects and JSX that S3358 exempts (in `jsx.jsx`, a ternary inside JSX inside a ternary scores 3; `out-oxlint-jsplugin-sonarjs.txt`).
- **For the post:** a measured, reproducible way to show that the rewrite matters: the same logic scores 6, 4, 3, 1 or 0 depending on spelling. The scoring rules are Sonar's judgement, not a measurement of readers (cross-reference `cognitive-complexity.md` §3).
- **Text:** `scratchpad/nested-ternaries-lit/B/check/out-eslint-sonarjs-cc0.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-jsplugin-sonarjs.txt`, `scratchpad/nested-ternaries-lit/B/check/cases/cc.js`

### 2.18 Oxlint's ports: when each landed and where each differs from ESLint and unicorn. VERIFIED (source at `oxlint_v1.90.0`, commit lists, PRs); my check (local run); Vendor (VoidZero/Oxc)

- **Citation:** `crates/oxc_linter/src/rules/{eslint,unicorn}/*.rs` at `oxlint_v1.90.0`; first commit of each file; `oxlint --rules --format=json` from the 1.90.0 binary (872 rules). Plain `oxlint --rules` printed nothing when its output was piped.

| Rule | Added (PR, date, `version`) | Category | Fix |
| --- | --- | --- | --- |
| `no-nested-ternary` | #8150, 27 Dec 2024, 0.15.4 | style | none |
| `no-ternary` | #2744, 17 Mar 2024, 0.2.14 | style | none |
| `no-unneeded-ternary` | #9160, 17 Feb 2025, 0.15.12 | suspicious | dangerous |
| `no-negated-condition` | 0.0.18 (moved to the eslint scope in #8149, Dec 2024) | pedantic | fix |
| `no-else-return` | #4305, 1 Oct 2024, 0.9.10 | pedantic | conditional |
| `no-lonely-if` | #9660, 13 Mar 2025, 0.16.0 | pedantic | pending (none) |
| `curly` | #8123, 27 Feb 2025, 0.15.13 | style | fix |
| `unicorn/no-nested-ternary` | #1417, 19 Nov 2023, 0.0.18 | style | conditional |
| `unicorn/prefer-ternary` | #19605, 21 Feb 2026, 1.50.0 | style | pending (none) |
| `unicorn/prefer-logical-operator-over-ternary` | #1064, 26 Oct 2023, 0.0.15 | style | suggestion |
| `unicorn/no-negated-condition` | #1253, 13 Nov 2023, 0.0.18 | pedantic | fix |
| `unicorn/no-lonely-if` | #1252, 13 Nov 2023, 0.0.18 | pedantic | pending (none) |

- **Differences found:**
  - `no-nested-ternary` unwraps parentheses and TypeScript wrappers (`get_inner_expression`), so `a ? ((b ? 1 : 2) as number) : 3` and a non-null `(…)!` are reported; ESLint (with the TypeScript parser) and Biome do not report them. Help text "Refactor nested ternary expressions into if-else statements for better readability."
  - `unicorn/prefer-ternary` returns early when the `if` has no `else`, so the flat guard-plus-`return` form (2.11) is never reported; its options are `"always"` and `"only-single-line"` only (no `checkVaryingBase` or `checkComputedMemberAccess`); it has no fix; and its nesting guard checks only whether a branch value or the test is itself a ternary, not whether one is inside. Message "Prefer ternary expressions over simple `if-else` statements."
  - `no-negated-condition` has a fix in Oxlint; ESLint's does not (2.5).
  - Not in Oxlint 1.90.0: `unicorn/prefer-minimal-ternary`, `unicorn/no-unnecessary-nested-ternary`, `unicorn/prefer-early-return`, `unicorn/prefer-combined-guards`, `react/jsx-no-leaked-render` (Ultracite's opt-in JS-plugins preset covers the last with `react-doctor/jsx-numeric-and-leaked-render`).
- **My check (local run):** Oxlint reported none of the three flat-guard cases that ESLint's `prefer-ternary` rewrites, and after `--fix` left `if (isAdmin) {return "admin";} return "user";` and turned a plain `if`/`else` with two returns into a guard and a `return`, where ESLint produced a ternary (`out-oxlint-check.txt`, `out-oxlint-fix-diff.txt`).
- **For the post:** an Oxlint user and an ESLint user of the same Ultracite version get different code from the same `if`/`else`: Oxlint and Biome leave early returns, ESLint leaves a ternary. Worth raising with Hayden as a parity gap (see Notes).
- **Text:** `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_nested_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_unneeded_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_negated_condition.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_else_return.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_lonely_if.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_curly.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/unicorn_no_nested_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/unicorn_prefer_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/unicorn_prefer_logical_operator_over_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/unicorn_no_negated_condition.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/unicorn_no_lonely_if.rs`, `scratchpad/nested-ternaries-lit/B/text/gh/oxc-project_oxc-19605.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/oxc-project_oxc-8150.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/oxc-project_oxc-1417.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-rules.json`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-rules-subset.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-check.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-fix-diff.txt`

### 2.19 Three of Oxlint's dangerous fixes on ternaries change behaviour; `ultracite fix --unsafe` applies them. My check (local run); VERIFIED (source at `oxlint_v1.90.0`, Ultracite's `fix` command)

- **Method:** Oxlint 1.90.0 `--fix` and `--fix-dangerously` on `cases/simple.js`, then each before/after pair evaluated in Node 24.14.1. Ultracite's `packages/cli/src/commands/fix.ts` runs Oxlint with `--fix`, and with `--fix-dangerously` when `--unsafe` is passed.
- **Result:**
  - `x ? x : y ? 1 : 2` → `x || y ? 1 : 2` (`unicorn/prefer-logical-operator-over-ternary`'s suggestion). That parses as `(x || y) ? 1 : 2`: with `x = "a"` the original gives `"a"`, the fix gives `1`. The port builds `"{test} || {alternate}"` and parenthesises the alternate only when it is a `??` expression; unicorn's own suggestion is `x || (y ? 1 : 2)` (2.12). It is the shape of ESLint #8507 (2.4) in a different rule.
  - `a + b ? true : false` → `a + b` (`no-unneeded-ternary`): the port returns the test unchanged for any binary expression when the branches are `true : false`, so a number replaces a boolean (`3` for `true`). ESLint and Biome give `!!(a + b)`.
  - `f() ? true : true` → `true`: the call is dropped. ESLint offers no fix for a non-identifier test, and Biome reports it without a fix.
  - Under plain `--fix` none of these is applied. Ultracite's `fix` command, when `--unsafe` is passed to ESLint, warns that it "applies Biome's unsafe fixes and Oxlint's dangerous fixes."
- **Caveat:** a title search of oxc-project/oxc for the rule name found no matching report (`search-oxc-prefer-logical.tsv`); I did not file one (read-only).
- **For the post:** if the post tells agents or users to run fixes with `--unsafe`, it should say these exist. Hand the `x ? x : y ? 1 : 2` case to Hayden as a likely upstream bug.
- **Text:** `scratchpad/nested-ternaries-lit/B/check/out-oxlint-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-node-semantics.txt`, `scratchpad/nested-ternaries-lit/B/check/runtime/semantics.mjs`, `scratchpad/nested-ternaries-lit/B/src/oxc/unicorn_prefer_logical_operator_over_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/oxc/eslint_no_unneeded_ternary.rs`, `scratchpad/nested-ternaries-lit/B/text/gh/search-oxc-prefer-logical.tsv`, `scratchpad/nested-ternaries-lit/B/src/ultracite/commands-fix.ts`

### 2.20 Biome's rules: `noNestedTernary` (1.9.3, Sep 2024) missed parenthesised nesting until Nov 2025; `useBlockStatements` is unsafe by default. VERIFIED (source at `@biomejs/biome@2.6.4`, `biome explain`, PRs, Ultracite's history); my check (local run)

- **Citation:** `kaykdm`, biomejs/biome PR #4067 "feat(linter): implement no-nested-ternary" (merged 25 Sep 2024); promoted out of nursery in #5899 (May 2025); `fronterior`, #8045 (Nov 2025) → `matanshavit`, PR #8086 (merged 12 Nov 2025); Carson McManus (`dyc3`), PR #9927 (Apr 2026, adds unicorn as an "inspired" source); `jon-hotaisle`, haydenbleasel/ultracite #546 (27 Jan 2026), fixed in `4b9d206b` (7 Feb 2026). Rule sources at `@biomejs/biome@2.6.4`.
- **What it says:**

| Rule | Since | Group | Fix | Sources claimed |
| --- | --- | --- | --- | --- |
| `noNestedTernary` | 1.9.3 | style | none | ESLint `no-nested-ternary` (same), unicorn `no-nested-ternary` (inspired) |
| `noUselessTernary` | 1.5.0 | complexity, recommended | unsafe | ESLint `no-unneeded-ternary` (same) |
| `noNegationElse` | 1.0.0 | style | safe | ESLint and unicorn `no-negated-condition`, Clippy `if_not_else` |
| `noUselessElse` | 1.3.0 | style | safe | ESLint `no-else-return` (inspired), Clippy `redundant_else` |
| `useCollapsedIf` | 1.9.4 | style | safe | unicorn `no-lonely-if`, Clippy `collapsible_if` |
| `useCollapsedElseIf` | 1.1.0 | style | safe | ESLint `no-lonely-if`, Clippy `collapsible_else_if` |
| `useBlockStatements` | 1.0.0 | style, default severity warn | unsafe | ESLint `curly` (same) |
| `noTernary` | 2.3.8 | style | none | ESLint `no-ternary` (same) |

- `noNestedTernary` checks only the direct `consequent` and `alternate`, after removing parentheses, and reports the inner ternary. Notes: "Nesting ternary expressions can make code more difficult to understand." and "Convert nested ternary expression into if-else statements or separate the conditions". In review, dyc3 wrote "I think this condition would only detect ternaries that are directly nested."; the author: "I'm not sure we should detect non-directly nested ternaries." and "Maybe we can add support later if there's enough demand for it."
- Until #8086 it did not see through parentheses, "because the parentheses prevented detection." The PR states "This PR was written primarily with Claude Code."
- `useBlockStatements` note: "Without braces, it is easy to add a second statement" "that looks like part of the block but is not." Its fix is `Unsafe` and the source gives no reason. Ultracite #546: "I'm willing to roll the dice if you are," "and this is driving me batty." Ultracite then set `fix: "safe"` and documented it: "These fixes are non-breaking and safe to apply automatically:".
- `noUselessElse` has no `allowElseIf` equivalent: it reports `else if` after a returning branch too. Note: "The clause adds a level of nesting without changing behavior."
- **My check (local run):** Biome reported the same nesting shapes as ESLint core and missed the same ones, including the TypeScript wrappers; it reported every `else if` in a four-way return chain, and its safe fix turned the chain into separate `if`s with early returns; `--write` added braces to `if (bool) return x;`; `--write --unsafe` turned `return(a === b) ? false : true;` into a valid `return!(a === b);` and `a + b ? true : false` into `!!(a + b )`, and left `f() ? true : true` unfixed (`out-biome-lint.txt`, `out-biome-fix-diff.txt`). Biome has no `prefer-ternary` equivalent, so nothing in it creates a ternary.
- **For the post:** Biome is the strictest of the three on flattening (every `else` after a return, including `else if`) and has no rule that converts back to a ternary. Its nested-ternary check had a hole for parenthesised nesting for over a year, closed by an AI-written two-line fix.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/biome/no_nested_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/no_useless_ternary.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/no_negation_else.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/no_useless_else.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/use_collapsed_if.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/use_collapsed_else_if.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/use_block_statements.rs`, `scratchpad/nested-ternaries-lit/B/src/biome/no_ternary.rs`, `scratchpad/nested-ternaries-lit/B/check/biome-explain/explain-noNestedTernary.txt`, `scratchpad/nested-ternaries-lit/B/check/biome-explain/explain-useBlockStatements.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/biomejs_biome-4067.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/biomejs_biome-8045.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/biomejs_biome-8086.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/biomejs_biome-9927.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/haydenbleasel_ultracite-546.txt`, `scratchpad/nested-ternaries-lit/B/text/gh/ultracite-commit-4b9d206b-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-biome-lint.txt`, `scratchpad/nested-ternaries-lit/B/check/out-biome-fix-diff.txt`

### 2.21 Which nesting each linter sees. My check (local run)

- **Method:** `cases/nesting.js`, `nesting.ts` and `jsx.jsx` through the three configs above, plus `unicorn/no-nested-ternary` on its own (off in Ultracite).

| Case | ESLint core | Oxlint | Biome | unicorn | SonarJS S3358 |
| --- | --- | --- | --- | --- | --- |
| `a ? "x" : b ? "y" : "z"` | yes | yes | yes | parenthesise | yes |
| three levels in the alternate | yes (2) | yes (2) | yes (2) | too deep | yes (2) |
| `a ? b ? "x" : "y" : "z"` | yes | yes | yes | parenthesise | yes |
| `a ? (b ? "x" : "y") : "z"` | yes | yes | yes | allowed | yes |
| `a ? "x" : (b ? "y" : "z")` | yes | yes | yes | allowed | yes |
| `(a ? b : !b) ? "x" : "y"` (test) | no | no | no | allowed | yes |
| `a ? (b ? c : null) \|\| "d" : "e"` | no | no | no | no | yes |
| `a ? String(b ? 1 : 2) : "z"` | no | no | no | no | yes |
| ``a ? `n-${b ? 1 : 2}` : "z"`` | no | no | no | no | yes |
| `` `${a ? "x" : "y"}` `` (one ternary) | no | no | no | no | no |
| ternary in an array, object or arrow in a branch | no | no | no | no | no |
| TS `a ? ((b ? 1 : 2) as number) : 3` | no | yes | no | not run | yes |
| TS nested conditional type | no | no | no | not run | no |
| JSX `{loading ? <Spinner /> : error ? <Failure /> : <List />}` | yes | yes | yes | parenthesise | yes |
| the same with the inner ternary parenthesised | yes | yes | yes | allowed | yes |
| JSX ternary inside a child element of a ternary branch | no | no | no | no | no |
| `count && <span>{count}</span>` | `react/jsx-no-leaked-render` | not native | `noLeakedRender` | n/a | n/a |

- **What it shows:** the three core rules agree except on TypeScript wrappers, and all see only direct nesting. Only Sonar's rule follows a ternary through operators, calls and template literals. JSX loading/error/data chains, the most common real-world case in React, are reported by all of them; a ternary inside JSX inside a ternary is reported by none. `react/jsx-no-leaked-render`'s fix turns `count && <span>` into `count ? <span>{count}</span> : null`, adding a ternary; it did not fire on a `&&` already inside a ternary branch, so in my files its fix never created nesting (`out-eslint-extra-check.txt`).
- **Text:** `scratchpad/nested-ternaries-lit/B/check/cases/nesting.js`, `scratchpad/nested-ternaries-lit/B/check/cases/nesting.ts`, `scratchpad/nested-ternaries-lit/B/check/cases/jsx.jsx`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-check.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-check.txt`, `scratchpad/nested-ternaries-lit/B/check/out-biome-lint.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-unicorn-no-nested-ternary.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-unicorn-no-nested-ternary.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-extra-check.txt`

### 2.22 Where `--fix` leaves an `if`/`else` in each linter. My check (local run)

- **Method:** `cases/prefer-ternary.js` and `cases/simple.js`, fixed by ESLint `--fix` (up to ten passes), Oxlint `--fix` (run twice) and Biome `lint --write` with Ultracite's rules; formatters not run.

| Input | ESLint | Oxlint | Biome |
| --- | --- | --- | --- |
| `if (a) { return x; } else { return y; }` | `return a ? x : y;` | `if (a) { return x; } return y;` | same as Oxlint |
| `if (isAdmin) return "admin"; return "user";` | `return isAdmin ? "admin" : "user";` | braces added | braces added |
| guard chain `if…return; if…return; return 0;` | braces added | braces added | braces added |
| `if (x) { return y ? 1 : 2; } else { return 3; }` | `else` removed | `else` removed | `else` removed |
| `if`/`else if`/`else`, three returns | final `else` removed | final `else` removed | every `else` removed |
| `if (a) {1} else { if (b) {2} else {3} }` | three guards | three guards | three guards |
| `let label; if (x) { label = "on"; } else { label = "off"; }` | `label = x ? "on" : "off";` | reported, no fix | not reported |
| `if (!a) { one(); } else { two(); }` | `(a ? two : one)();` | branches swapped | branches swapped |
| `x ? true : false` | `!!x` | not fixed (dangerous) | not fixed (unsafe) |

- **What it shows:** `prefer-ternary` and `no-nested-ternary` did not pull against each other in v79: no fix created a nested ternary, and no fix was undone by another. The pull is between `prefer-ternary` and early returns: when one guard and a `return` remain, ESLint folds them into a ternary, while Oxlint and Biome keep the guard. The ESLint result also depends on which fix lands first: `no-else-return`'s fix covers the whole function, so a guard before an `if`/`else` (case J in the file) ends as a guard chain rather than a ternary.
- **Caveat:** my ESLint config left out `unicorn/no-useless-else` (2.23), which is on in Ultracite's preset; with it, ESLint also reports every `else if` after a return, as Biome does.
- **Text:** `scratchpad/nested-ternaries-lit/B/check/cases/prefer-ternary.js`, `scratchpad/nested-ternaries-lit/B/check/cases/simple.js`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-after-fix.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-fix-pass2.txt`, `scratchpad/nested-ternaries-lit/B/check/out-biome-fix-diff.txt`, `scratchpad/nested-ternaries-lit/B/check/out-biome-after-fix-write.txt`

### 2.23 `unicorn/no-useless-else` (Jun 2026): a broader `no-else-return` that also reports `else if`. VERIFIED (docs and source at `v79.0.0`, commit list, release notes); my check (local run)

- **Citation:** Sindre Sorhus, "Add `no-useless-else` rule (#3152)," `a99a914c`, 12 Jun 2026; code path analysis added in #3289 (16 Jun 2026); docs and source at `v79.0.0`.
- **What it says:** "When an `if` branch always exits, its `else` branch is unnecessary." It treats `return`, `throw`, `break`, `continue` and a terminal `process.exit()` as exits and uses code path analysis, so an `if` whose branches all exit counts too. On `no-else-return`, its docs say it "always reports `else if`" and covers more exits. The fix skips cases that could affect scoped declarations, comments or ASI. Message "Unexpected `else` after a statement that exits." In unicorn's `recommended` config but not `unopinionated`; on in Ultracite's ESLint preset (every unicorn rule is on, and it has no override). Oxlint 1.90.0 has no rule by this name (`out-oxlint-rules.json`).
- **My check (local run):** added to my ESLint config, it reported each `else` that `no-else-return` reported, plus the first `else if` in a four-way return chain, which `no-else-return` allows by default (`out-eslint-with-no-useless-else.txt`).
- **For the post:** in Ultracite's ESLint preset two rules report the same `else`, and one of them (like Biome's `noUselessElse`) also flattens `else if` chains into guards; Oxlint's preset keeps `allowElseIf`. The direction is the same everywhere: toward early exits.
- **Text:** `scratchpad/nested-ternaries-lit/B/src/unicorn/docs-no-useless-else.md`, `scratchpad/nested-ternaries-lit/B/src/unicorn/src-no-useless-else.js`, `scratchpad/nested-ternaries-lit/B/text/gh/commits-unicorn-no-useless-else.tsv`, `scratchpad/nested-ternaries-lit/B/text/gh/releases-unicorn-recent.md`, `scratchpad/nested-ternaries-lit/B/check/out-eslint-with-no-useless-else.txt`, `scratchpad/nested-ternaries-lit/B/check/out-oxlint-rules.json`

## 3. React and conditional rendering

3.1–3.5 are the leaked-render rules in each linter, 3.6–3.7 React's own docs, and 3.8 React's documented patterns under Ultracite's rules. Sources were read at pinned tags or commits with read-only `gh api` and unauthenticated `curl`; every quote is copied from a file saved under `scratchpad/nested-ternaries-lit/C/src` or `C/text`, or from tool output saved under `C/check`. Local runs used the worktree's own binaries: ESLint 10.14.0, eslint-plugin-react 7.37.5, eslint-plugin-unicorn 79.0.0, eslint-plugin-sonarjs 4.2.2, eslint-plugin-react-doctor 0.9.21 (which wraps oxlint-plugin-react-doctor 0.9.21), @typescript-eslint/eslint-plugin 8.72.1, Oxlint 1.90.0 and Biome 2.6.4, on Node 24.14.1.

### 3.1 `react/jsx-no-leaked-render`: what it reports, its two strategies, and its history. VERIFIED (source, docs and changelog at `v7.37.5`; PR #3203)

- **Citation:** eslint-plugin-react `v7.37.5`, `docs/rules/jsx-no-leaked-render.md` and `lib/rules/jsx-no-leaked-render.js`, https://github.com/jsx-eslint/eslint-plugin-react/blob/v7.37.5/docs/rules/jsx-no-leaked-render.md ; PR #3203 "[New] add `jsx-no-leaked-render`" by Mario Beltrán (Belco90), opened 12 Feb 2022, merged 26 Apr 2022 (`ef733fd4`), https://github.com/jsx-eslint/eslint-plugin-react/pull/3203 ; `CHANGELOG.md` at `v7.37.5` (released in 7.30.0, 18 May 2022).
- **What it says:**
  - Docs: "Using the `&&` operator to render some element conditionally in JSX" "can cause unexpected values being rendered, or even crashing the rendering." Two remedies: "coercing the conditional to a boolean" or "transforming the binary expression into a ternary expression which returns `null` for falsy values".
  - Option `validStrategies`, default `["ternary", "coerce"]`: "The first option from the array will be the strategy used when autofixing," so by default the fix writes a ternary. With `ternary` among the valid strategies, ternaries are never reported; with `coerce` valid, any left side that is a `UnaryExpression`, `BinaryExpression` or `CallExpression` is accepted (`COERCE_VALID_LEFT_SIDE_EXPRESSIONS` in the source).
  - The ternary fixer is one line: it replaces the whole `&&` with `${leftSideText} ? ${rightSideText} : null`, taking the right side's text without its parentheses. Nothing checks whether the right side is already a ternary (see 3.2).
  - The rule only matches `JSXExpressionContainer > LogicalExpression[operator="&&"]`, so an `&&` that sits deeper in an expression is not checked. It has `recommended: false`. Since #3488 it ignores `''` on the left for React 18 and later.
  - It can't see types: the docs say a boolean condition is still reported "since it can't infer the type of the condition." Its "When Not To Use It": "If you are working in a typed-codebase which encourages you" "to always use boolean conditions, this rule can be disabled."
  - History: the PR began as `jsx-no-leaked-zero`; Mario Beltrán renamed it because "`NaN` is also leaked in React" and "Not casting to bool causes crashes in React Native". Reviewing the strategy option, Jordan Harband (ljharb) wrote that "typically rules don't have autofix-specific options". Later fixes in the changelog: "autofix nested '&&' logical expressions" (#3353), "coerce strategy now allows a ternary" (#3370), "invalid fixes in coerce mode" (#3511).
  - In the PR thread (Oct 2022), Karl Horky found that an empty string outside `<Text>` no longer crashed React Native 0.70.1, which turned out to be a deliberate React 18 change (facebook/react-native#35002); the docs were then changed (#3468).
- **Caveat:** a plugin rule and its docs, not a study. The React Native crash claim is the plugin's; React and React Native behaviour is verified from primary sources in 8.13–8.14.
- **For the post:** the rule that pushes `&&` toward a ternary is the same family of rule that forbids nesting ternaries; its fix is purely textual, so it can create the construct `no-nested-ternary` reports (3.2).
- **Text:** `scratchpad/nested-ternaries-lit/C/src/react/eslint-plugin-react-v7.37.5-jsx-no-leaked-render.md`, `scratchpad/nested-ternaries-lit/C/src/react/eslint-plugin-react-v7.37.5-jsx-no-leaked-render.js`, `scratchpad/nested-ternaries-lit/C/src/react/eslint-plugin-react-v7.37.5-CHANGELOG.md`, `scratchpad/nested-ternaries-lit/C/src/react/pr-3203.json`, `scratchpad/nested-ternaries-lit/C/src/react/pr-3203-comments.json`, `scratchpad/nested-ternaries-lit/C/src/react/pr-3203-review-comments.json`

### 3.2 The leaked-render fix turns a ternary inside `&&` into a nested ternary, which `no-nested-ternary` then reports. My check (local run)

- **Citation:** ESLint 10.14.0 with eslint-plugin-react 7.37.5 (`react/jsx-no-leaked-render` at default options, as Ultracite's ESLint react preset sets it: every react rule on, no override for this one), `no-nested-ternary`, `sonarjs/no-nested-conditional` and `react-doctor/jsx-numeric-and-leaked-render`; flat config, input, fixed output and diff in `C/check/leaked-render/`. Run 11 Nov 2026.
- **What it says:**
  - `{user && (isAdmin ? <Admin /> : <Member />)}` passes `no-nested-ternary` and gets one leaked-render report. `--fix` rewrites it to `{user ? isAdmin ? <Admin /> : <Member /> : null}`, and the re-run reports "Do not nest ternary expressions" (`no-nested-ternary`) and "Extract this nested ternary operation into an independent statement" (`sonarjs/no-nested-conditional`). A file that started clean of nesting finished with it.
  - `{items && (loading ? <Spinner /> : error ? <Error /> : <List />)}` (one nested level) became two levels after the fix: 2 `no-nested-ternary` and 2 `sonarjs/no-nested-conditional` reports on that line.
  - `{a && b && <Thing />}` became `{a && b ? <Thing /> : null}`; `start={icon && <Icon name={icon} />}` in an attribute was reported and fixed too.
  - `{!!items.length && <List />}` and `{items.length > 0 && <List />}` pass. So does `{a - b && <Diff />}`, which can render `0`: the coerce strategy treats every `BinaryExpression` as boolean. react-doctor reports it (3.4).
  - Totals: 7 problems before the fix (5 fixable), 6 after, all of them nesting reports.
- **Caveat:** small hand-written inputs; Ultracite's full ESLint preset wasn't loaded, only these rules. ESLint applies fixes in passes, so a real `--fix` run ends with the nested ternary still reported and no fixer for it.
- **For the post:** a concrete case where two rules Ultracite turns on pull against each other: the leaked-render fix produces code the nesting rule rejects, and only a human (or an agent) can resolve it, usually by extracting a component or an early return.
- **Text:** `scratchpad/nested-ternaries-lit/C/check/leaked-render/eslint-before.txt`, `scratchpad/nested-ternaries-lit/C/check/leaked-render/eslint-after-fix.txt`, `scratchpad/nested-ternaries-lit/C/check/leaked-render/fix.diff`, `scratchpad/nested-ternaries-lit/C/check/leaked-render/input.jsx`, `scratchpad/nested-ternaries-lit/C/check/leaked-render/eslint-numeric.txt`

### 3.3 Biome's `noLeakedRender` (2.3.8): no fix, and it also reports ternaries whose alternate is a bare identifier. VERIFIED (source at `@biomejs/biome@2.6.4`, `biome explain`, PRs); My check (local run)

- **Citation:** biomejs/biome `crates/biome_js_analyze/src/lint/suspicious/no_leaked_render.rs` at `@biomejs/biome@2.6.4` (`56538746`), https://github.com/biomejs/biome/blob/%40biomejs/biome%402.6.4/crates/biome_js_analyze/src/lint/suspicious/no_leaked_render.rs ; PR #8171 by Dibash Thapa, merged 21 Nov 2025, fixing issue #7659 (port request, 2 Oct 2025); PR #8420 (rule source renamed to `jsx-no-leaked-render`); issues #10514 (closed) and #10790 (open); PRs #11147 and #11354 (closed, not merged) and #12998 (open). `biome explain noLeakedRender` from the worktree's 2.6.4.
- **What it says:**
  - `biome explain`: "Available from version: 2.3.8", "No fix available.", default severity warn, `react` domain; source `RuleSource::EslintReact("jsx-no-leaked-render").inspired()`, `recommended: false`.
  - Like eslint-plugin-react, call and binary expressions on the left are treated as safe (`is_left_hand_side_safe`); unlike it, unary minus is not.
  - It also queries `JsConditionalExpression`: a ternary in JSX is reported when its alternate is an identifier. The note: "This happens when you use ternary operators in JSX" "with alternate values that could be variables." PR #11147 explains that a guard was unreachable, so "the check reduced to flagging any identifier alternate", including `{isMobile ? null : decorations}`; that PR and #11354 (type inference) were closed without merging, and #12998 is open.
  - My check (2.6.4, same inputs as 3.2): reported `count &&`, the two `&&`-over-ternary cases, `a && b &&`, and `items.length && "items"`; did not report the attribute case `start={icon && ...}` (the rule only runs on JSX children) or `a - b &&`. It reported `ready ? <Content /> : fallback` and `isMobile ? null : decorations`, and `undefined` alternates, but not `null` alternates.
- **Caveat:** behaviour at 2.6.4; open PRs may change the ternary branch. PR #8171 discloses AI assistance for diagnostics and some fixes.
- **For the post:** the Biome version can't produce the nesting conflict in 3.2 because it has no fix, but it can push people away from a ternary with a variable alternate, the form React's own docs use (3.8).
- **Text:** `scratchpad/nested-ternaries-lit/C/src/react/biome-2.6.4-no_leaked_render.rs`, `scratchpad/nested-ternaries-lit/C/check/leaked-render/biome-explain-noLeakedRender.txt`, `scratchpad/nested-ternaries-lit/C/check/leaked-render/biome-lint.txt`, `scratchpad/nested-ternaries-lit/C/src/react/biome-pr-8171.json`, `scratchpad/nested-ternaries-lit/C/src/react/biome-pr-11147.json`, `scratchpad/nested-ternaries-lit/C/src/react/biome-pr-11354.json`, `scratchpad/nested-ternaries-lit/C/src/react/biome-pr-12998.json`, `scratchpad/nested-ternaries-lit/C/src/react/biome-pr-8420.json`, `scratchpad/nested-ternaries-lit/C/src/react/biome-issue-7659.json`

### 3.4 `react-doctor/jsx-numeric-and-leaked-render`: only provably numeric left sides, no fix. VERIFIED (installed package 0.9.21); My check (local run)

- **Citation:** oxlint-plugin-react-doctor 0.9.21 (`dist/index.js`, minified; the rule excerpt is saved), wrapped for ESLint by eslint-plugin-react-doctor 0.9.21, repository `millionco/react-doctor`. Ultracite turns it on in the opt-in Oxlint JS plugins preset and in the ESLint react preset (`config/eslint/react/rules/react-doctor.mjs`).
- **What it says:**
  - Title "Numeric && renders a stray 0", severity `warn` in the plugin, no fixer. Message: "React renders a literal `0` into your page when this count is 0" and it suggests an explicit comparison or a ternary.
  - It reports only when the left operand is known to be numeric (`.length` on something that isn't a string, `.size` on a `Map` or `Set`, `-`, `*`, `/`, `%`, `+` of numerics, `Number()`, `parseInt()`, `parseFloat()`, a numeric literal) and the last operand is JSX or a `.map()` with a callback.
  - My check: reported `items.length && <List />`, `items.length && items.map(...)` and `a - b && <Diff />`; did not report `count && <Badge />`, `items.length && "items"` or `items.length && (open ? <List /> : <Closed />)`.
- **Caveat:** read from a minified bundle; a company's tool (Million), no published rationale beyond the message.
- **For the post:** the narrowest of the three rules; it catches the `0` case without flagging booleans, and since it has no fix it never writes a ternary.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/react/react-doctor-0.9.21-jsx-numeric-and-leaked-render-excerpt.js`, `scratchpad/nested-ternaries-lit/C/check/leaked-render/eslint-numeric.txt`

### 3.5 Oxlint 1.90.0 has no `jsx-no-leaked-render`. My check (local run); VERIFIED (oxc tracking issue)

- **Citation:** `oxlint --rules --format json` from the worktree's Oxlint 1.90.0 (872 rules), saved as `C/check/oxlint-rules-1.90.0.txt`; oxc-project/oxc issue #1022 "eslint-plugin-react" (open, updated 9 Oct 2026).
- **What it says:** the react rules with `jsx-no` in their name are `jsx-no-comment-textnodes`, `jsx-no-constructed-context-values`, `jsx-no-duplicate-props`, `jsx-no-literals`, `jsx-no-script-url`, `jsx-no-target-blank`, `jsx-no-undef` and `jsx-no-useless-fragment`; no leaked-render rule. Issue #1022 lists `react/jsx-no-leaked-render` with no status mark (the legend has marks for implemented, not intending, and pending).
- **Caveat:** dated to 1.90.0.
- **For the post:** link to the docs rather than naming per-linter coverage; for Hayden, Ultracite's Oxlint users get a leaked-render check only through react-doctor in the opt-in JS plugins preset (see Notes).
- **Text:** `scratchpad/nested-ternaries-lit/C/check/oxlint-rules-1.90.0.txt`, `scratchpad/nested-ternaries-lit/C/src/react/oxc-issue-1022.json`

### 3.6 react.dev "Conditional Rendering": ternaries "in moderation", nested markup means extract a component, and plain `if` is always allowed. VERIFIED (react.dev source at a pinned commit)

- **Citation:** reactjs/react.dev `src/content/learn/conditional-rendering.md` at `46a54e05` (main, 11 Nov 2026; the file's last change is `e3772525`, 8 Apr 2026), https://github.com/reactjs/react.dev/blob/46a54e0592729712b7640308b53268e84fdc7c9f/src/content/learn/conditional-rendering.md (published at https://react.dev/learn/conditional-rendering).
- **What it says:**
  - On the ternary: "This style works well for simple conditions, but use it in moderation." "If your components get messy with too much nested conditional markup," "consider extracting child components to clean things up." "In React, markup is a part of your code," "so you can use tools like variables and functions" "to tidy up complex expressions."
  - The `&&` pitfall: "Don't put numbers on the left side of `&&`." If the left side is `0`, "React will happily render `0` rather than nothing." The fix: "To fix it, make the left side a boolean:" `messageCount > 0 && ...`.
  - Early return: the page shows `if (isPacked) { return null; }`, then says "In practice, returning `null` from a component isn't common" "because it might surprise a developer trying to render it."
  - Variables: "When the shortcuts get in the way of writing plain code," "try using an `if` statement and a variable." "This style is the most verbose, but it's also the most flexible." The example uses `let itemContent = name;` reassigned in an `if`.
  - Recap: "The shortcuts are common," "but you don't have to use them if you prefer plain `if`." Earlier: "Pick the one you prefer for a start,".
  - A challenge, "Refactor a series of `? :` to `if` and variables": "The problem is that the information about each drink is spread across multiple conditions." The solution uses `let part, caffeine, age;` with `if`/`else if`, "This makes it easier to add more drinks in the future." A second solution moves the data into an object looked up by `drinks[name]`.
  - The page never uses the phrase nested ternary; "nested conditional markup" is as close as it gets.
- **Caveat:** official docs, not research; Meta maintains React (Vendor). The lookup-object solution indexes a plain object with a prop, which has the prototype-key pitfall in 8.9.
- **For the post:** React's guidance matches the rule's direction (nesting is a cue to extract) without banning anything, and it lists the rule's rewrites itself: early return, variable plus `if`, lookup object, a child component. It also warns that `return null` early can surprise callers, which complicates early returns as a JSX fix.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/react/react.dev-46a54e0592729712b7640308b53268e84fdc7c9f-conditional-rendering.md`

### 3.7 The legacy reactjs.org page left the choice to "you and your team". VERIFIED (legacy.reactjs.org repo at a pinned commit)

- **Citation:** reactjs/legacy.reactjs.org `content/docs/conditional-rendering.md` at `075d4170` (main, 18 Feb 2025; the file's content last changed 14 Mar 2018, in commits `d1e8b526`, `a2e445b8` and `7ff3c4e9`), https://github.com/reactjs/legacy.reactjs.org/blob/075d4170f2af03115d16507f1a61e5d3a5d78702/content/docs/conditional-rendering.md
- **What it says:** on a multiline ternary: "It can also be used for larger expressions" "although it is less obvious what's going on:". Then: "it is up to you to choose an appropriate style" "based on what you and your team consider more readable." and "whenever conditions become too complex, it might be a good time to" "extract a component". The `0` case: "In the example below, `<div>0</div>` will be returned by the render method." On `return null`: "In rare cases you might want a component to hide itself".
- **Caveat:** superseded by 3.6 (the page carries a "scary" legacy banner); class-component era.
- **For the post:** both generations of React docs treat complex conditionals as a reason to extract a component; the old page made it a team choice, the new one says "use it in moderation". Neither forbids nesting.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/react/legacy.reactjs.org-075d4170f2af03115d16507f1a61e5d3a5d78702-conditional-rendering.md`, `scratchpad/nested-ternaries-lit/C/src/react/react.dev-46a54e0592729712b7640308b53268e84fdc7c9f-conditional-rendering.md`

### 3.8 React's own documented patterns under Ultracite's rules: only the chained ternary fails in Oxlint, and Biome flags React's ternary example. My check (local run)

- **Citation:** the react.dev patterns from 3.6 (early `return null`, ternary, `&&`, variable plus `if`, the `if`/`else if` drink solution, the lookup object) plus a chained JSX ternary from airbnb/javascript#1089, in `C/check/react-docs/react-docs-patterns.jsx`. Run through Oxlint 1.90.0 with Ultracite's `config/oxlint/core` and `config/oxlint/react` presets (imported read-only from the worktree), ESLint 10.14.0 with the 3.2 rule set, and Biome 2.6.4 with `noLeakedRender` and `noNestedTernary`.
- **What it says:**
  - Oxlint with Ultracite's core and react presets: 16 problems, none of them conditional rules except "Do not nest ternary expressions." on the chained ternary. The others are `func-style` on React's `function` components (cross-reference `func-style.md` 4.17), `prefer-template` on `name + " ✅"`, and `one-var`/`sort-vars` on `let part, caffeine, age;`.
  - ESLint: `react/jsx-no-leaked-render` reports React's own `{isPacked && "✅"}` (a boolean in the docs) and would fix it to a ternary; `no-nested-ternary` and `sonarjs/no-nested-conditional` report the chain.
  - Biome: `noLeakedRender` reports `{isPacked && "✅"}` and also React's ternary example `{isPacked ? name + " ✅" : name}`, because the alternate is an identifier (3.3); `noNestedTernary` reports the chain.
- **Caveat:** hand-adapted snippets; not the full Ultracite ESLint or Biome presets.
- **For the post:** the nesting rules agree with React's docs; the leaked-render rules are where Ultracite's settings go further than React's own examples, and Biome's version flags a pattern React teaches.
- **Text:** `scratchpad/nested-ternaries-lit/C/check/react-docs/oxlint-ultracite-core-react.txt`, `scratchpad/nested-ternaries-lit/C/check/react-docs/eslint-leaked-render.txt`, `scratchpad/nested-ternaries-lit/C/check/react-docs/biome-leaked-render.txt`, `scratchpad/nested-ternaries-lit/C/check/react-docs/react-docs-patterns.jsx`

## 4. What popular configs, style guides and other ecosystems choose

**Summary of JavaScript configs** (settings at the tags named in each entry; "–" means not set):

| Config | `no-nested-ternary` | `no-unneeded-ternary` | `no-else-return` | `no-lonely-if` | `curly` | Other |
| --- | --- | --- | --- | --- | --- | --- |
| Airbnb base v15.0.0 | error | `defaultAssignment: false` | `allowElseIf: false` | error | `multi-line` | `multiline-ternary` off, `operator-linebreak` before |
| StandardJS v17.1.0 | – | `defaultAssignment: false` | – | – | `multi-line` | `multiline-ternary` `always-multiline` |
| XO v7.0.0 | via `unicorn/no-nested-ternary` | error | `allowElseIf: false` | error | error (`all`) | `unicorn/prefer-ternary` `only-single-line` |
| love v158.0.0 | – | `defaultAssignment: false` | – | error | `multi-line` | `no-negated-condition` |
| @vercel/style-guide v6.0.0 | error | error | warn | warn | warn `multi-line` | `react/jsx-no-leaked-render` warn |
| antfu v10.0.0 | – | `defaultAssignment: false` | – | – | `antfu/curly` + `antfu/if-newline` | curated unicorn subset |
| gts v7.0.0 | – | – | – | – | – | none of these |
| unicorn `recommended` (79.0.0) | `unicorn/` version; core off | – | – | `unicorn/no-lonely-if` | – | `prefer-ternary`, `prefer-early-return` |

### 4.1 Airbnb's config: nested ternaries are an error, unbraced one-line `if` is allowed. VERIFIED (config source at `eslint-config-airbnb-base-v15.0.0`; unchanged at master `8ed19247` for these rules)

- **Citation:** airbnb/javascript `packages/eslint-config-airbnb-base/rules/style.js` and `rules/best-practices.js` at `eslint-config-airbnb-base-v15.0.0`, https://github.com/airbnb/javascript/blob/eslint-config-airbnb-base-v15.0.0/packages/eslint-config-airbnb-base/rules/style.js ; same files at master `8ed19247` (21 Feb 2026).
- **What it says:** `'no-nested-ternary': 'error'` under the comment "disallow nested ternary expressions"; `'no-unneeded-ternary': ['error', { defaultAssignment: false }]` ("also, prefer `a || b` over `a ? a : b`"); `'no-lonely-if': 'error'`; `'multiline-ternary': ['off', 'never']` with "TODO: enable?"; `'operator-linebreak': ['error', 'before', { overrides: { '=': 'none' } }]`; `'no-negated-condition': 'off'`; `'no-ternary': 'off'`; `curly: ['error', 'multi-line']`; `'no-else-return': ['error', { allowElseIf: false }]`; `'consistent-return': 'error'`.
- **Caveat:** the config gives no reasons beyond the comments; the reasons are in the guide (4.2) and issues (4.3).
- **For the post:** the most-used preset of its era bans nesting but, through `curly: multi-line`, allows the one-line `if (x) return y;` that Hayden prefers and Ultracite's `curly` rejects (4.2, 4.14).
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-base-v15.0.0-style.js`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-base-v15.0.0-best-practices.js`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-base-master-8ed1924-style.js`

### 4.2 Airbnb's guide 15.6: "Ternaries should not be nested", fixed by splitting into two ternaries; 16.1 lists `if (test) return false;` as good. VERIFIED (README at `8ed19247`; issue #671, PR #673)

- **Citation:** airbnb/javascript `README.md` at `8ed19247`, sections 15.6, 15.7, 16.1, 16.3, https://github.com/airbnb/javascript/blob/8ed19247bef145e3cc41b24a02dd1fe6d9b5e681/README.md#comparison--nested-ternaries ; issue #671 by Jordan Harband (11 Jan 2016) and PR #673 by bgits (merged 2 Feb 2016).
- **What it says:**
  - 15.6: "Ternaries should not be nested and generally be single line expressions." The example rewrites `maybe1 > maybe2 ? 'bar' : value1 > value2 ? 'baz' : null` by hoisting `const maybeNull = value1 > value2 ? 'baz' : null;` and labels the one-line result "best".
  - 15.7: "Avoid unneeded ternary statements." (`a ? a : b` to `a || b`, `a != null ? a : b` to `a ?? b`).
  - 16.1: "Use braces with all multiline blocks." Its "good" examples include `if (test) return false;`.
  - 16.3: "If an `if` block always executes a `return` statement," "the subsequent `else` block is unnecessary."
  - The section was added after Jordan Harband's issue asked for one "to match" the existing config rule (#671); it landed as #673.
- **Caveat:** no reason is given in the guide text for 15.6; the 15.6 rewrite isn't equivalent in general (4.4).
- **For the post:** the best-known style guide's fix for a nested ternary is an intermediate variable, not `if`/`else`; it changes evaluation order (4.4).
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-javascript-README-8ed1924.md`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-671.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-pr-673.json`

### 4.3 Airbnb's maintainer on nested ternaries: clarity over brevity, and formatting "can't address" chaining. ANECDOTAL (maintainer comments in issues #797, #1718, #1811, #1089)

- **Citation:** airbnb/javascript issues #797 "About no-nested-ternary" (2016–2020), #1718 "Nested ternaries aren't bad, just misused" (Benji Kay, Feb 2018), #1811 "`no-nested-ternaries` can cause difficult to understand code" (Chris Lloyd, May 2018; closed Mar 2020), #1089 "What rules do the community tend to override?" (opened by Jordan Harband, Sep 2016, open, 151 comments). https://github.com/airbnb/javascript/issues/1718
- **What it says:**
  - #797: Josh Perez (goatslacker), 2016: "In practice the if/else statement is more readable even if its more verbose." Jordan Harband, 2017: "clarity is far more important than brevity." and, 2018, "'shorter' isn't always 'more readable'."
  - #1718: the proposal was to allow chains formatted so "each line has a single condition and a single result". Jordan Harband: "things that are easily misused / are easy to improperly wield _are_ bad." and "they’re confusing because it’s multiple conditionals chained together." "The formatting can’t address that." Another participant: "Looks like a matter of what you're used to, then."
  - #1811: "by enabling the rule engineers often have to create and nae intermediate variables" (sic). Jordan Harband: "intermediate variables (in the same region of the code)" "almost always make code easier to understand." and "I don't think a version with a nested ternary" "is going to be more readable."
  - #1089 (2020): "I've never seen a nested ternary that needs to be one." Community overrides with reasons: "It's nice for JSX." and "because JSX" (2016); 3 of the 151 comments post a config with `no-nested-ternary` off (my count).
  - The other side, #797: "we need to have useless mutation and cannot use `const`" (rsp, 2017); #1089: "Ternary is poor man's pattern matching." and "We also use ternary in const variable assignment, which can't early returns." (xiaoxiangmoe, 2020). Replies preferred guard clauses: "I usually go for either early returns or short-circuiting rather than nested ternaries".
- **Caveat:** one maintainer's opinions and self-selected commenters; the overrides tally isn't a sample of anything.
- **For the post:** the arguments in this thread map onto Hayden's reasons: readability (contested both ways, with "familiarity" invoked by both sides), early returns as the alternative, and the real cost on the other side, losing `const` and expression position.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-797.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-797-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1718.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1718-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1811.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1811-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1089.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1089-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/gh-user-names.tsv`

### 4.4 Mark S. Miller on the Airbnb rewrite: hoisting the inner ternary "is not equivalent". ANECDOTAL (issue #1677)

- **Citation:** airbnb/javascript issue #1677 "Recommended ?: refactoring is worse", opened by Mark S. Miller (erights), 25 Dec 2017, closed the same day; https://github.com/airbnb/javascript/issues/1677
- **What it says:** the guide's rewrite "is not equivalent." In it, "the `value1 > value2` comparison is always evaluated," and "These extra evaluations may have side effects or throw when `maybe1 > maybe2`." Miller asked that the guide "should at least warn about the potential non-equivalences". Jordan Harband: "performance is always less of a concern than clarity." and "This is a style guide, not a library or a specification;" and "If it’s expensive, it should be stored in a variable and named". The guide text was not changed (4.2).
- **Caveat:** an exchange, not a study. The evaluation semantics are verified from the spec in 8.8 and 8.16.
- **For the post:** a TC39 member pointing out that the most-cited fix for a nested ternary changes behaviour; good primary support for the post's section on rewrites that change behaviour.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1677.json`, `scratchpad/nested-ternaries-lit/C/src/configs/airbnb-issue-1677-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/gh-user-erights.json`

### 4.5 Google's JavaScript and TypeScript guides say nothing about nested ternaries, and both allow a one-line unbraced `if`. VERIFIED (google/styleguide `gh-pages` at `798edea5`); Vendor (Google)

- **Citation:** google/styleguide `jsguide.md` and `tsguide.md` at `798edea5` (11 Nov 2026), published at https://google.github.io/styleguide/jsguide.html and https://google.github.io/styleguide/tsguide.html ; google/gts `eslint.config.js` at `v7.0.0`.
- **What it says:**
  - Neither guide mentions nested ternaries; the only hit for "ternar" is spacing, "On both sides of any binary or ternary operator."
  - JS 4.1.1 requires braces, with an exception: "A simple if statement that can fit entirely on a single line" "with no wrapping (and that doesn’t have an else)" "may be kept on a single line with no braces when it improves readability." TS: "`if` statements fitting on one line _may_ elide the block."
  - JS 4.7 on parentheses: "It is _not_ reasonable to assume that every reader" "has the entire operator precedence table memorized."
  - gts (Google's TypeScript lint config) sets none of `no-nested-ternary`, `curly`, `no-else-return` or `no-unneeded-ternary`.
- **Caveat:** absence of a rule isn't approval; Google's internal tooling isn't public.
- **For the post:** a major style guide that never took a position on nested ternaries, and that explicitly permits Hayden's `if (x) return y;` shape.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/google-styleguide-798edea5-jsguide.md`, `scratchpad/nested-ternaries-lit/C/src/configs/google-styleguide-798edea5-tsguide.md`, `scratchpad/nested-ternaries-lit/C/src/configs/gts-v7.0.0-eslint.config.js`

### 4.6 StandardJS doesn't ban nested ternaries; it formats them. VERIFIED (config at `v17.1.0`); see 9.4 for the 2016 discussion

- **Citation:** standard/eslint-config-standard `.eslintrc.json` at `v17.1.0`, https://github.com/standard/eslint-config-standard/blob/v17.1.0/.eslintrc.json
- **What it says:** `"no-unneeded-ternary": ["error", { "defaultAssignment": false }]`, `"multiline-ternary": ["error", "always-multiline"]`, `"operator-linebreak": ["error", "after", { "overrides": { "?": "before", ":": "before", "|>": "before" } }]`, `"curly": ["error", "multi-line"]`; no `no-nested-ternary`, `no-else-return` or `no-lonely-if`.
- **Caveat:** v17.1.0 is the latest tag; Standard's ESLint 9 status isn't covered here.
- **For the post:** one of the big presets chose to allow nesting and only control its layout.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/standard-v17.1.0-eslintrc.json`

### 4.7 XO uses Unicorn's version and keeps `prefer-ternary` to single lines "to not be too opinionated". VERIFIED (eslint-config-xo `v7.0.0`)

- **Citation:** xojs/eslint-config-xo `source/javascript-rules.js`, `source/plugins-rules.js`, `source/typescript-rules.js` at `v7.0.0` (23 Oct 2026), https://github.com/xojs/eslint-config-xo/blob/v7.0.0/source/plugins-rules.js
- **What it says:** XO spreads `pluginUnicorn.configs?.recommended?.rules` (eslint-plugin-unicorn `^79.0.0`), so `unicorn/no-nested-ternary` is on and core `no-nested-ternary` is off (4.9). It overrides `unicorn/prefer-ternary` to `['error', 'only-single-line']`: "We only enforce it for single-line statements to not be too opinionated." It sets `curly: 'error'`, `no-else-return` with `allowElseIf: false`, `no-lonely-if`, `no-unneeded-ternary`, `@stylistic/multiline-ternary` `always-multiline`, `@stylistic/operator-linebreak` `before`, and `@typescript-eslint/prefer-nullish-coalescing` with `ignoreTernaryTests: false`.
- **Caveat:** XO and Unicorn share a maintainer (Sindre Sorhus), so they aren't independent votes.
- **For the post:** the closest preset to Ultracite's choices also limits `prefer-ternary`; Ultracite sets it to `"always"`.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/xo-v7.0.0-plugins-rules.js`, `scratchpad/nested-ternaries-lit/C/src/configs/xo-v7.0.0-javascript-rules.js`, `scratchpad/nested-ternaries-lit/C/src/configs/xo-v7.0.0-typescript-rules.js`, `scratchpad/nested-ternaries-lit/C/src/configs/xo-v7.0.0-package.json`

### 4.8 eslint-config-love, @vercel/style-guide, antfu and gts. VERIFIED (configs at the tags named); Vendor (Vercel) for the style guide

- **Citation:** mightyiam/eslint-config-love `src/plugin-usage/eslint.ts` and `typescript-eslint.ts` at `v158.0.0` (2 Oct 2026); vercel/style-guide `eslint/rules/*.js` at `v6.0.0` (5 Mar 2024; the repo is archived); antfu/eslint-config `src/configs/*.ts` at `v10.0.0` (23 Oct 2026) and antfu/eslint-plugin-antfu `src/rules/curly.md`, `if-newline.md` at `v3.3.1`.
- **What it says:**
  - love: `curly: ['error', 'multi-line']`, `no-lonely-if`, `no-negated-condition`, `no-unneeded-ternary` with `defaultAssignment: false`, `prefer-nullish-coalescing` with `ignoreConditionalTests: false`; no `no-nested-ternary`.
  - @vercel/style-guide: `no-nested-ternary` error ("Disallow nested ternary expressions."), `no-unneeded-ternary` error (its comment says "Not fixable", though the rule has a fixer), `no-else-return` and `no-lonely-if` warn, `curly: ['warn', 'multi-line']`, `react/jsx-no-leaked-render` warn at default options.
  - antfu: no `no-nested-ternary`; Unicorn only as a curated list unless `allRecommended`; `no-unneeded-ternary` with `defaultAssignment: false`; `antfu/curly` and `antfu/if-newline`, or `curly: ['error', 'all']` when `lessOpinionated`. `antfu/curly` is "Anthony's opinionated taste with curly."; `if-newline` lists `if (foo) bar()` as bad. antfu's own config source writes nested ternaries (`src/configs/jsonc.ts`, `indent === 'tab' ? 'tab' : 2` inside another ternary).
  - gts: none (4.5).
- **Caveat:** @vercel/style-guide is archived, so its settings are frozen at 2024.
- **For the post:** among widely used presets, a nested-ternary ban is common but not universal (Airbnb, Vercel, XO via Unicorn yes; Standard, love, antfu, Google no), and none of them except XO's `curly: all` rejects a one-line braceless `if` the way Ultracite does (antfu requires a line break instead).
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/love-v158.0.0-eslint.ts`, `scratchpad/nested-ternaries-lit/C/src/configs/love-v158.0.0-typescript-eslint.ts`, `scratchpad/nested-ternaries-lit/C/src/configs/vercel-style-guide-v6.0.0-eslint_rules_stylistic.js`, `scratchpad/nested-ternaries-lit/C/src/configs/vercel-style-guide-v6.0.0-eslint_rules_best-practice.js`, `scratchpad/nested-ternaries-lit/C/src/configs/vercel-style-guide-v6.0.0-eslint_rules_react.js`, `scratchpad/nested-ternaries-lit/C/src/configs/antfu-eslint-config-v10.0.0-src_configs_stylistic.ts`, `scratchpad/nested-ternaries-lit/C/src/configs/antfu-eslint-config-v10.0.0-src_configs_javascript.ts`, `scratchpad/nested-ternaries-lit/C/src/configs/antfu-eslint-config-v10.0.0-src_configs_jsonc.ts`, `scratchpad/nested-ternaries-lit/C/src/configs/antfu-eslint-config-v10.0.0-src_configs_unicorn.ts`, `scratchpad/nested-ternaries-lit/C/src/configs/eslint-plugin-antfu-v3.3.1-curly.md`, `scratchpad/nested-ternaries-lit/C/src/configs/eslint-plugin-antfu-v3.3.1-if-newline.md`

### 4.9 Unicorn's `recommended` swaps in its own `no-nested-ternary`, and its `unopinionated` config leaves it out as "Very opinionated". VERIFIED (configs at `v79.0.0`, PR #2715, issue #896)

- **Citation:** sindresorhus/eslint-plugin-unicorn `configs/core-rule-replacements.js` and `readme.md` at `v79.0.0` (`8425e259`); the installed 79.0.0 package's configs (dumped in `C/check/configs/unicorn-79.0.0-configs.txt`); PR #2715 "feat: add 'unopinionated' config" by JoshuaKGoldberg, merged 5 Sep 2025; issue #896 "Add `unopinionated` preset" (2020). https://github.com/sindresorhus/eslint-plugin-unicorn/pull/2715
- **What it says:**
  - `core-rule-replacements.js` lists `no-nested-ternary` (with `no-negated-condition`, `logical-assignment-operators`, `id-match`, `no-process-exit`), so `recommended` sets core `no-nested-ternary` to `"off"` and `unicorn/no-nested-ternary` to `"error"`.
  - In 79.0.0, `recommended` has `unicorn/no-nested-ternary`, `prefer-ternary` (default `"always"`), `prefer-logical-operator-over-ternary`, `prefer-minimal-ternary`, `no-negated-condition` and `no-lonely-if`; `unopinionated` has all of them except `no-nested-ternary`.
  - PR #2715's table gives the reason: "Very opinionated; some projects need this". It drew on #896, where the request to leave it out cited Prettier, and Sindre Sorhus answered "We are not going to leave out rules" "just because they don't work with Prettier."
  - After release, a user objected that `no-negated-condition` is also opinionated: an if/else with a negated test can be a "direct representation of my mental model of the control flow" (Hypfer, Oct 2025).
- **Caveat:** "unopinionated" is the PR author's judgment ("per my vague guesstimation"), not data.
- **For the post:** the plugin whose rule Ultracite turns off for formatter reasons classes nested-ternary bans as a matter of taste, while it counts `prefer-ternary` as unopinionated.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-v79.0.0-core-rule-replacements.js`, `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-v79.0.0-readme.md`, `scratchpad/nested-ternaries-lit/C/check/configs/unicorn-79.0.0-configs.txt`, `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-pr-2715.json`, `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-pr-2715-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-issue-896.json`, `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-issue-896-comments.json`

### 4.10 Unicorn 79 also ships `prefer-early-return` and `no-unnecessary-nested-ternary`, both in `unopinionated`; Ultracite's ESLint preset has them on, Oxlint doesn't have them. VERIFIED (docs at `v79.0.0`, installed package); My check (local run)

- **Citation:** eslint-plugin-unicorn `docs/rules/prefer-early-return.md` and `docs/rules/no-unnecessary-nested-ternary.md` at `v79.0.0`; added by PR #3131 (`eaca1825`, 12 Jun 2026) and PR #3023 (`cc1ced20`, 6 Jun 2026); rule meta from the installed 79.0.0; Ultracite `config/eslint/core/rules/unicorn.mjs` (every non-deprecated JS rule on, neither overridden); Oxlint 1.90.0 rule list. Local run in `C/check/early-return/`.
- **What it says:**
  - `prefer-early-return`: "Prefer early returns over conditionals wrapping the remainder of the function body." Docs: "A guard clause often makes the main path clearer" "by handling exceptional cases first." Default `maximumStatements: 1`, so a one-statement wrapper is allowed; autofix negates the condition, with a suggestion that "changes behavior for NaN and values coerced to NaN".
  - `no-unnecessary-nested-ternary`: nested ternaries "are unnecessary when two branches use the same expression" and the conditions combine; `a ? (b ? c : d) : d` becomes `a && b ? c : d`, while `a ? (b ? c : d) : e` is allowed.
  - Related 79.0.0 rules in `recommended`: `prefer-combined-guards` (not in `unopinionated`), `no-declarations-before-early-exit`, `prefer-simplified-conditions`.
  - My check (ESLint 10.14.0): `prefer-early-return` fixed `if (user.isValid) { persist(user); notify(user); }` at the end of a function into `if (!user.isValid) { return; }` followed by the two calls; `no-unnecessary-nested-ternary` fixed `a ? (b ? "yes" : "no") : "no"` to `a && b ? "yes" : "no"`; `curly` reported `if (count === 0) return "none";` ("Expected { after 'if' condition") and fixed it to a braced block; the three-value chain stayed reported by `no-nested-ternary` with no fix.
  - Oxlint 1.90.0 has neither rule (no `early`, `guard` or `unnecessary-nested` rule except `eslint/guard-for-in`). Biome 2.6.4 has none either: of its 561 JS rule files, the conditional ones are `noUselessTernary`, `noNegationElse`, `noNestedTernary`, `noTernary`, `noUselessElse`, `useCollapsedElseIf`, `useCollapsedIf`, `noDuplicateElseIf` and `useGuardForIn` (file list at `56538746`).
- **Caveat:** both rules are five months old; Unicorn's own repo turns `prefer-early-return` off (9.2).
- **For the post:** there is now a lint rule that enforces the guard-clause half of Hayden's reason directly, and a fixer for the one nested-ternary shape that has a mechanical fix. Ultracite's ESLint users get both; Oxlint and Biome users get neither (see Notes).
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-v79.0.0-prefer-early-return.md`, `scratchpad/nested-ternaries-lit/C/src/configs/unicorn-v79.0.0-no-unnecessary-nested-ternary.md`, `scratchpad/nested-ternaries-lit/C/check/configs/unicorn-79.0.0-extra-rules.txt`, `scratchpad/nested-ternaries-lit/C/check/early-return/eslint-before.txt`, `scratchpad/nested-ternaries-lit/C/check/early-return/eslint-after-fix.txt`, `scratchpad/nested-ternaries-lit/C/check/early-return/fix.diff`, `scratchpad/nested-ternaries-lit/C/check/biome-2.6.4-js-rule-files.txt`

### 4.11 typescript-eslint has no nesting rule; `prefer-nullish-coalescing` rewrites null-check ternaries to `??`, as a suggestion. VERIFIED (installed 8.72.1; docs at `v8.72.1`)

- **Citation:** typescript-eslint `packages/eslint-plugin/docs/rules/prefer-nullish-coalescing.mdx` at `v8.72.1`; rule meta and config membership from the installed @typescript-eslint/eslint-plugin 8.72.1 (`C/check/configs/`).
- **What it says:** the rule reports "Ternary expressions (`?:`) that are equivalent to `||` or `??` with `??`" (docs). `ignoreTernaryTests` defaults to `false` ("Whether to ignore any ternary expressions that could be simplified" by using `??`). Message: "instead of a ternary expression, as it is simpler to read." It needs type information, offers suggestions but no autofix, and is in `stylistic-type-checked` and `all`. `strict-boolean-expressions` (which would reject non-boolean `&&` conditions in JSX) is only in `all`.
- **Caveat:** type-aware rules; Ultracite keeps those out of core.
- **For the post:** typed linting removes some ternaries (`a !== undefined ? a : b`) rather than nesting ones; with types, the leaked-`0` problem has a precise rule instead of a syntactic guess.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/tseslint-v8.72.1-prefer-nullish-coalescing.mdx`, `scratchpad/nested-ternaries-lit/C/check/configs/tseslint-8.72.1-configs.txt`, `scratchpad/nested-ternaries-lit/C/check/configs/tseslint-8.72.1-prefer-nullish-coalescing-schema.txt`

### 4.12 eslint-config-prettier turns off `unicorn/no-nested-ternary` and the ternary layout rules, and says `curly` should be `all`. VERIFIED (source and README at `v10.1.8`)

- **Citation:** prettier/eslint-config-prettier `index.js` and `README.md` at `v10.1.8` (18 Jul 2025), https://github.com/prettier/eslint-config-prettier/blob/v10.1.8/README.md#curly
- **What it says:** `"unicorn/no-nested-ternary": "off"` (in the main list, not as a special rule); `multiline-ternary`, `@stylistic/multiline-ternary`, `@stylistic/js/multiline-ternary`, `vue/multiline-ternary`, `operator-linebreak` and its variants, and `indent` variants `"off"`; `curly` is a special rule (`0`): "If you use the `'multi-line'` or `'multi-or-nest'` option, the rule can conflict with Prettier." The README's example config is `"curly": ["error", "all"]`. Core `no-nested-ternary` is untouched.
- **Caveat:** why Unicorn's rule conflicts is in 5.13–5.16.
- **For the post:** the formatter-compatibility argument is one reason Ultracite uses `curly: all`, which in turn is what reports Hayden's one-line guard clause (4.10).
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/eslint-config-prettier-v10.1.8-index.js`, `scratchpad/nested-ternaries-lit/C/src/configs/eslint-config-prettier-v10.1.8-README.md`

### 4.13 Ruby: RuboCop bans nested ternaries by default and autocorrects to `if`/`else`; the Ruby Style Guide also prefers guard clauses. VERIFIED (RuboCop `v1.92.2`, Ruby Style Guide at `72ea4198`)

- **Citation:** rubocop/rubocop `config/default.yml` and `lib/rubocop/cop/style/nested_ternary_operator.rb`, `multiline_ternary_operator.rb` at `v1.92.2`, https://github.com/rubocop/rubocop/blob/v1.92.2/lib/rubocop/cop/style/nested_ternary_operator.rb ; rubocop/ruby-style-guide `README.adoc` at `72ea4198`, https://rubystyle.guide/#no-nested-ternary
- **What it says:**
  - `Style/NestedTernaryOperator`: enabled, `VersionAdded: '0.9'`, message "Ternary operators must not be nested. Prefer `if` or `else` constructs instead."; it has an autocorrector (skipped when the node contains a heredoc). `Style/MultilineTernaryOperator` is enabled: "Avoid multi-line ?: (the ternary operator);". `Style/TernaryParentheses` defaults to `require_no_parentheses`.
  - The guide: "Use one expression per branch in a ternary operator." "This also means that ternary operators must not be nested." "Prefer `if/else` constructs in these cases." It also says to prefer the ternary over `if/then/else/end`: "It's more common and obviously more concise."
  - Guard clauses: "Avoid use of nested conditionals for flow of control." "Prefer a guard clause when you can assert invalid data."
- **Caveat:** in Ruby `if` is an expression, so the autocorrect keeps the value in expression position; JavaScript has no such fix (section 1).
- **For the post:** the strongest precedent from another ecosystem: banned by default for over a decade, and the fix target is `if`/`else` because Ruby lets `if` return a value.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-v1.92.2-default.yml`, `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-v1.92.2-nested_ternary_operator.rb`, `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-v1.92.2-multiline_ternary_operator.rb`, `scratchpad/nested-ternaries-lit/C/src/eco/ruby-style-guide-72ea4198-README.adoc`

### 4.14 RuboCop's corpus of 233 configs: guard-clause enforcement is among the most rejected cops; nested ternaries aren't in the top 20. ANECDOTAL (maintainer's corpus analysis with counts; issue #15363 and commits)

- **Citation:** rubocop/rubocop issue #15363 "Tuning RuboCop's defaults from real-world usage data (RuboCop 2 discussion)", Bozhidar Batsov, 28 Jun 2026 (open), https://github.com/rubocop/rubocop/issues/15363 ; tooling in draft PR #15362; commits `862529e4` "Disable the most-rejected style cops under `Preview`" and `192370f0` (9 Sep 2026); `config/default.yml` at `v1.92.2`.
- **Method:** the 500 most-starred Ruby repos on GitHub, of which 233 ship a `.rubocop.yml`; configs parsed with inheritance resolved, plus `.rubocop_todo.yml` and inline directives. The commit later corrected for 22 configs that inherit Standard or rubocop-rails-omakase, leaving 211.
- **What it says:**
  - Most globally disabled cops (of 233): `Style/IfUnlessModifier` 80 (34.3%, rank 9), `Style/GuardClause` 75 (32.2%, rank 10), `Metrics/BlockNesting` 64 (27.5%). `Style/NestedTernaryOperator` is not in the top 20; the 20th has 56 (24.0%).
  - The issue calls `IfUnlessModifier` and `GuardClause` "Genuinely contested style cops that a third of opinionated projects reject outright:". The Preview commit disables both: "Twenty-four cops that projects switch off outright rather than suppress" "case by case." `default.yml` on `GuardClause`: "Same objection as `IfUnlessModifier`, and among the most inline-suppressed cops."
  - On ternary parentheses: "Parentheses only around complex conditions" "is the pick of nearly every project that sets this."
  - Caveats in the issue: "Silent majority." Setting a value "almost always means disagreeing with our default"; "treat this as evidence, not proof."
- **Caveat:** Ruby, popular libraries, a maintainer's tool, not peer-reviewed; a cop that forces guard clauses is not the same as guard clauses being bad. I couldn't get a count for `NestedTernaryOperator` without running the tool (not done).
- **For the post:** the only large real-world data found on these exact rules: lint that forces guard clauses is turned off by about a third of configured Ruby projects, while the nested-ternary ban isn't among the most disabled. Useful against overselling early returns as a rule rather than a habit.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-issue-15363.json`, `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-commit-862529e432.json`, `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-commit-192370f093.json`, `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-pr-15362.json`, `scratchpad/nested-ternaries-lit/C/src/eco/rubocop-v1.92.2-default.yml`

### 4.15 Java: Checkstyle can ban every conditional expression "so their employer's coding standards forbid them"; PMD has no nesting rule. VERIFIED (Checkstyle `checkstyle-14.4.0`, PMD `pmd_releases/7.29.0`)

- **Citation:** checkstyle/checkstyle `src/site/xdoc/checks/coding/avoidinlineconditionals.xml`, `src/main/resources/sun_checks.xml` and `google_checks.xml` at `checkstyle-14.4.0`; pmd/pmd `pmd-java/src/main/resources/category/java/codestyle.xml` and `design.xml` at `pmd_releases/7.29.0`.
- **What it says:** `AvoidInlineConditionals` ("Since Checkstyle 3.1") flags any `?:`: "Rationale: Some developers find inline conditionals hard to read," "so their employer's coding standards forbid them." Neither bundled config (`sun_checks.xml`, `google_checks.xml`) includes it (0 matches). PMD has no nested-ternary rule; `ConfusingTernary` (since 1.9): "Avoid negation within an 'if' expression with an 'else' clause." and `SimplifiedTernary` (5.4.0) for boolean-literal branches.
- **Caveat:** Sonar's cross-language S3358 is in 2.16.
- **For the post:** Java's tools frame the ternary itself as a house-style choice; the equivalent of `no-ternary`, not of `no-nested-ternary`.
- **Text:** `scratchpad/nested-ternaries-lit/C/text/eco/checkstyle-14.4.0-avoidinlineconditionals.txt`, `scratchpad/nested-ternaries-lit/C/src/eco/checkstyle-14.4.0-avoidinlineconditionals.xml`, `scratchpad/nested-ternaries-lit/C/src/eco/checkstyle-14.4.0-sun_checks.xml`, `scratchpad/nested-ternaries-lit/C/src/eco/checkstyle-14.4.0-google_checks.xml`, `scratchpad/nested-ternaries-lit/C/src/eco/pmd-7.29.0-java-codestyle.xml`, `scratchpad/nested-ternaries-lit/C/src/eco/pmd-7.29.0-java-design.xml`

### 4.16 C and C++: clang-tidy added `readability-avoid-nested-conditional-operator` in January 2024 (LLVM 18). VERIFIED (llvm-project docs at `llvmorg-18.1.0` and `llvmorg-23.1.5`, PR #78022)

- **Citation:** llvm/llvm-project `clang-tools-extra/docs/clang-tidy/checks/readability/avoid-nested-conditional-operator.rst` at `llvmorg-23.1.5` and `llvmorg-18.1.0`; PR #78022 by Congcong Cai (HerrCai0907), merged 15 Jan 2024 (`8e21557d`); `clang-tools-extra/docs/ReleaseNotes.rst` at `llvmorg-18.1.0`; commit `6d372592` (#107412, 5 Sep 2024).
- **What it says:** "Identifies instances of nested conditional operators in the code." "Nested conditional operators, also known as ternary operators, can contribute" "to reduced code readability and comprehension." It flags nesting in the condition, the true branch and the false branch (three examples). The PR: "Nested conditional operators lead code hard to understand,". The LLVM 18 version said "This check implements part of `AUTOSAR C++14 Rule A5-16-1"; that link was removed in 2024: "We should not link clang-tidy check with AUTOSAR rules."
- **Caveat:** I couldn't open AUTOSAR's guideline (10.8 MB PDF, over the limit), so the text of A5-16-1 is unverified.
- **For the post:** a recent, independent adoption of the same rule in C++, with the same readability rationale and no data behind it.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/eco/clang-tidy-llvmorg-23.1.5-avoid-nested-conditional-operator.rst`, `scratchpad/nested-ternaries-lit/C/src/eco/clang-tidy-llvmorg-18.1.0-avoid-nested-conditional-operator.rst`, `scratchpad/nested-ternaries-lit/C/src/eco/clang-tools-extra-llvmorg-18.1.0-ReleaseNotes.rst`, `scratchpad/nested-ternaries-lit/C/src/eco/llvm-pr-78022.json`, `scratchpad/nested-ternaries-lit/C/src/eco/llvm-commit-6d3725924fe6.json`

### 4.17 Python: Pylint and Ruff have no nested-conditional-expression rule; Ruff's SIM108 never fires on `elif` and calls itself "opinionated"; wemake-python-styleguide forbids nesting. VERIFIED (Pylint `v4.1.3`, Ruff `0.17.4`, wemake `1.8.1` source)

- **Citation:** pylint-dev/pylint `pylint/checkers/refactoring/refactoring_checker.py` and `pylint/extensions/consider_ternary_expression.py` at `v4.1.3`; astral-sh/ruff `crates/ruff_linter/src/rules/flake8_simplify/rules/if_else_block_instead_of_if_exp.rs` at `0.17.4`; wemake-services/wemake-python-styleguide `wemake_python_styleguide/violations/refactoring.py` and `visitors/ast/compares.py` at `1.8.1`.
- **What it says:**
  - Pylint: `consider-using-ternary` (R1706) is "Used when one of known pre-python 2.5 ternary syntax is used." (`x and a or b`); `simplifiable-if-expression` (R1719); `consider-ternary-expression` (W0160) is an optional extension. No check for nested conditional expressions.
  - Ruff SIM108 (`if-else-block-instead-of-if-exp`, stable since v0.0.213, category Pedantic): it only matches an `if` with a single `else` clause and no `elif`, and is "suppressed if the suggested replacement would exceed" the line length. "Known issues": "This is an opinionated style rule that may not always be to everyone's" "taste," and "Ternary operators can also make it harder to measure" code coverage with line-based tools (linking coveragepy#509). I found no check against a branch that is already a conditional expression (source reading only; Ruff isn't installed).
  - wemake WPS509 `NestedTernaryViolation` (0.10.0): "Nesting ternary in random places can lead to very hard" "debug and testing problems." The visitor's forbidden parents include `ast.IfExp`, `ast.BoolOp`, `ast.BinOp`, `ast.UnaryOp`, `ast.Compare` and comprehensions.
- **Caveat:** Python's grammar and PEP 308 are in 1.9. Ruff and Pylint behaviour from source, not runs.
- **For the post:** Python's mainstream linters push toward conditional expressions, not away; the coverage point (line coverage can't see which branch of a one-line conditional ran) is a cost of ternaries rarely raised in JavaScript.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/eco/pylint-v4.1.3-refactoring_checker.py`, `scratchpad/nested-ternaries-lit/C/src/eco/pylint-v4.1.3-consider_ternary_expression.py`, `scratchpad/nested-ternaries-lit/C/src/eco/ruff-0.17.4-if_else_block_instead_of_if_exp.rs`, `scratchpad/nested-ternaries-lit/C/src/eco/wemake-1.8.1-refactoring.py`, `scratchpad/nested-ternaries-lit/C/src/eco/wemake-1.8.1-visitors-compares.py`

### 4.18 Swift and Rust: SwiftLint has no nesting rule but an opt-in rule against one-line conditional returns; Clippy prefers a plain `if`. VERIFIED (SwiftLint `0.65.1`, rust-clippy at `8b5f3c9e`)

- **Citation:** realm/SwiftLint `Source/SwiftLintBuiltInRules/Rules/Idiomatic/VoidFunctionInTernaryConditionRule.swift` and `Rules/Style/ConditionalReturnsOnNewlineRule.swift` at `0.65.1`; rust-lang/rust-clippy `clippy_lints/src/methods/mod.rs` at `8b5f3c9e` (main, 11 Nov 2026).
- **What it says:** SwiftLint's rule list has no nested-ternary rule. `void_function_in_ternary` (on by default): "Using ternary to call Void functions should be avoided". `conditional_returns_on_newline` (`optIn: true`): "Conditional statements should always return on the next line", with `if true { return }` and `guard true else { return }` as triggering examples. Clippy `obfuscated_if_else` (style, 1.64.0) flags `.then_some(..).unwrap_or(..)`: "This can be written more clearly with `if .. else ..`". Rust and Kotlin have no `?:` (1.11, 1.12); detekt and ktlint code searches returned no ternary rule (not checked further).
- **Caveat:** `gh search code` coverage is incomplete.
- **For the post:** where the language has no ternary, linters push toward `if` expressions; SwiftLint's opt-in rule is the one close analogue of Ultracite's `curly` rejecting one-line guards.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/eco/swiftlint-0.65.1-VoidFunctionInTernaryConditionRule.swift`, `scratchpad/nested-ternaries-lit/C/src/eco/swiftlint-0.65.1-ConditionalReturnsOnNewlineRule.swift`, `scratchpad/nested-ternaries-lit/C/src/eco/clippy-8b5f3c9e43-methods-mod.rs`

### 4.19 The configurable alternative: getify's `proper-ternary/nested` allows chosen clauses and a depth. ANECDOTAL (plugin README at `3.1.1`)

- **Citation:** getify/eslint-plugin-proper-ternary `README.md` at `3.1.1` (Kyle Simpson; last push 26 Apr 2021, 97 stars), https://github.com/getify/eslint-plugin-proper-ternary
- **What it says:** "By default, ternary expression nesting is forbidden" "in all three ternary expression clauses," with depth limited to one level; options `"test"`, `"then"`, `"else"` (each default `false`) allow nesting per clause and `"depth"` (default `1`) sets how deep. A `parens` rule can require parentheses around a nested ternary. StandardJS declined to adopt it (9.4).
- **Caveat:** small, unmaintained since 2021.
- **For the post:** shows the middle ground ESLint core never offered: allowing the flat `else`-chain shape people defend while still banning nesting in the test or consequent.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/proper-ternary-3.1.1-README.md`

## 5. What the formatter does to nested ternaries

5.1–5.8 are Prettier's history and docs, 5.9–5.12 the four formatters side by side and Ultracite's formatter settings, 5.13–5.16 the fight between `unicorn/no-nested-ternary` and the formatters, and 5.17–5.20 Biome, dprint, ESLint's layout rules and conditional types. Sources were read at pinned tags: Prettier `3.9.10` (`1172b82c`), eslint-config-prettier `v10.1.8` (`9b0b0a47`), ESLint `v10.14.0` (`12cbff41`), eslint-plugin-unicorn `v79.0.0` (`d078ad9e`, plus the installed package), Biome `@biomejs/biome@2.6.4` (`56538746`, plus the installed package), Oxc `oxfmt_v0.75.0` (`9b6fff42`, plus the installed `oxfmt` 0.75.0 package), ESLint Stylistic `v5.10.0` (`efbb1bc0`), dprint-plugin-typescript `0.100.0` (`e23290db`). GitHub issues, PRs, comments, commits and one discussion were read with `gh api` (read-only) and saved as JSON, with plain-text dumps in `D/text/`. Reaction and comment counts are as served on 11 Nov 2026. The oxc.rs and eslint.org pages were fetched with `curl` and are the live pages as served that day, not pinned.

Local runs used the worktree's binaries (Prettier 3.9.10, Oxfmt 0.75.0, Biome 2.6.4, ESLint 10.14.0, Oxlint 1.90.0, eslint-plugin-unicorn 79.0.0, eslint-plugin-prettier 5.5.6 from the Bun store, @typescript-eslint/parser 8.72.1) on Node 24.14.1, on hand-written files in `scratchpad/nested-ternaries-lit/D/check/`. There is no dprint binary in the worktree, so dprint was read from source only. Inputs are in `check/in/`, outputs in `check/out/<tool>/`, and `check/format-matrix.txt` puts every input next to every output.

### 5.1 Prettier first indented every level, and the 2017 complaints asked for flat chains. VERIFIED (GitHub issue and PR)

- **Citation:** prettier/prettier issue #737, "alternate ternary formatting," opened by mvolkmann (R. Mark Volkmann), 19 Feb 2017, closed 14 Oct 2018 by PR #5039; 40 comments, 35 thumbs-up (51 reactions). https://github.com/prettier/prettier/issues/737 . PR #1171, "Flatten nested ternaries," by vjeux, 9 Apr 2017, closed unmerged 5 May 2017. https://github.com/prettier/prettier/pull/1171
- **What it says:**
  - #737 shows Prettier's pre-1.0 output indenting each nested level and proposes one condition and value per line, because "I like this because it clearly associates each condition with its corresponding value" and the indentation doesn't grow. It also notes: "Perhaps some like the current formatting because it discourages use of nested ternaries,".
  - vjeux: "This keeps confusing people both inside and outside of Facebook." The PR said "the way prettier prints nested ternaries is not good." and was closed in a PR cleanup: "We still want to figure out what to do with nested ternaries though,".
  - The arguments on #1171 are the post's arguments. SimenB: "7 nested ternaries should really be refactored anyways, that's really unreadable :P"; bakkot preferred increasing indentation because "it's not obvious whether the thing after" the colon is a condition or a result until the end of the line.
  - A TypeScript user (mysticatea, 2018) showed a conditional type and pointed to ESLint's `indent` option: "FWIW, ESLint's indent rule has the option for the alternate ternary formatting:" (`flatTernaryExpressions`, 5.19).
- **Caveat:** issue threads, not studies; reaction counts are as of 11 Nov 2026. Commenters are identified by GitHub handle unless a saved source gives a name.
- **For the post:** the case for and against nested ternaries was argued as a formatting question from Prettier's first months, with the same split the post covers: some say format them well, others say refactor them.
- **Text:** `scratchpad/nested-ternaries-lit/D/text/prettier-issue-737.txt`, `scratchpad/nested-ternaries-lit/D/text/prettier-pr-1171.txt`, `scratchpad/nested-ternaries-lit/D/src/prettier-issue-737.json`, `scratchpad/nested-ternaries-lit/D/src/prettier-issue-737-comments.json`, `scratchpad/nested-ternaries-lit/D/src/prettier-pr-1171.json`, `scratchpad/nested-ternaries-lit/D/src/prettier-pr-1171-comments.json`

### 5.2 Prettier parenthesises a nested ternary only in the then branch, and only when it fits on one line (since 1.3, 2017). VERIFIED (PR, changelog, source at 3.9.10)

- **Citation:** prettier/prettier PR #1386, "Add parenthesis for unusual nested ternaries," by vjeux, merged 1 May 2017 (Prettier 1.3.0 changelog entry "Add parenthesis for unusual nested ternaries (#1386)"). https://github.com/prettier/prettier/pull/1386 ; `src/language-js/print/ternary-old.js` at `3.9.10` (the default printer; `ternary.js` calls it unless `experimentalTernaries` is set). https://github.com/prettier/prettier/blob/3.9.10/src/language-js/print/ternary-old.js
- **What it says:**
  - The PR: the else-branch chain is the common form; the then-branch form is the one "which is more rare and would be good to call out by adding parenthesis." But "Note that we only want parenthesis if it's written inline," "otherwise the indentation is good enough to understand the flow:".
  - The diff added `consequentNode.type === node.type ? ifBreak("", "(") : ""` around the consequent; the same lines are in `ternary-old.js` at 3.9.10. Nothing adds parentheses to a nested ternary in the alternate, and Prettier reprints from the AST, so parentheses the author wrote there are dropped.
  - In JSX mode the printer wraps branches in parentheses when they break: "Even though they don't need parens, we wrap (almost) everything in" "parens when using ?: within JSX, because the parens are analogous to" "curly braces in an if statement." It does not wrap "Nested conditional expressions in alternates".
- **My check (local run, 11 Nov 2026; `check/out/`, `check/format-matrix.txt`):** `a ? 1 : (b ? 2 : 3)` came back as `a ? 1 : b ? 2 : 3` from Prettier 3.9.10, Oxfmt 0.75.0 and Biome 2.6.4; `a ? b ? 1 : 2 : 3` came back as `a ? (b ? 1 : 2) : 3`; a then-branch nesting written with parentheses but too long for one line came back broken over lines with the parentheses gone. The same rule applies to TypeScript conditional types (Oxfmt at its default width 100 printed `T extends object ? (T extends unknown[] ? "array" : "object") : "primitive"`, as did Prettier at `--print-width 100`).
- **Caveat:** the PR gives a reason for the then-branch parentheses but none for treating the else branch differently beyond it being the common chain; that part is inference from the PR's framing.
- **For the post:** this is the mechanism behind the ping-pong. Unicorn wants parentheses on every nested ternary; the formatters want them only on a short then-branch nesting. Every other position is a conflict.
- **Text:** `scratchpad/nested-ternaries-lit/D/text/prettier-pr-1386.txt`, `scratchpad/nested-ternaries-lit/D/src/prettier-pr-1386.json`, `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-src-ternary-old.js`, `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-src-ternary.js`, `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-CHANGELOG.md`, `scratchpad/nested-ternaries-lit/D/check/format-matrix.txt`

### 5.3 Prettier 1.15 (Nov 2018) flattened the else branch, and the revert request became one of its most upvoted issues. VERIFIED (blog source, issues)

- **Citation:** "Prettier 1.15: HTML, Vue, Angular and MDX Support," by Ika (ikatyang), 7 Nov 2018, `website/blog/2018-11-07-1.15.0.md` at `3.9.10`. https://prettier.io/blog/2018/11/07/1.15.0.html ; PR #5039, "Print nested ternaries differently," by suchipi, merged 14 Oct 2018. https://github.com/prettier/prettier/pull/5039 ; issue #5476 (14 Nov 2018) https://github.com/prettier/prettier/issues/5476 ; issue #5814, "Nested ternary formatting - add indents back," opened by jurosh 29 Jan 2019, closed 24 Sep 2023 by PR #9559; 232 comments, 682 thumbs-up of 905 reactions. https://github.com/prettier/prettier/issues/5814
- **What it says:**
  - The release post: "Previously, nested ternaries were always indented," "which caused increasing levels of indentation for deeply-nested ternaries." So "we flattened the else-branch for nested ternaries in a fashion similar to how" `if`/`else if` chains are formatted. A then-branch nesting kept its indentation.
  - #5476, a week later: the old form "is certainly superior for communicating intent." Lydell (maintainer): "Yes, it was an intentional change:", and the reporter was "one of the first to express a preference for the old way."
  - #5814's opening post: "but it's much harder to read code now." The top comment (gaearon, 131 thumbs-up): "I don't think it's a purely stylistic preference." "It erases the logical structure where one is implied." and "the cleanliness made comprehension significantly harder,". mjackson (111), with the largest nested ternary in React Router: "this change makes it much more so."
  - Maintainers: suchipi said "the main motivation between not indenting them all" "was to make switch-like expressions look good."; duailibe: "I personally have no preference, but we can't keep changing things over and over."; Lydell, later: "in my opinion ternaries are the most cryptic syntax of all in JavaScript" "(that is commonly used)". mweststrate (39 thumbs-up) framed it as a tree: "All ternary expressions produce a binary decision tree" and "Using indentation immediately preserves this tree visually (but left rotated),".
- **Caveat:** thumbs-up on an issue are a measure of who showed up, not of comprehension. Nobody in the thread measured reading speed or errors; gaearon's claim is an expert's report.
- **For the post:** the closest thing to evidence about how formatting changes the cost of a nested ternary is a large, public, years-long disagreement, and both sides agree that indentation is what lets a reader find which `:` belongs to which `?`. That is an argument for the rule when the code can't be indented clearly, and an argument that the reading cost depends on layout, not only on nesting.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-blog-2018-11-07-1.15.0.md`, `scratchpad/nested-ternaries-lit/D/text/prettier-issue-5476.txt`, `scratchpad/nested-ternaries-lit/D/text/prettier-issue-5814.txt`, `scratchpad/nested-ternaries-lit/D/text/prettier-pr-5039.txt`, `scratchpad/nested-ternaries-lit/D/src/prettier-issue-5814.json`, `scratchpad/nested-ternaries-lit/D/src/prettier-issue-5814-comments.json`, `scratchpad/nested-ternaries-lit/D/src/prettier-pr-5039.json`

### 5.4 The 2020 proposals named the trade-offs: scaling, diffs, and showing the structure. VERIFIED (GitHub issue)

- **Citation:** prettier/prettier issue #9561, "Proposals for nested ternary formatting," opened by Alex Rattray (rattrayalex), 1 Nov 2020, still open; 88 comments. https://github.com/prettier/prettier/issues/9561
- **What it says:**
  - Eight goals, including that it "Scales well to long ternary chains" and "Clearly highlights the logical structure of the expression." Rattray adds: "I don't think something that fully satisfies all of the above constraints," exists.
  - Against the case-style (one condition and value per line) option: "When the conditional is complex, can be hard to scan and find the" question mark, and it "Could cause substantial (unuseful) git diffs" "when a ternary is added or removed to a chain."
  - Related, on editing: in #737 JAForbes put operators first because "I often comment out segments and replace them temporarily while debugging."; in Biome's discussion (5.17) pcattori wanted a flat style because "The main point is that its easier to independently modify each case;".
- **Caveat:** design notes by the person who later wrote the experimental style; no measurements.
- **For the post:** the formatter maintainers treat ease of editing (diff size when a branch is added) as a real cost of ternary chains, which bears directly on Hayden's point that nested ternaries are "hard to easily modify" compared with `if` statements. It cuts both ways: a flat chain is easy to extend, a nested one is not.
- **Text:** `scratchpad/nested-ternaries-lit/D/text/prettier-issue-9561.txt`, `scratchpad/nested-ternaries-lit/D/src/prettier-issue-9561.json`, `scratchpad/nested-ternaries-lit/D/text/prettier-issue-737.txt`, `scratchpad/nested-ternaries-lit/D/text/biome-discussion-2388.txt`

### 5.5 Prettier 3.1 (13 Nov 2023) put the indentation back by default and added `--experimental-ternaries`. VERIFIED (blog source, PRs, local run)

- **Citation:** "Prettier 3.1: New experimental ternaries formatting and Angular control flow syntax!," by Sosuke Suzuki, 13 Nov 2023, `website/blog/2023-11-13-3.1.0.md` at `3.9.10`. https://prettier.io/blog/2023/11/13/3.1.0.html ; PR #9559, "Add indentation back to nested ternaries," by Alex Rattray, opened 31 Oct 2020, merged 24 Sep 2023. https://github.com/prettier/prettier/pull/9559 ; PR #13183, "New Ternary Formatting: A Curious Case of the Ternaries," by Alex Rattray, opened 28 Jul 2022, merged 9 Oct 2023. https://github.com/prettier/prettier/pull/13183
- **What it says:**
  - "This release adds indentation back to nested ternaries along with a new" flag, and the team wanted feedback on the experimental format "before it rolls out as the default behavior later this year!"
  - On the experimental style: "after a few hours of use, developers find it makes nested ternaries" "much more readable and useful."
  - #9559 reverts the flattening commit from #5039 and "Fixes" #5814; #15702 (22 Nov 2023) shows a user surprised by the indentation change in a minor release.
- **My check (local run; `check/out/prettier/chain.js`):** Prettier 3.9.10 defaults indent each nested level of an else-branch chain by two more spaces, and nested JSX branches stay flat with each branch wrapped in parentheses.
- **Caveat:** "later this year" did not happen (5.7). The beta-testing claim is anecdotal (5.6).
- **For the post:** the default Ultracite users get from Prettier and Oxfmt today is the indented tree, the form #5814's commenters said shows the structure, and the one that grows to the right fastest on long chains.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-blog-2023-11-13-3.1.0.md`, `scratchpad/nested-ternaries-lit/D/text/prettier-pr-9559.txt`, `scratchpad/nested-ternaries-lit/D/text/prettier-pr-13183.txt`, `scratchpad/nested-ternaries-lit/D/text/prettier-issue-15702.txt`, `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-blog-authors.yml`, `scratchpad/nested-ternaries-lit/D/check/format-matrix.txt`

### 5.6 "A curious case of the ternaries" (Alex Rattray, 2023): the case for formatting them well instead of refactoring them. ANECDOTAL (project blog; beta-test quotes); My check on its example

- **Citation:** Alex Rattray, "A curious case of the ternaries," Prettier blog, 13 Nov 2023, `website/blog/2023-11-13-curious-ternaries.md` at `3.9.10`. https://prettier.io/blog/2023/11/13/curious-ternaries
- **What it says:**
  - "Formatting nested ternaries nicely in a wide variety of scenarios" "is a surprisingly tricky challenge." "Developers have long found them so confusing to read that they end up" "just refactoring their code to an ugly series of" `if`/`else` statements, "an iife, or a separate function entirely."
  - On the 2018 flattening: "the issue asking it to be reverted had well over 500 upvotes."
  - Criteria include "TypeScript conditional expressions (which cannot be expressed with" `if`) and "It should scale to nested ternary chains of arbitrary length".
  - Evidence: "we found developers were quite skeptical when they first saw it" but then didn't want to go back; one tester: "I used to hate nested ternaries," but now preferred the new style to `if`/`else`. "The bad news is that it's novel, and thus unfamiliar to most developers."
- **My check (local run; `check/blog-example/animal-name.txt`, Node 24.14.1):** the post shows `animalName` in "curious" form (`canBark ? (isScary ? 'wolf' : 'dog') : canMeow ? 'cat' : 'probably a bunny'`) and then "rewritten to demonstrate 'case-style' ternaries" as `isScary ? 'wolf' : canBark ? 'dog' : ...`. Over all 8 combinations of the three predicates, the two differ in 2: a scary pet that can't bark is "wolf" in the rewrite and "cat" or "probably a bunny" in the original. The post's third example tests `pet.canSqueak()` twice, so its last `'mouse'` branch is unreachable.
- **Caveat:** the post illustrates formatting and doesn't claim the rewrite is equivalent. The beta-test evidence is a few people; PR #13183 says it was "someone commenting on a PR adding this style to their codebase at work" and a teammate. Not a study.
- **For the post:** the author of Prettier's ternary formatting argued the opposite of the rule: that nested ternaries are fine once formatted, and that refactoring them into `if`/`else` is the ugly option. The post's own example is a neat warning for the other side: flattening a nested ternary into a chain is a change of logic, not of layout, unless the inner condition is folded into the test (`canBark && isScary`).
- **Text:** `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-blog-2023-11-13-curious-ternaries.md`, `scratchpad/nested-ternaries-lit/D/text/prettier-pr-13183.txt`, `scratchpad/nested-ternaries-lit/D/check/blog-example/animal-name.mjs`, `scratchpad/nested-ternaries-lit/D/check/blog-example/animal-name.txt`

### 5.7 Three years on, experimental ternaries are still experimental. VERIFIED (docs at 3.9.10, CLI, issue)

- **Citation:** Prettier `docs/options.md` at `3.9.10`, "Experimental Ternaries". https://github.com/prettier/prettier/blob/3.9.10/docs/options.md ; `prettier --help experimental-ternaries` (3.9.10); issue #17790, "Experimental ternaries default," opened by thernstig 12 Aug 2025, open; 9 thumbs-up. https://github.com/prettier/prettier/issues/17790
- **What it says:**
  - The docs: try the new formatting "before it becomes the default behavior." `true`: "Use curious ternaries, with the question mark after the condition." `false`: "Retain the default behavior of ternaries;" "keep question marks on the same line as the consequent." Default `false`. The CLI help at 3.9.10 says the same and "Default: false".
  - #17790: "Is the intention to ever make it the default? Is it time?" None of its 5 comments by 11 Nov 2026 is from a Prettier member or collaborator (GitHub `author_association` is `NONE` on all 5). One user (nielskrijger, June 2026): "it only improves the readability of nested ternaries, but makes single ternaries much worse." and "Nested ternaries are evil and should be blocked outright."
- **My check (`check/out/prettier-exp/`):** the experimental style puts `?` at the end of each condition line, prints simple chains one case per line, and was the only one of the formatters to break the long template-literal interpolation in `template.js` across lines (5.8).
- **Caveat:** the user comments are single opinions.
- **For the post:** there is no settled good format for nested ternaries even inside Prettier; the style built for them never became the default. The user who calls for blocking them outright is doing what Ultracite does.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-docs-options.md`, `scratchpad/nested-ternaries-lit/D/check/prettier-help-experimental-ternaries.txt`, `scratchpad/nested-ternaries-lit/D/text/prettier-issue-17790.txt`, `scratchpad/nested-ternaries-lit/D/src/prettier-issue-17790.json`

### 5.8 A formatter will never rewrite a nested ternary into `if`/`else`, and won't break one inside a template literal. VERIFIED (docs and source at 3.9.10; local run)

- **Citation:** Prettier `docs/rationale.md` at `3.9.10`, "What Prettier is not concerned about"; `src/language-js/print/template-literal.js` at `3.9.10`.
- **What it says:**
  - "Prettier only prints code. It does not transform it." Out of scope, among others: turning `?:` into `if`-`else` statements, and adding or removing optional braces and `return`.
  - Template literals: "Never add a newline to an interpolation which didn't already have one..." unless the expression would break anyway.
- **My check (`check/out/*/template.js`):** a 124-character line holding a two-level ternary inside `${}` was left on one line by Prettier (default), Oxfmt and Biome. Only `--experimental-ternaries` broke it.
- **Caveat:** Oxfmt and Biome follow Prettier's behaviour here by observation; I didn't read their template-literal source.
- **For the post:** the fixes the rule asks for (early returns, a lookup object, an extracted helper) are transformations, so no formatter will make them; they are left to the developer or the agent. And a nested ternary in a template literal is the one place the formatter gives the reader no help at all.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-docs-rationale.md`, `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-src-template-literal.js`, `scratchpad/nested-ternaries-lit/D/check/format-matrix.txt`

### 5.9 The format matrix: Oxfmt matches Prettier byte for byte, Biome except for comments. My check (local run)

- **Citation:** `check/in/` (8 inputs: `chain.js`, `consequent.js`, `parens.js`, `parens-long.js`, `jsx.jsx`, `template.js`, `types.ts`, `misc.ts`), outputs in `check/out/<tool>/`, comparisons in `check/compare-prettier100-vs-oxfmt-default.txt` and `check/compare-prettier-tabs-vs-biome-default.txt`. Run 11 Nov 2026: Prettier 3.9.10 (`--no-config`), Oxfmt 0.75.0 (defaults, and `check/cfg/oxfmt-ultracite.json` with Ultracite's options), Biome 2.6.4 (defaults, and `check/cfg/biome/biome.json` with Ultracite's formatter options).
- **What it shows:**
  - At Ultracite's settings (printWidth 80, spaces), Oxfmt and Biome produced output identical to Prettier's on all 8 files. At their own defaults, Oxfmt (width 100) was identical to Prettier at `--print-width 100` on all 8, and Biome (tabs) was identical to Prettier `--use-tabs` on 7 of 8; the eighth differed only in placing a comment after `?` instead of after the condition.
  - Shared behaviour: chains in the else branch indent two spaces per level; a short then-branch nesting gets parentheses; parentheses in the else branch are removed (`a ? 1 : (b ? 2 : (c ? 3 : 4))` became `a ? 1 : b ? 2 : c ? 3 : 4`); JSX chains stay flat with `(`…`)` around each branch; nested TypeScript conditional types indent like expression chains.
  - `--experimental-ternaries` differs on every multi-line case (5.7).
- **Caveat:** 8 hand-written files, chosen to hit known cases; not a corpus. dprint was not run.
- **For the post:** on nested ternaries, the three formatters Ultracite supports are interchangeable, so the lint-formatter interaction in 5.16 is the same whichever one a user picked.
- **Text:** `scratchpad/nested-ternaries-lit/D/check/format-matrix.txt`, `scratchpad/nested-ternaries-lit/D/check/compare-prettier100-vs-oxfmt-default.txt`, `scratchpad/nested-ternaries-lit/D/check/compare-prettier-tabs-vs-biome-default.txt`

### 5.10 Indentation is the formatter's only tool, and it runs out on long chains and conditional types. ANECDOTAL (issue reports); My check

- **Citation:** oxc-project/oxc issue #19778, "formatter: chained ternary indentation cascades instead of staying flat," 26 Feb 2026, closed. https://github.com/oxc-project/oxc/issues/19778 ; issue #14914 (5.11); Biome discussion #2388 (5.17).
- **What it says:**
  - #19778 compared Prettier 2.8.8's flat chain with Oxfmt's indented one; an Oxc maintainer (leaysgur) replied that Prettier 3.8.1 gives the same indentation: "We are aiming for compatibility with a relatively new version of Prettier (3.8.0)". isaacs called it particularly annoying for types, "where ternaries cannot be replaced with logical" `if`/`else` chains.
  - On #14914, ssalbdivad (ArkType): "Every branch of a chained conditional type indents another level," "so type-level parsers and validators drift off the right side of the screen."
- **My check (`check/out/prettier/types.ts`):** a five-way conditional type ends at 8 spaces of indentation under Prettier, Oxfmt and Biome defaults.
- **Caveat:** these are users who want a flatter style; they are not a sample.
- **For the post:** for value-level code the rule offers a way out (if/else, early returns, a lookup). For conditional types there is none, and the formatter's indented tree is the cost people complain about.
- **Text:** `scratchpad/nested-ternaries-lit/D/text/oxc-issue-19778.txt`, `scratchpad/nested-ternaries-lit/D/src/oxc-issue-19778-comments.json`, `scratchpad/nested-ternaries-lit/D/text/oxc-issue-14914.txt`, `scratchpad/nested-ternaries-lit/D/check/format-matrix.txt`

### 5.11 Oxfmt follows Prettier's default ternaries and does not support `experimentalTernaries`. VERIFIED (installed package, CLI, docs, issues); Vendor (VoidZero/Oxc) for the docs' compatibility claims

- **Citation:** `oxfmt` 0.75.0 package: `configuration_schema.json`, `dist/index.d.ts`, `dist/migrate-prettier-*.js`; Oxc docs, "Migrate from Prettier" and "Unsupported features" (live pages fetched 11 Nov 2026). https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html , https://oxc.rs/docs/guide/usage/formatter/unsupported-features.html ; oxc-project/oxc issue #14914, "formatter: Support `experimentalTernaries` option," opened by chenglou 23 Oct 2025, open, 18 thumbs-up. https://github.com/oxc-project/oxc/issues/14914 ; PR #26008, "feat(formatter): support experimental ternaries," by Boshen, 23 Aug 2026, closed unmerged 24 Sep 2026. https://github.com/oxc-project/oxc/pull/26008 ; issue #15930 (Nov 2025).
- **What it says:**
  - The schema's top-level options include `experimentalOperatorPosition` and no `experimentalTernaries`; the Prettier migration's list of compatible options leaves it out, so it is skipped with a warning.
  - Docs: "Oxfmt is compatible with Prettier v3.9.9 for many configurations." "Oxfmt uses Prettier's output as its baseline, but does not reproduce its bugs." Under unsupported features ("These features are planned."): "experimentalTernaries option".
  - #14914, an Oxc maintainer (leaysgur): "However, as for now, we do not yet support this option." and "Since this option is still experimental," the team had "not yet decided whether to support it". lukaselmer (Aug 2026): "I can't believe this is still experimental" and it is "a blocker for us to switch to oxc".
  - PR #26008: "Support Prettier’s experimentalTernaries formatting for JS/JSX and TypeScript conditional types." and "AI assistance: Codex was used to implement and verify this change." Closed with no comment giving a reason.
  - #15930 (Dunqing): "We should report an error for all options that we haven't supported;".
- **My check (`check/oxfmt-exp/`):** a config with `"experimentalTernaries": true` makes Oxfmt 0.75.0 exit 1 with "Failed to parse configuration." and "Unsupported option:"; `oxfmt --migrate=prettier` on a `.prettierrc.json` with it prints "'experimentalTernaries' is not supported, skipping..." and writes a config without it.
- **Caveat:** the oxc.rs pages are live and say 3.9.9 where 0.75.0's era may have targeted another version; #19778 (Feb 2026) cites 3.8.0. VoidZero/Oxc owns the product.
- **For the post:** Ultracite's recommended formatter cannot be set to Prettier's experimental ternary style, so Oxfmt users get the indented tree with no escape hatch; that strengthens the case for the rule there.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/oxfmt-0.75.0-configuration_schema.json`, `scratchpad/nested-ternaries-lit/D/src/oxfmt-0.75.0-index.d.ts`, `scratchpad/nested-ternaries-lit/D/src/oxfmt-0.75.0-migrate-prettier.js`, `scratchpad/nested-ternaries-lit/D/text/oxc-docs-migrate-from-prettier.txt`, `scratchpad/nested-ternaries-lit/D/text/oxc-docs-unsupported-features.txt`, `scratchpad/nested-ternaries-lit/D/text/oxc-issue-14914.txt`, `scratchpad/nested-ternaries-lit/D/text/oxc-issue-15930.txt`, `scratchpad/nested-ternaries-lit/D/src/oxc-pr-26008.json`, `scratchpad/nested-ternaries-lit/D/check/oxfmt-exp/oxfmt-experimentalTernaries-config.txt`, `scratchpad/nested-ternaries-lit/D/check/oxfmt-exp/oxfmt-migrate-prettier.txt`, `scratchpad/nested-ternaries-lit/D/check/oxfmt-help.txt`

### 5.12 Ultracite's formatter configs set nothing about ternaries, and its presets are stable under fix-then-format. VERIFIED (worktree at `cfa365be`); My check (local run)

- **Citation:** `packages/cli/config/oxfmt/index.mjs` and `packages/cli/config/prettier/prettier.config.mjs` (worktree `cfa365be`); `packages/cli/config/oxlint/core/index.mjs` and `config/eslint/core/rules/unicorn.mjs`; commit `7b0456e6` (PR #791 by Keyur Govrani, 4 Sep 2026), which turned `unicorn/no-nested-ternary` off; `git log -S` on the worktree.
- **What it says:**
  - Neither formatter config sets `experimentalTernaries` (both set printWidth 80, two spaces, double quotes, `trailingComma: "es5"`); `git log -S experimentalTernaries` finds no commit that ever did. Biome's preset formatter block has no ternary option because Biome has none (5.17).
  - The commit's reason: "its fixer adds parentheses that oxfmt and Prettier strip, so every fix run" "rewrote the file twice." The Oxlint comment it added: "Its fixer wraps the inner ternary in parentheses that oxfmt strips, so"; the ESLint wording was aligned in `ed5ed04d` (10 Oct 2026). The same PR moved `ultracite fix` to run the linter before the formatter.
- **My check (`check/ultracite-preset/ultracite-preset.txt`, `check/ultracite-eslint/`):** with a config extending Ultracite's Oxlint core preset, Oxlint 1.90.0 reported `no-nested-ternary` 3 times on `check/pingpong-eslint/input.js` (plus `unicorn/prefer-math-min-max` once) and no `unicorn/no-nested-ternary`; `oxlint --fix` then Oxfmt with Ultracite's config left the file byte-identical after two rounds. With Ultracite's ESLint core preset, ESLint 10.14.0 reported `no-nested-ternary` 3 times and `sonarjs/no-nested-conditional` 3 times, and `eslint --fix` then Prettier with Ultracite's config left it identical. `eslint --print-config` shows `indent`, `multiline-ternary`, `operator-linebreak`, `@stylistic/multiline-ternary` and `unicorn/no-nested-ternary` at 0, and `unicorn/no-unnecessary-nested-ternary` at 2.
- **Caveat:** I didn't run the `ultracite` CLI itself, only the presets with the same binaries in the order the CLI uses.
- **For the post:** Ultracite gives up unicorn's narrower rule to keep `fix` idempotent and keeps the stricter core rule, which reports every nested ternary with or without parentheses and never edits the code.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/ultracite-commit-7b0456e6.txt`, `scratchpad/nested-ternaries-lit/D/check/ultracite-preset/ultracite-preset.txt`, `scratchpad/nested-ternaries-lit/D/check/ultracite-eslint/ultracite-eslint.txt`, `scratchpad/nested-ternaries-lit/D/check/ultracite-eslint/ultracite-eslint-ternary-rules.txt`

### 5.13 eslint-config-prettier has turned `unicorn/no-nested-ternary` off since 2019, as a plain conflict, not a special rule. VERIFIED (source and changelog at v10.1.8; issue, PR, commit)

- **Citation:** prettier/eslint-config-prettier `index.js`, `README.md` and `CHANGELOG.md` at `v10.1.8`; issue #110, "'unicorn/no-nested-ternary' conflict with Prettier," and PR #111 by Yang Mingshan (yangmingshan), 5 Oct 2019; commit `67bd0fac` by Simon Lydell, "Add unicorn/no-nested-ternary," 5 Oct 2019, released in 6.4.0. https://github.com/prettier/eslint-config-prettier/issues/110 , https://github.com/prettier/eslint-config-prettier/commit/67bd0fac976cef9c8496338e3ce94cc39e952873 ; issue #335 (14 Jun 2025).
- **What it says:**
  - The package "Turns off all rules that are unnecessary or might conflict with" Prettier. At v10.1.8, `index.js` sets `"unicorn/no-nested-ternary": "off"`; special rules are marked `0` ("specialRule") instead and get README sections. This one has no README entry. It also turns off `indent`, `multiline-ternary`, `operator-linebreak` and their `@stylistic` versions, and leaves the core `no-nested-ternary` alone.
  - Changelog, Version 6.4.0 (2019-10-05): added `unicorn/no-nested-ternary`, "Thanks to Yang Mingshan". The issue's whole case was two lines: "Unicorn wants" `i > 100 ? 100 : (i < 50 ? 50 : i)`, "Prettier wants" the same without the parentheses. Lydell: "It turned out easier to do it myself in the end,".
  - #335 (2025) reported the same conflict again and was closed as a duplicate of #110.
- **Caveat:** the README explains other conflicts at length; the reason for this one exists only in the 2019 issue.
- **For the post:** the conflict is six years old and was settled by switching the rule off, which is what Ultracite does. The reason to keep the core rule is that it's not a formatting rule, so eslint-config-prettier leaves it on.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/eslint-config-prettier-v10.1.8-index.js`, `scratchpad/nested-ternaries-lit/D/src/eslint-config-prettier-v10.1.8-README.md`, `scratchpad/nested-ternaries-lit/D/src/eslint-config-prettier-v10.1.8-CHANGELOG.md`, `scratchpad/nested-ternaries-lit/D/text/ecp-issue-110.txt`, `scratchpad/nested-ternaries-lit/D/text/ecp-issue-111.txt`, `scratchpad/nested-ternaries-lit/D/text/ecp-issue-335.txt`, `scratchpad/nested-ternaries-lit/D/src/ecp-commit-67bd0fac.json`, `scratchpad/nested-ternaries-lit/D/src/ecp-pr-111-files.json`

### 5.14 Unicorn's rule exists to allow one parenthesised level, and its fixer only adds parentheses. VERIFIED (source and docs at v79.0.0; origin issue)

- **Citation:** eslint-plugin-unicorn `rules/no-nested-ternary.js` (installed 79.0.0) and `docs/rules/no-nested-ternary.md` at `v79.0.0`; sindresorhus/eslint-plugin-unicorn issue #50, "A better `no-nested-ternary` rule," opened by Sindre Sorhus 22 Sep 2016, closed 16 Sep 2019 when karaggeorge's PR #296, "Add `no-nested-ternary` rule," was merged. https://github.com/sindresorhus/eslint-plugin-unicorn/issues/50 ; issues #663 (2020) and #2008 (2022–2026).
- **What it says:**
  - #50: "Since it was denied in ESLint:" (eslint/eslint#3480), a rule that "only errors on nested ternaries that are not wrapped in parens." SamVerschueren on three levels: "Because that is IMO not readable at all." Sorhus: "Only one level. Shouldn't be configurable." and "this rule could be fixable, by just wrapping the nested ternary in parens." zeorin (2019) suggested a different approach: "only allow nested ternaries in the alternate sub-expression, effectively creating a daisy chain." and noted "My change to ESLint, too, was rejected:".
  - Docs at v79: "This rule allows cases where the nested ternary" "is only one level and wrapped in parens." "Unparenthesized or deeply nested ternaries make readers track multiple conditions and branches at once," "This rule is only fixable when the nesting is up to one level." The header says the rule is in `recommended` and disabled in `unopinionated`.
  - Source: messages "Nested ternary expression should be parenthesized." (fixable, inserts `(` and `)`) and "Do not nest ternary expressions." (deeper, no fix).
  - #2008, closed by Sorhus in June 2026: for deeper nesting "adding parentheses does not fix the violation," and rewriting to `if`/`else` "is too large and opinionated for an autofix." #663 (2020) shows a parser bug where each `xo --fix` added more parentheses: "the more I run this the more brackets I get".
- **Caveat:** the origin issue gives taste ("IMO"), not evidence, for allowing one level.
- **For the post:** unicorn's rule and the core rule disagree about one thing, whether `a ? 1 : (b ? 2 : 3)` is acceptable, and that is exactly the form the formatter rewrites.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/unicorn-v79.0.0-no-nested-ternary.js`, `scratchpad/nested-ternaries-lit/D/src/unicorn-v79.0.0-docs-no-nested-ternary.md`, `scratchpad/nested-ternaries-lit/D/text/unicorn-issue-50.txt`, `scratchpad/nested-ternaries-lit/D/src/unicorn-pr-296.json`, `scratchpad/nested-ternaries-lit/D/text/unicorn-issue-2008.txt`, `scratchpad/nested-ternaries-lit/D/text/unicorn-issue-663.txt`

### 5.15 Unicorn's maintainer refuses to bend the rule to formatters. ANECDOTAL (maintainer comments)

- **Citation:** sindresorhus/eslint-plugin-unicorn issues #2604, "`no-nested-ternary` conflicts with `prettier`" (23 Mar 2025, 6 thumbs-up, closed 5 Jun 2026); #2901, "Add option to allow single-level nesting without requiring parentheses" (reteps, 23 Feb 2026, declined 5 Jun 2026); #3767, "Natively avoid Prettier / common formatter conflicts" (JoshuaKGoldberg, 26 Sep 2026, closed 2 Oct 2026). https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2901 , https://github.com/sindresorhus/eslint-plugin-unicorn/issues/3767
- **What it says:**
  - #2604 reported `ESLintCircularFixesWarning` from the rule and Prettier: "Is there a way to fix this conflict?" fregante: "I think this applies to all formatting rules,".
  - #2901: Prettier "removes the parentheses the auto-fixer adds — producing a circular fix loop." and disabling the rule "throws away the valuable deep-nesting protection." Sorhus declined: "The parenthesization requirement is the core of this rule, not an incidental detail." "and the parens are what make the intent explicit." With Prettier, "turning it off is the correct and intended resolution."; bending the rule to a formatter "is a slope with no natural stopping point."
  - #3767: JoshuaKGoldberg argued Prettier rarely changes ("Even small changes such as ternary line wrapping" "are treated as large breaking changes by the community.") and that the conflicts cause user pain. Sorhus: "Unicorn is an independent project, and Prettier compatibility is not a goal." The rule "is about making nesting explicit"; "If Prettier's output decided what Unicorn can enforce, Prettier would set our defaults,". fregante counted "three conflicting unicorn rules". The issue closed after `number-literal-case` moved out of `unopinionated`; `no-nested-ternary` stayed in `recommended`.
- **Caveat:** maintainer opinions in issue threads.
- **For the post:** this is the honest answer to why the unicorn rule is off: two maintained tools hold opposite, deliberate positions on the same parentheses, and neither will move. Ultracite picked the formatter, and kept a rule that doesn't care about parentheses.
- **Text:** `scratchpad/nested-ternaries-lit/D/text/unicorn-issue-2604.txt`, `scratchpad/nested-ternaries-lit/D/text/unicorn-issue-2901.txt`, `scratchpad/nested-ternaries-lit/D/text/unicorn-issue-3767.txt`, `scratchpad/nested-ternaries-lit/D/src/unicorn-issue-2901-comments.json`, `scratchpad/nested-ternaries-lit/D/src/unicorn-issue-3767-comments.json`

### 5.16 The ping-pong, reproduced: lint fix and formatter undo each other forever. My check (local run); VERIFIED (ESLint docs at v10.14.0)

- **Citation:** `check/pingpong-eslint/pingpong-eslint-prettier.txt` (ESLint 10.14.0 with only `unicorn/no-nested-ternary` 79.0.0, then Prettier 3.9.10, three rounds); `check/pingpong-eslint-plugin-prettier/eslint-fix-with-plugin-prettier.txt` (one `eslint --fix` with `unicorn/no-nested-ternary` and `prettier/prettier` from eslint-plugin-prettier 5.5.6); `check/pingpong-oxlint/pingpong-oxlint-oxfmt.txt` (Oxlint 1.90.0 `unicorn/no-nested-ternary` then Oxfmt 0.75.0, two rounds); `check/core-rule/core-rules.txt`. ESLint, "Circular fixes detected …," `docs/src/use/troubleshooting/circular-fixes.md` at `v10.14.0`.
- **What it shows:**
  - Input: `i > 100 ? 100 : i < 50 ? 50 : i`, `a ? (b ? 1 : 2) : 3`, and a then-branch nesting too long for one line. ESLint reported 2 errors ("Nested ternary expression should be parenthesized"); `--fix` wrapped both; Prettier removed both pairs; the next ESLint run reported the same 2 errors. Three rounds, same result. The short then-branch case was stable, because Prettier adds the parentheses there itself (5.2).
  - In one ESLint run with both rules: "Circular fixes detected while fixing" the file, "It is likely that you have conflicting rules in your configuration.", and the file ended as it started with 2 errors left. ESLint's docs: "ESLint autofixes code in multiple passes, meaning it's possible that a fix" "in one pass is undone in a subsequent pass."
  - Oxlint and Oxfmt: identical cycle, with Oxlint's message "Unexpected nested ternary expression without parentheses."
  - Core rules on the formatted file: ESLint `no-nested-ternary` and Oxlint's port reported all 3 nestings, parenthesised or not ("Do not nest ternary expressions"), with no fix; Oxlint's help says "Refactor nested ternary expressions into if-else statements for better readability." Biome's `noNestedTernary` reported all 3, and `biome check --write` only reformatted (it stripped the else-branch parentheses).
  - Lydell's 2020 rule of thumb in #5814 describes the same test: "Then Prettier changes the code back again so that ESLint reports the error again." "Then you know that the rule conflicts with Prettier and you should disable it."
- **Caveat:** hand-written inputs. eslint-plugin-prettier is not part of Ultracite; it's used here only to show ESLint's own cycle detection.
- **For the post:** a concrete, reproducible example of a lint fixer and a formatter disagreeing, with the exact cost: the file is rewritten on every run and the error never goes away. For an agent told to make `check` pass, this is a loop it can't win by running `fix`.
- **Text:** `scratchpad/nested-ternaries-lit/D/check/pingpong-eslint/pingpong-eslint-prettier.txt`, `scratchpad/nested-ternaries-lit/D/check/pingpong-eslint-plugin-prettier/eslint-fix-with-plugin-prettier.txt`, `scratchpad/nested-ternaries-lit/D/check/pingpong-oxlint/pingpong-oxlint-oxfmt.txt`, `scratchpad/nested-ternaries-lit/D/check/core-rule/core-rules.txt`, `scratchpad/nested-ternaries-lit/D/src/eslint-v10.14.0-circular-fixes.md`, `scratchpad/nested-ternaries-lit/D/text/prettier-issue-5814.txt`

### 5.17 Biome: Prettier's ternaries with no option to change them, and a lint rule the formatter once hid violations from. VERIFIED (installed 2.6.4, changelog, issues); ANECDOTAL (discussion)

- **Citation:** `@biomejs/biome` 2.6.4 `README.md` and `configuration_schema.json`; `CHANGELOG.md` at `@biomejs/biome@2.6.4`; biomejs/biome issue #8045, "`lint/style/noNestedTernary` doesn't work with parentheses" (9 Nov 2025), fixed by PR #8086 in 2.3.6 https://github.com/biomejs/biome/issues/8045 ; issue #837 (22 Nov 2023, closed 21 Mar 2026); discussion #2388, "Ideas for ternary formatting optimized for conditional types" (ssalbdivad, 9 Apr 2024; 24 upvotes, 9 comments). https://github.com/biomejs/biome/discussions/2388
- **What it says:**
  - The README claims "97% compatibility with Prettier". The JS formatter options at 2.6.4 include `operatorLinebreak` and nothing for ternaries.
  - #8045: Biome's formatter added parentheses to `val ? (Math.random() ? 1 : 2) : 3`, after which "case1 is no longer detected as an error"; the reporter expected detection "regardless of whether parentheses are present". The fix (2.3.6) says the rule had missed such cases "because the parentheses prevented detection." PR #8086 notes it "was written primarily with Claude Code."
  - Biome 2.4.12's changelog lists unicorn's `no-nested-ternary` as a rule source for `noNestedTernary`, but Biome's rule (since 2.3.6) reports a parenthesised single level that unicorn allows (my run in 5.16).
  - #837: Biome's nested-ternary indentation differed from Prettier 3.1's when tabs were used; a maintainer: "Otherwise, we match Prettier, which is NOT a bug". Fixed by 2026.
  - #2388: "I find the nested version much harder to read," "and there is no way to refactor it into another type-level construct". A maintainer (ematipico): "Unfortunately TypeScript types have become veeeeery long, and we should acknowledge that." pcattori: "The main point is that its easier to independently modify each case;".
- **Caveat:** Biome's 97% figure is the project's own score against Prettier's tests, not specific to ternaries.
- **For the post:** a sharp example of formatter and linter interacting: until 2.3.6 (Nov 2025), the formatter's own parentheses made a short then-branch nesting invisible to Biome's `noNestedTernary`. Worth one sentence on why a nesting rule must look through parentheses.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/biome-2.6.4-README.md`, `scratchpad/nested-ternaries-lit/D/src/biome-2.6.4-configuration_schema.json`, `scratchpad/nested-ternaries-lit/D/src/biome-2.6.4-CHANGELOG.md`, `scratchpad/nested-ternaries-lit/D/text/biome-issue-8045.txt`, `scratchpad/nested-ternaries-lit/D/src/biome-pr-8086.json`, `scratchpad/nested-ternaries-lit/D/text/biome-issue-837.txt`, `scratchpad/nested-ternaries-lit/D/text/biome-discussion-2388.txt`

### 5.18 dprint keeps chains flat by default and only just gained a tree option. VERIFIED (schema, source and release at 0.100.0 / 0.97.0)

- **Citation:** dprint-plugin-typescript `deployment/schema.json`, `src/configuration/builder.rs` and `resolve_config.rs` at `0.100.0`; release 0.97.0 (5 Nov 2026); PR #450 by declanvong, opened 1 Nov 2022, merged 4 Nov 2026. https://github.com/dprint/dprint-plugin-typescript/pull/450
- **What it says:**
  - `conditionalExpression.linePerExpression` (default `true`): "Whether to force a line per expression when spanning multiple lines." `conditionalExpression.operatorPosition` defaults to `nextLine` ("Forces the operator to be on the next line.").
  - `conditionalExpression.useNestedIndentation` and `conditionalType.useNestedIndentation` (default `false`): "Whether to indent a nested conditional in the true or false part" "more than its parent, so it formats as a tree." The default "Keeps the false part of a nested conditional at the same indentation" as its parent, the flat chain Prettier used from 1.15 to 3.0.
  - Added in 0.97.0, from a 2022 PR: "We've had this in our fork for over a year now,". `preferSingleLine` is described as "This is very experimental."
- **Caveat:** not run (no binary). I didn't check what dprint does with parentheses around a nested ternary; it formats from the source's line breaks more than Prettier does, so it may keep them.
- **For the post:** the one formatter the ESLint team recommended alongside Prettier (5.19) defaults to the style Prettier abandoned. There is no single formatter style to point to.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/dprint-plugin-typescript-0.100.0-schema.json`, `scratchpad/nested-ternaries-lit/D/src/dprint-plugin-typescript-0.100.0-builder.rs`, `scratchpad/nested-ternaries-lit/D/src/dprint-plugin-typescript-0.100.0-resolve_config.rs`, `scratchpad/nested-ternaries-lit/D/src/dprint-plugin-typescript-release-0.97.0.json`, `scratchpad/nested-ternaries-lit/D/src/dprint-pr-450.json`

### 5.19 ESLint's own ternary layout rules, deprecated in 8.53.0. VERIFIED (docs and source at v10.14.0; @stylistic v5.10.0; ESLint blog)

- **Citation:** ESLint `docs/src/rules/indent.md`, `multiline-ternary.md`, `operator-linebreak.md`, `lib/rules/indent.js`, `lib/rules/multiline-ternary.js` at `v10.14.0`; ESLint Stylistic `packages/eslint-plugin/rules/indent/README.md` and `multiline-ternary/README.md` at `v5.10.0`; Nicholas C. Zakas, "Deprecation of formatting rules," ESLint blog, 26 Oct 2023. https://eslint.org/blog/2023/10/deprecating-formatting-rules/
- **What it says:**
  - `indent` option `flatTernaryExpressions` "requires no indentation for ternary expressions which are nested in other ternary expressions." (default `false`); `offsetTernaryExpressions` indents the values. `multiline-ternary`: "This rule enforces or disallows newlines between operands of a ternary expression." `operator-linebreak` sets where `?` and `:` go.
  - Each has `deprecated` metadata: "Formatting rules are being moved out of ESLint core.", `deprecatedSince` `8.53.0`, `availableUntil` `11.0.0`, replaced by "ESLint Stylistic now maintains deprecated stylistic core rules." ESLint Stylistic v5.10.0 keeps `flatTernaryExpressions` with the same wording and adds `ignoreJSX` to `multiline-ternary`.
  - The blog: "In ESLint v8.53.0, scheduled to be released on Friday, November 3, 2023," "we will formally deprecate our formatting rules." One reason: "Rule clashes. People expect that core rules will play nice with each other,". It recommends Prettier or dprint.
- **Caveat:** ESLint 10.14.0 still ships the deprecated rules. Ultracite's ESLint preset has them off through eslint-config-prettier (5.12).
- **For the post:** a line at most: the flat-chain layout Prettier rejected is one config option away in ESLint Stylistic, but Ultracite leaves layout to the formatter.
- **Text:** `scratchpad/nested-ternaries-lit/D/src/eslint-v10.14.0-indent.md`, `scratchpad/nested-ternaries-lit/D/src/eslint-v10.14.0-multiline-ternary.md`, `scratchpad/nested-ternaries-lit/D/src/eslint-v10.14.0-operator-linebreak.md`, `scratchpad/nested-ternaries-lit/D/src/eslint-v10.14.0-indent.js`, `scratchpad/nested-ternaries-lit/D/src/eslint-v10.14.0-multiline-ternary.js`, `scratchpad/nested-ternaries-lit/D/src/stylistic-v5.10.0-indent-README.md`, `scratchpad/nested-ternaries-lit/D/src/stylistic-v5.10.0-multiline-ternary-README.md`, `scratchpad/nested-ternaries-lit/D/text/eslint-blog-2023-10-deprecating-formatting-rules.txt`

### 5.20 The nesting rules don't look at conditional types. My check (local run)

- **Citation:** `check/conditional-types/conditional-types.txt`: ESLint 10.14.0 with @typescript-eslint/parser 8.72.1 (`no-nested-ternary`, `unicorn/no-nested-ternary`), Oxlint 1.90.0 (both), Biome 2.6.4 (`noNestedTernary`) on a file with a nested conditional type on line 1 and the same nesting as a value on line 2.
- **What it shows:** every rule reported line 2 only. None reported the nested conditional type on line 1.
- **Caveat:** one file. The rules are documented for conditional expressions; this confirms they don't extend to `TSConditionalType`.
- **For the post:** for types, which "cannot be expressed with" `if` (5.6), the lint rule is silent and the formatter decides everything. The post can say plainly that the rule's scope is runtime expressions.
- **Text:** `scratchpad/nested-ternaries-lit/D/check/conditional-types/conditional-types.txt`, `scratchpad/nested-ternaries-lit/D/src/prettier-3.9.10-blog-2023-11-13-curious-ternaries.md`

## 6. Comprehension and cognitive effort

Every quote below was copied from a file saved under `scratchpad/nested-ternaries-lit/E/` (PDFs converted with `pdftotext -layout` and plain `pdftotext`; HTML and JATS XML saved raw, with text dumps). Metadata came from Crossref and OpenAlex (no `mailto`), the arXiv API and Europe PMC; no email address or name went into any request, and Unpaywall links that appeared in search results and API responses were not followed. Crossref records for the DOIs cited are in `scratchpad/nested-ternaries-lit/E/src/meta/`. The one local run (6.18) used the worktree's ESLint 10.14.0, eslint-plugin-sonarjs 4.2.2 and Biome 2.6.4 on Node 24.14.1.

Items 6.1–6.10 are the atoms-of-confusion literature, which tests `V2 = V1 == 3 ? 2 : 1` against the equivalent `if`/`else`. 6.11–6.16 are nesting, structure and early returns. 6.17 is readability models and 6.18 is a local check. Cross-references: `cognitive-complexity.md` §2.1 (Sonar's white paper: ternaries are structural increments with nesting; early returns get no increment), §3 (Johnson et al. 2019, Ajami et al. 2017, Muñoz Barón et al., Peitek et al.), §4 (working memory); `length-limits.md` 4.61–4.65 (readability models, dos Santos and Gerosa); `func-style.md` 5.20 (Torres et al. on arrows).

### 6.1 Gopstein et al. (FSE 2017): the conditional operator is an atom of confusion, with a medium effect. VERIFIED (authors' copy and project site)

- **Citation:** Dan Gopstein, Jake Iannacone, Yu Yan, Lois DeLong, Yanyan Zhuang, Martin K.-C. Yeh, Justin Cappos, _Understanding misunderstandings in source code_, ESEC/FSE 2017, pp. 129–139, https://doi.org/10.1145/3106237.3106264 ; read: https://atomsofconfusion.com/papers/understanding-misunderstandings-fse-2017.pdf ; data page https://atomsofconfusion.com/data.html
- **Method:** "We recruited and tested 73 subjects, predominantly students" (at least 3 months of C/C++); each predicted the output of minimal C snippets in pairs, one with a candidate atom and one transformed to remove it, three pairs per atom. McNemar's test with a clustering correction; effect size φ.
- **What it says:**
  - The atom: "The conditional operator is the only ternary operator in C, and functions" "similarly to an if/else block." The paper's example is `V2 = (V1==3)?2:V2` against `if (V1 == 3) V2 = 2;`.
  - Table 2, conditional operator: dispersion 0.91 (atom) against 0.07 (clarified), Δ correct 0.23, φ = 0.36, p = 1.74e-05. It ranks 9th of the 15 accepted atoms by effect size.
  - The data page's contingency table for the conditional operator: 109 pairs both correct, 1 only the atom version correct, 34 only the `if` version correct, 1 neither (145 pairs).
  - Against Kernighan and Pike's advice (as quoted by the authors) that "the ?: operator is fine for short expressions" "where it can replace four lines of if-else with one": "In our data, which only includes 'short expressions'," "?: leads to 31% more errors than if-statements."
  - Neighbouring atoms: operator precedence (`0 && 1 || 2`) φ = 0.33, p = 5.90e-05; implicit predicate (`if (4 % 2)`) φ = 0.24, p = 4.27e-03; logic as control flow (`V1 && F2();` against `if (V1) F2();`) φ = 0.48, p = 5.62e-09.
- **Caveat:** C, mostly students, hand-evaluation of tiny snippets with names like `V1`; the paper takes φ = 0.1, 0.3 and 0.5 as small, medium and large. Kernighan and Pike's book was not opened; the quote is the authors'. The atoms were drawn from obfuscated-code contest entries.
- **For the post:** the origin of the claim that ternaries are confusing, as a measured result: in C, a short ternary cost about 23 percentage points of correct answers against the `if` version. The neighbouring atoms are the ones the rules' rewrites touch: `&&` used for control flow and unparenthesised precedence.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/gopstein/understanding-misunderstandings-fse-2017.layout.txt`, `scratchpad/nested-ternaries-lit/E/text/gopstein/understanding-misunderstandings-fse-2017.txt`, `scratchpad/nested-ternaries-lit/E/src/gopstein/aoc-data.html`

### 6.2 Inside Gopstein's data: the one nested ternary was no worse than the simple ones, but drew the most scattered answers. VERIFIED (authors' replication data at `dgopstein/atoms-of-confusion` commit `7aed29b`); counts are my reading of their CSVs

- **Citation:** Gopstein et al. (6.1), replication files `snippet_study/data/code.csv`, `unique_answers.csv` and `atoms.csv` at https://github.com/dgopstein/atoms-of-confusion/tree/7aed29b562fc8e9bfdab59800572555dea3a51d4/snippet_study/data ; snippet-study page https://atomsofconfusion.com/2016-snippet-study/
- **Method:** the three conditional-operator pairs are questions 49/50, 51/52 and 53/54 (`replace_Ternary_Operator`). Question 51 is a fully parenthesised nested ternary, `int V4 = (V1 == 2 ? (V3 == 2 ? 1 : 2) : (V2 == 2 ? 3 : 4));`, against question 52, the same logic as nested `if`/`else` blocks (`else { if (V2 == 2) ... }`). Questions 49 and 53 are single ternaries (`V2 = V1 == 3 ? 2 : 1;`, `V4 = V1 == 3 ? V2 : V3;`).
- **What it says (from `unique_answers.csv` and `atoms.csv`):**
  - q49, single ternary: 37 of 48 correct against 48 of 48 for the `if` version; 4 distinct answers against 1.
  - q51, nested ternary: 35 of 48 correct against 46 of 48 for the nested `if`; 8 distinct answers against 3.
  - q53, single ternary: 37 of 49 correct against 49 of 49; 6 distinct answers against 1.
  - Per-pair effect sizes in `atoms.csv`: 0.48, 0.44 and 0.49, so the nested pair had the smallest effect of the three.
  - The snippet-study page lists, among answers it had to normalise, "2butnestedternariesarepainincarnate" (the correct answer to q51 is 2, so this is very likely a q51 response).
- **Caveat:** 48 people per pair; one nested snippet, fully parenthesised and nested on both branches, not the chained `a ? b : c ? d : e` form most code uses. The per-question files sum to 109 and 143 correct; the website's aggregate table implies 110 and 143, a one-pair difference I couldn't resolve. The `if` version of q51 was harder than the simple `if`s (2 wrong), so part of the nesting cost lands on both forms.
- **For the post:** the only measured nested ternary in the atoms literature. It was misread by about a quarter of readers, like the simple ternaries, so the measured cost is the operator, not the nesting; what nesting added was more ways to be wrong. Say plainly that this is one snippet.
- **Text:** `scratchpad/nested-ternaries-lit/E/src/gopstein/aoc-repo-7aed29b562fc8e9bfdab59800572555dea3a51d4-code.csv`, `scratchpad/nested-ternaries-lit/E/src/gopstein/aoc-repo-7aed29b562fc8e9bfdab59800572555dea3a51d4-unique_answers.csv`, `scratchpad/nested-ternaries-lit/E/src/gopstein/aoc-repo-7aed29b562fc8e9bfdab59800572555dea3a51d4-atoms.csv`, `scratchpad/nested-ternaries-lit/E/src/gopstein/aoc-2016-snippet-study.html`

### 6.3 Gopstein, Fayard, Apel and Cappos (FSE 2020): thinking aloud, the ternary's confusion is about precedence, and right answers can hide it. VERIFIED (authors' copy)

- **Citation:** Dan Gopstein, Anne-Laure Fayard, Sven Apel, Justin Cappos, _Thinking aloud about confusing code: a qualitative investigation of program comprehension and atoms of confusion_, ESEC/FSE 2020, pp. 605–616, https://doi.org/10.1145/3368089.3409714 ; read: https://atomsofconfusion.com/papers/thinking-aloud-fse-2020.pdf
- **Method:** think-aloud sessions and interviews with 14 programmers (students and professionals) on the 2017 snippets.
- **What it says:** "correct hand-evaluations do not imply understanding," and incorrect ones don't imply misunderstanding. On snippet 49 (`int V2 = V1 == 3 ? 2 : 4;`), one subject was unsure whether it parses as `V1 == (3 ? 2 : 4)` or `(V1 == 3) ? 2 : 4`, and reasoned that a `==` "can only be there for the condition", a wrong rule that gave the right answer. The paper proposes a new atom candidate, "Logical Operator Outside of Condition".
- **Caveat:** qualitative, 14 people, C.
- **For the post:** the confusion around a ternary is often operator precedence in its condition, which parentheses or a named boolean fix without removing the ternary. It also says correctness counts underestimate confusion.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/gopstein/thinking-aloud-fse-2020.txt`, `scratchpad/nested-ternaries-lit/E/text/gopstein/thinking-aloud-fse-2020.layout.txt`

### 6.4 Langhout and Aniche (ICPC 2021): in Java, the conditional operator was not significantly confusing. VERIFIED (arXiv v2 full text; Crossref for the ICPC version)

- **Citation:** Chris Langhout, Maurício Aniche, _Atoms of Confusion in Java_, ICPC 2021, pp. 25–35, https://doi.org/10.1109/ICPC52881.2021.00012 ; read: https://arxiv.org/abs/2103.05424 (v2, 10 Mar 2021)
- **Method:** "132 computer science students (i.e., novice developers)" (96 complete, 58 of them first-years); 14 atoms ported to Java; part 1 predicted outputs, part 2 compared both versions side by side.
- **What it says:**
  - Table II, conditional operator: 23 correct and 6 wrong with the atom, 27 and 0 without; odds ratio 15.21, 95% CI 0.81–284.53, not significant. "Although 20% of the answers" "for the variants containing this atom were wrong, and only" "correct answers were given to the transformed variants, we" "do not have enough data to draw significant conclusions."
  - Table III: 20 of 33 (60.6%) found the atom version more confusing, 5 the clean one, 8 neither.
  - Participants attributed the confusion to "the lack of parenthesis around the condition," as in `V2 = (V1 == 3) ? 2 : 1;`. Those who preferred the ternary said it "reduces the verbosity of the code".
  - Infix operator precedence was not significant either (14/18 against 31/32, OR 8.86, CI 0.91–86.63); logic as control flow was (5/27 against 20/28, OR 11.00).
  - The authors open by noting that the ternary answer to a Stack Overflow question was voted "most readable", "in contrast" with Gopstein et al.
- **Caveat:** one small sample per atom (29 and 27 answers); first-year students; the ICPC text was not compared with arXiv v2. The paper says Medeiros et al. "decided not to investigate the effects of this atom" "given its popularity in real-world codebases."; that is not what Medeiros et al. did (6.8, and the Wrong or different list).
- **For the post:** the Java replication didn't confirm the C result for the ternary, and its participants pointed at the unparenthesised condition rather than the operator.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/langhout-aniche-arxiv-2103.05424.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/langhout-aniche-arxiv-2103.05424.layout.txt`, `scratchpad/nested-ternaries-lit/E/src/atoms/crossref-atoms-java.json`

### 6.5 Torres et al. (JSS 2023): in JavaScript, the conditional operator was not an atom in two experiments, and practitioners preferred it. VERIFIED (publisher version from the Utrecht University repository); cross-reference `func-style.md` 5.20 for the method

- **Citation:** Adriano Torres, Caio Oliveira, Márcio Okimoto, Diego Marcílio, Pedro Queiroga, Fernando Castor, Rodrigo Bonifácio, Edna Dias Canedo, Márcio Ribeiro, Eduardo Monteiro, _An Investigation of confusing code patterns in JavaScript_, JSS 203, 111731, Sept 2023, https://doi.org/10.1016/j.jss.2023.111731 ; read: https://dspace.library.uu.nl/handle/1874/431585
- **Method:** a mining study of 72 JavaScript projects, a repeated-measures experiment ("This study had 70 participants."), a Latin-square experiment ("the responses of 140 participants", so about 70 per version), and interviews with 15 professional JavaScript developers.
- **What it says:**
  - Mining: the conditional operator was found in 100% of the 72 projects at 10.16 occurrences per KLOC, second only to implicit predicate.
  - Experiment 1: 60 correct on the ternary against 62 on the `if` version (+3%); McNemar p = 0.7905 against a Bonferroni threshold of 0.0021; OR 1.30.
  - Experiment 2: 60 against 66 correct (+10%), chi-square p = 0.1590, OR 2.73 (CI 0.74–12.57); time to a correct answer 41.80 s against 39.34 s, p = 0.2407.
  - Interviews (Table 12): 60% preferred the ternary version, 26.67% the `if`, 13.3% neutral. "Only for the Conditional Operator" "atom candidate the participants preferred the obfuscated version,". Two interviewees: "I prefer to write [code using the left-hand side version], but I" "think [the right-hand side version] is easier to read, especially" "for newer programmers"; and "When I am programming, I write code with the conditional" "operator".
  - Logic as control flow (`&&` for control flow): not significant for correctness in either experiment (33 against 28; 41 against 48), but in experiment 2 correct answers took 108.94 s against 51.07 s, p < 0.0001.
- **Caveat:** single non-nested snippets (shown only as an image, Fig. 8); output prediction; experiment 1's participants had a median of one year of JavaScript. The logic-as-control-flow snippet is a statement, not a JSX value.
- **For the post:** the JavaScript evidence on the plain ternary is null, twice, and developers who write JavaScript for a living chose it. That leaves nesting (6.2) and precedence (6.3) as the parts with any support. The `&&` result is worth a sentence for the JSX rewrite: no more mistakes, but twice the time.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/torres-jss2023.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/torres-jss2023.layout.txt`

### 6.6 da Costa et al. (EMSE 2023): eye tracking Python's conditional expression, no time cost but more back-and-forth reading. VERIFIED (full text via Europe PMC)

- **Citation:** José Aldo Silva da Costa, Rohit Gheyi, Fernando Castor, Pablo Roberto Fernandes de Oliveira, Márcio Ribeiro, Baldoino Fonseca, _Seeing confusion through a new lens: on the impact of atoms of confusion on novices' code comprehension_, EMSE 28(4), article 81, 2023, https://doi.org/10.1007/s10664-023-10311-0 ; read: Europe PMC PMC10193347 (JATS XML)
- **Method:** "a controlled experiment with 32 novices in Python", Latin square, six atoms; the conditional expression is `a = b if b == c else d` against `if (b == c): a = b else: a = d`.
- **What it says (Table 2, medians):** time in the atom region 30.7 s against 32.1 s (p = 0.84), whole program 71.6 s against 62.7 s (p = 0.24); attempts 1.22 against 1.14 (p = 0.46); horizontal regressions in the atom region 14 against 8 (−42.8%, p = 0.01), the only significant difference; unsolved programs 7 against 2. The authors' reading: "The fact that the true condition comes before the condition being tested" "can make the subjects go back more times to observe it." Interview codes included "I was confused with if ternary".
- **Caveat:** Python puts the value before the condition (`x if c else y`), unlike JavaScript's `c ? x : y`, so the regressions may not transfer. Novices, one snippet per version, and many metrics each tested on its own.
- **For the post:** eye tracking found the ternary costs re-reading, not time, and the cause it names is Python-specific word order. Weak evidence for JavaScript either way.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/dacosta-emse-2023-PMC10193347.txt`, `scratchpad/nested-ternaries-lit/E/src/atoms/dacosta-emse-2023-PMC10193347.xml`

### 6.7 de Oliveira et al. (SBES 2020): atoms in aggregate cost time and gaze transitions but not accuracy. VERIFIED (metadata + abstract)

- **Citation:** Benedito de Oliveira, Márcio Ribeiro, José Aldo Silva da Costa, Rohit Gheyi, Guilherme Amaral, Rafael de Mello, Anderson Oliveira, Alessandro Garcia, Rodrigo Bonifácio, Baldoíno Fonseca, _Atoms of Confusion: The Eyes Do Not Lie_, SBES 2020, pp. 243–252, https://doi.org/10.1145/3422392.3422437 ; abstract from OpenAlex.
- **Method:** "a controlled experiment with 30 students and software practitioners", three tasks with atoms and three without.
- **What it says:** "an increase of 43.02% in time and 36.8% in gaze transitions" with atoms, and "For accuracy, no statistically significant difference was observed." The abstract names "Conditional Operators and Comma Operators" as examples of atoms.
- **Caveat:** results are aggregated; which three atoms were tested isn't in the abstract (Torres et al. describe it as three atoms in C). The ACM PDF wasn't fetched; the Zenodo record holds only a video.
- **For the post:** don't cite for the ternary specifically.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/openalex-oliveira-sbes2020.abstract.txt`

### 6.8 Medeiros et al. (EMSE 2019): C developers rarely see the conditional operator as harmful. VERIFIED (authors' preprint; Crossref)

- **Citation:** Flávio Medeiros, Gabriel Lima, Guilherme Amaral, Sven Apel, Christian Kästner, Márcio Ribeiro, Rohit Gheyi, _An investigation of misunderstanding code patterns in C open-source software projects_, EMSE 24(4), pp. 1693–1726, 2019, https://doi.org/10.1007/s10664-018-9666-x ; read: https://www.se.cs.uni-saarland.de/publications/docs/MLA+18emse.pdf
- **Method:** mining 50 C projects for 12 patterns, "a survey with 97 developers", and pull requests removing patterns (7.4).
- **What it says:** the conditional operator appeared in 98% of projects at 12.05 per KLOC ("commonly used"), almost 15K occurrences. In the survey, 8.25% of developers saw it as negative, the joint lowest of the 12 patterns, against 80.40% for operator precedence. "we did not find that the patterns" "conditional operator, assignment as value, pre-increment, and post-increment," "influence code understanding negatively based on the answers of developers."
- **Caveat:** perception, not performance; the preprint may differ from the published version.
- **For the post:** the contrast with 6.1 is the useful part: measured confusion and developers' own judgement disagree about the ternary, and the developers sided with it.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/medeiros-emse-2019-MLA+18emse.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/medeiros-emse-2019-MLA+18emse.layout.txt`

### 6.9 How common the conditional operator is: among the most frequent atoms in C, Java and JavaScript. VERIFIED (Gopstein et al. 2018 authors' copy; Mendes et al. 2022 authors' copy; Torres et al.)

- **Citations:** Dan Gopstein, Hongwei Henry Zhou, Phyllis Frankl, Justin Cappos, _Prevalence of confusing code in software projects: atoms of confusion in the wild_, MSR 2018, pp. 281–291, https://doi.org/10.1145/3196398.3196432 (read: https://atomsofconfusion.com/papers/atom-finder-msr-2018.pdf); Wendell Mendes, Oton Pinheiro, Emanuele Santos, Lincoln Rocha, Windson Viana, _Dazed and Confused: Studying the Prevalence of Atoms of Confusion in Long-Lived Java Libraries_, ICSME 2022, pp. 106–116, https://doi.org/10.1109/ICSME55016.2022.00018 (read: https://emanueles.github.io/papers/mendes_icsme_2022.pdf); Torres et al. (6.5).
- **What they say:**
  - C/C++, 14 projects including Linux and GCC: the conditional operator occurs at 0.00099 per AST node, fourth of 15 atoms after omitted curly braces (0.006), operator precedence (0.0041) and implicit predicate (0.0014).
  - Java, 27 libraries: "11, 404 ACs were found"; the conditional operator "was the third most frequent" "atom, with 2.874 occurrences" and was present in all 27 libraries; it tended to co-occur with logic as control flow.
  - JavaScript, 72 projects: 100% of projects, 10.16 per KLOC (6.5).
- **Caveat:** these count every ternary as an atom; none separates nested ternaries. Mendes et al.'s abstract calls it among "the most prevalent", meaning present everywhere; by count it is third.
- **For the post:** the ternary is everywhere, which is why its measured confusion matters and why a rule against nesting it will fire often.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/gopstein/atom-finder-msr-2018.layout.txt`, `scratchpad/nested-ternaries-lit/E/text/gopstein/atom-finder-msr-2018.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/mendes-icsme-2022.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/torres-jss2023.txt`

### 6.10 Atom studies that don't test the ternary, checked so the post doesn't cite them for it. VERIFIED (each opened)

- **Citations:** Yeh, Gopstein, Yan, Zhuang, _Detecting and comparing brain activity in short program comprehension using EEG_, FIE 2017, https://doi.org/10.1109/FIE.2017.8190486 ; Yeh, Yan, Zhuang, DeLong, _Identifying program confusion using electroencephalogram measurements_, Behaviour & Information Technology 41(12), pp. 2528–2545, online 5 Jun 2021, https://doi.org/10.1080/0144929X.2021.1933182 ; Bergum et al., _Fixation-related potentials reveal that confusing program code elicits a late frontal positivity_, arXiv:2412.10099v4 (4 May 2026; a search result points to a Scientific Reports version, DOI 10.1038/s41598-026-50946-9, whose download returned HTML, so it is not verified here); Bogachenkova et al. (7.5); Casalnuovo, Lee, Wang, Devanbu, Morgan, _Do Programmers Prefer Predictable Expressions in Code?_, Cognitive Science 44(12), 2020, https://doi.org/10.1111/cogs.12921 (read: NSF PAR 10539762); Andi Keraj, _Which Atoms Confuse Whom_, BSc thesis, Saarland University, Dec 2025.
- **What they say:**
  - Yeh et al. 2017: an EEG pilot "to record 8 subjects' brain activity"; no per-atom result for the conditional operator.
  - Yeh et al. 2021: 14 students and "only the six most confusing atoms", which don't include the conditional operator.
  - Bergum et al.: confusing code "elicits a late frontal positivity of about 400 to 700 ms", reported for atoms in aggregate.
  - Casalnuovo et al.: transformations "grouped roughly into 3 categories" (operand swaps, extraneous parentheses, identifier renaming); no conditional-expression forms.
  - Keraj's "conditional operators" category is boolean operators without parentheses ("Using multiple conditional operators in a statement while omitting parentheses"), not the ternary.
- **For the post:** none of these is evidence about the ternary; the EEG and FRP work supports only the general point that confusing code leaves a measurable brain signature.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/gopstein/program-comprehension-eeg-2017.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/yeh-bit-2021.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/bergum-arxiv-2412.10099.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/casalnuovo-cogsci-2020-nsfpar-10539762.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/keraj-ba-saarland.txt`

### 6.11 Ajami, Woodbridge and Feitelson (EMSE 2019): nested `if`s weren't harder than compound conditions, and flat code was only slightly easier. VERIFIED (authors' manuscript); cross-reference `cognitive-complexity.md` §3.6

- **Citation:** Shulamyt Ajami, Yonatan Woodbridge, Dror G. Feitelson, _Syntax, predicates, idioms — what really affects code complexity?_, EMSE 24(1), pp. 287–328, 2019, https://doi.org/10.1007/s10664-018-9628-3 ; read: https://www.cse.huji.ac.il/~feit/papers/Complexity19EmpSE.pdf (extends ICPC 2017).
- **Method:** a game-like platform measuring time and errors for "220 professional programmers" (the ICPC version says 222) on equivalent snippets: a compound condition against nested `if`s, and flat, comb-like and balanced-tree nesting.
- **What it says:** compound expression against nested structure: "practically all the comparisons were not statistically significant," though the nested form "took slightly less time on average, but led to slightly more errors." "This contradicts" "common wisdom regarding LOC and nesting as indicators of complexity." Flat against nested: "flat structures appear to be slightly" easier; the difference was significant or nearly so only against the balanced-tree version ("similar to a full binary tree"). Subjects said in debriefings that the nested ifs felt easier.
- **Caveat:** range-checking snippets; `if` statements, not ternaries.
- **For the post:** the balanced binary tree is the shape of `a ? (b ? 1 : 2) : (c ? 3 : 4)`, and it was the one nesting shape that cost something. The comb-like nesting that a chained `a ? x : b ? y : z` resembles was not significantly different from flat after correction. That fits a rule that targets nesting, but it is about shape, not about the operator.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/style/ajami-emse-2019.txt`, `scratchpad/nested-ternaries-lit/E/text/style/ajami-emse-2019.layout.txt`

### 6.12 Johnson et al. (ICSME 2019) on minimising nesting: cross-reference, with one detail from the thesis behind it. VERIFIED (Lubo's thesis); cross-reference `cognitive-complexity.md` §3.6

- **Citation:** John Johnson, Sergio Lubo, Nishitha Yedla, Jairo Aponte, Bonita Sharif, ICSME 2019, https://doi.org/10.1109/ICSME.2019.00085 (not reopened); Sergio Luis Lubo Argumedo, _Influencia del uso de recomendaciones de legibilidad en la facilidad de comprensión de software: Un estudio experimental_, MSc thesis, Universidad Nacional de Colombia, 2019.
- **What it says:** the thesis's English abstract: "minimizing nesting decreases the time a developer spends reading" and understanding code (275 participants, 32 Java methods). One of the minimise-nesting tasks is a grade lookup: "Given a mark which is an integer between 0 and 100," "the method must return a letter."
- **Caveat:** the snippets are images in the thesis, so I couldn't read whether the low-nesting version is an else-if chain or early returns.
- **For the post:** the strongest direct evidence that less nesting reads faster, on exactly the task people write nested ternaries for; it doesn't say which flat form wins.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/style/unal-thesis-nesting.txt`

### 6.13 Green (1977): nested conditionals do best when each branch restates its condition, and the cost shows up working backwards. VERIFIED (metadata + abstract)

- **Citation:** T. R. G. Green, _Conditional program statements and their comprehensibility to professional programmers_, Journal of Occupational Psychology 50(2), pp. 93–109, 1977, https://doi.org/10.1111/j.2044-8325.1977.tb00363.x ; abstract from OpenAlex.
- **What it says:** two forms, "the nesting if … then … else … form and the goto form", plus "nesting with redundancy" from Sime, Green and Guest. Two comprehension processes: "tracing through a program like a computer," and "finding how a particular point in a program might be reached." "Much larger differences between the three styles" appeared in the second, "favouring nesting with redundancy".
- **Caveat:** abstract only; 1970s notations, small programs.
- **For the post:** history worth one line: nesting has been tested since the 1970s, and the cost is in working out when a given branch runs. In a nested ternary, the conditions that lead to an inner branch are spread across the outer ones.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/style/openalex-green1977.abstract.txt`

### 6.14 Wiese, Rafferty and Fox (ICSE-SEET 2019): students prefer `&&` to nested `if`s, but understand both equally. VERIFIED (authors' copy)

- **Citation:** Eliane S. Wiese, Anna N. Rafferty, Armando Fox, _Linking Code Readability, Structure, and Comprehension Among Novices: It's Complicated_, ICSE-SEET 2019, pp. 84–94, https://doi.org/10.1109/ICSE-SEET.2019.00017 ; read: https://acelab.berkeley.edu/wp-content/papercite-data/pdf/autostyle-readability-comprehension-icse2019.pdf
- **Method:** "231 novices judged style and readability" for seven topics, with comprehension questions on each version.
- **What it says (Table I):** nested `if`s against `&&`: 90% picked `&&` as most readable, comprehension 75% against 77%. Returning a condition directly instead of `if … return true; else return false`: only 39% picked the direct return as most readable, comprehension 91% against 93%. On an `else if` after a branch that returns, instructors split: "four instructors indicating that else if was not necessary" "if the preceding if statement included a return, and one indicating that it" was.
- **Caveat:** Java, students, preferences more than performance.
- **For the post:** readability preference and comprehension often diverge; and even instructors disagreed on the `no-else-return` question.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/style/wiese-icse-seet-2019.txt`, `scratchpad/nested-ternaries-lit/E/text/style/wiese-icse-seet-2019.layout.txt`

### 6.15 Baron, Granot, Yosef and Feitelson (EASE 2024): negations slow readers down, with exceptions. VERIFIED (authors' copy)

- **Citation:** Aviad Baron, Ilai Granot, Ron Yosef, Dror G. Feitelson, _Understanding Logical Expressions with Negations: Its Complicated_, EASE 2024, pp. 303–312, https://doi.org/10.1145/3661167.3661180 ; read: https://www.cse.huji.ac.il/~feit/papers/Negation24EASE.pdf
- **What it says:** "an experiment with 205 professional developers"; "expressions with more negations take more time, and double negations are especially troublesome," but "there are many confounding interactions between the factors".
- **For the post:** context for `no-negated-condition`, which flips `!a ? x : y`: the direction is supported, the size isn't simple.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/style/feitelson-negation-ease2024.txt`

### 6.16 Early returns and guard clauses: no controlled study found; the case for and against is in catalogs and coding standards. ANECDOTAL (Fowler's catalog; Lockheed Martin's standard); cross-reference `cognitive-complexity.md` §2.1

- **Citations:** Martin Fowler, _Replace Nested Conditional with Guard Clauses_, refactoring catalog, https://refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html (retrieved 11 Nov 2026); Lockheed Martin, _Joint Strike Fighter Air Vehicle C++ Coding Standards_, Doc. 2RDU00001 Rev C, December 2005, https://www.stroustrup.com/JSF-AV-rules.pdf
- **What they say:**
  - Fowler's catalog entry shows only code: a `getPayAmount()` built as nested `if`/`else` assigning `result` becomes four lines, `if (isDead) return deadAmount();` through `return normalPayAmount();`.
  - JSF AV Rule 113 (MISRA Rule 82, revised): "Functions will have a single exit point." "Numerous exit points tend to produce functions that are both difficult to" "understand and analyze." The exception: "A single exit is not required if such a structure would obscure" "or otherwise" "significantly complicate (such as the introduction of additional variables)" the control logic.
  - Sonar's white paper gives early returns no increment, on the grounds that they often make code clearer (quoted in `cognitive-complexity.md` §2.1; not reopened here).
- **Caveat:** searches of OpenAlex, Crossref and the web found no experiment comparing early returns or guard clauses with nested `if`s or single-exit code (Semantic Scholar was rate-limited). Johnson et al. (6.12) is the nearest, and it doesn't say which flat form it used.
- **For the post:** Hayden's "short circuit" argument is the standard refactoring advice, and the opposing single-exit rule comes from safety-critical C and C++ and still carves out exactly that case. Say the evidence is expert opinion on both sides. Fowler's example also uses braceless one-line `if`s, the form `curly` rejects.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/guard/refactoring-com-replaceNestedConditionalWithGuardClauses.txt`, `scratchpad/nested-ternaries-lit/E/src/guard/refactoring-com-replaceNestedConditionalWithGuardClauses.html`, `scratchpad/nested-ternaries-lit/E/text/guard/JSF-AV-rules.txt`

### 6.17 Readability models have no ternary feature and no nesting-depth feature. VERIFIED (author copies); cross-reference `length-limits.md` 4.61–4.63

- **Citations:** Raymond P. L. Buse, Westley R. Weimer, _Learning a Metric for Code Readability_, IEEE TSE 36(4), pp. 546–558, 2010, https://doi.org/10.1109/TSE.2009.70 (read: https://web.eecs.umich.edu/~weimerw//p/weimer-tse2010-readability-preprint.pdf); Jonathan Dorn, _A General Software Readability Model_, University of Virginia, 2012 (read: https://web.eecs.umich.edu/~weimerw/students/dorn-mcs-paper.pdf); Simone Scalabrino, Mario Linares-Vásquez, Rocco Oliveto, Denys Poshyvanyk, _A comprehensive model for code readability_, JSEP 30(6), 2018, https://doi.org/10.1002/smr.1958 (read: https://www.cs.wm.edu/~denys/pubs/JSEP'18-ReadabilityPaper.pdf) and ICPC 2016, https://doi.org/10.1109/ICPC.2016.7503707 ; Aisha Batool et al., _Effect or Program Constructs on Code Readability and Predicting Code Readability Using Statistical Modeling_, Foundations of Computing and Decision Sciences, 2021, https://doi.org/10.2478/fcds-2021-0009 (Ulster repository copy).
- **What they say:**
  - Buse and Weimer's 25 features (Fig. 6) include "# branches (if)", "# loops (for, while)", "# comparison operators" and "indentation (preceding whitespace)", average and maximum; nothing for the conditional operator or nesting depth. Predictive power: "neither are if constructs, loops, or comparison operators." They left out features like "the number of simple statements within an if block" "to help ensure that we were capturing readability rather" than complexity.
  - Posnett et al., as summarised by Scalabrino et al.: "lines of code, entropy, and Halstead's Volume metric."
  - Dorn models indentation as a signal; code "more consistent in the size of nested blocks" may read more easily. Scalabrino et al.'s ReliefF ranking (Table VII) lists a Dorn feature "#conditionals (DFT)" third on their new dataset (weight 0.04), though their table of Dorn's features doesn't define it.
  - Scalabrino et al. add textual features (comment readability, textual coherence, number of concepts); none concerns conditionals.
  - Batool et al.'s constructs include "If-else" and "Nested If"; no ternary.
- **Caveat:** whether Buse and Weimer's `if` count includes `?:` isn't stated. These models predict ratings of small snippets.
- **For the post:** the readability models can't say anything about ternaries, and the best-known one found `if` counts unimportant. Readability models are not evidence for or against the rule.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/readability/buse-weimer-tse2010-preprint.layout.txt`, `scratchpad/nested-ternaries-lit/E/text/readability/buse-weimer-tse2010-preprint.txt`, `scratchpad/nested-ternaries-lit/E/text/readability/dorn-2012-mcs-paper.txt`, `scratchpad/nested-ternaries-lit/E/text/readability/scalabrino-jsep2018.layout.txt`, `scratchpad/nested-ternaries-lit/E/text/readability/scalabrino-jsep2018.txt`, `scratchpad/nested-ternaries-lit/E/text/readability/batool-fcds2021.txt`

### 6.18 Cognitive complexity rates Gopstein's nested ternary as simpler than the `if` version readers understood better. My check (local run)

- **Method:** Gopstein's q51/q52 ported to JavaScript, plus three rewrites (an else-if chain, an early return with two ternaries, flat guard clauses), linted with ESLint 10.14.0 (`sonarjs/cognitive-complexity` at 0 from eslint-plugin-sonarjs 4.2.2, `complexity` at 0, `max-depth` at 0, `no-nested-ternary`, `no-lonely-if`) and Biome 2.6.4 (`noExcessiveCognitiveComplexity` at 1, `noNestedTernary`), on 11 Nov 2026. Folder: `scratchpad/nested-ternaries-lit/E/check/cogcx/`.
- **What it found:**
  - Cognitive complexity (SonarJS / Biome): nested ternary 5 / 5 ("Excessive complexity of 5 detected (max: 1)."); nested `if` with `else if` 6 / 6; the study's literal `else { if … }` 8 / 7; early return with ternaries 4 / 4; flat guard clauses 4 / 4.
  - Cyclomatic `complexity` was 4 for every form except the guards (5).
  - `max-depth` reported the `if` versions and nothing in the ternary version: it counts blocks, not expressions.
  - `no-lonely-if` reported the literal `else { if … }` version.
- **Caveat:** one snippet pair; scores, not comprehension. SonarJS and Biome disagree by one on the `else { if }` form.
- **For the post:** a neat illustration that the metrics don't encode the atoms result: in the study the nested ternary was misread far more (35 of 48 against 46 of 48), yet cognitive complexity scores it lower than the `if` version, and depth limits don't see it at all. The early-return and guard-clause forms score lowest.
- **Text:** `scratchpad/nested-ternaries-lit/E/check/cogcx/eslint-output.txt`, `scratchpad/nested-ternaries-lit/E/check/cogcx/biome-output.txt`, `scratchpad/nested-ternaries-lit/E/check/cogcx/gopstein-q51-q52.js`

## 7. Modification and bugs

7.1–7.11 are the research: bug-fix and code-review studies that touch the conditional operator, bug-pattern catalogs, smells, and what no study measures. 7.12–7.31 are bugs and precedence in practice: the grammar behind the pitfalls, local runs of each pitfall and which tools catch it, real bugs in public projects, and autofix bugs around ternaries in the lint tools. Local runs used the worktree's binaries (Oxlint 1.90.0 with oxlint-tsgolint 7.0.2005, ESLint 10.14.0 with `@eslint/js` 10.0.1, typescript-eslint 8.72.1, eslint-plugin-unicorn 79.0.0, Biome 2.6.4, Prettier 3.9.10, Oxfmt 0.75.0, TypeScript 6.0.3) on Node 24.14.1, Bun 1.4.4 and PHP 8.5.12 (Homebrew, already installed). Every check folder holds its inputs, configs and saved output. GitHub material was read with `gh` read-only; email addresses in saved commit JSON and the kernel mail were removed before saving. The current spec is the ECMA-262 draft's expressions chapter, `last-modified` 12 Nov 2026 00:38:34 GMT.

### 7.1 Gopstein et al. (MSR 2018): in GCC, bug fixes remove conditional operators 1.37 times as often as other commits. VERIFIED (authors' copy)

- **Citation:** Gopstein, Zhou, Frankl, Cappos (6.9), https://doi.org/10.1145/3196398.3196432
- **Method:** atom detection across 14 C/C++ projects; for GCC, the rate at which each atom is removed in bug-fix and other commits.
- **What it says:** across all atoms the rate was 1.25 times (p < 1e−10). Per atom (Fig. 5), the conditional operator was 1.37 times, p < 0.0001, third after literal encoding (2.05, not significant) and logic as control flow (1.59); operator precedence was 1.35. A Bonferroni α of 0.0033 left 5 atoms significantly more often removed in bug fixes, and 2 in other commits. The FreeBSD example: a commit message said "Bitwise OR has higher precedence than ternary" conditional, for code `V_ULPTX_CMD(ULP_TX_MEM_WRITE) | is_t4(sc) ? F_ULP_MEMIO_ORDER : F_T5_ULP_MEMIO_IMM`, and the author "replaced the conditional operator with a full if-statement." rather than adding parentheses, which "removes two atoms at once to resolve the issue."
- **Caveat:** removal in a bug-fix commit is a proxy for causing a bug; one project; the paper also notes bug-fix commits differ from others in general. Text extraction lost the "fi" ligature, so quotes avoid those words.
- **For the post:** the best support for a link between ternaries and bugs: correlational, from C, and the cited example is a precedence bug around a ternary, fixed by the rule's own rewrite.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/gopstein/atom-finder-msr-2018.txt`, `scratchpad/nested-ternaries-lit/E/text/gopstein/atom-finder-msr-2018.layout.txt`

### 7.2 Shi, Kazemi, Godfrey and McIntosh (ESEM 2024): in Java, ternaries change in bug fixes because fixes add null checks, not because they confuse. VERIFIED (authors' copy)

- **Citation:** Guoshuai Shi, Farshad Kazemi, Michael W. Godfrey, Shane McIntosh, _Reevaluating the Defect Proneness of Atoms of Confusion in Java Systems_, ESEM 2024, pp. 154–164, https://doi.org/10.1145/3674805.3686677 ; read: https://rebels.cs.uwaterloo.ca/papers/esem2024_shi.pdf
- **Method:** "We mine 76,610 pull requests from six Java open-source projects", comparing atom additions and removals in bug-fixing and other PRs, then reading samples.
- **What it says:** "we find no relation between the existence of AoCs" "and defect-fixing activity." The conditional operator "is added and removed" "significantly more in BFPRs" in three of six projects (openHAB add-ons, Elasticsearch, Kafka), but in 30 sampled bug-fix PRs with 62 conditional-operator atoms, 37 had null checks in their conditions, and "the removal and addition of these AoCs are not due to their confusing nature," "but rather their utility for defect-fixing and testing." The rest were "neither added nor removed because they are confusing."
- **Caveat:** Java; six projects; manual reading of samples. It doesn't separate nested ternaries.
- **For the post:** the direct counterweight to 7.1. A ternary is also the shortest way to add a null check in a fix, so finding ternaries in bug fixes doesn't show that they cause bugs.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/shi-esem-2024.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/shi-esem-2024.layout.txt`

### 7.3 Sobreira et al. (SANER 2018): Defects4J fixes wrap code in ternaries, and the taxonomy counts them as if-else. VERIFIED (arXiv v3)

- **Citation:** Victor Sobreira, Thomas Durieux, Fernanda Madeiral, Martin Monperrus, Marcelo de Almeida Maia, _Dissection of a bug dataset: Anatomy of 395 patches from Defects4J_, SANER 2018, pp. 130–140, https://doi.org/10.1109/SANER.2018.8330203 ; read: https://arxiv.org/abs/1801.06393
- **What it says:** conditionals include "if-else (including compact form cond?a:b, i.e. if-else-expression)". The most common pattern, conditional blocks, is in 43% of patches. The Wraps-with if-else variant can be "an if-else expression of type cond?a:b", as in Mockito-29, where `wanted.toString()` became `wanted == null ? "null" : wanted.toString()`.
- **Caveat:** Java; ternaries aren't counted separately, so no rate is available.
- **For the post:** with 7.2: in real fixes, adding a ternary is a normal, small repair.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/bugs/sobreira-saner2018-arxiv-1801.06393.txt`

### 7.4 Medeiros et al. (EMSE 2019): maintainers accepted 2 and rejected 2 pull requests that replaced a ternary. VERIFIED (authors' preprint)

- **Citation:** Medeiros et al. (6.8).
- **What it says:** the authors' pull requests removing patterns: 8 of 21 with feedback were accepted, including "2 pull requests to remove conditional operator". Rejections (Table 5): Dmd, "Chaining ternary expressions is a common pattern in some code bases."; Ossec Hids, "Both versions seem easy enough to read." In most rejections, developers said the original was readable or common.
- **Caveat:** tiny numbers; outsiders' style-only PRs, which some projects discourage.
- **For the post:** the only record found of maintainers deciding on a ternary-to-`if` rewrite, and it split evenly.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/medeiros-emse-2019-MLA+18emse.txt`, `scratchpad/nested-ternaries-lit/E/text/atoms/medeiros-emse-2019-MLA+18emse.layout.txt`

### 7.5 Bogachenkova et al. (ICSME 2022): atoms don't predict confusion in code review, and pull requests rarely remove them. VERIFIED (authors' copy)

- **Citation:** Victoria Bogachenkova, Linh Nguyen, Felipe Ebert, Alexander Serebrenik, Fernando Castor, _Evaluating Atoms of Confusion in the Context of Code Reviews_, ICSME 2022, pp. 404–408, https://doi.org/10.1109/ICSME55016.2022.00048 ; read: https://felipeebert.github.io/publication/bogachenkova-icsme-2022/bogachenkova-icsme-2022.pdf
- **Method:** "we randomly sample 368 PRs" from openhab-addons, labelling inline review comments for confusion; atom evolution across all closed PRs of two Java repositories.
- **What it says:** no relationship between atoms and confusion comments ("The Chisquared test resulted in a p-value of 0.498" in the extracted text; Fisher 0.532); "atoms of confusion are mostly not being removed" in pull requests.
- **Caveat:** emerging-results paper; all atoms pooled, no conditional-operator split.
- **For the post:** reviewers don't flag atoms as confusing in practice, which weakens the step from lab confusion to review cost.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/atoms/bogachenkova-icsme-2022.txt`

### 7.6 Dantas, Rocha and Maia (ICSME 2023): developers' own readability pull requests reduce nested `if`s, but none in the catalog is about ternaries. VERIFIED (arXiv full text)

- **Citation:** Carlos Eduardo C. Dantas, Adriano M. Rocha, Marcelo A. Maia, _How do Developers Improve Code Readability? An Empirical Study of Pull Requests_, ICSME 2023, pp. 110–122, https://doi.org/10.1109/ICSME58846.2023.00022 ; read: https://arxiv.org/abs/2309.02594
- **What it says:** "370 code readability improvements from 284 Merged" PRs in 109 Java repositories; "Reduce Nested If-else Depth (8 out of 45 samples)" of the if/else category, with one PR taking depth from 3 to 1 ("More readable validation conditionals."); "Convert Negative Conditions into Positive Ones" 10 of 45. "SonarQube only detected 26 out of the 370" improvements. No category mentions the conditional operator.
- **Caveat:** Java; only PRs that mention readability.
- **For the post:** flattening nested conditionals is something developers do on their own for readability, in small numbers; ternary rewrites don't show up at all.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/review/dantas-icsme2023-arxiv-2309.02594.txt`

### 7.7 Pan, Kim and Whitehead (EMSE 2009): 27 bug-fix patterns, none for the conditional expression, and condition fixes add clauses. VERIFIED (published version, author copy)

- **Citation:** Kai Pan, Sunghun Kim, E. James Whitehead Jr., _Toward an understanding of bug fix patterns_, EMSE 14(3), pp. 286–315, 2009, https://doi.org/10.1007/s10664-008-9077-5 ; read: https://people.csail.mit.edu/hunkim/images/f/f5/Papers_pan2008esme.pdf
- **What it says:** seven Java projects; the patterns cover 45.7% to 63.3% of bug-fix hunks; the most common include IF-CC ("change in if conditional", 5.6–18.6% of fixes). There is no pattern for `?:`; a changed ternary on the right of an assignment would fall under AS-CE (change of assignment expression). On IF-CC: "an important factor in the production of if condition bugs is" "missing logic in the conditions", and fixes "commonly increase the complexity of the conditional".
- **Caveat:** 2009, Java; Campos and Maia (ESEM 2017) re-measured Pan's top five patterns at scale and were not opened.
- **For the post:** conditions get fixed by adding cases. A two-way ternary that needs a third case becomes a nested ternary; an `if` chain or early return grows a line. That is an inference about modification, not a measurement.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/bugs/pan-kim-whitehead-emse2009-author.txt`

### 7.8 Karampatsis and Sutton (MSR 2020): none of the 16 single-statement bug templates involves the ternary. VERIFIED (arXiv v2)

- **Citation:** Rafael-Michael Karampatsis, Charles Sutton, _How Often Do Single-Statement Bugs Occur? The ManySStuBs4J Dataset_, MSR 2020, pp. 573–577, https://doi.org/10.1145/3379597.3387491 ; read: https://arxiv.org/abs/1905.13334
- **What it says:** "153,652 single statement bugfix changes mined from 1,000 popular open-source Java projects"; "about 33% of the simple bug fixes match the templates". The operator templates are Change Binary Operator, Change Unary Operator ("developers often forget the ! operator") and Change Operand; More/Less Specific If cover only `if` conditions.
- **For the post:** the largest single-statement bug dataset has no category for ternaries, so there's no rate to cite.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/bugs/karampatsis-sutton-arxiv-1905.13334.txt`

### 7.9 JavaScript smell studies: the nesting-depth smell doesn't count ternaries, and its fault risk is inconsistent. VERIFIED (Saboury's thesis; replication preprint)

- **Citations:** Amir Saboury, _On the Fault-Proneness of Javascript Code Smells_ (MSc thesis, Polytechnique Montréal, 2016, https://publications.polymtl.ca/2445/), the basis of Saboury, Musavi, Khomh, Antoniol, _An empirical study of code smells in JavaScript projects_, SANER 2017, pp. 294–305, https://doi.org/10.1109/SANER.2017.7884630 ; Kevin Pacifico et al., _Déjà Vu: A Replication Study on Code Smells and Faults in JavaScript Projects_, 2026 preprint, https://fpalomba.github.io/pdf/Conferencs/C106.pdf
- **What they say:**
  - Saboury: the Depth smell counts nested "function, If, Switch, Try, Do While, While," "With, For, For in and For of." No conditional expressions.
  - Cox hazard ratios for Depth: 7.786 in bower, 0.172 in request.
  - Overall, "files without code smells have hazard rates 65% lower".
  - Pacifico et al. (50 projects): Depth was rare (6,333 occurrences), with "lower associated risk levels" (16.25%) than other smells.
- **Caveat:** the replication preprint has placeholder venue details; the SANER paper itself wasn't opened.
- **For the post:** JavaScript nesting metrics, like `max-depth`, are blind to ternaries (6.18), and the depth evidence is mixed even for blocks.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/smells/saboury-2016-thesis.txt`, `scratchpad/nested-ternaries-lit/E/text/smells/saboury-2016-thesis.layout.txt`, `scratchpad/nested-ternaries-lit/E/text/smells/palomba-C106.txt`

### 7.10 Python's "Long Ternary Conditional Expression" smell co-occurs with bug fixes in deep-learning code. VERIFIED (Jebnoun et al., authors' copy); Chen et al. UNVERIFIED (metadata only)

- **Citations:** Hadhemi Jebnoun, Houssem Ben Braiek, Mohammad Masudur Rahman, Foutse Khomh, _The Scent of Deep Learning Code: An Empirical Study_, MSR 2020, pp. 420–430, https://doi.org/10.1145/3379597.3387479 (read: https://web.cs.dal.ca/~masud/papers/hadhemi-MSR2020.pdf); Zhifei Chen et al., _Understanding metric-based detectable smells in Python software: A comparative study_, IST 94, pp. 14–29, https://doi.org/10.1016/j.infsof.2017.09.011 (closed; OpenAlex and Semantic Scholar have no abstract).
- **What it says:** LTCE is "A ternary" "conditional expression that is extremely long." In 59 deep-learning projects, "at least 40% of the smelly, buggy files contain LTCE, CCC , LM," or LPL, and LTCE is among the smells "more associated with the software bugs".
- **Caveat:** long, not nested; file-level overlap with bug-fix changes, not causation; Python and deep-learning code. Chen et al.'s per-smell change- and fault-proneness results couldn't be read.
- **For the post:** the one smell catalog with a ternary smell measures length, not nesting; at most a footnote.
- **Text:** `scratchpad/nested-ternaries-lit/E/text/smells/jebnoun-msr2020.txt`, `scratchpad/nested-ternaries-lit/E/text/smells/openalex-chen-ist2018.abstract.txt`

### 7.11 No study measures how hard nested ternaries are to modify. (no source; a summary of 7.1–7.10)

- **What exists:** comprehension of tiny snippets (6.1–6.6), developers' judgements (6.5, 6.8, 6.14), bug-fix correlations that cut both ways (7.1–7.3), and a split of maintainers' decisions on four rewrites (7.4).
- **What doesn't:** no experiment asks people to change a nested ternary against an `if` chain or early return; no bug taxonomy separates ternaries (7.3, 7.7, 7.8); no change-proneness study counts nested ternaries (7.9, 7.10). Searches: OpenAlex and Crossref for `early return`, `guard clauses`, `single exit`, `ternary operator readability`, and `conditional operator` with `comprehension`; web searches for controlled experiments on ternaries and early returns.
- **For the post:** "hard to easily modify vs simple if statements" is Hayden's experience and a reasonable inference (7.7), not a measured result. Say so.

### 7.12 The grammar behind every pitfall: a ternary's test is a short-circuit expression, its arms are assignment expressions, and `??` can't share an operand with `||` or `&&`. VERIFIED (ECMA-262 draft); My check (local run)

- **Citation:** ECMA-262 draft, §13.13 Binary Logical Operators and §13.14 Conditional Operator, https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html (served 11 Nov 2026).
- **What it says:**
  - `ConditionalExpression : ShortCircuitExpression ? AssignmentExpression : AssignmentExpression`, and `ShortCircuitExpression : LogicalORExpression | CoalesceExpression`. So everything that binds tighter than `?:` (`+`, `===`, `&&`, `||`, `??`) ends up in the test unless parenthesised, and each arm runs to the end of an assignment expression.
  - `CoalesceExpressionHead : CoalesceExpression | BitwiseORExpression`, and the right operand of `??` is a `BitwiseORExpression`. Neither operand of `??` can be an unparenthesised `||` or `&&` expression, so `a ?? b || c` has no parse. `a ?? b ? c : d` is legal and is `(a ?? b) ? c : d`.
  - The note on the conditional: "The grammar for a ConditionalExpression in ECMAScript is slightly different" "from that in C and Java,". The reason: "to allow an assignment expression to be governed by either arm of a conditional" and to "eliminate the confusing and fairly useless case of a comma expression" "as the centre expression."
- **My check (11 Nov 2026, `F/check/precedence/`):** in Node 24.14.1, `a ?? b || c`, `a || b ?? c` and `a ?? b && c` throw `SyntaxError` at parse time; `a ?? b ? c : d`, `a ? b : c ?? d` and `a ? b ?? c : d` parse. Bun 1.4.4 gives the reason in its message: "Coalescing and logical operators used together in the same expression;" "parentheses must be used to disambiguate."
- **Caveat:** the grammar and its history are in section 1; this entry only records what the practice entries below rely on.
- **For the post:** the language already forbids one precedence trap (`??` with `||`), but not the ones next to it. `a ?? b ? c : d` parses fine and means something many readers don't expect.
- **Text:** `scratchpad/nested-ternaries-lit/F/text/ecma262-expressions.txt`, `scratchpad/nested-ternaries-lit/F/src/ecma262/ecmascript-language-expressions.html`, `scratchpad/nested-ternaries-lit/F/check/precedence/node-run-syntax.txt`, `scratchpad/nested-ternaries-lit/F/check/precedence/bun-run-syntax.txt`

### 7.13 Five ways a ternary's precedence surprises, run in Node. My check (local run)

- **Method:** `F/check/precedence/run-precedence.mjs`, Node 24.14.1, 11 Nov 2026. Each line runs the written form and, where it matters, the parenthesised form the author probably meant.
- **What it found:**
  - **String concatenation.** `"Hello, " + user ? user.name : "guest"` with `user = null` throws `TypeError: Cannot read properties of null (reading 'name')`: the test is the always-truthy string `"Hello, null"`. Parenthesised, it returns `"Hello, guest"`. `"Found " + n === 1 ? ...` always takes the false arm, since a string never equals `1`.
  - **Arithmetic.** `10 + isLarge ? 20 : 0` with `isLarge = false` gives `20` (the test is `10`); `10 + (isLarge ? 20 : 0)` gives `10`.
  - **`&&` in the test.** `loggedIn && admin ? "admin" : "user"` with `loggedIn = false` gives `"user"`, while `loggedIn && (admin ? ... )` gives `false`. In JSX that is the difference between rendering a fallback and rendering nothing.
  - **`??` in the test.** `value ?? 1 ? "truthy" : "falsy"` with `value = 0` gives `"falsy"`; `value ?? (1 ? ...)` gives `0`. In an arm, `false ? "b" : c ?? "d"` groups as `c ?? "d"`, which is what most readers expect.
  - **Template literals and arms.** Inside `${}` a ternary is self-contained, so `` `${count} item${count === 1 ? "" : "s"}` `` is safe, and a nested ternary inside `${}` follows the usual right-associative grouping. An assignment in either arm is legal (`flag ? x = 1 : y = 2` assigns `y`), and an arrow can be an arm: `cond ? a : b => b * 2` is `cond ? a : (b => b * 2)`.
- **Caveat:** hand-written cases, not a corpus measurement.
- **For the post:** the realistic precedence bugs are not about nesting. They come from a binary operator sitting in front of `?`, which a nested-ternary rule never sees.
- **Text:** `scratchpad/nested-ternaries-lit/F/check/precedence/node-run-precedence.txt`, `scratchpad/nested-ternaries-lit/F/check/precedence/run-precedence.mjs`

### 7.14 Which tools catch those cases: TypeScript catches three, typed lint rules two more, and no Ultracite preset has a rule aimed at them. My check (local run)

- **Method:** the same cases as lint input (`F/check/lint/cases.js` and a typed `cases.ts`), 11 Nov 2026. ESLint 10.14.0 with `no-mixed-operators` (default, and with custom groups), `no-constant-condition` and `no-constant-binary-expression`; typescript-eslint 8.72.1 type-aware rules; `tsc` 6.0.3 with `strict`; Oxlint 1.90.0 with `-D all` and with Ultracite's core preset (also with `--type-aware`); Biome 2.6.4 with Ultracite's core preset.
- **What it found:**

| Case | `tsc` (strict) | typescript-eslint | ESLint `no-mixed-operators` default | with `?:` in groups | Oxlint core | Biome core |
| --- | --- | --- | --- | --- | --- | --- |
| `"Hello, " + user ? user.name : ...` | TS18047 (`user` possibly null) | `restrict-plus-operands`, `no-base-to-string` | no | yes | `prefer-template` only | `useTemplate` only |
| `"Found " + n === 1 ? ...` | TS2367 (no overlap) | no | no | yes (comparison group) | `prefer-template` only | `useTemplate` only |
| `10 + isLarge ? 20 : 0` | TS2365 (`+` on boolean) | `strict-boolean-expressions` (an `any` test, from the type error) | no | yes | no | no |
| `loggedIn && admin ? ...` | no | no | no | yes (logical group) | no | no |
| `value ?? 1 ? ...` | no | no | no | yes (`??` group) | no | no |

- With `--type-aware`, Oxlint's core preset reported the same typed rules as typescript-eslint on rows 1 and 3 (`restrict-plus-operands`, `no-base-to-string`, `strict-boolean-expressions`).
- The default `no-mixed-operators` reported nothing: its default groups don't include `?:` or `??` (7.17). With `?:` added to the comparison group it also reported the harmless `` `${count === 1 ? "" : "s"}` `` and `flag ? "b" : c ?? "d"`. A narrower config (`?:` only with arithmetic and with `??`) caught the `+` and `??` cases and left comparisons alone.
- The message: "Use parentheses to clarify the intended order of operations." (ESLint 10.14.0).
- Oxlint 1.90.0 has no `no-mixed-operators` (absent from `oxlint --rules`); `-D all` reported only general rules (`no-ternary`, `prefer-template`, `no-magic-numbers`). Biome 2.6.4 has no equivalent rule that fired.
- **Caveat:** small hand-written set. Ultracite's ESLint preset turns on every `@eslint/js` rule through `configs.all`, but `@eslint/js` 10.0.1's `all` config doesn't list `no-mixed-operators` (deprecated rules are left out), and eslint-config-prettier switches it off again (7.17).
- **For the post:** a TypeScript project gets most of the protection from the type checker, not the linter. In plain JavaScript, nothing Ultracite ships flags `a && b ? c : d` or `a ?? b ? c : d`.
- **Text:** `scratchpad/nested-ternaries-lit/F/check/lint/tsc-6.0.3.txt`, `scratchpad/nested-ternaries-lit/F/src/eslint/no-mixed-operators-v10.14.0.js`, `scratchpad/nested-ternaries-lit/F/check/lint/eslint-10.14.0-default.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/eslint-10.14.0-groups.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/eslint-10.14.0-narrow.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/eslint-10.14.0-typescript-eslint-8.72.1.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/oxlint-1.90.0-all.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/oxlint-1.90.0-ultracite-core.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/oxlint-1.90.0-ultracite-core-type-aware.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/biome-2.6.4-ultracite-core.txt`, `scratchpad/nested-ternaries-lit/F/check/oxlint-rules-1.90.0.json`, `scratchpad/nested-ternaries-lit/F/src/eslint/eslint-all-@eslint-js-10.0.1.js`

### 7.15 The template-literal autofix turns the concatenation bug into a constant condition, which the next pass reports. My check (local run)

- **Method:** `greet.js` with `"Hello, " + user ? user.name : "guest"` and the parenthesised version, under Ultracite's Oxlint core (`--fix`), ESLint `prefer-template` with `no-constant-condition` (`--fix`), and Ultracite's Biome core (`--write`, then `--write --unsafe`), 11 Nov 2026.
- **What it found:**
  - All three fixers rewrite only the concatenation: `` `Hello, ${user}` ? user.name : "guest" ``. The bug stays, but the test is now a template literal with text in it, which is always truthy.
  - Oxlint's second run then reports `no-constant-condition` ("Unexpected constant condition"); ESLint reports it in the same `--fix` run; Biome reports `noConstantCondition` ("This condition always evaluates to the same value.") after the fix.
  - Biome marks its fix "Unsafe fix: Use a template literal.", so a plain `--write` applies nothing and the bug stays unreported.
  - The parenthesised version becomes `` `Hello, ${user ? user.name : "guest"}` `` in all three, which is correct.
- **Caveat:** found by accident while checking 7.14; one pattern. Before the fix, none of the three tools reports the condition as constant.
- **For the post:** a rule that looks purely stylistic (`prefer-template`) exposes this precedence bug, by accident, two passes later. It's a good example for how lint rules interact, and a weak one for relying on that.
- **Text:** `scratchpad/nested-ternaries-lit/F/check/lint/oxlint-1.90.0-ultracite-core-fix.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/eslint-10.14.0-prefer-template-fix.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/biome-2.6.4-ultracite-core-fix.txt`, `scratchpad/nested-ternaries-lit/F/check/lint/biome-2.6.4-ultracite-core-fix-unsafe.txt`

### 7.16 Prettier and Oxfmt strip the parentheses that would show intent around `+` and `&&`, and add them around `??`. VERIFIED (Prettier changelog at 3.9.10, PR #16391, issue #4873); My check (local run)

- **Citation:** Prettier `CHANGELOG.md` at tag `3.9.10` (`3dec0209`), entry under 3.3.3: https://github.com/prettier/prettier/pull/16391 (opened 12 Jun 2024, merged 18 Jun 2024), which fixed https://github.com/prettier/prettier/issues/4873 (opened 23 Jul 2018 by mariusschulz, closed 18 Jun 2024).
- **What it says:**
  - Changelog: "Add parentheses for nullish coalescing in ternary", because "This change adds clarity to operator precedence." The example turns `foo ?? bar ? a : b` into `(foo ?? bar) ? a : b` and parenthesises `??` in either arm.
  - The 2018 request: `??` "isn't immediately obvious, and I think that parentheses would improve readability here." A maintainer (suchipi) was at first unsure, since Prettier didn't do it for `||`, then agreed: "I'm fine adding them as long as we're consistent across binary expressions". Another (vjeux): "This is only an issue if the entire line fits in 80 column." The 2024 change covered `??` only.
- **My check (11 Nov 2026, `F/check/format/`):** Prettier 3.9.10 (no config) and Oxfmt 0.75.0 (empty config) both turn `("Hello, " + user) ? user.name : "guest"` into `"Hello, " + user ? user.name : "guest"` and `(loggedIn && admin) ? ...` into `loggedIn && admin ? ...`, removing the author's parentheses, and both turn `value ?? 1 ? ...` into `(value ?? 1) ? ...` and `c ?? "d"` in an arm into `(c ?? "d")`.
- **Caveat:** section 5 covers formatter behaviour on nested ternaries; this entry is only about precedence inside a ternary.
- **For the post:** an author who writes parentheses to show what `+` or `&&` applies to loses them on save, which is also why `no-mixed-operators` and a formatter don't mix (7.17). The formatter now protects the `??` case only.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/prettier/CHANGELOG-3.9.10.md`, `scratchpad/nested-ternaries-lit/F/src/prettier/pr-16391.json`, `scratchpad/nested-ternaries-lit/F/src/prettier/issue-4873.json`, `scratchpad/nested-ternaries-lit/F/check/format/prettier-3.9.10.txt`, `scratchpad/nested-ternaries-lit/F/check/format/oxfmt-0.75.0.txt`

### 7.17 `no-mixed-operators`: off for `?:` by default, deprecated, and disabled by eslint-config-prettier. VERIFIED (ESLint 10.14.0 source; eslint-config-prettier 10.1.8 source and README)

- **Citation:** `lib/rules/no-mixed-operators.js` in the eslint 10.14.0 npm package (as installed in the worktree); `index.js` and `README.md` in the eslint-config-prettier 10.1.8 package.
- **What it says:**
  - The rule knows `TERNARY_OPERATOR = ["?:"]` and `COALESCE_OPERATOR = ["??"]`, but `DEFAULT_GROUPS` lists only the arithmetic, bitwise, comparison, logical (`&&`, `||`) and relational groups, so `?:` and `??` are checked only if a config adds them.
  - It is deprecated since 8.53.0 with `availableUntil: "11.0.0"`: "Formatting rules are being moved out of ESLint core." The replacement is `@stylistic/no-mixed-operators`.
  - eslint-config-prettier sets `"no-mixed-operators": specialRule` (`0`), in its deprecated section, and the same for the two `@stylistic` names. README: "This rule requires special attention when writing code." "However, Prettier removes many 'unnecessary' parentheses, turning it back to:". The advice: "If you want to use this rule with Prettier," "you need to split the expression into another variable:".
- **Caveat:** these are package files, not a tagged checkout, but the versions match the tags.
- **For the post:** the one rule built for the precedence trap is off by default for `?:`, is being removed from core, and fights the formatter. Splitting the test into a named variable, the README's advice, is the same fix as for a nested ternary.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/eslint/no-mixed-operators-v10.14.0.js`, `scratchpad/nested-ternaries-lit/F/src/eslint-config-prettier/index-v10.1.8.js`, `scratchpad/nested-ternaries-lit/F/src/eslint-config-prettier/README-v10.1.8.md`

### 7.18 Linux kernel selftests, 2022–2026: a ternary dropped into a `||` chain skipped the rest of the chain for four years. ANECDOTAL (patch mail and mainline commit); My check (local run)

- **Citation:** Sayali Patil, "[PATCH v3 3/3] selftests/mm: fix ternary operator precedence in ksm_tests," 8 Jul 2026, mirrored at https://github.com/lore-kernel-org-archives/linux-kselftest.0/commit/66e0041f858d62433dd3bb1c78303d4c27004d9a ; mainline commit `4e1fbffb3333` in torvalds/linux (author date 8 Jul 2026). It fixes `9aa1af954db0` ("selftests: vm: check numa_available() before operating 'merge_across_nodes' in ksm_tests", 21 May 2022). The mm-commits archive shows it merged to mm-stable (5 Aug 2026), and stable-queue mails show backports to 6.1 through 7.2 (12 Sep 2026).
- **What it says:** "The KSM selftest uses conditional expressions to skip accesses to" `merge_across_nodes` without NUMA. "However, the" "ternary operator is combined with logical OR without parentheses:" `a || numa_available() ? 0 : b || c` parses as `(a || numa_available()) ? 0 : (b || c)` "instead of the intended:" `a || (numa_available() ? 0 : b) || c`. The fix adds parentheses in three places.
- **My check (`F/check/precedence/run-or-chain.mjs`, Node 24.14.1):** the same expression in JavaScript, with each step returning `true` on failure and `numaAvailable()` returning `-1` (no NUMA). As written, only the first step runs and the chain reports success; as intended, the later steps run and a failing step is reported.
- **Caveat:** C, not JavaScript, but `||` binds tighter than `?:` in both. Test code, not production code. A single case.
- **For the post:** a ternary used as a guard in the middle of an `||` chain is the precedence bug in its plainest form, and it survived review in a heavily reviewed project. Splitting the guard into its own `if` would have made the grouping obvious.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/kernel-ksm-tests-v3-patch-body.txt`, `scratchpad/nested-ternaries-lit/F/src/gh/kernel-ksm_tests-history.txt`, `scratchpad/nested-ternaries-lit/F/src/gh/search-commits-ternary-precedence.json`, `scratchpad/nested-ternaries-lit/F/src/gh/kernel-fixes-commit-9aa1af95.txt`, `scratchpad/nested-ternaries-lit/F/check/precedence/node-run-or-chain.txt`

### 7.19 String concatenation in front of `?`: an error toast that always dropped its prefix, and ten broken borders in one JSX file. ANECDOTAL (issue and commit in small repositories)

- **Citations:** Schutzengel-GmbH/FamDok-2 issue #22, "Ternary operator-precedence bug drops error prefix in general-form-page," opened 27 Aug 2026, closed with "fixed in #149" (8 Oct 2026), https://github.com/Schutzengel-GmbH/FamDok-2/issues/22 ; kari-kounkel/flowsuite commit `454f38f4` (18 Mar 2026), "Fix ternary operator precedence in string concatenations; fix offer letter body string", https://github.com/kari-kounkel/flowsuite/commit/454f38f4491b84ed0c92fd16fd790bab663c3b8f
- **What they say:**
  - FamDok-2 (a TypeScript front end): `'Beim Speichern ist ein Fehler aufgetreten: ' + err.message ? err.message : err`, where "the concatenated string is always truthy," so "the intended prefix never shows." The issue was "Filed from frontend/ISSUES.md".
  - flowsuite (`src/modules/PeopleFlow.jsx`): ten inline styles of the form `border:'1px solid '+active?'#22C55E':'#6B7280'`, each fixed by parenthesising the ternary. My check: with `active = false` the written form gives `{"border":"#22C55E"}`, a colour with no width or style, so no border at all.
- **Caveat:** two small repositories (flowsuite has 0 stars). Neither says how the code was written. Search results for this bug class are dominated by small projects and audit-style issues, so it shows the pattern exists, not how often.
- **For the post:** the concatenation case is the textbook one, and it still turns up in 2026 code, in exactly the form `prefer-template` would rewrite (7.15).
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/famdok-issue-22.json`, `scratchpad/nested-ternaries-lit/F/src/gh/flowsuite-commit-454f38f4.json`, `scratchpad/nested-ternaries-lit/F/check/precedence/node-flowsuite-border.txt`

### 7.20 `??` before `?`: a developer's debugging report, and three more, in the Prettier issue. ANECDOTAL (comments in prettier/prettier#4873)

- **Citation:** comments on https://github.com/prettier/prettier/issues/4873 by saithis (17 Sep 2020), NilSet (26 Oct 2020), kylemh (9 Feb 2021) and jkillian (26 May 2022).
- **What it says:**
  - saithis: "I helped debug some code today where the dev had written something like this:" `const value = valueOrNull ?? condition ? value1 : value2;`, read as `(valueOrNull ?? condition) ? ...` but meant as `valueOrNull ?? (condition ? value1 : value2)`.
  - NilSet hit the neighbouring case `maybeValue ?? defaultValue > 2`, which groups as `maybeValue ?? (defaultValue > 2)`. kylemh: "I've been burned many times by the precedence problem,". jkillian hit `??` in the second arm.
- **Caveat:** second-hand reports in a feature request; no repository or commit. They are why Prettier added parentheses in 3.3.3 (7.16).
- **For the post:** a concrete, real `??`-in-the-test bug. Since Prettier 3.3.3 and Oxfmt, the formatter makes it visible, so it is one precedence trap a formatter now helps with.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/prettier/issue-4873.json`

### 7.21 PHP's left-associative ternary in real code: phpMyAdmin 4.9.1 mixed a nested ternary with `&&`, and PHP 7.4's deprecation notice found it. ANECDOTAL (issue and commit); My check (local run)

- **Citation:** phpmyadmin/phpmyadmin issue #15499, "Unparenthesized `a ? b : c ? d : e` is deprecated.", opened 9 Oct 2019 (PHP 7.4.0RC3, phpMyAdmin 4.9.1), fixed by commit `9ddca222` (William Desportes, 17 Oct 2019; PR #15503), https://github.com/phpmyadmin/phpmyadmin/issues/15499
- **What it says:** the code in `libraries/tbl_columns_definition_form.inc.php` was `isset($GLOBALS['col_priv']) ? $GLOBALS['col_priv'] : false && isset($GLOBALS['is_reload_priv']) ? $GLOBALS['is_reload_priv'] : false`. The reporter: "I guess it should be replaced with this:", wrapping each ternary and joining them with `&&`, which is what the commit did. phpMyAdmin's automatic error reporting logged 86 incidents of the notice.
- **My check (`F/check/php/`, PHP 8.5.12):** the original is now a compile error ("Fatal error: Unparenthesized"). Written out the way PHP 7.3 parsed it, `(isset(A) ? A : (false && isset(B))) ? B : false`, it reads `$GLOBALS['is_reload_priv']` without the `isset` guard when `col_priv` is true and `is_reload_priv` is unset. In the five combinations I ran, its truthiness matched the fix, so the bug was the unguarded read (an undefined-index notice), not a wrong answer.
- **Related reports:** a GitHub issue search for "Unparenthesized" "is deprecated" returned 100 results (the page limit), including nextcloud/server #16574, octobercms/october #4797, phpmyadmin #15499, EasyCorp/EasyAdminBundle #3699, Mangopay/mangopay4-php-sdk #371 and vichan-devel/vichan #363 ("things are totally broke for php 7.4"; a commenter, ctrlcctrlv: "At least the problems seem to be simply syntactical,"). Most were deprecation notices from dependencies (Twig, Laravel packages), not wrong results.
- **Caveat:** the RFC is in 1.14. This is one worked case plus a list; I didn't check whether any listed project's nested ternary had produced wrong values.
- **For the post:** PHP is the one language that changed a ternary's grouping, and the cleanup exposed code that mixed nesting with `&&` in a way the author didn't mean. The cost landed on users as log noise and, from PHP 8, fatal errors.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/php-issue-phpmyadmin_phpmyadmin-15499.json`, `scratchpad/nested-ternaries-lit/F/src/gh/phpmyadmin-commit-9ddca222.json`, `scratchpad/nested-ternaries-lit/F/check/php/php-8.5-run.txt`, `scratchpad/nested-ternaries-lit/F/src/gh/search-php74-deprecated.json`, `scratchpad/nested-ternaries-lit/F/src/gh/php-issue-vichan-devel_vichan-363.json`, `scratchpad/nested-ternaries-lit/F/src/gh/php-issue-nextcloud_server-16574.json`, `scratchpad/nested-ternaries-lit/F/src/gh/php-issue-octobercms_october-4797.json`

### 7.22 The opposite misreading: an audit reported a precedence bug that wasn't one. ANECDOTAL (single issue)

- **Citation:** fowlerontherun/rockmundo-genesis-project issue #3216, "INVALID AUDIT FINDING: Ternary precedence does not bypass wellness restriction," 11 Oct 2026.
- **What it says:** "This finding was a false positive." In `restrictedBy ? 0 : baseValue * Math.max(0.6, multiplier) + additive + ...`, the alternate is the whole arithmetic expression, so the restriction holds. "Closed as not planned. No game code changed."
- **Caveat:** the issue doesn't say who or what ran the audit. One case.
- **For the post:** a reviewer can misread a ternary's reach in either direction; here the arm is long, not nested. A short arm, or the arithmetic in a named variable, removes the doubt.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/rockmundo-issue-3216.json`

### 7.23 ESLint's `no-unneeded-ternary` autofix produced invalid code when the test was parenthesised, until 7 Nov 2026. VERIFIED (issue, PR); My check (local run)

- **Citation:** eslint/eslint issue #21491, opened 5 Nov 2026 against v10.13.0, fixed by PR #21495 (merged 7 Nov 2026, `b11bcb36`), after the v10.14.0 release (30 Oct 2026). Older: issue #10432 (1 Jun 2018, v4.19.1), fixed by PR #10468.
- **What it says:**
  - #21491: when inverting a comparison in `? false : true`, the fix drops the test's parentheses and runs keywords into the result, "producing syntax errors or broken identifiers:". `({ a: 1 } === b) ? false : true` becomes `{ a: 1 } !== b;`, and `return(foo) ? true : true;` becomes `returntrue;`. A maintainer (DMartens): "I am able to reproduce this,".
  - #10432: `in ? in : yield 1` was fixed to `in || yield 1`, "which is invalid JavaScript code."
- **My check (11 Nov 2026, `F/check/unneeded/`):** ESLint 10.14.0 still has the bug: `--fix` writes `{ a: 1 } !== b` (then "Parsing error: Unexpected token !==") and `returntrue;`. Oxlint 1.90.0's version is listed as a dangerous fix (`fixable_dangerous_fix`), so `--fix` leaves the code alone; `--fix-dangerously` writes `!(({ a: 1 } === b))`, which parses, and the same `returntrue;`, which throws `ReferenceError: returntrue is not defined` when called. Biome 2.6.4's `noUselessTernary` (unsafe fix, applied with `--write --unsafe`) produced valid code and doesn't report `x ? true : true` or `x ? x : y`.
- **Caveat:** the inputs are unusual spellings (`return(foo)`, an object literal compared with `===`). Ultracite's Oxlint core uses `no-unneeded-ternary` with default options.
- **For the post:** even the simplest ternary fixer, which only removes `? true : false`, had a parenthesis bug in 2026. A fix being available doesn't mean it is safe, and the safe tools are the ones that print the whole expression back with its parentheses.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/eslint-issue-21491.json`, `scratchpad/nested-ternaries-lit/F/src/gh/eslint-pr-21495.json`, `scratchpad/nested-ternaries-lit/F/src/gh/eslint-issue-10432.json`, `scratchpad/nested-ternaries-lit/F/check/unneeded/eslint-10.14.0-no-unneeded-ternary-fix.txt`, `scratchpad/nested-ternaries-lit/F/check/unneeded/oxlint-1.90.0-no-unneeded-ternary-fix.txt`, `scratchpad/nested-ternaries-lit/F/check/unneeded/biome-2.6.4-noUselessTernary-fix.txt`

### 7.24 A "safe" Biome fix created a nested ternary that meant something else. VERIFIED (issue); My check (local run)

- **Citation:** biomejs/biome issue #11289 (a `noExtraBooleanCast` safe fix that drops parentheses around a ternary inside `Boolean(...)`), opened 10 Aug 2026 (Biome 2.5.6), closed as completed 13 Aug 2026. It calls itself a remaining case of #7225, fixed by #7244.
- **What it says:** `Boolean(a ? b : c) ? "X" : "Y"` was fixed to `a ? b : c ? "X" : "Y"`, which groups as `a ? b : (c ? "X" : "Y")`; with `a = true, b = 42` the result changes from `"X"` to `42`. "Even though the fix is marked as safe, it changes program behavior."
- **My check (11 Nov 2026, `F/check/biome-fixes/`):** Biome 2.6.4 reports it ("Safe fix: Remove redundant `Boolean` call") and writes `(a ? b : c) ? "X" : "Y"`, which is correct.
- **Caveat:** fixed; one construct.
- **For the post:** the clearest example that removing parentheses around a ternary changes its meaning, and that a fixer can produce a nested ternary nobody wrote. Ultracite's Biome core turns `noExtraBooleanCast` on.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/biome-issue-11289.json`, `scratchpad/nested-ternaries-lit/F/check/biome-fixes/biome-2.6.4-fixes.txt`, `scratchpad/nested-ternaries-lit/F/check/biome-fixes/biome-2.6.4-fixes-applied.txt`

### 7.25 `prefer-logical-operator-over-ternary`: `??` isn't `?:`, and a user's application broke. VERIFIED (issue); My check (local run)

- **Citation:** sindresorhus/eslint-plugin-unicorn issue #2059, "prefer-logical-operator-over-ternary is dangerous and shouldn't be recommended," 6 Apr 2023, closed an hour later.
- **What it says:** the reporter showed `x ? x : "default value"` differs from `x ?? "default value"` for `NaN` and `""`: "This lead to a bug in our application." A contributor (dimaMachina) replied: "This rule is not dangerous, it has suggestions instead autofix" and "It is up to you to choose the right operator for your individual case".
- **My check (11 Nov 2026, `F/check/unicorn/`):** unicorn 79.0.0 under ESLint 10.14.0 reports `count ? count : "default value"` with two suggestions, `??` first and `||` second; `--fix` applies neither. Oxlint 1.90.0 lists its port as `fixable_suggestion`, and `--fix-suggestions` wrote `count || "default value"`, which gave the same results as the original for `0`, `""`, `NaN`, `null` and `3`.
- **Caveat:** the reporter's account is the only evidence of the bug; the application isn't named.
- **For the post:** the rule's two suggestions are not equivalent, and only one preserves behaviour for falsy values. An agent or an editor that applies the first suggestion picks the wrong one in ESLint.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-2059.json`, `scratchpad/nested-ternaries-lit/F/check/unicorn/fallback-suggestions.json.txt`, `scratchpad/nested-ternaries-lit/F/check/unicorn/oxlint-1.90.0-unicorn-fix-suggestions.txt`

### 7.26 `prefer-minimal-ternary`'s fix broke TypeScript narrowing, and v79.0.0 still reports the case it can't fix. VERIFIED (issues, PRs); My check (local run)

- **Citation:** sindresorhus/eslint-plugin-unicorn issue #3845 (6 Oct 2026, label `bug`), fixed by PR #3846 (merged 7 Oct 2026); issue #3890 (14 Oct 2026), handled by PR #3892 (merged 15 Oct 2026); issue #3273 (16 Jun 2026). v79.0.0 was released 23 Oct 2026.
- **What it says:**
  - #3845: for `type === 'a' ? {type, property: 0} : {type, property: ''}` returning a discriminated union, the fix moved the ternary into `property`, "which breaks the TypeScript discriminated union narrowing:" (TS2322).
  - #3890: "These can't be minimized without a type assertion, but the rule still reports them."
  - #3273, on an earlier version: the reporter found the rule "generally pretty noisy and useless."; sindresorhus moved method-name swaps behind an opt-in option, off by default.
  - The v79.0.0 source sets `minimalTernaryDefaultOptions = {checkVaryingBase: false, checkComputedMemberAccess: false}`. Its comments say the call-varying cases push the ternary in front of the call, "hiding the call site, so they are opt-in.", and that the object-swap case wraps the receiver in a conditional and breaks TypeScript `const enum` access.
- **My check (11 Nov 2026):** with Ultracite's options (`checkComputedMemberAccess: true`, `checkVaryingBase: true`), unicorn 79.0.0 still reports the #3845 function ("Move the ternary into the varying part of the expression") but offers no fix, so `--fix` leaves it unchanged and the error stays.
- **Caveat:** TypeScript parser without type information in my run.
- **For the post:** rules that reshape ternaries depend on types the linter often can't see. Ultracite turns on both of the rule's opt-in options, which the plugin leaves off for readability and TypeScript reasons. That is a question for the presets, not for the post.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/unicorn/shared-minimal-ternary-v79.0.0.js`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-3845.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-pr-3846.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-3890.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-pr-3892.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-3273.json`, `scratchpad/nested-ternaries-lit/F/check/unicorn/eslint-10.14.0-unicorn-79.0.0.txt`, `scratchpad/nested-ternaries-lit/F/check/unicorn/eslint-10.14.0-unicorn-79.0.0-fix.txt`

### 7.27 Two recommended unicorn rules together turned an early return into a nested ternary, until September 2026. VERIFIED (issues, PR); My check (local run)

- **Citation:** sindresorhus/eslint-plugin-unicorn issue #3703, "`prefer-ternary` and `prefer-minimal-ternary` can force less readable nested ternaries," 16 Sep 2026 (Sli4o), fixed by PR #3709 ("`prefer-ternary`: Preserve readable branches", merged the same day); follow-up issue #3960 (28 Oct 2026, abrahamguo).
- **What it says:**
  - #3703: an `if (typeof value === 'function') return ...;` guard followed by a ternary return. `prefer-minimal-ternary` moved the ternary inside `String(...)`, then `prefer-ternary` merged the guard into it. "Following both rules turns those decisions into a nested ternary." In this case, "the early return seems easier to follow than the resulting expression." "Both rules are enabled by the recommended configuration."
  - #3960, on v79.0.0: `prefer-ternary` now skips an `if` whenever its condition or a merged value contains a ternary, and #3709 extended that to "conditions and to ternaries inside other expressions,". The request is an opt-in to turn it off: "But it's a readability preference with no way to turn it off,".
- **My check (11 Nov 2026, `F/check/unicorn/`):** with unicorn 79.0.0 and Ultracite's options, `--fix` applied `prefer-minimal-ternary` to the #3703 function and `prefer-ternary` then left the guard alone; `no-nested-ternary` reported nothing.
- **Caveat:** `prefer-ternary`'s source is in 2.11; this entry is the issue history.
- **For the post:** a direct, recent case of rules that prefer ternaries pushing code toward the nested form `no-nested-ternary` forbids, and of the plugin deciding the early return should win. It supports Hayden's preference with the plugin authors' own reasoning.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-3703.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-pr-3709.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-3960.json`, `scratchpad/nested-ternaries-lit/F/check/unicorn/eslint-10.14.0-unicorn-79.0.0-fix.txt`

### 7.28 Older ternary fixer bugs: parentheses that multiplied, and comments that vanished. VERIFIED (issues)

- **Citations:** sindresorhus/eslint-plugin-unicorn issue #663, "Weird 'no-nested-ternary' fix result," 6 Apr 2020 (closed the next day); issue #1498, "`prefer-ternary` autofix drops comments," 24 Aug 2021, closed 13 Feb 2026 by a regression-test commit (`317e0849`).
- **What they say:**
  - #663: run through xo with the TypeScript parser, `unicorn/no-nested-ternary`'s fix wrapped the inner ternary in eleven pairs of parentheses. "Interestingly the more I run this the more brackets I get" "yet the error still persists." fisker traced it to the TypeScript parser.
  - #1498: merging an `if`/`else` with a trailing comment into a ternary. "Looks so much better, but the comment is gone!"
- **Caveat:** both fixed. The parenthesis loop between `unicorn/no-nested-ternary` and formatters is in 5.16.
- **For the post:** history for the claim that ternary fixers are fiddly: they have to manage parentheses and comments, and each has gone wrong.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-663.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-issue-1498.json`, `scratchpad/nested-ternaries-lit/F/src/gh/unicorn-commit-317e0849.txt`

### 7.29 Fixes that turn a ternary into something else: `Math.min` on strings, and `??` for a `=== null` check. VERIFIED (issues); My check (local run)

- **Citations:** biomejs/biome issue #12624, "`useMathMinMax` reports a ternary over strings, and its fix to `Math.min` returns `NaN`," 24 Oct 2026 (Biome 2.6.2), closed as not planned; issue #12808 (31 Oct 2026, open) on `useMathMinMax` and nested ternaries; issue #10464, "`useNullishCoalescing` safe autofix changes runtime behavior for `=== null` / `=== undefined` ternaries," 25 May 2026 (Biome 2.4.15), closed 11 Nov 2026.
- **What they say:**
  - #12624: `dates.reduce((a, b) => (a < b ? a : b))` over ISO date strings is reported, and the unsafe fix writes `Math.min(a , b)`. The reporter found unicorn 79.0.0's `prefer-math-min-max` behaves the same; a maintainer (dyc3) answered "then the rule is working as intended." The report ends with the line "Tool Use Disclaimer: Claude Code using Anthropic Opus 5.5 helped build the reproduction."
  - #12808: a GWT-generated nested ternary gets one unsafe fix to `Math.min` and then a second report the tool won't fix.
  - #10464: `userInput.fruits === null ? [] : userInput.fruits` was rewritten to `??`, which also replaces `undefined`. "At the very least it shouldn't offer to rewrite the code into something" "that's not functionally equivalent". A maintainer (ematipico) pointed to the rule's nursery warning.
- **My check (11 Nov 2026, `F/check/biome-fixes/`):** Biome 2.6.4 still reports the #12624 code and `--write --unsafe` writes `Math.min(a , b)`; run on two ISO dates, the fixed callback returns `NaN`. Oxlint 1.90.0's `unicorn/prefer-math-min-max` didn't report it. Biome 2.6.4's nursery `useNullishCoalescing` still reports the `=== null` ternary, with the note "A ternary expression that checks for null or undefined does what ?? does," but no longer offers a fix.
- **Caveat:** these rules don't target nested ternaries; they are rules that rewrite ternaries, and Ultracite turns on `useMathMinMax` (Biome) and `unicorn/prefer-math-min-max` (Oxlint).
- **For the post:** a ternary states its condition exactly. Rules that turn it into an operator or a library call can lose the exact condition, and they depend on types the tool may not know.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/biome-issue-12624.json`, `scratchpad/nested-ternaries-lit/F/src/gh/biome-issue-12808.json`, `scratchpad/nested-ternaries-lit/F/src/gh/biome-issue-10464.json`, `scratchpad/nested-ternaries-lit/F/check/biome-fixes/biome-2.6.4-fixes.txt`, `scratchpad/nested-ternaries-lit/F/check/biome-fixes/biome-2.6.4-fixes-applied.txt`, `scratchpad/nested-ternaries-lit/F/check/biome-fixes/oxlint-1.90.0-prefer-math-min-max.txt`

### 7.30 Oxlint issues around ternaries: an optional-chain fix that changed a ternary's test, and two reports closed as working as intended. VERIFIED (issues); My check (local run)

- **Citations:** oxc-project/oxc issue #20054, "prefer-optional-chain unsafe auto-fix changes ternary semantics," 6 Mar 2026 (Oxlint 1.51.0), closed 28 May 2026; #19730, "`unicorn/prefer-ternary` false positive," closed as not planned 28 May 2026; #22765, `no-unneeded-ternary` with `defaultAssignment: false` and a type assertion, closed as not planned 27 May 2026.
- **What they say:**
  - #20054: the "auto-fix produces semantically different code for patterns like" `user && sub?.planId === user.id ? (user.tier ?? null) : undefined`, rewriting the test to `sub?.planId === user?.id`, which is `true` when both are `undefined` and then crashes on `user.tier`. A maintainer (camc314) closed it: "The fixer is marked as dangerous/suggestion" "indicating that it may not exactly maintain the semantics:".
  - #19730: camc314 found upstream unicorn reports the same code, so "it does not appear to be an Oxlint false positive vs the upstream rule." The workaround is `only-single-line`.
- **My check (11 Nov 2026, `F/check/optional-chain/`):** Oxlint 1.90.0 with `--type-aware` doesn't report the #20054 function at all.
- **Caveat:** `prefer-optional-chain` isn't in Ultracite's Oxlint core as far as I found; #20054 is here because the bug was in a ternary's test.
- **For the post:** a ternary's test is where a guard like `user &&` does its work, and fixers that simplify the test can remove the guard.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/gh/oxc-issue-20054.json`, `scratchpad/nested-ternaries-lit/F/src/gh/oxc-issue-19730.json`, `scratchpad/nested-ternaries-lit/F/src/gh/oxc-issue-22765.json`, `scratchpad/nested-ternaries-lit/F/check/optional-chain/oxlint-1.90.0-prefer-optional-chain.txt`

### 7.31 What I searched and didn't find. Negative findings

- **Real bugs in large JavaScript projects caused by a nested ternary (not precedence):** `gh search commits "ternary precedence"` with `--owner` for 24 large organisations (Microsoft, Meta, Vercel, Mozilla, Node.js, Angular, Vue, Svelte, Astro, Deno, Bun and others) found one unrelated hit; `gh search commits "precedence"` in five large repositories found none about ternaries; issue searches in 16 large repositories were rate-limited (one result set). Most `ternary precedence` hits are C (the Linux kernel, 7.18), PHP (7.21) or small projects (7.19).
- **A nested ternary that was misread in a real bug report.** All the precedence bugs found involve a binary operator in front of `?`, not `a ? b : c ? d : e` itself. PHP's case is the exception, and it needed left-associativity.
- **For the post:** the evidence that nested ternaries cause bugs in JavaScript is thin; the evidence for precedence bugs at a ternary's test is better, and those are outside `no-nested-ternary`'s reach.

## 8. The rewrites and what they change

8.1–8.7 are early returns and single exit: Fowler, the c2 wiki, Dijkstra, Knuth, where the one-entry, one-exit idea comes from, MISRA and JSF, and Effective Go. 8.8–8.10 are lookup objects (eager evaluation, inherited keys) and `switch (true)`. 8.11–8.14 are JSX: IIFEs, extracting components, `&&` and `0`, and React Native. 8.15 is TC39's own answer. 8.16–8.18 are local checks on when a rewrite changes behaviour and what Ultracite's presets say about each form.

### 8.1 Fowler's "Replace Nested Conditional with Guard Clauses": the refactoring, in Fowler's own catalog. VERIFIED (catalog page, current and 2010 Wayback); the book text not opened

- **Citation:** Martin Fowler, "Replace Nested Conditional with Guard Clauses," refactoring catalog, https://refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html (current, 2nd-edition page) and the Wayback capture of 10 Feb 2010 (1st-edition page), https://web.archive.org/web/20100210082436/http://www.refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html ; Martin Fowler, _Refactoring_ (first and second editions; not opened).
- **What it says:**
  - 2010 page (1st edition): "A method has conditional behavior that does not make clear" "what the normal path of execution is" and "Use Guard Clauses for all the special cases". It points to page 250 of the book.
  - Both pages show the same transformation: `getPayAmount()` with a `result` variable assigned inside nested `if/else` becomes four lines, `if (isDead) return deadAmount();`, `if (isSeparated) return separatedAmount();`, `if (isRetired) return retiredAmount();`, `return normalPayAmount();`. The current page shows only code and asks how to access the web edition.
- **Caveat:** the book's argument (including what it says about single exit points) is behind the web edition's login and in print; I quote neither. The catalog example starts from nested `if` statements with a mutable `result`, not from a nested ternary.
- **For the post:** the source for Hayden's `if (bool) return x;` style. Note what the example removes: nesting and a reassigned variable. A nested ternary has neither, so the guard-clause argument applies to ternaries only by analogy.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/refactoring-com-guard-clauses-wayback-20100210.txt`, `scratchpad/nested-ternaries-lit/A/text/refactoring-com-replaceNestedConditionalWithGuardClauses.txt`, `scratchpad/nested-ternaries-lit/A/src/refactoring-com-guard-clauses-wayback-20100210.html`

### 8.2 The c2 wiki on guard clauses and single exit: Cunningham named the guard after Dijkstra, and the single-exit page says the rule came from structured programming. ANECDOTAL (wiki pages)

- **Citation:** "GuardClause" (last edited 30 Sep 2009) and "SingleFunctionExitPoint" (last edited 6 Sep 2014), WikiWikiWeb, https://wiki.c2.com/?GuardClause and https://wiki.c2.com/?SingleFunctionExitPoint (fetched as JSON from `c2.com/wiki/remodel/pages/`).
- **What it says:**
  - GuardClause calls it "one of the SmalltalkBestPracticePatterns" (a book not opened here). Ward Cunningham: "I borrowed the term ''guard'' from EwDijkstra when naming this pattern." The single-return version "buries the usual, and complicated, case inside a couple of layers of braces," Dave Harris: "I prefer the early return to spurious mutable state." and, on why: with `return` "we know the final result as soon as we hit" it, whereas with an assigned `result` "we can't be sure without checking the rest of the routine".
  - SingleFunctionExitPoint: "The original significance of having a single entry and single exit for a function" "is that it was part of the original definition of StructuredProgramming" "as opposed to undisciplined goto SpaghettiCode," It lists the guard clause first among "Reasonable exceptions", and notes "in a language that supports exceptions, (almost) no function has a single exit point."
- **Caveat:** a wiki: unsigned edits, no dates per comment, and the page's history of the single-exit rule is itself a claim (8.5 checks it). _Smalltalk Best Practice Patterns_ and Beck's _Implementation Patterns_ were not opened.
- **For the post:** good color for where the name comes from and for the strongest practical argument (no mutable result variable, 8.16), but cite it as a practitioners' discussion.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/c2-GuardClause.txt`, `scratchpad/nested-ternaries-lit/A/text/c2-SingleFunctionExitPoint.txt`, `scratchpad/nested-ternaries-lit/A/src/c2-GuardClause.json`, `scratchpad/nested-ternaries-lit/A/src/c2-SingleFunctionExitPoint.json`

### 8.3 Dijkstra's goto letter says nothing about single exit, counts McCarthy's conditional expressions as structured, and mentions alarm exits. VERIFIED (EWD215 and EWD472 transcripts; Crossref)

- **Citation:** Edsger W. Dijkstra, "A Case against the GO TO Statement" (EWD215), published as "Go To Statement Considered Harmful," _CACM_ 11(3):147–148, March 1968, doi:10.1145/362929.362947; transcript https://www.cs.utexas.edu/~EWD/transcriptions/EWD02xx/EWD215.html . Dijkstra, "Guarded commands, nondeterminacy and formal derivation of programs" (EWD472), _CACM_ 18(8):453–457, 1975, doi:10.1145/360933.360975; transcript https://www.cs.utexas.edu/~EWD/transcriptions/EWD04xx/EWD472.html
- **What it says:**
  - EWD215 lists the constructs that keep a program's progress describable: conditional and alternative clauses, Hoare's case, "or conditional expressions as introduced by J. McCarthy", after which "the progress of the process remains characterized by a single textual index." It recalls a recommendation "to restrict the use of the go to statement to alarm exits," which Dijkstra couldn't trace. The transcript contains no `single exit`, `single entry` or `one exit`.
  - EWD472 defines the guarded command as "a statement list prefixed by a boolean" "expression: only when this boolean expression is initially true," the list may run. In the alternative construct `if ... fi`, "the order in which the guarded" "commands of a set appear in our text is semantically irrelevant." and "If in the initial state none" "of the guards is true, the program will abort,".
- **Caveat:** EWD249 (_Notes on Structured Programming_, 1970) is a scanned PDF with no text layer, so I couldn't search or quote it; I didn't read the page images. _Structured Programming_ (Dahl, Dijkstra and Hoare, 1972) was not opened.
- **For the post:** single entry, single exit is often pinned on Dijkstra, but the 1968 letter doesn't say it, and it treats conditional expressions as fine. Dijkstra's guards are unordered and abort when none holds, unlike a ternary chain or a guard-clause sequence, where order decides and the last branch is the default.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/EWD215.txt`, `scratchpad/nested-ternaries-lit/A/text/EWD472.txt`, `scratchpad/nested-ternaries-lit/A/src/crossref-10.1145_362929.362947.json`, `scratchpad/nested-ternaries-lit/A/src/crossref-10.1145_360933.360975.json`

### 8.4 Knuth (1974): error exits are well structured, and the loop with "one entrance and one exit" is the common case, not a law. VERIFIED (transcription and scan; Crossref)

- **Citation:** Donald E. Knuth, "Structured Programming with go to Statements," _ACM Computing Surveys_ 6(4):261–301, Dec 1974, doi:10.1145/356635.356640. Read from an HTML transcription at http://www.kohala.com/start/papers.others/knuth.dec74.html and an OCR'd scan at https://pic.plover.com/knuth-GOTO.pdf (3.0 MB); the ACM PDF was not fetched.
- **What it says:**
  - The abstract names "improved syntax for iterations and error exits," as one of two issues.
  - Error exits: "it seems to be the one class of go to's that still is" "considered ugly but necessary by today's leading reformers." Later: "An error exit can be considered well structured for precisely this reason" and "When we jump out to an error exit" "we go to another level of abstraction having different assumptions."
  - Loops: the most common case that needs a `go to` in ALGOL or PL/I is "simple iterative loop with one entrance and one exit." Knuth prefers Zahn's event indicators over "exit to (label)" statements because "the specification of events instead of labels encourages a better conception of the program."
- **Caveat:** Knuth's subject is `goto` and loop exits in ALGOL-like languages; a `return` from a JavaScript function is a milder case. The transcription is unofficial; spot-checked against the scan.
- **For the post:** the standard citation for early exits being structured, from the period that produced the single-exit idea. Use it for guard clauses (exits for impossible or special states), not for nested ternaries.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/knuth-1974-kohala.txt`, `scratchpad/nested-ternaries-lit/A/text/knuth-1974-GOTO-plover.raw.txt`, `scratchpad/nested-ternaries-lit/A/src/crossref-10.1145_356635.356640.json`

### 8.5 One entry, one exit was a property of control structures, stated by IBM's structured programming material on top of Böhm and Jacopini. VERIFIED (IBM GC20-1850-0, Oct 1974); the theorem paper and Mills not opened

- **Citation:** IBM, _Improved Programming Technologies: An Overview_, GC20-1850-0, 1st ed., October 1974, via bitsavers (mirror https://www.mirrorservice.org/sites/www.bitsavers.org/pdf/ibm/generalInfo/GC20-1850-0_Improved_Programming_Technologies_-_An_Overview_1st_ed_197410.pdf). Its footnote cites C. Böhm and G. Jacopini, "Flow Diagrams, Turing Machines and Languages with Only Two Formation Rules," _CACM_ 9(5):366–371, May 1966, doi:10.1145/355592.365646 (Crossref record checked, paper not opened).
- **What it says:** structured programming "is based on a mathematically proven structure theorem" (the footnote is Böhm and Jacopini); any program can be built from sequence, `IF p THEN C ELSE D` and `DO E WHILE q`. "Each of the three structures has only one" "entry and one exit." "A program consisting solely of" "these structures is a proper program, a program with" "one entry and one exit." "Extensions to the three basic logic structures are" "permitted as long as they retain the one-entry, one-exit property."
- **Caveat:** an IBM marketing-and-training overview, so this is how the idea was taught, not where it was proved. The term "proper program" is usually credited to Harlan Mills's 1972 work; I didn't open Mills. The claim (seen in search results) that the abbreviation SESE was named by Ferrante, Ottenstein and Warren (1987) is UNVERIFIED.
- **For the post:** single exit began as a rule about flowchart building blocks (no jumping into or out of the middle of a structure), set against `goto`. A `return` at the top of a function doesn't jump into anything; applying the rule to function bodies came later (8.6).
- **Text:** `scratchpad/nested-ternaries-lit/A/text/ibm-GC20-1850-0-1974.raw.txt`, `scratchpad/nested-ternaries-lit/A/text/ibm-GC20-1850-0-1974.txt`, `scratchpad/nested-ternaries-lit/A/src/crossref-10.1145_355592.365646.json`

### 8.6 MISRA C and JSF AV C++ keep a single-exit rule for safety-critical code, with resource clean-up as the reason and readability as the exception. VERIFIED (JSF AV, public release); ANECDOTAL for MISRA (rule text only as quoted on MISRA's forum)

- **Citation:** Lockheed Martin, _Joint Strike Fighter Air Vehicle C++ Coding Standards_, Doc. 2RDU00001 Rev C, December 2005 ("Approved for public release"), AV Rule 113, https://www.stroustrup.com/JSF-AV-rules.pdf ; MISRA Discussion Forums, "Rule 15.5" thread (13–22 Aug 2014), https://forum.misra.org.uk/printthread.php?tid=1098
- **What it says:**
  - JSF AV Rule 113 "(MISRA Rule 82, Revised)": "Functions will have a single exit point." Rationale: "Numerous exit points tend to produce functions that are both difficult to" "understand and analyze." Exception: "A single exit is not required if such a structure would obscure or otherwise" "significantly complicate (such as the introduction of additional variables)" a function's control logic. "Note that the usual resource clean-up must be managed at all exit points."
  - MISRA forum: a user quotes MISRA C:2012 Rule 15.5 as "A function should have a single point of exit at the end" with the rationale "Early returns may lead to the unintentional omission of function termination code." The `misra-c` account answers: "The statement refers to C statements written by the user." such as freeing memory or closing a file at the end of the function.
- **Caveat:** MISRA C:2012 itself is sold, and I didn't open it; the rule's category (advisory or required) isn't verified here. Both standards are for C/C++ without garbage collection or `finally`, where the clean-up argument is strongest.
- **For the post:** the single-exit rule's surviving home is manual resource management. JSF's own exception, extra variables that complicate control flow, is exactly the cost of turning a ternary or guard chain into a single `return result`.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/JSF-AV-rules.txt`, `scratchpad/nested-ternaries-lit/A/text/misra-forum-tid-1098.txt`, `scratchpad/nested-ternaries-lit/A/src/misra-forum-tid-1098.html`

### 8.7 Effective Go writes guard clauses as the house style, and a tagless `switch` as the idiomatic else-if chain. VERIFIED (golang/website at a pinned commit). Vendor (Google)

- **Citation:** The Go Authors, _Effective Go_, sections _If_ and _Switch_, `_content/doc/effective_go.html` at golang/website `9d2e951d`, https://go.dev/doc/effective_go
- **What it says:**
  - When an `if` body ends in `break`, `continue`, `goto` or `return`, "the unnecessary `else` is omitted." "The code reads well if the" "successful flow of control runs down the page, eliminating error cases" "as they arise."
  - Switch: "if the `switch` has no expression it switches on `true`." "It's therefore possible—and idiomatic—to write an" `if-else-if-else` chain as a `switch`.
- **Caveat:** style guidance from the language's authors; Go has no ternary, so this is the alternative it offers, not a comparison with one.
- **For the post:** a second, independent source for flat guard clauses ("eliminating error cases as they arise"), and the precedent for `switch (true)` in JavaScript, with the difference that JavaScript compares cases with `===` (8.10).
- **Text:** `scratchpad/nested-ternaries-lit/A/src/golang-website-9d2e951dbfa18c495ec14086916e413e3554dea8-effective_go.html`

### 8.8 A lookup object evaluates every value, so it runs and throws in branches a ternary would skip. VERIFIED (ECMA-262 draft); My check (local run)

- **Citation:** ECMA-262 draft (1.1), §13.2.5.5 ObjectLiteral Evaluation and §13.2.5.6 PropertyDefinitionEvaluation; my check `scratchpad/nested-ternaries-lit/A/check/rewrites/eager-map.mjs`. Supporting: McCarthy (1.7), PEP 308 (1.9), golang/go #33171's issue text.
- **What it says:**
  - Spec: an object literal does "Let obj be OrdinaryObjectCreate(%Object.prototype%)." then "Perform ? PropertyDefinitionEvaluation of PropertyDefinitionList with argument obj."; for a list, "Perform ? PropertyDefinitionEvaluation of PropertyDefinitionList" and then the next `PropertyDefinition`, and for `PropertyName : AssignmentExpression` each value is evaluated: "Let exprValueRef be ? Evaluation of AssignmentExpression." Every value runs, left to right, before `[key]` picks one; a throw in any value aborts the whole literal.
  - My check (Node 24.14.1): with `compute` logging calls, the ternary chain logged `["a"]` and the map `{ a: compute("a"), b: compute("b"), c: compute("c") }[key]` logged `["a","b","c"]`. A realistic status map `({ error: error.message, ok: data.title, loading: "Loading" })[status]` with `status = "ok"` and `error = null`: "map ok threw: TypeError: Cannot read properties of null (reading 'message')"; the ternary chain returned `Report`. Wrapping each value in a function restored laziness: "thunk map ok: Report".
  - The same objection, three times before: McCarthy's `XIF` had all arguments evaluated (1.7); PEP 308 rejected `cond()` because both expressions "must be evaluated before the function" "is called." (1.9); the Go proposal's issue text calls a helper function "dangerous (ifTrue and ifFalse are both evaluated," (1.10).
- **Caveat:** a lookup with constant values (strings, numbers, components not yet called) has no side effects and no difference; the issue is values that are computed, call functions or read properties.
- **For the post:** the sharpest example of a fix that changes behaviour: a lookup object is not a lazy conditional. It's safe for constant tables; for computed values use functions as values or keep the conditional.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/ecma262-draft.txt`, `scratchpad/nested-ternaries-lit/A/check/rewrites/eager-map-output.txt`, `scratchpad/nested-ternaries-lit/A/check/rewrites/eager-map.mjs`, `scratchpad/nested-ternaries-lit/A/src/golang-go-issue-33171.json`, `scratchpad/nested-ternaries-lit/A/src/pep-0308-f7e6f34d7beffe1aa2ce0d8fd255976491a7a6a5.rst`

### 8.9 A plain object lookup by user input returns inherited members such as `constructor`; `Object.hasOwn`, `Map` or a null-prototype literal fix it. VERIFIED (ECMA-262 draft; MDN as secondary docs); My check (local run)

- **Citation:** ECMA-262 draft (1.1): ObjectLiteral Evaluation (prototype `%Object.prototype%`), PropertyDefinitionEvaluation (`__proto__` setter step), §20.1.2.14 `Object.hasOwn ( obj, key )`, §24.1.3.6 `Map.prototype.get ( key )`. MDN, "Map" (the Object-versus-Map table) and "Object.hasOwn()", mdn/content at `04a0e78c`. My check: `scratchpad/nested-ternaries-lit/A/check/rewrites/prototype-keys.mjs`.
- **What it says:**
  - Spec: object literals are created with `%Object.prototype%`, so `obj[key]` finds inherited properties too. `Object.hasOwn` does "Return ? HasOwnProperty(coerced, propertyKey)."; `Map.prototype.get` looks only at the map's own entries ("For each Record { [[Key]], [[Value]] } entry of map.[[MapData]], do"). In a literal, a non-computed `__proto__` key sets the prototype: "If propertyValue is an Object or propertyValue is null, then" "Perform ! obj.[[SetPrototypeOf]](propertyValue)."
  - My check, `roleLabels[role] ?? "Unknown role"` with `roleLabels = { admin, editor }`: "plain object [constructor] -> function Object", "plain object [toString] -> function toString", "plain object [**proto**] -> Object.prototype". The `??` fallback never fires because the inherited value isn't nullish. With `Object.hasOwn`, `Map.get` or `{ __proto__: null, ... }` all four inputs gave "Unknown role". The ternary chain on `===` returned "Unknown role" for `constructor`.
  - MDN: an object "has a prototype, so it contains default keys" "that could collide with your own keys if you're not careful." "`Object.hasOwn()` is intended as a replacement for" `Object.prototype.hasOwnProperty()`.
- **Caveat:** TypeScript's `Record<Status, string>` hides this when the key is typed as a union; the risk is keys from user input, URLs or JSON.
- **For the post:** a second behaviour change in the lookup rewrite, the kind an agent wouldn't see in tests that only use valid keys.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/ecma262-draft.txt`, `scratchpad/nested-ternaries-lit/A/check/rewrites/prototype-keys-output.txt`, `scratchpad/nested-ternaries-lit/A/src/mdn-content-04a0e78cf3119afe2a99e6449f6b74976654d69d-global_objects-map.md`, `scratchpad/nested-ternaries-lit/A/src/mdn-content-04a0e78cf3119afe2a99e6449f6b74976654d69d-global_objects-object-hasown.md`

### 8.10 `switch (true)` matches only cases strictly equal to `true`, so truthy values fall through; no rule in the three linters flags the pattern. VERIFIED (ECMA-262 draft); My check (local run)

- **Citation:** ECMA-262 draft (1.1), §14.12.3 CaseClauseIsSelected; my checks `scratchpad/nested-ternaries-lit/A/check/rewrites/switch-true.mjs` and `scratchpad/nested-ternaries-lit/A/check/switch-true-all-rules/`.
- **What it says:**
  - Spec: each case is evaluated in order and selected by "Return IsStrictlyEqual(input, clauseSelector)." So `case items.length:` and `case name:` never match `true` unless the value is the boolean `true`; a ternary chain tests with `ToBoolean` (1.1).
  - My check: `describe([1, 2, 3], '')` skipped `case items.length:` (3 is not `true`) and returned "has items (case items.length > 0)"; `describe([], 'Ada')` skipped `case name:` and returned "has name (case Boolean(name))". The equivalent ternary chain `items.length ? ... : name ? ... : ...` picked the first truthy branch.
  - All-rules runs on a `switch (true)` with boolean cases: ESLint 10.14.0 with `@eslint/js` `configs.all` plus every non-deprecated JS rule in unicorn 79.0.0 and sonarjs 4.2.2 reported only `sonarjs/file-header`, `unicorn/switch-case-braces` (×3) and `no-magic-numbers`; Oxlint 1.90.0 with every category including nursery reported `import/prefer-default-export`, `import/no-named-export`, `unicorn/switch-case-braces` (×3) and `no-magic-numbers`; Biome 2.6.4 with `preset: "all"` plus nursery reported nothing (a sanity file confirmed the preset was active). None of these target `switch (true)`.
- **Caveat:** no rule flags `switch (true)`, but none flags a non-boolean case under it either; TypeScript's type-aware rules (not run) might catch some non-boolean cases.
- **For the post:** `switch (true)` passes every rule Ultracite turns on (8.18) and reads like Go's tagless switch (8.7), but it silently changes truthiness to strict equality. Cases must be real booleans.
- **Text:** `scratchpad/nested-ternaries-lit/A/text/ecma262-draft.txt`, `scratchpad/nested-ternaries-lit/A/check/rewrites/switch-true-output.txt`, `scratchpad/nested-ternaries-lit/A/check/switch-true-all-rules/eslint-output.txt`, `scratchpad/nested-ternaries-lit/A/check/switch-true-all-rules/oxlint-output.txt`, `scratchpad/nested-ternaries-lit/A/check/switch-true-all-rules/biome-output.txt`, `scratchpad/nested-ternaries-lit/A/check/switch-true-all-rules/biome-sanity-output.txt`

### 8.11 React's 2015 docs offered IIFEs inside JSX; today's docs don't mention them, and each render creates a new function. VERIFIED (facebook/react v0.14.0 docs; react.dev search; ECMA-262 draft). Vendor (Meta)

- **Citation:** React, "If-Else in JSX," `docs/tips/03-if-else-in-JSX.md` at facebook/react `v0.14.0` (2015); reactjs/react.dev, code search on `IIFE` and `immediately invoked` (11 Nov 2026); ECMA-262 draft, §15.3.4 InstantiateArrowFunctionExpression.
- **What it says:**
  - 0.14 docs: "`if-else` statements don't work inside JSX." "This is because JSX is just syntactic sugar for function calls and object construction." "You probably want to make use of a ternary expression:"; otherwise use `if` outside the JSX, "Or if you prefer a more 'inline' aesthetic, define" immediately-invoked function expressions inside it (the example wraps a `switch` in `(() => { ... })()`).
  - react.dev: `gh search code` for `IIFE` in reactjs/react.dev returns only `scripts/buildRscWorker.mjs` and a `.claude/skills` file; `"immediately invoked"` and `"immediately-invoked"` return nothing. The current conditional rendering page doesn't offer IIFEs.
  - Spec: evaluating an arrow function runs InstantiateArrowFunctionExpression, which creates a new function object (`OrdinaryFunctionCreate`) each time, so an IIFE in a component body allocates a closure per render.
- **Caveat:** the allocation is real but small; I measured nothing. Whether the React Compiler hoists or memoizes IIFEs wasn't checked.
- **For the post:** the IIFE is React's own historical answer to statements-in-JSX, since dropped from the docs. It keeps the logic inline as a statement, at the cost of a closure per render and an extra level of nesting.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/react-v0.14.0-docs-tips-03-if-else-in-JSX.md`, `scratchpad/nested-ternaries-lit/A/text/ecma262-draft.txt`

### 8.12 React's docs say to extract components when nested conditional markup gets messy; cross-reference `length-limits.md` for splitting. VERIFIED (react.dev at a pinned commit). Vendor (Meta)

- **Citation:** react.dev, "Conditional Rendering," `src/content/learn/conditional-rendering.md` at reactjs/react.dev `46a54e05` (11 Nov 2026), https://react.dev/learn/conditional-rendering
- **What it says:** after the ternary examples: "This style works well for simple conditions, but use it in moderation." "If your components get messy with too much nested conditional markup," "consider extracting child components to clean things up." The page's last challenge is "Refactor a series of `? :` to `if` and variables", and the recap: "The shortcuts are common," "but you don't have to use them if you prefer plain `if`."
- **Caveat:** advice, not evidence. For research on whether splitting helps readers, cross-reference `length-limits.md` 4.46–4.52 (Letovsky and Soloway's delocalized plans; Silva da Costa et al. on Extract Method; Braver and Feitelson; Jbara and Feitelson; Cates et al. on intermediate variables); not re-verified here.
- **For the post:** React's own docs take the moderate position: ternaries are fine for simple conditions, and nesting is the signal to extract.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/react-dev-46a54e0592729712b7640308b53268e84fdc7c9f-conditional-rendering.md`

### 8.13 React renders `0` and `NaN` from `&&`, but not `false`, `null`, `undefined`, `true` or `''`. VERIFIED (react.dev at a pinned commit; React v19.3.1 source). Vendor (Meta)

- **Citation:** react.dev "Conditional Rendering" (8.12), the `&&` section and its Pitfall; facebook/react `v19.3.1` (14 Oct 2026), `packages/react-reconciler/src/ReactChildFiber.js`.
- **What it says:**
  - Docs: "React considers `false` as a 'hole' in the JSX tree," "just like `null` or `undefined`, and doesn't render anything in its place." Pitfall: "Don't put numbers on the left side of `&&`." If the left side is `0`, "React will happily render `0` rather than nothing." The fix it gives: "make the left side a boolean".
  - Source: a child becomes a text node if `(typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number' || typeof newChild === 'bigint'`, converted with `'' + newChild`, so `0` renders `0` and `NaN` renders `NaN`. After objects, functions and symbols: "Remaining cases are all treated as empty." That covers `true`, `false`, `null`, `undefined` and the empty string.
- **Caveat:** read from source, not run (React isn't installed in the worktree). The docs don't mention `NaN` or `true`; the source does by omission and by the `typeof` test. The lint rules for this are in 3.1–3.5.
- **For the post:** the rewrite from `cond ? <X /> : null` to `cond && <X />` (which `prefer-logical-operator`-style fixes and agents both reach for) is only equivalent when `cond` is a boolean.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/react-dev-46a54e0592729712b7640308b53268e84fdc7c9f-conditional-rendering.md`, `scratchpad/nested-ternaries-lit/A/src/react-v19.3.1-ReactChildFiber.js`

### 8.14 In React Native a stray `0` under a `<View>` threw in the legacy renderer; the Fabric renderer logs a dev-only error. VERIFIED (React source at v18.3.1 and v19.3.1; React Native docs at a pinned commit). Vendor (Meta)

- **Citation:** facebook/react `v18.3.1`, `packages/react-native-renderer/src/ReactNativeHostConfig.js` and `ReactFabricHostConfig.js`; facebook/react `v19.3.1`, `packages/react-native-renderer/src/ReactFiberConfigFabric.js` (the legacy host config is no longer in the directory at that tag); React Native docs, "Text," `docs/text.md` at facebook/react-native-website `753bf68f`.
- **What it says:**
  - Legacy renderer (v18.3.1): `createTextInstance` does `if (!hostContext.isInAParentText) { throw new Error('Text strings must be rendered within a <Text> component.'); }`.
  - Fabric (v18.3.1 and v19.3.1): the same check is inside `if (__DEV__)` and calls `console.error('Text strings must be rendered within a <Text> component.')`, then creates an `RCTRawText` node anyway.
  - RN docs: "you must wrap all the text nodes inside of a `<Text>` component" and "BAD: will raise exception, can't have a text node as child of a <View>".
- **Caveat:** what Fabric's native side does with a raw text node outside `<Text>` in a production build wasn't verified (no device, nothing installed). Saying it crashes is accurate for the legacy renderer; for Fabric the verified behaviour is a development error.
- **For the post:** the `0 &&` bug is worse on native than on the web, but describe it by renderer: an exception in the old architecture, a red-box error in development on Fabric.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/react-v18.3.1-ReactNativeHostConfig.js`, `scratchpad/nested-ternaries-lit/A/src/react-v18.3.1-ReactFabricHostConfig.js`, `scratchpad/nested-ternaries-lit/A/src/react-v19.3.1-ReactFiberConfigFabric.js`, `scratchpad/nested-ternaries-lit/A/src/rn-website-753bf68fc39adb21bcb4fcd57f5b84021dfe6190-text.md`

### 8.15 TC39's own answers, pattern matching and `do` expressions, both name the ternary as the problem and have sat at Stage 1 for years. VERIFIED (proposal READMEs, tc39/proposals and the process document at pinned commits)

- **Citation:** tc39/proposal-pattern-matching README at `ba73ffe4` (3 Oct 2025); tc39/proposal-do-expressions README at `3ef6d463` (3 Mar 2021); tc39/proposals `stage-1-proposals.md` at `07002d4d` (14 Oct 2026); tc39/process-document `index.html` at `1d498bdf` (22 Jan 2025).
- **What it says:**
  - Pattern matching: "**Stage**: 1"; "This proposal was approved for Stage 1 in the May 2018 TC39 meeting,". On `if/else`: "It's also statement-only" "(unless the author opts for the harder-to-understand ternary syntax)". One example uses `match` for "Concise conditional logic in JSX".
  - `do` expressions: "This proposal is in **stage 1**"; "Use conditional statements as expressions, instead of awkward nested ternaries:" followed by an `if / else if / else` inside `do { }`, and a JSX example. An `if` without an `else` can't end a `do` expression.
  - tc39/proposals lists both under Stage 1 (`do`: author Dave Herman, champion Kevin Gibbons, last linked notes January 2021). Process document, Stage 1: "This proposal is under consideration."
- **Caveat:** Stage 1 means the problem is accepted, not the solution; neither may ever ship. Pattern matching's champions include people from Microsoft and Google.
- **For the post:** the language's standards body has twice agreed that nested ternaries are the awkward spot in JavaScript's expression syntax, and hasn't yet shipped a replacement. Until then the choices are the ones in 8.1–8.13.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/tc39-pattern-matching-ba73ffe42f30f0cf56ece28bebdc28f955f2a52e-README.md`, `scratchpad/nested-ternaries-lit/A/src/tc39-do-expressions-3ef6d463b8163cbf222846b40d17178cca36e9e1-README.md`, `scratchpad/nested-ternaries-lit/A/src/tc39-proposals-07002d4d999558b9c7326f98e5134e0222b13808-stage-1-proposals.md`, `scratchpad/nested-ternaries-lit/A/text/tc39-process-document.txt`

### 8.16 When turning a ternary into statements changes behaviour: evaluation order, re-evaluated conditions, `const` to `let`, and missing branches. My check (local run)

- **Citation:** my checks `scratchpad/nested-ternaries-lit/A/check/rewrites/evaluation-order.mjs`, `scratchpad/nested-ternaries-lit/A/check/ts-equivalence/` (`rewrites.ts`, `tsc` 6.0.3 declaration emit), `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/fallthrough.ts`; unicorn's own comment in `rules/prefer-ternary.js` (79.0.0); react.dev "Preserving and Resetting State" at `46a54e05`.
- **What it says:**
  - Order: hoisting a ternary out of an argument list into an `if` moves its condition ahead of earlier arguments: "inline ternary order: a -> cond -> b" against "hoisted if/else order: cond -> b -> a". unicorn's `prefer-ternary` knows the same hazard in the other direction: it skips turning `let x = init; if (test) x = right;` into a ternary when `init` or `test` has side effects, because the rewrite builds `test ? right : init`, "so the initializer moves from before the test to after it." "A test with a side effect would observe the change."
  - Re-evaluation: a chain that calls its subject per branch, `roll() < 0.3 ? "low" : roll() < 0.6 ? "mid" : "high"`, called `roll()` twice and returned `high`; the if/else on one stored value called it once and returned `mid` ("ternary chain: tier = high | roll() calls = 2"). A rewrite that stores the value first changes the result (here it fixes a bug).
  - Types: identical for returns. `tsc` inferred `"positive" | "negative" | "zero"` for both the nested ternary and the early-return version, the same normalised object union for object-literal branches, and `number` for both narrowing versions. But `const label = n > 0 ? "positive" : "other"` infers `"positive" | "other"`, while `let label; if (...) label = "positive"; else label = "other";` (and the annotated or ternary `let`) infer `string`. In Ultracite's Oxlint core and in ESLint, `prefer-const` didn't report the `let` that's assigned in two branches (8.18, form B).
  - Missing branch: a ternary must have both arms; an `if` chain can fall off the end. With `strict`, the fall-through function's type became `"Waiting" | "Loading" | undefined` with no error; `--noImplicitReturns` gives "error TS7030: Not all code paths return a value."; ESLint's `consistent-return` reports "Expected to return a value at the end of arrow function"; Ultracite's Oxlint core reported nothing, since Oxlint 1.90.0 has only the type-aware `typescript/consistent-return`.
  - React: moving a JSX ternary into early returns keeps state only if the trees line up. react.dev: "it's the position in the UI tree--not in the JSX markup--that matters to React!" and "React doesn't know where you place the conditions in your function." Returning different wrappers from each branch resets state.
- **Caveat:** small hand-written cases; they show that the differences exist, not how often they occur in real code. TypeScript 6.0.3 only; the `let` widening is long-standing behaviour but wasn't checked on other versions.
- **For the post:** the rewrites are not mechanical. The guard-clause rewrite of a returned ternary is the safe one (same types, same laziness, same order when the ternary was the whole `return`). Rewrites to `let` lose literal types and immutability; rewrites that hoist out of an expression reorder evaluation.
- **Text:** `scratchpad/nested-ternaries-lit/A/check/rewrites/evaluation-order-output.txt`, `scratchpad/nested-ternaries-lit/A/check/ts-equivalence/tsc-output.txt`, `scratchpad/nested-ternaries-lit/A/check/ts-equivalence/tsc-noImplicitReturns-output.txt`, `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/fallthrough-output.txt`, `scratchpad/nested-ternaries-lit/A/src/eslint-plugin-unicorn-79.0.0-prefer-ternary.js`, `scratchpad/nested-ternaries-lit/A/src/react-dev-46a54e0592729712b7640308b53268e84fdc7c9f-preserving-and-resetting-state.md`

### 8.17 Since 2026, unicorn's `prefer-ternary` reports a lone guard clause before a return, and had to be fixed so guard chains didn't collapse into nested ternaries. VERIFIED (unicorn releases, issues and PRs; 79.0.0 source)

- **Citation:** sindresorhus/eslint-plugin-unicorn: issue #3656 (5 Sep 2026) and PR #3657, released in v75.0.0 (16 Sep 2026); issue #3919 (19 Oct 2026) and PR #3945, released in v79.0.0 (23 Oct 2026); `rules/prefer-ternary.js` in the installed 79.0.0.
- **What it says:**
  - #3656, "`prefer-ternary`: Support reporting `if () return; return;`", asks for `if (cond) return 4; return 3;` to become `return cond ? 4 : 3;`. v75.0.0: "`prefer-ternary`: Handle flat return statements (#3657)".
  - #3919: the pair "often ends a longer chain of early returns." "The rule reports only the last `if` of the chain." "The check also cascades." "When each guard returns a _different_ value," "the only result that satisfies the rule is a nested ternary," A comparator with six guards: "A full fix makes this a six-level nested ternary." It proposed that "A lone `if (a) return x; return y;` is still reported." v79.0.0: "`prefer-ternary`: Preserve consecutive early-return guards (#3945)".
  - 79.0.0 source: the `if` + `return` check is skipped when the previous statement is an `if` without `else` that returns; an `else if` is never reported on its own; and no merge happens if either branch already contains a ternary (`hasTernary`; "Functions and classes have their own ternary nesting context.").
- **Caveat:** these are the plugin author's and users' issue texts, not studies. Ultracite's Oxlint preset uses Oxlint's port, which behaves differently (8.18).
- **For the post:** a lint rule that pushes toward ternaries and a lint rule that bans nesting them interact, and the interaction was only fixed a month ago. It's direct evidence that flat guard clauses and a single expression are competing goals inside the same preset.
- **Text:** `scratchpad/nested-ternaries-lit/A/src/unicorn-issue-3656.json`, `scratchpad/nested-ternaries-lit/A/src/unicorn-issue-3919.json`, `scratchpad/nested-ternaries-lit/A/src/unicorn-pr-3657.json`, `scratchpad/nested-ternaries-lit/A/src/unicorn-pr-3945.json`, `scratchpad/nested-ternaries-lit/A/src/unicorn-releases.json`, `scratchpad/nested-ternaries-lit/A/src/eslint-plugin-unicorn-79.0.0-prefer-ternary.js`

### 8.18 What Ultracite's presets say about each rewrite: one guard clause passes Oxlint core but ESLint turns it into a ternary. My check (local run)

- **Citation:** my check `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/`: `forms.ts` and `guards.ts` linted with Ultracite's `config/oxlint/core/index.mjs` (worktree `cfa365be`) through a config that only extends it, and with ESLint 10.14.0 using `no-nested-ternary`, `no-else-return`, `prefer-const`, and `unicorn/prefer-ternary` and `unicorn/prefer-minimal-ternary` with the options in Ultracite's `config/eslint/core/rules/unicorn.mjs` (`["error", "always", { checkComputedMemberAccess: true, checkVaryingBase: true }]`).
- **What it says (same status union, seven forms):**
  - A, nested ternary: `no-nested-ternary` in both.
  - B, `let` assigned in an `if / else if / else` chain: nothing in either (no `prefer-const`, no `prefer-ternary`).
  - C, two early returns then a final return: nothing.
  - D, `if / else if / else` with a `return` in each: `no-else-return` in both.
  - E, `switch (true)` with braced cases: nothing. F, a `Record` lookup: nothing.
  - G, one-level `if/else` assigning a `let`: `unicorn/prefer-ternary` in both ("Prefer ternary expressions over simple `if-else` statements." in Oxlint).
  - H, one guard clause then the main return: nothing in Oxlint core; ESLint reports "This `if` statement can be replaced by a ternary expression" and `--fix` rewrites it to `return name === null ? "Hello, guest" : `Hello, ${name}`;` (`eslint-guards-fix-dry-run.txt`). I (two guards) and J (a guard that throws) pass both.
- **Caveat:** Oxlint core only, without type-aware rules; the ESLint run used the relevant rules with Ultracite's options, not the whole ESLint preset. Oxlint lists its `unicorn/prefer-ternary` with fix status `pending`, so on the Oxlint preset G is reported but not autofixed.
- **For the post:** under the default (Oxlint) setup, the rewrite Hayden prefers, early returns, is the one every rule accepts, and the `let` + `if` chain also passes but loses `const` (8.16). On the ESLint preset, a single `if (bool) return x;` before the last return is reported and autofixed into a ternary, which is the opposite of Hayden's stated preference. Raise this with Hayden before the post describes either preset.
- **Text:** `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/oxlint-output.txt`, `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/oxlint-guards-output.txt`, `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/eslint-output.txt`, `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/eslint-guards-fix-dry-run.txt`, `scratchpad/nested-ternaries-lit/A/check/ultracite-core-rewrites/oxlint-1.90.0-rules.json`

## 9. Developer preferences and surveys

### 9.1 Tómasdóttir, Aniche and van Deursen (IEEE TSE 2020): `no-ternary` is the rule developers least want; the nesting rules don't appear in any top-20 list. VERIFIED (accepted manuscript via Wayback); method in `length-limits.md` 4.69 and `func-style.md` 7.3

- **Citation:** Kristín Fjóla Tómasdóttir, Maurício Aniche, Arie van Deursen, _The Adoption of JavaScript Linters in Practice: A Case Study on ESLint_, IEEE TSE 46(8), 863–891, 2020, https://doi.org/10.1109/TSE.2018.2871058 ; read: http://web.archive.org/web/20240416135835/https://pure.tudelft.nl/ws/files/46810031/tse_js.pdf
- **Method:** "we analyzed 9,548 ESLint configuration files" "extracted from 86,366 JavaScript projects on GitHub." (February 2017); 6,413 with a preset, 3,135 without; a survey rating 54 rules (Stylistic Issues N = 244, Best Practices N = 251). Cross-reference `length-limits.md` 4.69.
- **What it says:**
  - `no-ternary`: disabled by 686 of 3,135 no-preset projects (21.9%, rank 3 of the most-disabled). In the survey, "the rule no-ternary is unquestionably the least important rule" "where 63.8% of participants consider it to be unimportant" and 9.6% important; "this rule had only been enabled 8 times in the 3,135 (0.3%)" no-preset projects. The authors: "Preset creators should make sure to not enable these rules" "as most developers do not want them to be used."
  - `curly`: enabled by 1,232 of 3,135 no-preset projects (39.4%, rank 7) and 515 of 6,413 preset users (8.0%, rank 9); in the survey 75% rate it important or very important (Fig. 8b), and Table 13 lists it among the most important rules (in the Google and Standard presets of the time).
  - `no-nested-ternary`, `no-unneeded-ternary`, `no-else-return` and `no-lonely-if` appear in none of the four top-20 tables and aren't mentioned in the text (grep of both text extractions).
- **Caveat:** 2017 data; "disabled" without a preset often means a generated config listing every rule; the survey rated only 14 rules per category, and the nesting rules weren't among them.
- **For the post:** the one large study has nothing on nested ternaries specifically; what it shows is that banning ternaries outright is unpopular, while braces on control statements are among the rules people value.
- **Text:** `scratchpad/nested-ternaries-lit/C/text/survey/tse_js.txt`, `scratchpad/nested-ternaries-lit/C/text/survey/tse_js-layout.txt`, `scratchpad/nested-ternaries-lit/C/src/survey/tse_js.pdf`

### 9.2 What large projects set for themselves: most allow nested ternaries. VERIFIED (config files at pinned commits); Vendor (Meta, Vercel, Microsoft, VoidZero/Oxc) where marked

- **Citation:** root lint configs at: facebook/react `.eslintrc.js` `cb7c59ec` (Vendor, Meta) and facebook/fbjs `packages/eslint-config-fbjs/index.js` `021f6115`; vercel/next.js `eslint.config.mjs` `3642b242` (canary; Vendor, Vercel); microsoft/TypeScript `eslint.config.mjs` at `v6.0.3` (main is now the Go codebase; Vendor, Microsoft); prettier/prettier `eslint.config.js` `8cd4ec12`; eslint/eslint `packages/eslint-config-eslint/base.js` `480afad6`; nodejs/node `eslint.config.mjs` `933cb117`; microsoft/vscode `eslint.config.js` and `oxlint.config.ts` `60b091fa` (Vendor, Microsoft); typescript-eslint `eslint.config.mjs` `2838b498`; sindresorhus/eslint-plugin-unicorn `eslint.config.js` `d17cfc0a`; oxc-project/oxc `oxlintrc.json` `29e97c0f` (Vendor, VoidZero); biomejs/biome `.biome.json` `ca039a13`. All read 11 Nov 2026.
- **What it says:**
  - Ban nested ternaries: ESLint's own config (`no-nested-ternary: "error"`, `curly: ["error", "all"]`, `no-else-return` with `allowElseIf: false`, `no-unneeded-ternary`); eslint-plugin-unicorn's repo (through XO's Unicorn `recommended`).
  - Allow them explicitly: React (`'no-nested-ternary': OFF`, also `no-else-return`, `no-lonely-if`, `no-negated-condition`, `no-ternary` OFF, `no-unneeded-ternary` WARNING), inlined from `eslint-config-fbjs` in PR #25915 (Jan Kassens, Dec 2022), whose current file has the same values; Prettier's repo (extends Unicorn `recommended`, then `"unicorn/no-nested-ternary": "off"`, `"unicorn/prefer-ternary": "off"`, `"unicorn/no-negated-condition": "off"`; keeps `curly`, `no-else-return`, `no-lonely-if`, `no-unneeded-ternary`).
  - Don't set it: Next.js (none of these rules), TypeScript 6.0.3 (extends `eslint` and `typescript-eslint` recommended and stylistic), Node.js (`no-else-return` and `no-lonely-if` only), VS Code (`curly: 'warn'` only; its Oxlint config converts the ESLint one), typescript-eslint (`curly: ['error', 'all']`, `no-else-return`, `no-lonely-if`), Oxc (`curly: ["error", "multi-line"]`), Biome (`noUselessElse` only).
  - Unicorn's own repo turns off its newer rules: `prefer-minimal-ternary` ("Disabled violations remain intentional in this codebase.") and `prefer-ternary` ("The codebase does not follow them yet."), plus `prefer-early-return`.
- **Caveat:** root configs only (some projects have nested configs); a setting isn't a measure of how often nesting occurs in the code. A count needs the corpus harness.
- **For the post:** of these 11 projects, 2 ban nested ternaries, 2 turn the ban off on purpose (React, and Prettier, the formatter whose output this rule interacts with), and 7 don't set it; the guard-clause rules (`no-else-return`, `no-lonely-if`) are more common than the nesting ban.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/projects/project-shas.txt`, `scratchpad/nested-ternaries-lit/C/src/projects/react-cb7c59ec-.eslintrc.js`, `scratchpad/nested-ternaries-lit/C/src/projects/fbjs-021f611582-eslint-config-fbjs-index.js`, `scratchpad/nested-ternaries-lit/C/src/projects/react-pr-25915.json`, `scratchpad/nested-ternaries-lit/C/src/projects/nextjs-3642b242-eslint.config.mjs`, `scratchpad/nested-ternaries-lit/C/src/projects/typescript-v6.0.3-eslint.config.mjs`, `scratchpad/nested-ternaries-lit/C/src/projects/prettier-8cd4ec12-eslint.config.js`, `scratchpad/nested-ternaries-lit/C/src/projects/eslint-480afad6-eslint-config-eslint-base.js`, `scratchpad/nested-ternaries-lit/C/src/projects/node-933cb117-eslint.config.mjs`, `scratchpad/nested-ternaries-lit/C/src/projects/vscode-60b091fa-eslint.config.js`, `scratchpad/nested-ternaries-lit/C/src/projects/vscode-60b091fa-oxlint.config.ts`, `scratchpad/nested-ternaries-lit/C/src/projects/tseslint-2838b498-eslint.config.mjs`, `scratchpad/nested-ternaries-lit/C/src/projects/unicorn-d17cfc0a-eslint.config.js`, `scratchpad/nested-ternaries-lit/C/src/projects/oxc-29e97c0f-oxlintrc.json`, `scratchpad/nested-ternaries-lit/C/src/projects/biome-ca039a13-.biome.json`

### 9.3 No survey asks about ternary preferences; State of JS never has. My check (Devographics/surveys at `e275a446`); VERIFIED for the absence

- **Citation:** Devographics/surveys `state_of_js/js2016/questions.yml` through `js2025/questions.yml` at `e275a446` (11 Nov 2026), https://github.com/Devographics/surveys
- **What it says:** 0 matches for "ternar" in any of the ten years' question files (grep output in `C/check/stateofjs-ternary-grep.txt`). The surveys ask about features such as `arrow_functions`, `nullish_coalescing` and `optional_chaining`; 2025's `top_currently_missing_from_js` question offers `js_pattern_matching` as an option. The only survey data on a ternary rule found is Tómasdóttir et al.'s rating of `no-ternary` (9.1).
- **Caveat:** absence in the question files; I didn't fetch results data.
- **For the post:** there is no preference data on nested ternaries to cite; say so.
- **Text:** `scratchpad/nested-ternaries-lit/C/check/stateofjs-ternary-grep.txt`, `scratchpad/nested-ternaries-lit/C/src/survey/stateofjs/js2025-questions.yml`, `scratchpad/nested-ternaries-lit/C/src/survey/stateofjs/js2020-questions.yml`

### 9.4 StandardJS declined the ban in 2016, and a fixer once changed what a nested ternary meant. ANECDOTAL (issues); VERIFIED for the ESLint bug report

- **Citation:** standard/standard issues #647 "New rule: no-nested-ternary" (Oct 2016, closed), #1262 "Nested ternaries are rewritten to mean something else than the original code" (Mar 2019), #1422 (2019–2020); eslint/eslint issue #8507 "Auto fix `no-unneeded-ternary` changes code behavior", reported by Feross Aboukhadijeh, 25 Apr 2017, closed by commit `eb14584a` (PR #8624), 19 May 2017. https://github.com/standard/standard/issues/647
- **What it says:**
  - #647: proposed because "Nested ternary expressions makes code really difficult to understand." Yosh (yoshuawuyts): "with proper indentation nested ternaries are fine imo". Feross Aboukhadijeh: "I suspect that this would break a lot of modules" "and the rule is not automatically fixable." Daniel Cousens, on a chained `varIntSize`: "I can't imagine how the use of a verbose set of `if` statements".
  - #8507 (ESLint 3.19.0, `defaultAssignment: false`): `value ? value : canSet ? 'unset' : 'can not set'` was fixed to `value || canSet ? 'unset' : 'can not set'`, which returns a different value: "When `--fix` is used, it is corrected to code that has different behavior." #1262 reported the same in Standard's demo two years later, fixed by upgrading ESLint.
  - #1422: Feross Aboukhadijeh on getify's plugin (4.19): "I don't think we want to take on a whole additional ESLint plugin".
- **Caveat:** maintainers' opinions; the bug is old and fixed. `no-unneeded-ternary`'s current fixer is in 2.4.
- **For the post:** "the rule is not automatically fixable" was a reason to reject it; and a real fixer bug shows how easily a textual rewrite of a nested ternary goes wrong, which matters when agents or fixers rewrite them.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/configs/standard-issue-647.json`, `scratchpad/nested-ternaries-lit/C/src/configs/standard-issue-647-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/standard-issue-1262.json`, `scratchpad/nested-ternaries-lit/C/src/configs/standard-issue-1262-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/standard-issue-1422-comments.json`, `scratchpad/nested-ternaries-lit/C/src/configs/eslint-issue-8507.json`, `scratchpad/nested-ternaries-lit/C/src/configs/standard-search-ternary.txt`

### 9.5 Stack Overflow's "Alternative to nested ternary operator in JS": the rule's fixes, and two ways people get around it. ANECDOTAL

- **Citation:** Stack Overflow question 32289340 (Aug 2015, score 67, 95,263 views, tagged `eslint`), https://stackoverflow.com/questions/32289340 ; top answers by score, via the public Stack Exchange API (no key) on 11 Nov 2026.
- **What it says:** the asker: "However in our project's ESLINT rules nested ternary operators are forbidden," and "I really don't want to turn it into a huge if / else statement". Accepted answer (T.J. Crowder, 44): the alternatives are if/else or a switch; "I tried to come up with a reasonable lookup map option," "but it got unreasonable fairly quickly." Second (40): "To my taste, a carefully structured nested ternary" "beats all those messy ifs and switches:". Third (26): an IIFE with one-line early returns. Lower answers (5 each) evade the rule: a `branch(condition, ifTrue, ifFalse)` helper, which evaluates every branch eagerly, and an `&&`/`||` chain, which falls through when a chosen value is falsy.
- **Caveat:** votes measure attention, not correctness; the search for "nested ternary" sorted by votes found few other questions this specific.
- **For the post:** a small, real catalogue of what people (and so models trained on them) reach for when the rule fires, including two workarounds that change behaviour.
- **Text:** `scratchpad/nested-ternaries-lit/C/src/survey/stackexchange/so-32289340-question.json`, `scratchpad/nested-ternaries-lit/C/src/survey/stackexchange/so-32289340-answers.json`, `scratchpad/nested-ternaries-lit/C/src/survey/stackexchange/se-stackoverflow-nested-ternary.json`

### 9.6 Eric Elliott, "Nested Ternaries are Great" (2018): the standard pro-chaining argument, with no sources. ANECDOTAL (blog, Wayback copy)

- **Citation:** Eric Elliott, "Nested Ternaries are Great," JavaScript Scene (Medium), 25 Jan 2018, https://medium.com/javascript-scene/nested-ternaries-are-great-361bddd0f340 ; read via Wayback capture of 10 Nov 2025 (Medium served a bot challenge). Cited in airbnb/javascript#1718.
- **What it says:** "Conventional wisdom is sometimes unwise." It calls nesting a misnomer for a flat chain: "We should probably call them “chained ternaries” instead." It claims "Less code = less surface area for bugs = fewer bugs." and appeals to working memory ("Working memory models typically involve 4–7 discrete quanta.") without citations. Its own flattened `if` version uses `if (!conditionA) return valueC;`, the early-return shape Hayden prefers, which it calls "That’s better," but still "more cluttered than the ternary version."
- **Caveat:** an opinion piece; its claims about bugs and working memory are unsupported in the text (cognitive-load research is in section 6).
- **For the post:** the strongest well-known statement of the other side; it agrees that early returns flatten logic, and disagrees only on whether the ternary chain is flatter still.
- **Text:** `scratchpad/nested-ternaries-lit/C/text/survey/elliott-nested-ternaries-wayback-20251110.txt`, `scratchpad/nested-ternaries-lit/C/src/survey/elliott/elliott-nested-ternaries-wayback-20251110.html`

## 10. LLMs and agents

10.1–10.7 are studies of model-written code and models on confusing code, 10.8–10.12 what agent vendors and community rule files say, and 10.13–10.14 agents fixing these rules and Ultracite's own fix prompt. Cross-references: `length-limits.md` §5, `func-style.md` §8, `cognitive-complexity.md` §5.

### 10.1 No study measures ternaries or nested ternaries in model-written JavaScript or TypeScript. Negative finding

- **Searched:** web searches on LLM-generated code with ternaries, conditional expressions, nesting depth and readability, and on atoms of confusion with LLMs; arXiv full texts of Wang et al. (10.2), Ye et al. (10.3), Sabra et al. (10.4), Abdelsalam et al. (10.5), Nguyen et al. (10.6), LintEval (arXiv:2610.20027), Blyth et al. (arXiv:2508.14419), CodeCureAgent (arXiv:2509.11787) and CORE (arXiv:2309.12938), each searched for `ternar`, `conditional expression`, `nested` and `S3358`.
- **Found:** two studies that count conditional style or nesting in model output, both Python only (10.2, 10.3); one vendor report whose rule list includes the nested-ternary rule but reports no count for it (10.4); none in JavaScript.
- **For the post:** whether agents write nested ternaries more or less than people is unmeasured. The corpus harness could count `ConditionalExpression` nesting depth in agent-authored pull requests.

### 10.2 Wang et al. (FSE 2025): conditional statement against conditional expression is one of their 24 style inconsistencies. VERIFIED (arXiv v2 full text); Python only; cross-reference `func-style.md` 8.1

- **Citation:** Yanlin Wang et al., _Beyond Functional Correctness: Investigating Coding Style Inconsistencies in Large Language Models_, PACMSE 2(FSE), FSE032, 2025, https://doi.org/10.1145/3715749 ; arXiv:2407.00456 v2.
- **What it says:** "Conditional Syntax Inconsistency" is "Inconsistencies in the syntax used for conditional statements within code.", covering one version that "employs conditional expressions or return statements with equivalent functionality." A separate type covers how conditions are written. The expression/statement dimension had the most inconsistencies (73.1%), mostly from API preference; control flow 18.0%.
- **Caveat:** per-type frequencies are only in radar charts, so there is no number for conditional syntax; Python's `x if c else y`, not `?:`; one ground truth per task.
- **For the post:** the one systematic style study treats statement versus expression conditionals as a dimension where models and people differ, without saying which way.
- **Text:** `scratchpad/nested-ternaries-lit/F/text/arxiv-2407.00456.txt`

### 10.3 Ye et al. (arXiv 2026): "Excessive Complexity", including deep nesting, is the most common readability issue in less readable LLM code. VERIFIED (arXiv v2 full text); Python only

- **Citation:** Hengzhi Ye, Fengyuan Ran, Weiwei Xu, Minghui Zhou (Peking University; Wuhan University), _Characterizing Readability Issue Patterns and the Role of Prompt Design in LLM-Generated Code_, arXiv:2605.13280 v2, 3 Aug 2026.
- **Method:** 2,735 Python scenarios from World of Code and LeetCode; GPT-5, Claude-4.6, DeepSeek-v4, Gemini 3 and Qwen 3.5; a readability model; thematic analysis of 500 sampled pairs.
- **What it says:** overall readability is "comparable to human-written code". Excessive Complexity is defined as code where "The logic or control flow is overly convoluted, deeply nested, or implemented via" "unnecessarily complicated mechanisms." "The most frequent issue in LLM-generated code is Excessive Complexity (EC),": 48 in the less readable LLM snippets against 41 in the less readable human ones (Table VI). "Unlike humans, LLMs do not" "inherently aim for a simple solution."
- **Caveat:** no breakdown by construct, so nothing on ternaries; small counts; Python.
- **For the post:** a readability study finds over-complex control flow is the main way model code reads worse, which fits a structural rule, but it can't say anything about the conditional operator.
- **Text:** `scratchpad/nested-ternaries-lit/F/text/arxiv-2605.13280.txt`, `scratchpad/nested-ternaries-lit/F/text/arxiv-2605.13280.layout.txt`, `scratchpad/nested-ternaries-lit/F/src/arxiv/arxiv-2605.13280-abs.html`

### 10.4 Sonar's LLM study counts the nested-ternary rule but files it under dead code, and reports no number for it. VERIFIED (arXiv full text); Vendor (Sonar); cross-reference `cognitive-complexity.md` 5.2

- **Citation:** Abbas Sabra, Olivier Schmitt, Joseph Tyler (Sonar), _Assessing the Quality and Security of AI-Generated Code: A Quantitative Analysis_, arXiv:2508.14727.
- **What it says:** in Appendix Table 13, `java:S3358` (the nested-ternary rule; SonarJS lists S3358 as "Ternary operators should not be nested") is assigned to "Dead/unused/redundant code", not to "Control/conditional logic smell". Table 9 gives that control-logic category as 2.20% (OpenCoder-8B) to 4.67% (Claude Sonnet 4) of each model's code smells, with the factor "Difficulty in balancing correctness and readability." The text: "LLMs may generate convoluted conditional logic."
- **Caveat:** Java only (4,442 tasks); no per-rule counts, so S3358's share is unknown; Sonar sells the analyser.
- **For the post:** the one vendor study that could have counted nested ternaries in model code doesn't report it separately. Don't cite it for a rate.
- **Text:** `scratchpad/nested-ternaries-lit/F/text/arxiv-2508.14727.txt`, `scratchpad/nested-ternaries-lit/F/text/arxiv-2508.14727.layout.txt`, `scratchpad/nested-ternaries-lit/F/src/sonarjs/README-4.2.2.md`

### 10.5 Abdelsalam et al. (arXiv 2025): model perplexity tracks human confusion on atoms of confusion, but the conditional operator isn't one of them. VERIFIED (arXiv full text)

- **Citation:** Youssef Abdelsalam, Norman Peitek, Anna-Maria Maurer, Mariya Toneva, Sven Apel (Saarland University; MPI-SWS), _How do Humans and LLMs Process Confusing Code?_, arXiv:2508.18547, 25 Aug 2025.
- **What it says:** 72 Java snippet pairs from Bergum et al.'s EEG and eye-tracking study, Qwen2.5-Coder-32B perplexity. Table 1 lists 11 atoms, including "Infix Operator Precedence" (`2 - 4 / 2`) and "Implicit Predicate"; no conditional operator.
- **Caveat:** the atom set came from the earlier human study. Atoms of confusion for humans are in section 6.
- **For the post:** the one study linking model confusion to human confusion left the ternary out, so it can't be used for this rule.
- **Text:** `scratchpad/nested-ternaries-lit/F/text/arxiv-2508.18547.txt`, `scratchpad/nested-ternaries-lit/F/text/arxiv-2508.18547.layout.txt`

### 10.6 Nguyen et al. (arXiv 2026): when LLMs rewrite numerical expressions, they drop conditional branches. VERIFIED (arXiv v4 full text)

- **Citation:** Tien Nguyen, Kirshanthan Sundararajah, Muhammad Ali Gulzar (Virginia Tech), _Assessing Large Language Models for Stabilizing Numerical Expressions in Scientific Software_, arXiv:2604.04854 v4, 17 Aug 2026.
- **Method:** 4 LLMs, 2,037 numerical expressions "including nested conditionals", up to six levels of nesting, across 469,000 tasks.
- **What it says:** "nested conditional expressions degrade LLM performance". For Claude Opus and GPT-OSS, "rejections arise" "almost exclusively from dropped conditionals" (12%–15.9% of checked candidates). Average accuracy was 86% on conditional and 86.5% on non-conditional expressions.
- **Caveat:** piecewise numerical expressions in a stabilisation task, not JavaScript ternaries; the accuracy gap is small.
- **For the post:** the closest measurement of models rewriting conditionals: in about one rewrite in seven, the best models lost a branch outright. That supports keeping a behaviour check behind any agent that refactors a ternary.
- **Text:** `scratchpad/nested-ternaries-lit/F/text/arxiv-2604.04854.txt`

### 10.7 Cross-reference: nesting and model performance in `cognitive-complexity.md` §5.1. Not re-verified

- CodeMind names nested constructs and complex conditional predicates as hard for models; Xie et al. (ICML 2026) find no consistent correlation between classical complexity metrics and model performance once length is controlled. Neither isolates ternaries. Frame any agent argument around review and behaviour, not model accuracy.

### 10.8 GitHub's Copilot docs: "Use early returns for error conditions", and guard clauses for nested `if`/`else`. ANECDOTAL (github/docs at a pinned commit); Vendor (GitHub/Microsoft)

- **Citation:** github/docs at `2b4f2c73` (11 Nov 2026): `content/copilot/tutorials/customization-library/custom-instructions/your-first-custom-instructions.md` (in its current path since 2 Sep 2025) and `content/copilot/tutorials/copilot-cookbook/refactor-code/improve-code-readability.md` (since 19 May 2026).
- **What it says:** the first example instructions file says "Use early returns for error conditions". The cookbook's "Reducing nested logic": "Deeply nested structures can make the code hard to follow," "making it difficult to modify or extend the logic of the code in future." For a Ruby method of nested `if`/`else`, Copilot "suggests using guard clauses to handle the conditions early and return the appropriate messages."
- **Caveat:** example content; the cookbook example is Ruby `if`/`else`, not ternaries. Searched 38 Copilot tutorial and customization pages; none mentions ternaries.
- **For the post:** a vendor's agent docs make Hayden's argument almost word for word: nesting is hard to modify, and early returns flatten it.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/ghdocs/files/content_copilot_tutorials_customization-library_custom-instructions_your-first-custom-instructions.md`, `scratchpad/nested-ternaries-lit/F/src/ghdocs/files/content_copilot_tutorials_copilot-cookbook_refactor-code_improve-code-readability.md`, `scratchpad/nested-ternaries-lit/F/src/ghdocs/path-history.txt`

### 10.9 Vercel's React agent skill: prefer a ternary to `&&` when the condition can be `0`, and early returns for performance. ANECDOTAL (vendor document at a pinned commit); Vendor (Vercel); cross-reference `func-style.md` 8.4

- **Citation:** vercel-labs/agent-skills, `skills/react-best-practices/AGENTS.md` at `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` (27 Oct 2026), §6.9 and §7.9.
- **What it says:**
  - §6.9 "Use Explicit Conditional Rendering", "Impact: LOW (prevents rendering 0 or NaN)": replace `{count && <span ...>}` with `{count > 0 ? <span ...> : null}`.
  - §7.9 "Early Return from Functions", "Impact: LOW-MEDIUM (avoids unnecessary computation)": "Return early when result is determined to skip unnecessary processing."
  - My count (grep for `?` outside optional chaining): 20 lines with a ternary in the skill's code, none nested.
- **My observation:** §7.9's rewrite isn't behaviour-preserving. The "incorrect" loop keeps going and returns the last error message it set; the "correct" version returns the first error. For a list with two invalid users the messages differ.
- **Caveat:** a vendor's instructions for models, read as data.
- **For the post:** the vendor's agent guidance pushes toward ternaries in JSX (for the `0` case) and toward early returns elsewhere, which is Ultracite's mix. The early-return example is a small, real case of a flattening rewrite changing which result comes back.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/vercel/react-best-practices-AGENTS-1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62.md`

### 10.10 OpenAI's GPT-5 guide quotes Cursor's prompt: "straightforward control flow", no "overly clever one-liners". ANECDOTAL (cookbook at a pinned commit); Vendor (OpenAI; Anysphere); cross-reference `func-style.md` 8.8

- **Citation:** openai/openai-cookbook at `2658c92cd4cd562504571b9d7491fc51524a7dc9`: `examples/gpt-5/gpt-5_prompting_guide.ipynb`, `examples/gpt-5/codex_prompting_guide.ipynb`.
- **What it says:** Cursor's tuned prompt: "Prefer readable, maintainable solutions with clear names, comments where needed," "and straightforward control flow." "Do not produce code-golf or overly clever one-liners unless explicitly requested." Cursor had found tool-call code "sometimes hard to read due to terseness". The Codex guide: "Conform to the codebase conventions: follow existing patterns, helpers, naming, formatting,".
- **Caveat:** prompt text, not a measurement; nothing names ternaries.
- **For the post:** the nearest vendor statement against dense conditional expressions in agent code, and it comes from a product team that saw terse output in practice.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/openai/gpt-5_prompting_guide-2658c92cd4cd562504571b9d7491fc51524a7dc9.txt`, `scratchpad/nested-ternaries-lit/F/src/openai/codex_prompting_guide-2658c92cd4cd562504571b9d7491fc51524a7dc9.txt`

### 10.11 Anthropic, Cursor and Google say nothing about ternaries; they say give the agent a linter and follow the codebase. ANECDOTAL (official docs and source); Vendor (Anthropic; Anysphere; Google); cross-reference `func-style.md` 8.7 and 8.9

- **Citations:** code.claude.com `/docs/en/best-practices.md` and `/docs/en/memory.md`, platform.claude.com _Prompting best practices_ (all read 11 Nov 2026); cursor.com/docs/context/rules (read 11 Nov 2026); google-gemini/gemini-cli `packages/core/src/prompts/snippets.ts` and `GEMINI.md` at `aeb6c04b093eb00c33585ba587c4889ae4c5e957` (11 Nov 2026).
- **What it says:**
  - Anthropic: "Give Claude something it can run that comes back pass or fail.", with a linter among the examples. The prompting guide's sample: "A bug fix doesn't need surrounding code cleaned up." Some Claude models "have a tendency to overengineer by creating extra files, adding unnecessary abstractions,".
  - Cursor: "Use a linter instead. Agent already knows common style conventions."
  - Gemini CLI's system prompt: "Rigorously adhere to existing workspace conventions, architectural patterns, and style" and "NEVER use hacks like disabling or suppressing warnings,".
  - None of these pages mentions ternaries, early returns or guard clauses.
- **Caveat:** docs change; the Anthropic and Cursor pages are unversioned and were read on 11 Nov 2026.
- **For the post:** vendors leave conditional style to the project's linter. With `no-nested-ternary` on, the agent gets an error; without it, the agent copies whatever the file already does.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/anthropic/claude-code-best-practices.md`, `scratchpad/nested-ternaries-lit/F/src/anthropic/claude-prompting-best-practices.md`, `scratchpad/nested-ternaries-lit/F/src/cursor/docs-context-rules.txt`, `scratchpad/nested-ternaries-lit/F/src/gemini/files/packages_core_src_prompts_snippets.ts`, `scratchpad/nested-ternaries-lit/F/src/gemini/SHA.txt`

### 10.12 Community agent rule files: early returns and guard clauses come up more than ternaries, and one file bans nested ternaries. ANECDOTAL (my count at pinned commits)

- **Citation:** PatrickJS/awesome-cursorrules at `b044f956f021b6e8877f16781bcfc466a6a120e9` (41,149 stars on 11 Nov 2026), all 257 `rules/**/*.mdc`; github/awesome-copilot at `30a0d7465b14b05e05949d6588b99f7af0c537b4` (41,058 stars), all 195 `instructions/*.instructions.md`.
- **Method (11 Nov 2026):** `F/check/rulefiles/count_terms.py`, case-insensitive regular expressions for `ternar`, `nested ternar`, `early return`/`return early` and `guard clause`.
- **What it found:**
  - awesome-cursorrules: 2 files mention ternaries, 11 early returns, 7 guard clauses. The one ban: "No nested ternaries". The other: "Prefer conditional classes over ternary operators for class attributes." The commonest early-return line, in three files: "Use early returns for error conditions to avoid deeply nested if statements."
  - awesome-copilot: 4 files mention ternaries, all in favour (Apex: "For simple conditional assignments to improve readability."; ColdFusion, twice: "Use ternary operators where possible"; Scala: "Exception: one-line ternary (side-effect free)"); none mentions nested ternaries; 3 mention early returns (Go: "Prefer early return over if-else chains;") and 3 guard clauses.
- **Caveat:** stars aren't use; the files are instructions written for models, read as data; a regular-expression count.
- **For the post:** across both collections, 14 files ask for early returns and 10 for guard clauses, against 6 that mention ternaries, and the only JavaScript-relevant ternary line is the one ban. What practitioners tell agents is about flat `if` code, not about the operator; the pro-ternary lines are for Apex, ColdFusion and Scala.
- **Text:** `scratchpad/nested-ternaries-lit/F/check/rulefiles/awesome-cursorrules-b044f956-counts.txt`, `scratchpad/nested-ternaries-lit/F/check/rulefiles/awesome-copilot-30a0d746-counts.txt`, `scratchpad/nested-ternaries-lit/F/check/rulefiles/count_terms.py`

### 10.13 Agents fixing nested-ternary rules: no study, and the static-analysis repair benchmarks leave the rule out. Negative finding; cross-reference `length-limits.md` 5.39, 5.40, 5.51–5.53

- **Searched:** Sorald's handled rules at `ASSERT-KTH/sorald` `6b808726` (18 Jul 2026) list no S3358 or any ternary rule; CodeCureAgent, CORE, LintEval and Blyth et al. full texts contain no `ternar` (10.1). Issue searches for `ternary` in anthropics/claude-code, openai/codex, google-gemini/gemini-cli and cline/cline found only issues about the tools' own code.
- **What carries over:** LintEval's a third of files broken without tests, CORE's analyser-passing fixes that change behaviour, CodeCureAgent's reliance on re-running the analyser, and Ultracite's own agent experiment (16 of 16 behaviour-preserving under a prompt that forbids cheating), all in `length-limits.md`.
- **For the post:** if the post wants a number for agents and nested ternaries, it has to come from the agent harness, with tests that catch the falsy-value and precedence changes in 7.13, 7.24 and 7.25.

### 10.14 Ultracite's agent-fix prompt says nothing about conditionals, but its rule against equivalent constructs covers the obvious escape. ANECDOTAL (source in the worktree at `cfa365be`)

- **Citation:** `packages/cli/src/agent-fix/prompt.ts` (read only; Ultracite is covered in section 11).
- **What it says:** no mention of ternaries, conditionals or early returns. Relevant lines: "For a style rule, keep runtime behavior the same." and "An edit that only hides the code from the rule" "(rewording it, re-spelling it, an equivalent construct) is not a fix,". There are specific lines for hook dependencies and size limits, none for conditionals.
- **For the post:** an agent could clear `no-nested-ternary` by moving the inner ternary into a helper or an IIFE; the prompt's "equivalent construct" line forbids that in principle, without naming it.
- **Text:** `scratchpad/nested-ternaries-lit/F/src/ultracite/agent-fix-prompt.ts`

## 11. Ultracite's own history

11.1 is the timeline from `git log -S` over everything but `apps/`, `research/` and the changelog (search strings: `no-nested-ternary`, `noNestedTernary`, `prefer-ternary`, `no-nested-conditional`, `no-unneeded-ternary`, `prefer-logical-operator-over-ternary`, `prefer-minimal-ternary`, `no-ternary`, `noTernary`, `noUselessTernary`, `no-negated-condition`, `noNegationElse`, `no-else-return`, `noUselessElse`, `no-lonely-if`, `useCollapsedElseIf`, `useCollapsedIf`, `useBlockStatements`, `jsx-no-leaked-render`, `noLeakedRender`, `jsx-numeric-and-leaked-render`, `ping-pong`, `multiline-ternary`, `operator-linebreak`, `experimentalTernaries`, `curly: "error"`, `curly: 'error'`, `"curly": "error"`, and the agent-rule sentences), `packages/cli/CHANGELOG.md`, and read-only `gh api search/issues` on haydenbleasel/ultracite for `ternary`, `ternaries`, `nested ternary`, `prefer-ternary`, `no-nested-ternary`, `noNestedTernary`, `ping-pong`, `curly`, `early return`, `useBlockStatements`, `braces`, `no-else-return`, `noUselessElse`, `negated condition`, `no-negated-condition`, `noNegationElse`, `leaked render`, `jsx-no-leaked-render`, `no-nested-conditional`, `conditional`, `guard clause`, `no-lonely-if`, `prefer-logical-operator-over-ternary` and `no-unneeded-ternary` (11 Nov 2026). Results are in `scratchpad/nested-ternaries-lit/main/src/ultracite/` (`git-log-S.txt`, `commit-messages.txt`, diffs and copies of the config files, emails redacted) and `scratchpad/nested-ternaries-lit/main/src/gh/`. 11.2–11.5 are the recorded reasons and incidents, 11.6 what the presets set now (worktree at `cfa365be`, 11 Nov 2026), 11.7–11.10 what each preset reports and fixes on the same small files, 11.11 what Ultracite tells agents, 11.12 the public record of users, 11.13 Hayden's account. The corpus measurements for this topic are being built separately in `research/corpus/results/nested-ternaries/`; nothing here depends on them.

### 11.1 Timeline: on since the first commit (apart from ten weeks in 2024), through four config styles, with one recorded change. VERIFIED (git history, changelog, issues)

| Date | Commit (release) | What happened |
| --- | --- | --- |
| 18 Mar 2022 | `e403fb15` "Create ESLint configuration" | The first config lists every ESLint rule by hand. Under "ESLint Suggestions: These rules suggest alternate ways of doing things": `curly`, `no-else-return`, `no-lonely-if`, `no-negated-condition`, `no-nested-ternary` and `no-unneeded-ternary` are `"error"`, `no-ternary` is `"off"`; `multiline-ternary` and `operator-linebreak` are `"off"` (formatting, left to Prettier). No comment gives a reason for any of them. |
| 14 Jan 2023 | `5b7d6da3` "Harmony V2 (#83)" | Moved to a flat config split into rule files; the same values. |
| 27–28 May 2024 | `d2e2497c` (#132), `9f717281` (#135) | SonarJS and `eslint-plugin-unicorn` added; Unicorn's `no-nested-ternary`, `prefer-ternary` and `prefer-logical-operator-over-ternary` on. |
| 29 Jun 2024 | `e6f31237` "Use new eslint/js for rules" | ESLint rules switched to `configs.all` plus overrides; the changelog: "instead of hand-listing every rule". `no-ternary` stays off. |
| 18 Jul 2024 | `c92a9d2e` (#140) | Ultracite becomes Biome-only. The Biome config uses `"all": true` (and `nursery.all`), so every Biome rule is on, with no ESLint or Unicorn rules left. |
| 1 Oct 2024 | `93930b61` "Update Biome" | Biome `^1.9.3`, the release that added `noNestedTernary` as a nursery rule; `nursery.all` turns it on. From 18 Jul to 1 Oct 2024 (Biome 1.8.3 and 1.9.0–1.9.2), Ultracite had no nested-ternary rule at all. |
| 22 Jun 2025 | `871ee738` "Ultracite v5 (#162)" | "remove all:true": each Biome rule is listed with its one-line doc as a comment, including `noNestedTernary` ("Disallow nested ternary expressions."), `noUselessTernary`, `noNegationElse`, `noUselessElse`, `useBlockStatements`, `useCollapsedElseIf` and `useCollapsedIf`. The generated agent rules file gets "Don't use nested ternary expressions." and "Follow curly brace conventions." |
| 2 Nov 2025 | `18ed1f31` "Resolves #343" | The agent rules file is rewritten into principles (11.11). |
| 28 Dec 2025 | `c4a205f8` "V7 (#466)" | Oxlint and ESLint presets return. Oxlint turns on whole categories (`correctness`, `perf`, `restriction`, `suspicious`, `pedantic`, `style`) with `no-ternary` off; ESLint uses `configs.all` and every Unicorn and SonarJS rule. In the ESLint preset `eslint-config-prettier` is spread after the core rules, so `curly` is off there, and before the Unicorn rules, so `unicorn/no-nested-ternary` stays on (below). |
| 7 Feb 2026 | `4b9d206b` "Resolves #546" (7.1.4) | Biome `useBlockStatements` gets `"fix": "safe"`, on a user's request (11.4). |
| 13 Apr 2026 | `a63d9c57` "Resolves #660" | The Oxlint preset lists every rule explicitly, `no-nested-ternary`, `unicorn/no-nested-ternary`, `unicorn/prefer-ternary` and the rest included, at `"error"`. |
| 7 May 2026 | `aba89bb7` (7.6.4) | `unicorn/no-negated-condition` on in Oxlint: "the unicorn variant additionally covers ternary expressions". |
| 4–7 Jul 2026 | `2687cf9f`, `44403937`, `29e30ce9`, `d186c53c` | ESLint re-enables `curly` after `eslint-config-prettier` (11.5); SonarJS rules, `no-nested-conditional` among them, run through Oxlint's JS plugins, first in core and then (#742) only in the opt-in `js-plugins` preset. |
| 4 Sep 2026 | `7b0456e6` (#791, 7.10.8) | `unicorn/no-nested-ternary` turned off in the Oxlint and ESLint presets (11.3). |
| 28 Sep 2026 | `f7599efd` (7.12.2) | `eslint-config-prettier` moved after every plugin in the ESLint preset, which would now turn `unicorn/no-nested-ternary` off on its own. |
| 25 Oct 2026 | `72890bec` (8.1.0) | Unicorn 79: `prefer-ternary` set to `"always"` with `checkComputedMemberAccess` and `checkVaryingBase`, and `prefer-minimal-ternary` gets the same two options (11.6). |

- **Recorded reasons:** none for `no-nested-ternary`, `curly`, `prefer-ternary` or the other rules being on; they arrived as part of every-rule-on configs (11.2). The only recorded reasons are for turning `unicorn/no-nested-ternary` off (11.3), for re-enabling `curly` in ESLint (11.5), for Biome's safe block fix (11.4), and for the two new Unicorn options (11.6).
- **Text:** `scratchpad/nested-ternaries-lit/main/src/ultracite/git-log-S.txt`, `scratchpad/nested-ternaries-lit/main/src/ultracite/commit-messages.txt`, `scratchpad/nested-ternaries-lit/main/src/ultracite/biome-version-history.txt`, `scratchpad/nested-ternaries-lit/main/src/ultracite/e403fb15-src-eslint.js`, `scratchpad/nested-ternaries-lit/main/src/ultracite/c4a205f8-eslint-core.config.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/871ee738-ultracite.mdc`, `scratchpad/nested-ternaries-lit/main/src/ultracite/871ee738-biome.jsonc`, `scratchpad/nested-ternaries-lit/main/src/ultracite/CHANGELOG.md`

### 11.2 The strictness policy: every rule on unless there's a written reason, from 2022 to now. VERIFIED (AGENTS.md, config history)

- **Source:** `AGENTS.md` at `cfa365be` ("Rules for changing rules"); the configs in 11.1.
- **What it says:** "Prefer maximum strictness over parity with a tool's defaults." Oxlint presets list every non-nursery rule; ESLint presets enable every non-deprecated plugin rule. "Turn a rule off only with a comment saying why" (false positives, an upstream bug, a conflict with another rule).
- **How the ternary rules fit:** each one is on because it exists. `no-ternary`, the only rule here that is off everywhere, has had no comment in any version; it reports every conditional expression, so it would contradict `prefer-ternary` and `prefer-logical-operator-over-ternary`, but the config doesn't say so. `unicorn/no-nested-ternary` is the one rule in the group turned off with a comment (11.3).
- **For the post:** "it was the strictness policy" (Hayden, 11.13) is accurate as history: the rule came in with every other rule in 2022 and has been carried through each rewrite. The post should present the comprehension and modification arguments as reasons for keeping it, not as the reason it was added.
- **Text:** `scratchpad/nested-ternaries-lit/main/src/ultracite/AGENTS.md`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/oxlint-core-index.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/eslint-core-rules-eslint.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/biome-core.jsonc`

### 11.3 #791: `unicorn/no-nested-ternary` turned off because its fix and the formatter undo each other (Sep 2026). VERIFIED (PR, commit, changeset)

- **Source:** Keyur Govrani, "fix(cli): run lint fixes before the formatter in `ultracite fix`," haydenbleasel/ultracite PR #791, opened 2 Sep 2026, merged 4 Sep 2026 as `7b0456e6` (co-authored by Hayden). https://github.com/haydenbleasel/ultracite/pull/791
- **What it says:**
  - The PR's main change is the order of `fix`: "A fixer can insert code that is not in the formatter's shape," with `curly` as the example (`if (a) return 1;` became `if (a) {return 1;}` until a second run). Keyur Govrani found it in a large monorepo, where `pnpm fix` "left every `curly` fix on one line until the next run."
  - A later commit in the PR turns the Unicorn rule off. Commit message: "its fixer adds parentheses that oxfmt and Prettier strip," "so every fix run" "rewrote the file twice." Changeset: "The core `no-nested-ternary` rule still reports nested ternaries."
  - The Oxlint comment as merged: "Its fixer wraps the inner ternary in parentheses that oxfmt strips, so" "every `fix` run ping-pongs." It adds that eslint-config-prettier "disables it for the" same reason. The ESLint comment first said the two "fight inside `eslint --fix`" and was reworded to "ping-pongs" in `ed5ed04d` (10 Oct 2026).
  - No human comment in the PR discusses the ternary change; the only other comments are bots.
- **Checked:** `eslint-config-prettier` 10.1.8 does set `"unicorn/no-nested-ternary": "off"` (`index.js`), but its README gives no reason for that line (it documents `curly` and other "special rules", not this one). The reason in Ultracite's comment is Ultracite's own reading; the formatter section (5) has the upstream history.
- **For the post:** the one rule Ultracite turned off in this group was turned off for a tool conflict, not because nesting is fine. The core rule, which has no fixer, still reports the same code.
- **Text:** `scratchpad/nested-ternaries-lit/main/src/gh/pr-791.json`, `scratchpad/nested-ternaries-lit/main/src/ultracite/7b0456e6.diff`, `scratchpad/nested-ternaries-lit/main/src/ultracite/commit-messages.txt`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/oxlint-core-index.mjs`, `scratchpad/nested-ternaries-lit/main/src/eslint-config-prettier-10.1.8/index.js`, `scratchpad/nested-ternaries-lit/main/src/eslint-config-prettier-10.1.8/README.md`

### 11.4 #546: a user asked for Biome's block fix to be safe, and got it (Jan–Feb 2026). VERIFIED (issue, commit, docs)

- **Source:** jon-hotaisle, "useBlockStatements fix safe," haydenbleasel/ultracite #546, 27 Jan 2026; fixed in `4b9d206b` (7 Feb 2026, 7.1.4). https://github.com/haydenbleasel/ultracite/issues/546
- **What it says:** the request, with a config snippet setting `"fix": "safe"`: "I'm willing to roll the dice if you are," "and this is driving me batty." Changeset: "Make `useBlockStatements` fix safe". The configuration docs now list it among the fixes Biome marks unsafe that Ultracite applies anyway: "These fixes are non-breaking in practice:" and `useBlockStatements` "Wraps single-line control flow bodies in curly braces".
- **For the post:** with Biome, `if (bool) return x;` is rewritten to a block on every `ultracite fix`, by request. It is the user-visible end of the `curly` policy (11.9).
- **Text:** `scratchpad/nested-ternaries-lit/main/src/gh/issue-546.json`, `scratchpad/nested-ternaries-lit/main/src/ultracite/CHANGELOG.md`, `scratchpad/nested-ternaries-lit/main/src/ultracite/docs/configuration.mdx`

### 11.5 `curly` in the ESLint preset: off for six months under eslint-config-prettier, then restored (Dec 2025–Jul 2026). VERIFIED (config at commits)

- **Source:** `c4a205f8` (V7), `2687cf9f` (4 Jul 2026), `f7599efd` (28 Sep 2026).
- **What happened:** in V7's ESLint preset, `...eslintPrettier.rules` came after `...eslintRules`, so `eslint-config-prettier`'s `curly: 0` won; the Oxlint preset had `curly` on through its `style` category. `2687cf9f`: "re-enable curly and" "no-unexpected-multiline past eslint-config-prettier." The comment: "eslint-config-prettier disables these defensively, but they don't" conflict with Ultracite's Prettier settings. eslint-config-prettier's README agrees for the default: only the `"multi-line"` or `"multi-or-nest"` option means the rule "can conflict with Prettier".
- **For the post:** history only. Since July 2026 all three presets report an unbraced `if` body.
- **Text:** `scratchpad/nested-ternaries-lit/main/src/ultracite/c4a205f8-eslint-core.config.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/2687cf9f.diff`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/eslint-core-eslint.config.mjs`, `scratchpad/nested-ternaries-lit/main/src/eslint-config-prettier-10.1.8/README.md`

### 11.6 What the presets set now (worktree at `cfa365be`, 11 Nov 2026). VERIFIED (config source)

| Rule | Oxlint core | ESLint core | Biome core |
| --- | --- | --- | --- |
| Nested ternaries | `no-nested-ternary` error; `unicorn/no-nested-ternary` off | `no-nested-ternary` error; `unicorn/no-nested-ternary` off; `sonarjs/no-nested-conditional` error | `noNestedTernary` error |
| Any ternary | `no-ternary` off | `no-ternary` off | `noTernary` off |
| Ternary to logical | `no-unneeded-ternary`, `unicorn/prefer-logical-operator-over-ternary` | same | `noUselessTernary` |
| if/else to ternary | `unicorn/prefer-ternary` (`"error"`, no options) | `unicorn/prefer-ternary: ["error", "always", { checkComputedMemberAccess: true, checkVaryingBase: true }]`, `unicorn/prefer-minimal-ternary` with the same two options | none |
| Negated conditions | `no-negated-condition`, `unicorn/no-negated-condition` | same | `noNegationElse` |
| else after return | `no-else-return` | `no-else-return`, `unicorn/no-useless-else` | `noUselessElse` |
| Lonely if | `no-lonely-if`, `unicorn/no-lonely-if` | same | `useCollapsedElseIf`, `useCollapsedIf` |
| Braces | `curly` (`"all"`) | `curly` (`"all"`) | `useBlockStatements`, `fix: "safe"` |
| Ternary in loop condition | `no-unmodified-loop-condition` with `checkConditionalExpressions: true` | same | none |
| Cognitive complexity | `sonarjs/cognitive-complexity` 20 in the opt-in `js-plugins` preset only | `sonarjs/cognitive-complexity` 20 | `noExcessiveCognitiveComplexity` (see `cognitive-complexity.md`) |
| `&&` in JSX (React presets) | none natively; `react-doctor/jsx-numeric-and-leaked-render` in `js-plugins` | `react/jsx-no-leaked-render` (every eslint-plugin-react rule is on) and `react-doctor/jsx-numeric-and-leaked-render` | `noLeakedRender` |

- **Comment on the new options:** "Also merge branches that differ only in the callee or a computed member," "as in (test ? a : b)(value)." The commit calls both options "pure" "tightenings with nothing to conflict with" (`72890bec`).
- **Caveat:** `unicorn/no-useless-else` showed up in my ESLint run (11.7); it is on through the every-Unicorn-rule pattern, not listed by name.
- **Text:** `scratchpad/nested-ternaries-lit/main/src/ultracite/config/oxlint-core-index.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/eslint-core-rules-unicorn.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/eslint-core-rules-eslint.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/eslint-core-rules-sonarjs.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/biome-core.jsonc`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/biome-react.jsonc`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/oxlint-js-plugins-index.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/config/eslint-react-rules-react.mjs`, `scratchpad/nested-ternaries-lit/main/src/ultracite/commit-messages.txt`

### 11.7 What each preset reports on the same files. My check (local run, 11 Nov 2026; Oxlint 1.90.0, ESLint 10.14.0, Biome 2.6.4, Ultracite's core presets unchanged)

- **Files** (`scratchpad/nested-ternaries-lit/main/check/presets/`): `nested.ts` (`n > 100 ? "large" : n > 10 ? "medium" : "small"`), `early.ts` (the same as three braced early returns), `elseif.ts` (an `if`/`else if`/`else` chain of returns), `ifelse2.ts` (a two-way choice as an early return and as `if`/`else`), `guard.ts` (Hayden's `if (bool) return x;`, inside a `for...of` loop and at the top of a function).
- **Reports:**

| File | Oxlint | ESLint | Biome |
| --- | --- | --- | --- |
| `nested.ts` | `no-nested-ternary` | `no-nested-ternary`, `sonarjs/no-nested-conditional` | `noNestedTernary` |
| `early.ts` | none | none | none |
| `elseif.ts` | `no-else-return` | `no-else-return`, `unicorn/no-useless-else` | `noUselessElse` (twice) |
| `ifelse2.ts`, early-return form | none | `unicorn/prefer-ternary` | none |
| `ifelse2.ts`, `if`/`else` form | `no-else-return`, `unicorn/prefer-ternary` | `no-else-return`, `unicorn/no-useless-else`, `unicorn/prefer-ternary` | `noUselessElse` |
| `guard.ts` | `curly` twice | `curly` twice, `unicorn/prefer-ternary` on the function-level guard | `useBlockStatements` twice |

- **Messages:** Oxlint: "Do not nest ternary expressions." with help "Refactor nested ternary expressions into if-else statements for better readability."; ESLint `sonarjs/no-nested-conditional`: "Extract this nested ternary operation into an independent statement"; Biome: "Nesting ternary expressions can make code more difficult to understand." and "Convert nested ternary expression into if-else statements" "or separate the conditions to make the logic easier to understand."; ESLint `unicorn/prefer-ternary`: "This `if` statement can be replaced by a ternary expression".
- **What it shows:** the three-way early return is the one form every preset accepts. In ESLint, a two-way early return is reported by `unicorn/prefer-ternary`, which Oxlint's port does not do (2.11, 2.18). ESLint gives two diagnostics for one nested ternary.
- **Text:** `scratchpad/nested-ternaries-lit/main/check/presets/out-oxlint-check.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-eslint-check.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-biome-lint.txt`

### 11.8 The same simple ternaries get two reports in Oxlint and ESLint, and Biome explains its rules differently. My check (local run, as 11.7)

- **File:** `dupes.ts` in `scratchpad/nested-ternaries-lit/main/check/presets/`: `a ? a : b`, `x > 1 ? true : false`, `!ready ? "wait" : "go"`, and an `else` holding only an `if`.
- **Oxlint and ESLint:** the negated ternary is reported twice with the same text, "Unexpected negated condition", by `no-negated-condition` and `unicorn/no-negated-condition` at the same column. `a ? a : b` gets only `unicorn/prefer-logical-operator-over-ternary` ("Prefer using a logical operator over a ternary"); `no-unneeded-ternary` reports only the boolean-literal case. ESLint adds `unicorn/no-useless-else` next to `no-else-return` on the same `else`.
- **Biome:** one report each. `noNegationElse`: "A negated condition with an else branch" "makes the reader reverse the logic twice."; `noUselessElse`: "The clause adds a level of nesting without changing behavior."; `useCollapsedElseIf`: "An else block that only contains an if statement" "adds a level of nesting without need." `noUselessTernary`'s fix is marked unsafe. Biome has nothing in the preset for `a ? a : b`.
- **For the post:** a reader of the diagnostics counts the same problem twice in two of the three linters; Biome's help text is the closest any tool comes to stating the readability argument.
- **Text:** `scratchpad/nested-ternaries-lit/main/check/presets/out-oxlint-dupes.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-eslint-dupes.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-biome-dupes.txt`

### 11.9 What `ultracite fix` makes of the same files: early returns under Oxlint and Biome, ternaries under ESLint. My check (local run, as 11.7, then Oxfmt 0.75.0 and Prettier 3.9.10 with Ultracite's configs)

- **Oxlint `--fix`, then Oxfmt:** `guard.ts` becomes braced early returns (Oxlint writes `if (value < 0) {return value;}` and Oxfmt then splits it over three lines); `elseif.ts` and both `ifelse2.ts` functions become early returns (`no-else-return`'s fix applies, and `prefer-ternary` stops reporting once there's no `else`). A second Oxlint run is clean. `nested.ts` keeps its error: no fix.
- **ESLint `--fix`, then Prettier:** the function-level `if (isAdmin) return "admin"; return "user";` becomes `(isAdmin ? "admin" : "user")` as a concise arrow body; both `ifelse2.ts` functions become `(n > 10 ? "big" : "small")`; `elseif.ts` becomes three early returns; the loop guard gets braces. A re-run is clean except `nested.ts`.
- **Biome `check --write`:** braces on both guards, early returns for `elseif.ts` and `ifelse2.ts`; `nested.ts` keeps `noNestedTernary` (no fix).
- **What it shows:** the same input converges on different code. A two-way choice ends as a ternary under ESLint and as an early return under Oxlint and Biome. Hayden's `if (bool) return x;` survives none of them unchanged: all three add braces, and ESLint turns the function-level one into a ternary. No preset's fix produced a nested ternary from these files: `prefer-ternary` left the three-way chain alone.
- **Text:** `scratchpad/nested-ternaries-lit/main/check/presets/out-oxlint-fix-pass1.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-oxlint-fixed-files.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-oxlint-then-oxfmt-files.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-oxlint-pass2.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-eslint-fix-pass1.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-eslint-fixed-files.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-eslint-then-prettier-files.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-eslint-after-prettier.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-biome-check-write.txt`, `scratchpad/nested-ternaries-lit/main/check/presets/out-biome-fixed-files.txt`

### 11.10 In the ESLint React preset, `react/jsx-no-leaked-render`'s fix creates the nested ternary `no-nested-ternary` then reports. My check (local run, as 11.7, core + react presets)

- **Files** (`scratchpad/nested-ternaries-lit/main/check/presets-react/`): `status.tsx` (`{loading ? <p>Loading</p> : error ? <p>{error}</p> : <p>Done</p>}` and `{count && <p>{count} items</p>}`), `leak2.tsx` (`{count && (compact ? <span>{count}</span> : <p>{count} items</p>)}`).
- **Reports:** Oxlint (core + react) reports only `no-nested-ternary`; it has no native leaked-render rule, so `count && ...` passes. ESLint reports `no-nested-ternary`, `sonarjs/no-nested-conditional`, `react/jsx-no-leaked-render` ("Potential leaked value that might cause unintentionally rendered values or rendering crashes") and `react-doctor/rendering-conditional-render` ("Your users see a stray '0' on screen" "when a number before `&&` is zero,"). Biome reports `noNestedTernary` and `noLeakedRender`, whose help ends "Use !!value, value > 0, or a ternary expression."
- **Fixes** (the same finding as 3.2, from a separate run): ESLint `--fix` rewrites `count && <p>…</p>` to `count ? <p>…</p> : null`, and `leak2.tsx` to `{count ? compact ? <span>{count}</span> : <p>{count} items</p> : null}`, dropping the parentheses. That line then gets `no-nested-ternary` and `sonarjs/no-nested-conditional`, neither with a fix. Biome's `noLeakedRender` has no fix, safe or unsafe.
- **For the post:** a fix that follows one rule's advice (use a ternary) can produce exactly what another rule forbids. In JSX, where statements can't go, the remaining options are a variable, an early return, or a component.
- **Text:** `scratchpad/nested-ternaries-lit/main/check/presets-react/out-oxlint.txt`, `scratchpad/nested-ternaries-lit/main/check/presets-react/out-eslint.txt`, `scratchpad/nested-ternaries-lit/main/check/presets-react/out-biome.txt`, `scratchpad/nested-ternaries-lit/main/check/presets-react/out-eslint-fix.txt`, `scratchpad/nested-ternaries-lit/main/check/presets-react/out-eslint-fixed-files.txt`, `scratchpad/nested-ternaries-lit/main/check/presets-react/out-biome-write-unsafe.txt`

### 11.11 What Ultracite tells agents about conditionals. VERIFIED (source and history)

- **Now** (`src/data/rules.ts`, written into AGENTS.md and CLAUDE.md by `init`, mirrored in `skills/ultracite/references/code-standards.md`): "Prefer early returns over nested conditionals for error cases", "Extract complex conditions into well-named boolean variables", "Use early returns to reduce nesting" and "Prefer simple conditionals over nested ternary operators". Nothing about braces, `curly`, or turning two-way `if`/`else` into ternaries.
- **History:** v5 (Jun 2025) generated one line per Biome rule: "Don't use nested ternary expressions.", "Don't use ternary operators when simpler alternatives exist." and "Follow curly brace conventions." Before #343, the list said "Use simpler alternatives to ternary ops if possible". `18ed1f31` (Resolves #343, 2 Nov 2025) replaced the list with the four principles above.
- **The fix prompt** (`src/agent-fix/prompt.ts`): "For a style rule, keep runtime behavior the same." and "An edit that only hides the code from the rule" "(rewording it, re-spelling it, an equivalent construct) is not a fix,". For `no-nested-ternary` an equivalent construct (`if`/`else`, early returns, a lookup) is the fix the rule's own help asks for.
- **The site:** the Biome provider page says the rules "catch" "what agents get wrong: import cycles, nested ternaries, awaits inside loops", and the Oxlint page lists "promises and nested ternaries."; the homepage replay shows an agent replacing a nested ternary with `{roleLabels[user.role]}` (the replay's comment says the diagnostics are re-measured; the lookup's definition isn't shown).
- **For the post:** the instructions are softer than the rules (prefer, not never) and silent on two settings that rewrite code (`curly`, `prefer-ternary`). The site's claim about agents needs the evidence in section 10, or softer wording.
- **Text:** `scratchpad/nested-ternaries-lit/main/src/ultracite/rules.ts`, `scratchpad/nested-ternaries-lit/main/src/ultracite/code-standards.md`, `scratchpad/nested-ternaries-lit/main/src/ultracite/871ee738-ultracite.mdc`, `scratchpad/nested-ternaries-lit/main/src/ultracite/18ed1f31-parent-agents-rules.ts`, `scratchpad/nested-ternaries-lit/main/src/ultracite/18ed1f31-agents-rules.ts`, `scratchpad/nested-ternaries-lit/main/src/ultracite/prompt.ts`, `scratchpad/nested-ternaries-lit/main/src/ultracite/docs/biome-coverage.astro`, `scratchpad/nested-ternaries-lit/main/src/ultracite/docs/oxlint-coverage.astro`, `scratchpad/nested-ternaries-lit/main/src/ultracite/docs/agent-session.astro`

### 11.12 Ultracite's own users: one request to turn the rule off, none to keep it. VERIFIED (issues)

- **Searched:** the terms at the top of this section (11 Nov 2026). Most hits are Dependabot release notes. Discussions are not enabled on the repository.
- **Found:**
  - #735 (artile, 4 Jul 2026), a request for a Foldkit pack: its reference config sets `"no-nested-ternary": "off"` among rules to "relax a few core rules that clash with TEA idioms.", "nested ternaries in `Match` chains". Hayden closed it as won't do for a different reason (JS plugins and performance) and didn't address the ternary rule.
  - #446 (ToxicBlades, Dec 2025) pastes Biome's `noLeakedRender` output, which tells the user to use "a ternary expression."; not about nesting.
  - #791 (11.3) and #546 (11.4).
- **Not found:** no issue asks to allow nested ternaries in JSX, complains about `prefer-ternary`, or reports a behaviour change from any of these fixes.
- **For the post:** the public record has one framework's users turning the rule off for an idiom, and no other complaint.
- **Text:** `scratchpad/nested-ternaries-lit/main/src/gh/item-735.json`, `scratchpad/nested-ternaries-lit/main/src/gh/item-735-comments.json`, `scratchpad/nested-ternaries-lit/main/src/gh/item-446-comments.json`, `scratchpad/nested-ternaries-lit/main/src/gh/search-ternary.json`

### 11.13 Hayden's account of why the rule is on (11 Nov 2026). ANECDOTAL (the maintainer's account, relayed; not in the record)

- **Source:** Hayden Bleasel, in a message relayed to the research coordinator on 11 Nov 2026, while this file was compiled; saved as `scratchpad/nested-ternaries-lit/main/src/ultracite/hayden-account-2026-11-11.txt`. No commit, issue or changelog entry says this (11.1).
- **What Hayden says:** "it was the strictness policy but also nested ternaries" "can require more cognitive effort to work through" "and are hard to easily modify vs simple if statements." "when applicable, i prefer using `if (bool) return x;`" so you can "end the loop early and keep the logic flat".
- **The four parts, and where the sources that bear on each are:**
  - **Strictness policy:** 11.2; the history of the rule's addition in 11.1.
  - **Cognitive effort:** section 6 (atoms of confusion, readability models, nesting) and `cognitive-complexity.md` §3.
  - **Hard to modify:** section 7 (bug and change studies, precedence, autofix bugs) and section 5 (what formatters do to a nested ternary).
  - **Early returns that keep logic flat:** section 8 (guard clauses, single exit, the rewrites and when they change behaviour). The exact line Hayden gives is reported by `curly` in Oxlint and ESLint and by `useBlockStatements` in Biome, and fixed to a braced block; in ESLint, the function-level form is also rewritten to a ternary by `unicorn/prefer-ternary` (11.7, 11.9).
- **For the post:** state it as Ultracite's reason, in Hayden's words. Each part is a claim the sources can test, not a finding. Quote the braced form, which is what Ultracite accepts.
- **Text:** `scratchpad/nested-ternaries-lit/main/src/ultracite/hayden-account-2026-11-11.txt`

---

## Notes on Ultracite's presets (for Hayden, not for the post)

Checked in the worktree (`research/nested-ternaries`, at `cfa365be`) on 11 Nov 2026. Per AGENTS.md, these are for you to decide on, not to write around.

**Your account (relayed on 11 Nov 2026; not in the git history, issues or changelog)**

- **In your words:** "it was the strictness policy but also nested ternaries" "can require more cognitive effort to work through" "and are hard to easily modify vs simple if statements." "when applicable, i prefer using `if (bool) return x;`" so you can "end the loop early and keep the logic flat". Recorded in 11.13. The post can state it as Ultracite's reason; each part is a claim to test, not a finding.
- **Strictness policy:** accurate as history. The rule has been on since the first commit (March 2022), when every ESLint rule was listed by hand, and it came through each rewrite (`configs.all`, Biome's `all: true`, Oxlint's categories, the explicit lists), except for ten weeks in 2024 when Ultracite was Biome-only and Biome had no such rule yet (11.1, 11.2).
- **Cognitive effort:** the evidence is mixed. The operator is confusing in C but didn't replicate in Java or JavaScript; the one nested ternary tested was no worse than simple ones but drew more kinds of wrong answer; developers prefer the ternary (6.1–6.5, 6.8). The strongest support is practitioners' (Go's FAQ, Prettier's #5814, Airbnb's maintainer) rather than experiments (1.10, 5.3, 4.3).
- **Hard to modify:** no study measures it (7.11). It is argued by practitioners, including GitHub's Copilot docs in nearly your words and Prettier's design notes on diffs (10.8, 5.4). The measured bugs come from operators in front of `?`, which the rule doesn't catch (7.13, 7.31).
- **Early returns that keep logic flat:** the braced form is what Ultracite accepts; the exact line you gave fails `curly` and `useBlockStatements` in all three linters (11.7). No controlled study of guard clauses exists, but nothing argues against them for readability either; the single-exit rule survives only in safety-critical standards, for resource clean-up (6.16, 8.3–8.6).

**Inconsistencies, and settings that pull against your reason**

- **`unicorn/prefer-ternary` undoes early returns on ESLint only.** Since unicorn v75 (16 Sep 2026) it reports a lone `if (x) return a;` followed by `return b;` and fixes it to `return x ? a : b;`. Oxlint's port never reports that form (it returns early when there's no `else`, has no fix and lacks the two options set), and Biome has no equivalent. So the same `if`/`else` ends as a ternary for ESLint users and as an early return for Oxlint and Biome users (2.11, 2.18, 2.22, 11.7, 11.9). `"only-single-line"` doesn't help. Options: accept it, or turn the rule off on ESLint (or in both) to match your stated preference. `compare-rule-parity.ts` can't see it, since both linters have the rule on under the same name.
- **`curly` rejects your example.** Every preset reports `if (bool) return x;` and fixes it to a block (Biome with `fix: "safe"` since #546). If the post quotes your line, quote the braced form, or decide whether `curly: ["error", "multi-line"]` (Airbnb, Standard, love, Vercel) is what you want; eslint-config-prettier notes `multi-line` "can conflict with Prettier", and Prettier 3.9.10 and Oxfmt 0.75.0 keep a one-line `if (a) return 1;` as written (my check, `scratchpad/nested-ternaries-lit/main/check/out-oneline-if-formatters.txt`; 4.1, 4.12, 11.4).
- **`react/jsx-no-leaked-render`'s fix creates nested ternaries** in the ESLint React preset: `count && (compact ? A : B)` becomes `count ? compact ? A : B : null`, which `no-nested-ternary` and `sonarjs/no-nested-conditional` then report, with no fix (3.2, 11.10). Setting `validStrategies: ["coerce", "ternary"]` would make its fix `!!count && …` instead; worth testing before changing.
- **Leaked-render coverage differs by linter.** ESLint React: `react/jsx-no-leaked-render` plus react-doctor's rule (two reports for one `&&`). Biome React: `noLeakedRender` (no fix; also flags react.dev's own `isPacked ? name + " ✅" : name`). Oxlint React: nothing natively; only the opt-in `js-plugins` preset (3.3–3.5, 3.8, 11.10).
- **ESLint-only Unicorn rules in this group:** `prefer-minimal-ternary` (with both opt-in options, which a Unicorn collaborator says they disable; its fix once broke TypeScript narrowing, and v79 still reports a case it can't fix), `no-unnecessary-nested-ternary`, `prefer-early-return`, `prefer-combined-guards`, `no-useless-else` and `no-declarations-before-early-exit` have no Oxlint port (2.13–2.15, 2.23, 4.10, 7.26). Check they're allowlisted with reasons in `compare-rule-parity.ts`.
- **Duplicate reports.** A negated ternary gets `no-negated-condition` and `unicorn/no-negated-condition` with identical text in Oxlint and ESLint; ESLint gives `no-else-return` and `unicorn/no-useless-else` for one `else`, and `no-nested-ternary` and `sonarjs/no-nested-conditional` for one nesting (11.8). An agent sees each as a separate problem.
- **`else if` chains:** Oxlint keeps them (`no-else-return` with `allowElseIf: true`); ESLint (`unicorn/no-useless-else`) and Biome (`noUselessElse`) flatten them into guards (2.20, 2.23). The three presets end on different code.
- **Fixes that change behaviour under `ultracite fix --unsafe`:** Oxlint 1.90.0's dangerous fixes turn `x ? x : y ? 1 : 2` into `x || y ? 1 : 2` (different grouping; looks like an upstream bug, not filed), `a + b ? true : false` into `a + b`, and `f() ? true : true` into `true` (2.19). ESLint 10.14.0's `no-unneeded-ternary` fix still writes `returna !== b;` from `return(a === b) ? false : true;` (fixed upstream after the release, 2.4, 7.23).
- **Nothing catches the precedence bugs that happen.** No preset flags `a && b ? c : d`, `a ?? b ? c : d` or `"x" + c ? a : b` in plain JavaScript; `no-mixed-operators` leaves `?:` out of its default groups, is deprecated, and eslint-config-prettier turns it off (7.14, 7.17). Not a fix suggestion, only a gap the post shouldn't paper over.
- **The two Unicorn comments say eslint-config-prettier disables the rule for the same reason.** It does turn it off (since 6.4.0, 2019), but as a plain `"off"` with no README entry; the reason is only in its issue #110 (5.13). The wording is fine; there's nothing to link to in the README.
- **What Ultracite tells agents is softer than the rules.** `rules.ts` says "Prefer simple conditionals over nested ternary operators" and "Use early returns to reduce nesting"; the rule bans every nested ternary (including JSX loading/error/data chains), `curly` bans the unbraced guard, and on ESLint `prefer-ternary` folds a lone guard into a ternary. None of that is in the rules file (11.11).
- **The fix prompt's "equivalent construct" line** ("An edit that only hides the code from the rule" "(rewording it, re-spelling it, an equivalent construct) is not a fix,") is at odds with this rule, whose fix is an equivalent construct (`if`/`else`, early returns, a lookup). The experiment may show agents leaving these for review (11.11, 10.14).
- **The site's claims about agents.** The Biome and Oxlint provider pages say the rules catch what agents get wrong, nested ternaries included; no study or report found here supports that agents nest ternaries more than people (10.1, 10.4). The homepage replay replaces a nested ternary with `{roleLabels[user.role]}`; if `roleLabels` is a plain object and `user.role` can be any string, that drops the visible `"Member"` default and can return inherited members (8.8, 8.9). Worth a look.

**For the post and the experiment**

- **Say which rewrite each linter leaves.** Three-way choices end as braced early returns everywhere; two-way choices end as a ternary on ESLint and an early return on Oxlint and Biome (11.9). A lookup object passes every preset and scores 0 for cognitive complexity, but evaluates every value and needs `Object.hasOwn` or a `Map` for user input (2.17, 8.8, 8.9).
- **Don't present the rule as evidence-based on comprehension.** The honest summary: the operator is a measured confusion in one language, not in two others; nesting has one data point; the strongest arguments are layout (formatters can't make long chains readable) and practitioner consensus (5.3, 5.10, 6.1–6.5).
- **The ping-pong is a clean demonstration for the post:** reproducible, with exact before and after, and the reason Ultracite runs lint fixes before the formatter (5.16, 11.3).
- **Experiment hypotheses (not findings):** agents asked to fix `no-nested-ternary` in JSX may extract a variable that evaluates both branches, or a lookup that drops a default; in TypeScript they may change inferred return types (8.16). Watch for those, and for `// eslint-disable` on conditional types (which the rule doesn't report anyway).

---

## Things that turned out wrong or different

**The operator and its history (section 1)**

- **N3220 numbers the conditional operator §6.5.16**, not §6.5.15 (it is §6.5.15 in N1256 and N1570) (1.4).
- **Ritchie's "The Development of the C Language" doesn't discuss `?:`**, so it can't settle whether C took it from B or BCPL; B had it in 1972 with right-to-left binding (1.5).
- **Kotlin's docs no longer say "there is no ternary operator";** since 2025 they say `if` serves its purpose (1.12).
- **Python's design allows only the else-chain without parentheses** in the sense that the other nestings were made deliberately awkward; it isn't a ban (1.9).
- **The nesting rules don't apply to TypeScript conditional types** in any linter; ESLint declined a proposal to cover them (1.16, 2.2, 5.20).

**The rules (section 2)**

- **ESLint's `no-nested-ternary` doesn't see every nested ternary:** only direct nesting in the two branches. Oxlint also unwraps TypeScript wrappers; only SonarJS follows any depth, and it exempts JSX, arrays, objects and functions (2.1, 2.16, 2.21).
- **Biome's `noNestedTernary` missed parenthesised nesting until 2.3.6 (Nov 2025),** though it claims to be the same as ESLint's rule; Biome's formatter added the parentheses that hid it (2.20, 5.17).
- **`prefer-ternary` doesn't create nested ternaries at v79,** but it did in practice before v76 and v79, and its guard against nesting gained an off switch after v79 (unreleased) (2.11, 7.27).
- **`prefer-ternary` reports the guard-plus-return form** since v75.0.0, with no option to turn only that off; Oxlint's port never does (2.11, 2.18).
- **`curly` was not deprecated in ESLint 8.53.0;** `multiline-ternary` and `operator-linebreak` were (2.8, 2.9).
- **`no-unneeded-ternary` doesn't report `a ? a : b` by default;** unicorn's `prefer-logical-operator-over-ternary` does, and offers `??` first, which isn't equivalent (2.4, 2.12).
- **Oxlint's `no-negated-condition` is fixable; ESLint's isn't,** and ESLint declined a fix in 2021 (2.5, 2.18).

**React, configs and ecosystems (sections 3, 4 and 9)**

- **react.dev doesn't mention nested ternaries.** It talks about nested conditional markup and using ternaries in moderation (3.6).
- **`react/jsx-no-leaked-render` misses arithmetic** (`a - b && <X />` passes; only react-doctor reports it), and Biome's `noLeakedRender` has no fix, checks JSX children only and flags ternaries with an identifier alternate (3.2–3.4).
- **Airbnb's own fix for a nested ternary isn't equivalent:** it evaluates the inner ternary unconditionally (4.4).
- **StandardJS never enabled `no-nested-ternary`, and Google's guides never mention it;** both Google guides allow a one-line unbraced `if` (4.5, 4.6).
- **Pylint has no nested-conditional check;** `consider-using-ternary` (R1706) is about the old `and`/`or` idiom, and Ruff's SIM108 avoids nesting only because it never matches `elif` (4.17).
- **Unicorn's `unopinionated` config excludes its `no-nested-ternary`,** and Unicorn 79 has `prefer-early-return` and `no-unnecessary-nested-ternary` (4.9, 4.10).

**Formatting (section 5)**

- **`unicorn/no-nested-ternary` is not one of eslint-config-prettier's special rules;** it is a plain `"off"` with no README entry, added in 6.4.0 (2019) from issue #110 (5.13).
- **Prettier did not always flatten chains:** it flattened else-branches only from 1.15 (Nov 2018) to 3.0, and indents them again since 3.1; vjeux's 2017 flattening PR was closed unmerged. Of the Prettier issue numbers often cited, #737, #5814 and #9561 are the nested-ternary ones; #1565 is unrelated (5.1, 5.3, 5.5).
- **Experimental ternaries were announced as a future default** "later this year" in 2023; at 3.9.10 the default is still `false` (5.7).
- **Ultracite's commit says each fix run "rewrote the file twice";** in the local runs the loop never converges: the fix adds the parentheses and the formatter removes them, every time (5.16, 11.3).
- **dprint's default is the flat chain,** not Prettier's indented tree; a tree option arrived only in 0.97.0 (Nov 2026) (5.18).

**Comprehension and bugs (sections 6 and 7)**

- **Medeiros et al. did study the conditional operator.** Two later papers say they left it out; they only left it out of one chart (6.4, 6.8).
- **Keraj's "conditional operators" category is boolean operators without parentheses,** not `?:` (6.10).
- **Casalnuovo et al. include no ternary forms,** and Yeh et al. is EEG only (online 2021) and didn't test the conditional operator (6.10).
- **The eye-tracking study of the conditional expression is da Costa et al. (EMSE 2023), in Python;** Mendes et al. is the Java prevalence study (6.6, 6.9).
- **No systematic mapping study of atoms of confusion was found** (6.10).
- **The obvious precedence bugs aren't nesting bugs:** every real case found has a binary operator in front of `?` or a ternary inside an `||`/`&&` chain (7.31).
- **Prettier does add parentheses in a ternary's test, but only for `??`** (since 3.3.3); it removes them around `+` and `&&`, and Oxfmt matches (7.16).
- **Sonar's LLM paper does include the nested-ternary rule,** but under dead code, with no count (10.4).

**The rewrites (section 8)**

- **Single entry, single exit isn't in Dijkstra's 1968 letter;** the phrase as found here is IBM's 1974 material, about control structures (8.3, 8.5).
- **Dijkstra's guards are unordered and abort when none holds,** unlike guard clauses in code (8.3).
- **Whether React Native crashes depends on the renderer:** the legacy renderer throws "Text strings must be rendered within a <Text> component."; Fabric only logs an error in development (8.14).
- **`switch (true)` isn't flagged by any rule** in the three linters, even with everything on (8.10).
- **Rewriting `const` plus ternary to `let` plus `if`/`else` widens TypeScript's inferred type,** and `prefer-const` can't flag it (8.16).

**Ultracite (section 11)**

- **The exact line in Hayden's reason fails Ultracite:** `curly` and `useBlockStatements` report `if (bool) return x;` in every preset (11.7).
- **`curly` was off in the ESLint preset from V7 (Dec 2025) to 4 Jul 2026,** because eslint-config-prettier was spread after the core rules (11.5).
- **Ultracite had no nested-ternary rule from 18 Jul to 1 Oct 2024:** the move to Biome (1.8.3) dropped ESLint's rule, and Biome's `noNestedTernary` arrived as a nursery rule in 1.9.3 (11.1).
- **Until 4 Sep 2026, `unicorn/no-nested-ternary` was on in the ESLint preset** despite eslint-config-prettier, because the Unicorn rules were spread after it (11.1).
- **The empty `oxlint --rules` output** in the local runs is a quirk: the plain format prints nothing when piped; `--format=json` works (2.18).

---

## Unverified or dropped

- **"The Main Features of CPL" (1963):** OUP served a challenge and the Wayback copy is the challenge page; CPL's notation is cited from Richards' 2013 preprint only (1.6).
- **K&R, Fowler's _Refactoring_ text (both editions), Beck's _Guard Clause_ pattern, Dijkstra's EWD249 (a scan with no text layer), _Structured Programming_ (Dahl, Dijkstra, Hoare), Böhm and Jacopini beyond the Crossref record, and Mills's "proper program":** not opened. The claim that `SESE` was named by Ferrante, Ottenstein and Warren (1987) came from search snippets only and is not used.
- **MISRA C:2012:** not opened (sold); Rule 15.5's text only as a forum user quoted it. **AUTOSAR C++14 A5-16-1:** over the size limit.
- **The PHP RFC's gist with the 1,000-package analysis:** not opened; the counts are the RFC's.
- **React and React Native behaviour** was read from source, not run (neither is installed). **The IIFE cost** is from the spec, not measured.
- **Sonar's S3358 description text:** the rules site is client-rendered and the API needs an organisation; only the metadata and source were saved. **SonarJS issue #3244** (behind the JSX exception): issues are disabled on that repository.
- **Unicorn before v79:** not run; the v75–v78 cascades rest on the issue reports and the rule's commit diffs.
- **When `curly` got its fixer, and why Biome marks `useBlockStatements` unsafe:** not found.
- **A proposal issue for `no-nested-ternary` or `no-ternary`:** none found; the commits cite none.
- **dprint was not run** (no binary in the worktree); its handling of parentheses around nested ternaries is unknown. **Oxfmt's and Biome's ternary printer source** wasn't read; their behaviour is from local runs. The oxc.rs pages are live, not pinned to 0.75.0. Why Oxc PR #26008 was closed: no comment says.
- **The Prettier blog's beta-test screenshots** are images; only the text was checked. Prettier issue #3805 (parentheses around a ternary's test) was dropped as off topic.
- **Chen et al. (IST 2018),** the source of the Python long-ternary smell: paywalled, no abstract (7.10). **Green (1977) and de Oliveira et al. (SBES 2020):** abstract only (6.7, 6.13). **Campos and Maia, Wiese et al. (SIGCSE 2022, ACM 403), Morzeck et al., Fakhoury et al., Roberts (1995), Soloway et al. (1983):** not opened. Johnson et al.'s low-nesting snippets are images, so whether they used else-if chains or early returns is unknown (6.12). An undergraduate systematic review (UFC, 2026) was unreachable.
- **RuboCop's disable count for `Style/NestedTernaryOperator`:** would need running its draft tool against 500 repositories (4.14). **Ruff SIM108** on a branch that is already a conditional expression: source reading only. **detekt and ktlint:** not checked. **State of JS:** only the question files (9.3). **Next.js docs:** not checked.
- **Large-project JavaScript bugs from nested ternaries:** none found (7.31). **LLM studies counting ternaries:** none found (10.1); Pythonic-idiom papers seen only in search snippets were not cited. **CodeCureAgent's per-rule data:** not opened.
- **The Medium post "Nested Ternaries are Great" (Eric Elliott, 2018):** read from a Wayback copy (9.6); the arguments in it are uncited.
- **Counts of nested ternaries in the projects in 9.2:** not measured; that's the corpus harness's job.
