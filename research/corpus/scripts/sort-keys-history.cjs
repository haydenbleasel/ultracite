// History: where keys get added to object literals, and whether sorted keys would have caused
// fewer merge conflicts. Only git runs on the history clones (repos/history/, from
// todo-history-clone.sh); nothing is checked out, installed or executed.
//
//   --events   every commit on each project's mainline (`git log --first-parent`) that modifies a
//              file in the measured package's source, in every layout it has had (the scopes are
//              todo-history.cjs's). Both versions of each modified file are parsed with
//              TypeScript, and every object literal is identified by an anchor: the chain of names
//              above it (variables, functions, properties, call arguments, JSX attributes), kept
//              only if it's unique in both versions. An object "gained keys" when its keys after
//              the commit are its keys before plus new ones, with the old keys in the same order
//              and none removed, and it had at least two keys before. For each new key: inserted
//              at the start, the end or in the middle; whether the object was sorted (ESLint's
//              comparator and grouping) before and after; and whether the key went where sorting
//              would put it. Commits that only reordered keys are counted too.
//              Missing blobs (Next.js and VS Code are partial clones) are skipped, never fetched
//              (GIT_NO_LAZY_FETCH=1), and counted.
//   --merge    for every object that gained keys in two different commits, the two insertions are
//              replayed as concurrent edits of the same base (the object before the first of them)
//              with `git merge-file`, in three layouts: the authors' positions, sorted positions
//              (the base sorted, each new key at its sorted place), and appended at the end. Each
//              property is a block of its own source lines, with a trailing comma (and once more
//              without trailing commas, as a sensitivity check).
//
// Usage: node --max-old-space-size=12000 research/corpus/scripts/sort-keys-history.cjs --events --merge [--repos a,b]
// Writes results/sort-keys/history.json and out/sort-keys/history/<repo>.jsonl (every event).
"use strict";

const { execFileSync, spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");
const {
  EXCLUDED_DIR_NAMES,
  EXCLUDED_FILE_PATTERNS,
  config,
} = require("./collect-files.cjs");

const { dc } = lib;
const ts = dc.ts;
const OUT = join(lib.OUT_DIR, "history");
const MERGE_DIR = join(lib.TMP, "merge");

// The measured package's source directories in every layout (copied from todo-history.cjs).
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
  if (
    !SOURCE_EXT.test(path) ||
    !SCOPES[name].some((s) => path === s || path.startsWith(`${s}/`))
  ) {
    return false;
  }
  const parts = path.split("/");
  if (
    parts.slice(0, -1).some((p) => EXCLUDED_DIR_NAMES.has(p)) ||
    EXCLUDED_FILE_PATTERNS.some(([re]) => re.test(parts.at(-1)))
  ) {
    return false;
  }
  return !repoExcludes(name).some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
};

const GIT_ENV = { ...process.env, GIT_NO_LAZY_FETCH: "1" };
const git = (name, argv, opts = {}) =>
  execFileSync(
    "git",
    [
      "-C",
      join(lib.HISTORY_DIR, `${name}.git`),
      "-c",
      "core.quotePath=false",
      ...argv,
    ],
    {
      encoding: "utf8",
      env: GIT_ENV,
      maxBuffer: 1 << 30,
      stdio: ["pipe", "pipe", "pipe"],
      ...opts,
    }
  );

// Many blobs in one `git cat-file --batch` call. Returns a Map spec -> text (null if missing).
const catBlobs = (name, specs) => {
  const out = new Map();
  if (specs.length === 0) {
    return out;
  }
  const buf = execFileSync(
    "git",
    ["-C", join(lib.HISTORY_DIR, `${name}.git`), "cat-file", "--batch"],
    {
      env: GIT_ENV,
      input: `${specs.join("\n")}\n`,
      maxBuffer: 2 ** 31,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
  let pos = 0;
  for (const spec of specs) {
    const nl = buf.indexOf(10, pos);
    const header = buf.subarray(pos, nl).toString("utf8");
    pos = nl + 1;
    if (/ missing$/.test(header) || / ambiguous$/.test(header)) {
      out.set(spec, null);
      continue;
    }
    const size = Number(header.split(" ")[2]);
    out.set(spec, buf.subarray(pos, pos + size).toString("utf8"));
    pos += size + 1;
  }
  return out;
};

// ── objects in one version of a file ───────────────────────────────────
const nameText = (n, sf) => {
  if (!n) {
    return null;
  }
  if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) {
    return n.text;
  }
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
    return n.text;
  }
  if (ts.isNumericLiteral(n)) {
    return String(Number(n.text));
  }
  if (ts.isComputedPropertyName(n)) {
    const e = n.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
      return e.text;
    }
    if (ts.isNumericLiteral(e)) {
      return String(Number(e.text));
    }
    if (ts.isIdentifier(e)) {
      // ESLint's sort-keys reads `[foo]` as "foo".
      return e.text;
    }
    return null;
  }
  return n.getText(sf);
};
// The key of a property: its name (ESLint's reading) and kind; spreads have none.
const keyOf = (p, sf) => {
  if (ts.isSpreadAssignment(p)) {
    return { name: null, spread: true };
  }
  const kind = ts.isGetAccessorDeclaration(p)
    ? " get"
    : ts.isSetAccessorDeclaration(p)
      ? " set"
      : "";
  return {
    name: nameText(p.name, sf),
    sig: `${p.name.getText(sf)}${kind}`,
    spread: false,
  };
};
const label = (node, sf) => {
  const p = node.parent;
  if (!p) {
    return null;
  }
  if (ts.isPropertyAssignment(p) && p.initializer === node) {
    return `p:${p.name.getText(sf)}`;
  }
  if (ts.isVariableDeclaration(p)) {
    return `v:${p.name.getText(sf).slice(0, 40)}`;
  }
  if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
    if (p.expression === node) {
      return null;
    }
    const callee = p.expression.getText(sf).replace(/\s+/g, "").slice(0, 50);
    return `${ts.isNewExpression(p) ? "new" : "call"}:${callee}#${(p.arguments ?? []).indexOf(node)}`;
  }
  if (
    ts.isFunctionDeclaration(p) ||
    ts.isMethodDeclaration(p) ||
    ts.isClassDeclaration(p) ||
    ts.isGetAccessorDeclaration(p) ||
    ts.isSetAccessorDeclaration(p) ||
    ts.isPropertyDeclaration(p)
  ) {
    return `f:${p.name?.getText(sf) ?? "?"}`;
  }
  if (ts.isReturnStatement(p)) {
    return "return";
  }
  if (ts.isExportAssignment(p)) {
    return "export=";
  }
  if (ts.isJsxAttribute(p)) {
    return `jsx:${p.name.getText(sf)}`;
  }
  if (ts.isArrayLiteralExpression(p)) {
    return "[]";
  }
  if (
    ts.isBinaryExpression(p) &&
    p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    p.right === node
  ) {
    return `=${p.left.getText(sf).replace(/\s+/g, "").slice(0, 50)}`;
  }
  return null;
};
const objectsOf = (text, path) => {
  let sf;
  try {
    sf = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
      /\.tsx$/.test(path)
        ? ts.ScriptKind.TSX
        : /\.(?:jsx|js|mjs|cjs)$/.test(path)
          ? ts.ScriptKind.JSX
          : ts.ScriptKind.TS
    );
  } catch {
    return null;
  }
  const out = [];
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const labels = [];
      for (let n = node; n && !ts.isSourceFile(n); n = n.parent) {
        const l = label(n, sf);
        if (l) {
          labels.push(l);
        }
      }
      const props = node.properties.map((p) => ({
        ...keyOf(p, sf),
        text: text.slice(p.getStart(sf, true), p.end).replace(/^\s+/, ""),
        textNoComments: text.slice(p.getStart(sf, false), p.end),
      }));
      out.push({ anchor: labels.reverse().join(" / "), props });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  const counts = new Map();
  for (const o of out) {
    counts.set(o.anchor, (counts.get(o.anchor) ?? 0) + 1);
  }
  return out.filter((o) => counts.get(o.anchor) === 1);
};

// ESLint's grouping and comparator: spreads reset, unnamed keys skipped.
const sortedSeq = (props) => {
  let prev = null;
  for (const p of props) {
    if (p.spread) {
      prev = null;
      continue;
    }
    if (p.name === null) {
      continue;
    }
    if (prev !== null && prev > p.name) {
      return false;
    }
    prev = p.name;
  }
  return true;
};
const sigList = (props) => {
  const seen = new Map();
  return props.map((p) => {
    const s = p.spread ? "..." : p.sig;
    const n = seen.get(s) ?? 0;
    seen.set(s, n + 1);
    return n === 0 ? s : `${s}#${n}`;
  });
};
// Is `small` a subsequence of `big`?
const isSubsequence = (small, big) => {
  let i = 0;
  for (const x of big) {
    if (x === small[i]) {
      i++;
    }
  }
  return i === small.length;
};

const compareEvent = (before, after) => {
  const a = sigList(before.props);
  const b = sigList(after.props);
  if (a.length < 2) {
    return null;
  }
  const setA = new Set(a);
  const setB = new Set(b);
  const removed = a.filter((x) => !setB.has(x));
  const added = b.filter((x) => !setA.has(x));
  if (removed.length > 0) {
    return null;
  }
  if (added.length === 0) {
    const reordered = a.join("\n") !== b.join("\n");
    return reordered ? { kind: "reordered" } : null;
  }
  const kept = b.filter((x) => setA.has(x));
  if (!isSubsequence(a, kept) || kept.length !== a.length) {
    return { kind: "added and reordered" };
  }
  // Where each new key went, relative to the old keys.
  const firstOld = b.findIndex((x) => setA.has(x));
  const lastOld = b.length - 1 - [...b].reverse().findIndex((x) => setA.has(x));
  // Relative to the whole object, and relative to the old keys of its own spread group (a key
  // added just before a trailing `...rest` is at the end of its group).
  const positionsObject = added.map((x) => {
    const i = b.indexOf(x);
    return i < firstOld ? "start" : i > lastOld ? "end" : "middle";
  });
  const positions = added.map((x) => {
    const i = b.indexOf(x);
    let from = i;
    while (from > 0 && !after.props[from - 1].spread) {
      from--;
    }
    let to = i;
    while (to + 1 < b.length && !after.props[to + 1].spread) {
      to++;
    }
    const old = [];
    for (let j = from; j <= to; j++) {
      if (setA.has(b[j]) && !after.props[j].spread) {
        old.push(j);
      }
    }
    if (old.length === 0) {
      return "own group";
    }
    return i < old[0] ? "start" : i > old.at(-1) ? "end" : "middle";
  });
  // Did each new key go where sorting the old keys would put it? Only meaningful within the new
  // key's spread group and when it has a name.
  const atSortedPlace = added.map((x) => {
    const i = b.indexOf(x);
    const p = after.props[i];
    if (p.spread || p.name === null) {
      return null;
    }
    // The old keys immediately around it in the after sequence (same group).
    let lo = null;
    for (let j = i - 1; j >= 0 && !after.props[j].spread; j--) {
      if (setA.has(b[j]) && after.props[j].name !== null) {
        lo = after.props[j].name;
        break;
      }
    }
    let hi = null;
    for (let j = i + 1; j < b.length && !after.props[j].spread; j++) {
      if (setA.has(b[j]) && after.props[j].name !== null) {
        hi = after.props[j].name;
        break;
      }
    }
    return (lo === null || lo <= p.name) && (hi === null || p.name <= hi);
  });
  return {
    added,
    atSortedPlace,
    kind: "gained keys",
    positionsObject,
    keysAfter: b,
    keysBefore: a,
    positions,
    sortedAfter: sortedSeq(after.props),
    sortedBefore: sortedSeq(before.props),
  };
};

// ── the mainline walk ──────────────────────────────────────────────────
const events = (name) => {
  const sha = lib.PINNED[name];
  const log = git(name, [
    "log",
    "--first-parent",
    "--diff-merges=first-parent",
    "-M",
    "--name-status",
    "--format=%x00%H %P%x09%ct%x09%aI",
    sha,
    "--",
    ...SCOPES[name],
  ]);
  const commits = log
    .split("\0")
    .filter(Boolean)
    .map((chunk) => {
      const [head, ...rest] = chunk.split("\n");
      const [ids, ct, date] = head.split("\t");
      const [hash, parent] = ids.split(" ");
      const files = rest
        .filter(Boolean)
        .map((l) => l.split("\t"))
        .filter(([st]) => st === "M" || st.startsWith("R"))
        .map(([st, a, b]) => ({ after: b ?? a, before: a, status: st[0] }))
        .filter((f) => inScope(name, f.after) || inScope(name, f.before));
      return { date, files, hash, parent, time: Number(ct) };
    })
    .filter((c) => c.parent && c.files.length > 0);
  // Lineage: a file keeps its id through renames, walking forwards in time.
  commits.reverse();
  const lineage = new Map();
  let nextId = 0;
  const idOf = (path) => {
    if (!lineage.has(path)) {
      lineage.set(path, nextId++);
    }
    return lineage.get(path);
  };
  const rows = [];
  let missing = 0;
  let parsedPairs = 0;
  let unparsable = 0;
  const BATCH = 150;
  for (let i = 0; i < commits.length; i += BATCH) {
    const batch = commits.slice(i, i + BATCH);
    const specs = [];
    for (const c of batch) {
      for (const f of c.files) {
        specs.push(`${c.parent}:${f.before}`, `${c.hash}:${f.after}`);
      }
    }
    const blobs = catBlobs(name, specs);
    for (const c of batch) {
      for (const f of c.files) {
        const id = idOf(f.before);
        if (f.status === "R") {
          lineage.set(f.after, id);
        }
        const a = blobs.get(`${c.parent}:${f.before}`);
        const b = blobs.get(`${c.hash}:${f.after}`);
        if (a == null || b == null) {
          missing++;
          continue;
        }
        if (
          Buffer.byteLength(a) > 1_500_000 ||
          Buffer.byteLength(b) > 1_500_000
        ) {
          continue;
        }
        const A = objectsOf(a, f.before);
        const B = objectsOf(b, f.after);
        if (!A || !B) {
          unparsable++;
          continue;
        }
        parsedPairs++;
        const byAnchor = new Map(B.map((o) => [o.anchor, o]));
        for (const o of A) {
          const after = byAnchor.get(o.anchor);
          if (!after) {
            continue;
          }
          const e = compareEvent(o, after);
          if (!e) {
            continue;
          }
          const row = {
            anchor: o.anchor,
            commit: c.hash,
            date: c.date.slice(0, 10),
            file: f.after,
            lineage: id,
            time: c.time,
            ...e,
          };
          if (e.kind === "gained keys") {
            row.propsBefore = o.props.map((p) => ({
              name: p.name,
              sig: p.spread ? "..." : p.sig,
              spread: p.spread,
              text: p.text,
            }));
            row.propsAfter = after.props.map((p) => ({
              name: p.name,
              sig: p.spread ? "..." : p.sig,
              spread: p.spread,
              text: p.text,
            }));
          }
          rows.push(row);
        }
      }
    }
    process.stdout.write(
      `\r${name}: ${Math.min(i + BATCH, commits.length)}/${commits.length} commits, ${rows.length} events`
    );
  }
  process.stdout.write("\n");
  return {
    commits: commits.length,
    first: commits[0]?.date ?? null,
    missing,
    parsedPairs,
    rows,
    unparsable,
  };
};

// ── merge simulation ───────────────────────────────────────────────────
const indentBlock = (text) =>
  text
    .split("\n")
    .map((l, i) => (i === 0 ? `  ${l}` : l))
    .join("\n");
const render = (props, trailingComma) =>
  `{\n${props
    .map((p, i) => {
      const body = p.text.replace(/,\s*$/, "");
      const comma = trailingComma || i < props.length - 1 ? "," : "";
      return `${indentBlock(body)}${comma}`;
    })
    .join("\n")}\n}\n`;
// Insert `added` props into `base` at the positions an event put them: after the nearest old key
// that precedes them in the event's after sequence (or first, if none does).
const insertAuthor = (base, event) => {
  const baseSigs = new Set(sigList(base));
  const out = [...base];
  const after = event.propsAfter;
  const sigsAfter = sigList(after);
  const addedSet = new Set(event.added);
  const placed = [];
  sigsAfter.forEach((s, i) => {
    if (!addedSet.has(s)) {
      return;
    }
    let anchor = null;
    for (let j = i - 1; j >= 0; j--) {
      if (baseSigs.has(sigsAfter[j])) {
        anchor = sigsAfter[j];
        break;
      }
      if (placed.includes(sigsAfter[j])) {
        anchor = sigsAfter[j];
        break;
      }
    }
    const outSigs = sigList(out);
    const at = anchor === null ? 0 : outSigs.indexOf(anchor) + 1;
    out.splice(at, 0, after[i]);
    placed.push(s);
  });
  return out;
};
const byName = (a, b) => {
  const x = a.name ?? a.sig;
  const y = b.name ?? b.sig;
  return x < y ? -1 : x > y ? 1 : 0;
};
// The base sorted (ESLint's comparator; spreads keep their place and split groups), and new keys
// inserted where sorting puts them.
const sortProps = (props) => {
  const out = [...props];
  let start = 0;
  for (let i = 0; i <= out.length; i++) {
    if (i === out.length || out[i].spread) {
      const seg = out.slice(start, i).sort(byName);
      out.splice(start, seg.length, ...seg);
      start = i + 1;
    }
  }
  return out;
};
const insertSorted = (sortedBase, event) => {
  const out = [...sortedBase];
  const after = event.propsAfter;
  const sigsAfter = sigList(after);
  for (const s of event.added) {
    const i = sigsAfter.indexOf(s);
    const p = after[i];
    if (p.spread) {
      out.push(p);
      continue;
    }
    // The spread group the author put it in, then its sorted place within that group.
    const group = after.slice(0, i).filter((x) => x.spread).length;
    let g = 0;
    let from = 0;
    while (g < group && from < out.length) {
      if (out[from].spread) {
        g++;
      }
      from++;
    }
    let to = from;
    while (to < out.length && !out[to].spread) {
      to++;
    }
    let at = to;
    for (let k = from; k < to; k++) {
      if (byName(p, out[k]) < 0) {
        at = k;
        break;
      }
    }
    out.splice(at, 0, p);
  }
  return out;
};
const insertEnd = (base, event) => {
  const sigsAfter = sigList(event.propsAfter);
  return [
    ...base,
    ...event.added.map((s) => event.propsAfter[sigsAfter.indexOf(s)]),
  ];
};
const mergeFile = (a, base, b, dir) => {
  writeFileSync(join(dir, "a"), a);
  writeFileSync(join(dir, "base"), base);
  writeFileSync(join(dir, "b"), b);
  const r = spawnSync(
    "git",
    [
      "merge-file",
      "-p",
      "--quiet",
      join(dir, "a"),
      join(dir, "base"),
      join(dir, "b"),
    ],
    { encoding: "utf8" }
  );
  return r.status;
};
const merges = (name, rows) => {
  const dir = join(MERGE_DIR, name);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  const gains = rows.filter((r) => r.kind === "gained keys");
  const byObject = new Map();
  for (const r of gains) {
    const k = `${r.lineage}|${r.anchor}`;
    byObject.set(k, [...(byObject.get(k) ?? []), r]);
  }
  const pairs = [];
  for (const [k, evs] of byObject) {
    evs.sort((x, y) => x.time - y.time);
    for (let i = 0; i + 1 < evs.length; i++) {
      const e1 = evs[i];
      const e2 = evs[i + 1];
      if (e1.commit === e2.commit) {
        continue;
      }
      const base = e1.propsBefore;
      // e2's keys must be new relative to the base too.
      const baseSigs = new Set(sigList(base));
      if (
        e2.added.some((s) => baseSigs.has(s)) ||
        e2.added.some((s) => e1.added.includes(s))
      ) {
        continue;
      }
      const result = {
        anchor: e1.anchor,
        commits: [e1.commit, e2.commit],
        dates: [e1.date, e2.date],
        file: e2.file,
        object: k,
      };
      for (const trailing of [true, false]) {
        const t = trailing ? "trailingComma" : "noTrailingComma";
        const author = mergeFile(
          render(insertAuthor(base, e1), trailing),
          render(base, trailing),
          render(insertAuthor(base, e2), trailing),
          dir
        );
        const sortedBase = sortProps(base);
        const sorted = mergeFile(
          render(insertSorted(sortedBase, e1), trailing),
          render(sortedBase, trailing),
          render(insertSorted(sortedBase, e2), trailing),
          dir
        );
        const end = mergeFile(
          render(insertEnd(base, e1), trailing),
          render(base, trailing),
          render(insertEnd(base, e2), trailing),
          dir
        );
        result[t] = { author, end, sorted };
      }
      result.positions = [e1.positions, e2.positions];
      pairs.push(result);
    }
  }
  return pairs;
};

// ── aggregate ──────────────────────────────────────────────────────────
const summariseEvents = (rows) => {
  const gains = rows.filter((r) => r.kind === "gained keys");
  const keys = gains.flatMap((r) =>
    r.positions.map((p, i) => ({
      atSorted: r.atSortedPlace[i],
      p,
      sortedBefore: r.sortedBefore,
      sortedAfter: r.sortedAfter,
    }))
  );
  const count = (xs, f) => xs.filter(f).length;
  const sortedBeforeGains = gains.filter((r) => r.sortedBefore);
  return {
    addedAndReordered: count(rows, (r) => r.kind === "added and reordered"),
    events: gains.length,
    keysAdded: keys.length,
    objects: new Set(gains.map((r) => `${r.lineage}|${r.anchor}`)).size,
    positions: {
      end: count(keys, (k) => k.p === "end"),
      middle: count(keys, (k) => k.p === "middle"),
      ownGroup: count(keys, (k) => k.p === "own group"),
      start: count(keys, (k) => k.p === "start"),
    },
    positionsObject: (() => {
      const ps = gains.flatMap((r) => r.positionsObject);
      return {
        end: ps.filter((p) => p === "end").length,
        middle: ps.filter((p) => p === "middle").length,
        start: ps.filter((p) => p === "start").length,
      };
    })(),
    // Events cluster: one commit often adds the same key to many objects (Zod's 40 locales).
    commits: new Set(gains.map((r) => r.commit)).size,
    reorderedOnly: count(rows, (r) => r.kind === "reordered"),
    sorted: {
      after: count(gains, (r) => r.sortedAfter),
      before: sortedBeforeGains.length,
      keptSorted: count(sortedBeforeGains, (r) => r.sortedAfter),
      unsortedBecameSorted: count(
        gains,
        (r) => !r.sortedBefore && r.sortedAfter
      ),
    },
    // Of keys added to objects that were sorted before (and with more than one... key), how many
    // went where sorting puts them?
    sortedObjectsKeyAtSortedPlace: {
      keys: count(keys, (k) => k.sortedBefore && k.atSorted !== null),
      yes: count(keys, (k) => k.sortedBefore && k.atSorted === true),
    },
    unsortedObjectsKeyAtEnd: {
      keys: count(keys, (k) => !k.sortedBefore),
      yes: count(keys, (k) => !k.sortedBefore && k.p === "end"),
    },
  };
};
const summarisePairs = (pairs) => {
  const commitPairs = new Map();
  for (const p of pairs) {
    const k = p.commits.join(" ");
    commitPairs.set(k, [...(commitPairs.get(k) ?? []), p]);
  }
  const out = {
    commitPairs: commitPairs.size,
    objects: new Set(pairs.map((p) => p.object)).size,
    pairs: pairs.length,
  };
  // Each pair of commits counted once: conflicted if any of its objects conflicts.
  out.byCommitPair = {};
  for (const t of ["trailingComma", "noTrailingComma"]) {
    out.byCommitPair[t] = Object.fromEntries(
      ["author", "sorted", "end"].map((layout) => [
        layout,
        [...commitPairs.values()].filter((ps) =>
          ps.some((p) => p[t][layout] > 0)
        ).length,
      ])
    );
  }
  for (const t of ["trailingComma", "noTrailingComma"]) {
    out[t] = {};
    for (const layout of ["author", "sorted", "end"]) {
      const xs = pairs.map((p) => p[t][layout]);
      out[t][layout] = {
        conflicted: xs.filter((x) => x > 0).length,
        conflicts: xs.filter((x) => x > 0).reduce((s, x) => s + x, 0),
        errors: xs.filter((x) => x < 0).length,
      };
    }
    // Paired comparison: the same pair, author against sorted.
    out[t].onlyAuthorConflicts = pairs.filter(
      (p) => p[t].author > 0 && p[t].sorted === 0
    ).length;
    out[t].onlySortedConflicts = pairs.filter(
      (p) => p[t].sorted > 0 && p[t].author === 0
    ).length;
    out[t].both = pairs.filter(
      (p) => p[t].sorted > 0 && p[t].author > 0
    ).length;
  }
  return out;
};

const main = () => {
  const repos = lib.selectedRepos(lib.CORE);
  const path = join(lib.RESULTS_DIR, "history.json");
  const result =
    existsSync(path) && repos.length < lib.CORE.length
      ? lib.readJson(path)
      : { repos: {} };
  result.generated = new Date().toISOString().slice(0, 10);
  result.tools = lib.toolVersions();
  for (const name of repos) {
    if (!existsSync(join(lib.HISTORY_DIR, `${name}.git`))) {
      result.repos[name] = {
        error: "no history clone (run todo-history-clone.sh)",
      };
      continue;
    }
    let rows;
    let meta;
    if (lib.flag("events")) {
      const t0 = Date.now();
      const r = events(name);
      rows = r.rows;
      meta = {
        commits: r.commits,
        firstCommit: r.first,
        missingBlobs: r.missing,
        parsedFilePairs: r.parsedPairs,
        seconds: Math.round((Date.now() - t0) / 1000),
        unparsable: r.unparsable,
      };
      lib.writeJsonl(join(OUT, `${name}.jsonl`), rows);
    } else {
      rows = lib.readJsonl(join(OUT, `${name}.jsonl`));
      meta = result.repos[name]?.meta ?? {};
    }
    const entry = { meta, ...summariseEvents(rows) };
    if (lib.flag("merge")) {
      const pairs = merges(name, rows);
      entry.merge = summarisePairs(pairs);
      lib.writeJsonl(join(OUT, `${name}.merges.jsonl`), pairs);
    }
    result.repos[name] = entry;
    console.log(`${name}: ${JSON.stringify({ ...entry, meta: undefined })}`);
  }
  // Pooled.
  const allRows = lib.CORE.filter((n) =>
    existsSync(join(OUT, `${n}.jsonl`))
  ).flatMap((n) => lib.readJsonl(join(OUT, `${n}.jsonl`)));
  const allPairs = lib.CORE.filter((n) =>
    existsSync(join(OUT, `${n}.merges.jsonl`))
  ).flatMap((n) => lib.readJsonl(join(OUT, `${n}.merges.jsonl`)));
  result.pooled = {
    ...summariseEvents(allRows),
    merge: summarisePairs(allPairs),
  };
  lib.writeJson(path, result);
};

main();
