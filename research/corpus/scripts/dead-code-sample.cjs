// Seeded samples of dead-code and duplication findings for hand classification, with worksheets
// (code context and GitHub permalinks at the pinned SHAs), a blind subset for a second rater, and
// agreement.
//
// Populations (raw mode: disable directives neutralised, so suppressed sites count):
//   unused      the union, per repo, of Oxlint's no-unused-vars (Ultracite's default rule) and
//               ESLint's @typescript-eslint/no-unused-vars / no-unused-vars (which also reports
//               `_`-prefixed names), deduplicated by file, line and name
//   dead-store  the union of sonarjs/no-dead-store (Oxlint js-plugins) and ESLint's
//               no-useless-assignment, minus sites already in `unused`
//   clone       the detector's outermost function-level clone classes in source (Type-2, which
//               includes Type-1; 4 per repo), and the sonarjs/no-identical-functions,
//               no-duplicated-branches and no-all-duplicated-branches hits (3 per repo)
//   export      every export the unused-export analysis found unreferenced (seeded sample of 25
//               where a repo has more), and every unreferenced file
// Each site is annotated with what Oxlint, ESLint, Biome and TypeScript say on its line.
//
// Usage (from the repo root):
//   node research/corpus/scripts/dead-code-sample.cjs --worksheet [--seed 20261012]
//   node research/corpus/scripts/dead-code-sample.cjs --print [--per-kind 20] [--seed 7]
//   node research/corpus/scripts/dead-code-sample.cjs --compute
// Writes results/dead-code/sample.json and out/dead-code/worksheet-<kind>.md; --compute writes
// agreement into results/dead-code/classifications.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const { getRepo } = require("./collect-files.cjs");
const { nameOf } = require("./dead-code-linters.cjs");

const SEED = Number(lib.arg("seed", "20261012"));
const PER = { clone: 7, "dead-store": 8, export: 25, unused: 12 };
const KINDS = ["unused", "dead-store", "clone", "export"];

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
const sample = (items, k, random) => {
  const copy = [...items];
  const n = Math.min(k, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};
const byPos = (a, b) =>
  a.file.localeCompare(b.file) ||
  a.line - b.line ||
  String(a.name).localeCompare(String(b.name));
const readJson = (p) =>
  existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;

const sources = (name) => {
  const census =
    readJson(
      join(lib.HERE, "out", "rule-census", lib.TOPIC, `${name}.raw.json`)
    )?.hits ?? [];
  const eslint =
    readJson(join(lib.OUT_DIR, "corpus", `${name}.eslint.json`))?.hits ?? [];
  const biome =
    readJson(join(lib.OUT_DIR, "corpus", `${name}.biome.json`))?.hits ?? [];
  const tsc =
    readJson(join(lib.OUT_DIR, "typed", `${name}.json`))?.diagnostics ?? [];
  return { biome, census, eslint, tsc };
};

const annotate = (src, file, line) => {
  const on = (rows) =>
    rows
      .filter((d) => d.file === file && d.line === line)
      .map((d) => `${d.rule ?? `TS${d.code}`}: ${d.message}`);
  return {
    biome: on(src.biome.filter((d) => lib.biomeCategoryOf(d.rule))),
    eslint: on(src.eslint),
    oxlint: on(src.census),
    tsc: on(src.tsc.map((d) => ({ ...d, rule: `TS${d.code}` }))),
  };
};

const populations = (name) => {
  const src = sources(name);
  const unused = new Map();
  const key = (d) => `${d.file}:${d.line}:${nameOf(d.message) ?? ""}`;
  for (const d of src.census.filter((h) => h.rule === "no-unused-vars")) {
    unused.set(key(d), {
      file: d.file,
      line: d.line,
      name: nameOf(d.message),
      rules: ["oxlint no-unused-vars"],
    });
  }
  for (const d of src.eslint.filter((h) =>
    ["@typescript-eslint/no-unused-vars", "no-unused-vars"].includes(h.rule)
  )) {
    const k = key(d);
    if (unused.has(k)) {
      unused.get(k).rules.push(`eslint ${d.rule}`);
    } else {
      unused.set(k, {
        file: d.file,
        line: d.line,
        name: nameOf(d.message),
        rules: [`eslint ${d.rule}`],
      });
    }
  }
  const dead = new Map();
  for (const d of [
    ...src.census
      .filter((h) => h.rule === "sonarjs/no-dead-store")
      .map((h) => ({ ...h, label: "oxlint sonarjs/no-dead-store" })),
    ...src.eslint
      .filter((h) => h.rule === "no-useless-assignment")
      .map((h) => ({ ...h, label: "eslint no-useless-assignment" })),
  ]) {
    const k = key(d);
    if (unused.has(k)) {
      unused.get(k).rules.push(d.label);
      continue;
    }
    if (dead.has(k)) {
      dead.get(k).rules.push(d.label);
    } else {
      dead.set(k, {
        file: d.file,
        line: d.line,
        name: nameOf(d.message),
        rules: [d.label],
      });
    }
  }
  // clones
  const clones = [];
  const cloneData = readJson(join(lib.OUT_DIR, "clones", `${name}.json`));
  for (const c of cloneData?.functionClasses ?? []) {
    if (c.mode !== "t2" || !c.members.every((m) => m.category === "source")) {
      continue;
    }
    const m = [...c.members].sort(byPos);
    clones.push({
      exact: c.exact,
      file: m[0].file,
      line: m[0].line,
      members: m.map((x) => ({
        endLine: x.endLine,
        file: x.file,
        kind: x.kind,
        line: x.line,
        name: x.name,
        tokens: x.tokens,
      })),
      name: m[0].name,
      origin: "detector (function, Type-2)",
      size: m.length,
    });
  }
  for (const h of src.census.filter((x) =>
    [
      "sonarjs/no-identical-functions",
      "sonarjs/no-duplicated-branches",
      "sonarjs/no-all-duplicated-branches",
    ].includes(x.rule)
  )) {
    const original = /line (\d+)/.exec(h.message)?.[1];
    clones.push({
      file: h.file,
      line: h.line,
      members: [
        ...(original ? [{ file: h.file, line: Number(original) }] : []),
        { file: h.file, line: h.line },
      ],
      message: h.message,
      name: null,
      origin: h.rule,
      size: original ? 2 : 1,
    });
  }
  // exports
  const exportsDetail = readJson(join(lib.OUT_DIR, "exports", `${name}.json`));
  const exportsPop = [
    ...(exportsDetail?.exports ?? [])
      .filter((r) => r.category === "unreferenced")
      .map((r) => ({
        file: r.file,
        isType: r.isType,
        line: r.line,
        name: r.exportName,
        publicVia: r.publicVia,
        textualReferences: r.textualReferences,
        what: "export",
      })),
    ...(exportsDetail?.files ?? [])
      .filter((r) => r.category === "unreferenced")
      .map((r) => ({
        file: r.file,
        line: 1,
        name: r.file.split("/").pop(),
        textualReferences: r.textualReferences,
        what: "file",
      })),
  ];
  return {
    clone: clones.sort(byPos),
    "dead-store": [...dead.values()].sort(byPos),
    export: exportsPop.sort(byPos),
    src,
    unused: [...unused.values()].sort(byPos),
  };
};

const context = (root, file, line, before = 8, after = 10) => {
  const path = join(root, file);
  if (!existsSync(path)) {
    return "(file not found)";
  }
  const lines = readFileSync(path, "utf8").split("\n");
  const from = Math.max(1, line - before);
  const to = Math.min(lines.length, line + after);
  const out = [];
  for (let i = from; i <= to; i++) {
    out.push(
      `${String(i).padStart(5)}${i === line ? ">" : " "} ${lines[i - 1]}`
    );
  }
  return out.join("\n");
};

// The sample is drawn once and then frozen: rerunning --worksheet rewrites the worksheets from
// sample.json unless --resample is passed, so hand labels keep pointing at the same sites even if an
// analysis is improved later (each export site records whether it is still a candidate).
const frozen = () => {
  const path = join(lib.RESULTS_DIR, "sample.json");
  if (lib.flag("resample") || !existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
};

const worksheet = () => {
  const previous = frozen();
  if (previous) {
    // refresh the export candidates' status against the current analysis
    for (const s of previous.sites.filter((x) => x.kind === "export")) {
      const detail = readJson(join(lib.OUT_DIR, "exports", `${s.repo}.json`));
      s.stillCandidate =
        s.what === "file"
          ? (detail?.files ?? []).some(
              (r) => r.file === s.file && r.category === "unreferenced"
            )
          : (detail?.exports ?? []).some(
              (r) =>
                r.file === s.file &&
                r.exportName === s.name &&
                r.category === "unreferenced"
            );
    }
    previous.currentPopulations = Object.fromEntries(
      lib.EXTERNAL.map((name) => {
        const pops = populations(name);
        return [
          name,
          Object.fromEntries(KINDS.map((k) => [k, pops[k].length])),
        ];
      })
    );
    writeSheets(previous.sites);
    writeFileSync(
      join(lib.RESULTS_DIR, "sample.json"),
      `${JSON.stringify(previous, null, 2)}\n`
    );
    console.log(
      "sample.json is frozen (pass --resample to draw again); worksheets rewritten"
    );
    return;
  }
  const random = rng(SEED);
  const sites = [];
  const totals = {};
  for (const name of lib.EXTERNAL) {
    const repo = getRepo(name);
    const sha = lib.gitHead(repo.root);
    const pops = populations(name);
    totals[name] = Object.fromEntries(KINDS.map((k) => [k, pops[k].length]));
    for (const kind of KINDS) {
      // Clones are stratified: detector classes and the sonarjs rules' hits are drawn separately.
      const picked = (
        kind === "clone"
          ? [
              ...sample(
                pops.clone.filter((c) => c.origin.startsWith("detector")),
                4,
                random
              ),
              ...sample(
                pops.clone.filter((c) => !c.origin.startsWith("detector")),
                3,
                random
              ),
            ]
          : sample(pops[kind], PER[kind], random)
      ).sort(byPos);
      for (const s of picked) {
        const id = `${kind[0]}${String(sites.filter((x) => x.kind === kind).length + 1).padStart(3, "0")}`;
        sites.push({
          ...s,
          id,
          kind,
          linters:
            kind === "unused" || kind === "dead-store"
              ? annotate(pops.src, s.file, s.line)
              : undefined,
          permalink: lib.permalink(repo.github, sha, s.file, s.line),
          repo: name,
          sha,
          members: s.members?.map((m) => ({
            ...m,
            permalink: lib.permalink(
              repo.github,
              sha,
              m.file,
              m.line,
              m.endLine
            ),
          })),
        });
      }
    }
  }
  writeSheets(sites);
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    kinds: KINDS,
    perRepo: PER,
    populations: totals,
    seed: SEED,
    sites,
  };
  writeFileSync(
    join(lib.RESULTS_DIR, "sample.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  console.log(JSON.stringify(totals));
  console.log(
    KINDS.map((k) => `${k}: ${sites.filter((s) => s.kind === k).length}`).join(
      ", "
    )
  );
};

const writeSheets = (sites) => {
  mkdirSync(lib.OUT_DIR, { recursive: true });
  for (const kind of KINDS) {
    const blocks = [];
    for (const s of sites.filter((x) => x.kind === kind)) {
      const root = getRepo(s.repo).root;
      const head = `### ${s.id} ${s.repo} ${s.file}:${s.line}${s.name ? ` \`${s.name}\`` : ""}`;
      const lines = [head, "", `Permalink: ${s.permalink}`];
      if (s.linters) {
        for (const [tool, msgs] of Object.entries(s.linters)) {
          if (msgs.length > 0) {
            lines.push(`- ${tool}: ${msgs.join(" / ")}`);
          }
        }
        lines.push("", "```", context(root, s.file, s.line, 12, 14), "```");
      } else if (kind === "clone") {
        lines.push(
          `Origin: ${s.origin}${s.message ? ` — ${s.message}` : ""}. Members: ${s.size}${s.exact === true ? " (all members token-identical)" : s.exact === false ? " (identifiers or literals differ)" : ""}`
        );
        for (const m of (s.members ?? []).slice(0, 4)) {
          const span = m.endLine ? Math.min(40, m.endLine - m.line + 2) : 16;
          lines.push(
            "",
            `Member ${m.file}:${m.line}${m.kind ? ` (${m.kind}${m.name ? ` ${m.name}` : ""})` : ""} ${m.permalink}`,
            "```",
            context(root, m.file, m.line, 1, span),
            "```"
          );
        }
        if ((s.members ?? []).length > 4) {
          lines.push(
            "",
            `…and ${s.members.length - 4} more members: ${s.members
              .slice(4)
              .map((m) => `${m.file}:${m.line}`)
              .join(", ")}`
          );
        }
      } else {
        lines.push(
          `What: ${s.what}${s.isType ? " (type-only)" : ""}${s.publicVia ? `; public only through a wildcard subpath export` : ""}; whole-word mentions elsewhere: ${s.textualReferences?.join(", ") || "none"}`
        );
        lines.push("", "```", context(root, s.file, s.line, 3, 18), "```");
      }
      blocks.push(lines.join("\n"));
    }
    writeFileSync(
      join(lib.OUT_DIR, `worksheet-${kind}.md`),
      `${blocks.join("\n\n")}\n`
    );
  }
};

// ── second rater ───────────────────────────────────────────────────────
const PER_KIND = Number(lib.arg("per-kind", "20"));
const SEED2 = Number(lib.arg("seed2", "7"));
const subset = () => {
  const { sites } = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "sample.json"), "utf8")
  );
  const random = rng(SEED2);
  const picked = {};
  for (const kind of KINDS) {
    const ids = sites.filter((s) => s.kind === kind).map((s) => s.id);
    picked[kind] = sample(ids, PER_KIND, random).sort();
  }
  return picked;
};
const print = () => {
  for (const [kind, ids] of Object.entries(subset())) {
    const sheet = readFileSync(
      join(lib.OUT_DIR, `worksheet-${kind}.md`),
      "utf8"
    );
    const blocks = sheet.split(/\n(?=### )/);
    for (const id of ids) {
      process.stdout.write(
        `${blocks.find((b) => b.startsWith(`### ${id} `))}\n\n`
      );
    }
  }
};
const kappa = (pairs) => {
  const n = pairs.length;
  const cats = [...new Set(pairs.flat())];
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  const expected = cats.reduce(
    (sum, c) =>
      sum +
      (pairs.filter(([a]) => a === c).length / n) *
        (pairs.filter(([, b]) => b === c).length / n),
    0
  );
  return expected === 1 ? 1 : (observed - expected) / (1 - expected);
};
// The coarse split each kind's write-up relies on: does the finding call for a change?
const COARSE = {
  clone: (c) =>
    ["accidental", "inconsistent"].includes(c)
      ? "change"
      : c === "unclear"
        ? "unclear"
        : "leave",
  "dead-store": (c) =>
    ["leftover", "bug", "debug-wip"].includes(c)
      ? "change"
      : c === "unclear"
        ? "unclear"
        : "leave",
  export: (c) =>
    ["dead", "unnecessary-export"].includes(c)
      ? "change"
      : c === "unclear"
        ? "unclear"
        : "leave",
  unused: (c) =>
    ["leftover", "bug", "debug-wip"].includes(c)
      ? "change"
      : c === "unclear"
        ? "unclear"
        : "leave",
};

const compute = () => {
  const path = join(lib.RESULTS_DIR, "classifications.json");
  const data = JSON.parse(readFileSync(path, "utf8"));
  const first = new Map(data.labels.map((l) => [l.id, l.category]));
  const agreement = {};
  for (const [kind, ids] of Object.entries(subset())) {
    const rated = ids.filter((id) => data.secondRater?.[id] && first.has(id));
    const pairs = rated.map((id) => [
      first.get(id),
      data.secondRater[id].category,
    ]);
    if (pairs.length === 0) {
      continue;
    }
    const coarsePairs = pairs.map(([a, b]) => [
      COARSE[kind](a),
      COARSE[kind](b),
    ]);
    agreement[kind] = {
      coarse: {
        kappa: Math.round(kappa(coarsePairs) * 100) / 100,
        same: coarsePairs.filter(([a, b]) => a === b).length,
      },
      disagreements: rated
        .filter((id) => first.get(id) !== data.secondRater[id].category)
        .map((id) => ({
          first: first.get(id),
          id,
          second: data.secondRater[id].category,
        })),
      ids,
      kappa: Math.round(kappa(pairs) * 100) / 100,
      n: pairs.length,
      same: pairs.filter(([a, b]) => a === b).length,
    };
  }
  data.agreement = agreement;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(JSON.stringify(agreement, null, 2));
};

if (lib.flag("worksheet")) {
  worksheet();
} else if (lib.flag("print")) {
  print();
} else if (lib.flag("compute")) {
  compute();
} else {
  console.error("Pass --worksheet, --print or --compute.");
  process.exit(1);
}
