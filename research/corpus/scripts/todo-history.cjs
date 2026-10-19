// How old the TODOs are, and what happens to them over time, from git history alone.
// Needs the history clones (todo-history-clone.sh). Only `git log`, `git blame` and `git show`
// run on them; nothing from a clone is installed, built or executed.
//
//   --blame     Age at the pinned commit: `git blame --line-porcelain -w -M` (with the repo's own
//               .git-blame-ignore-revs, when it has one) of the line of every TODO, FIXME, XXX and
//               @todo marker in the corpus (out/todo-comments/markers.json).
//   --survival  Every marker line added or removed on the mainline (`--first-parent`, merges
//               diffed against their first parent, renames followed) in the measured package's
//               source directories, in every layout the package has had. Each marker is tracked
//               from the commit that added it to the commit that removed it, or to the pinned
//               commit. A marker whose line only moved inside its file, moved to another file in
//               the same commit, or was reworded (same file, at least half its words kept) lives
//               on. For markers added from 2018 to 2024 (as far as each history goes back): the
//               share removed, the time to removal (Kaplan–Meier, censored at the pinned commit),
//               and who removed them.
//   --classify  For each removal of a marker added in that window, what happened to the code
//               around it, following Zampetti et al. (MSR 2018, §2.2.1): the file was deleted
//               (their "class removal"), the enclosing function was deleted ("method removal"),
//               the function is unchanged apart from the comment ("method not changed"), or the
//               function changed ("method changed"). Functions are matched by name and nesting
//               with TypeScript's parser on the file before and after the commit. Top-level
//               comments are compared on the statement that follows them.
//   --sample    Draws the seeded, stratified removal sample for hand classification (frozen in
//               results/todo-comments/removal-sample.json; --resample draws again) and writes a
//               worksheet with each removal's hunk and commit message to out/todo-comments/.
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/todo-history.cjs --blame --survival --classify --sample [--repos a,b]
// Writes results/todo-comments/history.json and out/todo-comments/history-events.json.
"use strict";

const { execFileSync, spawn } = require("node:child_process");
const { existsSync, mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const readline = require("node:readline");

const lib = require("./todo-lib.cjs");
const {
  EXCLUDED_DIR_NAMES,
  EXCLUDED_FILE_PATTERNS,
  config,
} = require("./collect-files.cjs");

const { dc } = lib;
const ts = dc.ts;
const HISTORY = lib.HISTORY_DIR;
const WINDOW = {
  from: Date.parse("2018-01-01T00:00:00Z") / 1000,
  to: Date.parse("2025-01-01T00:00:00Z") / 1000,
};
const DAY = 86400;

// The measured package's source directories, in every layout its history has had.
const SCOPES = {
  astro: ["packages/astro/src", "src"],
  excalidraw: [
    "packages/excalidraw",
    "packages/element/src",
    "packages/common/src",
    "packages/math/src",
    "packages/utils/src",
    "src",
  ],
  hono: ["src"],
  "next.js": [
    ...[
      "agent-feedback",
      "api",
      "bin",
      "build",
      "cli",
      "client",
      "diagnostics",
      "experimental",
      "export",
      "lib",
      "next-devtools",
      "pages",
      "server",
      "shared",
      "telemetry",
      "trace",
    ].map((d) => `packages/next/src/${d}`),
    ...[
      "bin",
      "build",
      "cli",
      "client",
      "export",
      "lib",
      "pages",
      "server",
      "shared",
      "telemetry",
      "trace",
      "next-server",
      "types",
    ].map((d) => `packages/next/${d}`),
  ],
  trpc: [
    "client",
    "next",
    "openapi",
    "react",
    "react-query",
    "server",
    "tanstack-react-query",
    "upgrade",
  ].map((p) => `packages/${p}/src`),
  vite: ["packages/vite/src", "src"],
  vscode: ["src/vs/editor/common"],
  zod: ["packages/zod/src", "src"],
};
const SOURCE_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const repoExcludes = (name) =>
  (config.repos.find((r) => r.name === name)?.exclude ?? []).map((p) =>
    p.replace(/\/$/, "")
  );
const inScope = (name, path) => {
  if (!SOURCE_EXT.test(path)) {
    return false;
  }
  if (!SCOPES[name].some((s) => path === s || path.startsWith(`${s}/`))) {
    return false;
  }
  const parts = path.split("/");
  if (parts.slice(0, -1).some((p) => EXCLUDED_DIR_NAMES.has(p))) {
    return false;
  }
  if (EXCLUDED_FILE_PATTERNS.some(([re]) => re.test(parts.at(-1)))) {
    return false;
  }
  return !repoExcludes(name).some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
};

const git = (name, argv, opts = {}) =>
  execFileSync(
    "git",
    ["-C", join(HISTORY, `${name}.git`), "-c", "core.quotePath=false", ...argv],
    {
      encoding: "utf8",
      maxBuffer: 1 << 30,
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    }
  );
const commitTime = (name, sha) =>
  Number(git(name, ["log", "-1", "--format=%ct", sha]).trim());

// ── markers on a diff line ─────────────────────────────────────────────
// A marker line: TODO, FIXME or XXX in capitals (873 of the corpus's 882 are), "todo" in any case
// opening a comment, or the JSDoc @todo tag, after a comment opener on the line (or on a line
// that starts with `*`, a block comment's continuation).
const MARK_RE =
  /(?<![\p{L}\p{N}_])(?:TODO|FIXME|XXX)(?![\p{L}\p{N}_])|@todo\b/u;
const START_TODO_RE = /(?:\/\/+|\/\*+|^\s*\*)\s*(?:todo|fixme)\b/i;
const markerOnLine = (line) => {
  const opener = line.search(/\/\/|\/\*/);
  const continuation = /^\s*\*/.test(line);
  const m = MARK_RE.exec(line) ?? START_TODO_RE.exec(line);
  if (!m) {
    return null;
  }
  if (!continuation && (opener === -1 || opener > m.index)) {
    return null;
  }
  const from = continuation ? line.search(/\*/) : opener;
  const text = line
    .slice(from)
    .replace(/^(?:\/\/+|\/\*+|\*+)/, "")
    .replace(/\*\/\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    term: /@todo/.test(m[0])
      ? "@todo"
      : m[0].toUpperCase().replace(/^.*(TODO|FIXME|XXX).*$/i, "$1"),
    text,
  };
};
const words = (t) =>
  new Set(
    t
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1)
  );
const similar = (a, b) => {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) {
    return a === b;
  }
  let shared = 0;
  for (const w of x) {
    if (y.has(w)) {
      shared++;
    }
  }
  return shared / Math.min(x.size, y.size) >= 0.5;
};

// ── survival ───────────────────────────────────────────────────────────
// Streams `git log -p` and returns every marker's life: added (commit, time, author), removed or
// alive at the pinned commit, and the moves and rewordings in between.
const survival = (name) =>
  new Promise((resolve, reject) => {
    const sha = lib.PINNED[name];
    const child = spawn(
      "git",
      [
        "-C",
        join(HISTORY, `${name}.git`),
        "-c",
        "core.quotePath=false",
        "-c",
        "diff.renameLimit=100000",
        "log",
        "--first-parent",
        "--diff-merges=first-parent",
        "--reverse",
        "-M",
        "-p",
        "-U0",
        "--no-color",
        "--no-ext-diff",
        "--format=@@@COMMIT %H %ct%n%an%n%ae%n%s",
        sha,
        "--",
        ...SCOPES[name],
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    const open = new Map(); // `${path}\0${text}` -> [instance]
    const done = [];
    let commit = null;
    let file = null; // { from, to, deleted, added }
    let hunk = null; // { oldStart, newStart, oldLine, newLine, removed: [], added: [] }
    let changes = []; // per commit: { kind: "-"|"+", path, line, text, term, hunk }
    let renames = [];
    let commits = 0;
    let headerLines = 0;
    const authorOf = (c) => ({
      email: c.email.toLowerCase(),
      name: c.author.toLowerCase(),
    });
    const sameAuthor = (a, b) =>
      a && b && (a.email === b.email || a.name === b.name);

    const finishHunk = () => {
      if (hunk && file) {
        file.hunks.push(hunk);
      }
      hunk = null;
    };
    const finishFile = () => {
      finishHunk();
      if (file) {
        commit.files.push(file);
      }
      file = null;
    };
    const finishCommit = () => {
      finishFile();
      if (!commit) {
        return;
      }
      commits++;
      // Renames first: open markers follow their file.
      for (const f of commit.files) {
        if (f.from && f.to && f.from !== f.to) {
          for (const [key, list] of [...open]) {
            const [path, text] = key.split("\0");
            if (path === f.from) {
              open.delete(key);
              const k2 = `${f.to}\0${text}`;
              open.set(k2, [
                ...(open.get(k2) ?? []),
                ...list.map((i) => ({
                  ...i,
                  path: f.to,
                  renamed: (i.renamed ?? 0) + 1,
                })),
              ]);
            }
          }
        }
      }
      const removed = [];
      const added = [];
      for (const f of commit.files) {
        for (const h of f.hunks) {
          for (const r of h.removed) {
            const m = markerOnLine(r.text);
            if (m && f.from && inScope(name, f.from)) {
              removed.push({
                ...m,
                file: f,
                hunk: h,
                line: r.line,
                path: f.to ?? f.from,
                oldPath: f.from,
              });
            }
          }
          for (const a of h.added) {
            const m = markerOnLine(a.text);
            if (m && f.to && inScope(name, f.to)) {
              added.push({ ...m, file: f, hunk: h, line: a.line, path: f.to });
            }
          }
        }
      }
      // Pair removals with additions: same file and text (a moved line), same text elsewhere (a
      // moved block), same file and a similar text (a reworded marker).
      const pair = (pred, kind) => {
        for (const r of removed) {
          if (r.paired) {
            continue;
          }
          const a = added.find((x) => !x.paired && pred(r, x));
          if (a) {
            r.paired = kind;
            a.paired = kind;
            a.from = r;
          }
        }
      };
      pair((r, a) => r.path === a.path && r.text === a.text, "line moved");
      pair((r, a) => r.text === a.text, "moved to another file");
      pair(
        (r, a) =>
          r.path === a.path && r.term === a.term && similar(r.text, a.text),
        "reworded"
      );
      const take = (path, text) => {
        const key = `${path}\0${text}`;
        const list = open.get(key);
        if (!list || list.length === 0) {
          return null;
        }
        const inst = list.shift();
        if (list.length === 0) {
          open.delete(key);
        }
        return inst;
      };
      const put = (inst) => {
        const key = `${inst.path}\0${inst.text}`;
        open.set(key, [...(open.get(key) ?? []), inst]);
      };
      for (const a of added.filter((x) => x.paired)) {
        const inst = take(a.from.path, a.from.text);
        if (inst) {
          inst.path = a.path;
          if (a.paired !== "line moved") {
            inst.events.push({
              commit: commit.sha,
              kind: a.paired,
              time: commit.time,
            });
          }
          inst.text = a.text;
          inst.line = a.line;
          put(inst);
        } else {
          // Its addition wasn't seen (it predates the scope's history, or came from outside it).
          put({
            added: {
              author: authorOf(commit),
              commit: commit.sha,
              time: commit.time,
              inferred: true,
            },
            events: [],
            line: a.line,
            path: a.path,
            term: a.term,
            text: a.text,
          });
        }
      }
      for (const r of removed.filter((x) => !x.paired)) {
        const inst = take(r.oldPath, r.text) ?? take(r.path, r.text);
        if (!inst) {
          continue; // never seen added (outside the scope until now)
        }
        const h = r.hunk;
        done.push({
          ...inst,
          removed: {
            author: authorOf(commit),
            commit: commit.sha,
            fileDeleted: r.file.to === null,
            hunk: { added: h.added.length, removed: h.removed.length },
            line: r.line,
            path: r.oldPath,
            sameAuthor: sameAuthor(inst.added.author, authorOf(commit)),
            subject: commit.subject,
            time: commit.time,
          },
        });
      }
      for (const a of added.filter((x) => !x.paired)) {
        put({
          added: {
            author: authorOf(commit),
            commit: commit.sha,
            time: commit.time,
          },
          events: [],
          line: a.line,
          path: a.path,
          term: a.term,
          text: a.text,
        });
      }
      commit = null;
    };

    const rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Number.POSITIVE_INFINITY,
    });
    rl.on("line", (line) => {
      if (line.startsWith("@@@COMMIT ")) {
        finishCommit();
        const [, sha2, time] = line.split(" ");
        commit = { files: [], sha: sha2, time: Number(time) };
        headerLines = 3;
        return;
      }
      if (headerLines > 0) {
        if (headerLines === 3) {
          commit.author = line;
        } else if (headerLines === 2) {
          commit.email = line;
        } else {
          commit.subject = line;
        }
        headerLines--;
        return;
      }
      if (!commit) {
        return;
      }
      if (line.startsWith("diff --git ")) {
        finishFile();
        const m = /^diff --git a\/(.*) b\/(.*)$/.exec(line);
        file = { from: m?.[1] ?? null, hunks: [], to: m?.[2] ?? null };
        return;
      }
      if (!file) {
        return;
      }
      if (!hunk) {
        if (line.startsWith("rename from ")) {
          file.from = line.slice(12);
        } else if (line.startsWith("rename to ")) {
          file.to = line.slice(10);
        } else if (line.startsWith("new file mode")) {
          file.from = null;
        } else if (line.startsWith("deleted file mode")) {
          file.to = null;
        } else if (line === "--- /dev/null") {
          file.from = null;
        } else if (line === "+++ /dev/null") {
          file.to = null;
        }
      }
      if (line.startsWith("@@ ")) {
        finishHunk();
        const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
        hunk = {
          added: [],
          newLine: Number(m[3]),
          oldLine: Number(m[1]),
          removed: [],
        };
        return;
      }
      if (!hunk) {
        return;
      }
      if (line.startsWith("-")) {
        hunk.removed.push({ line: hunk.oldLine++, text: line.slice(1) });
      } else if (line.startsWith("+")) {
        hunk.added.push({ line: hunk.newLine++, text: line.slice(1) });
      }
    });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("close", (code) => {
      finishCommit();
      if (code !== 0) {
        reject(
          new Error(`${name}: git log exited ${code}: ${stderr.slice(0, 500)}`)
        );
        return;
      }
      const alive = [...open.values()].flat();
      resolve({ alive, commits, removed: done });
    });
  });

// A marker removed and then added again with the same text within 90 days (code moved in two
// steps, a revert, a rebase) is one marker, not a removal and an addition.
const RELINK_DAYS = 90;
const relink = (rows) => {
  const adds = rows
    .filter((r) => !r.added.inferred)
    .sort((a, b) => a.added.time - b.added.time);
  const byText = new Map();
  for (const a of adds) {
    byText.set(a.text, [...(byText.get(a.text) ?? []), a]);
  }
  const dropped = new Set();
  const removals = rows
    .filter((r) => r.removed)
    .sort((a, b) => a.removed.time - b.removed.time);
  for (const r of removals) {
    let cur = r;
    while (cur.removed) {
      const next = (byText.get(cur.text) ?? []).find(
        (a) =>
          a !== cur &&
          !dropped.has(a) &&
          a.added.time >= cur.removed.time &&
          a.added.time - cur.removed.time <= RELINK_DAYS * DAY
      );
      if (!next) {
        break;
      }
      dropped.add(next);
      cur.events.push({
        commit: next.added.commit,
        kind: "re-added",
        time: next.added.time,
      });
      cur.events.push(...next.events);
      cur.path = next.path;
      cur.line = next.line;
      cur.removed = next.removed ?? null;
      if (!cur.removed) {
        delete cur.removed;
      }
    }
  }
  return rows.filter((r) => !dropped.has(r));
};

// Kaplan–Meier survival of markers, in days, censored at the pinned commit.
const kaplanMeier = (rows, end) => {
  const items = rows
    .map((r) =>
      r.removed
        ? { event: true, t: (r.removed.time - r.added.time) / DAY }
        : { event: false, t: (end - r.added.time) / DAY }
    )
    .sort((a, b) => a.t - b.t);
  let atRisk = items.length;
  let s = 1;
  const curve = [];
  let median = null;
  for (let i = 0; i < items.length;) {
    const t = items[i].t;
    let events = 0;
    let censored = 0;
    while (i < items.length && items[i].t === t) {
      if (items[i].event) {
        events++;
      } else {
        censored++;
      }
      i++;
    }
    if (events > 0) {
      s *= 1 - events / atRisk;
      curve.push({ s: Math.round(s * 1000) / 1000, t: Math.round(t) });
      if (median === null && s <= 0.5) {
        median = Math.round(t);
      }
    }
    atRisk -= events + censored;
  }
  const at = (days) => {
    let v = 1;
    for (const p of curve) {
      if (p.t <= days) {
        v = p.s;
      }
    }
    return Math.round(v * 1000) / 1000;
  };
  return {
    medianDays: median,
    survival: {
      "1y": at(365),
      "2y": at(730),
      "30d": at(30),
      "5y": at(1826),
      "90d": at(90),
    },
  };
};

const quantiles = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) =>
    s.length === 0
      ? null
      : s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return {
    max: s.at(-1) ?? null,
    median: q(0.5),
    n: s.length,
    p25: q(0.25),
    p75: q(0.75),
    p90: q(0.9),
  };
};

// ── what happened to the code around a removed marker ─────────────────
// Functions (and methods, accessors, function-valued properties and variables) by nested name.
const functionsOf = (text, path) => {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.(?:tsx|jsx)$/.test(path)
      ? ts.ScriptKind.TSX
      : /\.(?:js|mjs|cjs)$/.test(path)
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.TS
  );
  const out = [];
  const nameOf = (node) => {
    if (
      node.name &&
      (ts.isIdentifier(node.name) ||
        ts.isStringLiteral(node.name) ||
        ts.isPrivateIdentifier(node.name))
    ) {
      return node.name.text;
    }
    if (
      (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
      node.parent
    ) {
      const p = node.parent;
      if (
        (ts.isVariableDeclaration(p) ||
          ts.isPropertyAssignment(p) ||
          ts.isPropertyDeclaration(p)) &&
        p.name &&
        ts.isIdentifier(p.name)
      ) {
        return p.name.text;
      }
      if (ts.isCallExpression(p)) {
        const callee = p.expression.getText(sf).slice(0, 40);
        return `${callee}(callback ${p.arguments.indexOf(node)})`;
      }
    }
    if (ts.isConstructorDeclaration(node)) {
      return "constructor";
    }
    return null;
  };
  const visit = (node, scope) => {
    let next = scope;
    if (
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node) ||
      ts.isModuleDeclaration(node) ||
      ts.isInterfaceDeclaration(node)
    ) {
      next = [...scope, node.name ? node.name.text : "(anonymous)"];
    }
    if (ts.isFunctionLike(node) && node.body) {
      const name = nameOf(node) ?? "(anonymous)";
      const key = [...scope, name].join(".");
      const start =
        sf.getLineAndCharacterOfPosition(node.getFullStart()).line + 1;
      const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      out.push({ end, key, start, text: node.getText(sf) });
      next = [...scope, name];
    }
    ts.forEachChild(node, (child) => visit(child, next));
  };
  visit(sf, []);
  return { functions: out, sf };
};
const stripComments = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
    .replace(/\s+/g, "");
const show = (name, rev, path) => {
  try {
    return git(name, ["show", `${rev}:${path}`]);
  } catch {
    return null;
  }
};
const classifyRemoval = (name, r) => {
  if (r.removed.fileDeleted) {
    return { kind: "file deleted" };
  }
  const before = show(name, `${r.removed.commit}^`, r.removed.path);
  // Merges were diffed against their first parent.
  const afterPath = r.removed.path;
  let after = show(name, r.removed.commit, afterPath);
  if (before === null) {
    return { kind: "unclassified", why: "file not found at the parent" };
  }
  if (after === null) {
    // Renamed in the same commit: find it among the commit's renames.
    const renamed = git(name, [
      "diff",
      "--name-status",
      "-M",
      `${r.removed.commit}^`,
      r.removed.commit,
    ])
      .split("\n")
      .map((l) => l.split("\t"))
      .find((p) => p[0]?.startsWith("R") && p[1] === r.removed.path);
    after = renamed ? show(name, r.removed.commit, renamed[2]) : null;
    if (after === null) {
      return { kind: "file deleted" };
    }
  }
  const b = functionsOf(before, r.removed.path);
  const a = functionsOf(after, r.removed.path);
  const enclosing = b.functions
    .filter((f) => f.start <= r.removed.line && f.end >= r.removed.line)
    .sort((x, y) => y.start - x.start)[0];
  if (!enclosing) {
    // A top-level comment: compare the statement that follows it.
    const lines = before.split("\n");
    let i = r.removed.line; // 1-based line of the marker; look below it
    while (
      i < lines.length &&
      (lines[i].trim() === "" || /^\s*(?:\/\/|\/\*|\*)/.test(lines[i]))
    ) {
      i++;
    }
    const nextLine = (lines[i] ?? "").trim();
    if (nextLine === "") {
      return { kind: "top level, nothing follows" };
    }
    const stillThere = after.split("\n").some((l) => l.trim() === nextLine);
    return {
      kind: stillThere
        ? "top level, next statement unchanged"
        : "top level, next statement changed or removed",
      next: nextLine.slice(0, 120),
    };
  }
  const match = a.functions.filter((f) => f.key === enclosing.key);
  if (match.length === 0) {
    return { function: enclosing.key, kind: "function deleted" };
  }
  const same = match.some(
    (f) => stripComments(f.text) === stripComments(enclosing.text)
  );
  return {
    function: enclosing.key,
    kind: same ? "function unchanged" : "function changed",
  };
};

// ── blame ──────────────────────────────────────────────────────────────
const blameFile = (name, path) => {
  const sha = lib.PINNED[name];
  const argv = ["blame", "--line-porcelain", "-w", "-M"];
  let ignoreFile = null;
  try {
    const revs = git(name, ["show", `${sha}:.git-blame-ignore-revs`])
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[0-9a-f]{40}$/.test(l))
      .filter((rev) => {
        try {
          git(name, ["cat-file", "-e", `${rev}^{commit}`]);
          return true;
        } catch {
          return false;
        }
      });
    if (revs.length > 0) {
      ignoreFile = join(lib.OUT_DIR, `blame-ignore-${name}.txt`);
      mkdirSync(lib.OUT_DIR, { recursive: true });
      writeFileSync(ignoreFile, `${revs.join("\n")}\n`);
      argv.push("--ignore-revs-file", ignoreFile);
    }
  } catch {
    // no .git-blame-ignore-revs
  }
  const out = git(name, [...argv, sha, "--", path]);
  const lines = [];
  let cur = null;
  for (const l of out.split("\n")) {
    if (/^[0-9a-f]{40} \d+ \d+/.test(l)) {
      const [commit, , final] = l.split(" ");
      cur = { commit, line: Number(final) };
    } else if (l.startsWith("author-time ")) {
      cur.time = Number(l.slice(12));
    } else if (l.startsWith("author-mail ")) {
      cur.email = l.slice(12).replace(/[<>]/g, "").toLowerCase();
    } else if (l.startsWith("\t")) {
      lines[cur.line] = cur;
    }
  }
  return { ignoreRevs: Boolean(ignoreFile), lines };
};

const blame = (names) => {
  const markers = lib
    .readJson(join(lib.OUT_DIR, "markers.json"))
    .rows.filter(
      (m) =>
        m.kind === "marker" &&
        ["TODO", "FIXME", "XXX", "@todo"].includes(m.term) &&
        names.includes(m.repo)
    );
  const rows = [];
  const perRepo = {};
  for (const name of names) {
    const pinnedTime = commitTime(name, lib.PINNED[name]);
    const mine = markers.filter((m) => m.repo === name);
    const files = [...new Set(mine.map((m) => m.file))];
    let ignoreRevs = false;
    const started = Date.now();
    for (const file of files) {
      const b = blameFile(name, file);
      ignoreRevs ||= b.ignoreRevs;
      for (const m of mine.filter((x) => x.file === file)) {
        const l = b.lines[m.line];
        rows.push({
          ageDays: Math.round((pinnedTime - l.time) / DAY),
          commit: l.commit,
          id: m.id,
          repo: name,
          set: lib.setOf(name),
          term: m.term,
          year: new Date(l.time * 1000).getUTCFullYear(),
        });
      }
    }
    const ages = rows.filter((r) => r.repo === name).map((r) => r.ageDays);
    perRepo[name] = {
      ages: quantiles(ages),
      ignoreRevs,
      markers: ages.length,
      pinnedDate: new Date(pinnedTime * 1000).toISOString().slice(0, 10),
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    console.log(
      `blame ${name}: ${ages.length} markers, median age ${perRepo[name].ages.median} days (${perRepo[name].seconds}s)`
    );
  }
  const buckets = (rs) => {
    const b = { "<1y": 0, "1-2y": 0, "2-3y": 0, "3-5y": 0, "5y+": 0 };
    for (const r of rs) {
      const y = r.ageDays / 365.25;
      b[
        y < 1 ? "<1y" : y < 2 ? "1-2y" : y < 3 ? "2-3y" : y < 5 ? "3-5y" : "5y+"
      ]++;
    }
    return b;
  };
  const byYear = (rs) =>
    Object.fromEntries(
      Object.entries(
        rs.reduce(
          (acc, r) => ({ ...acc, [r.year]: (acc[r.year] ?? 0) + 1 }),
          {}
        )
      ).sort()
    );
  const core = rows.filter((r) => r.set === "core");
  return {
    core: {
      ages: quantiles(core.map((r) => r.ageDays)),
      buckets: buckets(core),
      byYear: byYear(core),
    },
    coreWithoutNext: (() => {
      const x = core.filter((r) => r.repo !== "next.js");
      return { ages: quantiles(x.map((r) => r.ageDays)), buckets: buckets(x) };
    })(),
    perRepo: Object.fromEntries(
      Object.entries(perRepo).map(([k, v]) => [
        k,
        { ...v, buckets: buckets(rows.filter((r) => r.repo === k)) },
      ])
    ),
    rows,
  };
};

// ── main ───────────────────────────────────────────────────────────────
const main = async () => {
  const names = lib
    .selectedRepos(lib.CORE)
    .filter((n) => existsSync(join(HISTORY, `${n}.git`)));
  const resultFile = join(lib.RESULTS_DIR, "history.json");
  const eventsFile = join(lib.OUT_DIR, "history-events.json");
  const result = existsSync(resultFile) ? lib.readJson(resultFile) : {};
  result.generated = new Date().toISOString().slice(0, 10);
  result.tools = {
    git: execFileSync("git", ["--version"], { encoding: "utf8" }).trim(),
    typescript: ts.version,
  };
  result.repos = Object.fromEntries(
    names.map((n) => {
      let filter = null;
      try {
        filter = git(n, ["config", "remote.origin.partialclonefilter"]).trim();
      } catch {
        // not a partial clone
      }
      return [n, { cloneFilter: filter, scope: SCOPES[n], sha: lib.PINNED[n] }];
    })
  );
  if (lib.flag("blame")) {
    const b = blame(names);
    result.blame = { ...b, rows: undefined };
    const events = existsSync(eventsFile) ? lib.readJson(eventsFile) : {};
    events.blame = b.rows;
    lib.writeJson(eventsFile, events);
  }
  if (lib.flag("survival")) {
    const markers = lib.readJson(join(lib.OUT_DIR, "markers.json")).rows;
    const all = [];
    const perRepo = {};
    for (const name of names) {
      const started = Date.now();
      const s = await survival(name);
      const end = commitTime(name, lib.PINNED[name]);
      const rows = relink(
        [...s.removed, ...s.alive].map((r) => ({ ...r, repo: name }))
      );
      all.push(...rows);
      const inWindow = rows.filter(
        (r) =>
          !r.added.inferred &&
          r.added.time >= WINDOW.from &&
          r.added.time < WINDOW.to
      );
      const removed = inWindow.filter((r) => r.removed);
      // Reconciliation: markers alive at the pinned commit against the parsed inventory.
      const inventory = markers.filter(
        (m) =>
          m.repo === name &&
          m.kind === "marker" &&
          ["TODO", "FIXME", "XXX", "@todo"].includes(m.term) &&
          inScope(name, m.file)
      ).length;
      perRepo[name] = {
        aliveAtPinned: rows.filter((r) => !r.removed).length,
        relinked: s.removed.length + s.alive.length - rows.length,
        commits: s.commits,
        firstCommit: rows.length
          ? new Date(Math.min(...rows.map((r) => r.added.time)) * 1000)
              .toISOString()
              .slice(0, 10)
          : null,
        inventoryAtPinned: inventory,
        km: kaplanMeier(inWindow, end),
        removed: removed.length,
        removedShare: inWindow.length
          ? Math.round((removed.length / inWindow.length) * 1000) / 10
          : null,
        removedSameAuthor: removed.filter((r) => r.removed.sameAuthor).length,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        timeToRemovalDays: quantiles(
          removed.map((r) => Math.round((r.removed.time - r.added.time) / DAY))
        ),
        windowAdds: inWindow.length,
      };
      console.log(
        `survival ${name}: ${s.commits} commits, ${inWindow.length} added in window, ${removed.length} removed, alive ${perRepo[name].aliveAtPinned} vs inventory ${inventory} (${perRepo[name].seconds}s)`
      );
    }
    const pool = (rs) => {
      const inWindow = rs.filter(
        (r) =>
          !r.added.inferred &&
          r.added.time >= WINDOW.from &&
          r.added.time < WINDOW.to
      );
      const removed = inWindow.filter((r) => r.removed);
      const end = Math.max(...names.map((n) => commitTime(n, lib.PINNED[n])));
      return {
        km: kaplanMeier(inWindow, end),
        removed: removed.length,
        removedShare: inWindow.length
          ? Math.round((removed.length / inWindow.length) * 1000) / 10
          : null,
        removedSameAuthor: removed.filter((r) => r.removed.sameAuthor).length,
        timeToRemovalDays: quantiles(
          removed.map((r) => Math.round((r.removed.time - r.added.time) / DAY))
        ),
        windowAdds: inWindow.length,
        withinOneYear: removed.filter(
          (r) => r.removed.time - r.added.time <= 365 * DAY
        ).length,
        withinTwoYears: removed.filter(
          (r) => r.removed.time - r.added.time <= 730 * DAY
        ).length,
      };
    };
    result.survival = {
      method:
        "Markers on the mainline (--first-parent; merges diffed against their first parent; -M renames) in the scope directories, tracked from the commit that added them to the commit that removed them. A moved line, a line moved to another file in the same commit, or a rewording in the same file (at least half the words kept) continues the marker. Window: added 2018-01-01 to 2024-12-31 (commit time on the mainline). Kaplan–Meier is censored at each repo's pinned commit (pooled: the latest).",
      pooled: pool(all),
      pooledWithoutNext: pool(all.filter((r) => r.repo !== "next.js")),
      perRepo,
      window: { from: "2018-01-01", to: "2024-12-31" },
    };
    const events = existsSync(eventsFile) ? lib.readJson(eventsFile) : {};
    events.survival = all.map((r) => ({
      added: r.added,
      events: r.events,
      line: r.line,
      path: r.path,
      removed: r.removed ?? null,
      repo: r.repo,
      term: r.term,
      text: r.text,
    }));
    lib.writeJson(eventsFile, events);
  }
  if (lib.flag("classify")) {
    const events = lib.readJson(eventsFile);
    const inWindow = events.survival.filter(
      (r) =>
        r.removed &&
        !r.added.inferred &&
        r.added.time >= WINDOW.from &&
        r.added.time < WINDOW.to
    );
    let n = 0;
    for (const r of inWindow) {
      r.removed.code = classifyRemoval(r.repo, r);
      n++;
      if (n % 500 === 0) {
        console.log(`classified ${n} of ${inWindow.length}`);
      }
    }
    const tally = (rs) =>
      rs.reduce(
        (acc, r) => ({
          ...acc,
          [r.removed.code.kind]: (acc[r.removed.code.kind] ?? 0) + 1,
        }),
        {}
      );
    result.removals = {
      method:
        "Zampetti et al. (MSR 2018) §2.2.1, adapted: the file was deleted (class removal), the function enclosing the marker at the parent commit has no function with the same nested name after the commit (method removal), the function is identical after the commit apart from comments and whitespace (method not changed), or it changed (method changed). Top-level markers are judged on the statement after them.",
      perRepo: Object.fromEntries(
        names.map((n) => [n, tally(inWindow.filter((r) => r.repo === n))])
      ),
      pooled: tally(inWindow),
      pooledWithoutNext: tally(inWindow.filter((r) => r.repo !== "next.js")),
      sameAuthorByKind: Object.fromEntries(
        Object.keys(tally(inWindow)).map((k) => [
          k,
          {
            same: inWindow.filter(
              (r) => r.removed.code.kind === k && r.removed.sameAuthor
            ).length,
            total: inWindow.filter((r) => r.removed.code.kind === k).length,
          },
        ])
      ),
    };
    lib.writeJson(eventsFile, events);
  }
  if (lib.flag("sample")) {
    const events = lib.readJson(eventsFile);
    const sampleFile = join(lib.RESULTS_DIR, "removal-sample.json");
    let sample;
    if (existsSync(sampleFile) && !lib.flag("resample")) {
      sample = lib.readJson(sampleFile);
    } else {
      // Seeded, stratified by repo and by the automatic kind: up to 3 per (repo, kind), at most
      // 12 per repo, Next.js 16.
      const seed = 20261018;
      let state = seed;
      const rand = () => {
        state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
        return state / 2_147_483_648;
      };
      const pool = events.survival.filter(
        (r) =>
          r.removed?.code &&
          !r.added.inferred &&
          r.added.time >= WINDOW.from &&
          r.added.time < WINDOW.to
      );
      const picks = [];
      for (const name of names) {
        const mine = pool.filter((r) => r.repo === name);
        const kinds = [...new Set(mine.map((r) => r.removed.code.kind))].sort();
        const cap = name === "next.js" ? 16 : 12;
        const chosen = [];
        for (let round = 0; round < 6 && chosen.length < cap; round++) {
          for (const k of kinds) {
            const left = mine.filter(
              (r) => r.removed.code.kind === k && !chosen.includes(r)
            );
            if (left.length > 0 && chosen.length < cap) {
              chosen.push(left[Math.floor(rand() * left.length)]);
            }
          }
        }
        picks.push(...chosen);
      }
      sample = {
        codebook: {
          howRemoved: {
            addressed:
              "the commit does what the marker asked for (in the same file or by an API change it relies on)",
            "already done":
              "the task had been done earlier, or no longer applied, and the commit deletes the stale comment",
            "dropped, debt remains":
              "the comment is deleted but the task isn't done and still applies",
            "code deleted":
              "the comment went with the code it described (file, function or block deleted)",
            "code moved":
              "the code moved (to another file or function) and the comment went with it or was dropped there",
            "rewritten, not addressed":
              "the code around it was rewritten for another reason and the comment was dropped",
            unclear: "can't tell from the diff and the commit message",
          },
          mentionedInMessage:
            "does the commit message (subject) mention the marker's task?",
        },
        generated: new Date().toISOString().slice(0, 10),
        items: picks.map((r, i) => ({
          added: {
            commit: r.added.commit,
            date: new Date(r.added.time * 1000).toISOString().slice(0, 10),
          },
          autoKind: r.removed.code.kind,
          id: `rm${String(i + 1).padStart(3, "0")}`,
          path: r.removed.path,
          removed: {
            commit: r.removed.commit,
            date: new Date(r.removed.time * 1000).toISOString().slice(0, 10),
            line: r.removed.line,
            subject: r.removed.subject,
          },
          repo: r.repo,
          sameAuthor: r.removed.sameAuthor,
          text: r.text,
        })),
        seed,
      };
      lib.writeJson(sampleFile, sample);
    }
    // Worksheet: the removal's diff for that file, the commit message, and links.
    const github = Object.fromEntries(
      config.repos.map((r) => [r.name, r.github])
    );
    const out = [
      `# Removal worksheet (${sample.items.length} removals)`,
      "",
      "Classify each with the codebook in removal-sample.json. Links go to the commit on GitHub.",
      "",
    ];
    for (const item of sample.items) {
      // The commit message and file list, the hunk that removed the marker (8 lines of context),
      // and for a deleted file 30 lines around the marker before the commit.
      let diff = "";
      try {
        const head = git(item.repo, [
          "show",
          "--first-parent",
          "--diff-merges=first-parent",
          "-M",
          "--stat=120",
          "--format=%an%n%s%n%n%b",
          item.removed.commit,
        ])
          .split("\n")
          .slice(0, 40)
          .join("\n");
        const full = git(item.repo, [
          "show",
          "--first-parent",
          "--diff-merges=first-parent",
          "-M",
          "-U8",
          "--format=",
          item.removed.commit,
          "--",
          item.path,
        ]);
        const hunks = full.split(/\n(?=@@ )/);
        const hit = hunks.find((h) => {
          const m = /^@@ -(\d+)(?:,(\d+))?/.exec(h);
          return (
            m &&
            Number(m[1]) <= item.removed.line &&
            Number(m[1]) + Number(m[2] ?? 1) >= item.removed.line
          );
        });
        let body = hit ?? hunks.slice(0, 2).join("\n");
        if (item.autoKind === "file deleted") {
          const before = git(item.repo, [
            "show",
            `${item.removed.commit}^:${item.path}`,
          ]).split("\n");
          const from = Math.max(0, item.removed.line - 15);
          body = `(file deleted; lines ${from + 1}-${from + 30} before the commit)\n${before
            .slice(from, from + 30)
            .map(
              (l, i) => `${from + i + 1 === item.removed.line ? ">" : " "} ${l}`
            )
            .join("\n")}`;
        }
        diff = `${head}\n----\n${body.slice(0, 6000)}`;
      } catch (error) {
        diff = `(git show failed: ${String(error.message).slice(0, 200)})`;
      }
      out.push(
        `## ${item.id} · ${item.repo} · ${item.path}:${item.removed.line}`,
        "",
        `Marker: \`${item.text}\``,
        `Added ${item.added.date} (https://github.com/${github[item.repo]}/commit/${item.added.commit}), removed ${item.removed.date} (https://github.com/${github[item.repo]}/commit/${item.removed.commit}). Same author: ${item.sameAuthor}.`,
        "",
        "```diff",
        diff,
        "```",
        ""
      );
    }
    mkdirSync(lib.OUT_DIR, { recursive: true });
    writeFileSync(join(lib.OUT_DIR, "removal-worksheet.md"), out.join("\n"));
    console.log(
      `removal sample: ${sample.items.length} items; worksheet in out/todo-comments/removal-worksheet.md`
    );
  }
  lib.writeJson(resultFile, result);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
