// Agents and type imports in our own data: every committed agent-experiment run
// (research/agent-experiment/results/<topic>/runs/ and superseded-runs/, and the prompt-revision
// study's runs under results/prompt-revision/<topic>/runs/ and round-2/<topic>/runs/, kept as a
// separate group), measured on the subject as handed over (before) and the final file (after),
// and attempt by attempt where a run has attempts (attempt<k>/agent.*, the agent's own edit,
// against that attempt's input: the subject for attempt 1, attempt<k-1>/verified.* after that) or
// steps (import-cycles: step<k>/after/):
//
//   imports   every import declaration before and after (type-imports-lib.cjs `inventory`): the
//             declarations the agent added and removed (matched by specifier, form and names, as a
//             multiset), each added one's form (a plain value import, `import type`, inline `type`
//             specifiers, a mix, a side-effect import) and whether it rewrites an import of a module
//             the file already imported; an added binding used only as a type without any `type`
//             marker is what consistent-type-imports reports
//   reports   the census's ESLint pass with Ultracite's settings (consistent-type-imports,
//             no-import-type-side-effects, import-x/consistent-type-specifier-style
//             "prefer-top-level", import-x/no-duplicates), and Oxlint with Ultracite's core preset
//             (+ react for .tsx) as `ultracite init` wires it, keeping the type-import rules and
//             no-duplicate-imports
//   retries   every prompt the loop sent (attempt<k>/prompt.txt, step<k>/prompt.txt, and the run's
//             own prompt.txt): the issues it lists by rule, and whether any is a type-import rule
//
// Usage: TYPE_IMPORTS_TMP=<scratch dir> node research/corpus/scripts/type-imports-agent-runs.cjs
// Writes results/type-imports/agent-runs.json.
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

const lib = require("./type-imports-lib.cjs");

const RESULTS = join(lib.ULTRACITE, "research", "agent-experiment", "results");
const WORK = join(lib.TMP, "agent-runs");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const ESLINT_KEEP = [
  "@typescript-eslint/consistent-type-imports",
  "@typescript-eslint/no-import-type-side-effects",
  "import-x/consistent-type-specifier-style",
  "import-x/no-duplicates",
];
const OXLINT_KEEP = new Set([
  "typescript/consistent-type-imports",
  "typescript/no-import-type-side-effects",
  "import/consistent-type-specifier-style",
  "import/no-duplicates",
  "no-duplicate-imports",
]);
const TOPIC_RULE =
  /consistent-type-(?:imports|exports|specifier-style)|no-import-type-side-effects|no-duplicates|no-duplicate-imports|useImportType|useExportType/;

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
const facts = new Map();
const sigOf = (imp) =>
  `${imp.form}|${imp.source}|${imp.specifiers
    .map(
      (sp) =>
        `${sp.kind}:${sp.inlineType ? "type " : ""}${sp.imported ?? ""}>${sp.local}`
    )
    .sort()
    .join(",")}`;
const factsOf = (text, rel) => {
  const key = `${rel}\u0000${text}`;
  if (facts.has(key)) {
    return facts.get(key);
  }
  const inv = lib.inventory(text, rel, { variants: lib.ULTRACITE_ESLINT });
  let out;
  if (inv.error) {
    out = { error: inv.error };
  } else {
    out = {
      eslint: Object.fromEntries(
        ESLINT_KEEP.map((r) => [
          r,
          inv.eslint.filter((m) => m.rule === r).length,
        ])
      ),
      imports: inv.imports.map((imp) => ({
        clause: imp.specifiers.map((sp) => sp.kind).join("+") || "none",
        form: imp.form,
        sig: sigOf(imp),
        source: imp.source,
        unmarkedTypeOnly:
          imp.importKind === "type"
            ? 0
            : imp.specifiers.filter(
                (sp) => !sp.inlineType && sp.usage === "type"
              ).length,
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
  const ia = a?.imports ?? [];
  const ib = b?.imports ?? [];
  const addedSigs = multisetMinus(
    ib.map((x) => x.sig),
    ia.map((x) => x.sig)
  );
  const removedSigs = multisetMinus(
    ia.map((x) => x.sig),
    ib.map((x) => x.sig)
  );
  const taken = new Set();
  const added = [];
  for (const sig of addedSigs) {
    const k = ib.findIndex((x, n) => x.sig === sig && !taken.has(n));
    taken.add(k);
    const imp = ib[k];
    added.push({ ...imp, rewrite: ia.some((x) => x.source === imp.source) });
  }
  return {
    added: added.map((x) => ({
      clause: x.clause,
      form: x.form,
      rewrite: x.rewrite,
      source: x.source,
      unmarkedTypeOnly: x.unmarkedTypeOnly,
    })),
    after: b && {
      eslint: b.eslint,
      imports: ib.length,
      unmarkedTypeOnly: ib.reduce((n, x) => n + x.unmarkedTypeOnly, 0),
    },
    before: a && {
      eslint: a.eslint,
      imports: ia.length,
      unmarkedTypeOnly: ia.reduce((n, x) => n + x.unmarkedTypeOnly, 0),
    },
    file: rel,
    removed: removedSigs.length,
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
const countBy = (xs, f) =>
  xs.reduce((o, x) => ({ ...o, [f(x)]: (o[f(x)] ?? 0) + 1 }), {});
const summary = (runs) => {
  const edits = (r) => r.net.filter((x) => !x.error);
  const stepEdits = (r) =>
    r.steps.flatMap((s) => s.edits.filter((x) => !x.error));
  const addedNet = runs.flatMap((r) => edits(r).flatMap((x) => x.added));
  const addedSteps = runs.flatMap((r) => stepEdits(r).flatMap((x) => x.added));
  const delta = (r, side, rule) =>
    sumOver(
      edits(r),
      (x) => (x[side]?.after?.[rule] ?? 0) - (x[side]?.before?.[rule] ?? 0)
    );
  const retries = runs.flatMap((r) =>
    r.steps.slice(1).map((s) => ({ issues: s.issues, run: r.id }))
  );
  const prompts = runs.flatMap((r) => [
    ...(r.prompt.length ? [{ first: true, issues: r.prompt, run: r.id }] : []),
    ...r.steps.map((s, i) => ({ first: i === 0, issues: s.issues, run: r.id })),
  ]);
  return {
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
          runsAdding: runs.filter(
            (r) =>
              sumOver(
                edits(r),
                (x) =>
                  (x.after?.eslint?.[rule] ?? 0) -
                  (x.before?.eslint?.[rule] ?? 0)
              ) > 0
          ).length,
        },
      ])
    ),
    imports: {
      added: addedNet.length,
      addedByForm: countBy(addedNet, (x) => x.form),
      addedInAnAttempt: addedSteps.length,
      addedInAnAttemptByForm: countBy(addedSteps, (x) => x.form),
      addedNew: addedNet.filter((x) => !x.rewrite).length,
      addedNewByForm: countBy(
        addedNet.filter((x) => !x.rewrite),
        (x) => x.form
      ),
      addedRewrites: addedNet.filter((x) => x.rewrite).length,
      addedRewritesByForm: countBy(
        addedNet.filter((x) => x.rewrite),
        (x) => x.form
      ),
      addedUnmarkedTypeOnlyBindings: sumOver(
        addedNet,
        (x) => x.unmarkedTypeOnly
      ),
      after: sumOver(runs, (r) => sumOver(edits(r), (x) => x.after?.imports)),
      before: sumOver(runs, (r) => sumOver(edits(r), (x) => x.before?.imports)),
      removed: sumOver(runs, (r) => sumOver(edits(r), (x) => x.removed)),
      unmarkedTypeOnlyAfter: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.after?.unmarkedTypeOnly)
      ),
      unmarkedTypeOnlyBefore: sumOver(runs, (r) =>
        sumOver(edits(r), (x) => x.before?.unmarkedTypeOnly)
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
      topicIssues: sumOver(
        prompts,
        (p) => p.issues.filter((i) => TOPIC_RULE.test(i)).length
      ),
      topicIssuesByRule: countBy(
        prompts.flatMap((p) => p.issues.filter((i) => TOPIC_RULE.test(i))),
        (i) => i
      ),
      total: prompts.length,
      withTopicRule: prompts.filter((p) =>
        p.issues.some((i) => TOPIC_RULE.test(i))
      ).length,
    },
    retries: {
      issues: sumOver(retries, (x) => x.issues.length),
      total: retries.length,
      withTopicRule: retries.filter((x) =>
        x.issues.some((i) => TOPIC_RULE.test(i))
      ).length,
      withTopicRuleRuns: [
        ...new Set(
          retries
            .filter((x) => x.issues.some((i) => TOPIC_RULE.test(i)))
            .map((x) => x.run)
        ),
      ],
    },
    runs: runs.length,
    runsAddingImport: runs.filter((r) =>
      edits(r).some((x) => x.added.length > 0)
    ).length,
    runsAddingImportInAnAttempt: runs.filter((r) =>
      stepEdits(r).some((x) => x.added.length > 0)
    ).length,
    runsAddingTopicReport: runs.filter(
      (r) =>
        [...ESLINT_KEEP].some(
          (rule) =>
            sumOver(
              edits(r),
              (x) =>
                (x.after?.eslint?.[rule] ?? 0) - (x.before?.eslint?.[rule] ?? 0)
            ) > 0
        ) ||
        [...OXLINT_KEEP].some(
          (rule) =>
            sumOver(
              edits(r),
              (x) =>
                (x.oxlint?.after?.[rule] ?? 0) - (x.oxlint?.before?.[rule] ?? 0)
            ) > 0
        )
    ).length,
    runsWithAttempts: runs.filter((r) => r.steps.length > 0).length,
    runsWithErrors: runs.filter((r) => r.net.some((x) => x.error)).length,
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
  const addedImports = runs.flatMap((r) => [
    ...r.net.flatMap((x) =>
      (x.added ?? []).map((a) => ({
        ...a,
        file: x.file,
        where: "net",
        ...pick(r),
      }))
    ),
  ]);
  const result = {
    addedImports,
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
    generated: new Date().toISOString(),
    note: "See the header of type-imports-agent-runs.cjs. committed: the agent experiment's runs/ (every topic); superseded: superseded-runs/; promptRevision: the prompt-revision study's runs (both rounds). Counts are net (the subject as handed over against the final file) unless named InAnAttempt. Imports are matched by specifier, form and names, so an agent that only reorders an import's specifiers counts as removing and adding one.",
    promptRevision: summary(runs.filter((r) => r.group !== "experiment")),
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
    `${a.runs} committed runs (${a.runsWithAttempts} with attempts or steps): ${a.runsAddingImport} added an import (net), ${JSON.stringify(a.imports)}; prompts ${a.prompts.total} (${a.prompts.withTopicRule} with a type-import rule); retries ${a.retries.total} (${a.retries.withTopicRule})`
  );
  console.log(`eslint ${JSON.stringify(a.eslint)}`);
  console.log(`oxlint ${JSON.stringify(a.oxlint)}`);
  for (const [ag, x] of Object.entries(result.committed.byAgent)) {
    console.log(
      `  ${ag}: runs ${x.runs}, adding an import ${x.runsAddingImport}, ${JSON.stringify(x.imports.addedByForm)}, unmarked type-only added ${x.imports.addedUnmarkedTypeOnlyBindings}, runs adding a report ${x.runsAddingTopicReport}`
    );
  }
  console.log(`superseded: ${JSON.stringify(result.superseded.imports)}`);
  console.log(
    `prompt revision: ${JSON.stringify(result.promptRevision.imports)}`
  );
};

main();
