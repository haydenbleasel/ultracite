# Import cycles and barrel files: literature and source notes

Compiled 2026-10-13 for the Ultracite research post on import cycles and barrel files: `import/no-cycle` (Oxlint, and `import-x/no-cycle` in ESLint), Biome's `noImportCycles`, `import/no-self-import`, Oxlint's `oxc/no-barrel-file`, Biome's `noBarrelFile` and `noReExportAll`, and the namespace-import rules (`import/no-namespace`, Biome's `noNamespaceImport`). It also covers the "Avoid barrel files (index files that re-export everything)" line in the rules Ultracite writes into AGENTS.md.

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the official docs, the spec, the tool's source code, or the GitHub issue or PR) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex, Semantic Scholar or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single practitioner or company report, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research or claims by a company that sells a product in this space (Vercel, VoidZero/Oxc, the Rspack team at ByteDance, Anthropic, Cursor, Sonar, CodeScene).

Every quote is copied exactly and is under 15 words.

**About the "my check" items.** A few entries in section 4 report quick runs made on 13 Oct 2026 with Oxlint 1.86.0 (the worktree's binary) in a throwaway fixture. These were ad-hoc checks and their scripts were not kept. Re-run them with the `research/` harness before putting any of them in the post.

**How sources were fetched.** Pages and PDFs were read with WebSearch, WebFetch and unauthenticated `curl` (Crossref without `mailto`, OpenAlex, arXiv, Wayback). Some GitHub issues, PRs, release notes and source files were read with the `gh` CLI, which authenticates with the local GitHub login. Those calls were read-only lookups of public repositories, and no email or account detail was put in any URL or query. Section 5 lists its own `gh` use.

---

## Most useful for the post

1. **The rule is older than JavaScript, and it was always about testing and change.**
   - Parnas (CACM 1972) wants the "uses" relation to be "a partial ordering," so you can "cut off the upper levels and still have a usable and useful product."
   - Parnas (IEEE TSE 1979) states it as a rule: restrict "uses" "so that its graph is loop free." Otherwise "nothing works until everything works." His fix for mutual use, "sandwiching," splits one module so each half sits on one side of the other. It is the same move as extracting shared code into a third file. (1.1, 1.2)
2. **Lakos named it "levelization" (1996), and Martin named it the Acyclic Dependencies Principle.**
   - Lakos's _Large-Scale C++ Software Design_ (10 Jul 1996) has a section on "Acyclic Physical Dependencies" and a whole chapter of cycle-breaking techniques ("Escalation," "Demotion," "Callbacks"…).
   - Martin first stated it on Usenet on 16 Mar 1995: "The dependency structure for released components must be a DAG." It was named in "Granularity" (_C++ Report_, Nov 1996), with "the morning after syndrome." With a cycle, packages "have, in effect, become one large package."
   - Note the unit: Martin meant released packages, not files. (1.4, 1.5)
3. **Go made it a compile error, and Pike explained why.** The spec: "It is illegal for a package to import itself, directly or indirectly." Pike (SPLASH 2012): cycles entangle "huge swaths of the source tree," and "The lack of circular imports causes occasional annoyance but keeps the tree clean." Bazel, Cargo, Java modules and C++20 modules forbid cycles too, but every one does it at a coarse unit (package, crate, target, module). JavaScript's rule works per file, which is stricter. (1.6, 1.7)
4. **What a cycle does in JavaScript depends on the module system.**
   - CommonJS returns "an unfinished copy" of the exports object, so you silently get `undefined` (Node docs).
   - ES modules resolve cycles by design (the spec models them as strongly connected components). But at link time only `function` declarations are initialised. A `const`, `let` or `class` export read during top-level evaluation throws "Cannot access 'X' before initialization."
   - MDN: "Cyclic imports don't always fail," and "You should usually avoid cyclic imports." (2.1–2.4)
5. **Cycles are latent: they break when something else changes evaluation order.**
   - Rollup only guarantees dependency-first execution when "there are no circular imports."
   - Vite's HMR does a full reload inside a cycle "to recover the execution order."
   - In Next.js #91906, code that "lived in production for months" started throwing after a toolchain update, because `import { type X }` under `verbatimModuleSyntax` keeps a runtime edge.
   - Redux Toolkit changed `createSlice` in 1.7.0 to "eliminate circular dependencies as a runtime error" between slice files. (2.5–2.7)
6. **Barrels are a common way to create cycles.**
   - NestJS's docs warn that "A circular dependency can also be caused by using "barrel files"".
   - TkDodo: importing your own folder's barrel "will create a circular import."
   - TypeScript's auto-import preferred parent barrels from 4.4. Andrew Branch: that "often creates an import cycle between a barrel re-export and the file." It took fixes in 2022 and 2024 to stop. (2.8, 4.4, 4.11)
7. **Cycles are everywhere in mature code.**
   - Melton and Tempero (EMSE 2007, 78 Java apps): "around 45% have a cycle involving at least 100 classes."
   - Al-Mutawa (103 systems): "Nearly none … are cycle–free," but about half of all tangles are two classes.
   - Arcan on 782 Java and Python projects: Cyclic Dependency is 63% of all architectural smells.
   - Wlaschin's informal count: 14 of 15 C# projects had cycles against 2 of 14 F# projects, where the language makes them hard. (3.1, 3.12, 3.15, 1.8)
8. **Code in and around cycles is consistently more defect- and change-prone, but size explains part of it.**
   - About 65% of defect-prone classes are in cycles, while cyclic classes are about 44% of all classes (Oyetoyan et al., six systems; Hedges' g mostly "large").
   - Files in cross-module cycles had 75%–490% higher bug frequency than the average file (Mo et al., WICSA 2015).
   - But in-cycle classes are bigger. Once size is controlled for, Cyclic Dependency predicts change in only 12–29% of commits, down from 39.7% (Sas et al. 2022). (3.2, 3.3, 3.8, 3.10)
9. **Cycles persist, and fixing them is risky.**
   - Over 99% of in-cycle components stay in a cycle the next release, with "no evidence" of systematic cycle-breaking (Oyetoyan, 2014).
   - In an industrial study, 43% of cycles grew and 21% shrank. One removal attempt cost a team "two or three months" (Sas et al., 2022).
   - The commonest real fix is deleting dead code: 40% of 587 resolved two-class cycles (Feng et al., EMSE 2024). 10.5% of attempts just moved the cycle. (3.5, 3.11, 3.14)
10. **There is no JS/TS study of import cycles.** Every quantitative result is Java, C/C++, C# or Python. Arcan's authors warn that dynamic imports make cycle detection "less amenable to static detection" in Python. Say this plainly in the post. (3.15, 3.19)
11. **The barrel cost argument rests on one synthetic benchmark and a handful of migrations.**
    - Hagemeister (8 Oct 2023): loading 10,000 empty modules took 3.12 s, and 50,000 took 48.44 s. His "60-80% faster" isn't measured.
    - Vercel (vendor): `@material-ui/icons` went from 11,738 to 632 modules and 10.2 s to 2.9 s.
    - Atlassian (26 Jun 2025): "75% reduction in build minutes consumed," mostly from test selection running 88% fewer tests. TypeScript highlighting improved "more than 30%."
    - No peer-reviewed study exists. (4.1–4.3, 4.16)
12. **Tree shaking doesn't help where barrels cost the most.**
    - Dev servers, test runners, Node and type checking load everything a barrel re-exports. Vite: "all the files in that barrel file need to be fetched and transformed."
    - Jest's creator in 2025: "Do not use barrel files."
    - Bundlers skip barrels only when a package is marked side-effect-free (webpack `sideEffects`, Rspack `lazyBarrel`). (4.8–4.10)
13. **The counter-case is real but narrow.**
    - A package needs an entry point. TkDodo calls that "the only place where a barrel makes sense," and Node's `exports` map is the documented way to declare it.
    - Angular told developers to "**Do** create" barrels in early 2016, softened it to "Consider" in May, and dropped it in September: they "remain valuable but are not a matter of Angular style."
    - Atlassian names what it lost: "Packages can no longer easily control their “public API” through barrel files." (4.12, 4.13, 4.3)
14. **"Barrel file" means three different things to three linters,** and none can tell a package entry from an internal folder index.
    - Biome flags any file with one value `export … from`.
    - Oxlint flags only `export *` subtrees over 100 modules. My check found it flags type-only `export type *` and ignores 120 named re-exports.
    - eslint-plugin-barrel-files uses an exports-to-declarations ratio. (4.14)
15. **The namespace-import case is weaker than the barrel case.** webpack 5 tracks `ns.x` through namespace imports, and Biome's own docs concede it. The real problem is computed `ns[key]` access, which Biome's `noDynamicNamespaceImportAccess` targets. TC39's `import defer` only works with namespace imports. (4.15)
16. **Cycle detection is expensive because lint is per-file.**
    - eslint-plugin-import's docs: "This rule is comparatively computationally expensive." It offers `maxDepth` "as a cost/benefit tradeoff." typescript-eslint recommends running it only in CI.
    - Users report 305 s (97% of lint time), 67 s and out-of-heap crashes.
    - Angular CLI turned its cycle warnings off by default for "rebuild performance."
    - Biome needed a project scanner first ("A file scanner comes with its baggage: slowness"). Oxlint builds one shared module graph in parallel. (6.1–6.3, 2.5)
17. **The tools disagree on type-only edges.**
    - `import type` is ignored by default everywhere.
    - `import { type X }` is ignored by Oxlint and eslint-plugin-import, but counted by Biome, because under `verbatimModuleSyntax` it becomes `import {} from`. Next.js #91906 shows that edge throwing at runtime.
    - dependency-cruiser and madge count type-only edges by default.
    - A companion rule (`no-import-type-side-effects` / `prefer-top-level`) closes the gap. (6.4)
18. **How a cycle rule can be dodged:** a `maxDepth` cap, moving one import into a dynamic `import()`, an unresolved alias, or a type annotation. Feng et al. found the Java version of the dynamic-import move (reflection) among real cycle "fixes." (6.6, 3.14)
19. **Nobody has measured whether agents write barrels or cycles in JS/TS.** The only causal study (Larsen and Moghaddam, SEAA 2026; 151 Java repos, 1,811 Arcan snapshots) found smell counts "essentially unchanged (+1.1%, p = 0.82)" after agent adoption while code grew 12.8%. Cyclic-dependency density moved −5.0%, not significant after correction. The design-issue studies of AI-built projects (Kashif et al.; Zhu et al.) don't look at the module graph: their tools suit "file-level design issues." (5.1–5.3)
20. **The one well-documented agent-made barrel cycle is an anecdote, and it is the textbook failure.** In claude-code issue #36673 (20 Mar 2026), Claude Code (Opus 4.6) added an import whose cycle ran through a `repositories/index.ts` barrel. Production threw "Cannot access 'T' before initialization," and four unverified fixes were pushed. The reporter asked that Claude "detect circular dependencies before adding new imports." (5.9)
21. **Agents fix cycles badly from an error message and well from a graph.**
    - Pasting the ImportError produced another function-level import, "technically correct, completely useless." A `pydeps` graph, one cycle per PR, cleared 37 cycles (DEV, Oct 2026).
    - SmellBench: failing agents "stop at analysis" and never do the multi-file import rewrites.
    - Böckeler: an agent violated new dependency-cruiser rules "a handful of times" and then self-corrected from the tool's output.
    - That argues for lint output that names the full cycle path, which all three linters print. (5.4, 5.9)
22. **Agents are told both things.**
    - Many CLAUDE.md and AGENTS.md files say "Use barrel exports (`index.ts`) for each module," and many others "Don't add barrel `index.ts` exports" (my sample).
    - In AIDev's 33,596 curated agent PRs, barrels are added in 3 and removed in 6, mostly as assigned tasks. About 8 PR titles concern import cycles, and all of them fix or detect one (my check).
    - Vendors split too. Vercel's agent skill rates barrel _imports_ from libraries "CRITICAL." Callstack's React Native skill: "Barrel files make cycles easier to create accidentally." React Doctor made `no-barrel-import` opt-in in Sep 2026 as "unmeasured performance advice." Anthropic and Cursor document neither. (5.6–5.8)

---

## 1. History of acyclic dependencies

### 1.1 Parnas, "On the criteria to be used in decomposing systems into modules" (CACM 1972). VERIFIED (full text)

- **Citation:** D. L. Parnas, _Communications of the ACM_ 15(12):1053–1058, December 1972. https://doi.org/10.1145/361598.361623 (OpenAlex: 4,702 citations). Full text read from a course mirror, https://www.win.tue.nl/~wstomv/edu/2ip30/references/criteria_for_modularization.pdf
- **The paper is about information hiding, not cycles.** Its acyclicity point is one section near the end, "Hierarchical Structure," which builds on Dijkstra's THE system (1.3).
- **What it says:**
  - A system has "a hierarchical structure" if a relation between its modules "is a partial ordering." The relation is "uses" or "depends upon."
  - Two benefits of the ordering: lower levels simplify the upper ones, and you can "cut off the upper levels and still have a usable and useful product."
  - If "low level" modules used "high level" ones, "we would not have the hierarchy" and it would be "much harder to remove portions of the system."
  - His conclusion keeps the two ideas apart: "hierarchical structure and "clean" decomposition are two desirable but independent properties."
- **For the post:** cite 1972 for the idea that the "uses" relation should be a partial order (no cycles). Cite 1979 (1.2) for the explicit "loop free" rule and the reasons.

### 1.2 Parnas, "Designing Software for Ease of Extension and Contraction" (IEEE TSE 1979). VERIFIED (full text)

- **Citation:** D. L. Parnas, _IEEE Transactions on Software Engineering_ SE-5(2):128–138, March 1979. https://doi.org/10.1109/TSE.1979.234169. Full text: https://www.dre.vanderbilt.edu/~schmidt/PDF/family.pdf (a scan of the IEEE pages; "Manuscript received June 7, 1978").
- **The failure mode, in a section titled "Loops in the "Uses" Relation":** without restraint, "one may end up with a system in which nothing works until everything works." His example: a scheduler that stores data through the file system means the file system "must be present and working before any task scheduling is possible."
- **The rule:** "By restricting the relation "uses" so that its graph is loop free we can retain the primary advantages" of reuse "while eliminating the problems." Level 0 is programs that use nothing; level _i_ uses at least one program on level _i_−1 and nothing higher. Then "each level offers a testable and usable subset of the system."
- **Trade-off he accepts:** "some duplication of effort seems preferable" to a system "in which nothing runs unless everything runs." (Compare Go's "a little copying," 1.6.)
- **How to break a cycle ("sandwiching"):** if A would benefit from using B and B from using A, split B into B1 and B2, let A use B2 and B1 use A. "The result would appear to be a sandwich with B as the bread and A as the filling." This is the same move as extracting the shared part of two mutually importing JS modules into a third module.
- **Design advice:** "The design of the "uses" hierarchy should be one of the major milestones in a design effort."

### 1.3 Dijkstra, "The structure of the 'THE'-multiprogramming system" (CACM 1968). VERIFIED (metadata only)

- **Citation:** E. W. Dijkstra, _Communications of the ACM_ 11(5):341–346, 1968. https://doi.org/10.1145/363095.363143 (OpenAlex record checked).
- Parnas 1972 cites it for the idea of a layered "program hierarchy." I didn't open the paper; cite it only as the origin of layers, via Parnas.

### 1.4 Lakos, _Large-Scale C++ Software Design_ (Addison-Wesley 1996). VERIFIED (publisher page and table of contents; book not opened)

- **Citation:** John Lakos, Addison-Wesley Professional Computing Series. Publisher page: "Published Jul 10, 1996," copyright 1997. ISBN 0-201-63362-0. https://www.informit.com/title/0201633620
- **Publisher description:** the book covers "techniques designed to eliminate cyclic, compile-time, and link-time (physical) dependencies." "Such systems with their acyclic physical dependencies are fundamentally easier and more economical" to "maintain, test, and reuse than tightly interdependent systems."
- **Table of contents (from the same page):**
  - Chapter 4, "Physical Hierarchy," has sections "Acyclic Physical Dependencies," "Level Numbers," "Hierarchical and Incremental Testing," "Cyclic Physical Dependencies" and "Cumulative Component Dependency (CCD)."
  - Chapter 5, "Levelization," is a catalogue of cycle-breaking techniques: "Some Causes of Cyclic Physical Dependencies," "Escalation," "Demotion," "Opaque Pointers," "Dumb Data," "Redundancy," "Callbacks," "Manager Class," "Factoring," "Escalating Encapsulation."
  - Appendix C is "A Dependency Extractor/Analyzer Package," a cycle-finding tool.
- **For the post:** the word "levelization" and the framing of acyclic physical dependencies as a testing argument (Chapter 4 opens with "A Metaphor for Software Testing") are safe to cite from the TOC. Don't quote the book's definitions without opening it.

### 1.5 Robert C. Martin and the Acyclic Dependencies Principle (1995–1996). VERIFIED

- **Earliest primary source: a Usenet post, 16 March 1995.** Robert Martin, comp.object, thread "The Ten Commandments of OO Programming" (started by Jim Fleming the day before). https://groups.google.com/g/comp.object/c/WICPDcXAMG8/m/EbGa2Vt-7q0J. His list of 11 principles includes, as item 7: "The dependency structure for released components must be a DAG." "There can be no cycles." Items 1–3 are the open/closed, Liskov and dependency inversion principles; items 4–6 and 8–9 became the other package principles.
- **First use of the name in print: "Granularity," C++ Report, Nov 1996.** Robert C. Martin, "Engineering Notebook: Granularity," _C++ Report_ 8(10):57–62, November 1996 (bibliographic details from the bibliography of _The Elements of C++ Style_, Cambridge UP). The column calls itself "the fifth of my Engineering Notebook columns." Text read from a course copy: https://staff.cs.utu.fi/~jounsmed/doos_06/material/Granularity.pdf
  - The principle, in capitals: "THE DEPENDENCY STRUCTURE BETWEEN PACKAGES MUST BE A DIRECTED ACYCLIC GRAPH (DAG)."
  - The motivating story is "the morning after syndrome": your code worked when you left and is broken in the morning "Because somebody stayed later than you!"
  - With a cycle, three packages "must always be released at the same time." "They have, in effect, become one large package."
  - The testing cost: to unit test one package "we must link in every other package in the system." "This is intolerable."
  - "compile times grow geometrically with the number of modules" (his assertion, no data).
  - Two ways to break a cycle: apply dependency inversion, or "Create a new package that both MyDialogs and MyApplication depend upon."
  - "the dependency structure must always be monitored for cycles," because the structure "jitters and grows."
- **Later restatements** (not opened): _Agile Software Development: Principles, Patterns, and Practices_ (2002) and _Clean Architecture_ (2017), chapter 14 "Component Coupling" (O'Reilly returned 403).
- **Note the unit:** Martin's principle is about **released packages/components**, not files. Applying it to individual ES modules is a stricter reading. Lakos's is about physical components (a header and its implementation file), which is closer to a JS module.

### 1.6 Go: import cycles are illegal. VERIFIED (spec, Pike's talk, compiler source)

- **The spec** (https://go.dev/ref/spec, "Import declarations"): "It is illegal for a package to import itself, directly or indirectly." The same sentence also bans importing a package without using it.
- **The error string** is `import cycle not allowed`, in `src/cmd/go/internal/load/pkg.go` (golang/go master, checked 13 Oct 2026).
- **The rationale is Rob Pike, "Go at Google: Language Design in the Service of Software Engineering," SPLASH 2012** (https://go.dev/talks/2012/splash.article), section on dependencies. There is no FAQ entry on import cycles; the FAQ only covers unused imports.
  - "Another feature of the Go dependency graph is that it has no cycles." The compiler and linker "both check that they do not exist."
  - "Although they are occasionally useful, circular imports introduce significant problems at scale."
  - Build cost: they make the compiler "deal with larger sets of source files all at once, which slows down incremental builds."
  - The bigger cost: they end up "entangling huge swaths of the source tree into large subpieces" that are "difficult to manage independently," which bloats binaries and complicates "initialization, testing, refactoring, releasing."
  - The trade: "The lack of circular imports causes occasional annoyance but keeps the tree clean." It forces programmers "to think earlier about a larger-scale issue (in this case, package boundaries)."
  - Next paragraph: "It can be better to copy a little code" than to pull in "a big library for one function." "Dependency hygiene trumps code reuse."
- **Unit:** Go's rule applies to **packages** (directories). Files within one package can reference each other freely.

### 1.7 Other languages and build systems that forbid cycles by design. VERIFIED (each spec, doc or source)

| System | Unit | What is forbidden | Source |
| --- | --- | --- | --- |
| Go | package | "illegal for a package to import itself, directly or indirectly" | Go spec |
| Bazel | target | "The depends upon relation induces a Directed Acyclic Graph (DAG) over targets" | https://bazel.build/concepts/dependencies |
| Cargo (Rust) | package/crate | error `cyclic package dependency: package ... depends on itself. Cycle:` | `src/resolver/mod.rs` in rust-lang/cargo |
| Java (JPMS) | module | resolution fails if "the current module directly or indirectly expresses a dependence on itself" | JLS SE 21 §7.7.1, https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html |
| C++20 modules | translation unit | "A translation unit shall not have an interface dependency on itself"; example comment "error: cyclic interface dependency" | [module.import]/10, https://eel.is/c++draft/module.import |
| F# | file | Files compile in order, so a file can't refer to a later one. Mutual recursion needs one file and `namespace rec`, which "can alleviate some pains in not being able to write mutually referential code" | Microsoft F# docs, "Namespaces" |

- **The pattern:** every one of these forbids cycles at a **coarse** unit (package, crate, target, module) and allows mutual references **inside** it. JavaScript has no unit above the file, so `import/no-cycle` applies the rule at the finest grain. That is stricter than Go or Rust, and worth saying.
- **What I didn't verify:** a doc stating that modules _inside_ a Rust crate may form cycles. It is true in practice, but I found no primary sentence; don't state it as documented.

### 1.8 Wlaschin, "Cycles and modularity in the wild" (2013): C# vs F#. ANECDOTAL (practitioner analysis; data published)

- **Source:** Scott Wlaschin, F# for Fun and Profit, 28 May 2013 (updated 15 Jun 2013), https://fsharpforfunandprofit.com/posts/cycles-and-modularity-in-the-wild/. Part of his "Dependency cycles" series.
- **Method:** compiled assemblies from NuGet, analysed with Mono.Cecil, strongly connected components with QuickGraph. Top-level types stand in for files. He says it is "not a proper statistical study, just a quick analysis." Script and raw data linked.
- **Numbers (his tables):**
  - **C#:** 14 of 15 projects had at least one cycle (YamlDotNet had none). 683 of 3,869 top-level types (18%) were in a cycle. Cecil: 125 of 240 types (52%), largest cycle 123 types. Json.NET: 41%, largest 83. NUnit: 46%, largest 78. Entity Framework: 14 cycles, 24% of types.
  - **F#:** 2 of 14 projects had any cycle. 7 of 692 top-level types (1%). FSharp.Core's largest cycle was 3 types.
- **Quotes:** "In C#, there is nothing stopping you from creating cycles". "In F#, of course, it is the other way around."
- **Use:** a vivid illustration that language design, not discipline, sets the cycle rate. Not a controlled study: different project types, sizes and authors.

---

## 2. How cycles behave in JavaScript

### 2.1 CommonJS: a cycle hands you a half-built `exports` object. VERIFIED (Node.js docs, v26.11.1)

- **Source:** Node.js API docs, "Modules: CommonJS modules," section "Cycles," https://nodejs.org/api/modules.html#cycles
- **What it says:**
  - With "circular require() calls, a module might not have finished executing when it is returned."
  - In the `a.js`/`b.js` example, "an unfinished copy of the a.js exports object is returned to the b.js module." The output shows `in b, a.done = false`.
  - Advice: "Careful planning is required to allow cyclic module dependencies to work correctly within an application."
  - The caching section adds that caching is what lets "partially done" objects be returned, "allowing transitive dependencies to be loaded even when they would cause cycles."
- **For the post:** in CommonJS a cycle doesn't throw. You get `undefined` (or a stale value) for whatever wasn't assigned yet. That is the "undefined value" every linter's rule doc warns about.

### 2.2 `require(esm)` refuses cycles outright. VERIFIED (Node.js errors docs)

- **Source:** https://nodejs.org/api/errors.html#err_require_cycle_module
- `ERR_REQUIRE_CYCLE_MODULE`: when a CommonJS-to-ESM or ESM-to-CommonJS edge "participates in an immediate cycle," Node throws. Because "ES Modules cannot be evaluated while they are already being evaluated." The fix: make the `require()` call lazily, "in an inner function."
- Node's errors page shows `require()` of synchronous ES modules enabled by default in v23.0.0, v22.12.0 and v20.19.0.

### 2.3 ES modules: the spec models cycles as strongly connected components. VERIFIED (ECMA-262 draft, 9 Oct 2026)

- **Source:** ECMA-262, https://tc39.es/ecma262/, §16.2.1.6 "Cyclic Module Records" (section numbers move between editions; cite by name).
- **Cycles are a designed-for case:** a Cyclic Module Record represents "a module that can participate in dependency cycles with other modules."
- **Link and Evaluate walk the graph depth-first and group cycles into SCCs** (Tarjan-style). `[[DFSAncestorIndex]]` is the module's depth-first index "or that of an "earlier" module in the same strongly connected component." `[[CycleRoot]]` is "the first visited module of the cycle." The spec includes a non-normative section, "Example Cyclic Module Record Graphs," focused on "how errors can occur."
- **Why functions survive a cycle and `const` doesn't** (§16.2.1.7.3.1 InitializeEnvironment, run at link time before any module body executes):
  - `var` bindings are created and initialised to `undefined`.
  - Function, generator and async function declarations are instantiated and bound ("InstantiateFunctionObject").
  - `let`, `const` and `class` bindings are created but not initialised.
- **Imports are live, indirect bindings.** Module Environment Record GetBindingValue: for an indirect binding "the value of the target binding is returned." "If the binding exists but is uninitialized a ReferenceError is thrown."
- **The temporal dead zone** (§14.3.1): `let`/`const` variables "may not be accessed in any way until the variable's LexicalBinding is evaluated."
- **Consequence for the post:** in an ESM cycle, the module evaluated first sees its partner's `function` exports fine, its `var` exports as `undefined`, and its `const`/`let`/`class` exports as a thrown `ReferenceError`, but only if it touches them during top-level evaluation. Access inside a function called later is fine. This is why many cycles sit harmlessly for months and then break when evaluation order changes (2.7).

### 2.4 "Cannot access 'X' before initialization." VERIFIED (V8 source, MDN)

- **V8 message template:** `AccessedUninitializedVariable`, "Cannot access '%' before initialization" (`src/common/message-template.h`, v8/v8 main).
- **MDN** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_access_lexical_declaration_before_init) lists the per-engine messages:
  - V8: `ReferenceError: Cannot access 'X' before initialization`
  - Firefox: `ReferenceError: can't access lexical declaration 'X' before initialization`
  - Safari: `ReferenceError: Cannot access uninitialized variable.`
  - "This error can also occur in cyclic imports," when a module uses a variable that "depends on the module itself being evaluated."
- **MDN's modules guide, "Cyclic imports"** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules):
  - "Cyclic imports don't always fail." The value is read when used, "and only if the variable remains uninitialized at that time will a ReferenceError be thrown."
  - "You should usually avoid cyclic imports in your project," because "they make your code more error-prone."
  - Its three fixes: "Merge the two modules into one." "Move the shared code into a third module." "Move some code from one module to the other." (Parnas's sandwiching and Martin's "new package," restated.)
  - And: cycles "can also occur if the libraries depend on each other, which is harder to fix."

### 2.5 Bundlers. VERIFIED (Rollup docs and source, plugin README, Angular CLI PRs)

- **Rollup warns by default.** Log code `CIRCULAR_DEPENDENCY`, message `Circular dependency: a.js -> b.js -> a.js` (`src/utils/logs.ts`). Rollup also has `CIRCULAR_CHUNK`, `CIRCULAR_REEXPORT` and `CYCLIC_CROSS_CHUNK_REEXPORT`. Its config docs show an `onLog` handler that returns early with the comment "Ignore circular dependency warnings," which is how many projects treat it.
- **Rollup's ordering guarantee has a cycle exception.** The FAQ: if A imports B "and there are no circular imports, then B will always be executed before A." https://rollupjs.org/faqs/
- **Rollup's FAQ also sells cycles as an ESM feature:** ES modules "provide advanced features like circular references and live bindings." That is the counter-view: the format supports cycles; the question is whether your code does.
- **Rollup's `output.externalLiveBindings: false`** "can cause issues when there are circular dependencies involving an external dependency."
- **webpack has no built-in warning.** The community `circular-dependency-plugin` (Aaron Ackerman; first published 11 Dec 2015, latest 5.2.2) fills the gap. Its README: "Circular dependencies are often a necessity in complex software," and their presence "doesn't always imply a bug." Options include `failOnError` and `allowAsyncCycles`.
- **Angular CLI turned cycle warnings on, then off for speed.**
  - PR #6813 (Filipe Silva, merged 27 Jun 2017) added "WARNING in Circular dependency detected." Its rationale: cycles "might lead to `Maximum call stack size exceeded` errors, or imports being `undefined` at runtime."
  - PR #20278 (Alan Agius, merged 16 Mar 2021) changed the default to off, because it "is a caused of rebuild performance degradation for large projects." Marked BREAKING CHANGE.
  - PR #22599 (merged 31 Jan 2022) removed the deprecated `showCircularDependencies` option.
  - The lesson: whole-graph cycle checks have a cost, and a widely used toolchain dropped them from every build for that reason.
- **esbuild:** its API, content-types and FAQ pages don't mention circular imports. I found no documented esbuild behaviour to cite.

### 2.6 HMR and cycles. VERIFIED (Vite docs and PR)

- **Vite troubleshooting** (https://vite.dev/guide/troubleshooting, "A full reload happens instead of HMR"): inside "a circular dependency, a full reload will also happen to recover the execution order." "To solve this, try breaking the loop." `vite --debug hmr` logs the cycle path.
- **Where that came from:** PR #14867, "feat(hmr): improve circular import updates," by bluwy, merged 8 Nov 2023. If the accepted module "is within an import loop, updating itself can break the execution order." It closed issues including #3033, "HMR error: Cannot access '...' before initialization" (opened 17 Apr 2021, 68 comments).
- **React Fast Refresh:** the Next.js, React Native and Gatsby Fast Refresh docs I checked describe full-reload fallbacks (non-component exports, edits imported from outside the React tree) but don't mention cycles. Don't claim they do.

### 2.7 Cycles are latent until something changes evaluation order. ANECDOTAL (GitHub issues) plus VERIFIED library docs

- **Next.js #91906** (25 Mar 2026), "verbatimModuleSyntax + type "circular dependency" cause ReferenceError in Turbopack": `Cannot access 'x' before initialization` after a Next.js canary update. "The impacted code has lived in production for months before this." The maintainer's diagnosis (26 Aug 2026): `import { type KeyValueObject } from "./b"` "is emitted as `import {} from "./b"`," which "preserves a runtime side-effect edge and exposes the circular dependency." The fix was `import type`. Closed as expected behaviour. This ties directly to 6.4.
- **Next.js #34578** (19 Feb 2022): decorated classes referencing each other broke with "ReferenceError: Cannot access 'Parent' before initialization" between two canaries.
- **Redux Toolkit 1.7.0 (10 Dec 2021, Mark Erikson) changed a library to tolerate cycles.** The release notes: when two slice files import each other's actions, "This circular import then causes runtime errors," because one module "will not have finished initializing." `createSlice` now builds its reducer lazily, which "should **eliminate circular dependencies as a runtime error in `createSlice`**." The current usage guide still offers the cycle-free alternative: put the shared action in its own file with `createAction`.
- **NestJS documents barrels as a cause of cycles** (see 2.8).

### 2.8 Barrel files create cycles. VERIFIED (NestJS docs and maintainer comment)

- **NestJS docs, "Circular dependency"** (https://docs.nestjs.com/fundamentals/circular-dependency; source `content/fundamentals/circular-dependency.md`):
  - "Avoid circular dependencies where possible, but you can't always do so." Nest offers `forwardRef()` and `ModuleRef` as escape hatches.
  - Warning box: "A circular dependency can also be caused by using "barrel files"" (`index.ts` files). "Avoid barrel files for module and provider classes." Concretely, `cats/cats.controller` "should not import `cats` to import the `cats/cats.service` file."
- **The origin:** nestjs/nest issue #1181, "Application crash when using barrel files (multi index.ts)" (9 Oct 2018). Kamil Myśliwiec, 16 Oct 2018: suggests "omitting barrel files when it comes to module's providers/module class," and if you keep one, "you shouldn't use it from within the same module itself [only from outside]."
- **For the post:** this is the bridge between the two halves. A file that imports its own directory's `index.ts` depends on every sibling the barrel re-exports, so any sibling that imports the first file closes a cycle.

---

## 3. Research on dependency cycles

PDFs were downloaded to `scratchpad/ic-pdfs/` and read with `pdftotext`. Metadata was checked against Crossref (no `mailto`) and OpenAlex. Two numbering conventions to keep straight: "SCC" (strongly connected component) is the set of nodes that are all mutually reachable, so one SCC can contain many elementary cycles; "tangle" (Al-Mutawa, Dietrich) is a synonym for a non-trivial SCC. Every study in this section is about Java, C/C++, C# or Python. **None is about JavaScript or TypeScript module graphs** (see 3.19).

### 3.1 Melton and Tempero, "An empirical study of cycles among classes in Java" (EMSE 2007). VERIFIED (full author preprint; published version not opened)

- **Citation:** Hayden Melton and Ewan Tempero, _Empirical Software Engineering_ 12(4):389–415, 2007 (online January 2007; Crossref print date July 2007). https://doi.org/10.1007/s10664-006-9033-1
- **Full text read:** the 19-page author preprint from CiteSeerX (10.1.1.141.5362), fetched via the Wayback Machine because CiteSeerX and Springer block direct downloads. Its abstract matches the numbers below. I could not open the Springer version, so page-level wording may differ.
- **Corpus:** 78 open- and closed-source Java applications, 22 of them with multiple versions. Only the latest version of each was used for the prevalence figures. Cycles were computed from bytecode over top-level classes, which the authors say makes their numbers "a lower limit."
- **Headline (abstract):** of the applications large enough to contain such a cycle, "around 45% have a cycle involving at least 100 classes" and around 10% have one involving at least 1,000 classes.
- **By dependency relation (Section 5.1):**
  - `USES` (any reference): about 85% of applications have an SCC larger than 10 classes, about 40% larger than 100, and 3% larger than 1,000. The largest SCC is 2,145 classes.
  - `USES-IN-SIZE` (methods called, fields accessed): 81%, 36% and 3%. Largest 1,909.
  - `USES-IN-THE-INTERFACE` (types in non-private signatures only): 69%, 13% and 0%. Largest 542.
  - So types used only in the private parts of classes were "the major contributor to large SCCs" (Section 7.1).
- **Why that matters for `import type`:** the paper borrows Lakos's distinction between a type used "in name only" and one whose members are called. Lakos (via Melton and Tempero) argues a class can be tested, understood and reused independently of types it uses in name only. That is close to what a TypeScript type-only import is, so it supports not counting type-only edges. This is an analogy. The authors don't discuss JavaScript, and I didn't open Lakos pp. 247–256.
- **"Necessary" cycles:** Lakos's "intrinsic interdependency" (a `Node` that knows its `Edge`s and an `Edge` that knows its `Node`s) produces cycles the authors treat as necessary. Removing them in Java costs type safety.
- **Over time:** applications with several versions "tended to show over time more and more classes becoming involved in cycles." Dips came right after significant refactoring (ArgoUML, NetBeans, two closed-source products).
- **Anecdote:** at "company B," two products (B5 and B10) "had to be thrown away" because the code became too unwieldy. Both had a much higher share of classes in SCCs than the company's other products. One company, two products, no controls.
- **A line worth quoting for the agent angle:** programmers working one class at a time "lose sight of (or never see) the overall structure." Their summary: "successful modularisation has the propensity to breed dependency cycles."
- **Caveats:** prevalence only. It doesn't measure defects or change. It is about classes, not packages or files, and dates from 2006–2007.

### 3.2 Oyetoyan, Cruzes and Conradi, "A study of cyclic dependencies on defect profile of software components" (JSS 2013). VERIFIED (full text, as reprinted in Oyetoyan's PhD thesis)

- **Citation:** Tosin Daniel Oyetoyan, Daniela S. Cruzes, Reidar Conradi, _Journal of Systems and Software_ 86(12):3162–3182, 2013. https://doi.org/10.1016/j.jss.2013.07.039
- **Full text:** reprinted as Paper 2 of Oyetoyan's NTNU PhD thesis (2015:84), "Dependency cycles in software systems: quality issues and opportunities for refactoring." Handle https://hdl.handle.net/11250/297522 now redirects to the Norwegian NVA archive, whose download endpoint returned 403. I read the PDF through the Wayback copy of the old NTNU Open bitstream.
- **Systems:** six. Apache Camel, ActiveMQ and Lucene, Eclipse, openPDC (C#) and one commercial C# smart-grid application ("commApp"). Six releases for four of them and three for openPDC and Eclipse.
- **Groups:** "in-cycle" (in an SCC), "depend-on-cycle" (depends on an SCC member), together "cyclic-related," versus "non-cyclic."
- **Abstract finding:** "most defects and defective components are concentrated in cyclic-dependent components," directly or indirectly.
- **Share of defect-prone classes, cyclic vs non-cyclic (Table 5, class-file level, mean over releases):**

| System   | Cyclic group | Non-cyclic group | Hedges' g |
| -------- | ------------ | ---------------- | --------- |
| Camel    | 5.5%         | 1.8%             | 1.17      |
| ActiveMQ | 11.5%        | 2.3%             | 2.69      |
| Lucene   | 2.2%         | 1.5%             | 0.52      |
| commApp  | 15.2%        | 2.6%             | 1.73      |
| openPDC  | 2.2%         | 1.4%             | 0.35      |
| Eclipse  | 18.4%        | 11.3%            | 1.63      |

- **Effect sizes:** on Kampenes et al.'s software-engineering scale, package-level effects were all "large." At class level they were large for four systems, medium for Lucene and small for openPDC.
- **The confound the authors name:** classes in cycles are bigger. In ActiveMQ the in-cycle group is about 32.5% of classes but 55% of code. In Lucene the cyclic-related group is 38.8% of classes and 57.5% of code. Defect _density_ results are therefore mixed. At package level Camel's cyclic group has half the density of the rest, and at class level openPDC's is lower too. Size and coupling are known defect predictors on their own, so this is correlation, not cause.
- **Inconsistency inside the paper:** the text for commApp says 34% vs 9% of packages are defective, while Table 5 gives 17.3% vs 9.1%. Quote the table.

### 3.3 Oyetoyan, Cruzes and Conradi, "Can refactoring cyclic dependent components reduce defect-proneness?" (ICSM 2013, short paper). VERIFIED (full text in thesis)

- **Citation:** ICSM 2013, pp. 420–423. https://doi.org/10.1109/ICSM.2013.62
- **The clearest summary number in the series** (introduction, averaged over the six JSS systems):
  - About 65% of defect-prone class files are in cycles, while cyclic class files are about 44% of all class files.
  - Adding the depend-on-cycle neighbours brings it to about 80% of defect-prone class files.
  - About 90% of defect-prone packages are cyclic-related, while cyclic packages are about 58% of all packages.
- **New finding (Eclipse and ActiveMQ):** the size of the cyclic graph "consistently correlates more with the defect-proneness" than distance measures do. Adding components or edges to an existing cycle was more strongly linked to defect-proneness.
- **Use:** the 65% vs 44% comparison is a fair one-line statement of the effect. It is still a base-rate comparison with no size control.

### 3.4 Oyetoyan, Cruzes and Conradi, "Criticality of defects in cyclic dependent components" (SCAM 2013). VERIFIED (full text in thesis; numbers not extracted)

- **Citation:** SCAM 2013, pp. 21–30. https://doi.org/10.1109/SCAM.2013.6648180. Crossref author order: Oyetoyan, Conradi, Cruzes.
- **Abstract:** two systems (the commercial C# smart-grid app and ActiveMQ). Components in cyclic relationships "account for a significant and the most critical defects" and severely defect-prone components.
- **Caveat:** two systems. Severity labels come from each project's tracker.

### 3.5 Oyetoyan, Cruzes and Conradi, "Transition and defect patterns of components in dependency cycles during software evolution" (CSMR-WCRE 2014). VERIFIED (full text in thesis)

- **Citation:** CSMR-WCRE 2014, Antwerp, pp. 283–292. https://doi.org/10.1109/CSMR-WCRE.2014.6747180
- **Data:** four systems across releases (Eclipse, Apache CXF, the commercial app and one more).
- **Findings:**
  - Components that move between cycles from one release to the next are more likely to become defect-prone than components that move outside cycles.
  - Growth in the class reachability set (how many classes a class transitively reaches) was the complexity variable most associated with turning defective.
  - **Cycles almost never get broken.** In every system, over 99% of in-cycle components, defective or not, "persist in the in-cycle state in the next release." Eclipse moved 0.35% of in-cycle components out. The paper found "no evidence of any systematic “cycle-breaking” refactoring between releases."
- **RQ3 couldn't be answered:** too few components left cycles to test whether leaving one lowers defect-proneness. So there is no evidence here that breaking cycles fixes anything, only that cycles persist.

### 3.6 Oyetoyan, Falleri, Dietrich and Ježek, "Circular dependencies and change-proneness: an empirical study" (SANER 2015). VERIFIED (full text in thesis)

- **Citation:** SANER 2015, pp. 241–250. https://doi.org/10.1109/SANER.2015.7081834. Crossref and OpenAlex give the author order Oyetoyan, Falleri, Dietrich, Ježek. The thesis reprint lists Dietrich second; use Crossref's order.
- **Data:** 12 programs from the Qualitas Corpus (release 20120401) with at least 10 versions each, such as Ant (21 versions), ANTLR (20) and ArgoUML (16). Tests and generated parser code were removed.
- **Prevalence:** the share of classes inside SCCs ranged from 10.3% to 80.7%. FreeCol 80.7%, JGraph 77%, Hibernate 62.8%, FreeMind 55.3%.
- **The finding is narrower than the abstract suggests:**
  - Classes inside SCCs were significantly more change-prone than other classes in only 2 of 12 systems (FreeCol and JGraph).
  - When the SCC's direct neighbours were included, 75% of systems showed significant change-proneness. The authors call "the big impact of SCCs on their neighbourhood" the surprise. In Ant, SCCs plus their direct in-neighbours were 76.3% of classes and took 94% of the change volume.
  - The authors themselves note that adding neighbours enlarges the group, so more change is expected.
- **"Harmless" cycles:** neither subtype knowledge (a supertype that depends on its subtype) nor where the cycle sits in the package tree separated harmful from harmless cycles. Cycles from the Visitor pattern were relatively stable. Removing them from Hibernate's data raised the mean change probability of the remaining cycles from 17.9% to 19.6%.
- **Opening line:** the advice to avoid cycles "goes back to the earliest work on software design, and is well-established and rarely questioned."

### 3.7 Oyetoyan's thesis as a whole (NTNU 2015). VERIFIED (abstract and included-papers list)

- **Citation:** Tosin Daniel Oyetoyan, _Dependency cycles in software systems: quality issues and opportunities for refactoring_, PhD thesis, NTNU, 2015 (series 2015:84). ISBN 978-82-326-0824-9.
- **Framing (abstract):** "empirical evidence shows that modern software indeed is riddled with this anti-pattern."
- **Contents:** Papers 2–6 are the cycle papers above, plus a decision-support tool for breaking class cycles (Paper 7).

### 3.8 Mo, Cai, Kazman and Xiao, "Hotspot patterns" (WICSA 2015). VERIFIED (full PDF)

- **Citation:** Ran Mo, Yuanfang Cai, Rick Kazman, Lu Xiao, "Hotspot Patterns: The Formal Definition and Automatic Detection of Architecture Smells," WICSA 2015, pp. 51–60. https://doi.org/10.1109/WICSA.2015.12. Full text: DTIC report ADA621415 (read via the Wayback copy of the old dtic.mil URL, because apps.dtic.mil returned a bot page).
- **The five patterns:** Unstable Interface, Implicit Cross-module Dependency, Unhealthy Inheritance Hierarchy, **Cross-Module Cycle** and **Cross-Package Cycle**.
- **They don't count every cycle.** The rationale: "not all cyclical dependencies among files are equally harmful." Only cycles whose files are not all in the same "closest module" of the design-rule hierarchy count as Cross-Module Cycles.
- **Data:** nine Apache projects (Avro, Camel, Cassandra, CXF, Hadoop, HBase, Ivy, OpenJPA, PDFBox) plus one commercial project.
- **Results for Cross-Module Cycle (Table VI):**
  - Average bug frequency of files in such cycles was **75% to 490% above the project-wide file average**: OpenJPA +75.37%, PDFBox +104.83%, Commercial +117.44%, Cassandra +165.94%, Ivy +190.31%, Camel +241.43%, CXF +275.71%, Avro +309.68%, Hadoop +432.89%, HBase +489.95%.
  - Change frequency rose by 32.59% (Commercial) to 511.54% (HBase). The commercial project's bug churn fell slightly (−8.32%).
  - Unstable Interface and Cross-Module Cycle "contribute the most by far."
- **Dose-response:** the more hotspots a file is in, the more bugs and changes it has. Pearson r between the number of hotspots and average bug frequency was 0.76 to 0.97 across projects.
- **Caveats:**
  - The comparison is with the average file, with no control for size.
  - Pattern counts are elementary cycles, so they run very high (Ivy: 15,095 Cross-Module Cycle instances across 132 files).
  - All the subjects are Java.

### 3.9 Xiao, Cai, Kazman, Mo and Feng, "Identifying and quantifying architectural debt" (ICSE 2016). VERIFIED (full PDF); not about cycles directly

- **Citation:** Lu Xiao, Yuanfang Cai, Rick Kazman, Ran Mo, Qiong Feng, ICSE 2016, pp. 488–498. **DOI https://doi.org/10.1145/2884781.2884822** (Crossref). The PDF on Xiao's Stevens page (https://personal.stevens.edu/~lxiao6/papers/ICSE-16-Debt.pdf) prints `10.1145/2884781.2884825`, which Crossref assigns to Mo et al.'s "Decoupling Level" paper. Don't copy the DOI from the PDF.
- **What it measures:** "architectural debts," groups of architecturally connected files whose maintenance cost grows over releases. They are found through a history coupling probability matrix and four flaw patterns: **hub, anchor-submissive, anchor-dominant and modularity violation. Cycles are not one of the four.** A hub is a mutual dependency between an anchor file and its members, so it is cycle-like.
- **Findings:** seven Apache projects. 51% to 85% of maintenance effort went into the identified debts. The top 5 debts in each project covered 8% to 25% of error-prone files but 20% to 61% of maintenance effort.
- **Cycle-relevant line (background, describing Mo et al. 2015 above):** "cyclic dependency, where a set of files forms a dependency cycle." In nine projects there was "a strong correlation" between how many such flaws a file has and its bugs, changes and effort.
- **For the post:** cite this for "a few architectural problems absorb a large share of maintenance," not for cycles specifically.

### 3.10 Sas, Avgeriou, Pigazzini and Arcelli Fontana, "On the relation between architectural smells and source code changes" (JSEP 2022). VERIFIED (full open-access PDF)

- **Citation:** Darius Sas, Paris Avgeriou, Ilaria Pigazzini, Francesca Arcelli Fontana, _Journal of Software: Evolution and Process_ 34(1):e2398, 2022 (online 2021). https://doi.org/10.1002/smr.2398. Open access (CC BY-NC).
- **Data:** 31 open-source Java systems. Arcan detected four smells: Cyclic Dependency (CD), Hub-Like Dependency, Unstable Dependency and God Component.
- **Overall:** in 87% of analysed commits, artifacts with at least one smell changed more. The likelihood of change rises with the number of smells, and change frequency rises after a smell appears.
- **Cyclic Dependency, controlled for size (Table 4):** CD was a significant predictor of change in 12.2% of commits for small artifacts, 14.1% medium-small, 20.2% medium-large and 29.1% large. Without size control it was 39.7%. **Controlling for size roughly halves or more the apparent effect,** and it is concentrated in large files.
- **Their reading:** "potentially not all types of cycles are impactful on changes," which agrees with Oyetoyan et al. 2015.
- **Caveat:** correlational. It is change frequency and size, not defects.

### 3.11 Sas, Avgeriou and Uyumaz, "On the evolution and impact of architectural smells—an industrial case study" (EMSE 2022). VERIFIED (full arXiv preprint)

- **Citation:** Darius Sas, Paris Avgeriou, Umut Uyumaz, _Empirical Software Engineering_ 27(4), 2022. https://doi.org/10.1007/s10664-022-10132-7. Preprint: https://arxiv.org/abs/2203.08702. The industrial partner is ASML (the third author's affiliation).
- **Data:** 9 C/C++ embedded projects, more than 30 releases each over two years, over 20 million lines in the last release. Plus 12 interviews (more than six hours).
- **Cycles grow more often than they shrink.** Of 15,578 Cyclic Dependency instances, 43% grew in size, 36% stayed constant and 21% shrank.
- **But individual instances are short-lived:**
  - Component-level cycles have a 50% probability of surviving more than 6 versions; file-level cycles 9 versions.
  - 50% of cycles "do not survive more than 10 versions."
  - By shape, simple circles had a 50% chance of surviving one version, while stars reached 50% only after 17 versions.
  - Their earlier open-source Java study (Sas et al. 2019) reported "a low survival rate (just a few weeks for more than 50% of instances)." I saw that only as cited here.
- **How to square this with 3.5:** Oyetoyan tracks whether a _component_ is in some cycle; Sas tracks the identity of each cycle _instance_, which changes whenever cycles merge or split. Both can be true: a component stays tangled while the exact cycle around it keeps changing. Say which measure you mean.
- **Interviews:**
  - Architects called component cycles a sign of erosion. One said that in a three-component cycle "sometime one controlled the other and sometimes the other controlled the first."
  - A failed cycle removal: "we were not aware of all the legacy functionality within that component." It led to a customer escalation and took the team "two or three months to get it solved."
  - Developers "mostly underestimated" how many cycles affected relatively new components.

### 3.12 Al-Mutawa, Dietrich, Marsland and McCartin, "On the shape of circular dependencies in Java programs" (ASWEC 2014). VERIFIED (metadata + abstract); data VERIFIED from the first author's thesis

- **Citation:** Hussain Abdullah A. Al-Mutawa, Jens Dietrich, Stephen Marsland, Catherine McCartin, ASWEC 2014, pp. 48–57. https://doi.org/10.1109/ASWEC.2014.15
- **Abstract:** "most programs are riddled with circular dependencies." In package graphs most cycles are "package local," confined to branches of the package tree around parent packages, which "may not be critical."
- **Thesis behind it (full text read):** H. A. A. Al-Mutawa, _On the classification of cyclic dependencies in Java programs_, MSc thesis, Massey University, 2013. https://hdl.handle.net/10179/5465 (PDF bitstream `02_whole.pdf`). The corpus is 103 Qualitas Corpus Java systems.
  - "Nearly none of the software systems used in this study are cycle–free."
  - Of 5,004 class-level tangles, 2,376 (47%) were "tiny," meaning two classes depending on each other. Of top-level-class tangles, 715 of 1,431 (50%). The thesis: "more than half of them are tiny."
  - The largest tangles are "multi-hub." The biggest class tangle had 2,698 classes.
  - Tangles are concentrated: "few projects contain most of the tangles."
  - The thesis even names load order as a cost of cycles: "which module gets loaded before the other if they depend on each other." That is the JavaScript problem, though it is mentioned only in passing for Java.
- **Use:** most cycles are small, two-node ones, which are the easiest to fix. A few giant ones carry most of the risk.

### 3.13 Laval, Falleri, Vismara and Ducasse, ranking undesired package cycles (JOT 2012), and the eDSM work (WCRE 2009). VERIFIED (JOT full PDF); eDSM VERIFIED (metadata + abstract)

- **JOT citation:** Jannik Laval, Jean-Rémy Falleri, Philippe Vismara, Stéphane Ducasse, "Efficient Retrieval and Ranking of Undesired Package Cycles in Large Software Systems," _Journal of Object Technology_ 11(1), 2012, article 4, pp. 4:1–24. https://doi.org/10.5381/jot.2012.11.1.a4, PDF http://www.jot.fm/issues/issue_2012_04/article4.pdf. It extends a TOOLS 2011 paper by Falleri, Denier, Laval, Vismara and Ducasse (https://doi.org/10.1007/978-3-642-21952-8_19).
- **The problem it states:** Tarjan's SCC algorithm, which every cycle checker uses, tells you which packages are tangled but not how. Package-level SCCs in four mature Java programs:

| Program        | Packages | Largest SCC | Share |
| -------------- | -------- | ----------- | ----- |
| ArgoUML 0.28.1 | 79       | 38          | 48%   |
| JEdit 4.3.1    | 29       | 18          | 62%   |
| Choco 2.1.0    | 147      | 38          | 26%   |
| ANTLR 3.2      | 31       | 7           | 23%   |

- **Their fix:** decompose each SCC into short cycles of two to four packages and rank them by "undesirability."
- **A few edges make most cycles:** in four systems whose maintainers labelled every dependency, only **3% to 19% of dependencies were undesired**. Yet in RESYN-Assistant 259 of 306 short cycles contained at least one undesired dependency.
- **On class-level cycles:** "a lot of cycles among classes are due to the associations," and so expected. The authors argue package cycles matter more.
- **Laval, Denier, Ducasse and Bergel, "Identifying cycle causes with Enriched Dependency Structural Matrix,"** WCRE 2009, pp. 113–122, https://doi.org/10.1109/WCRE.2009.11 (HAL inria-00498446). It adds dependency type and proportions to DSM cells to "stress potentially simple fixes for cycles." Fixes were merged into Pharo. It is a tool paper with no defect data.

### 3.14 Feng, Liu, Ji, Ma and Liang, "An empirical study of untangling patterns of two-class dependency cycles" (EMSE 2024). VERIFIED (full arXiv v3)

- **Citation:** Qiong Feng, Shuwen Liu, Huan Ji, Xiaotian Ma, Peng Liang, _Empirical Software Engineering_ 29(2), 2024. https://doi.org/10.1007/s10664-023-10438-0. arXiv: https://arxiv.org/abs/2306.10599 (v3, 17 Dec 2023).
- **Data:** 38 popular Java projects (52 to 14,684 files). 587 successful and 69 unsuccessful two-class cycle resolutions, found commit by commit and inspected by hand.
- **How developers break cycles:**
  - **Remove Unused/Deprecated Code: 40.0% (235/587), the most common fix.**
  - Move code from one cyclic class to a third class: 23.4%.
  - Move code between the two classes: 14.8%.
  - Shorten the call chain: 12.1%.
  - Complex combinations: 8.7%.
  - "Leverage Built-In Feature": 1.0%. The Ant example replaced `new Xalan2Executor()` with `Class.forName().newInstance()`. Reflection hides the dependency from static analysis, which in JavaScript is the analogue of swapping a static import for a dynamic `import()`.
- **Fixes that fail:** 10.5% of attempts (69/656) ended up "breaking the original cycle, only to form a new, sometimes even larger, cycle." The cycle just moved to a parent or child class.
- **For the post:** this ties cycles to dead code: four in ten fixed cycles were held together by code nobody needed. The failed fixes show that "make the warning go away" can just move the cycle.
- **Caveat:** two-class cycles only, Java only, manual classification.

### 3.15 Bochicchio, Walter and Arcelli Fontana, "Empirical study on the correlation among architectural smells" (IST 2026). VERIFIED (full PDF)

- **Citation:** Matteo Bochicchio, Bartosz Walter, Francesca Arcelli Fontana, _Information and Software Technology_ 199:108283, 2026. https://doi.org/10.1016/j.infsof.2026.108283. Open PDF on the Milano-Bicocca repository (BOA).
- **Prevalence:** across 782 Java and Python projects analysed with Arcan, **Cyclic Dependency was the most common architectural smell: 98,986 of 156,920 instances (63%).** Java had 77,672 and Python 21,314. The next most common was Cyclic Hierarchy (45,462).
- **The dynamic-language caveat:** "Python relies on dynamic imports and runtime dependency resolution." That makes dependency smells "less amenable to static detection." Arcan found no class-level cycles in Python at all, because of the paradigm. The same caution applies to JavaScript.
- **Co-location:** dependency smells (cyclic, hub-like, unstable) cluster with hierarchy smells, with "high conviction but generally low support."

### 3.16 Larsen and Moghaddam, agentic adoption and architectural smells in Java (SEAA 2026). VERIFIED (full arXiv v1); see 5.1

- The only causal study found on agents and cycles: 151 Java repositories, staggered difference-in-differences over 1,811 Arcan snapshots. Cyclic dependencies dominate the smell counts (mean 333 per repo-month). After adoption, code grew 12.8% while raw cyclic-dependency counts showed "no significant absolute changes." Details and caveats are in 5.1.

### 3.17 Esposito, Robredo, Arcelli Fontana and Lenarduzzi, "On the correlation between architectural smells and static analysis warnings" (SQJ 2025). VERIFIED (full arXiv v2)

- **Citation:** _Software Quality Journal_ 33, 2025. https://doi.org/10.1007/s11219-025-09730-7. arXiv: https://arxiv.org/abs/2406.17354
- **Data and finding:** 103 Java projects (72 million LOC), 785 warning types from Checkstyle, FindBugs, PMD and SonarQube, and four Arcan smells including Cyclic Dependency. There is a "moderate correlation" between warnings and smells, but 33.79% of warning types never co-occur with any of the smells.
- **For the post:** file-level lint warnings and architecture-level smells only partly overlap. That is the empirical version of "you need a project graph to see cycles."

### 3.18 Sangal, Jordan, Sinha and Jackson, "Using dependency models to manage complex software architecture" (OOPSLA 2005). VERIFIED (metadata + abstract)

- **Citation:** OOPSLA 2005, pp. 167–176. https://doi.org/10.1145/1094811.1094824
- **Abstract:** dependencies are extracted by static analysis into a Dependency Structure Matrix, and "design rules" capture "which dependencies are acceptable." They are checked repeatedly as the system evolves. The tool was LDM, later the commercial Lattix; the case study was MIT's Haystack.
- **Use:** the origin of "dependency rules as an enforced check," the idea behind dependency-cruiser's rule files. No defect numbers.

### 3.19 JavaScript and TypeScript: what exists. Mostly nothing peer-reviewed

- **No peer-reviewed study of module-level import cycles in JavaScript or TypeScript turned up.** Searches covered OpenAlex, arXiv via web search (the arXiv API rate-limited and then timed out), and general web search for madge, dependency-cruiser and Arcan with JS/TS. Every quantitative cycle study above is Java, C/C++, C# or Python.
- **The nearest academic signal is the dynamic-language caveat in 3.15:** Arcan's authors say runtime resolution makes static cycle detection less reliable in Python.
- **Package-level cycles in npm (a different thing): ANECDOTAL.** Sam Bleckley, "Worrying about the NPM ecosystem," 29 Jun 2020, https://sambleckley.com/writing/npm.html. From metadata for all 1.3 million npm packages:
  - 1,700 depend directly on themselves.
  - 2,500 are in a two-package cycle, and about 500, 125 and 25 in three-, four- and five-package cycles.
  - "almost 150,000 packages — more than 1 in 10 — had at least one" circular dependency in their dependency graph.
  - Examples: `babel-core` ↔ `babel-register`, `yeoman-generator` ↔ `yeoman-environment`.
  - These are cycles between _packages_ in `package.json`, which npm installs fine. They say nothing about import cycles between files.
- **Tools only:** ArchLintor (Resende, Durelli, Terra, SBES 2025, https://doi.org/10.5753/sbes.2025.11075) checks TypeScript architecture conformance; its abstract reports no cycle prevalence. archlint (https://github.com/archlinter/archlint) is an MIT-licensed TS/JS smell detector with a mode that flags new import cycles in PRs. Neither is a study. I saw both only through search-result summaries, not the SBES page or the README, so open them before citing either.

---

## 4. Barrel files and their cost

GitHub issues, PRs and source files in this section were read through the public, unauthenticated GitHub API or raw.githubusercontent.com, except one PR comment (vercel/next.js#56489, comment 1751099866), read with `gh api`. "My check" items are ad-hoc Oxlint 1.86.0 runs (see the note at the top).

### 4.1 Marvin Hagemeister, "Speeding up the JavaScript ecosystem - The barrel file debacle" (2023). VERIFIED (full text)

- **Citation:** Marvin Hagemeister, "Speeding up the JavaScript ecosystem - The barrel file debacle," marvinh.dev, part 7 of a series, **8 October 2023**. https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/
- **Thesis:** barrel files "are one of the key reasons why JavaScript tooling is slow in bigger projects." In a codebase where every folder has an `index.js`, "you typically end up importing every single file in your project."
- **Why lazy loading doesn't save you:** the post says loading only the modules you need would "break code relying on globals or module execution order." Its example is two side-effecting imports.
- **The bundling clue:** he bundled the project with esbuild and found that bundling and then running was quicker than running the source. Bundlers "flatten and merge the module graph," so graph size is the problem.
- **Test runners:** in Jest "each test file is executed in its own child process," so every test file rebuilds the module graph. His example: a 6 s graph and 100 test files waste 10 minutes.
- **Lint:** barrel files "gravely affect performance" of "any sort of import cycle linting rules." Because linters run file by file, it's "not uncommon" for linting to take "a couple of hours in a bigger project." That is relevant to `import/no-cycle` (section 6).
- **His benchmark:** generated files that only import each other, timed on a 2020 M1 MacBook Air.

  | Modules | Load time | Overhead for 100 test files, 4 in parallel |
  | ------- | --------- | ------------------------------------------ |
  | 500     | 0.15 s    | 3.75 s                                     |
  | 1,000   | 0.31 s    | 7.75 s                                     |
  | 10,000  | 3.12 s    | 1:18 min                                   |
  | 25,000  | 16.81 s   | ~7 min                                     |
  | 50,000  | 48.44 s   | ~20 min                                    |

  "Since this is a synthetic setup, these are lowball numbers."

- **Advice:** "Having only a handful of barrel files in your code is usually fine". Where they are everywhere, removing them "makes many tasks 60-80% faster": "Get rid of all barrel files."
- **Caveats:**
  - The load-time table measures module count, not barrels as such.
  - The 60–80% figure has no measurement in the post.
  - The "couple of hours" lint claim is an assertion.
  - Biome's and Oxlint's barrel rules both link to this post as their rationale (4.14).

### 4.2 Shu Ding (Vercel), "How we optimized package imports in Next.js" (2023), and the `optimizePackageImports` docs. VERIFIED (full text, docs, PR); Vendor

- **Citation:** Shu Ding, "How we optimized package imports in Next.js," Vercel blog, **13 Oct 2023**. https://vercel.com/blog/how-we-optimized-package-imports-in-next-js. Subtitle: "40% faster cold boots and 28% faster builds."
- **The problem:**
  - Some icon and component libraries have "up to 10,000 re-exports in their entry barrel file."
  - "There's a hidden cost with JavaScript runtimes in every" `require`/`import`. For many popular React packages, "it takes 200~800ms just to import them" (no source is given for that range).
- **Why not tree-shake:** tree-shaking is a bundler feature, not a runtime one. Bundling the library and tree-shaking it works only without side effects, and it causes "substantially slower builds."
- **`modularizeImports` (first attempt):** a hand-written mapping from named exports to file paths. It was "configured heavily by hand" and breaks when a library's internals change. Next.js docs: stable in v13.1.0 and "superseded by `optimizePackageImports` in Next.js 13.5" (https://nextjs.org/docs/architecture/nextjs-compiler).
- **`optimizePackageImports` (Next.js 13.5):** it scans a package's entry file and rewrites barrel imports automatically. "This process is cheaper than tree-shaking." It follows nested barrels and `export *`, and bails out on a non-barrel file.
- **Dev boot, M2 MacBook Air ("a 15%~70% development time boost"):**

  | Library             | Before               | After        |
  | ------------------- | -------------------- | ------------ |
  | @mui/material       | 7.1 s, 2,225 modules | 2.9 s, 735   |
  | recharts            | 5.1 s, 1,485         | 3.9 s, 1,317 |
  | @material-ui/core   | 6.3 s, 1,304         | 4.4 s, 596   |
  | react-use           | 5.3 s, 607           | 4.4 s, 337   |
  | lucide-react        | 5.8 s, 1,583         | 3 s, 333     |
  | @material-ui/icons  | 10.2 s, 11,738       | 2.9 s, 632   |
  | @tabler/icons-react | 4.5 s, 4,998         | 3.9 s, 349   |
  | rxjs                | 4.3 s, 770           | 3.3 s, 359   |

- **Other numbers:**
  - `next build` ~28% faster on one App Router page using lucide-react and @headlessui/react.
  - Local Node.js server start ~10% faster.
  - "up to 40% faster cold starts" on Vercel, "paired with other improvements" in 13.5. So the 40% is not barrels alone.
- **Recursive barrels:** PR #56489 ("Flatten recursive wildcard exports in barrel optimization," Shu Ding, merged 6 Oct 2023) tested a package with "4 levels of 10 `export *`" (10,000 modules). Compile time went from ~30 s to ~7 s.
- **The "90% faster reloads" claim is one customer's log.** The post links it to a single PR comment (charltoons, 6 Oct 2023, https://github.com/vercel/next.js/pull/56489#issuecomment-1751099866). A page went from 222.4 s and 118,124 modules (Next 13.5.3) to 23.1 s and 27,506 modules (13.5.5-canary.4).
- **The post's own advice:** consider adding an ESLint rule "to prevent barrel file imports." It links `eslint-plugin-canonical`'s `no-barrel-import`.
- **Current docs** (https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports, docs version 16.4.0):
  - Still `experimental`.
  - "Some packages can export hundreds or thousands of modules."
  - It lists 27 packages optimised by default, including `lucide-react`, `date-fns`, `lodash-es`, `@mui/material`, `rxjs` and `effect`.
- **Caveats:** Vercel sells Next.js hosting. The benchmarks are its own, on one laptop, with no published harness.

### 4.3 Atlassian (Jira frontend), "How We Achieved 75% Faster Builds by Removing Barrel Files" (2025). ANECDOTAL (company report; one codebase; no method published)

- **Citation:** Tim Sebastian (Principal Software Engineer), Atlassian blog, "How We Build," **26 June 2025**. https://www.atlassian.com/blog/atlassian-engineering/faster-builds-when-removing-barrel-files
- **Lead correction:** the brief guessed 2024. The post is dated June 2025.
- **Scale:**
  - The Jira frontend has "thousands of internal packages."
  - Barrels fed into barrels ("Level 1 barrel" → "Level 2 barrel" → "Top-level barrel").
  - The migration touched "almost 100,000 files." They "landed changes to over 90,000 files within a few days," with more than a thousand developers working in the repo.
- **Symptoms before:**
  - TypeScript hover/highlighting "could take upwards of 2 minutes."
  - Single unit test runs took "minutes."
  - CI ran too many tests, because test selection is based on the dependency graph.
- **Results after:**
  - TypeScript highlighting improved "by more than 30%."
  - Local unit tests were ~50% faster on average, with "up to 10x" in some packages.
  - CI unit tests: 88% fewer run per build (1,600 → 200), with a 73% lower average runtime.
  - Integration tests: 85% fewer (130 → 20). Visual regression tests: 50% fewer (50 → 25).
  - Overall: "75% reduction in build minutes consumed."
  - Bundle size dropped only slightly: "though we were hoping for more."
- **How they did it:**
  - First stop new barrels, then a fixable ESLint rule ("Avoid barrel file imports") run as a codemod, then delete orphaned barrels.
  - "up to 80% of our codebase remains dormant at any given time." That let them codemod cold files first, in three waves, to avoid merge conflicts.
  - The cleanup deleted "several thousand obsolete files" that no longer appeared in any dependency graph.
- **Trade-offs they name:**
  - "Packages can no longer easily control their “public API” through barrel files."
  - "Moving source files now requires updating every direct import."
  - Direct imports "might encourage deeper dependencies between modules."
  - They question whether private boundaries matter in code that is never published to npm.
- **Caveats:**
  - The headline "75% faster builds" is really CI minutes saved by running fewer tests, not faster compilation.
  - There's no baseline variance and no published method.
  - Some files were "hybrids" that both declared code and re-exported, which a pure "barrel" definition misses.

### 4.4 Dominik Dorfmeister (TkDodo), "Please Stop Using Barrel Files" (2024). VERIFIED (full text); the module numbers are ANECDOTAL

- **Citation:** Dominik Dorfmeister, TkDodo's blog, **26 Jul 2024**. https://tkdodo.eu/blog/please-stop-using-barrel-files. He maintains TanStack Query; the name is confirmed on his GitHub profile.
- **Definition:** "A barrel is a file that does nothing but re-export things from other files."
- **The cycle mechanism:**
  - With `tab/index.ts` re-exporting `TabPanel` and `useTabState`, `tab-panel.ts` importing `useTabState` from `'@/tab'` or `'./'` "will create a circular import."
  - He has seen "bundlers crash with the weirdest of error messages" because of it.
  - On how these imports happen: "we just auto import and leave it at whatever our editor (or copilot) decides." That links to the agent section.
  - "The lint rule import/no-cycle can catch a lot of these circles," and he recommends turning it on.
- **Numbers (one project):** in a Next.js app, pages loaded "over 11k modules" and took 5–10 s to start. Removing most internal barrels brought that to about 3.5k modules, "a reduction of 68%."
- **On `optimizePackageImports`:** it only works on a "real" barrel. One non-re-export line, like `export const foo = 5`, "makes the whole file non-optimizable."
- **The library exception:** libraries "need a single entry point file" for `main`. "To me, this is the only place where a barrel makes sense."
- **He also notes:** "there isn’t anything that would force other developers to only import from the barrels." So in app code a barrel doesn't create privacy.

### 4.5 Navan, "How we turbocharged our unit tests and reclaimed developer velocity" (2026). ANECDOTAL (company report)

- **Citation:** Harshal Carpenter, Navan Tech Blog, **27 Feb 2026**. https://navan.com/blog/unit-tests-reclaimed-developer-velocity
- **Context:** Navan Expense frontend, Jest, with "Shared Angular modules" in the older code. Tests took 40 minutes (user app) and 36 minutes (admin app), and release workflows failed ~30% of the time.
- **Root causes named:** "barrel files and circular dependencies."
- **Isolated measurements:**
  - One small test took 105 s locally. Removing barrel imports for it brought it to 10 s.
  - "Even after cleaning up barrel files, test times remained high if circular dependencies persisted." Fixing one cycle took a test run from ~13 minutes to ~4.
- **Results:**
  - "Overall unit test time reduced by 50%."
  - Cost per unit test job went "from a peak of $0.051 to $0.022." The post calls that a 44% decrease; it's actually 57% (see "Wrong or different").
  - New ESLint rules block new barrels, and a cross-project cycle rule is in progress.
- **Agent note:** "We used AI to generate a script using ts-morph" to rewrite the imports.

### 4.6 Codecentric, "JavaScript test performance: getting the best out of Jest" (2021). ANECDOTAL (small benchmark)

- **Citation:** Edward Byne, codecentric blog, **12 Nov 2021**. https://www.codecentric.de/en/knowledge-hub/blog/javascript-test-performance-getting-the-best-out-of-jest
- **Measurement:**
  - Importing an MUI `Button` through the library's root `index.js` raised a test from 1.7 s to 2.7 s. The test file itself took 1.1 s instead of 109 ms.
  - Importing the button's own folder brought it to 2.0 s.
  - These are **profiled times under ndb**: the same baseline took 0.7 s when not profiled.
- **Claims:** tree-shaking applies "only" to production builds, "not … test execution or development servers." In the client project, "the performance effects of barrel file imports were exponential" (an assertion; no data shown).

### 4.7 Pascal Schilp on barrels in libraries (2024). ANECDOTAL (case study) and VERIFIED (guide text)

- **"Barrel files: A case study,"** DEV Community, **1 Feb 2024**. https://dev.to/thepassle/barrel-files-a-case-study-o5p
  - In unbundled local development, "out of 184 requests on the page, 179 were caused by MSW."
  - Local edits brought MSW from 179 modules to 45. "I didn't run any objective benchmarks," but page load improved "by 67%" on his laptop.
  - He frames barrels as often "a code smell" and says the post is not "all barrel files are evil."
  - He wrote `barrel-begone` and eslint-plugin-barrel-files out of this work.
- **"A practical guide against barrel files for library authors,"** DEV Community, **1 Jun 2024** (edited 12 Jun). https://dev.to/thepassle/a-practical-guide-against-barrel-files-for-library-authors-118c
  - "Avoid exposing a barrel file as the entrypoint of your package."
  - Importing `http` from `msw` "adds a hefty 123 modules" (the GraphQL code included).
  - His alternative is granular entry points in the `exports` map (4.13).
  - Consumers may load a library "from a CDN, where treeshaking doesn't apply."
  - Some code is seen as side-effectful (his example is `Math.random().toString().slice(1);`), which defeats tree shaking.

### 4.8 Vite performance guide, "Avoid Barrel Files." VERIFIED (docs and git history)

- **Source:** https://vite.dev/guide/performance#avoid-barrel-files. The page was added on 23 Oct 2023 by Bjorn Lu (vitejs/vite PR #14693, commit 1e487e06), and the barrel section was in the first version.
- **Text:**
  - "Barrel files are files that re-export the APIs of other files in the same directory."
  - On `import { slash } from './utils'`: "all the files in that barrel file need to be fetched and transformed." They "may contain the `slash` API and may also contain side-effects that run on initialization." The result is "a slower page load."
  - The advice is to "avoid barrel files and import the individual APIs directly."
- **Origin:** it points to vitejs/vite issue #8237, "Consider treeshaking module for serving files in dev mode" (AlexandreBonaventure, 19 May 2022, still open). The reporter's large codebase saw slow reloads, and Vite's dev server served `/shared/index.ts` "as is," so the browser loaded unused modules.

### 4.9 Test runners: Jest and Vitest. VERIFIED (GitHub issue; Vitest docs)

- **Jest issue #11234, "Slow start times due to use of barrel files"** (greyscalemotif, 23 Mar 2021). https://github.com/jestjs/jest/issues/11234
  - Its three points: Jest "simulates Node's require cache," the cache "is built independently for every test suite," and "All dependencies of a file are included, even if unused."
  - Simen Bekkhus (SimenB, Jest maintainer, 25 Apr 2021) offered to accept a docs PR. He noted that "In Jest itself we've made lots of `import`s lazy to avoid this issue."
  - Christoph Nakazawa (cpojer, Jest's creator, 28 May 2025): "Do not use barrel files," and don't load your entire app in every test file. He thought Jest's docs should say so.
  - Auto-closed by the stale bot on **7 Jul 2026** as "not planned," with 60 comments.
  - My check: Jest's `docs/Troubleshooting.md` and `docs/Architecture.md` on `main` don't contain the word "barrel."
- **Vitest docs:**
  - "Profiling Test Performance" (https://vitest.dev/guide/profiling-test-performance) links Vite's barrel section. Its example shows that importing without a barrel "reduces amount of transformed files by ~85%."
  - "Improving Performance" (https://vitest.dev/guide/improving-performance) says the import phase is where "isolation re-evaluates that shared graph for every file," which is "typical for barrel-file imports."
  - Both are illustrative examples, not benchmarks.

### 4.10 What bundlers can and can't do with re-exports. VERIFIED (official docs)

- **webpack, `sideEffects`** (https://webpack.js.org/guides/tree-shaking/):
  - `sideEffects` "is much more effective" than `usedExports` because it "allows to skip whole modules/files and the complete subtree."
  - `usedExports` "can't skip subtree/dependencies since the spec says that side effects need to be evaluated."
  - The worked example is Shopify Polaris. For `import { Button } from "@shopify/polaris"`, `components/index.js` is "skip over": it's not evaluated, but its dependencies are still analysed. Only 4 modules end up in the bundle.
  - So a bundler can erase a barrel's cost, but only when the package declares itself side-effect-free.
- **webpack 5 nested tree-shaking** (release post, 10 Oct 2020): webpack "is now able to track access to nested properties of exports," including `export * as inner` and `import * as module`. That weakens the claim that namespace imports defeat tree shaking (4.15).
- **esbuild** (https://esbuild.github.io/api/#ignore-annotations): it honours `sideEffects`, but "The sideEffects field is particularly error-prone for developers." It also says "esbuild doesn't tree-shake CommonJS modules."
- **Rollup** (`treeshake.moduleSideEffects`, https://rollupjs.org/configuration-options/): when a module with `moduleSideEffects: false` re-exports a used variable, "direct reexports will ignore side effects," but indirect re-exports include them.
- **Rspack `lazyBarrel`** (https://rspack.rs/guide/advanced/lazy-barrel):
  - It works by "skipping the building of unused re-export modules in side-effect-free barrel files."
  - It requires `"sideEffects": false` or `rules[].sideEffects`, and ESM only.
  - Star re-exports "are not fully optimized by lazy barrel and remain a performance concern." If a name only comes through `export *`, the targets still have to be built.
  - Rspack 1.5 blog (26 Aug 2025), the Rspack team's own benchmark:

    | App | Build time | Module resolutions | Module builds |
    | --- | --- | --- | --- |
    | ui-components | 1.47 s → 1.19 s (−20%) | 39,675 → 20,071 (−49%) | 9,358 → 5,062 (−46%) |
    | "An application from ByteDance" | 17.9 s → 16.0 s (−10%) | 181,078 → 137,232 (−24%) | 38,046 → 29,405 (−23%) |

  - Rspack 1.6 blog (30 Oct 2025, https://rspack.rs/blog/announcing-1-6): `lazyBarrel` "is enabled by default in Rspack 1.6." Compared with 1.5.0, "Building multiple UI component libraries is 31% faster," credited to that default (Rspack's own benchmark).
- **Point for the post:** bundlers are converging on making barrels cheap _in the bundle_: Next.js `optimizePackageImports`, webpack `sideEffects`, Rspack `lazyBarrel`. None of that helps dev servers that serve modules unbundled, test runners, Node, type checking or lint. That is where the migration reports measured their gains.

### 4.11 TypeScript: barrels, auto-import and cycles. VERIFIED (GitHub issues and PRs); no TypeScript-team statement on type-check cost found

- **Regression:** in TypeScript 4.4 (2021), auto-import began choosing the shortest specifier. That was often a parent barrel such as `'..'` or `'.'`.
  - Issue #45953, "Auto-import prefers parent index.ts which leads to circular reference," opened 18 Sep 2021 by gordonmleigh, says this "is highly likely to lead to a circular reference."
  - Many duplicates followed (#46279, #46315, #46753, #46817, #47040).
- **Andrew Branch (TypeScript team), #47040, 7 Dec 2021:**
  - Paths of only dots and slashes "often creates an import cycle between a barrel re-export and the file" that imports it.
  - Such a cycle "may not be a problem at runtime," but can be "if the modules have side effects."
- **The fixes, all by Andrew Branch:**
  - PR #47432, "Deprioritize import paths made up of only dots and slashes," merged 14 Jan 2022.
  - PR #47516, "Avoid auto-importing from barrel re-exporting index files that are likely to make an import cycle," merged 10 Feb 2022. #45953 is milestoned TypeScript 4.6.1.
  - PR #57342, "Expand anti-parent-barrel auto-import heuristic to all moduleResolution modes," merged 8 Feb 2024. The original fix had been "incorrectly limited to `--moduleResolution node`."
  - The heuristic in his words: avoid "a re-exporting file that is a direct child of any ancestor directory."
- **His defence of internal barrels (#45953, 19 Jan 2022):** he describes a Microsoft web app where five teams imported `{ Card, Table, List } from "@common/ui"` through a barrel and `paths` alias. It was "just a convenience." Also: "Why write a re-export if you never want to use it?"
- **Still open:** #51418, "Avoid barrel re-exports in auto-imports" (2022, "Needs Proposal"). On 6 Oct 2026, Ryan Cavanaugh folded #64650 into it. He wrote that `autoImportFileExcludePatterns` "cannot express that importer-sensitive distinction." That's the distinction between offering a barrel to consumers and offering it to files inside the package.
- **Type-check cost:** I found no TypeScript-team statement that barrels slow type checking. The TypeScript wiki's Performance page doesn't mention barrels or re-exports. The evidence is Atlassian's report (4.3) and practitioner posts.
- **typescript-eslint performance docs** (https://typescript-eslint.io/troubleshooting/typed-linting/performance): `eslint-plugin-import` rules "cause the plugin to do its own parsing, and file tracking." They recommend running `import/no-cycle` and `import/no-unused-modules` "only … at CI/push time." Cross-reference for section 6.

### 4.12 Angular: barrels recommended, then dropped (2016), and a 2025 fix. VERIFIED (archived page, docs repo history, PR and commit)

- **The recommendation:** the angular.io style guide (angular/angular.io repo, `public/docs/ts/latest/guide/style-guide.jade`) had **Style 04-10, "Create and Import Barrels."**
  - Before 23 May 2016: "**Do** create a file that imports, aggregates, and re-exports items," called "a **barrel**," and "**Do** name this barrel file `index.ts`."
  - Commit 0a0f78f144 (Foxandxss, 23 May 2016, "make barrels a consider") changed both to "Consider."
  - The Wayback snapshot of 17 Jun 2016 shows the "Consider" version. Its reasons include "A barrel shortens import statements" and consistency "with a pattern from Node."
- **The removal:** commit 2b7fb86890 (John Papa, 27 Sep 2016, "docs(style-guide): remove rc relics and update for ngmodules (#2463)") deleted the rule. The angular.io changelog entry dated 2016-09-27:
  - "Barrels now are far less useful and have been removed from the style guide;"
  - "they remain valuable but are not a matter of Angular style."
- **The glossary** (v2.angular.io) kept a "Barrel" entry: "A way to roll up exports from several ES2015 modules." It said "You can often achieve the same result using Angular modules instead."
- **Today:** the angular.dev style guide (`adev/src/content/best-practices/style-guide.md` on `main`) doesn't mention barrels.
- **The 2025 coda:** Angular PR #61618, "fix(compiler): remove TypeScript from linker" (Alan Agius, landed as commit e9fcbb8af1 on 22 May 2025).
  - The linker's dependence on TypeScript "was caused by importing from barrel files."
  - It added "between 500ms to 1s to compilation times."
  - "barrel files are detrimental to code splitting and code motion."

### 4.13 The counter-case: package entry points and Node's `exports`. VERIFIED (Node docs) plus the sources above

- **Node.js docs, "Package entry points"** (https://nodejs.org/api/packages.html#package-entry-points):
  - `exports` allows "multiple entry points to be defined" and prevents "any other entry points besides those defined."
  - "This encapsulation allows module authors to clearly define the public interface."
  - It's "not a strong encapsulation" since a direct require of the absolute path still works.
- **Versions:** subpath exports were added in v12.7.0. Subpath patterns (`"./features/*.js"`) came in v14.13.0 and v12.20.0. Node recommends explicit subpaths for few exports and patterns where a long list would cause "`package.json` bloat."
- **The argument for barrels, from the sources:**
  - A package needs a public entry point (TkDodo; Schilp).
  - Teams use barrels to define a module's API (Atlassian's lost "public API"; Andrew Branch's `@common/ui`).
  - Angular in 2016 said they "remain valuable."
- **What the critics recommend instead:** granular `exports` subpaths (Schilp), direct imports inside a package (TkDodo; the TypeScript heuristic), and the `"imports"` field (`#internal`) for app-internal aliases. That last one is Node's documented mechanism; no post above names it.

### 4.14 The lint rules: what each counts as a barrel. VERIFIED (docs and rule source) plus my check

- **eslint-plugin-barrel-files** (Pascal Schilp; first published to npm 28 Jan 2024; v3.0.1 current). https://github.com/thepassle/eslint-plugin-barrel-files
  - Rules: `avoid-barrel-files`, `avoid-importing-barrel-files`, `avoid-namespace-import`, `avoid-re-export-all`.
  - The README says tree shaking isn't applied in "test runners, browsers, CDN environments or server side JavaScript runtimes."
  - **Heuristic (source, `lib/rules/avoid-barrel-files.js`):** a file is a barrel when its exported names outnumber its own declarations **and** exceed `amountOfExportsToConsiderModuleAsBarrel`. The default is **3**; the README example shows 5.
  - `avoid-importing-barrel-files` resolves modules (with `oxc-resolver`) and flags imports whose module graph exceeds `maxModuleGraphSizeAllowed` (README example 40; the docs say "more than 20 modules").
- **Biome `noBarrelFile`** (since v1.6.0, released 8 Mar 2024; performance group; not recommended; default severity warning). https://biomejs.dev/linter/rules/no-barrel-file/
  - It says it is inspired by `barrel-files/avoid-barrel-files`, and the docs say it "ignores .d.ts files and type-only exports."
  - **Source (`no_barrel_file.rs`):** it reports the first `export … from` that carries a value binding. One such line is enough, whatever else the file contains, so it is far stricter than the ESLint plugin's ratio.
  - Diagnostic: "Avoid barrel files, they slow down performance," and "cause large module graphs with modules that go unused." It links Hagemeister.
- **Biome `noReExportAll`** (v1.6.0; performance; not recommended): flags `export * from` and `export * as ns from`, but not `export type *`. It is the same as `barrel-files/avoid-re-export-all`.
- **Biome `noNamespaceImport`** (v1.6.0; performance; not recommended): flags `import * as foo`, and allows `import type * as`. It is the same as `barrel-files/avoid-namespace-import`.
  - Its own docs hedge that tree-shaking "largely depends on the bundler." Modern bundlers "are generally capable of handling namespace imports effectively."
- **Biome `noDynamicNamespaceImportAccess`** (v1.9.0; **recommended**): flags `foo["bar"]` and `foo[key]` on a namespace import, but allows `foo.bar`. This is the narrow, accurate version of the namespace concern.
- **Oxlint `oxc/no-barrel-file`** (restriction category). Docs: https://oxc.rs/docs/guide/usage/linter/rules/oxc/no-barrel-file.html
  - It was added in PR #3030 (Ali Rezvani, 22 Apr 2024) and shipped in oxlint 0.3.0 the same day.
  - Option `threshold`, default **100**.
  - **Source:** it only counts re-export entries whose import name is "all" or "all but default", that is `export * from` and `export * as ns from`. It adds the target's transitive loaded-module count, and fires when the total exceeds the threshold. So it needs the module graph from the import plugin.
  - The docs' "Invalid" example lists `import * as ns from 'foo'`, but the code only looks at export entries.
  - **My check (Oxlint 1.86.0, 13 Oct 2026; re-run before quoting).** Fixture: 120 one-line modules.
    - Flagged: a pure `export *` barrel of all 120 ("120 modules are loaded which exceeds the threshold of 100").
    - Flagged: `export * as big from './big/index.js'` (121).
    - Flagged: a file with its own `export const` plus one `export *` (121).
    - **Flagged: `export type * from './big/index.js'` in a `.ts` file (121).** That is a type-only re-export, erased at runtime.
    - Not flagged: a file of 120 named re-exports (`export { v1 } from '../big/m1.js'` …).
    - Not flagged: a 3-module `export *` barrel.
    - Not flagged: `import * as ns from './big/index.js'`.
- **`import/no-namespace`** (eslint-plugin-import; Oxlint port since v0.12.0):
  - The eslint-plugin-import docs give no rationale beyond "Enforce a convention."
  - The Oxlint docs add that namespace imports "can prevent efficient tree-shaking, leading to larger bundle sizes." See 4.15 for why that is weak.
- **What no barrel rule can see:**
  - Whether a file is a package's public entry point (its `exports`/`main` target) or an internal folder barrel. Biome would flag a library's legitimate `index.ts`. Oxlint would ignore a large barrel written with named re-exports. The ESLint heuristic would ignore a file that both declares code and re-exports, Atlassian's "hybrids."
  - Whether the consuming toolchain bundles with `sideEffects` (cheap) or loads modules raw (expensive).
  - That cost is set by the importer's environment, not the file. That is why Next.js, Rspack and TypeScript's auto-import moved to importer-side fixes.

### 4.15 Namespace imports, tree shaking and `import defer`. VERIFIED (docs, proposal README, TS release notes)

- **The tree-shaking claim is mostly about bundlers, and modern ones handle static access.** webpack 5 (Oct 2020) tracks `module.inner.a` through `import * as` and `export * as` (4.10). Biome's own `noNamespaceImport` docs concede the point. The case bundlers can't handle is computed access (`ns[key]`), which `noDynamicNamespaceImportAccess` targets.
- **In unbundled runtimes the binding form doesn't change cost.** My inference from module semantics, not a cited source: `import * as ns from 'm'` and `import { a } from 'm'` load and evaluate the same module and its whole subtree. The cost comes from what `m` re-exports, which is the barrel problem. Hagemeister's point about eager loading (4.1) is the closest source.
- **`import defer` will need namespace imports.**
  - TC39 "Deferring Module Evaluation" (authors Yulia Startsev, Nicolò Ribaudo, Guy Bedford; Stage 3; Stage 3 slides dated 2025-01). https://github.com/tc39/proposal-defer-import-eval
  - The syntax is `import defer * as ns from "mod"`. The proposal says the new import form "will only ever return a namespace exotic object."
  - It defers **evaluation**, not loading: the graph is still fetched and linked. Its README says "deferred re-exports" are "not included in the current version of the proposal," so it doesn't fix barrels.
  - TypeScript 5.9 supports it: "The syntax only permits namespace imports." https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html
  - So a blanket namespace-import ban would block `import defer`. Worth checking whether Biome's `noNamespaceImport` exempts it; I didn't test.

### 4.16 What I did not find

- **No peer-reviewed or academic study of barrel files.** Searches of arXiv and OpenAlex found nothing; Semantic Scholar rate-limited me. Every number in this section is a practitioner benchmark (Hagemeister, Vercel, Rspack) or a single-company migration report (Atlassian, Navan, TkDodo, Schilp, Codecentric).
- **No TypeScript-team measurement** of barrels' type-checking or language-service cost.
- **No official React, Remix, Svelte or Nuxt docs** on barrels in a quick search. Angular's current style guide doesn't mention them.
- **No Shopify, Slack, Airbnb or Canva write-up** with barrel-removal numbers. Shopify appears only as the Polaris example in webpack's `sideEffects` docs.

---

## 5. Agents, import cycles and barrel files

Short version: **no study measures whether coding agents create barrel files or import cycles in JavaScript or TypeScript.** The closest measured evidence is one causal study of Java repositories, which found no rise in cyclic dependencies after agent adoption (5.1). Two generation studies of Python projects report coupling smells but no cycle counts (5.2, 5.3). Everything specific to barrels, and every TypeScript cycle story, is anecdotal or vendor guidance (5.7–5.9). Two quick checks of my own (5.3, 5.6) and one sample of agent instruction files (5.8) are labelled "my check" and should be re-run with the `research/` harness before quoting.

### 5.1 Larsen and Moghaddam, "Mining Architectural Quality Under Agentic AI Adoption: A Causal Study of Java Repositories" (SEAA 2026). VERIFIED (full author-accepted manuscript, arXiv v1)

- **Citation:** Oliver Aleksander Larsen and Mahyar T. Moghaddam (University of Southern Denmark). Accepted at the 52nd Euromicro Conference on Software Engineering and Advanced Applications (SEAA 2026, Kraków, 2–4 Sep 2026), Springer LNCS. arXiv v1, 11 Jun 2026.
- **Link:** https://arxiv.org/abs/2606.13298
- **Design:**
  - 151 open-source Java repositories: 74 with agentic AI adoption (detected from tool config files such as `CLAUDE.md` and `.github/copilot-instructions.md`, and from Co-Authored-By trailers), and 77 propensity-matched controls.
  - 13 months per repository, 1,811 monthly snapshots analysed with Arcan.
  - Staggered difference-in-differences with the Borusyak imputation estimator.
  - Tools among the retained treated repos: Claude Code 44, Cursor 15, Copilot 14, Codex 1.
- **Findings:**
  - Cycles are by far the most common architectural smell in Java: "Cyclic dependencies dominate (mean CD = 333 vs. <10 for other types)."
  - Overall smell density fell 6.7% (p = 0.004), but it is a denominator effect: "Total smell counts are essentially unchanged (+1.1%, p = 0.82)," while lines of code grew 12.8% (p = 0.003).
  - **Cyclic dependency density:** −5.0% (p = 0.023), which is "non-significant after Holm adjustment (p = 0.070)." Hub-like dependency density fell 5.0% and was the only type to survive correction.
  - Authors' reading: cycles and hubs did not increase despite more code and packages, "suggesting new modules integrate without creating structural violations."
  - Tool-stratified estimates are all negative, e.g. Claude Code (n = 44) −5.1%, p = 0.039. The authors call this exploratory.
- **Caveats:**
  - Java only. Arcan works at class and package level, and 57% of the cycles counted are class-level. There is nothing about JS/TS module imports or barrels.
  - Adoption is inferred from config files and trailers, so the "treatment" is "repo uses an agent," not "this code was written by an agent."
  - Arcan precision is reported at 70–100%, and the authors used the trial edition.
- **For the post:** This is the only causal evidence on agents and cycles, and it points away from "agents add cycles." Use it as the honest counterweight to the anecdotes in 5.9.

### 5.2 Zhu, Tsantalis and Rigby, "AI-Generated Smells: An Analysis of Code and Architecture in LLM- and Agent-Driven Development" (arXiv 2026). VERIFIED (full arXiv v1)

- **Citation:** Yue Cai Zhu, Nikolaos Tsantalis, Peter C. Rigby (Concordia University). arXiv v1, 4 May 2026. Preprint; no venue stated.
- **Link:** https://arxiv.org/abs/2605.02741
- **Design:**
  - Experiment II has MetaGPT (multi-agent, Qwen-Coder 480B) generate 5 Python applications, each at 4 increasing levels of requirements (20 repos).
  - The prompts explicitly require OOP and modular files, because in preliminary trials "agents frequently defaulted to creating monolithic scripts or "God Classes"."
  - Smells were detected with PyExamine.
- **Findings:**
  - Abstract: "as models become more capable, they generate increasingly bloated and coupled code." Also: "neither functional correctness nor detailed prompting mitigates this decay."
  - The most prevalent smells in the multi-file projects were Too Many Branches, High Response for a Class, Potential Improper API Usage, Scattered Functionality and **Unstable Dependency**.
  - The "Modular Mirage": the agent splits code into files but related behaviour is scattered across them.
  - Architectural smell counts correlate with total lines of code at ρ = 0.94 (p < 0.001). Requirement detail (Stage) had no effect (p > 0.8).
- **What it does not show:** Cyclic Dependencies appear only as a textbook example of an architectural smell. They are not in the reported prevalent smells, and the paper gives no cycle counts.
- **Caveats:** Python, one framework (MetaGPT), one model, 20 repos, no human baseline for Experiment II. A ρ of 0.94 between raw smell counts and LOC partly reflects that bigger systems have more of everything.

### 5.3 Kashif et al., "Beyond Functional Correctness: Design Issues in AI IDE-Generated Large-Scale Projects" (arXiv 2026). VERIFIED (full arXiv PDF); my check of the dataset

- **Citation:** Syed Mohammad Kashif, Ruiyin Li, Peng Liang, Amjed Tahir, Qiong Feng, Zengyang Li, Mojtaba Shahin. arXiv v1, 7 Apr 2026 (ACM TOSEM template; under review). Already in `dead-code.md` 5.19.
- **Link:** https://arxiv.org/abs/2604.06373. Dataset: https://github.com/Kashifraz/DIinAGP
- **What I looked for:** The paper has no category for cyclic dependencies, barrel or index files, re-exports, or module structure. CodeScene's 9 categories and SonarQube's 11 are method- and file-level (duplication, complex methods, large methods, framework best practices, exception handling, accessibility).
- **The authors say why:** their static analysis "was better suited to lower-level and file-level design issues than to system-wide architecture." So "inappropriate coupling or unclear module boundaries may therefore go undetected."
- **My check (13 Oct 2026, read-only via the authenticated `gh` CLI; DIinAGP commit `7dbeab2e`):**
  - The 10 main projects contain 509 `.js`/`.ts`/`.jsx`/`.tsx` files, of which 14 are named `index.*`.
  - Only 2 are aggregator barrels: `P1_CVbuilder/backend/controllers/index.js` and `models/index.js`. Both are CommonJS, both open with "Export all … from a single file for easy importing," and both end in a commented "Additional … will be exported here" stub.
  - The other `index.*` files are app entry points, Vue Router configs, a config object, and modules with their own code.
  - So barrels were not a pervasive habit in these Cursor-generated projects. The sample is tiny, and the projects mix stacks (Spring Boot, Django, Vue, React).
- **For the post:** Cite this paper for "design-issue studies of AI-generated projects don't look at the module graph," not as evidence about barrels.

### 5.4 Agents repairing cycles and architectural smells. VERIFIED (SmellBench full text); VERIFIED (metadata + abstract) for the other two

- **SmellBench (Dinu, Mihăescu, Rebedea; arXiv 2605.07001, v2 12 May 2026).** https://arxiv.org/abs/2605.07001
  - 11 agent configurations (Codex, Claude Code, Gemini CLI, Mistral Vibe) on 65 hard-severity architectural smells that PyExamine found in scikit-learn.
  - Expert validation: **63.1% of detected smells were false positives**. The best agent resolved 47.7%, and "the most aggressive agent introduces 140 new smells."
  - **Cycles were left out:** "Hub-like Dependency and Cyclic Dependency are excluded due to insufficient instances". scikit-learn had too few to benchmark.
  - Among the false positives were "deliberate facade modules that aggregate public APIs": a re-exporting entry point that a detector flags but an expert keeps. This is the barrel-as-public-API counter-case.
  - Failure mode on dependency smells: agents that fail "identify the correct dependency chain but stop at analysis," never making the file moves and import rewrites. The authors conclude the bottleneck is "the ability to execute coordinated multi-file transformations."
  - Caveats: one Python project, one detector, and no repeated runs.
- **Pandini, Martini, Videsjorden, Arcelli Fontana, "An Exploratory Study on Architectural Smell Refactoring Using Large Languages Models," ICSA-C 2025, pp. 462–471.** https://doi.org/10.1109/ICSA-C65153.2025.00070 (the SINTEF record gives IEEE Xplore 11015021).
  - Abstract: a first attempt to have LLMs suggest refactorings "with a focus on Cyclic Dependencies smells," comparing detailed prompts, RAG, and local vs cloud models.
  - Results are described as "promising" and validated by interviews. "additional and precise context is key." A multi-agent approach "seems to be more suited" as smells get more complex.
  - The abstract gives no numbers. The full text is closed (the Milano-Bicocca repository copy is restricted).
  - Replication package (Zenodo 10.5281/zenodo.19819717): Java, C# and Python; Claude 3.5 Sonnet and Qwen2.5-Coder. Its examples include Qwen outputs that "fabricated class names, non-existent methods, or refactorings that would not compile."
- **Olafsen, Videsjorden, Goknil, Sen, "From Smell to Solution: Multi-Agent LLMs Analyzing Cyclic Dependencies for LLM-enabled Refactoring," AI4TD workshop at XP 2026 (8 Apr 2026).** https://conf.researchr.org/details/xp-2026/xp-2026-international-workshop-on-ai-for-technical-debt-management-in-agile-software-development--ai4td-/2/From-Smell-to-Solution-Multi-Agent-LLMs-Analyzing-Cyclic-Dependencies-for-LLM-enable
  - The method finds strongly connected components in a dependency graph, extracts minimal cycles as evidence, and has LLM agents explain each cycle and where to cut it.
  - The abstract reports reduced SCC size on "seven open-source Python projects" with build and tests intact. It gives no numbers.
- **For the post:** The research on agents and cycles is about _repair_, and it agrees with the practitioner report in 5.9: agents do better when handed the cycle graph than when handed an error.

### 5.5 Repository-level generation and import errors (not cycles). VERIFIED

- **Zhang, Wang, Wang, Chen, Zheng, "LLM Hallucinations in Practical Code Generation: Phenomena, Mechanism, and Mitigation," ISSTA 2025.** https://doi.org/10.1145/3728894, arXiv https://arxiv.org/abs/2409.20550 (full PDF read)
  - Method: six LLMs on CoderEval's 230 Python tasks drawn from real repositories; the hallucinations were manually annotated.
  - "Dependency Conflicts" were **11.26%** of hallucinations: code that relies on "undefined or unimported dependencies" in the project. Environment Conflicts were 0.94%.
- **NL2Repo-Bench (ByteDance Seed et al.; arXiv 2512.12730, v2 8 Jan 2026).** https://arxiv.org/abs/2512.12730
  - Method: agents build installable Python libraries from a spec (104 tasks).
  - Its failure taxonomy says "a significant portion of failures stem from ImportError or ModuleNotFound exceptions." Agents "struggle to correctly structure the package (e.g., missing **init**.py)," so the code is "logically correct but structurally broken."
  - Qualitative only; there are no percentages for this category, and circular imports aren't mentioned.
- **Vangala, Adibifar, Gehani, Malik, "AI-Generated Code Is Not Reproducible (Yet)" (arXiv 2512.22387).** https://arxiv.org/abs/2512.22387
  - Method: Claude Code, Codex and Gemini built 300 projects. 68.3% ran out of the box.
  - Of the 95 that failed, 52.6% failed from code bugs, including agents that "compressed multi-file projects into single files (breaking import paths)."
- **Different thing: package hallucination.** Spracklen et al., "We Have a Package for You!" (USENIX Security 2025; arXiv https://arxiv.org/abs/2406.10279). Over 576,000 samples from 16 LLMs, hallucinated packages averaged "at least 5.2% for commercial models and 21.7% for open-source models," with 205,474 unique fake names. That is about importing third-party packages that don't exist, not about the shape of a project's own module graph. Don't use it for cycles or barrels.
- **For the post:** Agents do get cross-file imports wrong, but the measured failures are missing, unimported or misplaced modules. None of these studies counts import cycles.

### 5.6 Agent PRs that mention cycles or barrels (AIDev). My check (13 Oct 2026), re-run before quoting

- **Data:** the `pull_request` config of AIDev on Hugging Face (`hao-li/AIDev`), the curated AIDev-pop subset of 33,596 agent PRs (see `dead-code.md` 5.13). I queried it through the public datasets-server `/filter` endpoint, with no login.
- **Titles containing "circular" (38 PRs):**
  - About 8 concern module import cycles, and all of them fix or detect cycles, none adds one:
    - Devin "Fix circular import in flow module" ×2 (crewAI #1827, #1829)
    - Devin "consolidate mutually recursive types to resolve circular imports" ×2 (fern #9888, #9987)
    - Devin "add circular dependency check to CI workflow" (cal.com #22026, using `madge` on changed files)
    - Claude Code "resolve circular dependency to enable verbatimModuleSyntax" (Comfy-Org/ComfyUI_frontend #5546, not merged)
    - Codex "remove circular import in TwitterApiReadOnly" (node-twitter-api-v2 #619, merged)
    - Copilot "Fix circular dependency in modal system using dynamic imports" (Umbraco-CMS #20311)
  - The rest are circular references in data, circular buffers or primes, DI or build-system cycles, and UI.
- **"barrel" in title or body (17 PRs):**
  - Agents **added** barrels in 3: AndBible #3481 (Copilot, merged: "Barrel export for easy importing"), antiwork/gumboard #169 (Devin, not merged: a `components/index.ts` barrel "for clean imports") and selfxyz/self #823 (Codex, merged: barrels plus `sideEffects: false` to make a package tree-shakeable).
  - Agents **removed** barrels or barrel exports in 6, all as assigned tasks: cal.com #21267 and #21268 (Devin, merged; requested by a cal.com engineer), cal.com #23567 (Devin, closed), hydro-project/hydro #2009 (Copilot, merged: "unused barrel export"), selfxyz/self #1248 (Codex, merged) and supabase #38289 (Cursor background agent, "Remove barrel files and update imports," closed unmerged).
  - The rest are unrelated (gun barrels, iron barrels) or neutral mentions.
- **Reading:** At the level of PR titles and descriptions, barrels and cycles are rare in agent PRs, and they go both ways. Most cycle and barrel PRs are humans assigning the cleanup. The check can't see a barrel or cycle that an agent created silently inside a larger PR. Measuring that needs the commit-level `pr_commit_details` table (1.3 GB) and a module-graph tool.
- **Caveats:** Title-only for "circular" (the body query timed out). Substring matching. AIDev's languages are mixed.

### 5.7 Vendor guidance that tells agents about barrels and cycles. VERIFIED (official repos and docs); Vendor

- **Vercel, `react-best-practices` agent skill, rule `bundle-barrel-imports`** (vercel-labs/agent-skills; https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/bundle-barrel-imports.md; file added 14 Jan 2026, revised 15 Mar 2026).
  - Title "Avoid Barrel File Imports," impact "CRITICAL," in the "Bundle Size Optimization (CRITICAL)" category, the skill's second priority.
  - Text: "Import directly from source files instead of barrel files." For many React packages "it takes 200-800ms just to import them." The fix is Next.js `optimizePackageImports` or deep imports.
  - It cites "15-70% faster dev boot, 28% faster builds, 40% faster cold starts," from Vercel's 2023 blog post (section 4 should verify those numbers at the source).
  - **Scope note:** the rule is about _importing from_ third-party library barrels (`lucide-react`, `@mui/material`), not about _writing_ barrel files in your own code.
  - The launch post, "Introducing: React Best Practices" by Shu Ding and Andrew Qu (14 Jan 2026, https://vercel.com/blog/introducing-react-best-practices), calls the repo "optimized for AI agents and LLMs." The post itself doesn't mention barrels.
- **Callstack, `react-native-best-practices` agent skill, "Avoid Barrel Exports"** (callstackincubator/agent-skills, `references/bundle-barrel-exports.md`, added 14 Jan 2026; https://github.com/callstackincubator/agent-skills/blob/main/skills/react-native-best-practices/references/bundle-barrel-exports.md).
  - Impact "CRITICAL." It is triggered by, among other things, "Circular dependency warnings in Metro" and when "Hot Module Replacement (HMR) breaks frequently."
  - Its "Circular Dependencies" section says "Barrel files make cycles easier to create accidentally." It shows a Metro `Require cycle:` warning and adds: "Breaks HMR, causes unpredictable behavior."
  - Of the vendor sources found, this is the only one that ties barrels to cycles in guidance written for agents.
- **React Doctor (Million; https://github.com/millionco/react-doctor), "Your agent writes bad React. This catches it."** It ships `no-barrel-import` (bundle-size category, severity "warn"). Ultracite enables it as `react-doctor/no-barrel-import` in the ESLint React preset.
  - The rule skips type-only imports, namespace imports, `.d.ts` and `*.server.*` files, and imports that consume every runtime export of the barrel.
  - Its fallback message: "Importing from an index file pulls in extra code."
  - **On 12 Sep 2026 (commit `c9e3e159`, PR #1802) React Doctor made it opt-in.** Its rule-retirements doc (https://github.com/millionco/react-doctor/blob/main/docs/rule-retirements.md) says "Code style, library migration, and unmeasured performance advice need an explicit user choice," and lists `no-barrel-import` as optional for when "The user requests this cleanup or migration and checks behavior and cost." The source shows `defaultEnabled: false` (oxlint plugin 0.9.18).
  - **For Hayden:** an agent-focused linter has decided barrel imports are not a default defect, while Ultracite turns the rule on as an error. Worth a sentence in the post, or a look at the preset.
- **Ultracite's own template** (`packages/cli/src/data/rules.ts`, line 92) tells agents to "Avoid barrel files (index files that re-export everything)." It says **nothing about import cycles**.
- **Not found:**
  - No official Anthropic (Claude Code docs, prompting guide) or Cursor documentation that mentions barrel files or circular imports.
  - Next.js's agent guide (https://nextjs.org/docs/app/guides/ai-agents) only points agents at version-matched bundled docs.

### 5.8 Agent instruction files point both ways. My check (13 Oct 2026; GitHub code search), re-run before quoting

- **Method:** GitHub code search for `barrel` in files named `CLAUDE.md` and `AGENTS.md` (run with the authenticated `gh` CLI, read-only; re-run unauthenticated or by hand). I read the first 60 hits of each from the relevance-ranked text fragments.
  - GitHub's reported totals (about 11,000 and 17,700) are approximate and include unrelated uses (gun barrels, game assets). Don't quote them.
  - Ultracite's own line ("index files that re-export everything") matched only a few hundred files, so most of these mentions are not Ultracite's template.
- **Instructions to use barrels are common:**
  - reaviz/reaviz CLAUDE.md: "Use barrel exports (`index.ts`) for each module"
  - reaviz/reagraph: each directory exports "via `export * from './ComponentName'` pattern"
  - basmilius/flux: "Always import from a directory's barrel (`index.ts`)"
  - DamianB-BitFlipper/proton-drive-sync AGENTS.md: "Use `index.ts` barrel files to re-export from directories"
  - wenzisay/prompt-clip-web (in Chinese): every directory has an `index.ts` re-export, and the agent should update the barrel when adding a module
- **Instructions to avoid them are common too:**
  - LeavittSoftware/titanium-elements: "Don't add barrel `index.ts` exports"
  - mohebifar/tooscut: "Do not create `index.ts` files within directories to aggregate exports."
  - millionco/expect AGENTS.md: "don't create or use barrel files"
  - sandros94/nuxt-qrcode: "Avoid barrel files"
  - several copies of Ultracite's template
- **One links barrels to cycles:** UnderHear/EaseCut AGENTS.md (in Chinese) says public APIs are exported explicitly from the entry file, and internal modules must not depend on the public barrel and so form circular references.
- **Rough tally (my reading of truncated fragments):**
  - CLAUDE.md: about 12 "use barrels" vs 6 "avoid barrels," the rest describing package entry points or unrelated.
  - AGENTS.md: about 11 vs 10, 3 of the 10 from Ultracite's template.
- **For the post:** Agents are told both things. Many projects' own instructions make "barrel per folder" the house style an agent will follow. That is a hypothesis about where agent barrels come from, not a measurement.

### 5.9 Anecdotes: agents, barrels and cycles. ANECDOTAL only

- **A barrel cycle took down a production app.** anthropics/claude-code issue #36673, 20 Mar 2026, by aefdigitalbr; closed as stale. https://github.com/anthropics/claude-code/issues/36673
  - Claude Code (Opus 4.6) added an import in a React + Vite + Supabase app. The cycle ran through a barrel: `MenuCheckout → @/contexts/customer → CustomerAuthContext → @/repositories/cardapio (barrel index.ts) → CustomerRepository → @/contexts/customer/types`.
  - Production error: "ReferenceError: Cannot access 'T' before initialization."
  - The fix attempts: "Claude changed barrel imports to direct imports (commit 1)," then moved types to a shared layer. Neither fixed it, and four broken commits reached production.
  - The reporter's ask: Claude should "detect circular dependencies before adding new imports," especially through barrel files.
  - This is the textbook ESM temporal-dead-zone failure (section 2), caused by an agent, in one user's report.
- **A user's log of Claude Code bugs, with a cycle category.** anthropics/claude-code issue #39703, 27 Mar 2026, by casriraj. https://github.com/anthropics/claude-code/issues/39703
  - A 67K-line Python/Tkinter app. Of 243 logged bugs, 55 (23%) were traced to Claude's code generation.
  - "Category K: Circular Dependencies and Import Issues," with one example: `ledger_tags -> report_engine -> schedule_iii_report -> ledger_tags`, an ImportError at startup.
  - The pattern: "Claude adds imports without checking the project dependency graph." The fix was a lazy import inside the function.
  - The reporter ranks it P3 with a frequency of "1+." One incident, not a trend.
- **Function-scope imports, the Python workaround for cycles, as an agent habit.** anthropics/claude-code issue #7013, 2 Sep 2025, by Matt Godbolt; open with 13 comments. https://github.com/anthropics/claude-code/issues/7013
  - "Nothing I can do seems to stop Claude from putting imports at function scope." That happened despite a lint rule and a CLAUDE.md instruction.
  - In its own reply, the model guessed it was a habit from code that imports "locally to avoid circular imports." Treat that as a model's after-the-fact story, not evidence of cause.
  - Commenters report the same in JavaScript ("This happens in JavaScript as well"), and teams wrote pre-commit hooks and smoke tests to catch it.
- **Böckeler: an agent-built TypeScript app grew a domain barrel; dependency-cruiser kept agents in line.** "Maintainability sensors for coding agents," martinfowler.com, 27 May 2026. https://martinfowler.com/articles/sensors-for-coding-agents.html. The app is a Next.js/React/TypeScript dashboard built mostly with Cursor, Claude Code and OpenCode.
  - The one interesting finding from an Opus 4.7 coupling review: an `index.ts` in the domain folder "indiscriminately exposed all files in ./domain, and is imported by lots of places." She notes it "does have its pros and cons." She doesn't say who wrote it.
  - After she added dependency-cruiser rules, "The agent violated the rules a handful of times after I introduced them" and then self-corrected from the tool's output.
  - Her conclusion: dependency parsers "can be effective live sensors" for folder structure and dependency direction, "but they can only go so far."
  - Her coupling-report prompt asks for "notable cycles or mutual dependencies."
- **An agent fixing cycles works when given the graph.** yureki_lab, "How I Broke 37 Circular Imports in a Python Codebase With Claude Code," DEV Community, 8 Oct 2026. https://dev.to/yureki_lab/how-i-broke-37-circular-imports-in-a-python-codebase-with-claude-code-4cia
  - The codebase: about 180k lines of Python with 37 cycle chains, held together by 214 `# avoid circular import` comments.
  - Pasting the ImportError into Claude Code produced another function-level import: "technically correct, completely useless."
  - Using a `pydeps` graph, one cycle per PR, worked. The lesson: "give the agent the graph, not the error message."
  - The cycles pre-dated the agent. The author disagreed with the agent's choice on 5 of 37.
- **The pro-barrel view with agents.** Thijs Koerselman, "Why I Prefer Barrel Files in 2026," codecompose.com, 21 Apr 2026 (updated 24 Apr). https://codecompose.com/articles/why-i-prefer-barrel-files-in-2026/
  - "In 2026 I no longer update barrel files by hand." "Coding agents handle this well." On cycles through a barrel: "The fix is a lint rule."
  - His claim that lazy dev servers neutralise the cost conflicts with Vite's own performance guide (section 4).
  - Opinion piece. Use it as the honest counter-case.
- **Agents removing barrels on request.** The Claude GitHub app's series of "refactor: flatten … barrel" PRs in nodetool-ai/nodetool (Sep–Oct 2026; e.g. #6054, 3 Oct 2026, merged): a one-importer barrel was deleted because "the barrel added a hop and hid nothing." Also the cal.com and supabase PRs in 5.6.
- **Tooling pointer (section 6):** microsoft/TypeScript PR #64035 (26 Aug 2026, opened by the Copilot coding agent, still open) proposes that auto-import "Prefer index-file re-exports among otherwise-equivalent relative candidates." It follows issue #64034: in TypeScript 7, whether auto-import picked `./utils/double/double.js` or the barrel depended on filename sort order. Andrew Branch replied that directory imports "are not a feature of ESM resolution" under `nodenext`. The PR text says it will "Preserve … cycle avoidance." Editors' auto-import choices shape whether code goes through barrels; I didn't check how TypeScript avoids cycles there.

### 5.10 What I did not find

- **No study measures how often coding agents create barrel files**, in any language. 5.6 and 5.8 are quick checks, not studies.
- **No study measures import cycles in agent-written JavaScript or TypeScript.** The one causal study is Java (5.1) and finds no rise. The generation studies are Python and report coupling smells, not cycles (5.2, 5.3).
- **No study connects agents and the TDZ error** ("Cannot access 'X' before initialization") beyond the single issue in 5.9.
- **No SWE-bench-style failure taxonomy with a circular-import category.** The trajectory studies I checked (Majgaonkar et al., arXiv 2511.00197; TRAJEVAL, arXiv 2603.24631; NL2Repo-Bench) use broader buckets.
- **No official Anthropic, Cursor or OpenAI guidance** that mentions barrels or import cycles. The vendor guidance found is Vercel's and Callstack's agent skills and React Doctor (5.7).
- **No study of agents using module-graph tools** (madge, dependency-cruiser, skott) as feedback, beyond Böckeler's report and the AI4TD workshop abstract.

---

## 6. Tooling and limits

### 6.1 Cycle detection needs resolution and a whole-project graph. VERIFIED (official docs)

- **ESLint core is per-file.** Oxc's docs: "ESLint evaluates rules per file and does not provide a built-in project graph." Plugins "must rebuild module resolution and the module graph outside of ESLint's core." https://oxc.rs/docs/guide/usage/linter/multi-file-analysis (vendor page; see also dead-code.md 6.1 for ESLint's own docs).
- **eslint-plugin-import brings its own resolvers and caches.** README, "Resolvers": "it's not always obvious where `import x from 'module'` should look," so v0.11 introduced pluggable resolvers (`import/resolver`). README, `import/cache`: memoisation avoids "the copious amount of `fs.statSync`/module parse calls required to correctly report errors." For long-running processes (`eslint_d`, editors) it needs a staleness setting.
- **No-cycle can't see what it can't resolve.** eslint-plugin-import's `no-cycle` returns early when an import doesn't resolve ("no-unresolved territory" in the source). Its docs: `require` cycles "within imported modules may not be detected," because the infrastructure "only registers `import` statements in dependencies."
- **Oxlint resolves `tsconfig` paths automatically** for `import/*` rules. "Oxlint automatically discovers `tsconfig.json` to resolve TypeScript path aliases." (same Oxc page)
- **File-level warnings and architecture-level smells only partly overlap.** In 103 Java projects, 33.79% of warning types never co-occurred with any architectural smell, including Cyclic Dependency (Esposito et al., SQJ 2025; 3.17).
- **Biome v2 needed a project scanner first.** Biome v2 announcement (Emanuele Stoppa, 17 Jun 2025, https://biomejs.dev/blog/biome-v2/): "Before version 2.0, Biome lint rules could only operate on one file at a time." The new scanner indexes the project; "A file scanner comes with its baggage: slowness." A full scan runs "only when project rules are enabled." Biome's domains page: enabling the Project domain makes Biome "scan the entire project," and "The scanning phase will have a performance impact."

### 6.2 eslint-plugin-import `no-cycle`: history, options and documented cost. VERIFIED (docs, changelog, issues)

- **History:**
  - Requested in issue #941, "rule to prohibit circular dependencies," by Jordan Harband (ljharb), 9 Oct 2017: "I'd love a rule that errored out whenever any circular dependency exists."
  - `no-cycle` shipped in **v2.10.0 (29 Mar 2018)**. `no-self-import` shipped a month earlier, in **v2.9.0 (21 Feb 2018)**.
  - **v2.30.0 (2 Sep 2024)** switched to a strongly-connected-components prefilter (PR #2998, soryy708). The PR: running Tarjan's SCC once instead of a search "for each linted file (which turned us O(n^2))." v2.31.0 (3 Oct 2024) stopped recomputing SCCs per file and added `disableScc`.
- **The docs say it is slow, in so many words.** "When Not To Use It": "This rule is comparatively computationally expensive." "If you are pressed for lint time," "you may not want this rule enabled." (Same paragraph in eslint-plugin-import-x, and nearly the same in Biome, 6.3.)
- **`maxDepth`** prevents "full expansion of very deep dependency trees." The docs: "This is not necessarily recommended, but available as a cost/benefit tradeoff mechanism." A cycle longer than `maxDepth` is not reported.
- **`ignoreExternal`** stops the search at `node_modules`, "for reducing total project lint time."
- **`allowUnsafeDynamicCyclicDependency`** allows a cycle with a dynamic `import()` in it. The docs: cyclic dependencies "are **always** a dangerous anti-pattern as discussed extensively in #2265."
- **`disableScc`**: the SCC step "may be more expensive than the time it saves" under some configurations.
- **typescript-eslint's performance guide** (https://typescript-eslint.io/troubleshooting/typed-linting/performance): some eslint-plugin-import rules "cause the plugin to do its own parsing, and file tracking," and "This double parsing adds up for large codebases." It recommends running `import/no-cycle` (with `no-named-as-default`, `no-unused-modules`, `no-deprecated`) "only ... at CI/push time."
- **User reports (ANECDOTAL, `TIMING=1` output pasted in issues):**
  - #2348 (3 Jan 2022): about a hundred files; `import/no-cycle` took 304,818 ms (97.0% of lint time) on 2.25.3 vs 4,207 ms on 2.24.2.
  - #3047 (4 Sep 2024): 21.5 s (52.9%) on 2.29.1, then 67.4 s (76.8%) on 2.30.0, "3.2 times slower." `maxDepth: 3` "made no performance difference."
  - #2241 (29 Sep 2021), on the Lens codebase: Node ran out of heap. With depth 5, lint took "over half an hour" against about 2 minutes before.
  - #3060 (Sep 2024) and #3148 (Jan 2025, flat config) report further regressions. Still open.

### 6.3 How Oxlint and Biome implement it. VERIFIED (docs and Rust source, main branches, 13 Oct 2026)

- **Oxlint `import/no-cycle`** (category: restriction; docs say added in v0.0.13; source `crates/oxc_linter/src/rules/import/no_cycle.rs`):
  - "Why is this bad?": "Dependency cycles lead to confusing architectures where bugs become hard to find." "It is common to import an `undefined` value" caused by a cycle.
  - Options and defaults: `maxDepth` (unbounded), `ignoreTypes` (**true**), `ignoreExternal` (false), `allowUnsafeDynamicCyclicDependency` (false). Paths through `node_modules` are never traversed.
  - Implementation: a `run_once` per file over a shared module graph. When `maxDepth` is unbounded, a prefilter first asks whether the file is in any cycle at all, "one traversal answering for every direct import at once."
  - Oxc's multi-file page (vendor claim, no numbers): it "lints files and builds the module graph in parallel" and "typically completes comparable `import/no-cycle` checks in a few seconds," against reports of the original "taking tens of seconds, or - on larger repositories - over a minute." Its example config sets `"maxDepth": 3`.
  - The import plugin's alpha announcement (Boshen, 4 May 2024, https://oxc.rs/blog/2024-05-04-import-plugin-alpha) listed eslint-plugin-import's "execution time exceeding one minute when certain rules are enabled" and "188 dependencies totaling 30M" as problems to solve.
- **Biome `noImportCycles`** (since **v2.0.0**; group `suspicious`; **not recommended**; default severity warning; domain **Project**; source marked `.same()` as `import/no-cycle`; source `crates/biome_js_analyze/src/lint/suspicious/no_import_cycles.rs`):
  - "Cycles can lead to symbols that are unexpectedly `undefined`," and are "generally considered poor code hygiene."
  - Note box: "This rule is computationally expensive." (The rest is the eslint-plugin-import sentence.)
  - It looks up precomputed SCCs of the module graph (`js_module_sccs`) and skips `node_modules`.
  - **Self-imports are allowed on purpose:** "files that import themselves are allowed," to support `export * as ns from './self.js'` namespaces instead of static-only classes. Oxlint's `no-cycle` also skips a self-referencing named re-export. I didn't test whether `import/no-self-import` flags the same pattern.
- **`import/no-self-import`:** eslint-plugin-import docs: "Forbid a module from importing itself. This can sometimes happen during refactoring." Oxlint's docs add that it "creates a circular dependency," which can cause "infinite loops, unresolved imports, or `undefined` values."

### 6.4 Type-only imports: the implementations disagree on `import { type X }`. VERIFIED (each tool's source and docs, plus TypeScript docs and a Next.js issue)

- **The TypeScript rule** (`verbatimModuleSyntax` tsconfig reference, introduced in TS 5.0):
  - `import type { A } from "a";` is "Erased away entirely."
  - `import { type xyz } from "xyz";` is "Rewritten to 'import {} from "xyz";'". That still loads and evaluates the module.
  - Without `verbatimModuleSyntax`, TypeScript's default import elision drops imports used only as types.
- **typescript-eslint `no-import-type-side-effects`** explains the same trap: `import { type A, type B } from 'mod'` becomes `import {} from 'mod'`, "the same as" `import 'mod'`, which can "leave behind a "side effect" import at runtime."
- **How each cycle checker treats the edge:**

| Tool | `import type { X }` | `import { type X }` (all specifiers inline-type) | Source |
| --- | --- | --- | --- |
| eslint-plugin-import / import-x `no-cycle` | ignored (always) | ignored (`specifiers.every(importKind === 'type')`) | `src/rules/no-cycle.js`; docs: ignores type-only imports "which have no runtime effect" |
| Oxlint `import/no-cycle` | ignored by default (`ignoreTypes: true`) | ignored (oxc marks `import { type foo }` as `is_type`) | `no_cycle.rs`, `oxc_linter/src/module_record.rs` |
| Biome `noImportCycles` | ignored by default (`ignoreTypes: true`) | **counted**: inline type imports "aren't considered as type-only," because the compiler keeps them under `verbatimModuleSyntax` | `biome_rule_options/src/no_import_cycles.rs` |
| dependency-cruiser `no-circular` | **counted** by default; the docs show a `viaOnly: { dependencyTypesNot: ['type-only'] }` rule for "cycles at run time" | — | `doc/rules-reference.md` |
| madge | counted unless `detectiveOptions.ts.skipTypeImports: true` | — | README |

- **Why it matters (2.7):** Next.js #91906 is exactly this case. Under `verbatimModuleSyntax`, an all-inline-type import kept a runtime edge, closed a cycle, and threw "Cannot access 'x' before initialization." Biome's choice flags it; Oxlint's and eslint-plugin-import's defaults don't.
- **The gap closes with a companion rule.** `typescript/no-import-type-side-effects` and `import/consistent-type-specifier-style: prefer-top-level` turn `import { type X }` into `import type { X }`, which every tool agrees is erased. (Ultracite's Oxlint core preset turns on both; see "Notes on Ultracite's presets".)
- **The other side:** a type-only cycle still couples the files at compile time. TypeScript has to check them together, and they can't be moved apart without breaking. The tools ignore type edges because cycle rules target runtime behaviour, not design. dependency-cruiser's default counts them.

### 6.5 Dedicated tools: madge, dependency-cruiser, skott, dpdm. VERIFIED (READMEs and npm registry)

| Tool | First on npm | Latest (13 Oct 2026) | Notes |
| --- | --- | --- | --- |
| madge | 20 May 2012 | 8.0.0 (registry last modified Aug 2024) | "a developer tool for generating a visual graph of your module dependencies, finding circular dependencies." `madge --circular`. Built on `dependency-tree`. Needs `tsConfig`/`webpackConfig` to resolve aliases. |
| dependency-cruiser | 20 Nov 2016 | 18.6.0 | "Validate and visualise dependencies. With your rules." The `--init` config's `no-circular` rule is `severity: 'warn'`, with the comment "This dependency is part of a circular relationship," suggesting "dependency inversion" and modules with "a single responsibility". |
| skott | 4 Sep 2022 | 0.35.12 | "Deeply detects **circular dependencies** in an efficient way," with an optional max depth. |
| dpdm | 25 Sep 2016 | 4.3.0 | Not opened beyond the registry. |

- **A claim to avoid:** skott's README says ESM users "can consider yourself safe about module resolution inconsistencies," which is true only of resolution. ESM cycles still throw TDZ errors at evaluation (2.3, 2.4).
- **Why dedicated tools still exist:** they run outside the lint loop, draw the graph, and let you write layer rules ("`ui` may not import `db`"), which no lint cycle rule does. dependency-cruiser's `via`/`viaOnly` restricts which cycles are allowed.

### 6.6 What a cycle rule can't see, and how it can be gamed. VERIFIED (from the docs above)

- **Depth caps hide long cycles** (`maxDepth`), and the cost of turning them off is real (6.2).
- **Dynamic `import()` breaks the static edge.** With `allowUnsafeDynamicCyclicDependency`, moving one import into a function silences the rule. That can be a legitimate fix (it changes evaluation order) or a dodge.
- **Unresolved imports are invisible.** Path aliases without resolver config, generated files and `require` inside imported modules (eslint-plugin-import) drop out.
- **External packages are skipped.** Oxlint and Biome never traverse `node_modules`; eslint-plugin-import does unless `ignoreExternal`. MDN: library-to-library cycles are "harder to fix."
- **Type-only edges are a judgement call** (6.4).
- **A cycle isn't always a bug.** circular-dependency-plugin: "the presence of a circular dependency doesn't always imply a bug." MDN: they "don't always fail." Rollup lists them as an ESM feature. The case for the rule is Parnas's and Martin's: what cycles do to testing, releasing and change, plus the evaluation-order hazard.

---

## Notes on Ultracite's presets (for Hayden, not for the post)

Read from `packages/cli/config` in this worktree on 13 Oct 2026. These are inconsistencies to decide on, not things to write around.

- **Namespace imports diverge across linters.** Biome core has `noNamespaceImport: "error"`. Oxlint core has `import/no-namespace: "off"`, and ESLint core has `import-x/no-namespace: "off"`. No comment records why. The AGENTS.md template (`src/data/rules.ts`) tells agents to "Prefer specific imports over namespace imports," which only Biome enforces. The evidence in 4.15 is weak for a blanket ban: bundlers handle static `ns.x`, and `import defer` only allows namespace imports. Biome's own docs concede the tree-shaking point.
- **"Barrel" means different things in each preset.** Oxlint core has `oxc/no-barrel-file: "error"`, which counts only `export *` subtrees over 100 modules. It flags `export type *` and lets a 120-line named re-export file through (my check, 4.14). Biome core has `noBarrelFile: "error"`, which fires on any single value `export … from`. ESLint core has no barrel rule (only `react-doctor/no-barrel-import` in the React preset). So the same file can pass one preset and fail another.
- **`noReExportAll` is off in Biome core**, with no comment, while Oxlint's barrel rule targets exactly `export *`.
- **Cycle rules are on in Oxlint and ESLint core, but Biome's needs the type-aware preset.** Oxlint core has `import/no-cycle: "error"`, and ESLint core enables every non-deprecated `import-x` rule, including `no-cycle`. Biome core has `noImportCycles: "off"` under the comment "Project/Scanner rules. Use ultracite/biome/type-aware to enable," and `biome/type-aware` turns it on. That matches Biome's docs (the Project domain triggers a full scan; 6.1).
- **The inline-type-import gap is closed by companion rules in all three presets.** Oxlint's and eslint-plugin-import's cycle rules ignore `import { type X }`, which `verbatimModuleSyntax` keeps as a runtime `import {}` (6.4). Oxlint core also turns on `typescript/no-import-type-side-effects` and `import/consistent-type-specifier-style: ["error", "prefer-top-level"]`, and ESLint core has the same `prefer-top-level` setting, so those imports get rewritten to `import type`. Biome core has `useImportType: "error"`. Its default `auto` style uses `import type { T }` unless values are imported alongside types, and it "groups inline type imports into a grouped `import type`" (rule source). So all three presets close the gap with a companion rule, not with the cycle rule.
- **React Doctor's `no-barrel-import` is an error in Ultracite but opt-in upstream.** Ultracite sets `react-doctor/no-barrel-import: "error"` in `oxlint/js-plugins` and in the ESLint React preset. React Doctor made it opt-in on 12 Sep 2026 (PR #1802), calling it "unmeasured performance advice" (5.7).
- **The AGENTS.md template says nothing about import cycles**, though `import/no-cycle` is on. It covers barrels and namespace imports only.

## Things that turned out wrong or different

**History (section 1)**

- **Parnas 1972 isn't really about cycles.** It is about information hiding. The acyclic "uses" hierarchy gets one section, framed as a partial order. The explicit "loop free" rule, "nothing works until everything works," and the "sandwiching" fix are in **Parnas 1979** (IEEE TSE). Melton and Tempero and Oyetoyan cite that paper's ICSE 1978 conference version.
- **Martin's earliest statement is a 1995 Usenet post, not a paper.** comp.object, 16 Mar 1995: "The dependency structure for released components must be a DAG." The name "Acyclic Dependencies Principle" first appears in print in "Granularity," _C++ Report_, Nov 1996. Melton and Tempero cite that column as "Nov–Dec 1996." It applies to **released packages**, not files.
- **Lakos 1996 is dated 10 Jul 1996 by the publisher, copyright 1997.** Either year shows up in citations.
- **Go has no FAQ entry on import cycles.** The rationale is in Rob Pike's SPLASH 2012 talk. The spec sentence is "illegal for a package to import itself, directly or indirectly." The compiler message is `import cycle not allowed`.
- **Every language that bans cycles bans them at a coarse unit** (package, crate, target, module), not at the file. JavaScript's `no-cycle` applies the rule per file, which is stricter.

**JavaScript behaviour (section 2)**

- **Cycles are a designed-for ESM feature, not undefined behaviour.** The spec's Cyclic Module Records handle them, and Rollup's FAQ lists "circular references" as an ESM advantage. The hazard is evaluation order: `const`/`let`/`class` exports throw if touched during top-level evaluation, `function` exports don't.
- **skott's README overstates ESM safety.** "you can consider yourself safe" is about resolution only; ESM cycles still throw TDZ errors.
- **React Fast Refresh docs don't mention cycles.** Vite's HMR docs do.
- **Angular CLI added cycle warnings in 2017 and turned them off by default in 2021** for rebuild performance. It didn't keep them.

**Research on cycles (section 3)**

- **The main Oyetoyan defect paper is JSS 2013,** not CSMR-WCRE 2014. The CSMR-WCRE 2014 paper is about persistence across releases (>99%). The change-proneness paper (SANER 2015) is by Oyetoyan, **Falleri, Dietrich, Ježek** (Crossref order).
- **SANER 2015's result is weaker than its abstract.** Classes _in_ cycles were significantly more change-prone in only 2 of 12 systems. The effect appears when neighbours are added, which also enlarges the group.
- **Mo et al. (WICSA 2015) have no "Improper Interface" pattern.** The five are Unstable Interface, Implicit Cross-module Dependency, Unhealthy Inheritance Hierarchy, Cross-Module Cycle and Cross-Package Cycle. Only cycles crossing module boundaries count.
- **Xiao et al. (ICSE 2016) is not about cycles.** Its four patterns are hub, anchor-submissive, anchor-dominant and modularity violation. The author PDF prints the wrong DOI; the correct one is 10.1145/2884781.2884822.
- **Laval et al.'s tools are eDSM and CycleTable,** not "eCAADA" or "ECycle." The JOT paper is 2012 (11(1)), despite "© JOT 2011" on its banner.
- **Two pictures of cycle lifetime.** Oyetoyan: >99% of in-cycle components stay in a cycle. Sas et al.: half of cycle _instances_ vanish within 6–10 versions. One tracks components, the other tracks each cycle's identity. Not a contradiction.
- **Size confounds every defect result.** In-cycle classes are bigger (ActiveMQ: 32.5% of classes, 55% of code). Controlling for size cuts Cyclic Dependency's predictive share from 39.7% to 12–29% of commits (Sas et al.). Don't write "cycles cause defects."
- **Oyetoyan's JSS paper contradicts itself on commApp** (34% vs 9% of packages in the text, 17.3% vs 9.1% in Table 5). Quote the table.

**Barrel files (section 4)**

- **Atlassian's post is from 26 Jun 2025, not 2024.** The "75%" is CI build minutes saved, mostly from test selection running 88% fewer unit tests. It is not 75% faster compilation.
- **Vercel's "90% faster reloads"** is one customer's PR comment (222.4 s → 23.1 s). Its "40% faster cold starts" is "paired with other improvements" in Next.js 13.5. Its "200~800ms just to import" has no source.
- **Hagemeister's "60-80% faster"** isn't measured in the post. Only the synthetic module-load table is.
- **Navan's arithmetic is off:** $0.051 → $0.022 is a 57% decrease, not 44%.
- **Codecentric's 1.7 → 2.7 → 2.0 s** are profiled times. The unprofiled baseline was 0.7 s.
- **Oxlint's `oxc/no-barrel-file` docs show `import * as ns` as invalid,** but the rule only inspects `export *` entries, and my check confirms `import * as` alone isn't flagged. It does flag type-only `export type *`, which Biome exempts.
- **The ESLint plugin's default threshold is 3, not 5** as its README example suggests.
- **Angular's advice went "Do" → "Consider" → removed** (23 May and 27 Sep 2016). The "remain valuable but are not a matter of Angular style" line is from the angular.io changelog, not the style guide.
- **Jest never documented the barrel cost.** Issue #11234 was auto-closed as "not planned" in July 2026.

**Agents (section 5)**

- **Kashif et al. (2604.06373) says nothing about cycles or barrels.** It is a design-issue study at method and file level. The authors say their tools can't see module boundaries.
- **"AI-Generated Smells" (2605.02741) mentions Cyclic Dependencies only as a definition.** Its measured architectural smells are Unstable Dependency and Scattered Functionality, in Python MetaGPT projects. Don't cite it for "agents create cycles."
- **The architectural-smell work on LLMs and cycles is about repair, not creation** (SmellBench, Pandini et al., Olafsen et al.). SmellBench even had to drop Cyclic Dependency for lack of instances in scikit-learn.
- **Vercel's agent rule is about consuming third-party barrels**, with `optimizePackageImports` as the fix. It doesn't tell agents not to write barrels in their own code.
- **React Doctor's `no-barrel-import` is now off by default** (since 12 Sep 2026). A source saying React Doctor flags barrel imports out of the box is out of date.
- **Package hallucination (Spracklen et al.) is not an import-structure finding.** It concerns non-existent third-party packages.

**Tooling (section 6)**

- **The tools disagree on whether `import { type X }` is a cycle edge.** Oxlint and eslint-plugin-import ignore it; Biome counts it, because `verbatimModuleSyntax` keeps it as `import {}`. A Next.js issue (#91906) shows that exact case throwing at runtime.
- **dependency-cruiser and madge count type-only edges by default.** The lint rules don't.
- **Both Oxlint's `no-cycle` and Biome's `noImportCycles` deliberately skip a self-referencing `export * as ns from './self'`.** Whether `import/no-self-import` flags that pattern wasn't tested.
- **Oxc's multi-file page claims "a few seconds" against "tens of seconds" for eslint-plugin-import** with no numbers, repo or hardware. Its own example config uses `maxDepth: 3`.
- **eslint-plugin-import's 2024 SCC optimisation made some projects slower** (#3047: 21.5 s → 67.4 s), and those reports are still open.

## Unverified or dropped

**History (section 1)**

- **_Clean Architecture_ (2017), chapter 14 "Component Coupling":** O'Reilly returned 403. Not opened.
- **_Agile Software Development: Principles, Patterns, and Practices_ (2002):** not opened.
- **Lakos's text** (definitions of levelization and CCD, pp. 247–256 on "uses in name only"): only the publisher's TOC was read.
- **Dijkstra 1968 (THE):** metadata only.
- **Parnas ICSE 1978** (conference version of the 1979 paper): not opened; the 1979 journal text was.
- **ES2015 modules' design goal of supporting cycles:** the Exploring ES6 chapter and the old ECMAScript wiki (`harmony:modules`) were unreachable (404 and blocked Wayback). Secondary posts say cyclic dependency support was a design goal. UNVERIFIED; use the spec (2.3) and Rollup's FAQ instead.
- **A primary doc saying modules inside a Rust crate may form cycles:** not found. Cite Cargo's crate-level error only.
- **When CPython added "(most likely due to a circular import)" to its ImportError:** the string is in current CPython source (`Python/ceval.c`, `Objects/moduleobject.c`), but I didn't pin the version.

**JavaScript behaviour (section 2)**

- **esbuild's handling of cycles:** nothing in its docs. Not cited.
- **React Fast Refresh and cycles:** nothing in the Next.js, React Native or Gatsby docs. Not cited.
- **Fowler, "Reducing Coupling," _IEEE Software_ 18(4), 2001** ("you have to go around the cycle many times"): seen only as cited by Melton and Tempero.

**Research on cycles (section 3)**

- **Le, Link, Shahbazian, Medvidovic (ICSA 2018) full text:** closed. Abstract only (421 versions, 8 systems), and no cycle-specific numbers.
- **Sas et al. 2019** (open-source Java smell lifetimes, "a few weeks"): seen only as cited in Sas et al. 2022.
- **Al-Mutawa et al. ASWEC 2014 full text:** not opened; the numbers come from the 2013 thesis.
- **Dietrich et al. "Barriers to Modularity" (TOOLS 2010), Melton and Tempero ESEM 2007, Fontana et al. "Arcan" (ICSAW 2017), Feng and Mo JSEP 2023, Kazman et al. ICSE SEIP 2015:** metadata only or not opened.
- **Related-work claims in Feng et al.** (Zazworka 2013, MacCormack 2006, Lu 2016, Snipes 2018): not checked against the originals.
- **ArchLintor (SBES 2025) and archlint:** seen only through search summaries.
- **Practitioner claims dropped:** "most repos have between 0 and 30 cycles" (search snippet).
- **No study found** of module-level import cycles in JS/TS codebases (prevalence, defects, or TDZ bugs mined from issues), or a peer-reviewed count of npm package-level cycles. Bleckley's 2020 npm count (about 150,000 of 1.3 million packages) is package-level and a single blog post.

**Barrel files (section 4)**

- **Hagemeister's load-time table** is an image. The numbers were checked against the derived calculations in his text.
- **Rspack's ByteDance app numbers:** tool-author data on an unnamed internal app.
- **Dropped:** React Summit US 2026 talk "The Hidden Cost of Barrel Files" (search snippet only); reactuse.com and DEV posts by tassiofront and chintan121 (secondary, not opened); Knip's old performance-page claim about star re-exports (no longer on the page); microsoft/TypeScript #61400 (not opened, not tied to barrels); Speakeasy's "Disabling Barrel Files" docs (vendor, not opened).
- **No peer-reviewed study of barrel files,** no TypeScript-team measurement of their type-checking cost, and no React, Remix, Svelte or Nuxt guidance found.

**Agents (section 5)**

- **Pandini et al. ICSA-C 2025 results:** the full text is restricted; I have only the abstract, which gives no numbers.
- **Olafsen et al. AI4TD 2026:** abstract only; no numbers.
- **Amasanti and Jahić, "The Impact of AI-Generated Solutions on Software Architecture and Productivity" (ECSA 2025 workshops, arXiv 2506.17833):** a practitioner survey, cited by Larsen and Moghaddam. Seen only in search summaries; not opened. Not about cycles.
- **GitHub code search totals for "barrel" in CLAUDE.md/AGENTS.md (about 11k/17.7k):** approximate, noisy, and partly Ultracite's own template. Dropped as a number.
- **Dropped:** RapidDev's "how to instruct Cursor AI to avoid circular imports" tutorial (an SEO page; its claim about how Cursor picks imports is unsourced). A Medium post claiming Google and Microsoft studies of AI cycle detection (no sources). The codescan.dev/polyscan blog (vendor marketing, no data).
- **Not used:** "Exploring Architectural Smells Detection Through LLMs" (ECSA 2025; LLMs detecting hub-like dependencies). It is detection, not agent behaviour.

**Tooling (section 6)**

- **dpdm:** only the npm registry entry was checked.
- **An independent benchmark of Oxlint's or Biome's cycle rule against eslint-plugin-import:** not found. A DEV post promoting `eslint-plugin-import-next` claims 100× with no reproducible method. Dropped.
