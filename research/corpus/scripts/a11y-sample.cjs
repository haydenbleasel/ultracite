// Seeded samples of accessibility diagnostics for hand classification, worksheets for the raters,
// the blind subset for a second rater, and agreement.
//
// Populations (raw mode, so suppressed sites count too):
//   hit       every line any of the three linters flags with an accessibility rule (Oxlint core +
//             react + js-plugins from the census, ESLint core + react, Biome's a11y group), merged
//             by file and line; each site lists every rule and message per linter
//   hidden    the extra diagnostics the component-mapping counterfactual adds (a11y-jsx-census.cjs
//             --lint): what Oxlint and ESLint would report if they knew what each custom component
//             renders, merged by file and line
//   suppression  every suppression comment naming an accessibility rule (markers.json), all of them
//
// Sample (seed 20261015, frozen in sample.json): up to 12 hit sites per repo, and 30 hidden sites
// drawn in proportion to each repo's population (at least 2 per repo that has any).
//
//   --worksheet   draw (or reuse the frozen sample) and write out/accessibility/worksheet-<kind>.md
//   --resample    draw again
//   --print       write out/accessibility/blind-<kind>.md: a seeded subset of 20 per kind (all
//                 suppressions), same context, no labels, for a second rater
//   --compute     read out/accessibility/labels-<rater>-<kind>.json and write classifications.json
//                 with both raters, shares (unweighted and weighted by repo population) and agreement
//
// Usage (from the repo root):
//   node research/corpus/scripts/a11y-sample.cjs --worksheet --print
//   node research/corpus/scripts/a11y-sample.cjs --compute
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./a11y-lib.cjs");

const { dc } = lib;
const SEED = 20261015;
const SAMPLE = join(lib.RESULTS_DIR, "sample.json");
const PER_REPO = 12;
const HIDDEN_N = 30;
const BLIND_N = 20;

const CODEBOOK = {
  labels: {
    "real-barrier":
      "A user would be affected as the code stands: a screen-reader, keyboard, voice-control or low-vision user can't perceive, name or operate something, or is told something wrong. Judge the rendered result, including what the component or its props supply.",
    "false-positive":
      "The rule is wrong here: the component, a spread, a parent, context or the platform already handles it (the control is labelled elsewhere, the element is natively interactive underneath, the handler is a bubbling catch for a real control inside, the rule misreads the code).",
    "intentional-or-decorative":
      "The pattern is deliberate and acceptable: a decorative image or icon, a presentational wrapper, a mouse-only convenience that duplicates a keyboard path, an example or demo, a role chosen on purpose for a composite widget.",
    unclear: "Can't tell from the code and its definitions in the repo.",
  },
  suppressionLabels: {
    right:
      "The suppression is justified: the rule is wrong here or the pattern is deliberate, and the reason (if any) says so.",
    wrong: "The suppression hides a real barrier.",
    unclear: "Can't tell.",
  },
  fields: {
    cheapFix:
      "The smallest edit that would silence the rule(s) here (for real barriers and false positives).",
    rightFix: "What the code should do instead, or 'leave it'.",
  },
};

const readRows = (name, tool) => {
  const f = join(lib.OUT_DIR, "corpus", `${name}.${tool}.raw.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : [];
};

const fileLines = new Map();
const linesOf = (name, file) => {
  const key = `${name}/${file}`;
  if (!fileLines.has(key)) {
    fileLines.set(
      key,
      readFileSync(join(lib.getRepo(name).root, file), "utf8").split("\n")
    );
  }
  return fileLines.get(key);
};
const context = (name, file, line, before = 10, after = 12) => {
  const lines = linesOf(name, file);
  const from = Math.max(1, line - before);
  const to = Math.min(lines.length, line + after);
  const out = [];
  for (let i = from; i <= to; i++) {
    out.push(
      `${String(i).padStart(5)}${i === line ? " >" : "  "} ${lines[i - 1]}`
    );
  }
  return out.join("\n");
};

const hitPopulation = () => {
  const sites = [];
  for (const name of lib.REPOS) {
    const byKey = new Map();
    const add = (tool, d) => {
      const key = `${d.file}:${d.line}`;
      if (!byKey.has(key)) {
        byKey.set(key, { file: d.file, line: d.line, repo: name, rules: {} });
      }
      const site = byKey.get(key);
      site.rules[tool] ??= [];
      site.rules[tool].push({
        help: d.help ?? null,
        message: d.message,
        rule: d.rule,
      });
    };
    for (const d of readRows(name, "oxlint")) {
      add("oxlint", d);
    }
    for (const d of readRows(name, "eslint")) {
      if (lib.isA11yRule(d.rule)) {
        add("eslint", d);
      }
    }
    for (const d of readRows(name, "biome")) {
      if (lib.isBiomeA11y(d.rule)) {
        add("biome", d);
      }
    }
    sites.push(
      ...[...byKey.values()].sort((a, b) =>
        `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`, "en", {
          numeric: true,
        })
      )
    );
  }
  return sites;
};

const hiddenPopulation = () => {
  const sites = [];
  for (const name of lib.REPOS) {
    const f = join(lib.OUT_DIR, "jsx-census", `${name}.counterfactual.json`);
    if (!existsSync(f)) {
      continue;
    }
    const cf = JSON.parse(readFileSync(f, "utf8"));
    const census = JSON.parse(
      readFileSync(join(lib.OUT_DIR, "jsx-census", `${name}.json`), "utf8")
    );
    const byKey = new Map();
    for (const [tool, rows] of Object.entries(cf.mapping)) {
      for (const d of rows) {
        const key = `${d.file}:${d.line}`;
        if (!byKey.has(key)) {
          byKey.set(key, { file: d.file, line: d.line, repo: name, rules: {} });
        }
        const site = byKey.get(key);
        site.rules[tool] ??= [];
        site.rules[tool].push({ message: d.message, rule: d.rule });
      }
    }
    for (const site of byKey.values()) {
      // The component on that line and what it was mapped to.
      const code = linesOf(name, site.file)[site.line - 1] ?? "";
      const tag = /<([A-Z][\w.]*)/.exec(code)?.[1] ?? null;
      site.component = tag
        ? { mappedTo: census.settingsMap[tag] ?? null, tag }
        : null;
    }
    sites.push(
      ...[...byKey.values()].sort((a, b) =>
        `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`, "en", {
          numeric: true,
        })
      )
    );
  }
  return sites;
};

const draw = () => {
  const hits = hitPopulation();
  const hidden = hiddenPopulation();
  const random = lib.rng(SEED);
  const shuffle = (xs) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const population = { hidden: {}, hit: {} };
  const sample = [];
  for (const name of lib.REPOS) {
    const ofRepo = hits.filter((s) => s.repo === name);
    population.hit[name] = ofRepo.length;
    for (const s of shuffle(ofRepo).slice(0, PER_REPO)) {
      sample.push({ ...s, kind: "hit" });
    }
  }
  const hiddenRepos = lib.REPOS.filter((n) => hidden.some((s) => s.repo === n));
  const total = hidden.length;
  const quota = {};
  for (const name of hiddenRepos) {
    population.hidden[name] = hidden.filter((s) => s.repo === name).length;
    quota[name] = Math.max(
      2,
      Math.round((population.hidden[name] / total) * HIDDEN_N)
    );
  }
  // Trim the largest quota so the total is HIDDEN_N.
  let over = Object.values(quota).reduce((a, b) => a + b, 0) - HIDDEN_N;
  while (over > 0) {
    const biggest = Object.keys(quota).sort((a, b) => quota[b] - quota[a])[0];
    quota[biggest]--;
    over--;
  }
  for (const name of hiddenRepos) {
    for (const s of shuffle(hidden.filter((x) => x.repo === name)).slice(
      0,
      quota[name]
    )) {
      sample.push({ ...s, kind: "hidden" });
    }
  }
  const markers = lib.readJson(join(lib.RESULTS_DIR, "markers.json"));
  for (const [name, r] of Object.entries(markers.repos)) {
    for (const s of r.suppressions) {
      sample.push({
        file: s.file,
        kind: "suppression",
        line: s.line,
        reason: s.reason,
        repo: name,
        rules: { [s.tool]: s.rules.map((rule) => ({ rule })) },
        stillFires: s.stillFires,
        text: s.text,
      });
    }
  }
  let n = { hidden: 0, hit: 0, suppression: 0 };
  for (const s of sample) {
    n[s.kind]++;
    s.id = `${{ hidden: "h", hit: "a", suppression: "s" }[s.kind]}${String(n[s.kind]).padStart(3, "0")}`;
    s.permalink = lib.permalink(s.repo, s.file, s.line);
  }
  return {
    codebook: CODEBOOK,
    generated: new Date().toISOString().slice(0, 10),
    population,
    quota,
    sample,
    seed: SEED,
  };
};

const renderSite = (s) => {
  const rules = Object.entries(s.rules)
    .map(
      ([tool, list]) =>
        `- **${tool}**: ${list.map((r) => `\`${r.rule}\`${r.message ? ` — ${r.message.replaceAll("\n", " ").slice(0, 220)}` : ""}`).join("; ")}`
    )
    .join("\n");
  const extra =
    s.kind === "hidden" && s.component
      ? `\nComponent on this line: \`${s.component.tag}\`, which the census resolved to a \`<${s.component.mappedTo}>\` (the lint was told \`${s.component.tag}\` renders \`${s.component.mappedTo}\`).\n`
      : s.kind === "suppression"
        ? `\nSuppression: \`${s.text}\`${s.reason ? ` (reason: "${s.reason}")` : " (no reason)"}. Does the rule still fire on the covered code in raw mode: ${JSON.stringify(s.stillFires)}.\n`
        : "";
  return [
    `### ${s.id} — ${s.repo} \`${s.file}:${s.line}\``,
    "",
    s.permalink,
    "",
    rules,
    extra,
    "```tsx",
    context(s.repo, s.file, s.line),
    "```",
    "",
  ].join("\n");
};

const writeWorksheet = (frozen) => {
  mkdirSync(lib.OUT_DIR, { recursive: true });
  for (const kind of ["hit", "hidden", "suppression"]) {
    const items = frozen.sample.filter((s) => s.kind === kind);
    const head = [
      `# Accessibility worksheet: ${kind} (${items.length} sites)`,
      "",
      "Clones are at research/corpus/repos/<repo> at the pinned SHAs; read definitions there (read-only).",
      "",
      "## Codebook",
      "",
      ...Object.entries(
        kind === "suppression"
          ? frozen.codebook.suppressionLabels
          : frozen.codebook.labels
      ).map(([k, v]) => `- **${k}**: ${v}`),
      "",
      ...Object.entries(frozen.codebook.fields).map(
        ([k, v]) => `- \`${k}\`: ${v}`
      ),
      "",
      "Output: a JSON array of { id, label, note, cheapFix, rightFix }.",
      "",
    ];
    writeFileSync(
      join(lib.OUT_DIR, `worksheet-${kind}.md`),
      [...head, ...items.map(renderSite)].join("\n")
    );
  }
};

const blindSubset = (frozen) => {
  const random = lib.rng(SEED + 1);
  const out = {};
  for (const kind of ["hit", "hidden", "suppression"]) {
    const items = frozen.sample.filter((s) => s.kind === kind);
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    out[kind] = a
      .slice(0, kind === "suppression" ? a.length : BLIND_N)
      .map((s) => s.id)
      .sort();
  }
  return out;
};

// ── agreement ──────────────────────────────────────────────────────────
const kappa = (pairs) => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const cats = [...new Set(pairs.flat())];
  const po = pairs.filter(([a, b]) => a === b).length / n;
  let pe = 0;
  for (const c of cats) {
    const pa = pairs.filter(([a]) => a === c).length / n;
    const pb = pairs.filter(([, b]) => b === c).length / n;
    pe += pa * pb;
  }
  return pe === 1 ? 1 : Math.round(((po - pe) / (1 - pe)) * 100) / 100;
};

const compute = (frozen) => {
  const load = (rater, kind) => {
    const f = join(lib.OUT_DIR, `labels-${rater}-${kind}.json`);
    return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  };
  const blind = frozen.blind ?? blindSubset(frozen);
  const out = {
    codebook: frozen.codebook,
    generated: new Date().toISOString().slice(0, 10),
    kinds: {},
  };
  for (const kind of ["hit", "hidden", "suppression"]) {
    const r1 = load("r1", kind);
    const r2 = load("r2", kind);
    if (!r1) {
      continue;
    }
    const items = frozen.sample.filter((s) => s.kind === kind);
    const byId = new Map(r1.map((x) => [x.id, x]));
    const missing = items.filter((s) => !byId.has(s.id)).map((s) => s.id);
    if (missing.length > 0) {
      throw new Error(
        `rater 1 ${kind}: missing labels for ${missing.join(", ")}`
      );
    }
    const counts = {};
    const weighted = {};
    const pop = kind === "suppression" ? null : frozen.population[kind];
    const perRepo = {};
    for (const s of items) {
      perRepo[s.repo] = (perRepo[s.repo] ?? 0) + 1;
    }
    for (const s of items) {
      const label = byId.get(s.id).label;
      counts[label] = (counts[label] ?? 0) + 1;
      if (pop) {
        weighted[label] =
          (weighted[label] ?? 0) + pop[s.repo] / perRepo[s.repo];
      }
    }
    const totalW = Object.values(weighted).reduce((a, b) => a + b, 0);
    const rows = items.map((s) => ({
      id: s.id,
      file: s.file,
      line: s.line,
      permalink: s.permalink,
      repo: s.repo,
      rules: s.rules,
      r1: byId.get(s.id),
      r2: r2?.find((x) => x.id === s.id) ?? null,
    }));
    const pairs = rows.filter((r) => r.r2).map((r) => [r.r1.label, r.r2.label]);
    out.kinds[kind] = {
      agreement: r2
        ? {
            kappa: kappa(pairs),
            pairs: pairs.length,
            same: pairs.filter(([a, b]) => a === b).length,
            disagreements: rows
              .filter((r) => r.r2 && r.r1.label !== r.r2.label)
              .map((r) => ({ id: r.id, r1: r.r1.label, r2: r.r2.label })),
          }
        : null,
      counts,
      n: items.length,
      population: pop,
      rows,
      weightedShares: pop
        ? Object.fromEntries(
            Object.entries(weighted).map(([k, v]) => [
              k,
              Math.round((v / totalW) * 1000) / 10,
            ])
          )
        : null,
    };
  }
  lib.writeJson(join(lib.RESULTS_DIR, "classifications.json"), out);
  for (const [k, v] of Object.entries(out.kinds)) {
    console.log(
      k,
      JSON.stringify(v.counts),
      v.agreement
        ? `agreement ${v.agreement.same}/${v.agreement.pairs} κ ${v.agreement.kappa}`
        : ""
    );
  }
};

const main = () => {
  let frozen = lib.readJson(SAMPLE);
  if (!frozen || lib.flag("resample")) {
    if (lib.flag("worksheet") || lib.flag("resample")) {
      frozen = draw();
      frozen.blind = blindSubset(frozen);
      lib.writeJson(SAMPLE, frozen);
      console.log(
        `drew ${frozen.sample.length} sites: ${JSON.stringify(frozen.population)}`
      );
    } else {
      throw new Error("No sample.json yet: run with --worksheet.");
    }
  }
  if (lib.flag("worksheet")) {
    writeWorksheet(frozen);
    console.log(`wrote worksheets in ${lib.OUT_DIR}`);
  }
  if (lib.flag("print")) {
    for (const [kind, ids] of Object.entries(frozen.blind)) {
      const items = frozen.sample.filter((s) => ids.includes(s.id));
      const head = [
        `# Blind worksheet: ${kind} (${items.length} sites)`,
        "",
        "Label each site independently. Clones are at research/corpus/repos/<repo> (read-only).",
        "",
        ...Object.entries(
          kind === "suppression"
            ? frozen.codebook.suppressionLabels
            : frozen.codebook.labels
        ).map(([k, v]) => `- **${k}**: ${v}`),
        "",
        "Output: a JSON array of { id, label, note }.",
        "",
      ];
      writeFileSync(
        join(lib.OUT_DIR, `blind-${kind}.md`),
        [...head, ...items.map(renderSite)].join("\n")
      );
    }
    console.log(
      `wrote blind worksheets: ${Object.entries(frozen.blind)
        .map(([k, v]) => `${k} ${v.length}`)
        .join(", ")}`
    );
  }
  if (lib.flag("compute")) {
    compute(frozen);
  }
};

main();
