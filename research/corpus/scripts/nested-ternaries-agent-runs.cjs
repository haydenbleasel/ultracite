// Agents and the conditional operator in our own data: every committed agent-experiment run
// (research/agent-experiment/results/<topic>/runs/ and superseded-runs/, and the prompt-revision
// study's runs under results/prompt-revision/<topic>/runs/ and round-2/<topic>/runs/, kept as a
// separate group), measured on the subject as handed over (before) and the final file (after),
// and attempt by attempt where a run has attempts (attempt<k>/agent.*, the agent's own edit,
// against that attempt's input: the subject for attempt 1, attempt<k-1>/verified.* after that) or
// steps (import-cycles: step<k>/after/):
//
//   conditionals  conditional expressions and nested ternary trees (nested-ternaries-lib.cjs
//                 `inventory`), if/else chains and guard chains, before and after; the
//                 conditionals the agent introduced and removed (matched by their source text,
//                 whitespace squashed, as a multiset); a ternary turned into an if statement (a
//                 removed conditional whose test is the test of an if statement that's new) and
//                 the reverse
//   reports       the census's ESLint pass (no-nested-ternary, unicorn/prefer-ternary with
//                 Ultracite's options, sonarjs/no-nested-conditional, unicorn/no-nested-ternary,
//                 no-else-return, unicorn/prefer-logical-operator-over-ternary,
//                 no-unneeded-ternary), and Oxlint with Ultracite's core preset (+ react for .tsx)
//                 as `ultracite init` wires it, keeping the same rules plus curly
//   retries       every prompt the loop sent (attempt<k>/prompt.txt, step<k>/prompt.txt, and the
//                 run's own prompt.txt): the issues it lists by rule, and whether any is about the
//                 conditional operator
//   nested        every nested ternary an agent introduced anywhere, with its text
//
// Usage: NESTED_TERNARIES_TMP=<scratch dir> node research/corpus/scripts/nested-ternaries-agent-runs.cjs
// Writes results/nested-ternaries/agent-runs.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");

const RESULTS = join(lib.ULTRACITE, "research", "agent-experiment", "results");
const WORK = join(lib.TMP, "agent-runs");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const ESLINT_KEEP = [
  "no-nested-ternary",
  "unicorn/prefer-ternary",
  "sonarjs/no-nested-conditional",
  "unicorn/no-nested-ternary",
  "no-else-return",
  "unicorn/prefer-logical-operator-over-ternary",
  "no-unneeded-ternary",
];
const OXLINT_KEEP = new Set([
  "no-nested-ternary",
  "unicorn/prefer-ternary",
  "no-else-return",
  "curly",
  "unicorn/prefer-logical-operator-over-ternary",
  "no-unneeded-ternary",
]);
const TERNARY_RULE =
  /ternar|nested-conditional|logical-operator-over|no-else-return|NestedTernary|UselessTernary/;

const filesUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]
      )
    : [];
// one version of the subject: `<base>.<ext>` (one file) or `<base>/` (several)
const version = (dir, base) => {
  const out = {};
  for (const ext of ["ts", "tsx", "js", "mjs", "jsx"]) {
    const f = join(dir, `${base}.${ext}`);
    if (existsSync(f) && statSync(f).isFile()) {
      out[`subject.${ext}`] = readFileSync(f, "utf8");
    }
  }
  const d = join(dir, base);
  if (existsSync(d) && statSync(d).isDirectory()) {
    for (const f of filesUnder(d).filter((x) => SOURCE.test(x))) {
      out[relative(d, f)] = readFileSync(f, "utf8");
    }
  }
  return out;
};

// ── what a version holds ───────────────────────────────────────────────
const squash = (s) => s.replace(/\s+/g, " ").trim();
const facts = new Map();
const factsOf = (text, rel) => {
  const key = `${rel}\u0000${text}`;
  if (facts.has(key)) {
    return facts.get(key);
  }
  const inv = lib.inventory(text, rel);
  let out;
  if (inv.error) {
    out = { error: inv.error };
  } else {
    const parsed = lib.sk.safeParse(text, rel);
    const conds = [];
    const ifTests = [];
    if (parsed.ast) {
      lib.sk.walk(parsed.ast, (n) => {
        if (n.type === "ConditionalExpression") {
          conds.push({
            test: squash(text.slice(n.test.range[0], n.test.range[1])),
            text: squash(text.slice(n.range[0], n.range[1])),
          });
        }
        if (n.type === "IfStatement") {
          ifTests.push(squash(text.slice(n.test.range[0], n.test.range[1])));
        }
      });
    }
    const eslint = Object.fromEntries(
      ESLINT_KEEP.map((r) => [r, inv.eslint.filter((m) => m.rule === r).length])
    );
    out = {
      conditionals: inv.conditionals.length,
      conds,
      eslint,
      guards: inv.guards.length,
      ifChains: inv.ifChains.length,
      ifTests,
      trees: inv.trees.map((t) => ({
        depth: t.depth,
        line: t.line,
        position: t.position,
        shape: t.shape,
        text: t.text,
      })),
    };
  }
  facts.set(key, out);
  return out;
};
const multisetMinus = (a, b) => {
  const counts = new Map();
  for (const x of b) {
    counts.set(x, (counts.get(x) ?? 0) + 1);
  }
  const out = [];
  for (const x of a) {
    const n = counts.get(x) ?? 0;
    if (n > 0) {
      counts.set(x, n - 1);
    } else {
      out.push(x);
    }
  }
  return out;
};
// from → to, one file
const compare = (rel, fromText, toText) => {
  const a = fromText === null ? null : factsOf(fromText, rel);
  const b = toText === null ? null : factsOf(toText, rel);
  if (a?.error || b?.error) {
    return { error: a?.error ?? b?.error, file: rel };
  }
  const ca = a?.conds ?? [];
  const cb = b?.conds ?? [];
  const added = multisetMinus(
    cb.map((c) => c.text),
    ca.map((c) => c.text)
  );
  const removed = multisetMinus(
    ca.map((c) => c.text),
    cb.map((c) => c.text)
  );
  const newIfs = multisetMinus(b?.ifTests ?? [], a?.ifTests ?? []);
  const goneIfs = multisetMinus(a?.ifTests ?? [], b?.ifTests ?? []);
  const removedConds = ca.filter((c) => removed.includes(c.text));
  const addedConds = cb.filter((c) => added.includes(c.text));
  const treesAdded = multisetMinus(
    (b?.trees ?? []).map((t) => t.text),
    (a?.trees ?? []).map((t) => t.text)
  );
  const treesRemoved = multisetMinus(
    (a?.trees ?? []).map((t) => t.text),
    (b?.trees ?? []).map((t) => t.text)
  );
  return {
    after: b && {
      conditionals: b.conditionals,
      eslint: b.eslint,
      guards: b.guards,
      ifChains: b.ifChains,
      trees: b.trees.length,
    },
    before: a && {
      conditionals: a.conditionals,
      eslint: a.eslint,
      guards: a.guards,
      ifChains: a.ifChains,
      trees: a.trees.length,
    },
    conditionalsAdded: added,
    // added conditionals whose test no conditional had before: new decisions, not rewrites of an
    // existing ternary
    conditionalsAddedNewTest: addedConds.filter(
      (c) => !ca.some((x) => x.test === c.test)
    ).length,
    conditionalsRemoved: removed.length,
    file: rel,
    ifToTernary: addedConds.filter((c) => goneIfs.includes(c.test)).length,
    nestedAdded: (b?.trees ?? []).filter((t) => treesAdded.includes(t.text)),
    nestedRemoved: treesRemoved.length,
    ternaryToIf: removedConds.filter((c) => newIfs.includes(c.test)).length,
  };
};

// ── Oxlint, batched ────────────────────────────────────────────────────
const oxlintJobs = [];
const queueOxlint = (label, rel, text) => {
  const tsx = /\.[jt]sx$/.test(rel);
  const file = join(
    tsx ? "tsx" : "ts",
    label,
    rel.replace(/^subject\./, "subject.")
  );
  oxlintJobs.push({ file, label, rel, text, tsx });
  return file;
};
const runOxlintJobs = () => {
  rmSync(WORK, { force: true, recursive: true });
  for (const j of oxlintJobs) {
    const dest = join(WORK, j.file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, j.text);
  }
  const configs = join(lib.TMP, "agent-runs-configs");
  const results = new Map();
  for (const kind of ["ts", "tsx"]) {
    const jobs = oxlintJobs.filter((j) => (kind === "tsx") === j.tsx);
    if (jobs.length === 0) {
      continue;
    }
    const cfg = lib.dc.writeOxlintConfig(
      kind === "tsx" ? ["core", "react"] : ["core"],
      configs
    );
    const ds = lib.dc.runOxlint({
      configFile: cfg,
      cwd: WORK,
      files: jobs.map((j) => j.file),
      keep: (r) => OXLINT_KEEP.has(r),
    });
    for (const d of ds) {
      const f = d.filename ?? d.file;
      const k = f.replace(/^\.\//, "");
      if (!results.has(k)) {
        results.set(k, {});
      }
      results.get(k)[d.rule] = (results.get(k)[d.rule] ?? 0) + 1;
    }
  }
  rmSync(configs, { force: true, recursive: true });
  rmSync(WORK, { force: true, recursive: true });
  return results;
};

// ── prompts ────────────────────────────────────────────────────────────
const promptIssues = (p) =>
  existsSync(p)
    ? [
        ...readFileSync(p, "utf8").matchAll(
          /^\d+\. line \d+, col \d+ — ([^:]+):/gm
        ),
      ].map((m) => m[1].trim())
    : [];

// ── runs ───────────────────────────────────────────────────────────────
const runDirs = () => {
  const out = [];
  const add = (group, topic, kind, dir) => {
    if (!existsSync(dir)) {
      return;
    }
    for (const id of readdirSync(dir).sort()) {
      const runDir = join(dir, id);
      if (statSync(runDir).isDirectory()) {
        out.push({ group, id, kind, runDir, topic });
      }
    }
  };
  for (const topic of readdirSync(RESULTS).sort()) {
    if (!statSync(join(RESULTS, topic)).isDirectory()) {
      continue;
    }
    if (topic === "prompt-revision") {
      const pr = join(RESULTS, topic);
      for (const t of readdirSync(pr).sort()) {
        if (t === "round-2") {
          for (const t2 of readdirSync(join(pr, t)).sort()) {
            add("prompt-revision-round-2", t2, "runs", join(pr, t, t2, "runs"));
          }
        } else if (statSync(join(pr, t)).isDirectory()) {
          add("prompt-revision", t, "runs", join(pr, t, "runs"));
        }
      }
      continue;
    }
    for (const kind of ["runs", "superseded-runs"]) {
      add("experiment", topic, kind, join(RESULTS, topic, kind));
    }
  }
  return out;
};

const measureRun = ({ group, id, kind, runDir, topic }) => {
  const meta = existsSync(join(runDir, "meta.json"))
    ? JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"))
    : {};
  const agent =
    meta.agent ??
    (/claude/.test(id) ? "claude" : /codex/.test(id) ? "codex" : "unknown");
  const before = version(runDir, "before");
  const after = version(runDir, "after");
  const label = `${group}/${topic}/${kind}/${id}`;
  const files = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((f) => !/(?:^|\/)stubs?\.[jt]sx?$|-stubs\.[jt]sx?$/.test(f))
    .sort();
  const net = files.map((f) => {
    const c = compare(f, before[f] ?? null, after[f] ?? null);
    if (before[f] !== undefined) {
      c.oxlintBefore = queueOxlint(`${label}/before`, f, before[f]);
    }
    if (after[f] !== undefined) {
      c.oxlintAfter = queueOxlint(`${label}/after`, f, after[f]);
    }
    return c;
  });
  // attempts (the agent's own edits) and steps
  const steps = [];
  const attemptDirs = readdirSync(runDir)
    .filter((d) => /^(?:attempt|step)\d+$/.test(d))
    .sort(
      (x, y) => Number(x.replace(/\D/g, "")) - Number(y.replace(/\D/g, ""))
    );
  let input = before;
  for (const d of attemptDirs) {
    const dir = join(runDir, d);
    const agentEdit = d.startsWith("step")
      ? version(dir, "after")
      : version(dir, "agent");
    const verified = d.startsWith("step")
      ? agentEdit
      : version(dir, "verified");
    const stepFiles = Object.keys(agentEdit)
      .filter((f) => !/(?:^|\/)stubs?\.[jt]sx?$|-stubs\.[jt]sx?$/.test(f))
      .sort();
    steps.push({
      edits: stepFiles.map((f) => compare(f, input[f] ?? null, agentEdit[f])),
      issues: promptIssues(join(dir, "prompt.txt")),
      name: d,
    });
    input = Object.keys(verified).length > 0 ? verified : agentEdit;
  }
  const runPrompt = promptIssues(join(runDir, "prompt.txt"));
  return {
    agent,
    group,
    id,
    kind,
    net,
    prompt: runPrompt,
    steps,
    topic,
  };
};

const sumOver = (xs, f) => xs.reduce((s, x) => s + (f(x) ?? 0), 0);
const summary = (runs) => {
  const edits = (r) => [...r.net.filter((x) => !x.error)];
  const stepEdits = (r) =>
    r.steps.flatMap((s) => s.edits.filter((x) => !x.error));
  const addedAny = (r) =>
    edits(r).some((x) => x.conditionalsAdded.length > 0) ||
    stepEdits(r).some((x) => x.conditionalsAdded.length > 0);
  const addedNested = (r) =>
    edits(r).some((x) => x.nestedAdded.length > 0) ||
    stepEdits(r).some((x) => x.nestedAdded.length > 0);
  const delta = (r, side, rule) =>
    sumOver(
      edits(r),
      (x) => (x.after?.[side]?.[rule] ?? 0) - (x.before?.[side]?.[rule] ?? 0)
    );
  const retries = runs.flatMap((r) =>
    r.steps.slice(1).map((s) => ({ issues: s.issues, run: r.id }))
  );
  const prompts = runs.flatMap((r) => [
    ...(r.prompt.length ? [{ first: true, issues: r.prompt, run: r.id }] : []),
    ...r.steps.map((s, i) => ({ first: i === 0, issues: s.issues, run: r.id })),
  ]);
  return {
    conditionals: {
      after: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.after?.conditionals)
      ),
      before: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.before?.conditionals)
      ),
      introduced: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.conditionalsAdded.length)
      ),
      introducedNewTest: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.conditionalsAddedNewTest)
      ),
      removed: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.conditionalsRemoved)
      ),
      ifToTernary: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.ifToTernary)
      ),
      ternaryToIf: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.ternaryToIf)
      ),
    },
    eslint: Object.fromEntries(
      ESLINT_KEEP.map((rule) => [
        rule,
        {
          after: sumOver(runs, (r) =>
            sumOver(edits(r), (x) => x.after?.eslint?.[rule])
          ),
          before: sumOver(runs, (r) =>
            sumOver(edits(r), (x) => x.before?.eslint?.[rule])
          ),
          runsAdding: runs.filter((r) => delta(r, "eslint", rule) > 0).length,
        },
      ])
    ),
    nested: {
      after: sumOver(runs, (r) => sumOver(edits(r), (x) => x.after?.trees)),
      before: sumOver(runs, (r) => sumOver(edits(r), (x) => x.before?.trees)),
      introducedNet: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.nestedAdded.length)
      ),
      introducedInAnAttempt: sumOver(runs, (r) =>
        sumOver(stepEdits(r), (x) => x.nestedAdded.length)
      ),
      removedNet: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.nestedRemoved)
      ),
    },
    oxlint: Object.fromEntries(
      [...OXLINT_KEEP].map((rule) => [
        rule,
        {
          after: sumOver(runs, (r) =>
            sumOver(edits(r), (x) => x.oxlint?.after?.[rule])
          ),
          before: sumOver(runs, (r) =>
            sumOver(edits(r), (x) => x.oxlint?.before?.[rule])
          ),
          runsAdding: runs.filter(
            (r) =>
              sumOver(
                edits(r),
                (x) =>
                  (x.oxlint?.after?.[rule] ?? 0) -
                  (x.oxlint?.before?.[rule] ?? 0)
              ) > 0
          ).length,
        },
      ])
    ),
    prompts: {
      issues: sumOver(prompts, (p) => p.issues.length),
      ternaryIssues: sumOver(
        prompts,
        (p) => p.issues.filter((i) => TERNARY_RULE.test(i)).length
      ),
      total: prompts.length,
      withTernaryRule: prompts.filter((p) =>
        p.issues.some((i) => TERNARY_RULE.test(i))
      ).length,
    },
    retries: {
      issues: sumOver(retries, (x) => x.issues.length),
      total: retries.length,
      withTernaryRule: retries.filter((x) =>
        x.issues.some((i) => TERNARY_RULE.test(i))
      ).length,
    },
    runs: runs.length,
    runsAddingConditional: runs.filter(addedAny).length,
    runsAddingNewDecision: runs.filter((r) =>
      edits(r).some((x) => x.conditionalsAddedNewTest > 0)
    ).length,
    runsAddingConditionalNet: runs.filter((r) =>
      edits(r).some((x) => x.conditionalsAdded.length > 0)
    ).length,
    runsAddingNested: runs.filter(addedNested).length,
    runsWithAttempts: runs.filter((r) => r.steps.length > 0).length,
    runsWithErrors: runs.filter((r) => r.net.some((x) => x.error)).length,
  };
};

// a file's net change, with only the rules whose counts differ
const compactNet = (x) => {
  if (x.error) {
    return { error: x.error, file: x.file };
  }
  const changed = (b, a) =>
    Object.fromEntries(
      [...new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})])]
        .filter((k) => (b?.[k] ?? 0) !== (a?.[k] ?? 0))
        .map((k) => [k, [b?.[k] ?? 0, a?.[k] ?? 0]])
    );
  return {
    conditionals: [x.before?.conditionals ?? 0, x.after?.conditionals ?? 0],
    conditionalsAdded: x.conditionalsAdded.map((t) => t.slice(0, 200)),
    conditionalsAddedNewTest: x.conditionalsAddedNewTest,
    conditionalsRemoved: x.conditionalsRemoved,
    eslintChanged: changed(x.before?.eslint, x.after?.eslint),
    file: x.file,
    ifChains: [x.before?.ifChains ?? 0, x.after?.ifChains ?? 0],
    ifToTernary: x.ifToTernary,
    nested: [x.before?.trees ?? 0, x.after?.trees ?? 0],
    nestedAdded: x.nestedAdded,
    oxlintChanged: changed(x.oxlint?.before, x.oxlint?.after),
    ternaryToIf: x.ternaryToIf,
  };
};
const pick = (r) => ({
  agent: r.agent,
  group: r.group,
  id: r.id,
  kind: r.kind,
  topic: r.topic,
});

const main = () => {
  const runs = runDirs().map(measureRun);
  const ox = runOxlintJobs();
  for (const r of runs) {
    for (const x of r.net) {
      x.oxlint = {
        after: x.oxlintAfter ? (ox.get(x.oxlintAfter) ?? {}) : null,
        before: x.oxlintBefore ? (ox.get(x.oxlintBefore) ?? {}) : null,
      };
      delete x.oxlintAfter;
      delete x.oxlintBefore;
    }
  }
  const committed = runs.filter(
    (r) => r.group === "experiment" && r.kind === "runs"
  );
  const nestedIntroduced = runs.flatMap((r) => [
    ...r.net.flatMap((x) =>
      (x.nestedAdded ?? []).map((t) => ({
        ...t,
        file: x.file,
        where: "net",
        ...pick(r),
      }))
    ),
    ...r.steps.flatMap((s) =>
      s.edits.flatMap((x) =>
        (x.nestedAdded ?? []).map((t) => ({
          ...t,
          file: x.file,
          where: s.name,
          ...pick(r),
        }))
      )
    ),
  ]);
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of nested-ternaries-agent-runs.cjs. committed: the agent experiment's runs/ (every topic); superseded: superseded-runs/; promptRevision: the prompt-revision study's runs (both rounds). Counts are net (the subject as handed over against the final file) unless named InAnAttempt. Conditionals are matched by their source text, so an agent that only reformats a ternary counts as removing and adding one.",
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
          {
            all: summary(committed.filter((r) => r.topic === t)),
            claude: summary(
              committed.filter((r) => r.topic === t && r.agent === "claude")
            ),
            codex: summary(
              committed.filter((r) => r.topic === t && r.agent === "codex")
            ),
          },
        ])
      ),
    },
    nestedIntroduced,
    promptRevision: summary(runs.filter((r) => r.group !== "experiment")),
    // per run: only what changed (rules whose counts differ, conditionals added), to keep the file
    // small; the summaries above are computed from the full measurements
    runs: runs.map((r) => ({
      agent: r.agent,
      group: r.group,
      id: r.id,
      kind: r.kind,
      net: r.net.map((x) => compactNet(x)),
      steps: r.steps.map((s) => ({
        edits: s.edits
          .filter(
            (x) =>
              x.error ||
              x.conditionalsAdded?.length ||
              x.conditionalsRemoved ||
              x.nestedAdded?.length
          )
          .map((x) => ({
            conditionalsAdded: x.conditionalsAdded?.map((t) => t.slice(0, 200)),
            conditionalsRemoved: x.conditionalsRemoved,
            error: x.error,
            file: x.file,
            ifToTernary: x.ifToTernary,
            nestedAdded: x.nestedAdded,
            ternaryToIf: x.ternaryToIf,
          })),
        issuesByRule: s.issues.reduce(
          (o, i) => ({ ...o, [i]: (o[i] ?? 0) + 1 }),
          {}
        ),
        name: s.name,
      })),
      topic: r.topic,
    })),
    superseded: summary(
      runs.filter(
        (r) => r.group === "experiment" && r.kind === "superseded-runs"
      )
    ),
    tools: lib.toolVersions(),
  };
  lib.writeJson(
    join(lib.RESULTS_DIR, "agent-runs.json"),
    JSON.parse(lib.scrub(JSON.stringify(result)))
  );
  const a = result.committed.all;
  console.log(
    `${a.runs} committed runs (${a.runsWithAttempts} with attempts or steps): ${a.runsAddingConditional} added a conditional (${a.runsAddingConditionalNet} net), ${a.runsAddingNested} a nested ternary; conditionals ${a.conditionals.before}→${a.conditionals.after} (+${a.conditionals.introduced} −${a.conditionals.removed}; ternary→if ${a.conditionals.ternaryToIf}, if→ternary ${a.conditionals.ifToTernary}); nested ${a.nested.before}→${a.nested.after}; prompts ${a.prompts.total} (${a.prompts.withTernaryRule} with a ternary rule); retries ${a.retries.total} (${a.retries.withTernaryRule})`
  );
  console.log(`eslint ${JSON.stringify(a.eslint)}`);
  console.log(`oxlint ${JSON.stringify(a.oxlint)}`);
  for (const [ag, x] of Object.entries(result.committed.byAgent)) {
    console.log(
      `  ${ag}: runs ${x.runs}, adding a conditional ${x.runsAddingConditional} (net ${x.runsAddingConditionalNet}), conditionals +${x.conditionals.introduced} −${x.conditionals.removed}, nested +${x.nested.introducedNet}, prefer-ternary runs adding ${x.eslint["unicorn/prefer-ternary"].runsAdding}/${x.oxlint["unicorn/prefer-ternary"].runsAdding}`
    );
  }
  for (const [t, x] of Object.entries(result.committed.byTopic)) {
    console.log(
      `  ${t}: runs ${x.all.runs}, +cond runs ${x.all.runsAddingConditional} (claude ${x.claude.runsAddingConditional}/${x.claude.runs}, codex ${x.codex.runsAddingConditional}/${x.codex.runs}), cond +${x.all.conditionals.introduced} −${x.all.conditionals.removed}, t→if ${x.all.conditionals.ternaryToIf}, if→t ${x.all.conditionals.ifToTernary}, nested +${x.all.nested.introducedNet}`
    );
  }
  console.log(
    `superseded: ${JSON.stringify({ runs: result.superseded.runs, nested: result.superseded.nested, cond: result.superseded.conditionals })}`
  );
  console.log(
    `prompt revision: ${JSON.stringify({ runs: result.promptRevision.runs, nested: result.promptRevision.nested, cond: result.promptRevision.conditionals })}`
  );
  for (const n of nestedIntroduced) {
    console.log(
      `NESTED ${n.group}/${n.topic}/${n.kind}/${n.id} ${n.where} ${n.file}:${n.line} ${n.text.slice(0, 160)}`
    );
  }
};

main();
