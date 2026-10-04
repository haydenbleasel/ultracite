# Plan 003: Split initialization orchestration into focused phases

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise.
>
> **Drift check (run first)**: `git diff --stat 6c7e1497..HEAD -- packages/cli/src/initialize.ts packages/cli/__tests__/initialize.test.ts` If any in-scope file changed since this plan was written, compare the excerpts below against live code; mismatch is a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/002-windows-oxlint-fixture-timeouts.md
- **Category**: tech-debt
- **Planned at**: commit `6c7e1497`, 2026-10-05

## Why this matters

`initialize` sequences many distinct setup concerns, and currently suppresses the complexity warning with a “will fix later” note. That concentration makes changes to prompts, package installation, generated configs, and integrations harder to review independently. Extract phase helpers without changing observable behavior, prompt order, error handling, or project-file write order.

## Current state

- `packages/cli/src/initialize.ts` contains the setup helpers and exported `initialize` function.
- At lines 1009–1010 the function has a complexity suppression and begins `initialize`.
- The function performs flag validation, package-manager resolution, linter selection, framework/editor/agent/hook selection, tool installation, configuration updates, integrations, and final messaging; it ends near line 1424.
- `packages/cli/__tests__/initialize.test.ts` is the existing behavioral test suite for initialization. Extend it rather than creating another test module.

Current anchor:

```ts
// packages/cli/src/initialize.ts:1009-1010
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: "will fix later"
export const initialize = async (flags?: InitializeFlags) => {
  const opts = flags ?? {};
  const quiet = opts.quiet ?? false;
```

Repository conventions: source is TypeScript, lint/format is Oxlint + Oxfmt through `bun run check`, tests use `bun:test` under `packages/cli/__tests__`, and user-visible package behavior changes require a Changesets entry. Keep orchestration in the source module unless moving code is necessary; match existing helper naming and return types in `initialize.ts`. Tests globally mock filesystem/spawn modules, so follow the setup and restoration pattern already used in `initialize.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Focused tests | `bun test packages/cli/__tests__/initialize.test.ts` | Exit 0; all initialization tests pass. |
| Full tests | `bun test` | Exit 0. |
| Lint/format | `bun run check` | Exit 0. |
| Typecheck | `bun run types` | Exit 0, no errors. |

## Scope

**In scope**:

- `packages/cli/src/initialize.ts`
- `packages/cli/__tests__/initialize.test.ts`

**Out of scope**:

- Changing CLI flags, prompt wording/defaults, supported package managers, frameworks, editors, agents, or integrations.
- Changing the order of prompts, installs, config writes, hooks, or integration setup.
- Moving modules across directories or creating a new abstraction framework.
- Preset files and generated files.
- A changeset, unless the implementation unexpectedly changes user-visible behavior; if it does, stop and report before adding one.

## Git workflow

- Work in the isolated branch `fix/stylelint-optional-windows` after plan 001 is complete; this refactor is independent but should share the same final draft PR only if the change remains narrowly scoped.
- Keep changes focused; use a conventional commit such as `refactor: split initialization into phases` if a commit is requested.
- Do not push or open a PR until the operator requests it.

## Steps

### Step 1: Characterize phase boundaries

Read all of `initialize` and `initialize.test.ts`. Mark the existing ordered phases and identify local values that cross phase boundaries. Add or strengthen tests only for behavior not already covered, especially prompt selection defaults, quiet mode, and failure ordering. Do not change production logic in this step.

**Verify**: `bun test packages/cli/__tests__/initialize.test.ts` → exit 0 with characterization tests passing.

### Step 2: Extract small private phase helpers

Extract cohesive private helpers within `initialize.ts`, preserving the current sequence and the same `UltraciteSetupError` and error propagation behavior. Prefer explicit inputs and return values over shared mutable state. Keep `initialize` as the top-level coordinator. Do not suppress complexity on new helpers and remove the old suppression only if the coordinator no longer triggers it.

**Verify**: `bun test packages/cli/__tests__/initialize.test.ts` → exit 0; existing and characterization tests pass.

### Step 3: Verify no behavior drift

Review the diff for reordered prompts, spawns, and writes. Run the full test, lint/format, and type checks. If helper extraction requires a change to generated configs or public behavior, stop and report instead of expanding scope.

**Verify**: `bun test`, `bun run check`, and `bun run types` → each exits 0.

## Test plan

- Use the existing initialization suite in `packages/cli/__tests__/initialize.test.ts` as the structural pattern.
- Ensure the suite covers the relevant branches that already exist: explicit and detected package manager, quiet/noninteractive linter choice, preservation of existing linter, selection options, install/configuration sequencing, and setup error behavior. Add tests only for uncovered phase-boundary behavior.
- Run the focused test after each extraction and the full suite at the end.

## Done criteria

- [ ] `initialize` remains the ordered coordinator; phase helpers have focused responsibilities and explicit inputs/outputs.
- [ ] No prompt/default, install, project-file write, integration, or error behavior changes.
- [ ] `bun test packages/cli/__tests__/initialize.test.ts`, `bun test`, `bun run check`, and `bun run types` exit 0.
- [ ] Complexity suppression removed if it is no longer needed; no new blanket suppression added.
- [ ] Only files in the scope list changed.

## STOP conditions

- The current function or tests differ substantially from the excerpts or phase descriptions.
- Preserving behavior requires changing public flags, prompts, generated config formats, or ordering semantics.
- The extraction requires touching files outside the scope list.
- Any verification still fails after one focused diagnosis and correction.

## Maintenance notes

- Future `init` options should be added to the smallest relevant phase and passed through explicit helper inputs.
- Reviewers should compare the original and new ordering of external commands and project-file writes; this is the main regression risk.
- Keep follow-up decomposition limited to evidence-backed complexity; do not split into one helper per statement.
