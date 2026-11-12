// History, from the bare history clones under repos/history/ (todo-history-clone.sh). Only `git`
// runs on them (log, show, cat-file, ls-tree), with GIT_NO_LAZY_FETCH=1: a missing blob is counted,
// never fetched. Nothing from a clone runs; file versions are parsed in this process.
//
// Scope: the measured package's source in every layout it has had (length-history.cjs SCOPES),
// minus collect-files.cjs's directory and file exclusions (tests, fixtures, declarations, ...) and
// each repo's own exclusions. The window is length-history.cjs's: the three years before each
// repo's pinned commit, mainline only (--first-parent, merges diffed against their first parent).
//
//   --events     every mainline commit in the window that changes a measured file. For each changed
//                file whose diff (-U0, no -w) adds or removes a line with a `?` (not `?.`/`??`) or
//                `if`, `else`, `switch` or `case`, both versions are parsed: nested-ternaries-lib.cjs
//                `inventory` (the census rule alone) for ternary trees and functions, and a
//                typescript-estree walk of the same text for each conditional's and if/else head's
//                test texts, guard chains (`if (c) return x;` runs followed by a return, as the lib
//                defines them), switch statements and object lookups (`{...}[k]`, or `NAME[k]` where
//                NAME is a const object literal in the file). Constructs are matched between the
//                two versions within the enclosing function (by name; `<module>` outside functions)
//                by their tests, whitespace and parentheses removed: same tests and size is
//                unchanged; otherwise the pair sharing the most tests is the same construct.
//                Ternary trees (two or more conditionals) are then: introduced (with a new function,
//                or in an existing one), extended (more conditionals; `fromSingle` when it was one
//                conditional), shrunk (fewer, still nested), reduced to one conditional, edited
//                (same size, tests changed), removed with its function or file, converted to an
//                else-if chain, guard returns, a switch or a lookup (the tree is gone and the same
//                function gains one of those; `sharedTests` when the new construct tests the same
//                thing), converted from if/else (the reverse), or removed otherwise. Else-if chains
//                (length two or more): introduced, extended (`fromLone` when it was a lone `if`),
//                shortened, removed with its function, converted to a ternary, removed otherwise.
//                Commits touching more than MASS_FILES measured files (codemods, reformatting) are
//                flagged `mass`.
//   --diffsize   "hard to modify", directly: for every non-mass event that adds exactly one branch
//                (a ternary tree +1 conditional, an else-if chain +1, a guard chain +1 guard), the
//                commit's -U0 hunks for that file restricted to the construct's range in the new
//                version: lines added, old lines removed (rewritten), whether the change was a pure
//                insertion, and the share of the construct's lines that are new. Also every
//                extension, per added branch. Each repo's formatter at the pinned commit is
//                recorded, since a formatter can reflow a whole ternary when it crosses printWidth.
//   --formatters only the formatter facts at each pinned commit (also recorded by --events).
//   --keywords   mainline commits, whole history, whose message mentions a ternary, "conditional
//                operator"/"conditional expression", precedence, `?:` written as an operator, or a
//                rule about ternaries (no-nested-ternary, noNestedTernary, prefer-ternary,
//                no-nested-conditional, multiline-ternary, experimentalTernaries): in the measured
//                package's source (every keyword), and anywhere in the repo (ternaries and rule names
//                only, for lint policy). Each with its message, changed files and the conditional
//                lines its diff adds and removes, for the hand reading in history-labels.json (a hand
//                input this script never writes).
//   --event-sample  a seeded sample of the events (non-mass ternary and else-if events, up to
//                three per kind), written as a worksheet to out/nested-ternaries/history/ for the hand
//                check of the matcher. The verdicts are a hand input,
//                results/nested-ternaries/history-event-check.json; every run summarises them.
//   --track      every source function at the pinned commit (the census's functions.jsonl) followed
//                back through the window with length-history.cjs `track`, unchanged: changes and
//                bug-fix commits attributed to the innermost tracked function.
//   --analyse    bug fixes with size controlled: logistic regressions of "changed by a bug fix" on
//                having a nested ternary (own code, at the pinned commit), log own lines, log
//                exposure and repo fixed effects, with file-clustered errors (length-history.cjs
//                `logistic`); variants adding any conditional, an else-if chain of three or more,
//                cognitive complexity, and, among changed functions, the number of changes. The
//                bug-fix heuristic is length-history.cjs's `isBugFix`; its hand-checked precision
//                is copied from results/length-limits/history-check.json.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/nested-ternaries-history.cjs [--events] [--diffsize] [--keywords] [--track] [--analyse] [--repos a,b]
// Writes out/nested-ternaries/history/*, out/nested-ternaries/history-keywords.json and
// results/nested-ternaries/history.json.
"use strict";

const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");
const lh = require("./length-history.cjs");
const {
  EXCLUDED_DIR_NAMES,
  EXCLUDED_FILE_PATTERNS,
  config,
} = require("./collect-files.cjs");

const OUT = join(lib.OUT_DIR, "history");
const CENSUS = join(lib.OUT_DIR, "census");
const REPOS = Object.keys(lh.SCOPES);
const ENV = { ...process.env, GIT_NO_LAZY_FETCH: "1" };
const MASS_FILES = lh.MASS_FILES;
const gitDir = (name) => join(lib.HISTORY_DIR, `${name}.git`);
const git = (name, argv, opts = {}) =>
  lib.spawnSync("git", ["-C", gitDir(name), ...argv], {
    encoding: "utf8",
    env: ENV,
    maxBuffer: 1 << 30,
    ...opts,
  });
const githubOf = (name) => config.repos.find((r) => r.name === name).github;
const permalink = (name, sha, file, line, endLine) =>
  lib.dc.permalink(githubOf(name), sha, file, line, endLine);
const dateOf = (t) => new Date(t * 1000).toISOString().slice(0, 10);
const countBy = (xs, f) => {
  const out = {};
  for (const x of xs) {
    const k = f(x);
    if (k === null || k === undefined) {
      continue;
    }
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};
const dist = (xs) => {
  if (xs.length === 0) {
    return null;
  }
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return {
    max: s.at(-1),
    mean: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 100) / 100,
    median: q(0.5),
    n: s.length,
    p90: q(0.9),
  };
};

// ── scope ──────────────────────────────────────────────────────────────
const SOURCE_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const inScope = (name, path) => {
  if (!SOURCE_EXT.test(path)) {
    return false;
  }
  if (!lh.SCOPES[name].some((s) => path === s || path.startsWith(`${s}/`))) {
    return false;
  }
  const parts = path.split("/");
  if (parts.slice(0, -1).some((p) => EXCLUDED_DIR_NAMES.has(p))) {
    return false;
  }
  if (EXCLUDED_FILE_PATTERNS.some(([re]) => re.test(parts.at(-1)))) {
    return false;
  }
  const repo = config.repos.find((r) => r.name === name);
  return !(repo.exclude ?? []).some(
    (p) => path === p || path.startsWith(`${p.replace(/\/$/, "")}/`)
  );
};
// A changed line that could add or remove a conditional, an if/else, a switch or a case.
const RELEVANT = /(?<![?.])\?(?![?.])|\b(?:if|else|switch|case)\b/;

// ── the log ────────────────────────────────────────────────────────────
// Every mainline commit in the window with its measured files: status, paths, blob ids, -U0 hunks
// and whether a changed line is RELEVANT.
const ZERO = "0".repeat(40);
const streamLog = (name) =>
  new Promise((resolveLog, reject) => {
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
        "-c",
        "diff.renameLimit=100000",
        "log",
        sha,
        "--first-parent",
        "--diff-merges=first-parent",
        "-M",
        "--raw",
        "--no-abbrev",
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
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      if (line.startsWith("@@@COMMIT ")) {
        const m = /^@@@COMMIT (\S+) (\d+) ?(.*)$/.exec(line);
        commit = {
          byPath: new Map(),
          files: [],
          sha: m[1],
          subject: m[3],
          time: Number(m[2]),
        };
        commits.push(commit);
        file = null;
        return;
      }
      if (!commit) {
        return;
      }
      if (line.startsWith(":")) {
        // :100644 100644 <old> <new> M\tpath   or   R087\told\tnew
        const [meta, ...paths] = line.split("\t");
        const parts = meta.split(" ");
        const status = parts[4][0];
        const from = status === "A" ? null : paths[0];
        const to = status === "D" ? null : (paths[1] ?? paths[0]);
        const f = {
          from,
          hunks: [],
          newBlob: parts[3] === ZERO ? null : parts[3],
          oldBlob: parts[2] === ZERO ? null : parts[2],
          relevant: false,
          status,
          to,
        };
        commit.files.push(f);
        commit.byPath.set(to ?? from, f);
        return;
      }
      if (line.startsWith("diff --git ")) {
        file = null;
        commit.pendingFrom = undefined;
        return;
      }
      if (line.startsWith("--- ")) {
        commit.pendingFrom = line === "--- /dev/null" ? null : line.slice(6);
        return;
      }
      if (line.startsWith("+++ ")) {
        const to = line === "+++ /dev/null" ? null : line.slice(6);
        file = commit.byPath.get(to ?? commit.pendingFrom) ?? null;
        return;
      }
      const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (h) {
        file?.hunks.push({
          newCount: h[4] === undefined ? 1 : Number(h[4]),
          newStart: Number(h[3]),
          oldCount: h[2] === undefined ? 1 : Number(h[2]),
          oldStart: Number(h[1]),
        });
        return;
      }
      if (
        file &&
        (line[0] === "+" || line[0] === "-") &&
        RELEVANT.test(line.slice(1))
      ) {
        file.relevant = true;
      }
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`${name}: git log exited ${code}: ${stderr.slice(0, 400)}`)
        );
        return;
      }
      resolveLog({ commits, pinnedTime, since, stderr: stderr.slice(0, 300) });
    });
  });

// ── blobs ──────────────────────────────────────────────────────────────
const catBlobs = (name, shas) => {
  const out = new Map();
  const CHUNK = 400;
  for (let i = 0; i < shas.length; i += CHUNK) {
    const chunk = shas.slice(i, i + CHUNK);
    const r = lib.spawnSync(
      "git",
      ["-C", gitDir(name), "cat-file", "--batch"],
      {
        env: ENV,
        input: `${chunk.join("\n")}\n`,
        maxBuffer: 1 << 30,
      }
    );
    const buf = r.stdout;
    let pos = 0;
    while (pos < buf.length) {
      const nl = buf.indexOf(10, pos);
      const header = buf.slice(pos, nl).toString("utf8");
      pos = nl + 1;
      const parts = header.split(" ");
      if (parts[1] === "missing" || parts.length < 3) {
        out.set(parts[0], null);
        continue;
      }
      const size = Number(parts[2]);
      out.set(parts[0], buf.slice(pos, pos + size).toString("utf8"));
      pos += size + 1;
    }
  }
  return out;
};

// ── one version of a file ──────────────────────────────────────────────
const norm = (s) => s.replace(/\s+/g, "").replace(/[()]/g, "").slice(0, 200);
const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);
const isGuard = (s) =>
  s.type === "IfStatement" &&
  !s.alternate &&
  (s.consequent.type === "ReturnStatement" ||
    (s.consequent.type === "BlockStatement" &&
      s.consequent.body.length === 1 &&
      s.consequent.body[0].type === "ReturnStatement")) &&
  Boolean(
    s.consequent.type === "ReturnStatement"
      ? s.consequent.argument
      : s.consequent.body[0].argument
  );
// What a file version holds, per enclosing function: ternary trees (with their tests), if/else
// chains, guard chains, switches and lookups.
const describe = (text, rel) => {
  const inv = lib.inventory(text, rel, { rules: {} });
  if (inv.error) {
    return { error: inv.error };
  }
  const { ast, error } = lib.sk.safeParse(text, rel);
  if (!ast) {
    return { error };
  }
  const fnName = (i) =>
    i === null || i === undefined ? "<module>" : inv.functions[i].name;
  // innermost inventory function holding an offset
  const fnAt = (offset) => {
    let best = null;
    for (const f of inv.functions) {
      if (
        f.range[0] <= offset &&
        offset < f.range[1] &&
        (!best || f.range[0] >= best.range[0])
      ) {
        best = f;
      }
    }
    return best ? best.index : null;
  };
  const condTests = new Map();
  const chains = [];
  const guards = [];
  const switches = new Map();
  const lookups = new Map();
  const constObjects = new Set();
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  const src = (n) => text.slice(n.range[0], n.range[1]);
  const lists = [];
  const memberLookups = [];
  lib.sk.walk(ast, (n) => {
    if (n.type === "ConditionalExpression") {
      condTests.set(n.range[0], norm(src(n.test)));
    } else if (n.type === "IfStatement") {
      if (!(n.parent?.type === "IfStatement" && n.parent.alternate === n)) {
        const tests = [];
        let len = 0;
        let finalElse = false;
        for (let x = n; x;) {
          len++;
          tests.push(norm(src(x.test)));
          if (x.alternate?.type === "IfStatement") {
            x = x.alternate;
          } else {
            finalElse = Boolean(x.alternate);
            break;
          }
        }
        chains.push({
          endLine: n.loc.end.line,
          finalElse,
          fn: fnName(fnAt(n.range[0])),
          length: len,
          line: n.loc.start.line,
          tests,
        });
      }
    } else if (n.type === "SwitchStatement") {
      bump(switches, fnName(fnAt(n.range[0])));
    } else if (n.type === "BlockStatement" || n.type === "Program") {
      lists.push(n.body);
    } else if (
      n.type === "VariableDeclarator" &&
      n.id.type === "Identifier" &&
      n.init?.type === "ObjectExpression" &&
      n.parent?.kind === "const"
    ) {
      constObjects.add(n.id.name);
    } else if (n.type === "MemberExpression" && n.computed) {
      memberLookups.push(n);
    }
  });
  for (const m of memberLookups) {
    const obj = m.object;
    const isLookup =
      obj.type === "ObjectExpression" ||
      (obj.type === "Identifier" && constObjects.has(obj.name));
    if (isLookup && m.property.type !== "Literal") {
      bump(lookups, fnName(fnAt(m.range[0])));
    }
  }
  for (const body of lists) {
    for (let i = 0; i < body.length; i++) {
      if (!isGuard(body[i])) {
        continue;
      }
      let j = i;
      while (j < body.length && isGuard(body[j])) {
        j++;
      }
      const next = body[j];
      if (next?.type === "ReturnStatement" && next.argument) {
        guards.push({
          endLine: next.loc.end.line,
          fn: fnName(fnAt(body[i].range[0])),
          guards: j - i,
          line: body[i].loc.start.line,
          tests: body.slice(i, j).map((s) => norm(src(s.test))),
        });
      }
      i = j;
    }
  }
  // ternary trees, from the inventory (the census's definition), with their tests in source order
  const byRoot = new Map();
  for (const c of inv.conditionals) {
    if (!byRoot.has(c.root)) {
      byRoot.set(c.root, []);
    }
    byRoot.get(c.root).push(c);
  }
  const shapeOf = new Map(inv.trees.map((t) => [t.root, t.shape]));
  const trees = [];
  for (const [root, members] of byRoot) {
    const r = inv.conditionals[root];
    members.sort((a, b) => a.range[0] - b.range[0]);
    trees.push({
      endLine: r.endLine,
      fn: fnName(r.fn),
      line: r.line,
      members: members.length,
      shape: shapeOf.get(root) ?? "single",
      tests: members.map((m) => condTests.get(m.range[0]) ?? "?"),
    });
  }
  const fns = new Set(["<module>", ...inv.functions.map((f) => f.name)]);
  return {
    chains,
    fns: [...fns],
    guards,
    lookups: Object.fromEntries(lookups),
    switches: Object.fromEntries(switches),
    trees,
  };
};

// ── matching ───────────────────────────────────────────────────────────
const shared = (a, b) => {
  const s = new Set(a);
  return b.filter((t) => s.has(t)).length;
};
// Pairs constructs of one function: exact first (same tests, same size), then most shared tests.
const pair = (before, after, sizeOf) => {
  const B = [...before];
  const A = [...after];
  const pairs = [];
  for (let i = A.length - 1; i >= 0; i--) {
    const j = B.findIndex(
      (b) =>
        sizeOf(b) === sizeOf(A[i]) &&
        b.tests.join("\u0000") === A[i].tests.join("\u0000")
    );
    if (j !== -1) {
      pairs.push({ a: A[i], b: B[j], exact: true });
      A.splice(i, 1);
      B.splice(j, 1);
    }
  }
  const candidates = [];
  for (const a of A) {
    for (const b of B) {
      const s = shared(a.tests, b.tests);
      if (s > 0) {
        candidates.push({ a, b, s });
      }
    }
  }
  candidates.sort((x, y) => y.s - x.s);
  const usedA = new Set();
  const usedB = new Set();
  for (const c of candidates) {
    if (usedA.has(c.a) || usedB.has(c.b)) {
      continue;
    }
    usedA.add(c.a);
    usedB.add(c.b);
    pairs.push({ a: c.a, b: c.b, exact: false, shared: c.s });
  }
  return {
    added: A.filter((a) => !usedA.has(a)),
    pairs,
    removed: B.filter((b) => !usedB.has(b)),
  };
};
const byFn = (xs) => {
  const m = new Map();
  for (const x of xs) {
    if (!m.has(x.fn)) {
      m.set(x.fn, []);
    }
    m.get(x.fn).push(x);
  }
  return m;
};
const EMPTY = {
  chains: [],
  fns: [],
  guards: [],
  lookups: {},
  switches: {},
  trees: [],
};

// Events in one changed file.
const eventsOf = (before, after) => {
  const events = [];
  const fnsBefore = new Set(before.fns);
  const fnsAfter = new Set(after.fns);
  const tb = byFn(before.trees);
  const ta = byFn(after.trees);
  const cb = byFn(before.chains);
  const ca = byFn(after.chains);
  const gb = byFn(before.guards);
  const ga = byFn(after.guards);
  const fnKeys = new Set([
    ...tb.keys(),
    ...ta.keys(),
    ...cb.keys(),
    ...ca.keys(),
    ...gb.keys(),
    ...ga.keys(),
  ]);
  for (const fn of fnKeys) {
    const T = pair(tb.get(fn) ?? [], ta.get(fn) ?? [], (t) => t.members);
    const C = pair(cb.get(fn) ?? [], ca.get(fn) ?? [], (c) => c.length);
    const G = pair(gb.get(fn) ?? [], ga.get(fn) ?? [], (g) => g.guards);
    const newChains = C.added.filter((c) => c.length >= 2);
    const lostChains = C.removed.filter((c) => c.length >= 2);
    const grewSwitch = (after.switches[fn] ?? 0) > (before.switches[fn] ?? 0);
    const lostSwitch = (after.switches[fn] ?? 0) < (before.switches[fn] ?? 0);
    const grewLookup = (after.lookups[fn] ?? 0) > (before.lookups[fn] ?? 0);
    const lostLookup = (after.lookups[fn] ?? 0) < (before.lookups[fn] ?? 0);
    const newIfs = C.added; // any new if (lone ifs included) for "converted to if/else"
    const lostIfs = C.removed;
    const ev = (o) => events.push({ fn, ...o });
    // ternary trees
    for (const p of T.pairs) {
      const { a, b } = p;
      if (b.members < 2 && a.members < 2) {
        continue;
      }
      if (p.exact) {
        continue;
      }
      const base = {
        after: {
          endLine: a.endLine,
          line: a.line,
          members: a.members,
          shape: a.shape,
        },
        before: {
          endLine: b.endLine,
          line: b.line,
          members: b.members,
          shape: b.shape,
        },
        construct: "ternary",
      };
      if (b.members < 2) {
        ev({ ...base, fromSingle: true, kind: "extended" });
      } else if (a.members > b.members) {
        ev({ ...base, kind: "extended" });
      } else if (a.members < 2) {
        // to if/else, or to a lookup, as the nested part moved out?
        ev({
          ...base,
          kind: "reduced-to-one",
          to: newIfs.length
            ? "if"
            : grewSwitch
              ? "switch"
              : grewLookup
                ? "lookup"
                : null,
        });
      } else if (a.members < b.members) {
        ev({ ...base, kind: "shrunk" });
      } else {
        ev({ ...base, kind: "edited" });
      }
    }
    for (const b of T.removed.filter((t) => t.members >= 2)) {
      const base = {
        before: { line: b.line, members: b.members, shape: b.shape },
        construct: "ternary",
      };
      if (!fnsAfter.has(fn)) {
        ev({ ...base, kind: "removed-with-function" });
        continue;
      }
      const sharesChain = newIfs.find((c) => shared(c.tests, b.tests) > 0);
      const sharesGuard = G.added.find((g) => shared(g.tests, b.tests) > 0);
      if (sharesChain || sharesGuard) {
        ev({
          ...base,
          kind: "converted",
          sharedTests: true,
          to: sharesGuard
            ? "guard-returns"
            : sharesChain.length >= 2
              ? "else-if"
              : "if",
        });
      } else if (newChains.length || G.added.length) {
        ev({
          ...base,
          kind: "converted",
          sharedTests: false,
          to: G.added.length ? "guard-returns" : "else-if",
        });
      } else if (grewSwitch) {
        ev({ ...base, kind: "converted", to: "switch" });
      } else if (grewLookup) {
        ev({ ...base, kind: "converted", to: "lookup" });
      } else {
        ev({ ...base, kind: "removed-otherwise" });
      }
    }
    for (const a of T.added.filter((t) => t.members >= 2)) {
      const base = {
        after: {
          endLine: a.endLine,
          line: a.line,
          members: a.members,
          shape: a.shape,
        },
        construct: "ternary",
      };
      if (!fnsBefore.has(fn)) {
        ev({ ...base, kind: "introduced", where: "new-function" });
        continue;
      }
      const sharesIf = lostIfs.find((c) => shared(c.tests, a.tests) > 0);
      const sharesGuard = G.removed.find((g) => shared(g.tests, a.tests) > 0);
      if (sharesIf || sharesGuard) {
        ev({
          ...base,
          from: sharesGuard
            ? "guard-returns"
            : sharesIf.length >= 2
              ? "else-if"
              : "if",
          kind: "converted-from",
          sharedTests: true,
        });
      } else if (lostSwitch || lostLookup) {
        ev({
          ...base,
          from: lostSwitch ? "switch" : "lookup",
          kind: "converted-from",
          sharedTests: false,
        });
      } else {
        ev({ ...base, kind: "introduced", where: "existing-function" });
      }
    }
    // else-if chains
    for (const p of C.pairs) {
      const { a, b } = p;
      if (p.exact || (a.length < 2 && b.length < 2)) {
        continue;
      }
      const base = {
        after: {
          endLine: a.endLine,
          finalElse: a.finalElse,
          length: a.length,
          line: a.line,
        },
        before: {
          endLine: b.endLine,
          finalElse: b.finalElse,
          length: b.length,
          line: b.line,
        },
        construct: "else-if",
      };
      if (b.length < 2) {
        ev({ ...base, fromLone: true, kind: "extended" });
      } else if (a.length > b.length) {
        ev({ ...base, kind: "extended" });
      } else if (a.length < b.length) {
        ev({ ...base, kind: a.length < 2 ? "shortened-to-lone" : "shortened" });
      } else {
        ev({ ...base, kind: "edited" });
      }
    }
    for (const b of C.removed.filter((c) => c.length >= 2)) {
      const base = {
        before: { length: b.length, line: b.line },
        construct: "else-if",
      };
      if (!fnsAfter.has(fn)) {
        ev({ ...base, kind: "removed-with-function" });
      } else if (T.added.find((t) => shared(t.tests, b.tests) > 0)) {
        const t = T.added.find((x) => shared(x.tests, b.tests) > 0);
        ev({
          ...base,
          kind: "converted",
          to: t.members >= 2 ? "nested-ternary" : "ternary",
        });
      } else if (G.added.find((g) => shared(g.tests, b.tests) > 0)) {
        ev({ ...base, kind: "converted", to: "guard-returns" });
      } else if (grewSwitch || grewLookup) {
        ev({
          ...base,
          kind: "converted",
          to: grewSwitch ? "switch" : "lookup",
        });
      } else {
        ev({ ...base, kind: "removed-otherwise" });
      }
    }
    for (const a of C.added.filter((c) => c.length >= 2)) {
      const base = {
        after: { endLine: a.endLine, length: a.length, line: a.line },
        construct: "else-if",
      };
      if (!fnsBefore.has(fn)) {
        ev({ ...base, kind: "introduced", where: "new-function" });
      } else if (T.removed.find((t) => shared(t.tests, a.tests) > 0)) {
        ev({ ...base, from: "ternary", kind: "converted-from" });
      } else {
        ev({ ...base, kind: "introduced", where: "existing-function" });
      }
    }
    // guard chains: only extensions (for the diff sizes)
    for (const p of G.pairs) {
      if (!p.exact && p.a.guards > p.b.guards) {
        ev({
          after: { endLine: p.a.endLine, guards: p.a.guards, line: p.a.line },
          before: { endLine: p.b.endLine, guards: p.b.guards, line: p.b.line },
          construct: "guards",
          kind: "extended",
        });
      }
    }
  }
  return events;
};

// Lines added inside the construct's range in the new version, and lines removed inside its range
// in the old version (a rewritten line counts once each).
const diffIn = (hunks, after, before) => {
  let added = 0;
  let removed = 0;
  for (const h of hunks) {
    if (h.newCount > 0) {
      const a = Math.max(after.line, h.newStart);
      const b = Math.min(after.endLine, h.newStart + h.newCount - 1);
      if (a <= b) {
        added += b - a + 1;
      }
    }
    if (h.oldCount > 0) {
      const a = Math.max(before.line, h.oldStart);
      const b = Math.min(before.endLine, h.oldStart + h.oldCount - 1);
      if (a <= b) {
        removed += b - a + 1;
      }
    }
  }
  return { added, removed };
};

const events = async (name) => {
  const t0 = Date.now();
  const log = await streamLog(name);
  const sha0 = lib.PINNED[name];
  const commits = log.commits;
  // measured files per commit
  for (const c of commits) {
    c.files = c.files.filter(
      (f) => (f.to && inScope(name, f.to)) || (f.from && inScope(name, f.from))
    );
    c.mass = c.files.length > MASS_FILES;
  }
  const wanted = new Set();
  for (const c of commits) {
    for (const f of c.files) {
      if (!f.relevant) {
        continue;
      }
      if (f.oldBlob) {
        wanted.add(f.oldBlob);
      }
      if (f.newBlob) {
        wanted.add(f.newBlob);
      }
    }
  }
  const descriptors = new Map();
  const stats = {
    blobs: wanted.size,
    commits: commits.length,
    commitsWithMeasuredFiles: commits.filter((c) => c.files.length).length,
    filesChanged: commits.reduce((s, c) => s + c.files.length, 0),
    filesParsed: 0,
    massCommits: commits.filter((c) => c.mass).length,
    missingBlobs: 0,
    parseErrors: 0,
    pinnedTime: log.pinnedTime,
    relevantFileChanges: 0,
    since: log.since,
  };
  // the path each blob was seen at (for the parser's file type)
  const pathOf = new Map();
  for (const c of commits) {
    for (const f of c.files) {
      if (f.oldBlob) {
        pathOf.set(f.oldBlob, f.from ?? f.to);
      }
      if (f.newBlob) {
        pathOf.set(f.newBlob, f.to ?? f.from);
      }
    }
  }
  const list = [...wanted];
  const CHUNK = 400;
  for (let i = 0; i < list.length; i += CHUNK) {
    const texts = catBlobs(name, list.slice(i, i + CHUNK));
    for (const [sha, text] of texts) {
      if (text === null) {
        stats.missingBlobs++;
        descriptors.set(sha, { missing: true });
        continue;
      }
      const d = describe(text, pathOf.get(sha));
      stats.filesParsed++;
      if (d.error) {
        stats.parseErrors++;
      }
      descriptors.set(sha, d);
    }
  }
  const rows = [];
  for (const c of commits) {
    for (const f of c.files) {
      if (!f.relevant) {
        continue;
      }
      stats.relevantFileChanges++;
      const before = f.oldBlob ? descriptors.get(f.oldBlob) : EMPTY;
      const after = f.newBlob ? descriptors.get(f.newBlob) : EMPTY;
      if (
        !before ||
        !after ||
        before.missing ||
        after.missing ||
        before.error ||
        after.error
      ) {
        continue;
      }
      const evs = eventsOf(before, after);
      if (evs.length === 0) {
        continue;
      }
      const hunks = f.hunks;
      for (const e of evs) {
        const row = {
          ...e,
          date: dateOf(c.time),
          file: f.to ?? f.from,
          fileStatus: f.status,
          fix: lh.isBugFix(c.subject),
          mass: c.mass,
          sha: c.sha,
          subject: c.subject,
        };
        if (e.kind === "extended" && e.after && e.before?.line) {
          const d = diffIn(hunks, e.after, e.before);
          row.diff = {
            ...d,
            constructLines: e.after.endLine - e.after.line + 1,
            constructLinesBefore: e.before.endLine - e.before.line + 1,
            pureInsertion: d.removed === 0,
          };
        }
        rows.push(row);
      }
    }
  }
  stats.seconds = Math.round((Date.now() - t0) / 1000);
  stats.head = git(name, ["rev-parse", "HEAD"]).stdout.trim();
  stats.sha = sha0;
  return { rows, stats };
};

// ── summaries ──────────────────────────────────────────────────────────
const summariseEvents = (rows, name = null) => {
  const pick = (construct) => rows.filter((r) => r.construct === construct);
  const label = (r) => {
    if (r.kind === "introduced") {
      return `introduced (${r.where})`;
    }
    if (r.kind === "extended" && (r.fromSingle || r.fromLone)) {
      return r.fromSingle
        ? "extended (from one conditional)"
        : "extended (from a lone if)";
    }
    if (r.kind === "converted") {
      return `converted to ${r.to}${r.sharedTests === false ? " (tests not shared)" : ""}`;
    }
    if (r.kind === "converted-from") {
      return `converted from ${r.from}${r.sharedTests === false ? " (tests not shared)" : ""}`;
    }
    if (r.kind === "reduced-to-one") {
      return `reduced to one conditional${r.to ? ` (${r.to} added)` : ""}`;
    }
    return r.kind;
  };
  const example = (r) => ({
    date: r.date,
    file: r.file,
    kind: label(r),
    permalink: name
      ? permalink(name, r.sha, r.file, r.after?.line ?? 1, r.after?.endLine)
      : null,
    sha: r.sha,
    subject: r.subject,
  });
  const out = {};
  for (const construct of ["ternary", "else-if", "guards"]) {
    const rs = pick(construct);
    const nonMass = rs.filter((r) => !r.mass);
    out[construct] = {
      all: countBy(rs, label),
      commits: new Set(rs.map((r) => r.sha)).size,
      nonMass: countBy(nonMass, label),
      fixCommitShare: countBy(
        nonMass,
        (r) => `${label(r)}: ${r.fix ? "fix" : "other"}`
      ),
    };
    if (name) {
      // a few examples per kind (non-mass), latest first
      const byKind = new Map();
      for (const r of nonMass) {
        const k = label(r);
        if (!byKind.has(k)) {
          byKind.set(k, []);
        }
        if (byKind.get(k).length < 4) {
          byKind.get(k).push(example(r));
        }
      }
      out[construct].examples = Object.fromEntries(byKind);
    }
  }
  return out;
};
const summariseDiffs = (rows) => {
  const ext = rows.filter((r) => r.kind === "extended" && r.diff && !r.mass);
  const one = (r) =>
    r.construct === "ternary"
      ? r.after.members - r.before.members === 1
      : r.construct === "else-if"
        ? r.after.length - r.before.length === 1
        : r.after.guards - r.before.guards === 1;
  const branches = (r) =>
    r.construct === "ternary"
      ? r.after.members - r.before.members
      : r.construct === "else-if"
        ? r.after.length - r.before.length
        : r.after.guards - r.before.guards;
  const group = (rs) => ({
    added: dist(rs.map((r) => r.diff.added)),
    changed: dist(rs.map((r) => r.diff.added + r.diff.removed)),
    constructLines: dist(rs.map((r) => r.diff.constructLines)),
    constructLinesBefore: dist(rs.map((r) => r.diff.constructLinesBefore)),
    // lines of the old construct left untouched by the change
    keptShare: dist(
      rs.map((r) =>
        Math.round(
          ((r.diff.constructLinesBefore - r.diff.removed) /
            r.diff.constructLinesBefore) *
            100
        )
      )
    ),
    n: rs.length,
    pureInsertionShare: lib.pct(
      rs.filter((r) => r.diff.pureInsertion).length,
      rs.length
    ),
    removed: dist(rs.map((r) => r.diff.removed)),
    shareOfConstructNew: dist(
      rs.map((r) => Math.round((r.diff.added / r.diff.constructLines) * 100))
    ),
  });
  const kinds = {
    "else-if +1 (chain of 2+)": ext.filter(
      (r) => r.construct === "else-if" && !r.fromLone && one(r)
    ),
    "else-if +1 (from a lone if)": ext.filter(
      (r) => r.construct === "else-if" && r.fromLone && one(r)
    ),
    "guards +1": ext.filter((r) => r.construct === "guards" && one(r)),
    "ternary +1 (from one conditional)": ext.filter(
      (r) => r.construct === "ternary" && r.fromSingle && one(r)
    ),
    "ternary +1 (nested tree)": ext.filter(
      (r) => r.construct === "ternary" && !r.fromSingle && one(r)
    ),
  };
  const out = {};
  for (const [k, rs] of Object.entries(kinds)) {
    out[k] = group(rs);
  }
  out.perBranch = Object.fromEntries(
    ["ternary", "else-if", "guards"].map((c) => {
      const rs = ext.filter((r) => r.construct === c);
      return [
        c,
        {
          changedPerBranch: dist(
            rs.map(
              (r) =>
                Math.round(
                  ((r.diff.added + r.diff.removed) / branches(r)) * 10
                ) / 10
            )
          ),
          n: rs.length,
        },
      ];
    })
  );
  return out;
};

// formatter at the pinned commit
const formatterOf = (name) => {
  const sha = lib.PINNED[name];
  const files = git(name, ["ls-tree", "--name-only", sha])
    .stdout.split("\n")
    .filter(Boolean);
  const pkg = (() => {
    try {
      return JSON.parse(git(name, ["show", `${sha}:package.json`]).stdout);
    } catch {
      return {};
    }
  })();
  const deps = { ...pkg.devDependencies, ...pkg.dependencies };
  // the formatter commands in package.json scripts (and lint-staged), the clearest sign of which
  // formatter actually runs
  const commands = JSON.stringify({ ...pkg.scripts, ...pkg["lint-staged"] });
  const formatCommands = [
    ...new Set(
      (
        commands.match(
          /\b(?:prettier|biome format|biome check|oxfmt|vp fmt|dprint fmt|tsfmt)\b/g
        ) ?? []
      ).map((m) => m)
    ),
  ];
  return {
    biome:
      files.some((f) => /^biome\.jsonc?$/.test(f)) ||
      Boolean(deps["@biomejs/biome"]),
    dprint:
      files.some((f) => /^\.?dprint\.jsonc?$/.test(f)) || Boolean(deps.dprint),
    formatCommands,
    oxfmt:
      files.some((f) => /oxfmt/.test(f)) ||
      Boolean(deps.oxfmt) ||
      /\bvp fmt\b/.test(commands),
    prettier:
      files.some((f) => /^(?:\.prettierrc.*|prettier\.config\..*)$/.test(f)) ||
      Boolean(pkg.prettier) ||
      Boolean(deps.prettier),
    tsfmt: files.includes("tsfmt.json"),
    rootFiles: files.filter((f) =>
      /prettier|biome|dprint|oxfmt|editorconfig/i.test(f)
    ),
  };
};

// ── keywords ───────────────────────────────────────────────────────────
const SCOPED_GREP =
  "ternar|nested ternary|conditional operator|conditional expression|precedence|(^|[[:space:]`'\"])[?]:|no-nested-ternary|nonestedternary|prefer-ternary|no-nested-conditional|multiline-ternary|experimentalternaries";
const REPO_GREP =
  "ternar|nested ternary|conditional operator|no-nested-ternary|nonestedternary|prefer-ternary|no-nested-conditional|multiline-ternary|experimentalternaries";
const KEYWORDS =
  /ternar|nested ternary|conditional operator|conditional expression|precedence|(?:^|[\s`'"])\?:|no-nested-ternary|nonestedternary|prefer-ternary|no-nested-conditional|multiline-ternary|experimentalternaries/gi;
const grepCommits = (name, pattern, paths) => {
  const r = git(name, [
    "log",
    lib.PINNED[name],
    "--first-parent",
    "--format=@@@%H%x09%ct%x09%s",
    "-i",
    "-E",
    `--grep=${pattern}`,
    ...(paths ? ["--", ...paths] : []),
  ]);
  return r.stdout
    .split("\n")
    .filter((l) => l.startsWith("@@@"))
    .map((l) => {
      const [h, t, ...s] = l.slice(3).split("\t");
      return { sha: h, subject: s.join("\t"), time: Number(t) };
    });
};
const keywords = (name) => {
  const scoped = grepCommits(name, SCOPED_GREP, lh.SCOPES[name]);
  const repoWide = grepCommits(name, REPO_GREP, null);
  const bySha = new Map();
  for (const c of scoped) {
    bySha.set(c.sha, { ...c, scoped: true });
  }
  for (const c of repoWide) {
    if (!bySha.has(c.sha)) {
      bySha.set(c.sha, { ...c, scoped: false });
    }
  }
  const out = [];
  for (const c of bySha.values()) {
    const body = git(name, ["log", "-1", "--format=%B", c.sha]).stdout;
    const matched = [
      ...new Set(
        (body.match(KEYWORDS) ?? []).map((m) => m.trim().toLowerCase())
      ),
    ];
    if (matched.length === 0) {
      continue; // git's ERE matched something the JS pattern doesn't (case folding of `?:`)
    }
    const files = git(name, [
      "show",
      "--format=",
      "--name-only",
      "--first-parent",
      c.sha,
    ])
      .stdout.split("\n")
      .filter(Boolean);
    // the conditional lines the diff adds and removes, in measured files
    const measured = files.filter((f) => inScope(name, f));
    const patch = measured.length
      ? git(name, [
          "show",
          "--format=",
          "-U0",
          "--first-parent",
          "--no-color",
          c.sha,
          "--",
          ...measured.slice(0, 30),
        ]).stdout
      : "";
    const condLines = patch
      .split("\n")
      .filter(
        (l) =>
          (l.startsWith("+") || l.startsWith("-")) &&
          !l.startsWith("+++") &&
          !l.startsWith("---") &&
          /(?<![?.])\?(?![?.:])[^?]*:|^\s*[+-]\s*:/.test(l)
      )
      .map((l) => l.slice(0, 160));
    out.push({
      body: body.trim().slice(0, 800),
      condLines: condLines.slice(0, 16),
      condLinesTotal: condLines.length,
      date: dateOf(c.time),
      files: files.slice(0, 15),
      filesTotal: files.length,
      matched,
      measuredFiles: measured.length,
      repo: name,
      scoped: c.scoped,
      sha: c.sha,
      subject: c.subject,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
};

// ── tracking and analysis ──────────────────────────────────────────────
const trackRows = (name) =>
  lib
    .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
    .filter((f) => !f.test)
    .map((f) => ({
      ...f,
      embedStartLine: f.line,
      endLine: f.line + f.lines - 1,
      id: `${name}:${f.file}#${f.index}`,
    }));
const analyse = (repos) => {
  const units = [];
  for (const name of repos) {
    const meta = lib.readJson(join(OUT, `${name}.meta.json`), null);
    if (!meta) {
      continue;
    }
    const rows = trackRows(name);
    const byId = new Map(rows.map((f) => [f.id, f]));
    // the longest else-if chain each function owns
    const chainMax = new Map();
    for (const i of lib.readJsonl(join(CENSUS, `${name}.ifs.jsonl`))) {
      if (i.test || i.fn === null) {
        continue;
      }
      const k = `${name}:${i.file}#${i.fn}`;
      chainMax.set(k, Math.max(chainMax.get(k) ?? 0, i.length));
    }
    // own lines: the lines whose innermost tracked function this is (length-history `innermost`)
    const ownLines = new Map();
    const byFile = new Map();
    for (const f of rows) {
      (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)).push(f);
    }
    for (const fns of byFile.values()) {
      const owner = new Map();
      for (const f of fns) {
        for (let l = f.embedStartLine; l <= f.endLine; l++) {
          const o = owner.get(l);
          if (
            !o ||
            f.endLine - f.embedStartLine < o.endLine - o.embedStartLine
          ) {
            owner.set(l, f);
          }
        }
      }
      for (const f of owner.values()) {
        ownLines.set(f, (ownLines.get(f) ?? 0) + 1);
      }
    }
    for (const h of lib.readJsonl(join(OUT, `${name}.jsonl`))) {
      const f = byId.get(h.id);
      if (!f) {
        continue;
      }
      const start = Math.max(meta.since, h.born ?? meta.since);
      const days = (meta.pinnedTime - start) / 86_400;
      if (days < lh.MIN_EXPOSURE_DAYS) {
        continue;
      }
      units.push({
        anyConditional: f.conditionals > 0 ? 1 : 0,
        cognitive: f.cognitive,
        elseIf3: (chainMax.get(h.id) ?? 0) >= 3 ? 1 : 0,
        exposureYears: days / 365,
        file: `${name}:${f.file}`,
        fixed: h.fixes > 0 ? 1 : 0,
        fixes: h.fixes,
        nested: f.nestedTernaries > 0 ? 1 : 0,
        ownLines: Math.max(1, ownLines.get(f) ?? 0),
        repo: name,
        touched: h.touches > 0 ? 1 : 0,
        touches: h.touches,
      });
    }
  }
  const TERMS = {
    anyConditional: (u) => u.anyConditional,
    cognitive: (u) => Math.log1p(u.cognitive),
    elseIf3: (u) => u.elseIf3,
    exposure: (u) => Math.log(u.exposureYears),
    nested: (u) => u.nested,
    ownLines: (u) => Math.log(u.ownLines),
    touches: (u) => Math.log1p(u.touches),
  };
  const fit = (us, names, outcome = "fixed") => {
    const reps = [...new Set(us.map((u) => u.repo))];
    const X = us.map((u) => [
      1,
      ...names.map((n) => TERMS[n](u)),
      ...reps.slice(1).map((r) => (u.repo === r ? 1 : 0)),
    ]);
    let r;
    try {
      r = lh.logistic(
        X,
        us.map((u) => u[outcome]),
        us.map((u) => u.file)
      );
    } catch (error) {
      return { error: String(error.message), n: us.length };
    }
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
    const xs = us.map((u) => u.ownLines).sort((a, b) => a - b);
    return {
      changedShare: lib.pct(us.filter((u) => u.touched).length, us.length),
      fixedShare: lib.pct(us.filter((u) => u.fixed).length, us.length),
      fixesPer100LineYears: ly
        ? Math.round((us.reduce((s, u) => s + u.fixes, 0) / ly) * 100 * 1000) /
          1000
        : null,
      medianOwnLines: xs.length ? xs[Math.floor(xs.length / 2)] : null,
      n: us.length,
    };
  };
  const changed = units.filter((u) => u.touched);
  const withCond = units.filter((u) => u.anyConditional);
  const repoNames = [...new Set(units.map((u) => u.repo))];
  return {
    byGroup: {
      elseIf3: rates(units.filter((u) => u.elseIf3)),
      nested: rates(units.filter((u) => u.nested)),
      noConditional: rates(units.filter((u) => !u.anyConditional)),
      ternaryNotNested: rates(
        units.filter((u) => u.anyConditional && !u.nested)
      ),
    },
    byRepo: Object.fromEntries(
      repoNames.map((r) => [
        r,
        {
          nested: rates(units.filter((u) => u.repo === r && u.nested)),
          other: rates(units.filter((u) => u.repo === r && !u.nested)),
        },
      ])
    ),
    models: {
      // the headline: nested ternary, size, exposure, repo
      nested: fit(units, ["nested", "ownLines", "exposure"]),
      // beyond having any conditional expression
      nestedAndAnyConditional: fit(units, [
        "nested",
        "anyConditional",
        "ownLines",
        "exposure",
      ]),
      // among functions with a conditional expression only
      nestedAmongTernaryFunctions: fit(withCond, [
        "nested",
        "ownLines",
        "exposure",
      ]),
      // with cognitive complexity as a control
      nestedWithCognitive: fit(units, [
        "nested",
        "cognitive",
        "ownLines",
        "exposure",
      ]),
      // the comparison construct
      elseIf3: fit(units, ["elseIf3", "ownLines", "exposure"]),
      nestedAndElseIf3: fit(units, [
        "nested",
        "elseIf3",
        "ownLines",
        "exposure",
      ]),
      // among changed functions, with the number of changes controlled
      churnNested: fit(changed, ["nested", "ownLines", "touches", "exposure"]),
      churnElseIf3: fit(changed, [
        "elseIf3",
        "ownLines",
        "touches",
        "exposure",
      ]),
    },
    units: {
      changed: changed.length,
      elseIf3: units.filter((u) => u.elseIf3).length,
      fixed: units.filter((u) => u.fixed).length,
      n: units.length,
      nested: units.filter((u) => u.nested).length,
      nestedFixed: units.filter((u) => u.nested && u.fixed).length,
      perRepo: countBy(units, (u) => u.repo),
    },
  };
};

// ── the hand check of the events ───────────────────────────────────────
const EVENT_CHECK = join(lib.RESULTS_DIR, "history-event-check.json");
const eventSample = () => {
  const rows = [];
  for (const name of REPOS) {
    const p = join(OUT, `${name}.events.jsonl`);
    if (lib.existsSync(p)) {
      rows.push(...lib.readJsonl(p).map((r) => ({ ...r, repo: name })));
    }
  }
  const random = lib.rng(20_261_111);
  const pool = rows.filter(
    (r) => !r.mass && r.construct !== "guards" && r.kind !== "edited"
  );
  const byKind = new Map();
  for (const r of lib.shuffle(pool, random)) {
    const k = `${r.construct}: ${r.kind}${r.to ? ` to ${r.to}` : ""}${r.from ? ` from ${r.from}` : ""}${r.fromSingle ? " (from one)" : ""}${r.fromLone ? " (from a lone if)" : ""}`;
    if (!byKind.has(k)) {
      byKind.set(k, []);
    }
    if (byKind.get(k).length < 3) {
      byKind.get(k).push(r);
    }
  }
  const sample = [...byKind.entries()].flatMap(([kind, rs]) =>
    rs.map((r) => ({
      after: r.after ?? null,
      before: r.before ?? null,
      fn: r.fn,
      file: r.file,
      kind,
      permalink: permalink(
        r.repo,
        r.sha,
        r.file,
        r.after?.line ?? r.before?.line ?? 1,
        r.after?.endLine
      ),
      repo: r.repo,
      sha: r.sha,
    }))
  );
  lib.writeJson(join(OUT, "event-sample.json"), sample);
  lib.writeText(
    join(OUT, "event-sample.md"),
    sample
      .map(
        (x, i) =>
          `## ${i + 1}. ${x.kind}\n${x.repo} ${x.sha} ${x.file} (fn ${x.fn}); before ${JSON.stringify(x.before)}, after ${JSON.stringify(x.after)}\n${x.permalink}\n`
      )
      .join("\n")
  );
  return sample.length;
};
const summariseEventCheck = () => {
  const check = lib.readJson(EVENT_CHECK, null);
  if (!check) {
    return null;
  }
  const items = check.items ?? [];
  return {
    byKind: Object.fromEntries(
      [...new Set(items.map((i) => i.kind))].map((k) => [
        k,
        countBy(
          items.filter((i) => i.kind === k),
          (i) => i.verdict
        ),
      ])
    ),
    correct: items.filter((i) => i.verdict === "correct").length,
    n: items.length,
    note: check.note ?? null,
    partly: items.filter((i) => i.verdict === "partly").length,
    rater: check.rater ?? null,
    wrong: items.filter((i) => i.verdict === "wrong").length,
  };
};

// ── labels ─────────────────────────────────────────────────────────────
const LABELS = join(lib.RESULTS_DIR, "history-labels.json");
const summariseLabels = (commits) => {
  const labels = lib.readJson(LABELS, null);
  if (!labels) {
    return null;
  }
  const bySha = new Map((labels.labels ?? []).map((l) => [l.sha, l]));
  const unlabelled = commits
    .filter((c) => !bySha.has(c.sha))
    .map((c) => `${c.repo} ${c.sha}`);
  const known = (labels.labels ?? []).filter((l) =>
    commits.some((c) => c.sha === l.sha)
  );
  return {
    byCategory: countBy(known, (l) => l.category),
    byRepoCategory: countBy(known, (l) => `${l.repo}: ${l.category}`),
    bugs: known
      .filter((l) => l.category.startsWith("bug"))
      .map((l) => ({
        category: l.category,
        message: l.quote,
        permalink: l.permalink ?? null,
        repo: l.repo,
        sha: l.sha,
      })),
    labelled: known.length,
    rater: labels.rater ?? null,
    unlabelled,
  };
};

const main = async () => {
  const repos = lib.selectedRepos(REPOS).filter((r) => REPOS.includes(r));
  const result = lib.readJson(join(lib.RESULTS_DIR, "history.json"), {}) ?? {};
  result.repos ??= {};
  result.generated = new Date().toISOString();
  result.note =
    "See the header of nested-ternaries-history.cjs. Events and diff sizes come from line-matched constructs, not from reading the commits: a construct is matched within its enclosing function by its tests, so a rename of the function, a moved construct or a rewritten test reads as removed plus introduced. Diff sizes count -U0 hunk lines inside the construct's new range, including reformatting. The bug-fix heuristic is length-history.cjs's isBugFix (precision and miss rate in `heuristic`). Regressions are associations, not effects.";
  result.tools = lib.toolVersions();
  result.window = {
    days: lh.WINDOW_DAYS,
    massFiles: MASS_FILES,
    minExposureDays: lh.MIN_EXPOSURE_DAYS,
  };
  const allEvents = [];
  for (const name of repos) {
    const entry = (result.repos[name] ??= {});
    entry.sha = lib.PINNED[name];
    entry.historyHead = git(name, ["rev-parse", "HEAD"]).stdout.trim();
    entry.scope = lh.SCOPES[name];
    if (lib.flag("events") || lib.flag("diffsize")) {
      const { rows, stats } = await events(name);
      lib.writeJsonl(join(OUT, `${name}.events.jsonl`), rows);
      entry.events = { stats, summary: summariseEvents(rows, name) };
      entry.formatter = formatterOf(name);
      console.log(
        `${name}: ${stats.commits} commits, ${stats.relevantFileChanges} relevant file changes, ${stats.filesParsed} versions parsed (${stats.missingBlobs} missing, ${stats.parseErrors} errors), ${rows.length} events (${stats.seconds}s)`
      );
    }
    if (lib.flag("formatters")) {
      entry.formatter = formatterOf(name);
    }
    if (lib.flag("keywords")) {
      const k = keywords(name);
      lib.writeJson(join(OUT, `${name}.keywords.json`), k);
      entry.keywords = {
        commits: k.length,
        measured: k.filter((c) => c.scoped).length,
      };
      console.log(`${name}: ${k.length} keyword commits`);
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
  // pooled events and diff sizes from the row files (so a per-repo rerun keeps the pool)
  if (lib.flag("events") || lib.flag("diffsize") || lib.flag("formatters")) {
    for (const name of REPOS) {
      const p = join(OUT, `${name}.events.jsonl`);
      if (lib.existsSync(p)) {
        allEvents.push(...lib.readJsonl(p).map((r) => ({ ...r, repo: name })));
      }
    }
    result.events = {
      pooled: summariseEvents(allEvents),
      repos: REPOS.filter((n) => result.repos[n]?.events).length,
    };
    result.diffsize = {
      byRepo: Object.fromEntries(
        REPOS.filter((n) => lib.existsSync(join(OUT, `${n}.events.jsonl`))).map(
          (n) => [n, summariseDiffs(allEvents.filter((r) => r.repo === n))]
        )
      ),
      formatters: Object.fromEntries(
        REPOS.filter((n) => result.repos[n]?.formatter).map((n) => [
          n,
          result.repos[n].formatter,
        ])
      ),
      note: "Non-mass commits only. `added` and `removed` are -U0 hunk lines inside the construct's range in the new version (removed: the old lines those hunks replace, so a rewritten line counts once as removed and once as added). pureInsertion: no existing line changed. The comparison is between different code in different commits, not the same change written two ways, and a formatter (Prettier in most of these repos) decides how a ternary chain is laid out.",
      pooled: summariseDiffs(allEvents),
    };
  }
  if (lib.flag("keywords")) {
    const all = [];
    for (const name of REPOS) {
      const p = join(OUT, `${name}.keywords.json`);
      if (lib.existsSync(p)) {
        all.push(...lib.readJson(p));
      }
    }
    lib.writeJson(join(lib.OUT_DIR, "history-keywords.json"), {
      generated: new Date().toISOString(),
      note: "See the header of nested-ternaries-history.cjs (--keywords). scoped: the commit touches the measured package's source; otherwise it matched a ternary or rule keyword anywhere in the repo.",
      commits: all,
    });
    result.keywords = {
      byRepo: countBy(all, (c) => c.repo),
      byRepoScoped: countBy(
        all.filter((c) => c.scoped),
        (c) => c.repo
      ),
      commits: all.length,
      labels: summariseLabels(all),
      matched: countBy(
        all.flatMap((c) => c.matched),
        (m) => m
      ),
      patterns: { repoWide: REPO_GREP, scoped: SCOPED_GREP },
    };
  }
  if (lib.flag("event-sample")) {
    console.log(`event sample: ${eventSample()} events`);
  }
  result.eventCheck = summariseEventCheck();
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
    console.log(JSON.stringify(result.analysis.models.nested.coef));
  }
  lib.writeJson(
    join(lib.RESULTS_DIR, "history.json"),
    JSON.parse(lib.scrub(JSON.stringify(result)))
  );
};

module.exports = { describe, eventsOf };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
