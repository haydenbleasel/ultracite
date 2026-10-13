// Which import-graph rules Ultracite turns on, per linter and preset, read from the presets
// themselves (packages/cli/config), with options, defaults and what each rule needs to work.
//
//   Oxlint  core, react, js-plugins. Defaults come from Oxlint's configuration_schema.json; whether
//           a rule reads other modules (the module graph) is from the rule sources at the
//           oxlint_v<version> tag, recorded in CROSS_FILE below.
//   ESLint  core, react, type-aware, resolved with calculateConfigForFile for a .ts path, so the
//           options are what a file actually gets; plus the import-x resolver settings.
//   Biome   core and type-aware, with `biome explain` for each rule's domain (project rules need
//           Biome's scanner) and documented options.
//
// "Import-graph rule" here: cycles, self-imports, barrels and re-exports, namespace imports,
// restricted imports and paths, dependency limits, type-only imports and exports, and the import
// plugins' other checks that read another module.
//
// Usage (from the repo root):
//   node research/corpus/scripts/import-cycles-inventory.cjs
// Writes results/import-cycles/inventory.json.
"use strict";

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { pathToFileURL } = require("node:url");

const ic = require("./import-cycles-lib.cjs");

const CLI_REQUIRE = (name) =>
  require(require.resolve(name, { paths: [ic.CLI] }));

// Oxlint rules that read other modules through the module graph (import plugin rules built on
// ModuleRecord.loaded_modules / module_graph_visitor, and oxc/no-barrel-file), from the rule
// sources at the oxlint_v1.86.0 tag. Without the import plugin's resolver they see nothing.
const CROSS_FILE = new Set([
  "import/default",
  "import/export",
  "import/named",
  "import/namespace",
  "import/no-cycle",
  "import/no-named-as-default",
  "import/no-named-as-default-member",
  "import/no-self-import",
  "oxc/no-barrel-file",
]);

const OXLINT_RULES = (catalogue) =>
  [...catalogue.keys()].filter(
    (r) =>
      r.startsWith("import/") ||
      [
        "oxc/no-barrel-file",
        "no-restricted-imports",
        "no-duplicate-imports",
        "unicorn/prefer-export-from",
        "unicorn/import-style",
        "typescript/consistent-type-imports",
        "typescript/consistent-type-exports",
        "typescript/no-import-type-side-effects",
        "typescript/no-namespace",
        "typescript/no-require-imports",
      ].includes(r)
  );
const JS_PLUGIN_RULES = [
  "sonarjs/no-wildcard-import",
  "react-doctor/no-barrel-import",
  "sonarjs/no-implicit-dependencies",
];

const ESLINT_MATCH = (r) =>
  r.startsWith("import-x/") ||
  [
    "no-restricted-imports",
    "no-duplicate-imports",
    "sonarjs/no-wildcard-import",
    "sonarjs/no-implicit-dependencies",
    "unicorn/prefer-export-from",
    "unicorn/import-style",
    "unicorn/no-barrel-files",
    "unicorn/no-useless-re-export",
    "@typescript-eslint/consistent-type-imports",
    "@typescript-eslint/consistent-type-exports",
    "@typescript-eslint/no-import-type-side-effects",
    "@typescript-eslint/no-restricted-imports",
    "@typescript-eslint/no-namespace",
    "react-doctor/no-barrel-import",
  ].includes(r);

const BIOME = [
  "suspicious/noImportCycles",
  "performance/noBarrelFile",
  "performance/noReExportAll",
  "performance/noNamespaceImport",
  "performance/noDynamicNamespaceImportAccess",
  "style/noExportedImports",
  "style/noRestrictedImports",
  "style/useImportType",
  "style/useExportType",
  "correctness/noUnresolvedImports",
  "correctness/noPrivateImports",
  "correctness/noUndeclaredDependencies",
  "correctness/useImportExtensions",
  "suspicious/noDeprecatedImports",
  "style/noNamespace",
];

const sev = (v) => (Array.isArray(v) ? v[0] : v);
const opts = (v) => (Array.isArray(v) ? v.slice(1) : []);
const isOn = (v) => v !== undefined && !["off", 0].includes(sev(v));

const oxlint = async () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [ic.oxlintBin, "--rules", "--format", "json"],
      { encoding: "utf8", maxBuffer: 1 << 26 }
    )
  );
  const name = (scope, rule) =>
    scope === "eslint" ? rule : `${scope.replaceAll("_", "-")}/${rule}`;
  const catalogue = new Map(rows.map((r) => [name(r.scope, r.value), r]));
  const schema = JSON.parse(
    readFileSync(
      join(
        dirname(
          require.resolve("oxlint/package.json", { paths: [ic.ULTRACITE] })
        ),
        "configuration_schema.json"
      ),
      "utf8"
    )
  );
  const defs = schema.definitions ?? schema.$defs;
  const defaultsOf = (rule) => {
    const key = {
      "import/no-cycle": "NoCycle",
      "import/no-namespace": "NoNamespaceConfig",
      "import/max-dependencies": "MaxDependenciesConfigJson",
      "oxc/no-barrel-file": "NoBarrelFile",
      "unicorn/prefer-export-from": "PreferExportFrom",
      "unicorn/import-style": "ImportStyleConfig",
    }[rule];
    const def = key && defs[key];
    if (!def?.properties) {
      return null;
    }
    return Object.fromEntries(
      Object.entries(def.properties).map(([k, v]) => [k, v.default ?? null])
    );
  };
  const presets = {};
  for (const p of ["core", "react", "js-plugins"]) {
    presets[p] = (
      await import(
        pathToFileURL(join(ic.CLI, "config/oxlint", p, "index.mjs")).href
      )
    ).default;
  }
  const out = [];
  for (const rule of [...OXLINT_RULES(catalogue), ...JS_PLUGIN_RULES].sort()) {
    const c = catalogue.get(rule);
    const byPreset = {};
    for (const [p, cfg] of Object.entries(presets)) {
      const v = cfg.rules?.[rule];
      byPreset[p] =
        v === undefined
          ? null
          : { on: isOn(v), options: opts(v), severity: sev(v) };
    }
    out.push({
      category: c?.category ?? (rule.includes("/") ? "js-plugin" : null),
      crossFile: CROSS_FILE.has(rule),
      defaults: defaultsOf(rule),
      fix: c?.fix ?? null,
      presets: byPreset,
      rule,
      typeAware: c?.type_aware ?? false,
    });
  }
  return out;
};

const eslint = async () => {
  const { ESLint } = CLI_REQUIRE("eslint");
  const effective = async (presets, typed, path) => {
    const blocks = await ic.eslintBlocks({ presets, typed });
    const e = new ESLint({
      cwd: "/tmp/import-cycles-inventory",
      ignore: false,
      overrideConfig: blocks,
      overrideConfigFile: true,
    });
    return e.calculateConfigForFile(`/tmp/import-cycles-inventory/${path}`);
  };
  const core = await effective(["core"], false, "src/a.ts");
  const react = await effective(["core", "react"], false, "src/a.tsx");
  const typed = await effective(["core"], true, "src/a.ts");
  const names = new Set(
    [
      ...Object.keys(core.rules),
      ...Object.keys(react.rules),
      ...Object.keys(typed.rules),
    ].filter(ESLINT_MATCH)
  );
  const meta = {};
  const importX =
    (
      await import(
        pathToFileURL(
          require.resolve("eslint-plugin-import-x", { paths: [ic.CLI] })
        ).href
      )
    ).default ?? {};
  for (const [k, r] of Object.entries(importX.rules ?? {})) {
    meta[`import-x/${k}`] = {
      deprecated: Boolean(r.meta?.deprecated),
      schema: r.meta?.schema?.[0]?.properties
        ? Object.keys(r.meta.schema[0].properties)
        : [],
    };
  }
  const rows = [...names].sort().map((rule) => ({
    core: core.rules[rule] ?? null,
    "core+react (.tsx)": react.rules[rule] ?? null,
    "core+type-aware": typed.rules[rule] ?? null,
    optionNames: meta[rule]?.schema ?? null,
    rule,
  }));
  return {
    rows,
    settings: {
      "import-x/parsers": core.settings?.["import-x/parsers"] ?? null,
      "import-x/resolver": core.settings?.["import-x/resolver"] ?? null,
    },
  };
};

const biome = () => {
  const { parse } = CLI_REQUIRE("jsonc-parser");
  const presets = Object.fromEntries(
    ["core", "type-aware"].map((p) => [
      p,
      parse(
        readFileSync(join(ic.CLI, "config/biome", p, "biome.jsonc"), "utf8")
      ),
    ])
  );
  return BIOME.map((rule) => {
    const [group, name] = rule.split("/");
    const text = execFileSync(
      process.execPath,
      [ic.biomeBin, "explain", name],
      { encoding: "utf8" }
    );
    const setting = (p) => presets[p].linter?.rules?.[group]?.[name];
    return {
      defaultSeverity: /Default severity: (\w+)/.exec(text)?.[1] ?? null,
      domain: /Domains\s+- Name: (\w+)/.exec(text)?.[1] ?? null,
      fix:
        /- Fix: (\w+)/.exec(text)?.[1] ??
        (/No fix available/.test(text) ? "none" : null),
      options:
        text
          .split(/\nOptions\n/)[1]
          ?.split(/\n(?:Invalid|Valid|Related links|Examples)\n/)[0]
          ?.trim()
          .slice(0, 1200) ?? null,
      presets: {
        core: setting("core") ?? null,
        "type-aware": setting("type-aware") ?? null,
      },
      recommended: /This rule is recommended/.test(text),
      rule,
      since: /Available from version: ([\d.]+)/.exec(text)?.[1] ?? null,
    };
  });
};

const main = async () => {
  const out = {
    biome: biome(),
    eslint: await eslint(),
    generated: new Date().toISOString().slice(0, 10),
    note: "See the header of import-cycles-inventory.cjs. Oxlint `presets` entries are null where the preset doesn't name the rule (so it's off unless another preset turns it on). ESLint entries are [severity, ...options] as calculateConfigForFile returns them.",
    oxlint: await oxlint(),
    tools: ic.toolVersions(),
  };
  ic.writeJson(join(ic.RESULTS_DIR, "inventory.json"), out);
  const on = (r) =>
    Object.entries(r.presets)
      .filter(([, v]) => v?.on)
      .map(([p]) => p);
  console.log(
    "oxlint on:",
    out.oxlint
      .filter((r) => on(r).length)
      .map((r) => `${r.rule}[${on(r).join(",")}]${r.crossFile ? "*" : ""}`)
      .join(" ")
  );
  console.log(
    "oxlint off:",
    out.oxlint
      .filter((r) => !on(r).length && Object.values(r.presets).some(Boolean))
      .map((r) => r.rule)
      .join(" ")
  );
  console.log(
    "eslint:",
    out.eslint.rows
      .map(
        (r) => `${r.rule}=${JSON.stringify(r.core ?? r["core+react (.tsx)"])}`
      )
      .join(" ")
  );
  console.log("eslint settings:", JSON.stringify(out.eslint.settings));
  console.log(
    "biome:",
    out.biome
      .map(
        (r) =>
          `${r.rule} core=${JSON.stringify(r.presets.core)} ta=${JSON.stringify(r.presets["type-aware"])} domain=${r.domain}`
      )
      .join("\n  ")
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
