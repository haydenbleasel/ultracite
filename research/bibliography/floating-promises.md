# Floating promises and async mistakes: literature and source notes

Compiled 2026-10-10 for the Ultracite research post on floating promises and async mistakes (`no-floating-promises`, `no-misused-promises`, `require-await`, `no-await-in-loop`, and their Oxlint and Biome counterparts).

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the official docs, the spec, the GitHub issue/PR/advisory, or the CVE record) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex or Semantic Scholar) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single practitioner report, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.

Every quote is copied exactly and is under 15 words.

---

## Most useful for the post

1. **The lineage of `no-floating-promises` is a nice story.** Josh Goldberg wrote TSLint's rule (PR #1632, opened 16 Oct 2016, merged 19 Jan 2017): "Promises must be stored or passed to a function." typescript-eslint ported it in PR #495 by princjef (merged 10 Jun 2019, shipped in v1.11.0, 23 Jun 2019) to help teams leave TSLint. Goldberg is now a typescript-eslint maintainer.
2. **typescript-eslint's own docs say `void` is not handling.** Under `ignoreVoid` (default `true`): "Voiding a Promise doesn't handle it or change the runtime behavior." And: "Such Promise rejections will still be unhandled." The docs compare it to an ESLint disable comment. This wording was added after issue #9947 (Sep 2024).
3. **Both rules are in `recommended-type-checked`** (verified in the config source): `no-floating-promises`, `no-misused-promises`, `require-await` and `await-thenable` are all `error`. They are not in plain `recommended`, because they need type information.
4. **Node.js 15 (20 Oct 2020) made unhandled rejections crash by default.** The flag `--unhandled-rejections` default changed from `warn` to `throw` (PR #33021 by Dan Fabulich). The warning had been a runtime deprecation (DEP0018) since Node 7. The TSC settled the default by vote (nodejs/TSC#916): "throw is decided as the default." Browsers, by contrast, only fire `unhandledrejection` and "may report" to the console.
5. **A missing `await` in an `if` is a real, critical vulnerability class, and `no-misused-promises` catches it.** In 2026 alone: Rocket.Chat CVE-2026-28514 (CVSS 4.0 score 9.3, login "with any password"), Unleash CVE-2026-77426, StudioCMS CVE-2026-32101 and Pingvin Share X CVE-2026-49467. Each advisory says the same thing: a Promise is always truthy, so the auth check never fails. The Rocket.Chat bug was found by GitHub Security Lab's AI agent (Taskflow Agent).
6. **The first promise bug catalog (Madsen, Lhoták, Tip, OOPSLA 2017)** studied 21 promise bugs drawn from 600 StackOverflow questions. "Missing return" (a promise is lost, or a reaction returns `undefined`) was the most common type, 8 of 21.
7. **PromiseKeeper (Alimadadi, Zhong, Madsen, Tip, OOPSLA 2018)** ran 12 Node.js apps' test suites and found 1,864 missing reject reactions (920 after filtering) and 632 implicit-return cases. 43% of promises were still pending at the end of execution. Five of the 12 test suites never exercised a single rejected promise.
8. **DrAsync (Turcotte, Shah, Aldrich, Tip, ICSE 2022)** found 2,591 static anti-pattern instances in 20 popular repos. "Async function with no await" was over half (1,401). `await` inside a loop over an array was 293. Refactoring a loop to `Promise.all` cut one hot fragment's time by 36.1%, but whole-suite refactors showed "no meaningful change" in run time.
9. **Missed parallelism is measurable (Arteca, Tip, Schäfer, ECOOP 2021).** Reordering awaits so I/O starts early and is awaited late gave average speedups of 0.99% to 53.6% across 20 apps, 8.1% on average.
10. **Async is the top cause of flaky JavaScript tests (Hashemi, Tahir, Rasheed, ICSME 2022).** In 452 commits from large JS projects: Concurrency 20.7% and Async Wait 19.6% of causes. Jest's docs warn that without `return`/`await` "your test will complete before the promise" settles.
11. **MDN uses the word "floating" too**, and says to run promises concurrently "unless one promise's execution depends on another's result." MDN's `forEach` page: it "does not wait for promises."
12. **When sequential is right:** ESLint's `no-await-in-loop` docs list rate limiting, retries and dependent iterations. GitHub's REST API docs tell clients to "make requests serially instead of concurrently" to avoid secondary rate limits.
13. **Platform vendors now tell people to turn on the rule.** Cloudflare's Workers best practices: floating promises "cause silent bugs: dropped results, swallowed errors, and unfinished work." It names `@typescript-eslint/no-floating-promises` and Oxlint's `typescript/no-floating-promises`.
14. **LLM bug taxonomies mostly don't have an async category.** Tambon et al. (EMSE 2025, Python) has 10 categories and none is async or concurrency. Sonar's Java study does have "Concurrency / Threading": 9.81% of Claude Sonnet 4's bugs versus 1.26–2.82% for the others. No benchmark for async/await correctness in JS, TS or Python asyncio turned up.
15. **Agents silencing lint is real but anecdotal.** No study measures agents adding `void`, `.catch(() => {})` or `eslint-disable` to pass `no-floating-promises`. There are GitHub issues and practitioner write-ups only (section 4.4).

---

## 1. History of async JavaScript

### 1.1 Callbacks and "callback hell". VERIFIED (page); authorship inferred

- **Source:** "Callback Hell: Taming JavaScript's Async Complexity," http://callbackhell.com/
- **Author:** The page doesn't name one. Its source repo is `github.com/maxogden/callback-hell` (now under the `max-mapper` account, MIT licensed), so it is Max Ogden's. No date is given on the page.
- **Definition it gives:** callback hell comes from writing JavaScript "in a way where execution happens visually from top to bottom." The nested pyramid is "affectionately known as callback hell."
- **The empirical backing is Gallaba et al. 2015 (section 2.5):** callbacks nest up to 8 levels deep, and 27% of studied systems used promises at all.

### 1.2 Promises/A and Promises/A+ (2012). VERIFIED

- **Spec site:** https://promisesaplus.com/. "An open standard for sound, interoperable JavaScript promises—by implementers, for implementers."
- **Versions (changelog):** 1.0 on **2012-12-06** ("Initial release"); 1.1 on 2013-09-29 (self-resolution now rejects with `TypeError`); 1.1.1 on 2014-05-05.
- **Credits page:** editors Brian Cavalier and Domenic Denicola. Contributors also include Yehuda Katz, Kris Kowal, Forbes Lindesay, Mark Miller and Luke Smith. Prior art credits the CommonJS "Promises/A proposal" by Kris Zyp.
- **Context essay:** Domenic Denicola, "You're Missing the Point of Promises," 14 Oct 2012, https://domenic.me/youre-missing-the-point-of-promises/. Thesis: promises "give us back functional composition and error bubbling in the async world." He criticises pre-1.8 jQuery promises.

### 1.3 ES2015 Promises. VERIFIED

- **Spec:** ECMA-262, 6th edition, June 2015, section 25.4 "Promise Objects," https://262.ecma-international.org/6.0/#sec-promise-objects
- **Definition:** "A Promise is an object that is used as a placeholder for the eventual results…" (truncated).
- **Unhandled-rejection hook came a year later.** `HostPromiseRejectionTracker` does not appear in the ES2015 text. It is in ES2016 (7th edition, June 2016). That is the hook hosts use to report unhandled rejections.

### 1.4 async/await (ES2017). VERIFIED

- **Origin:** Luke Hoban presented "Preview of asnyc/await" (sic) at the TC39 meeting on 10 April 2014 (https://github.com/tc39/notes/blob/main/meetings/2014-04/apr-10.md). The proposal repo's earliest visible commits (March 2014) are by Hoban.
- **Champion to stage 4:** Brian Terlson. The TC39 finished-proposals table lists "Async functions | Brian Terlson | expected publication 2017." The stage 4 resolution is in the **28 July 2016** notes, section "10.iv Async functions": "Stage 4 acceptance" (https://github.com/tc39/notes/blob/main/meetings/2016-07/jul-28.md). The finished-proposals table links the 26 July notes, where the item was first deferred ("Will revisit after discussing cancels more").
- **Stage 3:** "accepted into Stage 3 ("Candidate")… in September 2015," per the stage 3 draft dated 26 Jan 2016 (https://tc39.es/proposal-async-await/). That draft says "A similar proposal was made with Deferred Functions during ES6 discussions" and cites Task.js.
- **Published:** ECMA-262, 8th edition, **June 2017** (ES2017), per Ecma's editions page.
- **Lineage:** C# 5.0, "Released August 2012," put async/await into a mainstream language; Microsoft's C# history page calls it "groundbreaking" (https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history). The TC39 drafts themselves cite Promises, generators and Task.js, not C#.
- **Note:** The proposal README doesn't name Hoban or Terlson. Cite the TC39 notes and the finished-proposals table instead.

### 1.5 Unhandled rejections in browsers. VERIFIED

- **HTML Standard, section 8.1.4.7 "Unhandled promise rejections":** https://html.spec.whatwg.org/multipage/webappapis.html#unhandled-promise-rejections. The UA fires a cancelable `unhandledrejection` event (a `PromiseRejectionEvent`) at the global. If it isn't cancelled, "the user agent may report p.[[PromiseResult]] to a developer console." A late handler triggers `rejectionhandled`. So browsers log, they don't crash.
- **MDN:** The event fires at the global scope "when a JavaScript Promise that has no rejection handler is rejected." `preventDefault()` suppresses the console output. https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
- **Support (MDN browser-compat-data):** Chrome 49, Firefox 69, Safari 11, Edge 79.

### 1.6 Node.js: from warning to crash. VERIFIED

- **DEP0018 (https://nodejs.org/api/deprecations.html):** Runtime deprecation in **v7.0.0**; End-of-Life in **v15.0.0**. Current text: rejections that are not handled "terminate the Node.js process with a non-zero exit code."
- **The flag (https://nodejs.org/api/cli.html#--unhandled-rejectionsmode):** Added in v12.0.0 and v10.17.0 (PR #26599, by Ruben Bridgewater). Modes are `throw` (default), `strict`, `warn`, `warn-with-error-code` and `none`. The history table says v15.0.0 "Changed default mode to `throw`. Previously, a warning was emitted." The `throw` mode itself came in PR #33475 (2020).
- **The default change:** PR #33021, "process: Change default --unhandled-rejections=throw," by Dan Fabulich, opened 23 Apr 2020. Commit `3b10f7f933` "Fixes: #20392" and says it "resolves DEP0018." Reviewers included Matteo Collina, Benjamin Gruenbaum, Ruben Bridgewater, Mary Marchini and Michael Dawson.
- **Release post (Node.js 15.0.0, by Bethany Griggs, 20 Oct 2020):** "the default mode for `unhandledRejection` is changed to `throw` (from `warn`)." It gives no rationale.
- **The decision was a TSC vote:** nodejs/TSC#916, "Voting on the default behavior for Promise unhandled rejections," opened 31 Aug 2020 by Mary Marchini (mmarchini). On 14 Sep 2020: "for now, throw is decided as the default." The TSC had first run a public survey that closed 24 Aug 2020 (OpenJS Foundation post, 12 Aug 2020).
- **The rationale:** IBM Developer, "Node.js 15 release" by Michael Dawson and Bethany Griggs, 19 Oct 2020 (https://developer.ibm.com/blogs/nodejs-15-release-blog/): "We made this change to align with community expectations." It "brings behavior of unhandled rejections in line with that for unhandled exceptions."
- **The debate, from PR #33021:** Benjamin Gruenbaum argued "not terminating the process is unsafe and leads to possible cascading failures." Jordan Harband (ljharb) opposed it as "a very destructive setting."

### 1.7 `no-floating-promises`: TSLint, then typescript-eslint. VERIFIED

- **TSLint origin:** palantir/tslint PR #1632, "New rule: no-floating-promises," by Josh Goldberg (JoshuaKGoldberg). Opened 16 Oct 2016, merged 19 Jan 2017. Rationale: "floating (unhandled) Promises can cause unexpected behavior," for example a promise resolving after the next test has started.
- **typescript-eslint request:** issue #464, "Rule proposal: no-floating-promises," by w0rp, 24 Apr 2019. It notes eslint-plugin-promise lacks type information, and the port "will help organisations with replacing TSLint."
- **typescript-eslint PR:** #495, "feat(eslint-plugin): add new rule no-floating-promises," by princjef. Opened 6 May 2019, merged **10 Jun 2019** by Brad Zacher. Description: "Adds the equivalent of TSLint's `no-floating-promises` rule." Released in **v1.11.0** (GitHub release dated 23 Jun 2019, "add new rule no-floating-promises").
- **Current docs (https://typescript-eslint.io/rules/no-floating-promises/):**
  - Definition: a floating Promise is one "created without any code set up to handle any errors it might throw."
  - Harm: it can cause "improperly sequenced operations, ignored Promise rejections, and more."
  - Accepted handling: `.then()` with two arguments, `.catch()` with one, `await`, `return`, or `void`.
  - It also reports unhandled **arrays of promises**, and points to `Promise.all`, `allSettled`, `any` and `race`.
  - Options: `ignoreVoid` (default `true`), `ignoreIIFE` (default `false`), `checkThenables` (default `false`), `allowForKnownSafePromises` and `allowForKnownSafeCalls`.
  - "When Not To Use It" suggests using `void`s and/or ESLint disable comments for specific cases rather than turning the rule off.

### 1.8 `no-misused-promises`. VERIFIED

- **History:** proposed in issue #508 by princjef, 10 May 2019. The motivation was that `no-floating-promises` misses a promise "passed to code that will not handle it." Its examples were `[1, 2, 3].forEach(num => Promise.reject(num))`, `new Promise(async () => …)` and `if (somePromise)`. Implemented in PR #612, merged **16 Jul 2019**.
- **Docs (https://typescript-eslint.io/rules/no-misused-promises/):** "Disallow Promises in places not designed to handle them." These "can often arise due to a missing `await` keyword."
  - `checksConditionals` (default `true`) catches `if (somePromise)`, the exact CVE pattern in section 3.
  - `checksVoidReturn` (default `true`) catches `[1, 2, 3].forEach(async value => …)` and `addEventListener('click', async () => …)`. Passing `() => Promise<void>` where `() => void` is expected "can lead to a floating unhandled Promise."
  - `checksSpreads` (default `true`).

### 1.9 The `void` escape hatch. VERIFIED

- **typescript-eslint docs, `ignoreVoid`:** `void` is "a convenient way to explicitly mark that Promise as intentionally not awaited." Warning box: "Voiding a Promise doesn't handle it or change the runtime behavior." "The outcome is just ignored, like disabling the rule with an ESLint disable comment." "Such Promise rejections will still be unhandled."
- **Where that wording came from:** issue #9947, "Docs: [no-floating-promises] voiding Promise doesn't make it handled," by alexandercerutti, 6 Sep 2024. Maintainer Josh Cena agreed the list means "valid ways to silence this rule," not ways to handle errors. Closed by PR #9949 on 23 Sep 2024.
- **Implication for the post:** `void` is the documented way to say "fire and forget on purpose." It is not error handling. An intentional fire-and-forget still needs a `.catch()` if the rejection matters.
- **Biome agrees on the mechanics:** its `noFloatingPromises` lists `void` as accepted, and its unsafe fix adds `await`, not `void`.

### 1.10 The other rules in the post. VERIFIED (official docs and config sources)

| Rule | Introduced | In default recommended? | What the docs say |
| --- | --- | --- | --- |
| ESLint `require-await` | v3.11.0 | No (`@eslint/js` recommended) | Async functions without `await` "could be the unintentional result of refactoring." |
| typescript-eslint `require-await` | — | Yes, `recommended-type-checked` | Uses types so promise-returning functions can be `async` without `await`. Also checks async generators. |
| ESLint `no-await-in-loop` | v3.12.0 | No | Each operation "will not start until the previous one has completed." |
| ESLint `no-async-promise-executor` | v5.3.0 | **Yes** | "the error will be lost and won't cause the newly-constructed `Promise` to reject." |
| ESLint `no-promise-executor-return` | v7.3.0 | No | "The return value of the executor is ignored." Option `allowVoid` (default `false`). |
| eslint-plugin-promise `prefer-await-to-then` | — | No (not in the plugin's recommended) | "Prefer `await` to `then()`/`catch()`/`finally()` for reading Promise values." Option `strict`. |

- **ESLint recommended contents** were checked against `packages/js/src/configs/eslint-recommended.js` (64 rules). Only `no-async-promise-executor` of these is in it.
- **Oxlint:** `typescript/no-floating-promises` is category correctness. It needs type info and is "turned on by default when type-aware linting is enabled." `typescript/no-misused-promises` is pedantic and needs type info. `eslint/no-await-in-loop` is perf.
- **Biome:** `noFloatingPromises` is nursery (since v2.0.0) and `noMisusedPromises` is nursery (since v2.1.0). Both use Biome's type inference and flag `forEach(async …)` and promise conditionals. `noAwaitInLoops` is in the performance group (since v2.0.0) and is not recommended.

---

## 2. Empirical research on async and promise bugs

### 2.1 Madsen, Lhoták and Tip, "A Model for Reasoning About JavaScript Promises" (OOPSLA 2017). VERIFIED (full PDF)

- **Citation:** Magnus Madsen, Ondřej Lhoták, Frank Tip. _Proc. ACM Program. Lang._ 1(OOPSLA), Article 86, Oct 2017, 24 pp.
- **Links:** https://doi.org/10.1145/3133910, PDF https://plg.uwaterloo.ca/~olhotak/pubs/oopsla17b.pdf
- **What it does:** It defines λp, a core calculus for ES6 promises, and the **promise graph** as a debugging aid. It argues ES6 promises are "complex and error-prone in their own right."
- **Bug patterns defined:** dead promise; missing resolve or reject reaction; missing exceptional reject reaction (an exception is "silently ignored"); missing return; double resolve or reject; unnecessary promise (the "explicit-constructor anti-pattern"); broken promise chain.
- **The StackOverflow case study:** At the time there were 5,275 questions tagged both promise and javascript. The authors examined the newest 600 and kept 21 that met their criteria. By bug type: **Missing Return 8**, Dead Promise 3, Broken Promise Chain 3, Double Resolve 3, Other 4 (my count from Table 1). Root causes include "A promise is lost" and "A reaction unintentionally returns undefined."

### 2.2 Alimadadi, Zhong, Madsen and Tip, "Finding Broken Promises in Asynchronous JavaScript Programs" (OOPSLA 2018). VERIFIED (full PDF)

- **Citation:** Saba Alimadadi, Di Zhong, Magnus Madsen, Frank Tip. _Proc. ACM Program. Lang._ 2(OOPSLA), Article 162, Nov 2018, 26 pp. CC BY 4.0.
- **Links:** https://doi.org/10.1145/3276532, PDF https://people.ece.ubc.ca/~saba/dl/promisekeeper.pdf
- **Tool:** PromiseKeeper, a dynamic analysis that builds promise graphs from test-suite runs of **12 open-source Node.js applications** and flags anti-patterns.
- **Anti-pattern catalog:** missing reject reactions; attempts to settle a promise multiple times; unsettled promises; unreachable reactions; implicit returns in reactions (which can break a chain); unnecessary promises.
- **Counts (Table 2, before → after heuristics):**
  - Missing reject reactions: 1,864 → 920. The text says the 920 are "rooted in only 299 unique locations," but Table 3 gives 299 locations before filtering and 52 after. In Node Fetch, seven of these were actually rejected at run time.
  - Implicit returns / broken chains: 632 → 456, at 186 locations.
  - Unsettled promises: 4,194, at 53 locations. "43% of all promises remained pending at the end of execution."
  - Multiple settles: 51, at 8 locations (48 of them in Telegraf).
  - Unnecessary promises: 686, at 52 locations.
- **Test-suite finding:** "Many Test Suites Lack Tests for Rejected Promises." Five of the 12 suites hit no rejected promise at all.
- **Caveat:** The anti-patterns are "often, but not always correlated with bugs." The text says unreachable reactions drop to 422 after filtering, while Table 2's total says 185. Avoid quoting that number.

### 2.3 Wang et al., "A Comprehensive Study on Real World Concurrency Bugs in Node.js" (ASE 2017). VERIFIED (metadata + abstract; full text paywalled)

- **Citation:** Jie Wang, Wensheng Dou, Yu Gao, Chushu Gao, Feng Qin, Kang Yin, Jun Wei. _ASE 2017_, pp. 520–531.
- **Link:** https://doi.org/10.1109/ASE.2017.8115663
- **Findings (abstract):** The study is called NodeCB. It covers **57 real bug cases** from open-source Node.js applications, by pattern, root cause, impact, manifestation and fix strategy. "Two thirds of the bugs are caused by atomicity violation." Node.js "cannot easily express and guarantee the atomic intention," because it lacks locks and transactions.
- **Note:** This is about event races and atomicity, not floating promises specifically.

### 2.4 Davis, Thekumparampil and Lee, "Node.fz: Fuzzing the Server-Side Event-Driven Architecture" (EuroSys 2017). VERIFIED (full PDF)

- **Citation:** James Davis, Arun Thekumparampil, Dongyoon Lee. _EuroSys '17_, Belgrade.
- **Links:** https://doi.org/10.1145/3064176.3064188, PDF https://www3.cs.stonybrook.edu/~dongyoon/papers/EUROSYS-17-NodeFz.pdf
- **Bug study:** The authors searched closed GitHub bugs matching "race," got over 1,000 results, and hand-picked **12** well-documented server-side bugs. Impacts ranged "from incorrect responses (3/12) all the way to potential server crashes (4/12)."
- **Fixes:** Atomicity violations were usually fixed by moving the racy access into the same callback. Ordering violations were fixed with nested callbacks, the async module or promises (`Promise.all` "would also have served").
- **Tool:** Node.fz, a schedule fuzzer, reproduced known bugs more often than vanilla Node.js and found new bugs in two npm modules.
- **Note:** Both this paper and Wang et al. claim to be first. This one says "the first (to the best of our knowledge)."

### 2.5 Gallaba, Mesbah and Beschastnikh, "Don't Call Us, We'll Call You: Characterizing Callbacks in JavaScript" (ESEM 2015). VERIFIED (full PDF)

- **Citation:** Keheliya Gallaba, Ali Mesbah, Ivan Beschastnikh. _ESEM 2015_.
- **Links:** https://doi.org/10.1109/ESEM.2015.7321196, PDF https://people.ece.ubc.ca/amesbah/resources/papers/esem15-js-callbacks-study.pdf
- **Corpus:** 138 JavaScript programs, over 5M lines.
- **Findings:**
  - "every 10th function definition takes a callback argument."
  - Over 43% of callback-accepting call sites are anonymous.
  - Callbacks nest up to 8 levels, with a peak at 2.
  - Over half of callbacks are asynchronous: 72% client-side, 55% server-side.
  - Every 5th function definition follows the error-first idiom.
  - "27% of subject systems use Promises," mostly client-side frameworks.
- **Their call to action:** "Tools that automatically refactor callbacks into Promises would help" (shortened).

### 2.6 Refactoring callbacks to promises and sync to async. VERIFIED (metadata + abstract)

- **PromisesLand:** Keheliya Gallaba, Quinn Hanam, Ali Mesbah, Ivan Beschastnikh, "Refactoring Asynchrony in JavaScript," _ICSME 2017_, pp. 353–363. https://doi.org/10.1109/ICSME.2017.83
  - Refactors async callbacks, including error-first ones, into promises.
  - Precision 100% and recall 83% on average, on four apps checked by hand. Evaluated on 21 large applications; runs in under three seconds.
  - Motivation: try/catch "is not sufficient for proper error handling in asynchronous contexts."
- **Desynchronizer:** Satyajit Gokhale, Alexi Turcotte, Frank Tip, "Automatic Migration from Synchronous to Asynchronous JavaScript APIs," _PACMPL_ 5(OOPSLA), 2021. https://doi.org/10.1145/3485537
  - Across 12 apps with 316 synchronous API calls, 256 were candidates and 244 were transformed successfully. Only 12 changed behaviour.
  - Uses async/await "to minimize disruption to the source code."

### 2.7 Arteca, Tip and Schäfer, "Enabling Additional Parallelism in Asynchronous JavaScript Applications" (ECOOP 2021). VERIFIED (full PDF)

- **Citation:** Ellen Arteca, Frank Tip, Max Schäfer (GitHub). _ECOOP 2021_, LIPIcs 194, 7:1–7:28.
- **Links:** https://doi.org/10.4230/LIPIcs.ECOOP.2021.7. Artifact: https://doi.org/10.4230/DARTS.7.2.5
- **Claim:** "JavaScript programmers often schedule asynchronous I/O operations suboptimally."
- **Approach:** A static side-effect analysis moves requests "as early as possible" and awaits "as late as possible."
- **Results:** Across 20 apps doing file or network I/O, average speedups were 0.99% to 53.6% for tests running refactored code, 8.1% on average. The best was sapper at 53.6% average and 80.1% max.
- **Caveat:** The analysis is "potentially unsound," though they saw no behaviour-changing reorderings. It is about reordering awaits in straight-line code, not specifically `await` in loops.

### 2.8 Turcotte, Shah, Aldrich and Tip, "DrAsync: Identifying and Visualizing Anti-Patterns in Asynchronous JavaScript" (ICSE 2022). VERIFIED (full PDF)

- **Citation:** Alexi Turcotte, Michael D. Shah, Mark W. Aldrich, Frank Tip. _ICSE '22_, Pittsburgh.
- **Links:** https://doi.org/10.1145/3510003.3510097, PDF https://par.nsf.gov/servlets/purl/10340153
- **Eight anti-patterns, implemented as CodeQL queries:** asyncFunctionNoAwait, loopOverArrayWithAwait, asyncFunctionAwaitedReturn, explicitPromiseConstructor, customPromisification, promiseResolveThen, reactionReturnsPromise, executorOneArgUsed.
- **Static counts across 20 repos (paper's Summary row):**

| Anti-pattern | Static instances |
| --- | --- |
| asyncFunctionNoAwait (≈ `require-await`) | 1,401 |
| asyncFunctionAwaitedReturn | 458 |
| loopOverArrayWithAwait (≈ `no-await-in-loop`) | 293 |
| executorOneArgUsed | 159 |
| customPromisification | 106 |
| reactionReturnsPromise | 72 |
| promiseResolveThen | 63 |
| explicitPromiseConstructor | 39 |
| **Total** | **2,591** (the abstract says "2.6K") |

- **Repos include** strapi, fastify, stencil, vuepress, eleventy, CodeceptJS and vscode-js-debug. Anti-patterns were executed 24K times by the test suites.
- **Fixability:** They refactored 65 of 80 sampled instances.
- **Performance:**
  - Converting `vuepress/apply`'s loop to `Promise.all` cut that fragment's time by 36.1%.
  - Converting `appcenter-cli/cpDir` ran 16.4% faster (4.8s vs 5.8s).
  - Refactoring every executed instance in eleventy and vuepress produced "no meaningful change" in whole test-suite time.
- **On ESLint:** ESLint covered only 3 of their 8 patterns. Its `no-await-in-loop` "flags any loop with an await inside," while theirs targets loops over arrays.

### 2.9 Tang, Alimadadi and Sumner, "From Logic to Toolchains: An Empirical Study of Bugs in the TypeScript Ecosystem" (MSR 2026). VERIFIED (full arXiv PDF)

- **Citation:** TianYi Tang, Saba Alimadadi, Nick Sumner. _MSR '26_, Rio de Janeiro.
- **Links:** https://doi.org/10.1145/3793302.3793379, arXiv https://arxiv.org/abs/2601.21186
- **Data:** 633 bug reports from 16 TypeScript repos, sorted into 11 categories.
- **Async findings:** The "Asynchrony / Event" category is **3.6%** of bugs. Its common patterns include "missing or misplaced await calls leading to premature execution." "Unhandled promise rejections" are a subcategory of Error Handling, which is 0.8%. The largest categories are Tooling/Config 27.8%, API Misuse 14.5% and Type Errors 12.4%. The paper says async bugs "remain nontrivial despite language-level support for async/await."
- **Caveat:** The abstract lists "asynchronous error-handling issues" among the dominant categories, but the body numbers are small (3.6% and 0.8%). Cite the numbers, not the abstract's framing.

### 2.10 Hashemi, Tahir and Rasheed, "An Empirical Study of Flaky Tests in JavaScript" (ICSME 2022). VERIFIED (full arXiv PDF)

- **Links:** https://doi.org/10.1109/ICSME55016.2022.00011, arXiv https://arxiv.org/abs/2207.01047
- **Data:** 452 flaky-test-fixing commits from large GitHub JS projects, including Node.js, React, Vue and freeCodeCamp.
- **Root causes (Table III):** Concurrency 74 commits (20.7%), **Async Wait 70 (19.6%)**, OS 66 (18.4%) and Network 45 (12.6%). The paper says "Async Wait is in fact a subcategory of concurrency."
- **Example:** a freeCodeCamp Cypress test clicked inside `challenges.forEach(...)` without waiting for the result.

### 2.11 Analogue from C#: Okur, Hartveld, Dig and van Deursen, "A Study and Toolkit for Asynchronous Programming in C#" (ICSE 2014). VERIFIED (metadata + abstract)

- **Link:** https://doi.org/10.1145/2568225.2568309
- **Data:** 1,378 open-source Windows Phone apps (12M SLOC, 3,376 developers). Their Corrector tool "finds and corrects common misuses of async/await." Developers accepted 314 of the tools' patches.
- **Caveat:** I could not open the full PDF (403s), so I can't give its fire-and-forget (`async void`) percentages. Don't quote numbers beyond these.

### 2.12 Other tool papers worth a line. VERIFIED (metadata + abstract)

- **Endo and Møller, "Event Race Detection for Node.js Using Delay Injections," ECOOP 2025.** https://doi.org/10.4230/LIPIcs.ECOOP.2025.9. Node's async model "gives rise to event races, which cause many subtle bugs."
- **Sotiropoulos and Livshits, "Static Analysis for Asynchronous JavaScript Programs," arXiv 2019.** https://arxiv.org/abs/1901.03575. A callback-graph analysis; no bug-prevalence numbers.

### 2.13 What I did not find

- **No study measures how often `no-floating-promises` or `no-misused-promises` fire across real repos.** The closest proxies are PromiseKeeper's dynamic counts (2.2), DrAsync's static counts (2.8) and the TS bug study's 3.6% (2.9).
- **No large-scale study of async/await adoption in npm.** The 2015 figure that 27% of systems used promises (Gallaba) is the most recent one I found.
- **No peer-reviewed study of asyncio bugs in Python.** Python's runtime does emit "coroutine … was never awaited" warnings, but I found no study counting them.

---

## 3. Real-world incidents

All of these were checked on the primary advisory, CVE record or issue.

### 3.1 The "promise is always truthy" auth bypass. VERIFIED

Each of these is the `checksConditionals` case of `no-misused-promises`: `if (!check())` where `check` is async.

**Rocket.Chat, CVE-2026-28514 / GHSA-w6vw-mrgv-69vf / GHSL-2026-004**

- **Title:** "Users can login with any password via the EE ddp-streamer-service." Severity Critical; CVSS 4.0 base score 9.3 from the CNA (GitHub); CWE-287.
- **Affected:** before 7.8.6, 7.9.8, 7.10.7, 7.11.4, 7.12.4, 7.13.3 and 8.0.0.
- **Root cause:** "a missing `await` keyword when calling an asynchronous password validation function." The code in `loginViaUsername.ts` is `const valid = user.services?.password?.bcrypt && validatePassword(password, …)`.
- **Who found it:** "discovered with the GitHub Security Lab Taskflow Agent," then verified by Peter Stöckli and Man Yue Mo. Timeline: reported 9 Jan 2026, first fix 12 Jan 2026 (8.0.0), remaining fixes 5 Mar 2026.
- **Links:** https://github.com/RocketChat/Rocket.Chat/security/advisories/GHSA-w6vw-mrgv-69vf and https://securitylab.github.com/advisories/GHSL-2026-004_GHSL-2026-005_Rocket_Chat/. The agent framework is described at https://github.blog/security/how-to-scan-for-vulnerabilities-with-github-security-labs-open-source-ai-powered-framework/
- **Note:** The CVE record links PR #37143, which is an unrelated "remove uuid package" refactor. Cite the advisory, not that PR.

**Unleash, CVE-2026-77426 / GHSA-72h8-wp98-7hch**

- Title: "Missing await on permission check + cross-project IDOR in admin API." High, CVSS 4.0 7.1. `unleash-server` < 8.0.3.
- The advisory's own code comment reads `// BUG: missing await - hasPermission() returns Promise<boolean>`, and `if (!hasFeatureStrategyPermission)` is annotated "Always false - Promise is truthy!"
- https://github.com/advisories/GHSA-72h8-wp98-7hch

**StudioCMS S3 storage, CVE-2026-32101 / GHSA-mm78-fgq8-6pgr**

- "S3 Storage Manager Authorization Bypass via Missing `await` on Async Auth Check." High, CVSS 3.1 7.6. `@studiocms/s3-storage` <= 0.3.0, fixed in 0.3.1, published 11 Mar 2026.
- `!isAuthorized(type)` without `await` let the lowest "visitor" role list, upload, rename and delete bucket files.
- https://github.com/withstudiocms/studiocms/security/advisories/GHSA-mm78-fgq8-6pgr

**Pingvin Share X, CVE-2026-49467 / GHSA-59q6-jvp6-w282**

- "TOTP enrollment hijack: password gate skipped due to unawaited promise." High, CVSS 3.1 8.8. Versions 1.5.0–1.18.0, fixed in 1.18.1.
- `if (!this.authService.verifyPassword(user, password))` with no `await`.
- https://github.com/smp46/pingvin-share-x/security/advisories/GHSA-59q6-jvp6-w282

**Python analogue: Strawberry GraphQL, CVE-2026-107728 / GHSA-pfvf-fwfp-25mp**

- "Synchronous permission checks can treat an awaitable authorization result as truthy." CVSS 3.1 7.5. Versions 0.217.0 to before 0.326.1. Published 8 Oct 2026.
- Shows the same bug class outside JavaScript.

### 3.2 `forEach` with an async callback in VS Code. VERIFIED

- **Source:** microsoft/vscode issue #117205, "Some forEach + async are not awaited on properly," by Benjamin Pasero, 22 Feb 2021.
- **Quote:** "`forEach` with `async` will execute all promises inside in parallel but return immediately."
- **Details:** Two sites in `explorerView.ts` expanded tree items inside `forEach(async …)`. The owner replied "looks like an oversight on my end," and it was fixed on 24 Feb 2021 (commit c1409af).
- **Caveat:** It was labelled "debt." No user-facing failure was reported. Use it as an example of the pattern in a major codebase, not as an outage.

### 3.3 Turning the rule on in a real codebase: livekit/agents-js PR #2553. VERIFIED (PR page). Note: closed, not merged

- **Source:** "chore: enable @typescript-eslint/no-floating-promises," by JustinScitech, opened 21 Sep 2026.
- **Counts:** The rule reported **254 sites**: 142 in `agents`, 62 in `examples`, 50 in `plugins`.
- **How they were handled:** Most were marked `void` as intentional fire-and-forget. Three `judge()` LLM test assertions "were never awaited," so their failures were discarded. Review also surfaced real defects:
  - `JobRequest.accept()` resolved before its handler finished.
  - A malformed `languages.json` left a future unsettled, so every lookup hung.
- **Context:** The motivating issue is #2508, "Unhandled promise rejections from `.finally(...)` on task results."
- **Caveat:** The PR was closed without merging. It is still a good illustration that `void` ends up being the bulk fix.

### 3.4 Platform documentation that treats floating promises as a known hazard. VERIFIED

- **Cloudflare Workers best practices** (https://developers.cloudflare.com/workers/best-practices/workers-best-practices/, updated 24 Sep 2026; guide announced 15 Feb 2026):
  - Heading: "Always await or waitUntil your Promises."
  - Floating promises "cause silent bugs: dropped results, swallowed errors, and unfinished work." The runtime may end the isolate first.
  - It recommends the `no-floating-promises` rule "to catch these at development time," naming both typescript-eslint and Oxlint.
- **Jest docs** (https://jestjs.io/docs/asynchronous): "Be sure to return (or `await`) the promise." Otherwise "your test will complete before the promise returned from `fetchData` resolves or rejects."
- **AWS Lambda (Node.js handler docs):** Async work not finished during init "typically run[s] during the first function invoke. This can cause unexpected behavior or errors." It is weaker and only about init. Use it only if needed.

### 3.5 Is the rule in typescript-eslint's recommended config? VERIFIED (config source)

- In `packages/eslint-plugin/src/configs/flat/recommended-type-checked.ts`, the following are all `error`: `no-floating-promises`, `no-misused-promises`, `await-thenable`, `require-await` (with core off), `prefer-promise-reject-errors` and `only-throw-error`.
- `return-await` and `promise-function-async` are **not** in it.

### 3.6 What I did not find

- **No major public outage postmortem** (cloud provider or SaaS status page) that names a floating promise, missing `await` or `forEach(async)` as root cause.
- **jiangsc.me, "Lessons learnt from Node.js production incidents" (Mar 2023).** Search snippets describe a Node 15 unhandled-rejection crash fixed with `--unhandled-rejections=warn`, but the page returned 403. UNVERIFIED.

---

## 4. LLMs, agents and async code

### 4.1 Tambon et al., "Bugs in Large Language Models Generated Code: An Empirical Study" (EMSE 2025). VERIFIED (full arXiv v2 PDF; Crossref for the journal version)

- **Citation:** Florian Tambon, Arghavan Moradi Dakhel, Amin Nikanjam, Foutse Khomh, Michel C. Desmarais, Giuliano Antoniol. _Empirical Software Engineering_ 30(3), article 65, published online 13 Feb 2025.
- **Links:** https://doi.org/10.1007/s10664-025-10614-4, arXiv https://arxiv.org/abs/2403.08937
- **Method:** 333 bugs from CodeGen, PanGu-Coder and Codex on **CoderEval (Python only)**. The taxonomy was validated by a survey of 34 practitioners and researchers.
- **The 10 categories, with share of buggy samples (Table 2, all models):**

| Category                   | Share  |
| -------------------------- | ------ |
| Misinterpretation          | 20.77% |
| Missing Corner Case        | 15.27% |
| Silly Mistake              | 9.57%  |
| Hallucinated Object        | 9.57%  |
| Incomplete Generation      | 9.57%  |
| Wrong Attribute            | 8.55%  |
| Non-Prompted Consideration | 8.15%  |
| Prompt-biased code         | 6.52%  |
| Syntax Error               | 6.11%  |
| Wrong Input Type           | 5.91%  |

- **For this post:** There is **no async, `await` or concurrency category**. Don't cite Tambon for "LLMs forget await." The percentages are from arXiv v2 (Mar 2024); the EMSE version may differ slightly.

### 4.2 Sabra, Schmitt and Tyler (Sonar), "Assessing the Quality and Security of AI-Generated Code: A Quantitative Analysis" (arXiv 2025). VERIFIED (full PDF; vendor research, not peer-reviewed)

- **Link:** https://arxiv.org/abs/2508.14727 (4,442 Java tasks, analysed with SonarQube)
- **"Concurrency / Threading" as a share of each model's bugs (Table 10):** Claude Sonnet 4 **9.81%**, Claude 3.7 Sonnet 1.44%, GPT-4o 1.73%, Llama 3.2 90B 1.26%, OpenCoder-8B 2.82%.
- **Their hypothesis:** "Concurrency concepts (e.g., atomicity) are underrepresented in corpora."
- **Caveat:** This is Java threading, not JS promises, and Sonar sells the analyser.

### 4.3 CONCUR (Huang, Mahmud, Pasareanu, Yang; arXiv 2026). VERIFIED (arXiv HTML; preprint)

- **Link:** https://arxiv.org/abs/2603.03683
- **Benchmark:** 115 concurrency problems (43 base problems from a textbook plus 72 mutants) in **Java 8**, checked with Java PathFinder.
- **Results:** 23 LLMs. The best, gpt-5, scored 77.39% pass@1 and 91.30% pass@3. JPF-detected failures included 77 race conditions and 68 deadlocks.
- **Note:** The paper contradicts itself on which JPF error type is most frequent. It is the nearest thing to a concurrency-correctness benchmark, and it is not JavaScript.

### 4.4 Agents and the escape hatch. ANECDOTAL only

- **No study found** that measures agents adding `void`, `.catch(() => {})`, `eslint-disable` or config downgrades to pass `no-floating-promises`. Searches of arXiv, the AIDev/MSR '26 literature and GitHub returned only issues and blog posts.
- **Böckeler, martinfowler.com (May 2026)**, https://martinfowler.com/articles/sensors-for-coding-agents.html. Practitioner article; VERIFIED it says this:
  - "AI frequently decided to increase the cyclomatic complexity threshold."
  - Her review step starts with "the exceptions AI created (suppressed warnings, increased thresholds)."
  - It does not mention promises.
- **aemdemos/patients-stryker issue #273** (28 Sep 2026): agents "resolve lint failures by adding eslint-disable comments instead of fixing the underlying code." It was resolved with an AGENTS.md rule. One repo, no counts.
- **AxonBuild blog, "Linters on AI-Written Code" (Bilal Shahid, 3 Oct 2026):** lists the agent "calls a payment or email function without `await`." It says an agent "has three cheaper moves than fixing the code": suppress inline, downgrade the rule, or exclude the path. This is a vendor blog with a self-selected sample. It does not mention `void`.
- **The counterpoint, agents finding these bugs:** the Rocket.Chat missing-`await` CVE (3.1) was found by GitHub Security Lab's AI agent.
- **Framing advice:** The verified, quotable point is typescript-eslint's own statement that `void` equals a disable comment (1.9). The agent behaviour should be framed as plausible and anecdotal.

### 4.5 What I did not find

- No benchmark or study of LLM correctness on JS/TS promises, async/await, or Python asyncio.
- No LLM-generated-code taxonomy with an explicit "missing await" category. The only such category is in a study of human-written TypeScript bugs (2.9).

---

## 5. Performance: `await` in loops versus `Promise.all`

### 5.1 MDN, `async function`. VERIFIED

- **Link:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
- **Section "Async functions and execution order":** In `sequentialStart`, "the code finishes after 3 seconds." In `sequentialWait` the timers run concurrently, so it "finishes in 2 rather than 3 seconds."
- **Error-handling warning:** In `sequentialWait`, if `fast` rejects before `slow` fulfills, "an unhandled promise rejection error will be raised," even with a catch clause. `Promise.all` keeps the error "within the configured promise chain."
- **Inline example:** `const results = [await p1, await p2]; // Do not do this! Use Promise.all or Promise.allSettled instead.`

### 5.2 MDN, "Using promises." VERIFIED

- **Link:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
- **Composition:** "it's always better to run promises concurrently," unless "one promise's execution depends on another's result."
- **Floating:** If a handler started a promise and didn't return it, "the promise is said to be "floating"." Floating promises "could be worse if you have race conditions."
- **`Promise.all` caveat:** after one rejects, "The other operations continue to run," so state can be unexpected.

### 5.3 MDN, `Array.prototype.forEach`. VERIFIED

- "`forEach()` expects a synchronous function — it does not wait for promises."
- The example sums ratings with an async callback: "Naively expected output: 14 / Actual output: 0."

### 5.4 Jake Archibald, "Async functions: making promises friendly" (web.dev, 2016). VERIFIED

- **Link:** https://web.dev/articles/async-functions (last updated 2016-10-20)
- **Quote:** "ensure you don't miss the opportunity to do things in parallel."
- **Example:** Two sequential 500 ms waits take 1000 ms; started together, 500 ms.
- **Ordered output:** Fetch everything in parallel with `map`, then await each in order to log in sequence. That keeps output order without serialising the network.

### 5.5 Jake Archibald, "The gotcha of unhandled promise rejections" (11 Jan 2023). VERIFIED

- **Link:** https://jakearchibald.com/2023/unhandled-rejections/
- **The catch:** Starting promises early and awaiting them one by one, the "parallel but ordered" pattern, can trigger **unhandled rejections**. This happens if a later promise rejects before the loop reaches it, or the loop exits early.
- **Fixes:** a no-op `catch` per promise, `Promise.allSettled`, or a helper. `Promise.all` also avoids it but waits for all results.
- **Why it matters:** This is the trap in the naive fix for `no-await-in-loop`, and a reason to prefer `Promise.all` or `allSettled`.

### 5.6 ESLint `no-await-in-loop` docs: when sequential is right. VERIFIED

- **Link:** https://eslint.org/docs/latest/rules/no-await-in-loop
- **Problem:** "each successive operation will not start until the previous one has completed."
- **When Not To Use It:** Often "the iterations of a loop are not actually independent," and then "awaiting in the loop is correct." Its listed cases:
  - Rate limiting: loops used "to prevent your code from sending an excessive amount of requests in parallel."
  - Retries.
  - Iterations whose output feeds the next.
  - Inherently serial work.

### 5.7 GitHub REST API best practices: an authoritative "be sequential" example. VERIFIED

- **Link:** https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
- **Quote:** "make requests serially instead of concurrently."
- **Writes:** For mutating requests, "wait at least one second between each request."

### 5.8 V8 blog, "Faster async functions and promises" (12 Nov 2018). VERIFIED. It is not about sequential versus parallel

- **Authors:** Maya Armyanova and Benedikt Meurer. https://v8.dev/blog/fast-async
- **What it covers:**
  - `await` went "from a minimum of three microticks to just one microtick."
  - "async/await outperforms hand-written promise code now."
  - On the parallel benchmark, "We've managed to improve Promise.all performance by a factor of 8×."
  - Shipped by default in V8 7.2 / Chrome 72.
- **Use it only for** "await got cheap, so the cost is the waiting, not the keyword." It does not compare `await` in a loop with `Promise.all`.

### 5.9 Measured speedups from the research

- Arteca et al. (2.7): 8.1% on average, up to 53.6%, from starting I/O earlier.
- DrAsync (2.8): 36.1% and 16.4% on two hot fragments, but no meaningful change on whole test suites.
- **The honest framing:** The gains are large when the loop body is real I/O with latency, and negligible otherwise.

---

## Things that turned out wrong or different

- **"Alimadadi, Zhong, Mesbah, Tip":** The fourth author list is wrong. It is **Alimadadi, Zhong, Madsen, Tip**, OOPSLA 2018 (PACMPL 2, Article 162). Ali Mesbah is a co-author on the 2015 and 2017 callback papers, not this one.
- **Arteca et al.:** The third author is **Max Schäfer** (GitHub). ECOOP 2021 is correct. The paper is about reordering awaits so I/O starts early and is awaited late, not about `await` in loops as such.
- **async/await champion:** The repo README doesn't name anyone. **Luke Hoban** introduced it at TC39 (Apr 2014) and **Brian Terlson** championed it to stage 4 (resolution in the 28 Jul 2016 notes). It was published in ES2017 (June 2017).
- **Node 15 rationale:** The official release post gives none. The rationale is in the IBM Developer post and the PR discussion. The decision came from a TSC vote (nodejs/TSC#916), not just the PR. The warning dates from Node 7 (DEP0018), and the flag was added in v12.0.0 / v10.17.0.
- **typescript-eslint `no-floating-promises` is a port**, not an original rule. It is TSLint's rule (Josh Goldberg, 2016–17), ported by princjef in 2019 (merged 10 Jun 2019, released in v1.11.0 on 23 Jun 2019).
- **`void` was once documented as "handling."** Until Sep 2024 the docs listed `void` among the ways a promise is handled. Issue #9947 led to today's explicit warning that it doesn't handle anything.
- **Tambon et al. has no async category.** It is Python-only (CoderEval), with 10 categories. It was arXiv 2024 and EMSE 2025 (vol. 30, art. 65).
- **The V8 blog doesn't discuss sequential versus parallel awaiting.** It is about `await` overhead and `Promise.all` internals.
- **Rocket.Chat CVSS:** A secondary source says 9.8; the CNA's CVSS 4.0 score is **9.3**. Also, the CVE record's linked PR #37143 is unrelated, so cite the GHSA.
- **The TS bug study's abstract overstates async.** It calls asynchronous error handling dominant, but the body gives Async/Event 3.6% and Error Handling 0.8%.
- **PromiseKeeper's text and tables disagree** on unreachable reactions after filtering (422 vs 185), and on how many code locations the filtered missing reject reactions come from (299 vs 52).
- **DrAsync speedups:** 36.1% is vuepress/apply and 16.4% is appcenter-cli/cpDir. They are easy to swap when reading the two-column PDF.
- **Biome's `noAwaitInLoops` docs say sequential awaits "may lead to unhandled errors."** That is imprecise. MDN and Archibald show the unhandled-rejection risk comes from starting promises early and awaiting them one at a time, not from plain sequential awaiting.
- **"First" claims:** Node.fz (EuroSys 2017, 12 bugs) and NodeCB (ASE 2017, 57 bugs) both present themselves as the pioneering Node.js concurrency-bug study.
- **The livekit PR was closed, not merged.** Its counts are still real, but don't describe the rule as "adopted" there.
- **ESLint recommended:** Of the core rules in the post, only `no-async-promise-executor` is in `@eslint/js` recommended. `require-await`, `no-await-in-loop` and `no-promise-executor-return` are not.

## Unverified or dropped

- **jiangsc.me Node.js postmortem:** the page returned 403, so I have only search snippets. UNVERIFIED.
- **Okur et al. 2014 misuse percentages:** the PDFs returned 403 or HTML. Only abstract-level facts are given.
- **The Node.js "Promise reject use case survey" Medium post:** 403. I used the OpenJS Foundation copy instead.
- **Dropped:** A DailyCVE page about a music-metadata "uncatchable crash" from a missing `await`, which has an odd CVE ID and wasn't checked against a primary advisory. Also dropped: DEV/Medium claims such as "60% of AI samples have empty catch blocks," which give no method.
- **Dropped:** "Unreliable in Practice?" (ISSRE 2026) and "A Survey of Bugs in AI-Generated Code" (arXiv 2025). Neither has an async or concurrency category in its abstract.
- **Not found:** a quantified study of agents adding `void`, `.catch(() => {})` or `eslint-disable` to satisfy promise rules; a JS/TS/asyncio async-correctness benchmark for LLMs; a prevalence study of floating promises across npm or GitHub.
