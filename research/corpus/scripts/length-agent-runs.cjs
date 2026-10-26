// Agents and length in our own data: every committed agent-experiment run (research/
// agent-experiment/results/<topic>/runs/ and superseded-runs/), measured before and after with the
// census (length-lib.cjs `measure`): each function's lines, statements, parameters, block depth
// and cognitive complexity, the functions agents added (helpers) and removed, and whether an edit
// pushed a function over or under the length limits' defaults. Compared net (the subject as
// handed over against the final file) and attempt by attempt where a run has attempts (each
// attempt's input against the agent's own edit, attempt<k>/agent.*).
//
// Functions are matched by name and kind in document order (an LCS), so a function the agent
// renamed counts as removed and added.
//
// Usage: node research/corpus/scripts/length-agent-runs.cjs
// Writes results/length-limits/agent-runs.json.
"use strict";

const { existsSync, readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");

const lib = require("./length-lib.cjs");

const RESULTS = join(lib.ULTRACITE, "research", "agent-experiment", "results");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const LIMITS = { depth: 4, lines: 50, params: 3, statements: 10 };

const filesUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]
      )
    : [];
const version = (runDir, base) => {
  const out = {};
  for (const ext of ["ts", "tsx", "js", "mjs"]) {
    const f = join(runDir, `${base}.${ext}`);
    if (existsSync(f) && statSync(f).isFile()) {
      out[`subject.${ext}`] = readFileSync(f, "utf8");
    }
  }
  const dir = join(runDir, base);
  if (existsSync(dir) && statSync(dir).isDirectory()) {
    for (const f of filesUnder(dir).filter((x) => SOURCE.test(x))) {
      out[relative(dir, f)] = readFileSync(f, "utf8");
    }
  }
  return out;
};

const cache = new Map();
const fnsOf = (text, rel) => {
  const key = `${rel}\u0000${text}`;
  if (!cache.has(key)) {
    const m = lib.measure(
      text,
      rel.endsWith(".tsx") || rel.endsWith(".jsx")
        ? rel
        : rel.replace(/\.[^.]+$/, ".ts").replace(/^subject\.ts$/, "subject.ts")
    );
    cache.set(
      key,
      m.error
        ? null
        : m.functions.map((f) => ({
            cognitive: f.cognitive,
            depth: f.maxDepth,
            kind: f.kind,
            lines: f.lines,
            name: f.name,
            nested: f.depth,
            params: f.paramsEslint,
            statements: f.statements,
          }))
    );
  }
  return cache.get(key);
};

const align = (a, b) => {
  const k = (f) => `${f.name}|${f.kind}`;
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] =
        k(a[i]) === k(b[j])
          ? L[i + 1][j + 1] + 1
          : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const pairs = [];
  const added = [];
  const removed = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (
      i < n &&
      j < m &&
      k(a[i]) === k(b[j]) &&
      L[i][j] === L[i + 1][j + 1] + 1
    ) {
      pairs.push([a[i], b[j]]);
      i++;
      j++;
    } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) {
      added.push(b[j]);
      j++;
    } else {
      removed.push(a[i]);
      i++;
    }
  }
  return { added, pairs, removed };
};

const compare = (before, after) => {
  const out = {
    added: [],
    changed: [],
    fileLines: [0, 0],
    functions: [0, 0],
    over: {},
    parseErrors: 0,
    removed: [],
  };
  for (const [rel, b] of Object.entries(after)) {
    const a = before[rel] ?? "";
    const fa = fnsOf(a, rel) ?? [];
    const fb = fnsOf(b, rel);
    if (!fb) {
      out.parseErrors++;
      continue;
    }
    out.fileLines[0] += a ? a.split("\n").length : 0;
    out.fileLines[1] += b.split("\n").length;
    out.functions[0] += fa.length;
    out.functions[1] += fb.length;
    for (const [field, t] of Object.entries(LIMITS)) {
      out.over[field] ??= [0, 0];
      out.over[field][0] += fa.filter((f) => f[field] > t).length;
      out.over[field][1] += fb.filter((f) => f[field] > t).length;
    }
    if (a === b) {
      continue;
    }
    const al = align(fa, fb);
    out.added.push(...al.added.map((f) => ({ ...f, file: rel })));
    out.removed.push(...al.removed.map((f) => ({ ...f, file: rel })));
    for (const [x, y] of al.pairs) {
      if (
        x.lines !== y.lines ||
        x.statements !== y.statements ||
        x.params !== y.params ||
        x.depth !== y.depth ||
        x.cognitive !== y.cognitive
      ) {
        out.changed.push({
          after: {
            cognitive: y.cognitive,
            depth: y.depth,
            lines: y.lines,
            params: y.params,
            statements: y.statements,
          },
          before: {
            cognitive: x.cognitive,
            depth: x.depth,
            lines: x.lines,
            params: x.params,
            statements: x.statements,
          },
          file: rel,
          kind: x.kind,
          name: x.name,
        });
      }
    }
  }
  // crossings of the limits among matched functions
  out.crossed = {};
  for (const [field, t] of Object.entries(LIMITS)) {
    out.crossed[field] = {
      over: out.changed.filter(
        (c) => c.before[field] <= t && c.after[field] > t
      ).length,
      under: out.changed.filter(
        (c) => c.before[field] > t && c.after[field] <= t
      ).length,
    };
  }
  out.helpersOver = Object.fromEntries(
    Object.entries(LIMITS).map(([field, t]) => [
      field,
      out.added.filter((f) => f[field] > t).length,
    ])
  );
  return out;
};

const main = () => {
  const runs = [];
  for (const topic of readdirSync(RESULTS).sort()) {
    for (const group of ["runs", "superseded-runs"]) {
      const dir = join(RESULTS, topic, group);
      if (!existsSync(dir)) {
        continue;
      }
      for (const id of readdirSync(dir).sort()) {
        const runDir = join(dir, id);
        if (!statSync(runDir).isDirectory()) {
          continue;
        }
        const meta = existsSync(join(runDir, "meta.json"))
          ? JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"))
          : {};
        const before = version(runDir, "before");
        const after = version(runDir, "after");
        const attempts = readdirSync(runDir)
          .filter((d) => /^attempt\d+$/.test(d))
          .sort((x, y) => Number(x.slice(7)) - Number(y.slice(7)));
        const steps = [];
        let input = before;
        for (const at of attempts) {
          const agent = version(join(runDir, at), "agent");
          const verified = version(join(runDir, at), "verified");
          if (Object.keys(agent).length) {
            steps.push({ attempt: at, ...compare(input, agent) });
          }
          if (Object.keys(verified).length) {
            input = verified;
          }
        }
        runs.push({
          agent: meta.agent ?? /(claude|codex)/.exec(id)?.[1] ?? null,
          attempts: steps,
          group,
          id,
          net: compare(before, after),
          subject: meta.subject ?? null,
          topic,
        });
      }
    }
  }
  const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
  const summarise = (rs) => {
    const changed = rs.flatMap((r) => r.net.changed);
    const added = rs.flatMap((r) => r.net.added);
    const median = (xs) => lib.quantile(Float64Array.from(xs).sort(), 0.5);
    return {
      changedFunctions: changed.length,
      crossed: Object.fromEntries(
        Object.keys(LIMITS).map((field) => [
          field,
          {
            over: sum(rs, (r) => r.net.crossed[field].over),
            under: sum(rs, (r) => r.net.crossed[field].under),
          },
        ])
      ),
      fileLines: [
        sum(rs, (r) => r.net.fileLines[0]),
        sum(rs, (r) => r.net.fileLines[1]),
      ],
      functions: [
        sum(rs, (r) => r.net.functions[0]),
        sum(rs, (r) => r.net.functions[1]),
      ],
      helpersAdded: added.length,
      helpersAddedMedianLines: added.length
        ? median(added.map((f) => f.lines))
        : null,
      helpersAddedMedianParams: added.length
        ? median(added.map((f) => f.params))
        : null,
      helpersAddedParams: lib.countBy(added, (f) => f.params),
      helpersOver: Object.fromEntries(
        Object.keys(LIMITS).map((field) => [
          field,
          sum(rs, (r) => r.net.helpersOver[field]),
        ])
      ),
      over: Object.fromEntries(
        Object.keys(LIMITS).map((field) => [
          field,
          [
            sum(rs, (r) => r.net.over[field]?.[0] ?? 0),
            sum(rs, (r) => r.net.over[field]?.[1] ?? 0),
          ],
        ])
      ),
      parseErrors: sum(rs, (r) => r.net.parseErrors),
      removedFunctions: sum(rs, (r) => r.net.removed.length),
      runs: rs.length,
      runsAddingHelpers: rs.filter((r) => r.net.added.length > 0).length,
    };
  };
  const byTopic = {};
  for (const topic of [...new Set(runs.map((r) => r.topic))]) {
    const rs = runs.filter((r) => r.topic === topic && r.group === "runs");
    byTopic[topic] = {
      all: summarise(rs),
      claude: summarise(rs.filter((r) => r.agent === "claude")),
      codex: summarise(rs.filter((r) => r.agent === "codex")),
      superseded: summarise(
        runs.filter((r) => r.topic === topic && r.group !== "runs")
      ),
    };
  }
  // the cognitive-complexity topic: what reducing complexity did to the subject function
  const cc = runs.filter(
    (r) => r.topic === "cognitive-complexity" && r.group === "runs"
  );
  const ccSubjects = cc.map((r) => {
    const biggest = (fs) => [...fs].sort((a, b) => b.lines - a.lines)[0];
    const subjectBefore = r.net.changed.length
      ? r.net.changed.sort((a, b) => b.before.lines - a.before.lines)[0]
      : null;
    return {
      added: r.net.added.map((f) => ({
        cognitive: f.cognitive,
        lines: f.lines,
        name: f.name,
        params: f.params,
        statements: f.statements,
      })),
      agent: r.agent,
      fileLines: r.net.fileLines,
      functions: r.net.functions,
      id: r.id,
      subject: subjectBefore,
      subjectId: r.subject,
      void: biggest,
    };
  });
  lib.writeJson(join(lib.RESULTS_DIR, "agent-runs.json"), {
    byTopic,
    cognitiveComplexityRuns: ccSubjects.map(({ void: _v, ...x }) => x),
    generated: new Date().toISOString(),
    limits: LIMITS,
    note: "Every committed run, net (subject before the run against the final file). `over` counts functions over each default limit before and after (lines: max-lines-per-function 50; statements: max-statements 10; params: max-params 3; depth: max-depth 4); `crossed` counts matched functions an edit took over or under a limit; `helpersAdded` are functions in the final file with no match before (by name and kind, so a renamed function counts as removed and added). Superseded runs (pilots, runs made before a harness fix) are summarised apart and not in `all`.",
    runs: runs.map((r) => ({
      agent: r.agent,
      attempts: r.attempts.map((a) => ({
        added: a.added.length,
        attempt: a.attempt,
        changed: a.changed.length,
        crossed: a.crossed,
        removed: a.removed.length,
      })),
      group: r.group,
      id: r.id,
      net: {
        added: r.net.added,
        changed: r.net.changed,
        crossed: r.net.crossed,
        fileLines: r.net.fileLines,
        functions: r.net.functions,
        over: r.net.over,
        parseErrors: r.net.parseErrors,
        removed: r.net.removed,
      },
      subject: r.subject,
      topic: r.topic,
    })),
    totals: {
      claude: runs.filter((r) => r.group === "runs" && r.agent === "claude")
        .length,
      codex: runs.filter((r) => r.group === "runs" && r.agent === "codex")
        .length,
      runs: runs.filter((r) => r.group === "runs").length,
      superseded: runs.filter((r) => r.group !== "runs").length,
    },
  });
  for (const [t, v] of Object.entries(byTopic)) {
    console.log(
      t,
      JSON.stringify({
        runs: v.all.runs,
        helpers: v.all.helpersAdded,
        runsAddingHelpers: v.all.runsAddingHelpers,
        fn: v.all.functions,
        lines: v.all.fileLines,
        crossed: v.all.crossed,
        over: v.all.over,
      })
    );
  }
};

main();
