# Length limits as lint rules: literature and source notes

Compiled 2026-10-25 for the Ultracite research post on length limits. The rules: ESLint's `max-lines`, `max-lines-per-function`, `max-statements`, `max-params` (and `@typescript-eslint/max-params`), `max-depth`, `max-len` (now `@stylistic/max-len`), `max-nested-callbacks`, `max-classes-per-file` and `max-statements-per-line`; Oxlint's ports; Biome's `noExcessiveLinesPerFunction`, `useMaxParams`, `noExcessiveNestedCallbacks`, `noExcessiveLinesPerFile` and `noExcessiveClassesPerFile`; SonarJS's `max-lines`, `max-lines-per-function`, `max-switch-cases`, `max-union-size`, `nested-control-flow` and `expression-complexity`; `import/max-dependencies`, `react/jsx-max-depth` and `vue/max-props`. Ultracite turns the size limits off and keeps some structural ones on (section 6). The question: is there evidence that a hard limit on size catches problems, or does it mostly measure the formatter and invite splitting for its own sake, and what happens when agents are held to one? Cyclomatic and cognitive complexity, Halstead, McCabe, the comprehension studies, working memory and agents gaming metrics are in `cognitive-complexity.md`; this file cross-references them rather than repeating them.

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the official docs, the tool's source code or published package, the release notes, or the GitHub issue, PR or commit) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex, Semantic Scholar or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single user report, project doc, blog post, maintainer's account or tool author's benchmark, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research or claims by a company that sells or owns a product in this space: Sonar, Google, Microsoft/GitHub, Anthropic, OpenAI, Anysphere (Cursor), Aider, JetBrains, Atlassian, Chroma, Astral, Lockheed Martin, the Software Improvement Group (SIG), VoidZero/Oxc.

Every quote is copied exactly and is under 15 words. Where a longer sentence matters, it is given as consecutive quoted segments. Markdown emphasis inside a quote (`**`, `_`) is kept as in the source; double quotes inside a quote are shown as single quotes.

**How sources were fetched.** Pages and PDFs were read with WebSearch, WebFetch and unauthenticated `curl` (`--max-filesize 10000000`); PDFs were converted with `pdftotext`. Tool behaviour was read from source at pinned tags: ESLint `v10.13.0` (`4637f982`), Oxlint `oxlint_v1.89.0` (`07ed78f4`), Biome `@biomejs/biome@2.6.3` (`c5c3383d`), eslint-plugin-sonarjs 4.2.2 (installed) and SonarJS `729dc4fc`, JSHint `2.13.6`, JSLint at `6610addf` (2011) and `dfee16b5` (2026), ESLint Stylistic `v5.10.0`, and the other tools' tags named in each entry. Metadata came from Crossref and OpenAlex (no `mailto`), Semantic Scholar (no key), the arXiv API, NASA NTRS, the npm registry and the Wayback Machine. Four research agents worked in parallel on section 1's books and section 3 (`C/`), section 4's size and defect studies (`A/`), section 4's smells, comprehension, parameters, line length and metric targets (`D/`), and section 5 (`B/`); every quote in this file was then checked by script against their saved texts, the repo files and mine (`scratchpad/length-lit/scripts/check_quotes.py`, output in `scratchpad/length-lit/main/quote-check.txt`).

- **Blocked:** dl.acm.org, oreilly.com, MDPI and ScienceDirect returned 403; Springer, HAL, ZORA and lore.kernel.org served bot challenges (Wayback copies or mirrors were used where they exist); Google Books returned a CAPTCHA; Semantic Scholar returned 429 on most requests; rules.sonarsource.com returned 404 for every rule, so Sonar's rule descriptions come from the Java plugin's copies of the same keys (2.15); the Internet Archive was intermittently offline. Ousterhout's book extract (13.9 MB), a University of Maryland report (13.5 MB) and NIST FIPS 69-1 (22.9 MB) were over the download limit and not fetched. Medium returned a Cloudflare challenge. GitHub's code-search quota ran out once and was waited out.
- **Books not opened:** _Code Complete_ past the first paragraphs of §7.4–7.5, _Clean Code_ chapter 3, _Refactoring_ chapter 3, _The Elements of Programming Style_ and _A Philosophy of Software Design_; no legitimate full text was available, and no shadow library was used. What each entry could and couldn't verify is stated in it.
- **`gh` was used read-only** on public repositories: commits, files, issues, PRs, releases, gists, code and issue search. No repository was cloned.
- **Nothing was installed.** No email address, name or account detail was put in any URL, query, header or form, and Unpaywall wasn't used. Small npm tarballs (eslint-plugin-sonarjs 1.0.3) were downloaded to read, not run. Nothing was left downloading.
- **Embedded instructions:** the Claude Code, Codex and Sonar docs pages open with notes telling agents to fetch an `llms.txt` index; agent prompts, Cursor's and GitHub's example rules, the agents.md example, Aider's conventions, a lint message in a gist ("Please split this file…") and an agent-written PR are instructions aimed at models. All were read as data and not followed. Several repos read for section 2 and 3 contain `AGENTS.md` or `CLAUDE.md` files (eslint-config-xo, eslint-plugin-unicorn, Oxfmt, a replication package); they weren't opened. RuboCop's maintainer says they wrote their 2026 data summary with Claude (3.5). No source tried to direct the work.
- **Personal data:** one saved issue carried a reporter's local path in error logs and was trimmed; one unrelated search hit with a third party's email was deleted and isn't cited.

**About the items tagged my check.** These were run on 25 Oct 2026 with the worktree's binaries (Oxlint 1.89.0, ESLint 10.13.0, Biome 2.6.3, on Node 24.14.1): ESLint `--print-config` for each framework preset (`scratchpad/length-lit/main/check/eslint/`), Oxlint's and ESLint's `max-depth` defaults (`scratchpad/length-lit/main/check/depth/`), and `vue/max-props` with and without options (`scratchpad/length-lit/main/check/vue/`). The corpus measurements for this topic (what each limit reports on real code, what the formatter changes, size against bug fixes) are being built separately in `research/corpus/results/length-limits/`; nothing here depends on them. Move these checks into the harness under `--topic length-limits` before putting a number in the post.

Hayden gave their reasons for keeping the size limits off on 25 Oct 2026, relayed while this file was compiled; they are recorded as Hayden's account in 6.8 and in the notes, with the sources that bear on them.

---

## Most useful for the post

1. **Every ESLint default was a contributor's pick, and two say so.** `max-params` 3: "Default value is 3.", no reason given; `max-statements` 10 and `max-depth` 4 came with 2013 ports of JSHint options that had no defaults; `max-nested-callbacks` 10: "Double digits are scary to start without being too restrictive"; `max-lines` 300: "I'm sorry, I'm not sure why I changed it. No reason."; `max-lines-per-function` 50: "I've changed the default to 50 but this is very subjective". Oxlint copied them; Biome changed two (4 parameters, 5 callbacks). (2.3–2.6, 2.11, 2.13, 2.14)
2. **The 300-line file default leads back to a withdrawn claim.** ESLint picked 300 as "the sweet spot" "according to the article you linked."; that blog's 200–400 lines comes through Raymond's _Art of Unix Programming_ from Hatton's 1997 U-curve; Hatton, 2009: "I no longer believe in the U-bend described in this paper." (2.5, 4.9)
3. **The first study to test a one-page limit found it raised cost.** Card, Church and Agresti (NASA, 453 modules): "No significant relationship was found between module size and fault rate."; "Arbitrary module size limitations can increase module cost." (4.3)
4. **'Small modules have more bugs per line' is arithmetic, and there's no size cliff.** Rosenberg: "this is an arithmetic artifact of plotting bugs-per-SLOC against SLOC"; El Emam et al.: "unambiguous evidence that there is no threshold effect of class size"; Fenton and Ohlsson: "no evidence to support previous claims relating module size to fault density". A hard limit assumes a cliff. (4.10, 4.13, 4.15)
5. **Size is the signal other metrics borrow, but structure adds something per method.** "After controlling for size none of the metrics we studied were" "associated with fault-proneness anymore." (classes). At method level, "code metrics are indeed good maintenance predictors" "even when their correlation with size is neutralized". (4.18, 4.25)
6. **Longer methods change more; "data-derived" thresholds are percentiles, not risk points.** Chowdhury et al.: keep Java methods "under 24 lines", the point that "covers 70% of the y-axis"; Alves et al.'s thresholds "represent overall volume of code"; SIG's own book warns that all-or-nothing enforcement "may lead developers to ignore the violations altogether". (4.24, 4.29, 4.30)
7. **Reformatting barely changed the research signal, but it changes the count a rule sees.** Chowdhury et al. reformatted every method and found "negligible effect sizes"; Ruff refused a file-length rule because "the formatter can introduce new violations"; PMD deleted its line-count rules as "easily circumvented by bad code style". (4.24, 3.3, 3.8)
8. **Research "Long Method" is relative and checked by people.** Palomba et al. flag methods "higher than the average of the system" and validate them by hand; DECOR avoids "setting artificial thresholds". The size-controlled smell study ("None of the 12 investigated smells was significantly associated with increased effort") didn't include Long Method. (4.34, 4.36, 4.37)
9. **Splitting has a measured cost.** An eye-tracked study found extraction helped novices on two tasks and slowed them on simple ones; "even well-named methods can disrupt novices' linear reasoning". Regular code gave "better" comprehension "despite being longer". Developers given the same long function extracted anywhere from 3 to 10 functions. (4.47, 4.48, 4.49)
10. **Both sides of the short-functions debate agree over-decomposition happens.** Ousterhout: "decomposition can be taken too far."; Martin, co-signing: "We agree that it is possible to over-decompose," and Clean Code "doesn't provide much guidance on how to recognize over-decomposition." Martin's 2009 advice was "Extract till you drop." (1.11, 1.12)
11. **Parameter limits miss the common swap.** At Google, risk "increases markedly" past five arguments, yet 71% of the swapped-argument defects found were `expected`/`actual` pairs, mostly in two- or three-parameter assertion calls. Biome's maintainer and a typescript-eslint proposal suggested flagging same-typed parameters instead; Miller and Cowan say nothing about parameter lists. (4.55, 2.14, 2.22, 1.15)
12. **Line length is the formatter's job, and formatters overshoot on purpose.** ESLint deprecated `max-len` as a formatting rule; Prettier: "It is not the hard upper allowed line length limit."; Torvalds would rather check for "no deep indentation"; in an eye-tracking study, "no correlation between the" "line length and the total duration of time spent looking on the line". (2.9, 3.13, 1.4, 4.64)
13. **Other ecosystems are turning size limits off.** RuboCop marks every Metrics cop "Expected to be disabled by default in the next major release." after finding projects reject them about twice as often as they raise them; Ruff left every size rule out of its 413 defaults; Clippy made `too_many_lines` pedantic before release; Standard Ruby: "no matter what number you pick, someone will find a rationalization"; the Go wiki: "not to start counting lines." (1.14, 3.3, 3.5, 3.6, 3.11)
14. **The guides people cite set soft numbers.** Google: "no hard limit is" placed on function length, "about 40 lines, think about" splitting; the kernel: length "inversely proportional to the" complexity; Holzmann's 60 lines is "a single sheet of paper". (1.2, 1.5, 1.8)
15. **Popular configs and Sonar's own profiles leave function length off.** No widely used ESLint config enables `max-lines-per-function` or `max-statements`, and eslint-config-love calls its numbers "arbitrary"; Sonar's default and "agentic AI" profiles keep 7 parameters and 30 switch cases but not function or file length, and its function-length rule skips React components. (2.15, 2.16, 2.19)
16. **The same limit is four different measurements.** ESLint and Oxlint count the whole function, blank lines and comments included, and a nested function in its parent too; Biome counts the body only; SonarJS counts code lines and skips React components. (2.6, 2.14, 2.15, 2.18)
17. **Users hit the limits on code they consider fine, and are told to suppress.** JSX render functions ("It's the blocking issue for our project to adapt this rule"), test suites, constructors, callbacks with fixed signatures; ESLint's answer: "This sort of thing is exactly what ESLint disable comments are for."; RuboCop users were "frustrated by having to disable the MethodLength check"; Ultracite's one public `max-statements` report was a React hook with "a few pieces of state, refs, and effects". (2.20, 2.21, 6.3)
18. **Refactoring to meet a limit costs something, and moving code costs most.** Across 103 systems, Extract Method was less fix-inducing than other commits (odds ratio 0.86), Extract And Move Method (1.52) and Extract Class (1.65) more; refactoring mixed into feature work is the bug-prone kind; "only 9.7% of refactorings removed smells, while 33.3% induced the introduction of new ones". A SonarQube lambda-length rule was fixed 25% of the time. (4.79, 4.82, 4.83, 4.88)
19. **The help text says 'split', and agents split.** Oxlint: "Consider splitting it into smaller functions."; under `max-lines` rules Böckeler's agent split code and Böckeler saw "a worrying trend of components with lots and lots of properties"; in our experiment and on AIDev, extractions were mostly verbatim and left branching unchanged. (2.13, 5.34, 5.37, 5.40)
20. **Agents do single refactorings well with checks in the loop, and cross-file ones and unchecked lint fixes poorly.** GPT-5.1-Codex: 82.6% of atomic refactorings, 39.4% of compound ones; the best agent resolved 41.2% of large refactorings; one model went from 8.7% alone to 82.8% with compile, test and refactoring checks; LintEval: models "reach up to 90.4% Reduction@P but achieve only 67.1%–68.3% Pass@1". (5.47, 5.48, 5.50, 5.51)
21. **Count rules get gamed, by agents too.** Agents cleared Pylint's argument limit with `**kwargs` ("This operation directly addresses R0913"), and 73.5% of those PRs were merged; SIG saw parameters "moved to the fields of the surrounding class"; Pylint's docs: "you can't make the code less readable by making a very complex one liner" when complexity is measured instead. (5.55, 4.70, 3.1)
22. **AI-written functions aren't longer in general.** Per function, models wrote about half the lines humans did (Cotroneo et al.); in real repositories, Mao et al.'s revised study calls the differences "rather small". (5.2, 5.5)
23. **Length hurts models at thousands of tokens, and the fix was in the tool.** "the sheer length of the input alone can hurt LLM performance"; SWE-agent did best showing 100 lines at a time (18.0%) against the full file (12.7%); at fixed context, "longer files are associated with higher accuracy in 5 out of 6 brackets"; vendors cap and page reads (Claude Code: 25,000 tokens per call). Anthropic tells models: "Don't create helpers, utilities, or abstractions for one-time" operations. (5.13, 5.16, 5.21, 5.25, 5.26)
24. **Ultracite: off since 2022 without a recorded reason, on by accident twice, and Hayden's reasons now on record.** SonarJS's line limits were on in the ESLint preset from V7 to 7.9.0 and Biome's nursery rules briefly in 2025; the changelog's later rationale doesn't match the record; Hayden: "there was no autofix" and "a long init function can be fine". (6.1, 6.2, 6.8)

---

## 1. Where length limits came from

Items 1.1–1.6 are the early guidance and house rules (Kernighan and Plauger, the Linux kernel and its 2020 change, Holzmann's Power of Ten, the JSF C++ standard); 1.7 is _Code Complete_ (the studies it cites are 4.1–4.7); 1.8 is Google's guides; 1.9–1.13 are the books and essays that argue about function size (Fowler, Martin, Ousterhout, Carmack); 1.14 is the Go project's advice; 1.15 is Miller and Cowan, often used to justify parameter limits. Sources are in `scratchpad/length-lit/C/` (and `A/`, `D/` where noted).

### 1.1 Kernighan and Plauger, The Elements of Programming Style (1974; 2nd ed. 1978). UNVERIFIED (secondary transcription of the rules appendix)

- **Citation:** Brian W. Kernighan and P. J. Plauger, _The Elements of Programming Style_, 2nd ed., McGraw-Hill, 1978, ISBN 0-07-034207-5. Rules list as transcribed by Mike Taylor, https://www.miketaylor.org.uk/tmp/eops-rules.html
- **What it says (per the transcription):** under Program Structure: "Modularize. Use subroutines." "Each module should do one thing well." "Make sure every module hides something." "Write and test a big program in small pieces." No rule in the list gives a line, statement or parameter count.
- **Caveat:** I couldn't open the book legitimately (the Internet Archive copy needs a borrowing login); the transcription is a third party's. Nothing here supports a claim that K&P set a numeric routine size.
- **For the post:** don't cite K&P for a size limit. If it's cited at all, it's for "one thing well" and "hides something", which are about cohesion and information hiding, not length.
- **Text:** `scratchpad/length-lit/C/text/eops-rules-miketaylor.html`

### 1.2 Linux kernel coding style: functions in "screenfuls", local variables, 80 columns (current text). VERIFIED

- **Citation:** Linux kernel, `Documentation/process/coding-style.rst`, at `323fa4b9608b1c277ca7f97f81172aa56da76074` (29 May 2026). https://github.com/torvalds/linux/blob/323fa4b9608b1c277ca7f97f81172aa56da76074/Documentation/process/coding-style.rst
- **What it says:**
  - Section 6, Functions: "Functions should be short and sweet, and do just one thing." "They should fit on one or two screenfuls of text" ("the ISO/ANSI screen size is 80x24, as we all know").
  - Length scales with difficulty, not a number: "The maximum length of a function is inversely proportional to the" / "complexity and indentation level of that function." A long but simple case-statement function: "it's OK to have a longer function."
  - Local variables: "They shouldn't exceed 5-10, or you're doing something wrong." The reason given: "A human brain can generally easily keep track of about 7 different things," (no citation).
  - Section 2, lines: "The preferred limit on the length of a single line is 80 columns." Break longer statements "unless exceeding 80 columns significantly increases readability and does not hide information." And "never break user-visible strings such as printk messages" because that breaks grep.
  - Section 1, indentation (8-character tabs): "if you need more than 3 levels of indentation, you're screwed anyway," "and should fix your program."
- **Caveat:** the line about tracking 7 things is folk Miller (1956) with no source; Miller and Cowan are in 1.15. The kernel never gives a line count for functions; the measure is screens, scaled by complexity. Retellings that say the kernel caps functions at 24 lines overstate it.
- **For the post:** the most-cited house style ties function length to how hard the function is and to nesting, and treats a long flat `switch` as fine. That is closer to Ultracite's structural rules than to `max-lines-per-function`.
- **Text:** `scratchpad/length-lit/C/src/linux/coding-style.rst@323fa4b9.rst`

### 1.3 The 2020 change: checkpatch's 80-column warning deprecated (Joe Perches, commit `bdc48fa1`, 29–31 May 2020). VERIFIED

- **Citation:** Joe Perches, "checkpatch/coding-style: deprecate 80-column warning", authored 29 May 2020, committed by Linus Torvalds 31 May 2020 (merged for 5.8). https://github.com/torvalds/linux/commit/bdc48fa11e46f867ea4d75fa59ee87a7f48be144
- **What it says:** "Yes, staying withing 80 columns is certainly still _preferred_." "But it's not the hard limit that the checkpatch warnings imply," "and other concerns can most certainly dominate." "Increase the default limit to 100 characters." "Not because 100 characters is some hard limit either," and "checkpatch will no longer emit a warning about line length" / "when scanning files unless --strict is also used". In checkpatch.pl, `$max_line_length = 80` became `100`. In coding-style.rst the old text, "The limit on the length of lines is 80 columns" (a strongly preferred limit), became "The preferred limit on the length of a single line is 80 columns." (1.2).
- **Caveat:** the commit is by Perches, signed off by Torvalds; it didn't remove the 80-column preference. The warning moved to 100 and, for whole files, to `--strict` only.
- **For the post:** the largest C project kept 80 as a preference and stopped enforcing it in its checker. The limit became advice, not a gate.
- **Text:** `scratchpad/length-lit/C/src/linux/commit-bdc48fa1.json`

### 1.4 Linus Torvalds on line length: two LKML messages (28 and 29 May 2020). VERIFIED (Wayback copy of lore.kernel.org; LKML mirror)

- **Citation:** (a) Torvalds, "Re: clean up kernel_{read,write} & friends v2", 28 May 2020 11:51 −0700, Message-ID `CAHk-=wj3iGQqjpvc+gf6+C29Jo4COj6OQQFzdY0h5qvYKTdCow@mail.gmail.com`, https://lore.kernel.org/lkml/CAHk-=wj3iGQqjpvc+gf6+C29Jo4COj6OQQFzdY0h5qvYKTdCow@mail.gmail.com/ (read from the Wayback capture of 12 Jul 2020). (b) Torvalds, same thread, 29 May 2020 (reply to David Laight), https://lkml.iu.edu/hypermail/linux/kernel/2005.3/08168.html (also https://lkml.org/lkml/2020/5/29/1038, the link Phoronix used).
- **What it says:**
  - (a) "I'm really inclined to remove the checkpatch check for 80 columns entirely," "Or maybe make it check for something more reasonable, like 100 characters." "There are lots of perfectly fine reasons for longer lines." Then what they would check instead: "I'd much rather check for 'no deep indentation' or 'no unnecessarily complex conditionals'" "or other issues that are more likely to be _real_ problems." "But do we really have 80x25 terminals any more that we'd care about?"
  - (b) "Excessive line breaks are BAD. They cause real and every-day problems." They hurt grep, "since grep (and a lot of other very basic unix utilities) is fundamentally line-based." "Longer lines are fundamentally useful." "People commonly used 132-column terminals even back in the 80's," "don't try to make 80 columns some immovable standard." "And yes, we do line breaks at some point." But "there really isn't any reason to make that point be 80 columns any more".
- **Caveat:** two messages, often merged into one in retellings. Perches's patch (1.3) was a reply to (b). lore.kernel.org itself returned an anti-bot page; the text is from the Wayback capture and the lkml.iu.edu mirror, which match each other in thread structure.
- **For the post:** the strongest primary statement that line breaks have a cost (search), and that the thing worth checking is nesting and conditional complexity, not width. It maps straight onto keeping `max-depth`-style and complexity rules while dropping `max-len`.
- **Text:** `scratchpad/length-lit/C/text/lore-torvalds-80col-wayback-20200712.html`, `scratchpad/length-lit/C/text/lkml-iu-2005.3-08168.html`

### 1.5 Holzmann, "The Power of Ten" (NASA/JPL; IEEE Computer, June 2006): a function on "a single sheet of paper". VERIFIED (author PDF; Crossref)

- **Citation:** Gerard J. Holzmann, "The Power of 10: Rules for Developing Safety-Critical Code," _Computer_ 39(6):95–97, June 2006, doi:10.1109/MC.2006.212. Author copy: https://spinroot.com/gerard/pdf/P10.pdf (6 pages).
- **What it says:** Rule 4: "No function should be longer than what can be printed on a" / "single sheet of paper in a standard reference format" with one line per statement and declaration. "Typically, this means no more than about 60 lines of code per function." Rationale: "Each function should be a logical unit in the code" / "that is understandable and verifiable as a unit." "Excessively long functions are often a sign of poorly structured code." On coding standards generally: "most existing guidelines contain well over a hundred rules, sometimes with questionable justification." and "the existing coding guidelines tend to have little effect on what developers actually do". The rules are "being used experimentally at JPL" "with encouraging results" (no data).
- **Caveat:** written for safety-critical C, alongside bans on recursion, dynamic allocation and unbounded loops; the 60-line figure comes from a printed page, not a study. Crossref lists the author as given name J., family name Gerald (a metadata error).
- **For the post:** the clearest primary source for the fits-on-a-page heuristic, and it says outright that the number is a page. Useful to show where 60 comes from (ESLint-world numbers like 50 and 60 look similar but have no stated source).
- **Text:** `scratchpad/length-lit/C/text/holzmann-power-of-ten.txt`, `scratchpad/length-lit/C/src/crossref-10.1109-mc.2006.212.json`

### 1.6 Lockheed Martin, JSF Air Vehicle C++ Coding Standards (Dec 2005): size limits that need no verification. VERIFIED; Vendor (Lockheed Martin)

- **Citation:** Lockheed Martin, _Joint Strike Fighter Air Vehicle C++ Coding Standards for the System Development and Demonstration Program_, Doc. No. 2RDU00001 Rev C, December 2005 (public release). Hosted by Bjarne Stroustrup: https://www.stroustrup.com/JSF-AV-rules.pdf
- **What it says:** AV Rule 1: a function will contain "no more than 200 logical source lines of code" because "Long functions tend to be complex and therefore difficult to comprehend and test." AV Rule 41: "Source lines will be kept to a length of 120 characters or less." AV Rule 110: "Functions with more than 7 arguments will not be used." "Functions with too many parameters may indicate an under use of objects and abstractions." AV Rule 3: "All functions shall have a cyclomatic complexity number of 20 or less." with an exception: "A function containing a switch statement with many case labels may exceed this" limit.
- **The detail that matters (§4.2.1):** "Will rules are intended to be mandatory requirements." "It is expected that they will be followed," / "but they do not require verification." "Shall rules are mandatory requirements." "They must be followed and they require verification (either automatic or manual)."
- **Caveat:** a defence-contractor house standard for avionics C++, not a study. Breaking a _will_ or _shall_ rule needs sign-off from two leads, so not requiring verification doesn't make it optional.
- **For the post:** a striking split. In one of the strictest coding standards published, length, line width and argument count are _will_ rules (no required check), while cyclomatic complexity is a _shall_ rule that must be verified, with a carve-out for long `switch`es.
- **Text:** `scratchpad/length-lit/C/text/jsf-av-rules.txt`

### 1.7 McConnell, _Code Complete_, 2nd ed. (Microsoft Press, 2004), §7.4 "How Long Can a Routine Be?" and §7.5 on parameters. VERIFIED (publisher preview, opening paragraphs only); study list UNVERIFIED (secondary)

- **Citation:** Steve McConnell, _Code Complete: A Practical Handbook of Software Construction_, 2nd ed., Microsoft Press, 2004, ISBN 0-7356-1967-0 (O'Reilly's listing shows June 2004 and the imprint 'Cisco Press'). O'Reilly previews read from the Wayback Machine: §7.4 http://web.archive.org/web/20250910224841/https://www.oreilly.com/library/view/code-complete-2nd/0735619670/ch07s04.html and §7.5 http://web.archive.org/web/20250830051203/https://www.oreilly.com/library/view/code-complete-2nd/0735619670/ch07s05.html. Live O'Reilly pages return 403 to curl and WebFetch; Google Books returned a CAPTCHA and its API a 429.
- **Method:** Practitioner handbook. The preview shows only each section's first paragraph or two.
- **What it says (verified in the preview):** §7.4 opens with the Pilgrims joke, then: the theoretical best maximum is "approximately 50 to 150 lines", and "IBM once limited routines to 50 lines, and TRW limited them to two pages" "(McCabe 1976)". §7.5 opens: "Interfaces between routines are some of the most error-prone areas of a program." It cites Basili and Perricone (1984): "39 percent of all errors were internal interface errors".
- **What it says (secondary only, not verified):** A March 2009 blog by Patrick Dubroy quotes another developer's post (the author of the Perl module Class::Sniff) who read p. 175 and says McConnell argues "routines should not be longer than 200 lines" and "cite six separate studies"; Dubroy then copies a third-hand summary: "Routine size is inversely correlated with errors, up to 200 lines of code." (Basili and Perricone 1984); routines of 65 lines or more are "cheaper to develop per line of code" (Card, Church and Agresti 1986; Card and Glass 1990); "Routines with fewer than 143 source statements (including comments)" "had 23% more errors per line of code than larger routines" (Selby and Basili 1991); "Routines averaging 100 to 150 lines of code need to be changed least." (Lind and Vairavan 1989). The 'about seven parameters' guidance was not visible in the preview and was not verified.
- **Numbers:** The 39% interface figure matches the primary (4.1: Figure 8 gives interface errors as 39% of abstract errors).
- **Caveat:** I could not open §7.4 past its first paragraph, so the study list, the 200-line ceiling and the seven-parameter rule are reported here only through secondary sources. The blog and its "good summary" are not McConnell's text. Check the printed book before quoting any of it.
- **For the post:** Safe to say McConnell framed the question with IBM's 50-line and TRW's two-page limits and pointed at interfaces as the error-prone part. Attribute the study list to 'as summarised from Code Complete' only after someone checks a copy.
- **Text:** `scratchpad/length-lit/A/text/oreilly-cc2-7.4-wayback.txt`, `scratchpad/length-lit/A/text/oreilly-cc2-7.5-wayback.txt`, `scratchpad/length-lit/A/text/dubroy-2009-blog.txt`

### 1.8 Google's C++ and Python guides: "about 40 lines", explicitly no hard limit. VERIFIED; Vendor (Google)

- **Citation:** Google Style Guides, `cppguide.html` ("Write Short Functions") and `pyguide.md` (§3.18 "Function length"), google/styleguide at `c775c0c2f73c110613243520c001577cdbc0034d` (24 Oct 2026). https://google.github.io/styleguide/cppguide.html#Write_Short_Functions
- **What it says:** "Prefer small and focused functions." "We recognize that long functions are sometimes appropriate, so no hard limit is" placed on function length. "If a function exceeds about 40 lines, think about" / "whether it can be broken up without harming the structure of the program." (Both guides, near-identical wording.)
- **Caveat:** guidance for human review at Google; nothing says it's enforced by a tool.
- **For the post:** even the guide most people picture as strict states a soft number and the condition "without harming the structure of the program", which a lint threshold can't check.
- **Text:** `scratchpad/length-lit/C/src/google-styleguide/cppguide.html`, `scratchpad/length-lit/C/src/google-styleguide/pyguide.md`

### 1.9 Martin Fowler: "Function Length" (30 Nov 2016) and "Code Smell" (9 Feb 2006). ANECDOTAL (author's own site)

- **Citation:** Martin Fowler, "Function Length," https://martinfowler.com/bliki/FunctionLength.html ; "Code Smell," https://martinfowler.com/bliki/CodeSmell.html
- **What it says:**
  - FunctionLength: length "is a proxy for the more important question" "when should we enclose code in its own function?" Fowler has heard guidelines "such as functions should be no larger than fit on a screen" (footnote: Fowler's first job used "two pages of line printer paper - around 130 lines of Fortran IV"). The answer: "The argument that makes most sense to me, however, is the" / "separation between intention and implementation". Fowler's own habit: "Any function more than half-a-dozen lines of code starts to smell to me," but "The fact that size isn't important was brought home to me" by a Smalltalk method whose name was longer than its body. On the Ruby toolchain behind the site: "half of the methods in my codebase are two lines or less."
  - CodeSmell: "A long method is a good example of this" (a smell that's quick to spot); "my nose twitches if I see more than a dozen lines of java." But "smells don't always indicate a problem. Some long methods are just fine." "You have to look deeper to see if there is an underlying problem there".
- **Caveat:** opinion pieces. I couldn't open the Long Function and Long Parameter List text in _Refactoring_ (2nd ed., ch. 3); the refactoring.com catalog lists refactorings (Extract Function, Introduce Parameter Object), not smells. Fowler prefers very short functions and is not an ally of long ones.
- **For the post:** the person most associated with "long method" defines it as a smell, a prompt to look, and says some long methods are fine. That's the difference between a smell and an error-level lint gate.
- **Text:** `scratchpad/length-lit/C/text/fowler-FunctionLength.txt`, `scratchpad/length-lit/C/text/fowler-CodeSmell.txt`, `scratchpad/length-lit/C/text/refactoring-com-catalog.txt`

### 1.10 Robert C. Martin, Clean Code (2008/2009): what can and can't be verified. VERIFIED (publisher's sample pages: contents and index only); text quoted via 1.12

- **Citation:** Robert C. Martin, _Clean Code: A Handbook of Agile Software Craftsmanship_, Prentice Hall, © 2009 (LoC 2008), ISBN 978-0-13-235088-4. Pearson sample pages (67 pp.): https://ptgmedia.pearsoncmg.com/images/9780132350884/samplepages/9780132350884.pdf
- **What the sample shows:** contents for Chapter 3, "Functions": "Small!" (p. 34), "Blocks and Indenting", "Do One Thing", "Function Arguments" (p. 40), "Common Monadic Forms", "Flag Arguments", "Dyadic Functions", "Triads", "Argument Objects"; Chapter 5 has "Vertical Formatting" and "Horizontal Formatting". The index has "niladic argument, 40", "triadic argument, 40" and "small as better, 34".
- **The book's words, as quoted by Ousterhout in the joint document (1.12), which Martin co-wrote and didn't dispute on wording:** "The first rule of functions is that they should be small." "The second rule of functions is that _they should be smaller than that_." "Functions should hardly ever be 20 lines long"; functions "just two, three, or four lines long"; blocks in `if`/`else`/`while` "should be one line long. Probably that line should be a function call."
- **Caveat:** I couldn't open Chapter 3 itself (not in the sample; O'Reilly needs a login), so the argument-count passage (in common retellings: zero arguments ideal, three to be avoided, more only with very special justification) is UNVERIFIED in its exact wording; only its headings and index entries are confirmed. Martin says the book "claimed no final authority" (1.12).
- **For the post:** quote the "small" lines through 1.12, where both authors stand behind the quotation. Don't quote the argument-count rule as text.
- **Text:** `scratchpad/length-lit/C/text/pearson-clean-code-samplepages.txt`, `scratchpad/length-lit/C/src/aposd/README.md`

### 1.11 Robert C. Martin, "One Thing: Extract till you Drop." (11 Sep 2009). VERIFIED (Wayback capture of the Object Mentor blog)

- **Citation:** "Uncle Bob" (Robert C. Martin), Object Mentor blog, 11 Sep 2009, http://blog.objectmentor.com/articles/2009/09/11/one-thing-extract-till-you-drop (Wayback, 14 Sep 2009). Later re-hosted at sites.google.com/site/unclebobconsultingllc.
- **What it says:** authors have said "functions should do one thing"; "What the hell does 'one thing' mean?" They propose a test: "Is a function doing one thing if, and only if," / "you simply cannot extract any other functions from it?" After splitting a 15-line class into ten tiny methods: "this level of extraction is not taking things too far at all." "Extract till you just can't extract any more." "Extract till you drop."
- **Caveat:** a blog post with one worked example. The post is the source of the "extract until you can't" reading of Clean Code that Ousterhout argues against (1.12).
- **For the post:** the clearest primary statement of the position that size limits push toward. An agent told to satisfy `max-lines-per-function` will tend to do exactly this, which is the over-decomposition Ousterhout describes.
- **Text:** `scratchpad/length-lit/C/text/martin-extract-till-you-drop-2009.txt`

### 1.12 Ousterhout and Martin, "A Philosophy of Software Design vs Clean Code" (Sept 2024–Feb 2025). VERIFIED (the joint document; author's book page)

- **Citation:** John Ousterhout and Robert C. Martin, johnousterhout/aposd-vs-clean-code, `README.md` at `2ce0742228fbf850e15101f83308de2cd72144b2` (last push 15 Apr 2025). https://github.com/johnousterhout/aposd-vs-clean-code . Book: John Ousterhout, _A Philosophy of Software Design_, 2nd ed., Yaknyam Press, July 2021; author page https://web.stanford.edu/~ouster/cgi-bin/aposd.php
- **What it says:**
  - Ousterhout: methods that hide a lot behind a simple interface: "I call these methods 'deep'." But "decomposition can be taken too far." Small pieces with complex interfaces: "I call these interfaces 'shallow': they don't help much". Splitting also causes entanglement, where you must read two methods to understand one. "Setting arbitrary numerical limits such as 2-4 lines in a method" "exacerbates this problem".
  - Martin: "I don't think it's fair to say that the book sets arbitrary numerical limits." The 2–4-line functions were "part of the _Sparkle_ applet that Kent Beck and I wrote together in 1999". The book's advice: "They are offered for consideration."
  - Agreed summary: "We agree that it is possible to over-decompose," and that Clean Code "doesn't provide much guidance on how to recognize over-decomposition." Martin: "I think this is a fair assessment of our agreements and disagreements." "we disagree on the relative weighting of those two values."
  - Ousterhout's book page: the 2nd edition added comparisons with Clean Code because "we have significant differences of opinion on topics such as" / "the length of methods and the role of comments".
- **Caveat:** two authors' opinions with worked examples, not data. I didn't open the book (its free extract is 13.9 MB, over my download limit).
- **For the post:** the best primary source for the cost of splitting for its own sake ("shallow" methods and entanglement), with the most famous advocate of short functions agreeing that over-decomposition happens and their book doesn't help you spot it.
- **Text:** `scratchpad/length-lit/C/src/aposd/README.md`, `scratchpad/length-lit/C/text/ousterhout-aposd.txt`

### 1.13 John Carmack, "inlining code" (email, 13 Mar 2007; published 2014). ANECDOTAL

- **Citation:** John Carmack, email to id Software staff, 13 Mar 2007, with a 26 Sep 2014 preface, published on Jonathan Blow's site: http://number-none.com/blow/john_carmack_on_inlined_code.html (Wayback, 26 Sep 2014).
- **What it says:** "If everything is just run out in a 2000 line function," "it is obvious which part happens first," and inlining has the benefit of "not making it possible to call the function from other places." "Most bugs are a result of the execution state not being exactly" / "what you think it is." Carmack frames it as a proposal: "I'm not going to issue any mandates," The 2014 preface: "The real enemy addressed by inlining is unexpected dependency and mutation of state," and Carmack would now reach for pure functions first.
- **Caveat:** game-engine code with a per-frame loop; one engineer's experience. It doesn't claim long functions are good in general.
- **For the post:** a respected counterpoint that the cost of splitting is hidden ordering and extra call sites. Use as a perspective, not evidence.
- **Text:** `scratchpad/length-lit/C/text/carmack-inlined-code.txt`

### 1.14 Go: "not to start counting lines" (Go wiki, Code Review Comments). VERIFIED; Vendor (Google)

- **Citation:** golang/wiki, `CodeReviewComments.md` at `fe2268bb04c953cd65bcae752e978912f5cbddaa`, section "Line Length". https://go.dev/wiki/CodeReviewComments#line-length
- **What it says:** "There is no rigid line length limit in Go code," "but avoid uncomfortably long lines." Unnatural wrapping usually means too many parameters or long names: "Long lines seem to go with long names,". So "break lines because of the semantics of what you're writing" "and not because of the length of the line." And for functions: "There's no rule 'never have a function more than N lines long'," but too-long functions exist, and "the solution is to change where the function boundaries are," / "not to start counting lines."
- **Caveat:** community wiki maintained by the Go project; guidance, not data.
- **For the post:** the cleanest one-line statement of the post's position, from a language whose toolchain enforces formatting but no size limit.
- **Text:** `scratchpad/length-lit/C/src/go/CodeReviewComments.md`

---

### 1.15 Miller (1956) and Cowan (2001) say nothing about parameter lists. VERIFIED (full texts); cross-reference `cognitive-complexity.md` §4

- **Read:** Miller, http://psychclassics.yorku.ca/Miller/ ; Cowan, _Behavioral and Brain Sciences_ 24(1), pp. 87–185 with commentary, https://doi.org/10.1017/S0140525X01003922 , from the author's lab site https://memory.psych.missouri.edu/assets/doc/articles/2001/cowan-bbs-2001.pdf (the running header prints "(2000) 24").
- **Checked:** Miller's text contains no "parameter", "program" or "computer"; Cowan's target article and commentaries mention "parameters" only for models and stimuli. Miller's point is that "the memory span is a fixed number of chunks", and recoding makes chunks bigger. Cowan's four-chunk limit holds when chunking is blocked; Cowan calls Miller's seven "a rough estimate and a rhetorical device".
- **Searches:** no study found linking working-memory capacity to parameter counts with evidence. The only explicit link found is practitioner advice: the Linux style guide's "about 7 different things" for local variables (1.2).
- **For the post:** a named parameter is one chunk to a reader who knows the domain; neither paper supports a specific `max-params` value.
- **Text:** `scratchpad/length-lit/D/text/miller-1956.txt`, `scratchpad/length-lit/D/text/cowan-bbs-2001.txt`

---

---

## 2. The rules: where each limit and default came from

Items 2.1–2.2 are JSLint and JSHint; 2.3–2.11 are ESLint's rules, from the 2013 ports of JSHint to the 2023 deprecation of `max-len` and `@stylistic` (2.11 is a table of where each default came from); 2.12 is typescript-eslint; 2.13 Oxlint; 2.14 Biome; 2.15–2.16 SonarJS and Sonar's profiles; 2.17 the plugin rules; 2.18 a table of defaults by tool; 2.19 what popular configs set; 2.20–2.22 what users have asked the tools to relax. Issues, PRs and commits were read with `gh api` (read-only) and saved in `scratchpad/length-lit/main/src/gh/` and `scratchpad/length-lit/main/src/eslint/`. Tool versions are the worktree's: ESLint 10.13.0 (`@eslint/js` 10.0.1), Oxlint 1.89.0, Biome 2.6.3, eslint-plugin-sonarjs 4.2.2, @typescript-eslint/eslint-plugin 8.72.0, eslint-plugin-vue 10.11.1, eslint-plugin-react 7.37.5, eslint-plugin-import-x 4.17.1.

### 2.1 JSLint's `maxlen` (by 2011) and its fixed 80 columns now. VERIFIED (source at pinned commits)

- **Citation:** Douglas Crockford, `jslint.js` dated 2011-04-14, the oldest file in the jslint-org/jslint history (commit `6610addf`, 16 Apr 2011); current `jslint.mjs` on the `beta` branch at `dfee16b5` (Oct 2026). https://github.com/jslint-org/jslint
- **What it says (2011):** the options list includes `maxlen`, "the maximum length of a source line"; the check runs only `if (option.maxlen && option.maxlen < source_row.length)`, with the message "Line too long." There was no default: unset meant no limit.
- **What it says (2026):** the option is gone. The line check now fires when `!option_dict.long && line_whole.length > 80`, with "Line is longer than 80 characters." The opt-out is the `long` directive, "Allow long lines." The comment above it: warn if the line "is too damn long."
- **For the post:** the first JavaScript linter treated line length as a setting in 2011 and later hard-coded 80. Lines are the one size JSLint still polices; it never had parameter, statement or function-length limits.
- **Text:** `scratchpad/length-lit/main/src/jslint/`

### 2.2 JSHint's `maxparams`, `maxdepth`, `maxstatements` and `maxcomplexity` (PR #593, 2012); `maxlen` deprecated as style. VERIFIED (PR, source at tag `2.13.6`)

- **Citation:** shybyte, "Warnings for excessive code metrics values," jshint/jshint PR #593, opened 26 Jul 2012, merged 28 Aug 2012 by Anton Kovalyov (`valueof`) for r11 (npm 0.9.0, 3 Sep 2012). The options were first called `maxparameters`, `maxnestedblockdepth` and `maxcyclomaticcomplexity`, renamed in `c63e566f` (31 Jul 2012). Docs from `src/options.js` at tag `2.13.6` (`884a853a`). https://github.com/jshint/jshint/pull/593
- **What it says:** the rationale, in full: "High values for some common metrics are an indicator for code" "that is potentially difficult to read, understand and maintain." Kovalyov: "This is very exciting." None has a default; each is a number the user sets (`// jshint maxparams:3`). `maxstatements`: "Function declarations count as one statement. Their bodies" "don't get taken into account for the outer function."
- **`maxlen`:** "This option lets you set the maximum length of a line." It is marked `@deprecated`: "JSHint is limiting its scope to issues of code correctness." The parameter, depth and statement options are not deprecated.
- **For the post:** the size limits arrived in JavaScript as opt-in metrics with no default numbers and a one-sentence rationale. JSHint's later split put line length on the style side and kept the others as "code correctness".
- **Text:** `scratchpad/length-lit/main/src/gh/jshint_jshint-593.txt`, `scratchpad/length-lit/main/src/jshint/options-2.13.6.js`

### 2.3 ESLint's first size rules mirrored JSHint, with defaults picked by their authors (Jul–Dec 2013). VERIFIED (issues, PR, commits)

- **Citation:** eslint/eslint issue #115 and PR #116 (Ilya Volodin, `too-many-params`, 23–24 Jul 2013; renamed `max-params` in `26f97a68`); `d424f560` "Rule: max-statements" (Ian Christian Myers, 24 Jul 2013); `4daafe84` "Rule: max-depth" (Myers, 10 Aug 2013); `3609b295` "rule: max-len…" (Matt DuVall, 13 Aug 2013); `3f3da0ac` "Rule: max-nested-callbacks" (Myers, 23 Dec 2013). ESLint's docs data list `max-params`, `max-statements`, `max-depth`, `max-len` and `complexity` as introduced in v0.0.9 and `max-nested-callbacks` in v0.2.0 (npm 0.2.0: 1 Jan 2014; the first npm release, 0.1.0, was 4 Nov 2013).
- **`max-params` = 3:** Volodin's issue: "Should be configurable. Default value is 3.", linking jslinterrors.com's page on JSHint's too-many-parameters warning. No reason for 3 is given. Nicholas Zakas, reviewing: "I would like to keep 'max-params' to mirror JSHint." "I think this should be off by default" "(I think JSHint has it off by default)."
- **`max-statements` = 10 and `max-depth` = 4:** set in `conf/eslint.json` when each rule was created (`"max-statements": [0, 10]`, `"max-depth": [0, 4]`, both off). The commits say only "This rule matches JSHint's **maxstatements** rule." and "This rule matches the _maxdepth_ rule for JSHint."; JSHint had no default (2.2).
- **`max-len` = 80 (tab width 4):** `"max-len": [0, 80, 4]` in the same file. The week before, ESLint had dropped 80 columns from its own contributing guide (issue #102). Zakas: "Lets remove it. I'm not sure how relevant it is."
- **`max-nested-callbacks`:** created with `[0, 2]` and no default in code. Myers's reason for a separate rule: "the theshold beyond which code becomes less clear is much" "lower for nested callbacks than for block statements in general." (sic). It targets "the so-called" "callback hell".
- **For the post:** ESLint's 3, 10 and 4 trace to two contributors' 2013 choices while porting JSHint, with no study or rationale recorded. They are still the defaults in ESLint 10.13.0 and in Oxlint.
- **Text:** `scratchpad/length-lit/main/src/gh/eslint_eslint-115.txt`, `-116.txt`, `-102.txt`, `scratchpad/length-lit/main/src/eslint/commit-messages-2013.txt`, `scratchpad/length-lit/main/src/eslint/first-*.patch`

### 2.4 `max-nested-callbacks` got its default of 10 in 2015 because "Double digits are scary". VERIFIED (issue, commit)

- **Citation:** Ian VanSchooten (`IanVS`), "`max-nested-callbacks` has no default," eslint/eslint #4297, 30 Oct 2015; fixed in `99ad1ca3` (alberto, 3 Nov 2015). https://github.com/eslint/eslint/issues/4297
- **What it says:** "We have said in the past that all rules should have sensible defaults." They suggested "probably something relatively high. Maybe `5`?" Zakas: "I'd go with 10. Double digits are scary to start without being too restrictive" "(and unlikely to create debates about the number being too low)."
- **For the post:** the one ESLint size default with a written reason picked a number to avoid arguments, not to mark a measured threshold. Biome later chose 5 for its port because "I think that is too high" (2.17).
- **Text:** `scratchpad/length-lit/main/src/gh/eslint_eslint-4297.txt`

### 2.5 `max-lines` (ESLint 2.12.0, Jun 2016): 300 came from JSCS's example, a reversal with no reason, and a blog post. VERIFIED (issue, PR, docs, archived article)

- **Citation:** Toru Nagashima (`mysticatea`), "Rule Proposal: max-lines," eslint/eslint #6078, 4 May 2016; alberto, "New: `max-lines` rule (fixes #6078)," PR #6321, merged 10 Jun 2016 (`2520f5a5`); ESLint 2.12.0, 10 Jun 2016. Docs at tag `v10.13.0`.
- **The default, from the review thread:** the proposal said 300; alberto's PR used 100, as "I intended to leave it as it is in JSCS (100)". Asked why they changed it from 100 to 300, Nagashima: "I'm sorry, I'm not sure why I changed it. No reason." Mike Sherov and Zakas wanted JSCS's number until Oleg Gaidarenko (`markelog`) pointed out "There is no 'default' for this rule in JSCS"; "`100` feels weird to me", and "my vote for default (if one should exist) is 500", linking a blog post. alberto: "the 300 lines proposed by @mysticatea seems like the sweet spot" "according to the article you linked. :D" Gaidarenko then asked: "Perhaps we can add some sort of explanation why we choose this number?" Zakas agreed; the docs got the link as `further_reading`.
- **Scope:** Ilya Volodin had asked whether it belonged in core: "This rule is very close to complexity". alberto: "there is a bit of correlation, but they are quite different."
- **The docs' rationale (unchanged in 10.13.0):** "Some people consider large files a code smell." "While there is not an objective maximum number of lines" "considered acceptable in a file," "most people would agree it should not be in the thousands." "Recommendations usually range from 100 to 500 lines." Options: `max` (300), `skipBlankLines`, `skipComments` (both default `false`).
- **The linked article** (Edvin Eshagh, "Software Module size and file size," mind2b.com, Wayback capture of 25 Jul 2016): Eshagh had told a colleague "a module size, in general, should not exceed 200-400 lines of codes." Eshagh admits "I made couple of unsupported claims." and "The 1000 lines is something I blurted out," "and have no support for this number". For 200–400 the post cites a defect-density graph and links Eric Raymond's _The Art of Unix Programming_ and Malaiya and Denton (ISSRE 2000, 4.12).
- **Raymond's chapter** (_The Art of Unix Programming_, ch. 4, "Encapsulation and Optimal Module Size," catb.org): "There is evidence [ Hatton97 ]" for a U-shaped defect-density curve; "Very small and very large modules are associated with more bugs" "than those of intermediate size."; "Hatton's empirical results imply a sweet spot between 200 and 400" "logical lines of code that minimizes probable defect density". Then: "Beware of taking these numbers too literally however." Hatton's own rule of thumb doubles it, "suggesting an optimal range of 400–800 physical lines."
- **For the post:** ESLint's file limit descends, through a blog and a book, from Hatton's U-curve (4.9), which argues small modules are also bad, and which counts logical lines where ESLint counts physical ones. The chain lands on 300 physical lines, below the 400–800 the same chain recommends. Hatton withdrew the U-curve in 2009, and its critics found the optimum an arithmetic artifact (4.9–4.15).
- **Text:** `scratchpad/length-lit/main/src/gh/eslint_eslint-6078.txt`, `-6321.txt`, `scratchpad/length-lit/main/src/eslint/docs-max-lines.md`, `scratchpad/length-lit/main/src/web/mind2b.txt`, `scratchpad/length-lit/main/src/web/taoup-ch04s01.txt`

### 2.6 `max-lines-per-function` (ESLint 5.0.0, Jun 2018): 50 was "very subjective", and nested functions count twice. VERIFIED (issue, PR, source)

- **Citation:** Claudia Meadows (`dead-claudia`, then `isiahmeadows`), "New `max-lines-per-function` rule," eslint/eslint #9842, 12 Jan 2018; Pete Ward (`peteward44`), PR #10188, merged 23 Jun 2018 (`0feedfdb`); ESLint 5.0.0, 23 Jun 2018. Source `lib/rules/max-lines-per-function.js` at `v10.13.0`.
- **Why a line rule, when `max-statements` existed:** Kevin Partington (`platinumazure`): "why is max-statements not sufficient for this sort of thing?" Meadows: "Some expressions (think: long method chains, JSX/hyperscript trees, functional pipelines)" "could take several lines, and `max-statements` would see only a few statements." The docs keep this: "`max-statements` will only report this as 1 statement, despite being 16 lines of code." The proposal cited RuboCop's `Metrics/MethodLength`, Google's style guide (40 lines, via its C++ guide) and the Linux kernel's style (48 lines); what those sources actually say is in 1.2, 1.8 and 3.5.
- **The default:** the PR's docs said 200 and its code 100. Meadows: "200 is a bit pointlessly high..." "I could see 50 as a decent default." (comparing RuboCop's 10). Ward: "I've changed the default to 50 but this is very subjective" "so I guess it's up for one of the maintainers" "to agree a sensible default". No maintainer revisited it.
- **What it counts:** every physical line from the function's start (the `Property` or `MethodDefinition` for methods, after Nagashima's review) to its end, including blank lines and comments unless `skipBlankLines`/`skipComments` are set. Ward: "As it works at the moment, nested functions are included in their parent's count." The merged code has no subtraction, so a callback's lines count toward its own limit and its parent's. IIFEs are skipped unless `IIFEs: true`, after Teddy Katz (`not-an-aardvark`) argued "it could be a usability issue if the rule always reports IIFEs." Nagashima, on callbacks: `Array#forEach` callbacks feel like part of the parent, event listeners don't: "It's difficult."
- **Defaults philosophy:** Jordan Harband (`ljharb`): "My opinion is that defaults should be as restrictive as possible as well," "so users are loosening them with intention."
- **Docs rationale:** "Some people consider large functions a code smell." "Many coding style guides dictate a limit of the number of lines" "that a function can comprise of. This rule can help enforce that style." Message: `{{name}} has too many lines ({{lineCount}}). Maximum allowed is {{maxLines}}.`
- **For the post:** the rule exists because statement counts miss JSX and long chains, which also means it counts what a formatter does to them. Its default was the commenter's suggestion, accepted as subjective.
- **Text:** `scratchpad/length-lit/main/src/gh/eslint_eslint-9842.txt`, `-10188.txt`, `scratchpad/length-lit/main/src/eslint/src-max-lines-per-function.js`, `scratchpad/length-lit/main/src/eslint/docs-max-lines-per-function.md`

### 2.7 `max-classes-per-file` (ESLint 5.0.0-alpha.3, May 2018). VERIFIED (PR, docs)

- **Citation:** James Garbutt (`43081j`), "New: add max-classes-per-file rule," eslint/eslint PR #10163, merged 11 May 2018 (`c4109b21`); `ignoreExpressions` option added later. Docs at `v10.13.0`.
- **What it says:** "Files containing multiple classes can often result in a less navigable" "and poorly structured codebase. Best practice is to keep each file" "limited to a single responsibility." Default `max: 1`. Garbutt on reporting the whole file: "we can never know which class is the 'main class'". To `aladdin-add`'s "I was wondering if the option max is necessary", Garbutt kept it: "some people may find it useful, some may not."
- **For the post:** a count, not a size: one class per file. It is one of the structural limits Ultracite keeps (section 6).
- **Text:** `scratchpad/length-lit/main/src/gh/eslint_eslint-10163.txt`, `scratchpad/length-lit/main/src/eslint/docs-max-classes-per-file.md`

### 2.8 `max-params`, `max-statements` and `max-depth` today: what they count. VERIFIED (docs and source at `v10.13.0`, installed metadata)

- **`max-params`** (default 3): "Functions that take numerous parameters can be difficult to read and write" "because it requires the memorization of what each parameter is, its type," "and the order they should appear in." Counts formal parameters of every function form; a destructured object parameter counts once. Since ESLint 9.27.0 (16 May 2025, PR #19557) it understands TypeScript syntax, and since 10.0.0 (6 Feb 2026, PR #20236) it has `countThis` (`"except-void"` by default), absorbing what `@typescript-eslint/max-params` existed for (2.13).
- **`max-statements`** (default 10): counts statements in a function body; "Statements in inner functions do not count toward the statement count" "of the outer function" (2013 commit); option `ignoreTopLevelFunctions`.
- **`max-depth`** (default 4): "Many developers consider code difficult to read" "if blocks are nested beyond a certain depth." Counts nested blocks within a function.
- **`max-nested-callbacks`** (default 10) gained `checkConstructorCallCallbacks`. "A common pitfall that is easy to fall into is nesting callbacks,"
- **`eslint:recommended`** (`@eslint/js` 10.0.1 `configs.recommended`) contains none of the `max-*` rules or `complexity`. All are `"suggestion"` rules in `configs.all`.
- **Messages** (what an agent is handed): `{{name}} has too many parameters ({{count}}). Maximum allowed is {{max}}.`, `{{name}} has too many statements ({{count}}). Maximum allowed is {{max}}.`, `Blocks are nested too deeply ({{depth}}). Maximum allowed is {{maxDepth}}.`, `File has too many lines ({{actual}}). Maximum allowed is {{max}}.` ESLint gives no help text beyond the docs URL.
- **For the post:** the rules state what they count and offer no fix; the docs' rationales are "many developers consider" and "some people consider", not findings.
- **Text:** `scratchpad/length-lit/main/src/eslint/docs-max-*.md`, `scratchpad/length-lit/main/src/eslint/src-max-*.js`, `scratchpad/length-lit/main/check/eslint-max-meta-10.13.0.txt`

### 2.9 ESLint deprecated `max-len` and `max-statements-per-line` as formatting rules (8.53.0, Nov 2023). VERIFIED (blog source, installed metadata)

- **Citation:** Nicholas C. Zakas, "Deprecation of formatting rules," ESLint blog, 26 Oct 2023 (`src/content/blog/2023-10-26-deprecating-formatting-rules.md` in eslint/eslint.org at `f7761c26`); ESLint 8.53.0, 3 Nov 2023 (commit `528e1c00`, PR #17696). https://eslint.org/blog/2023/10/deprecating-formatting-rules/
- **What it says:** "Formatting rules are those rules that simply enforce code conventions" around spacing and the like; the list of 68 includes `max-len` and `max-statements-per-line`, but not `max-lines`, `max-lines-per-function`, `max-params`, `max-statements` or `max-depth`. On history: "What we didn't know at the time was that JSHint had the right idea," The advice: "We recommend using a source code formatter instead of ESLint for formatting your code." (Prettier or dprint), or `@stylistic`. The rules "will not be removed until at least ESLint v10.0.0 (if not later)."
- **Now:** ESLint 10.13.0's metadata marks both `deprecatedSince: "8.53.0"`, `availableUntil: "11.0.0"`, replaced by ESLint Stylistic. `max-statements-per-line` (2.5.0, Mar 2016, #5424) defaulted to 1.
- **For the post:** ESLint itself drew the line between line length (formatting) and function size (not formatting). Whether function length in lines is really independent of formatting is a measurement question (the corpus harness's formatter run).
- **Text:** `scratchpad/length-lit/main/src/eslint/blog-2023-10-26-deprecating-formatting-rules.md`, `scratchpad/length-lit/main/src/eslint/docs-max-len.md`

### 2.10 `@stylistic/max-len` keeps 80, and eslint-config-prettier calls it a rule that "requires special attention". VERIFIED (docs at `v5.10.0`; eslint-config-prettier 10.1.8 README)

- **Citation:** ESLint Stylistic, `packages/eslint-plugin/rules/max-len/README.md` at tag `v5.10.0` (`efbb1bc0`, 6 Mar 2026); eslint-config-prettier 10.1.8 README (installed package).
- **What `@stylistic` says:** "many coders have developed a convention to limit lines of code" "to X number of characters (traditionally 80 characters)." Options `code` (80), `tabWidth` (4), `comments`, `ignorePattern`, `ignoreUrls`, `ignoreStrings` and others.
- **What eslint-config-prettier says:** it turns `max-len` off (also `@stylistic/max-len`, `@stylistic/js/max-len` and `vue/max-len`). "Usually, Prettier takes care of following a maximum line length automatically." Prettier can't help "such as for long strings, regular expressions and comments." "Keep in mind that you might have to refactor code slightly" if the two disagree.
- **For the post:** with a formatter in place, a line-length rule only catches what the formatter can't wrap: strings, regexes, URLs and comments.
- **Text:** `scratchpad/length-lit/main/src/stylistic/max-len-README.md`, `scratchpad/length-lit/main/src/prettier/eslint-config-prettier-README.md`

### 2.11 Defaults and their origins, ESLint. Summary

| Rule | Added | Default | Where the number came from |
| --- | --- | --- | --- |
| `max-params` | Jul 2013 | 3 | Volodin's proposal; no reason given (2.3) |
| `max-statements` | Jul 2013 | 10 | Myers's port of JSHint, which had no default (2.3) |
| `max-depth` | Aug 2013 | 4 | Same (2.3) |
| `max-len` | Aug 2013 | 80 | Convention; deprecated 2023 (2.3, 2.9) |
| `max-nested-callbacks` | Dec 2013 (default 2015) | 10 | Zakas: "Double digits are scary" (2.4) |
| `max-statements-per-line` | Mar 2016 | 1 | Deprecated 2023 (2.9) |
| `max-lines` | Jun 2016 | 300 | "No reason", then a blog post (2.5) |
| `max-classes-per-file` | May 2018 | 1 | One class per file (2.7) |
| `max-lines-per-function` | Jun 2018 | 50 | A commenter's suggestion, "very subjective" (2.6) |

### 2.12 typescript-eslint's `max-params` (Oct 2023), now redundant with ESLint's. VERIFIED (PR, installed package)

- **Citation:** StyleShit, "feat(eslint-plugin): [max-params] don't count `this: void` parameter," typescript-eslint PR #7696, merged 17 Oct 2023 (closes #7538). Installed @typescript-eslint/eslint-plugin 8.72.0.
- **What it says:** an extension rule ("extendsBaseRule": true) whose only addition is `countVoidThis`; docs: "so they won't be counted as a parameter." Defaults `{ max: 3, countVoidThis: false }`. ESLint core added TypeScript support and `countThis` itself in 2025–2026 (2.8).
- **For the post:** context only; the TypeScript `this` parameter is the one place the two counts differ.
- **Text:** `scratchpad/length-lit/main/src/gh/typescript-eslint_typescript-eslint-7696.txt`

### 2.13 Oxlint's ports (2024–2025): ESLint's defaults, help text that says 'split', and no line-length rule. VERIFIED (source at `oxlint_v1.89.0`, PRs, `oxlint --rules`); my check (local run)

- **Citation:** oxc-project/oxc, `crates/oxc_linter/src/rules/{eslint,import,react,vue}/max_*.rs` at tag `oxlint_v1.89.0` (`07ed78f4`). First commits: `max-lines` (#2739, Andi Pabst, 17 Mar 2024), `max-params` (#2749, 19 Mar 2024), `max-classes-per-file` (#3241, Jelle van der Waa, 13 May 2024), `import/max-dependencies` (#3814, 25 Jun 2024), `max-nested-callbacks` (#9172), `max-lines-per-function` (#9161) and `max-depth` (#9173) (ikkz, 18–20 Feb 2025), `vue/max-props` (#14039, 25 Sep 2025), `max-statements` (#15804, Pascal Chorus, 21 Dec 2025, Oxlint 1.35.0), `react/jsx-max-depth` (#17279, 23 Dec 2025, 1.36.0).
- **Defaults:** the same as ESLint (`max-params` 3, `max-statements` 10, `max-depth` 4, `max-lines` 300, `max-lines-per-function` 50, `max-nested-callbacks` 10, `max-classes-per-file` 1). Categories in 1.89.0: `max-params` and `max-statements` are `style`; the others `pedantic`; none is on by default.
- **Help text** (the extra line Oxlint gives an agent): `max-lines-per-function` and `max-statements`: "Consider splitting it into smaller functions." `max-depth`: "Consider refactoring your code." `max-nested-callbacks`: "Reduce nesting with promises or refactoring your code." `max-params`: "This rule enforces a maximum number of parameters allowed in function definitions." `max-classes-per-file`: "Reduce the number of classes in this file".
- **A docs slip:** the `max-depth` docs label their examples as using the default `max` of 3; the code's `DEFAULT_MAX_DEPTH` is 4, and my run of Oxlint 1.89.0 with no options reported a five-deep block ("Blocks are nested too deeply (5). Maximum allowed is 4.") and not a four-deep one, as ESLint does (`scratchpad/length-lit/main/check/depth/`).
- **No `max-len` or `max-statements-per-line`:** Oxc's ESLint-core tracking issue (#479) lists each deprecated formatting rule as "Deprecated stylistic rule, can be used via the stylistic eslint plugin" "as a JS Plugin if necessary."
- **For the post:** Oxlint copied ESLint's numbers unchanged, and its help text tells the reader to split, which is the move an agent will make.
- **Text:** `scratchpad/length-lit/main/src/oxc/*.rs`, `scratchpad/length-lit/main/check/oxlint-rules-1.89.0.json`, `scratchpad/length-lit/main/src/gh/oxc-479-body.md`

### 2.14 Biome's versions (2025–2026): different defaults, a different count, and rules its maintainers doubted. VERIFIED (source at `@biomejs/biome@2.6.3`, `biome explain`, PRs and issues)

- **Citation:** biomejs/biome, `crates/biome_js_analyze/src/lint/{complexity,style}/*.rs` at tag `@biomejs/biome@2.6.3` (`c5c3383d`); `biome explain` output from the installed 2.6.3. PRs: #6166 (`noExcessiveLinesPerFunction`, mehm8128, merged 24 Jun 2025), #7124 (`useMaxParams`, Jayllyz, closing issue #2916), #8639 (`noExcessiveLinesPerFile`, Dec 2025–Jan 2026), #8753 (`noExcessiveClassesPerFile`), #10188 (`noExcessiveNestedCallbacks`, Carson McManus, May 2026).
- **`noExcessiveLinesPerFunction`** (since 2.0.0, promoted from nursery in Aug 2025): default `maxLines: 50`; "Remember that this rule only counts the lines of code in the function body," "not the entire function declaration." Options `skipBlankLines` and `skipIifes`; no `skipComments`. Its source is marked `inspired()`, not `same()`, because, as the author put it, "this rule checks only the code of function **body**" (reviewer: "Since it doesn't match that rule exactly, yeah."). Note: "Consider refactoring this function to split it into smaller functions."
- **`useMaxParams`** (since 2.2.0, promoted for 2.4, Feb 2026): default **4**, though its sources are marked `same()` for ESLint's `max-params` (default 3) and Clippy's `too_many_arguments` (default 7). The issue (#2916, May 2024): "For Biome I would like it to be 4 as a middle ground," A Biome maintainer, Victorien Elvinger (`Conaclos`): "Do we really need this rule?" "Seems pretty useless to me." Elvinger suggested instead a rule that "reports function calls that look ambiguous" "(when two literal values of the same type are passed)", which is Rice et al.'s argument-selection idea (4.55). Notes: "Functions with many parameters are hard to read and maintain." "Consider using an options object, splitting into smaller functions, or grouping related parameters."
- **`noExcessiveNestedCallbacks`** (since 2.4.14, promoted in Oct 2026): default **5**. The PR: "Eslint's default for the maximum is 10. I think that is too high," "so I chose to deviate and make our default 5 instead." Notes: "Extract some callbacks into named functions to reduce nesting."
- **`noExcessiveLinesPerFile`** (300) and **`noExcessiveClassesPerFile`** (1), both since 2.3.12, `style` group: "Consider splitting this file into smaller files." / "Extract the excessive classes into a separate file."
- **None is recommended.** Biome has no line-length lint rule; `lineWidth` is a formatter option.
- **For the post:** the same-named limit is a different measurement in Biome (body lines, comments always counted) with different numbers (4 parameters, 5 callbacks). A limit only means something next to the tool that counts it.
- **Text:** `scratchpad/length-lit/main/src/biome/*.rs`, `scratchpad/length-lit/main/src/biome/explain-*.txt`, `scratchpad/length-lit/main/src/gh/biomejs_biome-{6166,7124,2916,10188}.txt`

### 2.15 SonarJS: 200 lines, 1,000 lines, 7 parameters, and an exemption for React components. VERIFIED (installed eslint-plugin-sonarjs 4.2.2, SonarJS source at `729dc4fc`, rule metadata); rationale text from Sonar's Java rule descriptions; Vendor (Sonar)

- **Citation:** eslint-plugin-sonarjs 4.2.2 (`cjs/S138`, `S104`, `S1479`, `S4622`, `S134`, `S1067`, `docs/`); SonarSource/SonarJS `master` at `729dc4fc` (`packages/analysis/src/jsts/rules/S107/`, `sonar-plugin/javascript-checks/src/main/resources/.../S*.json`); rule descriptions from SonarSource/sonar-java at `a1054703` (`sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S*.html`), because the JavaScript descriptions are generated at build time and rules.sonarsource.com returned 404.
- **Defaults:** `max-lines-per-function` (S138) 200; `max-lines` (S104) 1000; S107 (parameters) 7, which the plugin doesn't export as its own rule (it is a decorated `eslint/max-params`); `max-switch-cases` (S1479) 30; `max-union-size` (S4622) 3; `nested-control-flow` (S134) 3; `expression-complexity` (S1067) 3.
- **What S138 counts:** non-blank lines that aren't comment-only (`getLocsNumber`); it skips IIFEs and skips any function that "startsWithCapital" and "returnsJSX", that is, React components. Its comment says it is "Greatly inspired by" ESLint's rule. Message: "This function has {{lineCount}} lines, which is greater than the {{threshold}}" "lines authorized. Split it into smaller functions."
- **Sonar's rationale** (Java text of the same keys): S138 "A method that grows too large tends to aggregate too many responsibilities."; S104 "it can accumulate numerous responsibilities and become challenging to understand"; S107 "Methods with a long parameter list are difficult to use" "because maintainers must figure out the role of each parameter"; S1479 "it is usually an attempt to map two sets of data."
- **Which are on by default:** in the rule metadata, only S107 and S1479 are in Sonar's default "Sonar way" profile (and its "Sonar agentic AI" profile); S138, S104, S4622, S134 and S1067 are in neither. The plugin's `recommended` config enables `max-switch-cases` only.
- **`max-union-size` is about inline unions:** it skips unions that are a type alias's whole definition and unions inside utility types, so `type Size = 'sm' | 'md' | 'lg' | 'xl'` passes and the same union written inline in a parameter fails. Message: "Refactor this union type to have less than {{threshold}} elements." (it allows exactly 3).
- **`max-switch-cases`** counts non-empty, non-default cases.
- **For the post:** Sonar, whose business is these metrics, leaves function and file length out of its default profile and exempts React components from its function-length rule, while keeping 7 parameters and 30 cases. Its "agentic AI" profile is described as "reducing noise from maintainability rules and minor hotspots" (2.16).
- **Text:** `scratchpad/length-lit/main/src/sonarjs/`

### 2.16 Sonar's "agentic AI" profile (2026). VERIFIED (docs); Vendor (Sonar)

- **Citation:** Sonar, "Quality profiles for agentic AI," SonarQube Server 2026.5 docs, https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/ai-code-assurance/quality-profiles-for-agentic-ai (read as Markdown, 25 Oct 2026).
- **What it says:** the profile "recalibrates Sonar's rules concentrating on six evidence-backed risk categories" (security, error handling, hallucinated APIs, duplication and structural drift, concurrency, performance), "while reducing noise from maintainability rules and minor hotspots". No evidence is cited on the page. Its rule list (from the rule metadata in 2.15) keeps S107 and S1479 and has no line limits.
- **For the post:** a vendor's agent-oriented profile also drops length limits; its "evidence-backed" claim is unsourced on the page.
- **Text:** `scratchpad/length-lit/main/src/sonarjs/sonar-agentic-profile.md`

### 2.17 The plugin rules: `import/max-dependencies`, `react/jsx-max-depth`, `vue/max-props` and Vue's block limits. VERIFIED (docs at pinned tags, installed source); my check (local run)

- **`import/max-dependencies`** (eslint-plugin-import docs at `main`; import-x 4.17.1): "a module with too many dependencies is a code smell," and "usually indicates the module is doing too much"; default 10, counting each imported module once. Oxlint's port counts `import` statements only, not `require()`.
- **`react/jsx-max-depth`** (eslint-plugin-react 7.37.5): `DEFAULT_DEPTH = 2` in the source; the docs give no rationale. Oxlint's port (1.36.0) also defaults to 2: "Excessively nested JSX makes components harder to read and maintain."
- **`vue/max-props`** (eslint-plugin-vue, since v9.28.0): "in order to aid in maintainability and reduce complexity." **It has no default in ESLint:** the rule compares against `option.maxProps`, which is `undefined` without options, so it never reports. Oxlint's port defaults to `maxProps: 1`. My check (`scratchpad/length-lit/main/check/vue/`): a two-prop SFC through Ultracite's ESLint Vue preset with `"vue/max-props": "error"` gave no report; with `{ maxProps: 1 }`, "Component has too many props (2). Maximum allowed is 1"; Oxlint 1.89.0 with the rule on and no options: "This component has too many props (2). Maximum allowed is 1."
- **`vue/max-template-depth` and `vue/max-lines-per-block`** behave the same way in ESLint: no default, inert without options (same run). `svelte/max-lines-per-block` too (source: `options.script` and friends are read from the options with no fallback).
- **For the post:** in the framework plugins, several "max" rules are opt-in numbers with no default at all, the JSHint model.
- **Text:** `scratchpad/length-lit/main/src/plugins/`, `scratchpad/length-lit/main/check/vue/`

### 2.18 Defaults by tool. Summary (worktree versions, 25 Oct 2026)

| Limit | ESLint | Oxlint | Biome | SonarJS |
| --- | --- | --- | --- | --- |
| Function length | 50 lines, whole function, blanks and comments counted | 50, same | 50 body lines, comments counted | 200 code lines; React components and IIFEs exempt |
| File length | 300 | 300 | 300 | 1,000 |
| Parameters | 3 | 3 | 4 | 7 (S107, in SonarQube) |
| Statements | 10 | 10 | none | none |
| Block depth | 4 | 4 | none | 3 (`nested-control-flow`, control-flow statements only) |
| Nested callbacks | 10 | 10 | 5 | none |
| Classes per file | 1 | 1 | 1 | none |
| Line length | deprecated (80 in `@stylistic`) | none | none (formatter) | none |

### 2.19 Size rules in popular ESLint configs (Oct 2026). VERIFIED (config source at pinned SHAs)

- **Citation:** each file read at the SHA in the table; ESLint's defaults from `lib/rules/*.js` at `v10.13.0` (`4637f9827a1ba137498eaee70957850621082815`): `max-len` 80, `max-lines` 300, `max-lines-per-function` 50, `max-statements` 10, `max-params` 3, `max-depth` 4, `max-nested-callbacks` 10, `max-classes-per-file` 1, `max-statements-per-line` 1, `complexity` 20. `max-len` and `max-statements-per-line` are deprecated since v8.53.0 ("ESLint Stylistic now maintains deprecated stylistic core rules.").

| Config (version, SHA) | max-len | max-lines | max-lines-per-function | max-statements | max-params | max-depth | max-nested-callbacks | max-classes-per-file | max-statements-per-line | complexity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| eslint-config-airbnb-base 15.0.0 (`8ed19247`) | error, 100 (ignores URLs, strings, template literals, regexps; not comments) | off (300) | off (50) | off (10) | off (3) | off (4) | off | **error, 1** | off (1) | off (20) |
| eslint-config-standard 17.1.0 (`3dacfca5`) | not set | not set | not set | not set | not set | not set | not set | not set | not set | not set |
| neostandard 0.14.1 (`2d12a3e6`) | not set | not set | not set | not set | not set | not set | not set | not set | not set | not set |
| eslint-config-xo 7.0.0 (`f9950756`) | warn, 200 (`@stylistic/max-len`; ignores comments, URLs) | warn, 1500 (skip comments) | not set | not set | warn, 4 | warn (4) | warn, 4 | not set | error (1) (`@stylistic/`) | warn (20) |
| eslint-config-google 0.14.0 (`0273839f`, archived) | **error, 80** (tab width 2; ignores URLs, `goog.module`/`require`) | commented `off` | not set | commented `off` | commented `off` | commented `off` | commented `off` | not set | commented `off` | commented `off` |
| eslint-config-love 158.0.0 (`fc9a5b5f`) | not set (deprecated) | **error, 450** (skip blank, comments) | intentionally unused | intentionally unused | **error, 4** (`@typescript-eslint/max-params`) | **error, 5** | **error, 3** | intentionally unused | not set (deprecated) | **error, 10** (modified variant) |
| typescript-eslint 8.72.0 (`a4c2603d`) `recommended` / `strict` / `stylistic` (and `-type-checked`) | n/a | n/a | n/a | n/a | not set | n/a | n/a | n/a | n/a | n/a |
| typescript-eslint 8.72.0 `all` | n/a | n/a | n/a | n/a | **error (3)** (`@typescript-eslint/max-params`; core `off`) | n/a | n/a | n/a | n/a | n/a |
| `@eslint/js` 10.0.1 `recommended` (in eslint `v10.13.0`) | not set | not set | not set | not set | not set | not set | not set | not set | not set | not set |
| eslint-plugin-unicorn 79.0.0 `recommended` (`d078ad9e`) | no equivalent | no equivalent | no equivalent | no equivalent | no equivalent | no equivalent | `unicorn/max-nested-calls` error, 3 (nested call arguments, not callbacks) | no equivalent | no equivalent | `unicorn/try-complexity` exists, off |

- **The reasons given, where there are any:**
  - **Airbnb** (README §19.13): "Avoid having lines of code that are longer than 100 characters (including whitespace)." "Why? This ensures readability and maintainability." No reason is given for the other size rules being off, or for `max-classes-per-file: 1`.
  - **Standard:** Feross Aboukhadijeh on adding a line limit (standard/standard#28, 7 Feb 2015): "I'm -1 on adding this rule." Splitting a long string "doesn't protect you from bugs, or even improve readability." On #1559 (22 Oct 2020): "we're hesitant to add rules which involve 'magic numbers'" so code can comply "without needing to memorize numbers or count how many statements are on a line". On #174 (metrics, 2015), Aboukhadijeh pointed to `standardx` for extra rules.
  - **XO:** Sindre Sorhus removed `max-lines` in 2016 (`8eba832e`): "It was just annoying and never helped me even once." Federico Brigante (`fregante`) brought back permissive limits as warnings in PR #84 (opened 17 Nov 2023, merged 28 Jul 2024) to "enable them as warning to look at the pushback without creating too much trouble." and because "The point of this warning is to push people to split up larger files." Sorhus: "I think 2000 lines is too little."
  - **eslint-config-love** comments each number: complexity 10 "arbitrary choice", `max-depth` 5 "default plus one", `max-lines` 450 "default plus 150", `max-nested-callbacks` 3 "arbitrary value", `max-params` 4 "an arbitrary count". `max-lines-per-function` and `max-statements` are listed as "Covered by `complexity`"; `max-classes-per-file` is filed under "too much" (with `sort-keys`).
  - **Unicorn** (79.0.0): `max-nested-calls` (added in v66.0.0, PR #3183, 13 Jun 2026; default 3): "Deeply nested calls make code hard to read." "Extract intermediate results to named variables instead." `try-complexity` (v65.0.0, PR #3055; off): "This rule counts decision points, not lines or statements."
  - **Google, typescript-eslint, @eslint/js:** no comments explaining the settings.
- **Caveat:** "n/a" means the plugin has no such rule; typescript-eslint's configs don't touch core rules except to swap extension rules. Airbnb's npm 15.0.0 was published from an earlier commit; the rules file at HEAD still reports version 15.0.0. These are configs, not usage data: no download counts were pulled (see sort-keys 1.18 for those).
- **For the post:** none of the widely used configs turns on `max-lines-per-function` or `max-statements`. The line-length rule is the one most set (Airbnb 100, Google 80, XO 200), and it's off in eslint-config-prettier. The maximal configs that do set size limits either call their numbers "arbitrary" (love) or set them high enough to catch only outliers (XO's 1500-line files). Airbnb's one size rule at error is `max-classes-per-file`, which Ultracite also keeps.
- **Text:** `scratchpad/length-lit/C/src/configs/` (airbnb, standard, neostandard, xo, google, love, typescript-eslint, eslint-js, unicorn), `scratchpad/length-lit/C/src/eslint-rules/`

---

### 2.20 What users asked ESLint for: exemptions for JSX, tests, constructors and callbacks, mostly refused (2015–2023). VERIFIED (issues, read-only `gh api`); ANECDOTAL as evidence of how common this is

- **Method:** `gh api search/issues` on eslint/eslint for each rule name in the title (25 Oct 2026, sorted by comments; results in `scratchpad/length-lit/main/src/complaints/search.txt`), then every request to relax a size rule opened and saved. These are the requests that reached the tracker, not a survey.
- **JSX (#12236, Sept 2019, `max-lines-per-function`):** asked for `skipJSX`. "For an react component, a `render` function often containing jsx more than 120 lines," "and it's reasonably". "It's the blocking issue for our project to adapt this rule". Kevin Partington's answer: "This sort of thing is exactly what ESLint disable comments are for.", then per-directory overrides; the reporter accepted the override.
- **Tests (#15981 and #16000, June 2022):** `describe` callbacks count every nested `it`. Zakas: "core rules cannot know about the test runner being used,"; on the follow-up: "we actually aren't making any further updates to rules that enforce stylistic preferences."
- **Nested functions (#17741, Nov 2023; PR #11543, 2019):** an option to stop counting inner functions toward the outer one. Zakas: "this rule is already behaving the way it was intended."
- **Imports (#12875, 2020, `max-lines`):** champion found, then closed because "it's about a stylistic rule", under the 2020 rules policy.
- **`max-params` exemptions:** constructors (#7392, 2016: "a core responsibility of the `constructor` is to receive and set the obligatory dependencies."; #13090, 2020), callbacks whose signature is fixed by the caller (#17727, 2023, an SAP UI5 `define` factory; answer: disable the rule there), and `reduce`-style callbacks of native methods (#15129, 2021: "You can use a disable comment"). An earlier RequireJS `define()` request (#798, 2014).
- **`max-statements` (#4309, 2015):** UMD/IIFE wrappers made the whole file one function: "it's inconvenient to have to disable `max-statements`" each time. This one was accepted (`ignoreTopLevelFunctions`, PR #4733, merged 21 Dec 2015).
- **The policy behind the refusals:** ESLint's _Changes to rules policies_ (22 May 2020): "**Stylistic rules are frozen** - we won't be adding any more options" "to stylistic rules." Maintainers applied it to `max-lines`, `max-lines-per-function` and `max-params`. ESLint 10.13.0's metadata no longer marks them frozen (`rules_meta.json` lists 53 frozen rules, none of the `max-*` ones), and options were added again in 2025–2026 (`countThis`, `checkConstructorCallCallbacks`).
- **For the post:** the recurring requests are the cases where the limit meets code people consider fine: JSX markup, test suites, constructors, callbacks with a fixed signature. The usual answer was a disable comment or a per-directory number, which is the "rationalization" Standard Ruby's maintainer describes (3.6).
- **Text:** `scratchpad/length-lit/main/src/complaints/eslint_eslint-{12236,15981,16000,17741,11543,12875,7392,13090,17727,15129,4309}.txt`, `scratchpad/length-lit/main/src/eslint/blog-2020-05-22-changes-to-rules-policies.md`, `scratchpad/length-lit/main/src/eslint/rules_meta.json`

### 2.21 RuboCop users on `Metrics/MethodLength`: "frustrated by having to disable" it (2020), and a request that "has been constantly recurring for years". VERIFIED (issues); ANECDOTAL

- **Citation:** rubocop/rubocop #7668 (Ashley Baldwin-Hunter, 24 Jan 2020; 18 reactions), #7724 (Josua Schmid, 18 Feb 2020); both closed by PR #8159 (`CountAsOne`, 2020). Cross-reference 3.5 (RuboCop's 2026 corpus and the decision to turn the Metrics cops off).
- **What it says:** #7668: "I and some dev friends have been frustrated" "by having to disable the MethodLength check" "on methods that are too long because they include a multiline hash or array." "we find using multiline hashes increases readability." Keeyan Nejad: the same "should apply to heredoc strings". Marc-André Lafortune (maintainer): "it's not clear what `MethodLength` really adds" "if one has the complexity metrics enabled." #7724: the cop rewards cramming a list onto fewer lines; Bozhidar Batsov: "it seems this topic has been constantly recurring for years".
- **For the post:** the formatter problem in another ecosystem: a method made longer by putting one literal per line, which is what a formatter does, trips the limit. RuboCop's fix was to count a literal as one line.
- **Text:** `scratchpad/length-lit/main/src/complaints/rubocop_rubocop-7668.txt`, `rubocop_rubocop-7724.txt`

### 2.22 Biome, Oxlint and typescript-eslint: few complaints, because few people run these rules. Negative finding, with one proposal

- **Searched** (25 Oct 2026, `scratchpad/length-lit/main/src/complaints/search2.txt`, `search3.txt`): biomejs/biome for `noExcessiveLinesPerFunction`, `useMaxParams`, `noExcessiveCognitiveComplexity`, `noExcessiveNestedCallbacks`; oxc-project/oxc for `max-lines-per-function`, `max-params`, `max-statements`, `max-depth`; typescript-eslint for `max-params`. Hits were implementation PRs, schema fixes and one complaint about where `useMaxParams` draws its error (Biome #7604, Sept 2025). None asks to raise or remove a default. All these rules are off by default in their tools (2.13, 2.14), so the absence says little.
- **A proposal that aims at the bug instead (typescript-eslint #8608, Dan Vanderkam, Mar 2024):** "Warn on functions with consecutive parameters of the same type". A commenter wanted to fail `renderTemplate(type: string, version: number, content: string)` because swapping `type` and `content` is plausible. Rejected in Aug 2024 for lack of interest: "this request has received just 5 community reactions". Brad Zacher: "This is also something that likely is covered mostly by" editor inlay hints. Compare Biome's maintainer making the same suggestion in 2024 (2.14) and Rice et al.'s argument-selection work (4.55).
- **Text:** `scratchpad/length-lit/main/src/complaints/typescript-eslint_typescript-eslint-8608.txt`

---

## 3. Other ecosystems and formatters

How other languages' linters handle the same limits, and what formatters say about line width. Items 3.1–3.4 are Python (Pylint, Google's pylintrc, Ruff, and two practitioner claims about AI coding); 3.5–3.6 Ruby (RuboCop's 2026 decision, the style guide and Standard); 3.7–3.8 Java (Checkstyle, PMD); 3.9–3.10 Go (funlen, golangci-lint); 3.11 Rust (Clippy); 3.12–3.18 line length (PEP 8 and GNU, Prettier, Black, Go, Google's column limits, other formatters, and where 80 columns came from). Defaults are read from each tool's source or docs at the pinned version. Sources are in `scratchpad/length-lit/C/`.

### 3.1 Pylint: defaults for the size checks (v4.1.3, 11 Oct 2026). VERIFIED

- **Citation:** pylint-dev/pylint at tag `v4.1.3` (`e75de10c69103381c875601f638d4b977ff0fcaf`): `pylint/checkers/design_analysis.py`, `pylint/checkers/format.py`, `doc/data/messages/t/too-many-lines/details.rst`, `doc/whatsnew/3/3.3/index.rst`.
- **What it says:**
  - Defaults: `max-args` 5 (R0913 `too-many-arguments`), `max-positional-arguments` 5 (R0917, added in 3.3, #9099), `max-locals` 15 (R0914), `max-returns` 6 (R0911), `max-branches` 12 (R0912), `max-statements` 50 (R0915), `max-attributes` 7, `max-public-methods` 20, `max-bool-expr` 5, `max-parents` 7; `max-line-length` 100 (C0301 `line-too-long`), `max-module-lines` 1000 (C0302 `too-many-lines`). All on by default (Pylint's default checkers).
  - R0915's message: "should then split it in smaller functions / methods."
  - Pylint's own doc on `too-many-lines`: "This measure is a proxy for higher cyclomatic complexity" and with complexity "you can't make the code less readable by making a very complex one liner".
- **Caveat:** Pylint's numbers have no stated source.
- **For the post:** Pylint's documentation admits the gaming problem directly: a line count can be met by packing logic into one line, which a complexity metric would catch.
- **Text:** `scratchpad/length-lit/C/src/pylint/design_analysis.py`, `scratchpad/length-lit/C/src/pylint/format.py`, `scratchpad/length-lit/C/src/pylint/pylint-too-many-lines-details.rst`, `scratchpad/length-lit/C/src/pylint/whatsnew-3.3.rst`

### 3.2 Google's published pylintrc turns off Pylint's whole refactoring category. VERIFIED; Vendor (Google)

- **Citation:** google/styleguide `pylintrc` at `c775c0c2f73c110613243520c001577cdbc0034d`. https://github.com/google/styleguide/blob/gh-pages/pylintrc
- **What it says:** `disable=R,` (the first entry; R covers R0913–R0917 and the other design checks), `max-module-lines=99999` (comment: "Maximum number of lines in a module"), and `max-line-length=80`.
- **Caveat:** this is the config Google publishes alongside its Python guide; whether internal tooling matches isn't stated.
- **For the post:** Google's public Python lint config keeps a line-width check and switches off every count-based design check, while its style guide says "about 40 lines, think about" (1.8).
- **Text:** `scratchpad/length-lit/C/src/google-styleguide/pylintrc`

### 3.3 Ruff: the size rules are "Pedantic", none is in the 413-rule default set, and `too-many-lines` was refused (0.17.2, 22 Oct 2026). VERIFIED; Vendor (Astral)

- **Citation:** astral-sh/ruff at `0.17.2` (`30516b42ab972ffa2569e5efcfee81135da466d3`): `crates/ruff_linter/src/rules/pylint/settings.rs`, `codes.rs`, `settings/mod.rs` (`DEFAULT_SELECTORS`), rule files `too_many_*.rs`, `line_too_long.rs`, `function_is_too_complex.rs`, `docs/formatter.md`, `changelogs/0.16.x.md`; blog "Ruff v0.16.0" (https://astral.sh/blog/ruff-v0.16.0); PRs #10262 and #21853; tracking issue #970.
- **What it says:**
  - Defaults match Pylint: `max-args` 5, `max-positional-args` 5, `max-returns` 6, `max-branches` 12, `max-statements` 50, `max-locals` 15, `max-nested-blocks` 5, `max-public-methods` 20, `max-bool-expr` 5.
  - Categories: PLR0913, PLR0917, PLR0915, PLR0912, PLR0911 are `Pedantic`, defined as "Rules that are highly opinionated or prone to false positives"; PLR0914 (`too-many-locals`) and PLR1702 (`too-many-nested-blocks`) are preview-only, also `Pedantic`; E501 is `Formatting` ("Rules that flag formatting issues that do not affect semantics"); C901 is `Restriction`.
  - Default set: 0.16.0 (23 Jul 2026) made "Ruff now enables a much larger set of rules by default" ("413, up from 59"). None of PLR0911–PLR0917, PLR1702, C901 or E501 is in `DEFAULT_SELECTORS` at 0.17.2. PLR0917 was stabilised in 0.16.0 but left out of the defaults.
  - E501: "Overlong lines can hurt readability." It uses a limit "of 88 characters for compatibility with Black and the Ruff formatter," and ignores lines that are a single 'word', end in a URL, or end in a pragma. The formatter docs: "the formatter only makes a best-effort attempt to wrap lines at the configured" length, so "formatted code _may_ exceed the line length,".
  - PLR0913's doc: "Functions with many arguments are harder to understand, maintain, and call." (no source).
  - `too-many-lines` (C0302) refused: Micha Reiser (22 Mar 2024, #10262) said "the rule is incompatible with the formatter because the formatter can introduce new violations" "by splitting lines across multiple lines, making the module exceed the configured max lines." #970 marks it "not compatible with the formatter". A second PR (#21853) was closed 27 Mar 2026: "the incompatibility with the formatter makes it very unlikely to be accepted".
- **Caveat:** Ruff's categories are its maintainers' judgement. The #21853 thread includes a counter-argument (devjerry0: "The point is catching 500+ line monsters, not precise line counts.") and an AI-coding request (3.4).
- **For the post:** the fastest-growing Python linter tripled its defaults to 413 rules and still left every size rule out, labelled them "highly opinionated", and refused a file-length rule because the formatter changes the count. That's the measures-the-formatter argument from a tool vendor, in writing.
- **Text:** `scratchpad/length-lit/C/src/ruff/` (all files), `scratchpad/length-lit/C/text/astral-blog-ruff-v0.16.0.txt`

### 3.4 Two practitioner claims that file-length caps help AI coding (2025–2026). ANECDOTAL

- **Citation:** (a) Ilias Ism (`Illyism`), GitHub gist "ESLint 200-Line Max File Size Rule for Better AI Coding", created 15 Mar 2025, https://gist.github.com/Illyism/29981ba721a544cbe49044e6f4bb6869 (version `504438ce`). (b) `guyskk`, comment on astral-sh/ruff#21853, 8 Mar 2026.
- **What it says:** (a) "My game-changing ESLint rule that makes AI coding 10x better:" it "Enforces 200-line max file size", skips blank lines, comments and imports, and "Works perfectly with Cursor AI's 'Fix in Chat'". Its message to the agent: "Please split this file into smaller, more focused modules with single responsibilities." (b) "The `max-module-lines` rule is very useful for **AI coding**," "lines limit is the simple and effective rule." The commenter tried complexity tools (radon, xenon) and preferred line limits.
- **Caveat:** no measurement in either. The gist re-implements ESLint's `max-lines` (which already has `skipBlankLines` and `skipComments`). The lint message is an instruction aimed at an agent; I treated it as data.
- **For the post:** evidence that people are using size caps to steer agents, and of the reasoning ("simple and effective"). It's the hypothesis the post's agent experiment should test, not support for it.
- **Text:** `scratchpad/length-lit/C/src/gist-illyism-29981ba7.json`, `scratchpad/length-lit/C/src/ruff/issue-21853-comments.json`

### 3.5 RuboCop: the Metrics cops, their defaults, and the 2026 decision to switch them off. VERIFIED (source, commits, issues, maintainer's blog); data ANECDOTAL (maintainer's own survey and corpus)

- **Citation:** rubocop/rubocop `config/default.yml` at `v1.92.1` (`aa228eb03094d66aca26664839ca14b10d76f702`, 22 Oct 2026); commit `d2ac4ac8ef0ac4907f35f3c48de22653a9da2b9e`, "[#15363] Disable the `Metrics` cops under `Preview`" (Bozhidar Batsov, 9 Sep 2026); issue #15363, "Tuning RuboCop's defaults from real-world usage data (RuboCop 2 discussion)" (Batsov, 28 Jun 2026, open); PR #7952 (Koichi ITO, `koic`, 11 May 2020); Batsov, "RuboCop Defaults Survey Results," metaredux.com, 26 May 2020; issue #494 (2013–2018).
- **Defaults (1.92.1):** `Metrics/MethodLength` Max 10 (comments not counted), `ClassLength` 100, `ModuleLength` 100, `ParameterLists` Max 5 (keyword args counted; `MaxOptionalParameters` 3), `AbcSize` 17, `BlockLength` 25, `BlockNesting` 3, `CyclomaticComplexity` 7, `PerceivedComplexity` 8, `CollectionLiteralLength` 250 (pending); `Layout/LineLength` 120.
- **The 2026 change:** every enabled Metrics cop now carries `Preview: Enabled: false` and the comment "Expected to be disabled by default in the next major release." Per-cop notes: `MethodLength` "Rejected outright by a third of projects;" / "the ones that keep it disagree on the limit."; `ParameterLists` "Rejected by a fifth of projects, more than raise the limit."; `BlockNesting` "Rejected by a fifth of projects; almost nobody adjusts the limit instead."; `ClassLength` "those that keep it set the limit three times higher."; `AbcSize` "those that keep it split evenly between 20 and 30." The commit: "Over the 211 configs that inherit neither Standard nor omakase," "the projects that reject a `Metrics` cop outright outnumber" / "the ones that raise its limit by roughly two to one, on every cop." "A higher default would still be the wrong number" / "for most of the people who set one."
- **The data (#15363):** "A fork-free corpus of the **500 most-starred Ruby repos** on GitHub." "**233** of them ship a `.rubocop.yml`". Share disabling: `AbcSize` 43.3%, `ClassLength` 41.6%, `CyclomaticComplexity` 39.9%, `MethodLength` 39.9%, `ModuleLength` 38.2%, `PerceivedComplexity` and `BlockLength` 36.9%, `ParameterLists` 28.3%, `BlockNesting` 27.5%, `Layout/LineLength` 24.5%. Median overrides: `MethodLength` 10 → 22 (n=49), `ClassLength` 100 → 300, `ParameterLists` 5 → 6; `LineLength` (120) and `BlockNesting` (3) medians equal the defaults. Batsov first proposed raising limits ("turning the cop off is just easier than arguing with it."), then the same day: "probably the entire Metrics department should be disabled by default." Batsov notes "I've generated the summary of the report with Claude." Caveats listed include a "Silent majority." bias; "treat this as evidence, not proof."
- **Line length history:** RuboCop's default went from 80 to 120 in 0.84 (PR #7952, "based on #7833 survey"). The 2020 survey (722 respondents): line length "120 characters - 48%"; Metrics cops "Somewhat useful - 43%", "Very useful - 29%", "Useless - 19%"; "The value of the metrics cops is questionable." and "Turns out that 40% of the RuboCop users didn't know that." (that a department can be disabled).
- **Where 10 came from (#494, 2014):** RuboCop core member Jonas Arvidsson (`jonas054`): the style guide says 10 LOC, "that's why RuboCop has 10 as the _default_ limit." Arvidsson added: "Some studies indicate that long methods are actually less error-prone than short ones," (no citation). `AbcSize` was added in response (#1370). Ted Johansson (`Drenmi`, 2017): "RuboCop can't tell if something is readable and understandable" but "it can provide some proxy measures, albeit primitive."
- **Caveat:** the corpus is popular repos (libraries skew), counts only explicit settings, and the summary was written with Claude. `BlockNesting` is the one cop whose limit people accept but a fifth still disable.
- **For the post:** the strongest recent primary for the post. The most-used Ruby linter measured what projects do with its size limits, found they mostly turn them off, and is turning them off by default. Nesting depth is the exception: its limit is accepted.
- **Text:** `scratchpad/length-lit/C/src/rubocop/default.yml`, `scratchpad/length-lit/C/src/rubocop/commit-d2ac4ac8.json`, `scratchpad/length-lit/C/src/rubocop/issue-15363.json`, `scratchpad/length-lit/C/src/rubocop/issue-15363-comments.json`, `scratchpad/length-lit/C/src/rubocop/pr-7952.json`, `scratchpad/length-lit/C/src/rubocop/issue-494-comments.json`, `scratchpad/length-lit/C/text/metaredux-2020-05-26-survey-results.txt`

### 3.6 The Ruby Style Guide and Standard Ruby. VERIFIED; Standard's reason ANECDOTAL (maintainer comment)

- **Citation:** rubocop/ruby-style-guide `README.adoc` at `357eb786d6b7c2dbaaf57820bc997c03adb75c19` (20 Jul 2026); standardrb/standard `config/base.yml` at `v1.31.0` (`81f006f029fc8f84473b4d08726af309eec107d9`); standardrb/standard#339 (11 Oct 2021).
- **Style guide:** "Avoid methods longer than 10 LOC (lines of code)." "Ideally, most methods will be shorter than 5 LOC." "Avoid parameter lists longer than three or four parameters." "Avoid more than three levels of block nesting." "Limit lines to 80 characters." It justifies 80 with "numerous studies have shown that humans read much faster vertically" (no citation), then allows "it is okay to increase the line length limit up to 100 characters," and "Please, restrain the urge to go beyond 120 characters."
- **Standard Ruby:** every Metrics cop and `Layout/LineLength` is `Enabled: false`. Justin Searls (#339): "Our policy is we do not include any of the metric cops," "because no matter what number you pick, someone will find a rationalization" "for why their preferred method/line/class length is valid," and "if you pick a comically high limit then it doesn't really communicate anything meaningful".
- **Caveat:** the style guide's line-length rationale paragraphs are a near-verbatim copy of PEP 8's (3.12), plus the uncited "studies" sentence. The Standard reason lives in an issue comment, not its docs.
- **For the post:** the guide that set RuboCop's 10-line default gives no source for 10, and the zero-config Ruby preset (the closest analogue to Ultracite) ships with all size cops off for a stated reason.
- **Text:** `scratchpad/length-lit/C/src/ruby-style-guide/README.adoc`, `scratchpad/length-lit/C/src/standardrb/base.yml`, `scratchpad/length-lit/C/src/standardrb/issue-339-comments.json`

### 3.7 Checkstyle: defaults, and nothing on unless you configure it (14.3.0). VERIFIED

- **Citation:** checkstyle/checkstyle at `checkstyle-14.3.0` (`bc58fc62478af80aa8490ffb6aea212988c5e2a2`): `checks/sizes/{MethodLength,ParameterNumber,FileLength,LineLength,ExecutableStatementCount,AnonInnerLength}Check.java`, `checks/coding/Nested{If,For}DepthCheck.java`, `src/main/resources/{sun,google}_checks.xml`.
- **What it says:** `MethodLength` max 150 (counts empty lines by default), `ParameterNumber` max 7, `FileLength` max 2000, `LineLength` max 80, `ExecutableStatementCount` 30, `AnonInnerLength` 20, `NestedIfDepth` 1, `NestedForDepth` 1. MethodLength's rationale: "If a method becomes very long it is hard to understand." so "long methods should usually be refactored into several" focused methods. The bundled `sun_checks.xml` turns on `FileLength`, `LineLength`, `MethodLength` and `ParameterNumber` at these defaults; `google_checks.xml` sets only `LineLength` (100) and none of the size checks.
- **Caveat:** Checkstyle has no default config; a check runs only if a config lists it.
- **For the post:** the Java defaults (150 lines, 7 parameters, 2000-line files) are far looser than ESLint's (50, 3, 300), and the Google config that ships with Checkstyle uses none of them.
- **Text:** `scratchpad/length-lit/C/src/checkstyle/`

### 3.8 PMD deleted its line-count method and class length rules in 7.0 (2019–2024). VERIFIED

- **Citation:** pmd/pmd issue #2127 (Clément Fournier, `oowekyala`, 24 Nov 2019), PR #4262 (Andreas Dangel, Dec 2022); PMD 7.0.0 release notes (22 Mar 2024); `pmd-java/.../category/java/design.xml` and `NcssCountRule.java`, `ExcessiveParameterListRule.java` at `pmd_releases/7.28.0` (`79726f0e8f46c1a9954a3f9880f6d15c91bf6387`).
- **What it says:** #2127's reasons: "LoC is noisy, NCSS is a more solid metric" ("results are code-style independent, comment-insensitive"); "LoC is easily circumvented by bad code style" ("eg. stuffing several assignments into one, concatenating code lines"); "Enforcing length limits with LoC is not very meaningful," / "could even be called a bad practice". 7.0.0: `ExcessiveMethodLength` and `ExcessiveClassLength` "(deleted)", use `NcssCount`. `NcssCount` defaults: 60 statements per method, 1500 per class; "NCSS ignores comments, blank lines, and only counts actual statements." `ExcessiveParameterList` threshold 10; its description claims long parameter lists increase "the cognitive load for maintainers and leads to higher defect rates" (no citation).
- **Caveat:** PMD still has statement-count limits (NCSS); it dropped only physical-line counting.
- **For the post:** a mature analyser removed line-based length rules because the count depends on formatting and is easy to game, and kept statement counts. That's the same line Ultracite could draw between `max-lines-per-function` and `max-statements`, if it kept either.
- **Text:** `scratchpad/length-lit/C/src/pmd/issue-2127.json`, `scratchpad/length-lit/C/src/pmd/release-7.0.0.md`, `scratchpad/length-lit/C/src/pmd/java-design.xml`, `scratchpad/length-lit/C/src/pmd/NcssCountRule.java`, `scratchpad/length-lit/C/src/pmd/ExcessiveParameterListRule.java`

### 3.9 funlen (Go): "fit a function within one screen". ANECDOTAL (tool README; author's own rationale)

- **Citation:** ultraware/funlen README at `955cef7e3e8d12c3f17141072ad57f7fec5a447a`. https://github.com/ultraware/funlen
- **What it says:** "The default limits are 60 lines and 40 statements." "The intent for the funlen linter is to fit a function within one screen." The statement count "gives a clearer idea of how much is actually being done in a function." "The default values are used internally," i.e. at the company that wrote it.
- **Caveat:** the numbers are one company's; no data. See 3.6 for how golangci-lint ships it.
- **For the post:** a second primary for the screen heuristic, and a tool author who thinks statements beat lines.
- **Text:** `scratchpad/length-lit/C/src/golangci/funlen-README.md`

### 3.10 golangci-lint: `funlen` and `lll` exist, off by default (v2.15.0). VERIFIED

- **Citation:** golangci/golangci-lint at `v2.15.0` (`25c5369a93aacb8cccea0d46e1569ca4a194564d`): `.golangci.reference.yml`, `pkg/lint/lintersdb/builder_linter.go`.
- **What it says:** the default set (`standard`) is five linters: `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`. `funlen` (since v1.18.0): lines "Default: 60", statements "Default: 40", `ignore-comments` "Default: true". `lll`: `line-length` "Default: 120." (tabs count as 1). Also optional: `nestif`, `gocognit`, `cyclop`, `maintidx`.
- **Caveat:** I found no stated reason why `funlen` isn't in the default set; the default set is simply small. The funlen README (3.9) says `ignore-comments` defaults to false, golangci-lint's reference says true.
- **For the post:** Go's standard toolchain (gofmt, vet) has no size limit at all, and the main meta-linter ships function and line length as opt-ins.
- **Text:** `scratchpad/length-lit/C/src/golangci/golangci.reference.yml`, `scratchpad/length-lit/C/src/golangci/builder_linter.go`

### 3.11 Rust Clippy: `too_many_arguments` warns at 7; `too_many_lines` went into pedantic before it shipped (2018–2019), and is a top-suppressed lint (2021). VERIFIED

- **Citation:** rust-lang/rust-clippy at `43c0efca149bb15b9cd2bbf2ef34771cefa70a7e` (24 Oct 2026): `clippy_lints/src/functions/mod.rs`, `clippy_config/src/conf.rs`, `clippy_lints/src/excessive_nesting.rs`, `README.md`; PR #2857 (opened 20 Jun 2018, merged 2 Feb 2019; first released in 1.34.0); issue #7666 (David Tolnay, 13 Sep 2021).
- **What it says:**
  - `too_many_arguments`: group `complexity` (warn by default; "code that does something simple but in a complex way"), threshold 7. Doc: "Functions with lots of parameters are considered bad" style ("what does the 5th parameter mean?").
  - `too_many_lines`: group `pedantic` (allow by default; "lints which are rather strict or have occasional false positives"), threshold 100. Doc: "Functions with a lot of lines are harder to understand".
  - `excessive_nesting`: `complexity`, but the threshold defaults to 0, so "it will only trigger if a maximum nesting level is defined" in clippy.toml.
  - PR #2857: Clippy maintainer `oli-obk`: "Clippy itself violates that rule so many times" (27 Jun 2018); in review: "Can you make this a `pedantic` lint?" "I don't think we can get the community to agree on a threshold" "below 200" (21 Jun 2018); and "It has no false positives, but it can be inactionable" "(imagine a function exhaustively matching on a 50 variant enum". The author, Jan 2019: "Also had to move the lint from the clippy::all list to the clippy::pedantic list."
  - #7666 (all crates on crates.io, `allow` attributes): `too_many_arguments` had 2,369 local and 526 crate-level allows, second only to `type_complexity`; `too_many_lines` (already pedantic) 265 and 106. Tolnay: "The top 2 most widely suppressed lints, whether you look at global or local," and "it's possible Clippy has gotten the default thresholds wrong." Commenters said many allows were on `new` constructors.
- **Caveat:** the common account (moved to pedantic after release) is half right: it was moved in the PR, before release, not after. The #7666 counts are from Sept 2021.
- **For the post:** Rust's linter treats function length as pedantic from day one, for the reason that a long exhaustive `match` is fine, and its parameter-count lint is among the most suppressed in the ecosystem.
- **Text:** `scratchpad/length-lit/C/src/clippy/functions-mod.rs`, `scratchpad/length-lit/C/src/clippy/conf.rs`, `scratchpad/length-lit/C/src/clippy/excessive_nesting.rs`, `scratchpad/length-lit/C/src/clippy/README.md`, `scratchpad/length-lit/C/src/clippy/pr-2857-comments.json`, `scratchpad/length-lit/C/src/clippy/pr-2857-review-comments.json`, `scratchpad/length-lit/C/src/clippy/issue-7666.json`, `scratchpad/length-lit/C/src/clippy/issue-7666-comments.json`

---

### 3.12 PEP 8 (79/72) and the GNU Coding Standards (79). VERIFIED

- **Citation:** PEP 8, `peps/pep-0008.rst` in python/peps at `5514795ade79a5bf6f3c08c562b02689d0a9feb2` (4 Apr 2025), "Maximum Line Length"; GNU Coding Standards, §5.1 (last updated 27 Apr 2026), https://www.gnu.org/prep/standards/standards.txt
- **What it says:** PEP 8: "Limit all lines to a maximum of 79 characters." For docstrings and comments "the line length should be limited to 72 characters." The reasons: "Limiting the required editor window width makes it possible to have" "several files open side by side," and side-by-side review; "The default wrapping in most tools disrupts the visual structure of the code," "The limits are chosen to avoid wrapping in editors" / "with the window width set to 80,". Teams that agree may go to 99: "it is okay to increase the line length limit up to 99 characters,". GNU: "Please keep the length of source lines to 79 characters or less," "for maximum readability in the widest range of environments."
- **Caveat:** PEP 8's reasons are about tool windows and wrapping, not reading studies.
- **For the post:** the 79/80 standard is justified by editor windows and side-by-side diffs. That's a formatter's job (choose a wrap width), not something a linter needs to fail a build over.
- **Text:** `scratchpad/length-lit/C/src/pep8/pep-0008.rst`, `scratchpad/length-lit/C/text/gnu-coding-standards.txt`

### 3.13 Prettier: `printWidth` is not a limit (3.9.10). VERIFIED; and eslint-config-prettier turns `max-len` off. VERIFIED

- **Citation:** prettier/prettier at `3.9.10` (`1172b82c295c4f889fd787dc6c78c3e194ebf353`): `docs/options.md` ("Print Width"), `docs/rationale.md` ("Print width"), `docs/option-philosophy.md`. prettier/eslint-config-prettier at `v10.1.8` (`9b0b0a47ec28a7a83cf65e8436a8776910379385`): `index.js`, `README.md`.
- **What it says:**
  - Options: "Specify the line length that the printer will wrap on." Default `80`. Warning box: "**For readability we recommend against using more than 80 characters:**" "In code styleguides, maximum line length rules are often set to 100 or 120." But "when humans write code, they don't strive to reach" / "the maximum number of columns on every line." "Prettier's printWidth option does not work the same way." "It is not the hard upper allowed line length limit." So "don't try to use printWidth as if it was ESLint's" `max-len`: "they're not the same." "max-len just says what the maximum allowed line length is," "but not what the generally preferred length is".
  - Rationale: the option "is more of a guideline to Prettier than a hard rule." Strings, regexps and comments can't be broken, and "there are a few cases where Prettier intentionally exceeds the print width." (single-specifier imports, test titles).
  - Option Philosophy: "Prettier has a few options because of history." "**But we won't add more of them.**"
  - eslint-config-prettier sets `max-len` to the special value 0 (off) and `max-statements-per-line` to `"off"`. README: "**This rule requires special attention when writing code.**" "Usually, Prettier takes care of following a maximum line length automatically." But "there are cases where Prettier can't do anything," / "such as for long strings, regular expressions and comments." "the special rules are disabled by default".
- **Caveat:** "For readability" is the only reason Prettier gives for 80; no source.
- **For the post:** the formatter most JS projects use says its width is a target it will overshoot, and that a `max-len` limit is a different thing. With a formatter in place, `max-len` mostly reports what the formatter couldn't wrap: strings, URLs, comments.
- **Text:** `scratchpad/length-lit/C/src/prettier/options.md`, `scratchpad/length-lit/C/src/prettier/rationale.md`, `scratchpad/length-lit/C/src/prettier/option-philosophy.md`, `scratchpad/length-lit/C/src/eslint-config-prettier/index.js`, `scratchpad/length-lit/C/src/eslint-config-prettier/README.md`

### 3.14 Black: 88 columns, "10% over 80" (26.10.1). VERIFIED

- **Citation:** psf/black at `26.10.1` (`258e7dbf348bc23cb70b8cdf693481c04634ebcc`): `docs/the_black_code_style/current_style.md` ("Line length"), `docs/guides/using_black_with_other_tools.md`.
- **What it says:** "_Black_ defaults to 88 characters per line, which happens to be 10% over 80." "This number was found to produce significantly shorter files than sticking with 80" "(the most popular), or even 79 (used by the standard library)." It links a talk for "90-ish seems like the wise choice". Lower limits are best-effort: "In those rare cases, auto-formatted code will exceed your allotted limit." Against going higher: "people with sight disabilities find it" / "harder to work with line lengths exceeding 100 characters." "It also adversely affects side-by-side diff review on typical screen resolutions." For Flake8, Black recommends Bugbear's B950 (a 10% tolerance) over E501.
- **Caveat:** "found to produce significantly shorter files" has no data attached; the accessibility claim has no source. The "90-ish" link is a conference talk (Raymond Hettinger, PyCon 2015, per the URL), not research.
- **For the post:** Black chose its width to reduce wrapping (vertical length), which shows width and length trade against each other: a narrower `max-len` makes `max-lines` fire sooner.
- **Text:** `scratchpad/length-lit/C/src/black/current_style.md`, `scratchpad/length-lit/C/src/black/using_black_with_other_tools.md`

### 3.15 Go has no line-length limit (Effective Go; Google's Go guide). VERIFIED; Vendor (Google)

- **Citation:** Effective Go, `_content/doc/effective_go.html` in golang/website at `52d470bcf26e41fd5a38199c5463268fb61b67ae` (21 Oct 2026), "Formatting"; Google Go Style Guide, `go/guide.md` in google/styleguide at `c775c0c2`.
- **What it says:** Effective Go: "Go has no line length limit." "Don't worry about overflowing a punched card." "If a line feels too long, wrap it and indent with an extra tab." Google: "There is no fixed line length for Go source code." "If a line feels too long, prefer refactoring instead of splitting it."
- **Caveat:** gofmt has no width option at all; that it never wraps lines is from the tool's behaviour, not a quoted statement.
- **For the post:** a major language whose official formatter has no width, and whose official advice on long lines is to refactor, not wrap (1.14).
- **Text:** `scratchpad/length-lit/C/src/go/effective_go.html`, `scratchpad/length-lit/C/src/google-styleguide/go_guide.md`

### 3.16 Google's column limits: 80 for JavaScript and C++, 100 for Java, 80 for Python. VERIFIED; Vendor (Google)

- **Citation:** google/styleguide at `c775c0c2f73c110613243520c001577cdbc0034d`: `jsguide.md` §4.4, `javaguide.html` §4.4, `cppguide.html` "Line Length", `pyguide.md` §3.2.
- **What it says:** "JavaScript code has a column limit of 80 characters." (exceptions: imports, `goog.require`, URLs, shell commands, long strings). "Java code has a column limit of 100 characters." C++: "Each line of text in your code should be at most 80 characters long." "We recognize that this rule is controversial," "and we feel that consistency is important." Its Cons list: "The 80-column limit is a hidebound throwback to 1960s mainframes;". JS line-wrapping tip: "Extracting a method or local variable may solve the problem". Python: "Maximum line length is _80 characters_."
- **Caveat:** these are formatting rules applied with formatters (clang-format, google-java-format) at Google; the C++ guide's own stated reason is consistency with existing code.
- **For the post:** Google's justification for 80 in C++ is that existing code already uses it, and it records the "1960s mainframes" objection itself.
- **Text:** `scratchpad/length-lit/C/src/google-styleguide/jsguide.md`, `scratchpad/length-lit/C/src/google-styleguide/javaguide.html`, `scratchpad/length-lit/C/src/google-styleguide/cppguide.html`, `scratchpad/length-lit/C/src/google-styleguide/pyguide.md`

### 3.17 Other formatter widths: rustfmt 100, Biome 80, Oxfmt 100. VERIFIED

- **Citation:** rust-lang/rustfmt `Configurations.md` at `ad7516ba22245c40faeae4668cc75d89f2550b92` (`max_width`); biomejs/biome `crates/biome_formatter/src/lib.rs` at `@biomejs/biome@2.6.3` (`c5c3383d590d6e08b08d625d10d1d557577284d7`); oxc-project/oxc `apps/oxfmt/src-js/cli/migration/migrate-prettier.ts` at `fef11e819a9cabb2c8a5b7470e6097906c0d7d28` (main, 25 Oct 2026).
- **What it says:** rustfmt `max_width`: "Maximum width of each line", default `100`. Biome `LineWidth` default 80, range 1–320: "Sets the preferred maximum line width used when deciding where to wrap code." and "long unbreakable strings, may still exceed this width." Oxfmt, in its Prettier migration code: "Oxfmt default is 100, Prettier default is 80." (the migrator writes 80 to keep Prettier's output).
- **Caveat:** I found no stated reason for Oxfmt's 100. I didn't check which width Ultracite's Oxfmt preset sets.
- **For the post:** formatter defaults disagree (80, 88, 100) with no study behind any of them, which is one more reason a fixed `max-len` measures a formatter setting.
- **Text:** `scratchpad/length-lit/C/src/formatters/rustfmt-Configurations.md`, `scratchpad/length-lit/C/src/formatters/biome_formatter-lib.rs`, `scratchpad/length-lit/C/src/formatters/oxfmt-migrate-prettier.ts`

### 3.18 Where 80 columns came from: the 1928 IBM card and the 80×24 VT100, and what the sources don't say. VERIFIED (IBM's own history page; transcription of DEC's manual); the link to code style UNVERIFIED

- **Citation:** IBM Heritage, "The IBM punched card," https://www.ibm.com/history/punched-card (fetched 25 Oct 2026); Digital Equipment Corp., _VT100 User Guide_, EK-VT100-UG-003, 3rd ed., June 1981, as reproduced at https://vt100.net/docs/vt100-ug/chapter1.html
- **What it says:** IBM: the card measured 7⅜ × 3¼ inches, "comprising 80 columns, 12 rows and a series of tiny rectangular holes." "Introduced in 1928, the new IBM card had 80 columns" (10 rows, then 12 from 1930), and "for almost half a century, IBM cards held most of the world's stored data." DEC: "The VT100 is capable of displaying either 80 or 132 characters per line." In 80-column mode "the screen is 80 characters wide by 24 lines high."
- **Caveat:** neither source says programming line limits descend from the card or the terminal. The link is asserted only by style guides themselves (Effective Go's punched-card joke, Google's "1960s mainframes", the kernel's "80x24", PEP 8's 80-wide editor window). vt100.net is a proof-read transcription, not DEC's scan. I couldn't check the FORTRAN fixed-form column 72 rule from a primary (the NIST FIPS 69-1 PDF is 22.9 MB).
- **For the post:** safe to say 80 was the width of IBM's card from 1928 and of the VT100's default mode; say the habit of 80-column code is commonly traced to them, citing the style guides as the ones tracing it.
- **Text:** `scratchpad/length-lit/C/text/ibm-history-punched-card.txt`, `scratchpad/length-lit/C/text/vt100-ug-chapter1.txt`, `scratchpad/length-lit/C/text/vt100-ug-contents.txt`

---

---

## 4. What the research says about size

Items 4.1–4.7 are the studies _Code Complete_ cites for routine size; 4.8–4.17 the size–fault-density argument (the U-curve and its rebuttals); 4.18–4.23 size as a confound for other metrics; 4.24–4.30 method-level evidence and data-derived thresholds; 4.31–4.33 long methods, change and the one JavaScript study; 4.34–4.45 Long Method and Long Parameter List as code smells; 4.46–4.54 comprehension (does splitting help or hurt?); 4.55–4.60 parameters; 4.61–4.66 line length; 4.67–4.77 metrics as targets and what developers want from static analysis; 4.78 onward the cost of refactoring to meet a limit. Nesting depth is covered in `cognitive-complexity.md` §3 (Johnson et al., Peitek et al.) and only cross-referenced here. Sources are in `scratchpad/length-lit/A/` (4.1–4.33) and `D/` (4.34 onward).

### 4.1 Basili and Perricone, "Software errors and complexity: an empirical investigation" (CACM 1984; UMD TR-1195, 1982). VERIFIED (technical report full text via NASA NTRS; CACM metadata + abstract)

- **Citation:** Victor R. Basili, Barry T. Perricone, _Communications of the ACM_ 27(1), pp. 42–52, Jan 1984. https://doi.org/10.1145/69605.2085 (ACM PDF returned 403). Read: University of Maryland Technical Report TR-1195, August 1982 (NASA grant NSG-5123), https://ntrs.nasa.gov/api/citations/19870015469/downloads/19870015469.pdf (scanned, OCR text).
- **Method:** Change and error reports from one NASA Goddard (Software Engineering Laboratory) satellite-planning project, about 90,000 source lines, mostly Fortran on an IBM 360. Of 517 code segments, 370 Fortran modules met the module definition; modules were grouped by size in 50-line steps.
- **What it says:** "One surprising result was that module size did not account for error proneness." "the larger the module the less error prone it was". "This was true even though the larger modules were more complex." The authors offer explanations: "the majority of the modules examined were small (Table I) causing a biased result"; "larger modules were coded with more care than smaller modules"; and undetected errors may remain in larger modules whose paths were not fully exercised. On error type: "interfaces appear to be the major problem regardless of the module type".
- **Numbers:** 215 errors in 96 of 370 modules (26%). Errors per 1,000 executable lines by size class (≤50, ≤100, ≤150, ≤200, >200; the class counts match Table I's executable-line column): 16.0, 12.6, 12.4, 7.6, 6.4. Table I: 258 of 370 modules had 50 or fewer executable lines; only 3 had more than 200 (Malaiya and Denton, 4.12, read the same table: "there are only three modules larger than 200 lines"). Average cyclomatic complexity by the same classes: 6.0, 17.9, 28.1, 52.7, 60.0. Interface errors were 39% of abstract errors.
- **Caveat:** The density trend is grouped averages; Fenton and Neil (4.11) say this study "used average fault density of grouped data in a way that suggested a trend" "that was not supported by the raw data". Density (errors/size) falls with size by arithmetic when errors grow at most linearly (Rosenberg, 4.10; El Emam et al., 4.15). The '>200' point rests on 3 modules. The secondary claim "inversely correlated with errors, up to 200 lines" (1.7) overstates what one project's grouped data can show.
- **For the post:** The founding 'longer routines had fewer errors' result. Good history, but present it as a single Fortran project's per-line density, with the arithmetic caveat. The 39% interface share is the more durable point: splitting code creates interfaces, and interfaces were where the errors were.
- **Text:** `scratchpad/length-lit/A/text/basili-perricone-1982-TR1195-ntrs-flat.txt` (flattened OCR), `scratchpad/length-lit/A/text/oa-abstract-basili1984-cacm.txt`

### 4.2 Shen, Yu, Thebaut and Paulsen, "Identifying error-prone software—an empirical study" (IEEE TSE 1985). VERIFIED (metadata + abstract)

- **Citation:** Vincent Y. Shen, Tze-Jie Yu, S. M. Thebaut, L. R. Paulsen, _IEEE TSE_ SE-11(4), pp. 317–324, April 1985. https://doi.org/10.1109/TSE.1985.232222 (closed; no open copy found).
- **Method:** Three commercial products (IBM, per 4.12) and their error-discovery histories.
- **What it says:** The abstract reports "simple metrics related to the amount of data and the structural complexity of programs" as useful for finding error-prone code. It does not mention module length.
- **Numbers (secondary, Malaiya and Denton 4.12):** sizes from 7 to 326 thousand lines; a plot of 108 modules; for 24 modules over 500 lines "the program length did not influence the defect density"; for the other 84 "the plot clearly shows that defect density declines as size grows".
- **Caveat:** Size findings are secondary. Hatton (4.9) lists it among studies showing small components with proportionately more bugs; Card et al. (4.3) attribute its result to the small-module density artifact.
- **For the post:** Cite only as 'also reported falling defect density with size', via the secondary sources.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-shen1985.txt`, `scratchpad/length-lit/A/text/malaiya-denton-issre2000.txt`

### 4.3 Card, Church and Agresti, "An empirical study of software design practices" (IEEE TSE 1986). VERIFIED (NASA NTRS full text)

- **Citation:** David N. Card, Victor E. Church, William W. Agresti, _IEEE TSE_ SE-12(2), pp. 264–271, Feb 1986. https://doi.org/10.1109/TSE.1986.6312942 ; read at https://ntrs.nasa.gov/api/citations/19870015475/downloads/19870015475.pdf (scan; OCR is rough in places).
- **Method:** "887 Fortran modules developed for five flight dynamics software projects" (NASA SEL). Size analysis used sample B, 453 newly developed nontrivial modules, split into three roughly equal classes by executable statements; contingency tables, not regression.
- **What it says:** The study tested "Keep modules small." Programming standards "limit module size to one page" "(or 50-60 source lines of code)" (the citation for those standards is Miller's "magical number seven" paper); "one purpose of the study" "was to test the validity of such standards". Results: "No significant relationship was found between module size and fault rate." Larger modules were cheaper per statement: "fully 46 percent of large modules fell" "into the lowest cost class", "whereas just 22 percent of small modules were rated as low cost." On the small-module density effect: "Sixty percent of the small modules in sample B contained no faults", but "a small module with even a single fault" "will show a very high fault rate", which they say is "the phenomenon detected by Basili and Perricone". Conclusion: "Arbitrary module size limitations can increase module cost."
- **Numbers:** Size classes in Table VI: small 1–31, medium 32–64 (148 modules), large 65 or more (151 modules) executable statements; 31 executable statements is "about 60 source lines of code"; largest module 267 statements; size–cost correlation γ = −0.31 (p < 0.001).
- **Caveat:** Fortran, one environment, cost is per executable statement (so the per-line framing again favours large modules), and it measures cost and faults, not comprehension. The authors limit their results to similar Fortran-based scientific environments.
- **For the post:** The best primary line for the post: an early study that set out to test a one-page limit and concluded that "Arbitrary module size limitations can increase module cost." It also cleanly explains why small-module fault densities look high.
- **Text:** `scratchpad/length-lit/A/text/card-church-agresti-1986-ntrs-raw.txt`, `scratchpad/length-lit/A/text/oa-abstract-card1986.txt`

### 4.4 Selby and Basili, "Analyzing error-prone system structure" (IEEE TSE 1991). VERIFIED (metadata + abstract)

- **Citation:** Richard W. Selby, Victor R. Basili, _IEEE TSE_ 17(2), pp. 141–152, 1991. https://doi.org/10.1109/32.67595 . An earlier UMD report, _Analyzing Error-Prone System Coupling and Cohesion_ (CS-TR-2052, 1988, http://hdl.handle.net/1903/7527), is listed at 13.5 MB, above this brief's download limit, so not opened.
- **Method:** Data bindings (coupling and strength ratios) on a "148000 source line system" with "77 subsystems"; nonparametric ANOVA on routines and subsystems with many or few errors.
- **What it says:** The abstract is about coupling/strength clustering, not routine length.
- **Caveat:** The Code Complete figure ("fewer than 143 source statements", "23% more errors per line", 1.7) could not be checked; secondary sources even disagree on its units. Don't use the 143 number.
- **For the post:** Drop, or mention only as one of the studies McConnell lists.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-selby1991.txt`

### 4.5 Lind and Vairavan, "An experimental investigation of software metrics and their relationship to software development effort" (IEEE TSE 1989). VERIFIED (metadata + abstract)

- **Citation:** R. K. Lind, K. Vairavan, _IEEE TSE_ 15(5), pp. 649–653, May 1989. https://doi.org/10.1109/32.24715 (Crossref gives "R.K. Lind"; OpenAlex expands it to "Regina Lind", unchecked). Closed.
- **Method:** Metrics for "a fairly large software system used in a real-time application" against development effort.
- **What it says:** The abstract says only: "Some interesting connections are reported between metrics and the software development effort."
- **Caveat:** The Code Complete claim (100–150-line routines "need to be changed least") is not in the abstract and is unverified.
- **For the post:** Don't cite for a number.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-lind1989.txt`

### 4.6 Woodfield, Dunsmore and Shen, "The effect of modularization and comments on program comprehension" (ICSE 1981). VERIFIED (metadata + abstract)

- **Citation:** Scott N. Woodfield, Hubert E. Dunsmore, Vincent Y. Shen, _Proc. 5th ICSE_, pp. 215–223, 1981. https://doi.org/10.5555/800078.802534 (closed).
- **Method:** "Forty-eight experienced programmers were given eight different versions of the same program" (monolithic, functional, super, abstract data type; each with and without comments), and a 20-question quiz.
- **What it says:** Comments helped, and those given "abstract data type version of the program were able to do significantly better" than other modularizations.
- **Caveat:** One program, one quiz, 1981. It compares kinds of decomposition, not routine lengths; finer functional splitting did not win.
- **For the post:** Evidence that how code is split matters more than how small the pieces are. One small experiment.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-woodfield1981.txt`

### 4.7 Jones (1986) and Card and Glass (1990), books. UNVERIFIED

- Capers Jones, _Programming Productivity_ (McGraw-Hill, 1986) and David N. Card with Robert L. Glass, _Measuring Software Design Quality_ (Prentice Hall, 1990) are cited in Code Complete summaries. Neither was opened (no legitimate full text found). Don't cite their numbers.

---

### 4.8 Withrow, "Error density and size in Ada software" (IEEE Software 1990), with Compton and Withrow (JSS 1990). VERIFIED (metadata + abstract)

- **Citation:** Carol Withrow, _IEEE Software_ 7(1), pp. 26–30, Jan 1990. https://doi.org/10.1109/52.43046 . Also B. Terry Compton, Carol Withrow, "Prediction and control of ADA software defects," _JSS_ 12(3), pp. 199–207, 1990, https://doi.org/10.1016/0164-1212(90)90040-S (metadata only). Both closed.
- **Method:** One large Ada project (UNISYS, per Fenton and Neil's description of Compton and Withrow); error density (defects per thousand lines) against module size.
- **What it says:** The results "lend support to the hypothesis that there is an optimal, intermediate module size".
- **Numbers (secondary):** Malaiya and Denton (4.12): "362 ADA modules with total 114,000 lines of code", eight groups, a "minimum for modules with sizes 161-250". Fenton and Neil (4.11): Compton and Withrow found "the optimum size for an Ada module" "is 83 source statements" and named it the "Goldilocks Principle".
- **Caveat:** Fenton and Neil say Compton and Withrow "reported removing a large number of data points from the analysis" "because they represented modules that had experienced zero defects", which undermines the optimum. The two Withrow figures (83 statements; 161–250 lines) use different units and papers.
- **For the post:** The origin of the "Goldilocks" optimum. Use with Fenton and Neil's critique attached.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-withrow1990.txt`, `scratchpad/length-lit/A/text/fenton-neil-1999-preprint.txt`, `scratchpad/length-lit/A/text/malaiya-denton-issre2000.txt`

### 4.9 Hatton, "Reexamining the fault density–component size connection" (IEEE Software 1997), and Hatton's later retraction. VERIFIED (author's pre-publication manuscript; published abstract; author's 2009 note)

- **Citation:** Les Hatton, _IEEE Software_ 14(2), pp. 89–97, March 1997. https://doi.org/10.1109/52.582978 (published version not opened). Read: the author's manuscript, titled "Why is the defect density curve U-shaped with component size ?", marked "for IEEE Software, 27/5/96", from Hatton's site via Wayback: http://web.archive.org/web/20240705192041/https://www.leshatton.org/Documents/Ubend_IS697.pdf . Published abstract from the Kent repository record https://kar.kent.ac.uk/21532/ . Author's note: http://web.archive.org/web/20260509232839/https://www.leshatton.org/IEEE_Soft_97b.html (live site returned 503).
- **Method:** Re-plots published data (Basili and Perricone; Hatton and Hopkins on the NAG Fortran library; Davey et al., C; Moller and Paulish, assembler; Compton and Withrow, Ada; plus Shen et al. and others) and fits a two-part model: faults grow logarithmically with size up to a short-term-memory "cache" limit, then quadratically.
- **What it says (manuscript page numbers):** p. 1: larger components were "proportionately much more reliable than smaller software components" "up to a certain size after which they rapidly deteriorate". p. 10: the Ada and assembler data put the switch at "about 200-400 lines", with the cache overflow set at "200 lines of code" for the fit; Hatton reads size as "the symbolic complexity of the language implementation", since Ada and assembler lines differ. p. 13: 1,000 'lines' of functionality as 5 × 200-line components gives "perhaps 5 log10(200) = 25 bugs" against "50 x log10(20) = 150 bugs" for 50 × 20 lines. pp. 18–19 (conclusions): "larger components are proportionately more reliable than smaller components" (p. 18); on p. 19, logarithmic behaviour "in the region of 200-400 lines and apparently independent of language", and "The most reliable systems may result from systems with component" "sizes grouped around the 200-400 line mark." Hatton calls these "conjectures" needing "further experiments". Published abstract: "Conventional wisdom, that smaller components contain proportionately fewer faults, may be wrong." and "medium-sized components were proportionately more reliable than large or small ones."
- **Retraction:** In a September 2009 note on the paper's page: "I no longer believe in the U-bend described in this paper." Hatton's newer view: "defect growth and component size appear inextricably linked". (Hatton's 2009 TSE paper, https://doi.org/10.1109/TSE.2008.105, models component sizes as power-law distributed; abstract only.)
- **Caveat:** The manuscript may differ from the published text. "Lines" in the data are Ada statements, Fortran and assembler lines, not formatted JavaScript lines. The model is a fit to grouped data that Fenton and Neil (4.11) and El Emam et al. (4.15) say is an arithmetic artifact.
- **For the post:** The source of the "200–400 lines" sweet spot that later style guides (and, through Raymond, ESLint's `max-lines` default; 2.5) inherited. The strongest point is that the author withdrew it in 2009.
- **Text:** `scratchpad/length-lit/A/text/hatton-1997-ubend-author.txt`, `scratchpad/length-lit/A/text/hatton-IEEE_Soft_97b-page.txt`, `scratchpad/length-lit/A/src/hatton-kar-record.html`, `scratchpad/length-lit/A/text/oa-abstract-hatton2009-powerlaw.txt`

### 4.10 Rosenberg, "Some misconceptions about lines of code" (METRICS 1997). VERIFIED (metadata + abstract)

- **Citation:** Jarrett Rosenberg (Sun Microsystems), _Proc. 4th International Software Metrics Symposium (METRICS '97)_, pp. 137–142, 1997. https://doi.org/10.1109/METRIC.1997.637174 (OpenAlex gives the year as 2002; the symposium was November 1997). Closed; no copy found.
- **What it says:** Three misconceptions: that how SLOC is counted matters ("in fact, it does not matter"), that SLOC is most useful as a quality predictor ("in fact it is most useful as a covariate of other predictors"), and that defect density falls with size: "this is an arithmetic artifact of plotting bugs-per-SLOC against SLOC".
- **Caveat:** The abstract says "the format of SLOC is relevant to how to properly count it"; without the full text I can't tell whether "format" means code layout or the counting rule. Don't claim it shows formatting doesn't matter.
- **For the post:** The cleanest one-line explanation of why the old 'small modules are more error-prone' results don't support splitting or merging: a ratio against size falls with size.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-rosenberg1997.txt`

### 4.11 Fenton and Neil, "A critique of software defect prediction models" (IEEE TSE 1999). VERIFIED (authors' preprint)

- **Citation:** Norman E. Fenton, Martin Neil, _IEEE TSE_ 25(5), pp. 675–689, 1999. https://doi.org/10.1109/32.815326 . Read: the preprint (IEEECS log 105579; header says "VOL. 25, NO. 3, MAY/JUNE 1999") from http://web.archive.org/web/20251119142406/http://www.eecs.qmul.ac.uk/~norman/papers/defects_prediction_preprint105579.pdf
- **Method:** Critical review of size- and complexity-based defect models, using the "Goldilock's Conjecture" as the worked example, plus Neil's earlier analysis of Tandem data.
- **What it says:** Abstract: "the conjecture lacks support and that some models are misleading". On Basili and Perricone: "used average fault density of grouped data in a way that suggested a trend" "that was not supported by the raw data". On Rosenberg: negative density–size correlations arise "because of this property of arithmetic". On Compton and Withrow's zero-defect deletion, see 4.8. Moller and Paulish found "modules consisting of greater than 70 lines of code have similar defect densities". Tandem: "Many small modules experienced no defects at all". Conclusion: the size–defect relationship is "too complex, in general, to admit to straightforward curve fitting models", and the results "contradict the idea that there is a general law linking defect" "density and software component size".
- **Numbers:** Gaffney's model gives an "optimum module size" of 877 LOC; Compton and Withrow's 83 source statements for Ada; Hatton's 200–400 lines. Three incompatible optima.
- **Caveat:** A review, not new data. The paper's remedy is Bayesian belief networks, a direction the authors pursued; that bears on its recommendation, not on the critique.
- **For the post:** The authoritative rebuttal of an optimal module size, and the source for the three-different-optima point (877, 83, 200–400).
- **Text:** `scratchpad/length-lit/A/text/fenton-neil-1999-preprint.txt`

### 4.12 Malaiya and Denton, "Module size distribution and defect density" (ISSRE 2000). VERIFIED (authors' copy)

- **Citation:** Yashwant K. Malaiya, Jason Denton, _Proc. 11th ISSRE_, pp. 62–71, 2000. https://doi.org/10.1109/ISSRE.2000.885861 ; read at https://www.cs.colostate.edu/~malaiya/p/denton_2000.pdf (scan with OCR; Table 3 values are unreadable).
- **Method:** Fits a two-part model (module-interface faults that fall with size plus instruction faults that rise) to published data: Basili and Perricone, Withrow, Hatton's Columbus assembler data, Fenton and Ohlsson. Also argues module sizes follow an exponential distribution.
- **What it says (proceedings page numbers):** p. 63: decomposing into small modules is popularly believed to help, yet "Surprisingly the projects studied show exactly the opposite" "for a large range of module sizes"; Withrow's plot shows a "minimum for modules with sizes 161-250". p. 64: for Basili's data "there are only three modules larger than 200 lines". p. 65: in Fenton and Ohlsson's data "the trend reverses around size 200-300 lines". p. 63 also promises "the intriguing possibility that defect density may be reduced" "simply by controlling module sizes". p. 69 caveat: "Some modules could have gone through more careful inspection and testing." p. 70: if small modules "can be combined into optimal sized modules" without losing cohesion, defect density might fall.
- **Caveat:** Grouped, re-plotted data from four old projects; it engages with Rosenberg but keeps the density framing that El Emam et al. (4.15) call an artifact. No new measurements.
- **For the post:** Useful as the high-water mark of the "optimal module size" line (and a possible link in the max-lines-300 chain). Pair it with 4.10, 4.11 and 4.15.
- **Text:** `scratchpad/length-lit/A/text/malaiya-denton-issre2000.txt`

### 4.13 Fenton and Ohlsson, "Quantitative analysis of faults and failures in a complex software system" (IEEE TSE 2000). VERIFIED (metadata + abstract)

- **Citation:** Norman E. Fenton, Niclas Ohlsson, _IEEE TSE_ 26(8), pp. 797–814, Aug 2000. https://doi.org/10.1109/32.879815 (CiteSeerX copies 404; no other open copy found).
- **Method:** Two releases of "a major commercial software system" (telecom, per the replications in 4.14); hypothesis tests on fault distribution and predictors.
- **What it says:** "We found no evidence to support previous claims relating module size to fault density", and no evidence that "popular complexity metrics are good predictors" of fault- or failure-prone modules. Faults concentrate: "a very small number of modules contain most of the faults discovered in operation".
- **For the post:** The large industrial counter-example to the U-curve; the Pareto concentration matters more than size.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-fenton2000.txt`

### 4.14 Replications of Fenton and Ohlsson: Andersson and Runeson (TSE 2007); Galinac Grbac, Runeson and Huljenić (TSE 2013). VERIFIED (2013 authors' copy); 2007 metadata + abstract

- **Citation:** Carina Andersson, Per Runeson, "A Replicated Quantitative Analysis of Fault Distributions in Complex Software Systems," _IEEE TSE_ 33(5), pp. 273–286, 2007, https://doi.org/10.1109/TSE.2007.1005 . Tihana Galinac Grbac, Per Runeson, Darko Huljenić, "A Second Replicated Quantitative Analysis of Fault Distributions in Complex Software Systems," _IEEE TSE_ 39(4), pp. 462–476, 2013, https://doi.org/10.1109/TSE.2012.46 ; read at https://lup.lub.lu.se/search/files/4238181/3972380.pdf
- **Method:** 2007: three telecom projects. 2013: five consecutive releases of a large telecom system, literal replication; module = smallest self-contained administrative unit, LOC as size; its largest modules are about five times larger than the original study's.
- **What it says:** 2007: "the size relation from the original study could be neither confirmed nor disproved". 2013: "Size measures are not useful as predictors of fault proneness"; "we did not identify any correlation between the total number of faults" "and the total volume"; across all three studies "At most, size have been shown to explain 40% of the variation." The size hypotheses are rejected "since size is not a sufficient predictive factor". Fault concentration replicated.
- **Caveat:** Telecom, large modules, module-level not function-level.
- **For the post:** Two replications that keep the concentration finding and drop size as a predictor.
- **Text:** `scratchpad/length-lit/A/text/galinac-runeson-huljenic-tse2013-lup.txt`, `scratchpad/length-lit/A/text/oa-abstract-andersson-runeson2007.txt`

### 4.15 El Emam et al., "The optimal class size for object-oriented software" (IEEE TSE 2002), and Benlarbi et al., "Thresholds for object-oriented measures" (ISSRE 2000). VERIFIED (metadata + abstract)

- **Citation:** Khaled El Emam, Saïda Benlarbi, Nishith Goel, Walcélio Melo, Hakim Lounis, Shesh N. Rai, _IEEE TSE_ 28(5), pp. 494–509, 2002, https://doi.org/10.1109/TSE.2002.1000452 . Saïda Benlarbi, Khaled El Emam, Nishith Goel, Shesh Rai, _Proc. 11th ISSRE_, pp. 24–38, 2000, https://doi.org/10.1109/ISSRE.2000.885858 . Closed.
- **Method:** 2002: an industrial C++ system, repeated on another C++ system and a commercial Java application, four size measures, testing for a threshold in the size–fault relationship. 2000: threshold effects for CK metrics in two C++ telecom systems.
- **What it says:** 2002: the optimal-size and small-is-worse claims "are due to a mathematical artifact in the analyses performed previously"; the results "provide unambiguous evidence that there is no threshold effect of class size", suggest "a simple continuous relationship between class size and faults", and say "threshold effects conjectures have no sound theoretical nor empirical basis". 2000: "there are no threshold effects for any of the measures studied", so "we can provide no support to the posited cognitive theory" (the short-term-memory overflow theory, as in 4.9).
- **Caveat:** Class level, OO systems, field faults; a threshold could exist for other units or outcomes. Alves et al. (4.29) note these results hold "only" for the models used.
- **For the post:** The direct test of whether a size threshold exists. Answer: risk rises smoothly with size; there is no cliff at any line count, which is what a hard limit assumes.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-elemam2002-optimal-class-size.txt`, `scratchpad/length-lit/A/text/oa-abstract-elemam2000-thresholds.txt`

### 4.16 Koru, Zhang, El Emam and Liu, "An investigation into the functional form of the size–defect relationship for software modules" (IEEE TSE 2009), and the theory of relative defect proneness. VERIFIED (metadata + abstract)

- **Citation:** A. Güneş Koru, Dongsong Zhang, Khaled El Emam, Hongfang Liu, _IEEE TSE_ 35(2), pp. 293–304, 2009, https://doi.org/10.1109/TSE.2008.90 . Related: Koru, El Emam, Zhang, Liu, Mathew, "Theory of relative defect proneness," _EMSE_ 13(5), pp. 473–498, 2008, https://doi.org/10.1007/s10664-008-9080-x (metadata only); Koru et al., _EMSE_ 15(6), 2010 (closed-source test, metadata only); replication by Syer, Nagappan, Adams, Hassan, _IEEE TSE_ 41(2), pp. 176–197, 2015, https://doi.org/10.1109/TSE.2014.2361131 (abstract).
- **Method:** Class-level size and defect data from Mozilla, Cn3d, JBoss and Eclipse.
- **What it says:** "the size-defect relationship took a logarithmic form", so "smaller classes were proportionally more problematic than larger classes"; "practitioners should consider giving higher priority to smaller modules" when allocating QA. Example: in Mozilla and Eclipse, spending 80% of inspection on 100-LOC classes would be "more than twice as cost effective as the opposite strategy".
- **Caveat:** "Proportionally" is per line: larger classes still have more defects in absolute terms. It's about where to spend review effort, not about writing code smaller or larger. Syer et al. replicated it and stressed missing method details in the original.
- **For the post:** Defects grow more slowly than size. That is an argument against assuming a 300-line class is twice as risky as a 150-line one, and against limits that force splitting.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-koru2009.txt`, `scratchpad/length-lit/A/text/oa-abstract-syer2014-relative-defect.txt`

### 4.17 Zhang, "An investigation of the relationships between lines of code and defects" (ICSM 2009), and Zhang, Tan and Marchesi on program-size distributions. VERIFIED (metadata + abstract)

- **Citation:** Hongyu Zhang, _Proc. ICSM 2009_, pp. 274–283, https://doi.org/10.1109/ICSM.2009.5306304 . Hongyu Zhang, Hee Beng Kuan Tan, Michele Marchesi, "The Distribution of Program Sizes and Its Implications: An Eclipse Case Study," arXiv:0905.2288 (2009).
- **What it says:** 2009: "We confirm the ranking ability of LOC discovered by Fenton and Ohlsson", and "simple static code attributes such as LOC can be useful predictors of software quality" (Eclipse, replicated on NASA data). arXiv: "program sizes follow the lognormal distribution" and "a small percentage of largest programs account for a large percentage of defects".
- **For the post:** The other side, fairly stated: big units do hold more defects, which is why size is a good way to rank where to look. Ranking for review is not the same claim as 'cap every unit at N lines'.
- **Text:** `scratchpad/length-lit/A/text/oa-abstract-zhang2009.txt`, `scratchpad/length-lit/A/src/arxiv-misc2.xml`

---

### 4.18 El Emam, Benlarbi, Goel and Rai, "The confounding effect of class size on the validity of object-oriented metrics" (IEEE TSE 2001). VERIFIED (NRC technical report full text)

- **Citation:** Khaled El Emam, Saïda Benlarbi, Nishith Goel, Shesh N. Rai, _IEEE TSE_ 27(7), pp. 630–650, July 2001, https://doi.org/10.1109/32.935855 . Read: NRC Canada report ERB-1062 (NRC 43606), September 1999, authors El Emam, Benlarbi and Goel, at https://www.ehealthinformation.ca/web/default/files/wp-files/1062.pdf (El Emam's lab).
- **Method:** 174 C++ classes of a commercial telecom framework, 14 programmers; field-failure faults (192 faults in 70 of 174 classes); logistic regression on CK and Lorenz–Kidd metrics with and without size (non-comment LOC).
- **What it says:** Before controlling for size the metrics looked validated; "After controlling for size none of the metrics we studied were" "associated with fault-proneness anymore." Recommendation: "future validation studies should always control for size".
- **Caveat:** The TSE version adds Rai and may differ. One system. Evanco's reply (_IEEE TSE_ 29(7), pp. 670–672, 2003, https://doi.org/10.1109/TSE.2003.1214331 , abstract) argues size is not a confounder because "the ability to measure size does not temporally precede the ability to measure" other design metrics, and adding it "may result in misspecified models that lack internal consistency".
- **For the post:** Many 'metric X predicts bugs' findings are largely size. For a length limit that cuts both ways: size really is the signal, and other limits (parameters, depth) may add little once size is known.
- **Text:** `scratchpad/length-lit/A/text/elemam-benlarbi-goel-1999-NRC-ERB1062.txt`, `scratchpad/length-lit/A/text/oa-abstract-evanco2003-comment.txt`

### 4.19 Gil and Lalouche, "When do software complexity metrics mean nothing? – When examined out of context" (JOT 2016). VERIFIED (open-access PDF, CC BY 4.0)

- **Citation:** Joseph (Yossi) Gil, Gal Lalouche, _Journal of Object Technology_ 15(1), pp. 2:1–25, 2016, https://doi.org/10.5381/jot.2016.15.1.a2 ; http://www.jot.fm/issues/issue_2016_01/article2.pdf
- **Method:** File-level metric distributions across Java projects (`.java` files as modules).
- **What it says:** Metric values are so context-sensitive that "their measurement in one project offers little prediction regarding" "their measurement in another project". "Mixing measurements drawn from different contexts may confound statistical results." They find "context bias is the norm, rather than the exception", and propose log-normal standardization per project.
- **For the post:** A single fixed line count across all projects ignores that each project's size distribution differs. A threshold relative to the project's own distribution is better grounded.
- **Text:** `scratchpad/length-lit/A/text/gil-lalouche-jot2016.txt`

### 4.20 Gil and Lalouche, "On the correlation between size and metric validity" (EMSE 2017). UNVERIFIED (metadata only; content secondary)

- **Citation:** Yossi Gil, Gal Lalouche, _Empirical Software Engineering_ 22(5), pp. 2585–2611, 2017, https://doi.org/10.1007/s10664-017-9513-5 . Springer served a JavaScript challenge; Crossref and OpenAlex have no abstract; Semantic Scholar returned 429 throughout.
- **What secondary sources say:** Chowdhury et al. (4.25) say Gil and Lalouche "concluded that size is the only valid code metric" because other metrics' maintenance impact is explained by their correlation with size, at file level, and that dividing by size is inaccurate.
- **For the post:** Cite through 4.25's summary or open it first.
- **Text:** `scratchpad/length-lit/A/text/chowdhury-holmes-zaidman-kazman-emse2022-preprint.txt`

### 4.21 Herraiz and Hassan, "Beyond lines of code: do we need more complexity metrics?" (_Making Software_, O'Reilly 2010), and Herraiz, German and Hassan on file-size distributions (ICSOFT 2011). VERIFIED (publisher section previews via Wayback); 2011 metadata + abstract

- **Citation:** Israel Herraiz, Ahmed E. Hassan, ch. 8 in Andy Oram and Greg Wilson (eds.), _Making Software_, O'Reilly, 2010, ISBN 9780596808310; section previews from Wayback, e.g. http://web.archive.org/web/20251114072603/https://www.oreilly.com/library/view/making-software/9780596808310/ch08s06.html . Israel Herraiz, Daniel M. German, Ahmed E. Hassan, "On the distribution of source code file sizes," _ICSOFT 2011_, pp. 5–14, https://doi.org/10.5220/0003426200050014 .
- **Method:** ArchLinux packages (April 2010): 4,015 packages, 338,831 unique C files, of which "212,167 were nonheader files"; file-level correlations among SLOC, LOC, function count, McCabe and Halstead measures. They "focus only on one programming language: C".
- **What it says:** "for non-header files written in C language," "all the complexity metrics are highly correlated with lines of code", so the complex metrics add nothing beyond LOC, though "these results must be accepted with some caution". 2011 (Debian 5.0.2): file sizes follow a double Pareto, so "large files are to be found more often than predicted by the lognormal distribution".
- **Caveat:** File level (where aggregation inflates correlations; see `cognitive-complexity.md` §1.4, Landman et al.), C only.
- **For the post:** At file level, almost every "complexity" number is a size number. And file sizes are heavy-tailed, so any fixed file cap always catches a share of files, not a few outliers.
- **Text:** `scratchpad/length-lit/A/text/oreilly-making-software-ch08s04-wayback.txt`, `scratchpad/length-lit/A/text/oreilly-making-software-ch08s06-wayback.txt`, `scratchpad/length-lit/A/text/oreilly-making-software-ch08-wayback.txt`, `scratchpad/length-lit/A/text/oa-abstract-herraiz2011.txt`

### 4.22 Tahir, Bennin, Xiao and MacDonell, _Does class size matter? An in-depth assessment of the effect of class size in software defect prediction_ (EMSE 2021). VERIFIED (metadata + abstract)

- **Citation:** Amjed Tahir, Kwabena E. Bennin, Xun Xiao, Stephen G. MacDonell, _Empirical Software Engineering_ 26(5), article 106, 2021, https://doi.org/10.1007/s10664-021-09991-3 ; abstract from arXiv:2106.04687 v1.
- **What it says:** Mediation and moderation analysis of class size on seven OO metrics: "the size effect is not always significant for all metrics"; size mediates mainly coupling (CBO) and moderates fan-out.
- **For the post:** A later nuance to 4.18: size isn't always the whole story at class level.
- **Text:** `scratchpad/length-lit/A/src/arxiv-misc2.xml`

### 4.23 Cross-reference: `cognitive-complexity.md` §1.4 (Shepperd 1988; Jay et al. 2009; Landman et al. 2014/2016). Not re-verified here

- Cyclomatic complexity tracks LOC closely when aggregated to files, less so per method. Same pattern as 4.18–4.21 and 4.25.

---

### 4.24 Chowdhury, Uddin and Holmes, "An empirical study on maintainable method size in Java" (MSR 2022). VERIFIED (arXiv full text)

- **Citation:** Shaiful Alam Chowdhury, Gias Uddin, Reid Holmes, _Proc. MSR 2022_, pp. 252–264, https://doi.org/10.1145/3524842.3527975 ; arXiv:2205.01842 v1. Data: https://github.com/shaifulcse/MaintainableSLOC-data . (Lead listed Holmes, Zaidman and Kazman; the MSR paper is Chowdhury, Uddin and Holmes.)
- **Method:** "785,606 Java methods" (getters/setters removed) from 49 open-source projects, method histories via CodeShovel; 520,874 methods after a two-year age window. Kendall's τ between SLOC and change-/bug-proneness per project. Threshold from Alves et al.'s benchmark method (4.29), then compared across size classes; decomposition approximated by merging small methods called only by one caller.
- **What it says:** Abstract: "developers should strive to keep their Java methods under 24 lines in length". 24 is where "the first critical value in Figure 3 is 24" "because it covers 70% of the y-axis" (36 and 63 at 80% and 90%). On formatting: they computed SLOCPretty, where "we convert every source code to a common format", and found "SLOCPretty performs the worst whereas SLOCStandard performs the best" "although with negligible effect sizes". SLOC's correlation with bugs is weaker than with change: "Correlations between SLOC and bug-proneness (i.e., #BuggyCommits) are significantly lower". Projects differ widely: τ with revisions is "only 0.05" for docx4j but 0.56 for voldemort. On Visser's 15 lines: "this recommendation was from intuition only, not based on evidence". On Checkstyle's default of 150: "this limit should be set to 24 only".
- **Numbers:** Decomposition: merged groups were cheaper in 84 of 115 project–indicator cells (73%; 87% counting only non-negligible effects).
- **Caveat:** The 24 is a percentile of the benchmark's code volume (4.29 method), then shown to separate maintenance outcomes; it is not an outcome-derived cliff. Change counts naturally grow with lines. For decomposition they needed a project in two versions, but "Unfortunately, such a project does not exist.", so "decomposition" is inferred from existing small helper methods, not from refactoring. Java only, open source, keyword-based bug labels (about 80% accurate, per prior work the authors cite).
- **For the post:** The best modern evidence that longer methods change more, and the only study that checks whether a formatter-normalized line count behaves differently (it barely does). It still derives its number from what's common, and the same group later found weaker correlations with stricter measurement (4.26).
- **Text:** `scratchpad/length-lit/A/text/chowdhury-uddin-holmes-msr2022-arxiv.txt`

### 4.25 Chowdhury, Holmes, Zaidman and Kazman, "Revisiting the debate: are code metrics useful for measuring maintenance effort?" (EMSE 2022). VERIFIED (authors' preprint)

- **Citation:** Shaiful Chowdhury, Reid Holmes, Andy Zaidman, Rick Kazman, _Empirical Software Engineering_ 27(6), article 158, 2022, https://doi.org/10.1007/s10664-022-10193-8 ; read at https://www.cs.ubc.ca/~rtholmes/papers/emse_2022_chowdhury_preprint.pdf (TU Delft copy refused connections; Springer served a JavaScript challenge).
- **Method:** "730K Java methods originating from 47 popular open source projects", seven method-level metrics, change-proneness indicators; bivariate vs multivariate regression to separate size.
- **What it says:** Prior contradictions come from size: "size was found to be a good predictor of other code metrics", and "the widely adopted size normalization approach fails to neutralize the size influence". With regression, "code metrics are indeed good maintenance predictors" "even when their correlation with size is neutralized". Context matters: "nested block depth is not as good a predictor for large methods". Takeaway: "evaluation context is king".
- **Caveat:** Change-proneness only; Java; same group as 4.24.
- **For the post:** At method level, depth and complexity carry some signal beyond length (unlike at file level), which supports keeping structural rules while dropping raw length caps.
- **Text:** `scratchpad/length-lit/A/text/chowdhury-holmes-zaidman-kazman-emse2022-preprint.txt`

### 4.26 Ahmad, Chowdhury and Holmes, "Impact of methodological choices on the analysis of code metrics and maintenance" (JSS 2025). VERIFIED (authors' preprint)

- **Citation:** Syed Ishtiaque Ahmad, Shaiful Chowdhury, Reid Holmes, _Journal of Systems and Software_ 220, 112263, Feb 2025, https://doi.org/10.1016/j.jss.2024.112263 ; read at https://cs.ubc.ca/~rtholmes/papers/jss_2024_ahmad.pdf
- **Method:** "1,598,592 Java methods from 53 open-source" projects; compares SLOC choices (initial, final, mean, versioned), density vs counts, time windows, aggregation.
- **What it says:** "a large number of the methods (41%) were never modified after their introduction". With versioned SLOC, "the strength of the correlation between SLOC and maintenance" "is not as strong as has been previously claimed". Using density flips signs: "small methods have a higher density in the number of revisions".
- **For the post:** Even the strongest recent method-size evidence is sensitive to how size is measured, and the old density artifact (4.1, 4.10) reappears in modern data.
- **Text:** `scratchpad/length-lit/A/text/ahmad-chowdhury-holmes-jss2025-ubc.txt`

### 4.27 Pascarella, Palomba and Bacchelli, "On the performance of method-level bug prediction: a negative result" (JSS 2020). VERIFIED (metadata + abstract)

- **Citation:** Luca Pascarella, Fabio Palomba, Alberto Bacchelli, _Journal of Systems and Software_ 161, 110493, March 2020, https://doi.org/10.1016/j.jss.2019.110493 . The ZORA copy (https://www.zora.uzh.ch/id/eprint/197697/1/Pascarella_JSS_2019.pdf) is behind Anubis bot protection; abstract from the Semantic Scholar API.
- **What it says:** Replicated method-level models held up under the original evaluation, but "when evaluated with a more practical strategy," "all the models show a dramatic drop in performance" "with results close to that of a random classifier"; alternative features did not help; "method-level bug prediction is still an open challenge".
- **For the post:** Method-level metrics, size included, are weak at telling which method will have a bug next release.
- **Text:** `scratchpad/length-lit/A/src/s2-pascarella.json`

### 4.28 Chowdhury, Uddin, Hemmati and Holmes, "Method-level bug prediction: problems and promises" (TOSEM 2024). VERIFIED (authors' preprint)

- **Citation:** Shaiful Chowdhury, Gias Uddin, Hadi Hemmati, Reid Holmes, _ACM TOSEM_ 33(4), pp. 1–31, 2024, https://doi.org/10.1145/3640331 ; read at https://www.cs.ubc.ca/~rtholmes/papers/tosem_2024_chowdhury.pdf (line numbers stripped in the `-clean` text).
- **Method:** Three public method-level bug datasets plus 774,051 Java methods from 49 projects; time-sensitive evaluation.
- **What it says:** "The reported high accuracies of these models dwindle significantly" under realistic evaluation; precision fell (e.g., 60% drop in precision). Size matters to the model itself: "the accuracy is always significantly lower in small methods than in large methods". The size-confound criticism "is valid only at coarse-level granularities". "the bug-proneness of a method decays consistently as it ages".
- **For the post:** Supports 4.27: prediction from static metrics is weak at the method level.
- **Text:** `scratchpad/length-lit/A/text/chowdhury-tosem2024-ubc-clean.txt`

### 4.29 Alves, Ypma and Visser, "Deriving metric thresholds from benchmark data" (ICSM 2010). VERIFIED (authors' copy); Vendor (Software Improvement Group)

- **Citation:** Tiago L. Alves, Christiaan Ypma, Joost Visser (all SIG), _Proc. 26th ICSM_, pp. 1–10, 2010, https://doi.org/10.1109/ICSM.2010.5609747 ; read at http://web.archive.org/web/20220707084528/http://wiki.di.uminho.pt/twiki/pub/Personal/Tiago/Publications/icsm10rt-alves.pdf (linked from Alves's University of Minho page).
- **Method:** 100 Java and C# systems (SIG clients and open source), "The system sizes range from over 3K LOC to near 800K LOC"; method-level metrics weighted by code volume, pooled, thresholds at fixed percentiles of code.
- **What it says:** Prior thresholds were "mostly based on expert opinion". Theirs are explicitly not outcome-based: "In contrast to using errors to derive thresholds," the method "derives meaningful thresholds which represent overall volume of code from a benchmark of systems". Validation against external quality is listed as future work.
- **Numbers (Table IV):** unit size (method LOC) 30 / 44 / 74 at 70 / 80 / 90% of code; unit complexity (McCabe) 6 / 8 / 14; unit interfacing (parameters) 2 / 3 / 4 at 80 / 90 / 95%.
- **Caveat:** A percentile says what is common in the benchmark, not where defects rise. A tool vendor's method, used in its certification business.
- **For the post:** The template for "data-derived" thresholds, including Chowdhury's 24 (4.24). Say plainly that they describe the distribution, not risk.
- **Text:** `scratchpad/length-lit/A/text/alves-ypma-visser-icsm2010-author.txt`

### 4.30 Visser et al., _Building Maintainable Software, Java Edition: Ten Guidelines for Future-Proof Code_ (O'Reilly 2016). VERIFIED (full text, SIG 'compliments of' edition); Vendor (Software Improvement Group)

- **Citation:** Joost Visser (the book's "About the Authors" also lists Sylvan Rigal, Rob van der Leek, Pascal van Eck and Gijs Wijnholds), O'Reilly Media, first release Dec 2015 (©2016 Software Improvement Group B.V.); this edition prints ISBN 978-1-491-94434-9. Read: the PDF SIG serves from https://www.softwareimprovementgroup.com/resources/building-maintainable-software (front cover 'Compliments of' SIG).
- **What it says:** Ch. 2: "Limit the length of code units to 15 lines of code." Ch. 5: "Limit the number of parameters per unit to at most 4."; the four comes from judgment: "In practice, an upper bound of four seems reasonable". But the book also says "The guidelines in this book present metric thresholds as an absolute rule.", while in practice "resolving all violations is neither necessary nor profitable", and an all-or-nothing view "may lead developers to ignore the violations altogether". SIG rates codebases by quality profile instead. Lines are physical lines, since "A line may have more than one statement": a line counts if it "neither is empty nor contains only a comment". On gaming by layout: "Do not try to comply with guideline" "by cutting corners in the area of formatting", and "Our experience is that 15 lines of properly formatted code is enough".
- **Numbers:** 4-star unit size (2015 SIG/TÜViT criteria, Table 2-2): at most 6.9% of code in methods over 60 lines, 22.3% over 30, 43.7% over 15; "At least 56.3%" at 15 or fewer. Parameters (Table 5-1): at most 0.7% of code in units with more than seven, 2.7% with five or more, 13.8% with three or more. SIG claims "issue resolution and enhancements are twice as fast" "in systems with 4 stars than in systems with 2 stars" (no data shown).
- **Caveat:** Vendor book. The 15-line cut-off differs from the 30-line 70th percentile Alves et al. derived in 2010 (4.29); the book doesn't explain the change. Chowdhury et al. (4.24) call the 15 "from intuition only". A 4-star rating tolerates 43.7% of code in units over 15 lines, so SIG itself doesn't apply 15 lines per function as a gate.
- **For the post:** The source of '15 lines, 4 parameters', and its own authors' warning that per-violation enforcement backfires. Good for the post's argument that a hard per-function limit is not how even its proponents use it.
- **Text:** `scratchpad/length-lit/A/text/visser-building-maintainable-software-sig.txt`

---

### 4.31 Chowdhury, _The good, the bad, and the monstrous: predicting highly change-prone source code methods at their inception_ (arXiv 2024). VERIFIED (preprint full text)

- **Citation:** Shaiful Chowdhury, arXiv:2408.05704 v2. No published version found.
- **Method:** 774,051 methods from 49 Java projects.
- **What it says:** "approximately 80% of changes are concentrated in just 20% of the methods". A single metric doesn't find them: "metrics such as size or complexity (e.g., McCabe) alone are insufficient for capturing" them; the correlation with change "is only weak to" moderate. Manual analysis found "surprisingly monstrous" methods that "experienced frequent changes despite being small and less complex".
- **For the post:** Size is a weak single signal for where change happens.
- **Text:** `scratchpad/length-lit/A/text/arxiv-2408.05704.txt`

### 4.32 Friesen, Morton-Salmon, Opu, Islam and Chowdhury, "The repeat offenders: characterizing and predicting extremely bug-prone source methods" (arXiv 2025). VERIFIED (preprint full text)

- **Citation:** arXiv:2511.22726 v2. No published version found.
- **Method:** "over 1.25 million methods extracted from 98 open-source Java projects"; manual analysis of 287 ExtremelyBuggy methods.
- **What it says:** "ExtremelyBuggy methods are significantly larger, less readable, and more complex" at inception, yet they "remain difficult to predict at their inception". One theme: methods that "started with a few lines of code but got much larger over time".
- **For the post:** Very large methods are over-represented among the worst offenders, which supports a generous outlier check rather than a tight cap. Growth over time matters, which a linter sees only at the current size.
- **Text:** `scratchpad/length-lit/A/text/arxiv-2511.22726.txt`

### 4.33 Antal, Tóth, Hegedűs and Ferenc, "Enhanced bug prediction in JavaScript programs" with hybrid call-graph metrics (Technologies 2020/21). VERIFIED (repository copy)

- **Citation:** Gábor Antal, Zoltán Tóth, Péter Hegedűs, Rudolf Ferenc, _Technologies_ 9(1), article 3 (published 30 Dec 2020), https://doi.org/10.3390/technologies9010003 ; read at http://publicatio.bibl.u-szeged.hu/24544/1/technologies-09-000031.pdf (MDPI returned 403).
- **Method:** "824 buggy and 1943 non-buggy functions from the publicly available BugsJS dataset" (ESLint project); features include "static size metrics (LOC, LLOC, NOS)".
- **Caveat:** It doesn't report size alone, so it says nothing about length limits specifically.
- **For the post:** The closest JavaScript function-level study found; no JS/TS study isolates function or file length against defects or change. Say so.
- **Text:** `scratchpad/length-lit/A/text/antal-toth-hegedus-ferenc-2021-technologies.txt`

---

### 4.34 Sjøberg, Yamashita, Anda, Mockus and Dybå: smells and maintenance effort once file size is controlled (IEEE TSE 2013). VERIFIED (accepted manuscript)

- **Citation:** Dag I. K. Sjøberg, Aiko Yamashita, Bente Anda, Audris Mockus, Tore Dybå, _Quantifying the Effect of Code Smells on Maintenance Effort_, IEEE TSE 39(8), pp. 1144–1156, 2013. https://doi.org/10.1109/TSE.2012.89 ; read: https://web-backend.simula.no/sites/default/files/publications/Simula.simula.1460.pdf (accepted version, "not been fully edited").
- **Method:** six professional developers, three maintenance tasks each, on four functionally equivalent Java systems; 298 Java files modified; an Eclipse plug-in timed effort per file; regression of effort on 12 smells, file size and number of changes.
- **What it says:** "None of the 12 investigated smells was significantly associated with increased effort" "after we adjusted for file size and the number of changes". "File size and the number of changes explained almost all" "of the modeled variation in effort." Advice: "a focus on reducing code size" "may be more beneficial than refactoring code smells".
- **Long Method was not studied.** "We did not investigate those smells because the tools we used" "(InCode and Borland Together) do not support them." The tools offered God Method instead. The authors define the difference: "Long Methods have a large number of lines of code." Because size drove effort, they guess size-only smells "would probably be good indicators of code that requires more effort to maintain."
- **Numbers:** correlation of file LOC with effort ρ = 0.37, 0.61, 0.58 and 0.48 in the four systems (p < 0.01). Adjusted R² 0.15 with covariates only; 0.36 with the 12 smells added.
- **Caveat:** neither Long Method nor Long Parameter List is among the 12 smells, so this paper can't be cited to show that Long Method doesn't matter. Effort is per file, and a max-lines rule doesn't shrink total code, it moves it between files and functions. Thresholds were the tools' fixed, unconfigurable values.
- **For the post:** the strongest controlled evidence that size, not the smell label, carries the effect. Use it to argue that limits which redistribute lines don't touch the variable that mattered.
- **Text:** `scratchpad/length-lit/D/text/sjoberg-tse2013-raw.txt`

### 4.35 Khomh, Di Penta, Guéhéneuc and Antoniol: antipatterns and change- and fault-proneness (EMSE 2012). VERIFIED (author-hosted Springer PDF)

- **Citation:** Foutse Khomh, Massimiliano Di Penta, Yann-Gaël Guéhéneuc, Giuliano Antoniol, _An exploratory study of the impact of antipatterns on class change- and fault-proneness_, EMSE 17(3), pp. 243–275, 2012 (online 2011). https://doi.org/10.1007/s10664-011-9171-y ; read: https://swat.polymtl.ca/~foutsekh/docs/Prop-EMSE.pdf (33 pp., Springer layout).
- **Method:** 13 antipatterns detected with DECOR in 54 releases of ArgoUML, Eclipse, Mylyn and Rhino; Fisher's exact tests and logistic regression on change- and fault-fixing changes per class.
- **Definitions (class-level):** LongMethod is "A class that has a method that is overly long, in term of LOCs." LongParameterList is a class with a method whose parameter list is too long "with respect to the average number of parameters per methods in the system". Both are relative to the system, not fixed numbers.
- **What it says:** classes in antipatterns are more change- and fault-prone, and "size alone cannot explain the higher" "odds of classes with antipatterns". Per smell, change-proneness was significant only for "LongMethod in ArgoUML, Eclipse, and Mylyn; LongParameterList" "in ArgoUML and Eclipse". "We conclude that classes participating in antipatterns are generally larger than" other classes, but "size only does not explain the classes greater" change- and fault-proneness. They note "automatically-generated parsers are often Spaghetti Code".
- **Caveat:** the size control compared only classes above the 75th size percentile with and without Blob, ComplexClass or LargeClass; the test "only reported statistical significance in a small number of cases". LongMethod and LPL were not size-controlled. Analysis is per class, not per method.
- **For the post:** the paper most often cited for the claim that long methods are fault-prone. It shows correlation at class level, with relative thresholds, in Java from the 2000s. It does not show that a fixed per-function line cap prevents faults.
- **Text:** `scratchpad/length-lit/D/text/khomh-emse2012.txt`

### 4.36 Palomba, Bavota, Di Penta, Fasano, Oliveto and De Lucia: diffuseness and impact of 13 smells (EMSE 2018). VERIFIED (open-access Springer PDF via Wayback)

- **Citation:** Fabio Palomba, Gabriele Bavota, Massimiliano Di Penta, Fausto Fasano, Rocco Oliveto, Andrea De Lucia, _On the diffuseness and the impact on maintainability of code smells: a large scale empirical investigation_, EMSE 23(3), pp. 1188–1221, 2018 (online 7 Aug 2017; CC BY). https://doi.org/10.1007/s10664-017-9535-z ; read: http://web.archive.org/web/20230729213730/https://link.springer.com/content/pdf/10.1007/s10664-017-9535-z.pdf
- **Method:** 395 releases of 30 Java projects; a simple detector followed by manual validation by two authors; 17,350 validated instances of 13 smells; change- and fault-proneness compared for smelly and clean classes and for the same classes before and after a smell.
- **Detection rules:** Long Method is "All methods having LOCs higher than the average of the system." LPL is "All methods having a number of parameters higher than the average of the system." On purpose, "our detection tool uses very simple rules that overestimate the presence of code smells", then humans removed false positives.
- **Numbers:** Long Method in 331 of 395 releases (84%), 44 instances per affected release on average, density 28 per KLOC, the most diffused smell. Median change-proneness 32 for smelly classes versus 12; median bug fixes 9 versus 3 (Cliff's d 0.68 and 0.41). Logistic model ORs (change): smell 4.46, size 1.7, interaction 8.41; (defects) 1.74, 0.93, 2.11, where "only the interaction between the independent variables is statistically significant".
- **What it says:** many Long Method instances were SQL parsers in Derby (methods averaging 259 LOC), where "the inherent complexity of such parsing methods" made shorter code hard. "Removing code smells is beneficial most of the times for the code change-proneness", but "we found no substantial differences between the fault-proneness of classes" with and without smells over time. Conclusion: "code smells are not necessarily the direct cause of the class" fault-proneness. Their Table 10 rates the effect of removing Long Method as High for change-proneness and Limited for fault-proneness, and of removing LPL as Limited for both.
- **Caveat:** "Long" means above the project's mean, validated by humans: not a fixed threshold. Analysis is at class level. Fewer changes after a refactoring can also reflect a class going quiet.
- **For the post:** the best large study, and it cuts both ways: long methods are everywhere and sit in classes that change a lot, but removing the smell didn't change fault-proneness.
- **Text:** `scratchpad/length-lit/D/text/palomba-emse2018.txt`

### 4.37 Moha, Guéhéneuc, Duchien and Le Meur: DECOR rule cards and relative thresholds (IEEE TSE 2010). VERIFIED (HAL copy via Wayback)

- **Citation:** Naouel Moha, Yann-Gaël Guéhéneuc, Laurence Duchien, Anne-Françoise Le Meur, _DECOR: A Method for the Specification and Detection of Code and Design Smells_, IEEE TSE 36(1), pp. 20–36, 2010. https://doi.org/10.1109/TSE.2009.50 ; read: http://web.archive.org/web/20231203004056/https://inria.hal.science/inria-00538476v1/file/Moha10a.pdf
- **What it says:** ordinal values like "very high" "are used to define values relative to all the classes" "of the system under analysis", set with box plots "while avoiding setting artificial thresholds". Granularity is the class: "a rule detecting long methods reports the classes defining these methods". In Xerces, a 759-LOC method was flagged because "the upper method length computed using the box-plot is" "254.5 LOC".
- **Caveat:** DECOR's Long Method is a component of Spaghetti Code (long methods with no parameters, no inheritance, global variables), not a standalone line cap.
- **For the post:** the research tool behind Khomh et al. treats "long" as an outlier within one codebase, the opposite of a universal number.
- **Text:** `scratchpad/length-lit/D/text/moha-decor-tse2010.txt`

### 4.38 Yamashita and Moonen: what maintainers said about size (ICSM 2012), and inter-smell relations (ICSE 2013). VERIFIED (Simula technical-report versions)

- **Citations:** Aiko Yamashita, Leon Moonen, _Do code smells reflect important maintainability aspects?_, ICSM 2012, pp. 306–315. https://doi.org/10.1109/ICSM.2012.6405287 ; read: https://web-backend.simula.no/sites/default/files/publications/Simula.simula.1278.pdf (marked "Simula Research Laboratory, Technical Report (2012-10)"). _Exploring the impact of inter-smell relations on software maintainability: An empirical study_, ICSE 2013, pp. 682–691. https://doi.org/10.1109/ICSE.2013.6606614 ; read: https://web-backend.simula.no/sites/default/files/publications/Simula.simula.1508.pdf
- **Method:** the same Simula setting as 4.34: expert assessments of four Java systems plus observation and interviews with developers who maintained them for 14 working days.
- **What it says (ICSM):** one developer: "Size of methods and classes is important, because I need to remember" "after reading a method what was it about!" But the same factor ("Simplicity") also covered too many pieces: "The large number of classes required time to understand the code at higher level", there was "a large proportion of 'empty classes'", and "I spent more time for understanding than for coding." Under "Logic Spread": "It was difficult in B to find the places to perform the changes" "because of the logic spread".
- **ICSE 2013:** same 12 smells as 4.34 (God Method, not Long Method); "code smell interactions occurred across coupled artifacts".
- **Caveat:** qualitative, four systems, a handful of developers. The copies read are technical-report versions.
- **For the post:** a rare primary source where maintainers complain about both sides: methods too big to hold in mind, and code spread over so many small classes that they couldn't find where to change it.
- **Text:** `scratchpad/length-lit/D/text/yamashita-icsm2012.txt`, `scratchpad/length-lit/D/text/yamashita-1508.txt`

### 4.39 Yamashita and Moonen: do developers care about code smells? (WCRE 2013). VERIFIED (Simula copy)

- **Citation:** Aiko Yamashita, Leon Moonen, _Do developers care about code smells? An exploratory survey_, WCRE 2013, pp. 242–251. https://doi.org/10.1109/WCRE.2013.6671299 ; read: https://web-backend.simula.no/sites/default/files/publications/codesmellsurvey.pdf
- **Method:** 85 professional developers recruited on Freelancer.com; 73 completed.
- **What it says:** "respondents stated that they did not know about code smells" (32%). Among smells named as important, "Duplicated code was by far the most mentioned smell". Respondents asked for "customizable detection strategies".
- **Numbers:** Borda-style points: Duplicated code 19.53, Long method 9.78 (2nd), Accidental complexity 8.32, Large class 7.09, Long parameter list 2.31 (9th).
- **Caveat:** freelance sample; ranking of named smells, not of harm.
- **For the post:** developers do rank Long Method high among smells they know, and Long Parameter List far lower. They also ask for context-sensitive detection, not fixed limits.
- **Text:** `scratchpad/length-lit/D/text/yamashita-wcre2013.txt`

### 4.40 Tufano et al.: when smells appear and whether they go away (IEEE TSE 2017). VERIFIED (accepted version via Wayback)

- **Citation:** Michele Tufano, Fabio Palomba, Gabriele Bavota, Rocco Oliveto, Massimiliano Di Penta, Andrea De Lucia, Denys Poshyvanyk, _When and Why Your Code Starts to Smell Bad (and Whether the Smells Go Away)_, IEEE TSE 43(11), pp. 1063–1088, 2017. https://doi.org/10.1109/TSE.2017.2653105 ; read: http://web.archive.org/web/2024/https://www.iris.unisa.it/bitstream/11386/4703700/2/J4.pdf
- **Method:** 200 open-source projects, 579,671 commits mined, over 10K commits classified by hand; five class-level smells (Blob, Class Data Should Be Private, Complex Class, Functional Decomposition, Spaghetti Code).
- **What it says:** "most of the smell instances are introduced when an artifact is created". "80% of smells survive in the system", and of removed ones, "only 9% is removed as a direct consequence of refactoring operations". Most removals happen because code is deleted: they "are removed as a simple consequence" "of the deletion of the smelly artifact" (40%).
- **Caveat:** Long Method and Long Parameter List are not among the five; Spaghetti Code is "a class without structure that declares long methods without parameters".
- **For the post:** context for agents: size problems tend to be born with the code, which argues for feedback at write time rather than later cleanup. Don't cite it for Long Method specifically.
- **Text:** `scratchpad/length-lit/D/text/tufano-tse2017.txt`

### 4.41 Bavota, De Lucia, Di Penta, Oliveto and Palomba: where developers actually refactor (JSS 2015). VERIFIED (metadata + abstract)

- **Citation:** _An experimental investigation on the innate relationship between quality and refactoring_, JSS 107, pp. 1–14, 2015. https://doi.org/10.1016/j.jss.2015.05.024 ; abstract read from the authors' dataset record https://figshare.com/articles/dataset/An_Experimental_Investigation_on_the_Innate_Relationship_between_Quality_and_Refactoring/1207916 (Elsevier full text not opened).
- **What it says:** in three Java projects, "quality metrics do not show a clear relationship with refactoring". "42% of refactoring operations are performed on code entities affected by code smells", yet "only 7% of the performed operations actually remove the code smells".
- **Caveat:** abstract only; three projects; mined refactorings, not intent.
- **For the post:** developers' refactoring doesn't follow metric thresholds, and rarely removes the smell when it touches it.
- **Text:** `scratchpad/length-lit/D/text/bavota-jss2015-figshare-abstract.txt`

### 4.42 Kim, Zimmermann and Nagappan: refactoring benefits and risks at Microsoft (FSE 2012). VERIFIED (author PDF); Vendor (Microsoft)

- **Citation:** Miryung Kim, Thomas Zimmermann, Nachiappan Nagappan, _A field study of refactoring challenges and benefits_, FSE 2012, article 50, pp. 1–11. https://doi.org/10.1145/2393596.2393655 ; read: https://web.cs.ucla.edu/~miryung/Publications/fse2012-fieldrefactoring.pdf
- **Method:** survey sent to 1,290 engineers whose check-ins mentioned "refactor", 328 responded; interviews with a Windows 7 refactoring team; version history.
- **What it says:** 77% "of the participants consider that refactoring comes with a" "risk of introducing subtle bugs and functionality regression". Benefits reported include "improved readability (43%)". In the version history, "the top 25% of frequently refactored binaries" "reduced the number of post-release defects 12.2% more" than other modified binaries.
- **Caveat:** refactoring in general, not Long Method or method extraction specifically; one company.
- **For the post:** refactoring to satisfy a limit is not free: developers name regressions as its main risk.
- **Text:** `scratchpad/length-lit/D/text/kim-fse2012.txt`

### 4.43 Olbrich, Cruzes and Sjøberg: God and Brain Classes after normalising for size (ICSM 2010). VERIFIED (metadata + abstract)

- **Citation:** Steffen M. Olbrich, Daniela S. Cruzes, Dag I. K. Sjøberg, _Are all code smells harmful? A study of God Classes and Brain Classes in the evolution of three open source systems_, ICSM 2010, pp. 1–10. https://doi.org/10.1109/ICSM.2010.5609564 ; abstract from OpenAlex.
- **What it says:** unnormalised, these classes changed more and had more defects. But "when we normalized the measured effects with respect to size", "God and Brain Classes were less subject to change and had fewer defects", so "such classes may be an efficient way of organizing code".
- **Caveat:** classes, not functions; abstract only. Dividing by size has its own artefacts (the size-and-defect section covers them).
- **For the post:** a direct example of a size-related smell flipping sign once size is accounted for.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1109_ICSM.2010.5609564.abstract.txt`

### 4.44 Hall, Zhang, Bowes and Sun: some smells have a significant but small effect on faults (TOSEM 2014). VERIFIED (accepted manuscript)

- **Citation:** Tracy Hall, Min Zhang, David Bowes, Yi Sun, _Some Code Smells Have a Significant but Small Effect on Faults_, ACM TOSEM 23(4), article 33, 2014. https://doi.org/10.1145/2629648 ; read: https://eprints.lancs.ac.uk/id/eprint/127419/1/Tosem_code_smells.pdf
- **What it says:** "File size alone affects faults in some systems but not in all systems." Where smells mattered, the effect was "(always under 10 per cent)". Conclusion: "arbitrary refactoring is unlikely to significantly reduce fault-proneness".
- **Caveat:** the five smells studied (Data Clumps, Switch Statements, Speculative Generality, Message Chains, Middle Man) don't include Long Method or LPL.
- **For the post:** context only, for the general point that refactoring to remove a detected smell is a weak lever on faults.
- **Text:** `scratchpad/length-lit/D/text/hall-tosem2014.txt`

### 4.45 Abbes et al. (CSMR 2011) and Politowski et al. (IST 2020): Blob and Spaghetti Code in comprehension experiments. VERIFIED (Abbes: metadata + abstract; Politowski: arXiv preprint)

- **Citations:** Marwen Abbes, Foutse Khomh, Yann-Gaël Guéhéneuc, Giuliano Antoniol, CSMR 2011, pp. 181–190, https://doi.org/10.1109/CSMR.2011.24 . Cristiano Politowski, Foutse Khomh, Simone Romano, Giuseppe Scanniello, Fabio Petrillo, Yann-Gaël Guéhéneuc, Abdou Maiga, _A large scale empirical study of the impact of Spaghetti Code and Blob anti-patterns on program comprehension_, IST 122, 106278, 2020, https://doi.org/10.1016/j.infsof.2020.106278 ; read: https://arxiv.org/pdf/2009.02438
- **What they say:** Abbes (three experiments, 24 subjects each): "the occurrence of one antipattern does not significantly decrease developers' performance" while combinations did. Politowski (133 participants, 372 tasks, three universities): "single occurrences of Blob or Spaghetti code anti-patterns have little effect on code comprehension"; two occurrences increased time and effort and reduced correctness.
- **Caveat:** students; composite antipatterns (Spaghetti Code includes long methods but also globals and no parameters), not method length alone.
- **For the post:** the controlled comprehension evidence against long, tangled code is about accumulation, not a single long unit.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1109_CSMR.2011.24.abstract.txt`, `scratchpad/length-lit/D/text/arxiv-2009.02438.txt`

---

### 4.46 Letovsky and Soloway: delocalized plans (IEEE Software 1986). VERIFIED (scan on a Kent State course page)

- **Citation:** Stanley Letovsky, Elliot Soloway, _Delocalized Plans and Program Comprehension_, IEEE Software 3(3), pp. 41–49, May 1986. https://doi.org/10.1109/MS.1986.233414 ; read: https://www.cs.kent.edu/~jmaletic/cs69995-PC/papers/letovsky-1986-software.pdf (OCR is rough in places).
- **Method:** think-aloud protocols of six professional maintainers (four expert, two junior) adding a feature to a FORTRAN database program; "Three of the six subjects completed the task in the allotted 90" minutes.
- **What it says:** the central claim is that "the likelihood of a reader's correctly recognizing a plan in a" program "decreases when the lines of code are spread out or" "delocalized in the text of the program". "delocalized plans are more liable to misinterpretation than plans whose" "code is closely grouped." Their remedies are documentation, e.g. "Document variable goals as well as roles."
- **Caveat:** six people, qualitative; delocalization here is data flow spread across a program, not method extraction as such. They recommend documenting, not inlining.
- **For the post:** the classic statement of the cost of splitting: if a plan's pieces end up in different functions or files, readers guess from local clues and guess wrong.
- **Text:** `scratchpad/length-lit/D/text/letovsky-1986.txt`

### 4.47 Silva da Costa et al.: Extract Method versus Inline Method, eye-tracked (JSS 2026). VERIFIED (arXiv v3 full text; Crossref record)

- **Citation:** José Aldo Silva da Costa, Rohit Gheyi, José Júnior Silva da Costa, Márcio Ribeiro, Rodrigo Bonifácio, Hyggo Almeida, Ana Carla Bibiano, Alessandro Garcia, _Refactoring for novices in Java: An eye tracking study on the extract vs. inline methods_, JSS 237, article 112825, July 2026. https://doi.org/10.1016/j.jss.2026.112825 ; read: https://arxiv.org/pdf/2602.18579 (v3, 5 Mar 2026).
- **Method:** 32 Java novices, eight tasks each (four inlined, four extracted) on programs of 6–18 lines (median 12); time, attempts, fixations and regressions; plus a survey of 58 more novices.
- **What it says:** in two tasks extraction helped, "time decreasing by up to 78.8% and regressions by 84.6%". In simpler tasks the reverse: "time increased by up to 166.9% and regressions by 200%". "even well-named methods can disrupt novices' linear reasoning". Survey preferences "did not always align with their performance". The authors advise "caution when applying premature modularization to" "novices in Java".
- **Caveat:** novices, tiny programs, one extracted method per program. Doesn't speak to experts or large functions.
- **For the post:** the one controlled experiment found comparing the same code inlined and extracted: extraction is not free, and helps or hurts depending on the task.
- **Text:** `scratchpad/length-lit/D/text/arxiv-2602.18579.txt`

### 4.48 Braver and Feitelson: how developers extract functions from a flattened function (PPIG 2023). VERIFIED (author PDFs: PPIG version and arXiv version)

- **Citation:** Alexey Braver, Dror G. Feitelson, _How Developers Extract Functions: An Experiment_, 34th Annual Workshop of the Psychology of Programming Interest Group (PPIG 2023); arXiv:2209.01098. Read: https://www.cse.huji.ac.il/~feit/papers/Func23PPIG.pdf and https://www.cse.huji.ac.il/~feit/papers/Func22.pdf . Listing: https://ppig.org/papers/2023-ppig-34th-braver/ (page range 142–156 seen only in a search snippet of the Zenodo record).
- **Method:** a real Python function and its callees inlined into one 208-line function; 34 responses, 23 submitted refactored code (recruited via contacts and two Reddit forums; 57% had up to 2 years' industry experience).
- **What it says:** "developers tend to extract functions based on structural cues", mostly `if` (77 of 142 functions) and `try` (31) blocks. Divergence was large: "the number of functions that were extracted was between 3 and 10", and "the amount of code extracted into functions ranged from 37% to 95%". "80% of the extracted functions had 5–30 lines of code". Asked for an ideal length, "the most common answer was that there is no ideal length of function"; the two length considerations ranked lowest of the eight offered (2.72 and 2.65 out of 5), below "Not needing to pass too many arguments" (3.10). On block-based extraction: "It doesn't even require the participants to understand the code's logic." "So short functions are not an end in themselves".
- **Caveat:** small, self-selected sample; one function; the task told people to extract, which the authors say may inflate extraction. The discussion section says "10-30 lines" where the results say 5–30.
- **For the post:** splitting is not deterministic: given the same function, developers disagree threefold on how much to split. Splitting on block boundaries is the move that needs no understanding, which is the move a limit rewards.
- **Text:** `scratchpad/length-lit/D/text/feit-Func23PPIG.txt`, `scratchpad/length-lit/D/text/feit-Func22.txt`

### 4.49 Jbara and Feitelson: regular code is long but easy (ICPC 2014; EMSE 2017; Feitelson CACM 2023). VERIFIED (author PDFs)

- **Citations:** Ahmad Jbara, Dror G. Feitelson, _On the effect of code regularity on comprehension_, ICPC 2014, pp. 189–200, https://doi.org/10.1145/2597008.2597140 ; _How programmers read regular code: a controlled experiment using eye tracking_, EMSE 22(3), pp. 1440–1477, 2017, https://doi.org/10.1007/s10664-016-9477-x (extends ICPC 2015, not ICPC 2014). Dror G. Feitelson, _From Code Complexity Metrics to Program Comprehension_, CACM 66(5), pp. 48–57, 2023. Read: https://www.cse.huji.ac.il/~feit/papers/Reg14ICPC.pdf , RegEye17EmpSE.pdf , Comp23CACM.pdf
- **Method:** ICPC 2014: two experiments with students (64 and 39 analysed) on regular and non-regular versions of the same functions. EMSE 2017: eye tracking, "18 students and 2 faculty members".
- **What it says:** "versions with significant regularity lead to better" "comprehension, while taking similar time, despite being longer" and having higher MCC. "This leads us to renounce the" "direct use of MCC and LOC as major guidelines". Eye tracking: "initial code segments receive more focus and are looked at more times", "later ones may be only skimmed". CACM example: "the regular version was 49 lines long and had an MCC of 18", while "the non-regular one had only 33 lines of code" yet was harder.
- **Caveat:** students; small functions written for the experiments.
- **For the post:** a direct counterexample to line limits: the longer version was easier. Switch-like, table-like and repeated code reads at well under the cost per line that a limit assumes.
- **Text:** `scratchpad/length-lit/D/text/feit-Reg14ICPC.txt`, `scratchpad/length-lit/D/text/feit-RegEye17EmpSE.txt`, `scratchpad/length-lit/D/text/feit-Comp23CACM.txt`

### 4.50 Jbara, Matan and Feitelson: high-MCC functions in the Linux kernel (EMSE 2014). VERIFIED (author manuscript)

- **Citation:** Ahmad Jbara, Adam Matan, Dror G. Feitelson, _High-MCC Functions in the Linux Kernel_, EMSE 19(5), pp. 1261–1298, 2014. https://doi.org/10.1007/s10664-013-9275-7 ; read: https://www.cse.huji.ac.il/~feit/papers/HighMCC14EmpSE.pdf
- **What it says:** "the Linux kernel includes more than 800 functions with MCC values above 50", some of which evolve heavily. Many are "in fact well-structured", and "a high MCC is not necessarily an impediment to code comprehension"; regularity "correlates with low perceived complexity".
- **Caveat:** about MCC, though such functions are also long; perceived-complexity survey, not task performance.
- **For the post:** real-world support for 4.49 at scale: some very long, branchy functions are maintained successfully because they're regular.
- **Text:** `scratchpad/length-lit/D/text/feit-HighMCC14EmpSE.txt`

### 4.51 Cates, Yunik and Feitelson: intermediate variables (ICPC 2021). VERIFIED (arXiv full text)

- **Citation:** Roee Cates, Nadav Yunik, Dror G. Feitelson, _Does Code Structure Affect Comprehension? On Using and Naming Intermediate Variables_, ICPC 2021, pp. 118–126. https://doi.org/10.1109/ICPC52881.2021.00020 ; read: https://arxiv.org/pdf/2103.11008
- **Method:** 113 participants (58% with 3+ years' work experience), six mathematical functions, each in three versions: compound expression, intermediate variables with meaningless names, with meaningful names.
- **What it says:** "in only one case there was a significant difference between" "the two extreme versions", favouring meaningful intermediate variables, in the hardest function. They conclude "using intermediate variables" "is generally desirable", but "this recommendation hinges on" "giving them good names".
- **Caveat:** short functions; naming tasks as the comprehension measure.
- **For the post:** extract-variable adds statements and lines, so `max-statements` and `max-lines-per-function` count against a change that was neutral or helpful here. Compare 4.65, where respondents leaned the other way.
- **Text:** `scratchpad/length-lit/D/text/arxiv-2103.11008.txt`

### 4.52 Ljung and Gonzalez-Huerta: practitioners agree with Clean Code (PROFES 2022). VERIFIED (arXiv full text)

- **Citation:** Kevin Ljung, Javier Gonzalez-Huerta, _'To Clean Code or Not to Clean Code' A Survey Among Practitioners_, PROFES 2022, LNCS. https://doi.org/10.1007/978-3-031-21388-5_21 ; read: https://arxiv.org/pdf/2208.07056
- **What it says:** 39 practitioners completed the survey; they agreed with principles including "Methods/Functions should be small", and reported that "developers tend to write messy code to be refactored later".
- **Caveat:** 39 respondents; agreement, not outcomes.
- **For the post:** short functions are a belief most developers hold; the evidence above is what tests it.
- **Text:** `scratchpad/length-lit/D/text/arxiv-2208.07056.txt`

### 4.53 Sellitto et al.: refactoring and readability metrics in 156 projects (SANER 2022). VERIFIED (metadata + abstract)

- **Citation:** Giulia Sellitto, Emanuele Iannone, Zadia Codabux, Valentina Lenarduzzi, Andrea De Lucia, Fabio Palomba, Filomena Ferrucci, _Toward Understanding the Impact of Refactoring on Program Comprehension_, SANER 2022, pp. 731–742. https://doi.org/10.1109/SANER53432.2022.00090 ; abstract from OpenAlex (full text behind captcha and Cloudflare).
- **What it says:** across 156 projects, "refactoring has a notable impact on most of the readability metrics considered".
- **Caveat:** abstract only; eight automated readability metrics, not humans. Which refactorings help or hurt wasn't read.
- **For the post:** cite only to show that metric-level studies exist; not evidence about people.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1109_SANER53432.2022.00090.abstract.txt`

### 4.54 Cross-reference: comprehension and complexity research in `cognitive-complexity.md` §3

- Muñoz Barón et al. (ESEM 2020): no threshold recommendation; Peitek et al. (ICSE 2021): textual size (LOC) drives attention and vocabulary burdens working memory; Scalabrino et al. (ASE 2017; TSE 2021): code metrics barely predict understandability; Johnson et al. (ICSME 2019): less nesting, faster reading; Wyrich et al. (ICSE 2021): showing a metric anchors judgments; Saborido et al. (IEEE Access 2022): automated Extract Method sequences fixed 78% of cognitive complexity issues, i.e. the score can be driven down mechanically. Not re-verified here.

---

### 4.55 Rice et al.: argument selection defects at Google (OOPSLA 2017). VERIFIED (Cambridge repository PDF); Vendor (Google)

- **Citation:** Andrew Rice, Edward Aftandilian, Ciera Jaspan, Emily Johnston, Michael Pradel, Yulissa Arroyo-Paredes, _Detecting Argument Selection Defects_, PACMPL 1(OOPSLA), article 104, 22 pp., 2017. https://doi.org/10.1145/3133928 ; read: https://www.repository.cam.ac.uk/handle/1810/273377
- **Method:** a name-similarity checker for Java run on 200 million lines of Google code and 10 million lines of mostly open-source code; P(defect | n parameters) derived by Bayes' rule from found defects and the corpus distribution, excluding `assertEquals`.
- **What it says:** "the probability of an argument selection defect increases markedly" "when methods have more than five arguments". But of the 2,305 defects found, 1,627 (71%) had parameters named `expected` or `actual`, mostly JUnit `assertEquals`-style calls, which take two values (three with a message). "the majority of the defects were swaps of two (not necessarily adjacent)" arguments. Remedies: parameter objects, fluent builders, or "Another alternative is the use of named parameters". In code review, "85% of issues reported are addressed by developers".
- **Numbers:** true positive rate at the strict threshold 85% (459 true, 78 false positives). Figure 11's y-axis tops out at 0.007, so even the worst arity is under 1% per call (my reading of the plot).
- **Caveat:** Java, statically typed; only defects the name checker can see; many found defects "did not actually result in incorrect behavior".
- **For the post:** the best data that more parameters means more swaps, and the reminder that most swaps found were of two values in assertion calls with two or three parameters. A `max-params` cap doesn't touch the commonest case; named arguments (in JS, an options object) do.
- **Text:** `scratchpad/length-lit/D/text/rice-oopsla2017.txt`

### 4.56 Pradel and Gross: equally typed arguments (ISSTA 2011; TSE 2013). VERIFIED (ISSTA author PDF; TSE metadata)

- **Citations:** Michael Pradel, Thomas R. Gross, _Detecting anomalies in the order of equally-typed method arguments_, ISSTA 2011, pp. 232–242, https://doi.org/10.1145/2001420.2001448 ; read: https://software-lab.org/publications/issta2011.pdf . Extended: _Name-Based Analysis of Equally Typed Method Arguments_, IEEE TSE 39(8), pp. 1127–1143, 2013, https://doi.org/10.1109/TSE.2013.7 (metadata only).
- **What it says:** in over 1.5 million lines of Java, "11% of all method calls (77,610 out of 683,504) have two or more" "equally-typed arguments"; the analysis "finds relevant anomalies with a precision of 76%".
- **For the post:** the risk lives in calls with two or more same-typed arguments, which is most JS calls with two or more arguments (4.57).
- **Text:** `scratchpad/length-lit/D/text/pradel-issta2011.txt`

### 4.57 Pradel and Sen: DeepBugs and swapped arguments in JavaScript (OOPSLA 2018). VERIFIED (arXiv v1)

- **Citation:** Michael Pradel, Koushik Sen, _DeepBugs: A Learning Approach to Name-based Bug Detection_, PACMPL 2(OOPSLA), 2018. https://doi.org/10.1145/3276517 ; read: https://arxiv.org/pdf/1805.11683
- **What it says:** in dynamically typed languages "all calls that pass two or more" "arguments are susceptible to the mistake". The swapped-arguments detector looks at the first two arguments of calls.
- **Numbers:** corpus of 150,000 JavaScript files; of 50 inspected swapped-argument warnings, 23 were bugs and 27 false positives.
- **For the post:** in JS the swap risk starts at two positional arguments, which any `max-params` cap above two doesn't address.
- **Text:** `scratchpad/length-lit/D/text/arxiv-1805.11683.txt`

### 4.58 Liu et al.: argument and parameter names (ICSE 2016). VERIFIED (author PDF)

- **Citation:** Hui Liu, Qiurong Liu, Cristian-Alexandru Staicu, Michael Pradel, Yue Luo, _Nomen est Omen: Exploring and Exploiting Similarities between Argument and Parameter Names_, ICSE 2016, pp. 1063–1073. https://doi.org/10.1145/2884781.2884841 ; read: https://software-lab.org/publications/icse2016-names.pdf
- **What it says:** in 60 Java programs, "short and generic names often cause low similarities" between arguments and parameters.
- **For the post:** context only: naming, not count, is what lets tools and readers catch wrong arguments.
- **Text:** `scratchpad/length-lit/D/text/liu-icse2016.txt`

### 4.59 Stylos and Clarke: required constructor parameters (PPIG 2006; ICSE 2007). VERIFIED (PPIG author PDF; ICSE metadata + abstract); Vendor (Microsoft)

- **Citations:** Jeffrey Stylos, Steven Clarke, Brad Myers, _Comparing API Design Choices with Usability Studies: A Case Study and Future Directions_, PPIG 2006, pp. 131–139, read: https://ppig.org/files/2006-PPIG-18th-stylos.pdf . Jeffrey Stylos, Steven Clarke, _Usability Implications of Requiring Parameters in Objects' Constructors_, ICSE 2007, pp. 529–539, https://doi.org/10.1109/ICSE.2007.92 (abstract via OpenAlex).
- **What it says:** "contrary to expectations, programmers strongly preferred and were more effective" "with APIs that did not require constructor parameters". The study also asked whether "setting individual properties, where the property name and value" "are shown together" reads better than positional constructor calls.
- **Caveat:** about required versus optional parameters, not how many.
- **For the post:** the only controlled API study found that touches parameter lists; it favours named setting over positional lists, not a numeric cap.
- **Text:** `scratchpad/length-lit/D/text/stylos-ppig2006.txt`, `scratchpad/length-lit/D/src/openalex/10.1109_ICSE.2007.92.abstract.txt`

### 4.60 Cross-reference: Bouwers et al. on gaming a parameter-count metric

- See 4.70: parameters moved into fields or a map to satisfy the count.

### 4.61 Buse and Weimer: a learned readability metric (IEEE TSE 2010). VERIFIED (author preprint)

- **Citation:** Raymond P. L. Buse, Westley R. Weimer, _Learning a Metric for Code Readability_, IEEE TSE 36(4), pp. 546–558, 2010. https://doi.org/10.1109/TSE.2009.70 ; read: https://web.eecs.umich.edu/~weimerw//p/weimer-tse2010-readability-preprint.pdf
- **Method:** 120 student annotators rated 100 Java snippets of three statements each (mean 278.94 characters); 19 simple features (Fig. 6), several as both average and maximum, including line length in characters.
- **What it says:** "factors like 'average line length' and 'average number of identifiers per line'" "are very important to readability". Identifiers and characters per line have a "strong influence on our readability metric (100% and 96%" "relative power respectively)". "Our findings support the conventional" "wisdom that programmers should keep their lines short", "even if it means breaking up a statement across multiple lines." The authors warn the model is "descriptive rather than normative or prescriptive".
- **Caveat:** perceived readability of tiny snippets by students; a correlational model.
- **For the post:** the evidence supports wrapping long lines, which a formatter does on every save. It is not evidence for failing a build on line length.
- **Text:** `scratchpad/length-lit/D/text/buse-weimer-tse2010.txt`

### 4.62 Posnett, Hindle and Devanbu: a simpler readability model (MSR 2011). VERIFIED (metadata + abstract)

- **Citation:** Daryl Posnett, Abram Hindle, Premkumar Devanbu, _A simpler model of software readability_, MSR 2011, pp. 73–82. https://doi.org/10.1145/1985441.1985454 ; abstract from OpenAlex.
- **What it says:** "a simple, intuitive theory of readability, based on size and code entropy" yields "a much sparser, yet statistically significant, model" of Buse and Weimer's scores.
- **Caveat:** abstract only. The abstract says Buse "asked 100 participants"; Buse and Weimer report 120 annotators and 100 snippets.
- **For the post:** much of what readability models pick up is size and entropy.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1145_1985441.1985454.abstract.txt`

### 4.63 Scalabrino et al.: textual features in readability models (ICPC 2016; JSEP 2018). VERIFIED (metadata + abstracts)

- **Citations:** Simone Scalabrino, Mario Linares-Vásquez, Denys Poshyvanyk, Rocco Oliveto, _Improving code readability models with textual features_, ICPC 2016, https://doi.org/10.1109/ICPC.2016.7503707 ; _A comprehensive model for code readability_, JSEP 30(6), 2018, https://doi.org/10.1002/smr.1958 . Abstracts from OpenAlex.
- **What they say:** earlier models "take into account only structural aspects of source code, e.g., line length"; "the proposed features complement classic structural features" (600 snippets, 5K+ raters).
- **For the post:** line length is one structural feature among many; identifiers and comments add predictive power. Understandability results are in `cognitive-complexity.md` §3.5.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1109_ICPC.2016.7503707.abstract.txt`, `scratchpad/length-lit/D/src/openalex/10.1002_smr.1958.abstract.txt`

### 4.64 Peterson, Abid, Bryant, Maletic and Sharif: dwell time per line in real methods (ETRA 2019). VERIFIED (NSF PAR author copy)

- **Citation:** Cole S. Peterson, Nahla J. Abid, Corey A. Bryant, Jonathan I. Maletic, Bonita Sharif, _Factors Influencing Dwell Time During Source Code Reading: A Large-Scale Replication Experiment_, ETRA 2019, 4 pp. https://doi.org/10.1145/3314111.3319833 ; read: https://par.nsf.gov/servlets/purl/10148766
- **Method:** 18 participants (5 experts, 13 novices) summarised 15 of 63 methods from five Java projects, 9–80 LOC (median 22), eye-tracked with iTrace.
- **What it says:** "We find no correlation between the" "line length and the total duration of time spent looking on the line" (R² = 0.007). Method size: "smaller methods tend to have" "shorter overall fixation duration for the entire method" but longer per line: 3.708 s per line for methods of 22 LOC or less versus 1.893 s for larger ones, and 70 s versus 80 s in total.
- **Caveat:** small sample; summarisation task; short conference paper.
- **For the post:** in real code, longer lines didn't take measurably longer to read, and shorter methods took almost as long overall (70 s against 80 s).
- **Text:** `scratchpad/length-lit/D/text/peterson-etra2019.txt`

### 4.65 dos Santos and Gerosa: coding practices and perceived readability (ICPC 2018). VERIFIED (author PDF via Wayback)

- **Citation:** Rodrigo Magalhães dos Santos, Marco Aurélio Gerosa, _Impacts of coding practices on readability_, ICPC 2018, pp. 277–285. https://doi.org/10.1145/3196321.3196342 ; read: http://web.archive.org/web/20250217112528/https://www.ime.usp.br/~gerosa/papers/ICPC2018-Legibility.pdf
- **Method:** 62 invited (55 students, 7 professionals); paired Java snippets, one adhering to and one violating each of 11 practices.
- **What it says:** practice P.4 was "Line lengths must be kept within the limit of 80 characters;". It won 44 votes to 15 (59 votes, 25.42% for the violating version, p = 0.0003). But "Four out of 14 comments" "mentioned this fact": respondents saw a tab in the adhering snippet, e.g. "I selected the one with less tabs". P.10 (store parts of long logical expressions in variables) lost 21 to 34, not significant (p = 0.1056).
- **Caveat:** one snippet pair per practice, mostly students, a rendering confound on the line-length pair.
- **For the post:** weak support for 80 columns, and a contrast with 4.51 on intermediate variables. Shows how fragile style preferences are.
- **Text:** `scratchpad/length-lit/D/text/dossantos-icpc2018.txt`

### 4.66 Typographic line length for prose: Dyson (2004); Dyson and Haselgrove (2001). Dyson 2004 VERIFIED (metadata + abstract); Dyson and Haselgrove UNVERIFIED (metadata only)

- **Citations:** Mary C. Dyson, _How physical text layout affects reading from screen_, Behaviour & Information Technology 23(6), pp. 377–393, 2004, https://doi.org/10.1080/01449290410001715714 . Mary C. Dyson, Mark Haselgrove, _The influence of reading speed and line length on the effectiveness of reading from screen_, IJHCS 54(4), pp. 585–612, 2001, https://doi.org/10.1006/ijhc.2001.0458 (Crossref and OpenAlex records only).
- **What it says (2004 abstract):** a review that "identifies the number of characters per line as the critical variable" for line length on screen.
- **Caveat:** prose reading, not code; the often-quoted figure of 55 characters per line from the 2001 paper was seen only in secondary pages.
- **For the post:** one line of context at most: prose findings don't transfer to code, where Peterson et al. (4.64) found no line-length effect.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1080_01449290410001715714.abstract.txt`

### 4.67 Campbell's law, from the primary source (1976 occasional paper; 1979 journal version). VERIFIED (1976 text as reprinted in JMDE 2011; 1979 metadata)

- **Citations:** Donald T. Campbell, _Assessing the Impact of Planned Social Change_, Occasional Paper #8, Public Affairs Center, Dartmouth College, December 1976; reprinted in _Journal of MultiDisciplinary Evaluation_ 7(15), pp. 3–43, February 2011 (CC BY-NC), read: https://jmde.journals.publicknowledgeproject.org/index.php/jmde_1/article/view/297 . Journal version: _Evaluation and Program Planning_ 2(1), pp. 67–90, 1979, https://doi.org/10.1016/0149-7189(79)90048-X (record only; its text not compared).
- **What it says:** Campbell states two "pessimistic laws": "The more any quantitative social indicator is used for social" decision-making, "the more subject it will be to corruption pressures", and the more apt it is to "distort and corrupt the social processes it is intended to monitor." Campbell calls the evidence "evidence which I take seriously, although" "it is predominantly anecdotal". Soviet production targets: "If weight, then factories would produce only their heaviest item", and "If number of items, then only their easiest item to produce" "(e.g., the smallest nails)".
- **Caveat:** quoted from the 1976 paper; wording in the 1979 article was not checked. Goodhart and Strathern are in `cognitive-complexity.md` §5.3.
- **For the post:** the nail factory is the size-limit failure in one line: count the units and you get the smallest units.
- **Text:** `scratchpad/length-lit/D/text/campbell-1976-jmde2011.txt`

### 4.68 Kaner and Bond: what do software metrics measure? (METRICS 2004). VERIFIED (author PDF)

- **Citation:** Cem Kaner, Walter P. Bond, _Software Engineering Metrics: What Do They Measure and How Do We Know?_, 10th International Software Metrics Symposium (METRICS 2004). Read: https://kaner.com/pdfs/metrics2004.pdf (no DOI found in Crossref).
- **What it says:** if metrics are weakly validated, "measurement distortions and dysfunctional should be commonplace" (sic). Following Austin, a system is dysfunctional when "optimizing for measurement so distorts the employee's behavior" "that he provides less value to the organization". On LOC as a supposedly direct measure: "Lines of code? What's a line? What's code?"
- **For the post:** the measurement-theory version of the claim that line counts measure the formatter: a line is defined by the tool that printed it.
- **Text:** `scratchpad/length-lit/D/text/kaner-bond-2004.txt`

### 4.69 Tómasdóttir, Aniche and van Deursen: which ESLint rules projects enable and disable (IEEE TSE 2020). VERIFIED (accepted manuscript via Wayback); see also `accessibility.md` 4.14, `sort-keys.md` 4.30

- **Citation:** Kristín Fjóla Tómasdóttir, Maurício Aniche, Arie van Deursen, _The Adoption of JavaScript Linters in Practice: A Case Study on ESLint_, IEEE TSE 46(8), pp. 863–891, 2020. https://doi.org/10.1109/TSE.2018.2871058 ; read: http://web.archive.org/web/20240416135835/https://pure.tudelft.nl/ws/files/46810031/tse_js.pdf . ASE 2017 companion read too (http://web.archive.org/web/20250323202334/https://pure.tudelft.nl/ws/portalfiles/portal/26024522/ase2017.pdf).
- **Method:** "we analyzed 9,548 ESLint configuration files" "extracted from 86,366 JavaScript projects on GitHub" ("As of February 2017."); 6,413 used a preset and 3,135 didn't; plus a survey.
- **Numbers:** `max-len` is the only size rule in any of the four top-20 lists. Enabled by 419 of 6,413 preset users (6.5%, rank 14), disabled by 315 of 6,413 (4.9%, rank 9). It appears in neither list for projects without a preset. `max-params`, `max-lines`, `max-statements`, `max-depth`, `max-nested-callbacks` and `complexity` don't appear in any list, and neither paper mentions them (grep of both texts).
- **Caveat:** 2017 data; airbnb-style presets enabled `max-len`, so "disabled" mostly means overriding a preset. Rules that are off by default rarely need disabling.
- **For the post:** in 2017, line length was the size limit people argued with in config; the others weren't common enough to show up.
- **Text:** `scratchpad/length-lit/D/text/tomasdottir-tse2020-layout.txt`, `scratchpad/length-lit/D/text/tomasdottir-tse2020.txt`

### 4.70 Bouwers, Visser and van Deursen: four pitfalls of software metrics (ACM Queue 2012; CACM 2012). VERIFIED (author preprint); Vendor (Software Improvement Group)

- **Citation:** Eric Bouwers, Joost Visser, Arie van Deursen, _Getting what you measure_, ACM Queue 10(5), pp. 50–56, 2012, https://doi.org/10.1145/2208917.2229115 ; CACM 55(7), pp. 54–59, 2012, https://doi.org/10.1145/2209249.2209266 ; read: https://repository.ubn.ru.nl/bitstream/handle/2066/103392/103392.pdf (author preprint). Bouwers and Visser were at SIG, which sells code-quality assessment.
- **What it says:** "Treating the metric" is "The most common pitfall we encounter": it "leads to refactorings to simply 'please the metric'". Their example is parameter count: parameters "are for example moved to the fields of the surrounding class" "or replaced by a map", and sometimes "non-goal-oriented refactorings are done to game the system on purpose".
- **Caveat:** consultants' experience, not a study; no counts.
- **For the post:** a concrete, pre-agent report of how a `max-params`-style target gets gamed, which is the behaviour to test agents for.
- **Text:** `scratchpad/length-lit/D/text/bouwers-cacm2012.txt`

### 4.71 Beller, Bholanath, McIntosh and Zaidman: the state of static analysis configs (SANER 2016). VERIFIED (author preprint)

- **Citation:** Moritz Beller, Radjino Bholanath, Shane McIntosh, Andy Zaidman, _Analyzing the State of Static Analysis: A Large-Scale Evaluation in Open Source Software_, SANER 2016, pp. 470–481. https://doi.org/10.1109/SANER.2016.105 ; read: https://rebels.cs.uwaterloo.ca/papers/saner2016_beller.pdf
- **What it says:** "projects typically do not enforce a strict policy on ASAT use"; "Most ASAT configurations deviate slightly from the default"; "most ASAT configurations, once introduced, never change". In the survey, "64% of projects use ASATs sporadically".
- **Caveat:** no rule-level results for length rules (only a "Metric" category in their taxonomy).
- **For the post:** whatever a preset ships tends to stay, so preset defaults for size rules matter more than per-project tuning.
- **Text:** `scratchpad/length-lit/D/text/beller-saner2016.txt`

### 4.72 Zampetti et al.: static analysis in CI builds (MSR 2017). VERIFIED (metadata + abstract)

- **Citation:** Fiorella Zampetti, Simone Scalabrino, Rocco Oliveto, Gerardo Canfora, Massimiliano Di Penta, _How Open Source Projects Use Static Code Analysis Tools in Continuous Integration Pipelines_, MSR 2017, pp. 334–344. https://doi.org/10.1109/MSR.2017.2 ; abstract from OpenAlex.
- **What it says:** in 20 Java projects on Travis CI, "build breakages due to static analysis tools" "are mainly related to adherence to coding standards", and they are "quickly fixed by actually solving the problem, rather than by disabling the warning".
- **Caveat:** abstract only, so which checks (e.g. Checkstyle line or method length) broke builds wasn't read.
- **For the post:** when style checks gate CI, developers comply rather than suppress, so the cost of a bad limit is paid in code changes.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1109_MSR.2017.2.abstract.txt`

### 4.73 Lenarduzzi, Saarimäki and Taibi: SonarQube issues, faults and changes (JSS 2020). VERIFIED (arXiv preprint; extraction partial)

- **Citation:** Valentina Lenarduzzi, Nyyti Saarimäki, Davide Taibi, _Some SonarQube issues have a significant but small effect on faults and changes. A large-scale empirical study_, JSS 170, 110750, 2020. https://doi.org/10.1016/j.jss.2020.110750 ; read: https://arxiv.org/pdf/1908.11590 (pdftotext reported a damaged xref but extracted the text).
- **What it says:** 33 Apache Java projects, 173 SonarQube rules, 95K issues: "As for fault-proneness, there is no difference between clean and dirty classes." Sonar's own example of a MINOR issue: "lines should not be too long".
- **Caveat:** no per-rule results for size rules found in the extracted text.
- **For the post:** context for quality gates: a class free of Sonar issues was not less fault-prone.
- **Text:** `scratchpad/length-lit/D/text/arxiv-1908.11590.txt`

### 4.74 Google's Tricorder (ICSE 2015) and CACM 2018 on style checks. VERIFIED (Google PDF; course-hosted CACM PDF); Vendor (Google); see `security-rules.md` 4.3.3

- **Citations:** Caitlin Sadowski, Jeffrey van Gogh, Ciera Jaspan, Emma Söderberg, Collin Winter, _Tricorder: Building a Program Analysis Ecosystem_, ICSE 2015, pp. 598–608, https://doi.org/10.1109/ICSE.2015.76 ; read: https://research.google.com/pubs/archive/43322.pdf . Sadowski et al., CACM 61(4), 2018, https://doi.org/10.1145/3188720 ; read: https://6826.csail.mit.edu/2020/papers/google-analysis-cacm.pdf
- **What they say:** Tricorder runs "linters that check properties like 'line is over 80 characters'" on changed files; "developers will decide whether an" "analysis tool has high impact, and what a false positive is". A wrong bug report is not a false positive when "making the suggested fix would improve code" "readability, this is not considered a false positive". Style checkers are disabled where conventions differ: "we don't run code style checkers on third-party open" "source code with different code conventions". CACM: compiler-blocking checks must "report issues affecting only correctness rather" "than style or best practices".
- **For the post:** Google keeps line-length style checks as review-time suggestions and keeps style out of anything that blocks the build.
- **Text:** `scratchpad/length-lit/D/text/tricorder-icse2015.txt`, `scratchpad/length-lit/D/text/sadowski-cacm2018.txt`

### 4.75 Johnson, Song, Murphy-Hill and Bowdidge: why developers don't use static analysis (ICSE 2013). VERIFIED (author PDF via Wayback)

- **Citation:** _Why don't software developers use static analysis tools to find bugs?_, ICSE 2013, pp. 672–681. https://doi.org/10.1109/ICSE.2013.6606613 ; read: http://web.archive.org/web/20200827123155/https://people.engr.ncsu.edu/ermurph3/papers/icse13b.pdf
- **What it says:** 20 developers interviewed; "14 people expressed the" "negative impacts of poorly presented output", and "For 17 of our participants, customizability" "is important". Some use tools for "communicating and enforcing coding standards and styles".
- **Caveat:** no findings on size or length rules.
- **For the post:** context only; nothing length-specific.
- **Text:** `scratchpad/length-lit/D/text/johnson-icse2013.txt`

### 4.76 Christakis and Bird (ASE 2016): additions for this topic. VERIFIED; cross-reference `react-effects.md` 4.16; Vendor (Microsoft)

- **What it adds:** asked what analyzers should detect, respondents put memory, power and style "which are ranked fifth, thirteenth, and eleventh" of the issue types. Yet the issues they thought analyzers could catch were best practices (69%) and "style inconsistencies (62%), which are both superficial code issues". None of 256 live-site incidents were style issues. No finding on size or length rules.
- **Text:** `scratchpad/length-lit/D/text/christakis-bird-ase2016.txt`

### 4.77 Cross-references: Goodhart, Strathern, agents and suppressions

- `cognitive-complexity.md` §5.3: Strathern's wording of Goodhart's law; Böckeler (martinfowler.com, May 2026) set ESLint limits on arguments, file length, function length and complexity for an agent, which often chose to raise the cyclomatic complexity threshold instead of refactoring; reward-hacking studies.
- `security-rules.md` 5.3: anthropics/claude-code #12326, an agent adding `/* eslint-disable max-lines-per-function */` to hundreds of files.
- `react-effects.md` 4.13: Hu et al. (FSE 2025), suppressions pile up and half suppress nothing.
- `cognitive-complexity.md` §3.6: Wyrich et al. (ICSE 2021), showing a metric value anchors developers' judgments.

---

### 4.78 Bavota, De Carluccio, De Lucia, Di Penta, Oliveto and Strollo: when refactorings induce bugs (SCAM 2012). VERIFIED (author PDF)

- **Citation:** Gabriele Bavota, Bernardino De Carluccio, Andrea De Lucia, Massimiliano Di Penta, Rocco Oliveto, Orazio Strollo, _When Does a Refactoring Induce Bugs? An Empirical Study_, SCAM 2012, pp. 104–113. https://doi.org/10.1109/SCAM.2012.20 ; read: https://people.lu.usi.ch/bavotg/papers/scam2012.pdf
- **Method:** Ref-Finder on releases of Apache Ant, Xerces and ArgoUML; 15,008 detected and 12,922 manually validated refactorings of 52 kinds; SZZ to link later bug fixes to refactored classes.
- **What it says:** overall "the percentage of bugs fixes likely induced by refactorings is relatively low" (15%): "1,616 refactored classes out of the 10,969 identified (15%)" were later fixed. Hierarchy refactorings "tend to induce faults very frequently". An ArgoUML Extract Method bug came from "A wrong swap of order" "between two instructions during the performed Extract Method".
- **Numbers (Extract Method, Table V):** 79 of 374 refactored classes later fixed (21%): Ant 19/73 (26%), ArgoUML 40/135 (30%), Xerces 20/166 (12%). In ArgoUML, Extract Method was significantly more fix-inducing than Add Parameter (OR 2.86, p = 0.01).
- **Caveat:** release-level matching, three systems; a fix in a refactored class isn't proof the refactoring caused it (4.79 tests this).
- **For the post:** Extract Method, the refactoring a function-length limit asks for, was above the study's 15% average.
- **Text:** `scratchpad/length-lit/D/text/bavota-scam2012.txt`, `scratchpad/length-lit/D/text/bavota-scam2012-layout.txt`

### 4.79 Di Penta, Bavota and Zampetti: refactoring actions and bugs, a differentiated replication (ESEC/FSE 2020). VERIFIED (arXiv preprint)

- **Citation:** Massimiliano Di Penta, Gabriele Bavota, Fiorella Zampetti, _On the Relationship between Refactoring Actions and Bugs: A Differentiated Replication_, ESEC/FSE 2020. https://doi.org/10.1145/3368089.3409695 ; read: https://arxiv.org/pdf/2009.11685
- **Method:** RefactoringMiner on commit histories of 103 Java systems (the original three plus 100 Apache projects); SZZ with file- and line-level matching; manual inspection of a stratified sample of 384 fix-inducing commits containing refactorings.
- **What it says:** "commits with refactoring always have significantly higher odds to induce a fix" (file-level ORs 3.46–3.87 on the original three; median 2.13 on 100 Apache projects). Requiring the fix to touch a refactored line, "odds are reduced by 60%" "or more, and vary between 1.34 and 1.83" (median 1.13 for Apache). The risky types are "fixes are those involving refactoring big chunks of code" and hierarchies. "Surprisingly, extract method," "another very frequent refactoring has an OR (0.86)", below "extract and move method, 1.52"; "renaming changes are largely harmless".
- **Numbers (Table 4, by type):** Extract Method 27,371 instances, OR 0.86 (p adj < 0.001); Extract And Move Method 6,633, OR 1.52; Extract Class 4,629, OR 1.65; Move Method 5,767, OR 1.15; Extract Variable 25,328, OR 0.54.
- **Manual check:** "For 147 (38%) of the analyzed fix-inducing commits, we classified" the refactoring as responsible; "in 62% of cases (237 commits)" it was not. Of the 147, 71% were a bug in the refactored code, 20% a chain of changes, 9% a reverted refactoring.
- **Caveat:** OR compares commits with a refactoring type against commits without it; Java only. The 38% is of sampled fix-inducing commits, not of all refactorings.
- **For the post:** splitting a function in place is not the risky move; moving code into new classes and files is. That's the difference between `max-lines-per-function` and `max-lines` (my inference: a per-file limit forces moves across files).
- **Text:** `scratchpad/length-lit/D/text/arxiv-2009.11685.txt`, `scratchpad/length-lit/D/text/arxiv-2009.11685-layout.txt`

### 4.80 Weißgerber and Diehl: are refactorings less error-prone than other changes? (MSR 2006). VERIFIED (author PDF)

- **Citation:** Peter Weißgerber, Stephan Diehl, _Are refactorings less error-prone than other changes?_, MSR 2006, pp. 112–118. https://doi.org/10.1145/1137983.1138011 ; read: https://www.st.uni-trier.de/diehl/pubs/msr06.pdf
- **Method:** reconstructed refactorings from CVS histories of ArgoUML, jEdit and JUnit; compared daily refactoring ratios with bug reports in the following days.
- **What it says:** "in all three projects," "there are no days which only contain refactorings". Phases where heavy refactoring was followed by more bugs exist, but phases with no increase prevail: "While phases" "of the second type prevail". The correlations "could be accidental or" "caused by other factors like feature freezes".
- **For the post:** early, weak evidence; mainly useful for showing refactoring almost never happens alone.
- **Text:** `scratchpad/length-lit/D/text/weissgerber-msr2006.txt`

### 4.81 Kim, Cai and Kim: API-level refactorings and bug fixes (ICSE 2011). VERIFIED (author PDF)

- **Citation:** Miryung Kim, Dongxiang Cai, Sunghun Kim, _An Empirical Investigation into the Role of API-Level Refactorings during Software Evolution_, ICSE 2011, pp. 151–160. https://doi.org/10.1145/1985793.1985815 ; read: https://web.cs.ucla.edu/~miryung/Publications/icse11-refactoringbug.pdf
- **Method:** Eclipse JDT, jEdit and Columba, 26,523 revisions; API-level refactorings (move, rename, signature changes).
- **What it says:** "there is an increase in the number of bug fixes after API-level refactorings", e.g. "from 26.1% to 30.3% when examining 5 revisions" in Eclipse JDT, and "a fix rate increase is often caused by mistakes in applying refactorings" together with behaviour changes. But the "time taken to fix" "those bugs decreases by about 35.0% to 63.1%". "32% of refactoring revisions were" "related to fix revisions that follow within 20 revisions", against 14% of other revisions.
- **Caveat:** API-level refactorings, not method extraction.
- **For the post:** refactoring has a short-term cost in fixes and a benefit in fix time; both sides are real.
- **Text:** `scratchpad/length-lit/D/text/kim-icse2011.txt`

### 4.82 Ferreira et al.: bug-proneness of refactored code over time (ICSE 2018 poster; EASE 2025). VERIFIED (EASE arXiv full text; ICSE 2018 metadata + abstract)

- **Citations:** Isabella Ferreira, Lawrence Arkoh, Anderson Uchôa, Ana Carla Bibiano, Alessandro Garcia, Wesley K. G. Assunção, _Assessing the Bug-Proneness of Refactored Code: A Longitudinal Multi-Project Study_, EASE 2025. https://doi.org/10.1145/3756681.3756948 ; read: https://arxiv.org/pdf/2505.08005 . Earlier: Ferreira et al., _The buggy side of code refactoring_, ICSE 2018 Companion, pp. 406–407, https://doi.org/10.1145/3183440.3195030 (abstract via OpenAlex).
- **Method (2025):** 12 projects, 27,450 refactorings, 6,051 reported bugs and 49,250 static-analysis bugs.
- **What it says:** the study "confirms the common intuition that refactored code is less bug-prone than non-refactored code", but code changed in "floss refactorings) are often bug-prone", and "many of such bugs induced by refactoring cannot be revealed" by tools that check behaviour preservation. Its motivating example is an Extract Method in Spring Boot that dropped the command-line arguments. The 2018 poster (5 projects, 20,689 refactorings, 1,033 bug reports) found "many bugs are introduced in the refactored code" "as soon as the first immediate change is made on it".
- **Caveat:** the paper misstates two sources: it says Di Penta et al. found "38% of refactoring actions resulted in subsequent" "bug-fixing activities" (4.79's 38% is of 384 sampled fix-inducing commits), and cites Kim et al. as "76% of developers mentioned that refactoring comes" with risk (the source says 77%, 4.42).
- **For the post:** refactoring a function because a limit tripped mid-feature is floss refactoring by definition (my inference), the kind this study found bug-prone.
- **Text:** `scratchpad/length-lit/D/text/arxiv-2505.08005.txt`, `scratchpad/length-lit/D/src/openalex/10.1145_3183440.3195030.abstract.txt`

---

### 4.83 Cedrim et al.: refactoring and smells in 23 projects (ESEC/FSE 2017). VERIFIED (metadata + abstract)

- **Citation:** Diego Cedrim, Alessandro Garcia, Melina Mongiovi, Rohit Gheyi, Leonardo Sousa, Rafael de Mello, Baldoíno Fonseca, Márcio Ribeiro, Alexander Chávez, _Understanding the impact of refactoring on smells: a longitudinal study of 23 software projects_, ESEC/FSE 2017, pp. 465–475. https://doi.org/10.1145/3106237.3106259 ; abstract via OpenAlex (no open full text found).
- **What it says:** 16,566 refactorings of 10 types and 13 smell types: "Even though 79.4% of the refactorings touched smelly elements, 57% did not reduce" them; "only 9.7% of refactorings removed smells, while 33.3% induced the introduction of new ones"; "More than 95% of such refactoring-induced smells were not removed".
- **For the post:** a refactor aimed at one smell often creates another that stays.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1145_3106237.3106259.abstract.txt`

### 4.84 Bibiano et al.: batch refactoring and smells (ESEM 2019). VERIFIED (metadata + abstract)

- **Citation:** Ana Carla Bibiano, Eduardo Fernandes, Daniel Oliveira, Alessandro Garcia, Marcos Kalinowski, Baldoíno Fonseca, Roberto Oliveira, Anderson Oliveira, Diego Cedrim, _A Quantitative Study on Characteristics and Effect of Batch Refactoring on Code Smells_, ESEM 2019, pp. 1–11. https://doi.org/10.1109/ESEM.2019.8870183 ; abstract via OpenAlex.
- **What it says:** 4,607 batches in 57 projects: "batches mostly ended up introducing (51%) or not fully removing (38%) smells". "Batches applied on a single method are 2.6 times more prone" "to fully remove smells" than batches spread over several methods.
- **For the post:** the multi-step refactors a limit forces mostly fail to clean up; contained, single-method batches do better.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1109_ESEM.2019.8870183.abstract.txt`

### 4.85 Silva, Tsantalis and Valente: why we refactor (FSE 2016). VERIFIED (arXiv full text)

- **Citation:** Danilo Silva, Nikolaos Tsantalis, Marco Tulio Valente, _Why We Refactor? Confessions of GitHub Contributors_, FSE 2016. https://doi.org/10.1145/2950290.2950305 ; read: https://arxiv.org/pdf/1607.02459
- **Method:** 748 Java projects monitored; 463 refactorings in 222 commits from 124 projects; developers emailed shortly after; 195 responses (41.9%).
- **What it says:** "refactoring activity is mainly driven by changes in the requirements" and "much less by code smells". "Extract Method is the most versatile refactoring operation serving 11 different purposes". "Decomposing a method for improving readability (21 instances)" was third of 138 Extract Method motivations, after reuse (43) and alternative signatures (25). One developer: "The method was so long that it didn't fit onto the screen" "anymore, so I moved out parts."
- **Tools:** "95 developers (55% of valid answers) answered that the refactoring" "was performed manually without tool support"; for Extract Method, "Extract Method (29%)" were automated (of 118 answers).
- **For the post:** developers rarely refactor because of a smell, and splitting a long method for readability is one motive among many. A limit makes it the motive. Most Extract Methods are done by hand.
- **Text:** `scratchpad/length-lit/D/text/arxiv-1607.02459.txt`

### 4.86 Murphy-Hill, Parnin and Black: how we refactor (ICSE 2009; IEEE TSE 2012). VERIFIED (metadata + abstract)

- **Citation:** Emerson Murphy-Hill, Chris Parnin, Andrew P. Black, _How We Refactor, and How We Know It_, IEEE TSE 38(1), pp. 5–18, 2012 (online 2011). https://doi.org/10.1109/TSE.2011.41 ; abstract via OpenAlex. ICSE 2009 version: https://doi.org/10.1109/ICSE.2009.5070529
- **What it says:** "refactoring tools are seldom used: 11 percent by Eclipse developers and 9 percent" by Mylyn developers, from sampled code changes.
- **For the post:** even where an IDE can extract a method, most extraction is manual, so a limit without an autofix means hand edits.
- **Text:** `scratchpad/length-lit/D/src/openalex/10.1109_TSE.2011.41.abstract.txt`

### 4.87 Wang, Xu, Zhang, Tsantalis and Tan: refactoring engine bugs (arXiv 2024). VERIFIED (arXiv full text)

- **Citation:** Haibo Wang, Zhuolin Xu, Huaien Zhang, Nikolaos Tsantalis, Shin Hwei Tan, _An Empirical Study of Refactoring Engine Bugs_, arXiv:2409.14610 (Sept 2024).
- **What it says:** "refactoring engines can generate incorrect refactored programs". Of 518 bug reports from Eclipse, IntelliJ IDEA and NetBeans, the Extract family accounted for 149 (28.76%), the most of any category, with 40 for Extract Method specifically. "Most of the refactoring bugs (97.1%) could be triggered by the default" settings. They found 130 new bugs in current versions.
- **Caveat:** counts of bug reports, not failure rates per use; Java IDEs.
- **For the post:** an autofix for function length would be an Extract Method engine, and those engines have bugs too.
- **Text:** `scratchpad/length-lit/D/text/arxiv-2409.14610.txt`

---

### 4.88 Digkas, Lungu, Avgeriou, Chatzigeorgiou and Ampatzoglou: which SonarQube issues get fixed (SANER 2018). VERIFIED (author PDF on Zenodo)

- **Citation:** Georgios Digkas, Mircea Lungu, Paris Avgeriou, Alexander Chatzigeorgiou, Apostolos Ampatzoglou, _How do developers fix issues and pay back technical debt in the Apache ecosystem?_, SANER 2018, pp. 153–163. https://doi.org/10.1109/SANER.2018.8330205 ; read: https://zenodo.org/record/1451803
- **Method:** weekly snapshots of 57 Apache Java projects analysed with SonarQube; fixing rate computed "as the ratio between all the" "issues of a given type that are closed over the ones which" are open.
- **What it says:** "a small subset of all issue types is responsible for the largest" share of repaid debt. The size rule "Lambdas and anonymous classes should not have" "too many lines of code" is among the ten lowest fixing rates: 869 issues, 25%. Complexity rules did get paid down: "Method Complexity – accounting for about 24% of the" estimated repaid effort (cognitive complexity, nesting depth, method complexity).
- **Caveat:** "fixed" includes code deleted for other reasons; effort is SonarQube's estimate (30,200 hours in total).
- **For the post:** in the wild, a length rule on lambdas was mostly left unfixed while complexity and nesting issues were paid down, which matches keeping structural limits and dropping length.
- **Text:** `scratchpad/length-lit/D/text/digkas-saner2018.txt`, `scratchpad/length-lit/D/text/digkas-saner2018-layout.txt`

### 4.89 Sorald (IEEE TDSC 2023) and CodeCureAgent (FSE 2026): automatic fixes for SonarQube warnings. VERIFIED (Sorald metadata + abstract; CodeCureAgent arXiv full text)

- **Citations:** Khashayar Etemadi et al., _Sorald: Automatic Patch Suggestions for SonarQube Static Analysis Violations_, IEEE TDSC 20(4), pp. 2794–2810, 2023 (online 2022), https://doi.org/10.1109/TDSC.2022.3167316 (abstract via OpenAlex). Pascal Joos, Islem Bouzenia, Michael Pradel, _CodeCureAgent: Automatic Classification and Repair of Static Analysis Warnings_, PACMSE 3(FSE), pp. 3000–3022, 2026, https://doi.org/10.1145/3808140 ; read: https://arxiv.org/pdf/2509.11787
- **Sorald:** template repairs; "Sorald fixes violations of 10 rules from SonarJava"; "it fixes 65% (852/1,307) of the violations that meets the repair preconditions".
- **CodeCureAgent:** an LLM agent on 1,000 SonarQube warnings from 106 Java projects and 291 rules. It "classifies 69.6% of the" "warnings as true positives and 30.4% as false positives", and suppresses the latter with `//NOSONAR`. "Manual inspection of 291 cases reveals a correct-fix rate of 86.3%". Plausibility drops with scope: "all single-line fixes are plausible, compared to 95.5% for multi-line fixes" "and an even lower 75.0%" "for multi-file fixes". Cost about "2.9 cents (USD)" per warning.
- **Caveat:** neither paper reports results for size rules specifically. Plausible means it builds, the warning goes away and tests pass.
- **For the post:** template autofixes don't reach size rules; an agent can now refactor for a warning, but multi-file fixes, the kind a per-file limit needs, fail most often, and about a third of warnings get suppressed rather than fixed.
- **Text:** `scratchpad/length-lit/D/text/arxiv-2509.11787.txt`, `scratchpad/length-lit/D/src/openalex/10.1109_TDSC.2022.3167316.abstract.txt`

---

---

## 5. LLMs and agents

Items 5.1–5.9 are how long LLM- and agent-written code is; 5.10–5.24 whether code or context length changes model accuracy; 5.25–5.33 what agent vendors say about file and function size (their docs and prompts are instructions to models, read as data); 5.34–5.41 agents held to a size limit; 5.42 onward whether LLM- and agent-driven refactoring preserves behaviour. `cognitive-complexity.md` §5 already covers LLMs and complexity, Goodhart and reward hacking. Sources are in `scratchpad/length-lit/B/`.

**Two kinds of length.** Most long-context research varies **context length** (tokens in the prompt, usually padded with unrelated material). That isn't the length of a function or a file. Each entry in 5.10–5.24 says which one it varies.

**Three things kept apart in 5.42–5.60.** Refactoring that was asked for (5.42–5.50), refactoring done to clear a lint or static-analysis finding (5.51–5.54), and refactoring agents do in real pull requests (5.55–5.60); and three levels of success: compiles, passes tests (only as strong as the tests), and is a better design. Each entry says which it measures, and whether a deterministic engine (an IDE refactoring, the linter, the test suite) sat in the loop.

### 5.1 Already covered in `cognitive-complexity.md` §5.2. Cross-reference

- Sonar's _Coding Personalities_ totals over 4,442 Java tasks (GPT-5-minimal 490,010 LOC, Claude Sonnet 4 370,816, OpenCoder-8B 120,288; my arithmetic: about 110, 83 and 27 lines per task), Cotroneo et al. (reopened in 5.2), He et al.'s Cursor study (lines added up 3–5× in month one), GitClear's moved-code decline, and Horikawa et al. (reopened in 5.39). Use those entries; don't re-cite them from here. The totals are task sums, not function lengths.

### 5.2 Cotroneo, Improta and Liguori, ISSRE 2025: AI functions are about half as long. VERIFIED (arXiv full text)

- **Citation:** Domenico Cotroneo, Cristina Improta, Pietro Liguori, _Human-Written vs. AI-Generated Code: A Large-Scale Study of Defects, Vulnerabilities, and Complexity_, ISSRE 2025 (arXiv comment: accepted). arXiv:2508.21634 v1, 29 Aug 2025, https://arxiv.org/abs/2508.21634
- **Method:** 507,044 docstring–function pairs in Python and Java, built on the HMCorp dataset. Human functions come from repositories; ChatGPT (gpt-3.5-turbo), DeepSeek-Coder and Qwen2.5-Coder regenerate each function from its docstring and signature. Lizard metrics per function.
- **What it says:** AI code favours "brevity and reduced complexity"; "AI models prioritize generating compact code".
- **Numbers (Table V, mean NLOC per function):** Python human 12.72 vs ChatGPT 6.89, DeepSeek 5.16, Qwen 4.47. Java human 13.38 vs 8.42, 6.70, 6.14. Mean tokens per function: Python human 142.45 vs 58.68–79.33. Overall −6.75 NLOC and −1.66 CCN.
- **Caveat:** isolated functions written to a docstring, not code written into a codebase. Older or small models. The human side includes whatever repositories contained.
- **For the post:** the cleanest evidence that a model asked for one function writes a shorter one than a human did. It argues against 'AI code is long' at the function level, and says nothing about files or agents.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2508.21634.txt`, `.layout.txt`

### 5.3 Rahman et al. (arXiv, rev. Dec 2025): the direction flips between model generations. VERIFIED (arXiv full text v2)

- **Citation:** Musfiqur Rahman, SayedHassan Khatoonabadi, Ahmad Abdellatif and co-authors (Concordia University), _Automatic Detection of LLM-Generated Code: A Comparative Case Study of Contemporary Models Across Function and Class Granularities_, arXiv:2409.01382 v2, 22 Dec 2025 ("Submitted to a journal"). https://arxiv.org/abs/2409.01382
- **Method:** 14,485 functions and 11,913 classes from CodeSearchNet (Python), each regenerated from its docstring by GPT-3.5, GPT-OSS, Claude 3 Haiku and Claude Haiku 4.5 (prompt includes "Do not explain the code"). Only snippets all four models generated are kept. Cliff's δ per metric.
- **What it says:** GPT-3.5 and Claude 3 Haiku "consistently generate shorter and simpler code across both granularities". Claude Haiku 4.5 and GPT-OSS "produce significantly longer and more complex outputs", with more blank lines. The authors read this as "newer models may prioritize code completeness and readability through explicit structure".
- **Numbers:** function-level Lines δ = −0.68 (GPT-3.5); Blank Lines δ = +0.37 (Claude Haiku 4.5) and +0.36 (GPT-OSS). GPT-3.5 averages 1.22 comment lines per function against the humans' 9.57. Only Total Lines and Executable Code Lines differ non-negligibly for all four models at function level, in opposite directions.
- **Caveat:** preprint; one language; docstring-to-function generation, not agents; small models.
- **For the post:** 'AI code is longer' is a claim about a model generation, not about AI. Newer small models pad with blank lines and structure, which is exactly what a raw line count (without skipping blank lines) would punish.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2409.01382.layout.txt`

### 5.4 Dou et al., Science China Information Sciences: shorter but more complex than the reference. VERIFIED (arXiv full text v2)

- **Citation:** Shihan Dou, Haoxiang Jia, Shenxi Wu and co-authors (Fudan University et al.), _What is Wrong with Your Code Generated by Large Language Models? An Extensive Study_, accepted by SCIENCE CHINA Information Sciences; arXiv:2407.06153 v2, 17 Oct 2025. https://arxiv.org/abs/2407.06153
- **Method:** three closed and six open models on HumanEval+ (164), MBPP+ (399) and APPS+ (600 samples); correct generations compared with canonical solutions on LOC, cyclomatic complexity and API count.
- **What it says:** models tend to "produce code that is shorter yet more complicated as compared to canonical solutions"; generated code "typically has fewer lines of code but higher code complexity". Also: performance falls with "problem complexity metrics (cyclomatic complexity, API usage, and code length)" of the canonical solution.
- **Caveat:** benchmark problems, where the reference solution is the human baseline. The length–difficulty link is about the task, not the code the model reads.
- **For the post:** a second benchmark result that per function, model code is shorter, and that it trades lines for density. A line limit would not flag it.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2407.06153.layout.txt`

### 5.5 Mao et al. (arXiv 2026): "more verbose" in v2, "rather small" differences in v3. VERIFIED (arXiv full texts v2 and v3)

- **Citation:** Tianhao Mao, Dongfang Zhao, Haixu Tang, XiaoFeng Wang, Hang Zhang (Indiana University; NTU). v2: _A Large-Scale Empirical Study of AI-Generated Code in Real-World Repositories_, arXiv:2603.27130 v2, 3 Apr 2026. v3: _A Large-Scale Comprehensive Measurement of AI-Generated Code in Real-World Repositories_, v3, 1 Jul 2026. https://arxiv.org/abs/2603.27130
- **Method:** code in public GitHub repositories found through attribution comments (such as "generated by ChatGPT"), filtered by an LLM classifier and manual checks. v3: 19,816 AI-involved files in 12,749 commits; ChatGPT 83.3%, Copilot 10.8%. Each AI unit is matched to human controls in the same repository and language, "within 20% lines of code" of the AI target. 77 code-level metrics.
- **v2 says:** "AI-generated code is consistently more verbose across files and functions", "not due to additional comments". File-level PLOC 256.57 vs 192.68, SLOC 171.47 vs 132.14, blank lines 38.87 vs 25.93. Per function: statements 8.20 vs 5.59 (d = 0.155), parameters 1.50 vs 1.39 (d = 0.062), max nesting depth 0.787 vs 0.582 (d = 0.172). Human files hold more functions (11.67 vs 6.62).
- **v3 says (re-sampled to sub-file units with stable pre-AI controls):** "no statistically significant differences on PLOC, SLOC, and" CLOC; the paper concludes "real-world AI-Human differences on code-level metrics are rather small".
- **Caveat:** not peer-reviewed. Attribution comments select code that someone chose to label, mostly ChatGPT, often edited by humans. The size matching makes a null result on file length partly built in, which may be why v3 found none.
- **For the post:** the one large real-world study with per-function statement, parameter and nesting counts, i.e. the units `max-statements`, `max-params` and `max-depth` measure. The effects were small in v2 and gone in v3. Cite v3, and say the headline changed between versions.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2603.27130v2.txt`, `arxiv-2603.27130v2.layout.txt`, `arxiv-2603.27130.layout.txt`, `arxiv-2603.27130.txt`

### 5.6 Takerngsaksiri et al., ICSME 2025 (Atlassian): an agent's code is slightly longer. VERIFIED (arXiv full text v3; Crossref); Vendor (Atlassian)

- **Citation:** Wannita Takerngsaksiri, Chakkrit Tantithamthavorn, Micheal Fu, Jirat Pasuksmit, Kun Chen, Ming Wu, _Code Readability in the Age of Large Language Models: An Industrial Case Study from Atlassian_, ICSME 2025, https://doi.org/10.1109/ICSME64153.2025.00073 ; arXiv:2501.11264 v3.
- **Method:** Atlassian's internal agent HULA (GPT-4, human feedback disabled) resolved 144 Jira issues touching 250 files in six languages; its code compared with the human-written code for the same issues on eight Multimetric measures.
- **What it says:** HULA "generates code that is highly similar to humans with only a slightly longer code".
- **Numbers:** Lines of Code, Cliff's δ = 0.230 (small, p < 0.001); cyclomatic complexity δ = 0.015 (negligible).
- **Caveat:** one company, one agent, one model (GPT-4); file-level LOC, not functions.
- **For the post:** the one industrial agent-vs-human comparison found: slightly longer files, no difference in branching.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2501.11264.layout.txt`

### 5.7 Vathana et al. (arXiv 2026): LLM-written unit tests are three times longer. VERIFIED (arXiv full text)

- **Citation:** Phouvadeth Vathana, Prapti Bhatt, Rishi Patel, Nasir U. Eisty (University of Tennessee), _LLM vs. Human Unit Tests: Fault Detection on Real Python Bugs_, arXiv:2606.08588 v1, 7 Jun 2026.
- **Method:** Gemini 2.5 Flash with retrieval writes tests for 52 tasks (29 BugsInPy bugs plus two smaller benchmarks), compared with developer-written tests.
- **Numbers:** "31.0 lines on average versus 9.6 for human tests" (3.2×, p < 0.001); assertions 5.5 vs 3.2; fault detection 69.0% vs 17.2%.
- **Caveat:** small, one model, Python, preprint. The longer tests also caught more faults.
- **For the post:** test code is where `max-lines-per-function` fires most on `describe` callbacks. Here the longer LLM tests were the better tests.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2606.08588.layout.txt`

### 5.8 Ogenrwot and Businge, MSR '26 (Mining Challenge): agent PRs add slightly less code. VERIFIED (arXiv full text v3)

- **Citation:** Daniel Ogenrwot, John Businge, _How AI Coding Agents Modify Code: A Large-Scale Study of GitHub Pull Requests_, MSR 2026 Mining Challenge, https://doi.org/10.1145/3793302.3793603 ; arXiv:2601.17581 v3, 6 Apr 2026.
- **Method:** AIDev (MSR 2026 challenge version): 24,014 merged agent PRs (440,295 commits) vs 5,081 merged human PRs (23,242 commits); Mann–Whitney and Cliff's δ.
- **What it says:** "Agentic PRs tend to introduce smaller and more localized changes than Human PRs".
- **Numbers (Cliff's δ):** commits 0.5429 (large), files touched 0.4487, deletions 0.4462 (medium), additions 0.2836, total line changes 0.3158 (small).
- **Caveat:** PR size, not function or file length. The paper is internally inconsistent on commits: the body says human PRs "often involve more commits", but its own totals are 18.3 commits per agent PR and 4.6 per human PR.
- **For the post:** agents don't obviously write more code per change than humans in the wild. Use it only as context.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2601.17581.layout.txt`

### 5.9 No study compares `max-params`, `max-statements` or `max-depth` distributions for agent and human JavaScript or TypeScript. Negative finding

- The nearest are Mao et al. v2 (5.5; statement, parameter and nesting counts per function, mixed languages, small effects) and Cotroneo et al. (5.2; NLOC and CCN, Python and Java). No study found counts nested callbacks, classes per file or switch cases in agent code.
- **For the post:** if the post wants this number, measure it with the corpus harness on agent PRs.

---

### 5.10 Already covered in `cognitive-complexity.md` §5.1, with what Xie et al. say about length. VERIFIED (reopened Xie et al. arXiv v2)

- CodeMind (TSE 2026) and Xie, Gu, Shi and Shen (ICML 2026, arXiv:2602.07882 v2, 27 May 2026) are there. For this post, Xie et al.'s point is that **length carries the signal**: Halstead's zero-order correlations with pass@1 are −0.97 (repair) and −0.90 (translation), and cyclomatic −0.78 (execution reasoning), but "these correlations substantially weaken once code length is controlled for". Their appendix models CC as roughly linear in length. So for model accuracy, length is the variable to beat, not a nuisance.
- **Caveat:** DeepSeek-V3 on 271 repair and 535 translation problems; the length here is the length of the code the model works on.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2602.07882.txt`

### 5.11 Liu et al., _Lost in the Middle_, TACL 2024. VERIFIED (arXiv full text; Crossref). Varies context length and position

- **Citation:** Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paranjape, Michele Bevilacqua, Fabio Petroni, Percy Liang, _Lost in the Middle: How Language Models Use Long Contexts_, TACL 12:157–173, 2024, https://doi.org/10.1162/tacl_a_00638 ; arXiv:2307.03172.
- **Method:** multi-document QA (10, 20, 30 documents) and synthetic key-value retrieval, moving the relevant item through the context.
- **What it says:** "performance can degrade significantly when changing the position of relevant information"; a "U-shaped performance curve"; "extended-context models are not necessarily better at using their input context".
- **Numbers:** with 20 documents and the answer in the middle, GPT-3.5-Turbo scores below its closed-book 56.1%.
- **Caveat:** natural-language QA, 2023 models; no code.
- **For the post:** the classic source for the claim that models use the middle of a long input worse. It is about prompts, not functions.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2307.03172.txt`; `src/crossref-tacl_a_00638.json`

### 5.12 Hsieh et al., _RULER_, COLM 2024 (NVIDIA). VERIFIED (arXiv full text v3). Varies context length

- **Citation:** Cheng-Ping Hsieh, Simeng Sun, Samuel Kriman, Shantanu Acharya, Dima Rekesh, Fei Jia, Yang Zhang, Boris Ginsburg, _RULER: What's the Real Context Size of Your Long-Context Language Models?_, COLM 2024, arXiv:2404.06654.
- **Method:** 13 synthetic tasks (retrieval variants, multi-hop tracing, aggregation, QA) at 4K–128K tokens; 17 models.
- **What it says:** "almost all models exhibit large performance drops as the context length increases"; of models claiming 32K or more, "only half of them can maintain satisfactory performance at the length of 32K".
- **For the post:** effective context is shorter than advertised. Still tokens of prompt, not one file.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2404.06654.txt`

### 5.13 Du et al., Findings of EMNLP 2025: length alone hurts, even as whitespace. VERIFIED (arXiv full text). Varies context length

- **Citation:** Yufeng Du, Minyang Tian, Srikanth Ronanki, Subendhu Rongali, Sravan Bodapati, Aram Galstyan, Azton Wells, Roy Schwartz, Eliu A Huerta, Hao Peng, _Context Length Alone Hurts LLM Performance Despite Perfect Retrieval_, Findings of EMNLP 2025, arXiv:2510.05381. (Some authors at Amazon.)
- **Method:** math, QA and HumanEval with the needed evidence present and perfectly retrievable, padded with essays, whitespace or masked tokens up to about 30K tokens; five models.
- **What it says:** performance still "degrades substantially (13.9%–85%) as input length increases"; "This failure occurs even when the irrelevant tokens are replaced with minimally distracting whitespace". Conclusion: "the sheer length of the input alone can hurt LLM performance".
- **Numbers:** with whitespace padding, open models drop "at least 7% at 30K space tokens"; closed models degrade less, and Gemini on GSM8K improves 8.6% at 30K.
- **Caveat:** thousands of padding tokens, far beyond a blank line or two. Not evidence that blank lines inside a function hurt.
- **For the post:** the strongest result that raw length, not distraction, costs accuracy. Scale matters: it shows up at thousands of tokens of context, not at a 60-line function.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2510.05381.txt`

### 5.14 Hong, Troynikov and Huber, _Context Rot_ (Chroma technical report, 14 Jul 2025). VERIFIED (page text); not peer-reviewed; Vendor (Chroma). Varies context length

- **Citation:** Kelly Hong, Anton Troynikov, Jeff Huber, _Context Rot: How Increasing Input Tokens Impacts LLM Performance_, Chroma, 14 Jul 2025, https://research.trychroma.com/context-rot
- **Method:** 18 models (GPT-4.1, Claude 4, Gemini 2.5, Qwen3 and others) on needle-in-a-haystack variants, a repeated-words task, and 306 LongMemEval prompts in a _focused_ (~300 tokens) and a _full_ (~113k tokens) version. "Each task remains intentionally simple".
- **What it says:** "performance grows increasingly unreliable as input length grows"; "significantly higher performance on focused prompts compared to full prompts" for every model family.
- **Caveat:** a retrieval-database vendor's report; LLM judges; no code tasks.
- **For the post:** a widely cited name ("context rot") with data behind it. Use it for agent context, not for function length.
- **Text:** `scratchpad/length-lit/B/text/chroma-context-rot.txt`

### 5.15 Li et al., _LongCodeU_ (arXiv 2025, Peking University). VERIFIED (arXiv full text v1). Varies code context length

- **Citation:** Jia Li, Xuyuan Guo, Lei Li, Kechi Zhang, Ge Li and co-authors, _LONGCODEU: Benchmarking Long-Context Language Models on Long Code Understanding_, arXiv:2503.04359 v1, 6 Mar 2025.
- **Method:** 8 tasks in four aspects on real repositories, inputs from 0 to 128K tokens; 9 models.
- **What it says:** "performance of LCLMs drops dramatically when the long code length is greater than 32K"; "inter-code unit relation understanding is the most challenging for LCLMs".
- **Caveat:** preprint (venue not stated in the arXiv record). "Long code" here is tens of thousands of tokens.
- **For the post:** relations between code units are harder for models than understanding one unit. That cuts against splitting for its own sake: every split adds a relation.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2503.04359.txt`

### 5.16 Rando et al., _LongCodeBench_, COLM 2025: longer files, better accuracy. VERIFIED (arXiv full text v3). Varies context length; analyses file length within it

- **Citation:** Stefano Rando, Luca Romani, Alessio Sampieri, Luca Franco, John Yang, Yuta Kyuragi, Fabio Galasso, Tatsunori Hashimoto, _LongCodeBench: Evaluating Coding LLMs at 1M Context Windows_, COLM 2025, arXiv:2505.07897 v3.
- **Method:** QA (LongCodeQA) and bug fixing (LongSWE-Bench) from real GitHub issues, with whole repositories as context in brackets from 32K to 1M tokens.
- **What it says:** "long-context remains a weakness for all models". Within each context bracket, splitting samples at the median file length, Gemini 2 Flash shows "longer files are associated with higher accuracy in 5 out of 6 brackets"; "This outcome is contrary to expectations".
- **Numbers:** Claude 3.5 Sonnet on LongSWE-Bench falls from 29% to 3% between 32K and 256K. The file-length gap "reaches nearly 40% in the 512K bracket".
- **Caveat:** one model for the file-length split, a median split, nothing else controlled. Fewer, longer files also means fewer files.
- **For the post:** the only result found that holds total context roughly fixed and looks at file length. At a fixed context, fewer longer files did better than many short ones. Thin, but it points the opposite way from 'small files help agents'.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2505.07897.txt`

### 5.17 Liu et al., _RepoQA_ (arXiv 2024): context fixed at 16K; comments don't help. VERIFIED (arXiv full text v1). Holds context length fixed

- **Citation:** Jiawei Liu, Jia Le Tian, Vijay Daita, Yuxiang Wei, Yifeng Ding, Yuhan Katherine Wang, Jun Yang, Lingming Zhang, _RepoQA: Evaluating Long Context Code Understanding_, arXiv:2406.06025.
- **Method:** "Searching Needle Function": find a function from its description in 16K tokens of repository code; 500 tasks from 50 repositories in 5 languages; 33 models.
- **What it says:** "models may understand code better without comments".
- **For the post:** doesn't vary length. Only useful as a reminder that what fills the lines matters more than how many there are.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2406.06025.txt`

### 5.18 Lee, Sharma and Hu, _Bug In the Code Stack_ (arXiv 2024). VERIFIED (arXiv full text). Varies the length of a file built from snippets

- **Citation:** Hokyung (Andy) Lee, Sumanyu Sharma, Bing Hu (University of Waterloo; Hamming.ai), _Bug In the Code Stack: Can LLMs Find Bugs in Large Python Code Stacks_, arXiv:2406.15325 v1, 21 Jun 2024.
- **Method:** Python Alpaca snippets stacked into one source text of 500 to 16K tokens, with one syntax bug inserted at five depths; the model must name the line and bug type; 11 models, 150 runs each.
- **What it says:** "there is a notable correlation between longer context lengths and performance degradation", and bugs near the middle are found less often.
- **Numbers:** GPT-4o drops 8% from 500 to 16K tokens, Gemini-1.5-Pro 16%, Claude 3 Opus 66%.
- **Caveat:** syntax bugs only, synthetic stacks of unrelated snippets, 2024 models, not peer-reviewed.
- **For the post:** the closest thing to 'a longer file makes bug-finding harder', and the effect at a few thousand tokens was small for the best model.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2406.15325.txt`, `.layout.txt`

### 5.19 Štorek et al., _Sense and Sensitivity_, ACL 2026: lost in the middle, for code. VERIFIED (arXiv abstract v5 and full text searched). Varies code context length and position

- **Citation:** Adam Štorek, Mukur Gupta, Samira Hajizadeh, Prashast Srivastava, Suman Jana, _Sense and Sensitivity: Examining the Influence of Semantic Recall on Long Context Code Understanding_, arXiv:2505.13353 v5 (comment: "Accepted to ACL 2026 (main)").
- **Method:** target function among 20–80 distractor functions of about 200 tokens each (about 4K to 16K tokens), 10 models; lexical recall (retrieve the code) vs semantic recall (reason about what it does).
- **What it says:** frontier models have "near-perfect, position-independent lexical recall", but "semantic recall degrades severely when code is centrally positioned in long contexts".
- **For the post:** a file of 20–80 functions is a realistic large file. Models can find the function; reasoning about it is what drops. Again the cost is position and total context.
- **Text:** `scratchpad/length-lit/B/src/arxiv-api-2.xml` (abstract), `text/arxiv-2505.13353.txt`

### 5.20 Jimenez et al., _SWE-bench_, ICLR 2024: context, whole files and patch length. VERIFIED (arXiv full text v3)

- **Citation:** Carlos E. Jimenez, John Yang, Alexander Wettig, Shunyu Yao, Kexin Pei, Ofir Press, Karthik Narasimhan, _SWE-bench: Can Language Models Resolve Real-World GitHub Issues?_, ICLR 2024, arXiv:2310.06770.
- **What it says and numbers:**
  - "as total context length increases, Claude 2's performance drops considerably" (retrieval setting).
  - "Generating patches is easier than generating whole files": Claude 2 resolves 2.2% when regenerating whole files vs 4.8% with patches.
  - Showing only the edited lines of the oracle files (±15 lines) raised GPT-4 from 1.3% to 3.4% and Claude 2 from 4.8% to 5.9%.
  - Model patches that apply are "less than half the total length" of gold patches (30.1 vs 74.5 lines).
- **Caveat:** 2023 models with no agent loop. The collapsed-file ablation also hands the model the location, so it is not a pure length effect.
- **For the post:** writing whole files back out was the failure mode, and diff-based editing (now standard in agents) is the fix, not shorter files.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2310.06770.txt`

### 5.21 Yang et al., _SWE-agent_, NeurIPS 2024: show the agent 100 lines, not the whole file. VERIFIED (arXiv full text v3). Varies how much of a file the agent sees

- **Citation:** John Yang, Carlos E. Jimenez, Alexander Wettig, Kilian Lieret, Shunyu Yao, Karthik Narasimhan, Ofir Press, _SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering_, NeurIPS 2024, arXiv:2405.15793.
- **Method:** ablations of the agent's interface with GPT-4 Turbo (gpt-4-1106-preview) on SWE-bench Lite (300 instances). The file viewer shows a window of lines the agent scrolls.
- **What it says:** "agents are sensitive to the number of lines the file viewer displays"; and, for the editor, "Linting is beneficial for stymieing cascading errors".
- **Numbers (resolve rate):** 30-line window 14.3%, 100-line window 18.0%, full file 12.7%. Editing without the lint check 15.0%.
- **Caveat:** one 2024 model; the harness, not the codebase, decides the window.
- **For the post:** the strongest evidence that a model does worse when a whole long file is dumped into its context, and better at about 100 lines. But the fix it found was in the tool (a viewer window), which is where Claude Code, Codex and Gemini CLI now put their limits (5.25–5.33), not in the source.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2405.15793.txt`

### 5.22 Sun et al. (arXiv 2025) and Huang et al. (ASE 2023): longer buggy functions get repaired less. VERIFIED (full texts; Crossref for ASE). Varies the length of the function under repair

- **Citations:** Jiajun Sun, Fengjie Li, Xinzhu Qi, Hongyu Zhang, Jiajun Jiang, _Empirical Evaluation of Large Language Models in Automated Program Repair_, arXiv:2506.13186 v1, 16 Jun 2025 (no venue stated). Kai Huang, Xiangxin Meng, Jian Zhang and co-authors, _An Empirical Study on Fine-Tuning Large Language Models of Code for Automated Program Repair_, ASE 2023, pp. 1162–1174, https://doi.org/10.1109/ASE56229.2023.00181 (author copy at zhangj111.github.io).
- **Method (Sun):** CodeLlama, LLaMA, StarCoder and DeepSeek-Coder repair the whole buggy function across Defects4J, BugsCpp, IntroClass, IntroClass-Java, ConDefects-Java and ConDefects-Py (Java, C/C++, Python).
- **What they say:** "Bugs of shorter length are more likely to be successfully repaired by LLMs"; models show "pronounced difficulties in repairing long functions, especially those exceeding 100 lines". Huang et al. (fine-tuned small models): "as the length of input/output sequences increases, the repair capability of the model decreases".
- **Caveat:** correlational. Longer buggy functions also tend to hold harder bugs, and Huang et al.'s models had short input limits. Neither controls for complexity, and Xie et al. (5.10) show length and complexity are hard to separate.
- **For the post:** the most direct 'longer function, worse repair' evidence, with a confound the post must name.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2506.13186.txt`, `text/ase23-apr-study.txt`; `src/crossref-huang-ase23.json`

### 5.23 Bogomolov et al., _Long Code Arena_ (arXiv 2024, JetBrains Research): more relevant context helps. VERIFIED (arXiv full text); Vendor (JetBrains)

- **Citation:** Egor Bogomolov, Aleksandra Eliseeva, Timur Galimzyanov and co-authors, _Long Code Arena: a Set of Benchmarks for Long-Context Code Models_, arXiv:2406.11612 v1, 17 Jun 2024.
- **What it says:** on module summarization, "both increasing the context size and the size of the model" leads to higher quality.
- **For the post:** the counterweight to 5.11–5.14: when the extra context is relevant, more helps. Length costs when it is irrelevant.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2406.11612.txt`

### 5.24 Aider's laziness benchmark: large methods made 2023 models elide code. ANECDOTAL (tool author's benchmark, code public); Vendor (Aider)

- **Citation:** Paul Gauthier, _Unified diffs make GPT-4 Turbo 3X less lazy_, aider.chat, 21 Dec 2023 (date from the `_posts` filename); refactoring leaderboard and _Sonnet is the opposite of lazy_ (1 Jul 2024), all read from Aider-AI/aider at `5dc9490b` (22 May 2026).
- **Method:** "89 python refactoring tasks" moving a large method out of a larger class, picked because the class has "at least twice as much code as the method itself". A check flags code elided as comments.
- **What it says:** GPT-4 Turbo wrote comments like "...include original method body..." instead of the code; "The benchmark was designed to use large files, and" "28% of them are too large to fit in June GPT-4's 8k context window." Edit-format docs: GPT-4 Turbo models "tended to elide large sections of code".
- **Numbers:** gpt-4-1106-preview 20% with search/replace (lazy on 12 tasks) vs 61% with unified diffs. On the current leaderboard data, claude-3-5-sonnet-20241022 scores 92.1%; gpt-4-turbo-2024-04-09 (diff) 21.4%.
- **Caveat:** one tool author's benchmark; Python; 2023–24 models. By late 2024 the failure was mostly gone.
- **For the post:** the period evidence behind 'agents can't handle big files'. It was a model-and-edit-format problem that later models and diff formats largely fixed.
- **Text:** `scratchpad/length-lit/B/src/aider/unified-diffs.md`, `edit-formats.md`, `refactor.md`, `refactor_leaderboard.yml`, `2024-07-01-sonnet-not-lazy.md`

---

### 5.25 Claude Code docs: the limits are on the Read tool and on CLAUDE.md, not on code. ANECDOTAL (official docs); Vendor (Anthropic)

- **Citation:** code.claude.com docs, read as Markdown on 25 Oct 2026: _Tools reference_ (Read tool behavior), _Environment variables_, _Memory_, _Best practices_; Agent SDK TypeScript reference.
- **What it says (tool):** "By default one call returns at most 25,000 tokens", configurable with `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`, and Read "refuses a whole file over 256 KB", "so Claude reads a larger file in pages" with `offset` and `limit`. Since v2.1.296 `allow_large: true` reads a whole file sized against the remaining context. An over-limit file returns the first page with a "PARTIAL view" notice.
- **What it says (instruction files):** "target under 200 lines per CLAUDE.md file." "Longer files consume more context and reduce adherence." `MEMORY.md` loads its first 200 lines or 25KB. Best practices: "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"
- **Not found:** no page tells Claude to keep functions short or files small, and no public page states a per-read line count.
- **For the post:** the vendor bounds what the model reads per call and the size of its instructions, and then pages through long files. A source-code line limit is a different thing.
- **Text:** `scratchpad/length-lit/B/src/claude-code/tools-reference.md`, `env-vars.md`, `memory.md`, `best-practices.md`, `agent-sdk-ts.md`

### 5.26 Anthropic's prompting guide: don't create helpers for one-time operations. ANECDOTAL (official docs); Vendor (Anthropic)

- **Citation:** platform.claude.com, _Prompting best practices_ (claude-prompting-best-practices), section "Overeagerness", read 25 Oct 2026.
- **What it says:** Claude Opus 4.5 and 4.6 "have a tendency to overengineer by creating extra files", and the sample prompt says "Don't create helpers, utilities, or abstractions for one-time" operations, and "The right amount of complexity is the minimum needed for the current task."
- **For the post:** the vendor's own guidance pulls against 'split until it's under the limit'. A size rule and this prompt give an agent opposite instructions.
- **Text:** `scratchpad/length-lit/B/src/anthropic/claude-prompting-best-practices.md`

### 5.27 OpenAI Codex: a 250-line read chunk that came and went, and a 32 KiB AGENTS.md cap. ANECDOTAL (source at pinned commits; docs); Vendor (OpenAI)

- **Citation:** openai/codex `codex-rs/core/prompt.md` at `90d892f4` (12 Aug 2025) and `b1c291e2` (15 Sep 2025); absent at `26d0d822` (12 Dec 2025, _Update base prompt_). Current prompts `gpt_5_2_prompt.md` and `gpt-5.2-codex_prompt.md` at `970111f6` (23 Oct 2026). Docs: _Custom instructions with AGENTS.md_, developers.openai.com/codex/guides/agents-md (Markdown), read 25 Oct 2026.
- **What the prompt said (Aug–Sep 2025):** "Read files in chunks with a max chunk size of 250 lines." and "Command line output will be truncated after 10 kilobytes or 256 lines of output".
- **What the current prompt says:** only "Do not use python scripts to attempt to output larger chunks of a file." On code: "Changes should be minimal and focused on the task."
- **Docs:** Codex "stops adding files once the combined size reaches the limit" set by `project_doc_max_bytes` (32 KiB by default). For review rules: "reserve formatting and lint checks for CI".
- **For the post:** another tool-side read limit, since dropped, and a size cap on instructions. Nothing on function or file length in the code.
- **Text:** `scratchpad/length-lit/B/src/codex/prompt-md-90d892f4fd5ffaf35b3dacabacdd260d76039581.md`, `prompt-md-b1c291e2bbca0706ec9b2888f358646e65a8f315.md`, `prompt-md-26d0d822a2fcff0975f6ca244632671993e3cfa1.md`, `gpt_5_2_prompt.md`, `prompt-md-history.txt`, `docs-codex_guides_agents-md.md.html`

### 5.28 agents.md: no size guidance. Negative finding (page read 25 Oct 2026)

- https://agents.md/ suggests sections such as "Code style guidelines" and its example lists "Use functional patterns where possible", but says nothing about file or function size, or about the AGENTS.md file's own length beyond nesting files in monorepos.
- **Text:** `scratchpad/length-lit/B/text/agents-md.txt`

### 5.29 Cursor docs: rules under 500 lines, "Use a linter instead", and an example rule capping components at 200 lines. ANECDOTAL (official docs; Wayback); Vendor (Anysphere)

- **Citation:** cursor.com/docs/context/rules, read 25 Oct 2026; Wayback snapshot of 2 Feb 2026 (`20260202000150`) compared.
- **What it says:** "Keep rules under 500 lines" and "Split large rules into multiple, composable rules". Under what to avoid: "Copying entire style guides", "Use a linter instead." An example auto-attached rule for `src/components/**/*.tsx`: "Keep components under 200 lines." "Extract subcomponents into the same directory when a file grows beyond that".
- **Dates:** the 500-line and linter lines are in the 2 Feb 2026 snapshot; the 200-line component example is not, so it was added after that.
- **Not found:** the _Agent tools_ page describes Read files without a size limit.
- **For the post:** the one vendor whose own example tells the agent to split files at a line count, and the same page tells users to leave style to a linter.
- **Text:** `scratchpad/length-lit/B/text/cursor-docs_context_rules.txt`, `text/cursor-docs_agent_tools.txt`; `src/cursor/wayback-20260202000150.html`

### 5.30 GitHub Copilot docs: example review rules with "under 50 lines" and "under 200 lines". ANECDOTAL (github/docs at a pinned commit); Vendor (GitHub/Microsoft)

- **Citation:** github/docs at `02c25d16` (23 Oct 2026): `content/copilot/tutorials/customize-code-review.md`, `data/reusables/copilot/custom-instructions-effective.md`; history of `data/reusables/copilot/code-review/custom-instructions-limit.md` (`cf11c1c3`, 26 Feb 2026; `a31ee09c`, 7 Apr 2026; `f0946763`, 15 Jun 2026).
- **What it says:** instructions "should be short, self-contained statements"; "Limit any single instruction file to a maximum of about 1,000 lines." The tutorial's example review rules include "Functions should be focused and appropriately sized (under 50 lines)" and, for React, "Keep components small and focused (under 200 lines)".
- **Dated limit:** from February to April 2026 the docs said code review "only reads the first 4,000 characters of any custom instruction file"; the note was removed on 15 Jun 2026 (_Remove 4,000-character limit note…_).
- **For the post:** GitHub's example tells its review bot to enforce a function-length cap by judgment, with no measurement behind the 50.
- **Text:** `scratchpad/length-lit/B/src/copilot/content_copilot_tutorials_customize-code-review.md`, `data_reusables_copilot_custom-instructions-effective.md`, `ccr-limit-history.txt`

### 5.31 Gemini CLI `read_file`: 2,000 lines per read, 2,000 characters per line. ANECDOTAL (source at a pinned commit); Vendor (Google)

- **Citation:** google-gemini/gemini-cli at `cd1b45c2` (23 Oct 2026): `packages/core/src/utils/constants.ts`, `utils/fileUtils.ts`, `tools/read-file.ts`.
- **What the code says:** `DEFAULT_MAX_LINES_TEXT_FILE = 2000`, `MAX_LINE_LENGTH_TEXT_FILE = 2000`, `MAX_FILE_SIZE_MB = 20`. Longer lines are cut with `... [truncated]`, and a longer file returns "IMPORTANT: The file content has been truncated." with the range shown and how to read the next one.
- **For the post:** the tool limit is 2,000 lines, far above any `max-lines` setting, and paged. Only a 2,000-character line is actually cut, which is a `max-len` point: minified or generated lines are what get lost.
- **Text:** `scratchpad/length-lit/B/src/gemini-cli/constants.ts`, `fileUtils.ts`, `read-file.ts`

### 5.32 Aider docs: add fewer files; "whole" edits are costly. ANECDOTAL (docs at `5dc9490b`); Vendor (Aider)

- **What it says:** _Tips_: "Too much irrelevant code will distract and confuse the LLM"; add only the files that need editing. _Edit formats_: the whole format "can be slow and costly because the LLM has to return" the entire file.
- **For the post:** Aider's advice is about what goes in the context, and its answer to long files is a diff format and a repo map, not shorter files.
- **Text:** `scratchpad/length-lit/B/src/aider/tips.md`, `edit-formats.md`

### 5.33 Summary: tool limits versus code limits. My synthesis of 5.25–5.32

| Vendor | Limit on what the model reads | Limit on instructions | Guidance on code size |
| --- | --- | --- | --- |
| Anthropic (Claude Code) | 25,000 tokens per Read; whole file refused over 256 KB; paging | CLAUDE.md target under 200 lines; MEMORY.md first 200 lines or 25KB | None; prompting guide warns against one-time helpers |
| OpenAI (Codex) | 250-line read chunks (prompt, Aug–Sep 2025, since removed) | AGENTS.md chain 32 KiB | "minimal and focused" changes |
| Google (Gemini CLI) | 2,000 lines per read; 2,000 characters per line | — | None found |
| Anysphere (Cursor) | None documented | Rules under 500 lines | Example rule: components under 200 lines |
| GitHub (Copilot) | — | About 1,000 lines; 4,000 characters for code review (Feb–Jun 2026) | Example review rules: functions under 50 lines, components under 200 |
| Aider | Diff edit formats; repo map | — | None |

- **For the post:** every tool caps and pages what it reads; none of the read limits is anywhere near a typical `max-lines` setting, except Codex's old 250-line chunk. The only line counts for source code appear in example rule files from Cursor and GitHub, with no stated basis.

---

### 5.34 Böckeler, _Maintainability sensors for coding agents_ (martinfowler.com, May 2026), reopened for the length rules. ANECDOTAL (practitioner article)

- **Citation:** Birgitta Böckeler (Thoughtworks), martinfowler.com, instalments dated 19, 20 and 27 May 2026, https://martinfowler.com/articles/sensors-for-coding-agents.html. Cross-reference: `cognitive-complexity.md` §5.3.
- **Setup:** Böckeler names "Max number of arguments for functions", "File length", "Function length" and cyclomatic complexity as "the AI failure modes that are the most low-hanging fruit for static code analysis", and notes "these weren't even active in ESLint's default preset". A custom ESLint formatter rewrote messages; for thresholds the agent was told "it may slightly increase the thresholds if it thinks that a refactoring is unnecessary" or impossible. Tools: mostly Cursor, then Claude Code and OpenCode; Claude Sonnet by default, Cursor's composer-2 for much implementation (Claude Opus 4.7 only for the later analysis prompts).
- **What the agent did with the length rules:** the one trade-off Böckeler saw "was created by the max-lines and max-lines-per-function rules". Böckeler saw "quite a bit of useful refactoring and breakdown into smaller functions and components", but in React "a worrying trend of components with lots and lots of properties", from "passing values through a growing chain of smaller and smaller components". Later: "the refactorings to smaller and smaller functions pushed complexity into component property chains".
- **Thresholds:** raising a threshold happened for cyclomatic complexity, where "It was the only category where it did that". Böckeler does not report threshold raises for length or argument rules.
- **Max arguments:** a parameter object the AI introduced "but never fully followed through" on, after a change touched more than 40 files.
- **The worry:** "feedback overload for the agent, sending it into a spiral of over-engineered refactorings".
- **Caveat:** one person, one application, no counts.
- **For the post:** the best first-hand account of an agent under `max-lines`: it complies by splitting, and the complexity moves into props and call chains. That is the Goodhart effect without any cheating.
- **Text:** `scratchpad/length-lit/B/text/bockeler-sensors.txt`

### 5.35 Claude Code issues #12326 and #12882: `eslint-disable max-lines-per-function` in "hundreds of files". ANECDOTAL (single user's reports)

- **Citation:** anthropics/claude-code #12326, _[Bug] Claude repeatedly adds ESLint disable comments to bypass code quality rules_, 25 Nov 2025, Claude Code 2.0.53, closed as duplicate; #12882, 2 Dec 2025, same reporter, 2.0.56, closed as duplicate. Read with `gh api` (read-only).
- **What it says:** the agent added `/* eslint-disable max-lines-per-function */`, "Inserting this into hundreds of files"; "Claude always trying to find a way to get around very specific limits".
- **Caveat:** one user, no reproduction; the "hundreds" is the reporter's word.
- **For the post:** the suppression route, the opposite of 5.34's splitting route. Both are real; neither has a rate. Also cited in `security-rules.md` §5.3.
- **Text:** `scratchpad/length-lit/B/src/gh/cc-issue-12326.json`, `cc-issue-12882.json` (trimmed to the report text)

### 5.36 Practitioners now use `max-lines` as an agent guardrail, and write rules against the obvious split. ANECDOTAL (GitHub PRs, issues, gist)

- **ronijaakkola/game-off-2026 PR #42** (merged 19 Oct 2026; the PR text says it was generated by Claude Code): lowers gdlint `max-file-lines` from 1000 to 600 because "It works as a size cap for agents", about 5,000 tokens. The standards it adds say "split by job, not line count" and "never numbered parts or *_helpers.gd".
- **williamthorsen/eslint-config #263** (6 Oct 2026): a test file grows to thousands of lines "that an agent extends rather than splits", because "A review sees the diff, not the file". Proposes `max-lines` at 300 (source) and 500 (tests), skipping blank lines and comments, at `warn`, which would flag about 2% of source and 3% of test files across the author's repos.
- **Illyism's gist** (created 15 Mar 2025): a custom 200-line rule billed as "My game-changing ESLint rule that makes AI coding 10x better", skipping blanks, comments and imports, with a message telling the agent to split into modules. No data.
- **BluMintInc/eslint-custom-rules #1296** (13 Jul 2026): proposes a rule against `eslint-disable` comments justified by the agent harness ("worktree", "stop-hook", "claude"), saying "20+ live violations exist in the current agora tree today". Its `max-lines` examples are illustrative test cases, not observed ones.
- **For the post:** practitioners reach for `max-lines` because agents append rather than split, and the careful ones already guard against splitting by count. These are opinions with no outcome data.
- **Text:** `scratchpad/length-lit/B/src/gh/pr-ronijaakkola_game-off-2026-42.json`, `issue-williamthorsen_eslint-config-263.json`, `issue-BluMintInc_eslint-custom-rules-1296.json`; `src/web/gist-illyism.txt`

### 5.37 Horikawa et al. (arXiv 2025), reopened: agents rarely Extract Method, and splitting can leave complexity alone. VERIFIED (arXiv full text v1; replication data at `2b921f0a`)

- **Citation:** Kosei Horikawa, Hao Li, Yutaro Kashiwa, Bram Adams, Hajimu Iida, Ahmed E. Hassan, _Agentic Refactoring: An Empirical Study of AI Coding Agents_, arXiv:2511.04824 v1, 6 Nov 2025 (submitted to TOSEM). Replication package Mont9165/Agent_Refactoring_Analysis.
- **Method:** RefactoringMiner on 14,998 commits in 12,256 Java agent PRs from AIDev; 15,451 refactoring instances; DesigniteJava metrics before and after.
- **What it says:** in tangled commits agents "rename variables, extract small helpers". Extract Method is not in the agents' medium-level top three (Move And Inline Method 7.2%, Change Attribute Type 5.2%, Change Parameter Type 2.5%), so it is at most 2.5% of instances. Low-level edits cut method LOC slightly but raise cyclomatic complexity, so "localized refactoring may sometimes split code without reducing decision complexity".
- **Numbers (Table 7, median Δ):** method LOC −0.42 (low-level), −1.79 (medium-level); class LOC −15.25 (medium-level); method parameter count 0.00 to +0.11. Smell counts unchanged (median Δ 0).
- **Replication data (uploaded 21 Oct 2025, before the paper's project filtering, so a larger denominator):** Extract Method 1,665 of 65,859 instances (2.5%), Extract And Move Method 1,203, Split Method 31. In self-affirmed refactoring commits, Extract Method 418 of 13,215 (3.2%); its median method-LOC Δ is −3.0 with cyclomatic Δ 0.0.
- **Caveat:** Java only; preprint; replication counts don't match the paper's.
- **For the post:** in the wild, agents seldom split methods unprompted, and when they extract, method length drops a few lines while branching stays the same. That's the laundering pattern from our experiment (5.40), at scale.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2511.04824.layout.txt`; `src/horikawa/refactoring_type_counts_agentic.csv`, `refactoring_type_counts_sar.csv`, `refactoring_instances_summary.json`, `refactoring_heatmap_sar_median_delta.csv`

### 5.38 Ottenhof et al., MSR '26: Extract Method is 5% of developer refactorings and outside the agents' top ten. VERIFIED (arXiv full text v2)

- **Citation:** Lukas Ottenhof, Daniel Penner, Abram Hindle, Thibaud Lutellier, _How do Agents Refactor: An Empirical Study_, MSR 2026, https://doi.org/10.1145/3793302.3793577 ; arXiv:2601.20160 v2, 24 May 2026.
- **Method:** 1,278 agent PRs (2,626 commits) in 86 Java projects from AIDev vs 86 pre-2021 projects without agent activity; RefactoringMiner and DesigniteJava 3.0.
- **What it says:** "agent refactorings are dominated by annotation changes"; "Cursor's most common refactoring type was Extract Method (29.0%)".
- **Numbers:** developers: Extract Method 594 of 11,659 refactorings (5.09%, third). Agents: not in the top ten of 36,196, so below 2.32%. Cursor's 29.0% is of only 31 refactorings (about 9).
- **Caveat:** short paper; small per-agent samples; Claude Code's numbers are dominated by bulk annotation edits.
- **For the post:** unprompted, agents split methods less than developers do. A size limit is what would make them start.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2601.20160.layout.txt`

### 5.39 Blyth, Licorish, Treude and Wagner (arXiv 2025): with Pylint feedback, GPT-4o fixes long lines and keeps re-adding them. VERIFIED (arXiv full text)

- **Citation:** Scott Blyth, Sherlock A. Licorish, Christoph Treude, Markus Wagner, _Static Analysis as a Feedback Loop: Enhancing LLM-Generated Code Beyond Correctness_, arXiv:2508.14419 v1, 20 Aug 2025.
- **Method:** GPT-4o on PythonSecurityEval, up to ten rounds of feeding Bandit and Pylint findings back.
- **Numbers:** `line-too-long` (C0301) is in the top 10 issues in the initial code; resolution rate 0.84 across experiments; yet it was introduced 149 times during refinement. `too-many-arguments` (R0913) was introduced 14 times; `too-many-branches` (R0912) was one of three issues more prevalent after refinement. Readability (convention) violations fell from over 80% of snippets to 11%.
- **What it says:** "unintended readability issues were frequently introduced".
- **Caveat:** one model, Python, prompt loop rather than an agent.
- **For the post:** a line-length rule is the kind a model fixes easily and breaks again, which is the argument for leaving `max-len` to the formatter rather than to the agent.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2508.14419.layout.txt`, `arxiv-2508.14419.txt`

### 5.40 Our experiment: what agents did to function length and helper count under a cognitive-complexity error. Our experiment (2026-10-10), read from the report

- **Source:** `research/agent-experiment/results/cognitive-complexity/REPORT.md` (Claude Code 2.1.296 with `claude-opus-5-5`, Codex 0.155.1 with `gpt-6-astra`; 2 functions × 2 agents × 4 runs; `sonarjs/cognitive-complexity` at 15).
- **Helpers:** `formatTimespan` was "removed in place in 8 of 8, with no helpers" (one Claude run's lookup table adds two 0-scoring callbacks). For `computePreferredLocaleList`, "every run extracted a helper": 6 of 8 moved the inner loop verbatim into a helper scoring "14, one under the limit of 15", with decision points unchanged (10 → 10). The report calls it "complexity laundering."
- **Length:** code lines went 44 → 45 in the five early-return runs and 44 → 34–36 in the three lookup-table runs; 32 → 35 in the four Codex extractions, 32 → 37 in two Claude extractions, and 32 → 32 and 32 → 26 in the two Claude runs that also simplified. Median code lines after: s1/claude 36, s1/codex 45, s2/claude 34.5, s2/codex 35. In `computePreferredLocaleList` functions per file went 1 → 2 in seven runs and 1 → 3 in one; in `formatTimespan` they stayed at 1 except the run whose `.find` callbacks count as functions (1 → 3).
- **No cheating** in 16 of 16 under a prompt that forbids it.
- **For the post:** under a structural rule, the agents' usual fix kept length about the same or added a few lines and one function. Only the runs that changed the logic got shorter. A length limit would have been satisfied by the same verbatim moves.
- **Text:** `research/agent-experiment/results/cognitive-complexity/REPORT.md`

### 5.41 Agents deleting blank lines, joining lines or raising `max-lines` to pass: no study or primary report found. Negative finding; cross-reference

- **Searched:** WebSearch, GitHub issue search (`"max-lines-per-function"` with claude, codex, copilot; `"eslint-disable max-lines"`), the agent repos' issue trackers, and the AIDev-based papers above. Found only suppression (5.35), splitting (5.34, 5.37, 5.40) and practitioners' rules against numbered or helper-file splits (5.36). Böckeler's agent raised thresholds only for cyclomatic complexity (5.34).
- **Cross-reference:** reward hacking in coding agents (ImpossibleBench, METR, OpenAI's obfuscation paper) and Goodhart/Strathern are in `cognitive-complexity.md` §5.3; EvilGenie is in `security-rules.md` §5.5.
- **For the post:** compressing code to pass a line count is plausible but undocumented. Say so, or measure it with the experiment harness.

---

### 5.42 Pomian et al., ICSME 2024, and the EM-Assist demo (FSE 2024): most raw LLM Extract Method suggestions are hallucinations. VERIFIED (arXiv full texts; Crossref); Vendor (JetBrains; co-authors at JetBrains Research)

- **Citations:** Dorin Pomian, Abhiram Bellur, Malinda Dilhara, Zarina Kurbatova, Egor Bogomolov, Timofey Bryksin, Danny Dig, _Next-Generation Refactoring: Combining LLM Insights and IDE Capabilities for Extract Method_, ICSME 2024, pp. 275–287, https://doi.org/10.1109/ICSME58944.2024.00034 (arXiv:2401.15298 v2, titled _Together We Go Further: LLMs and IDE Static Analysis for Extract Method Refactoring_). Demo: _EM-Assist: Safe Automated ExtractMethod Refactoring with LLMs_, FSE 2024 Companion (tool demos), arXiv:2405.20551.
- **Method:** GPT-3.5 asked which statements of a long Java/Kotlin method to extract, on 1,752 Extract Method scenarios replicated from open-source history; suggestions filtered by IDE static analysis, ranked, and then **executed by IntelliJ's own refactoring engine**.
- **What it says:** the formative study found "up to 76.3% of the suggestions are hallucinations": they "seem plausible at first, but are actually deeply flawed". "57.4% of the suggested refactorings contain" "code fragments that are invalid to extract" (e.g. would not compile) and "18.9% are not useful" (e.g. the whole method). The tool "uses the IntelliJ IDE to apply the user-selected recommendation."
- **Numbers:** after filtering, recall of the developer's actual refactoring in the top 5 was 53.4% (previous best 39.4%); 81.3% of 16 industrial developers agreed with its suggestions on their own recent commits (demo: 94.4% of 18 rated it positively).
- **Level:** "invalid" means would not compile; behaviour preservation comes from the IDE engine, not the LLM.
- **For the post:** the LLM is useful for choosing what to extract and unreliable at doing it. Easy refactoring here means LLM judgment plus a deterministic engine.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2401.15298.txt`, `text/arxiv-2405.20551.txt`; `src/x/crossref-pomian.json`

### 5.43 Liu et al., _Automated Software Engineering_ 2025: 7% of LLM refactorings were unsafe, mostly silent behaviour changes. VERIFIED (arXiv full text; Crossref for the journal version)

- **Citation:** Bo Liu, Yanjie Jiang, Yuxia Zhang, Nan Niu, Guangjie Li, Hui Liu, _An Empirical Study on the Potential of LLMs in Automated Software Refactoring_, arXiv:2411.04444 v1, 7 Nov 2024; published as _Exploring the potential of general purpose LLMs in automated software refactoring: an empirical study_, Automated Software Engineering 32, article 26 (2025), https://doi.org/10.1007/s10515-025-00500-0 (I read the arXiv version).
- **Method:** 180 real refactorings from 20 Java projects; GPT-4 and Gemini given whole Java files; three experts judged the results by hand.
- **What it says:** of 313 solutions, 22 were "unsafe in that they either changed the functionality of the source code" "or introduced syntax errors"; 18 of the 22 changed semantics. "changes in functionality could be more dangerous because they are often harder" "to identify". Re-applying the detected refactorings with a tested engine (RefactoringMirror) "successfully avoided all of the buggy solutions".
- **Numbers:** unsafe 13 of 176 (7.4%, GPT-4) and 9 of 137 (6.6%, Gemini). 63.6% of GPT-4's solutions were judged comparable to or better than the experts'. Unprompted, GPT-4 found 28 and Gemini 7 of the 180 refactoring opportunities.
- **Level:** expert judgment of behaviour, not a test suite.
- **For the post:** one in fourteen LLM refactorings changed behaviour, usually in ways a compiler can't see. The fix the authors propose is, again, a refactoring engine.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2411.04444.txt`; `src/x/crossref-liu.json`, `src/x/crossref-10.1007_s10515-025-00500-0.json`

### 5.44 Cordeiro, Noei and Zou, TOSEM 2026: StarCoder2's refactorings pass tests 28% of the time. VERIFIED (arXiv full text v1; Crossref)

- **Citation:** Jonathan Cordeiro, Shayan Noei, Ying Zou (Queen's University), _An Empirical Study on the Code Refactoring Capability of Large Language Models_, ACM TOSEM (2026), https://doi.org/10.1145/3801158 ; arXiv:2411.02320 v1, 4 Nov 2024.
- **Method:** StarCoder2-15B-Instruct refactors code from refactoring commits in 30 Java projects; behaviour checked with EvoSuite-generated tests written against the pre-refactoring code (91.3% of a 381-test sample judged valid); smells by DesigniteJava.
- **What it says:** "StarCoder2 achieves a 28.36% pass@1 for our experiments"; 57.15% when the best of five passes.
- **The smell result has a denominator catch:** "reduces code smells by 20.1% more than developers" (44.36% vs 24.27%), but smell reduction is counted only on the code whose refactorings passed the tests; code it could not refactor safely is excluded.
- **Where it helps:** "condensing a long statement or shortening a long parameter list"; developers did better on modularization and encapsulation.
- **For the post:** a small open model clears size smells such as long parameter lists, but more than seven in ten of its first attempts fail generated tests.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2411.02320.txt`; `src/x/crossref-cordeiro.json`

### 5.45 Shirafuji et al., APSEC 2023: on 15-line programs, GPT-3.5 shortens code and deletes comments. VERIFIED (arXiv full text)

- **Citation:** Atsushi Shirafuji, Yusuke Oda, Jun Suzuki, Makoto Morishita, Yutaka Watanobe, _Refactoring Programs Using Large Language Models with Few-Shot Examples_, APSEC 2023, arXiv:2311.11690.
- **Method:** correct Python solutions to 44 Aizu Online Judge problems (mean 14.82 LOC); gpt-3.5-turbo-0301 makes 10 candidates each; correctness from the judge's hidden tests.
- **Numbers (Table II):** pass@1 87.44% (zero-shot) to 91.11% (3-shot), so 9–13% of single candidates fail the tests; pass@10 95.68%. On the correct outputs, LOC 14.82 → 10.99 and cyclomatic complexity 5.65 → 4.67. Comment lines per program 0.60 → 0.16.
- **What it says:** "unnecessary behaviors such as deleting or translating comments are also observed".
- **For the post:** toy-sized, but a clean test oracle: even on small programs, about one candidate in ten breaks behaviour, and the shortening partly comes from dropping comments.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2311.11690.txt`, `.layout.txt`

### 5.46 Chand et al., AIware '25: Extract Method with small open models, and why "LOC per method" flatters splitting. VERIFIED (arXiv full text)

- **Citation:** Sivajeet Chand, Melih Kilic, Roland Würsching, Sushant Kumar Pandey, Alexander Pretschner, _Automated Extract Method Refactoring with Open-Source LLMs: A Comparative Study_, AIware '25 (arXiv comment: main track), arXiv:2510.26480.
- **Method:** five 3B–8B open models extract methods from 840 Python CodeNet programs; tests check behaviour; one-shot vs a retry loop that feeds back test failures (RCI).
- **Numbers:** test pass 72.2% and 74.3% one-shot, 80.8% and 82.9% with test feedback (Qwen2.5-Coder, DeepSeek-Coder); the smallest models stayed below 60%. Average LOC per method 12.103 → 6.192 and 5.577; over 70% developer acceptance in a survey.
- **What it says:** CC and LOC "often diverge from human judgments".
- **Caveat:** LOC per method falls by construction whenever code is split into more methods; it is not evidence the code got shorter or simpler. Competitive-programming code.
- **For the post:** a size metric is the wrong yardstick for judging an extraction, and the test-feedback loop, not the model, supplied much of the safety.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2510.26480.txt`, `.layout.txt`

### 5.47 Xu, Lin and Chen, _MANTRA_ (arXiv 2025): with compile, test and refactoring checks in the loop, 83%; without, 9%. VERIFIED (arXiv full text v2)

- **Citation:** Yisen Xu, Feng Lin, Tse-Hsun (Peter) Chen (Concordia University), _MANTRA: Enhancing Automated Method-Level Refactoring with Contextual RAG and Multi-Agent LLM Collaboration_, arXiv:2503.14340 v2, 27 Mar 2025 (no venue stated).
- **Method:** 703 "pure refactorings" (six method-level types) from 10 Java projects; the model is told the method and the refactoring type. gpt-4o-mini-2024-07-18, alone (RawGPT) or in a developer/reviewer agent loop with compilation, tests and RefactoringMiner as feedback.
- **Numbers:** success (compiles, passes all tests, and RefactoringMiner confirms the refactoring) 582/703 (82.8%) vs 61/703 (8.7%) for RawGPT. Compile-and-test alone: 636 vs 100 (14.2%). Extract Method successes 317 vs 47.
- **What it says:** the agent's output is "perceived to be as readable and reusable as human-written code" (37 developers).
- **For the post:** the gap between 9% and 83% is the tooling. A model asked once to refactor mostly fails; a loop with a compiler, the tests and a refactoring detector mostly succeeds.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2503.14340.txt`

### 5.48 Xu, Yang and Chen, _SWE-Refactor_ (arXiv 2026): Codex agent 83% on single refactorings, 39% on compound ones. VERIFIED (arXiv full text v1)

- **Citation:** Yisen Xu, Jinqiu Yang, Tse-Hsun (Peter) Chen, _SWE-Refactor: A Repository-Level Benchmark for Real-World LLM-Based Code Refactoring_, arXiv:2602.03712 v1, 3 Feb 2026.
- **Method:** 1,099 developer-written, behaviour-preserving refactorings from 18 Java projects (922 atomic, 177 compound); success requires compiling, passing the tests and AST-level detection of the requested refactoring.
- **Numbers:** single-prompt models: DeepSeek-V3 457 (41.58%), gpt-4o-mini 438 (39.85%), small open models under 1%. Extract Method: 301 and 259 of 441. OpenAI Codex (GPT-5.1-Codex) on a stratified 200: 151 (75.5%), "138/167 (82.6%) for atomic versus" "only 13/33 (39.4%) for compound".
- **What it says:** "complex and compound refactorings remain the primary source of failures"; "Most failures are caused by mismatched edits".
- **For the post:** a current agent does a single requested Extract Method reliably. Splitting a long function so it passes a limit is usually one or two such steps; restructuring across a module is the compound case, where it fails most of the time.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2602.03712.txt`, `.layout.txt`

### 5.49 Gautam et al., _RefactorBench_, ICLR 2025: agents 22%, a time-limited human 87%. VERIFIED (arXiv full text); Vendor (Microsoft; four of five authors)

- **Citation:** Dhruv Gautam, Spandan Garg, Jinu Jang, Roshanak Zilouchian Moghaddam, Neel Sundaresan, _RefactorBench: Evaluating Stateful Reasoning in Language Agents Through Code_, ICLR 2025, arXiv:2503.07832.
- **Method:** 100 handcrafted multi-file refactoring tasks in 9 Python repositories (2 to 31 files edited per task); success checked by AST-based unit tests of the intended structure.
- **What it says:** "current LM agents struggle with simple compositional tasks", "solving only 22% of tasks with base instructions", "in contrast to a human developer with short time constraints solving 87%".
- **Numbers:** SWE-agent with gpt-4 solved 12%, 18% and 27% with lazy, base and descriptive instructions (the 22% in the abstract doesn't match the 18% in Section 4; check before citing). A state-aware variant improved results by 43.9%.
- **Caveat:** 2024 models; AST tests check structure, not behaviour.
- **For the post:** multi-file refactoring was the weak spot. Newer results (5.48, 5.50) say it still is.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2503.07832.txt`

### 5.50 Shi et al., _SWE-Bench ProMax_, COLM 2026: best agent resolves 41% of large refactorings. VERIFIED (arXiv full text)

- **Citation:** Yuling Shi, Jinghan Xu, Kelin Fu and co-authors (Shanghai Jiao Tong University and others, some at Douyin Group), _SWE-Bench ProMax: Benchmarking Agents on Large-Scale Multilingual Code Refactoring_, COLM 2026, arXiv:2608.09802 v1, 10 Aug 2026.
- **Method:** 170 refactoring tasks from real commits in seven languages (including TypeScript), with tests reviewed by hand; tasks "average 11.4 modified files and 261.6 lines of code per instance". mini-swe-agent and OpenHands, 300 steps, $10 per instance.
- **Numbers:** "the best model achieves only 41.2% resolve rate" (GPT-5.2, OpenHands); Claude Sonnet 4.6 38.8%; open-weight GLM-5 and Qwen3.5 36.5%.
- **For the post:** the most recent and largest measurement: frontier agents fail most cross-file refactorings that a test suite can check. 'Refactor easily' holds for local edits, not for these.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2608.09802.txt`

---

### 5.51 Deng et al., _LintEval_, Findings of EMNLP 2026: the best models clear 90% of alerts but break a third of files. VERIFIED (arXiv full text)

- **Citation:** Tongwei Deng, Jinyu Zhu, Yue Cao, Chenxu Wang, Yanzhen Zou, Bing Xie (Peking University; Beijing Jiaotong University), _LintEval: Benchmarking LLMs on Linter-Guided File Refactoring_, Findings of EMNLP 2026, arXiv:2610.20027 v1, 14 Oct 2026.
- **Method:** 13,061 correct programs (CodeContests+, 50–200 tests each; mean 61 LOC) in C++, Python and Java with 171,662 alerts from clang-tidy 22.1.0, Pylint 4.0.5 and PMD 7.12.0; the model is given the file and its alerts, single turn, zero-shot. Alert reduction is counted only on files that still pass the tests.
- **What it says:** "closed-source commercial models reach up to 90.4% Reduction@P but achieve only 67.1%–68.3% Pass@1"; models that chase alerts end up "introducing functional regressions in over 31% of samples"; "many regressions are semantic rather" "than merely syntactic"; "no method jointly optimizes all four dimensions".
- **Numbers (Table 3):** GPT-5.4-mini Pass@1 68.3%, reduction 90.4%, new alerts 5.6%; GPT-5.2 67.1% / 87.8%; DeepSeek-v3.2 57.6% / 73.0%; rule-based fixers (ruff --fix, clang-tidy --fix, google-java-format) 76.3% / 25.9%; unchanged copy 100% / 0%.
- **Caveat:** even the rule-based fixers fail 23.7% of programs, which suggests the harness is strict (or the fixers aren't as safe as assumed), so the models' absolute failure rate may be inflated. Single-turn prompts with no test feedback; competitive-programming files; style alerts dominate (115,458 of 171,662).
- **For the post:** the closest benchmark to an agent clearing a lint error. Without tests in the loop, a third of fixes broke behaviour. That is the cost a lint rule puts on code when the fixer is a model and the tests are thin.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2610.20027.txt`, `.layout.txt`

### 5.52 Wadhwa et al., _CORE_, FSE 2024: LLM fixes that pass the analyzer can still change behaviour or game the check. VERIFIED (arXiv full text; Crossref); Vendor (Microsoft)

- **Citation:** Nalin Wadhwa, Jui Pradhan, Atharv Sonwane and co-authors (Microsoft Research India), _CORE: Resolving Code Quality Issues using LLMs_, Proceedings of the ACM on Software Engineering 1 (FSE), 2024, https://doi.org/10.1145/3643762 ; preprint _Frustrated with Code Quality Issues? LLMs can Help!_, arXiv:2309.12938.
- **Method:** GPT-3.5-Turbo proposes revisions for CodeQL (52 Python checks) and SonarQube (10 Java checks) findings using the tools' own fix recommendations; candidates must pass the analyzer; GPT-4 ranks them; a user study on a Python subset.
- **What it says:** "the LLM may introduce subtle, unintended functionality changes" that the analyzer misses, and some revisions "do not quite resolve the quality issue, but by-pass the CodeQL checks anyway".
- **Numbers:** 59.2% of Python files revised so they pass both the tool and a human reviewer; the ranker cut false positives by 25.8%; 76.8% of Java files passed SonarQube, vs 78.3% for the rule-based repair tool Sorald.
- **For the post:** a vendor's own measurement that a model satisfying the analyzer is not the same as a model fixing the issue, and that some fixes target the check.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2309.12938.txt`; `src/x/crossref-core2.json`

### 5.53 Joos, Bouzenia and Pradel, _CodeCureAgent_ (arXiv 2025–26): 86% correct SonarQube fixes, with the checks doing much of the work. VERIFIED (arXiv full text v5)

- **Citation:** Pascal Joos, Islem Bouzenia, Michael Pradel (CISPA), _CodeCureAgent: Automatic Classification and Repair of Static Analysis Warnings_, arXiv:2509.11787 v5, 13 Apr 2026.
- **Method:** an agent (GPT-4.1 mini) classifies each of 1,000 SonarQube warnings from 106 Java projects (291 rules) as true or false positive, then fixes or suppresses it; a patch is approved only if the project builds, the warning disappears with no new warnings, and the tests pass.
- **Numbers:** 69.6% classified true positives, 30.4% false positives (suppressed with `//NOSONAR` or `@SuppressWarnings`); 96.8% plausible; on 291 hand-checked cases, "86.3% of the fixes are correct according to our manual validation". Ablation: with no checks, plausibility falls to 75.1% and 249 incorrect fixes would be admitted; dropping only the static re-check admits 123; dropping only the tests admits 9.
- **What it says:** "As checks are removed, plausibility drops and incorrect fixes slip through."
- **Caveat:** single annotator for the manual check; "plausible" includes suppressions; preprint.
- **For the post:** agents can clear most static-analysis warnings correctly, and the main guard against bad fixes was re-running the analyzer, not the tests. About three in ten warnings were judged not worth fixing at all.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2509.11787.txt`

### 5.54 Cross-references: Blyth et al. and our experiment

- **Blyth et al. (5.39):** with Pylint feedback, GPT-4o resolved `line-too-long` 84% of the time and re-introduced it 149 times; `too-many-branches` became more prevalent after refinement.
- **Our experiment (5.40):** "Behavior was preserved in 16 of 16." under a cognitive-complexity error, checked on thousands of inputs. But six of the eight extractions were verbatim moves that left branching unchanged: behaviour was preserved, and the design barely changed.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2508.14419.layout.txt`; `research/agent-experiment/results/cognitive-complexity/REPORT.md`

---

### 5.55 Almukhtar, Ghammam and Ming, AIware '26: agents clear `too-many-arguments` by switching to `**kwargs`. VERIFIED (arXiv full text)

- **Citation:** Mohamed Almukhtar, Anwar Ghammam, Hua Ming (University of Michigan), _Quality and Security Signals in AI-Generated Python Refactoring Pull Requests_, AIware '26, https://doi.org/10.1145/3805760.3814886 ; arXiv:2605.21453 v1, 20 May 2026.
- **Method:** 438 agent refactoring PRs touching Python in AIDev; 2,528 modified files analysed with PyQu, Pylint and Bandit before and after; a taxonomy of 24 change operations.
- **Numbers:** quality attribute improved in 22.5% of changes; 24.17% (611/2528) of files gained Pylint issues and 19.94% lost some; "73.5% of the analyzed PRs are merged" (322/438); 129 of 239 merged PRs with usable output added at least one new Pylint issue.
- **What it says:** new issues were mostly convention-level "violations such as long lines"; `too-many-arguments` (R0913/R0917) was common. One recurring operation, _Replace Explicit Parameters with kwargs_, "reduces wide interfaces by collecting optional or repeated parameters into keyword arguments"; "This operation directly addresses R0913".
- **Caveat:** no behaviour check; the authors present the kwargs change as an improvement, not as gaming.
- **For the post:** the clearest observed case of an agent satisfying a parameter-count rule by hiding the parameters, which makes the interface less explicit while the count drops. Reviewers merged these PRs at high rates.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2605.21453.txt`

### 5.56 Ehsani et al., MSR 2026: agent refactoring PRs merge at agent-dependent rates; failed ones are bigger and fail CI. VERIFIED (arXiv full text v1)

- **Citation:** Ramtin Ehsani, Sakshi Pathak, Shriya Rawal, Abdullah Al Mujahid, Mia Mohammad Imran, Preetha Chatterjee, _Where Do AI Coding Agents Fail? An Empirical Study of Failed Agentic Pull Requests in GitHub_, MSR 2026 (Mining Challenge), arXiv:2601.15195 v1, 21 Jan 2026.
- **Method:** about 33k agent PRs from five agents in AIDev; merge rates by task type; 600 not-merged PRs coded by hand.
- **Numbers:** overall 71.48% merged. Refactoring PRs merged at 0.80 for Codex and 0.50 for Claude Code; across agents, performance (55%) and fix (64%) PRs merged least. Not-merged PRs were larger (Cliff's δ 17% for LOC) and had more CI failures (δ 24%).
- **What it says:** "Not-merged PRs tend to involve larger code changes".
- **Caveat:** merge is not correctness; no revert or post-merge analysis.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2601.15195.txt`

### 5.57 Watanabe et al., TOSEM: reviewers often refactor agent PRs, and one was closed as "badly extracted". VERIFIED (arXiv full text v3)

- **Citation:** Miku Watanabe, Hao Li, Yutaro Kashiwa, Brittany Reid, Hajimu Iida, Ahmed E. Hassan, _On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub_, accepted at TOSEM; arXiv:2509.14745 v3, 9 Feb 2026. See also `dead-code.md` 5.17.
- **Numbers:** 567 Claude Code PRs; 83.8% accepted. Refactoring is the focus of 24.9% (53/213) of sampled agent PRs vs 14.9% (33/221) of human PRs. Of 214 agent PRs revised before merge, 58 (27.1%) needed refactoring. Of 92 rejected agent PRs, "1.1% for introducing bugs or breaking functionality".
- **What it says:** one PR was closed with "this is badly extracted and has some hallucinations".
- **For the post:** agents are asked to refactor more than humans do, and humans still refactor about a quarter of the agent PRs they merge. Breakage was a rare stated reason for rejection.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2509.14745.txt`

### 5.58 Tian et al., _Refactoring Runaway_ (arXiv 2026): unrequested refactoring in agent patches hurts compilation. VERIFIED (arXiv full text v1)

- **Citation:** Zhao Tian, Zifan Zhang, Tao Xiao, Dong Wang, Masanari Kondo, Junjie Chen, Yasutaka Kamei (Tianjin University; Kyushu University), _"Refactoring Runaway": Understanding and Mitigating Tangled Refactorings in Coding Agents for Issue Resolution_, arXiv:2605.22526 v1, 21 May 2026.
- **Method:** 3,691 valid patches from three agent frameworks with 12 LLMs on Multi-SWE-bench; refactorings detected with RefactoringMiner and RefDiff; logistic regression on compilation and resolution.
- **What it says:** agents add tangled refactorings less often than humans, and these "are strongly associated with reduced compilability", while "exhibiting no significant association with functional correctness". In particular "method-level tangled refactorings are negatively associated with agent effectiveness".
- **Numbers:** 21.43% of agent patches vs 36.72% of human patches contain tangled refactorings (0.66 vs 1.75 per patch). Agents favour expression-level changes such as Extract Variable; humans more often Extract Method. An LLM judge flagged 50.44–71.28% of agent patches as containing an unnecessary or unsafe refactoring; removing or repairing them raised compilation from 19.34% to 38.33%.
- **Caveat:** preprint; the "unnecessary or unsafe" share is an LLM's judgment.
- **For the post:** refactoring an agent does on the side of another task tends to break the build. If a size limit fires mid-task, the split it prompts is this kind of refactoring.
- **Text:** `scratchpad/length-lit/B/text/arxiv-2605.22526.txt`

### 5.59 Cross-references: what agents refactor unprompted

- Horikawa et al. (5.37): agent refactorings leave smell counts unchanged; method-level extraction cuts a few lines without changing complexity. Ottenhof et al. (5.38): Extract Method is under 2.3% of agent refactorings; only Cursor's refactoring commits showed a significant rise in smells. Watanabe et al., _What to Cut?_ (`dead-code.md` 5.16): 9.9% of agent-written methods in revised PRs were deleted in review.

### 5.60 Reverts and post-merge breakage of agent refactoring PRs: no study found. Negative finding

- Searched arXiv (title and abstract queries on refactoring with agents, PRs, behaviour, benchmarks), WebSearch, and the AIDev-based papers above. Studies report merge rates (5.55–5.57), CI failures on unmerged PRs (5.56) and compile failures (5.58), but none tracks whether merged agent refactorings were later reverted or caused regressions.
- **For the post:** measurable with AIDev plus each repository's history; not yet done.

---

---

## 6. Ultracite's own history

6.1 is the timeline from `git log -S` over everything but `apps/`, `research/` and the changelog (search strings: `"max-lines"`, `max-lines-per-function`, `"max-params"`, `max-statements"`, `"max-depth"`, `max-nested-callbacks`, `max-classes-per-file`, `"max-len"`, `max-statements-per-line`, `noExcessiveLinesPerFunction`, `useMaxParams`, `noExcessiveNestedCallbacks`, `noExcessiveLinesPerFile`, `noExcessiveClassesPerFile`, `max-switch-cases`, `max-union-size`, `nested-control-flow`, `expression-complexity`, `max-dependencies`, `jsx-max-depth`, `max-props`, `@typescript-eslint/max-params`, `maxAllowedComplexity`, `16655`), `packages/cli/CHANGELOG.md` (current and as it stood before `7748b21d`), and read-only `gh api search/issues` on haydenbleasel/ultracite for each rule name plus "too long", "length", "parameters", "line length", "printWidth" and "cognitive complexity". Results in `scratchpad/length-lit/main/src/ultracite/` and `scratchpad/length-lit/main/src/gh/haydenbleasel_ultracite-*.txt`. 6.2–6.4 are the recorded reasons, 6.5 what the presets set now (worktree at `d51d58bd`, 25 Oct 2026), 6.6 what Ultracite tells agents.

### 6.1 Timeline: size limits off from the first commit, with two exceptions that came by inheritance. VERIFIED (git history, changelog, issues)

| Date | Commit (release) | What happened |
| --- | --- | --- |
| 18 Mar 2022 | `e403fb15` "Create ESLint configuration" (the project was called `harmony`) | `max-lines`, `max-lines-per-function`, `max-params`, `max-statements`, `complexity` and `max-len` `"off"`; `max-depth`, `max-nested-callbacks`, `max-classes-per-file` and `max-statements-per-line` `"error"`; `react/jsx-max-depth`, `react/jsx-max-props-per-line` and `import/max-dependencies` `"off"`. No comments on any of them. |
| 14 Jan 2023 | `5b7d6da3` Harmony V2 (#83) | same settings, split into `rules/*.mjs`; `jest/max-expects` and `jest/max-nested-describe` `"error"` |
| 14 Dec 2023 | `719ac434` "Remove ESLint 8.53 deprecated rules" | `max-len` and `max-statements-per-line` removed |
| 27 May 2024 | `d2e2497c` "Add SonarJS plugin (#132)" | every eslint-plugin-sonarjs rule `"error"` (1.0.3 had `cognitive-complexity` at 15 and `max-switch-cases` at 30, and no line limits) |
| 29 Jun 2024 | `e6f31237` "Use new eslint/js for rules" | `@eslint/js` `configs.all` plus overrides; `max-depth`, `max-nested-callbacks` and `max-classes-per-file` now on by inheritance at their defaults (4, 10, 1) |
| 18 Jul 2024 | `c92a9d2e` Biome switch (#140; 4.0.0) | ESLint config deleted; Biome 1.8 `"all": true`, which had no length limits, only `noExcessiveCognitiveComplexity` (15) and `noExcessiveNestedTestSuites` |
| 14 Aug 2025 | `1c34286e` "Upgrade to Biome 2.2.0 (#245)" (5.1.3; also in 5.1.4 and 5.1.5, all 14 Aug) | Biome's nursery `noExcessiveLinesPerFunction` and `useMaxParams` turned on as `"error"` (defaults 50 and 4) |
| 15 Aug 2025 | `4438b762` "Resolves #246" (5.1.6) | `noExcessiveLinesPerFunction` turned off a day later, in a commit about Solid rules (6.2) |
| 16 Aug 2025 | `3fe13953` "Resolves #247" (5.1.9) | the comment "(disabled because of https://github.com/microsoft/TypeScript/issues/16655)" added to `noExcessiveLinesPerFunction`; that issue is about `Boolean()` narrowing (6.2) |
| 21 Dec 2025 | `628a5c39` "Resolves #457" (6.5.0) | nursery rules removed from the Biome preset at a Biome maintainer's request, `useMaxParams` among them |
| 28 Dec 2025 | `c4a205f8` V7 (#466; 7.0.0) | ESLint returns with every rule of every plugin on, minus overrides: core `max-lines`, `max-lines-per-function`, `max-params`, `max-statements` and `complexity` off, so `max-depth` (4), `max-nested-callbacks` (10) and `max-classes-per-file` (1) are on, **and so are `sonarjs/max-lines` (1,000), `sonarjs/max-lines-per-function` (200), `sonarjs/nested-control-flow` (3), `sonarjs/max-union-size` (3), `sonarjs/expression-complexity` (3) and `@typescript-eslint/max-params` (3)**. Oxlint arrives with every category on (`pedantic`, `style` and the rest) and `max-lines`, `max-lines-per-function`, `max-depth`, `max-params` and `import/max-dependencies` off |
| 31 Dec 2025 | `55380229` "Increase max allowed complexity" (7.0.0) | Biome `noExcessiveCognitiveComplexity` raised to 20; no reason recorded |
| 7 Jan 2026 | `c72d2b32` (#509, 7.0.9) | Oxlint `react/jsx-max-depth` off, at a user's request (6.3) |
| 10 Mar 2026 | `42804847` "Resolves #601" (7.3.0) | Oxlint `max-statements` off. Oxlint 1.35.0 (Dec 2025) had added it to the `style` category, which V7 turned on, so from then until 7.3.0 Oxlint users had a 10-statement limit (6.3) |
| 13 Apr 2026 | `a63d9c57` "Resolves #660" (7.5.7) | Oxlint core lists rules by name instead of enabling categories; `max-classes-per-file` and `max-nested-callbacks` named `"error"` |
| 16 Apr 2026 | `67227c95` "Add new Biome rules" (7.6.0) | `useMaxParams` listed `"off"` explicitly |
| 10 May 2026 | `44f6d7fe` "Align ESLint with Oxlint" | ESLint `complexity` (cyclomatic, 20) on, matching Oxlint |
| 4 Jul 2026 | `2687cf9f` (7.9.0) | ESLint `max-depth` off, "Align the ESLint and Biome presets with the oxlint preset" |
| 4 Jul 2026 | `44403937` (7.9.0) | `sonarjs/max-lines`, `sonarjs/max-lines-per-function` and `sonarjs/nested-control-flow` off in ESLint ("duplicates of core rules the preset disables"); `sonarjs/cognitive-complexity` set to 20 "to match Biome"; the SonarJS rules reach Oxlint through JS plugins |
| 4 Jul 2026 | `aea7fc06` "Upgrade Biome to 2.5.2" | `noExcessiveLinesPerFile` and `noExcessiveClassesPerFile` listed `"off"` |
| 7 Jul 2026 | `d186c53c` "Resolves #742" | Oxlint's SonarJS rules moved to the opt-in `js-plugins` preset |
| 28 Sep 2026 | `efa80e8c` (7.12.2) | `@typescript-eslint/max-params` off: "It was on with its default limit of 3 parameters for TypeScript files only." |
| 28 Sep 2026 | `4d28cf90` (7.12.2) | Oxlint `vue/max-props` off, "because its default allows a single prop per component" |
| 25 Oct 2026 | `daf7b0ff` "Update Biome to 2.6.3" (unreleased; Version Packages PR #857 open) | Biome `noExcessiveNestedCallbacks` on at 10, "matching `max-nested-callbacks`" |

- **The settings that turned limits off came with no reasons, except two user requests** (`jsx-max-depth`, `max-statements`) and parity. The first config, the V7 overrides and the Oxlint overrides have no comments on `max-lines`, `max-lines-per-function`, `max-params`, `max-statements` or `max-depth`. Later comments justify an off by reference to another off ("Matches max-params being off in the oxlint config.", "The preset disables max-lines everywhere.", "Duplicate of max-depth, which is off.", "the core presets leave max-params off for the same reason").
- **The structural limits that are on came by inheritance:** `max-nested-callbacks` and `max-classes-per-file` were `"error"` in 2022 with no comment and later arrived through `configs.all` and Oxlint's `pedantic` category before being named; the SonarJS ones through the every-rule pattern (V7, and May 2024 for `max-switch-cases`). No commit, issue or changelog entry explains keeping any of them.
- **The size limits were on for real twice:** Biome's two nursery rules, `noExcessiveLinesPerFunction` for three releases on one day (5.1.3–5.1.5, 14 Aug 2025) and `useMaxParams` for four months (5.1.3 to 6.5.0, Aug–Dec 2025), and SonarJS's line limits plus `@typescript-eslint/max-params` in the ESLint preset for six to nine months (V7 to 7.9.0 and 7.12.2). Both came from turning on everything a plugin had, not from a decision about length.
- **For the post:** Ultracite's position on length limits is a default it has held since 2022 without writing down why. The reasons will have to come from Hayden. Keep dates and preset names out of the post.

### 6.2 `noExcessiveLinesPerFunction`: on for a day in 2025, then a rationale written later that doesn't match the record. VERIFIED (commits, issues, both changelog versions)

- **What happened:** Biome 2.2.0 put `noExcessiveLinesPerFunction` in the nursery; `1c34286e` (14 Aug 2025) enabled it as `"error"` ("Add noExcessiveLinesPerFunction"). The next day `4438b762`, "Resolves #246", moved it to `"off"` along with `noSolidDestructuredProps`. Issue #246 (Hayden, 14–15 Aug 2025) is only about a Solid rule firing in a React project; it doesn't mention function length.
- **The comment:** `3fe13953` ("Resolves #247", 16 Aug 2025) turned off `noImplicitCoercions` and edited the comment above `noExcessiveLinesPerFunction` to "(disabled because of https://github.com/microsoft/TypeScript/issues/16655)". Issue #247 (`gilsmt`) is about `noImplicitCoercions`: TypeScript doesn't narrow on `Boolean(value)`, the bug in TypeScript #16655. The comment landed one line above the rule it was meant for. It was dropped in `85697b01` (Oct 2025).
- **The changelog:** before the rewrite in `7748b21d` ("Improve changelog content", 23 Apr 2026), 5.1.6 and 5.1.9 said only "Resolves #246" and "Resolves #247". Now 5.1.6 says the two rules "both produced too many false positives across general TS codebases (#246)", and 5.1.9 says the TypeScript issue "motivates" the `noExcessiveLinesPerFunction` setting. Neither is supported by #246, #247 or the commits.
- **For the post:** don't cite the changelog's reasons. The only contemporary record says the rule went on with a Biome upgrade and off the next day without a stated reason.
- **Text:** `scratchpad/length-lit/main/src/ultracite/1c34286e-biome.diff`, `4438b762.diff`, `3fe13953-biome.jsonc`, `CHANGELOG-before-7748b21d.md`; `scratchpad/length-lit/main/src/gh/haydenbleasel_ultracite-246.txt`, `-247.txt`

### 6.3 The two user reports: `react/jsx-max-depth` (#509) and Oxlint's `max-statements` (#601). VERIFIED (PR, issue)

- **#509** (Chung Wei Leong, PR, 5–7 Jan 2026): "I found this rule too aggressive and not ideal IMO." Hayden: "Agreed, still testing oxlint." Oxlint's `jsx-max-depth` defaults to 2 (2.17), and V7's Oxlint preset had the `style` category on.
- **#601** (Kenny Heard, 9 Mar 2026, Ultracite 7.2.3, Oxlint 1.51.0): "The Oxlint core preset enables all rules in the `style` category, which includes `max-statements`." Reproduction: "Write a hook with a few pieces of state, refs, and effects", then "See `max-statements` error (default limit of 10)". They first pointed at `4651808c`, which turned the rule off only in the repo's own root config, then noted "It doesn't look like this was released?"; the preset fix is `42804847`, released in 7.3.0.
- **For the post:** the only recorded user complaints about Ultracite's length limits are about limits that switched on by accident through a category, and both were turned off on request. A React hook with a few `useState`/`useRef`/`useEffect` calls passes 10 statements quickly; that's a concrete example of the default meeting ordinary code.
- **Text:** `scratchpad/length-lit/main/src/gh/haydenbleasel_ultracite-509.txt`, `-601.txt`

### 6.4 Issue #457: nursery rules off, `useMaxParams` with them (Dec 2025). VERIFIED (issue, commit)

- **Citation:** Emanuele Stoppa (`ematipico`, a Biome core maintainer), "Don't turn on nursery rules by default," #457, 21 Dec 2025; `628a5c39`.
- **What it says:** nursery rules "don't follow semantic versioning" and "can be deleted or renamed"; "Turning them on might break the user's code." Hayden turned them off; `useMaxParams` was one of them. When Biome promoted it (2.4), `67227c95` listed it `"off"` without a comment.
- **For the post:** the parameter limit left the Biome preset as collateral of a nursery policy, not by a decision about parameters.
- **Text:** `scratchpad/length-lit/main/src/gh/haydenbleasel_ultracite-457.txt`, `scratchpad/length-lit/main/src/ultracite/628a5c39.diff`

### 6.5 What the presets set now (worktree at `d51d58bd`, 25 Oct 2026). VERIFIED (config source; ESLint `--print-config` for each framework preset)

- **Oxlint core** (`config/oxlint/core/index.mjs`): `max-classes-per-file` and `max-nested-callbacks` `"error"` (defaults 1 and 10); `max-depth`, `max-lines`, `max-lines-per-function`, `max-params`, `max-statements`, `import/max-dependencies` and `unicorn/max-nested-calls` `"off"`; `complexity` `"error"` (cyclomatic, 20). No SonarJS rules.
- **Oxlint js-plugins** (opt-in): `sonarjs/cognitive-complexity` 20, `max-switch-cases` (30), `max-union-size` (3) and `expression-complexity` (3) `"error"`; `sonarjs/max-lines`, `max-lines-per-function` and `nested-control-flow` `"off"`.
- **Oxlint React and Vue:** `react/jsx-max-depth` and `vue/max-props` `"off"`. **Jest and Vitest:** `max-expects` and `max-nested-describe` `"error"` (5 each in Vitest's resolved ESLint options).
- **ESLint core** (resolved for a `.ts` file): `max-classes-per-file` [2, 1], `max-nested-callbacks` [2, 10], `complexity` [2, 20], `sonarjs/cognitive-complexity` [2, 20], `sonarjs/max-switch-cases` [2, 30], `sonarjs/max-union-size` [2, {threshold: 3}], `sonarjs/expression-complexity` [2, {max: 3}], `unicorn/try-complexity` [2, {max: 1}]; `max-depth`, `max-lines`, `max-lines-per-function`, `max-params`, `max-statements`, `@typescript-eslint/max-params`, `sonarjs/max-lines`, `sonarjs/max-lines-per-function`, `sonarjs/nested-control-flow`, `import-x/max-dependencies` and `unicorn/max-nested-calls` off; `max-len`, `max-statements-per-line` and `@stylistic/max-len` off via eslint-config-prettier.
- **ESLint framework presets** (resolved): Vue adds `vue/max-lines-per-block` and `vue/max-template-depth` `"error"` with no options, which do nothing (2.17); Svelte adds `svelte/max-lines-per-block` the same way; Angular adds `@angular-eslint/component-max-inline-declarations` at `{template: 3, styles: 3, animations: 15}` (a line limit on inline templates and styles); React has `react/jsx-max-depth` off.
- **Biome core:** `noExcessiveCognitiveComplexity` 20 (off in test files), `noExcessiveNestedCallbacks` 10; `noExcessiveLinesPerFunction`, `useMaxParams`, `noExcessiveLinesPerFile` and **`noExcessiveClassesPerFile` `"off"`**. Test presets: `noExcessiveNestedTestSuites` `"error"`.
- **Formatters:** Oxfmt, Prettier and Biome all at 80 columns (`printWidth: 80`, `lineWidth: 80`).
- **The repo's own Oxlint config** (`oxlint.config.ts`) turns off `complexity` and `max-statements` for Ultracite's source.
- **Text:** `scratchpad/length-lit/main/check/eslint/resolved-*.json`; the config files themselves

### 6.6 What Ultracite tells agents about size. VERIFIED (source)

- **The rules file** (`src/data/rules.ts`, written into AGENTS.md by `init`; mirrored in `skills/ultracite/references/code-standards.md`): under "Code Organization", "Keep functions focused and under reasonable cognitive complexity limits", "Extract complex conditions into well-named boolean variables", "Use early returns to reduce nesting". Nothing on function length, file length or parameter counts.
- **The fix prompt** (`src/agent-fix/prompt.ts`): "Make the minimal change that resolves each issue while preserving runtime behavior."; "Restyling the flagged code (renaming, re-spelling escapes, equivalent syntax) will not clear it;" "Follow the rule's help text from the JSON file where provided." No suppressions or config changes.
- **What the help text would say if a user turned a limit on:** Oxlint's "Consider splitting it into smaller functions." (`max-lines-per-function`, `max-statements`); Biome's "Consider refactoring this function to split it into smaller functions." and, for parameters, "Consider using an options object, splitting into smaller functions, or grouping related parameters."; SonarJS's "Split it into smaller functions." ESLint gives none (2.8, 2.13–2.15).
- **For the post:** the agent experiment for this topic turns a limit on in a project config, so the help text an agent reads is the linter's, and all three linters with help text say "split". Ultracite's prompt asks for the minimal change; for a length limit the minimal change that clears the error is an extraction.

### 6.7 Ultracite's own users: two reports, both about limits that switched on by accident. VERIFIED (issues); see 6.3

- **Searched** (read-only `gh api search/issues` on haydenbleasel/ultracite, 25 Oct 2026): every rule name in 6.1, plus "too strict", "annoying", "complexity", "refactor rule", "length", "too long", "parameters". Discussions are not enabled on the repository (`has_discussions: false`).
- **Found:** #509 (`react/jsx-max-depth`, "too aggressive") and #601 (`max-statements` at 10 on a React hook) (6.3); #566 asked for _more_ complexity checking in Oxlint (cognitive complexity, for parity with Biome) and was answered with docs. Nothing else on length limits.
- **For the post:** the public record holds two complaints, not the larger pattern Hayden describes (6.8); that account may rest on private feedback, chat or Hayden's own projects. Say "users" only as Hayden's account.

### 6.8 Hayden's account of why the size limits are off (25 Oct 2026). ANECDOTAL (the maintainer's account, relayed; not in the record)

- **Source:** Hayden Bleasel, in a message to the research coordinator on 25 Oct 2026, while this file was compiled; saved as `scratchpad/length-lit/main/src/ultracite/hayden-account-2026-10-25.txt`. No commit, issue or changelog entry says this (6.1).
- **What Hayden says:** "people kept running into walls with these rules and having to refactor" "code that they deemed fine". The limits "really depend on the scope of what you're building": "a long init function can be fine" "because you can read it end to end." "And there was no autofix" "so enabling them meant huge architectural refactoring." And: "these rules are less problematic now that agents can very easily refactor."
- **What bears on it:** users asking for exemptions (2.20–2.22, 6.7), other ecosystems turning size limits off or leaving them out (3.3, 3.5, 3.6, 3.11), the cost of refactoring and refactoring-induced bugs (4.78–4.89, and 4.3), and whether agents refactor well (5.42–5.60, 5.40).
- **For the post:** the reason Ultracite gives, stated as its own judgment. The last point is a hypothesis the agent experiment can test, not a premise.

---

## Notes on Ultracite's presets (for Hayden, not for the post)

Checked in the worktree (`research/length-limits`, at `d51d58bd`) on 25 Oct 2026. Per AGENTS.md, these are for you to decide on, not to write around.

**Your account (relayed on 25 Oct 2026; not in the git history, issues or changelog)**

- **Why the size limits are off, in your words:** "people kept running into walls with these rules and having to refactor" "code that they deemed fine"; the limits "really depend on the scope of what you're building" ("a long init function can be fine" "because you can read it end to end."); "there was no autofix" "so enabling them meant huge architectural refactoring"; and "these rules are less problematic now that agents can very easily refactor." Recorded in 6.8 as your account. The post can state it as Ultracite's reason; it isn't a finding.
- **What the record supports:** the public complaints are the ESLint and RuboCop requests for JSX, tests, constructors, callbacks and literals (2.20, 2.21), RuboCop's 2026 data that projects reject its size cops about twice as often as they raise them (3.5), Ruff refusing a file-length rule and Clippy's parameter lint being among the most suppressed (3.3, 3.11), and Ultracite's own two reports (6.3, 6.7). Two public Ultracite complaints is thinner than "people kept running into walls"; if the pattern came from Discord, X or your own projects, say so in the post or leave it as your experience.
- **What the research says about the cost:** see 4.78–4.89 (refactoring cost and refactoring-induced bugs) and Card, Church and Agresti's 1986 conclusion that "Arbitrary module size limitations can increase module cost." (4.3).
- **"Agents can very easily refactor" is a hypothesis.** The evidence (5.42–5.60, our cognitive-complexity experiment in 5.40) says agents reliably make an extraction that clears the error and preserves behaviour, and that the extraction is usually verbatim: the code moves, the branching and the parameters stay. That makes a limit cheap to satisfy, not necessarily worth satisfying. The agent experiment for this topic is the place to test it.

**Rationale**

- **No reason was recorded in the repository for turning the size limits off** (6.1); your account above is the only statement of it. `max-lines`, `max-lines-per-function`, `max-params` and `max-statements` have been off since the first commit (Mar 2022) with no comment; `max-depth` was on until July 2026 in ESLint and off in Oxlint from V7, and the July change says only "Align the ESLint and Biome presets with the oxlint preset". The post needs your reason in a sentence: is it that the numbers have no evidence behind them, that they fire on ordinary React code (6.3), that they invite splitting, or that the formatter decides the line count?
- **No reason was recorded for keeping the structural ones on** either: `max-nested-callbacks`, `max-classes-per-file`, `sonarjs/max-switch-cases`, `sonarjs/max-union-size` and `sonarjs/expression-complexity` all arrived by inheritance (every-rule pattern, `configs.all`, Oxlint categories) before being named. If the line is that counts of things a reader must hold at once are in and raw size is out, the post can say so, but it should come from you.
- **The changelog's reasons for `noExcessiveLinesPerFunction` were written in April 2026 and don't match the record** (6.2). 5.1.6 now says it "produced too many false positives across general TS codebases (#246)"; #246 is about a Solid rule. 5.1.9 says TypeScript #16655 "motivates" the setting; that issue is the `Boolean()` narrowing bug behind `noImplicitCoercions` (#247). The original entries said only "Resolves #246" and "Resolves #247". Worth correcting, since the changelog is published and the post can't cite it.

**Inconsistencies between linters**

- **`max-classes-per-file` is on (1) in ESLint and Oxlint, but Biome's `noExcessiveClassesPerFile` (same rule, `same()` source, default 1) is off** in `biome/core`. Either a deliberate choice (and it needs a comment) or a missed parity case; `compare-rule-parity.ts` only compares ESLint with Oxlint, so nothing catches it.
- **The structural SonarJS limits depend on the linter.** ESLint core has `max-switch-cases` (30), `max-union-size` (3), `expression-complexity` (3) and `cognitive-complexity` (20); Oxlint has them only in the opt-in `js-plugins` preset, so a default Oxlint setup has none of them (only cyclomatic `complexity` at 20); Biome has cognitive complexity (20) and nothing for switch cases, union size or expression complexity. So 'Ultracite keeps these on' is true for ESLint only.
- **`unicorn/try-complexity` is on in ESLint (`max: 1`)** and has no Oxlint counterpart; `compare-rule-parity.ts` counts rules Oxlint can't run as gaps, not violations, so it passes silently. It's a structural limit the post might otherwise not know is on.
- **`noExcessiveNestedCallbacks` (10) only reached Biome today** (`daf7b0ff`, unreleased); before that Biome users had no nested-callback limit while ESLint and Oxlint had 10.
- **Test files:** Biome turns `noExcessiveCognitiveComplexity` off in test files (`biome/core` overrides); ESLint keeps `sonarjs/cognitive-complexity` at 20 on a `.test.ts` file (`--print-config`, `scratchpad/length-lit/main/check/eslint/resolved-core-testfile.json`), and so does Oxlint's js-plugins preset (no test override names it). Same rule, different scope by linter.

**Comments that are now wrong or misleading**

- **`vue/max-props`** ("Defaults to a single prop per component," which, the comment says, no real component library meets) is right for Oxlint (`maxProps: 1`) and wrong for ESLint, where the rule has no default and does nothing without options (2.17, my check). The 7.12.2 changelog repeats it for both.
- **`vue/max-lines-per-block`, `vue/max-template-depth` and `svelte/max-lines-per-block` are `"error"` in the ESLint presets** (via the every-rule pattern) and inert without options (2.17). Harmless today; if the plugins ever add defaults, they turn into line and depth limits contrary to the policy. Consider turning them off explicitly with a comment, as `vue/max-props` is.
- **`@angular-eslint/component-max-inline-declarations` is on** in the ESLint Angular preset with its defaults (`template: 3`, `styles: 3`, `animations: 15` lines): a line limit on inline templates. Probably fine as an Angular convention (move templates to files), but it is a length limit the post should know about.
- **`sonarjs/nested-control-flow`: "Duplicate of max-depth, which is off."** Close but not exact: SonarJS counts nested `if`/`for`/`while`/`switch`/`try` with a default of 3; `max-depth` counts blocks with a default of 4.
- **Oxlint's own docs** label `max-depth`'s examples as using a default max of 3; the default is 4 (2.13). Upstream, not Ultracite.
- **The docs page `configuration.mdx`** says Oxlint "only has the standard cyclomatic `complexity` rule built in" and suggests `oxlint-plugin-complexity` at 15; the `js-plugins` preset already ships `sonarjs/cognitive-complexity` at 20 (#566 led to the docs section).

**The repo itself**

- **`oxlint.config.ts` turns off `complexity` and `max-statements` for Ultracite's own source.** `max-statements` is already off in the preset, so that line is dead; `complexity` (cyclomatic, 20) is on in the preset and off for the repo. If the post argues for structural limits, the repo exempting itself from one is worth deciding on.
- **`packages/cli/src/initialize.ts:670` has a `biome-ignore` for `noExcessiveCognitiveComplexity`**, though the repo lints with Oxlint, not Biome. Dead suppression.

**For the post and the experiment**

- **Every linter's help text for a length limit says 'split'** (Oxlint, Biome, SonarJS; ESLint has none), and Ultracite's prompt asks for "the minimal change". For a length limit the minimal clearing change is an extraction. The experiment should count verbatim extractions and new helpers that take many parameters (the move that trades `max-lines-per-function` for `max-params`), and whether agents ever leave a long function for review.
- **A per-file limit forces moves between files, the riskier kind of refactoring.** In the 103-system study, Extract Method in place was less fix-inducing than other commits, while Extract And Move Method and Extract Class were more (4.79); cross-file refactoring is also where agents fail most (5.48–5.50). If the post explains why `max-lines` stays off even if a function limit were reconsidered, this is the evidence.
- **Agents satisfy parameter limits by hiding parameters** (`**kwargs` in Python PRs, 5.55; parameters "moved to the fields of the surrounding class", 4.70). The experiment's gaming checks should include an options bag, `arguments` and moving state into fields or closures.
- **SonarJS exempts React components from its function-length rule**; ESLint, Oxlint and Biome don't. A React subject would show the implementations disagreeing on what counts.
- **Biome counts body lines only and always counts comments** (no `skipComments`); ESLint and Oxlint count the whole function including blanks and comments by default; SonarJS counts code lines only. The same function has four different lengths.

---

## Things that turned out wrong or different

**Where the guidance came from, and other ecosystems (sections 1 and 3)**

- **Code Complete's study list couldn't be verified.** Only the opening of §7.4 is publicly previewable. The '200 lines', '65 lines cheaper', '143 statements, 23% more errors' and '100–150 lines changed least' items come from a 2009 blog quoting a third-hand summary (1.7). The seven-parameter rule wasn't seen at all.
- **Miller and Cowan say nothing about parameter lists** (1.15). The only working-memory link to a count found is the Linux guide's "about 7" for local variables (1.2).
- **Cowan's PDF header prints "(2000) 24"** for what was published as vol. 24(1), 2001 (1.15).
- **Clippy's `too_many_lines` wasn't moved to pedantic after release.** A maintainer asked for pedantic in review (21 Jun 2018) and the author moved it before merge (Jan 2019); it shipped in 1.34.0 as pedantic. (3.11)
- **The kernel didn't drop the 80-column rule.** 80 is still "preferred"; what changed is checkpatch's default (80 → 100) and its file-mode warning. The commit is by Joe Perches, signed off by Torvalds. Torvalds's line-length argument is two messages (28 and 29 May 2020), usually merged. The kernel's function guidance never had a line number. (1.2–1.4)
- **RuboCop doesn't use its style guide's 80 columns.** The guide says "Limit lines to 80 characters."; RuboCop's default is 120 since 0.84 (2020), after a 722-person survey. The guide's line-length rationale copies PEP 8 nearly word for word and adds an uncited "numerous studies" sentence. (3.5, 3.6, 3.12)
- **RuboCop's 10-line default has no source beyond the style guide**, and a core member conceded in 2014 that "Some studies indicate that long methods are actually less error-prone than short ones," (uncited). (3.5)
- **Ruff's E501 defaults to 88, not PEP 8's 79**, for Black compatibility; and PLR0914 and PLR1702 are still preview-only. (3.3)
- **Black's 88 has no data attached.** "found to produce significantly shorter files" and the accessibility claim are unsourced; the "90-ish" link is a talk. (3.14)
- **Google is softer than its reputation:** "about 40 lines, think about", "no hard limit"; its published pylintrc disables Pylint's whole R category; its Go guide has no line limit. (1.8, 3.2, 3.15)
- **funlen's `ignore-comments` default differs**: true in golangci-lint's reference, false in funlen's README. (3.9, 3.10)
- **Oxfmt's default width is 100, not Prettier's 80.** Relevant if the post says anything about what Ultracite's formatter does by default. (3.17)
- **XO has gone both ways:** `max-lines` added and removed in 2016, re-added in 2024 as a 1500-line warning. (2.19)
- **Unicorn now has a nesting rule in its recommended config** (`max-nested-calls`, June 2026), which counts nested call arguments, not callbacks. (2.19)
- **Martin disputes that Clean Code sets "arbitrary numerical limits"**; the 2–4-line functions were an example from a 1999 applet. Retellings that call "20 lines" a Clean Code rule overstate the text, which says functions "should hardly ever be 20 lines long". (1.10, 1.12)
- **No primary source traces code line limits to the punched card or the VT100.** IBM and DEC confirm the 80-column widths; the causal story is told only by style guides. (3.18)

**The rules (section 2)**

- **ESLint's 3, 10 and 4 aren't JSHint's.** JSHint's `maxparams`, `maxstatements` and `maxdepth` had no defaults; ESLint's numbers were picked by the contributors porting them in 2013, with no reason recorded (2.2, 2.3).
- **`max-nested-callbacks` started at 2,** in `conf/eslint.json` when it was created, with no default in code until 2015, when Zakas chose 10 (2.3, 2.4).
- **`max-lines`' 300 wasn't JSCS's default.** The PR first used 100, believing JSCS had it; JSCS had no default, only an example (2.5).
- **The proposal for `max-lines-per-function` said the Linux kernel recommends "48 lines or fewer";** the kernel says "one or two screenfuls" of 80x24 and scales length with complexity (2.6, 1.2).
- **`max-lines-per-function` counts a nested function's lines twice:** in its own count and its parent's (2.6). Biome counts the body only; SonarJS counts code lines only and skips React components (2.14, 2.15).
- **`@typescript-eslint/max-params` is now redundant.** ESLint core has handled TypeScript syntax since 9.27.0 and `this` parameters (`countThis`) since 10.0.0 (2.8, 2.12).
- **Biome's sources say `same()` while the defaults differ:** `useMaxParams` defaults to 4 (ESLint 3, Clippy 7) and `noExcessiveNestedCallbacks` to 5 (ESLint 10) (2.14).
- **Oxlint's `max-depth` docs give the default as 3;** the code and a run say 4 (2.13).
- **`vue/max-props`, `vue/max-template-depth`, `vue/max-lines-per-block` and `svelte/max-lines-per-block` have no defaults in ESLint** and do nothing without options; Oxlint's `vue/max-props` defaults to 1 (2.17).
- **SonarJS's parameter rule (S107, default 7) isn't in eslint-plugin-sonarjs;** it runs in SonarQube as a decorated `max-params`. The plugin's `max-union-size` exempts unions that define a type alias, and its message says "less than" the threshold when it allows exactly the threshold (2.15).
- **Sonar's own default profile leaves out its function-length, file-length, union-size, nesting and expression-complexity rules,** all of which Ultracite's ESLint preset either sets (union size, expression complexity) or had on until 2026 (2.15, 6.1).
- **JSHint deprecated `maxlen` as style but kept `maxparams`, `maxdepth` and `maxstatements`** as correctness options (2.2).
- **ESLint maintainers refused options for the size rules as "stylistic" in 2020–2023,** but ESLint 10.13.0 doesn't mark them frozen, and options were added in 2025–2026 (2.20).

**Research (section 4)**

- **Basili and Perricone's density curve rests on very little at the top end.** Only 3 of 370 modules exceed 200 executable lines, and 258 have 50 or fewer (4.1). "Inversely correlated with errors, up to 200 lines" overstates it.
- **Card et al. found no size–fault relationship, not 'larger is better for faults'.** Their cost result is per executable statement; they explicitly attribute the small-module fault-rate effect to the ratio (4.3).
- **Hatton's 1997 paper is a model fit, and Hatton retracted the U-bend in 2009.** The manuscript's title was "Why is the defect density curve U-shaped with component size ?"; the "lines" are Ada statements and assembler lines (4.9).
- **The optima don't agree:** 877 LOC (Gaffney), 83 Ada statements (Compton and Withrow), 161–250 lines (Withrow), 200–400 lines (Hatton), and "the trend reverses around size 200-300 lines" (Malaiya and Denton reading Fenton and Ohlsson). Compton and Withrow dropped zero-defect modules (4.8, 4.11, 4.12).
- **The MSR 2022 method-size paper is Chowdhury, Uddin and Holmes**, not Chowdhury, Holmes, Zaidman and Kazman (that's the EMSE 2022 paper) (4.24, 4.25).
- **SIG's 15-line threshold is not the one SIG's own 2010 paper derived.** Alves et al. derived 30/44/74 LOC; the 2016 book uses 15/30/60, and its four-parameter limit is stated as judgment ("seems reasonable") (4.29, 4.30).
- **SIG doesn't use 15 lines as a per-function hard limit.** It rates by the share of code in each size band (4.30).
- **Woodfield et al. 1981 isn't a routine-length study;** it compares decomposition styles, and the ADT version won, not the most finely split one (4.6).
- **Lind and Vairavan's abstract is about effort and metrics generally;** nothing on routine length is visible (4.5).
- **Rosenberg's first "misconception" may not be about code formatting;** "format of SLOC" probably means the counting rule. Unclear without the full text (4.10).
- **OpenAlex dates Rosenberg to 2002 and Koru 2009 to 2008;** the symposium was 1997 and the TSE issue is 2009.
- **Sjøberg et al. (4.34) did not study Long Method or Long Parameter List.** Their tools didn't support them. The paper says size-only smells would "probably" indicate effort, because size drove effort. Don't cite it to show that Long Method doesn't matter.
- **Tufano et al. (4.40) and Hall et al. (4.44) studied other smells,** not Long Method or LPL.
- **Khomh et al.'s "size alone cannot explain"** rests on a size-controlled comparison only for Blob, ComplexClass and LargeClass among the largest classes, with few significant cases. LongMethod and LPL weren't size-controlled (4.35).
- **Detection thresholds are relative to the system** in Palomba (above the mean), Khomh (LPL relative to the average) and DECOR (box plots). PMD uses fixed 10 parameters and 60 statements (3.8). So research "Long Method" isn't the same thing as an ESLint threshold.
- **Rice et al.'s "more than five arguments" headline** coexists with 71% of found defects being swapped `expected`/`actual` values, mostly in `assertEquals`-style calls with two or three parameters (4.55).
- **Jbara and Feitelson's EMSE 2017 paper extends their ICPC 2015 eye-tracking paper,** not ICPC 2014 (4.49).
- **Letovsky and Soloway** is a six-person protocol study of FORTRAN maintenance, and its remedy is documentation, not inlining (4.46).
- **Campbell's law** was stated as two "pessimistic laws" in a 1976 occasional paper, with evidence Campbell called "predominantly anecdotal"; quotes here are from the 1976 text as reprinted, not the 1979 article (4.67).
- **Posnett et al.'s abstract** says Buse and Weimer had 100 participants; Buse and Weimer report 120 annotators rating 100 snippets (4.62).
- **Braver and Feitelson** give "5–30 lines" in results and "10-30" in the discussion for the same 80% of functions (4.48).
- **PMD's rule description claims long parameter lists cause "higher defect rates"** without a source (3.8).
- **Extract Method's risk depends on the study.** Bavota et al. 2012 put it above average (21% vs 15%, three systems); the 103-system replication found it less fix-inducing than commits without it (OR 0.86) (4.78, 4.79).
- **Ferreira et al. 2025 misquote both sources:** Di Penta et al.'s 38% is of 384 sampled fix-inducing commits, not "of refactoring actions"; Kim et al.'s figure is 77%, not 76% (4.82).
- **Weißgerber and Diehl's MSR 2006 paper** found no days of pure refactoring and mixed phases; it doesn't show refactorings are more error-prone (4.80).
- **Kim, Cai and Kim's API-level refactorings** came with more fixes but faster fixing (4.81); they're often cited for the cost side only.
- **No study isolates refactoring done to meet a size limit, metric or quality gate.** Bouwers et al. (4.70) is the closest, and it's practitioner experience.

**Agents and LLMs (section 5)**

- **Codex's 250-line read limit is gone.** It was in `prompt.md` from at least 12 Aug to 15 Sep 2025 and was removed by 12 Dec 2025; current prompts keep only "Do not use python scripts to attempt to output larger chunks of a file." (5.27).
- **Claude Code's public docs give no per-read line limit.** They state 25,000 tokens per call and a 256 KB whole-file refusal, plus `allow_large` since v2.1.296. A "2,000 lines" default appears in the model-facing tool description, not in any public page I found (5.25).
- **Copilot code review's 4,000-character cap on instruction files was removed from the docs on 15 Jun 2026** (5.30). Don't cite it as current.
- **Mao et al. reversed their headline between versions.** v2 (Apr 2026): AI code "consistently more verbose across files and functions"; v3 (Jul 2026): differences "rather small" and no significant file-length difference (5.5). Secondary summaries quote v2.
- **'AI code is longer' is not a general finding.** At function level, most studies find it shorter (5.2, 5.4); newer models flip that (5.3); in real repositories differences are small (5.5); an industrial agent's code was "slightly longer" (5.6); LLM tests are 3.2× longer and better (5.7).
- **Böckeler's agent raised thresholds only for cyclomatic complexity**, not for the length or argument rules; with length rules it split code instead (5.34). The implementation models were mostly Claude Sonnet and Cursor's composer-2; Opus 4.7 was used for the later analyses (`dead-code.md` 5.26 describes the whole report as using Claude Opus 4.7).
- **Horikawa et al. don't report an Extract Method share.** It is at most 2.5% from Table 5; the replication package's counts (65,859 instances) are from before the paper's filtering and don't match its 15,451 (5.37).
- **LongCodeBench's file-length result goes against the common assumption** that bigger files make models worse (5.16).
- **Ogenrwot and Businge contradict themselves on commit counts** (5.8).
- **Pomian et al.'s ICSME 2024 paper is on arXiv under another title** (_Together We Go Further…_, 2401.15298), and "hallucination" there includes "not useful" suggestions (18.9%), not only invalid ones (57.4%) (5.42).
- **Liu et al. is now a journal paper** with a different title (Automated Software Engineering, 2025); the arXiv abstract says ChatGPT, the body says GPT-4 (5.43).
- **Cordeiro et al.'s headline (StarCoder2 reduces smells "20.1% more than developers") is conditional on passing tests**, and only 28.36% did at pass@1 (5.44).
- **RefactorBench's abstract (22%) and Section 4 (18% for SWE-agent with gpt-4 on base instructions) disagree** (5.49).
- **LintEval's rule-based fixers also fail 23.7%**, so its model failure rates are partly a property of the harness (5.51).
- **CodeCureAgent's 96.8% "plausible" includes suppressing about 30% of warnings as false positives** (5.53).
- **Almukhtar et al. present `**kwargs` as a fix for too-many-arguments**; read as data, it is the rule being satisfied by hiding the parameters (5.55).

**Ultracite (section 6)**

- **The first config also had `max-classes-per-file` on** (and `max-depth`, `max-nested-callbacks`, `max-statements-per-line`); `complexity` was off (6.1).
- **#601's preset fix is `42804847` (7.3.0).** `4651808c`, which the reporter linked, turned `max-statements` off only in the repo's own root config (6.3).
- **`max-depth` went off in Oxlint at V7 but stayed on in ESLint until July 2026** (`2687cf9f`, 7.9.0). `581ea40a` and `984d9541` move and restate the Oxlint setting; they don't change ESLint (6.1).
- **'The size limits are off' wasn't true for ESLint users from V7 to 7.9.0:** `sonarjs/max-lines` (1,000), `sonarjs/max-lines-per-function` (200) and `sonarjs/nested-control-flow` (3) were on, and `@typescript-eslint/max-params` (3) until 7.12.2 (6.1).
- **Biome's length and parameter limits were briefly on:** `noExcessiveLinesPerFunction` in 5.1.3–5.1.5 (14 Aug 2025) and `useMaxParams` from 5.1.3 to 6.5.0 (6.1, 6.2, 6.4).
- **The changelog's reasons for `noExcessiveLinesPerFunction` were written in April 2026** and cite an issue about Solid rules and a TypeScript bug about `Boolean()` narrowing (6.2).
- **Biome's `noExcessiveNestedCallbacks` limit of 10 landed today** (`daf7b0ff`, unreleased); before that Biome had no nested-callback limit in the preset (6.1).
- **Biome's `noExcessiveClassesPerFile` is off** while `max-classes-per-file` is on in ESLint and Oxlint (6.5).
- **The `vue/max-props` comment is right only for Oxlint** (2.17, 6.5).
- **The public record has two user complaints about length limits** (#509, #601), both about limits that came on through Oxlint categories (6.3, 6.7).

---

## Unverified or dropped

**Where the guidance came from, and other ecosystems (sections 1 and 3)**

- **Kernighan and Plauger:** no legitimate full text (the Internet Archive copy needs a login). The rules list I read is a third-party transcription with no numeric size rule; tagged UNVERIFIED. (1.1)
- **Clean Code Chapter 3 text:** Pearson's sample pages have the contents, Chapter 1 and the index, not Chapter 3; O'Reilly's preview needs a login. The "small" quotes come via the joint Ousterhout–Martin document. The argument-count passage (niladic, monadic, dyadic, triadic) is confirmed only by headings and index entries; its wording is UNVERIFIED. Chapter 5's horizontal-formatting guidance wasn't checked. (1.10)
- **Refactoring (2nd ed.), "Long Function" and "Long Parameter List":** no legitimate sample of Chapter 3 found (the Pearson sample URLs I tried return 404); used Fowler's bliki instead. (1.9)
- **Ousterhout's book:** not opened; the author's free extract is 13.9 MB, over the download limit. (1.12)
- **FORTRAN fixed-form columns 1–72:** NIST FIPS 69-1 (ANSI X3.9-1978) is 22.9 MB; a university HTML mirror failed to load. Dropped. (3.18)
- **IBM or other house rules on routine size:** none found with a primary source beyond JSF AV (Lockheed Martin) and NASA/JPL. (1.5, 1.6)
- **Why golangci-lint leaves `funlen` off, and why Oxfmt picked 100:** no stated reason found. (3.10, 3.17)
- **Prettier's reason for 80** beyond "For readability": none found in the docs. (3.13)
- **The Clean Code argument rule, the "20 lines" rule, and Miller's 7±2 behind the kernel's "about 7 different things":** see 1.7, 1.10 and 1.15.

**The rules (section 2)**

- **Sonar's JavaScript rule descriptions.** rules.sonarsource.com returned 404 for every rule and the rspec repository isn't public; the rationale quoted in 2.15 is from Sonar's Java descriptions of the same rule keys. No description of S4622 (`max-union-size`) was found.
- **JSCS's `maximumNumberOfLines` docs** and the jslinterrors.com page linked in ESLint #115 weren't opened; what they said comes from the ESLint threads (2.3, 2.5).
- **The source of "Recommendations usually range from 100 to 500 lines"** in ESLint's `max-lines` docs: none is given, and the 2016 thread doesn't supply one (2.5).
- **Oxlint 1.90+ and Biome 2.7+ behaviour, and the defaults of rules this file doesn't name** (for example `vue/max-attributes-per-line`): only the worktree's versions were read or run.

**Research (section 4)**

- **Code Complete §7.4–7.5 beyond the first paragraphs:** publisher preview only (O'Reilly 403 live; Wayback captured the preview); Google Books CAPTCHA; Google Books API 429. No legitimate full text.
- **Selby and Basili 1991, Lind and Vairavan 1989, Shen et al. 1985, Withrow 1990, Compton and Withrow 1990, Woodfield et al. 1981:** closed IEEE/ACM/Elsevier; abstracts only. The UMD report for Selby and Basili (hdl 1903/7527) is 13.5 MB, above the download limit.
- **Jones 1986, Card and Glass 1990:** books, not opened. Dropped.
- **Hatton 1997 published text:** read the 1996 manuscript instead. Hatton 2009 TSE: abstract only.
- **Rosenberg 1997, Fenton and Ohlsson 2000, Koru et al. 2009 and 2008, El Emam et al. 2002, Benlarbi et al. 2000, Andersson and Runeson 2007, Zhang 2009:** abstracts only (closed; CiteSeerX copies 404; Fenton's site index not reachable via CDX).
- **Gil and Lalouche 2017:** no abstract or full text (Springer JS challenge; Semantic Scholar 429). Content from Chowdhury et al. only (4.20).
- **Pascarella et al. 2020:** ZORA behind Anubis; abstract from Semantic Scholar.
- **Herraiz and Hassan 2010:** only the O'Reilly section previews; the chapter's tables weren't visible.
- **Lanza and Marinescu, _Object-Oriented Metrics in Practice_ (2006):** not opened; their statistical thresholds are mentioned in Alves et al. and Gil and Lalouche only. Dropped.
- **JavaScript code-smell studies** (e.g., Saboury et al. 2017; Johannes et al. 2019) weren't checked. No JS/TS study isolating function or file length was found.
- **Malaiya and Denton Table 3** (fitted optimum sizes) is unreadable in the OCR; not used.
- **Dyson and Haselgrove 2001:** Elsevier returned 403 and Crossref has no abstract; the figure of 55 characters per line was seen only on secondary pages (4.66).
- **Sellitto et al. SANER 2022:** full text behind a captcha (Oulu) and Cloudflare (Unisa); abstract only (4.53).
- **Zampetti et al. MSR 2017:** no open copy found; which checks broke builds wasn't read (4.72).
- **Bavota et al. JSS 2015:** abstract from the authors' figshare record only (4.41).
- **Olbrich et al. 2010, Abbes et al. 2011, Posnett et al. 2011, Scalabrino et al. 2016/2018, Stylos and Clarke 2007, Dyson 2004:** metadata and abstracts only.
- **Pradel and Gross TSE 2013:** metadata only.
- **Books not opened:** _Clean Code_ (quoted only via Ousterhout, 1.12, and Braver and Feitelson's paraphrase that Martin says there's no research behind short functions), _Code Complete_, Fowler's _Refactoring_, Ousterhout's _A Philosophy of Software Design_, Lanza and Marinescu's _Object-Oriented Metrics in Practice_ (iPlasma).
- **Dropped after reading:** Amit and Feitelson, _Which Refactoring Reduces Bug Rate?_ (PROMISE 2019; not length-specific); Beelders, ETRA/EMIP 2022 (not about line length); Dunsmore, Roper and Wood, ICSE 2000 (41-word abstract only); Wilde, Matthews and Huitt 1993 (record not found).
- **Searched, nothing found:** a study of parameter count against comprehension; evidence linking working memory to parameter counts; a study of metric gaming or quality-gate workarounds in industry beyond Bouwers et al.; an eye-tracking study manipulating line length in code. Christakis and Bird and Johnson et al. have nothing length-specific.
- **Abstract only:** Cedrim et al. 2017 (no open copy found; ResearchGate not used), Bibiano et al. 2019, Murphy-Hill et al. 2012, Sorald, Ferreira et al. 2018 poster.
- **Dropped after reading:** Trautsch, Herbold and Grabowski, EMSE 2020 (PMD warning trends; no per-rule size results and not about refactoring cost); Amit and Feitelson 2019 (above).
- **Not found:** Pantiuchina et al.'s TOSEM study on refactoring motivations (search returned other papers); any study measuring the effort or breakage of refactoring triggered by a lint or quality-gate failure; any per-rule breakdown for size rules in Sorald or CodeCureAgent.

**Agents and LLMs (section 5)**

- **Claude Code's 2,000-line Read default:** not in public docs (5.25). The bundled CLI source that holds the tool description is larger than the 10 MB download cap, so I didn't check it.
- **Cursor's read-tool line limit:** the docs don't state one; numbers circulating come from leaked prompts, which I didn't use.
- **Medium, _ESLint as AI Guardrails_ (albro):** Cloudflare challenge; not read. A search snippet says agents tried inline disables and config edits. UNVERIFIED.
- **Stacknotice _Refactoring with Claude Code_ blog and mindstudio.ai posts:** secondary claims (files over 400–500 lines get "compressed"); not opened. Dropped.
- **Xiang et al., _How Far Can We Go with Practical Function-Level Program Repair?_ (arXiv:2404.12833):** opened; no length analysis. Dropped.
- **SWE-bench Pro (arXiv:2509.16941):** excludes 1–10 line edits; no breakdown by patch or file size. Dropped.
- **Cynthia et al. (MSR '26, arXiv:2601.20109):** opened; size rules are not among its reported top rules. See `dead-code.md` 5.15.
- **Levy, Jacoby and Goldberg, _Same Task, More Tokens_ (ACL 2024):** cited by Du et al.; not opened.
- **Long Code Arena:** only the module-summarization note was used; its other tasks report no length analysis I could find.
- **Wayback snapshot of the Cursor rules page from 18 Sep 2025** came back in an encoding I couldn't decode, so the earliest date for "Keep rules under 500 lines" is 2 Feb 2026 or before.
- **De Melo, _Test Smell Refactoring with Agentic LLMs: An Empirical Study of Gemini-2.5-Pro_ (ICSE 2026 companion, pp. 314–316):** Crossref record only; a 3-page short paper. Not read.
- **_RefactorGPT_ (PeerJ Computer Science 2025), _RefactorPlatform_ (EMNLP 2026 demo, arXiv:2609.04898), _FrontierRefactor_ (arXiv:2610.25834):** surfaced in searches; not opened.
- **_LLM-Based Repair of C++ Implicit Data Loss Compiler Warnings_ (arXiv:2601.14936):** a search snippet reports 93% reviewer acceptance; not opened, and it concerns compiler warnings, not refactoring.
- **iSMELL (ASE 2024):** used as a baseline in CodeCureAgent; not opened.
- **A refactoring-specific AIDev merge rate across agents:** Ehsani et al. give it only per agent (5.56); no paper found reports it overall.

**Ultracite (section 6)**

- **Where "people kept running into walls" comes from.** The public issue tracker has two reports (6.3, 6.7); discussions are disabled; Discord, X and other channels weren't searched. Ask Hayden whether the post can say more than "in our experience".
- **Why `noExcessiveLinesPerFunction` was turned off on 15 Aug 2025, and why `max-depth` was kept on in ESLint until July 2026.** Not recorded (6.1, 6.2).
- **Why `noExcessiveCognitiveComplexity` went to 20 on 31 Dec 2025** (`55380229`). Not recorded; it belongs to the cognitive-complexity post.
