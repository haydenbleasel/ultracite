// The rules this topic is about, as Ultracite's presets set them, per linter: every Oxlint preset
// (top level and overrides) and `oxlint --rules` (category, fix kind); ESLint core resolved with
// calculateConfigForFile for a .ts, a .tsx and a test file; Biome's core preset and every
// framework preset, plus `biome explain` for each rule (default severity, whether it's
// recommended, its options and defaults); the defaults each linter's source sets; and the agent
// prompt's lines.
//
// Usage: node research/corpus/scripts/length-rules.cjs
// Writes results/length-limits/rules.json.
"use strict";

const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./length-lib.cjs");

const OXLINT_RULES = [
  "max-lines",
  "max-lines-per-function",
  "max-statements",
  "max-params",
  "max-depth",
  "max-nested-callbacks",
  "max-classes-per-file",
  "complexity",
  "sonarjs/max-lines",
  "sonarjs/max-lines-per-function",
  "sonarjs/max-switch-cases",
  "sonarjs/max-union-size",
  "sonarjs/nested-control-flow",
  "sonarjs/cognitive-complexity",
  "sonarjs/no-nested-functions",
  "sonarjs/expression-complexity",
];
const ESLINT_RULES = [
  ...OXLINT_RULES.filter((r) => !r.startsWith("sonarjs/") || true),
  "@typescript-eslint/max-params",
];
const BIOME_RULES = {
  complexity: [
    "noExcessiveLinesPerFunction",
    "useMaxParams",
    "noExcessiveNestedCallbacks",
    "noExcessiveCognitiveComplexity",
  ],
  nursery: ["noExcessiveStatementsPerFunction"],
  style: ["noExcessiveLinesPerFile", "noExcessiveClassesPerFile"],
};
// The defaults, as each rule's source sets them (read at the tools' versions; see REPORT.md).
const DEFAULTS = {
  biome: {
    noExcessiveClassesPerFile: { maxClasses: 1 },
    noExcessiveCognitiveComplexity: { maxAllowedComplexity: 15 },
    noExcessiveLinesPerFile: { maxLines: 300, skipBlankLines: false },
    noExcessiveLinesPerFunction: {
      maxLines: 50,
      skipBlankLines: false,
      skipIifes: false,
    },
    noExcessiveNestedCallbacks: { max: 5 },
    noExcessiveStatementsPerFunction: {
      ignoreTopLevelFunctions: false,
      max: 10,
    },
    useMaxParams: { max: 4 },
  },
  eslint: {
    "@typescript-eslint/max-params": { countVoidThis: false, max: 3 },
    complexity: { max: 20 },
    "max-classes-per-file": { ignoreExpressions: false, max: 1 },
    "max-depth": { max: 4 },
    "max-lines": { max: 300, skipBlankLines: false, skipComments: false },
    "max-lines-per-function": {
      IIFEs: false,
      max: 50,
      skipBlankLines: false,
      skipComments: false,
    },
    "max-nested-callbacks": { max: 10 },
    "max-params": { countThis: "except-void", max: 3 },
    "max-statements": { ignoreTopLevelFunctions: false, max: 10 },
  },
  oxlint: {
    "max-classes-per-file": { ignoreExpressions: false, max: 1 },
    "max-depth": { max: 4 },
    "max-lines": { max: 300, skipBlankLines: false, skipComments: false },
    "max-lines-per-function": {
      IIFEs: false,
      max: 50,
      skipBlankLines: false,
      skipComments: false,
    },
    "max-nested-callbacks": { max: 10 },
    "max-params": { countThis: "except-void", max: 3 },
    "max-statements": { ignoreTopLevelFunctions: false, max: 10 },
  },
  sonarjs: {
    "cognitive-complexity": { threshold: 15 },
    "max-lines": { maximum: 1000 },
    "max-lines-per-function": { maximum: 200 },
    "max-switch-cases": { maximum: 30 },
    "max-union-size": { threshold: 3 },
    "nested-control-flow": { maximumNestingLevel: 3 },
  },
};

const importJson = (file) => {
  const r = lib.spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const m = await import(${JSON.stringify(pathToFileURL(file).href)}); process.stdout.write(JSON.stringify(m.default));`,
    ],
    { cwd: lib.CLI, encoding: "utf8" }
  );
  if (r.status !== 0) {
    throw new Error(`could not load ${file}: ${r.stderr}`);
  }
  return JSON.parse(r.stdout);
};
const stripJsonc = (text) =>
  JSON.parse(
    text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"])\/\/.*$/gm, "$1")
      .replace(/,(\s*[}\]])/g, "$1")
  );

const main = async () => {
  const out = {
    generated: new Date().toISOString(),
    tools: lib.toolVersions(),
  };
  // Oxlint presets
  const oxDir = join(lib.CLI, "config/oxlint");
  out.oxlint = {};
  for (const preset of readdirSync(oxDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    let cfg;
    try {
      cfg = importJson(join(oxDir, preset, "index.mjs"));
    } catch {
      continue;
    }
    const where = {};
    for (const r of OXLINT_RULES) {
      if (cfg.rules?.[r] !== undefined) {
        where[r] = cfg.rules[r];
      }
      for (const o of cfg.overrides ?? []) {
        if (o.rules?.[r] !== undefined) {
          where[`${r} (override ${JSON.stringify(o.files)})`] = o.rules[r];
        }
      }
    }
    if (Object.keys(where).length) {
      out.oxlint[preset] = where;
    }
  }
  const rulesJson = JSON.parse(
    lib.spawnSync(
      process.execPath,
      [lib.oxlintBin, "--rules", "--format", "json"],
      {
        encoding: "utf8",
        maxBuffer: 1 << 28,
      }
    ).stdout
  );
  out.oxlintRules = rulesJson
    .filter(
      (r) =>
        OXLINT_RULES.includes(r.value) ||
        OXLINT_RULES.includes(`${r.scope}/${r.value}`)
    )
    .map((r) => ({
      category: r.category,
      fix: r.fix,
      rule: `${r.scope}/${r.value}`,
      typeAware: r.type_aware,
    }));
  // ESLint core, resolved
  const { ESLint } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  const blocks = await lib.dc.eslintBlocks({ presets: ["core"] });
  const eslint = new ESLint({
    cwd: lib.CLI,
    overrideConfig: blocks,
    overrideConfigFile: true,
  });
  out.eslint = {};
  for (const file of [
    "src/example.ts",
    "src/example.tsx",
    "src/example.test.ts",
  ]) {
    const cfg = await eslint.calculateConfigForFile(join(lib.CLI, file));
    out.eslint[file] = Object.fromEntries(
      ESLINT_RULES.map((r) => [r, cfg.rules?.[r] ?? "(not configured)"])
    );
  }
  // Biome presets
  const bDir = join(lib.CLI, "config/biome");
  out.biome = {};
  for (const preset of readdirSync(bDir).sort()) {
    const file = join(bDir, preset, "biome.jsonc");
    let cfg;
    try {
      cfg = stripJsonc(lib.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const where = {};
    for (const [group, names] of Object.entries(BIOME_RULES)) {
      for (const n of names) {
        const v = cfg.linter?.rules?.[group]?.[n];
        if (v !== undefined) {
          where[`${group}/${n}`] = v;
        }
        for (const o of cfg.overrides ?? []) {
          const ov = o.linter?.rules?.[group]?.[n];
          if (ov !== undefined) {
            where[`${group}/${n} (override ${JSON.stringify(o.includes)})`] =
              ov;
          }
        }
      }
    }
    if (Object.keys(where).length) {
      out.biome[preset] = where;
    }
  }
  out.biomeCoreRecommended = (() => {
    const cfg = stripJsonc(
      lib.readFileSync(join(bDir, "core/biome.jsonc"), "utf8")
    );
    return cfg.linter?.rules?.recommended ?? null;
  })();
  out.biomeExplain = {};
  for (const names of Object.values(BIOME_RULES)) {
    for (const n of names) {
      const text = lib.spawnSync(
        process.execPath,
        [lib.biomeBin, "explain", n],
        {
          encoding: "utf8",
        }
      ).stdout;
      out.biomeExplain[n] = {
        category: /Diagnostic category: (\S+)/.exec(text)?.[1] ?? null,
        defaultSeverity: /Default severity: (\S+)/.exec(text)?.[1] ?? null,
        since: /Available from version: (\S+)/.exec(text)?.[1] ?? null,
      };
    }
  }
  // SonarJS rules' meta
  const sonarjs = require(
    require.resolve("eslint-plugin-sonarjs", { paths: [lib.CLI] })
  );
  out.sonarjs = Object.fromEntries(
    [
      "max-lines",
      "max-lines-per-function",
      "max-switch-cases",
      "max-union-size",
      "nested-control-flow",
      "cognitive-complexity",
    ].map((r) => [
      r,
      {
        description: sonarjs.rules[r].meta.docs?.description ?? null,
        messages: sonarjs.rules[r].meta.messages ?? null,
        recommended: sonarjs.rules[r].meta.docs?.recommended ?? null,
        url: sonarjs.rules[r].meta.docs?.url ?? null,
      },
    ])
  );
  out.defaults = DEFAULTS;
  // the agent prompt's lines that bear on refactoring
  const prompt = lib.readFileSync(
    join(lib.CLI, "src/agent-fix/prompt.ts"),
    "utf8"
  );
  out.prompt = prompt
    .split("\n")
    .filter((l) =>
      /minimal change|preserving runtime behavior|Restyling|help text|suppression|LEFT_FOR_REVIEW_LABEL}|Edit only/.test(
        l
      )
    )
    .map((l) => l.trim().replace(/^"|",?$/g, ""));
  // inconsistencies between presets
  out.notes = [
    'Biome\'s noExcessiveClassesPerFile (style, since 2.3.12, default 1) is "off" in the Biome core preset (added with the Biome 2.5.2 upgrade, aea7fc06, 2026-07-04, without a comment), while max-classes-per-file is "error" (1) in the Oxlint and ESLint presets, so a Biome user gets no one-class-per-file limit. Checked by linting calibration/length-limits/classes.ts with the core preset: no report.',
    'sonarjs/nested-control-flow is off as "a duplicate of max-depth". It isn\'t one: it counts nesting across function boundaries (a callback inside two loops starts at depth 2) and defaults to 3, where max-depth resets at each function and defaults to 4 (corpus-lint.json, calibration L21).',
  ];
  lib.writeJson(join(lib.RESULTS_DIR, "rules.json"), out);
  console.log(
    JSON.stringify(
      {
        biome: out.biome,
        eslint: out.eslint["src/example.ts"],
        oxlint: out.oxlint,
      },
      null,
      1
    ).slice(0, 4000)
  );
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
