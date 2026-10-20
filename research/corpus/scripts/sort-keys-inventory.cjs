// Which key-sorting rules Ultracite turns on, per linter and preset, read from the presets
// themselves (packages/cli/config), with each rule's effective options, defaults, message and fix.
//
//   Oxlint  every preset in config/oxlint (top level and overrides): sort-keys and every other
//           rule about order (names with sort / order / grouping), `oxlint --rules` for sort-keys's
//           category and fix kind, its defaults from configuration_schema.json, and the options a
//           .ts file gets from the root config `ultracite init` writes (`oxlint --print-config`)
//   ESLint  core, core + react, core + tanstack and core + type-aware, resolved with ESLint's own
//           calculateConfigForFile for a .ts, .tsx, .js and .test.ts path; sort-keys's meta
//   Biome   the core and tanstack presets' assist actions and overrides, and `biome explain` for
//           every sorting action core turns on
//   This repo  the root oxlint.config.ts override that turns sort-keys off for the preset files,
//           and the agent-fix prompt's rules about behaviour and leaving issues for review
//
// Usage: node research/corpus/scripts/sort-keys-inventory.cjs
// Writes results/sort-keys/inventory.json.
"use strict";

const { execFileSync, spawnSync } = require("node:child_process");
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./sort-keys-lib.cjs");

const { dc } = lib;
const ORDER_RULE = /sort|order|grouping|alphabeti/i;

const main = async () => {
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    tools: lib.toolVersions(),
  };

  // ── Oxlint ──
  const presetsDir = join(lib.CLI, "config/oxlint");
  const oxlint = { presets: {} };
  for (const name of readdirSync(presetsDir).sort()) {
    let mod;
    try {
      mod = (
        await import(pathToFileURL(join(presetsDir, name, "index.mjs")).href)
      ).default;
    } catch {
      continue;
    }
    const pick = (rules = {}) =>
      Object.fromEntries(
        Object.entries(rules).filter(([k]) => ORDER_RULE.test(k))
      );
    const top = pick(mod.rules);
    const overrides = (mod.overrides ?? [])
      .map((o) => ({ files: o.files, rules: pick(o.rules) }))
      .filter((o) => Object.keys(o.rules).length > 0);
    if (Object.keys(top).length || overrides.length) {
      oxlint.presets[name] = { overrides, rules: top };
    }
  }
  const rules = JSON.parse(
    execFileSync(
      process.execPath,
      [dc.oxlintBin, "--rules", "--format", "json"],
      { encoding: "utf8", maxBuffer: 1 << 26 }
    )
  );
  oxlint.rule = rules.find(
    (r) => r.scope === "eslint" && r.value === "sort-keys"
  );
  const schema = require(
    join(
      require("node:path").dirname(dc.oxlintBin),
      "..",
      "configuration_schema.json"
    )
  );
  oxlint.schemaDefaults = Object.fromEntries(
    Object.entries(schema.definitions.SortKeysOptions.properties).map(
      ([k, v]) => [k, v.default]
    )
  );
  const initDir = join(lib.TMP, "configs", "inventory");
  const initConfig = lib.oxlintInitConfig(initDir);
  const printed = spawnSync(
    process.execPath,
    [dc.oxlintBin, "-c", initConfig, "--print-config"],
    { cwd: initDir, encoding: "utf8", maxBuffer: 1 << 26 }
  );
  const printedJson = JSON.parse(
    printed.stdout.slice(printed.stdout.indexOf("{"))
  );
  oxlint.initConfigEffective = {
    "sort-keys": printedJson.rules?.["sort-keys"] ?? null,
  };
  oxlint.message = "Object keys should be sorted";
  oxlint.helpWhenFixable =
    "Replace `<the keys as written>` with `<the keys sorted>`.";
  out.oxlint = oxlint;

  // ── ESLint ──
  const eslint = { resolved: {} };
  const probes = ["probe.ts", "probe.tsx", "probe.js", "probe.test.ts"];
  for (const presets of [
    ["core"],
    ["core", "react"],
    ["core", "tanstack"],
    ["core", "type-aware"],
  ]) {
    const key = presets.join(" + ");
    eslint.resolved[key] = {};
    for (const file of probes) {
      let cfg;
      try {
        cfg = await lib.eslintResolved({
          cwd: lib.CALIBRATION_DIR,
          file: join(lib.CALIBRATION_DIR, file),
          presets,
        });
      } catch (error) {
        eslint.resolved[key][file] = {
          error: String(error.message).split("\n")[0],
        };
        continue;
      }
      const r = cfg?.rules ?? {};
      eslint.resolved[key][file] = {
        "sonarjs/shorthand-property-grouping":
          r["sonarjs/shorthand-property-grouping"] ?? null,
        "sort-keys": r["sort-keys"] ?? null,
        others: Object.fromEntries(
          Object.entries(r)
            .filter(
              ([k, v]) =>
                ORDER_RULE.test(k) &&
                k !== "sort-keys" &&
                ![0, "off"].includes(Array.isArray(v) ? v[0] : v)
            )
            .map(([k, v]) => [k, v])
        ),
      };
    }
  }
  const { builtinRules } = require(
    require.resolve("eslint/use-at-your-own-risk", { paths: [lib.CLI] })
  );
  const meta = builtinRules.get("sort-keys").meta;
  eslint.meta = {
    defaultOptions: meta.defaultOptions,
    description: meta.docs.description,
    fixable: meta.fixable ?? null,
    frozen: meta.docs.frozen ?? false,
    hasSuggestions: meta.hasSuggestions ?? false,
    messages: meta.messages,
    recommended: meta.docs.recommended,
    url: meta.docs.url,
  };
  out.eslint = eslint;

  // ── Biome ──
  const readJsonc = (p) =>
    JSON.parse(
      readFileSync(p, "utf8")
        .replace(
          /("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
          (m, s) => s ?? ""
        )
        .replace(/,(\s*[}\]])/g, "$1")
    );
  const core = readJsonc(join(lib.CLI, "config/biome/core/biome.jsonc"));
  const tanstack = readJsonc(
    join(lib.CLI, "config/biome/tanstack/biome.jsonc")
  );
  const actions = core.assist?.actions?.source ?? {};
  const explain = (name) => {
    const r = spawnSync(process.execPath, [dc.biomeBin, "explain", name], {
      encoding: "utf8",
    });
    const text = r.stdout;
    return {
      category: /Diagnostic category: (\S+)/.exec(text)?.[1] ?? null,
      defaultSeverity: /Default severity: (\S+)/.exec(text)?.[1] ?? null,
      fix: /- Fix: (\S+)/.exec(text)?.[1] ?? null,
      summary:
        text.split("Description")[1]?.trim().split("\n")[0]?.trim() ?? null,
    };
  };
  // The comments the preset puts above each action, as the reader of biome.jsonc sees them.
  const coreText = readFileSync(
    join(lib.CLI, "config/biome/core/biome.jsonc"),
    "utf8"
  );
  const commentAbove = (name) => {
    const lines = coreText.split("\n");
    const i = lines.findIndex((l) => l.includes(`"${name}"`));
    const out = [];
    for (let j = i - 1; j >= 0 && /^\s*\/\//.test(lines[j]); j--) {
      out.unshift(lines[j].replace(/^\s*\/\/\s?/, ""));
    }
    return out.join(" ");
  };
  out.biome = {
    core: Object.fromEntries(
      Object.entries(actions).map(([k, v]) => [
        k,
        { explain: explain(k), presetComment: commentAbove(k), value: v },
      ])
    ),
    coreOverrides: (core.overrides ?? [])
      .filter(
        (o) =>
          o.assist?.actions?.source &&
          "useSortedKeys" in o.assist.actions.source
      )
      .map((o) => ({
        includes: o.includes,
        useSortedKeys: o.assist.actions.source.useSortedKeys,
      })),
    tanstack: tanstack.assist?.actions?.source ?? {},
    useSortedKeysExplain: (() => {
      const r = spawnSync(
        process.execPath,
        [dc.biomeBin, "explain", "useSortedKeys"],
        { encoding: "utf8" }
      );
      return r.stdout.split("Examples")[0].trim();
    })(),
  };

  // ── this repo ──
  const rootConfig = readFileSync(
    join(lib.ULTRACITE, "oxlint.config.ts"),
    "utf8"
  );
  const overrideBlock =
    /overrides:\s*\[[\s\S]*?\],\n\s*rules:/.exec(rootConfig)?.[0] ?? null;
  out.thisRepo = {
    rootOxlintOverride: overrideBlock,
    researchIgnored: /"research"/.test(rootConfig),
  };
  const prompt = readFileSync(join(lib.CLI, "src/agent-fix/prompt.ts"), "utf8");
  out.agentPrompt = {
    behaviourLine: /"- Make the minimal change[^"]*"/.exec(prompt)?.[0] ?? null,
    leftForReviewLine:
      /`- This run is non-interactive[\s\S]*?`,\n/.exec(prompt)?.[0]?.trim() ??
      null,
    restyleLine:
      /"- Fix the underlying problem[^"]*"/.exec(prompt)?.[0] ?? null,
  };
  lib.writeJson(join(lib.RESULTS_DIR, "inventory.json"), out);
  console.log(
    JSON.stringify(
      {
        biomeOverrides: out.biome.coreOverrides,
        eslint: Object.fromEntries(
          Object.entries(eslint.resolved).map(([k, v]) => [
            k,
            v["probe.ts"]?.["sort-keys"] ?? v["probe.ts"],
          ])
        ),
        oxlint: oxlint.presets,
        oxlintEffective: oxlint.initConfigEffective,
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
