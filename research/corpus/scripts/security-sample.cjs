// Hand-classification support for the security sinks found by security-sink-census.cjs.
//
// There are few enough sinks to classify all of them, so nothing is sampled except the
// second-rater subset and the Biome noSecrets hits (a rule Ultracite turns off, which fires
// hundreds of times).
//
//   --worksheet   write results/<topic>/sample.json (every sink site, the codebook and the
//                 seeded noSecrets sample) and out/security-rules/worksheet-<group>.md (code
//                 context and permalinks, for the first rater)
//   --print       print the blind second-rater subset (code only, no labels, no rule hits)
//   --compute     read results/<topic>/classifications.json (labels + secondRater) and write
//                 agreement (percent and Cohen's kappa) into it
//
// Usage (from the repo root):
//   node research/corpus/scripts/security-sample.cjs --worksheet
//   node research/corpus/scripts/security-sample.cjs --print [--per-group 12] [--seed 7]
//   node research/corpus/scripts/security-sample.cjs --compute
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const { getRepo } = require("./collect-files.cjs");
const config = require("./repos.json");
const lib = require("./security-lib.cjs");

const SEED = Number(lib.arg("seed", "20261010"));
const SECOND_SEED = Number(lib.arg("second-seed", "7"));
const PER_GROUP = Number(lib.arg("per-group", "12"));
const NOSECRETS_SAMPLE = Number(lib.arg("nosecrets", "60"));
const BEFORE = 8;
const AFTER = 6;

// ── codebook ───────────────────────────────────────────────────────────
// Groups of sink kinds that share a codebook.
const GROUPS = {
  injection: {
    kinds: [
      "function-constructor",
      "eval",
      "timer-string",
      "vm",
      "html-property",
      "html-method",
      "document-write",
      "dangerously-set-inner-html",
      "script-element",
      "cookie-write",
    ],
    question: "What flows into the sink?",
    categories: {
      constant:
        'A literal or static string, or markup assembled only from constants in the source (icons, fixed templates). Clearing with "" counts here.',
      escaped:
        "Generated internally and escaped or serialized for the context before the sink (e.g. JSON with HTML-escaping, framework-escaped attributes).",
      sanitized:
        "Arbitrary input that passes through a sanitizer or allowlist before the sink.",
      "trusted-dev":
        "Developer- or build-controlled input: project config, compiled code, files on the developer's machine, the framework's own runtime chunks or manifests.",
      "user-controlled":
        "Could carry attacker-controlled data at runtime without escaping: request data, URL parts, user documents, third-party responses, error text that can include any of these.",
    },
  },
  "javascript-url": {
    kinds: ["javascript-url"],
    question:
      "Is this a javascript: URL being used, or code that defends against one?",
    categories: {
      sink: "A javascript: URL that is navigated to or rendered.",
      defense: "A check, regex or error message that blocks javascript: URLs.",
    },
  },
  randomness: {
    kinds: ["math-random"],
    question: "What is the random value used for?",
    categories: {
      "security-sensitive":
        "A token, secret, nonce or identifier whose unpredictability protects something.",
      "unique-id":
        "A non-secret identifier (element ids, cache-busting, temp names, request ids for logs).",
      "jitter-sampling": "Retry jitter, sampling decisions, load spreading.",
      "visual-or-dev":
        "Visual variation, seeds for drawing, demo data, dev-only tooling.",
    },
  },
  links: {
    kinds: ["target-blank", "window-open"],
    question: "Can the opened page reach window.opener?",
    categories: {
      protected: "rel/features include noopener or noreferrer.",
      "unprotected-internal":
        "No noopener, but the destination is same-origin or the app's own docs.",
      "unprotected-external":
        "No noopener and an external or arbitrary destination (protected only by modern browsers' implicit noopener).",
    },
  },
  "secrets-ips": {
    kinds: ["secret", "ip-literal"],
    question:
      "Is this a hardcoded credential or a meaningful hardcoded address?",
    categories: {
      "real-secret": "A credential that would grant access if leaked.",
      "public-or-placeholder":
        "A public identifier, documented example or placeholder.",
      "not-a-secret":
        "Matched only because of a secret-like name or format; the value is not a credential (labels, header names, token types).",
      "local-address":
        "Loopback or unspecified address (localhost, 0.0.0.0, ::) used for binding, comparison or display.",
      "not-an-ip":
        "Matched the IP pattern but isn't an address (SVG path data, delimiters, prefixes).",
      "public-address": "A real, routable address hardcoded in the source.",
    },
  },
};
const groupOf = (kind) =>
  Object.entries(GROUPS).find(([, g]) => g.kinds.includes(kind))?.[0] ?? null;

// mulberry32: small, seedable.
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
const shuffleTake = (items, k, random) => {
  const copy = [...items];
  const n = Math.min(k, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

const context = (repo, file, line, endLine) => {
  const lines = readFileSync(join(getRepo(repo).root, file), "utf8").split(
    "\n"
  );
  const from = Math.max(1, line - BEFORE);
  const to = Math.min(lines.length, Math.max(endLine, line) + AFTER);
  const out = [];
  for (let i = from; i <= to; i++) {
    const marker = i >= line && i <= endLine ? ">" : " ";
    out.push(`${marker}${String(i).padStart(5)} | ${lines[i - 1]}`);
  }
  return out.join("\n");
};

const worksheet = () => {
  const census = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "sink-census.json"), "utf8")
  );
  const sites = census.sites
    .filter((s) => !lib.DOGFOOD.has(s.repo) && groupOf(s.kind))
    .map((s) => ({
      code: s.code,
      endLine: s.endLine,
      file: s.file,
      group: groupOf(s.kind),
      id: s.id,
      kind: s.kind,
      line: s.line,
      permalink: s.permalink,
      repo: s.repo,
      sub: s.sub,
      ...(s.rel !== undefined
        ? { href: s.href, rel: s.rel, spread: s.spread }
        : {}),
      ...(s.value !== undefined ? { value: s.value } : {}),
      ...(s.name !== undefined ? { name: s.name } : {}),
    }));

  // Biome's noSecrets is off in Ultracite; a seeded sample of its corpus hits shows why.
  const random = rng(SEED);
  const noSecrets = [];
  for (const { name, github } of config.repos) {
    if (lib.DOGFOOD.has(name)) {
      continue;
    }
    const path = join(lib.OUT_DIR, `${name}.biome-off.json`);
    if (!existsSync(path)) {
      continue;
    }
    const sha = census.repos[name].sha;
    for (const d of JSON.parse(readFileSync(path, "utf8")).hits) {
      if (d.rule === "security/noSecrets") {
        noSecrets.push({
          column: d.column,
          file: d.file,
          github,
          line: d.line,
          repo: name,
          sha,
        });
      }
    }
  }
  // Biome reports files in a nondeterministic order, so sort before drawing the sample.
  noSecrets.sort(
    (a, b) =>
      a.repo.localeCompare(b.repo) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      (a.column ?? 0) - (b.column ?? 0)
  );
  const sampled = shuffleTake(noSecrets, NOSECRETS_SAMPLE, random)
    .sort(
      (a, b) =>
        a.repo.localeCompare(b.repo) ||
        a.file.localeCompare(b.file) ||
        a.line - b.line
    )
    .map((d, i) => {
      const text =
        readFileSync(join(getRepo(d.repo).root, d.file), "utf8").split("\n")[
          d.line - 1
        ] ?? "";
      return {
        code: text.trim().slice(0, 160),
        file: d.file,
        group: "nosecrets",
        id: `noSecrets:${String(i + 1).padStart(2, "0")}`,
        kind: "biome-noSecrets-hit",
        line: d.line,
        permalink: lib.permalink(d.github, d.sha, d.file, d.line),
        repo: d.repo,
      };
    });

  const codebook = {
    ...Object.fromEntries(
      Object.entries(GROUPS).map(([k, g]) => [
        k,
        { kinds: g.kinds, question: g.question, categories: g.categories },
      ])
    ),
    nosecrets: {
      kinds: ["biome-noSecrets-hit"],
      question: "Is the flagged string a secret?",
      categories: {
        "real-secret": "A credential that would grant access if leaked.",
        "not-a-secret":
          "Any other string (identifiers, messages, regexes, hashes of public data, URLs).",
      },
    },
  };
  const sample = {
    codebook,
    generated: new Date().toISOString().slice(0, 10),
    note: `Every sink site from sink-census.json (external repos), plus a seeded sample (seed ${SEED}) of ${sampled.length} of ${noSecrets.length} Biome noSecrets hits.`,
    noSecretsTotal: noSecrets.length,
    seed: SEED,
    sites: [...sites, ...sampled],
  };
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(lib.RESULTS_DIR, "sample.json"),
    `${JSON.stringify(sample, null, 1)}\n`
  );

  // Worksheets: one per group, code context around each site.
  mkdirSync(lib.OUT_DIR, { recursive: true });
  for (const group of [...Object.keys(GROUPS), "nosecrets"]) {
    const list = sample.sites.filter((s) => s.group === group);
    const blocks = list.map((s) =>
      [
        `### ${s.id} — ${s.kind} (${s.sub ?? ""})`,
        `${s.repo} ${s.file}:${s.line} ${s.permalink}`,
        s.rel !== undefined
          ? `rel=${s.rel} href=${s.href}${s.spread ? " (spread props)" : ""}`
          : "",
        "```",
        context(s.repo, s.file, s.line, s.endLine ?? s.line),
        "```",
        "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    const cb = codebook[group];
    const head = [
      `# Worksheet: ${group} (${list.length} sites)`,
      "",
      `Question: ${cb.question}`,
      "",
      ...Object.entries(cb.categories).map(([k, v]) => `- \`${k}\`: ${v}`),
      "",
    ];
    writeFileSync(
      join(lib.OUT_DIR, `worksheet-${group}.md`),
      [...head, ...blocks].join("\n")
    );
  }
  const counts = {};
  for (const s of sample.sites) {
    counts[s.group] = (counts[s.group] ?? 0) + 1;
  }
  console.log("sites per group:", counts);
};

// ── second rater ───────────────────────────────────────────────────────
const subset = () => {
  const { sites } = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "sample.json"), "utf8")
  );
  const random = rng(SECOND_SEED);
  const picked = [];
  for (const group of [...Object.keys(GROUPS), "nosecrets"]) {
    const ids = sites.filter((s) => s.group === group).map((s) => s.id);
    picked.push(...shuffleTake(ids, PER_GROUP, random).sort());
  }
  return picked;
};

// A top-up of the injection group (the one that matters most), drawn with its own seed from
// the sites not already in the subset and not named in the first rater's summary (--exclude).
const topUp = (n, exclude) => {
  const { sites } = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "sample.json"), "utf8")
  );
  const taken = new Set([...subset(), ...exclude]);
  const ids = sites
    .filter((s) => s.group === "injection" && !taken.has(s.id))
    .map((s) => s.id);
  return shuffleTake(ids, n, rng(SECOND_SEED + 1)).sort();
};

const print = () => {
  const { codebook, sites } = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "sample.json"), "utf8")
  );
  const byId = new Map(sites.map((s) => [s.id, s]));
  const extra = Number(lib.arg("top-up", "0"));
  const exclude = (lib.arg("exclude", "") || "").split(",").filter(Boolean);
  const ids = extra > 0 ? topUp(extra, exclude) : subset();
  for (const id of ids) {
    const s = byId.get(id);
    console.log(
      `### ${s.id} [${s.group}] ${s.kind} (${s.sub ?? ""})\n${s.repo} ${s.file}:${s.line}\n\`\`\`\n${context(s.repo, s.file, s.line, s.endLine ?? s.line)}\n\`\`\`\n`
    );
  }
  console.log("Codebook:", JSON.stringify(codebook, null, 1));
};

const kappa = (pairs) => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const cats = [...new Set(pairs.flat())];
  const agree = pairs.filter(([a, b]) => a === b).length / n;
  const pe = cats.reduce((sum, c) => {
    const pa = pairs.filter(([a]) => a === c).length / n;
    const pb = pairs.filter(([, b]) => b === c).length / n;
    return sum + pa * pb;
  }, 0);
  // Kappa is undefined when both raters used a single category throughout (expected agreement 1).
  return {
    agree: Math.round(agree * 1000) / 1000,
    kappa: pe === 1 ? null : Math.round(((agree - pe) / (1 - pe)) * 100) / 100,
    n,
    same: pairs.filter(([a, b]) => a === b).length,
  };
};

const compute = () => {
  const path = join(lib.RESULTS_DIR, "classifications.json");
  const data = JSON.parse(readFileSync(path, "utf8"));
  const { sites } = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "sample.json"), "utf8")
  );
  const groupOfId = new Map(sites.map((s) => [s.id, s.group]));
  const ids = Object.keys(data.secondRater ?? {});
  const byGroup = {};
  for (const id of ids) {
    const first = data.labels[id]?.category;
    const second = data.secondRater[id]?.category;
    if (!first || !second) {
      continue;
    }
    (byGroup[groupOfId.get(id)] ??= []).push([first, second]);
  }
  const all = Object.values(byGroup).flat();
  data.agreement = {
    byGroup: Object.fromEntries(
      Object.entries(byGroup).map(([g, pairs]) => [g, kappa(pairs)])
    ),
    disagreements: ids
      .filter(
        (id) => data.labels[id]?.category !== data.secondRater[id]?.category
      )
      .map((id) => ({
        first: data.labels[id]?.category,
        id,
        second: data.secondRater[id]?.category,
      })),
    overall: kappa(all),
  };
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(JSON.stringify(data.agreement, null, 1));
};

if (lib.flag("worksheet")) {
  worksheet();
}
if (lib.flag("print")) {
  print();
}
if (lib.flag("ids")) {
  console.log(subset().join("\n"));
}
if (lib.flag("compute")) {
  compute();
}
module.exports = { GROUPS, groupOf };
