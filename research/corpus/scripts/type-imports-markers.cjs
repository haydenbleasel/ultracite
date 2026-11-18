// Policy: what each measured project configures for the type-import rules and the TypeScript
// settings that decide what an import compiles to, and the disable comments that name these rules.
//
//   configs     every lint config and tsconfig in each repo at its pinned commit: ESLint (flat and
//               legacy, and `eslintConfig` in package.json), Biome, Oxlint, Vite+ (`lint:` in
//               vite.config.*) and every tsconfig*.json, read with `git ls-tree` and `git show` on
//               the history clone (or the shallow clone for the React set and Ultracite, with
//               GIT_NO_LAZY_FETCH=1 so a missing blob is never fetched), skipping test, fixture,
//               example, template, bench, eval and docs paths. Each config says whether it applies
//               to the measured directories (its directory is one of their ancestors). Every line
//               naming one of RULES (lint rules and tsconfig flags), with its options up to the line
//               that closes them, a permalink, and the commit that added it (`git log -S`,
//               read-only) with its message verbatim; every `extends`/shared-config line and
//               Oxlint `categories` line, since shared configs and categories turn rules on
//               implicitly
//   shared      what the shared configs installed in this repo set for these rules (read from
//               packages/cli's node_modules, nothing from a clone): typescript-eslint's configs,
//               eslint-plugin-import-x's configs, Oxlint's categories (`oxlint --rules`) and Biome's
//               recommended set (`biome explain`)
//   directives  every disable comment in the measured files (source and tests) naming one of these
//               rules: its kind, the rules, its reason, the lines it covers, and whether a raw
//               report of the rule it names (the census's ESLint pass, inline config ignored) sits
//               there, and whether it goes away with inline config honoured
//   build       each repo's build tool, with the line of the file it was read from
//
// Usage: node research/corpus/scripts/type-imports-markers.cjs [--repos a,b]
// Writes results/type-imports/markers.json.
"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const RULES = [
  "consistent-type-imports",
  "consistent-type-exports",
  "no-import-type-side-effects",
  "consistent-type-specifier-style",
  "no-duplicates",
  "no-duplicate-imports",
  "no-unassigned-import",
  "no-unused-imports",
  "prefer-type-imports",
  "useImportType",
  "useExportType",
  "noUnusedImports",
  "organizeImports",
  "isolatedModules",
  "verbatimModuleSyntax",
  "importsNotUsedAsValues",
  "preserveValueImports",
  "emitDecoratorMetadata",
  "experimentalDecorators",
  "onlyRemoveTypeImports",
  "isolatedDeclarations",
];
const RULE_RE = new RegExp(
  `(?:^|[^\\w/-])((?:@typescript-eslint/|typescript/|import-x/|import/|unused-imports/|eslint/)?(?:${RULES.map(
    (r) => r.replaceAll("-", "\\-")
  ).join("|")}))(?![\\w-])`,
  "g"
);
const CONFIG_RE =
  /(?:^|\/)(?:\.eslintrc(?:\.(?:js|cjs|mjs|json|ya?ml))?|[^/]*eslintrc[^/]*\.json|eslint\.config\.(?:js|cjs|mjs|ts|mts|cts)|biome\.jsonc?|\.oxlintrc\.jsonc?|oxlint\.config\.(?:ts|mts|js|mjs|json)|\.oxfmtrc\.jsonc?|oxfmt\.config\.(?:ts|mts|js|mjs)|vite\.config\.(?:ts|mts|js|mjs)|\.prettierrc(?:\.(?:js|cjs|mjs|json|ya?ml|toml))?|prettier\.config\.(?:js|cjs|mjs|ts)|dprint\.jsonc?|\.dprint\.jsonc?|package\.json|tsconfig[^/]*\.json)$|(?:^|\/)eslint-config-[^/]+\/[^/]+\.(?:js|cjs|mjs)$/;
const SKIP_RE =
  /(?:^|\/)(?:node_modules|test|tests|__tests__|__testfixtures__|fixtures?|examples?|e2e|playground|bench(?:mark)?s?|\.vscode-test|templates?|evals?|docs?|perf-measures|runtime-tests)(?:\/|$)/;
// Shared configs: `extends`, a config name in an extends array, a flat config's `x.configs.y` or
// a required/imported eslint-config package, and Biome's `recommended`. Oxlint's `categories` is
// kept with its block (BLOCK_RE).
const EXTENDS_RE =
  /\bextends\b|^\s*["'](?:plugin:|next\/|next["']|airbnb|standard|xo|prettier["']|eslint:|@[\w-]+\/eslint-config|eslint-config-)|\.configs\b|configs\[|"recommended"\s*:|\brecommended\s*:|require\(["'](?:@[\w-]+\/)?eslint-config|from ["'](?:@[\w-]+\/)?eslint-config/;
const BLOCK_RE = /\bcategories\b\s*["']?\s*:/;
const DIRECTIVE =
  /(eslint-disable(?:-next-line|-line)?|eslint-enable|oxlint-disable(?:-next-line|-line)?|oxlint-enable|biome-ignore(?:-all|-start|-end)?)\b([^\n]*)/;

const gitIn = (dir, argv) =>
  lib.spawnSync("git", ["-C", dir, "-c", "core.quotePath=false", ...argv], {
    encoding: "utf8",
    env: { ...process.env, GIT_NO_LAZY_FETCH: "1" },
    maxBuffer: 1 << 28,
  });

const toolOf = (p, text) => {
  if (/tsconfig[^/]*\.json$/.test(p)) {
    return "tsconfig";
  }
  if (/biome\.jsonc?$/.test(p)) {
    return "biome";
  }
  if (/oxlint/.test(p)) {
    return "oxlint";
  }
  if (/oxfmt/.test(p)) {
    return "oxfmt";
  }
  if (/vite\.config/.test(p)) {
    return "vite-plus";
  }
  if (/prettier/.test(p)) {
    return "prettier";
  }
  if (/dprint/.test(p)) {
    return "dprint";
  }
  if (/package\.json$/.test(p)) {
    return /^\s{2}"eslintConfig"/m.test(text)
      ? "eslint (package.json)"
      : "prettier (package.json)";
  }
  return "eslint";
};

// Every line naming a rule (with the options after it), every shared-config line, and comment
// lines naming a rule.
const configLines = (text) => {
  const lines = text.split("\n");
  const out = [];
  lines.forEach((t, i) => {
    RULE_RE.lastIndex = 0;
    const isComment = /^\s*(?:\/\/|\*|#|\/\*)/.test(t);
    if (RULE_RE.test(t)) {
      if (isComment) {
        out.push({
          kind: "comment",
          line: i + 1,
          text: t.trim().slice(0, 300),
        });
        return;
      }
      let j = i;
      let depth = 0;
      const block = [];
      do {
        block.push(lines[j]);
        depth +=
          (lines[j].match(/[[{(]/g) ?? []).length -
          (lines[j].match(/[\]})]/g) ?? []).length;
        j++;
      } while (depth > 0 && j < lines.length && j - i < 15);
      RULE_RE.lastIndex = 0;
      out.push({
        kind: "rule",
        line: i + 1,
        rules: [...block.join(" ").matchAll(RULE_RE)].map((m) => m[1]),
        text: block
          .map((x) => x.trim())
          .join(" ")
          .slice(0, 400),
      });
    } else if (BLOCK_RE.test(t) && !isComment) {
      let j = i;
      let depth = 0;
      const block = [];
      do {
        block.push(lines[j]);
        depth +=
          (lines[j].match(/[[{(]/g) ?? []).length -
          (lines[j].match(/[\]})]/g) ?? []).length;
        j++;
      } while (depth > 0 && j < lines.length && j - i < 15);
      out.push({
        kind: "shared",
        line: i + 1,
        text: block
          .map((x) => x.trim())
          .join(" ")
          .slice(0, 300),
      });
    } else if (EXTENDS_RE.test(t) && !isComment) {
      out.push({ kind: "shared", line: i + 1, text: t.trim().slice(0, 240) });
    }
  });
  return out;
};
// package.json: only the top-level eslintConfig and prettier keys.
const packageLines = (text, pkg) => {
  const lines = text.split("\n");
  const out = [];
  for (const key of ["eslintConfig", "prettier"]) {
    if (pkg[key] === undefined) {
      continue;
    }
    const at = lines.findIndex((l) =>
      new RegExp(`^\\s{2}"${key}"\\s*:`).test(l)
    );
    const body = JSON.stringify(pkg[key]);
    RULE_RE.lastIndex = 0;
    const rules = [...` ${body}`.matchAll(RULE_RE)].map((m) => m[1]);
    out.push({
      kind: rules.length > 0 ? "rule" : "shared",
      line: at + 1,
      ...(rules.length > 0 ? { rules } : {}),
      text: `"${key}": ${body}`.slice(0, 400),
    });
  }
  return out;
};

// The included directories a config can apply to: its directory is the repo root or an ancestor
// of (or inside) a measured directory.
const appliesTo = (repo, path) => {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  return repo.include.filter(
    (inc) =>
      dir === "" ||
      inc === dir ||
      inc.startsWith(`${dir}/`) ||
      dir.startsWith(`${inc}/`)
  );
};

const configsOf = (name) => {
  const repo = lib.getRepo(name);
  const meta = lib.repoMeta(name);
  const history = join(lib.HISTORY_DIR, `${name}.git`);
  const hasHistory = existsSync(history);
  const dir = hasHistory ? history : repo.root;
  const sha = lib.shaOf(name);
  const all = gitIn(dir, ["ls-tree", "-r", "--name-only", sha]).stdout.split(
    "\n"
  );
  const paths = all
    .filter((p) => CONFIG_RE.test(p) && !SKIP_RE.test(p))
    // Ultracite: only the root configs it lints itself with (its presets are the subject)
    .filter((p) => name !== "ultracite" || !p.includes("/"));
  const out = [];
  const missing = [];
  const missingApplies = [];
  for (const p of paths.sort()) {
    const r = gitIn(dir, ["show", `${sha}:${p}`]);
    if (r.status !== 0) {
      // a sparse or blob-less clone without this blob (never fetched)
      missing.push(p);
      if (appliesTo(repo, p).length > 0 && !/package\.json$/.test(p)) {
        missingApplies.push(p);
      }
      continue;
    }
    const text = r.stdout;
    let lines;
    if (/package\.json$/.test(p)) {
      let pkg;
      try {
        pkg = JSON.parse(text);
      } catch {
        continue;
      }
      if (pkg.eslintConfig === undefined && pkg.prettier === undefined) {
        continue;
      }
      lines = packageLines(text, pkg);
    } else if (/vite\.config/.test(p) && !/^\s*(?:lint|fmt)\s*:/m.test(text)) {
      continue;
    } else {
      lines = configLines(text);
    }
    const applies = appliesTo(repo, p);
    out.push({
      applies,
      appliesToMeasured: applies.length > 0,
      file: p,
      lines: lines.map((l) => {
        let added = null;
        if (hasHistory && (l.kind === "rule" || l.kind === "shared")) {
          RULE_RE.lastIndex = 0;
          const needle =
            l.kind === "rule"
              ? (RULE_RE.exec(l.text)?.[1] ?? l.text)
              : l.text.replace(/[,{[]\s*$/, "").slice(0, 80);
          const first = gitIn(dir, [
            "log",
            sha,
            "--format=%H",
            "--reverse",
            "-S",
            needle,
            "--",
            p,
          ])
            .stdout.split("\n")
            .find(Boolean);
          if (first) {
            const show = gitIn(dir, [
              "log",
              "-1",
              "--format=%cs%n%an%n%B",
              first,
            ]).stdout.split("\n");
            added = {
              date: show[0],
              message: show.slice(2).join("\n").trim().slice(0, 1500),
              sha: first,
            };
          }
        }
        return {
          ...l,
          added,
          permalink: lib.dc.permalink(meta.github, sha, p, l.line),
        };
      }),
      tool: toolOf(p, text),
    });
  }
  return {
    configs: out,
    history: hasHistory,
    missing: missing.length,
    missingApplies,
    sha,
  };
};

// What shared configs set for these rules, from this repo's installed packages.
const sharedConfigs = () => {
  const pick = (rules) =>
    Object.fromEntries(
      Object.entries(rules ?? {}).filter(([k]) => {
        RULE_RE.lastIndex = 0;
        return RULE_RE.test(` ${k}`);
      })
    );
  const flat = (cfg) =>
    Array.isArray(cfg)
      ? Object.assign({}, ...cfg.map((c) => c.rules ?? {}))
      : (cfg?.rules ?? {});
  const out = {};
  const tsConfigs = lib.tsPlugin.configs ?? {};
  for (const [k, v] of Object.entries(tsConfigs)) {
    const rules = pick(flat(v));
    if (Object.keys(rules).length) {
      out[`@typescript-eslint/eslint-plugin configs.${k}`] = rules;
    }
  }
  for (const [k, v] of Object.entries(lib.importX.configs ?? {})) {
    const rules = pick(flat(v));
    if (Object.keys(rules).length) {
      out[`eslint-plugin-import-x configs.${k}`] = rules;
    }
  }
  const oxRules = JSON.parse(
    lib.spawnSync(
      process.execPath,
      [lib.oxlintBin, "--rules", "--format", "json"],
      { encoding: "utf8", maxBuffer: 1 << 28 }
    ).stdout
  );
  out["oxlint categories"] = Object.fromEntries(
    oxRules
      .filter((r) => {
        RULE_RE.lastIndex = 0;
        return RULE_RE.test(` ${r.value}`);
      })
      .map((r) => [
        `${r.scope}/${r.value}`,
        {
          category: r.category,
          default: r.default,
          fix: r.fix,
          typeAware: r.type_aware,
        },
      ])
  );
  out["biome recommended"] = {};
  for (const n of ["useImportType", "useExportType", "noUnusedImports"]) {
    const text = lib.spawnSync(process.execPath, [lib.biomeBin, "explain", n], {
      encoding: "utf8",
    }).stdout;
    out["biome recommended"][n] = {
      defaultSeverity: /Default severity: (\S+)/.exec(text)?.[1] ?? null,
      fix: /- Fix: (\S+)/.exec(text)?.[1] ?? null,
      recommended: /This rule is recommended/.test(text),
    };
  }
  out.versions = {
    "@typescript-eslint/eslint-plugin": lib.dc.versionOf(
      "@typescript-eslint/eslint-plugin",
      lib.CLI
    ),
    "eslint-plugin-import-x": lib.dc.versionOf(
      "eslint-plugin-import-x",
      lib.CLI
    ),
  };
  return out;
};

// Which census-pass ESLint rule names a directive's rule name maps to.
const censusRule = (r) => {
  const bare = r.replace(
    /^(?:@typescript-eslint|typescript|import-x|import)\//,
    ""
  );
  const map = {
    "consistent-type-imports": ["@typescript-eslint/consistent-type-imports"],
    "consistent-type-specifier-style": [
      "import-x/consistent-type-specifier-style",
    ],
    "no-duplicates": ["import-x/no-duplicates"],
    "no-import-type-side-effects": [
      "@typescript-eslint/no-import-type-side-effects",
    ],
  };
  return map[bare] ?? [];
};

const directivesOf = (name) => {
  const repo = lib.getRepo(name);
  const out = [];
  for (const { rel, test } of lib.filesOf(name)) {
    const text = readFileSync(join(repo.root, rel), "utf8");
    if (!/(?:eslint|oxlint)-(?:disable|enable)|biome-ignore/.test(text)) {
      continue;
    }
    const lines = text.split("\n");
    const found = [];
    lines.forEach((l, i) => {
      const m = DIRECTIVE.exec(l);
      if (!m || /-enable$/.test(m[1])) {
        return;
      }
      const ruleText = m[1].startsWith("biome")
        ? m[2].split(/:\s/)[0]
        : m[2].split(/\s--\s/)[0];
      RULE_RE.lastIndex = 0;
      const named = [...` ${ruleText}`.matchAll(RULE_RE)].map((x) => x[1]);
      if (named.length === 0) {
        return;
      }
      let from;
      let to;
      if (/-line$/.test(m[1])) {
        from = i + 1;
        to = i + 1;
      } else if (/next-line$/.test(m[1]) || m[1] === "biome-ignore") {
        from = i + 2;
        to = i + 2;
      } else {
        const enable = lines.findIndex(
          (x, k) => k > i && /(?:eslint|oxlint)-enable|biome-ignore-end/.test(x)
        );
        from = i + 1;
        to = enable === -1 ? lines.length : enable + 1;
      }
      found.push({
        covers: { from, to },
        coversText: (lines[from - 1] ?? "").trim().slice(0, 160),
        file: rel,
        kind: m[1],
        line: i + 1,
        permalink: lib.permalink(name, rel, i + 1),
        reason:
          (m[1].startsWith("biome")
            ? m[2].split(/:\s/).slice(1).join(": ")
            : m[2].split(/\s--\s/)[1]
          )
            ?.replace(/\*\/\s*\}?\s*$/, "")
            .trim() || null,
        rules: named,
        test,
      });
    });
    if (found.length === 0) {
      continue;
    }
    const raw = lib.inventory(text, rel);
    const honoured = lib.inventory(text, rel, { inline: true });
    for (const d of found) {
      const inRange = (line) => line >= d.covers.from && line <= d.covers.to;
      const ruleNames = d.rules.flatMap(censusRule);
      d.censusRules = ruleNames;
      d.rawReports = (raw.eslint ?? []).filter(
        (m) =>
          ruleNames.includes(m.rule) &&
          inRange(m.line) &&
          /^(?:consistent-type-imports|no-import-type-side-effects|consistent-type-specifier-style|no-duplicates)$/.test(
            m.variant
          )
      ).length;
      d.reportedReports = (honoured.eslint ?? []).filter(
        (m) =>
          ruleNames.includes(m.rule) &&
          inRange(m.line) &&
          /^(?:consistent-type-imports|no-import-type-side-effects|consistent-type-specifier-style|no-duplicates)$/.test(
            m.variant
          )
      ).length;
      out.push(d);
    }
  }
  return out;
};

// The build tool of each repo, checked against the file it was read from.
const buildOf = (name) => {
  const census = lib.readJson(join(lib.RESULTS_DIR, "census.json"), {});
  const b = census.build?.[name];
  if (!b) {
    return null;
  }
  const root = lib.getRepo(name).root;
  const f = join(root, b.file);
  const text = existsSync(f) ? readFileSync(f, "utf8") : "";
  const line = text.split("\n").findIndex((l) => l.includes(b.evidence));
  return {
    ...b,
    found: line !== -1,
    permalink: line === -1 ? null : lib.permalink(name, b.file, line + 1),
  };
};

const main = () => {
  const repos = lib.selectedRepos(lib.ALL);
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of type-imports-markers.cjs. configs: lint configs and tsconfigs at the pinned commit, with lines naming these rules or flags (kind rule), shared-config and category lines (kind shared) and comments naming a rule (kind comment); `applies` lists the measured directories a config sits above. shared: what installed shared configs set. directives: disable comments in the measured files naming one of these rules. build: each repo's build tool.",
    repos: {},
    rules: RULES,
    shared: sharedConfigs(),
    tools: lib.toolVersions(),
  };
  for (const name of repos) {
    const c = configsOf(name);
    const directives = directivesOf(name);
    const build = buildOf(name);
    result.repos[name] = {
      ...c,
      build,
      directives,
      directivesByRule: directives
        .flatMap((d) => d.rules)
        .reduce((o, r) => ({ ...o, [r]: (o[r] ?? 0) + 1 }), {}),
      set: lib.setOf(name),
    };
    const ruleLines = c.configs.flatMap((x) =>
      x.lines
        .filter((l) => l.kind === "rule")
        .map((l) => ({ ...l, applies: x.appliesToMeasured, file: x.file }))
    );
    console.log(
      `${name}: ${c.configs.length} configs, ${ruleLines.length} rule lines, ${directives.length} directives${c.missing ? `, ${c.missing} blobs missing (${c.missingApplies.length} above measured code)` : ""}; build ${build?.tool} (${build?.found ? "found" : "NOT FOUND"})`
    );
    for (const l of ruleLines) {
      console.log(
        `   ${l.applies ? "" : "(elsewhere) "}${l.file}:${l.line} ${l.text.slice(0, 140)} (${l.added?.date ?? "?"} ${l.added?.sha?.slice(0, 10) ?? ""})`
      );
    }
    for (const d of directives) {
      console.log(
        `   directive ${d.file}:${d.line} ${d.kind} ${d.rules.join(",")} reason=${JSON.stringify(d.reason)} raw=${d.rawReports} reported=${d.reportedReports}`
      );
    }
  }
  lib.writeJson(
    join(lib.RESULTS_DIR, "markers.json"),
    JSON.parse(lib.scrub(JSON.stringify(result)))
  );
};

main();
