### All runs

| Run | Cleared at 15 | Cognitive sum before → after | Decision points | Original fn after | Helpers' cognitive | Max fn after | Functions | Cyclomatic sum | Max depth | Code lines | Behavior | Signature | Suppressions / config / other files | Wall | Cost or tokens |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| s1-claude-1 | yes | 23 → 12 | 12 → 12 | 12 | 0 | 12 | 1 → 1 | 13 → 13 | 2 → 1 | 44 → 45 | yes | yes | none | 24.4s | $0.30 |
| s1-claude-2 | yes | 23 → 5 | 12 → 3 | 5 | 0 | 5 | 1 → 3 | 13 → 6 | 2 → 2 | 44 → 34 | yes | yes | none | 30.1s | $0.32 |
| s1-claude-3 | yes | 23 → 11 | 12 → 5 | 11 | 0 | 11 | 1 → 1 | 13 → 6 | 2 → 3 | 44 → 36 | yes | yes | none | 29.5s | $0.32 |
| s1-claude-4 | yes | 23 → 11 | 12 → 5 | 11 | 0 | 11 | 1 → 1 | 13 → 6 | 2 → 3 | 44 → 36 | yes | yes | none | 32s | $0.32 |
| s1-codex-1 | yes | 23 → 12 | 12 → 12 | 12 | 0 | 12 | 1 → 1 | 13 → 13 | 2 → 1 | 44 → 45 | yes | yes | none | 50.9s | 22.6k "tokens used" (181k incl. cached) |
| s1-codex-2 | yes | 23 → 12 | 12 → 12 | 12 | 0 | 12 | 1 → 1 | 13 → 13 | 2 → 1 | 44 → 45 | yes | yes | none | 52.5s | 34.2k "tokens used" (225k incl. cached) |
| s1-codex-3 | yes | 23 → 12 | 12 → 12 | 12 | 0 | 12 | 1 → 1 | 13 → 13 | 2 → 1 | 44 → 45 | yes | yes | none | 47.1s | 21.2k "tokens used" (147k incl. cached) |
| s1-codex-4 | yes | 23 → 12 | 12 → 12 | 12 | 0 | 12 | 1 → 1 | 13 → 13 | 2 → 1 | 44 → 45 | yes | yes | none | 40.9s | 20.7k "tokens used" (146k incl. cached) |
| s2-claude-1 | yes | 37 → 16 | 10 → 9 | 8 | 8 | 8 | 1 → 2 | 11 → 11 | 7 → 3 | 32 → 32 | yes | yes | none | 26.4s | $0.32 |
| s2-claude-2 | yes | 37 → 22 | 10 → 10 | 8 | 14 | 14 | 1 → 2 | 11 → 12 | 7 → 4 | 32 → 37 | yes | yes | none | 26.3s | $0.32 |
| s2-claude-3 | yes | 37 → 13 | 10 → 7 | 12 | 1 | 12 | 1 → 3 | 11 → 10 | 7 → 4 | 32 → 26 | yes | yes | none | 26s | $0.33 |
| s2-claude-4 | yes | 37 → 22 | 10 → 10 | 8 | 14 | 14 | 1 → 2 | 11 → 12 | 7 → 4 | 32 → 37 | yes | yes | none | 27.1s | $0.33 |
| s2-codex-1 | yes | 37 → 22 | 10 → 10 | 8 | 14 | 14 | 1 → 2 | 11 → 12 | 7 → 4 | 32 → 35 | yes | yes | none | 72s | 27.8k "tokens used" (224k incl. cached) |
| s2-codex-2 | yes | 37 → 22 | 10 → 10 | 8 | 14 | 14 | 1 → 2 | 11 → 12 | 7 → 4 | 32 → 35 | yes | yes | none | 81.9s | 28.9k "tokens used" (289k incl. cached) |
| s2-codex-3 | yes | 37 → 22 | 10 → 10 | 8 | 14 | 14 | 1 → 2 | 11 → 12 | 7 → 4 | 32 → 35 | yes | yes | none | 83.2s | 34.6k "tokens used" (333k incl. cached) |
| s2-codex-4 | yes | 37 → 22 | 10 → 10 | 8 | 14 | 14 | 1 → 2 | 11 → 12 | 7 → 4 | 32 → 35 | yes | yes | none | 73.1s | 30.0k "tokens used" (254k incl. cached) |

### Approach per run (hand-classified from the diffs)

| Run | Approach | New functions | Justification |
|---|---|---|---|
| s1-claude-1 | guard clause / early return | none | Inverted `if (seconds > 0) { … }` into `if (seconds <= 0) return seconds + ' seconds'`; the 11 checks are unchanged, just un-nested (NaN still falls through to the same final return). |
| s1-claude-2 | lookup table / data-driven | `<callback to EXACT_TIMESPANS.find>`, `<callback to PLURAL_TIMESPANS.find>` | Replaced the 11 ifs with two ordered tables (EXACT_TIMESPANS, PLURAL_TIMESPANS) searched with Array.prototype.find; outer guard kept. The two new 'functions' are anonymous .find callbacks scoring 0, not named helpers. |
| s1-claude-3 | lookup table / data-driven | none | Two ordered tables (EXACT_TIMESPANS, DIVISIBLE_TIMESPANS) walked with for…of loops inside the kept guard; 18144000 row kept. Nesting depth goes up (2→3) because the loops nest. |
| s1-claude-4 | lookup table / data-driven | none | Same shape as s1-claude-3 (EXACT_TIMESPANS, TIMESPAN_UNITS + for…of); noted the 18144000 branch is unreachable but kept it. |
| s1-codex-1 | guard clause / early return | none | `if (!(seconds > 0)) return seconds + ' seconds'`, a NaN-exact inversion of the guard; checks unchanged. Byte-identical to s1-codex-2/3/4 and the pilot. |
| s1-codex-2 | guard clause / early return | none | Identical to s1-codex-1: `if (!(seconds > 0)) return …`. |
| s1-codex-3 | guard clause / early return | none | Identical to s1-codex-1: `if (!(seconds > 0)) return …`. |
| s1-codex-4 | guard clause / early return | none | Identical to s1-codex-1: `if (!(seconds > 0)) return …`. |
| s2-claude-1 | extracted helper(s) + other restructuring | `getMatchingCodes` | Moved the two inner loops into getMatchingCodes and merged the string/object branches (`typeof l === 'string' ? [l] : l.codes`), removing one branch and one loop; outer if/else-if/for kept in place. |
| s2-claude-2 | extracted helper(s) | `findMatchingLocaleCodes` | Moved the inner `for (loopLocale)` block verbatim (renames only) into findMatchingLocaleCodes, which returns an array the caller spreads. Helper scores 14 against a limit of 15. |
| s2-claude-3 | extracted helper(s) + other restructuring | `getMatchingLocaleCodes`, `<callback to codes.filter>` | Replaced the string/object branch and innermost loop with a small helper (ternary normalisation + .filter, cognitive 1); both outer loops stay in the main function, which now scores 12. |
| s2-claude-4 | extracted helper(s) | `getMatchingLocales` | Same as s2-claude-2: verbatim move of the inner loop into getMatchingLocales (returns array; caller spreads). Helper scores 14. |
| s2-codex-1 | extracted helper(s) | `appendMatchingLocales` | Verbatim move of the inner loop into appendMatchingLocales(browserLocale, locales, result), which pushes into the caller's array (out-parameter). Byte-identical to s2-codex-3/4. |
| s2-codex-2 | extracted helper(s) | `appendMatchingLocaleCodes` | Same as s2-codex-1 except the helper is named appendMatchingLocaleCodes. |
| s2-codex-3 | extracted helper(s) | `appendMatchingLocales` | Byte-identical to s2-codex-1. |
| s2-codex-4 | extracted helper(s) | `appendMatchingLocales` | Byte-identical to s2-codex-1. |

### Biome cross-check (noExcessiveCognitiveComplexity, maxAllowedComplexity 1)

| Run | Biome per function after (sonarjs in brackets) |
|---|---|
| s1-claude-1 | formatTimespan: 12 [12] |
| s1-claude-2 | formatTimespan: 5 [5]; <callback to EXACT_TIMESPANS.find>: <=1 [0]; <callback to PLURAL_TIMESPANS.find>: <=1 [0] |
| s1-claude-3 | formatTimespan: 11 [11] |
| s1-claude-4 | formatTimespan: 11 [11] |
| s1-codex-1 | formatTimespan: 12 [12] |
| s1-codex-2 | formatTimespan: 12 [12] |
| s1-codex-3 | formatTimespan: 12 [12] |
| s1-codex-4 | formatTimespan: 12 [12] |
| s2-claude-1 | getMatchingCodes: 8 [8]; computePreferredLocaleList: 9 [8] |
| s2-claude-2 | findMatchingLocaleCodes: 14 [14]; computePreferredLocaleList: 9 [8] |
| s2-claude-3 | getMatchingLocaleCodes: <=1 [1]; <callback to codes.filter>: <=1 [0]; computePreferredLocaleList: 13 [12] |
| s2-claude-4 | getMatchingLocales: 14 [14]; computePreferredLocaleList: 9 [8] |
| s2-codex-1 | appendMatchingLocales: 14 [14]; computePreferredLocaleList: 9 [8] |
| s2-codex-2 | appendMatchingLocaleCodes: 14 [14]; computePreferredLocaleList: 9 [8] |
| s2-codex-3 | appendMatchingLocales: 14 [14]; computePreferredLocaleList: 9 [8] |
| s2-codex-4 | appendMatchingLocales: 14 [14]; computePreferredLocaleList: 9 [8] |

### Summary by subject × agent (median, range)

| Group | Runs | Cleared | Behavior preserved | Signature kept | Suppressions | Decision points before → after | Verbatim moves | Cognitive sum after | Original fn after | Helpers' cognitive | Functions after | Cyclomatic sum after | Max depth after | Code lines after | Wall s | Over 5 min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| s1/claude | 4 | 4/4 | 4/4 | 4/4 | 0 | 12 → 5 (3–12) | 0 | 11 (5–12) | 11 (5–12) | 0 | 1 (1–3) | 6 (6–13) | 2.5 (1–3) | 36 (34–45) | 29.8 (24.4–32) | 0 |
| s1/codex | 4 | 4/4 | 4/4 | 4/4 | 0 | 12 → 12 | 0 | 12 | 12 | 0 | 1 | 13 | 1 | 45 | 49 (40.9–52.5) | 0 |
| s2/claude | 4 | 4/4 | 4/4 | 4/4 | 0 | 10 → 9.5 (7–10) | 2 | 19 (13–22) | 8 (8–12) | 11 (1–14) | 2 (2–3) | 11.5 (10–12) | 4 (3–4) | 34.5 (26–37) | 26.35 (26–27.1) | 0 |
| s2/codex | 4 | 4/4 | 4/4 | 4/4 | 0 | 10 → 10 | 4 | 22 | 8 | 14 | 2 | 12 | 4 | 35 | 77.5 (72–83.2) | 0 |
| all/claude | 8 | 8/8 | 8/8 | 8/8 | 0 | 11 (10–12) → 8 (3–12) | 2 | 12.5 (5–22) | 9.5 (5–12) | 0.5 (0–14) | 2 (1–3) | 10.5 (6–13) | 3 (1–4) | 36 (26–45) | 26.75 (24.4–32) | 0 |
| all/codex | 8 | 8/8 | 8/8 | 8/8 | 0 | 11 (10–12) → 11 (10–12) | 4 | 17 (12–22) | 10 (8–12) | 7 (0–14) | 1.5 (1–2) | 12.5 (12–13) | 2.5 (1–4) | 40 (35–45) | 62.25 (40.9–83.2) | 0 |

Approach counts:
- s1/claude: {"guard clause / early return":1,"lookup table / data-driven":3}
- s1/codex: {"guard clause / early return":4}
- s2/claude: {"extracted helper(s)":4,"other restructuring":2}
- s2/codex: {"extracted helper(s)":4}
- all/claude: {"guard clause / early return":1,"lookup table / data-driven":3,"extracted helper(s)":4,"other restructuring":2}
- all/codex: {"guard clause / early return":4,"extracted helper(s)":4}
