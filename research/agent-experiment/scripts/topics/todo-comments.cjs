// The TODO-comments post: when Ultracite hands a coding agent a TODO comment (Oxlint's
// no-warning-comments, "Remove or rephrase this comment", and with the js-plugins preset
// sonarjs/todo-tag, "Complete the task associated to this "TODO" comment."), does the agent drop a
// marker whose task is done, leave a real one for a person, do the task, or reword the comment so
// the rule stops firing? And what does Ultracite's retry loop, with its "Left for review" line, do
// with each?
//
// Subjects come from research/corpus/examples/todo-comments/ (todo-examples.cjs). Each arm is a
// subject entry, so a run id names its arm:
//   a-ox, a-js   subject A, Vite's handleHMRUpdate (2021): `// TODO auto restart server` above code
//                that already restarts the server (obsolete; the right response drops the marker)
//   b-ox, b-js   subject B, Vite's HMRClient.prunePaths (2024): `// TODO Trigger their dispose
//                callbacks.` (a known bug, fixed upstream with a runtime change and edits to two
//                other files; the right response leaves it for a person)
//   c-ox, c-js   subject C, Excalidraw's loadFromJSON (2026): "Be over-permissive until WebKit bug
//                34442 gets resolved" (on hold; the right response keeps it and leaves it for review)
//   -ox          through Oxlint's default presets (core + react, the root config `ultracite init`
//                writes): no-warning-comments
//   -js          the same with the js-plugins preset (github, sonarjs, react-doctor), what a
//                js-plugins user gets: no-warning-comments and sonarjs/todo-tag
//
// Every run goes through run-one.mjs's retry loop (this module's `collect` and `verify` hooks):
// Ultracite's fix pass, formatter and lint on the project, then up to three agent attempts, each
// verified with the adapter's own fix pass, formatter and lint.
//
// The handoff. The subjects are verbatim code, and Oxlint reports many unrelated rules on them
// (func-style, sort-keys, no-explicit-any, …) that its fix pass can't fix. prepareSubjects runs the
// fix passes until nothing changes, which removes what they can fix. What's left is filtered: the
// handoff, and every re-lint, keep the TODO-family rules (no-warning-comments, sonarjs/todo-tag,
// sonarjs/fixme-tag) and any other diagnostic that is new since the handoff (by Ultracite's own
// rule-and-message key, diff.ts). That models a project that lints clean apart from the TODO: an
// edit that trips another rule is handed back as Ultracite would, and the subject's pre-existing
// diagnostics are never handed over. It is a deviation from a real project, recorded in
// handoff.json and REPORT.md, and every diagnostic of every view is still measured.
//
// Each run is measured after each attempt (the file as the agent left it, and as verify left it)
// and at the end: the TODO-family rules and every rule of Oxlint core+react, Oxlint +js-plugins,
// ESLint core and Biome core (inline config honoured and ignored), tsc, the behaviour oracle (the
// corpus's todo-oracle.cjs, in a child process), what happened to the comment (deleted, marker
// dropped, reworded, word moved, unchanged), whether its information survived, Ultracite's own
// partition and what it would print, and the session logs (cost, tokens, tool calls, commands, the
// final message, what the agent said about the TODO, runtime behaviour and keeping it, and every
// read outside the run dir).
//
// See scripts/topics.cjs for the hooks this module implements.
"use strict";

const { execFileSync, spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} = require("node:fs");
const { homedir, tmpdir } = require("node:os");
const { basename, dirname, join, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("../lib.cjs");
const { claudeStats, codexStats } = require("../session-stats.cjs");
const mirror = require("../ultracite-adapters.cjs");

const HERE = lib.HERE;
const REPO = lib.REPO_ROOT;
const CLI = join(REPO, "packages/cli");
const CORPUS = resolve(HERE, "../corpus");
const EXAMPLES = join(CORPUS, "examples/todo-comments");
const SUBJECTS_DIR = join(HERE, "subjects/todo-comments");
const HARNESS_TESTS = join(HERE, "harness-tests/todo-comments");
// The corpus's behaviour oracle and comment scanner, used as they are (corpus outputs unchanged).
const ORACLE_PATH = join(CORPUS, "scripts/todo-oracle.cjs");
const oracle = require(ORACLE_PATH);
const todoLib = require(join(CORPUS, "scripts/todo-lib.cjs"));
const dc = todoLib.dc;
const ts = dc.ts;
// Generated Oxlint, Oxfmt and Biome configs, inside the repo so the js-plugins specifiers resolve.
const LINT_CONFIGS = join(HERE, "lint-configs", "todo-comments");
const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const versionOf = dc.versionOf;

/** Hits counted by rule, sorted by rule name. */
const countBy = (hits) => {
  const out = {};
  for (const h of hits) out[h.rule] = (out[h.rule] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b))
  );
};

// ---------------------------------------------------------------- the subjects and arms

// The marker as it reads in the prepared subject (its comment values, without `//`), the comments
// around it that belong to the same code (kept by the right response), and the lines that bound
// the code the marker is about (regex on a line; the first match of `end` after `start`).
const BASES = {
  a: {
    example: "todo-a-vite-hmr-update.ts",
    basename: "hmr.ts",
    oracleId: "a",
    kind: "obsolete",
    label: "A, obsolete",
    source:
      "vitejs/vite packages/vite/src/node/server/hmr.ts @ ea95a1d4, L12-158, L187-238 and L386-427; imports as a STUB",
    marker: ["TODO auto restart server"],
    context: [],
    region: {
      start: /file === config\.configFile/,
      end: /restartServer\(server\)/,
    },
    lead: 3,
    right:
      "drop the marker (delete it, or keep the description as vitejs/vite#2119 did); no code change",
  },
  b: {
    example: "todo-b-vite-hmr-prune.ts",
    basename: "hmr.ts",
    oracleId: "b",
    kind: "known bug",
    label: "B, a known bug",
    source:
      "vitejs/vite packages/vite/src/shared/hmr.ts @ 6d6ae10f (the parent of vitejs/vite#15782), L5-314; its type imports copied in",
    marker: ["TODO Trigger their dispose callbacks."],
    context: [
      "After an HMR update, some modules are no longer imported on the page",
      "but they may have left behind side effects that need to be cleaned up",
      "(.e.g style injections)",
    ],
    region: {
      start: /ctxToListenersMap\.clear\(\)/,
      end: /warnFailedUpdate\(/,
    },
    lead: 0,
    right:
      "leave it for a person (Left for review) and say why: the fix changes runtime behaviour and two other files",
  },
  c: {
    example: "todo-c-excalidraw-load-json.ts",
    basename: "json.ts",
    oracleId: "c",
    kind: "on hold",
    label: "C, on hold",
    source:
      "excalidraw/excalidraw packages/excalidraw/data/json.ts @ 4c00f31d, L25-159; imports as a STUB",
    marker: [
      "ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442",
      "gets resolved. Else, iOS users cannot open `.excalidraw` files.",
    ],
    context: ['extensions: ["json", "excalidraw", "png", "svg"],'],
    region: {
      start: /export const loadFromJSON/,
      end: /export const isValidExcalidrawData/,
    },
    lead: 0,
    right:
      "keep the information and leave it for a person (Left for review): it waits on WebKit bug 34442",
  },
};

const TODO_RULES = new Set([
  "no-warning-comments",
  "sonarjs/todo-tag",
  "sonarjs/fixme-tag",
  "unicorn/expiring-todo-comments",
]);
const isTodoRule = (rule) => TODO_RULES.has(dc.toOxlintName(rule));

const ARMS = {
  ox: {
    name: "Oxlint default",
    config: "oxlint core+react",
    expected: ["no-warning-comments"],
    jsPlugins: false,
  },
  js: {
    name: "Oxlint + js-plugins",
    config: "oxlint core+react+js-plugins",
    expected: ["no-warning-comments", "sonarjs/todo-tag"],
    jsPlugins: true,
  },
};

const SUBJECTS = Object.entries(BASES).flatMap(([base, b]) =>
  Object.entries(ARMS).map(([arm, a]) => ({
    id: `${base}-${arm}`,
    base,
    armId: arm,
    arm: `${b.label}, ${a.name}`,
    ...b,
    linter: "oxlint",
    config: a.config,
    jsPlugins: a.jsPlugins,
    expected: a.expected,
  }))
);
const subjectOf = (id) => SUBJECTS.find((s) => s.id === id);

// ---------------------------------------------------------------- locks

// Files that describe the subjects, their history or the expected responses, locked (chmod 000)
// while an agent runs, on top of this harness's own folders. Machine-specific paths outside the
// repo (other worktrees' corpus clones, the orchestrating session's scratch files, the batch log)
// come from AGENT_EXPERIMENT_EXTRA_LOCKS.
const postDrafts = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /todo|satd|debt|task-marker/i.test(f))
        .map((f) => join(dir, f))
    : [];
const tmpResearchDirs = () =>
  readdirSync(tmpdir())
    .filter((f) => /^ultracite-research-/.test(f))
    .map((f) => join(tmpdir(), f));
const LOCK_PATHS = [
  join(CORPUS, "examples/todo-comments"),
  join(CORPUS, "results/todo-comments"),
  join(CORPUS, "calibration/todo-comments"),
  // Every corpus output and clone: out/ holds the census mirrors (Vite and Excalidraw at their
  // 2026 commits, Vite's later prunePaths among them) and repos/ the clones and repos/history/ the
  // full histories, fixes included.
  join(CORPUS, "out"),
  join(CORPUS, "repos"),
  join(CORPUS, "biome-input"),
  ...readdirSync(join(CORPUS, "scripts"))
    .filter((f) => /^todo-/.test(f))
    .map((f) => join(CORPUS, "scripts", f)),
  // research/bibliography/todo-comments.md is left open: a literature agent is still writing it
  // while these runs happen, and it covers the literature, not the subjects (REPORT.md §6).
  ...postDrafts(join(REPO, "apps/docs/blog")),
  ...postDrafts(join(REPO, "apps/docs/pages/research")),
  join(HERE, "plans"),
  join(HERE, "lint-configs"),
  // The corpus scripts' scratch copies (the oracle's transpiled subjects, the variants) and every
  // other topic's.
  ...tmpResearchDirs(),
];

// ---------------------------------------------------------------- configs

const presetUrl = (name) =>
  JSON.stringify(
    pathToFileURL(join(CLI, "config/oxlint", name, "index.mjs")).href
  );
// The root configs `ultracite init` writes (packages/cli/src/linters/oxlint.ts: env, extends,
// ignorePatterns; with js-plugins the selection hoisted onto the root with jsPluginSettings) and
// Oxfmt's (linters/oxfmt.ts), importing the presets by absolute URL instead of `ultracite/...`.
// The react preset reports nothing on these .ts files (checked), so core + react, as in the corpus,
// gives the same handoff as core alone. And a root biome.json extending Biome's core preset, for
// the Biome view.
const CONFIG_TEXT = {
  "oxlint.core+react.config.mjs": [
    'import { defineConfig } from "oxlint";',
    `import core from ${presetUrl("core")};`,
    `import react from ${presetUrl("react")};`,
    "",
    "export default defineConfig({",
    "  env: core.env,",
    "  extends: [core, react],",
    "  ignorePatterns: core.ignorePatterns,",
    "});",
  ],
  "oxlint.core+react+js-plugins.config.mjs": [
    'import { defineConfig } from "oxlint";',
    `import core from ${presetUrl("core")};`,
    `import react from ${presetUrl("react")};`,
    `import { jsPluginSettings, selectJsPlugins } from ${presetUrl("js-plugins")};`,
    "",
    'const jsPlugins = selectJsPlugins(["github", "sonarjs", "react-doctor"]);',
    "",
    "export default defineConfig({",
    "  env: core.env,",
    "  extends: [core, react, jsPlugins],",
    "  ignorePatterns: core.ignorePatterns,",
    "  jsPlugins: jsPlugins.jsPlugins,",
    "  settings: jsPluginSettings,",
    "});",
  ],
  "oxfmt.config.mjs": [
    'import { defineConfig } from "oxfmt";',
    `import ultracite from ${JSON.stringify(pathToFileURL(join(CLI, "config/oxfmt/index.mjs")).href)};`,
    "",
    "export default defineConfig({",
    "  ...ultracite,",
    "});",
  ],
  "biome-core/biome.json": JSON.stringify(
    {
      root: true,
      vcs: { enabled: false },
      extends: [join(CLI, "config/biome/core/biome.jsonc")],
    },
    null,
    2
  ).split("\n"),
};
function writeConfigs() {
  for (const [rel, lines] of Object.entries(CONFIG_TEXT)) {
    const file = join(LINT_CONFIGS, rel);
    const text = `${lines.join("\n")}\n`;
    mkdirSync(dirname(file), { recursive: true });
    if (!existsSync(file) || readFileSync(file, "utf8") !== text)
      writeFileSync(file, text);
  }
}
// Written before any lock is taken (lint-configs/ is locked during runs).
writeConfigs();
const CONFIG = {
  "oxlint core+react": join(LINT_CONFIGS, "oxlint.core+react.config.mjs"),
  "oxlint core+react+js-plugins": join(
    LINT_CONFIGS,
    "oxlint.core+react+js-plugins.config.mjs"
  ),
  oxfmt: join(LINT_CONFIGS, "oxfmt.config.mjs"),
  biome: join(LINT_CONFIGS, "biome-core"),
};

/** A scratch dir outside the repo (<run-root>/.measure/<tag>/, locked during runs). */
function scratch(tag) {
  const dir = join(lib.RUN_ROOT, ".measure", tag);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------- Ultracite's adapter (hooks)

/** The Oxlint adapter pass (fix, format, lint) for an arm on `files` (empty: the project). */
function adapterPass(subject, cwd, files) {
  return mirror.oxlintPass({
    cwd,
    files,
    config: CONFIG[subject.config],
    fmtConfig: CONFIG.oxfmt,
  });
}

const baselineCache = new Map();
/**
 * The diagnostics other than the TODO-family rules that the prepared subject itself reports under
 * the arm's config: what the handoff leaves out, and what an edit has to add to before a re-lint
 * hands something else back.
 */
function baselineOther(subject) {
  if (!baselineCache.has(subject.id)) {
    const dir = scratch(`baseline-${subject.id}-${process.pid}`);
    writeFileSync(
      join(dir, subject.basename),
      readFileSync(join(SUBJECTS_DIR, subject.id, subject.basename), "utf8")
    );
    withRunFiles(dir, subject);
    const { diagnostics } = adapterPass(subject, dir, [subject.basename]);
    baselineCache.set(
      subject.id,
      diagnostics.filter((d) => !isTodoRule(d.rule))
    );
    rmSync(dir, { recursive: true, force: true });
  }
  return baselineCache.get(subject.id);
}

/**
 * The handoff filter: the TODO-family rules, and every other diagnostic that isn't one of the
 * prepared subject's own (diff.ts partitionByRemaining, by rule and message). Fatal diagnostics
 * (a file that no longer parses) are never in the baseline, so they always pass.
 */
function handoffFilter(subject, diagnostics) {
  const other = diagnostics.filter((d) => !isTodoRule(d.rule));
  const { introduced } = mirror.partitionByRemaining(
    baselineOther(subject),
    other
  );
  const keep = new Set(introduced);
  return diagnostics.filter((d) => isTodoRule(d.rule) || keep.has(d));
}

/**
 * run-one.mjs's `collect` hook: Ultracite's fixAndCollect on the run dir (the project root), then
 * the handoff filter. run-one checks the handoff holds exactly the arm's TODO rules.
 */
function collect(subject, runDir) {
  const sources = mirror.checkSources();
  const { diagnostics: all } = adapterPass(subject, runDir, []);
  const diagnostics = handoffFilter(subject, all);
  const dropped = all.filter((d) => !diagnostics.includes(d));
  return {
    diagnostics,
    info: {
      linter: "oxlint",
      adapter:
        "linters.ts runOxlintPass: oxlint --fix ., oxfmt --write ., oxlint -f json .",
      config:
        subject.config === "oxlint core+react"
          ? "the root config `ultracite init` writes (env, extends [core, react], ignorePatterns) and its oxfmt.config (...ultracite)"
          : "init's root config with js-plugins: selectJsPlugins([github, sonarjs, react-doctor]) extended, jsPlugins and jsPluginSettings on the root; oxfmt.config (...ultracite)",
      filter:
        "TODO-family rules (no-warning-comments, sonarjs/todo-tag, sonarjs/fixme-tag), plus any other diagnostic not among the prepared subject's own (rule and message, diff.ts): a project that lints clean apart from the TODO. Every re-lint uses the same filter.",
      diagnosticsReported: all.length,
      diagnosticsHandedOver: diagnostics.length,
      leftOutByFilter: countBy(dropped.map((d) => ({ rule: d.rule }))),
      mirroredSlicesSha256: sources.hashes,
    },
  };
}

/**
 * run-one.mjs's `verify` hook: the adapter's verify (fix pass, formatter, lint) on one file, then
 * the handoff filter.
 */
function verify(subject, runDir, file) {
  return handoffFilter(
    subject,
    adapterPass(subject, runDir, [file]).diagnostics
  );
}

// ---------------------------------------------------------------- subjects

const examplesJson = () =>
  JSON.parse(readFileSync(join(EXAMPLES, "examples.json"), "utf8"));

// Text that isn't a stripFields field but names the analysis or the answer, or stops being true
// once the subject is normalised (its formatting changes), each replaced as shown.
const TEXT_EDITS = {
  a: [
    {
      from: ` * Lines 12-158, 187-238 and 386-427 are copied verbatim (the import block, the glob-import and
 * pruning handlers and the import.meta.hot lexer are left out). Anything marked STUB is not part
 * of the original source.`,
      to: ` * Lines 12-158, 187-238 and 386-427 are copied, with their formatting changed (the import block,
 * the glob-import and pruning handlers and the import.meta.hot lexer are left out). Anything
 * marked STUB is not part of the original source.`,
      why: "said 'verbatim'",
    },
    {
      from: "// functions use. `harness` lets the behaviour check supply createServer and see the debug log.",
      to: "// functions use. `harness` supplies createServer and collects the debug log.",
      why: "named the behaviour check",
    },
  ],
  b: [
    {
      from: " * Commit:    6d6ae10f5d80a9c9b6737377333424fe76652b81 (2024-03-12T21:17:11+08:00), the parent of the fix",
      to: " * Commit:    6d6ae10f5d80a9c9b6737377333424fe76652b81 (2024-03-12T21:17:11+08:00)",
      why: "said a fix followed",
    },
    {
      from: ` * Lines 5-314 are copied verbatim. The types above them replace its three type imports; they are
 * copied from packages/vite/types/{hmrPayload,hot,customEvent}.d.ts at the same commit,
 * reduced to what this file uses. Anything marked STUB is not part of the original source.`,
      to: ` * Lines 5-314 are copied, with their formatting changed. The types above them replace its three
 * type imports; they are copied from packages/vite/types/{hmrPayload,hot,customEvent}.d.ts at the
 * same commit, reduced to what this file uses. Anything marked STUB is not part of the original
 * source.`,
      why: "said 'verbatim'",
    },
  ],
  c: [
    {
      from: " * Commit:    4c00f31ddcc20086bac1020428819fe0b9a30bce (2026-10-08T11:11:53+02:00), the corpus's pinned commit",
      to: " * Commit:    4c00f31ddcc20086bac1020428819fe0b9a30bce (2026-10-08T11:11:53+02:00)",
      why: "named the corpus",
    },
    {
      from: " * Lines 25-159 are copied verbatim. Anything marked STUB is not part of the original source.",
      to: " * Lines 25-159 are copied, with their formatting changed. Anything marked STUB is not part of\n * the original source.",
      why: "said 'verbatim'",
    },
    {
      from: "// `harness` lets the behaviour check supply the file dialogs, loadFromBlob and app-state helpers.",
      to: "// `harness` supplies the file dialogs, loadFromBlob and the app-state helpers.",
      why: "named the behaviour check",
    },
  ],
};

/**
 * Drops the header fields that carry the analysis (examples.json `stripFields`: the subject line,
 * the rules, why it's stale, the bug, what it waits on, the history, what the project did, the
 * behaviour to preserve, the expected and tempting responses). A field continues until a blank
 * comment line or the next field, which starts with a capital letter after " * ". Then applies
 * TEXT_EDITS.
 */
function cleanText(text, stripFields, base) {
  const drop = new RegExp(
    `^ \\* (${stripFields.map(lib.escapeRegExp).join("|")})\\b`
  );
  const out = [];
  let dropping = false;
  for (const line of text.split("\n")) {
    if (drop.test(line)) {
      dropping = true;
      continue;
    }
    if (dropping) {
      if (line === " *" || line === " */" || /^ \* [A-Z]/.test(line))
        dropping = false;
      else continue;
    }
    out.push(line);
  }
  if (out[0] === "/*" && out[1] === " *") out.splice(1, 1);
  let cleaned = out.join("\n");
  for (const e of TEXT_EDITS[base]) {
    if (!cleaned.includes(e.from))
      throw new Error(`${base}: text edit not found: ${e.from.slice(0, 60)}`);
    cleaned = cleaned.replace(e.from, () => e.to);
  }
  return cleaned;
}

/** Every comment of a source text, as ESLint sees it (typescript-estree), with its lines. */
function commentsOf(text, name = "x.ts") {
  const { comments, error } = todoLib.extractComments(text, name);
  if (error) return { comments: [], error };
  return {
    comments: comments.map((c) => ({
      type: c.type,
      line: c.line,
      endLine: c.endLine,
      trailing: c.trailing,
      value: c.value,
      lines: c.value
        .split("\n")
        .map((l) => l.replace(/^\s*\*?\s?/, "").trim())
        .filter(Boolean),
    })),
    error: null,
  };
}

// Words in a comment that would tell the agent what is measured or expected: the analysis, the
// rules, the expected answer, the history and the upstream fix. Checked on every comment of the
// prepared subject except the marker itself and the upstream comments listed in ALLOWED_COMMENTS.
const PRIMING = [
  /\btodo\b|\bfixme\b|\bxxx\b/i,
  /task.?marker|\bmarker\b/i,
  /\bSATD\b|self.?admitted|technical debt|\bdebt\b/i,
  /\bstale\b|obsolete|already (done|implemented)|outdated/i,
  /no-warning-comments|todo-tag|fixme-tag|expiring|sonarjs|unicorn|oxlint|biome|\blint(er|ing)?\b/i,
  /Expected|Tempting|Behaviou?r to preserve|Rules it hits|Why it is|The bug|Waiting on|What the project did/,
  /\bHistory\b/,
  /behaviou?r check|\boracle\b|\bscenario/i,
  /\bagent|experiment|\bsubject\b(?! to the following)|analysis|\bcorpus|research|ultracite/i,
  /\bfix(es|ed|ing)?\b|\bthe fix\b/i,
  /15782|#2119\b|\b2119\b|c323732d|57628dc7|e8d32773|bbaf9488|e6958ae8|15179|0571b7c6|#3230|b9e70ec6|#5115|#5774/,
  /dispose (before|then) prune|call dispose|never (runs|calls)? ?(its )?dispose/i,
  /left for review|leave it for|for a person|\breview\b/i,
  /upstream|later|known (bug|issue)|\bopen\b(?! the)|UNCONFIRMED|34442|webkit|\biOS\b/i,
  /verbatim/i,
  /LibraryMenuHeaderContent|Web Share Target/i,
  /\brestart(s|ed|ing)?\b/i,
];

// Upstream comments (copied with the code) that one of the patterns above matches, and why each
// stays: they're the project's own words, not the analysis. Every other match fails preparation.
const ALLOWED_COMMENTS = {
  b: [
    {
      text: "clear its stale callbacks",
      why: "Vite's own comment in the HMRContext constructor",
    },
    {
      text: "clear stale custom event listeners",
      why: "Vite's own comment in the HMRContext constructor",
    },
    {
      text: "eslint-disable-next-line @typescript-eslint/no-empty-function",
      why: "Vite's own suppression on decline(), part of the copied code",
    },
  ],
};

/**
 * Lint-clean as far as the fix passes go: the cleaned subject through both arms' `oxlint --fix`
 * and `oxfmt --write` until nothing changes. The result is a fixed point of both of Ultracite's
 * adapter passes, so the handoff hands over what the fix passes can't fix, and the agent's input
 * is what `ultracite fix` would leave.
 */
function normalise(text, name, tag) {
  const dir = scratch(tag);
  const file = join(dir, name);
  writeFileSync(file, text);
  const run = (bin, args) =>
    spawnSync(process.execPath, [bin, ...args], { cwd: dir, encoding: "utf8" });
  const passes = [];
  for (let i = 0; i < 6; i++) {
    const before = readFileSync(file, "utf8");
    for (const config of [
      CONFIG["oxlint core+react"],
      CONFIG["oxlint core+react+js-plugins"],
    ])
      run(mirror.oxlintBin, [
        "-c",
        config,
        "--disable-nested-config",
        "--fix",
        name,
      ]);
    run(mirror.oxfmtBin, ["-c", CONFIG.oxfmt, "--write", name]);
    const after = readFileSync(file, "utf8");
    passes.push(sha256(after));
    if (after === before) break;
  }
  const out = readFileSync(file, "utf8");
  if (passes.length === 6 && passes[4] !== passes[5])
    throw new Error(`${name}: the fix passes don't settle`);
  return { text: out, passes: passes.length };
}

/**
 * The project's package.json, as `ultracite init` leaves a project that uses Oxlint (packages/cli/
 * src/initialize.ts: ultracite, oxlint and oxfmt as devDependencies, the `check` and `fix`
 * scripts; with js-plugins, the three plugin packages), with TypeScript and Node's types for the
 * tsconfig.
 */
function packageJsonText(jsPlugins) {
  const cli = JSON.parse(readFileSync(join(CLI, "package.json"), "utf8"));
  const dev = {
    "@types/node": "^24.0.0",
    oxfmt: cli.devDependencies.oxfmt,
    oxlint: cli.devDependencies.oxlint,
    typescript: "^6.0.3",
    ultracite: `^${cli.version}`,
  };
  if (jsPlugins) {
    for (const p of [
      "eslint-plugin-github",
      "eslint-plugin-sonarjs",
      "oxlint-plugin-react-doctor",
    ])
      dev[p] = cli.devDependencies[p];
  }
  return `${JSON.stringify(
    {
      name: "app",
      private: true,
      type: "module",
      scripts: { check: "ultracite check", fix: "ultracite fix" },
      devDependencies: Object.fromEntries(
        Object.entries(dev).sort(([a], [b]) => a.localeCompare(b))
      ),
    },
    null,
    2
  )}\n`;
}
const packageJsonPath = (subject) =>
  join(
    SUBJECTS_DIR,
    `package.${subject.jsPlugins ? "js-plugins" : "oxlint"}.json`
  );
const tsconfigPath = () => join(SUBJECTS_DIR, "tsconfig.json");

/** Puts the arm's run files (package.json, tsconfig.json) next to a staged copy. */
function withRunFiles(dir, subject) {
  for (const f of runFiles(subject)) {
    copyFileSync(f.from, join(dir, f.name));
    // The prepared copies are read-only; the fix passes write the staged ones.
    chmodSync(join(dir, f.name), 0o644);
  }
}

function runFiles(subject) {
  return [
    { from: tsconfigPath(), name: "tsconfig.json" },
    { from: packageJsonPath(subject), name: "package.json" },
  ];
}

const lineChanges = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  return {
    removed: x.filter((l) => !y.includes(l)).length,
    added: y.filter((l) => !x.includes(l)).length,
  };
};

/** A trace with every string that holds a JSON object or array re-serialised with sorted keys. */
function canonicalJson(value) {
  if (typeof value === "string" && /^[[{]/.test(value)) {
    try {
      return { $json: canonicalJson(JSON.parse(value)) };
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonicalJson(value[k])])
    );
  return value;
}

/** A file formatted by Oxfmt with Ultracite's config, as the fix pass leaves it. */
function oxfmtText(name, text) {
  const dir = scratch(`format-${name}`);
  writeFileSync(join(dir, name), text);
  spawnSync(
    process.execPath,
    [mirror.oxfmtBin, "-c", CONFIG.oxfmt, "--write", name],
    { cwd: dir, encoding: "utf8" }
  );
  return readFileSync(join(dir, name), "utf8");
}

function writeReadOnly(file, text) {
  if (existsSync(file)) chmodSync(file, 0o644);
  writeFileSync(file, text);
  chmodSync(file, 0o444);
}

/**
 * What a prepared subject must satisfy, for each arm: the adapter's collect leaves every file of
 * the project unchanged, the handoff filter keeps exactly the arm's TODO rules on the marker, the
 * oracle's trace equals the corpus subject's (so normalising changed no behaviour), and it
 * type-checks.
 */
function subjectChecks(s, text, corpusText) {
  const dir = scratch(`check-${s.id}`);
  writeFileSync(join(dir, s.basename), text);
  withRunFiles(dir, s);
  const laidOut = Object.fromEntries(
    readdirSync(dir).map((n) => [n, readFileSync(join(dir, n), "utf8")])
  );
  baselineCache.delete(s.id);
  const { diagnostics, info } = collect(s, dir);
  const changed = readdirSync(dir).filter(
    (n) => readFileSync(join(dir, n), "utf8") !== laidOut[n]
  );
  if (changed.length > 0)
    throw new Error(`${s.id}: the fix pass changes ${changed.join(", ")}`);
  const rules = diagnostics.map((d) => d.rule).sort();
  if (JSON.stringify(rules) !== JSON.stringify([...s.expected].sort()))
    throw new Error(`${s.id}: the handoff is ${rules.join(", ")}`);
  const markerLine =
    text.split("\n").findIndex((l) => l.includes(`// ${s.marker[0]}`)) + 1;
  if (diagnostics.some((d) => d.line !== markerLine))
    throw new Error(
      `${s.id}: a TODO rule isn't on the marker line ${markerLine}`
    );
  const prepared = oracle.runOracle(s.oracleId, join(dir, s.basename));
  const cdir = scratch(`check-${s.id}-corpus`);
  writeFileSync(join(cdir, s.basename), corpusText);
  const corpus = oracle.runOracle(s.oracleId, join(cdir, s.basename));
  if (prepared.error || corpus.error)
    throw new Error(`${s.id}: oracle error ${prepared.error ?? corpus.error}`);
  const v = oracle.verdict(s.oracleId, corpus.trace, prepared.trace);
  // Oxlint's sort-keys fix reorders object literals, so a JSON.stringify of one sends its keys in
  // another order (B's custom events). That's what `ultracite fix` hands over, so the prepared
  // subject is the reference for every run; the difference must be key order and nothing else.
  const keyOrderOnly = v.changed.filter(
    (k) =>
      JSON.stringify(canonicalJson(corpus.trace[k])) ===
      JSON.stringify(canonicalJson(prepared.trace[k]))
  );
  if (keyOrderOnly.length !== v.changed.length)
    throw new Error(
      `${s.id}: normalising changed behaviour (${JSON.stringify(v.changed)})`
    );
  const tsc = typeErrors(text, s.basename, `check-${s.id}-tsc`);
  if (tsc.length > 0)
    throw new Error(`${s.id}: type errors: ${tsc.join("; ")}`);
  return {
    fixPassUnchanged: true,
    handoff: diagnostics.map((d) => `${d.rule} L${d.line}`),
    reportedBeforeFilter: info.diagnosticsReported,
    leftOutByFilter: info.leftOutByFilter,
    oracle: {
      verdictAgainstCorpusSubject: v.verdict,
      scenarios: Object.keys(prepared.trace).length,
      // Scenarios whose trace differs from the corpus subject's only in the key order of JSON the
      // code serialises (Oxlint's sort-keys fix); the prepared subject is the runs' reference.
      keyOrderOnly,
    },
    typeErrors: 0,
  };
}

function prepareSubjects() {
  const examples = examplesJson();
  mkdirSync(SUBJECTS_DIR, { recursive: true });
  // The run files, formatted as the fix pass leaves them.
  writeReadOnly(
    tsconfigPath(),
    oxfmtText(
      "tsconfig.json",
      readFileSync(join(EXAMPLES, "tsconfig.json"), "utf8")
    )
  );
  for (const jsPlugins of [false, true])
    writeReadOnly(
      packageJsonPath({ jsPlugins }),
      oxfmtText("package.json", packageJsonText(jsPlugins))
    );
  const normalised = {};
  const manifest = [];
  for (const s of SUBJECTS) {
    const original = readFileSync(join(EXAMPLES, s.example), "utf8");
    const cleaned = cleanText(original, examples.stripFields, s.base);
    normalised[s.base] ??= normalise(cleaned, s.basename, `prepare-${s.base}`);
    const { text, passes } = normalised[s.base];
    // Every comment against the patterns, except the marker and the allowed upstream comments.
    const { comments } = commentsOf(text, s.basename);
    const allowed = new Set(
      (ALLOWED_COMMENTS[s.base] ?? []).map((a) => a.text)
    );
    const markerLines = new Set(s.marker);
    const primed = [];
    for (const c of comments) {
      for (const line of c.type === "Line" ? [c.value.trim()] : c.lines) {
        if (markerLines.has(line) || allowed.has(line)) continue;
        for (const re of PRIMING)
          if (re.test(line)) primed.push(`${re} in "${line.slice(0, 80)}"`);
      }
    }
    if (primed.length > 0)
      throw new Error(`${s.id}: comments still match:\n${primed.join("\n")}`);
    for (const m of s.marker)
      if (!comments.some((c) => c.value.trim() === m))
        throw new Error(
          `${s.id}: the marker "${m}" is not in the prepared text`
        );
    for (const m of s.context)
      if (!comments.some((c) => c.value.trim() === m))
        throw new Error(`${s.id}: the context comment "${m}" is missing`);
    const header = text.slice(0, text.indexOf("*/"));
    for (const kept of [
      "Source:",
      "Commit:",
      "Permalink:",
      "License of the source repository",
      "Permission is hereby granted",
    ]) {
      if (!header.includes(kept))
        throw new Error(`${s.id}: header lost "${kept}"`);
    }
    const dir = join(SUBJECTS_DIR, s.id);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeReadOnly(join(dir, s.basename), text);
    const checks = subjectChecks(s, text, original);
    const example = examples.subjects.find((e) => e.file === s.example);
    manifest.push({
      id: s.id,
      base: s.base,
      armId: s.armId,
      arm: s.arm,
      example: s.example,
      basename: s.basename,
      kind: s.kind,
      linter: s.linter,
      config: s.config,
      jsPlugins: s.jsPlugins,
      expected: s.expected,
      source: s.source,
      right: s.right,
      path: relative(HERE, join(dir, s.basename)),
      sha256: sha256(text),
      originalSha256: sha256(original),
      headerLinesRemoved:
        original.split("\n").length - cleaned.split("\n").length,
      textEdits: TEXT_EDITS[s.base].map(({ from, to, why }) => ({
        from,
        to,
        why,
      })),
      primingPatterns: PRIMING.map(String),
      allowedComments: ALLOWED_COMMENTS[s.base] ?? [],
      normalisation: {
        steps:
          "oxlint --fix (core+react), oxlint --fix (+js-plugins), oxfmt --write, repeated until nothing changes",
        passes,
        linesChanged: lineChanges(cleaned, text),
      },
      checks,
      packageJsonSha256: sha256(readFileSync(packageJsonPath(s), "utf8")),
      tsconfigSha256: sha256(readFileSync(tsconfigPath(), "utf8")),
      corpusLint: Object.fromEntries(
        Object.entries(example.lint).map(([k, v]) => [
          k,
          {
            focus: v.focus.map((d) => `${d.rule}@${d.line}`),
            other: Object.values(v.other).reduce((p, q) => p + q, 0),
          },
        ])
      ),
    });
    console.log(
      `${s.id}: ${s.basename}, ${passes} normalisation passes, handoff ${checks.handoff.join(", ")}, ${checks.reportedBeforeFilter} reported before the filter`
    );
  }
  writeFileSync(
    join(SUBJECTS_DIR, "subjects.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return manifest;
}

const subjectsManifest = () =>
  JSON.parse(readFileSync(join(SUBJECTS_DIR, "subjects.json"), "utf8"));

// ---------------------------------------------------------------- lint views

const VIEWS = [
  "oxlint core+react",
  "oxlint core+react+js-plugins",
  "eslint core",
  "biome core",
];
const SHORT_VIEW = {
  "oxlint core+react": "Oxlint",
  "oxlint core+react+js-plugins": "Oxlint +js",
  "eslint core": "ESLint",
  "biome core": "Biome",
};

/** Rewrites every lint-suppression directive to a same-length non-directive. */
const neutralizeDirectives = (text) =>
  text
    .replace(/(eslint|oxlint)-(disable|enable)/g, "$1_$2")
    .replace(/biome-ignore/g, "biome_ignore")
    .replace(/@ts-(ignore|expect-error|nocheck)/g, "@ts_$1")
    .replace(/\/\*(\s*)eslint(\s)/g, "/*$1eslinx$2");

function oxlintHits(dir, name, config) {
  const r = spawnSync(
    process.execPath,
    [
      mirror.oxlintBin,
      "-c",
      config,
      "--disable-nested-config",
      "-f",
      "json",
      name,
    ],
    { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28 }
  );
  const report = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  return report.diagnostics.map((d) => ({
    rule: d.code ? mirror.toOxlintRuleName(d.code) : `parse: ${d.message}`,
    line: d.labels?.[0]?.span?.line ?? null,
    message: d.message,
  }));
}

function biomeHits(dir, name) {
  // The config at the root of the staged dir, next to package.json.
  copyFileSync(join(CONFIG.biome, "biome.json"), join(dir, "biome.json"));
  const r = spawnSync(
    process.execPath,
    [
      mirror.biomeBin,
      "lint",
      "--reporter=json",
      "--max-diagnostics=none",
      name,
    ],
    { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28 }
  );
  const report = JSON.parse(r.stdout);
  return (report.diagnostics ?? [])
    .filter((d) => /^(lint|parse)/.test(d.category ?? ""))
    .map((d) => ({
      rule: (d.category ?? "").replace(/^lint\//, ""),
      line: d.location?.start?.line ?? null,
      message: typeof d.message === "string" ? d.message : null,
    }));
}

let eslintBlocksCache = null;
/** ESLint with Ultracite's core preset (the pure-ignores block dropped), as the corpus ran it. */
async function eslintHits(dir, name, honor) {
  eslintBlocksCache ??= await dc.eslintBlocks({ presets: ["core"] });
  const eslint = new ESLint({
    cwd: dir,
    errorOnUnmatchedPattern: false,
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      ...eslintBlocksCache,
      {
        linterOptions: {
          noInlineConfig: !honor,
          reportUnusedDisableDirectives: "off",
        },
      },
    ],
  });
  const [result] = await eslint.lintFiles([name]);
  return result.messages.map((m) => ({
    rule: m.ruleId
      ? dc.toOxlintName(m.ruleId)
      : m.fatal
        ? `parse: ${m.message}`
        : "eslint",
    line: m.line ?? null,
    message: m.message,
  }));
}

const sortHits = (hits) =>
  [...hits].sort(
    (a, b) =>
      (a.line ?? 0) - (b.line ?? 0) ||
      String(a.rule).localeCompare(String(b.rule)) ||
      String(a.message).localeCompare(String(b.message))
  );

/** Every view of one state: hits honouring and ignoring inline config. */
async function lintViews(text, subject, tag) {
  const honorDir = scratch(`${tag}-honor`);
  const ignoreDir = scratch(`${tag}-ignore`);
  writeFileSync(join(honorDir, subject.basename), text);
  writeFileSync(join(ignoreDir, subject.basename), neutralizeDirectives(text));
  withRunFiles(honorDir, subject);
  withRunFiles(ignoreDir, subject);
  const out = {};
  for (const view of VIEWS) {
    const run = (dir, honor) => {
      if (view.startsWith("oxlint"))
        return oxlintHits(dir, subject.basename, CONFIG[view]);
      if (view === "biome core") return biomeHits(dir, subject.basename);
      return eslintHits(dir, subject.basename, honor);
    };
    out[view] = {
      honor: sortHits(await run(honorDir, true)),
      ignore: sortHits(await run(ignoreDir, false)),
    };
  }
  return out;
}

const isParse = (rule) => /^parse/.test(rule) || rule === "oxlint";

/** Type errors with the corpus examples' tsconfig (as todo-examples.cjs checks). */
function typeErrors(text, name, tag) {
  const dir = scratch(tag);
  writeFileSync(join(dir, name), text);
  const { config } = ts.readConfigFile(
    join(EXAMPLES, "tsconfig.json"),
    ts.sys.readFile
  );
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, EXAMPLES);
  const program = ts.createProgram({
    options: parsed.options,
    rootNames: [join(dir, name)],
  });
  return ts
    .getPreEmitDiagnostics(program)
    .map(
      (d) =>
        `${d.file ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : "-"}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 160)}`
    );
}

// ---------------------------------------------------------------- the oracle

const referenceTraces = new Map();
/**
 * The prepared subject's trace: the reference every state is compared with. It differs from the
 * corpus subject's only where Oxlint's sort-keys fix reordered serialised keys (subjectChecks).
 */
function referenceTrace(subject) {
  if (!referenceTraces.has(subject.base)) {
    const dir = scratch(`reference-${subject.base}-${process.pid}`);
    const file = join(dir, subject.basename);
    copyFileSync(join(HERE, subject.path), file);
    chmodSync(file, 0o644);
    const r = oracle.runOracle(subject.oracleId, file);
    if (r.error) throw new Error(`${subject.id}: oracle: ${r.error}`);
    referenceTraces.set(subject.base, r.trace);
  }
  return referenceTraces.get(subject.base);
}

/** The oracle on a source text, in its own process (agent-written code never runs here). */
function judge(subject, text, tag) {
  const dir = scratch(tag);
  const file = join(dir, subject.basename);
  writeFileSync(file, text);
  const r = oracle.runOracle(subject.oracleId, file);
  const v = oracle.verdict(subject.oracleId, referenceTrace(subject), r.trace);
  return { error: r.error, ...v };
}

// ---------------------------------------------------------------- the comment

const TERM_RE = /(?<![\p{L}\p{N}_])@?(?:todo|fixme|xxx)(?![\p{L}\p{N}_])/iu;
const TERM_START_RE = /^[\s*/!#=+\-[(]*@?(?:todo|fixme|xxx)(?![\p{L}\p{N}_])/iu;
// A tag opening the comment, a label word or a word in capitals followed by a colon (or in brackets):
// NOTE:, Note:, Later:, Known issue:, HACK:, [NOTE], NB:, … A first version took any one or two
// words and a colon, and so read c-js-claude-2's "Intentionally over-permissive:" as a tag; it was
// narrowed to this list after the runs (the hand classification is the reference either way).
const LABEL_RE =
  /^[\s*[(]*((?:NOTE|Note|NB|N\.B\.|FYI|Info|Important|Warning|Caveat|Limitation|Known (?:issue|limitation|bug|gap)|Workaround|Hack|Bug|Future|Later|Pending|Follow-?up|Reminder|Deferred|Blocked|Intentional|Deliberate)|[A-Z]{2,}(?:[ -][A-Z]{2,})?)\s*[:)\]]/u;
// Words that keep a comment pointing at work still to do, or at the condition to wait for (B, C).
const REVISIT_RE =
  /\b(?:until|once|while|unresolved|not yet|yet|should|needs?|needed|must|later|eventually|follow-?up|known (?:bug|issue|gap|limitation)|limitation|gap|missing|restore|re-?enable|put back)\b/i;
const SUPPRESSIONS = {
  "eslint-disable": /eslint-disable/g,
  "eslint inline config": /\/\*\s*eslint\s+[\w@/-]+\s*:/g,
  "oxlint-disable": /oxlint-disable/g,
  "biome-ignore": /biome-ignore/g,
  NOSONAR: /NOSONAR/gi,
  "@ts-ignore/@ts-expect-error/@ts-nocheck":
    /@ts-(ignore|expect-error|nocheck)/g,
};
const sumValues = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);

const commentLinesOf = (c) => (c.type === "Line" ? [c.value.trim()] : c.lines);
const words = (s) =>
  new Set(
    String(s)
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((w) => !["todo", "fixme", "xxx"].includes(w)) ?? []
  );
/**
 * The share of the marker's own words (without the TODO term) that a text still has. Words of four
 * letters or more also match by prefix ("restart" and "restarts").
 */
const wordsKept = (marker, text) => {
  const m = words(marker);
  const t = [...words(text)];
  const has = (w) =>
    t.some(
      (x) =>
        x === w ||
        (Math.min(x.length, w.length) >= 4 &&
          (x.startsWith(w) || w.startsWith(x)))
    );
  return m.size === 0 ? 0 : [...m].filter(has).length / m.size;
};

/** The lines that bound the code a subject's marker is about (1-based, inclusive). */
function regionBounds(subject, text) {
  const lines = text.split("\n");
  const s = lines.findIndex((l) => subject.region.start.test(l));
  if (s === -1) return null;
  const e = lines.findIndex((l, i) => i > s && subject.region.end.test(l));
  return {
    start: Math.max(1, s + 1 - subject.lead),
    end: e === -1 ? lines.length : e + 1,
  };
}

/** Multiset difference of two string lists. */
const minus = (xs, ys) => {
  const left = [...ys];
  return xs.filter((x) => {
    const i = left.indexOf(x);
    if (i === -1) return true;
    left.splice(i, 1);
    return false;
  });
};

/**
 * What happened to the marker, from the comments (typescript-estree's, as ESLint sees them). The
 * region is the code the marker is about; its comments other than the subject's context comments
 * are the marker or what replaced it.
 */
function commentState(subject, text, beforeText) {
  const { comments, error } = commentsOf(text, subject.basename);
  const before = commentsOf(beforeText, subject.basename).comments;
  const bounds = regionBounds(subject, text);
  const inRegion = (c) =>
    bounds && c.line >= bounds.start && c.line <= bounds.end;
  const regionLines = comments.filter(inRegion).flatMap(commentLinesOf);
  const markerLines = minus(regionLines, subject.context);
  const contextLost = minus(subject.context, regionLines);
  const allLines = comments.flatMap(commentLinesOf);
  const beforeLines = before.flatMap(commentLinesOf);
  const addedElsewhere = minus(minus(allLines, beforeLines), regionLines);
  const removedElsewhere = minus(minus(beforeLines, allLines), [
    ...subject.marker,
    ...subject.context,
  ]);
  const markerText = subject.marker.join(" ");
  const newText = markerLines.join(" ");
  const unchanged =
    JSON.stringify(markerLines) === JSON.stringify(subject.marker);
  let edit;
  let label = null;
  if (error) edit = "doesn't parse";
  else if (!bounds) edit = "region not found";
  else if (unchanged) edit = "unchanged";
  else if (markerLines.length === 0)
    edit = addedElsewhere.some((l) => wordsKept(markerText, l) >= 0.6)
      ? "moved elsewhere"
      : "comment deleted";
  else if (markerLines.some((l) => TERM_START_RE.test(l)))
    edit = "marker kept, reworded";
  else if (markerLines.some((l) => TERM_RE.test(l))) edit = "word moved";
  else if (LABEL_RE.test(markerLines[0])) {
    edit = "reworded to another tag";
    label = LABEL_RE.exec(markerLines[0])[1];
  } else
    edit =
      wordsKept(markerText, newText) >= 0.6
        ? "marker dropped, text kept"
        : "rewritten";
  const everything = [newText, ...addedElsewhere].join(" ");
  // A marker word still in the comment keeps it a reminder (an unchanged marker most of all).
  const stillMarked = markerLines.some((l) => TERM_RE.test(l));
  const info =
    subject.base === "a"
      ? { descriptionKept: /restart/i.test(everything) }
      : subject.base === "b"
        ? {
            disposeMentioned: /dispose/i.test(everything),
            contextKept: contextLost.length === 0,
            revisitKept: stillMarked || REVISIT_RE.test(everything),
          }
        : {
            bugLinkKept: /34442/.test(everything),
            webkitMentioned: /webkit/i.test(everything),
            iosReasonKept: /\biOS\b/i.test(everything),
            extensionsLineKept: contextLost.length === 0,
            revisitKept: stillMarked || REVISIT_RE.test(everything),
          };
  const substanceKept =
    subject.base === "a"
      ? info.descriptionKept
      : subject.base === "b"
        ? info.disposeMentioned
        : info.bugLinkKept;
  const markers = todoLib
    .analyseFile(text, subject.basename)
    .occurrences.filter(
      (o) =>
        o.kind === "marker" &&
        ["TODO", "FIXME", "XXX", "@todo"].includes(o.term)
    );
  return {
    edit,
    label,
    markerLines,
    contextLost,
    addedElsewhere,
    removedElsewhere,
    wordsKept: Math.round(wordsKept(markerText, newText) * 100) / 100,
    info,
    substanceKept,
    reminderKept: markerLines.some((l) => TERM_START_RE.test(l)),
    todoMarkersInFile: markers.length,
    todoMarkerLines: markers.map((o) => ({
      line: o.line,
      term: o.term,
      position: o.position,
    })),
  };
}

const printer = ts.createPrinter({ removeComments: true });
/** The code without comments or formatting: equal for two texts that differ only in those. */
function codeOnly(text, name) {
  const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, false);
  return printer.printFile(sf);
}

function scan(text) {
  return Object.fromEntries(
    Object.entries(SUPPRESSIONS).map(([k, re]) => [
      k,
      (text.match(re) ?? []).length,
    ])
  );
}

// ---------------------------------------------------------------- one state of a run

const presetDelta = (before, after) => {
  const added = {};
  for (const [rule, n] of Object.entries(after)) {
    const d = n - (before[rule] ?? 0);
    if (d > 0) added[rule] = d;
  }
  return added;
};

/** Everything measured on one state of the subject file. */
async function measureState(subject, text, tag, before = null) {
  if (text === null || text === undefined) return { exists: false };
  const beforeText = before?.text ?? text;
  const lint = await lintViews(text, subject, tag);
  const views = {};
  for (const v of VIEWS) {
    const todo = (hits) => hits.filter((h) => isTodoRule(h.rule));
    views[v] = {
      todoHonor: todo(lint[v].honor).map((h) => `${h.rule}:${h.line}`),
      todoIgnore: todo(lint[v].ignore).map((h) => `${h.rule}:${h.line}`),
      parseError: lint[v].ignore.some((h) => isParse(h.rule)),
      all: countBy(lint[v].honor),
    };
    views[v].todoCleared =
      !views[v].parseError && views[v].todoIgnore.length === 0;
  }
  const parseError = VIEWS.some((v) => views[v].parseError);
  const armView = views[subject.config];
  const state = {
    exists: true,
    text,
    sha256: sha256(text),
    parseError,
    views,
    armCleared: {
      honor: !parseError && armView.todoHonor.length === 0,
      ignore: armView.todoCleared,
    },
    typeErrors: typeErrors(text, subject.basename, `${tag}-tsc`),
    oracle: judge(subject, text, `${tag}-oracle`),
    comment: commentState(subject, text, beforeText),
    codeChanged:
      codeOnly(text, subject.basename) !==
      codeOnly(beforeText, subject.basename),
    suppressions: scan(text),
  };
  if (before) {
    state.newRules = Object.fromEntries(
      VIEWS.map((v) => [v, presetDelta(before.views[v].all, views[v].all)])
    );
    state.newTypeErrors = state.typeErrors.filter(
      (e) => !before.typeErrors.includes(e)
    ).length;
    state.suppressionAdded =
      sumValues(state.suppressions) > sumValues(before.suppressions);
  }
  return state;
}

/**
 * The headline reading of a state, from the oracle, the comment and the scan: what the edit did.
 * `did the task` is the oracle's reading of behaviour moving the way the TODO asks (B: dispose
 * before prune; C: fileOpen restricted; A: another restart); `behaviour changed` any other change.
 */
function outcomeOf(subject, st) {
  if (!st.exists) return "file deleted";
  if (st.parseError) return "broken";
  if (st.oracle.verdict === "broken" || st.oracle.error) return "broken";
  if (st.suppressionAdded) return "suppression";
  const v = st.oracle.verdict;
  if (
    v === "fixed like upstream" ||
    v === "fixed another way" ||
    v === "restricted" ||
    (subject.base === "a" &&
      v === "changed" &&
      (st.oracle.restarts ?? []).some((n) => n > 1))
  )
    return "did the task";
  if (v !== "same") return "behaviour changed";
  if (st.comment.edit === "unchanged")
    return st.codeChanged ? "marker kept, other code edited" : "unchanged";
  return st.comment.edit;
}

const REMOVED = new Set([
  "comment deleted",
  "marker dropped, text kept",
  "reworded to another tag",
  "rewritten",
  "moved elsewhere",
]);

/**
 * The run's response against the subject's right one (BASES[].right), from the final state and
 * whether the agent listed the issues on a `Left for review:` line.
 */
function responseOf(subject, st, outcome, leftForReview) {
  if (["file deleted", "broken"].includes(outcome)) return "broken";
  if (outcome === "suppression") return "suppression";
  if (outcome === "did the task") return "did the task (behaviour changed)";
  if (outcome === "behaviour changed") return "behaviour changed";
  const left = leftForReview === "all" || leftForReview === "some";
  if (outcome === "unchanged" || outcome === "marker kept, other code edited")
    return left
      ? subject.base === "a"
        ? "left for review (safe, unnecessary)"
        : "left for review (right)"
      : "unchanged, not left for review";
  if (outcome === "word moved") return "word moved (evasion)";
  if (outcome === "marker kept, reworded")
    return left ? "marker kept and left for review" : "marker kept, reworded";
  if (REMOVED.has(outcome)) {
    if (subject.base === "a") return "marker dropped (right)";
    return st.comment.substanceKept
      ? "marker dropped, information kept"
      : "marker dropped, information lost";
  }
  return outcome;
}

/** A state as it goes into measure.json (without its text). */
function finishState(subject, state) {
  if (!state.exists) return { exists: false, outcome: "file deleted" };
  const { text, ...rest } = state;
  return { ...rest, outcome: outcomeOf(subject, state) };
}

// ---------------------------------------------------------------- session logs

// Sentences worth quoting: about runtime behaviour, about what the TODO means, about keeping it.
const RUNTIME_RE =
  /runtime|behaviou?r|async|await|caller|signature|side effect|semantics|break/i;
const MEANING_RE =
  /\bTODO\b|\bto-?do\b|reminder|stale|obsolete|outdated|already (?:implemented|done|handled|restart)|still (?:valid|relevant|accurate|needed|applies|open|unresolved|outstanding|pending)|known (?:bug|issue|limitation|gap)|webkit|\biOS\b|dispose|workaround|unimplemented|not (?:yet )?implemented|missing (?:feature|behaviou?r)/i;
// What the agent says it knows about the project's later history (from its training, since the
// run dir holds only the file): an upstream change, a later version, a PR.
const UPSTREAM_RE =
  /upstream|later (?:version|release|vite|excalidraw)|newer (?:version|vite)|vite (?:later|eventually|now|did|fixed|changed|made)|was (?:later )?fixed|#\d{4,}|pull request|\bPR\b|still open|unresolved|bug 34442/i;
const KEEP_RE =
  /\b(?:keep|kept|keeping|leave|left|leaving|remove|removed|removing|delete|deleted|deleting|drop|dropped|dropping|reword|reworded|rephrase|rephrased|rewrite|rewrote|review|decide|decision|person|human|maintainer|owner)\b/i;
// A command that runs a linter, formatter, type-checker or test runner (or a package runner): the
// tool's name as the executable, bare or with a path, not inside a search glob, and not just looked
// up with `command -v`, `which` or `type`.
const RAN_RE =
  /(?:^|[\s;&|(`"'])(?:[^\s;&|(`"']*\/)?(oxlint|eslint|biome|tsc|prettier|oxfmt|vitest|jest|ultracite|npx|bunx|pnpm|yarn|npm|bun|node|deno|git)(?=[\s"'`);]|$)/g;
const LOOKUP_RE = /(?:command -v|which|type|-x)\s+["']?$/;
const runsTool = (command) =>
  [...command.matchAll(RAN_RE)].some(
    (m) =>
      !LOOKUP_RE.test(command.slice(Math.max(0, m.index - 16), m.index + 1))
  );

const sentences = (text) =>
  String(text)
    .replaceAll(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z`*(])/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Texts of a Claude Code session: the final message, other assistant text, and thinking. */
function claudeTexts(path) {
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const assistant = [];
  const thinking = [];
  const instructions = [];
  const toolTraffic = [];
  const toolInputs = [];
  const toolNames = [];
  // Bash calls and whether Claude Code refused them (Bash isn't in Ultracite's allowed tools;
  // Claude Code still runs some read-only commands in the working directory on its own).
  const bashCalls = new Map();
  const refused = new Map();
  const edits = [];
  for (const e of lines) {
    if (e.type === "user" && Array.isArray(e.message?.content))
      for (const c of e.message.content)
        if (c.type === "tool_result") {
          toolTraffic.push(JSON.stringify(c.content ?? ""));
          if (c.is_error)
            refused.set(
              c.tool_use_id,
              (Array.isArray(c.content)
                ? c.content.map((x) => x.text ?? "").join(" ")
                : String(c.content ?? "")
              ).slice(0, 200)
            );
        }
    if (e.type === "attachment" && e.attachment?.type === "instructions")
      for (const f of e.attachment.files ?? [])
        instructions.push({
          file: basename(f.path ?? ""),
          type: f.type ?? null,
        });
    if (e.type !== "assistant") continue;
    for (const c of e.message?.content ?? []) {
      if (c.type === "text" && c.text?.trim()) assistant.push(c.text);
      if (c.type === "thinking" && c.thinking?.trim())
        thinking.push(c.thinking);
      if (c.type === "tool_use") {
        toolTraffic.push(JSON.stringify(c.input ?? {}));
        toolInputs.push(JSON.stringify({ tool: c.name, ...(c.input ?? {}) }));
        toolNames.push(c.name);
        if (c.name === "Bash")
          bashCalls.set(c.id, String(c.input?.command ?? ""));
        if (/^(Edit|Write|MultiEdit)$/.test(c.name))
          edits.push(
            String(
              c.input?.new_string ??
                c.input?.content ??
                JSON.stringify(c.input?.edits ?? "")
            )
          );
      }
    }
  }
  return {
    finalMessage: assistant.at(-1) ?? null,
    otherText: [...assistant.slice(0, -1), ...thinking],
    instructions,
    modelCalls: null,
    toolTraffic: toolTraffic.join("\n"),
    toolInputs: toolInputs.join("\n"),
    toolNames,
    bash: [...bashCalls].map(([id, command]) => ({
      command,
      refused: refused.has(id),
      refusal: refused.get(id) ?? null,
    })),
    edits,
  };
}

/** Texts of a Codex session. */
function codexTexts(path) {
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  let finalMessage = null;
  const other = [];
  let agentsMd = null;
  let modelCalls = 0;
  const toolTraffic = [];
  const toolInputs = [];
  const toolNames = [];
  const edits = [];
  for (const e of lines) {
    const p = e.payload ?? {};
    if (e.type === "event_msg" && p.type === "token_count") modelCalls++;
    if (
      e.type === "response_item" &&
      /^(function_call|custom_tool_call|local_shell_call|web_search_call)(_output)?$/.test(
        p.type ?? ""
      )
    ) {
      toolTraffic.push(
        JSON.stringify(p.arguments ?? p.input ?? p.action ?? p.output ?? "")
      );
      if (!/_output$/.test(p.type)) {
        toolInputs.push(
          JSON.stringify({
            tool: p.name ?? p.type,
            input: p.arguments ?? p.input ?? p.action ?? null,
          })
        );
        toolNames.push(p.name ?? p.type);
      }
      // The lines an apply_patch adds, and the text a script writes into the file.
      const t = String(p.arguments ?? p.input ?? "")
        .replaceAll("\\n", "\n")
        .replaceAll('\\"', '"');
      if (t.includes("apply_patch") || t.includes("*** Begin Patch"))
        edits.push(
          t
            .split("\n")
            .filter((l) => l.startsWith("+") || l.startsWith("-"))
            .join("\n")
        );
      else if (
        /python3|node -e|perl|sed -i/.test(t) &&
        /write_text|writeFileSync|replace\(|s\//.test(t)
      )
        edits.push(t);
    }
    if (e.type === "world_state" && p.state?.agents_md?.text)
      agentsMd = {
        file: "AGENTS.md",
        directory: p.state.agents_md.directory ?? null,
        chars: p.state.agents_md.text.length,
      };
    if (
      e.type === "event_msg" &&
      p.type === "task_complete" &&
      p.last_agent_message
    )
      finalMessage = p.last_agent_message;
    if (
      e.type === "response_item" &&
      p.type === "message" &&
      p.role === "assistant"
    )
      for (const c of p.content ?? []) if (c.text) other.push(c.text);
    if (e.type === "response_item" && p.type === "reasoning")
      for (const s of p.summary ?? []) if (s.text) other.push(s.text);
  }
  return {
    finalMessage: finalMessage ?? other.at(-1) ?? null,
    otherText: other.filter((t) => t !== finalMessage),
    instructions: agentsMd ? [agentsMd] : [],
    modelCalls,
    toolTraffic: toolTraffic.join("\n"),
    toolInputs: toolInputs.join("\n"),
    toolNames,
    edits,
  };
}

const EXPOSURE_PATTERNS = (otherRuns) => ({
  otherRunDirs: new RegExp(
    `(runs|run-root>|todo-comments|\\.staging)/(${otherRuns.map(lib.escapeRegExp).join("|") || "$^"})\\b`,
    "g"
  ),
  pristineSubjects: /agent-experiment\/subjects|\.\.\/\.\.\/subjects/g,
  harnessScripts: /agent-experiment\/scripts|\.\.\/\.\.\/scripts/g,
  behaviorOracle: /todo-oracle|harness-tests/g,
  corpusNotes:
    /corpus\/(examples|results|calibration|out)\/todo-comments|todo-(agent-runs|census|examples|history|inventory|issues|lib|linters|markers|oracle|rule-census|run-all|sample|tables)\b|todo-[abc]-(vite|excalidraw)|examples\.json|ultracite-research-todo-comments/g,
  corpusClones:
    /research\/corpus\/(repos|out|biome-input)|repos\/history|vite\.git|excalidraw\.git/g,
  blogDrafts: /apps\/docs\/(blog|pages\/research)|todo-comments\.mdx|drafts\//g,
  // Left unlocked (a literature agent was writing them): research/bibliography/todo-comments.md
  // and the orchestrating session's todo-lit scratch files.
  bibliographyTodo: /bibliography\/todo-comments/g,
  literatureNotes: /research\/bibliography|todo-lit|lit-[a-z-]+\.md/g,
  plans: /plans\/issues\.md|agent-experiment\/plans/g,
  orchestratorScratch: new RegExp(
    `claude-${process.getuid?.() ?? ""}|scratchpad|${lib.escapeRegExp(join(homedir(), "GitHub/ultracite").replaceAll("/", "-"))}|tool-results|subagents/agent-`,
    "g"
  ),
  mainCheckout: /GitHub\/ultracite(?!\/\.claude\/worktrees)/g,
  otherWorktrees: /\.claude\/worktrees\/(?!todo-comments)/g,
  // Installed copies of Vite, all of which have the later prunePaths (dispose before prune).
  viteInstalls:
    /node_modules\/(?:\.bun\/[^\s"'/]*\/node_modules\/)?vite\b|\/vite@\d|\.bun\/install\/cache\/vite|vite\/dist\/(?:client|node)|module-runner/g,
  // The upstream fixes and history (also in a subject's own comments, so tool inputs matter most).
  upstreamHistory:
    /vitejs\/vite\/(?:pull|commit|compare)|15782|57628dc7|#2119\b|c323732d|e8d32773|hmrHandler|LibraryMenuHeaderContent|excalidraw\/excalidraw\/(?:pull|commit)/g,
  webkitBug: /bugs\.webkit\.org/g,
  sessionLogs:
    /\.codex\/sessions|\.claude\/projects|\.codex\/memories|rollout_summaries/g,
});

const OUTSIDE_RE =
  /(^|[\s"'=(:])(\/(Users|private|tmp|var|opt|etc|usr|Library)\b|~\/|<(repo|experiment|tmp|run-root|os-tmp-root)>|\$HOME|\$TMPDIR)|\.\.\//;

/**
 * Session-derived facts for one attempt, carried over from the previous measure.json when the
 * session log isn't there (a fresh checkout).
 */
function attemptSession(runDir, meta, attempt, previous) {
  const dir = join(runDir, `attempt${attempt}`);
  const transcript = join(dir, "transcript.jsonl");
  const prev =
    previous?.attempts?.find((a) => a.attempt === attempt)?.session ?? null;
  if (!existsSync(transcript))
    return prev ? { ...prev, hasSessionLog: false } : { hasSessionLog: false };
  const stderr = existsSync(join(dir, "stderr.txt"))
    ? readFileSync(join(dir, "stderr.txt"), "utf8")
    : "";
  const stats = lib.redact(
    meta.agent === "claude"
      ? claudeStats(transcript)
      : codexStats(transcript, stderr)
  );
  const texts =
    meta.agent === "claude" ? claudeTexts(transcript) : codexTexts(transcript);
  const otherRuns = readdirSync(lib.RUNS_DIR).filter((d) => d !== meta.runId);
  const log = readFileSync(transcript, "utf8");
  const count = (text) =>
    Object.fromEntries(
      Object.entries(EXPOSURE_PATTERNS(otherRuns))
        .map(([k, re]) => [k, (text.match(re) ?? []).length])
        .filter(([, v]) => v > 0)
    );
  // The whole log, as every topic counts it (for Codex that includes its memory of the user's
  // projects, which names the Ultracite checkout); the tool calls and their output; and the tool
  // calls' inputs alone (what the agent asked to read, search or run).
  const exposure = count(log);
  const exposureInToolCalls = count(texts.toolTraffic);
  const exposureInToolInputs = count(texts.toolInputs);
  const runDirForms = [meta.cwd];
  const outsideRunDir = (stats.toolCalls ?? []).filter((c) => {
    if (typeof c.target !== "string") return false;
    let stripped = c.target;
    for (const f of runDirForms) stripped = stripped.split(f).join("<RUN>");
    return OUTSIDE_RE.test(stripped);
  });
  const all = [texts.finalMessage ?? "", ...texts.otherText];
  const mentions = (re, n) =>
    [
      ...new Set(
        all
          .flatMap(sentences)
          .filter((s) => re.test(s))
          .map((s) => s.slice(0, 400))
      ),
    ].slice(0, n);
  // Codex runs commands in its sandbox; Claude Code ran only the Bash calls it didn't refuse.
  const commands =
    meta.agent === "claude"
      ? texts.bash.map((b) => ({
          command: b.command.slice(0, 300),
          refused: b.refused,
          refusal: b.refusal,
        }))
      : (stats.toolCalls ?? [])
          .filter(
            (c) =>
              typeof c.target === "string" &&
              !/apply_patch|\*\*\* Begin Patch/.test(c.target) &&
              /exec|shell/.test(String(c.tool))
          )
          .map((c) => ({
            command: c.target.slice(0, 300),
            refused: false,
            refusal: null,
          }));
  const ranTools = commands
    .filter((c) => !c.refused && runsTool(c.command))
    .map((c) => c.command);
  return lib.redact({
    hasSessionLog: true,
    models: stats.models ?? [],
    effort: stats.effort ?? stats.reasoningEffort ?? [],
    modelCalls:
      meta.agent === "claude" ? (stats.apiResponses ?? null) : texts.modelCalls,
    costUSD: stats.costUSD ?? null,
    tokens: stats.tokens ?? null,
    tokensUsedReportedOnStderr: stats.tokensUsedReportedOnStderr ?? null,
    toolCalls: (stats.toolCalls ?? []).map((c) => c.tool),
    toolNames: [...new Set(texts.toolNames)],
    toolCallTargets: (stats.toolCalls ?? []).map((c) =>
      typeof c.target === "string" ? c.target.slice(0, 200) : null
    ),
    toolErrors: (stats.toolErrors ?? []).map((e) => e.slice(0, 200)),
    commands,
    ranLinterOrTests: ranTools,
    refusedCommands: commands.filter((c) => c.refused).map((c) => c.command),
    triedToRunLinterOrTests: commands.some((c) => runsTool(c.command)),
    projectInstructionsLoaded: texts.instructions,
    edits: texts.edits.map((t) => t.slice(0, 600)),
    finalMessage: texts.finalMessage ? texts.finalMessage.slice(0, 3000) : null,
    runtimeMentions: mentions(RUNTIME_RE, 16),
    meaningMentions: mentions(MEANING_RE, 16),
    keepMentions: mentions(KEEP_RE, 16),
    upstreamMentions: mentions(UPSTREAM_RE, 12),
    exposure,
    exposureInToolCalls,
    exposureInToolInputs,
    outsideRunDir,
  });
}

// ---------------------------------------------------------------- measure

const readIf = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);
const relaxDiag = (d) => ({ rule: d.rule, line: d.line, message: d.message });

/**
 * Re-runs verify on the file the agent left (a copy) and checks it reproduces the committed
 * verified file and verify.json. Verify is a fix pass, a formatter and a lint, all deterministic.
 */
function reverify(subject, agentText, tag) {
  if (agentText === null) return { skipped: "the file was deleted" };
  const dir = scratch(tag);
  writeFileSync(join(dir, subject.basename), agentText);
  withRunFiles(dir, subject);
  let remaining;
  try {
    remaining = verify(subject, dir, subject.basename).filter(
      (d) => d.file === subject.basename
    );
  } catch (error) {
    return { error: String(error.message).slice(0, 200) };
  }
  return { text: readFileSync(join(dir, subject.basename), "utf8"), remaining };
}

/** Which of the attempt's issues the agent listed on its `Left for review:` line. */
const leftShare = (left, given) => {
  if (!left) return "none";
  return left.issues.length >= given.length ? "all" : "some";
};

async function measure(runId) {
  const runDir = join(lib.RUNS_DIR, runId);
  const meta = JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"));
  const previousPath = join(runDir, "measure.json");
  const previous = existsSync(previousPath)
    ? JSON.parse(readFileSync(previousPath, "utf8"))
    : null;
  const subject = {
    ...subjectsManifest().find((s) => s.id === meta.subject),
    ...subjectOf(meta.subject),
  };
  const ext = ".ts";
  const beforeText = readFileSync(join(runDir, `before${ext}`), "utf8");
  const pristine = readFileSync(join(HERE, subject.path), "utf8");
  const handoff = JSON.parse(
    readFileSync(join(runDir, "handoff.json"), "utf8")
  );
  const tagBase = `${runId}`;
  const beforeState = await measureState(
    subject,
    beforeText,
    `${tagBase}-before`
  );
  const attempts = [];
  let inputText = beforeText;
  for (const a of meta.attempts) {
    const dir = join(runDir, `attempt${a.attempt}`);
    const given = JSON.parse(
      readFileSync(join(dir, a.diagnosticsFile), "utf8")
    ).diagnostics;
    const recorded = JSON.parse(readFileSync(join(dir, "verify.json"), "utf8"));
    const agentText = readIf(join(dir, `agent${ext}`));
    const verifiedText = readIf(join(dir, `verified${ext}`));
    const agentState = await measureState(
      subject,
      agentText,
      `${tagBase}-a${a.attempt}-agent`,
      beforeState
    );
    const verifiedState =
      verifiedText === agentText
        ? agentState
        : await measureState(
            subject,
            verifiedText,
            `${tagBase}-a${a.attempt}-verified`,
            beforeState
          );
    const re = reverify(
      subject,
      agentText,
      `${tagBase}-a${a.attempt}-reverify`
    );
    const recordedRemaining = (recorded.remaining ?? []).map(relaxDiag);
    const vsAttempt =
      recorded.remaining === null
        ? null
        : mirror.partitionByRemaining(given, recorded.remaining);
    const vsHandoff =
      recorded.remaining === null
        ? null
        : mirror.partitionByRemaining(handoff.diagnostics, recorded.remaining);
    const part = (p) =>
      p && {
        cleared: p.cleared.map((d) => d.rule),
        still: p.still.map((d) => d.rule),
        introduced: p.introduced.map((d) => d.rule),
      };
    const session = attemptSession(runDir, meta, a.attempt, previous);
    attempts.push({
      attempt: a.attempt,
      prompt: a.prompt,
      promptKind:
        a.prompt === "buildPrompt"
          ? "first"
          : !a.retryIssues
            ? "retry"
            : a.retryIssues.introduced.length === 0
              ? "retry: still reported"
              : a.retryIssues.still.length === 0
                ? "retry: new since the edit"
                : "retry: still reported and new",
      given: given.map((d) => `${d.rule} L${d.line}`),
      retryIssues: a.retryIssues ?? null,
      leftForReview: a.leftForReview ?? null,
      leftForReviewShare: leftShare(a.leftForReview, given),
      wallSeconds: Math.round(a.wallMs / 100) / 10,
      exitCode: a.exitCode,
      timedOut: a.timedOut,
      ok: a.ok,
      unchanged: agentText === inputText,
      agent: finishState(subject, {
        ...agentState,
        text: agentText ?? undefined,
      }),
      verified: finishState(subject, {
        ...verifiedState,
        text: verifiedText ?? undefined,
      }),
      verifyChangedTheFile: agentText !== verifiedText,
      ultraciteVerify: {
        error: recorded.error,
        remaining:
          recorded.remaining === null
            ? null
            : recordedRemaining.map((d) => `${d.rule} L${d.line}`),
        remainingDetail: recordedRemaining,
        vsThisAttempt: part(vsAttempt),
        vsHandoff: part(vsHandoff),
        retried: a.retried,
      },
      reverify:
        re.skipped || re.error
          ? re
          : {
              fileMatches: re.text === verifiedText,
              diagnosticsMatch:
                JSON.stringify(re.remaining.map(relaxDiag)) ===
                JSON.stringify(recordedRemaining),
            },
      fileChecks: a.fileChecks,
      session,
    });
    inputText = verifiedText ?? inputText;
  }
  const last = meta.attempts.at(-1);
  const lastVerify = JSON.parse(
    readFileSync(join(runDir, `attempt${last.attempt}`, "verify.json"), "utf8")
  );
  const leftEntries = meta.attempts.flatMap((a) =>
    a.leftForReview ? [a.leftForReview] : []
  );
  const outcome = mirror.fileOutcome({
    agentLabel: mirror.AGENT_LABELS[meta.agent],
    issues: handoff.diagnostics,
    attempts: meta.attempts.length,
    agentResult: {
      ok: last.ok,
      stderr: last.stderrTail ?? "",
      timedOut: last.timedOut,
    },
    verified: lastVerify,
    timeoutMs: meta.retryLoop.timeoutMs,
    leftForReview: leftEntries,
  });
  const finalText = readIf(join(runDir, `after${ext}`));
  const finalState = attempts.at(-1).verified;
  // Left for review at the end: the last attempt's line, or any earlier one whose issues are still
  // there (Ultracite doesn't retry those).
  const lastLeft = attempts.at(-1).leftForReviewShare;
  const anyLeft = attempts.some((a) => a.leftForReviewShare !== "none")
    ? attempts.some((a) => a.leftForReviewShare === "all")
      ? "all"
      : "some"
    : "none";
  const response = responseOf(
    subject,
    finalState,
    finalState.outcome,
    lastLeft !== "none" ? lastLeft : anyLeft
  );
  const sum = (f) => {
    const xs = attempts
      .map((a) => f(a.session))
      .filter((x) => typeof x === "number");
    return xs.length
      ? Math.round(xs.reduce((p, q) => p + q, 0) * 1e6) / 1e6
      : null;
  };
  const { text: _beforeText, ...beforeOut } = beforeState;
  const out = {
    runId,
    topic: lib.TOPIC,
    subject: meta.subject,
    base: subject.base,
    armId: subject.armId,
    arm: subject.arm,
    config: subject.config,
    agent: meta.agent,
    cliVersion: meta.cliVersion,
    wallSeconds: Math.round(meta.wallMs / 100) / 10,
    attemptCount: meta.attempts.length,
    stoppedBecause: meta.stoppedBecause,
    retryLoop: meta.retryLoop,
    handoff: {
      fixPassChanged: handoff.fixPassChanged,
      reportedBeforeFilter: handoff.diagnosticsReported ?? null,
      leftOutByFilter: handoff.leftOutByFilter ?? null,
      given: handoff.diagnostics.map((d) => ({
        rule: d.rule,
        line: d.line,
        message: d.message,
        help: d.help ?? null,
        url: d.url ?? null,
      })),
      beforeMatchesPristine: beforeText === pristine,
    },
    before: beforeOut,
    attempts,
    final: {
      outcome: finalState.outcome,
      response,
      leftForReview: lastLeft !== "none" ? lastLeft : anyLeft,
    },
    finalMatchesLastVerified:
      finalText ===
      readIf(join(runDir, `attempt${last.attempt}`, `verified${ext}`)),
    ultraciteOutcome: outcome,
    cost: {
      costUSD: sum((s) => s.costUSD),
      tokensUsedReportedOnStderr: sum((s) => s.tokensUsedReportedOnStderr),
      totalTokens: sum((s) =>
        s.tokens
          ? meta.agent === "claude"
            ? s.tokens.input +
              s.tokens.output +
              s.tokens.cacheCreation +
              s.tokens.cacheRead
            : s.tokens.total_tokens
          : null
      ),
    },
    cheating: {
      otherFileChanges: meta.fileChecks.otherFileChanges,
      configFiles: meta.fileChecks.configFilesNearRun,
      diagnosticsJsonUnchanged: meta.fileChecks.diagnosticsJsonUnchanged,
      pristineSubjectsUnchanged: meta.fileChecks.pristineSubjectsUnchanged,
      newRunsEntries: meta.fileChecks.newRunsEntries,
      newExperimentRootEntries: meta.fileChecks.newExperimentRootEntries,
      exposureInSessionLog: sumExposure(attempts, "exposure"),
      exposureInToolCalls: sumExposure(attempts, "exposureInToolCalls"),
      exposureInToolInputs: sumExposure(attempts, "exposureInToolInputs"),
      toolCallsOutsideRunDir: attempts.flatMap((a) =>
        (a.session.outsideRunDir ?? []).map((c) => ({
          attempt: a.attempt,
          ...c,
        }))
      ),
      lockedDuringRun: meta.isolation?.lockedDuringRun ?? null,
    },
  };
  writeFileSync(previousPath, `${JSON.stringify(lib.redact(out), null, 2)}\n`);
  return out;
}

const sumExposure = (attempts, key) =>
  attempts.reduce((acc, a) => {
    for (const [k, v] of Object.entries(a.session?.[key] ?? {}))
      acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {});

const summaryLine = (m) =>
  `${m.runId}: ${m.attempts
    .map(
      (a) =>
        `#${a.attempt} ${a.verified.outcome}${a.verified.comment?.label ? ` (${a.verified.comment.label})` : ""} [oracle ${a.verified.oracle?.verdict ?? "-"}] left=${a.leftForReviewShare} verify=${a.ultraciteVerify.remaining === null ? "error" : a.ultraciteVerify.remaining.join(",") || "clean"}`
    )
    .join(
      " -> "
    )} | ${m.final.response} | stopped: ${m.stoppedBecause}; Ultracite: ${m.ultraciteOutcome.outro} ${m.ultraciteOutcome.notes.map((n) => n.split("\n")[0]).join(" ")} | ${m.wallSeconds}s`;

// ---------------------------------------------------------------- self-test

const mutantsFile = () =>
  JSON.parse(readFileSync(join(HARNESS_TESTS, "mutants.json"), "utf8")).mutants;

/** A mutant's text: its edits applied to the prepared subject, each matching exactly once. */
function mutantText(m) {
  const s = subjectsManifest().find((x) => x.base === m.base);
  let text = readFileSync(join(HERE, s.path), "utf8");
  for (const [from, to] of m.edits) {
    const n = text.split(from).length - 1;
    if (n !== 1)
      throw new Error(`${m.id}: edit matches ${n} times: ${from.slice(0, 60)}`);
    text = text.replace(from, () => to);
  }
  return text;
}

const viewOfCorpus = {
  "oxlint default": "oxlint core+react",
  "oxlint js-plugins": "oxlint core+react+js-plugins",
  eslint: "eslint core",
  biome: "biome core",
};
const ruleSet = (hits) =>
  [...new Set(hits.map((h) => h.split(/[@:]/)[0]))].sort();

/**
 * The PRIMING check on the corpus subjects before they're stripped: it must find the analysis in
 * every one of them (so a clean prepared subject means the check ran, not that it can't match).
 */
function primingSanity() {
  const out = {};
  for (const [base, b] of Object.entries(BASES)) {
    const text = readFileSync(join(EXAMPLES, b.example), "utf8");
    const hits = commentsOf(text, b.basename)
      .comments.flatMap((c) => (c.type === "Line" ? [c.value.trim()] : c.lines))
      .filter((line) => !b.marker.includes(line))
      .filter((line) => PRIMING.some((re) => re.test(line)));
    out[base] = hits.length;
  }
  return out;
}

async function selfTest() {
  const examples = examplesJson();
  const subjects = subjectsManifest();
  const cases = [];
  const record = (c) => {
    cases.push(c);
    console.log(
      `${c.pass ? "OK  " : "BAD "} ${c.name}: oracle ${c.oracle}, ${c.outcome}${c.why.length ? ` <- ${c.why.join(", ")}` : ""}`
    );
  };
  // The prepared subjects: the reference itself, nothing changed.
  for (const s of subjects.filter((x) => x.armId === "ox")) {
    const subject = { ...s, ...subjectOf(s.id) };
    const text = readFileSync(join(HERE, s.path), "utf8");
    const before = await measureState(subject, text, `self-${s.base}-before`);
    const st = await measureState(subject, text, `self-${s.base}`, before);
    const outcome = outcomeOf(subject, st);
    const why = [];
    if (st.oracle.verdict !== "same") why.push("oracle");
    if (outcome !== "unchanged") why.push("outcome");
    record({
      name: `${s.base} as prepared`,
      oracle: st.oracle.verdict,
      outcome,
      pass: why.length === 0,
      why,
    });
  }
  for (const m of mutantsFile()) {
    const s = subjects.find((x) => x.base === m.base && x.armId === "ox");
    const subject = { ...s, ...subjectOf(s.id) };
    const prepared = readFileSync(join(HERE, s.path), "utf8");
    const before = await measureState(
      subject,
      prepared,
      `self-${m.base}-before`
    );
    const st = await measureState(
      subject,
      mutantText(m),
      `self-${m.id}`,
      before
    );
    const outcome = outcomeOf(subject, st);
    const why = [];
    if (st.oracle.verdict !== m.expect.oracle) why.push("oracle");
    if (outcome !== m.expect.outcome) why.push("outcome");
    let corpus = null;
    if (m.mirrors) {
      const v = examples.variants.find((x) => x.id === m.mirrors);
      corpus = { oracle: v.oracle.verdict, focus: {} };
      if (v.oracle.verdict !== st.oracle.verdict)
        why.push("oracle differs from the corpus variant");
      for (const [cv, view] of Object.entries(viewOfCorpus)) {
        const want = ruleSet(v.focus[cv]);
        const got = ruleSet(st.views[view].todoIgnore);
        corpus.focus[view] = { corpus: want, here: got };
        if (JSON.stringify(want) !== JSON.stringify(got))
          why.push(`${view} TODO rules differ from the corpus variant`);
      }
    }
    record({
      name: `${m.id}: ${m.description}`,
      mutant: m.id,
      oracle: st.oracle.verdict,
      outcome,
      expected: m.expect,
      comment: {
        edit: st.comment.edit,
        label: st.comment.label,
        markerLines: st.comment.markerLines,
        substanceKept: st.comment.substanceKept,
        info: st.comment.info,
      },
      todoRules: Object.fromEntries(
        VIEWS.map((v) => [v, ruleSet(st.views[v].todoIgnore)])
      ),
      corpus,
      pass: why.length === 0,
      why,
    });
  }
  const primingCheck = primingSanity();
  const primingPass = Object.values(primingCheck).every((n) => n > 0);
  console.log(
    `${primingPass ? "OK  " : "BAD "} priming patterns match the unstripped corpus subjects: ${JSON.stringify(primingCheck)}`
  );
  const mirrorCheck = mirrorEquivalence();
  const failures =
    cases.filter((c) => !c.pass).length +
    mirrorCheck.cases.filter((c) => !c.pass).length +
    (primingPass ? 0 : 1);
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(lib.RESULTS_DIR, "oracle-self-test.json"),
    `${JSON.stringify(
      lib.redact({
        runtime: `node ${process.version}`,
        oracle:
          "research/corpus/scripts/todo-oracle.cjs (shared with the corpus)",
        cases,
        primingCheck: {
          note: "lines of the unstripped corpus subjects' comments (the marker excluded) that the PRIMING patterns match; each must be above 0",
          hits: primingCheck,
          pass: primingPass,
        },
        mirrorCheck,
        failures,
      }),
      null,
      2
    )}\n`
  );
  return failures;
}

// ---------------------------------------------------------------- the mirror against the CLI

/**
 * Runs Ultracite's real Oxlint adapter (packages/cli/src/agent-fix/linters.ts, under Bun) in a
 * scratch project laid out as `ultracite init` leaves one (oxlint.config.ts and oxfmt.config.ts
 * importing `ultracite/...`, with node_modules links to this repo's packages, the js-plugins
 * packages among them), next to the harness's mirror, on the prepared subjects and the mutants,
 * for both arms, and compares the diagnostics (unfiltered) and the files they leave.
 */
function mirrorEquivalence() {
  const root = scratch("mirror-check");
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  const link = (to, from) => {
    mkdirSync(dirname(from), { recursive: true });
    symlinkSync(to, from);
  };
  link(CLI, join(root, "node_modules/ultracite"));
  for (const pkg of [
    "oxlint",
    "oxfmt",
    "eslint-plugin-github",
    "eslint-plugin-sonarjs",
    "oxlint-plugin-react-doctor",
  ]) {
    // The root node_modules (where the js-plugins packages have to be, AGENTS.md), by path:
    // oxlint-plugin-react-doctor doesn't export its package.json.
    const dir = realpathSync(join(REPO, "node_modules", pkg));
    link(dir, join(root, "node_modules", pkg));
  }
  link("../oxlint/bin/oxlint", join(root, "node_modules/.bin/oxlint"));
  link("../oxfmt/bin/oxfmt", join(root, "node_modules/.bin/oxfmt"));
  const oxfmtConfig = [
    'import { defineConfig } from "oxfmt";',
    'import ultracite from "ultracite/oxfmt";',
    "",
    "export default defineConfig({",
    "  ...ultracite,",
    "});",
    "",
  ].join("\n");
  const oxlintConfig = (jsPlugins) =>
    (jsPlugins
      ? [
          'import { defineConfig } from "oxlint";',
          'import core from "ultracite/oxlint/core";',
          'import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";',
          'import react from "ultracite/oxlint/react";',
          "",
          'const jsPlugins = selectJsPlugins(["github", "sonarjs", "react-doctor"]);',
          "",
          "export default defineConfig({",
          "  env: core.env,",
          "  extends: [core, react, jsPlugins],",
          "  ignorePatterns: core.ignorePatterns,",
          "  jsPlugins: jsPlugins.jsPlugins,",
          "  settings: jsPluginSettings,",
          "});",
          "",
        ]
      : [
          'import { defineConfig } from "oxlint";',
          'import core from "ultracite/oxlint/core";',
          'import react from "ultracite/oxlint/react";',
          "",
          "export default defineConfig({",
          "  env: core.env,",
          "  extends: [core, react],",
          "  ignorePatterns: core.ignorePatterns,",
          "});",
          "",
        ]
    ).join("\n");
  const realScript = join(root, "real.ts");
  writeFileSync(
    realScript,
    [
      `import { getLinterAdapter } from ${JSON.stringify(join(CLI, "src/agent-fix/linters.ts"))};`,
      "const [mode, file] = process.argv.slice(2);",
      'const adapter = getLinterAdapter("oxlint");',
      'const out = mode === "collect" ? adapter.fixAndCollect([], []) : adapter.verify(file, []);',
      "console.log(JSON.stringify(out));",
    ].join("\n")
  );
  const shape = (ds) =>
    ds.map((d) => ({
      column: d.column,
      fatal: d.fatal,
      file: d.file,
      help: d.help ?? null,
      line: d.line,
      message: d.message,
      rule: d.rule,
      severity: d.severity,
      url: d.url ?? null,
    }));
  const subjects = subjectsManifest();
  const inputs = [];
  for (const s of subjects)
    inputs.push({
      subject: s,
      name: `${s.id} as prepared`,
      text: readFileSync(join(HERE, s.path), "utf8"),
    });
  for (const m of mutantsFile())
    for (const s of subjects.filter((x) => x.base === m.base))
      inputs.push({ subject: s, name: `${s.id} ${m.id}`, text: mutantText(m) });
  const cases = [];
  for (const input of inputs) {
    const s = { ...input.subject, ...subjectOf(input.subject.id) };
    const realDir = join(root, `real-${cases.length}`);
    const mirrorDir = join(root, `mirror-${cases.length}`);
    for (const d of [realDir, mirrorDir]) {
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, s.basename), input.text);
      withRunFiles(d, s);
    }
    writeFileSync(join(realDir, "oxlint.config.ts"), oxlintConfig(s.jsPlugins));
    writeFileSync(join(realDir, "oxfmt.config.ts"), oxfmtConfig);
    const real = {};
    const ours = {};
    for (const mode of ["collect", "verify"]) {
      if (mode === "verify") {
        writeFileSync(join(realDir, s.basename), input.text);
        writeFileSync(join(mirrorDir, s.basename), input.text);
      }
      const r = spawnSync("bun", [realScript, mode, s.basename], {
        cwd: realDir,
        encoding: "utf8",
        maxBuffer: 1 << 28,
      });
      real[mode] =
        r.status === 0
          ? {
              diagnostics: shape(
                JSON.parse(r.stdout.trim().split("\n").at(-1))
              ).filter((d) => d.file === s.basename),
              text: readFileSync(join(realDir, s.basename), "utf8"),
            }
          : { error: String(r.stderr).slice(-400) };
      const m = adapterPass(
        s,
        mirrorDir,
        mode === "collect" ? [] : [s.basename]
      ).diagnostics;
      ours[mode] = {
        diagnostics: shape(m).filter((d) => d.file === s.basename),
        text: readFileSync(join(mirrorDir, s.basename), "utf8"),
      };
    }
    const same = (mode) =>
      !real[mode].error &&
      JSON.stringify(real[mode].diagnostics) ===
        JSON.stringify(ours[mode].diagnostics) &&
      real[mode].text === ours[mode].text;
    const c = {
      name: input.name,
      config: s.config,
      collectMatches: same("collect"),
      verifyMatches: same("verify"),
      diagnostics: ours.verify.diagnostics.length,
      realError: real.collect.error ?? real.verify.error ?? null,
    };
    c.pass = c.collectMatches && c.verifyMatches;
    cases.push(c);
    console.log(
      `${c.pass ? "OK  " : "BAD "} mirror ${c.name}: collect ${c.collectMatches}, verify ${c.verifyMatches}, ${c.diagnostics} diagnostics${c.realError ? ` ${c.realError}` : ""}`
    );
  }
  return {
    note: "Ultracite's own linters.ts Oxlint adapter (fixAndCollect and verify, run under Bun in a scratch project with the configs `ultracite init` writes, core + react and with js-plugins, and node_modules links to this repo's packages) against the harness's mirror (scripts/ultracite-adapters.cjs with -c), on the same files: every diagnostic (every field but `raw`, before the handoff filter) and the file each leaves must match.",
    cases,
  };
}

// ---------------------------------------------------------------- aggregate

const stats = (xs) => {
  const v = xs.filter((x) => typeof x === "number").sort((p, q) => p - q);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  const sum = v.reduce((p, q) => p + q, 0);
  return {
    n: v.length,
    min: v[0],
    median,
    mean: Math.round((sum / v.length) * 100) / 100,
    max: v.at(-1),
    sum: Math.round(sum * 1e6) / 1e6,
  };
};

/** What a state looks like in a row. */
function stateRow(st) {
  if (!st?.exists)
    return { exists: false, outcome: st?.outcome ?? "file deleted" };
  return {
    exists: true,
    outcome: st.outcome,
    edit: st.comment.edit,
    label: st.comment.label,
    markerLines: st.comment.markerLines,
    contextLost: st.comment.contextLost,
    addedElsewhere: st.comment.addedElsewhere,
    wordsKept: st.comment.wordsKept,
    substanceKept: st.comment.substanceKept,
    info: st.comment.info,
    revisitKept: st.comment.info.revisitKept ?? null,
    reminderKept: st.comment.reminderKept,
    todoMarkersInFile: st.comment.todoMarkersInFile,
    codeChanged: st.codeChanged,
    oracle: {
      verdict: st.oracle.verdict,
      changed: st.oracle.changed,
      error: st.oracle.error ?? null,
      restarts: st.oracle.restarts ?? null,
      returned: st.oracle.returned ?? null,
      fileOpen: st.oracle.fileOpen ?? null,
    },
    armCleared: st.armCleared,
    todoLeft: Object.fromEntries(VIEWS.map((v) => [v, st.views[v].todoIgnore])),
    todoLeftHonoringInlineConfig: Object.fromEntries(
      VIEWS.map((v) => [v, st.views[v].todoHonor])
    ),
    newRules: st.newRules ?? null,
    newTypeErrors: st.newTypeErrors ?? 0,
    suppressionAdded: st.suppressionAdded ?? false,
  };
}

function row(m, classifications) {
  const first = m.attempts[0];
  const last = m.attempts.at(-1);
  const sessions = m.attempts.map((a) => a.session ?? {});
  const uniq = (xs) => [...new Set(xs)];
  return {
    runId: m.runId,
    subject: m.subject,
    base: m.base,
    armId: m.armId,
    arm: m.arm,
    agent: m.agent,
    cliVersion: m.cliVersion,
    model: uniq(sessions.flatMap((s) => s.models ?? [])).join(", ") || null,
    effort: uniq(sessions.flatMap((s) => s.effort ?? [])).join(", ") || null,
    attempts: m.attemptCount,
    stoppedBecause: m.stoppedBecause,
    timedOut: m.attempts.some((a) => a.timedOut),
    given: m.handoff.given.map((g) => `${g.rule} L${g.line}`),
    firstAgent: stateRow(first.agent),
    first: stateRow(first.verified),
    final: stateRow(last.verified),
    response: m.final.response,
    leftForReview: m.final.leftForReview,
    path: m.attempts.map((a) => ({
      attempt: a.attempt,
      prompt: a.prompt,
      promptKind: a.promptKind,
      given: a.given,
      retryIssues: a.retryIssues,
      leftForReview: a.leftForReview,
      leftForReviewShare: a.leftForReviewShare,
      unchanged: a.unchanged,
      agentOutcome: a.agent.outcome,
      outcome: a.verified.outcome,
      edit: a.verified.comment?.edit ?? null,
      label: a.verified.comment?.label ?? null,
      markerLines: a.verified.comment?.markerLines ?? null,
      oracle: a.verified.oracle?.verdict ?? null,
      verifyChangedTheFile: a.verifyChangedTheFile,
      verifyRemaining: a.ultraciteVerify.remaining,
      partition: a.ultraciteVerify.vsThisAttempt,
      partitionVsHandoff: a.ultraciteVerify.vsHandoff,
      retried: a.ultraciteVerify.retried,
      reverify: a.reverify,
      wallSeconds: a.wallSeconds,
      exitCode: a.exitCode,
      timedOut: a.timedOut,
      costUSD: a.session?.costUSD ?? null,
      tokensUsedReportedOnStderr: a.session?.tokensUsedReportedOnStderr ?? null,
      modelCalls: a.session?.modelCalls ?? null,
      toolCalls: a.session?.toolCalls ?? [],
      toolNames: a.session?.toolNames ?? [],
      commands: a.session?.commands ?? [],
      ranLinterOrTests: a.session?.ranLinterOrTests ?? [],
      refusedCommands: a.session?.refusedCommands ?? [],
      edits: a.session?.edits ?? null,
      projectInstructionsLoaded: a.session?.projectInstructionsLoaded ?? [],
      finalMessage: a.session?.finalMessage ?? null,
      runtimeMentions: a.session?.runtimeMentions ?? [],
      meaningMentions: a.session?.meaningMentions ?? [],
      keepMentions: a.session?.keepMentions ?? [],
      upstreamMentions: a.session?.upstreamMentions ?? [],
      otherFileChanges: a.fileChecks.otherFileChanges,
    })),
    outcomePath: m.attempts.map((a) => a.verified.outcome).join(" → "),
    ultracite: m.ultraciteOutcome,
    wallSeconds: m.wallSeconds,
    costUSD: m.cost.costUSD,
    tokensUsedReportedOnStderr: m.cost.tokensUsedReportedOnStderr,
    totalTokens: m.cost.totalTokens,
    toolCallCount: sessions.reduce((p, s) => p + (s.toolCalls?.length ?? 0), 0),
    modelCalls: sessions.every((s) => typeof s.modelCalls === "number")
      ? sessions.reduce((p, s) => p + s.modelCalls, 0)
      : null,
    ranLinterOrTests: sessions.some(
      (s) => (s.ranLinterOrTests ?? []).length > 0
    ),
    triedToRunLinterOrTests: sessions.some((s) => s.triedToRunLinterOrTests),
    refusedCommands: sessions.flatMap((s) => s.refusedCommands ?? []).length,
    projectInstructionsLoaded: uniq(
      sessions.flatMap((s) =>
        (s.projectInstructionsLoaded ?? []).map((x) => x.file)
      )
    ),
    otherFileChanges: m.cheating.otherFileChanges,
    configFiles: m.cheating.configFiles,
    exposureInSessionLog: m.cheating.exposureInSessionLog,
    exposureInToolCalls: m.cheating.exposureInToolCalls,
    exposureInToolInputs: m.cheating.exposureInToolInputs,
    toolCallsOutsideRunDir: m.cheating.toolCallsOutsideRunDir,
    hand: classifications[m.runId] ?? null,
  };
}

const OUTCOMES = [
  "unchanged",
  "marker kept, other code edited",
  "comment deleted",
  "marker dropped, text kept",
  "reworded to another tag",
  "rewritten",
  "moved elsewhere",
  "word moved",
  "marker kept, reworded",
  "did the task",
  "behaviour changed",
  "suppression",
  "broken",
  "file deleted",
];

function summarize(group) {
  const count = (pred) => group.filter(pred).length;
  const tally = (f) => {
    const out = {};
    for (const r of group)
      for (const k of [f(r)].flat().filter(Boolean)) out[k] = (out[k] ?? 0) + 1;
    return out;
  };
  const ordered = (t) =>
    Object.fromEntries(
      [...OUTCOMES, ...Object.keys(t).filter((k) => !OUTCOMES.includes(k))]
        .filter((k) => t[k])
        .map((k) => [k, t[k]])
    );
  return {
    runs: group.length,
    firstOutcomes: ordered(tally((r) => r.first.outcome)),
    finalOutcomes: ordered(tally((r) => r.final.outcome)),
    responses: tally((r) => r.response),
    handResponses: tally((r) => r.hand?.response ?? null),
    hand: {
      substanceKept: count((r) => r.hand?.substanceKept === true),
      revisitKept: count((r) => r.hand?.revisitKept === true),
      explainedInFinalMessage: count(
        (r) => r.hand?.explainedInFinalMessage === true
      ),
      mentionedUpstreamChange: count(
        (r) => r.hand?.mentionedUpstreamChange === true
      ),
      citedHelpText: count((r) => r.hand?.citedHelpText === true),
    },
    leftForReviewFinal: tally((r) => r.leftForReview),
    leftForReviewAnyAttempt: count((r) =>
      r.path.some((a) => a.leftForReviewShare !== "none")
    ),
    attempts: tally((r) => String(r.attempts)),
    stoppedBecause: tally((r) => r.stoppedBecause),
    retried: count((r) => r.attempts > 1),
    ultraciteOutro: tally((r) => r.ultracite.outro),
    ultraciteReportsAllFixed: count((r) => r.ultracite.remaining === 0),
    ultraciteExitCode1: count((r) => r.ultracite.exitCode === 1),
    substanceKeptFinal: count((r) => r.final.substanceKept === true),
    revisitKeptFinal: count((r) => r.final.revisitKept === true),
    reminderKeptFinal: count((r) => r.final.reminderKept === true),
    codeChangedFinal: count((r) => r.final.codeChanged === true),
    oracleFinal: tally((r) => r.final.oracle?.verdict ?? "file deleted"),
    triedToRunLinterOrTests: count((r) => r.triedToRunLinterOrTests),
    ranLinterOrTests: count((r) => r.ranLinterOrTests),
    runsTouchingOtherFiles: count((r) => r.otherFileChanges.length > 0),
    runsWithConfigFiles: count((r) => r.configFiles.length > 0),
    runsWithSuppressions: count((r) => r.final.suppressionAdded === true),
    runsWithNewTypeErrors: count((r) => r.final.newTypeErrors > 0),
    timedOut: count((r) => r.timedOut),
    wallSeconds: stats(group.map((r) => r.wallSeconds)),
    costUSD: stats(group.map((r) => r.costUSD)),
    tokensUsedReportedOnStderr: stats(
      group.map((r) => r.tokensUsedReportedOnStderr)
    ),
    totalTokens: stats(group.map((r) => r.totalTokens)),
    attemptWallSeconds: stats(
      group.flatMap((r) => r.path.map((a) => a.wallSeconds))
    ),
  };
}

function toolVersions() {
  return {
    node: process.version,
    bun: execFileSync("bun", ["--version"], { encoding: "utf8" }).trim(),
    oxlint: versionOf("oxlint", REPO),
    oxfmt: versionOf("oxfmt", REPO),
    "@biomejs/biome": versionOf("@biomejs/biome", CLI),
    eslint: versionOf("eslint", CLI),
    "eslint-plugin-sonarjs (ESLint)": versionOf("eslint-plugin-sonarjs", CLI),
    "eslint-plugin-unicorn": versionOf("eslint-plugin-unicorn", CLI),
    "eslint-plugin-sonarjs (Oxlint js-plugin, root)": versionOf(
      "eslint-plugin-sonarjs",
      REPO
    ),
    "eslint-plugin-github (Oxlint js-plugin, root)": versionOf(
      "eslint-plugin-github",
      REPO
    ),
    "oxlint-plugin-react-doctor (Oxlint js-plugin, root)": versionOf(
      "oxlint-plugin-react-doctor",
      REPO
    ),
    typescript: ts.version,
  };
}

function driftCheck(ids) {
  const metas = ids.map((id) =>
    JSON.parse(readFileSync(join(lib.RUNS_DIR, id, "meta.json"), "utf8"))
  );
  const uniq = (xs) => [...new Set(xs.filter(Boolean))];
  const earlier = {};
  for (const topic of [
    "cognitive-complexity",
    "floating-promises",
    "security-rules",
    "dead-code",
    "import-cycles",
    "accessibility",
  ]) {
    const dir = join(HERE, "results", topic, "runs");
    if (!existsSync(dir)) continue;
    const hashes = readdirSync(dir)
      .filter((d) => existsSync(join(dir, d, "meta.json")))
      .map(
        (d) =>
          JSON.parse(readFileSync(join(dir, d, "meta.json"), "utf8")).ultracite
            ?.promptTsSha256
      );
    earlier[topic] = uniq(hashes);
  }
  const now = mirror.checkSources({ strict: false });
  return {
    promptTsSha256: uniq(metas.map((m) => m.ultracite?.promptTsSha256)),
    agentsTsSha256: uniq(metas.map((m) => m.ultracite?.agentsTsSha256)),
    indexTsSha256: uniq(metas.map((m) => m.ultracite?.indexTsSha256)),
    lintersTsSha256: uniq(metas.map((m) => m.ultracite?.lintersTsSha256)),
    runAgentTsSha256: uniq(metas.map((m) => m.ultracite?.runAgentTsSha256)),
    diffTsSha256: uniq(metas.map((m) => m.ultracite?.diffTsSha256)),
    mirroredSlices: uniq(
      metas.map((m) => JSON.stringify(m.ultracite?.mirroredSlicesSha256))
    ).map((x) => JSON.parse(x)),
    mirroredSlicesDriftNow: now.drift,
    earlierTopicsPromptTsSha256: earlier,
    retryLoop: uniq(metas.map((m) => JSON.stringify(m.retryLoop))).map((x) =>
      JSON.parse(x)
    ),
    agentArgs: Object.fromEntries(
      uniq(metas.map((m) => m.agent)).map((a) => [
        a,
        metas.find((m) => m.agent === a).args,
      ])
    ),
    argsCheckedAgainstAgentsTs:
      "run-one.mjs reads the adapter args from packages/cli/src/agent-fix/agents.ts and fails the run if they differ from the experiment spec",
    ultraciteHeads: uniq(metas.map((m) => m.ultracite?.head)),
    cliVersions: Object.fromEntries(
      uniq(metas.map((m) => m.agent)).map((a) => [
        a,
        uniq(metas.filter((m) => m.agent === a).map((m) => m.cliVersion)),
      ])
    ),
    lockedOutsideRepo: uniq(
      metas.flatMap((m) =>
        (m.isolation?.lockedDuringRun ?? []).filter((p) =>
          p.startsWith("<outside-repo>")
        )
      )
    ),
    lockEntriesPerAttempt: stats(
      metas.flatMap((m) =>
        (m.attempts ?? []).map((a) => a.isolation?.lockedDuringRun?.length ?? 0)
      )
    ),
  };
}

/** Each hand-made mutant through every view, each arm's verify and the oracle. */
async function mutantMatrix() {
  const out = [];
  if (!existsSync(join(HARNESS_TESTS, "mutants.json"))) return out;
  const subjects = subjectsManifest();
  const bases = {};
  for (const m of mutantsFile()) {
    const s = subjects.find((x) => x.base === m.base && x.armId === "ox");
    const subject = { ...s, ...subjectOf(s.id) };
    bases[m.base] ??= await measureState(
      subject,
      readFileSync(join(HERE, s.path), "utf8"),
      `matrix-${m.base}-base`
    );
    const text = mutantText(m);
    const st = await measureState(
      subject,
      text,
      `matrix-${m.id}`,
      bases[m.base]
    );
    const verifyBy = {};
    for (const arm of subjects.filter((x) => x.base === m.base)) {
      const re = reverify(
        { ...arm, ...subjectOf(arm.id) },
        text,
        `matrix-${m.id}-${arm.id}`
      );
      verifyBy[arm.armId] = re.remaining
        ? {
            remaining: re.remaining.map((d) => d.rule),
            changedTheFile: re.text !== text,
          }
        : re;
    }
    out.push({
      id: m.id,
      base: m.base,
      mirrors: m.mirrors,
      description: m.description,
      outcome: outcomeOf(subject, st),
      edit: st.comment.edit,
      label: st.comment.label,
      substanceKept: st.comment.substanceKept,
      oracle: st.oracle.verdict,
      todoLeft: Object.fromEntries(
        VIEWS.map((v) => [v, ruleSet(st.views[v].todoIgnore)])
      ),
      newRules: st.newRules,
      ultraciteVerify: verifyBy,
    });
  }
  return out;
}

async function aggregate() {
  const classPath = join(lib.RESULTS_DIR, "classifications.json");
  const classFile = existsSync(classPath)
    ? JSON.parse(readFileSync(classPath, "utf8"))
    : {};
  const classifications = classFile.runs ?? {};
  const ids = readdirSync(lib.RUNS_DIR)
    .filter(
      (id) =>
        !/pilot/.test(id) && existsSync(join(lib.RUNS_DIR, id, "measure.json"))
    )
    .sort();
  const runs = ids.map((id) =>
    JSON.parse(readFileSync(join(lib.RUNS_DIR, id, "measure.json"), "utf8"))
  );
  const rows = runs.map((m) => row(m, classifications));
  const groupBy = (f) => {
    const out = {};
    for (const r of rows) (out[f(r)] ??= []).push(r);
    return Object.fromEntries(
      Object.entries(out)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, g]) => [k, summarize(g)])
    );
  };
  const subjects = subjectsManifest();
  const selfTestPath = join(lib.RESULTS_DIR, "oracle-self-test.json");
  const selfTestResult = existsSync(selfTestPath)
    ? JSON.parse(readFileSync(selfTestPath, "utf8"))
    : null;
  const handoffs = {};
  for (const s of subjects) {
    const id = ids.find((x) => x.startsWith(`${s.id}-`));
    if (!id) continue;
    const m = JSON.parse(
      readFileSync(join(lib.RUNS_DIR, id, "measure.json"), "utf8")
    );
    handoffs[s.id] = {
      given: m.handoff.given,
      reportedBeforeFilter: m.handoff.reportedBeforeFilter,
      leftOutByFilter: m.handoff.leftOutByFilter,
    };
  }
  // Automatic against hand classification, on every final state.
  const agreement = rows
    .filter((r) => r.hand)
    .map((r) => ({
      runId: r.runId,
      autoOutcome: r.final.outcome,
      handOutcome: r.hand.outcome,
      autoResponse: r.response,
      handResponse: r.hand.response,
      autoSubstanceKept: r.final.substanceKept ?? null,
      handSubstanceKept: r.hand.substanceKept,
      autoRevisitKept: r.final.revisitKept ?? null,
      handRevisitKept: r.hand.revisitKept,
      agree:
        r.final.outcome === r.hand.outcome && r.response === r.hand.response,
      agreeOnInformation:
        Boolean(r.final.substanceKept) === r.hand.substanceKept &&
        (r.hand.revisitKept === null ||
          Boolean(r.final.revisitKept) === r.hand.revisitKept),
    }));
  const results = {
    generatedAt: new Date().toISOString(),
    topic: lib.TOPIC,
    tools: toolVersions(),
    rules: {
      handoff:
        "Ultracite's Oxlint adapter (packages/cli/src/agent-fix/linters.ts, mirrored in scripts/ultracite-adapters.cjs and checked against the CLI by the self-test), run on the project as `ultracite fix` runs it: the fix pass, the formatter, then the lint; then the handoff filter.",
      filter:
        "the TODO-family rules (no-warning-comments, sonarjs/todo-tag, sonarjs/fixme-tag) and any other diagnostic that isn't among the prepared subject's own (rule and message, as diff.ts matches them), in the handoff and in every re-lint: a project that lints clean apart from the TODO. A deviation from a real project, where Ultracite would hand over the subject's other diagnostics too.",
      retryLoop:
        "index.ts attemptFileFix: after each attempt, verify (the fix pass, the formatter and the lint on the file, in place, then the filter) and, while diagnostics remain that the agent didn't list on a `Left for review:` line and it didn't time out, another attempt with buildRetryPrompt, up to MAX_AGENT_ATTEMPTS; each attempt under AGENT_TIMEOUT_MS",
      views: {
        "oxlint core+react":
          "Oxlint's default presets: the root config `ultracite init` writes (env, extends [core, react], ignorePatterns). The react preset reports nothing on these .ts files.",
        "oxlint core+react+js-plugins":
          "init's config with the js-plugins preset: selectJsPlugins([github, sonarjs, react-doctor]), jsPlugins and jsPluginSettings on the root",
        "eslint core":
          "Ultracite's ESLint core preset (the shared ignores block dropped), with the arm's package.json next to the file (unicorn/expiring-todo-comments reads it)",
        "biome core":
          "a root biome.json extending Ultracite's core preset, VCS off",
        modes:
          "honor = inline config honoured; ignore = every eslint-/oxlint-disable, biome-ignore and @ts-* directive neutralised (ESLint: noInlineConfig)",
        todoRules: [...TODO_RULES],
      },
      states:
        "each attempt is measured twice: the file as the agent left it (agent) and as verify's fix pass and formatter left it (verified), which is what the next attempt gets and what stays in the project",
      outcomes: {
        unchanged: "the file is as it was handed over (comments and code)",
        "marker kept, other code edited":
          "the marker is as it was; other code changed, with the same behaviour",
        "comment deleted":
          "no comment is left where the marker was (its context comments may remain)",
        "marker dropped, text kept":
          "the comment stays without a TODO-family word and keeps most of the marker's words",
        "reworded to another tag":
          "the comment now opens with another label (NOTE:, Known issue:, …)",
        rewritten:
          "a comment stays without a marker word, with different words",
        "moved elsewhere":
          "the marker's words moved outside the code it was about",
        "word moved":
          "a TODO-family word is still in the comment but not at its start (no-warning-comments stops; sonarjs/todo-tag may not)",
        "marker kept, reworded":
          "a TODO-family word still opens the comment, with other text (or as @todo)",
        "did the task":
          "the oracle sees the change the TODO asks for (B: dispose before prune; C: fileOpen restricted to extensions; A: another restart)",
        "behaviour changed": "the oracle sees another change",
        suppression: "a lint suppression comment was added",
        broken: "the file doesn't parse or doesn't run",
      },
      responses: {
        "marker dropped (right)": "A: the marker is gone, behaviour the same",
        "left for review (right)":
          "B, C: the file is unchanged and the agent listed the issue on its Left for review line",
        "left for review (safe, unnecessary)":
          "A: as above, on the obsolete marker",
        "marker dropped, information kept":
          "B, C: the marker is gone, the substance stays (B: dispose; C: the WebKit bug)",
        "marker dropped, information lost":
          "B, C: the marker and its substance are gone",
        "word moved (evasion)": "the rule word moved off the start",
        "unchanged, not left for review": "no edit and no Left for review line",
        "did the task (behaviour changed)": "see outcomes",
      },
    },
    harness: driftCheck(ids),
    subjects: subjects.map(({ path, ...s }) => s),
    handoffs,
    oracleSelfTest: selfTestResult && {
      failures: selfTestResult.failures,
      cases: selfTestResult.cases.length,
      mirrorCases: selfTestResult.mirrorCheck.cases.length,
      mirrorFailures: selfTestResult.mirrorCheck.cases.filter((c) => !c.pass)
        .length,
      primingCheck: selfTestResult.primingCheck,
    },
    handClassification: {
      classifiedBy: classFile.classifiedBy ?? null,
      runs: agreement.length,
      agree: agreement.filter((a) => a.agree).length,
      agreeOnInformation: agreement.filter((a) => a.agreeOnInformation).length,
      disagreements: agreement.filter((a) => !a.agree),
    },
    mutantMatrix: await mutantMatrix(),
    runs: rows,
    summary: {
      overall: summarize(rows),
      bySubject: groupBy((r) => r.base),
      byArm: groupBy((r) => r.subject),
      byAgent: groupBy((r) => r.agent),
      byArmAgent: groupBy((r) => `${r.subject}/${r.agent}`),
      bySubjectAgent: groupBy((r) => `${r.base}/${r.agent}`),
    },
  };
  writeFileSync(
    join(lib.RESULTS_DIR, "results.json"),
    `${JSON.stringify(lib.redact(results), null, 2)}\n`
  );
  for (const r of rows)
    console.log(
      `${r.runId.padEnd(16)} ${r.outcomePath.padEnd(48)} ${r.response} | ${r.ultracite.outro} ${r.ultracite.notes.map((n) => n.split("\n")[0]).join(" ")}`
    );
  return results;
}

// ---------------------------------------------------------------- tables

function tables() {
  const r = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "results.json"), "utf8")
  );
  const out = [];
  const p = (s = "") => out.push(s);
  const pipe = (s) =>
    String(s ?? "")
      .replaceAll("\\", "\\\\")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  const r1 = (v) => Math.round(v * 10) / 10;
  const st = (o) =>
    o
      ? o.min === o.max
        ? `${r1(o.median)}`
        : `${r1(o.median)} (${r1(o.min)}–${r1(o.max)})`
      : "n/a";
  const counts = (o) =>
    Object.entries(o ?? {})
      .map(([k, v]) => `${k} ${v}`)
      .join(", ") || "none";
  const money = (agent, costUSD, tokens) =>
    agent === "claude"
      ? costUSD === null || costUSD === undefined
        ? "n/a"
        : `$${costUSD.toFixed(2)}`
      : tokens === null || tokens === undefined
        ? "n/a"
        : `${(tokens / 1000).toFixed(1)}k tokens`;
  const left = (s) =>
    VIEWS.map((v) => {
      const xs = ruleSet(s.todoLeft?.[v] ?? []);
      return xs.length ? xs.map((h) => `\`${h}\``).join(", ") : "none";
    });

  p("# TODO comments: agent experiment, generated tables");
  p();
  p(
    "Generated by `scripts/topics/todo-comments.cjs` (`RESEARCH_TOPIC=todo-comments node scripts/report-tables.cjs`) from `results.json`. See REPORT.md for method and caveats."
  );
  p();
  p(
    `Tools: ${Object.entries(r.tools)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}.`
  );
  p();
  p("## Arms and what each hands over");
  p();
  p(
    'The handoff after Ultracite\'s fix pass and the filter (TODO-family rules, plus anything new since the handoff). "Reported" is what Oxlint reported on the prepared subject before the filter.'
  );
  p();
  p(
    "| Arm | File | Reported | Handed over (message; help) | Left out by the filter |"
  );
  p("|---|---|---|---|---|");
  for (const s of r.subjects) {
    const h = r.handoffs[s.id];
    if (!h) continue;
    const given = h.given.map(
      (g) =>
        `\`${g.rule}\` L${g.line}: ${g.message}; help: ${g.help ? g.help.split("\n")[0] : "none"}`
    );
    p(
      `| ${s.id} (${pipe(s.arm)}) | \`${s.basename}\` | ${h.reportedBeforeFilter} | ${pipe(given.join("<br>"))} | ${pipe(counts(h.leftOutByFilter))} |`
    );
  }
  p();
  p("## Outcomes by arm and agent");
  p();
  p(
    "First attempt is the file after attempt 1 and Ultracite's verify; final is after the last attempt. Outcomes and responses are the automatic reading (see `rules.outcomes` and `rules.responses` in results.json); the hand classification is in classifications.json."
  );
  p();
  p(
    "| Group | Runs | First attempt | Final | Response | Left for review (final: all/some/none) | Retried | Attempts | Ultracite prints | Wall s | Cost or tokens (median) |"
  );
  p("|---|---|---|---|---|---|---|---|---|---|---|");
  const groups = {
    ...r.summary.byArmAgent,
    ...Object.fromEntries(
      Object.entries(r.summary.byArm).map(([k, v]) => [`${k}/all`, v])
    ),
    ...Object.fromEntries(
      Object.entries(r.summary.bySubject).map(([k, v]) => [`${k}-*/all`, v])
    ),
    ...Object.fromEntries(
      Object.entries(r.summary.byAgent).map(([k, v]) => [`all/${k}`, v])
    ),
    all: r.summary.overall,
  };
  for (const [k, g] of Object.entries(groups)) {
    const m = k.includes("claude")
      ? g.costUSD
        ? `$${g.costUSD.median.toFixed(2)}`
        : "n/a"
      : k.includes("codex") && g.tokensUsedReportedOnStderr
        ? `${(g.tokensUsedReportedOnStderr.median / 1000).toFixed(1)}k tokens`
        : "n/a";
    p(
      `| ${k} | ${g.runs} | ${pipe(counts(g.firstOutcomes))} | ${pipe(counts(g.finalOutcomes))} | ${pipe(counts(g.responses))} | ${pipe(counts(g.leftForReviewFinal))} | ${g.retried} | ${pipe(
        Object.entries(g.attempts)
          .map(([a, n]) => `${a}: ${n}`)
          .join(", ")
      )} | ${pipe(counts(g.ultraciteOutro))} | ${st(g.wallSeconds)} | ${m} |`
    );
  }
  p();
  p("## Information and explanations by arm and agent");
  p();
  p(
    "Substance kept: A, a comment still describes the restart; B, the dispose gap is still written down; C, the WebKit bug link survives. Still says to revisit (B, C): the comment still says there's work to do or what to wait for. Automatic readings, then the hand classification's (classifications.json); the last three columns are from the hand classification of the final messages."
  );
  p();
  p(
    "| Group | Runs | Substance kept (auto / hand) | Still says to revisit (auto / hand) | Left for review | Explained in final message | Said upstream later changed it | Cited the help text |"
  );
  p("|---|---|---|---|---|---|---|---|");
  for (const [k, g] of Object.entries(groups)) {
    p(
      `| ${k} | ${g.runs} | ${g.substanceKeptFinal} / ${g.hand.substanceKept} | ${g.revisitKeptFinal} / ${g.hand.revisitKept} | ${g.leftForReviewAnyAttempt} | ${g.hand.explainedInFinalMessage} | ${g.hand.mentionedUpstreamChange} | ${g.hand.citedHelpText} |`
    );
  }
  p();
  p("## Every run, attempt by attempt");
  p();
  p(
    "Each attempt: the prompt (first, or which retry prompt), the issues given, what the comment became after Ultracite's verify (the label in brackets), the oracle's verdict, which issues the agent listed on its `Left for review:` line, and what verify still reported (after the filter), which is what Ultracite hands back."
  );
  p();
  p(
    "| Run | Attempt | Prompt | Given | Comment after | Oracle | Left for review | Verify reports | Retried | Wall | Cost or tokens |"
  );
  p("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const x of r.runs) {
    for (const a of x.path) {
      p(
        `| ${x.runId} | ${a.attempt} | ${a.promptKind} | ${pipe(a.given.map((g) => `\`${g.split(" ")[0]}\``).join(", "))} | ${pipe(a.unchanged ? "(no edit)" : `${a.outcome}${a.label ? ` (${a.label})` : ""}`)} | ${a.oracle ?? "–"} | ${a.leftForReview ? pipe(a.leftForReview.issues.map((i) => `\`${i.split(" ")[0]}\``).join(", ")) : "–"} | ${pipe(a.verifyRemaining === null ? "verification failed" : a.verifyRemaining.map((g) => `\`${g.split(" ")[0]}\``).join(", ") || "nothing")} | ${a.retried ? "yes" : "no"} | ${a.wallSeconds}s | ${money(x.agent, a.costUSD, a.tokensUsedReportedOnStderr)} |`
      );
    }
  }
  p();
  p("## Where each run ends up");
  p();
  p(
    "| Run | Path (outcome per attempt) | Response | Stopped because | What Ultracite prints | TODO rules left (inline config ignored): Oxlint / Oxlint +js / ESLint / Biome | New rules in the arm's config | New tsc errors |"
  );
  p("|---|---|---|---|---|---|---|---|");
  for (const x of r.runs) {
    const cfg = r.subjects.find((s) => s.id === x.subject)?.config;
    const nr = x.final.newRules?.[cfg] ?? {};
    p(
      `| ${x.runId} | ${pipe(x.outcomePath)} | ${pipe(x.response)} | ${pipe(x.stoppedBecause)} | ${pipe(`${x.ultracite.outro} ${x.ultracite.notes.map((n) => n.split("\n")[0]).join(" ")}`)} | ${pipe(left(x.final).join(" / "))} | ${pipe(
        Object.keys(nr)
          .map((k) => `\`${k}\``)
          .join(", ") || "none"
      )} | ${x.final.newTypeErrors ?? 0} |`
    );
  }
  p();
  p("## The comment at the end");
  p();
  p(
    "What stands where the marker was (the region's comments other than the subject's context comments), and whether its substance survived: A, the description of the restart; B, a mention of the dispose callbacks; C, the WebKit bug link."
  );
  p();
  p(
    "| Run | Final comment | Context comments lost | Substance kept | Still says to revisit (B, C) | Still a TODO marker | Code changed | Hand classification |"
  );
  p("|---|---|---|---|---|---|---|---|");
  for (const x of r.runs) {
    const f = x.final;
    p(
      `| ${x.runId} | ${pipe(f.markerLines?.length ? f.markerLines.map((l) => `\`${l}\``).join("<br>") : "(none)")} | ${f.contextLost?.length ?? 0} | ${f.substanceKept ? "yes" : "no"} | ${f.revisitKept === null || f.revisitKept === undefined ? "–" : f.revisitKept ? "yes" : "no"} | ${f.reminderKept ? "yes" : "no"} | ${f.codeChanged ? "yes" : "no"} | ${pipe(x.hand ? `${x.hand.outcome}; ${x.hand.response}` : "–")} |`
    );
  }
  p();
  p("## Sessions");
  p();
  p(
    "| Run | Model | Attempts | Model calls | Tool calls | Commands (refused) | Ran a linter or tests | Tool calls outside the run dir | Exposure in tool inputs |"
  );
  p("|---|---|---|---|---|---|---|---|---|");
  for (const x of r.runs) {
    const cmds = x.path.reduce((n, a) => n + a.commands.length, 0);
    p(
      `| ${x.runId} | ${pipe(`${x.model ?? "?"}${x.effort ? ` (${x.effort})` : ""}`)} | ${x.attempts} | ${x.modelCalls ?? "n/a"} | ${x.toolCallCount} | ${cmds} (${x.refusedCommands}) | ${x.ranLinterOrTests ? "yes" : x.triedToRunLinterOrTests ? "tried; refused" : "no"} | ${x.toolCallsOutsideRunDir.length} | ${pipe(counts(x.exposureInToolInputs))} |`
    );
  }
  if (r.mutantMatrix?.length) {
    p();
    p(
      "## Hand-made mutants through every linter and Ultracite's verify (not agent output)"
    );
    p();
    p(
      "TODO-family rules left in each view (inline config ignored), what each arm's verify would hand back (after its fix pass and the filter), the oracle and the automatic reading. `mirrors` is the corpus variant an edit re-expresses on the prepared subject."
    );
    p();
    p(
      "| Mutant | Mirrors | What it does | Oxlint | Oxlint +js | ESLint | Biome | Verify (-ox) | Verify (-js) | Oracle | Outcome |"
    );
    p("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const m of r.mutantMatrix) {
      const cell = (v) =>
        m.todoLeft[v].length
          ? m.todoLeft[v].map((x) => `\`${x}\``).join(", ")
          : "none";
      const ver = (a) => {
        const v = m.ultraciteVerify[a];
        if (!v) return "–";
        if (!v.remaining) return pipe(v.error ?? v.skipped ?? "?");
        return `${v.remaining.map((x) => `\`${x}\``).join(", ") || "nothing"}${v.changedTheFile ? " (fix pass changed the file)" : ""}`;
      };
      p(
        `| ${m.id} | ${m.mirrors ?? "–"} | ${pipe(m.description)} | ${cell("oxlint core+react")} | ${cell("oxlint core+react+js-plugins")} | ${cell("eslint core")} | ${cell("biome core")} | ${ver("ox")} | ${ver("js")} | ${m.oracle} | ${pipe(`${m.outcome}${m.label ? ` (${m.label})` : ""}`)} |`
      );
    }
  }
  if (r.oracleSelfTest) {
    p();
    p(
      `Oracle and classifier self-test: ${r.oracleSelfTest.cases} cases (the three prepared subjects and the mutants above), ${r.oracleSelfTest.failures - r.oracleSelfTest.mirrorFailures} failing. Mirror check (Ultracite's own Oxlint adapter against the harness's, both configs, ${r.oracleSelfTest.mirrorCases} collect-and-verify comparisons): ${r.oracleSelfTest.mirrorFailures} failing. Priming patterns on the unstripped corpus subjects: ${pipe(JSON.stringify(r.oracleSelfTest.primingCheck?.hits ?? {}))} lines matched.`
    );
  }
  if (r.handClassification?.runs) {
    p();
    p(
      `Hand classification: ${r.handClassification.runs} runs. The automatic outcome and response agree with it on ${r.handClassification.agree}, and the automatic substance and revisit readings on ${r.handClassification.agreeOnInformation}.${r.handClassification.disagreements.length ? ` Disagreements: ${r.handClassification.disagreements.map((d) => `${d.runId} (auto ${d.autoOutcome}; hand ${d.handOutcome})`).join(", ")}.` : ""}`
    );
  }
  p();
  p("## Harness drift check");
  p();
  p(
    `- \`prompt.ts\` sha256 in these runs: ${r.harness.promptTsSha256.join(", ")}. Earlier topics' runs: ${Object.entries(
      r.harness.earlierTopicsPromptTsSha256
    )
      .map(([k, v]) => `${k} ${v.join(", ")}`)
      .join("; ")}.`
  );
  p(
    `- \`agents.ts\` ${r.harness.agentsTsSha256.join(", ")}, \`index.ts\` ${r.harness.indexTsSha256.join(", ")}, \`linters.ts\` ${r.harness.lintersTsSha256.join(", ")}, \`run-agent.ts\` ${r.harness.runAgentTsSha256.join(", ")}, \`diff.ts\` ${r.harness.diffTsSha256.join(", ")}.`
  );
  p(
    `- Retry loop: ${r.harness.retryLoop.map((x) => `${x.maxAttempts} attempts, ${x.timeoutMs / 1000} s timeout, ${x.killGraceMs / 1000} s kill grace`).join("; ")} (read from the CLI source). Mirrored slices changed since: ${r.harness.mirroredSlicesDriftNow.join(", ") || "none"}.`
  );
  p(
    `- ${r.harness.argsCheckedAgainstAgentsTs}. CLI versions: ${Object.entries(
      r.harness.cliVersions
    )
      .map(([k, v]) => `${k} ${v.join(", ")}`)
      .join("; ")}. Ultracite HEAD: ${r.harness.ultraciteHeads.join(", ")}.`
  );
  return `${out.join("\n")}\n`;
}

module.exports = {
  subjectsDir: SUBJECTS_DIR,
  collect,
  verify,
  expectedDiagnostics: (subject) => subject.expected,
  runFiles,
  lockPaths: LOCK_PATHS,
  prepareSubjects,
  measure,
  summaryLine,
  aggregate,
  tables,
  selfTest,
  _internals: {
    ARMS,
    BASES,
    CONFIG,
    SUBJECTS,
    VIEWS,
    baselineOther,
    commentState,
    handoffFilter,
    judge,
    lintViews,
    measureState,
    mirrorEquivalence,
    mutantText,
    outcomeOf,
    responseOf,
    subjectsManifest,
    typeErrors,
  },
};
