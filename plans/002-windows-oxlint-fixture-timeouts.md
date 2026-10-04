# Plan 002: Give slow Oxlint fixture tests a Windows timeout budget

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise.
>
> **Drift check (run first)**: `git diff --stat 6c7e1497..HEAD -- packages/cli/__tests__/oxlint-config.test.ts` If the in-scope test file changed since this plan was written, compare the current test bodies before proceeding; a mismatch is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `6c7e1497`, 2026-10-05

## Why this matters

Three integration tests in `oxlint-config.test.ts` run the Oxlint binary over committed fixtures with the bridged JavaScript plugins enabled. On Windows, those subprocesses can take longer than Bun's default five-second test timeout. Bun then kills the subprocess, leaving empty output and producing misleading rule-assertion failures. Give only these subprocess tests a larger timeout so they still verify the same plugin and filename rules without slowing unrelated tests.

## Current state

- `packages/cli/__tests__/oxlint-config.test.ts` defines `lintFixture` at lines 40–64; it synchronously runs Oxlint against fixture entry configs and captures output.
- Three tests call that helper for JavaScript plugin / filename behavior: plugin loading around line 565, route filenames around line 591, and Astro route filenames around line 651.
- Before the fix, those tests used `test(name, fn)` and inherited Bun's default timeout. Under Windows full-suite execution, each timed out at 5000 ms, and the route tests then observed empty diagnostics.
- The rule assertions are the regression contract. Keep their expected diagnostics and failure assertions unchanged.

Target shape:

```ts
test(
  "route override exempts route files but not other files",
  () => {
    const { flaggedBy } = lintFixture("route-filenames");
    // Existing diagnostic assertions remain unchanged.
  },
  { timeout: 60_000 }
);
```

Follow repository conventions: use `bun:test`, colocate tests in `packages/cli/__tests__`, and retain the existing fixture assertions. A per-test timeout is preferable to raising the global timeout in `bunfig.toml`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Focused file | `bun test packages/cli/__tests__/oxlint-config.test.ts` | Exit 0; all tests in the file pass. |
| Full tests | `bun test` | Exit 0; all tests pass, including the three subprocess fixtures. |
| Lint/format | `bun run check` | Exit 0. |

## Scope

**In scope**:

- `packages/cli/__tests__/oxlint-config.test.ts`

**Out of scope**:

- Changing Oxlint presets, rules, plugin dependencies, or fixture source files.
- Weakening assertions, skipping tests, or globally raising Bun's timeout.
- Changing the `lintFixture` spawn implementation unless the timeout fix fails to address the diagnosis.

## Git workflow

- Work in the isolated feature worktree/branch selected by the operator.
- Keep changes limited to the single test file; use a conventional commit such as `test: allow longer Windows Oxlint fixture runs` if requested.
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Confirm the timeout diagnosis

Run each affected test independently with a larger timeout and inspect that the expected Oxlint diagnostics appear. Confirm the default run is killing the subprocess at the five-second boundary rather than returning a genuine config or rule error.

**Verify**: `bun test packages/cli/__tests__/oxlint-config.test.ts` → the unmodified assertion behavior is understood; the three failures reproduce only at the default timeout.

### Step 2: Set per-test timeout budgets

Use Bun's per-test options form with `{ timeout: 60_000 }` for only the three tests that launch the expensive Oxlint JS-plugin fixtures. Preserve all existing assertions verbatim.

**Verify**: `bun test packages/cli/__tests__/oxlint-config.test.ts` → exit 0; all existing assertions pass.

### Step 3: Check suite behavior

Run the full suite and lint/format check. Do not change config expectations or suppress failures if the fixture tests fail after they have enough time to complete.

**Verify**: `bun test` and `bun run check` → both exit 0.

## Test plan

- Keep the existing assertions in the three tests: JS plugin registration, route filename exception behavior, and page-route filename exceptions.
- Run the entire `oxlint-config.test.ts` file and full `bun test` suite to prove the local timeout change does not mask genuine failures.

## Done criteria

- [ ] Only the three subprocess-backed tests receive a 60-second timeout.
- [ ] Every original expected diagnostic assertion remains unchanged.
- [ ] `bun test packages/cli/__tests__/oxlint-config.test.ts`, `bun test`, and `bun run check` exit 0.
- [ ] Only `packages/cli/__tests__/oxlint-config.test.ts` is modified for this plan.

## STOP conditions

- The failing tests return incorrect diagnostics when run with a larger timeout.
- Fixing the tests requires changing preset rules, weakening assertions, modifying fixture content, or raising the global test timeout.
- The current test file differs from the described calls or assertion contract.

## Maintenance notes

- If the Oxlint fixture workload grows, revisit these per-test budgets rather than increasing the timeout for the entire suite.
- Preserve all fixture assertions; the timeout only allows the intended integration checks to finish on slower Windows runners.
