// Which accessibility rules Ultracite turns on, per linter, preset and file type, read from the
// presets themselves (packages/cli/config), with each rule's effective options.
//
//   Oxlint  every preset under config/oxlint (core, react, js-plugins and the framework presets),
//           with the catalogue from `oxlint --rules` (category, fix kind, type-awareness)
//   ESLint  resolved with ESLint's own calculateConfigForFile for each file type a preset covers:
//           core + react on .tsx, .jsx and .js; core + astro on .astro; core + vue on .vue; core +
//           svelte on .svelte; core + angular on .ts; core on .html. ESLint 10 materialises rule
//           defaults, so these are the options a file actually gets.
//   Biome   the a11y group in core and every framework preset's overrides, Biome's recommended set
//           (the presets don't turn `recommended` off), the a11y-related nursery rules, and
//           `biome explain` for each rule's fix kind, options and the languages its documented
//           examples are written in. Which file types the rules really run on is measured by the
//           calibration (a11y-linters.cjs), not assumed from the docs.
//
// It also lines up each concept across the three linters, lists the gaps, and records the
// accessibility lines of the AGENTS.md template (packages/cli/src/data/rules.ts) and the skill.
//
// Usage (from the repo root):
//   node research/corpus/scripts/a11y-inventory.cjs [--print-focus]
// Writes results/accessibility/inventory.json. --print-focus prints the Oxlint rule names the core,
// react and js-plugins presets enable, for rule-census.cjs --focus.
"use strict";

const { execFileSync } = require("node:child_process");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./a11y-lib.cjs");

const { dc } = lib;
const CLI_REQUIRE = (name) =>
  require(require.resolve(name, { paths: [lib.CLI] }));
const severity = (value) => (Array.isArray(value) ? value[0] : value);
const optionsOf = (value) => (Array.isArray(value) ? value.slice(1) : []);
const isOn = (value) => !["off", 0, undefined].includes(severity(value));

// ── Oxlint ─────────────────────────────────────────────────────────────
const oxlintCatalogue = () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [dc.oxlintBin, "--rules", "--format", "json"],
      {
        encoding: "utf8",
        maxBuffer: 1 << 26,
      }
    )
  );
  const name = (scope, rule) =>
    scope === "eslint" ? rule : `${scope.replaceAll("_", "-")}/${rule}`;
  return new Map(rows.map((r) => [name(r.scope, r.value), r]));
};
const oxlintPresetNames = () =>
  readdirSync(join(lib.CLI, "config/oxlint"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
const oxlintPreset = async (name) =>
  (
    await import(
      pathToFileURL(join(lib.CLI, "config/oxlint", name, "index.mjs")).href
    )
  ).default;

const oxlintInventory = async () => {
  const catalogue = oxlintCatalogue();
  const presets = {};
  for (const name of oxlintPresetNames()) {
    const preset = await oxlintPreset(name);
    const rules = {};
    const collectRules = (ruleMap, where) => {
      for (const [rule, value] of Object.entries(ruleMap ?? {})) {
        if (!lib.isA11yRule(rule)) {
          continue;
        }
        rules[rule] ??= [];
        rules[rule].push({
          on: isOn(value),
          options: optionsOf(value),
          where,
        });
      }
    };
    collectRules(preset.rules, "top level");
    for (const o of preset.overrides ?? []) {
      collectRules(o.rules, `override ${JSON.stringify(o.files)}`);
    }
    presets[name] = {
      a11yRules: rules,
      plugins: preset.plugins ?? [],
      settings: preset.settings ?? null,
    };
  }
  const jsxA11y = [...catalogue.entries()]
    .filter(([n]) => n.startsWith("jsx-a11y/"))
    .map(([n, r]) => ({
      category: r.category,
      fix: r.fix,
      rule: n,
      typeAware: r.type_aware,
    }));
  // What Oxlint 1.86.0 implements in the other plugins this inventory counts.
  const otherA11y = [...catalogue.entries()]
    .filter(([n]) => !n.startsWith("jsx-a11y/") && lib.isA11yRule(n))
    .map(([n, r]) => ({ category: r.category, fix: r.fix, rule: n }));
  return { catalogue: { jsxA11y, other: otherA11y }, presets };
};

// ── ESLint ─────────────────────────────────────────────────────────────
const ESLINT_TARGETS = [
  { file: "component.tsx", presets: ["core", "react"] },
  { file: "component.jsx", presets: ["core", "react"] },
  { file: "component.js", presets: ["core", "react"] },
  { file: "page.astro", presets: ["core", "astro"] },
  { file: "Component.vue", presets: ["core", "vue"] },
  { file: "Component.svelte", presets: ["core", "svelte"] },
  { file: "component.ts", presets: ["core", "angular"] },
  { file: "template.html", presets: ["core"] },
  { file: "page.tsx", presets: ["core", "react", "next"] },
  {
    file: "component.tsx (solid)",
    path: "solid.tsx",
    presets: ["core", "solid"],
  },
  { file: "component.tsx (qwik)", path: "qwik.tsx", presets: ["core", "qwik"] },
];
const eslintEffective = async (presets, path) => {
  const { ESLint } = CLI_REQUIRE("eslint");
  const blocks = await dc.eslintBlocks({ presets });
  const eslint = new ESLint({
    cwd: "/tmp/a11y-inventory",
    ignore: false,
    overrideConfig: blocks,
    overrideConfigFile: true,
  });
  const config = await eslint.calculateConfigForFile(
    `/tmp/a11y-inventory/${path}`
  );
  return config?.rules ?? {};
};
const eslintPluginMeta = async () => {
  // Some plugins are ESM-only ("exports" has only an `import` condition), so resolve the entry
  // from the package's own package.json.
  const load = async (name) => {
    const dir = join(lib.CLI, "node_modules", name);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    const exp = pkg.exports?.["."] ?? pkg.exports;
    const pick = (e) => {
      if (e === null || e === undefined) {
        return null;
      }
      return typeof e === "string"
        ? e
        : (pick(e.import) ?? pick(e.default) ?? pick(e.require));
    };
    const entry = pick(exp) ?? pkg.module ?? pkg.main ?? "index.js";
    const mod = await import(pathToFileURL(join(dir, entry)).href);
    return mod.default ?? mod;
  };
  const out = {};
  for (const [prefix, name] of [
    ["jsx-a11y/", "eslint-plugin-jsx-a11y"],
    ["github/", "eslint-plugin-github"],
    ["sonarjs/", "eslint-plugin-sonarjs"],
    ["react/", "eslint-plugin-react"],
    ["react-doctor/", "eslint-plugin-react-doctor"],
    ["astro/", "eslint-plugin-astro"],
    ["svelte/", "eslint-plugin-svelte"],
  ]) {
    const plugin = await load(name);
    for (const [rule, def] of Object.entries(plugin.rules ?? {})) {
      const full = `${prefix}${rule}`;
      if (!lib.isA11yRule(full)) {
        continue;
      }
      out[full] = {
        deprecated: Boolean(def.meta?.deprecated),
        description: def.meta?.docs?.description ?? null,
        fixable: def.meta?.fixable ?? null,
        hasSuggestions: Boolean(def.meta?.hasSuggestions),
      };
    }
  }
  return out;
};
const eslintInventory = async () => {
  const byFile = {};
  for (const t of ESLINT_TARGETS) {
    const rules = await eslintEffective(t.presets, t.path ?? t.file);
    const a11y = {};
    for (const [rule, value] of Object.entries(rules)) {
      if (lib.isA11yRule(rule)) {
        a11y[rule] = {
          on: isOn(value),
          options: optionsOf(value),
        };
      }
    }
    byFile[`${t.presets.join("+")} ${t.file}`] = {
      on: Object.keys(a11y).filter((r) => a11y[r].on).length,
      rules: a11y,
    };
  }
  return { byFile, plugins: await eslintPluginMeta() };
};

// ── Biome ──────────────────────────────────────────────────────────────
const biomePreset = (name) => {
  const { parse } = CLI_REQUIRE("jsonc-parser");
  return parse(
    readFileSync(join(lib.CLI, "config/biome", name, "biome.jsonc"), "utf8")
  );
};
const biomeSchemaRules = (group) => {
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
  return Object.keys(defs[group]?.properties ?? {}).filter(
    (r) => !["recommended", "all", "preset"].includes(r)
  );
};
const biomeExplain = (rule) => {
  const text = execFileSync(process.execPath, [dc.biomeBin, "explain", rule], {
    encoding: "utf8",
  });
  const description = text
    .split(/\nDescription\n/)[1]
    ?.split(/\n(?:Examples|Options|Invalid|Valid)\n/)[0]
    ?.trim()
    .replaceAll(/\n\s*\n/g, "\n\n")
    .replaceAll(/\n /g, "\n");
  const options = text
    .split(/\nOptions\n/)[1]
    ?.split(/\n(?:Related links|Examples|Invalid|Valid)\n/)[0]
    ?.trim()
    .slice(0, 2000);
  const fences = [
    ...new Set(
      [...text.matchAll(/```([a-z]+)/g)]
        .map((m) => m[1])
        .filter((l) => l !== "json")
    ),
  ].sort();
  return {
    defaultSeverity: /Default severity: (\w+)/.exec(text)?.[1] ?? null,
    description: description ?? null,
    docLanguages: fences,
    fix: /- Fix: (\w+)/.exec(text)?.[1] ?? "none",
    options: options ?? null,
    recommended: /This rule is recommended/.test(text),
    since: /Available from version: ([\d.]+)/.exec(text)?.[1] ?? null,
    sources: [...text.matchAll(/Same as (?:\[)?`?([^`\]\n]+)`?/g)].map(
      (m) => m[1]
    ),
  };
};
const biomeInventory = () => {
  const core = biomePreset("core");
  const a11y = core.linter.rules.a11y;
  const rules = biomeSchemaRules("A11y").map((name) => {
    const setting = a11y[name];
    const level =
      typeof setting === "string" ? setting : (setting?.level ?? null);
    return {
      level,
      options: typeof setting === "object" ? (setting.options ?? null) : null,
      rule: `a11y/${name}`,
      ...biomeExplain(name),
    };
  });
  // Nursery rules about accessibility (not enabled by any preset; Ultracite lists no nursery rules
  // except where noted).
  const nurseryA11y = biomeSchemaRules("Nursery")
    .filter((r) =>
      /aria|alt|label|role|focus|tabindex|keyboard|anchor|heading|lang|button|svg|interactive|caption|control/i.test(
        r
      )
    )
    .map((name) => ({
      level: core.linter.rules.nursery?.[name] ?? null,
      rule: `nursery/${name}`,
      ...biomeExplain(name),
    }));
  const frameworks = {};
  for (const name of readdirSync(join(lib.CLI, "config/biome"))) {
    if (name === "core") {
      continue;
    }
    const preset = biomePreset(name);
    const overrides = (preset.overrides ?? [])
      .filter((o) => o.linter?.rules?.a11y)
      .map((o) => ({ a11y: o.linter.rules.a11y, includes: o.includes }));
    frameworks[name] = {
      a11yTopLevel: preset.linter?.rules?.a11y ?? null,
      a11yOverrides: overrides,
      html: preset.html ?? null,
    };
  }
  return {
    coreHtml: core.html ?? null,
    coreOverridesDisablingLinter: (core.overrides ?? [])
      .filter((o) => o.linter?.enabled === false)
      .map((o) => o.includes),
    frameworks,
    nurseryA11y,
    rules,
  };
};

// ── template lines ─────────────────────────────────────────────────────
const templateLines = () => {
  const grab = (path) => {
    const lines = readFileSync(join(lib.ULTRACITE, path), "utf8").split("\n");
    return lines
      .map((text, i) => ({ line: i + 1, text }))
      .filter(({ text }) =>
        /accessib|a11y|aria|alt text|semantic|keyboard|heading|label|role|tabindex|focus/i.test(
          text
        )
      )
      .filter(
        ({ text }) => !/Focus your attention|focused and under/i.test(text)
      );
  };
  return {
    "packages/cli/src/data/rules.ts": grab("packages/cli/src/data/rules.ts"),
    "skills/ultracite/references/code-standards.md": grab(
      "skills/ultracite/references/code-standards.md"
    ),
  };
};

// ── concepts and gaps ──────────────────────────────────────────────────
const concepts = (ox, es, bi) => {
  const oxOn = (presets, rule) =>
    presets.some((p) =>
      (ox.presets[p]?.a11yRules[rule] ?? []).some(
        (x) => x.on && x.where === "top level"
      )
    );
  const tsx = es.byFile["core+react component.tsx"].rules;
  const biomeLevel = (rule) =>
    rule.startsWith("nursery/")
      ? (bi.nurseryA11y.find((r) => r.rule === rule)?.level ?? "off (nursery)")
      : bi.rules.find((r) => r.rule === rule)?.level;
  return lib.CONCEPTS.map((c) => ({
    biome: c.biome,
    biomeLevel: biomeLevel(c.biome) ?? "not in Biome",
    concept: c.concept,
    eslint: tsx[c.jsx]?.on ? "on" : tsx[c.jsx] ? "off" : "not in preset",
    eslintOptions: tsx[c.jsx]?.options ?? [],
    oxlintDefault: oxOn(["core", "react"], c.jsx)
      ? "on"
      : ox.presets.react.a11yRules[c.jsx]
        ? "off"
        : "not in preset",
    oxlintJsPlugins: oxOn(["js-plugins"], c.jsx) ? "on" : "–",
    oxlintOptions:
      ox.presets.react.a11yRules[c.jsx]?.[0]?.options ??
      ox.presets["js-plugins"].a11yRules[c.jsx]?.[0]?.options ??
      [],
    rule: c.jsx,
  }));
};
const gaps = (ox, es, bi) => {
  const oxDefault = new Set(
    ["core", "react"].flatMap((p) =>
      Object.entries(ox.presets[p].a11yRules)
        .filter(([, v]) => v.some((x) => x.on && x.where === "top level"))
        .map(([r]) => r)
    )
  );
  const oxJs = new Set(
    Object.entries(ox.presets["js-plugins"].a11yRules)
      .filter(([, v]) => v.some((x) => x.on))
      .map(([r]) => r)
  );
  const esTsx = new Set(
    Object.entries(es.byFile["core+react component.tsx"].rules)
      .filter(([, v]) => v.on)
      .map(([r]) => dc.toOxlintName(r))
  );
  const biOn = new Set(
    bi.rules.filter((r) => r.level && r.level !== "off").map((r) => r.rule)
  );
  const conceptJsx = new Set(lib.CONCEPTS.map((c) => c.jsx));
  const sorted = (s) => [...s].sort();
  return {
    biomeOnWithNoConceptInOxlintDefault: sorted(
      lib.CONCEPTS.filter(
        (c) => biOn.has(c.biome) && !oxDefault.has(c.jsx)
      ).map((c) => `${c.biome} (${c.jsx})`)
    ),
    biomeRulesWithNoConcept: sorted(
      [...biOn].filter((r) => !lib.CONCEPTS.some((c) => c.biome === r))
    ),
    eslintOnly: sorted(
      [...esTsx].filter((r) => !oxDefault.has(r) && !oxJs.has(r))
    ),
    eslintOnNotOxlintDefault: sorted(
      [...esTsx].filter((r) => !oxDefault.has(r))
    ),
    jsxA11yConceptsMissingInBiome: sorted(
      lib.CONCEPTS.filter(
        (c) => oxDefault.has(c.jsx) && !biOn.has(c.biome)
      ).map((c) => `${c.jsx} (${c.biome})`)
    ),
    oxlintDefaultNotEslint: sorted([...oxDefault].filter((r) => !esTsx.has(r))),
    oxlintJsPluginsNotEslint: sorted([...oxJs].filter((r) => !esTsx.has(r))),
    rulesNotInConceptTable: sorted(
      [...new Set([...oxDefault, ...oxJs, ...esTsx])].filter(
        (r) => !conceptJsx.has(r)
      )
    ),
  };
};

const main = async () => {
  const ox = await oxlintInventory();
  const es = await eslintInventory();
  const bi = biomeInventory();
  if (lib.flag("print-focus")) {
    const focus = new Set();
    for (const p of ["core", "react", "js-plugins"]) {
      for (const [rule, v] of Object.entries(ox.presets[p].a11yRules)) {
        if (v.some((x) => x.on && x.where === "top level")) {
          focus.add(rule);
        }
      }
    }
    console.log([...focus].sort().join(","));
    return;
  }
  const result = {
    concepts: concepts(ox, es, bi),
    eslint: es,
    gaps: gaps(ox, es, bi),
    generated: new Date().toISOString().slice(0, 10),
    biome: bi,
    note: "Oxlint rule names; ESLint names are normalised to Oxlint's spelling in `gaps` (`@typescript-eslint/` → `typescript/`). react-doctor rules count when react-doctor files them under Accessibility (its own registry, dist/core.js). File types the rules actually run on are measured in linters.json (calibration), not taken from these configs.",
    oxlint: ox,
    reactDoctorAccessibility: [...lib.reactDoctorCategories()]
      .filter(([, v]) => v.category === "Accessibility")
      .map(([id, v]) => ({ id, title: v.title })),
    template: templateLines(),
    tools: lib.toolVersions(),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "inventory.json"), result);
  const count = (o) =>
    Object.values(o).filter((v) => v.some((x) => x.on)).length;
  console.log(
    `oxlint react ${count(ox.presets.react.a11yRules)} on, js-plugins ${count(ox.presets["js-plugins"].a11yRules)}; eslint ${Object.entries(
      es.byFile
    )
      .map(([k, v]) => `${k}: ${v.on}`)
      .join(
        ", "
      )}; biome a11y ${bi.rules.filter((r) => r.level && r.level !== "off").length} on`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
