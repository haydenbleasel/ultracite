// Runs ESLint (Node API) over one repo's included files with a flat config written here:
//   - sonarjs/cognitive-complexity at threshold 0  (every function scoring > 0 reports)
//   - core complexity at max 0, variant "classic" (every function reports; min score is 1)
//   - census/functions (local rule: records every function node; never reports)
// and joins the three per function. Output: out/<repo>.functions.json
//
// Usage: node analyze.cjs <repoName>            (repo from repos.json)
//        node analyze.cjs --files <outName> <root> <file...>   (ad-hoc, e.g. calibration)
//
// Safety: no config, plugin or code is loaded from the analysed repo. overrideConfigFile: true
// disables config lookup; files are only parsed.
"use strict";

const { mkdirSync, writeFileSync, readFileSync } = require("node:fs");
const { join, relative, resolve } = require("node:path");
const { execFileSync } = require("node:child_process");
const { load, versions } = require("./tools.cjs");
const { plugin: census, collector } = require("./census-plugin.cjs");
const { collect } = require("./collect-files.cjs");

const { ESLint, tsParser, sonarjs } = load();
const OUT = resolve(__dirname, "../out");

const SONAR_RE = /Cognitive Complexity from (\d+) to the 0 allowed/;
const CYCLO_RE = /^(.*) has a complexity of (\d+)\. Maximum allowed is 0\.$/;

const keyOfMsg = (m) => `${m.line}:${m.column}:${m.endLine}:${m.endColumn}`;

function gitInfo(root) {
  try {
    const sha = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const date = execFileSync(
      "git",
      ["-C", root, "log", "-1", "--format=%cI"],
      { encoding: "utf8" }
    ).trim();
    return { sha, date };
  } catch {
    return { sha: null, date: null };
  }
}

async function run({ name, root, files, meta }) {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    ignore: false,
    errorOnUnmatchedPattern: true,
    overrideConfig: [
      {
        files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
        languageOptions: {
          parser: tsParser,
          ecmaVersion: "latest",
          sourceType: "module",
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        linterOptions: {
          // Ignore in-file `eslint-disable` comments so suppressed functions are still measured,
          // and don't report unused ones.
          noInlineConfig: true,
          reportUnusedDisableDirectives: "off",
        },
        plugins: { sonarjs, census },
        rules: {
          "sonarjs/cognitive-complexity": ["error", 0],
          complexity: ["error", { max: 0, variant: "classic" }],
          "census/functions": "error",
        },
      },
    ],
  });

  const t0 = Date.now();
  const absFiles = files.map((f) => join(root, f));
  const results = await eslint.lintFiles(absFiles);
  const seconds = (Date.now() - t0) / 1000;

  const functions = [];
  const parseFailures = [];
  const unmatched = { sonar: [], cyclomatic: [] };
  const duplicateKeys = [];
  let classFieldInitializerReports = 0;
  let staticBlockReports = 0;
  let otherMessages = 0;
  const otherMessageKinds = {};
  let classFieldInitializers = 0;
  let staticBlocks = 0;
  let linesOfCode = 0;

  for (const res of results) {
    const file = relative(root, res.filePath).split("\\").join("/");
    const fatal = res.messages.filter((m) => m.fatal);
    if (fatal.length) {
      parseFailures.push({
        file,
        message: fatal[0].message,
        line: fatal[0].line,
      });
      continue;
    }
    linesOfCode += readFileSync(res.filePath, "utf8").split("\n").length;
    const entry = collector.get(res.filePath);
    if (!entry) throw new Error(`census missing for ${res.filePath}`);
    classFieldInitializers += entry.classFieldInitializers;
    staticBlocks += entry.staticBlocks;

    const bySonar = new Map();
    const byEslint = new Map();
    for (const fn of entry.functions) {
      for (const [map, key] of [
        [bySonar, fn.sonarKey],
        [byEslint, fn.eslintKey],
      ]) {
        if (!key) continue;
        if (map.has(key))
          duplicateKeys.push({ file, key, a: map.get(key).name, b: fn.name });
        map.set(key, fn);
      }
      fn.cognitive = 0; // sonarjs only reports scores > threshold (0)
      fn.cyclomatic = null;
    }

    for (const m of res.messages) {
      if (m.ruleId === "sonarjs/cognitive-complexity") {
        const score = Number(SONAR_RE.exec(m.message)?.[1]);
        const fn = bySonar.get(keyOfMsg(m));
        if (!fn || Number.isNaN(score))
          unmatched.sonar.push({ file, line: m.line, message: m.message });
        else fn.cognitive = score;
      } else if (m.ruleId === "complexity") {
        const match = CYCLO_RE.exec(m.message);
        if (match?.[1] === "Class field initializer") {
          classFieldInitializerReports++;
          continue;
        }
        if (match?.[1] === "Class static block") {
          staticBlockReports++;
          continue;
        }
        const fn = byEslint.get(keyOfMsg(m));
        if (!fn || !match)
          unmatched.cyclomatic.push({ file, line: m.line, message: m.message });
        else fn.cyclomatic = Number(match[2]);
      } else {
        otherMessages++;
        const k = `${m.ruleId}: ${m.message.replace(/'[^']*'/g, "'…'")}`;
        otherMessageKinds[k] = (otherMessageKinds[k] ?? 0) + 1;
      }
    }

    for (const fn of entry.functions) {
      delete fn.sonarKey;
      delete fn.eslintKey;
      delete fn.range;
      functions.push({ file, ...fn });
    }
  }

  const missingCyclomatic = functions.filter(
    (f) => f.cyclomatic === null
  ).length;
  const out = {
    name,
    ...meta,
    root,
    tools: versions(),
    files: { linted: results.length - parseFailures.length, parseFailures },
    linesOfCode,
    seconds,
    join: {
      functions: functions.length,
      sonarReports: functions.filter((f) => f.cognitive > 0).length,
      unmatchedSonarReports: unmatched.sonar,
      unmatchedCyclomaticReports: unmatched.cyclomatic,
      functionsWithoutCyclomatic: missingCyclomatic,
      duplicateKeys,
      classFieldInitializers,
      classFieldInitializerReports,
      staticBlocks,
      staticBlockReports,
      otherMessages,
      otherMessageKinds,
    },
    functions,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${name}.functions.json`), JSON.stringify(out));
  const nonzero = functions.filter((f) => f.cognitive > 0).length;
  console.log(
    `${name}: ${out.files.linted} files (${parseFailures.length} parse failures), ${functions.length} functions, ` +
      `${nonzero} with cognitive>0, unmatched sonar=${unmatched.sonar.length} cyclo=${unmatched.cyclomatic.length}, ` +
      `missing cyclo=${missingCyclomatic}, dup keys=${duplicateKeys.length}, other msgs=${otherMessages}, ${seconds.toFixed(1)}s`
  );
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--files") {
    const [, name, root, ...files] = args;
    await run({ name, root: resolve(root), files, meta: { adhoc: true } });
    return;
  }
  const { repo, files, excluded, excludedFiles } = collect(args[0]);
  const git = gitInfo(repo.root);
  await run({
    name: repo.name,
    root: repo.root,
    files,
    meta: {
      github: repo.github,
      sha: git.sha,
      commitDate: git.date,
      include: repo.include,
      repoSpecificExclude: repo.exclude,
      excludedCounts: excluded,
      excludedFiles,
      includedFiles: files.length,
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
