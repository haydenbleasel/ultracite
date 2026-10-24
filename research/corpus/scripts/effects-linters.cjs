// What each linter reports on the corpus's hooks, as Ultracite configures it, raw and reported.
//
//   oxlint        the core + react presets (extends only, as rule-census.cjs runs them, so core's
//                 ignorePatterns can't skip packages/next/src/build), filtered to the hook and
//                 React Compiler rules (effects-lib.cjs OXLINT_HOOK_RULES)
//   eslint        Ultracite's core + react preset modules, filtered to eslint-plugin-react-hooks and
//                 react-doctor's effect rules. The react block is scoped to **/*.{jsx,tsx}, so .ts
//                 and .js files get none of these rules; `eslint-all-files` is the counterfactual
//                 with the same block applied to every hook-bearing .ts/.js file
//   biome         useExhaustiveDependencies and useHookAtTopLevel alone (the react preset sets both
//                 to "error" with no options)
//   react-doctor  oxlint with the js-plugins preset's react-doctor effect rules alone (opt-in in
//                 Oxlint; the ESLint react preset runs react-doctor too, in the eslint view)
//
// raw: every eslint-/oxlint-disable and biome-ignore neutralised (Oxlint and Biome lint a mirror;
// ESLint sets noInlineConfig on the clone). reported: the files as they are.
// Every diagnostic is joined to the hook it is about (effects-lib.cjs matchHook) from the census
// rows (run effects-census.cjs first).
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/effects-linters.cjs [--repos a,b]
//          [--linters oxlint,eslint,biome,react-doctor,eslint-all-files] [--modes raw,reported]
// Writes out/react-effects/lint/<repo>.<linter>.<mode>.jsonl (every diagnostic, with its hook)
// and results/react-effects/corpus-lint.json.
"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./effects-lib.cjs");

const OUT = join(lib.OUT_DIR, "lint");
const CONFIGS = join(lib.OUT_DIR, "configs");
const repos = lib.selectedRepos(lib.ALL);
const LINTERS = (
  lib.arg("linters", "") || "oxlint,eslint,biome,react-doctor,eslint-all-files"
).split(",");
const MODES = (lib.arg("modes", "") || "raw,reported").split(",");
lib.checkPinned(repos);

// react-doctor's effect rules as the Oxlint js-plugins preset enables them.
const jsPluginsRules = async () => {
  const preset = (
    await import(
      require("node:url").pathToFileURL(
        join(lib.CLI, "config/oxlint/js-plugins/index.mjs")
      ).href
    )
  ).default;
  return Object.fromEntries(
    Object.entries(preset.rules).filter(
      ([r, v]) => lib.REACT_DOCTOR_EFFECT_RULES.includes(r) && v !== "off"
    )
  );
};

const censusRows = (name) =>
  lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`));

const join2 = (rows, hooksByFile, root) => {
  const startsCache = new Map();
  return rows.map((d) => {
    const file = d.file.replace(/^\.\//, "");
    const hooks = hooksByFile.get(file) ?? [];
    if (!startsCache.has(file)) {
      const abs = join(root, file);
      startsCache.set(
        file,
        existsSync(abs) ? lib.lineStarts(readFileSync(abs, "utf8")) : [0]
      );
    }
    const h = lib.matchHook(hooks, startsCache.get(file), d);
    return { ...d, file, hook: h ? h.id : null };
  });
};

const main = async () => {
  const doctorRules = await jsPluginsRules();
  const oxConfig = lib.writeOxlintInit(CONFIGS, ["core", "react"], {
    init: false,
  });
  const { pathToFileURL } = require("node:url");
  const doctorConfig = lib.writeOxlintOnly(
    CONFIGS,
    "react-doctor-effects",
    doctorRules,
    {
      jsPlugins: [
        {
          name: "react-doctor",
          specifier: pathToFileURL(lib.reactDoctorOxlintMain).href,
        },
      ],
      settings: { "react-doctor": { portedRuleMode: "curated" } },
    }
  );
  const biomeConfig = lib.biomeHookConfig(CONFIGS);
  const reactOnTs = await lib.eslintReactOnAllFiles();
  const summary = {
    configs: {
      biome: lib.BIOME_HOOK_RULES,
      eslint:
        "packages/cli/config/eslint/{core,react}, rules filtered to react-hooks/* and the react-doctor effect rules (effects-lib.cjs REACT_DOCTOR_EFFECT_RULES)",
      oxlint:
        "packages/cli/config/oxlint/{core,react} (extends only), diagnostics filtered to effects-lib.cjs OXLINT_HOOK_RULES",
      reactDoctor: doctorRules,
    },
    crashes: [],
    generated: new Date().toISOString().slice(0, 10),
    repos: {},
    tools: lib.toolVersions(),
  };
  for (const name of repos) {
    const { files } = lib.collect(name);
    const root = lib.getRepo(name).root;
    const hooks = censusRows(name);
    const hooksByFile = new Map();
    for (const h of hooks) {
      if (!hooksByFile.has(h.file)) {
        hooksByFile.set(h.file, []);
      }
      hooksByFile.get(h.file).push(h);
    }
    const hookFiles = [...hooksByFile.keys()];
    const mirror = join(lib.TMP, "mirror", name);
    if (
      MODES.includes("raw") &&
      LINTERS.some((l) => l !== "eslint" && l !== "eslint-all-files")
    ) {
      lib.writeCopy(name, files, mirror, lib.neutralise);
    }
    summary.repos[name] = {};
    for (const linter of LINTERS) {
      for (const mode of MODES) {
        const t0 = Date.now();
        const cwd =
          mode === "raw" && !linter.startsWith("eslint") ? mirror : root;
        let rows = [];
        if (linter === "oxlint") {
          rows = lib.runOxlint({
            configFile: oxConfig,
            cwd,
            files,
            keep: (r) => lib.OXLINT_HOOK_RULES.includes(r),
          });
        } else if (linter === "react-doctor") {
          rows = lib.runOxlint({
            configFile: doctorConfig,
            cwd,
            // react-doctor's rules read JSX files and hooks; lint every file with a hook or JSX
            files: files.filter(
              (f) => hooksByFile.has(f) || /\.(?:tsx|jsx)$/.test(f)
            ),
            keep: (r) => r.startsWith("react-doctor/"),
          });
        } else if (linter === "eslint") {
          rows = await lib.runEslint({
            crashes: summary.crashes,
            cwd,
            files,
            inline: mode === "reported",
          });
        } else if (linter === "eslint-all-files") {
          const ts = hookFiles.filter((f) => !/\.(?:tsx|jsx)$/.test(f));
          rows =
            ts.length > 0
              ? await lib.runEslint({
                  crashes: summary.crashes,
                  cwd,
                  extra: reactOnTs,
                  files: ts,
                  inline: mode === "reported",
                })
              : [];
        } else if (linter === "biome") {
          rows = lib.runBiome({ configDir: biomeConfig, cwd, files });
        }
        const joined = join2(rows, hooksByFile, cwd);
        lib.writeJsonl(join(OUT, `${name}.${linter}.${mode}.jsonl`), joined);
        summary.repos[name][`${linter}.${mode}`] = {
          diagnostics: joined.length,
          rules: lib.countBy(joined, (d) => d.rule),
          seconds: Math.round((Date.now() - t0) / 100) / 10,
          unmatched: joined.filter((d) => !d.hook).length,
        };
        console.log(
          `${name} ${linter} ${mode}: ${joined.length} diagnostics, ${joined.filter((d) => !d.hook).length} not on a hook (${((Date.now() - t0) / 1000).toFixed(1)} s)`
        );
      }
    }
  }
  lib.writeJson(join(lib.OUT_DIR, "lint-summary.json"), summary);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
