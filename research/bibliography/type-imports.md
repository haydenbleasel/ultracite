# Type-only imports and the rules that enforce them: literature and source notes

Compiled 2026-11-17 for the Ultracite research post on type-only imports. The rules: typescript-eslint's `consistent-type-imports`, `consistent-type-exports` and `no-import-type-side-effects`; eslint-plugin-import's and eslint-plugin-import-x's `consistent-type-specifier-style` and `no-duplicates`; Oxlint's ports of all five; and Biome's `useImportType` and `useExportType`. In Oxlint core Ultracite turns on `typescript/consistent-type-imports`, `typescript/consistent-type-exports` (type-aware, so it runs only with `options.typeAware`), `typescript/no-import-type-side-effects`, `import/consistent-type-specifier-style` (`"prefer-top-level"`) and `import/no-duplicates`; ESLint core turns on every non-deprecated typescript-eslint rule at its defaults (so `consistent-type-imports` and `no-import-type-side-effects` in core, `consistent-type-exports` only in the opt-in type-aware preset) and sets `import-x/consistent-type-specifier-style` to `"prefer-top-level"`; Biome core has `useImportType` and `useExportType` on. On 14 Nov 2026 the type-import rule was turned off in the `nestjs` and `angular` presets for all three linters (`e8c2207d`, 8.3.0), because its fix turned an injected class's import into `import type` (section 9). The question: what a type-only import changes at runtime and in builds, whether the rules' fixes are safe, what the two specifier styles cost, and what happens when agents are held to these rules. ES module evaluation, cycles, barrels and cycle checkers' handling of type-only edges are in `import-cycles.md` (2.3–2.7, 4.10, 4.15, 6.4); TypeScript's design goals in `type-escape-hatches.md` 1.1; agents and lint in `type-escape-hatches.md` §6, `import-cycles.md` §5, `nested-ternaries.md` §10, `length-limits.md` §5 and `func-style.md` §8. This file cross-references them rather than repeating them.

**How to read the tags**

- **VERIFIED**: the primary source (the spec, the PDF, the publisher or arXiv record, the official docs, the tool's source code or published package, the release notes, or the GitHub issue, PR or commit) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex, Semantic Scholar or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single user report, project doc, blog post, maintainer's account or vendor document, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research or claims by a company that sells or owns a product in this space: Microsoft/GitHub, Google, Meta, Vercel, Anthropic, OpenAI, Anysphere (Cursor), JetBrains, Sonar, VoidZero/Oxc, Deno Land, Oven (Bun), Astral, Cloudflare, Ping.
- **My check (local run)** marks results of running the tools here, with versions and the folder.

Every quote is copied exactly and is under 15 words. Where a longer sentence matters, it is given as consecutive quoted segments. Double quotes inside a quote are shown as single quotes. Every person is named or referred to as they/them.

**How sources were fetched.** Pages and PDFs were found with WebSearch and WebFetch and read from copies saved with unauthenticated `curl` (`scratchpad/type-imports-lit/scripts/fetch.sh`: `--max-filesize 10000000`, a generic User-Agent, pandoc or `pdftotext` for the text copy) or read-only `gh api`; every quote was copied from the saved raw text, not from a summary. Code and docs were read at pinned tags or commits: TypeScript `v1.4` to `v6.0.3` and the Go port at `v7.0.2` (`1e4744d6`) and `v7.1-beta` (`3e923636`), TypeScript-Website `24166845` and `70bf4925`; Babel `v8.1.2` and babel/website `2e79891c`; esbuild changelogs at `v0.28.2`; swc `v1.16.22`; Amaro `v1.3.0`; Node.js `doc/api/typescript.md` at `v24.14.1` and `v26.13.1`; Vite `v8.3.8`; Oxc `crates_v0.159.0` and `oxlint_v1.90.0` (`9b6fff42`); Rolldown `v1.3.2`; Deno `v2.9.8`; Bun `bun-v1.4.4`; Sucrase `280ee202`; tc39/proposal-type-annotations `269e08b4`; Rollup `v4.68.5`; webpack.js.org `bb00de79`; NestJS `v12.5.1`, docs.nestjs.com `7b56f809`, @nestjs/schematics `12.0.13`; Angular `v22.2.6` and Angular CLI `v22.2.7`; TypeORM `1.1.3`; class-transformer `v0.5.1`, class-validator `v0.15.1`, tsyringe `v4.8.0`, type-graphql `v2.0.0-rc.4`; typescript-eslint `v8.72.1`; eslint-plugin-import `v2.32.0`; eslint-plugin-import-x `v4.17.1`; ESLint `v10.14.0` (and `v8.57.0`, `v9.0.0`, `v9.20.0` for one function); oxlint-tsgolint `v7.0.2005`; Biome `@biomejs/biome@2.6.4` (`56538746`) and six older tags; pingdotgg/ts-rust `91f3d021`; vercel-labs/scriptc `0febca3e`; and the other tags and commits named in each entry. The current ECMAScript spec is the 2027 draft as served on 17 Nov 2026. Metadata came from Crossref and OpenAlex (no `mailto`), Semantic Scholar (no key), the arXiv API and the Wayback Machine. Five research agents worked in parallel: sections 1 and 2 (`A/`), sections 3, 5 and 7.1–7.18 (`B/`), section 4 and 7.20–7.33 (`C/`), 6.1–6.29 and 7.40–7.59 (`D/`), 6.30 onwards and section 8 (`E/`); 3.16–3.17, section 9 and the presets notes are mine (`main/`). Every quote in this file was then checked by script against the saved source texts only, never against drafts (`scratchpad/type-imports-lit/scripts/check_quotes.py`, output in `scratchpad/type-imports-lit/main/quote-check.txt`).

- **Blocked:** Stack Overflow returned 403 to `curl` (one question was read through the Stack Exchange API instead, 7.15). Other blocks are noted in the entries they affect.
- **Not run (not installed):** Babel, swc, Deno, NestJS, Angular's compiler, class-transformer, eslint-plugin-import (its source was read), TypeScript 3.8 to 5.9 and 7.x (their source and test baselines were read), ts-rust and scriptc (read only, as asked). `bun build --compile` wasn't run or traced.
- **`gh` was used read-only** on public repositories: commits, files, trees, issues, PRs, releases and issue search. To give names where a saved file didn't, public GitHub profiles were looked up with `gh api users/<login>`; nothing about Hayden or anyone else's private data was sent. Everyone else is cited by handle.
- **Nothing was installed.** The worktree's own TypeScript 6.0.3, Oxlint 1.90.0, oxlint-tsgolint 7.0.2005, ESLint 10.14.0 (typescript-eslint 8.72.1, import-x 4.17.1), Biome 2.6.4, esbuild 0.28.1, Rolldown 1.2.13, reflect-metadata 0.2.2 and class-validator 0.15.1 (from the worktree's `node_modules/.bun` store), and the machine's Node v24.14.1 and Bun 1.4.4, were run on small hand-written files in the scratchpad. No email address, name or account detail was put in any URL, query, header or form, and Unpaywall wasn't used. Email addresses in saved commits were removed. Nothing was left running.
- **Embedded instructions:** vendor agent-instruction files (AGENTS.md guides, Cursor rules, Claude Code memory docs, Copilot instructions) are written for models; Oxc issue #29491 says it was written by an AI agent for its reporter; TypeScript PR #64578 and Oxc PRs carry notes and bot comments from coding agents; Biome issues carry an automated "AgentScan" comment; Ultracite PRs carry CodeRabbit and Socket bot comments. All were read as data and not followed. No source tried to direct the work.

**About the items tagged My check.** These were run on 17–18 Nov 2026 with the binaries listed above; each entry names its folder. They are illustrations on small files, not rates. The corpus measurements for this topic are being built separately in `research/corpus/results/type-imports/`; nothing here depends on them. Move these checks into the harness before putting a number in the post.

Hayden gave the reason for the `prefer-top-level` setting on 17 Nov 2026, relayed while this file was compiled; it is recorded as Hayden's account in 9.12 and in the notes, with the sources that bear on each part of it. Hayden also sent the links for the two compilers the account names, ts-rust and scriptc (3.16, 3.17).

---

## Most useful for the post

1. **Whether a module runs depends on the import statement, not on what it names.** ECMA-262 loads and evaluates every requested module whatever the specifiers, so `import {} from "y"` is a load exactly like `import "y"`. Dropping imports used only as types is TypeScript's own behaviour, in its spec since at least 1.4 (October 2014). (1.1, 1.2)
2. **Elision broke things in both directions from the start.** In 2016 an AngularJS app lost a registration side effect: "And then AngularJS is all 'myServiceProvider not found' and crashy." Single-file transpilers can't tell a re-exported type from a value, and per-file tools drop values that only a Svelte or Vue template uses. (1.5, 1.6, 2.4, 3.13)
3. **The fix was proposed in 2015 and declined.** #2812 already had `import type` and `import { type X }`; it was closed because "the import syntax is already complex enough,". `import type` shipped in 3.8 (2020), the inline form in 4.5 (2021). (1.6, 2.1, 2.5)
4. **The inline form keeps the declaration by design.** The 4.5 PR: the keyword "plays no direct role in whether the parent import/export declaration is elided." Andrew Branch: "'import type' operates at the ImportDeclaration level". (2.5)
5. **`verbatimModuleSyntax` (5.0) made that visible, and new projects get it.** It exists because users adopted type-only imports "everywhere possible"; `import { type xyz } from "xyz"` is "Rewritten to 'import {} from 'xyz';'". `tsc --init` has turned it on since 5.9; 6.0 and 7.0 keep the rules; 7.1-beta only drops `{}` next to a default import. The team's own verdict on the old error mode: "Error mode was possibly a mistake" and "Maybe this should have been a lint rule." (2.6, 2.7, 2.9, 2.13, 2.14)
6. **The emit matrix in one line:** `import type` has been removed in every mode since 3.8; `import { type x }` is removed only when nothing asks the compiler to keep declarations. The old flags are hard errors since 5.6, not 6.0 as announced. (section 2 matrix, 2.8, 2.10)
7. **Across tools, `import type` is the only form everything erases.** With its keep-imports switch, each of tsc, esbuild, swc, Babel, Oxc/Vite 8 and Deno keeps a module request for `import { type x }`; Node always does; Bun never does, even when the tsconfig asks. The same three-line file gives three different results in Node and Bun. (3.1–3.11, 3.15, 3.7)
8. **Node made the keyword a runtime requirement.** Its docs: "the `type` keyword is necessary to" "correctly strip type imports." Without it: "does not provide an export named". Type stripping has been on by default since v23.6.0 and v22.18.0 and stable since v25.2.0 and v24.12.0. (3.5, 3.6, 7.9–7.11)
9. **Native JavaScript types would keep the split.** The TC39 type annotations proposal (Stage 1 since 2022) treats `import type` as a comment, while inline-only imports "are retained even if all bindings are declared type-only." (3.14)
10. **No measured bundle or build win from `import type` itself.** With elision on, both forms give the same output, and TypeScript's Performance wiki doesn't mention type-only imports. The cost shows up in the inline form under `verbatimModuleSyntax`: a kept `import {}` pulled a lazy module into the entry chunk. (5.1–5.4)
11. **For decorator metadata, the fix is type-correct and breaks at runtime.** `tsc` records `Function` for a class imported as a type (since 4.0; 3.8 and 3.9 crashed instead), single-file transpilers record `Object`, TypeScript chose a silent fallback over an error, TS1272 covers only interfaces and type aliases, and `verbatimModuleSyntax` doesn't catch it. (4.3–4.7, 9.7)
12. **The frameworks don't agree on what the mistake costs.** Nest resolves by emitted type, but its own hint for this misses `Function`, and `ValidationPipe` can silently skip validation; Angular doesn't use the metadata at all and fails the build with NG2003; TypeORM recommends `import type` for related entities. (4.9–4.14)
13. **Every linter got the DI reports, and each answered differently.** typescript-eslint forced value imports (4.14.0), added a parser option (5.15.0), then skipped decorated files (7.4.0); Oxlint has no handling and closed a request with advice to turn the rule off; Biome keeps a safe fix, documents turning the rule off, and has an option PR open. (6.4, 6.16, 6.22, 7.20–7.29)
14. **The style rules began as taste; the side-effect argument came with TypeScript 5.0.** `consistent-type-specifier-style` was proposed for consistency, and `no-import-type-side-effects` came out of a January 2023 thread about 5.0. eslint-plugin-import's documented default (`prefer-inline`) isn't what a bare `"error"` enforces (top-level). (6.9, 6.11, 6.12)
15. **Upstream never put these rules in a recommended config, and the popular configs split on style.** None of the three typescript-eslint rules has been in `recommended`, `strict` or `stylistic` (6.6). Inline specifiers: eslint-config-love, XO, Vercel's style guide, create-t3-app, Vue core; separate `import type` statements: antfu, Vitest, typescript-eslint itself; gts and ts-standard set nothing. XO's maintainers went from "you should rarely need them" to "I use type imports a lot now too". (6.34–6.37, 6.49, 8.11, 8.16)
16. **The fixes compose badly.** `prefer-inline` plus `no-import-type-side-effects` never converge; with `no-duplicates`' `prefer-inline` one ESLint pass writes `import type { A, b }`, a TS1361 error; Oxlint's new `no-duplicates` fix broke Next.js's CI; Oxlint 1.94.0 demoted `no-import-type-side-effects` to a suggestion because its fix removed a module's evaluation. (6.17, 6.28, 7.50–7.52)
17. **A linter that sees a component's script but not its template gets it wrong.** Vue, Svelte and Astro imports used only in markup were fixed into type imports; Oxlint now skips those files, and Ultracite turned `useImportType` off for them for four months on Biome's advice. (7.54, 7.57, 9.4)
18. **The inline form has real breakages of its own.** A dev-only package that failed to resolve in Node, a runtime cycle that crashed Vitest and slipped past madge, and Next.js #91906's Turbopack cycle. (7.10, 7.16, 7.18)
19. **The two newest compilers fit the pattern.** ts-rust, a model-written Rust port of TypeScript 7, keeps `import {}` only under `verbatimModuleSyntax`; scriptc, Vercel's TypeScript-to-native compiler, follows Node: "A clause whose specifiers are all marked `type`," "still loads its module, as it does under Node.js." (3.16, 3.17)
20. **Ultracite: on since the first config, one style switch, one framework exception.** `consistent-type-imports` has been `"error"` since March 2022; Oxlint's `prefer-inline` (Dec 2025) fought `no-import-type-side-effects` until 1 Feb 2026; the rule went off in `nestjs` and `angular` on 14 Nov 2026 because the fix broke injection, which the record overstates for Angular. (9.1, 9.3, 9.5)
21. **Hayden's reason holds where `verbatimModuleSyntax` or Node-style stripping applies, and is moot under default elision.** "at the time, `import { type x }` when TS compiles" "turns into `import { }`" "leaving a potential side effect import"; "`import type` was removed entirely during compilation." Both are still true in TypeScript 6 and 7, in Node and in scriptc. (9.12)
22. **Ultracite's three presets run the same rules and end on different code.** All three cores rewrite an injected class to `import type` (ESLint only without type information); Biome writes inline specifiers for mixed imports that the other two report; the type-export rule runs only with type information on Oxlint and ESLint. (9.6–9.8)
23. **Templates moved to the compiler flag; the stated reason is mostly markup and per-file tools.** create-vite (since April 2025), SvelteKit (as options "Without these, compilation will fail"), Astro, @vue/tsconfig, create-t3-app and `tsc --init` set `verbatimModuleSyntax`; Next.js, Angular and NestJS set only `isolatedModules`; `@tsconfig/strictest` dropped it after a month because it breaks CommonJS (5 of 31 bases set it). (6.38–6.47, 6.49)
24. **Almost nothing is measured.** No study counts type-only imports or elision effects; the one adoption study (454 repos) found 4.5's inline `type` modifier the most adopted of 13 new features but never measured `import type`, and the one large tsconfig study left module options out. No study looks at imports in model-written TypeScript either. (8.1, 8.2, 8.6, 8.20)
25. **Agents meet this as compiler errors, with no guidance.** No agent vendor's docs mention type imports or the flag; the one instruction file found that touches the tsconfig turns `verbatimModuleSyntax` off. In Comfy-Org's frontend, a Claude Code PR that turned the flag on exposed a hidden runtime cycle; the agent's workaround was closed as "bad impl", and a human turned on the two lint rules, whose violations "were all auto-fixable." (8.21–8.23, 8.25)

---

## 1. ES modules and TypeScript's import elision

1.1 is the ECMAScript rule. 1.2–1.4 are how TypeScript elides and what its docs and design goals say. 1.5–1.6 are the two problems elision caused. 1.7–1.8 are `isolatedModules`, its origin and its errors. 1.9 is `noUncheckedSideEffectImports`. 1.10 is my run.

### 1.1 ECMAScript loads and evaluates every imported module, whatever its specifiers; `import {} from "x"` is as much a load as `import "x"`. VERIFIED (ECMA-262 draft)

- **Citation:** Ecma International, _ECMAScript® 2027 Language Specification_ (draft, as served 17 Nov 2026), §16.2.1.4 Static Semantics: ModuleRequests; §16.2.1.6.1.3.1 InnerModuleEvaluation; §16.2.2 Imports (grammar). https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html
- **What it says:**
  - Grammar: `ImportDeclaration : import ImportClause FromClause WithClause_opt ;` and `import ModuleSpecifier WithClause_opt ;`, with `NamedImports : { }` as one of the forms. So `import "x"` and `import {} from "x"` are both legal.
  - ModuleRequests returns, for every `ImportDeclaration` form, "a List whose sole element is the ModuleRequest Record" for its specifier. Nothing in it looks at which bindings are imported or whether they're used.
  - A module's `[[RequestedModules]]` is "A List of the ModuleRequest Records associated with the imports in this module." "The List is in source text occurrence order of the imports."
  - InnerModuleEvaluation step 11: "For each ModuleRequest Record request of module.[[RequestedModules]], do" "Let requiredModule be GetImportedModule(module, request)." and then evaluates it. So every import declaration that reaches the runtime evaluates its module, in source order, before the importing module's body.
  - The spec's own example note: the host calls Evaluate "when the host is ready to incur any possible side effects of the modules".
- **Caveat:** the draft is a living document; section numbers move. The deferred-import proposal (`import defer`) isn't in this draft's `ImportDeclaration` grammar. Evaluation order, cycles and live bindings: see `import-cycles.md` 2.3.
- **For the post:** the ground truth every later entry rests on: whether a module runs depends only on whether an import declaration for it survives to the JavaScript, never on what the declaration names. `import {} from "y"` is a side-effect import in all but spelling.
- **Text:** `scratchpad/type-imports-lit/A/text/ecma262-draft-scripts-and-modules.txt`, `scratchpad/type-imports-lit/A/src/ecma262-draft-scripts-and-modules.html`

### 1.2 Elision predates ES modules: the 1.4 spec (October 2014) already dropped imports used only as types, and 1.5 brought ES syntax with a "bare import" for side effects. VERIFIED (language spec at `v1.4` and `v1.8.10`; 1.5 release notes); Vendor (Microsoft)

- **Citation:** Microsoft, _TypeScript Language Specification_, Version 1.4 (October 2014), "External Import Declarations" emit rule, `doc/spec.md` at tag `v1.4`, https://github.com/microsoft/TypeScript/blob/v1.4/doc/spec.md ; same rule in §11.3.6 CommonJS Modules at `v1.8.10`, https://github.com/microsoft/TypeScript/blob/v1.8.10/doc/spec.md ; TypeScript-Website, "TypeScript 1.5" release notes ("Bare Import"), https://github.com/microsoft/TypeScript-Website/blob/24166845f5de5562abd8618817377130ba46d3f0/packages/documentation/copy/en/release-notes/TypeScript%201.5.md
- **What it says:**
  - 1.4 spec: a `require` call "is emitted for a particular imported module only if the imported module," or a local alias, "is referenced as a _PrimaryExpression_ somewhere in the body of the importing module". "If an imported module is referenced only as a _ModuleName_ or _TypeQueryExpression_," "nothing is emitted."
  - The 1.8 spec keeps the same sentence for ES-era CommonJS output, with _NamespaceName_ in place of _ModuleName_.
  - 1.5 release notes (ES6 modules, July 2015): "A 'bare import' can be used to import a module only for its side-effects." with the example `import "./polyfills";`.
- **Caveat:** the spec was retired from the repo later; these are the last markdown copies at those tags. The 1.0 spec (Word/PDF) wasn't opened.
- **For the post:** saying TypeScript has always elided is accurate back to at least 1.4, for the older `import x = require()` syntax. When ES `import` arrived in 1.5, TypeScript applied the same usage rule to it, so `import { T } from "./t"` could vanish while `import "./t"` couldn't.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-spec-v1.4.md`, `scratchpad/type-imports-lit/A/src/ts-spec-v1.8.10.md`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-1.5.md`

### 1.3 The current docs describe elision as usage-and-declaration driven, and say not every compiler can make the same decision. VERIFIED (modules reference, tsconfig reference, handbook at the pinned website commit); Vendor (Microsoft)

- **Citation:** TypeScript-Website, _Modules – Reference_, "Type-only imports and exports" and "`import()` types", `packages/documentation/copy/en/modules-reference/Reference.md`; _TSConfig Reference_, `verbatimModuleSyntax`, `packages/tsconfig-reference/copy/en/options/verbatimModuleSyntax.md`; _Handbook_, Modules, `packages/documentation/copy/en/handbook-v2/Modules.md`; all at `24166845`. Live: https://www.typescriptlang.org/docs/handbook/modules/reference.html , https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax
- **What it says:**
  - Modules reference: "by default, TypeScript automatically elides (does not emit) imports" "that are only used in type positions and exports that only refer to types." `import type`, `export type { ... }` and `type`-prefixed specifiers "are all guaranteed to be elided from the output JavaScript."
  - tsconfig reference: "TypeScript detects that you're only using an import for types" "and drops the import entirely." It notes there is no `import "./car";` left behind: "That actually makes a difference for modules that have side-effects or not."
  - The same page: "import elision isn't always just driven by how an import is used" "it often consults how a value is declared as well." "While TypeScript might be able to make these emit decisions" "based on information from across files, not every compiler can."
  - Handbook: inline `type` specifiers and `import type` together "allow a non-TypeScript transpiler like Babel, swc or esbuild" "to know what imports can be safely removed."
- **Caveat:** docs pages are maintained prose and change; quote them from the pinned commit.
- **For the post:** the clearest official statement of both halves of the problem: elision can drop side effects, and it depends on cross-file information a single-file tool doesn't have.
- **Text:** `scratchpad/type-imports-lit/A/src/modules-reference-Reference.md`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-verbatimModuleSyntax.md`, `scratchpad/type-imports-lit/A/src/handbook-v2-Modules.md`

### 1.4 The design goals pull both ways: types are "fully erasable", but TypeScript isn't supposed to "emit different code based on the results of the type system". VERIFIED (wiki page); Vendor (Microsoft)

- **Citation:** Microsoft TypeScript team, _TypeScript Design Goals_, microsoft/TypeScript wiki (undated), https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals (raw: `raw.githubusercontent.com/wiki/microsoft/TypeScript/TypeScript-Design-Goals.md`). See `type-escape-hatches.md` 1.1 for the soundness non-goal.
- **What it says:**
  - Goals: "Impose no runtime overhead on emitted programs." "Preserve runtime behavior of all JavaScript code." "Use a consistent, fully erasable, structural type system."
  - Non-goal 5: "Add or rely on run-time type information in programs, or emit different code" "based on the results of the type system."
- **Caveat:** the page doesn't mention imports. Reading elision against non-goal 5 is my interpretation, not something the TypeScript team has written: deciding whether `import { Car }` survives by resolving whether `Car` is a type is, literally, emit based on type information. The team's own word for the result is "type-directed emit" (design notes, 2.2).
- **For the post:** a fair framing: elision served the first goals (no runtime cost for type-only imports) by bending the non-goal, and `verbatimModuleSyntax` is the move back toward emit that doesn't depend on types. Present it as an observation.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-wiki-TypeScript-Design-Goals.md`, `scratchpad/type-imports-lit/A/src/ts-dmn-36138.json`

### 1.5 First cost of elision: lost side effects. The 2016 report was AngularJS dependency injection, and the advised workaround was a second, bare import. VERIFIED (issue and comments); ANECDOTAL (single report plus maintainers' comments); Vendor (Microsoft)

- **Citation:** microsoft/TypeScript #9191, "Should be possible to force import of 'unused' modules in case there are side-effects", opened 15 Jun 2016 against TypeScript 1.8.10, closed 3 Jan 2020 by PR #35200. https://github.com/microsoft/TypeScript/issues/9191 ; design meeting notes #35806 (9 Dec 2019), https://github.com/microsoft/TypeScript/issues/35806
- **What it says:**
  - The report: a service module registers itself with `ngModule.service(...)` at load ("REALLY IMPORTANT SIDE-EFFECT"); a component imports the class only for a constructor parameter type, so the `require` is dropped, "And then AngularJS is all 'myServiceProvider not found' and crashy."
  - Ryan Cavanaugh (Microsoft) replied the same day with the workaround `import './MyService';`, and later: "Are people seriously writing modules with non-idempotent load-time side effects?" "That seems insane".
  - 83 comments; Andrew Branch pointed the thread to PR #35200 in November 2019.
  - The 9 Dec 2019 design notes list as customer feedback "angry Angular users who import a class, only use it in a type position," "but need the import for DI registration".
- **Caveat:** one issue with a long tail of agreement; how many projects hit this isn't measured anywhere I found. The workaround works because a bare `import "x"` is never elided (2.10).
- **For the post:** the canonical story of elision breaking an app, and the reason the 3.8 work began. The maintainer's first reaction is worth quoting as a sign of how niche the team thought it was.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-issue-9191.json`, `scratchpad/type-imports-lit/A/src/ts-issue-9191-comments.json`, `scratchpad/type-imports-lit/A/src/ts-dmn-35806.json`

### 1.6 Second cost: single-file transpilers can't tell a re-exported type from a value. TypeScript's 2015 fix proposal already had `import type` and `import { type X }`, and was declined. VERIFIED (issues #2499 and #2812 with comments); Vendor (Microsoft)

- **Citation:** microsoft/TypeScript #2499, "Support single-module transpilation mode", Mohamed Hegazy, 26 Mar 2015, https://github.com/microsoft/TypeScript/issues/2499 ; #2812, "Implicit module import/export elision", Mohamed Hegazy, 17 Apr 2015, labels Suggestion, Breaking Change, Declined, https://github.com/microsoft/TypeScript/issues/2812
- **What it says:**
  - #2499: "The compiler does not do emit based on semantic information in most cases." It proposed a flag that turns the two cases that break single-file transpilation into errors: const enums from ambient modules, and re-exports of type-only constructs when targeting ES6.
  - #2812 opens with today's elision rule and two problems: "It has been consistently a source of confusion for TypeScript users" and it impedes single-file transpilation "as there is no way to know if a re-export" "should be elided or not without looking at the whole program".
  - The proposal: stop eliding (emit `import {} from "foo"` or `require("foo")` for type-only use), require `import type { IFoo }` / `export type { IBar }`, and optionally `import {type IFoo, type IBar} from "mod"`. It was marked a breaking change.
  - Outcome: Ryan Cavanaugh summarised that it "will be an error to re-export a type-only identifier from an import" under isolatedModules; Mohamed Hegazy closed it: "The rational is that the import syntax is already complex enough," "and no need to add more complexity." (sic, "rational").
- **Caveat:** the promised re-export error didn't ship until 2.4 (1.8).
- **For the post:** a striking piece of history: the exact syntax that shipped in 3.8 (2020) and 4.5 (2021), including inline `type` on specifiers, was proposed and declined in 2015. PR #35200 cites #2812 as its predecessor (2.1).
- **Text:** `scratchpad/type-imports-lit/A/src/ts-issue-2499.json`, `scratchpad/type-imports-lit/A/src/ts-issue-2812.json`, `scratchpad/type-imports-lit/A/src/ts-issue-2812-comments.json`

### 1.7 `isolatedModules` began in March 2015 as `separateCompilation`, alongside the `transpile` API, and was renamed before 1.5 shipped; it changes checking, not emit. VERIFIED (PRs #2550 and #3208; `services.ts` at `v1.5.3`; tsconfig reference); My check (local run); Vendor (Microsoft)

- **Citation:** microsoft/TypeScript PR #2550, "Relax import/export elision rules for separate compilation", Vladimir Matveev, merged 31 Mar 2015, https://github.com/microsoft/TypeScript/pull/2550 ; PR #3208, "Update singleCompilation flag name to isolatedModules", Mohamed Hegazy, merged 19 May 2015, https://github.com/microsoft/TypeScript/pull/3208 ; `src/services/services.ts` at `v1.5.3` (`transpile`), https://github.com/microsoft/TypeScript/blob/v1.5.3/src/services/services.ts ; TSConfig Reference, `isolatedModules`, at `24166845`.
- **What it says:**
  - PR #2550: "This PR adds a new compiler option: separateCompilation that should be used" "when we compile one file at a time." For a name it can't resolve, "we conservatively assume that this name can possibly refer to a value" and keep the import. The same PR added a `transpile` function for single-file emit (it names es6-module-loader).
  - PR #2550 added the first errors, TS1208 and TS1209 (non-module files and ambient const enums) and TS5043–5047 (no `sourceMap`, `declaration`, `noEmitOnError` or `out` with the flag). PR #3208 renamed them all to `isolatedModules`.
  - At `v1.5.3`, `transpile` sets `options.isolatedModules = true`; its comment lists the "Extra compiler options that will unconditionally be used bu this function are:" (sic).
  - Today's reference: "other transpilers only operate on a single file at a time," "which means they can't apply code transforms" "that depend on understanding the full type system." It names `ts.transpileModule` too, and says the flag "does not change the behavior of your code," "or otherwise change the behavior of TypeScript's checking and emitting process."
  - Since 5.0, `verbatimModuleSyntax` turns it on: `isolatedModules` is computed as `!!(compilerOptions.isolatedModules || compilerOptions.verbatimModuleSyntax)` (`src/compiler/utilities.ts` at `v6.0.3`).
  - My check (`scratchpad/type-imports-lit/A/check/emit-forms/`): the same eleven files emitted byte-identical JavaScript with and without `isolatedModules` under 6.0.3.
- **Caveat:** the 1.5 release notes on the website and the 1.5 announcement post don't mention the flag; its presence in 1.5 comes from the tag. The source sentence "does not change the behavior" is about emit; the flag adds errors (1.8).
- **For the post:** `isolatedModules` is a promise about portability, enforced by errors, not a different compiler. It's why type-only syntax had to exist at all: it was the only way to tell a single-file tool which re-exports are types.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-pr-2550.json`, `scratchpad/type-imports-lit/A/src/ts-pr-2550-files.json`, `scratchpad/type-imports-lit/A/src/ts-pr-3208.json`, `scratchpad/type-imports-lit/A/src/ts-pr-3208-files.json`, `scratchpad/type-imports-lit/A/src/ts-services-v1.5.3.ts`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-isolatedModules.md`, `scratchpad/type-imports-lit/A/src/ts-utilities-v6.0.3.ts`, `scratchpad/type-imports-lit/A/check/emit-forms/emit-default.txt`, `scratchpad/type-imports-lit/A/check/emit-forms/emit-isolated.txt`

### 1.8 The `isolatedModules` errors and their exact text, then and now. VERIFIED (`diagnosticMessages.json` at 15 tags; PR #15538; installed 6.0.3); My check (local run); Vendor (Microsoft)

- **Citation:** microsoft/TypeScript `src/compiler/diagnosticMessages.json` at `v1.5.3`, `v1.6.2`, `v2.3.4`, `v2.4.2`, `v2.9.2`, `v3.4.5`, `v3.5.3`, `v3.7.5`, `v3.8.3`, `v4.4.4`, `v4.5.5`, `v5.0.4`, `v5.5.4`, `v5.9.3`, `v6.0.3`, e.g. https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/diagnosticMessages.json ; PR #15538, "Don't allow to re-export a type when '--isolatedModules' is set", merged 11 May 2017 (fixes #15231), https://github.com/microsoft/TypeScript/pull/15538
- **What it says (current text is 6.0.3, which the installed compiler matches):**
  - **TS1205, re-exporting a type.** Absent at `v2.3.4` (code 1205 was then a decorators error); added by PR #15538 and present at `v2.4.2`: "Cannot re-export a type when the '--isolatedModules' flag is provided." 3.8 (PR #35200) changed it to "Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'." 5.0 (PR #52203) generalised it to "Re-exporting a type when '{0}' is enabled requires using 'export type'." so it also fires under `verbatimModuleSyntax`. Issue #15231's report: `export { A, B } from "./a"` silently became `export { A } from "./a";`.
  - **TS1208, files that aren't modules.** "Cannot compile namespaces when the '--isolatedModules' flag is provided." (1.5 to 3.4); "All files must be modules when the '--isolatedModules' flag is provided." (3.5 to 4.0); by 4.4, "'{0}' cannot be compiled under '--isolatedModules' because it is considered a global script file." PR #52203 deleted it in 5.0 and added TS1280, which only covers namespaces: "Namespaces are not allowed in global script files when '{0}' is enabled."
  - **Const enums.** TS1209 at 1.5: "Ambient const enums are not allowed when the '--isolatedModules' flag is provided." Now TS2748: "Cannot access ambient const enums when '{0}' is enabled." TS5091: "Option 'preserveConstEnums' cannot be disabled when '{0}' is enabled."
  - **Re-exports through type-only chains.** TS1448 (by 4.5): "'{0}' resolves to a type-only declaration and must be re-exported" "using a type-only re-export when '{1}' is enabled." TS1269 (added after 4.5.5 with '--isolatedModules' in the text, generalised by PR #52203): "Cannot use 'export import' on a type or type-only namespace when '{0}' is enabled."
  - **Later additions** (absent at 5.0.4, present at 5.5.4): TS2865 "Import '{0}' conflicts with local value, so must be declared with a type-only import" "when 'isolatedModules' is enabled."; TS18055 "'{0}' has a string type, but must have syntactically recognizable string syntax" "when 'isolatedModules' is enabled."; TS18056 "Enum member following a non-literal numeric member must have an initializer" "when 'isolatedModules' is enabled."
  - My check (`scratchpad/type-imports-lit/A/check/errors/`): under `isolatedModules`, both `export { T, v } from "./mod.js"` and `import { T } ...; export { T };` give "error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'." Without the flag, the same files compile and emit `export { v } from "./mod.js";` and `export {};`.
- **Caveat:** the tags bracket each change; I didn't find the exact commit for the 3.5 and 4.4 rewordings. The isolatedModules page on the website still shows `@errors: 1277` for the namespace example, a code that doesn't match TS1280.
- **For the post:** the error list is the operational definition of what a single-file transpiler can't know. The re-export case is the one that type-only syntax was built to fix.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v1.5.3.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v1.6.2.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v2.3.4.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v2.4.2.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v2.9.2.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v3.4.5.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v3.5.3.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v3.7.5.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v3.8.3.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v4.4.4.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v4.5.5.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v5.0.4.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v5.5.4.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v6.0.3.json`, `scratchpad/type-imports-lit/A/src/ts-pr-15538.json`, `scratchpad/type-imports-lit/A/src/ts-issue-15231.json`, `scratchpad/type-imports-lit/A/src/ts-pr-52203-files.json`, `scratchpad/type-imports-lit/A/src/ts-pr-35200.json`, `scratchpad/type-imports-lit/A/check/errors/errors-isolated.txt`, `scratchpad/type-imports-lit/A/check/errors/errors-default.txt`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-isolatedModules.md`

### 1.9 `noUncheckedSideEffectImports` (5.6) checks that `import "x"` resolves; it became the default in 6.0. It doesn't touch elision. VERIFIED (5.6 and 6.0 release notes; tsconfig reference; PR #58941; TS7 option declarations); My check (local run); Vendor (Microsoft)

- **Citation:** TypeScript-Website, "TypeScript 5.6" release notes, "The `--noUncheckedSideEffectImports` Option"; "TypeScript 6.0" release notes, "Simple Default Changes"; TSConfig Reference `noUncheckedSideEffectImports`; all at `24166845`. PR #58941, Jake Bailey, merged 20 Jul 2024, https://github.com/microsoft/TypeScript/pull/58941
- **What it says:**
  - "These imports are often called _side effect imports_" because their only use is a side effect. Before the flag, "if no source file could be found, TypeScript would silently ignore the 'import'!" The notes call this a quirk that "masks potential typos on side effect imports."
  - 6.0: "'noUncheckedSideEffectImports' is now 'true' by default"; "This helps catch issues with typos in side-effect-only imports." TS7 declares it with `DefaultValueDescription: true` (`declscompiler.go` at `v7.0.2`).
  - The error: TS2882 "Cannot find module or type declarations for side-effect import of '{0}'."
  - My check (`scratchpad/type-imports-lit/A/check/side-effect-check/`): with 6.0.3 defaults, `import "./does-not-exist.js";` and `import "./styles.css";` each gave TS2882; with the flag off, both compiled and were emitted unchanged. A missing module in `import {} from "./also-missing.js"` always gets TS2307, flag or no flag, and the declaration is still removed from the output by default.
- **Caveat:** this flag is about resolution, not emit. Bare `import "x"` was never elided.
- **For the post:** relevant only as the flip side: TypeScript treats bare imports as sacred at emit, and since 6.0 it checks them too. It doesn't make `import {} from "x"` (the inline-type remnant) any more visible.
- **Text:** `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-5.6.md`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-6.0.md`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-noUncheckedSideEffectImports.md`, `scratchpad/type-imports-lit/A/src/ts-pr-58941.json`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-declscompiler.go`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v6.0.3.json`, `scratchpad/type-imports-lit/A/check/side-effect-check/side-effect-check.txt`, `scratchpad/type-imports-lit/A/check/side-effect-check/empty-braces-missing.txt`

### 1.10 My check: default elision drops a type-only import and the module's side effect with it; `verbatimModuleSyntax` keeps it unless the import says `import type`. My check (local run)

- **Citation:** local runs, TypeScript 6.0.3 (the worktree's `node_modules/.bin/tsc`), Node v24.14.1, 17 Nov 2026. Folders `scratchpad/type-imports-lit/A/check/emit-forms/` and `scratchpad/type-imports-lit/A/check/side-effect/`.
- **What it says:**
  - Commands: `tsc -p tsconfig.default.json --pretty false`, `tsc -p tsconfig.isolated.json --pretty false`, `tsc -p tsconfig.verbatim.json --pretty false` (each `module: esnext`, `moduleResolution: bundler`, `target: es2022`, `types: []`, `strict`), then `node out-<cfg>/main-<form>.js`.
  - (a) Default: `import { T } from "./mod.js"` used only as `const x: T` emits just `export const x = 1;`. Same for `import { type T, type I }`, `import type { T }`, and a never-used value import `import { v }`.
  - (b) Side effect: `service.ts` pushes `"Service"` into a shared array at load. With default elision, all three consumers (plain import used as a type, `import { type ServiceOptions }`, `import type`) printed "registered = []". Under `verbatimModuleSyntax`, the plain and inline-type consumers printed "registered = ['Service']" (the output has double quotes) and the `import type` consumer printed "registered = []".
  - Default elision also removes a source-written `import {} from "./mod.js";` (file `f-written-empty-braces.ts`); `verbatimModuleSyntax` keeps it.
  - Under `verbatimModuleSyntax` the plain type import is kept as `import { T } from "./mod.js";` with "error TS1484: 'T' is a type and must be imported using a type-only import" (2.8), because emitting it would be a runtime link error.
- **Caveat:** one compiler version; the older flags (3.8 to 5.4) weren't run (see the matrix sources).
- **For the post:** a ten-line reproduction of both the original bug (#9191) and Hayden's point, with real output.
- **Text:** `scratchpad/type-imports-lit/A/check/emit-forms/emit-default.txt`, `scratchpad/type-imports-lit/A/check/emit-forms/emit-verbatim.txt`, `scratchpad/type-imports-lit/A/check/side-effect/run-default.txt`, `scratchpad/type-imports-lit/A/check/side-effect/run-verbatim.txt`

## 2. From `import type` to `verbatimModuleSyntax`

2.1–2.3 are 3.8 (`import type`, `importsNotUsedAsValues`). 2.4–2.5 are 4.5 (`preserveValueImports`, inline `type`). 2.6–2.9 are 5.0 (`verbatimModuleSyntax`) and the deprecations. 2.10 is the emit logic in source. 2.11 is the odd corners. 2.12–2.14 are later changes through TypeScript 7.

**The emit matrix: what `tsc` writes for each form, by flag and version** (from 2.10, 2.13 and 2.14; rows marked **run** were compiled here with 6.0.3).

ESM output (`--module es2015` or later). **removed** means no import statement is emitted. Sources: the TS transformer `src/compiler/transformers/ts.ts` at `v3.8.3`, `v4.5.5`, `v5.0.4`, `v5.4.5`, `v5.5.4`, `v6.0.3`; the Go port's `typeeraser.go` and `importelision.go` at `v7.0.2` and `v7.1-beta`; test baselines at `v4.5.5`, `v5.4.5` and `v7.1-beta`. Rows marked **run** were compiled here with 6.0.3; the rest are read from source and baselines (TS 3.8 to 5.4 aren't installed; the corpus harness tests installed compilers). Entry 2.10 has the line-by-line reasoning.

| Setting (versions it applies to) | `import type { x } from "y"` | `import { type x } from "y"` | `import { type x, y } from "y"`, `y` used as a value | same, `y` never used | plain `import { x } from "y"`, `x` only used as a type |
| --- | --- | --- | --- | --- | --- |
| Before 3.8 | syntax error | syntax error (until 4.5) | syntax error (until 4.5) | syntax error (until 4.5) | removed |
| Default, no flags (3.8+, inline form 4.5+; 6.0.3 **run**; 7.0.2 source) | removed | removed | `import { y } from "y"` | removed | removed |
| `isolatedModules` alone (1.5+; 6.0.3 **run**) | same as default | same as default | same as default | same as default | same as default |
| `importsNotUsedAsValues: "preserve"` (3.8 to 5.4) | removed | `import "y";` | `import { y } from "y"` | `import "y";` | `import "y";` |
| `importsNotUsedAsValues: "error"` (3.8 to 5.4) | removed | `import "y";` plus TS1371 | `import { y } from "y"` | `import "y";` | `import "y";` plus TS1371 |
| `preserveValueImports` alone (4.5 to 5.4) | removed | removed | `import { y } from "y"` | `import { y } from "y"` (kept because `y` is a value) | removed |
| `preserveValueImports` + `preserve`/`error` (4.5 to 5.4) | removed | `import {} from "y";` (baseline) | `import { y } from "y"` | `import { y } from "y"` | `import "y";` |
| `verbatimModuleSyntax` (5.0 to 6.0.3 **run**; 7.0.2 and 7.1-beta source) | removed | `import {} from "y";` | `import { y } from "y"` | `import { y } from "y"` | kept as written, plus TS1484 |
| Either old flag in 5.5 | error TS5101 unless `ignoreDeprecations: "5.0"`, then silently ignored; the transformer no longer reads the flags, so emit is the default row |  |  |  |  |
| Either old flag in 5.6 to 6.0 (6.0.3 **run**; 5.6 to 5.9 source) | TS5102 "has been removed", not silenceable; emit is the default row |  |  |  |  |
| Either old flag in 7.0 | not a declared option at all |  |  |  |  |

Two corners: under `verbatimModuleSyntax`, `import D, { type T } from "y"` becomes `import D, {} from "y"` from 5.0 through 6.0.3 (**run**) and 7.0.2; 7.1-beta drops the braces when a default binding is present (2.14). And by default, a source-written `import {} from "y"` is also removed (1.10, **run**), although ECMAScript loads `y` for it (1.1).

**Hayden's reason checks out, with one qualification.** Under `verbatimModuleSyntax`, the setting `tsc --init` has written since 5.9 (2.9), `import { type x } from "y"` really does compile to `import {} from "y"`, which ECMAScript loads and evaluates (1.1, and the run in 1.10 shows the side effect firing), while `import type { x }` is removed. That has been true since 5.0 and still is in 6.0.3 and 7.0.2. It was also true from 4.5 to 5.4 with `preserveValueImports` plus `importsNotUsedAsValues: preserve`. The qualification: under default elision (no flags, or `isolatedModules` alone), both forms are removed and the difference is only stylistic.

### 2.1 PR #35200 (TypeScript 3.8, Feb 2020) added `import type` and `export type` for both problems, kept elision as the default, and refused inline `type` and default-plus-named forms. VERIFIED (PR description); Vendor (Microsoft)

- **Citation:** Andrew Branch, "Type-only imports and exports", microsoft/TypeScript PR #35200, opened 19 Nov 2019, merged 3 Jan 2020 (merge `3b396e61`). https://github.com/microsoft/TypeScript/pull/35200 . 3.8 published 23 Feb 2020 (GitHub release `v3.8.2`).
- **What it says:**
  - Background, both problems: elision "sometimes creates confusion and frustration for users who write side-effects into their modules," "as the side effects won't be run if other modules import only types" (#9191); and file-by-file transpilers have "the _opposite_ problem", a type re-export that should be elided but can't be identified (#34750, ts-loader #751).
  - Prior art: Flow's type imports (2015), and #2812 (1.6), declined in favour of `--isolatedModules`. Since then "TypeScript users wanting side effects have been consistently confused and/or frustrated."
  - Two things made it urgent: TypeScript 3.7 (#31231) blocked the workaround of re-declaring an imported type under the same name, and webpack 5 beta might turn the leftover-`export` warning into an error.
  - The proposal first changed the default to stop eliding; the struck-through text shows it was revised to "Leave the default emit as-is" and add `--importsNotUsedAsValues` with `remove` (default), `preserve`, `error`. Under `preserve`, "Regular imports where all imports are unused or used only for types" "will not be elided (only the import clause will be elided)" with the example output `import "./mod";`.
  - Supported: `import type T`, `import type { A, B }`, `import type * as Types`, `export type { T }`, `export type { T } from`. Deliberately not supported: the `type` modifier on specifiers and `import type T, { A }`. "We want to start with productions that can be read unambiguously," and on whether `type` covers the default or the whole clause: "We prefer no one need wonder."
  - Closes #9191 and #34750.
- **Caveat:** the PR description was edited during review (the struck-through proposal); I quote the final text.
- **For the post:** the primary record for why `import type` exists: two opposite complaints about elision, solved with syntax rather than a default change.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-pr-35200.json`, `scratchpad/type-imports-lit/A/src/ts-issue-34750.json`, `scratchpad/type-imports-lit/A/src/ts-release-dates.tsv`

### 2.2 The 3.8 design meetings weighed ending elision outright and chose a flag; a plan to put `preserve` in `tsc --init` didn't ship. VERIFIED (design notes #35806, #35807, #36138; `commandLineParser.ts` at `v3.8.3`); Vendor (Microsoft)

- **Citation:** Daniel Rosenwasser (notes), "Design Meeting Notes, 12/9/2019" #35806, "Design Meeting Notes, 12/20/2019" #35807, "Design Meeting Notes, 1/10/2020" #36138, microsoft/TypeScript issues. https://github.com/microsoft/TypeScript/issues/35807 ; `src/compiler/commandLineParser.ts` at `v3.8.3`.
- **What it says:**
  - 9 Dec 2019: the breaking-change option was to only elide imports marked `type`, with "Concerns: webpack bundle bloat, breaking people's apps on upgrade because emit changes". A three-release transition (3.8 flag, 3.9 error, 4.0 default) was sketched, with a "Slight preference for big-bang change instead of transition plan?"
  - 20 Dec 2019: effects of changing the default: "Can increase bundle sizes"; "Runtime behavior might break, or you might not notice the change at all". An anecdote from "Wesley" (the notes give only the first name), on moving the compiler's unit tests into modules: "Experience is that elision has undesirable behavior". "This is a very big breaking change" "even if you phase it over several releases." "Strict flags have never affected emit." Conclusion: "The safer proposal 2" because it "Leaves our options open", a tristate flag, and `preserve` as the default in `tsc --init`.
  - 10 Jan 2020 (PR #36092): `import type` was changed so "it imports everything" but errors on value use; "Seems like 'import type' is a misnomer." The PR added about 3% overhead, because the compiler must follow alias chains to see whether something was exported with `export type`.
  - At `v3.8.3`, `defaultInitCompilerOptions` is `module`, `target`, `strict`, `esModuleInterop`, `forceConsistentCasingInFileNames`; `importsNotUsedAsValues` isn't among them.
- **Caveat:** notes are a summary by one attendee, not minutes. I checked only `v3.8.3` for the `--init` default.
- **For the post:** TypeScript considered making type-only imports mandatory in 2019 and backed off on compatibility grounds. It took until 5.0 (opt-in) and 5.9 (`tsc --init`) to get there.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-dmn-35806.json`, `scratchpad/type-imports-lit/A/src/ts-dmn-35807.json`, `scratchpad/type-imports-lit/A/src/ts-dmn-36138.json`, `scratchpad/type-imports-lit/A/src/ts-commandLineParser-v3.8.3.ts`

### 2.3 The 3.8 release notes sold the feature as niche, and `error` mode's TS1371 asked for `import type` wherever an import carried no value. VERIFIED (release notes; `diagnosticMessages.json` at `v3.8.3`, `v4.5.5`; tsconfig reference); Vendor (Microsoft)

- **Citation:** TypeScript-Website, "TypeScript 3.8" release notes, "Type-Only Imports and Export"; TSConfig Reference `importsNotUsedAsValues`; both at `24166845`.
- **What it says:**
  - "This feature is something most users may never have to think about;" it matters if you've hit issues under `isolatedModules`, `transpileModule` or Babel.
  - `import type` "It always gets fully erased, so there's no remnant of it at runtime." (source has `_always_`).
  - The flag values: `remove`, "this is today's behavior of dropping these imports."; `preserve` keeps imports whose values are never used, which "can cause imports/side-effects to be preserved."; `error` preserves them too and errors when a value import is only used as a type. "This might be useful if you want to ensure" "no values are being accidentally imported, but still make side-effect imports explicit."
  - TS1371 at 3.8.3: "This import is never used as a value and must use 'import type'" "because the 'importsNotUsedAsValues' is set to 'error'." By 4.5.5 the "the" before 'importsNotUsedAsValues' is gone. The code is absent at 5.5.4.
  - The tsconfig reference now opens with "Deprecated in favor of" `verbatimModuleSyntax`.
- **Caveat:** none beyond the docs being current prose.
- **For the post:** `error` mode was the first rule requiring `import type`, and it lived in the compiler, not a linter. The team later said it might have been a lint rule (2.6).
- **Text:** `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-3.8.md`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-importsNotUsedAsValues.md`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v3.8.3.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v4.5.5.json`

### 2.4 TypeScript 4.5 (Nov 2021) added `preserveValueImports` for Svelte, Vue `<script setup>` and `eval`, where tsc can't see a value being used. VERIFIED (PR #44619; design notes #45577; 4.5 release notes; tsconfig reference; diagnostics at `v4.5.5`); Vendor (Microsoft)

- **Citation:** Andrew Branch, "Add `--preserveValueImports`", PR #44619, opened 16 Jun 2021, merged 8 Sep 2021, https://github.com/microsoft/TypeScript/pull/44619 ; "Design Meeting Notes, 8/25/2021" #45577; TypeScript-Website "TypeScript 4.5" release notes, "Disabling Import Elision"; TSConfig Reference `preserveValueImports`.
- **What it says:**
  - The PR started as `--noErasingImportedNames`, "which prevents the elision of unreferenced value-having imports in JS". "It does not prevent the elision of imports" "that resolve to types or type-only exports, because that would create runtime errors". With `isolatedModules`, "single-file transpilation can't know what import specifiers are safe to preserve", so types must use `import type`, and it announced inline `type` as the follow-up. ES2015+ output only.
  - Design notes: today's behaviour is that "if you don't use it you lose it." The use cases were Svelte and Vue `<script setup>`; the old name was "hard to parse"; renamed `preserveValueImports`.
  - Release notes: "Good reasons to use 'eval' are few and far between," "but something very similar to this happens in Svelte"; the frameworks generate code from markup, but TypeScript "only sees code within the" script tags.
  - Errors (4.5.5): TS1444 "'{0}' is a type and must be imported using a type-only import" "when 'preserveValueImports' and 'isolatedModules' are both enabled." TS1446 "'{0}' resolves to a type-only declaration and must be imported using a type-only import" with the same ending. Both absent at 5.5.4.
- **Caveat:** the TS1444 text in the PR description still says `noErasingImportedNames`; the shipped text is the one quoted.
- **For the post:** the second hole in elision: tsc drops values it can't see being used. Together with `importsNotUsedAsValues` it nearly amounted to emitting imports as written, which is how the team later described `verbatimModuleSyntax` (2.6).
- **Text:** `scratchpad/type-imports-lit/A/src/ts-pr-44619.json`, `scratchpad/type-imports-lit/A/src/ts-dmn-45577.json`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-4.5.md`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-preserveValueImports.md`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v4.5.5.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v5.5.4.json`

### 2.5 4.5 also added `type` on individual specifiers; by design the modifier removes the name, not the declaration, so `import { type X }` can leave an import behind. VERIFIED (PR #45998; design notes #46050; 4.5 release notes; issue #47118); ANECDOTAL (issue thread, maintainer's account); Vendor (Microsoft)

- **Citation:** Andrew Branch, "Type-only import specifiers", PR #45998, opened 22 Sep 2021, merged 27 Sep 2021, https://github.com/microsoft/TypeScript/pull/45998 ; "Design Meeting Notes, 9/24/2021" #46050; 4.5 release notes, "`type` Modifiers on Import Names"; issue #47118, "[4.5.3][4.6.0-20211212] wrong diagnostic on specifier-specific "type" and importsNotUsedAsValues="error"," Avi Vahl, 12 Dec 2021, closed Working as Intended, https://github.com/microsoft/TypeScript/issues/47118
- **What it says:**
  - PR #45998, emit rules: a `type` specifier "causes it to be elided from JS emit." The keyword "plays no direct role in whether the parent import/export declaration is elided." Under default settings `import { type SomeProps } from "./component"` disappears entirely; under `preserve` or `error` it is kept, because the keyword "does not indicate that there is no runtime module dependency on" the module.
  - Auto-imports, when adding a new declaration, "it prefers the top-level type-only declaration form" `import type { Foo }` over `import { type Foo }`.
  - Release notes: two statements work, "but it would be nice to avoid two import statements for the same module."
  - Design notes: "Previously, if you had written a type-only import, you probably wrote it yourself"; using `type` imports to avoid pulling in a module "is kind of bogus; already got that before these options." "If you need a module's values, you need a module."
  - #47118: under `error`, `import { type VFC } from 'react'` gets TS1371 while `import type { VFC }` doesn't. Andrew Branch: writing it is "asking for" an empty import "to be emitted to the JS"; error mode "sees an import that is going to be emitted to JS needlessly." The mental model: "'import type' operates at the ImportDeclaration level", the inline form at the specifier level, and "'importsNotUsedAsValues' operates at the ImportDeclaration level". Avi Vahl: "I won't lie, this is not the most intuitive behavior." Harun Urhan (a Microsoft organisation member on GitHub) added in 2023 that the typescript-eslint autofix style option doesn't say it changes emit: "I think many people will fall into this trap."
- **Caveat:** one issue thread; the "trap" comment is one person's prediction. Andrew Branch's comment says the emitted form is `import {} from "react"`; the 4.5 transformer prints `import "react";` under `preserve`/`error` alone (2.10). Both load the module.
- **For the post:** the strongest primary source for Hayden's reason: the TypeScript team designed `import { type X }` to keep the declaration and said so in 2021. The difference from `import type` is intended, not a bug.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-pr-45998.json`, `scratchpad/type-imports-lit/A/src/ts-dmn-46050.json`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-4.5.md`, `scratchpad/type-imports-lit/A/src/ts-issue-47118.json`, `scratchpad/type-imports-lit/A/src/ts-issue-47118-comments.json`

### 2.6 The 2022 proposal replaced both flags with one, because users had adopted type-only imports "everywhere possible" and the flags didn't fit that use. VERIFIED (issue #51479; design notes #51810 and #51812); Vendor (Microsoft)

- **Citation:** Andrew Branch, "Proposal: deprecate `importsNotUsedAsValues` and `preserveValueImports` in favor of single flag", microsoft/TypeScript #51479, 10 Nov 2022, https://github.com/microsoft/TypeScript/issues/51479 ; "Design Meeting Notes, 11/16/2022" #51810 and "12/2/2022" #51812.
- **What it says:**
  - Background: with `importsNotUsedAsValues`, "Angular users often experienced runtime errors due to the unintended import elision". `preserveValueImports` covered `eval` and Vue templates.
  - "Early on, I encouraged users not to use type-only imports" "unless they were facing one of those problems." But "we have seen enthusiasm for adopting type-only imports everywhere possible" "as an explicit marker of what imports will survive compilation to JS." The flags interact with each other and with `isolatedModules` in ways hard to explain, "And the flag names do nothing to clear up this confusion."
  - The definition: "Emits imports and exports to JS outputs exactly as written in input files," "minus anything marked as type-only." It is stricter "because it requires that all types be marked as type-only." It also bans ESM syntax in files that emit CommonJS.
  - 16 Nov 2022 notes: the team noted the mode already existed as `preserve` plus `preserveValueImports` plus `isolatedModules`; the notes' sketch has `import { type foo } from "module"` becoming `import "module"`. "Angular.js 1.x was a pretty big motivation." "Error mode was possibly a mistake"; "Maybe this should have been a lint rule."
  - 2 Dec 2022 notes: "Pre-existing ESLint rules should do the right thing under this." Would the team use it? "Totally". Names considered included `--verbatimImports` and `--isolatedModules strict`.
- **Caveat:** the notes' sketch (`import "module"`) differs from what shipped (`import {} from "module"`); both load the module.
- **For the post:** the team's own account of why style-driven type-only imports needed a different flag, and its admission that a compiler error mode might have been better as a lint rule. Useful context for why the lint rules exist alongside the flag.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-issue-51479.json`, `scratchpad/type-imports-lit/A/src/ts-dmn-51810.json`, `scratchpad/type-imports-lit/A/src/ts-dmn-51812.json`

### 2.7 `verbatimModuleSyntax` (PR #52203, TypeScript 5.0, Mar 2023): what each form becomes, and the CommonJS cost. VERIFIED (PR; 5.0 release notes; tsconfig reference; modules theory page); My check (local run); Vendor (Microsoft)

- **Citation:** Andrew Branch, "Add `verbatimModuleSyntax`, deprecate `importsNotUsedAsValues` and `preserveValueImports`", PR #52203, opened 12 Jan 2023, merged 20 Jan 2023 (merge `cfe1842a`), closes #51479, https://github.com/microsoft/TypeScript/pull/52203 ; TypeScript-Website "TypeScript 5.0" release notes, "`--verbatimModuleSyntax`"; TSConfig Reference `verbatimModuleSyntax`; _Modules – Theory_; all at `24166845`.
- **What it says:**
  - Rules (release notes and tsconfig reference, same text): "any imports or exports without a 'type' modifier are left around." "Anything that uses the 'type' modifier is dropped entirely." The worked example: `import type { A } from "a";` "Erased away entirely."; `import { b, type c, type d } from "bcd";` becomes `import { b } from "bcd";`; `import { type xyz } from "xyz";` is "Rewritten to 'import {} from 'xyz';'". "With this new option, what you see is what you get."
  - CommonJS: ES imports and exports aren't rewritten to `require`; you write `import foo = require("foo")` and `export = {...}`. "This new flag ensures that you're intentional about the file type you're using". The PR: these limits "make it really unattractive to use the flag in CJS-emitting TypeScript"; "the flag is opt-in, and we expect the users interested in using it" "to write mostly ESM-emitting TypeScript."
  - Theory page: "This setting is particularly recommended for Node.js projects that use mostly ESM," "but have a select few CJS files." "It is not recommended for projects that currently target CJS," "but may want to target ESM in the future."
  - Errors added by the PR (text at 6.0.3): TS1484 "'{0}' is a type and must be imported using a type-only import" "when 'verbatimModuleSyntax' is enabled."; TS1485, the same for a name that "resolves to a type-only declaration"; TS1286, at 5.0.4 "ESM syntax is not allowed in a CommonJS module when 'verbatimModuleSyntax' is enabled.", by 5.9.3 "ECMAScript imports and exports cannot be written in a CommonJS file under 'verbatimModuleSyntax'." with a longer TS1295 variant for non-`.cts` files; TS1287 for `export` on values in CommonJS; TS1282–1285 for `export =` and `export default` of a type; TS1288 for import aliases; TS5104 "Option '{0}' is redundant and cannot be specified with option '{1}'." (it with the old flags); TS5105 no UMD, AMD or System.
  - My check (`scratchpad/type-imports-lit/A/check/emit-forms/`, `scratchpad/type-imports-lit/A/check/errors/`, `scratchpad/type-imports-lit/A/check/cjs-verbatim/`): the three import forms emitted exactly as documented; `import { T, TypeOnlyC }` gave TS1484 and TS1485; with `module: commonjs`, `import helper from "./helper"` gave TS1295 in a `.ts` file and TS1286 in a `.cts` file (6.0.3 picks by extension), and `export const` gave TS1287; `import helper = require("./helper")` and `export = {...}` compiled to `const helper = require("./helper");` and `module.exports = {...}`; `import type H = require("./helper")` was erased.
- **Caveat:** the 5.0 release notes have a broken markdown link to the PR; the tsconfig page has it right. TS1286's wording changed between 5.5.4 and 5.9.3.
- **For the post:** the authoritative "what you see is what you get" source, including the line that documents `import { type xyz }` → `import {} from "xyz"`. The CommonJS restrictions explain why some projects can't adopt it.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-pr-52203.json`, `scratchpad/type-imports-lit/A/src/ts-pr-52203-files.json`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-5.0.md`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-verbatimModuleSyntax.md`, `scratchpad/type-imports-lit/A/src/modules-reference-Theory.md`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v5.0.4.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v5.9.3.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v6.0.3.json`, `scratchpad/type-imports-lit/A/check/emit-forms/emit-verbatim.txt`, `scratchpad/type-imports-lit/A/check/errors/errors-verbatim.txt`, `scratchpad/type-imports-lit/A/check/cjs-verbatim/cjs-verbatim.txt`, `scratchpad/type-imports-lit/A/check/cjs-verbatim/cjs-verbatim-cts.txt`, `scratchpad/type-imports-lit/A/check/cjs-verbatim/typescript-6.0.3-lib-lines-52220-52232.txt`

### 2.8 The old flags: deprecated in 5.0, inert in 5.5, a hard error from 5.6 (the plan said 6.0), unknown in 7.0. VERIFIED (deprecation plan #51000; PR #58313; 5.0 and 5.5 release notes; `program.ts` at nine tags; TS7 source); My check (local run); Vendor (Microsoft)

- **Citation:** Ryan Cavanaugh, "Flag Deprecation Plan", microsoft/TypeScript #51000, 29 Sep 2022, https://github.com/microsoft/TypeScript/issues/51000 ; Ryan Cavanaugh, "5.5 deprecations are no-ops, not errors", PR #58313, merged 25 Apr 2024 into `release-5.5`, https://github.com/microsoft/TypeScript/pull/58313 ; 5.0 release notes, "Deprecations and Default Changes"; 5.5 release notes, "Disabling Features Deprecated in TypeScript 5.0"; `src/compiler/program.ts` (`checkDeprecations`) at `v5.0.4`, `v5.5.2`, `v5.5.4`, `v5.6-beta`, `v5.6.3`, `v5.7.3`, `v5.8.3`, `v5.9.3`, `v6.0.3`; `src/compiler/transformers/ts.ts` at `v5.4.5`, `v5.5.4`; TS7 `tsc/internal/tsoptions/declscompiler.go` and `tsc/internal/testrunner/compiler_runner.go` at `v7.0.2`.
- **What it says:**
  - 5.0: both are listed; "These configurations will continue to be allowed until TypeScript 5.5," "at which point they will be removed entirely, however, you will receive a warning". `"ignoreDeprecations": "5.0"` silences it. The 5.0 transformer still honours them; so does 5.4.5's.
  - 5.5: "In TypeScript 5.5, these options no longer have any effect." You may still specify them, "but these will be an error to specify in TypeScript 6.0." In source, 5.5.4 calls `checkDeprecations("5.0", "5.5", "6.0", ...)`: TS5101 "Option '{0}' is deprecated and will stop functioning in TypeScript {1}." unless silenced, and the 5.5.4 transformer no longer mentions either flag.
  - The plan (#51000): 5.0 "Deprecation warnings introduced", 5.5 "Flags start doing nothing", 6.0 "Flags removed entirely". PR #58313 implemented phase 2 by adding a third version argument, but its base branch was `release-5.5`. Every later tag (`v5.6-beta`, `v5.6.3`, `v5.7.3`, `v5.8.3`, `v5.9.3`, `v6.0.3`) calls the two-argument `checkDeprecations("5.0", "5.5", ...)`, where `removedIn` is 5.5, so `mustBeRemoved` is true and the result is TS5102 "Option '{0}' has been removed. Please remove it from your configuration." with no way to silence it. In source, phase 3 arrived in 5.6, not 6.0.
  - 7.0.2 declares neither option; the test runner skips old tests because "These tests contain options that have been completely removed, so fail to parse."
  - My check (`scratchpad/type-imports-lit/A/check/removed-flags/`): with 6.0.3, `importsNotUsedAsValues: "preserve"`, `preserveValueImports: true`, both, and both with `ignoreDeprecations` `"5.0"` or `"6.0"` all gave "error TS5102: Option 'importsNotUsedAsValues' has been removed." (and the same for `preserveValueImports`), and `import { type T } from "./mod.js"` was removed from the output: the flags are ignored.
- **Caveat:** I ran only 6.0.3. The 5.5 and 5.6–5.9 behaviour is from source; no release note for 5.6 to 5.9 mentions the change, so the 5.5 notes' "error to specify in TypeScript 6.0" is the only documented date, and it's later than what the code does. What TS7 prints for an unknown option wasn't checked.
- **For the post:** anyone reading older advice to set `importsNotUsedAsValues: preserve` needs this: since 5.5 it does nothing, and since 5.6 it fails the build.
- **Text:** `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-5.0.md`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-5.5.md`, `scratchpad/type-imports-lit/A/src/ts-issue-51000.json`, `scratchpad/type-imports-lit/A/src/ts-pr-58313.json`, `scratchpad/type-imports-lit/A/src/ts-program-v5.0.4.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v5.5.2.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v5.5.4.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v5.6-beta.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v5.6.3.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v5.7.3.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v5.8.3.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v5.9.3.ts`, `scratchpad/type-imports-lit/A/src/ts-program-v6.0.3.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v5.9.3.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v5.4.5.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v5.5.4.ts`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-declscompiler.go`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-compiler_runner.go`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v6.0.3.json`, `scratchpad/type-imports-lit/A/check/removed-flags/removed-flags.txt`

### 2.9 What `tsc --init` writes: since 5.9, `verbatimModuleSyntax`, `isolatedModules` and `noUncheckedSideEffectImports` are on. VERIFIED (5.9 release notes; PR #61813); My check (local run, 6.0.3); Vendor (Microsoft)

- **Citation:** TypeScript-Website "TypeScript 5.9" release notes, "Minimal and Updated `tsc --init`"; Ryan Cavanaugh, "tsc --init update", PR #61813, merged 6 Jun 2025, fixes #58420, https://github.com/microsoft/TypeScript/pull/61813
- **What it says:**
  - The team wanted `tsc --init` to start with "a few more prescriptive settings than we already enable." The generated file's "Recommended Options" include `"verbatimModuleSyntax": true`, `"isolatedModules": true`, `"noUncheckedSideEffectImports": true` and `"moduleDetection": "force"`; the PR shows the same sample.
  - My check (`scratchpad/type-imports-lit/A/check/init/`): `tsc --init` with 6.0.3 in an empty folder writes the same options (the only difference from the 5.9 sample is a comment URL, `aka.ms/tsconfig/module` instead of `aka.ms/tsconfig_modules`).
  - Since `verbatimModuleSyntax` already implies `isolatedModules` (1.7), the second line is redundant in effect.
- **Caveat:** neither the 5.9 notes nor the PR explain the choice of `verbatimModuleSyntax` specifically; the 2019 plan to default `preserve` (2.2) is the earlier version of the same idea.
- **For the post:** a new TypeScript project gets `verbatimModuleSyntax` today, so a new project gets the `import {} from` emit for all-inline-type imports unless the code says `import type`.
- **Text:** `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-5.9.md`, `scratchpad/type-imports-lit/A/src/ts-pr-61813.json`, `scratchpad/type-imports-lit/A/check/init/tsc-init-6.0.3.txt`

### 2.10 The emit logic in source, version by version (the reasoning behind the matrix). VERIFIED (transformer source at eight tags; baselines at `v4.5.5`, `v5.4.5`); My check (local run, 6.0.3); Vendor (Microsoft)

- **Citation:** `src/compiler/transformers/ts.ts` (`visitImportDeclaration`, `visitImportClause`, `visitNamedImportBindings`, `visitImportSpecifier`, `shouldEmitAliasDeclaration`) at `v3.8.3`, `v4.5.5`, `v5.0.4`, `v5.4.5`, `v5.5.4`, `v6.0.3`, e.g. https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/transformers/ts.ts ; baselines `preserveValueImports_importsNotUsedAsValues.js`, `preserveValueImports_mixedImports.js` at `v4.5.5` and `importsNotUsedAsValues_error.js` at `v5.4.5` under `tests/baselines/reference/`.
- **What it says:**
  - Every version: a declaration with no import clause is returned unchanged (comment `// Do not elide a side-effect only import declaration.`), and one whose clause is `import type` returns nothing (`// Always elide type-only imports`).
  - 3.8.3 to 5.4.5: if the visited clause is gone, the declaration is still emitted when `importsNotUsedAsValues` is `Preserve` or `Error`, but with no clause, which prints as a bare `import "y";`. The 5.4.5 baseline for `error` shows the CommonJS form: `import { A, B } from './a'` used only as types becomes `require("./a"); // Error`.
  - 4.5.5 to 5.4.5: an empty `{}` is kept only when `preserveValueImports` and `importsNotUsedAsValues` (`Preserve` or `Error`) are both set; 5.0.4 adds `compilerOptions.verbatimModuleSyntax ||` in front of that condition. The 4.5.5 baseline with both flags shows `import { type A, type B, type C } from "./mod.js";` becoming `import {} from "./mod.js";` and `export { type A, ... } from` becoming `export {} from "./mod.js";`.
  - Specifiers: `return !node.isTypeOnly && shouldEmitAliasDeclaration(node) ? node : undefined;` (4.5.5 on). `shouldEmitAliasDeclaration` uses `isValueAliasDeclaration` under `preserveValueImports` (keep any value) and `isReferencedAliasDeclaration` otherwise (keep only what's used as a value); from 5.0.4 it returns true under `verbatimModuleSyntax`.
  - 5.5.4 and 6.0.3: `allowEmpty = compilerOptions.verbatimModuleSyntax` only; the old-flag branches are gone.
  - My check (`scratchpad/type-imports-lit/A/check/emit-forms/`, 6.0.3): default and `isolatedModules` remove forms a, b, d, f, g and keep `import { v }` (c) and `import D` (e); `verbatimModuleSyntax` emits `import { T }` + TS1484 (a), `import {} from` (b), `import { v }` (c), nothing (d), `import D, {} from` (e), `import {} from` (f), `import { v }` (g), and `export {} from "./mod.js"` for `export { type T, type I } from`; `export type { ... } from` and `export type * as types from` emit nothing in every mode.
- **Caveat:** rows for 3.8–5.4 are read from source and baselines, not run. I found no baseline for `import { type x }` under `preserve` without `preserveValueImports`; the `import "y";` there follows from the code path that the `error` baseline exercises.
- **For the post:** what to cite when stating the matrix. The short version: `import type` has been removed in every mode since 3.8; `import { type x }` has been removed only when nothing asks the compiler to keep declarations.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v3.8.3.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v4.5.5.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v5.0.4.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v5.4.5.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v5.5.4.ts`, `scratchpad/type-imports-lit/A/src/ts-transformers-ts-v6.0.3.ts`, `scratchpad/type-imports-lit/A/src/ts-baseline-v4.5.5-preserveValueImports_importsNotUsedAsValues.js`, `scratchpad/type-imports-lit/A/src/ts-baseline-v4.5.5-preserveValueImports_mixedImports.js`, `scratchpad/type-imports-lit/A/src/ts-case-v4.5.5-preserveValueImports_importsNotUsedAsValues.ts`, `scratchpad/type-imports-lit/A/src/ts-baseline-v5.4.5-importsNotUsedAsValues_error.js`, `scratchpad/type-imports-lit/A/check/emit-forms/emit-default.txt`, `scratchpad/type-imports-lit/A/check/emit-forms/emit-verbatim.txt`

### 2.11 The odd corners: TS1363, TS1361/TS1362, `import type X = require()` (4.2), `import()` types (2.9) and `export type *` (5.0). VERIFIED (modules reference; 3.8, 2.9 and 5.0 release notes; PRs #41573 and #52217; `types.ts` at `v4.2.4`); My check (local run); Vendor (Microsoft)

- **Citation:** Modules reference and 3.8 release notes (as above); 2.9 release notes, "`import` types"; Andrew Branch, "Allow type-only imports on ImportEqualsDeclarations", PR #41573, merged 3 Dec 2020, https://github.com/microsoft/TypeScript/pull/41573 ; Andrew Branch, "Support `export type *`", PR #52217, merged 20 Jan 2023, https://github.com/microsoft/TypeScript/pull/52217
- **What it says:**
  - **TS1363** "A type-only import can specify a default import or named bindings, but not both." (3.8 on). The reason: "since it appears ambiguous whether 'type' applies to the default import" "or to the entire import declaration." The 3.8 notes put it as "Is only 'Foo' a type? Or every declaration in the import?" The fix: `import type { default as fs, BigIntOptions } from "fs"`. My check: `import type D, { T }` gave TS1363 and the `{ default as D, T }` form compiled.
  - **TS1361/TS1362** "'{0}' cannot be used as a value because it was imported using 'import type'." and the `export type` twin. "Even values can be imported with 'import type'," "but since they won't exist in the output JavaScript," "they can only be used in non-emitting positions"; `typeof f` is fine. My check: `v + 1` and `new C()` after `import type { v, C }` gave TS1361; `export type Fine = typeof v` didn't; `new TypeOnlyC()` on a class re-exported with `export type` gave TS1362 (and TS1485 under `verbatimModuleSyntax`).
  - **`import type X = require()`**: added in 4.2 by PR #41573 (`ImportEqualsDeclaration` gains `isTypeOnly` between `v4.1.5` and `v4.2.4`) for an Octokit case: a library emitting ESM needed a CommonJS class type. "The CJS-style import can be allowed to exist even in" ES module output because it "will necessarily be elided due to the" `type` keyword.
  - **`import()` types** (2.9, May 2018): `import("mod")` in a type position "allows for reaching in a module and accessing its exported declaration without importing it." The motivation was global scripts: "But non-module global scripts cannot access types declared in modules." `typeof import("fs").writeFile` gets a value's type. Never emitted.
  - **`export type *`** (5.0, PR #52217, which "Adds support for" `export type * from "mod"` and `export type * as ns from "mod"`). 3.8 had left these out.
- **Caveat:** none.
- **For the post:** TS1363 explains why lint rules that merge or split imports must handle the default-plus-named case; `import()` types are a third way to reference a type without an import statement at all.
- **Text:** `scratchpad/type-imports-lit/A/src/modules-reference-Reference.md`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-3.8.md`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-2.9.md`, `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-5.0.md`, `scratchpad/type-imports-lit/A/src/ts-pr-41573.json`, `scratchpad/type-imports-lit/A/src/ts-pr-52217.json`, `scratchpad/type-imports-lit/A/src/ts-types-v4.2.4.ts`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v6.0.3.json`, `scratchpad/type-imports-lit/A/check/errors/errors-default.txt`, `scratchpad/type-imports-lit/A/check/errors/errors-verbatim.txt`, `scratchpad/type-imports-lit/A/check/cjs-verbatim/cjs-verbatim.txt`

### 2.12 `erasableSyntaxOnly` (5.8) bans `import =` and `export =` and is meant to be paired with `verbatimModuleSyntax`. VERIFIED (5.8 release notes; tsconfig reference; PR #61011); Vendor (Microsoft)

- **Citation:** TypeScript-Website "TypeScript 5.8" release notes, "The `--erasableSyntaxOnly` Option"; TSConfig Reference `erasableSyntaxOnly`; Ryan Cavanaugh, "`--erasableSyntaxOnly`", PR #61011, merged 23 Jan 2025 (implements #59601).
- **What it says:**
  - Among the constructs it rejects: "Non-ECMAScript 'import =' and 'export =' assignments", along with enums, namespaces with runtime code and parameter properties. Error TS1294 "This syntax is not allowed when 'erasableSyntaxOnly' is enabled."
  - "Typically, you will want to combine this flag with the" `--verbatimModuleSyntax` option, which ensures correct import syntax "and that import elision does not take place."
- **Caveat:** the motivating runtime (Node's type stripping) is in section 3. `--rewriteRelativeImportExtensions` (5.7) only rewrites `.ts` extensions in relative paths and doesn't bear on type-only imports; I left it out.
- **For the post:** together these define erasable TypeScript: no elision, no type-directed emit, and the CommonJS escape hatch of `verbatimModuleSyntax` (`import = require`) closed too, so ESM output is the only fully erasable path.
- **Text:** `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-5.8.md`, `scratchpad/type-imports-lit/A/src/tsconfig-ref-erasableSyntaxOnly.md`, `scratchpad/type-imports-lit/A/src/ts-pr-61011.json`, `scratchpad/type-imports-lit/A/src/ts-diagnosticMessages-v6.0.3.json`

### 2.13 TypeScript 6.0 and 7.0 don't change these flags' defaults; 7.0 emits JavaScript, and its Go transformer applies the same rules as 6.0. VERIFIED (6.0 release notes; 7.0 announcement; TS7 README and source at `v7.0.2`); Vendor (Microsoft)

- **Citation:** TypeScript-Website "TypeScript 6.0" release notes; Daniel Rosenwasser, "Announcing TypeScript 7.0", TypeScript devblog, 8 Jul 2026, https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ ; microsoft/TypeScript at `v7.0.2` (`1e4744d68260a7cb91b62b12edc3f6a2187faaf1`): `tsc/README.md`, `tsc/internal/compiler/emitter.go`, `tsc/internal/transformers/tstransforms/typeeraser.go`, `importelision.go`, `tsc/internal/tsoptions/declscompiler.go`. The Go port moved from microsoft/typescript-go (now archived, "Staging repo for development of native port of TypeScript") into microsoft/TypeScript under `tsc/`.
- **What it says:**
  - 6.0's default changes are `strict`, `module` (`esnext`), `target`, `noUncheckedSideEffectImports`, `libReplacement`, `rootDir` and `types`; `isolatedModules` and `verbatimModuleSyntax` aren't on the list, and its deprecations (ES5 target, `baseUrl`, AMD/UMD/System, `moduleResolution: node10`, etc.) don't include import-elision flags, which were already gone.
  - 7.0: "TypeScript 7.0 is made to be compatible with TypeScript 6.0's type-checking and command-line behavior." Code that compiles cleanly with 6.0 "should compile identically in TypeScript 7.0." It "provides hard errors in the face of any flags and constructs" deprecated in 6.0. It parallelises work "including parsing, type-checking, and emitting."
  - README at `v7.0.2`: "Emit (JS output)" is done; "For TypeScript 7.0 RC and later, the command name is 'tsc'." (`npx tsgo` was the preview name).
  - `emitter.go`: `importElisionEnabled := !options.VerbatimModuleSyntax.IsTrue() && !ast.IsInJSFile(...)`; the type eraser always runs, and the separate import-elision transformer runs only when that is true (it panics if constructed under `verbatimModuleSyntax`).
  - `typeeraser.go`: a declaration with no clause is kept; an `import type` clause returns nil (`// Always elide type-only imports`); a `type` specifier is removed; a written `{}` is kept at this stage; and if every specifier was removed, `if !tx.compilerOptions.VerbatimModuleSyntax.IsTrue() && len(elements.Nodes) == 0` drops the braces, otherwise `{}` stays. `importelision.go` then drops whatever isn't used as a value (including the empty braces), as 6.0 does.
  - `declscompiler.go` declares `isolatedModules` and `verbatimModuleSyntax` with `DefaultValueDescription: false`, and has no `importsNotUsedAsValues` or `preserveValueImports` entry (2.8).
- **Caveat:** source reading and the team's compatibility claim, not a run; the corpus harness tests the installed compilers. I didn't check 7.0's behaviour for `import {} from` written by hand under default settings beyond the code path above.
- **For the post:** the matrix's 6.0 rows carry over to 7.0 unchanged. Say "TypeScript 6.0 and 7.0" rather than implying the Go port changed anything about type-only imports.
- **Text:** `scratchpad/type-imports-lit/A/src/release-notes-TypeScript-6.0.md`, `scratchpad/type-imports-lit/A/text/devblog-announcing-typescript-7-0.txt`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-README.md`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-emitter.go`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-typeeraser.go`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-importelision.go`, `scratchpad/type-imports-lit/A/src/ts7-v7.0.2-declscompiler.go`, `scratchpad/type-imports-lit/A/src/ts-release-v7.0.2.json`, `scratchpad/type-imports-lit/A/src/gh-repo-typescript-go.json`

### 2.14 The one change in 7.1: `import D, { type T }` stops emitting `import D, {} from`. Without a default binding, `import {} from` stays. VERIFIED (issue #62239; PRs #62349 and #64578; source and baseline at `v7.1-beta`); My check (local run, 6.0.3); Vendor (Microsoft)

- **Citation:** issue #62239, "`verbatimModuleSyntax` leaves empty curly brackets in the JS output", Igor Danchenko, 8 Aug 2025, https://github.com/microsoft/TypeScript/issues/62239 ; PR #62349 (closed unmerged during the 6.0 freeze); PR #64578, "Elide empty named imports next to a default import under verbatimModuleSyntax", merged 2 Oct 2026, https://github.com/microsoft/TypeScript/pull/64578 ; `typeeraser.go` and baseline `verbatimModuleSyntaxDefaultImportTypeOnlyNamed.js` at `v7.1-beta` (`3e9236361fa97a9e6c685f4833ac457ae2d8c50a`).
- **What it says:**
  - #62239: `import Image, {type ImageProps} from "next/image.js";` under `verbatimModuleSyntax` emits `import Image, {} from "next/image.js";` (every 5.x the reporter tried).
  - PR #64578: "With verbatimModuleSyntax on, tsc kept an empty '{}' after a default import" when all named imports were type-only; the default binding already keeps the import. Imports without a default still emit `import {} from "./a"`, and a written `{}` stays. "6.0 emits the braces too, and this PR changes that." Ryan Cavanaugh had approved the same change for the old codebase in #62349. (The PR also says it was written with Claude Code.)
  - The 7.1-beta baseline: `import A1, { type T } from "./a";` → `import A1 from "./a";`, while `import { type T as T3 } from "./a";` → `import {} from "./a";` and a written `import A4, {} from "./a";` is kept. `git compare` shows the merge commit is contained in `v7.1-beta`.
  - My check: 6.0.3 emits `import D, {} from "./mod.js";` for `import D, { type T }` (`emit-forms/emit-verbatim.txt`).
- **Caveat:** 7.1 is a beta; the change could move. It's cosmetic: the module loads either way.
- **For the post:** if the post says `import { type x }` compiles to `import {} from`, that stays true in 7.1 for imports without a default binding. Only the default-plus-type case changes.
- **Text:** `scratchpad/type-imports-lit/A/src/ts-issue-62239.json`, `scratchpad/type-imports-lit/A/src/ts-pr-64578.json`, `scratchpad/type-imports-lit/A/src/ts7-v7.1-beta-typeeraser.go`, `scratchpad/type-imports-lit/A/src/ts7-v7.1-beta-baseline-verbatimModuleSyntaxDefaultImportTypeOnlyNamed.js`, `scratchpad/type-imports-lit/A/src/ts7-v7.1-beta-case-verbatimModuleSyntaxDefaultImportTypeOnlyNamed.ts`, `scratchpad/type-imports-lit/A/check/emit-forms/emit-verbatim.txt`

## 3. Per-file transpilers and runtimes that strip types

### 3.1 Babel removes any import whose every use is a type, keeps a hand-written `import {}`, and has offered `onlyRemoveTypeImports` since v7.9.0; the default flip is now slated for Babel 9. VERIFIED (docs at a pinned commit, source at v8.1.2, PRs, a test fixture)

- **Citation:** Babel, "@babel/plugin-transform-typescript" docs, babel/website `docs/plugin-transform-typescript.md` at `2e79891c` (26 Oct 2026), https://github.com/babel/website/blob/2e79891c9ef062eea44b71994fcfe8eaebd001c5/docs/plugin-transform-typescript.md; source `packages/babel-plugin-transform-typescript/src/index.ts` at `v8.1.2` (11 Nov 2026), https://github.com/babel/babel/blob/v8.1.2/packages/babel-plugin-transform-typescript/src/index.ts; PR #11173 (Kai Cataldo, merged 26 Feb 2020); PR #15349 (liuxingbaoyu, merged 15 Jan 2023), fixing issue #15348.
- **What it says:**
  - **How it decides (default):** `import type` declarations are removed outright. For other imports, each binding is checked with `isImportTypeOnly`, which walks every reference and returns false as soon as one is outside a type position; a binding with no references therefore counts as type-only too, except the JSX pragma (`React` or the configured pragma) when the file contains JSX. Inline `type` specifiers are always removed. If every specifier goes, the statement goes. A hand-written empty import survives, and the source says so: "Note: this will allow both `import { } from 'm'` and `import 'm';`." then "In TypeScript, the former would be elided."
  - **The option:** `onlyRemoveTypeImports`, "`boolean`, defaults to `false`"; "When set to `true`, the transform will only remove [type-only imports]" (introduced in TypeScript 3.8). "Added in: `v7.9.0`" (released 20 Mar 2020). The docs carry a "Pending defaults change" box: "The default value will be `true` in Babel 9.0." Its mapping to tsc: "`onlyRemoveTypeImports: true` is equivalent to `importsNotUsedAsValues: preserve`", and false to `remove`; "There is no equivalent for `importsNotUsedAsValues: error`."
  - **Why it was added:** PR #11173 "allows the user to opt into only removing imports that are unambiguously types." and "We will probably want to make this the default behavior in the future." Six years and one major version later the default is still `false`.
  - **`import { type A } from "x"` with the option on:** before v7.20.13 (21 Jan 2023) the whole statement was removed; issue #15348, "[Bug]: onlyRemoveTypeImports: true should not remove imports with only inline type specifier", asked for tsc's behaviour, and PR #15349 changed `if (isAllSpecifiersElided())` to `if (isAllSpecifiersElided() && !onlyRemoveTypeImports)`. The fixture `imports/type-only-import-specifier-4` at v8.1.2: input `import { type A } from "x";`, options `onlyRemoveTypeImports: true`, output `import "x";`.
  - **Exports:** `export type {…}` and an `export { type A, type B } from "a"` whose specifiers are all inline-type are removed; a local `export { A }` is removed only when `A` is a type declared or imported as a type in this file. `export { A } from "./a"` with a plain specifier is kept, because the plugin can't see `./a`.
  - **Caveats in the docs:** `isolatedModules` "This is the default Babel behavior, and it can't be turned off" "because Babel doesn't support cross-file analysis." "Changes to your `tsconfig.json` are not reflected in babel." Because Babel doesn't type-check, "code which is syntactically correct, but would fail the TypeScript type-checking" "may successfully get transformed, and often in unexpected or invalid ways." `--emitDecoratorMetadata`: "This option isn't supported by an official Babel package" (section 4).
- **Caveat:** I read the code and fixtures; Babel isn't installed in the worktree, so I didn't run it. The docs' "Babel 9.0" contradicts PR #11173's hope only in timing.
- **For the post:** Babel shows the two strategies side by side: guess from usage within one file (the default), or trust the `type` keyword (`onlyRemoveTypeImports`). The second is the only one that never deletes a side-effect import, and it's still opt-in.
- **Text:** `scratchpad/type-imports-lit/B/text/babel-plugin-transform-typescript-docs.txt`, `scratchpad/type-imports-lit/B/src/babel-plugin-transform-typescript-docs-2e79891c.md`, `scratchpad/type-imports-lit/B/src/babel-transform-typescript-index-v8.1.2.ts`, `scratchpad/type-imports-lit/B/src/babel-pr-11173.json`, `scratchpad/type-imports-lit/B/src/babel-pr-15349.json`, `scratchpad/type-imports-lit/B/src/babel-pr-15349-files.json`, `scratchpad/type-imports-lit/B/src/babel-issue-15348.json`, `scratchpad/type-imports-lit/B/src/babel-CHANGELOG-v7.28.0.md`, `scratchpad/type-imports-lit/B/src/babel-release-v7.9.0.json`, `scratchpad/type-imports-lit/B/src/babel-v8.1.2-fixture-type-only-import-specifier-4-input.ts`, `scratchpad/type-imports-lit/B/src/babel-v8.1.2-fixture-type-only-import-specifier-4-options.json`, `scratchpad/type-imports-lit/B/src/babel-v8.1.2-fixture-type-only-import-specifier-4-output.mjs`

### 3.2 esbuild deletes unused imports in `.ts` files, tolerates type re-exports only when bundling, and reads `verbatimModuleSyntax` since 0.18.0; it never reads `isolatedModules`. VERIFIED (docs, changelogs at v0.28.2); My check (esbuild 0.28.1)

- **Citation:** esbuild, "Content Types", TypeScript and TypeScript caveats, https://esbuild.github.io/content-types/ (saved 17 Nov 2026); `CHANGELOG-2020.md` to `CHANGELOG-2025.md` and `CHANGELOG.md` at tag `v0.28.2`, https://github.com/evanw/esbuild/tree/v0.28.2
- **What it says:**
  - The syntax table: `import {Type} from 'foo'` is "Handled by removing all unused imports"; `export {Type} from 'foo'` is "Handled by ignoring missing exports in TypeScript files". `import type`, `export type` and inline `type` specifiers are "parsed and ignored".
  - "Files are compiled independently": tsc parses imported files, but esbuild and Babel "compile each file in isolation" "so they can't tell if an imported name is a type or a value." So "you should enable the isolatedModules TypeScript configuration option if you use TypeScript with esbuild", which blocks `export {T} from './types'`.
  - `isolatedModules` is not among the tsconfig fields esbuild reads (the page ends the list with all other fields "will be ignored"), and no esbuild changelog from 2020 to 0.28.2 mentions it (grep of all seven files). esbuild recommends the flag for tsc's checker; it doesn't consume it.
  - On the three import options: "By default, the TypeScript compiler will delete unused imports" and "This behavior is also implemented by esbuild." The options "preserve unused imports, which can be useful" "if for example the imported file has useful side-effects." "You should use verbatimModuleSyntax for this".
  - "The emitDecoratorMetadata TypeScript configuration option is not supported." (section 4)
  - **History from the changelogs:** 0.7.15 (13 Oct 2020) respects `importsNotUsedAsValues`; 0.8.28 (31 Dec 2020): "In this release, esbuild deliberately deviates from the behavior of the official TypeScript compiler" to keep unused imports for Svelte when not bundling (3.13); 0.14.0 (26 Nov 2021) adds `preserveValueImports` and aligns `importsNotUsedAsValues` with tsc, and "this release is being considered a breaking change."; 0.14.40 (27 May 2022) fixes `preserveValueImports` so an import clause "empty of values (even if it contains types)" is type-only and removed, as tsc did (7.6); 0.18.0 (9 Jun 2023) adds `verbatimModuleSyntax`, treated "as if you had specified both" `preserveValueImports: true` and `importsNotUsedAsValues: preserve`.
  - **My check** (`scratchpad/type-imports-lit/B/check/esbuild/`, esbuild 0.28.1, transform mode): with an empty tsconfig, `import { User }`, `import type { User }` and `import { type User }` (all used only as types) all compile to no import at all. With `verbatimModuleSyntax: true`, `import { User }` is kept verbatim, `import type` is removed, and `import { type User }` becomes `import {} from "./types.ts";`. `export { User } from "./types.ts"` (a type re-exported without `type`) is kept in transform mode under both configs; when bundled, esbuild drops the missing export without a warning but still includes `types.ts`'s side effect.
- **Caveat:** transform mode and bundle mode differ (see 5.1 and 5.3); the docs say so only in the one-line table note.
- **For the post:** esbuild is the template the others copied (Bun's parser comments are esbuild's, 3.11): elision by usage within the file, the keyword trusted only when the tsconfig asks.
- **Text:** `scratchpad/type-imports-lit/B/text/esbuild-content-types.txt`, `scratchpad/type-imports-lit/B/src/esbuild-content-types.html`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2020-v0.28.2.md`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2021-v0.28.2.md`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2022-v0.28.2.md`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2023-v0.28.2.md`, `scratchpad/type-imports-lit/B/src/esbuild-release-dates.tsv`, `scratchpad/type-imports-lit/B/src/esbuild-commit-v0.7.15.json`, `scratchpad/type-imports-lit/B/check/esbuild/esbuild-out.txt`

### 3.3 swc elides by usage unless `jsc.transform.verbatimModuleSyntax` is set (since Sept 2023); the option is in the source and types but not on the config docs page. VERIFIED (source at v1.16.22, docs, PRs)

- **Citation:** swc-project/swc at `v1.16.22` (5 Nov 2026): `crates/swc_ecma_transforms_typescript/src/{config.rs,transform.rs,typescript.rs,semantic.rs,retain.rs}` and `crates/swc/src/config/mod.rs`, https://github.com/swc-project/swc/tree/v1.16.22/crates/swc_ecma_transforms_typescript/src; PR #7202, "refactor(es/typescript): Reimplement TypeScript pass" (magic-akari, merged 25 Sep 2023); PR #10079 (merged 23 Feb 2025); docs "Migrating from tsc", swc-project/website `aa219dcb`.
- **What it says:**
  - `TransformConfig` (the `jsc.transform` block) has `verbatim_module_syntax: BoolConfig<false>`, documented in the source only by a link to the tsconfig page. The TypeScript pass's own `Config` also has `import_not_used_as_values` (`remove` by default, or `preserve`).
  - **Default:** `strip_module_items_with_semantic` removes inline-type specifiers and every specifier with no usage, then keeps the statement only if `importsNotUsedAsValues` is `preserve` or a specifier is left. Its comment: "Match tsc behavior: keep empty original imports, but strip specifiers by" usage. A hand-written `import {} from "m"` is untouched (the match arm requires non-empty specifiers).
  - **`verbatimModuleSyntax: true`:** that pass is skipped ("But in `verbatim_module_syntax` mode, we do not remove any unused imports."); `visit_mut_import_specifiers` still removes inline `type` specifiers, so `import { type x } from "y"` leaves an import of `"y"` with no bindings. In both modes `import type` is dropped (`Self::Import(import_decl) => !import_decl.type_only` in `retain.rs`).
  - **History:** PR #7202 lists "Introducing [Verbatim Module Syntax]" under new features; PR #10079 added `transform.verbatimModuleSyntax` to `@swc/types` 17 months later.
  - **Docs:** the compilation config page at `aa219dcb` doesn't mention the option (grep). The migration page says: "SWC is unable to completely discern whether the imported binding is a" "`value` or a `type`." and recommends `importsNotUsedAsValues: "error"`-style marking and `isolatedModules`, with a paragraph on `verbatimModuleSyntax`.
- **Caveat:** read, not run (swc isn't installed in the worktree).
- **For the post:** a third widely used transpiler with the same two modes; its verbatim mode produces the same leftover module request as tsc's.
- **Text:** `scratchpad/type-imports-lit/B/src/swc-v1.16.22-crates_swc_ecma_transforms_typescript_src_config.rs`, `scratchpad/type-imports-lit/B/src/swc-v1.16.22-crates_swc_ecma_transforms_typescript_src_transform.rs`, `scratchpad/type-imports-lit/B/src/swc-v1.16.22-crates_swc_ecma_transforms_typescript_src_typescript.rs`, `scratchpad/type-imports-lit/B/src/swc-v1.16.22-crates_swc_ecma_transforms_typescript_src_semantic.rs`, `scratchpad/type-imports-lit/B/src/swc-v1.16.22-crates_swc_ecma_transforms_typescript_src_retain.rs`, `scratchpad/type-imports-lit/B/src/swc-v1.16.22-crates_swc_src_config_mod.rs`, `scratchpad/type-imports-lit/B/src/swc-pr-7202.json`, `scratchpad/type-imports-lit/B/src/swc-pr-10079.json`, `scratchpad/type-imports-lit/B/src/swc-docs-migrating-from-tsc-aa219dcb.md`, `scratchpad/type-imports-lit/B/src/swc-docs-compilation-aa219dcb.mdx`

### 3.4 Amaro, Node's stripper, blanks inline `type` specifiers but keeps the statement, so `import { type x } from "y"` still loads `y`. VERIFIED (Amaro README, swc fast-strip source); My check

- **Citation:** nodejs/amaro `README.md` at `v1.3.0` (27 Oct 2026), https://github.com/nodejs/amaro/blob/v1.3.0/README.md; swc `crates/swc_ts_fast_strip/src/erase/declarations.rs` at `v1.16.22`, https://github.com/swc-project/swc/blob/v1.16.22/crates/swc_ts_fast_strip/src/erase/declarations.rs; Node PR #53725 (Marco Ippolito, merged 24 Jul 2024).
- **What it says:**
  - Amaro wraps swc's "TypeScript parser and type stripper." In strip-only mode "Stack traces are preserved, by replacing removed types with white spaces." "The supported TypeScript version is 5.8." Node v24.14.1 bundles Amaro 1.1.7 (`process.versions.amaro`).
  - `erase_import_decl`: if `import.type_only`, the whole statement is erased; otherwise each specifier with `is_type_only` is erased as a list item and the statement stays. `erase_named_export` does the same for exports. There's no usage analysis and no option: a plain `import { x }` is always kept.
  - The swc fast-strip `TransformConfig` typings list `verbatimModuleSyntax` and `importNotUsedAsValues`, but those belong to transform mode; Node's strip mode doesn't read a tsconfig (3.5).
  - PR #53725 on why swc: "Swc is currently used by Deno for the same purpose, it's battle tested."
  - **My check** (`scratchpad/type-imports-lit/B/check/node-strip/`, Node v24.14.1): `import { type User } from "./types.ts"` printed `types.ts evaluated` before the program's output; `import type { User }` did not.
- **Caveat:** Amaro's own Rust crate wasn't read; the behaviour comes from the swc crate it depends on, at swc's current tag, and from the run.
- **For the post:** this is the cleanest current case of Hayden's recollection: in Node, `import { type x }` is exactly `import {} from "y"`.
- **Text:** `scratchpad/type-imports-lit/B/text/amaro-README-v1.3.0.txt`, `scratchpad/type-imports-lit/B/src/amaro-README-v1.3.0.md`, `scratchpad/type-imports-lit/B/src/swc-v1.16.22-swc_ts_fast_strip-erase-declarations.rs`, `scratchpad/type-imports-lit/B/src/swc-v1.16.22-swc_ts_fast_strip-lib.rs`, `scratchpad/type-imports-lit/B/src/node-pr-53725.json`, `scratchpad/type-imports-lit/B/check/node-strip/node-out.txt`, `scratchpad/type-imports-lit/B/check/node-strip/amaro-version.txt`

### 3.5 Node's type stripping: flagged in v22.6.0, on by default in v23.6.0 and v22.18.0, stable in v25.2.0 and v24.12.0; `--experimental-transform-types` came in v22.7.0 and went in v26.0.0. VERIFIED (docs history table at two tags, PRs, releases)

- **Citation:** Node.js, "Modules: TypeScript", `doc/api/typescript.md` at `v26.13.1` and `v24.14.1`, https://github.com/nodejs/node/blob/v26.13.1/doc/api/typescript.md; https://nodejs.org/docs/v24.14.1/api/typescript.html and https://nodejs.org/api/typescript.html (served as v26.13.1, 17 Nov 2026); PRs #53725, #54283, #56350, #58643, #60600, #61803 (all by Marco Ippolito).
- **What it says:**
  - `introduced_in=v22.6.0` (released 6 Aug 2024; PR #53725, `--experimental-strip-types`). History table: v22.7.0, "Added `--experimental-transform-types` flag." (PR #54283); v23.6.0 and v22.18.0, "Type stripping is enabled by default." (PR #56350; released 7 Jan 2025 and 31 Jul 2025); v24.3.0 and v22.18.0, no experimental warning (PR #58643); v25.2.0 and v24.12.0, "Type stripping is now stable." (PR #60600; released 11 Nov and 10 Dec 2025); v26.0.0, "Removed `--experimental-transform-types` flag." (PR #61803, semver-major; released 5 May 2026). Both pages now show "Stability: 2 - Stable".
  - The v24.14.1 page still documents the transform flag for "`enum` declarations, parameter properties"; the v26 page drops it and adds that the parser "requires WebAssembly".
  - **My check:** on v24.14.1 `enum` fails with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` ("TypeScript enum is not supported in strip-only mode") and runs under `--experimental-transform-types` with an ExperimentalWarning.
- **Caveat:** v22.18.0's unflagging broke at least one team's CI (issue #59364, 5 Aug 2025, not about imports); not pursued.
- **For the post:** running TypeScript in Node is now stable and default on every supported line, which makes the `type` keyword a runtime requirement for anyone running `.ts` directly.
- **Text:** `scratchpad/type-imports-lit/B/src/node-typescript-md-v26.13.1.md`, `scratchpad/type-imports-lit/B/src/node-typescript-md-v24.14.1.md`, `scratchpad/type-imports-lit/B/text/nodejs-org-api-latest-typescript.txt`, `scratchpad/type-imports-lit/B/src/nodejs-org-api-latest-typescript.html`, `scratchpad/type-imports-lit/B/src/nodejs-org-docs-v24.14.1-typescript.html`, `scratchpad/type-imports-lit/B/src/node-release-dates.tsv`, `scratchpad/type-imports-lit/B/src/node-pr-53725.json`, `scratchpad/type-imports-lit/B/src/node-pr-54283.json`, `scratchpad/type-imports-lit/B/src/node-pr-56350.json`, `scratchpad/type-imports-lit/B/src/node-pr-58643.json`, `scratchpad/type-imports-lit/B/src/node-pr-60600.json`, `scratchpad/type-imports-lit/B/src/node-pr-61803.json`, `scratchpad/type-imports-lit/B/check/node-strip/node-out.txt`

### 3.6 Node's docs say the `type` keyword is required, recommend `verbatimModuleSyntax`, and ignore tsconfig; without `type` the import fails at link time. VERIFIED (docs at v24.14.1 and v26.13.1); My check

- **Citation:** as 3.5, sections "Type stripping" and "Importing types without `type` keyword".
- **What it says:**
  - "By default Node.js will execute TypeScript files that contains only" "erasable TypeScript syntax." "Node.js will replace TypeScript syntax with whitespace," and "Node.js ignores `tsconfig.json` files and therefore" tsconfig-dependent features are unsupported.
  - "Due to the nature of type stripping, the `type` keyword is necessary to" "correctly strip type imports. Without the `type` keyword, Node.js will treat the" "import as a value import, which will result in a runtime error." The tsconfig option `verbatimModuleSyntax` "can be used to match this behavior." Working examples: `import type { Type1, Type2 } from './module.ts';` and `import { fn, type FnParams } from './fn.ts';`.
  - Recommended settings ("we recommend version 5.8 or newer with the following" tsconfig): `noEmit` (optional), `target: "esnext"`, `module: "nodenext"`, `rewriteRelativeImportExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`.
  - The docs don't say that `import { type X }` still loads the module.
  - **My check** (`scratchpad/type-imports-lit/B/check/node-strip/node-out.txt`, v24.14.1): `import { User } from "./types.ts"` (an interface) exits 1 with "SyntaxError: The requested module './types.ts' does not provide an export named 'User'"; `export { User } from "./types.ts"` fails the same way; `export type { User }` runs.
- **For the post:** the error names the importing line but not the reason; 7.9–7.11 show how often people meet it.
- **Text:** `scratchpad/type-imports-lit/B/src/node-typescript-md-v26.13.1.md`, `scratchpad/type-imports-lit/B/src/node-typescript-md-v24.14.1.md`, `scratchpad/type-imports-lit/B/src/nodejs-org-api-latest-typescript.html`, `scratchpad/type-imports-lit/B/src/nodejs-org-docs-v24.14.1-typescript.html`, `scratchpad/type-imports-lit/B/check/node-strip/node-out.txt`

### 3.7 Running the same three imports in Node and Bun gives three different results. My check (local run)

- **Citation:** my runs, `scratchpad/type-imports-lit/B/check/node-strip/` (Node v24.14.1, Bun 1.4.4) and `scratchpad/type-imports-lit/B/check/bun-verbatim/` (Bun 1.4.4 with a tsconfig setting `verbatimModuleSyntax: true`). `types.ts` exports an interface and logs `types.ts evaluated`.
- **What it says:**

  | File | Node v24.14.1 | Bun 1.4.4 (no tsconfig) | Bun 1.4.4 (`verbatimModuleSyntax: true`) |
  | --- | --- | --- | --- |
  | `import { User }` | link error, exit 1 | runs; `types.ts` not evaluated | runs; `types.ts` not evaluated |
  | `import type { User }` | runs; not evaluated | runs; not evaluated | runs; not evaluated |
  | `import { type User }` | runs; **`types.ts` evaluated** | runs; not evaluated | runs; not evaluated |
  | `export { User } from` | link error, exit 1 | "SyntaxError: export 'User' not found in './types.ts'" | not run |
  | `export type { User } from` | runs | runs | not run |
  | `enum` | `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | runs | not run |
  - `bun build --no-bundle` with the verbatim tsconfig emits no import for either `import { User }` or `import { type User }`. `bun build` (bundled) tolerates `export { User } from` and includes `types.ts`'s side effect (`scratchpad/type-imports-lit/B/check/node-strip/bun-build-out.txt`).

- **Caveat:** toy files; Bun's behaviour is explained by its source in 3.11. Deno isn't on the machine.
- **For the post:** the same file can pass under Bun, fail under Node, and load a module under one and not the other. Code that must run on both needs `import type`.
- **Text:** `scratchpad/type-imports-lit/B/check/node-strip/node-out.txt`, `scratchpad/type-imports-lit/B/check/node-strip/bun-out.txt`, `scratchpad/type-imports-lit/B/check/node-strip/bun-build-out.txt`, `scratchpad/type-imports-lit/B/check/bun-verbatim/bun-verbatim-out.txt`

### 3.8 Vite has told users to set `isolatedModules` since 2.0, added the type-only import tip in Dec 2021, and lists `verbatimModuleSyntax` only among options that affect the build. VERIFIED (docs at v8.3.8 and older tags; PR and issue)

- **Citation:** vitejs/vite `docs/guide/features.md` at `v8.3.8` (11 Nov 2026), https://github.com/vitejs/vite/blob/v8.3.8/docs/guide/features.md, and at v2.0.0, v2.5.0, v3.0.0, v4.0.0, v5.0.0, v6.0.0, v7.0.0, v8.0.0; PR #6260, "docs: typescript tips for using Type-Only Imports and Export" (ygj6, merged 25 Dec 2021), closing issue #6156 (7.4).
- **What it says:**
  - v2.0.0 (16 Feb 2021): esbuild "doesn't support certain features like const enum and implicit type-only imports" and users "must set" `isolatedModules: true`. The same words are in v8.3.8, with "Oxc transformer" in place of esbuild, under `isolatedModules`: "Should be set to `true`."
  - PR #6260 added: use type-only syntax "to avoid potential problems like type-only imports being incorrectly bundled", with `import type { T } from 'only/types'` and `export type { T }`. It's absent at v2.5.0 and present at v3.0.0 (13 Jul 2022).
  - "Other Compiler Options Affecting the Build Result" lists `importsNotUsedAsValues`, `preserveValueImports` and, from v5.0.0 (16 Nov 2023; not at v4.0.0), `verbatimModuleSyntax`, with no advice to turn it on. v8.3.8 says Vite reads tsconfig and "sets the corresponding Oxc Transformer options." (3.9).
- **Caveat:** I didn't bisect the 2.x minors; the tip may have shipped in 2.8.
- **For the post:** the lead was half right: Vite's docs push `isolatedModules` and the type-only syntax, not `verbatimModuleSyntax`. Svelte's docs are the ones that say to set it (3.13).
- **Text:** `scratchpad/type-imports-lit/B/src/vite-features-md-v8.3.8.md`, `scratchpad/type-imports-lit/B/text/vite-features-v8.3.8.txt`, `scratchpad/type-imports-lit/B/src/vite-features-history/features-v2.0.0.md`, `scratchpad/type-imports-lit/B/src/vite-features-history/features-v5.0.0.md`, `scratchpad/type-imports-lit/B/src/vite-commit-1a6e2da634.patch`, `scratchpad/type-imports-lit/B/src/vite-pr-6260.json`

### 3.9 Oxc (Vite 8, Rolldown) turns `import {}` into `import 'mod'`, and its `onlyRemoveTypeImports` keeps `import { type A }` as `import 'mod'`; Rolldown sets the option from `verbatimModuleSyntax`. VERIFIED (docs, source at crates_v0.159.0 and Rolldown v1.3.2); My check (Rolldown 1.2.13)

- **Citation:** Oxc, "TypeScript" transformer guide, oxc-project.github.io `src/docs/guide/usage/transformer/typescript.md` at `a365c81e` (22 Apr 2026), https://oxc.rs/docs/guide/usage/transformer/typescript; `crates/oxc_transformer/src/typescript/{annotations.rs,options.rs}` at `crates_v0.159.0` (16 Nov 2026); rolldown `crates/rolldown_common/src/inner_bundler_options/types/tsconfig_merge.rs` at `v1.3.2` (11 Nov 2026); Rolldown PR #8169 (sapphi-red, merged 2 Feb 2026).
- **What it says:**
  - Docs: "By default, TypeScript removes unused imports in a different semantics than the JavaScript specification." For `verbatimModuleSyntax`: "If you are using this option, make sure to set `typescript.onlyRemoveTypeImports` option to `true`." Default `onlyRemoveTypeImports: false`. Option doc comment: "the transform will only remove type-only imports (introduced in TypeScript 3.8)."
  - Source, `exit_program`: `import type` is removed; an empty clause is rewritten ("import {} from 'mod' -> import 'mod'"); inline-type specifiers are removed; other specifiers are kept if `only_remove_type_imports` or `has_value_reference`. If nothing is left, `import { type A } from 'mod'` becomes `import 'mod'` with the option, otherwise "Remove the import declaration if all specifiers are removed".
  - Oxc runs Babel's plugin fixtures; at `crates_v0.159.0` it passes 110 of 158 `babel-plugin-transform-typescript` fixtures, and `type-only-import-specifier-4` (3.1) isn't in the failure list; `type-only-export-specifier-2` is ("Output mismatch").
  - Rolldown: if the user hasn't set `onlyRemoveTypeImports`, it's set from `compilerOptions.verbatimModuleSyntax`; for the deprecated pair it warns that the combination "is not supported. Please migrate to the verbatimModuleSyntax option." (PR #8169). Vite 8's `oxc.ts` passes the tsconfig to Rolldown's native transform.
  - **My check** (`scratchpad/type-imports-lit/B/check/rolldown-tsconfig/`, Rolldown 1.2.13, an entry with an unused value import and an `import { type Shape }` from a module that logs): no tsconfig options, the module is dropped; `verbatimModuleSyntax: true`, it's kept (`side.ts evaluated` in the bundle). See 7.17 for the deprecated pair.
- **Caveat:** Vite 8.3.8 bundles a newer Rolldown than the 1.2.13 I ran; I didn't run Vite itself.
- **For the post:** in Vite 8 projects with `verbatimModuleSyntax`, `import { type X }` keeps a module edge in dev and build, the same as tsc.
- **Text:** `scratchpad/type-imports-lit/B/text/oxc-transformer-typescript-docs.txt`, `scratchpad/type-imports-lit/B/src/oxc-transformer-typescript-docs-a365c81e.md`, `scratchpad/type-imports-lit/B/src/oxc-crates_v0.159.0-transformer-typescript-annotations.rs`, `scratchpad/type-imports-lit/B/src/oxc-crates_v0.159.0-transformer-typescript-options.rs`, `scratchpad/type-imports-lit/B/src/oxc-crates_v0.159.0-transform-conformance-babel.snap.md`, `scratchpad/type-imports-lit/B/src/babel-v8.1.2-fixture-type-only-export-specifier-2-input.ts`, `scratchpad/type-imports-lit/B/src/rolldown-v1.3.2-tsconfig_merge.rs`, `scratchpad/type-imports-lit/B/src/rolldown-pr-8169.json`, `scratchpad/type-imports-lit/B/src/vite-v8.3.8-plugins-oxc.ts`, `scratchpad/type-imports-lit/B/check/rolldown-tsconfig/out.txt`

### 3.10 Deno defaults `verbatimModuleSyntax` to off, ignored it at emit until 2.8.2 (June 2026), and still forces it off for `deno compile`. VERIFIED (source at v2.9.8, PRs, release notes, docs); Vendor (Deno Land)

- **Citation:** denoland/deno `libs/resolver/deno_json.rs` and `cli/schemas/config-file.v1.json` at `v2.9.8` (21 Oct 2026); spec tests `tests/specs/run/verbatim_module_syntax*`; issue #26678 (1 Nov 2024); PR #34495, "fix(config): hook up verbatimModuleSyntax for the emit pipeline" (divybot, merged 30 May 2026; in v2.8.2, 3 Jun 2026); PR #35288 (bartlomieju, merged 18 Jun 2026); denoland/docs `lint/rules/verbatim-module-syntax.md` and `runtime/reference/ts_config_migration.md` at `eff351ba`.
- **What it says:**
  - The lead was wrong: the config schema gives `verbatimModuleSyntax` `"default": false`, and the docs' default-options table doesn't list it.
  - Issue #26678: "It's not hooked up properly." PR #34495: the option was forwarded to tsc for checking, but "value imports used only as types were elided at emit time" "even when the user opted into" it; the new field is "(defaulted to `false` for compatibility)". With it on, swc's pass treats `import type` as the only thing to strip. The spec test: an import whose binding is used only as a type prints `dep loaded` with the option on and not with it off.
  - PR #35288 adds `DENO_DISABLE_VERBATIM_MODULE_SYNTAX`: a type-only import re-exported without `type` "is left as a dangling value export and crashes at runtime" (7.14); falling back to heuristic elision "matches the `deno compile` runtime, which forces verbatim off too." "Defaults off, so the stock behavior is unchanged."
  - Deno lint ships `verbatim-module-syntax` (tag `jsr`): "Enforces type imports to be declared as type imports." "This is useful in libraries distributing TypeScript" "code in order to work in more scenarios." (section 6)
- **Caveat:** Deno isn't installed here; behaviour is from source, tests and PRs. Which release first had #35288 wasn't checked. Both PR authors are bot accounts.
- **For the post:** until June 2026 Deno type-checked with `verbatimModuleSyntax` but emitted as if it were off, so the same project behaved differently under `tsc` and `deno run`.
- **Text:** `scratchpad/type-imports-lit/B/src/deno-v2.9.8-libs_resolver_deno_json.rs`, `scratchpad/type-imports-lit/B/src/deno-v2.9.8-cli_schemas_config-file.v1.json`, `scratchpad/type-imports-lit/B/src/deno-tests`, `scratchpad/type-imports-lit/B/src/deno-issue-26678.json`, `scratchpad/type-imports-lit/B/src/deno-pr-34495.json`, `scratchpad/type-imports-lit/B/src/deno-pr-35288.json`, `scratchpad/type-imports-lit/B/src/deno-release-v2.8.2.json`, `scratchpad/type-imports-lit/B/src/deno-docs-lint-verbatim-module-syntax-eff351baff03c2133a70bf89982fe83bec5641f1.md`, `scratchpad/type-imports-lit/B/src/deno-docs-runtime_reference_ts_config_migration.md`

### 3.11 Bun recommends `verbatimModuleSyntax` for type-checking, but its transpiler doesn't read it and always trims unused imports in TypeScript. VERIFIED (docs and source at bun-v1.4.4, issues); My check; Vendor (Oven)

- **Citation:** oven-sh/bun at `bun-v1.4.4` (22 Oct 2026): `docs/runtime/typescript.mdx`, `docs/runtime/check.mdx`, `docs/runtime/transpiler.mdx`, `src/js_parser/scan/scan_imports.rs`, `src/bundler/transpiler.rs`, `src/resolver/tsconfig_json.rs`; issue #12744, "stricter bundler support for `verbatimModuleSyntax`" (23 Jul 2024, open).
- **What it says:**
  - Docs: "We recommend the following `compilerOptions` for a Bun project", including `verbatimModuleSyntax: true`, which `bun init` writes and `bun check` uses when there's no tsconfig.
  - The parser (a port of esbuild's, with esbuild's comments): "TypeScript always trims unused imports."; a TypeScript import whose bindings are all unused is dropped unless `preserve_unused_imports_ts`. The runtime path in `transpiler.rs` sets `preserve_unused_imports_ts: false` and `trim_unused_imports` to `loader.is_typescript()` by default. A comment signed by Jarred: "jarred: I think, in this project, we want this behavior, even in JavaScript." and "Side-effect imports are nearly always done through identifier-less imports".
  - `tsconfig_json.rs` reads `importsNotUsedAsValues` but has no `verbatimModuleSyntax` or `preserveValueImports` key (it reads `baseUrl`, `paths`, `jsx*`, decorators, `useDefineForClassFields`, `moduleSuffixes`, `extends`). The `Bun.Transpiler` API's `trimUnusedImports` defaults to false (`docs/runtime/transpiler.mdx`).
  - Issue #12744 asks that `bun build` honour the option; still open after 28 months.
  - **My check** (3.7): with `verbatimModuleSyntax: true`, `bun` and `bun build --no-bundle` still drop `import { User }` and `import { type User }` entirely.
- **Caveat:** I didn't run `bun build --compile` or trace its parse path; it goes through the same bundler, but that's unverified. Code search on main finds `verbatimModuleSyntax` only in `src/sema` and `src/lint` (Bun's checker and linter), not the transpiler.
- **For the post:** Bun is the one runtime where `import { type x }` never leaves a module request, whatever the tsconfig says. The cost is the reverse: an unused import kept for side effects is dropped in `.ts`.
- **Text:** `scratchpad/type-imports-lit/B/src/bun-v1.4.4-docs_runtime_typescript.mdx`, `scratchpad/type-imports-lit/B/src/bun-v1.4.4-docs_runtime_check.mdx`, `scratchpad/type-imports-lit/B/src/bun-v1.4.4-docs_runtime_transpiler.mdx`, `scratchpad/type-imports-lit/B/src/bun-v1.4.4-src_js_parser_scan_scan_imports.rs`, `scratchpad/type-imports-lit/B/src/bun-v1.4.4-src_bundler_transpiler.rs`, `scratchpad/type-imports-lit/B/src/bun-v1.4.4-src_resolver_tsconfig_json.rs`, `scratchpad/type-imports-lit/B/src/bun-issue-12744.json`, `scratchpad/type-imports-lit/B/check/bun-verbatim/bun-verbatim-out.txt`

### 3.12 Sucrase calls its switch `keepUnusedImports` (3.33.0, July 2023). VERIFIED (README and changelog at a pinned commit)

- **Citation:** alangpierce/sucrase `README.md` and `CHANGELOG.md` at `280ee202` (19 Nov 2025), https://github.com/alangpierce/sucrase/blob/280ee202e73b18e396069782bd41e1eaaccbf620/README.md
- **What it says:** Sucrase "transforms each file independently, so you should enable the `isolatedModules`" flag; "The Sucrase option `keepUnusedImports`" "can be used to disable all automatic removal of imports and exports," "analogous to TS" `verbatimModuleSyntax`. 3.33.0 (14 Jul 2023) added it, "equivalent to the TypeScript option `verbatimModuleSyntax`".
- **Caveat:** how it treats `import { type x }` wasn't checked.
- **For the post:** a fourth name for the same switch; only worth a footnote.
- **Text:** `scratchpad/type-imports-lit/B/src/sucrase-README-280ee202e7.md`, `scratchpad/type-imports-lit/B/src/sucrase-CHANGELOG-280ee202e7.md`

### 3.13 Compile-to-JavaScript languages need the opposite: a value import used only in markup looks unused to a per-file transpiler. VERIFIED (esbuild changelog, Svelte docs, Bun source comment)

- **Citation:** esbuild 0.8.28 and 0.14.0 changelog entries (3.2); sveltejs/svelte `documentation/docs/07-misc/03-typescript.md` at `f4918d86` (20 Aug 2026).
- **What it says:**
  - esbuild 0.8.28: the Svelte plugin passes only the `<script>` block, so `import Counter from './Counter.svelte'` used as `<Counter />` "appears to be unused and is removed." esbuild kept unused imports when `importsNotUsedAsValues` was set, not bundling and not minifying. 0.14.0 moved that hack to `preserveValueImports`; 0.14.40 says the setting "is useful for programming environments that strip TypeScript types" with Svelte and Vue as examples. Bun's parser carries esbuild's source comment on the same Svelte case (3.11).
  - Svelte's docs today: set `verbatimModuleSyntax` "to `true` so that imports are left as-is", and `isolatedModules`, because the Svelte compiler and Vite don't do cross-file analysis.
- **For the post:** elision fails in both directions. It can drop a value a template needs, and it can keep a type a runtime can't find. `verbatimModuleSyntax` fixes the first by making the author mark the second.
- **Text:** `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2020-v0.28.2.md`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2021-v0.28.2.md`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2022-v0.28.2.md`, `scratchpad/type-imports-lit/B/src/svelte-docs-typescript-f4918d86f3.md`, `scratchpad/type-imports-lit/B/src/bun-v1.4.4-src_js_parser_scan_scan_imports.rs`

### 3.14 The TC39 type annotations proposal treats `import type` as a comment but keeps `import { type x }` as a real import; it has sat at Stage 1 since 2022. VERIFIED (README at a pinned commit, tc39/proposals)

- **Citation:** Gil Tayar, Daniel Rosenwasser, Romulo Cintra and Rob Palmer, "ECMAScript proposal: Type Annotations", https://github.com/tc39/proposal-type-annotations/blob/269e08b401bdb90033e1a7a82e9a13beceae404c/README.md (last commit 27 Aug 2025); tc39/proposals `stage-1-proposals.md` at `c688b97e` (14 Oct 2026).
- **What it says:**
  - The README opens: "This document has not been updated regularly." and points to meeting notes from March 2022 and March and September 2023. "**Stage:** 1". The stage-1 list still has it, with notes links up to 2023-09.
  - "These `type`-specified declarations act as comments as well." "They would not trigger any resolution or inclusion of modules." and named bindings are not validated.
  - On inline specifiers: "such imports are retained even if all bindings are declared type-only." with the example comment "This still imports './parser' at runtime."
- **For the post:** if JavaScript ever gets types natively, the proposal keeps today's split: `import type` vanishes, `import { type x }` loads the module. The same semantics as `verbatimModuleSyntax` and Node.
- **Text:** `scratchpad/type-imports-lit/B/text/tc39-proposal-type-annotations-README.txt`, `scratchpad/type-imports-lit/B/src/tc39-proposal-type-annotations-README-269e08b401.md`, `scratchpad/type-imports-lit/B/src/tc39-proposals-stage-1-c688b97e05.md`

### 3.15 Summary: what each tool emits for the three import forms. VERIFIED (sources in 3.1–3.14); My checks where marked

Baseline from TypeScript's tsconfig reference (`TypeScript-Website` `70bf4925`): with `verbatimModuleSyntax`, "any imports or exports without a `type` modifier are left around." and "Anything that uses the `type` modifier is dropped entirely."; `import { b, type c, type d } from "bcd"` is rewritten to `import { b } from "bcd"`, and `import { type xyz } from "xyz"` is "Rewritten to 'import {} from 'xyz';'". Without it, default elision drops imports used only as types (sections 1 and 2 cover tsc in full). The page also notes the dropped import "makes a difference for modules that have side-effects or not."

| Tool (version read) | `import type { x } from "y"` | `import { type x } from "y"` by default | …with the keep-imports option | `import { type x, y }` | Option, and source |
| --- | --- | --- | --- | --- | --- |
| tsc (sections 1 and 2) | erased | removed | `import {} from "y"` | `import { y }` (default: only if `y` is used as a value) | `verbatimModuleSyntax` |
| esbuild 0.28 | removed | removed (my check) | `import {} from "y"` (my check); `preserveValueImports` alone: removed (0.14.40) | type dropped; `y` kept if used, always with the option | tsconfig `verbatimModuleSyntax` since 0.18.0 (3.2) |
| swc 1.16.22, transform | removed | removed (kept as `import "y"`-style only with `importsNotUsedAsValues: preserve`) | specifier removed, statement kept | `y` kept if used, always with the option | `jsc.transform.verbatimModuleSyntax` since Sept 2023 (3.3) |
| Node type stripping (Amaro, swc fast strip) | blanked | **specifier blanked, statement kept, module loaded** (my check) | no option; tsconfig ignored | `y` always kept | none (3.4–3.6) |
| Babel 8.1.2 | removed | removed | `import "y"` (since 7.20.13; removed before) | `y` kept if referenced as a value, always with the option | `onlyRemoveTypeImports`, default false until Babel 9 (3.1) |
| Oxc transformer | removed | removed | `import 'y'` | `y` kept if value-referenced, always with the option | `typescript.onlyRemoveTypeImports` (3.9) |
| Rolldown 1.3 / Vite 8 | removed | removed | `import 'y'` (my check, Rolldown 1.2.13) | as Oxc | set from tsconfig `verbatimModuleSyntax`; deprecated pair inverted (7.17) |
| Bun 1.4.4 runtime and `bun build` | removed | removed | **still removed**: tsconfig option not read (my check) | type dropped; `y` kept if used | none for TS files (3.11); `--compile` not checked |
| Deno 2.9.8 (`deno run`) | removed | removed | kept (swc verbatim pass), since 2.8.2 | as swc | `compilerOptions.verbatimModuleSyntax`, default false; forced off in `deno compile` (3.10) |
| ts-rust (`tsc-rs`, at `91f3d021`) | erased | removed | `import {} from "y"` | as tsc | `verbatimModuleSyntax`; a port of TypeScript 7 (3.16) |
| scriptc 0.4.14 (native code, no JavaScript) | erased, module not loaded | removed, as tsc, when the tsconfig doesn't set `verbatimModuleSyntax` | module loaded (Node's rule), also with no tsconfig | module loaded | tsconfig `verbatimModuleSyntax` (3.17) |
| Sucrase | not checked | not checked | not checked | not checked | `keepUnusedImports` (3.12) |
| TC39 proposal (Stage 1) | comment, no module load | module imported | n/a | n/a | n/a (3.14) |

- **For the post:** Hayden's reason for `prefer-top-level` still holds wherever the keep-imports switch is on (tsc, esbuild, swc, Babel, Oxc, Vite 8, Deno) and always in Node: `import { type x }` leaves a module request, and `import type` doesn't. It doesn't hold in default modes, where both vanish, or in Bun, which drops both regardless. `import type` is the only form every tool erases. The two newest compilers on Hayden's list fit the same pattern: ts-rust behaves as TypeScript 7 (3.16), and scriptc follows Node whenever `verbatimModuleSyntax` is on or there's no tsconfig (3.17).
- **Text:** `scratchpad/type-imports-lit/B/src/ts-website-tsconfig-verbatimModuleSyntax-70bf492500.md`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2022-v0.28.2.md`, `scratchpad/type-imports-lit/B/check/esbuild/esbuild-out.txt`, `scratchpad/type-imports-lit/B/check/node-strip/node-out.txt`, `scratchpad/type-imports-lit/B/check/bun-verbatim/bun-verbatim-out.txt`, `scratchpad/type-imports-lit/B/check/rolldown-tsconfig/out.txt`

### 3.16 ts-rust (`tsc-rs`): Ping's port of TypeScript 7 to Rust erases inline `type` specifiers exactly as TypeScript 7 does, keeping `import {}` only under `verbatimModuleSyntax`. VERIFIED (source and README at a pinned commit); Vendor (Ping)

- **Citation:** Ping.gg, _ts-rust (aka tsc-rs)_, github.com/pingdotgg/ts-rust, MIT, at `91f3d021` (28 Oct 2026). Repository created 7 Oct 2026; first commit 22 Jun 2026 ("bootstrap Rust TypeScript compiler foundations", Theo Browne); releases v0.4.0 (12 Oct 2026) to v0.8.0 (21 Oct 2026). The commit history is almost entirely Theo Browne's (`t3dotgg`, 8,721 of the listed contributions; the public GitHub profile gives "CEO @ Ping.gg"). Files: `README.md`, `crates/ts_goport/src/transformers/tstransforms/import_elision.rs` and `type_eraser.rs`. https://github.com/pingdotgg/ts-rust/blob/91f3d021c4f1f102cebee704ac285e85ae0c8ff5/crates/ts_goport/src/transformers/tstransforms/type_eraser.rs
- **What it is:** the README calls it "a direct port of Microsoft's native TypeScript compiler, which is written in Go" and says it "keeps Go's algorithms and behavior". It was written by models: "I wanted to see if LLMs could port the TypeScript compiler," and "Also worth mentioning: I've never read a line of this code." The port is pinned to microsoft/TypeScript `3e9236361fa9` (`typescript@7.1.0-beta`); its conformance table claims emit for "13,654 of 13,654" compiler-corpus configurations matches Go "byte for byte".
- **What it does with type-only imports** (each Rust file says which Go file it ports, `typeeraser.go` and `importelision.go`):
  - `import type { x } from "y"`: the type eraser's `ImportClause` branch returns nothing for a type-only clause ("// Always elide type-only imports"), so the declaration is dropped under every setting.
  - `import { type x } from "y"` (every specifier inline-type): each type-only `ImportSpecifier` is removed ("// elide type-only or unused imports"). For the emptied `NamedImports`, the code drops the declaration only when `verbatim_module_syntax` is not true ("// all import specifiers were elided"); with `verbatimModuleSyntax` it keeps the empty `{}`, so the output is `import {} from "y"`. A source-written `import {} from "y"` is kept either way ("// Do not elide a side-effect only import declaration.").
  - Mixed `import { type x, y }`: the type specifier goes and `y` stays; without `verbatimModuleSyntax`, the separate import-elision transformer can still drop `y` if it is never used as a value. `import D, { type x }`: the emptied braces are removed and the default import kept ("// the default binding keeps the import;").
  - The import-elision transformer refuses to run with the flag on: "ImportElisionTransformer should not be used with VerbatimModuleSyntax".
- **Caveat:** read from source, not run (the brief forbids running it). It is an experiment by its own account ("This is an early release."; "Be warned, I have no idea if this will actually work."). Its README benchmarks are type-check times (`--noEmit`), not emit. Ultracite PR #858 (closed unmerged, 29 Oct 2026) proposed a different Rust port, `tsrs` (`tsrs 0.20.1-ts7.1.0-beta`), for the repo's own type checks; that is not this project.
- **For the post:** "ts-rust" behaves like TypeScript 7 by design. An inline-only import leaves `import {} from "y"` only when `verbatimModuleSyntax` is on; `import type` vanishes always.
- **Text:** `scratchpad/type-imports-lit/main/src/compilers/ts-rust-README.md`, `scratchpad/type-imports-lit/main/src/compilers/ts-rust-type_eraser.rs`, `scratchpad/type-imports-lit/main/src/compilers/ts-rust-import_elision.rs`, `scratchpad/type-imports-lit/main/src/compilers/pingdotgg_ts-rust-repo.json`, `scratchpad/type-imports-lit/main/src/compilers/ts-rust-first-commit.json`, `scratchpad/type-imports-lit/main/src/compilers/ts-rust-releases.json`, `scratchpad/type-imports-lit/main/src/compilers/ts-rust-contributors.json`, `scratchpad/type-imports-lit/main/src/compilers/user-t3dotgg.json`, `scratchpad/type-imports-lit/main/src/gh/pr-858.json`

### 3.17 scriptc: Vercel's TypeScript-to-native compiler follows Node's type stripping, so `import { type x }` still loads its module unless the tsconfig leaves `verbatimModuleSyntax` off. VERIFIED (docs and source at a pinned commit); Vendor (Vercel)

- **Citation:** Vercel Labs, _scriptc_, github.com/vercel-labs/scriptc, Apache-2.0, at `0febca3e` (18 Nov 2026). Repository created 22 Jul 2026; first commit "init" by Chris Tate (22 Jul 2026); latest release v0.4.14 (15 Nov 2026). Most commits are Chris Tate's (`ctate`, profile company "Vercel") and Malte Ubl's (`cramforce`). Files: `README.md`, `docs/content/docs/dependencies.mdx` ("Package resolution"), `docs/content/docs/how-it-works.mdx`, `packages/compiler/src/frontend/type-only-imports.ts`, `packages/compiler/src/diagnostics/codes.ts`, the test `tests/corpus/6120-type-only-import-graph/`, and `packages/compiler/package.json`. https://github.com/vercel-labs/scriptc/blob/0febca3eef031a6b2c64d5ce4cde3439cd6849e9/docs/content/docs/dependencies.mdx
- **What it is:** "scriptc compiles TypeScript and JavaScript to native executables and WebAssembly." It type-checks with TypeScript 7 (`"typescript": "7.1.0-beta"` in the compiler's dependencies) and generates machine code; it emits no JavaScript.
- **What it does with type-only imports** (the docs):
  - "Type-only imports follow Node.js's type stripping." "`import type` and `export type … from` statements are erased," so a module named only by them "isn't compiled or loaded".
  - "A clause whose specifiers are all marked `type`," as in `import { type Options } from "./config.ts"`, "still loads its module, as it does under Node.js."
  - Unless the project uses tsc's elision: "A project that tsc compiles follows tsc instead." When the nearest tsconfig doesn't set `verbatimModuleSyntax`, scriptc drops "a clause of `type` specifiers only" along with the other imports tsc drops, and such a module "doesn't run and doesn't take part in an import cycle." With `verbatimModuleSyntax: true` or no tsconfig, "the type-stripping rule applies;" and a plain import of a type then fails at start, with warning `SC6201` ("start-up failure that Node reports for the same program").
- **Source:** `type-only-imports.ts` opens "Type-only module edges under Node's type stripping." `typeOnlyNamedImport` describes `import { type A, type B } from "./m"` as "a real module edge that binds nothing at runtime, exactly like a side-effect import." The corpus test `6120-type-only-import-graph` (tsconfig `"verbatimModuleSyntax": true`) states: "An inline `type` specifier keeps an empty" "import clause and still evaluates its module, as does a mixed clause."
- **Caveat:** read from docs and source, not run. The test expectations come from Node's own output (the dual-run harness compares the binary with Node), so the expected behaviour is, by construction, Node's. Experimental by its own account.
- **For the post:** the newest compiler on Hayden's list makes the side-effect point explicit: under Node-style stripping, an all-inline `type` import is a module edge, and `import type` is not one.
- **Text:** `scratchpad/type-imports-lit/main/src/compilers/scriptc-README.md`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-docs/dependencies.mdx`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-docs/how-it-works.mdx`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-type-only-imports.ts`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-diagnostics-codes.ts`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-6120`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-compiler-package.json`, `scratchpad/type-imports-lit/main/src/compilers/vercel-labs_scriptc-repo.json`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-first-commit.json`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-releases.json`, `scratchpad/type-imports-lit/main/src/compilers/scriptc-contributors.json`, `scratchpad/type-imports-lit/main/src/compilers/user-ctate.json`, `scratchpad/type-imports-lit/main/src/compilers/user-cramforce.json`

## 4. Decorators and metadata

### 4.1 Ultracite's 14 Nov 2026 change says the fix breaks injection because `emitDecoratorMetadata` records `Function`. VERIFIED (commit opened)

- **Citation:** Hayden Bleasel, "Stop the nestjs and angular presets turning injected classes into type imports", commit `e8c2207d`, 14 Nov 2026, Ultracite repository.
- **What it says:**
  - The commit message: the class "no longer exists at runtime, emitDecoratorMetadata emits Function for the parameter", and "the container cannot resolve it."
  - It says "Oxlint and Biome do this always;" and "typescript-eslint only holds back when it has type information" "to read emitDecoratorMetadata from."
  - The changeset: "The code still compiled, but the class was gone at runtime". It applies the same explanation to NestJS and Angular.
  - The Oxlint `angular` preset comment repeats that `emitDecoratorMetadata` "records it as the parameter's type".
- **Caveat:** The NestJS half of this holds up (4.3–4.5, 4.9, 4.10). The Angular half does not: Angular doesn't use `emitDecoratorMetadata`, and the same fix fails Angular's build rather than its runtime (4.13, 4.14). `Function` is what `tsc` records; single-file transpilers record `Object` (4.5). typescript-eslint also holds back without type information when `parserOptions` set both flags (7.24, and my run in 7.24).
- **For the post:** Use it as the starting point, and correct the Angular half and the "type information" clause before quoting the changeset.
- **Text:** `scratchpad/type-imports-lit/C/src/ultracite/commit-e8c2207d.diff`

### 4.2 TypeScript's own docs document `design:type` only, and call the feature experimental. VERIFIED (handbook and tsconfig reference source)

- **Citation:** TypeScript-Website, `packages/documentation/copy/en/reference/Decorators.md` and `packages/tsconfig-reference/copy/en/options/emitDecoratorMetadata.md` / `experimentalDecorators.md`, commit `24166845`. https://www.typescriptlang.org/docs/handbook/decorators.html#metadata, https://www.typescriptlang.org/tsconfig/#emitDecoratorMetadata
- **What it says:**
  - The handbook opens: "This document refers to an experimental stage 2 decorators implementation."
  - Metadata section: with the option on and reflect-metadata imported, "additional design-time type information will be exposed at runtime." Its only worked example reads `design:type`; the page never mentions `design:paramtypes` or `design:returntype` (0 occurrences).
  - It ends: "Decorator metadata is an experimental feature and may introduce breaking changes in future releases."
  - The tsconfig one-liner: "Emit design-type metadata for decorated declarations in source files." `experimentalDecorators`: "Enable experimental support for TC39 stage 2 draft decorators."
- **Caveat:** Nothing in the docs says what is emitted for a type-only import, an interface or a union. That lives only in the compiler source (4.3) and in PRs (4.6).
- **For the post:** The rules for what lands in `design:paramtypes` are undocumented; say so, and cite the source.
- **Text:** `scratchpad/type-imports-lit/C/text/tsweb/Decorators.md`, `scratchpad/type-imports-lit/C/text/tsweb/emitDecoratorMetadata.md`, `scratchpad/type-imports-lit/C/text/tsweb/experimentalDecorators.md`

### 4.3 In the compiler, a class reached through a type-only import serializes as `Function`, an interface or alias as `Object`, and a value import keeps itself alive. VERIFIED (TypeScript v6.0.3 source)

- **Citation:** microsoft/TypeScript `src/compiler/checker.ts` (`getTypeReferenceSerializationKind`, `markEntityNameOrEntityExpressionAsReference`), `src/compiler/transformers/typeSerializer.ts` (`serializeTypeReferenceNode`, `serializeUnionOrIntersectionConstituents`) and `src/compiler/types.ts` (`TypeReferenceSerializationKind`), tag `v6.0.3`. https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/checker.ts
- **What it says:**
  - The checker resolves the name as a value "to ensure the type can be reached at runtime during emit." If it resolves to a class, it returns `isTypeOnly ? TypeReferenceSerializationKind.TypeWithCallSignature` and otherwise `TypeWithConstructSignatureAndValue`.
  - The serializer turns `TypeWithCallSignature` into `factory.createIdentifier("Function")` and `TypeWithConstructSignatureAndValue` into a reference to the class. The enum comment for the first: "resolves to a Function type or a type with call signatures."
  - A name with no value (interface, type alias of a class) falls through to `ObjectType`, which emits `Object`. An unresolvable name (`Unknown`) emits a runtime guard that falls back to `Object`.
  - Unions: with `strictNullChecks` off, the serializer will "Elide null and undefined from unions for metadata"; any other mismatch "will just default to Object".
  - The import of a class named only in a decorated signature is not elided: `markEntityNameOrEntityExpressionAsReference` calls `markAliasSymbolAsReferenced`, and the next function's comment says this is done "to prevent import elision."
- **Caveat:** Source reading; checked by running in 4.4. The `isTypeOnly ? ... TypeWithCallSignature` branch is why it is `Function` and not `Object`: the compiler can see the class through the type-only alias, knows it is constructible, and records the nearest runtime value it can name.
- **For the post:** This is the mechanism: a lint rule sees only a type position, but `tsc` treats that type position as a value use when the class has a decorator and the option is on.
- **Text:** `scratchpad/type-imports-lit/C/src/ts/v6.0.3-checker.ts`, `scratchpad/type-imports-lit/C/src/ts/v6.0.3-typeSerializer.ts`, `scratchpad/type-imports-lit/C/src/ts/v6.0.3-types.ts`

### 4.4 My check (local run): with `tsc` 6.0.3, `import type` and `import { type X }` both record `Function`, and a container built on the metadata can't construct the class

- **Citation:** My check (local run), `scratchpad/type-imports-lit/C/check/decorator-metadata/`, TypeScript 6.0.3, Node 24.14.1, reflect-metadata 0.2.2 from the worktree store.
- **What it says:**
  - Nine decorated classes, each taking one constructor parameter, compiled with `experimentalDecorators` and `emitDecoratorMetadata` under six configurations (CommonJS: plain, `isolatedModules`, non-strict; ESM `nodenext`: plain, `isolatedModules`, `verbatimModuleSyntax`). What lands in `design:paramtypes` was the same in all six configurations (tsc still emits when it reports errors), except for the union:
    - (a) class, value import: `[dep_1.Dep]` (CJS) or `[Dep]` (ESM), and the import is kept.
    - (b) `import type { Dep }` and (c) `import { type Dep }`: `[Function]`, no import emitted.
    - (d) interface, value or type import: `[Object]`.
    - (e) `import * as m` with `m.Dep`: `[m.Dep]`; `import type * as m`: `[Function]`.
    - `Dep | undefined`: `[Object]` with `strict`, `[Dep]` without it. A type alias of the class (`type DepAlias = Dep`): `[Object]`.
  - Errors: only the ESM `isolatedModules` run reported TS1272, for the interface and the alias (4.7). Under `verbatimModuleSyntax` the interface and alias gave TS1484; (b) and (c) compiled with no error and still emitted `Function`.
  - At runtime, a 20-line container that resolves each `design:paramtypes` entry recursively built (a) and (e) and printed "hi"; for (b), (c) and `import type * as m` it failed with "no provider for token 'Function'", and for (d), the union and the alias with "no provider for token 'Object'". Under `verbatimModuleSyntax`, the interface case failed earlier: "does not provide an export named 'IDep'".
- **Caveat:** A toy container, not NestJS; NestJS isn't installed. Small hand-written files, not a rate.
- **For the post:** The changeset's `Function` is correct for a `tsc` build. `verbatimModuleSyntax` does not catch it: TypeScript accepts `import type` for an injected class under every option tested.
- **Text:** `scratchpad/type-imports-lit/C/check/decorator-metadata/paramtypes-table.txt`, `scratchpad/type-imports-lit/C/check/decorator-metadata/run-output.txt`, `scratchpad/type-imports-lit/C/check/decorator-metadata/out-cjs-verbatim.txt`, `scratchpad/type-imports-lit/C/check/decorator-metadata/versions.txt`

### 4.5 My check (local run) and SWC source: single-file transpilers record `Object`, not `Function`, for the same import

- **Citation:** My check (local run), `ts.transpileModule` from TypeScript 6.0.3, `scratchpad/type-imports-lit/C/check/decorator-metadata/transpile-module/`; SWC `crates/swc_ecma_transforms_proposal/src/decorators/legacy/metadata.rs`, tag `v1.16.22`. https://github.com/swc-project/swc/blob/v1.16.22/crates/swc_ecma_transforms_proposal/src/decorators/legacy/metadata.rs
- **What it says:**
  - `transpileModule` on the same files: (b) and (c) gave `__metadata("design:paramtypes", [Object])`; a value import gave a runtime guard, `typeof (_a = typeof dep_1.Dep !== "undefined" && dep_1.Dep) === "function" ? _a : Object`, and kept the `require`.
  - SWC's serializer doesn't know types either. Its comment: "We don't know if type is just a type (interface, etc.)" "or a concrete value"; it wraps every reference in a `typeof ... === "undefined"` test whose "fallback is just `Object`."
  - The same split shows up in reports: mhegazy explained in 2017 that "in single-fle-transpile mode (i.e `transpileModule`)" "the compiler has no way to know" "if the name is an interface or not."
- **Caveat:** SWC wasn't run (not installed); that SWC emits `Object` for a stripped type-only import follows from the guard and the stripped binding, and matches the `Object` in the Nest report in 7.31, but isn't measured here.
- **For the post:** What the container sees depends on the compiler: `Function` under `tsc` (Nest's default builder), `Object` under SWC, ts-jest's isolated mode or other per-file tools. Both are wrong.
- **Text:** `scratchpad/type-imports-lit/C/check/decorator-metadata/transpile-module/out.txt`, `scratchpad/type-imports-lit/C/src/swc/v1.16.22-metadata.rs`, `scratchpad/type-imports-lit/C/src/gh/ts-issue-18008-comments.json`

### 4.6 `Function` dates from TypeScript 4.0; before that, a type-only import in a decorated signature crashed at runtime, and the team chose a silent fallback over an error. VERIFIED (issues, PRs, tag comparisons)

- **Citation:** microsoft/TypeScript issue #37672, "emitDecoratorMetadata causes runtime errors by referencing type-only imports", 29 Mar 2020, and PR #39337, "Emit fallback for decorator metadata for type only imports", merged 2 Jul 2020; issue #42624 (namespaces), 3 Feb 2021, and PR #44915, merged 2 Aug 2021; issue #52061, "Constructor parameters exported as type included in emitted metadata", 31 Dec 2022, and PR #52138, merged 14 Feb 2023. https://github.com/microsoft/TypeScript/issues/37672, https://github.com/microsoft/TypeScript/pull/39337, https://github.com/microsoft/TypeScript/issues/42624, https://github.com/microsoft/TypeScript/issues/52061
- **What it says:**
  - #37672 (on 3.9.0-dev, ANECDOTAL as a report): `import type { Driver }` in a decorated constructor emitted `[Driver, Object]`, so "the value side of `Driver` is referenced at runtime, although the import is type-only."
  - PR #39337: "This fixes our emit for decorator metadata" "when the referenced type comes from a type-only import." Its baseline shows `__metadata("design:paramtypes", [Function])`. The merge is in `v4.0.2` and not in `v3.9.7` (compare API).
  - #42624: the same crash through a namespace. RyanCavanaugh: "I could be convinced that this should be a compile-time error" "rather than emitting Object." andrewbranch: "It seems like it should be an error to me." rbuckton argued for treating a type-only import "the same way we do an interface or type alias and just emit `Object`." andrewbranch's point against that: "the discoverability of that mistake seems super low." The fix (#44915) is in `v4.4.2`.
  - #52061: a class re-exported with `export type` and imported normally still emitted `[Foo]` ("Foo not available during runtime"); fixed by #52138, in `v5.0.2`, not `v4.9.5`.
  - None of the 3.8, 4.0, 4.4 or 4.7 release notes mentions decorators (0 matches each).
- **Caveat:** Release placement is from `gh api repos/microsoft/TypeScript/compare/<tag>...<merge sha>`.
- **For the post:** The silence is a design decision: TypeScript considered an error in 2021 and kept a fallback, so the mistake compiles and surfaces only when a container reads the metadata.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/ts-issue-37672.json`, `scratchpad/type-imports-lit/C/src/gh/ts-pr-39337.json`, `scratchpad/type-imports-lit/C/src/gh/ts-pr-39337-files-full.json`, `scratchpad/type-imports-lit/C/src/gh/ts-issue-42624-comments.json`, `scratchpad/type-imports-lit/C/src/gh/ts-issue-52061.json`, `scratchpad/type-imports-lit/C/src/gh/ts-pr-release-containment.txt`, `scratchpad/type-imports-lit/C/text/tsweb/TypeScript-4.0.md`

### 4.7 TS1272 forces `import type` for interfaces in decorated signatures, but only for ES module output, and it never applies to classes. VERIFIED (diagnostic text, checker source, PR, local run)

- **Citation:** microsoft/TypeScript issue #42281, "Missing --isolatedModules error for type referenced by decorator metadata", 11 Jan 2021; PR #42915, "Add isolatedModules error for ambiguous imports referenced in decorator metadata", merged 17 Mar 2022 (in `v4.7.2`, not in `v4.6.4`); `src/compiler/diagnosticMessages.json` and `checker.ts` at `v6.0.3`. https://github.com/microsoft/TypeScript/pull/42915
- **What it says:**
  - Exact text at v6.0.3 (code 1272), in consecutive segments: "A type referenced in a decorated signature must be imported" "with 'import type' or a namespace import when 'isolatedModules'" "and 'emitDecoratorMetadata' are enabled."
  - The check runs only when `getIsolatedModules(compilerOptions)` and `getEmitModuleKind(compilerOptions) >= ModuleKind.ES2015`, and only for a name with no value (`!symbolIsValue(rootSymbol)`): interfaces and type aliases, never classes.
  - andrewbranch on the PR: "Teeeechnically maybe a breaking change since there’s a new error".
  - My check: under CommonJS with `isolatedModules`, no TS1272 at all; under ESM, TS1272 for the interface and the alias only (4.4).
- **Caveat:** The lead's wording was right; the lead that it dates from 5.0 was not (4.7).
- **For the post:** In an ESM NestJS project TypeScript pushes `import type` for interfaces in decorated signatures, which is the same edit the lint rule makes for classes. That pairing is why a syntactic rule can't tell the two apart.
- **Text:** `scratchpad/type-imports-lit/C/src/ts/v6.0.3-diagnosticMessages.json`, `scratchpad/type-imports-lit/C/src/ts/v6.0.3-checker.ts`, `scratchpad/type-imports-lit/C/src/gh/ts-pr-42915.json`, `scratchpad/type-imports-lit/C/src/gh/ts-issue-42281.json`, `scratchpad/type-imports-lit/C/check/decorator-metadata/esm/out-esm-isolated.txt`, `scratchpad/type-imports-lit/C/check/decorator-metadata/out-cjs-isolated.txt`

### 4.8 Standard (TC39) decorators can't emit type metadata at all, and their metadata object records no types. VERIFIED (release notes, proposal, local run)

- **Citation:** TypeScript 5.0 and 5.2 release notes (TypeScript-Website `24166845`); TC39 proposal-decorator-metadata README, commit `c8d3d362`. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators, https://github.com/tc39/proposal-decorator-metadata
- **What it says:**
  - 5.0: "This new decorators proposal is not compatible with `--emitDecoratorMetadata`," "and it does not allow decorating parameters."
  - 5.2: decorators get a `metadata` property that "just holds a simple object", reachable after decoration "via `Symbol.metadata`."
  - The proposal: "The new `metadata` property is a plain JavaScript object." Decorators write to it; nothing in the proposal records parameter or property types.
  - typescript-eslint's rule source says the same of the 5.2 proposal: "however this proposal does not include type information".
  - My check: with standard decorators, `emitDecoratorMetadata` alone is rejected ("Option 'emitDecoratorMetadata' cannot be specified without specifying option 'experimentalDecorators'."), and a parameter decorator gives "Decorators are not valid here."
- **Caveat:** That it records no types is my reading of the proposal's design (a plain object written by decorators), not a sentence in it.
- **For the post:** Constructor injection by type exists only in the legacy mode. Frameworks moving to standard decorators (or to `inject()`, 4.15) lose the hazard along with the feature.
- **Text:** `scratchpad/type-imports-lit/C/text/tsweb/TypeScript-5.0.md`, `scratchpad/type-imports-lit/C/text/tsweb/TypeScript-5.2.md`, `scratchpad/type-imports-lit/C/text/proposal-decorator-metadata-README.md`, `scratchpad/type-imports-lit/C/src/tseslint/installed-8.72.1-consistent-type-imports.js`, `scratchpad/type-imports-lit/C/check/tc39-decorators/out.txt`, `scratchpad/type-imports-lit/C/check/tc39-decorators/out-no-edm.txt`

### 4.9 NestJS resolves constructor dependencies by the emitted type, warns against `import type`, and generates projects with `isolatedModules` and both decorator flags. VERIFIED (docs at pinned SHA, schematics, starter)

- **Citation:** NestJS docs, `content/components.md` (Providers) and `content/faq/errors.md` (Common errors), docs.nestjs.com `7b56f809`; @nestjs/schematics `12.0.13` `src/lib/application/files/ts/tsconfig.json` and `ts-esm/tsconfig.json`; schematics commit `2ec26a6f`, 18 Jul 2025. https://docs.nestjs.com/providers#dependency-injection, https://docs.nestjs.com/faq/common-errors
- **What it says:**
  - "Nest resolves dependencies by their type." The type annotation "is what Nest resolves against", and "the container reads that metadata to determine which provider to supply."
  - Warning: an interface "leaves Nest with no token to look up", and "The same happens when you import a class with `import type`," "because the import is erased as well."
  - The FAQ lists "Type-only imports." as a cause, with the hint "This commonly occurs when using 'import type' instead of 'import' for injectable classes".
  - Both `nest new` templates set `"isolatedModules": true`, `"emitDecoratorMetadata": true`, `"experimentalDecorators": true` and `"module": "nodenext"`. `isolatedModules` arrived in commit `2ec26a6f` ("Enable ESM-interoperability"), when the template moved off `"module": "commonjs"`.
- **Caveat:** Vendor docs. The FAQ describes the `undefined`/`Object` message, not the `Function` one a `tsc` build produces (4.10).
- **For the post:** NestJS documents the hazard, so the post can cite the framework itself. New projects are ESM with `isolatedModules`, which is the configuration where TS1272 pushes `import type` for interfaces (4.7).
- **Text:** `scratchpad/type-imports-lit/C/text/nest/docs-content_components.md`, `scratchpad/type-imports-lit/C/text/nest/docs-content_faq_errors.md`, `scratchpad/type-imports-lit/C/src/nest/schematics-12.0.13-ts-tsconfig.json`, `scratchpad/type-imports-lit/C/src/nest/schematics-12.0.13-ts-esm-tsconfig.json`, `scratchpad/type-imports-lit/C/src/nest/schematics-commit-2ec26a6f.json`, `scratchpad/type-imports-lit/C/src/nest/typescript-starter-a191537e-tsconfig.json`

### 4.10 Nest's import-type hint fires for `undefined` or `Object`, so a `tsc` build, which records `Function`, gets the generic message instead. VERIFIED (source at v12.5.1)

- **Citation:** nestjs/nest `packages/core/errors/messages.ts` (`UNKNOWN_DEPENDENCIES_MESSAGE`) and `packages/core/injector/injector.ts`, tag `v12.5.1`; PR #15588, "fix(core): improve dependency resolution error messages", merged 16 Sep 2025 (first in `v11.1.7`, 21 Oct 2025). https://github.com/nestjs/nest/blob/v12.5.1/packages/core/errors/messages.ts
- **What it says:**
  - `isImportTypeIssue` is true only when the dependency is `undefined`, `=== Object`, or a function whose `name === 'Object'`. Then the message adds "The dependency at index [${index}] appears to be undefined at runtime" and the `import type` advice.
  - Otherwise the message names the token: "Please make sure that the argument${tokenFragment} at index [${index}]" "is available in the ${contextLabel} module.", with module-registration advice.
  - The injector reads `Reflect.getMetadata(PARAMTYPES_METADATA, type)` and throws `UndefinedDependencyException` only for `undefined`.
- **Caveat:** Source reading; Nest wasn't run. Every `tsc`-era report found names the token `Function` (7.20, 7.30), which is the generic branch.
- **For the post:** An honest detail: the framework's own diagnostic for this mistake is tuned to SWC and transpile-only output; the default `tsc` build gets a message about module registration.
- **Text:** `scratchpad/type-imports-lit/C/src/nest/v12.5.1-messages.ts`, `scratchpad/type-imports-lit/C/src/nest/v12.5.1-injector.ts`, `scratchpad/type-imports-lit/C/src/gh/nest-pr-15588.json`, `scratchpad/type-imports-lit/C/src/gh/nest-pr-15588-release-containment.txt`

### 4.11 The same fix can switch off DTO validation without any error: Nest's `ValidationPipe` takes its class from the handler's `design:paramtypes`. VERIFIED (source, docs) plus my check (model run)

- **Citation:** nestjs/nest `packages/common/pipes/validation.pipe.ts` and `packages/core/helpers/context-utils.ts`, tag `v12.5.1`; NestJS docs `content/application/validation.md`, `7b56f809`. https://docs.nestjs.com/techniques/validation
- **What it says:**
  - Route parameter types come from `Reflect.getMetadata(PARAMTYPES_METADATA, ...)` on the handler (`reflectCallbackParamtypes`).
  - `toValidate` returns false for `[String, Boolean, Number, Array, Object, Buffer, Date]`, and `transform` then returns the value without validating it.
  - Docs: "Don't import DTOs with a type-only import, because" "type-only imports are erased at runtime."
  - My check: a model of that decision with the real class-validator 0.15.1. A DTO with `@IsString()` and `@IsInt()` and a bad body: value import, 2 errors (`isString`, `isInt`); metatype `Object` (a type-only import under SWC or a per-file transpiler), "body returned unvalidated". Metatype `Function` (`tsc`) goes on to class-transformer, which isn't installed; a naive model of it threw "Cannot assign to read only property 'name'", so that path isn't modelled.
- **Caveat:** A hand-written model of the pipe, not Nest. The `Function` outcome under `tsc` is unmeasured; the DTO's rules can't apply there either, because class-validator looks rules up by the object's class, but what the handler receives depends on the pipe's options.
- **For the post:** This is the quieter cost. A broken injection fails at startup; a DTO turned into `import type` can stop being validated with no error, at least under SWC. Worth a harness run with real Nest before stating it as measured.
- **Text:** `scratchpad/type-imports-lit/C/src/nest/v12.5.1-validation.pipe.ts`, `scratchpad/type-imports-lit/C/src/nest/v12.5.1-context-utils.ts`, `scratchpad/type-imports-lit/C/text/nest/docs-content_application_validation.md`, `scratchpad/type-imports-lit/C/check/validation-pipe-model/out.txt`, `scratchpad/type-imports-lit/C/check/validation-pipe-model/out-first-attempt-function-path.txt`

### 4.12 TypeORM uses `design:type` only to guess column types and spot lazy relations, and its docs recommend `import type` for related entities. VERIFIED (source and docs at 1.1.3)

- **Citation:** typeorm/typeorm `packages/typeorm/src/decorator/columns/Column.ts`, `relations/ManyToOne.ts`, `error/ColumnTypeUndefinedError.ts`, `common/RelationType.ts`, and `docs/docs/help/1-faq.md`, `docs/docs/relations/6-relations-faq.md`, tag `1.1.3`; NestJS SWC recipe `content/recipes/swc.md`. https://github.com/typeorm/typeorm/blob/1.1.3/packages/typeorm/src/decorator/columns/Column.ts
- **What it says:**
  - `@Column()` without a type reads `design:type` and uses it; failing that, `ColumnTypeUndefinedError`: "Make sure you have turned on an 'emitDecoratorMetadata': true option in tsconfig.json."
  - Relations take the target from a thunk (`() => Profile`) and read `design:type` only to see whether its name is `promise` (lazy).
  - `Relation<T>` is `export type Relation<T> = T`, "Used to circumvent ESM modules circular dependency issue" "caused by reflection metadata saving the type of the property." The FAQ: it "prevents the type of the property from being saved in the transpiled code".
  - The relations FAQ, under "Avoid circular import errors": "We use import type so that we can use the type information" "without any JavaScript code being generated." with string targets (`@ManyToMany("Person", ...)`).
  - Nest's SWC recipe offers the same trick for injection: `export type WrapperType<T> = T; // WrapperType === Relation`.
- **Caveat:** Column type inference for a property typed with an imported class is probably rare (not measured); the common cases (`string`, `Date`) involve no import.
- **For the post:** For ORMs the lint fix is mostly harmless and sometimes the documented advice. Erasing the type from metadata is a deliberate fix for ESM circular imports, which shows the metadata was never a safe thing to depend on.
- **Text:** `scratchpad/type-imports-lit/C/text/typeorm/1.1.3-Column.ts`, `scratchpad/type-imports-lit/C/text/typeorm/1.1.3-ManyToOne.ts`, `scratchpad/type-imports-lit/C/text/typeorm/1.1.3-ColumnTypeUndefinedError.ts`, `scratchpad/type-imports-lit/C/text/typeorm/1.1.3-RelationType.ts`, `scratchpad/type-imports-lit/C/text/typeorm/1.1.3-1-faq.md`, `scratchpad/type-imports-lit/C/text/typeorm/1.1.3-6-relations-faq.md`, `scratchpad/type-imports-lit/C/text/nest/docs-content_recipes_swc.md`

### 4.13 Angular doesn't use `emitDecoratorMetadata`: the CLI dropped it for new apps in 2019, removed it by migration in v12, and warns about it now. VERIFIED (CLI commits, template, warning patch)

- **Citation:** angular/angular-cli commits `258dfc281e` (19 May 2019), `6b28d3ac51` (21 May 2019), `96a4467ce9` (11 Feb 2021), `61e8185ab0` (14 Jan 2025); `packages/schematics/angular/workspace/files/tsconfig.json.template` and `ng-new/schema.json` at `v22.2.7`. https://github.com/angular/angular-cli/commit/96a4467ce9
- **What it says:**
  - `258dfc281e` replaced the option with a `ctorParameters` transform; the option "does not support forward references of ES2015 classes", which "results in a runtime TDZ error."
  - `6b28d3ac51`: "remove `emitDecoratorMetadata` TS option for new applications". `96a4467ce9` (the `update-12` migration): "Decorator metadata is no longer needed by Angular."
  - `61e8185ab0` adds a build warning when both `isolatedModules` and the option are on; its message says the option "is not required by Angular", and the commit says "New Angular projects also do not enable this option."
  - The v22.2.7 template sets `"experimentalDecorators": true` and `"isolatedModules": true`, no `emitDecoratorMetadata`, and `"strictInjectionParameters": true` when `strict`, which defaults to `true`.
- **Caveat:** An Angular project can still turn the option on (some do, for other libraries); Angular's own injection ignores it.
- **For the post:** The Angular half of the story isn't about metadata at all. It also means typescript-eslint's decorator exemption, which needs both flags, never applies to a default Angular project (7.24).
- **Text:** `scratchpad/type-imports-lit/C/src/gh/angular-cli-commit-258dfc281e.json`, `scratchpad/type-imports-lit/C/src/gh/angular-cli-commit-6b28d3ac51.json`, `scratchpad/type-imports-lit/C/src/gh/angular-cli-commit-96a4467ce9.json`, `scratchpad/type-imports-lit/C/src/gh/angular-cli-commit-61e8185ab0.json`, `scratchpad/type-imports-lit/C/src/angular/angular-cli-commit-61e8185a.patch`, `scratchpad/type-imports-lit/C/src/angular/angular-cli-v22.2.7-workspace-tsconfig.json.template`, `scratchpad/type-imports-lit/C/src/angular/angular-cli-v22.2.7-ng-new-schema.json`

### 4.14 In Angular the same fix fails the build: the compiler reads the parameter type itself and rejects a type-only import with NG2003. VERIFIED (compiler source at v22.2.6, 10.0.4/10.1.0 comparison, error reference)

- **Citation:** angular/angular `packages/compiler-cli/src/ngtsc/annotations/common/src/di.ts`, `reflection/src/type_to_value.ts`, `annotations/src/injectable.ts`, `annotations/directive/src/shared.ts`, `annotations/src/pipe.ts`, `diagnostics/src/error_code.ts`, `core/src/render3/instructions/di.ts`, and `adev/src/content/reference/errors/NG2003.md`, tag `v22.2.6`; commit `18098d38b8` (PR #37912), 3 Jul 2020. https://github.com/angular/angular/blob/v22.2.6/packages/compiler-cli/src/ngtsc/annotations/common/src/di.ts
- **What it says:**
  - The diagnostic starts "No suitable injection token for parameter" and names the parameter and class. For `TYPE_ONLY_IMPORT` the chain says "Consider changing the type-only import to a regular import," "or use the @Inject decorator to specify an injection token." and the hint "This type is imported using a type-only import," "which prevents it from being usable as an injection token." The code is `PARAM_MISSING_TOKEN = -2003`, shown as `NG2003`.
  - Components and directives with a selector, and pipes, always validate constructor dependencies. `@Injectable` validates when `strictCtorDeps` (the `strictInjectionParameters` option, on in new strict projects, 4.13); otherwise "a factory definition (ɵfac) that throws is" generated, whose dev message is "This constructor was not compatible with Dependency Injection."
  - The type-only check arrived with #37912; `annotations/src/util.ts` has 0 matches for "type-only import" at 10.0.4 and 3 at 10.1.0.
  - Angular's error reference: "There is no injection token for a constructor parameter at compile time."
- **Caveat:** Source reading; Angular's compiler isn't installed. The real error text appears in a 2020 report (7.21). JIT-only setups (for example Jest with jest-preset-angular) weren't checked.
- **For the post:** The claim that Angular breaks the same way doesn't hold. Angular breaks louder and earlier: the build stops and names the type-only import. Only a non-strict `@Injectable()` defers it to runtime.
- **Text:** `scratchpad/type-imports-lit/C/src/angular/v22.2.6-di.ts`, `scratchpad/type-imports-lit/C/src/angular/v22.2.6-src-injectable.ts`, `scratchpad/type-imports-lit/C/src/angular/v22.2.6-src-shared.ts`, `scratchpad/type-imports-lit/C/src/angular/v22.2.6-src-pipe.ts`, `scratchpad/type-imports-lit/C/src/angular/v22.2.6-src-error_code.ts`, `scratchpad/type-imports-lit/C/src/angular/v22.2.6-diagnostics-util.ts`, `scratchpad/type-imports-lit/C/src/angular/v22.2.6-instructions-di.ts`, `scratchpad/type-imports-lit/C/src/angular/angular-type-only-diagnostic-tags.txt`, `scratchpad/type-imports-lit/C/src/angular/util-10.1.0.ts`, `scratchpad/type-imports-lit/C/text/angular/adev-v22.2.6-NG2003.md`

### 4.15 Angular's `inject()` and the new `@Service` decorator use the class as a value, so the import is never type-only; angular-eslint recommends it. VERIFIED (docs at v22.2.6, installed rule metadata)

- **Citation:** angular/angular `adev/src/content/guide/di/overview.md`, `creating-and-using-services.md` and `debugging-and-troubleshooting-di.md`, tag `v22.2.6`; @angular-eslint/eslint-plugin 22.6.0 `prefer-inject` (installed). https://angular.dev/guide/di
- **What it says:**
  - "The call to [`inject`](/api/core/inject) can appear" "in either the `constructor` or in a field initializer."
  - `@Service` table: "**Constructor-based DI**" is "❌ No" for `@Service`; "`@Service` only supports the [`inject()`](api/core/inject) function."
  - On interfaces: "If you try to inject an interface type," "Angular has nothing to match against the provider configuration."
  - `prefer-inject` (recommended, no fixer): "Prefer using the inject() function over constructor parameter injection".
- **Caveat:** Ultracite's ESLint angular preset turns every non-deprecated angular-eslint rule on; loading its rule map shows `@angular-eslint/prefer-inject` at `error` in the syntactic set, so it already flags the constructor injection that the type-import fix would break (notes).
- **For the post:** The durable fix in Angular is `inject(CatsService)`: a value use that no type-import rule will touch.
- **Text:** `scratchpad/type-imports-lit/C/text/angular/adev-v22.2.6-overview.md`, `scratchpad/type-imports-lit/C/text/angular/adev-v22.2.6-creating-and-using-services.md`, `scratchpad/type-imports-lit/C/text/angular/adev-v22.2.6-debugging-and-troubleshooting-di.md`, `scratchpad/type-imports-lit/C/src/angular/angular-eslint-22.6.0-prefer-inject-meta.json`, `scratchpad/type-imports-lit/C/check/lint-fix/ultracite-angular-prefer-inject.txt`

### 4.16 class-transformer and class-validator name nested classes with value thunks, and read `design:type` only for implicit conversion. VERIFIED (READMEs and source)

- **Citation:** typestack/class-transformer `README.md` and `src/TransformOperationExecutor.ts`, tag `v0.5.1`; typestack/class-validator `README.md`, tag `v0.15.1`. https://github.com/typestack/class-transformer#working-with-nested-objects
- **What it says:**
  - "Since Typescript does not have good reflection abilities yet", nested types are declared "using `@Type` decorator", as `@Type(() => Photo)`.
  - The executor reads `design:type` only in the `enableImplicitConversion` branch, when no `@Type` is registered.
  - class-validator: a nested object "_must_ be an instance of a class," "otherwise `@ValidateNested` won't know what class is target of validation."
- **Caveat:** No issue was found in either repo about `import type` breaking them (searches in 7.32's method).
- **For the post:** Nested DTOs are safe from the fix because `() => Photo` is a value use. The exposure is the top-level DTO in a Nest handler (4.11) and implicit conversion.
- **Text:** `scratchpad/type-imports-lit/C/text/typestack/class-transformer-v0.5.1-README.md`, `scratchpad/type-imports-lit/C/src/typestack/class-transformer-v0.5.1-TransformOperationExecutor.ts`, `scratchpad/type-imports-lit/C/text/typestack/class-validator-v0.15.1-README.md`

### 4.17 tsyringe, InversifyJS and TypeGraphQL require the option and say why; none documents type-only imports. ANECDOTAL (project docs)

- **Citation:** microsoft/tsyringe `README.md`, `v4.8.0`; inversify/monorepo `packages/docs-mintlify/docs/faq/requirements.mdx` and `docs/api/decorator.mdx`, `main` as of 17 Nov 2026; MichalLytek/type-graphql `docs/installation.md` and `docs/types-and-fields.md`, `v2.0.0-rc.4`. https://github.com/microsoft/tsyringe#installation
- **What it says:**
  - tsyringe's setup asks for `"experimentalDecorators": true` and `"emitDecoratorMetadata": true`; the container "automatically figures out the tokens most of the time", except "interfaces and non-class types".
  - Inversify: "InversifyJS relies on TypeScript's reflection metadata capabilities." Its `@injectable` page shows `__metadata('design:paramtypes', [B])` and warns that without a class decorator "no class metadata is emitted", "causing trouble at execution time."
  - TypeGraphQL builds schemas from classes with "decorators and a bit of reflection magic." Its docs have no mention of `import type`.
- **Caveat:** Vendor docs. tsyringe is Microsoft's (Vendor).
- **For the post:** Any container that injects by class without explicit tokens has NestJS's exposure; name the family, don't single out Nest.
- **Text:** `scratchpad/type-imports-lit/C/text/di/tsyringe-v4.8.0-README.md`, `scratchpad/type-imports-lit/C/text/di/inversify-requirements.mdx`, `scratchpad/type-imports-lit/C/text/di/inversify-decorator.mdx`, `scratchpad/type-imports-lit/C/text/di/type-graphql-types-and-fields.md`, `scratchpad/type-imports-lit/C/text/di/type-graphql-installation.md`

---

## 5. Builds and bundles

### 5.1 A kept import keeps its module and side effects unless the bundler is told the module is side-effect free. VERIFIED (Rollup, webpack and esbuild docs); My check (esbuild 0.28.1)

- **Citation:** Rollup, "Configuration Options", `treeshake.moduleSideEffects`, rollup `docs/configuration-options/index.md` at `v4.68.5` (17 Nov 2026), https://rollupjs.org/configuration-options/#treeshake-modulesideeffects; webpack, "Tree Shaking" guide, webpack.js.org `src/content/guides/tree-shaking.mdx` at `bb00de79` (11 Sep 2026), https://webpack.js.org/guides/tree-shaking/; esbuild content types (3.2).
- **What it says:**
  - Rollup's default is `true`. Only with `false` does it "assume modules and external dependencies from which nothing is imported" "do not have other side effects like mutating global variables or logging without checking." For local modules, `false` "will not include any statements from a module" "unless at least one import from this module is included"; the docs' example shows `import { unused } from './b.js'` keeping `console.log('side-effect')` under `true`. "Rollup itself does not read a package's `sideEffects` field." (the node-resolve plugin does), and turning the option off globally "can remove setup modules, polyfills or styles that rely on import side effects."
  - webpack: "A 'side effect' is defined as code that performs a special behavior when imported," "other than exposing one or more exports." "If no direct export from a module flagged with no-sideEffects is used," "the bundler can skip evaluating the module for side effects." and "A CSS file imported for its side effect alone" "needs to be added to the side effect list".
  - esbuild says the keep-imports options exist because the imported file may have "useful side-effects".
  - **My check** (`scratchpad/type-imports-lit/B/check/esbuild/esbuild-bundle-out.txt`, `scratchpad/type-imports-lit/B/check/esbuild-sideeffects/out.txt`): bundled with `verbatimModuleSyntax: true`, both `import { User }` and `import { type User }` pull in `types.ts`'s `console.log`; `import type` doesn't. Put `types.ts` under a `package.json` with `"sideEffects": false` and the kept `import {}` adds nothing.
- **For the post:** this is the source the brief asked for: an empty import is a side-effect import, and the bundler keeps the module unless it's marked side-effect free. Under `verbatimModuleSyntax` that's what `import { type x }` is.
- **Text:** `scratchpad/type-imports-lit/B/src/rollup-v4.68.5-configuration-options.md`, `scratchpad/type-imports-lit/B/src/webpack-docs-tree-shaking-bb00de79c8.mdx`, `scratchpad/type-imports-lit/B/text/esbuild-content-types.txt`, `scratchpad/type-imports-lit/B/check/esbuild/esbuild-bundle-out.txt`, `scratchpad/type-imports-lit/B/check/esbuild-sideeffects/out.txt`

### 5.2 Under `verbatimModuleSyntax`, `import { type X }` can pull a lazily loaded module into the entry chunk. ANECDOTAL (Vite #8339, esbuild #2268); My check (esbuild 0.28.1)

- **Citation:** AlexandreBonaventure, Vite issue #8339 (26 May 2022), https://github.com/vitejs/vite/issues/8339; esbuild issue #2268 (26 May 2022), https://github.com/evanw/esbuild/issues/2268; esbuild 0.14.40 changelog (27 May 2022).
- **What it says:**
  - A Vue component did `import { type Map } from 'mapbox-gl'` and later `await import('mapbox-gl')`. With `preserveValueImports: true`, code splitting failed; with `import type` it worked. "The expected result is that both syntax should allow code splitting." sapphi-red (Vite team): "I was able to reproduce only with esbuild."; esbuild emitted `import {} from "mapbox-gl";`, while tsc removed the line.
  - esbuild #2268: "keeping an empty import line which breaks tree-shaking/code-splitting in bundlers"; evanw: "I can confirm the issue, and will fix this in the next release." 0.14.40 now removes it under `preserveValueImports`.
  - Under `verbatimModuleSyntax` (TS 5.0, a year later) the same input is supposed to become `import {} from "xyz"` (3.15), so the 2022 bug is today's designed output.
  - **My check** (`scratchpad/type-imports-lit/B/check/esbuild-splitting/out.txt`, `--bundle --splitting`): an entry that types a variable with `Heavy` and lazy-loads `heavy.ts`. Without verbatim, both import forms leave `heavy.ts` in its own lazy chunk. With verbatim, `import type` still does; `import { type Heavy }` gives the entry a static `import "./chunk-MY6C6ECQ.js"` holding `heavy.ts`, which then runs at startup.
- **Caveat:** one report and one toy; the cost depends on the module's size and whether it's side-effect free.
- **For the post:** the clearest bundle-level cost of the inline form. It's measurable in chunk graphs, not just in theory.
- **Text:** `scratchpad/type-imports-lit/B/src/vite-issue-8339.json`, `scratchpad/type-imports-lit/B/src/vite-issue-8339-comments.json`, `scratchpad/type-imports-lit/B/src/esbuild-issue-2268.json`, `scratchpad/type-imports-lit/B/src/esbuild-issue-2268-comments.json`, `scratchpad/type-imports-lit/B/src/esbuild-CHANGELOG-2022-v0.28.2.md`, `scratchpad/type-imports-lit/B/check/esbuild-splitting/out.txt`

### 5.3 With default elision, `import { T }` and `import type { T }` give the same bundle; I found no measured size or speed difference from the keyword. My check; absence noted

- **Citation:** my checks; the docs in 3.2, 3.8, 3.9; Vite's features page.
- **What it says:**
  - esbuild 0.28.1 with an empty tsconfig produces the same code for all three forms in transform and bundle mode (bundles differ only in the file-name comment); Rolldown 1.2.13 with no tsconfig options drops the type-only module entirely.
  - The only bundler doc on the subject is Vite's, and it's about correctness: type-only syntax "to avoid potential problems like type-only imports being incorrectly bundled". No bundler doc, changelog or maintainer statement I found claims that `import type` makes output smaller or builds faster. Rolldown's docs don't mention type-only imports (code search of `docs/`).
- **Caveat:** absence of evidence from a targeted search (bundler docs, esbuild, Vite, Rolldown, TypeScript issues), not a survey.
- **For the post:** say it plainly: with elision on, the keyword changes nothing in the bundle. It matters when a tool can't elide (Node, `verbatimModuleSyntax`, `isolatedModules`-style transpilers on re-exports) and, in the inline form, when it keeps an edge (5.2).
- **Text:** `scratchpad/type-imports-lit/B/check/esbuild/esbuild-out.txt`, `scratchpad/type-imports-lit/B/check/esbuild/esbuild-bundle-out.txt`, `scratchpad/type-imports-lit/B/check/rolldown-tsconfig/out.txt`, `scratchpad/type-imports-lit/B/src/vite-features-md-v8.3.8.md`

### 5.4 TypeScript's Performance wiki says nothing about type-only imports; it calls `isolatedModules` a safety check, not a speed-up. VERIFIED (wiki page, design notes)

- **Citation:** microsoft/TypeScript wiki, "Performance", https://github.com/microsoft/TypeScript/wiki/Performance (raw copy; last history entry 20 Feb 2026); TypeScript "Design Meeting Notes, 1/10/2020", issue #36138 (Daniel Rosenwasser).
- **What it says:**
  - The page has no mention of `import type`, type-only imports, `verbatimModuleSyntax`, `importsNotUsedAsValues` or `isolatedDeclarations` (grep). Its "Isolated File Emit" section: tsc's emit can need non-local information, and "needing to check other files to generate the output for an arbitrary file" "can make emit slower."; but "`isolatedModules` doesn't automatically make code generation faster" "it just tells you when you're about to use a feature" that might not be supported; the speed comes from per-file emitters (`transpileModule`, Babel, ts-loader's `transpileOnly`).
  - The design notes on PR #36092's `import type` changes record the compiler's own cost: "Seems like the PR adds some overhead." "3%!?", because "whenever you reference an alias, we need to determine whether a module" is marked type-only. No method or benchmark is given.
- **Caveat:** the 3% is an aside about tsc's implementation in Jan 2020, not a measurement of user code. `isolatedDeclarations` is sections 1 and 2's.
- **For the post:** nothing from the TypeScript team says `import type` speeds up checking, and I found no measurement either way. The keyword's value is per-file emit correctness.
- **Text:** `scratchpad/type-imports-lit/B/src/ts-wiki-Performance.md`, `scratchpad/type-imports-lit/B/text/ts-wiki-Performance.txt`, `scratchpad/type-imports-lit/B/src/ts-wiki-Performance-history.html`, `scratchpad/type-imports-lit/B/src/ts-issue-36138.json`

### 5.5 Import cycles: what this section adds to import-cycles.md. VERIFIED (Node issue, my check); ANECDOTAL (routecraft)

- **Citation:** `research/bibliography/import-cycles.md` 2.3, 2.7 (Next.js #91906) and 6.4 (how cycle checkers treat `import { type X }`); Node issue #58422 (7.10); routecraft (7.16); my Node check (3.4).
- **What it says:**
  - Marco Ippolito (Node TypeScript team) in #58422: "Basically `{}` is a valid non erasable import while `type {}` is erasable", with a two-file demo: `import {} from './bar.ts'` prints `Hello World`, `import type {} from './bar.ts'` prints nothing. My check shows the same with `import { type User }`.
  - So any runtime that keeps `import {}` (3.15) can close a cycle that tsc's default elision would have opened. routecraft's 2026 case (7.16) shows the parts import-cycles.md lacked: the crash appeared only under Vite/Vitest, Bun's loader tolerated the order, and `madge --circular` didn't report it.
  - import-cycles.md 6.4 already records that eslint-plugin-import's and Oxlint's `no-cycle` ignore an all-inline-type import while Biome counts it.
- **For the post:** the cycle argument for `import type` is concrete: it's the one form that removes the runtime edge in every tool.
- **Text:** `scratchpad/type-imports-lit/B/src/node-issue-58422-comments.json`, `scratchpad/type-imports-lit/B/check/node-strip/node-out.txt`, `scratchpad/type-imports-lit/B/src/routecraft-issue-480.json`

## 6. The rules, and what configs and templates choose

6.1–6.7 are typescript-eslint `consistent-type-imports`; 6.8 `consistent-type-exports`; 6.9–6.10 `no-import-type-side-effects` and whether its side effect is real; 6.11–6.15 eslint-plugin-import(-x) `consistent-type-specifier-style` and `no-duplicates`, and which rules write `import { type x }`; 6.16–6.20 Oxlint's ports; 6.21–6.23 Biome; 6.24 TypeScript's own errors; 6.25–6.29 my local runs.

### 6.1 `consistent-type-imports` was proposed in June 2020, merged in August and shipped in typescript-eslint 4.0.0. VERIFIED (issue #2200, PR #2367, changelog)

- **Citation:** nojvek, "Proposal for new rule - consistent style for type-only imports", typescript-eslint #2200, 10 Jun 2020, https://github.com/typescript-eslint/typescript-eslint/issues/2200 ; ota-meshi (Yosuke Ota), "feat(eslint-plugin): add `consistent-type-imports` rule", PR #2367, opened 7 Aug 2020, merged 16 Aug 2020, https://github.com/typescript-eslint/typescript-eslint/pull/2367 ; `packages/eslint-plugin/CHANGELOG.md` at `v8.72.1`.
- **What it says:**
  - The proposal: since TS 3.8 added `import type`, "it would be nice to have typescript-eslint automatically flag and fix" `import {T}` to `import type {T}`. The proposer gave two reasons in the issue: type-only imports are not emitted, and they are not counted as cyclic imports.
  - A second commenter (adidahiya) wanted it alongside eslint-plugin-import's `no-cycle`, which "flags type-only imports as cyclic dependencies, but I don't really care about those" (cross-reference `import-cycles.md` §6.4).
  - Brad Zacher (bradzacher, maintainer) merged #1985 into it and set the requirements: a preference option defaulting to type imports, and an option to disallow `import()` type annotations, default true.
  - Asked why a lint rule should duplicate a TypeScript error, Brad Zacher answered: "TS compiler options stop the build." "For production builds this is great, but during dev this sucks." Lint does not block a build when you comment out the last value use of an import.
  - The changelog lists "add `consistent-type-imports` rule" under 4.0.0 (2020-08-31). Brad Zacher announced it on 16 Aug 2020 as part of the v4 prerelease (`rc-v4`).
- **Caveat:** the proposer's cycle argument is the proposer's; maintainers later said the point is transpiler safety, not cycles (6.7).
- **For the post:** the rule began as a fixable, non-blocking version of what the compiler could already check, with emit and import cycles as the motivating cases.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-2200.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-2200-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-2367.json`, `scratchpad/type-imports-lit/D/src/tseslint/eslint-plugin-CHANGELOG-v8.72.1.md`

### 6.2 Its options arrived in three steps: `prefer` and `disallowTypeAnnotations` in 4.0.0, inline specifier support in 5.7.0, `fixStyle` in 5.43.0. VERIFIED (rule source at v4.0.0 and v8.72.1, PRs, changelog)

- **Citation:** typescript-eslint, `packages/eslint-plugin/src/rules/consistent-type-imports.ts` at `v4.0.0` and `v5.62.0`; `dist/rules/consistent-type-imports.js` in the installed 8.72.1; PR #4237 (bradzacher, merged 6 Dec 2021), PR #5050 (snewcomer, merged 7 Nov 2022, fixes #4338), https://github.com/typescript-eslint/typescript-eslint/pull/5050
- **What it says:**
  - At `v4.0.0` the defaults are `prefer: 'type-imports'` and `disallowTypeAnnotations: true`; there is no `fixStyle`.
  - 5.7.0 (2021-12-13): "support TS4.5 inline import specifiers" (#4237), so `import { type A }` counts as already qualified.
  - 5.43.0 (2022-11-14): "support fixing to inline types" (#5050). Issue #4338 (akphi, 21 Dec 2021) asked for it and drew 55 thumbs-up.
  - At 8.72.1 the schema has three options: `disallowTypeAnnotations` (default true), `fixStyle` (`separate-type-imports` default, or `inline-type-imports`) and `prefer` (`type-imports` default, or `no-type-imports`). The 8.72.1 docs say `prefer: 'type-imports'` enforces `import type` "except referenced by metadata of decorators."
  - The rule is `fixable: 'code'` (an automatic fix), with no suggestions.
- **Caveat:** that docs phrase predates the 2024 change and now overstates it; see 6.4.
- **For the post:** the rule's default fix writes a separate top-level `import type`; inline style is opt-in.
- **Text:** `scratchpad/type-imports-lit/D/src/tseslint/history/consistent-type-imports-v4.0.0.ts`, `scratchpad/type-imports-lit/D/src/tseslint/consistent-type-imports.js`, `scratchpad/type-imports-lit/D/src/tseslint/docs-consistent-type-imports-v8.72.1.mdx`, `scratchpad/type-imports-lit/D/src/tseslint/eslint-plugin-CHANGELOG-v8.72.1.md`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-4338.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-5050.json`

### 6.3 The rule decides from one file's scope analysis, and its fix splits mixed imports and keeps default imports separate. VERIFIED (rule source at 8.72.1); My check (6.25)

- **Citation:** typescript-eslint 8.72.1, `dist/rules/consistent-type-imports.js` (installed copy saved).
- **What it says:**
  - For each specifier without an inline `type`, the rule asks the scope manager for the variable's references. It counts the import as type-only when every reference is a type reference, plus two value-reference cases it treats as safe: `typeof foo` in a type, and a computed key in a type literal (`{ [foo]: string }`). Exported names (`export { T }`, `export default T`, `export = T`) keep the import's own kind.
  - Unused specifiers are not reported (the docs point to `no-unused-vars`), and imports with import attributes are skipped (issue #7527, see 7.41).
  - The fix, in the default style: an all-type named import gains a top-level `type`; a mixed import is split, with the types moved into a new `import type { … }` line (or merged into an existing `import type` from the same source); a default import used only as a type becomes `import type X`; `import Def, * as Ns` is split because a type-only import cannot be both default and named.
  - With `fixStyle: 'inline-type-imports'`, the fix adds inline `type` to each named type specifier, and it does so even when every named specifier is a type: `import { Foo }` becomes `import { type Foo }` (my run, 6.25).
- **Caveat:** single-file analysis cannot see whether a name is a type or a value in the other module; that is why `consistent-type-exports` needs type information (6.8) and why decorator metadata defeats this rule (6.4).
- **For the post:** the rule's test is where a name is referenced in this one file, not whether the name is a type.
- **Text:** `scratchpad/type-imports-lit/D/src/tseslint/consistent-type-imports.js`, `scratchpad/type-imports-lit/D/check/eslint/runs/tseslint-inline-noTI/out.txt`

### 6.4 Decorator metadata: the rule first forced value imports (4.14.0), gained a parser option (5.15.0), then gave up on decorated files (7.4.0). VERIFIED (PRs #2751, #4646, #8335, parser source at four tags, rule and parser source at 8.72.1); My check (6.25)

- **Citation:** Frezc, "feat: add support for decorator metadata in scope analysis and in consistent-type-imports", PR #2751, merged 18 Jan 2021 (4.14.0), fixes #2559, https://github.com/typescript-eslint/typescript-eslint/pull/2751 ; xboy2012, "feat(parser): add `parserOptions.emitDecoratorMetadata`", PR #4646, merged 11 Mar 2022 (5.15.0), fixes #4608, https://github.com/typescript-eslint/typescript-eslint/pull/4646 ; Brad Zacher, "feat(eslint-plugin): [consistent-type-imports] ignore files with decorators, experimentalDecorators, and emitDecoratorMetadata", PR #8335, merged 24 Mar 2024 (7.4.0, 2024-03-25), fixes #5468 and #6393, https://github.com/typescript-eslint/typescript-eslint/pull/8335 ; `packages/parser/src/parser.ts` at `v4.14.0`, `v7.3.0`, `v7.4.0`, `v8.0.0`.
- **What it says:**
  - 4.14.0 (#2751): "check import if referenced by decorator metadata if 'emitDecoratorMetadata' if on." The parser read `emitDecoratorMetadata` only from the TypeScript program's compiler options (type-aware linting), and the scope manager marked such references as value references, so the rule demanded value imports there ("used by decorator metadata").
  - 5.15.0 (#4646): `parserOptions.emitDecoratorMetadata` for users without type information; "The parser first try to use `compilerOptions.emitDecoratorMetadata` as it did before." At `v7.3.0` the parser sets the flag if either the parser option or the program says so.
  - #5468 (HaoboZ, 12 Aug 2022, 22 thumbs-up): with `isolatedModules` plus `emitDecoratorMetadata`, the rule demanded a value import while TypeScript's TS1272 demanded `import type`, an unresolvable pair. Brad Zacher: "At this point I'm thinking that we should just flat out ignore any import"; and later "we don't want to be in the position of re-implementing TS's logic."
  - 7.4.0 (#8335): "This PR implements a sledge-hammer approach to fixing the problem". It removed the metadata logic from the scope manager, added `parserOptions.experimentalDecorators`, exposed both flags on parser services, and made the rule bail out of a file that has a decorator when both flags are on. Brad Zacher labelled it a minor release: "It's technically a 'bug fix' but it's also a change in behaviour."
  - At 8.72.1 the rule reads both flags with `getParserServices(context, true)`. `typescript-estree`'s `createParserServices` sets them from `program.getCompilerOptions()` when there is a program, and leaves them `undefined` without one; the parser then fills them with `??=` from `parserOptions`. So with type information the tsconfig decides and the parser options are ignored; without it, only the parser options count. The source comment: "the rule will do nothing in the file out of an abundance of" caution.
  - Both parser options are still documented at 8.72.1 ("This option allow you to tell parser to act as if" the tsconfig flag is set). They were not removed in v8 (`v8.0.0` parser has the same `??=` lines).
  - My check (6.25): without type information and without the parser options, the rule reports `import { Service }` in a decorated class and `--fix` writes `import type { Service }`; with `parserOptions.emitDecoratorMetadata` and `experimentalDecorators` it is silent; with `projectService` and a tsconfig that sets both, it is silent; with `projectService`, a tsconfig that sets neither, and both parser options set, it reports again (the tsconfig wins).
- **Caveat:** whole-file bail-out means every other import in a decorated file goes unchecked. Decorator and DI breakage reports themselves are section 4's.
- **For the post:** the maintainers' fix for a type-dependent emit rule was to stop linting those files, not to model TypeScript's emit.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-2751.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-2751-files.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-4646.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-8335.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-5468.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-5468-comments.json`, `scratchpad/type-imports-lit/D/src/tseslint/history/parser-v4.14.0.ts`, `scratchpad/type-imports-lit/D/src/tseslint/history/parser-v7.3.0.ts`, `scratchpad/type-imports-lit/D/src/tseslint/history/parser-v7.4.0.ts`, `scratchpad/type-imports-lit/D/src/tseslint/history/parser-v8.0.0.ts`, `scratchpad/type-imports-lit/D/src/tseslint/consistent-type-imports.js`, `scratchpad/type-imports-lit/D/src/tseslint/typescript-estree-8.72.1-createParserServices.js`, `scratchpad/type-imports-lit/D/src/tseslint/parser-8.72.1-parser.js`, `scratchpad/type-imports-lit/D/src/tseslint/docs-Parser-v8.72.1.mdx`, `scratchpad/type-imports-lit/D/src/tseslint/parser-CHANGELOG-v8.72.1.md`, `scratchpad/type-imports-lit/D/check/eslint/runs/`

### 6.5 The docs and blog explain the decorator compromise and, since July 2026, no longer tell users to pick only one of the rule and `verbatimModuleSyntax`. VERIFIED (docs at v8.72.1, two blog posts, PR #12194)

- **Citation:** typescript-eslint, `consistent-type-imports.mdx` at `v8.72.1`; Brad Zacher, "Changes to `consistent-type-imports` with Legacy Decorators and Decorator Metadata", typescript-eslint blog, 25 Mar 2024; Josh Goldberg, "Consistent Type Imports and Exports: Why and How", typescript-eslint blog, 24 Feb 2023; kyungilcho, "docs: clarify consistent-type-imports guidance for verbatimModuleSyntax", PR #12194, merged 6 Jul 2026 (closes #11681).
- **What it says:**
  - Docs caveat heading: "Caveat: `@decorators` + `experimentalDecorators: true` + `emitDecoratorMetadata: true`". The rule "will not report any errors in files that contain decorators" when both are on.
  - Blog 2024: with legacy metadata, an imported class not marked `import type` is emitted as `[Foo]`, and as `[Function]` if it is. The old approach of demanding value imports met `isolatedModules`: "This lead to an unresolvable situation". Adding type information was rejected because "Many users are unable to configure typed linting" "and/or unwilling to take its performance hit." The outcome: "Ultimately we determined the best solution was to just opt-out" "of handling this use-case entirely." For affected users it recommends `verbatimModuleSyntax`, "which will use type information to correctly enforce that types are marked".
  - Blog 2023 gives two benefits: side effects ("When projects include modules that cause side effects, the order of module imports matters.") and isolated transpilers, which "can't know whether an import is of a type, a value, or both."
  - The comparison table at 8.72.1: the rule "Ignores files that contain decorators" where `verbatimModuleSyntax` "Reports on files that contain decorators"; for `import { type T }`, TypeScript under the flag emits `import {} from 'T'`.
  - Before #12194 the docs said to use one or the other, never both. Now: "If you want ESLint autofixes and style enforcement for explicit `import type`," "keep this rule enabled."
- **Caveat:** the blog's emit list is the maintainer's account; my tsc run (6.29) confirms the class case only.
- **For the post:** typescript-eslint's own advice for decorator users is the compiler flag, not the lint rule.
- **Text:** `scratchpad/type-imports-lit/D/src/tseslint/docs-consistent-type-imports-v8.72.1.mdx`, `scratchpad/type-imports-lit/D/src/tseslint/blog-2024-03-25-changes-to-consistent-type-imports-with-decorators.md`, `scratchpad/type-imports-lit/D/src/tseslint/blog-2023-02-24-consistent-type-exports-and-imports-why-and-how.md`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-12194.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-12194-patch.txt`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-11681.json`

### 6.6 None of the three typescript-eslint rules has ever been in `recommended`, `strict` or `stylistic`; only `all`. VERIFIED (configs at eight tags, rule meta, issue #9036, discussion #8914)

- **Citation:** typescript-eslint config sources at `v4.0.0`, `v4.33.0`, `v5.0.0`, `v5.62.0`, `v6.0.0`, `v7.0.0`, `v8.0.0`, `v8.72.1` (scanned with `D/configs-scan.sh`), and installed 8.72.1 `dist/configs`; Sweater-Baron, "Configs: Make consistent-type-imports 'error' for the recommended config", #9036, 1 May 2024; Josh Goldberg, "Changes to configurations for 8.0.0", discussion #8914, 13 Apr 2024.
- **What it says:**
  - At every tag sampled, the only configs naming the rules are `all` and, for `consistent-type-exports`, `disable-type-checked` (which turns it off). In v4–v5 the rule meta said `recommended: false`; commit 5346b5bb (#5251, Feb 2023) removed that key for v6's generated configs.
  - `consistent-type-exports` has `requiresTypeChecking: true`; `consistent-type-imports` does not. Brad Zacher, on a 2026 request to add it to `disableTypeChecked` (#12593): "No it is not." a type-aware rule.
  - #9036, Brad Zacher: "The reason we can't really add this to the recommended set" "is that it fixes to an opinionated style." Josh Goldberg: "I'm -1 on this being included in any preset config." "There's no one single style that fits everyone." Brad Zacher in reply: "TBH I personally would say that the rule itself is a correctness rule" "and the only stylistic thing is the fixer style." Josh Goldberg closed it: "We never reached consensus on this and v8 has already shipped."
  - In the v8 config discussion a user asked for `no-import-type-side-effects` in recommended and the other two in stylistic; nothing changed.
- **Caveat:** eight tags, not every release; between them the rule meta never claimed a config.
- **For the post:** the rule's own maintainers disagree on whether it is style or correctness, which is a fair summary of the debate.
- **Text:** `scratchpad/type-imports-lit/D/src/tseslint/history/configs-history.txt`, `scratchpad/type-imports-lit/D/check/configs/tseslint-8.72.1-configs.txt`, `scratchpad/type-imports-lit/D/src/gh/tseslint-commit-5346b5bb.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-9036.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-9036-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-discussion-8914.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-12593-comments.json`

### 6.7 Refused requests show the rule's scope: it qualifies imports, and leaves placement to other rules. VERIFIED (issues #2559, #6379, #6338, #6844, #7621, #9047)

- **Citation:** typescript-eslint issues #2559 (2020), #6338 and #6379 (Jan 2023), #6844 (Apr 2023), #7621 (Sep 2023), #9047 (May 2024).
- **What it says:**
  - #2559 (NestJS, 2020), first reply from Brad Zacher: "I think this should probably be fixed upstream". A NestJS core team member (jmcdo29) replied that "this rule probably should not be used by developers using the NestJS framework". Metadata support followed anyway (6.4).
  - #6379, a request to ban all-inline imports: "is concerned with exactly one thing"; the side-effect question belongs to other rules. #6338, the same request under `importsNotUsedAsValues: "error"`, was also declined.
  - #7621, a fix style of "top level if possible, inline otherwise": "We won't be looking to add such stylistic semantics to the rule." and "The rule purposely does not enforce the specific positioning of the qualifier".
  - #6844, behaving like `importsNotUsedAsValues`: "I don't believe such a request broadly reflects the style in the ecosystem."
  - #9047, internal imports only, motivated by cycles. Brad Zacher: "The benefit is to ensure your imports are properly qualified" "so that you can leverage non-type-aware transpilers or analysis tools to their fullest."
- **Caveat:** each is one thread; the maintainers' statements are their account.
- **For the post:** the rule is about qualification. Where the `type` goes is `consistent-type-specifier-style`'s job, and the empty-import problem is `no-import-type-side-effects`'.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-2559-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-6379-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-6338.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-7621.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-7621-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-6844-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-9047-comments.json`

### 6.8 `consistent-type-exports` (5.2.0, October 2021) needs type information because a re-export doesn't say what it names. VERIFIED (PR #3936, #4236, rule source and docs at 8.72.1); My check (6.25)

- **Citation:** dzearing, "feat(eslint-plugin): adding `consistent-type-exports` rule", PR #3936, merged 23 Oct 2021, released 5.2.0 (2021-10-25), for proposal #3597 (leepowelldev, 30 Jun 2021); Brad Zacher, PR #4236, 5.7.0 (2021-12-13); `dist/rules/consistent-type-exports.js` and docs at 8.72.1.
- **What it says:**
  - The PR's case is `export { ButtonProps } from 'component-library'`, which esbuild can't drop without knowing `ButtonProps` is a type; it matters "to transpile a library into a browser-consumable bundle."
  - The rule calls `getParserServices(context)` and checks the exported symbol's `SymbolFlags.Value` and `Alias` flags, so it has `requiresTypeChecking: true`.
  - `fixMixedExportsWithInlineTypeSpecifier` (default false) arrived with TS 4.5 inline specifier support in 5.7.0 (#4236); with it, `export { x, T }` becomes `export { x, type T }`, otherwise `export type { T }; export { x };`.
  - Docs, When Not To Use It: under `--isolatedModules` "the compiler would error if a type is not re-exported using" `export type`.
  - Later fixes: `export *` checking in 8.7.0 (#10006), declaration shadowing in 8.43.0 (#11457), alias flags in 8.48.1 (#11769).
- **Caveat:** in shared configs it appears only in `all` and is turned off by `disable-type-checked` (6.6).
- **For the post:** exports are the case a single-file rule cannot handle, which is why `isolatedModules` errors there too.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-3936.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-3597.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-4236.json`, `scratchpad/type-imports-lit/D/src/tseslint/consistent-type-exports.js`, `scratchpad/type-imports-lit/D/src/tseslint/docs-consistent-type-exports-v8.72.1.mdx`, `scratchpad/type-imports-lit/D/src/tseslint/eslint-plugin-CHANGELOG-v8.72.1.md`

### 6.9 `no-import-type-side-effects` came out of a January 2023 eslint-plugin-import thread about TS 5.0, and shipped in 5.51.0. VERIFIED (import-js #2676, typescript-eslint #6382, PR #6394, docs, changelog)

- **Citation:** latin-1, "[consistent-type-specifier-style] should support mixed style", import-js/eslint-plugin-import #2676, 14 Jan 2023, https://github.com/import-js/eslint-plugin-import/issues/2676 ; Brad Zacher, a rule proposal to warn against declarations with only inline type specifiers, typescript-eslint #6382, 27 Jan 2023; Brad Zacher, PR #6394, merged 1 Feb 2023, released 5.51.0 (2023-02-06), https://github.com/typescript-eslint/typescript-eslint/pull/6394 ; fix #6444 (5.52.0); `no-import-type-side-effects.mdx` at `v8.72.1`.
- **What it says:**
  - #2676 opened with `importsNotUsedAsValues: "error"`, under which `import { type T }` is an error (ts(1371)) and, per the reporter's run, compiles to `import "./mod"`. Brad Zacher's first answer: "both babel and TS treat the single inline specifier case the same" at compile time: "they simply do not emit an import." Later: "My personal preference would be to avoid the TS compiler option" "as the output it creates is (IMO) very bad" "because it causes type-only imports to runtime have side-effects." Jordan Harband (ljharb, maintainer of eslint-plugin-import): "tooling pretty universally assumes that if there's a binding, there's no side effects".
  - When TS 5.0's `verbatimModuleSyntax` made the empty import the documented output, Brad Zacher called it "a choice I strongly disagree with" and proposed a separate rule, plus a four-way recipe for combining `consistent-type-specifier-style` and `no-duplicates` (6.14).
  - #6382: "This is obviously a problem - code that looks like it is pure" "type-only code can have runtime side-effects!" andrewbranch noted that an all-value import used only in types "is legal in `verbatimModuleSyntax` as long as `SomeClass` has a real value." so the flag alone doesn't force `import type`.
  - Docs at 8.72.1 name only `--verbatimModuleSyntax`: it removes top-level `type` imports entirely and inline `type` specifiers one by one, so "TS can leave behind a 'side effect' import at runtime". "For the rare case of needing to import for side effects," it may be wanted, "but for most cases you will not want to leave behind" one. When Not To Use It: when not on `verbatimModuleSyntax` and "built with a bundler that manages import side effects for you".
  - The fix is automatic (`fixable: 'code'`). 5.52.0 stopped it reporting bare `import 'test.css'` (#6431).
- **Caveat:** the docs don't mention `importsNotUsedAsValues` or `preserveValueImports`, the older settings that also kept such imports (see 2.4–2.8).
- **For the post:** the rule exists because of one compiler setting; under default elision it guards against nothing, as its own docs say.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-issue-2676.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2676-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-6382.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-6382-comments.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-pr-6394.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-6431.json`, `scratchpad/type-imports-lit/D/src/tseslint/docs-no-import-type-side-effects-v8.72.1.mdx`, `scratchpad/type-imports-lit/D/src/tseslint/no-import-type-side-effects.js`, `scratchpad/type-imports-lit/D/src/tseslint/eslint-plugin-CHANGELOG-v8.72.1.md`

### 6.10 Whether `import { type A }` loads its module depends on the toolchain: tsc by default and Bun drop it; tsc under `verbatimModuleSyntax` and Node's type stripping keep it. My check (local run)

- **Citation:** my runs, 18 Nov 2026: `tsc` 6.0.3 emit with and without `--verbatimModuleSyntax` (`scratchpad/type-imports-lit/D/check/tsc/`); Node v24.14.1 built-in type stripping and Bun 1.4.4 on a module that logs when evaluated (`scratchpad/type-imports-lit/D/check/runtime/`).
- **What it says:**
  - tsc default: `import { type A, type B } from "./m"` produces no import at all. With `--verbatimModuleSyntax` the output starts `import {} from "./m";`.
  - Node 24 running `inline-only.ts` printed "side.ts evaluated" before its own output; with `import type` it did not. Bun printed nothing from `side.ts` in either form.
  - The `import type` form was dropped by all four.
- **Caveat:** one small module, two runtimes, one compiler; esbuild, SWC, Babel and Vite weren't run. The oxc report in 7.52 says the same of Node type stripping.
- **For the post:** the top-level form is the one every tool agrees on, which is the practical case for `no-import-type-side-effects` and `prefer-top-level`, and why the side effect can't be judged without knowing the build.
- **Text:** `scratchpad/type-imports-lit/D/check/tsc/tsc-emit.txt`, `scratchpad/type-imports-lit/D/check/runtime/runtime-output.txt`

### 6.11 eslint-plugin-import's `consistent-type-specifier-style` (2.27.0, January 2023) was proposed for consistency, not side effects. VERIFIED (issue #2469, PR #2473, docs and source at v2.32.0, changelog)

- **Citation:** Brad Zacher, "New rule: consistent inline type specifier usage", import-js/eslint-plugin-import #2469, 4 Jun 2022; Brad Zacher, "[New] `consistent-type-specifier-style`: add rule", PR #2473, merged 7 Sep 2022, released 2.27.0 (2023-01-11), https://github.com/import-js/eslint-plugin-import/pull/2473 ; `docs/rules/consistent-type-specifier-style.md` and `src/rules/consistent-type-specifier-style.js` at `v2.32.0`.
- **What it says:**
  - The proposal: "Users care about consistency when it comes to the use of inline type imports" — "they either want them, or they don't." It specced both fixers and said de-duplication can be left to `import/no-duplicates`.
  - The docs describe the two positions and say the rule "either enforces or bans the use of inline type-only markers" for named imports, with a fixer that "however the fixer will not respect your preferences around de-duplicating imports." They give no reason, side effects or otherwise, for preferring either style.
  - `prefer-top-level` splits `import Foo, { type Bar }` into a value import and an `import type { Bar }`; `prefer-inline` turns `import type { Foo }` into `import { type Foo }`. When Not To Use It: no Flow or TypeScript 4.5+, or no wish to standardise.
  - Later fixes in 2.28.0 (2023-07-27): comma removal elsewhere in the file (#2754, see 7.45).
- **Caveat:** the rule predates TS 5.0's announcement of `verbatimModuleSyntax`; the side-effect argument attached to `prefer-top-level` only from #2676 on (6.9).
- **For the post:** Hayden's reason for `prefer-top-level` (the side effect) is the reason the ecosystem converged on after TS 5.0, but it isn't the rule's documented reason.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-issue-2469.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2473.json`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_docs_rules_consistent-type-specifier-style.md`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_src_rules_consistent-type-specifier-style.js`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_CHANGELOG.md`

### 6.12 Its docs say the default is `prefer-inline`, but with a bare `"error"` it enforces `prefer-top-level`. VERIFIED (plugin source, ESLint source at four versions, issue #2864, import-x PR #220); My check (6.25)

- **Citation:** eslint-plugin-import `v2.32.0` rule source and docs; ESLint `lib/linter/linter.js` `getRuleOptions` at `v8.57.0`, `v9.0.0`, `v9.20.0` and installed 10.14.0; shangodseu, "Default option of 'import/consistent-type-specifier-style' is 'prefer-inline' but it doesn't work as Doc's description", #2864, 24 Aug 2023, closed not planned 5 Sep 2024; privatenumber, "docs(consistent-type-specifier-style): correct default option", import-x PR #220, merged 11 Jan 2025.
- **What it says:**
  - The schema says `default: 'prefer-inline'` and the docs say "By default the rule will use the `prefer-inline` option." But `create()` runs the inline branch only `if (context.options[0] === 'prefer-inline')`, and otherwise the top-level branch. The rule has no `meta.defaultOptions`.
  - ESLint never fills JSON-schema defaults into `context.options`: `getRuleOptions` returns `ruleConfig.slice(1)` in 8.57.0 and 9.0.0, and merges only `meta.defaultOptions` from 9.20.0 on. My probe rule with the same schema, configured as `"error"` in ESLint 10.14.0, saw `context.options = []`.
  - #2864: `import React, { type ComponentProps }` passed with `['error', 'prefer-inline']` and failed with `'error'`. Jordan Harband asked about TypeScript and resolver versions; the issue was closed as not planned a year later and the docs were not changed at `v2.32.0`.
  - import-x fixed its docs and schema: "The default value in the docs are incorrect." Its 4.17.1 docs say the default is `prefer-top-level`, and my run with `"error"` reported `import { type A, type B }` and fixed it to `import type {A, B}`.
  - Oxlint's port has defaulted to `prefer-top-level` since it was added (6.18).
- **Caveat:** eslint-plugin-import itself isn't installed here; the conclusion rests on its source plus ESLint's behaviour, the #2864 report and import-x's identical code. ESLint's ajv instance is created with `useDefaults: true`, yet the probe saw no defaults in `context.options`.
- **For the post:** every implementation enforces top-level by default in practice; only one doc says otherwise. A config that sets just `"error"` never fought `no-import-type-side-effects`.
- **Text:** `scratchpad/type-imports-lit/D/src/import/v2.32.0_src_rules_consistent-type-specifier-style.js`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_docs_rules_consistent-type-specifier-style.md`, `scratchpad/type-imports-lit/D/src/eslint/eslint-v8.57.0-linter.js`, `scratchpad/type-imports-lit/D/src/eslint/eslint-v9.0.0-linter.js`, `scratchpad/type-imports-lit/D/src/eslint/eslint-v9.20.0-linter.js`, `scratchpad/type-imports-lit/D/src/eslint/eslint-10.14.0-linter-getRuleOptions.js`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2864.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2864-comments.json`, `scratchpad/type-imports-lit/D/src/gh/importx-pr-220.json`, `scratchpad/type-imports-lit/D/src/import-x/v4.17.1_docs_rules_consistent-type-specifier-style.md`, `scratchpad/type-imports-lit/D/src/import-x/consistent-type-specifier-style.js`, `scratchpad/type-imports-lit/D/check/eslint/runs/schema-probe/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/importx-default/out.txt`

### 6.13 A third style, top-level only when every specifier is a type, now exists in all three, and its docs give the side-effect reason. VERIFIED (eslint-plugin-import PR #3210, oxc PR #24502, import-x PR #617)

- **Citation:** aldeed, "Add a `prefer-top-level-if-only-type-imports` option for the `consistent-type-specifier-style` rule", eslint-plugin-import PR #3210, opened 2 Sep 2025, merged 10 Jun 2026 (commit b3cf7e12; not in a release: npm `latest` is still 2.32.0 of 20 Jun 2025); camc314, oxc PR #24502, merged 14 Jul 2026; thekhegay, import-x PR #617, merged 10 Nov 2026 (after 4.18.1), closing #501.
- **What it says:**
  - Upstream docs at the merge commit: the option requires a top-level import "when all named imports are types;" and "if some are values, then inline markers are allowed." "This is useful when you generally prefer inline but you are using TypeScript" "`verbatimModuleSyntax` and want all-type imports omitted by bundlers."
  - This is the style latin-1 asked for in #2676 in January 2023 and Brad Zacher declined as an option then (6.9).
  - Oxlint 1.90.0 supports it; import-x 4.17.1 (installed) doesn't.
- **Caveat:** Ultracite's installed import-x lacks the option; eslint-plugin-import users can't get it from npm yet.
- **For the post:** the style that avoids both empty imports and duplicate lines took three and a half years to reach the rule.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-pr-3210.json`, `scratchpad/type-imports-lit/D/src/import/b3cf7e12_docs_rules_consistent-type-specifier-style.md`, `scratchpad/type-imports-lit/D/src/gh/import-npm-disttags.txt`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24502.json`, `scratchpad/type-imports-lit/D/src/gh/importx-pr-617.json`, `scratchpad/type-imports-lit/D/src/oxc/oxlint_v1.90.0_import_consistent_type_specifier_style.rs`

### 6.14 `no-duplicates` treats `import type` and a value import as different unless `prefer-inline` is set; then it merges them inline. VERIFIED (PRs #2475, #2835, docs and source at v2.32.0); My check (6.25)

- **Citation:** snewcomer, "[New] `no-duplicates`: support inline type import with `prefer-inline` option", eslint-plugin-import PR #2475, merged 30 Dec 2022, released 2.27.0 (2023-01-11), for #2470; benkrejci, PR #2835, 2.28.0 (2023-07-27); `docs/rules/no-duplicates.md` and `src/rules/no-duplicates.js` at `v2.32.0`.
- **What it says:**
  - The docs: TS 4.5 allows mixed imports, and `prefer-inline` exists "to support fixing to an inline type import when duplicate imports are detected". Example: `import { CValue } from './papa-mia'` plus `import type { CType }` becomes `import { CValue, type CType }`.
  - Source: without `prefer-inline`, a top-level `import type` goes into a separate type map, and so does any import that has an inline `type` specifier; with it, all named imports share one map. So by default `import type { A }` next to `import { b }` is fine; with `prefer-inline` it is reported and merged.
  - When the first import is `import type { a }` and `prefer-inline` is on, the fix removes the `type` keyword and prefixes each existing name with `type`.
  - My check (import-x 4.17.1): default, `f.ts` isn't reported; with `prefer-inline`, it becomes `import { type A, b  } from "./m";`.
  - Brad Zacher's recipe in #2676/#6382: inline style without the TS flag = `consistent-type-specifier-style` plus `no-duplicates` `prefer-inline`; inline with the flag = `no-duplicates` `prefer-inline` plus the new side-effects rule; top-level, with or without the flag = `consistent-type-specifier-style` plus `no-duplicates` with `prefer-inline: false`.
- **Caveat:** the recipe was written before the fix-composition bug in 6.28 and 7.51 was known.
- **For the post:** `no-duplicates` is the rule that decides whether a type and a value from one module share a line.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-issue-2475.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2470.json`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_docs_rules_no-duplicates.md`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_src_rules_no-duplicates.js`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_CHANGELOG.md`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-6382.json`, `scratchpad/type-imports-lit/D/check/eslint/runs/nodup-default/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/nodup-inline/out.txt`

### 6.15 Five rule settings write `import { type x }`, the form `prefer-top-level` and `no-import-type-side-effects` exist to remove. VERIFIED (sources above); My check (6.25–6.27)

- **Citation:** the rule sources in 6.3, 6.11, 6.14, 6.16, 6.21; my runs in `scratchpad/type-imports-lit/D/check/`.
- **What it says:**
  - typescript-eslint `consistent-type-imports` with `fixStyle: 'inline-type-imports'`, and Oxlint's port with the same option: `import { Foo }` used as a type becomes `import { type Foo }`. Oxlint maintainers confirmed this is intended (#14823, 7.55).
  - `consistent-type-specifier-style: prefer-inline` (eslint-plugin-import, import-x, Oxlint): `import type { A }` becomes `import  { type A }` (with a double space in ESLint and Oxlint; 7.46).
  - `no-duplicates` with `prefer-inline`, when it merges `import type { x }` with `import { type y }` (the case fixed in #3033) the result is all-inline, `import { type x, type y }`.
  - Biome `useImportType` with `style: "inlineType"`: `import { Foo }` becomes `import { type Foo }`, and `import type { A }` is rewritten to `import { type A }`. Biome's default `auto` never leaves an all-inline import; it reports `import { type A, type B }` and fixes it to `import type { A, B }`.
  - Combining any of these with `no-import-type-side-effects` or `prefer-top-level` produces opposing fixes (6.28).
- **Caveat:** editors' auto-import settings can also write inline types; not checked.
- **For the post:** the conflict is between settings, not rules: each inline-style option is one half of a ping-pong.
- **Text:** `scratchpad/type-imports-lit/D/check/eslint/runs/tseslint-inline-noTI/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/importx-inline/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-ts-inline/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-cts-inline/out.txt`, `scratchpad/type-imports-lit/D/check/biome/runs/biome-inlineType/out.txt`, `scratchpad/type-imports-lit/D/check/biome/runs/biome-auto/out.txt`, `scratchpad/type-imports-lit/D/src/gh/import-issue-3033.json`

### 6.16 Oxlint's `typescript/consistent-type-imports` (June–July 2024) has no decorator handling at all, despite its option text. VERIFIED (Rust source at oxlint_v1.90.0, PRs #3895, #3984, #3645, #11171, #21415, issue #6835) Vendor (VoidZero/Oxc)

- **Citation:** mysteryven, oxc PR #3895 (report, merged 30 Jun 2024) and PR #3984 (fixer, merged 11 Jul 2024); mysteryven, PR #3645 (parser options for decorators), closed unmerged 31 Jul 2024; pumano, oxc #6835, 23 Oct 2024, closed not planned 14 Mar 2025; DonIsaac, PR #11171 (19 May 2025); babu-ch, PR #21415 (14 Apr 2026); `crates/oxc_linter/src/rules/typescript/consistent_type_imports.rs` at `oxlint_v1.90.0`.
- **What it says:**
  - Declared `typescript`, `style`, `conditional_fix`, `version = "0.5.2"`, ported from the v8.9.0 docs, with the same three options and defaults.
  - The `prefer` option doc still says "except when referenced by decorator metadata." but the decorator tests are commented out under "To support decorator in this rule, need" PR #3645. That PR was closed: "Add `parserOptions.*` only for this case is not really worthy IMO" and "Need a better way." On #6835 Boshen closed it citing typescript-eslint's blog: "The best option is turn this rule off if you have" both flags.
  - Differences from typescript-eslint: a default or namespace import named `React` is always skipped (#11171: "This is not a 'great' solution;" the alternative was reading tsconfig); `.vue`, `.svelte` and `.astro` files are skipped entirely ("This rule ignores `.astro`, `.svelte` and `.vue` files entirely."); diagnostics add a note on tree-shaking.
  - My check (6.26): Oxlint reports the decorated class's `import { Service }` and plain `--fix` rewrites it to `import type { Service }`, with or without `--type-aware`, even though the tsconfig sets both decorator flags.
- **Caveat:** Ultracite's Angular and NestJS Oxlint presets turn the rule off for this reason (worktree `config/oxlint/angular`, `config/oxlint/nestjs`), which section 9 covers.
- **For the post:** of the three linters, only typescript-eslint even tries to hold back on decorated classes.
- **Text:** `scratchpad/type-imports-lit/D/src/oxc/oxlint_v1.90.0_typescript_consistent_type_imports.rs`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-3895.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-3984.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-3645.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-3645-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-6835.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-6835-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-11171.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-21415.json`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-ts/out.txt`

### 6.17 Oxlint's `no-import-type-side-effects` (June 2024) was a safe fix until 1.94.0, which made it a suggestion because the fix can drop a module's evaluation. VERIFIED (Rust source at 1.90.0, PR #3699, issue #29491, PR #29502, release notes) Vendor (VoidZero/Oxc)

- **Citation:** mysteryven, "feat(linter): add `@typescript-eslint/no-import-type-side_effects`", oxc PR #3699, merged 17 Jun 2024; jasonkuhrt, "linter: `typescript/no-import-type-side-effects` safe fix drops a module's evaluation at runtime", oxc #29491, 13 Nov 2026; oxc-captain[bot], PR #29502, merged 15 Nov 2026; `oxlint_v1.94.0` release notes (16 Nov 2026).
- **What it says:**
  - At 1.90.0: `typescript`, `restriction` category, `fix` (safe), `version = "0.5.0"`; docs copy typescript-eslint's; diagnostic: "TypeScript will only remove the inline type specifiers which will leave behind" a side effect import.
  - #29491 (the body says it was written by an AI agent for the reporter) showed, with `verbatimModuleSyntax` and Node type stripping, that the fix stops `./m` from being evaluated, "so `--fix` can remove side effects the program relies on." The triage bot confirmed and rated it P2: "its `--fix` behavior can silently drop runtime side-effect imports".
  - #29502 changed the rule to `suggestion`, so `oxlint --fix` reports without rewriting and `--fix-suggestions` applies it. The 1.94.0 notes list "Make the import rewrite a suggestion (#29502)".
- **Caveat:** single report; the fix was written by a triage bot and merged within two days. Installed Oxlint is 1.90.0, which still has the safe fix (my runs).
- **For the post:** the same rewrite that removes an unwanted side effect removes a wanted one; Oxlint now treats it as a judgement call. typescript-eslint's rule is still an automatic fix.
- **Text:** `scratchpad/type-imports-lit/D/src/oxc/oxlint_v1.90.0_typescript_no_import_type_side_effects.rs`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-3699.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-29491.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-29491-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-29502.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-release-oxlint_v1.94.0.json`

### 6.18 Oxlint's `import/consistent-type-specifier-style` (May 2025) defaults to top-level, forces top-level for declaration files, and has the third style. VERIFIED (Rust source at 1.90.0, PRs #10858, #13023, #16979, #24502, issue #16649) Vendor (VoidZero/Oxc)

- **Citation:** huangtiandi1999, oxc PR #10858, merged 9 May 2025; lambda47, PR #13023 (fixer for top-level), merged 13 Aug 2025, fixes #12964; camchenry, PR #16979 (declaration files), merged 18 Dec 2025, fixes #16649; camc314, PR #24502, merged 14 Jul 2026.
- **What it says:**
  - Declared `import`, `style`, `conditional_fix`, `version = "0.16.11"`. Its "Why is this bad?" says mixing styles "forces readers to mentally switch contexts when scanning your imports." No side-effect reason.
  - Default `prefer-top-level` from the first PR (`unwrap_or_default()` to `PreferTopLevel`).
  - Imports of `.d.ts`-style declaration files must be top-level in every mode ("Type imports from declaration files must use top-level `import type` syntax."), and `prefer-inline` leaves them alone; this came from #16649, where the `prefer-inline` fix broke such imports (7.53).
  - The top-level fix rewrites the whole declaration with codegen, which is why my run's output switched to single quotes (`import type { A, B } from './m';`).
- **Caveat:** before #13023 `prefer-top-level` had no fixer.
- **For the post:** Oxlint documents the rule as readability, like eslint-plugin-import.
- **Text:** `scratchpad/type-imports-lit/D/src/oxc/oxlint_v1.90.0_import_consistent_type_specifier_style.rs`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-10858.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-13023.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-16979.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24502.json`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-cts-default/out.txt`

### 6.19 Oxlint's `import/no-duplicates` had no autofix until July 2026, and the type-merge bugs followed within days. VERIFIED (Rust source at 1.90.0, commit history, PRs #24273, #24466, #24030, #27671) Vendor (VoidZero/Oxc)

- **Citation:** oxc `crates/oxc_linter/src/rules/import/no_duplicates.rs` at `oxlint_v1.90.0` and its commit history (46 commits); Boshen, PR #2476 (23 Feb 2024); Dunqing, PR #2777 (type imports, 28 Mar 2024); cellison-figma, PR #24273 (autofix, 9 Jul 2026); camc314, PR #24466 (13 Jul 2026); Boshen, PR #24030 (3 Jul 2026, closes #19632); camchenry, PR #27671 (15 Oct 2026).
- **What it says:**
  - Declared `import`, `style`, `recommended`, `conditional_fix`, `version = "0.2.11"`; `recommended` since #27671 ("Copying recommended state from the upstream plugin."). `prefer-inline` (alias of `preferInline`, #16275) defaults to false; without it a top-level type import and a value import are separate.
  - #24466 "preserve type modifiers when merging imports", from a Next.js ecosystem CI failure four days after the autofix landed.
  - #24030: with `preferInline`, `import type { Foo }` next to `import './foo'` had been reported as a duplicate. "But a top-level `import type` is fully erased at runtime", so the side-effect import isn't redundant.
  - My check: with `prefer-inline`, `import type { A }` plus `import { b }` became `import { type A,b } from "./m";`.
- **Caveat:** Ultracite's Oxlint core sets `import/no-duplicates: "error"` without `prefer-inline` (worktree preset).
- **For the post:** Oxlint's port merges type and value imports only when asked to.
- **Text:** `scratchpad/type-imports-lit/D/src/oxc/oxlint_v1.90.0_import_no_duplicates.rs`, `scratchpad/type-imports-lit/D/src/gh/oxc-commits-import_no_duplicates.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24273.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24466.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24030.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-27671.json`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-nodup-inline/out.txt`

### 6.20 Oxlint's `consistent-type-exports` runs in tsgolint (February 2026) and matches typescript-eslint on re-exports. VERIFIED (oxc and tsgolint sources, PRs) Vendor (VoidZero/Oxc); My check (6.26)

- **Citation:** oxc-project/tsgolint `internal/rules/consistent_type_exports/consistent_type_exports.go` at `v7.0.2005` (added in tsgolint #675, 14 Feb 2026); camc314, oxc PR #19440, merged 16 Feb 2026; PR #20917 moved it from nursery to style (31 Mar 2026); oxc stub at `oxlint_v1.90.0`.
- **What it says:**
  - The oxc side only declares the rule (`ConsistentTypeExports(tsgolint)`, `style`, `fix`) and its one option, `fixMixedExportsWithInlineTypeSpecifier`. The Go rule walks the exported symbol through aliases with the TypeScript checker (`SymbolFlagsValue`, `SymbolFlagsAlias`, type-only declarations).
  - My check with `--type-aware`: "All exports in the declaration are only used as types." for `export { Foo } from "./m"`, fixed to `export type { Foo }`; the mixed re-export was split into `export type { Foo } from "./m";` and `export { bar } from "./m";`. Run without `--type-aware`, the same config reported nothing for either re-export.
- **Caveat:** tsgolint is a separate binary and its version tags differ from Oxlint's.
- **For the post:** the export rule needs the type checker in every linter that has it; Biome's version skips re-exports from other files (6.23).
- **Text:** `scratchpad/type-imports-lit/D/src/oxc/tsgolint-v7.0.2005-consistent_type_exports.go`, `scratchpad/type-imports-lit/D/src/oxc/oxlint_v1.90.0_typescript_consistent_type_exports.rs`, `scratchpad/type-imports-lit/D/src/gh/tsgolint-commits-cte.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-19440.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-20917.json`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-ts-TA/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-ts-TA-without-flag/out.txt`

### 6.21 Biome's `useImportType` (1.5.0, January 2024) has always been a safe fix and recommended; `style` arrived in 2.0. VERIFIED (source at seven tags, 1.x and 2.x changelogs)

- **Citation:** Biome `use_import_type.rs` at `cli/v1.5.0`, `cli/v1.6.0`, `cli/v1.8.3`, `cli/v1.9.4`, `@biomejs/biome@2.0.0`, `@biomejs/biome@2.3.0`, `@biomejs/biome@2.6.4`; `CHANGELOG.md` at `cli/v1.9.4` and `packages/@biomejs/biome/CHANGELOG.md` at `@biomejs/biome@2.6.4`; `biome_rule_options/src/use_import_type.rs` at 2.6.4.
- **What it says:**
  - 1.5.0 (2024-01-08), credited to @Conaclos, in nursery, inspired by `consistent-type-imports`. The entry shows a mixed import fixed to inline `type` and says "Also, the rule groups type-only imports:" (`import { type A, type B }` to `import type { A, B }`).
  - 1.6.0 (2024-03-08) promoted it to `style/useImportType` and removed `nursery/useGroupedTypeImport`, which it covers.
  - `fix_kind: FixKind::Safe` and `recommended: true` at every tag checked, from 1.5.0 to 2.6.4. In 2.x the default severity is a warning.
  - 2.0.0 added `style`: "The rule now allows enforcing an import style for importing types." Values: `auto` (default: `import type` when all are types, inline when mixed), `inlineType`, `separatedType`.
  - The docs' rationale: types marked this way can be dropped "without looking for their definition" and some modules are not loaded; and "If you use the TypeScript Compiler (TSC) to compile your code into JavaScript," you can disable it, "as TSC can remove imports only used as types." It recommends `verbatimModuleSyntax` with the rule.
  - It skips `.d.ts` files (2.0.0, #4416) and imports with attributes, honours `jsxRuntime: reactClassic`, and reads Svelte, Vue and Astro templates through an embedded service.
- **Caveat:** the lead that the fix kind changed between Biome 1 and 2 is wrong at every tag checked (see the list at the end).
- **For the post:** Biome is the only one of the three with the rule on by default, and its default style already avoids the empty import.
- **Text:** `scratchpad/type-imports-lit/D/src/biome/cli-v1.5.0-use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/cli-v1.6.0-use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/cli-v1.8.3-use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/cli-v1.9.4-use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/biome-2.0.0-use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/biome-2.3.0-use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/2.6.4_style_use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/2.6.4_src_use_import_type.rs`, `scratchpad/type-imports-lit/D/src/biome/cli-v1.9.4_CHANGELOG.md`, `scratchpad/type-imports-lit/D/src/biome/2.6.4_CHANGELOG.md`

### 6.22 Biome doesn't handle decorators either; its docs say to turn the rule off, and an option to keep metadata imports is an open PR. VERIFIED (docs in source, commit 421e953a, issue #2003, PR #10496)

- **Citation:** Biome `use_import_type.rs` at 2.6.4, "Caveat with TypeScript experimental decorators"; commit 421e953a, "docs(useImportType): add caveat section (#2444)", 14 Apr 2024; Conaclos on biomejs/biome #2003, 31 Mar 2024; LucasPreviato, "feat(useImportType): preserve decorator metadata imports", PR #10496, opened 28 May 2026, open.
- **What it says:**
  - "Since Biome doesn't know how a decorator is implemented," it can't see that a type import is a value in the generated code. "We haven't found a way to support this pattern yet." "We recommend disabling this rule when using such decorators."
  - The caveat was added after the NestJS reports of March 2024 (section 4). Conaclos cited typescript-eslint's 2024 blog and wrote: "I think it would be a mistake to waste time on this." "I recommend that users simply disable the rule in projects that use frameworks" built on legacy decorators.
  - PR #10496 proposes a `preserveDecoratorMetadata` option that keeps value imports for constructor parameter types; it is not in 2.6.4.
  - My check (6.27): Biome reports the decorated class's import and `biome lint --write` (safe fixes only) rewrites it to `import type { Service }`; with `inlineType` it writes `import { type Service }`.
- **Caveat:** the source has no reference to `emitDecoratorMetadata` or `experimentalDecorators`; the rule doesn't read tsconfig for this.
- **For the post:** a safe fix that changes decorator metadata is the clearest case where a safe fix means only that the syntax stays valid.
- **Text:** `scratchpad/type-imports-lit/D/src/biome/2.6.4_style_use_import_type.rs`, `scratchpad/type-imports-lit/D/src/gh/biome-commits-useimporttype-1.8.3.json`, `scratchpad/type-imports-lit/D/src/gh/biome-issue-2003-comments.json`, `scratchpad/type-imports-lit/D/src/gh/biome-issue-10496.json`, `scratchpad/type-imports-lit/D/check/biome/runs/biome-auto/out.txt`

### 6.23 Biome's `useExportType` checks only local names, so it misses the re-export case the other two need type information for. VERIFIED (source at 2.6.4, changelog); My check (6.27)

- **Citation:** Biome `use_export_type.rs` and `biome_rule_options/src/use_export_type.rs` at 2.6.4; changelog entries for 1.5.0, 1.9.4 and 2.5.0 (#10561).
- **What it says:**
  - Added in 1.5.0 with `useImportType`; `fix_kind: FixKind::Safe`, `recommended: true` at every tag checked.
  - "This rule checks only names declared in the current file." It doesn't report `export { TypeA } from "./mod.ts"`.
  - 1.9.4: both rules "now report useless inline type qualifiers" such as `import type { type A, B }`. 2.5.0 added `style` to `useExportType`: "This is the same option as the one provided by `useImportType`."
  - My check: `export { Foo } from "./m"` and `export { Foo, bar } from "./m"` produced no diagnostics.
- **Caveat:** none beyond the scope limit.
- **For the post:** without a type checker, a linter can only check exports of things it can see declared.
- **Text:** `scratchpad/type-imports-lit/D/src/biome/2.6.4_style_use_export_type.rs`, `scratchpad/type-imports-lit/D/src/biome/cli-v1.9.4_CHANGELOG.md`, `scratchpad/type-imports-lit/D/src/biome/2.6.4_CHANGELOG.md`, `scratchpad/type-imports-lit/D/check/biome/runs/biome-auto/out.txt`

### 6.24 TypeScript's own check is `verbatimModuleSyntax` (or `isolatedModules` for re-exports), with no autofix on the command line. My check (local run); see 2.7–2.9 for the flag's history

- **Citation:** my run of `tsc` 6.0.3 on the cases, 18 Nov 2026.
- **What it says:**
  - With `--verbatimModuleSyntax`: "'Foo' is a type and must be imported using a type-only import" (TS1484) for the plain and mixed imports, and TS1205 for both re-exports. No error for the decorated class, whether it imports `Service` as a value or with `import type`.
  - With `--isolatedModules` only the re-exports fail (TS1205).
  - typescript-eslint's comparison table says the compiler check "Fails `tsc` build; cannot be auto-fixed on the command-line" (6.5).
- **Caveat:** TS 6.0.3 only.
- **For the post:** the compiler and the lint rule catch the same plain cases; the linter adds fixes and style, the compiler adds type information.
- **Text:** `scratchpad/type-imports-lit/D/check/tsc/tsc-diagnostics.txt`, `scratchpad/type-imports-lit/D/src/tseslint/docs-consistent-type-imports-v8.72.1.mdx`

### 6.25 My check: ESLint with typescript-eslint and import-x, case by case. My check (local run)

- **Citation:** ESLint 10.14.0, @typescript-eslint 8.72.1, eslint-plugin-import-x 4.17.1, TypeScript 6.0.3, node 24.14.1; config `scratchpad/type-imports-lit/D/check/eslint/eslint.config.mjs`, runner `scratchpad/type-imports-lit/D/check/scripts/run-eslint.sh`, inputs `scratchpad/type-imports-lit/D/check/cases/`. Each run: report, then three `--fix` runs with diffs.
- **What it says:**
  - (a) `import { Foo }` used as a type: "All imports in the declaration are only used as types. Use `import type`"; fixed to `import type { Foo }`. With `fixStyle: 'inline-type-imports'`: `import { type Foo }`.
  - (b) mixed: "Imports 'Foo' are only used as type"; split into `import type { Foo} from "./m";` plus `import { bar } from "./m";` (inline style: `import { type Foo, bar }`).
  - (c) `import { type A, type B }`: `no-import-type-side-effects` fixes it to `import type { A, B }`; import-x `consistent-type-specifier-style` at bare `"error"` does the same.
  - (d) `export { Foo } from "./m"`: only `consistent-type-exports` with `projectService` reports it ("All exports in the declaration are only used as types. Use `export type`").
  - (e) decorated class with tsconfig `experimentalDecorators` and `emitDecoratorMetadata`: reported and fixed to `import type { Service }` without type information; silent with `parserOptions.emitDecoratorMetadata`/`experimentalDecorators`; silent with `projectService`; reported again with `projectService`, a tsconfig without the flags and both parser options (runs `tseslint-noTI`, `tseslint-noTI-PO`, `tseslint-TI`, `tseslint-TI-nodeco-PO`).
  - (f) `import type { A }` plus `import { b }`: `no-duplicates` silent by default; with `prefer-inline` merged into `import { type A, b  } from "./m";`.
  - Every single-rule and top-level run converged on the first `--fix`.
- **Caveat:** illustrations on nine small files, not rates.
- **For the post:** typescript-eslint's decorator guard works only when the linter can see the flags, from tsconfig with type information or from parser options without it.
- **Text:** `scratchpad/type-imports-lit/D/check/eslint/runs/tseslint-noTI/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/tseslint-noTI-PO/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/tseslint-TI/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/tseslint-TI-nodeco-PO/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/tseslint-inline-noTI/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/importx-default/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/nodup-default/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/nodup-inline/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/all-top/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/all-top-TI/out.txt`, `scratchpad/type-imports-lit/D/check/versions.txt`

### 6.26 My check: Oxlint 1.90.0 matches typescript-eslint's reports except on decorators. My check (local run)

- **Citation:** Oxlint 1.90.0, oxlint-tsgolint 7.0.2005; configs `scratchpad/type-imports-lit/D/check/oxlint/configs/`, runner `scratchpad/type-imports-lit/D/check/scripts/run-oxlint.sh`.
- **What it says:**
  - (a)–(c) same reports and fixes as ESLint, including `import type { Foo} from "./m";` for the split. The top-level style fix printed `import type { A, B } from './m';`.
  - (d) only with `--type-aware` (6.20).
  - (e) reported and fixed to `import type { Service }` with or without `--type-aware`.
  - (f) `no-duplicates` silent by default; with `prefer-inline`, `import { type A,b } from "./m";`.
  - Single-rule runs and the top-level combination converged on the first `--fix`.
- **Caveat:** Oxlint applies one fix pass per run (7.55), so converging here means a second run changed nothing.
- **For the post:** on decorators Oxlint behaves like typescript-eslint did before 2021.
- **Text:** `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-ts/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-ts-TA/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-ts-inline/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-cts-default/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-nodup-default/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-nodup-inline/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-all-top/out.txt`

### 6.27 My check: Biome 2.6.4 fixes everything with `--write` and has nothing more under `--unsafe`. My check (local run)

- **Citation:** Biome 2.6.4; configs `biome.json` files under `scratchpad/type-imports-lit/D/check/biome/configs/` (one each for `auto`, `inlineType` and `separatedType`) with only `useImportType` and `useExportType`; runner `scratchpad/type-imports-lit/D/check/scripts/run-biome.sh`.
- **What it says:**
  - `auto`: (a) `import type { Foo }`; (b) `import { type Foo, bar }` ("Safe fix: Add inline type keywords."); (c) `import type { A, B }`; (e) `import type { Service }`; `h.ts`'s `import { type A }` became `import type { A }`. Five files fixed by `--write`; `--write --unsafe` then reported "No fixes applied."
  - `separatedType`: the mixed import became `import type { Foo, } from "./m";` plus `import { bar } from "./m";`.
  - `inlineType`: (a) `import { type Foo }`; `import type { A }` in `f.ts` and `g.ts` became `import { type A }`.
  - (d) re-exports: no diagnostics in any style. (f) nothing (no `no-duplicates` counterpart enabled).
  - Biome 2.6.4 warned that the `recommended` field "has been deprecated" in favour of `preset`.
- **Caveat:** formatter off, so spacing is the rule's own output.
- **For the post:** Biome's default reaches the top-level-when-all-types style that the other ecosystems needed a new option for (6.13).
- **Text:** `scratchpad/type-imports-lit/D/check/biome/runs/biome-auto/out.txt`, `scratchpad/type-imports-lit/D/check/biome/runs/biome-separatedType/out.txt`, `scratchpad/type-imports-lit/D/check/biome/runs/biome-inlineType/out.txt`

### 6.28 My check: inline-style settings plus the side-effects rule never converge, and one ESLint pair writes a value into `import type`. My check (local run)

- **Citation:** runs `inline-vs-side-effects`, `side-effects-plus-nodup-inline` and `all-inline` (ESLint) and `ox-inline-vs-side-effects`, `ox-side-effects-plus-nodup-inline`, `ox-all-inline` (Oxlint); tsc 6.0.3 on the fixed files.
- **What it says:**
  - `consistent-type-specifier-style: prefer-inline` plus `no-import-type-side-effects`: in Oxlint each `--fix` run flips the file (`import type { A }` to `import  { type A }` and back), gaining a space every second run; in ESLint each run stops at the 10-pass limit with five more spaces (`import type                { A }` after three runs). Neither converges.
  - ESLint, `no-import-type-side-effects` plus import-x `no-duplicates` `prefer-inline`, file `import { type A }` + `import { b }` from one module: a single `--fix` wrote `import type { A, b  } from "./m";`. The two fixes don't overlap (one edits the `type` keywords, the other appends `b` and deletes the second line), so ESLint applies both in one pass. tsc: "'b' cannot be used as a value because it was imported using 'import type'." (TS1361).
  - Oxlint 1.90.0 with the same pair applied the side-effects fix first and merged on the next run, ending at the valid `import { type A,b } from "./m";` (the conflict guard from #27409, 7.51).
  - ESLint with all four inline-style settings plus the side-effects rule ended, after three runs, with `import type                { A, b  }` in one file and `import                { type A, type b  }` in another; tsc failed both with TS1361.
- **Caveat:** these are configurations nobody should ship, built to show the interaction; the ESLint composition bug has no upstream report that I found.
- **For the post:** each rule's fix is correct alone; the bugs appear when two fixes compose. Pick one style and turn the opposing options off.
- **Text:** `scratchpad/type-imports-lit/D/check/eslint/runs/inline-vs-side-effects/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/side-effects-plus-nodup-inline/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/side-effects-plus-nodup-inline/tsc-after-fix.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/all-inline/out.txt`, `scratchpad/type-imports-lit/D/check/eslint/runs/all-inline/tsc-after-fix.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-inline-vs-side-effects/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-side-effects-plus-nodup-inline/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-all-inline/out.txt`

### 6.29 My check: the decorator fix changes the emitted metadata from `[Service]` to `[Function]`. My check (local run)

- **Citation:** tsc 6.0.3, `experimentalDecorators` and `emitDecoratorMetadata`, `e.ts` and `e-typeimport.ts`, default and `--verbatimModuleSyntax` emit.
- **What it says:**
  - With `import { Service }`, the emit keeps the import and records `__metadata("design:paramtypes", [Service])`.
  - With `import type { Service }` (what all three linters' fixes write without decorator awareness), the import is gone and the metadata is `[Function]`, in both modes, with no compiler error.
- **Caveat:** what that does at runtime depends on the DI container (section 4).
- **For the post:** the broken fix type-checks and compiles; only the runtime notices.
- **Text:** `scratchpad/type-imports-lit/D/check/tsc/tsc-emit.txt`, `scratchpad/type-imports-lit/D/check/tsc/tsc-diagnostics.txt`

---

**What popular configs pick, in one table** (6.30–6.49 have the details and reasons):

| Source (pinned) | `consistent-type-imports` | `fixStyle` / specifier style | `consistent-type-exports` | `no-import-type-side-effects` | tsconfig |
| --- | --- | --- | --- | --- | --- |
| typescript-eslint 8.72.1 shared configs | not in any | n/a | not in any | not in any | n/a |
| gts v7.0.0 (Google) | not set | n/a | not set | not set | `module: commonjs`, no `isolatedModules` or `verbatimModuleSyntax` |
| ts-standard 12.0.2 / neostandard v0.14.1 | not set | n/a | not set | not set | n/a |
| eslint-config-love v158.0.0 | error, `prefer: type-imports` | inline | error, inline fix | error | n/a |
| eslint-config-xo v8.0.0 | error | inline; `import-x/no-duplicates` `prefer-inline` | error, inline fix | not set | n/a |
| @antfu/eslint-config v10.0.0 | error, `prefer: type-imports` | separate; `consistent-type-specifier-style: top-level` | not set | error | n/a |
| @vercel/style-guide v6.0.0 (archived) | warn | inline | warn, inline fix | not set | no module flags |
| create-t3-app 7.40.0 | warn | inline | not set | not set | `isolatedModules` and `verbatimModuleSyntax` |

### 6.30 typescript-eslint's own docs: none of the three rules carries a config badge, and the docs now say `verbatimModuleSyntax` users may keep or drop `consistent-type-imports`. VERIFIED (rule source and docs at v8.72.1; live site, which served v8.73.0)

- **Citation:** typescript-eslint, rule pages `consistent-type-imports`, `consistent-type-exports`, `no-import-type-side-effects`, and the TypeScript FAQ, at tag `v8.72.1`. https://github.com/typescript-eslint/typescript-eslint/tree/v8.72.1/packages/eslint-plugin/docs/rules ; live pages https://typescript-eslint.io/rules/consistent-type-imports/ (read 17 Nov 2026).
- **What it says:**
  - The rule sources' `meta.docs` have no `recommended` key at v8.72.1; the live pages show only the 🔧 fixable badge (and 💭 type information for `consistent-type-exports`). A rule that is in a shared config shows a ✅ line instead, for example `no-explicit-any`: "Extending 'plugin:@typescript-eslint/recommended' in an ESLint configuration enables this rule."
  - `consistent-type-imports` defaults: `prefer: 'type-imports'`, `fixStyle: 'separate-type-imports'`, `disallowTypeAnnotations: true`. The inline style "is only available in TypeScript 4.5 and onwards."
  - On using the rule with `verbatimModuleSyntax`: the two "can lead to conflicting and/or duplicate reports on the same import." "If TypeScript's diagnostics are sufficient for your project," "you can disable this rule to avoid duplicate reports." That wording came from PR #12194 (merged 6 Jul 2026), which says it "no longer recommends disabling the rule outright".
  - The FAQ lists `no-import-type-side-effects` as "a rule that is only needed at all when using" `verbatimModuleSyntax`.
  - "When Not To Use It": "inconsistent style can harm readability in a project. We recommend picking a single option".
- **Caveat:** 6.6 covers the configs' history; this entry only records what the pages show. The live site was one release ahead of the pinned tag; the quoted paragraphs are in both.
- **For the post:** the plugin that owns the rules treats them as opt-in style rules, and its docs frame the overlap with `verbatimModuleSyntax` as a choice between autofix and duplicate reports.
- **Text:** `scratchpad/type-imports-lit/E/src/tseslint/rule-consistent-type-imports-v8.72.1.ts`, `scratchpad/type-imports-lit/E/src/tseslint/rule-consistent-type-exports-v8.72.1.ts`, `scratchpad/type-imports-lit/E/src/tseslint/rule-no-import-type-side-effects-v8.72.1.ts`, `scratchpad/type-imports-lit/E/src/tseslint/docs-consistent-type-imports-v8.72.1.mdx`, `scratchpad/type-imports-lit/E/text/tseslint-site-consistent-type-imports.txt`, `scratchpad/type-imports-lit/E/text/tseslint-site-consistent-type-exports.txt`, `scratchpad/type-imports-lit/E/text/tseslint-site-no-import-type-side-effects.txt`, `scratchpad/type-imports-lit/E/text/tseslint-site-no-explicit-any.txt`, `scratchpad/type-imports-lit/E/src/tseslint/faqs-TypeScript-v8.72.1.mdx`, `scratchpad/type-imports-lit/E/src/tseslint/pr-12194.json`

### 6.31 The typescript-eslint blog's case for the rules is side effects and isolated transpilers. ANECDOTAL (project blog post at v8.72.1)

- **Citation:** Josh Goldberg, "Consistent Type Imports and Exports: Why and How", typescript-eslint blog, 24 Feb 2023 (merged 1 Mar 2023, PR #6238). https://typescript-eslint.io/blog/consistent-type-imports-and-exports-why-and-how ; source at `v8.72.1`: `packages/website/blog/2023-02-24-consistent-type-exports-and-imports-why-and-how.md`.
- **What it says:**
  - Two reasons. Side effects: "When projects include modules that cause side effects, the order of module imports matters." Isolated transpilation: tools "such as Babel, SWC, or Vite that don't have access to type information"; "Isolated module transpilers can't know whether an import is of a type," "a value, or both."
  - It recommends pairing the rules with `import/consistent-type-specifier-style` and `import/no-duplicates`, so imports are "written in a standard, predictable style".
  - On `verbatimModuleSyntax`: "you will not want to leave behind an unnecessary side effect import" in most cases, which is why `no-import-type-side-effects` exists.
- **Caveat:** written by a maintainer of the rules; no measurements.
- **For the post:** the canonical "why" from the rules' authors, and the source the rule pages link to.
- **Text:** `scratchpad/type-imports-lit/E/src/tseslint/blog-2023-02-24-consistent-type-exports-and-imports-v8.72.1.md`

### 6.32 Google's TypeScript style guide allows `import type`, requires `export type` for type re-exports, and as of October 2026 bans `import()` types. VERIFIED (guide at a pinned SHA); Vendor (Google)

- **Citation:** Google, _Google TypeScript Style Guide_, "Import and export type", google/styleguide `tsguide.md` at `52f2e7406a802778e44b92694d4aead252b09091` (13 Nov 2026). https://github.com/google/styleguide/blob/52f2e7406a802778e44b92694d4aead252b09091/tsguide.md ; the earlier HTML at `e4d272eb151a` for comparison.
- **What it says:**
  - Import type is permissive: you "may use" it for symbols used only as types; "Use regular imports for values". Both `import type {Foo}` and `import {type Foo, Bar}` appear in the good-code example, so the guide doesn't pick a specifier style.
  - The reason is the two compiler modes. In development "The compiler transpiles to JavaScript without full type information." "This is much faster," "but requires" type imports "in certain cases." In production it "ensures" they are "used correctly."
  - Export type is required when re-exporting a type; it "is useful to allow type re-exports in file-by-file transpilation." The guide warns it gives no API guarantee: "downstream code might still" "import an API through a different path."
  - New since the guide moved to Markdown (commit `5d6fa5e1`, 29 Oct 2026, "This also contains some internal changes that weren't exported previously."): a section on the dynamic `import()` type says not to use `import()` inside type annotations, and to use `import type` "If you need to ensure that the import is always elided".
- **Caveat:** the HTML version at `e4d272eb` (15 Sep 2026) has the import-type and export-type sections but not the `import()` one.
- **For the post:** Google's rule is "may", not "must", for imports and "must" for type re-exports, both justified by per-file transpilation.
- **Text:** `scratchpad/type-imports-lit/E/text/google-tsguide-52f2e740.md`, `scratchpad/type-imports-lit/E/src/google/commit-5d6fa5e1.json`, `scratchpad/type-imports-lit/E/text/google-tsguide-e4d272eb.txt`, `scratchpad/type-imports-lit/E/src/google/tsguide-SHA.txt`

### 6.33 gts, Google's shareable config, sets none of these rules or flags. VERIFIED (source at v7.0.0); Vendor (Google)

- **Citation:** google/gts `v7.0.0` (5 Dec 2025), `src/index.js` and `tsconfig-google.json`. https://github.com/google/gts/blob/v7.0.0/src/index.js
- **What it says:** the TypeScript block extends `tseslint.configs.recommended` and adds overrides, none of them about type imports. `tsconfig-google.json` sets `"module": "commonjs"` and neither `isolatedModules` nor `verbatimModuleSyntax`.
- **For the post:** Google's style guide and Google's tooling disagree in emphasis: the guide asks for `export type`, the config enforces nothing.
- **Text:** `scratchpad/type-imports-lit/E/src/gts/v7.0.0-src-index.js`, `scratchpad/type-imports-lit/E/src/gts/v7.0.0-tsconfig-google.json`

### 6.34 Standard's line splits: ts-standard and neostandard set nothing; eslint-config-love turns on all three rules with the inline style. VERIFIED (npm metadata, source and changelog at pinned tags)

- **Citation:** ts-standard 12.0.2 (npm, published 20 Dec 2022, still `latest`); eslint-config-standard-with-typescript 23.0.0 `lib/index.js` (unpkg); neostandard `v0.14.1` (`2d12a3e6`); eslint-config-love `v158.0.0` (`fc9a5b5f`, 2 Oct 2026), `src/plugin-usage/typescript-eslint.ts` and `CHANGELOG.md`; PRs mightyiam/eslint-config-love #1044 and #1680.
- **What it says:**
  - ts-standard 12.0.2 depends on `eslint-config-standard-with-typescript` `^23.0.0`, whose `lib/index.js` has no `consistent-type-imports`. neostandard's configs (`lib/ts.js`, `lib/configs/*.js`) have none of the rules.
  - eslint-config-love: `consistent-type-imports` with `prefer: 'type-imports'`, `disallowTypeAnnotations: true`, `fixStyle: 'inline-type-imports'`; `consistent-type-exports` with `fixMixedExportsWithInlineTypeSpecifier: true`; `no-import-type-side-effects` on.
  - History: the type rules arrived as a breaking change in eslint-config-standard-with-typescript 32.0.0 (24 Jan 2023, PR #1044, commit `bf0f96f`); `no-import-type-side-effects` in love 59.0.0 (23 Jul 2024, PR #1680). Neither PR states a reason; #1044's body is the changelog line and a co-author credit.
- **Caveat:** "Standard" for TypeScript now means two different things; ts-standard has had no release since December 2022.
- **For the post:** the most opinionated Standard-family config picks inline specifiers plus the side-effect rule, without a recorded rationale.
- **Text:** `scratchpad/type-imports-lit/E/src/standard/npm-ts-standard.json`, `scratchpad/type-imports-lit/E/src/standard/npm-ts-standard-time.json`, `scratchpad/type-imports-lit/E/src/standard/eswt-23.0.0-lib-index.js`, `scratchpad/type-imports-lit/E/src/standard/neostandard-v0.14.1-lib_ts.js`, `scratchpad/type-imports-lit/E/src/love/v158.0.0-plugin-usage-typescript-eslint.ts`, `scratchpad/type-imports-lit/E/src/love/v158.0.0-CHANGELOG.md`, `scratchpad/type-imports-lit/E/src/love/pr-1044.json`, `scratchpad/type-imports-lit/E/src/love/commit-bf0f96f.json`, `scratchpad/type-imports-lit/E/src/love/pr-1680.json`

### 6.35 XO enforces inline type specifiers, and its maintainers went from doubting type imports to using them. VERIFIED (source at v8.0.0; issues); the discussion is ANECDOTAL

- **Citation:** xojs/eslint-config-xo `v8.0.0` (`cbc6c49a`, 16 Nov 2026), `source/typescript-rules.js` and `source/plugins-rules.js` (eslint-config-xo-typescript is archived and "has been merged into" eslint-config-xo); xojs/xo issue #539 (10 May 2021); xojs/eslint-config-xo-typescript issue #64 (8 Nov 2022) and commits `a1bdfc90`, `829d012e` (23 Aug 2022), `e41f4a40` (17 Nov 2022).
- **What it says:**
  - Config: `consistent-type-imports` with `fixStyle: 'inline-type-imports'`; `consistent-type-exports` with `fixMixedExportsWithInlineTypeSpecifier: true`; `import-x/no-duplicates` with `'prefer-inline': true`; ESLint's `no-duplicate-imports` off because "`import-x/no-duplicates` works better with TypeScript." No `no-import-type-side-effects`.
  - #539 (jonahsnider) asked for the rule with `prefer: type-imports`, also as a workaround for an `import/no-cycle` bug that treats a plain import of a type as a value. Sindre Sorhus replied: "I'm not sure about forcing type-imports." "According to the TypeScript maintainers, you should rarely need them", linking a tweet by the account drosenwasser (captured by the Wayback Machine on 18 Jan 2020).
  - In 2022 fregante listed reasons: "it makes type-only imports explicit" and "it ensures that you're actually importing only a type and nothing else". Sorhus: "I agree. I use type imports a lot now too." The rule went in on 23 Aug 2022.
  - The inline style followed in Nov 2022 (#64): fregante "had disabled it until now because the autofix duplicated module imports", which typescript-eslint's new `fixStyle` option fixed.
- **Caveat:** the linked tweet could not be opened (Wayback returned no capture body), so what it said is unverified.
- **For the post:** a compact history of the change in community opinion: from rarely needed (2021) to on by default (2022), with the inline style chosen to stop the fixer from splitting imports.
- **Text:** `scratchpad/type-imports-lit/E/src/xo/eslint-config-xo-v8.0.0-typescript-rules.js`, `scratchpad/type-imports-lit/E/src/xo/eslint-config-xo-v8.0.0-plugins-rules.js`, `scratchpad/type-imports-lit/E/src/xo/eslint-config-xo-v8.0.0-javascript-rules.js`, `scratchpad/type-imports-lit/E/src/xo/xo-ts-readme-main.md`, `scratchpad/type-imports-lit/E/src/xo/xo-issue-539.json`, `scratchpad/type-imports-lit/E/src/xo/xo-issue-539-comments.json`, `scratchpad/type-imports-lit/E/src/xo/xo-ts-issue-64.json`, `scratchpad/type-imports-lit/E/src/xo/xo-ts-issue-64-comments.json`

### 6.36 Anthony Fu's config picks the opposite style: separate `import type` statements, top-level specifiers, and the side-effect rule. VERIFIED (source at v10.0.0; commits)

- **Citation:** antfu/eslint-config `v10.0.0` (23 Oct 2026, `54bfe6ac`), `src/configs/typescript.ts`, `src/configs/imports.ts`; commits `dd76d5d8` (12 Dec 2021), `cb4b7b9f` (9 Oct 2023, closes issue #227), `22bf2bd0` (25 Jan 2025), `db5a31d8` (7 Jun 2025).
- **What it says:**
  - `ts/consistent-type-imports`: `prefer: 'type-imports'`, `fixStyle: 'separate-type-imports'`, `disallowTypeAnnotations: false`. `ts/no-import-type-side-effects`: error. `import/consistent-type-specifier-style`: `['error', 'top-level']` from eslint-plugin-import-lite. No `consistent-type-exports`.
  - History: "enforce import type" since Dec 2021; the side-effect rule after issue #227, which cites the `verbatimModuleSyntax` behaviour where `import { type A, type B } from 'mod'` becomes `import 'mod'`; `fixStyle` and the top-level specifier style were added together in Jan 2025 (a direct commit, no PR or stated reason); commit `db5a31d8` (Jun 2025) removed import-x; at v10.0.0 the rule is set with import-lite's `top-level` value.
- **For the post:** two widely used opinionated configs (XO and antfu) pick opposite specifier styles; both enforce type imports.
- **Text:** `scratchpad/type-imports-lit/E/src/antfu/antfu-v10.0.0-typescript.ts`, `scratchpad/type-imports-lit/E/src/antfu/antfu-v10.0.0-imports.ts`, `scratchpad/type-imports-lit/E/src/antfu/antfu-v10.0.0-src-plugins.ts`, `scratchpad/type-imports-lit/E/src/antfu/antfu-commit-dd76d5d.json`, `scratchpad/type-imports-lit/E/src/antfu/antfu-issue-227.json`, `scratchpad/type-imports-lit/E/src/antfu/antfu-commit-22bf2bd.json`, `scratchpad/type-imports-lit/E/src/antfu/antfu-commit-db5a31d.json`

### 6.37 Vercel's archived style guide and create-t3-app both pick inline type imports at warn; t3 also turns on `verbatimModuleSyntax`. VERIFIED (source at pinned tags); Vendor (Vercel) for the style guide

- **Citation:** vercel/style-guide `v6.0.0` (5 Mar 2024; repository archived), `eslint/rules/typescript/index.js`, `typescript/tsconfig.base.json`; t3-oss/create-t3-app `create-t3-app@7.40.0` (5 Nov 2025), `cli/template/extras/config/_eslint.base.js`, `cli/template/base/tsconfig.json`.
- **What it says:**
  - Vercel: `consistent-type-imports` `'warn'` with `disallowTypeAnnotations: true`, `fixStyle: 'inline-type-imports'`, `prefer: 'type-imports'`; `consistent-type-exports` `'warn'` with the inline fix. Its tsconfig base sets no module flags.
  - create-t3-app: `consistent-type-imports` `"warn"` with `prefer: "type-imports"`, `fixStyle: "inline-type-imports"`; the base tsconfig sets `"isolatedModules": true` and `"verbatimModuleSyntax": true`.
- **Caveat:** no reasons recorded in either file.
- **Text:** `scratchpad/type-imports-lit/E/src/configs/vercel-style-guide-v6.0.0-eslint_rules_typescript_index.js`, `scratchpad/type-imports-lit/E/src/configs/vercel-style-guide-v6.0.0-typescript_tsconfig.base.json`, `scratchpad/type-imports-lit/E/src/configs/t3-7.40.0-cli_template_extras_config__eslint.base.js`, `scratchpad/type-imports-lit/E/src/configs/t3-7.40.0-cli_template_base_tsconfig.json`

### 6.38 @tsconfig/bases: 5 of 31 bases set `verbatimModuleSyntax`, and `strictest` doesn't, because the flag breaks CommonJS. VERIFIED (all 31 files at a pinned SHA; issues and PRs)

- **Citation:** tsconfig/bases at `6aab4818dd3c0793d622aa2b7587f663c2762f82` (11 Nov 2026), `bases/*.json`; PRs and issues #160, #161, #165, #168, #175, #214, #230, #291, #292, #293, #322.
- **What it says:**
  - My count of the 31 bases: `verbatimModuleSyntax: true` in 5 (bun, ember, node-ts, svelte, vite-react); `isolatedModules: true` in 5 others (create-react-app, next, react-native, remix, strictest); `erasableSyntaxOnly: true` in 2 (node-ts, vite-react). The other 21, including `recommended` and all `nodeNN` bases, set none.
  - Strictest history: TS 5.0 deprecated `importsNotUsedAsValues`, so #161 (merged Mar 2023) swapped it for `verbatimModuleSyntax` in strictest and svelte. Issue #168 (Apr 2023) showed strictest plus node18 failing with TS1286 and TS1287 ("ESM syntax is not allowed in a CommonJS module when 'verbatimModuleSyntax' is enabled."). Maintainer orta: "using strictest shouldn't imply you are using esm", and #175 moved the flag out. The reporter suggested `consistent-type-imports` instead: "It forces same behavior as verbatimModuleSyntax and have eslint autofix as a bonus."
  - `isolatedModules` went into strictest in Aug 2023 (#214). orta: "it is a stricter subset of TypeScript and it's likely that most people" "already have this enabled in order to work with non-tsc transpilers."
  - Re-adding `verbatimModuleSyntax` to strictest: #291 and #292 (Jan 2025) closed unmerged; #322 (Sep 2025) still open. Jake Bailey (whose GitHub profile says they work "on the TypeScript toolchain" at Microsoft): "it basically prevents anyone from using ESM syntax in files that emit as CJS," and the old flag "is deprecated and will error in 5.5+,".
  - `node-ts` (Feb 2025, #293) is the base for Node's type stripping: `rewriteRelativeImportExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`.
- **For the post:** the most-copied tsconfig bases treat `verbatimModuleSyntax` as an environment choice (bundler, ESM, type-stripping runtimes, Svelte), not a strictness setting, because it changes what CommonJS code can be written.
- **Text:** `scratchpad/type-imports-lit/E/src/tsconfig-bases/SHA.txt`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/list.txt`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/strictest.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/node-ts.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-161.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-161-comments.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-168.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-168-comments.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-175.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-214.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-214-comments.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-291.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-292.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-322.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-322-comments.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/user-jakebailey.txt`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-293.json`

### 6.39 Svelte and Ember bases give the clearest reason for the flag: their templates use imports TypeScript can't see. VERIFIED (bases at a pinned SHA; commit and PR)

- **Citation:** tsconfig/bases `bases/svelte.json` and `bases/ember.json` at `6aab4818`; commit `778e5d6f` (Simon H, 16 Dec 2021, PR #82); PR #230 (NullVoxPopuli, Oct 2023); PR #165 (Mar 2023).
- **What it says:**
  - svelte.json: "Svelte Preprocess cannot figure out whether you have a value or a type," so it tells TypeScript to enforce type imports. The 2021 commit that added `preserveValueImports` explained: "TypeScript doesn't know about import usages in the template because it only sees the" "script of a Svelte file."
  - ember.json (now marked `_deprecated`): "We don't want to include types dependencies in our compiled output," then the same enforcement line. PR #230: "This is a breaking change for consumers of" `@tsconfig/ember`, "as they'll receive errors if they were not previously enforcing" type imports; it links Babel template-compilation issues and proposes pairing Babel's `onlyRemoveTypeImports` with the flag.
  - PR #165 removed `isolatedModules` from svelte.json as redundant once `verbatimModuleSyntax` was on.
- **For the post:** the strongest argument for keeping value imports verbatim: when a framework compiles markup the TypeScript compiler never sees, elision deletes imports that are in use.
- **Text:** `scratchpad/type-imports-lit/E/src/tsconfig-bases/svelte.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/ember.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/commit-778e5d6.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-230.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-165.json`, `scratchpad/type-imports-lit/E/src/tsconfig-bases/issue-165-comments.json`

### 6.40 create-vite: every TypeScript template gets `verbatimModuleSyntax` (directly or through the base it extends) since April 2025, and most also `erasableSyntaxOnly`. VERIFIED (templates and docs at a pinned tag; PRs); Vendor (VoidZero)

- **Citation:** vitejs/vite `create-vite@9.3.4` (`47321be0`, 5 Nov 2026), the 20 `packages/create-vite/template-*/tsconfig*.json` files and `docs/guide/features.md`; PRs #7304 (Mar 2022), #7697 (Apr 2022), #19892 (merged 28 Apr 2025).
- **What it says:**
  - My count: 12 of the 20 tsconfig files set `verbatimModuleSyntax: true`; the other 8 are 6 reference-only root files plus the Svelte and Vue app configs, which extend `@tsconfig/svelte` and `@vue/tsconfig`, both of which set it (6.38, 6.44). 13 files set `erasableSyntaxOnly: true`; the Svelte app config doesn't.
  - History: `isolatedModules` was added to the templates in 2022, citing the Vite docs. #19892 (Arnaud Barre) swapped in `verbatimModuleSyntax` and added `erasableSyntaxOnly`: "This flag makes import elision predictable and dead simple for transformers like esbuild." "It implies isolatedModules."
  - Vite's guide still says `isolatedModules` "Should be set to" true, because its transformer "doesn't support certain features like const enum and implicit type-only imports." It also tells users to write type-only imports "to avoid potential problems like type-only imports being incorrectly bundled".
- **Caveat:** how Vite's transformer handles imports is section 3's section.
- **For the post:** a React, Vue, Svelte, Solid, Preact, Lit or Qwik TypeScript project started from create-vite has the compiler, not a lint rule, require `import type`.
- **Text:** `scratchpad/type-imports-lit/E/src/vite/tag.txt`, `scratchpad/type-imports-lit/E/src/vite/tsconfig-paths.txt`, `scratchpad/type-imports-lit/E/src/vite/template-react-ts__tsconfig.app.json`, `scratchpad/type-imports-lit/E/src/vite/template-svelte-ts__tsconfig.app.json`, `scratchpad/type-imports-lit/E/src/vite/template-vue-ts__tsconfig.app.json`, `scratchpad/type-imports-lit/E/src/vite/pr-19892.json`, `scratchpad/type-imports-lit/E/src/vite/pr-19892-files.json`, `scratchpad/type-imports-lit/E/src/vite/template-react-ts__tsconfig.json`, `scratchpad/type-imports-lit/E/src/vite/pr-7697.json`, `scratchpad/type-imports-lit/E/src/vite/pr-7304.json`, `scratchpad/type-imports-lit/E/src/vite/docs-guide-features-47321be084bda7f3d777e096b68bc1ddeb45aed4.md`

### 6.41 Next.js forces `isolatedModules: true` "requirement for SWC / Babel", unless the user sets `verbatimModuleSyntax`. VERIFIED (source at v16.4.6; issue and PRs); Vendor (Vercel)

- **Citation:** vercel/next.js `v16.4.6` (9 Nov 2026), `packages/next/src/lib/typescript/writeConfigurationDefaults.ts` and `packages/create-next-app/templates/app/ts/tsconfig.json`; issue #46509 (27 Feb 2023); PR #48018 (merged 9 Jun 2023).
- **What it says:**
  - `isolatedModules` is in the block of values that "are required and cannot be changed by the user", with the reason "requirement for SWC / Babel". It is skipped when the user's tsconfig has `verbatimModuleSyntax === true`.
  - create-next-app's TypeScript template sets `"isolatedModules": true` and not `verbatimModuleSyntax`.
  - Before the fix, `next dev` and `next build` rewrote `isolatedModules` into tsconfigs that used `verbatimModuleSyntax`, which TypeScript 5.0 rejected; the issue had 27 reactions. The fix's test needed TypeScript 5, which the Next.js repo didn't use yet (a maintainer's review comment).
- **Caveat:** issue #46509's later comment says the exception didn't apply to an inherited setting, which PR #54164 (Oct 2023) addressed; not opened in full here.
- **For the post:** Next.js requires the file-by-file safety, not the explicit `import type`; type imports are optional in a default Next.js app.
- **Text:** `scratchpad/type-imports-lit/E/src/next/writeConfigurationDefaults-v16.4.6.ts`, `scratchpad/type-imports-lit/E/src/next/create-next-app-ts-tsconfig-v16.4.6.json`, `scratchpad/type-imports-lit/E/src/next/issue-46509.json`, `scratchpad/type-imports-lit/E/src/next/issue-46509-comments.json`, `scratchpad/type-imports-lit/E/src/next/issue-48018.json`, `scratchpad/type-imports-lit/E/src/next/issue-48018-comments.json`

### 6.42 Astro's base tsconfig sets `verbatimModuleSyntax` "which helps avoiding bundling issues", and keeps `isolatedModules` as a fallback. VERIFIED (preset at astro@7.4.12; PRs and commit)

- **Citation:** withastro/astro `astro@7.4.12` (`5b7c3275`, 13 Nov 2026), `packages/astro/tsconfigs/base.json`; PRs #6502 (10 Mar 2023), #6605 (20 Mar 2023), #7785 (merged 26 Jul 2023; commit `96beb883`).
- **What it says:**
  - base.json comments: "Enforce the usage of type-only imports when needed, which helps avoiding bundling issues." and, on `isolatedModules`, "This is redundant with the previous option, however it ensures that it's on" if someone disables it.
  - Princesseuh in #6502, which set `importsNotUsedAsValues: "error"`: "Being explicit with type imports only has benefits" "(apart from needing to type 4 more characters, at least)," "it helps prevent side effects and weird edge cases."
  - #6605 held off the TS 5 flag "until a majority of our users are on TS 5.0+", because at the time it couldn't be combined with `isolatedModules`. #7785 then moved `verbatimModuleSyntax` into base (it had been in strict as the old flag).
- **For the post:** Astro's reason is bundling and side effects, stated by the maintainer who made the change.
- **Text:** `scratchpad/type-imports-lit/E/src/astro/tsconfigs-base-7.4.12.json`, `scratchpad/type-imports-lit/E/src/astro/tag.txt`, `scratchpad/type-imports-lit/E/src/astro/pr-6502.json`, `scratchpad/type-imports-lit/E/src/astro/pr-6605.json`, `scratchpad/type-imports-lit/E/src/astro/pr-7785.json`, `scratchpad/type-imports-lit/E/src/astro/commit-96beb883.json`

### 6.43 SvelteKit writes `verbatimModuleSyntax` and `isolatedModules` into every project as options "Without these, compilation will fail". VERIFIED (source at @sveltejs/kit@3.3.1; commit and PR)

- **Citation:** sveltejs/kit `@sveltejs/kit@3.3.1` (`64dbae7a`, 17 Nov 2026), `packages/kit/src/core/sync/write_tsconfig/utils.js`; PR #3064 (merged 11 Feb 2022); commit `e3d6b99b` (4 Dec 2023, part of SvelteKit 2.0, PR #11161).
- **What it says:**
  - `ESSENTIAL_OPTIONS`: `verbatimModuleSyntax: true` because "svelte-preprocess cannot figure out whether you have a value or a type," and "TypeScript doesn't know about import usages in the template"; `isolatedModules: true` because "Vite compiles modules one at a time".
  - #3064 (dummdidumm) turned on `preserveValueImports` in 2022, saying it "turns off the advanced but somewhat brittle import transpilation in svelte-preprocess"; SvelteKit 2.0 replaced the two old flags with `verbatimModuleSyntax` as a breaking change.
- **For the post:** the one framework that writes the flag into a generated config and treats it as non-negotiable.
- **Text:** `scratchpad/type-imports-lit/E/src/sveltekit/write_tsconfig-utils.js-3.3.1.js`, `scratchpad/type-imports-lit/E/src/sveltekit/tag.txt`, `scratchpad/type-imports-lit/E/src/sveltekit/pr-3064.json`, `scratchpad/type-imports-lit/E/src/sveltekit/commit-e3d6b99b.json`

### 6.44 @vue/tsconfig has required type imports since its first release, now through `verbatimModuleSyntax` for `<script setup>`. VERIFIED (config at v0.9.1; commits, issues and PRs)

- **Citation:** vuejs/tsconfig `v0.9.1` (24 Mar 2026), `tsconfig.json`; commits `5b933516` (25 Jan 2022), `4a9bffa2` (21 Apr 2023, PR #9), `4d90b137` (12 May 2023, PR #14); issue #6, PR #7.
- **What it says:**
  - The comment quotes the TS 5.0 announcement, "Any imports or exports without a type modifier are left around." and adds that this matters for `<script setup>`.
  - History: `"importsNotUsedAsValues": "error"` was added on the first day (Jan 2022); TS 5.0's deprecation (issue #6) led to the switch to `verbatimModuleSyntax` (21 Apr 2023). PR #14 then removed `isolatedModules`, which TS 5.0 rejected next to the new flag (TS5104); a commenter noted the combination became legal in TypeScript 5.0.4 (microsoft/TypeScript PR #53611, not opened here).
- **For the post:** Vue's reason is the same as Svelte's: the template uses imports the script alone doesn't show.
- **Text:** `scratchpad/type-imports-lit/E/src/vue/vue-tsconfig-v0.9.1.json`, `scratchpad/type-imports-lit/E/src/vue/tag.txt`, `scratchpad/type-imports-lit/E/src/vue/issue-6.json`, `scratchpad/type-imports-lit/E/src/vue/issue-7.json`, `scratchpad/type-imports-lit/E/src/vue/issue-14.json`, `scratchpad/type-imports-lit/E/src/vue/issue-14-comments.json`

### 6.45 Angular CLI turned on `isolatedModules` for new projects in 2024 for build speed, and doesn't set `verbatimModuleSyntax`. VERIFIED (template at v22.2.7; commits and PRs); Vendor (Google)

- **Citation:** angular/angular-cli `v22.2.7` (12 Nov 2026), `packages/schematics/angular/workspace/files/tsconfig.json.template`; commits `3acb7768` (PR #27752, merged 5 Jun 2024), `4da922e4` (PR #27988, merged 8 Jul 2024), `61e8185a` (PR #29345, 14 Jan 2025).
- **What it says:**
  - The workspace template sets `"isolatedModules": true`, `"experimentalDecorators": true` and `"module": "preserve"`; no `verbatimModuleSyntax`.
  - #27752 made the build transpile with esbuild when `isolatedModules` is on and script sourcemaps are off: "Initial testing reduced a warm production build of a newly generated" "project from ~2.3 seconds to ~2.0 seconds." #27988 then made `ng new` "use this option by default."
  - Since #29345 the builder warns when `isolatedModules` and `emitDecoratorMetadata` are both on (decorators are section 4's section).
- **Caveat:** the timing is a vendor's one-project measurement in a commit message.
- **For the post:** Angular adopted the flag for speed, measured by the vendor, and still lets plain imports of types through.
- **Text:** `scratchpad/type-imports-lit/E/src/angular/workspace-tsconfig.json.template-v22.2.7`, `scratchpad/type-imports-lit/E/src/angular/tag.txt`, `scratchpad/type-imports-lit/E/src/angular/commit-3acb776831.json`, `scratchpad/type-imports-lit/E/src/angular/commit-4da922e4f4.json`, `scratchpad/type-imports-lit/E/src/angular/commit-61e8185ab0.json`

### 6.46 NestJS projects get `isolatedModules` next to decorator metadata, and neither the old ESLint template nor the new Oxlint one enforces type imports. VERIFIED (schematics at 12.0.13 and 11.1.0; PR)

- **Citation:** nestjs/schematics `12.0.13` (`a93e8530`, 6 Nov 2026), `src/lib/application/files/{ts,ts-esm,ts-minimal}/tsconfig.json`, `ts/.oxlintrc.json`, `ts/AGENTS.md`; `11.1.0` `ts/eslint.config.mjs`; PR #2142 (merged 30 Jul 2025).
- **What it says:**
  - All three 12.0.13 templates set `"isolatedModules": true` with `"emitDecoratorMetadata": true` and `"experimentalDecorators": true`; none sets `verbatimModuleSyntax`. `isolatedModules` arrived in #2142, "Enable ESM-interoperability", with `module: nodenext`; the PR gives no reason for that flag.
  - The 11.1.0 ESLint template extends `recommendedTypeChecked` with no type-import rules; the 12.0.13 `.oxlintrc.json` sets two rules (`no-explicit-any` off, `no-floating-promises` error).
  - The generated `AGENTS.md` says nothing about imports or tsconfig (8.24).
- **For the post:** the most decorator-heavy framework here leaves type imports to the user (how decorator metadata interacts with elision is section 4's section).
- **Text:** `scratchpad/type-imports-lit/E/src/nest/schematics-12.0.13-ts-tsconfig.json`, `scratchpad/type-imports-lit/E/src/nest/schematics-12.0.13-ts-esm-tsconfig.json`, `scratchpad/type-imports-lit/E/src/nest/schematics-12.0.13-ts-minimal-tsconfig.json`, `scratchpad/type-imports-lit/E/src/nest/schematics-12.0.13-ts-oxlintrc.json`, `scratchpad/type-imports-lit/E/src/nest/schematics-11.1.0-ts-eslint.config.mjs`, `scratchpad/type-imports-lit/E/src/nest/pr-2142.json`, `scratchpad/type-imports-lit/E/src/nest/commit-2ec26a6f33.json`

### 6.47 The TypeScript handbook recommends `verbatimModuleSyntax` for apps on bundlers, for Node, and for libraries, and `tsc --init` writes it since 5.9. VERIFIED (handbook and release notes at a pinned SHA; my run); Vendor (Microsoft)

- **Citation:** microsoft/TypeScript-Website at `24166845f5de5562abd8618817377130ba46d3f0` (17 Nov 2026): "Modules - Choosing Compiler Options" and "TypeScript 5.9" release notes. https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- **What it says:**
  - Bundler template: `verbatimModuleSyntax` is listed under Recommended, with a comment offering `isolatedModules` instead. Node template: `verbatimModuleSyntax` recommended. Library template: on. For libraries, "This setting protects against a few module-related pitfalls" "that can cause problems for library consumers."
  - Its footnote: any setup producing "both an ESM and a CJS output from the same source file" "is fundamentally incompatible" with the flag.
  - TS 5.9's `tsc --init` writes `verbatimModuleSyntax`, `isolatedModules`, `noUncheckedSideEffectImports` and `moduleDetection: "force"`; the team wanted it "initialized with a few more prescriptive settings than we already enable."
- **My check (local run):** `tsc --init` with the worktree's TypeScript 6.0.3 (17 Nov 2026) wrote all three flags (`scratchpad/type-imports-lit/E/check/tsc-init/`).
- **Caveat:** the flag history is sections 1 and 2's section; this entry is only about the defaults the compiler's own templates choose.
- **For the post:** the compiler team's default for new projects is the strict form; the lint rules are the alternative for projects that can't turn it on.
- **Text:** `scratchpad/type-imports-lit/E/src/tsweb/choosing-compiler-options-24166845.md`, `scratchpad/type-imports-lit/E/src/tsweb/release-notes-5.9-24166845.md`, `scratchpad/type-imports-lit/E/src/tsweb/SHA.txt`, `scratchpad/type-imports-lit/E/check/tsc-init/out.txt`, `scratchpad/type-imports-lit/E/check/tsc-init/tsconfig.json`

### 6.48 Total TypeScript's cheat sheet added `verbatimModuleSyntax` in 2024, after `module: Preserve` made it usable for "fake ESM" apps. ANECDOTAL (guide page, read 17 Nov 2026)

- **Citation:** Matt Pocock, "The TSConfig Cheat Sheet", Total TypeScript. https://www.totaltypescript.com/tsconfig-cheat-sheet (unversioned; read 17 Nov 2026).
- **What it says:**
  - Base options include `isolatedModules` and `verbatimModuleSyntax`. "This option forces you to use import type and export type," "leading to more predictable behavior and fewer unnecessary imports."
  - Changelog, 2024-04-23: "Added verbatimModuleSyntax to the base options." "Many applications do 'fake ESM'," writing imports but compiling to CommonJS; "Before module: Preserve, verbatimModuleSyntax would error on every single import or export statement".
- **Caveat:** a guide by an educator; no data.
- **For the post:** the clearest account of why the flag spread in 2024: before `module: preserve` it was unusable in the many apps that compile ESM syntax to CommonJS.
- **Text:** `scratchpad/type-imports-lit/E/text/totaltypescript-tsconfig-cheat-sheet.txt`

### 6.49 Summary: the inline and top-level camps, and who requires what. My synthesis of 6.30–6.48

- **Inline specifiers (`import { type A }`):** eslint-config-love, XO (plus `no-duplicates` `prefer-inline`), Vercel's style guide, create-t3-app, and Vue core's own config (8.16). Google's guide shows both.
- **Separate statements and top-level specifiers (`import type { A }`):** antfu, Vitest's own config (8.16), typescript-eslint's own config (8.14), and the rules' defaults.
- **The side-effect rule:** love, antfu, Vue core, Next.js's own repo, Vitest. It matters only with `verbatimModuleSyntax` (6.30), and only for the inline style.
- **The compiler flag instead of a rule:** create-vite, SvelteKit (as an essential option), Astro, @vue/tsconfig, the Svelte, Bun, node-ts and Vite-React bases, `tsc --init`, and create-t3-app. Next.js, Angular and NestJS require or set only `isolatedModules`. gts sets neither.
- **Stated reasons, in order of how often they appear:** per-file transpilers can't tell types from values (Google, typescript-eslint, Vite, SvelteKit, Angular, Next.js); template or markup imports that TypeScript can't see (Svelte, SvelteKit, Vue, Ember); side effects of imported modules (typescript-eslint, Astro, antfu, XO's debate, Scarsbrook et al. 8.1); bundling (Astro, Vite docs); build speed (Angular, measured once).

---

## 7. Bugs and costs

7.1–7.18 are runtimes, bundlers and side effects; 7.20–7.33 decorators, dependency injection, ORMs and validation; 7.40–7.59 the rules' autofixes. The numbering leaves gaps between the groups. Single reports are ANECDOTAL.

### Runtimes, bundlers and side effects (7.1–7.18)

### 7.1 Vite 2020–2021: re-exporting an imported type broke the dev server, and Evan You called it a wontfix. ANECDOTAL (Vite #731, #2117; esbuild #341)

- **Citation:** cyberalien, "TypeScript type exports fail when type is imported from a module", vitejs/vite #731 (22 Aug 2020); lake2, "No matching export for import typescript interface", #2117 (20 Feb 2021, 18 comments).
- **What it says:** #731: `export { VNode };` after importing `VNode` from `vue` gave "SyntaxError: The requested module '/@modules/vue.js' does not provide an export named 'VNode'". antfu: "Not sure if it's a bug or limitation of ESbuild", with `import type` or `export type` as the fix; underfin linked esbuild #341, where evanw pointed to `isolatedModules`. #2117: "Uncaught SyntaxError: The requested module '/app.ts' does not provide an export named 'Test'"; yyx990803 (Evan You): "This is a wontfix because esbuild transforms files in isolation."
- **For the post:** the error the post's readers know best is as old as unbundled dev servers.
- **Text:** `scratchpad/type-imports-lit/B/src/vite-issue-731.json`, `scratchpad/type-imports-lit/B/src/vite-issue-731-comments.json`, `scratchpad/type-imports-lit/B/src/vite-issue-2117.json`, `scratchpad/type-imports-lit/B/src/vite-issue-2117-comments.json`, `scratchpad/type-imports-lit/B/src/esbuild-issue-341.json`, `scratchpad/type-imports-lit/B/src/esbuild-issue-341-comment-678661170.json`

### 7.2 Babel 2018–2020: a re-exported interface stayed in the output, 77 upvotes, "working as intended", fixed by `export type`. ANECDOTAL (babel/babel #8361)

- **Citation:** manrueda, "[Babel 7] [Typescript] Exported Interfaces from an import" "are kept in the generated JS code", babel/babel #8361 (22 Jul 2018; 40 comments, 77 thumbs-up).
- **What it says:** `import { ExportedInterface } from './file-a'; export { ExportedInterface }` kept the export. nicolo-ribaudo (Babel team): "Since Babel works per-file and not per-project, it can't know."; "Our goal is match typescript's `--isolatedModules` option, so this is working as intended."; then (Jan 2020) "you will be able to use `export type { Interface }`." which shipped with 7.9.0 (3.1).
- **For the post:** `export type` exists because per-file compilers can't tell a re-exported type from a value.
- **Text:** `scratchpad/type-imports-lit/B/src/babel-issue-8361.json`, `scratchpad/type-imports-lit/B/src/babel-issue-8361-comments.json`

### 7.3 Vite 2.5 started passing `importsNotUsedAsValues` to esbuild, and mixed imports broke in dev. ANECDOTAL (Vite #4581, esbuild #1525)

- **Citation:** IanVS, vitejs/vite #4581 (11 Aug 2021, 11 comments); swandir, "type imports are not removed", evanw/esbuild #1525 (16 Aug 2021, 12 comments).
- **What it says:**
  - #4581: after Vite PR #4279 respected tsconfig, `import { useSelect, UseSelectProps } from 'downshift'` failed with "Uncaught SyntaxError: The requested module '/src/dep.ts' does not provide an export named 'Foo'" in the repro; only in dev. The reporter: "you cannot `import` types, but you can `import type`." and later "I think it's cleaner and definitely more explicit that way anyway." Another user on VS Code's auto-import: "it will mix with the import value instead create a new import type" (section 6).
  - #1525: esbuild kept `Type` under `importsNotUsedAsValues: "error"`: "Which is not correct, because valid TypeScript is transformed into invalid JavaScript." evanw waited for TypeScript 4.5's `preserveValueImports`; esbuild 0.14.0 and Vite PR #5861 (Vite 2.8) resolved it.
- **For the post:** a config change in a tool, not in the code, turned working imports into runtime errors.
- **Text:** `scratchpad/type-imports-lit/B/src/vite-issue-4581.json`, `scratchpad/type-imports-lit/B/src/vite-issue-4581-comments.json`, `scratchpad/type-imports-lit/B/src/esbuild-issue-1525.json`, `scratchpad/type-imports-lit/B/src/esbuild-issue-1525-comments.json`

### 7.4 Vite's dependency pre-bundler tried to bundle a `.d.ts` because types were imported without `type`, which led to the docs tip. ANECDOTAL (Vite #6156, PR #6260)

- **Citation:** forchel, "Vite can not resolve path dependencies", vitejs/vite #6156 (17 Dec 2021); ygj6's answer (25 Dec 2021) and PR #6260.
- **What it says:** importing Swiper's types from `swiper/types` in a Vue 3 app made pre-bundling fail on `node_modules/swiper/types/index.d.ts` ("Could not resolve './shared'", five errors). ygj6: "Vite does not know whether the imported module needs to be built." "We need to tell Vite not to build the imported type file." Fixes: `import type`, or `optimizeDeps.exclude`. The same contributor then wrote the docs tip (3.8).
- **For the post:** dependency scanners read import statements before any type checker runs, so a type imported as a value can send them to a file that has no JavaScript.
- **Text:** `scratchpad/type-imports-lit/B/src/vite-issue-6156.json`, `scratchpad/type-imports-lit/B/src/vite-issue-6156-comments.json`, `scratchpad/type-imports-lit/B/src/vite-pr-6260.json`

### 7.5 Vue `<script setup>` keeps imports for the template, so interfaces imported as values failed in Vite. ANECDOTAL (Vite #6343)

- **Citation:** codeacula, "Unable to import interfaces in child components using script setup syntax", vitejs/vite #6343 (31 Dec 2021).
- **What it says:** "Uncaught SyntaxError: The requested module '/src/definitions/character.ts' does not provide an export named 'Character'", only with `<script setup lang='ts'>`; the same code worked in a webpack-based Vue CLI app. A contributor: "it's not a bug." "typescript types need to be imported with `import type`". The reporter asked for the default tsconfig or docs to set `importsNotUsedAsValues: "error"`.
- **For the post:** the compile-to-JS case from 3.13 seen from the user's side: keeping value imports for templates means types must be marked.
- **Text:** `scratchpad/type-imports-lit/B/src/vite-issue-6343.json`, `scratchpad/type-imports-lit/B/src/vite-issue-6343-comments.json`

### 7.6 2022: `import { type Map }` kept `import {}` and broke code splitting. ANECDOTAL (Vite #8339, esbuild #2268)

- See 5.2 for the full entry. Under `preserveValueImports` it was an esbuild bug fixed in 0.14.40; under `verbatimModuleSyntax` it's the specified behaviour.
- **Text:** `scratchpad/type-imports-lit/B/src/vite-issue-8339.json`, `scratchpad/type-imports-lit/B/src/esbuild-issue-2268-comments.json`

### 7.7 Bun 2023: a package shipping `.ts` source re-exported a type, and Bun's maintainer explained why a per-file transpiler can't fix it. ANECDOTAL (oven-sh/bun #5426)

- **Citation:** "SyntaxError: Indirectly exported binding name 'AnyArena' is not found.", oven-sh/bun #5426 (15 Sep 2023, 12 comments).
- **What it says:** `require('capnp-ts')` failed because Bun resolved the package's `.ts` sources. Jarred-Sumner (16 Nov 2023): `AnyArena` is a type and "it is very difficult for Bun to figure out it is a type" "and not a runtime value, since it is in a different file" "and Bun doesn't bundle at runtime."; the fix in the library is `export { type AnyArena }`. robpalme: "This isn't Bun's fault." and "Even better is to use `'verbatimModuleSyntax'` to keep things crystal clear." "This is a relatively newer option and is rarely used today." A user had found that `export type {…} from` failed too and only a separate `import` plus `export type` worked.
- **For the post:** publishing TypeScript source moves the `type` keyword's job onto every consumer's transpiler.
- **Text:** `scratchpad/type-imports-lit/B/src/bun-issue-5426.json`, `scratchpad/type-imports-lit/B/src/bun-issue-5426-comments.json`

### 7.8 Bun 2025: an export-not-found error for an interface, and users asking for a better message. ANECDOTAL (oven-sh/bun #17902, #12744)

- **Citation:** tram98, "SyntaxError: Export named 'SomeInterface' not found in module '/path/to/module.ts'.", oven-sh/bun #17902 (4 Mar 2025).
- **What it says:** an `export interface FieldData` imported without `type` gave "SyntaxError: Export named 'FieldData' not found in module". A commenter's answer: "Import types with `import type`". The reporter: "Maybe the error message could be improved to hint at using 'import type'", and planned to enforce it with a linter. Another commenter called it a duplicate of #7384 and #8439. #12744 (open since July 2024) asks Bun to honour `verbatimModuleSyntax` in `bun build` (3.11).
- **Caveat:** my check (3.7) found that a plain `import { User }` of an interface runs under Bun 1.4.4 because the unused import is dropped; I didn't examine the reporter's repository, so what kept that import alive is unknown.
- **Text:** `scratchpad/type-imports-lit/B/src/bun-issue-17902.json`, `scratchpad/type-imports-lit/B/src/bun-issue-17902-comments.json`, `scratchpad/type-imports-lit/B/src/bun-issue-12744.json`

### 7.9 Node 2025: migrating a large repo to type stripping surfaced missing-`type` imports one at a time, with no file name. ANECDOTAL (nodejs/node #56830)

- **Citation:** Ethan-Arrowood, "Provide more information when there is a SyntaxError", nodejs/node #56830 (14 Jan 2025; closed 1 Apr 2025).
- **What it says:** migrating a large JS/TS repo to Node 23's type stripping after codemods: "SyntaxError: The requested module 'lmdb' does not provide an export named 'Transaction'". Marco Ippolito: "99% of the time is because you are importing a type or interface" "without the `type` keyword." The reporter's point: "why is this syntax error not stating which file the issue is coming from?" JakobJingleheimer (Node member) agreed a codemod could fix the imports.
- **For the post:** under Node, every type import without `type` is a runtime error found one run at a time; a lint rule finds them all at once.
- **Text:** `scratchpad/type-imports-lit/B/src/node-issue-56830.json`, `scratchpad/type-imports-lit/B/src/node-issue-56830-comments.json`

### 7.10 Node 2025: `import { type X }` from a package installed only as a dev dependency failed with `ERR_MODULE_NOT_FOUND`. ANECDOTAL (nodejs/node #58422)

- **Citation:** jordanebelanger, "Type only imports can lead to unnecessary module load", nodejs/node #58422 (22 May 2025, Node 24.0.2; closed the same day).
- **What it says:** `import { type FromSchema, type JSONSchema } from 'json-schema-to-ts'` still loaded the package, so with it installed only as a dev dependency: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'json-schema-to-ts'". The reporter had hit it because "I used a codemod to convert my codebase" "and automatically fix verbatimModuleSyntax issues." (the fix produced the inline form; section 6). Marco Ippolito explained that `import {}` is a valid import that runs the module (5.5); the reporter accepted that someone writing `import { type X }` "might be attempting to import only the type X" while also running the module.
- **For the post:** the strongest single case for `prefer-top-level`: a fix that satisfies `verbatimModuleSyntax` with inline `type` still ships a runtime dependency.
- **Text:** `scratchpad/type-imports-lit/B/src/node-issue-58422.json`, `scratchpad/type-imports-lit/B/src/node-issue-58422-comments.json`

### 7.11 Node 2026: a `.mts` type import without `type` reported as a bug and closed as intended; Bun ran the same file. ANECDOTAL (nodejs/node #62691)

- **Citation:** kevgeoleo, nodejs/node #62691 (11 Apr 2026, Node v24.13.1).
- **What it says:** `import { Num } from "./types.mts"` where `Num` is a type alias failed under Node; the report shows `bun run file.mts` printing `ok`. avivkeller: "This is intended behavior"; "You are importing a type-only export with a non-type-only import, causing the issue." khaosdoctor offered `import type` or `import { type Num }` (the second loads the module).
- **Text:** `scratchpad/type-imports-lit/B/src/node-issue-62691.json`, `scratchpad/type-imports-lit/B/src/node-issue-62691-comments.json`

### 7.12 Vitest 4.0 matched Node and broke Azure SDK tests; 4.0.6 reverted the check two days later. ANECDOTAL (vitest-dev/vitest #8868, PR #8875, #9176)

- **Citation:** jeremymeng, "v4 breaks for type import without `import type`", vitest-dev/vitest #8868 (29 Oct 2025); PR #8875 (sheremet-va, merged 30 Oct 2025; in v4.0.6, 31 Oct 2025); #9176 (5 Dec 2025, closed not planned 15 May 2026).
- **What it says:** in the Azure SDK, `import { PollOperationState, PollerLike } from "@azure/core-lro"` (interfaces) failed with "does not provide an export named 'PollerLike'". The team builds with `tshy`, which they say is at odds with `verbatimModuleSyntax`. hi-ogawa: "Vitest v3 (vite-node) had too forgiving behavior which doesn't match with node esm." sheremet-va: "One of the benefits of using Vitest is that it just works." and "for now it's better to revert that specific check." The reporter: "our tests builds/is type-checked fine with TypeScript compiler then failed at runtime." The same error in a `globalSetup` file (#9176) wasn't fixed.
- **For the post:** even a test runner's maintainers split on whether to enforce Node's rule; projects that can't turn on `verbatimModuleSyntax` rely on the tool being lenient.
- **Text:** `scratchpad/type-imports-lit/B/src/vitest-issue-8868.json`, `scratchpad/type-imports-lit/B/src/vitest-issue-8868-comments.json`, `scratchpad/type-imports-lit/B/src/vitest-pr-8875.json`, `scratchpad/type-imports-lit/B/src/vitest-release-v4.0.6.json`, `scratchpad/type-imports-lit/B/src/vitest-issue-9176.json`

### 7.13 Babel 2023: `onlyRemoveTypeImports` deleted `import { type T }` entirely, dropping its side effect. VERIFIED (issue, PR, changelog)

- **Citation:** issue #15348, "[Bug]: onlyRemoveTypeImports: true should not remove imports with only inline type specifier" (14 Jan 2023); PR #15349 (in v7.20.13, 21 Jan 2023).
- **What it says:** input `import { type T } from "./mod";` with `onlyRemoveTypeImports: true` produced an empty file; tsc with `isolatedModules` and `importsNotUsedAsValues: "error"` keeps the import. Fixed to emit `import "./mod"` (3.1).
- **For the post:** until January 2023, Babel's keep-imports mode quietly removed this form.
- **Text:** `scratchpad/type-imports-lit/B/src/babel-issue-15348.json`, `scratchpad/type-imports-lit/B/src/babel-pr-15349.json`, `scratchpad/type-imports-lit/B/src/babel-CHANGELOG-v7.28.0.md`

### 7.14 Deno 2026: honouring `verbatimModuleSyntax` exposed dangling type re-exports, so Deno added an off switch. VERIFIED (PR, spec test); Vendor (Deno Land)

- **Citation:** PR #35288 (merged 18 Jun 2026); `tests/specs/run/verbatim_module_syntax_type_reexport` at v2.9.8.
- **What it says:** `import { type Foo } from "./types.ts"; export { Foo };` with the option on crashes `deno run --no-check` with `SyntaxError: Export 'Foo' is not defined in module`. The env var turns verbatim off and the file runs. tsc reports the pattern: my check with TypeScript 6.0.3 gives "error TS1205: Re-exporting a type when 'verbatimModuleSyntax' is enabled requires using 'export type'." So it only reaches users who skip checking (3.10).
- **For the post:** turning on verbatim semantics in a runtime breaks code that tsc never checked under them.
- **Text:** `scratchpad/type-imports-lit/B/src/deno-pr-35288.json`, `scratchpad/type-imports-lit/B/src/deno-tests`, `scratchpad/type-imports-lit/B/check/tsc-dangling-reexport/out.txt`

### 7.15 Custom element registration lost to elision: a Lit component imported only for its type never defined its tag. ANECDOTAL (Stack Overflow 72833228, via the Stack Exchange API)

- **Citation:** Michael Rivera, "Open Web Components Testing / Lit - component not being rendered?", Stack Overflow question 72833228 (1 Jul 2022); accepted answer by Augustine Kim (7 Jul 2022). https://stackoverflow.com/questions/72833228 (the site returned 403 to curl; the API copy was saved).
- **What it says:** the test imported `CodingEditor` only to cast the fixture, so `<coding-editor>` had no shadow root. The answer: TypeScript removed the "import that's only used as a type" "so the side effect of defining the custom element is not happening." Fixes: `importsNotUsedAsValues: preserve` or a bare `import '../../app/javascript/components/coding-editor';`; the starter example worked because it used the class in `assert.instanceOf`.
- **For the post:** the classic side-effect loss from default elision; `verbatimModuleSyntax` (or an explicit side-effect import) prevents it.
- **Text:** `scratchpad/type-imports-lit/B/src/so-72833228-question.json`, `scratchpad/type-imports-lit/B/src/so-72833228-answers.json`

### 7.16 2026: under `verbatimModuleSyntax`, `import { type X }` closed a runtime cycle that crashed Vitest, passed under Bun and slipped past madge. ANECDOTAL (routecraftjs/routecraft #480 and commit 9fc22e7)

- **Citation:** ex0b1t, "chore(lint): enforce `import type` (no type-only braced imports) to prevent module-cycle regressions", routecraftjs/routecraft #480 (6 Jul 2026, open); commit `9fc22e74` (6 Jul 2026). A small project (37 stars).
- **What it says:** the retained side-effect edges closed `exchange -> context -> route -> wrapper -> exchange`; Vite/Vitest crashed with "Cannot read properties of undefined (reading 'AGGREGATE')". "Bun's loader tolerates the cycle," "so bun-based CI stayed green while the bug was live." "The existing `madge --circular` check also did not catch it." The cause of recurrence: "IDE auto-import defaults to the braced `import { type X }` form," The commit converts 77 braced imports to `import type` across 43 files (the issue says 44 imports). The issue proposes `no-import-type-side-effects` first and `consistent-type-imports` as the fallback (section 6).
- **Caveat:** one small project's own account; the commit confirms the change but not the crash.
- **For the post:** the Next.js #91906 pattern (import-cycles.md 2.7) again, with two new details: runtimes disagree on whether the cycle crashes, and a dedicated cycle tool missed it.
- **Text:** `scratchpad/type-imports-lit/B/src/routecraft-issue-480.json`, `scratchpad/type-imports-lit/B/src/routecraft-commit-9fc22e7.json`, `scratchpad/type-imports-lit/B/src/routecraft-commit-9fc22e7.patch`

### 7.17 Rolldown maps the deprecated `importsNotUsedAsValues`/`preserveValueImports` pair the opposite way to its own comment and to tsc. My check (Rolldown 1.2.13); VERIFIED (source at v1.3.2, PR #8169)

- **Citation:** `tsconfig_merge.rs` at rolldown `v1.3.2`; PR #8169 diff; my run in `scratchpad/type-imports-lit/B/check/rolldown-tsconfig/`.
- **What it says:** the comment table maps `preserveValueImports: false` + `importsNotUsedAsValues: remove` to `onlyRemoveTypeImports: false`, and `true` + `preserve`/`error` to `true`. The code sets `Some(true)` for the first and `Some(false)` for the second; PR #8169 only added the warning around existing code. My run: explicit `importsNotUsedAsValues: "remove"` (tsc's default elision) kept the unused import and its module (`side.ts evaluated`), and `preserveValueImports: true` + `importsNotUsedAsValues: "preserve"` dropped it.
- **Caveat:** affects only configs still using the two deprecated options (tsc removed them, sections 1 and 2); not tested through Vite; not reported upstream (read-only rules).
- **For the post:** not for the post; for Hayden (see the notes). It shows how easily the mapping between these switches goes wrong.
- **Text:** `scratchpad/type-imports-lit/B/src/rolldown-v1.3.2-tsconfig_merge.rs`, `scratchpad/type-imports-lit/B/src/rolldown-pr-8169.json`, `scratchpad/type-imports-lit/B/check/rolldown-tsconfig/out.txt`

### 7.18 Next.js #91906 (2026): `import { type X }` emitted as `import {}` exposed a cycle in Turbopack. Cross-reference

- Covered in `import-cycles.md` 2.7 and 6.4: the maintainer's diagnosis was that the inline form kept a runtime side-effect edge, the fix was `import type`, closed as expected behaviour. Not re-fetched here.

---

### Decorators, DI, ORMs and validation (7.20–7.33)

### 7.20 The first reports (Sep 2020): the autofix turned Nest services into type imports and Nest asked for `Function`. ANECDOTAL (typescript-eslint #2559, nestjs/nest #5421)

- **Citation:** vegerot, "[consistent-type-imports] add support for passive value usage by decorators when `emitDecoratorMetadata` is enabled", typescript-eslint/typescript-eslint #2559, 14 Sep 2020; "Nest dependency injection can't resolve type-only imports", nestjs/nest #5421, 14 Sep 2020. https://github.com/typescript-eslint/typescript-eslint/issues/2559, https://github.com/nestjs/nest/issues/5421
- **What it says:**
  - The error after the fix: "Nest can't resolve dependencies of the AppController (?, Function, Function, Function, UserSessionRepository)." and "the argument Function at index [0]".
  - bradzacher (typescript-eslint): "It seems pretty silly to rely on unused imports to do dependency injection." then, after seeing the emit: "TIL TS will emit use the type information to emit additional metadata".
  - jmcdo29 (Nest core team): with `import type`, "all that is left is `Function`," "meaning that there isn't a name for Nest to resolve."
  - Fixed by PR #2751, "feat: add support for decorator metadata in scope analysis and in consistent-type-imports", merged 18 Jan 2021.
- **Caveat:** Single reports; the response is the maintainers' account.
- **For the post:** The bug has been known for as long as the rule has had a fixer, and the people who wrote the rule were surprised by the emit too.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/tseslint-2559.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-2559-comments.json`, `scratchpad/type-imports-lit/C/src/gh/nest-issue-5421.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-pr-2751.json`

### 7.21 In Angular the autofix produced NG2003 at compile time. ANECDOTAL (typescript-eslint #2713)

- **Citation:** lachieh, "[consistent-type-imports] Issues with Angular's Dependency Injection", typescript-eslint/typescript-eslint #2713, 27 Oct 2020 (closed as a duplicate of #2559). https://github.com/typescript-eslint/typescript-eslint/issues/2713
- **What it says:**
  - "Injected dependencies are replaced with type only imports".
  - The build error: "error NG2003: No suitable injection token for parameter 'dialog' of class 'RuleDetailsComponent'." and "Consider changing the type-only import to a regular import".
  - Versions: @typescript-eslint 4.5.0, TypeScript 4.0.3.
- **Caveat:** Single report. It matches the compiler source in 4.14.
- **For the post:** The primary record that Angular's failure is a compile error, not a runtime one.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/tseslint-2713.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-2713-comments.json`

### 7.22 Before July 2020 Angular ignored `import type` in decorated constructors and loaded the module anyway. ANECDOTAL plus fix (angular/angular #37900, PR #37912)

- **Citation:** samherrmann, "Injector does not respect TypeScript type-only imports", angular/angular #37900, 3 Jul 2020; JoostK, "fix(compiler-cli): avoid creating value expressions for symbols from type-only imports", #37912, committed 3 Jul 2020 as `18098d38b8`. https://github.com/angular/angular/issues/37900
- **What it says:**
  - With `import type { Foo }` and `@Inject(FOO) foo: Foo`, a `console.log` in `foo.ts` still ran.
  - JoostK: "Can confirm, the type-only modifier is not respected when emitting decorator metadata." Workaround offered: "an easy workaround would be to introduce a local type alias".
  - The commit: the compiler "did not yet take the type-only keyword into account"; the fix prevents "a value expression from being created."
- **Caveat:** Single report. Angular 10.0.2.
- **For the post:** Shows the opposite failure: a type-only import that wasn't honoured pulled a module and its side effects back in.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/angular-issue-37900.json`, `scratchpad/type-imports-lit/C/src/gh/angular-issue-37900-comments.json`, `scratchpad/type-imports-lit/C/src/gh/angular-commit-18098d38.json`

### 7.23 Angular CLI production builds failed on type-only imports with `emitDecoratorMetadata` on, twice, and the team's advice was to drop the option. ANECDOTAL plus maintainer replies (angular-cli #19234, #23667)

- **Citation:** lachieh, "[@angular-devkit/build-optimizer] Optimization error when using Type-only Imports and emitDecoratorMetadata", angular/angular-cli #19234, 27 Oct 2020; jdforsythe, "Production build errors with type-only imports inside curlys and emitDecoratorMetadata on", #23667, 1 Aug 2022. https://github.com/angular/angular-cli/issues/19234, https://github.com/angular/angular-cli/issues/23667
- **What it says:**
  - #19234: "Module parse failed: Unexpected token (1:12)" at `import type { SimpleChanges } from '@angular/core';`. alan-agius4: "in many cases you don't need to use type-only imports". Fixed by `8e11ad9aa4`, "elide type-only imports when using emitDecoratorMetadata".
  - #23667 (`import { type X }`): clydin: the option "should generally be avoided when possible due to it having known design limitations".
- **Caveat:** Single reports; fixed in the CLI each time.
- **For the post:** Type-only imports and decorator metadata have also broken the build tools, not just the runtime.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/angular-cli-19234.json`, `scratchpad/type-imports-lit/C/src/gh/angular-cli-19234-comments.json`, `scratchpad/type-imports-lit/C/src/gh/angular-cli-23667.json`, `scratchpad/type-imports-lit/C/src/gh/angular-cli-23667-comments.json`, `scratchpad/type-imports-lit/C/src/gh/angular-cli-commit-8e11ad9aa4.json`

### 7.24 typescript-eslint only knows the flags from type information or from `parserOptions`, and users kept hitting the fix without either. ANECDOTAL plus maintainer replies (typescript-eslint #3630, #4608, #4638, #5903) and my check

- **Citation:** yharaskrik, "[consistent-type-imports] Using with --fix changes constructor imports to type imports in nest and angular", #3630, 12 Jul 2021; Lokomojo, #4608, 28 Feb 2022; xboy2012, #4638, 7 Mar 2022; ajmnz, #5903 (tsyringe), 29 Oct 2022; docs PR #5904. https://github.com/typescript-eslint/typescript-eslint/issues/3630
- **What it says:**
  - bradzacher on #3630: "you don't use type-aware linting (at least in your repro you don't)," "so we can't detect if you've turned on `emitDecoratorMetadata`, so we default to off." Also: "It's really only angular that uses decorator metadata" (inaccurate, see 4.13).
  - #4638 asked for a way to skip type-aware linting; bradzacher: "This is a known weakness." #3630, #4608 and #4638 were all closed as completed on 11 Mar 2022, and by #5903 the parser option existed; bradzacher there: "You need to turn this on in the parser options" "if you're not using type-aware linting."
  - My check (ESLint 10.14.0, @typescript-eslint 8.72.1, no type information): on a Nest-style controller the rule reports "All imports in the declaration are only used as types"; with `parserOptions.emitDecoratorMetadata` and `experimentalDecorators` set, it reports nothing (exit 0).
- **Caveat:** Section 6 covers the rule internals.
- **For the post:** Ultracite's ESLint comment, which says holding back takes type information, is too strong; two `parserOptions` lines do it. In Angular it never helps, since the option is off there.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/tseslint-3630.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-3630-comments.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-4608.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-4638.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-4638-comments.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-5903-comments.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-5904.json`, `scratchpad/type-imports-lit/C/check/lint-fix/eslint-run.txt`

### 7.25 The 2021 fix collided with TS1272, and typescript-eslint gave up in v7.4.0: files with decorators and both flags are skipped. VERIFIED (issue, PR, blog post, installed source)

- **Citation:** HaoboZ, "Bug: [consistent-type-imports] Using with isolatedModules and emitDecoratorMetadata", #5468, 12 Aug 2022; bradzacher, PR #8335, merged 24 Mar 2024 (in `v7.4.0`, not `v7.3.1`); bradzacher, "Changes to `consistent-type-imports` with Legacy Decorators and Decorator Metadata", typescript-eslint blog, 25 Mar 2024. https://typescript-eslint.io/blog/changes-to-consistent-type-imports-with-decorators
- **What it says:**
  - bradzacher on #5468: "when `isolatedModules` is turned on TS acts in a non-isolated module way!!!" and "we don't want to be in the position of re-implementing TS's logic."
  - The blog: the old rule said an import "_must not be_ marked with `import type`" while TypeScript said it "_must be_"; now the rule will "**_not_** report any errors within any files _that contain decorators_".
  - The blog's list: for a class "and the import **_IS_** annotated as `import type` then TS will emit `[Function]`."
  - It suggests `verbatimModuleSyntax` as the alternative, which "will use type information to correctly enforce" "that types are marked with `type` and values are not".
- **Caveat:** That last claim didn't hold in my run: `verbatimModuleSyntax` accepted `import type` for an injected class (4.4). Section 6 has the rule details.
- **For the post:** The most careful implementation gave up on the case rather than guess. Don't repeat the blog's `verbatimModuleSyntax` advice as a fix for DI.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/tseslint-5468.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-5468-comments.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-8335.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-pr-8335-merge.txt`, `scratchpad/type-imports-lit/C/text/tseslint-blog-2024-03-25-decorators.md`

### 7.26 Reports kept coming after both fixes, closed as duplicates or user error. ANECDOTAL (typescript-eslint #5960, #10200)

- **Citation:** sviat9440, "Bug: [consistent-type-imports] Angular dependency injection issue", #5960, 10 Nov 2022; tianyingchun, "Bug: [consistent-type-imports] can not support when using DI of nest.js", #10200, 23 Oct 2024. https://github.com/typescript-eslint/typescript-eslint/issues/10200
- **What it says:**
  - #5960 (Angular, `experimentalDecorators` only) proposed a `framework` option; bradzacher closed it: "decorator metadata just messes the rule up" "because TS works differently depending on what version you're using."
  - #10200, labelled `fix: user error`: kirkwaiblinger explained the rule "has no way of knowing what's actually in your tsconfig" without type information, and "assumes by default that experimentalDecorators and emitDecoratorMetadata are false."
- **Caveat:** Single reports.
- **For the post:** The default is to report and fix; the exemption is opt-in by configuration that most users don't know about.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/tseslint-5960.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-5960-comments.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-10200.json`, `scratchpad/type-imports-lit/C/src/gh/tseslint-10200-comments.json`

### 7.27 Biome's `useImportType` broke Nest and Angular injection from 1.6.0 (Mar 2024); Biome declined a fix and documents turning it off. ANECDOTAL plus maintainer replies (biomejs/biome #2003, #2038, #2309, #4514) and my check

- **Citation:** ssilve1989, "`useImportType` breaks class based dependency injection in Nest.JS", biomejs/biome #2003, 8 Mar 2024; bc-m, "Import used by decorator metadata reformatted as type import since Biome 1.6.0", #2038, 11 Mar 2024; vnabet, #2309 (Angular), 4 Apr 2024; aak-lear, "Nest.js app breaks with useImportType rule", #4514, 12 Nov 2024; `use_import_type.rs` at `@biomejs/biome@2.6.4`. https://github.com/biomejs/biome/issues/2003
- **What it says:**
  - #2003 shows the emitted `__metadata("design:paramtypes", [Function])`.
  - Conaclos: "Biome is not able to analyze decorator implementations." and Biome would "follow the [decision of TypeScript ESLint]".
  - ematipico on #4514: an option to ignore classes "would create false negatives for normal classes".
  - Rule docs at 2.6.4: "We haven't found a way to support this pattern yet." and "We recommend disabling this rule when using such decorators."
  - Users' workaround: an `overrides` block turning the rule off for `*.controller.ts` and `*.service.ts`.
  - My check (Biome 2.6.4): on a Nest-style controller it offers "Safe fix: Use import type." and `lint --write` rewrites the import.
- **Caveat:** Single reports. Conaclos's summary that typescript-eslint "now rejects this" misstates #8335, which skips such files.
- **For the post:** Biome classes the rewrite as a safe fix, so it is applied by default.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/biome-2003.json`, `scratchpad/type-imports-lit/C/src/gh/biome-2003-comments.json`, `scratchpad/type-imports-lit/C/src/gh/biome-2038.json`, `scratchpad/type-imports-lit/C/src/gh/biome-2038-comments.json`, `scratchpad/type-imports-lit/C/src/gh/biome-2309-comments.json`, `scratchpad/type-imports-lit/C/src/gh/biome-4514.json`, `scratchpad/type-imports-lit/C/src/gh/biome-4514-comments.json`, `scratchpad/type-imports-lit/C/src/biome/biome-2.6.4-use_import_type.rs`, `scratchpad/type-imports-lit/C/check/lint-fix/biome-run.txt`

### 7.28 A Biome option to keep decorator-metadata imports is open and contested (May 2026). ANECDOTAL (biomejs/biome #10495, PR #10496)

- **Citation:** LucasPreviato, "useImportType can break decorator metadata based DI", biomejs/biome #10495, and "feat(useImportType): preserve decorator metadata imports", PR #10496, both 28 May 2026, open. https://github.com/biomejs/biome/pull/10496
- **What it says:**
  - #10495: "If the safe fix changes it to `import type`, the metadata becomes `Function`".
  - siketyan (Biome) on the first version: "This doesn't actually detect decorator behaviour," "but a specific pattern used in a specific framework".
  - ematipico on 18 Jun 2026 asked whether the author wanted to "bring this PR to the finish line"; no merge as of 17 Nov 2026.
- **Caveat:** Open; may change.
- **For the post:** Mention only as a proposal; check its state before publishing.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/biome-10495.json`, `scratchpad/type-imports-lit/C/src/gh/biome-10496.json`, `scratchpad/type-imports-lit/C/src/gh/biome-10496-comments.json`

### 7.29 Oxlint's port rewrites injected classes; two issues and an open PR, no fix released. ANECDOTAL plus maintainer replies (oxc #6835, #3645, #13609, PR #28813) and my check

- **Citation:** pumano, "linter: `@typescript-eslint/consistent-type-imports` should also support `experimentalDecorators` and `emitDecoratorMetadata`", oxc-project/oxc #6835, 23 Oct 2024; mysteryven, PR #3645, closed 31 Jul 2024 unmerged; anotheri, "typescript/consistent-type-imports doesn't respect tsconfig", #13609, 8 Sep 2025, open; ozeron, PR #28813, 4 Nov 2026, open. https://github.com/oxc-project/oxc/issues/13609
- **What it says:**
  - #6835 (Angular) was closed as not planned by Boshen: "The best option is turn this rule off" "if you have `experimentalDecorators: true` and `emitDecoratorMetadata: true`."
  - #3645 tried `parserOptions` for the two flags; mysteryven closed it: "Need a better way."
  - #13609 (NestJS): after `lint:fix`, "some of the tests start to fail." Dunqing: changing reference flags by tsconfig "is a footgun".
  - PR #28813 skips imports that are "the whole annotation of a decorated property" (and similar positions), and validated it on "1,200 files (729 with decorators)" against tsc 5.9.
  - My check (Oxlint 1.90.0): the rule reports the controller's import and `--fix` writes `import type { CatsService }`.
- **Caveat:** Single reports; PR unreleased. Oxc is VoidZero's (Vendor).
- **For the post:** As of 17 Nov 2026 Oxlint users in Nest projects have to turn the rule off themselves, which is what Ultracite's `nestjs` preset now does.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/oxc-6835.json`, `scratchpad/type-imports-lit/C/src/gh/oxc-6835-comments.json`, `scratchpad/type-imports-lit/C/src/gh/oxc-3645-comments.json`, `scratchpad/type-imports-lit/C/src/gh/oxc-13609.json`, `scratchpad/type-imports-lit/C/src/gh/oxc-13609-comments.json`, `scratchpad/type-imports-lit/C/src/gh/oxc-28813.json`, `scratchpad/type-imports-lit/C/check/lint-fix/oxlint-run.txt`

### 7.30 Nest gets the same report every year, and closes it as expected behaviour. ANECDOTAL (nestjs/nest #12604, #13721, #14422)

- **Citation:** hengshanMWC, "Introducing dependencies in import type will result in unresolved dependencies", nestjs/nest #12604, 18 Oct 2023; hywax, "Can't resolve dependencies with consistent type imports", #13721, 25 Jun 2024; Maraket, "Using Type Only imports breaks injection", #14422, 13 Jan 2025. https://github.com/nestjs/nest/issues/14422
- **What it says:**
  - All three show "the argument Function at index [0]" with `nest start` (a `tsc` build).
  - micalevisk: "that's expected due to typescript reflection limitations."
  - jmcdo29 on #13721: it "_looks_ like you're using the imported class as a `type`", but "it's _actually_ being used as a `reference`".
  - On #14422, asked whether it was documented, jmcdo29 replied "Currently, no." (Jan 2025). The docs warnings in 4.9 came later.
- **Caveat:** Single reports; three of at least five found (with 5421 and 15583).
- **For the post:** A steady trickle, each closed as working as intended; good evidence that the failure surprises people.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/nest-issue-12604.json`, `scratchpad/type-imports-lit/C/src/gh/nest-issue-12604-comments.json`, `scratchpad/type-imports-lit/C/src/gh/nest-issue-13721.json`, `scratchpad/type-imports-lit/C/src/gh/nest-issue-13721-comments.json`, `scratchpad/type-imports-lit/C/src/gh/nest-issue-14422.json`, `scratchpad/type-imports-lit/C/src/gh/nest-issue-14422-comments.json`

### 7.31 Nest added an import-type hint in 11.1.7 after a report that showed `Object`, not `Function`. ANECDOTAL plus change (nestjs/nest #15583, PR #15588)

- **Citation:** at7211, "[Discussion]: Enhance dependency resolution errors with import type detection and documentation links", nestjs/nest #15583, 31 Aug 2025; PR #15588, merged 16 Sep 2025. https://github.com/nestjs/nest/issues/15583
- **What it says:**
  - The reported message: "Please make sure that the argument Object at index [1]" "is available in the ResourceModule context." and "The word 'Object' provides no useful information about what went wrong."
  - kamilmysliwiec asked for a PR; the hint shipped in 11.1.7 (compare API: not in 11.1.6).
- **Caveat:** The report doesn't say which compiler produced `Object`; `Object` is what SWC or a per-file transpiler records (4.5). The hint doesn't match `Function` (4.10).
- **For the post:** Pair with 4.10: the fix for the confusing message covers one compiler's output.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/nest-issue-15583.json`, `scratchpad/type-imports-lit/C/src/gh/nest-issue-15583-comments.json`, `scratchpad/type-imports-lit/C/src/gh/nest-pr-15588.json`, `scratchpad/type-imports-lit/C/src/gh/nest-pr-15588-release-containment.txt`

### 7.32 TypeORM's docs give two different answers for circular imports, `import type` with strings or `Relation<>`, and the reconciliation is open. ANECDOTAL (typeorm/typeorm #11768, PRs #12846, #12886)

- **Citation:** hughrawlinson, "how to avoid circular dependencies in esm projects", typeorm/typeorm #11768, 13 Nov 2025, open; dikshit-n, PRs #12846 (7 Sep 2026) and #12886 (19 Sep 2026), open. https://github.com/typeorm/typeorm/issues/11768
- **What it says:**
  - "the way to avoid circular dependencies in esm projects" "is documented in two different ways": the getting-started guide uses `Relation`, and the relations FAQ says "to `import type`, replace the first arg to the relation decorator" with a string.
- **Method (search):** read-only `gh api search/issues` for `"import type"` in typeorm/typeorm, typestack/class-validator, typestack/class-transformer, inversify/InversifyJS, inversify/monorepo and microsoft/tsyringe on 17 Nov 2026: only this TypeORM thread was about type-only imports; nothing in the other five.
- **Caveat:** Search is not exhaustive (title and body matches only).
- **For the post:** In ORMs the type-only import is the workaround, not the bug.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/typeorm-11768.json`, `scratchpad/type-imports-lit/C/src/gh/typeorm-12846.json`, `scratchpad/type-imports-lit/C/src/gh/typeorm-12886.json`

### 7.33 TypeScript itself still has open gaps here: no `isolatedModules` error for some cases, and a TypeScript 7 regression that emits a `ReferenceError`. ANECDOTAL (microsoft/TypeScript #61411, #64889, PR #64896)

- **Citation:** ethanresnick, "Missing compiler error (or emit bug) in another isolatedModules + emitDecoratorMetadata use case", microsoft/TypeScript #61411, 13 Mar 2025, open; blickly, "`emitDecoratorMetadata` emits a ReferenceError for a default `import type` from an unresolvable module", #64889, 20 Oct 2026, open; Andarist, PR #64896, open. https://github.com/microsoft/TypeScript/issues/64889
- **What it says:**
  - RyanCavanaugh on #61411: "I'm extremely surprised to learn `emitDecoratorMetadata` isn't banned entirely" "in combination with `isolatedModules` in the first place." and "A syntax-only transpiler has effectively zero chance to `eDM` correctly."
  - #64889: "Does **not** reproduce in `typescript@6.0.3`," "so this is a divergence introduced by the Go port." A default `import type` from a missing module makes 7.x emit `missing_default_1.default`, so the module throws on load.
- **Caveat:** #64889 needs an unresolvable module; an edge case. Both open.
- **For the post:** Nest's template combines exactly the two flags the TypeScript lead calls hopeless together (4.9). Worth one sentence, not a section.
- **Text:** `scratchpad/type-imports-lit/C/src/gh/ts-issue-61411.json`, `scratchpad/type-imports-lit/C/src/gh/ts-issue-61411-comments.json`, `scratchpad/type-imports-lit/C/src/gh/ts-issue-64889.json`, `scratchpad/type-imports-lit/C/src/gh/ts-pr-64896.json`

---

### Autofixes (7.40–7.59)

Each is a single report unless noted. Decorator and DI breakage reports are section 4's; 7.59 lists the ones I passed.

### 7.40 typescript-eslint, 2020: the fix turned `import React from "react"` into `import type React`. ANECDOTAL (issue #2455)

- **Citation:** maneetgoyal, "[consistent-type-imports] Auto-fix not working well with ReactJS imports", typescript-eslint #2455, 1 Sep 2020, closed 6 Sep 2020.
- **What it says:** with the classic JSX transform, `React` is referenced only implicitly by JSX, so the rule saw no value use and the fix wrote `import type React from "react";`. Brad Zacher: "This is a really unfortunate side-effect of the react transform." The fix needed the JSX factory, from tsconfig with type information or a parser option without it.
- **Caveat:** one report, closed five days later. Biome hit the same case in 2024 (7.56); Oxlint skips any import named `React` (6.16).
- **For the post:** implicit value uses (JSX factories, decorator metadata) are where the type-only judgement goes wrong.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-2455.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-2455-comments.json`

### 7.41 typescript-eslint, 2023: the fix produced `import type` with an import assertion, which TypeScript rejects. ANECDOTAL (issue #7527)

- **Citation:** somebody1234, "Bug: [consistent-type-imports] Incorrectly suggests `import type` on import assertion", typescript-eslint #7527, 24 Aug 2023; fixed by #7722 in 6.8.0 (2023-10-16).
- **What it says:** `import * as aJson from './a.json' assert { type: 'json' }` used only in a type was fixed to a type-only import; TypeScript then reported ts(2822). "Importantly, the autofix 'fixes' it into invalid TypeScript code." The rule now skips imports with attributes, and Oxlint and Biome do the same.
- **Caveat:** one report; fixed.
- **For the post:** an example of a fix that is wrong for syntax the rule's authors didn't consider.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-7527.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-7527-comments.json`, `scratchpad/type-imports-lit/D/src/tseslint/eslint-plugin-CHANGELOG-v8.72.1.md`

### 7.42 typescript-eslint, 2021 and 2024: two regressions reported "used by decorator metadata" where there was none. ANECDOTAL (issues #2989, #8330)

- **Citation:** lukeapage, "[consistent-type-imports] Regression 4.14.0/1 error when import used as key in type object", #2989, 1 Feb 2021 (fixed in 4.14.2 the same day, #2990); Brad Zacher, "Bug: [consistent-type-imports] erroneous report on type used in an `export =` assertion", #8330, 1 Feb 2024 (fixed in 6.21.0, #8332).
- **What it says:** in #2989, `import type * as constants` used in a computed key of a type was reported as "used by decorator metadata" in a file with no decorators, the day after 4.14.0 shipped; in #8330, a type used in `export = {} as Foo` got the same message from an unreleased change (#8265).
- **Caveat:** both fixed within days; the metadata messages were removed in 7.4.0 (6.4). See also 7.20–7.33.
- **For the post:** the metadata logic was fragile, which is part of why it was removed.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-2989.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-8330.json`, `scratchpad/type-imports-lit/D/src/tseslint/eslint-plugin-CHANGELOG-v8.72.1.md`

### 7.43 typescript-eslint, 2023: a side-effect import plus a type import from the same module made the fixer edit the wrong statement and crash. ANECDOTAL (issue #7209)

- **Citation:** OpportunityLiu, "Bug: [consistent-type-imports] Attempts to fix the wrong import statement", typescript-eslint #7209, 12 Jul 2023, closed 16 Mar 2024, the day #8308 ("handle imports without specifiers", 7.3.0) was committed.
- **What it says:** ESLint crashed with "Expected to find a } for the ImportDeclaration." Josh Goldberg found it worked in 5.51 and failed from 5.52. Josh-Cena: "this rule in general doesn't handle duplicate imports very well." The rule registers one value import and one type import per source, so a bare `import "./foo-bar.js"` was taken as the target.
- **Caveat:** one report; fixed. The per-source bookkeeping is still in the 8.72.1 source.
- **For the post:** the fixer's assumptions about one import per module are where duplicates and side-effect imports bite.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-7209.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-issue-7209-comments.json`, `scratchpad/type-imports-lit/D/src/tseslint/eslint-plugin-CHANGELOG-v8.72.1.md`

### 7.44 eslint-plugin-import, 2023: the `consistent-type-specifier-style` fixer deleted commas elsewhere in the file. ANECDOTAL (issues #2753, #2790; PR #2754)

- **Citation:** aaronadamsCA, "[consistent-type-specifier-style] Fixer breaks adjacent code (syntax error due to missing comma)", #2753, 5 Apr 2023; KirillGalimov, #2790, 31 May 2023 (closed as a duplicate); Brad Zacher, PR #2754, released 2.28.0 (2023-07-27).
- **What it says:** splitting `import { Component, type ComponentProps }` removed the comma after `Component1` in the next import (#2753), and in #2790 a comma in a function's destructured parameters (`({ propOne propTwo })`). Brad Zacher at first doubted it, then: "Huh - nope, I can confirm this is the output testing against main." Jordan Harband: "producing a syntax error is unacceptable," "and additionally this rule should only be touching imports." The fix sat unreleased for about three months.
- **Caveat:** two reports of one bug; fixed.
- **For the post:** style fixers that rewrite import lines can still break code far from them.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-issue-2753.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2753-comments.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2790.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2790-comments.json`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_CHANGELOG.md`

### 7.45 eslint-plugin-import, 2023: `prefer-inline` leaves a double space, and the maintainer left that to other rules. ANECDOTAL (issue #2833)

- **Citation:** benkrejci, "[import/consistent-type-specifier-style] (prefer-inline) Leaves an extra (double) space", #2833, 18 Jul 2023, closed completed 20 Jul 2023.
- **What it says:** `import type { TypeOne }` became `import  { type TypeOne }`. Jordan Harband: "I would assume another rule takes care of it". The reporter used core `no-multi-spaces`. The same double space appears in import-x 4.17.1 and Oxlint 1.90.0 (my runs), and it is what grows without bound in the ping-pong of 6.28.
- **Caveat:** cosmetic alone; a formatter removes it.
- **For the post:** a whitespace leftover is harmless until two fixers loop over it.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-issue-2833.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-2833-comments.json`, `scratchpad/type-imports-lit/D/check/eslint/runs/importx-inline/out.txt`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-cts-inline/out.txt`

### 7.46 eslint-plugin-import, 2024: `no-duplicates` with `prefer-inline` merged into the invalid `import type { x, type y }`. ANECDOTAL (PR #3033)

- **Citation:** yesl-kim, "[Fix] `no-duplicates`: Removing duplicates breaks in TypeScript", PR #3033, 11 Aug 2024, merged 29 Aug 2024, released 2.30.0 (2024-09-02), fixing #3016 and #2792.
- **What it says:** `import type { x }` plus `import { type y }` from one module was fixed to `import type { x, type y }`, which doesn't parse; the fix now writes `import { type x, type y }`, an all-inline import that `no-import-type-side-effects` then reports.
- **Caveat:** fixed; two linked issues.
- **For the post:** the fixed output trades a syntax error for the empty-import form.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-issue-3033.json`, `scratchpad/type-imports-lit/D/src/import/v2.32.0_CHANGELOG.md`

### 7.47 eslint-plugin-import, open since 2024: `prefer-inline` deletes a side-effect import next to an `import type`; Oxlint fixed the same in 2026. ANECDOTAL (issue #3130; oxc #19632, PR #24030)

- **Citation:** oleasteo, "[no-duplicates] prefer-inline breaks unassigned and top-level type imports", eslint-plugin-import #3130, 23 Dec 2024, open; oleasteo, oxc #19632, 23 Feb 2026, closed by Boshen's PR #24030, 3 Jul 2026.
- **What it says:** with `import type { X } from "xyz"` and `import "xyz"`, the fix removes the bare import, which drops the module's evaluation: "This is not the desired behavior." Jordan Harband asked whether `xyz` is side-effecting. Oxlint's fix keeps both, because the type import is erased.
- **Caveat:** the same reporter filed both.
- **For the post:** `no-duplicates` can remove exactly the side effect that `no-import-type-side-effects` worries about adding.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/import-issue-3130.json`, `scratchpad/type-imports-lit/D/src/gh/import-issue-3130-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-19632.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24030.json`

### 7.48 import-x, 2025–2026: `no-duplicates` merged a value into a top-level `import type`; fixed in 4.18.0, still open upstream. ANECDOTAL (issue #231, PR #548)

- **Citation:** steved-stripe, "no-duplicates autofix incorrectly combines type and non-type typescript imports", un-ts/eslint-plugin-import-x #231, 13 Feb 2025; thekhegay, "fix(no-duplicates): keep type-only specifiers type-only when merging imports", PR #548, merged 29 Oct 2026, released 4.18.0 (2026-11-06).
- **What it says:** without `prefer-inline`, `import { type C, value }` and `import type { T }` share a group, and the fix produced `import type { …, checkPermissions }` (#231), "which does not compile (TS2206, and `value` turns type-only)." The PR says eslint-plugin-import has the same expectations and bug, open as import-js #2697.
- **Caveat:** installed import-x 4.17.1 predates the fix.
- **For the post:** a default-option `no-duplicates` fix can make a value type-only.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/importx-issue-231.json`, `scratchpad/type-imports-lit/D/src/gh/importx-issue-548.json`, `scratchpad/type-imports-lit/D/src/gh/importx-release-v4.18.0.json`

### 7.49 import-x, 2026: `no-duplicates` dropped a binding or wrote unparseable code. ANECDOTAL (PR #522; upstream #3224, #3236)

- **Citation:** giaBaoJS, "fix(no-duplicates): don't drop or mangle specifiers in merge autofix", import-x PR #522, merged 6 Oct 2026, released 4.18.0; upstream report import-js #3224, fixed there by #3236.
- **What it says:** "The `no-duplicates` autofix can drop a binding or emit code that no longer parses," depending on the first import. `import { x as y }` plus `import { x }` lost `x`; with `prefer-inline`, `import type { Observable } from 'rxjs'` plus `import { from } from 'rxjs'` became `import { type Observable, from  } type from 'rxjs'`.
- **Caveat:** the `from` case comes from matching tokens by value; fixed.
- **For the post:** token-level fixers are brittle around names that are also keywords (`type`, `from`).
- **Text:** `scratchpad/type-imports-lit/D/src/gh/importx-issue-522.json`, `scratchpad/type-imports-lit/D/src/gh/importx-release-v4.18.0.json`

### 7.50 Oxlint, July 2026: the new `no-duplicates` autofix broke type modifiers in Next.js's CI. ANECDOTAL (PR #24466) Vendor (VoidZero/Oxc)

- **Citation:** camc314, "fix(linter/import/no-duplicates): preserve type modifiers when merging imports", oxc PR #24466, merged 13 Jul 2026.
- **What it says:** merging a top-level type import with a mixed value/type import lost type-only semantics; the regression test is "based on the Next.js ecosystem CI failure". The autofix had landed four days earlier (#24273).
- **Caveat:** found by Oxc's own ecosystem CI, not a user.
- **For the post:** even with ecosystem CI, a merge fixer for type imports needed follow-up fixes within the week.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24466.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-24273.json`

### 7.51 Oxlint, October 2026: `no-duplicates` and `no-import-type-side-effects` fixes combined into a type-only import of a value. ANECDOTAL (PR #27409, issue #28068) Vendor (VoidZero/Oxc); My check (6.28)

- **Citation:** camc314, "fix(linter): prevent conflicting type import fixes", oxc PR #27409, merged 7 Oct 2026, released 1.88.0 (13 Oct 2026); tonypls, "linter: import/no-duplicates and typescript/no-import-type-side-effects fixes combine into an invalid type-only import", oxc #28068, 22 Oct 2026, open, reported on 1.86.0.
- **What it says:** #27409: the two fixes in one pass were "producing invalid syntax such as" `import type { CoreSetup, Logger, type LoggerFactory }`, which made the Kibana ecosystem CI job panic. #28068: with `prefer-inline`, "the output turns a value import into a type-only import." and "The fix exits 0 and reports nothing." My run of Oxlint 1.90.0 did not reproduce it (it fixed in two runs and ended valid), while ESLint with the equivalent rules did (6.28).
- **Caveat:** #28068 is still open although my run suggests 1.88.0's guard covers it; the reporter's version predates the guard.
- **For the post:** the clearest case that correct fixes compose into a broken one.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/oxc-pr-27409.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-28068.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-28068-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-release-oxlint_v1.88.0.json`, `scratchpad/type-imports-lit/D/check/oxlint/runs/ox-side-effects-plus-nodup-inline/out.txt`

### 7.52 Oxlint, November 2026: `no-import-type-side-effects`' safe fix removed a module's evaluation; now a suggestion. ANECDOTAL (issue #29491, PR #29502) Vendor (VoidZero/Oxc)

- **Citation:** jasonkuhrt, oxc #29491, 13 Nov 2026 (Oxlint 1.93.0); PR #29502, released 1.94.0.
- **What it says:** under `verbatimModuleSyntax`, `m.ts` printed "m.ts evaluated" before the fix and not after, in tsc's output and in Node 26 type stripping. See 6.17 for the change. My Node 24 run agrees (6.10).
- **Caveat:** single report, written by an AI agent for the reporter; fixed by a triage bot.
- **For the post:** the rule's premise, that the leftover import is unwanted, is usually but not always true, and a safe fix can't know.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/oxc-issue-29491.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-29491-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-29502.json`, `scratchpad/type-imports-lit/D/check/runtime/runtime-output.txt`

### 7.53 Oxlint, December 2025: `prefer-inline` rewrote imports of `.d.ts` files into a form TypeScript rejects. ANECDOTAL (issue #16649, PR #16979) Vendor (VoidZero/Oxc)

- **Citation:** JakobJingleheimer, "linter: `consistent-type-specifier-style: 'prefer-inline'` creates fight with `*.d.(c|m)?ts` imports", oxc #16649, 9 Dec 2025 (Oxlint 1.32.0); camchenry, PR #16979, merged 18 Dec 2025.
- **What it says:** `import type { AccessToken } from './token.d.ts'` was fixed to `import { type AccessToken } from './token.d.ts'`; Oxlint was happy and TypeScript wasn't. The fix forces top-level for declaration files in every mode (6.18).
- **Caveat:** fixed in nine days.
- **For the post:** declaration-file imports must be top-level, so `prefer-inline` can't be applied everywhere.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/oxc-issue-16649.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-16979.json`

### 7.54 Oxlint, 2025–2026: in Vue files the fix imported components as types, so the rule now skips Vue, Svelte and Astro. ANECDOTAL (issues #12511, #15748; PR #21415) Vendor (VoidZero/Oxc)

- **Citation:** haykkh, oxc #12511, 25 Jul 2025 (Oxlint 1.8.0); Satont, "linter: consistent-type-imports tries to import vue component with type", #15748, 16 Nov 2025; babu-ch, PR #21415, merged 14 Apr 2026.
- **What it says:** a component used in the template but only as a type in `<script>` was reported and fixed to a type import. camc314: the import "is used as a value in the template" but the rule "only sees the script-side type usage." #21415 skips `.vue`, `.svelte` and `.astro` files, aligning with `no-unused-vars`.
- **Caveat:** several reports of one limitation. Biome instead reads templates and has had its own template bugs (7.57).
- **For the post:** a template is code the rule can't see; skipping the file is the honest fix.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/oxc-issue-12511.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-15748.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-15748-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-pr-21415.json`

### 7.55 Oxlint: one fix pass per run, so conflicting type-import fixes take several runs, or never settle. ANECDOTAL (issues #14823, #22050, #16118) Vendor (VoidZero/Oxc); My check (6.28)

- **Citation:** JohannesIBK, oxc #14823, 20 Oct 2025, closed not planned 28 May 2026; robw-mercury, #22050, 1 May 2026, closed as duplicate; overlookmotel, "Linter: Apply fixes recursively", #16118, 25 Nov 2025, open.
- **What it says:** #14823: with `fixStyle: inline-type-imports` and `no-import-type-side-effects` both on, an all-type import needed two `--fix` runs. #16118: when fixes conflict or one creates work for another, "In both cases, `oxlint --fix` does not produce a stable state." camc314 on #22050: once #16118 lands "we will re-run the linter after the first fix pass".
- **Caveat:** ESLint loops up to 10 passes per run, which hides the problem, except for true ping-pongs (6.28).
- **For the post:** in Oxlint a non-converging pair shows up as a file that changes on every run.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/oxc-issue-14823.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-14823-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-22050-comments.json`, `scratchpad/type-imports-lit/D/src/gh/oxc-issue-16118.json`

### 7.56 Biome, 2024: `useImportType` turned `import React from 'react'` into a type import, by design at first. ANECDOTAL (issue #2004)

- **Citation:** ipanasenko, "`useImportType` fixes `import React from 'react'` into `import type React from 'react'`", biomejs/biome #2004, 8 Mar 2024 (Biome 1.6.0), closed 10 Apr 2024.
- **What it says:** the file used JSX with the classic runtime. Conaclos: "New versions of React no longer require/recommend to import React explicitly." The reporter was stuck on React 16. The rule now honours `javascript.jsxRuntime: "reactClassic"` (#2398, April 2024).
- **Caveat:** one report; resolved with an option, not detection.
- **For the post:** same failure as typescript-eslint's 2020 report (7.40), four years later.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/biome-issue-2004.json`, `scratchpad/type-imports-lit/D/src/gh/biome-issue-2004-comments.json`, `scratchpad/type-imports-lit/D/src/biome/cli-v1.9.4_CHANGELOG.md`

### 7.57 Biome, 2026: an enum used in a Svelte `{#if}` block was fixed to a type import. ANECDOTAL (issue #9098)

- **Citation:** Duckapple, "`useImportType` changed value-import of enum to type-import", biomejs/biome #9098, 16 Feb 2026 (Biome 2.4.0), fixed the same day by #9103 (2.4.2).
- **What it says:** the reporter expected the import "to be left alone." The changelog: the rule "no longer incorrectly flags imports used in Svelte control flow blocks". Other Svelte and Astro reports: #3477 (2024), #9119 and #9432 (2026).
- **Caveat:** one report per template construct; each fixed.
- **For the post:** reading templates trades Oxlint's blind spot for a long tail of template syntax.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/biome-issue-9098.json`, `scratchpad/type-imports-lit/D/src/biome/2.6.4_CHANGELOG.md`, `scratchpad/type-imports-lit/D/src/gh/biome-search-useimporttype.json`

### 7.58 Biome, 2024: the editor quick fix for `useImportType` corrupted imports a little more on every save. ANECDOTAL (issue #2268)

- **Citation:** vladkrasn, "🐛 Broken useImportType fix when 'quickfix.biome': 'explicit' is enabled", biomejs/biome #2268, 1 Apr 2024 (Biome 1.6.3), closed as a duplicate of #1550 and #1570.
- **What it says:** in VS Code with fix-on-save, mixed imports became `import { type type BtIntOptions, … }`, and "the code will become more and more broken." with each save; the CLI was fine. Sec-ant said #2237 would fix it; the reporter still saw broken output in 1.6.4.
- **Caveat:** editor-only; old.
- **For the post:** fix-on-save turns a non-idempotent fix into accumulating damage.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/biome-issue-2268.json`, `scratchpad/type-imports-lit/D/src/gh/biome-issue-2268-comments.json`

### 7.59 Decorator and DI reports, covered in 7.20–7.33. UNVERIFIED here (titles only, from saved searches)

- **Citation:** saved search results only.
- **What it says:** typescript-eslint #2559 (NestJS, 2020; read for 6.4/6.7), #5468 (read for 6.4), #7101, #7214, #7327, #6077, #8582, #10200; Biome #2003 and #2038 (read for 6.22), #2309, #4514, #6021, #10495; oxc #6835 (read for 6.16).
- **Caveat:** apart from those read for section 6, I only saw titles.
- **For the post:** see section 4 and 7.20–7.33.
- **Text:** `scratchpad/type-imports-lit/D/src/gh/tseslint-search-cti-bugs.json`, `scratchpad/type-imports-lit/D/src/gh/tseslint-search-cti-notplanned.json`, `scratchpad/type-imports-lit/D/src/gh/biome-search-useimporttype-decorator.json`

---

## 8. Research, preferences and agents

### 8.1 Scarsbrook, Utting and Ko (2023): among 13 TypeScript features from 2020–2022, the `type` modifier on import names was the most adopted. VERIFIED (arXiv full text)

- **Citation:** Joshua D. Scarsbrook, Mark Utting, Ryan K. L. Ko, "TypeScript's Evolution: An Analysis of Feature Adoption Over Time," arXiv:2303.09802, 17 Mar 2023. https://arxiv.org/abs/2303.09802
- **Method:** the top 500 starred TypeScript repositories on GitHub (list taken 4 Jan 2023), of which 454 had a TypeScript version recorded; every `.ts` file in every commit on every branch from 2020 to 2022 (1,325,810 commits) parsed with the TypeScript parser, recording the first appearance of each of 13 syntactic features.
- **What it says:**
  - "The most popular feature in this dataset is f4 (type modifiers on import)". Feature f4 is TypeScript 4.5's "type import modifier", the inline `import { type A }` form, not 3.8's `import type`.
  - It is in the group with "more than 20 repositories adopting them within one year after release"; the exact count is only in Figure 1.
  - The authors' reasons: the modifier means imports "are erased when" compiled, and "It can also help to break import loops in some cases"; type modifiers "solve an existing issue of unintended side effects from imported modules".
- **Caveat:** a short preprint (no peer-reviewed version found); top-starred repositories only; counts first use anywhere, including tests and feature branches, not consistent use; TypeScript 3.8's `import type` wasn't measured; the import-loop claim isn't tested.
- **For the post:** the only study that measures type-only imports in the wild, and it finds the inline form spread faster than any other new syntax of its era.
- **Text:** `scratchpad/type-imports-lit/E/text/arxiv-2303.09802.txt`, `scratchpad/type-imports-lit/E/text/arxiv-2303.09802-abs.txt`

### 8.2 Zandonotto et al. (JSERD 2026): the one large study of tsconfig files in the wild left module options out on purpose. VERIFIED (full text; my check of the published dataset)

- **Citation:** Thomaz Zandonotto, Alex Roehrs, Kleinner Silva Farias de Oliveira, Jorge Luis Victória Barbosa, Cristiano André da Costa, Rodrigo da Rosa Righi, "How TypeScript Compiler Options Influence Code Quality: A Correlation Study with Git Repositories", _Journal of Software Engineering Research and Development_, 6 Aug 2026. https://doi.org/10.5753/jserd.2026.5985 ; data at https://github.com/thomazmz/tsconfig-scanner (`3cf396ce`).
- **Method:** 4,215 public GitHub TypeScript repositories; `tsconfig.json` parsed; SonarQube bugs and smells per KLOC correlated with 19 compiler options.
- **What it says:** "the present study deliberately focused on the 19 options that directly influence static analysis" and type safety; options about "module resolution, library inclusion, or transpilation" were excluded. The 19 are all strictness and unused-code flags.
- **My check:** the published `data/scanning_results_data.json` (4,215 records) stores only those 19 options per repository, so it can't be reused to count `isolatedModules` or `verbatimModuleSyntax`.
- **For the post:** no published study reports how many projects use `isolatedModules` or `verbatimModuleSyntax`. The corpus harness would have to count it.
- **Text:** `scratchpad/type-imports-lit/E/text/jserd-2026-5985.txt`, `scratchpad/type-imports-lit/E/src/research/crossref-jserd-2026-5985.json`, `scratchpad/type-imports-lit/E/src/research/tsconfig-scanner-SHA.txt`, `scratchpad/type-imports-lit/E/src/research/tsconfig-scanner-scanning_results_data-3cf396ce.json`

### 8.3 Module syntax in JavaScript research: import statements are in about half to two-thirds of projects, and migrating to ES modules is studied as a refactoring. VERIFIED (EMSE full text from the author repository); VERIFIED (metadata + abstract) for the JSS paper

- **Citations:** Walter Lucas et al., "Understanding the adoption of modern Javascript features: An empirical study on open-source systems", _Empirical Software Engineering_ 30:107, 2025, https://doi.org/10.1007/s10664-025-10663-9 (full text from repositorium.uminho.pt). Katerina Paltoglou, Vassilis E. Zafeiris, N. A. Diamantidis, E. A. Giakoumakis, "Automated refactoring of legacy JavaScript code to ES6 modules", _Journal of Systems and Software_ 181, 2021, https://doi.org/10.1016/j.jss.2021.111049 ; arXiv:2107.10164.
- **What they say:**
  - Lucas et al.: Import Statements are among features "whose prevalence ranges from 51 to 68% across projects"; one example commit replaces `require` with ES imports for tree shaking. Its related work summarises Scarsbrook et al. (8.1).
  - Paltoglou et al.: a refactoring from ES5 module patterns to named ES6 imports and exports, "empirically evaluated on 19 open source projects".
- **Caveat:** JavaScript, not TypeScript; neither mentions type-only imports.
- **For the post:** context only. ES module syntax is still not universal in JavaScript projects.
- **Text:** `scratchpad/type-imports-lit/E/text/lucas-emse-2025.txt`, `scratchpad/type-imports-lit/E/src/research/crossref-10_1007_s10664-025-10663-9.json`, `scratchpad/type-imports-lit/E/text/arxiv-2107.10164-abs.txt`, `scratchpad/type-imports-lit/E/src/research/crossref-10_1016_j_jss_2021_111049.json`

### 8.4 ESM against CommonJS on npm: CommonJS-only packages fell from 77% to 52% of popular packages between 2021 and 2026. ANECDOTAL (a maintained measurement repository, not peer-reviewed)

- **Citation:** Titus Wormer, wooorm/npm-esm-vs-cjs, `readme.md` and `index.csv` at `3531861b45f734e9778c71de1b8136669e68031f` (8 Jun 2026). https://github.com/wooorm/npm-esm-vs-cjs
- **Method:** crawls the `package.json` of the latest release of "high-impact" npm packages and classifies each as ESM (`type: 'module'`), dual (both `import` and `require` export conditions), faux ESM (a `module` field) or CJS (everything else, `@types/*` excluded).
- **What it says (my arithmetic from the CSV):**
  - 24 Aug 2021: 5,617 packages; ESM 341 (6.1%), dual 95 (1.7%), faux 832 (14.8%), CJS 4,349 (77.4%).
  - 5 Jun 2025: 8,677; ESM 11.5%, dual 18.1%, CJS 60.5%.
  - 8 Jun 2026: 16,231; ESM 2,590 (16.0%), dual 3,574 (22.0%), faux 1,689 (10.4%), CJS 8,378 (51.6%).
  - The author: "Use this data for rough insights on how the shift to ESM is progressing." "The data isn’t perfect though."
- **Caveat:** the package list changed source at the 4 Dec 2025 crawl (more packages), so the series has a break; CJS is the default bucket and includes non-code packages.
- **For the post:** about half of popular npm packages still publish CommonJS only, which is why `verbatimModuleSyntax` (which ties the import you write to the format emitted) can't be a universal default.
- **Text:** `scratchpad/type-imports-lit/E/src/research/npm-esm-vs-cjs-readme-3531861b.md`, `scratchpad/type-imports-lit/E/src/research/npm-esm-vs-cjs-SHA.txt`

### 8.5 Build performance: the TypeScript wiki says `isolatedModules` doesn't make emit faster by itself, and the only speed number found is Angular's. ANECDOTAL (TypeScript wiki, read 17 Nov 2026); Vendor (Microsoft; Google)

- **Citation:** microsoft/TypeScript wiki, Performance page, section "Isolated File Emit". https://github.com/microsoft/TypeScript/wiki/Performance (unversioned; raw copy read 17 Nov 2026). Angular's number is in 6.45.
- **What it says:** emit for some features needs other files, which "can make emit slower." The flag only reports those features: it "doesn't automatically make code generation faster -" "it just tells you when you're about to use a feature" that isolated emit can't handle; the speed comes from tools that use isolated emit.
- **Caveat:** no study measures the build-time effect of `isolatedModules`, `verbatimModuleSyntax` or type-only imports; Angular's 2.3 s to 2.0 s is one new project.
- **For the post:** frame speed as what the flag enables (per-file transpilers), not what it does.
- **Text:** `scratchpad/type-imports-lit/E/text/ts-wiki-Performance.md`

### 8.6 No empirical study of import elision, type-only imports' runtime effect, or `isolatedModules` adoption turned up. Negative finding

- **Searched (17 Nov 2026):** OpenAlex (no `mailto`) for `tsconfig`, `TypeScript compiler options`, `type-only imports`, `isolatedModules`, `ECMAScript modules CommonJS npm`, `ES modules adoption npm packages` and `JavaScript module system migration`; Semantic Scholar (no key) for `type-only imports TypeScript` (later queries returned nothing, likely rate-limited); the arXiv API for `CommonJS` and `ECMAScript modules` (timed out after the first query, stopped); web searches for ESM/CJS adoption studies; the related-work sections of 8.1–8.3.
- **Found:** 8.1 (the only study touching type-only imports), 8.2 (tsconfig, module options excluded), 8.3 (JavaScript module syntax), 8.4 (a non-academic measurement). Also seen but not relevant: Yee and Guha (type-escape-hatches.md 6.2) converted CommonJS packages to ESM because `require` loses types; arXiv:2405.17939 studies bloated CommonJS dependencies.
- **For the post:** every claim about how common type-only imports or these flags are has to come from the corpus harness.
- **Text:** `scratchpad/type-imports-lit/E/src/research/openalex-tsconfig.json`, `scratchpad/type-imports-lit/E/src/research/openalex-isolatedModules.json`, `scratchpad/type-imports-lit/E/src/research/openalex-type-only_imports.json`, `scratchpad/type-imports-lit/E/src/research/s2-type-only_imports_TypeScript.json`

### 8.10 State of JS asks nothing about type-only imports; writing modules was a pain point for 9% of 2024 respondents. VERIFIED (survey definitions and results data at a pinned SHA)

- **Citation:** Devographics/surveys at the SHA in `scratchpad/type-imports-lit/E/src/surveys/SHA.txt`: `state_of_js/js2024/questions.yml`, `js2025/questions.yml`, `js2024/results/data/usage/top_js_pain_points.json`.
- **What it says:**
  - No 2024 or 2025 question mentions `import type`, type-only imports, `verbatimModuleSyntax` or `isolatedModules`.
  - 2024 pain points: 10,599 of 14,015 respondents answered; 948 (8.9%) picked `writing_modules`, 11th of 13 options; 17 wrote in ESM/CJS.
- **Caveat:** writing modules isn't type imports; a self-selected survey.
- **For the post:** there is no survey data on how developers feel about type-only imports.
- **Text:** `scratchpad/type-imports-lit/E/src/surveys/state_of_js-js2024-questions.yml`, `scratchpad/type-imports-lit/E/src/surveys/state_of_js-js2025-questions.yml`, `scratchpad/type-imports-lit/E/src/surveys/state_of_js-js2024-top_js_pain_points.json`, `scratchpad/type-imports-lit/E/src/surveys/SHA.txt`

### 8.11 XO's maintainers, 2021–2022: from "you should rarely need them" to "I use type imports a lot now". ANECDOTAL (issue thread)

- See 6.35 for the quotes and links. The one first-hand record of a maintainer of a widely used config changing their mind, with the reasons (explicitness, certainty that nothing but a type is imported) and the earlier objection (the TypeScript team said they were rarely needed). The objection's source, a 2020 tweet, couldn't be opened.
- **Text:** `scratchpad/type-imports-lit/E/src/xo/xo-issue-539.json`, `scratchpad/type-imports-lit/E/src/xo/xo-issue-539-comments.json`

### 8.12 Vite's own repo, 2021: forcing type imports drew "What's the benefit of forcing this tho?" ANECDOTAL (PR thread); Vendor (VoidZero)

- **Citation:** vitejs/vite PR #5835, "chore: prefer type imports", Shinigami92, opened 25 Nov 2021, merged 19 Dec 2021 (95 files, +337 −337).
- **What it says:**
  - The reason given: "This improves TS compiled output and removes (in some cases) unnecessary empty imports."
  - Anthony Fu in review: "What's the benefit of forcing this tho?" For Fu, the point "was mainly to avoid accidentally introducing side-effects from the modules" whose types you import; when the module's runtime values are already imported, the separate `type` "specifier kinda lost the advantage." The change also split one import line into two.
  - Shinigami92: "The two lines are sometimes better cause they are then not wrapped" and "Also the imports at the top are mostly not for read but auto organized"; the inline form would wait until typescript-eslint's fixer supported it.
- **Today:** Vite's `oxlint.config.ts` at `3dfda249` (18 Nov 2026) keeps `typescript/consistent-type-imports` with `prefer: 'type-imports'`.
- **For the post:** the cost argument against the rule (two import lines where there was one) and the reply (imports are machine-sorted, not read) in one thread; the inline style answers it.
- **Text:** `scratchpad/type-imports-lit/E/src/vite/pr-5835.json`, `scratchpad/type-imports-lit/E/src/vite/pr-5835-comments.json`, `scratchpad/type-imports-lit/E/src/vite/pr-5835-review-comments.json`, `scratchpad/type-imports-lit/E/src/projects/vitejs_vite__oxlint.config.ts`

### 8.13 Next.js's own repo turned on `verbatimModuleSyntax` in 2023 because type imports kept coming up in review. ANECDOTAL (PR); Vendor (Vercel)

- **Citation:** vercel/next.js PR #56551, "enable 'verbatimModuleSyntax' to make type imports/exports explicit", ztanner, 7 Oct 2023 (308 files, +714 −738).
- **What it says:** "This has come up in code review a few times," "so enabling the tsconfig setting so it's more easily caught." `packages/next/tsconfig.json` still sets it at `v16.4.6`, and the repo's `eslint.config.mjs` at `ffbf2f69` adds `consistent-type-imports` and `no-import-type-side-effects` for `packages/**`.
- **For the post:** the reason a large team gives is review load: a compiler error replaces a reviewer comment.
- **Text:** `scratchpad/type-imports-lit/E/src/next/issue-56551.json`, `scratchpad/type-imports-lit/E/src/next/pr-56551.json`, `scratchpad/type-imports-lit/E/src/next/packages-next-tsconfig-v16.4.6.json`, `scratchpad/type-imports-lit/E/src/projects/vercel_next.js__eslint.config.mjs`

### 8.14 typescript-eslint's own repo turned `consistent-type-exports` off after its fix shipped syntax older TypeScript couldn't read. ANECDOTAL (repo config and issue)

- **Citation:** typescript-eslint/typescript-eslint at `a53584297a1fa65f4cc91387b0a7da834ab73ed7` (17 Nov 2026), `eslint.config.mjs` and `tsconfig.base.json`; issue #10065, "Bug: 'export type *' in output .d.ts files break TS<5", Josh Goldberg, 27 Sep 2024; PR #10361 (Feb 2025).
- **What it says:**
  - `consistent-type-exports` is `'off'` with the comment "TODO: enable it once we drop support for TS<5.0" and a link to #10065: PR #10006 (Sep 2024) taught the rule to check `export *`, and the repo's own code then put `export type *` into the published `.d.ts` files, which TypeScript 4.8 rejects with TS1383 when `skipLibCheck` is off.
  - `consistent-type-imports` is on (`prefer: 'type-imports'`), and `import/consistent-type-specifier-style` is on at its default.
  - `tsconfig.base.json` sets `"isolatedModules": true` and `"verbatimModuleSyntax": false` (added in #10361; a reviewer listed it among options set "to their defaults"; no reason given).
- **For the post:** a failure mode worth a sentence: an autofix to type-only re-exports can raise the minimum TypeScript version of a library's published types.
- **Text:** `scratchpad/type-imports-lit/E/src/projects/typescript-eslint_typescript-eslint__eslint.config.mjs`, `scratchpad/type-imports-lit/E/src/projects/typescript-eslint_typescript-eslint__tsconfig.base.json`, `scratchpad/type-imports-lit/E/src/projects/tseslint-issue-10065.json`, `scratchpad/type-imports-lit/E/src/projects/tseslint-pr-10006-title.txt`, `scratchpad/type-imports-lit/E/src/projects/tseslint-pr-10361-review-comments.json`, `scratchpad/type-imports-lit/E/src/projects/tseslint-tsconfig-base-history.txt`

### 8.15 Deno requires type imports for code published to JSR, and its standard library was converted in 2024. ANECDOTAL (docs; PR); Vendor (Deno Land)

- **Citation:** Deno docs, lint rule `verbatim-module-syntax` (read 17 Nov 2026), https://docs.deno.com/lint/rules/verbatim-module-syntax/ ; denoland/std PR #4406, "refactor: make the code work under 'verbatimModuleSyntax'", David Sherret, merged 27 Feb 2024 (96 files); denoland/std `deno.json` at `f834d022`.
- **What it says:**
  - The rule "is part of the jsr rule set" and "Enforces type imports to be declared as type imports." It is "useful in libraries distributing TypeScript code" "in order to work in more scenarios."
  - Sherret: "I have an upcoming lint rule to enforce this." The std `deno.json` enables the `recommended` and `jsr` tags.
- **For the post:** a registry that ships TypeScript source makes the rule part of publishing, because the consumer's compiler settings are unknown.
- **Text:** `scratchpad/type-imports-lit/E/text/deno-docs-lint-verbatim-module-syntax.txt`, `scratchpad/type-imports-lit/E/src/projects/deno-std-pr-4406.json`, `scratchpad/type-imports-lit/E/src/projects/denoland_std__deno.json`

### 8.16 What 11 large projects set today: 7 enforce type imports one way or another, 4 don't, and they split on style. My check (root and package configs at pinned SHAs, 17–18 Nov 2026)

- **Method:** read the root lint config and tsconfig (and one package tsconfig where the root had none) at each project's default-branch SHA in `scratchpad/type-imports-lit/E/src/projects/shas.txt`; grep for the three rules, `consistent-type-specifier-style`, `no-duplicates`, `verbatimModuleSyntax` and `isolatedModules`.
- **What it found:**
  - **Vue core:** `consistent-type-imports` (`fixStyle: 'inline-type-imports'`) and `no-import-type-side-effects`; tsconfig `isolatedModules`, not `verbatimModuleSyntax`. The config comment: "Enforce the use of 'import type' for importing types".
  - **Vitest:** Oxlint with `consistent-type-imports` (`separate-type-imports`), `no-import-type-side-effects`, and `consistent-type-specifier-style` `prefer-top-level`, antfu's choices.
  - **Vite:** Oxlint `consistent-type-imports`; **Next.js:** the flag plus both rules (8.13); **typescript-eslint:** imports rule on, exports rule off (8.14); **Svelte:** `verbatimModuleSyntax` in `packages/svelte/tsconfig.json`, no rule; **Deno std:** the `jsr` lint tag (8.15). Outside the 11, **Gemini CLI** sets the flag and the imports rule (8.17).
  - **None found:** VS Code (`eslint.config.js`, `oxlint.config.ts`, `src/tsconfig.base.json`), Angular (`packages/tsconfig.json`), Prettier (`eslint.config.js`, `tsconfig.json`), DefinitelyTyped (`.eslintrc.cjs`; its own lint plugin wasn't checked).
  - The TypeScript repository's default branch is now the Go port, so it was left out.
- **Caveat:** root configs only; a rule set in a nested config would be missed. 12 projects named in the brief, of which 11 could be checked; not a sample.
- **For the post:** among large projects, enforcing type imports is the majority choice but not universal, and the inline and top-level styles both have major users.
- **Text:** `scratchpad/type-imports-lit/E/src/projects/shas.txt`, `scratchpad/type-imports-lit/E/src/projects/vuejs_core__eslint.config.js`, `scratchpad/type-imports-lit/E/src/projects/vuejs_core__tsconfig.json`, `scratchpad/type-imports-lit/E/src/projects/vitest-dev_vitest__.oxlintrc.jsonc`, `scratchpad/type-imports-lit/E/src/projects/vitejs_vite__oxlint.config.ts`, `scratchpad/type-imports-lit/E/src/projects/sveltejs_svelte__packages_svelte_tsconfig.json`, `scratchpad/type-imports-lit/E/src/projects/sveltejs_svelte__eslint.config.js`, `scratchpad/type-imports-lit/E/src/projects/microsoft_vscode__eslint.config.js`, `scratchpad/type-imports-lit/E/src/projects/microsoft_vscode__oxlint.config.ts`, `scratchpad/type-imports-lit/E/src/projects/microsoft_vscode__src_tsconfig.base.json`, `scratchpad/type-imports-lit/E/src/projects/angular_angular__packages_tsconfig.json`, `scratchpad/type-imports-lit/E/src/projects/prettier_prettier__eslint.config.js`, `scratchpad/type-imports-lit/E/src/projects/prettier_prettier__tsconfig.json`, `scratchpad/type-imports-lit/E/src/projects/DefinitelyTyped_DefinitelyTyped__.eslintrc.cjs`, `scratchpad/type-imports-lit/E/src/projects/tree-microsoft_TypeScript.txt`

### 8.17 Gemini CLI's repo adopted both the flag and the rule in 2025, across 332 files. ANECDOTAL (PR; current config); Vendor (Google)

- **Citation:** google-gemini/gemini-cli PR #3774, "Explict imports & exports with 'type' modifier", swissspidy, opened 10 Jul 2025, merged 25 Aug 2025 (332 files, +1083 −1102); `tsconfig.json` and `eslint.config.js` at the SHA in `scratchpad/type-imports-lit/E/src/agents/gemini-main-SHA.txt`.
- **What it says:** the PR opens with typescript-eslint's own wording, a `type` keyword "to indicate that the export exists only in the type system, not at runtime." It enforces this with both `verbatimModuleSyntax` and `consistent-type-imports`; both are still set (`disallowTypeAnnotations: false`).
- **For the post:** an agent vendor's own codebase uses the compiler flag and the lint rule together, the pairing the typescript-eslint docs say can produce duplicate reports.
- **Text:** `scratchpad/type-imports-lit/E/src/agents/gemini-pr-3774.json`, `scratchpad/type-imports-lit/E/src/agents/gemini-tsconfig-4f343cab.json`

### 8.20 No study measures type-only imports, or any import style, in model-written TypeScript. Negative finding; cross-reference `type-escape-hatches.md` 6.1–6.4 and `import-cycles.md` 5.5

- **Searched:** the full texts of Mündler et al. (arXiv:2504.09246, PLDI 2025), Yee and Guha (arXiv:2302.12163, ECOOP 2023) and Huang et al., "How Robust are LLM-Generated Library Imports?" (arXiv:2507.10818, TSE), for `import type`, `type-only`, `verbatimModuleSyntax`, `isolatedModules` and `tsconfig`; web searches for LLM studies of TypeScript compiler errors.
- **Found:**
  - Mündler et al.'s TypeScript benchmark, the source of the "94% of compilation errors" figure (type-escape-hatches.md 6.1), lists "General Library Imports" among unsupported features in Table 6; only `crypto` via `require` is modelled. Its tasks are single functions, so the figure says nothing about import errors.
  - Huang et al. study library imports in Python code from Stack Overflow questions; Yee and Guha mention modules only to explain converting CommonJS to ESM.
  - What exists on imports is about missing or invented packages and modules (import-cycles.md 5.5).
- **For the post:** whether agents write `import type` correctly is unmeasured. The agent harness could count TS1484 errors and `consistent-type-imports` reports in agent-written diffs.
- **Text:** `scratchpad/type-imports-lit/E/text/arxiv-2504.09246.txt`, `scratchpad/type-imports-lit/E/text/arxiv-2302.12163.txt`, `scratchpad/type-imports-lit/E/text/arxiv-2507.10818.txt`

### 8.21 The agent vendors' docs say nothing about type imports or tsconfig flags; Anthropic's say to give Claude the typecheck command, which is how `verbatimModuleSyntax` errors reach it. ANECDOTAL (official docs, read 17 Nov 2026); Vendor (Anthropic; OpenAI; Anysphere; Vercel)

- **Citations:** code.claude.com `/docs/en/best-practices.md` and `/docs/en/memory.md`; OpenAI's AGENTS.md guide (developers.openai.com/codex/guides/agents-md, which redirected to learn.chatgpt.com/docs/agent-configuration/agents-md); agents.md; cursor.com/docs/context/rules (redirected to /docs/rules); nextjs.org/docs/app/guides/ai-agents. All unversioned, read 17 Nov 2026.
- **What they say:**
  - None of the six pages mentions `import type`, type-only imports, `verbatimModuleSyntax`, `isolatedModules`, `tsconfig` or `consistent-type-imports` (grep of the saved text).
  - Anthropic: CLAUDE.md should hold "the exact test, typecheck, and lint commands"; "Claude needs to know the command" "so it can check its own work as it goes." An instruction to typecheck "works most of the time, not every time.", so the docs show a `Stop` hook running `pnpm tsc --noEmit`.
- **For the post:** with `verbatimModuleSyntax`, a missing `import type` is a compiler error, so it reaches an agent through whatever typecheck it is told or forced to run; with only the lint rule, it reaches the agent only if the lint command is run. Cross-reference `nested-ternaries.md` 10.11 and `func-style.md` 8.7 for the vendors' general advice to rely on linters.
- **Text:** `scratchpad/type-imports-lit/E/text/vendor-code_claude_com_docs_en_best-practices_md.txt`, `scratchpad/type-imports-lit/E/text/vendor-code_claude_com_docs_en_memory_md.txt`, `scratchpad/type-imports-lit/E/text/vendor-developers_openai_com_codex_guides_agents-md.txt`, `scratchpad/type-imports-lit/E/text/vendor-agents_md_.txt`, `scratchpad/type-imports-lit/E/text/vendor-cursor_com_docs_context_rules.txt`, `scratchpad/type-imports-lit/E/text/vendor-nextjs_org_docs_app_guides_ai-agents.txt`

### 8.22 Instruction collections for agents almost never mention type imports, and the one tsconfig instruction found turns `verbatimModuleSyntax` off. ANECDOTAL (my count of files at pinned commits); Vendor (GitHub/Microsoft for awesome-copilot; Vercel)

- **Citation:** github/awesome-copilot at `a255a193d1318e5a9ca3e9e575897f9a7845c099` (17 Nov 2026), all 195 `instructions/*.instructions.md`; PatrickJS/awesome-cursorrules at `b044f956f021b6e8877f16781bcfc466a6a120e9` (30 May 2026), all 257 rule files under `rules/`; vercel-labs/agent-skills at `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` (27 Oct 2026), all 210 Markdown files.
- **Method (17 Nov 2026):** case-insensitive grep for `import type`, `type-only import`, `type imports`, `import { type`, `verbatimModuleSyntax`, `isolatedModules` and `consistent-type-imports`.
- **What it found:**
  - awesome-copilot: 4 matching files. The only instruction is Power Apps Code Apps: set `verbatimModuleSyntax: false` "for Power Apps SDK compatibility", with a troubleshooting line to "Check verbatimModuleSyntax setting and SDK compatibility". The Copilot SDK file uses `import type` in an example; the other two are Bicep and Python.
  - awesome-cursorrules (117 of 257 files mention TypeScript): 2 near-identical files say "Use import type { ActionResponse } from '@/types/actions'" for server actions; 2 more use `import type` in examples (Next.js metadata, Netlify functions); 1 sets `isolatedModules` in a sample tsconfig; 1 is Python's `typing`. None states a rule for type imports in general.
  - Vercel's React skill (`skills/react-best-practices/AGENTS.md`): 42 import lines in its examples, none with `import type`. No file in the repo mentions the flags or rules.
- **Caveat:** stars aren't use; these are instructions written for models, read as data; a grep count.
- **For the post:** what people tell agents about type imports is close to nothing, so agents follow the project's compiler and linter, and copy the file around them.
- **Text:** `scratchpad/type-imports-lit/E/src/vendor/awesome-copilot-SHA.txt`, `scratchpad/type-imports-lit/E/src/vendor/awesome-copilot-hits.txt`, `scratchpad/type-imports-lit/E/src/vendor/awesome-copilot/power-apps-code-apps.instructions.md`, `scratchpad/type-imports-lit/E/src/vendor/awesome-cursorrules-SHA.txt`, `scratchpad/type-imports-lit/E/src/vendor/awesome-cursorrules/nextjs-react-typescript-cursorrules-prompt-file.mdc`, `scratchpad/type-imports-lit/E/src/vendor/awesome-cursorrules/react-typescript-nextjs-nodejs-cursorrules-prompt-.mdc`, `scratchpad/type-imports-lit/E/src/vendor/vercel-agent-skills-SHA.txt`, `scratchpad/type-imports-lit/E/src/vendor/vercel-agent-skills/skills__react-best-practices__AGENTS.md`

### 8.23 An agent PR to enable `verbatimModuleSyntax` surfaced a hidden runtime cycle; the agent's fix was rejected and a human used the lint rules' autofix instead. ANECDOTAL (issue and PRs)

- **Citation:** Comfy-Org/ComfyUI_frontend PR #5533 "feat: enable verbatimModuleSyntax in TypeScript config" (snomiao, opened 13 Sep 2025, merged 19 Sep 2025; body ends "Generated with [Claude Code]"); issue #5545 (14 Sep 2025); PR #5546 "fix: resolve circular dependency to enable verbatimModuleSyntax" (Claude Code, closed unmerged); PR #5616 "Lint: Turn on rules that should allow for verbatimModuleSyntax" (DrJKL, merged 17 Sep 2025, 215 files). Cross-reference `import-cycles.md` 5.6, which listed #5546.
- **What happened:**
  - #5533 turned on the flag and converted imports in 37 files. Tests then failed with "Class extends value undefined is not a constructor or null". The issue's diagnosis: "The strict import/export requirements expose circular dependencies that were previously hidden", through `EmptySubgraphInput → SubgraphInput → SubgraphInputNode → EmptySubgraphInput`.
  - The issue also claims "Values and types cannot be mixed in the same import statement", which is wrong: inline `type` specifiers are allowed under the flag.
  - #5546's fix used lazy getters, `require()` with ESLint disable comments, and identity checks in place of `instanceof`. Its author closed it about an hour later: "closed this as bad impl".
  - #5616 instead turned on `consistent-type-imports` and `no-import-type-side-effects` "with the default options, existing violations were all auto-fixable." #5533 merged two days later; `verbatimModuleSyntax` is still on.
- **Caveat:** one repository; the diagnosis is the reporter's; I didn't reproduce the cycle.
- **For the post:** the mechanism is real and worth explaining: under `verbatimModuleSyntax` a plain import of something used only as a type is no longer dropped, so a cycle that elision used to hide starts running. The fix that worked was marking the type-only imports, which the lint rule's autofix does in bulk; the agent's fix worked around the cycle and was rejected.
- **Text:** `scratchpad/type-imports-lit/E/src/agents/comfy-pr-5533.json`, `scratchpad/type-imports-lit/E/src/agents/comfy-pr-5533-comments.json`, `scratchpad/type-imports-lit/E/src/agents/comfy-issue-5545.json`, `scratchpad/type-imports-lit/E/src/agents/comfy-pr-5546.json`, `scratchpad/type-imports-lit/E/src/agents/comfy-pr-5546-comments.json`, `scratchpad/type-imports-lit/E/src/agents/comfy-pr-5616.json`, `scratchpad/type-imports-lit/E/src/agents/comfy-tsconfig-5e35c19d.json`

### 8.24 Gemini CLI looped for ten minutes on a build error that `import type` would have fixed. ANECDOTAL (single user report); Vendor (Google)

- **Citation:** google-gemini/gemini-cli issue #5224, "Gemini not understanding 'verbatimModuleSyntax'.", redsquare, 30 Jul 2025, closed the same day as a duplicate (no comments). CLI 0.1.14, gemini-2.5-pro.
- **What it says:** the agent "Went in a 10 minute loop changing import statements and paths" "to try and resolve a build issue"; the reporter expected it simply to write a type-only import.
- **For the post:** one report of the failure the compiler error is meant to prevent: an agent treating TS1484 as a path problem.
- **Text:** `scratchpad/type-imports-lit/E/src/agents/gemini-issue-5224.json`

### 8.25 GitHub's Copilot coding agent opens many small PRs that fix `verbatimModuleSyntax` errors, and one PR's description didn't match its diff. My check (GitHub search, 17 Nov 2026), re-run before quoting; ANECDOTAL for the example; Vendor (GitHub/Microsoft)

- **Method:** `gh api search/issues` with `verbatimModuleSyntax is:pr author:app/copilot-swe-agent` (GitHub reported 306; the first 200 were saved), and a title-only search `verbatimModuleSyntax is:pr in:title` (534 PRs by anyone). Classified by regular expression on titles and bodies.
- **What it found:**
  - Of the 200 Copilot PRs, 97 titles contain fix, build, error, CI or compile; 77 bodies contain "import type"; 12 cite TS1484; 21 titles name the flag or type-only imports directly, for example "fix: use type-only import for ReactNode (verbatimModuleSyntax)" and "fix: type-only import for MapMarker (TS1484 with verbatimModuleSyntax)". 129 were merged.
  - PEJED/shmmy_roes_app: #45 (22 Feb 2026) fixed the error correctly by splitting `FlowSelection` into an `import type`. About an hour later #50, titled "Remove flowValidation.test.ts causing verbatimModuleSyntax build failure", said it "Deleted" the test file, but its only changed file is `package-lock.json` and its commit message is "No further changes needed - build already fixed". It was merged.
- **Caveat:** search counts are approximate and include unrelated mentions; the PRs are mostly in small or personal repositories; this says nothing about how often agents cause the errors.
- **For the post:** TS1484 is a routine error that agents fix one import at a time, which is the case for a lint autofix doing it in one pass; and an agent PR's description is not evidence of what its diff does.
- **Text:** `scratchpad/type-imports-lit/E/check/gh-search/run-date.txt`, `scratchpad/type-imports-lit/E/check/gh-search/copilot-verbatim-page1.json`, `scratchpad/type-imports-lit/E/check/gh-search/copilot-verbatim-page2.json`, `scratchpad/type-imports-lit/E/check/gh-search/copilot-verbatim-classify.txt`, `scratchpad/type-imports-lit/E/check/gh-search/copilot-verbatim-titles.txt`, `scratchpad/type-imports-lit/E/src/agents/pejed-pr-45.json`, `scratchpad/type-imports-lit/E/src/agents/pejed-pr-45-files.json`, `scratchpad/type-imports-lit/E/src/agents/pejed-pr-50.json`, `scratchpad/type-imports-lit/E/src/agents/pejed-pr-50-files.json`, `scratchpad/type-imports-lit/E/src/agents/pejed-pr-50-commits.json`

### 8.26 NestJS now generates an AGENTS.md for every project; it says nothing about imports or tsconfig. ANECDOTAL (template at 12.0.13)

- **Citation:** nestjs/schematics `12.0.13`, `src/lib/application/files/ts/AGENTS.md`.
- **What it says:** it opens "This app's version of NestJS is likely newer than what you know." and points the agent at `llms.txt`; it lists first-party packages and promotes NestJS Observe and its MCP server. The only module line, in the one-file layout, says the project is ESM and relative imports end in `.js`.
- **For the post:** frameworks now write agent instructions into new projects, and the first one found leaves import style to the tsconfig (6.46).
- **Text:** `scratchpad/type-imports-lit/E/src/nest/schematics-12.0.13-ts-AGENTS.md`

### 8.27 Cross-references: agents fixing compiler and lint errors. Not re-verified

- **Compiler errors:** Mündler et al. (type-escape-hatches.md 6.1), with the caveat in 8.20; AgenticTyper fixing all 633 type errors in two JavaScript repos, with counted suppressions (6.5).
- **Lint errors:** LintEval, CORE and CodeCureAgent (length-limits.md 5.51–5.53): analyser-passing fixes can break files or change behaviour, and the checks do much of the work.
- **Import graph:** the barrel cycle Claude Code shipped to production and other cycle reports (import-cycles.md 5.9).
- **For the post:** type-import errors are the easy end of this: the fix is mechanical and fully automated by the rule's autofix, so the risk is less a wrong fix than a workaround (8.23, 8.24).

---

## 9. Ultracite's own history

9.1 is the timeline from `git log -S` over everything but `apps/`, `research/` and the changelog (search strings: `consistent-type-imports`, `consistent-type-exports`, `no-import-type-side-effects`, `consistent-type-specifier-style`, `useImportType`, `useExportType`, `no-duplicates`, `noImportTypeSideEffects`, `verbatimModuleSyntax`, `emitDecoratorMetadata`, `experimentalDecorators`, `importsNotUsedAsValues`, `isolatedModules`, `prefer-top-level`, `prefer-inline`, `fixStyle`, and the agent-rule sentences), `packages/cli/CHANGELOG.md`, and read-only `gh api search/issues` on haydenbleasel/ultracite for `import type`, `type import`, `type-only`, `"type imports"`, `"type-only import"`, `verbatimModuleSyntax`, `decorator`, `emitDecoratorMetadata`, `NestJS`, `nestjs`, `Angular`, `dependency injection`, `injected`, `consistent-type`, `"consistent-type-imports"`, `useImportType`, `useExportType`, `no-import-type-side-effects`, `type-specifier`, `"prefer-inline"`, `no-duplicates`, `isolatedModules`, `inject`, `reflect-metadata`, `"can't resolve dependencies"`, `decorators metadata` and `side effect import` (17 Nov 2026). Results are in `scratchpad/type-imports-lit/main/src/ultracite/` (`git-log-S.txt`, `commit-messages.txt`, diffs and copies of the config files, emails redacted) and `scratchpad/type-imports-lit/main/src/gh/`. 9.2–9.5 are the recorded settings, reasons and incidents, 9.6–9.8 what each preset reports and fixes on the same small files (worktree at `60a16471`), 9.9–9.10 what Ultracite tells agents and whether `init` touches the tsconfig, 9.11 the public record of users, 9.12 Hayden's account.

### 9.1 Timeline: on since the first config in 2022, with one change of specifier style and one framework exception. VERIFIED (git history, changelog, issues)

| Date | Commit (release) | What happened |
| --- | --- | --- |
| 18 Mar 2022 | `e403fb15` "Create ESLint configuration" | The first config lists every rule by hand: `@typescript-eslint/consistent-type-exports` and `consistent-type-imports` are `"error"` with no options (typescript-eslint `^5.15.0`), and so is `import/no-duplicates` (eslint-plugin-import `^2.25.4`, which had no `consistent-type-specifier-style` yet). No comment gives a reason. The config sets no `parserOptions.project`. |
| 14 Jan 2023 | `5b7d6da3` "Harmony V2 (#83)" | Flat config split into rule files; the same values. TypeScript files now get type information (`parserOptions.project: './tsconfig.json'`), as they do until the move to Biome. |
| 8 Jun 2023 | `c52fef07` "Migrate to opt-in config (#115)" | Every non-deprecated typescript-eslint and eslint-plugin-import rule is turned on in a loop, then overridden; the three typescript-eslint rules and `no-duplicates` drop out of the hand list and stay on through the loop, which now also turns on `no-import-type-side-effects` and `import/consistent-type-specifier-style` at their defaults (typescript-eslint `^5.59.9`, eslint-plugin-import `^2.27.5`). |
| 18 Jul 2024 | `c92a9d2e` (#140) | Ultracite becomes Biome-only (`"all": true`), so `useImportType` and `useExportType` are on; the ESLint rules leave. |
| 22 Jun 2025 | `871ee738` "Ultracite v5 (#162)" | Biome rules listed one by one with their docs as comments: `useImportType` ("Promotes the use of import type for types.") and `useExportType`. The generated agent rules get "Use `import type` for types." and "Use `export type` for types." |
| 20 Oct 2025 | `d704b5c4` "Add first-class support for Astro (#327)" | `useImportType` off for Astro files (and, by 28 Oct, `5f00bd37`, Svelte and Vue files), as Biome's language-support page advised (9.4). Agent rule: "Avoid explicit import types in Astro files for better compat". |
| 2 Nov 2025 | `18ed1f31` "Resolves #343" | The agent rules file is rewritten into principles; the `import type` line goes (9.9). |
| 28 Dec 2025 | `c4a205f8` "V7 (#466)" | Oxlint and ESLint return. Oxlint turns on whole categories (`restriction` includes `typescript/no-import-type-side-effects`; `style` includes `typescript/consistent-type-imports`, `import/consistent-type-specifier-style` and `import/no-duplicates`) and sets `"import/consistent-type-specifier-style": ["error", "prefer-inline"]`. ESLint turns on every typescript-eslint and eslint-plugin-import (`^2.32.0`) rule and gives TypeScript files type information (`parserOptions.project: "./tsconfig.json"`). |
| 1 Feb 2026 | `c60533d7` "Fix conflicting import/consistent-type-specifier-style" (7.1.x) | Oxlint `prefer-inline` becomes `prefer-top-level`; changeset "Fix oxlint import/consistent-type-specifier-style". No issue, comment or changeset says what it conflicted with (9.3). |
| 16 Feb 2026 | `3cd6e7b3` "Upgrade Biome to 2.4, for #544" | The `useImportType: "off"` overrides for Astro, Svelte and Vue files are removed. |
| 14 Mar 2026 | `acf301cd` "Resolves #603" | ESLint moves to eslint-plugin-import-x (`^4.12.2`) for ESLint 10; no explicit specifier style yet. |
| 13 Apr 2026 | `a63d9c57` "Resolves #660" | The Oxlint preset lists every rule explicitly; the five type-import rules are `"error"`, the specifier style `"prefer-top-level"`. |
| 10 May 2026 | `44f6d7fe` "Align ESLint with Oxlint" | ESLint sets `"import-x/consistent-type-specifier-style": ["error", "prefer-top-level"]`; changeset: "`import.mjs` now sets `consistent-type-specifier-style: ["error", "prefer-top-level"]`." |
| 4 Sep 2026 | `7b0456e6` (#791) | `ultracite fix` runs lint fixes before the formatter, partly because of the imports the specifier-style fix splits (9.11). |
| 10 Oct 2026 | `ed5ed04d` (8.0.0) | ESLint's type-checked rules move to the opt-in `ultracite/eslint/type-aware` preset, and core stops turning on the project service. `consistent-type-exports` (type-checked) moves with them; `consistent-type-imports` stays in core, now without type information (9.5). |
| 14 Nov 2026 | `e1ac2185`, `e8c2207d` (8.3.0) | Biome's `nestjs` and `angular` presets learn to parse parameter decorators; two minutes later the type-import rule is turned off in the `nestjs` and `angular` presets on all three linters (9.5). |

- **Recorded reasons:** none for turning any of these rules on; they arrived with every-rule-on configs (9.2). The only recorded reasons are the commit title for the specifier-style switch (9.3), Biome's advice for template files (9.4), and the DI fix (9.5).
- **Text:** `scratchpad/type-imports-lit/main/src/ultracite/git-log-S.txt`, `scratchpad/type-imports-lit/main/src/ultracite/commit-messages.txt`, `scratchpad/type-imports-lit/main/src/ultracite/e403fb15-src-eslint.js`, `scratchpad/type-imports-lit/main/src/ultracite/5b7d6da3-eslint.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/bab0b18d-eslint.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/c52fef07-rules-typescript.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/c52fef07-rules-import.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/871ee738-biome.jsonc`, `scratchpad/type-imports-lit/main/src/ultracite/871ee738-ultracite.mdc`, `scratchpad/type-imports-lit/main/src/ultracite/d704b5c4.diff`, `scratchpad/type-imports-lit/main/src/ultracite/18ed1f31-parent-rules.ts`, `scratchpad/type-imports-lit/main/src/ultracite/c4a205f8-oxlint-core.oxlintrc.json`, `scratchpad/type-imports-lit/main/src/ultracite/c4a205f8-eslint-core.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/c4a205f8-eslint-core-rules-import.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/c60533d7.diff`, `scratchpad/type-imports-lit/main/src/ultracite/3cd6e7b3.diff`, `scratchpad/type-imports-lit/main/src/ultracite/acf301cd-eslint-core-rules-import.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/a63d9c57-oxlint-core-index.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/44f6d7fe.diff`, `scratchpad/type-imports-lit/main/src/ultracite/ed5ed04d-parent-eslint-core.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/ed5ed04d-eslint-core.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/e1ac2185.diff`, `scratchpad/type-imports-lit/main/src/ultracite/e8c2207d.diff`, `scratchpad/type-imports-lit/main/src/ultracite/CHANGELOG.md`

### 9.2 What the presets set now, and the strictness policy behind it (worktree at `60a16471`, 17 Nov 2026). VERIFIED (config source, installed rule metadata)

| Rule | Oxlint core | ESLint core | Biome core | `nestjs`, `angular` presets |
| --- | --- | --- | --- | --- |
| Type-only imports | `typescript/consistent-type-imports` `"error"` (defaults) | `@typescript-eslint/consistent-type-imports` `"error"` (defaults: `prefer: "type-imports"`, `fixStyle: "separate-type-imports"`, `disallowTypeAnnotations: true`), without type information | `useImportType` `"error"` (no options) | off on all three |
| Type-only exports | `typescript/consistent-type-exports` `"error"`, type-aware, so it runs only with `options.typeAware` and `oxlint-tsgolint` | `@typescript-eslint/consistent-type-exports`, type-checked, so only in `ultracite/eslint/type-aware` | `useExportType` `"error"` | unchanged |
| Inline-only imports | `typescript/no-import-type-side-effects` `"error"` | `@typescript-eslint/no-import-type-side-effects` `"error"` | none | unchanged |
| Specifier style | `import/consistent-type-specifier-style` `["error", "prefer-top-level"]` | `import-x/consistent-type-specifier-style` `["error", "prefer-top-level"]` | none (`useImportType`'s own default style applies) | unchanged |
| Duplicate imports | `import/no-duplicates` `"error"` (no `prefer-inline`) | `import-x/no-duplicates` `"error"` (defaults) | none (the `organizeImports` assist is on; it left `import type { Foo }` and `import { makeFoo }` from one module apart, 9.6) | unchanged |

- **Policy:** AGENTS.md: "Prefer maximum strictness over parity with a tool's defaults." and "Turn a rule off only with a comment saying why". Oxlint's metadata (`oxlint --rules --format=json`) marks `consistent-type-exports` `"type_aware": true` and the other four `false`; typescript-eslint 8.72.1 marks `consistent-type-exports` `requiresTypeChecking: true`. None of the three typescript-eslint rules is in its `recommended`, `strict` or `stylistic` configs (or their type-checked variants) at 8.72.1 (local check).
- **Caveat:** Oxlint core lists `typescript/consistent-type-exports` at `"error"`, but the rule doesn't run in a default Oxlint setup, only with type-aware linting. The nestjs and angular comments are the only comments on any of these rules.
- **Text:** `scratchpad/type-imports-lit/main/src/ultracite/config/oxlint-core-index.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/oxlint-nestjs-index.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/oxlint-angular-index.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/eslint-core-rules-import.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/eslint-core-rules-typescript.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/eslint-type-aware-eslint.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/eslint-nestjs-eslint.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/eslint-angular-eslint.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/biome-core.jsonc`, `scratchpad/type-imports-lit/main/src/ultracite/config/biome-nestjs.jsonc`, `scratchpad/type-imports-lit/main/src/ultracite/config/biome-angular.jsonc`, `scratchpad/type-imports-lit/main/src/ultracite/AGENTS.md`, `scratchpad/type-imports-lit/main/check/rule-metadata.txt`

### 9.3 `prefer-inline` to `prefer-top-level`: a two-month conflict in Oxlint (Dec 2025–Feb 2026), then ESLint aligned (May 2026). VERIFIED (config at commits); the conflict itself is My check

- **Source:** `c4a205f8` (V7, 28 Dec 2025), `c60533d7` (1 Feb 2026), `44f6d7fe` (10 May 2026).
- **What happened:** V7's Oxlint preset turned on the `restriction` and `style` categories, which include both `typescript/no-import-type-side-effects` and `import/consistent-type-specifier-style`, and set the latter to `"prefer-inline"`. `prefer-inline` reports `import type { A } from "m"` and rewrites it to `import { type A } from "m"`; `no-import-type-side-effects` reports exactly that and rewrites it back. `c60533d7` is titled "Fix conflicting import/consistent-type-specifier-style" and flips the option; the changeset says only "Fix oxlint import/consistent-type-specifier-style". No issue or PR records the conflict or the choice of direction. With Oxlint 1.90.0 that pair never settles: each `--fix` run flips the file between `import type { A }` and `import { type A }`, gaining a space every second run (6.28; older Oxlint versions weren't run).
- **ESLint:** from 2023 to March 2026 the ESLint preset ran eslint-plugin-import's rule with no option. Its docs say the default is `prefer-inline`, but a bare `"error"` enforces `prefer-top-level` (6.12), so on ESLint the two rules never fought. Since `acf301cd` (14 Mar 2026) it runs import-x's, whose default is `prefer-top-level`; `44f6d7fe` set it explicitly.
- **For the post:** the side-effect argument is what decides the direction: once `no-import-type-side-effects` is on, `prefer-inline` can't be. Hayden's account (9.12) gives the reason for picking that side.
- **Text:** `scratchpad/type-imports-lit/main/src/ultracite/c4a205f8-oxlint-core.oxlintrc.json`, `scratchpad/type-imports-lit/main/src/ultracite/c60533d7.diff`, `scratchpad/type-imports-lit/main/src/ultracite/44f6d7fe.diff`, `scratchpad/type-imports-lit/main/src/ultracite/commit-messages.txt`, `scratchpad/type-imports-lit/main/src/eslint-plugin-import-v2.32.0/consistent-type-specifier-style.js`

### 9.4 Biome's template files: `useImportType` off for Astro, Svelte and Vue, on Biome's own advice (Oct 2025–Feb 2026). VERIFIED (issue, commits, Biome docs)

- **Source:** haydenbleasel/ultracite #326 (20 Oct 2025, opened by Hayden from discussion #317, originally posted by nyomansunima); `d704b5c4`, `5f00bd37`, `3cd6e7b3`; Biome, _Language support_, https://biomejs.dev/internals/language-support/ (redirects to /introduction/language-support/; fetched 17 Nov 2026).
- **What it says:** the issue pastes an override for `**/*.svelte`, `**/*.astro` and `**/*.vue` that sets `"useImportType": "off"` with `useConst`, `noUnusedVariables` and `noUnusedImports`, citing Biome's page. Biome's page today: if `html.experimentalFullSupportEnabled` is false, "it’s advised to turn off a few additional rules" "to prevent false positive linting errors caused by our partial support." The same four rules follow. Ultracite's generated rules added "Avoid explicit import types in Astro files for better compat".
- **What changed:** the presets for those frameworks set `experimentalFullSupportEnabled` from Biome 2.3 (#334, Oct 2025), and `3cd6e7b3` (Biome 2.4, 16 Feb 2026) removed the overrides, so `useImportType` runs on component scripts again.
- **For the post:** a type-only-import fix is only as good as the linter's view of where a name is used. A linter that sees a component's script but not its template thinks an import used only in the template is unused or type-only.
- **Text:** `scratchpad/type-imports-lit/main/src/gh/item-326.json`, `scratchpad/type-imports-lit/main/src/ultracite/d704b5c4.diff`, `scratchpad/type-imports-lit/main/src/ultracite/3cd6e7b3.diff`, `scratchpad/type-imports-lit/main/text/biome-language-support-current.txt`, `scratchpad/type-imports-lit/main/src/biome-language-support-current.html`

### 9.5 The DI fix of 14 Nov 2026: what changed, what the record says, and what led to it. VERIFIED (commits, changeset, fixtures, changelog)

- **Source:** `e8c2207d` "Stop the nestjs and angular presets turning injected classes into type imports" (14 Nov 2026, Hayden Bleasel), changeset `di-type-imports.md` (released in 8.3.0), and `e1ac2185` two minutes earlier.
- **What it says:**
  - Commit: "Constructor injection names a class only as a parameter type," so the rules' fix rewrites its import; then the class "no longer exists at runtime, emitDecoratorMetadata emits Function for the parameter," and "the container cannot resolve it." "Oxlint and Biome do this always;" "typescript-eslint only holds back when it has type information" "to read emitDecoratorMetadata from."
  - Changeset: "`ultracite fix` no longer breaks dependency injection in NestJS and Angular projects." "The code still compiled, but the class was gone at runtime:" "`emitDecoratorMetadata` recorded the parameter as `Function`," and "If a previous `fix` already rewrote these imports, change them back to plain imports."
  - Config comments. Oxlint: "The autofix turns the import of an injected class into `import type`." ESLint adds that typescript-eslint "holds back when it can see `emitDecoratorMetadata`, which takes type" information. Biome: "The fix turns the import of an injected class into `import type`,".
  - Tests: smoke fixtures for ESLint and Biome (an injected `CatsService`) forbid `@typescript-eslint/consistent-type-imports` and `lint/style/useImportType`; there is no Oxlint fixture.
- **What led to it:**
  - No issue or PR reports the breakage (searches in 9.11). The earliest signal is a comment on #524 (NestJS support, 15 Jan 2026) by kaelianbaudelet: "Ensuring Biome handles them perfectly (especially with metadata) is key."
  - `e1ac2185`, the commit before: "Biome treats a decorator on a parameter as a parse error unless" `unsafeParameterDecoratorsEnabled` is set, so "Biome skipped lint fixes for the file." Until then, Biome's fixes, `useImportType` included, never ran on a NestJS controller with `@Body()` or an Angular class with `@Inject()`; they did run on classes injected without parameter decorators.
  - On ESLint, 8.0.0 (`ed5ed04d`, 10 Oct 2026) took type information out of core: "The core preset no longer turns on the project service". V7's core had given every `.ts` file `parserOptions.project`, so typescript-eslint could read `emitDecoratorMetadata` from the program. typescript-eslint has skipped any file with a decorator when it knows both `experimentalDecorators` and `emitDecoratorMetadata` are on since 7.4.0 (Mar 2024); with type information the tsconfig decides, without it only `parserOptions.emitDecoratorMetadata` and `parserOptions.experimentalDecorators` count (6.4, 7.24, 7.25). V7 ran `^8.50` with type information, so the rule stayed silent in decorated files of a project whose tsconfig set both flags; the 2023–2024 configs also had `parserOptions.project` (9.1), so the decorator handling of whichever typescript-eslint version was installed applied there too (6.4). From 8.0.0 to 8.3.0, a NestJS project on ESLint without the type-aware preset (and Ultracite's presets set neither parser option) had its injected classes rewritten.
- **Checked:** the `Function` claim holds for `tsc`: TypeScript 6.0.3 records `Function` (9.7, 4.3, 4.4), and has since 4.0 (4.6); single-file transpilers record `Object` (4.5). It does not hold for Angular, which hasn't used `emitDecoratorMetadata` since 2019: its compiler reads the constructor's types and fails the build with NG2003 for components, directives and pipes, and for `@Injectable` under `strictInjectionParameters`; a non-strict `@Injectable()` fails at runtime instead (4.13, 4.14, 7.21). So for Angular the changeset's "The code still compiled," and the Oxlint `angular` comment's `emitDecoratorMetadata` reason are wrong, though turning the rule off there is still right.
- **Caveat:** the fix turns the rule off for every file in those projects, not just decorated classes, so a plain import used only as a type is no longer reported or fixed there (9.6). `no-import-type-side-effects` and the specifier-style rule stay on; they only rewrite imports that are already type-only, so they don't change what's emitted for a class.
- **Text:** `scratchpad/type-imports-lit/main/src/ultracite/commit-messages.txt`, `scratchpad/type-imports-lit/main/src/ultracite/e8c2207d.diff`, `scratchpad/type-imports-lit/main/src/ultracite/e8c2207d-changeset.md`, `scratchpad/type-imports-lit/main/src/ultracite/e1ac2185.diff`, `scratchpad/type-imports-lit/main/src/ultracite/config/oxlint-nestjs-index.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/eslint-nestjs-eslint.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/config/biome-nestjs.jsonc`, `scratchpad/type-imports-lit/main/src/ultracite/config/biome-angular.jsonc`, `scratchpad/type-imports-lit/main/src/ultracite/c4a205f8-eslint-core.config.mjs`, `scratchpad/type-imports-lit/main/src/ultracite/CHANGELOG.md`, `scratchpad/type-imports-lit/main/src/gh/item-524-comments.json`

### 9.6 What each preset reports and fixes on the same files. My check (local run, 17–18 Nov 2026; Oxlint 1.90.0, ESLint 10.14.0 with typescript-eslint 8.72.1 and import-x 4.17.1, Biome 2.6.4, oxlint-tsgolint 7.0.2005; Ultracite's presets unchanged)

- **Files** (`scratchpad/type-imports-lit/main/check/presets/input/`): `foo.ts` (an interface, a type alias, a value and a `console.log`), `type-only.ts` (`import { Foo } from "./foo"` used only as a type), `inline.ts` (`import { type Bar, type Foo } from "./foo"`), `mixed.ts` (`import { type Foo, makeFoo }`), `dupes.ts` (`import type { Foo }` and `import { makeFoo }` from the same module), `reexport.ts` (`export { Foo, makeFoo } from "./foo"`), `cats.service.ts` and `cats.controller.ts` (a `@Controller` class with `constructor(private readonly cats: CatsService) {}`), and a tsconfig with `experimentalDecorators` and `emitDecoratorMetadata`. `mixed2/` adds `import { Foo, makeFoo }` and `import makeDefault, { Foo }`.
- **Reports and fixes** (core presets unless stated; the ESLint typed column adds `ultracite/eslint/type-aware`, and Oxlint typed means a run with `--type-aware`):

| File | Oxlint | ESLint | ESLint typed | Biome |
| --- | --- | --- | --- | --- |
| `type-only.ts` | `consistent-type-imports`, fixed to `import type` | same | same | `useImportType`, safe fix to `import type` |
| `inline.ts` | `no-import-type-side-effects` and `consistent-type-specifier-style` (once per specifier), fixed to `import type { Bar, Foo }` | same (specifier style once) | same | `useImportType`, fixed to `import type { Bar, Foo }` |
| `mixed.ts` | `consistent-type-specifier-style`, split into `import { makeFoo }` and `import type { Foo }` | same | same | not reported |
| `mixed2/` plain `{ Foo, makeFoo }` | split into two imports | split into two imports | — | fixed to `import { type Foo, makeFoo }` |
| `dupes.ts` | not reported | not reported | not reported | not reported |
| `reexport.ts` | not reported; Oxlint typed: `consistent-type-exports` | not reported | `consistent-type-exports`, split into `export type { Foo }` and `export { makeFoo }` | not reported |
| `cats.controller.ts` | `consistent-type-imports`, fixed to `import type { CatsService }`; Oxlint typed: still reported | same | **not reported** | `useImportType`, fixed to `import type` |
| same, `nestjs` preset | not reported | not reported | — | not reported |

- **Messages:** Oxlint: "All imports in the declaration are only used as types. Use `import type`." and "TypeScript will only remove the inline type specifiers" "which will leave behind a side effect import at runtime."; ESLint adds "Convert this to a top-level type qualifier to properly remove the entire import."; Biome: "All these imports are only used as types." "Importing the types with import type ensures that they are removed by the compilers" "and avoids loading unnecessary modules." and "Safe fix: Use import type."
- **Convergence:** one `--fix` pass left no type-import diagnostics in Oxlint or ESLint; Biome's `lint --write` and `check --write` give the same imports.
- **What it shows:** all three cores convert an injected class's import to `import type`; only typescript-eslint, and only with type information, holds back. `ultracite fix` applies all of these by default (`oxlint --fix`, `eslint --fix`, `biome check --write`, from `src/commands/fix.ts`).
- **Text:** `scratchpad/type-imports-lit/main/check/presets/versions.txt`, `scratchpad/type-imports-lit/main/check/presets/out-oxlint-core-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-oxlint-nestjs-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-oxlint-core-typeaware-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-oxlint-core-fixed-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-oxlint-nestjs-fixed-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-eslint-core-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-eslint-nestjs-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-eslint-core-typeaware-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-eslint-core-fixed-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-eslint-core-typeaware-fixed-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-eslint-nestjs-fixed-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-biome-core-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-biome-core-fixed-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-biome-nestjs-check.txt`, `scratchpad/type-imports-lit/main/check/presets/out-biome-core-check-write-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-mixed2-oxlint-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-mixed2-eslint-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-mixed2-biome-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-oxlint-core-after-one-pass.txt`, `scratchpad/type-imports-lit/main/check/presets/out-eslint-core-after-one-pass.txt`

### 9.7 The injected class end to end: after the fix, `tsc` compiles cleanly, drops the `require` and records `Function`. My check (local run, TypeScript 6.0.3, Node 24.14.1)

- **Files** (`scratchpad/type-imports-lit/main/check/presets/compile-before/` and `compile-after/`): the controller and service from 9.6 before and after Oxlint's fix, a stub `@nestjs/common` (a no-op `Controller` decorator, written for the check), a tsconfig with `experimentalDecorators`, `emitDecoratorMetadata` and CommonJS output, and `run.cjs`, which stands in for reflect-metadata by recording what `__metadata` passes.
- **Result:** both versions compile with exit 0. Before: `require("./cats.service")` and `__metadata("design:paramtypes", [cats_service_1.CatsService])`, and the shim reads `[ 'CatsService' ]`. After: the `require` of `./cats.service` is gone and the emit is `__metadata("design:paramtypes", [Function])`; the shim reads `[ 'Function' ]`.
- **For the post:** the type checker can't catch this one. The fix is type-correct, the compiler is satisfied, and the only failure is at runtime, when the container asks for a `Function`.
- **Text:** `scratchpad/type-imports-lit/main/check/presets/compile-before/tsc-out.txt`, `scratchpad/type-imports-lit/main/check/presets/compile-before/run-out.txt`, `scratchpad/type-imports-lit/main/check/presets/compile-before/dist/cats.controller.js`, `scratchpad/type-imports-lit/main/check/presets/compile-after/tsc-out.txt`, `scratchpad/type-imports-lit/main/check/presets/compile-after/run-out.txt`, `scratchpad/type-imports-lit/main/check/presets/compile-after/dist/cats.controller.js`

### 9.8 The three linters end on different import shapes. My check (as 9.6)

- **What:** for an import that mixes a type and a value, Oxlint and ESLint (`prefer-top-level`, `fixStyle: "separate-type-imports"`) write two declarations, `import { makeFoo } from "./foo";` and `import type { Foo } from "./foo";` (in either order). Biome's `useImportType` with no options writes one, `import { type Foo, makeFoo } from "./foo";`, and `import makeDefault, { type Foo } from "./bar";` for a default import. That is the shape the other two presets' `consistent-type-specifier-style` reports. Biome has no specifier-style rule, and its `organizeImports` assist didn't merge the two declarations Oxlint and ESLint write.
- **Does it matter at runtime?** Not here: a mixed import keeps the module because of its value binding in every compiler (sections 2 and 3). It matters for consistency, and for an agent moving between presets. Biome 2.0 added a `style` option (`auto`, the default: `import type` when every specifier is a type, inline when mixed; `inlineType`; `separatedType`), so `"style": "separatedType"` would match the other two (6.21).
- **Text:** `scratchpad/type-imports-lit/main/check/presets/out-mixed2-oxlint-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-mixed2-eslint-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-mixed2-biome-files.txt`, `scratchpad/type-imports-lit/main/check/presets/out-biome-core-check-write-files.txt`

### 9.9 What Ultracite tells agents about imports. VERIFIED (source and history)

- **Now:** `src/data/rules.ts` (written into AGENTS.md and CLAUDE.md by `init`, mirrored in `skills/ultracite/references/code-standards.md`) says nothing about type-only imports, `import type`, decorators or dependency injection. The only import guidance is "Avoid import cycles; move shared code into a module both sides import". The fix prompt (`src/agent-fix/prompt.ts`) tells the agent to "Edit only the file above." and to leave a cycle or barrel fix for review.
- **History:** v5 (Jun 2025) wrote one line per Biome rule, including "Use `import type` for types." and "Use `export type` for types."; before #343 the list said "Use `export type` and `import type` for types", and the Astro list added "Avoid explicit import types in Astro files for better compat". `18ed1f31` (Resolves #343, 2 Nov 2025) replaced the list with principles and dropped them. The skill listed "`useImportType` for type-only imports" from `d1e8490b` (18 Feb 2026) until `fb8b5392` (Resolves #615, 28 Mar 2026).
- **The docs:** the FAQ says "The cycle rules skip `import type`, but they don't know that TypeScript also drops" "a plain import whose bindings are only used as types." and that "`ultracite fix` rewrites it to `import type`". Since 8.3.0 that is no longer true in the `nestjs` and `angular` presets.
- **For the post:** agents get no instruction about type imports; the rules and their fixes do the work, and the agent sees only the diagnostics (9.6) when it runs `ultracite check`.
- **Text:** `scratchpad/type-imports-lit/main/src/ultracite/fb8b5392-skills.diff`, `scratchpad/type-imports-lit/main/src/ultracite/rules.ts`, `scratchpad/type-imports-lit/main/src/ultracite/code-standards.md`, `scratchpad/type-imports-lit/main/src/ultracite/prompt.ts`, `scratchpad/type-imports-lit/main/src/ultracite/871ee738-ultracite.mdc`, `scratchpad/type-imports-lit/main/src/ultracite/18ed1f31-parent-rules.ts`, `scratchpad/type-imports-lit/main/src/ultracite/git-log-S.txt`, `scratchpad/type-imports-lit/main/src/ultracite/faq.mdx`

### 9.10 `ultracite init` touches one tsconfig setting, and it isn't one of these. VERIFIED (source)

- **Source:** `packages/cli/src/tsconfig.ts` and `initialize.ts` at `60a16471`.
- **What it does:** `init` only plans a `strictNullChecks` edit, and only with type-aware linting: "The type-aware rules need strictNullChecks, which an interactive run asks" before changing a tsconfig (8.0.0 changelog: init "only turns on `strictNullChecks`" "when type-aware linting is on"). Nothing in `src/` or the presets reads or writes `verbatimModuleSyntax`, `isolatedModules`, `experimentalDecorators` or `emitDecoratorMetadata`; the only mentions are the nestjs and angular comments. `doctor` doesn't read the tsconfig.
- **For the post:** Ultracite enforces type-only imports with lint rules and leaves the compiler-side switch (`verbatimModuleSyntax`, section 2) to the project.
- **Text:** `scratchpad/type-imports-lit/main/src/ultracite/tsconfig.ts`, `scratchpad/type-imports-lit/main/src/ultracite/initialize.ts`, `scratchpad/type-imports-lit/main/src/ultracite/CHANGELOG.md`

### 9.11 Ultracite's own users and PRs: one framework workaround, one request that mentions metadata, and no report of a broken injection. VERIFIED (issues and PRs)

- **Searched:** the terms at the top of this section (17 Nov 2026). Most hits are Dependabot release notes or unrelated PRs that contain the words. Discussions are not enabled for search here; #326 quotes one.
- **Found:**
  - #326 (9.4): Biome's template-file override, `useImportType` included.
  - #524 (NestJS support, hugopino, 11 Jan 2026; preset added in `8e9e7289`, closed 7 Feb 2026): the metadata comment in 9.5.
  - #791 (Keyur Govrani, merged 4 Sep 2026): the formatter-order bug also affects "the imports `import/consistent-type-specifier-style` splits"; Hayden's comment on the PR adds that "overlapping import fixers" (`import/no-duplicates` + `consistent-type-specifier-style` + `consistent-type-imports`) "can still need a second run on some files."
- **Not found:** no issue reports a broken injection, a lost side effect, a Node or bundler error from a type-only import, or asks for `prefer-inline`.
- **Text:** `scratchpad/type-imports-lit/main/src/gh/item-326.json`, `scratchpad/type-imports-lit/main/src/gh/item-524.json`, `scratchpad/type-imports-lit/main/src/gh/item-524-comments.json`, `scratchpad/type-imports-lit/main/src/gh/item-791.json`, `scratchpad/type-imports-lit/main/src/gh/item-791-comments.json`, `scratchpad/type-imports-lit/main/src/gh/search-q-importtype.json`, `scratchpad/type-imports-lit/main/src/gh/search-emitDecoratorMetadata.json`

### 9.12 Hayden's account of why the style is `prefer-top-level` (17 Nov 2026). ANECDOTAL (the maintainer's account, relayed; not in the record)

- **Source:** Hayden Bleasel, in a message relayed to the research coordinator on 17 Nov 2026, while this file was compiled; saved verbatim as `scratchpad/type-imports-lit/main/src/ultracite/hayden-account-2026-11-17.txt`. No commit, issue or changelog entry says this; the commit that set the style is titled only "Fix conflicting import/consistent-type-specifier-style" (9.3).
- **What Hayden says:** "at the time, `import { type x }` when TS compiles" "turns into `import { }`" "leaving a potential side effect import" "or at the very least a waste of a line." "`import type` was removed entirely during compilation." Then: "not sure if that's still the case," "especially with all the different typescript compilers out there now" "(ts-rust, ts7 in go, scriptc, bun build --compile)" "but at the time there was a solid reason."
- **The parts, and what the sources say about each:**
  - **"at the time,"** Oxlint's preset switched on 1 Feb 2026 (9.3); ESLint had been enforcing top-level in practice since 2023 (6.12) and said so explicitly from May 2026. The current compiler then was TypeScript 5.9 (GitHub release 1 Oct 2025), whose `tsc --init` turns on `verbatimModuleSyntax` (2.9).
  - **`import { type x }` "turns into `import { }`".** True under `verbatimModuleSyntax` (5.0 on, still in 6.0.3 and 7.0.2; 2.7, 2.13), and from 4.5 to 5.4 with `preserveValueImports` plus `importsNotUsedAsValues: "preserve"` or `"error"`; with `importsNotUsedAsValues` alone the remnant was `import "y";` (the emit matrix in section 2, 2.10). False under default elision, where both forms vanish, and under `preserveValueImports` alone. By design: the 4.5 PR says the specifier keyword "plays no direct role" in whether the declaration is elided (2.5). Outside tsc it holds with each tool's keep-imports switch (esbuild, swc, Babel's `onlyRemoveTypeImports`, Oxc and Vite 8, Deno) and always in Node's type stripping, which keeps the statement and loads the module (3.4–3.7, 3.15).
  - **"leaving a potential side effect import"** ECMAScript loads and evaluates the module for `import {} from "y"` as for `import "y"` (1.1). Bundlers keep a module that something imports unless it is marked side-effect free (5.1), and a kept `{}` pulled a lazy module into the entry chunk (5.2). Real breakages from exactly this form: a dev-only package that failed to resolve in Node (7.10), and a runtime cycle that crashed Vitest (7.16; also Next.js #91906, 7.18 and `import-cycles.md` 2.7). **Against:** sometimes the side effect is wanted. Oxlint made `no-import-type-side-effects` a suggestion in 1.94.0 (16 Nov 2026) because its fix removed a module's evaluation (6.17, 7.52); the rule assumes the leftover import is unwanted, which a lint fix can't know.
  - **"a waste of a line."** For an import whose specifiers are all types, the empty `{}` is the only thing left, and TypeScript 7.1 now drops the empty braces next to a default import as cosmetic (2.14). For a mixed import, `prefer-top-level` costs a line rather than saving one: the fix splits one declaration into two (6.3, 9.6, 9.8). Biome's default style keeps mixed imports inline (6.21).
  - **"`import type` was removed entirely during compilation."** True in every compiler and mode checked, from TypeScript 3.8 to 7.1-beta (2.10, 2.13, 3.15), in Node and Bun (3.7), in the TC39 proposal, which treats it as a comment (3.14), and in every cycle checker (`import-cycles.md` 6.4).
  - **"not sure if that's still the case,"** TypeScript 7 (the Go port, now `tsc`) applies the same rules as 6.0 (2.13), with one cosmetic change in 7.1 (2.14). ts-rust is a port of TypeScript 7 and keeps `import {}` only under `verbatimModuleSyntax` (3.16). scriptc follows Node's type stripping when the tsconfig sets `verbatimModuleSyntax` or there is none, so the inline-only import still loads its module, and tsc's elision otherwise (3.17). Bun's transpiler and `bun build` drop `import { type x }` whatever the tsconfig says (3.11); `bun build --compile` wasn't traced. So the reason still holds wherever `verbatimModuleSyntax` or Node-style stripping applies, which includes every project `tsc --init` has created since 5.9.
  - **"there was a solid reason."** The upstream rules' own record: `no-import-type-side-effects` exists for exactly this (typescript-eslint 5.51.0, Jan 2023, out of an eslint-plugin-import thread about TypeScript 5.0; 6.9), and the newer third style's docs give the side-effect reason (6.13); `consistent-type-specifier-style` itself was proposed for consistency (6.11). TypeScript's own auto-import prefers the top-level form for a new declaration (2.5).
- **For the post:** state it as Ultracite's reason, in Hayden's words, and say where it applies: it is true for `verbatimModuleSyntax` and Node-style stripping, and moot under default elision. The counter-case (a side effect someone wanted) belongs next to it.
- **Text:** `scratchpad/type-imports-lit/main/src/ultracite/hayden-account-2026-11-17.txt`, `scratchpad/type-imports-lit/main/src/ultracite/c60533d7.diff`, `scratchpad/type-imports-lit/A/src/ts-pr-45998.json`

---

## Notes on Ultracite's presets (for Hayden, not for the post)

Checked in the worktree (`research/type-imports`, at `60a16471`) on 17–18 Nov 2026. Per AGENTS.md, these are for you to decide on, not to write around.

**Your account (relayed on 17 Nov 2026; not in the git history, issues or changelog)**

- **In your words:** "at the time, `import { type x }` when TS compiles" "turns into `import { }`" "leaving a potential side effect import" "or at the very least a waste of a line." "`import type` was removed entirely during compilation." Recorded in 9.12, with the sources for each part.
- **It holds where it matters most, and it's moot elsewhere.** Under `verbatimModuleSyntax` (TypeScript 5.0 to 7.1-beta, and every project `tsc --init` has made since 5.9) and in Node's type stripping, `import { type x } from "y"` is `import {} from "y"` and loads `y`; `import type` is gone everywhere. Under default elision both vanish, so there the setting is pure style. Bun drops both regardless (2.5, 2.7, 2.9, 3.4–3.7, 3.11, 3.15).
- **Today's compilers:** TypeScript 7 (Go, now `tsc`) and ts-rust behave as 6.0 (2.13, 3.16); scriptc follows Node when `verbatimModuleSyntax` is on or there's no tsconfig (3.17); `bun build --compile` wasn't traced, but Bun's transpiler ignores `verbatimModuleSyntax` (3.11). "ts-rust" is pingdotgg/ts-rust (`tsc-rs`), not the `tsrs` package PR #858 proposed for the repo's own type checks.
- **The counter-case to put next to it:** sometimes the side effect is wanted. Oxlint 1.94.0 (16 Nov 2026) made `no-import-type-side-effects` a suggestion because its fix removed a module's evaluation (6.17, 7.52).

**The DI fix (8.3.0): what's right, what's wrong in the record**

- **Angular doesn't break the way the changeset says.** Angular hasn't used `emitDecoratorMetadata` since 2019 and removed it by migration in v12. Its compiler reads the constructor's types and fails the build with NG2003 for components, directives and pipes, and for `@Injectable` under `strictInjectionParameters`; only a non-strict `@Injectable()` fails at runtime (4.13, 4.14, 7.21). So "The code still compiled," is wrong for Angular, and the Oxlint `angular` comment's reason (`emitDecoratorMetadata` records it) doesn't apply there. Turning the rule off in `angular` is still right. Also, the ESLint `angular` preset already turns on `@angular-eslint/prefer-inject`, which reports constructor injection anyway (4.15).
- **"typescript-eslint only holds back when it has type information" is incomplete.** Since 7.4.0 the rule skips any file with a decorator when it knows both flags, and without type information it takes them from `parserOptions.emitDecoratorMetadata` and `parserOptions.experimentalDecorators` (6.4, 7.24, 7.25). For `eslint/nestjs`, setting those two parser options instead of turning the rule off would keep it working in files without decorators. With type information the tsconfig wins, so a project whose tsconfig lacks the flags would get the rule back. Doesn't help `angular`, which sets neither flag.
- **When each linter could do this to Ultracite users:** Biome since Ultracite went Biome-only (Jul 2024), since `useImportType` has never handled decorators (6.22), in every file Biome could parse; controllers with parameter decorators only since `e1ac2185`, two minutes before the fix (9.5). Oxlint since V7 (Dec 2025); the port has no decorator handling at all (6.16, 7.29). ESLint in the first config (Mar 2022 to Jan 2023, no type information) and again from 8.0.0 (10 Oct 2026), when core lost type information; in between, TypeScript files had `parserOptions.project` (Jan 2023 to Jul 2024, Dec 2025 to Oct 2026), and from typescript-eslint 4.14.0 that let the rule see `emitDecoratorMetadata` in the project's tsconfig (6.4). No user ever reported it (9.11).
- **The rule is off for every file in those projects.** A plain import used only as a type is no longer reported or fixed there, so the FAQ's line that `ultracite fix` "rewrites it to `import type`" (and clears type-only cycle reports) is no longer true in `nestjs` and `angular` (9.9). Worth a sentence in the FAQ or the presets docs.
- **A second NestJS exposure worth a smoke fixture:** `ValidationPipe` takes the DTO class from the handler's `design:paramtypes`, so `@Body() dto: CreateCatDto` with `CreateCatDto` imported as a type validates against `Function` (tsc) or `Object` (single-file transpilers) instead of the DTO (4.11). The current fixtures cover only an injected service, and there's no Oxlint fixture.
- **Upstream fixes to watch:** Oxlint PR #28813 (decorator handling, open; 7.29); Biome PR #10496 (an option to keep metadata imports, open and contested; 7.28). Either would let the framework presets turn the rule back on with an option.

**Inconsistencies between the three presets**

- **Mixed imports end differently.** Oxlint and ESLint split `import { Foo, makeFoo }` into a value import and an `import type`; Biome's `useImportType` (default `style: "auto"`) writes `import { type Foo, makeFoo }`, which the other two presets' `consistent-type-specifier-style` reports (9.6, 9.8). `"style": "separatedType"` would match them (6.21). Not a runtime issue: a mixed import keeps its module everywhere.
- **The specifier-style fix has the same side-effect property Oxc just stopped auto-fixing.** On an all-inline import, Oxlint's and ESLint's `consistent-type-specifier-style` fix and Biome's safe `useImportType` fix all write `import type { … }` (9.6), which drops the module load under `verbatimModuleSyntax` and in Node, exactly what made Oxc demote `no-import-type-side-effects` in 1.94.0 (6.17). After an Oxlint bump to 1.94+, `no-import-type-side-effects` will report without fixing while the specifier-style fix still rewrites the same line. Decide whether that's the behaviour you want, or whether both should stay fixes.
- **`consistent-type-exports` runs only with type information** in Oxlint (`type_aware: true`) and ESLint (`requiresTypeChecking`), so a default setup on either never checks type re-exports; Biome's `useExportType` checks only local names and misses `export { T } from "./x"` (6.8, 6.20, 6.23, 9.2, 9.6).
- **Oxlint's `no-import-type-side-effects` message overstates the case:** "TypeScript will only remove the inline type specifiers" "which will leave behind a side effect import at runtime." is true only under `verbatimModuleSyntax`-style settings (and Node); under default elision tsc removes the whole import (2.10). ESLint's message says the same. Upstream wording, nothing for Ultracite to change, but the post shouldn't repeat it unqualified.
- **ESLint `import-x` is at 4.17.1; 4.18.0 (6 Nov 2026) fixes two `no-duplicates` merge bugs,** one of which makes a value type-only (7.48, 7.49).
- **Don't add `prefer-inline` to `no-duplicates`:** with `no-import-type-side-effects` on, ESLint's two fixes compose in one pass into `import type { A, b }`, a TS1361 error (6.28). Neither preset sets it now.

**What the rest of the ecosystem does, for comparison**

- **Ultracite's style matches antfu, Vitest and the rules' defaults (top-level), not love, XO, Vercel or t3 (inline)** (6.49). Both camps have large users; the trade-off the post can state is that inline needs `no-import-type-side-effects` under `verbatimModuleSyntax`, and top-level splits a mixed import into two declarations (8.12, 9.8).
- **Duplicate reports with `verbatimModuleSyntax`:** typescript-eslint's docs say the rule and the flag "can lead to conflicting and/or duplicate reports on the same import." (6.30). Ultracite doesn't set the flag, but create-vite, SvelteKit, Astro, @vue/tsconfig, t3 and `tsc --init` do (6.38–6.47), so in those projects a plain type import gets TS1484 from `tsc` and `consistent-type-imports` from the linter. Probably fine (the lint rule carries the autofix), but worth knowing when an agent sees both.

**Settings Ultracite doesn't touch**

- **`init` and `doctor` never read or write `verbatimModuleSyntax`, `isolatedModules` or the decorator flags;** `init` only turns on `strictNullChecks`, and only with `--type-aware` (9.10). Your reason depends on `verbatimModuleSyntax`, which most templates now set (6.30 onwards) but Ultracite neither recommends nor checks. TypeScript's own `verbatimModuleSyntax` errors are the compiler-side version of these rules (2.7, 6.24).
- **What agents are told:** nothing about type-only imports since Nov 2025, when "Use `import type` for types." went with #343, and nothing about decorators or DI (9.9). An agent fixing these diagnostics in a NestJS project has only the diagnostic text to go on.

---

## Things that turned out wrong or different

**TypeScript (sections 1 and 2)**

- **TS1205 isn't from `isolatedModules`' first release.** The flag (1.5, 2015) launched with errors for non-module files and ambient const enums; the re-export error promised in 2015 arrived in 2.4 (PR #15538, 2017). Code 1205 was a decorators error before that (1.8).
- **`isolatedModules` started as `separateCompilation`** (PR #2550, March 2015) and was renamed in PR #3208 before 1.5 shipped; it came with the `ts.transpile` API (1.7).
- **The 2015 proposal (#2812) already had `import type` and `import { type X }`,** and was declined because "the import syntax is already complex enough" (1.6).
- **`preserveValueImports` began as `--noErasingImportedNames`;** the TS1444 text in PR #44619's description still uses that name (2.4).
- **Under `importsNotUsedAsValues: preserve` or `error` alone, the remnant is `import "y";`, not `import {} from "y";`.** `import {} from` only appears with `preserveValueImports` as well, or under `verbatimModuleSyntax`. PR #45998's description and Andrew Branch's #47118 comment describe it as `import {}`; the transformer and the `error` baseline say otherwise. Both load the module (2.5, 2.10).
- **`error` mode reports TS1371 on `import { type X }` when every specifier is inline-type,** by design (#47118, "Working as Intended") (2.5).
- **The old flags became hard errors in 5.6, not 6.0.** 5.0 deprecated them; 5.5 made them no-ops (accepted with `ignoreDeprecations: "5.0"`) via PR #58313, which only landed on `release-5.5`; from `v5.6-beta` on, the source reports TS5102 that `ignoreDeprecations` can't silence. The 5.5 release notes and the #51000 plan both say 6.0. 7.0 doesn't know the flags (2.8).
- **TS1371, TS1444 and TS1446 no longer exist** (gone by 5.5.4); TS1208 was deleted in 5.0 and replaced by TS1280 for namespaces only (1.8, 2.3, 2.4).
- **TS1286 isn't the only CommonJS error.** In 6.0.3, a `.ts` file gets TS1295 (with advice about `package.json` `type`), and only `.cts`/`.cjs` files get TS1286; TS1286's wording also changed after 5.5 (2.7).
- **`verbatimModuleSyntax` implies `isolatedModules`** (computed option), so `tsc --init` writing both is belt and braces (1.7, 2.9).
- **The 2019 design meeting's plan to make `preserve` the `tsc --init` default didn't ship in 3.8** (2.2).
- **The design notes sketched `import { type foo }` → `import "module"`;** what shipped is `import {} from "module"` (2.6).
- **By default, tsc also removes a hand-written `import {} from "x"`,** which ECMAScript treats as a load. Only a bare `import "x"` is safe from default elision (1.10, 2.10).
- **TypeScript 7 is no longer a separate repo or a separate command.** microsoft/typescript-go is archived; the Go code is under `tsc/` in microsoft/TypeScript; the 7.0 command is `tsc`, not `tsgo`; 7.0 emits JavaScript; and 7.1-beta has the first emit change in this area (2.13, 2.14).
- **The `tsc --init` lead was right** (5.9 turned on `verbatimModuleSyntax`, `isolatedModules` and `noUncheckedSideEffectImports`), and 6.0 additionally made `noUncheckedSideEffectImports` the compiler default (1.9, 2.9).
- **The isolatedModules tsconfig page's namespace example is annotated with error 1277,** which isn't the namespace error (TS1280) in 6.0.3 (1.8).

**Transpilers, runtimes, builds and their bugs (sections 3 and 5, 7.1–7.18)**

- **Babel's default flip for `onlyRemoveTypeImports` is now promised for Babel 9.0,** not 8; Babel 8.1.2 still defaults to `false` (3.1). The option dates from v7.9.0 as the lead said.
- **esbuild never reads `isolatedModules`;** it recommends it for tsc. It honours `importsNotUsedAsValues` from 0.7.15 (Oct 2020), `preserveValueImports` from 0.14.0 (Nov 2021) and `verbatimModuleSyntax` from 0.18.0 (Jun 2023) (3.2).
- **swc's `jsc.transform.verbatimModuleSyntax` is real but undocumented** on the config page; it arrived with the Sept 2023 TypeScript-pass rewrite, and the typings only in Feb 2025 (3.3).
- **Vite's docs don't tell users to set `verbatimModuleSyntax`;** they tell them to set `isolatedModules` and use type-only syntax, and list `verbatimModuleSyntax` only as an option that affects output (3.8). Svelte's docs are the ones that recommend it (3.13).
- **Node's dates are right,** with two more: stable in v25.2.0/v24.12.0, and `--experimental-transform-types` (added v22.7.0) removed in v26.0.0, so the latest docs no longer mention it (3.5).
- **Node's docs don't say that `import { type X }` still loads the module;** that comes from Amaro's design, a maintainer's comment and my run (3.4, 7.10).
- **Deno doesn't default `verbatimModuleSyntax` on;** the schema default is `false`, and until 2.8.2 Deno ignored the option at emit even when set (3.10).
- **Bun recommends `verbatimModuleSyntax` but its transpiler ignores it** (3.11).
- **Hayden's recollection is right only under verbatim-style options.** Under TS 4.5's `preserveValueImports`, `import { type x }` was removed entirely (esbuild 0.14.40 changelog), and under every tool's default it's removed; it became `import {}` with `verbatimModuleSyntax` (TS 5.0), and it's always `import {}` in Node (3.15).
- **The TypeScript Performance wiki says nothing about type-only imports, `verbatimModuleSyntax` or `isolatedDeclarations`** (5.4).
- **Rolldown inverts the deprecated option pair** (7.17).

**Decorators and dependency injection (section 4, 7.20–7.33)**

- **The lead that Angular breaks the same way is wrong.** Angular hasn't used `emitDecoratorMetadata` since 2019 (new apps) and removed it by migration in v12 (4.13). Its compiler reads the constructor's parameter types itself and fails the build with NG2003, naming the type-only import, for components, directives and pipes always, and for `@Injectable` under `strictInjectionParameters` (on in new strict projects); a non-strict `@Injectable()` gets a factory that throws at runtime (4.14, 7.21). The changeset's "The code still compiled" is false for Angular.
- **The lead that `emitDecoratorMetadata` records `Function` holds for `tsc`, not for every compiler.** `tsc` records `Function` for `import type` and `import { type X }` (4.3, 4.4), and has since TypeScript 4.0; in 3.8 and 3.9 it referenced the erased name and crashed (4.6). `ts.transpileModule`, and by its source SWC, record `Object` (4.5). For an interface it is always `Object`.
- **TS1272 dates from TypeScript 4.7 (PR #42915, Mar 2022), not 5.0,** and it only fires for ES module output and only for names with no value (4.7).
- **`verbatimModuleSyntax` doesn't protect injection,** despite typescript-eslint's blog suggesting it as the alternative: TypeScript 6.0.3 accepts `import type` for a class in a decorated constructor under it and emits `Function` (4.4, 7.25).
- **typescript-eslint doesn't need type information to hold back:** `parserOptions.emitDecoratorMetadata` plus `experimentalDecorators` is enough (7.24, my run). And since Angular projects don't set `emitDecoratorMetadata`, the exemption never applies to them.
- **The TypeScript handbook documents only `design:type`;** `design:paramtypes` and `design:returntype` appear nowhere on the page, and no release note from 3.8 to 4.7 mentions the decorator-metadata changes (4.2, 4.6).
- **Nest's import-type error hint doesn't fire on `tsc` output** (`Function`); it matches `undefined` and `Object` only (4.10, 7.31).
- **TypeORM recommends `import type` for related entities** in its relations FAQ (with string targets), and its `Relation<>` wrapper exists to keep the class out of metadata. The ORM case runs opposite to the DI case (4.12, 7.32).
- **NestJS's `ValidationPipe` is a second exposure** the Ultracite commit doesn't mention: a DTO imported with `import type` is validated against `Object` (skipped) or `Function` instead of the DTO class (4.11).
- **TypeGraphQL doesn't document type-only imports** (the lead allowed for it).
- **Biome's maintainer summary of typescript-eslint's change ("now rejects this") is inaccurate;** typescript-eslint skips files with decorators when both flags are known (7.27).

**The rules and their fixes (6.1–6.29, 7.40–7.59)**

- **Biome's fix kind never changed between Biome 1 and 2.** `useImportType` and `useExportType` are `FixKind::Safe` at 1.5.0, 1.6.0, 1.8.3, 1.9.4, 2.0.0, 2.3.0 and 2.6.4 (6.21). What did change: promotion to `style` (1.6.0), the `style` option (2.0.0), default severity warning (2.0).
- **eslint-plugin-import's documented default is not its behaviour.** The docs say `prefer-inline`; a bare `"error"` enforces `prefer-top-level` in ESLint 8, 9 and 10 (6.12).
- **`no-import-type-side-effects` was not designed around default elision.** Under default elision tsc and Babel drop `import { type A }` entirely, as Brad Zacher said in 2023; the rule targets `verbatimModuleSyntax` (6.9, 6.10). Node's type stripping, though, keeps the import.
- **`consistent-type-specifier-style`'s origin is consistency, not side effects** (6.11). The side-effect case for `prefer-top-level` appears only in the 2026 docs for the newer third option (6.13).
- **typescript-eslint's parser options are ignored when type information is present**: a tsconfig without the decorator flags overrides `parserOptions.emitDecoratorMetadata` (6.4, 6.25). They were not removed in v8.
- **The `prefer` docs ("except referenced by metadata of decorators") overstate the rule** in typescript-eslint since 7.4.0 and in Oxlint always; Oxlint has no decorator handling (6.2, 6.16).
- **typescript-eslint no longer says never to combine the rule with `verbatimModuleSyntax`** (July 2026, 6.5).
- **Oxlint's `no-import-type-side-effects` is no longer a safe fix** from 1.94.0 (16 Nov 2026); the installed 1.90.0 still is (6.17).
- **Oxc #28068 appears fixed in 1.88.0+ by #27409** although still open; the ESLint equivalent is unreported and reproduces (6.28, 7.51).

**Configs, research, preferences and agents (6.30 onwards, section 8)**

- **Scarsbrook et al. measured TypeScript 4.5's inline `type` modifier, not 3.8's `import type`** (8.1); there is no count of `import type` in the wild.
- **ts-standard doesn't enforce type imports.** Its last release (Dec 2022) pins a Standard-with-TypeScript version from before the rules were added (Jan 2023); only eslint-config-love, its successor, has them (6.34).
- **eslint-config-xo-typescript is archived;** its rules now live in eslint-config-xo (6.35).
- **Google's style guide has a new rule** (October 2026) against `import()` in type annotations; the guide also moved from HTML to Markdown (6.32).
- **gts enforces nothing about type imports** despite the style guide's `export type` rule, and its tsconfig is CommonJS (6.33).
- **`@tsconfig/strictest` does not set `verbatimModuleSyntax`.** It did for a month in 2023, and it was removed because it breaks CommonJS; attempts to add it back are closed or open (6.38).
- **Next.js doesn't set or require `verbatimModuleSyntax`;** it requires `isolatedModules` and skips that only when the user has `verbatimModuleSyntax` (6.41). The Next.js repo itself uses the flag (8.13).
- **Angular's `ng new` sets `isolatedModules` (since July 2024), not `verbatimModuleSyntax`** (6.45).
- **NestJS's tsconfig sets `isolatedModules` next to `emitDecoratorMetadata`,** and its new projects lint with Oxlint, not ESLint (6.46).
- **Astro and Svelte maintainers said in 2023 that `isolatedModules` and `verbatimModuleSyntax` couldn't be set together;** a @vue/tsconfig commenter says TypeScript 5.0.4 allowed it, and Astro's base now sets both (6.42, 6.44). Not confirmed against TypeScript's source.
- **typescript-eslint's own repo sets `verbatimModuleSyntax: false`** and turns `consistent-type-exports` off (8.14).
- **VS Code, Angular and Prettier set none of the rules or flags** in their root configs (8.16).
- **No large tsconfig study covers module options;** the JSERD study excluded them, and its data can't be reused (8.2).

**Ultracite and the two new compilers (3.16, 3.17, section 9)**

- **Oxlint core lists `typescript/consistent-type-exports`, but it never runs by default:** the rule is type-aware, so only `options.typeAware` with `oxlint-tsgolint` runs it; on ESLint it is in the type-aware preset (9.2).
- **"Oxlint and Biome do this always" holds; "typescript-eslint only holds back when it has type information" is incomplete:** `parserOptions.emitDecoratorMetadata` and `experimentalDecorators` are enough (6.4, 7.24, 9.5).
- **`Function` is what `tsc` records, not what every build records,** and Angular records nothing: its compiler fails the build with NG2003, so the changeset's "The code still compiled," is wrong for Angular (4.3–4.5, 4.13, 4.14, 9.5).
- **The DI breakage is older than 8.0 on Biome and Oxlint:** Biome since Ultracite went Biome-only (Jul 2024), Oxlint since V7 (Dec 2025); only on ESLint did 8.0.0 bring it back, after the configs from Jan 2023 had given TypeScript files type information (9.5, notes).
- **The `prefer-inline` to `prefer-top-level` switch fixed an Oxlint-only conflict:** ESLint never fought `no-import-type-side-effects`, because eslint-plugin-import's bare `"error"` was top-level in practice (6.12, 9.3).
- **The three presets don't converge on mixed imports:** Biome's fix writes the inline specifiers the other two presets report (9.8).
- **"ts-rust" is pingdotgg/ts-rust (`tsc-rs`, a Rust port of TypeScript 7 written by models), not the `tsrs` package that Ultracite PR #858 proposed; "scriptc" is Vercel Labs' TypeScript-to-native compiler and emits no JavaScript** (3.16, 3.17).

---

## Unverified or dropped

**TypeScript (sections 1 and 2)**

- **TypeScript 3.8 to 5.9 weren't run.** The rows for `importsNotUsedAsValues` and `preserveValueImports` rest on source and test baselines at tags, not on executing those compilers (the corpus harness tests installed compilers).
- **No baseline for `import { type x }` under `preserve` without `preserveValueImports`** was found; the `import "y";` result follows from the code path the `error` baseline exercises.
- **TypeScript 7.0's output was not run**, and what it prints for a removed option in `tsconfig.json` wasn't checked; its parser comment says such tests "fail to parse".
- **No 7.0 page exists in the TypeScript-Website release notes** at the pinned commit; I used the devblog announcement and the GitHub release record instead.
- **The exact commits for the TS1208 rewordings (3.5, 4.4) and for TS1448, TS1269, TS2865 and TS18055–18056** weren't traced; tags bracket them.
- **The 1.0 language spec** (Word/PDF) wasn't opened; 1.4 is the earliest elision text cited.
- **The design goals page is undated,** so I can't say whether non-goal 5 predates elision.
- **`--rewriteRelativeImportExtensions` (5.7)** was dropped as not bearing on type-only imports.

**Transpilers, runtimes, builds and their bugs (sections 3 and 5, 7.1–7.18)**

- **`bun build --compile`** wasn't run (binary size) and its parse path wasn't traced (3.11).
- **Sucrase's handling of `import { type x }`** wasn't checked (3.12).
- **Babel and swc weren't run** (not installed); their entries rest on source, fixtures and changelogs.
- **Stack Overflow** returned 403 to curl; the question and answers were saved from the Stack Exchange API instead (7.15).
- **No measurement of type-check or build speed** attributable to `import type` was found; the only number is the 3% compiler-implementation aside (5.4).
- **The release that first shipped Vite PR #6260** (between v2.5.0 and v3.0.0) and **Deno PR #35288** weren't pinned.
- **webpack + ts-loader `transpileOnly`** (its own export-not-found warnings) and **Turbopack/Rspack** behaviour weren't covered.
- Dropped as off-topic: Node #59364 (v22.18.0 unflagging broke CI, not imports), arkade-os/ts-sdk #856 (declaration emit), xh/hoist-react #4429 (a one-line intention to use `import type` against cycles).

**Decorators and dependency injection (section 4, 7.20–7.33)**

- **NestJS, Angular's compiler, SWC and class-transformer were not run** (not installed; nothing was installed). Their behaviour is from source at pinned tags and from issue reports. In particular: the exact Nest message for a `Function` token in v12 (inferred from `messages.ts`), SWC's `Object` for a stripped type-only import (inferred from `metadata.rs`), and what a Nest handler receives when the DTO metatype is `Function` (4.11).
- **Angular JIT setups** (Jest with jest-preset-angular, older Karma) weren't checked; the downlevel `ctorParameters` transform likely writes `type: undefined` for a type-only import, but that wasn't confirmed.
- **esbuild** (no `emitDecoratorMetadata` support) is section 3's and wasn't checked here; angular-cli #28155 touches it and was read but not used.
- **Stack Overflow** wasn't needed: primary issues exist for every failure mode.
- **typescript-eslint #7101 and #8582** (false "used by decorator metadata" reports) and **oxc #21922** (oxc transformer divergences from tsc) were saved but not written up; they are about the rule's and Oxc's internals (helpers D and B).

**The rules and their fixes (6.1–6.29, 7.40–7.59)**

- eslint-plugin-import itself wasn't run (not installed); its default-option behaviour is inferred from its source, ESLint's source and #2864 (6.12).
- Older Oxlint versions (Dec 2025–Feb 2026) weren't run, so whether `prefer-inline` plus `no-import-type-side-effects` flipped on every run then is inferred from 1.90.0 and the unchanged fixers.
- esbuild, SWC, Babel and Vite handling of `import { type A }` not run (6.10).
- Biome #2041, #3477, #4640, #9119, #9432 and #9848 seen in search only, apart from short reads of #2041 and #3477.
- The typescript-eslint docs-page version that first carried the revised `verbatimModuleSyntax` wording: PR #12194 merged 6 Jul 2026; docs changes aren't in the changelog.
- Biome's useImportType author's full name isn't in any saved file; cited by handle (Conaclos).

**Configs, research, preferences and agents (6.30 onwards, section 8)**

- **Daniel Rosenwasser's January 2020 tweet** (linked in xojs/xo#539) that type imports are rarely needed: Wayback lists a capture but served its not-archived page twice; X/Twitter wasn't tried. Not quoted.
- **AIDev (Hugging Face):** the datasets-server `/search` and `/filter` endpoints failed ("Authentication check on the Hugging Face Hub failed or timed out") or timed out on 17 Nov 2026, so agent PRs in AIDev weren't counted; 8.25 uses GitHub search instead.
- **grep.app** served a Vercel security checkpoint, so no public code-search count of tsconfig settings was made.
- **The arXiv API** timed out after one query and was stopped; Semantic Scholar returned results for one query and then nothing.
- **Next.js PR #54164** (inherited `verbatimModuleSyntax`) and **microsoft/TypeScript PR #53611** (TS 5.0.4) were seen only as titles or in comments.
- **Lead not found:** a Total TypeScript article on `import type` against `import { type }` (only a paywalled workshop lesson turned up).
- **Leads checked and found to have no relevant setting:** VS Code, Angular, Prettier, DefinitelyTyped root configs (8.16). The TypeScript repo's own config wasn't checked because its default branch is now the Go port.
- **Covered elsewhere in this file:** flag history (sections 1 and 2), runtimes and bundlers (sections 3 and 5), decorators (section 4), rule internals and the Biome and Oxlint ports (section 6).

**Ultracite and the two new compilers (3.16, 3.17, section 9)**

- **ts-rust and scriptc** were read, not run, as asked; their behaviour is from source, docs and tests at the pinned commits (3.16, 3.17).
- **No issue, PR or discussion in Ultracite's repository** records why `prefer-inline` was chosen in V7 or what `c60533d7` conflicted with; the conflict is inferred from the two rules and the Oxlint 1.90.0 run (9.3).
- **The DI fix's trigger:** no user report was found; what prompted `e8c2207d` isn't in the record beyond the commit message (9.5).
- **Older Oxlint, ESLint and Biome versions** behind Ultracite's history weren't run; the dates in 9.5 and the notes rest on the configs at each commit and the rules' release history (6.4, 6.16, 6.21).
- **Angular, NestJS and a real container** weren't run against Ultracite's fixed output; 9.7 uses a stub decorator and a hand-written metadata recorder.
