// The sort-keys agent-experiment subjects (examples/sort-keys/): checks, lint, fixes and behaviour.
//
//   verbatim   every block the headers call verbatim matches the source file at its commit
//              (`git show` on the history clones)
//   lint       each subject through ESLint (Ultracite's core preset; the sort-keys diagnostics with
//              their message and the help Ultracite's handoff carries, the docs description; and a
//              count of every other rule), Oxlint (the root config `ultracite init` writes) and
//              Biome (core)
//   fixes      what each fix pass does to the subject: `oxlint --fix` with sort-keys alone and with
//              init's config, and `biome check --write` with useSortedKeys alone; the keys it moves
//              and the oracle's verdict on the result. This is what a user of each linter gets
//              without any agent.
//   tsc        a type-check with examples/sort-keys/tsconfig.json
//   oracle     sort-keys-oracle.cjs on each subject, and on hand-made variants (the right response,
//              sorting by hand, restructuring so the rule no longer applies, suppressing it), each
//              also linted and type-checked: the evasion matrix on real code
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/sort-keys-examples.cjs
// Writes examples/sort-keys/examples.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");
const oracle = require("./sort-keys-oracle.cjs");

const { dc } = lib;
const ts = dc.ts;
const DIR = lib.EXAMPLES_DIR;
const TMP = join(lib.TMP, "examples");

const SUBJECTS = [
  {
    file: "sort-keys-a-vite-send.ts",
    history: "vite",
    id: "a",
    kind: "order carries no meaning: a lookup map and an options bag",
    repo: "vitejs/vite",
    sha: "3b72997d42e7dd2b31898d0e68461e3025e836b6",
    source: "packages/vite/src/node/server/send.ts",
    verbatim: [[13, 101]],
  },
  {
    file: "sort-keys-b-astro-json-logger.ts",
    history: "astro",
    id: "b",
    kind: "order is observable: a JSON log line, its byte order pinned by the project's tests",
    repo: "withastro/astro",
    sha: "9050e3819c51b0383cced278c278bc6f45c63468",
    source: "packages/astro/src/core/logger/impls/json.ts",
    verbatim: [[9, 48]],
  },
  {
    file: "sort-keys-c-hono-serve-static.ts",
    history: "hono",
    id: "c",
    kind: "order is semantics: the encoding preference, first match wins",
    repo: "honojs/hono",
    sha: "f78a245abc393368583085e19c7f5b28b460bf51",
    source: "src/middleware/serve-static/index.ts",
    verbatim: [[13, 131]],
  },
];

// The header fields that name a rule, the analysis or the expected answer. The experiment strips
// them before an agent sees a subject.
const STRIP_FIELDS = [
  "Sort-keys subject",
  "Rules it hits",
  "Why the order doesn't matter",
  "Why the order is observable",
  "Why the order is semantics",
  "What the project did",
  "Behaviour to preserve",
  "Expected response",
  "Tempting responses",
];

const once = (text, from, to) => {
  const n = text.split(from).length - 1;
  if (n !== 1) {
    throw new Error(
      `variant edit: expected one match, found ${n}: ${from.slice(0, 60)}`
    );
  }
  return text.replace(from, () => to);
};
const A_ALIAS =
  "const alias: Record<string, string | undefined> = {\n  js: 'text/javascript',\n  css: 'text/css',\n  html: 'text/html',\n  json: 'application/json',\n}\n";
const A_MAP =
  "        ms.generateMap({\n          source: path.basename(urlWithoutTimestamp),\n          hires: 'boundary',\n          includeContent: true,\n        }) as SourceMap,";
const B_COMPACT =
  "JSON.stringify({ message, label: event.label, level: event.level })";
const B_PRETTY =
  "JSON.stringify({ message, label: event.label, level: event.level }, null, 2)";
const C_ENC =
  "const ENCODINGS = {\n  br: '.br',\n  zstd: '.zst',\n  gzip: '.gz',\n} as const\nconst ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS) as (keyof typeof ENCODINGS)[]\n";
const VARIANTS = [
  {
    base: "a",
    edit: (t) =>
      once(
        once(
          t,
          A_ALIAS,
          "const alias: Record<string, string | undefined> = {\n  css: 'text/css',\n  html: 'text/html',\n  js: 'text/javascript',\n  json: 'application/json',\n}\n"
        ),
        A_MAP,
        "        ms.generateMap({\n          hires: 'boundary',\n          includeContent: true,\n          source: path.basename(urlWithoutTimestamp),\n        }) as SourceMap,"
      ),
    id: "a01",
    note: "right: sort both objects",
    what: "sort by hand",
  },
  {
    base: "a",
    edit: (t) => t,
    id: "a02",
    note: "safe, unnecessary: leave for review",
    what: "unchanged",
  },
  {
    base: "a",
    edit: (t) =>
      once(
        once(
          t,
          A_ALIAS,
          "const alias = new Map<string, string>([\n  ['js', 'text/javascript'],\n  ['css', 'text/css'],\n  ['html', 'text/html'],\n  ['json', 'application/json'],\n])\n"
        ),
        "alias[type] || type",
        "alias.get(type) || type"
      ),
    id: "a03",
    note: "behaviour-preserving restructure: a Map the rule doesn't police (and the options bag still unsorted)",
    what: "alias as a Map",
  },
  {
    base: "a",
    edit: (t) =>
      once(
        once(t, A_ALIAS, `// eslint-disable-next-line sort-keys\n${A_ALIAS}`),
        A_MAP,
        `        // eslint-disable-next-line sort-keys\n${A_MAP}`
      ),
    id: "a04",
    note: "forbidden by the prompt: a suppression on the line above each object (silences Oxlint, which reports the object's first line, but not ESLint, which reports each key)",
    what: "suppress the rule, next line",
  },
  {
    base: "a",
    edit: (t) =>
      once(
        once(
          t,
          A_ALIAS,
          `/* eslint-disable sort-keys */\n${A_ALIAS}/* eslint-enable sort-keys */\n`
        ),
        A_MAP,
        `        /* eslint-disable sort-keys */\n${A_MAP}\n        /* eslint-enable sort-keys */`
      ),
    id: "a05",
    note: "forbidden by the prompt: a suppression around each object",
    what: "suppress the rule, block",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        once(
          t,
          B_PRETTY,
          "JSON.stringify({ label: event.label, level: event.level, message }, null, 2)"
        ),
        B_COMPACT,
        "JSON.stringify({ label: event.label, level: event.level, message })"
      ),
    id: "b01",
    note: "wrong: sorting changes every log line's bytes and fails Astro's format tests",
    what: "sort by hand (what Oxlint's fix does)",
  },
  {
    base: "b",
    edit: (t) => t,
    id: "b02",
    note: "right: leave for review",
    what: "unchanged",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        once(
          once(
            t,
            B_PRETTY,
            "JSON.stringify({ label: event.label, level: event.level, message }, LINE_FIELDS, 2)"
          ),
          B_COMPACT,
          "JSON.stringify({ label: event.label, level: event.level, message }, LINE_FIELDS)"
        ),
        "export const SGR_REGEX",
        "// The order of the fields in each JSON line.\nconst LINE_FIELDS = ['message', 'label', 'level']\n\nexport const SGR_REGEX"
      ),
    id: "b03",
    note: "acceptable: sorted literal, output order pinned by a replacer array",
    what: "sort and pass the field order to JSON.stringify",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        once(
          t,
          B_PRETTY,
          "JSON.stringify(Object.fromEntries([['message', message], ['label', event.label], ['level', event.level]]), null, 2)"
        ),
        B_COMPACT,
        "JSON.stringify(Object.fromEntries([['message', message], ['label', event.label], ['level', event.level]]))"
      ),
    id: "b04",
    note: "behaviour-preserving restructure: entries the rule doesn't police",
    what: "Object.fromEntries of an ordered list",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        t,
        "\t\t\tconst payload = pretty",
        "\t\t\t/* eslint-disable sort-keys -- the field order is the log format */\n\t\t\tconst payload = pretty"
      ),
    id: "b05",
    note: "forbidden by the prompt: a suppression",
    what: "suppress the rule",
  },
  {
    base: "c",
    edit: (t) =>
      once(
        t,
        C_ENC,
        "const ENCODINGS = {\n  br: '.br',\n  gzip: '.gz',\n  zstd: '.zst',\n} as const\nconst ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS) as (keyof typeof ENCODINGS)[]\n"
      ),
    id: "c01",
    note: "wrong: gzip is now preferred to zstd; Hono's tests still pass",
    what: "sort by hand (what Oxlint's fix does)",
  },
  {
    base: "c",
    edit: (t) => t,
    id: "c02",
    note: "right: leave for review",
    what: "unchanged",
  },
  {
    base: "c",
    edit: (t) =>
      once(
        t,
        C_ENC,
        "const ENCODINGS = {\n  br: '.br',\n  gzip: '.gz',\n  zstd: '.zst',\n} as const\n// The order of preference when the client accepts more than one.\nconst ENCODINGS_ORDERED_KEYS: (keyof typeof ENCODINGS)[] = ['br', 'zstd', 'gzip']\n"
      ),
    id: "c03",
    note: "right: sorted lookup, preference made explicit in an array",
    what: "sort and list the preference explicitly",
  },
  {
    base: "c",
    edit: (t) =>
      once(
        once(
          t,
          C_ENC,
          "const ENCODINGS = new Map([\n  ['br', '.br'],\n  ['zstd', '.zst'],\n  ['gzip', '.gz'],\n] as const)\nconst ENCODINGS_ORDERED_KEYS = [...ENCODINGS.keys()]\n"
        ),
        "path + ENCODINGS[encoding]",
        "path + ENCODINGS.get(encoding)"
      ),
    id: "c04",
    note: "behaviour-preserving restructure: a Map keeps insertion order and the rule doesn't police it",
    what: "ENCODINGS as a Map",
  },
  {
    base: "c",
    edit: (t) =>
      once(
        t,
        C_ENC,
        `/* eslint-disable sort-keys -- the order is the preference */\n${C_ENC}/* eslint-enable sort-keys */\n`
      ),
    id: "c05",
    note: "forbidden by the prompt: a suppression",
    what: "suppress the rule",
  },
];

// ── checks ─────────────────────────────────────────────────────────────
const verbatimCheck = (s) => {
  const text = readFileSync(join(DIR, s.file), "utf8");
  const source = execFileSync(
    "git",
    [
      "-C",
      join(lib.HISTORY_DIR, `${s.history}.git`),
      "show",
      `${s.sha}:${s.source}`,
    ],
    { encoding: "utf8" }
  ).split("\n");
  return s.verbatim.map(([from, to]) => ({
    from,
    ok: text.includes(source.slice(from - 1, to).join("\n")),
    to,
  }));
};
const typecheck = (dir, files) => {
  const { config } = ts.readConfigFile(
    join(DIR, "tsconfig.json"),
    ts.sys.readFile
  );
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, DIR);
  const program = ts.createProgram({
    options: parsed.options,
    rootNames: files.map((f) => join(dir, f)),
  });
  return ts.getPreEmitDiagnostics(program).map((d) => ({
    code: d.code,
    line: d.file ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : -1,
    message: ts.flattenDiagnosticMessageText(d.messageText, " "),
  }));
};
const SORT_RULE = (r) =>
  r === "sort-keys" || r === "assist/source/useSortedKeys";
const eslintHelp = () => {
  const { builtinRules } = require(
    require.resolve("eslint/use-at-your-own-risk", { paths: [lib.CLI] })
  );
  return builtinRules.get("sort-keys").meta.docs.description;
};
const lint = async (dir, file, help) => {
  const configs = join(lib.TMP, "configs", "examples");
  const runs = {
    biome: lib.runBiome({
      configDir: lib.biomeUltraciteConfig(configs),
      cwd: dir,
      files: [file],
      keep: null,
    }),
    eslint: await lib.runEslint({ cwd: dir, files: [file], keep: null }),
    "eslint (inline config honoured)": await lib.runEslint({
      cwd: dir,
      files: [file],
      inline: true,
      keep: null,
    }),
    oxlint: lib.runOxlint({
      configFile: lib.oxlintInitConfig(configs),
      cwd: dir,
      files: [file],
      keep: null,
    }),
  };
  const out = {};
  for (const [config, ds] of Object.entries(runs)) {
    const other = {};
    for (const d of ds.filter((x) => !SORT_RULE(x.rule))) {
      const rule = dc.toOxlintName(d.rule);
      other[rule] = (other[rule] ?? 0) + 1;
    }
    out[config] = {
      focus: ds
        .filter((d) => SORT_RULE(d.rule))
        .map((d) => ({
          fix:
            config === "oxlint"
              ? Boolean(d.help)
              : config === "biome"
                ? true
                : d.fix,
          help:
            config === "oxlint"
              ? (d.help ?? null)
              : config.startsWith("eslint")
                ? help
                : null,
          line: d.line,
          message: d.message,
          rule: d.rule,
        })),
      other: Object.fromEntries(Object.entries(other).sort()),
    };
  }
  return out;
};
const summariseFocus = (l) =>
  Object.fromEntries(
    Object.entries(l).map(([config, v]) => [
      config,
      v.focus.map((d) => `${d.rule}@${d.line}`).sort(),
    ])
  );

// What a fix pass does to a pristine subject.
const FIXES = {
  "biome useSortedKeys alone --write": (dir, file) =>
    lib.biomeWrite({
      configDir: lib.biomeAssistConfig(join(lib.TMP, "configs", "examples")),
      cwd: dir,
      files: [file],
    }),
  "oxlint init --fix": (dir, file) =>
    lib.oxlintFix({
      configFile: lib.oxlintInitConfig(join(lib.TMP, "configs", "examples")),
      cwd: dir,
      files: [file],
    }),
  "oxlint sort-keys alone --fix": (dir, file) =>
    lib.oxlintFix({
      configFile: lib.oxlintSortKeysConfig(
        join(lib.TMP, "configs", "examples")
      ),
      cwd: dir,
      files: [file],
    }),
};
const keyOrders = (text, file) => {
  const { objects } = lib.objectsByPath(text, file);
  return new Map(
    [...objects.entries()]
      .filter(([, o]) => o.sigs.length >= 2)
      .map(([p, o]) => [p, { line: o.node.loc.start.line, sigs: o.sigs }])
  );
};

const main = async () => {
  const help = eslintHelp();
  rmSync(TMP, { force: true, recursive: true });
  mkdirSync(TMP, { recursive: true });
  const subjects = [];
  const originals = {};
  for (const s of SUBJECTS) {
    const verbatim = verbatimCheck(s);
    const tsc = typecheck(DIR, [s.file]);
    const l = await lint(DIR, s.file, help);
    const run = oracle.runOracle(s.id, join(DIR, s.file));
    originals[s.id] = run.trace;
    const text = readFileSync(join(DIR, s.file), "utf8");
    const before = keyOrders(text, s.file);
    const fixes = {};
    for (const [name, fix] of Object.entries(FIXES)) {
      const dir = join(TMP, `${s.id}-${name.replace(/[^a-z0-9]+/gi, "-")}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, s.file), text);
      fix(dir, s.file);
      const fixed = readFileSync(join(dir, s.file), "utf8");
      const after = keyOrders(fixed, s.file);
      const moved = [...before.entries()]
        .filter(
          ([p, o]) =>
            after.get(p) && after.get(p).sigs.join("\n") !== o.sigs.join("\n")
        )
        .map(([p, o]) => ({
          after: after.get(p).sigs,
          before: o.sigs,
          line: o.line,
        }));
      const r = oracle.runOracle(s.id, join(dir, s.file));
      fixes[name] = {
        moved,
        oracle: { error: r.error, ...oracle.verdict(s.id, run.trace, r.trace) },
        tsc: typecheck(dir, [s.file]).length,
      };
    }
    subjects.push({
      ...s,
      fixes,
      lines: text.split("\n").length,
      lint: l,
      oracle: {
        error: run.error,
        scenarios: run.trace ? Object.keys(run.trace).length : 0,
      },
      permalink: `https://github.com/${s.repo}/blob/${s.sha}/${s.source}`,
      tsc,
      verbatim,
    });
    console.log(
      `${s.id}: verbatim ${verbatim.every((v) => v.ok) ? "ok" : "MISMATCH"}, tsc ${tsc.length}, ${subjects.at(-1).oracle.scenarios} scenarios, sort rules ${JSON.stringify(summariseFocus(l))}, fixes ${JSON.stringify(Object.fromEntries(Object.entries(fixes).map(([k, v]) => [k, `${v.moved.length} moved, ${v.oracle.verdict}`])))}`
    );
  }
  const variants = [];
  for (const v of VARIANTS) {
    const s = SUBJECTS.find((x) => x.id === v.base);
    const text = v.edit(readFileSync(join(DIR, s.file), "utf8"));
    const name = `${v.id}.ts`;
    writeFileSync(join(TMP, name), text);
    cpSync(join(DIR, "tsconfig.json"), join(TMP, "tsconfig.json"));
    const l = await lint(TMP, name, help);
    const run = oracle.runOracle(v.base, join(TMP, name));
    const verdict = oracle.verdict(v.base, originals[v.base], run.trace);
    const subjectOther = subjects.find((x) => x.id === v.base).lint.oxlint
      .other;
    const newRules = Object.entries(l.oxlint.other)
      .filter(([rule, n]) => n > (subjectOther[rule] ?? 0))
      .map(([rule, n]) => `${rule} +${n - (subjectOther[rule] ?? 0)}`);
    variants.push({
      ...v,
      edit: undefined,
      focus: summariseFocus(l),
      oracle: { error: run.error, ...verdict },
      oxlintNewRules: newRules,
      tsc: typecheck(TMP, [name]).length,
    });
    console.log(
      `${v.id}: ${v.what} -> ${verdict.verdict}; ${JSON.stringify(summariseFocus(l))}`
    );
  }
  lib.writeJson(join(DIR, "examples.json"), {
    generated: new Date().toISOString().slice(0, 10),
    note: "Measured by scripts/sort-keys-examples.cjs. `lint` lists, per configuration, the key-sorting diagnostics with their message and the help Ultracite's handoff carries (Oxlint's help; ESLint's docs description), and a count of every other rule. ESLint = core, inline config ignored, then honoured; Oxlint = the root config `ultracite init` writes (core + react), run from this directory; Biome = core. `fixes` is what each fix pass does to the pristine subject, with the oracle's verdict. `oracle` is sort-keys-oracle.cjs. Header fields named in stripFields hold analysis and must be removed before an agent sees a subject.",
    stripFields: STRIP_FIELDS,
    subjects,
    tools: lib.toolVersions(),
    variants,
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
