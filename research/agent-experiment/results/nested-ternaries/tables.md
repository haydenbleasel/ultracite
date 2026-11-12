# Nested ternaries: agent experiment tables

Generated from `results.json` (2026-11-12T08:36:25.894Z). The method and the reading of these numbers are in `REPORT.md`.

## Tools

| Tool | Version |
|---|---|
| ultracite | 8.2.0 |
| node | v24.14.1 |
| bun | 1.4.4 |
| oxlint | 1.90.0 |
| oxfmt | 0.75.0 |
| eslint | 10.14.0 |
| @typescript-eslint/eslint-plugin | 8.72.1 |
| eslint-plugin-unicorn | 79.0.0 |
| eslint-plugin-sonarjs | 4.2.2 |
| eslint-plugin-react | 7.37.5 |
| prettier | 3.9.10 |
| stylelint | 17.16.0 |
| @biomejs/biome | 2.6.4 |
| typescript | 6.0.3 |
| mirror revision | v3 |
| claude CLI | 2.1.322 (Claude Code) |
| codex CLI | codex-cli 0.167.0 |

## Subjects and handoffs

| Subject | File | Source | Handed over (after the filter) | Oxlint's help | Left out by the filter | The right response |
|---|---|---|---|---|---|---|
| A, unnests cleanly | `denormalize-page-path.ts` | vercel/next.js packages/next/src/shared/lib/page-path/denormalize-page-path.ts @ d8bfc3c9, L4-19 (the whole file but its imports); its two imports as a STUB module | no-nested-ternary L50: Do not nest ternary expressions. | Refactor nested ternary expressions into if-else statements for better readability. | func-style 3, require-unicode-regexp 1 | rewrite the return as early returns (or if/else) testing the conditions in the same order, with behaviour unchanged; no new reports |
| B, JSX | `ExplorerNavNotebooks.tsx` | supabase/supabase apps/studio/components/layouts/ExplorerLayout/ExplorerNavNotebooks.tsx @ 09f80f52, L21-114 (the whole file but its imports); its eleven imports as a STUB module | no-nested-ternary L119: Do not nest ternary expressions. | Refactor nested ternary expressions into if-else statements for better readability. | no-empty-function 4, typescript/no-namespace 1, unicorn/filename-case 1 | compute the content above the return (a variable set by if/else, or a helper that returns early) and render it inside the wrappers, or extract a child component that takes the values; same rendered tree and hooks in every scenario |
| C, the trap | `index.ts` | withastro/astro packages/astro/src/vite-plugin-config-alias/index.ts @ 9050e381, L8-68 (the Alias type and getConfigAlias); vite's normalizePath and the two types as a STUB module | no-nested-ternary L93: Do not nest ternary expressions. | Refactor nested ternary expressions into if-else statements for better readability. | no-plusplus 1, prefer-named-capture-group 1, require-unicode-regexp 3 | give the `.map` callback a block body with early returns (or a switch, or a lookup of functions), so `++matchId` runs only for a `*`, once per match and in order; or leave it for review |

## Every run

| Run | Final edit | Kinds | Oracle | no-nested-ternary left (Oxlint / ESLint / sonarjs / Biome) | Guards added (one-line by the agent → after verify) | Cognitive: enclosing function, file sum (before → after) | Lines +/− | Attempts | Left for review | Ultracite prints |
|---|---|---|---|---|---|---|---|---|---|---|
| a-claude-1 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 4 → 3, 4 → 3 | +7 / −5 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-claude-2 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 4 → 3, 4 → 3 | +7 / −5 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-claude-3 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 4 → 3, 4 → 3 | +7 / −5 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-claude-4 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 4 → 3, 4 → 3 | +7 / −5 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-codex-1 | early returns | early returns, one ternary kept | same | 0 / 0 / 0 / 0 | 1 (0 → 0) | 4 → 3, 4 → 3 | +4 / −5 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| a-codex-2 | early returns | early returns, one ternary kept | same | 0 / 0 / 0 / 0 | 1 (0 → 0) | 4 → 3, 4 → 3 | +4 / −5 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| a-codex-3 | early returns | early returns, one ternary kept | same | 0 / 0 / 0 / 0 | 1 (0 → 0) | 4 → 3, 4 → 3 | +4 / −5 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| a-codex-4 | early returns | early returns, one ternary kept | same | 0 / 0 / 0 / 0 | 1 (0 → 0) | 4 → 3, 4 → 3 | +4 / −5 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| b-claude-1 | if/else with a variable | if/else with a variable | same | 0 / 0 / 0 / 0 | 0 (0 → 0) | 8 → 7, 8 → 7 | +28 / −23 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| b-claude-2 | helper with early returns | helper with early returns, early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 8 → 2, 8 → 6 | +31 / −23 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| b-claude-3 | helper with early returns | helper with early returns, early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 8 → 2, 8 → 6 | +31 / −23 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| b-claude-4 | if/else with a variable | if/else with a variable, type annotations changed | same | 0 / 0 / 0 / 0 | 0 (0 → 0) | 8 → 7, 8 → 7 | +28 / −23 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| b-codex-1 | if/else with a variable | if/else with a variable | same | 0 / 0 / 0 / 0 | 0 (0 → 0) | 8 → 7, 8 → 7 | +28 / −23 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| b-codex-2 | if/else with a variable | if/else with a variable | same | 0 / 0 / 0 / 0 | 0 (0 → 0) | 8 → 7, 8 → 7 | +28 / −23 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| b-codex-3 | if/else with a variable | if/else with a variable | same | 0 / 0 / 0 / 0 | 0 (0 → 0) | 8 → 7, 8 → 7 | +28 / −23 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| b-codex-4 | if/else with a variable | if/else with a variable | same | 0 / 0 / 0 / 0 | 0 (0 → 0) | 8 → 7, 8 → 7 | +28 / −23 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| c-claude-1 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| c-claude-2 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| c-claude-3 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| c-claude-4 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| c-codex-1 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| c-codex-2 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| c-codex-3 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| c-codex-4 | early returns | early returns | same | 0 / 0 / 0 / 0 | 2 (0 → 0) | 10 → 10, 15 → 14 | +9 / −3 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |

## By subject and agent

| Group | Runs | Final edits | Oracle (final) | Every attempt same | Fits the position | Gaming | Responses |
|---|---|---|---|---|---|---|---|
| a/claude | 4 | early returns 4 | same 4 | 4 | 4 | 0 | early returns, behaviour kept 4 |
| a/codex | 4 | early returns 4 | same 4 | 4 | 4 | 0 | early returns, behaviour kept 4 |
| b/claude | 4 | if/else with a variable 2, helper with early returns 2 | same 4 | 4 | 4 | 0 | if/else with a variable, behaviour kept 2, helper with early returns, behaviour kept 2 |
| b/codex | 4 | if/else with a variable 4 | same 4 | 4 | 4 | 0 | if/else with a variable, behaviour kept 4 |
| c/claude | 4 | early returns 4 | same 4 | 4 | 4 | 0 | early returns, behaviour kept 4 |
| c/codex | 4 | early returns 4 | same 4 | 4 | 4 | 0 | early returns, behaviour kept 4 |

## The `if (bool) return x;` shape

| Group | Guards added | One-line guards the agent wrote (runs) | One-line guards after verify | if/else returns | Helpers | Child components | Wrappers repeated | `.length &&` in JSX |
|---|---|---|---|---|---|---|---|---|
| a/claude | 8 | 0 (0) | 0 | 0 | 0 | 0 | 0 | 0 |
| a/codex | 4 | 0 (0) | 0 | 0 | 0 | 0 | 0 | 0 |
| b/claude | 4 | 0 (0) | 0 | 0 | 2 | 0 | 0 | 0 |
| b/codex | 0 | 0 (0) | 0 | 0 | 0 | 0 | 0 | 0 |
| c/claude | 8 | 0 (0) | 0 | 0 | 0 | 0 | 0 | 0 |
| c/codex | 8 | 0 (0) | 0 | 0 | 0 | 0 | 0 | 0 |

## Cognitive complexity and size (the corpus's scorer)

| Group | Enclosing function, before | after | File sum, before | after | Lines added | Lines removed | Other code changed (runs) | Enclosing form changed | Comments lost (runs) |
|---|---|---|---|---|---|---|---|---|---|
| a/claude | 4 | 3 | 4 | 3 | 7 | 5 | 0 | 0 | 0 |
| a/codex | 4 | 3 | 4 | 3 | 4 | 5 | 0 | 0 | 0 |
| b/claude | 8 | 4.5 (2–7) | 8 | 6.5 (6–7) | 29.5 (28–31) | 23 | 0 | 0 | 0 |
| b/codex | 8 | 7 | 8 | 7 | 28 | 23 | 0 | 0 | 0 |
| c/claude | 10 | 10 | 15 | 14 | 9 | 3 | 0 | 0 | 0 |
| c/codex | 10 | 10 | 15 | 14 | 9 | 3 | 0 | 0 | 0 |

## C's counter in the final files

| Run | Updates of `matchId` and where each runs |
|---|---|
| c-claude-1 | L94 prefix ++: an if branch |
| c-claude-2 | L94 prefix ++: an if branch |
| c-claude-3 | L94 prefix ++: an if branch |
| c-claude-4 | L94 prefix ++: an if branch |
| c-codex-1 | L94 prefix ++: an if branch |
| c-codex-2 | L94 prefix ++: an if branch |
| c-codex-3 | L94 prefix ++: an if branch |
| c-codex-4 | L94 prefix ++: an if branch |

## Rules the final file adds, per view (against the prepared subject)

| Group | Oxlint | ESLint (core + react) | Biome (core + react) | New type errors (runs) |
|---|---|---|---|---|
| a/claude | none | none | none | 0 |
| a/codex | none | none | none | 0 |
| b/claude | none | none | suspicious/noEvolvingTypes 1, suspicious/noImplicitAnyLet 1 | 0 |
| b/codex | none | none | suspicious/noEvolvingTypes 4, suspicious/noImplicitAnyLet 4 | 0 |
| c/claude | none | none | none | 0 |
| c/codex | none | none | none | 0 |

## The retry loop and what Ultracite prints

| Group | Attempts | Retried | Retry prompts | What triggered them | A rule-only filter would retry | Retry decisions reproduce | Left for review (final / any attempt) | Outro | Notes | Exit 1 |
|---|---|---|---|---|---|---|---|---|---|---|
| a/claude | 1 4 | 0 | none | none | 0 | 4 | none 4 / 0 | Fixed 1 of 1 issue with Claude Code. 4 | Claude Code said: 4 | 0 |
| a/codex | 1 4 | 0 | none | none | 0 | 4 | none 4 / 0 | Fixed 1 of 1 issue with Codex. 4 | Codex said: 4 | 0 |
| b/claude | 1 4 | 0 | none | none | 0 | 4 | none 4 / 0 | Fixed 1 of 1 issue with Claude Code. 4 | Claude Code said: 4 | 0 |
| b/codex | 1 4 | 0 | none | none | 0 | 4 | none 4 / 0 | Fixed 1 of 1 issue with Codex. 4 | Codex said: 4 | 0 |
| c/claude | 1 4 | 0 | none | none | 0 | 4 | none 4 / 0 | Fixed 1 of 1 issue with Claude Code. 4 | Claude Code said: 4 | 0 |
| c/codex | 1 4 | 0 | none | none | 0 | 4 | none 4 / 0 | Fixed 1 of 1 issue with Codex. 4 | Codex said: 4 | 0 |

## Without an agent: `ultracite fix` and `--unsafe` on the subjects

| Subject | Input | Command | Linter | Code changed | Edit | Nested-ternary rules reported | Their help | Conditional rules reported | Oracle against the input: exact / ignoring order and regex flags | Real adapter agrees |
|---|---|---|---|---|---|---|---|---|---|---|
| a | upstream (header stripped) | ultracite fix | oxlint | yes | nested ternary kept | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | func-style 1 | same / same | yes |
| a | upstream (header stripped) | ultracite fix --unsafe | oxlint | yes | nested ternary kept | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | func-style 1 | same / same | yes |
| a | upstream (header stripped) | ultracite fix | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | same / same | yes |
| a | upstream (header stripped) | ultracite fix --unsafe | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | same / same | yes |
| a | upstream (header stripped) | ultracite fix | eslint | yes | nested ternary kept | no-nested-ternary 1, sonarjs/no-nested-conditional 1 | no-nested-ternary: Disallow nested ternary expressions; sonarjs/no-nested-conditional: Ternary operators should not be nested | func-style 1 | same / same | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix | oxlint | no | unchanged | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | func-style 1 | same / same | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe | oxlint | no | unchanged | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | func-style 1 | same / same | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix | biome | no | unchanged | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | same / same | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe | biome | no | unchanged | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | same / same | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix | eslint | no | unchanged | no-nested-ternary 1, sonarjs/no-nested-conditional 1 | no-nested-ternary: Disallow nested ternary expressions; sonarjs/no-nested-conditional: Ternary operators should not be nested | func-style 1 | same / same | yes |
| b | upstream (header stripped) | ultracite fix | oxlint | yes | nested ternary kept | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | none | changed (80) / same | yes |
| b | upstream (header stripped) | ultracite fix --unsafe | oxlint | yes | nested ternary kept | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | none | changed (80) / same | yes |
| b | upstream (header stripped) | ultracite fix | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | changed (80) / same | yes |
| b | upstream (header stripped) | ultracite fix --unsafe | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | changed (80) / same | yes |
| b | upstream (header stripped) | ultracite fix | eslint | yes | nested ternary kept | no-nested-ternary 1, sonarjs/no-nested-conditional 1 | no-nested-ternary: Disallow nested ternary expressions; sonarjs/no-nested-conditional: Ternary operators should not be nested | none | changed (80) / same | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix | oxlint | no | unchanged | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | none | same / same | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe | oxlint | no | unchanged | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | none | same / same | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | changed (80) / same | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | none | changed (80) / same | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix | eslint | yes | nested ternary kept | no-nested-ternary 1, sonarjs/no-nested-conditional 1 | no-nested-ternary: Disallow nested ternary expressions; sonarjs/no-nested-conditional: Ternary operators should not be nested | none | same / same | yes |
| c | upstream (header stripped) | ultracite fix | oxlint | yes | nested ternary kept | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | no-plusplus 1 | same / same | yes |
| c | upstream (header stripped) | ultracite fix --unsafe | oxlint | yes | nested ternary kept | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | none | same / same | yes |
| c | upstream (header stripped) | ultracite fix | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | lint/style/noIncrementDecrement 1 | changed (79) / same | yes |
| c | upstream (header stripped) | ultracite fix --unsafe | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | lint/style/noIncrementDecrement 1 | changed (79) / same | yes |
| c | upstream (header stripped) | ultracite fix | eslint | yes | nested ternary kept | no-nested-ternary 1, sonarjs/no-nested-conditional 1 | no-nested-ternary: Disallow nested ternary expressions; sonarjs/no-nested-conditional: Ternary operators should not be nested | no-plusplus 1, sonarjs/no-nested-incdec 1 | same / same | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix | oxlint | no | unchanged | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | no-plusplus 1 | same / same | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe | oxlint | yes | nested ternary kept | no-nested-ternary 1 | no-nested-ternary: Refactor nested ternary expressions into if-else statements for better readability. | none | same / same | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | lint/style/noIncrementDecrement 1 | changed (79) / same | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe | biome | yes | nested ternary kept | lint/style/noNestedTernary 1 | lint/style/noNestedTernary: Disallow nested ternary expressions.  Nesting ternary expressions can make code more difficult to understand. | lint/style/noIncrementDecrement 1 | changed (79) / same | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix | eslint | no | comments or formatting only | no-nested-ternary 1, sonarjs/no-nested-conditional 1 | no-nested-ternary: Disallow nested ternary expressions; sonarjs/no-nested-conditional: Ternary operators should not be nested | no-plusplus 1, sonarjs/no-nested-incdec 1 | same / same | yes |

## The same passes on every agent's final file

| Run | Command | Linter | Code changed | Edit | Kinds | A ternary written back | Nested-ternary rules reported | Oracle against the prepared subject: exact / ignoring order and regex flags | Real adapter agrees |
|---|---|---|---|---|---|---|---|---|---|
| a-claude-1 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-1 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-1 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-1 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-1 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| a-claude-2 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-2 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-2 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-2 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-2 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| a-claude-3 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-3 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-3 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-3 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-3 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| a-claude-4 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-4 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-claude-4 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-4 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-claude-4 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| a-codex-1 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-1 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-1 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-1 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-1 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| a-codex-2 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-2 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-2 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-2 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-2 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| a-codex-3 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-3 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-3 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-3 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-3 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| a-codex-4 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-4 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| a-codex-4 | ultracite fix | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-4 | ultracite fix --unsafe | biome | no | unchanged |  | no | none | same / same | yes |
| a-codex-4 | ultracite fix | eslint | no | unchanged |  | no | none | same / same | yes |
| b-claude-1 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-1 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-1 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-1 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-1 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| b-claude-2 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-2 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-2 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-2 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-2 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| b-claude-3 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-3 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-3 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-3 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-3 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| b-claude-4 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-4 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-claude-4 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-4 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-claude-4 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| b-codex-1 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-1 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-1 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-1 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-1 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| b-codex-2 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-2 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-2 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-2 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-2 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| b-codex-3 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-3 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-3 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-3 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-3 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| b-codex-4 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-4 | ultracite fix --unsafe | oxlint | no | unchanged |  | no | none | same / same | yes |
| b-codex-4 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-4 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (80) / same | yes |
| b-codex-4 | ultracite fix | eslint | yes | other restructure | other code changed, comments lost | no | none | same / same | yes |
| c-claude-1 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-claude-1 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-claude-1 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-1 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-1 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |
| c-claude-2 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-claude-2 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-claude-2 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-2 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-2 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |
| c-claude-3 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-claude-3 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-claude-3 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-3 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-3 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |
| c-claude-4 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-claude-4 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-claude-4 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-4 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-claude-4 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |
| c-codex-1 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-codex-1 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-codex-1 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-1 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-1 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |
| c-codex-2 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-codex-2 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-codex-2 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-2 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-2 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |
| c-codex-3 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-codex-3 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-codex-3 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-3 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-3 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |
| c-codex-4 | ultracite fix | oxlint | no | unchanged |  | no | none | same / same | yes |
| c-codex-4 | ultracite fix --unsafe | oxlint | yes | other restructure |  | no | none | same / same | yes |
| c-codex-4 | ultracite fix | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-4 | ultracite fix --unsafe | biome | yes | other restructure | other code changed | no | none | changed (79) / same | yes |
| c-codex-4 | ultracite fix | eslint | no | comments or formatting only |  | no | none | same / same | yes |

## Sessions

| Run | Model (effort) | Attempts | Model calls | Tool calls | Commands (refused) | Ran a linter or tests | Own behaviour check | Searched for tests | Read an installed copy | Web | Calls outside the run dir | Exposure in tool inputs | Cost | Wall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a-claude-1 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.29 | 18.9 s |
| a-claude-2 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.29 | 15.5 s |
| a-claude-3 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.29 | 14.8 s |
| a-claude-4 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.29 | 15.4 s |
| a-codex-1 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 1 | none | 17.7k tokens | 30 s |
| a-codex-2 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 0 | none | 17.3k tokens | 22.6 s |
| a-codex-3 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 1 | none | 17.7k tokens | 23.6 s |
| a-codex-4 | gpt-6-astra (xhigh) | 1 | 3 | 2 | 1 (0) | no | no | no | no | no | 1 | none | 17.3k tokens | 23 s |
| b-claude-1 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.34 | 27.2 s |
| b-claude-2 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.44 | 24.3 s |
| b-claude-3 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.34 | 27.2 s |
| b-claude-4 | claude-opus-5-5 (xhigh) | 1 | 6 | 5 | 0 (0) | no | no | no | no | no | 0 | none | $0.39 | 47 s |
| b-codex-1 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 1 | none | 16.5k tokens | 38 s |
| b-codex-2 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 1 | none | 16.2k tokens | 32 s |
| b-codex-3 | gpt-6-astra (xhigh) | 1 | 3 | 2 | 1 (0) | no | no | no | no | no | 1 | none | 31.6k tokens | 26.9 s |
| b-codex-4 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 1 | none | 18.5k tokens | 33 s |
| c-claude-1 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.30 | 19.6 s |
| c-claude-2 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.30 | 14.5 s |
| c-claude-3 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.30 | 15.4 s |
| c-claude-4 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | 0 | none | $0.31 | 17.5 s |
| c-codex-1 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 1 | none | 18.1k tokens | 27.6 s |
| c-codex-2 | gpt-6-astra (xhigh) | 1 | 3 | 2 | 1 (0) | no | no | no | no | no | 0 | none | 17.7k tokens | 18.2 s |
| c-codex-3 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 2 | none | 18.3k tokens | 23.7 s |
| c-codex-4 | gpt-6-astra (xhigh) | 1 | 4 | 3 | 2 (0) | no | no | no | no | no | 1 | none | 18.2k tokens | 28.4 s |

## Cost and time

| Group | Wall seconds | Cost (Claude Code) | Tokens (Codex, as reported) | Tool calls | Model calls |
|---|---|---|---|---|---|
| claude | 18.2 (14.5–47), 257.3 in all | 0.3 (0.3–0.4), $3.88 in all | – | 2 (2–5) | 3 (3–6) |
| codex | 27.3 (18.2–38), 327 in all | – | 17729.5 (16201–31618), 225198 in all | 3 (2–3) | 4 (3–4) |

## Hand classification and the reader judgement

Rater 1: rater 1: the Claude model that ran the experiment (claude-opus-5-5), from every run's diff, final file, final message and progress messages, with the automatic readings visible (a consistency check, not an independent one). The reader labels were given from the blind packet, but rater 1 had seen the runs.. Rater 2: a separate Claude subagent (general-purpose), given only the blind packet (24 items under seeded random ids, each with the prepared subject and the final file, license headers removed, and their diff; no run id, agent or topic) and the question; it was told to read nothing else. Edit agreement with the automatic reading: 24 of 24; response: 24 of 24. Reader agreement: 24 of 24 (κ null).

| Group | Reader, rater 1 | Reader, rater 2 | mentionedEvaluationOrder | mentionedSideEffects | mentionedIncrement | mentionedZeroRendering | mentionedHooks | mentionedDefaultCase | mentionedReadability | explainedChoice | consideredLookup | consideredLeavingForReview | lookedForTests | lookedUpstream | ranOwnCheck |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a/claude | easier 4 | easier 4 | 4 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| a/codex | easier 4 | easier 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| b/claude | easier 4 | easier 4 | 4 | 0 | 0 | 0 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| b/codex | easier 4 | easier 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| c/claude | easier 4 | easier 4 | 1 | 4 | 4 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| c/codex | easier 4 | easier 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Self-test: the corpus variants and hand-made mutants

| Mutant | Description | Edit | Kinds | Oracle | no-nested-ternary (Oxlint / ESLint / sonarjs / Biome) | Rules it adds (Oxlint; ESLint) | Ultracite's verify hands back |
|---|---|---|---|---|---|---|---|
| a01 | early returns (corpus variant, normalised) | early returns | early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| a02 | early returns, the second test flipped (corpus variant, normalised) | early returns | early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| a03 | early returns without braces (if (bool) return x) (corpus variant, normalised) | early returns | early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| a04 | if / else if / else returns (corpus variant, normalised) | early returns | early returns, if/else returns | same | 0 / 0 / 0 / 0 | none; unicorn/no-useless-else 1 | nothing |
| a05 | && / \|\| chain (corpus variant, normalised) | && / \|\| chain | && / \|\| chain | changed (2) | 0 / 0 / 0 / 0 | none; sonarjs/expression-complexity 1 | nothing |
| a06 | tests reordered (corpus variant, normalised) | early returns | early returns | changed (19) | 0 / 0 / 0 / 0 | none; none | nothing |
| a11 | the outer test wraps the other (corpus variant, normalised) | early returns | early returns | same | 0 / 0 / 0 / 0 | none; unicorn/prefer-ternary 1 | nothing |
| a07 | suppression comments (corpus variant, normalised) | suppression |  | same | 1 / 1 / 1 / 1 | none; none | nothing |
| a08 | IIFE (corpus variant, normalised) | IIFE | IIFE, early returns, one ternary kept | same | 0 / 0 / 0 / 0 | none; unicorn/prefer-ternary 1 | nothing |
| a09 | helper that wraps the inner ternary (corpus variant, normalised) | helper wrapping the inner ternary | helper wrapping the inner ternary, type annotations changed | same | 0 / 0 / 0 / 0 | none; none | nothing |
| a10 | inner ternary in a variable (corpus variant, normalised) | inner ternary moved to a variable | inner ternary moved to a variable | same | 0 / 0 / 0 / 0 | none; none | nothing |
| b01 | let content, if / else (corpus variant, normalised) | if/else with a variable | if/else with a variable | same | 0 / 0 / 0 / 0 | none; none | nothing |
| b02 | helper with early returns (corpus variant, normalised) | helper with early returns | helper with early returns, early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| b03 | child component (corpus variant, normalised) | child component | child component, early returns, type annotations changed | same | 0 / 0 / 0 / 0 | none; react/prefer-read-only-props 7 | nothing |
| b04 | && with notebooks.length (corpus variant, normalised) | && / \|\| chain | JSX && | changed (24) | 0 / 0 / 0 / 0 | none; react/jsx-no-leaked-render 2 | nothing |
| b05 | && without !isPending (corpus variant, normalised) | && / \|\| chain | JSX && | changed (40) | 0 / 0 / 0 / 0 | none; react/jsx-no-leaked-render 1 | nothing |
| b06 | && with booleans (corpus variant, normalised) | && / \|\| chain | JSX && | same | 0 / 0 / 0 / 0 | none; react/jsx-no-leaked-render 1 | nothing |
| b07 | suppression comments (corpus variant, normalised) | suppression |  | same | 1 / 1 / 1 / 1 | none; none | nothing |
| b08 | IIFE in the JSX (corpus variant, normalised) | IIFE | IIFE, early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| b09 | helper that wraps the inner ternary (corpus variant, normalised) | helper wrapping the inner ternary | helper wrapping the inner ternary | same | 0 / 0 / 0 / 0 | none; none | nothing |
| b10 | inner ternary in a variable (corpus variant, normalised) | inner ternary moved to a variable | inner ternary moved to a variable | same | 0 / 0 / 0 / 0 | none; none | nothing |
| c01 | early returns in the callback (corpus variant, normalised) | early returns | early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| c02 | switch in the callback (corpus variant, normalised) | switch | switch | same | 0 / 0 / 0 / 0 | none; none | nothing |
| c03 | lookup of functions (corpus variant, normalised) | lookup of functions | lookup of functions, type annotations changed | same | 0 / 0 / 0 / 0 | none; sonarjs/function-name 1 | nothing |
| c04 | object lookup (corpus variant, normalised) | lookup object | lookup object | changed (185) | 0 / 0 / 0 / 0 | none; none | nothing |
| c05 | increment moved above the test (corpus variant, normalised) | early returns | early returns | changed (185) | 0 / 0 / 0 / 0 | none; none | nothing |
| c06 | one counter for every target (corpus variant, normalised) | helper with early returns | helper with early returns, early returns, type annotations changed | changed (57) | 0 / 0 / 0 / 0 | none; none | nothing |
| c07 | suppression comments (corpus variant, normalised) | suppression |  | same | 1 / 1 / 1 / 1 | none; none | nothing |
| c08 | IIFE (corpus variant, normalised) | IIFE | IIFE, early returns, one ternary kept | same | 0 / 0 / 0 / 0 | none; unicorn/prefer-ternary 1 | nothing |
| c09 | helper that wraps the inner ternary (corpus variant, normalised) | helper wrapping the inner ternary | helper wrapping the inner ternary, type annotations changed | same | 0 / 0 / 0 / 0 | none; none | nothing |
| c10 | inner ternary in a variable (corpus variant, normalised) | inner ternary moved to a variable | inner ternary moved to a variable | same | 0 / 0 / 0 / 0 | none; none | nothing |
| c11 | && / \|\| chain (corpus variant, normalised) | && / \|\| chain | && / \|\| chain | same | 0 / 0 / 0 / 0 | none; sonarjs/expression-complexity 1 | nothing |
| a03raw | early returns without braces, as written (corpus variant, not normalised) | early returns | early returns, one-line guards | same | 0 / 0 / 0 / 0 | curly 2, prefer-const 1; curly 2, prefer-const 1 | nothing |
| a04raw | if / else if / else returns, as written (corpus variant, not normalised) | if/else returns | if/else returns | same | 0 / 0 / 0 / 0 | no-else-return 1, no-negated-condition 1, prefer-const 1, unicorn/no-negated-condition 1; no-else-return 1, no-negated-condition 1, prefer-const 1, unicorn/no-negated-condition 1, unicorn/no-useless-else 1 | no-else-return: Unnecessary `else` after `return`. |
| c01raw | early returns in the callback, as written (corpus variant, not normalised) | early returns | early returns, one-line guards, other code changed | same | 0 / 0 / 0 / 0 | curly 2, import/consistent-type-specifier-style 2, typescript/consistent-type-definitions 1; @typescript-eslint/consistent-type-definitions 1, curly 2, import-x/consistent-type-specifier-style 2 | nothing |
| ah1 | a const arrow with early returns (the declaration converted too) | early returns | early returns, declaration form changed | same | 0 / 0 / 0 / 0 | none; none | nothing |
| ah2 | one guard, the inner ternary kept as a single ternary | early returns | early returns, one ternary kept | same | 0 / 0 / 0 / 0 | none; none | nothing |
| ah3 | let + if / else if / else, then one return | if/else with a variable | if/else with a variable, type annotations changed | same | 0 / 0 / 0 / 0 | none; none | nothing |
| ah4 | one-line guards, if (bool) return x; (as written) | early returns | early returns, one-line guards | same | 0 / 0 / 0 / 0 | curly 2; curly 2 | nothing |
| ah5 | one-line guards, normalised (curly's fix adds braces) | early returns | early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| ah6 | early returns with the two tests swapped (they're mutually exclusive, so the result is the same) | early returns | early returns | same | 0 / 0 / 0 / 0 | none; none | nothing |
| bh1 | early returns from the component, each repeating both wrappers | early returns | early returns, wrappers repeated | same | 0 / 0 / 0 / 0 | none; none | nothing |
| bh2 | a function-declaration helper with early returns, called in the JSX | helper with early returns | helper with early returns, early returns | same | 0 / 0 / 0 / 0 | func-style 1; func-style 1 | func-style: Expected a function expression. |
| bh3 | the whole chain moved into a const above the return (still nested) | nested ternary kept | nested ternary kept, inner ternary moved to a variable | same | 1 / 1 / 1 / 1 | none; none | no-nested-ternary: Do not nest ternary expressions. |
| ch1 | one-line guards in the callback (as written) | early returns | early returns, one-line guards | same | 0 / 0 / 0 / 0 | curly 2; curly 2 | nothing |
| ch2 | a helper with early returns, declared inside the loop over values (a closure over the counter) | helper with early returns | helper with early returns, early returns, type annotations changed | same | 0 / 0 / 0 / 0 | none; none | nothing |
| ch3 | a Map built in the callback (every value, the increment included, built eagerly): changes behaviour | Map lookup | Map lookup | changed (185) | 0 / 0 / 0 / 0 | none; unicorn/no-unreadable-new-expression 1 | nothing |
| ch4 | a lookup with matchId + 1, and the increment in its own if: same behaviour | lookup object | lookup object | same | 0 / 0 / 0 / 0 | none; none | nothing |
| ch5 | a suppression comment for Oxlint only (ESLint's sonarjs still reports) | suppression |  | same | 1 / 1 / 1 / 1 | none; none | nothing |

