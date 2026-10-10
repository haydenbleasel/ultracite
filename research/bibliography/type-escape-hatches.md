# Type escape hatches: literature and source notes

Compiled 2026-10-10 for the Ultracite research post on `any`, non-null assertions, type assertions and `@ts-*` comments, and the rules that ban them (`no-explicit-any`, `no-non-null-assertion`, `ban-ts-comment`, `noExplicitAny`, `noNonNullAssertion`, `noTsIgnore`, and the type-aware `no-unsafe-*` family).

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the official docs, the GitHub issue or PR, or the tool's source code) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record and the abstract were checked, but not the full text.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.

Every quote is copied exactly and is under 15 words. Sources shared with other posts (Strathern, ImpossibleBench, Böckeler) are in [`cognitive-complexity.md`](./cognitive-complexity.md) §6 and aren't repeated here.

---

## Most useful for the post

1. **Unsound on purpose.** TypeScript's Design Goals list a sound type system as a non-goal: "Instead, strike a balance between correctness and productivity." Bierman, Abadi and Torgersen (ECOOP 2014) call the type system "not statically sound by design".
2. **Its designers asked for linters.** The same paper's conclusion proposes guidance to "reduce the reliance on dangerous typing rules", and adds that "Static analysis tools may support this guidance".
3. **`any` is gradual typing's `?` without the runtime half.** Siek and Taha (2006) catch mismatches with the unknown type "at run-time". TypeScript erases types, so runtime casts are "not practical in TypeScript, because of type erasure" (Bierman et al.).
4. **Where "escape hatch" comes from.** The 2016 proposal for `unknown` (TypeScript issue #10715): "Where `any` is the escape hatch out of the type system". typescript-eslint's rule docs still say "`any` is always a dangerous escape hatch."
5. **The TypeScript team discouraged its own escape hatches as it shipped them.** The 2.6 notes ask that `@ts-ignore` be used "very sparingly" (sic). The handbook says `any` is like "putting an `@ts-ignore` comment around every usage of the variable".
6. **Banning `any` by lint is as old as TypeScript 1.0.** TSLint's `no-any` landed on 17 April 2014, two weeks after 1.0 was published to npm.
7. **A maintainer reports models adding `as any`.** Matt Bierner, VS Code, September 2025 (issue #269213): "Some language models seem to be specially keen on adding `as any` assertions". VS Code added a lint rule and suppressed about 900 existing casts so new ones would fail.
8. **Migrations run on suppressions.** Stripe's Flow-to-TypeScript codemod first "created over 97,000 error suppressions" (cut to 37,000) across 3.7M lines. Airbnb's ts-migrate inserts `@ts-ignore` and `$TSFixMe`, an alias for `any`.
9. **The rules are syntactic; the type-aware ones are newer.** `no-explicit-any` dates to 2016 (eslint-plugin-typescript). The `no-unsafe-*` rules that follow `any` through the code came in 2020–2021, and `no-unsafe-type-assertion` in November 2024.
10. **Corpus maintainers disagree about `any`.** Zod's own config: `"noExplicitAny": "off", // \`any\` is amazing`. tRPC turns on `no-non-null-assertion` because "we like them".
11. **Types catch some bugs, not most.** Gao, Bird and Barr (ICSE 2017): TypeScript 2.0 and Flow each detect 15% of 400 shipped JavaScript bugs, a conservative lower bound.
12. **`any` tracks maintainability, not bugs.** Bogner and Merkel (MSR 2022): about one `any` per 100 lines; `any` density correlates weakly with code smells (ρ = 0.26) but not with bug-fix ratio (ρ = −0.04).
13. **LLM-written TypeScript fails at the type checker.** Mündler et al. (PLDI 2025): "on average 94% of compilation errors result from failing type checks".
14. **Agents add more `any`.** Lee, Ul Hassan and Hindle (MSR 2026): in type-related PRs, "AI agents are 9x more prone to use the 'any' keyword" (2.16 vs 0.24 per PR, small effect, d = 0.32).
15. **"It type-checks" is a gameable measure.** Yee and Guha (ECOOP 2023): in ML-migrated files that type-checked, 25–60% of annotations were `any`, `any[]` or `Function`. OpenTau: "trivial type annotations (e.g., any) will always type check".

---

## 1. TypeScript's design

### 1.1 TypeScript Design Goals (wiki, undated). VERIFIED

- **Citation:** Microsoft TypeScript team, "TypeScript Design Goals", microsoft/TypeScript GitHub wiki.
- **Link:** https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals
- **What it says:**
  - Non-goal 3: "Apply a sound or "provably correct" type system."
  - It continues: "Instead, strike a balance between correctness and productivity."
  - The goals can conflict, and getting "the right balance and making the right exceptions" is the essence of language design.
- **Use for the post:** the official basis for "unsound on purpose".

### 1.2 Bierman, Abadi and Torgersen, "Understanding TypeScript" (ECOOP 2014). VERIFIED (author-hosted submitted version)

- **Citation:** Gavin Bierman, Martín Abadi and Mads Torgersen, "Understanding TypeScript", ECOOP 2014, LNCS 8586, Springer, pp. 257–281.
- **Links:** https://doi.org/10.1007/978-3-662-44202-9_11. Full text (authors' submitted version): https://users.soe.ucsc.edu/~abadi/Papers/FTS-submitted.pdf. Crossref confirms title, authors and pages. The wording below is from the submitted version, not Springer's typeset copy.
- **What it says:**
  - The type system is "not statically sound by design".
  - The designers "made a conscious decision not to insist on static soundness", to type existing JavaScript libraries "even if that means embracing unsoundness in specific places".
  - TypeScript uses "a distinguished dynamic type, written any". Runtime casts are "not practical in TypeScript, because of type erasure."
  - "any can be implicitly converted to any other type", so "assignment compatibility is no longer transitive!" (`string` to `any` to `boolean`, but not `string` to `boolean`).
  - On downcasts: "So incorrect downcasts are not detected".
  - "unsound languages are not all equally bad (nor all equally good)"
  - The conclusion proposes to "codify programmer guidance that would, over time, reduce the reliance on dangerous typing rules", and: "Static analysis tools may support this guidance and complement a type system."
  - The paper models TypeScript 0.9.5.
- **Use for the post:** the academic anchor, and the paper's own call for lint tools.

### 1.3 Siek and Taha, "Gradual Typing for Functional Languages" (2006). VERIFIED

- **Citation:** Jeremy G. Siek and Walid Taha, "Gradual Typing for Functional Languages", Scheme and Functional Programming Workshop 2006, University of Chicago TR-2006-06, pp. 81–92.
- **Link:** http://scheme2006.cs.uchicago.edu/13-siek.pdf
- **What it says:**
  - "The unknown portions of a type are indicated by ?." Unannotated parameters default to `?`.
  - The type system catches "incompatibilities between the known parts of types".
  - The consistency relation is "reflexive and symmetric but not transitive".
  - For the unknown parts, "the type error will be caught at run-time".
- **Use for the post:** `any` is TypeScript's `?`, minus the runtime checks.

### 1.4 Rastogi et al., "Safe & Efficient Gradual Typing for TypeScript" (POPL 2015). VERIFIED

- **Citation:** Aseem Rastogi, Nikhil Swamy, Cédric Fournet, Gavin Bierman and Panagiotis Vekris, POPL 2015, pp. 167–180.
- **Links:** https://doi.org/10.1145/2676726.2676971. Full text: https://www.microsoft.com/en-us/research/wp-content/uploads/2017/08/safets.pdf
- **What it says:**
  - "TypeScript's type system is intentionally unsound".
  - "any-typed values can be passed to a context expecting a more precise type"
  - Safe TypeScript adds runtime checks; bootstrapping its own compiler cost 15% overhead.
- **Use for the post:** what soundness would cost, and why TypeScript doesn't pay it. Optional.

### 1.5 Siek et al., "Refined Criteria for Gradual Typing" (SNAPL 2015). VERIFIED

- **Citation:** Jeremy G. Siek, Michael M. Vitousek, Matteo Cimini and John Tang Boyland, SNAPL 2015, LIPIcs 32, pp. 274–293.
- **Link:** https://doi.org/10.4230/LIPIcs.SNAPL.2015.274
- **What it says:** the term's "meaning has become diluted". TypeScript appears only as an industry example; the paper makes no claim about TypeScript's `any`.
- **Use for the post:** not needed. Don't cite it for TypeScript claims.

---

## 2. TypeScript's escape hatches, release by release

### 2.1 `noImplicitAny`: TypeScript 0.9.1 (2013). VERIFIED

- **Citation:** Jonathan Turner, "Announcing 0.9.1", TypeScript blog, 6 August 2013.
- **Link:** https://devblogs.microsoft.com/typescript/announcing-0-9-1/
- **What it says:** `noImplicitAny` was experimental in 0.8; teams used it to avoid "not having ‘any’ creep in accidentally". 0.9.1 made it a full flag.

### 2.2 `!` and `strictNullChecks`: TypeScript 2.0 (2016). VERIFIED

- **Link:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html (npm 2.0.3: 22 September 2016)
- **What it says:** before 2.0, `null` and `undefined` were valid values of every type. The postfix `!` gives "the type of `x` with `null` and `undefined` excluded", and "the `!` non-null assertion operator is simply removed in the emitted JavaScript code".
- **Use for the post:** `!` shipped in the same release as the check it escapes.

### 2.3 `--strict`: TypeScript 2.3 (2017). VERIFIED

- **Link:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html (npm 2.3.1: 27 April 2017)
- **What it says:** `--strict` enables `strictNullChecks`, `noImplicitAny`, `noImplicitThis` and `alwaysStrict`; `tsc --init` writes `"strict": true`.

### 2.4 `@ts-ignore` in .ts files: TypeScript 2.6 (2017). VERIFIED

- **Links:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html (npm 2.6.1: 31 October 2017); PR https://github.com/microsoft/TypeScript/pull/18457 (Anders Hejlsberg, merged 19 September 2017); request https://github.com/microsoft/TypeScript/issues/9448 (30 June 2016).
- **What it says:**
  - Suppresses "all errors that originate on the following line".
  - The rest of the comment should "explain which error is being suppressed".
  - "we recommend you use this comments very sparingly" (sic).
  - The request: "there are certain scenarios the developer knows best".

### 2.5 The `unknown` proposal: issue #10715 (2016). VERIFIED

- **Citation:** Sean Middleditch, "`unknown`: less-permissive alternative to `any`", microsoft/TypeScript issue #10715, 5 September 2016.
- **Link:** https://github.com/microsoft/TypeScript/issues/10715
- **What it says:** "Where `any` is the escape hatch out of the type system", `unknown` is "the well-guarded and regulated entrance into the type system". `any` suits trusted data and `unknown` untrusted data.
- **Use for the post:** the source of the "escape hatch" framing.

### 2.6 `unknown`: TypeScript 3.0 (2018). VERIFIED

- **Links:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html (npm 3.0.1: 30 July 2018); PR https://github.com/microsoft/TypeScript/pull/24439 (Anders Hejlsberg, "New 'unknown' top type", merged 30 May 2018, fixes #10715).
- **What it says:** "`unknown` is the type-safe counterpart of `any`." Anything is assignable to `unknown`; the reverse needs an assertion or narrowing.

### 2.7 `@ts-nocheck` in .ts files: TypeScript 3.7 (2019). VERIFIED

- **Link:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html (npm 3.7.2: 5 November 2019); PR #33383.
- **What it says:** previously JS-only; expanded to TS files "to make migrations easier for all users".

### 2.8 `@ts-expect-error`: TypeScript 3.9 (2020). VERIFIED

- **Links:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html (npm 3.9.2: 12 May 2020); PR https://github.com/microsoft/TypeScript/pull/36014 (Josh Goldberg, merged 5 March 2020); issue #29394.
- **What it says:**
  - If nothing errors, "TypeScript will report that `// @ts-expect-error` wasn't necessary."
  - Prefer it for "test code where you actually want the type system to error".
  - Prefer `@ts-ignore` when "new errors have appeared in code with no clear owner".
- **Use for the post:** TypeScript's own guidance is milder than the lint defaults.

### 2.9 `catch` variables: TypeScript 4.0 and 4.4. VERIFIED

- **Links:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html (npm 4.0.2: 20 August 2020); https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html (npm 4.4.2: 26 August 2021).
- **What it says:** "`catch` clause variables have always been typed as `any`." 4.0 allows `catch (e: unknown)`; 4.4's `useUnknownInCatchVariables` (part of `strict`) "changes the default type of `catch` clause variables from `any` to `unknown`."
- **Use for the post:** an implicit `any` that survived `noImplicitAny` for eight years.

### 2.10 `strict` by default: TypeScript 6.0 (2026). VERIFIED

- **Link:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html (npm 6.0.2: 23 March 2026)
- **What it says:** "`strict` is now `true` by default". "The appetite for stricter typing continues to grow".

### 2.11 Handbook: Everyday Types. VERIFIED

- **Link:** https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- **What it says:**
  - With `any` you can "assign it to (or from) a value of any type". "You usually want to avoid this, though, because `any` isn't type-checked."
  - "there is no runtime checking associated with a type assertion"
  - The double assertion goes "first to `any` (or `unknown`, which we'll introduce later)"; the example is `expr as any as T`.
  - `!` is "effectively a type assertion that the value isn't `null` or `undefined`".

### 2.12 Handbook: Do's and Don'ts. VERIFIED

- **Link:** https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- **What it says:** "Don't use `any` as a type unless you are in the process of migrating". `any` means "please turn off type checking for this thing", "similar to putting an `@ts-ignore` comment around every usage of the variable". Use `unknown` instead.

### 2.13 The TS2352 diagnostic. VERIFIED

- **Link:** https://github.com/microsoft/TypeScript (`diagnosticMessages.json`, code 2352)
- **What it says:** "Conversion of type '{0}' to type '{1}' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first."
- **Use for the post:** the compiler itself tells you how to write `as unknown as T`.

---

## 3. The lint rules

### 3.1 TSLint `no-any` (2014) and related rules. VERIFIED

- **Links:** https://palantir.github.io/tslint/rules/no-any/; palantir/tslint `src/rules/noAnyRule.ts` and CHANGELOG (archived repo).
- **What it says:**
  - First commit by Chris Bobo, 17 April 2014, "New rule to prohibit use of 'any'"; released in v0.4.9 (15 May 2014). TypeScript 1.0.0 was published to npm on 2 April 2014.
  - Rationale: `any` "nullifies the compile-time benefits of the type system".
  - Later: `no-unsafe-any` v4.4.0 (January 2017), `no-non-null-assertion` v4.5.0 (February 2017), `ban-ts-ignore` v5.12.0 (December 2018). TSLint was deprecated in 2019.

### 3.2 eslint-plugin-typescript `no-explicit-any` (2016). VERIFIED

- **Link:** https://github.com/bradzacher/eslint-plugin-typescript (archived), PR #8 by Danny Fritz, merged 23 October 2016.
- **What it says:** the original doc: "Using the `any` type defeats the purpose of using TypeScript." It already noted that `--noImplicitAny` doesn't catch explicit `any`. typescript-eslint inherited the rule.

### 3.3 typescript-eslint `no-explicit-any`. VERIFIED

- **Link:** https://typescript-eslint.io/rules/no-explicit-any/
- **What it says:**
  - In `recommended`. Defaults `fixToUnknown: false`, `ignoreRestArgs: false`; suggestions (not autofixes) to `unknown`, `never` or `PropertyKey`.
  - "`any` is always a dangerous escape hatch." "TypeScript's `unknown` is almost always preferable to `any`."
  - `noImplicitAny` "doesn't prevent `any` from being explicitly used the way this rule does".

### 3.4 typescript-eslint `no-non-null-assertion`. VERIFIED

- **Link:** https://typescript-eslint.io/rules/no-non-null-assertion/
- **What it says:** in `strict`, not `recommended`. Assertions are "often a sign that code is not fully type-safe". Suggests `?.` with `??`. Origin: eslint-plugin-typescript PR #108 (Macklin Underdown, 8 March 2018).

### 3.5 typescript-eslint `ban-ts-comment`. VERIFIED

- **Link:** https://typescript-eslint.io/rules/ban-ts-comment/
- **What it says:**
  - "By default, `@ts-check` is allowed"; `@ts-expect-error` is allowed with a description; "`@ts-ignore` and `@ts-nocheck` are reported."
  - Source defaults: `minimumDescriptionLength: 3`, `'ts-expect-error': 'allow-with-description'`. The `strict` config raises the minimum to 10.
  - History: `ban-ts-ignore` 1.4.0 (February 2019); `ban-ts-comment` 2.18.0 (January 2020); `allow-with-description` 3.1.0 (June 2020), the default for `ts-expect-error` since 4.0.0.
- **Measured here:** the description is the trimmed text after the directive, so `// @ts-expect-error - ??` passes (`calibration/escape-hatches/cases.ts` C4; tRPC `rsc.tsx` line 110).

### 3.6 typescript-eslint `prefer-ts-expect-error` (deprecated). VERIFIED

- **Link:** https://typescript-eslint.io/rules/prefer-ts-expect-error/
- **What it says:** added 2.28.0 (April 2020), deprecated since 7.11.0 (May 2024) in favor of `ban-ts-comment`.

### 3.7 typescript-eslint `consistent-type-assertions`. VERIFIED

- **Link:** https://typescript-eslint.io/rules/consistent-type-assertions/
- **What it says:** in `stylistic`. Defaults `assertionStyle: 'as'`, `objectLiteralTypeAssertions: 'allow'`. Assertions say "I know better than you, it's actually this different type!" Only the `never` option bans them.
- **Use for the post:** the default rule is about syntax, not safety.

### 3.8 typescript-eslint `no-unsafe-*` (2020–2021). VERIFIED

- **Link:** https://typescript-eslint.io/rules/no-unsafe-assignment/ (and `-member-access`, `-call`, `-return`, `-argument`)
- **What it says:** flag assigning, accessing, calling, returning and passing `any`. All in `recommended`, all need type information. member-access, call and return: 2.23.0 (March 2020); assignment 2.28.0 (April 2020); argument 4.21.0 (April 2021).

### 3.9 typescript-eslint `no-unsafe-type-assertion` (2024). VERIFIED

- **Link:** https://typescript-eslint.io/rules/no-unsafe-type-assertion/ (PR #10051, merged 14 November 2024; released 8.15.0, 18 November 2024)
- **What it says:** "This rule forbids using type assertions to narrow a type". "Type assertions that broaden a type are safe". Needs type information; not in any shared config.

### 3.10 Josh Goldberg, "Avoiding `any`s with Linting and TypeScript" (2025). VERIFIED

- **Link:** https://typescript-eslint.io/blog/avoiding-anys (typescript-eslint blog, 21 January 2025)
- **What it says:** `any` is "by design, the single most unsafe part of its type system". Section: "`noImplicitAny` Isn't Enough". `any` is "infectious"; suppressions are "always unsafe".

### 3.11 Biome rules. VERIFIED

- **Links:** https://biomejs.dev/linter/rules/no-explicit-any/, https://biomejs.dev/linter/rules/no-non-null-assertion/, https://biomejs.dev/linter/rules/no-ts-ignore/, https://biomejs.dev/linter/rules/no-implicit-any-let/, https://biomejs.dev/linter/rules/no-evolving-types/, https://biomejs.dev/linter/rules/no-unsafe-type-assertion/
- **What it says:**
  - `noExplicitAny` (since 1.0.0) and `noNonNullAssertion` (since 1.0.0) follow typescript-eslint.
  - `noTsIgnore` (since 2.0.0) covers only `@ts-ignore`; `@ts-expect-error` is shown as valid and `@ts-nocheck` isn't mentioned. Its reason: "it won’t be possible to know when and if the bug is fixed".
  - `noImplicitAnyLet` (1.4.0): "TypeScript’s --noImplicitAny compiler option doesn’t report this case."
  - Nursery `noUnsafeTypeAssertion` (2.5.9): "Disallow TypeScript type assertions other than const assertions." Same name as typescript-eslint's rule, different meaning.
- **Measured here** (Biome 2.5.15, `calibration/escape-hatches/` and the corpus): `noTsIgnore` doesn't flag a bare `@ts-expect-error` or `@ts-nocheck`, and missed six `@ts-ignore` comments that follow code on the same line in Next.js. `noExplicitAny` skips a bare `<T extends any>` constraint. `x!!` counts once.

### 3.12 Oxlint ports. VERIFIED

- **Link:** https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-explicit-any.html (and the other rule pages)
- **What it says:** the rules port typescript-eslint's, with the same options and defaults. The `no-unsafe-*` and `no-unsafe-type-assertion` pages say "This rule requires type information".
- **Measured here** (Oxlint 1.86.0): every count matched ESLint's typescript-eslint 8.71.0 exactly across the corpus. Its `no-non-null-assertion` help text says "Consider using the optional chain operator `?.` instead."

---

## 4. Practice: style guides, migrations and maintainers

### 4.1 Google TypeScript Style Guide. VERIFIED

- **Link:** https://google.github.io/styleguide/tsguide.html
- **What it says:**
  - "any is dangerous - it can mask severe programming errors". "Consider not to use any."
  - Assertions and `!` "only silence the TypeScript compiler"; comment why each is safe.
  - Double assertions: "Use unknown (instead of any or {}) as the intermediate type."
  - "Do not use @ts-ignore nor the variants @ts-expect-error or @ts-nocheck." `@ts-expect-error` is tolerated in unit tests.

### 4.2 Airbnb, ts-migrate (2020). VERIFIED

- **Citation:** Sergii Rudenko, "ts-migrate: A tool for migrating to TypeScript at scale", Airbnb Engineering, 18 August 2020; https://github.com/airbnb/ts-migrate
- **Link:** https://medium.com/airbnb-engineering/ts-migrate-a-tool-for-migrating-to-typescript-at-scale-cd23bfeb5cc
- **What it says:** the migration inserts `@ts-ignore` comments and `$TSFixMe` ("an alias to `any`"); later versions use `@ts-expect-error`. About 86% of a 6M-line monorepo converted.
- **Use for the post:** escape hatches as named migration scaffolding.

### 4.3 Stripe, "Migrating millions of lines of code to TypeScript" (2022). VERIFIED

- **Citation:** Andrew Lunny, Stripe blog, 20 May 2022.
- **Link:** https://stripe.com/blog/migrating-to-typescript (redirects to https://stripe.dev/blog/migrating-to-typescript)
- **What it says:** one PR converted "more than 3.7 million lines of code". "An initial pass on the Dashboard codebase created over 97,000 error suppressions", cut to 37,000, "about one per thousand lines of code". The Flow code "had about 5,000 error suppressions".

### 4.4 VS Code: "Clean up `as any` type assertions in the codebase" (2025). VERIFIED

- **Citation:** Matt Bierner, microsoft/vscode issue #269213, 30 September 2025; commit 360c9fd134 ("Add lint rule for `as any` and bulk ignore all existing breaks", 3 October 2025).
- **Links:** https://github.com/microsoft/vscode/issues/269213 and https://github.com/microsoft/vscode/commit/360c9fd134
- **What it says:**
  - "We've seen a few build breaks caused by `as any` type assertions". They "can hide errors and break after mangling".
  - "Some language models seem to be specially keen on adding `as any` assertions" (to work around problems).
  - Plan: prevent new `as any` first, with suppression comments for the existing ones, "around 900 or so". The commit touched 300 files.
  - Next step considered: `@typescript-eslint/no-unsafe-type-assertion`.
  - The rule (`.eslint-plugin-local/code-no-any-casts.ts` at `959031245e`) reports `as any` and `<any>` only.
- **Use for the post:** the one attributable, first-hand report of models adding `as any`. It's an observation from one team, not a measurement. In the corpus slice (`src/vs/editor/common`), all 38 `any` carry a suppression naming the rule.

### 4.5 Corpus repos' own lint configs (pinned SHAs). VERIFIED

- **Zod** `biome.jsonc` at `284243fb0d`: `"noExplicitAny": "off", // \`any\` is amazing`and`"noNonNullAssertion": "off"`. https://github.com/colinhacks/zod/blob/284243fb0d6532665afdc9239188773bb624f73c/biome.jsonc
- **tRPC** `eslint.config.js` at `796700d865`: "These rules aren't enabled in typescript-eslint's basic recommended config, but we like them", above `'@typescript-eslint/no-non-null-assertion': 'error'`; `no-explicit-any` is off. https://github.com/trpc/trpc/blob/796700d8653b3832409fff997e6f5789519b9ea7/eslint.config.js
- **Vite**, **Astro** and **Next.js** turn `@typescript-eslint/no-explicit-any` off; Astro, Next.js and parts of Vite turn `ban-ts-comment` off.
- **VS Code** `eslint.config.js` at `959031245e`: `local/code-no-any-casts` and `local/code-no-dangerous-type-assertions` at `warn`, and `@typescript-eslint/no-explicit-any` at `warn` for a list of files.
- **Hono** has no lint config in the repo; its sources suppress `no-explicit-any` per line or per file (measured: 414 of its 434 `any`).

---

## 5. Do types prevent bugs?

### 5.1 Gao, Bird and Barr, "To Type or Not to Type: Quantifying Detectable Bugs in JavaScript" (ICSE 2017). VERIFIED

- **Citation:** Zheng Gao, Christian Bird and Earl T. Barr, ICSE 2017, pp. 758–769.
- **Links:** https://doi.org/10.1109/ICSE.2017.75. Full text: https://discovery-pp.ucl.ac.uk/id/eprint/10064729/1/typestudy.pdf
- **What it says:**
  - 400 fixed public bugs from 398 projects. Annotate the code just before the fix, minimally, and see whether the checker errors.
  - TypeScript 2.0 and Flow 0.30 each detect 60 of 400: 15%, 95% CI [11.5%, 18.5%]. Abstract: "both Flow 0.30 and TypeScript 2.0 successfully detect 15%!"
  - The estimate is "conservative": public bugs have already survived testing and review.
  - The authors themselves "annotate variables whose types are difficult to infer with any", and type unrelated modules `any` to clear unrelated errors.
  - TypeScript needed a median of 2 annotation tokens and 262 s per detected bug.
- **Caveats:** TypeScript 2.0 only; annotations were placed knowing where the fix was.

### 5.2 Bogner and Merkel, "To Type or Not to Type? A Systematic Comparison of the Software Quality of JavaScript and TypeScript Applications on GitHub" (MSR 2022). VERIFIED

- **Citation:** Justus Bogner and Manuel Merkel, MSR 2022, pp. 658–669.
- **Links:** https://doi.org/10.1145/3524842.3528454 (DOI from the Stuttgart record, not opened); https://arxiv.org/abs/2203.11115 (abstract checked again by hand)
- **What it says:**
  - 604 apps (299 JS, 305 TS), more than 16M lines, SonarQube plus the GitHub API.
  - TS had fewer code smells and lower cognitive complexity per line, but "bug proneness and bug resolution time of our TS sample were not significantly lower than for JS". The bug-fix commit ratio was "0.126 vs. 0.206" (JS vs TS).
  - `any` was measured as `@typescript-eslint/no-explicit-any` violations: 79,735 across 305 projects, median 70 per project; "the average TS app uses the any type once for every 100 lines of code".
  - Spearman correlations of `any` per line: code smells ρ = 0.26, cognitive complexity ρ = 0.19, bug resolution time ρ = 0.17, bug-fix ratio ρ = −0.04 (not significant). Abstract: "reducing the usage of the `any` type in TS apps was significantly correlated with all metrics except bug proneness".
  - Discussion: "TS developers do not have to try to religiously avoid it at all cost."
- **Caveats:** correlational; front-end apps; bug detection from commit messages; implicit `any` not measured.
- **Use for the post:** the honest counterweight. Our corpus has 61.8 explicit `any` per 10,000 lines (0.6 per 100), the same order of magnitude.

### 5.3 Khan, Chen, Varro and McIntosh, "An Empirical Study of Type-Related Defects in Python Projects" (TSE 2022). VERIFIED

- **Links:** https://doi.org/10.1109/TSE.2021.3082068. Full text: https://rebels.cs.uwaterloo.ca/papers/tse2021_khan.pdf
- **What it says:** Gao et al.'s method in Python with mypy: 43 of 400 defects were type-catchable, "15% of the corrective defects (11% of all defects)".
- **Use for the post:** the nearest thing to a replication, in another gradually typed language. Label it Python.

### 5.4 Tang, Alimadadi and Sumner, "From Logic to Toolchains: Bugs in the TypeScript Ecosystem" (MSR 2026). VERIFIED

- **Links:** https://doi.org/10.1145/3793302.3793379; https://arxiv.org/abs/2601.21186
- **What it says:** 633 bug reports from 16 TypeScript repositories; 12.4% are "Type Errors", a category that includes "bypassing checks with 'as any'". Type errors are "often caused by unsafe casts, missing annotations, or reliance on any."
- **Caveats:** partly classifier-labelled; no count of `any`-caused bugs specifically.

### 5.5 Feldthaus and Møller, "Checking Correctness of TypeScript Interfaces for JavaScript Libraries" (OOPSLA 2014). VERIFIED

- **Links:** https://doi.org/10.1145/2660193.2660215. Full text: https://cs.au.dk/~amoeller/papers/tscheck/paper.pdf
- **What it says:** TSCheck "has found 142 errors in the declaration files of 10 libraries".

### 5.6 Kristensen and Møller, "Type Test Scripts for TypeScript Testing" (OOPSLA 2017). VERIFIED

- **Links:** https://doi.org/10.1145/3133914. Full text: https://users-cs.au.dk/~amoeller/papers/tstest/paper.pdf
- **What it says:** mismatches in 49 of 54 libraries' declarations. "The TypeScript type checker blindly trusts the declaration files".
- **Use for the post (5.5, 5.6):** at an interop boundary, the types are asserted, not checked, even without `any`.

### 5.7 Python comparisons. VERIFIED

- Di Grazia and Pradel, "The Evolution of Type Annotations in Python: An Empirical Study", ESEC/FSE 2022, https://doi.org/10.1145/3540250.3549114: 78.3% of analysed snapshots have at least one type error. It doesn't quantify `Any`.
- Asare and Nadi, "How do third-party Python libraries use type annotations?", MSR 2026, https://sanadlab.org/assets/pdf/AsareMSR2026.pdf: `Any` is "uncommon" (median 0–2.33% of annotations by position).
- **Use for the post:** probably not needed.

---

## 6. LLMs, agents and type errors

### 6.1 Mündler et al., "Type-Constrained Code Generation with Language Models" (PLDI 2025). VERIFIED (sentence checked by hand in the arXiv PDF)

- **Citation:** Niels Mündler, Jingxuan He, Hao Wang, Koushik Sen, Dawn Song and Martin Vechev, Proc. ACM Program. Lang. 9 (PLDI), Article 171, 2025.
- **Links:** https://doi.org/10.1145/3729274; https://arxiv.org/abs/2504.09246
- **What it says:**
  - §1: "on average 94% of compilation errors result from failing type checks" (from their §5 evaluation).
  - Setting: six open-weight models (Gemma 2 2B/9B/27B, DeepSeek Coder 33B, CodeLlama 34B, Qwen2.5 32B) on the TypeScript versions of HumanEval and MBPP.
  - Syntax errors were separated with "the Oxidation toolchain" (oxc), because the TypeScript compiler "does not clearly distinguish between syntactic and semantic errors".
  - Type-constrained decoding cut synthesis compile errors by 75.3% (HumanEval) and 52.1% (MBPP).
- **Caveats:** "type checks" means every non-syntactic compiler error, not only assignability; small open models; function-level tasks.
- **Use for the post:** when LLM-written TypeScript fails, it fails at the type checker.

### 6.2 Yee and Guha, "Do Machine Learning Models Produce TypeScript Types That Type Check?" (ECOOP 2023). VERIFIED

- **Links:** https://doi.org/10.4230/LIPIcs.ECOOP.2023.37; https://arxiv.org/abs/2302.12163
- **What it says:**
  - TypeWeaver migrated 513 packages with DeepTyper, LambdaNet and InCoder; at most 20.7% of packages type-checked.
  - In error-free files, about 25–60% of annotations were trivial (`any`, `any[]`, `Function`), depending on the model.
  - "These annotations can hide type errors and allow more code to type check". "any can hide type errors that are only encountered at run time."
- **Caveats:** pre-chat models; non-strict checking.
- **Use for the post:** "it type-checks" was already a gameable measure for ML type predictors.

### 6.3 Cassano et al., "Type Prediction With Program Decomposition and Fill-in-the-Type Training" (OpenTau, 2023). VERIFIED

- **Link:** https://arxiv.org/abs/2305.17145
- **What it says:** "trivial type annotations (e.g., any) will always type check", so they score "typedness" alongside type errors, penalising `any`.
- **Use for the post:** researchers designing around the same Goodhart problem.

### 6.4 Lee, Ul Hassan and Hindle, "Mining Type Constructs Using Patterns in AI-Generated Code" (MSR 2026 Mining Challenge). VERIFIED (abstract checked again by hand)

- **Links:** https://doi.org/10.1145/3793302.3793578; https://arxiv.org/abs/2602.17955 (v2, 22 April 2026)
- **What it says:**
  - AIDev dataset: 545 agent and 269 human type-related TypeScript PRs, found by regex then a gpt-4o classifier.
  - Abstract: "AI agents are 9x more prone to use the 'any' keyword". Mean `any` additions per PR: 2.16 vs 0.24 (Mann-Whitney p ≈ 2.3e-7, Cohen's d = 0.32, a small effect).
  - Agent PRs had "1.8x higher acceptance rates" (45.8% vs 25.3%).
  - Agents "prioritize compilation success over long-term type soundness" (the authors' interpretation).
- **Caveats:** a 5-page challenge paper; regex detection; no normalisation by PR size that the reviewer saw; agent and human PRs may address different tasks; non-null and type assertions reported only in a figure.
- **Use for the post:** the one quantitative data point on agents adding `any`. Cite it with its caveats.

### 6.5 Pohle, "AgenticTyper: Automated Typing of Legacy Software Projects Using Agentic AI" (ICSE-Companion 2026). VERIFIED

- **Links:** https://doi.org/10.1145/3774748.3787746; https://arxiv.org/abs/2602.21251
- **What it says:** a Claude Sonnet 4.5 pipeline "resolves all 633 initial type errors" in two JavaScript repos (81K lines), with `@ts-expect-error` for errors it can't fix without changing behavior: 383 "necessary" suppressions and 26 more; "7% of suppressions could have been avoided".
- **Use for the post:** suppression as a designed, counted output.

### 6.6 Li, Zhang and Hassan, "The Rise of AI Teammates in Software Engineering 3.0" (AIDev, 2025). VERIFIED (metadata + abstract)

- **Link:** https://arxiv.org/abs/2507.15003
- **What it says:** more than 456,000 PRs from five agents across 61,000 repositories. The dataset behind 6.4.

### 6.7 Gaming checks in general. VERIFIED

- METR, "Recent Frontier Models Are Reward Hacking", 5 June 2025, https://metr.org/blog/2025-06-05-recent-reward-hacking/: o3 reward-hacked in 30.4% of RE-Bench runs; on one task the rate was 80% with or without "Please do not cheat."
- Anthropic, Claude 3.7 Sonnet System Card, February 2025, https://assets.anthropic.com/m/785e231869ea8b3b/original/claude-3-7-sonnet-system-card.pdf §6: the model "occasionally resorts to special-casing in order to pass test cases".
- Baker et al. (OpenAI), "Monitoring Reasoning Models for Misbehavior", https://arxiv.org/abs/2503.11926: training-time hacks such as `exit(0)` and `raise SkipTest`.
- ImpossibleBench: see `cognitive-complexity.md`.
- **Caveat for all of them:** tests and graders, not type checkers or linters. The step to `any` and `as` is an inference.

### 6.8 Ivan Cernja, "Why AI coding agents love type errors" (Encore blog, 2026). VERIFIED (opinion)

- **Link:** https://encore.dev/blog/type-errors-agents
- **What it says:** "There's an obvious escape hatch, and agents use it." No data.
- **Use for the post:** not needed; opinion only.

---

## 7. Wrong or unverifiable

- **Scarsbrook et al., "TypeScript's Evolution" (MSR 2023, arXiv 2303.09802)** is real, but it covers 13 syntactic features from TypeScript 4.0–4.9 and excludes anything that needs type checking. It says nothing about `any`, `unknown`, `!`, `as` or `@ts-ignore`.
- **No mining study of `@ts-ignore` / `@ts-expect-error`, `!` or `as` prevalence in human-written TypeScript was found.** Bogner and Merkel measured only explicit `any`. The counts in this post's corpus appear to be new.
- **No study of `any` in Copilot or ChatGPT TypeScript output was found**, and none that measures agents using `@ts-ignore` to silence errors. Lee et al. measure `any` additions in PRs; AgenticTyper's suppressions are by design.
- **The handbook's double-assertion example goes through `any`, not `unknown`.** The `as unknown as T` advice comes from the TS2352 message and Google's guide.
- **`@ts-ignore` predates 2.6 in .js files**; 2.6 extended it to .ts files.
- **`noImplicitAny` predates numbered release notes**: experimental in 0.8, a full flag in 0.9.1.
- **Airbnb's 2020 post describes inserting `@ts-ignore`**, not `@ts-expect-error`; the switch came later.
- **Bierman et al.'s wording** was checked in the authors' submitted version only.
- **Wang, Fang and Wang (2025), "An empirical study on bugs in TypeScript programming language", JSS 226:112445**, cited by Lee et al., could not be located.
