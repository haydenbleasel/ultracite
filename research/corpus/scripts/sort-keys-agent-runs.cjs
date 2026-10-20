// Object keys in the agent experiment's own committed runs: what Claude Code and Codex did to key
// order while fixing other rules for the earlier posts.
//
// Every run under research/agent-experiment/results/<topic>/runs/ and superseded-runs/, compared
// in up to three steps:
//   net      the subject before the run against the agent's final file (or tree)
//   agent    each attempt's input against the agent's own edit (attempt<k>/agent.*; the input of
//            attempt 1 is the subject, of attempt k the file verify left after attempt k-1)
//   verify   the agent's edit against what Ultracite's fix pass left (attempt<k>/verified.*), which
//            is where `oxlint --fix` sorts keys again
// For each step and file: sort-keys reports before and after (Oxlint's and ESLint's, from the
// reimplementation sort-keys-linters.cjs checks against the real rules), object literals added
// (a path that didn't exist before), and object literals reordered (same path and keys, another
// order), with whether the new order is sorted.
//
// Usage: node research/corpus/scripts/sort-keys-agent-runs.cjs
// Writes results/sort-keys/agent-runs.json.
"use strict";

const { existsSync, readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const RESULTS = join(lib.ULTRACITE, "research", "agent-experiment", "results");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;

const filesUnder = (dir) => {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]
  );
};
// A version of a subject: { relPath: text }.
const version = (runDir, base) => {
  const out = {};
  for (const ext of ["ts", "tsx"]) {
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

const reports = (text, rel) => {
  const { ast } = lib.safeParse(text, rel);
  if (!ast) {
    return null;
  }
  let oxlint = 0;
  let eslint = 0;
  let objects = 0;
  lib.walk(ast, (n) => {
    if (n.type !== "ObjectExpression") {
      return;
    }
    objects++;
    if (n.properties.length < 2) {
      return;
    }
    eslint += lib.descents(
      lib.groupsFor(n.properties, "eslint", text),
      lib.eslintCompare
    );
    if (
      lib.descents(
        lib.groupsFor(n.properties, "oxlint", text),
        lib.oxlintCompare
      ) > 0
    ) {
      oxlint++;
    }
  });
  return { eslint, objects, oxlint };
};

const compare = (before, after) => {
  const beforeAll = before;
  const out = {
    added: [],
    filesCompared: 0,
    reordered: [],
    reportsAfter: { eslint: 0, oxlint: 0 },
    reportsBefore: { eslint: 0, oxlint: 0 },
  };
  for (const [rel, b] of Object.entries(after)) {
    const a = before[rel];
    const rb = reports(b, rel);
    if (rb) {
      out.reportsAfter.eslint += rb.eslint;
      out.reportsAfter.oxlint += rb.oxlint;
    }
    if (a === undefined) {
      continue;
    }
    const ra = reports(a, rel);
    if (ra) {
      out.reportsBefore.eslint += ra.eslint;
      out.reportsBefore.oxlint += ra.oxlint;
    }
    if (a === b) {
      continue;
    }
    out.filesCompared++;
    const A = lib.objectsByPath(a, rel);
    const B = lib.objectsByPath(b, rel);
    if (!A.objects || !B.objects) {
      continue;
    }
    // Key sets that existed anywhere before (in any file of the subject), to tell an object the
    // agent moved (say into a new helper) from one it wrote.
    const seenKeys = new Set();
    for (const [r, t] of Object.entries(beforeAll)) {
      const X = lib.objectsByPath(t, r);
      for (const o of X.objects?.values() ?? []) {
        seenKeys.add([...o.sigs].sort().join("\n"));
      }
    }
    for (const [path, o] of B.objects) {
      const sorted =
        lib.descents(
          lib.groupsFor(o.node.properties, "oxlint", b),
          lib.oxlintCompare
        ) === 0;
      const prev = A.objects.get(path);
      if (!prev) {
        if (o.sigs.length >= 2) {
          out.added.push({
            file: rel,
            keys: o.sigs.slice(0, 12),
            line: o.node.loc.start.line,
            moved: seenKeys.has([...o.sigs].sort().join("\n")),
            sorted,
          });
        }
        continue;
      }
      const same =
        [...prev.sigs].sort().join("\n") === [...o.sigs].sort().join("\n");
      if (same && prev.sigs.join("\n") !== o.sigs.join("\n")) {
        out.reordered.push({
          after: o.sigs.slice(0, 12),
          before: prev.sigs.slice(0, 12),
          file: rel,
          line: o.node.loc.start.line,
          sortedAfter: sorted,
        });
      }
    }
  }
  return out;
};

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
      const steps = { net: compare(before, after) };
      const attempts = readdirSync(runDir)
        .filter((d) => /^attempt\d+$/.test(d))
        .sort((x, y) => Number(x.slice(7)) - Number(y.slice(7)));
      let input = before;
      steps.attempts = attempts.map((a) => {
        const agent = version(join(runDir, a), "agent");
        const verified = version(join(runDir, a), "verified");
        const r = {
          agent: compare(input, agent),
          attempt: a,
          verify: Object.keys(verified).length
            ? compare(agent, verified)
            : null,
        };
        if (Object.keys(verified).length) {
          input = verified;
        }
        return r;
      });
      runs.push({
        agent: meta.agent ?? /(claude|codex)/.exec(id)?.[1] ?? null,
        group,
        id,
        steps,
        subject: meta.subject ?? null,
        topic,
      });
    }
  }
}

const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
const agentSteps = (r) =>
  r.steps.attempts.length
    ? r.steps.attempts.map((a) => a.agent)
    : [r.steps.net];
const summary = {};
for (const r of runs) {
  const key = `${r.topic} · ${r.agent ?? "?"}${r.group === "superseded-runs" ? " (superseded)" : ""}`;
  (summary[key] ??= []).push(r);
}
const summarise = (rs) => ({
  agentEditsAddedObjects: sum(rs, (r) =>
    sum(agentSteps(r), (s) => s.added.length)
  ),
  agentEditsAddedUnsorted: sum(rs, (r) =>
    sum(agentSteps(r), (s) => s.added.filter((x) => !x.sorted).length)
  ),
  agentEditsMovedObjects: sum(rs, (r) =>
    sum(agentSteps(r), (s) => s.added.filter((x) => x.moved).length)
  ),
  agentEditsNewObjects: sum(rs, (r) =>
    sum(agentSteps(r), (s) => s.added.filter((x) => !x.moved).length)
  ),
  agentEditsNewUnsorted: sum(rs, (r) =>
    sum(
      agentSteps(r),
      (s) => s.added.filter((x) => !x.moved && !x.sorted).length
    )
  ),
  runsWithNewUnsorted: rs.filter((r) =>
    agentSteps(r).some((s) => s.added.some((x) => !x.moved && !x.sorted))
  ).length,
  agentEditsReordered: sum(rs, (r) =>
    sum(agentSteps(r), (s) => s.reordered.length)
  ),
  agentEditsReorderedToSorted: sum(rs, (r) =>
    sum(agentSteps(r), (s) => s.reordered.filter((x) => x.sortedAfter).length)
  ),
  netOxlintReportsAfter: sum(rs, (r) => r.steps.net.reportsAfter.oxlint),
  netOxlintReportsBefore: sum(rs, (r) => r.steps.net.reportsBefore.oxlint),
  runs: rs.length,
  runsReordering: rs.filter((r) =>
    agentSteps(r).some((s) => s.reordered.length > 0)
  ).length,
  verifyReordered: sum(rs, (r) =>
    sum(r.steps.attempts, (a) => a.verify?.reordered.length ?? 0)
  ),
});
const result = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Reports are the reimplementation of Oxlint's and ESLint's sort-keys (checked against the real rules on the corpus). 'agent' steps are the agents' own edits (attempt<k>/agent.*, or the net diff for runs without attempts); 'verify' is Ultracite's fix pass after an attempt. Subjects in the accessibility and todo-comments topics were normalised with the fix passes first, so their keys were already sorted where Oxlint's fix could sort them.",
  runs,
  summary: Object.fromEntries(
    Object.entries(summary).map(([k, rs]) => [k, summarise(rs)])
  ),
  totals: {
    ...summarise(runs),
    runsByAgent: runs.reduce(
      (a, r) => ({ ...a, [r.agent]: (a[r.agent] ?? 0) + 1 }),
      {}
    ),
  },
};
lib.writeJson(join(lib.RESULTS_DIR, "agent-runs.json"), result);
console.log(JSON.stringify(result.totals, null, 1));
for (const [k, v] of Object.entries(result.summary)) {
  console.log(k, JSON.stringify(v));
}
