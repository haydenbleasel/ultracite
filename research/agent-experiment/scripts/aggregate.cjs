// Collects every results/<topic>/runs/<id>/measure.json (+ hand classifications) into
// results/<topic>/results.json with
// per-run rows and per-subject, per-agent and per-subject×agent summaries.
//
// A topic module with an `aggregate` hook (scripts/topics.cjs) aggregates its own runs; the
// function below is the cognitive-complexity aggregation.
"use strict";

const {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");
const lib = require("./lib.cjs");
const { loadTopic } = require("./topics.cjs");

const topic = loadTopic();
if (topic.aggregate) {
  Promise.resolve(topic.aggregate()).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  aggregateCognitiveComplexity();
}

function aggregateCognitiveComplexity() {
  const HERE = lib.HERE;
  const subjects = JSON.parse(
    readFileSync(join(HERE, "subjects/subjects.json"), "utf8")
  );
  const classPath = join(lib.RESULTS_DIR, "classifications.json");
  const classifications = existsSync(classPath)
    ? JSON.parse(readFileSync(classPath, "utf8"))
    : {};

  const runs = readdirSync(lib.RUNS_DIR)
    .filter(
      (id) =>
        !id.startsWith("pilot-") &&
        existsSync(join(lib.RUNS_DIR, id, "measure.json"))
    )
    .sort()
    .map((id) =>
      JSON.parse(readFileSync(join(lib.RUNS_DIR, id, "measure.json"), "utf8"))
    );

  const ORIGINAL = { s1: "formatTimespan", s2: "computePreferredLocaleList" };

  function row(m) {
    const a = m.after;
    const original = a?.functions.find((f) => f.name === ORIGINAL[m.subject]);
    const helpers = a
      ? a.functions.filter((f) => f.name !== ORIGINAL[m.subject])
      : [];
    const s = m.agentStats ?? {};
    const cls = classifications[m.runId] ?? null;
    return {
      runId: m.runId,
      subject: m.subject,
      agent: m.agent,
      cliVersion: m.cliVersion,
      model: (s.models ?? []).join(", ") || null,
      effort: (s.effort ?? s.reasoningEffort ?? []).join(", ") || null,
      exitCode: m.exitCode,
      timedOut: m.timedOut,
      wallSeconds: m.wallSeconds,
      over5MinUltraciteTimeout: m.wouldHaveTimedOutAtUltracite5Min,
      cleared: m.lint.genuine?.cleared ?? false,
      clearedAsUltraciteSees: m.lint.asUltraciteSees?.cleared ?? false,
      remainingDiagnostics: m.lint.genuine?.remaining ?? null,
      cognitiveSumBefore: m.before.cognitiveSum,
      cognitiveSumAfter: a?.cognitiveSum ?? null,
      cognitiveRemovedNet: a ? m.before.cognitiveSum - a.cognitiveSum : null,
      originalFunctionCognitiveAfter: original?.cognitive ?? null,
      helperCognitiveSum: helpers.reduce((x, f) => x + f.cognitive, 0),
      cognitiveMaxAfter: a?.cognitiveMax ?? null,
      perFunctionAfter: a?.functions.map((f) => ({
        name: f.name,
        nestedIn: f.nestedIn,
        cognitive: f.cognitive,
        biome: f.biome,
        cyclomatic: f.cyclomatic,
        maxDepth: f.maxDepth,
      })),
      biomeSumOfReportedBefore: m.before.biomeSumOfReported,
      biomeSumOfReportedAfter: a?.biomeSumOfReported ?? null,
      biomeFunctionsAtMost1After: a?.biomeFunctionsAtMost1 ?? null,
      functionsBefore: m.before.functionCount,
      functionsAfter: a?.functionCount ?? null,
      newFunctions: m.newFunctions,
      cyclomaticSumBefore: m.before.cyclomaticSum,
      cyclomaticSumAfter: a?.cyclomaticSum ?? null,
      // Branch/loop/boolean decision points across the file: cyclomatic sum minus one base point
      // per function. Unchanged = branching moved; lower = branching removed (e.g. into data).
      decisionPointsBefore: m.before.cyclomaticSum - m.before.functionCount,
      decisionPointsAfter: a ? a.cyclomaticSum - a.functionCount : null,
      maxDepthBefore: m.before.maxDepth,
      maxDepthAfter: a?.maxDepth ?? null,
      codeLinesBefore: m.before.codeLines,
      codeLinesAfter: a?.codeLines ?? null,
      nonBlankLinesBefore: m.before.nonBlankLines,
      nonBlankLinesAfter: a?.nonBlankLines ?? null,
      behaviorPreserved: m.behavior.ok === true,
      behavior: m.behavior,
      exportsPreserved: m.exports.exportsPreserved,
      signaturesPreserved: m.exports.signaturesPreserved,
      addedExports: m.exports.addedExports,
      typeErrorsAfter: m.typeErrorsAfter,
      suppressionsAdded: m.cheating.suppressionsAdded,
      configFilesFound: m.cheating.configFiles,
      otherFileChanges: m.cheating.otherFileChanges,
      diagnosticsJsonUnchanged: m.cheating.diagnosticsJsonUnchanged,
      toolCallsOutsideRunDir: m.cheating.toolCallsOutsideRunDir,
      tokens: s.tokens ?? null,
      tokensUsedReportedOnStderr: s.tokensUsedReportedOnStderr ?? null,
      costUSD: s.costUSD ?? null,
      toolCalls: (s.toolCalls ?? []).map((c) => c.tool),
      toolCallCount: (s.toolCalls ?? []).length,
      approach: cls,
    };
  }

  const rows = runs.map(row);

  const stats = (xs) => {
    const v = xs.filter((x) => typeof x === "number").sort((p, q) => p - q);
    if (v.length === 0) return null;
    const mid = Math.floor(v.length / 2);
    const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
    const mean = v.reduce((p, q) => p + q, 0) / v.length;
    return {
      n: v.length,
      min: v[0],
      median,
      mean: Math.round(mean * 100) / 100,
      max: v.at(-1),
    };
  };

  function summarize(group) {
    const count = (pred) => group.filter(pred).length;
    const categories = {};
    for (const r of group)
      for (const c of r.approach?.categories ?? [])
        categories[c] = (categories[c] ?? 0) + 1;
    return {
      runs: group.length,
      agentExitedCleanly: count((r) => r.exitCode === 0),
      timedOut: count((r) => r.timedOut),
      over5MinUltraciteTimeout: count((r) => r.over5MinUltraciteTimeout),
      cleared: count((r) => r.cleared),
      clearedAsUltraciteSees: count((r) => r.clearedAsUltraciteSees),
      behaviorPreserved: count((r) => r.behaviorPreserved),
      behaviorPreservedRealHelpersOnly:
        group[0]?.subject === "s2" || group.some((r) => r.subject === "s2")
          ? count(
              (r) =>
                r.behavior?.modes?.realHelpers?.ok === true ||
                (r.subject === "s1" && r.behaviorPreserved)
            )
          : undefined,
      signaturesPreserved: count((r) => r.signaturesPreserved),
      runsWithSuppressions: count(
        (r) => Object.keys(r.suppressionsAdded ?? {}).length > 0
      ),
      runsTouchingOtherFiles: count(
        (r) => (r.otherFileChanges ?? []).length > 0
      ),
      runsWithConfigFiles: count((r) => (r.configFilesFound ?? []).length > 0),
      runsWithTypeErrors: count((r) => (r.typeErrorsAfter ?? []).length > 0),
      cognitiveSumBefore: stats(group.map((r) => r.cognitiveSumBefore)),
      cognitiveSumAfter: stats(group.map((r) => r.cognitiveSumAfter)),
      cognitiveRemovedNet: stats(group.map((r) => r.cognitiveRemovedNet)),
      originalFunctionCognitiveAfter: stats(
        group.map((r) => r.originalFunctionCognitiveAfter)
      ),
      helperCognitiveSum: stats(group.map((r) => r.helperCognitiveSum)),
      cognitiveMaxAfter: stats(group.map((r) => r.cognitiveMaxAfter)),
      functionsAfter: stats(group.map((r) => r.functionsAfter)),
      cyclomaticSumAfter: stats(group.map((r) => r.cyclomaticSumAfter)),
      decisionPointsBefore: stats(group.map((r) => r.decisionPointsBefore)),
      decisionPointsAfter: stats(group.map((r) => r.decisionPointsAfter)),
      runsMovingCodeVerbatimIntoHelper: count(
        (r) => r.approach?.movedVerbatim === true
      ),
      runsWithAHelperWithin2OfLimit: count((r) =>
        (r.perFunctionAfter ?? []).some(
          (f) =>
            f.name !== ORIGINAL[r.subject] &&
            f.cognitive >= 13 &&
            f.cognitive <= 15
        )
      ),
      maxDepthAfter: stats(group.map((r) => r.maxDepthAfter)),
      codeLinesAfter: stats(group.map((r) => r.codeLinesAfter)),
      wallSeconds: stats(group.map((r) => r.wallSeconds)),
      costUSD: stats(group.map((r) => r.costUSD)),
      totalTokens: stats(
        group.map((r) =>
          r.agent === "claude" && r.tokens
            ? r.tokens.input +
              r.tokens.output +
              r.tokens.cacheCreation +
              r.tokens.cacheRead
            : r.tokens?.total_tokens
        )
      ),
      outputTokens: stats(
        group.map((r) =>
          r.agent === "claude" ? r.tokens?.output : r.tokens?.output_tokens
        )
      ),
      approachCategories: categories,
    };
  }

  const by = (key) => {
    const out = {};
    for (const r of rows) (out[r[key]] ??= []).push(r);
    return Object.fromEntries(
      Object.entries(out).map(([k, g]) => [k, summarize(g)])
    );
  };
  const bySubjectAgent = {};
  for (const r of rows)
    (bySubjectAgent[`${r.subject}/${r.agent}`] ??= []).push(r);

  const results = {
    generatedAt: new Date().toISOString(),
    tools: lib.tools.versions(),
    subjects: subjects.map(({ path, ...s }) => s),
    agentLimit: lib.AGENT_LIMIT,
    runs: rows,
    summary: {
      overall: summarize(rows),
      bySubject: by("subject"),
      byAgent: by("agent"),
      bySubjectAgent: Object.fromEntries(
        Object.entries(bySubjectAgent).map(([k, g]) => [k, summarize(g)])
      ),
    },
  };
  writeFileSync(
    join(lib.RESULTS_DIR, "results.json"),
    `${JSON.stringify(results, null, 2)}\n`
  );

  // Compact table to stdout.
  const pad = (s, n) => String(s ?? "").padEnd(n);
  console.log(
    [
      pad("run", 14),
      pad("clr", 4),
      pad("cog sum", 9),
      pad("orig", 5),
      pad("helpers", 8),
      pad("fns", 5),
      pad("cyc", 8),
      pad("dep", 5),
      pad("loc", 7),
      pad("beh", 5),
      pad("sig", 4),
      pad("supp", 5),
      pad("wall", 7),
      "cost/tokens",
    ].join(" ")
  );
  for (const r of rows) {
    console.log(
      [
        pad(r.runId, 14),
        pad(r.cleared ? "yes" : "NO", 4),
        pad(`${r.cognitiveSumBefore}->${r.cognitiveSumAfter}`, 9),
        pad(r.originalFunctionCognitiveAfter, 5),
        pad(r.helperCognitiveSum, 8),
        pad(`${r.functionsBefore}->${r.functionsAfter}`, 5),
        pad(`${r.cyclomaticSumBefore}->${r.cyclomaticSumAfter}`, 8),
        pad(`${r.maxDepthBefore}->${r.maxDepthAfter}`, 5),
        pad(`${r.codeLinesBefore}->${r.codeLinesAfter}`, 7),
        pad(r.behaviorPreserved ? "yes" : "NO", 5),
        pad(r.signaturesPreserved ? "yes" : "NO", 4),
        pad(Object.keys(r.suppressionsAdded ?? {}).length ? "YES" : "no", 5),
        pad(`${r.wallSeconds}s`, 7),
        r.costUSD !== null
          ? `$${r.costUSD.toFixed(3)}`
          : `${r.tokens?.total_tokens ?? "?"} tok`,
      ].join(" ")
    );
  }

  // Hand-made reference fixes (written by the experimenter, NOT agent output), scored the same
  // way, to show what removing complexity in place would score on each subject.
  const REFERENCES = {
    "s1 guard clause only (same shape as the agents' early return)": [
      "s1",
      "harness-tests/s1-guard.ts",
    ],
    "s2 guard clauses only": ["s2", "harness-tests/s2-ref-guards.ts"],
    "s2 guard clauses + string/object branch unified": [
      "s2",
      "harness-tests/s2-ref-guards-unified.ts",
    ],
    "s2 guard clauses + unified branch + .filter (no named helper)": [
      "s2",
      "harness-tests/s2-ref-guards-filter.ts",
    ],
  };
  (async () => {
    const refs = {};
    for (const [label, [subject, rel]] of Object.entries(REFERENCES)) {
      const scored = await lib.scoreFunctions(join(HERE, rel));
      refs[label] = {
        subject,
        file: rel,
        functions: scored.functions.map((f) => ({
          name: f.name,
          cognitive: f.cognitive,
          cyclomatic: f.cyclomatic,
          maxDepth: f.maxDepth,
        })),
        cognitiveSum: scored.functions.reduce((a, f) => a + f.cognitive, 0),
        passesAt15: scored.functions.every((f) => f.cognitive <= 15),
        passesAt20: scored.functions.every((f) => f.cognitive <= 20),
        behavior:
          "equivalent in all three behavior modes (scripts/test-behavior-harness.cjs)",
      };
    }
    results.handMadeReferences = refs;
    writeFileSync(
      join(lib.RESULTS_DIR, "results.json"),
      `${JSON.stringify(results, null, 2)}\n`
    );
  })();
}
