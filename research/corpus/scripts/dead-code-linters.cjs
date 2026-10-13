// Runs Ultracite's dead-code and duplication rules in Oxlint, ESLint, Biome and the TypeScript
// compiler on the same code, and keeps each linter's exact message and help text.
//
//   --calibration  the hand-written cases in calibration/dead-code/ through six configurations:
//                  Oxlint core + react (the root config `ultracite init` writes), the same plus
//                  js-plugins (sonarjs), ESLint core (untyped), ESLint core + type-aware (project
//                  service, the cases' tsconfig), Biome with Ultracite's core preset, and `tsc` with
//                  noUnusedLocals, noUnusedParameters, allowUnreachableCode: false and
//                  allowUnusedLabels: false. Every diagnostic maps to the case it falls in.
//                  Biome's JSON reporter (what Ultracite's agent handoff reads) leaves `advices`
//                  empty, so the terminal reporter's notes are captured separately.
//   --corpus       the raw mirror written by rule-census.cjs (disable directives neutralised):
//                  ESLint with Ultracite's core + react presets filtered to the dead-code and
//                  duplication rules, and Biome with the dead-code rules Ultracite turns on. Oxlint's
//                  rows come from the census itself. Every line where the linters disagree on the
//                  shared concepts is recorded with its code.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/dead-code-linters.cjs --calibration --autofix --corpus
//
//   --autofix      what each linter's own fix pass (as `ultracite fix` runs it, and with --unsafe)
//                  changes in each calibration case, before any diagnostic reaches an agent
// Writes results/dead-code/linters.json and out/dead-code/corpus/<repo>.<tool>.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { extname, join, relative } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const config = require("./repos.json");

// ── which rules are dead-code rules, per linter ────────────────────────
const isDeadOx = (rule) => Boolean(lib.categoryOf(lib.toOxlintName(rule)));
const isDeadBiome = (rule) => Boolean(lib.biomeCategoryOf(rule));
const isDeadTs = (rule) => Number(rule.slice(2)) in lib.TS_UNUSED_CODES;
const categoryFor = (tool, rule) => {
  if (tool.startsWith("biome")) {
    return lib.biomeCategoryOf(rule);
  }
  if (tool === "tsc") {
    return isDeadTs(rule) ? "unused-names" : null;
  }
  return lib.categoryOf(lib.toOxlintName(rule));
};

// ── calibration ────────────────────────────────────────────────────────
const CASE_START = /^\s*\/\/ ([A-Z]\d{2}): (.+)$/;
const CASE_FILES = [
  "cases.ts",
  "imports.ts",
  "duplication.ts",
  "strings.ts",
  "strings.test.ts",
];

const calibrationCases = () => {
  const cases = [];
  const starts = {};
  for (const file of CASE_FILES) {
    const lines = readFileSync(join(lib.CALIBRATION_DIR, file), "utf8").split(
      "\n"
    );
    starts[file] = [];
    lines.forEach((text, i) => {
      const m = CASE_START.exec(text);
      if (m) {
        cases.push({ description: m[2], file, id: m[1], line: i + 1 });
        starts[file].push({ id: m[1], line: i + 1 });
      }
      if (/^\/\/ END$/.test(text)) {
        starts[file].push({ id: null, line: i + 1 });
      }
    });
  }
  const caseOf = (file, line) => {
    let found = null;
    for (const s of starts[file] ?? []) {
      if (s.line <= line) {
        found = s.id;
      }
    }
    return found;
  };
  return { caseOf, cases };
};

// Message templates: quoted names and Biome's bare names replaced by {name}, numbers by {n}.
const template = (text) =>
  text
    ?.replaceAll(/'(?!_')[^']*'|"[^"]*"|`[^`]*`/g, "{name}")
    .replaceAll(
      /\b(This (?:variable|parameter|function|class|type alias|type parameter|interface|enum|private (?:member|field|property|method)|label|namespace)) \S+/g,
      "$1 {name}"
    )
    .replaceAll(/prepend \S+ with/g, "prepend {name} with")
    .replaceAll(/\b\d+\b/g, "{n}") ?? null;

const calibration = async () => {
  const { caseOf, cases } = calibrationCases();
  const cwd = lib.CALIBRATION_DIR;
  const files = readdirSync(cwd)
    .filter((f) => f.endsWith(".ts"))
    .sort();
  const raw = {
    oxlint: lib.runOxlint({ cwd, files, presets: ["core", "react"] }),
    "oxlint +js-plugins": lib.runOxlint({
      cwd,
      files,
      presets: ["core", "react", "js-plugins"],
    }),
    eslint: await lib.runEslint({ cwd, files, presets: ["core"] }),
    "eslint +type-aware": await lib.runEslint({
      cwd,
      files,
      presets: ["core"],
      typed: true,
    }),
    biome: lib.runBiome({ cwd, files, mode: "ultracite", presets: ["core"] }),
    tsc: lib.runTsc({ dir: cwd, files }),
  };
  const advices = lib.biomeConsoleAdvices({
    cwd,
    files,
    mode: "ultracite",
    presets: ["core"],
  });
  for (const d of raw.biome) {
    d.consoleNotes =
      advices.find(
        (a) =>
          a.file === d.file &&
          a.line === d.line &&
          a.column === d.column &&
          a.rule === d.rule
      )?.notes ?? null;
  }

  const byCase = Object.fromEntries(
    cases.map((c) => [c.id, { ...c, hits: {}, other: {} }])
  );
  const stray = [];
  const messages = {};
  for (const [tool, diags] of Object.entries(raw)) {
    for (const d of diags) {
      const category = categoryFor(tool, d.rule);
      const id = caseOf(d.file, d.line);
      const entry = {
        category,
        column: d.column,
        line: d.line,
        message: d.message,
        rule: d.rule,
        ...(d.help ? { help: d.help } : {}),
        ...(d.suggestions?.length ? { suggestions: d.suggestions } : {}),
        ...(d.consoleNotes ? { consoleNotes: d.consoleNotes } : {}),
      };
      if (category) {
        const key = `${tool}|${d.rule}`;
        messages[key] ??= {
          help: new Set(),
          messages: new Set(),
          notes: new Set(),
          rule: d.rule,
          suggestions: new Set(),
          tool,
        };
        messages[key].messages.add(template(d.message));
        if (d.help) {
          messages[key].help.add(template(d.help));
        }
        for (const s of d.suggestions ?? []) {
          messages[key].suggestions.add(template(s));
        }
        for (const n of d.consoleNotes ?? []) {
          messages[key].notes.add(template(n));
        }
      }
      if (!id) {
        if (category) {
          stray.push({ tool, file: d.file, ...entry });
        }
        continue;
      }
      const bucket = category ? "hits" : "other";
      byCase[id][bucket][tool] ??= [];
      byCase[id][bucket][tool].push(entry);
    }
  }
  const table = Object.values(byCase);
  for (const row of table) {
    for (const bucket of ["hits", "other"]) {
      for (const list of Object.values(row[bucket])) {
        list.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
      }
    }
    const cell = (t) =>
      [...new Set((row.hits[t] ?? []).map((h) => h.rule))].join(", ") || "-";
    console.log(
      `${row.id} ${row.description.slice(0, 50).padEnd(50)} | ox: ${cell("oxlint")} | +js: ${cell("oxlint +js-plugins")} | es: ${cell("eslint")} | es-ta: ${cell("eslint +type-aware")} | bi: ${cell("biome")} | tsc: ${cell("tsc")}`
    );
  }
  if (stray.length > 0) {
    console.log("dead-code diagnostics outside any case:", stray);
  }
  const messageMap = Object.values(messages)
    .map((m) => ({
      help: [...m.help].sort(),
      messages: [...m.messages].sort(),
      notes: [...m.notes].sort(),
      rule: m.rule,
      suggestions: [...m.suggestions].sort(),
      tool: m.tool,
    }))
    .sort(
      (a, b) => a.tool.localeCompare(b.tool) || a.rule.localeCompare(b.rule)
    );
  const parseErrors = Object.fromEntries(
    Object.entries(raw).map(([tool, diags]) => [
      tool,
      diags
        .filter((d) => d.rule.startsWith("parse"))
        .map((d) => `${d.file}:${d.line} ${d.message}`),
    ])
  );
  return { cases: table, messageMap, parseErrors, stray };
};

// ── autofix ────────────────────────────────────────────────────────────
// What each linter's own fix pass does to each calibration case, the way `ultracite fix` runs it
// before any diagnostics reach an agent: `oxlint --fix` (and `--fix-dangerously`, which
// `ultracite fix --unsafe` passes), `eslint --fix`, and `biome check --write` (and `--unsafe`).
// Each tool works on its own copy of the case files; a case is "changed" when any line between its
// header and the next one differs.
const autofix = async () => {
  const { execFileSync } = require("node:child_process");
  const { cpSync, mkdtempSync, rmSync } = require("node:fs");
  const { tmpdir } = require("node:os");
  const files = ["cases.ts", "imports.ts", "duplication.ts"];
  const helpers = readdirSync(lib.CALIBRATION_DIR).filter(
    (f) => f.endsWith(".ts") || f === "tsconfig.json"
  );
  const work = mkdtempSync(join(tmpdir(), "dead-code-autofix-"));
  const copy = (name) => {
    const dir = join(work, name);
    mkdirSync(dir, { recursive: true });
    for (const f of helpers) {
      cpSync(join(lib.CALIBRATION_DIR, f), join(dir, f));
    }
    return dir;
  };
  const run = (cmd, argv, cwd) => {
    try {
      execFileSync(cmd, argv, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      // linters exit non-zero when diagnostics remain
    }
  };
  const oxCfg = lib.writeOxlintConfig(["core", "react"]);
  const biomeCfg = lib.biomeConfigFor("ultracite", ["core"]);
  const tools = {
    "oxlint --fix": (dir) =>
      run(
        process.execPath,
        [
          lib.oxlintBin,
          "-c",
          oxCfg,
          "--disable-nested-config",
          "--fix",
          ...files,
        ],
        dir
      ),
    "oxlint --fix-dangerously": (dir) =>
      run(
        process.execPath,
        [
          lib.oxlintBin,
          "-c",
          oxCfg,
          "--disable-nested-config",
          "--fix-dangerously",
          ...files,
        ],
        dir
      ),
    "eslint --fix": async (dir) => {
      const { ESLint } = require(
        require.resolve("eslint", { paths: [lib.CLI] })
      );
      const eslint = new ESLint({
        cwd: dir,
        fix: true,
        ignore: false,
        overrideConfig: await lib.eslintBlocks({ presets: ["core"] }),
        overrideConfigFile: true,
      });
      await ESLint.outputFixes(await eslint.lintFiles(files));
    },
    "biome check --write": (dir) =>
      run(
        process.execPath,
        [
          lib.biomeBin,
          "check",
          "--write",
          `--config-path=${biomeCfg}`,
          "--formatter-enabled=false",
          "--assist-enabled=false",
          ...files,
        ],
        dir
      ),
    "biome check --write --unsafe": (dir) =>
      run(
        process.execPath,
        [
          lib.biomeBin,
          "check",
          "--write",
          "--unsafe",
          `--config-path=${biomeCfg}`,
          "--formatter-enabled=false",
          "--assist-enabled=false",
          ...files,
        ],
        dir
      ),
  };
  const caseText = (text) => {
    const out = {};
    let id = null;
    for (const line of text.split("\n")) {
      const m = CASE_START.exec(line);
      if (m) {
        id = m[1];
        out[id] = [];
        continue;
      }
      if (/^\/\/ END$/.test(line)) {
        id = null;
      }
      if (id) {
        out[id].push(line);
      }
    }
    return out;
  };
  const result = {};
  for (const [tool, fn] of Object.entries(tools)) {
    const dir = copy(tool.replaceAll(/[^a-z]+/g, "-"));
    await fn(dir);
    for (const f of files) {
      const before = caseText(
        readFileSync(join(lib.CALIBRATION_DIR, f), "utf8")
      );
      const after = caseText(readFileSync(join(dir, f), "utf8"));
      for (const [id, lines] of Object.entries(before)) {
        const a = after[id] ?? [];
        const norm = (x) =>
          x
            .map((l) => l.trim())
            .filter(Boolean)
            .join("\n");
        if (norm(lines) !== norm(a)) {
          const removed = lines.filter((l) => l.trim() && !a.includes(l));
          const added = a.filter((l) => l.trim() && !lines.includes(l));
          result[id] ??= {};
          result[id][tool] = {
            added: added.map((l) => l.trim()),
            removed: removed.map((l) => l.trim()),
          };
        }
      }
    }
  }
  rmSync(work, { force: true, recursive: true });
  for (const [id, r] of Object.entries(result).sort()) {
    console.log(
      id,
      Object.entries(r)
        .map(
          ([t, d]) =>
            `${t}: -${JSON.stringify(d.removed)} +${JSON.stringify(d.added)}`
        )
        .join(" | ")
    );
  }
  return result;
};

// ── corpus ─────────────────────────────────────────────────────────────
const walk = (dir, root = dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      walk(abs, root, out);
    } else if (/\.[cm]?[jt]sx?$/.test(extname(e.name))) {
      out.push(relative(root, abs));
    }
  }
  return out;
};

const tally = (diags) => {
  const counts = {};
  for (const d of diags) {
    counts[d.rule] = (counts[d.rule] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
  );
};

// The Biome rules Ultracite turns on in these categories (inventory), grouped for a config.
const biomeRulesOn = () => {
  const inv = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "inventory.json"), "utf8")
  );
  const groups = {};
  for (const r of inv.biome) {
    if (!r.on) {
      continue;
    }
    const [group, name] = r.rule.split("/");
    (groups[group] ??= []).push(name);
  }
  return groups;
};

// The name a diagnostic is about, for matching across linters.
const nameOf = (message) => {
  if (!message) {
    return null;
  }
  const quoted = /'([^']+)'/.exec(message) ?? /"([^"]+)"/.exec(message);
  if (quoted) {
    return quoted[1];
  }
  const biome =
    /^This (?:variable|parameter|function|class|type alias|type parameter|interface|enum|private (?:member|field|property|method)|label|namespace|import) (\S+) is unused/.exec(
      message
    );
  return biome ? biome[1] : null;
};

// Concepts compared line by line: which rules stand for the concept in each linter.
const COMPARE = {
  "unused names": {
    biome: [
      "correctness/noUnusedVariables",
      "correctness/noUnusedImports",
      "correctness/noUnusedFunctionParameters",
    ],
    eslint: ["@typescript-eslint/no-unused-vars", "no-unused-vars"],
    oxlint: ["no-unused-vars"],
  },
  "unused private members": {
    biome: ["correctness/noUnusedPrivateClassMembers"],
    eslint: [
      "@typescript-eslint/no-unused-private-class-members",
      "no-unused-private-class-members",
    ],
    oxlint: ["no-unused-private-class-members"],
  },
  "unused expressions": {
    biome: ["suspicious/noUnusedExpressions"],
    eslint: [
      "@typescript-eslint/no-unused-expressions",
      "no-unused-expressions",
    ],
    oxlint: ["no-unused-expressions"],
  },
  unreachable: {
    biome: ["correctness/noUnreachable"],
    eslint: ["no-unreachable"],
    oxlint: ["no-unreachable"],
  },
  "dead stores": {
    eslint: ["sonarjs/no-dead-store"],
    oxlint: ["sonarjs/no-dead-store"],
  },
  "useless assignment (ESLint) vs dead store (sonarjs)": {
    eslint: ["no-useless-assignment"],
    oxlint: ["sonarjs/no-dead-store"],
  },
  "identical functions": {
    eslint: ["sonarjs/no-identical-functions"],
    oxlint: ["sonarjs/no-identical-functions"],
  },
  "duplicated branches": {
    eslint: [
      "sonarjs/no-duplicated-branches",
      "sonarjs/no-all-duplicated-branches",
    ],
    oxlint: [
      "sonarjs/no-duplicated-branches",
      "sonarjs/no-all-duplicated-branches",
    ],
  },
  "duplicate imports": {
    eslint: ["no-duplicate-imports", "import-x/no-duplicates"],
    oxlint: ["no-duplicate-imports", "import/no-duplicates"],
  },
  "duplicate strings": {
    eslint: ["sonarjs/no-duplicate-string"],
    oxlint: ["sonarjs/no-duplicate-string"],
  },
};

const corpus = async () => {
  const mirrorRoot = join(lib.HERE, "out", "rule-census", lib.TOPIC, "mirror");
  if (!existsSync(mirrorRoot)) {
    throw new Error(
      `Run dead-code-census.cjs first (no mirror at ${mirrorRoot}).`
    );
  }
  const outDir = join(lib.OUT_DIR, "corpus");
  mkdirSync(outDir, { recursive: true });
  const biomeGroups = biomeRulesOn();
  const perRepo = {};
  const comparisons = {};
  for (const { name } of config.repos) {
    const root = join(mirrorRoot, name);
    if (!existsSync(root)) {
      continue;
    }
    const files = walk(root).sort();
    const started = Date.now();
    const keep = (rule) => isDeadOx(rule);
    const eslint = await lib.runEslint({
      cwd: root,
      files,
      keep,
      presets: ["core", "react"],
    });
    const biome = lib.runBiome({ cwd: root, files, mode: biomeGroups });
    const oxlint = JSON.parse(
      readFileSync(
        join(lib.HERE, "out", "rule-census", lib.TOPIC, `${name}.raw.json`),
        "utf8"
      )
    ).hits;
    for (const [tool, rows] of Object.entries({ biome, eslint })) {
      writeFileSync(
        join(outDir, `${name}.${tool}.json`),
        JSON.stringify({ hits: rows, repo: name, tool }, null, 1)
      );
    }
    const parse = eslint.filter((d) => d.rule.startsWith("parse"));
    const biomeParse = biome.filter((d) => /^parse/.test(d.rule));
    perRepo[name] = {
      biome: tally(biome.filter((d) => !/^parse/.test(d.rule))),
      biomeParseErrors: biomeParse.length,
      eslint: tally(
        eslint.filter(
          (d) =>
            !d.rule.startsWith("parse") && d.rule !== "inline-config-ignored"
        )
      ),
      eslintParseErrors: parse.map((d) => `${d.file}:${d.line} ${d.message}`),
      files: files.length,
      oxlint: tally(oxlint),
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    console.log(name, JSON.stringify(perRepo[name]).slice(0, 400));
    // Line-by-line comparison per concept, over the external repos only.
    if (lib.DOGFOOD.has(name)) {
      continue;
    }
    const texts = new Map();
    const lineText = (file, line) => {
      if (!texts.has(file)) {
        texts.set(file, readFileSync(join(root, file), "utf8").split("\n"));
      }
      return texts.get(file)[line - 1]?.trim().slice(0, 160) ?? "";
    };
    for (const [concept, rules] of Object.entries(COMPARE)) {
      const sets = {};
      for (const [tool, rows] of Object.entries({ biome, eslint, oxlint })) {
        if (!rules[tool]) {
          continue;
        }
        const map = new Map();
        for (const d of rows) {
          if (!rules[tool].includes(d.rule)) {
            continue;
          }
          const key = `${d.file}:${d.line}`;
          const entry = map.get(key) ?? {
            file: d.file,
            line: d.line,
            messages: [],
            names: [],
          };
          entry.messages.push(d.message);
          const n = nameOf(d.message);
          if (n) {
            entry.names.push(n);
          }
          map.set(key, entry);
        }
        sets[tool] = map;
      }
      const tools = Object.keys(sets);
      const keys = new Set(tools.flatMap((t) => [...sets[t].keys()]));
      const c = (comparisons[concept] ??= {
        lines: {},
        mismatches: [],
        perTool: {},
        tools,
      });
      for (const t of tools) {
        c.perTool[t] = (c.perTool[t] ?? 0) + sets[t].size;
      }
      for (const key of keys) {
        const present = tools.filter((t) => sets[t].has(key));
        const sig = present.join("+");
        c.lines[sig] = (c.lines[sig] ?? 0) + 1;
        if (present.length !== tools.length) {
          const any = sets[present[0]].get(key);
          c.mismatches.push({
            code: lineText(any.file, any.line),
            names: Object.fromEntries(
              present.map((t) => [t, [...sets[t].get(key).names].sort()])
            ),
            file: any.file,
            line: any.line,
            messages: Object.fromEntries(
              present.map((t) => [t, [...sets[t].get(key).messages].sort()])
            ),
            present,
            repo: name,
          });
        }
      }
    }
  }
  for (const c of Object.values(comparisons)) {
    c.mismatches.sort(
      (a, b) =>
        a.repo.localeCompare(b.repo) ||
        a.file.localeCompare(b.file) ||
        a.line - b.line
    );
  }
  return { comparisons, perRepo };
};

const main = async () => {
  mkdirSync(lib.OUT_DIR, { recursive: true });
  const path = join(lib.RESULTS_DIR, "linters.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : {};
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    tools: lib.toolVersions(),
  };
  if (lib.flag("calibration")) {
    result.calibration = await calibration();
  }
  if (lib.flag("autofix")) {
    result.autofix = await autofix();
  }
  if (lib.flag("corpus")) {
    result.corpus = await corpus();
  }
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  // Module-resolution messages carry absolute paths; keep the machine's out of the results.
  const repoRoot = `${join(lib.HERE, "..", "..")}/`;
  writeFileSync(
    path,
    `${JSON.stringify({ ...previous, ...result }, null, 2).replaceAll(repoRoot, "<repo>/")}\n`
  );
};

module.exports = { nameOf, template };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
