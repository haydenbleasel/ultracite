# React effects and their dependency arrays: literature and source notes

Compiled 2026-10-23 for the Ultracite research post on React effects and their dependency arrays. The rules: `react-hooks/exhaustive-deps` from eslint-plugin-react-hooks, with every other non-deprecated `react-hooks/*` rule, including the React Compiler rules such as `set-state-in-effect` (Ultracite's ESLint React preset); Oxlint's port `react/exhaustive-deps` and its compiler rules `react/exhaustive-effect-dependencies`, `react/set-state-in-effect` and `react/no-deriving-state-in-effects` (Oxlint React preset); Biome's `useExhaustiveDependencies` (Biome React preset); and React Doctor's effect rules (`no-derived-state-effect`, `no-effect-event-handler`, `no-fetch-in-effect`, `effect-needs-cleanup`, `prefer-use-effect-event` and others) in the ESLint React preset and Oxlint's opt-in js-plugins preset. The file covers where effects and the rule came from, what React's own docs say, how the other linters and frameworks differ, the research on hooks bugs and lint suppressions, LLMs and agents, and Ultracite's own history. The angle to test: the dependency rule assumes the effect should exist and offers "add the dependency" as the fix, while React's docs say many effects shouldn't exist.

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the official docs, the tool's source code or published package, the release notes, or the GitHub issue, PR, RFC or commit) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex, Semantic Scholar or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single user report, project doc, blog post or tool author's benchmark, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research or claims by a company that sells or owns a product in this space: Meta (React, react.dev, React Compiler), VoidZero/Oxc, Million Software (React Doctor), Vercel, Microsoft/GitHub, Google, OpenAI, Anthropic. react.dev is Meta's documentation for its own library.

Every quote is copied exactly and is under 15 words. Where a longer sentence matters, it is given as consecutive quoted segments. Markdown emphasis inside a quote (`**`, `_`) is kept as in the source; double quotes inside a quote are shown as single quotes.

**How sources were fetched.** Pages and PDFs were read with WebSearch, WebFetch and unauthenticated `curl`; PDFs were converted with `pdftotext`. react.dev, the old reactjs.org docs and the React blog were read from source in reactjs/react.dev at pinned commits (current pages at `ae5e48074d4f`, 23 Oct 2026; old docs at `83c2086e` and `efc3958b`; old blog posts at `5ef6955a`). The React repository moved from `facebook/react` to `react/react` in 2026; links to either work, and SHAs are the same. eslint-plugin-react-hooks was read at tag `eslint-plugin-react-hooks@7.1.1` (`d1727fbf`), CHANGELOG at `a6b912fb`; React Compiler 1.0.0 from its npm tarball. Metadata came from Crossref and OpenAlex (no `mailto`), Semantic Scholar (no key), the arXiv API, the public Stack Exchange API (no key), the npm registry and downloads API, and the Wayback Machine. Three research agents worked on sections 3, 4 and 5 in parallel, each saving the text it quoted; every quote in this file was then checked by script against those saved texts and the repo files (`scratchpad/effects-lit/scripts/check_quotes.py`).

- **Blocked:** DBLP's API returned an anti-bot page; Semantic Scholar returned 429 on every request, and arXiv's API 429 for part of the session. Elsevier full texts (Nunes et al. 2025; Ferreira, Borges and Valente 2024) are closed, and the UFC repository timed out. docs.bswen.com returned 403, and Imtiaz et al.'s PDF is now a 404 (read from Wayback). The Hugging Face datasets-server was re-indexing AIDev v5 for most of a day, so the `biome-ignore` part of 5.5 isn't counted. X (Twitter) wasn't fetched.
- **`gh` was used read-only** on public repositories: commits, files, issues, PRs, releases, code search. No repository was cloned; the corpus repos used in 4.19 were already cloned (shallow, sparse) by the harness in `research/corpus/repos/`.
- **Nothing was installed.** No email address, name or account detail was put in any URL, query, header or form, and Unpaywall wasn't used. Small npm tarballs (eslint-plugin-react-hooks 1.0.0–1.4.0, babel-plugin-react-compiler 1.0.0) were downloaded to read, not run.
- **Embedded instructions:** React Doctor's agent skill tells agents to `curl` a remote playbook, and its docs pages carry "Validation prompt" and "Fix prompt" sections written for agents; neither was followed, and the playbook wasn't fetched. The agent prompt files and skills read for section 5 (Vercel, TanStack, Factory, React Doctor, Anthropic, OpenAI) are instructions to models and were read as data. No other source contained instructions aimed at the reader. One research agent briefly copied a file to `/tmp` and deleted it. Scratch files are under `scratchpad/effects-lit/` (`main/` for sections 1, 2 and 6, `check/` for the local runs, `A/` for section 4, `B/` for 5, `C/` for 3). Live pages, counts and issue states are as of 23 Oct 2026 unless a date is given.

**About the "my check" items.** These were run on 23 Oct 2026 with the worktree's binaries: Oxlint 1.86.0, ESLint 10.12.0, eslint-plugin-react-hooks 7.1.1, eslint-plugin-react-doctor and oxlint-plugin-react-doctor 0.9.16, Biome 2.5.15, React and react-dom 19.3.0, on Node 24.14.1. React was run through `react-dom/client` on a minimal DOM stand-in (`check/runtime/shim.cjs`), since the Bun store has no DOM library; only effect behaviour was measured.

- **3.9:** the dependency rules alone on a 24-case fixture, through every fix mode (`C/lint/`).
- **3.10:** Ultracite's presets on a 19-case fixture, every fix tier, and the fixed code run in React (`check/`).
- **1.10, 1.11, 3.5, 5.17:** suppression comments and react.dev's fetch example through the presets (`check/suppress/`, `C/lint/supp/`, `B/lint-check/`).
- **4.10, 4.11:** Stack Overflow counts from the public Stack Exchange API (`A/raw/`).
- **4.18:** GitHub code-search totals for suppression comments (`A/raw/codesearch-*.tsv`).
- **4.19:** suppression comments and effect-rule hits in the corpus repos (`check/corpus-suppressions-harness.json`, `check/census/`).
- **5.3, 5.8, 5.9, 5.11, 5.18:** an aggregation of Vercel's eval results, and agent-guidance examples and messages through the presets (`B/`).

Move all of these into the `research/` harness, under `--topic react-effects`, and run them with Ultracite's presets before putting a number in the post.

---

## Most useful for the post

1. **React's own docs state the post's thesis.** "The linter only knows when the dependencies are _wrong_." "It doesn't know _the best_ way to solve each case." "If the linter suggests a dependency, but adding it causes a loop," / "it doesn't mean the linter should be ignored." And: "Effects are an escape hatch from the React paradigm." (2.2, 2.3)
2. **The array began as a performance knob, and React now blames it for the confusion.** The 2018 docs: it replaces "an extra comparison with `prevProps` or `prevState` inside `componentDidUpdate`"; "That's our optimization."; "In the future, the second argument might get added automatically". React Labs 2025: the array is "baiting you into the mental model of 'do this when these values change'", effects "are the most common pain point we hear from developers", and the compiler could insert dependencies (an exploration, not shipped). (1.2, 2.10)
3. **Stale closures were a written-down cost of Hooks from day one.** The RFC's Drawbacks: closures "capture **old versions** of props and state values" when the "inputs" array is "inadvertently missing one of captured variables." (1.1)
4. **The rule's only fix is to edit the array.** Every message ends "Either include it or remove the dependency array."; the one suggestion is the new array. Restructuring appears only in hint text. The every-render check runs only "If nothing else to report", so the rule first asks you to add an unstable dependency, then reports it. Its own TODO: "What if the function needs to change on every render anyway?" (1.8)
5. **React's maintainers pulled the autofix in 2020 because adding dependencies changes behaviour.** The complaint (#16313): "I as a repo maintainer see the auto fix as a greater risk" / "than the problems the lint rule prevents." The opt-in that brought it back is `enableDangerousAutofixThisMayCauseInfiniteLoops`: "You've been warned." (1.6)
6. **Every linter's fix adds the dependency, including where that loops, and running the result shows it.** In React 19.3 (my check): adding `entries` turned 2 effect runs into 502 before the test stopped it, with React's "Maximum update depth exceeded" warning; adding a render-time `options` object reconnected on every render (4 connects in 4 renders); adding `theme` to react.dev's own form example re-posted on every theme change (3 POSTs for 1 submit); adding `count` to an interval re-created it on every tick. React's warning names the cause: "or one of the dependencies changes on every render." (2.13, 3.9, 3.10)
7. **React's docs contain a worked example of the dependency fix introducing a bug.** "Removing Effect Dependencies": the form's effect is marked all-dependencies-declared, then "By doing this, you've introduced a bug." "The first thing you should think about is whether this code" / "should be an Effect at all." (2.5)
8. **The "remove" fixes remove behaviour.** Oxlint's plain `--fix` (what `ultracite fix` runs) turns `useMemo(fn)` into `useMemo(fn, [])`, which returned 3 instead of 6 after its input changed; Oxlint's dangerous fix replaced an every-render `[options]` with `[]` (never reconnects) and turned `user?.id` into `user.id` (a crash); Biome's unsafe fix removed the dependency that cleared a draft when the user changed. (3.2, 3.9, 3.10)
9. **The linters disagree about extra dependencies.** ESLint's rule has allowed them in effects since Feb 2019 ("This seems like a legit case."); Biome and Oxlint's compiler rule `exhaustive-effect-dependencies` report them, and Biome calls a prop an outer-scope value, a complaint open in some form since 2023. (1.5, 3.4, 3.7)
10. **The rules that ask whether an effect should exist arrived late, have no fixes, and caught most of what the dependency fix broke.** The React Compiler rules (`set-state-in-effect`, `no-deriving-state-in-effects`) joined the official plugin in Oct 2025 and Oxlint in Aug 2026; React Doctor ported Nick van Dyke's "You Might Not Need an Effect" plugin. Biome has none. (1.9, 3.3, 3.10–3.13)
11. **React's own docs trip the new rules.** Lauren Tan, Sept 2025: "our effects validations are flagging patterns that our own docs examples use." react.dev's fetch-with-`ignore` example is flagged by `set-state-in-effect`, under a TODO about "potential false positives". TanStack Start's shipped agent skill marks a pattern "CORRECT" that both Ultracite presets report. (1.10, 5.9)
12. **Turning every rule on means different rules in different linters.** `react-hooks/exhaustive-effect-dependencies` reports nothing in eslint-plugin-react-hooks 7.1.1 (a build flag is `'off'`); Oxlint's is live and reports every missing dependency a second time. ESLint's `rule-suppression` stays quiet where Oxlint's fires. (1.9, 3.4, 3.5)
13. **React says never suppress, and says most people do.** "We recommend **never suppressing the linter**." "**We recommend treating the dependency lint error as a compilation error.**" React 19.2: "To solve this, most users just disable the lint rule and exclude the dependency." No number is given. (2.4, 2.5, 2.9)
14. **The suppression reputation, measured (roughly).** GitHub code search: `eslint-disable-next-line react-hooks/exhaustive-deps` is in 1,241,088 files, the most of 57 rules queried and about 1.6 times `no-explicit-any`, and in about a third of the TSX files that suppress anything. The corpus census: 97 of 225 `exhaustive-deps` hits (43%) are silenced in-file; Supabase Studio has 83 such comments, 4 with a reason. No paper measures it. (4.18–4.20)
15. **Stack Overflow's top `useEffect` question is the missing-dependency warning** (score 890, 1.26M views). Its accepted answer offers moving the function into the effect or `// eslint-disable-next-line react-hooks/exhaustive-deps`; 9 of 26 answers suppress or turn the rule off; one, from 2026, mentions `useEffectEvent`. (4.10, 4.11)
16. **Suppression research says they pile up and mostly mark warnings people won't act on.** Hu et al. (FSE 2025): "50.8% of all suppressions do not affect any warning"; Liargkovas et al.: "false positives account for a minor proportion of suppressions." Microsoft's 375-developer survey: "Program analysis should not have all rules on by default." (4.13–4.16)
17. **Suppressing costs the compiler, in the stable release.** React Compiler 1.0 skips any component that suppresses `exhaustive-deps`: "React Compiler has skipped optimizing this component because one or more" / "React ESLint rules were disabled". Main changed in Nov 2025 because "a suppression within a useEffect could prevent memoization,". Oxlint flags the comment itself and, per an open issue, hides other findings. (1.11, 3.5)
18. **`useEffectEvent` (stable Oct 2025) is the sanctioned exit and a new evasion.** "Do not use `useEffectEvent` to avoid specifying dependencies in your Effect's dependency array." "This hides bugs and makes your code harder to understand." It clears `exhaustive-deps` without a suppression comment. (2.9)
19. **No empirical study measures effect bugs, unnecessary effects or what people do with the warning.** The research is formal models (React-tRace: "Infinite re-rendering is perhaps the most catastrophic bug one can encounter when using Hooks."), a 12-person tool study and bug taxonomies that name "stale closures or improper hook usage" without counting them. (4.1–4.12)
20. **No study measures agents against `exhaustive-deps`, so I counted: agents suppress it in hundreds of real PRs.** In AIDev v5, 984 agent-attributed suppression lines in 566 PRs, 347 of them merged; four in five survive into the PR's final diff, about 30 times the rate for `jsx-a11y`. In lint-fix PRs, agents added the dependency in some places and suppressed the rest as "intentional patterns". Front-end benchmarks don't classify effect errors; Vercel's Next.js evals: agents avoided fetch-in-effect on the first try in 64 of 72 configurations and redundant state in 66 of 72, with fixtures that show the right pattern. (5.1–5.5)
21. **Agent-facing tools now write down how agents game effect rules.** React Doctor: "Don't blindly add missing dependencies. Read the hook callback first." and "do NOT add an empty 'return () => {}'". Factory bans `useEffect` for its agents, and its `useMountEffect` helper hides dependencies from the rule. (3.12, 5.10, 5.11)
22. **Frameworks without dependency arrays warn about the same misuse.** Svelte: `$effect` "is best considered something of an escape hatch"; Angular: "Effects should be the last API you reach for."; Solid: "It's best to avoid setting signals within effects,". Removing the array removes the missing-dependency bug, not the unnecessary effect. (3.14–3.19)
23. **Dan Abramov's essay gives two ways to be honest, and the fix takes only the first.** "There are two strategies to be honest about dependencies." The second: "change our effect code so that it wouldn’t _need_ a value". In the 2019 feedback thread he called an effect "essentially an event handler". (1.5, 1.12)
24. **Ultracite: on from the first commit, the rest by inheritance, no rationale recorded.** `exhaustive-deps` has been `"error"` since 2022 (React recommends `"warn"`); the compiler rules came on through every-rule policies, React Doctor by user request. The ESLint preset doesn't lint `.ts` hooks, and the rules file tells agents only "Specify all dependencies in hook dependency arrays correctly". (6.1, 6.4, 6.5)

Ultracite's own history (6.1): `react-hooks/exhaustive-deps` has been `"error"` since the first ESLint config (Mar 2022), with an `additionalHooks` option for `useAsync` that was dropped in 2024; Biome's `useExhaustiveDependencies` has been on since the Biome switch (Jul 2024). The React Compiler rules came on in ESLint in V7 (Jan 2026) through the every-rule pattern and in Oxlint in Aug 2026 for parity; React Doctor came in Jul 2026 after a user asked for "You Might Not Need an Effect" rules (#447, #730). No rationale was recorded for any of them.

---

## 1. Where effects and the dependency rule came from

Items 1.1–1.3 cover Hooks and how the dependency array started; 1.4–1.9 cover `eslint-plugin-react-hooks` from `rules-of-hooks` to the React Compiler rules; 1.10 is React's own docs against the new rules, 1.11 the compiler and suppressions; 1.12–1.13 are Dan Abramov's two essays. Source files are in `scratchpad/effects-lit/main/src/`. The React repository moved from `facebook/react` to `react/react` in 2026; old links redirect, and commit SHAs are the same.

### 1.1 The Hooks RFC (reactjs/rfcs #68, Oct–Nov 2018) and React Conf 2018. VERIFIED (PR, RFC text at merge commit, conference recap); Vendor (Meta)

- **Citation:** Sebastian Markbåge, "RFC: React Hooks," reactjs/rfcs PR #68, opened 25 Oct 2018, merged 21 Nov 2018 (merge commit `3826b880`), 1,394 comments. https://github.com/reactjs/rfcs/pull/68 ; text `text/0068-react-hooks.md`. Introduced the same day in Sophie Alpert and Dan Abramov's keynote "React Today and Tomorrow" at React Conf (25–26 Oct 2018, Henderson, Nevada), per the React blog's "React Conf recap: Hooks, Suspense, and Concurrent Rendering" (13 Nov 2018, `content/blog/2018-11-13-react-conf-recap.md` in reactjs/react.dev at `5ef6955a`).
- **What it says:** the RFC is written as documentation pages; "Using the Effect Hook" is the detailed design for effects. Its Drawbacks list already names the bug the lint rule would target: closures passed to `useEffect` and `useCallback` can "capture **old versions** of props and state values." "In particular, this happens if the “inputs” array" / "is inadvertently missing one of captured variables. This can be confusing." Credits: Markbåge "came up with the original design for Hooks".
- **For the post:** stale closures from a missing dependency were a known, written-down cost of the design on day one, not a discovery after release.

### 1.2 The dependency array began as an optimisation that replaced `componentDidUpdate` comparisons (docs, Oct 2018–Aug 2019). VERIFIED (docs source at commits); Vendor (Meta)

- **Citation:** "Using the Effect Hook," `content/docs/hooks-effect.md` in reactjs/react.dev (then reactjs.org) at `83c2086e` (25 Oct 2018) and `efc3958b` (12 Aug 2019). Live at https://legacy.reactjs.org/docs/hooks-effect.html
- **What it says (Oct 2018):** under "Tip: Optimizing Performance by Skipping Effects", class components skip work with "an extra comparison with `prevProps` or `prevState` inside `componentDidUpdate`", and "This requirement is common enough that it is built into the `useEffect` Hook API." React compares `[5]` with `[5]` and skips: "That's our optimization." "In the future, the second argument might get added automatically" / "by a build-time transformation." The note: include "any values from the outer scope that change over time" that the effect uses, or "your code will reference stale values from previous renders." On `[]`: "we suggest not making it a habit because it often leads to bugs".
- **Changes by Aug 2019:** "inputs array" became "dependencies array" (PR #1957, 9 May 2019), and the note ends by recommending the `exhaustive-deps` rule: "It warns when dependencies are specified incorrectly and suggests a fix."
- **For the post:** the array was sold as a performance knob that replaces a hand-written `prevProps` comparison. That framing is where the habit of listing what should trigger the effect comes from, the mental model React's later docs spend pages undoing (2.3, 2.10). The 2018 doc already predicted that a compiler would fill the array in (2.10).

### 1.3 React 16.8 (6 Feb 2019) and `rules-of-hooks` (Oct 2018). VERIFIED (blog source, commit, npm registry); Vendor (Meta)

- **Citation:** "React v16.8: The One With Hooks," React blog, 6 Feb 2019 (`content/blog/2019-02-06-react-v16.8.0.md` at `5ef6955a`). Rule: Caleb Meredith, "Add ESLint rule for React Hooks," commit `ddbfe2ed` (23 Oct 2018). npm: `eslint-plugin-react-hooks` 0.0.0 on 25 Oct 2018 (the day Hooks were announced) and 1.0.0 on 6 Feb 2019 (the 16.8 release day); the 1.0.0 package exports only `rules-of-hooks`.
- **What it says:** "We strongly recommend enabling a new" lint rule called `eslint-plugin-react-hooks` "to enforce best practices with Hooks." It "will soon be included into Create React App by default."
- **For the post:** the Rules of Hooks lint shipped with Hooks; the dependency lint came two weeks after the stable release (1.4).

### 1.4 `exhaustive-deps`: three pull requests, then Dan Abramov's rewrite (Oct 2018–Feb 2019; npm 1.2.0, 21 Feb 2019). VERIFIED (PRs, commit, npm tarballs)

- **Citation:** Caleb Meredith started it ("Add ESLint rule for useEffect/useCallback/useMemo Hook dependencies," first commit 31 Oct 2018), in PRs #14048 (Dan Abramov) and #14052 (Jamie Kyle), both 31 Oct 2018 and closed unmerged. Dan Abramov's PR #14636, "Add eslint-plugin-react-hooks/exhaustive-deps rule to check stale closure dependencies," opened 19 Jan 2019, merged 20 Feb 2019 (commit `dab2fdbb`). https://github.com/facebook/react/pull/14636
- **Release:** the tarballs show 1.1.0 (21 Feb 2019, 18:02 UTC) exports only `rules-of-hooks`; 1.2.0 (21 Feb 2019, 19:38 UTC) is the first with `exhaustive-deps`, with `meta.fixable: 'code'`. Its README configures it as `"warning"` and sends feedback to #14920.
- **The design, from #14636's description:** "**Always report the dependency array itself.**" so that "the user blames the array rather than the actual code." "**Always allow auto-fix.**" "**Make minimal changes.**" And on the escape hatch: "If you really know what you're trying, you just need to" / "`eslint-disable` that line alone rather than many." The commit list includes "Special case 'current' for refs", "Treat React.useRef/useState/useReducer as static too" and "Alphabetize the autofix" / "Only alphabetize if it already was".
- **For the post:** the rule was designed around its autofix and its suppression comment. Both shaped what happened next (1.6, 4.11, 4.18).

### 1.5 The feedback thread: facebook/react #14920 (21 Feb–7 Mar 2019). VERIFIED (issue body and all 112 comments via the API)

- **Citation:** Dan Abramov, "[ESLint] Feedback for 'exhaustive-deps' lint rule", facebook/react issue #14920, opened 21 Feb 2019, closed and locked 7 Mar 2019; 112 comments (38 by Dan Abramov), 83 reactions; one last comment on 4 May 2022. https://github.com/facebook/react/issues/14920 . It is still the rule's `docs.url` in 7.1.1. Saved as `main/src/issue-14920-*.json*`.
- **What the rule is for:** it "verifies the list of dependencies for Hooks like `useEffect` and similar," / "protecting against the stale closure pitfalls. For most cases it has an autofix." Posters had to bring a CodeSandbox and the "**actual UI pattern**" because "The end goal of this thread is to find common scenarios".
- **The complaints that changed the rule:**
  - Extraneous deps. Jack Zhao (`bugzpodder`): `useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);` was flagged as unnecessary. Abramov: "This seems like a legit case." "I'm going to relax the warning to allow extraneous deps for effects only." (PR #14967, 27 Feb 2019: "it still warns for unused `useCallback`/`useMemo` deps.")
  - Jeremy Liberman (`MrLeebo`) wanted to "reset the child counter to zero when the parent counter changes" from an effect. That's the "resetting state on prop change" case React's docs later tell you not to write as an effect (2.2).
  - Running once on mount with `[]`, and values that posters said never change.
- **The answers ("Common Answers", Abramov with Sunil Pai, 8 Mar 2019):**
  - "Hooks nudge you towards correctness wherever possible." Include values you think won't change: "it's still a bug if it does, but the Hook can't handle it."
  - Functions: "it is a misconception that function values are necessarily constant." Then the other side: "There is a problem on the opposite spectrum of this," / "which is where you get infinite loops (a function value always changes)." "We should add a better solution for detecting infinite async loops."
  - On an effect used as a form log: "It's weird to me why this example uses an effect" / "for something that's essentially an event handler." Three years before "You Might Not Need an Effect".
  - "Ignoring function dependencies completely leads to worse bugs". "So try not to, when you can."
- **The last comment (Abramov, 4 May 2022):** "We've posted an RFC that we think provides a better solution" for some of these cases, linking the `useEvent` RFC (2.9).
- **For the post:** the thread is where the trade-off was argued in public. Adding everything prevents stale values; the same advice makes functions and objects loop. React's answer was to restructure, and the restructurings it named (move into the effect, `useCallback`, event handlers) became the docs.

### 1.6 The autofix that added dependencies, and why it became a suggestion (Aug 2019–May 2020). VERIFIED (issue, PRs, changelog)

- **The complaint:** Tom Williams (`Alphy11`), "[ESLint]react-hooks/exhaustive-deps rule autofix modifies code function, violating eslint best practices," facebook/react #16313, 7 Aug 2019; 37 comments; closed 17 Feb 2020. The example: a data fetch keyed on `someArg` that "should refetch data when parameters change, but not when the fetch function changes"; the autofix adds `fetchData`, and a parent passing an inline arrow makes it refetch every render. "I as a repo maintainer see the auto fix as a greater risk" / "than the problems the lint rule prevents." "If autofix was turned off, the rule would be entirely a positive."
- **React's response:** Abramov waited on ESLint's suggestions RFC (eslint/rfcs #30, merged 9 Aug 2019; its motivation is to offer fixes "without a possibility of 'stealthily' breaking" code, with no mention of React). He later argued the Suggestions API might not have passed the RFC stage "if this practical example" … "wasn't so painful". To a user who said they sometimes didn't need the dependencies, he replied: "This is usually a mistake and a misunderstanding."
- **2.4.0 (17 Feb 2020):** "Disable dangerous autofix and use ESLint Suggestions API instead." (PR #17385, Will Douglas.) Abramov: "It will now use the Suggestions API. The autofix is gone."
- **4.0.0 (1 May 2020):** "Add a way to enable the dangerous autofix." PR #18437 (Abramov, 31 Mar 2020): some IDEs and Meta's own VS Code extension lacked suggestions, so "This PR adds an escape hatch." "Pass `{ enableDangerousAutofixThisMayCauseInfiniteLoops: true }` and you get the old behavior. You've been warned." "If you actually apply fix suggestions automatically, you **don't** want to enable this."
- **In 7.1.1 source:** with the option on, `reportProblem` copies `problem.suggest[0].fix` into `problem.fix`; off by default.
- **For the post:** React's own maintainers decided in 2020 that "add the missing dependency" is not safe to apply without a person looking, and named the option after the failure. An agent applying the suggestion is that person, or isn't.

### 1.7 Options and later changes (2020–2026). VERIFIED (changelog at `a6b912fb`, PRs, README at tag `eslint-plugin-react-hooks@7.1.1`)

- **Options in 7.1.1 (`meta.schema`):** `additionalHooks` (regex), `enableDangerousAutofixThisMayCauseInfiniteLoops`, `experimental_autoDependenciesHooks` (array) and `requireExplicitEffectDeps` (boolean); plus the shared setting `settings["react-hooks"].additionalEffectHooks` (6.1.0, PR #34497/#34637, Jordan Brown).
- **`additionalHooks`:** README: "We suggest to use this option **very sparingly, if at all**." "we recommend most custom Hooks to not use the dependencies argument," and instead "provide a higher-level API".
- **`requireExplicitEffectDeps`** (PR #33344, Jordan Brown, merged 23 May 2025): "To prepare for automatic effect dependencies, some codebases may want to codemod" deps-less effects to an explicit `undefined`. "Outside of migration, relying on a component to render can lead to real bugs". Message: `React Hook ${reactiveHookName} always requires dependencies.`
- **`experimental_autoDependenciesHooks`** (PR #33294, Jan Kassens, merged 19 May 2025): skips checking hooks the compiler fills in.
- **Other changes (CHANGELOG):** 4.0.0 "Check dependencies for all Hooks ending with `Effect`", reverted in 4.0.3 "due to too many false positives"; 4.1.0 "**New Violations:** Warn when dependencies change on every render." (PR #19590, Jordan Eldredge: arrays and objects built in render, and `someArr ?? []`); 4.3.0 optional chaining; 5.0.0 "Consider dispatch from `useActionState` stable." and "Rename experimental `useEvent` to `useEffectEvent`."; 6.1.0 "Disallow calling `useEffectEvent` functions in arbitrary closures."; 7.0.1 inline `useEffectEvent` values can't be passed as JSX props.
- **For the post:** the rule kept getting stricter about the cases that loop (things that "change on every render") and kept a recommended severity of `warn`.

### 1.8 How the rule decides, and what it offers as the fix (source at 7.1.1). VERIFIED (source `packages/eslint-plugin-react-hooks/src/rules/ExhaustiveDeps.ts` at tag `eslint-plugin-react-hooks@7.1.1`, `d1727fbf`); my check (local run, 3.10)

- **Which hooks:** `useEffect`, `useLayoutEffect`, `useCallback`, `useMemo` (callback index 0) and `useImperativeHandle` (index 1), plus `additionalHooks`. `useInsertionEffect` isn't in the list (a PR adding it, #31969, was closed unmerged). An effect is any name matching `/Effect($|[^a-z])/`.
- **What counts as stable:** a `const` primitive literal; `useRef()`; the setter from `useState`, `useReducer` and `useActionState` (only "second value in initializing tuple", and a `useState` setter only if never reassigned); the `startTransition` from `useTransition`; and the result of `useEffectEvent`, whose comment reads "useEffectEvent() return value is always unstable." while the code treats it as exempt. Anything else in component scope is reactive, including functions, unless they capture nothing.
- **The fix it offers:** every missing or unnecessary dependency gets a message like "React Hook useEffect has a missing dependency: 'userId'." plus "Either include it or remove the dependency array.", and one suggestion, `Update the dependencies array to be: [...]`. Hints append: a functional update `setCount(c => ...)`, `useReducer`, destructuring `props`, or "find the parent component that defines it" / "and wrap that definition in useCallback." The suggestion itself is always the new array.
- **Things that change every render are checked only when nothing else is wrong:** `scanForConstructions` runs "If nothing else to report". So a missing `options` object is first fixed by adding it, and only then reported as "The 'options' object makes the dependencies of useEffect Hook" … "change on every render." Its suggestion wraps functions in `useCallback`; for objects there is no suggestion, because "Objects may be mutated after construction". The source's own TODO: "What if the function needs to change on every render anyway?" / "Should we suggest removing effect deps as an appropriate fix too?"
- **Effects may over-specify; memo hooks may not:** "We can't do this" / "for effects though because those have legit" / "use cases for over-specifying deps." (the #14967 decision).
- **Other messages:** `ref.current` in cleanup ("The ref value 'ref.current' will likely have changed" / "by the time this effect cleanup function runs."); assignments to outer variables "will be lost after each" render; `async` callbacks ("Effect callbacks are synchronous to prevent race conditions."); a setter called in an effect with no array: "Without a list of dependencies, this can lead to an infinite chain of updates." with the fix "pass [] as a second argument"; `useEffectEvent` in the array: "Functions returned from `useEffectEvent` must not be included in the dependency array."; mutable values: `Mutable values like '${badRef}' aren't valid dependencies`.
- **For the post:** the rule's single fix is always to edit the array. Restructuring appears only in hint text, and the every-render check is deferred until after the dependency has been added.

### 1.9 The React Compiler rules join the plugin (6.1.0, 1 Oct 2025; 7.0.0, 8 Oct 2025). VERIFIED (changelog, README, blog posts, rule metadata of the installed 7.1.1); Vendor (Meta)

- **Citations:** CHANGELOG (`a6b912fb`): 6.0.0 "Accidentally released."; 6.1.0 "Add `recommended-latest` and `recommended-latest-legacy` configs that include React Compiler rules." (PR #34675, Lauren Tan); 7.0.0 (PR #34757): "all compiler rules are enabled by default." React blog, "React Compiler v1.0" (Lauren Tan, Joe Savona, Mofei Zhang, 7 Oct 2025): compiler-powered lint rules "ship in `eslint-plugin-react-hooks`'s `recommended` and `recommended-latest` preset"; "The linter does not require the compiler to be installed". It credits Michael Faith for folding `eslint-plugin-react-compiler` (npm since 22 Feb 2024) into the plugin.
- **7.1.1 contents (`meta` of the installed package):** 29 rules, one deprecated (`component-hook-factories`). The compiler rules include `set-state-in-effect` ("Validates against calling setState synchronously in an effect."), `no-deriving-state-in-effects`, `exhaustive-effect-dependencies`, `memoized-effect-dependencies`, `refs`, `purity`, `immutability`, `globals`, `static-components`, `use-memo`, `preserve-manual-memoization`, `incompatible-library`, `set-state-in-render`, `error-boundaries`, `rule-suppression` ("Validates against suppression of other rules"), `todo`, `invariant`, `syntax`, `unsupported-syntax`, `config`, `gating`, `fbt`, `hooks` and `capitalized-calls`. The `recommended` config sets `exhaustive-deps` to `"warn"` and leaves out `exhaustive-effect-dependencies`, `memoized-effect-dependencies`, `no-deriving-state-in-effects`, `rule-suppression`, `todo`, `invariant`, `syntax`, `fbt`, `hooks`, `capitalized-calls`, `void-use-memo` and `memo-dependencies`.
- **Two of the new effect rules do nothing in 7.1.1:** the plugin's compiler config sets `validateExhaustiveEffectDependencies` from a build flag, `eprh_enableExhaustiveEffectDependenciesCompilerLint = 'off'` in the published bundle. `react-hooks/exhaustive-effect-dependencies` never reported in my run (3.10), while Oxlint's port did.
- **react.dev's plugin page:** compiler diagnostics mean the compiler "**automatically** skips over those components and hooks"; "you don’t need to fix all violations immediately."
- **For the post:** since late 2025 the official plugin has had two kinds of effect rule: one that asks for more dependencies, and compiler rules that ask whether the effect should exist (`set-state-in-effect`, `no-deriving-state-in-effects`). Keep which preset enables which out of the post.

### 1.10 React's own docs trip the new effect rules (Sept 2025). VERIFIED (react.dev PRs, docs source at `ae5e4807`); Vendor (Meta)

- **Citation:** Lauren Tan (`poteto`), "fix compiler errors," reactjs/react.dev PR #7989, merged 18 Sep 2025, reverted (#7995) and restored (#7997) the same day.
- **What it says:** "our effects validations are flagging patterns that our own docs examples use." "I added todos for these". The pages read here mark 20 examples with `expectedErrors: {'react-compiler': [...]}`. Over the fetching example in the `useEffect` reference (`let ignore = false; setBio(null); fetchBio(person)…`): "TODO(@poteto) - investigate potential false positives in react compiler validation". Over the same pattern in "Synchronizing with Effects": "not the most efficient, but this validation is enabled in the linter only".
- **My check:** react.dev's fetch-with-cleanup pattern (`setBio(null)` before the fetch) is reported by `react-hooks/set-state-in-effect` and Oxlint's `react/set-state-in-effect` (case c13 in 3.10).
- **For the post:** the docs that tell you to fetch in an effect with an `ignore` flag also ship the rule that flags it. That's a fair example of where the effect rules disagree with each other, from the same team.

### 1.11 React Compiler skips a component whose `exhaustive-deps` is suppressed (1.0.0), and stopped doing so on main (Nov 2025). VERIFIED (npm 1.0.0 bundle, source, PRs); Vendor (Meta)

- **Citation:** `babel-plugin-react-compiler` 1.0.0 (npm, 7 Oct 2025; still `latest` on 23 Oct 2026), `dist/index.js`: `DEFAULT_ESLINT_SUPPRESSIONS = ["react-hooks/exhaustive-deps", "react-hooks/rules-of-hooks"]`, applied unless `eslintSuppressionRules` is set. Source `compiler/packages/babel-plugin-react-compiler/src/Entrypoint/Suppression.ts` and `Options.ts` at `d1727fbf`.
- **What it says:** the compiler error is "React Compiler has skipped optimizing this component because one or more" / "React ESLint rules were disabled", with the suggestion "Remove the ESLint suppression and address the React error" and the description "React Compiler only works when your components follow all the rules of React". The option's docs: suppressing the rules "is a strong indication that the code may be breaking React rules".
- **The change:** Joseph Savona, "[compiler] Ignore ESLint suppressions when ValidateMemoDeps enabled," PR #35184 (merged 24 Nov 2025), and #35201 (enabled by default, 25 Nov 2025). "Until now we've bailed out of any component/hook that suppresses this rule". "The downside was that a suppression within a useEffect could prevent memoization," "even though non-exhaustive deps for effects do not cause problems for memoization specifically." No stable compiler has shipped this yet (npm `latest` is 1.0.0); `eslint-plugin-react-hooks` 7.1.x bundles the newer compiler.
- **My check (`check/suppress/`; also 3.5 and 5.17):** with Ultracite's ESLint preset, an `eslint-disable-next-line react-hooks/exhaustive-deps` comment silences the rule and `react-hooks/rule-suppression` stays quiet. Oxlint 1.86.0's `react/rule-suppression` reports both `eslint-disable` and `oxlint-disable` comments for the rule: "React rule suppression prevents optimization", help "Remove the suppression and address the reported React rule violation".
- **For the post:** suppressing the dependency rule has had a cost beyond the bug it hides: a component compiled with React Compiler 1.0 loses its memoization. Say that this is React Compiler 1.0 and that the compiler's main branch has changed it.

### 1.12 Dan Abramov, "A Complete Guide to useEffect" (overreacted.io, 9 Mar 2019). VERIFIED (source in gaearon/overreacted.io at `main`); ANECDOTAL (an essay by a React team member, not docs)

- **Citation:** https://overreacted.io/a-complete-guide-to-useeffect/ ; `public/a-complete-guide-to-useeffect/index.md`.
- **What it says:**
  - On loops: an infinite refetch "can happen if you’re doing data fetching in an effect" without the array, or "if you specify a value that _always_ changes in the dependency array". "However, removing a dependency you use (or blindly specifying `[]`)" / "is usually the wrong fix." "Instead, fix the problem at its source."
  - The section "Don’t Lie to React About Dependencies": he'd seen "pretty much everyone who tries `useEffect` with a mental model from classes" / "try to cheat the rules." "**The solution to that problem is _not_ to remove a dependency.**"
  - "adopt it as a hard rule to always be honest" / "about the effect dependencies, and specify them all."
  - "There are two strategies to be honest about dependencies." The second: "change our effect code so that it wouldn’t _need_ a value" / "that changes more often than we want." On `useReducer`: "the “cheat mode” of Hooks".
  - "Synchronization, Not Lifecycle": an effect that "behaves differently depending on whether the component renders for the first time" is "swimming against the tide!"
  - On the lint rule: "a machine can tell you which data flow changes aren’t handled correctly".
  - On the future: "data fetching isn’t exactly a synchronization problem." He expected `useEffect` to "fade into background as a power user tool".
- **For the post:** the canonical essay's advice is the two strategies, and the second (change the code) is the one an "add the dependency" fix skips.

### 1.13 Dan Abramov, "Making setInterval Declarative with React Hooks" (overreacted.io, 4 Feb 2019). VERIFIED (current source; Wayback capture of 4 Feb 2019)

- **Citation:** https://overreacted.io/making-setinterval-declarative-with-react-hooks/ ; Wayback capture `20190204040125` (saved as `main/src/wayback-setinterval-20190204.html`).
- **What it says:** he sees the problem "not as a flaw of Hooks but as a mismatch between the" React programming model and `setInterval`. "There _is_ a way to get them working together very well" / "but it’s a bit unintuitive." The fix is the ref pattern ("I learned to stop worrying and love refs", the spoiler) that `useEffectEvent` later replaced (2.9).
- **The lint rule line was edited.** On 4 Feb 2019, with "lint rule" linking to PR #14636, it read "We’re also building a lint rule to surface these bugs early" / "but it’s not quite ready yet." The current text says "We’ve also built a" lint rule. The rule shipped 17 days after the post (1.4).
- **For the post:** the interval is the standard case where honest dependencies are correct and still wrong for the feature (the timer resets), and the fix is a different structure.

---

## 2. React's official guidance

All react.dev pages were read from the source in reactjs/react.dev at `ae5e48074d4f` (main, 23 Oct 2026), saved in `scratchpad/effects-lit/main/src/reactdev/`. react.dev is Meta's documentation for its own library: tag it Vendor (Meta) in the post. Several pages are by Dan Abramov, who wrote them for the beta docs in June–August 2022 (first commits: "Synchronizing with Effects" #4742, 14 Jun 2022; "You Might Not Need an Effect" #4766, 22 Jun 2022; "Lifecycle of Reactive Effects" #4875, 5 Aug 2022; "Separating Events from Effects" #4913, 19 Aug 2022; "Removing Effect Dependencies" #4936, 26 Aug 2022). react.dev replaced reactjs.org on 16 Mar 2023.

### 2.1 "Synchronizing with Effects": effects are an escape hatch, you can't choose dependencies, and Strict Mode runs them twice. VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/learn/synchronizing-with-effects (`src/content/learn/synchronizing-with-effects.md`).
- **What it says:**
  - Effects "let you specify side effects that are caused by rendering itself," / "rather than by a particular event." "**Don't rush to add Effects to your components.**"
  - The loop: "By default, Effects run after _every_ render." `setCount(count + 1)` in a deps-less effect "will **produce an infinite loop:**" "Setting state immediately in an Effect is like plugging a power outlet into itself."
  - "**Notice that you can't 'choose' your dependencies.**" "If you don't want some code to re-run," "_edit the Effect code itself_ to not 'need' that dependency."
  - Stable values: setters "have stable identity"; "If the linter lets you omit a dependency without errors," / "it is safe to do." A ref passed from a parent must be listed, because "you can't know whether the parent component always passes the same ref".
  - Strict Mode: "in development React remounts every component once immediately after its initial mount." "The right question isn't 'how to run an Effect once'," / "but 'how to fix my Effect so that it works after remounting'." The pitfall "Don't use refs to prevent Effects from firing": the ref guard "doesn't fix the bug."
  - "Not an Effect: Buying a product": "You don't want to buy the product when the user _visits_ a page".
- **For the post:** the page that teaches effects opens by telling you not to rush to add one, and calls the ref guard a non-fix (but see 2.8).

### 2.2 "You Might Not Need an Effect": the categories of unnecessary effects. VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/learn/you-might-not-need-an-effect ; first published on the beta docs by Dan Abramov, PR #4766 (22 Jun 2022).
- **What it says:** "Effects are an escape hatch from the React paradigm." "If there is no external system involved" … "you shouldn't need an Effect." Removing them makes code "easier to follow, faster to run, and less error-prone." The two common cases: "**You don't need Effects to transform data for rendering.**" and "**You don't need Effects to handle user events.**"
- **The categories (section headings):** updating state based on props or state (derived state: "When something can be calculated from the existing props or state," / "don't put it in state."); caching expensive calculations (`useMemo`); resetting all state when a prop changes (pass a `key`); adjusting some state when a prop changes (set it during render, and "**most components shouldn't need it either**"); sharing logic between event handlers; sending a POST request; chains of computations ("Such code is often rigid and fragile."); initializing the application; notifying parent components ("It would be better to do everything in a single pass."); passing data to the parent; subscribing to an external store (`useSyncExternalStore`); fetching data (allowed, but "you need to implement cleanup to avoid race conditions", and frameworks "provide more efficient built-in data fetching mechanisms").
- **The rule of thumb:** "If this logic is caused by a particular interaction," / "keep it in the event handler." "If it's caused by the user _seeing_ the component on the screen," / "keep it in the Effect." Recap: "If you can calculate something during render, you don't need an Effect."
- **For the post:** this page is the source of the post's premise. Each category is a case where the dependency rule's fix (complete the array) leaves an effect that shouldn't exist, and several are cases where completing the array changes behaviour (2.5).

### 2.3 "Lifecycle of Reactive Effects": the linter is right, but it doesn't know the fix. VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/learn/lifecycle-of-reactive-effects
- **What it says:** "An Effect can only do two things: to start synchronizing something," / "and later to stop synchronizing it." "**You can't 'choose' your dependencies.**" "Sometimes this may lead to problems like infinite loops" … "Don't fix these problems by suppressing the linter!"
- **The key passage:** "The linter is your friend, but its powers are limited." "The linter only knows when the dependencies are _wrong_." "It doesn't know _the best_ way to solve each case." "If the linter suggests a dependency, but adding it causes a loop," / "it doesn't mean the linter should be ignored." Recap: "All errors flagged by the linter are legitimate." "There's always a way to fix the code to not break the rules."
- **For the post:** React's own docs state the post's thesis. The rule detects; the fix it suggests isn't necessarily the fix.

### 2.4 "Separating Events from Effects": "We recommend **never suppressing the linter**." VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/learn/separating-events-from-effects
- **What it says:** DeepDive "Is it okay to suppress the dependency linter instead?" "We recommend **never suppressing the linter**." The first downside: "React will no longer warn you when your Effect needs to 'react'" to a new dependency, which "leads to bugs." Example: a `canMove` flag that is "always `true` inside `handleMove`" under a suppression. "**If you never suppress the linter, you will never see problems with stale values.**" "With `useEffectEvent`, there is no need to 'lie' to the linter". But "This doesn't mean that `useEffectEvent` is _always_ the correct solution."
- **The logging example:** following the linter to add `url` is right ("it makes sense to follow the dependency linter"), but adding `numberOfItems` would log a visit when the cart changes, so it belongs in an Effect Event.
- **For the post:** the same page has a case where adding the dependency is right and one where it's wrong, for the same effect.

### 2.5 "Removing Effect Dependencies": "To change the dependencies, change the code." VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/learn/removing-effect-dependencies
- **What it says:**
  - Intro: "Unnecessary dependencies may cause your Effect to run too often," / "or even create an infinite loop."
  - The section "To change the dependencies, change the code": "You don't _choose_ what to put on that list. The list _describes_ your code." "**If you want to change the dependencies, change the surrounding code first.**"
  - The suppression pitfall (with an `eslint-ignore-next-line react-hooks/exhaustive-deps` example): "When dependencies don't match the code," / "there is a very high risk of introducing bugs." "By suppressing the linter, you 'lie' to React". "There's always a better solution than ignoring the linter!" "**We recommend treating the dependency lint error as a compilation error.**" "If you don't suppress it, you will never see bugs like this."
  - "Should this code move to an event handler?" "The first thing you should think about is whether this code" / "should be an Effect at all." The worked example: a form posts and shows a notification from an effect on `submitted`; reading `theme` makes the linter ask for it, the code is marked `✅ All dependencies declared`, and then: "By doing this, you've introduced a bug." Switching themes shows the notification again.
  - Other recipes: split an effect "doing several unrelated things"; updater functions; Effect Events; and for objects and functions, "Move them outside the component or inside the Effect." Recap: "Dependencies should always match the code." "When you're not happy with your dependencies," / "what you need to edit is the code."
- **My check:** the form example as written (case c07 in 3.10): each linter asks for `theme`, and after the fix a submitted form posts again on every theme change (3 posts for 1 submit across two theme switches; React 19.3.0).
- **For the post:** React's docs contain a worked example of the dependency fix introducing a bug, and every linter's fix produces it.

### 2.6 "Reusing Logic with Custom Hooks": the linter only sees direct `useEffect` calls. VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/learn/reusing-logic-with-custom-hooks
- **What it says:** avoid "custom 'lifecycle' Hooks" (`useMount`, `useEffectOnce`, `useUpdateEffect`). `useMount`'s bug isn't reported "because the linter only checks direct `useEffect` calls. It won't know about your Hook." Wrapping effects in purpose-built hooks also lets you "prevent someone working on the `ShippingForm` component from adding" unnecessary dependencies; "With time, most of your app's Effects will be in custom Hooks." "You shouldn't need Effects very often,".
- **For the post:** a wrapper hook is a quiet way around the rule, for people and for agents. `additionalHooks` exists, but React advises using it "very sparingly, if at all" (1.7).

### 2.7 The `useEffect` reference: troubleshooting loops. VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/reference/react/useEffect ("Troubleshooting").
- **What it says:** under "My Effect keeps re-running in an infinite cycle", two things must be true: the effect "is updating some state" and "That state leads to a re-render, which causes the Effect's dependencies to change." First ask "whether your Effect is connecting to some external system". "If there is no external system, consider whether" removing the Effect "would simplify your logic." Its data-fetching sandbox carries the TODO in 1.10.
- **For the post:** React's own debugging advice for a loop starts by asking whether the effect should exist, not with the array.

### 2.8 react.dev's lint reference pages: "fighting with the linter", and a ref guard. VERIFIED; Vendor (Meta)

- **Citation:** https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps and …/lints/set-state-in-effect
- **`exhaustive-deps`:** "This error often happens when you try to 'trick' React about dependencies" / "to control when an effect runs." "If you find yourself fighting with the linter," / "you likely need to restructure your code." Under "Adding a function dependency causes infinite loops": "In most cases, you don't need the effect." `useCallback` only "If you genuinely need the effect". Under "Running an effect only once": "Either include the dependency (recommended)" / "or use a ref if you truly need to run once", with a `sent.current` guard.
- **`set-state-in-effect`:** "Setting state immediately inside an effect forces React to restart the entire render cycle." "In many cases, you may also not need an effect at all." Valid: `setState` from a ref measurement in `useLayoutEffect`.
- **The inconsistency:** the lint page offers a ref guard for running once; "Synchronizing with Effects" says "Don't use refs to prevent Effects from firing" (2.1). The two refer to different goals (once per mount versus once ever), but an agent reading one page can find a pattern the other forbids.
- **For the post:** the newest official guidance tells you that a fight with the linter means restructure, and that most loops caused by adding a function mean you don't need the effect.

### 2.9 `useEvent` (RFC #220, 2022) became `useEffectEvent` (stable in React 19.2, 1 Oct 2025). VERIFIED (RFC, PRs, blog post, reference page); Vendor (Meta)

- **RFC:** Dan Abramov, "RFC: useEvent," reactjs/rfcs PR #220, opened 4 May 2022, closed unmerged 27 Sep 2022, 255 comments. It proposed "A Hook to define an event handler with an always-stable function identity." On effects: "You might be tempted to ignore the linter" and skip `theme` and `muted`, "However, that would introduce a bug." "Capturing" values "turns into a pitfall only when you suppress the linter error." Closing comment (Abramov): "we don't feel confident in coupling the two different motivations" and worried about "a strong incentive to wrap every function that currently uses `useCallback`".
- **Experimental:** `experimental_useEvent` (PR #25229, Lauren Tan, Sep 2022); renamed `useEffectEvent` (PR #25881, Sebastian Markbåge, 14 Dec 2022); lint gating removed when it reached canary (PR #34660, 30 Sep 2025).
- **Stable:** "React 19.2" (React team, 1 Oct 2025; npm `react@19.2.0` the same day). "To solve this, most users just disable the lint rule and exclude the dependency." "But that can lead to bugs since the linter can no longer help you". "**Effect Events should _not_ be declared in the dependency array**." "You don't need to wrap everything in `useEffectEvent`," / "or to use it just to silence the lint error," / "as this can lead to bugs."
- **Reference caveats (https://react.dev/reference/react/useEffectEvent):** "Do not use `useEffectEvent` to avoid specifying dependencies in your Effect's dependency array." "This hides bugs and makes your code harder to understand." Pitfall "Don't use Effect Events to skip dependencies". And the reversal from the RFC: "Effect Event functions do not have a stable identity." "Their identity intentionally changes on every render." "The non-stable identity acts as a runtime assertion".
- **For the post:** React's claim that "most users just disable the lint rule" is the team's own characterisation, without a number (section 4 looks for one). And `useEffectEvent` is a new way to clear the error without restructuring, which the docs warn against in so many words. An agent told not to add suppressions can reach for it instead.

### 2.10 React Labs (23 Apr 2025): effects are "the most common pain point", and the compiler could write the array. VERIFIED; Vendor (Meta)

- **Citation:** Ricky Hanlon, "React Labs: View Transitions, Activity, and more," React blog, 23 Apr 2025, section "Automatic Effect Dependencies". https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more#automatic-effect-dependencies
- **What it says:** "Effects specifically are still hard to understand" / "and are the most common pain point we hear from developers." "We found that often, the confusion is from using an Effect" / "when you don't need to." One reason is the array: "Since you have to write it, it's right there and in your face" … "baiting you into the mental model of 'do this when these values change'." "For Effects, the compiler can insert the dependencies for you". It's described as research, with a CodeLens to show inserted dependencies.
- **Status:** the lint plugin has `requireExplicitEffectDeps` and `experimental_autoDependenciesHooks` to prepare for it (1.7). No stable release ships it as of 23 Oct 2026 (React 19.3's post, 9 Sep 2026, doesn't mention it).
- **For the post:** React's own research says the dependency array is part of why people misuse effects. Present automatic dependencies as an exploration, not a feature.

### 2.11 React Compiler 1.0 (7 Oct 2025): memoization changes can make effects fire more or less. VERIFIED; Vendor (Meta)

- **Citation:** "React Compiler v1.0" (1.9); https://react.dev/learn/react-compiler/debugging
- **What it says:** `useMemo`/`useCallback` stay as escape hatches, and a common reason to keep them is "if a memoized value is used as an effect dependency". Upgrading: "Changing how or whether this value is memoized" / "can cause over or under-firing of that `useEffect`." The post concedes that "your codebase may have `useEffect`s that cover other use cases". Debugging page, common breaking patterns: "**Effects that rely on referential equality**" and "**Dependency arrays that need stable references**", which cause effects "to fire too often or create infinite loops".
- **For the post:** the compiler doesn't change dependency arrays, but it changes which values are stable, so an effect whose correctness depended on a memoized object can start looping or stop firing. The less code relies on effect dependencies for behaviour, the safer the compiler is.

### 2.12 Strict Mode runs every effect twice in development (React 18, 29 Mar 2022). VERIFIED; Vendor (Meta)

- **Citation:** "React v18.0," React blog, 29 Mar 2022, "New Strict Mode Behaviors"; https://react.dev/reference/react/StrictMode
- **What it says:** React wants to "add and remove sections of the UI while preserving state", which "requires components to be resilient to effects being mounted and destroyed multiple times." Strict Mode will "automatically unmount and remount every component" on first mount. Reference: "one extra setup+cleanup cycle in development for every Effect."
- **For the post:** a run-once effect with no cleanup is visibly wrong in development since React 18, which is part of why people reach for `[]` plus a ref guard or a suppression.

### 2.13 React's runtime warning names the two causes of an effect loop. VERIFIED (react-dom 19.3.0 development build in the repo's Bun store)

- **Citation:** `react-dom/cjs/react-dom-client.development.js` (react-dom 19.3.0), `NESTED_PASSIVE_UPDATE_LIMIT = 50`.
- **What it says:** after more than 50 nested passive updates, development builds call `console.error` with "Maximum update depth exceeded." "This can happen when a component calls setState inside useEffect," "but useEffect either doesn't have a dependency array," "or one of the dependencies changes on every render." It is a warning, not an exception: in my run the loop went on until my test stopped it (3.10, case c05).
- **For the post:** the second cause in React's own warning, a dependency that changes every render, is what "add the dependency" produces when the dependency is an object, array or function built in render.

### 2.14 React 19.3 (9 Sep 2026) replaces a common effect with an API. VERIFIED; Vendor (Meta)

- **Citation:** "React 19.3," React blog, 9 Sep 2026, section "`browser`".
- **What it says:** "Previously, you might do this using some state that you'd update in an effect," with `useState(false)` and `setMounted(true)` in a `[]` effect. "In 19.3, React now includes a first-class API for this technique." `use(browser())` opts a component out of server rendering.
- **For the post:** React keeps removing reasons to write effects; the mounted-flag effect is one that `set-state-in-effect` reports. Keep version details out of the post, but the direction is evergreen.

---

## 3. Other implementations and other frameworks

Items 3.1–3.5 cover Oxlint: the `react/exhaustive-deps` port, its fixes, the React Compiler rules (`exhaustive-effect-dependencies`, `set-state-in-effect`, `no-deriving-state-in-effects`, `rule-suppression` and the rest) and how they handle suppressions. 3.6–3.8 cover Biome's `useExhaustiveDependencies`. 3.9 is a local run of the three dependency rules alone on a 24-case fixture; 3.10 is a run of Ultracite's presets on a second fixture, with the fixed code run in React. 3.11–3.13 cover the "You Might Not Need an Effect" plugin and react-doctor. 3.14–3.19 cover frameworks that track effect dependencies automatically. Files are in `scratchpad/effects-lit/C/` (`src/` for source and package files, `text/` for issues, PRs, docs and blog posts, `text/fw/` for framework docs, `lint/` for the local runs). Live pages, counts and issue states are as of 23 Oct 2026 unless a date is given.

**About the "my check" items.** Run on 23 Oct 2026 with the worktree's binaries: Oxlint 1.86.0, ESLint 10.12.0 with eslint-plugin-react-hooks 7.1.1, Biome 2.5.15, eslint-plugin-react-doctor 0.9.16 (which wraps oxlint-plugin-react-doctor 0.9.16) and Node 24. In 3.1–3.9 and 3.13, each linter ran only the rules named, at their defaults, which is how Ultracite configures them (except where an option is named); 3.10 runs Ultracite's presets. Fixtures, configs, outputs and the fix-mode script are in `scratchpad/effects-lit/C/lint/` (`fixture/cases.jsx`, `run-fixes.sh`, `summarize.py`, `out/`). Move them into the `research/` harness and run them with Ultracite's presets before putting a number in the post.

### 3.1 Oxlint `react/exhaustive-deps`: the port (v0.12.0, Nov 2024). VERIFIED (PRs, release notes, source at `oxlint_v1.86.0`); Vendor (VoidZero/Oxc)

- **Citation:** Cameron (`camc314`), "feat(linter): react/exhaustive-deps," oxc-project/oxc PR #7151, opened 6 Nov 2024, merged 12 Nov 2024. It finished Andrei Lisnic's (`alisnic`) "WIP: react-hooks/exhaustive-deps" (#2637, Mar 2024): "a massive thanks to @alisnic for starting this (incredibly complicated) lint rule". First shipped in oxlint v0.12.0 (20 Nov 2024), whose notes say "Experimental support for `react/exhaustive-deps`". Source: `crates/oxc_linter/src/rules/react/exhaustive_deps.rs` at `oxlint_v1.86.0` (`2ae2939b`). Docs: https://oxc.rs/docs/guide/usage/linter/rules/react/exhaustive-deps.html
- **Metadata (1.86.0):** category `correctness`, `version = "0.12.0"`, fix kind `safe_fixes_and_dangerous_suggestions` (3.2). Diagnostics carry the scope `react-hooks`, so a rule configured as `react/exhaustive-deps` prints as `react-hooks(exhaustive-deps)`.
- **Docs:** "If the list is missing or incomplete," / "the effect may run more often than necessary, or not at all." The docs' "correct" example adds the whole `props` object for a `props.foo` read.
- **Messages:** worded after ESLint's, for example "React Hook useEffect has a missing dependency: 'count'", but the advice moves into help text: "Either include it or remove the dependency array." The same help is attached to the unnecessary-dependency message for `useCallback` (ESLint says "Either exclude it"). ESLint's extra hints are gone: in my run ESLint's message for `setItems([...items, x])` added "You can also do a functional update 'setItems(i => ...)'", and Oxlint's didn't (3.9).
- **What it treats as stable (source, `is_stable_value`):** results of `useRef` and `useEffectEvent`; the second element of `useState`, `useReducer`, `useTransition` and `useActionState` unless it's reassigned; `const` primitives. The code comment: "effects are allowed to have extra dependencies", so unused deps are only reported for `useMemo` and `useCallback`, except outer-scope values and `ref.current`, which are reported everywhere.
- **Options:** only `additionalHooks` (a regex), with `deny_unknown_fields`. ESLint 7.1.1's rule also takes `enableDangerousAutofixThisMayCauseInfiniteLoops`, `requireExplicitEffectDeps` and `experimental_autoDependenciesHooks` (rule schema, `scratchpad/effects-lit/check/react-hooks-7.1.1-meta.json`). Oxlint doesn't read ESLint's shared `settings["react-hooks"].additionalEffectHooks` for this rule (#26327, open, Sep 2026).
- **Deliberate deviation:** #17765 (Connor Shea, Jan 2026): Oxlint reports a JSX element created in render as a dependency of `useMemo` in a `.js` file where ESLint doesn't. Closed as "an acceptable deviation as it's more accurate than the original rule".
- **useEffectEvent:** PR #14041 (Cody Olsen, `stipsan`, merged 24 Sep 2025, v1.18.0) added support "In order to support" react.dev's Effect Events.
- **For the post:** Oxlint's port matches ESLint's logic closely but not its messages; the restructuring hints that ESLint gives (functional update, `useReducer`) aren't in Oxlint's output, which is what an agent reads.

### 3.2 Oxlint's fixes: a "safe" fix that freezes `useMemo`, and dangerous suggestions (2025). VERIFIED (PRs, source, release notes); my check (local run, Oxlint 1.86.0); Vendor

- **History:**
  - PR #12354 (Don Isaac, `DonIsaac`, merged 17 Jul 2025; oxlint v1.8.0, 22 Jul 2025): "Adds auto-fixing capabilities for some scenarios". It added `diagnostic_with_dangerous_suggestion`, documented as fixes that "should not create parse errors, but have the" / "potential to change the code's semantics", and declared the rule `safe_fixes_and_dangerous_suggestions`. Its tests expect `useCallback(() => x)` to become `useCallback(() => x, [])` as a safe fix, where `x` is the hook's parameter.
  - PRs #13782 and #13783 (`camc314`, merged 15 Sep 2025; v1.16.0, 16 Sep 2025): a dangerous suggestion that removes a local object dependency, and a fix that removes a module-scope one, because "changes to `x`" "will not trigger a re-rended as it is not in the component scope." (sic).
  - Fixer bugs since fixed: a missing comma in the rewritten array (#12979, Oxlint 1.11.1, Aug 2025); a suggested dependency `booleanValue.headers` that "does not exist" (#17159, Dec 2025; fixed by #17167).
- **What each fix does (1.86.0 source):**
  - Safe fix (applied by `oxlint --fix`): inserting `, []` into a `useCallback` or `useMemo` that has no dependency array; removing an outer-scope dependency; removing `ref.current`.
  - Dangerous suggestion (applied only with `--fix-dangerously`): appending missing dependencies; removing a dependency that "changes every render".
- **How it's labelled:** the docs page says "A dangerous auto-fix and a suggestion are available for this rule." and `oxlint --rules --format=json` says `"fix": "fixable_dangerous_fix_or_suggestion"`. Neither mentions that plain `--fix` changes code.
- **My check (24 cases, `lint/run-fixes.sh`):** `oxlint --fix` changed 3 lines: it removed `[ref.current]` and `[moduleCounter]`, and turned `useMemo(() => items.reduce(…))` into `useMemo(() => items.reduce(…), [])`. Run in React 19.3 (3.10), the memo returned 3 instead of 6 after `items` changed: it computes once and never again; the next lint reports "React Hook useMemo has a missing dependency: 'items'". `--fix-suggestions` alone changed nothing; `--fix-dangerously` changed 11 lines (3.9).
- **For the post:** the one fix Oxlint applies without asking can turn a memo that recomputes every render into one that never recomputes. It is the reverse of what the rule is for, and it ships in the normal `--fix` pass.

### 3.3 Oxlint's React Compiler rules: the Rust port, one nursery rule, then 22 rules (2026). VERIFIED (PRs, release notes, blog, source); Vendor

- **The React team's Rust port:** Joseph Savona, "[compiler] Port React Compiler to Rust," facebook/react PR #36173, opened 30 Mar 2026, merged 9 Jun 2026: "This is an experimental, work-in-progress port of React Compiler to Rust." "The architecture was heavily guided by humans" / "but majority coded by AI." "all 1725 fixtures pass in snap".
- **Into Oxlint:** Boshen, "feat(linter/react): implement react-compiler rule," PR #23202, merged 15 Jun 2026 (Oxlint 1.70.0, 15 Jun 2026): a nursery `react/react-compiler` rule that "runs the React Compiler (`oxc_react_compiler`) in lint-only mode". PR #25500 (merged 15 Aug 2026) split it "into 24 category-specific rules matching `eslint-plugin-react-hooks` v7" ("Written with Claude Code and Codex."). Released in Oxlint 1.79.0 (18 Aug 2026), every rule tagged `version = "1.79.0"`.
- **The announcement:** Boshen, "React Compiler Support," Oxc blog, 18 Aug 2026 (oxc-project/website `5ba6e0af`, `src/blog/2026-08-18-react-compiler-support.md`): "Oxlint now includes 22 React Compiler-powered rules". Oxc vendored the port because "The Rust port was also unfinished, had bugs," and runs it directly on Oxc's AST. "We improved React Compiler diagnostics to make issues easier for coding agents to fix."
- **Categories (#25840, aligned with the upstream presets):** `set-state-in-effect` `correctness` (recommended upstream); `no-deriving-state-in-effects` `perf`, `exhaustive-effect-dependencies` `suspicious`, `memo-dependencies` `suspicious`, `rule-suppression` `restriction` (all off upstream). Not implemented: `config`, `gating`, `fbt`, and `memoized-effect-dependencies`, because "Upstream's `EffectDependencies` category is absent from the Rust compiler port." All 22 have fix kind `none` in 1.86.0 (`oxlint --rules`).
- **Docs (1.86.0 source):**
  - `set-state-in-effect`: it "usually indicates non-local derived data, a derived-event pattern," / "or improper external-data synchronization."
  - `no-deriving-state-in-effects`: it "lets the derived copy fall out of sync with its source."
  - `exhaustive-effect-dependencies`: "extraneous dependencies re-fire the effect needlessly."
  - `rule-suppression`: "The React Compiler skips functions containing such suppressions," and "the whole function loses optimization until the suppression is removed".
- **Messages seen in my run:** "Found missing effect dependencies" / "Found extra effect dependencies", with help "Extra dependencies can cause an effect to fire more often than it should"; and "Values derived from props and state should be calculated during render".
- **For the post:** a second, independent dependency check now runs in Oxlint, built from the compiler's own analysis rather than the hand-written lint rule, with diagnostics its maintainers say they tuned for agents.

### 3.4 The same rule name, live in Oxlint and inert in ESLint. VERIFIED (eslint-plugin-react-hooks 7.1.1 build, Oxlint PR); my check (local run)

- **ESLint (7.1.1, `cjs/eslint-plugin-react-hooks.development.js`):** the build sets `var eprh_enableExhaustiveEffectDependenciesCompilerLint = 'off';` and passes it to the compiler as `validateExhaustiveEffectDependencies`, whose schema default is also `'off'`. A user can override it through the rule's `environment` option; Ultracite doesn't. Nothing in the build emits the `EffectDependencies` category behind `memoized-effect-dependencies`.
- **Oxlint:** PR #25829 (Boshen, merged 18 Aug 2026): "Enable React Compiler exhaustive effect dependency validation in Oxlint" / "so the rule reports missing and extra dependencies instead of remaining inert."
- **My check (the 24-case fixture, both rules on):** Oxlint's `react/exhaustive-effect-dependencies` reported 11 cases; ESLint's `react-hooks/exhaustive-effect-dependencies` reported none, and `memoized-effect-dependencies` none. In Oxlint, every missing dependency is reported twice, once by each rule. The two Oxlint rules also disagree: for `useEffect(() => log(a), [a, b])` with `b` a prop, `exhaustive-deps` is silent and `exhaustive-effect-dependencies` reports "Found extra effect dependencies".
- **For the post:** turning on "every rule" means different things in different linters. Under one name, ESLint checks nothing and Oxlint checks every effect, more strictly than the classic rule.

### 3.5 Suppressing `exhaustive-deps` under the compiler rules: ESLint narrows, Oxlint swallows the component. VERIFIED (issue, source); my check (local run); Vendor

- **#26277** (Mikael, `mikaelh`, 3 Sep 2026, open, Oxlint 1.80–1.82): a `disable-next-line` comment naming `react/exhaustive-deps` or `react/rules-of-hooks` "suppresses every React Compiler diagnostic in the enclosing component". The reporter's codebase: "34 such comments" were hiding "28 unrelated `react()` findings" across 19 files; a commenter found five comments "hiding **seven unrelated `correctness` errors**". "This is silent: the gate stays green". ANECDOTAL as a rate.
- **My check (`lint/supp/case.jsx`, two components with the same impure call and `setState` in an effect; the second has `// eslint-disable-next-line react-hooks/exhaustive-deps`):**
  - ESLint 7.1.1: in the suppressed component, `purity` and `set-state-in-effect` still report; only `exhaustive-deps` is hidden; `rule-suppression` reports nothing.
  - Oxlint 1.86.0: in the suppressed component, `purity` and `set-state-in-effect` disappear, and `react(rule-suppression)` reports "React rule suppression prevents optimization", help "Remove the suppression and address the reported React rule violation".
- **Why ESLint differs (7.1.1 build):** `compileProgram` passes `null` for the ESLint suppression rules when `validateExhaustiveMemoizationDependencies` and `validateHooksUsage` are on, which they are by default. That reads as the 7.x compiler no longer treating `exhaustive-deps` suppressions as a reason to skip a function, which matches my run; I didn't find it stated in release notes. Oxlint follows the older behaviour (the Oxc docs: "The React Compiler skips functions containing such suppressions").
- **For the post:** in Oxlint, an `exhaustive-deps` suppression is itself an error under `rule-suppression`, and it hides other findings in the same component. In ESLint, it hides one line of one rule. Either way, the suppression is not the cheap exit it was before the compiler.

### 3.6 Biome `useExhaustiveDependencies`: from Rome 10 to the React domain (2022–2025). VERIFIED (PRs, changelogs, npm registry, source at `@biomejs/biome@2.5.15`)

- **Origin:** Daniel Frederico Lins Leite (`xunilrj`), "feat(rome_js_analyze): exhaustive deps for React hooks," rome/tools PR #3355, opened 6 Oct 2022, merged 25 Oct 2022. It implemented "Missing dependencies;", "Extra dependencies;" and "Consider some React hooks returns as stable;". Listed among new rules in Rome 10.0.0 (npm, 8 Nov 2022). Still nursery at Rome 12.1.0 (May 2023): "The following rules are still a WIP:" (PR #4431).
- **Metadata (2.5.15, `crates/biome_js_analyze/src/lint/correctness/use_exhaustive_dependencies.rs` at `0b4c11f5`):** `version: "1.0.0"` (Biome 1.0.0, 28 Aug 2023), `sources: &[RuleSource::EslintReactHooks("exhaustive-deps").same(), …]`, `recommended: true`, `domains: &[RuleDomain::React, RuleDomain::Next]`, `fix_kind: FixKind::Unsafe`. `biome explain`: "Fix: unsafe", enabled when `react@>=16.0.0` is a dependency.
- **Recommended only for React projects:** #4293/#4294 (Emanuele Stoppa, Oct 2024) took it out of the recommended set for 2.0 because "library/framework rules should be opt-in"; Arend van Beelen jr. objected that "it would be a regression for React users". Domains (#4713, Dec 2024) answered both: Biome 2.0's changelog says it is "only recommended when the" `react` domain is enabled.
- **Options:** `hooks` (custom hooks with `closureIndex`, `dependenciesIndex` and `stableResult`; object keys added in #6398 by Josh Parnham, Jul 2025); `reportUnnecessaryDependencies` (PR #4135, Simon Paris, merged 1 Oct 2024, default `true`); `reportMissingDependenciesArray` (PR #4149, same author and day, default `false`). Both shipped by Biome 1.9.4 (17 Oct 2024).
- **Stable by default:** index 1 of `useState`, `useReducer` and `useTransition`, plus `useRef` and `useEffectEvent`. `useEffectEvent` came with React 19.2 support (#7669, Morten Barklund, merged 14 Oct 2025; Biome 2.3.0). `useActionState` isn't in the list.
- **The fix:** issue #5309 (Arend van Beelen jr., `arendjr`, Mar 2025) asked for one and said it "would always be **unsafe**," because "users may have intentional reasons for diverging from the suggested dependencies." PR #5326 (Naoki Ikeguchi, `siketyan`, merged 20 Mar 2025) added "an unsafe fix" that adds missing or removes extra dependencies; it shipped in Biome 2.0.0 (17 Jun 2025).
- **Docs (2.5.15 `explain`):** "Mismatching code & dependencies has a **very high risk** of creating bugs". Suppressing means you "“lie” to React about the values your Effect depends on," so "prefer changing the code over suppressing the rule where possible." It also documents per-dependency suppression, `biome-ignore lint/correctness/useExhaustiveDependencies(a)` (#3026, Biome 1.8.0).
- **For the post:** Biome gives the fix the right label (unsafe) and the docs give the right advice (change the code), and it reports more than ESLint does (3.7).

### 3.7 Biome reports extra effect dependencies, and explains them wrongly. VERIFIED (issue #630, source); my check (local run, Biome 2.5.15)

- **#630, "Break `useExhaustiveDependencies` into two rules"** (Corbin Crutchley, `crutchcorn`, 30 Oct 2023; closed 1 Oct 2024 by the option in 3.6):
  - The extra-dependency check "isn't a rule, as it doesn't break the React Rules of Hooks." and "specifying additional deps is how you're able to get some functionality" / "to work as-expected at times."
  - `flatplate` (Jul 2024): a way to turn it off for `useEffect` "should be provided imo since that is what `useEffect` is used for."
  - `wlechowicz` (Aug 2024) on the explanation Biome prints for a prop: "which is a misleading, false statement".
  - `douglasg14b` (Mar 2026): "It seems like the tension in this rule still remains."
- **Still true in 2.5.15 (my check):** `useEffect(() => console.log(a), [a, b])` with `a` and `b` props: "This hook specifies more dependencies than necessary: b." with the detail "Outer scope values aren't valid dependencies because mutating them doesn't re-render the component." `b` is a prop. The source picks that detail when `is_out_of_function_scope` returns true, which it does for parameters. The unsafe fix rewrites the array to `[a]`, so the effect stops re-running when `b` changes. ESLint and Oxlint's `exhaustive-deps` accept the array as written.
- **Other disagreements in the same run:** Biome reports `setName` and a `useRef` object as extra (ESLint accepts both); it is silent on `useMemo` with no array, `setState` in an effect with no array, an `async` effect callback and `ref.current` in cleanup, all of which ESLint and Oxlint report. #10685 (open, Jun 2026) asks Biome to warn on `ref.current` as ESLint does.
- **For the post:** "same" as ESLint in Biome's metadata isn't the same in behaviour. On effects specifically, Biome treats an extra dependency as a mistake; React's rule treats it as a legitimate way to choose when an effect runs.

### 3.8 Biome's fix can satisfy the rule and leave the effect stale (2025–2026). VERIFIED (issues, PRs, changelog); my check (local run, Biome 2.5.15)

- **My check (`lint/tsfile/useThing.ts`):** for `useEffect(() => { setValue(id.toUpperCase()); }, [])` Biome reports "This hook does not specify its dependency on id.toUpperCase." Its unsafe fix writes `[id.toUpperCase]`, and Biome then reports nothing. But every string shares `String.prototype.toUpperCase` (`"a".toUpperCase === "b".toUpperCase` is `true` in Node 24), so the array never changes when `id` does and the effect stays stale. ESLint asks for `id`.
- **History:** #7704 (Heiko Mathes, `heikomat`, Oct 2025): "incorrect fix for static functions from prototype chain". PR #7709 (Naoki Ikeguchi, merged 10 Oct 2025, Biome 2.2.6) changed it: "It should be avoided to add the method itself as a dependency" / "because it will break the prototype chain." PR #7810 reverted it on 21 Oct 2025: "Reverting for now as some users have complained about the new behaviour." / "the change was too big for a patch update." A similar change slipped into 2.3.14 (3 Feb 2026) and was reverted in 2.3.15 (#9017): "This behavior change will be reconsidered separately."
- **For the post:** a dependency fix can make the linter quiet without making the effect correct. Matching the linter's notion of a dependency isn't the same as matching React's.

### 3.9 My check: three linters, 24 effects (23 Oct 2026). VERIFIED (local run); re-run in the harness before quoting

- **Setup:** `lint/fixture/cases.jsx`, 24 components, run with each linter's dependency rule alone (ESLint `react-hooks/exhaustive-deps`, Oxlint `react/exhaustive-deps` with `correctness` off, Biome `useExhaustiveDependencies`), then through each fix mode on a fresh copy (`lint/run-fixes.sh`; table generated by `lint/summarize.py` into `lint/out/summary.md`). ESLint's dangerous mode is `enableDangerousAutofixThisMayCauseInfiniteLoops: true`.

| Case | ESLint | Oxlint | Biome | `oxlint --fix` | `oxlint --fix-dangerously` | ESLint dangerous autofix | `biome --write --unsafe` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c03 `user?.id` read, `[]` | missing `user?.id` | missing `user.id` | missing `user?.id` | — | `[user.id]` | `[user?.id]` | `[user?.id]` |
| c04 `[a, b]`, `b` unused | — | — | extra `b` | — | — | — | `[a]` |
| c05 `[setName]` | — | — | extra `setName` | — | — | — | `[]` |
| c06 `[ref]` | — | — | extra `ref` | — | — | — | `[]` |
| c07 `[ref.current]` | unnecessary | unnecessary | extra | `[]` | `[]` | `[]` | `[]` |
| c09 `useMemo` with no array | "does nothing" | "does nothing" | — | `…, [])` | `…, [])` | — | — |
| c10/c11 function or object made in render, `[]` | missing | missing | missing | — | `[load]` / `[options]` | same | same |
| c12 `setN(1)` in an effect, no array | reported | reported | — | — | — | `, []` | — |
| c13 `async` effect callback | reported | reported | — | — | — | — | — |
| c15 `useEffectEvent` result in deps | reported | reported | extra | — | — | removed | removed |
| c16 `setItems([...items, x])`, `[x]` | missing `items` | missing `items` | missing `items` | — | `[x, items]` | `[items, x]` | `[x, items]` |
| c18 `ref.current` in cleanup | reported | reported | — | — | — | — | — |
| c20 `setCount(count + 1)` in an interval, `[]` | missing `count` | missing `count` | missing `count` | — | `[count]` | `[count]` | `[count]` |

- **The loop (c16):** every fixer adds `items`, which turns a stale effect into one that sets `items` on every run and re-runs because `items` changed (3.10 ran the same shape in React 19.3: 502 effect runs before the test stopped it). After the fix, none of the three dependency rules reports anything on that line. Only ESLint's message offered the restructure: "You can also do a functional update 'setItems(i => ...)'" / "if you only need 'items' in the 'setItems' call." What still fires after the fix is the compiler's `set-state-in-effect` (ESLint and Oxlint) and react-doctor's `no-self-updating-effect`: "setItems() updates `items`, which is also in this effect's dependency list."
- **Fixes that create the next error (c10/c11):** after adding `load` or `options`, all three report their own fix: ESLint "The 'load' function makes the dependencies of useEffect Hook" … "change on every render."; Oxlint "React hook useEffect depends on `load`, which changes every render"; Biome "load changes on every re-render and should not be used as a hook dependency."
- **The interval (c20):** all three fixers add `count`, so the interval is torn down and recreated on every tick (3.10: 6 intervals created in 5 ticks); the functional update in c24 (`setCount((c) => c + 1)` with `[]`) needs no dependency and every linter accepts it.
- **What Ultracite's fix pass does with these (`packages/cli/src/commands/fix.ts`):** `ultracite fix` runs `oxlint --fix` (the 3 changes above), `biome check --write` (none) and `eslint --fix` (none). `ultracite fix --unsafe` runs `oxlint --fix-dangerously` (11 lines changed) and `biome check --write --unsafe` (16 lines); for ESLint it drops `--unsafe`.
- **For the post:** the three rules agree on the common case and disagree at the edges, and all three fixes add the dependency, including where that loops or resubscribes. The rule's own help, "Either include it or remove the dependency array.", offers two exits that both keep the effect.

### 3.10 My check: Ultracite's presets on 19 effects, each fix tier, then React (23 Oct 2026). VERIFIED (local run); re-run with the `research/` harness before quoting

- **Setup:** `scratchpad/effects-lit/check/fixture/` holds `cases.tsx` (18 components, c01–c18) and `use-chat-room.ts` (h01, a custom hook in a `.ts` file). Unlike 3.9, each linter runs Ultracite's preset rules, not one rule: Oxlint with the rules of `config/oxlint/react/index.mjs` (dumped to `check/oxlint-react.json`); Oxlint with the 149 React Doctor rules of `config/oxlint/js-plugins` (`check/oxlint-react-doctor.json`); ESLint with `config/eslint/react/eslint.config.mjs` and the TypeScript parser (`check/eslint-react.config.mjs`); Biome with `useExhaustiveDependencies` at its defaults, as the React preset sets it. Binaries from this worktree: Oxlint 1.86.0, ESLint 10.12.0, eslint-plugin-react-hooks 7.1.1, eslint-plugin-react-doctor and oxlint-plugin-react-doctor 0.9.16, Biome 2.5.15, React and react-dom 19.3.0, Node 24.14.1. Outputs: `check/out-*.json`; table: `check/case-table.md`; fixes: `check/fixes/` (diffs in `fixes/diffs.txt`); runtime: `check/runtime/demo.cjs`, `demo2.cjs` and their `-output.json`.

**What each preset reports**

| Case | Oxlint (react preset) | ESLint `react-hooks/*` | ESLint `react-doctor/*` | Biome |
| --- | --- | --- | --- | --- |
| c01 fetch in an effect, missing `userId` | `exhaustive-deps`, `exhaustive-effect-dependencies` | `exhaustive-deps` | none | missing `userId` |
| c02 derived state (`fullName`) | `no-deriving-state-in-effects`, `set-state-in-effect` | the same two | `no-derived-state`, `no-derived-state-effect` | none |
| c03 `options` object built in render, missing | `exhaustive-deps`, `exhaustive-effect-dependencies` | `exhaustive-deps` | none | missing `options` |
| c04 the same object, listed | `exhaustive-deps` ("changes every render") | `exhaustive-deps` (same) | `no-effect-with-fresh-deps` | "changes on every re-render" |
| c05 effect reads and writes `entries`, missing | `exhaustive-deps`, `exhaustive-effect-dependencies`, `set-state-in-effect` | `exhaustive-deps`, `set-state-in-effect` | `no-derived-state`, `no-derived-state-effect`, `rerender-functional-setstate` | missing `entries` |
| c06 interval with stale `count` | `exhaustive-deps`, `exhaustive-effect-dependencies` | `exhaustive-deps` | `rerender-functional-setstate` | missing `count`, `step` |
| c07 POST on `submitted` (react.dev's form, 2.5) | `exhaustive-deps`, `exhaustive-effect-dependencies` | `exhaustive-deps` | `no-event-handler`, `no-event-trigger-state` | missing `theme` |
| c08 reset `comment` when `userId` changes | `exhaustive-effect-dependencies` (extra), `set-state-in-effect` | `set-state-in-effect` | `no-adjust-state-on-prop-change`, `no-reset-all-state-on-prop-change` | extra `userId` |
| c09 notify the parent from an effect | none | none | `no-pass-live-state-to-parent`, `no-prop-callback-in-effect` | none |
| c10 `setWidth` in an effect with no array | `exhaustive-deps`, `set-state-in-effect` | the same two | none | none |
| c11 `async` effect callback | `exhaustive-deps`, `set-state-in-effect` | the same two | `no-async-effect-callback` | none |
| c12 `ref.current` in cleanup | `exhaustive-deps` | `exhaustive-deps` | none | none |
| c13 react.dev's fetch with `ignore` (1.10) | `set-state-in-effect` | `set-state-in-effect` | none | none |
| c14 `useEffectEvent` used correctly | none | none | none | none |
| c15 `useEffectEvent` listed as a dependency | `exhaustive-deps`, `exhaustive-effect-dependencies` | `exhaustive-deps` | `no-effect-event-in-deps` | extra `onVisit` |
| c16 `[user?.id]` | none | none | none | none |
| c17 setter listed as a dependency | `set-state-in-effect` | `set-state-in-effect` | `no-derived-state`, `no-derived-state-effect` | extra `setDraft` |
| c18 run-once ref guard (react.dev's lint page, 2.8) | none | none | none | none |
| h01 custom hook in a `.ts` file, missing `serverUrl` | `exhaustive-deps`, `exhaustive-effect-dependencies` | **none** (file not covered) | **none** | missing `serverUrl` |

- Oxlint's React Doctor plugin reported the same React Doctor rules per case as ESLint's (`check/out-oxlint-rd.json`).
- Oxlint's help differs from ESLint's: for c04, "Try memoizing this variable with `useRef` or `useCallback`." (ESLint: "wrap the initialization of 'options' in its own useMemo() Hook."); for c10, "Consider adding an empty list of dependencies" / "to make it clear which values are intended to be stable." For `ref.current` listed as a dependency, Oxlint says "unnecessary dependency: ref" with "Outer scope values aren't valid dependencies" (`fixes/oxlint-safe/`).
- The two dependency rules disagree on c08: ESLint's `exhaustive-deps` allows the extra dependency on purpose (1.8); Oxlint's `exhaustive-effect-dependencies` and Biome call it extra.

**What each fix tier changes**

- **`ultracite fix`:** ESLint `--fix` with the preset changed only `react/prefer-read-only-props`; Biome `--write` changed nothing (the rule's fix is unsafe). Oxlint `--fix` changed nothing on this fixture, but on three extra cases (`fixes/oxlint-safe/`) it rewrote `useMemo(fn)` to `useMemo(fn, [])` and removed `[ref.current]` and `[moduleCounter]`, as 3.2 says.
- **`ultracite fix --unsafe`, Oxlint (`--fix-dangerously`):** added `userId` (c01), `options` (c03), `entries` (c05), `step, count` (c06), `theme` (c07) and `serverUrl` (h01), and **replaced c04's `[options]` with `[]`**, so the effect no longer reacts to `roomId` at all (reproduced alone in `fixes/oxlint-c04/`).
- **`ultracite fix --unsafe`, Biome (`--write --unsafe`):** the same additions, and removed `userId` from c08, `onVisit` from c15 and `setDraft` from c17.
- **ESLint with `enableDangerousAutofixThisMayCauseInfiniteLoops`** (not set by Ultracite; it applies the first suggestion): the same additions, sorted (`[entries, entry]`), `, []` for c10 and `[url, ]` for c15. It left c04 alone.

**What the fixed code does** (React 19.3.0 through `react-dom/client` on a minimal DOM stand-in, development build, no Strict Mode)

| Case | Before | After the fix |
| --- | --- | --- |
| c05 `entries`, then `entry` changes once | 2 effect runs | **502 runs**, stopped by the test's cap; React logged "Maximum update depth exceeded" (2.13) |
| c03 → c04 `options`: two unrelated re-renders, then a room change | 1 connect, never reconnects to the new room | **4 connects in 4 renders** |
| c04 → Oxlint's dangerous fix (`[]`) | 4 connects | 1 connect, stale on a room change |
| c07 submit, then switch theme twice | 1 POST | **3 POSTs** |
| c08 type a comment, then switch user | comment cleared | **comment kept**, shown to the next user (Biome's unsafe fix) |
| `useMemo(fn)` → `oxlint --fix` `useMemo(fn, [])`, items `[1, 2]` then `[1, 2, 3]` | 6 | **3** (computed once, never again) |
| interval `setCount(count + 1)`, 5 ticks | `[]`: count stuck at 1 | `[count]`: 5, but **6 intervals created, 5 cleared**; the functional update with `[]`: 5 with 1 interval |
| `[user?.id]` → Oxlint's dangerous fix `[user.id]`, `user` undefined | renders | **throws** "Cannot read properties of undefined (reading 'id')" |

- **For the post:** on these hand-written cases, every linter's fix for the dependency rule turned latent problems into running ones: an infinite loop, a reconnect per render, a repeated POST, a frozen memo and a crash. The "remove" fixes removed behaviour. The rules that ask whether the effect should exist (`set-state-in-effect`, `no-deriving-state-in-effects`, React Doctor) reported most of the cases where the dependency fix went wrong, and none of them has a fix. Only Oxlint and Biome check the `.ts` hook. The corpus and the agent experiment should measure how often each shape occurs in real code.

### 3.11 `eslint-plugin-react-you-might-not-need-an-effect` (Nick van Dyke, 2025): the rules React Doctor ported. VERIFIED (README at `9f4c3af0`, npm registry, GitHub metadata, React Doctor's README)

- **Citation:** Nick van Dyke, https://github.com/nickjvandyke/eslint-plugin-react-you-might-not-need-an-effect (created 25 Apr 2025; 1,923 stars on 23 Oct 2026); MIT. npm: first published 1 May 2025; latest 1.0.2 (20 Aug 2026); 518,642 downloads in 12–18 Oct 2026 (`main/src/npm-downloads-2026-10-12_18.json`). It is the plugin Ultracite issue #447 asked for (6.2).
- **What it says:** an ESLint and Oxlint plugin to catch unnecessary `useEffect`s, "Highly recommended for new React developers". React's `set-state-in-effect` "rule flags synchronous `setState` calls inside effects," "However, unnecessary _effects_ go far beyond this." Rules: `no-derived-state`, `no-chain-state-updates`, `no-event-handler`, `no-adjust-state-on-prop-change`, `no-reset-all-state-on-prop-change`, `no-pass-live-state-to-parent`, `no-pass-data-to-parent`, `no-external-store-subscription`, `no-initialize-state`, each headed by a link to the react.dev section. It asks you to enable `react-hooks/exhaustive-deps` too: "the plugin assumes your effects receive correct dependencies." And: "This plugin is not exhaustive, but tries to be."
- **React Doctor's port:** its README (oxlint-plugin-react-doctor 0.9.16) says these rules are "ported 1:1 from" this plugin, with "same rule IDs, same diagnostic messages, same semantics".
- **For the post:** the rules that ask whether an effect should exist started as a community plugin built from react.dev's page, and depend on the dependency rule being right to work.

### 3.12 react-doctor: who makes it and how it ships (2026). VERIFIED (npm registry, GitHub metadata, package files); Vendor (Million Software)

- **Citation:** millionco/react-doctor (https://github.com/millionco/react-doctor), created 13 Feb 2026, 15,041 stars on 23 Oct 2026; repository description "Your agent writes bad React. This catches it". npm: `react-doctor` 0.0.1 on 13 Feb 2026; `eslint-plugin-react-doctor` and `oxlint-plugin-react-doctor` first published 15 May 2026 (0.2.0-beta.2); latest 0.9.18 (12 Oct 2026); this repo has 0.9.16. Package `author`: "Aiden Bai". Docs: https://react.doctor/docs
- **Licence:** "Modified MIT License", "Copyright (c) 2026 Million Software, Inc.", with two uses needing written permission: using it "as training, fine-tuning, or evaluation data," or as input "to any automated pipeline for training or improving" a model; and selling it as a hosted product.
- **Packaging:** the ESLint plugin depends on the Oxlint plugin, which "owns the rule implementations"; the ESLint one "wraps these same rules for ESLint". Both 0.9.16 packages export the same 906 rules (my count, `src/react-doctor-0.9.16-meta.json`); the README's "287 rules" is out of date. It also ships a port of `react/exhaustive-deps` from Oxc. Weekly downloads, 12–18 Oct 2026: `react-doctor` 1,254,467; `oxlint-plugin-react-doctor` 1,411,604; `eslint-plugin-react-doctor` 41,653 (`eslint-plugin-react-hooks`: 59,659,675).
- **Aimed at agents:** the README: "Install the skill to help your coding agent find and fix React issues". Each rule's docs page has a "Validation prompt" and a "Fix prompt" written for agents, for example "Make the smallest change that fixes the root cause." and "Do not disable the rule or suppress matching code." alongside "The diagnostic proves only that the detector’s modeled source pattern matched." The shipped skill (`skills/react-doctor/SKILL.md` at `84ad0c8d`) tells agents to fetch a remote playbook with `curl`; it was read as data and not fetched.
- **Its own `exhaustive-deps` port** says what the post is about: "Don't blindly add missing dependencies. Read the hook callback first." The docs page: "Match the deps array to what the hook callback actually captures," / "or stabilize/move recreated values instead of blindly adding them."
- **For the post:** a third-party rule set built for agents' output, which tells agents not to suppress and not to add dependencies blindly. Treat its claims about agents as the vendor's.

### 3.13 react-doctor's effect rules follow react.dev's list. VERIFIED (package metadata, docs pages); my check (local run)

- **The rules** (titles and severities from 0.9.16 metadata; none has a fix, since no rule's ESLint `meta` sets `fixable`; the last column says whether the rule's recommendation links react.dev's "You Might Not Need an Effect", unless noted):

| Rule | Title | Severity | Cites react.dev |
| --- | --- | --- | --- |
| `no-derived-state-effect` | Derived state stored in an effect | warn | yes |
| `no-derived-state` | Derived value copied into state | warn | yes (#updating-state-based-on-props-or-state) |
| `no-adjust-state-on-prop-change` | State adjusted after a prop changes | warn | yes (#adjusting-some-state) |
| `no-reset-all-state-on-prop-change` | All state reset on prop change | warn | yes (#resetting-all-state-when-a-prop-changes) |
| `no-chain-state-updates` | State updates chained through effects | warn | yes (#chains-of-computations) |
| `no-effect-chain` | Effects chained together | warn | no |
| `no-event-handler` | Event logic handled in an effect | warn | yes (#sharing-logic-between-event-handlers) |
| `no-effect-event-handler` | Effect used as an event handler | warn | no |
| `no-pass-live-state-to-parent` | Live state pushed to parent via effect | warn | yes (#notifying-parent-components-about-state-changes) |
| `no-prop-callback-in-effect` | Parent kept in sync with a callback effect | warn | no |
| `no-self-updating-effect` | Effect updates its own dependency | warn | yes |
| `no-fetch-in-effect` | Data fetching inside an effect | warn | no |
| `effect-needs-cleanup` | Effect subscription or timer never cleaned up | error | no |
| `prefer-use-effect-event` | Effect re-subscribes on a changing callback | warn | the `useEffectEvent` reference |
| `no-effect-with-fresh-deps` | Effect dependency recreated every render | error | no |
| `no-mutable-in-deps` | Mutable value in effect dependencies | error | no |
| `no-effect-event-in-deps` | Effect Event listed in effect deps | error | no |
| `no-async-effect-callback` | Async effect callback | warn | no |
| `no-set-state-after-await-in-effect` | State update after await in an effect | warn | no |
| `no-whole-object-dep-with-member-reads` | Whole props object in deps while only members are read | warn | no |
| `no-stale-timer-ref` | Cleared timer ref keeps the stale id | warn | no |
| `hooks-no-nan-in-deps` | NaN in a hook dependency array | warn | retired |
| `no-cascading-set-state` | Multiple setState calls in one effect | warn | retired |

- **Two are retired** but still exported: `hooks-no-nan-in-deps` ("Retired: React compares dependencies with Object.is.") and `no-cascading-set-state` ("Retired: React batches synchronous state updates from one effect"). In my run, `no-cascading-set-state` didn't fire on an effect with two setters.
- **My check (`lint/fixture/ymnnae.jsx`, eight examples shaped like react.dev's):** derived state, resetting state on a prop change, event logic in an effect, notifying a parent, fetching, an un-cleaned listener and a chain of effects were each reported, often by two or more rules at once (for the derived `fullName`: `no-derived-state-effect`, `no-derived-state`, the compiler's `set-state-in-effect` and `no-deriving-state-in-effects`). Messages are about cost: "You pay an extra render for state you can derive from other values." An interval re-subscribing on a changing `onTick` prop was not reported by `prefer-use-effect-event`.
- **react.dev's own fetch pattern is flagged (`lint/fixture/fetch-ignore.jsx`):** react.dev's race-condition fix (the `let ignore = false` cleanup, `you-might-not-need-an-effect.md` at reactjs/react.dev `ae5e4807`) gets `no-fetch-in-effect` ("fetch() inside useEffect can race, double-fire, or leak.") and `no-promise-then-side-effect-in-effect-without-catch`. The same fetch with an `AbortController` and a `.catch` gets neither. The rule's docs say to suppress it for "a one-shot fetch with proper AbortController cleanup".
- **For the post:** react-doctor turns React's list of unnecessary effects into rules, which the dependency rule never did. It overlaps heavily with the compiler rules, and an agent under Ultracite's prompt can't take the route the docs' "Suppress when:" notes offer.

### 3.14 Vue: `watch` takes sources, `watchEffect` tracks them. VERIFIED (vuejs/docs `40aa88af`)

- **Citation:** Vue docs, "Watchers" and "Computed Properties" (`src/guide/essentials/watchers.md`, `computed.md`). https://vuejs.org/guide/essentials/watchers.html
- **What it says:**
  - "`watchEffect()` allows us to track the callback's reactive dependencies automatically." For several dependencies, it "removes the burden of having to maintain the list of dependencies manually."
  - The limit: "`watchEffect` only tracks dependencies during its **synchronous** execution."
  - The trade-off: `watch` "separates dependency tracking from the side effect," / "giving us more precise control over when the callback should fire." `watchEffect` "makes its reactive dependencies less explicit."
  - Derived values go in `computed`: "computed getter functions should only perform pure computation"; "don't mutate other state, make async requests, or mutate the DOM".
- **For the post:** Vue offers both an explicit source list and automatic tracking, and names the cost of each. Its explicit `watch` is closer to what React's array is for: choosing when an effect fires.

### 3.15 Solid: tracking by reading, `on` for explicit lists. VERIFIED (solidjs/solid-docs `dadb1f19`)

- **Citation:** Solid docs, "Effects" (`src/routes/(0)concepts/(3)effects.mdx`), `createEffect` and `on` references. https://docs.solidjs.com/concepts/effects
- **What it says:** "Solid automatically tracks the dependencies of an effect," / "so you do not need to manually specify them." It "minimizes the chances of overlooking or incorrectly identifying dependencies." But: "It's best to avoid setting signals within effects," / "as this can lead to additional rendering or even infinite loops"; use `createMemo` instead. And "`on` is designed to be passed into a computation to make its dependencies explicit."
- **For the post:** removing the array removes the missing-dependency bug class, not the derived-state one. Solid's docs give the same warning React's do.

### 3.16 Svelte 5: `$effect` is "an escape hatch". VERIFIED (sveltejs/svelte `356c8766`, eslint-plugin-svelte 3.23.0)

- **Citation:** Svelte docs, "$effect" (`documentation/docs/02-runes/04-$effect.md`). https://svelte.dev/docs/svelte/$effect
- **What it says:**
  - "`$effect` automatically picks up any reactive values" read synchronously; "Values that are read _asynchronously_" "will not be tracked."
  - "you should _not_ update state inside effects," because "it will make code more convoluted and will often lead to never-ending update cycles."
  - "When not to use `$effect`": it "is best considered something of an escape hatch"; "avoid using it to synchronise state." Use `$derived` instead.
- **Lint:** eslint-plugin-svelte 3.23.0's `prefer-writable-derived`, "Prefer using writable $derived instead of $state and $effect" (recommended, suggestions, no fix). Ultracite's ESLint Svelte preset lists every non-deprecated `svelte/` rule as `"error"` (`config/eslint/svelte/rules/svelte.mjs`).
- **For the post:** Svelte has no dependency array to lint, and still needed a section called "When not to use `$effect`" and a lint rule for the same derived-state mistake.

### 3.17 Angular: "Effects should be the last API you reach for." VERIFIED (angular/angular `c27695f2`, `adev/src/content/guide/signals/effect.md`)

- **Citation:** Angular docs, "Effects". https://angular.dev/guide/signals/effect
- **What it says:** "Effects should be the last API you reach for." "Always prefer `computed()` for derived values". "Avoid using effects for propagation of state changes." because "This can result in `ExpressionChangedAfterItHasBeenChecked` errors, infinite circular updates," or extra change detection. Tracking: effects "keep track of their dependencies dynamically," / "and only track signals which were read in the most recent execution."
- **For the post:** the strongest wording outside React, from a framework with automatic tracking.

### 3.18 Preact: signals track automatically; hooks use the array. VERIFIED (preactjs/signals `07b53ade`; Oxc issue)

- **Signals** (`packages/core/README.md`): a signal read inside `computed` "will be automatically subscribed to and tracked as a dependency"; `effect(fn)` "is very similar to [`computed(fn)`]". The React adapter adds `useSignalEffect`.
- **Hooks:** Preact's hooks take dependency arrays like React's; Biome checks "their Preact counterparts" by default (`biome explain`). Mixing the two confuses the React rule: Oxc #14334 (`holoflash`, Oct 2025) asked for a signals-aware `exhaustive-deps` because it "isn't playing very nicely" with signals; `camc314`: "The `react/exhaustive-deps` rule is soely focused on react issues." (sic) and suggested a JS plugin.
- **For the post:** context. Automatic tracking and dependency arrays coexist in one codebase, and the array rule can't see the signals.

### 3.19 TC39 Signals (Stage 1): context only. VERIFIED (tc39/proposal-signals `9124ed91`)

- **Citation:** "JavaScript Signals standard proposal," README (repo created 14 Aug 2023). https://github.com/tc39/proposal-signals
- **What it says:** "Stage 1". "**Automatic Dependency Tracking**": "A computed Signal automatically discovers any other Signals that it is dependent on". Effects stay outside the proposal: "A library or framework defines effects based on other Signal primitives".
- **For the post:** one sentence at most. The direction outside React is automatic tracking, and even the proposal leaves effects to frameworks.

### 3.20 Summary: how each tool finds an effect's dependencies

| Tool | How dependencies are found | What the docs warn about |
| --- | --- | --- |
| React `useEffect` | a hand-written array, checked by a lint rule (ESLint, Oxlint, Biome) | many effects shouldn't exist (section 2) |
| React Compiler rules (ESLint 7.x, Oxlint) | the compiler infers them; `exhaustive-effect-dependencies` compares (live only in Oxlint) | `set-state-in-effect`, derived state |
| Vue | `watch`: explicit sources; `watchEffect`: tracked synchronously | `computed` for derived values |
| Solid | tracked on read; `on` for explicit lists | setting signals in effects; use `createMemo` |
| Svelte 5 | tracked synchronously | "an escape hatch"; use `$derived` |
| Angular | tracked dynamically | "the last API you reach for"; use `computed()` |
| Preact Signals | tracked on read | — |

---

## 4. Research

Items 4.1–4.12 cover React hooks and effects: formal models, tools, bug taxonomies, smells, Stack Overflow and a negative finding. 4.13–4.20 cover lint suppression, including two counts of my own (4.18 public code search, 4.19 the corpus). Files are in `scratchpad/effects-lit/A/` (`text/` for quoted texts, `raw/` for API and search responses and rendered figure pages, `dl/` for PDFs, `scripts/`) unless noted. Stack Exchange API calls ran 23 Oct 2026 23:57 to 24 Oct 00:35 UTC, without a key or login. GitHub code search ran read-only through `gh api search/code` on 24 Oct 2026, 00:04–00:34 UTC.

### 4.1 Lee, Ahn and Yi, "React-tRace: A Semantics for Understanding React Hooks" (OOPSLA 2025). VERIFIED (arXiv full text, v2)

- **Citation:** Jay Lee, Joongwon Ahn, Kwangkeun Yi (Seoul National University), _Proc. ACM Program. Lang._ 9, OOPSLA2, Article 289, Oct 2025, 42 pp. https://doi.org/10.1145/3763067 ; arXiv:2507.05234 v2 (21 Aug 2025). Code: Zeta611/react-trace.
- **What it says:**
  - Hooks' "semantics are often seen as opaque to developers, leading to UI bugs."
  - "Infinite re-rendering is perhaps the most catastrophic bug one can encounter when using Hooks."
  - The mechanism: "setting state within an Effect triggers the runtime to Check", which re-runs the body and then the effect.
  - A search for `"useEffect" "infinite"` on Stack Overflow "returns more than 1600 results" (a screenshot dated 24 Mar 2025 is archived).
  - A top-level setter call: "an unconditional top-level call to a setter function causes an infinite loop" / "and is never correct."
  - On ESLint: "a de facto standard static analyzer that syntactically checks code".
- **Numbers:** a conformance suite that "contains 38 tests that cover 18 scenarios" across 44 evaluation rules, all reproduced on React 16.14.0, 17.0.2, 18.3.1 and 19.1.0; one minor difference comes from a React optimisation.
- **Method:** an operational semantics, a definitional interpreter and a visualiser. Not an empirical study of bugs.
- **Caveat:** dependency arrays aren't modelled: "We only consider the simplest form of useEffect in our language", and supporting dependencies is called "a straightforward extension".
- **For the post:** the only peer-reviewed formal model of hooks. It explains why setting state in an effect loops; it says nothing about how often that happens in real code.
- **Text:** `A/text/arxiv-2507.05234-raw.txt`

### 4.2 Madsen, Lhoták and Tip, "A Semantics for the Essence of React" (ECOOP 2020). VERIFIED (metadata + abstract)

- **Citation:** Magnus Madsen, Ondřej Lhoták, Frank Tip, ECOOP 2020, LIPIcs. https://doi.org/10.4230/LIPIcs.ECOOP.2020.12
- **What it says:** before this paper, "no formal specification of React’s semantics exists". It models class components and "lifecycle hooks that enable programmers to perform actions outside the framework".
- **For the post:** context only. The formal work on React started with class lifecycles.
- **Text:** `A/text/openalex-madsen-ecoop2020.txt`

### 4.3 Wunder, Das and Gaboardi, "A Type-and-Effect System for Temporal Dependency Analysis of Render-based Reactive Programs" (arXiv 2026). VERIFIED (preprint full text)

- **Citation:** June Wunder, Ankush Das, Marco Gaboardi (Boston University), arXiv:2607.27074 v1 (29 Jul 2026), 56 pp. Not peer reviewed.
- **What it says:**
  - Timing assumptions in React-like runtimes lead "to subtle bugs such as stale reads, transient inconsistencies," / "order-dependent behavior, and unintended feedback cycles."
  - On handlers: "Deciding which state changes invalidate each handler is left entirely to the programmer."
  - The effect graph lets standard algorithms "statically detect render cascades and inter-render loops".
- **Method:** Willow, a core calculus with a time-aware semantics and a prototype checker, evaluated "on representative reactive patterns such as debouncing, form inputs," and API-driven updates, not on real codebases.
- **For the post:** an outside statement of the dependency-array problem: when an effect reruns is left to the programmer. A 2026 preprint, so framing only.
- **Text:** `A/text/arxiv-2607.27074-raw.txt`

### 4.4 Hwang et al., "HookLens: Visual Analytics for Understanding React Hooks Structures" (IEEE PacificVis 2026). VERIFIED (arXiv full text; figures read from rendered pages)

- **Citation:** Suyeon Hwang, Minkyu Kweon, Jeongmin Rhee, Soohyun Lee, Seokhyeon Park, Seokweon Jung, Hyeon Jeon, Jinwook Seo (Seoul National University; Hwang also Samsung Electronics). https://doi.org/10.1109/PACIFICVIS68791.2026.00036 ; arXiv:2602.17891 v2 (23 Mar 2026).
- **What it says:**
  - On Stack Overflow, 2020–2024, "two Hooks account for 82% of all Hooks-related posts" (posts tagged `reactjs` that mention a hook's name, counted through the Stack Exchange API).
  - One target anti-pattern is "Effect modifying parent States": parent state "modified by the execution of an Effect defined in one of its child Components".
  - On eslint-plugin-react-hooks: it "primarily enforces basic implementation rules". 11 of 12 participants "report using VS Code together with extensions such as eslint-plugin-react-hooks".
  - LLM comparison: "Except for Codex CLI with GPT-5, all tools perform worse" / "than even the VS Code baseline." And "all four LLMs frequently produce false positives".
- **Numbers:**
  - Figure 2 (read from the rendered chart): useState 46.9%, useEffect 35.1%, useRef 6.4%, useContext 4.9%, useCallback 3.0%.
  - User study: 12 developers (6 with less than two years of experience, 6 with more); two projects of 2,707 and 3,937 JSX lines, each with only 2 instances of the effect anti-pattern.
  - Table 2, F1 on "Effect modifying parent states": HookLens .817 ± .284 against VS Code .160 ± .316.
  - LLM comparison: Claude Code (Sonnet 4 and Opus 4.1), Codex CLI (GPT-5) and Gemini CLI (2.5 Pro), "six independent trials" each, one-shot prompt. Figure 7 F1, read off the bars and approximate: HookLens about 0.64, GPT-5 about 0.60, VS Code about 0.22, the others about 0.15–0.18.
- **Caveats:** small samples; the anti-patterns are the authors' definitions; the LLM task was detection across files, not fixing lint errors.
- **For the post:** `useEffect` questions are about a third of Stack Overflow's hook questions; the anti-pattern of an effect writing parent state is React's notifying-parents category (2.2); agents were poor at spotting effect structure across files (also 5.4).
- **Text:** `A/text/arxiv-2602.17891-raw.txt`; figures `A/raw/hooklens-p2-02.png`, `A/raw/hooklens-p7-07.png`, `A/raw/hooklens-p9-09.png`

### 4.5 Tang, Alimadadi and Sumner, "From Logic to Toolchains: An Empirical Study of Bugs in the TypeScript Ecosystem" (MSR 2026). VERIFIED (arXiv full text). Also in `type-escape-hatches.md` 5.4

- **Citation:** TianYi Tang, Saba Alimadadi, Nick Sumner (Simon Fraser University), MSR ’26 (13–14 Apr 2026, Rio de Janeiro, per the page header); arXiv:2601.21186.
- **What it says:** "We analyze 633 bug reports from 16 popular open-source repositories". "UI Bugs (12.5%) are also common", and that category's common patterns include "incorrect state updates due to stale closures or improper hook usage".
- **Method:** two researchers labelled a seed set; a fine-tuned sentence-embedding model labelled the rest, with spot checks. The 16 repos span domains (xyflow, chakra-ui, shadcn-table, n8n and others) and aren't all React.
- **Caveat:** hook bugs aren't counted separately, so there is no hooks or effects share.
- **For the post:** the nearest bug taxonomy names stale closures and hook misuse inside a 12.5% UI category, without counting them.
- **Text:** `A/text/arxiv-2601.21186.txt`

### 4.6 Shahoor, Khamit, Yi and Kim, "LeakPair: Proactive Repairing of Memory Leaks in Single Page Web Applications" (ASE 2023). VERIFIED (arXiv full text; venue from the arXiv comment)

- **Citation:** Arooba Shahoor, Askar Yeltayuly Khamit, Jooyong Yi, Dongsun Kim; arXiv:2308.08144 (16 Aug 2023), "Accepted for ASE 2023" per the arXiv comment. DOI not checked.
- **What it says:** "even a single memory leak in a SPA app can cause performance degradation". Four fix patterns: unreleased subscriptions, unremoved event listeners, and uncleared `setTimeout` and `setInterval` timers; without cleanup, "the setInterval timer will keep on ticking".
- **Numbers:** 124 React and 65 Angular memory-leak bugs mined from GitHub and Stack Overflow; "Our four fix patterns can also fix 102 out of 124 (82%)" of the React ones. Of 20 PRs, "11 out of 20 PRs (55%) are approved by the developers," / "out of which 8 were merged directly."
- **Caveat:** patches go "in the component destructor"; the paper doesn't say whether it handles a `useEffect` cleanup return.
- **For the post:** the closest research to React Doctor's cleanup rules (`effect-needs-cleanup`, listener and timer cleanup): missing teardown is a recurring, fixable leak class in real React apps.
- **Text:** `A/text/arxiv-2308.08144.txt`

### 4.7 Ferreira and Valente, "Detecting code smells in React-based Web apps" (IST 2023). VERIFIED (the author's PhD thesis containing the study); the IST paper itself metadata only

- **Citation:** Fábio Ferreira, Marco Túlio Valente, _Information and Software Technology_ 155:107111 (online 23 Nov 2022), https://doi.org/10.1016/j.infsof.2022.107111 (no abstract in OpenAlex). Read from Fábio da Silva Ferreira, "Assisting JavaScript Front-End Developers in Maintaining and Evolving React-Based Applications: Code Smells and Refactoring Operations", PhD thesis, UFMG, 2023: https://repositorio.ufmg.br/bitstream/1843/59120/1/PhD_Thesis_Fabio_Final.pdf
- **What it says:** a catalogue of 12 React smells from a grey-literature review and interviews with six professional developers. One is "Props in Initial State"; a participant: "When we initialize a state with props, the component practically" / "ignores all updated values of the props."
- **Numbers:** ReactSniffer on "the top-10 React projects ranked by stars": "We found four projects initializing their state with props, with 22 occurrences in total." (11 in apache/superset).
- **Caveat:** no smell in the catalogue targets effects or dependency arrays.
- **Related, not read (closed):** Nunes, Bezerra, Ferreira, Gois, Valente, "Detection of code smells in React with TypeScript applications", IST 187 (2025), https://doi.org/10.1016/j.infsof.2025.107835 ; Ferreira, Borges, Valente, "Refactoring React-based Web apps", JSS 215 (2024), https://doi.org/10.1016/j.jss.2024.112105 .
- **For the post:** the smells literature covers copying props into state (React Doctor's `no-derived-useState`) but has no effect smells.
- **Text:** `A/text/ferreira-thesis.txt`, `A/text/openalex-ferreira-ist2023.txt`

### 4.8 Mosemann and Schlesinger, "To Query or Not to Query: Design Decisions and Practice Insights for React Server-State Management" (AKWI 2026). VERIFIED (full text); a single prototype, ANECDOTAL as evidence

- **Citation:** Martin Mosemann, Sebastian Schlesinger, _AKWI 2026 – Wirtschaftsinformatik im Dialog_, GI, pp. 73–84. https://doi.org/10.18420/akwi2026_06
- **What it says:** "the useEffect hook [Me24], provides no built-in support for caching, deduplication, or retry logic." Their observations suggest "query libraries systematically reduce recurring defect classes": duplicate in-flight requests, mutation workflows, pagination.
- **Numbers:** twelve scenarios, each built three ways: "(native: 818 LOC; TanStack Query: 626; SWR: 546)". "The native approach requires no external packages but 178 LOC of infrastructure".
- **Caveats:** the authors' own prototype; defects observed by design, not counted in the field.
- **For the post:** a worked case for `no-fetch-in-effect`: fetching in an effect means rebuilding caching, deduplication and race handling yourself. An illustration.
- **Text:** `A/text/akwi2026-mosemann.txt`

### 4.9 Nugroho et al. and Ardity et al., Stack Overflow studies of React questions (arXiv 2025). VERIFIED (full texts); nothing on hooks

- **Citations:** Nugroho, Kurniaji, Islam, Kabir, Ardity, Uddin, "Hot Topics and Common Challenges: an Empirical Study of React Discussions on Stack Overflow", arXiv:2507.15624; Ardity, Nugroho, Islam, "Exploring React Library Related Questions on Stack Overflow: Answered vs. Unanswered", arXiv:2507.04390. Both say "conference paper" without a venue. An earlier version is in _Computer Science and Information Technologies_ 4(1), 2023 (https://doi.org/10.11591/csit.v4i1.pp14-23), metadata only.
- **What they say:** SOTorrent data 2012–2021, "resulting in 447,542 questions out of 22,087,195 question posts"; 384 coded questions, "algorithmic error is the most frequent issue faced by all groups of users". The second models answerability over 534,820 questions.
- **For the post:** don't cite these for hooks. General React Stack Overflow studies don't isolate effects.
- **Text:** `A/text/arxiv-2507.15624-raw.txt`, `A/text/arxiv-2507.04390.txt`

### 4.10 Stack Overflow counts for hooks and `useEffect`. My check (public Stack Exchange API, no key, 23–24 Oct 2026 UTC)

- **Method:** `/2.3/tags/{tags}/info` and `/2.3/search/advanced?filter=total` with `tagged=`, `title=`, and `fromdate`/`todate` per year. Surviving questions only; deleted ones are excluded. Raw responses `A/raw/se-*.json`, fetch time in `se-fetch-date.txt`.
- **Tags:** `reactjs` 473,730; `react-hooks` 30,514; `use-effect` 3,490; `use-state` 3,287; `use-ref` 540. Synonyms map `use-effect` → `react-hooks` (2,411 applied) and `use-state` → `react-hooks`, so the small tags undercount.
- **Titles:** "useEffect" in the title, 7,578 questions (7,073 also tagged `reactjs`); "infinite loop" in the title and tagged `reactjs`, 1,077; "missing dependency" in the title and tagged `reactjs`, 228.

| Year | `reactjs` | `react-hooks` (share of `reactjs`) | "useEffect" in title |
| ---- | --------- | ---------------------------------- | -------------------- |
| 2019 | 59,078    | 3,278 (5.5%)                       | 663                  |
| 2020 | 84,761    | 6,924 (8.2%)                       | 1,778                |
| 2021 | 81,277    | 7,491 (9.2%)                       | 1,950                |
| 2022 | 78,513    | 7,430 (9.5%)                       | 1,910                |
| 2023 | 41,212    | 4,221 (10.2%)                      | 912                  |
| 2024 | 16,495    | 946 (5.7%)                         | 273                  |
| 2025 | 3,105     | 84 (2.7%)                          | 56                   |

- **Top-voted questions with "useEffect" in the title:** (1) "How to fix missing dependency warning when using useEffect React Hook" (score 890, 1,255,264 views, 2019); (2) "useEffect() is called twice even if an empty array is used as an argument" (809, 600,360 views), the Strict Mode question; (3) the async-callback warning (595, 927,113 views); (4) "How to call loading function with React useEffect only once" (594, 772,152 views).
- **Caveats:** title search matches words, not intent. The decline after 2022 is Stack Overflow's overall decline, not less confusion about hooks.
- **For the post:** the four most-voted `useEffect` questions are the missing-dependency warning, Strict Mode's double run, async effect callbacks and "run once". Each maps to a rule or a docs section (1.8, 2.1, 2.12).

### 4.11 The canonical "missing dependency" question and its answers (Stack Overflow 55840294, 2019–2026). ANECDOTAL (my count of one thread)

- **Citation:** https://stackoverflow.com/questions/55840294 , asked 25 Apr 2019; fetched with all 26 answers through the API on 24 Oct 2026.
- **What it says:** the asker hit the warning "when I attempt to prevent an infinite loop" / "on a fetch request", quotes #14920's advice to disable the rule "if you think you know what you're doing", and adds "I'm not confident in what I'm doing". The accepted answer (score 778): "you could simply move it into the effect and avoid the warning"; otherwise "you can disable the rule using // eslint-disable-next-line react-hooks/exhaustive-deps".
- **My count (keyword match, then read by hand):** 7 of 26 answers show an `eslint-disable` comment for the rule, including the accepted answer and the second-highest (448); 2 more turn the rule off in config (`"react-hooks/exhaustive-deps": 0` or `"off"`); 7 mention `useCallback`, 5 move the function into the effect; 1 (Jan 2026, score 0) mentions `useEffectEvent`. 3 of the 4 highest-scored answers offer suppression or switching the rule off.
- **For the post:** the internet's main answer to the warning offers restructuring and suppression side by side, and React's later answer, `useEffectEvent`, sits at the bottom.
- **Text:** `A/text/so-55840294-answers.txt`

### 4.12 Empirical studies of `useEffect` bugs, dependency arrays or `exhaustive-deps`: none found. Negative finding (searches, 23–24 Oct 2026)

- **Searched:** the arXiv API (React hooks, useEffect, re-render, stale closure, React components or applications, React Compiler, Redux, front-end and JavaScript bugs); Crossref (no `mailto`); OpenAlex title and abstract search; WebSearch for ICSE, FSE, ASE, MSR, ICSME, SANER, EMSE, TOSEM and TSE; the reference lists of 4.1, 4.4, 4.5 and a 2026 prop-drilling paper. DBLP blocked automated access and Semantic Scholar rate-limited every request.
- **Found instead:** formal models (4.1–4.3), one visual-analytics tool with a 12-person study (4.4), a general TypeScript bug taxonomy (4.5), memory leaks (4.6), smells with no effect smells (4.7), one prototype comparison (4.8), Stack Overflow counts (4.10, 4.11).
- **No study measures** how often effects are unnecessary in real code, how often adding a dependency causes a loop, false-positive rates for `exhaustive-deps`, or what developers do with the warning.
- **For the post:** the evidence is React's own docs, issue threads, Stack Overflow and our own measurements. Say so plainly. The corpus and agent experiments would be new data.

### 4.13 Hu, Wang, Rubin and Pradel, "An Empirical Study of Suppressed Static Analysis Warnings" (FSE 2025). VERIFIED (author PDF)

- **Citation:** Huimin Hu, Yingying Wang, Julia Rubin, Michael Pradel, _Proc. ACM Softw. Eng._ 2(FSE), Article FSE014, July 2025. https://doi.org/10.1145/3715729 ; PDF https://software-lab.org/publications/fse2025_suppressions.pdf
- **What it says:** "50.8% of all suppressions do not affect any warning", and "some suppressions, including useless ones, may unintentionally hide future warnings". "the number of suppressions in a project tends to continuously increase over time". "False positives are the most common reason for using suppressions (34.4% of all cases)." The authors call theirs "the first to investigate in-depth how developers use suppressions in practice" and don't cite 4.14.
- **Numbers:** 7,357 Pylint suppressions in 46 Python projects, "which corresponds to 1.1 suppressions per 1,000 lines of code"; ten projects with 1,873 suppressions for evolution and usefulness; JavaScript: 179 warnings left unfixed in 46 student projects, 53.1% undefined elements, "many of which are due to a warning by ESLint" / "about using an undeclared variable"; 459 reason codings (Python 206, Java 61, JavaScript 192).
- **Caveat:** the JavaScript data are student projects reporting "the list of warnings they decide not to fix, together with the reasons", not `eslint-disable` comments in open source. No React rules.
- **For the post:** the best general evidence on suppressions: they pile up, half do nothing, and the top reason given is false positives. No ESLint open-source data.
- **Text:** `A/text/hu-fse2025-suppressions.txt`

### 4.14 Liargkovas, Panourgia and Spinellis, "Quieting the Static: A Study of Static Analysis Alert Suppressions" (arXiv 2023). VERIFIED (preprint full text)

- **Citation:** Georgios Liargkovas, Evangelia Panourgia, Diomidis Spinellis (AUEB; Spinellis also TU Delft), arXiv:2311.07482 v1 (13 Nov 2023), 11 pp. No published version found. Dataset https://doi.org/10.5281/zenodo.10119396
- **What it says:** "Contrary to expectations, false positives account for a minor proportion of suppressions." "A significant number of suppressions introduce technical debt". "Misleading suggestions and incorrect assumptions also lead to suppressions."
- **Numbers:** "we examine 1 425 open-source Java-based projects" using FindBugs or SpotBugs; 168 (13%) have a filter-file suppression and 91 (7%) a suppression annotation. Coded samples: 368 configuration entries and 340 annotations; false positives 17 (5%) and 15 (4%); unactionable warnings 250 (68%) and 209 (61%).
- **Caveat:** the discussion gives the false-positive rate as "(5%)" in one place and "was considerably lower (13%) than the lowest estimate in previous" work in another; Table 3 supports about 5%.
- **For the post:** in Java, suppressions mostly mark warnings the developer can't or won't act on, not tool mistakes. That fits `exhaustive-deps`: the warning is usually right about the code, and the developer disagrees with the fix.
- **Text:** `A/text/arxiv-2311.07482-raw.txt`

### 4.15 Imtiaz, Rahman, Farhana and Williams, "Challenges with Responding to Static Analysis Tool Alerts" (MSR 2019 Mining Challenge). VERIFIED (author PDF via Wayback)

- **Citation:** Nasif Imtiaz, Akond Rahman, Effat Farhana, Laurie Williams, MSR 2019, pp. 245–249. https://doi.org/10.1109/MSR.2019.00049 ; PDF read from http://web.archive.org/web/20201003044006/https://akondrahman.github.io/papers/msr19_sat.pdf (the live copy is a 404).
- **What it says:** "we qualitatively analyze 280 Stack Overflow" questions; "the most prevalent question on SO is how to ignore and filter alerts" "(67 posts, 23.9%)". False-positive validation is second.
- **Caveat:** FindBugs, PMD, Coverity, SonarQube and similar; no JavaScript linters.
- **For the post:** how to make a warning go away has long been the top question about static-analysis alerts; 4.11 is the React version.
- **Text:** `A/text/imtiaz-msr2019.txt`

### 4.16 Christakis and Bird, "What Developers Want and Need from Program Analysis: An Empirical Study" (ASE 2016). VERIFIED (Microsoft Research PDF); Vendor (Microsoft)

- **Citation:** Maria Christakis, Christian Bird, ASE 2016, pp. 332–343. https://doi.org/10.1145/2970276.2970347 ; https://www.microsoft.com/en-us/research/wp-content/uploads/2016/07/ase-2016.pdf
- **What it says:** "The largest pain point is that the default rules or checks" enabled don't match what developers want; "Wrong checks are on by default" tops the chart. Takeaway: "Program analysis should not have all rules on by default." "46% of developers indicated that they use some mechanism to suppress warnings." "Suppressing warnings is important, preferably through code annotations." A developer: "so many people ignore it because it can have a lot of false positives".
- **Numbers:** "We received 375 responses" from Microsoft developers, plus interviews.
- **For the post:** a counterweight to an everything-on preset, from a large developer survey, and an explanation of why suppression features exist and get used.
- **Text:** `A/text/christakis-bird-ase2016.txt`

### 4.17 Tómasdóttir, Aniche and van Deursen on ESLint configurations (ASE 2017; TSE 2020). Cross-reference: `accessibility.md` 4.14 and `sort-keys.md` 4.30 (not re-verified here)

- Their 9,548 ESLint configs are from April 2017. Hooks shipped in React 16.8 (Feb 2019), so the most-disabled-rules lists can't include `react-hooks/*`. No later study of ESLint configurations was found.

### 4.18 How often hook rules are suppressed in public code. My check (24 Oct 2026, GitHub code search totals), re-run before quoting

- **Method:** `gh api -X GET search/code -f q='"<phrase>"'`, read-only, `total_count` only, as in `accessibility.md` 5.51. Counts are files, not comments, on default branches. The exhaustive-deps query returned 1,241,088 three times, 4 and 15 minutes apart. Queries and results in `A/raw/codesearch-{1..5}.tsv`; ranking in `A/text/codesearch-eslint-next-line-ranked.tsv`.
- **ESLint `eslint-disable-next-line <rule>`, 57 rules queried:** `react-hooks/exhaustive-deps` 1,241,088 (rank 1); `@typescript-eslint/no-explicit-any` 771,072; `@next/next/no-img-element` 436,224; `no-console` 410,624; `no-unused-vars` 343,040; `@typescript-eslint/no-unused-vars` 291,840. Compiler rules: `react-hooks/set-state-in-effect` 120,576 (rank 9); `react-hooks/rules-of-hooks` 39,168; `refs` 6,912; `purity` 5,856; `immutability` 5,536. Other forms of the exhaustive-deps suppression: `eslint-disable-line` 230,912; file-level `eslint-disable` 91,392.
- **Shares:** files with any `eslint-disable-next-line`: 8,060,928, so the exhaustive-deps phrase is in 15.4% of them; in `.tsx` files, 761,856 of 2,342,912 (32.5%). By extension: `.tsx` 761,856, `.jsx` 245,760, `.ts` 157,952, `.js` 151,552.
- **Biome `biome-ignore lint/...`:** `correctness/useExhaustiveDependencies` 55,040, second of 8 rules queried after `suspicious/noExplicitAny` (58,368); any `biome-ignore lint`: 371,712 (14.8%).
- **Oxlint `oxlint-disable-next-line`:** `react-hooks/exhaustive-deps` 2,952 and `react/exhaustive-deps` 840, against 148,736 files with any directive (2.6%); `typescript/no-explicit-any` 9,520.
- **Caveats:** code-search totals are estimates, and some look odd (`react/no-unescaped-entities` only 2,472; bare `"useEffect"` in TSX an implausible 27,459,584). Phrase matching ignores punctuation. Only the rules queried were ranked. Vendored code, forks and generated repos are included, and nothing says whether a suppression was justified or who wrote it. Totals drift (a Biome query from `accessibility.md` 5.51 rose from 7,680 to 9,232 in nine days).
- **For the post:** among the 57 ESLint rules queried, the exhaustive-deps suppression appears in more public files than any other, about 1.6 times `no-explicit-any`, and in about one in three TSX files that suppress anything. `set-state-in-effect` already has about 120,000. A rough count of files with that comment, not a rate.

### 4.19 My check: `exhaustive-deps` is the most-suppressed rule in two of the seven React codebases in the corpus (23 Oct 2026). VERIFIED (local run); rough, re-run in the harness before quoting

- **Setup:** the harness's own file lists (`research/corpus/scripts/collect-files.cjs` with `CORPUS_REPO_LISTS=repos-accessibility.json`, so tests, stories, fixtures and vendored files are excluded) for the seven corpus repos with React code, at the SHAs already cloned in `research/corpus/repos/` (excalidraw `4c00f31d`, next.js `d8bfc3c9`, trpc `796700d8`, shadcn `c2477f31`, radix `eb3a2b70`, react-aria `8e76acfb`, supabase `09f80f52`). Script `scratchpad/effects-lit/scripts/count-suppressions-harness.cjs`: a regex over `eslint-disable`, `oxlint-disable` and `biome-ignore` comments, counting the rule names each names, and over `useEffect`/`useLayoutEffect`/`useInsertionEffect(` calls. Output `check/corpus-suppressions-harness.json`. Then `scripts/effect-census.cjs` ran Oxlint 1.86.0 with only `react/exhaustive-deps`, `react/exhaustive-effect-dependencies`, `react/set-state-in-effect`, `react/no-deriving-state-in-effects` and `react/rule-suppression` on the same files, honouring in-file suppressions (`check/census/effect-census.json`).

| Repo (measured part) | Files | Effect calls | Suppression comments | Naming `react-hooks/exhaustive-deps` (with a `--` reason) | Its rank among suppressed rules | Oxlint `exhaustive-deps` hits left | `set-state-in-effect` hits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase Studio | 2,759 | 667 | 112 | 83 (4) | 1st | 137 | 156 |
| Excalidraw | 444 | 118 | 25 | 9 (0) | 1st | 0 | 19 |
| Radix Primitives | 160 | 155 | 16 | 5 (0) | 2nd, after `rules-of-hooks` (10) | 0 | 2 |
| tRPC | 176 | 5 | 63 | 2 (0) | 7th | 0 | 1 |
| React Aria Components | 71 | 32 | 105 | 1 (0) | 8th; 76 name Oxlint's `react/react-compiler` | 0 | 0 |
| Next.js | 1,416 | 79 | 124 | 1 (0) | 14th | 0 | 3 |
| shadcn/ui registry | 165 | 6 | 0 | 0 | — | 0 | 3 |

- **Pooled:** 101 `exhaustive-deps` suppressions among 445 suppression comments (23%) and 1,062 effect calls; 4 of the 101 give a reason. Supabase Studio alone has 83. The repos that suppress it also run it (they report 0 remaining hits), except Supabase, which has 137 hits left, so it probably doesn't fail CI on the rule (not checked).
- **The harness already has the better number.** The accessibility post's committed census (`research/corpus/results/accessibility/rule-census.json`, generated 15 Oct 2026 by `rule-census.cjs` with Ultracite's Oxlint core, React and js-plugins presets, Oxlint 1.86.0, `.tsx`/`.jsx` files only) counts each rule with suppression comments honoured (reported) and neutralised (raw). `react/exhaustive-deps`: 225 raw, 128 reported, so 97 hits (43%) are silenced in-file, and all 128 left are Supabase's (205 raw). `react/set-state-in-effect`: 204 raw, 175 reported (14% silenced); `react/exhaustive-effect-dependencies`: 247 and 167; `react/no-deriving-state-in-effects`: 10 and 8. Rerun it with `--topic react-effects` (and without `--files jsx`, to include `.ts` hooks) before quoting.
- **Caveats:** regex counts, not a parser: a comment-like string in code would be counted, and suppressions on `useMemo`/`useCallback` count the same as on effects. Seven repos chosen for other posts; libraries and one large app. Whether a repo runs the rule at all decides whether it suppresses it. The remaining-hit counts depend on the repos' own configs only through their suppression comments.
- **For the post:** a dated measurement in the direction of the rule's reputation, in two codebases out of seven, not a rate. Supabase's 83 suppressions with 4 reasons is the concrete case. The harness's `rule-census.cjs` (raw against reported) is the right tool for the real number.

### 4.20 Is `exhaustive-deps` the most-suppressed rule? No published measurement. Negative finding

- No paper, and no large public dataset found, ranks ESLint rules by inline suppressions in open source. Hu et al. (4.13) is the only study with ESLint data, from student projects with no React; Tómasdóttir et al. (4.17) predates hooks. WebSearch turned up only individual GitHub issues and a blog post that returned 403. React's own claim, "most users just disable the lint rule" (2.9), has no number.
- **For the post:** the reputation is folklore backed only by our own counts: public code search (4.18) and the corpus (4.19). If the post says it, cite those with their caveats, or measure it with the harness (`rule-census.cjs` reports raw against reported counts).

---

## 5. Agents and LLMs

Items 5.1–5.4 are studies and benchmarks of LLM-written React code; 5.5–5.6 are agents and lint suppressions; 5.7–5.15 are what vendors, React libraries and React itself tell agents about effects; 5.16 is Ultracite's own agent prompt; 5.17–5.18 are my checks of what the presets do to suppressions and what an agent is told; 5.19 is the hypothesis list for the experiment. Every entry ends with the scratch files that hold its quoted text. Files are in `scratchpad/effects-lit/B/` unless noted. Agent prompts and skills are instructions to models and were read as data. Live pages are as of 23 Oct 2026.

### 5.1 Cui, "WebApp1K" and "Insights from Benchmarking Frontier Language Models on Web App Code Generation" (arXiv 2024). VERIFIED (arXiv full texts)

- **Citations:** Yi Cui (ONEKQ Lab), "WebApp1K: A Practical Code-Generation Benchmark for Web App Development," arXiv:2408.00019 v1, 30 Jul 2024, https://arxiv.org/abs/2408.00019 ; and "Insights from Benchmarking Frontier Language Models on Web App Code Generation," arXiv:2409.05177 v1, 8 Sep 2024, https://arxiv.org/abs/2409.05177. Single-author preprints, not peer-reviewed. Files: `text/arxiv-2408.00019.raw.txt`, `text/arxiv-2409.05177.raw.txt`.
- **Method:** "The WebApp1K benchmark consists of 1000 problems", each a React `App.js` the model writes to pass two unit tests that mock the API with fetch-mock and assert how often it was called (`expect(fetchMock.calls("/api/comments").length).toBe(1)`), across 20 app types. The second paper analyses the logs of "160,000 solutions produced (10 runs by each of the 16 models for 1000 problems)".
- **What it says:**
  - Build failures are rare: 172 of 160,000 solutions have syntax errors, "the build failure rate is 0.1%".
  - "There are seven types of errors". Type C, "API Call Mismatch", is when "Mock APIs are called less or more" than the test expects.
  - The authors' targeted prompt for type C: "Trigger mocked API EXACTLY ONCE." and "Avoid no trigger and duplicate trigger which might be caused" "by useEffect." Prompts for types B, C and D could not "reduce errors by more than 5%".
- **Numbers (read from the pie chart in Fig. 6, by label position):** A (deprecated `useHistory`) 32.8%, B (text mismatch) 28.3%, C (API called too often or not at all) 16.3%, D (uninstalled module) 11.8%; E, F and G 3.7%, 3.7% and 3.4%. The denominator is error occurrences in the failure logs, not solutions.
- **Caveat:** the paper never attributes type C to effects; the `useEffect` link is the authors' hypothesis, written into a prompt. 2024 models (GPT-4o, Claude 3.5 Sonnet, Llama 3.1 and others).
- **For the post:** the one benchmark I found whose error taxonomy has a category an effect bug would land in: an API called "less or more" than expected. One in six errors, with the cause guessed, not measured. A weak data point; don't cite it as evidence that LLMs write effects that refetch.
- **Quoted text:** `text/arxiv-2408.00019.raw.txt`, `text/arxiv-2409.05177.raw.txt` (PDFs in `pdf/`).

### 5.2 The front-end benchmarks don't report hook or effect errors (2025–2026). VERIFIED (arXiv full texts searched)

- **Web-Bench** (Kai Xu, YiWei Mao, XinYi Guan, ZiLong Feng, ByteDance; arXiv:2505.07473 v1, 12 May 2025; Vendor): "50 projects, each consisting of 20 tasks with sequential dependencies"; "SOTA (Claude 3.7 Sonnet) achieves only 25.1% Pass@1". Its React project's fifth task is literally "useEffect" (A.7), but results are reported per project (React pass@2, "Best of Five": Claude-3.7 65, Claude-3.7-T 60, DeepSeek-R1 40, GPT-4o 35), not per hook. `text/arxiv-2505.07473.txt`.
- **DesignBench** (Xiao, Wang, Lam, Wan, Liu, Huo, Lyu, CUHK; arXiv:2506.06251 v3, 15 Mar 2026): 900 samples across React, Vue, Angular and vanilla HTML/CSS. Its React error analysis is about compilation: "the top three errors are" `Unexpected Token`, `Expression Expected` and `Use Client Missing`. `text/arxiv-2506.06251.txt`.
- **FrontendBench** (ByteDance, arXiv:2506.13832 v2) and **ArtifactsBench** (Tencent, arXiv:2507.04952 v2): no occurrence of `useEffect`, `useState` or "hook" in either full text (`grep`, 23 Oct 2026).
- **For the post:** front-end code benchmarks score whether the page builds, looks right or passes interaction tests. None classifies failures by effect misuse, so there is no benchmark number for how often LLMs misuse effects. Say so.
- **Quoted text:** `text/arxiv-2505.07473.raw.txt`, `text/arxiv-2506.06251.raw.txt`, `text/arxiv-2506.13832.txt`, `text/arxiv-2507.04952.txt`.

### 5.3 Vercel's Next.js agent evals: "Avoid fetch in useEffect" and "Avoid redundant useState" (2025–2026). VERIFIED (eval source at `9486750f`, results at `8002355e`); my aggregation; Vendor (Vercel)

- **Citation:** vercel/next-evals-oss (MIT, created 21 Oct 2025), results at `8002355e2181cc34c07aec8a3d293939a637dc3e`; the eval definitions live in vercel/next.js `evals/evals/` at `9486750ff26ed20da13b15da229da5f1746bdfa0` (the SHA pinned in `eval-suite-ref.txt`): `agent-021-avoid-fetch-in-effect/` and `agent-024-avoid-redundant-usestate/`. Board: https://nextjs.org/evals. Files: `src/next-evals/`.
- **What the evals say about agents (comments in the eval files):** agent-021 is "Tricky because agents default to the familiar client-side pattern" (useEffect/fetch/useState); agent-024 is "Tricky because agents overuse useState for values that can be computed" inline, "adding unnecessary state and useEffect synchronization".
- **Method:** an agent gets a small Next.js app and a prompt, then withheld Vitest assertions read its files. They are regexes: agent-021 fails if `UserProfile.tsx` contains `useEffect` or `useState` or `'use client'`; agent-024 fails if `UserStats.tsx` contains `useEffect` or a `useState` near "count", "active" or "percentage". The prompts end "Follow the existing patterns in this codebase", and the fixtures show the pattern: agent-021's stub says "Create an async server component using the existing server component pattern"; agent-024's page has "// Good example: derived value calculated directly". The board is "pass@4" "with early exit".
- **My aggregation (23 Oct 2026; `scripts/next-agg.py`, output in `text/next-evals-first-attempt.txt`):** for each of the 72 model configurations with results (37 models or harnesses, with and without AGENTS.md; runs from 18 Feb to 13 Oct 2026), the latest summary:
  - agent-021 (fetch in effect): 64 of 72 passed on the first attempt, 72 of 72 within four.
  - agent-024 (derived state): 66 of 72 on the first attempt, 71 of 72 within four (Kimi K2.5 without AGENTS.md failed all four).
  - With AGENTS.md: 31 of 36 first-attempt passes on each eval; without: 33 of 36 and 35 of 36.
- **Caveats:** a vendor's eval of its own framework's guidance; the assertions are substring checks, so an effect that is correct and necessary fails, and a server component with any other bug passes; the hints in the fixtures make these tests of following a local example. Per-run transcripts exist in the repo but I didn't read them.
- **For the post:** the one public, repeated measurement of agents and effects. When the codebase shows the effect-free pattern, current agents almost always follow it. That's evidence that agents can avoid unnecessary effects when the context says how, not that they do so unprompted.
- **Quoted text:** `src/next-evals/agent-021-avoid-fetch-in-effect/`, `src/next-evals/agent-024-avoid-redundant-usestate/`, `src/next-evals/README.md`, `src/next-evals/summaries/`, `text/next-evals-first-attempt.txt`.

### 5.4 Studies of LLMs or agents and `exhaustive-deps`: none found. Negative finding (searches, 23 Oct 2026); one ANECDOTAL test

- **Searched:** arXiv (API, `abs:`/`ti:` queries for React hooks, `useEffect`, `useState`, stale closure, infinite re-render, React code generation, ESLint and LLM), OpenAlex (no `mailto`), web search. Semantic Scholar returned 429. The only peer-reviewed or preprint work on hooks found is about semantics and visualisation (React-tRace, PACMPL 2025, https://doi.org/10.1145/3763067, arXiv:2507.05234; HookLens, arXiv:2602.17891), not LLMs; both belong in section 4 if anywhere.
- **The reputation, stated by a practitioner:** ElevenDEV, "Do LLMs Actually Fix Tricky React Hooks, or Do They Just Cheat?" (DEV Community, 26 Sep 2026), https://dev.to/muslimgcoding/do-llms-actually-fix-tricky-react-hooks-or-do-they-just-cheat-377o: "you ask an AI assistant to fix an ESLint react-hooks/exhaustive-deps warning," and "it just slaps // eslint-disable-next-line on top". Their own Kaggle test (5 hook traps × 4 Google and DeepSeek models, graded by the author) scored 18 of 20, and reports no model adding a disable comment; DeepSeek-R1's failure was verbosity. ANECDOTAL; `text/devto-llms-hooks.txt`.
- **The nearest measurement of agents and effects:** HookLens (4.4) asked Claude Code, Codex CLI and Gemini CLI to find an effect anti-pattern across files; only Codex with GPT-5 beat the VS Code baseline. Detection, not fixing.
- **For the post:** no study measures whether agents silence `exhaustive-deps`; 5.5 is our own count, from agent PRs in the wild.
- **Quoted text:** `text/devto-llms-hooks.txt`; searches in `arxiv/`, `oa/`.

### 5.5 Agent pull requests that add `exhaustive-deps` suppressions (AIDev v5). My check (23–24 Oct 2026), re-run before quoting

- **Data:** AIDev v5 on Hugging Face (`hao-li/AIDev`, revision `b8dc67df`, cutoff 31 Mar 2026), the AIDev-pop tables (repositories with more than 100 stars), read through the public datasets-server `/filter` endpoint with no login:
  - `pull_request`: 361,296 agent PRs (Claude Code 172,597, Copilot 98,384, Codex 62,731, Cursor 12,908, Devin 11,219, Jules 3,457).
  - `pr_commit_details`: 12,116,310 file-level patch rows; "the `patch` data does not include large patches".
  - Query: `"patch" LIKE '%exhaustive-deps%'`, 4,770 rows (4,767 unique commit, file and PR triples) in 2,445 PRs.
- **Method (as in `accessibility.md` 5.49, but sampled rather than hand-checked in full):**
  - A suppression is an added (`+`) line containing `eslint-disable`, `oxlint-disable` or `biome-ignore` and `exhaustive-deps`: 2,837 lines in 2,356 file patches.
  - Carried over, dropped: the same text removed in the same commit (moved code), or a renamed file: 391.
  - Who wrote the rest (2,446): merge commits, 1,111; agent bot accounts (`Copilot`, `cursoragent`, `devin-ai-integration[bot]`), 199; Claude Code or Cursor signatures in the commit message (`Co-Authored-By: Claude`, `Generated with Claude Code`, `Co-authored-by: Cursor`), 710; commits by the PR author's own account in PRs the dataset labels Codex (Codex commits as the user), 75; unattributed, 351 (262 of them in Claude Code PRs, from commits without its signature).
  - Agent labels, state and URL for all 1,756 PRs that add or remove such a line, from `pull_request`.
- **Result (attributed to an agent, before validation):** 984 lines in 593 commits, 566 PRs and 297 repositories; 347 of the 566 PRs were merged.

| Agent | Lines | PRs (merged) | Repos | Share of the agent's AIDev-pop PRs |
| --- | --- | --- | --- | --- |
| Claude Code | 714 | 423 (279) | 215 | 0.25% |
| Copilot | 102 | 56 (24) | 41 | 0.06% |
| Cursor | 80 | 42 (20) | 30 | 0.33% |
| Codex | 75 | 37 (23) | 29 | 0.06% |
| Devin | 13 | 9 (2) | 5 | 0.08% |
| Jules | 0 | 0 | 0 | 0% |

- The shares divide by all of the agent's PRs in any language, so they understate the rate in React code.
- Form: 802 `disable-next-line`, 155 `disable-line`, 23 block comments; 28 are `oxlint-disable`. 127 give an ESLint `--` reason.
- 418 lines are in files the commit created, 566 in modified files. 403 PRs add one line, 24 add five or more; the most in one repository is 65 (Autonomy-Logic/openplc-editor).
- **Validation (seeded sample, one line per PR, read-only `gh api …/pulls/{n}/files`):** of 52 lines from 52 PRs, 41 are added in the PR's final diff with no matching removal anywhere in it; 10 aren't in the final diff (6 files, 4 lines: added in one commit and dropped later, or merge noise); 1 PR wasn't readable. By agent: Claude Code 16 of 20, Codex 9 of 12, Copilot 8 of 8, Cursor 7 of 8, Devin 1 of 4. So about four in five attributed PRs leave a new suppression in the code they propose.
- **The lint-fix PRs.** 16 attributed PRs have "lint", "ESLint" or "warning" in the title. Of the 10 I read in full (one now 404s), 8 add suppressions in the final diff (52 lines, none removed) and 6 of those were merged (46 lines):
  - skypilot-org/skypilot #8655 (Claude Code, merged 22 Jan 2026), "[Dashboard] Fix React hook dependency warnings and enforce zero warnings". The description: "Add eslint-disable comments for intentional patterns (mount-only effects, stable setState)" (four files), "Fix missing dependency in `[cluster].js`" (one), and `--max-warnings 0`.
  - latitude-dev/latitude-llm #1390 (Cursor, merged 16 Jun 2025), "Run linter and fix warnings": 20 suppressions in a PR that touches 81 files.
  - MetaMask/metamask-extension #40883 (Copilot, merged 17 Mar 2026), "fix(zero-warnings): tackle easy lint warnings #4": 5. pdfme/pdfme #821 (Devin, closed unmerged), "Fix ESLint warnings related to React hooks in @pdfme/ui package": 3.
  - FalkorDB/falkordb-browser #1336 (Copilot, merged) was the exception: no suppression left in its final diff.
- **The loop, suppressed.** promptfoo/promptfoo #6908 (Claude Code, merged 2 Jan 2026), "fix(app): fix Tailwind CSS variable syntax and React infinite render loop", replaces `[plugins]` with `[pluginsKey]`, where `pluginsKey = useMemo(() => JSON.stringify(plugins), [plugins])`, and disables the rule. Its comment: "Stringify plugins for deep comparison to prevent infinite loops" / "when plugins array reference changes". A justified one, for contrast: mui/base-ui #4142 (Codex, merged 24 Feb 2026) suppresses it on a layout effect meant to "Run after every commit so DOM association changes (e.g. label mount/unmount)".
- **Against `jsx-a11y`:** 5.49 found 3 agent-written `jsx-a11y` suppressions in 71,677 AIDev v4 PRs, about 4 per 100,000. Here it's 566 PRs in 361,296 (157 per 100,000), or about 124 after the sample's four-in-five, roughly 30 times as often. The versions, time spans and checking differ (every case by hand there, a sample here), so treat it as an order of magnitude.
- **Caveats:**
  - Substring search, and large patches are missing from the dataset, so code moved in a big refactor can look new; the PR-diff sample catches some of that.
  - Attribution by commit signature undercounts Claude Code (262 unsigned lines in its PRs are excluded) and counts commits a human edited if they kept the co-author line. Codex attribution assumes the PR author's own commits in a Codex PR are the agent's.
  - The PRs are opened by people using agents, so a suppression may have been asked for; I read only the sampled diffs and the lint-fix PRs' descriptions.
  - Three duplicate rows mean the server's scan order wasn't fully stable, so up to three rows may be missing. Cutoff 31 Mar 2026.
  - `biome-ignore … useExhaustiveDependencies` (a separate query, 1,158 rows) was still being pulled when this was written (900 rows fetched); it isn't counted here.
- **For the post:** agents do suppress `exhaustive-deps`, in hundreds of real PRs and most of them merged, far more often than they suppress accessibility rules. The lint-fix PRs are the `ultracite fix --claude` scenario without Ultracite's prompt: handed the warnings, agents add the dependency in some places and suppress the rest as "intentional patterns".
- **Quoted text:** `aidev/README.md` (dataset card at `b8dc67df`), `aidev/agent-counts.json`, `aidev/classify2-full.json`, `aidev/summary-eslint-oxlint.json`, `aidev/classified-lines.jsonl`, `aidev/pr-diff-validation-eslint.json`, `aidev/lintfix-prs.json`, `aidev/examples/` (`prs.txt`, `skypilot-8655-pr.txt`, `promptfoo_promptfoo-6908-excerpt.txt`, `mui_base-ui-4142-excerpt.txt`). Scripts: `scripts/aidev_pull.py`, `aidev_prs.py`, `aidev_agent_counts.py`, `aidev_classify2.py`, `aidev_summary.py`, `validate_pr_diff.py`, `validate_lintfix_prs.py`, `aidev_driver.sh`.
- **In the repo:** the scripts are in `research/corpus/scripts/aidev/` (with a README on running them), and the aggregate outputs (`agent-counts.json`, `classify2-full.json`, `summary-eslint-oxlint.json`, `pr-diff-validation-eslint.json`, `lintfix-prs.json`) in `research/corpus/results/react-effects/aidev/`. The pulled rows aren't committed.

### 5.6 What the other bibliographies already verified about agents and suppressions. Cross-references

- **`floating-promises.md` 4.4** (ANECDOTAL): aemdemos/patients-stryker #273, agents "resolve lint failures by adding eslint-disable comments instead of fixing the underlying code"; Birgitta Böckeler (martinfowler.com, 27 May 2026) starts her review from "the exceptions AI created (suppressed warnings, increased thresholds)". Böckeler's ESLint formatter tells the agent it may suppress `no-explicit-any` with a reason, which "keeps the suppressions manageable, visible and reviewable" (`text/fowler-sensors.txt`).
- **`accessibility.md` 5.49** (my check, AIDev v4): 3 confirmed agent-written `jsx-a11y` suppressions in 71,677 PRs; most `+eslint-disable` lines in agent PRs came from humans, merges or artifacts. **`todo-comments.md` 6.15**: no agent added an `eslint-disable` for a TODO rule.
- **`type-escape-hatches.md`** 6.5–6.8: agents adding `as any` and `@ts-expect-error` (an attributable maintainer report and a designed pipeline, no rate).
- **For the post:** for the rules measured before, agent-written suppressions were rarer than the reputation, and counting `+eslint-disable` lines without checking who wrote them overcounts. `exhaustive-deps` is the exception: 5.5 finds agent-written suppressions in hundreds of PRs, about 30 times the `jsx-a11y` rate.
- **Quoted text:** `floating-promises.md` 4.4, `accessibility.md` 5.49, `todo-comments.md` 6.15 in the repo; `text/fowler-sensors.txt`.

### 5.7 Vercel's `react-best-practices` agent skill (Jan 2026): effects as a performance problem. VERIFIED (skill source at `063bee94`, blog); Vendor (Vercel)

- **Citation:** vercel-labs/agent-skills, `skills/react-best-practices/` at `063bee94c3f4df8453406c830b0a7df0f2860278` (`SKILL.md`, `AGENTS.md`, `rules/*.md`); first commit `d4ce7611` "Add react-best-practices", 14 Jan 2026. Shu Ding and Andrew Qu, "Introducing: React Best Practices," Vercel blog, 14 Jan 2026, https://vercel.com/blog/introducing-react-best-practices. Files: `src/vercel-agent-skills/`, `text/vercel-blog-react-best-practices.txt`.
- **What the blog says:** "a structured repository optimized for AI agents and LLMs". "When your agent spots cascading useEffect calls or heavy client-side imports," it can reference these patterns.
- **What the skill says:** 70 rules in 8 categories; 18 of the 70 use `useEffect` or `useLayoutEffect` in their examples (my count of `AGENTS.md`). The effect rules sit under "Re-render Optimization (MEDIUM)" and "Advanced Patterns (LOW)":
  - `rerender-derived-state-no-effect` (Shu Ding, 23 Jan 2026): "If a value can be computed from current props/state, do not store it" in state; "Derive it during render to avoid extra renders and state drift."
  - `rerender-move-effect-to-event`: "Do not model the action as state + effect".
  - `rerender-dependencies`: "Specify primitive dependencies instead of objects to minimize effect re-runs."
  - `advanced-effect-event-deps` (2 Apr 2026): "Effect Event functions do not have a stable identity." Including one "makes the effect re-run every render and triggers the React Hooks lint rule."
  - `advanced-use-latest` (updated by Sebastian Silbermann, "to recommend useEffectEvent", 20 Jan 2026): "Access latest values in callbacks without adding them to dependency arrays."
  - `advanced-event-handler-refs`: `useEffectEvent` "creates a stable function reference that always calls the latest version".
- **Lint:** the skill names the lint rule once ("triggers the React Hooks lint rule") and never says to suppress or not suppress it.
- **For the post:** the agent guidance from the company behind Next.js frames unnecessary effects as a re-render cost, not a correctness one, and agrees with React's docs on derived state and events. It contradicts itself on `useEffectEvent` (stable in one rule, "do not have a stable identity" in another), and its "useEffectEvent for Stable Callback Refs" framing is close to what React's docs warn against (section 2).
- **Quoted text:** `src/vercel-agent-skills/` (`SKILL.md`, `AGENTS.md`, `rules_*.md`), `text/vercel-blog-react-best-practices.txt`, `text/gh-metadata.txt`.

### 5.8 My check: Vercel's "Correct" effect examples through Ultracite's presets (23 Oct 2026). VERIFIED (local run); re-run in the harness before quoting

- **Setup:** the 9 "Correct" code blocks with an effect in the compiled `AGENTS.md` (`lint-check/vercel-correct/`, React imports added where missing), plus four rule files' examples as written (`lint-check/fixtures/vercel-*.tsx`), through Ultracite's ESLint react preset (ESLint 10.12.0, eslint-plugin-react-hooks 7.1.1, eslint-plugin-react-doctor 0.9.16) and Oxlint 1.86.0 with the react preset, with and without react-doctor's rules from the js-plugins preset. Commands in `lint-check/run.sh`.
- **Results:**
  - **Section 8.1, "Do Not Put Effect Events in Dependency Arrays"** (the "Correct" version): `react-doctor/effect-needs-cleanup` in both linters: "`on` creates a subscription in useEffect without guaranteed cleanup." The effect returns `() => connection.disconnect()`. React's own version of the same component (`connection.on('connected', () => { onConnected(); })`, from "Separating Events from Effects") is not flagged; the only difference is passing the Effect Event directly instead of in an arrow function.
  - Sections 5.7 and 5.9: `rules-of-hooks` only because the snippets call `useEffect` at the top level (an artefact of linting fragments).
  - The other 6 blocks and the four rule files: no hooks or effect diagnostics.
- **For the post:** a vendor's correct example, adapted from React's, fails one of the effect rules Ultracite turns on, and the failure depends on syntax. An agent given that diagnostic under Ultracite's prompt can't suppress it and has nothing to fix; "Left for review" is the honest exit.
- **Quoted text:** `lint-check/vercel-correct/`, `lint-check/fixtures/`, `lint-check/eslint-vercel.json`, `lint-check/oxlint-jsplugins.json`, `src/react.dev/separating-events-from-effects.md`.

### 5.9 TanStack's agent skills: "Duplicating query rows into state" is wrong, and a hydration fix that Ultracite flags is "CORRECT" (2026). VERIFIED (package source at pinned SHAs); my check

- **Citation:** TanStack/router `6b9fe6d29552270836c511bc9b343d73541f4424`: `packages/start-client-core/skills/start-core/execution-model/SKILL.md` (added in `940151cb`, "feat: add @tanstack/intent AI agent skills for Router and Start (#6866)", 16 Mar 2026), `packages/react-router/skills/compositions/router-query/SKILL.md`, `packages/router-core/skills/router-core/navigation/SKILL.md`; TanStack/table `c14e0221b1e656c7bb35e7b3d4cdf188719a3599`: `packages/react-table/skills/getting-started/references/with-tanstack-query.md`. The skills ship in the npm packages: `files` includes `"skills"` in `@tanstack/start-client-core` 1.170.39 and `@tanstack/react-table` 9.3.1. Files: `src/tanstack/`.
- **What they say:**
  - TanStack Table, under "HIGH Duplicating query rows into state": Wrong is `useEffect(() => setRows(result.data?.rows ?? []), [result.data])`. "The second state layer can lag behind the query cache" "and creates an extra synchronization path."
  - TanStack Start, "4. HIGH: Hydration mismatches": the "CORRECT — consistent rendering" example is `useState<string>()` plus `useEffect(() => { setTime(new Date().toLocaleString()) }, [])`. The same code is in TanStack's docs (`docs/start/framework/react/guide/execution-model.md`).
  - TanStack Router's examples use effects for imperative calls with stable dependencies (`queryErrorResetBoundary.reset()` with `[queryErrorResetBoundary]`, `router.preloadRoute(...)` with `[router]`).
- **My check (23 Oct 2026, `lint-check/fixtures/tanstack-start-hydration.tsx`):** the Start example as written is an error in both of Ultracite's React presets: ESLint `react-hooks/set-state-in-effect` ("Calling setState synchronously within an effect can trigger cascading renders") and Oxlint `react(set-state-in-effect)`, whose note adds "React Compiler skipped optimizing this component or hook." The Router examples raise no hooks diagnostics.
- **React's own docs have the same conflict.** The `useEffect` reference's "Displaying different content on the server and the client" recommends `useEffect(() => { setDidMount(true); }, [])`, and its source marks that block `expectedErrors: {'react-compiler': [5]}` under "TODO(@poteto) - investigate potential false positives in react compiler validation" (react.dev `src/content/reference/react/useEffect.md` at `ae5e4807`). Lauren Tan's PR #7989 (merged 18 Sep 2025): "our effects validations are flagging patterns that our own docs examples use." `src/react.dev/useEffect.md`. (Section 2 should cite this too.)
- **For the post:** libraries now ship effect advice to agents inside their npm packages, and it doesn't always agree with the React Compiler rules. An agent that follows TanStack's "CORRECT" example and then runs `ultracite fix` gets an error it can only clear by rewriting the pattern the library told it to use.
- **Quoted text:** `src/tanstack/router/`, `src/tanstack/table/`, `lint-check/eslint-out.json`, `lint-check/oxlint-out.json`, `src/react.dev/useEffect.md`, `text/gh-metadata.txt` (PR #7989).

### 5.10 React Doctor tells agents not to suppress, and also when to (2026). VERIFIED (source at `84ad0c8d`, live prompts); Vendor (Million)

- **Citation:** millionco/react-doctor, "Your agent writes bad React. This catches it" (repo created 13 Feb 2026), at `84ad0c8d0df7a3ab7d26946367fae3bc39c100d0`: `packages/react-doctor/src/cli/ink/lib/build-issue-prompt.ts`, `packages/react-doctor/src/cli/utils/render-agent-guidance.ts` (added `138862e4`, 25 May 2026), `skills/react-doctor/SKILL.md`, `skills/improve-react/AUDIT.md`. Per-rule agent prompts fetched from `https://www.react.doctor/prompts/rules/<plugin>/<rule>.md` (23 Oct 2026; each gives its rule set as "oxlint-plugin-react-doctor 0.9.3 (prompt schema 2)"). Files: `src/react-doctor/`, `text/react-doctor-prompts/`.
- **What it says:**
  - The TUI hand-off prompt: "Fix the root cause; do not suppress, disable, or silence the rule."
  - The CLI's agent guidance: "Treat React Doctor diagnostics as starting hypotheses." "Do not suppress a finding without evidence from the file in question." "Start with high-confidence fixes that preserve behavior."
  - Per-rule prompts each carry a "Suppress when" clause and a copy prompt that says "Do not disable the rule or suppress matching code." Examples:
    - `no-derived-state-effect`: suppress when the setter's function "has hidden imperative side effects".
    - `no-fetch-in-effect`: suppress for "a one-shot fetch with proper AbortController cleanup in a small project" without a data library.
    - `set-state-in-effect` (React's rule, which React Doctor also runs): suppress for a `useLayoutEffect` that measures the DOM.
    - `no-effect-event-handler`: "do not change post-commit work into a pre-commit call merely to silence the rule."
    - `effect-needs-cleanup`: "do NOT delete the timer/listener to silence the rule," "do NOT add an empty 'return () => {}'", and "the fix is to suppress, not to wrap it" for callbacks the effect only defines.
  - The audit skill lists `exhaustive-deps` as "Missing effect dependencies; closures observe stale state." and `no-self-updating-effect` as "Effect updates its own dependency; feedback loops."
- **For the post:** the lint vendor closest to agents writes down both the ways agents game effect rules (delete the listener, add an empty cleanup, move work out of the effect) and the cases where suppressing is the right answer. Ultracite's prompt forbids the second; for those cases the honest outcome is "Left for review".
- **Quoted text:** `src/react-doctor/` (`build-issue-prompt.ts`, `render-agent-guidance.ts`, `skills_*`), `text/react-doctor-prompts/`, `text/gh-metadata.txt`.

### 5.11 Factory bans `useEffect` for its agents and adds an escape hatch the dependency rule can't see (2025–2026). VERIFIED (source); my check; Vendor (Factory)

- **Citation:** Factory-AI/factory-plugins at `aa8be50bc07e9f4ec48db9d57929ce8e2214504a`, `plugins/typescript/skills/no-use-effect/SKILL.md` (Alvin Sng, `6c4d24d5`, 18 Apr 2026); Factory-AI/eslint-plugin at `e713ca4f0376c4389a80a8dff23da368a487e8f5`, `rules/no-use-effect-in-hooks/README.md` and `README.md`; Alvin Sng, "Using Linters to Direct Agents," Factory, 5 Sep 2025, https://factory.ai/news/using-linters-to-direct-agents. Files: `src/factory/`, `text/factory-linters.txt`.
- **What it says:**
  - The skill: "Never call `useEffect` directly." Lint rule: `no-restricted-syntax` "(configured to ban `useEffect`)". It activates "when an agent adds useEffect 'just in case.'" Five replacements (derive, query library, event handler, `useMountEffect`, `key`), each with a "Smell test".
  - The escape hatch: `useMountEffect(effect)` is `useEffect(effect, [])` under `/* eslint-disable no-restricted-syntax */`. Its Rule 5 "GOOD" example calls `useMountEffect(() => { loadVideo(videoId); })` and remounts with `key={videoId}`.
  - The ESLint plugin's `no-use-effect-in-hooks` "Disallow `useEffect` and similar effect hooks inside custom hooks." The plugin is "showcasing how agent-native organizations use custom lint rules to drive AI coding agents" and "All code in this repository is fully AI-generated."
  - The blog: "Linters can encode your architecture, boundaries, and ergonomics directly" into the agent's loop.
- **My check (`lint-check/fixtures/factory-use-mount-effect.tsx`, Ultracite presets):** ESLint flags the helper itself: `react-hooks/exhaustive-deps` "React Hook useEffect received a function whose dependencies are unknown." "Pass an inline function instead." Oxlint 1.86.0 flags it as "React Hook useEffect has a missing dependency: 'effect'" with "Either include it or remove the dependency array." Neither flags the call site, where `videoId` is captured and not a dependency.
- **For the post:** one agent vendor's answer to unnecessary effects is to forbid the hook. Its escape hatch moves the dependency array out of the dependency rule's sight: one finding in the helper (which the helper's author must suppress or leave), and none where the bug would be. Oxlint's help text, followed literally, would add `effect` and run the "mount" effect after every render.
- **Quoted text:** `src/factory/`, `text/factory-linters.txt`, `lint-check/eslint-factory.json`, `lint-check/oxlint-factory.json`.

### 5.12 React's own material for AI tools: `llms.txt`, Markdown pages and DevTools for agents (2026). VERIFIED (react.dev source); Vendor (Meta)

- **Citation:** react.dev `/llms.txt` (reactjs/react.dev PR #8267, "Add llms.txt", 28 Jan 2026; sections added in #8270 the same day) and the `.md` version of every page; "React DevTools for agents" (`react-devtools-cdt-mcp`, PR #8694, Ruslan Lesiutin, 20 Oct 2026), https://react.dev/reference/dev-tools/react-devtools-cdt-mcp. Files: `text/react-dev-llms.txt`, `text/react-devtools-cdt-mcp.md`.
- **What it says:** `llms.txt` lists the five effect guides, `useEffect`, `useEffectEvent` and every `eslint-plugin-react-hooks` lint page, without commentary. The DevTools page gives "AI coding agents the same view of your app that React DevTools gives you" and is "experimental"; its tools include `react_get_commit_report` ("which components rendered in a commit"), but none reports effects.
- **Not found:** a React blog post, guide or doc written for AI tools about effects or the lint rules. The React Conf 2025 recap lists a "React and AI Panel" (video only; not watched).
- **For the post:** React's answer to agents so far is to make its existing docs machine-readable. It hasn't written agent-specific advice about effects; the docs agents read are the ones in section 2.
- **Quoted text:** `text/react-dev-llms.txt`, `text/react-devtools-cdt-mcp.md`, `src/react.dev/blog-2025-10-16-react-conf-2025-recap.md`, `text/gh-metadata.txt`.

### 5.13 Next.js tells agents to read its bundled docs, and says nothing about effects (2026). VERIFIED (bundled docs, `next@16.4.3`); Vendor (Vercel)

- **Citation:** "How Next.js supports AI coding agents," `dist/docs/01-app/02-guides/ai-agents.md` in `next@16.4.3` (unpkg, 23 Oct 2026); https://nextjs.org/docs/app/guides/ai-agents. `text/next-16.4.3-ai-agents.md`.
- **What it says:** `next dev` writes a managed block into `AGENTS.md` headed "This is NOT the Next.js you know", pointing agents at `node_modules/next/dist/docs/`. Vercel's research "found a 100% pass rate with bundled documentation", "compared with up to 79% for Skill-based approaches" (Vendor, not re-verified).
- **For the post:** context. The framework most React code runs in steers agents with version-matched docs and evals (5.3), not with rules about effects. (The repo's own turbo hook writes a similar block; see the project memory, not the post.)
- **Quoted text:** `text/next-16.4.3-ai-agents.md`.

### 5.14 General agent prompts say keep diffs minimal and don't suppress, and say nothing about effects. VERIFIED (cross-reference to `sort-keys.md` 5.9–5.13; my code search); Vendor

- **Reuse:** OpenAI Codex ("Changes should be minimal and focused on the task."), Anthropic ("Only make changes that are directly requested or clearly" necessary; formatters as PostToolUse hooks), Gemini CLI ("NEVER use hacks like disabling or suppressing warnings"), Copilot and Cursor (style to the linter), Aider and Cline. All verified in `sort-keys.md` 5.9–5.13 at pinned commits.
- **Effect-specific guidance: none found** in anthropics/skills at `dbd4588f` (`frontend-design`, `web-artifacts-builder`: no mention of effects, hooks or lint), openai/codex at `970111f6` (GitHub code search for `useEffect`: no hits) or openai/skills at `49f948fa` (hits only in Cloudflare references).
- **GitHub's community collection** (github/awesome-copilot `d85f762d`, `agents/expert-react-frontend-engineer.agent.md`, community-contributed): "Use proper dependency arrays in `useEffect`, `useMemo`, and `useCallback`" and "Leverage `useEffectEvent()` to extract non-reactive logic from effects". ANECDOTAL.
- **For the post:** an agent fixing `exhaustive-deps` brings general rules (small diff, no suppression) and no effect-specific ones unless the project or a library supplies them (5.7–5.11). The general rules push toward the smallest edit, which for a missing dependency is adding it.
- **Quoted text:** `sort-keys.md` 5.9–5.13 in the repo; `src/anthropic-skills/`, `src/awesome-copilot/agents_expert-react-frontend-engineer.agent.md`.

### 5.15 Community skills that restate "You Might Not Need an Effect". ANECDOTAL

- softaworks/agent-toolkit `skills/react-useeffect/SKILL.md` at `3027f20f` (added 21 Jan 2026; 2,588 stars): "React useEffect best practices from official docs." A table of "DON'T"/"DO" pairs that restates react.dev, with no lint or suppression guidance. Search results show the same skill copied into several registries (tessl.io, skills.sh), not checked.
- **For the post:** the "You Might Not Need an Effect" page has become an agent skill in its own right, mostly by copying. One line at most.
- **Quoted text:** `src/community-skills/softaworks-react-useeffect-SKILL.md`.

### 5.16 Ultracite's own agent prompt, rules file and skill (worktree at `2077efd7`, 22 Oct 2026). VERIFIED (repo files)

- **The fix prompt** (`packages/cli/src/agent-fix/prompt.ts`, used by `ultracite fix --claude/--codex`): "Make the minimal change that resolves each issue while preserving runtime behavior." "Fix the underlying problem" ("a diagnostic that still fires is a failed fix"). "Follow the rule's help text from the JSON file where provided." "Do not add suppression comments" "or change lint configuration." "If an issue needs a person's decision, leave it", ending with a `Left for review:` line.
- **The rules Ultracite writes into AGENTS.md** (`packages/cli/src/data/rules.ts`) and the skill's `references/code-standards.md`, identical: "Call hooks at the top level only, never conditionally" and "Specify all dependencies in hook dependency arrays correctly". The skill's `SKILL.md`: "keep hooks top-level with correct deps". Nothing about unnecessary effects, derived state or `useEffectEvent`.
- **Hooks:** `ultracite init --hooks claude` writes a PostToolUse hook on `"Write|Edit"` that runs the fix command after each edit (`packages/cli/src/data/agents.ts`).
- **For the post:** Ultracite's own guidance to agents is the dependency rule's view of effects (specify all dependencies correctly), and its fix prompt says to follow the help text, which for `exhaustive-deps` is "Either include it or remove the dependency array." Neither tells the agent that removing the effect is an option. Keep preset and prompt details out of the post; the point is what an agent is told.
- **Quoted text:** `src/prompt.ts`, `src/rules.ts`, `src/code-standards.md`, `src/ultracite-SKILL.md`, `src/ultracite-agents.ts`.

### 5.17 My check: what suppressing `exhaustive-deps` costs under Ultracite's presets (23 Oct 2026). VERIFIED (local run, plugin source); re-run in the harness before quoting

- **Setup:** `lint-check/fixtures/suppressed-exhaustive-deps.tsx`: one component with `// eslint-disable-next-line react-hooks/exhaustive-deps`, one with `// oxlint-disable-next-line react-hooks/exhaustive-deps`, one unsuppressed; same tools as 5.8.
- **Oxlint 1.86.0 (react preset):** both comments silence the dependency report, and both raise `react(rule-suppression)`: "React rule suppression prevents optimization", help "Remove the suppression and address the reported React rule violation". So under Ultracite's Oxlint preset a suppression doesn't clear the file. The unsuppressed component gets two errors for one missing dependency: `react-hooks(exhaustive-deps)` and `react(exhaustive-effect-dependencies)` ("Found missing effect dependencies").
- **ESLint 10.12.0 + react-hooks 7.1.1 (react preset):** the `eslint-disable` comment silences `exhaustive-deps` and nothing else fires; `react-hooks/rule-suppression` didn't report, even alone. `exhaustive-effect-dependencies` didn't fire either: the plugin's bundled compiler sets `eprh_enableExhaustiveEffectDependenciesCompilerLint = 'off'`.
- **The compiler's side:** in React Compiler 1.0.0, the stable release, a suppression of `react-hooks/exhaustive-deps` or `react-hooks/rules-of-hooks` (`DEFAULT_ESLINT_SUPPRESSIONS`) makes the compiler skip the function: "React Compiler has skipped optimizing this component" "because one or more React ESLint rules were disabled". The compiler bundled in eslint-plugin-react-hooks 7.1.1 ignores those suppressions when its hooks and memo-dependency validations are on, as they are by default, which is why ESLint's `rule-suppression` stays quiet (1.11).
- **For the post:** suppressing the dependency rule isn't free even where it's allowed: React Compiler stops optimising that component, and Oxlint reports the suppression itself. The ESLint difference is explained in 1.11 and 3.5.
- **Quoted text:** `lint-check/fixtures/suppressed-exhaustive-deps.tsx`, `lint-check/eslint-suppressed.json`, `lint-check/oxlint-suppressed.json`, `text/react-hooks-7.1.1-suppressions-excerpt.txt`.

### 5.18 My check: the messages an agent gets for a missing dependency. VERIFIED (local run)

- ESLint: "React Hook useEffect has a missing dependency: 'query'." "Either include it or remove the dependency array." Oxlint: "React Hook useEffect has a missing dependency: 'query'", help "Either include it or remove the dependency array." For a non-inline callback, ESLint says "Pass an inline function instead." (5.11).
- Oxlint `set-state-in-effect` help: "Derive the value during render, initialize state directly," "or update it from the event that caused the change." React Doctor's `no-derived-state-effect`: "For derived state, compute inline".
- **For the post:** the dependency rule's message offers two edits to the array and none to the effect; the newer rules' messages offer removing the effect. Under a prompt that says "Follow the rule's help text", the message is the strategy.
- **Quoted text:** `lint-check/eslint-suppressed.json`, `lint-check/oxlint-suppressed.json`, `lint-check/oxlint-out.json`, `text/react-doctor-prompts/react-doctor_no-derived-state-effect.md`.

### 5.19 Hypotheses for the agent experiment (not findings)

- With only `exhaustive-deps`'s message and Ultracite's prompt, agents add the dependency, because it is the smallest diff the help text names; for an object or function created during render, that makes the effect run every render (to test: the effect's run count before and after).
- With `set-state-in-effect` or React Doctor's derived-state rule in the same diagnostics file, agents delete the effect more often.
- Agents don't add suppressions under Ultracite's prompt (the AIDev count in 5.5 is the baseline without that prompt: 984 agent-attributed suppression lines in 566 PRs).
- When the right answer is to keep the effect and suppress (a mount-only effect, 5.10's `useLayoutEffect` measurement), agents either restructure it (`useMountEffect`-style wrappers, refs, `useEffectEvent` misuse) or leave it for review. The wrapper hides the dependency from the rule (5.11).

---

## 6. Ultracite's own history

6.1 is the timeline from `git log -S` (search strings `exhaustive-deps`, `useExhaustiveDependencies`, `react-hooks`, `set-state-in-effect`, `no-deriving-state-in-effects`, `exhaustive-effect-dependencies`, `react-doctor`, `react-compiler`, `useAsync`), `packages/cli/CHANGELOG.md` and the npm publish dates, plus read-only `gh` searches of haydenbleasel/ultracite issues and PRs (terms: "exhaustive", "useEffect", "react-hooks", "useExhaustiveDependencies", "dependencies array", "react-doctor", "set-state-in-effect", "react compiler", "effect", "hooks"; results in `main/src/ultracite-gh-search.txt`). 6.2–6.3 are the user requests, 6.4 what the presets set now, 6.5 what Ultracite tells agents.

### 6.1 Timeline: on from the first commit, and the rest by inheritance. VERIFIED (git history, changelog, npm registry)

| Date | Commit (release) | What happened |
| --- | --- | --- |
| 18 Mar 2022 | `e403fb15` "Create ESLint configuration" | `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` both `"error"`, with `additionalHooks: "(useAsync)"` and the comment "Add support for useAsync by react-use"; eslint-plugin-react-hooks ^4.3.0 |
| 8 Jun 2023 | `c52fef07` "Migrate to opt-in config (#115)" | the `availableKeys` pattern that turns on every non-deprecated rule of a plugin as `"error"`; used for `react-hooks` by May 2024 (`src/rules/reactHooks.mjs`, `27b6dce2`) |
| 14 Jul 2024 | `e597df22` "Remove useAsync from exhaustive deps" | `additionalHooks` dropped; no reason recorded |
| 18 Jul 2024 | `c92a9d2e` Biome switch (#140; 4.0.0, 19 Jul 2024) | ESLint config deleted; Biome 1.8.3 with `"all": true`, which includes `useExhaustiveDependencies` |
| 22 Jun 2025 | `871ee738` Ultracite v5 (#162; 5.0.0) | Biome 2: `"useExhaustiveDependencies": "error"` named in core, comment "Enforce all dependencies are correctly specified in a React hook." |
| 20 Oct 2025 | `86ee61e3` "Specific Ultracite configurations (#319)" | moved to the Biome React preset with `useHookAtTopLevel` |
| 28 Dec 2025 | `c4a205f8` V7 (#466; 7.0.0, 1 Jan 2026) | ESLint returns with eslint-plugin-react-hooks ^7.0.1 and every non-deprecated rule `"error"`, so the React Compiler rules (`set-state-in-effect`, `refs`, `purity` and the rest) come on at once. Oxlint arrives; its core preset sets `categories.correctness: "error"`, which (by reading, not run) covers `react/exhaustive-deps` once the React preset enables the `react` plugin |
| 3 May 2026 | `aecb814f` "Bump deps" | eslint-plugin-react-hooks ^7.1.1 |
| 10 May 2026 | `63f6a18f` (7.7.0) | the explicit `exhaustive-deps` override removed as "dead code"; "No behavior change." |
| 4 Jul 2026 | `f7025b12` (7.9.0, 5 Jul 2026) | Oxlint React preset lists every non-nursery rule by name, including `react/exhaustive-deps` and `react/rules-of-hooks` |
| 4 Jul 2026 | `bb286e28` "Upgrade to Oxlint 1.72.0" | Oxlint's nursery `react/react-compiler` turned on; the repo's own site suppressed it once ("react-compiler's use-prefix" / "heuristic misreads it") |
| 4 Jul 2026 | `223233f7` "Resolves #730" (7.9.0) | React Doctor added to the ESLint and Oxlint React, Next.js and TanStack presets, including "the 'You Might Not Need an Effect' family" |
| 7 Jul 2026 | `d186c53c` "Resolves #742" and `5da879b3` (7.9.3) | Oxlint's React Doctor rules moved to the opt-in `js-plugins` preset; the commit measured it "3.3x faster on a small React project, 10.2x on a 420-file one" without it |
| 1 Aug 2026 | `477cd6eb` (7.10.0, 2 Aug 2026) | eslint-plugin-react-doctor 0.9.3: the ESLint React preset "expands from 149 to 417 rules" |
| 19 Aug 2026 | `972b9468` "Update the oxlint presets for oxlint 1.79" (7.10.6, 20 Aug 2026; #775) | Oxlint split `react/react-compiler` into 22 rules; "Enable all 22 as error, matching the ESLint react preset" — this is when `react/set-state-in-effect`, `react/exhaustive-effect-dependencies` and `react/no-deriving-state-in-effects` came on |
| 11 Oct 2026 | 8.0.0 (`7965ec2`) | `ultracite fix --hook` hands what it can't fix back to the agent after each edit (exit code 2) |

- **No rationale was recorded for turning any of these on.** `exhaustive-deps` was `"error"` from the first commit with no comment beyond the `useAsync` option. Every later change is a side effect of a policy: the all-rules pattern (ESLint), `"all": true` (Biome 1), the explicit-list policy and the Oxlint benchmark ("matching the ESLint react preset"), and a user request (React Doctor, #730). The reason for `"error"` instead of React's recommended `"warn"` has to come from Hayden; the likely answer is the strictness policy (as for the TODO rules), but it isn't written down.
- **For the post:** the dependency rule is one of the oldest settings in Ultracite. The rules that ask whether an effect should exist arrived much later, all at once and by inheritance. Keep dates and preset names out of the post.

### 6.2 Issue #447: a user asked for "You Might Not Need an Effect" rules (Dec 2025). VERIFIED (issue)

- **Citation:** Joe Petrillo (`joepetrillo`), "Rules that catch “You might not need an Effect” mistakes," haydenbleasel/ultracite #447, 18 Dec 2025; closed 8 Jan 2026.
- **What it says:** the request names `eslint-plugin-react-you-might-not-need-an-effect` (3.x): "I don’t think there is any equivalent in biome." Alternative considered: "Moving back to ESLint." Hayden: "unfortunately Biome doesn't have something like this yet so we can't support it", and "I'll explore adding it our ESLint config once Oxlint decides to support something similar."
- **What happened:** the same user opened #730 ("Could the oxlint ultracite react config benefit from `oxlint-plugin-react-doctor`?", 25 Jun 2026). React Doctor arrived nine days later (6.1), and Oxlint's own `no-deriving-state-in-effects` and `set-state-in-effect` in August.
- **For the post:** the rules that ask whether an effect should exist came into Ultracite because a user asked, on both of the linters that could run them. Biome still has nothing comparable (section 3).

### 6.3 Issue #766: `rules-of-hooks` options on Oxlint (Aug 2026). VERIFIED (issue)

- **Citation:** `letstri`, "[Oxlint] react/rules-of-hooks cannot accept configuration," #766, 11 Aug 2026; closed 12 Aug 2026.
- **What it says:** the user tried `additionalHooks: '(useMountedEffect)'` on `react-hooks/rules-of-hooks` under Oxlint. Hayden: "this would be an issue in oxc." "Ultracite doesn't create the rules, only configures and enforces them."
- **For the post:** context only. Custom effect hooks such as `useMountedEffect` are common enough that users try to register them; each linter has its own option for that (`additionalHooks`, Biome's `hooks`), and Ultracite sets none.

### 6.4 What the presets set now (worktree at `2077efd7`, 23 Oct 2026). VERIFIED (config source, resolved configs, local runs)

- **ESLint React** (`config/eslint/react/eslint.config.mjs`, `rules/react-hooks.mjs`): every non-deprecated `react-hooks/*` rule `"error"` (28 rules resolved for a `.tsx` file), default options, so no `additionalHooks` and no dangerous autofix. Plus 417 `react-doctor/*` rules (`rules/react-doctor.mjs`), with `settings["react-doctor"].portedRuleMode: "curated"`. **The block has `files: ["**/*.jsx", "**/*.tsx"]`**: `--print-config` on a `.ts` file shows 0 `react-hooks/*` and 0 `react-doctor/*` rules, so a custom hook in `use-chat-room.ts` isn't checked (my check, 3.10).
- **Oxlint React** (`config/oxlint/react/index.mjs`): `react/exhaustive-deps`, `react/exhaustive-effect-dependencies`, `react/set-state-in-effect`, `react/no-deriving-state-in-effects`, `react/rules-of-hooks`, `react/hooks`, `react/refs`, `react/purity`, `react/immutability`, `react/rule-suppression`, `react/memo-dependencies` and the other compiler rules all `"error"`, no options. Oxlint applies them to `.ts` files too.
- **Oxlint js-plugins** (opt-in): 149 `react-doctor/*` rules, including `no-derived-state-effect`, `no-effect-event-handler`, `no-fetch-in-effect`, `effect-needs-cleanup`, `prefer-use-effect-event`, `no-effect-chain`, `no-effect-with-fresh-deps` and `no-mutable-in-deps`. Not included, though on in ESLint: `effect-listener-cleanup-mismatch`, `effect-listener-cleanup-reference-mismatch`, `effect-observer-needs-disconnect`, `effect-raf-loop-needs-cancel`, `effect-remove-listener-inline-handler`, `no-set-state-after-await-in-effect`, `no-stale-timer-ref`, `no-promise-then-side-effect-in-effect-without-catch`, `no-effect-wrapper-discards-callback-cleanup-return`, `debounce-no-cleanup`, `no-whole-object-dep-with-member-reads` and 257 others. `scripts/compare-rule-parity.ts` skips `react-doctor/` names.
- **Biome React** (`config/biome/react/biome.jsonc`): `useExhaustiveDependencies` `"error"` with default options (`reportUnnecessaryDependencies: true`, `reportMissingDependenciesArray: false`, no `hooks`), and `useHookAtTopLevel`. Biome has no rule like `set-state-in-effect`.
- **No framework preset changes any of these** (`grep` of `config/` for the rule names). The Next.js ESLint preset adds React Doctor's Next.js rules for `.js`/`.ts` files too.
- **What `ultracite fix` does with them** (`src/commands/fix.ts`): Oxlint runs `--fix`, and `--fix-dangerously` only with `--unsafe`; Biome runs `check --write`, plus `--unsafe` when passed; ESLint runs `--fix`, and `--unsafe` is ignored ("ESLint has no unsafe fixes"). So plain `ultracite fix` edits dependency arrays only through Oxlint's safe fixes (`useMemo(fn)` to `useMemo(fn, [])`, and removing `ref.current` and module-scope dependencies, 3.2), and `ultracite fix --unsafe` lets Oxlint and Biome add and remove dependencies (3.9, 3.10).
- **Repo use:** the docs site is Astro without React; the one suppression of a React rule I found in its history is gone with the React site (6.1, `bb286e28`).

### 6.5 What Ultracite tells agents about effects. VERIFIED (source); see also 5.16

- **The rules file** (`src/data/rules.ts`, written into AGENTS.md by `init`, and `skills/ultracite/references/code-standards.md`): under "React & JSX", "Specify all dependencies in hook dependency arrays correctly" next to "Call hooks at the top level only, never conditionally". Nothing about whether an effect is needed, derived state or event handlers.
- **The `--claude`/`--codex` prompt** (`src/agent-fix/prompt.ts`): "Make the minimal change that resolves each issue while preserving runtime behavior." "Do not add suppression comments" (`// oxlint-disable, // eslint-disable, // biome-ignore`) "or change lint configuration." "Follow the rule's help text from the JSON file where provided." "If an issue needs a person's decision, leave it" and list it under `Left for review`.
- **What the help text says** (`src/agent-fix/linters.ts`): Oxlint passes its `help` ("Either include it or remove the dependency array."); ESLint passes the rule's `docs.description` ("verifies the list of dependencies for Hooks like useEffect and similar") and keeps the raw message, with its suggestion, in the JSON; Biome passes the Description section of `biome explain`, which for this rule includes its stale-closure example and an example that "will create an infinite loop".
- **The post-edit hook** (`fix --hook`, 8.0.0) passes the linters' output only, without the prompt's rules.
- **For the post:** Ultracite's written guidance points agents at completing the array, and its prompt forbids the suppression React's docs also forbid. The prompt's "preserving runtime behavior" and the rule's help text pull in different directions whenever the missing dependency is unstable or the effect shouldn't exist (2.5, 3.10).

---

## Notes on Ultracite's presets (for Hayden, not for the post)

Checked in the worktree (`research/react-effects`, at `2077efd7`) on 23 Oct 2026. Per AGENTS.md, these are for you to decide on, not to write around.

**Rationale**

- **No reason was recorded for any of these rules** (6.1). `exhaustive-deps` has been `"error"` since the first commit (React recommends `"warn"`), and the compiler rules, React Doctor and Oxlint's 22 compiler rules arrived through the all-rules pattern, a user request (#730) and Oxlint parity. Is the reason the strictness policy? The post needs your answer, and a sentence on why `exhaustive-deps` is an error when React ships it as a warning.

**Coverage gaps**

- **The ESLint React preset only matches `**/*.jsx` and `**/*.tsx`** (`config/eslint/react/eslint.config.mjs`). Custom hooks in `.ts` files, and React code in `.js` files, get no `react-hooks/*` and no `react-doctor/*` rules: `--print-config` on a `.ts` file shows 0 of either. Oxlint and Biome lint the same hook (3.9, 3.10, h01). This is the biggest inconsistency found: most custom hooks live in `.ts` files.
- **React Doctor coverage differs by linter:** 417 rules in ESLint, 149 in Oxlint's js-plugins preset, and `compare-rule-parity.ts` skips `react-doctor/` names, so nothing catches the gap. The 268 ESLint-only rules include 11 effect rules (6.4); all of them exist in `oxlint-plugin-react-doctor` 0.9.16 (3.12). The changelog for 7.10.0 described the ESLint expansion; the Oxlint list wasn't updated.
- **Two retired React Doctor rules are on in both presets:** `hooks-no-nan-in-deps` and `no-cascading-set-state` (3.13).
- **Biome has nothing like `set-state-in-effect` or React Doctor**, so a Biome user gets only the dependency rule, the one whose fix is "add it" (6.2, #447).

**Rules that are on but do nothing, or do different things**

- **`react-hooks/exhaustive-effect-dependencies` and `memoized-effect-dependencies` are inert in eslint-plugin-react-hooks 7.1.1** (build flag `'off'`); Oxlint's `react/exhaustive-effect-dependencies` is live and reports every missing dependency a second time, plus extra dependencies that ESLint's `exhaustive-deps` deliberately allows (1.9, 3.4, 3.10).
- **`react-hooks/rule-suppression` never fires in ESLint 7.1.1** for an `exhaustive-deps` suppression; Oxlint's does, and the suppression also hides other compiler findings in that component (Oxlint #26277, open) (1.11, 3.5).
- **Extra effect dependencies:** an error under Oxlint (`exhaustive-effect-dependencies`) and Biome (`reportUnnecessaryDependencies` defaults to `true`), fine under ESLint. The reset-on-prop-change effect (c08) is flagged by two linters as extra, and Biome's unsafe fix removes the dependency, which changes behaviour (3.10). If you want parity with React's rule, Biome's `reportUnnecessaryDependencies: false` is the switch; Oxlint's compiler rule has no such option that I found.
- **Oxlint's plain `--fix` edits dependency arrays** (`useMemo(fn)` → `useMemo(fn, [])`, removes `ref.current` and module-scope dependencies), so `ultracite fix` changes hook code on Oxlint only, and the `useMemo` change freezes the value (3.2, 3.10). Worth either turning the rule's fixes off for the fix pass or reporting upstream: the docs label the rule's fixes "dangerous".
- **Oxlint's dangerous fix turns `user?.id` into `user.id`** (a crash when `user` is undefined) and replaces an every-render dependency with `[]` (the effect stops reacting) (3.9, 3.10). Both run under `ultracite fix --unsafe`. I found no upstream issue for either.
- **`ultracite fix --unsafe` rewrites dependency arrays under Oxlint and Biome:** 11 changed lines (Oxlint) and 16 (Biome) on the 24-case fixture (3.9), including `user.id` for `user?.id`, a removed extra dependency and `[id.toUpperCase]` (3.8). ESLint ignores `--unsafe`.
- **Oxlint has no `memoized-effect-dependencies`, `config`, `gating` or `fbt`**, which the ESLint preset turns on (the first is inert in ESLint anyway).

**Agent guidance**

- **The AGENTS.md template says "Specify all dependencies in hook dependency arrays correctly"** and nothing about unnecessary effects (6.5). React's docs lead with the opposite question. A line telling agents to check whether the effect is needed before adding a dependency (derived state, event handlers, resetting with `key`) would match react.dev, and the agent experiment could test whether it changes what agents do.
- **The fix prompt's "Follow the rule's help text"** points agents at "Either include it or remove the dependency array." (ESLint and Oxlint) for every missing dependency, including the cases where including it loops (3.9, 3.10). "preserving runtime behavior" and the help text conflict there; the agent's honest exit is `Left for review`.
- **The post-edit hook (`fix --hook`, 8.0.0) sends only the linters' output** (6.5), so an agent fixing an `exhaustive-deps` error mid-edit doesn't see "Do not add suppression comments" or "preserving runtime behavior".
- **Agents already suppress this rule in the wild** (5.5): 984 agent-attributed suppression lines in 566 AIDev PRs, 347 merged, including lint-fix PRs that label the suppressions "intentional patterns". That's the baseline the agent experiment should beat with Ultracite's prompt, and a reason to keep "Do not add suppression comments" in the hook output too.
- **`useEffectEvent` is a way to clear `exhaustive-deps` without a suppression comment**, which React's docs warn against (2.9). The agent experiment should count it as a possible evasion, like a wrapper hook (2.6).
- **React Doctor's licence** restricts using it "as training, fine-tuning, or evaluation data" without written permission (3.12). Check before the agent experiment reports React Doctor results as part of an evaluation.

**Small things**

- **The `react/react-compiler` suppression in the site code** (`bb286e28`) is gone with the React site; nothing in the repo suppresses a React rule now.
- **No preset sets `additionalHooks`** (or Biome's `hooks`), so TanStack Query-style hooks with dependency arrays aren't checked by any linter. The first config had `additionalHooks: "(useAsync)"`; it was removed in 2024 without a recorded reason.
- **React Compiler 1.0 still skips components with an `exhaustive-deps` suppression**; the plugin's bundled compiler doesn't. The ESLint rule set and the compiler a user actually ships disagree about what a suppression costs (1.11).
- **The worktree has an in-progress `react-effects` corpus harness** (`research/corpus/scripts/effects-*.cjs`, `calibration/react-effects/`, `examples/react-effects/`, `results/react-effects/`, all untracked), written by another session while this file was compiled. Nothing in this bibliography reads or depends on it; the fixtures in `scratchpad/effects-lit/check/` and `C/lint/` could move into it.

**For the harness, before the post**

- Move `scratchpad/effects-lit/check/` (the 19-case fixture, configs, `runtime/shim.cjs`, `demo.cjs`, `demo2.cjs`) and fork C's 24-case fixture (`scratchpad/effects-lit/C/lint/`) into `research/corpus/calibration/react-effects/`, and run them with each linter as `ultracite init` writes it.
- A rule census over the React repos (`rule-census.cjs --presets core,react` plus js-plugins) for `exhaustive-deps`, `set-state-in-effect`, `no-deriving-state-in-effects` and the React Doctor effect rules, raw and reported.
- The suppression count in 4.19, redone with the harness's parser instead of a regex, with reasons classified.
- The agent experiment: real `exhaustive-deps` hits where adding the dependency loops or resubscribes, handed to Claude Code and Codex with Ultracite's prompt, measuring add / restructure / remove / `useEffectEvent` / wrapper hook / Left for review, with a behaviour oracle like `runtime/demo.cjs`.

---

## Things that turned out wrong or different

**History and the rule (section 1)**

- **`exhaustive-deps` first shipped in 1.2.0, not 1.1.0.** Both were published on 21 Feb 2019, 96 minutes apart; the 1.1.0 tarball exports only `rules-of-hooks`. React 16.8 (6 Feb 2019) shipped with `rules-of-hooks` alone.
- **The rule was started by Caleb Meredith in Oct 2018**, and Dan Abramov rewrote the reporting "from scratch" in #14636; it isn't only Abramov's.
- **The feedback issue #14920 is smaller than its reputation:** 112 comments over two weeks (21 Feb–7 Mar 2019), locked as resolved, with one more comment in 2022. The 1,394-comment thread is the Hooks RFC (#68).
- **The autofix was removed in 2.4.0 (Feb 2020) and brought back as an opt-in in 4.0.0 (May 2020)**, not removed once. The opt-in exists because IDEs, including Meta's own, didn't support suggestions yet.
- **ESLint's rule deliberately allows extra dependencies in effects** (since Feb 2019, #14967), but not in `useMemo`/`useCallback`. Biome's rule and Oxlint's compiler rule report them.
- **The every-render check runs only when nothing else is wrong**, so the rule asks you to add an unstable dependency first and complains about it on the next run.
- **`useInsertionEffect` isn't checked by ESLint's rule** unless named in `additionalHooks`; Biome checks it by default.
- **Abramov's setInterval post originally said the lint rule was "not quite ready yet"**; the current text says "We’ve also built a" lint rule.
- **React Compiler 1.0 skips components that suppress `exhaustive-deps`; the plugin's newer bundled compiler doesn't** (#35184, Nov 2025, unreleased in a stable compiler).

**React's guidance (section 2)**

- **`useEvent` promised "an always-stable function identity"; `useEffectEvent` deliberately has none** ("Their identity intentionally changes on every render.").
- **React's claim that "most users just disable the lint rule"** (React 19.2 post) comes with no number.
- **The lint reference page suggests a ref guard to run an effect once**, which "Synchronizing with Effects" calls a non-fix in a different situation (2.1, 2.8).
- **react.dev's own fetch example trips `set-state-in-effect`**; the docs carry a TODO calling it a possible false positive (1.10).
- **Automatic effect dependencies** are a 2025 React Labs exploration, not a shipped feature (2.10).

**Other implementations (section 3)**

- **Oxlint's fix kind isn't what the label says.** The source declares `safe_fixes_and_dangerous_suggestions`; the docs say "A dangerous auto-fix and a suggestion are available for this rule."; `oxlint --rules` says `fixable_dangerous_fix_or_suggestion`. Plain `oxlint --fix` applies three kinds of change (3.2).
- **Oxlint's `react/exhaustive-deps` prints as `react-hooks(exhaustive-deps)`.**
- **Oxlint drops optional chaining from dependency names**: `user?.id` is reported and fixed as `user.id`, which throws during render when `user` is undefined (run in 3.10). ESLint and Biome keep `user?.id`. No upstream issue found (search of issues mentioning `exhaustive-deps` and optional chaining, 23 Oct 2026).
- **`react-hooks/exhaustive-effect-dependencies` and `memoized-effect-dependencies` are inert in eslint-plugin-react-hooks 7.1.1** at default options; Oxlint's `exhaustive-effect-dependencies` is live, and Oxlint has no `memoized-effect-dependencies` (3.3, 3.4).
- **Rome didn't promote the rule in 12.1.0**: it was on the "still a WIP" list. Biome's metadata dates it to Biome 1.0.0.
- **Biome's metadata calls the rule the `.same()` as ESLint's**; its behaviour on extra effect dependencies, setters, refs, `useMemo` without an array, `async` effects and cleanup refs differs (3.7).
- **The Oxlint React Compiler rules come from the React team's own Rust port** (facebook/react #36173), vendored and modified by Oxc, not a re-implementation by Oxc.
- **react-doctor's missing effect rules in Ultracite's Oxlint preset aren't missing from the plugin.** `oxlint-plugin-react-doctor` 0.9.16 exports the same 906 rules as the ESLint wrapper, including `effect-listener-cleanup-mismatch`, `no-set-state-after-await-in-effect` and `no-stale-timer-ref`. The gap is the preset's list (149 against 417).
- **react-doctor's README says "287 rules"**; the 0.9.16 packages export 906.
- **Names:** `stipsan` is Cody Olsen; `siketyan` is Naoki Ikeguchi; `crutchcorn` is Corbin Crutchley; `barklund` is Morten Barklund (GitHub profiles).

**Research (section 4)**

- **There's no `useeffect` Stack Overflow tag.** It's `use-effect`, and that tag is a synonym of `react-hooks`.
- **React-tRace's "1600 results" is a Stack Overflow site search,** and its model leaves out dependency arrays.
- **HookLens's 82% is useState 46.9% plus useEffect 35.1%.** The text extraction doesn't say which slice is which; the rendered figure does.
- **Tang et al.'s abstract says faults are dominated by "asynchronous error-handling issues";** their own table has Async/Event at 3.6% and Error Handling at 0.8%, and most labels are machine-assigned.
- **Liargkovas et al. give both 5% and 13% as their false-positive rate;** their table supports about 5%.
- **Hu et al. claim to be the first in-depth suppression study** but don't cite Liargkovas et al.; their ESLint data are student-reported unfixed warnings, not suppression comments.
- **LeakPair's patches target class or component destructors;** it doesn't say it handles `useEffect` cleanups.
- **The canonical Stack Overflow answer offers suppression as a co-equal fix,** and the asker was quoting #14920's "if you think you know what you're doing".

**Agents and LLMs (section 5)**

- **React has no agent-specific effect guidance.** Its AI-facing material is `llms.txt` (Jan 2026), Markdown pages and an experimental DevTools-for-agents page (Oct 2026); none says anything new about effects.
- **Vercel's skill contradicts itself and React on `useEffectEvent`.** One rule says Effect Events "do not have a stable identity" (React's wording); another says `useEffectEvent` "creates a stable function reference". Its "useEffectEvent for Stable Callback Refs" framing is close to the use React's reference warns against.
- **WebApp1K's `useEffect` link is a prompt, not a finding.** The paper never measures how many type C errors come from effects. It also calls `useHistory` "deprecated in React v6"; it's React Router v6.
- **Next.js evals' "agents default to the familiar client-side pattern" is the eval author's premise.** The 2026 results show the opposite, under hint-laden fixtures.
- **React Doctor's `effect-needs-cleanup` depends on syntax.** It flags Vercel's version of React's ChatRoom (Effect Event passed to `.on`) and not React's (wrapped in an arrow), though both clean up with `disconnect()`.
- **AIDev changed under me.** v5 (cutoff 31 Mar 2026, 7,685,281 PRs; AIDev-pop `pull_request` now 361,296 rows) was uploaded on 21 Oct 2026; `accessibility.md` 5.49 used v4 (71,677 PRs). The datasets-server re-indexed it for most of a day, so the 5.5 pull ran from 23 to 24 Oct 2026, and the `biome-ignore` half wasn't finished.

**Ultracite (section 6)**

- **`exhaustive-deps` has been an error since Ultracite's first commit (Mar 2022)**, unlike `sort-keys`, which was off for years.
- **The React Compiler rules came on in ESLint in V7 (Jan 2026) and in Oxlint in 7.10.6 (Aug 2026)**, both as a side effect of every-rule policies.
- **`ultracite fix` does change dependency arrays, but only under Oxlint** (3.2, 3.10).

---

## Unverified or dropped

**History and React's guidance (sections 1 and 2)**

- **When the React repository moved from `facebook/react` to `react/react`.** Seen in links and commits (#37778, Oct 2026), not dated precisely.
- **The React Conf 2018 keynote video.** Not watched; the conference facts come from the React blog's recap.
- **Whether React's "most users just disable the lint rule" rests on data.** No source given in the post (2.9).
- **The status of automatic effect dependencies after April 2025.** No later React post mentions it; the lint options for it exist (1.7, 2.10).
- **Whether `requireExplicitEffectDeps` or `experimental_autoDependenciesHooks` are documented on react.dev.** Not found on the `exhaustive-deps` lint page.
- **Abramov's later edits to "A Complete Guide to useEffect".** Only the current source was read; the 2019 text of that post wasn't compared.

**Ultracite (section 6)**

- **Why `exhaustive-deps` is `"error"` and why `additionalHooks: "(useAsync)"` was removed.** Not recorded; ask Hayden.
- **Whether Supabase Studio fails CI on `exhaustive-deps`.** Inferred from 137 remaining hits (4.19), not checked against its config.

**Other implementations (section 3)**

- **Browser behaviour of the fixed fixtures.** The loop, the frozen memo, the per-tick interval and the `user.id` crash were run in React 19.3 through `react-dom/client` on a minimal DOM stand-in (3.10), not in a browser or under Strict Mode. The harness should render them with a real DOM before the post quotes them.
- **Oxlint 1.88+ and Biome 2.6+ behaviour.** Only the repo's versions were run.
- **The 7.x change on suppressions isn't in eslint-plugin-react-hooks' CHANGELOG.** It is documented in the compiler PRs #35184 and #35201 (1.11), and matches the 7.1.1 build and the runs in 3.5 and 3.10.
- **Hono `hono/jsx` hooks:** no mention of dependency lint rules found (code search of honojs/website, 23 Oct 2026); dropped.
- **Preact's own docs on `exhaustive-deps`:** code search of preactjs/preact-www returned nothing; not checked further.
- **Solid 2.0's split effects** (separate tracking and effect phases) not checked; the docs read are the current 1.x docs.
- **`@eslint-react` (`eslint-plugin-react-x`) dependency rules**, which Biome lists as sources: not opened.
- **react-doctor's remote agent playbook** (`react.doctor/prompts/react-doctor-agent.md`) and per-rule prompts: not fetched; the skill tells agents to fetch them, and the docs pages carry the same prompts.
- **React Bench** (react-doctor's model benchmark, linked from its docs): seen in the docs banner, not opened; it belongs in section 5 if anywhere.
- **The Oxc docs "Coding agents" page:** seen in the navigation, not opened (section 5).

**Research (section 4)**

- **Closed or unreachable:** Nunes et al., IST 2025, and Ferreira, Borges, Valente, JSS 2024 (Elsevier, metadata only, smell lists unknown); Nunes's 2023 UFC thesis (timed out); the CSIT 2023 React Stack Overflow paper (metadata only).
- **Opened and dropped:** Gkinis and Zafeiris, "Refactoring React Component Hierarchies to Eliminate Prop Drilling" (arXiv:2610.01376; nothing on effects); two single-author Angular preprints (2512.00250, 2506.13815); the Clippy study (arXiv:2310.11738; not about suppressions).
- **Not read:** docs.bswen.com's post on `eslint-disable` (claims `exhaustive-deps` is commonly disabled; 403); Imtiaz, Murphy and Williams, ISSRE 2019 (Coverity usage); Johnson et al., ICSE 2013 (not re-checked; `security-rules.md` has the abstract only).
- **Re-render performance:** Million.js, MRAH and ReactRenderBench are not effect-specific or not measured; no effect-specific measurement of re-render cost was found.
- **Bun has a lint docs page for `react/exhaustive-deps`** (bun.com/docs/lint/rules/react/exhaustive-deps); not opened.

**Agents and LLMs (section 5)**

- **Not found:** any paper on LLM-generated React hooks or effects bugs (2023–2026); any study of agents adding `eslint-disable` for `exhaustive-deps`; any benchmark that reports effect misuse; agent-vendor docs (Anthropic, OpenAI, Google, GitHub, Cursor) with effect-specific guidance; an official v0 statement on effects (v0's system prompt isn't published; leaked copies weren't used).
- **Opened and dropped:** "React-ing to Grace Hopper 200" (arXiv:2604.17187; React Native app generation, no hooks content); hacktrace (2610.03055) and CATCH (2609.39533), reward hacking in coding RL, nothing on lint suppressions; "A Few Pages of Markdown" (2608.25241), AI config files and quality cost, not suppressions; DesignBench, FrontendBench, ArtifactsBench beyond the negative in 5.2.
- **Not watched:** the React Conf 2025 "React and AI Panel" (video). **Not read:** the per-run transcripts in next-evals-oss; the Kaggle notebook behind the DEV post; Alvin Sng's X post cited as the origin of Factory's skill (X not fetched); the Vercel blog post on AGENTS.md versus skills (its numbers are quoted from Next.js's docs only).
- **Not checked:** plate (udecode)'s `react-useeffect` skill (search results say it exists; not at the repo's HEAD); TanStack Query's and Form's own skills (their repos have only `AGENTS.md`, nothing about effects).
- **Semantic Scholar** returned 429 without a key, so its search wasn't used.
