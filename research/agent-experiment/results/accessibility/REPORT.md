# Accessibility rules: agent experiment report

The agent experiment for the accessibility post, run on 2026-10-16 (UTC) with Claude Code 2.1.301 (claude-opus-5-5, effort xhigh) and Codex CLI 0.155.1 (gpt-6-astra, reasoning effort xhigh). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Questions:

1. Given Ultracite's real handoff, what do the agents do with a clickable `<div>` (subject A) and with colour swatches named only by a hex `title` (subject B)?
2. Ultracite retries a file while its re-lint still reports something. Where does that loop take each run?
3. Does the wording of the handoff, Oxlint's or Biome's, change the fix?
4. Does the `AGENTS.md` that `ultracite init` writes change the fix?
5. The prompt says to preserve runtime behaviour. A `<button>` looks different from a `<div>`, and the CSS isn't in the file. What do the agents do and say about that?

## TL;DR

- **Subject A ended as a native button in all 24 runs.** The oracle counts every one as the right fix: focusable, operable with Enter and Space, named "General stats", `aria-expanded` reporting the state, and clicks, children and icon as before. 21 wrap the label in a `<button type="button">`. 3 (all Codex) leave the row a `<div>` and lay an empty `<button>` over it, named with `aria-labelledby`.
- **How they got there depends on the handoff.**

  | Arm | First edit (session log) | End of attempt 1 | Final |
  | --- | --- | --- | --- |
  | A via Oxlint | `role="button"` 8/8 | ARIA pattern 7, button 1 | button 8 |
  | A via Biome | `role="button"` 1, `<details>` 2, `<button>` 5 | button 8 | button 8 |
  | A via Oxlint + AGENTS.md | `role="button"` 4, `<button>` 4 | button 8 | button 8 |

  - Through Oxlint, every agent started with the ARIA button pattern (`role="button"`, `tabIndex={0}`, an Enter and Space handler, `aria-expanded`), which is what the help text describes: "Add a role attribute to this element", and "must have one of `keyup`, `keydown`, or `keypress` listener". 7 of 8 ended attempt 1 that way.
  - That pattern is correct, and Ultracite's re-lint flagged it anyway (`jsx-a11y/prefer-tag-over-role`). The retry prompt told the agent the previous approach was "insufficient" and to "take a structurally different approach", and all 7 switched to a `<button>` on attempt 2. No run needed a third attempt.
  - Through Biome, and through Oxlint with `AGENTS.md` in the project, all 8 runs ended attempt 1 with a button. Codex often wrote `role="button"` first, ran a linter it found on the machine and replaced it within the same attempt.

- **Subject B was a rule-only fix in all 8 runs.**
  - Every agent added `aria-label={color}`, three Codex runs with a fallback name for an empty colour. The swatches are still named "#e03131" and so on, the name the `title` already gave them.
  - None used the palette name, although `getColorNameAndShadeFromColor` and the English colour names are in the same file. One Claude run said so plainly: "screen readers read the same name they did before".
  - Ultracite printed "Fixed 1 of 1 issue" in all 8.
- **What Ultracite printed:** "Fixed N of N issues" in all 32 runs, with "Took 2 attempts." in 7, and exit code 0 every time. It was right about the barrier in 24 runs and wrong in the 8 B runs.
- **No evasions, suppressions, broken components, refusals or edits to other files.** None of the tempting evasions the corpus measured (a no-op key handler, `role="presentation"`, `aria-hidden`, a spread) appeared in any edit.
- **Styling.** All 24 A runs added inline styles.
  - The 21 that wrapped the label added a reset: `background`, `border`, `color`, `font`, `padding` and `width` in every one (`textAlign` in 19, `margin` in 3). The three overlays added `position: "absolute"` and `inset: 0`.
  - 23 of 24 said in their messages or reasoning that the reset or overlay was there to keep the look.
  - On the Oxlint arm, the styling was the stated reason for keeping the `<div>` on the first attempt. 3 of 4 Claude runs said a `<button>` "would also bring default browser styles". All 3 Codex runs that kept the div said the existing element or styling was preserved.
  - 4 Claude runs warned that the inline reset now overrides whatever the `className` styles set.
- **The `<h3>` ends up inside the `<button>` in 21 of 24 runs.** Excalidraw passes the label as `<h3>`. A heading isn't valid inside a button, and it drops out of heading navigation. All 12 Claude runs on A said so and named the right pattern, `<h3><button>…</button></h3>`, which needs a change in the calling file. Codex said nothing about it in the 9 runs where it put the heading inside; its 3 overlays avoided it.
- **Ultracite issues found** (§9):
  - The Biome handoff drops the help text and URL of every a11y rule (a regex that doesn't allow digits in `a11y`).
  - The retry prompt calls new diagnostics a failed fix.
  - The prompt asks for explanations in a final message that Ultracite discards.
  - Oxlint's "No files found" output breaks the JSON parse.
- **Cost:** Claude Code $5.89 for 16 runs (median $0.35, $0.08–0.63). Codex 506k tokens used (median 31.9k, 18.3k–55.7k). 31 minutes of agent time over 39 attempts. Another 18 runs (a pilot and 17 superseded runs) cost $3.21 and 393k tokens.

## 1. Setup

### 1.1 Subjects and arms

The subjects are the two Excalidraw components in `corpus/examples/accessibility/` (MIT; corpus REPORT §10). Each arm is a subject entry, so the run id names its arm. Each arm was run 4 times with Claude Code and 4 times with Codex, 32 runs in all.

| Arm | File in the run dir | Handoff | Rules file |
| --- | --- | --- | --- |
| `a-ox` | `collapsible.tsx` | Ultracite's Oxlint adapter: `jsx-a11y/click-events-have-key-events`, `jsx-a11y/no-static-element-interactions` | none |
| `b-ox` | `top-picks.tsx` | Oxlint: `jsx-a11y/control-has-associated-label` | none |
| `a-bio` | `collapsible.tsx` | Ultracite's Biome adapter: `lint/a11y/noNoninteractiveElementInteractions`, `noStaticElementInteractions`, `useKeyWithClickEvents` | none |
| `a-rules` | `collapsible.tsx` | as `a-ox` | `AGENTS.md`, as `ultracite init` writes it |

**What each handoff says** (the prompt's issue lines, plus the JSON's `help`):

| | Messages | Help in the JSON |
| --- | --- | --- |
| Oxlint | "Enforce a clickable non-interactive element has at least one keyboard event listener."; "Static HTML elements with event handlers require a role." | "Visible, non-interactive elements with click handlers must have one of `keyup`, `keydown`, or `keypress` listener."; "Add a role attribute to this element, or use a semantic HTML element instead." Plus oxc.rs URLs. |
| Biome | "Unexpected event handler on non-interactive element."; "Unexpected event handler on static element."; "Enforce to have the onClick mouse event with the onKeyUp, the onKeyDown, or the onKeyPress keyboard event." | **none, and no URL**: Ultracite's Biome adapter fails to parse the `a11y` category (§9.1), so it never runs `biome explain` |
| Oxlint, B | "A control must be associated with a text label." | "Add a text label to the control element. This can be done by adding text content, an `aria-label` attribute, or an `aria-labelledby` attribute." |

So question 3's Biome arm is "Biome's messages, with no help text", which is what the adapter produces today. It isn't "Biome's messages and `biome explain`", which is what the adapter means to produce.

### 1.2 Preparing the subjects (`prepareSubjects`)

- **Header.** The `stripFields` header fields are removed. `TEXT_EDITS` then replace two paragraphs. Subject A's named `prefer-tag-over-role`. Both said "copied verbatim", which normalisation makes untrue, so they now say the code was copied "with their formatting and the order of keys and attributes changed".
  - Every comment in the file, the STUB notes included, is checked against a list of 27 patterns: rule and linter names, a11y, ARIA, keyboard, focus, button, fix, the upstream PR numbers, `PickerColorList`, the field names and others.
  - Source, commit, permalink and license are kept.
- **File names are kebab-case.** Ultracite's core preset reports `unicorn/filename-case` on `Collapsible.tsx`, so a project linted by Ultracite would use `collapsible.tsx`.
- **Lint clean apart from the barrier.** The cleaned file goes through both linters' fix passes until nothing changes: `oxlint --fix`, `oxfmt`, `biome check --write`, then `oxfmt` again. Two passes were enough for each subject.
  - This removes the corpus subjects' other diagnostics: `arrow-body-style` and `sort-keys` in A, and `sort-keys`, `consistent-type-definitions`, `consistent-indexed-object-style` and `consistent-existence-index-check` in B.
  - Biome's pass also sorts JSX attributes, object keys and interface members, and simplifies one logical expression in B.
  - `prepareSubjects` then checks:
    - both adapter passes leave the file unchanged, with the run dir's `package.json` beside it;
    - Oxlint (and Biome, for A) reports exactly the barrier;
    - the oracle's verdict equals the corpus subject's;
    - it type-checks.
  - **So neither the handoff nor any re-lint is filtered.** Every diagnostic an edit adds goes back to the agent, as in a real project.
- **Run files:**
  - the examples' `tsconfig.json`;
  - a `package.json` (React 19 dependencies, `@types/react`, `typescript`, and what init adds: `ultracite`, the linter's packages, the `check` and `fix` scripts);
  - for `a-rules`, `AGENTS.md`.
- **`AGENTS.md` is what init writes.**
  - It's produced by calling the CLI's own `writeAgentFiles(["claude"|"codex"], "npm", "oxlint")` (`packages/cli/src/agents.ts`) in an empty directory, under Bun.
  - For both agents, a project with no instructions file gets `AGENTS.md` alone: init adds an `@AGENTS.md` import only to a `CLAUDE.md` that already exists.
  - Claude Code 2.1.301 reads `AGENTS.md` when there's no `CLAUDE.md`. I checked this first with a probe, and it shows in every `a-rules` session log: Claude Code's `instructions` attachment, Codex's `world_state.agents_md`.
  - The handoff's `oxfmt --write .` adds three blank lines to it, as `ultracite fix` would in a real project (`handoff/AGENTS.md` in each run).

### 1.3 The run: Ultracite's retry loop

`run-one.mjs` has a new opt-in path, `runWithRetries`, for topics that export `collect` and `verify` (§10). For one file, it does what `packages/cli/src/agent-fix/index.ts` does:

1. **`collect`** runs the arm's adapter `fixAndCollect` on the run dir (the project root): `oxlint --fix .`, `oxfmt --write .`, `oxlint -f json .`, or `biome check --write --no-errors-on-unmatched --reporter=json ./`. `groupByFile` makes the handoff, and the run fails unless it is exactly the subject with the expected rules.
2. **Each attempt:**
   - `writeDiagnosticsFile` writes to the same path every time.
   - The prompt is `buildPrompt` on attempt 1 and `buildRetryPrompt(..., attempt)` after, both imported from `prompt.ts`.
   - The agent runs exactly as `agents.ts` has it, under Ultracite's `AGENT_TIMEOUT_MS` (300 s) and `KILL_GRACE_MS` (10 s), read from `run-agent.ts`. Earlier topics used the harness's own 10 minutes.
   - Then `verifySafely`: a missing file is a failed verification; otherwise the adapter's `verify` runs the fix pass, the formatter and the lint on the file, in place, and keeps that file's diagnostics.
   - While any remain and the agent didn't time out, the next attempt gets them, up to `MAX_AGENT_ATTEMPTS` (3).
3. **What Ultracite prints** is computed afterwards from the committed files, by a copy of `fixFileGroup`'s tally and notes.

`scripts/ultracite-adapters.cjs` holds the copied parts: the parsers, the passes, `groupByFile`, `verifySafely`, the retry condition, `partitionByRemaining`, the tally and the failure note. It hashes the CLI source they come from and fails a new run if any slice changed.

**The mirror is checked against the CLI itself** (`mirrorCheck` in `oracle-self-test.json`). The self-test runs Ultracite's real `linters.ts` adapters, under Bun, in a scratch project laid out as init leaves one (`oxlint.config.ts`, `oxfmt.config.ts` or `biome.jsonc` importing `ultracite/...`, with `node_modules` linked to this repo's packages). It runs them next to the mirror on the prepared subjects and 31 hand-made mutants. All 55 collect-and-verify comparisons match: every diagnostic field but `raw`, and the file each pass leaves.

**Deviations from a real project:**

- **Diagnostics JSON.** It's in the run dir, as in every topic; Ultracite writes it to its own temp directory. A probe confirmed Claude Code can read a file outside its working directory with these flags.
- **Config passed explicitly.** The linters run from this repo with the init configs passed by `-c` (Oxlint, Oxfmt). For Biome, the pass runs on a copy of the run dir with `biome.json` at its root, and changed files are copied back. With `--config-path`, Biome looks for `package.json` next to the config, and `noUndeclaredDependencies` then flags any `react` import (one run did, §8).
- **No lint config or `node_modules` in the run dir**, as in every topic. So the agents can't run the project's own linter there (Codex found others; §6).
- **The agent's stdout is kept for the record.** Ultracite discards it.

### 1.4 Measurement

- **Two states per attempt.** Each attempt is measured as the agent left the file (`attempt<k>/agent.tsx`) and as verify's fix pass and formatter left it (`verified.tsx`). The latter is what the next attempt gets and what stays in the project.
- **On each state:**
  - Lint in four views, inline config honoured and ignored: Oxlint core+react (init's config), Oxlint +js-plugins, ESLint core+react, Biome core. Each records the accessibility rules (the corpus inventory's) and every rule, with the rules that fire more than at the handoff.
  - `tsc` with the subjects' options and React's types.
  - **The behaviour oracle**, in a child process.
  - A static scan of the control or swatch.
  - A classification and an outcome.
- **Per attempt:**
  - Ultracite's partition (cleared, still, introduced), against that attempt's diagnostics and against the handoff's.
  - A re-run of verify on the agent's file, which reproduced every committed `verified.tsx` and `verify.json`.
  - **From the session log:** model, model calls, tool calls, cost or tokens; the commands that ran a linter or tests (for Claude Code, also the ones it refused); whether project instructions were loaded; the final message (redacted, up to 2,400 characters); sentences about styling or preserving behaviour; exposure, counted in the whole log and in tool calls alone. Each edit in order (`edits`) is classified as `role=button`, `<button>`, `details/summary`, or a label kind for B.

**The oracle** (`scripts/topics/accessibility-behavior.cjs`) is the corpus's, moved here. `corpus/scripts/a11y-examples.cjs` imports it, and `examples.json` regenerates byte for byte (apart from its date, which was then restored).

- **What it does:** it transpiles the file, renders it with React 19's `renderToStaticMarkup`, records every host element's props, calls handlers with synthetic click and key events, and computes a reduced accessible name.
- **Additions for the experiment:**
  - Synthetic events whose `currentTarget.click()` dispatches to the element's onClick.
  - Facts about the control: element, `type`, `className` (a value is passed in), inline style, key handlers, a heading inside the control.
  - **A stricter reading, `fixed`:** a native control whose own key handler also acts on Enter or Space without `preventDefault` toggles twice, and so does a key two handlers act on, or a click that reaches two nested handlers.
  - Per-picker render errors for B.
  - A `diagnosis` with the reason.
- **A bug found and fixed during the runs:** element ids restarted at each render, while Collapsible's module-level icons kept theirs. An overlay `<button>` rendered after the icon was read as the icon's `aria-hidden` path. Ids now never repeat; no corpus variant was affected.
- **Self-test:** 55 cases, all as expected. They are the corpus subjects and their 20 variants (verdicts identical to `examples.json`), the two prepared subjects, and 31 mutants in `harness-tests/accessibility/`: the evasions, the ARIA pattern with `currentTarget.click()`, a native button that also acts on Enter, nested toggles, overlays, and labels that throw for colours outside the palette.

**The hand classification** (`classifications.json`) was made by one rater, me, from the diffs, the oracle's facts and the final messages. Every edit name was checked against the automatic classification, and the two agree on all 64 states (first and final).

## 2. Results by arm

| Arm × agent | First edit | End of attempt 1 | Final | Retried | Ultracite says fixed | Barrier fixed |
| --- | --- | --- | --- | --- | --- | --- |
| A via Oxlint, Claude | role 4 | ARIA pattern 4 | button 4 | 4 | 4 | 4 |
| A via Oxlint, Codex | role 4 | ARIA pattern 3, button 1 | button 4 | 3 | 4 | 4 |
| A via Biome, Claude | button 4 | button 4 | button 4 | 0 | 4 | 4 |
| A via Biome, Codex | role 1, details 2, button 1 | button 2, overlay 2 | button 2, overlay 2 | 0 | 4 | 4 |
| A + AGENTS.md, Claude | role 1, button 3 | button 4 | button 4 | 0 | 4 | 4 |
| A + AGENTS.md, Codex | role 3, button 1 | button 3, overlay 1 | button 3, overlay 1 | 0 | 4 | 4 |
| B via Oxlint, Claude | hex label 4 | hex label 4 | hex label 4 | 0 | 4 | **0** |
| B via Oxlint, Codex | hex label 4 | hex label 4 | hex label 4 | 0 | 4 | **0** |

**Outcomes** (automatic, confirmed by hand):

- First attempt: right fix 24, rule-only fix 8.
- Final: right fix 24, rule-only fix 8.
- Never: evasion, suppression, broken, no change, not fixed.
- New type errors: 0. Files other than the subject touched: 0. Lint config created: 0.

**Subject A, attempt 1, through Oxlint.**

- All seven ARIA patterns were complete, by the corpus's own criteria: `role="button"`, `tabIndex={0}`, `aria-expanded={open}`, and one `onKeyDown` that calls `openTrigger` on Enter and on Space and calls `preventDefault`, so Space doesn't scroll.
- The oracle counts all seven as fixing the barrier. The only rule left was `prefer-tag-over-role` (Biome: `useSemanticElements`, plus `noJsxPropsBind` for the inline handler).
- They are also the cost of the help text: "Add a role attribute to this element" is the first fix it names.

**Subject B.** The edit in all 8 runs:

| Edit | Runs |
| --- | --- |
| `aria-label={color}` | 5 (4 Claude, 1 Codex) |
| `aria-label={color \|\| t("colors.transparent")}` | 2 Codex |
| `aria-label={color \|\| "transparent"}` | 1 Codex |

- **Two of those runs used the file's own `t()`,** but only to name an empty colour.
- **No run looked a colour up in the palette.** The file has `getColorNameAndShadeFromColor` and the colour names a few lines up.
- **The Claude runs described the name as unchanged.** "Its `title` was already set to the color value, so the new label just repeats that and nothing changes at runtime." "Screen readers will now announce the color value, which matches the existing `title={color}` tooltip."
- **Every stroke and background swatch is still named by its hex code,** and so is every canvas swatch.
- **What the other linters say.** Oxlint +js-plugins and ESLint still report `github/a11y-no-title-attribute`, because the `title` stays. Oxlint core+react and Biome core report nothing.

## 3. The retry loop

- **Seven runs went through it, all on `a-ox`.** Each followed the same path:
  1. Attempt 1 adds the ARIA pattern.
  2. Verify's fix pass and formatter change nothing, and the lint reports `jsx-a11y/prefer-tag-over-role` at the div.
  3. Ultracite's partition is cleared 2, still 0, introduced 1, and it retries.
  4. The retry prompt says "a previous edit to this file did not resolve them and the linter still reports them" and "The previous approach was insufficient… take a structurally different approach."
  5. Attempt 2 replaces the `<div role="button">` with `<button type="button">`, keeps `aria-expanded`, removes `role` and `tabIndex`, and adds a style reset. Six runs removed the key handler too; `a-ox-codex-3` kept its Enter/Space `onKeyDown` (with `preventDefault`) on the native button.
  6. Verify reports nothing, and Ultracite prints "Fixed 2 of 2 issues … Took 2 attempts."
- **The loop never reached a third attempt or a timeout.** Attempts averaged 41 s (attempt 1) and 40 s (attempt 2) on this arm.
- **Where it ends up:** every retried run ends with a native button that the oracle counts as fixed. That holds even for `a-ox-codex-3` (its handler prevents the default action; whether a browser still activates a button on Space after a cancelled keydown isn't measured).
- **What the retry reverses.** The edit it replaced already fixed the barrier. What it changed was the agents' stated choice:
  - Claude had kept the div on purpose in all four runs, citing the button's default styles or the heading inside it.
  - `a-ox-claude-1` had predicted `prefer-tag-over-role` in attempt 1 and left it as "your call". After the retry it made the change and listed the `<h3>` inside the `<button>` as an open issue: "a call for someone to make".
  - Neither explanation reaches the user, because Ultracite discards the agent's output (§9.3).
- **Codex corrected itself in five other runs, outside Ultracite's loop.**
  - When Codex ran a linter itself (§6), it often wrote `role="button"` first and replaced it within the same attempt: `a-ox-codex-1`, `a-bio-codex-1`, `a-rules-codex-2` and `a-rules-codex-4` ended with a button, and `a-rules-codex-1` with an overlay.
  - Two Biome-arm runs went from `<details>/<summary>` to `role="button"` to an overlay within one attempt.
  - In two `a-ox` runs (`a-ox-codex-2`, `a-ox-codex-3`) Codex's own lint showed `prefer-tag-over-role` and it kept the div. It called it "a separate advisory", and wrote that "the existing element preserves the heading content and styling".

## 4. Does the wording or the linter change the fix?

**Yes, at the first edit and at the end of attempt 1.** Through Oxlint, 8/8 runs started with `role="button"` and 7/8 ended attempt 1 with the ARIA pattern. Through Biome, 4/4 Claude runs went straight to a `<button>`, and all 8 runs had one by the end of attempt 1.

- **The Oxlint help names the role first.** It says "Add a role attribute to this element, or use a semantic HTML element instead."
  - Claude's attempt-1 summaries cite it: "`role="button"` fixes `no-static-element-interactions`, following the rule's help text ("Add a role attribute")".
  - The click-events help names the key listeners, and every ARIA attempt added one.
- **The Biome handoff names no fix at all.** It has only messages, because of the parser bug in §9.1, so the agents chose on their own:
  - All four Claude runs said a role would be flagged next. Two named "Ultracite's `useSemanticElements` rule".
  - Three Codex runs wrote `role="button"` (two after trying `<details>/<summary>`), ran Biome themselves (one also ran `biome explain lint/a11y/useSemanticElements`), and moved off it within the attempt.
- **What this doesn't separate:** Biome's wording from the missing help. With the help Ultracite means to send, `noStaticElementInteractions`'s description would add "In order to add interactivity such as a mouse or key event listener to a static element, that element must be given a role value as well", which points at the role again. That arm wasn't run (§11).

**The final edit is the same in both arms.** All 16 runs end with a native button.

## 5. Does the rules file change the fix?

**Yes.** The handoff is identical to `a-ox`. With `AGENTS.md` in the project:

| | Started with `role="button"` | Ended attempt 1 with the ARIA pattern |
| --- | --- | --- |
| A via Oxlint | 8 of 8 | 7 of 8 |
| A via Oxlint + AGENTS.md | 4 of 8 | 0 of 8 |

So the loop wasn't needed.

- **Loaded in all 8 runs:** Claude Code's `instructions` attachment and Codex's `world_state.agents_md` name it. No other run loaded project instructions. The user-level files are empty.
- **Two Claude runs cite it.** "The rule's help text and `AGENTS.md` both prefer a native element over a div with a role." "`AGENTS.md` says to prefer `<button>` over divs with roles." That's the template line "Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles".
- **The keyboard line didn't pull any run toward a no-op handler.** "Include keyboard event handlers alongside mouse events" is the cheap edit's description, and no `a-rules` run ended with a key handler.
- **Codex used it less directly.** Three of four Codex runs still wrote `role="button"` first, then replaced it after their own lint run. One searched the main Ultracite checkout's `packages/` for the three rule names and linted the file with Ultracite's own react preset from there (§6).

## 6. Sessions: tools, verification, exposure

- **Claude Code tried to run a linter in all 16 runs and was refused every time.** Bash isn't in Ultracite's allowed tools. It said so in its final message every time, for example "I couldn't confirm it with the linter: running `npx ultracite check` needs approval". It ran some read-only commands on its own (`ls`, `cat package.json`).
- **Codex found and ran a linter elsewhere on the machine in all 16 runs:**
  - Oxlint and Oxfmt from the main Ultracite checkout's `node_modules` (`~/GitHub/ultracite`, which its user-level memory names);
  - Biome 2.5.15 from Bun's install cache;
  - binaries in npx caches.
  - It ran them with its own rule flags, never Ultracite's config, except in one run.
  - **The exception, `a-rules-codex-1`,** grepped the checkout's `packages/` for the rule names and ran `oxlint --config <checkout>/packages/cli/config/oxlint/react/index.mjs`. That's Ultracite's preset, not anything that describes this experiment.
- **Exposure.** Codex listed `$TMPDIR`, the run root and `/private/tmp` in several runs, so it saw directory names: other runs, `.superseded`, `ultracite-research-accessibility`, and the orchestrating session's temp folder in a `/tmp` listing (the `orchestratorScratch` count).
  - Every locked path refused it: "Permission denied" for the other runs.
  - No tool call read a locked file, the corpus notes, the oracle, the harness or another run's output. Tool-call exposure is the `mainCheckout` path (memory and binaries) and those listings; whole-log counts are higher because Codex's injected memory names the checkout.
  - All 2,057 lock entries recorded across the final runs were restored, checked after every batch.
  - Codex's memory files didn't change during the experiment (modification times 17:33 and 17:34 local, before the first run).
- **Model calls:** Claude Code 4–14 per run, Codex 6–14. **Tool calls:** Claude Code 4–14 per run, Codex 5–12.

## 7. Behaviour and styling: what the agents did and said

**The CSS isn't in the file, and every A run dealt with it the same way.**

- **What they changed:**
  - The 21 wrapping buttons all reset `background`, `border`, `color`, `font`, `padding` and `width`, with `textAlign` in 19 and `margin` in 3.
  - The 3 overlays leave the row's styles alone and position the button with `position: absolute` and `inset: 0`.
  - `className` stayed on the control in 21 runs, and on the wrapper `<div>` in the 3 overlays.
  - All 24 added `type="button"` and `aria-expanded={open}`.
- **What they said.** 23 of 24 A runs said why in their messages or reasoning (`a-bio-codex-3` is the exception), for example:
  - "reset its default styling to preserve the header's appearance" (Codex)
  - "a button doesn't stretch to full width the way a div does" (Claude)
  - "inline styles take priority over class styles" (Claude). Four Claude runs warned the reset now overrides styles the `className` sets.
- **On the Oxlint arm, styling was a reason not to change the element.**
  - Claude, attempt 1, in 3 of 4 runs: "A `<button>` would also bring default browser styles … that change how the header looks."
  - Codex, attempt 1, in all 3 runs that kept the div: the existing element or styling "preserved".
  - Ultracite's retry overrode both.
- **The heading.**
  - All 12 Claude runs on A flagged the `<h3>` inside the `<button>` and said the fix belongs in `Stats/index.tsx`. For example: "Strictly, HTML doesn't allow a heading inside a `<button>`" and "The standard pattern is `<h3><button>…</button></h3>`" (`a-rules-claude-1`).
  - Codex never mentioned it in the 9 runs that did it. Its 3 overlays kept the heading outside on purpose: "to preserve the heading markup and appearance".
  - The oracle notes the heading but doesn't fail the fix on it.
- **Behaviour.** The oracle found it preserved in all 32 runs: one `openTrigger` per click, children only when open, label and icon rendered, B's 15 swatches as type="button" calling `onChange` with their colour. One Claude run noted that a native button toggles on Space's key release, not its press.
- **New rules from the reset.** It fires `react-doctor/no-inline-exhaustive-style` in Oxlint +js-plugins and ESLint in all 21 wrapping runs. Nothing in the arms' own configs, so Ultracite didn't retry. With js-plugins turned on, it would have handed that back with "take a structurally different approach".

## 8. Superseded runs

**18 runs aren't in `results.json`** (`superseded-runs/`, $3.21 and 393k tokens):

- **The pilot**, `a-ox-codex-pilot`: ARIA pattern, then a button after the retry.
- **16 runs** made before the run dir had a `package.json`.
- **One final run**, `a-bio-codex-1-final-config-path`. It ran with Biome's `--config-path`, where `noUndeclaredDependencies` reported a `react` import the agent had added, and Ultracite retried it for that.

**Why they were set aside.** In the first set, `a-bio-codex-2` added `import { useId } from "react"`. Biome reported `noUndeclaredDependencies` because it found no `package.json`, and Ultracite retried the file three times for a diagnostic no real project would produce. Adding `package.json` didn't help with `--config-path`; running Biome with its config at the project root did. All runs after that use the final setup.

**Their outcomes match the final runs':**

- A via Oxlint: 3 of 4 ARIA first, then a button.
- A via Biome and with AGENTS.md: buttons.
- B: hex labels.

## 9. Issues in Ultracite (not fixed)

1. **The Biome handoff drops the help text and URL for every a11y rule.**
   - **Where:** `packages/cli/src/agent-fix/linters.ts:203-204`. `BIOME_RULE_CATEGORY_RE = /^(?<kind>lint|assist)\/[a-zA-Z]+\/(?<rule>[a-zA-Z]+)$/u` doesn't allow a digit in the group, so `lint/a11y/useKeyWithClickEvents` never matches.
   - **Effect:** `biomeRuleUrl` returns undefined and `explainBiomeRule` never runs `biome explain`. In every `a-bio` run, the JSON the agent was told holds "rule help text, documentation URLs" had neither. a11y is the only Biome group with a digit.
   - **Missed by the tests:** `agent-fix-linters.test.ts` uses `lint/suspicious/...`.
2. **The retry prompt calls a new diagnostic a failed fix.**
   - **Where:** `index.ts:136-138` retries on any remaining diagnostic. `buildRetryPrompt` (`prompt.ts:59-66`) always says "a previous edit to this file did not resolve them and the linter still reports them" and "The previous approach was insufficient… take a structurally different approach".
   - **In these runs:** the remaining diagnostic was `prefer-tag-over-role`, which the first edit introduced. The original two were cleared, and the edit was correct.
   - **How it can go wrong:** an agent that turns the div into a `<button>` without `type` gets `react/button-has-type` (the `a-native-button-no-type` mutant). It is then told to abandon the approach rather than add one attribute. With js-plugins, the style reset's `react-doctor/no-inline-exhaustive-style` would do the same (§7).
3. **The agent is asked to explain in a message nobody sees.**
   - **Where:** `prompt.ts:36` says "If an issue needs a person's decision, leave it and explain why in your final message". `run-agent.ts:50` runs the agent with `stdout: "ignore"`, so the final message is discarded, and only a failure's stderr tail reaches the notes.
   - **In these runs:** every Claude A run's explanation of the `<h3>`-inside-`<button>` problem, and `a-ox-claude-1`'s "that's your call" before the retry, were lost.
   - **The retry makes it worse.** Leaving an issue for a person is treated as a failure and retried twice with "take a structurally different approach".
4. **`ultracite fix --claude/--codex` crashes on a path Oxlint doesn't lint.**
   - **Where:** `linters.ts:162-169`. With no files to lint, Oxlint prints "No files found to lint. Please check your paths and ignore patterns." before its JSON, and `parseJsonOutput` throws "Failed to parse JSON output from oxlint".
   - **Checked:** with the real adapter, `fixAndCollect(["notes.md"], [])` throws instead of reporting no issues.
   - The same applies to a `verify` of a file the config ignores.
5. **A Biome I/O error is handed to the agent as a lint issue.** `parseBiomeDiagnostics` keeps every diagnostic with a path, including `internalError/io` ("Permission denied" on a read-only file). That would be handed to an agent to "fix". Seen while preparing the subjects; minor.

Also noted, not Ultracite's code: Codex's user-level memory names the user's checkouts, which is how it found binaries to run (§6).

## 10. Harness changes

All opt-in or behaviour-preserving for earlier topics:

- **`run-one.mjs`:**
  - **`runWithRetries`** (§1.3), entered only when the topic exports `verify`. It writes per-attempt artifacts:
    - `handoff.json`, `before.tsx`, `after.tsx`, `diff.patch`;
    - `attempt<k>/` with `prompt.txt`, the diagnostics JSON, `agent.tsx`, `verified.tsx`, `agent.patch`, `verify.patch` and `verify.json`;
    - `handoff/<name>` for a run file the fix pass changed.
  - **`runAgentProcess`** takes an optional timeout and kill grace; the defaults are unchanged.
  - **`lockAll(extra)`** locks extra paths: the retry loop locks the handoff copy and earlier attempts' staging (their session logs) while a later attempt runs. Callers that pass nothing behave as before.
  - `buildRetryPrompt` is imported with `buildPrompt`.
- **`scripts/ultracite-adapters.cjs`** (new): the mirror of the CLI's adapters, retry condition and tally, with source hashes. It is reusable by any later topic.
- **`scripts/topics.cjs`** documents the `collect` / `verify` hooks.
- **`.gitignore`** ignores `attempt*/` and `superseded-runs/*/attempt*/` session logs, stdout and stderr, and names this topic's configs.
- **Per-topic hash checks (dead-code, import-cycles).**
  - Their copies of the CLI's parsers (and import-cycles' `groupByFile`) changed in 40d646a4.
  - Their `aggregate` already failed at HEAD on the hash check, before any change here.
  - `driftCheck` now records the hashes their runs were made with and prints a note when the CLI has moved on. New runs of those topics still fail on the check, as they should.
- **Redaction:** every new text artifact goes through `lib.redact`, including the per-attempt files, `handoff.json` and `handoff/AGENTS.md`. Session logs, stdout and stderr are copied raw and gitignored.
- **`research/corpus/scripts/a11y-examples.cjs`** imports the oracle instead of defining it.

**Earlier topics reproduce.** Each topic's `test-behavior-harness.cjs` was run, every run re-measured and every topic re-aggregated from committed files, twice: before any change here (at HEAD) and after all of them. The results folders were restored afterwards.

| Topic | Self-test | Before vs after the changes | After vs committed (apart from `generatedAt`) |
| --- | --- | --- | --- |
| cognitive-complexity | passes | identical | identical |
| floating-promises | passes | identical | identical |
| import-cycles | passes | identical; the aggregate failed before (hash check) and runs after | identical |
| security-rules | passes | identical | Biome's full-preset counts (the known `noUndeclaredDependencies` drift from c9b606af, in 8 `measure.json` files and 3 evasion-matrix rows), and one evasion-matrix row's Oxlint +js-plugins `sonarjs/regex-complexity` (7984c6e9 added sonarjs's syntactic rules to js-plugins) |
| dead-code | passes | identical; the aggregate failed before (hash check) and runs after | only the Oxlint +js-plugins full-preset view: `sonarjs/void-use` now fires (7984c6e9), in 18 `measure.json` files' counts and 3 runs' new hits |

**Prompt drift.** Every earlier topic's runs used `prompt.ts` 8c5e6e7e…. These runs used d8ab94fc…, which adds the non-interactive line, from 40d646a4 and a whitespace change in 25438598. These runs also use 40d646a4's adapters: rule names as the config spells them, ESLint and Biome help and URLs (the Biome part doesn't work for a11y, §9.1), path-order handoff and re-lint before each file.

## 11. Caveats

- **Sample:** 4 runs per arm and agent, one component per subject, one session each. The splits (7 of 8, 8 of 8) are large, but n is small.
- **Is the B result the subject or the rule?** B's result is unanimous, but `control-has-associated-label`'s help names `aria-label` and the value is right there in `title`. The palette lookup needs a step the handoff never mentions.
- **The Biome arm has no help text** (§9.1). It answers "what does Ultracite's Biome handoff do today", not "do Biome's descriptions steer differently". An arm with the intended help would separate the two.
- **The oracle is static.**
  - No DOM, browser or screen reader. The accessible name is a reduced computation.
  - A native button's Enter and Space activation is credited by the HTML spec, not dispatched.
  - Whether a cancelled Space keydown suppresses a button's activation (`a-ox-codex-3`) isn't tested.
  - The `<h3>` inside the `<button>` is reported, not failed.
- **The run dir isn't a full project.** There's no lint config, no `node_modules` and no git, and the path names the experiment and topic (`…/ultracite-agent-experiment/accessibility/<run>/`), as in every topic.
  - The agents could tell it was a test setup. Claude remarked that there was no `node_modules`.
  - Codex reached outside it for linters. In a real project it would have run the project's own, with Ultracite's config, which would report `prefer-tag-over-role` directly.
- **User-level configuration applied:** Codex's memories and plugin list, Claude Code's skills and hooks. The instruction files were empty.
- **One rater:** the hand classification and the quotes' selection.
- **The `package.json` is a reconstruction.** It's what init adds, plus React's dependencies, not a real Excalidraw manifest.

## 12. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=accessibility
node scripts/prepare-subjects.cjs        # subjects/accessibility/ (stripFields, TEXT_EDITS, normalised, checked; init's AGENTS.md; package.json per linter)
node scripts/test-behavior-harness.cjs   # oracle self-test, 55 cases, and the mirror against the CLI's adapters, 55 comparisons -> oracle-self-test.json (~1 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a-ox:claude:1 b-ox:codex:1 a-bio:claude:1 a-rules:codex:1 ...   # 4 of each arm and agent
node scripts/aggregate.cjs               # results.json, with the mutant matrix (~4 min)
node scripts/report-tables.cjs > results/accessibility/tables.md
```

- **Re-measuring without the session logs.** `measure.cjs <run>` re-measures a run from its committed files in about 25 seconds, carrying session-derived fields over from `measure.json` when the log is missing.
- **With the logs, keep the same run root.** Set `AGENT_EXPERIMENT_RUN_ROOT` to the one the runs used, or the redaction of paths in session-derived fields changes.
- **This report's runs** used `AGENT_EXPERIMENT_EXTRA_LOCKS` to lock the orchestrating session's scratchpad and the batch-log folder.
- **The hand classification** is an input (`classifications.json`).

## 13. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/accessibility.cjs` | the topic: subjects, collect/verify, views, scan, classification, measure, aggregate, tables, self-test and mirror check |
| `scripts/topics/accessibility-behavior.cjs` | the behaviour oracle (shared with the corpus) |
| `scripts/ultracite-adapters.cjs` | the mirror of Ultracite's adapters and retry loop |
| `subjects/accessibility/` | the four arms' files, `tsconfig.json`, `package.{oxlint,biome}.json`, `init.json`, `subjects.json` |
| `harness-tests/accessibility/` | 31 hand-made mutants with their expected verdicts |
| `results/accessibility/runs/` | 32 runs: meta, handoff, before/after, per-attempt artifacts, measure.json |
| `results/accessibility/superseded-runs/` | the pilot and 17 superseded runs (not aggregated) |
| `results/accessibility/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json` | aggregate, tables, hand classification, self-test and mirror check |
