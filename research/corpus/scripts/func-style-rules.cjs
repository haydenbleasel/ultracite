// The rules this topic is about, as Ultracite's presets set them, per linter: every Oxlint preset
// (top level and overrides) and `oxlint --rules` (category, fix kind); ESLint resolved with
// calculateConfigForFile for a .ts, a .tsx, a .js and a test file (core, and core + react), and a
// TanStack route file (core + react + tanstack); every Biome preset, and `biome explain` for each
// Biome rule (fix, default severity, version, group); the agent prompt's lines and the AGENTS.md
// template's lines about functions; and the preset inconsistencies found.
//
// Usage: node research/corpus/scripts/func-style-rules.cjs
// Writes results/func-style/rules.json.
"use strict";

const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./func-style-lib.cjs");

const OXLINT_RULES = [
  "func-style",
  "no-use-before-define",
  "func-names",
  "func-name-matching",
  "prefer-arrow-callback",
  "arrow-body-style",
  "no-inner-declarations",
  "no-func-assign",
  "no-loop-func",
  "unicorn/consistent-function-scoping",
  "typescript/prefer-function-type",
  "typescript/explicit-function-return-type",
  "typescript/explicit-module-boundary-types",
  "react/function-component-definition",
  "import/exports-last",
  "import/group-exports",
];
const ESLINT_RULES = [
  ...OXLINT_RULES.filter((r) => !r.startsWith("typescript/")),
  "@typescript-eslint/no-use-before-define",
  "@typescript-eslint/prefer-function-type",
  "@typescript-eslint/explicit-function-return-type",
  "@typescript-eslint/explicit-module-boundary-types",
  "import-x/exports-last",
  "import-x/group-exports",
].filter((r) => !r.startsWith("import/"));
const BIOME_RULES = {
  complexity: ["useArrowFunction"],
  correctness: ["noInvalidUseBeforeDeclaration", "noInnerDeclarations"],
  nursery: [
    "useConsistentFunctionStyle",
    "useReactFunctionComponentDefinition",
    "useNamedFunction",
    "useMatchingFunctionName",
  ],
  style: ["useConsistentArrowReturn", "useExportsLast"],
  suspicious: ["noFunctionAssign"],
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
  // ESLint, resolved
  const { ESLint } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  out.eslint = {};
  for (const [presets, files] of [
    [["core"], ["src/example.ts", "src/example.js", "src/example.test.ts"]],
    [
      ["core", "react"],
      ["src/example.tsx", "src/example.jsx"],
    ],
    [
      ["core", "react", "tanstack"],
      ["src/routes/posts.$id.tsx", "src/example.tsx"],
    ],
  ]) {
    const eslint = new ESLint({
      cwd: lib.CLI,
      overrideConfig: await lib.dc.eslintBlocks({ presets }),
      overrideConfigFile: true,
    });
    for (const file of files) {
      const cfg = await eslint.calculateConfigForFile(join(lib.CLI, file));
      out.eslint[`${presets.join("+")}: ${file}`] = Object.fromEntries(
        ESLINT_RULES.map((r) => [r, cfg.rules?.[r] ?? "(not configured)"])
      );
    }
  }
  // the rules' fixability and suggestions, from their meta
  const { builtinRules } = require(
    require.resolve("eslint/use-at-your-own-risk", { paths: [lib.CLI] })
  );
  const tsPlugin = require(
    require.resolve("@typescript-eslint/eslint-plugin", { paths: [lib.CLI] })
  );
  const reactPlugin = require(
    require.resolve("eslint-plugin-react", { paths: [lib.CLI] })
  );
  const meta = (rule) =>
    rule
      ? {
          fixable: rule.meta?.fixable ?? null,
          hasSuggestions: Boolean(rule.meta?.hasSuggestions),
          messages: rule.meta?.messages ?? null,
        }
      : null;
  out.eslintMeta = {
    "@typescript-eslint/no-use-before-define": meta(
      tsPlugin.rules["no-use-before-define"]
    ),
    "arrow-body-style": meta(builtinRules.get("arrow-body-style")),
    "func-names": meta(builtinRules.get("func-names")),
    "func-style": meta(builtinRules.get("func-style")),
    "no-use-before-define": meta(builtinRules.get("no-use-before-define")),
    "prefer-arrow-callback": meta(builtinRules.get("prefer-arrow-callback")),
    "react/function-component-definition": meta(
      reactPlugin.rules["function-component-definition"]
    ),
  };
  // Biome presets
  const bDir = join(lib.CLI, "config/biome");
  out.biome = {};
  for (const preset of readdirSync(bDir).sort()) {
    let cfg;
    try {
      cfg = stripJsonc(
        lib.readFileSync(join(bDir, preset, "biome.jsonc"), "utf8")
      );
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
  out.biomeExplain = {};
  for (const names of Object.values(BIOME_RULES)) {
    for (const n of names) {
      const text = lib.spawnSync(
        process.execPath,
        [lib.biomeBin, "explain", n],
        { encoding: "utf8" }
      ).stdout;
      out.biomeExplain[n] = {
        category: /Diagnostic category: (\S+)/.exec(text)?.[1] ?? null,
        defaultSeverity: /Default severity: (\S+)/.exec(text)?.[1] ?? null,
        fix:
          /- Fix: (\S+)/.exec(text)?.[1] ??
          (/No fix available/.test(text) ? "none" : null),
        recommended: /This rule is recommended/.test(text),
        since: /Available from version: (\S+)/.exec(text)?.[1] ?? null,
      };
    }
  }
  // what the agent is told
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
  out.agentRulesTemplate = lib
    .readFileSync(join(lib.CLI, "src/data/rules.ts"), "utf8")
    .split("\n")
    .filter(
      (l) => /arrow|function|hoist|order/i.test(l) && /^- /.test(l.trim())
    )
    .map((l) => l.trim());
  out.notes = [
    "Biome: Ultracite's Biome preset has no function-style rule. Biome 2.5.14 added nursery/useConsistentFunctionStyle (style \"expression\" by default), which reports the same 10,134 corpus declarations as ESLint's func-style (linters.json); nursery rules aren't enabled (biome/core comment, issue #457), so Biome users get no func-style.",
    "Oxlint's func-style doesn't report a declaration that shares its name with a type alias, an interface or a namespace (7 corpus declarations; calibration c32, c33). ESLint and Biome report them.",
    'react/function-component-definition (namedComponents: "arrow-function", both presets) rewrites component declarations as const arrows: an autofix in ESLint (`ultracite fix`) and a suggestion in Oxlint (`ultracite fix --unsafe`). It doesn\'t check order. A TanStack route file, where the tanstack preset turns no-use-before-define off, then throws at import ("Cannot access \'RouteComponent\' before initialization"; calibration c23, presetFixes).',
    'Oxlint\'s react/function-component-definition reports an unnamed component in memo()/forwardRef() as "not a function expression" (unnamedComponents defaults to "function-expression"); its suggestion rewrites the arrow as a function expression, and prefer-arrow-callback\'s safe fix rewrites it back, so `ultracite fix --unsafe` and `ultracite fix` undo each other.',
    "no-use-before-define at its defaults (functions: true) already reports every reference to a function declaration above its definition, so the presets ask for bottom-up order before any conversion; converting declarations adds no reports, it changes which ones would crash.",
    "The TanStack presets' comment says tsc still catches real temporal dead zone crashes (TS2448). It catches direct reads in the same scope (calibration c15, c16, c18, c20, c21, c36) but not a read inside a callback that runs at load time (c28) or inside a function called at load time (c29).",
    "Biome's noInvalidUseBeforeDeclaration, the only use-before-define rule in the Biome preset, reports no corpus line and misses the load-time crashes in calibration c18 (decorator), c20 (extends), c28 (Array#map callback), c29 (a call at load time) and c36 (IIFE).",
  ];
  lib.writeJson(join(lib.RESULTS_DIR, "rules.json"), out);
  console.log(
    JSON.stringify(
      {
        biome: out.biome,
        eslintTs: out.eslint["core: src/example.ts"],
        oxlint: out.oxlint,
      },
      null,
      1
    ).slice(0, 3000)
  );
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
