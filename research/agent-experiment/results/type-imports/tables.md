# Type imports: agent experiment tables

Generated from `results.json` (2026-11-18T10:50:42.120Z). The method and the reading of these numbers are in `REPORT.md`. Oracle columns read repo / kept / elided.

## Tools

| Tool | Version |
|---|---|
| ultracite | 8.3.0 |
| node | v24.14.1 |
| bun | 1.4.4 |
| oxlint | 1.90.0 |
| oxlint-tsgolint | 7.0.2005 |
| oxfmt | 0.75.0 |
| eslint | 10.14.0 |
| @typescript-eslint/eslint-plugin | 8.72.1 |
| eslint-plugin-import-x | 4.17.1 |
| eslint-plugin-unicorn | 79.0.0 |
| eslint-plugin-n | 18.5.0 |
| prettier | 3.9.10 |
| stylelint | 17.16.0 |
| @biomejs/biome | 2.6.4 |
| typescript | 6.0.3 |
| mirror revision | v4 |
| claude CLI | 2.1.327 (Claude Code) |
| codex CLI | codex-cli 0.169.0 |

## Subjects and handoffs

| Subject | File | Source | Handed over (after the filter) | Oxlint's help | Left out by the filter | tsconfig module flags | The right response |
|---|---|---|---|---|---|---|---|
| A, converts cleanly | `telemetry/flush-telemetry.ts` | vercel/next.js packages/next/src/telemetry/flush-telemetry.ts @ d8bfc3c9, L1-10 (the whole file); trace/shared.ts copied from the same commit; telemetry/storage.ts a STUB | typescript/consistent-type-imports L40: `import()` type annotations are forbidden. | typescript/consistent-type-imports: Replace `import()` type annotations with a regular type import. For example, change `type T = import('module').Type` to `import type { Type } from 'module'; type T = Type`. | func-style 1, require-await 1, typescript/no-explicit-any 8 | {"verbatimModuleSyntax":true,"isolatedModules":false,"module":"esnext","moduleResolution":"bundler","paths":null} | `import type { Telemetry } from './storage'` with `InstanceType<typeof Telemetry>` (or a type-only namespace import); storage never evaluates, in every mode |
| B, the fix passes fight | `TRPCClientError.ts` | trpc/trpc packages/client/src/TRPCClientError.ts @ 796700d8, L1-118 (the whole file); '@trpc/server/unstable-core-do-not-import' a STUB through the tsconfig's paths | import/no-duplicates L41: Modules should not be imported multiple times in the same file; no-duplicate-imports L43: '@trpc/server/unstable-core-do-not-import' import is duplicated | import/no-duplicates: Merge these imports into a single import statement; no-duplicate-imports: Merge the duplicated import into a single import statement | func-style 4, no-use-before-define 1, typescript/no-explicit-any 6, unicorn/filename-case 1 | {"verbatimModuleSyntax":true,"isolatedModules":false,"module":"esnext","moduleResolution":"bundler","paths":{"@trpc/server/unstable-core-do-not-import":["./stubs/unstable-core-do-not-import.ts"]}} | one value import of isObject and one `import type` with all six types (either order); isObject still evaluates and every call behaves as before |
| C, the trap | `client/normalize-locale-path.ts` | vercel/next.js packages/next/src/client/normalize-locale-path.ts @ d8bfc3c9, L1-10 (the whole file); shared/lib/i18n/normalize-locale-path.ts copied from the same commit | node/global-require L38: Unexpected require().; unicorn/prefer-module L38: Do not use "require".; typescript/consistent-type-imports L38: `import()` type annotations are forbidden. | node/global-require: Move require() to top-level module scope; unicorn/prefer-module: Prefer ES modules over CommonJS globals.; typescript/consistent-type-imports: Replace `import()` type annotations with a regular type import. For example, change `type T = import('module').Type` to `import type { Type } from 'module'; type T = Type`. | func-style 1, no-param-reassign 1, prefer-const 1 | {"verbatimModuleSyntax":true,"isolatedModules":false,"module":"esnext","moduleResolution":"bundler","paths":null} | keep the require inside the `__NEXT_I18N_SUPPORT` branch and type it without `import()` (a cast to `{ normalizeLocalePath: typeof Fn }`, or a type-only namespace import); leave node/global-require and unicorn/prefer-module for review, because a static import loads the i18n module in every app |

## Every run

| Run | Agent's form → after verify | Oracle, agent's file | Oracle, after verify | Subject's rules left (Oxlint) | Inline `type` (agent / verified) | `import type` declarations | B: declarations, isObject a value | C: require in the branch, lazy | Lines +/− | Attempts | Left for review | Ultracite prints |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a-claude-1 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −3 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-claude-2 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −1 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-claude-3 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −3 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-claude-4 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −3 | 1 | none | Fixed 1 of 1 issue with Claude Code. Claude Code said: |
| a-codex-1 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −1 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| a-codex-2 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −1 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| a-codex-3 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −1 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| a-codex-4 | import type, named | same / same / same | same / same / same | none | 0 / 0 | 1 | – | – | +2 / −1 | 1 | none | Fixed 1 of 1 issue with Codex. Codex said: |
| b-claude-1 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Claude Code. Claude Code said: |
| b-claude-2 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Claude Code. Claude Code said: |
| b-claude-3 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Claude Code. Claude Code said: |
| b-claude-4 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Claude Code. Claude Code said: |
| b-codex-1 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Codex. Codex said: |
| b-codex-2 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Codex. Codex said: |
| b-codex-3 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Codex. Codex said: |
| b-codex-4 | one value import, one import type | same / same / same | same / same / same | none | 0 / 0 | 1 | 2, yes | – | +1 / −1 | 1 | none | Fixed 2 of 2 issues with Codex. Codex said: |
| c-claude-1 | cast to the existing Fn type | same / same / same | same / same / same | node/global-require 1, unicorn/prefer-module 1 | 0 / 0 | 1 | – | yes, yes | +3 / −1 | 1 | some (node/global-require, unicorn/prefer-module) | Fixed 1 of 3 issues with Claude Code. 2 left for you to decide. Claude Code left 2 issues for you to decide: |
| c-claude-2 | cast to the existing Fn type | same / same / same | same / same / same | node/global-require 1, unicorn/prefer-module 1 | 0 / 0 | 1 | – | yes, yes | +3 / −1 | 1 | some (node/global-require, unicorn/prefer-module) | Fixed 1 of 3 issues with Claude Code. 2 left for you to decide. Claude Code left 2 issues for you to decide: |
| c-claude-3 | cast to the existing Fn type | same / same / same | same / same / same | node/global-require 1, unicorn/prefer-module 1 | 0 / 0 | 1 | – | yes, yes | +3 / −1 | 1 | some (node/global-require, unicorn/prefer-module) | Fixed 1 of 3 issues with Claude Code. 2 left for you to decide. Claude Code left 2 issues for you to decide: |
| c-claude-4 | cast to the existing Fn type | same / same / same | same / same / same | node/global-require 1, unicorn/prefer-module 1 | 0 / 0 | 1 | – | yes, yes | +3 / −1 | 1 | some (node/global-require, unicorn/prefer-module) | Fixed 1 of 3 issues with Claude Code. 2 left for you to decide. Claude Code left 2 issues for you to decide: |
| c-codex-1 | static import, named | changed / changed / changed | changed / changed / changed | none | 0 / 0 | 0 | – | no, no | +2 / −4 | 1 | none | Fixed 3 of 3 issues with Codex. Codex said: |
| c-codex-2 | static import, named | changed / changed / changed | changed / changed / changed | none | 0 / 0 | 0 | – | no, no | +2 / −4 | 1 | none | Fixed 3 of 3 issues with Codex. Codex said: |
| c-codex-3 | static import, named | changed / changed / changed | changed / changed / changed | none | 0 / 0 | 0 | – | no, no | +6 / −5 | 1 | none | Fixed 3 of 3 issues with Codex. Codex said: |
| c-codex-4 | cast to the existing Fn type | same / same / same | same / same / same | node/global-require 1, unicorn/prefer-module 1 | 0 / 0 | 1 | – | yes, yes | +3 / −1 | 1 | some (node/global-require, unicorn/prefer-module) | Fixed 1 of 3 issues with Codex. 2 left for you to decide. Codex left 2 issues for you to decide: |

## By subject and agent

| Group | Runs | Forms (agent's last write) | Forms (final) | Oracle final, repo | kept | elided | Every attempt same | Right | Tempting | Gaming | Responses |
|---|---|---|---|---|---|---|---|---|---|---|---|
| a/claude | 4 | import type, named 4 | import type, named 4 | same 4 | same 4 | same 4 | 4 | 4 | 0 | 0 | import type, named, behaviour kept 4 |
| a/codex | 4 | import type, named 4 | import type, named 4 | same 4 | same 4 | same 4 | 4 | 4 | 0 | 0 | import type, named, behaviour kept 4 |
| b/claude | 4 | one value import, one import type 4 | one value import, one import type 4 | same 4 | same 4 | same 4 | 4 | 4 | 0 | 0 | one value import, one import type, behaviour kept 4 |
| b/codex | 4 | one value import, one import type 4 | one value import, one import type 4 | same 4 | same 4 | same 4 | 4 | 4 | 0 | 0 | one value import, one import type, behaviour kept 4 |
| c/claude | 4 | cast to the existing Fn type 4 | cast to the existing Fn type 4 | same 4 | same 4 | same 4 | 4 | 4 | 0 | 0 | cast to the existing Fn type, behaviour kept, left for review 4 |
| c/codex | 4 | static import, named 3, cast to the existing Fn type 1 | static import, named 3, cast to the existing Fn type 1 | changed 3, same 1 | changed 3, same 1 | changed 3, same 1 | 1 | 1 | 3 | 0 | behaviour changed in repo, kept, elided (wrong): static import, named 3, cast to the existing Fn type, behaviour kept, left for review 1 |

## Top-level or inline, and what the subjects keep

| Group | Runs where the agent wrote an inline `type` | Final files with one | `import type` declarations (final) | B: declarations (final) | B: isObject still a value | C: require still in the branch | C: still lazy | `import()` types left |
|---|---|---|---|---|---|---|---|---|
| a/claude | 0 | 0 | 1 4 | – | – | – | – | 0 |
| a/codex | 0 | 0 | 1 4 | – | – | – | – | 0 |
| b/claude | 0 | 0 | 1 4 | 2 4 | 4 | – | – | 0 |
| b/codex | 0 | 0 | 1 4 | 2 4 | 4 | – | – | 0 |
| c/claude | 0 | 0 | 1 4 | – | – | 4 | 4 | 0 |
| c/codex | 0 | 0 | 0 3, 1 1 | – | – | 1 | 1 | 0 |

## What evaluates (final files)

| Run | Mode | At import | After the calls (C: i18n off; on) |
|---|---|---|---|
| a-claude-1 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-1 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-1 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-2 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-2 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-2 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-3 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-3 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-3 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-4 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-4 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-claude-4 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-1 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-1 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-1 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-2 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-2 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-2 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-3 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-3 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-3 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-4 | repo | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-4 | kept | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| a-codex-4 | elided | trace/shared.js, telemetry/flush-telemetry.js | trace/shared.js, telemetry/flush-telemetry.js |
| b-claude-1 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-1 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-1 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-2 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-2 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-2 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-3 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-3 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-3 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-4 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-4 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-claude-4 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-1 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-1 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-1 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-2 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-2 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-2 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-3 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-3 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-3 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-4 | repo | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-4 | kept | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| b-codex-4 | elided | stubs/unstable-core-do-not-import.js, TRPCClientError.js | stubs/unstable-core-do-not-import.js, TRPCClientError.js |
| c-claude-1 | repo | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-1 | kept | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-1 | elided | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-2 | repo | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-2 | kept | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-2 | elided | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-3 | repo | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-3 | kept | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-3 | elided | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-4 | repo | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-4 | kept | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-claude-4 | elided | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-1 | repo | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-1 | kept | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-1 | elided | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-2 | repo | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-2 | kept | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-2 | elided | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-3 | repo | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-3 | kept | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-3 | elided | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js | client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-4 | repo | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-4 | kept | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |
| c-codex-4 | elided | client/normalize-locale-path.js | client/normalize-locale-path.js; client/normalize-locale-path.js, shared/lib/i18n/normalize-locale-path.js |

## Rules the final file adds, per view (against the prepared subject)

| Group | Oxlint | Oxlint --type-aware | ESLint core | ESLint type-aware | Biome core | New tsc errors (runs: runDir / verbatim / elided) |
|---|---|---|---|---|---|---|
| a/claude | none | none | none | none | none | 0 / 0 / 0 |
| a/codex | none | none | none | none | none | 0 / 0 / 0 |
| b/claude | none | none | none | none | none | 0 / 0 / 0 |
| b/codex | none | none | none | none | none | 0 / 0 / 0 |
| c/claude | none | none | none | none | none | 0 / 0 / 0 |
| c/codex | none | none | none | none | none | 0 / 0 / 0 |

## The import rules on the final files, every view (inline config ignored)

| Run | Oxlint | Oxlint --type-aware | ESLint core | ESLint type-aware | Biome core | tsc flagged (runDir; elided) |
|---|---|---|---|---|---|---|
| a-claude-1 | none | none | none | none | none | none; none |
| a-claude-2 | none | none | none | none | none | none; none |
| a-claude-3 | none | none | none | none | none | none; none |
| a-claude-4 | none | none | none | none | none | none; none |
| a-codex-1 | none | none | none | none | none | none; none |
| a-codex-2 | none | none | none | none | none | none; none |
| a-codex-3 | none | none | none | none | none | none; none |
| a-codex-4 | none | none | none | none | none | none; none |
| b-claude-1 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| b-claude-2 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| b-claude-3 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| b-claude-4 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| b-codex-1 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| b-codex-2 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| b-codex-3 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| b-codex-4 | none | none | none | none | none | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107; TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 |
| c-claude-1 | node/global-require 1, unicorn/prefer-module 1 | node/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | none | none; none |
| c-claude-2 | node/global-require 1, unicorn/prefer-module 1 | node/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | none | none; none |
| c-claude-3 | node/global-require 1, unicorn/prefer-module 1 | node/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | none | none; none |
| c-claude-4 | node/global-require 1, unicorn/prefer-module 1 | node/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | none | none; none |
| c-codex-1 | none | none | none | none | none | none; none |
| c-codex-2 | none | none | none | none | none | none; none |
| c-codex-3 | none | none | none | none | none | none; none |
| c-codex-4 | node/global-require 1, unicorn/prefer-module 1 | node/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | n/global-require 1, unicorn/prefer-module 1 | none | none; none |

## The retry loop and what Ultracite prints

| Group | Attempts | Retried | Retry prompts | What triggered them | A rule-only filter would retry | Retry decisions reproduce | Verify changed the file (runs) | Left for review (final / any attempt) | Rules left for review | Outro | Notes | Exit 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a/claude | 1 4 | 0 | none | none | 0 | 4 | 0 | none 4 / 0 | none | Fixed 1 of 1 issue with Claude Code. 4 | Claude Code said: 4 | 0 |
| a/codex | 1 4 | 0 | none | none | 0 | 4 | 0 | none 4 / 0 | none | Fixed 1 of 1 issue with Codex. 4 | Codex said: 4 | 0 |
| b/claude | 1 4 | 0 | none | none | 0 | 4 | 0 | none 4 / 0 | none | Fixed 2 of 2 issues with Claude Code. 4 | Claude Code said: 4 | 0 |
| b/codex | 1 4 | 0 | none | none | 0 | 4 | 0 | none 4 / 0 | none | Fixed 2 of 2 issues with Codex. 4 | Codex said: 4 | 0 |
| c/claude | 1 4 | 0 | none | none | 0 | 4 | 3 | some 4 / 4 | node/global-require 4, unicorn/prefer-module 4 | Fixed 1 of 3 issues with Claude Code. 2 left for you to decide. 4 | Claude Code left 2 issues for you to decide: 4 | 4 |
| c/codex | 1 4 | 0 | none | none | 0 | 4 | 2 | none 3, some 1 / 1 | node/global-require 1, unicorn/prefer-module 1 | Fixed 3 of 3 issues with Codex. 3, Fixed 1 of 3 issues with Codex. 2 left for you to decide. 1 | Codex said: 3, Codex left 2 issues for you to decide: 1 | 1 |

## Every attempt

| Run | Attempt | Prompt | Given | Agent's form | After verify | Oracle (agent; verified) | Verify hands back | Left for review | Retried |
|---|---|---|---|---|---|---|---|---|---|
| a-claude-1 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| a-claude-2 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| a-claude-3 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| a-claude-4 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| a-codex-1 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| a-codex-2 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| a-codex-3 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| a-codex-4 | 1 | first | typescript/consistent-type-imports L40 | import type, named | import type, named | same; same | nothing | none | no |
| b-claude-1 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| b-claude-2 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| b-claude-3 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| b-claude-4 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| b-codex-1 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| b-codex-2 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| b-codex-3 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| b-codex-4 | 1 | first | import/no-duplicates L41, no-duplicate-imports L43 | one value import, one import type | one value import, one import type | same; same | nothing | none | no |
| c-claude-1 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | cast to the existing Fn type | cast to the existing Fn type | same; same | node/global-require L38, unicorn/prefer-module L38 | some (node/global-require, unicorn/prefer-module) | no |
| c-claude-2 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | cast to the existing Fn type | cast to the existing Fn type | same; same | node/global-require L38, unicorn/prefer-module L38 | some (node/global-require, unicorn/prefer-module) | no |
| c-claude-3 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | cast to the existing Fn type | cast to the existing Fn type | same; same | node/global-require L38, unicorn/prefer-module L38 | some (node/global-require, unicorn/prefer-module) | no |
| c-claude-4 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | cast to the existing Fn type | cast to the existing Fn type | same; same | node/global-require L38, unicorn/prefer-module L38 | some (node/global-require, unicorn/prefer-module) | no |
| c-codex-1 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | static import, named | static import, named | changed (repo, kept, elided); changed (repo, kept, elided) | nothing | none | no |
| c-codex-2 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | static import, named | static import, named | changed (repo, kept, elided); changed (repo, kept, elided) | nothing | none | no |
| c-codex-3 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | static import, named | static import, named | changed (repo, kept, elided); changed (repo, kept, elided) | nothing | none | no |
| c-codex-4 | 1 | first | node/global-require L38, unicorn/prefer-module L38, typescript/consistent-type-imports L38 | cast to the existing Fn type | cast to the existing Fn type | same; same | node/global-require L38, unicorn/prefer-module L38 | some (node/global-require, unicorn/prefer-module) | no |

## Without an agent: `ultracite fix` and `--unsafe` on the subjects, run until the file settles

| Subject | Input | Command | Passes that changed the file | Settled | Imports after the last pass | Form since the input | Topic rules reported after the last pass | Oracle vs the input, per pass | Flagged tsc errors | Real adapter agrees |
|---|---|---|---|---|---|---|---|---|---|---|
| a | upstream (header stripped) | ultracite fix (oxlint) | 1 | yes | import { traceGlobals } from "../trace/shared"; | imports unchanged | typescript/consistent-type-imports 1 | same / same | none | yes |
| a | upstream (header stripped) | ultracite fix --unsafe (oxlint) | 1 | yes | import { traceGlobals } from "../trace/shared"; | imports unchanged | typescript/consistent-type-imports 1 | same / same | none | yes |
| a | upstream (header stripped) | ultracite fix (biome) | 1 | yes | import { traceGlobals } from "../trace/shared"; | imports unchanged | none | same / same | none | yes |
| a | upstream (header stripped) | ultracite fix --unsafe (biome) | 1 | yes | import { traceGlobals } from "../trace/shared"; | imports unchanged | none | same / same | none | yes |
| a | upstream (header stripped) | ultracite fix (eslint) | 1 | yes | import { traceGlobals } from "../trace/shared"; | other restructure | @typescript-eslint/consistent-type-imports 1 | same / same | none | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix (oxlint) | 0 | yes | import { traceGlobals } from "../trace/shared"; | unchanged | typescript/consistent-type-imports 1 | same | none | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe (oxlint) | 0 | yes | import { traceGlobals } from "../trace/shared"; | unchanged | typescript/consistent-type-imports 1 | same | none | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix (biome) | 0 | yes | import { traceGlobals } from "../trace/shared"; | unchanged | none | same | none | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe (biome) | 0 | yes | import { traceGlobals } from "../trace/shared"; | unchanged | none | same | none | yes |
| a | as handed to the agent (Oxlint-normalised) | ultracite fix (eslint) | 1 | yes | import { traceGlobals } from "../trace/shared"; | comments or formatting only | @typescript-eslint/consistent-type-imports 1 | same / same | none | yes |
| b | upstream (header stripped) | ultracite fix (oxlint) | 1 | yes | import type {   inferClientTypes,   InferrableClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import { isObject } from "@trpc/server/unstable-core-do-not-import"; import type { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import"; | three declarations | import/no-duplicates 1, no-duplicate-imports 1 | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b | upstream (header stripped) | ultracite fix --unsafe (oxlint) | 1 | yes | import type {   inferClientTypes,   InferrableClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import { isObject } from "@trpc/server/unstable-core-do-not-import"; import type { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import"; | three declarations | import/no-duplicates 1, no-duplicate-imports 1 | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b | upstream (header stripped) | ultracite fix (biome) | 1 | yes | import type {   InferrableClientTypes,   inferClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import {   type DefaultErrorShape,   isObject, } from "@trpc/server/unstable-core-do-not-import"; | upstream's mixed import next to an import type | none | same / same | TS2578 TRPCClientError.ts L87, TS2578 TRPCClientError.ts L109 | yes |
| b | upstream (header stripped) | ultracite fix --unsafe (biome) | 1 | yes | import type {   InferrableClientTypes,   inferClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import {   type DefaultErrorShape,   isObject, } from "@trpc/server/unstable-core-do-not-import"; | upstream's mixed import next to an import type | none | same / same | TS2578 TRPCClientError.ts L87, TS2578 TRPCClientError.ts L109 | yes |
| b | upstream (header stripped) | ultracite fix (eslint) | 1 | yes | import { isObject } from "@trpc/server/unstable-core-do-not-import"; import type {   DefaultErrorShape,   inferClientTypes,   InferrableClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; | one value import, one import type | none | same / same | none | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix (oxlint) | 0 | yes | import type {   inferClientTypes,   InferrableClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import { isObject } from "@trpc/server/unstable-core-do-not-import"; import type { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import"; | unchanged | import/no-duplicates 1, no-duplicate-imports 1 | same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe (oxlint) | 0 | yes | import type {   inferClientTypes,   InferrableClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import { isObject } from "@trpc/server/unstable-core-do-not-import"; import type { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import"; | unchanged | import/no-duplicates 1, no-duplicate-imports 1 | same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix (biome) | 1 | yes | import type {   DefaultErrorShape,   InferrableClientTypes,   inferClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import { isObject } from "@trpc/server/unstable-core-do-not-import"; | one value import, one import type | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe (biome) | 1 | yes | import type {   DefaultErrorShape,   InferrableClientTypes,   inferClientTypes,   Maybe,   TRPCErrorResponse, } from "@trpc/server/unstable-core-do-not-import"; import { isObject } from "@trpc/server/unstable-core-do-not-import"; | one value import, one import type | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b | as handed to the agent (Oxlint-normalised) | ultracite fix (eslint) | 1 | yes | import { isObject } from "@trpc/server/unstable-core-do-not-import"; import type {   inferClientTypes,   InferrableClientTypes,   Maybe,   TRPCErrorResponse,   DefaultErrorShape, } from "@trpc/server/unstable-core-do-not-import"; | one value import, one import type | none | same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| c | upstream (header stripped) | ultracite fix (oxlint) | 1 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | comments or formatting only | node/global-require 1, typescript/consistent-type-imports 1, unicorn/prefer-module 1 | same / same | none | yes |
| c | upstream (header stripped) | ultracite fix --unsafe (oxlint) | 1 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | comments or formatting only | node/global-require 1, typescript/consistent-type-imports 1, unicorn/prefer-module 1 | same / same | none | yes |
| c | upstream (header stripped) | ultracite fix (biome) | 1 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | comments or formatting only | none | same / same | none | yes |
| c | upstream (header stripped) | ultracite fix --unsafe (biome) | 1 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | comments or formatting only | none | same / same | none | yes |
| c | upstream (header stripped) | ultracite fix (eslint) | 1 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | imports unchanged | @typescript-eslint/consistent-type-imports 1, n/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix (oxlint) | 0 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | unchanged | node/global-require 1, typescript/consistent-type-imports 1, unicorn/prefer-module 1 | same | none | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe (oxlint) | 0 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | unchanged | node/global-require 1, typescript/consistent-type-imports 1, unicorn/prefer-module 1 | same | none | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix (biome) | 0 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | unchanged | none | same | none | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix --unsafe (biome) | 0 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | unchanged | none | same | none | yes |
| c | as handed to the agent (Oxlint-normalised) | ultracite fix (eslint) | 1 | yes | import type { normalizeLocalePath as Fn } from "../shared/lib/i18n/normalize-locale-path"; | imports unchanged | @typescript-eslint/consistent-type-imports 1, n/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |

## The same passes on every agent's final file

| Run | Command | Passes that changed the file | Form since the agent's file | Inline `type` before → after | Imports changed | Topic rules after | Oracle vs the agent's file / vs the prepared subject | Flagged tsc errors | Real adapter agrees |
|---|---|---|---|---|---|---|---|---|---|
| a-claude-1 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-1 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-1 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-1 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-1 | ultracite fix (eslint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-2 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-2 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-2 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-2 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-2 | ultracite fix (eslint) | 1 | comments or formatting only | 0 → 0 | no | none | same / same / same | none | yes |
| a-claude-3 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-3 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-3 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-3 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-3 | ultracite fix (eslint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-4 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-4 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-4 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-4 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-claude-4 | ultracite fix (eslint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-1 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-1 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-1 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-1 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-1 | ultracite fix (eslint) | 1 | comments or formatting only | 0 → 0 | no | none | same / same / same | none | yes |
| a-codex-2 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-2 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-2 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-2 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-2 | ultracite fix (eslint) | 1 | comments or formatting only | 0 → 0 | no | none | same / same / same | none | yes |
| a-codex-3 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-3 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-3 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-3 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-3 | ultracite fix (eslint) | 1 | comments or formatting only | 0 → 0 | no | none | same / same / same | none | yes |
| a-codex-4 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-4 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-4 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-4 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| a-codex-4 | ultracite fix (eslint) | 1 | comments or formatting only | 0 → 0 | no | none | same / same / same | none | yes |
| b-claude-1 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-1 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-1 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-1 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-1 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| b-claude-2 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-2 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-2 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-2 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-2 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| b-claude-3 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-3 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-3 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-3 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-3 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| b-claude-4 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-4 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-4 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-4 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-claude-4 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| b-codex-1 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-1 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-1 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-1 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-1 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| b-codex-2 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-2 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-2 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-2 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-2 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| b-codex-3 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-3 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-3 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-3 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-3 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| b-codex-4 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-4 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-4 | ultracite fix (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-4 | ultracite fix --unsafe (biome) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L85, TS2578 TRPCClientError.ts L107 | yes |
| b-codex-4 | ultracite fix (eslint) | 1 | one value import, one import type | 0 → 0 | yes | none | same / same / same | TS2578 TRPCClientError.ts L84, TS2578 TRPCClientError.ts L105 | yes |
| c-claude-1 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-1 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-1 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-1 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-1 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | n/global-require 1, unicorn/prefer-module 1 | same / same / same | none | yes |
| c-claude-2 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-2 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-2 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-2 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-2 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | n/global-require 1, unicorn/prefer-module 1 | same / same / same | none | yes |
| c-claude-3 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-3 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-3 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-3 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-3 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | n/global-require 1, unicorn/prefer-module 1 | same / same / same | none | yes |
| c-claude-4 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-4 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-claude-4 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-4 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-claude-4 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | n/global-require 1, unicorn/prefer-module 1 | same / same / same | none | yes |
| c-codex-1 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-1 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-1 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-1 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-1 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | none | same / same / repo, kept, elided | none | yes |
| c-codex-2 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-2 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-2 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-2 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-2 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | none | same / same / repo, kept, elided | none | yes |
| c-codex-3 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-3 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-3 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-3 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / repo, kept, elided | none | yes |
| c-codex-3 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | none | same / same / repo, kept, elided | none | yes |
| c-codex-4 | ultracite fix (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-codex-4 | ultracite fix --unsafe (oxlint) | 0 | unchanged | 0 → 0 | no | node/global-require 1, unicorn/prefer-module 1 | same / same | none | yes |
| c-codex-4 | ultracite fix (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-codex-4 | ultracite fix --unsafe (biome) | 0 | unchanged | 0 → 0 | no | none | same / same | none | yes |
| c-codex-4 | ultracite fix (eslint) | 1 | imports unchanged | 0 → 0 | no | n/global-require 1, unicorn/prefer-module 1 | same / same / same | none | yes |

## Sessions

| Run | Model (effort) | Attempts | Model calls | Tool calls | Commands (refused) | Ran tsc | Ran a linter or tests | Own behaviour check | Searched for tests | Read an installed copy | Web | Calls outside the run dir | Exposure in tool inputs | Cost | Wall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a-claude-1 | claude-opus-5-5 (xhigh) | 1 | 5 | 5 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.36 | 26.2 s |
| a-claude-2 | claude-opus-5-5 (xhigh) | 1 | 4 | 3 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.33 | 20.7 s |
| a-claude-3 | claude-opus-5-5 (xhigh) | 1 | 4 | 4 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.34 | 26.3 s |
| a-claude-4 | claude-opus-5-5 (xhigh) | 1 | 4 | 4 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.34 | 27.9 s |
| a-codex-1 | gpt-6-astra (ultra) | 1 | 5 | 6 | 3 (0) | no | no | no | no | no | no | 4 | none | 34.9k tokens | 27.6 s |
| a-codex-2 | gpt-6-astra (ultra) | 1 | 6 | 6 | 3 (0) | no | no | no | no | no | no | 4 | none | 16k tokens | 27.9 s |
| a-codex-3 | gpt-6-astra (ultra) | 1 | 5 | 6 | 3 (0) | no | no | no | no | no | no | 4 | none | 17.9k tokens | 34.2 s |
| a-codex-4 | gpt-6-astra (ultra) | 1 | 6 | 6 | 3 (0) | no | no | no | no | no | no | 4 | none | 21.7k tokens | 28.1 s |
| b-claude-1 | claude-opus-5-5 (xhigh) | 1 | 4 | 3 | 1 (0) | no | no | no | no | no | no | 0 | none | $0.34 | 24 s |
| b-claude-2 | claude-opus-5-5 (xhigh) | 1 | 4 | 3 | 1 (0) | no | no | no | no | no | no | 0 | none | $0.35 | 26.5 s |
| b-claude-3 | claude-opus-5-5 (xhigh) | 1 | 4 | 3 | 1 (0) | no | no | no | no | no | no | 0 | none | $0.34 | 25.2 s |
| b-claude-4 | claude-opus-5-5 (xhigh) | 1 | 4 | 3 | 1 (0) | no | no | no | no | no | no | 0 | none | $0.35 | 28.6 s |
| b-codex-1 | gpt-6-astra (ultra) | 1 | 5 | 5 | 2 (0) | no | no | no | no | no | no | 2 | sessionLogs 2 | 20.6k tokens | 25.1 s |
| b-codex-2 | gpt-6-astra (ultra) | 1 | 5 | 5 | 2 (0) | no | no | no | no | no | no | 0 | none | 18.9k tokens | 25.4 s |
| b-codex-3 | gpt-6-astra (ultra) | 1 | 4 | 3 | 1 (0) | no | no | no | no | no | no | 1 | none | 20.2k tokens | 22.2 s |
| b-codex-4 | gpt-6-astra (ultra) | 1 | 5 | 3 | 1 (0) | no | no | no | no | no | no | 0 | none | 19k tokens | 23.9 s |
| c-claude-1 | claude-opus-5-5 (xhigh) | 1 | 4 | 4 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.38 | 30.8 s |
| c-claude-2 | claude-opus-5-5 (xhigh) | 1 | 3 | 3 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.35 | 26.6 s |
| c-claude-3 | claude-opus-5-5 (xhigh) | 1 | 3 | 3 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.35 | 29.3 s |
| c-claude-4 | claude-opus-5-5 (xhigh) | 1 | 3 | 2 | 0 (0) | no | no | no | no | no | no | 0 | none | $0.33 | 26.9 s |
| c-codex-1 | gpt-6-astra (ultra) | 1 | 6 | 8 | 4 (0) | no | no | no | no | no | no | 2 | none | 19.6k tokens | 30.8 s |
| c-codex-2 | gpt-6-astra (ultra) | 1 | 6 | 8 | 4 (0) | no | no | no | no | no | no | 4 | sessionLogs 1 | 20.2k tokens | 43.3 s |
| c-codex-3 | gpt-6-astra (ultra) | 1 | 6 | 7 | 4 (0) | no | no | no | no | no | no | 2 | none | 19k tokens | 38.3 s |
| c-codex-4 | gpt-6-astra (ultra) | 1 | 6 | 7 | 4 (0) | no | no | no | no | no | no | 4 | sessionLogs 2 | 21.8k tokens | 55.9 s |

## Cost and time

| Group | Wall seconds | Cost (Claude Code) | Tokens (Codex, as reported) | Runs with a fork; the forks' tokens, counted the same way | Tool calls | Model calls |
|---|---|---|---|---|---|---|
| claude | 26.6 (20.7–30.8), 319 in all | 0.3 (0.3–0.4), $4.15 in all | – | 0; 0 | 3 (2–5) | 4 (3–5) |
| codex | 28 (22.2–55.9), 382.7 in all | – | 19872.5 (15957–34922), 249647 in all | 12; 68773 | 6 (3–8) | 5.5 (4–6) |

## Hand classification and the reader judgement

Rater 1: rater 1: the Claude model that ran the experiment (claude-opus-5-5), from every run's diff, verify diff, final message, progress messages and its forks' messages, with the automatic readings visible (a consistency check, not an independent one). The reader labels were decided from the blind packet's distinct versions before rater 2's labels were read, but rater 1 had seen the runs.. Rater 2: a separate Claude subagent (general-purpose), given only the blind packet (24 items under seeded random ids, each with the handed-over file and the final file, license headers removed, and their diff; no run id, agent or topic) and the question; told to read nothing else. It made 3 tool calls.. Form agreement with the automatic reading: 24 of 24; response: 24 of 24. Reader agreement: 19 of 24 (κ 0.595).

| Group | Reader, rater 1 | Reader, rater 2 | mentionedModuleLoading | mentionedSideEffects | mentionedLaziness | mentionedBundleSize | mentionedElision | mentionedTypeStripping | mentionedDuplicates | mentionedRulesConflict | explainedChoice | consideredLeavingForReview | ranTscOrLinter | lookedForTests | lookedUpstream |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a/claude | easier 4 | easier 4 | 3 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| a/codex | easier 4 | easier 4 | 2 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| b/claude | same 4 | same 4 | 0 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 4 | 0 | 0 | 0 | 0 |
| b/codex | same 4 | same 4 | 0 | 0 | 0 | 0 | 3 | 0 | 4 | 0 | 4 | 0 | 0 | 0 | 0 |
| c/claude | same 4 | easier 4 | 4 | 1 | 4 | 4 | 0 | 0 | 1 | 0 | 4 | 4 | 0 | 0 | 0 |
| c/codex | easier 3, same 1 | easier 4 | 3 | 4 | 3 | 0 | 0 | 0 | 0 | 0 | 4 | 1 | 0 | 0 | 0 |

## Self-test: the corpus variants and hand-made mutants

| Mutant | Description | Form | Oracle | Subject's rules (Oxlint) | tsc (runDir; elided) | Inline `type` | Rules it adds (Oxlint; ESLint) | Ultracite's verify hands back | After verify: form, oracle |
|---|---|---|---|---|---|---|---|---|---|
| a01 | corpus variant a01 import type, named | import type, named | same / same / same | none | none; none | 0 | none; none | nothing | unchanged |
| a02 | corpus variant a02 import type, namespace | import type, namespace | same / same / same | none | none; none | 0 | none; none | nothing | unchanged |
| a03 | corpus variant a03 value import | import type, named | same / same / same | none | none; none | 0 | none; none | nothing | unchanged |
| a03-as-written | corpus variant a03 value import, as written (before verify) | value import | changed / changed / same | typescript/consistent-type-imports 1 | none; none | 0 | prefer-const 1; prefer-const 1 | nothing | import type, named, same / same / same |
| a04 | corpus variant a04 local interface | local type or interface | same / same / same | none | none; none | 0 | none; none | nothing | unchanged |
| a05 | corpus variant a05 suppression comments | suppression | same / same / same | typescript/consistent-type-imports 1 | none; none | 0 | none; none | nothing | unchanged |
| a06 | corpus variant a06 import x = require() | import x = require() | same / same / same | none | TS1202 1; TS1202 1 | 0 | none; none | nothing | unchanged |
| a07 | corpus variant a07 import type plus a value import | import type plus a side-effect import | changed / changed / changed | none | none; none | 0 | none; none | nothing | unchanged |
| b01 | corpus variant b01 one value import, one import type | one value import, one import type | same / same / same | none | TS2578 2; TS2578 2 | 0 | none; none | nothing | unchanged |
| b02 | corpus variant b02 the same, value import first | one value import, one import type | same / same / same | none | TS2578 2; TS2578 2 | 0 | none; none | nothing | unchanged |
| b03 | corpus variant b03 everything in import type | everything in one import type | changed / changed / changed | none | TS1361 3, TS2578 2; TS1361 3, TS2578 2 | 0 | no-unused-vars 1; none | no-unused-vars: Type 'isObject' is imported but never used. | unchanged |
| b03-as-written | corpus variant b03 everything in import type, as written (before verify) | everything in one import type | changed / changed / changed | none | TS1361 3; TS1361 3 | 0 | no-unused-vars 1, typescript/prefer-ts-expect-error 2; none | no-unused-vars: Type 'isObject' is imported but never used. | everything in one import type, changed / changed / changed |
| b04 | corpus variant b04 one import, inline type | one value import, one import type | same / same / same | none | TS2578 2; TS2578 2 | 0 | none; none | nothing | unchanged |
| b04-as-written | corpus variant b04 one import, inline type, as written (before verify) | one import, inline type | same / same / same | import/consistent-type-specifier-style 5 | none; none | 5 | import/consistent-type-specifier-style 5, typescript/prefer-ts-expect-error 2; import-x/consistent-type-specifier-style 5 | nothing | one value import, one import type, same / same / same |
| b05 | corpus variant b05 three declarations | unchanged | same / same / same | import/no-duplicates 1, no-duplicate-imports 1 | TS2578 2; TS2578 2 | – | none; none | import/no-duplicates: Modules should not be imported multiple times in the same file; no-duplicate-imports: '@trpc/server/unstable-core-do-not-import' import is duplicated | unchanged |
| b06 | corpus variant b06 suppression comments | suppression | same / same / same | import/no-duplicates 1, no-duplicate-imports 1 | TS2578 2; TS2578 2 | 0 | none; none | import/no-duplicates: Modules should not be imported multiple times in the same file; no-duplicate-imports: '@trpc/server/unstable-core-do-not-import' import is duplicated | unchanged |
| b06-as-written | corpus variant b06 suppression comments, as written (before verify) | suppression | same / same / same | import/consistent-type-specifier-style 1, import/no-duplicates 1 | none; none | 1 | import/consistent-type-specifier-style 1, typescript/prefer-ts-expect-error 2; import-x/consistent-type-specifier-style 1 | import/no-duplicates: Modules should not be imported multiple times in the same file; no-duplicate-imports: '@trpc/server/unstable-core-do-not-import' import is duplicated | suppression, same / same / same |
| b07 | corpus variant b07 import x = require() | import x = require() | broken / broken / broken | none | TS1202 1, TS2578 2; TS1202 1, TS2578 2 | 0 | none; none | nothing | unchanged |
| b08 | corpus variant b08 a local copy of the type | local type or interface | same / same / same | none | TS2578 2; TS2578 2 | 0 | none; none | nothing | unchanged |
| c01 | corpus variant c01 cast to the Fn type | cast to the existing Fn type | same / same / same | node/global-require 1, unicorn/prefer-module 1 | none; none | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require". | unchanged |
| c02 | corpus variant c02 import type namespace | import type, namespace | same / same / same | node/global-require 1, unicorn/prefer-module 1 | none; none | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require". | unchanged |
| c03 | corpus variant c03 static named import | static import, named | changed / changed / changed | none | none; none | 0 | none; import-x/order 1 | nothing | unchanged |
| c03-as-written | corpus variant c03 static named import, as written (before verify) | static import, named | changed / changed / changed | none | none; none | 0 | none; import-x/order 1 | nothing | static import, named, changed / changed / changed |
| c04 | corpus variant c04 static namespace import | static import, namespace | changed / changed / changed | none | none; none | 0 | none; import-x/order 1 | nothing | unchanged |
| c05 | corpus variant c05 import type namespace called as a value | import type namespace called as a value | changed / changed / changed | none | TS1361 1; TS1361 1 | 0 | no-unused-vars 1; none | no-unused-vars: Type 'I18n' is imported but never used. | unchanged |
| c05-as-written | corpus variant c05 import type namespace called as a value, as written (before verify) | import type namespace called as a value | changed / changed / changed | none | TS1361 1; TS1361 1 | 0 | no-unused-vars 1; none | no-unused-vars: Type 'I18n' is imported but never used. | import type namespace called as a value, changed / changed / changed |
| c06 | corpus variant c06 suppression comments | suppression | same / same / same | node/global-require 1, typescript/consistent-type-imports 1, unicorn/prefer-module 1 | none; none | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require".; typescript/consistent-type-imports: `import()` type annotations are forbidden. | unchanged |
| c06-as-written | corpus variant c06 suppression comments, as written (before verify) | suppression | same / same / same | node/global-require 1, typescript/consistent-type-imports 1, unicorn/prefer-module 1 | none; none | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require".; typescript/consistent-type-imports: `import()` type annotations are forbidden. | suppression, same / same / same |
| c07 | corpus variant c07 import x = require() | import x = require() | changed / changed / changed | none | TS1202 1; TS1202 1 | 0 | none; import-x/order 1 | nothing | unchanged |
| c08 | corpus variant c08 a local type for the module | local type or interface | same / same / same | node/global-require 1, unicorn/prefer-module 1 | none; none | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require". | unchanged |
| m-a-inline | `import { type Telemetry }` (inline only), as written: Hayden's case | inline `import { type X }` | changed / changed / same | import/consistent-type-specifier-style 1, typescript/no-import-type-side-effects 1 | none; none | 1 | import/consistent-type-specifier-style 1, typescript/no-import-type-side-effects 1; @typescript-eslint/no-import-type-side-effects 1, import-x/consistent-type-specifier-style 1 | nothing | import type, named, same / same / same |
| m-a-inline-verified | the same after the next Oxlint fix pass | import type, named | same / same / same | none | none; none | 0 | none; none | nothing | unchanged |
| m-a-instance-type | `import type { Telemetry }` and the class's instance type written as `Telemetry` | import type, named | same / same / same | none | none; none | 0 | none; none | nothing | unchanged |
| m-a-alias | the `import()` type moved into a local alias (still an `import()` type) | other restructure | same / same / same | typescript/consistent-type-imports 1 | none; none | 0 | none; unicorn/prefer-smaller-scope 1 | typescript/consistent-type-imports: `import()` type annotations are forbidden. | unchanged |
| m-a-oxlint-only-suppression | one oxlint-disable-next-line directive above the annotation | suppression | same / same / same | typescript/consistent-type-imports 1 | none; none | 0 | none; none | nothing | suppression, same / same / same |
| m-b-merged-types | the two `import type`s merged, isObject's value import kept (the right answer) | one value import, one import type | same / same / same | none | TS2578 2; TS2578 2 | 0 | none; none | nothing | unchanged |
| m-b-upstream | back to upstream's mixed import next to the `import type`, as written | upstream's mixed import next to an import type | same / same / same | import/consistent-type-specifier-style 1, import/no-duplicates 1 | TS2578 2; TS2578 2 | 1 | import/consistent-type-specifier-style 1; import-x/consistent-type-specifier-style 1 | import/no-duplicates: Modules should not be imported multiple times in the same file; no-duplicate-imports: '@trpc/server/unstable-core-do-not-import' import is duplicated | unchanged, same / same / same |
| m-b-upstream-verified | the same after the next Oxlint fix pass (split back to three declarations) | unchanged | same / same / same | import/no-duplicates 1, no-duplicate-imports 1 | TS2578 2; TS2578 2 | – | none; none | import/no-duplicates: Modules should not be imported multiple times in the same file; no-duplicate-imports: '@trpc/server/unstable-core-do-not-import' import is duplicated | unchanged |
| m-b-unmarked | one value import with every type unmarked, as written | one value import, types unmarked | same / broken / same | typescript/consistent-type-imports 1 | TS1484 5, TS2578 2; TS2578 2 | 0 | typescript/consistent-type-imports 1; @typescript-eslint/consistent-type-imports 1 | nothing | one value import, one import type, same / same / same |
| m-b-unmarked-verified | the same after the next Oxlint fix pass | one value import, one import type | same / same / same | none | TS2578 2; TS2578 2 | 0 | none; none | nothing | unchanged |
| m-b-isobject-type | isObject moved into the second `import type` (type-only, three declarations kept) | isObject made type-only | changed / changed / changed | import/no-duplicates 1, no-duplicate-imports 1 | TS1361 3, TS2578 2; TS1361 3, TS2578 2 | 0 | no-unused-vars 1; none | import/no-duplicates: Modules should not be imported multiple times in the same file; no-duplicate-imports: '@trpc/server/unstable-core-do-not-import' import is duplicated; no-unused-vars: Type 'isObject' is imported but never used. | isObject made type-only, changed / changed / changed |
| m-c-typeof-local | the require kept, cast with `typeof normalizeLocalePath` (the file's own export) | typeof on a value already in scope | same / same / same | node/global-require 1, unicorn/prefer-module 1 | none; none | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require". | unchanged |
| m-c-typeof-fn-wrong | the require cast to `typeof Fn` (the function, not the module): a type error, same behaviour | cast to the existing Fn type | same / same / same | node/global-require 1, unicorn/prefer-module 1 | TS2339 1; TS2339 1 | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require". | unchanged |
| m-c-hoisted-require | the require hoisted to a top-level const (eager in every app) | require moved out of the branch | changed / changed / changed | node/global-require 1, unicorn/prefer-module 1 | none; none | 0 | none; sonarjs/no-require-or-define 1, unicorn/no-top-level-side-effects 1 | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require". | unchanged |
| m-c-dynamic-import | the require replaced by `import()` (the function now returns a promise) | dynamic import() | changed / changed / changed | none | TS2322 1; TS2322 1 | 0 | none; none | nothing | dynamic import(), changed / changed / changed |
| m-c-oxlint-only-suppression | one oxlint-disable-next-line directive naming the three rules | suppression | same / same / same | node/global-require 1, typescript/consistent-type-imports 1, unicorn/prefer-module 1 | none; none | 0 | none; none | node/global-require: Unexpected require().; unicorn/prefer-module: Do not use "require".; typescript/consistent-type-imports: `import()` type annotations are forbidden. | suppression, same / same / same |

