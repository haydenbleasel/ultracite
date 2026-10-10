// Type-aware async census: runs typescript-eslint's `no-floating-promises`, `no-misused-promises`
// and the other type-aware async rules Ultracite enables over the corpus, and the same rules in
// Oxlint's type-aware mode (tsgolint), with type information from each repo's own tsconfig files.
//
// The clones have no node_modules, so imports of dependencies (and, in monorepos, of sibling
// packages resolved through workspace symlinks) don't resolve. An unresolved import is typed
// `any`, and a call through it can't be seen as a promise, so the rules undercount. To make that
// visible rather than silent, a probe rule reads the very program typescript-eslint built for each
// file and records:
//   - how many import specifiers resolve (TypeScript's own module resolution, same options);
//   - TypeScript's semantic diagnostics by code (TS2307 "cannot find module" and friends);
//   - the type of every bare call statement (`f();`): thenable, `any`/error, or something else.
// A repo with many unresolved imports is still measured, but flagged as a lower bound.
//
// Read-only: each repo's tsconfig is read; nothing is installed, built or executed.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/async-typed-census.cjs \
//     [--repos zod,hono] [--topic floating-promises] [--skip-oxlint] [--skip-eslint]
// Writes results/<topic>/typed-census.json (merged per repo) and
// out/floating-promises/typed/<repo>.json (every hit, for sampling and the detector check).
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");

const { collect } = require("./collect-files.cjs");
const config = require("./repos.json");
const { dirs, ULTRACITE } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const CLI = join(ULTRACITE, "packages/cli");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "floating-promises");
// Default: the 8 external repos (Ultracite's own CLI is the dogfood reference elsewhere).
const REPOS = arg(
  "repos",
  config.repos
    .map((r) => r.name)
    .filter((n) => n !== "ultracite")
    .join(",")
).split(",");
const OUT_DIR = join(HERE, "out", "floating-promises", "typed");

const ts = require(join(dirs.typescript, "lib/typescript.js"));
const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
const tsParser = require(
  require.resolve("@typescript-eslint/parser", { paths: [CLI] })
);
const tsPlugin = require(
  require.resolve("@typescript-eslint/eslint-plugin", { paths: [CLI] })
);
const version = (name, base) =>
  require(require.resolve(`${name}/package.json`, { paths: [base] })).version;

// The type-aware async rules Ultracite turns on, with Ultracite's options.
const RULES = {
  "await-thenable": "error",
  "no-floating-promises": "error",
  "no-misused-promises": "error",
  "promise-function-async": "error",
  "require-await": "error",
  "return-await": ["error", "always"],
  "strict-void-return": "error",
};

// TS2307 cannot find module, TS2792 cannot find module (moduleResolution hint), TS7016 no
// declaration file, TS2688 cannot find type definition file, TS2875 JSX runtime missing.
const UNRESOLVED = new Set([2307, 2688, 2792, 2875, 7016]);

// ── probe rule: what the program behind each file can and can't see ───────────────────────
const probeRows = new Map();
const programDiagnostics = new Map();
let currentRoot = "";
const isThenable = (checker, type) => {
  const parts = type.isUnion() ? type.types : [type];
  return parts.some((t) => {
    const then = t.getProperty("then");
    if (!then) {
      return false;
    }
    const thenType = checker.getTypeOfSymbol(then);
    return thenType.getCallSignatures().length > 0;
  });
};
const typeKind = (checker, type) => {
  if (type.flags & ts.TypeFlags.Any) {
    // The error type (an unresolved name) is an intrinsic `any` named "error".
    return type.intrinsicName === "error" ? "error" : "any";
  }
  if (isThenable(checker, type)) {
    return "thenable";
  }
  return "other";
};
const probe = {
  rules: {
    types: {
      create(context) {
        const services = context.sourceCode.parserServices;
        if (!services?.program) {
          return {};
        }
        const { program, esTreeNodeToTSNodeMap } = services;
        const checker = program.getTypeChecker();
        const sf = program.getSourceFile(context.filename);
        const row = {
          bareCalls: { any: 0, error: 0, other: 0, thenable: 0 },
          diagnostics: {},
          imports: {
            bare: 0,
            bareUnresolved: 0,
            relative: 0,
            relativeUnresolved: 0,
            resolvedOutsideClone: 0,
          },
          outsideSpecifiers: [],
          unresolvedSpecifiers: [],
        };
        probeRows.set(context.filename, row);
        // Options and global diagnostics (such as TS2688, a `types` entry that isn't installed)
        // belong to the program, not a file: record them once per tsconfig.
        const configPath =
          program.getCompilerOptions().configFilePath ?? "(none)";
        row.tsconfig = configPath;
        if (!programDiagnostics.has(configPath)) {
          const codes = {};
          for (const d of [
            ...program.getOptionsDiagnostics(),
            ...program.getGlobalDiagnostics(),
          ]) {
            codes[d.code] = (codes[d.code] ?? 0) + 1;
          }
          programDiagnostics.set(configPath, codes);
        }
        // A module is "seen" when the checker has a symbol for the specifier. That includes
        // ambient `declare module` declarations, such as @types/node's "node:path".
        const countImport = (source) => {
          if (source?.type !== "Literal" || typeof source.value !== "string") {
            return;
          }
          const spec = source.value;
          const kind = spec.startsWith(".") ? "relative" : "bare";
          row.imports[kind]++;
          const symbol = checker.getSymbolAtLocation(
            esTreeNodeToTSNodeMap.get(source)
          );
          const declFile = symbol?.declarations?.[0]?.getSourceFile().fileName;
          if (!declFile) {
            row.imports[`${kind}Unresolved`]++;
            row.unresolvedSpecifiers.push(spec);
          } else if (!declFile.startsWith(currentRoot)) {
            // TypeScript walked up out of the clone into this repo's own node_modules.
            row.imports.resolvedOutsideClone++;
            row.outsideSpecifiers.push(spec);
          }
        };
        return {
          "ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration"(
            node
          ) {
            countImport(node.source);
          },
          ExpressionStatement(node) {
            let expr = node.expression;
            if (expr.type === "ChainExpression") {
              expr = expr.expression;
            }
            if (expr.type !== "CallExpression") {
              return;
            }
            const tsNode = esTreeNodeToTSNodeMap.get(expr);
            row.bareCalls[
              typeKind(checker, checker.getTypeAtLocation(tsNode))
            ]++;
          },
          ImportExpression(node) {
            countImport(node.source);
          },
          "Program:exit"() {
            if (!sf) {
              return;
            }
            for (const d of program.getSemanticDiagnostics(sf)) {
              row.diagnostics[d.code] = (row.diagnostics[d.code] ?? 0) + 1;
            }
          },
        };
      },
    },
  },
};

// ── typescript-eslint ──────────────────────────────────────────────────
const lintEslint = async (root, files) => {
  probeRows.clear();
  programDiagnostics.clear();
  currentRoot = `${root}/`;
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
        plugins: { "@typescript-eslint": tsPlugin, probe },
        rules: {
          ...Object.fromEntries(
            Object.entries(RULES).map(([r, v]) => [
              `@typescript-eslint/${r}`,
              v,
            ])
          ),
          "probe/types": "error",
        },
      },
    ],
    overrideConfigFile: true,
  });
  const results = await eslint.lintFiles(files);
  const hits = [];
  const fatal = [];
  for (const r of results) {
    const file = relative(root, r.filePath);
    for (const m of r.messages) {
      if (m.fatal) {
        fatal.push({ file, message: m.message.slice(0, 200) });
        continue;
      }
      if (!m.ruleId?.startsWith("@typescript-eslint/")) {
        continue;
      }
      hits.push({
        column: m.column,
        endColumn: m.endColumn,
        endLine: m.endLine,
        file,
        line: m.line,
        messageId: m.messageId,
        rule: m.ruleId.replace("@typescript-eslint/", ""),
      });
    }
  }
  const probeByFile = Object.fromEntries(
    [...probeRows].map(([f, row]) => [relative(root, f), row])
  );
  return {
    fatal,
    hits,
    probeByFile,
    programDiagnostics: Object.fromEntries(
      [...programDiagnostics].map(([k, v]) => [relative(root, k) || k, v])
    ),
  };
};

// ── Oxlint type-aware (tsgolint) ───────────────────────────────────────
const oxlintPkgPath = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const oxlintBin = join(dirname(oxlintPkgPath), "bin", "oxlint");
const tsgolintPkg = realpathSync(
  require.resolve("oxlint-tsgolint/package.json", { paths: [CLI] })
);
const tsgolintBin = (() => {
  const platform = `@oxlint-tsgolint/${process.platform}-${process.arch}`;
  return join(
    dirname(
      require.resolve(`${platform}/package.json`, {
        paths: [dirname(tsgolintPkg)],
      })
    ),
    "tsgolint"
  );
})();

const lintOxlint = (root, files) => {
  mkdirSync(OUT_DIR, { recursive: true });
  const configFile = join(OUT_DIR, "oxlint.typed.json");
  writeFileSync(
    configFile,
    JSON.stringify(
      {
        // Only these rules: switch off the categories Oxlint enables by default.
        categories: {
          correctness: "off",
          nursery: "off",
          pedantic: "off",
          perf: "off",
          restriction: "off",
          style: "off",
          suspicious: "off",
        },
        plugins: ["typescript"],
        rules: Object.fromEntries(
          Object.entries(RULES).map(([r, v]) => [`typescript/${r}`, v])
        ),
      },
      null,
      2
    )
  );
  const hits = [];
  const errors = [];
  const tsconfigErrors = new Set();
  const CHUNK = 400;
  let linted = 0;
  for (let i = 0; i < files.length; i += CHUNK) {
    let stdout;
    try {
      stdout = execFileSync(
        process.execPath,
        [
          oxlintBin,
          "--type-aware",
          "-c",
          configFile,
          "--disable-nested-config",
          "--format",
          "json",
          ...files.slice(i, i + CHUNK),
        ],
        {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, OXLINT_TSGOLINT_PATH: tsgolintBin },
          maxBuffer: 1 << 28,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );
    } catch (error) {
      stdout = error.stdout;
      if (!stdout) {
        throw error;
      }
    }
    const report = JSON.parse(stdout);
    linted += report.number_of_files;
    for (const d of report.diagnostics) {
      const match = /^typescript\((.+)\)$/.exec(d.code ?? "");
      if (!match) {
        errors.push({ file: d.filename, message: d.message.slice(0, 200) });
        continue;
      }
      // tsgolint refuses a tsconfig it can't load (for example a `types` entry that isn't
      // installed) and then type-checks none of that project's files.
      if (match[1] === "tsconfig-error") {
        tsconfigErrors.add(`${d.filename}: ${d.help ?? d.message}`);
        continue;
      }
      const span = d.labels?.[0]?.span ?? {};
      hits.push({
        column: span.column,
        file: d.filename,
        line: span.line,
        message: d.message,
        rule: match[1],
      });
    }
  }
  return { errors, hits, linted, tsconfigErrors: [...tsconfigErrors].sort() };
};

// ── suppression comments near a hit (in-file, as `ultracite check` would honour) ──────────
const suppressedBy = (text, rule) => {
  const lines = text.split("\n");
  const names = new RegExp(`(?:@typescript-eslint|typescript)/${rule}\\b`);
  const directive =
    /\b(?:eslint|oxlint)-disable(?:-next-line|-line)?\b([^\n*]*)/;
  const fileLevel = lines.some((l) => {
    const m = /\/\*\s*(?:eslint|oxlint)-disable\s+([^*]*)\*\//.exec(l);
    return m && (m[1].trim() === "" || names.test(m[1]));
  });
  return (line) => {
    if (fileLevel) {
      return "file";
    }
    for (const [n, kind] of [
      [line - 1, "line"],
      [line - 2, "next-line"],
    ]) {
      const l = lines[n] ?? "";
      const m = directive.exec(l);
      if (!m) {
        continue;
      }
      const isNext = /disable-next-line/.test(l);
      const isLine = /disable-line/.test(l);
      if ((kind === "line" && !isLine) || (kind === "next-line" && !isNext)) {
        continue;
      }
      if (m[1].trim() === "" || names.test(m[1])) {
        return kind;
      }
    }
    return null;
  };
};

const tally = (hits) => {
  const counts = {};
  for (const h of hits) {
    counts[h.rule] = (counts[h.rule] ?? 0) + 1;
  }
  // Sorted, so the JSON doesn't depend on the order tsgolint reports in.
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
  );
};

const summariseProbe = (probeByFile) => {
  const sum = {
    bareCalls: { any: 0, error: 0, other: 0, thenable: 0 },
    diagnostics: {},
    files: 0,
    imports: {
      bare: 0,
      bareUnresolved: 0,
      relative: 0,
      relativeUnresolved: 0,
      resolvedOutsideClone: 0,
    },
    topOutside: {},
    topUnresolved: {},
  };
  // Group specifiers by package name (or "relative").
  const pkg = (spec) => {
    if (spec.startsWith(".")) {
      return "(relative)";
    }
    return spec.startsWith("@")
      ? spec.split("/").slice(0, 2).join("/")
      : spec.split("/")[0];
  };
  for (const row of Object.values(probeByFile)) {
    sum.files++;
    for (const k of Object.keys(sum.bareCalls)) {
      sum.bareCalls[k] += row.bareCalls[k];
    }
    for (const k of Object.keys(sum.imports)) {
      sum.imports[k] += row.imports[k];
    }
    for (const [code, n] of Object.entries(row.diagnostics)) {
      sum.diagnostics[code] = (sum.diagnostics[code] ?? 0) + n;
    }
    for (const spec of row.unresolvedSpecifiers) {
      sum.topUnresolved[pkg(spec)] = (sum.topUnresolved[pkg(spec)] ?? 0) + 1;
    }
    for (const spec of row.outsideSpecifiers) {
      sum.topOutside[pkg(spec)] = (sum.topOutside[pkg(spec)] ?? 0) + 1;
    }
  }
  const top = (counts) =>
    Object.fromEntries(
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 15)
    );
  sum.topUnresolved = top(sum.topUnresolved);
  sum.topOutside = top(sum.topOutside);
  const totalImports = sum.imports.bare + sum.imports.relative;
  const unresolved =
    sum.imports.bareUnresolved + sum.imports.relativeUnresolved;
  sum.importResolution =
    totalImports === 0
      ? null
      : Math.round((1 - unresolved / totalImports) * 1000) / 10;
  const calls = Object.values(sum.bareCalls).reduce((a, b) => a + b, 0);
  sum.bareCallsUntyped =
    calls === 0
      ? null
      : Math.round(((sum.bareCalls.any + sum.bareCalls.error) / calls) * 1000) /
        10;
  sum.unresolvedDiagnostics = Object.entries(sum.diagnostics)
    .filter(([code]) => UNRESOLVED.has(Number(code)))
    .reduce((a, [, n]) => a + n, 0);
  return sum;
};

const main = async () => {
  const resultsDir = join(HERE, "results", TOPIC);
  mkdirSync(resultsDir, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(resultsDir, "typed-census.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { repos: {} };
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Hits count every occurrence (noInlineConfig). 'suppressed' = an in-file eslint/oxlint disable comment naming the rule (or blanket) on the line, the line above, or file-wide. probe.importResolution is the share of import specifiers TypeScript resolves; probe.bareCallsUntyped is the share of bare call statements typed any/error, which these rules cannot judge. A repo with unresolved imports is a lower bound.",
    rules: RULES,
    tools: {
      "@typescript-eslint/eslint-plugin": version(
        "@typescript-eslint/eslint-plugin",
        CLI
      ),
      eslint: version("eslint", CLI),
      oxlint: require(oxlintPkgPath).version,
      "oxlint-tsgolint": require(tsgolintPkg).version,
      typescript: ts.version,
    },
    repos: {},
  };
  for (const name of REPOS) {
    const { repo, files } = collect(name);
    const tsFiles = files.filter((f) => /\.(?:ts|tsx|mts|cts)$/.test(f));
    const entry = {
      files: tsFiles.length,
      jsFilesSkipped: files.length - tsFiles.length,
    };
    const rows = { repo: name };
    if (!args.includes("--skip-eslint")) {
      const started = Date.now();
      const {
        fatal,
        hits,
        probeByFile,
        programDiagnostics: programDiags,
      } = await lintEslint(repo.root, tsFiles);
      const texts = new Map();
      for (const h of hits) {
        if (!texts.has(h.file)) {
          texts.set(h.file, readFileSync(join(repo.root, h.file), "utf8"));
        }
        h.suppressed = suppressedBy(texts.get(h.file), h.rule)(h.line);
      }
      const byMessage = {};
      for (const h of hits) {
        const key = `${h.rule}:${h.messageId}`;
        byMessage[key] = (byMessage[key] ?? 0) + 1;
      }
      entry.eslint = {
        byMessageId: byMessage,
        counts: tally(hits),
        fatal: fatal.length,
        fatalSamples: fatal.slice(0, 3),
        filesWithHits: {
          "no-floating-promises": new Set(
            hits
              .filter((h) => h.rule === "no-floating-promises")
              .map((h) => h.file)
          ).size,
          "no-misused-promises": new Set(
            hits
              .filter((h) => h.rule === "no-misused-promises")
              .map((h) => h.file)
          ).size,
        },
        seconds: Math.round((Date.now() - started) / 1000),
        suppressed: tally(hits.filter((h) => h.suppressed)),
      };
      entry.probe = {
        ...summariseProbe(probeByFile),
        programDiagnostics: programDiags,
      };
      rows.eslint = hits;
      rows.probeByFile = probeByFile;
      console.log(
        `${name} eslint: ${JSON.stringify(entry.eslint.counts)} fatal ${fatal.length}, imports resolved ${entry.probe.importResolution}%, bare calls untyped ${entry.probe.bareCallsUntyped}% (${entry.eslint.seconds}s)`
      );
    }
    if (!args.includes("--skip-oxlint")) {
      const started = Date.now();
      const { errors, hits, linted, tsconfigErrors } = lintOxlint(
        repo.root,
        tsFiles
      );
      entry.oxlint = {
        counts: tally(hits),
        errors: errors.length,
        errorSamples: errors.slice(0, 3),
        tsconfigErrors,
        linted,
        seconds: Math.round((Date.now() - started) / 1000),
      };
      rows.oxlint = hits;
      console.log(
        `${name} oxlint: ${JSON.stringify(entry.oxlint.counts)} errors ${errors.length} (${entry.oxlint.seconds}s)`
      );
    }
    out.repos[name] = { ...(previous.repos?.[name] ?? {}), ...entry };
    const rowsPath = join(OUT_DIR, `${name}.json`);
    const prevRows = existsSync(rowsPath)
      ? JSON.parse(readFileSync(rowsPath, "utf8"))
      : {};
    writeFileSync(rowsPath, JSON.stringify({ ...prevRows, ...rows }));
  }
  writeFileSync(
    path,
    `${JSON.stringify({ ...previous, ...out, repos: { ...previous.repos, ...out.repos } }, null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
