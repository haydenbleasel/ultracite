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

type Severity = "off" | "warn" | "error";
type OxlintRuleEntry = Severity | [Severity, ...unknown[]];

const here = import.meta.dirname;

/**
 * Intentional divergences between the ESLint and oxlint presets.
 * Keyed by oxlint-normalized rule name.
 */
const allowlist: Record<string, string> = {
  // Off in oxlint because the JS plugin bridge provides no globals, so
  // the rule flags every identifier. ESLint resolves globals correctly.
  "sonarjs/no-reference-error": "jsPlugins bridge provides no globals",
  // Off in oxlint due to https://github.com/oxc-project/oxc/issues/21949.
  "unicorn/number-literal-case": "oxc autofix bug",
};

// Base rules whose @typescript-eslint twin has a different name.
const twinAliases: Record<string, string> = {
  "no-throw-literal": "typescript/only-throw-error",
};

/**
 * True when every entry oxlint's options specify is present with the same
 * value in ESLint's effective options. ESLint 10 materializes rule
 * defaults into the effective config, so exact equality would flag every
 * rule where oxlint only spells out the non-default part.
 */
const isOptionSubset = (subset: unknown, superset: unknown): boolean => {
  if (
    typeof subset === "object" &&
    subset !== null &&
    typeof superset === "object" &&
    superset !== null &&
    !Array.isArray(subset) &&
    !Array.isArray(superset)
  ) {
    return Object.entries(subset).every(([key, value]) =>
      isOptionSubset(value, (superset as Record<string, unknown>)[key])
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
  const configs: unknown[] = mods.flatMap((mod) => mod.default);
  const eslint = new ESLint({
    cwd: path.join(here, ".."),
    overrideConfig: configs as never,
    overrideConfigFile: true,
  });
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
// opt-in set).
const surfaces: Surface[] = [
  {
    eslintConfigs: ["core"],
    file: "src/example.ts",
    name: "core (TypeScript)",
    oxlintConfigs: ["core", "js-plugins"],
  },
  {
    eslintConfigs: ["core", "react"],
    file: "src/component.tsx",
    name: "react (TSX)",
    oxlintConfigs: ["core", "js-plugins", "react"],
  },
  {
    eslintConfigs: ["core", "react", "next"],
    file: "app/page.tsx",
    name: "next (TSX)",
    oxlintConfigs: ["core", "js-plugins", "react", "next"],
  },
];

const nativeRules = getNativeOxlintRules();
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
    if (name.startsWith(typescriptPrefix)) {
      twins.push(name.slice(typescriptPrefix.length));
    } else {
      twins.push(`typescript/${name}`);
    }
    if (twinAliases[name]) {
      twins.push(twinAliases[name]);
    }
    return twins;
  };
  const oxlintEnabled = (name: string): boolean =>
    twinsOf(name).some((twin) => oxlintState.get(twin)?.enabled === true);
  const eslintEnabled = (name: string): boolean =>
    twinsOf(name).some((twin) => eslintState.get(twin)?.enabled === true);

  const report = (rule: string, message: string) => {
    if (allowlist[rule]) {
      allowlisted.add(`${rule} (${allowlist[rule]})`);
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
    const runnable = nativeRules.has(name) || oxlintState.has(name);
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
const unusedAllowlist = Object.keys(allowlist).filter(
  (rule) => ![...allowlisted].some((entry) => entry.startsWith(`${rule} (`))
);
for (const rule of unusedAllowlist) {
  console.warn(`  ! allowlist entry never triggered: ${rule}`);
}
console.log(
  `\nESLint-only rules with no oxlint implementation: ${gaps.size} (informational)`
);

if (violations.length > 0) {
  console.error(`\n${violations.length} parity violation(s):`);
  for (const violation of violations.toSorted()) {
    console.error(`  ✗ ${violation}`);
  }
  process.exit(1);
}

console.log("\n✓ ESLint and oxlint presets are in parity");
