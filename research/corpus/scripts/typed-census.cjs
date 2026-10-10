// Type-aware escape-hatch census for repos whose sources type-check without installing anything
// (no runtime dependencies, so no node_modules are needed). It first type-checks the collected
// files with the TypeScript compiler API and records how many diagnostics are unresolved-module
// errors, so a repo where types don't resolve can be excluded rather than silently measured on
// `any`s. Then it runs typescript-eslint's type-aware escape-hatch rules over the same files.
//
// Read-only: the repo's own tsconfig is read, nothing is installed, built or executed.
//
// Usage (from the repo root):
//   node research/corpus/scripts/typed-census.cjs --repos zod,hono [--tsconfig tsconfig.json]
//     [--topic type-escape-hatches]
// Writes results/<topic>/typed-census.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join, resolve } = require("node:path");

const { collect } = require("./collect-files.cjs");
const { dirs, ULTRACITE } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const CLI = join(ULTRACITE, "packages/cli");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "type-escape-hatches");
const REPOS = arg("repos", "zod,hono").split(",");
const TSCONFIG = arg("tsconfig", "tsconfig.json");

const ts = require(join(dirs.typescript, "lib/typescript.js"));
const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
const tsParser = require(
  require.resolve("@typescript-eslint/parser", { paths: [CLI] })
);
const tsPlugin = require(
  require.resolve("@typescript-eslint/eslint-plugin", { paths: [CLI] })
);

const TYPED_RULES = [
  "no-unnecessary-type-assertion",
  "no-unsafe-argument",
  "no-unsafe-assignment",
  "no-unsafe-call",
  "no-unsafe-member-access",
  "no-unsafe-return",
  "no-unsafe-type-assertion",
];
const SYNTAX_RULES = ["no-explicit-any", "no-non-null-assertion"];

// TS2307 cannot find module, TS2875 JSX runtime missing, TS7016 no declaration file,
// TS2688 cannot find type definition file.
const UNRESOLVED = new Set([2307, 2688, 2875, 7016]);

const typeCheck = (root, files) => {
  const configPath = join(root, TSCONFIG);
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const program = ts.createProgram({
    options: { ...parsed.options, noEmit: true },
    rootNames: files.map((f) => join(root, f)),
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const byCode = {};
  for (const d of diagnostics) {
    byCode[d.code] = (byCode[d.code] ?? 0) + 1;
  }
  const unresolved = diagnostics.filter((d) => UNRESOLVED.has(d.code));
  return {
    byCode,
    total: diagnostics.length,
    unresolved: unresolved.length,
    unresolvedSamples: unresolved
      .slice(0, 5)
      .map((d) =>
        ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 160)
      ),
  };
};

const lint = async (root, files) => {
  const eslint = new ESLint({
    cwd: root,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.{ts,tsx,mts,cts}"],
        languageOptions: {
          parser: tsParser,
          parserOptions: { projectService: true, tsconfigRootDir: root },
        },
        linterOptions: {
          noInlineConfig: true,
          reportUnusedDisableDirectives: "off",
        },
        plugins: { "@typescript-eslint": tsPlugin },
        rules: Object.fromEntries(
          [...TYPED_RULES, ...SYNTAX_RULES].map((r) => [
            `@typescript-eslint/${r}`,
            "error",
          ])
        ),
      },
    ],
    overrideConfigFile: true,
  });
  const results = await eslint.lintFiles(files);
  const counts = {};
  const positions = {
    "no-unnecessary-type-assertion": new Set(),
    "no-unsafe-type-assertion": new Set(),
  };
  let fatal = 0;
  for (const r of results) {
    const file = r.filePath.slice(root.length + 1);
    for (const m of r.messages) {
      const short = (m.ruleId ?? "").replace("@typescript-eslint/", "");
      if (short in positions) {
        positions[short].add(`${file}:${m.line}:${m.column}`);
      }
      if (m.fatal) {
        fatal++;
        continue;
      }
      // Each in-file directive produces a "has no effect because of noInlineConfig" notice.
      const notice = m.ruleId === null && m.message.includes("noInlineConfig");
      const rule = notice
        ? "(inline config ignored)"
        : (m.ruleId ?? "other").replace("@typescript-eslint/", "");
      counts[rule] = (counts[rule] ?? 0) + 1;
    }
  }
  return { counts, fatal, positions };
};

// Joins the two assertion rules to the assertion sites from escape-hatch-census.cjs (same start
// position), so each cast is counted once: unsafe (it narrows), unnecessary (TS already knew the
// type), or neither. A double cast is one site; it's unsafe if either half is.
const assertionsByKind = (name, positions) => {
  const sitesPath = join(HERE, "out", "escape-hatches", `${name}.sites.json`);
  if (!existsSync(sitesPath)) {
    return null;
  }
  const { sites } = JSON.parse(readFileSync(sitesPath, "utf8"));
  const byKind = {};
  const examples = [];
  for (const s of sites.filter(
    (x) => x.kind === "assertion" || x.kind === "nonNull"
  )) {
    const key = `${s.file}:${s.line}:${s.col}`;
    const kind = s.kind === "nonNull" ? "non-null (x!)" : s.assertion;
    const row = (byKind[kind] ??= {
      both: 0,
      neither: 0,
      total: 0,
      unnecessary: 0,
      unnecessaryOnly: 0,
      unsafe: 0,
      unsafeOnly: 0,
    });
    const unsafe = positions["no-unsafe-type-assertion"].has(key);
    const unnecessary = positions["no-unnecessary-type-assertion"].has(key);
    row.total++;
    row.unsafe += unsafe ? 1 : 0;
    row.unnecessary += unnecessary ? 1 : 0;
    if (unsafe && unnecessary) {
      row.both++;
    } else if (unsafe) {
      row.unsafeOnly++;
    } else if (unnecessary) {
      row.unnecessaryOnly++;
    } else {
      row.neither++;
    }
    if (s.kind === "nonNull") {
      row.unnecessaryByAsserted ??= {};
      if (unnecessary) {
        row.unnecessaryByAsserted[s.asserted] =
          (row.unnecessaryByAsserted[s.asserted] ?? 0) + 1;
      }
    }
    // Keep the first few unnecessary `!` and `as T` as examples to check by eye.
    if (unnecessary && examples.filter((e) => e.kind === kind).length < 8) {
      examples.push({ file: s.file, kind, line: s.line });
    }
  }
  return { byKind, examples };
};

const main = async () => {
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Type-aware rules need resolved types. typeCheck.unresolved counts module-resolution errors; a repo with many is not trustworthy here.",
    repos: {},
    tools: {
      "@typescript-eslint/eslint-plugin": require(
        require.resolve("@typescript-eslint/eslint-plugin/package.json", {
          paths: [CLI],
        })
      ).version,
      typescript: ts.version,
    },
  };
  for (const name of REPOS) {
    const { repo, files } = collect(name);
    const tsFiles = files.filter((f) => /\.(?:ts|tsx|mts|cts)$/.test(f));
    if (!existsSync(join(repo.root, TSCONFIG))) {
      throw new Error(`${name}: no ${TSCONFIG}`);
    }
    const started = Date.now();
    const typeCheckResult = typeCheck(repo.root, tsFiles);
    const { positions, ...lintResult } = await lint(repo.root, tsFiles);
    const { byKind: joined, examples } =
      assertionsByKind(name, positions) ?? {};
    const joinedTotal = (rule) =>
      Object.values(joined ?? {}).reduce((s, r) => s + r[rule], 0);
    out.repos[name] = {
      assertionsByKind: joined,
      unnecessaryExamples: examples,
      assertionJoin: {
        unnecessaryDiagnostics: positions["no-unnecessary-type-assertion"].size,
        unnecessaryJoined: joinedTotal("unnecessary"),
        unsafeDiagnosticPositions: positions["no-unsafe-type-assertion"].size,
        unsafeJoined: joinedTotal("unsafe"),
      },
      files: tsFiles.length,
      lint: lintResult,
      seconds: Math.round((Date.now() - started) / 1000),
      tsconfig: TSCONFIG,
      typeCheck: typeCheckResult,
    };
    console.log(name, JSON.stringify(out.repos[name]));
  }
  const dir = join(HERE, "results", TOPIC);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "typed-census.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { repos: {} };
  writeFileSync(
    path,
    `${JSON.stringify({ ...out, repos: { ...previous.repos, ...out.repos } }, null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
