// The rules this topic is about, as Ultracite turns them on, per linter and preset:
//   Oxlint     every hook and React Compiler rule in the react preset (and whether core or any other
//              preset touches them), react-doctor's effect rules in js-plugins, each rule's
//              category and fix kind from `oxlint --rules`, and `--print-config` of the root config
//              `ultracite init` writes for a React project
//   ESLint     core + react resolved with calculateConfigForFile for .tsx, .jsx, .ts and .js:
//              every eslint-plugin-react-hooks rule and react-doctor effect rule a file gets, with
//              options; each react-hooks rule's meta (fixable, suggestions, deprecated); the React
//              Compiler options the plugin runs with (COMPILER_OPTIONS and its feature flags)
//   Biome      the react preset's hook rules, `biome explain` (fix kind, options, domains)
//   Ultracite  the agent prompt's lines about behaviour, suppressions and "Left for review", and the
//              AGENTS.md template's lines about hooks
//
// Usage: node research/corpus/scripts/effects-inventory.cjs
// Writes results/react-effects/inventory.json.
"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./effects-lib.cjs");

const CONFIGS = join(lib.OUT_DIR, "configs");

const main = async () => {
  const imp = async (p) => (await import(pathToFileURL(p).href)).default;
  const ox = {};
  for (const p of [
    "core",
    "react",
    "js-plugins",
    "next",
    "remix",
    "tanstack",
    "vitest",
    "jest",
  ]) {
    try {
      ox[p] = await imp(join(lib.CLI, "config/oxlint", p, "index.mjs"));
    } catch {
      // not every name is a preset
    }
  }
  const catalogue = new Map(
    JSON.parse(
      lib.execFileSync(
        process.execPath,
        [lib.oxlintBin, "--rules", "--format", "json"],
        { encoding: "utf8", maxBuffer: 1 << 28 }
      )
    ).map((r) => [
      `${r.scope === "eslint" ? "" : `${r.scope.replaceAll("_", "-")}/`}${r.value}`,
      r,
    ])
  );
  const oxRules = {};
  for (const rule of lib.OXLINT_HOOK_RULES) {
    const where = {};
    for (const [p, cfg] of Object.entries(ox)) {
      if (cfg.rules?.[rule] !== undefined) {
        where[p] = cfg.rules[rule];
      }
      for (const o of cfg.overrides ?? []) {
        if (o.rules?.[rule] !== undefined) {
          where[`${p} (override ${JSON.stringify(o.files)})`] = o.rules[rule];
        }
      }
    }
    const meta = catalogue.get(rule);
    oxRules[rule] = {
      category: meta?.category ?? null,
      docs: meta?.docs_url ?? null,
      fix: meta?.fix ?? null,
      presets: where,
      typeAware: meta?.type_aware ?? null,
    };
  }
  // Oxlint's own React Compiler port rules that the react preset doesn't list (if any).
  const oxReactCatalogue = [...catalogue.keys()].filter(
    (k) => k.startsWith("react/") && catalogue.get(k).category !== "nursery"
  );
  const listed = new Set(Object.keys(ox.react.rules));
  const oxUnlisted = oxReactCatalogue.filter((k) => !listed.has(k));
  // print-config of init's root config
  // Under TMP: core's ignorePatterns skip `**/out`, so --print-config finds nothing there.
  const initDir = join(lib.TMP, "configs", "inventory");
  const initConfig = lib.writeOxlintInit(initDir, ["core", "react"]);
  const printedOut = lib.spawnSync(
    process.execPath,
    [lib.oxlintBin, "-c", initConfig, "--print-config"],
    { cwd: initDir, encoding: "utf8", maxBuffer: 1 << 28 }
  ).stdout;
  const printed = JSON.parse(printedOut.slice(printedOut.indexOf("{")));
  const printedRules = Object.fromEntries(
    Object.entries(printed.rules ?? {}).filter(
      ([r]) =>
        lib.OXLINT_HOOK_RULES.includes(r.replace(/^react-hooks\//, "react/")) ||
        /^react-hooks\//.test(r)
    )
  );

  // react-doctor
  const jsPlugins = ox["js-plugins"];
  const doctorOxlint = Object.fromEntries(
    Object.entries(jsPlugins.rules).filter(([r]) =>
      lib.REACT_DOCTOR_EFFECT_RULES.includes(r)
    )
  );
  const doctorEslintAll = await imp(
    join(lib.CLI, "config/eslint/react/rules/react-doctor.mjs")
  );
  const doctorEslint = Object.fromEntries(
    Object.entries(doctorEslintAll).filter(([r]) =>
      lib.REACT_DOCTOR_EFFECT_RULES.includes(r)
    )
  );
  const doctorRegistry = (() => {
    const { dirname } = require("node:path");
    const registry = readFileSync(
      join(dirname(lib.reactDoctorOxlintMain), "core.js"),
      "utf8"
    );
    const out = {};
    const starts = [
      ...registry.matchAll(/\{key:`react-doctor\/([a-z0-9-]+)`,id:`/g),
    ];
    for (let i = 0; i < starts.length; i++) {
      const block = registry.slice(
        starts[i].index,
        starts[i + 1]?.index ?? registry.length
      );
      out[`react-doctor/${starts[i][1]}`] = {
        category: /category:`([^`]+)`/.exec(block)?.[1] ?? null,
        title: /title:`([^`]+)`/.exec(block)?.[1] ?? null,
      };
    }
    return out;
  })();
  const doctor = Object.fromEntries(
    lib.REACT_DOCTOR_EFFECT_RULES.map((r) => [
      r,
      {
        eslintReact: doctorEslint[r] ?? null,
        oxlintJsPlugins: doctorOxlint[r] ?? null,
        ...(doctorRegistry[r] ?? { category: null, title: null }),
      },
    ])
  );

  // ESLint
  const reactHooks = require(
    require.resolve("eslint-plugin-react-hooks", { paths: [lib.CLI] })
  );
  const hooksMeta = Object.fromEntries(
    Object.entries(reactHooks.rules).map(([k, r]) => [
      `react-hooks/${k}`,
      {
        deprecated: Boolean(r.meta.deprecated),
        description: r.meta.docs?.description ?? null,
        fixable: r.meta.fixable ?? null,
        hasSuggestions: Boolean(r.meta.hasSuggestions),
        type: r.meta.type,
      },
    ])
  );
  const resolved = {};
  for (const file of ["x.tsx", "x.jsx", "x.ts", "x.js", "x.test.tsx"]) {
    const cfg = await lib.eslintResolved({
      cwd: lib.OUT_DIR,
      file: join(lib.OUT_DIR, file),
    });
    resolved[file] = Object.fromEntries(
      Object.entries(cfg.rules ?? {}).filter(
        ([r]) =>
          r.startsWith("react-hooks/") ||
          lib.REACT_DOCTOR_EFFECT_RULES.includes(r)
      )
    );
  }
  // The compiler options eslint-plugin-react-hooks passes the React Compiler (read from its
  // build; the feature flags are module constants there).
  const build = readFileSync(
    join(lib.reactHooksDir, "cjs/eslint-plugin-react-hooks.development.js"),
    "utf8"
  );
  const compilerOptions =
    /const COMPILER_OPTIONS = \{[\s\S]*?\n\};/.exec(build)?.[0] ?? null;
  const flags = Object.fromEntries(
    [...build.matchAll(/^var (eprh_\w+) = ([^;]+);/gm)].map((m) => [m[1], m[2]])
  );
  const exhaustiveHooks =
    /function getReactiveHookCallbackIndex[\s\S]*?default:/.exec(build)?.[0] ??
    null;

  // Biome
  const biomeExplain = {};
  for (const rule of ["useExhaustiveDependencies", "useHookAtTopLevel"]) {
    const text = lib.execFileSync(
      process.execPath,
      [require("./tools.cjs").biomeBin, "explain", rule],
      { encoding: "utf8", maxBuffer: 1 << 26 }
    );
    biomeExplain[rule] = {
      defaultHooks:
        /By default, the following hooks[\s\S]*?(?=\n\n## |\nStable results)/
          .exec(text)?.[0]
          ?.trim() ?? null,
      fix: /- Fix: (\S+)/.exec(text)?.[1] ?? null,
      head: text.split("\nDescription")[0].trim(),
      options: /## Options[\s\S]*/.exec(text)?.[0]?.slice(0, 4000) ?? null,
      stable:
        /Stable results[\s\S]*?(?=\n\nIf you want|\nExamples)/
          .exec(text)?.[0]
          ?.trim() ?? null,
    };
  }
  const biomeReact = JSON.parse(
    readFileSync(join(lib.CLI, "config/biome/react/biome.jsonc"), "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/,(\s*[}\]])/g, "$1")
  );

  // Ultracite's own text
  const prompt = readFileSync(join(lib.CLI, "src/agent-fix/prompt.ts"), "utf8");
  const promptLines = prompt
    .split("\n")
    .filter((l) =>
      /runtime behavior|suppression comments|Left for review|minimal change|help text/.test(
        l
      )
    )
    .map((l) => l.trim());
  const rules = readFileSync(join(lib.CLI, "src/data/rules.ts"), "utf8");
  const rulesLines = rules
    .split("\n")
    .filter((l) => /hook|effect|depend/i.test(l))
    .map((l) => l.trim());

  const result = {
    biome: {
      explain: biomeExplain,
      reactPreset: biomeReact.linter.rules,
    },
    eslint: {
      compilerFlags: flags,
      compilerOptions,
      exhaustiveDepsHooks: exhaustiveHooks,
      reactHooksRules: hooksMeta,
      resolved,
      scope:
        "The react block (react, react-hooks, jsx-a11y, react-doctor) has files: ['**/*.jsx', '**/*.tsx'] (packages/cli/config/eslint/react/eslint.config.mjs), so .ts and .js files get none of these rules.",
    },
    generated: new Date().toISOString().slice(0, 10),
    oxlint: {
      printConfig: printedRules,
      reactCatalogueNotInPreset: oxUnlisted,
      rules: oxRules,
    },
    reactDoctor: doctor,
    reactDoctorDifferences: {
      eslintOnly: Object.entries(doctor)
        .filter(([, v]) => v.eslintReact && !v.oxlintJsPlugins)
        .map(([k]) => k),
      neither: Object.entries(doctor)
        .filter(([, v]) => !v.eslintReact && !v.oxlintJsPlugins)
        .map(([k]) => k),
      oxlintOnly: Object.entries(doctor)
        .filter(([, v]) => !v.eslintReact && v.oxlintJsPlugins)
        .map(([k]) => k),
    },
    tools: lib.toolVersions(),
    ultracite: {
      agentsTemplate: rulesLines,
      prompt: promptLines,
    },
  };
  lib.writeJson(join(lib.RESULTS_DIR, "inventory.json"), result);
  console.log(
    JSON.stringify(
      {
        eslintTsx: Object.keys(resolved["x.tsx"]).length,
        eslintTs: Object.keys(resolved["x.ts"]).length,
        oxUnlisted,
        reactDoctorDifferences: result.reactDoctorDifferences,
      },
      null,
      1
    )
  );
};
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
