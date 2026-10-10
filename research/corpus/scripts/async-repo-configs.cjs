// Records what each corpus repo's own lint config says about the async rules, at the pinned SHA:
// every line of a root-level ESLint, Biome or Oxlint config that names one of them (or a
// typescript-eslint preset that includes them), with a permalink. Read-only; configs are read as
// text, never loaded.
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-repo-configs.cjs [--topic floating-promises]
// Writes results/<topic>/repo-configs.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { join, resolve } = require("node:path");

const { getRepo } = require("./collect-files.cjs");
const config = require("./repos.json");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const TOPIC = args.includes("--topic")
  ? args[args.indexOf("--topic") + 1]
  : (process.env.RESEARCH_TOPIC ?? "floating-promises");

const CONFIG_FILE =
  /^(?:eslint\.config\.[cm]?[jt]s|eslint\.[a-z]+\.config\.[cm]?[jt]s|\.eslintrc(?:\.[a-z]+)?|biome\.jsonc?|\.oxlintrc\.json|oxlint\.config\.[cm]?[jt]s)$/;
const RULE =
  /no-floating-promises|no-misused-promises|require-await|no-await-in-loop|no-async-promise-executor|await-thenable|return-await|promise-function-async|recommendedTypeChecked|strictTypeChecked|noFloatingPromises|noMisusedPromises|useAwait|noAwaitInLoops|code-must-use-result|code-no-.*-after-await/;

const main = () => {
  const out = { generated: new Date().toISOString().slice(0, 10), repos: {} };
  for (const { name } of config.repos) {
    if (name === "ultracite") {
      continue;
    }
    const repo = getRepo(name);
    const sha = execFileSync("git", ["-C", repo.root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const files = readdirSync(repo.root).filter((f) => CONFIG_FILE.test(f));
    const lines = [];
    for (const file of files) {
      const text = readFileSync(join(repo.root, file), "utf8").split("\n");
      text.forEach((line, i) => {
        if (RULE.test(line)) {
          lines.push({
            file,
            line: i + 1,
            permalink: `https://github.com/${repo.github}/blob/${sha}/${file}#L${i + 1}`,
            text: line.trim().slice(0, 160),
          });
        }
      });
    }
    out.repos[name] = { configFiles: files, lines };
    console.log(
      name,
      files.join(", ") || "(no root lint config)",
      lines.length
    );
  }
  const dir = join(HERE, "results", TOPIC);
  if (!existsSync(dir)) {
    throw new Error(`${dir} does not exist`);
  }
  writeFileSync(
    join(dir, "repo-configs.json"),
    `${JSON.stringify(out, null, 2)}\n`
  );
};

main();
