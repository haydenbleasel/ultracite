// Which dead-code and duplication rules Ultracite turns on, per linter and preset, read from the
// presets themselves (packages/cli/config), with each rule's effective options.
//
//   Oxlint  core, react, js-plugins (sonarjs through the JS plugin bridge); test-file overrides
//   ESLint  core, react, type-aware, resolved with ESLint's own calculateConfigForFile for a .ts,
//           .tsx, .js and .test.ts path, so the options are what a file actually gets (ESLint 10
//           materialises rule defaults; typescript-eslint's are applied inside the rule)
//   Biome   core, react, plus Biome's recommended set (the presets don't turn `recommended` off),
//           with `biome explain` for each rule's fix kind, recommended flag and documented options
//
// Usage (from the repo root):
//   node research/corpus/scripts/dead-code-inventory.cjs [--print-focus]
// Writes results/dead-code/inventory.json. --print-focus prints the Oxlint rule names the core,
// react and js-plugins presets enable, for rule-census.cjs --focus.
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./dead-code-lib.cjs");

const CLI_REQUIRE = (name) =>
  require(require.resolve(name, { paths: [lib.CLI] }));

// ── Oxlint ─────────────────────────────────────────────────────────────
const oxlintCatalogue = () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [lib.oxlintBin, "--rules", "--format", "json"],
      { encoding: "utf8", maxBuffer: 1 << 26 }
    )
  );
  const name = (scope, rule) =>
    scope === "eslint" ? rule : `${scope.replaceAll("_", "-")}/${rule}`;
  return new Map(rows.map((r) => [name(r.scope, r.value), r]));
};

const oxlintPreset = async (name) =>
  (
    await import(
      pathToFileURL(join(lib.CLI, "config/oxlint", name, "index.mjs")).href
    )
  ).default;

const severity = (value) => (Array.isArray(value) ? value[0] : value);
const optionsOf = (value) => (Array.isArray(value) ? value.slice(1) : []);
const isOn = (value) => !["off", 0, undefined].includes(severity(value));

// ── Biome ──────────────────────────────────────────────────────────────
const biomePreset = (name) => {
  const { parse } = CLI_REQUIRE("jsonc-parser");
  return parse(
    readFileSync(join(lib.CLI, "config/biome", name, "biome.jsonc"), "utf8")
  );
};

const biomeSchemaRules = () => {
  const schema = JSON.parse(
    readFileSync(
      join(
        require.resolve("@biomejs/biome/package.json", { paths: [lib.CLI] }),
        "..",
        "configuration_schema.json"
      ),
      "utf8"
    )
  );
  const defs = schema.$defs ?? schema.definitions;
  const out = [];
  for (const group of [
    "A11y",
    "Complexity",
    "Correctness",
    "Nursery",
    "Performance",
    "Security",
    "Style",
    "Suspicious",
  ]) {
    for (const rule of Object.keys(defs[group]?.properties ?? {})) {
      if (rule === "recommended" || rule === "all") {
        continue;
      }
      out.push(`${group.toLowerCase()}/${rule}`);
    }
  }
  return out;
};

const biomeExplain = (rule) => {
  const text = execFileSync(
    process.execPath,
    [lib.biomeBin, "explain", rule.split("/")[1]],
    { encoding: "utf8" }
  );
  const description = text
    .split(/\nDescription\n/)[1]
    ?.split(/\n(?:Examples|Options)\n/)[0]
    ?.trim()
    .replaceAll(/\n\s*\n/g, "\n\n")
    .replaceAll(/\n /g, "\n");
  const options = text
    .split(/\nOptions\n/)[1]
    ?.split(/\n(?:Related links|Examples)\n/)[0]
    ?.trim()
    .slice(0, 3000);
  return {
    defaultSeverity: /Default severity: (\w+)/.exec(text)?.[1] ?? null,
    description: description ?? null,
    fix: /- Fix: (\w+)/.exec(text)?.[1] ?? "none",
    options: options ?? null,
    recommended: /This rule is recommended/.test(text),
    since: /Available from version: ([\d.]+)/.exec(text)?.[1] ?? null,
  };
};

const biomeRuleSetting = (preset, rule) => {
  const [group, name] = rule.split("/");
  return preset.linter?.rules?.[group]?.[name];
};
const biomeLevel = (setting) =>
  typeof setting === "string" ? setting : (setting?.level ?? null);

// ── ESLint ─────────────────────────────────────────────────────────────
const eslintEffective = async (presets, typed, path) => {
  const { ESLint } = CLI_REQUIRE("eslint");
  const blocks = await lib.eslintBlocks({ presets, typed });
  const eslint = new ESLint({
    cwd: "/tmp/dead-code-inventory",
    ignore: false,
    overrideConfig: blocks,
    overrideConfigFile: true,
  });
  const config = await eslint.calculateConfigForFile(
    `/tmp/dead-code-inventory/${path}`
  );
  return config.rules ?? {};
};

const eslintPluginRules = async () => {
  const load = async (name) => {
    const mod = await import(
      pathToFileURL(require.resolve(name, { paths: [lib.CLI] })).href
    );
    return mod.default ?? mod;
  };
  const plugins = {
    "": {
      rules: Object.fromEntries(
        (await load("eslint/use-at-your-own-risk")).builtinRules
      ),
    },
    "@typescript-eslint/": await load("@typescript-eslint/eslint-plugin"),
    "import-x/": await load("eslint-plugin-import-x"),
    "sonarjs/": await load("eslint-plugin-sonarjs"),
    "unicorn/": await load("eslint-plugin-unicorn"),
    "unused-imports/": await load("eslint-plugin-unused-imports"),
    "react/": await load("eslint-plugin-react"),
    "github/": await load("eslint-plugin-github"),
  };
  const meta = new Map();
  for (const [prefix, plugin] of Object.entries(plugins)) {
    for (const [name, rule] of Object.entries(plugin.rules ?? {})) {
      meta.set(`${prefix}${name}`, rule.meta ?? {});
    }
  }
  return meta;
};

// Concepts, to line the linters up against each other. Each lists the rules (Oxlint names for
// Oxlint and ESLint, Biome group/rule names) that implement it in some form.
const CONCEPTS = [
  {
    concept: "unused local variable",
    biome: ["correctness/noUnusedVariables"],
    eslint: ["typescript/no-unused-vars", "sonarjs/no-unused-vars"],
    oxlint: ["no-unused-vars", "sonarjs/no-unused-vars"],
    tsc: "noUnusedLocals (TS6133)",
  },
  {
    concept: "unused import",
    biome: ["correctness/noUnusedImports"],
    eslint: [
      "typescript/no-unused-vars",
      "unused-imports/no-unused-imports",
      "sonarjs/unused-import",
    ],
    oxlint: ["no-unused-vars"],
    tsc: "noUnusedLocals (TS6133, TS6192)",
  },
  {
    concept: "unused parameter",
    biome: ["correctness/noUnusedFunctionParameters"],
    eslint: [
      "typescript/no-unused-vars",
      "sonarjs/no-unused-function-argument",
    ],
    oxlint: ["no-unused-vars", "sonarjs/no-unused-function-argument"],
    tsc: "noUnusedParameters (TS6133)",
  },
  {
    concept: "unused private class member",
    biome: ["correctness/noUnusedPrivateClassMembers"],
    eslint: ["typescript/no-unused-private-class-members"],
    oxlint: ["no-unused-private-class-members"],
    tsc: "noUnusedLocals (TS6133/TS6138, `private` and `#private`)",
  },
  {
    concept: "unused label",
    biome: ["correctness/noUnusedLabels"],
    eslint: ["no-unused-labels"],
    oxlint: ["no-unused-labels"],
    tsc: "allowUnusedLabels: false (TS7028)",
  },
  {
    concept: "variable never assigned",
    biome: [],
    eslint: ["no-unassigned-vars"],
    oxlint: ["no-unassigned-vars"],
    tsc: "strict: TS2454 'used before being assigned' (only when read)",
  },
  {
    concept: "dead store / useless assignment",
    biome: [],
    eslint: ["no-useless-assignment", "sonarjs/no-dead-store"],
    oxlint: ["sonarjs/no-dead-store"],
    tsc: null,
  },
  {
    concept: "unused expression statement",
    biome: ["suspicious/noUnusedExpressions"],
    eslint: ["typescript/no-unused-expressions"],
    oxlint: ["no-unused-expressions"],
    tsc: null,
  },
  {
    concept: "ignored return value of a pure call",
    biome: [],
    eslint: [
      "sonarjs/no-ignored-return",
      "unicorn/no-unused-builtin-method-return",
    ],
    oxlint: [],
    tsc: null,
  },
  {
    concept: "unused collection (written, never read)",
    biome: [],
    eslint: ["sonarjs/no-unused-collection"],
    oxlint: ["sonarjs/no-unused-collection"],
    tsc: null,
  },
  {
    concept: "unreachable code",
    biome: ["correctness/noUnreachable"],
    eslint: ["no-unreachable"],
    oxlint: ["no-unreachable"],
    tsc: "allowUnreachableCode: false (TS7027)",
  },
  {
    concept: "unused export / unused file",
    biome: [],
    eslint: ["import/no-unused-modules"],
    oxlint: [],
    tsc: null,
  },
  {
    concept: "identical functions (same file)",
    biome: [],
    eslint: ["sonarjs/no-identical-functions"],
    oxlint: ["sonarjs/no-identical-functions"],
    tsc: null,
  },
  {
    concept: "duplicated branches",
    biome: [],
    eslint: [
      "sonarjs/no-duplicated-branches",
      "sonarjs/no-all-duplicated-branches",
      "unicorn/no-duplicate-if-branches",
    ],
    oxlint: [
      "sonarjs/no-duplicated-branches",
      "sonarjs/no-all-duplicated-branches",
    ],
    tsc: null,
  },
  {
    concept: "duplicate condition in an if/else chain",
    biome: ["suspicious/noDuplicateElseIf"],
    eslint: ["no-dupe-else-if", "sonarjs/no-identical-conditions"],
    oxlint: ["no-dupe-else-if", "sonarjs/no-identical-conditions"],
    tsc: null,
  },
  {
    concept: "duplicate string literal",
    biome: [],
    eslint: ["sonarjs/no-duplicate-string"],
    oxlint: ["sonarjs/no-duplicate-string"],
    tsc: null,
  },
  {
    concept: "duplicate import of the same module",
    biome: [],
    eslint: ["no-duplicate-imports", "import/no-duplicates"],
    oxlint: ["no-duplicate-imports", "import/no-duplicates"],
    tsc: null,
  },
  {
    concept: "identical operands (a === a, a && a)",
    biome: [],
    eslint: [
      "sonarjs/no-identical-expressions",
      "unicorn/no-duplicate-logical-operands",
    ],
    oxlint: ["sonarjs/no-identical-expressions"],
    tsc: null,
  },
];

const main = async () => {
  const catalogue = oxlintCatalogue();
  const presetNames = ["core", "react", "js-plugins"];
  const presets = {};
  for (const name of presetNames) {
    presets[name] = await oxlintPreset(name);
  }

  // ── Oxlint rows ──
  const oxlintRows = new Map();
  const addOx = (rule, preset, value, where) => {
    const category = lib.categoryOf(rule);
    if (!category) {
      return;
    }
    const row = oxlintRows.get(rule) ?? {
      category,
      exists: catalogue.has(rule) || rule.startsWith("sonarjs/"),
      fix: catalogue.get(rule)?.fix ?? null,
      oxlintCategory: catalogue.get(rule)?.category ?? null,
      presets: {},
      rule,
      testOverride: null,
      typeAware: catalogue.get(rule)?.type_aware ?? null,
    };
    if (where === "override") {
      row.testOverride = {
        options: optionsOf(value),
        preset,
        value: severity(value),
      };
    } else {
      row.presets[preset] = { on: isOn(value), options: optionsOf(value) };
    }
    oxlintRows.set(rule, row);
  };
  for (const [name, preset] of Object.entries(presets)) {
    for (const [rule, value] of Object.entries(preset.rules ?? {})) {
      addOx(rule, name, value, "rules");
    }
    for (const override of preset.overrides ?? []) {
      const isTest = override.files.some((f) => /test|spec|__tests__/.test(f));
      for (const [rule, value] of Object.entries(override.rules ?? {})) {
        if (isTest) {
          addOx(rule, name, value, "override");
        }
      }
    }
  }
  // Catalogue rules in these categories that no preset mentions (gaps, nursery, plugins not used).
  for (const [rule, entry] of catalogue) {
    const category = lib.categoryOf(rule);
    if (category && !oxlintRows.has(rule)) {
      oxlintRows.set(rule, {
        category,
        exists: true,
        fix: entry.fix,
        oxlintCategory: entry.category,
        presets: {},
        rule,
        testOverride: null,
        typeAware: entry.type_aware,
      });
    }
  }

  // ── ESLint rows ──
  const meta = await eslintPluginRules();
  const files = {
    js: "src/a.js",
    test: "src/a.test.ts",
    ts: "src/a.ts",
    tsx: "src/a.tsx",
  };
  const eff = {
    core: {},
    "core+react": {},
    "core+type-aware": {},
  };
  for (const [key, path] of Object.entries(files)) {
    eff.core[key] = await eslintEffective(["core"], false, path);
    eff["core+type-aware"][key] = await eslintEffective(["core"], true, path);
    eff["core+react"][key] = await eslintEffective(
      ["core", "react"],
      false,
      path
    );
  }
  const eslintRows = new Map();
  const allEslintNames = new Set();
  for (const variant of Object.values(eff)) {
    for (const rules of Object.values(variant)) {
      for (const name of Object.keys(rules)) {
        allEslintNames.add(name);
      }
    }
  }
  for (const name of [...allEslintNames].sort()) {
    const ox = lib.toOxlintName(name);
    const category = lib.categoryOf(ox);
    if (!category) {
      continue;
    }
    const m = meta.get(name) ?? {};
    const at = (variant, key) => {
      const value = eff[variant][key][name];
      return value
        ? { on: value[0] !== 0 && value[0] !== "off", options: value.slice(1) }
        : { on: false, options: [] };
    };
    const onIn = (variant) =>
      Object.fromEntries(Object.keys(files).map((k) => [k, at(variant, k)]));
    const core = onIn("core");
    const typed = onIn("core+type-aware");
    const react = onIn("core+react");
    eslintRows.set(name, {
      category,
      core,
      fixable: m.fixable ?? null,
      hasSuggestions: Boolean(m.hasSuggestions),
      messages: m.messages ?? null,
      name,
      oxlintName: ox,
      onlyWithReact: !core.tsx.on && react.tsx.on,
      onlyWithTypes: !core.ts.on && typed.ts.on,
      requiresTypeChecking: Boolean(m.docs?.requiresTypeChecking),
      react,
      testDiffers:
        JSON.stringify(core.test) !== JSON.stringify(core.ts)
          ? core.test
          : null,
      typeAware: typed,
    });
  }

  // ── Biome rows ──
  const biomeCore = biomePreset("core");
  const biomeReact = biomePreset("react");
  const biomeRows = [];
  for (const rule of biomeSchemaRules()) {
    const category = lib.biomeCategoryOf(rule);
    if (!category) {
      continue;
    }
    const explain = biomeExplain(rule);
    const coreSetting = biomeRuleSetting(biomeCore, rule);
    const reactSetting = biomeRuleSetting(biomeReact, rule);
    const level = biomeLevel(reactSetting) ?? biomeLevel(coreSetting);
    const isNursery = rule.startsWith("nursery/");
    // Unset rules follow Biome's recommended set (the presets don't turn it off).
    const on =
      level === null
        ? explain.recommended && !isNursery
        : !["off", "info"].includes(level);
    const overrides = [];
    for (const o of biomeCore.overrides ?? []) {
      const setting = biomeRuleSetting(o, rule);
      if (setting !== undefined) {
        overrides.push({ includes: o.includes, level: biomeLevel(setting) });
      }
    }
    biomeRows.push({
      category,
      core: coreSetting ?? null,
      on,
      overrides,
      react: reactSetting ?? null,
      rule,
      viaRecommended: level === null && on,
      ...explain,
    });
  }

  const oxlint = [...oxlintRows.values()].sort((a, b) =>
    a.rule.localeCompare(b.rule)
  );
  const eslint = [...eslintRows.values()];
  const onOx = new Set(
    oxlint
      .filter((r) => Object.values(r.presets).some((p) => p.on))
      .map((r) => r.rule)
  );
  const onEs = new Set(
    eslint
      .filter(
        (r) =>
          r.core.ts.on ||
          r.core.js.on ||
          r.core.tsx.on ||
          r.typeAware.ts.on ||
          r.react.tsx.on
      )
      .map((r) => r.oxlintName)
  );
  // ESLint swaps base rules for their typescript-eslint extensions on TS files; count either.
  const base = (rule) => rule.replace(/^typescript\//, "");
  const onEsBase = new Set([...onEs].map(base));
  const gaps = {
    eslintOnly: [...onEs]
      .filter((r) => !onOx.has(r) && !onOx.has(base(r)))
      .sort(),
    oxlintOnly: [...onOx]
      .filter((r) => !onEs.has(r) && !onEsBase.has(base(r)))
      .sort(),
  };

  const conceptRows = CONCEPTS.map((c) => ({
    ...c,
    biomeOn: c.biome.filter((r) => biomeRows.find((b) => b.rule === r)?.on),
    eslintOn: c.eslint.filter((r) => onEs.has(r)),
    oxlintCoreOn: c.oxlint.filter(
      (r) => presets.core.rules[r] && isOn(presets.core.rules[r])
    ),
    oxlintJsPluginsOn: c.oxlint.filter(
      (r) =>
        presets["js-plugins"].rules[r] && isOn(presets["js-plugins"].rules[r])
    ),
  }));

  const result = {
    categories: lib.CATEGORIES,
    concepts: conceptRows,
    eslint,
    generated: new Date().toISOString().slice(0, 10),
    biome: biomeRows,
    gaps,
    note: "Oxlint rows list every dead-code/duplication rule a preset mentions or the catalogue contains. ESLint rows are effective config for a .ts/.tsx/.js/.test.ts path (core alone, core+type-aware, core+react). Biome `on` follows Biome's recommended set for rules the presets don't set. Options are as the preset passes them; each linter's defaults are measured by the calibration (linters.json).",
    oxlint,
    tools: lib.toolVersions(),
  };
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(lib.RESULTS_DIR, "inventory.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  if (lib.flag("print-focus")) {
    const focus = oxlint
      .filter((r) =>
        ["core", "react", "js-plugins"].some((p) => r.presets[p]?.on)
      )
      .map((r) => r.rule);
    console.log(focus.join(","));
  } else {
    console.log(
      `oxlint ${oxlint.length} rows (${onOx.size} on), eslint ${eslint.length} rows (${onEs.size} on), biome ${biomeRows.length} rows (${biomeRows.filter((b) => b.on).length} on)`
    );
    console.log("gaps", JSON.stringify(gaps, null, 1));
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
