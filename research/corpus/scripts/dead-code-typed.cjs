// TypeScript's own unused checks over the corpus: noUnusedLocals and noUnusedParameters (plus
// allowUnreachableCode: false and allowUnusedLabels: false), with each file's nearest tsconfig.
//
// For every measured TypeScript file, the nearest tsconfig.json between the file and the repo root
// supplies the compiler options (whatever of it parses without node_modules); the four flags are
// forced on and nothing is emitted. One program per tsconfig, with that group's measured files as
// roots. TypeScript's unused-declaration checks don't depend on resolving imports, so unlike the
// type-aware lint rules they're complete even where dependencies are missing; the resolution rate
// is recorded anyway.
//
// It also records what each repo's own tsconfigs set for these flags, and compares TypeScript's
// diagnostics with the lint rules' (Oxlint raw census, ESLint and Biome on the raw mirror) by file,
// line and name.
//
// Usage (from the repo root):
//   node --max-old-space-size=12288 research/corpus/scripts/dead-code-typed.cjs [--repos zod,hono]
// Writes results/dead-code/typed-census.json and out/dead-code/typed/<repo>.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const { collect } = require("./collect-files.cjs");
const config = require("./repos.json");
const { nameOf } = require("./dead-code-linters.cjs");

const { ts } = lib;
const ONLY = (lib.arg("repos", "") || "").split(",").filter(Boolean);
const OUT = join(lib.OUT_DIR, "typed");
const FLAGS = [
  "noUnusedLocals",
  "noUnusedParameters",
  "allowUnreachableCode",
  "allowUnusedLabels",
];

const nearestTsconfig = (root, file) => {
  let dir = dirname(join(root, file));
  while (dir.startsWith(root)) {
    const candidate = join(dir, "tsconfig.json");
    if (existsSync(candidate)) {
      return candidate;
    }
    if (dir === root) {
      break;
    }
    dir = dirname(dir);
  }
  return null;
};

// What the repo itself sets for the flags, following `extends` as TypeScript does.
const ownFlags = (tsconfig) => {
  const { config: raw, error } = ts.readConfigFile(tsconfig, ts.sys.readFile);
  if (error) {
    return { error: ts.flattenDiagnosticMessageText(error.messageText, " ") };
  }
  const parsed = ts.parseJsonConfigFileContent(raw, ts.sys, dirname(tsconfig));
  return {
    errors: [...new Set(parsed.errors.map((e) => e.code))],
    flags: Object.fromEntries(FLAGS.map((f) => [f, parsed.options[f] ?? null])),
    options: parsed.options,
  };
};

const lintRows = (name) => {
  const read = (path) =>
    existsSync(path) ? JSON.parse(readFileSync(path, "utf8")).hits : [];
  return {
    biome: read(join(lib.OUT_DIR, "corpus", `${name}.biome.json`)).filter((d) =>
      [
        "correctness/noUnusedVariables",
        "correctness/noUnusedImports",
        "correctness/noUnusedFunctionParameters",
        "correctness/noUnusedPrivateClassMembers",
      ].includes(d.rule)
    ),
    eslint: read(join(lib.OUT_DIR, "corpus", `${name}.eslint.json`)).filter(
      (d) =>
        [
          "@typescript-eslint/no-unused-vars",
          "no-unused-vars",
          "@typescript-eslint/no-unused-private-class-members",
        ].includes(d.rule)
    ),
    oxlint: read(
      join(lib.HERE, "out", "rule-census", lib.TOPIC, `${name}.raw.json`)
    ).filter((d) =>
      ["no-unused-vars", "no-unused-private-class-members"].includes(d.rule)
    ),
  };
};

const main = () => {
  mkdirSync(OUT, { recursive: true });
  const path = join(lib.RESULTS_DIR, "typed-census.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { repos: {} };
  const result = {
    codes: lib.TS_UNUSED_CODES,
    generated: new Date().toISOString().slice(0, 10),
    note: "Each measured .ts/.tsx/.mts/.cts file is checked with its nearest tsconfig's options plus noUnusedLocals, noUnusedParameters, allowUnreachableCode: false and allowUnusedLabels: false. 'ownFlags' is what the repo's tsconfigs set. Lint comparison keys are file:line:name (TS6192/TS6198/TS6199 'all unused' diagnostics carry no name and match on file:line).",
    repos: { ...previous.repos },
    tools: { node: process.version, typescript: ts.version },
  };
  const names = config.repos
    .map((r) => r.name)
    .filter((n) => ONLY.length === 0 || ONLY.includes(n));
  for (const name of names) {
    const started = Date.now();
    const { repo, files } = collect(name);
    const root = resolve(repo.root);
    const tsFiles = files.filter((f) => /\.(?:ts|tsx|mts|cts)$/.test(f));
    const groups = new Map();
    for (const f of tsFiles) {
      const c = nearestTsconfig(root, f) ?? "(none)";
      if (!groups.has(c)) {
        groups.set(c, []);
      }
      groups.get(c).push(f);
    }
    const diags = [];
    const tsconfigs = {};
    let imports = 0;
    let unresolved = 0;
    for (const [tsconfig, group] of groups) {
      const own =
        tsconfig === "(none)" ? { flags: {}, options: {} } : ownFlags(tsconfig);
      tsconfigs[tsconfig === "(none)" ? tsconfig : relative(root, tsconfig)] = {
        errors: own.errors ?? own.error ?? null,
        files: group.length,
        flags: own.flags,
      };
      const options = {
        ...(own.options ?? {}),
        allowUnreachableCode: false,
        allowUnusedLabels: false,
        noEmit: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
      };
      delete options.composite;
      delete options.incremental;
      delete options.tsBuildInfoFile;
      const program = ts.createProgram({
        options,
        rootNames: group.map((f) => join(root, f)),
      });
      const checker = program.getTypeChecker();
      for (const f of group) {
        const sf = program.getSourceFile(join(root, f));
        if (!sf) {
          continue;
        }
        for (const st of sf.statements) {
          if (
            (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) &&
            st.moduleSpecifier &&
            ts.isStringLiteral(st.moduleSpecifier)
          ) {
            imports++;
            if (!checker.getSymbolAtLocation(st.moduleSpecifier)) {
              unresolved++;
            }
          }
        }
        for (const d of program.getSemanticDiagnostics(sf)) {
          if (!(d.code in lib.TS_UNUSED_CODES)) {
            continue;
          }
          const pos = sf.getLineAndCharacterOfPosition(d.start);
          const message = ts.flattenDiagnosticMessageText(d.messageText, " ");
          diags.push({
            code: d.code,
            column: pos.character + 1,
            file: f,
            line: pos.line + 1,
            message,
            name: nameOf(message),
          });
        }
      }
    }
    // Compare with the lint rules, by file:line:name.
    const lint = lintRows(name);
    const key = (file, line, n) => `${file}:${line}:${n ?? ""}`;
    const tsKeys = new Set(
      diags
        .filter((d) => [6133, 6138, 6196].includes(d.code))
        .map((d) => key(d.file, d.line, d.name))
    );
    const tsLines = new Set(diags.map((d) => `${d.file}:${d.line}`));
    const compare = {};
    for (const [tool, rows] of Object.entries(lint)) {
      const tsOnly = rows.filter((d) => /\.(?:ts|tsx|mts|cts)$/.test(d.file));
      const keys = new Set(
        tsOnly.map((d) => key(d.file, d.line, nameOf(d.message)))
      );
      const lines = new Set(tsOnly.map((d) => `${d.file}:${d.line}`));
      compare[tool] = {
        both: [...keys].filter(
          (k) =>
            tsKeys.has(k) || tsLines.has(k.split(":").slice(0, 2).join(":"))
        ).length,
        lintOnly: [...keys].filter(
          (k) =>
            !tsKeys.has(k) && !tsLines.has(k.split(":").slice(0, 2).join(":"))
        ).length,
        lintOnlySamples: [...keys]
          .filter(
            (k) =>
              !tsKeys.has(k) && !tsLines.has(k.split(":").slice(0, 2).join(":"))
          )
          .sort()
          .slice(0, 15),
        tsOnly: [...tsKeys].filter(
          (k) => !keys.has(k) && !lines.has(k.split(":").slice(0, 2).join(":"))
        ).length,
        tsOnlySamples: [...tsKeys]
          .filter(
            (k) =>
              !keys.has(k) && !lines.has(k.split(":").slice(0, 2).join(":"))
          )
          .sort()
          .slice(0, 15),
      };
    }
    const byCode = {};
    for (const d of diags) {
      byCode[d.code] = (byCode[d.code] ?? 0) + 1;
    }
    const unusedOnly = diags.filter((d) => ![7027, 7028].includes(d.code));
    result.repos[name] = {
      byCode,
      compare,
      dogfood: lib.DOGFOOD.has(name),
      files: tsFiles.length,
      importResolution:
        imports === 0 ? null : lib.pct(imports - unresolved, imports),
      jsFilesSkipped: files.length - tsFiles.length,
      seconds: Math.round((Date.now() - started) / 1000),
      tsconfigs,
      underscore: unusedOnly.filter((d) => d.name?.startsWith("_")).length,
      unused: unusedOnly.length,
    };
    writeFileSync(
      join(OUT, `${name}.json`),
      JSON.stringify({ diagnostics: diags, repo: name }, null, 1)
    );
    console.log(
      `${name}: ${JSON.stringify(byCode)} imports resolved ${result.repos[name].importResolution}% (${result.repos[name].seconds}s) compare ${JSON.stringify(Object.fromEntries(Object.entries(compare).map(([t, c]) => [t, [c.both, c.lintOnly, c.tsOnly]])))}`
    );
  }
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
};

main();
