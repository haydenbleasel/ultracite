# Dead code and duplication: literature and source notes

Compiled 2026-10-12 for the Ultracite research post on dead code and duplication: `no-unused-vars` (and TypeScript's `noUnusedLocals`/`noUnusedParameters`), `no-unreachable`, unused imports and private members, dead stores (`sonarjs/no-dead-store`, `no-useless-assignment`), the `no-useless-*` family, and the duplication rules (`sonarjs/no-identical-functions`, `sonarjs/no-duplicated-branches`, `sonarjs/no-duplicate-string`, `no-duplicate-imports`), plus their Oxlint and Biome counterparts.

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the official docs, the spec, the tool's source code, the GitHub issue/PR/advisory, the SEC order or the CVE record) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex, Semantic Scholar or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single practitioner report, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research by a company that sells a product in this space (GitClear, Sonar, CodeRabbit, CodeScene, CQSE, PVS-Studio, Anthropic).

Every quote is copied exactly and is under 15 words.

**About the "my check" items.** A few entries in sections 2 and 6 report quick runs made on 12 Oct 2026 with Oxlint 1.86.0, Oxfmt 0.71.0, TypeScript 6.0.3, ESLint 10.12.0 and eslint-plugin-sonarjs 4.2.2. These were ad-hoc checks and their scripts were not kept. Re-run them with the `research/` harness before putting any of them in the post.

---

## Most useful for the post

1. **Lint already had today's checks in 1978.** Johnson's "Lint, a C Program Checker" (Bell Labs CSTR 65; manual copy dated 26 Jul 1978) flags unused variables and functions, locals "set and never used," and statements after `goto`/`return`/`break`. Its `/* ARGSUSED */` and `/* NOTREACHED */` comments were the first "intentionally unused" markers. Unused code makes programs "harder to understand and change," and "if a function does a necessary job, and is never called, something is wrong!" (1.1)
2. **The two senses of "dead" date from 1971.** Allen and Cocke's IBM catalogue calls instructions dead when they "cannot be reached" or "when their results are never used." That is the same split as `no-unreachable` versus dead-store rules. (1.7)
3. **Go made it a compile error on purpose.** The FAQ: an unused variable "may indicate a bug," and Go refuses to compile, "trading short-term convenience for long-term build speed and program clarity." Also: "if it's worth complaining about, it's worth fixing in the code." (1.5)
4. **The underscore escape hatch is a convention, not a standard, and the tools disagree.**
   - TypeScript hardcoded the `_` exemption for parameters about a week after the flag was merged, after a user complaint (PR #9464, 1 Jul 2016).
   - ESLint has never had a default pattern, only a `^_` example in its docs since v1.3.0 (Aug 2015).
   - Oxlint defaults to `^_`, and its docs say that "deviates from both ESLint and TypeScript-ESLint."
   - Biome exempts `_` names, and **Biome's own unsafe fix renames `a` to `_a` instead of deleting it.** (1.4, 1.6)
5. **ESLint v9 (5 Apr 2024) made an unused `catch (e)` an error by default** (`caughtErrors: "all"`). The migration guide's advice is to "delete the unused caught errors." (1.3)
6. **The duplication canon argues with itself.**
   - Fowler and Beck put Duplicated Code first among the smells in 1999. In 2018 it is second, after Mysterious Name.
   - Don Roberts' Rule of Three (via Fowler) tolerates the second copy.
   - Hunt and Thomas (2019) say DRY "is about the duplication of knowledge," and that identical code can be "a coincidence, not a duplication."
   - Sandi Metz (2016): "duplication is far cheaper than the wrong abstraction." (1.9–1.11)
7. **Knight Capital (SEC Release 70694, 2013) is a dead-code story that no linter would catch.**
   - "Power Peg" was retired in 2003 but "remained present and callable."
   - The new code repurposed its flag. Knight "intended to delete the Power Peg code," but one of eight servers kept the old build.
   - The result was over 4 million executions and 397 million shares in about 45 minutes, a loss of over $460 million, and a $12 million penalty.
   - The code was reachable behind a runtime flag, so the lesson is to delete retired features. (2.1)
8. **goto fail (CVE-2014-1266) was both an unreachable-code bug and a duplication bug.**
   - A duplicated `goto fail;` skipped the signature check.
   - Clang's `-Wunreachable-code` would have caught it, but it is "not in -Wall" (Langley). GCC accepts the flag and ignores it.
   - GCC 6's release notes use this exact CVE to demonstrate `-Wmisleading-indentation`.
   - The same hash sequence appears six times in that file.
   - The JavaScript analogue, a duplicated `return`, is what `no-unreachable` catches (ad-hoc check). (2.2–2.4)
9. **Two more cautionary tales.**
   - Ariane 5 Flight 501: the failing alignment function "serves no purpose" after lift-off and was kept "for commonality reasons."
   - Debian OpenSSL (CVE-2008-0166): a line was removed to quiet Valgrind, leaving the RNG seeded only by the process ID. There were "two identical lines of code in completely different contexts." One was safe to remove and the other wasn't. (2.5, 2.6)
10. **Dead code makes people wrong, not slow.** Romano, Vendome, Scanniello and Poshyvanyk (IEEE TSE 2020) ran four experiments with 83 students. Dead code significantly lowered comprehension correctness, with a large effect in every experiment, but didn't change time taken. Participants "unconsciously modify dead code." Dead methods averaged 15.94% of methods in 35 Java GUI apps. A follow-up found dead methods are mostly "stillborn" and "rarely revived." (3.1–3.3)
11. **Unused code soaks up maintenance.** At Munich Re (Eder et al., ICSE 2012), 25% of method genealogies never ran in two years of production but still got 7.6% of all modifications. Developers judged about half of those changes unnecessary, 3.6% of all maintenance. Haas et al. (TOSEM 2020): 29% of code developers confirmed as unnecessary "was still reachable," so no reachability check finds it. (3.4, 3.5)
12. **At scale, deletion is automated.** Meta's SCARF has deleted "more than 100 million lines of code in over 370,000 change requests" over five years. Google's Sensenmann "submits over 1000 deletion changelists per week" and has deleted "nearly 5% of all C++." Both rely on whole-program build graphs and runtime logs. (3.12)
13. **Unused dependencies and shipped code.**
    - 79.8% of 1,146 JavaScript repos had at least one unused dependency (Jafari et al., TSE 2022).
    - The median mobile page leaves 206 KB (44%) of its JavaScript unused at load (Web Almanac 2024).
    - Removing dead JavaScript reliably saves bytes, but the load-time gain is small and the energy saving not significant (Malavolta et al., TSE 2023). (3.8–3.11)
14. **The faults are in inconsistent copies, not in copies as such.**
    - Juergens et al. (ICSE 2009), five production systems:
      - 52% of clone groups were inconsistent, and 28% of those unintentionally.
      - About every second to third unintentional inconsistency was a fault: 107 developer-confirmed faults, 17 of them crash or data loss.
    - CP-Miner (OSDI 2004): 28 + 23 new copy-paste bugs in Linux and FreeBSD, where programmers "forget to modify identifiers … consistently."
    - Whether clones as such are more defect-prone is contested. Rahman, Bird and Devanbu say no, and "may be less"; Islam et al. 2017 say yes. (4.4–4.10)
15. **JavaScript's duplication on GitHub is mostly vendored dependencies.** In DéjàVu (OOPSLA 2017), 94% of JS files are file-hash copies of the other 6%. The 6% of projects that commit `node_modules` account for "almost 70% of the entire files." Use it for "JS copies whole files," not for "JS developers copy-paste functions." (4.11)
16. **Lint sees one file.** An ESLint rule gets one source text and "may not" access the file system. `no-unused-vars`, Oxlint's `no-unused-vars` and TypeScript's `noUnusedLocals` all treat exports as used. Unused files, exports and dependencies need a module graph, which knip builds from entry points. As unimported's README puts it, linters "fail to report unused files." (6.1–6.3)
17. **Identical-code rules are the narrowest kind of clone detection.**
    - `sonarjs/no-identical-functions` needs exact token equality, in one file, over 3+ lines.
    - Even dedicated detectors on BigCloneBench drop to at most 12% recall once copies are only 50–70% similar.
    - In CP-Miner's data, 65–67% of real copy-pastes rename at least one identifier.
    - Under 16% of functionally similar program pairs were even partly syntactically similar (Wagner et al., 2016). (4.13, 6.5, 6.6)
18. **GitClear (vendor) is where "AI duplicates code" comes from, and its own table is more modest than its headlines.**
    - Commits containing a duplicated 5+ line block went from 0.45% (2022) to 1.80% (2023) to 6.66% (2024).
    - 2024 was the first year copy/pasted lines (12.3%) outnumbered moved lines (9.5%).
    - But no commit is labelled as AI-written, the "8-fold" claim can't be reproduced from the table, the method changed between years, and the "churn will double" projection missed (actual 5.7%, projected 7.1%). (5.1–5.4)
19. **The causal studies find no significant duplication effect.** He et al. (MSR 2026; Cursor; 806 repos vs 1,380 controls): duplicated-line density +7.03%, "insignificant," while warnings rose 30.3% and complexity 41.6%. Agarwal et al. (MSR 2026; agents): "Duplication effects are small and inconsistent." (5.20, 5.21)
20. **Agents re-implement rather than reuse.**
    - Huang et al. (MSR 2026): agent PRs were about 1.87× as semantically redundant with existing functions as human PRs, and reviewers didn't notice (one Python repo, embedding-based).
    - RepoExec (NAACL 2025): LLMs "often reimplement dependencies."
    - Horikawa et al.: duplication motivates 1.1% of agent refactorings vs 13.7% of human ones.
    - Böckeler: agents "are quite happy to copy and paste." (5.12, 5.14, 5.18, 5.26)
21. **Unused code is the leading smell in generated code.**
    - Sonar (vendor): dead, unused or redundant code is 15–43% of each model's code smells, because it "Requires non-local, project-wide reference analysis."
    - 5.1% of ChatGPT's LeetCode solutions had unused variables (Liu et al., TOSEM 2024).
    - Cotroneo et al. (ISSRE 2025): AI code is "more prone to unused constructs."
    - In agent PRs that reviewers revised, 9.9% of agent-written methods were deleted before merge ("What to Cut?", MSR 2026). (5.5–5.9, 5.16)
22. **The model vendor documents the habit, and pulls both ways.** Anthropic's prompting guide says Claude Opus 4.5 and 4.6 "overengineer by creating extra files, adding unnecessary abstractions." It suggests "Don't create helpers, utilities, or abstractions for one-time operations," but also "A bug fix doesn't need surrounding code cleaned up." (5.25)
23. **Agents silencing `no-unused-vars` with `_` is real but anecdotal.** One Claude Code PR cleared the warnings by configuring a `^_` ignore pattern, with "No runtime code changes." Other agent PRs deleted the dead code instead. No study counts it. (5.26)

---

## 1. History of the checks

### 1.1 Johnson, "Lint, a C Program Checker" (Bell Labs, 1977/1978). VERIFIED (full text)

- **Citation:** S. C. Johnson, "Lint, a C Program Checker," Bell Laboratories, Computing Science Technical Report No. 65. Reprinted in the UNIX Programmer's Manual, 7th edition, volume 2 (1978).
- **Links:** troff source from the 7th Edition manual, https://plan9.io/7thEdMan/vol2/lint. A typeset PDF mirror is at https://www.silicon-russia.com/wp-content/uploads/2019/02/lint_1978_stephen_johnson.pdf (unofficial host; its text matches the troff source).
- **Report number and dates:** Bell Labs' own CSTR bibliography (archived at https://web.archive.org/web/20060314023009/http://cm.bell-labs.com/cm/cs/cstr/bib) lists it as "Comp. Sci. Tech. Rep. No. 65," dated December 1977, with internal memo numbers TM 77-1273-14 and TM 78-1273-3, and a 1978 reprint in the UNIX Programmer's Manual. The manual copy is dated **July 26, 1978**. Wikipedia gives 25 October 1978, which matches neither. Cite it as CSTR 65, 1978.
- **Unused variables and functions** (section "Unused Variables and Functions"):
  - How code goes dead: as programs evolve, variables, arguments and "even entire functions" become unnecessary "and yet not be removed from the source."
  - The cost: these "errors of commission" rarely cause working programs to fail, but "they are a source of inefficiency, and make programs harder to understand and change."
  - The bug signal: "if a function does a necessary job, and is never called, something is wrong!"
  - Flags: `-v` suppresses complaints about unused arguments. `-x` reports unused `extern` declarations. `-u` suppresses unused/undefined externals when linting only some files of a program.
- **Set but not used** (section "Set/Used Information"): lint recognises "local variables which are set and never used". These "form a frequent source of inefficiencies, and may also be symptomatic of bugs." This is the 1978 ancestor of dead-store rules (`no-useless-assignment`, `sonarjs/no-dead-store`).
- **Unreachable code** (section "Flow of Control"): lint complains about "unlabeled statements immediately following goto, break, continue, or return statements." Its stated blind spot: "it has no way of detecting functions which are called and never return," such as `exit`. It deliberately stays quiet about unreachable `break` statements, because yacc and lex output can have "literally hundreds of unreachable break statements" (`-b` turns them on).
- **Unused return values:** lint reports functions whose value is "sometimes, or always, unused."
- **The first "intentionally unused" markers:** lint directives in comments. `/* NOTREACHED */` asserts a point is unreachable, and `/* ARGSUSED */` turns on `-v` for one function. These are the ancestors of the underscore prefix and of `eslint-disable` comments.
- **Philosophy section, worth quoting:**
  - Reachability in general is undecidable: deciding whether `exit` is called "is equivalent to solving the famous ‘‘halting problem,’’".
  - The compromise: "If a function is never mentioned, it can never be called."
  - On noise: if too few messages are real bugs, "the messages lose their credibility and serve merely to clutter up the output".
- **The actual message strings** (V7 source on TUHS, https://minnie.tuhs.org/cgi-bin/utree.pl?file=V7/usr/src/cmd/lint/lint.c and `lpass2.c`, and the shared front end `V7/usr/src/cmd/mip/cgram.y`):
  - `statement not reached` (in `mip/cgram.y`, shared with the pcc compiler)
  - `%s unused in function %s` and `argument %s unused in function %s`
  - `%s set but not used in function %s`
  - `%s defined( ... ), but never used`
  - `%s returns value which is %s ignored` ("sometimes" or "always")

### 1.2 JSLint and JSHint. VERIFIED (archived docs and release posts)

- **JSLint (Douglas Crockford):** The docs page carries "©2002 Douglas Crockford." The earliest archived copy I found (Wayback, 28 Mar 2006, https://web.archive.org/web/20060328225949/http://www.jslint.com/lint.html) already lists, in its function report: "(unused) The var is defined but not used," which "may be an indication of an error." By December 2008 the wording is "Unused: The variables that are declared in the function that are not used." So JSLint _reported_ unused variables in a summary from at least 2006, rather than raising them as warnings.
- **JSHint `unused` (Anton Kovalyov):**
  - Introduced in **r09, 5 Aug 2012**: "This release introduces a new option called `unused`." (https://jshint.com/blog/2012-08-05/release-r09)
  - r10 (20 Aug 2012) stopped warning about an unused parameter that is followed by a used one.
  - **1.1.0 (5 Mar 2013)** added the values `true` (all variables, and parameters unless followed by a used one), `"vars"` (variables only, not parameters) and `"strict"` (all variables and all parameters). https://jshint.com/blog/2013-03-05/1-1-0
  - Current docs: "This option warns when you define and never use your variables." https://jshint.com/docs/options/#unused

### 1.3 ESLint `no-unused-vars` and its relatives. VERIFIED (rule docs, changelog, migration guide)

- **Origin:** "This rule was introduced in ESLint v0.0.9" (https://eslint.org/docs/latest/rules/no-unused-vars). The changelog entry for v0.0.9 (**5 Oct 2013**) is "Rule: No unused variables (Ilya Volodin)." v0.6.0 (17 May 2014) changed the default to check all variables (#760).
- **Ignore patterns:** `varsIgnorePattern` and `argsIgnorePattern` arrived in **v1.3.0 (28 Aug 2015)**. Changelog: "add new ignore pattern options to no-unused-vars (fixes #2321) (Mathias Schreck)". The v1.3.0 docs already used `"argsIgnorePattern": "^_"` as the example. The request (issue #2321, opened 15 Apr 2015 by mgol) wanted to mark intentionally unused parameters such as `_ev` in `onClick(_ev, data)`. ESLint has never shipped a default pattern.
- **`caughtErrors`:** added in v2.5.0 (25 Mar 2016) with default `"none"`.
- **ESLint v9 (released 5 Apr 2024, Nicholas C. Zakas, https://eslint.org/blog/2024/04/eslint-v9.0.0-released/):**
  - The migration guide (https://eslint.org/docs/latest/use/migrate-to-9.0.0) says `caughtErrors` "Previously it defaulted to "none" to never check whether caught errors were used." It now defaults to `"all"`. The fix it suggests is to "delete the unused caught errors" (or use `"none"` for runtimes without ES2019 optional catch binding).
  - The issue was #17974 by Josh Goldberg (8 Jan 2024): since ESLint needs Node 12+, "compatibility with older runtimes is no longer a blocker for this issue." The TSC agreed on 25 Jan 2024, and PR #18043 closed it on 1 Feb 2024.
  - Separately, `varsIgnorePattern` "no longer applies to errors in `catch` clauses" (#17540). Use `caughtErrorsIgnorePattern`.
  - v9 also introduced `no-useless-assignment` and added `no-unused-private-class-members` to `eslint:recommended`.
- **Current options:** `vars` (default `"all"`), `args` (default `"after-used"`), `caughtErrors` (default `"all"`), `ignoreRestSiblings` (default `false`), `reportUsedIgnorePattern` (default `false`), plus the four `*IgnorePattern` options with no default.
- **Related core rules (from each rule's docs page):**

| Rule | Introduced | In `@eslint/js` recommended? |
| --- | --- | --- |
| `no-unreachable` | v0.0.6 (Jul 2013, Joel Feenstra) | Yes |
| `no-unused-vars` | v0.0.9 (Oct 2013) | Yes |
| `no-unused-expressions` | v0.1.0 | No |
| `no-duplicate-case` | v0.17.0 | Yes |
| `no-unused-labels` | v2.0.0-rc.0 | Yes |
| `no-self-assign` | v2.0.0-rc.0 | Yes |
| `no-duplicate-imports` | v2.5.0 | No |
| `no-useless-return` | v3.9.0 | No |
| `no-useless-catch` | v5.11.0 | Yes |
| `no-dupe-else-if` | v6.7.0 | Yes |
| `no-unused-private-class-members` | v8.1.0 | Yes (since v9) |
| `no-useless-assignment` | v9.0.0-alpha.1 | Yes |

- **Wording worth noting:**
  - `no-unreachable`: "Unreachable statements are usually a mistake." Its "Handled by TypeScript" note says it is safe to disable under TypeScript, but only with `allowUnreachableCode: false`.
  - `no-useless-assignment` opens by quoting Wikipedia's definition of a "dead store." Its docs say a dead store may mean "you made a mistake in the name of the variable to be stored."
  - `no-unused-private-class-members`: such members are "most likely an error due to incomplete refactoring."

### 1.4 TypeScript `noUnusedLocals` and `noUnusedParameters`. VERIFIED (release notes, tsconfig reference, PRs)

- **Release:** TypeScript **2.0** (announced 22 Sep 2016 by Daniel Rosenwasser; the announcement post itself doesn't mention the flags). The 2.0 release notes: "TypeScript 2.0 has two new flags to help you maintain a clean code base." `noUnusedLocals` covers "variables, functions, classes, imports, etc…" and "unused private members of a class." https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html
- **tsconfig reference:** `noUnusedLocals`, "Report errors on unused local variables." `noUnusedParameters`, "Report errors on unused parameters in functions." Both list "Released: 2.0." https://www.typescriptlang.org/tsconfig/#noUnusedLocals
- **Implementation:** PR #9200, "Unused identifiers compiler code," by Sarangan Rajamanickam (sarangan12), merged late June 2016.
- **The underscore exemption came from user pushback a week later.** Issue #9458 (30 Jun 2016) asked how to skip unneeded parameters. Mohamed Hegazy had considered special-casing `_` but thought it "does not seem nice"; Ryan Cavanaugh proposed exempting `_`-prefixed names. Hegazy's PR #9464 ("exclude parameters starting with underscore from unusedParamter checks") merged on 1 Jul 2016. The 2.0 notes say: "Parameters declaration with names starting with `_` are exempt from the unused parameter checking."
- **Unreachable code came first, in TS 1.8 (early 2016).** The 1.8 notes say such statements "are now correctly flagged as unreachable code errors," on by default, with `allowUnreachableCode` and `allowUnusedLabels` to turn them off. Today the tsconfig reference gives `allowUnreachableCode` a default of `undefined`: "provide suggestions as warnings to editors". `false` raises errors. I didn't pin down when that default changed.
- **Why compiler options and not lint?** No design rationale was recorded on PR #9200 or in the release notes. Two contemporary statements frame the trade-off:
  - TSLint's `no-unused-variable` docs: "Similar to tsc's –noUnusedParameters and –noUnusedLocals options, but does not interrupt code compilation." https://palantir.github.io/tslint/rules/no-unused-variable/
  - typescript-eslint's `no-unused-vars` docs: "These lint rules are more configurable than TypeScript's compiler options." Projects often set TS errors "to block builds more aggressively than ESLint complaints." They "generally recommend using `@typescript-eslint/no-unused-vars`" instead, and note "TypeScript hardcodes its exemptions to names starting with `_`." https://typescript-eslint.io/rules/no-unused-vars/
- **Lineage of the rationale text:** TSLint's rationale ("likely an error due to incomplete refactoring") reappears almost word for word in ESLint's `no-unused-private-class-members` docs and Oxlint's `no-unused-vars` docs.

### 1.5 Go: unused imports and variables are compile errors. VERIFIED

- **Go FAQ, "Can I stop these complaints about my unused variable/import?"** (https://go.dev/doc/faq):
  - "The presence of an unused variable may indicate a bug." Unused imports "just slow down compilation."
  - Go refuses to compile them, "trading short-term convenience for long-term build speed and program clarity."
  - No option to downgrade them, because "compiler options should not affect the semantics of the language" and the compiler reports no warnings.
  - The no-warnings philosophy: "if it’s worth complaining about, it’s worth fixing in the code." Warnings also encourage noise, "masking real errors that should be fixed."
  - Escape hatch: "Use the blank identifier to let unused things persist while you're developing." Its example is commented "TODO: Delete before committing!" `goimports`/`gopls` now remove unused imports automatically.
- **The spec splits the two cases** (https://go.dev/ref/spec):
  - Imports: it is illegal "to directly import a package without referring to any of its exported identifiers." `import _ "lib/math"` is the side-effect-only form.
  - Variables: only an "Implementation restriction": a compiler "may make it illegal" to declare a function-local variable that "is never used."
  - Labels: "It is illegal to define a label that is never used."
- **The deeper rationale:** Rob Pike, "Go at Google: Language Design in the Service of Software Engineering," SPLASH 2012 keynote (25 Oct 2012), https://go.dev/talks/2012/splash.article. "unused dependencies are a compile-time error (not a warning, an error)." This guarantees the dependency graph "has no extraneous edges." The supporting anecdote: when Google's build moved to explicit per-directory dependencies in 2003, "A typical binary shrank about 40% in file size."

### 1.6 The underscore convention for "intentionally unused". VERIFIED (each tool's docs)

| Ecosystem | What is documented | Since |
| --- | --- | --- |
| C lint | `/* ARGSUSED */` and `-v` silence unused-argument complaints | 1978 (CSTR 65) |
| Go | Blank identifier `_`; FAQ suggests `_ = x` while developing | language spec |
| Python | PEP 640 (Thomas Wouters, 2020, **Rejected**): "Conventionally, people use either "_" or a name such as "unused"." It adds: "despite the convention, "_" is not a special variable." Pylint's `dummy-variables-rgx` defaults to `_+$\|(_[a-zA-Z0-9_]*[a-zA-Z0-9]+?$)\|dummy\|^ignored_\|^unused_`, and `ignored-argument-names` to `_.*\|^ignored_\|^unused_` (pylint 4.1.3 docs). | PEP 640: Oct 2020 |
| Rust | rustc's `unused_variables` explanation: "Unused variables may signal a mistake or unfinished code." To silence it, "prefix it with an underscore such as _x." The diagnostic says "if this is intentional, prefix it with an underscore." The Book (ch. 19.3): `_x` "still binds the value," while `_` "doesn't bind at all." `unused_assignments` also skips `_x`. `dead_code` suggests the underscore for items too. | current docs; first version not pinned |
| TypeScript | `_`-prefixed parameters exempt from `noUnusedParameters` | 2.0 (PR #9464, Jul 2016) |
| ESLint | `argsIgnorePattern` / `varsIgnorePattern`, with `^_` as the docs example; **no default** | v1.3.0 (Aug 2015) |
| typescript-eslint | Docs give a config to "emulate" TypeScript's `_` exemption | — |
| Oxlint | `argsIgnorePattern` and `varsIgnorePattern` default to `^_` (bare `_` parameter excepted) unless options are given as an object. "this behavior deviates from both ESLint and TypeScript-ESLint, which never provide a default pattern." https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-unused-vars.html | — |
| Biome | `noUnusedVariables` (since v1.0.0) exempts `_`-prefixed names: "a very diffuse pattern among programmers, and Biome follows it." `noUnusedFunctionParameters` (since v1.8.0): "The underscore communicates that the parameter is intentionally unused." | v1.0.0 |

- **For the agent angle, the most important line:** Biome's **unsafe fix for `noUnusedVariables` renames the variable to `_name`** rather than deleting it. Diagnostic: "Unsafe fix: If this is intentional, prepend a with an underscore." The docs example turns `let a = 4; a++;` into `let _a = 4; _a++;`. So the tool's own suggested fix is the silencing move. https://biomejs.dev/linter/rules/no-unused-variables/
- **Oxlint's fixer** for `no-unused-vars` defaults to suggestions, marked "dangerous" for variables. A new `fix` option is "experimental."

### 1.7 Dead code elimination in compilers. VERIFIED (scanned text)

- **Citation:** Frances E. Allen and John Cocke, "A Catalogue of Optimizing Transformations." IBM Research Report RC 3548, dated 20 Sep 1971, 33 pp. (Computer History Museum catalog 102655328, https://www.computerhistory.org/collections/catalog/102655328). Published in Randall Rustin (ed.), _Design and Optimization of Compilers_, Courant Computer Science Symposium 5 (New York, 1971), Prentice-Hall, **1972**, pp. 1–30.
- **Text:** a scan with OCR is at Fermat's Library, https://fermatslibrary.com/p/77219a71. The section "Dead Code Elimination" is on p. 20 of the book:
  - "Primarily as a result of constant folding, instructions become "dead.""
  - Two senses in one definition: instructions "are considered dead when they cannot be executed" because their area of the program "cannot be reached," "or when their results are never used."
  - That is the same split lint draws: unreachable code versus set-but-not-used.
- **Terminology warning:** later usage is inconsistent. Some sources reserve "dead code" for code that runs but whose results are unused, and "unreachable code" for code that never runs. Allen and Cocke use "dead" for both. Say which sense you mean.
- **Later refinement:** Knoop, Rüthing and Steffen, "Partial dead code elimination," PLDI 1994, https://doi.org/10.1145/178243.178256. VERIFIED (metadata only; abstract not available).
- **Dragon Book:** see "Unverified or dropped."

### 1.8 JavaScript tree shaking. VERIFIED

- **Rollup:** 0.1.0 published to npm **14 May 2015** (npm registry timestamps).
- **Rich Harris, "Tree-shaking versus dead code elimination," Medium, 21 Dec 2015.** https://medium.com/@Rich_Harris/tree-shaking-versus-dead-code-elimination-d3765df85c80 (403 to fetchers; read via the Wayback copy, https://web.archive.org/web/20170106183720/https://medium.com/@Rich_Harris/tree-shaking-versus-dead-code-elimination-d3765df85c80)
  - The eggshell analogy: dead code elimination is "taking the finished product, and imperfectly removing bits you don’t want."
  - "Rather than excluding dead code, we’re including live code."
  - On the name: it was used before him "mostly in the Dart community," and "I can’t remember exactly where I picked up the term."
  - Its limits: Rollup works on top-level AST nodes and can't remove unused methods from objects that are used, because "static analysis is difficult in a dynamic language like JavaScript."
- **webpack docs** (https://webpack.js.org/guides/tree-shaking/):
  - "Tree shaking is a term commonly used in the JavaScript context for dead-code elimination." The name and concept were "popularized by the ES2015 module bundler rollup."
  - webpack 2 added "unused module export detection." webpack 2.2.0, the first stable 2.x release, is dated 17 Jan 2017 on npm.
  - webpack 4 (npm 25 Feb 2018) added the `"sideEffects"` package.json hint. A side effect is "code that performs a special behavior when imported."
- **Relevance:** bundlers drop unused _exports_ from the shipped bundle, but the source still carries them. Lint's unused-variable rules work inside one file. Neither removes an unused export from the repo; that takes whole-program tools (section 6).

### 1.9 Fowler and Beck: "Duplicated Code" and the Rule of Three. VERIFIED (2nd edition text and a 1st-edition draft); 1st-edition print wording NOT opened

- **Citation:** Martin Fowler, with Kent Beck, John Brant, William Opdyke and Don Roberts, _Refactoring: Improving the Design of Existing Code_, Addison-Wesley, 1999 (1st edition, ISBN 0-201-48567-2). 2nd edition, Martin Fowler with Kent Beck, Addison-Wesley, 2018 (copyright page says 2019). Chapter 3, "Bad Smells in Code," was written jointly by Fowler and Beck. The chapter opens with "If it stinks, change it." (attributed to "Grandma Beck").
- **First edition: Duplicated Code is the first smell.** I could not open the printed 1999 text. A pre-publication draft of chapter 3 used as a Duke course reading (https://courses.cs.duke.edu/compsci307d/fall21/readings/CodeSmells.pdf) opens with "Duplicated code" and "Number one on the stink parade is duplicated code." It is a draft: it cites "Extract Component (166)," which is not a refactoring in the published book. The widely quoted published form is "Number one in the stink parade is duplicated code." (e.g. EuroPython 2013 slides). Use "in" only if you can check a print copy.
- **Second edition: Duplicated Code is no longer first.** The 2018 chapter 3 opens with **Mysterious Name**, and Duplicated Code is second. The "stink parade" sentence is gone. The section now begins "If you see the same code structure in more than one place." It adds the reading cost: with copies, "you need to read them carefully to see if there’s any difference."
- **The Rule of Three** (2nd edition, ch. 2): "Here’s a guideline Don Roberts gave me." The first time, "you just do it." The second time, "you wince at the duplication, but you do the duplicate thing anyway." "The third time you do something similar, you refactor." Then: "Three strikes, then you refactor." Secondary sources give the same Don Roberts wording for the 1999 edition, with the tip usually quoted as "Three strikes and you refactor." I did not open the 1999 text, so cite the guideline to Roberts via Fowler, and quote the 2018 wording.
- **Dead code was not one of the 1999 smells.** Romano et al. (3.1) state that the 1st edition's 22 smells did not include dead code. The named smell comes from later books (Wake 2003, Martin 2008, per their related work). "Remove Dead Code" is a refactoring in the 2nd edition. I did not check the 1999 smell list against a print copy.
- **Remove Dead Code** (2nd edition, refactoring on p. 237): the motivation says compilers will strip unused lines, "But unused code is still a significant burden." It "doesn’t carry any warning signs telling programmers that they can ignore this function." On keeping code just in case: "I don’t worry that I may need it sometime in the future." Version control will have it. "Commenting out dead code was once a common habit."

### 1.10 DRY: Hunt and Thomas. VERIFIED (publisher extract of the 20th anniversary edition)

- **Citation:** Andrew Hunt and David Thomas, _The Pragmatic Programmer_, Addison-Wesley, 1999. 20th Anniversary Edition, David Thomas and Andrew Hunt, 2019, Topic 9, "DRY—The Evils of Duplication." Publisher extract: https://media.pragprog.com/titles/tpp20/dry.pdf
- **The principle (Tip 15):** "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."
- **The authors' own correction ("DRY is More Than Code"):**
  - In the first edition "we did a poor job of explaining just what we meant."
  - "Many people took it to refer to code only." They thought it meant "don’t copy-and-paste lines of source."
  - Copy-paste avoidance "is part of DRY, but it’s a tiny and fairly trivial part."
  - "DRY is about the duplication of knowledge, of intent."
- **The counterpoint, in the same chapter ("Not All Code Duplication is Knowledge Duplication"):** `validate_age` and `validate_quantity` have identical bodies. A reviewer who calls it a DRY violation is wrong: "That’s a coincidence, not a duplication." This is the key caveat for `sonarjs/no-identical-functions`.
- **Tip 16, "Make It Easy to Reuse":** "if you fail to reuse, you risk duplicating knowledge." This connects to agents writing a new helper instead of finding the existing one.
- **Note:** I verified the definition in the 20th anniversary text. The 1999 wording is the same per many secondary sources and the C2 wiki's DRY page (1.12), but I didn't open the 1999 book.

### 1.11 Sandi Metz, "The Wrong Abstraction" (2016). VERIFIED

- **Source:** Sandi Metz, blog post, **20 Jan 2016**, https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction. It was first written for her Chainline newsletter. The line comes from her RailsConf 2014 talk "All the Little Things."
- **The claim:** "duplication is far cheaper than the wrong abstraction." Her summary advice: "prefer duplication over the wrong abstraction."
- **How it goes wrong:** Programmer A extracts duplication into a new abstraction. A new requirement arrives that is "almost perfect" for it, so Programmer B adds a parameter and a conditional. More requirements follow until "Loop until code becomes incomprehensible."
- **Why the code stays:** "Existing code exerts a powerful influence." "Its very presence argues that it is both correct and necessary." She calls this the sunk cost fallacy. The point applies to dead code as much as to bad abstractions.
- **The way back:** "the fastest way forward is back." "Re-introduce duplication by inlining the abstracted code back into every caller." Then delete what each caller doesn't need, and re-extract.

### 1.12 Once and Only Once (Beck, C2 wiki). ANECDOTAL (wiki page; undated contributions)

- **Source:** C2 wiki, "OnceAndOnlyOnce" (JSON at http://c2.com/wiki/remodel/pages/OnceAndOnlyOnce; last edited 9 Nov 2014; the contributions are older).
- **Text:** "Each and every declaration of behavior should appear OnceAndOnlyOnce." A signed Kent Beck contribution calls duplicate code one of the strongest code smells. Ron Jeffries adds that refactoring aims at "getting each piece of functionality to exist in exactly one place." A later contributor warns: "Beware of introducing unnecessary coupling."
- **The C2 "DontRepeatYourself" page** quotes the Hunt and Thomas definition and says "duplication of ''knowledge'' - not just text - is the real culprit."
- Use it only for colour; the citable sources are Fowler (1.9) and Hunt and Thomas (1.10).

---

## 2. Incidents

Every item here was checked against the primary record: the SEC order, the CVE record and vendor advisory, the vendor's published source, the inquiry board report, the distribution's advisory and bug log.

### 2.1 Knight Capital, 1 August 2012: a reused flag woke up retired code. VERIFIED (full SEC order)

- **Source:** U.S. Securities and Exchange Commission, _In the Matter of Knight Capital Americas LLC_, Securities Exchange Act of 1934 Release No. 70694, Administrative Proceeding File No. 3-15570, 16 October 2013. https://www.sec.gov/litigation/admin/2013/34-70694.pdf (10 pages). Knight settled "without admitting or denying the findings."
- **What happened (paras 12–17):**
  - For the NYSE Retail Liquidity Program (RLP), launching 1 Aug 2012, Knight wrote new code for SMARS, its order router. The new code "was intended to replace unused code" for a feature called "Power Peg."
  - **Power Peg had been retired for nine years.** "In 2003, Knight ceased using the Power Peg functionality." Yet "the Power Peg functionality remained present and callable."
  - **The flag was reused.** The new RLP code "repurposed a flag that was formerly used to activate the Power Peg code."
  - **Deletion was the plan.** "Knight intended to delete the Power Peg code" so the flag would engage RLP instead. The eighth server never got that change.
  - **The dead code had rotted.** In 2005 Knight moved Power Peg's cumulative-quantity check (the thing that stopped child orders once a parent order filled) earlier in the code. "Knight did not retest the Power Peg code after moving the cumulative quantity function."
  - **Deployment missed one machine.** From 27 July 2012 a technician "did not copy the new code to one of the eight SMARS computer servers." There was no second-person review and no written procedure requiring one.
  - On 1 August, orders carrying the repurposed flag hit the eighth server and ran Power Peg, which kept sending child orders without counting fills.
- **Numbers (para 1 and 17):** 212 incoming parent orders; "millions" of child orders; over **4 million executions in 154 stocks for more than 397 million shares** in about **45 minutes**; a net long position of about $3.5 billion (80 stocks) and net short of about $3.15 billion (74 stocks). Knight "lost over $460 million" (para 1); para 17 says it "realized a $460 million loss."
- **Warnings ignored:** From 8:01 a.m., an internal system sent 97 automated emails saying "Power Peg disabled" before the 9:30 open. They were not designed as alerts and nobody acted on them (para 19).
- **The fix made it worse:** Knight uninstalled the new RLP code from the seven good servers. "This action worsened the problem" because those servers then ran Power Peg too (para 27).
- **The finding about dead code (para 9.D):** Knight lacked controls "to prevent the activation of code no longer intended for use" that was "left on its servers." Para 26: no "written protocol concerning the accessing of unused code on its production servers."
- **Penalty:** a civil money penalty of **$12,000,000** (Section IV), plus a cease-and-desist order and an independent consultant.
- **For the post:** The SEC never says "dead code"; its phrases are "unused code" and "code no longer intended for use." No linter would have flagged Power Peg: it was reachable behind a runtime flag. The lesson is about deleting retired features, not about `no-unreachable`.

### 2.2 Apple "goto fail", CVE-2014-1266 (February 2014). VERIFIED (CVE record, NVD, Apple advisories, Apple's published source)

- **CVE record** (https://www.cve.org/CVERecord?id=CVE-2014-1266; published 22 Feb 2014): `SSLVerifySignedServerKeyExchange` in `libsecurity_ssl/lib/sslKeyExchange.c` "does not check the signature in a TLS Server Key Exchange message." Affected iOS 6.x before 6.1.6 and 7.x before 7.0.6, Apple TV 6.x before 6.0.2, and OS X 10.9.x before 10.9.2. Man-in-the-middle attackers could spoof SSL servers by signing with an arbitrary key or skipping the signature.
- **NVD:** CWE-295 (improper certificate validation). CVSS 3.1 7.4 High (AV:N/AC:H); CVSS 2.0 5.8. https://nvd.nist.gov/vuln/detail/CVE-2014-1266
- **Apple's advisories** (iOS 7.0.6, old HT6147, now https://support.apple.com/en-us/103608; OS X 10.9.2 / Security Update 2014-001, old HT6150, now https://support.apple.com/en-us/103380): "Secure Transport failed to validate the authenticity of the connection." "This issue was addressed by restoring missing validation steps." Apple never describes the code.
- **The source (checked directly):** Apple's `Security-55471` release (OS X 10.9) has, at lines 629–631 of `libsecurity_ssl/lib/sslKeyExchange.c`:

  ```c
  if ((err = SSLHashSHA1.update(&hashCtx, &signedParams)) != 0)
      goto fail;
      goto fail;
  ```

  `Security-55471.14` (the fix) has one `goto fail;` there. `Security-55179.13` (OS X 10.8.5) never had the duplicate. Source: https://github.com/apple-oss-distributions/Security/blob/Security-55471/libsecurity_ssl/lib/sslKeyExchange.c (Apple's official mirror; the old opensource.apple.com URLs now return an HTML page).

- **Mechanism (Adam Langley, ImperialViolet, 22 Feb 2014, https://www.imperialviolet.org/2014/02/22/applebug.html):** The second `goto fail` "isn't conditional at all." `err` still holds the success value from the SHA1 update, so "the signature verification will never fail." The final hash and the signature check below it are unreachable.

### 2.3 Would the compiler have caught goto fail? VERIFIED (Langley, Wheeler, GCC mailing list, GCC and Clang docs)

- **Langley:** with `-Wall`, neither GCC 4.8.2 nor Clang 3.3 would "make a peep about the dead code." He wonders whether "the false positive rate is too high over real codebases?" And: Clang "does have -Wunreachable-code to warn about this, but it's not in -Wall."
- **Clang, still today:** The current Clang diagnostics reference lists `-Wunreachable-code` ("warning: code will never be executed") as its own group. It is not among the groups `-Wall`, `-Wmost` or `-Wextra` control. `-Weverything` and `-Wunreachable-code-aggressive` turn it on. https://clang.llvm.org/docs/DiagnosticsReference.html
- **GCC removed the warning but kept the flag.** Ian Lance Taylor, gcc-help, 25 May 2011 (https://gcc.gnu.org/ml/gcc-help/2011-05/msg00360.html): "The -Wunreachable-code has been removed, because it was unstable." It relied on the optimizer, so "different versions of gcc would warn about different code." "The compiler still accepts and ignores the command line option." My check of the manuals: `-Wunreachable-code` is documented in the GCC 4.4.7 manual and absent from 4.5.4 onward.
- **GCC 6 (2016) added `-Wmisleading-indentation`, and the release notes use goto fail as the example.** The GCC 6 changes page shows the warning firing on `sslKeyExchange.c:629` for CVE-2014-1266 and says "This warning is enabled by -Wall." https://gcc.gnu.org/gcc-6/changes.html. Clang added the same flag in 2019 (D70638). Current Clang docs list it under `-Wall`; Wheeler's essay (last updated 2021) says it was not in Clang's `-Wall` "at the time of this writing."
- **David A. Wheeler, "The Apple goto fail vulnerability: lessons learned"** (https://dwheeler.com/essays/apple-goto-fail.html, first 23 Nov 2014, updated 16 Jan 2021):
  - The bug "would have been immediately detected" "if Apple had used a tool that did proper unreachable code detection."
  - GCC "still accepts a parameter intended for the purpose, namely -Wunreachable-code," and does nothing. He verified GCC 4.8.3 ignores it and Clang 3.4.2 catches it.
  - A caution worth quoting: "unreachable code is not, by itself, necessarily a security vulnerability." The right response is to "fix the error, don't remove the code!"
- **Arie van Deursen, "Learning from Apple's #gotofail Security Bug," 22 Feb 2014** (https://avandeursen.com/2014/02/22/gotofail-security/): unreachable code detection is "a fundamentally undecidable problem," so tools trade completeness against precision. Line coverage would have exposed it: "there is no way to achieve 100% line coverage."
- **The JavaScript analogue, ad-hoc check (12 Oct 2026; re-run before quoting):** A TypeScript function with `if (!(await checkHash(sig))) return false;` followed by a stray, wrongly indented `return false;` and the remaining check.
  - **Oxlint 1.86.0** `no-unreachable` reported both following statements ("Unreachable code").
  - **TypeScript 6.0.3** with `allowUnreachableCode: false` reported TS7027 "Unreachable code detected."
  - **Oxfmt 0.71.0** re-indented the stray `return` to the outer level, so the misleading indentation disappears.
  - JS has no `goto`. The analogue of a duplicated `goto fail` is a duplicated unconditional `return`, `throw`, `break` or `continue`, which is exactly what `no-unreachable` covers. ESLint's `no-unreachable` was introduced in v0.0.6 and is in `@eslint/js` recommended today (I didn't trace when it was added there).

### 2.4 goto fail was also a duplication bug. VERIFIED (article, plus my count of Apple's source)

- **Source:** Mike Bland, "Goto Fail, Heartbleed, and Unit Testing Culture," martinfowler.com, 3 June 2014. https://martinfowler.com/articles/testing-culture.html (Bland also published a version in ACM Queue, "Finding More Than One Worm in the Apple," 2014; the ACM site blocked my fetch.)
- **Claim:** "the algorithm appears six different times in the same file": twice in `SSLVerifySignedServerKeyExchange()` (which had the bug), once in its TLS 1.2 variant, twice in `SSLSignServerKeyExchange()`, once in its TLS 1.2 variant.
- **I checked the count.** In `Security-55471`'s `sslKeyExchange.c`, the hash sequence beginning `update(&hashCtx, &serverRandom)` appears at lines 290, 356, 376, 605, 627 and 703. Six copies, matching Bland.
- **His argument:** The fix removed the extra line, "but the duplicated algorithm remains." Duplication is "known to increase the likelihood of software errors," and six copies point to "a development culture that tolerates duplicated, untested code." He extracted the sequence into one `HashHandshake()` function with a unit test that fails if a stray `goto fail` is added.
- **His point about lint:** warnings or mandatory braces "could've stopped this one line," but a merge that deleted the final hash step instead would be the same bug with no unreachable code to warn about.
- **Caveat:** "Known to increase the likelihood" is Bland's assertion, not a cited study. Use the duplication research in section 4 for evidence.

### 2.5 Ariane 5 Flight 501, 4 June 1996: code kept "for commonality" that served no purpose. VERIFIED (official ESA report, scanned PDF OCR'd, plus the text copy)

- **Source:** "ARIANE 5 Flight 501 Failure: Report by the Inquiry Board," chaired by Prof. J. L. Lions, Paris, 19 July 1996. Official ESA PDF (a 60-page scan): https://esamultimedia.esa.int/docs/esa-x-1819eng.pdf. Text copy: https://sunnyday.mit.edu/nasa-class/Ariane5-report.html. I OCR'd the ESA scan and checked the key sentences against the text copy.
- **What happened:** About 40 seconds after the flight sequence began, at about 3,700 m, the launcher "veered off its flight path, broke up and exploded."
- **The dead-weight code:** The exception came from the inertial reference system's alignment software. "This software module computes meaningful results only before lift-off." "As soon as the launcher lifts off, this function serves no purpose."
- **Why it was still running:** It ran for 50 seconds after flight mode started, a requirement from Ariane 4 (to allow a fast restart after a late hold; used once, on Flight 33 in 1989). That timing "is not required for Ariane 5." The function was "maintained for commonality reasons," on the view it was "not wise to make changes in software which worked well on Ariane 4." Finding (m): "This realignment function, which does not serve any purpose on Ariane 5" was retained anyway.
- **The fault:** A 64-bit float to 16-bit signed integer conversion of the horizontal bias value (BH) overflowed. Those conversions "were not protected from causing an Operand Error," though comparable ones nearby were.
- **For the post:** This is "dead code" in the functional sense (it ran, but its results were useless), not unreachable code. No lint rule sees it. It belongs next to Knight as a story about keeping code you no longer need.

### 2.6 Debian OpenSSL, CVE-2008-0166: deleting a line to silence a tool, and two identical lines with different meanings. VERIFIED (DSA-1571, Debian bug #363516, Debian wiki)

- **Advisory:** DSA-1571-1, Florian Weimer, 13 May 2008, https://www.debian.org/security/2008/dsa-1571 (redirects to https://lists.debian.org/debian-security-announce/2008/msg00152.html). Luciano Bello found that Debian's OpenSSL random number generator "is predictable." It was "caused by an incorrect Debian-specific change." The first vulnerable version, 0.9.8c-1, was uploaded on 2006-09-17. All key material generated since had to be regenerated, and DSA keys used on affected systems were "considered compromised."
- **The bug report that started it:** Debian bug #363516, "valgrind-clean the RNG," Richard Kettlewell, 19 Apr 2006. https://bugs.debian.org/363516. Uninitialised data in the RNG was "producing valgrind hits throughout your program." The maintainer, Kurt Roeckx, pointed at two lines in `md_rand.c`, both `MD_Update(&m,buf,j);`, one marked `/* purify complains */`, and wrote "I've been thinking about commenting those out." The changelog line: "Don't add uninitialised data to the random number generator."
- **Why it was catastrophic:** Tim Hudson, in the same bug log, 14 May 2008: "there are two identical lines of code in completely different contexts." "One was safe to remove, the other most certainly was not." The one in `ssleay_rand_add` was how entropy entered the pool.
- **How weak (Debian wiki, https://wiki.debian.org/SSLkeys):** the broken OpenSSL "was being seeded only by process ID," so "there were 32767 possible random number streams per architecture."
- **For the post:** Two morals that fit this topic. First, removing code to quiet a tool, without understanding why the tool fired, is a real failure mode (the agent analogue is deleting or `_`-prefixing a "dead" value to pass a linter). Second, two textually identical lines can mean different things, which is the limit of any identical-code rule.
- **Caveat:** Thijs Kinkhorst notes in the log that the 0.9.8b-1 change itself was not the vulnerable one; the vulnerability appeared in 0.9.8c-1. Kettlewell says the committed change was "not even slightly the same" as his proposal. Don't blame the reporter.

### 2.7 Copy-paste bugs in operating systems: CP-Miner (OSDI 2004). VERIFIED (full PDF)

- See 4.9. In short: 28 copy-paste bugs in Linux and 23 in FreeBSD, mostly previously unreported. The pattern is a pasted loop with one identifier left unrenamed. 65–67% of copy-pasted segments rename at least one identifier, which is why exact-match rules miss most copies (6.5).

### 2.8 The "last line effect" in micro-clones (Beller, Zaidman, Karpov, Zwaan; EMSE 2017). VERIFIED (metadata + abstract; numbers from the OSF preprint)

- **Citation:** Moritz Beller, Andy Zaidman, Andrey Karpov, Rolf A. Zwaan, "The last line effect explained," _Empirical Software Engineering_ 22(3):1508–1536, 2017. https://doi.org/10.1007/s10664-016-9489-6. Preprint: https://doi.org/10.31219/osf.io/4wsc3. The original short paper: ICPC 2015, https://doi.org/10.1109/ICPC.2015.34.
- **Abstract:** In 219 open-source projects they report 263 faulty micro-clones (tiny duplicated runs of a few lines) and interview six of their authors. The last line or statement "is much more likely to contain an error." They attribute it to "action slips": attention drifts at the end of a routine copy-paste. Every micro-clone whose origin they could trace came in an unusually large commit.
- **Preprint numbers:** 74% of faulty multi-line micro-clones had the error on the last line, and 90% of one-liner micro-clones in the last statement.
- **Vendor note:** Karpov works for PVS-Studio, the analyser used to find the clones. Mark as vendor-coauthored.
- **For the post:** This is the human failure mode behind `no-dupe-else-if`, `no-duplicate-case`, `sonarjs/no-identical-expressions` and `no-dupe-keys`.

### 2.9 A discarded result: epa4all-client, CVE-2026-44900. VERIFIED (advisory); one case, Java

- **Source:** GHSA-g8r3-5hwf-qp96, "epa4all-client has a VAU Signature bypass," High, CVSS 3.1 8.1. `com.oviva.telematik:epa4all-client` <= 1.2.0, fixed in 1.2.1, published May 2026. https://github.com/advisories/GHSA-g8r3-5hwf-qp96
- **Root cause:** `isTrusted()` "discards the boolean return value of Signature.verify()," so "For any structurally valid signature, it returns true."
- **Why it's here:** It is the boundary case. A discarded call result is neither an unused variable nor an unused expression to a JS linter: ESLint's `no-unused-expressions` "does not apply to function calls" (section 6.1). Only type-aware rules for specific types (such as `no-floating-promises`) or "must use" annotations in other languages catch it. Use it only as an illustration, not a JS incident.

### 2.10 What I did not find

- **No JavaScript or TypeScript CVE** whose root cause the advisory describes as an unused variable or dead store. Searches of GitHub advisories turned up a Go case (gh CLI, CVE-2025-25204, "a re-used uninitialized error variable") and the Java case above; neither is a clean unused-variable story.
- **No public postmortem** naming a JS lint-detectable dead-code or duplicated-code defect as root cause of an outage.

---

## 3. Research on dead code

### 3.1 Romano, Vendome, Scanniello and Poshyvanyk, "A Multi-Study Investigation into Dead Code" (IEEE TSE 2020; online 2018). VERIFIED (full author post-print)

- **Citation:** Simone Romano, Christopher Vendome, Giuseppe Scanniello, Denys Poshyvanyk. _IEEE Transactions on Software Engineering_ 46(1), pp. 71–99, January 2020. Published online in 2018 (the post-print carries "© 2018 IEEE").
- **Links:** https://doi.org/10.1109/TSE.2018.2842781. Open post-print on the University of Salerno repository: https://www.iris.unisa.it/handle/11386/4779799
- **Definition used:** dead code is "unnecessary source code, because it is unused and/or unreachable." The paper uses "dead" to cover lava flow, unreachable and unused code, and distinguishes dead classes, methods, variables, parameters and statements.
- **Design:** It ran between December 2015 and December 2016.
  - A motivating mining study of GUI-based Java apps on GitHub.
  - Semi-structured interviews with **6 software professionals** (4–10 years' experience; two were project managers).
  - **Four controlled experiments with 83 students in total.** UniBas1 had 47 undergraduates, UniBas2 had 19 graduate students, W&M1 had 11 and W&M2 had 6. They ran at the University of Basilicata and the College of William & Mary.
- **Mining study (dead methods, found with their DUM-Tool):**
  - 2,484 candidate GUI apps were found; 35 built.
  - 32 of the 35 had dead methods; dead methods per app had a median of 7.5, mean 42.12 and max 405.
  - "on average dead methods are 15.94% of methods of an application," with a median of 11.95%.
  - Of the 13 apps that built at two or more commits, 5 kept a constant number of dead methods. Others had spikes, such as one app going briefly to 60 dead methods.
- **Interview findings (Table 19):**
  - Code is "born dead" (written for anticipated future use), "made dead" during maintenance, or "inherited dead."
  - Removal is done if low-risk and low-cost, ignored if high-risk, and postponed if high-cost.
  - Dead code is sometimes commented out instead of deleted, and "There is a lack of tool support."
  - Developers believe dead code worsens comprehension, maintenance and performance.
- **Experiment findings:**
  - "Dead code significantly worsens comprehension of unfamiliar code" (F17). The effect on comprehension correctness (CF) had p < 0.0001 and a large Cliff's δ "in all the experiments."
  - "Dead code does not significantly affect effort to comprehend unfamiliar code" (F16). That is, it doesn't slow people down; it makes them wrong.
  - "Dead methods are more harmful than dead classes" (F18).
  - "Dead code does not significantly affect modifiability of familiar code" (F19). It "seems to worsen modifiability of unfamiliar code" (F20).
  - "Developers unconsciously modify dead code" (F21). Some participants "wasted time modifying existing dead code" without realising it.
  - Mean comprehension correctness, no dead code vs with dead code: UniBas1 0.85 vs 0.74; UniBas2 0.66 vs 0.41 (Table 9).
- **Caveats:**
  - The experiment participants are students.
  - The mining study only covers Java GUI desktop apps; libraries were excluded because public API methods would inflate counts.
  - The modifiability evidence rests on W&M2's 6 participants.
- **For the post:** this is the strongest controlled evidence that dead code hurts. The effect is on **correctness of understanding**, not time.

### 3.2 The earlier Romano/Scanniello line of work. VERIFIED (metadata + abstract)

- **Scanniello, "Source code survival with the Kaplan Meier estimator,"** ICSM 2011, pp. 524–527 (cited in 3.1). It studied dead methods in five evolving systems; in two, developers avoided introducing dead code. Not opened; it's cited here as described by Romano et al.
- **Scanniello, "An investigation of object-oriented and code-size metrics as dead code predictors,"** SEAA 2014, https://doi.org/10.1109/SEAA.2014.67. Per Romano et al., LOC was the best of 13 metrics as a predictor.
- **Romano and Scanniello, "DUM-Tool,"** ICSME 2015 tool demo, pp. 339–341.
- **Romano, Scanniello, Sartiani and Risi, "A graph-based approach to detect unreachable methods in Java software,"** ACM SAC 2016, pp. 1538–1541, https://doi.org/10.1145/2851613.2851968
  - DUM works on bytecode and traverses a call graph. It was validated on four open-source systems and "outperforms" JTombstone and Google CodePro AnalytiX.
  - Romano et al. (TSE) say this paper found 5%–10% dead methods in Java desktop apps. That number isn't in the SAC abstract.
- **Romano, Vendome, Scanniello and Poshyvanyk, "Are unreachable methods harmful? Results from a controlled experiment,"** ICPC 2016, pp. 1–10, https://doi.org/10.1109/ICPC.2016.7503723
  - This is the baseline experiment (UniBas1, 47 undergraduates) later folded into 3.1.
  - "code comprehensibility is significantly higher when source code does not contain unreachable methods." There was no significant difference for modifiability.
- **Romano and Scanniello, "Exploring the use of rapid type analysis for detecting the dead method smell in Java code,"** SEAA 2018, https://doi.org/10.1109/SEAA.2018.00035. The tool is DCF (Dead Code Finder), which uses RTA call graphs.

### 3.3 The later mining studies: how long dead code lives. VERIFIED (metadata + abstract; full text blocked)

- **Caivano, Cassieri, Romano and Scanniello, "On the spread and evolution of dead methods in Java desktop applications: an exploratory study,"** _Empirical Software Engineering_ 28(3), article 64, April 2023, https://doi.org/10.1007/s10664-023-10303-0 (open access). It extends the ESEM 2021 paper (https://doi.org/10.1145/3475716.3475773), which covered 13 apps.
  - **Method:** commit histories of 23 open-source Java desktop apps, 1,587 commits.
  - **Findings (abstract):**
    - Dead methods "generally survive for a long time before being 'buried' or 'revived.'"
    - "dead methods are rarely revived."
    - "most dead methods are stillborn, rather than becoming dead later."
    - The conclusion: dead code "is harmful, widespread, rarely revived, and survives for a long time."
  - **Caveat:** Springer's PDF redirected to a login wall, so I don't have the per-category percentages. Cite the qualitative findings only.
- **Cassieri, Romano, Scanniello, Tortora and Caivano, "Do Developers Modify Dead Methods during the Maintenance of Java Desktop Applications?,"** EASE 2022, pp. 120–129, https://doi.org/10.1145/3530019.3530032
  - Over 13 apps: "developers modify dead methods," and some of that time goes on dead methods "that are removed in subsequent commits."
- **Romano, Toriello, Cassieri, Francese and Scanniello, "A Folklore Confirmation on the Removal of Dead Code,"** EASE 2024, pp. 333–338, https://doi.org/10.1145/3661167.3661188
  - The 23 apps were each compared with dead methods and with them removed.
  - "the internal structure of source code significantly improves." Compile time and executable size "significantly" diminish.
  - The abstract gives no magnitudes.

### 3.4 Eder, Junker, Jürgens, Hauptmann, Vaas and Prommer, "How much does unused code matter for maintenance?" (ICSE 2012). VERIFIED (full PDF)

- **Citation:** Sebastian Eder, Maximilian Junker, Elmar Jürgens, Benedikt Hauptmann (TU München), Rudolf Vaas, Karl-Heinz Prommer (Munich Re). _ICSE 2012_ (Software Engineering in Practice track), pp. 1102–1111.
- **Links:** https://doi.org/10.1109/ICSE.2012.6227109, PDF https://wwwbroy.in.tum.de/publ/papers/ICSE12Hauptmann.pdf
- **System:**
  - A Munich Re business information system for damage prediction: C#/.NET, 8 years old, 360 kLOC at the start, about 150 expert users in over 10 countries.
  - Usage was profiled in production (each method's first execution per day) across 19 program versions over about two years (Nov 2008 to Feb 2011).
- **Numbers:**
  - 25,390 method genealogies (a method tracked across versions); 6,028 were modified, with 9,987 modifications in total.
  - **RQ1:** "25% of all method genealogies were never used during the complete period." The share is roughly stable across versions.
  - **RQ2:** 40.7% of used genealogies were maintained versus 8.3% of unused ones. Unused code got **7.6% of all modifications**.
  - **RQ3:** Developers reviewed 27 sampled cases. In 9 (33%) the unused code "was indeed unnecessary," and 4 more (15%) were already deleted or moved. That makes **48% of modifications to unused code unnecessary**, about **3.6% of all maintenance**.
  - The analysis narrowed 6,369 unused genealogies down to 529 that were both unused and maintained.
- **Bugs found:** "several bugs have been detected which are directly related with unused code." For example, a validation method that was never called let "inconsistent data" into the database.
- **Causes of maintaining unused code, per developers:** exception handling, interfaces that had to be implemented, code for future use, and code for testing.
- **Context from the intro:** It cites Johnson (45% of features "never used") and the authors' own study (28% of features never used). Treat these as the paper's citations, not its findings.
- **Caveats:**
  - One system, with experienced long-tenure developers. The authors expect more waste where developers change more often.
  - "Unused" here means unexecuted in production, which includes error handlers. This is a different notion from what a linter calls unused.
- **Note:** CQSE GmbH, which sells the Teamscale analyzer, was spun out of this TUM group. This paper predates that and is peer-reviewed.

### 3.5 Haas, Niedermayr, Roehm and Apel, "Is Static Analysis Able to Identify Unnecessary Source Code?" (ACM TOSEM 2020). VERIFIED (full author PDF). Authors affiliated with a vendor

- **Citation:** Roman Haas, Rainer Niedermayr, Tobias Roehm (CQSE GmbH), Sven Apel (Saarland University). _ACM TOSEM_ 29(1), 2020. https://doi.org/10.1145/3368267
- **Method:** 14 open-source and closed-source systems. Recommendations were based on code stability and centrality. They were checked against historical cleanups (10 systems), production usage data (3 systems) and 25 developers' reviews (5 systems).
- **Findings:**
  - "Developers confirmed that 34% of recommendations were indeed unnecessary," and deleted 20% of them shortly after the interviews.
  - Of the code confirmed unnecessary, 29% "was still reachable," and only 32% had "been spotted by a dead code detector."
  - Against historical cleanups, precision was low (an average of 2.7% for predicting deletions).
- **For the post:** a clean statement of the gap. Much unnecessary code is perfectly reachable, so no reachability analysis, lint or otherwise, will find it.

### 3.6 Boomsma, Hostnet B.V. and Gross, "Dead code elimination for web systems written in PHP: lessons learned from an industry case" (ICSM 2012). VERIFIED (metadata + abstract; the thesis behind it VERIFIED in full)

- **Paper:** Hidde Boomsma, Hans-Gerhard Gross (TU Delft), with Hostnet B.V. _ICSM 2012_, pp. 511–515. https://doi.org/10.1109/ICSM.2012.6405314
  - Abstract: PHP's "inherent dynamic features render traditional static dead code identification approaches useless." It proposes dynamic (usage-based) identification and removal.
- **Thesis (full text):** Hidde Boomsma, "Dead code elimination for web applications written in dynamic languages," MSc thesis, TU Delft / Hostnet, 2012. https://repository.tudelft.nl/file/File_126bb66f-c783-4d18-a891-6f4981fef4e3
  - It logs every PHP file used per request to a central database, then shows unused files in an Eclipse plug-in and a treemap.
  - On Aurora, Hostnet's most used application: "managed to remove more then 28% (2740 files) of the files" (sic) in "just a day work."
  - Wrongly removed files show up as HTTP 500 errors, which are emailed to developers. They are then restored from version control.
- **Note:** Romano et al. and Malavolta et al. both round this to "about 30%." The thesis says "more than 28%." Use 2,740 files.
- **Note:** "B. V. Hostnet" appears as an author in Crossref and Semantic Scholar. That is a metadata error: Hostnet B.V. is the company.

### 3.7 JavaScript: Lacuna. Obbink, Malavolta, Scoccia and Lago (SANER 2018). VERIFIED (metadata + abstract); results via the TSE follow-up

- **Citation:** Niels Groot Obbink, Ivano Malavolta, Gian Luca Scoccia, Patricia Lago. _SANER 2018_, Campobasso. https://doi.org/10.1109/SANER.2018.8330226
  - VU Amsterdam's portal gives pp. 402–412. Crossref says "291-401," which looks wrong.
- **Abstract:** JavaScript reuse brings "the risk of bringing dead code," code "never executed, but still downloaded from the network and parsed." Lacuna combines existing static and dynamic call-graph analyses. It was evaluated on **29 web apps with 15,946 functions**.
- **Original accuracy, as reported in the TSE follow-up (Table 1):**

| Lacuna instance  | Precision | Recall | F-score |
| ---------------- | --------- | ------ | ------- |
| Static           | 56%       | 49%    | 49%     |
| Dynamic          | 57%       | 77%    | 64%     |
| Static + Dynamic | 63%       | 40%    | 47%     |

- **Caveat:** The VU PDF returned 403, so the numbers above come from the 2023 paper's summary.

### 3.8 Malavolta, Nirghin, Scoccia, Romano, Lombardi, Scanniello and Lago, "JavaScript Dead Code Identification, Elimination, and Empirical Assessment" (IEEE TSE 2023). VERIFIED (full arXiv PDF)

- **Citation:** _IEEE Transactions on Software Engineering_ 49(7), pp. 3692–3714, July 2023. https://doi.org/10.1109/TSE.2023.3267848, arXiv https://arxiv.org/abs/2308.16729
- **Premise:** Third-party libraries bring "code implementing unused functionalities," which still costs download and parse time.
- **Tool accuracy:**
  - The rewritten Lacuna was tested as 127 analyzer combinations on 39 TodoMVC apps. The best was Dynamic + TAJS: precision 82.5%, recall 97.2%, F-score 87.9%.
  - A more precise combination reached 88.1% precision but only 54.3% recall.
  - Lacuna offers four optimization levels. OL-1 lazily loads removed function bodies from a server, which is the safe mode for when precision matters.
- **Experiment:**
  - 30 mobile web apps: 15 TodoMVC apps "in the lab" and 15 real sites "in the wild" (apache.org, aws.amazon.com, m.youtube.com, booking.com, paypal.com and others).
  - Each was run on an Android phone at four optimization levels.
  - Dead functions detected per app ranged from 6 to 3,357; for example, m.youtube.com had 1,812 and booking.com 1,390 (Table 3).
- **Results:**
  - **Energy:** "slightly more energy-efficient," but "not statistically significant."
  - **Page load time:** significantly lower, especially at the most aggressive level (p = 4.7×10⁻⁹ in the lab, p = 0.039 in the wild), but the effect size is **small**. First paint and first contentful paint showed no noticeable improvement.
  - **Transferred bytes:** significantly lower (small effect in the lab, medium in the wild). Byte savings correlate with the number of dead functions (ρ 0.456–0.603).
  - CPU and memory were lower only for in-the-wild apps.
- **For the post:** the honest summary is that removing JavaScript dead code reliably saves bytes, while load-time gains are real but small. Note that this is bundle-level unused library code, not what `no-unused-vars` flags.

### 3.9 Other JavaScript dead-code and debloating studies. VERIFIED (as marked)

- **Muzeel.** Kupoluyi, Chaqfeh, Varvello, Coke, Hashmi, Subramanian, Zaki. arXiv 2106.08948 (June 2021); published at _IMC 2022_, pp. 335–348, https://doi.org/10.1145/3517745.3561427. VERIFIED (arXiv full text).
  - In about 40,000 web pages, "70% of JavaScript functions on the median page are unused." Removing them would cut "page size by 60%."
  - Muzeel emulates user interactions to find live event handlers. Page loads were about 30% faster on low-end phones and 25% faster on high-end phones, over 3G.
  - **Caveat:** "unused" means not triggered by any emulated event. The IMC version may report different numbers from the preprint.
- **Vázquez, Bergel, Vidal, Díaz Pace and Marcos, "Slimming JavaScript applications: An approach for removing unused functions from JavaScript libraries,"** _Information and Software Technology_ 107:18–29, 2019, https://doi.org/10.1016/j.infsof.2018.10.009. VERIFIED (metadata + abstract).
  - It defines "Unused Foreign Functions" (UFFs) in bundled dependencies. On 22 apps, removing them cut bundle size by 26% on average and up to 66%. The tool is UFFRemover.
- **Turcotte, Arteca, Mishra, Alimadadi and Tip, "Stubbifier: debloating dynamic server-side JavaScript applications,"** _Empirical Software Engineering_ 27, article 161, 2022, https://doi.org/10.1007/s10664-022-10195-6, arXiv 2110.14162. VERIFIED (abstract).
  - On 15 Node.js apps and 75 of their clients: "reduced application size by 56% on average." Bundled distributions shrank by 37% on average.
  - Guarded execution stopped several known injection vulnerabilities in stubbed-out code. Dead code is attack surface.
- **Pandey, Sharkovski, Varvello and Zaki, "In-the-Wild JavaScript Dead-Code Elimination via HTTP Range Requests,"** _IMC 2026_, pp. 433–441, https://doi.org/10.1145/3777912.3839817. VERIFIED (metadata + abstract).
  - On 5,000 pages analysed with Lighthouse, fetching only essential code could cut JavaScript transfer by about 20%.
  - Their client-side prototype, ThorJS, saved a median of 4 MB of JavaScript per page on 100 pages.

### 3.10 How much shipped JavaScript goes unused: HTTP Archive Web Almanac and Lighthouse. VERIFIED

- **Web Almanac 2022, JavaScript chapter** (Jeremy Wagner; published 26 Sep 2022), https://almanac.httparchive.org/en/2022/javascript
  - "According to Lighthouse, the median mobile page loads 162 KB of unused JavaScript." The 90th percentile is 604 KB, up from 155 KB and 598 KB the year before.
  - At the median, unused JavaScript is "35% of all loaded scripts."
  - Its own caveat: scripts may be "triggered by interactions later on in the page lifecycle."
- **Web Almanac 2024, JavaScript chapter** (Abdul Haddi Amjad and Nishu Goel; published 3 Mar 2025), https://almanac.httparchive.org/en/2024/javascript
  - "approximately half the bytes downloaded being unused during page load." On mobile the median is "206 kilobytes—or 44% of bytes delivered."
  - The desktop median is 235 KB, and the mobile 90th percentile is 818 KB.
- **Lighthouse audit "Reduce unused JavaScript"** (Chrome for Developers, last updated 7 Jul 2020), https://developer.chrome.com/docs/lighthouse/performance/unused-javascript
  - It flags "every JavaScript file with more than 20 kibibytes of unused code," and points to DevTools Coverage, Puppeteer's Coverage class, code splitting and bundler dead-code elimination.
- **Caveat for the post:** "unused at page load" is a coverage measurement, not dead code. Much of it is lazily needed. This is the tree-shaking and code-splitting problem, not what `no-unused-vars` fixes.

### 3.11 Bloated dependencies. VERIFIED (as marked)

- **Soto-Valero, Harrand, Monperrus and Baudry, "A comprehensive study of bloated dependencies in the Maven ecosystem,"** _Empirical Software Engineering_ 26, article 45, 2021, https://doi.org/10.1007/s10664-020-09914-8, arXiv https://arxiv.org/abs/2001.07808. VERIFIED (full arXiv PDF).
  - **Method:** the tool DepClean, run on 9,639 Maven Central artifacts with 723,444 dependency relationships.
  - **Headline:** "75.1% of the analyzed dependency relationships are bloated."
  - **Breakdown:** almost all of the bloat is transitive. Bloated-direct relationships are 19,673 (**2.7%**), bloated-inherited 111,649 (15.4%) and bloated-transitive 412,288 (57%).
  - 36% of artifacts have at least one bloated-direct dependency; 86.2% have at least one bloated-transitive one.
  - 18 of 21 answered pull requests were merged, removing 131 dependencies.
  - **Caveat:** Don't say "75% of declared dependencies are unused." The text also describes the 2.7% loosely as a share "of the dependencies declared in the POM," but it is a share of all relationships.
- **npm: Jafari, Costa, Abdalkareem, Shihab and Tsantalis, "Dependency Smells in JavaScript Projects,"** _IEEE TSE_ 48(10):3790–3807, 2022, https://doi.org/10.1109/TSE.2021.3106247, arXiv https://arxiv.org/abs/2010.14573. VERIFIED (full arXiv PDF).
  - 1,146 active JavaScript repositories, checked with `depcheck`.
  - "Unused dependency" (S6) appears in **915 projects (79.8%)**, the most common of seven smells. "Missing dependency" (S7) appears in 729 (63.6%).
  - The text: "Unused and missing dependencies are surprisingly common."
  - **Caveat:** depcheck has known false positives for unused dependencies. The authors checked five projects by hand and found it accurate there.
- **Latendresse, Mujahid, Costa and Shihab, "Not All Dependencies are Equal: An Empirical Study on Production Dependencies in NPM,"** _ASE 2022_, https://doi.org/10.1145/3551349.3556896, arXiv https://arxiv.org/abs/2207.14711. VERIFIED (metadata + abstract).
  - Across 100 projects, "less than 1% of the installed dependencies are released to production."
  - 59% of declared runtime dependencies are not used in production, while 28.2% of dev dependencies are.
  - Most security alerts target dependencies not used in production.
- **Liu, Tiwari, Bogdan and Baudry, "Detecting and removing bloated dependencies in CommonJS packages,"** _Journal of Systems and Software_ 230, article 112509, 2025, https://doi.org/10.1016/j.jss.2025.112509, arXiv https://arxiv.org/abs/2405.17939. VERIFIED (abstract).
  - 91 CommonJS packages with 50,488 dependencies: 50.6% bloated overall, 13.8% of direct dependencies and 51.3% of indirect ones.
  - This is the npm analogue of DepClean and the strongest npm "unused direct dependency" number I found.

### 3.12 Dead code removal at industrial scale. VERIFIED (as marked)

**Meta, SCARF**

- **Blog:** Will Shackleton, Andy Pincombe, Katriel Cohn-Gordon, "Automating dead code cleanup," Engineering at Meta, **24 Oct 2023**, https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/. VERIFIED (page text).
  - "five years on," it has "deleted more than 100 million lines of code in over 370,000 change requests."
  - It analyzes "hundreds of millions of lines of code."
  - **Method:** dead code is found "through a combination of static, runtime, and application analysis." That means a Glean dependency graph, augmented with runtime logs (endpoint usage) and domain-specific dynamic usage.
  - Moving from per-symbol to whole-graph analysis (which also catches cycles) gave "a nearly 50% increase in dead code removed."
  - A text-search fallback over string references "can cause false negatives, but avoids false positives."
  - In some languages, change requests are merged "without human intervention."
  - Languages: Java, Objective-C, JavaScript, Hack and Python.
- **Paper:** Shackleton, Cohn-Gordon, Rigby, Abreu, Gill, Nagappan, Nakad, Papagiannis, Petre, Megreli, Riggs, Saindon, "Dead Code Removal at Meta: Automatically Deleting Millions of Lines of Code and Petabytes of Deprecated Data," _ESEC/FSE 2023_ Industry track, pp. 1705–1715, https://doi.org/10.1145/3611643.3613871. VERIFIED (metadata + abstract).
  - "In the last year alone," it removed "petabytes of data across 12.8 million distinct assets" and "deleted over 104 million lines of code."
  - The abstract also says: "we have found little evidence of code deprecation or dead-code removal at industrial scale" in prior research.
- **Caveat:** the blog's "more than 100 million … five years on" and the paper's "over 104 million … in the last year alone" don't match. Quote one source and attribute it. The blog figure, with the 370,000 change requests, is the safer cumulative number.

**Google, Sensenmann**

- **Source:** Phil Norman, "Sensenmann: Code Deletion at Scale," Google Testing Blog, **28 Apr 2023**, https://testing.googleblog.com/2023/04/sensenmann-code-deletion-at-scale.html. VERIFIED (page text).
- **Numbers:** It "submits over 1000 deletion changelists per week," and "has so far deleted nearly 5% of all C++ at Google."
  - The name is "the German word for the embodiment of Death." It began at the Zürich Engineering Productivity team's hackathon.
- **Method:** Blaze (internal Bazel) dependency graphs plus logs of which internal binaries actually run.
  - Libraries no live binary depends on are proposed for deletion. Each library and its test are made a strongly connected component, using Tarjan's algorithm, so tests don't keep dead libraries alive.
  - A blocklist covers exceptions such as examples and binaries with no log signal.
- **Social side:** "not everyone is happy to receive automated changelists trying to delete code they wrote." Feedback "is more frequently negative than positive."
- **Payoff:** "automatic code deletion has paid for itself tens of times over, in saved maintenance costs." This is an internal estimate with no method given.
- **For the post:** Sensenmann works on **build targets** (libraries and binaries), and SCARF on whole-program graphs plus runtime data. Neither is a single-file analysis, which is exactly the kind of dead code a linter cannot see.

---

## 4. Research on duplication

### 4.1 Baker, "On Finding Duplication and Near-Duplication in Large Software Systems" (WCRE 1995). VERIFIED (full PDF)

- **Citation:** Brenda S. Baker (AT&T Bell Laboratories). _Proceedings of the 2nd Working Conference on Reverse Engineering (WCRE '95)_, pp. 86–95.
- **Links:** https://doi.org/10.1109/WCRE.1995.514697, PDF (course mirror) https://www.cs.ucdavis.edu/~devanbu/teaching/289/Schedule_files/baker-wcre95.pdf
- **The tool:** `dup` finds "maximal" sections over a length threshold that are either exact matches or **parameterized matches** (p-matches): code that is the same except for a consistent renaming of variables and constants, e.g. "all occurrences of x changed to y." It is text- and line-based, ignores comments and white space, and uses a parameterized suffix tree. It processed "a million lines of code in seven minutes" on a 40 MHz R3000.
- **Numbers:**
  - **X Window System**, 714,479 lines: 2,487 matches of at least 30 lines "involved 19% of the code." `dup` estimated 12% of the input "was duplication that could be eliminated by rewriting." The matches fell into 976 groups, each "apparently" one act of copying and editing.
  - **A 1.1M-line subsystem** of a 10-million-line production system: 5,550 p-matches of 30+ lines covered 20% of the code; 13% was estimated removable. 2,180 groups.
- **The inconsistent-fix anecdote is already here:** among anomalies found, "a place where a bug fix was apparently applied to one copy" but not the other. Also two 40-line date-calculation procedures "identical except that one used shorter identifiers."
- **Why people copy (Baker's list):** copying is "less likely to introduce new bugs immediately"; versions drift apart; process incentives reward new lines; and avoiding procedure-call overhead.
- **Use in the post:** the origin of "parameterized" (Type-2) clone detection and the first measured duplication rate in a large system. Also shows the inconsistent-copy bug was observed from day one.
- **Not checked:** Baker's earlier "A Program for Identifying Duplicated Code" (Computing Science and Statistics, 1992). Only found on academia.edu; not opened.

### 4.2 Kamiya, Kusumoto and Inoue, "CCFinder" (IEEE TSE 2002). VERIFIED (metadata + abstract)

- **Citation:** Toshihiro Kamiya, Shinji Kusumoto, Katsuro Inoue. "CCFinder: A Multilinguistic Token-Based Code Clone Detection System for Large Scale Source Code." _IEEE Transactions on Software Engineering_ 28(7), July 2002, pp. 654–670.
- **Link:** https://doi.org/10.1109/TSE.2002.1019480
- **What it does (abstract):** "a new clone detection technique": a "transformation of input source text and a token-by-token comparison." Supports C, C++, Java, COBOL and others. Case studies on JDK, FreeBSD, NetBSD, Linux "and many other systems."
- **Caveat:** The full text was not reachable (the Osaka repository copy is a scanned first page). I have no per-system clone percentages from the paper itself. CP-Miner (4.9) reports that Kapser and Godfrey used CCFinder to find 12% of the Linux file-system code (279K lines) involved in cloning; that is a second-hand figure.
- **Use:** CCFinder is the canonical token-based detector, and the approach most "copy-paste detectors" (jscpd, PMD CPD) still resemble. Cite it as the token-normalisation milestone, not for numbers.

### 4.3 Clone types: Bellon et al. (TSE 2007), Roy & Cordy (2007), Roy, Cordy & Koschke (SCP 2009). VERIFIED

**Roy & Cordy, "A Survey on Software Clone Detection Research," Queen's University Technical Report 2007-541, 26 Sep 2007.** VERIFIED (full PDF)

- **Link:** https://research.cs.queensu.ca/TechReports/Reports/2007-541.pdf
- **Type definitions (section 7.2), quoted in part:**
  - Type I: "Identical code fragments except for variations in whitespace" (and layout) "and comments."
  - Type II: "Structurally/syntactically identical fragments," varying only in "identifiers, literals, types, layout and comments."
  - Type III: "Copied fragments with further modifications." "Statements can be changed, added or removed" as well.
  - Type IV: fragments "that perform the same computation" via "different syntactic variants."
- **Prevalence claim (abstract):** "about 5% to 20% of a software systems can contain duplicated code." In the body, the range is a roll-up of others' numbers: Baker "13% - 20%"; Lague et al. 6.4–7.5% (function clones); Baxter et al. 12.7%; Mayrand et al. "5% – 20%"; Kapser and Godfrey 10–15%; and "about 50%" for one object-oriented COBOL system (Ducasse et al.).
- **Also summarises Krinke (WCRE 2007):** "roughly half of the changes to the clone groups are inconsistent changes." And the survey's conclusion: "'Cloning is harmful' is still an open issue."

**Roy, Cordy & Koschke, "Comparison and evaluation of code clone detection techniques and tools: A qualitative approach," _Science of Computer Programming_ 74(7), 2009, pp. 470–495.** VERIFIED (author preprint PDF)

- **Links:** https://doi.org/10.1016/j.scico.2009.02.007, preprint https://www.cs.usask.ca/~croy/papers/2009/RCK_SCP_Clones.pdf
- **Type-1 to Type-4**, with Type-1 now "Identical code fragments except for variations in whitespace, layout and comments." Type-4: same computation, "implemented by different syntactic variants." The textual types 1–3 are credited to Bellon et al. [18]; Type-4 to others.
- **Prevalence claim changes:** this paper says "between 7% and 23%" of a typical system "has been cloned," citing Baker 1995 and Roy & Cordy WCRE 2008. Note the different range from the 2007 report by the same authors.
- **Contribution:** a scenario-based taxonomy of editing operations that produce each clone type, and a qualitative rating of detectors against them.

**Bellon, Koschke, Antoniol, Krinke, Merlo, "Comparison and Evaluation of Clone Detection Tools," _IEEE TSE_ 33(9), 2007, pp. 577–591.** VERIFIED (metadata + abstract)

- **Link:** https://doi.org/10.1109/TSE.2007.70725
- Six detectors run on eight C and Java programs, "almost 850 KLOC," with candidates judged by an independent author. It is where Types 1–3 were fixed as shared terminology (per Roy et al. 2009). The full PDF was opened for section 6.6, which has its precision and recall numbers.

### 4.4 Juergens, Deissenboeck, Hummel and Wagner, "Do Code Clones Matter?" (ICSE 2009). VERIFIED (full arXiv PDF)

- **Citation:** Elmar Juergens, Florian Deissenboeck, Benjamin Hummel, Stefan Wagner (TU München). _ICSE 2009_, pp. 485–495.
- **Links:** https://doi.org/10.1109/ICSE.2009.5070547, arXiv https://arxiv.org/abs/1701.05472
- **Systems:** five production systems. Three C# systems at Munich Re (317, 454, 495 kLOC), one 17-year-old COBOL system at LV 1871 (197 kLOC), and the open-source Java system Sysiphus (281 kLOC).
- **Method:** a suffix-tree detector for inconsistent (Type-3) clones. Researchers rated ~900 clone groups for false positives, then developers of each system rated "each of the over 700 inconsistent clone groups" as intentional or not, and faulty or not. Unclear cases were counted as intentional and non-faulty, so the fault numbers are a lower bound.
- **Results (Table 2):**

| Measure | A | B | C | D (COBOL) | Sysiphus | Sum / mean |
| --- | --- | --- | --- | --- | --- | --- |
| Clone groups | 286 | 160 | 326 | 352 | 303 | 1,427 |
| Inconsistent groups | 159 | 89 | 179 | 151 | 146 | 724 |
| Unintentionally inconsistent | 51 | 29 | 66 | 15 | 42 | 203 |
| Faulty | 19 | 18 | 42 | 5 | 23 | **107** |
| Inconsistent / all | 0.56 | 0.56 | 0.55 | 0.43 | 0.48 | mean 0.52 |
| Unintentional / inconsistent | 0.32 | 0.33 | 0.37 | 0.10 | 0.29 | mean 0.28 |
| Faulty / inconsistent | 0.12 | 0.20 | 0.23 | 0.03 | 0.16 | mean 0.15 |
| Faulty / unintentional | 0.37 | 0.62 | 0.64 | 0.33 | 0.55 | mean 0.50 |

- **Key sentences:**
  - "About half of the clones (52%) contain inconsistencies."
  - "over a quarter (28%) has been introduced unintentionally."
  - "at least 3-23% of the inconsistencies actually presented a fault."
  - "about every second to third unintentional change to a clone leads to a fault."
  - The 107 faults were "confirmed by the systems' developers."
- **Severity:** of the 107, 17 could cause a crash or data loss, 44 were user-visible misbehaviour and 46 were not visible to users.
- **Fault density in the inconsistencies:** 3.4–91.4 faults per kLOC (mean 48.1), against a "typical" 0.1–50 cited from the literature. The authors admit the comparison is weak because the systems' real fault densities were unknown.
- **Motivating example (Fig. 1):** "a missing null-check was retrofitted in only one clone instance."
- **Why COBOL was lower:** its maintainers search for duplicates as "an integral part of their maintenance process." Clone awareness matters.

### 4.5 Wagner, Abdulkhaleq, Kaya and Paar, "On the Relationship of Inconsistent Software Clones and Faults" (SANER 2016). VERIFIED (full arXiv PDF)

- **Links:** https://doi.org/10.1109/SANER.2016.94, arXiv https://arxiv.org/abs/1611.08005
- **What it is:** an industrial replication of Juergens et al. at TWT GmbH: three Java systems, clones linked to issue trackers and version control, plus interviews with three developers.
- **Results (abstract):** "Of the type-3 clones, 17 % contain faults." Developers modified most type-3 clones together "and thereby fixed half of the faults" consistently. "Clone length is only weakly correlated with faultiness."
- **Use:** an independent number in the same range as Juergens's 15% mean, with the same moral: awareness of the copies is what keeps them safe.

### 4.6 Kapser and Godfrey, "'Cloning Considered Harmful' Considered Harmful: Patterns of Cloning in Software" (EMSE 2008). VERIFIED (full PDF)

- **Citation:** Cory J. Kapser, Michael W. Godfrey. _Empirical Software Engineering_ 13(6), 2008, pp. 645–692.
- **Links:** https://doi.org/10.1007/s10664-008-9076-6, PDF https://cormack.uwaterloo.ca/~migod/papers/2008/emse08-ClonePatterns.pdf
- **Thesis:** cloning "is often used in a variety of ways as a principled engineering tool." "a manager should try to understand the reason behind the duplication" before refactoring.
- **Eleven patterns in four groups:**
  - **Forking:** hardware variation, platform variation, experimental variation.
  - **Templating:** boiler-plating due to language inexpressiveness, API/library protocols, general language or algorithmic idioms, parameterized code.
  - **Customization:** bug workarounds, replicate and specialize.
  - **Exact matches:** cross-cutting concerns, verbatim snippets.
- **The case study:** Apache httpd 2.2.4 (312,460 LOC) and Gnumeric 1.6.3 (326,895 LOC), with clones rated good, incidental, harmless or harmful. Two samples per system, at minimum clone lengths of 30 and 60 tokens.
  - Apache, 30 tokens: "71% of the 59 true positive RGCs were considered good," and "only 14%" harmful.
  - Apache, 60 tokens: 42% good, 39% harmful.
  - Gnumeric, 30 tokens: 33% good; "57% of the RGCs sampled were considered harmful."
  - Gnumeric, 60 tokens: 57% good, 42% harmful.
- **Caveat:** the abstract's "as many as 71%" is the best of four samples. Across samples, 33% to 71% were rated good, and harmful ran from 14% to 57%. The ratings are the authors' own judgement. They also say good clones "were not considered to be free of maintenance risk."

### 4.7 Kim, Sazawal, Notkin and Murphy, "An Empirical Study of Code Clone Genealogies" (ESEC/FSE 2005). VERIFIED (full tech report PDF; FSE metadata + abstract)

- **Citation:** Miryung Kim, Vibha Sazawal, David Notkin, Gail C. Murphy. _ESEC/FSE 2005_, pp. 187–196.
- **Links:** https://doi.org/10.1145/1081706.1081737, tech report UW-CSE-05-04-01 https://dada.cs.washington.edu/research/tr/2005/04/UW-CSE-05-04-01.pdf
- **Method:** a clone genealogy extractor over CVS history (CCFinder underneath) for two Java projects, carol (164 versions) and dnsjava (248 versions). Clone coverage was 6–15% in carol and 5–8% in dnsjava.
- **Findings (tech report numbers):**
  - 27% to 38% of clone genealogies "have changed consistently with other elements in the same group," the classic maintenance burden.
  - 64% to 69% of genealogies consist of clones that "cannot be easily removed using standard refactoring techniques."
  - Many clones are volatile: of genealogies that disappeared, "54% to 72% disappeared within an average of eight check-ins."
- **Thesis (FSE abstract):** "refactoring may not always improve software with respect to clones," because many clones are short-lived and long-lived ones are often "not easily refactorable due to programming language limitations."
- **Caveat:** The tech report says it "extends and expands upon" the MSR 2005 workshop paper. I could not open the FSE PDF, so the percentages are from the tech report. Check them against the ACM version before quoting.

### 4.8 Rahman, Bird and Devanbu, "Clones: What Is That Smell?" (MSR 2010; EMSE 2012). VERIFIED (both full PDFs)

- **Citations:** Foyzur Rahman, Christian Bird, Premkumar Devanbu. _MSR 2010_ (MSR best paper), https://doi.org/10.1109/MSR.2010.5463343, PDF https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/rahman2010cws.pdf. Extended in _Empirical Software Engineering_ 17(4–5), 2012, pp. 503–530 (online 24 Dec 2011), https://doi.org/10.1007/s10664-011-9195-3
- **Data:** monthly snapshots of four C projects: Apache httpd, Nautilus, Evolution and Gimp. Clones found with Deckard (min 50 tokens) under "conservative" and "liberal" settings. Bugs come from fix commits.
- **Findings (EMSE abstract):**
  - "the great majority of bugs are not significantly associated with clones."
  - "clones may be less defect prone than non-cloned code."
  - "little evidence that clones with more copies are actually more error prone."
  - Little evidence that clone groups spanning files or directories are more defect-prone than collocated ones.
  - Fixing clone-dense bugs takes no disproportionate effort.
- **Numbers (MSR 2010):** "besides Gimp, 80% or more bugs" in the other projects "contain no cloned code at all." For Gimp, "about 85% of bugs have lower clone ratio than overall project clone ratio."
- **Their closing line:** "Perhaps we can clone, and breathe easily, at the same time."
- **Caveat:** the projects are all C, the unit is "lines touched by a bug fix," and Deckard finds syntactic clones only. The study can't see bugs caused by a fix that _should have_ touched a clone but didn't, which is Juergens's mechanism.

### 4.9 Copy-paste bugs: CP-Miner (OSDI 2004; TSE 2006), Chou et al. (SOSP 2001), Jiang et al. (FSE 2007). VERIFIED

**Li, Lu, Myagmar and Zhou, "CP-Miner: A Tool for Finding Copy-paste and Related Bugs in Operating System Code," OSDI 2004.** VERIFIED (full PDF)

- **Links:** https://www.usenix.org/conference/osdi-04/cp-miner-tool-finding-copy-paste-and-related-bugs-operating-system-code, PDF https://static.usenix.org/event/osdi04/tech/full_papers/li_z/li_z.pdf
- **Scale:** "less than 20 minutes" to find 190,000 copy-pasted segments in Linux and 150,000 in FreeBSD. Copy-pasted code "makes up 17.7–22.3% of the code base." A manual check of 100 random pairs found 8 false positives.
- **The bug pattern, which is exactly what an agent's copy-edit does:** "programmers forget to modify identifiers (variables, functions, types, etc.) consistently throughout the pasted code." The flagship example is a Linux 2.6.6 loop copied with `prom_phys_total` renamed to `prom_prom_taken` everywhere but one line. It was confirmed by kernel developers. They note it "cannot be easily detected by memory-related bug detection tools."
- **Counts:** 28 copy-paste bugs verified in Linux and 23 in FreeBSD, "Most of these bugs had never been reported before." At writing, five Linux bugs had been confirmed and fixed.
- **Journal version:** Li, Lu, Myagmar, Zhou, _IEEE TSE_ 32(3), 2006, pp. 176–192, https://doi.org/10.1109/TSE.2006.28. VERIFIED (metadata + abstract): 49 new bugs in Linux and 31 in FreeBSD, "most of which have since been confirmed."

**Chou, Yang, Chelf, Hallem and Engler, "An Empirical Study of Operating Systems Errors," SOSP 2001.** VERIFIED (full PDF)

- **Links:** https://doi.org/10.1145/502039.502042, PDF https://pdos.csail.mit.edu/archive/6.097/readings/osbugs.pdf
- In one `drivers/i2o` file, "34 of the errors were caused by cut-and-paste," with one "copied in 10 places and another in 24!"
- Clustering is heaviest "where programmer ignorance of interface or system rules combines with copy-and-paste."
- Their diagnosis: programmers "believe that 'working' code is correct code."

**Jiang, Su and Chiu, "Context-based Detection of Clone-related Bugs," ESEC/FSE 2007, pp. 55–64.** VERIFIED (metadata + abstract)

- **Link:** https://doi.org/10.1145/1287624.1287634
- Detects inconsistencies in the _context_ around clones (e.g. a check present around one copy but not another). Found "57 for the Linux kernel and 38 for Eclipse" previously unknown "bugs and programming style issues." Those counts combine bugs and style issues.

### 4.10 How often do clones change inconsistently, and does it matter? VERIFIED (metadata + abstract) unless noted

- **Krinke, "A Study of Consistent and Inconsistent Changes to Code Clones," WCRE 2007, pp. 170–178.** https://doi.org/10.1109/WCRE.2007.7. "usually half of the changes to code clone groups are inconsistent changes." Once a group diverges, it is "rarely the case" that later changes reconcile it.
- **Göde and Koschke, "Frequency and Risks of Changes to Clones," ICSE 2011, pp. 311–320.** https://doi.org/10.1145/1985793.1985836. "most clones are rarely changed," and unintentional inconsistent changes are "small" in number. They argue for choosing which clones to manage. Full text not opened, so no numbers.
- **Barbour, Khomh and Zou, "Late Propagation in Software Clones," ICSM 2011, pp. 273–282** (https://doi.org/10.1109/ICSM.2011.6080794), and **"An empirical study of faults in late propagation clone genealogies," _J. Softw. Evol. Process_ 25(11), 2013, pp. 1139–1165** (https://doi.org/10.1002/smr.1597). Late propagation means one clone changes, the pair diverges, and they are re-synchronised later. Results "verify that late propagation is more harmful." The riskiest case is a diverging change followed by a reconciling change that leaves the other clone untouched.
- **Mondal, Roy and Schneider, "Bug-proneness and late propagation tendency of code clones: A comparative study on different clone types," _JSS_ 144, 2018, pp. 41–59.** https://doi.org/10.1016/j.jss.2018.05.028. Over nine systems, "Type 3 clones exhibit the highest bug-proneness"; Type 1 the lowest. Contra Barbour, late propagation explains little: only 1.4% of bug-fixes in clones relate to it.
- **Islam, Mondal, Roy and Schneider, "A Comparative Study of Software Bugs in Clone and Non-Clone Code," SEKE 2017, pp. 436–443.** https://doi.org/10.18293/seke2017-056. Over seven systems: "clone code appears to be more bug-prone than non-clone code." This directly contradicts Rahman et al. (4.8).
- **Hordijk, Ponisio and Wieringa, "Harmfulness of Code Duplication – A Structured Review of the Evidence," EASE 2009.** https://doi.org/10.14236/ewic/ease2009.11. A structured review of evidence for and against duplication harming changeability. It frames the debate as causal links rather than a yes/no. Abstract only.
- **Framing for the post:** the field does not agree that cloned code is more defect-prone (Rahman: no; Islam: yes). It does agree on the narrower mechanism: copies that should change together but don't are where faults are (Juergens, Wagner, CP-Miner, Krinke).

### 4.11 Lopes et al., "DéjàVu: A Map of Code Duplicates on GitHub" (OOPSLA 2017). VERIFIED (full PDF)

- **Citation:** Cristina V. Lopes, Petr Maj, Pedro Martins, Vaibhav Saini, Di Yang, Jakub Zitny, Hitesh Sajnani, Jan Vitek. _Proc. ACM Program. Lang._ 1(OOPSLA), Article 84, Oct 2017.
- **Links:** https://doi.org/10.1145/3133908, PDF http://janvitek.org/pubs/oopsla17b.pdf
- **Corpus:** 4.5 million non-fork GitHub projects, over 428 million files, in Java, C++, Python and JavaScript. "a mere 85 million unique files." "70% of the code on GitHub consists of clones of previously created files."
- **JavaScript:** 261,676,091 files, of which 15,611,029 (6%) are distinct by file hash and 13,587,850 (5%) by token hash. "94% of files being file-hash clones of the other 6%." For comparison, 60% of Java files are distinct; C++ has 73% and Python 71% copies.
- **Near-miss clones (SourcererCC):** 46% of Java files are near-duplicates. The paper then also says "43% for Java, 39% for JavaScript, and 32% for Python." Those two Java numbers conflict; quote JavaScript's 39% with care.
- **Why JavaScript is so high: committed `node_modules`.** 41.21% of projects use npm, "but only 6% (106582) projects include their 'node_modules' directory." Those projects "are ultimately responsible for almost 70% of the entire files." The authors call committing npm libraries "the single biggest cause for the large duplication in JavaScript." In a sample of the most-duplicated JS files, 78 of 80 were Node packages. Excluding them, jQuery made up 43 of 80.
- **Caveat for the post:** this is whole-file duplication _across_ projects, mostly vendored dependencies. It says nothing about copy-paste _within_ a codebase, which is what `sonarjs/no-identical-functions` targets. Use it for "JavaScript copies whole files, mostly dependencies," not for "JS developers copy-paste functions."

### 4.12 JavaScript- and npm-specific clone studies

**Cheung, Ryu and Kim, "Development nature matters: An empirical study of code clones in JavaScript applications," _EMSE_ 21(2), 2016, pp. 517–564 (online 24 Mar 2015).** VERIFIED (metadata + abstract via the Springer page; full text 403)

- **Link:** https://doi.org/10.1007/s10664-015-9368-6
- Compares JavaScript web applications with standalone JavaScript projects. Web applications have about 95% inter-file clones and 91–97% "widely scattered" clones, unlike standalone projects. The authors conclude web developers often clone intentionally, so such clones "may not be as risky" as earlier studies claimed. Clones often carry browser- or device-specific code.
- **Caveat:** abstract-level only; I have no clone-coverage percentages.

**Wyss, De Carli and Davidson, "What the Fork? Finding Hidden Code Clones in npm," ICSE 2022.** VERIFIED (metadata + abstract, ICSE program page)

- **Link:** https://doi.org/10.1145/3510003.3510168
- "Shrinkwrapped clones" are npm packages that copy another package's code without referencing it. Their tool, Unwrapper, compares one package against all of npm (1,716,061 packages, 20,190,452 versions) in 72.85 s. It found up to 6,292 previously unknown shrinkwrapped clones. **Up to 207 carried vulnerabilities already fixed in the original**, and `npm audit` found none of them.
- **Use:** a JavaScript-ecosystem version of "the fix landed in one copy but not the other."

**Jahanshahi, Reid and Mockus, "Beyond Dependencies: The Role of Copy-Based Reuse in Open Source Software Development," _ACM TOSEM_ 34(8), 2025.** VERIFIED (metadata + abstract)

- **Links:** https://doi.org/10.1145/3715907, arXiv https://arxiv.org/abs/2409.04830
- Measures copy-based reuse across World of Code. "copy-based reuse is common." Reuse propensity varies by language and is "consistently decreasing over time." Developers were "generally positive about using a package manager."

**No TypeScript-specific clone study found.** A 2024 tool paper (TGMM, arXiv 2403.18202) reportedly found TypeScript had the highest clone indicators of nine languages, but I did not open it. Dropped.

### 4.13 Type-4 clones and the limits of syntactic detection. VERIFIED (metadata + abstract)

- **Wagner, Abdulkhaleq, Bogicevic, Ostberg and Ramadani, "How are functionally similar code clones syntactically different? An empirical study and a benchmark," _PeerJ Computer Science_ 2:e49, 2016.** https://doi.org/10.7717/peerj-cs.49
- They ran clone detectors on 2,800 coding-contest programs known to be functionally similar (Java and C). "We found no FSCs where complete files were syntactically similar." Partial syntactic similarity appeared "in <16% of the program pairs." Concolic detection found 1.
- Conclusion: most differences between functionally similar clones "are beyond the capabilities of current clone detection approaches."
- **Use:** independently written duplicates, which is what an agent produces when it rewrites a helper instead of finding it, are mostly invisible to syntactic detectors. A rule that only catches identical function bodies sees less still.

### 4.14 Copying from outside the codebase: Stack Overflow. VERIFIED (metadata + abstract)

- **Baltes and Diehl, "Usage and attribution of Stack Overflow code snippets in GitHub projects," _EMSE_ 24(3), 2019, pp. 1259–1295.** https://doi.org/10.1007/s10664-018-9650-5 (open access)
- Java only. "at most a quarter of the copied code snippets from SO are attributed as required." In the survey, "almost one half admitted copying code from SO without attribution."
- **Use:** a pre-LLM baseline for "code arrives by copy, not by reuse." It is about licensing, not defects.
- **Optional, not opened:** Gharehyazie, Ray, Filkov, "Some from Here, Some from There: Cross-Project Code Reuse in GitHub," MSR 2017 (https://doi.org/10.1109/MSR.2017.15). The abstract says cross-project cloning "is prevalent" and follows an "onion model": most clones come from the same project. Metadata + abstract only.

---

## 5. AI-written code, dead code and duplication

All primary documents below were opened on 2026-10-12. Vendor reports are labelled.

### 5.1 GitClear, "Coding on Copilot: 2023 Data Shows Downward Pressure on Code Quality" (Jan 2024). VERIFIED (full PDF); Vendor

- **Citation:** William Harding (Alloy.dev Research) and Matthew Kloster (GitClear CTO). Published 16 Jan 2024. Cover subtitle: "150m lines of analyzed code + projections for 2024."
- **Links:** GitClear's landing page is gated behind a form; full PDF mirrored at https://gwern.net/doc/ai/nn/transformer/gpt/codex/2024-harding.pdf. The cover title says "Shows"; some coverage says "Suggests."
- **Data:** 153 million "meaningful (not No-op)" changed lines authored Jan 2020 to Dec 2023. About two-thirds from opted-in private companies, one-third open source ("mostly those run by Google, Facebook, and Microsoft"). In 2023: 1,019,680 commits, 21,700 committers, 1,294 repos.
- **Definitions (the report's own):**
  - Copy/pasted: "Identical line contents, excluding programming language keywords," committed "to multiple files or functions within a commit."
  - Moved: a line cut and pasted to a new file or function, unchanged.
  - Churn: a line "reverted or substantially revised within the subsequent two weeks."
- **Operation shares by year (2024 report):**

| Year | Added | Deleted | Updated | Moved | Copy/pasted | Find/replaced | Churn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2020 | 39.2% | 19.5% | 5.2% | 25.0% | 8.3% | 2.9% | 3.3% |
| 2021 | 39.5% | 19.0% | 5.0% | 24.8% | 8.4% | 3.4% | 3.6% |
| 2022 | 41.0% | 20.2% | 5.2% | 20.5% | 9.4% | 3.7% | 4.0% |
| 2023 | 42.3% | 21.1% | 5.5% | 16.9% | 10.5% | 3.6% | 5.5% |
| 2024 (projected) | 43.6% | 22.1% | 5.8% | 13.4% | 11.6% | 3.6% | 7.1% |

- **Headline claims:** churn "projected to double in 2024 compared to its 2021, pre-AI baseline"; 2022→2023 moved −17.3%, copy/pasted +11.3%, churn +39.2%. 2023 code "more resembles an itinerant contributor, prone to violate the DRY-ness of the repos visited."
- **How AI is inferred, not observed:** the report assumes Copilot prevalence of 0% (2021), 5–10% (2022) and 30% (2023) and reports a Pearson correlation of 0.98 between that assumption and churn. No commit is labelled as AI-written.
- **The 2024 row is not data.** It was produced by asking OpenAI's "gpt-4-1106-preview Assistant to run a quadratic regression" using only the 2022 and 2023 values. The appendix's own CSV omits 2024 "since it is a projection."
- **Scope limit, in its own words:** "GitClear operations only include code that is duplicated within a single commit." Cross-commit copy-paste is not counted.

### 5.2 GitClear, "AI Copilot Code Quality: Evaluating 2024's Increased Defect Rate via Code Quality Metrics" (Feb 2025). VERIFIED (full PDF); Vendor

- **Citation:** William Harding, Alloy.dev Research. "Published February, 2025," version "v2025.2.5." Cover subtitle: "211m lines of analyzed code + projections for 2025."
- **Links:** landing page (gated) https://www.gitclear.com/ai_assistant_code_quality_2025_research. The full PDF is attached to Harding's own public Amplenote note (14 Feb 2025), https://public.amplenote.com/ZRbxXhi9FamWYbKEFaD9h7Qh (attachment "AI-Copilot-Code-Quality-2025.pdf").
- **Data:** 211 million changed lines, Jan 2020 to Dec 2024. Commercial customers plus open source repos (React, Chrome and "about 80 others"). The report says the raw counts "evolve by percentage points from year-to-year, as customers evolve," and the earlier years differ from the 2024 report's figures (for example 2023 moved 15.8% here vs 16.9% before; 2023 churn 4.5% vs 5.5%).
- **Operation shares (2025 report):**

| Year | Added | Deleted | Updated | Moved | Copy/pasted | Find/replaced | Churn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2020 | 39.2% | 19.1% | 5.2% | 24.1% | 8.3% | 2.9% | 3.1% |
| 2021 | 39.5% | 19.3% | 5.0% | 24.8% | 8.4% | 3.4% | 3.3% |
| 2022 | 40.9% | 19.8% | 5.2% | 20.5% | 9.4% | 3.7% | 3.3% |
| 2023 | 42.3% | 21.1% | 5.6% | 15.8% | 10.6% | 3.6% | 4.5% |
| 2024 projected | 43.6% | 22.1% | 5.8% | 13.4% | 11.6% | 3.6% | 7.1% |
| **2024 actual** | **46.2%** | 21.9% | 5.9% | **9.5%** | **12.3%** | 4.2% | **5.7%** |
| YoY | +9.2% | +3.8% | +7.2 | −39.9% | +17.1% | +16.7% | +26% |

- **Copy/paste passed moved:** "2024 marked the first year GitClear has ever measured" where copy/pasted lines exceeded moved lines. Moved lines fell from about 25% of changed lines in 2021 to 9.5% in 2024, "44% in 2024 alone (from 16.9% to 9.5%)."
- **Churn came in under the projection.** Actual 2024 churn was 5.7%, not the projected 7.1%. Coverage of the 2024 report's "churn will double" claim should note this.
- **Duplicated blocks (new metric):** a block is "five or more contiguous lines (ignoring blank/keyword lines)" repeated. Table from the report:

| Year | Commits scanned | Dupe blocks found | Commits with a dupe block | Share of commits | Median block size |
| --- | --- | --- | --- | --- | --- |
| 2020 | 19,805 | 9,227 | 139 | 0.70% | 10 |
| 2021 | 29,912 | 9,295 | 143 | 0.48% | 11 |
| 2022 | 40,010 | 10,685 | 182 | 0.45% | 11 |
| 2023 | 41,561 | 20,448 | 747 | 1.80% | 10 |
| 2024 | 56,495 | 63,566 | 3,764 | 6.66% | 10 |

- **The two headline multipliers:** the text says "8-fold increase in the frequency of code blocks with 5+ duplicated lines" in 2024, and that prevalence was "approximately 10x higher than it had been two years prior." The table gives 6.66% vs 0.45% (about 15x over two years) and 6.66% vs 1.80% (about 3.7x in one year). The landing page title says "4x Growth in Code Clones." I could not reproduce "8-fold" from the table; cite the table rows, not the multiplier.
- **Method change between years (Appendix A8):** for 2020–2023 they "queued up the largest (by Diff Delta) 1,000 commits made to each repo" and backfilled. 2024 was measured differently. They argue this "should bias toward reporting a greater percentage" in earlier years. It is still a change of method across the comparison.
- **Older code is touched less:** in 2024 "only 20% of all modified lines" changed code older than a month, vs 30% in 2020. New lines revised within a month rose "20-25%" vs 2021.
- **Defect link is borrowed, not measured:** the "increased defect rate" in the title comes from Google's DORA 2024 survey (7.2% lower delivery stability per 25% more AI adoption), not from GitClear's data. GitClear also cites Mo et al. on clones in deep-learning projects and Mondal et al. 2017 on bug propagation.

### 5.3 GitClear, "The Maintainability Gap: AI Code Quality in 2026" (2026). VERIFIED (landing page and abstract only; PDF gated); Vendor

- **Link:** https://gitclear.com/the_ai_code_quality_maintainability_gap. No author or date shown on the page.
- **Data:** "623 million analyzed changes from 2023-2026," eight signals.
- **Numbers on the page (vs 2023 unless noted):**
  - Block duplication ("regions of five or more consecutive repeated meaningful lines"): 40.3 per million changed lines in 2023 → 73.0 in 2026 year to date, +81%.
  - Within-commit copy/paste +41%; error-masking constructs +47%; two-week churn +15%.
  - Cross-file function calls −35% (343 → 223 method calls per thousand changed lines).
  - Moved code: 21% (2022) → 13% (2023) → 3.8% (2026 YTD). Copy/paste: 9.4% (2022) → 15.7% (H1 2026). "~5x" more copy/paste than refactoring.
  - Long-term updates (code older than 12 months): 1.7% → 0.46%, −74%.
- **It restates the 2025 report as** "commits containing a duplicated block rose roughly 10x over two years" (not 8x).
- **Also on the page:** the Jan 2026 GitClear cohort report found heavy AI users out-produce non-users "by 4–10x, but most of that gap pre-dated AI," with "a more modest 25% velocity gain."
- **Caveat:** the history keeps being restated (2023 moved: 16.9% in the 2024 report, 15.8% in 2025, 13% here). Treat each report's numbers as internally consistent only.

### 5.4 How to read the GitClear numbers

- They are a **vendor's telemetry on a changing customer mix**, not a controlled study. None of the three reports identifies AI-written commits; "AI influenced" is a period label on a chart.
- "Copy/pasted" means a **non-keyword line repeated across files or functions within one commit**. It counts legitimate patterns (test fixtures, config, parallel switch arms) and misses copies made across commits.
- The duplicate-block metric is **Type-1 clones of 5+ lines** (exact copies). It is close to what jscpd or SonarQube's duplication measure would find, and much broader than `sonarjs/no-identical-functions`.
- Safe phrasing (mine, not a quote): _GitClear, which sells code analytics, reports that in its dataset the share of commits containing a duplicated 5-line block rose from 0.45% in 2022 to 6.66% in 2024, and that 2024 was the first year copy/pasted lines outnumbered moved lines._

### 5.5 Liu et al., "Refining ChatGPT-Generated Code: Characterizing and Mitigating Code Quality Issues" (TOSEM 2024). VERIFIED (full arXiv v2 PDF; Crossref)

- **Citation:** Yue Liu, Thanh Le-Cong, Ratnadira Widyasari, Chakkrit Tantithamthavorn, Li Li, Xuan-Bach D. Le, David Lo. _ACM TOSEM_ 33(5), 2024. https://doi.org/10.1145/3643674, arXiv https://arxiv.org/abs/2307.12596
- **Method:** 4,066 programs from ChatGPT (GPT-3.5) for 2,033 LeetCode tasks in Java and Python. Pylint and Flake8 for Python; PMD and Checkstyle for Java.
- **Findings:**
  - 2,756 correct, 1,082 wrong output, 177 compile or runtime errors.
  - 1,930 of 4,066 (47%) had code style and maintainability issues; so did 1,243 of the 2,756 programs that **passed all tests (45%)**.
  - Python top 3: ConsiderUsingEnumerate 213 (10.5%), NoElseReturn 161 (7.9%), **UnusedVariable 103 (5.1%)**. "5.1% of ChatGPT-generated code has unused variables."
  - Java top issues include RedundantModifier (112 programs). Their worked example is an unused parameter `maxSize`.
  - Repair: ChatGPT fixed "about 20% to 60%" of issues when re-prompted. With static-analysis output in the prompt, it fixed over 60% of Python style and maintainability issues. Fixes sometimes introduced new issues.
- **Caveat:** competitive-programming snippets, not code edited inside a project. The example labels a Pylint message (W0613) as "PMD."

### 5.6 Siddiq, Majumder, Mim, Jajodia, Santos, "An Empirical Study of Code Smells in Transformer-based Code Generation Techniques" (SCAM 2022). VERIFIED (full PDF from the first author's site; Crossref)

- **Links:** https://doi.org/10.1109/SCAM55253.2022.00014 (pp. 71–82), PDF https://lsiddiqsunny.github.io/public/scam_2022.pdf. Artifact: https://zenodo.org/records/7049118
- **Training sets (Pylint, Bandit):** 264 Pylint smell types across CodeXGlue, APPS and Code Clippy. Non-security smelly samples: APPS 69.15%, Code Clippy 39.12%, CodeXGlue 97.03%.
- **Generated code (GPT-Neo 125M, 10 fine-tuned configs, 16,400 HumanEval outputs):** R0801 duplicate-code appeared in 9 of 10 configs; W0613 unused-argument in all 10. The paper: "The model generates duplicated code, and Pylint suggests refactoring it."
- **Copilot (HumanEval, 164 prompts):** 45.73–51.22% of suggestions were smelly depending on rank. Pylint found W0612 unused-variable, W0107 unnecessary-pass and W0108 unnecessary-lambda among 18 smell types.
- **Important exclusion:** they ignored W0611 unused-import because "Pylint can not do a reliable checking for import statements’ usage." This paper gives no unused-import numbers.

### 5.7 Yetiştiren, Özsoy, Ayerdem, Tüzün, "Evaluating the Code Quality of AI-Assisted Code Generation Tools" (arXiv 2023). VERIFIED (full arXiv v2 PDF)

- **Link:** https://arxiv.org/abs/2304.10778. HumanEval (164 problems), SonarQube.
- **Counts are tiny.** "Remove the unused function parameter": Copilot 1, CodeWhisperer 5, ChatGPT 0 problems. "Remove the unused local variable": 2, 0, 4. "Remove commented out code": CodeWhisperer 3.
- Average technical debt per smelly problem: 9.1 min (Copilot), 5.6 (CodeWhisperer), 8.9 (ChatGPT).
- **Use only as** "unused parameters and locals show up in generated code," not as a rate.

### 5.8 Cotroneo, Improta, Liguori, "Human-Written vs. AI-Generated Code: A Large-Scale Study of Defects, Vulnerabilities, and Complexity" (ISSRE 2025). VERIFIED (full arXiv PDF)

- **Links:** https://doi.org/10.1109/ISSRE66568.2025.00035, arXiv https://arxiv.org/abs/2508.21634
- **Method:** >500k Python and Java functions, human code from >17k GitHub projects vs ChatGPT, DeepSeek-Coder and Qwen-Coder. Docstrings were stripped and used as the prompts. Pylint and PMD, with style rules excluded; Semgrep for security.
- **Finding (abstract):** AI code is "simpler and more repetitive, yet more prone to unused constructs and hardcoded debugging."
- **Counts (Python):** ChatGPT's top violations were 32,992 unused-argument and 14,408 unused-variable. DeepSeek-Coder had 111,703 unused-argument. In Java, Qwen's top violation was UnusedFormalParameter (24,660); DeepSeek-Coder showed UnusedPrivateField among its top ones.
- **The authors' reading:** models "replicate parameter patterns from docstrings or function signatures without correctly using them."
- **Caveat:** isolated functions generated from a signature and docstring, so unused parameters are partly an artefact of the setup. Human code's top Python issue was protected-access, so the profiles differ more than they rank.

### 5.9 Sabra, Schmitt, Tyler (Sonar), "Assessing the Quality and Security of AI-Generated Code: A Quantitative Analysis" (arXiv 2025). VERIFIED (full PDF); Vendor, not peer-reviewed

- **Link:** https://arxiv.org/abs/2508.14727. 4,442 Java tasks, SonarQube. Companion blog by Prasenjit Sarkar, 28 Aug 2025, https://www.sonarsource.com/blog/llm-coding-personality-traits/
- **"Dead / Unused / Redundant code" as a share of each model's code smells (Table 9):** Claude Sonnet 4 14.83%, Claude 3.7 Sonnet 17.43%, GPT-4o 26.3%, Llama 3.2 90B 34.82%, OpenCoder-8B 42.74%.
- **Their stated cause, in the table:** "Requires non-local, project-wide reference analysis." In the text, models find it "challenging … to determine if a generated element is utilized elsewhere."
- **Example rule:** java:S2094 empty classes, 531 instances for GPT-4o and 661 for OpenCoder-8B.
- **Category mapping matters (Appendix Table 13):** "Dead/unused/redundant" covers 22 rules, including S1481 (unused local variable), S1144 (unused private method) and S2094 (empty class). S1172 (unused method parameter) is **not** in its list. Dead stores (S1854) are filed under Assignment; duplicated branches (S1871) and identical methods (S4144) under Control logic; duplicated string literals (S1192) under Regex/String. So the 15–43% excludes the duplication rules.
- **Verbosity (blog):** Claude Sonnet 4 produced 370,816 LOC for the same tasks where OpenCoder-8B produced 120,288.

### 5.10 Molison, Moraes, Melo, Santos, Assunção, "Is LLM-Generated Code More Maintainable & Reliable than Human-Written Code?" (ESEM 2025). VERIFIED (metadata + abstract; full text skimmed)

- **Links:** https://doi.org/10.1109/ESEM64174.2025.00036, arXiv https://arxiv.org/abs/2508.00700
- **Counterpoint:** on Python solutions graded by SonarQube, "LLM-generated code has fewer bugs and requires less effort to fix them overall," though competition-level problems introduced structural issues. Their example smell is an unused `from itertools import *`.
- **Use it** to show the evidence is not one-directional at the snippet level.

### 5.11 Ciniselli, Pascarella, Bavota, "To What Extent do Deep Learning-based Code Recommenders Generate Predictions by Cloning Code from the Training Set?" (MSR 2022). VERIFIED (full arXiv PDF; Crossref)

- **Links:** https://doi.org/10.1145/3524842.3528440 (pp. 167–178), arXiv https://arxiv.org/abs/2204.06894
- **Method:** Copilot's training data is not public, so they studied **their own T5 model** for Java method completion (pre-trained on ~2M methods). Clones detected with Simian.
- **Findings:** "∼10% to ∼0.1%" of predictions are Type-1 clones of training code, depending on length. On the dataset with the most cloning, Type-1 fell from 12.5% (≥2 statements) to 2.3% (≥3) to 0.1% (≥5). Type-2 clones fell from ~80% to ~2.5%. "Long predictions are unlikely to be cloned." Correct predictions were more likely to be clones.
- **For this post:** this is about copying from training data (licensing), not duplicating code inside the user's repo. Don't use it as evidence that assistants clone the codebase they work in.

### 5.12 Le Hai, Nguyen, Bui, "On the Impacts of Contexts on Repository-Level Code Generation" (RepoExec; NAACL 2025). VERIFIED (full arXiv v4)

- **Link:** https://arxiv.org/abs/2406.11927 (arXiv comment: "Accepted to NAACL 2025").
- **Finding:** "Pretrained LLMs excel in correctness but often reimplement dependencies." They introduce Dependency Invocation Rate (DIR): the share of provided in-repo dependencies the generated code actually calls.
- **Numbers (full context, BasePrompt):** GPT-4o pass@1 37.14%, DIR 81.43%. GPT-3.5 63.59%. StarCoder 58.75%. With the InstructPrompt, GPT-4o's DIR was 68.15%.
- **Why it matters:** the closest benchmark measurement of "reuses the helper that already exists" vs "writes a new one."

### 5.13 The AIDev dataset (Li, Zhang, Hassan; 2025–2026). VERIFIED (arXiv abstracts)

- "The Rise of AI Teammates in Software Engineering (SE) 3.0," arXiv https://arxiv.org/abs/2507.15003 (20 Jul 2025): over 456,000 PRs by Codex, Devin, Copilot, Cursor and Claude Code across 61,000 repos. Agent PRs are "structurally simpler (via code complexity metrics)" and accepted less often.
- "AIDev: Studying AI Coding Agents on GitHub," arXiv https://arxiv.org/abs/2602.09185 (9 Feb 2026): 932,791 agentic PRs, 116,211 repos, cutoff 1 Aug 2025. A curated subset has 33,596 PRs from 2,807 repos with >100 stars. This was the MSR 2026 Mining Challenge dataset, and most 5.14–5.21 papers use it.

### 5.14 Huang, Jaisri, Shimizu, Chen, Nakashima, Rodríguez-Pérez, "More Code, Less Reuse" (MSR 2026). VERIFIED (full arXiv PDF)

- **Links:** https://doi.org/10.1145/3793302.3793622, arXiv https://arxiv.org/abs/2601.21276
- **Finding:** "LLM Agents frequently disregard code reuse opportunities." Average Max Redundancy was 0.2867 for agent PRs vs 0.1532 for human PRs, "nearly 1.87x" (Mann-Whitney p < 0.001). Traditional metrics (complexity, LOC) showed "minimal differences."
- **Reviewers didn't notice:** reviewer sentiment was more neutral or positive on agent PRs. The authors say "surface-level plausibility of AI code masks redundancy."
- **Method:** each new function's max cosine similarity, using CodeSage-Large embeddings, to functions already in the repo. Moves and renames were excluded with PyRef. They frame this as Type-4 (semantic) clones that token-based detectors miss.
- **Caveats:** the redundancy analysis is **one repository** (crewAI, 617 PRs), Python only. Embedding similarity is a proxy for clones, and only 10 samples were checked by hand.

### 5.15 Cynthia, Muttakin, Roy, "Beyond Bug Fixes: An Empirical Investigation of Post-Merge Code Quality Issues in Agent-Generated Pull Requests" (MSR 2026). VERIFIED (full arXiv PDF)

- **Links:** https://doi.org/10.1145/3793302.3793615, arXiv https://arxiv.org/abs/2601.20109
- **Method:** 1,210 merged agent bug-fix PRs from 206 Python repos in AIDev. SonarQube diff between base and merge commits.
- **Findings:**
  - Differences between agents in raw issue counts "largely disappear" once normalised by churn.
  - Code smells dominate.
  - "Duplicate LOC remains below 3% across all agents."
  - Top code-smell rules: S1192 duplicated string literals (212), S3776 cognitive complexity (157) and **S1172 unused function parameters (114, 75 of them from Cursor)**.
  - S3923 (identical branches) appeared 3 times as a bug.
- **Caveat:** "Our study lacks a matched human baseline."

### 5.16 Watanabe, Shirai, Kashiwa, Iida, "What to Cut? Predicting Unnecessary Methods in Agentic Code Generation" (MSR 2026). VERIFIED (full arXiv PDF)

- **Links:** https://doi.org/10.1145/3793302.3793591, arXiv https://arxiv.org/abs/2602.17091. It won the MSR 2026 Distinguished Mining Challenge Paper Award (NAIST announcement, 14 Apr 2026).
- **Data:** 1,664 merged agent PRs touching Python, from 197 projects. Methods were tracked from PR creation to merge, with renames and moves detected by ActRef.
- **Findings:**
  - 12,343 methods were added at PR creation. 97.4% survived and 2.6% were deleted before merge.
  - 75.6% of PRs had no revisions. In the 397 PRs that were revised (3,257 methods), **9.9% of agent-written methods were deleted** (6.0% individually, 3.9% with their file).
  - Deleted methods were longer and had longer names. A Random Forest predicted deletion at AUC 87.1%.
- **Quote:** "a notable portion of AI-generated code is eventually deleted during review."
- **Caveat:** "deleted in review" is not "dead code." It is code a reviewer judged unnecessary. There is no human baseline.

### 5.17 Watanabe, Li, Kashiwa, Reid, Iida, Hassan, "On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub" (TOSEM, accepted). VERIFIED (full arXiv v3)

- **Link:** https://arxiv.org/abs/2509.14745 (v3 header: "accepted at ACM Transactions on Software Engineering and Methodology").
- **Data:** 567 Claude Code PRs in 157 projects. 83.8% were merged, and 54.9% of those merged without changes.
- **Revisions in the 214 modified PRs:**
  - Refactoring 27.1% (58), "frequently necessary to eliminate code duplication." Example: a reviewer "consolidated redundant initialization logic" into one service.
  - Style 23.4% (50), including a fix for "unused imports, exception variables that were declared but never referenced" (footnoted commit in INCATools/ontology-access-kit PR #831).

### 5.18 Horikawa, Li, Kashiwa, Adams, Iida, Hassan, "Agentic Refactoring: An Empirical Study of AI Coding Agents" (arXiv 2025). VERIFIED (full arXiv v1; preprint submitted to TOSEM)

- **Link:** https://arxiv.org/abs/2511.04824
- **Data:** 15,451 refactorings in 12,256 Java PRs and 14,998 commits from AIDev.
- **Findings:**
  - Agents explicitly refactor in 26.1% of commits, mostly low-level edits: Change Variable Type 11.8%, Rename Parameter 10.4%, Rename Variable 8.5%.
  - **Agents rarely refactor to remove duplication.** Duplication is the motivation for 1.1% of agent refactorings and reuse for 4.6%, vs 13.7% and 12.9% for humans. "Agentic refactoring rarely targets design-level improvements, such as duplication."
  - Refactoring fails to reduce the count of known design and implementation smells.

### 5.19 Kashif, Li, Liang, Tahir, Feng, Li, Shahin, "Beyond Functional Correctness: Design Issues in AI IDE-Generated Large-Scale Projects" (arXiv 2026). VERIFIED (full arXiv PDF; preprint under journal review)

- **Link:** https://arxiv.org/abs/2604.06373
- **Data:** 10 projects built with Cursor (average 16,965 LOC, 114 files), 91% functionally correct.
- **Findings:**
  - Code Duplication was CodeScene's top category: 383 of 1,305 issues (28.4%). Example: six quiz-generation methods with about 150 duplicated LOC and only 30 unique.
  - SonarQube's "Dead, Duplicate or Redundant Code" category had 397 of 3,193 issues (12.4%): unused imports and variables, duplicated literals and duplicate CSS selectors.
- **Caveat:** 10 projects, generated by the authors' own human-in-the-loop process.

### 5.20 He, Miller, Agarwal, Kästner, Vasilescu, Cursor difference-in-differences study (MSR 2026). VERIFIED (full arXiv v3)

- **Titles by version:**
  - v1: "Speed at the Cost of Quality? The Impact of LLM Agent Assistance on Software Development."
  - v2: "Does AI-Assisted Coding Deliver? A Difference-in-Differences Study of Cursor's Impact on Software Projects."
  - v3: "Speed at the Cost of Quality: How Cursor AI Increases Short-Term Velocity and Long-Term Complexity in Open-Source Projects."
- **Links:** https://doi.org/10.1145/3793302.3793349, arXiv https://arxiv.org/abs/2511.04427
- **Design:** 806 repos that committed Cursor config files vs 1,380 matched controls. Staggered DiD on SonarQube metrics.
- **Findings:**
  - Velocity rose only in the first two months: commits +55.4% in month 1 and +14.5% in month 2; lines added +281.3% and +48.4%.
  - Static-analysis warnings rose +30.3% and code complexity +41.6%, persistently.
- **Duplication:** duplicated-lines density rose +7.03% (±4.79%), but "The effect on duplicate line density is insignificant." Heavy adopters "may exhibit modest increases." SonarQube marks a block as duplicate at 10 consecutive statements or 100 tokens.
- **For this post:** the strongest causal study finds **no significant duplication effect**. That contrasts with GitClear.

### 5.21 Agarwal, He, Vasilescu, "AI IDEs or Autonomous Agents? Measuring the Impact of Coding Agents on Software Development" (MSR 2026). VERIFIED (full arXiv v2)

- **Links:** https://doi.org/10.1145/3793302.3793589, arXiv https://arxiv.org/abs/2601.13597
- **Design:** the same DiD approach on AIDev, with adoption defined as the first agent PR.
- **Findings:** warnings up about 18% and cognitive complexity about 35–43%. Duplicate line density was +7.92% for agent-first repos and −0.94% for IDE-first repos, neither significant. "Duplication effects are small and inconsistent."

### 5.22 Borg et al., "Echoes of AI: Investigating the Downstream Effects of AI Assistants on Software Maintainability" (arXiv 2025; ICSME 2025 registered report). VERIFIED (abstract and full text skimmed); Vendor-affiliated (first author at CodeScene)

- **Link:** https://arxiv.org/abs/2507.00788 (v3, 26 Feb 2026).
- **Design:** preregistered, 151 participants (95% professionals). In Phase 2, developers evolved code without AI that had been written with or without AI.
- **Finding:** no significant difference in time or CodeHealth. "We did not detect systematic maintainability advantages or disadvantages." The authors list "code bloat from excessive code generation" as future work.
- **Use it** as the controlled-experiment counterpoint: one small Java feature task.

### 5.23 CodeRabbit, "State of AI vs Human Code Generation" (Dec 2025). VERIFIED (blog); Vendor

- **Source:** David Loker, 17 Dec 2025, https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report
- **Data:** 470 open-source PRs (320 "AI-co-authored," 150 "human-only"). 10.83 vs 6.45 issues per PR, "~1.7×." Readability issues were "more than 3×."
- **Caveats:** authorship was inferred from signals. CodeRabbit admits it "cannot guarantee" the human PRs were human. There are **no figures on duplication, dead or unused code.**

### 5.24 Dead code in an LLM's context misleads it. VERIFIED

- **Khare, Dutta, Li, Solko-Breslin, Alur, Naik**, "Understanding the Effectiveness of Large Language Models in Detecting Security Vulnerabilities," arXiv https://arxiv.org/abs/2311.16169 (2023).
  - Semantics-preserving attacks dropped GPT-4's vulnerability-detection accuracy by 11% on average with dead-code injection, 4.33% with renaming and 12.67% with always-true branches.
  - "GPT-4 occasionally reports the vulnerability in the inserted dead code itself."
- **Chen, Li, Wu, Liu**, "DCE-LLM: Dead Code Elimination with Large Language Models," NAACL 2025 (pp. 9942–9955), arXiv https://arxiv.org/abs/2506.11076.
  - A CodeBERT line selector plus a fine-tuned LLM reached over 94% F1 on unused and unreachable code, "surpassing GPT-4o by 30%."
  - It says LLMs "are particularly vulnerable when faced with dead code."
- **Use with care:** these are adversarial or benchmark settings. They support the hypothesis that dead code in a repo is noise an agent can misread. No study measures that on real agent tasks.

### 5.25 Vendor guidance that names the behaviour. VERIFIED (official docs); Vendor

- **Anthropic, "Prompting best practices"** (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices, read 2026-10-12):
  - "Overeagerness": Claude Opus 4.5 and 4.6 "have a tendency to overengineer by creating extra files, adding unnecessary abstractions."
  - Suggested prompt: "Don't create helpers, utilities, or abstractions for one-time operations."
  - The same sample prompt also says: "A bug fix doesn't need surrounding code cleaned up." That is guidance against opportunistic cleanup, so it can leave existing dead code in place.
  - On temporary files: "clean up these files by removing them at the end of the task."
- **Note the tension:** the vendor advises fewer new helpers. The duplication literature (5.12, 5.14, 5.18) says agents don't reuse the helpers that already exist. The two complaints point the same way: write less new code, call existing code.

### 5.26 Agents silencing warnings, leaving dead code, duplicating helpers. ANECDOTAL only

- **No study measures** agents renaming variables to `_x` or adding `eslint-disable` to pass `no-unused-vars`. The closest quantified signals are unused-parameter counts in agent PRs (5.15) and methods deleted in review (5.16).
- **Böckeler, "Maintainability sensors for coding agents," martinfowler.com, 27 May 2026**, https://martinfowler.com/articles/sensors-for-coding-agents.html. Practitioner report using Claude Opus 4.7; quotes checked against the page:
  - An agent can "create inconsistencies because it has not noticed a duplicate."
  - Agents "are quite happy to copy and paste" a third or fourth time "without an explicit nudge."
  - Three near-identical route files. A parameter object the AI introduced "but never fully followed through" on.
  - Review starts with "the exceptions AI created (suppressed warnings, increased thresholds)."
- **anthropics/claude-code issue #42796** (opened 2 Apr 2026 by stellaraccident). One user's telemetry over 234,760 tool calls:
  - Edits to files the model had not recently read rose from 6.2% to 33.7%. Consequences include edits that "duplicate logic that already exists elsewhere in the file."
  - "Comments about removed code were left in place."
- **philosophercode/makerlab-tools PR #132** (30 Sep 2026, "Generated with Claude Code"): instead of deleting `_env`, `_body` and `_options`, it configured `@typescript-eslint/no-unused-vars` so it "now ignores ^_ args, vars, caught errors and destructured array items." This is the documented convention, used to clear warnings with "No runtime code changes."
- **Counter-anecdotes, where agents deleted dead code:**
  - TauCetiProject/TauCeti PR #13836 (9 Oct 2026): "Clean-up (by AI)," deleting unused variables or renaming them to `_`. Reviewed by Codex and Claude bots.
  - nekodas-neko/TrainingAi_Open PRs #2590 and #2598 (Oct 2026): set `^_` as the "unused on purpose" marker, then deleted the remaining dead code and made the rule an error.
- **A rule in the wild:** developerinlondon/agentkit's `code-quality` skill says "NEVER prefix unused variables with underscore (_) to silence linters." It shows practitioners do worry about it; it is not evidence of frequency.

### 5.27 What I did not find

- **No study of agents gaming `no-unused-vars`** (underscore renames, disable comments, config downgrades) with counts.
- **No JavaScript/TypeScript-specific measurement** of duplication in agent or LLM output. Every agent-PR study above is Python or Java. GitClear's data is multi-language, with no per-language split.
- **No study linking AI-introduced clones to later defects.** GitClear borrows the clone-defect link from pre-AI research. Huang et al. and the DiD studies don't follow clones to bugs.
- **No study of dead code accumulating after agent edits** (orphaned functions or exports left behind). "What to Cut?" (5.16) measures pre-merge deletions only.
- **Ciniselli-style training-set cloning for Copilot itself** cannot be measured, because the training data is private (the authors' own reason for using T5).

---

## 6. What lint can and can't see

### 6.1 A lint rule sees one file. VERIFIED (ESLint official docs)

- **ESLint architecture page** (https://eslint.org/docs/latest/contribute/architecture/): the `Linter` object's main method `verify()` takes "the source text to verify, a configuration object, and additional options." Both the Linter and individual rules "may not" "Access the file system." Rules "are simply a set of instructions" run on one AST.
- **ESLint Node.js API:** the Linter "doesn't do any filesystem operations, it simply parses and reports on the code."
- **ESLint's maintainers on cross-file rules:** Nicholas Zakas, "Feedback Wanted: Project-aware ESLint," discussion #16819, 23 Jan 2023 (https://github.com/eslint/eslint/discussions/16819). The question is hard because "there is no consistent definition of "project.""
- **Oxc's docs say it plainly** (https://oxc.rs/docs/guide/usage/linter/multi-file-analysis): "ESLint evaluates rules per file and does not provide a built-in project graph." Oxlint's multi-file analysis builds a module graph in the core, but the page only names `import/no-cycle` as using it.
- **Consequences for this topic:**
  - `no-unused-vars` treats exports as used. ESLint: a variable counts as used when read, called or passed; the `/* exported */` comment exists only for scripts and "has no effect" in modules. Oxlint: exported symbols count as used, and it skips `.d.ts`, `.vue`, `.svelte` and `.astro` files entirely.
  - `no-unused-expressions` "does not apply to function calls or constructor calls," since "they could have side effects." A discarded return value is invisible to it.
  - `sonarjs/no-identical-functions` collects functions and compares them at `Program:exit`, so it only compares functions in the same file (6.5).

### 6.2 TypeScript's unused checks are local too. VERIFIED (tsconfig docs, plus a run)

- **Docs (https://www.typescriptlang.org/tsconfig/):**
  - `noUnusedLocals`: "Report errors on unused local variables." Released 2.0.
  - `noUnusedParameters`: "Report errors on unused parameters in functions." Released 2.0. "Parameters declaration with names starting with an underscore (_) are exempt."
  - `allowUnreachableCode`: undefined (default) gives editor suggestions, `false` raises errors. Only for code "provably unreachable due to the use of JavaScript syntax," not "due to type analysis." Released 1.8.
- **Ad-hoc check (TypeScript 6.0.3, 12 Oct 2026; re-run before quoting):** an exported function nobody imports and an unexported unused function in the same file. `noUnusedLocals` reported only the unexported one (TS6133); the unused export passed. Oxlint 1.86.0 `no-unused-vars` behaved the same.
- **ESLint's `no-unreachable` docs** say it is "safe to disable this rule when using TypeScript," but only with `allowUnreachableCode: false`.

### 6.3 Whole-program tools: knip, ts-prune, unimported, `import/no-unused-modules`. VERIFIED (official docs and READMEs)

- **knip** (https://knip.dev/, by Lars Kappert): "Knip finds and fixes unused dependencies, exports and files." "Knip comes with 190+ plugins for tools and frameworks."
  - How it works (https://knip.dev/explanations/how-knip-works): It "starts at your entry files, follows every import," and "builds a graph of everything connected." "an export is unused when no other file imports it."
  - Its own caveat: "Your results are only as accurate as the graph is complete." Plugins exist to add framework entry points it would otherwise miss.
- **unimported** (https://github.com/smeijer/unimported, archived, last push Mar 2024): the README's motivation states the gap in one line: linters "warn us for unused code in a module," but "they fail to report unused files." It follows imports "starting from your entry file." The archive notice says "This project is no longer maintained" and points to knip.
- **ts-prune** (https://github.com/nadeesha/ts-prune): reads `tsconfig.json` and reports exports with no use elsewhere.
  - Status has changed. The July 2023 README opened "🚨 ts-prune is going into maintanence mode" (sic) and "Please use knip which carries on the spirit." The Sept 2025 README kept a maintenance notice recommending knip. A Sept 2026 commit ("Modernize ts-prune...") replaced the README, and the current one no longer mentions knip or maintenance mode.
  - Current README limitations: frameworks "may consume exports through conventions or reflection that ts-prune cannot detect"; computed import paths can't be resolved; "Uses outside the configured project are not visible."
- **eslint-plugin-import `no-unused-modules`** (https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unused-modules.md): reports "modules without any exports" and exports "not being statically `import`ed or `require`ed from other modules in the same project." It needs `missingExports` or `unusedExports` turned on (both default `false`). Exports of `main`/`browser`/`bin` files are ignored unless the package is private. Added in v2.17.0 (13 Apr 2019). It is the in-linter workaround: a rule that scans `src` (default `process.cwd()`) from inside a single-file engine.
- **For the post:** Unused files, unused exports and unused dependencies are whole-program questions. They need entry points and a module graph, and they get false positives from framework conventions (file-based routes, config files, reflection). That's why they live in separate tools.

### 6.4 What the per-file rules cover in each linter. VERIFIED (official docs, plus rule source for SonarJS)

| Rule | Linter | Introduced | Default | Note |
| --- | --- | --- | --- | --- |
| `no-unused-vars` | ESLint | v0.0.9 | recommended | Used = read, called, passed. Assignment alone isn't use. |
| `no-unused-vars` | Oxlint | — | on by default (correctness) | Default ignore pattern `^_` for vars and args (bare `_` param excepted); "deviates from both ESLint and TypeScript-ESLint" |
| `noUnusedVariables` | Biome | v1.0.0 | recommended, warning | Exempts names starting with `_`. "This rule won’t report unused imports." |
| `noUnusedImports` | Biome | v1.3.0 | recommended, warning | Unsafe fix |
| `noUnusedFunctionParameters` | Biome | v1.8.0 | recommended, warning |  |
| `no-unused-private-class-members` | ESLint | v8.1.0 | recommended (current docs) | "most likely an error due to incomplete refactoring" |
| `noUnusedPrivateClassMembers` | Biome | v1.3.3 | recommended, warning | Caveat: any computed access marks all TS private members used |
| `no-unreachable` | ESLint | v0.0.6 | recommended | After `return`, `throw`, `continue`, `break` |
| `noUnreachable` | Biome | v1.0.0 | recommended, error |  |
| `no-useless-assignment` | ESLint | v9.0.0-alpha.1 | recommended (current docs) | Quotes Wikipedia's "dead store" definition. Known limitation: skips some reassignments in `try` blocks |
| `no-duplicate-imports` | ESLint | v2.5.0 | not recommended |  |
| `no-dupe-else-if` | ESLint | v6.7.0 | recommended |  |
| `no-duplicate-case` | ESLint | v0.17.0 | recommended |  |
| `no-dupe-keys` | ESLint | v0.0.9 | recommended |  |
| `no-dupe-class-members` | ESLint | v1.2.0 | recommended |  |
| `no-unreachable-loop` | ESLint | v7.3.0 | not recommended |  |
| `no-unused-expressions` | ESLint | v0.1.0 | not recommended | Exempts calls and `new` |

- "Recommended" for ESLint means the docs page today (v10.x) shows the recommended badge. The `no-useless-assignment` and `no-unused-private-class-members` statuses may have changed across majors; check the version you cite.
- Docs: https://eslint.org/docs/latest/rules/, https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-unused-vars, https://biomejs.dev/linter/rules/

### 6.5 Rule-based duplicate detection is exact and local. VERIFIED (eslint-plugin-sonarjs 4.2.2 source, plus a run)

- **`sonarjs/no-identical-functions`** ("Functions should not have identical implementations"; in the plugin's recommended config):
  - Threshold: `DEFAULT_MIN_LINES = 3`. A function body must span at least 3 lines (braces excluded).
  - Equivalence (`helpers/equivalence.js`): "comparing node types and their tokens," token by token on `value`. Whitespace and comments don't matter; any renamed identifier does.
  - It compares functions collected in one file at `Program:exit`.
- **Ad-hoc check (ESLint 10.12.0, sonarjs 4.2.2, 12 Oct 2026; re-run before quoting):** three functions in one file. An exact copy was reported ("not identical to the one on line 1"). A copy with renamed variables (`sum`→`acc`, `item`→`row`) was not. An exact copy in a second file was not. So the rule finds Type-1 clones (section 4's taxonomy) within a file and nothing else.
- **`sonarjs/no-duplicated-branches`**: "Two branches in a conditional structure should not have exactly the same implementation." Same token equivalence. Individual duplicate branches are reported only if the branch spans more than one line (`hasRequiredSize`); if all branches are identical, it reports regardless. `sonarjs/no-all-duplicated-branches` covers the all-identical case.
- **`sonarjs/no-duplicate-string`**: `threshold` default 3, `MIN_LENGTH = 10` characters (trimmed). Strings with no separator (matching `/^\w*$/`), `require()` arguments, object keys and `'application/json'` are skipped. It is disabled in the plugin's recommended config.
- **Compare SonarQube's own duplication metric** (https://docs.sonarsource.com/sonarqube-server/latest/user-guide/code-metrics/metrics-definition/): for non-Java code a duplicated block needs "at least 100 successive and duplicated tokens" over at least 10 lines (30 for COBOL, 20 for ABAP). "Differences in indentation and in string literals are ignored." This is cross-file, unlike the lint rules.
- **jscpd** (https://github.com/kucherenko/jscpd): token sequences matched across files with a rolling Rabin-Karp hash. Defaults: `--min-tokens` 50, `--min-lines` 5. Default runs report only exact clones; opt-in passes add renamed (Type-2), edited (Type-3) and an experimental embedding pass (Type-4). It is bundled in GitHub Super Linter.

### 6.6 How good are dedicated clone detectors? VERIFIED (full PDFs)

**Bellon, Koschke, Antoniol, Krinke, Merlo, "Comparison and Evaluation of Clone Detection Tools," _IEEE TSE_ 33(9):577–591, Sept 2007.** https://doi.org/10.1109/TSE.2007.70725. PDF: https://plg.uwaterloo.ca/~migod/846/papers/bellon-tse07.pdf

- Six detectors (text, token, AST, metrics and PDG based) on eight C and Java systems, almost 850 KLOC.
- An independent oracle (Bellon) reviewed only **2% of 325,935** submitted candidates, so precision is estimated from rejection rates.
- Conclusions: token- and text-based tools "have higher recall"; Merlo's metric tool and Baxter's AST tool "have higher precision." Rejected candidates ran "between 24 percent for Baxter and 77 percent for Krinke." Only 24–46% of injected "secret" clones were found by individual tools.
- "Type-1 and type-2 clones can be found reliably with existing techniques." "Type-3 clones are more difficult."

**Svajlenko and Roy, "Evaluating Clone Detection Tools with BigCloneBench," _ICSME 2015_.** PDF: https://clones.usask.ca/pubfiles/articles/SvajlenkoEvaluatingToolsICSME2015.pdf

- BigCloneBench: eight million validated clones in IJaDataset 2.0 (25,000 Java systems). Ten tools, default settings.
- Recall (Table IV, %):

| Tool | T1 | T2 | Very-strong T3 (90–100% similar) | Strong T3 (70–90%) | Moderate T3 (50–70%) | Weak T3/T4 (<50%) |
| --- | --- | --- | --- | --- | --- | --- |
| NiCad | 100 | 100 | 100 | 95 | 1 | 0 |
| SimCad | 100 | 98 | 91 | 48 | 8 | 0 |
| iClones | 100 | 82 | 82 | 24 | 0 | 0 |
| CPD (PMD) | 100 | 94 | 71 | 21 | 1 | 0 |
| CCFinderX | 100 | 93 | 62 | 15 | 1 | 0 |
| ConQat | 67 | 90 | 73 | 33 | 1 | 0 |
| Deckard | 60 | 58 | 62 | 31 | 12 | 1 |
| Simian | 95 | 78 | 53 | 13 | 0 | 0 |
| CtCompare | 95 | 78 | 59 | 17 | 0 | 0 |
| Duplo | 89 | 74 | 46 | 8 | 0 | 0 |

- "None perform well in the Moderately Type-3 or Weakly Type-3/Type-4 regions." "Semantic-awareness may be needed."
- The intro says "7-23% of a software system is cloned code," citing earlier studies.
- **For the post:** even the best dedicated clone detectors stop finding copies once about half the lines differ. A lint rule that matches identical tokens within one file sits at the far narrow end of that spectrum. It catches the cheap, certain cases (an accidental copy-paste of a whole function or branch) and nothing that has been edited.

---

## Things that turned out wrong or different

**History (section 1)**

- **Lint's date and number:** CSTR **65** is right (Bell Labs' own bibliography). The bibliography dates it December 1977 (TM 77-1273-14); the 7th Edition manual copy is dated 26 July 1978. Wikipedia's "25 October 1978" and "pages 78–1273" mix up the date and the memo number.
- **Lint's message text:** "statement not reached" is from the shared pcc/lint front end (`mip/cgram.y`), not lint-only code. The paper itself doesn't print the string. Lint's own strings include "set but not used in function" and "defined…, but never used."
- **"Duplicated Code is the first smell in Refactoring" is true only for the 1999 edition.** In the 2018 second edition the first smell is **Mysterious Name**, Duplicated Code is second, and the "stink parade" line is gone.
- **"Number one in the stink parade":** the only primary-ish text I opened is a pre-publication draft that says "Number one **on** the stink parade." The "in" wording is widely quoted but I didn't verify it against a printed 1999 copy.
- **DRY is not about code.** By the authors' own 2019 account, reading DRY as "don't copy-paste" was a misreading of the 1999 edition. Their 2019 text says identical code that encodes different knowledge is "a coincidence, not a duplication."
- **ESLint has never had a default underscore pattern.** The `^_` convention is only a documentation example (since v1.3.0, 2015). Oxlint's docs flag their own `^_` default as a deviation from ESLint and typescript-eslint. TypeScript hardcodes the `_` exemption, but only for parameters (from 2.0), and it was added a week after the flag in response to a user issue.
- **TypeScript's flags were not a TS 2.0 headline.** The 2.0 announcement post doesn't mention them; only the release notes do. No design rationale for making them compiler options rather than lint was recorded on the PR.
- **Unreachable code in TypeScript predates the unused flags.** It was an error by default from TS 1.8. Today's default (`undefined`) only gives editor suggestions, so an unconfigured `tsc` build doesn't fail on unreachable code.
- **Biome's own fix for an unused variable is to rename it with `_`**, not to delete it. That is worth knowing for the agent section.
- **Rollup didn't coin "tree-shaking."** Harris says it came "mostly" from the Dart community and he can't remember where he picked it up.

**Incidents and lint limits (sections 2 and 6)**

- **Knight Capital:** The SEC order never uses "dead code." It says "unused code," "code no longer intended for use" and "defective Power Peg code." The loss wording varies by paragraph: "lost over $460 million," "lost more than $460 million," "realized a $460 million loss." Power Peg stopped being used in **2003**, and the stop-counting logic moved in **2005**. Less often cited: uninstalling the new code from the seven good servers made it worse.
- **Apple advisory URLs:** HT6147 now redirects to support.apple.com/en-us/103608 and HT6150 to /103380. The advisories don't describe the code; the duplicated line is only visible in the published source.
- **Langley's post** says only Clang has `-Wunreachable-code`, credited to Peter Nelson. The GCC removal is from Ian Lance Taylor (gcc-help, May 2011): the flag is accepted and ignored. From the manuals, it was dropped from the docs between GCC 4.4.7 and 4.5.4. "Removed since GCC 4.5" is consistent with that but I found no release note saying so.
- **Clang `-Wall` today includes `-Wmisleading-indentation`** (current DiagnosticsReference). Wheeler's "not enabled by -Wall in clang" was true when written and is now out of date. `-Wunreachable-code` is still outside `-Wall`.
- **The JS analogue is caught.** `no-unreachable` (Oxlint, ESLint, Biome) and TS7027 flag a duplicated `return` analogue, and the formatter re-indents it. A deleted check (Bland's merge scenario) would not be caught by any of them.
- **ts-prune is not simply "deprecated."** It was in maintenance mode recommending knip (2023–2025) but was modernized in Sept 2026, and the current README no longer recommends knip. Cite the dated README versions if you mention this.
- **unimported is archived** and points to knip.
- **ESLint `no-useless-assignment` and `no-unused-private-class-members`** show as recommended in today's (v10.x) docs. Check before saying when that happened; I didn't trace the config history.
- **SonarJS `no-identical-functions`** matches identical tokens only, in one file, with bodies of 3+ lines. It is not a clone detector in Roy and Cordy's sense.

**Dead code research (section 3)**

- **Author list for the TSE dead-code paper is wrong in the brief.** "A Multi-Study Investigation into Dead Code" is by **Romano, Vendome, Scanniello and Poshyvanyk**. Sartiani and Risi are co-authors of the 2016 SAC paper on DUM, not the TSE paper.
- **Year:** The TSE paper is volume 46(1), January **2020**. It was published online in 2018 (DOI suffix `tse.2018.2842781`). Cite it as TSE 2020, or "online 2018."
- **It includes a mining study, but of 35 buildable Java GUI apps (13 with history), not 23 projects.** The "23 Java desktop apps" figure belongs to the later Caivano et al. (EMSE 2023) and Romano et al. (EASE 2024) studies.
- **Boomsma's "about 30%"** is a rounding by later papers. The thesis says "more than 28% (2740 files)," removed in a day.
- **Eder et al.'s "25%" is of method genealogies never executed in production,** not of code a static tool calls dead. It includes exception handlers. The "share of maintenance on unused code" is 7.6% of modifications, and only 3.6% of all maintenance was judged unnecessary. That is much smaller than the "25%" headline suggests.
- **SCARF numbers conflict between the blog and the FSE abstract** (see 3.12).
- **Soto-Valero's 75.1% is mostly transitive bloat.** Bloated direct dependencies are 2.7% of relationships.
- **SANER 2018 page range:** Crossref says 291–401; VU's portal says 402–412.
- **Note for section 1:** Romano et al. state that Fowler's 1999 _Refactoring_ "did not mention dead code" among its 22 smells. Dead code as a named smell comes from Wake's _Refactoring Workbook_ (2003), Mäntylä et al. (2003) and Martin's _Clean Code_ (2008), per their related work. Worth checking against the book if section 1 claims otherwise.

**Duplication research (section 4)**

- **Juergens et al.: "52% of inconsistent clones were unintentional" is wrong.** 52% of _clone groups_ were inconsistent. 28% of the inconsistent ones were unintentional. 15% (mean; 3–23% by system) of inconsistent groups were faults, and about 50% of the _unintentional_ ones were. That 50% is the "every second to third" line. The 107 faults are a sum across five systems.
- **Baker 1995:** 19% is the X Window System (714,479 lines). The 1.1M-line production subsystem was **20%**. The removable estimates were 12% and 13%. The 2007 Roy–Cordy survey's "Baker found 13% - 20%" mixes the "removable" and "involved" figures.
- **"5–20%" vs "7–23%":** both come from Roy and colleagues. The 2007 report's abstract says 5–20% (traced to Mayrand et al. 1996). The 2009 SCP paper says 7–23% (Baker 1995 plus Roy & Cordy 2008). Mayrand's own abstract gives no percentage, so I couldn't confirm it at the source. Say "studies report roughly 5–20% (or 7–23%)" and cite the survey, not Mayrand.
- **Kapser and Godfrey's 71%:** this is the best of four samples (Apache, 30-token minimum, 59 clone groups). Across samples, 33–71% were rated good. The Gnumeric 30-token sample had **57% harmful**.
- **Kim et al.:** "38%" is not the share of clones that disappear. 27–38% of genealogies changed consistently, and 64–69% were not easily refactorable. Of disappeared genealogies, 54–72% were gone within about eight check-ins. These numbers come from the tech report, not the FSE PDF.
- **CP-Miner author list:** it is Li, Lu, **Myagmar**, Zhou (not "Myles"). The bug counts differ by version: OSDI 2004 has 28 Linux and 23 FreeBSD; TSE 2006 has 49 Linux and 31 FreeBSD.
- **Chou et al.:** CP-Miner paraphrases this as "34 out of 35 errors." Chou's text says "34 of the errors were caused by cut-and-paste" in one `drivers/i2o` file. Quote Chou.
- **DéjàVu:** "only 6% of JS files distinct" is right for file hashes (the UCI news page says 7%, from an earlier corpus). It is mostly committed `node_modules`, not hand copy-paste: 6% of projects caused almost 70% of files. The paper also contradicts itself on Java's near-miss share (46% vs 43%).
- **Rahman et al.** studied four **C** projects (Apache, Nautilus, Evolution, Gimp) with Deckard. The finding is "not more defect-prone," and the paper even says "may be less," which is stronger than "no difference." A 2017 SEKE study (Islam et al.) finds the opposite.
- **Cheung et al.:** online in 2015, journal volume in 2016 (EMSE 21(2)).

**AI-written code (section 5)**

- **Liu et al. TOSEM 2024 authors:** Yue Liu, Thanh Le-Cong, Ratnadira Widyasari, Chakkrit Tantithamthavorn, Li Li, Xuan-Bach D. Le, David Lo. There is no "Tang."
- **GitClear's "8x":** the 2025 report's own table does not reproduce it. Commits with a duplicated block went 0.45% → 6.66% from 2022 to 2024 (~15x), 1.80% → 6.66% from 2023 (~3.7x). The landing page says "4x"; the 2026 page restates it as "roughly 10x over two years." The 2020–2023 values were backfilled from each repo's largest 1,000 commits.
- **GitClear's 2024 "churn will double" was a GPT-4 projection, and it missed.** The 2024 row was a "quadratic regression" fitted to two data points. Actual 2024 churn was 5.7%, not 7.1%.
- **GitClear dataset descriptions vary by source.** LeadDev says "25 of the largest open-source projects"; the report says React, Chrome and "about 80 others" plus private customers. Use the report.
- **GitClear revises its own history** each year (2023 moved code: 16.9%, then 15.8%, then 13%). Compare years only within one report.
- **The 2025 landing page's "8.3% to 12.3%" copy/paste rise "from 2021"** doesn't match the report table, where 8.3% is 2020 and 2021 is 8.4%.
- **He et al. title:** "Does AI-Assisted Coding Deliver? A Difference-in-Differences Study of Cursor's Impact on Software Projects" is arXiv v2 only. v1 and v3 have different titles (see 5.20). The MSR 2026 version is v3, and it found no significant duplication effect.
- **Siddiq et al. (SCAM 2022) has no unused-import data**; W0611 was excluded on purpose. Its subjects are GPT-Neo 125M and Copilot on HumanEval.
- **Ciniselli et al. did not study Copilot.** They trained their own T5 model, because Copilot's training set is private.
- **DCE-LLM misquotes Khare et al.** It says dead-code injection cuts accuracy "up to 12.7%"; Khare et al. give 11% for dead-code injection and 12.67% for branch insertion.
- **"Code Copycat Conundrum" (Liu et al., arXiv 2504.12608)** is about degenerate repetition: repeated characters or statements and functions defined multiple times in one output (19 LLMs, 20 patterns; 89.9% of repetitive outputs hit the token limit). It is not about duplicating code already in a repo. Don't cite it for the reuse argument.
- **Sonar's 15–43% "dead/unused/redundant" share excludes duplication rules** (S1871, S4144 and S1192 sit in other categories) and dead stores (S1854).

**Found while merging**

- **Sonar's "dead/unused/redundant" category doesn't include unused parameters.** Appendix Table 13 of arXiv 2508.14727 lists 22 rules for it, and S1172 isn't one of them. Earlier notes said it was; 5.9 is corrected.
- **Anthropic's prompting guide pulls both ways.** It warns against new helpers and abstractions, and also says a bug fix "doesn't need surrounding code cleaned up."
- **Knight's deletion was planned.** The SEC order says Knight "intended to delete the Power Peg code." The failure was a deployment that missed one server, not a decision to keep the code.

## Unverified or dropped

**History (section 1)**

- **Dragon Book definition of dead code** (Aho, Sethi, Ullman 1986; Aho, Lam, Sethi, Ullman 2006). Commonly quoted as "dead (or useless) code — statements that compute values that never get used." I couldn't open the book, so it's UNVERIFIED. Use Allen and Cocke (1.7) instead.
- **Printed 1999 _Refactoring_ wording** ("Number one in the stink parade", "Three strikes and you refactor"): not opened. archive.org returned 500 and O'Reilly returned 403. The 2nd-edition text and the 1st-edition draft were opened.
- **The 1999 _Pragmatic Programmer_ text:** not opened. The DRY definition is verified from the 2019 edition.
- **Why TypeScript made unused checks compiler errors:** no recorded rationale found (PR #9200, the 2.0 notes and the design-meeting search turned up nothing).
- **When TypeScript's `allowUnreachableCode` default moved from error (1.8) to editor suggestion:** not pinned down.
- **When Rust's `unused_variables` first suggested the `_` prefix:** not pinned down; current docs only.
- **ACM Turing Award page describing Allen and Cocke's catalogue as the first systematisation:** 403, not verified. Dropped.
- **JSLint's exact first date for unused-variable reporting:** earliest archived evidence is March 2006. The ©2002 line dates the tool, not this feature.

**Incidents and lint limits (sections 2 and 6)**

- **Mike Bland's ACM Queue version** ("Finding More Than One Worm in the Apple," 2014): ACM returned a Cloudflare block. I used his martinfowler.com article instead, which has the same analysis.
- **eslint-plugin-import `no-unused-modules` under flat config:** a PR comment (#2829) says it may fail to reload flat configs. Not verified; don't cite.
- **Biome cross-file unused-export rule:** Biome has a module graph and `noImportCycles`, but I found no rule that reports unused exports. Not verified either way.
- **Dropped:** gh CLI CVE-2025-25204 ("re-used uninitialized error variable," Go). It's a variable-reuse bug, not an unused variable or dead store.
- **Dropped:** the Linux 2003 `wait4` backdoor (`current->uid = 0`). It's an assignment-in-condition, not dead code.
- **Not found:** a JS/TS CVE whose root cause is an unused variable or dead store; a public outage postmortem blaming JS dead or duplicated code.

**Dead code research (section 3)**

- **Caivano et al. (EMSE 2023) per-category numbers** (share stillborn, revival rate, survival in commits): the Springer PDF was behind a login redirect, so I only have the abstract.
- **Obbink et al. (SANER 2018) full text:** the VU PDF returned 403. Its numbers come from the 2023 TSE paper's summary.
- **Meta FSE 2023 full text:** blocked by ACM. I have only the abstract.
- **Brown et al., _AntiPatterns_ (1998), "between 30 and 50 percent" of a system being dead "lava flow" code:** seen only as quoted in Romano et al. It's a book anecdote and I didn't check the book. UNVERIFIED.
- **Yamashita and Moonen (WCRE 2013):** "dead code" was the 10th most-mentioned smell and dead code detection the 10th most wanted tool feature. Seen only as quoted in Romano et al. UNVERIFIED against the original.
- **No empirical study of dead code prevalence in Python or TypeScript repositories** turned up. The JavaScript studies are about unused library functions shipped to browsers, not unused locals or exports in source.
- **Dropped:** vendor blogs (e.g. pensero.ai) repeating the 70% and 16% figures without sources. The 70% is Muzeel's (3.9), and the 15.94% is Romano et al.'s (3.1). Cite those instead.

**Duplication research (section 4)**

- **CCFinder numbers:** full text unavailable; only the abstract was checked.
- **Göde & Koschke 2011:** abstract only; no numbers.
- **Kim et al. FSE 2005 PDF:** not reachable; percentages are from the UW tech report.
- **Cheung et al. 2016:** PDF returned 403; abstract only.
- **Jiang, Su, Chiu 2007:** PDF link served HTML; abstract only. Its 57/38 counts mix bugs and style issues.
- **Mondal et al. 2018, Islam et al. 2017, Barbour et al. 2011/2013, Hordijk et al. 2009, Gharehyazie et al. 2017:** abstract only.
- **Mayrand et al. 1996 as the source of "5–20%":** not in the abstract; attribution comes only from the survey.
- **Dropped:** the TGMM TypeScript claim (arXiv 2403.18202), not opened. The Virginia Tech thesis "Detecting code duplications in the NPM community" (17.1% of files, 29.3% of packages), from a search snippet only, with no year. Baker 1992 (academia.edu only).

**AI-written code (section 5)**

- **Sankhe et al. 2025 (International Journal For Multidisciplinary Research):** cited by Sawada et al. (arXiv 2605.06464) for "31.4%" productivity, "23.7% increase in security vulnerabilities" and "a notable rise in code duplication." Not opened; the venue is weak. Dropped.
- **tech-insider.org and Pagerly summaries of GitClear 2026:** secondary. Used GitClear's own page instead.
- **Jamie-BitFlight/claude_skills issue #3176** (138 underscore-prefixed import aliases): the issue doesn't attribute them to an agent. Dropped as evidence of agent behaviour.
- **Sonar's GPT-5 "~25 code smells per 1,000 lines"** (search snippet from a Sonar blog): not opened. UNVERIFIED.
- **Claude system cards on reward hacking:** search found nothing tying hard-coding or test special-casing to lint suppression or dead code. Not used.
- **anthropics/claude-code issue #1638** (refactors that change behaviour): about deleted functionality, not leftover code. Dropped.
- **Nguyen & Nadi (MSR 2022)**, Copilot on LeetCode: measures correctness and understandability, not dead code or duplication. Not used.
- **"Who Finishes the Job?" (arXiv 2609.26847, EMSE submission):** merged agent PRs attract verified follow-up fixes at 1.62× the odds of human PRs. Verified from the abstract only; not about dead code. Optional context.
