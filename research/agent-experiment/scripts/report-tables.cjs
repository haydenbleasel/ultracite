// Prints the Markdown tables for REPORT.md from results.json, so no number is hand-copied.
// Usage: node scripts/report-tables.cjs > results/<topic>/tables.md
"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const lib = require("./lib.cjs");

const r = JSON.parse(
  readFileSync(join(lib.RESULTS_DIR, "results.json"), "utf8")
);

const yn = (b) => (b ? "yes" : "**no**");
const fmtCost = (x) =>
  x.costUSD !== null ? `$${x.costUSD.toFixed(2)}` : "n/a";
const fmtTok = (x) => {
  if (x.agent === "claude" && x.tokens) {
    const t = x.tokens;
    return `${((t.input + t.output + t.cacheCreation + t.cacheRead) / 1000).toFixed(0)}k (out ${(t.output / 1000).toFixed(1)}k)`;
  }
  if (x.tokens)
    return `${(x.tokensUsedReportedOnStderr / 1000).toFixed(1)}k "tokens used" (${(x.tokens.total_tokens / 1000).toFixed(0)}k incl. cached)`;
  return "n/a";
};
const approach = (x) =>
  x.approach ? x.approach.categories.join(" + ") : "(unclassified)";
const helpers = (x) =>
  x.newFunctions.length
    ? x.newFunctions.map((n) => `\`${n}\``).join(", ")
    : "none";

console.log("### All runs\n");
console.log(
  "| Run | Cleared at 15 | Cognitive sum before → after | Decision points | Original fn after | Helpers' cognitive | Max fn after | Functions | Cyclomatic sum | Max depth | Code lines | Behavior | Signature | Suppressions / config / other files | Wall | Cost or tokens |"
);
console.log(
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"
);
for (const x of r.runs) {
  const cheat = [
    Object.keys(x.suppressionsAdded).length
      ? `supp: ${JSON.stringify(x.suppressionsAdded)}`
      : null,
    x.configFilesFound.length ? `config: ${x.configFilesFound.length}` : null,
    x.otherFileChanges.length
      ? `other: ${x.otherFileChanges.map((o) => `${o.change} ${o.path}`).join("; ")}`
      : null,
  ].filter(Boolean);
  console.log(
    `| ${x.runId} | ${yn(x.cleared)} | ${x.cognitiveSumBefore} → ${x.cognitiveSumAfter} | ${x.decisionPointsBefore} → ${x.decisionPointsAfter} | ${x.originalFunctionCognitiveAfter} | ${x.helperCognitiveSum} | ${x.cognitiveMaxAfter} | ${x.functionsBefore} → ${x.functionsAfter} | ${x.cyclomaticSumBefore} → ${x.cyclomaticSumAfter} | ${x.maxDepthBefore} → ${x.maxDepthAfter} | ${x.codeLinesBefore} → ${x.codeLinesAfter} | ${yn(x.behaviorPreserved)} | ${yn(x.signaturesPreserved)} | ${cheat.length ? cheat.join("; ") : "none"} | ${x.wallSeconds}s | ${x.agent === "claude" ? fmtCost(x) : fmtTok(x)} |`
  );
}

console.log("\n### Approach per run (hand-classified from the diffs)\n");
console.log("| Run | Approach | New functions | Justification |");
console.log("|---|---|---|---|");
for (const x of r.runs)
  console.log(
    `| ${x.runId} | ${approach(x)} | ${helpers(x)} | ${x.approach?.note ?? ""} |`
  );

console.log(
  "\n### Biome cross-check (noExcessiveCognitiveComplexity, maxAllowedComplexity 1)\n"
);
console.log("| Run | Biome per function after (sonarjs in brackets) |");
console.log("|---|---|");
for (const x of r.runs) {
  console.log(
    `| ${x.runId} | ${x.perFunctionAfter.map((f) => `${f.name}: ${f.biome} [${f.cognitive}]`).join("; ")} |`
  );
}

const s = (o) =>
  o
    ? o.min === o.max
      ? `${o.median}`
      : `${o.median} (${o.min}–${o.max})`
    : "n/a";
console.log("\n### Summary by subject × agent (median, range)\n");
console.log(
  "| Group | Runs | Cleared | Behavior preserved | Signature kept | Suppressions | Decision points before → after | Verbatim moves | Cognitive sum after | Original fn after | Helpers' cognitive | Functions after | Cyclomatic sum after | Max depth after | Code lines after | Wall s | Over 5 min |"
);
console.log(
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"
);
const groups = {
  ...r.summary.bySubjectAgent,
  ...Object.fromEntries(
    Object.entries(r.summary.byAgent).map(([k, v]) => [`all/${k}`, v])
  ),
};
for (const [k, g] of Object.entries(groups)) {
  console.log(
    `| ${k} | ${g.runs} | ${g.cleared}/${g.runs} | ${g.behaviorPreserved}/${g.runs} | ${g.signaturesPreserved}/${g.runs} | ${g.runsWithSuppressions} | ${s(g.decisionPointsBefore)} → ${s(g.decisionPointsAfter)} | ${g.runsMovingCodeVerbatimIntoHelper} | ${s(g.cognitiveSumAfter)} | ${s(g.originalFunctionCognitiveAfter)} | ${s(g.helperCognitiveSum)} | ${s(g.functionsAfter)} | ${s(g.cyclomaticSumAfter)} | ${s(g.maxDepthAfter)} | ${s(g.codeLinesAfter)} | ${s(g.wallSeconds)} | ${g.over5MinUltraciteTimeout} |`
  );
}
console.log("\nApproach counts:");
for (const [k, g] of Object.entries(groups))
  console.log(`- ${k}: ${JSON.stringify(g.approachCategories)}`);
