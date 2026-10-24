// Suppressions and policy.
//
//   suppressions  every eslint-disable[-next-line|-line], oxlint-disable…, biome-ignore[-all|-start|
//                 -end] comment in every measured file (comments from typescript-estree, so strings
//                 never count), the rules it names, its reason (after `--`, or Biome's `: reason`),
//                 a nearby explanatory comment (a non-directive comment on the three lines above, or
//                 on the same line), and what it covers. Those naming a dependency or hooks rule
//                 (react-hooks/*, react-compiler, Biome's useExhaustiveDependencies and
//                 useHookAtTopLevel, react/exhaustive-deps) are joined to the hook they cover and to
//                 whether Ultracite's linters still report that hook in raw mode (effects-linters.cjs
//                 rows), i.e. whether the suppression is doing anything under Ultracite.
//   ranking       for each repo and pooled, how many directives name each rule, so the dependency
//                 rule can be compared with every other rule the same repos suppress; and from the
//                 shared rule census (results/react-effects/rule-census.json), raw minus reported
//                 diagnostics per rule, the diagnostics Oxlint's presets see suppressed
//   configs       each repo's own lint config lines that name hook rules, at the pinned commit
//
// Usage: node research/corpus/scripts/effects-markers.cjs
// Writes results/react-effects/markers.json and out/react-effects/suppressions.jsonl.
"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./effects-lib.cjs");

const repos = lib.selectedRepos([...lib.CORE, ...lib.DOGFOOD, ...lib.REACT]);
lib.checkPinned(repos);

const DIRECTIVE =
  /^\s*(eslint-disable(?:-next-line|-line)?|eslint-enable|oxlint-disable(?:-next-line|-line)?|oxlint-enable)(?=\s|$)([\s\S]*)$/;
const BIOME =
  /^\s*biome-ignore(-all|-start|-end)?\s+([^\s:]+)(?:\s*:\s*([\s\S]*))?$/;
const parseRules = (rest) => {
  const [rules, ...reason] = rest.split(/\s--\s|\s--$|^--\s/);
  const list = rules
    .split(",")
    .map((r) => r.trim().split(/\s+/)[0])
    .filter(Boolean);
  return {
    reason: reason.join(" -- ").replace(/\s+/g, " ").trim() || null,
    rules: list,
  };
};
const HOOK_RULE =
  /^(?:react-hooks\/|react-compiler\/|react\/(?:exhaustive-deps|rules-of-hooks|react-compiler)$|lint\/correctness\/(?:useExhaustiveDependencies|useHookAtTopLevel)$|@eslint-react\/hooks-extra|react-doctor\/(?:exhaustive-deps|rules-of-hooks)$)/;
const DEP_RULE =
  /^(?:react-hooks\/exhaustive-deps|react\/exhaustive-deps|lint\/correctness\/useExhaustiveDependencies|react-doctor\/exhaustive-deps)$/;

const loadRows = (name, linter, mode) =>
  lib.readJsonl(join(lib.OUT_DIR, "lint", `${name}.${linter}.${mode}.jsonl`));

const scan = (name) => {
  const { files } = lib.collect(name);
  const root = lib.getRepo(name).root;
  const hooks = lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`));
  const hooksByFile = new Map();
  for (const h of hooks) {
    if (!hooksByFile.has(h.file)) {
      hooksByFile.set(h.file, []);
    }
    hooksByFile.get(h.file).push(h);
  }
  const raw = {
    biome: loadRows(name, "biome", "raw"),
    eslint: [
      ...loadRows(name, "eslint", "raw"),
      ...loadRows(name, "eslint-all-files", "raw"),
    ],
    oxlint: loadRows(name, "oxlint", "raw"),
  };
  const reported = {
    biome: loadRows(name, "biome", "reported"),
    eslint: [
      ...loadRows(name, "eslint", "reported"),
      ...loadRows(name, "eslint-all-files", "reported"),
    ],
    oxlint: loadRows(name, "oxlint", "reported"),
  };
  const depFlag = (rows, hookId) =>
    rows.some(
      (d) =>
        d.hook === hookId &&
        (d.rule === "react-hooks/exhaustive-deps" ||
          d.rule === "react/exhaustive-deps" ||
          d.rule === "lint/correctness/useExhaustiveDependencies")
    );
  const directives = [];
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    const { ast } = lib.sk.safeParse(text, rel);
    if (!ast) {
      continue;
    }
    const lines = text.split("\n");
    const comments = ast.comments ?? [];
    const firstCode = ast.body[0]?.loc.start.line ?? Infinity;
    const plain = comments.filter(
      (c) => !DIRECTIVE.test(c.value) && !BIOME.test(c.value)
    );
    for (const c of comments) {
      const line = c.loc.start.line;
      let row = null;
      const d = DIRECTIVE.exec(c.value);
      const b = BIOME.exec(c.value);
      if (d) {
        const kind = d[1];
        const { reason, rules } = parseRules(d[2].trim());
        row = {
          kind,
          reason,
          rules,
          tool: kind.startsWith("oxlint") ? "oxlint" : "eslint",
        };
      } else if (b) {
        row = {
          kind: `biome-ignore${b[1] ?? ""}`,
          reason: b[3]?.replace(/\s+/g, " ").trim() || null,
          rules: [b[2]],
          tool: "biome",
        };
      }
      if (!row) {
        continue;
      }
      if (/enable$/.test(row.kind) || row.kind === "biome-ignore-end") {
        directives.push({ ...row, file: rel, line, enable: true });
        continue;
      }
      // What it covers.
      let target;
      let scope;
      if (/-next-line$/.test(row.kind) || row.kind === "biome-ignore") {
        // A JSX comment {/* … */} or a line comment covers the next line; Biome's covers the next
        // syntax node, which for a hook call is the statement on the next line.
        target = [c.loc.end.line + 1];
        scope = "next-line";
      } else if (/-line$/.test(row.kind)) {
        target = [line];
        scope = "line";
      } else {
        scope =
          line < firstCode || row.kind === "biome-ignore-all"
            ? "file"
            : "block";
        target = null;
      }
      // A nearby explanation: a plain comment ending on the three lines above, or on this line.
      const nearby = plain
        .filter(
          (p) =>
            p !== c &&
            ((p.loc.end.line >= line - 3 && p.loc.end.line < line) ||
              p.loc.start.line === line)
        )
        .map((p) => p.value.replace(/\s+/g, " ").trim())
        .filter((v) => v && !/^[-=─*]+$/.test(v));
      const hookRules = row.rules.filter((r) => HOOK_RULE.test(r));
      const depRules = row.rules.filter((r) => DEP_RULE.test(r));
      const entry = {
        ...row,
        blanket:
          row.rules.length === 0 ||
          (row.tool === "biome" && row.rules[0] === "lint"),
        context: lines.slice(Math.max(0, line - 4), line + 4).join("\n"),
        depRules,
        file: rel,
        hookRules,
        line,
        nearby: nearby.length > 0 ? nearby.join(" | ").slice(0, 400) : null,
        permalink: lib.permalink(name, rel, line, target ? target[0] : line),
        scope,
        target,
        text: `${c.type === "Line" ? "//" : "/*"}${c.value}${c.type === "Line" ? "" : "*/"}`
          .replace(/\s+/g, " ")
          .slice(0, 300),
      };
      const blanketDirective =
        row.rules.length === 0 ||
        (row.tool === "biome" && row.rules[0] === "lint");
      if (depRules.length > 0 || hookRules.length > 0 || blanketDirective) {
        const fileHooks = hooksByFile.get(rel) ?? [];
        let covered = [];
        if (target) {
          const starts = lib.lineStarts(text);
          const offset = lib.offsetOf(starts, target[0], 1);
          const lineEnd = starts[target[0]] ?? text.length;
          covered = fileHooks.filter(
            (h) =>
              (h.range[0] <= lineEnd && h.range[1] >= offset) ||
              h.depsLine === target[0]
          );
          // prefer the innermost
          covered.sort(
            (x, y) => x.range[1] - x.range[0] - (y.range[1] - y.range[0])
          );
          covered = covered.slice(0, 1);
        } else {
          covered = fileHooks.filter((h) => h.line >= line);
        }
        entry.hooks = covered.map((h) => ({
          deps: h.deps.map((x) => `${x.text}:${x.kind}`),
          depsForm: h.depsForm,
          id: h.id,
          kind: h.kind,
          line: h.line,
          name: h.name,
          category: h.category ?? null,
          rawFlag: {
            biome: depFlag(raw.biome, h.id),
            eslint: depFlag(raw.eslint, h.id),
            oxlint: depFlag(raw.oxlint, h.id),
          },
          reportedFlag: {
            biome: depFlag(reported.biome, h.id),
            eslint: depFlag(reported.eslint, h.id),
            oxlint: depFlag(reported.oxlint, h.id),
          },
        }));
      }
      directives.push(entry);
    }
  }
  return { directives: directives.filter((d) => !d.enable), hooks };
};

// Each repo's own lint config lines about hook rules, at the pinned commit. Corpus repos are read
// from the history clones (git show); the React set from its clone.
const CONFIG_FILES = {
  excalidraw: [".eslintrc.json", "eslint.config.mjs", "package.json"],
  hono: ["eslint.config.mjs", "package.json"],
  "next.js": ["eslint.config.mjs", "eslint.cli.config.mjs", ".eslintrc.json"],
  radix: [".oxlintrc.json", "eslint.config.mjs", "package.json"],
  "react-aria": [".oxlintrc.json", "eslint.config.mjs", "package.json"],
  shadcn: [".eslintrc.json", "eslint.config.mjs", "apps/v4/eslint.config.mjs"],
  supabase: [
    "apps/studio/eslint.config.cjs",
    "packages/eslint-config-supabase/next.js",
    "packages/eslint-config-supabase/index.js",
  ],
  trpc: [
    "eslint.config.js",
    "eslint.config.mjs",
    ".oxlintrc.json",
    "biome.json",
  ],
};
const readAtPin = (name, rel) => {
  const hist = join(lib.HISTORY_DIR, `${name}.git`);
  if (existsSync(hist)) {
    try {
      return lib.execFileSync(
        "git",
        ["-C", hist, "show", `${lib.shaOf(name)}:${rel}`],
        {
          encoding: "utf8",
          env: { ...process.env, GIT_NO_LAZY_FETCH: "1" },
          stdio: ["ignore", "pipe", "ignore"],
        }
      );
    } catch {
      // fall through to the clone
    }
  }
  const abs = join(lib.getRepo(name).root, rel);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
};
const configLines = (name) => {
  const out = [];
  for (const rel of CONFIG_FILES[name] ?? []) {
    const text = readAtPin(name, rel);
    if (text === null) {
      continue;
    }
    text.split("\n").forEach((t, i) => {
      if (
        /react-hooks|exhaustive-deps|rules-of-hooks|react-compiler|useExhaustiveDependencies|useHookAtTopLevel|react-app|core-web-vitals|plugin:react|"react\/|eslint-config-next|eslint-plugin-react-hooks/.test(
          t
        )
      ) {
        out.push({
          file: rel,
          line: i + 1,
          permalink: lib.permalink(name, rel, i + 1),
          text: t.trim().slice(0, 200),
        });
      }
    });
  }
  return out;
};

const main = () => {
  const census = lib.readJson(join(lib.RESULTS_DIR, "census.json"));
  const ruleCensus = lib.readJson(join(lib.RESULTS_DIR, "rule-census.json"));
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Directive comments in every measured file. A dependency-rule suppression names react-hooks/exhaustive-deps, react/exhaustive-deps (Oxlint's spelling) or Biome's useExhaustiveDependencies. `hooks` is the hook the directive covers (next line, same line, or for a block or file-wide disable every hook after it), with whether each Ultracite linter's dependency rule flags it raw (disables neutralised) and reported. `nearby` is a plain comment on the three lines above or on the same line.",
    pooled: {},
    repos: {},
  };
  const all = { core: [], react: [] };
  const allHooks = { core: [], react: [] };
  for (const name of repos) {
    const { directives, hooks } = scan(name);
    lib.writeJsonl(
      join(lib.OUT_DIR, "suppressions", `${name}.jsonl`),
      directives
    );
    const effects = hooks.filter((h) => h.kind === "effect").length;
    const depHooks = hooks.length;
    const dep = directives.filter((d) => d.depRules.length > 0);
    const hookOther = directives.filter(
      (d) => d.hookRules.length > 0 && d.depRules.length === 0
    );
    // Blanket directives (no rule named) that cover a hook the dependency rule flags raw: they
    // suppress it too.
    const blanketDep = directives.filter(
      (d) =>
        d.blanket &&
        (d.hooks ?? []).some(
          (h) => h.rawFlag.eslint || h.rawFlag.oxlint || h.rawFlag.biome
        )
    );
    const byRule = {};
    for (const d of directives) {
      for (const r of d.rules.length > 0 ? d.rules : ["(all rules)"]) {
        byRule[r] = (byRule[r] ?? 0) + 1;
      }
    }
    const ranked = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
    const depRank =
      ranked.findIndex(([r]) => DEP_RULE.test(r)) === -1
        ? null
        : ranked.findIndex(([r]) => DEP_RULE.test(r)) + 1;
    result.repos[name] = {
      blanket: directives.filter((d) => d.blanket).length,
      blanketCoveringFlaggedHook: {
        byScope: lib.countBy(blanketDep, (d) => d.scope),
        n: blanketDep.length,
        withReasonOrComment: blanketDep.filter((d) => d.reason || d.nearby)
          .length,
      },
      configLines: configLines(name),
      dependencyRule: {
        coveringNoHook: dep.filter((d) => (d.hooks ?? []).length === 0).length,
        n: dep.length,
        per100DepHooks: depHooks ? lib.pct(dep.length, depHooks) : null,
        per100Effects: effects ? lib.pct(dep.length, effects) : null,
        scopes: lib.countBy(dep, (d) => d.scope),
        stillFlaggedRaw: {
          biome: dep.filter((d) => d.hooks?.some((h) => h.rawFlag.biome))
            .length,
          eslint: dep.filter((d) => d.hooks?.some((h) => h.rawFlag.eslint))
            .length,
          oxlint: dep.filter((d) => d.hooks?.some((h) => h.rawFlag.oxlint))
            .length,
        },
        tools: lib.countBy(dep, (d) => d.kind),
        withNearbyComment: dep.filter((d) => d.nearby).length,
        withReason: dep.filter((d) => d.reason).length,
        withReasonOrComment: dep.filter((d) => d.reason || d.nearby).length,
      },
      dependencyRuleRank: depRank,
      directives: directives.length,
      effects,
      depHooks,
      otherHookRules: {
        byRule: lib.countBy(
          hookOther.flatMap((d) => d.hookRules),
          (r) => r
        ),
        n: hookOther.length,
      },
      topRules: ranked.slice(0, 15),
      totalRulesNamed: ranked.length,
    };
    const set = lib.setOf(name);
    if (all[set]) {
      all[set].push(...directives.map((d) => ({ ...d, repo: name })));
      allHooks[set].push(...hooks);
    }
    console.log(
      `${name}: ${directives.length} directives, ${dep.length} name the dependency rule (rank ${depRank}), ${hookOther.length} other hook rules`
    );
  }
  for (const [set, ds] of Object.entries(all)) {
    const byRule = {};
    for (const d of ds) {
      for (const r of d.rules.length > 0 ? d.rules : ["(all rules)"]) {
        byRule[r] = (byRule[r] ?? 0) + 1;
      }
    }
    const dep = ds.filter((d) => d.depRules.length > 0);
    const effects = allHooks[set].filter((h) => h.kind === "effect").length;
    result.pooled[set] = {
      dependencyRule: {
        n: dep.length,
        per100DepHooks: lib.pct(dep.length, allHooks[set].length),
        per100Effects: lib.pct(dep.length, effects),
        withNearbyComment: dep.filter((d) => d.nearby).length,
        withReason: dep.filter((d) => d.reason).length,
        withReasonOrComment: dep.filter((d) => d.reason || d.nearby).length,
      },
      depHooks: allHooks[set].length,
      directives: ds.length,
      effects,
      topRules: Object.entries(byRule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25),
    };
  }
  // The rule census's view: diagnostics Oxlint's presets report raw but not reported, per rule.
  if (ruleCensus) {
    const suppressedByRule = (names) => {
      const out = {};
      for (const [rule, r] of Object.entries(ruleCensus.rules ?? {})) {
        let raw = 0;
        let rep = 0;
        for (const n of names) {
          raw += r.raw?.byRepo?.[n] ?? 0;
          rep += r.reported?.byRepo?.[n] ?? 0;
        }
        if (raw - rep > 0) {
          out[rule] = { raw, reported: rep, suppressed: raw - rep };
        }
      }
      return Object.fromEntries(
        Object.entries(out).sort((a, b) => b[1].suppressed - a[1].suppressed)
      );
    };
    result.ruleCensusSuppressed = {
      core: suppressedByRule(lib.CORE.filter((n) => repos.includes(n))),
      react: suppressedByRule(lib.REACT.filter((n) => repos.includes(n))),
    };
  }
  result.census = census
    ? Object.fromEntries(
        Object.entries(census.repos).map(([n, r]) => [
          n,
          { effects: r.effects.n, hooks: r.hooks },
        ])
      )
    : null;
  lib.writeJson(join(lib.RESULTS_DIR, "markers.json"), result);
};

main();
