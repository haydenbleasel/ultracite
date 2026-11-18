// The type-import rules as Ultracite's presets set them, per linter: every Oxlint preset (top level
// and overrides) and `oxlint --rules` (category, fix kind, whether it needs type information);
// ESLint resolved with calculateConfigForFile for a .ts, a .tsx, a .js and a test file (core, core +
// type-aware, core + nestjs, core + angular), with each rule's meta, default options and messages;
// every Biome preset, and `biome explain` for each Biome rule (fix, default severity, options, the
// decorator caveat); the comments above each setting in the preset sources; the agent prompt's
// lines and the AGENTS.md template's; and the preset inconsistencies found. Fails if the settings
// type-imports-lib.cjs runs as "Ultracite's" (the first variant of each rule) drift from the
// presets.
//
// Usage: node research/corpus/scripts/type-imports-rules.cjs
// Writes results/type-imports/rules.json.
"use strict";

const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./type-imports-lib.cjs");

const OXLINT_RULES = [
  "typescript/consistent-type-imports",
  "typescript/consistent-type-exports",
  "typescript/no-import-type-side-effects",
  "import/consistent-type-specifier-style",
  "import/no-duplicates",
  "no-duplicate-imports",
  "no-unused-vars",
  "import/no-unassigned-import",
  "unicorn/prefer-export-from",
];
const ESLINT_RULES = [
  "@typescript-eslint/consistent-type-imports",
  "@typescript-eslint/consistent-type-exports",
  "@typescript-eslint/no-import-type-side-effects",
  "import-x/consistent-type-specifier-style",
  "import-x/no-duplicates",
  "no-duplicate-imports",
  "@typescript-eslint/no-unused-vars",
  "unused-imports/no-unused-imports",
  "import-x/no-unassigned-import",
];
const BIOME_RULES = {
  correctness: ["noUnusedImports"],
  style: ["useImportType", "useExportType", "noExportedImports"],
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
// The comment lines just above a rule in a preset source file.
const commentAbove = (file, rule) => {
  const lines = readFileSync(file, "utf8").split("\n");
  const i = lines.findIndex((l) =>
    new RegExp(`^\\s*["']?${rule.replace(/[/@-]/g, "\\$&")}["']?\\s*:`).test(l)
  );
  if (i === -1) {
    return null;
  }
  const out = [];
  for (let j = i - 1; j >= 0 && /^\s*(?:\/\/|\/\*|\*)/.test(lines[j]); j--) {
    out.unshift(lines[j].trim().replace(/^(?:\/\/|\/\*+|\*\/?)\s?/, ""));
  }
  return out.length ? out.join(" ").trim() : null;
};

const main = async () => {
  const out = {
    generated: new Date().toISOString(),
    tools: lib.toolVersions(),
  };
  // Oxlint presets
  const oxDir = join(lib.CLI, "config/oxlint");
  out.oxlint = {};
  out.oxlintComments = {};
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
        const c = commentAbove(join(oxDir, preset, "index.mjs"), r);
        if (c) {
          out.oxlintComments[`${preset}: ${r}`] = c;
        }
      }
      for (const o of cfg.overrides ?? []) {
        if (o.rules?.[r] !== undefined) {
          where[`${r} (override ${JSON.stringify(o.files)})`] = o.rules[r];
        }
      }
    }
    if (cfg.options) {
      where.options = cfg.options;
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
        OXLINT_RULES.includes(`${r.scope}/${r.value}`) ||
        (r.scope === "eslint" && OXLINT_RULES.includes(r.value))
    )
    .map((r) => ({
      category: r.category,
      default: r.default,
      fix: r.fix,
      rule: `${r.scope}/${r.value}`,
      typeAware: r.type_aware,
    }));
  // ESLint, resolved
  const { ESLint } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  out.eslint = {};
  for (const [presets, files, typed] of [
    [
      ["core"],
      [
        "src/example.ts",
        "src/example.tsx",
        "src/example.js",
        "src/example.test.ts",
      ],
      false,
    ],
    [["core"], ["src/example.ts"], true],
    [["core", "nestjs"], ["src/example.ts"], false],
    [["core", "angular"], ["src/example.ts"], false],
  ]) {
    const eslint = new ESLint({
      cwd: lib.CLI,
      overrideConfig: await lib.dc.eslintBlocks({ presets, typed }),
      overrideConfigFile: true,
    });
    for (const file of files) {
      const cfg = await eslint.calculateConfigForFile(join(lib.CLI, file));
      out.eslint[`${presets.join("+")}${typed ? "+type-aware" : ""}: ${file}`] =
        {
          parserOptions: Object.fromEntries(
            Object.entries(cfg.languageOptions?.parserOptions ?? {}).filter(
              ([k]) => /decorator|jsxPragma|project|programs/i.test(k)
            )
          ),
          rules: Object.fromEntries(
            ESLINT_RULES.map((r) => [r, cfg.rules?.[r] ?? "(not configured)"])
          ),
          settings: Object.fromEntries(
            Object.entries(cfg.settings ?? {}).filter(([k]) =>
              k.startsWith("import-x")
            )
          ),
        };
    }
  }
  // rule meta
  const meta = (rule) =>
    rule
      ? {
          defaultOptions:
            rule.meta?.defaultOptions ?? rule.defaultOptions ?? null,
          fixable: rule.meta?.fixable ?? null,
          hasSuggestions: Boolean(rule.meta?.hasSuggestions),
          messages: rule.meta?.messages ?? null,
          requiresTypeChecking: Boolean(rule.meta?.docs?.requiresTypeChecking),
          schema: rule.meta?.schema ?? null,
        }
      : null;
  out.eslintMeta = {
    "@typescript-eslint/consistent-type-exports": meta(
      lib.tsPlugin.rules["consistent-type-exports"]
    ),
    "@typescript-eslint/consistent-type-imports": meta(
      lib.tsPlugin.rules["consistent-type-imports"]
    ),
    "@typescript-eslint/no-import-type-side-effects": meta(
      lib.tsPlugin.rules["no-import-type-side-effects"]
    ),
    "import-x/consistent-type-specifier-style": meta(
      lib.importX.rules?.["consistent-type-specifier-style"]
    ),
    "import-x/no-duplicates": meta(lib.importX.rules?.["no-duplicates"]),
  };
  out.eslintComments = {};
  for (const f of readdirSync(join(lib.CLI, "config/eslint/core/rules"))) {
    for (const r of ESLINT_RULES) {
      const c = commentAbove(join(lib.CLI, "config/eslint/core/rules", f), r);
      if (c) {
        out.eslintComments[`${f}: ${r}`] = c;
      }
    }
  }
  for (const p of ["nestjs", "angular"]) {
    const c = commentAbove(
      join(lib.CLI, `config/eslint/${p}/eslint.config.mjs`),
      "@typescript-eslint/consistent-type-imports"
    );
    if (c) {
      out.eslintComments[`${p}: @typescript-eslint/consistent-type-imports`] =
        c;
    }
  }
  // Biome presets
  const bDir = join(lib.CLI, "config/biome");
  out.biome = {};
  out.biomeComments = {};
  for (const preset of readdirSync(bDir).sort()) {
    let cfg;
    const file = join(bDir, preset, "biome.jsonc");
    try {
      cfg = lib.stripJsonc(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const where = {};
    for (const [group, names] of Object.entries(BIOME_RULES)) {
      for (const n of names) {
        const v = cfg.linter?.rules?.[group]?.[n];
        if (v !== undefined) {
          where[`${group}/${n}`] = v;
          const c = commentAbove(file, n);
          if (c) {
            out.biomeComments[`${preset}: ${n}`] = c;
          }
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
    for (const k of ["organizeImports"]) {
      const v = cfg.assist?.actions?.source?.[k];
      if (v !== undefined) {
        where[`assist/${k}`] = v;
      }
    }
    if (cfg.javascript?.jsxRuntime) {
      where.jsxRuntime = cfg.javascript.jsxRuntime;
    }
    if (cfg.javascript?.parser) {
      where.parser = cfg.javascript.parser;
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
        decoratorCaveat: /experimental TypeScript decorators/i.test(text),
        defaultSeverity: /Default severity: (\S+)/.exec(text)?.[1] ?? null,
        fix:
          /- Fix: (\S+)/.exec(text)?.[1] ??
          (/No fix available/.test(text) ? "none" : null),
        jsxRuntimeNote: /jsxRuntime/.test(text),
        recommended: /This rule is recommended/.test(text),
        since: /Available from version: (\S+)/.exec(text)?.[1] ?? null,
        styleOption: /`style`/.test(text)
          ? (/- `auto`: (.*)/.exec(text)?.[1] ?? null)
          : null,
      };
    }
  }
  // what the agent is told
  const prompt = readFileSync(join(lib.CLI, "src/agent-fix/prompt.ts"), "utf8");
  out.prompt = prompt
    .split("\n")
    .filter((l) =>
      /minimal change|runtime behavior|hides the code|help text|suppression|LEFT_FOR_REVIEW_LABEL}|Edit only/.test(
        l
      )
    )
    .map((l) => l.trim().replace(/^"|",?$/g, ""));
  const rulesTs = readFileSync(join(lib.CLI, "src/data/rules.ts"), "utf8");
  out.agentRulesTemplate = rulesTs
    .split("\n")
    .filter(
      (l) =>
        /import type|type import|`type`|import\b/i.test(l) &&
        /^- |^\s*"- /.test(l.trim())
    )
    .map((l) => l.trim());
  out.skillStandards = readFileSync(
    join(lib.ULTRACITE, "skills/ultracite/references/code-standards.md"),
    "utf8"
  )
    .split("\n")
    .filter(
      (l) => /import type|type import|import\b/i.test(l) && /^- /.test(l.trim())
    )
    .map((l) => l.trim());
  // drift: the variants the scripts call Ultracite's must be the presets'
  const sev = (v) => (Array.isArray(v) ? v[0] : v);
  const opts = (v) => (Array.isArray(v) ? v.slice(1) : []);
  const drift = [];
  const core = out.oxlint.core ?? {};
  const want = {
    "import/consistent-type-specifier-style": ["prefer-top-level"],
    "import/no-duplicates": [],
    "typescript/consistent-type-exports": [],
    "typescript/consistent-type-imports": [],
    "typescript/no-import-type-side-effects": [],
  };
  for (const [r, o] of Object.entries(want)) {
    if (
      sev(core[r]) !== "error" ||
      JSON.stringify(opts(core[r])) !== JSON.stringify(o)
    ) {
      drift.push(`oxlint core ${r}: ${JSON.stringify(core[r])}`);
    }
  }
  const es = out.eslint["core: src/example.ts"].rules;
  for (const [r, o] of [
    ["@typescript-eslint/consistent-type-imports", []],
    ["@typescript-eslint/no-import-type-side-effects", []],
    ["import-x/consistent-type-specifier-style", ["prefer-top-level"]],
    ["import-x/no-duplicates", []],
  ]) {
    if (
      ![2, "error"].includes(sev(es[r])) ||
      JSON.stringify(opts(es[r])) !== JSON.stringify(o)
    ) {
      drift.push(`eslint core ${r}: ${JSON.stringify(es[r])}`);
    }
  }
  const b = out.biome.core ?? {};
  for (const r of ["style/useImportType", "style/useExportType"]) {
    if (b[r] !== "error") {
      drift.push(`biome core ${r}: ${JSON.stringify(b[r])}`);
    }
  }
  out.optionDrift = drift;
  lib.writeJson(join(lib.RESULTS_DIR, "rules.json"), lib.scrubDeep(out));
  console.log(
    JSON.stringify(
      {
        biome: out.biome,
        drift,
        eslint: out.eslint,
        oxlint: out.oxlint,
        oxlintComments: out.oxlintComments,
        oxlintRules: out.oxlintRules,
      },
      null,
      1
    )
  );
  if (drift.length > 0) {
    throw new Error(`the scripts' settings differ from the presets: ${drift}`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
