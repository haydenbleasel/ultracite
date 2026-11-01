// History, from the bare history clones under repos/history/ (todo-history-clone.sh). Only
// `git log` runs, with GIT_NO_LAZY_FETCH=1: a missing blob is an error, never a fetch.
//
//   --keywords   mainline commits in the measured package's source (every layout it has had,
//                length-history.cjs SCOPES) whose message mentions a TDZ or hoisting problem:
//                "before initiali[sz]ation", "Cannot access", "TDZ", "temporal dead zone",
//                "hoist", "is not defined", "ReferenceError", "circular", "use before define",
//                "used before"; all of each clone's history. Each with its changed files, for the
//                hand reading in history-labels.json.
//   --churn      every mainline commit in the three years before the pinned commit (the window
//                length-history.cjs uses), diffed with -U0: per file, function definition lines
//                removed and added. A name whose declaration (`function f(`) is removed and whose
//                `const f = … =>`/`function` expression is added in the same commit and file is a
//                conversion to an expression, and the reverse a conversion to a declaration. A
//                definition line removed and added unchanged in a different hunk is a move.
//   --track      each named function at the pinned commit (declarations and variable-bound
//                functions, source only) followed back through the same window with
//                length-history.cjs `track`, unchanged: changes and bug-fix commits attributed to
//                the innermost tracked function.
//   --analyse    bug fixes by form with size controlled: logistic regressions of "changed by a
//                bug fix" on the form, log own lines, log exposure and repo fixed effects, with
//                file-clustered errors (length-history.cjs `logistic`).
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/func-style-history.cjs [--keywords] [--churn] [--track] [--analyse] [--repos a,b]
// Writes out/func-style/history/* and results/func-style/history.json.
"use strict";

const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { join } = require("node:path");

const lib = require("./func-style-lib.cjs");
const lh = require("./length-history.cjs");

const OUT = join(lib.OUT_DIR, "history");
const CENSUS = join(lib.OUT_DIR, "census");
const REPOS = Object.keys(lh.SCOPES);
const ENV = { ...process.env, GIT_NO_LAZY_FETCH: "1" };
const gitDir = (name) => join(lib.HISTORY_DIR, `${name}.git`);
const git = (name, argv) =>
  lib.spawnSync("git", ["-C", gitDir(name), ...argv], {
    encoding: "utf8",
    env: ENV,
    maxBuffer: 1 << 30,
  });

// ── keywords ───────────────────────────────────────────────────────────
const KEYWORDS =
  /before initiali[sz]ation|cannot access|\btdz\b|temporal dead zone|hoist|is not defined|referenceerror|circular|use[ds]? before (?:defin|declar)|no-use-before-define|func-style/i;
const keywords = (name) => {
  const sha = lib.PINNED[name];
  const r = git(name, [
    "log",
    sha,
    "--first-parent",
    "--format=@@@%H%x09%ct%x09%s",
    "--name-only",
    "-i",
    "-E",
    "--grep=before initiali|cannot access|tdz|temporal dead zone|hoist|is not defined|referenceerror|circular|before defin|before declar|use-before-define|func-style",
    "--",
    ...lh.SCOPES[name],
  ]);
  const out = [];
  let cur = null;
  for (const line of r.stdout.split("\n")) {
    if (line.startsWith("@@@")) {
      const [h, t, ...s] = line.slice(3).split("\t");
      cur = { files: [], sha: h, subject: s.join("\t"), time: Number(t) };
      out.push(cur);
    } else if (line.trim() && cur) {
      cur.files.push(line.trim());
    }
  }
  // the full message, to see which keyword matched (git's ERE has no \b; filter here)
  for (const c of out) {
    const body = git(name, ["log", "-1", "--format=%B", c.sha]).stdout;
    c.matched = [
      ...new Set(
        (body.match(new RegExp(KEYWORDS.source, "gi")) ?? []).map((m) =>
          m.toLowerCase()
        )
      ),
    ];
    c.body = body.slice(0, 600);
    c.date = new Date(c.time * 1000).toISOString().slice(0, 10);
    c.files = c.files.slice(0, 12);
  }
  const kept = out.filter((c) => c.matched.length > 0);
  return { commits: kept, grepped: out.length, stderr: r.stderr.slice(0, 300) };
};

// ── churn ──────────────────────────────────────────────────────────────
const DECL =
  /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*[<(]/;
const EXPR =
  /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|<[^>]*>\s*\(|\([^)]*\)\s*(?::[^=]+)?=>|\($|\(\s*\{?\s*$|[A-Za-z_$][\w$]*\s*=>)/;
const churn = (name) =>
  new Promise((resolveChurn, reject) => {
    const sha = lib.PINNED[name];
    const pinnedTime = Number(
      git(name, ["log", "-1", "--format=%ct", sha]).stdout.trim()
    );
    const since = pinnedTime - lh.WINDOW_DAYS * 86_400;
    const child = spawn(
      "git",
      [
        "-C",
        gitDir(name),
        "-c",
        "core.quotePath=false",
        "log",
        sha,
        "--first-parent",
        "--diff-merges=first-parent",
        "-M",
        "-p",
        "-U0",
        "--no-color",
        "--no-ext-diff",
        `--since=${since}`,
        "--format=@@@COMMIT %H %ct %s",
        "--",
        ...lh.SCOPES[name],
      ],
      { env: ENV }
    );
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    const commits = [];
    let commit = null;
    let file = null;
    let hunk = 0;
    const finishFile = () => {
      if (!file || !commit) {
        return;
      }
      const conv = [];
      for (const [n, rem] of file.removed) {
        const add = file.added.get(n);
        if (!add) {
          continue;
        }
        const remKinds = new Set(rem.map((x) => x.kind));
        const addKinds = new Set(add.map((x) => x.kind));
        if (
          remKinds.has("decl") &&
          addKinds.has("expr") &&
          !addKinds.has("decl")
        ) {
          conv.push({ kind: "to-expression", name: n });
        } else if (
          remKinds.has("expr") &&
          addKinds.has("decl") &&
          !addKinds.has("expr")
        ) {
          conv.push({ kind: "to-declaration", name: n });
        } else {
          // the same definition line, unchanged, in another hunk: a move
          for (const r of rem) {
            if (
              add.some(
                (a) =>
                  a.kind === r.kind && a.text === r.text && a.hunk !== r.hunk
              )
            ) {
              conv.push({ form: r.kind, kind: "move", name: n });
              break;
            }
          }
        }
      }
      if (conv.length) {
        commit.files.push({ changes: conv, path: file.path });
      }
      commit.touched++;
      file = null;
    };
    const finishCommit = () => {
      finishFile();
      if (commit) {
        commits.push(commit);
      }
      commit = null;
    };
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      if (line.startsWith("@@@COMMIT ")) {
        finishCommit();
        const m = /^@@@COMMIT (\S+) (\d+) ?(.*)$/.exec(line);
        commit = {
          files: [],
          sha: m[1],
          subject: m[3],
          time: Number(m[2]),
          touched: 0,
        };
        return;
      }
      if (!commit) {
        return;
      }
      if (line.startsWith("diff --git ")) {
        finishFile();
        file = {
          added: new Map(),
          path: line.split(" b/").at(-1),
          removed: new Map(),
        };
        hunk = 0;
        return;
      }
      if (!file) {
        return;
      }
      if (line.startsWith("@@ ")) {
        hunk++;
        return;
      }
      if (line.startsWith("+++") || line.startsWith("---")) {
        return;
      }
      const sign = line[0];
      if (sign !== "+" && sign !== "-") {
        return;
      }
      const body = line.slice(1);
      const d = DECL.exec(body);
      const e = d ? null : EXPR.exec(body);
      if (!d && !e) {
        return;
      }
      const rec = { hunk, kind: d ? "decl" : "expr", text: body.trim() };
      const map = sign === "+" ? file.added : file.removed;
      const n = (d ?? e)[1];
      (map.get(n) ?? map.set(n, []).get(n)).push(rec);
    });
    rl.on("close", () => {
      finishCommit();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`${name}: git log exited ${code}: ${stderr.slice(0, 400)}`)
        );
        return;
      }
      const withChanges = commits.filter((c) => c.files.length > 0);
      const kinds = (k) =>
        withChanges.filter((c) =>
          c.files.some((f) => f.changes.some((x) => x.kind === k))
        );
      const count = (k) =>
        withChanges.reduce(
          (s, c) =>
            s +
            c.files.reduce(
              (t, f) => t + f.changes.filter((x) => x.kind === k).length,
              0
            ),
          0
        );
      resolveChurn({
        commits: commits.length,
        conversions: {
          toDeclaration: {
            commits: kinds("to-declaration").length,
            functions: count("to-declaration"),
          },
          toExpression: {
            commits: kinds("to-expression").length,
            functions: count("to-expression"),
          },
        },
        moves: {
          commits: kinds("move").length,
          functions: count("move"),
          fixCommits: kinds("move").filter((c) => lh.isBugFix(c.subject))
            .length,
          orderWords: kinds("move").filter((c) =>
            /\b(?:order|reorder|hoist|before|initiali[sz]|move[sd]?)\b/i.test(
              c.subject
            )
          ).length,
        },
        // the largest conversion commits, for the report
        top: withChanges
          .map((c) => ({
            date: new Date(c.time * 1000).toISOString().slice(0, 10),
            moved: c.files.reduce(
              (s, f) => s + f.changes.filter((x) => x.kind === "move").length,
              0
            ),
            sha: c.sha,
            subject: c.subject,
            toDeclaration: c.files.reduce(
              (s, f) =>
                s + f.changes.filter((x) => x.kind === "to-declaration").length,
              0
            ),
            toExpression: c.files.reduce(
              (s, f) =>
                s + f.changes.filter((x) => x.kind === "to-expression").length,
              0
            ),
          }))
          .filter((c) => c.toDeclaration + c.toExpression > 0)
          .sort(
            (a, b) =>
              b.toDeclaration +
              b.toExpression -
              (a.toDeclaration + a.toExpression)
          )
          .slice(0, 12),
        since,
        stderr: stderr.slice(0, 300),
      });
    });
  });

// ── tracking and analysis ──────────────────────────────────────────────
const trackRows = (name) => {
  const fns = lib
    .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
    .filter(
      (f) =>
        !f.test &&
        f.name &&
        (f.type === "FunctionDeclaration" || lib.isVarBound(f.form)) &&
        f.stmtLine
    );
  return fns.map((f) => ({
    ...f,
    embedStartLine: f.stmtLine,
    endLine: f.stmtEndLine,
    id: `${name}:${f.file}#${f.i}`,
    test: false,
  }));
};
const analyse = (repos) => {
  const units = [];
  for (const name of repos) {
    const meta = lib.readJson(join(OUT, `${name}.meta.json`));
    if (!meta) {
      continue;
    }
    const rows = new Map(trackRows(name).map((f) => [f.id, f]));
    // own lines: the function's lines minus those of tracked functions nested in it at any depth
    // (through callbacks too), since `track` gives their lines' changes to them; only the
    // outermost of those, so nothing is subtracted twice
    const byFile = new Map();
    for (const f of rows.values()) {
      (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)).push(f);
    }
    const inside = (g, f) =>
      g !== f &&
      g.stmtLine >= f.stmtLine &&
      g.stmtEndLine <= f.stmtEndLine &&
      g.depth > f.depth;
    for (const h of lib.readJsonl(join(OUT, `${name}.jsonl`))) {
      const f = rows.get(h.id);
      if (!f) {
        continue;
      }
      const start = Math.max(meta.since, h.born ?? meta.since);
      const days = (meta.pinnedTime - start) / 86_400;
      if (days < lh.MIN_EXPOSURE_DAYS) {
        continue;
      }
      const lines = f.stmtEndLine - f.stmtLine + 1;
      const descendants = (byFile.get(f.file) ?? []).filter((g) =>
        inside(g, f)
      );
      const nested = descendants
        .filter((g) => !descendants.some((d) => inside(g, d)))
        .reduce((s, g) => s + (g.stmtEndLine - g.stmtLine + 1), 0);
      units.push({
        component: f.component,
        declaration: f.type === "FunctionDeclaration" ? 1 : 0,
        exposureYears: days / 365,
        file: `${name}:${f.file}`,
        fixed: h.fixes > 0 ? 1 : 0,
        fixes: h.fixes,
        moduleLevel: f.scope === "module" ? 1 : 0,
        ownLines: Math.max(1, lines - nested),
        repo: name,
        touched: h.touches > 0 ? 1 : 0,
        touches: h.touches,
        usedAbove: (f.refsBefore ?? 0) > 0 ? 1 : 0,
      });
    }
  }
  const repoNames = [...new Set(units.map((u) => u.repo))];
  const TERMS = {
    declaration: (u) => u.declaration,
    exposure: (u) => Math.log(u.exposureYears),
    moduleLevel: (u) => u.moduleLevel,
    ownLines: (u) => Math.log(u.ownLines),
    touches: (u) => Math.log1p(u.touches),
    usedAbove: (u) => u.usedAbove,
  };
  const fit = (us, names, outcome = "fixed") => {
    const reps = [...new Set(us.map((u) => u.repo))];
    const X = us.map((u) => [
      1,
      ...names.map((n) => TERMS[n](u)),
      ...reps.slice(1).map((r) => (u.repo === r ? 1 : 0)),
    ]);
    const r = lh.logistic(
      X,
      us.map((u) => u[outcome]),
      us.map((u) => u.file)
    );
    const coef = {};
    names.forEach((n, i) => {
      const b = r.beta[i + 1];
      const se = r.se[i + 1];
      coef[n] = {
        ci95: [
          Math.round(Math.exp(b - 1.96 * se) * 1000) / 1000,
          Math.round(Math.exp(b + 1.96 * se) * 1000) / 1000,
        ],
        oddsRatio: Math.round(Math.exp(b) * 1000) / 1000,
        z: Math.round((b / se) * 100) / 100,
      };
    });
    return { clusters: r.clusters, coef, n: us.length };
  };
  const rates = (us) => {
    const ly = us.reduce((s, u) => s + u.ownLines * u.exposureYears, 0);
    return {
      changedShare: lib.pct(us.filter((u) => u.touched).length, us.length),
      fixedShare: lib.pct(us.filter((u) => u.fixed).length, us.length),
      fixesPer100LineYears: ly
        ? Math.round((us.reduce((s, u) => s + u.fixes, 0) / ly) * 100 * 1000) /
          1000
        : null,
      medianOwnLines: (() => {
        const xs = us.map((u) => u.ownLines).sort((a, b) => a - b);
        return xs.length ? xs[Math.floor(xs.length / 2)] : null;
      })(),
      n: us.length,
    };
  };
  // repos where both forms are common enough to compare within the repo
  const mixedRepos = repoNames.filter((r) => {
    const us = units.filter((u) => u.repo === r);
    const d = us.filter((u) => u.declaration).length;
    return d >= 50 && us.length - d >= 50;
  });
  const within = units.filter((u) => mixedRepos.includes(u.repo));
  const changed = units.filter((u) => u.touched);
  return {
    byForm: {
      declaration: rates(units.filter((u) => u.declaration)),
      expression: rates(units.filter((u) => !u.declaration)),
    },
    byRepo: Object.fromEntries(
      repoNames.map((r) => [
        r,
        {
          declaration: rates(
            units.filter((u) => u.repo === r && u.declaration)
          ),
          expression: rates(
            units.filter((u) => u.repo === r && !u.declaration)
          ),
        },
      ])
    ),
    mixedRepos,
    models: {
      all: fit(units, ["declaration", "ownLines", "exposure"]),
      allWithScope: fit(units, [
        "declaration",
        "moduleLevel",
        "ownLines",
        "exposure",
      ]),
      churn: fit(changed, ["declaration", "ownLines", "touches", "exposure"]),
      mixedRepos: within.length
        ? fit(within, ["declaration", "ownLines", "exposure"])
        : null,
      usedAboveDefinition: fit(
        units.filter((u) => u.declaration),
        ["usedAbove", "ownLines", "exposure"]
      ),
    },
    units: {
      declarations: units.filter((u) => u.declaration).length,
      n: units.length,
    },
  };
};

const main = async () => {
  const repos = lib.selectedRepos(REPOS).filter((r) => REPOS.includes(r));
  const result = lib.readJson(join(lib.RESULTS_DIR, "history.json"), {}) ?? {};
  result.repos ??= {};
  result.generated = new Date().toISOString();
  result.note =
    "See the header of func-style-history.cjs. The bug-fix heuristic is length-history.cjs's isBugFix; its hand check (results/length-limits/history-check.json) is quoted in heuristic.";
  result.tools = lib.toolVersions();
  for (const name of repos) {
    const entry = (result.repos[name] ??= {});
    entry.sha = lib.PINNED[name];
    if (lib.flag("keywords")) {
      const k = keywords(name);
      lib.writeJson(join(OUT, `${name}.keywords.json`), k);
      entry.keywords = { commits: k.commits.length, stderr: k.stderr };
      console.log(`${name}: ${k.commits.length} keyword commits`);
    }
    if (lib.flag("churn")) {
      const t0 = Date.now();
      const c = await churn(name);
      entry.churn = c;
      console.log(
        `${name}: ${c.commits} commits; to-expression ${c.conversions.toExpression.commits}/${c.conversions.toExpression.functions}, to-declaration ${c.conversions.toDeclaration.commits}/${c.conversions.toDeclaration.functions}, moves ${c.moves.commits}/${c.moves.functions} (${Math.round((Date.now() - t0) / 1000)}s)`
      );
    }
    if (lib.flag("track")) {
      const t0 = Date.now();
      const rows = trackRows(name);
      const t = await lh.track(name, rows);
      lib.writeJsonl(
        join(OUT, `${name}.jsonl`),
        t.all.map((f) => ({
          born: f.born,
          fixes: f.fixes,
          id: f.id,
          mass: f.mass,
          touches: f.touches,
        }))
      );
      lib.writeJson(join(OUT, `${name}.meta.json`), {
        pinnedTime: t.stats.pinnedTime,
        since: t.stats.since,
      });
      entry.track = { ...t.stats, functions: rows.length, stderr: t.stderr };
      console.log(
        `${name}: tracked ${rows.length} functions, ${t.stats.commits} commits (${Math.round((Date.now() - t0) / 1000)}s)`
      );
    }
  }
  if (lib.flag("analyse")) {
    result.analysis = analyse(REPOS);
    const hc = lib.readJson(
      join(lib.HERE, "results", "length-limits", "history-check.json"),
      null
    );
    result.heuristic = hc
      ? {
          from: "results/length-limits/history-check.json",
          missRate: hc.result?.heuristicOthers?.weightedYesShare ?? null,
          note: hc.result?.note ?? null,
          precision: hc.result?.heuristicFixes?.weightedYesShare ?? null,
        }
      : null;
    console.log(JSON.stringify(result.analysis.models.all.coef));
  }
  lib.writeJson(join(lib.RESULTS_DIR, "history.json"), result);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
