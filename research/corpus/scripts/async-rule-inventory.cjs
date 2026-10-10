// Lists the async and promise rules Ultracite's presets turn on, per linter, and which of them need
// type information. Reads the presets in packages/cli/config as shipped; nothing is configured
// here except the list of rule-name patterns that count as "async or promise".
//
//   Oxlint  core, react and js-plugins presets; type-awareness from `oxlint --rules --format json`
//   ESLint  core + type-aware presets, resolved for a .ts file with ESLint's own config resolver;
//           type-awareness from each plugin's rule metadata (and the preset's own split)
//   Biome   core and type-aware presets (JSONC); Biome rules that use its type inference are
//           listed from the schema, since Biome has no separate "type-aware" flag
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-rule-inventory.cjs [--topic floating-promises]
// Writes results/<topic>/rule-inventory.json and prints a summary.
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const { ULTRACITE } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const CLI = join(ULTRACITE, "packages/cli");
const args = process.argv.slice(2);
const TOPIC = args.includes("--topic")
  ? args[args.indexOf("--topic") + 1]
  : (process.env.RESEARCH_TOPIC ?? "floating-promises");

// What counts as an async or promise rule: the whole promise plugin, plus names matching this.
const ASYNC_NAME =
  /promise|await|async|then(?!tic)|floating-promise|misused-promise|for-?each|executor|(?:^|-)void(?:-|$)|^noVoid|callback/i;
// Names the pattern catches that have nothing to do with async code.
const NOT_ASYNC = new Set([
  "array-callback-return",
  "max-nested-callbacks",
  "prefer-arrow-callback",
  "react/void-dom-elements-no-children",
  "react/void-use-memo",
  "typescript/no-invalid-void-type",
  "typescript/no-misused-new",
  "typescript/no-misused-spread",
  "@typescript-eslint/no-invalid-void-type",
  "@typescript-eslint/no-misused-new",
  "@typescript-eslint/no-misused-spread",
  "unicorn/no-array-callback-reference",
  "oxc/uninvoked-array-callback",
  "react-doctor/rendering-script-defer-async",
  "github/async-currenttarget",
  "github/async-preventdefault",
  "sonarjs/void-use",
  "noVoidElementsWithChildren",
  "noVoidTypeReturn",
  "noConfusingVoidType",
  "@typescript-eslint/no-confusing-void-expression",
  "typescript/no-confusing-void-expression",
  "@typescript-eslint/no-meaningless-void-operator",
  "typescript/no-meaningless-void-operator",
  "noMeaninglessVoidOperator",
  "sonarjs/array-callback-without-return",
  "sonarjs/synchronous-suite-callback",
  "sonarjs/async-test-assertions",
  "react-doctor/no-prop-callback-in-effect",
  "useIterableCallbackReturn",
  "noDoneCallback",
  "noExcessiveNestedCallbacks",
  "usePlaywrightValidDescribeCallback",
  "n/no-callback-literal",
]);
const isAsyncRule = (name) => {
  const short = name.includes("/") ? name.split("/").slice(1).join("/") : name;
  if (NOT_ASYNC.has(name)) {
    return false;
  }
  return (
    name.startsWith("promise/") ||
    ASYNC_NAME.test(short) ||
    name.startsWith("react-doctor/async") ||
    name === "react-doctor/server-sequential-independent-await"
  );
};
const severity = (value) => (Array.isArray(value) ? value[0] : value);
const isOn = (value) => !["off", 0, undefined].includes(severity(value));
const optionsOf = (value) =>
  Array.isArray(value) && value.length > 1 ? value.slice(1) : null;

// ── Oxlint ─────────────────────────────────────────────────────────────
const oxlintPkgPath = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const oxlintBin = join(dirname(oxlintPkgPath), "bin", "oxlint");
const configName = (scope, rule) => {
  if (scope === "eslint") {
    return rule;
  }
  const name = scope.replaceAll("_", "-");
  return `${name === "react-hooks" ? "react" : name}/${rule}`;
};

const oxlint = async () => {
  const catalogue = new Map(
    JSON.parse(
      execFileSync(
        process.execPath,
        [oxlintBin, "--rules", "--format", "json"],
        {
          encoding: "utf8",
          maxBuffer: 1 << 26,
        }
      )
    ).map((r) => [configName(r.scope, r.value), r])
  );
  const out = {};
  for (const preset of ["core", "react", "js-plugins"]) {
    const mod = await import(
      pathToFileURL(join(CLI, "config/oxlint", preset, "index.mjs")).href
    );
    const rules = mod.default.rules ?? {};
    const overrides = (mod.default.overrides ?? []).flatMap((o) =>
      Object.entries(o.rules ?? {})
        .filter(([name]) => isAsyncRule(name))
        .map(([name, value]) => ({ files: o.files, rule: name, value }))
    );
    out[preset] = {
      overrides,
      rules: Object.entries(rules)
        .filter(([name]) => isAsyncRule(name))
        .map(([name, value]) => ({
          on: isOn(value),
          options: optionsOf(value),
          rule: name,
          // JS-plugin rules aren't in the native catalogue; the bridge can't run type-aware ones.
          typeAware: catalogue.get(name)?.type_aware ?? false,
          native: catalogue.has(name),
        }))
        .sort((a, b) => a.rule.localeCompare(b.rule)),
    };
  }
  return { version: require(oxlintPkgPath).version, presets: out };
};

// ── ESLint ─────────────────────────────────────────────────────────────
const eslint = async () => {
  const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
  const core = (
    await import(
      pathToFileURL(join(CLI, "config/eslint/core/eslint.config.mjs")).href
    )
  ).default;
  const typeAware = (
    await import(
      pathToFileURL(join(CLI, "config/eslint/type-aware/eslint.config.mjs"))
        .href
    )
  ).default;
  const resolveFor = async (configs) => {
    const instance = new ESLint({
      cwd: CLI,
      overrideConfig: configs,
      overrideConfigFile: true,
    });
    return (await instance.calculateConfigForFile(join(CLI, "src/example.ts")))
      .rules;
  };
  const coreRules = await resolveFor(core);
  const allRules = await resolveFor([...core, ...typeAware]);

  // Which plugin rules need type information, from their metadata.
  const plugins = {
    "@typescript-eslint": require(
      require.resolve("@typescript-eslint/eslint-plugin", { paths: [CLI] })
    ),
    promise: require(
      require.resolve("eslint-plugin-promise", { paths: [CLI] })
    ),
    sonarjs: require(
      require.resolve("eslint-plugin-sonarjs", { paths: [CLI] })
    ),
    unicorn: null,
    github: require(require.resolve("eslint-plugin-github", { paths: [CLI] })),
  };
  const typeChecked = (name) => {
    const [prefix, ...rest] = name.split("/");
    const plugin = plugins[prefix];
    const rule = plugin?.rules?.[rest.join("/")];
    return rule?.meta?.docs?.requiresTypeChecking === true;
  };
  const rows = Object.entries(allRules)
    .filter(([name]) => isAsyncRule(name))
    .map(([name, value]) => ({
      inCore: isOn(coreRules[name]),
      on: isOn(value),
      options: optionsOf(value)?.filter(
        (o) => o && typeof o === "object" && Object.keys(o).length > 0
      ),
      rule: name,
      typeAware: typeChecked(name),
    }))
    .sort((a, b) => a.rule.localeCompare(b.rule));
  return {
    version: require(require.resolve("eslint/package.json", { paths: [CLI] }))
      .version,
    "@typescript-eslint/eslint-plugin": require(
      require.resolve("@typescript-eslint/eslint-plugin/package.json", {
        paths: [CLI],
      })
    ).version,
    "eslint-plugin-promise": require(
      require.resolve("eslint-plugin-promise/package.json", { paths: [CLI] })
    ).version,
    rules: rows,
  };
};

// ── Biome ──────────────────────────────────────────────────────────────
const biome = () => {
  const jsonc = require(require.resolve("jsonc-parser", { paths: [CLI] }));
  const biomeDir = dirname(
    require.resolve("@biomejs/biome/package.json", { paths: [CLI] })
  );
  const schema = JSON.parse(
    readFileSync(join(biomeDir, "configuration_schema.json"), "utf8")
  );
  const defs = schema.$defs ?? schema.definitions;
  // Every async/promise rule Biome has, by group, so the ones the presets leave off are visible.
  const available = {};
  for (const [group, def] of Object.entries(defs)) {
    if (!def?.properties || !/^[A-Z][a-z]+$/.test(group)) {
      continue;
    }
    for (const name of Object.keys(def.properties)) {
      if (/^(no|use)[A-Z]/.test(name) && isAsyncRule(name)) {
        available[name] = group.toLowerCase();
      }
    }
  }
  const read = (preset) =>
    jsonc.parse(
      readFileSync(join(CLI, "config/biome", preset, "biome.jsonc"), "utf8")
    );
  const presets = {};
  for (const preset of ["core", "type-aware"]) {
    const rules = read(preset).linter?.rules ?? {};
    const rows = [];
    for (const [group, entries] of Object.entries(rules)) {
      if (typeof entries !== "object") {
        continue;
      }
      for (const [name, value] of Object.entries(entries)) {
        if (name in available) {
          const level = typeof value === "object" ? value.level : value;
          rows.push({ group, on: level !== "off", rule: name });
        }
      }
    }
    presets[preset] = rows.sort((a, b) => a.rule.localeCompare(b.rule));
  }
  const enabled = new Set(
    Object.values(presets)
      .flat()
      .filter((r) => r.on)
      .map((r) => r.rule)
  );
  return {
    available: Object.entries(available)
      .map(([rule, group]) => ({
        enabledByUltracite: enabled.has(rule),
        group,
        rule,
      }))
      .sort((a, b) => a.rule.localeCompare(b.rule)),
    // Biome's own type inference (no TypeScript compiler) backs these.
    inferenceBased: [
      "noFloatingPromises",
      "noMisusedPromises",
      "useAwaitThenable",
    ],
    presets,
    version: require(join(biomeDir, "package.json")).version,
  };
};

const main = async () => {
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Async and promise rules only: the promise plugin plus rule names matching ASYNC_NAME, minus NOT_ASYNC. 'typeAware' needs a TypeScript program (Oxlint: --type-aware via tsgolint; ESLint: the type-aware preset).",
    biome: biome(),
    eslint: await eslint(),
    oxlint: await oxlint(),
  };
  const dir = join(HERE, "results", TOPIC);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "rule-inventory.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  for (const [preset, { rules }] of Object.entries(result.oxlint.presets)) {
    console.log(
      `oxlint ${preset}: ${rules
        .map(
          (r) => `${r.rule}${r.on ? "" : " (off)"}${r.typeAware ? " [T]" : ""}`
        )
        .join(", ")}`
    );
  }
  console.log(
    `eslint: ${result.eslint.rules
      .map(
        (r) =>
          `${r.rule}${r.on ? "" : " (off)"}${r.typeAware ? " [T]" : ""}${r.inCore === r.on ? "" : r.inCore ? " (core only)" : " (type-aware preset only)"}`
      )
      .join(", ")}`
  );
  for (const [preset, rows] of Object.entries(result.biome.presets)) {
    console.log(
      `biome ${preset}: ${rows.map((r) => `${r.group}/${r.rule}${r.on ? "" : " (off)"}`).join(", ")}`
    );
  }
  console.log(
    `biome available but not enabled: ${result.biome.available
      .filter((r) => !r.enabledByUltracite)
      .map((r) => `${r.group}/${r.rule}`)
      .join(", ")}`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
