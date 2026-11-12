// Policy: what each measured project configures for the conditional-operator rules and the
// formatter options that print them, and the disable comments that name these rules.
//
//   configs     every lint and format config in each repo at its pinned commit: ESLint (flat and
//               legacy, and `eslintConfig` in package.json), Biome, Oxlint, Oxfmt, Vite+ (`lint:`
//               and `fmt:` in vite.config.*), Prettier (`.prettierrc*`, `prettier.config.*`, the
//               `prettier` key of package.json) and dprint, read with `git ls-tree` and `git show`
//               on the history clone (or the shallow clone for the React set and Ultracite, with
//               GIT_NO_LAZY_FETCH=1 so a missing blob is never fetched), skipping test, fixture,
//               example, template, bench, eval and docs paths. Each config says whether it applies
//               to the measured directories (its directory is one of their ancestors). Every line
//               naming one of RULES, with its options up to the line that closes them, a permalink,
//               and the commit that added it (`git log -S`, read-only) with its message verbatim;
//               every `extends`/shared-config line and Oxlint `categories` line, since shared
//               configs and categories turn these rules on implicitly
//   shared      what the shared configs installed in this repo set for these rules (read from
//               packages/cli's node_modules, nothing from a clone): @eslint/js recommended and all,
//               eslint-plugin-unicorn recommended, unopinionated and all, eslint-plugin-sonarjs
//               recommended, eslint-config-prettier; Oxlint's categories (`oxlint --rules`); Biome's
//               recommended set (`biome explain`)
//   directives  every disable comment in the measured files (source and tests) naming one of these
//               rules: its kind, the rules, its reason, the lines it covers, and whether those lines
//               hold a nested ternary (the census's trees) and a raw report of the rule it names
//               (the census's ESLint pass with inline config ignored), and whether the report goes
//               away with inline config honoured
//
//   ghHistory   for the React set (shallow clones), the GitHub history of any config line naming
//               one of these rules (`gh api`, read-only; --gh fetches, otherwise only the cache in
//               out/nested-ternaries/markers-gh.json is read)
//
// Usage: node research/corpus/scripts/nested-ternaries-markers.cjs [--repos a,b] [--gh]
// Writes results/nested-ternaries/markers.json.
"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");

const RULES = [
  "no-nested-ternary",
  "no-unnecessary-nested-ternary",
  "no-ternary",
  "prefer-ternary",
  "prefer-minimal-ternary",
  "no-unneeded-ternary",
  "prefer-logical-operator-over-ternary",
  "multiline-ternary",
  "operator-linebreak",
  "no-mixed-operators",
  "no-nested-conditional",
  "no-negated-condition",
  "jsx-no-leaked-render",
  "noNestedTernary",
  "noUselessTernary",
  "noNegationElse",
  "noLeakedRender",
  "experimentalTernaries",
];
const RULE_RE = new RegExp(
  `(?:^|[^\\w/-])((?:@stylistic/(?:js/)?|unicorn/|sonarjs/|react/|eslint/|vue/)?(?:${RULES.map(
    (r) => r.replaceAll("-", "\\-")
  ).join("|")}))(?![\\w-])`,
  "g"
);
const CONFIG_RE =
  /(?:^|\/)(?:\.eslintrc(?:\.(?:js|cjs|mjs|json|ya?ml))?|[^/]*eslintrc[^/]*\.json|eslint\.config\.(?:js|cjs|mjs|ts|mts|cts)|biome\.jsonc?|\.oxlintrc\.jsonc?|oxlint\.config\.(?:ts|mts|js|mjs|json)|\.oxfmtrc\.jsonc?|oxfmt\.config\.(?:ts|mts|js|mjs)|vite\.config\.(?:ts|mts|js|mjs)|\.prettierrc(?:\.(?:js|cjs|mjs|json|ya?ml|toml))?|prettier\.config\.(?:js|cjs|mjs|ts)|dprint\.jsonc?|\.dprint\.jsonc?|package\.json)$|(?:^|\/)eslint-config-[^/]+\/[^/]+\.(?:js|cjs|mjs)$/;
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
  const js = require(require.resolve("@eslint/js", { paths: [lib.CLI] }));
  const prettier = require(
    require.resolve("eslint-config-prettier", { paths: [lib.CLI] })
  );
  const out = {
    "@eslint/js all": pick(js.configs.all.rules),
    "@eslint/js recommended": pick(js.configs.recommended.rules),
    "eslint-config-prettier": pick(prettier.rules ?? prettier.default?.rules),
    "eslint-plugin-sonarjs recommended": pick(
      lib.sonarjs.configs.recommended.rules
    ),
  };
  for (const c of ["recommended", "unopinionated", "all"]) {
    out[`eslint-plugin-unicorn ${c}`] = pick(flat(lib.unicorn.configs[c]));
  }
  const oxRules = JSON.parse(
    lib.spawnSync(
      process.execPath,
      [lib.oxlintBin, "--rules", "--format", "json"],
      {
        encoding: "utf8",
        maxBuffer: 1 << 28,
      }
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
        { category: r.category, default: r.default, fix: r.fix },
      ])
  );
  out["biome recommended"] = {};
  for (const n of RULES.filter((r) => /^no[A-Z]/.test(r))) {
    const text = lib.spawnSync(process.execPath, [lib.biomeBin, "explain", n], {
      encoding: "utf8",
    }).stdout;
    out["biome recommended"][n] = /This rule is recommended/.test(text);
  }
  out.versions = {
    "@eslint/js": lib.dc.versionOf("@eslint/js", lib.CLI),
    "eslint-config-prettier": lib.dc.versionOf(
      "eslint-config-prettier",
      lib.CLI
    ),
    "eslint-plugin-sonarjs": lib.dc.versionOf("eslint-plugin-sonarjs", lib.CLI),
    "eslint-plugin-unicorn": lib.unicornVersion,
  };
  return out;
};

// Which raw ESLint rule names a directive's rule name maps to in the census pass.
const censusRule = (r) => {
  const bare = r.replace(/^(?:eslint|@stylistic(?:\/js)?)\//, "");
  if (bare === "no-nested-ternary") {
    return ["no-nested-ternary"];
  }
  if (
    [
      "unicorn/no-nested-ternary",
      "unicorn/prefer-ternary",
      "unicorn/prefer-logical-operator-over-ternary",
      "unicorn/no-unnecessary-nested-ternary",
      "unicorn/prefer-minimal-ternary",
      "sonarjs/no-nested-conditional",
      "no-unneeded-ternary",
    ].includes(bare)
  ) {
    return [bare];
  }
  return [];
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
      // the lines it covers (1-based, inclusive)
      let from;
      let to;
      if (/-line$/.test(m[1])) {
        from = i + 1;
        to = i + 1;
      } else if (/next-line$/.test(m[1]) || m[1] === "biome-ignore") {
        from = i + 2;
        to = i + 2;
      } else {
        // a block: up to the matching enable, or the end of the file
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
      // a nested ternary on the covered lines: a tree that starts or ends there, or spans them
      d.nestedTernaryCovered = (raw.trees ?? []).some(
        (t) =>
          inRange(t.line) ||
          inRange(t.endLine) ||
          (t.line <= d.covers.from && t.endLine >= d.covers.to)
      );
      const ruleNames = d.rules.flatMap(censusRule);
      d.censusRules = ruleNames;
      d.rawReports = (raw.eslint ?? []).filter(
        (m) => ruleNames.includes(m.rule) && inRange(m.line)
      ).length;
      d.reportedReports = (honoured.eslint ?? []).filter(
        (m) => ruleNames.includes(m.rule) && inRange(m.line)
      ).length;
      out.push(d);
    }
  }
  return out;
};

// For repos with only a shallow clone (the React set), the history of a config line naming one of
// these rules comes from GitHub (`gh api`, read-only, cached in out/): the commits that touched
// the config up to the pinned commit, whether the line was there when the file was created, what
// any ESLint config that commit changed said about the same rules at its parent, and when the
// files holding the repo's nested ternaries were first committed.
const GH_CACHE = join(lib.OUT_DIR, "markers-gh.json");
const ghHistory = (name, entry) => {
  const cache = lib.readJson(GH_CACHE, {});
  const gh = (path) => {
    if (!(path in cache)) {
      if (!lib.flag("gh")) {
        return { error: "not cached: run with --gh" };
      }
      const r = lib.spawnSync("gh", ["api", path], {
        encoding: "utf8",
        maxBuffer: 1 << 26,
      });
      cache[path] =
        r.status === 0 ? JSON.parse(r.stdout) : { error: r.stderr.trim() };
    }
    return cache[path];
  };
  const slug = lib.repoMeta(name).github;
  const contentAt = (file, ref) => {
    const r = gh(`repos/${slug}/contents/${file}?ref=${ref}`);
    return r.content ? Buffer.from(r.content, "base64").toString("utf8") : null;
  };
  const out = [];
  for (const c of entry.configs) {
    const ruleLines = c.lines.filter((l) => l.kind === "rule");
    if (ruleLines.length === 0) {
      continue;
    }
    const commits = gh(
      `repos/${slug}/commits?path=${c.file}&sha=${entry.sha}&per_page=100`
    );
    if (!Array.isArray(commits) || commits.length === 0) {
      out.push({ error: commits.error ?? "no commits", file: c.file });
      continue;
    }
    const created = commits.at(-1);
    const createdText = contentAt(c.file, created.sha) ?? "";
    const detail = gh(`repos/${slug}/commits/${created.sha}`);
    const parent = detail.parents?.[0]?.sha ?? null;
    const before = [];
    for (const f of (detail.files ?? []).map((x) => x.filename)) {
      if (!/eslint\.config\.|\.eslintrc/.test(f) || !parent) {
        continue;
      }
      const text = contentAt(f, parent);
      if (!text) {
        continue;
      }
      text.split("\n").forEach((t, i) => {
        RULE_RE.lastIndex = 0;
        if (RULE_RE.test(t) && !/^\s*\/\//.test(t)) {
          before.push({ file: f, line: i + 1, text: t.trim() });
        }
      });
    }
    out.push({
      commits: commits.length,
      created: {
        date: created.commit.committer.date.slice(0, 10),
        message: created.commit.message.trim().slice(0, 1500),
        sha: created.sha,
      },
      file: c.file,
      linesAtCreation: ruleLines.map((l) => {
        const norm = (t) => t.trim().replace(/,$/, "");
        return {
          present: createdText
            .split("\n")
            .some((t) => norm(t) === norm(l.text)),
          text: l.text,
        };
      }),
      parent,
      parentEslintLines: before,
    });
  }
  // when the files holding the repo's nested ternaries were first committed
  const trees = lib.existsSync(
    join(lib.OUT_DIR, "census", `${name}.trees.jsonl`)
  )
    ? lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.trees.jsonl`))
    : [];
  const files = [...new Set(trees.map((t) => t.file))];
  const treeFiles = files.map((f) => {
    const commits = gh(
      `repos/${slug}/commits?path=${f}&sha=${entry.sha}&per_page=100`
    );
    const oldest = Array.isArray(commits) ? commits.at(-1) : null;
    return {
      file: f,
      firstCommit: oldest
        ? {
            date: oldest.commit.committer.date.slice(0, 10),
            sha: oldest.sha,
            subject: oldest.commit.message.split("\n")[0],
          }
        : null,
      nestedTernaries: trees.filter((t) => t.file === f).length,
    };
  });
  lib.writeJson(GH_CACHE, cache);
  return { configs: out, treeFiles };
};

const main = () => {
  const repos = lib.selectedRepos(lib.ALL);
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of nested-ternaries-markers.cjs. configs: lint and format configs at the pinned commit, with lines naming these rules (kind rule), shared-config and category lines (kind shared) and comments naming a rule (kind comment); `applies` lists the measured directories a config sits above. shared: what installed shared configs set. directives: disable comments in the measured files naming one of these rules.",
    repos: {},
    rules: RULES,
    shared: sharedConfigs(),
    tools: lib.toolVersions(),
  };
  for (const name of repos) {
    const c = configsOf(name);
    const directives = directivesOf(name);
    result.repos[name] = {
      ...c,
      directives,
      directivesByRule: directives
        .flatMap((d) => d.rules)
        .reduce((o, r) => ({ ...o, [r]: (o[r] ?? 0) + 1 }), {}),
      set: lib.setOf(name),
    };
    if (
      !c.history &&
      c.configs.some((x) => x.lines.some((l) => l.kind === "rule"))
    ) {
      result.repos[name].ghHistory = ghHistory(name, c);
    }
    const ruleLines = c.configs.flatMap((x) =>
      x.lines
        .filter((l) => l.kind === "rule")
        .map((l) => ({ ...l, file: x.file }))
    );
    console.log(
      `${name}: ${c.configs.length} configs (${c.configs.map((x) => `${x.file}[${x.tool}${x.appliesToMeasured ? "" : ", elsewhere"}]`).join(", ")}), ${ruleLines.length} rule lines, ${directives.length} directives${c.missing ? `, ${c.missing} blobs missing (${c.missingApplies.length} above measured code)` : ""}`
    );
    for (const l of ruleLines) {
      console.log(
        `   ${l.file}:${l.line} ${l.text.slice(0, 160)} (${l.added?.date ?? "?"} ${l.added?.sha?.slice(0, 10) ?? ""})`
      );
    }
    for (const d of directives) {
      console.log(
        `   directive ${d.file}:${d.line} ${d.kind} ${d.rules.join(",")} reason=${JSON.stringify(d.reason)} nested=${d.nestedTernaryCovered} raw=${d.rawReports} reported=${d.reportedReports}`
      );
    }
  }
  lib.writeJson(
    join(lib.RESULTS_DIR, "markers.json"),
    JSON.parse(lib.scrub(JSON.stringify(result)))
  );
};

main();
