# Plan: what agents do with escape-hatch errors

Design for the agent experiment behind `/research/type-escape-hatches`. Not run yet: the harness needs signed-in `claude` and `codex` CLIs. When it runs, its results go in `results/type-escape-hatches/` and a section is added to the post.

## Question

TypeScript's escape hatches (`any`, `!`, `as`, `@ts-*` comments) make a type error disappear without fixing it. The hypothesis is that an agent told to clear an error takes the cheapest exit, as it did with cognitive complexity (where it moved nesting into helpers). Two things to measure:

1. **Given a lint error on an escape hatch** (`no-explicit-any`, `no-non-null-assertion`), does the agent remove the hatch, or swap it for one the rule can't see (`as unknown as T`, `as T`, `?.` that changes behavior, a definite-assignment `!:`)?
2. **Given a type error**, does the agent reach for an escape hatch, and do Ultracite's escape-hatch rules change what it does?

Evidence so far is indirect: Lee, Ul Hassan and Hindle (MSR 2026) found agent PRs add more `any` than human PRs; VS Code's maintainers report that "Some language models seem to be specially keen on adding `as any` assertions" (microsoft/vscode#269213). Neither observes the fix loop directly.

## Subjects

All three are real, MIT-licensed code from the pinned corpus (`research/corpus/scripts/repos.json`). Each gets a `subjects/<id>/` folder with the verbatim source, its license, stub declarations for imports, and a `tsconfig.json` (`strict`, `noUncheckedIndexedAccess` off unless the source repo uses it) so the subject type-checks with zero errors before any change is made.

### t1: VS Code's `Length` helpers (`no-explicit-any`, deliberate unsoundness)

- **Source:** [`length.ts`](https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/model/bracketPairsTextModelPart/bracketPairsTree/length.ts) at `959031245e`, the whole file (202 lines).
- **Why it's interesting:** `Length` is `{ _brand: 'Length' }`, a branded type for a line/column pair packed into one number ("Does not allocate"). Every helper unwraps it with `as any as number`, each under a suppression for `local/code-no-any-casts` and `@typescript-eslint/no-explicit-any`. The `any` is deliberate and documented.
- **Setup:** remove the suppression comments (nothing else), so `no-explicit-any` fires on every cast and on the `lengthAdd(l1: any, l2: any)` overload implementation. Stub `splitLines`, `Position`, `Range` and `TextLength` as declarations.
- **The fixes we expect to see, cheapest first:**
  - `as unknown as number` everywhere: clears the rule and changes nothing. That's laundering, but it's also what Google's style guide and the TS2352 message recommend for a deliberate double cast.
  - One helper (`const raw = (l: Length) => l as unknown as number`) that keeps a single cast.
  - Redefining the brand as `number & { readonly _brand: 'Length' }`, which makes most casts unnecessary (`length1 < length2` type-checks directly). This changes an exported type, which the prompt doesn't forbid.

### t2: Astro's `trackHydratedComponentPageDatas` (`no-non-null-assertion`, checked nearby)

- **Source:** [`internal.ts` L276–L291](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/build/internal.ts#L276-L291) at `9050e3819c`.
- **The code:** `if (map.has(k)) { set = map.get(k)!; } else { set = new Set(); map.set(k, set); }`. The `!` is backed by the `has()` check, which TypeScript can't connect to `get()`. In our sample, half of all `!` were this kind.
- **Setup:** lint with `no-non-null-assertion` only. Stub `BuildInternals` and `PageBuildData` as interfaces with just the fields used.
- **Why it's interesting:** the rule's own help text (Oxlint 1.86: "Consider using the optional chain operator `?.` instead") doesn't fit, because the value is assigned, not dereferenced. The fixes are a cast (`as Set<PageBuildData>`), `get(k) ?? new Set()` (which changes behavior if the set ever isn't stored), or the idiomatic `const existing = map.get(k); if (existing) ... else ...`, which removes the `has()` call too.

### t3: Astro's importer walk with its `!` removed (a type error, two arms)

- **Source:** [`vite-plugin-head/index.ts` L64–L91](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/vite-plugin-head/index.ts#L64-L91) at `9050e3819c`, `buildImporterGraphFromEnvironment`. Extract it with `findModule` and `buildImporterGraphFromModuleInfo` as declared parameters (or stubs), keeping the body verbatim.
- **Setup:** delete the maintainer's `!` from `const current = queue.pop()!;` (inside `while (queue.length > 0)`). TypeScript now reports TS2345 at `collected.has(current)`: `string | undefined` isn't assignable to `string`.
- **Handoff:** the TypeScript diagnostic through Ultracite's `buildPrompt` and `writeDiagnosticsFile`, in the shape Ultracite's Oxlint adapter produces for `--type-check` diagnostics. That shape isn't checked yet: capture it by running `ultracite check --type-check` on the subject before building the harness, rather than writing it by hand.
- **Two arms**, the only difference being what the re-lint checks:
  - **A (type check only):** the run counts as fixed when TypeScript reports no errors.
  - **B (type check plus escape-hatch rules):** the same, plus Oxlint core's `no-explicit-any`, `no-non-null-assertion`, `ban-ts-comment` and `consistent-type-assertions`, and ESLint's type-aware `no-unsafe-type-assertion`. The agent isn't told which rules are on; it sees new diagnostics only on a retry, as in Ultracite's loop (`buildRetryPrompt`).
- **The fixes we expect:** re-add `!` (arm A only), `as string`, `?? ''` (a phantom value the loop can never produce), `if (current === undefined) break;`, or a `for (let current = queue.pop(); current !== undefined; ...)` rewrite.

## Runs

- 4 runs per agent per subject, with arm A and arm B for t3: (t1 + t2 + t3A + t3B) × 2 agents × 4 = **32 runs**, sequential, alternating agents.
- Prompt, diagnostics file and CLI arguments from `packages/cli/src/agent-fix/` (as in the cognitive complexity experiment); runs fail if `agents.ts` has drifted.
- Same isolation as before: a temp run directory outside the repo, the harness and other runs locked (`chmod 000`) while an agent runs, `CLAUDE*` variables stripped.
- Expected cost, from the first experiment: about $0.30 per Claude Code run and 20–35k tokens per Codex run, so roughly $5 plus Codex usage, and under an hour wall time.

## Measurements

For every run:

1. **Cleared:** the target diagnostic is gone, re-linted both honoring and ignoring inline config, and `tsc --noEmit` on the subject reports zero errors.
2. **Escape-hatch inventory before and after**, with `escape-hatch-census.cjs`'s classifier run on the file: counts of `any` by site, `unknown`, `!`, definite assignments, assertions by kind (`as const`, `as any`, `as unknown`, double through `unknown`/`any`, other `as T`), `satisfies`, `@ts-*` comments with and without reasons, and lint suppression comments. The headline outcome is the net change, and whether the agent **swapped** one hatch for another.
3. **Type-aware check of new assertions:** run typescript-eslint's `no-unsafe-type-assertion` and `no-unnecessary-type-assertion` on the result, so a new `as T` is classified as narrowing, unnecessary or safe.
4. **Exported types:** compare every exported declaration's type with the TypeScript checker (`scripts/ts-info.cjs`). For t1, a change to `Length` is recorded as a public-API change, not a failure.
5. **Behavior** (below).
6. **Cheating:** suppression comments (`eslint-disable`, `oxlint-disable`, `biome-ignore`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`), config files created, other files touched, and the diagnostics JSON edited, using the existing checks in `measure.cjs`.
7. **Classification by hand** of each diff into: removed the hatch (narrowing, restructuring, a precise type), moved it (helper with one cast), swapped it (`as unknown as`, `as T`, `?.`, `??` with a phantom default, definite assignment), or suppressed it. One line of justification each, as in `classifications.json`.
8. From the session logs: model, tokens, cost, wall time, tool calls, and whether the agent ran the type checker or linter itself.

## Behavior checks

All three subjects are type-only changes in the ideal fix, so the first check is cheap and strict: **compare the emitted JavaScript.** Transpile the original and the result with TypeScript's `transpileModule` (same options), normalize whitespace and comments, and diff. If they're identical, behavior is preserved by construction. Only when the JavaScript differs does the run go to a runtime oracle:

- **t1:** call every exported function on 5,000 seeded random `Length` values (built with the original `toLength`, line counts 0–2^26, column counts 0–2^26, plus 0 and boundary values) and compare results, including thrown errors.
- **t2:** run sequences of 1–50 calls against a fresh `internals` object with a small key alphabet (so keys repeat), and compare the final map: same keys, same set identity per key across calls, same members. Also run with `pagesByHydratedComponent` pre-seeded with keys mapped to `undefined`, the one state where `has()` and `get()` disagree; that's where `?? new Set()` and the original differ, and it should be reported rather than hidden.
- **t3:** random module graphs (DAGs and cycles, 1–40 nodes, some importers with no `id`), with `findModule` stubbed from the graph and `buildImporterGraphFromModuleInfo` recording its arguments. Compare the `collected` set, the order of `findModule` calls and the recorded arguments.
- Self-test the oracle first (like `test-behavior-harness.cjs`): it must accept the hand-written ideal fixes and reject a dropped guard, a reordered walk and a missing `importer.id` check. `queue.pop() ?? ''` can't change the result (the loop only pops a non-empty queue), so it should pass the oracle and be recorded by the hand classification as a phantom default.

## What would change the post

- If agents mostly swap hatches (t1 laundering, t2 casts, t3 `as string` in arm B), the post's advice to review an agent's diff for `as unknown as` and `as T` gets a measured basis, and the case for running the type-aware rules gets stronger.
- If arm B produces fewer hatches than arm A in t3, that's direct evidence the rules change agent behavior, not just flag it.
- If agents restructure (t2's single `get()`, t3's loop rewrite), the "cheapest fix" story is wrong for type errors, and the post should say so.

## Harness changes needed

- `prepare-subjects.cjs`: a `SUBJECTS` entry per subject with its setup transform (strip suppressions for t1, delete the `!` for t3) and a check that the subject type-checks before the transform.
- `lib.cjs`: lint with an arbitrary rule set (Oxlint core rules plus ESLint type-aware rules) instead of `lintCognitive`, and a `typeCheck(file)` helper that returns TypeScript diagnostics in Ultracite's `Diagnostic` shape.
- `behavior.ts`: the emitted-JavaScript diff, then the three oracles above.
- `measure.cjs`: call the escape-hatch classifier from `research/corpus/scripts/escape-hatch-census.cjs` on before/after (export its `scanFile`).
- Results under `results/type-escape-hatches/`, with `RESEARCH_TOPIC=type-escape-hatches`.
