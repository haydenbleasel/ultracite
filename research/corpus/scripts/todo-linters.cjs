// Runs the TODO-comment rules as Ultracite configures them.
//
//   --calibration  calibration/todo-comments/cases.tsx through Oxlint (core + react, as `ultracite
//                  init` writes the root config; then with js-plugins), ESLint (core + react,
//                  inline config ignored and honoured) and Biome (core). Records every focus-rule
//                  diagnostic with its message and the help Ultracite's agent handoff carries
//                  (Oxlint's `help`, ESLint's rule docs description), plus the other comment rules
//                  that fire on the same lines. Checks the reimplemented matchers in todo-lib.cjs
//                  against what each rule reported, case by case.
//   --autofix      what each fix pass `ultracite fix` runs does to the cases' comments:
//                  oxlint --fix and --fix-dangerously (both configs), eslint --fix,
//                  biome check --write and --write --unsafe. Copies live under the system temp
//                  directory, because the presets ignore **/out.
//   --corpus       the focus rules on every corpus file, Oxlint (both configs) and ESLint (core),
//                  reported (disable comments honoured) and raw (Oxlint on a mirror with every
//                  disable directive neutralised, as rule-census.cjs does; ESLint with
//                  noInlineConfig). Every diagnostic is joined to the comment and marker it
//                  reports (out/todo-comments/markers.json from todo-census.cjs), every marker gets
//                  the rules that catch it, and the matchers predict each rule comment by comment.
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/todo-linters.cjs --calibration --autofix --corpus [--repos a,b]
// Writes results/todo-comments/linters.json (calibration, autofix) and corpus-lint.json (corpus),
// and out/todo-comments/corpus-diagnostics.json (every corpus diagnostic, gitignored).
"use strict";

const {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join } = require("node:path");

const lib = require("./todo-lib.cjs");

const { dc } = lib;
const CASES = join(lib.CALIBRATION_DIR, "cases.tsx");
const TMP = join(tmpdir(), "ultracite-research-todo-comments");

const FOCUS = new Set(lib.FOCUS_ESLINT);
const norm = (rule) => dc.toOxlintName(rule ?? "");
const isFocus = (rule) => FOCUS.has(norm(rule));
const isRelated = (rule) =>
  lib.RELATED.has(rule) || lib.RELATED.has(norm(rule));

// ── calibration ────────────────────────────────────────────────────────
const caseRanges = (text) => {
  const lines = text.split("\n");
  const starts = [];
  lines.forEach((line, i) => {
    const m = /^caseStart\("([A-Z]\d+)", "(.*)"\);$/.exec(line);
    if (m) {
      starts.push({ id: m[1], line: i + 1, what: m[2] });
    }
  });
  return starts.map((s, i) => ({
    ...s,
    end: (starts[i + 1]?.line ?? lines.length + 1) - 1,
    source: lines
      .slice(s.line, (starts[i + 1]?.line ?? lines.length + 1) - 1)
      .join("\n")
      .trimEnd(),
  }));
};
const caseOf = (ranges, line) =>
  ranges.find((r) => line >= r.line && line <= r.end)?.id ?? null;

const eslintHelp = async () => {
  // What Ultracite's ESLint adapter hands over as help: the rule's docs.description.
  const { builtinRules } = require(
    require.resolve("eslint/use-at-your-own-risk", { paths: [lib.CLI] })
  );
  const sonarjs = require(
    require.resolve("eslint-plugin-sonarjs", { paths: [lib.CLI] })
  );
  const { pathToFileURL } = require("node:url");
  const unicornDir = dirname(
    require.resolve("eslint-plugin-unicorn", { paths: [lib.CLI] })
  );
  const unicorn = (
    await import(
      pathToFileURL(join(unicornDir, "rules", "expiring-todo-comments.js")).href
    )
  ).default;
  return {
    "no-inline-comments":
      builtinRules.get("no-inline-comments").meta.docs.description,
    "no-warning-comments": builtinRules.get("no-warning-comments").meta.docs
      .description,
    "sonarjs/fixme-tag": sonarjs.rules["fixme-tag"].meta.docs.description,
    "sonarjs/todo-tag": sonarjs.rules["todo-tag"].meta.docs.description,
    "unicorn/expiring-todo-comments": unicorn.meta.docs.description,
  };
};

const lintCalibration = async (dir, file) => {
  const oxDefault = lib.oxlintConfig("default");
  const oxJs = lib.oxlintConfig("js-plugins");
  const biome = lib.biomeUltracite(["core"]);
  return {
    biome: lib.runBiome({ configDir: biome, cwd: dir, files: [file] }),
    "eslint raw": await lib.runEslint({
      cwd: dir,
      files: [file],
      presets: ["core", "react"],
    }),
    "eslint reported": await lib.runEslint({
      cwd: dir,
      files: [file],
      inline: true,
      presets: ["core", "react"],
    }),
    "oxlint default": lib.runOxlint({
      configFile: oxDefault,
      cwd: dir,
      files: [file],
    }),
    "oxlint js-plugins": lib.runOxlint({
      configFile: oxJs,
      cwd: dir,
      files: [file],
    }),
  };
};

// The comment values on a case's lines, as typescript-estree sees them.
const commentsByCase = (text, ranges) => {
  const { comments } = lib.extractComments(text, "cases.tsx");
  const out = Object.fromEntries(ranges.map((r) => [r.id, []]));
  for (const c of comments) {
    const id = caseOf(ranges, c.line);
    if (id) {
      out[id].push(
        `${c.type === "Line" ? "//" : "/*"}${c.value}${c.type === "Line" ? "" : "*/"}`
      );
    }
  }
  return out;
};

const calibration = async () => {
  const text = readFileSync(CASES, "utf8");
  const ranges = caseRanges(text);
  const lint = await lintCalibration(lib.CALIBRATION_DIR, "cases.tsx");
  const help = await eslintHelp();
  const { comments } = lib.extractComments(text, "cases.tsx");
  const cases = ranges.map((r) => {
    const own = comments.filter((c) => c.line >= r.line && c.line <= r.end);
    const predicted = {
      "no-warning-comments": own.flatMap((c) => lib.nwcTerms(c.value)).length,
      "sonarjs/fixme-tag": own.flatMap((c) => lib.sonarLines(c.value, "fixme"))
        .length,
      "sonarjs/todo-tag": own.flatMap((c) => lib.sonarLines(c.value, "todo"))
        .length,
      unicornCandidate: own.some((c) => lib.unicornCandidate(c.value)),
    };
    const byConfig = {};
    for (const [config, diags] of Object.entries(lint)) {
      const here = diags.filter((d) => caseOf(ranges, d.line) === r.id);
      byConfig[config] = {
        focus: here
          .filter((d) => isFocus(d.rule))
          .map((d) => ({
            column: d.column,
            help: config.startsWith("oxlint")
              ? d.help
              : (help[norm(d.rule)] ?? help[d.rule] ?? null),
            line: d.line,
            message: d.message,
            rule: norm(d.rule),
          })),
        related: here
          .filter((d) => isRelated(d.rule))
          .map((d) => ({
            line: d.line,
            message: d.message,
            rule: norm(d.rule),
          })),
      };
    }
    // Do the reimplemented matchers predict the real rules?
    const count = (config, rule) =>
      byConfig[config].focus.filter((d) => d.rule === rule).length;
    const checks = {
      "eslint no-warning-comments":
        count("eslint raw", "no-warning-comments") ===
        predicted["no-warning-comments"],
      "eslint sonarjs/fixme-tag":
        count("eslint raw", "sonarjs/fixme-tag") ===
        predicted["sonarjs/fixme-tag"],
      "eslint sonarjs/todo-tag":
        count("eslint raw", "sonarjs/todo-tag") ===
        predicted["sonarjs/todo-tag"],
      "oxlint no-warning-comments":
        count("oxlint default", "no-warning-comments") ===
        predicted["no-warning-comments"],
      "oxlint sonarjs/fixme-tag":
        count("oxlint js-plugins", "sonarjs/fixme-tag") ===
        predicted["sonarjs/fixme-tag"],
      "oxlint sonarjs/todo-tag":
        count("oxlint js-plugins", "sonarjs/todo-tag") ===
        predicted["sonarjs/todo-tag"],
      "unicorn only on candidates":
        count("eslint raw", "unicorn/expiring-todo-comments") === 0 ||
        predicted.unicornCandidate,
    };
    return { ...r, byConfig, checks, predicted };
  });
  const mismatches = cases.flatMap((c) =>
    Object.entries(c.checks)
      .filter(([, ok]) => !ok)
      .map(([check]) => `${c.id} ${check}`)
  );
  const messages = {};
  for (const [config, diags] of Object.entries(lint)) {
    for (const d of diags.filter((x) => isFocus(x.rule) || isRelated(x.rule))) {
      const key = `${config} ${norm(d.rule)}`;
      messages[key] ??= {
        examples: [],
        help: config.startsWith("oxlint")
          ? (d.help ?? null)
          : (help[norm(d.rule)] ?? help[d.rule] ?? null),
        suggestions: d.suggestions ?? [],
        url: d.url ?? null,
      };
      if (
        messages[key].examples.length < 4 &&
        !messages[key].examples.includes(d.message)
      ) {
        messages[key].examples.push(d.message);
      }
    }
  }
  const biomeAll = lint.biome.map((d) => ({
    case: caseOf(ranges, d.line),
    message: d.message,
    rule: d.rule,
  }));
  return {
    biomeDiagnostics: biomeAll,
    biomeOnComments: biomeAll.filter((d) =>
      /todo|fixme|comment/i.test(`${d.rule} ${d.message}`)
    ),
    cases,
    eslintHelp: help,
    matcherMismatches: mismatches,
    messages,
  };
};

// ── autofix ────────────────────────────────────────────────────────────
const FIXERS = [
  { config: "default", flag: "--fix", name: "oxlint --fix", tool: "oxlint" },
  {
    config: "default",
    flag: "--fix-dangerously",
    name: "oxlint --fix-dangerously",
    tool: "oxlint",
  },
  {
    config: "js-plugins",
    flag: "--fix",
    name: "oxlint --fix (js-plugins)",
    tool: "oxlint",
  },
  {
    config: "js-plugins",
    flag: "--fix-dangerously",
    name: "oxlint --fix-dangerously (js-plugins)",
    tool: "oxlint",
  },
  { name: "eslint --fix", tool: "eslint" },
  { name: "biome check --write", tool: "biome", write: ["--write"] },
  {
    name: "biome check --write --unsafe",
    tool: "biome",
    write: ["--write", "--unsafe"],
  },
];
const autofix = async () => {
  const text = readFileSync(CASES, "utf8");
  const ranges = caseRanges(text);
  const before = commentsByCase(text, ranges);
  const out = {};
  for (const fixer of FIXERS) {
    const dir = join(TMP, "autofix", fixer.name.replace(/[^a-z0-9]+/gi, "-"));
    rmSync(dir, { force: true, recursive: true });
    mkdirSync(dir, { recursive: true });
    cpSync(CASES, join(dir, "cases.tsx"));
    cpSync(
      join(lib.CALIBRATION_DIR, "package.json"),
      join(dir, "package.json")
    );
    let timedOut = false;
    if (fixer.tool === "oxlint") {
      lib.runOxlint({
        configFile: lib.oxlintConfig(fixer.config),
        cwd: dir,
        files: ["cases.tsx"],
        fix: fixer.flag,
      });
    } else if (fixer.tool === "eslint") {
      await lib.eslintFix({
        cwd: dir,
        files: ["cases.tsx"],
        presets: ["core", "react"],
      });
    } else {
      timedOut = lib.runBiome({
        configDir: lib.biomeUltracite(["core"]),
        cwd: dir,
        files: ["cases.tsx"],
        write: fixer.write,
      }).timedOut;
    }
    const fixed = readFileSync(join(dir, "cases.tsx"), "utf8");
    const afterRanges = caseRanges(fixed);
    const after = commentsByCase(fixed, afterRanges);
    const changed = ranges
      .map((r) => ({
        after: after[r.id] ?? null,
        before: before[r.id],
        id: r.id,
      }))
      .filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after));
    out[fixer.name] = {
      casesWithCommentChanges: changed,
      fileChanged: fixed !== text,
      timedOut,
    };
  }
  return out;
};

// ── corpus ─────────────────────────────────────────────────────────────
const DIRECTIVE = /\b(eslint|oxlint)-(disable|enable)/g;
const neutralise = (t) =>
  t.replace(DIRECTIVE, (_, tool, verb) => `${"x".repeat(tool.length)}-${verb}`);
const writeMirror = (name, root, files) => {
  const mirror = join(lib.OUT_DIR, "mirror", name);
  rmSync(mirror, { force: true, recursive: true });
  for (const rel of files) {
    const dest = join(mirror, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, neutralise(readFileSync(join(root, rel), "utf8")));
  }
  return mirror;
};

const corpus = async (names) => {
  const markers = lib.readJson(join(lib.OUT_DIR, "markers.json")).rows;
  const oxDefault = lib.oxlintConfig("default");
  const oxJs = lib.oxlintConfig("js-plugins");
  const keep = (rule) => isFocus(rule);
  const diagnostics = [];
  const perRepo = {};
  for (const name of names) {
    const meta = lib.repoMeta(name);
    const { files } = lib.collect(name);
    const started = Date.now();
    const mirror = writeMirror(name, meta.root, files);
    const runs = {
      "eslint raw": await lib.runEslint({
        cwd: meta.root,
        files,
        keep: (r) => FOCUS.has(r) || r.startsWith("parse:"),
      }),
      "eslint reported": await lib.runEslint({
        cwd: meta.root,
        files,
        inline: true,
        keep: (r) => FOCUS.has(r) || r.startsWith("parse:"),
      }),
      "oxlint default raw": lib.runOxlint({
        configFile: oxDefault,
        cwd: mirror,
        files,
        keep,
      }),
      "oxlint default reported": lib.runOxlint({
        configFile: oxDefault,
        cwd: meta.root,
        files,
        keep,
      }),
      "oxlint js-plugins raw": lib.runOxlint({
        configFile: oxJs,
        cwd: mirror,
        files,
        keep,
      }),
      "oxlint js-plugins reported": lib.runOxlint({
        configFile: oxJs,
        cwd: meta.root,
        files,
        keep,
      }),
    };
    rmSync(mirror, { force: true, recursive: true });
    // Every ESLint diagnostic from a rule outside the focus set is a parse error (keep filters the rest).
    const parseErrors = runs["eslint raw"]
      .filter((d) => d.rule.startsWith("parse:"))
      .map((d) => ({ file: d.file, message: d.rule }));
    perRepo[name] = {
      parseErrors,
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    for (const [run, ds] of Object.entries(runs)) {
      for (const d of ds) {
        // ESLint also returns "rule not found" and "inline config ignored" messages for the
        // files' own disable comments; only the focus rules count.
        if (!isFocus(d.rule)) {
          continue;
        }
        diagnostics.push({
          column: d.column,
          file: d.file,
          help: d.help ?? null,
          line: d.line,
          message: d.message,
          repo: name,
          rule: norm(d.rule),
          run,
        });
      }
    }
    console.log(
      `${name}: ${files.length} files, ${Object.entries(runs)
        .map(([k, v]) => `${k} ${v.length}`)
        .join(", ")} (${perRepo[name].seconds}s)`
    );
  }

  // ── join each diagnostic to its comment ────────────────────────────
  const commentsByFile = new Map();
  for (const m of markers) {
    const key = `${m.repo}:${m.file}`;
    if (!commentsByFile.has(key)) {
      commentsByFile.set(key, new Map());
    }
    commentsByFile.get(key).set(m.commentId, m.comment);
  }
  // Diagnostics can land on comments with no marker occurrence at all (e.g. "todos" for sonarjs);
  // re-scan those files for the comment.
  const scanned = new Map();
  const commentAt = (repo, file, line) => {
    const key = `${repo}:${file}`;
    if (!scanned.has(key)) {
      const text = readFileSync(join(lib.repoMeta(repo).root, file), "utf8");
      scanned.set(key, lib.extractComments(text, file).comments);
    }
    return (
      scanned.get(key).find((c) => line >= c.line && line <= c.endLine) ?? null
    );
  };
  for (const d of diagnostics) {
    const c = commentAt(d.repo, d.file, d.line);
    d.commentId = c ? `${d.repo}:${d.file}:${c.line}:${c.column}` : null;
    d.commentValue = c ? c.value.slice(0, 300) : null;
  }
  const unmatched = diagnostics.filter((d) => !d.commentId);

  // ── which rules catch each marker ──────────────────────────────────
  const runsByComment = new Map();
  for (const d of diagnostics) {
    const k = d.commentId;
    if (!runsByComment.has(k)) {
      runsByComment.set(k, []);
    }
    runsByComment.get(k).push(d);
  }
  // no-warning-comments reports a comment; the sonarjs rules report the line of their own term,
  // so todo-tag counts only for TODO and @todo markers and fixme-tag only for FIXME.
  const SONAR_TERMS = {
    "sonarjs/fixme-tag": ["FIXME"],
    "sonarjs/todo-tag": ["TODO", "@todo"],
  };
  const caughtBy = (m, run, rule) =>
    (!SONAR_TERMS[rule] || SONAR_TERMS[rule].includes(m.term)) &&
    (runsByComment.get(m.commentId) ?? []).some(
      (d) =>
        d.run === run &&
        d.rule === rule &&
        (SONAR_TERMS[rule] ? d.line === m.line : true)
    );
  const markerRows = markers
    .filter((m) => m.kind === "marker" && names.includes(m.repo))
    .map((m) => {
      const lower = m.term.toLowerCase();
      const nwc = lib.nwcTerms(m.comment.value);
      const skips =
        m.term === "TODO" || m.term === "@todo"
          ? lib.sonarTodoSkips(m.comment.value)
          : [];
      return {
        id: m.id,
        repo: m.repo,
        set: lib.setOf(m.repo),
        term: m.term,
        position: m.position,
        commentKind: m.comment.jsdoc ? "jsdoc" : m.comment.type.toLowerCase(),
        caught: {
          "eslint no-warning-comments": caughtBy(
            m,
            "eslint raw",
            "no-warning-comments"
          ),
          "eslint sonarjs/fixme-tag": caughtBy(
            m,
            "eslint raw",
            "sonarjs/fixme-tag"
          ),
          "eslint sonarjs/todo-tag": caughtBy(
            m,
            "eslint raw",
            "sonarjs/todo-tag"
          ),
          "eslint unicorn/expiring-todo-comments": caughtBy(
            m,
            "eslint raw",
            "unicorn/expiring-todo-comments"
          ),
          "oxlint no-warning-comments": caughtBy(
            m,
            "oxlint default raw",
            "no-warning-comments"
          ),
          "oxlint sonarjs/fixme-tag": caughtBy(
            m,
            "oxlint js-plugins raw",
            "sonarjs/fixme-tag"
          ),
          "oxlint sonarjs/todo-tag": caughtBy(
            m,
            "oxlint js-plugins raw",
            "sonarjs/todo-tag"
          ),
        },
        // Whether the comment as a whole matches no-warning-comments for this marker's term.
        nwcCommentMatches: nwc.includes(lower === "@todo" ? "todo" : lower),
        sonarSkip:
          skips.find((s) => s.lineIdx === m.line - m.comment.line)?.reason ??
          null,
      };
    });

  // ── do the matchers predict the rules, comment by comment? ─────────
  const predictionChecks = [];
  const allComments = new Map();
  for (const [key, list] of scanned) {
    const [repo, ...rest] = key.split(":");
    const file = rest.join(":");
    for (const c of list) {
      allComments.set(`${repo}:${file}:${c.line}:${c.column}`, c);
    }
  }
  for (const m of markers.filter((x) => names.includes(x.repo))) {
    if (!allComments.has(m.commentId)) {
      allComments.set(m.commentId, m.comment);
    }
  }
  const actualCount = (commentId, run, rule) =>
    (runsByComment.get(commentId) ?? []).filter(
      (d) => d.run === run && d.rule === rule
    ).length;
  for (const [commentId, c] of allComments) {
    // Oxlint's raw runs lint the mirror, where "eslint-disable" reads "xxxxxx-disable", so sonarjs
    // no longer skips those comments there.
    const predictFor = (value) => ({
      "no-warning-comments": lib.nwcTerms(value).length,
      "sonarjs/fixme-tag": lib.sonarLines(value, "fixme").length,
      "sonarjs/todo-tag": lib.sonarLines(value, "todo").length,
    });
    const original = predictFor(c.value);
    const mirrored = predictFor(neutralise(c.value));
    for (const [run, rule] of [
      ["eslint raw", "no-warning-comments"],
      ["oxlint default raw", "no-warning-comments"],
      ["eslint raw", "sonarjs/todo-tag"],
      ["oxlint js-plugins raw", "sonarjs/todo-tag"],
      ["eslint raw", "sonarjs/fixme-tag"],
      ["oxlint js-plugins raw", "sonarjs/fixme-tag"],
    ]) {
      const actual = actualCount(commentId, run, rule);
      const predicted = (run.startsWith("oxlint") ? mirrored : original)[rule];
      if (actual !== predicted) {
        predictionChecks.push({
          actual,
          commentId,
          predicted,
          rule,
          run,
          value: c.value.slice(0, 200),
        });
      }
    }
  }

  // ── tallies ────────────────────────────────────────────────────────
  const runs = [...new Set(diagnostics.map((d) => d.run))].sort();
  const rules = [...FOCUS];
  const counts = {};
  for (const run of runs) {
    counts[run] = {};
    for (const rule of rules) {
      const ds = diagnostics.filter((d) => d.run === run && d.rule === rule);
      // Only the rules each configuration has: Oxlint has no unicorn port, and its default presets
      // have no sonarjs rules.
      const has =
        run.startsWith("eslint") ||
        rule === "no-warning-comments" ||
        (run.includes("js-plugins") && rule.startsWith("sonarjs/"));
      if (!has) {
        continue;
      }
      counts[run][rule] = Object.fromEntries(
        names.map((n) => [n, ds.filter((d) => d.repo === n).length])
      );
    }
  }
  const messages = {};
  for (const d of diagnostics) {
    const key = `${d.run.split(" ").slice(0, -1).join(" ")} ${d.rule}`;
    messages[key] ??= { examples: [], help: d.help, shapes: {} };
    const shape = d.message.replace(/'[^']*'/g, "'…'").replace(/: .*$/, ": …");
    messages[key].shapes[shape] = (messages[key].shapes[shape] ?? 0) + 1;
    if (messages[key].examples.length < 3) {
      messages[key].examples.push(d.message);
    }
  }
  // ── which markers each rule catches, and why it misses the rest ─────
  const catches = {};
  for (const set of ["core", "react", "dogfood"]) {
    const rows = markerRows.filter(
      (m) => m.set === set && ["TODO", "FIXME", "XXX", "@todo"].includes(m.term)
    );
    const nwcMiss = rows.filter((m) => !m.caught["oxlint no-warning-comments"]);
    const sonarRows = rows.filter(
      (m) => m.term === "TODO" || m.term === "@todo"
    );
    const sonarMiss = sonarRows.filter(
      (m) => !m.caught["eslint sonarjs/todo-tag"]
    );
    const count = (xs, f) =>
      xs.reduce((a, x) => ({ ...a, [f(x)]: (a[f(x)] ?? 0) + 1 }), {});
    catches[set] = {
      byTerm: count(rows, (m) => m.term),
      caught: Object.fromEntries(
        Object.keys(rows[0]?.caught ?? {}).map((k) => [
          k,
          rows.filter((m) => m.caught[k]).length,
        ])
      ),
      caughtByAny: rows.filter((m) => Object.values(m.caught).some(Boolean))
        .length,
      caughtByNone: rows
        .filter((m) => !Object.values(m.caught).some(Boolean))
        .map((m) => m.id),
      // Oxlint's default presets see only no-warning-comments.
      caughtByOxlintDefault: rows.filter(
        (m) => m.caught["oxlint no-warning-comments"]
      ).length,
      markers: rows.length,
      noWarningCommentsMisses: count(
        nwcMiss,
        (m) => `${m.term}, ${m.position}, ${m.commentKind}`
      ),
      sonarTodoMarkers: sonarRows.length,
      sonarTodoMisses: count(sonarMiss, (m) => m.sonarSkip ?? "unexplained"),
    };
  }
  return {
    catches,
    counts,
    diagnostics,
    markerRows,
    messages,
    perRepo,
    predictionChecks,
    unmatched: unmatched.map((d) => ({
      file: d.file,
      line: d.line,
      repo: d.repo,
      rule: d.rule,
      run: d.run,
    })),
  };
};

// ── main ───────────────────────────────────────────────────────────────
const main = async () => {
  const resultFile = join(lib.RESULTS_DIR, "linters.json");
  const result = existsSync(resultFile) ? lib.readJson(resultFile) : {};
  result.generated = new Date().toISOString().slice(0, 10);
  result.tools = lib.toolVersions();
  result.configs = {
    biome: "Ultracite's core preset, extended by absolute path",
    "eslint raw":
      "Ultracite's core + react presets, inline config ignored (noInlineConfig); the corpus run keeps only the four focus rules",
    "eslint reported":
      "the same, with the file's own disable comments honoured",
    "oxlint default":
      "the root config `ultracite init` writes for core + react",
    "oxlint js-plugins":
      "the same with js-plugins (jsPlugins and settings re-declared on the root)",
  };
  if (lib.flag("calibration")) {
    result.calibration = await calibration();
    console.log(
      `calibration: ${result.calibration.cases.length} cases, matcher mismatches: ${result.calibration.matcherMismatches.join("; ") || "none"}`
    );
  }
  if (lib.flag("autofix")) {
    result.autofix = await autofix();
    for (const [k, v] of Object.entries(result.autofix)) {
      console.log(
        `${k}: ${v.casesWithCommentChanges.length} cases' comments changed${v.timedOut ? " (timed out)" : ""}`
      );
    }
  }
  lib.writeJson(resultFile, result);
  if (lib.flag("corpus")) {
    const names = lib.selectedRepos();
    lib.checkPinned(names);
    const c = await corpus(names);
    lib.writeJson(join(lib.OUT_DIR, "corpus-diagnostics.json"), {
      diagnostics: c.diagnostics,
      markerRows: c.markerRows,
    });
    lib.writeJson(join(lib.RESULTS_DIR, "corpus-lint.json"), {
      catches: c.catches,
      counts: c.counts,
      generated: result.generated,
      messages: c.messages,
      note: "Focus rules only. 'raw' runs ignore disable comments (Oxlint on a mirror with them neutralised, ESLint with noInlineConfig); 'reported' runs honour them. predictionChecks lists every comment where todo-lib.cjs's matchers and a real rule disagree (none expected); unmatched lists diagnostics that didn't land on a scanned comment (none expected).",
      perRepo: c.perRepo,
      predictionChecks: c.predictionChecks,
      repos: Object.fromEntries(
        lib
          .selectedRepos()
          .map((n) => [n, { set: lib.setOf(n), sha: lib.shaOf(n) }])
      ),
      tools: result.tools,
      unmatched: c.unmatched,
    });
    console.log(
      `corpus: ${c.diagnostics.length} diagnostics, ${c.unmatched.length} unmatched, ${c.predictionChecks.length} prediction mismatches`
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
