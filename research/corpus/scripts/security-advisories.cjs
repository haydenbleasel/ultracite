// Published security advisories for the eight upstream projects, from GitHub, and the hand
// classification of each one: vulnerability class (from its CWEs) and whether a syntactic lint
// rule in Ultracite's presets could plausibly have flagged the vulnerable code.
//
//   --fetch   query `gh api` and cache the raw responses under out/security-rules/advisories/
//             (gitignored): each repo's published repository advisories
//             (/repos/{owner}/{repo}/security-advisories) and the global advisory database
//             filtered by npm package (/advisories?ecosystem=npm&affects=<pkg>), for the
//             packages each project publishes plus any package its repository advisories name.
//   --build   merge and de-duplicate by GHSA id, join the hand labels from
//             results/<topic>/advisory-classifications.json (if present), and write
//             results/<topic>/advisories.json.
//   --sheet   print a worksheet (id, package, CWEs, summary, fix references) for classifying.
//
// Advisory text is data from GitHub; nothing in it is executed.
//
// Usage (from the repo root):
//   node research/corpus/scripts/security-advisories.cjs --fetch --build [--sheet]
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./security-lib.cjs");

const RAW = join(lib.OUT_DIR, "advisories");

// Each project's GitHub repo and the npm packages it publishes from the measured repo.
const PROJECTS = [
  {
    name: "next.js",
    github: "vercel/next.js",
    packages: ["next", "@next/env", "@next/font", "eslint-config-next"],
  },
  {
    name: "vite",
    github: "vitejs/vite",
    packages: ["vite", "create-vite", "@vitejs/plugin-legacy"],
  },
  {
    name: "astro",
    github: "withastro/astro",
    packages: [
      "astro",
      "@astrojs/node",
      "@astrojs/vercel",
      "@astrojs/cloudflare",
      "@astrojs/netlify",
      "@astrojs/mdx",
      "@astrojs/react",
      "@astrojs/rss",
      "@astrojs/db",
      "create-astro",
    ],
  },
  { name: "hono", github: "honojs/hono", packages: ["hono"] },
  {
    name: "trpc",
    github: "trpc/trpc",
    packages: [
      "@trpc/server",
      "@trpc/client",
      "@trpc/next",
      "@trpc/react-query",
      "@trpc/tanstack-react-query",
    ],
  },
  { name: "zod", github: "colinhacks/zod", packages: ["zod"] },
  {
    name: "excalidraw",
    github: "excalidraw/excalidraw",
    packages: ["@excalidraw/excalidraw"],
  },
  { name: "vscode", github: "microsoft/vscode", packages: [] },
];

const gh = (path) => {
  const out = execFileSync("gh", ["api", "--paginate", "--slurp", path], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  return JSON.parse(out).flat();
};

const fileFor = (kind, key) =>
  join(RAW, `${kind}.${key.replaceAll("/", "__").replaceAll("@", "")}.json`);

const fetchAll = () => {
  mkdirSync(RAW, { recursive: true });
  for (const project of PROJECTS) {
    const repo = gh(
      `/repos/${project.github}/security-advisories?state=published&per_page=100`
    );
    writeFileSync(
      fileFor("repo", project.github),
      JSON.stringify(repo, null, 1)
    );
    const named = repo.flatMap((a) =>
      (a.vulnerabilities ?? [])
        .filter((v) => v.package?.ecosystem === "npm")
        .map((v) => v.package.name)
    );
    const packages = [...new Set([...project.packages, ...named])];
    let global = 0;
    for (const pkg of packages) {
      const rows = gh(
        `/advisories?ecosystem=npm&affects=${encodeURIComponent(pkg)}&per_page=100`
      );
      writeFileSync(fileFor("global", pkg), JSON.stringify(rows, null, 1));
      global += rows.length;
    }
    console.log(
      `${project.github}: ${repo.length} repository advisories; ${global} global rows over ${packages.length} packages (${packages.join(", ")})`
    );
  }
  writeFileSync(
    join(RAW, "fetched.json"),
    JSON.stringify(
      { at: new Date().toISOString(), projects: PROJECTS },
      null,
      1
    )
  );
};

// ── merge ──────────────────────────────────────────────────────────────
const COMMIT = /github\.com\/([^/]+\/[^/]+)\/commit\/([0-9a-f]{7,40})/;
const PULL = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/;
const URLS = /https:\/\/github\.com\/[^\s)\]>"'`]+/g;

const trim = (a, source, project) => {
  const refs = [
    ...(a.references ?? []).map((r) => (typeof r === "string" ? r : r.url)),
    // Repository advisories often link the fix only in the description.
    ...(a.description ?? "").matchAll(URLS).map((m) => m[0]),
    a.html_url,
    a.source_code_location,
  ].filter(Boolean);
  return {
    cve: a.cve_id ?? null,
    cwes: (a.cwes ?? []).map((c) => c.cwe_id),
    cweNames: (a.cwes ?? []).map((c) => c.name),
    fixCommits: [
      ...new Set(
        refs
          .map((r) => COMMIT.exec(r))
          .filter(Boolean)
          .map((m) => `${m[1]}@${m[2]}`)
      ),
    ],
    fixPulls: [
      ...new Set(
        refs
          .map((r) => PULL.exec(r))
          .filter(Boolean)
          .map((m) => `${m[1]}#${m[2]}`)
      ),
    ],
    ghsa: a.ghsa_id,
    packages: [
      ...new Set(
        (a.vulnerabilities ?? []).map((v) => v.package?.name).filter(Boolean)
      ),
    ],
    project,
    published: (a.published_at ?? "").slice(0, 10),
    severity: a.severity ?? null,
    sources: [source],
    summary: a.summary,
    type: a.type ?? "repository",
    url: `https://github.com/advisories/${a.ghsa_id}`,
    withdrawn: Boolean(a.withdrawn_at),
  };
};

const build = () => {
  const byId = new Map();
  for (const project of PROJECTS) {
    const files = readdirSync(RAW).filter(
      (f) => f.endsWith(".json") && f !== "fetched.json"
    );
    const repoFile = fileFor("repo", project.github);
    const repo = JSON.parse(readFileSync(repoFile, "utf8"));
    const named = repo.flatMap((a) =>
      (a.vulnerabilities ?? []).map((v) => v.package?.name).filter(Boolean)
    );
    const packages = [...new Set([...project.packages, ...named])];
    const repoIds = new Set(repo.map((a) => a.ghsa_id));
    const seed = new Set(project.packages);
    const rows = [
      ...repo.map((a) => trim(a, "repository", project.name)),
      ...packages.flatMap((pkg) => {
        const path = fileFor("global", pkg);
        // A package named only by a repository advisory (for example vite-plus, which is not
        // published from vitejs/vite) adds sources to that advisory but no new advisories.
        return existsSync(path)
          ? JSON.parse(readFileSync(path, "utf8"))
              .filter((a) => seed.has(pkg) || repoIds.has(a.ghsa_id))
              .map((a) => trim(a, `global:${pkg.trim()}`, project.name))
          : [];
      }),
    ];
    void files;
    for (const row of rows) {
      const prev = byId.get(row.ghsa);
      if (prev) {
        prev.sources = [...new Set([...prev.sources, ...row.sources])];
        prev.packages = [...new Set([...prev.packages, ...row.packages])];
        prev.fixCommits = [...new Set([...prev.fixCommits, ...row.fixCommits])];
        prev.fixPulls = [...new Set([...prev.fixPulls, ...row.fixPulls])];
        prev.cwes = prev.cwes.length > 0 ? prev.cwes : row.cwes;
        prev.cweNames = prev.cweNames.length > 0 ? prev.cweNames : row.cweNames;
        prev.cve ??= row.cve;
      } else {
        byId.set(row.ghsa, row);
      }
    }
  }
  const labelsPath = join(lib.RESULTS_DIR, "advisory-classifications.json");
  const labels = existsSync(labelsPath)
    ? JSON.parse(readFileSync(labelsPath, "utf8"))
    : { labels: {} };
  const advisories = [...byId.values()]
    .filter((a) => !a.withdrawn)
    .sort(
      (a, b) =>
        a.project.localeCompare(b.project) ||
        a.published.localeCompare(b.published)
    )
    .map((a) => ({ ...a, label: labels.labels[a.ghsa] ?? null }));
  const unlabelled = advisories.filter((a) => !a.label).map((a) => a.ghsa);
  const fetched = JSON.parse(readFileSync(join(RAW, "fetched.json"), "utf8"));
  const result = {
    codebook: labels.codebook ?? null,
    fetchedAt: fetched.at,
    generated: new Date().toISOString().slice(0, 10),
    note: "Repository advisories and reviewed global advisories (npm), de-duplicated by GHSA id; withdrawn advisories dropped. VS Code publishes no npm package, so only its repository advisories are included.",
    projects: PROJECTS,
    total: advisories.length,
    unlabelled,
    advisories,
  };
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(lib.RESULTS_DIR, "advisories.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  const per = {};
  for (const a of advisories) {
    per[a.project] = (per[a.project] ?? 0) + 1;
  }
  console.log(
    `advisories: ${advisories.length}`,
    per,
    `unlabelled: ${unlabelled.length}`
  );
  return result;
};

const sheet = (result) => {
  for (const a of result.advisories) {
    console.log(
      [
        `## ${a.ghsa} (${a.project}, ${a.published}, ${a.severity}) ${a.cve ?? ""}`,
        `packages: ${a.packages.join(", ")}; CWEs: ${a.cwes.map((c, i) => `${c} ${a.cweNames[i] ?? ""}`).join("; ") || "none"}`,
        `summary: ${a.summary}`,
        `fix: ${[...a.fixCommits, ...a.fixPulls].join(" ") || "-"}`,
        a.label ? `label: ${JSON.stringify(a.label)}` : "",
        "",
      ].join("\n")
    );
  }
};

if (lib.flag("fetch")) {
  fetchAll();
}
if (lib.flag("build") || lib.flag("sheet")) {
  const result = build();
  if (lib.flag("sheet")) {
    sheet(result);
  }
}
