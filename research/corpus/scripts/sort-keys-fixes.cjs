// What the two key-sorting fixes do to the corpus, on copies (never the clones):
//
//   oxlint   `oxlint --fix` with sort-keys alone (Ultracite's core sets it to "error" with no
//            options, and `ultracite fix` runs `oxlint --fix`)
//   biome    `biome check --write` with the useSortedKeys assist alone (what `ultracite fix` runs
//            for Biome projects applies it)
//
// For every object literal in the census: was it rewritten, did the new order match the
// reimplementation's prediction, and was it reported but skipped (and why). For every rewritten
// object: lines changed, where its comments went (each comment's anchor key before and after; a
// comment that headed a group of keys and no longer does; blank-line groups kept or lost), and the
// static signs that the new order can change behaviour:
//   evaluation order  two values that run code (calls, `new`, assignments, `++`, `await`) swap, or
//                     one that runs code swaps with one that reads state
//   overriding        duplicate keys, `__proto__`, keys moved across a spread (checked: never)
//   observable order  the object, or the outermost literal it sits in, or a variable holding it in
//                     the same scope, reaches a serialiser, Object.keys / values / entries, for-in,
//                     Object.assign, a spread, URLSearchParams or a log; or escapes (exported,
//                     returned, passed to a function, a JSX prop), where its uses can't be seen
//   known APIs        two context-sensitive callbacks (untyped parameters) swap in a call argument
//                     (TypeScript inference), package `exports`-style condition keys, CSS shorthand
//                     and longhand pairs, first-match loops, `.sort()` specs, JSON-schema
//                     `properties` and zod-style shapes
// Then every fixed file is parsed again, and each repo is type-checked with its own tsconfig before
// and after each fix (an overlay of the fixed files; nothing is installed), recording the
// TypeScript diagnostics the fix adds.
//
// Usage: node --max-old-space-size=12000 research/corpus/scripts/sort-keys-fixes.cjs [--repos a,b]
//        [--skip-typecheck]
// Writes results/sort-keys/fixes.json and out/sort-keys/fixes/<linter>/<repo>.jsonl.
"use strict";

const { execFileSync, spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const { dc } = lib;
const ts = dc.ts;
const WORK = join(lib.TMP, "fix");
const CONFIG_DIR = join(lib.TMP, "configs");
const LINTERS = ["oxlint", "biome"];

// The tsconfig each repo is type-checked with (its own; the root one unless the measured package
// has its own).
const TSCONFIG = {
  astro: "packages/astro/tsconfig.json",
  excalidraw: "tsconfig.json",
  hono: "tsconfig.json",
  "next.js": "packages/next/tsconfig.json",
  trpc: "tsconfig.json",
  ultracite: "packages/cli/tsconfig.json",
  vite: "packages/vite/tsconfig.base.json",
  vscode: "src/tsconfig.base.json",
  zod: "tsconfig.json",
};

const copyFiles = (root, files, dest) => {
  rmSync(dest, { force: true, recursive: true });
  for (const rel of files) {
    const to = join(dest, rel);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, readFileSync(join(root, rel)));
  }
};

const runFix = (linter, dir, files) => {
  if (linter === "oxlint") {
    lib.oxlintFix({
      configFile: lib.oxlintSortKeysConfig(CONFIG_DIR),
      cwd: dir,
      files,
    });
  } else {
    lib.biomeWrite({
      configDir: lib.biomeAssistConfig(CONFIG_DIR),
      cwd: dir,
      files,
    });
  }
};
const remaining = (linter, dir, files) =>
  linter === "oxlint"
    ? lib.runOxlint({
        configFile: lib.oxlintSortKeysConfig(CONFIG_DIR),
        cwd: dir,
        files,
      }).length
    : lib.runBiome({
        configDir: lib.biomeAssistConfig(CONFIG_DIR),
        cwd: dir,
        files,
      }).length;

const numstat = (a, b) => {
  const r = spawnSync("git", ["diff", "--no-index", "--numstat", "--", a, b], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  let added = 0;
  let removed = 0;
  let files = 0;
  for (const line of r.stdout.split("\n").filter(Boolean)) {
    const [x, y] = line.split("\t");
    added += Number(x);
    removed += Number(y);
    files++;
  }
  return { added, files, removed };
};

// ── comments in an object, before and after ────────────────────────────
const commentLayout = (node, text, comments) => {
  const sigs = lib.propSigs(node, text);
  const out = [];
  for (const c of comments) {
    if (c.range[0] < node.range[0] || c.range[1] > node.range[1]) {
      continue;
    }
    if (
      node.properties.some(
        (p) => c.range[0] >= p.range[0] && c.range[1] <= p.range[1]
      )
    ) {
      continue;
    }
    const before = [...node.properties]
      .reverse()
      .find((p) => p.range[1] <= c.range[0]);
    const afterIndex = node.properties.findIndex(
      (p) => p.range[0] >= c.range[1]
    );
    const sameLine =
      before && !text.slice(before.range[1], c.range[0]).includes("\n");
    let heads = null;
    // A heading: an own-line comment that isn't a JSDoc block (those document one key), above a
    // run of keys that ends at a blank line, another own-line comment or the object's end.
    if (!sameLine && afterIndex !== -1 && !lib.isJsdoc(c)) {
      // The keys this comment heads: from the next key until a blank line, another own-line
      // comment, or the end.
      heads = [];
      for (let i = afterIndex; i < node.properties.length; i++) {
        if (i > afterIndex) {
          const gap = text.slice(
            node.properties[i - 1].range[1],
            node.properties[i].range[0]
          );
          const ownLineComment = comments.some(
            (x) =>
              x.range[0] >= node.properties[i - 1].range[1] &&
              x.range[1] <= node.properties[i].range[0] &&
              text
                .slice(node.properties[i - 1].range[1], x.range[0])
                .includes("\n")
          );
          if (
            ownLineComment ||
            /\n[ \t]*\r?\n/.test(
              gap.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
            )
          ) {
            break;
          }
        }
        heads.push(sigs[i]);
      }
    }
    out.push({
      anchor: sameLine
        ? `after ${sigs[node.properties.indexOf(before)]}`
        : afterIndex !== -1
          ? `before ${sigs[afterIndex]}`
          : "at the end",
      heads,
      text: `${c.type === "Line" ? "//" : "/*"}${c.value}${c.type === "Line" ? "" : "*/"}`,
    });
  }
  return out;
};

// ── behaviour signs ────────────────────────────────────────────────────
const flips = (order) => {
  // order[slot] = original index; pos[i] = new slot of original index i
  const pos = [];
  order.forEach((orig, slot) => {
    pos[orig] = slot;
  });
  const out = [];
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      if (pos[i] > pos[j]) {
        out.push([i, j]);
      }
    }
  }
  return out;
};
const ORDER_SEEN = (l) => l.startsWith("order:");
const ESCAPES = (l) => l.startsWith("escape:") || l === "jsx:style";
const signsFor = (row, order) => {
  const k = row.keys;
  const f = flips(order);
  const isFn = (i) => ["function", "method", "get", "set"].includes(k[i].v);
  const contextSensitive = (i) =>
    ["function", "method"].includes(k[i].v) && (k[i].u ?? 0) > 0;
  const names = k.map((x) => x.e);
  // A getter and a setter with the same name are one accessor, not a duplicate.
  const plain = k.map((x, i) =>
    ["get", "set"].includes(x.v) ? null : names[i]
  );
  const dup =
    plain.filter((n, i) => n !== null && plain.indexOf(n) !== i).length > 0;
  const accessorPairs = names.some(
    (n, i) =>
      n !== null && ["get", "set"].includes(k[i].v) && names.indexOf(n) !== i
  );
  const cssFlips = row.cssPairs.filter(([a, b]) =>
    f.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  );
  // Package `exports`-style conditions: at least one of the conditions Node itself defines.
  const NODE_CONDITIONS = [
    "import",
    "require",
    "default",
    "module-sync",
    "node-addons",
  ];
  const conditionFlip =
    row.conditionKeys >= 2 &&
    names.some((n) => NODE_CONDITIONS.includes(n)) &&
    f.some(
      ([x, y]) =>
        names[x] &&
        names[y] &&
        [
          "import",
          "require",
          "default",
          "types",
          "node",
          "browser",
          "module",
          "development",
          "production",
          "worker",
          "deno",
          "bun",
          "react-server",
          "edge-light",
          "workerd",
        ].includes(names[x]) &&
        [
          "import",
          "require",
          "default",
          "types",
          "node",
          "browser",
          "module",
          "development",
          "production",
          "worker",
          "deno",
          "bun",
          "react-server",
          "edge-light",
          "workerd",
        ].includes(names[y])
    );
  const labels = row.flow;
  const signs = {
    accessorPairs,
    // Oxlint sorts with sort_unstable_by, which can swap keys that compare equal once a list is
    // longer than its small-sort threshold (calibration K52 / B06c: 23 keys).
    duplicateKeysOver20: dup && k.filter((x) => x.t !== "spread").length > 20,
    conditionKeys: conditionFlip,
    contextSensitiveCallbacks:
      f.some(([x, y]) => contextSensitive(x) && contextSensitive(y)) &&
      Boolean(
        row.callee ||
        labels.includes("escape:argument") ||
        labels.includes("nested")
      ),
    cssShorthand: cssFlips.length > 0,
    duplicateKeys: dup,
    effectAndEffect: f.some(([x, y]) => k[x].fx && k[y].fx),
    effectAndRead: f.some(
      ([x, y]) =>
        (k[x].fx && !k[y].fx && k[y].rd && !isFn(y)) ||
        (k[y].fx && !k[x].fx && k[x].rd && !isFn(x))
    ),
    firstMatch: labels.includes("order:first-match"),
    jsonSchemaOrShape: Boolean(row.jsonSchemaProperties || row.schemaShape),
    proto: names.includes("__proto__"),
    sortSpec: Boolean(row.sortSpec),
    spread: k.some((x) => x.t === "spread"),
  };
  const seen = labels.filter(ORDER_SEEN);
  const flow =
    seen.length > 0
      ? "order observed"
      : labels.some(ESCAPES)
        ? "escapes (uses not visible)"
        : labels.length === 0 ||
            labels.every(
              (l) =>
                l.startsWith("local:") ||
                l === "unused" ||
                l === "nested" ||
                l === "in-array"
            )
          ? "local, order not observed"
          : "other";
  return { flow, observed: seen, signs };
};

// ── per repo ───────────────────────────────────────────────────────────
const analyseRepo = (name) => {
  const { files } = lib.collect(name);
  const root = lib.repoMeta(name).root;
  const rows = lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`));
  const rowsByFile = new Map();
  for (const r of rows) {
    rowsByFile.set(r.file, [...(rowsByFile.get(r.file) ?? []), r]);
  }
  const orig = join(WORK, "original", name);
  copyFiles(root, files, orig);
  const out = {};
  for (const linter of LINTERS) {
    const dir = join(WORK, linter, name);
    copyFiles(root, files, dir);
    const t0 = Date.now();
    runFix(linter, dir, files);
    const left = remaining(linter, dir, files);
    // A second pass: does the fix converge?
    const before2 = files.map((f) => readFileSync(join(dir, f), "utf8"));
    runFix(linter, dir, files);
    const secondPassChanged = files.filter(
      (f, i) => readFileSync(join(dir, f), "utf8") !== before2[i]
    ).length;
    // Undo the second pass so what we measure is one `ultracite fix`.
    files.forEach((f, i) => writeFileSync(join(dir, f), before2[i]));
    const seconds = Math.round((Date.now() - t0) / 100) / 10;
    const diff = numstat(orig, dir);
    const objects = [];
    let parseErrors = 0;
    const parseErrorFiles = [];
    let changedFiles = 0;
    for (const rel of files) {
      const a = readFileSync(join(root, rel), "utf8");
      const b = readFileSync(join(dir, rel), "utf8");
      const fileRows = rowsByFile.get(rel) ?? [];
      if (a === b) {
        for (const r of fileRows) {
          if (linter === "oxlint" ? r.oxlintReport : r.biomeReport) {
            objects.push({
              file: rel,
              reported: true,
              rewritten: false,
              start: r.start,
              line: r.line,
            });
          }
        }
        continue;
      }
      changedFiles++;
      const A = lib.objectsByPath(a, rel);
      const B = lib.objectsByPath(b, rel);
      if (!B.objects) {
        parseErrors++;
        parseErrorFiles.push({ error: B.error, file: rel });
        continue;
      }
      const byStart = new Map(
        [...A.objects.entries()].map(([path, o]) => [o.start, { ...o, path }])
      );
      for (const r of fileRows) {
        const o = byStart.get(r.start);
        const reported = linter === "oxlint" ? r.oxlintReport : r.biomeReport;
        if (!o) {
          objects.push({
            error: "not found in the original parse",
            file: rel,
            start: r.start,
          });
          continue;
        }
        const after = B.objects.get(o.path);
        if (!after) {
          objects.push({
            error: "no counterpart after the fix",
            file: rel,
            line: r.line,
            reported,
            start: r.start,
          });
          continue;
        }
        const order = after.sigs.map((s) => o.sigs.indexOf(s));
        const rewritten = after.sigs.join("\n") !== o.sigs.join("\n");
        if (!rewritten && !reported) {
          continue;
        }
        const predicted = lib.predictedOrder(o.node, a, A.ast.comments, linter);
        const entry = {
          file: rel,
          line: r.line,
          predictedMatches: rewritten
            ? JSON.stringify(predicted) === JSON.stringify(order)
            : predicted === null || predicted.every((x, i) => x === i),
          reported,
          rewritten,
          start: r.start,
        };
        if (rewritten) {
          const before = commentLayout(o.node, a, A.ast.comments);
          const afterLayout = commentLayout(after.node, b, B.ast.comments);
          // Match each comment to the same text after the fix (the same anchor first, for
          // repeated comments); a comment whose text gained a trailing comma is one Oxlint's fix
          // moved the object's trailing comma into.
          const used = new Set();
          const comments = before.map((c) => {
            const pick = (pred) => {
              const i = afterLayout.findIndex(
                (x, k) => !used.has(k) && pred(x)
              );
              if (i !== -1) {
                used.add(i);
              }
              return i === -1 ? null : afterLayout[i];
            };
            const now =
              pick((x) => x.text === c.text && x.anchor === c.anchor) ??
              pick((x) => x.text === c.text);
            const commaInside = now
              ? null
              : pick(
                  (x) =>
                    x.text === `${c.text},` ||
                    x.text.replace(/,\s*$/, "") === c.text
                );
            const headsBefore = c.heads && c.heads.length >= 2 ? c.heads : null;
            return {
              anchorAfter:
                now?.anchor ??
                (commaInside
                  ? `${commaInside.anchor} (a comma moved into the comment)`
                  : "gone"),
              anchorBefore: c.anchor,
              commaMovedIn: Boolean(commaInside),
              headed: headsBefore,
              headsAfter: (now ?? commaInside)?.heads ?? null,
              text: c.text.slice(0, 100),
            };
          });
          // Spreads: does any key change the spread segment it sits in?
          const segment = (sigs) => {
            let s = 0;
            return sigs.map((x) => (x.startsWith("...") ? `s${++s}` : s));
          };
          const segBefore = segment(o.sigs);
          const segAfter = segment(after.sigs);
          const crossed = after.sigs.some(
            (s, i) =>
              !s.startsWith("...") &&
              segAfter[i] !== segBefore[o.sigs.indexOf(s)]
          );
          const blankBefore = r.blankGaps;
          let blankAfter = 0;
          for (let i = 1; i < after.node.properties.length; i++) {
            const gap = b.slice(
              after.node.properties[i - 1].range[1],
              after.node.properties[i].range[0]
            );
            if (
              /\n[ \t]*\r?\n/.test(
                gap.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
              )
            ) {
              blankAfter++;
            }
          }
          Object.assign(entry, {
            blankGaps: { after: blankAfter, before: blankBefore },
            comments,
            crossedSpread: crossed,
            keysAfter: after.sigs.slice(0, 30),
            keysBefore: o.sigs.slice(0, 30),
            lines: r.endLine - r.line + 1,
            n: r.n,
            ...signsFor(r, order),
          });
        } else if (reported) {
          entry.blocker = linter === "oxlint" ? r.oxlintBlocker : null;
        }
        objects.push(entry);
      }
    }
    // Every file still parses?
    for (const rel of files) {
      const b = readFileSync(join(dir, rel), "utf8");
      if (
        b !== readFileSync(join(root, rel), "utf8") &&
        !lib.safeParse(b, rel).ast &&
        !parseErrorFiles.some((p) => p.file === rel)
      ) {
        parseErrors++;
        parseErrorFiles.push({ file: rel });
      }
    }
    lib.writeJsonl(
      join(lib.OUT_DIR, "fixes", linter, `${name}.jsonl`),
      objects
    );
    out[linter] = {
      changedFiles,
      diff,
      left,
      objects,
      parseErrorFiles,
      parseErrors,
      secondPassChanged,
      seconds,
    };
    console.log(
      `${name} ${linter}: ${objects.filter((o) => o.rewritten).length} objects rewritten in ${changedFiles} files (+${diff.added} -${diff.removed} lines), ${objects.filter((o) => o.reported && !o.rewritten).length} reported and skipped, ${left} still reported, second pass changed ${secondPassChanged} files, ${parseErrors} parse errors, ${objects.filter((o) => o.rewritten && !o.predictedMatches).length} unpredicted (${seconds} s)`
    );
  }
  return out;
};

// ── type-check overlay ─────────────────────────────────────────────────
const typecheckOverlay = (name, overlayDir) => {
  const root = lib.repoMeta(name).root;
  const { files } = lib.collect(name);
  const configPath = join(root, TSCONFIG[name]);
  if (!existsSync(configPath)) {
    return { error: `no ${TSCONFIG[name]}` };
  }
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(configPath)
  );
  const options = {
    ...parsed.options,
    noEmit: true,
    incremental: false,
    composite: false,
    declaration: false,
    tsBuildInfoFile: undefined,
  };
  const overlay = new Map();
  if (overlayDir) {
    for (const rel of files) {
      overlay.set(join(root, rel), readFileSync(join(overlayDir, rel), "utf8"));
    }
  }
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  host.readFile = (f) => overlay.get(f) ?? readFile(f);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (f, lang, onError, shouldCreate) =>
    overlay.has(f)
      ? ts.createSourceFile(f, overlay.get(f), lang, true)
      : getSourceFile(f, lang, onError, shouldCreate);
  const program = ts.createProgram({
    host,
    options,
    rootNames: files.map((f) => join(root, f)),
  });
  const diags = ts.getPreEmitDiagnostics(program);
  return {
    diagnostics: diags.map((d) => ({
      code: d.code,
      file: d.file ? relative(root, d.file.fileName) : null,
      line: d.file
        ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
        : null,
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
    })),
  };
};
const UNRESOLVED = new Set([2307, 2688, 2875, 7016, 2792]);
// Diagnostics are matched by file and code. A fix that sorts an object literal also changes
// messages without changing what's wrong: TypeScript prints a type's properties in declaration
// order, and its excess-property check names the first unknown property in source order (with
// rollup's types unresolved, Vite's plugin objects report a different hook name after sorting).
// So a diagnostic counts as added only when a file has more of that code than before.
const newDiagnostics = (before, after) => {
  const key = (d) => `${d.file}|${d.code}`;
  const counts = new Map();
  for (const d of before) {
    counts.set(key(d), (counts.get(key(d)) ?? 0) + 1);
  }
  const added = [];
  for (const d of after) {
    const k = key(d);
    if ((counts.get(k) ?? 0) > 0) {
      counts.set(k, counts.get(k) - 1);
    } else {
      added.push(d);
    }
  }
  return added;
};
// Same file and code, different message: listed so the matching can be checked by hand.
const changedMessages = (before, after) => {
  const msgs = (ds) => ds.map((d) => `${d.file}|${d.code}|${d.message}`);
  const a = new Set(msgs(before));
  return after
    .filter((d) => !a.has(`${d.file}|${d.code}|${d.message}`))
    .map((d) => ({
      code: d.code,
      file: d.file,
      line: d.line,
      message: d.message.slice(0, 200),
    }));
};

// ── aggregate ──────────────────────────────────────────────────────────
const summarise = (objects) => {
  const rewritten = objects.filter((o) => o.rewritten);
  const skipped = objects.filter((o) => o.reported && !o.rewritten);
  const tally = (xs, f) =>
    xs.reduce((a, x) => {
      for (const k of [].concat(f(x))) {
        a[k] = (a[k] ?? 0) + 1;
      }
      return a;
    }, {});
  const comments = rewritten.flatMap((o) => o.comments);
  return {
    blankGroups: {
      kept: rewritten.filter(
        (o) =>
          o.blankGaps.before > 0 && o.blankGaps.after === o.blankGaps.before
      ).length,
      lost: rewritten.filter(
        (o) => o.blankGaps.before > 0 && o.blankGaps.after < o.blankGaps.before
      ).length,
      objectsWithBlankGroups: rewritten.filter((o) => o.blankGaps.before > 0)
        .length,
    },
    comments: {
      anchorChanged: comments.filter(
        (c) =>
          c.anchorAfter !== c.anchorBefore &&
          c.anchorAfter !== "gone" &&
          !c.commaMovedIn
      ).length,
      commaMovedIn: comments.filter((c) => c.commaMovedIn).length,
      gone: comments.filter((c) => c.anchorAfter === "gone").length,
      headingsSplit: comments.filter(
        (c) =>
          c.headed && JSON.stringify(c.headed) !== JSON.stringify(c.headsAfter)
      ).length,
      headings: comments.filter((c) => c.headed).length,
      inRewrittenObjects: comments.length,
      movedWithTheirKey: comments.filter(
        (c) => c.anchorAfter === c.anchorBefore
      ).length,
      objectsWithComments: rewritten.filter((o) => o.comments.length > 0)
        .length,
    },
    crossedSpread: rewritten.filter((o) => o.crossedSpread).length,
    errors: objects.filter((o) => o.error).length,
    flow: tally(rewritten, (o) => o.flow),
    observed: tally(rewritten, (o) => (o.observed.length ? o.observed : [])),
    reported: objects.filter((o) => o.reported).length,
    rewritten: rewritten.length,
    rewrittenNotReported: rewritten.filter((o) => !o.reported).length,
    signs: tally(rewritten, (o) =>
      Object.entries(o.signs)
        .filter(([, v]) => v)
        .map(([k]) => k)
    ),
    skipped: skipped.length,
    skippedBy: tally(skipped, (o) => o.blocker ?? "(none)"),
    unpredicted: rewritten.filter((o) => !o.predictedMatches).length,
  };
};

const main = () => {
  const repos = lib.selectedRepos();
  lib.checkPinned(repos);
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    repos: {},
    tools: lib.toolVersions(),
  };
  const pooled = {
    core: { biome: [], oxlint: [] },
    react: { biome: [], oxlint: [] },
  };
  for (const name of repos) {
    const r = analyseRepo(name);
    const entry = { set: lib.setOf(name), sha: lib.shaOf(name) };
    for (const linter of LINTERS) {
      const x = r[linter];
      entry[linter] = {
        changedFiles: x.changedFiles,
        lines: x.diff,
        parseErrorFiles: x.parseErrorFiles,
        parseErrors: x.parseErrors,
        secondPassChangedFiles: x.secondPassChanged,
        seconds: x.seconds,
        stillReportedAfter: x.left,
        ...summarise(x.objects),
      };
      if (pooled[entry.set]) {
        pooled[entry.set][linter].push(...x.objects);
      }
    }
    if (!lib.flag("skip-typecheck") && TSCONFIG[name]) {
      const t0 = Date.now();
      const base = typecheckOverlay(name, null);
      entry.typecheck = { tsconfig: TSCONFIG[name] };
      if (base.error) {
        entry.typecheck.error = base.error;
      } else {
        entry.typecheck.before = base.diagnostics.length;
        entry.typecheck.beforeUnresolved = base.diagnostics.filter((d) =>
          UNRESOLVED.has(d.code)
        ).length;
        for (const linter of LINTERS) {
          const after = typecheckOverlay(name, join(WORK, linter, name));
          const added = newDiagnostics(base.diagnostics, after.diagnostics);
          const removed = newDiagnostics(after.diagnostics, base.diagnostics);
          entry.typecheck[linter] = {
            added,
            after: after.diagnostics.length,
            messageChanged: changedMessages(
              base.diagnostics,
              after.diagnostics
            ),
            removed: removed.length,
          };
        }
      }
      console.log(
        `${name} typecheck: before ${entry.typecheck.before} (${entry.typecheck.beforeUnresolved} unresolved), oxlint +${entry.typecheck.oxlint?.added.length ?? "?"}, biome +${entry.typecheck.biome?.added.length ?? "?"} (${Math.round((Date.now() - t0) / 1000)} s)`
      );
    }
    result.repos[name] = entry;
  }
  result.pooled = {};
  for (const set of ["core", "react"]) {
    result.pooled[set] = {};
    for (const linter of LINTERS) {
      if (pooled[set][linter].length) {
        result.pooled[set][linter] = summarise(pooled[set][linter]);
      }
    }
  }
  if (repos.length === lib.ALL.length) {
    lib.writeJson(join(lib.RESULTS_DIR, "fixes.json"), result);
  } else {
    lib.writeJson(join(lib.OUT_DIR, "fixes-partial.json"), result);
  }
};

main();
void execFileSync;
