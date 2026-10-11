// For a hand-picked sample of advisories (the XSS and injection ones, plus ReDoS, crypto and
// prototype pollution for contrast), fetch the fix commit from GitHub, download every changed
// source file as it was before and after the fix, and lint both versions with Ultracite's
// security rules in Oxlint, ESLint and Biome. The question: did any rule report on a line the
// fix removed or changed, and does the rule's verdict change with the fix?
//
// Files are fetched with `gh api` into out/security-rules/advisory-fixes/<ghsa>/{before,after}/
// (gitignored) and only parsed by the linters; nothing is installed or executed.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/security-advisory-fixes.cjs [--refetch]
// Writes results/<topic>/advisory-fixes.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const lib = require("./security-lib.cjs");
const {
  runBiome,
  runEslint,
  runOxlint,
  securityNames,
} = require("./security-linters.cjs");

// The sample: every XSS/HTML-injection advisory whose advisory links a fix commit, the command
// and header injection ones, both ReDoS advisories, and a few logic-bug classes for contrast.
const SAMPLE = [
  {
    ghsa: "GHSA-m85w-3h95-hcf9",
    repo: "withastro/astro",
    sha: "a4ffbfaa5cb460c12bd486fd75e36147f51d3e5e",
    why: "XSS via DOM clobbering",
  },
  {
    ghsa: "GHSA-w2vj-39qv-7vh7",
    repo: "withastro/astro",
    sha: "790d9425f39bbbb462f1c27615781cd965009f91",
    why: "reflected XSS (dev error page; same fix as GHSA-wrwg-2hg8-v723)",
  },
  {
    ghsa: "GHSA-fvmw-cj7j-j39q",
    repo: "withastro/astro",
    sha: "9e9c528191b6f5e06db9daf6ad26b8f68016e533",
    why: "XSS in /_image (Cloudflare adapter)",
  },
  {
    ghsa: "GHSA-8j5q-mfj2-5q9q",
    repo: "withastro/astro",
    sha: "fbcfa039dfe3d700b239f595a6c55ee35e45bd06",
    why: "XML injection in @astrojs/rss",
  },
  {
    ghsa: "GHSA-4g3v-8h47-v7g6",
    repo: "withastro/astro",
    sha: "092da560eea77ee63a3e2c583c80d8238544e42b",
    why: "reflected XSS via view transition properties",
  },
  {
    ghsa: "GHSA-f48w-9m4c-m7f5",
    repo: "withastro/astro",
    sha: "5240e26c9dd91f9bc7140dcfacdb48d5a132830d",
    why: "XSS via spread attribute names",
  },
  {
    ghsa: "GHSA-7pw4-f3q4-r2p2",
    repo: "withastro/astro",
    sha: "7ba0bb1dc7516e88caff9abd7767322af44b0294",
    why: "XSS via transition:* directive values",
  },
  {
    ghsa: "GHSA-v7v8-gjv7-ffmr",
    repo: "excalidraw/excalidraw",
    sha: "b33fa6d6f64d27adc3a47b25c0aa55711740d0af",
    why: "XSS via element links",
  },
  {
    ghsa: "GHSA-m64q-4jqh-f72f",
    repo: "excalidraw/excalidraw",
    sha: "6be752e1b6d776ccfbd3bb9eea17463cb264121d",
    why: "stored XSS in the embed component",
  },
  {
    ghsa: "GHSA-9r54-q6cx-xmh5",
    repo: "honojs/hono",
    sha: "2cf60046d730df9fd0aba85178f3ecfe8212d990",
    why: "XSS (ErrorBoundary)",
  },
  {
    ghsa: "GHSA-w62v-xxxg-mg59",
    repo: "honojs/hono",
    sha: "cd3f6f7194f0e5c9d4b26ae0cf232018d0f388fc",
    why: "XSS via cx() escaping bypass",
  },
  {
    ghsa: "GHSA-hxh3-vqpv-xpqv",
    repo: "honojs/hono",
    sha: "2b8ed402cdab6dfc5e829b480806dcd8db94161e",
    why: "XSS: plain strings unescaped in boundary components",
  },
  {
    ghsa: "GHSA-9gr3-7897-pp7m",
    repo: "vercel/next.js",
    sha: "7afc97c5744b38bdf36aa7f87625f438224688aa",
    why: "XSS in the image optimizer",
  },
  {
    ghsa: "GHSA-xv57-4mr9-wg8v",
    repo: "vercel/next.js",
    sha: "6b12c60c61ee80cb0443ccd20de82ca9b4422ddd",
    why: "content injection in the image optimizer",
  },
  {
    ghsa: "GHSA-64vr-g452-qvp3",
    repo: "vitejs/vite",
    sha: "ade1d89660e17eedfd35652165b0c26905259fad",
    why: "XSS via DOM clobbering in bundled scripts",
  },
  {
    ghsa: "GHSA-c27g-q93r-2cwf",
    repo: "vitejs/launch-editor",
    sha: "971291e8a6a91226e1616c5c0ec85423d2d50a5e",
    why: "command injection (launch-editor, Windows)",
  },
  {
    ghsa: "GHSA-p6xx-57qc-3wxr",
    repo: "honojs/hono",
    sha: "f4123ed9ea3c7c52380cc99a079a4d773838846e",
    why: "SSE field injection via CR/LF",
  },
  {
    ghsa: "GHSA-5pq2-9x2x-5p6w",
    repo: "honojs/hono",
    sha: "44ae0c8cc4d5ab2bed529127a4ac72e1483ad073",
    why: "cookie attribute injection",
  },
  {
    ghsa: "GHSA-f6gv-hh8j-q8vq",
    repo: "honojs/hono",
    sha: "8e2b6b08518998783f66d31db4f21b1b1eecc4c8",
    why: "CWE-94 per the advisory: path parameter override in TrieRouter",
  },
  {
    ghsa: "GHSA-m95q-7qp3-xv42",
    repo: "colinhacks/zod",
    sha: "2ba00fe2377f4d53947a84b8cdb314a63bbd6dd4",
    why: "ReDoS in the email regex",
  },
  {
    ghsa: "GHSA-8j4g-w8fx-2239",
    repo: "honojs/hono",
    sha: "93fc250d8b4df58ea542cb945171de8013d5e6d5",
    why: "ReDoS in the CORS middleware",
  },
  {
    ghsa: "GHSA-f67f-6cw9-8mq4",
    repo: "honojs/hono",
    sha: "cc0aa7ae327ed84cc391d29086dec2a3e44e7a1f",
    why: "JWT algorithm confusion (contrast)",
  },
  {
    ghsa: "GHSA-gq3j-xvxp-8hrf",
    repo: "honojs/hono",
    sha: "91def7cab654bad5eecc9270e6620d577971ff5e",
    why: "timing comparison (contrast)",
  },
  {
    ghsa: "GHSA-v8w9-8mx6-g223",
    repo: "honojs/hono",
    sha: "ef902257e0beacbb83d2a9549b3b83e03514a6fe",
    why: "prototype pollution (contrast)",
  },
  {
    ghsa: "GHSA-43p4-m455-4f4j",
    repo: "trpc/trpc",
    sha: "78629d524968ef8db5a7adf68d8b95a44369d77e",
    why: "prototype pollution (contrast)",
  },
];

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const NOT_PRODUCT =
  /(?:^|\/)(?:test|tests|__tests__|__test__|fixtures?|e2e|examples?|\.changeset|bench|scripts)\/|\.(?:test|spec)\.[cm]?[jt]sx?$|\.d\.ts$/;
const ROOT = join(lib.OUT_DIR, "advisory-fixes");

const gh = (args) =>
  execFileSync("gh", args, { encoding: "utf8", maxBuffer: 1 << 28 });

// Old-file line numbers removed by the patch, and new-file line numbers added.
const hunks = (patch = "") => {
  const removed = [];
  const added = [];
  let oldLine = 0;
  let newLine = 0;
  for (const line of patch.split("\n")) {
    const header = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (header) {
      oldLine = Number(header[1]);
      newLine = Number(header[2]);
      continue;
    }
    if (line.startsWith("-")) {
      removed.push(oldLine++);
    } else if (line.startsWith("+")) {
      added.push(newLine++);
    } else if (!line.startsWith("\\")) {
      oldLine++;
      newLine++;
    }
  }
  return { added, removed };
};

const fetchFix = (item, refetch) => {
  const dir = join(ROOT, item.ghsa);
  const metaPath = join(dir, "commit.json");
  if (refetch) {
    rmSync(dir, { force: true, recursive: true });
  }
  mkdirSync(dir, { recursive: true });
  let commit;
  if (existsSync(metaPath)) {
    commit = JSON.parse(readFileSync(metaPath, "utf8"));
  } else {
    commit = JSON.parse(gh(["api", `repos/${item.repo}/commits/${item.sha}`]));
    writeFileSync(metaPath, JSON.stringify(commit, null, 1));
  }
  const parent = commit.parents[0].sha;
  const files = [];
  for (const f of commit.files) {
    if (!SOURCE.test(f.filename) || NOT_PRODUCT.test(f.filename)) {
      continue;
    }
    const entry = {
      ...hunks(f.patch),
      filename: f.filename,
      previous: f.previous_filename ?? f.filename,
      status: f.status,
    };
    for (const [side, ref, path] of [
      ["before", parent, entry.previous],
      ["after", commit.sha, entry.filename],
    ]) {
      if (
        (side === "before" && f.status === "added") ||
        (side === "after" && f.status === "removed")
      ) {
        continue;
      }
      const dest = join(dir, side, path);
      if (!existsSync(dest)) {
        const raw = gh([
          "api",
          "-H",
          "Accept: application/vnd.github.raw",
          `repos/${item.repo}/contents/${path}?ref=${ref}`,
        ]);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, raw);
      }
      entry[side] = path;
    }
    files.push(entry);
  }
  return {
    date: commit.commit.committer.date.slice(0, 10),
    files,
    message: commit.commit.message.split("\n")[0],
    parent,
  };
};

const lintSide = async (dir, paths) => {
  if (paths.length === 0) {
    return [];
  }
  const names = securityNames();
  const keep = (tool, rule) =>
    tool === "biome"
      ? names.biome.has(rule.split("/").at(-1))
      : names[tool].has(rule);
  const results = [];
  const tools = {
    biome: () => runBiome({ cwd: dir, files: paths, mode: "security" }),
    "biome (off in Ultracite)": () =>
      runBiome({ cwd: dir, files: paths, mode: "off" }),
    eslint: () => runEslint({ cwd: dir, files: paths }),
    oxlint: () => runOxlint({ cwd: dir, files: paths }),
  };
  for (const [tool, run] of Object.entries(tools)) {
    for (const d of await run()) {
      const base = tool.startsWith("biome") ? "biome" : tool;
      if (tool === "biome (off in Ultracite)" || keep(base, d.rule)) {
        results.push({ ...d, tool });
      }
    }
  }
  return results;
};

const main = async () => {
  const refetch = lib.flag("refetch");
  const out = [];
  for (const item of SAMPLE) {
    const fix = fetchFix(item, refetch);
    const dir = join(ROOT, item.ghsa);
    const before = await lintSide(
      join(dir, "before"),
      fix.files.filter((f) => f.before).map((f) => f.before)
    );
    const after = await lintSide(
      join(dir, "after"),
      fix.files.filter((f) => f.after).map((f) => f.after)
    );
    const onRemoved = [];
    for (const f of fix.files) {
      const removed = new Set(f.removed);
      for (const d of before.filter((x) => x.file === f.before)) {
        if (removed.has(d.line)) {
          const text =
            readFileSync(join(dir, "before", f.before), "utf8").split("\n")[
              d.line - 1
            ] ?? "";
          onRemoved.push({
            code: text.trim().slice(0, 140),
            file: f.before,
            line: d.line,
            rule: d.rule,
            tool: d.tool,
          });
        }
      }
    }
    const tally = (list) => {
      const t = {};
      for (const d of list) {
        const k = `${d.tool}: ${d.rule}`;
        t[k] = (t[k] ?? 0) + 1;
      }
      return Object.fromEntries(
        Object.entries(t).sort(([a], [b]) => a.localeCompare(b))
      );
    };
    onRemoved.sort(
      (a, b) =>
        a.file.localeCompare(b.file) ||
        a.line - b.line ||
        a.tool.localeCompare(b.tool) ||
        a.rule.localeCompare(b.rule)
    );
    const row = {
      ...item,
      commit: `https://github.com/${item.repo}/commit/${item.sha}`,
      date: fix.date,
      files: fix.files.map((f) => ({
        added: f.added.length,
        file: f.filename,
        removed: f.removed.length,
        status: f.status,
      })),
      hitsAfter: tally(after),
      hitsBefore: tally(before),
      hitsOnRemovedLines: onRemoved,
      linesRemoved: fix.files.reduce((s, f) => s + f.removed.length, 0),
      message: fix.message,
    };
    out.push(row);
    console.log(
      `${item.ghsa} ${item.repo} ${fix.message.slice(0, 60)} | files ${row.files.length}, -${row.linesRemoved} | on removed lines: ${onRemoved.map((d) => `${d.tool}:${d.rule}`).join(", ") || "none"} | before ${JSON.stringify(row.hitsBefore)} | after ${JSON.stringify(row.hitsAfter)}`
    );
  }
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(lib.RESULTS_DIR, "advisory-fixes.json"),
    `${JSON.stringify({ generated: new Date().toISOString().slice(0, 10), note: "Security-rule diagnostics (Oxlint core+react+js-plugins, ESLint core+react security rules, Biome security rules; Biome's off-by-default noSecrets/nursery listed separately) on each fix commit's changed source files (tests excluded), before and after the fix.", sample: out }, null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
