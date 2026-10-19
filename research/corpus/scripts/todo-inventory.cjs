// Which TODO-comment rules Ultracite turns on, per linter and preset, read from the presets
// themselves (packages/cli/config), with each rule's effective options, defaults and fix kind.
//
//   Oxlint  every preset in config/oxlint (top level and overrides), plus `oxlint --rules` for
//           category, fix kind and whether the rule exists at all (unicorn's
//           expiring-todo-comments has no Oxlint port), and the defaults from Oxlint's
//           configuration_schema.json
//   ESLint  core, core + react, core + type-aware, resolved with ESLint's own
//           calculateConfigForFile for a .ts, .tsx, .js and .test.ts path, so the options are what
//           a file actually gets; plus each rule's meta (fixable, suggestions, messages, defaults)
//   Biome   every rule in Biome's configuration schema and the first paragraph of `biome explain`
//           for each, searched for task-marker words; and Biome's own rules-sources page (which
//           ESLint and plugin rules each Biome rule comes from), fetched once with `gh api`
//           (--fetch) and cached in out/todo-comments/
//
// Usage (from the repo root):
//   node research/corpus/scripts/todo-inventory.cjs [--fetch]
// Writes results/todo-comments/inventory.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./todo-lib.cjs");

const { dc } = lib;
const CLI_REQUIRE = (name) =>
  require(require.resolve(name, { paths: [lib.CLI] }));

// The rules this topic is about, and other rules that read comments (for context).
const RULES = [
  "no-warning-comments",
  "sonarjs/todo-tag",
  "sonarjs/fixme-tag",
  "unicorn/expiring-todo-comments",
];
const COMMENT_RULES = [
  "no-inline-comments",
  "capitalized-comments",
  "line-comment-position",
  "multiline-comment-style",
  "spaced-comment",
  "sonarjs/no-commented-code",
  "unicorn/no-abusive-eslint-disable",
  "typescript/ban-ts-comment",
  "@typescript-eslint/ban-ts-comment",
  "react/jsx-no-comment-textnodes",
  "react/todo",
  "jest/prefer-todo",
  "vitest/prefer-todo",
  "vitest/warn-todo",
  "jest/no-commented-out-tests",
  "vitest/no-commented-out-tests",
  "jsdoc/check-tag-names",
  "jsdoc/no-bad-blocks",
  "github/no-blur",
];
const ALL_RULES = [...RULES, ...COMMENT_RULES];

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
const oxlintSchemaDefaults = () => {
  const schema = JSON.parse(
    readFileSync(
      join(
        require.resolve("oxlint/package.json", { paths: [lib.ULTRACITE] }),
        "..",
        "configuration_schema.json"
      ),
      "utf8"
    )
  );
  const def = schema.definitions?.NoWarningCommentsConfig ?? null;
  return def
    ? Object.fromEntries(
        Object.entries(def.properties).map(([k, v]) => [
          k,
          { default: v.default, description: v.description },
        ])
      )
    : null;
};

const oxlintPresets = async () => {
  const dir = join(lib.CLI, "config/oxlint");
  const out = {};
  const walk = (rel) => {
    for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(join(rel, e.name));
      } else if (e.name === "index.mjs") {
        out[rel] = join(dir, rel, e.name);
      }
    }
  };
  walk("");
  const presets = {};
  for (const [name, file] of Object.entries(out).sort()) {
    const mod = (await import(pathToFileURL(file).href)).default;
    const rules = {};
    for (const rule of ALL_RULES) {
      const top = mod.rules?.[rule];
      const overrides = (mod.overrides ?? [])
        .filter((o) => o.rules && rule in o.rules)
        .map((o) => ({
          files: o.files,
          options: optionsOf(o.rules[rule]),
          severity: severity(o.rules[rule]),
        }));
      if (top !== undefined || overrides.length > 0) {
        rules[rule] = {
          on: isOn(top),
          options: optionsOf(top),
          overrides,
          severity: severity(top) ?? null,
        };
      }
    }
    presets[name] = {
      jsPlugins: (mod.jsPlugins ?? []).map((p) =>
        typeof p === "string" ? p : (p.name ?? p.specifier)
      ),
      rules,
    };
  }
  return presets;
};

// ── ESLint ─────────────────────────────────────────────────────────────
const eslintResolved = async () => {
  const cwd = lib.CALIBRATION_DIR;
  const combos = [
    { file: "x.ts", presets: ["core"] },
    { file: "x.tsx", presets: ["core"] },
    { file: "x.js", presets: ["core"] },
    { file: "x.test.ts", presets: ["core"] },
    { file: "x.tsx", presets: ["core", "react"] },
    { file: "x.ts", presets: ["core", "type-aware"] },
  ];
  const out = [];
  for (const { file, presets } of combos) {
    const config = await lib.eslintResolved({
      cwd,
      file: join(cwd, file),
      presets,
    });
    out.push({
      file,
      presets,
      rules: Object.fromEntries(
        ALL_RULES.filter((r) => r in (config.rules ?? {})).map((r) => {
          const v = config.rules[r];
          return [r, { options: optionsOf(v), severity: severity(v) }];
        })
      ),
    });
  }
  return out;
};

const eslintMeta = () => {
  const { builtinRules } = CLI_REQUIRE("eslint/use-at-your-own-risk");
  const sonarjs = require(
    require.resolve("eslint-plugin-sonarjs", { paths: [lib.CLI] })
  );
  const metaOf = (rule) => {
    if (rule.startsWith("sonarjs/")) {
      return sonarjs.rules[rule.slice(8)]?.meta;
    }
    return builtinRules.get(rule)?.meta;
  };
  const out = {};
  for (const rule of [
    "no-warning-comments",
    "sonarjs/todo-tag",
    "sonarjs/fixme-tag",
    "no-inline-comments",
  ]) {
    const m = metaOf(rule);
    out[rule] = m
      ? {
          defaultOptions: m.defaultOptions ?? null,
          description: m.docs?.description ?? null,
          fixable: m.fixable ?? null,
          hasSuggestions: m.hasSuggestions ?? false,
          messages: m.messages ?? null,
          url: m.docs?.url ?? null,
        }
      : null;
  }
  return out;
};

// eslint-plugin-unicorn is an ES module.
const unicornMeta = async () => {
  const dir = join(
    require.resolve("eslint-plugin-unicorn", { paths: [lib.CLI] }),
    ".."
  );
  const mod = (
    await import(
      pathToFileURL(join(dir, "rules", "expiring-todo-comments.js")).href
    )
  ).default;
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  return {
    defaultOptions: mod.meta.defaultOptions,
    description: mod.meta.docs.description,
    fixable: mod.meta.fixable ?? null,
    hasSuggestions: mod.meta.hasSuggestions ?? false,
    messages: mod.meta.messages,
    version: pkg.version,
  };
};

// ── Biome ──────────────────────────────────────────────────────────────
const biomeRules = () => {
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
  const groups = Object.keys(defs.Rules.properties).filter(
    (g) => !["preset", "recommended"].includes(g)
  );
  const out = [];
  for (const group of groups) {
    const key =
      group === "a11y" ? "A11y" : group[0].toUpperCase() + group.slice(1);
    for (const rule of Object.keys(defs[key]?.properties ?? {})) {
      if (rule !== "recommended" && rule !== "all") {
        out.push(`${group}/${rule}`);
      }
    }
  }
  return out;
};
const MARKER_WORDS =
  /\b(?:todo|fixme|xxx|hack|warning comments?|task comments?|tags? in comments)\b/i;
const biomeExplainScan = (rules) => {
  const hits = [];
  for (const rule of rules) {
    const name = rule.split("/")[1];
    let text = "";
    try {
      text = execFileSync(process.execPath, [dc.biomeBin, "explain", name], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      text = String(error.stdout ?? "");
    }
    const description =
      /Description\s*\n([\s\S]*?)(?:\n\s*\n|$)/.exec(text)?.[1]?.trim() ?? "";
    if (MARKER_WORDS.test(text)) {
      hits.push({ description, matched: MARKER_WORDS.exec(text)[0], rule });
    }
  }
  return hits;
};
const biomeRulesSources = () => {
  const cache = join(lib.OUT_DIR, "biome-rules-sources.json");
  if (lib.flag("fetch") || !existsSync(cache)) {
    const path = "src/content/docs/en/linter/rules-sources.mdx";
    const commit = JSON.parse(
      execFileSync(
        "gh",
        ["api", `repos/biomejs/website/commits?path=${path}&per_page=1`],
        { encoding: "utf8" }
      )
    )[0];
    const content = Buffer.from(
      JSON.parse(
        execFileSync(
          "gh",
          ["api", `repos/biomejs/website/contents/${path}?ref=${commit.sha}`],
          { encoding: "utf8" }
        )
      ).content,
      "base64"
    ).toString("utf8");
    lib.writeJson(cache, {
      commit: commit.sha,
      content,
      date: commit.commit.committer.date,
      path,
    });
  }
  const { commit, content, date, path } = lib.readJson(cache);
  const lines = content.split("\n");
  const find = (re) => lines.filter((l) => re.test(l)).map((l) => l.trim());
  return {
    commit,
    date,
    path,
    url: `https://github.com/biomejs/website/blob/${commit}/${path}`,
    mentions: {
      "expiring-todo-comments": find(/expiring-todo-comments/),
      "no-inline-comments": find(/no-inline-comments/),
      "no-warning-comments": find(/no-warning-comments/),
      "sonarjs fixme-tag / S1134": find(/fixme-tag|S1134/),
      "sonarjs todo-tag / S1135": find(/todo-tag|S1135/),
      TODO: find(/\btodo\b/i),
    },
  };
};

const biomeCore = () => {
  const { parse } = CLI_REQUIRE("jsonc-parser");
  const core = parse(
    readFileSync(join(lib.CLI, "config/biome/core/biome.jsonc"), "utf8")
  );
  const set = [];
  for (const [group, rules] of Object.entries(core.linter?.rules ?? {})) {
    if (typeof rules !== "object") {
      continue;
    }
    for (const [rule, value] of Object.entries(rules)) {
      if (/comment/i.test(rule)) {
        set.push({ rule: `${group}/${rule}`, value });
      }
    }
  }
  return set;
};

// ── main ───────────────────────────────────────────────────────────────
const main = async () => {
  const catalogue = oxlintCatalogue();
  const presets = await oxlintPresets();
  const allBiome = biomeRules();
  const result = {
    biome: {
      commentRulesInCore: biomeCore(),
      explainHits: biomeExplainScan(allBiome),
      note: "Biome has no rule for task-marker comments. None of its rules' names or `biome explain` texts mentions TODO, FIXME, XXX or HACK (the only hit is listed in explainHits), and its rules-sources page maps no Biome rule to no-warning-comments, sonarjs todo-tag/fixme-tag or unicorn expiring-todo-comments.",
      rulesInSchema: allBiome.length,
      rulesSources: biomeRulesSources(),
      version: dc.versionOf("@biomejs/biome", lib.CLI),
    },
    eslint: {
      meta: eslintMeta(),
      resolved: await eslintResolved(),
      unicorn: await unicornMeta(),
    },
    generated: new Date().toISOString().slice(0, 10),
    oxlint: {
      catalogue: Object.fromEntries(
        [...ALL_RULES, "unicorn/expiring-todo-comments"].map((r) => {
          const c = catalogue.get(
            r.replace(/^@typescript-eslint\//, "typescript/")
          );
          return [
            r,
            c
              ? {
                  category: c.category,
                  default: c.default,
                  fix: c.fix,
                  typeAware: c.type_aware,
                  url: c.docs_url,
                }
              : null,
          ];
        })
      ),
      noWarningCommentsSchema: oxlintSchemaDefaults(),
      presets: Object.fromEntries(
        Object.entries(presets).filter(
          ([, p]) => Object.keys(p.rules).length > 0
        )
      ),
      version: require(
        require.resolve("oxlint/package.json", { paths: [lib.ULTRACITE] })
      ).version,
    },
    tools: lib.toolVersions(),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "inventory.json"), result);
  console.log(`wrote ${join(lib.RESULTS_DIR, "inventory.json")}`);
  for (const [name, p] of Object.entries(result.oxlint.presets)) {
    console.log(
      `oxlint ${name}: ${Object.entries(p.rules)
        .map(
          ([r, v]) =>
            `${r}=${v.severity}${v.overrides.length ? `(+${v.overrides.length} overrides)` : ""}`
        )
        .join(", ")}`
    );
  }
  for (const r of result.eslint.resolved) {
    console.log(
      `eslint ${r.presets.join("+")} ${r.file}: ${Object.entries(r.rules)
        .map(
          ([k, v]) =>
            `${k}=${v.severity}${v.options.length ? JSON.stringify(v.options) : ""}`
        )
        .join(", ")}`
    );
  }
  console.log(
    "biome explain hits:",
    result.biome.explainHits.map((h) => h.rule)
  );
  console.log(
    "biome rules-sources:",
    JSON.stringify(result.biome.rulesSources.mentions)
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
