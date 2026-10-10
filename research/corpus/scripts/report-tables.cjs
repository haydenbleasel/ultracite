// Renders the Markdown tables used in REPORT.md: results/<topic>/results.json ->
// results/<topic>/tables.md.
// Usage: node report-tables.cjs
"use strict";

const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const { RESULTS_DIR, TOPIC } = require("./tools.cjs");

const r = JSON.parse(readFileSync(join(RESULTS_DIR, "results.json"), "utf8"));
const repos = Object.keys(r.repos);
const ext = r.aggregate.external8;
const fmt = (n) =>
  typeof n === "number" ? n.toLocaleString("en-US") : String(n);
const p = (x) => `${x.toFixed(2)}%`;
const cell = (v) => String(v).replace(/\|/g, "\\|");
const table = (head, rows) =>
  [
    `| ${head.map(cell).join(" | ")} |`,
    `| ${head.map((h, i) => (i === 0 ? "---" : "---:")).join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
const link = (f, label) =>
  `[${label ?? `${f.file}#L${f.startLine}`}](${f.permalink})`;
const out = [];

out.push("### Corpus\n");
out.push(
  table(
    [
      "Repo",
      "Commit",
      "Included dirs",
      "Files",
      "Lines",
      "Functions",
      "Nested fns",
      "Mean",
      "Median",
      "p95",
      "Max",
    ],
    repos.map((n) => {
      const x = r.repos[n];
      return [
        n,
        `\`${x.sha.slice(0, 10)}\``,
        x.includedDirs.map((d) => `\`${d}\``).join("<br>"),
        fmt(x.filesLinted),
        fmt(x.physicalLines),
        fmt(x.functions),
        p((x.nestedFunctions / x.functions) * 100),
        x.cognitive.mean,
        x.cognitive.median,
        x.cognitive.p95,
        x.cognitive.max,
      ];
    })
  )
);
out.push(
  `\nPooled, 8 external repos: ${fmt(ext.functions)} functions (${fmt(ext.nestedFunctions)} nested, ${p((ext.nestedFunctions / ext.functions) * 100)}); ` +
    `cognitive mean ${ext.cognitive.mean}, median ${ext.cognitive.median}, p90 ${ext.cognitive.p90}, p95 ${ext.cognitive.p95}, p99 ${ext.cognitive.p99}, max ${ext.cognitive.max}.\n`
);

out.push(
  "### Cognitive complexity distribution (share of functions per bucket)\n"
);
const bucketRow = (label, s) => [
  label,
  ...r.buckets.map((b) => p(s.buckets[b].pct)),
  fmt(s.functions),
];
out.push(
  table(
    ["Repo", ...r.buckets, "n"],
    [
      ...repos.map((n) => bucketRow(n, r.repos[n])),
      bucketRow("**8 external, pooled**", ext),
      bucketRow("all 9, pooled", r.aggregate.all9),
      bucketRow("zod without locales", r.aggregate.zodWithoutLocales),
    ]
  )
);
out.push("\nCounts (8 external, pooled):\n");
out.push(
  table(
    ["Bucket", ...r.buckets],
    [["Functions", ...r.buckets.map((b) => fmt(ext.buckets[b].count))]]
  )
);

out.push("\n### Limits: how many functions are over 15, 20 and 25\n");
const limRow = (label, s) => {
  const t = s.cognitiveThresholds;
  return [
    label,
    `${fmt(t.over15.count)} (${p(t.over15.pct)})`,
    `${fmt(t.over20.count)} (${p(t.over20.pct)})`,
    `${fmt(t.over25.count)} (${p(t.over25.pct)})`,
    fmt(s.limits.extraFlaggedAt15vs20),
    s.limits.ratio15to20 === null
      ? "n/a"
      : `${s.limits.ratio15to20.toFixed(2)}×`,
    `${fmt(s.limits.filesWithOver15)} / ${fmt(s.limits.filesWithOver20)}`,
  ];
};
out.push(
  table(
    [
      "Repo",
      "> 15",
      "> 20",
      "> 25",
      "Extra at 15 vs 20 (scores 16–20)",
      "> 15 ÷ > 20",
      "Files with a fn > 15 / > 20",
    ],
    [
      ...repos.map((n) => limRow(n, r.repos[n])),
      limRow("**8 external, pooled**", ext),
      limRow("all 9, pooled", r.aggregate.all9),
      limRow("zod without locales", r.aggregate.zodWithoutLocales),
    ]
  )
);
const m = r.aggregate.medianAcrossExternalRepos;
out.push(
  `\nMedian across the 8 external repos: > 15 = ${p(m.pctOver15.median)} (range ${p(m.pctOver15.min)}–${p(m.pctOver15.max)}), ` +
    `> 20 = ${p(m.pctOver20.median)} (range ${p(m.pctOver20.min)}–${p(m.pctOver20.max)}), ` +
    `> 25 = ${p(m.pctOver25.median)} (range ${p(m.pctOver25.min)}–${p(m.pctOver25.max)}); ` +
    `ratio > 15 ÷ > 20 = ${m.ratio15to20.median.toFixed(2)}× (range ${m.ratio15to20.min.toFixed(2)}–${m.ratio15to20.max.toFixed(2)}).\n`
);

out.push("### Cyclomatic vs cognitive\n");
const cycRow = (label, s) => [
  label,
  `${fmt(s.cyclomaticThresholds.over20.count)} (${p(s.cyclomaticThresholds.over20.pct)})`,
  s.cyclomatic.median,
  s.cyclomatic.p95,
  s.cyclomatic.max,
  s.correlation.spearmanAll.toFixed(3),
  s.correlation.spearmanCognitiveNonzero.toFixed(3),
  fmt(s.crossTab20.both),
  fmt(s.crossTab20.cognitiveOnly),
  fmt(s.crossTab20.cyclomaticOnly),
];
out.push(
  table(
    [
      "Repo",
      "Cyclomatic > 20",
      "Cyc median",
      "Cyc p95",
      "Cyc max",
      "Spearman ρ (all)",
      "ρ (cognitive > 0)",
      "Both > 20",
      "Cognitive > 20 only",
      "Cyclomatic > 20 only",
    ],
    [
      ...repos.map((n) => cycRow(n, r.repos[n])),
      cycRow("**8 external, pooled**", ext),
      cycRow("all 9, pooled", r.aggregate.all9),
    ]
  )
);
out.push(
  `\nPooled Pearson r (8 external) = ${ext.correlation.pearsonAll}; Spearman on top-level functions only = ${ext.correlation.spearmanTopLevelOnly} (n = ${fmt(ext.correlation.nTopLevel)}).\n`
);

out.push("Most extreme disagreements (all 9 repos):\n");
const dis = (title, list, n = 8) => {
  out.push(`${title}\n`);
  out.push(
    table(
      ["Function", "Repo", "Cognitive", "Cyclomatic", "Lines"],
      list
        .slice(0, n)
        .map((f) => [
          link(f, `\`${f.name}\``),
          f.repo,
          f.cognitive,
          f.cyclomatic,
          f.lines,
        ])
    )
  );
  out.push("");
};
dis(
  "Largest cyclomatic − cognitive:",
  r.extremeDisagreements.cyclomaticMinusCognitive
);
dis(
  "Largest cognitive − cyclomatic:",
  r.extremeDisagreements.cognitiveMinusCyclomatic
);
dis(
  "Highest cyclomatic ÷ cognitive among functions with cyclomatic > 20:",
  r.extremeDisagreements.cyclomaticOver20CognitiveRatio
);
dis(
  "Highest cognitive ÷ cyclomatic among functions with cognitive > 20:",
  r.extremeDisagreements.cognitiveOver20CyclomaticRatio
);

out.push("### Top 15 functions by cognitive complexity (all 9 repos)\n");
out.push(
  table(
    ["#", "Function", "Repo", "Cognitive", "Cyclomatic", "Lines"],
    r.topCognitive
      .slice(0, 15)
      .map((f, i) => [
        i + 1,
        link(f, `\`${f.name}\``),
        f.repo,
        f.cognitive,
        f.cyclomatic,
        f.lines,
      ])
  )
);

out.push("\n### Biome cross-check\n");
const bp = r.biomeCrossCheck.pooledAllRepos;
out.push(
  table(
    [
      "Repo",
      "Functions compared",
      "Visible (either ≥ 2)",
      "Exact match",
      "Biome higher",
      "Biome lower",
      "Clean subset agree",
      "sonarjs > 20",
      "Biome > 20",
    ],
    [
      ...repos.map((n) => {
        const b = r.biomeCrossCheck.perRepo[n];
        return [
          n,
          fmt(b.functions),
          fmt(b.comparable),
          `${fmt(b.exactAgreement)} (${p((b.exactAgreement / b.comparable) * 100)})`,
          fmt(b.biomeHigher),
          fmt(b.biomeLower),
          `${fmt(b.cleanSubset.agree)} / ${fmt(b.cleanSubset.functions)}`,
          fmt(b.thresholds.sonar.over20),
          fmt(b.thresholds.biome.over20),
        ];
      }),
      [
        "**all 9**",
        fmt(bp.functions),
        fmt(bp.comparable),
        `${fmt(bp.exactAgreement)} (${p((bp.exactAgreement / bp.comparable) * 100)})`,
        fmt(bp.biomeHigher),
        fmt(bp.biomeLower),
        `${fmt(bp.cleanSubset.agree)} / ${fmt(bp.cleanSubset.functions)}`,
        fmt(bp.thresholds.sonar.over20),
        fmt(bp.thresholds.biome.over20),
      ],
    ]
  )
);
out.push(
  "\nDisagreements by mechanism (a function can show several; all 9 repos):\n"
);
out.push(
  table(
    ["Mechanism", "Disagreeing functions that contain it"],
    [
      ...Object.entries(bp.disagreementsByMechanism)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, fmt(v)]),
      ["none of the above (unexplained)", fmt(bp.unexplained)],
    ]
  )
);
out.push(`\nTotal disagreements: ${fmt(bp.disagreements)}.\n`);
const same = bp.sameLimitDifferentCounts;
out.push(
  `Same nominal limit, different counts (${same.scope}; n = ${fmt(same.functions)}):\n`
);
out.push(
  table(
    [
      "Limit",
      "sonarjs flags (score > limit)",
      "Biome flags (score > limit)",
      "Biome ÷ sonarjs",
    ],
    [15, 16, 18, 20, 22, 25, 30].map((t) => {
      const o = same.overThreshold[t];
      return [
        t,
        fmt(o.sonar),
        fmt(o.biome),
        `${(o.biome / o.sonar).toFixed(2)}×`,
      ];
    })
  )
);
out.push(
  `\nBiome at 20 flags about as many functions as sonarjs at ${same.sonarLimitMatchingBiomeAt20}; sonarjs at 20 flags about as many as Biome at ${same.biomeLimitMatchingSonarAt20}. Spearman ρ between the two scores = ${same.spearmanSonarVsBiome} (Biome's hidden 0/1 coded as 1).\n`
);

out.push("### Examples\n");
out.push(
  table(
    [
      "Example",
      "Function",
      "Repo",
      "Cognitive (sonarjs)",
      "Cyclomatic",
      "Biome",
      "Lines",
      "File",
    ],
    r.examples.map((e) => [
      e.role,
      link(e, `\`${e.name}\``),
      e.repo,
      e.cognitive,
      e.cyclomatic,
      e.biome === null ? "≤ 1" : e.biome,
      `${e.startLine}–${e.endLine}`,
      `\`${e.exampleFile}\``,
    ])
  )
);

out.push("\n### Exclusions per repo (file counts)\n");
out.push(
  table(
    ["Repo", "Included files", "Excluded (by reason)"],
    repos.map((n) => {
      const x = r.repos[n];
      const reasons = Object.entries(x.excludedFileCounts)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
      return [n, fmt(x.filesLinted), reasons || "none"];
    })
  )
);

writeFileSync(join(RESULTS_DIR, "tables.md"), `${out.join("\n")}\n`);
console.log(`wrote results/${TOPIC}/tables.md (${out.length} blocks)`);
