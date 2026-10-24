# React effects: agent experiment report

The agent experiment for the post on React effects and their dependency arrays, run on 2026-10-24 (UTC) with Claude Code 2.1.310 (claude-opus-5-5, effort xhigh) and Codex CLI 0.155.1 (gpt-6-astra, reasoning effort xhigh). The generated tables are in `tables.md`; every number below is in `results.json`, and the hand classification is in `classifications.json`.

Questions:

1. Given Ultracite's default handoff (Oxlint with React selected) for a missing dependency, what do the agents do with an effect whose warning is a real bug (subject A), one whose obvious fix breaks it (B), and one whose omission is deliberate (C)?
2. What do they understand about the effect, and what do they say?
3. What do Ultracite's retry loop and its `Left for review:` line do with each?
4. What does a user get from `ultracite fix` and `ultracite fix --unsafe` with no agent, with each linter?

## TL;DR

- **This is the topic where the dependency diagnostics reach the agent by default.** Oxlint's fix for a missing dependency is dangerous, so a plain `ultracite fix` leaves the arrays alone (checked on all three subjects) and `--claude` or `--codex` hands the diagnostics over: 2, 6 and 4 issues.
- **Results by subject** (24 runs, 4 per subject and agent):

  | Subject | The right response | Claude Code (4 runs) | Codex (4 runs) |
  | --- | --- | --- | --- |
  | A, a real bug | follow the new store (the project's fix), or say fixing it changes behaviour and leave it for review | the linters' fix 3 (partly fixed; resubscribes on every render with inline functions), the bug kept on purpose 1 | the linters' fix 4 |
  | B, the obvious fix breaks it | keep when each effect runs | `useEffectEvent` 3, the effects replaced by state adjusted during render 1: behaviour kept in 4 | `useEffectEvent` then, on the retry, state adjusted during render: behaviour kept in 4 |
  | C, a deliberate omission | keep both effects as they run | `useEffectEvent` 3, a ref 1: behaviour kept in 4 | a ref 3, `useEffectEvent` 1: behaviour kept in 4 |

  - **No run fixed A.** 7 of 8 listed the three values the rule names, which is what every linter's unsafe fix does. After the switch to a second store, the hook keeps showing the first store's value until the second one changes, and with an inline `getSnapshot` it resubscribes on every render (6 subscriptions in the oracle's scenario, against 1).
  - **Every Claude A run noticed the stale value; no Codex run said anything.** Three Claude runs said the edit "also fixes a real stale-value bug", which the oracle shows is only half true. The fourth (`a-claude-2`) read the empty array as deliberate and kept the bug: "it isn't the minimal, behaviour-preserving fix this task asked for." Codex: "Added `serverSnapshotIsUsed`, `getSnapshot`, and `subscribe` to the effect's dependency array."
  - **B and C were right in all 16 runs**, and every run cleared every dependency diagnostic in all four views: Oxlint react, ESLint react, ESLint react on every file, and Biome react. That includes Oxlint's compiler rule, which the corpus work expected to keep reporting C's trigger dependencies as "extra" after any behaviour-preserving edit. The agents made the effect body read its triggers instead (§2).
- **No run used the `Left for review:` line, and none added a suppression.** Ultracite printed "Fixed N of N issues" for all 24 and exited 0. For A that tally reports seven partial fixes and one deliberately kept bug as fixed.
- **No agent mentioned the TDZ in B**, the reason every linter's fix crashes on the first render. None hit it either. Claude read `validate` through Effect Events, whose closures run after render. Codex moved the effects below `validate`.
- **The retry loop ran 5 times, every time for a rule outside the dependency pair.**
  - All four Codex B runs moved the effects below `validate`. The compiler could then analyse the whole component and reported `react/set-state-in-effect` a second time, handed back as new.
  - Its help ("Derive the value during render, … or update it from the event that caused the change") led Codex to delete both effects and adjust state during render. Behaviour was kept.
  - `a-claude-2`'s new hook after the server-render early return tripped `rules-of-hooks`, so it rewrote the early return.
- **Without an agent:**
  - `ultracite fix` changes no dependency array with any linter.
  - `ultracite fix --unsafe` with Oxlint or Biome partly fixes A (resubscribing on every render), crashes B on its first render, and makes C save the chat on every prompt keystroke.
  - ESLint skips `.ts` files, so A and C get no hook diagnostic at all, apart from two errors on C's upstream disable comments: "Definition for rule 'react-hooks/exhaustive-deps' was not found."
  - Ultracite's real adapters agree with the mirror in all 42 cases.
- **Exposure:**
  - No tool call read a locked path, a corpus file, a clone, an installed Hono (the main checkout's 4.13.5 has the fix) or React's sources.
  - Codex opened react.dev's `useEffectEvent` page in 4 runs, and "Removing Effect Dependencies" in 1.
- **Cost:** Claude Code $8.86 for 12 runs (median $0.73, $0.35–1.29). Codex 660k tokens (median 48.1k, 19.6k–102.4k). 54 minutes of agent time over 29 attempts (31.6–293.2 s a run). The pilot cost $0.90 and 45.3k tokens more.

## 1. Setup

### 1.1 Subjects

The subjects are the three in `corpus/examples/react-effects/` (corpus REPORT §10). Each was run 4 times with Claude Code and 4 times with Codex, 24 runs in all, from 13:10 to 14:09 UTC, in four rounds that each ran every subject with every agent once, in a different order.

| Subject | File in the run dir | Effects under test | Handoff (Oxlint, after the filter) | The right response |
| --- | --- | --- | --- | --- |
| A | `index.ts` (Hono's `useSyncExternalStore`, `src/jsx/hooks/index.ts` at df653cea, the parent of honojs/hono#5166; MIT) | the subscription effect, `[]` | `react/exhaustive-effect-dependencies` "Found missing effect dependencies"; `react-hooks/exhaustive-deps` "React Hook useEffect has missing dependencies: 'serverSnapshotIsUsed', 'getSnapshot', and 'subscribe'" | follow the new store: resubscribe on `subscribe` and show its value at once, or leave it for review saying the fix changes behaviour |
| B | `TimeInput.tsx` (Supabase Studio's PITR time input at 09f80f52; Apache-2.0) | the limits effect, `[JSON.stringify(minimumTime), JSON.stringify(maximumTime)]`; the `defaultTime` effect, `[defaultTime]` | two compiler reports, two "complex expression" reports, the missing `'validate', 'time', 'minimumTime', and 'maximumTime'`, the missing `'validate'` | keep each effect's trigger and read `validate` another way, or leave it for review |
| C | `useTTDChatStorage.ts` (Excalidraw's text-to-diagram chat storage at 4c00f31d; MIT; the two upstream disable comments removed) | the initial load, `[]`; the auto-save, `[messages length, last id, last isGenerating]` | two compiler reports (the second "missing/extra"), the missing `'loadChats'`, the missing `'saveCurrentChat'` | keep both effects as they run: `useEffectEvent`, a ref to the latest function, or leave both for review |

**What each handoff says.** The help is Oxlint's own:

| Rule | Help |
| --- | --- |
| `react-hooks/exhaustive-deps` (missing) | "Either include it or remove the dependency array." |
| `react-hooks/exhaustive-deps` (complex expression) | "Extract the expression to a separate variable so it can be statically checked." |
| `react/exhaustive-effect-dependencies` | "Missing dependencies can cause an effect to fire less often than it should", plus, for C's auto-save, "Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects" |

- **The labels name each value.** The compiler rule's labels say "Missing dependency \`validate\`" or "Unnecessary dependency \`lastMessageInHistory?.id\`", for example.
- **The `raw` note links React's docs.** Each compiler diagnostic's `raw` object, which the JSON file carries, has a `note`: "React Compiler skipped optimizing this component or hook. Additional guidance: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps".

**Arms.** The brief allowed raising a cell to six runs if the pilot looked noisy. Both pilot runs on C kept the behaviour and cleared every issue, and every final cell is uniform in the oracle's verdict. So every cell has four runs.

### 1.2 The run dir: what `ultracite init --linter oxlint --frameworks react` leaves

`prepareSubjects` runs Ultracite's own `init` (the CLI source, under Bun, `--linter oxlint --frameworks react --pm bun --skip-install --yes --quiet`) in a scratch project. The project starts as a React app on TypeScript: a `package.json` with React and react-dom 19.3 and `@types/react`, and a `tsconfig.json` (TSX with the automatic runtime, DOM types, strict, bundler resolution). With `--yes`, init detects no framework, so `--frameworks react` selects it. It writes three files and leaves `tsconfig.json` as it was:

- `oxlint.config.ts`: `extends: [core, react]`, `env: core.env`, `ignorePatterns: core.ignorePatterns`, importing `ultracite/oxlint/core` and `ultracite/oxlint/react`
- `oxfmt.config.ts`: `...ultracite` from `ultracite/oxfmt`
- `package.json`: `ultracite` 8.0.2, `oxlint` ^1.86.0 and `oxfmt` ^0.71.0 added, and the `check` and `fix` scripts

Those three, as Ultracite's fix pass formats them, plus `tsconfig.json`, are the run dir with the subject (`subjects/react-effects/run-files/`). init's untouched output for Oxlint, Biome and ESLint is in `subjects/react-effects/init/`. Oxlint's two TypeScript configs are stored with a `.txt` suffix in both folders, because this repo's Oxlint and Oxfmt would load them as nested configs. The run dir has no `node_modules` and no git, and the diagnostics JSON is written there, as in earlier topics.

### 1.3 Preparing the subjects

- **Header.** The `stripFields` fields are removed: the subject line, the rules, why the warning is a bug or the fix breaks it or the omission is deliberate, the disable comments, what the project did, the behaviour to preserve, and the expected and tempting responses. Seven `TEXT_EDITS` then rewrite:
  - A's commit line, which said "the parent of the fix";
  - A's and C's descriptions of the hook, and B's of the component. They named the dependency rules or described what the oracle checks (C's: "It loads the saved chats once, saves the current chat when a response finishes generating … so two instances run at once"). Only the identification is kept;
  - the three "copied verbatim" sentences, which normalising made untrue, to "copied, with their formatting changed";
  - B's license line, which pointed into this repo's `research/corpus` folder, to the standard Apache 2.0 notice with its URL.
- **C's two upstream disable comments are deleted.**
- **The comment check.** Every comment line that's left, header, STUB notes and upstream comments included, is checked against 19 patterns:
  - **The effect:** effect, dependency, stale, loop, every render, re-render, Strict Mode, `useEffectEvent`, resubscribe, keystroke, typing, revert, TDZ, initialise, hoist, memoise, identity, `useCallback` and `useMemo`.
  - **Intent:** deliberate, intentional, on purpose, mount-only, once.
  - **The tools:** every linter, rule and compiler name, Ultracite, suppress, disable.
  - **The analysis:** the stripped field names, agent, experiment, subject, analysis, corpus, oracle, scenario, review, decide, verbatim, fix and bug.
  - **The history:** the history's PR and commit numbers, upstream, later and history.

  Nothing in the prepared subjects matches, so no allow-list was needed. The same patterns match 18, 21 and 30 lines of the unstripped corpus subjects, so a clean prepared subject means the check ran. The project's own "chat history" is excluded from the history pattern.
- **Kept:** source, commit, permalink (with its line anchors, as in the corpus header), license and every STUB note, which says what the stub stands in for (jotai's setter "is stable for a given atom, as useState's is", for example).
- **File names** are the upstream ones: `index.ts`, `TimeInput.tsx`, `useTTDChatStorage.ts`.
- **Normalised as far as Ultracite's Oxlint pass goes.** The cleaned subject and init's files go through `oxlint --fix .`, `oxfmt --write .` and `oxlint -f json .` until no file changes (two passes each).
  - It reformatted Hono's and Supabase's code to Ultracite's style.
  - It applied Oxlint's other safe fixes: `curly` braces, `sort-keys` on object literals, `let error = undefined` to `let error`, and `Number` to `number` in a stub type.
- **Normalising touched no effect.** `subjects.json` `checks` records that:
  - every effect's hook and dependency array is unchanged, and so is its callback (tokens, ignoring braces);
  - Oxlint's safe fix can remove outer-scope and `ref.current` dependencies; it removed none here;
  - the oracle's trace equals the corpus's prepared subject's, apart from the source line labels of the hooks;
  - `tsc` with React 19's types reports nothing;
  - Ultracite's collect leaves every file unchanged;
  - the handoff holds exactly the two dependency rules, each on an effect under test.

### 1.4 The handoff and the filter: a deviation from a real project

After normalising, Oxlint still reports 8, 16 and 10 other diagnostics on A, B and C (`tables.md` lists them).

| Subject | Hook and compiler rules among them | Core rules among them |
| --- | --- | --- |
| A | `react-hooks/rules-of-hooks` ×3, `react/hooks` ×3, `react/set-state-in-effect`, `react/hook-use-state` | |
| B | `react/immutability`, `react/set-state-in-effect`, `react/jsx-no-useless-fragment` | `no-use-before-define` ×2, `prefer-named-capture-group` ×3 and others |
| C | `react/refs`, `react/todo` | core rules |

Ultracite would hand all of them over with the dependency rules. So the experiment filters, in the handoff and in every re-lint, as the todo-comments and sort-keys topics did:

- **Kept:** `react-hooks/exhaustive-deps` and `react/exhaustive-effect-dependencies`, and any other diagnostic that isn't one of the prepared project's own, matched by rule and message as Ultracite's `diff.ts` matches them.
- **So it models a project that lints clean apart from the dependency arrays.** An edit that trips a new rule, or reports a rule more often than the subject did, is handed back as Ultracite would hand it back.
- **The cost:** a real project with these files would hand over 10, 22 and 14 issues at once.
- **Unlike in sort-keys, the filter changed decisions.** All five retries were for a rule outside the pair, reported once more than in the prepared subject: B's `react/set-state-in-effect` and A's `rules-of-hooks`. A filter keeping the two dependency rules alone (recorded as `verifyRemainingDependencyRulesOnly`) would have retried nothing. In a real project those rules would already have been in the first handoff, because each subject reports them once or more as it is.

### 1.5 The run: Ultracite's retry loop, through the Oxlint adapter

`run-one.mjs`'s `runWithRetries` does for one file what `packages/cli/src/agent-fix/index.ts` does, as in the three previous topics:

- **Collect:** Ultracite's Oxlint pass on the project (`oxlint --fix .`, `oxfmt --write .`, `oxlint -f json .`), then the filter.
- **Attempts:** up to `MAX_AGENT_ATTEMPTS` (3), each with `buildPrompt` or `buildRetryPrompt`, under `AGENT_TIMEOUT_MS` (300 s) and `KILL_GRACE_MS` (10 s).
- **Verify after each attempt:** the same pass on the file, in place, then the filter.
- **The decision:** `parseLeftForReview` reads the agent's final message, and an issue listed there isn't retried. `nextRetry` splits what's left into issues still reported and issues new since the edit.

The mirror and the configs:

- **The mirror is current.** `scripts/ultracite-adapters.cjs` hash-checks the slices it copies. The check passed before every run (`mirroredSlicesDriftNow` is empty).
- **The configs.** The harness passes `-c` with configs equivalent to init's that import the presets by absolute URL, because the run dir has no `node_modules`. Init's own `oxlint.config.ts` and `oxfmt.config.ts` are in the run dir for the agents to read, and `-c` overrides them (checked).
- **The mirror matches the CLI.** The self-test runs Ultracite's real `linters.ts` Oxlint adapter under Bun, in a project with init's own config files (which import `ultracite/...`) and `node_modules` links, next to the mirror. It covers the 3 prepared subjects and 22 mutants. All 25 collect-and-verify comparisons match: every diagnostic field but `raw`, and the subject, `package.json` and `tsconfig.json` each pass leaves.

What Ultracite prints is computed from the committed files by `fileOutcome`.

### 1.6 Measurement

- **Two states per attempt:** the file as the agent left it, and as verify's fix pass and formatter left it.
- **On each state:**
  - **The dependency rules and every rule in four views,** inline config honoured and ignored:
    - Oxlint react: init's root config, the handoff's view;
    - ESLint react: the `eslint.config.mjs` `ultracite init --linter eslint --frameworks react` writes, core and react, whose react block covers `.jsx` and `.tsx` only;
    - ESLint react on every file: a counterfactual with the react blocks on `.ts` and `.js` too, the corpus's `eslint-all`;
    - Biome react: init's `biome.jsonc`, core and react, `biome check`, with init's `package.json` for Biome.
  - **React Doctor kept apart.** React Doctor's rules (ESLint react only) are counted in their own fields. No count, outcome or verdict includes them (§7).
  - `tsc` with React 19's types.
  - **The oracle,** `corpus/scripts/effects-oracle.cjs` on `effects-runtime.cjs` (React 19 on a minimal DOM), imported unchanged. Its verdict covers both modes, and each mode also gets a verdict of its own:
    - **A:** stable store functions, and an inline `getSnapshot`. Bug kept, partly fixed, bug fixed, plus resubscribing on every render.
    - **B:** a parent holding `defaultTime`, and the app's parent rebuilding it every render. Same, typing reverted, crashes, changed.
    - **C:** one adapter object, and a new one every render, with two instances. Same, saves while typing or streaming, extra loads, a missed save, crashes.

    It also records how often effects ran, subscriptions (A), and saves and loads (C).
  - **What the edit did to each effect under test,** found by what its callback reads (local functions it calls are expanded one level, so an Effect Event is followed):
    - dependencies added, and whether the rule asked for them;
    - dependencies removed, and whether they were triggers; extracted to a variable, or replaced by the value they read;
    - the callback changed, or the effect gone;
    - hooks and constructs added: `useEffectEvent`, `useRef`, `useCallback`, `useMemo`, updater functions, effects;
    - where `validate`, `loadChats` and `saveCurrentChat` went: wrapped, moved into an effect, moved above the effects.

    The headline uses the brief's categories. Suppressions, config changes and other files touched are recorded separately.
- **Per attempt:** Ultracite's partition against that attempt's issues and the handoff's. Verify was re-run on the agent's file, and it reproduced every committed `verified.*` and `verify.json`.
- **From the session log:**
  - model, model calls, tool calls, and cost or tokens;
  - every shell command, and for Claude Code whether it was refused;
  - searches for tests; reads of an installed Hono, of React's sources and of React's types; web access;
  - the agent's own behaviour checks, project instructions loaded, and the final message;
  - sentences about behaviour, stale values, loops or extra runs, resubscribing, the TDZ, mount-only intent or triggers, `useEffectEvent`, React's docs, keystrokes, deliberate omissions and review;
  - exposure, counted in the whole log, in tool calls with their output, and in tool inputs alone.
  - **Claude Code's thinking isn't in its logs** (the blocks are empty), so for Claude these sentences come from its messages. Codex's reasoning summaries are there.
- **The deterministic paths** (`aggregate`). For each subject, `ultracite fix` and `ultracite fix --unsafe` run with Oxlint, Biome and ESLint, each on a project with what init writes for that linter (React selected). The inputs are the upstream code (header stripped; C with and without its disable comments) and the file the Oxlint arm hands over. Each is run through the mirror and through Ultracite's real adapters with `node_modules` links. The mirror's Oxlint and Biome passes now take a passthrough (§10).
- **The oracle and classifier self-test:** 25 cases, all as expected.
  - The three prepared subjects.
  - 22 mutants (`harness-tests/react-effects/mutants.json`). 16 re-express the corpus variants a01–a05, b01–b05 and c01–c06 on the prepared text. Their oracle verdicts, dependency-rule counts in Oxlint (both rules), Biome and ESLint on every file, and `tsc` counts equal `examples.json`'s.
  - 6 more: A depending on `subscribe` alone with a refresh (bug fixed); a suppression in each subject (Oxlint then reports `react/rule-suppression` and its compiler rules skip the component); a ref assigned during render (C); `loadChats` alone (C).
- **The hand classification** (`classifications.json`), by one rater, from every run's diff, both states of every attempt, the final messages and Codex's reasoning summaries. It records the edit, the response, and 13 flags for what the agent said or looked up.
  - It agrees with the automatic edit and response in all 24 runs.
  - The automatic readings were visible while classifying, so that's a consistency check, not an independent one.

## 2. Results by subject and agent

| Subject × agent | Final edit | Oracle (both modes) | Retried | Left for review | Ultracite prints |
| --- | --- | --- | --- | --- | --- |
| A, Claude | the linters' fix 3, a ref (bug kept) 1 | partly fixed, resubscribes on every render 3; bug kept 1 | 1 | 0 | Fixed 2 of 2 ×4 |
| A, Codex | the linters' fix 4 | partly fixed, resubscribes on every render 4 | 0 | 0 | Fixed 2 of 2 ×4 |
| B, Claude | `useEffectEvent` 3, state adjusted during render 1 | same 4 | 0 | 0 | Fixed 6 of 6 ×4 |
| B, Codex | `useEffectEvent` → state adjusted during render 4 | same 4 | 4 | 0 | Fixed 6 of 6 ×4 ("Took 2 attempts.") |
| C, Claude | `useEffectEvent` 3, a ref 1 | same 4 | 0 | 0 | Fixed 4 of 4 ×4 |
| C, Codex | a ref 3, `useEffectEvent` 1 | same 4 | 0 | 0 | Fixed 4 of 4 ×4 |

**Every final file** clears both dependency rules in every view, inline config ignored. There's no new type error, no new Oxlint rule, no suppression, no config change and no other file touched.

**A, a real bug.** 7 of 8 runs listed `[serverSnapshotIsUsed, getSnapshot, subscribe]`: the linters' fix, the corpus's variant a01.

- **What the oracle sees.** The texts across the scenario are a1 / a2 / a2 / a2 / b1 / b1, against the fix's a1 / a2 / a2 / b0 / b1 / b1. After the switch the hook shows the old store's value until the new store changes. With an inline `getSnapshot`, every render unsubscribes and subscribes again (6 subscriptions against 1). The project's fix (variant a05) reads the snapshot during render; no run did that.
- **Claude explained what changed, in all three:**
  - "If a caller passes a new function each render (for example `() => store.get(id)`), the effect now unsubscribes and resubscribes on those renders instead of subscribing once. React's own `useSyncExternalStore` resubscribes when `subscribe` changes, so this matches the API hono/jsx follows."
  - "**This also fixes a real stale-value bug.** Before, the store listener always called the `getSnapshot` from the first render" (a-claude-1). It fixes the listener; the value shown after a switch is still the old store's.
  - Each said it chose this over refs, which "would keep the original subscribe-once behavior exactly, but it also keeps the stale `getSnapshot` bug" (a-claude-3).
- **`a-claude-2` kept the bug on purpose.**
  - Attempt 1 froze the first render's functions: `const [store] = useState(() => ({ getSnapshot, subscribe }))`, with `[serverSnapshotIsUsed, store]`. "I didn't just list `getSnapshot` and `subscribe` as dependencies, because that would change behaviour. Any caller passing inline functions would unsubscribe and resubscribe on every render. … it isn't the minimal, behaviour-preserving fix this task asked for."
  - The new `useState` after the server-render early return tripped `rules-of-hooks`, `react/hooks` and `react/hook-use-state`, and Ultracite retried.
  - Attempt 2 moved the copy into a `useRef` and rewrote the early return so no hook is conditional: on the server path it now calls `useState` with `getServerSnapshot()` instead of returning early. The stub never takes that path, so the oracle can't judge it.
- **Codex said nothing about behaviour.** Final messages: "Updated only `index.ts`, adding the three missing effect dependencies. Both reported rules now pass." One progress message: "I've added them so it uses the current subscription and snapshot reader."
- **No run looked at Hono's history or a later version,** and none read the installed Hono 4.13.5, which contains the project's fix.

**B, the obvious fix breaks it.** All 8 kept the behaviour in both modes and cleared all six issues.

- **Claude, 3 runs: Effect Events.** The `JSON.stringify` calls became `minimumTimeKey` and `maximumTimeKey`, as the help says, and `validate(time)` and `validate(defaultTime)` moved into two `useEffectEvent`s.
  - The bounds check now reads the keys, so the compiler rule sees them used.
  - The reason: "Adding `time` to the dependencies would change behaviour. Validation would run on every keystroke and show "Please enter a valid time" while the user is still typing" (b-claude-3).
- **`b-claude-2`** removed both effects and adjusted state during render: "React's recommended pattern for adjusting state when a prop changes: keep the previous value in state, compare it during render, and update state when it differs." It named the one difference: "on mount, any validation error now appears in the first render."
- **Codex, all 4: two steps.**
  - Attempt 1: keys and Effect Events, and both effects moved below `validate`. The verify then reported a second `react/set-state-in-effect` (§3).
  - Attempt 2: the effects replaced by guarded updates during render, as that rule's help suggests.
  - Codex's reasoning gave the same reason as Claude: "Adding every dependency directly would trigger validation while typing and could reset edits when the bounds change" (b-codex-1).
- **Nobody mentioned the TDZ.** No message or reasoning summary says that `validate` is declared below the effects, or that listing it throws, which is what every linter's unsafe fix does (§4). Claude's Effect Events never read `validate` during render. Codex's move put the effects after it.

**C, a deliberate omission.** All 8 kept every load and save, in both modes, and cleared all four issues, including the compiler rule's "extra dependencies".

- **How they cleared "extra":** every run made the effect body read its triggers.
  - Claude (3) built a key the effect reads: `` const settledMessagesKey = lastMessageInHistory?.isGenerating ? null : `${chatHistory.messages?.length}:${lastMessageInHistory?.id}` `` with `[settledMessagesKey]`, and saved through an Effect Event.
  - The Claude pilot passed the triggers into the Effect Event as unused arguments (`_messageCount`, `_lastMessageId`).
  - Codex (3) and one Claude run added `saveCurrentChat` to the array, then kept the previous trigger values in a ref and returned early when only the callback had changed.
  - `c-codex-4` memoised the three triggers into one object and passed it to an Effect Event.
- **Every run said why `saveCurrentChat` can't simply be listed:**
  - "Adding `saveCurrentChat` as a dependency directly would change behavior. It's rebuilt whenever anything in `chatHistory` changes, so typing in the prompt would trigger a save on every keystroke." (c-claude-1)
  - "The save callback changes when the prompt changes, so adding it directly would trigger extra saves." (c-codex-3)
- **`loadChats` was added in 6 runs**, with the reason that it's a no-op once loaded. Two of them (c-claude-3, c-claude-4) added that the chats would now reload if something reset `chatsLoadedAtom`. Two runs kept `[]` through an Effect Event: "the effect should run once on mount, not every time `loadChats` changes" (c-claude-2).
- **Same saves, more runs.** The ref guard runs the auto-save effect on every chat change, prompt keystrokes included, and returns early: 56 effect runs in the oracle's scenario, against 20 as written, with the same 5 saves. The key-based versions run 20 or 30.
- **Three Claude runs named a case their edit changes**, which the oracle doesn't exercise:
  - "the old code also saved when the last message's `isGenerating` changed between `undefined` and `false` and nothing else changed" (c-claude-1, c-claude-4);
  - in Strict Mode, "the original saved twice on mount, and this version saves once" (c-claude-3).

## 3. The retry loop and the Left for review line

- **19 of 24 runs took one attempt.**
- **5 took two, each for a rule outside the dependency pair:**

  | Run | Attempt 1 | Verify reports (new since the edit) | Attempt 2 |
  | --- | --- | --- | --- |
  | b-codex-1 to -4 | keys, Effect Events, effects moved below `validate` | `react/set-state-in-effect` (a second report: with `validate` declared first, the compiler analyses the whole component and flags `validate(time)` and `setTime` in effects; the subject had one) | both effects replaced by updates during render |
  | a-claude-2 | first-render functions frozen in `useState` | `react/hooks`, `react/hook-use-state`, `react-hooks/rules-of-hooks` (the new hook after the early return) | the copy moved to `useRef`; the early return rewritten |

  - **The prompt** was the "new since the edit" one: "The previous edit resolved the issues it was given, but the linter now reports the new issues below … build on it rather than undoing it."
  - **Codex followed `set-state-in-effect`'s help**: "Derive the value during render, initialize state directly, or update it from the event that caused the change." Its final messages: "Fixed issue 1 in `TimeInput.tsx` using guarded render updates, preserving default-time resets and bounds validation."
  - **The filter caused these retries** (§1.4). In a real project, `set-state-in-effect` and `rules-of-hooks` would have been in the first handoff with everything else.
- **What Ultracite printed:** "Fixed 2 of 2", "Fixed 6 of 6" or "Fixed 4 of 4 issues with …" in all 24, with "Took 2 attempts." in the 5, and exit 0.
- **The `Left for review:` line was used in none of the 24 runs.**
  - The prompt's condition, "If an issue needs a person's decision", fits A: the fix changes behaviour, which the prompt forbids. Claude said so in all four A runs, and three went ahead anyway.
  - In B and C every agent found an edit that keeps the behaviour and clears the rules, and took it.
- **Explanations were discarded.** `fixFileGroup` prints the agent's message only through `describeLeftForReview`. So the user sees "Fixed 2 of 2 issues" and nothing of the following:
  - "the effect now unsubscribes and resubscribes … instead of subscribing once";
  - "This also fixes a real stale-value bug";
  - a-claude-2's reason for keeping the bug;
  - the residual differences three C runs named.

## 4. Without an agent: `ultracite fix` and `--unsafe`, with each linter

Each linter's adapter `fixAndCollect` runs on a project laid out as init leaves it with React selected. This matches the plain `ultracite fix`, whose fix commands are the same; the adapter adds a report-only lint. "Left" is what `--claude` or `--codex` would hand an agent, counting the dependency rules only.

| Subject | Linter | `ultracite fix` | `ultracite fix --unsafe` |
| --- | --- | --- | --- |
| A | Oxlint | array unchanged; 2 left | all three listed: partly fixed, resubscribes on every render; 0 left |
| A | Biome | array unchanged; 3 left | all three listed: the same; 0 left |
| A | ESLint | `.ts`: no hook rule runs; nothing left, the bug invisible | ESLint has no unsafe tier (fix.ts drops the flag): the same |
| B | Oxlint | arrays unchanged; 6 left | `validate`, `time` and the limits added to arrays evaluated before `const validate`: **crashes** on the first render (4 `tsc` errors); 4 left, two of them "depends on \`validate\`, which changes every render" |
| B | Biome | arrays unchanged; 6 left | the same crash; 2 left |
| B | ESLint | arrays unchanged; 4 left (`.tsx`) | the same |
| C, upstream with its disable comments | Oxlint | unchanged; 0 left, but `react/rule-suppression` ×2 reported and the compiler skips the hook | unchanged (the suppressions hold) |
| C, upstream with its disable comments | Biome | unchanged; 3 left (it ignores eslint comments) | `loadChats` added, the triggers removed, `saveCurrentChat` added: **saves while typing** |
| C, upstream with its disable comments | ESLint | unchanged; 2 left: "Definition for rule 'react-hooks/exhaustive-deps' was not found." on both comments | the same |
| C, disable comments removed (as handed over) | Oxlint | unchanged; 4 left | both added: **saves while typing**; 1 left (the compiler's "extra") |
| C, disable comments removed (as handed over) | Biome | unchanged; 3 left | as above: **saves while typing** |
| C, disable comments removed (as handed over) | ESLint | nothing left | the same |

- **No warning anywhere.** The unsafe fixes print nothing about what they changed, and the safe pass leaves the dependency arrays alone with every linter.
- **Real adapters.** Ultracite's own Oxlint, Biome and ESLint adapters, run under Bun in projects with init's config files and `node_modules` links, produce the same files and diagnostics as the mirror in all 42 cases. ESLint's React Compiler messages print the file's absolute path; it is replaced before comparing.
- **Matches the corpus.** These are the corpus's `examples.json` fix results (oracle verdicts), reached through the full `ultracite fix` pass rather than the rule alone.
- **React Doctor reported nothing** on any subject in any ESLint pass, though the preset turns on 417 of its rules for `.tsx`.

So with Oxlint, the default path makes no change and leaves the decision to an agent. `--unsafe` breaks B and C, and so does Biome's. ESLint never sees A's bug or C's omissions, and turns C's upstream suppressions into errors.

## 5. What the agents said

Hand classification (`classifications.json`), runs in which each was true:

| | Said the obvious fix changes behaviour | Stale value | Extra runs or a loop | Resubscribe (A) | TDZ (B) | Mount-only or a trigger | `useEffectEvent` | React's docs: cited / opened | Keystrokes | Named its own residual difference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude, 12 | 12 | 4 | 12 | 4 | 0 | 5 | 6 | 1 / 0 | 7 | 4 |
| Codex, 12 | 8 | 1 | 0 | 0 | 0 | 7 | 5 | 0 / 4 | 6 | 0 |

- **On A, the subject where the warning is a bug, the agents split by vendor.** Claude explained the stale value and the resubscription cost every time. Codex wrote one sentence each time.
- **On B and C, both explained why the obvious fix breaks**, mostly in terms of when the effect would run: "on every keystroke", "on prompt edits", "reset an edited time".
- **Mount-only and triggers.**
  - Claude on C: "the effect should run once on mount" (c-claude-2); "these are the real triggers for the save, but the effect body never read them" (c-claude-2).
  - Codex on C, in every run: "preserving the existing autosave triggers".
- **React's docs.**
  - **Cited:** b-claude-2 cited React's recommended pattern.
  - **Opened:** Codex opened react.dev's `useEffectEvent` reference in 4 runs (b-codex-1, b-codex-3, b-codex-4, c-codex-4), and "Removing Effect Dependencies" in one (c-codex-4). b-claude-3 tried WebFetch on Oxlint's rule page, and Claude Code refused it.
  - No run mentioned "You Might Not Need an Effect", though two B paths ended up doing what it describes.
- **Tests and upstream.**
  - No run looked for the projects' tests. c-codex-2 searched the run dir for test and spec files and found none.
  - No run mentioned Hono's, Supabase's or Excalidraw's history, a later version or the upstream fix.
- **Verification.**
  - Claude Code tried a shell command in all 13 sessions, to list folders, find a linter or lint. Every lint attempt was refused ("needed approval"), including `npx -y oxlint@1.86.0` in c-claude-3. The messages say so: "I couldn't re-run the linter because the folder has no `node_modules`."
  - b-claude-4 searched a cached Oxlint binary in `~/.npm/_npx` with Grep "and confirmed both hook rules know about `useEffectEvent`."
  - Codex linted in every run, with the main checkout's `node_modules/.bin/oxlint`. In 7 of 12 runs it read Ultracite's presets from the main checkout's `packages/cli/config/oxlint/` to configure it.
  - Codex type-checked with the main checkout's TypeScript and `@types/react` from `~/.npm/_npx`, and ran its own behaviour checks: "69 in-memory behavior comparisons pass" (b-codex-1), "All 17 before/after behavior checks passed" (b-codex-3). Several wrote a small React stand-in to run the hook.
- **Length.** Claude's final messages run to several paragraphs, Codex's to one or two sentences.

## 6. Sessions: tools, commands, exposure, locks

- **Tools.**
  - Claude Code used Read, Edit, Bash, Glob and Grep, and once ToolSearch and WebFetch: 5–23 tool calls a run, 5–20 model calls.
  - Codex used `exec`, through which it ran shell commands, `apply_patch`, Node and Python scripts, and its web tool: 7–24 tool calls, 8–26 model calls.
- **What Codex looked at outside the run dir:**
  - `AGENTS.md` in every directory from `/` down, in most runs. It found none.
  - Listings of the run root and its parents. They show the topic's other runs and the other topics as `d---------`. One `rg` over the run root (b-codex-3) hit "Permission denied" on every locked run.
  - The main checkout, which its user-level memory names: `node_modules/.bin/oxlint`, TypeScript, `package.json`, `oxlint.config.ts`, and the Oxlint `core` and `react` presets under `packages/cli/config/oxlint/`. These are Ultracite's own presets, the ones a user's `node_modules` would hold.
  - `~/.npm/_npx` and `~/.bun/install/cache`: Ultracite, Oxlint and React `package.json` files for versions, and `@types/react` for type checks. Also searches for jsdom, react-test-renderer and similar packages to run a behaviour check.
  - react.dev, as above.
- **Exposure.** Every tool input in every log was checked against `EXPOSURE_PATTERNS`, and every call outside the run dir was read by hand.
  - **No tool call read** a locked path, the corpus's examples, results, calibration or scripts, a clone or history clone, another run's files, the harness, the scratchpad, the bibliography or a post draft.
  - **Hono.** No path into an installed Hono appears in any log: not the main checkout's `node_modules/.bun/hono@4.13.5`, whose `useSyncExternalStore` is the fixed one, nor the Bun cache's copies.
  - **React.** No run read React's own source. The `installedReact` counts are `package.json` reads and `@types/react` paths.
  - **The `react.dev` URLs in every log** come from the handoff itself: each compiler diagnostic's `raw.note` in the diagnostics JSON links the rule's page on react.dev.
  - **Training data:** no run showed knowledge of Hono's fix, of Excalidraw's suppressions or of the Supabase file's history.
- **Locks.** While an agent ran, 58–104 paths were locked (median 80; more as runs accumulated) and restored after each attempt. Each batch's snapshot was checked afterwards: 53, 58, 70, 82 and 94 paths, all restored. They were:
  - this harness's own folders, earlier attempts' staging, and every other run;
  - the corpus's react-effects examples, results and calibration, every `effects-*` corpus script, and the whole corpus `out/` and `repos/`, history clones included;
  - `research/bibliography/react-effects.md` and the bibliography README;
  - `plans/`, `lint-configs/`, the system temp directory's `ultracite-research-*` folders and the other topics' run roots;
  - through `AGENT_EXPERIMENT_EXTRA_LOCKS`, 10 paths: the orchestrating session's scratchpad (the corpus work's copies and notes, the literature notes, this experiment's scripts), the batch-log folder, and the corpus `repos/` and `out/` of the four other worktrees that have them.

  Not locked: `node_modules`, and the session transcripts under `~/.claude/projects` (the `orchestratorScratch` and `sessionLogs` patterns check them; no tool input named them).
- **Codex's memory.** `MEMORY.md`, `memory_summary.md` and `raw_memories.md` were rewritten during the pilot and the first batch by Codex's consolidation, and not afterwards. After every batch, no memory file mentioned the experiment, the subjects or the rules (checked by `grep`).
- **Project instructions:** none loaded in any run. There's no `AGENTS.md` or `CLAUDE.md` in the run dir or above it, so the template's "Specify all dependencies in hook dependency arrays correctly" was never in play.

## 7. React Doctor

React Doctor's licence (Modified MIT, Million Software) asks for written permission to use the software "as training, fine-tuning, or evaluation data". Its rules reach this experiment only through Ultracite's ESLint react preset, which is what Ultracite ships to users. The oracle doesn't use React Doctor, and no count, outcome or verdict here includes its diagnostics: they're in their own fields (`reactDoctor`, `newReactDoctorRules`, `reactDoctorStillReported`) and in their own table in `tables.md`, so they can be dropped from the post. On these subjects they're empty everywhere: React Doctor reported nothing on the prepared subjects, the agents' files, the mutants or the deterministic paths.

## 8. The pilot

Two runs, `c-claude-pilot` and `c-codex-pilot`, are kept in `superseded-runs/` and not aggregated. They used the final setup and were re-measured with the final code. Both kept C's behaviour and cleared all four issues on the first attempt, like the final runs.

- **Claude** used Effect Events and passed the triggers to the save event as unused arguments.
- **Codex** used the ref guard.

## 9. Issues in Ultracite (not fixed)

1. **On a real bug, the default handoff gets the linters' half-fix, and Ultracite reports it as fixed.**
   - 7 of 8 A runs listed the dependencies, as the help text "Either include it or remove the dependency array" says. The result still shows the old store's value after a switch, and resubscribes on every render with inline functions.
   - No run left A for review, though the prompt asks agents to preserve behaviour and Claude said the edit changes it.
   - "Fixed 2 of 2 issues" was printed for all 8, including the run that kept the bug on purpose.
2. **`ultracite fix --unsafe` breaks two of three subjects with no warning, with Oxlint and with Biome.** B crashes on its first render, because the added `validate` is read before its declaration. C saves the chat on every prompt keystroke. A gets the half-fix. Neither linter prints what it changed.
3. **ESLint's react block skips `.ts` files** (corpus REPORT §7.1).
   - A's bug and C's omissions are invisible to an ESLint user, while Oxlint and Biome see them.
   - **C's upstream suppressions become errors.** In a `.ts` file, ESLint reports each `// eslint-disable-next-line react-hooks/exhaustive-deps` as "Definition for rule 'react-hooks/exhaustive-deps' was not found.", with that rule id. `ultracite fix --claude` would hand the two to an agent, and the quickest way to clear them is to delete the comments that record the intent.
4. **The compiler rule's "extra dependencies" pushes agents into indirection.**
   - Every C run cleared it by making the effect read its triggers: a string key, unused Effect Event arguments, or a ref that compares the previous values and returns early.
   - Each keeps the behaviour, but the code is harder to read. The ref guard runs the effect on every chat change (56 runs against 20) to do nothing.
   - The rule's help suggests removing the triggers, and that is the edit that breaks C (variant c06). No agent took it.
5. **Rules the compiler couldn't see before an edit look like new problems after it.** Moving B's effects below `validate` let the compiler analyse the component, and `react/set-state-in-effect` was reported once more. Ultracite's retry prompt hands it over as "new since the previous edit", and its help led Codex to remove both effects. Here behaviour held; on other code that's a bigger change than the dependency fix that started it.
6. **Explanations are discarded unless an issue is left for review** (also todo-comments §9.3 and sort-keys §8.4). In 24 of 24 runs Ultracite printed only "Fixed N of N".
   - That hides three Claude A runs saying the edit changes when the hook subscribes.
   - It hides a-claude-2's reason for keeping the bug.
   - It hides three C runs naming a case their edit handles differently.
7. **The handoff's guidance points one way.** None of the help texts mentions `useEffectEvent`, refs or "You Might Not Need an Effect" (corpus REPORT §4.5). The agents brought `useEffectEvent` themselves in 11 runs, and Codex looked it up on react.dev in 4.

Also noted, not Ultracite's code:

- Claude Code's `-p` permissions refused every lint, check and download command, so no Claude run could verify its edit.
- Codex found a linter and Ultracite's presets through its user-level memory of the checkout and through global caches, as in earlier topics.
- Codex has a web tool, which it used to open react.dev.
- **A harness redaction gap.** `scripts/session-stats.cjs` cuts Codex tool inputs to 600 characters before topics redact them, so a cut can end inside the home directory. That left the start of a home-directory path in the committed `results/accessibility/runs/a-rules-codex-1/measure.json`, which was redacted to `~` when this topic was committed. This topic scrubs such tails (`scrubCutHome`), and its committed files are clean. The shared script was left as it was.

## 10. Harness changes

- **`scripts/topics/react-effects.cjs`** (new):
  - subjects, preparation (running `ultracite init --frameworks react` for each linter, stripping, the comment check, deleting C's suppressions, normalising, checks);
  - the collect and verify hooks with the handoff filter;
  - the four views, with React Doctor kept apart;
  - the effect reading;
  - measure; the self-test with the mutants and the mirror check;
  - the deterministic paths with the real adapters;
  - aggregate and tables.

  It imports the corpus's `effects-oracle.cjs` and `effects-runtime.cjs` unchanged, so no corpus output changes.
- **`scripts/ultracite-adapters.cjs`:** `oxlintPass` and `biomePass` take an optional `passthrough`, as `runOxlintPass` and `runBiomePass` in `linters.ts` do.
  - With `--unsafe`, Oxlint's `--fix` becomes `--fix-dangerously`, and Biome gets the flag before `--reporter=json`.
  - With none, the default, the commands are byte for byte the ones every earlier topic ran.
  - The hash-checked slices of the CLI source are unchanged.
- **`.gitignore`:** comments name this topic. The per-attempt patterns already cover its session logs, stdout and stderr, in `runs/` and `superseded-runs/`.
- **`harness-tests/react-effects/mutants.json`** (new): the 22 mutants.
- **Earlier topics reproduce.** Each earlier topic's self-test was run, every run re-measured, and every topic re-aggregated from committed files, twice: at HEAD before any change here, and after all of them. Results folders were restored afterwards.

  | Topic | Self-test | Before vs after the changes | Against the committed files (apart from `generatedAt`) |
  | --- | --- | --- | --- |
  | cognitive-complexity | passes | identical | identical |
  | floating-promises | passes | identical | **new drift:** `fp1-claude-3`'s added-rule counts lose `promise/prefer-await-to-then` and `github/no-then`, which 947ca03e ("Turn off name-only promise chain rules") turned off after the runs |
  | security-rules | passes | identical | the known preset drift: Biome's `noUndeclaredDependencies` (c9b606af) in the s2 runs, and `sonarjs/regex-complexity` (7984c6e9) |
  | dead-code | passes | identical | the known `sonarjs/void-use` drift (7984c6e9) |
  | import-cycles | passes | identical | identical |
  | accessibility | passes | identical | `hasSessionLog` flips to false (its gitignored session logs aren't in this worktree) |
  | todo-comments | passes | identical | `hasSessionLog`, as above. **New drift from 947ca03e:** `promise/prefer-await-to-then`, `github/no-then` and `unicorn/prefer-await` drop out of the per-run rule counts, and the mirror check's diagnostic counts in `oracle-self-test.json` fall by 1–2 |
  | sort-keys | passes | identical | `hasSessionLog`, as above |

- **Prompt drift.** These runs used `prompt.ts` d4fd60cb…, the same as the todo-comments and sort-keys runs: nothing in the prompt changed since them.
  - `agents.ts` (2afbcf99…), `index.ts` (e0b222a3…), `linters.ts` (ba0fc725…), `run-agent.ts` (da583d85…) and `diff.ts` (c164c983…) are unchanged too.
  - The accessibility runs used d8ab94fc… and the five earlier topics 8c5e6e7e….
  - `run-one.mjs` checked the agent arguments against `agents.ts` before every run.

## 11. Caveats

- **Sample:** 4 runs per subject and agent, one file each. Every cell is uniform in the oracle's verdict, so the results that matter are not noisy: 0 of 8 fixed A, 16 of 16 kept B and C. Differences in method (Codex's ref guard against Claude's key, Codex's render-time updates) are 4-run observations.
- **The handoff is filtered** (§1.4), and here that changed decisions: all five retries were for rules a real project would have handed over in the first prompt, along with 10 to 22 issues in all. With them in front of it from the start, an agent's attention to the dependency arrays could differ.
- **The oracle is the corpus's:** stubs, a minimal DOM, two modes per subject, no Strict Mode and no server rendering. a-claude-2's rewrite of the server-render path and c-claude-3's Strict Mode claim are unmeasured. The oracle compares what effects do (texts, subscriptions, fields, loads and saves), not how often they run; the effect-run counts are recorded beside it.
- **"Right" for B and C means what the oracle checks.** Three C runs named a case their edit treats differently that the oracle doesn't exercise. The render-time rewrites of B move validation from an effect into render; the fields, errors and `onChange` calls are the same in every scenario.
- **The subjects are famous code**, and A's fix is in the main checkout's `node_modules`. No run read it or showed it knew the history.
- **The run dir isn't a full project.** It has no `node_modules` and no git, and its path names the experiment and the topic (`…/ultracite-agent-experiment/react-effects/<run>/`), as in every topic. So Claude couldn't lint at all, and Codex linted with its own configuration of the main checkout's Oxlint.
- **Claude's reasoning isn't logged.** Its thinking blocks are empty, so "what it understood" for Claude comes from its messages. For Codex it includes reasoning summaries, which may say more than its short final messages.
- **Codex used the web.** It opened public react.dev pages in 4 runs. No request carried personal data; it was reference documentation, not the subjects' history, but it is guidance the other runs didn't have.
- **The edit reading is heuristic** (effects found by what they read, constructs by count), and was refined once before the runs, when the self-test showed it read B's extracted keys as removed triggers. The hand classification, by one rater who saw the automatic readings, is the reference.
- **React Doctor** is kept apart (§7): nothing depends on it, and it reported nothing here.
- **User-level configuration applied:** Codex's memories, plugins and web tool, and Claude Code's plugins and settings. The user-level instruction files are empty.
- **Context, not a comparison.** Outside this experiment, the bibliography (react-effects 5.5) records that in the AIDev v5 dataset, agents wrote 984 `exhaustive-deps` suppression lines in 566 pull requests (347 merged). In lint-fix pull requests they added the dependency in some places and suppressed the rest as "intentional patterns". Ultracite's prompt forbids suppressions, and no run here added one. The two settings differ too much for the numbers to be compared.

## 12. Reproduce

From `research/agent-experiment/`:

```sh
export RESEARCH_TOPIC=react-effects
node scripts/prepare-subjects.cjs        # subjects/react-effects/ (runs ultracite init --frameworks react for each linter; stripFields, TEXT_EDITS, the comment check, C's suppressions deleted, normalised, checked; ~1 min)
node scripts/test-behavior-harness.cjs   # oracle and classifier self-test (25) and the mirror against the CLI (25) -> oracle-self-test.json (~1 min)
AGENT_EXPERIMENT_EXTRA_LOCKS=<paths> node scripts/run-batch.mjs a:claude:1 b:codex:1 c:claude:1 ...   # 4 of each subject and agent
node scripts/aggregate.cjs               # results.json, with the deterministic paths and the mutant matrix (~8 min)
node scripts/report-tables.cjs > results/react-effects/tables.md
```

- **Re-measuring without the session logs:** `measure.cjs <run>` re-measures a run from its committed files in about 20 seconds, carrying the session-derived fields over from `measure.json`. All 24 were re-measured with the final code.
- **This report's runs** set `AGENT_EXPERIMENT_EXTRA_LOCKS` from a wrapper that listed the scratchpad, the batch-log folder and the other worktrees' clones and outputs, and checked every lock's mode before and after each batch.
- **The hand classification** is an input (`classifications.json`).

## 13. Files

| Path (under `research/agent-experiment/`) | Contents |
| --- | --- |
| `scripts/topics/react-effects.cjs` | the topic |
| `scripts/ultracite-adapters.cjs` | the mirror, now with an optional passthrough |
| `subjects/react-effects/` | the three subjects; `run-files/` (init's files as the fix pass leaves them, and `tsconfig.json`); `init/` (what `ultracite init --frameworks react` writes for Oxlint, Biome and ESLint); `subjects.json`. Oxlint's two configs are stored with a `.txt` suffix. |
| `harness-tests/react-effects/mutants.json` | 22 hand-made mutants with their expected readings |
| `results/react-effects/runs/` | 24 runs: meta, handoff, before/after, per-attempt artifacts, measure.json |
| `results/react-effects/superseded-runs/` | the pilot (not aggregated) |
| `results/react-effects/results.json`, `tables.md`, `classifications.json`, `oracle-self-test.json`, `README-section.md` | aggregate, tables, hand classification, self-test and mirror check, the section for `research/README.md` |
| `../corpus/scripts/effects-oracle.cjs`, `effects-runtime.cjs` | the oracle and its runtime, shared with the corpus |
