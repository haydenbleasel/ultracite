// The rules this topic is about, as Ultracite's presets set them, per linter: every Oxlint preset
// (top level and overrides) and `oxlint --rules` (category, fix kind); ESLint resolved with
// calculateConfigForFile for a .ts, a .tsx, a .js and a test file (core, and core + react); every
// Biome preset, and `biome explain` for each Biome rule (fix, default severity, version, group);
// each ESLint rule's meta (fixable, suggestions, messages, default options); the agent prompt's
// lines and the AGENTS.md template's lines about conditionals; and the preset inconsistencies
// found. Fails if the options nested-ternaries-lib.cjs runs prefer-ternary or
// prefer-minimal-ternary with differ from the resolved ESLint preset.
//
// Usage: node research/corpus/scripts/nested-ternaries-rules.cjs
// Writes results/nested-ternaries/rules.json.
"use strict";

const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./nested-ternaries-lib.cjs");

const OXLINT_RULES = [
  "no-nested-ternary",
  "no-ternary",
  "no-unneeded-ternary",
  "no-negated-condition",
  "no-else-return",
  "no-lonely-if",
  "curly",
  "complexity",
  "prefer-const",
  "func-style",
  "no-use-before-define",
  "unicorn/no-nested-ternary",
  "unicorn/prefer-ternary",
  "unicorn/prefer-logical-operator-over-ternary",
  "unicorn/no-negated-condition",
  "unicorn/no-lonely-if",
  "unicorn/no-useless-undefined",
  "sonarjs/no-nested-conditional",
  "sonarjs/cognitive-complexity",
  "sonarjs/prefer-single-boolean-return",
  "sonarjs/no-collapsible-if",
  "sonarjs/prefer-immediate-return",
  "sonarjs/no-redundant-jump",
  "react/jsx-no-useless-fragment",
  "react-doctor/rendering-conditional-render",
];
const ESLINT_RULES = [
  ...OXLINT_RULES.filter(
    (r) => !r.startsWith("react-doctor/") && !r.startsWith("react/")
  ),
  "unicorn/prefer-minimal-ternary",
  "unicorn/no-unnecessary-nested-ternary",
  "@stylistic/multiline-ternary",
  "multiline-ternary",
  "operator-linebreak",
  "no-mixed-operators",
  "react/jsx-no-leaked-render",
  "react/jsx-no-useless-fragment",
];
const BIOME_RULES = {
  complexity: [
    "noUselessTernary",
    "noExcessiveCognitiveComplexity",
    "useSimplifiedLogicExpression",
    "noUselessUndefinedInitialization",
  ],
  nursery: ["noLeakedRender", "noTernary", "noNestedTernary"],
  style: [
    "noNestedTernary",
    "noNegationElse",
    "noUselessElse",
    "useCollapsedIf",
    "useCollapsedElseIf",
    "useBlockStatements",
    "useConst",
  ],
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
// The comment lines just above a rule in a preset source file.
const commentAbove = (file, rule) => {
  const lines = lib.readFileSync(file, "utf8").split("\n");
  const i = lines.findIndex((l) =>
    new RegExp(`^\\s*["']?${rule.replace(/[/-]/g, "\\$&")}["']?\\s*:`).test(l)
  );
  if (i === -1) {
    return null;
  }
  const out = [];
  for (let j = i - 1; j >= 0 && /^\s*\/\//.test(lines[j]); j--) {
    out.unshift(lines[j].trim().replace(/^\/\/\s?/, ""));
  }
  return out.length ? out.join(" ") : null;
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
    if (Object.keys(where).length) {
      out.oxlint[preset] = where;
    }
  }
  const rulesJson = JSON.parse(
    lib.spawnSync(
      process.execPath,
      [lib.oxlintBin, "--rules", "--format", "json"],
      { encoding: "utf8", maxBuffer: 1 << 28 }
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
  // the options the census runs must be Ultracite's
  const ts = out.eslint["core: src/example.ts"];
  const canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])])
          )
        : v;
  const same = (a, b) =>
    JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const sev = (v) => (Array.isArray(v) ? v[0] : v);
  const opts = (v) => (Array.isArray(v) ? v.slice(1) : []);
  const drift = [];
  if (
    !same(opts(ts["unicorn/prefer-ternary"]), lib.PREFER_TERNARY_OPTIONS) ||
    ![2, "error"].includes(sev(ts["unicorn/prefer-ternary"]))
  ) {
    drift.push(
      `prefer-ternary: ${JSON.stringify(ts["unicorn/prefer-ternary"])}`
    );
  }
  if (
    !same(
      opts(ts["unicorn/prefer-minimal-ternary"]),
      lib.PREFER_MINIMAL_OPTIONS
    )
  ) {
    drift.push(
      `prefer-minimal-ternary: ${JSON.stringify(ts["unicorn/prefer-minimal-ternary"])}`
    );
  }
  for (const r of [
    "no-nested-ternary",
    "no-unneeded-ternary",
    "no-else-return",
    "sonarjs/no-nested-conditional",
  ]) {
    if (![2, "error"].includes(sev(ts[r])) || opts(ts[r]).length > 0) {
      // the census runs these at their defaults; resolved options must be the defaults too
      const meta =
        lib.builtinRules.get(r)?.meta ??
        lib.sonarjs.rules[r.replace("sonarjs/", "")]?.meta;
      if (!same(opts(ts[r]), meta?.defaultOptions ?? [])) {
        drift.push(`${r}: ${JSON.stringify(ts[r])}`);
      }
    }
  }
  if (sev(ts["unicorn/no-nested-ternary"]) !== 0) {
    drift.push(
      `unicorn/no-nested-ternary is ${JSON.stringify(ts["unicorn/no-nested-ternary"])}`
    );
  }
  out.optionDrift = drift;
  // rule meta
  const meta = (rule) =>
    rule
      ? {
          defaultOptions: rule.meta?.defaultOptions ?? null,
          fixable: rule.meta?.fixable ?? null,
          hasSuggestions: Boolean(rule.meta?.hasSuggestions),
          messages: rule.meta?.messages ?? null,
        }
      : null;
  out.eslintMeta = {};
  for (const r of ESLINT_RULES) {
    if (r.startsWith("unicorn/")) {
      out.eslintMeta[r] = meta(lib.unicorn.rules[r.slice(8)]);
    } else if (r.startsWith("sonarjs/")) {
      out.eslintMeta[r] = meta(lib.sonarjs.rules[r.slice(8)]);
    } else if (!r.includes("/")) {
      out.eslintMeta[r] = meta(lib.builtinRules.get(r));
    }
  }
  out.eslintComments = {};
  for (const f of readdirSync(join(lib.CLI, "config/eslint/core/rules"))) {
    for (const r of ESLINT_RULES) {
      const c = commentAbove(join(lib.CLI, "config/eslint/core/rules", f), r);
      if (c) {
        out.eslintComments[`${f}: ${r}`] = c;
      }
    }
  }
  const coreCfg = join(lib.CLI, "config/eslint/core/eslint.config.mjs");
  for (const r of ["curly"]) {
    const c = commentAbove(coreCfg, r);
    if (c) {
      out.eslintComments[`eslint.config.mjs: ${r}`] = c;
    }
  }
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
      if (out.biomeExplain[n]) {
        continue;
      }
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
  // formatter options that bear on ternaries
  const oxfmt = await lib.oxfmtConfig();
  const prettier = await lib.prettierConfig();
  out.formatters = {
    oxfmt: {
      experimentalTernaries: oxfmt.experimentalTernaries ?? "(not set)",
      printWidth: oxfmt.printWidth,
    },
    prettier: {
      experimentalTernaries: prettier.experimentalTernaries ?? "(not set)",
      printWidth: prettier.printWidth,
    },
  };
  // what the agent is told
  const prompt = lib.readFileSync(
    join(lib.CLI, "src/agent-fix/prompt.ts"),
    "utf8"
  );
  out.prompt = prompt
    .split("\n")
    .filter((l) =>
      /minimal change|runtime behavior|hides the code|help text|suppression|LEFT_FOR_REVIEW_LABEL}|Edit only/.test(
        l
      )
    )
    .map((l) => l.trim().replace(/^"|",?$/g, ""));
  out.agentRulesTemplate = lib
    .readFileSync(join(lib.CLI, "src/data/rules.ts"), "utf8")
    .split("\n")
    .filter(
      (l) =>
        /ternar|conditional|early return|nest/i.test(l) && /^- /.test(l.trim())
    )
    .map((l) => l.trim());
  out.skillStandards = lib
    .readFileSync(
      join(lib.ULTRACITE, "skills/ultracite/references/code-standards.md"),
      "utf8"
    )
    .split("\n")
    .filter(
      (l) =>
        /ternar|conditional|early return|nest/i.test(l) && /^- /.test(l.trim())
    )
    .map((l) => l.trim());
  lib.writeJson(join(lib.RESULTS_DIR, "rules.json"), out);
  console.log(
    JSON.stringify(
      {
        biomeCore: out.biome.core,
        drift,
        eslintTs: out.eslint["core: src/example.ts"],
        formatters: out.formatters,
        oxlintCore: out.oxlint.core,
        oxlintJs: out.oxlint["js-plugins"],
      },
      null,
      1
    )
  );
  if (drift.length > 0) {
    throw new Error(`the census's options differ from the preset: ${drift}`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
