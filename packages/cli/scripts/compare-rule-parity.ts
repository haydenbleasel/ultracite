/**
 * Cross-linter rule parity check.
 *
 * The oxlint presets are the benchmark for rule decisions. This script
 * computes the effective ESLint rule set for representative files (using
 * ESLint's own config resolution), normalizes rule names to oxlint's
 * naming, and reports divergences between the two presets. Divergences
 * that are intentional live in the allowlist below with a reason; any
 * other divergence fails the script so drift is caught in CI.
 *
 * Biome uses its own rule names and is aligned manually — it is not
 * covered here.
 */
import path from "node:path";

import type { Linter } from "eslint";

type Severity = "off" | "warn" | "error";
type OxlintRuleEntry = Severity | [Severity, ...unknown[]];

const here = import.meta.dirname;

/**
 * Intentional divergences between the ESLint and oxlint presets.
 * Keyed by oxlint-normalized rule name.
 */
const allowlist = new Map<string, string>([
  [
    "require-await",
    "oxlint keeps the base rule on TS files; the ESLint type-aware preset swaps it for @typescript-eslint/require-await, which allows an async function that returns a promise",
  ],
  [
    "typescript/require-await",
    "off in oxlint so type-aware runs don't report a function twice; see require-await",
  ],
]);

// Base rules whose typescript/ twin reports different code, so one doesn't
// stand in for the other when comparing the presets.
const nonEquivalentTwins = new Set(["require-await"]);

// Base rules whose @typescript-eslint twin has a different name, looked up
// in both directions so either name finds the other.
const twinAliasPairs: [string, string][] = [
  ["no-throw-literal", "typescript/only-throw-error"],
];
const twinAliases = new Map([
  ...twinAliasPairs,
  ...twinAliasPairs.map(([base, twin]): [string, string] => [twin, base]),
]);

/** A rule options value decoded from JSON (options round-trip through JSON). */
type JsonValue = boolean | number | string | null | JsonValue[] | JsonObject;
interface JsonObject {
  [key: string]: JsonValue;
}

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * True when every entry oxlint's options specify is present with the same
 * value in ESLint's effective options. ESLint 10 materializes rule
 * defaults into the effective config, so exact equality would flag every
 * rule where oxlint only spells out the non-default part.
 */
const isOptionSubset = (
  subset: JsonValue,
  superset: JsonValue | undefined
): boolean => {
  if (isJsonObject(subset) && isJsonObject(superset)) {
    return Object.entries(subset).every(([key, value]) =>
      isOptionSubset(value, superset[key])
    );
  }
  if (Array.isArray(subset) && Array.isArray(superset)) {
    return subset.every((value, index) =>
      isOptionSubset(value, superset[index])
    );
  }
  return JSON.stringify(subset) === JSON.stringify(superset);
};

const typescriptPrefix = "typescript/";

const prefixToOxlint: [string, string][] = [
  ["@typescript-eslint/", typescriptPrefix],
  ["import-x/", "import/"],
  ["n/", "node/"],
  ["react-hooks/", "react/"],
  ["@next/next/", "nextjs/"],
];

const toOxlintName = (name: string): string => {
  for (const [from, to] of prefixToOxlint) {
    if (name.startsWith(from)) {
      return `${to}${name.slice(from.length)}`;
    }
  }
  return name;
};

/** Rules oxlint implements natively, excluding nursery. */
const getNativeOxlintRules = (): Set<string> => {
  const result = Bun.spawnSync(
    ["./node_modules/.bin/oxlint", "--rules", "--format=json"],
    { cwd: path.join(here, "..") }
  );
  // SAFETY: decoding trusted `oxlint --rules --format=json` output, which is
  // an array of { scope, value, category } entries.
  const entries = JSON.parse(result.stdout.toString()) as {
    scope: string;
    value: string;
    category: string;
  }[];
  const rules = new Set<string>();
  for (const entry of entries) {
    if (entry.category === "nursery") {
      continue;
    }
    const plugin = entry.scope.replaceAll("_", "-");
    rules.add(plugin === "eslint" ? entry.value : `${plugin}/${entry.value}`);
  }
  return rules;
};

const loadOxlintRules = async (
  names: string[]
): Promise<Record<string, OxlintRuleEntry>> => {
  const mods = await Promise.all(
    names.map(
      (name) => import(path.join(here, `../config/oxlint/${name}/index.mjs`))
    )
  );
  const merged: Record<string, OxlintRuleEntry> = {};
  for (const mod of mods) {
    Object.assign(merged, mod.default.rules ?? {});
  }
  return merged;
};

const loadEslintEffectiveRules = async (
  configNames: string[],
  filePath: string
): Promise<Record<string, [number, ...unknown[]]>> => {
  const { ESLint } = await import("eslint");
  const mods = await Promise.all(
    configNames.map(
      (name) =>
        import(path.join(here, `../config/eslint/${name}/eslint.config.mjs`))
    )
  );
  const configs: Linter.Config[] = mods.flatMap((mod) => mod.default);
  const eslint = new ESLint({
    cwd: path.join(here, ".."),
    overrideConfig: configs,
    overrideConfigFile: true,
  });
  // SAFETY: adapting ESLint's untyped (`Promise<any>`) calculateConfigForFile
  // result; the effective flat config stores rules as severity-first arrays.
  const config = (await eslint.calculateConfigForFile(filePath)) as {
    rules?: Record<string, [number, ...unknown[]]>;
  };
  return config.rules ?? {};
};

const severityOf = (entry: OxlintRuleEntry | undefined): Severity => {
  if (entry === undefined) {
    return "off";
  }
  return Array.isArray(entry) ? entry[0] : entry;
};

const optionsOf = (entry: OxlintRuleEntry | undefined): string =>
  JSON.stringify(Array.isArray(entry) ? entry.slice(1) : []);

interface Surface {
  eslintConfigs: string[];
  file: string;
  name: string;
  oxlintConfigs: string[];
}

// The github/sonarjs/react-doctor rules live in the opt-in `js-plugins` oxlint
// preset, so parity is measured against core + js-plugins (the full-parity
// opt-in set). Oxlint core lists its type-aware rules, which run only with
// type-aware linting on, so the ESLint side adds its opt-in type-aware preset
// to match.
const surfaces: Surface[] = [
  {
    eslintConfigs: ["core", "type-aware"],
    file: "src/example.ts",
    name: "core (TypeScript)",
    oxlintConfigs: ["core", "js-plugins"],
  },
  {
    eslintConfigs: ["core", "type-aware", "react"],
    file: "src/component.tsx",
    name: "react (TSX)",
    oxlintConfigs: ["core", "js-plugins", "react"],
  },
  {
    eslintConfigs: ["core", "type-aware", "react", "next"],
    file: "app/page.tsx",
    name: "next (TSX)",
    oxlintConfigs: ["core", "js-plugins", "react", "next", "next/js-plugins"],
  },
  {
    eslintConfigs: ["core", "type-aware", "gdp"],
    file: "src/example.ts",
    name: "gdp (TypeScript)",
    oxlintConfigs: ["core", "js-plugins", "gdp"],
  },
];

const nativeRules = getNativeOxlintRules();

// ESLint plugins the js-plugins preset bridges into oxlint. Every rule they
// have can run there, so a rule ESLint enables and oxlint doesn't list is a
// gap in the preset, not a missing implementation. The exception is a rule
// that needs type information, which the bridge doesn't provide.
// react-doctor isn't checked yet: the ESLint react preset enables far more of
// its rules than the curated list in the js-plugins preset.
const bridgedPrefixes = ["github/", "sonarjs/"];
// SAFETY: the ESLint preset's sonarjs module exports its type-checked rules
// as a rule map keyed by prefixed rule name.
const { typeCheckedRules: sonarjsTypeCheckedRules } = (await import(
  path.join(here, "../config/eslint/core/rules/sonarjs.mjs")
)) as { typeCheckedRules: Record<string, OxlintRuleEntry> };
const needsTypeInformation = new Set(Object.keys(sonarjsTypeCheckedRules));
const isBridged = (name: string): boolean =>
  bridgedPrefixes.some((prefix) => name.startsWith(prefix)) &&
  !needsTypeInformation.has(name);
const violations: string[] = [];
const allowlisted = new Set<string>();
const gaps = new Set<string>();

const surfaceData = await Promise.all(
  surfaces.map(async (surface) => ({
    eslintRules: await loadEslintEffectiveRules(
      surface.eslintConfigs,
      surface.file
    ),
    oxlintRules: await loadOxlintRules(surface.oxlintConfigs),
    surface,
  }))
);

for (const { eslintRules, oxlintRules, surface } of surfaceData) {
  // Effective ESLint state keyed by oxlint-normalized name. A rule counts
  // as enabled if the base rule or any prefixed twin (@typescript-eslint,
  // react-hooks, ...) is enabled — mirroring how oxlint applies base rules
  // to TypeScript and JSX natively.
  const eslintState = new Map<string, { enabled: boolean; options: string }>();
  for (const [name, entry] of Object.entries(eslintRules)) {
    const key = toOxlintName(name);
    const enabled = entry[0] > 0;
    const options = JSON.stringify(entry.slice(1));
    const existing = eslintState.get(key);
    if (existing?.enabled) {
      continue;
    }
    if (!existing || enabled) {
      eslintState.set(key, { enabled, options });
    }
  }

  // The same base/twin folding for the oxlint side.
  const oxlintState = new Map<string, { enabled: boolean; options: string }>();
  for (const [name, entry] of Object.entries(oxlintRules)) {
    const enabled = severityOf(entry) !== "off";
    const existing = oxlintState.get(name);
    if (existing?.enabled) {
      continue;
    }
    if (!existing || enabled) {
      oxlintState.set(name, { enabled, options: optionsOf(entry) });
    }
  }
  for (const [name, state] of oxlintState) {
    if (!(name.startsWith(typescriptPrefix) && state.enabled)) {
      continue;
    }
    const base = name.slice(typescriptPrefix.length);
    if (oxlintState.has(base) && !oxlintState.get(base)?.enabled) {
      oxlintState.set(base, state);
    }
  }
  // Base rules cover their typescript/ twins and vice versa on both sides.
  const twinsOf = (name: string): string[] => {
    const twins = [name];
    const base = name.startsWith(typescriptPrefix)
      ? name.slice(typescriptPrefix.length)
      : name;
    if (nonEquivalentTwins.has(base)) {
      return twins;
    }
    if (name.startsWith(typescriptPrefix)) {
      twins.push(name.slice(typescriptPrefix.length));
    } else {
      twins.push(`typescript/${name}`);
    }
    const twinAlias = twinAliases.get(name);
    if (twinAlias) {
      twins.push(twinAlias);
    }
    return twins;
  };
  const oxlintEnabled = (name: string): boolean =>
    twinsOf(name).some((twin) => oxlintState.get(twin)?.enabled === true);
  const eslintEnabled = (name: string): boolean =>
    twinsOf(name).some((twin) => eslintState.get(twin)?.enabled === true);

  const report = (rule: string, message: string) => {
    const allowReason = allowlist.get(rule);
    if (allowReason) {
      allowlisted.add(`${rule} (${allowReason})`);
      return;
    }
    violations.push(`[${surface.name}] ${rule}: ${message}`);
  };

  // Direction 1: rules the oxlint presets enable must be enabled in the
  // ESLint preset when an ESLint implementation exists.
  for (const [name, state] of oxlintState) {
    if (!state.enabled) {
      continue;
    }
    // oxlint-only implementations
    if (name.startsWith("oxc/") || name.startsWith("react-doctor/")) {
      continue;
    }
    // No ESLint counterpart configured (e.g. legacy aliases)
    const eslintEntry = eslintState.get(name);
    if (!eslintEntry) {
      continue;
    }
    if (!eslintEntry.enabled) {
      if (!eslintEnabled(name)) {
        report(name, "enabled in oxlint, disabled in eslint");
      }
    } else if (
      state.options !== "[]" &&
      eslintEntry.options !== "[]" &&
      !isOptionSubset(
        JSON.parse(state.options),
        JSON.parse(eslintEntry.options)
      )
    ) {
      report(
        name,
        `options differ (oxlint ${state.options} vs eslint ${eslintEntry.options})`
      );
    }
  }

  // Direction 2: rules the ESLint preset enables must be enabled in the
  // oxlint presets when oxlint can run them (natively or via the JS
  // plugins in the opt-in js-plugins preset).
  for (const [name, state] of eslintState) {
    if (!state.enabled) {
      continue;
    }
    const runnable =
      nativeRules.has(name) || oxlintState.has(name) || isBridged(name);
    if (!runnable) {
      gaps.add(name);
      continue;
    }
    if (!oxlintEnabled(name)) {
      report(name, "enabled in eslint, disabled or missing in oxlint");
    }
  }
}

console.log(`Allowlisted divergences (${allowlisted.size}):`);
for (const entry of [...allowlisted].toSorted()) {
  console.log(`  ~ ${entry}`);
}
const unusedAllowlist = [...allowlist.keys()].filter(
  (rule) => ![...allowlisted].some((entry) => entry.startsWith(`${rule} (`))
);
for (const rule of unusedAllowlist) {
  console.warn(`  ! allowlist entry never triggered: ${rule}`);
}
console.log(
  `\nESLint-only rules with no oxlint implementation: ${gaps.size} (informational)`
);
const gapsByPlugin = new Map<string, number>();
for (const gap of gaps) {
  const plugin = gap.includes("/") ? gap.slice(0, gap.indexOf("/")) : "eslint";
  gapsByPlugin.set(plugin, (gapsByPlugin.get(plugin) ?? 0) + 1);
}
for (const [plugin, count] of [...gapsByPlugin].toSorted(
  ([, a], [, b]) => b - a
)) {
  console.log(`  ${plugin}: ${count}`);
}

if (violations.length > 0) {
  console.error(`\n${violations.length} parity violation(s):`);
  for (const violation of violations.toSorted()) {
    console.error(`  ✗ ${violation}`);
  }
  process.exit(1);
}

console.log("\n✓ ESLint and oxlint presets are in parity");
