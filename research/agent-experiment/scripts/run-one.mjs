// One experiment run: fresh run dir, real ESLint diagnostic, Ultracite's own prompt and
// diagnostics-file functions, then the agent CLI exactly as Ultracite invokes it.
//
// Usage: node scripts/run-one.mjs <subject> <claude|codex> <n>
//   (RESEARCH_TOPIC picks the topic; its module in scripts/topics/ supplies the subjects, the
//   lint and any extra files, such as a tsconfig.json, the subject needs next to it)
//
// The agent runs in <RUN_ROOT>/<id>/, a temp directory outside the repo (see lib.cjs), so it
// can't load the repo's CLAUDE.md or AGENTS.md from a parent directory. During the run that
// directory holds only the subject file, the topic's run files and the diagnostics JSON. Logs
// stream to
// <RUN_ROOT>/.staging/<id>/ so the agent never sees its own logs, the prompt file or the
// pristine copy. Afterwards everything except the edited subject (kept as after.ts, or
// after.tsx for a .tsx subject) is copied, with paths and session ids redacted, into
// results/<topic>/runs/<id>/.
//
// Multi-file subjects (added with the import-cycles topic): a subject whose manifest entry lists
// `files` is copied whole into the run dir, keeping its folders, and the topic's `handoff` hook
// says which files Ultracite would hand over and in what order (packages/cli/src/agent-fix/
// index.ts: one agent run per file, one after another, each with the diagnostics collected before
// the first run). Each file gets its own agent run in the same run dir, with its own prompt,
// diagnostics JSON, locks and session log, and every file's change, creation or deletion is
// recorded per step. The artifacts are laid out by step (see runMultiFile below). Single-file
// subjects run exactly as before.
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative } from "node:path";

const require = createRequire(import.meta.url);
const lib = require("./lib.cjs");
const topic = require("./topics.cjs").loadTopic();

const ULTRACITE = lib.REPO_ROOT;
const AGENT_FIX = join(ULTRACITE, "packages/cli/src/agent-fix");
const TIMEOUT_MS = 10 * 60 * 1000;
const KILL_GRACE_MS = 10 * 1000; // Ultracite's KILL_GRACE_MS (run-agent.ts)

const HERE = lib.HERE;
const subjects = JSON.parse(
  readFileSync(join(topic.subjectsDir, "subjects.json"), "utf8")
);
const [subjectId, agent, n] = process.argv.slice(2);
const subject = subjects.find((s) => s.id === subjectId);
if (!subject || !["claude", "codex"].includes(agent) || !n) {
  console.error(
    `usage: node scripts/run-one.mjs <${subjects.map((s) => s.id).join("|")}> <claude|codex> <n>`
  );
  process.exit(2);
}
const runId = `${subjectId}-${agent}-${n}`;
const runDir = join(lib.RUN_ROOT, runId);
const stagingDir = join(lib.RUN_ROOT, ".staging", runId);
const resultDir = join(lib.RUNS_DIR, runId);
for (const dir of [runDir, resultDir]) {
  if (existsSync(dir)) {
    console.error(`${dir} already exists; every run gets a fresh directory`);
    process.exit(2);
  }
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// ---------------------------------------------------------------- agent args from agents.ts

const EXPECTED_ARGS = {
  claude: [
    "-p",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    "Read,Edit,Write,Grep,Glob",
  ],
  codex: ["exec", "--sandbox", "workspace-write", "--skip-git-repo-check", "-"],
};
function adapterFromSource(id) {
  const src = readFileSync(join(AGENT_FIX, "agents.ts"), "utf8");
  const re = new RegExp(
    `\\n  ${lib.escapeRegExp(id)}: \\{[\\s\\S]*?args: \\[([\\s\\S]*?)\\],\\s*command: "([^"]+)"`
  );
  const m = re.exec(src);
  if (!m) throw new Error(`could not find the ${id} adapter in agents.ts`);
  const args = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  if (JSON.stringify(args) !== JSON.stringify(EXPECTED_ARGS[id])) {
    throw new Error(
      `agents.ts ${id} args ${JSON.stringify(args)} differ from the experiment spec`
    );
  }
  return { command: m[2], args };
}

// ---------------------------------------------------------------- snapshots

function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else out[relative(dir, p)] = sha256(readFileSync(p));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}
const topLevel = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);

// ---------------------------------------------------------------- transcripts

// The CLIs record the run dir's real path. On macOS, $TMPDIR (/var/folders/...) resolves
// through /private, so a session log can name either form.
const runDirForms = () => [
  ...new Set([runDir, existsSync(runDir) ? realpathSync(runDir) : runDir]),
];

// `exclude`: session logs an earlier step of the same run already claimed (multi-file subjects run
// the agent several times in one run dir).
function findClaudeTranscript(startMs, exclude = new Set()) {
  const root = join(homedir(), ".claude/projects");
  const hits = [];
  const dirs = readdirSync(root);
  const candidates = dirs.some((d) => d.endsWith(runId))
    ? dirs.filter((d) => d.endsWith(runId))
    : dirs;
  for (const d of candidates) {
    const pd = join(root, d);
    if (!statSync(pd).isDirectory() || statSync(pd).mtimeMs < startMs) continue;
    for (const f of readdirSync(pd)) {
      if (!f.endsWith(".jsonl")) continue;
      const p = join(pd, f);
      if (exclude.has(p) || statSync(p).mtimeMs < startMs) continue;
      const text = readFileSync(p, "utf8");
      if (runDirForms().some((d) => text.includes(`"cwd":"${d}"`)))
        hits.push(p);
    }
  }
  return hits;
}

function findCodexTranscript(startMs, exclude = new Set()) {
  const hits = [];
  const root = join(homedir(), ".codex/sessions");
  const days = new Set();
  for (const t of [startMs, Date.now()]) {
    const d = new Date(t);
    days.add(
      join(
        root,
        String(d.getFullYear()),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
      )
    );
  }
  for (const dir of days) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (
        exclude.has(p) ||
        !f.endsWith(".jsonl") ||
        statSync(p).mtimeMs < startMs
      )
        continue;
      const first = readFileSync(p, "utf8").split("\n", 1)[0];
      try {
        if (runDirForms().includes(JSON.parse(first)?.payload?.cwd))
          hits.push(p);
      } catch {
        // not a session file
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------- agent process and locks

// A plain terminal environment: drop the variables this parent Claude Code session sets.
const env = { ...process.env };
const strippedEnv = Object.keys(env).filter((k) => k.startsWith("CLAUDE"));
for (const k of strippedEnv) delete env[k];

// Isolation: while the agent runs, the experiment's own internals (harness, behavior oracle,
// pristine references, results) and every other run's directory are made unreadable
// (chmod 000), then restored. Codex explores beyond its working directory and can find this
// repo; without this a later run could read an earlier run's output or the equivalence test.
// Only files this experiment owns are locked; nothing else in the repo is touched.
const LOCK_NAMES = [
  "scripts",
  "subjects",
  "harness-tests",
  "biome-config",
  "biome-input",
  "results",
];
const locked = [];
function lockAll() {
  const targets = [
    ...LOCK_NAMES.map((n) => join(HERE, n)),
    // Topic-specific files outside this folder, e.g. corpus notes that name the expected fix.
    ...topic.lockPaths,
    // Machine-specific paths outside the repo for any topic (an orchestrating session's notes or
    // drafts), colon-separated. Added with the dead-code topic; the security-rules topic's own
    // SECURITY_RULES_EXTRA_LOCKS still works.
    ...(process.env.AGENT_EXPERIMENT_EXTRA_LOCKS ?? "")
      .split(":")
      .filter(Boolean),
    ...readdirSync(lib.RUN_ROOT)
      .filter((d) => d !== runId && d !== ".staging")
      .map((d) => join(lib.RUN_ROOT, d)),
    // Other runs' staging dirs (their locks.json). This run's own stays open: its logs stream
    // there. Added after the floating-promises runs, where one agent globbed the run root and
    // saw these file names (it read none of them).
    ...readdirSync(join(lib.RUN_ROOT, ".staging"))
      .filter((d) => d !== runId)
      .map((d) => join(lib.RUN_ROOT, ".staging", d)),
  ].filter((p) => existsSync(p));
  for (const p of targets) {
    locked.push({ path: p, mode: statSync(p).mode & 0o7777 });
  }
  writeFileSync(
    join(stagingDir, "locks.json"),
    JSON.stringify(locked, null, 2)
  );
  for (const { path } of locked) chmodSync(path, 0o000);
}
function unlockAll() {
  for (const { path, mode } of locked.splice(0)) {
    try {
      chmodSync(path, mode);
    } catch {
      // already restored
    }
  }
}
process.on("exit", unlockAll);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    unlockAll();
    process.exit(130);
  });
}
// Paths in the repo are recorded relative to this folder; a path outside both the repo and the
// run root (a topic's machine-specific extra lock) only by its name.
const lockedPathsOf = (entries) =>
  entries.map((l) => {
    if (l.path.startsWith(`${lib.RUN_ROOT}/`))
      return `<run-root>/${relative(lib.RUN_ROOT, l.path)}`;
    if (!l.path.startsWith(`${ULTRACITE}/`))
      return `<outside-repo>/${basename(l.path)}`;
    return relative(HERE, l.path);
  });

/**
 * Runs the agent CLI once in the run dir, prompt on stdin, stdout and stderr streamed to the
 * given files, with this harness's timeout and kill grace. Resolves when the logs are closed.
 */
async function runAgentProcess(prompt, stdoutPath, stderrPath) {
  const stdout = createWriteStream(stdoutPath);
  const stderr = createWriteStream(stderrPath);
  await Promise.all([
    new Promise((r) => stdout.on("open", r)),
    new Promise((r) => stderr.on("open", r)),
  ]);
  const startMs = Date.now();
  const outcome = await new Promise((resolveRun) => {
    const child = spawn(adapter.command, adapter.args, {
      cwd: runDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let timedOut = false;
    let killTimer = null;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
    }, TIMEOUT_MS);
    child.stdout.pipe(stdout);
    child.stderr.pipe(stderr);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolveRun({
        exitCode: null,
        signal: null,
        timedOut,
        spawnError: error.message,
      });
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      resolveRun({ exitCode, signal, timedOut, spawnError: null });
    });
    // Prompt on stdin, then close it (Ultracite: execa `input`).
    child.stdin.end(prompt);
  });
  const wallMs = Date.now() - startMs;
  await Promise.all([
    new Promise((r) => stdout.end(r)),
    new Promise((r) => stderr.end(r)),
  ]);
  return { outcome, wallMs };
}

// ---------------------------------------------------------------- main

const { buildPrompt, writeDiagnosticsFile } = await import(
  join(AGENT_FIX, "prompt.ts")
);
const adapter = adapterFromSource(agent);

mkdirSync(runDir, { recursive: true });
mkdirSync(stagingDir, { recursive: true });

if (Array.isArray(subject.files)) {
  await runMultiFile();
  process.exit(0);
}

const file = join(runDir, subject.basename);
copyFileSync(lib.subjectPath(subject), file);
chmodSync(file, 0o644);
// Files the subject needs next to it, e.g. the tsconfig.json a type-aware lint reads.
const runFiles = topic.runFiles(subject);
for (const extra of runFiles) {
  copyFileSync(extra.from, join(runDir, extra.name));
  chmodSync(join(runDir, extra.name), 0o644);
}
const runFileNames = new Set(runFiles.map((f) => f.name));

// The diagnostics the agent sees: the topic's lint (cognitive-complexity: sonarjs at 15,
// nothing else), in the shape Ultracite's adapter for that linter produces. A topic whose lint
// isn't ESLint supplies its own `toDiagnostics` (added with the dead-code topic, whose dc3 goes
// through Oxlint).
const lintResult = await topic.lint(file);
const diagnostics = (topic.toDiagnostics ?? lib.toUltraciteDiagnostics)(
  lintResult
);
const expected = topic.expectedDiagnostics(subject);
if (diagnostics.length !== expected)
  throw new Error(
    `expected exactly ${expected} diagnostic(s), got ${diagnostics.length}`
  );
// Ultracite groups by diagnostic.file and passes that path to both functions. ESLint reports
// absolute paths; Oxlint reports them relative to where it ran, which for `ultracite fix` is the
// project root and its working directory, so buildPrompt's path.resolve() runs from the run dir
// here (it changes nothing for an absolute path).
const group = { file: diagnostics[0].file, issues: diagnostics };
const harnessCwd = process.cwd();
process.chdir(runDir);
const jsonPath = writeDiagnosticsFile(runDir, group.file, group.issues);
const prompt = buildPrompt(group.file, group.issues, jsonPath);
process.chdir(harnessCwd);
writeFileSync(join(stagingDir, "prompt.txt"), prompt);

const cliVersion = execFileSync(adapter.command, ["--version"], {
  encoding: "utf8",
}).trim();
const preRun = snapshot(runDir);
const preRunsTop = topLevel(lib.RUN_ROOT);
const preSubjects = snapshot(join(HERE, "subjects"));
const preRoot = topLevel(HERE);

lockAll();
const lockedPaths = lockedPathsOf(locked);

const startedAt = new Date();
const startMs = Date.now();
console.log(
  `[${runId}] ${adapter.command} ${adapter.args.join(" ")}  (cwd ${runDir})`
);

const { outcome, wallMs } = await runAgentProcess(
  prompt,
  join(stagingDir, "stdout.txt"),
  join(stagingDir, "stderr.txt")
);
unlockAll();

// Snapshots before anything is added to the run dir.
const postRun = snapshot(runDir);
const postRunsTop = topLevel(lib.RUN_ROOT);
const postSubjects = snapshot(join(HERE, "subjects"));
const postRoot = topLevel(HERE);

// Lint or tool config anywhere from the run dir up to the run root, which an agent could
// have written to silence the rule rather than fix it. A run file the harness put there (a
// subject's tsconfig.json) counts only if the agent changed it.
const unchangedRunFile = (dir, name) =>
  dir === runDir && runFileNames.has(name) && preRun[name] === postRun[name];
const configFilesNearRun = [];
for (let d = runDir; d.startsWith(lib.RUN_ROOT); d = dirname(d)) {
  for (const name of readdirSync(d)) {
    if (lib.CONFIG_FILE.test(name) && !unchangedRunFile(d, name))
      configFilesNearRun.push(join(d, name));
  }
  if (d === lib.RUN_ROOT) break;
}

const otherFileChanges = [];
for (const k of new Set([...Object.keys(preRun), ...Object.keys(postRun)])) {
  if (k === subject.basename) continue;
  if (preRun[k] !== postRun[k]) {
    otherFileChanges.push({
      path: k,
      change: !preRun[k] ? "created" : !postRun[k] ? "deleted" : "modified",
    });
  }
}
const subjectDeleted = !postRun[subject.basename];

// Move logs in and add the before/after/diff files. They keep the subject's extension, so a
// .tsx subject's copies still parse as TSX (a .ts subject's are before.ts and after.ts, as
// before).
for (const f of ["prompt.txt", "stdout.txt", "stderr.txt"])
  renameSync(join(stagingDir, f), join(runDir, f));
const artifactExt = extname(subject.basename) || ".ts";
const beforeName = `before${artifactExt}`;
copyFileSync(lib.subjectPath(subject), join(runDir, beforeName));
chmodSync(join(runDir, beforeName), 0o644);
if (!subjectDeleted) copyFileSync(file, join(runDir, `after${artifactExt}`));
let diff = "";
try {
  execFileSync(
    "diff",
    [
      "-u",
      "--label",
      `a/${subject.basename}`,
      "--label",
      `b/${subject.basename}`,
      join(runDir, beforeName),
      file,
    ],
    {
      encoding: "utf8",
    }
  );
} catch (error) {
  diff = error.stdout ?? "";
}
writeFileSync(join(runDir, "diff.patch"), diff);

const transcripts =
  agent === "claude"
    ? findClaudeTranscript(startMs - 1000)
    : findCodexTranscript(startMs - 1000);
if (transcripts[0])
  copyFileSync(transcripts[0], join(runDir, "transcript.jsonl"));

const meta = {
  runId,
  topic: lib.TOPIC,
  subject: subjectId,
  agent,
  command: adapter.command,
  args: adapter.args,
  cwd: runDir,
  cliVersion,
  startedAt: startedAt.toISOString(),
  wallMs,
  timeoutMs: TIMEOUT_MS,
  ...outcome,
  strippedEnv,
  isolation: { lockedDuringRun: lockedPaths },
  promptSha256: sha256(prompt),
  diagnosticsFile: basename(jsonPath),
  runFiles: [...runFileNames],
  ultracite: {
    head: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ULTRACITE,
      encoding: "utf8",
    }).trim(),
    promptTsSha256: sha256(readFileSync(join(AGENT_FIX, "prompt.ts"))),
    agentsTsSha256: sha256(readFileSync(join(AGENT_FIX, "agents.ts"))),
  },
  fileChecks: {
    subjectDeleted,
    otherFileChanges,
    diagnosticsJsonUnchanged:
      preRun[basename(jsonPath)] === postRun[basename(jsonPath)],
    newRunsEntries: postRunsTop.filter(
      (x) => !preRunsTop.includes(x) && x !== runId
    ),
    newExperimentRootEntries: postRoot.filter((x) => !preRoot.includes(x)),
    pristineSubjectsUnchanged:
      JSON.stringify(preSubjects) === JSON.stringify(postSubjects),
    configFilesNearRun,
  },
  // The session log's folder name encodes this machine's temp path, so only its kind is kept.
  transcriptSource: transcripts.map((p) =>
    p.startsWith(join(homedir(), ".codex"))
      ? "~/.codex/sessions/<session-log>.jsonl"
      : "~/.claude/projects/<session-log>.jsonl"
  ),
};

// Copy the run into the repo. Text artifacts are redacted (paths, home dir, session ids);
// the session log, stdout and stderr are copied too but gitignored, since they carry account
// details. The edited subject is already saved as after.ts (after.tsx for a .tsx subject).
mkdirSync(resultDir, { recursive: true });
const TEXT = /\.(txt|json|tsx?|patch|jsonl)$/;
for (const name of readdirSync(runDir)) {
  if (name === subject.basename || unchangedRunFile(runDir, name)) continue;
  const from = join(runDir, name);
  const to = join(resultDir, name);
  const keepRaw = ["transcript.jsonl", "stdout.txt", "stderr.txt"].includes(
    name
  );
  if (TEXT.test(name) && !keepRaw)
    writeFileSync(to, lib.redact(readFileSync(from, "utf8")));
  else copyFileSync(from, to);
}
writeFileSync(
  join(resultDir, "meta.json"),
  `${JSON.stringify(lib.redact(meta), null, 2)}\n`
);
console.log(
  `[${runId}] exit=${outcome.exitCode} signal=${outcome.signal} timedOut=${outcome.timedOut} wall=${(wallMs / 1000).toFixed(1)}s transcript=${transcripts.length}`
);

// ---------------------------------------------------------------- multi-file subjects

/** Every file under `dir`, as forward-slash paths relative to it. */
function listTree(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split("\\").join("/"));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

/** Copies `from` to a fresh `to`, skipping the names in `skip` (paths relative to `from`). */
function copyTree(from, to, skip = new Set()) {
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  for (const rel of listTree(from)) {
    if (skip.has(rel)) continue;
    mkdirSync(dirname(join(to, rel)), { recursive: true });
    copyFileSync(join(from, rel), join(to, rel));
  }
}

/** A unified diff of two trees, file by file in path order, with a/ and b/ labels. */
function treeDiff(fromDir, toDir) {
  const a = new Set(listTree(fromDir));
  const b = new Set(listTree(toDir));
  let out = "";
  for (const rel of [...new Set([...a, ...b])].sort()) {
    try {
      execFileSync(
        "diff",
        [
          "-u",
          "--label",
          a.has(rel) ? `a/${rel}` : "/dev/null",
          "--label",
          b.has(rel) ? `b/${rel}` : "/dev/null",
          a.has(rel) ? join(fromDir, rel) : "/dev/null",
          b.has(rel) ? join(toDir, rel) : "/dev/null",
        ],
        { encoding: "utf8" }
      );
    } catch (error) {
      out += error.stdout ?? "";
    }
  }
  return out;
}

/**
 * Copies a tree into the results, redacting text files (paths, session ids, emails, the account
 * name) as every committed artifact is. Returns the files redaction changed.
 */
function writeRedactedTree(from, to) {
  const changed = [];
  for (const rel of listTree(from)) {
    const buf = readFileSync(join(from, rel));
    mkdirSync(dirname(join(to, rel)), { recursive: true });
    if (buf.includes(0)) {
      copyFileSync(join(from, rel), join(to, rel));
      continue;
    }
    const text = buf.toString("utf8");
    const redacted = lib.redact(text);
    if (redacted !== text) changed.push(rel);
    writeFileSync(join(to, rel), redacted);
  }
  return changed;
}

/**
 * A multi-file subject (its manifest entry lists `files`; added with the import-cycles topic).
 * The whole subject is copied into the run dir, keeping its folders, with the topic's run files.
 * The topic's `handoff(subject, runDir, { runId })` hook lints it as `ultracite fix` would and
 * returns `{ groups, info }`: the files in the order Ultracite hands them over, each with its
 * diagnostics, and facts about the handoff for meta.json. As in Ultracite
 * (packages/cli/src/agent-fix/index.ts), the groups are collected once, before the first agent
 * runs, and each gets one agent run, one after another in the same directory, with its prompt and
 * diagnostics JSON written just before it. Nothing is re-linted between steps, so a later step
 * gets its diagnostics as they were before the earlier steps' edits. Retries aren't run.
 *
 * Artifacts in results/<topic>/runs/<id>/:
 *   meta.json                       run-level facts, and per step its file, outcome and fileChecks
 *   <name>.<hash>.json              each step's diagnostics JSON, as the agent saw it
 *   before/<path>, after/<path>     the run dir's files before the first step and after the last
 *                                   (files the agent created included, deleted ones absent;
 *                                   diagnostics JSON excluded)
 *   diff.patch                      before -> after, every file
 *   step<k>/prompt.txt, diff.patch  the step's prompt, and the change it made to every file
 *   step<k>/after/<path>            the files after step k, for every step but the last
 *   step<k>/stdout.txt, stderr.txt and transcript.jsonl   gitignored
 */
async function runMultiFile() {
  const subjectDir = join(HERE, subject.dir);
  for (const rel of subject.files) {
    const to = join(runDir, rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(subjectDir, rel), to);
    chmodSync(to, 0o644);
  }
  const extras = topic.runFiles(subject);
  for (const extra of extras) {
    const to = join(runDir, extra.name);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(extra.from, to);
    chmodSync(to, 0o644);
  }
  const extraNames = new Set(extras.map((f) => f.name));

  // What Ultracite would hand over, collected once before any agent runs.
  const { groups, info } = await topic.handoff(subject, runDir, { runId });
  const expected = topic.expectedDiagnostics(subject);
  const got = groups.map((g) => ({ file: g.file, count: g.issues.length }));
  if (JSON.stringify(got) !== JSON.stringify(expected))
    throw new Error(
      `expected handoff ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`
    );

  const cliVersion = execFileSync(adapter.command, ["--version"], {
    encoding: "utf8",
  }).trim();
  const jsonNames = new Set();
  const stateDir = (k) => join(stagingDir, `state${k}`);
  copyTree(runDir, stateDir(0));
  const claimed = new Set();
  const steps = [];
  const harnessCwd = process.cwd();

  for (const [index, g] of groups.entries()) {
    const n = index + 1;
    const stepDir = join(stagingDir, `step${n}`);
    mkdirSync(stepDir, { recursive: true });
    process.chdir(runDir);
    const jsonPath = writeDiagnosticsFile(runDir, g.file, g.issues);
    const prompt = buildPrompt(g.file, g.issues, jsonPath);
    process.chdir(harnessCwd);
    writeFileSync(join(stepDir, "prompt.txt"), prompt);
    jsonNames.add(basename(jsonPath));

    const preRun = snapshot(runDir);
    const preRunsTop = topLevel(lib.RUN_ROOT);
    const preSubjects = snapshot(join(HERE, "subjects"));
    const preRoot = topLevel(HERE);

    lockAll();
    const lockedPaths = lockedPathsOf(locked);
    const startedAt = new Date();
    const startMs = Date.now();
    console.log(
      `[${runId} step ${n}/${groups.length}: ${g.file}] ${adapter.command} ${adapter.args.join(" ")}  (cwd ${runDir})`
    );
    const { outcome, wallMs } = await runAgentProcess(
      prompt,
      join(stepDir, "stdout.txt"),
      join(stepDir, "stderr.txt")
    );
    unlockAll();

    const postRun = snapshot(runDir);
    const postRunsTop = topLevel(lib.RUN_ROOT);
    const postSubjects = snapshot(join(HERE, "subjects"));
    const postRoot = topLevel(HERE);

    // Lint or tool config anywhere from the run dir up to the run root (a run file the harness
    // put there counts only if the agent changed it).
    const configFilesNearRun = [];
    for (let d = runDir; d.startsWith(lib.RUN_ROOT); d = dirname(d)) {
      for (const name of readdirSync(d)) {
        const unchangedExtra =
          d === runDir &&
          extraNames.has(name) &&
          preRun[name] === postRun[name];
        if (lib.CONFIG_FILE.test(name) && !unchangedExtra)
          configFilesNearRun.push(join(d, name));
      }
      if (d === lib.RUN_ROOT) break;
    }
    // Recursive too: a config file the agent put in a subfolder of the subject.
    for (const rel of Object.keys(postRun)) {
      if (
        rel.includes("/") &&
        lib.CONFIG_FILE.test(basename(rel)) &&
        preRun[rel] !== postRun[rel]
      )
        configFilesNearRun.push(join(runDir, rel));
    }
    const otherFileChanges = [];
    for (const k of new Set([
      ...Object.keys(preRun),
      ...Object.keys(postRun),
    ])) {
      if (k === g.file) continue;
      if (preRun[k] !== postRun[k]) {
        otherFileChanges.push({
          path: k,
          change: !preRun[k] ? "created" : !postRun[k] ? "deleted" : "modified",
        });
      }
    }
    copyTree(runDir, stateDir(n), jsonNames);

    const transcripts =
      agent === "claude"
        ? findClaudeTranscript(startMs - 1000, claimed)
        : findCodexTranscript(startMs - 1000, claimed);
    if (transcripts[0]) {
      claimed.add(transcripts[0]);
      copyFileSync(transcripts[0], join(stepDir, "transcript.jsonl"));
    }
    steps.push({
      step: n,
      file: g.file,
      issues: g.issues.length,
      startedAt: startedAt.toISOString(),
      wallMs,
      ...outcome,
      promptSha256: sha256(prompt),
      diagnosticsFile: basename(jsonPath),
      isolation: { lockedDuringRun: lockedPaths },
      fileChecks: {
        handedFileDeleted: !postRun[g.file],
        otherFileChanges,
        diagnosticsJsonUnchanged:
          preRun[basename(jsonPath)] === postRun[basename(jsonPath)],
        newRunsEntries: postRunsTop.filter(
          (x) => !preRunsTop.includes(x) && x !== runId
        ),
        newExperimentRootEntries: postRoot.filter((x) => !preRoot.includes(x)),
        pristineSubjectsUnchanged:
          JSON.stringify(preSubjects) === JSON.stringify(postSubjects),
        configFilesNearRun,
      },
      transcriptSource: transcripts
        .slice(0, 1)
        .map((p) =>
          p.startsWith(join(homedir(), ".codex"))
            ? "~/.codex/sessions/<session-log>.jsonl"
            : "~/.claude/projects/<session-log>.jsonl"
        ),
      transcriptCandidates: transcripts.length,
    });
    console.log(
      `[${runId} step ${n}] exit=${outcome.exitCode} signal=${outcome.signal} timedOut=${outcome.timedOut} wall=${(wallMs / 1000).toFixed(1)}s transcript=${transcripts.length} otherFiles=${otherFileChanges.length}`
    );
  }

  // Copy the run into the repo.
  const last = groups.length;
  mkdirSync(resultDir, { recursive: true });
  copyTree(stateDir(0), join(resultDir, "before"));
  const redactedFiles = writeRedactedTree(
    stateDir(last),
    join(resultDir, "after")
  ).map((rel) => `after/${rel}`);
  writeFileSync(
    join(resultDir, "diff.patch"),
    lib.redact(treeDiff(stateDir(0), stateDir(last)))
  );
  for (const name of jsonNames) {
    if (existsSync(join(runDir, name)))
      writeFileSync(
        join(resultDir, name),
        lib.redact(readFileSync(join(runDir, name), "utf8"))
      );
  }
  for (const s of steps) {
    const from = join(stagingDir, `step${s.step}`);
    const to = join(resultDir, `step${s.step}`);
    mkdirSync(to, { recursive: true });
    writeFileSync(
      join(to, "prompt.txt"),
      lib.redact(readFileSync(join(from, "prompt.txt"), "utf8"))
    );
    writeFileSync(
      join(to, "diff.patch"),
      lib.redact(treeDiff(stateDir(s.step - 1), stateDir(s.step)))
    );
    // Session log, stdout and stderr: copied as they are and gitignored (account details).
    for (const f of ["stdout.txt", "stderr.txt", "transcript.jsonl"]) {
      if (existsSync(join(from, f))) copyFileSync(join(from, f), join(to, f));
    }
    if (s.step < last)
      redactedFiles.push(
        ...writeRedactedTree(stateDir(s.step), join(to, "after")).map(
          (rel) => `step${s.step}/after/${rel}`
        )
      );
  }

  const uniq = (xs) => [...new Set(xs)];
  const firstFailure = steps.find((s) => s.exitCode !== 0) ?? null;
  const meta = {
    runId,
    topic: lib.TOPIC,
    subject: subjectId,
    agent,
    command: adapter.command,
    args: adapter.args,
    cwd: runDir,
    cliVersion,
    startedAt: steps[0].startedAt,
    wallMs: steps.reduce((sum, s) => sum + s.wallMs, 0),
    timeoutMs: TIMEOUT_MS,
    exitCode: firstFailure ? firstFailure.exitCode : 0,
    signal: firstFailure?.signal ?? null,
    timedOut: steps.some((s) => s.timedOut),
    spawnError: steps.find((s) => s.spawnError)?.spawnError ?? null,
    strippedEnv,
    isolation: {
      lockedDuringRun: uniq(steps.flatMap((s) => s.isolation.lockedDuringRun)),
    },
    files: subject.files,
    runFiles: [...extraNames],
    handoff: info,
    steps,
    ultracite: {
      head: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: ULTRACITE,
        encoding: "utf8",
      }).trim(),
      promptTsSha256: sha256(readFileSync(join(AGENT_FIX, "prompt.ts"))),
      agentsTsSha256: sha256(readFileSync(join(AGENT_FIX, "agents.ts"))),
      indexTsSha256: sha256(readFileSync(join(AGENT_FIX, "index.ts"))),
      lintersTsSha256: sha256(readFileSync(join(AGENT_FIX, "linters.ts"))),
      diffTsSha256: sha256(readFileSync(join(AGENT_FIX, "diff.ts"))),
    },
    // Run-level summary of the per-step checks. A change to any file other than the one a step
    // handed over counts for that step, so in a two-step run an edit to the first file during
    // the second step is listed.
    fileChecks: {
      subjectDeleted: steps.some((s) => s.fileChecks.handedFileDeleted),
      otherFileChanges: steps.flatMap((s) =>
        s.fileChecks.otherFileChanges.map((c) => ({
          step: s.step,
          handedFile: s.file,
          ...c,
        }))
      ),
      diagnosticsJsonUnchanged: steps.every(
        (s) => s.fileChecks.diagnosticsJsonUnchanged
      ),
      newRunsEntries: uniq(steps.flatMap((s) => s.fileChecks.newRunsEntries)),
      newExperimentRootEntries: uniq(
        steps.flatMap((s) => s.fileChecks.newExperimentRootEntries)
      ),
      pristineSubjectsUnchanged: steps.every(
        (s) => s.fileChecks.pristineSubjectsUnchanged
      ),
      configFilesNearRun: uniq(
        steps.flatMap((s) => s.fileChecks.configFilesNearRun)
      ),
    },
    redactedFiles,
  };
  writeFileSync(
    join(resultDir, "meta.json"),
    `${JSON.stringify(lib.redact(meta), null, 2)}\n`
  );
  console.log(
    `[${runId}] ${steps.length} step(s), wall=${(meta.wallMs / 1000).toFixed(1)}s, other-file changes=${meta.fileChecks.otherFileChanges.length}`
  );
}
