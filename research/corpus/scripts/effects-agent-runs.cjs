// Hooks and effects in the agent experiment's own committed runs: what Claude Code and Codex did to
// effects and dependency arrays while fixing other rules for the earlier posts.
//
// Every run under research/agent-experiment/results/<topic>/runs/ and superseded-runs/, compared
// as sort-keys-agent-runs.cjs compares them: the subject before the run against the final file
// (net), and each attempt's input against the agent's own edit (attempt<k>/agent.*). For each step
// and file: hooks before and after by kind (effects, memos, callbacks, custom), hooks added,
// removed, and whose dependency array changed (matched by name and order), and the dependency
// rule's diagnostics before and after: ESLint's react-hooks/exhaustive-deps (the react block on
// every file) and Oxlint's react/exhaustive-deps, run on copies under TMP.
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/effects-agent-runs.cjs
// Writes results/react-effects/agent-runs.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative } = require("node:path");

const lib = require("./effects-lib.cjs");

const RESULTS = join(lib.ULTRACITE, "research", "agent-experiment", "results");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const WORK = join(lib.TMP, "agent-runs");

const filesUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]
      )
    : [];
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

// Lint every distinct text once (keyed by content), with both dependency rules.
const cache = new Map();
let reactOnTs = null;
const oxConfig = () =>
  lib.writeOxlintOnly(
    join(lib.TMP, "configs", "agent-runs"),
    "exhaustive-deps",
    {
      "react/exhaustive-deps": "error",
    }
  );
const lintTexts = async (entries) => {
  // entries: [{ key, rel, text }]
  const todo = entries.filter((e) => !cache.has(e.key));
  if (todo.length === 0) {
    return;
  }
  mkdirSync(WORK, { recursive: true });
  const files = [];
  todo.forEach((e, i) => {
    const rel = join(String(i), e.rel.replace(/^.*\//, ""));
    const abs = join(WORK, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, e.text);
    files.push({ e, rel });
  });
  reactOnTs ??= await lib.eslintReactOnAllFiles();
  const es = await lib.runEslint({
    cwd: WORK,
    extra: reactOnTs,
    files: files.map((f) => f.rel),
    keep: (r) => r === "react-hooks/exhaustive-deps",
  });
  const ox = lib.runOxlint({
    configFile: oxConfig(),
    cwd: WORK,
    files: files.map((f) => f.rel),
    keep: (r) => r === "react/exhaustive-deps",
  });
  for (const { e, rel } of files) {
    cache.set(e.key, {
      eslint: es.filter(
        (d) => d.file === rel && d.rule === "react-hooks/exhaustive-deps"
      ).length,
      oxlint: ox.filter((d) => d.file.replace(/^\.\//, "") === rel).length,
    });
  }
};
const key = (text) =>
  require("node:crypto").createHash("sha1").update(text).digest("hex");

const hooksOf = (text, rel) => {
  const { rows, error } = lib.analyse(text, rel);
  return error ? null : rows;
};
const align = (a, b) => {
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] =
        a[i].name === b[j].name
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
      a[i].name === b[j].name &&
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
const kindCounts = (hs) =>
  lib.countBy(hs ?? [], (h) => (h.kind === "memo" ? h.name : h.kind));

// Every hook call of any kind (useX(…)), by name: the experiment's React subjects call custom hooks
// that take no dependency array.
const HOOK_CALL = /\buse[A-Z]\w*(?=\s*\()/g;
const allHookCalls = (v) =>
  Object.values(v).reduce((o, t) => {
    for (const m of t.match(HOOK_CALL) ?? []) {
      o[m] = (o[m] ?? 0) + 1;
    }
    return o;
  }, {});
const compare = (before, after) => {
  const out = {
    added: [],
    allHookCallsAfter: allHookCalls(after),
    allHookCallsBefore: allHookCalls(before),
    depsChanged: [],
    files: 0,
    hooksAfter: {},
    hooksBefore: {},
    removed: [],
  };
  for (const [rel, b] of Object.entries(after)) {
    const a = before[rel] ?? "";
    out.files++;
    const ha = hooksOf(a, rel) ?? [];
    const hb = hooksOf(b, rel) ?? [];
    for (const [k, v] of Object.entries(kindCounts(ha))) {
      out.hooksBefore[k] = (out.hooksBefore[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(kindCounts(hb))) {
      out.hooksAfter[k] = (out.hooksAfter[k] ?? 0) + v;
    }
    if (a === b) {
      continue;
    }
    const al = align(ha, hb);
    out.added.push(
      ...al.added.map((h) => ({
        deps: h.deps.map((d) => d.text),
        file: rel,
        kind: h.kind,
        line: h.line,
        name: h.name,
      }))
    );
    out.removed.push(
      ...al.removed.map((h) => ({
        deps: h.deps.map((d) => d.text),
        file: rel,
        kind: h.kind,
        line: h.line,
        name: h.name,
      }))
    );
    for (const [x, y] of al.pairs) {
      const dx = `${x.depsForm}:${x.deps.map((d) => d.text).join(",")}`;
      const dy = `${y.depsForm}:${y.deps.map((d) => d.text).join(",")}`;
      if (dx !== dy) {
        out.depsChanged.push({
          after: y.deps.map((d) => d.text),
          before: x.deps.map((d) => d.text),
          file: rel,
          kind: x.kind,
          name: x.name,
        });
      }
    }
  }
  return out;
};

const main = async () => {
  const runs = [];
  const toLint = [];
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
          steps.push({ agent, attempt: at, input });
          if (Object.keys(verified).length) {
            input = verified;
          }
        }
        if (steps.length === 0) {
          steps.push({ agent: after, attempt: "net", input: before });
        }
        for (const v of [before, after, ...steps.map((s) => s.agent)]) {
          for (const [rel, text] of Object.entries(v)) {
            toLint.push({ key: key(text), rel, text });
          }
        }
        runs.push({
          after,
          agent: meta.agent ?? /(claude|codex)/.exec(id)?.[1] ?? null,
          before,
          group,
          id,
          steps,
          subject: meta.subject ?? null,
          topic,
        });
      }
    }
  }
  // lint each distinct text once
  const uniq = [...new Map(toLint.map((e) => [e.key, e])).values()];
  for (let i = 0; i < uniq.length; i += 200) {
    await lintTexts(uniq.slice(i, i + 200));
  }
  const diag = (v) => {
    const out = { eslint: 0, oxlint: 0 };
    for (const t of Object.values(v)) {
      const c = cache.get(key(t));
      out.eslint += c?.eslint ?? 0;
      out.oxlint += c?.oxlint ?? 0;
    }
    return out;
  };
  const rows = runs.map((r) => ({
    agent: r.agent,
    attempts: r.steps.map((s) => ({
      attempt: s.attempt,
      ...compare(s.input, s.agent),
      diagnosticsAfter: diag(s.agent),
      diagnosticsBefore: diag(s.input),
    })),
    group: r.group,
    id: r.id,
    net: {
      ...compare(r.before, r.after),
      diagnosticsAfter: diag(r.after),
      diagnosticsBefore: diag(r.before),
    },
    subject: r.subject,
    topic: r.topic,
  }));
  const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
  const summarise = (rs) => ({
    agentEditsAddedEffects: sum(rs, (r) =>
      sum(r.attempts, (a) => a.added.filter((h) => h.kind === "effect").length)
    ),
    agentEditsAddedHooks: sum(rs, (r) =>
      sum(r.attempts, (a) => a.added.length)
    ),
    agentEditsChangedDeps: sum(rs, (r) =>
      sum(r.attempts, (a) => a.depsChanged.length)
    ),
    agentEditsRemovedEffects: sum(rs, (r) =>
      sum(
        r.attempts,
        (a) => a.removed.filter((h) => h.kind === "effect").length
      )
    ),
    agentEditsRemovedHooks: sum(rs, (r) =>
      sum(r.attempts, (a) => a.removed.length)
    ),
    depRuleAfter: {
      eslint: sum(rs, (r) => r.net.diagnosticsAfter.eslint),
      oxlint: sum(rs, (r) => r.net.diagnosticsAfter.oxlint),
    },
    depRuleBefore: {
      eslint: sum(rs, (r) => r.net.diagnosticsBefore.eslint),
      oxlint: sum(rs, (r) => r.net.diagnosticsBefore.oxlint),
    },
    hooksAfter: rs.reduce((o, r) => {
      for (const [k, v] of Object.entries(r.net.hooksAfter)) {
        o[k] = (o[k] ?? 0) + v;
      }
      return o;
    }, {}),
    hooksBefore: rs.reduce((o, r) => {
      for (const [k, v] of Object.entries(r.net.hooksBefore)) {
        o[k] = (o[k] ?? 0) + v;
      }
      return o;
    }, {}),
    allHookCallsAfter: rs.reduce((o, r) => {
      for (const [k, v] of Object.entries(r.net.allHookCallsAfter)) {
        o[k] = (o[k] ?? 0) + v;
      }
      return o;
    }, {}),
    allHookCallsBefore: rs.reduce((o, r) => {
      for (const [k, v] of Object.entries(r.net.allHookCallsBefore)) {
        o[k] = (o[k] ?? 0) + v;
      }
      return o;
    }, {}),
    runsAddingHookCalls: rs.filter((r) =>
      r.attempts.some((a) =>
        Object.entries(a.allHookCallsAfter).some(
          ([k, v]) => v > (a.allHookCallsBefore[k] ?? 0)
        )
      )
    ).length,
    runs: rs.length,
    runsWithHooksBefore: rs.filter(
      (r) => Object.keys(r.net.hooksBefore).length > 0
    ).length,
    runsWithHookChanges: rs.filter((r) =>
      r.attempts.some(
        (a) => a.added.length + a.removed.length + a.depsChanged.length > 0
      )
    ).length,
  });
  const groups = {};
  for (const r of rows) {
    const k = `${r.topic} · ${r.agent ?? "?"}${r.group === "superseded-runs" ? " (superseded)" : ""}`;
    (groups[k] ??= []).push(r);
  }
  const byTopic = {};
  for (const r of rows) {
    (byTopic[r.topic] ??= []).push(r);
  }
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Hooks from effects-lib.cjs analyse (every built-in dependency hook and custom hooks with an array). 'attempts' are the agents' own edits (attempt<k>/agent.* against the attempt's input), or the net diff for runs without attempts. Dependency-rule diagnostics are ESLint's react-hooks/exhaustive-deps with the react block on every file and Oxlint's react/exhaustive-deps, on copies.",
    rows: rows.map((r) => ({
      ...r,
      attempts: r.attempts.map((a) => ({ ...a })),
    })),
    summary: Object.fromEntries(
      Object.entries(groups).map(([k, rs]) => [k, summarise(rs)])
    ),
    byTopic: Object.fromEntries(
      Object.entries(byTopic).map(([k, rs]) => [k, summarise(rs)])
    ),
    totals: {
      ...summarise(rows),
      runsByAgent: lib.countBy(rows, (r) => r.agent),
    },
    tools: lib.toolVersions(),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "agent-runs.json"), result);
  console.log(JSON.stringify(result.totals, null, 1));
  for (const [k, v] of Object.entries(result.byTopic)) {
    console.log(k, JSON.stringify(v));
  }
};
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
