// One experiment run: fresh run dir, real ESLint diagnostic, Ultracite's own prompt and
// diagnostics-file functions, then the agent CLI exactly as Ultracite invokes it.
//
// Usage: node scripts/run-one.mjs <s1|s2> <claude|codex> <n>
//
// The agent runs in <RUN_ROOT>/<id>/, a temp directory outside the repo (see lib.cjs), so it
// can't load the repo's CLAUDE.md or AGENTS.md from a parent directory. During the run that
// directory holds only the subject file and the diagnostics JSON. Logs stream to
// <RUN_ROOT>/.staging/<id>/ so the agent never sees its own logs, the prompt file or the
// pristine copy. Afterwards everything except the edited subject (kept as after.ts) is copied,
// with paths and session ids redacted, into results/<topic>/runs/<id>/.
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
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, join, relative } from "node:path";

const require = createRequire(import.meta.url);
const lib = require("./lib.cjs");

const ULTRACITE = lib.REPO_ROOT;
const AGENT_FIX = join(ULTRACITE, "packages/cli/src/agent-fix");
const TIMEOUT_MS = 10 * 60 * 1000;
const KILL_GRACE_MS = 10 * 1000; // Ultracite's KILL_GRACE_MS (run-agent.ts)

const [subjectId, agent, n] = process.argv.slice(2);
if (
  !["s1", "s2"].includes(subjectId) ||
  !["claude", "codex"].includes(agent) ||
  !n
) {
  console.error("usage: node scripts/run-one.mjs <s1|s2> <claude|codex> <n>");
  process.exit(2);
}

const HERE = lib.HERE;
const subjects = JSON.parse(
  readFileSync(join(HERE, "subjects/subjects.json"), "utf8")
);
const subject = subjects.find((s) => s.id === subjectId);
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

function findClaudeTranscript(startMs) {
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
      if (statSync(p).mtimeMs < startMs) continue;
      if (readFileSync(p, "utf8").includes(`"cwd":"${runDir}"`)) hits.push(p);
    }
  }
  return hits;
}

function findCodexTranscript(startMs) {
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
      if (!f.endsWith(".jsonl") || statSync(p).mtimeMs < startMs) continue;
      const first = readFileSync(p, "utf8").split("\n", 1)[0];
      try {
        if (JSON.parse(first)?.payload?.cwd === runDir) hits.push(p);
      } catch {
        // not a session file
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------- main

const { buildPrompt, writeDiagnosticsFile } = await import(
  join(AGENT_FIX, "prompt.ts")
);
const adapter = adapterFromSource(agent);

mkdirSync(runDir, { recursive: true });
mkdirSync(stagingDir, { recursive: true });
const file = join(runDir, subject.basename);
copyFileSync(lib.subjectPath(subject), file);
chmodSync(file, 0o644);

// The diagnostic the agent sees: sonarjs/cognitive-complexity at 15, nothing else.
const lintResult = await lib.lintCognitive(file);
const diagnostics = lib.toUltraciteDiagnostics(lintResult);
if (diagnostics.length !== 1)
  throw new Error(`expected exactly 1 diagnostic, got ${diagnostics.length}`);
// Ultracite groups by diagnostic.file and passes that path to both functions.
const group = { file: diagnostics[0].file, issues: diagnostics };
const jsonPath = writeDiagnosticsFile(runDir, group.file, group.issues);
const prompt = buildPrompt(group.file, group.issues, jsonPath);
writeFileSync(join(stagingDir, "prompt.txt"), prompt);

const cliVersion = execFileSync(adapter.command, ["--version"], {
  encoding: "utf8",
}).trim();
const preRun = snapshot(runDir);
const preRunsTop = topLevel(lib.RUN_ROOT);
const preSubjects = snapshot(join(HERE, "subjects"));
const preRoot = topLevel(HERE);

// A plain terminal environment: drop the variables this parent Claude Code session sets.
const env = { ...process.env };
const strippedEnv = Object.keys(env).filter((k) => k.startsWith("CLAUDE"));
for (const k of strippedEnv) delete env[k];

const stdout = createWriteStream(join(stagingDir, "stdout.txt"));
const stderr = createWriteStream(join(stagingDir, "stderr.txt"));
await Promise.all([
  new Promise((r) => stdout.on("open", r)),
  new Promise((r) => stderr.on("open", r)),
]);

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
const lockAll = () => {
  const targets = [
    ...LOCK_NAMES.map((n) => join(HERE, n)),
    ...readdirSync(lib.RUN_ROOT)
      .filter((d) => d !== runId && d !== ".staging")
      .map((d) => join(lib.RUN_ROOT, d)),
  ].filter((p) => existsSync(p));
  for (const p of targets) {
    locked.push({ path: p, mode: statSync(p).mode & 0o7777 });
  }
  writeFileSync(
    join(stagingDir, "locks.json"),
    JSON.stringify(locked, null, 2)
  );
  for (const { path } of locked) chmodSync(path, 0o000);
};
const unlockAll = () => {
  for (const { path, mode } of locked.splice(0)) {
    try {
      chmodSync(path, mode);
    } catch {
      // already restored
    }
  }
};
process.on("exit", unlockAll);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    unlockAll();
    process.exit(130);
  });
}
lockAll();
const lockedPaths = locked.map((l) => relative(HERE, l.path));

const startedAt = new Date();
const startMs = Date.now();
console.log(
  `[${runId}] ${adapter.command} ${adapter.args.join(" ")}  (cwd ${runDir})`
);

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
unlockAll();
await Promise.all([
  new Promise((r) => stdout.end(r)),
  new Promise((r) => stderr.end(r)),
]);

// Snapshots before anything is added to the run dir.
const postRun = snapshot(runDir);
const postRunsTop = topLevel(lib.RUN_ROOT);
const postSubjects = snapshot(join(HERE, "subjects"));
const postRoot = topLevel(HERE);

// Lint or tool config anywhere from the run dir up to the run root, which an agent could
// have written to silence the rule rather than fix it.
const configFilesNearRun = [];
for (let d = runDir; d.startsWith(lib.RUN_ROOT); d = dirname(d)) {
  for (const name of readdirSync(d)) {
    if (lib.CONFIG_FILE.test(name)) configFilesNearRun.push(join(d, name));
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

// Move logs in and add the before/after/diff files.
for (const f of ["prompt.txt", "stdout.txt", "stderr.txt"])
  renameSync(join(stagingDir, f), join(runDir, f));
copyFileSync(lib.subjectPath(subject), join(runDir, "before.ts"));
chmodSync(join(runDir, "before.ts"), 0o644);
if (!subjectDeleted) copyFileSync(file, join(runDir, "after.ts"));
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
      join(runDir, "before.ts"),
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
  transcriptSource: transcripts,
};

// Copy the run into the repo. Text artifacts are redacted (paths, home dir, session ids);
// the session log, stdout and stderr are copied too but gitignored, since they carry account
// details. The edited subject is already saved as after.ts.
mkdirSync(resultDir, { recursive: true });
const TEXT = /\.(txt|json|ts|patch|jsonl)$/;
for (const name of readdirSync(runDir)) {
  if (name === subject.basename) continue;
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
