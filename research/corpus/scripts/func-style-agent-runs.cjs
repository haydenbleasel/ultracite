// Agents and function style in our own data: every committed agent-experiment run (research/
// agent-experiment/results/<topic>/runs/ and superseded-runs/), measured with the census
// (func-style-lib.cjs `inventory`) on the subject as handed over and on the final file:
//
//   functions   named functions the agent added (a name and form not there before), rewrote (the
//               same name in another form) or removed; each added one's form; whether it matches
//               the file's existing style (the majority form of its module-level named functions:
//               declarations or variable-bound functions); and, for module-level helpers, whether
//               the agent put them above or below the functions that call them
//   reports     func-style (Ultracite's options) and no-use-before-define (Ultracite's ESLint
//               choice per file type) before and after, from the same ESLint pass
//   retries     for topics run through Ultracite's retry loop, every retry prompt
//               (attempt<k>/prompt.txt, k > 1): the issues it lists by rule, and whether
//               func-style or no-use-before-define is among them or makes up all of them
//
// Usage: node research/corpus/scripts/func-style-agent-runs.cjs
// Writes results/func-style/agent-runs.json.
"use strict";

const { existsSync, readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");

const lib = require("./func-style-lib.cjs");

const RESULTS = join(lib.ULTRACITE, "research", "agent-experiment", "results");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const TOPIC_RULES = new Set(["func-style", "no-use-before-define"]);

const filesUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]
      )
    : [];
// a version of the subject: `before.ts` (one file) or `before/` (several)
const version = (runDir, base) => {
  const out = {};
  for (const ext of ["ts", "tsx", "js", "mjs", "jsx"]) {
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
const named = (inv) =>
  (inv.fns ?? []).filter(
    (f) =>
      f.name && (f.type === "FunctionDeclaration" || lib.isVarBound(f.form))
  );
const kindOf = (f) =>
  f.type === "FunctionDeclaration" ? "declaration" : "expression";
const styleOf = (inv) => {
  const mod = named(inv).filter((f) => f.scope === "module");
  const d = mod.filter((f) => kindOf(f) === "declaration").length;
  const e = mod.length - d;
  if (mod.length === 0) {
    return "none";
  }
  return d > e ? "declaration" : e > d ? "expression" : "tie";
};
const reports = (inv, rel) => {
  const ubdRule = lib.ultraciteUbdRule(rel);
  return {
    funcStyle: (inv.eslint ?? []).filter((m) => m.rule === "func-style").length,
    ubd: (inv.eslint ?? []).filter((m) => m.rule === ubdRule).length,
  };
};

const measureFile = (rel, beforeText, afterText) => {
  const r = rel.replace(/^subject\./, "subject.");
  const b = beforeText ? lib.inventory(beforeText, r) : { fns: [] };
  const a = afterText ? lib.inventory(afterText, r) : { fns: [] };
  if (b.error || a.error) {
    return { error: b.error ?? a.error, file: rel };
  }
  const key = (f) => `${f.name}|${kindOf(f)}`;
  const bNames = new Map(named(b).map((f) => [f.name, f]));
  const bKeys = new Set(named(b).map(key));
  const aKeys = new Set(named(a).map(key));
  const style = styleOf(b);
  const added = [];
  const rewritten = [];
  for (const f of named(a)) {
    if (bKeys.has(key(f))) {
      continue;
    }
    const prev = bNames.get(f.name);
    if (prev) {
      rewritten.push({ from: prev.form, name: f.name, to: f.form });
      continue;
    }
    // where the agent put it, relative to its callers (module-level helpers only)
    const callers = (a.edges ?? []).filter((e) => e.to === f.name);
    added.push({
      form: f.form,
      kind: kindOf(f),
      lines: f.lines,
      matchesStyle:
        style === "none" || style === "tie" ? null : style === kindOf(f),
      name: f.name,
      placement:
        f.scope !== "module" || callers.length === 0
          ? null
          : callers.every((e) => e.dir === "up")
            ? "above-callers"
            : callers.every((e) => e.dir === "down")
              ? "below-callers"
              : "mixed",
      scope: f.scope,
    });
  }
  const removed = named(b)
    .filter(
      (f) => !aKeys.has(key(f)) && !named(a).some((g) => g.name === f.name)
    )
    .map((f) => ({ form: f.form, name: f.name }));
  return {
    added,
    after: reports(a, r),
    before: reports(b, r),
    file: rel,
    removed,
    rewritten,
    style,
  };
};

const retryStats = (runDir) => {
  const attempts = existsSync(runDir)
    ? readdirSync(runDir)
        .filter((d) => /^attempt\d+$/.test(d))
        .sort((x, y) => Number(x.slice(7)) - Number(y.slice(7)))
    : [];
  const out = [];
  for (const d of attempts.slice(1)) {
    const p = join(runDir, d, "prompt.txt");
    if (!existsSync(p)) {
      continue;
    }
    const rules = [
      ...readFileSync(p, "utf8").matchAll(
        /^\d+\. line \d+, col \d+ — ([^:]+):/gm
      ),
    ].map((m) => m[1].trim());
    const byRule = rules.reduce((o, r) => ({ ...o, [r]: (o[r] ?? 0) + 1 }), {});
    out.push({
      attempt: Number(d.slice(7)),
      byRule,
      funcStyle: byRule["func-style"] ?? 0,
      issues: rules.length,
      onlyTopicRules:
        rules.length > 0 && rules.every((r) => TOPIC_RULES.has(r)),
      topicRules: rules.some((r) => TOPIC_RULES.has(r)),
      ubd: byRule["no-use-before-define"] ?? 0,
    });
  }
  return { attempts: attempts.length, retries: out };
};

const main = () => {
  const runs = [];
  for (const topic of readdirSync(RESULTS)
    .filter((t) => statSync(join(RESULTS, t)).isDirectory())
    .sort()) {
    for (const kind of ["runs", "superseded-runs"]) {
      const dir = join(RESULTS, topic, kind);
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
        const files = [
          ...new Set([...Object.keys(before), ...Object.keys(after)]),
        ].sort();
        const measured = files.map((f) =>
          measureFile(f, before[f] ?? null, after[f] ?? null)
        );
        const agent =
          meta.agent ??
          (/-claude-|claude/.test(id)
            ? "claude"
            : /codex/.test(id)
              ? "codex"
              : "unknown");
        runs.push({
          agent,
          files: measured,
          id,
          kind,
          retries: retryStats(runDir),
          topic,
        });
      }
    }
  }
  const committed = runs.filter((r) => r.kind === "runs");
  const sum = (rs, f) => rs.reduce((s, r) => s + f(r), 0);
  const fileSum = (rs, f) =>
    sum(rs, (r) => r.files.reduce((t, x) => t + (x.error ? 0 : f(x)), 0));
  const summary = (rs) => {
    const added = rs.flatMap((r) =>
      r.files.flatMap((x) =>
        (x.added ?? []).map((a) => ({ ...a, run: r.id, topic: r.topic }))
      )
    );
    const retries = rs.flatMap((r) =>
      r.retries.retries.map((x) => ({ ...x, run: r.id, topic: r.topic }))
    );
    return {
      added: {
        total: added.length,
        byKind: added.reduce(
          (o, a) => ({ ...o, [a.kind]: (o[a.kind] ?? 0) + 1 }),
          {}
        ),
        byForm: added.reduce(
          (o, a) => ({ ...o, [a.form]: (o[a.form] ?? 0) + 1 }),
          {}
        ),
        matchesStyle: added.filter((a) => a.matchesStyle === true).length,
        notMatchesStyle: added.filter((a) => a.matchesStyle === false).length,
        noStyle: added.filter((a) => a.matchesStyle === null).length,
        placement: added.reduce(
          (o, a) => ({
            ...o,
            [a.placement ?? "n/a"]: (o[a.placement ?? "n/a"] ?? 0) + 1,
          }),
          {}
        ),
        runsAdding: rs.filter((r) =>
          r.files.some((x) => (x.added ?? []).length > 0)
        ).length,
      },
      rewritten: rs.flatMap((r) =>
        r.files.flatMap((x) =>
          (x.rewritten ?? []).map((w) => ({ ...w, run: r.id }))
        )
      ),
      reports: {
        funcStyleAfter: fileSum(rs, (x) => x.after.funcStyle),
        funcStyleBefore: fileSum(rs, (x) => x.before.funcStyle),
        funcStyleIntroducedRuns: rs.filter((r) =>
          r.files.some(
            (x) => !x.error && x.after.funcStyle > x.before.funcStyle
          )
        ).length,
        ubdAfter: fileSum(rs, (x) => x.after.ubd),
        ubdBefore: fileSum(rs, (x) => x.before.ubd),
        ubdIntroducedRuns: rs.filter((r) =>
          r.files.some((x) => !x.error && x.after.ubd > x.before.ubd)
        ).length,
      },
      retries: {
        total: retries.length,
        withFuncStyle: retries.filter((x) => x.funcStyle > 0).length,
        withUbd: retries.filter((x) => x.ubd > 0).length,
        onlyTopicRules: retries.filter((x) => x.onlyTopicRules).length,
        funcStyleIssues: retries.reduce((s, x) => s + x.funcStyle, 0),
        ubdIssues: retries.reduce((s, x) => s + x.ubd, 0),
        issues: retries.reduce((s, x) => s + x.issues, 0),
        byTopic: [...new Set(retries.map((x) => x.topic))].reduce(
          (o, t) => ({
            ...o,
            [t]: {
              funcStyleIssues: retries
                .filter((x) => x.topic === t)
                .reduce((s, x) => s + x.funcStyle, 0),
              retries: retries.filter((x) => x.topic === t).length,
              ubdIssues: retries
                .filter((x) => x.topic === t)
                .reduce((s, x) => s + x.ubd, 0),
              withFuncStyle: retries.filter(
                (x) => x.topic === t && x.funcStyle > 0
              ).length,
              withTopicRules: retries.filter(
                (x) => x.topic === t && x.topicRules
              ).length,
            },
          }),
          {}
        ),
      },
      runs: rs.length,
      runsWithAttempts: rs.filter((r) => r.retries.attempts > 0).length,
    };
  };
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of func-style-agent-runs.cjs. Committed runs only in `committed`; superseded runs (pilots) in `superseded`.",
    committed: {
      all: summary(committed),
      byAgent: Object.fromEntries(
        ["claude", "codex"].map((a) => [
          a,
          summary(committed.filter((r) => r.agent === a)),
        ])
      ),
      byTopic: Object.fromEntries(
        [...new Set(committed.map((r) => r.topic))].map((t) => [
          t,
          summary(committed.filter((r) => r.topic === t)),
        ])
      ),
    },
    superseded: summary(runs.filter((r) => r.kind === "superseded-runs")),
    runs: runs.map((r) => ({
      ...r,
      files: r.files.map((x) => ({ ...x })),
    })),
    tools: lib.toolVersions(),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "agent-runs.json"), result);
  const a = result.committed.all;
  console.log(
    `${a.runs} committed runs (${a.runsWithAttempts} with attempts); added ${a.added.total} functions ${JSON.stringify(a.added.byKind)} in ${a.added.runsAdding} runs; matches style ${a.added.matchesStyle}, not ${a.added.notMatchesStyle}, none ${a.added.noStyle}; placement ${JSON.stringify(a.added.placement)}; func-style ${a.reports.funcStyleBefore}→${a.reports.funcStyleAfter}, ubd ${a.reports.ubdBefore}→${a.reports.ubdAfter}; retries ${a.retries.total}, with func-style ${a.retries.withFuncStyle} (${a.retries.funcStyleIssues} issues), with ubd ${a.retries.withUbd} (${a.retries.ubdIssues}), only these rules ${a.retries.onlyTopicRules}`
  );
  for (const [t, x] of Object.entries(a.retries.byTopic)) {
    console.log(`  ${t}: ${JSON.stringify(x)}`);
  }
  for (const [ag, x] of Object.entries(result.committed.byAgent)) {
    console.log(
      `  ${ag}: runs ${x.runs}, added ${x.added.total} ${JSON.stringify(x.added.byKind)}, matches ${x.added.matchesStyle}/${x.added.matchesStyle + x.added.notMatchesStyle}, placement ${JSON.stringify(x.added.placement)}, retries ${x.retries.total} (func-style ${x.retries.withFuncStyle})`
    );
  }
};

main();
