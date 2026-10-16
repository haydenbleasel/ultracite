// Runs Ultracite's accessibility rules in Oxlint, ESLint and Biome on the same code, and keeps each
// linter's exact message and help text.
//
//   --calibration  calibration/accessibility/cases.tsx (and the same cases' template-language
//                  twins in templates/) through:
//                    Oxlint core + react (the root config `ultracite init` writes), and with js-plugins
//                    ESLint core + react (core + astro for .astro, core + vue for .vue, core + svelte
//                    for .svelte, core for .html), every rule on, so evasions that trip other rules show
//                    Biome core (and core + the framework preset for .vue, .svelte, .astro, Angular .html)
//                  Every diagnostic maps to the case it falls in. Biome's JSON reporter leaves
//                  `advices` empty, so the terminal reporter's notes are captured separately, and the
//                  help text each linter's agent handoff would carry (Oxlint's help, ESLint's rule docs
//                  description, Biome's `biome explain` description; packages/cli/src/agent-fix/
//                  linters.ts) is recorded per rule.
//   --autofix      what each fix pass `ultracite fix` runs does to each case, before any diagnostic
//                  reaches an agent: oxlint --fix and --fix-dangerously, eslint --fix, and biome check
//                  --write and --write --unsafe (diffed against a Biome-formatted copy, because check
//                  also formats)
//   --corpus       the JSX files of every measured repo: ESLint and Biome in raw mode (suppression
//                  comments ignored or neutralised) and reported mode (honoured), plus Oxlint's rows
//                  from the rule census. Every line where the linters disagree on a shared concept is
//                  recorded with its code.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/a11y-linters.cjs --calibration --autofix --corpus
// Writes results/accessibility/linters.json and out/accessibility/corpus/<repo>.<tool>.<mode>.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { join, relative } = require("node:path");

const lib = require("./a11y-lib.cjs");

const { dc } = lib;
const CAL = lib.CALIBRATION_DIR;
const TEMPLATES = join(CAL, "templates");
const LINTERS_JSON = join(lib.RESULTS_DIR, "linters.json");

// ── case markers ───────────────────────────────────────────────────────
const MARKER =
  /^\s*(?:\/\/|<!--)\s*([A-Z]\d{2})(?: \(([A-Z]\d{2}), fixes: (yes|no|partly)\))?: (.+?)\s*(?:-->)?$/;
const END = /^\s*(?:\/\/|<!--)\s*END\s*(?:-->)?$/;
const parseCases = (abs) => {
  const lines = readFileSync(abs, "utf8").split("\n");
  const cases = [];
  lines.forEach((text, i) => {
    const m = MARKER.exec(text);
    if (m) {
      cases.push({
        base: m[2] ?? null,
        description: m[4],
        fixes: m[3] ?? null,
        id: m[1],
        line: i + 1,
      });
    }
    if (END.test(text)) {
      cases.push({ end: true, line: i + 1 });
    }
  });
  const real = cases.filter((c) => !c.end);
  real.forEach((c) => {
    const next = cases.find((x) => x.line > c.line);
    c.endLine = next ? next.line - 1 : lines.length;
  });
  const caseOf = (line) => {
    let found = null;
    for (const c of cases) {
      if (c.line <= line) {
        found = c.end ? null : c.id;
      }
    }
    return found;
  };
  return { caseOf, cases: real };
};

// ── help text an agent would be handed ─────────────────────────────────
// ESLint: the rule's meta.docs.description (agent-fix/linters.ts). Biome: the first paragraph of
// `biome explain` (parseBiomeExplainDescription in the same file).
let eslintRuleMeta = null;
const eslintDocs = async (cwd, files) => {
  if (!eslintRuleMeta) {
    const eslint = await dc.eslintInstance({ cwd, presets: ["core", "react"] });
    const results = await eslint.lintFiles(files);
    eslintRuleMeta = eslint.getRulesMetaForResults(results);
  }
  return eslintRuleMeta;
};
const biomeHelpCache = new Map();
const biomeHelp = (rule) => {
  if (!biomeHelpCache.has(rule)) {
    let text = "";
    try {
      text = execFileSync(
        process.execPath,
        [dc.biomeBin, "explain", rule.split("/").at(-1)],
        {
          encoding: "utf8",
        }
      );
    } catch {
      text = "";
    }
    // Same as parseBiomeExplainDescription: the Description section up to the first blank line.
    const section = text.split(/\nDescription\n/)[1] ?? "";
    const para = section
      .split(/\n\s*\n/)
      .find((p) => p.trim())
      ?.split("\n")
      .map((l) => l.trim())
      .join("\n")
      .trim();
    biomeHelpCache.set(rule, para ?? null);
  }
  return biomeHelpCache.get(rule);
};

// ── calibration ────────────────────────────────────────────────────────
const TEMPLATE_RUNS = [
  { eslint: ["core", "react"], file: "jsx-in.js" },
  { eslint: ["core", "react"], file: "jsx-in.jsx" },
  { biome: ["core"], eslint: ["core"], file: "page.html" },
  {
    biome: ["core", "vue"],
    eslint: ["core", "vue"],
    file: "Component.vue",
    oxlint: ["core", "vue"],
  },
  {
    biome: ["core", "svelte"],
    eslint: ["core", "svelte"],
    file: "Component.svelte",
  },
  { biome: ["core", "astro"], eslint: ["core", "astro"], file: "page.astro" },
  {
    biome: ["core", "angular"],
    eslint: ["core", "angular"],
    file: "app.component.html",
  },
];

const pickOx = (d, caseOf) => ({
  case: caseOf(d.line),
  help: d.help,
  label: d.label,
  line: d.line,
  message: d.message,
  rule: d.rule,
});
const pickEs = (d, caseOf, meta) => ({
  case: caseOf(d.line),
  help: meta?.[d.rule]?.docs?.description ?? null,
  line: d.line,
  message: d.message,
  rule: d.rule,
  suggestions: d.suggestions,
});

const runCalibration = async () => {
  const cwd = CAL;
  const { caseOf, cases } = parseCases(join(CAL, "cases.tsx"));
  const files = ["cases.tsx"];
  const cfg = {
    core: lib.writeOxlintRoot("core+react", ["core", "react"]),
    js: lib.writeOxlintRoot("core+react+js-plugins", [
      "core",
      "react",
      "js-plugins",
    ]),
  };
  const meta = await eslintDocs(cwd, files);
  const biomeDir = lib.biomeUltracite(["core"]);
  const notes = lib.biomeConsoleNotes({ configDir: biomeDir, cwd, files });
  const runs = {
    oxlint: lib
      .runOxlint({ configFile: cfg.core, cwd, files })
      .map((d) => pickOx(d, caseOf)),
    "oxlint +js-plugins": lib
      .runOxlint({ configFile: cfg.js, cwd, files })
      .map((d) => pickOx(d, caseOf)),
    eslint: (await lib.runEslint({ cwd, files, keep: null })).map((d) =>
      pickEs(d, caseOf, meta)
    ),
    biome: lib.runBiome({ configDir: biomeDir, cwd, files }).map((d) => ({
      case: caseOf(d.line),
      help: biomeHelp(d.rule),
      line: d.line,
      message: d.message,
      notes:
        notes.find(
          (n) => n.line === d.line && n.column === d.column && n.rule === d.rule
        )?.notes ?? [],
      rule: d.rule,
    })),
  };
  for (const [tool, rows] of Object.entries(runs)) {
    for (const r of rows) {
      r.a11y = tool.startsWith("biome")
        ? lib.isBiomeA11y(r.rule)
        : lib.isA11yRule(r.rule);
    }
  }

  // Templates: the same ten barriers in each template language.
  const templates = {};
  for (const t of TEMPLATE_RUNS) {
    const { caseOf: tc, cases: tcases } = parseCases(join(TEMPLATES, t.file));
    const tf = [t.file];
    const out = {
      cases: tcases.map((c) => ({ description: c.description, id: c.id })),
    };
    const oxCfg = t.oxlint
      ? lib.writeOxlintRoot(t.oxlint.join("+"), t.oxlint)
      : cfg.core;
    // Oxlint lints JavaScript, TypeScript and the <script> blocks of .vue, .svelte and .astro files;
    // given an .html file it prints "No files found to lint".
    let oxRows = null;
    let oxNote = null;
    try {
      oxRows = lib
        .runOxlint({ configFile: oxCfg, cwd: TEMPLATES, files: tf })
        .map((d) => ({ ...pickOx(d, tc), a11y: lib.isA11yRule(d.rule) }));
    } catch (error) {
      oxNote = String(error.message).split("\n")[0].slice(0, 200);
    }
    out.oxlint = {
      config: (t.oxlint ?? ["core", "react"]).join(" + "),
      notLinted: oxNote,
      rows: oxRows,
    };
    if (t.eslint) {
      // eslint-plugin-astro loads eslint-plugin-jsx-a11y "from the user local" (process.cwd(), at
      // import time). `ultracite init` installs it in an Astro project; here it lives in
      // packages/cli, so the preset is loaded from there, as it would be from a project root.
      const here = process.cwd();
      if (t.eslint.includes("astro")) {
        process.chdir(lib.CLI);
      }
      try {
        out.eslint = {
          config: t.eslint.join(" + "),
          rows: (
            await lib.runEslint({
              cwd: TEMPLATES,
              files: tf,
              keep: null,
              presets: t.eslint,
            })
          ).map((d) => ({
            ...pickEs(d, tc, null),
            a11y: lib.isA11yRule(d.rule),
          })),
        };
      } finally {
        process.chdir(here);
      }
    }
    const bConfigs = t.biome ? [t.biome] : [["core"]];
    if (t.biome && t.biome.length > 1) {
      bConfigs.unshift(["core"]);
    }
    out.biome = {};
    for (const presets of bConfigs) {
      const dir = lib.biomeUltracite(presets);
      out.biome[presets.join(" + ")] = lib
        .runBiome({ configDir: dir, cwd: TEMPLATES, files: tf })
        .map((d) => ({
          a11y: lib.isBiomeA11y(d.rule),
          case: tc(d.line),
          line: d.line,
          message: d.message,
          rule: d.rule,
        }));
    }
    templates[t.file] = out;
  }
  // The crash case: ESLint is run the way the CLI runs it (no per-file retry), so the error is what
  // `ultracite check` would print.
  const crash = { file: "crash.tsx" };
  try {
    const rows = await dc.runEslint({
      cwd,
      files: ["crash.tsx"],
      keep: lib.isA11yRule,
      presets: ["core", "react"],
    });
    crash.eslint = {
      rows: rows.filter((d) => lib.isA11yRule(d.rule)).map((d) => d.rule),
    };
  } catch (error) {
    crash.eslint = {
      // Paths are made relative to the repo, so no home directory is recorded.
      error: String(error.message)
        .split("\n")
        .slice(0, 3)
        .join(" | ")
        .replaceAll(`${lib.ULTRACITE}/`, "")
        .slice(0, 300),
      rule:
        error.ruleId ??
        /Rule: "([^"]+)"/.exec(String(error.message))?.[1] ??
        null,
      threw: true,
    };
  }
  crash.oxlint = lib
    .runOxlint({ configFile: cfg.core, cwd, files: ["crash.tsx"] })
    .filter((d) => lib.isA11yRule(d.rule))
    .map((d) => d.rule);
  crash.biome = lib
    .runBiome({ configDir: biomeDir, cwd, files: ["crash.tsx"] })
    .filter((d) => lib.isBiomeA11y(d.rule))
    .map((d) => d.rule);
  return { cases, crash, runs, templates };
};

// ── autofix ────────────────────────────────────────────────────────────
// Unified=0 hunks from `git diff --no-index`, mapped to the case of each old line.
const diffHunks = (a, b) => {
  let out = "";
  try {
    out = execFileSync(
      "git",
      ["diff", "--no-index", "--unified=0", "--no-color", a, b],
      {
        encoding: "utf8",
      }
    );
  } catch (error) {
    out = error.stdout ?? "";
  }
  const hunks = [];
  let cur = null;
  for (const line of out.split("\n")) {
    const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (h) {
      cur = {
        added: [],
        oldCount: h[2] === undefined ? 1 : Number(h[2]),
        oldStart: Number(h[1]),
        removed: [],
      };
      hunks.push(cur);
      continue;
    }
    if (!cur || line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("-")) {
      cur.removed.push(line.slice(1));
    } else if (line.startsWith("+")) {
      cur.added.push(line.slice(1));
    }
  }
  return hunks;
};

const runAutofix = async () => {
  // Outside out/, which both presets ignore.
  const root = join(lib.TMP_DIR, "autofix");
  rmSync(root, { force: true, recursive: true });
  const cfg = lib.writeOxlintRoot("core+react", ["core", "react"]);
  const biomeDir = lib.biomeUltracite(["core"]);
  const prepare = (name) => {
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(CAL, "cases.tsx"), join(dir, "cases.tsx"));
    return dir;
  };
  // Biome's check also formats; the baseline is the original, formatted by Biome.
  const biomeBase = prepare("biome-format-baseline");
  lib.runBiome({
    configDir: biomeDir,
    cwd: biomeBase,
    files: ["cases.tsx"],
    write: [
      "--write",
      "--formatter-enabled=true",
      "--linter-enabled=false",
      "--assist-enabled=false",
    ],
  });
  const fixers = {
    "oxlint --fix": (dir) =>
      lib.runOxlint({
        configFile: cfg,
        cwd: dir,
        files: ["cases.tsx"],
        fix: "--fix",
      }),
    "oxlint --fix-dangerously": (dir) =>
      lib.runOxlint({
        configFile: cfg,
        cwd: dir,
        files: ["cases.tsx"],
        fix: "--fix-dangerously",
      }),
    "eslint --fix": (dir) => lib.eslintFix({ cwd: dir, files: ["cases.tsx"] }),
    "biome check --write": (dir) =>
      lib.runBiome({
        configDir: biomeDir,
        cwd: dir,
        files: ["cases.tsx"],
        timeout: 30_000,
        write: ["--write"],
      }),
    "biome check --write --unsafe": (dir) =>
      lib.runBiome({
        configDir: biomeDir,
        cwd: dir,
        files: ["cases.tsx"],
        timeout: 30_000,
        write: ["--write", "--unsafe"],
      }),
  };
  const out = {};
  for (const [name, run] of Object.entries(fixers)) {
    const dir = prepare(name.replaceAll(/[^a-z]+/g, "-"));
    const status = await run(dir);
    const entry = { hung: Boolean(status?.timedOut) };
    if (entry.hung) {
      // Rerun without the case that loops, so the other cases can be measured.
      const loopCase = "R14";
      const text = readFileSync(join(CAL, "cases.tsx"), "utf8").split("\n");
      const { cases } = parseCases(join(CAL, "cases.tsx"));
      const c = cases.find((x) => x.id === loopCase);
      for (let i = c.line; i < c.endLine; i++) {
        text[i] = text[i].trim()
          ? `// (removed: loops under this fixer) ${text[i].trim()}`
          : text[i];
      }
      writeFileSync(join(dir, "cases.tsx"), text.join("\n"));
      entry.hungOn = loopCase;
      const again = await run(dir);
      entry.rerunHung = Boolean(again?.timedOut);
    }
    const base = name.startsWith("biome")
      ? join(biomeBase, "cases.tsx")
      : join(CAL, "cases.tsx");
    // The baseline keeps every marker comment, so its own lines map to cases.
    const { caseOf: baseCaseOf } = parseCases(base);
    const hunks = diffHunks(base, join(dir, "cases.tsx"));
    const byCase = {};
    for (const h of hunks) {
      const id = baseCaseOf(Math.max(h.oldStart, 1)) ?? "(file header)";
      if (entry.hung && id === entry.hungOn) {
        continue;
      }
      byCase[id] ??= { added: [], removed: [] };
      byCase[id].removed.push(
        ...h.removed.map((s) => s.trim()).filter(Boolean)
      );
      byCase[id].added.push(...h.added.map((s) => s.trim()).filter(Boolean));
    }
    out[name] = {
      ...entry,
      cases: byCase,
      changedCases: Object.keys(byCase).length,
    };
  }
  // The loop on its own: one line, both rules on (Ultracite's core).
  const loopDir = prepare("biome-loop-minimal");
  copyFileSync(join(CAL, "biome-fix-loop.tsx"), join(loopDir, "cases.tsx"));
  const loopRuns = {};
  for (const [label, extra] of [
    ["core, check --write --unsafe", ["--write", "--unsafe"]],
    ["core, check --write", ["--write"]],
    [
      "only useAriaActivedescendantWithTabindex, --unsafe",
      [
        "--write",
        "--unsafe",
        "--only=a11y/useAriaActivedescendantWithTabindex",
      ],
    ],
    [
      "only noNoninteractiveTabindex, --unsafe",
      ["--write", "--unsafe", "--only=a11y/noNoninteractiveTabindex"],
    ],
  ]) {
    copyFileSync(join(CAL, "biome-fix-loop.tsx"), join(loopDir, "cases.tsx"));
    const r = lib.runBiome({
      configDir: biomeDir,
      cwd: loopDir,
      files: ["cases.tsx"],
      timeout: 20_000,
      write: extra,
    });
    loopRuns[label] = {
      after: readFileSync(join(loopDir, "cases.tsx"), "utf8").trim(),
      timedOutAfter20s: r.timedOut,
    };
  }
  out.biomeLoop = {
    input: readFileSync(join(CAL, "biome-fix-loop.tsx"), "utf8").trim(),
    runs: loopRuns,
  };
  // Biome's unsafe fix for noDistractingElements deletes the opening <marquee> and keeps the closing
  // tag. Re-parse the result to show it no longer parses.
  const mq = prepare("biome-marquee");
  copyFileSync(join(CAL, "biome-marquee-fix.tsx"), join(mq, "cases.tsx"));
  lib.runBiome({
    configDir: biomeDir,
    cwd: mq,
    files: ["cases.tsx"],
    timeout: 20_000,
    write: ["--write", "--unsafe"],
  });
  const after = readFileSync(join(mq, "cases.tsx"), "utf8");
  const sf = lib.ts.createSourceFile(
    "m.tsx",
    after,
    lib.ts.ScriptTarget.Latest,
    true,
    lib.ts.ScriptKind.TSX
  );
  out.biomeMarquee = {
    after: after.split("\n").find((l) => l.includes("O08")),
    parseErrors: sf.parseDiagnostics.map((d) =>
      lib.ts.flattenDiagnosticMessageText(d.messageText, " ")
    ),
  };
  return out;
};

// ── corpus ─────────────────────────────────────────────────────────────
const corpusOut = (repo, tool, mode) =>
  join(lib.OUT_DIR, "corpus", `${repo}.${tool}.${mode}.json`);
const censusHits = (repo, mode) => {
  const f = join(
    lib.HERE,
    "out/rule-census",
    lib.TOPIC,
    `${repo}.${mode}.json`
  );
  if (!existsSync(f)) {
    throw new Error(`Missing ${f}: run a11y-census.cjs first.`);
  }
  return JSON.parse(readFileSync(f, "utf8")).hits;
};

const lineText = (root, file, line) =>
  readFileSync(join(root, file), "utf8")
    .split("\n")
    [line - 1]?.trim()
    .slice(0, 200) ?? "";

const runCorpus = async () => {
  const biomeDir = lib.biomeA11yOnly();
  const summary = {};
  const mismatches = {};
  for (const name of lib.selectedRepos()) {
    const { files, repo } = lib.jsxFiles(name);
    const started = Date.now();
    const rawMirror = join(
      lib.HERE,
      "out/rule-census",
      lib.TOPIC,
      "mirror",
      name
    );
    const biomeMirror = lib.writeMirror(
      name,
      files,
      join(lib.OUT_DIR, "mirror", name)
    );
    const crashes = [];
    const rows = {
      "biome.raw": lib.runBiome({
        configDir: biomeDir,
        cwd: biomeMirror,
        files,
        keep: lib.isBiomeA11y,
      }),
      "biome.reported": lib.runBiome({
        configDir: biomeDir,
        cwd: repo.root,
        files,
        keep: lib.isBiomeA11y,
      }),
      "eslint.raw": (
        await lib.runEslint({ crashes, cwd: rawMirror, files })
      ).filter((d) => lib.isA11yRule(d.rule) || d.rule.startsWith("parse")),
      "eslint.reported": (
        await lib.runEslint({ cwd: repo.root, files, inline: true })
      ).filter((d) => lib.isA11yRule(d.rule) || d.rule.startsWith("parse")),
      "oxlint.raw": censusHits(name, "raw"),
      "oxlint.reported": censusHits(name, "reported"),
    };
    mkdirSync(join(lib.OUT_DIR, "corpus"), { recursive: true });
    for (const [key, list] of Object.entries(rows)) {
      const [tool, mode] = key.split(".");
      writeFileSync(corpusOut(name, tool, mode), JSON.stringify(list));
    }
    const count = (list) => {
      const m = {};
      for (const d of list) {
        m[d.rule] = (m[d.rule] ?? 0) + 1;
      }
      return m;
    };
    summary[name] = {
      eslintCrashes: crashes,
      files: files.length,
      parseErrors: {
        biome: rows["biome.raw"].filter((d) => /^parse/.test(d.rule)).length,
        eslint: rows["eslint.raw"].filter((d) => d.rule.startsWith("parse"))
          .length,
      },
      rules: Object.fromEntries(
        Object.entries(rows).map(([k, v]) => [k, count(v)])
      ),
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    // Line-level comparison per shared concept (raw mode).
    const byConcept = {};
    const add = (tool, d, concept) => {
      if (!concept) {
        return;
      }
      byConcept[concept] ??= {
        biome: new Set(),
        eslint: new Set(),
        oxlint: new Set(),
      };
      byConcept[concept][tool].add(`${d.file}:${d.line}`);
    };
    for (const d of rows["oxlint.raw"]) {
      add("oxlint", d, lib.conceptOfJsx.get(dc.toOxlintName(d.rule)));
    }
    for (const d of rows["eslint.raw"]) {
      add("eslint", d, lib.conceptOfJsx.get(dc.toOxlintName(d.rule)));
    }
    for (const d of rows["biome.raw"]) {
      add("biome", d, lib.conceptOfBiome.get(d.rule));
    }
    mismatches[name] = {};
    for (const [concept, sets] of Object.entries(byConcept)) {
      const all = new Set([...sets.oxlint, ...sets.eslint, ...sets.biome]);
      const rowsOut = [];
      let agree = 0;
      for (const key of [...all].sort()) {
        const who = ["oxlint", "eslint", "biome"].filter((t) =>
          sets[t].has(key)
        );
        if (who.length === 3) {
          agree++;
          continue;
        }
        const [file, line] = [
          key.slice(0, key.lastIndexOf(":")),
          Number(key.slice(key.lastIndexOf(":") + 1)),
        ];
        rowsOut.push({
          code: lineText(repo.root, file, line),
          file,
          line,
          who,
        });
      }
      mismatches[name][concept] = {
        allThree: agree,
        biome: sets.biome.size,
        eslint: sets.eslint.size,
        lines: rowsOut,
        oxlint: sets.oxlint.size,
      };
    }
    console.log(
      `${name}: ${files.length} files, oxlint ${rows["oxlint.raw"].length}, eslint ${rows["eslint.raw"].length}, biome ${rows["biome.raw"].length} (raw) in ${summary[name].seconds}s`
    );
  }
  return { mismatches, summary };
};

const main = async () => {
  lib.checkPinned();
  const result = lib.readJson(LINTERS_JSON, {});
  result.generated = new Date().toISOString().slice(0, 10);
  result.tools = lib.toolVersions();
  if (lib.flag("calibration")) {
    result.calibration = await runCalibration();
    const n = Object.values(result.calibration.runs).map((r) => r.length);
    console.log(
      `calibration: ${result.calibration.cases.length} cases, diagnostics ${n.join("/")}`
    );
  }
  if (lib.flag("autofix")) {
    result.autofix = await runAutofix();
    console.log(
      `autofix: ${Object.entries(result.autofix)
        .filter(([k]) => !["biomeLoop", "biomeMarquee"].includes(k))
        .map(
          ([k, v]) =>
            `${k} ${v.changedCases}${v.hung ? " (hung on the full file)" : ""}`
        )
        .join(", ")}`
    );
  }
  if (lib.flag("corpus")) {
    result.corpus = await runCorpus();
  }
  lib.writeJson(LINTERS_JSON, result);
  console.log(`wrote ${relative(process.cwd(), LINTERS_JSON)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
