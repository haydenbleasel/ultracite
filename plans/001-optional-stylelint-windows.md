# Plan 001: Handle missing optional Stylelint on Windows

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise.
>
> **Drift check (run first)**: `git diff --stat 6c7e1497..HEAD -- packages/cli/src/spawn-sync.ts packages/cli/src/commands/check.ts packages/cli/src/commands/fix.ts packages/cli/src/run-command.ts packages/cli/__tests__/spawn-sync.test.ts packages/cli/__tests__/check.test.ts packages/cli/__tests__/fix.test.ts .changeset` If any in-scope file changed since this plan was written, compare the excerpts below against live code; mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `6c7e1497`, 2026-10-05

## Why this matters

Stylelint is optional in Ultracite's ESLint toolchain, and `check`/`fix` are meant to warn and skip CSS linting when it is not installed. On Windows, the real spawn wrapper can report a missing command as a nonzero exit status instead of `ENOENT`; the current callers then treat that absence as a lint failure. Preserve genuine Stylelint failures while making the optional-tool behavior consistent across platforms.

## Current state

- `packages/cli/src/spawn-sync.ts` wraps `execaSync` and adapts its result into `SpawnSyncResult`.
- `packages/cli/src/commands/check.ts` runs Stylelint at lines 70–89 and treats only `errorCode === "ENOENT"` as the optional/missing case.
- `packages/cli/src/commands/fix.ts` has the same handling at lines 88–107.
- `packages/cli/src/run-command.ts:7-10` documents the intended behavior: Stylelint is optional and CSS files are skipped with a warning if it is missing.
- `packages/cli/__tests__/spawn-sync.test.ts:28-50` records the platform difference: on Windows an unknown command may produce a nonzero status and no `errorCode`; on POSIX it produces `ENOENT`.
- `packages/cli/__tests__/check.test.ts:224-241` currently verifies only the POSIX-shaped `ENOENT` case. Add equivalent coverage for `fix.test.ts`.

Relevant implementation shape:

```ts
// packages/cli/src/commands/check.ts
if (result.errorCode === "ENOENT") {
  log.warn(STYLELINT_MISSING_MESSAGE);
  return;
}
exitOnCommandFailure("Stylelint", result);
```

Follow existing conventions: spawn processes via `spawnSync`, use `exitOnCommandFailure` for real failures, and put tests in `packages/cli/__tests__`. Tests use `bun:test`, mock `../src/spawn-sync`, and the Windows behavior is explicitly exercised by the existing `spawn-sync.test.ts` platform branches. Do not parse user-facing console output from a child process if the spawn result does not expose it; prefer a reliable executable-resolution signal.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Focused tests | `bun test packages/cli/__tests__/spawn-sync.test.ts packages/cli/__tests__/check.test.ts packages/cli/__tests__/fix.test.ts` | Exit 0; all tests pass on the host platform. |
| Full tests | `bun test` | Exit 0. |
| Lint/format | `bun run check` | Exit 0. |
| Typecheck | `bun run types` | Exit 0, no errors. |

## Scope

**In scope**:

- `packages/cli/src/spawn-sync.ts`
- `packages/cli/src/commands/check.ts`
- `packages/cli/src/commands/fix.ts`
- `packages/cli/__tests__/spawn-sync.test.ts`
- `packages/cli/__tests__/check.test.ts`
- `packages/cli/__tests__/fix.test.ts`
- One patch changeset under `.changeset/`

**Out of scope**:

- Changing the documented optional status of Stylelint or making Stylelint required.
- Treating arbitrary nonzero Stylelint exits as “not installed.”
- Changing behavior for Biome, ESLint, Prettier, Oxlint, or Oxfmt.
- Changes to unrelated config generation or preset rules.

## Git workflow

- Work in the isolated branch `fix/stylelint-optional-windows` based on `main`.
- Keep changes focused; use a conventional commit such as `fix: skip missing optional Stylelint on Windows` if a commit is requested.
- Do not push or open a PR until the operator requests it.

## Steps

### Step 1: Determine a reliable missing-command signal

Inspect the installed `execa` behavior and the current `SpawnSyncResult` shape on Windows. Choose a signal that distinguishes “executable absent” from “Stylelint executed and returned a lint error.” If the distinction cannot be made without a broader spawn API change, stop and report the options rather than guessing from arbitrary nonzero status or localized console text.

**Verify**: `bun test packages/cli/__tests__/spawn-sync.test.ts` → exit 0; the existing POSIX and Windows expectations remain valid.

### Step 2: Fix the optional Stylelint handling

Implement the narrowest reliable change. It may extend `SpawnSyncResult` with a Windows command-not-found indicator or provide a focused helper, but must not classify a genuine Stylelint nonzero exit as missing. Apply the same optional-case logic in both `check.ts` and `fix.ts` and retain the existing warning message.

**Verify**: `bun test packages/cli/__tests__/check.test.ts packages/cli/__tests__/fix.test.ts` → exit 0; missing Stylelint warns/skips, while a present Stylelint returning nonzero still fails.

### Step 3: Add regression coverage and changeset

Add tests for the Windows-shaped missing-command result to both `check` and `fix`, plus a real nonzero-exit regression case if not already present. Keep mocks structurally consistent with nearby tests. Add a `.changeset/*.md` patch entry for `ultracite` describing that `check` and `fix` now skip absent optional Stylelint consistently on Windows.

**Verify**: focused tests and `bun run check` → exit 0; inspect the changeset to confirm it is patch-level and names `ultracite`.

## Test plan

- Extend `packages/cli/__tests__/check.test.ts` missing-Stylelint coverage to represent both POSIX `ENOENT` and the Windows-shaped missing-command result.
- Add matching coverage in `packages/cli/__tests__/fix.test.ts`.
- Assert a genuine nonzero Stylelint status still propagates as a failure.
- Use the mocked `spawnSync` pattern from `check.test.ts:224-241`; use existing `fix.test.ts` setup patterns for the fix command.
- Verify with the focused command above, then `bun test`, `bun run check`, and `bun run types`.

## Done criteria

- [ ] Missing optional Stylelint warns and is skipped from both `check` and `fix` on POSIX and Windows-shaped spawn results.
- [ ] A genuine Stylelint nonzero exit remains a failure.
- [ ] Focused tests, `bun test`, `bun run check`, and `bun run types` exit 0.
- [ ] A patch changeset for `ultracite` exists.
- [ ] Only files in the scope list changed.

## STOP conditions

- The checked-out spawn result or command-not-found behavior differs from the documented test and code excerpts.
- Missing-command detection cannot distinguish absence from a genuine tool failure without guessing at localized stderr.
- The change requires a broad redesign of all linter invocations or an out-of-scope public API change.
- Any verification still fails after one focused diagnosis and correction.

## Maintenance notes

- Keep `check` and `fix` behavior aligned if optional tools are added later.
- Review the Windows test path carefully: it must prove missing executable handling without masking Stylelint's ordinary lint exit codes.
- The spawn wrapper is shared by the CLI; keep any new result field narrowly defined and test its cross-platform mapping.
