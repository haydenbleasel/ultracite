// Copies the agent-experiment subjects for the floating-promises post out of the corpus, with
// their license, and checks that each one still has its violation when type-checked on its own.
//
// Each subject is a real function with a genuine no-floating-promises or no-misused-promises
// violation, copied verbatim. Anything the function needs from elsewhere (a type, a global's
// signature) is added as a marked stub. The script records the diagnostics measured in place
// (async-typed-census.cjs, with the repo's own tsconfig) and standalone (the example file with
// ./tsconfig.json, in typescript-eslint and in Oxlint's type-aware mode), and the TypeScript
// compiler's own diagnostics, which must be zero.
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-examples.cjs
// Writes examples/floating-promises/<id>.ts and examples/floating-promises/examples.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const { getRepo } = require("./collect-files.cjs");
const { dirs, ULTRACITE } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const CLI = join(ULTRACITE, "packages/cli");
const OUT = join(HERE, "examples", "floating-promises");

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
const oxlintPkg = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const tsgolintPkg = realpathSync(
  require.resolve("oxlint-tsgolint/package.json", { paths: [CLI] })
);
const tsgolintBin = join(
  dirname(
    require.resolve(
      `@oxlint-tsgolint/${process.platform}-${process.arch}/package.json`,
      {
        paths: [dirname(tsgolintPkg)],
      }
    )
  ),
  "tsgolint"
);

const SUBJECTS = [
  {
    file: "src/utils/concurrent.ts",
    function: "createPool",
    id: "fp1-hono-create-pool",
    kind: "arrow (exported const), with its module",
    lines: [1, 55],
    notes: [
      "The whole module is copied (it has no imports).",
      "Violation: `setTimeout(() => run(fn, promise, resolve))` hands a promise-returning callback to a slot typed to return void (no-misused-promises, checksVoidReturn). The diagnostic needs Node's setTimeout signature; hono's tsconfig includes @types/node. The stub reproduces that signature, so the file lints the same way without @types/node.",
      "Why it matters: when the pool is full, a task is re-queued through setTimeout. If that task's fn throws, the re-run rejects, setTimeout drops the rejection (an unhandled rejection), `resolve` is never called, and the caller's promise never settles. The pool slot (`marker`) is also never released when fn throws, a separate leak the lint rule doesn't see.",
      "A fix that only silences the rule (`setTimeout(() => void run(...))`) keeps the hang. A real fix propagates the rejection to the queued caller (keep `reject` alongside `resolve`, and `.catch(reject)` the re-run) and releases the slot in a `finally`.",
    ],
    repo: "hono",
    stubs: [
      "// STUB (not part of the original source): Node's setTimeout signature from @types/node,",
      "// which hono's tsconfig includes. With only the DOM lib, setTimeout takes a TimerHandler",
      "// (string | Function) and no-misused-promises would not fire.",
      "declare function setTimeout(callback: (...args: unknown[]) => void, ms?: number): unknown",
      "",
    ],
  },
  {
    file: "packages/astro/src/core/logger/impls/compose.ts",
    function: "compose",
    id: "fp2-astro-compose-logger",
    kind: "declaration (default export)",
    lines: [3, 26],
    notes: [
      "Line 1 (a type-only import of AstroLoggerDestination) is replaced by a stub: the interface copied verbatim from packages/astro/src/core/logger/core.ts lines 4-19 at the same commit, with AstroLoggerMessage stubbed.",
      "Violation: `logger.flush()` and `logger.close()` are called as bare statements, and each destination may return `Promise<void>` (no-floating-promises, twice).",
      "Why it matters: the composite's flush() and close() return before the destinations finish, so a caller that awaits the composite (the interface allows `Promise<void> | void`) is told the logs are flushed when they may not be, and a destination whose flush or close rejects becomes an unhandled rejection.",
      "A fix that only silences the rule (`void logger.flush()`) keeps both problems. A real fix collects the destinations' results and returns `Promise.all(...)` (or awaits them), so failures reach the caller.",
    ],
    repo: "astro",
    stubs: [
      "// STUB (not part of the original source): AstroLoggerMessage, simplified.",
      "type AstroLoggerMessage = { label: string | null; level: string; message: string; newLine: boolean }",
      "",
      "// Copied verbatim from packages/astro/src/core/logger/core.ts, lines 4-19, at the same commit.",
    ],
    stubFrom: {
      file: "packages/astro/src/core/logger/core.ts",
      lines: [4, 19],
    },
  },
];

const RULES = ["no-floating-promises", "no-misused-promises"];

const header = (s, repo, sha, date) => {
  const license = readFileSync(join(repo.root, repo.license), "utf8")
    .trimEnd()
    .split("\n")
    .map((l) => (l ? ` * ${l}` : " *"))
    .join("\n");
  const [from, to] = s.lines;
  return [
    "/*",
    ` * Example ${s.id}: agent-experiment subject for the floating-promises post`,
    " *",
    ` * Source:    ${repo.github} — ${s.file}, lines ${from}-${to}`,
    ` * Commit:    ${sha} (${date})`,
    ` * Permalink: https://github.com/${repo.github}/blob/${sha}/${s.file}#L${from}-L${to}`,
    ` * Function:  ${s.function} (${s.kind})`,
    " * Diagnostics (measured in place, with the repo's own tsconfig, at the commit above):",
    ...s.inPlace.map(
      (d) =>
        ` *   line ${d.line}: @typescript-eslint/${d.rule} (${d.messageId})`
    ),
    ` * The source (lines ${from}-${to}) is copied verbatim.`,
    " * Anything marked as a stub is not part of the original source.",
    " *",
    ` * License of the source repository (${repo.github}/${repo.license}), reproduced in full:`,
    " *",
    license,
    " */",
    "",
  ].join("\n");
};

const lintStandalone = async (file) => {
  const eslint = new ESLint({
    cwd: OUT,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: {
          parser: tsParser,
          parserOptions: { projectService: true, tsconfigRootDir: OUT },
        },
        linterOptions: { noInlineConfig: true },
        plugins: { "@typescript-eslint": tsPlugin },
        rules: Object.fromEntries(
          RULES.map((r) => [`@typescript-eslint/${r}`, "error"])
        ),
      },
    ],
    overrideConfigFile: true,
  });
  const [result] = await eslint.lintFiles([file]);
  const eslintHits = result.messages.map((m) => ({
    line: m.line,
    messageId: m.messageId,
    rule: (m.ruleId ?? "fatal").replace("@typescript-eslint/", ""),
  }));
  const configFile = join(
    OUT,
    "..",
    "..",
    "out",
    "floating-promises",
    "examples.oxlint.json"
  );
  mkdirSync(dirname(configFile), { recursive: true });
  writeFileSync(
    configFile,
    JSON.stringify({
      categories: {
        correctness: "off",
        pedantic: "off",
        perf: "off",
        restriction: "off",
        style: "off",
        suspicious: "off",
      },
      plugins: ["typescript"],
      rules: Object.fromEntries(RULES.map((r) => [`typescript/${r}`, "error"])),
    })
  );
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        join(dirname(oxlintPkg), "bin", "oxlint"),
        "--type-aware",
        "-c",
        configFile,
        "--disable-nested-config",
        "--format",
        "json",
        file,
      ],
      {
        cwd: OUT,
        encoding: "utf8",
        env: { ...process.env, OXLINT_TSGOLINT_PATH: tsgolintBin },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = error.stdout;
  }
  const oxlintHits = JSON.parse(stdout).diagnostics.map((d) => ({
    line: d.labels?.[0]?.span.line,
    rule: d.code.replace(/^typescript\((.+)\)$/, "$1"),
  }));
  const { config } = ts.readConfigFile(
    join(OUT, "tsconfig.json"),
    ts.sys.readFile
  );
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, OUT);
  const program = ts.createProgram({
    options: parsed.options,
    rootNames: [join(OUT, file)],
  });
  const tsc = ts.getPreEmitDiagnostics(program).map((d) => `TS${d.code}`);
  return { eslint: eslintHits, oxlint: oxlintHits, tsc };
};

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          lib: ["es2022"],
          module: "esnext",
          moduleResolution: "bundler",
          noEmit: true,
          strict: true,
          target: "es2022",
          types: [],
        },
        include: ["*.ts"],
      },
      null,
      2
    )}\n`
  );
  const manifest = [];
  for (const s of SUBJECTS) {
    const repo = getRepo(s.repo);
    const git = (...a) =>
      execFileSync("git", ["-C", repo.root, ...a], { encoding: "utf8" }).trim();
    const sha = git("rev-parse", "HEAD");
    const date = git("log", "-1", "--format=%cI");
    const typed = JSON.parse(
      readFileSync(
        join(HERE, "out", "floating-promises", "typed", `${s.repo}.json`),
        "utf8"
      )
    ).eslint;
    s.inPlace = typed
      .filter(
        (h) =>
          h.file === s.file &&
          RULES.includes(h.rule) &&
          h.line >= s.lines[0] &&
          h.line <= s.lines[1]
      )
      .map(({ line, messageId, rule }) => ({ line, messageId, rule }));
    const source = readFileSync(join(repo.root, s.file), "utf8").split("\n");
    const body = source.slice(s.lines[0] - 1, s.lines[1]).join("\n");
    const stubFrom = s.stubFrom
      ? `${readFileSync(join(repo.root, s.stubFrom.file), "utf8")
          .split("\n")
          .slice(s.stubFrom.lines[0] - 1, s.stubFrom.lines[1])
          .join("\n")}\n\n`
      : "";
    const text = `${header(s, repo, sha, date)}${s.stubs.join("\n")}\n${stubFrom}${body}\n`;
    const name = `${s.id}.ts`;
    writeFileSync(join(OUT, name), text);
    const standalone = await lintStandalone(name);
    const offset = text.split("\n").length - body.split("\n").length - 1;
    manifest.push({
      exampleFile: `examples/floating-promises/${name}`,
      file: s.file,
      function: s.function,
      github: repo.github,
      id: s.id,
      inPlace: s.inPlace,
      license: `${repo.github}/${repo.license}`,
      lines: s.lines,
      notes: s.notes,
      permalink: `https://github.com/${repo.github}/blob/${sha}/${s.file}#L${s.lines[0]}-L${s.lines[1]}`,
      repo: s.repo,
      sha,
      // Standalone lines are mapped back to the source's line numbers.
      standalone: {
        eslint: standalone.eslint.map((d) => ({
          ...d,
          sourceLine: d.line - offset + s.lines[0] - 1,
        })),
        oxlint: standalone.oxlint.map((d) => ({
          ...d,
          sourceLine: d.line - offset + s.lines[0] - 1,
        })),
        tsc: standalone.tsc,
      },
    });
    console.log(
      `${s.id}: in place ${JSON.stringify(s.inPlace)}; standalone eslint ${JSON.stringify(standalone.eslint)} oxlint ${JSON.stringify(standalone.oxlint)} tsc ${JSON.stringify(standalone.tsc)}`
    );
  }
  writeFileSync(
    join(OUT, "examples.json"),
    `${JSON.stringify(
      {
        generated: new Date().toISOString().slice(0, 10),
        subjects: manifest,
        tools: {
          "@typescript-eslint/eslint-plugin": version(
            "@typescript-eslint/eslint-plugin",
            CLI
          ),
          oxlint: require(oxlintPkg).version,
          "oxlint-tsgolint": require(tsgolintPkg).version,
          typescript: ts.version,
        },
      },
      null,
      2
    )}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
