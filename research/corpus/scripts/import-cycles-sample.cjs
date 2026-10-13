// Hand classification of Oxlint's import/no-cycle reports.
//
// Population: every import/no-cycle diagnostic Oxlint reports on the corpus with Ultracite's
// default root config (import-cycles-graph.cjs, out/import-cycles/graph/<repo>.json). Each one
// names a concrete cycle in its note: the importing file, the module it imports, and the path back.
// That path is the unit classified.
//
//   --worksheet   draws a seeded sample (up to PER_REPO per repo) and writes it to sample.json, plus
//                 a worksheet (out/import-cycles/worksheet.md) with the cycle path, each hop's
//                 import lines and permalinks at the pinned SHAs. The automatic label is left out of
//                 the worksheet. Reruns rewrite the worksheet from the frozen sample; --resample
//                 draws again.
//   --print       prints the blind subset (BLIND items) for a second rater, without any labels.
//   --compute     reads out/import-cycles/labels-rater1.json and labels-rater2.json and writes
//                 classifications.json: both raters' labels, agreement and Cohen's kappa between
//                 them and against the automatic labels.
"use strict";

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const ic = require("./import-cycles-lib.cjs");

const SEED = 20_261_013;
const PER_REPO = 8;
const BLIND = 20;
const SAMPLE = join(ic.RESULTS_DIR, "sample.json");

const CODEBOOK = {
  label: {
    "type-only":
      "The cycle never exists at runtime: at least one hop is removed when the file is compiled with the repo's own settings (an `import type`, an import whose bindings are only used as types or not at all while verbatimModuleSyntax is off, or a type-only re-export).",
    "barrel-induced":
      "The cycle exists at runtime only because a hop imports from a module that re-exports (a barrel, an index file or a package entry). If that import pointed at the module that declares the names, this cycle would not exist.",
    "top-level-use":
      "The cycle exists at runtime and some module on it reads a value imported from another module on it while it is being evaluated: a top-level statement or const initializer, a class `extends`, a static member, a decorator, or a top-level call that reaches the import. Depending on which module loads first, that read can throw a TDZ ReferenceError or see undefined.",
    "late-use":
      "The cycle exists at runtime and every value imported along it is only used inside functions or methods that run after all modules have loaded. Under ESM this is benign.",
    unclear: "The code doesn't let you decide.",
  },
  risk: "For barrel-induced cycles, also say whether a value is read at module evaluation (top-level-use) or not (late-use).",
  rightFix: {
    "import-type":
      "mark the import(s) `import type` (only for type-only cycles)",
    "import-direct":
      "import from the declaring module instead of the re-exporting one",
    "extract-module":
      "move the shared code into a new or lower module that both can import",
    "move-code": "move a declaration from one file of the cycle to another",
    lazy: "defer the import (dynamic import() or a require inside a function)",
    leave: "leave it: the cycle is harmless and the change isn't worth it",
    other: "something else (say what)",
  },
};

// mulberry32
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d_2b_79_f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};
const shuffle = (list, random) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const repoMeta = Object.fromEntries(
  require("./repos.json").repos.map((r) => [r.name, r])
);

const draw = () => {
  const random = rng(SEED);
  const items = [];
  for (const name of ic.EXTERNAL) {
    const detail = ic.readJson(join(ic.OUT_DIR, "graph", `${name}.json`));
    const reports = [...detail.oxlint.reports].sort((a, b) =>
      `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`)
    );
    for (const r of shuffle(reports, random).slice(0, PER_REPO)) {
      items.push({ file: r.file, line: r.line, repo: name });
    }
  }
  return items.map((x, i) => ({
    id: `ic${String(i + 1).padStart(3, "0")}`,
    ...x,
  }));
};

const lineText = (root, file, line) => {
  const path = join(root, file);
  if (!existsSync(path)) {
    return "";
  }
  const lines = readFileSync(path, "utf8").split("\n");
  // the import statement may span lines: show from `line` back to its start and forward to `from`
  let start = line - 1;
  while (
    start > 0 &&
    !/^\s*(?:import|export)\b/.test(lines[start]) &&
    line - start < 40
  ) {
    start--;
  }
  let end = line - 1;
  while (
    end < lines.length - 1 &&
    !/from\s+['"]|^\s*import\s+['"]|\)\s*;?\s*$/.test(lines[end]) &&
    end - line < 40
  ) {
    end++;
  }
  return lines.slice(start, end + 1).join("\n");
};

const worksheet = (sample) => {
  const out = [
    "# Import cycle classification worksheet",
    "",
    "Each item is one `import/no-cycle` report from Oxlint (Ultracite's default config) on the corpus, with the cycle path its note prints. Read the code in `research/corpus/repos/<repo>/` (read-only) or at the permalinks. Classify the cycle with the codebook in `results/import-cycles/sample.json` (`codebook`).",
    "",
    "For each item give: `label` (type-only | barrel-induced | top-level-use | late-use | unclear), `risk` (top-level-use | late-use, for barrel-induced), `evidence` (file:line of the deciding code and one sentence), and `rightFix` (import-type | import-direct | extract-module | move-code | lazy | leave | other).",
    "",
    "Repo compile settings that matter: verbatimModuleSyntax is ON in astro and next.js (only `import type` and inline `type` specifiers are removed), OFF elsewhere (imports whose bindings are only used as types, or unused, are removed by TypeScript, esbuild and SWC).",
    "",
  ];
  for (const item of sample.items) {
    const detail = ic.readJson(join(ic.OUT_DIR, "graph", `${item.repo}.json`));
    const report = detail.oxlint.reports.find(
      (r) => r.file === item.file && r.line === item.line
    );
    const meta = repoMeta[item.repo];
    const root = ic.getRepo(item.repo).root;
    const sha = sample.shas[item.repo];
    out.push(
      `## ${item.id} · ${item.repo} · \`${item.file}:${item.line}\``,
      "",
      `Report: ${ic.permalink(meta.github, sha, item.file, item.line)}`,
      "",
      "Cycle (each hop: the importing file, the module it imports, and the import lines):",
      ""
    );
    report.hops.forEach((h, i) => {
      const stmts = detail.statements.filter(
        (s) => s.file === h.from && s.target === h.to
      );
      out.push(`${i + 1}. \`${h.from}\` → \`${h.to}\``);
      for (const s of stmts) {
        out.push(
          `   - L${s.line} ${ic.permalink(meta.github, sha, s.file, s.line)}`,
          "",
          "     ```ts",
          ...lineText(root, s.file, s.line)
            .split("\n")
            .map((l) => `     ${l}`),
          "     ```",
          ""
        );
      }
    });
    out.push("");
  }
  return out.join("\n");
};

const kappa = (pairs) => {
  const cats = [...new Set(pairs.flat())];
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const po = pairs.filter(([a, b]) => a === b).length / n;
  let pe = 0;
  for (const c of cats) {
    pe +=
      (pairs.filter(([a]) => a === c).length / n) *
      (pairs.filter(([, b]) => b === c).length / n);
  }
  return pe === 1 ? 1 : Math.round(((po - pe) / (1 - pe)) * 100) / 100;
};

const main = () => {
  let sample = ic.readJson(SAMPLE);
  if (ic.flag("worksheet") || ic.flag("resample")) {
    if (!sample || ic.flag("resample")) {
      const items = draw();
      sample = {
        blind: shuffle(
          items.map((x) => x.id),
          rng(SEED + 1)
        )
          .slice(0, BLIND)
          .sort(),
        codebook: CODEBOOK,
        generated: new Date().toISOString().slice(0, 10),
        items,
        method: `Seed ${SEED}; up to ${PER_REPO} import/no-cycle reports per repo, drawn from Oxlint's reports with Ultracite's default root config (core + react). Population sizes are in graph.json (oxlint.noCycle).`,
        population: Object.fromEntries(
          ic.EXTERNAL.map((n) => [
            n,
            ic.readJson(join(ic.OUT_DIR, "graph", `${n}.json`)).oxlint.reports
              .length,
          ])
        ),
        seed: SEED,
        shas: Object.fromEntries(
          ic.EXTERNAL.map((n) => [n, ic.gitHead(ic.getRepo(n).root)])
        ),
      };
      ic.writeJson(SAMPLE, sample);
    }
    writeFileSync(join(ic.OUT_DIR, "worksheet.md"), worksheet(sample));
    console.log(
      `sample: ${sample.items.length} items; worksheet at out/import-cycles/worksheet.md; blind ${sample.blind.join(",")}`
    );
  }
  if (ic.flag("print")) {
    const ws = readFileSync(join(ic.OUT_DIR, "worksheet.md"), "utf8");
    const blocks = ws.split(/\n(?=## ic\d+)/);
    const blind = new Set(sample.blind);
    writeFileSync(
      join(ic.OUT_DIR, "worksheet-blind.md"),
      [
        blocks[0],
        ...blocks.filter((b) => blind.has(/^## (ic\d+)/.exec(b)?.[1])),
      ].join("\n")
    );
    console.log("blind worksheet at out/import-cycles/worksheet-blind.md");
  }
  if (ic.flag("compute")) {
    const r1 = ic.readJson(join(ic.OUT_DIR, "labels-rater1.json"));
    const r2 = ic.readJson(join(ic.OUT_DIR, "labels-rater2.json"));
    const auto = new Map();
    for (const item of sample.items) {
      const detail = ic.readJson(
        join(ic.OUT_DIR, "graph", `${item.repo}.json`)
      );
      const r = detail.oxlint.reports.find(
        (x) => x.file === item.file && x.line === item.line
      );
      auto.set(item.id, { label: r.label, risk: r.risk });
    }
    const byId = (labels) =>
      new Map((labels?.labels ?? labels ?? []).map((l) => [l.id, l]));
    const a = byId(r1);
    const b = byId(r2);
    const items = sample.items.map((item) => ({
      ...item,
      auto: auto.get(item.id),
      rater1: a.get(item.id) ?? null,
      rater2: b.get(item.id) ?? null,
    }));
    const pairs = (x, y) =>
      items.filter((i) => x(i) && y(i)).map((i) => [x(i), y(i)]);
    const r1l = (i) => i.rater1?.label;
    const r2l = (i) => i.rater2?.label;
    const autol = (i) => i.auto?.label;
    const coarse = (l) =>
      ["type-only", "late-use"].includes(l)
        ? "harmless"
        : l === "unclear"
          ? "unclear"
          : "risky-or-barrel";
    const agree = (p) => ({
      kappa: kappa(p),
      n: p.length,
      same: p.filter(([x, y]) => x === y).length,
    });
    const count = (f) =>
      items.reduce((acc, i) => {
        const k = f(i);
        if (k) {
          acc[k] = (acc[k] ?? 0) + 1;
        }
        return acc;
      }, {});
    const result = {
      agreement: {
        rater1VsAuto: agree(pairs(r1l, autol)),
        rater1VsRater2: agree(pairs(r1l, r2l)),
        rater1VsRater2Coarse: agree(
          pairs(
            (i) => r1l(i) && coarse(r1l(i)),
            (i) => r2l(i) && coarse(r2l(i))
          )
        ),
        rater2VsAuto: agree(pairs(r2l, autol)),
      },
      codebook: CODEBOOK,
      counts: {
        auto: count(autol),
        rater1: count(r1l),
        rater1RightFix: count((i) => i.rater1?.rightFix),
        rater1Risk: count((i) =>
          i.rater1?.label === "barrel-induced" ? i.rater1?.risk : null
        ),
        rater2: count(r2l),
      },
      disagreements: items
        .filter((i) => r1l(i) && autol(i) && r1l(i) !== autol(i))
        .map((i) => ({
          auto: i.auto,
          id: i.id,
          rater1: i.rater1,
          rater2: i.rater2,
        })),
      generated: new Date().toISOString().slice(0, 10),
      items,
      method: sample.method,
      population: sample.population,
      raters:
        "Rater 1 (a Claude subagent) labelled every item from the worksheet, with read-only access to the clones and without the automatic label. Rater 2 (a separate Claude subagent) labelled the blind subset without either. Both raters are Claude models, so agreement measures how consistently the codebook applies.",
    };
    ic.writeJson(join(ic.RESULTS_DIR, "classifications.json"), result);
    console.log(
      JSON.stringify(result.agreement),
      JSON.stringify(result.counts)
    );
  }
};

main();
