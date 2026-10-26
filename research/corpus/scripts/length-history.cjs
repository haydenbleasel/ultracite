// Size and outcomes: how often each function changed, and how often a bug fix changed it, over the
// three years before each repo's pinned commit, from git history alone (the bare history clones
// under repos/history/, todo-history-clone.sh). Only `git log` runs, with GIT_NO_LAZY_FETCH=1: a
// missing blob is an error that's counted, never fetched. Nothing from a clone runs.
//
// Functions are the census's source functions at the pinned commit (tests excluded). Each is
// tracked backwards through every mainline commit (--first-parent, merges diffed against their
// first parent) by its line range, the way `git log -L` follows a range: each commit's hunks map
// the range from the commit's new file to its parent's, files are followed through renames (-M),
// whitespace-only changes are ignored (-w). A changed line counts for the innermost function that
// contains it (so a fix inside a callback is the callback's, not its parent's); a deletion counts
// for the function that contains both sides of it. A function is born when its range collapses
// (all its lines were added) or its file appears. Lost: code moved between files (the function
// looks born at the move), and functions deleted before the pinned commit (survivors only).
//
// Bug fixes are commits whose subject matches the fix heuristic below (after the SZZ convention of
// keyword matching: Śliwerski, Zimmermann and Zeller 2005), checked by hand on a sample
// (history-check.json). Commits that touch more than MASS_FILES files in scope (codemods,
// reformatting, moves) still map the ranges but count as nobody's change.
//
// --analyse fits, on the pooled functions, logistic regressions of "changed by a bug fix" on size
// (own lines), exposure and each metric, with repo fixed effects and file-clustered standard
// errors, and rates by length bucket (El Emam et al. 2001; Gil and Lalouche 2017: control for size).
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/length-history.cjs [--repos a,b] [--track] [--analyse]
// Writes out/length-limits/history/<repo>.jsonl and results/length-limits/history.json.
"use strict";

const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { join } = require("node:path");

const lib = require("./length-lib.cjs");

const OUT = join(lib.OUT_DIR, "history");
const CENSUS = join(lib.OUT_DIR, "census");
const WINDOW_DAYS = 3 * 365;
const MASS_FILES = 50;
const MIN_EXPOSURE_DAYS = 30;
// The measured package's source directories in every layout its history has had (todo-history.cjs
// SCOPES), so renames from an older layout are followed.
const NEXT_DIRS = [
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
];
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
    ...NEXT_DIRS.map((d) => `packages/next/src/${d}`),
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

// ── the bug-fix heuristic ──────────────────────────────────────────────
// A conventional `fix:` / `fix(scope):` (also `[scope] fix ...`), or a fix word in the subject:
// fix, fixes, fixed, fixing, bug, bugfix, hotfix, regression, crash, broken, incorrect, wrong.
// Not: reverts, relands, version bumps, merges of branches, other conventional types (chore, docs,
// test, ci, build, style, refactor, perf, release, deps), or "fix" followed within two words by
// typo, lint, formatting, a flaky test, tests, CI, docs, changelog, readme, types, spelling,
// comments, snapshots or build.
const FIX_PREFIX = /^(?:\[[^\]]*\]\s*)?(?:fix|bugfix|hotfix)(?:\([^)]*\))?!?:/i;
const FIX_WORD =
  /\b(?:fix(?:e[sd]|ing)?|bug(?:s|fix(?:es)?)?|hotfix(?:es)?|regressions?|crash(?:es|ed|ing)?|broken|incorrect(?:ly)?|wrong(?:ly)?)\b/i;
const NOT_FIX_PREFIX =
  /^(?:revert|reland|merge branch|v?\d+\.\d+\.\d+|(?:chore|docs?|tests?|ci|build|style|refactor|perf|release|deps?)(?:\([^)]*\))?!?:)/i;
const CHORE_FIX =
  /\bfix(?:e[sd]|ing)?\s+(?:\S+\s+)?(?:typos?|lint(?:ing)?|format(?:ting)?|flak[ey]|flaky|tests?|ci|docs?|documentation|changelog|readme|types?|typings?|type errors?|typecheck|spelling|comments?|snapshots?|build)\b/i;
const isBugFix = (subject) => {
  if (FIX_PREFIX.test(subject)) {
    return !CHORE_FIX.test(subject);
  }
  if (NOT_FIX_PREFIX.test(subject)) {
    return false;
  }
  return FIX_WORD.test(subject) && !CHORE_FIX.test(subject);
};

// ── tracking ───────────────────────────────────────────────────────────
// Map a line of the commit's new file to its parent's (hunks sorted, -U0).
const mapLine = (hunks, line, side) => {
  // side: "start" or "end" (where a line inside an added region goes)
  let delta = 0;
  for (const h of hunks) {
    const newEnd = h.newStart + h.newCount - 1;
    if (h.newCount > 0 && line >= h.newStart && line <= newEnd) {
      if (h.oldCount > 0) {
        return side === "start" ? h.oldStart : h.oldStart + h.oldCount - 1;
      }
      // added lines: a start moves to the line after the insertion point, an end to the line before
      return side === "start" ? h.oldStart + 1 : h.oldStart;
    }
    const before = h.newCount > 0 ? newEnd < line : h.newStart < line;
    if (!before) {
      break;
    }
    delta += h.newCount - h.oldCount;
  }
  return line - delta;
};

const innermost = (fns, line) => {
  let best = null;
  for (const f of fns) {
    if (
      f.alive &&
      f.s <= line &&
      line <= f.e &&
      (!best || f.e - f.s < best.e - best.s)
    ) {
      best = f;
    }
  }
  return best;
};

const track = (name) =>
  new Promise((resolveTrack, reject) => {
    const sha = lib.PINNED[name];
    const git = (argv) =>
      lib.spawnSync(
        "git",
        ["-C", join(lib.HISTORY_DIR, `${name}.git`), ...argv],
        { encoding: "utf8", env: { ...process.env, GIT_NO_LAZY_FETCH: "1" } }
      );
    const pinnedTime = Number(
      git(["log", "-1", "--format=%ct", sha]).stdout.trim()
    );
    const since = pinnedTime - WINDOW_DAYS * 86_400;
    const rows = lib
      .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
      .filter((f) => !f.test);
    const tracked = new Map();
    for (const f of rows) {
      const fn = {
        alive: true,
        born: null,
        bornBy: null,
        e: f.endLine,
        fixes: 0,
        id: f.id,
        mass: 0,
        s: f.embedStartLine,
        touches: 0,
      };
      if (!tracked.has(f.file)) {
        tracked.set(f.file, []);
      }
      tracked.get(f.file).push(fn);
    }
    const all = [...tracked.values()].flat();
    const stats = {
      bugFixCommits: 0,
      commits: 0,
      commitsTouchingFunctions: 0,
      fixCommitsTouchingFunctions: 0,
      massCommits: 0,
      pinnedTime,
      renamesFollowed: 0,
      since,
    };
    const commitsLog = [];
    const child = spawn(
      "git",
      [
        "-C",
        join(lib.HISTORY_DIR, `${name}.git`),
        "-c",
        "core.quotePath=false",
        "-c",
        "diff.renameLimit=100000",
        "log",
        sha,
        "--first-parent",
        "--diff-merges=first-parent",
        "-M",
        "-w",
        "-p",
        "-U0",
        "--no-color",
        "--no-ext-diff",
        `--since=${since}`,
        "--format=@@@COMMIT %H %ct %s",
        "--",
        ...SCOPES[name],
      ],
      { env: { ...process.env, GIT_NO_LAZY_FETCH: "1" } }
    );
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    const rl = createInterface({ input: child.stdout });
    let commit = null;
    let file = null;
    const finishFile = () => {
      if (!file || !commit) {
        return;
      }
      // a pure rename has no ---/+++ lines, only `rename from` / `rename to`
      if (file.from === undefined && file.renameFrom) {
        file.from = file.renameFrom;
        file.to = file.renameTo;
      }
      if (file.to === undefined) {
        file.to = null; // a mode change or binary file: nothing to map
      }
      commit.files.push(file);
      file = null;
    };
    const finishCommit = () => {
      finishFile();
      if (!commit) {
        return;
      }
      stats.commits++;
      const fix = isBugFix(commit.subject);
      const mass = commit.files.length > MASS_FILES;
      if (fix) {
        stats.bugFixCommits++;
      }
      if (mass) {
        stats.massCommits++;
      }
      const touchedHere = new Set();
      for (const fd of commit.files) {
        const fns = fd.to ? tracked.get(fd.to) : null;
        if (!fns) {
          continue;
        }
        const hunks = fd.hunks;
        // attribution: each changed line to its innermost function
        for (const h of hunks) {
          if (h.newCount > 0) {
            for (let l = h.newStart; l < h.newStart + h.newCount; l++) {
              const f = innermost(fns, l);
              if (f) {
                touchedHere.add(f);
              }
            }
          } else {
            // pure deletion after line newStart: the function holding both sides
            let best = null;
            for (const f of fns) {
              if (
                f.alive &&
                f.s <= h.newStart &&
                h.newStart + 1 <= f.e &&
                (!best || f.e - f.s < best.e - best.s)
              ) {
                best = f;
              }
            }
            if (best) {
              touchedHere.add(best);
            }
          }
        }
        // mapping to the parent
        for (const f of fns) {
          if (!f.alive) {
            continue;
          }
          if (!fd.from) {
            f.alive = false;
            f.born = commit.time;
            f.bornBy = "file added";
            f.bornSha = commit.sha;
            continue;
          }
          const s = mapLine(hunks, f.s, "start");
          const e = mapLine(hunks, f.e, "end");
          if (e < s) {
            f.alive = false;
            f.born = commit.time;
            f.bornBy = "lines added";
            f.bornSha = commit.sha;
            continue;
          }
          f.s = s;
          f.e = e;
        }
        if (fd.from && fd.from !== fd.to) {
          stats.renamesFollowed++;
          const existing = tracked.get(fd.from) ?? [];
          tracked.set(fd.from, [...existing, ...fns]);
          tracked.delete(fd.to);
        } else if (!fd.from) {
          tracked.delete(fd.to);
        }
      }
      for (const f of touchedHere) {
        // the commit that creates a function isn't a change to it
        if (!f.alive && f.born === commit.time && f.bornSha === commit.sha) {
          continue;
        }
        if (mass) {
          f.mass++;
        } else {
          f.touches++;
          if (fix) {
            f.fixes++;
          }
        }
      }
      const changedHere = [...touchedHere].filter(
        (f) => f.bornSha !== commit.sha
      );
      if (changedHere.length && !mass) {
        stats.commitsTouchingFunctions++;
        if (fix) {
          stats.fixCommitsTouchingFunctions++;
        }
      }
      commitsLog.push({
        files: commit.files.length,
        fix,
        functions: changedHere.length,
        mass,
        sha: commit.sha,
        subject: commit.subject,
        time: commit.time,
      });
      commit = null;
    };
    rl.on("line", (line) => {
      if (line.startsWith("@@@COMMIT ")) {
        finishCommit();
        const m = /^@@@COMMIT (\S+) (\d+) ?(.*)$/.exec(line);
        commit = { files: [], sha: m[1], subject: m[3], time: Number(m[2]) };
        return;
      }
      if (!commit) {
        return;
      }
      if (line.startsWith("diff --git ")) {
        finishFile();
        file = { from: undefined, hunks: [], to: undefined };
        return;
      }
      if (!file) {
        return;
      }
      if (line.startsWith("--- ")) {
        file.from = line === "--- /dev/null" ? null : line.slice(6);
        return;
      }
      if (line.startsWith("+++ ")) {
        file.to = line === "+++ /dev/null" ? null : line.slice(6);
        return;
      }
      if (line.startsWith("rename from ")) {
        file.renameFrom = line.slice(12);
        return;
      }
      if (line.startsWith("rename to ")) {
        file.renameTo = line.slice(10);
        return;
      }
      const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (h) {
        file.hunks.push({
          newCount: h[4] === undefined ? 1 : Number(h[4]),
          newStart: Number(h[3]),
          oldCount: h[2] === undefined ? 1 : Number(h[2]),
          oldStart: Number(h[1]),
        });
      }
    });
    rl.on("close", () => {
      // a pure rename has no ---/+++ lines
      finishCommit();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`${name}: git log exited ${code}: ${stderr.slice(0, 500)}`)
        );
        return;
      }
      resolveTrack({
        all,
        commitsLog,
        rows,
        stats,
        stderr: stderr.slice(0, 500),
      });
    });
  });

// ── statistics ─────────────────────────────────────────────────────────
// Logistic regression by IRLS, with file-clustered (sandwich) standard errors.
const solve = (A, b) => {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r][c]) > Math.abs(M[p][c])) {
        p = r;
      }
    }
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) {
      throw new Error("singular matrix");
    }
    for (let r = 0; r < n; r++) {
      if (r !== c) {
        const k = M[r][c] / M[c][c];
        for (let j = c; j <= n; j++) {
          M[r][j] -= k * M[c][j];
        }
      }
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
};
const invert = (A) => {
  const n = A.length;
  return A.map((_, i) =>
    solve(
      A,
      A.map((__, j) => (i === j ? 1 : 0))
    )
  );
};
const logistic = (X, y, clusters) => {
  const n = X.length;
  const p = X[0].length;
  let beta = new Array(p).fill(0);
  let ll = 0;
  for (let iter = 0; iter < 50; iter++) {
    const XtWX = Array.from({ length: p }, () => new Array(p).fill(0));
    const XtWz = new Array(p).fill(0);
    ll = 0;
    for (let i = 0; i < n; i++) {
      const eta = X[i].reduce((s, x, j) => s + x * beta[j], 0);
      const mu = 1 / (1 + Math.exp(-eta));
      const w = Math.max(mu * (1 - mu), 1e-10);
      const z = eta + (y[i] - mu) / w;
      ll +=
        y[i] * Math.log(Math.max(mu, 1e-15)) +
        (1 - y[i]) * Math.log(Math.max(1 - mu, 1e-15));
      for (let a = 0; a < p; a++) {
        XtWz[a] += X[i][a] * w * z;
        for (let b = a; b < p; b++) {
          XtWX[a][b] += X[i][a] * w * X[i][b];
        }
      }
    }
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < a; b++) {
        XtWX[a][b] = XtWX[b][a];
      }
    }
    const next = solve(XtWX, XtWz);
    const diff = Math.max(...next.map((v, j) => Math.abs(v - beta[j])));
    beta = next;
    if (diff < 1e-8) {
      break;
    }
  }
  // final pass: log-likelihood, bread and meat
  const bread = Array.from({ length: p }, () => new Array(p).fill(0));
  const scores = new Map();
  ll = 0;
  for (let i = 0; i < n; i++) {
    const eta = X[i].reduce((s, x, j) => s + x * beta[j], 0);
    const mu = 1 / (1 + Math.exp(-eta));
    ll +=
      y[i] * Math.log(Math.max(mu, 1e-15)) +
      (1 - y[i]) * Math.log(Math.max(1 - mu, 1e-15));
    const w = mu * (1 - mu);
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) {
        bread[a][b] += X[i][a] * w * X[i][b];
      }
    }
    const g = clusters[i];
    if (!scores.has(g)) {
      scores.set(g, new Array(p).fill(0));
    }
    const sc = scores.get(g);
    for (let a = 0; a < p; a++) {
      sc[a] += X[i][a] * (y[i] - mu);
    }
  }
  const Binv = invert(bread);
  const meat = Array.from({ length: p }, () => new Array(p).fill(0));
  for (const sc of scores.values()) {
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) {
        meat[a][b] += sc[a] * sc[b];
      }
    }
  }
  const G = scores.size;
  const adj = G > 1 ? G / (G - 1) : 1;
  const V = Binv.map((row) =>
    Binv[0].map(
      (_, j) =>
        row.reduce(
          (s, x, k) =>
            s + x * meat[k].reduce((t, m, l) => t + m * Binv[l][j], 0),
          0
        ) * adj
    )
  );
  return {
    beta,
    clusters: G,
    ll,
    se: V.map((row, i) => Math.sqrt(Math.max(row[i], 0))),
    seModel: Binv.map((row, i) => Math.sqrt(Math.max(row[i], 0))),
  };
};

// Partial Spearman of x and y given z (ranks residualised on z's ranks).
const partialSpearman = (x, y, z) => {
  const rho = (a, b) => lib.spearman(a, b);
  const rxy = rho(x, y);
  const rxz = rho(x, z);
  const ryz = rho(y, z);
  if ([rxy, rxz, ryz].some((v) => v === null)) {
    return null;
  }
  return (
    Math.round(
      ((rxy - rxz * ryz) / Math.sqrt((1 - rxz ** 2) * (1 - ryz ** 2))) * 1000
    ) / 1000
  );
};

const BUCKETS = [
  [1, 10],
  [11, 25],
  [26, 50],
  [51, 100],
  [101, 200],
  [201, Infinity],
];
const bucket = (n) => {
  const b = BUCKETS.find(([lo, hi]) => n >= lo && n <= hi);
  return b ? (b[1] === Infinity ? `${b[0]}+` : `${b[0]}-${b[1]}`) : "0";
};

const analyse = (repos) => {
  const units = [];
  for (const name of repos) {
    const census = new Map(
      lib
        .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
        .map((f) => [f.id, f])
    );
    const pinned = lib.readJson(join(OUT, `${name}.meta.json`));
    for (const h of lib.readJsonl(join(OUT, `${name}.jsonl`))) {
      const f = census.get(h.id);
      const start = Math.max(pinned.since, h.born ?? pinned.since);
      const days = (pinned.pinnedTime - start) / 86_400;
      if (days < MIN_EXPOSURE_DAYS) {
        continue;
      }
      const own = Math.max(1, f.lines - f.nestedLines);
      units.push({
        cognitive: f.cognitive,
        cyclomatic: f.cyclomatic ?? 1,
        depth: f.maxDepth,
        exposureYears: days / 365,
        file: `${name}:${f.file}`,
        fixed: h.fixes > 0 ? 1 : 0,
        fixes: h.fixes,
        lines: f.lines,
        ownLines: own,
        params: f.paramsEslint,
        repo: name,
        statements: f.statements,
        topLevel: f.depth === 0,
        touched: h.touches > 0 ? 1 : 0,
        touches: h.touches,
      });
    }
  }
  const byBucket = (field) =>
    Object.fromEntries(
      [...new Set(BUCKETS.map(([a, b]) => bucket(a)))].map((label) => {
        const us = units.filter((u) => bucket(u[field]) === label);
        const lineYears = us.reduce(
          (s, u) => s + u.ownLines * u.exposureYears,
          0
        );
        return [
          label,
          {
            changedShare: lib.pct(
              us.filter((u) => u.touched).length,
              us.length
            ),
            fixedShare: lib.pct(us.filter((u) => u.fixed).length, us.length),
            fixesPer100LineYears:
              lineYears === 0
                ? null
                : Math.round(
                    (us.reduce((s, u) => s + u.fixes, 0) / lineYears) *
                      100 *
                      1000
                  ) / 1000,
            fixesPerFunctionYear:
              us.length === 0
                ? null
                : Math.round(
                    (us.reduce((s, u) => s + u.fixes, 0) /
                      us.reduce((s, u) => s + u.exposureYears, 0)) *
                      1000
                  ) / 1000,
            fixShareOfChanges: lib.pct(
              us.reduce((s, u) => s + u.fixes, 0),
              us.reduce((s, u) => s + u.touches, 0)
            ),
            n: us.length,
          },
        ];
      })
    );
  const repoNames = [...new Set(units.map((u) => u.repo))];
  const design = (us, terms) =>
    us.map((u) => [
      1,
      ...terms.map((t) => t(u)),
      ...repoNames.slice(1).map((r) => (u.repo === r ? 1 : 0)),
    ]);
  const TERMS = {
    cognitive: (u) => Math.log1p(u.cognitive),
    cyclomatic: (u) => Math.log(u.cyclomatic),
    depth: (u) => u.depth,
    exposure: (u) => Math.log(u.exposureYears),
    lines: (u) => Math.log(u.lines),
    ownLines: (u) => Math.log(u.ownLines),
    params: (u) => u.params,
    statements: (u) => Math.log1p(u.statements),
    touches: (u) => Math.log1p(u.touches),
  };
  const fit = (us, names, outcome = "fixed") => {
    const X = design(
      us,
      names.map((n) => TERMS[n])
    );
    const y = us.map((u) => u[outcome]);
    const r = logistic(
      X,
      y,
      us.map((u) => u.file)
    );
    const coef = {};
    names.forEach((n, i) => {
      const b = r.beta[i + 1];
      const se = r.se[i + 1];
      coef[n] = {
        beta: Math.round(b * 1000) / 1000,
        ci95: [
          Math.round(Math.exp(b - 1.96 * se) * 1000) / 1000,
          Math.round(Math.exp(b + 1.96 * se) * 1000) / 1000,
        ],
        oddsRatio: Math.round(Math.exp(b) * 1000) / 1000,
        se: Math.round(se * 1000) / 1000,
        z: Math.round((b / se) * 100) / 100,
      };
    });
    return {
      clusters: r.clusters,
      coef,
      ll: Math.round(r.ll * 10) / 10,
      n: us.length,
    };
  };
  const models = {};
  const metrics = ["statements", "params", "depth", "cognitive", "cyclomatic"];
  // size alone, each metric alone, each metric with size; all with exposure and repo effects
  models["ownLines"] = fit(units, ["ownLines", "exposure"]);
  for (const m of metrics) {
    models[m] = fit(units, [m, "exposure"]);
    models[`${m}+ownLines`] = fit(units, [m, "ownLines", "exposure"]);
  }
  // given churn: among functions that changed at all, does size or a metric predict that a fix
  // was among the changes, once the number of changes is controlled?
  const changed = units.filter((u) => u.touched);
  models["churn:touches"] = fit(changed, ["touches", "exposure"]);
  models["churn:ownLines+touches"] = fit(changed, [
    "ownLines",
    "touches",
    "exposure",
  ]);
  for (const m of metrics) {
    models[`churn:${m}+ownLines+touches`] = fit(changed, [
      m,
      "ownLines",
      "touches",
      "exposure",
    ]);
  }
  // top-level functions, total lines (what max-lines-per-function sees)
  const top = units.filter((u) => u.topLevel);
  models["top:lines"] = fit(top, ["lines", "exposure"]);
  for (const m of metrics) {
    models[`top:${m}+lines`] = fit(top, [m, "lines", "exposure"]);
  }
  // likelihood-ratio tests of adding each metric to size
  const lr = {};
  for (const m of metrics) {
    const d = 2 * (models[`${m}+ownLines`].ll - models.ownLines.ll);
    lr[m] = { chi2: Math.round(d * 100) / 100, df: 1 };
  }
  const rate = units.map((u) => u.fixes / u.exposureYears);
  const corr = {};
  for (const m of ["lines", "ownLines", ...metrics]) {
    corr[m] = {
      partialOnOwnLines:
        m === "ownLines" || m === "lines"
          ? null
          : partialSpearman(
              units.map((u) => u[m]),
              rate,
              units.map((u) => u.ownLines)
            ),
      spearman: lib.spearman(
        units.map((u) => u[m]),
        rate
      ),
    };
  }
  return {
    buckets: { lines: byBucket("lines"), ownLines: byBucket("ownLines") },
    correlations: corr,
    lrTests: lr,
    models,
    units: {
      changed: changed.length,
      fixed: units.filter((u) => u.fixed).length,
      n: units.length,
      perRepo: lib.countBy(units, (u) => u.repo),
      topLevel: top.length,
    },
  };
};

const main = async () => {
  const repos = lib.selectedRepos(Object.keys(SCOPES));
  const result = lib.readJson(join(lib.RESULTS_DIR, "history.json"), {}) ?? {};
  result.repos ??= {};
  if (lib.flag("track")) {
    for (const name of repos) {
      const t0 = Date.now();
      const r = await track(name);
      lib.writeJsonl(
        join(OUT, `${name}.jsonl`),
        r.all.map((f) => ({
          born: f.born,
          bornBy: f.bornBy,
          fixes: f.fixes,
          id: f.id,
          mass: f.mass,
          touches: f.touches,
        }))
      );
      lib.writeJsonl(join(OUT, `${name}.commits.jsonl`), r.commitsLog);
      lib.writeJson(join(OUT, `${name}.meta.json`), r.stats);
      const alive = r.all.filter((f) => f.alive).length;
      result.repos[name] = {
        ...r.stats,
        bornInWindow: r.all.length - alive,
        bornBy: lib.countBy(
          r.all.filter((f) => !f.alive),
          (f) => f.bornBy
        ),
        functions: r.all.length,
        functionsChanged: r.all.filter((f) => f.touches > 0).length,
        functionsFixed: r.all.filter((f) => f.fixes > 0).length,
        gitStderr: r.stderr,
        olderThanWindow: alive,
        scope: SCOPES[name],
        seconds: Math.round((Date.now() - t0) / 100) / 10,
        sha: lib.PINNED[name],
      };
      console.log(
        `${name}: ${r.stats.commits} commits (${r.stats.bugFixCommits} fixes, ${r.stats.massCommits} mass), ${r.all.length} functions, ${result.repos[name].functionsChanged} changed, ${result.repos[name].functionsFixed} fixed, ${result.repos[name].seconds}s`
      );
    }
  }
  if (lib.flag("analyse")) {
    result.analysis = analyse(
      Object.keys(SCOPES).filter((n) => lib.existsSync(join(OUT, `${n}.jsonl`)))
    );
  }
  result.method = {
    fixHeuristic: {
      chore: CHORE_FIX.source,
      notPrefix: NOT_FIX_PREFIX.source,
      prefix: FIX_PREFIX.source,
      word: FIX_WORD.source,
    },
    massFiles: MASS_FILES,
    minExposureDays: MIN_EXPOSURE_DAYS,
    note: "Source functions at the pinned commit, tracked back by line range through the mainline (--first-parent, -M, -w, -U0) for WINDOW_DAYS before the pinned commit. A changed line counts for its innermost function. Commits touching more than massFiles files in scope count for nobody. Functions younger than minExposureDays are left out of the analysis. Models: logistic regressions of fixed (changed by at least one bug-fix commit) with log exposure and repo fixed effects; standard errors clustered by file.",
    windowDays: WINDOW_DAYS,
  };
  result.generated = new Date().toISOString();
  result.tools = lib.toolVersions();
  lib.writeJson(join(lib.RESULTS_DIR, "history.json"), result);
};

module.exports = { isBugFix, mapLine };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
