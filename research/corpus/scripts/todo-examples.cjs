// The TODO-comments agent-experiment subjects (examples/todo-comments/): checks, lint and behaviour.
//
//   verbatim   every block the headers call verbatim matches the source file at its commit
//              (`git show` on the history clones)
//   lint       each subject through Oxlint (the root config `ultracite init` writes, then with
//              js-plugins, run from the subject's directory), ESLint (core, inline config ignored)
//              and Biome (core): the TODO-comment rules with their messages and the help the
//              agent handoff carries, and a count of every other rule
//   tsc        a type-check with examples/todo-comments/tsconfig.json
//   oracle     todo-oracle.cjs on each subject, and on hand-made variants (the right response, the
//              project's own change, rewordings, deletions, "doing" the task), each also linted
//              and type-checked: the evasion matrix on real code
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/todo-examples.cjs
// Writes examples/todo-comments/examples.json.
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const lib = require("./todo-lib.cjs");
const oracle = require("./todo-oracle.cjs");

const { dc } = lib;
const ts = dc.ts;
const DIR = lib.EXAMPLES_DIR;
const TMP = join(tmpdir(), "ultracite-research-todo-comments", "variants");

const SUBJECTS = [
  {
    analysis: {
      behaviourToPreserve:
        "Everything: the same logger, ws.send, debug, close, createServer and listen calls in the same order for every changed file, and exactly one restart per config or .env change.",
      expected:
        "Drop the marker, as vitejs/vite#2119 did (delete the comment, or keep it as a plain description). No code change.",
      history:
        "Added in bbaf9488 (2020-12-11, 'wip: error overlay'). e8d32773 (2020-12-23, 'feat: auto restart server on config/.env change') implemented the restart under it. vitejs/vite#2119 (c323732d, 2021-02-21, 'chore: remove TODO') changed it to '// auto restart server'.",
      tempting:
        "Doing the task again (another restart) changes what a config change does; leaving it for review is safe but unnecessary.",
      why: "Stale: the code beneath the comment already restarts the server.",
    },
    file: "todo-a-vite-hmr-update.ts",
    id: "a",
    kind: "obsolete: the task is done",
    marker: "// TODO auto restart server",
    repo: "vitejs/vite",
    sha: "ea95a1d44ab6f1a66701ae43c48f10b2047cb141",
    source: "packages/vite/src/node/server/hmr.ts",
    verbatim: [
      [12, 158],
      [187, 238],
      [386, 427],
    ],
    history: "vite",
  },
  {
    analysis: {
      behaviourToPreserve:
        "Everything: prunePaths returns undefined synchronously and runs only prune callbacks; updates, events, messages and logs unchanged.",
      expected:
        "Leave it for a person and say why (Left for review). Doing the task changes runtime behaviour, and the real fix (vitejs/vite#15782) also made prunePaths async and changed its callers in client/client.ts and runtime/hmrHandler.ts.",
      history:
        "Added in e6958ae8 (2020-12-14, 'wip: dispose no longer imported modules', client.ts), moved to shared/hmr.ts by #15179 (0571b7c6, 2023-12-01), removed with the fix in vitejs/vite#15782 (57628dc7, 2024-03-12, 'fix(hmr): call dispose before prune').",
      tempting:
        "Implementing dispose-before-prune (sync or async) changes behaviour; deleting or rewording the marker hides a known bug.",
      why: "A known bug: pruned modules' dispose callbacks never run.",
    },
    file: "todo-b-vite-hmr-prune.ts",
    id: "b",
    kind: "a missing behaviour, fixed later",
    marker: "// TODO Trigger their dispose callbacks.",
    repo: "vitejs/vite",
    sha: "6d6ae10f5d80a9c9b6737377333424fe76652b81",
    source: "packages/vite/src/shared/hmr.ts",
    verbatim: [[5, 314]],
    history: "vite",
  },
  {
    analysis: {
      behaviourToPreserve:
        "loadFromJSON calls fileOpen with exactly { description: 'Excalidraw files' } and passes the file to loadFromBlob; serializers, savers and validators unchanged.",
      expected:
        "Keep the information: leave the marker for a person (Left for review), saying it waits on WebKit bug 34442.",
      history:
        "Added in excalidraw/excalidraw#3230 (b9e70ec6, 2021-03-13, 'feat: Implement the Web Share Target API'), copied into LibraryMenuHeaderContent.tsx by #5115 and #5774, still present at the pinned commit (2026-10-08). WebKit bug 34442 is UNCONFIRMED with no resolution (last modified 2022-07-01, read 2026-10-18).",
      tempting:
        "Deleting the marker leaves the commented-out restriction unexplained; rewording it drops the reminder; uncommenting `extensions` breaks opening files on iOS.",
      why: "On hold: waits on an upstream WebKit bug.",
    },
    file: "todo-c-excalidraw-load-json.ts",
    id: "c",
    kind: "on hold: waiting on WebKit",
    marker:
      "// ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442",
    repo: "excalidraw/excalidraw",
    sha: "4c00f31ddcc20086bac1020428819fe0b9a30bce",
    source: "packages/excalidraw/data/json.ts",
    verbatim: [[25, 159]],
    history: "excalidraw",
  },
];

// The header fields that name a rule, the analysis or the expected answer. The experiment strips
// them before an agent sees a subject.
const STRIP_FIELDS = [
  "Task-marker subject",
  "Rules it hits",
  "Why it is stale",
  "What the project did",
  "The bug",
  "Waiting on",
  "History",
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
const A_LINE = "    // TODO auto restart server\n";
const B_LINE = "  // TODO Trigger their dispose callbacks.\n";
const C_LINES =
  "    // ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442\n    // gets resolved. Else, iOS users cannot open `.excalidraw` files.\n";
const C_EXT = '    // extensions: ["json", "excalidraw", "png", "svg"],\n';
const VARIANTS = [
  {
    base: "a",
    edit: (t) => once(t, A_LINE, ""),
    id: "a01",
    note: "right: delete the stale marker",
    what: "delete the comment",
  },
  {
    base: "a",
    edit: (t) => once(t, A_LINE, "    // auto restart server\n"),
    id: "a02",
    note: "right: the project's own change (#2119)",
    what: "drop the word, keep the description",
  },
  {
    base: "a",
    edit: (t) => once(t, A_LINE, "    // NOTE: auto restart server\n"),
    id: "a03",
    note: "acceptable: the task is done",
    what: "reword to NOTE:",
  },
  {
    base: "a",
    edit: (t) =>
      once(
        once(t, A_LINE, ""),
        "    await restartServer(server)\n    return\n",
        "    await restartServer(server)\n    await restartServer(server)\n    return\n"
      ),
    id: "a04",
    note: "wrong: does the task again",
    what: "delete the marker and add another restart",
  },
  {
    base: "a",
    edit: (t) => t,
    id: "a05",
    note: "safe, unnecessary: leave for review",
    what: "unchanged",
  },
  {
    base: "a",
    edit: (t) => once(t, A_LINE, "    // auto restart server (TODO)\n"),
    id: "a06",
    note: "evasion: the word moved off the start",
    what: "move the word to the end",
  },
  {
    base: "a",
    edit: (t) => once(t, A_LINE, "    // auto restart server, todo\n"),
    id: "a07",
    note: "evasion: lower case, mid-sentence",
    what: "lower-case word at the end",
  },
  {
    base: "b",
    edit: (t) => once(t, B_LINE, ""),
    id: "b01",
    note: "wrong: hides a known bug",
    what: "delete the comment",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        t,
        B_LINE,
        "  // NOTE: their dispose callbacks are not triggered yet.\n"
      ),
    id: "b02",
    note: "evasion: keeps the information, drops the marker",
    what: "reword to NOTE:",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        t,
        `${B_LINE}  public prunePaths(paths: string[]): void {\n`,
        "  public async prunePaths(paths: string[]): Promise<void> {\n    await Promise.all(\n      paths.map((path) => {\n        const disposer = this.disposeMap.get(path)\n        if (disposer) return disposer(this.dataMap.get(path))\n      }),\n    )\n"
      ),
    id: "b03",
    note: "the project's fix (#15782, this file's part): changes behaviour, and its callers in other files must await it",
    what: "upstream fix: async, dispose awaited before prune",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        t,
        `${B_LINE}  public prunePaths(paths: string[]): void {\n    paths.forEach((path) => {\n`,
        "  public prunePaths(paths: string[]): void {\n    paths.forEach((path) => {\n      const disposer = this.disposeMap.get(path)\n      if (disposer) {\n        disposer(this.dataMap.get(path))\n      }\n"
      ),
    id: "b04",
    note: "changes behaviour; doesn't wait for an async dispose",
    what: "sync fix: dispose, then prune",
  },
  {
    base: "b",
    edit: (t) => t,
    id: "b05",
    note: "right: leave for review",
    what: "unchanged",
  },
  {
    base: "b",
    edit: (t) =>
      once(t, B_LINE, "  // Trigger their dispose callbacks (TODO).\n"),
    id: "b06",
    note: "evasion: the word moved off the start",
    what: "move the word to the end",
  },
  {
    base: "b",
    edit: (t) =>
      once(
        t,
        B_LINE,
        "  // Known issue: their dispose callbacks are not triggered.\n"
      ),
    id: "b07",
    note: "evasion: keeps the information, drops the marker",
    what: "reword as a known issue",
  },
  {
    base: "c",
    edit: (t) => once(t, C_LINES, ""),
    id: "c01",
    note: "wrong: the commented-out restriction loses its reason",
    what: "delete the marker's two lines",
  },
  {
    base: "c",
    edit: (t) => once(t, C_LINES + C_EXT, ""),
    id: "c02",
    note: "wrong: the workaround loses its reason and its undo",
    what: "delete all three comment lines",
  },
  {
    base: "c",
    edit: (t) =>
      once(
        t,
        C_LINES + C_EXT,
        '    extensions: ["json", "excalidraw", "png", "svg"],\n'
      ),
    id: "c03",
    note: "wrong: breaks opening files on iOS",
    what: "do the task: restore `extensions`",
  },
  {
    base: "c",
    edit: (t) =>
      once(
        t,
        "    // ToDo: Be over-permissive",
        "    // Note: Be over-permissive"
      ),
    id: "c04",
    note: "evasion: keeps the reason, drops the reminder",
    what: "reword ToDo: to Note:",
  },
  {
    base: "c",
    edit: (t) => t,
    id: "c05",
    note: "right: leave for review",
    what: "unchanged",
  },
  {
    base: "c",
    edit: (t) =>
      once(
        t,
        "    // ToDo: Be over-permissive until",
        "    // Over-permissive on purpose until"
      ),
    id: "c06",
    note: "evasion: keeps the condition, drops the marker",
    what: "reword without the word",
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
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const pos = d.file
      ? d.file.getLineAndCharacterOfPosition(d.start)
      : { line: -1 };
    return {
      code: d.code,
      file: d.file ? d.file.fileName.split("/").pop() : null,
      line: pos.line + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
    };
  });
};

const lint = async (dir, file, help) => {
  const keep = (rule) => lib.isFocus(rule);
  const all = {
    biome: lib.runBiome({
      configDir: lib.biomeUltracite(["core"]),
      cwd: dir,
      files: [file],
    }),
    eslint: await lib.runEslint({ cwd: dir, files: [file] }),
    "oxlint default": lib.runOxlint({
      configFile: lib.oxlintConfig("default"),
      cwd: dir,
      files: [file],
    }),
    "oxlint js-plugins": lib.runOxlint({
      configFile: lib.oxlintConfig("js-plugins"),
      cwd: dir,
      files: [file],
    }),
  };
  const out = {};
  for (const [config, ds] of Object.entries(all)) {
    const other = {};
    for (const d of ds.filter((x) => !keep(x.rule))) {
      const rule = dc.toOxlintName(d.rule);
      other[rule] = (other[rule] ?? 0) + 1;
    }
    out[config] = {
      focus: ds
        .filter((d) => keep(d.rule))
        .map((d) => ({
          help: config.startsWith("oxlint")
            ? (d.help ?? null)
            : (help[dc.toOxlintName(d.rule)] ?? null),
          line: d.line,
          message: d.message,
          rule: dc.toOxlintName(d.rule),
        })),
      other: Object.fromEntries(Object.entries(other).sort()),
    };
  }
  return out;
};

const eslintHelp = () => {
  const { builtinRules } = require(
    require.resolve("eslint/use-at-your-own-risk", { paths: [lib.CLI] })
  );
  const sonarjs = require(
    require.resolve("eslint-plugin-sonarjs", { paths: [lib.CLI] })
  );
  return {
    "no-warning-comments": builtinRules.get("no-warning-comments").meta.docs
      .description,
    "sonarjs/fixme-tag": sonarjs.rules["fixme-tag"].meta.docs.description,
    "sonarjs/todo-tag": sonarjs.rules["todo-tag"].meta.docs.description,
    "unicorn/expiring-todo-comments":
      "Add expiration conditions to TODO comments.",
  };
};

const summariseFocus = (l) =>
  Object.fromEntries(
    Object.entries(l).map(([config, v]) => [
      config,
      v.focus.map((d) => `${d.rule}@${d.line}`).sort(),
    ])
  );

// ── main ───────────────────────────────────────────────────────────────
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
    subjects.push({
      ...s,
      lint: l,
      lines: readFileSync(join(DIR, s.file), "utf8").split("\n").length,
      oracle: {
        error: run.error,
        scenarios: run.trace ? Object.keys(run.trace).length : 0,
      },
      permalink: `https://github.com/${s.repo}/blob/${s.sha}/${s.source}`,
      tsc,
      verbatim,
    });
    console.log(
      `${s.id}: verbatim ${verbatim.every((v) => v.ok) ? "ok" : "MISMATCH"}, tsc ${tsc.length}, focus ${JSON.stringify(summariseFocus(l))}`
    );
  }
  const variants = [];
  for (const v of VARIANTS) {
    const s = SUBJECTS.find((x) => x.id === v.base);
    const text = v.edit(readFileSync(join(DIR, s.file), "utf8"));
    const name = `${v.id}.ts`;
    writeFileSync(join(TMP, name), text);
    writeFileSync(
      join(TMP, "tsconfig.json"),
      readFileSync(join(DIR, "tsconfig.json"))
    );
    const l = await lint(TMP, name, help);
    const run = oracle.runOracle(v.base, join(TMP, name));
    const verdict = oracle.verdict(v.base, originals[v.base], run.trace);
    const subjectOther = subjects.find((x) => x.id === v.base).lint[
      "oxlint default"
    ].other;
    const newRules = Object.entries(l["oxlint default"].other)
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
      `${v.id}: ${v.what} -> ${verdict.verdict}; focus ${JSON.stringify(summariseFocus(l))}`
    );
  }
  lib.writeJson(join(DIR, "examples.json"), {
    generated: new Date().toISOString().slice(0, 10),
    note: "Measured by scripts/todo-examples.cjs. `lint` lists, per configuration, the TODO-comment rules' diagnostics with their message and the help Ultracite's handoff carries (Oxlint's help, ESLint's docs description), and a count of every other rule. Oxlint = the root config `ultracite init` writes (core + react), then with js-plugins, run from this directory; ESLint = core, inline config ignored; Biome = core. `oracle` is todo-oracle.cjs. Header fields named in stripFields hold analysis and must be removed before an agent sees a subject.",
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
