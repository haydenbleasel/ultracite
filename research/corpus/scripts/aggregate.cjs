// Aggregates out/<repo>.functions.json and out/<repo>.biome-compare.json into
// results/<topic>/results.json.
// Usage: node aggregate.cjs
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join, resolve } = require("node:path");
const config = require("./repos.json");
const { RESULTS_DIR, versions } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const OUT = join(HERE, "out");
const EXTERNAL = config.repos
  .map((r) => r.name)
  .filter((n) => n !== "ultracite");

const BUCKETS = [
  ["0", 0, 0],
  ["1-5", 1, 5],
  ["6-10", 6, 10],
  ["11-15", 11, 15],
  ["16-20", 16, 20],
  ["21-30", 21, 30],
  ["31-50", 31, 50],
  ["51+", 51, Number.POSITIVE_INFINITY],
];
const THRESHOLDS = [10, 15, 20, 25, 30];

const pct = (n, d) => (d ? Math.round((n / d) * 10000) / 100 : 0); // percentage, 2 dp
const round = (x, dp = 3) => Math.round(x * 10 ** dp) / 10 ** dp;

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function describe(values) {
  const s = [...values].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    n: s.length,
    mean: round(sum / Math.max(1, s.length), 2),
    median: round(quantile(s, 0.5), 1),
    p75: round(quantile(s, 0.75), 1),
    p90: round(quantile(s, 0.9), 1),
    p95: round(quantile(s, 0.95), 1),
    p99: round(quantile(s, 0.99), 1),
    max: s.at(-1) ?? null,
  };
}

function ranks(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(values.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

function pearson(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

const spearman = (x, y) => pearson(ranks(x), ranks(y));

function buckets(fns) {
  const out = {};
  for (const [label, lo, hi] of BUCKETS) {
    const count = fns.filter(
      (f) => f.cognitive >= lo && f.cognitive <= hi
    ).length;
    out[label] = { count, pct: pct(count, fns.length) };
  }
  return out;
}

function thresholdStats(fns, key) {
  const out = {};
  for (const t of THRESHOLDS) {
    const over = fns.filter((f) => f[key] > t);
    out[`over${t}`] = {
      count: over.length,
      pct: pct(over.length, fns.length),
      files: new Set(over.map((f) => `${f.repo}/${f.file}`)).size,
    };
  }
  return out;
}

function limitComparison(fns) {
  const over15 = fns.filter((f) => f.cognitive > 15).length;
  const over20 = fns.filter((f) => f.cognitive > 20).length;
  const over25 = fns.filter((f) => f.cognitive > 25).length;
  return {
    over15,
    over20,
    over25,
    extraFlaggedAt15vs20: over15 - over20, // functions scoring 16-20
    extraFlaggedAt20vs25: over20 - over25, // functions scoring 21-25
    ratio15to20: over20 ? round(over15 / over20, 3) : null,
    pctMoreAt15than20: over20
      ? round(((over15 - over20) / over20) * 100, 1)
      : null,
    filesWithOver15: new Set(
      fns.filter((f) => f.cognitive > 15).map((f) => `${f.repo}/${f.file}`)
    ).size,
    filesWithOver20: new Set(
      fns.filter((f) => f.cognitive > 20).map((f) => `${f.repo}/${f.file}`)
    ).size,
  };
}

function crossTab(fns, t) {
  const both = fns.filter((f) => f.cognitive > t && f.cyclomatic > t).length;
  const cogOnly = fns.filter(
    (f) => f.cognitive > t && f.cyclomatic <= t
  ).length;
  const cycOnly = fns.filter(
    (f) => f.cognitive <= t && f.cyclomatic > t
  ).length;
  return {
    threshold: t,
    both,
    cognitiveOnly: cogOnly,
    cyclomaticOnly: cycOnly,
    neither: fns.length - both - cogOnly - cycOnly,
  };
}

const meta = {};
const permalink = (f) => {
  const m = meta[f.repo];
  return `https://github.com/${m.github}/blob/${m.sha}/${f.file}#L${f.startLine}-L${f.endLine}`;
};
const brief = (f) => ({
  repo: f.repo,
  file: f.file,
  name: f.name,
  kind: f.kind,
  depth: f.depth,
  startLine: f.startLine,
  endLine: f.endLine,
  lines: f.lines,
  cognitive: f.cognitive,
  cyclomatic: f.cyclomatic,
  permalink: permalink(f),
});

function correlation(fns) {
  const cog = fns.map((f) => f.cognitive);
  const cyc = fns.map((f) => f.cyclomatic);
  const nz = fns.filter((f) => f.cognitive > 0);
  const top = fns.filter((f) => f.depth === 0);
  return {
    spearmanAll: round(spearman(cog, cyc)),
    pearsonAll: round(pearson(cog, cyc)),
    spearmanCognitiveNonzero: round(
      spearman(
        nz.map((f) => f.cognitive),
        nz.map((f) => f.cyclomatic)
      )
    ),
    spearmanTopLevelOnly: round(
      spearman(
        top.map((f) => f.cognitive),
        top.map((f) => f.cyclomatic)
      )
    ),
    n: fns.length,
    nCognitiveNonzero: nz.length,
    nTopLevel: top.length,
  };
}

// Attribution sensitivity: sonarjs scores each function on its own (callbacks are separate).
// The whitepaper instead adds a nested function's increments to its enclosing function (with an
// extra nesting level). `subtree` = own score + every descendant's own score is a LOWER BOUND on
// that whitepaper-style total (it ignores the extra nesting), computed for top-level functions.
function attributionSensitivity(fns) {
  const byFile = new Map();
  for (const f of fns) {
    const k = `${f.repo}/${f.file}`;
    if (!byFile.has(k)) byFile.set(k, []);
    byFile.get(k)[f.index] = f;
  }
  const subtree = new Map();
  for (const list of byFile.values()) {
    // children appear after parents in pre-order, so walk backwards accumulating into parents
    const sums = list.map((f) => f.cognitive);
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      if (f.parentIndex !== null) sums[f.parentIndex] += sums[i];
    }
    for (const f of list) subtree.set(f, sums[f.index]);
  }
  const top = fns.filter((f) => f.depth === 0);
  const ownOver20 = top.filter((f) => f.cognitive > 20).length;
  const subtreeOver20 = top.filter((f) => subtree.get(f) > 20).length;
  return {
    topLevelFunctions: top.length,
    topLevelOwnOver20: ownOver20,
    topLevelSubtreeLowerBoundOver20: subtreeOver20,
    allFunctionsOwnOver20: fns.filter((f) => f.cognitive > 20).length,
  };
}

function summarise(fns) {
  return {
    attributionSensitivity: attributionSensitivity(fns),
    functions: fns.length,
    topLevelFunctions: fns.filter((f) => f.depth === 0).length,
    nestedFunctions: fns.filter((f) => f.depth > 0).length,
    cognitive: describe(fns.map((f) => f.cognitive)),
    cyclomatic: describe(fns.map((f) => f.cyclomatic)),
    buckets: buckets(fns),
    cognitiveThresholds: thresholdStats(fns, "cognitive"),
    cyclomaticThresholds: thresholdStats(fns, "cyclomatic"),
    limits: limitComparison(fns),
    correlation: correlation(fns),
    crossTab20: crossTab(fns, 20),
    crossTab15: crossTab(fns, 15),
    over20NestedShare: pct(
      fns.filter((f) => f.cognitive > 20 && f.depth > 0).length,
      fns.filter((f) => f.cognitive > 20).length
    ),
    // Functions containing the pattern that triggers the sonarjs nesting leak.
    sonarLeakPattern: {
      functions: fns.filter((f) => f.own.ternaryFunctionBranch > 0).length,
      over20: fns.filter(
        (f) => f.own.ternaryFunctionBranch > 0 && f.cognitive > 20
      ).length,
    },
  };
}

// ---------------------------------------------------------------------------------------------
const perRepo = {};
const all = [];
for (const { name } of config.repos) {
  const d = JSON.parse(
    readFileSync(join(OUT, `${name}.functions.json`), "utf8")
  );
  meta[name] = { github: d.github, sha: d.sha };
  const fns = d.functions.map((f) => ({ ...f, repo: name }));
  all.push(...fns);
  const biomePath = join(OUT, `${name}.biome-compare.json`);
  const biome = existsSync(biomePath)
    ? JSON.parse(readFileSync(biomePath, "utf8")).summary
    : null;
  perRepo[name] = {
    github: d.github,
    sha: d.sha,
    commitDate: d.commitDate,
    includedDirs: d.include,
    repoSpecificExclusions: d.repoSpecificExclude,
    excludedFileCounts: d.excludedCounts,
    excludedFilesDetail: d.excludedFiles,
    filesLinted: d.files.linted,
    parseFailures: d.files.parseFailures,
    physicalLines: d.linesOfCode,
    lintSeconds: d.seconds,
    join: {
      unmatchedSonarReports: d.join.unmatchedSonarReports.length,
      unmatchedCyclomaticReports: d.join.unmatchedCyclomaticReports.length,
      functionsWithoutCyclomatic: d.join.functionsWithoutCyclomatic,
      duplicateKeys: d.join.duplicateKeys.length,
      classFieldInitializers: d.join.classFieldInitializers,
      classFieldInitializerComplexityReports:
        d.join.classFieldInitializerReports,
      staticBlockComplexityReports: d.join.staticBlockReports,
    },
    ...summarise(fns),
    over20Per10kLines: round(
      (fns.filter((f) => f.cognitive > 20).length / d.linesOfCode) * 10000,
      2
    ),
    biome,
  };
}

const external = all.filter((f) => EXTERNAL.includes(f.repo));
const medianAcrossRepos = (key) => {
  const vals = EXTERNAL.map((n) => key(perRepo[n])).sort((a, b) => a - b);
  return { median: quantile(vals, 0.5), min: vals[0], max: vals.at(-1) };
};

// Zod sensitivity: its 50+ near-identical locale files.
const zodNoLocales = all.filter(
  (f) => f.repo === "zod" && !f.file.includes("/locales/")
);

// Examples: candidate lists (final picks are documented in REPORT.md and in `examples` below).
const sortBy = (arr, fn) => [...arr].sort((a, b) => fn(b) - fn(a));
const candidates = {
  highCyclomaticLowCognitive: sortBy(
    external.filter((f) => f.cyclomatic > 20 && f.cognitive <= 5),
    (f) => f.cyclomatic - f.cognitive
  )
    .slice(0, 25)
    .map(brief),
  highCognitiveLowCyclomatic: sortBy(
    external.filter((f) => f.cognitive > 20 && f.cyclomatic <= 12),
    (f) => f.cognitive - f.cyclomatic
  )
    .slice(0, 25)
    .map(brief),
  cognitive21to30Small: [
    ...external.filter(
      (f) =>
        f.cognitive >= 21 && f.cognitive <= 30 && f.depth === 0 && f.lines <= 60
    ),
  ]
    .sort((a, b) => a.lines - b.lines)
    .map(brief),
};
const topCognitive = sortBy(all, (f) => f.cognitive)
  .slice(0, 25)
  .map(brief);
const extremeDisagreements = {
  cyclomaticMinusCognitive: sortBy(all, (f) => f.cyclomatic - f.cognitive)
    .slice(0, 15)
    .map(brief),
  cognitiveMinusCyclomatic: sortBy(all, (f) => f.cognitive - f.cyclomatic)
    .slice(0, 15)
    .map(brief),
  // Ratio-based, requiring the larger metric to exceed 20 so tiny functions don't dominate.
  cyclomaticOver20CognitiveRatio: sortBy(
    all.filter((f) => f.cyclomatic > 20),
    (f) => f.cyclomatic / Math.max(1, f.cognitive)
  )
    .slice(0, 15)
    .map(brief),
  cognitiveOver20CyclomaticRatio: sortBy(
    all.filter((f) => f.cognitive > 20),
    (f) => f.cognitive / Math.max(1, f.cyclomatic)
  )
    .slice(0, 15)
    .map(brief),
};

// Biome: pooled.
const biomeRepos = config.repos
  .map((r) => r.name)
  .filter((n) => perRepo[n].biome);
const biomePooled = {};
for (const k of [
  "functions",
  "comparable",
  "exactAgreement",
  "biomeHigher",
  "biomeLower",
  "disagreements",
]) {
  biomePooled[k] = biomeRepos.reduce((s, n) => s + perRepo[n].biome[k], 0);
}
biomePooled.cleanSubset = {
  functions: biomeRepos.reduce(
    (s, n) => s + perRepo[n].biome.cleanSubset.functions,
    0
  ),
  agree: biomeRepos.reduce((s, n) => s + perRepo[n].biome.cleanSubset.agree, 0),
};
biomePooled.disagreementsByMechanism = {};
biomePooled.unexplained = 0;
for (const n of biomeRepos) {
  for (const [k, v] of Object.entries(
    perRepo[n].biome.disagreementsByMechanism
  )) {
    biomePooled.disagreementsByMechanism[k] =
      (biomePooled.disagreementsByMechanism[k] ?? 0) + v;
  }
  biomePooled.unexplained +=
    perRepo[n].biome.disagreementCauses.unexplained ?? 0;
}
biomePooled.thresholds = {
  sonar: { over15: 0, over20: 0, over25: 0 },
  biome: { over15: 0, over20: 0, over25: 0 },
};
for (const n of biomeRepos) {
  for (const tool of ["sonar", "biome"]) {
    for (const t of ["over15", "over20", "over25"])
      biomePooled.thresholds[tool][t] += perRepo[n].biome.thresholds[tool][t];
  }
}
// Note: Biome-side thresholds are computed only over functions in files Biome could parse.

// Same nominal limit, different implementations: pooled over-threshold counts for t = 10..30, and
// the sonarjs limit whose flagged count is closest to Biome's at 20 (and vice versa).
{
  const rows = [];
  for (const n of biomeRepos) {
    const external = EXTERNAL.includes(n);
    for (const r of JSON.parse(
      readFileSync(join(OUT, `${n}.biome-compare.json`), "utf8")
    ).rows) {
      rows.push({ sonar: r.sonar, biome: r.biome ?? 1, external });
    }
  }
  const curve = (subset) => {
    const out = {};
    for (let t = 10; t <= 30; t++) {
      out[t] = {
        sonar: subset.filter((r) => r.sonar > t).length,
        biome: subset.filter((r) => r.biome > t).length,
      };
    }
    return out;
  };
  const closest = (c, key, target) =>
    Number(
      Object.entries(c).sort(
        (a, b) => Math.abs(a[1][key] - target) - Math.abs(b[1][key] - target)
      )[0][0]
    );
  const ext8 = rows.filter((r) => r.external);
  const c = curve(ext8);
  biomePooled.sameLimitDifferentCounts = {
    scope: "8 external repos, functions in files Biome could parse",
    functions: ext8.length,
    overThreshold: c,
    sonarLimitMatchingBiomeAt20: closest(c, "sonar", c[20].biome),
    biomeLimitMatchingSonarAt20: closest(c, "biome", c[20].sonar),
    spearmanSonarVsBiome: round(
      spearman(
        ext8.map((r) => r.sonar),
        ext8.map((r) => r.biome)
      )
    ),
  };
}

const examplesPath = join(HERE, "examples", "examples.json");
const calibrationPath = join(OUT, "calibration.biome-compare.json");
const calibration = existsSync(calibrationPath)
  ? JSON.parse(readFileSync(calibrationPath, "utf8")).rows.map((r) => ({
      file: `calibration/${r.file}`,
      line: r.startLine,
      name: r.name,
      depth: r.depth,
      sonarjs: r.sonar,
      biome: r.biome === null ? "<=1" : r.biome,
      cyclomatic: r.cyclomatic,
    }))
  : null;
const results = {
  generatedAt: new Date().toISOString(),
  tools: versions(),
  rules: {
    cognitive:
      "eslint-plugin-sonarjs `sonarjs/cognitive-complexity` with threshold 0",
    cyclomatic: "ESLint core `complexity` with { max: 0, variant: 'classic' }",
    biome:
      "Biome `complexity/noExcessiveCognitiveComplexity` with maxAllowedComplexity 1 (lowest allowed)",
    unit: "ESLint `:function` = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression (incl. methods, accessors, constructors, class-field arrows)",
  },
  buckets: BUCKETS.map(([label]) => label),
  repos: perRepo,
  aggregate: {
    external8: { repos: EXTERNAL, ...summarise(external) },
    all9: { repos: config.repos.map((r) => r.name), ...summarise(all) },
    medianAcrossExternalRepos: {
      pctOver15: medianAcrossRepos((r) => r.cognitiveThresholds.over15.pct),
      pctOver20: medianAcrossRepos((r) => r.cognitiveThresholds.over20.pct),
      pctOver25: medianAcrossRepos((r) => r.cognitiveThresholds.over25.pct),
      ratio15to20: medianAcrossRepos((r) => r.limits.ratio15to20),
      spearmanAll: medianAcrossRepos((r) => r.correlation.spearmanAll),
      pctCyclomaticOver20: medianAcrossRepos(
        (r) => r.cyclomaticThresholds.over20.pct
      ),
    },
    zodWithoutLocales: summarise(zodNoLocales),
  },
  biomeCrossCheck: {
    pooledAllRepos: biomePooled,
    perRepo: Object.fromEntries(biomeRepos.map((n) => [n, perRepo[n].biome])),
  },
  topCognitive,
  extremeDisagreements,
  exampleCandidates: candidates,
  examples: existsSync(examplesPath)
    ? JSON.parse(readFileSync(examplesPath, "utf8"))
    : null,
  oxlintCyclomaticParity: {
    note: "Side check: oxlint `complexity` (max 0) vs ESLint core `complexity` (classic), joined on function start/end line. Residual mismatches are mostly join ambiguity (oxlint also reports class-field initializers spanning the same lines as a class-field arrow).",
    perRepo: Object.fromEntries(
      config.repos
        .map((r) => r.name)
        .filter((n) => existsSync(join(OUT, `${n}.oxlint-parity.json`)))
        .map((n) => {
          const { sampleDiffs, ...s } = JSON.parse(
            readFileSync(join(OUT, `${n}.oxlint-parity.json`), "utf8")
          );
          return [n, s];
        })
    ),
  },
  calibration: {
    note: "Hand-written cases (calibration/*.ts[x]) used to pin down what each implementation counts. Biome reveals only scores >= 2 (maxAllowedComplexity minimum is 1).",
    cases: calibration,
  },
};
// Biome summaries are already nested under biomeCrossCheck; keep repos[*].biome compact.
for (const n of Object.keys(perRepo)) {
  if (perRepo[n].biome) {
    const { unmatched, otherDiagnosticSamples, ...rest } = perRepo[n].biome;
    perRepo[n].biome = { ...rest, unmatched: unmatched.length };
  }
}

mkdirSync(RESULTS_DIR, { recursive: true });
writeFileSync(
  join(RESULTS_DIR, "results.json"),
  `${JSON.stringify(results, null, 2)}\n`
);
const e = results.aggregate.external8;
console.log(
  `external8: ${e.functions} functions; >15 ${e.limits.over15} (${e.cognitiveThresholds.over15.pct}%), >20 ${e.limits.over20} (${e.cognitiveThresholds.over20.pct}%), >25 ${e.limits.over25} (${e.cognitiveThresholds.over25.pct}%); ratio15/20 ${e.limits.ratio15to20}; spearman ${e.correlation.spearmanAll}`
);
