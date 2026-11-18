// Fixes that turn a value into a type-only import. After type-imports-fixes.cjs, every fixed copy is
// checked for an `import type` (or an inline `type`) whose binding the file uses as a value: the
// module no longer loads from that import, the binding is undefined at runtime, and TypeScript
// reports TS1361. Two more ways a fix breaks a file count too: an inline `type` inside an `import
// type` (TS2206, which Oxc's transformer also rejects) and a file that no longer parses. Each such file is then fixed again from the original, the way `ultracite fix`
// really runs: Ultracite's whole preset for that linter (Oxlint core, + react for .tsx/.jsx, the
// root config `ultracite init` writes, then Oxfmt; ESLint core, + react, then Prettier; Biome core,
// + react, `biome check --write`), so a fix from another rule can change the outcome.
//
// The check uses the census pass (type-imports-lib.cjs `inventory`): a binding counts as used as a
// value when consistent-type-imports would see a value reference. That includes JSX, which the
// parser counts as a use of `React` (its default jsxPragma), so a React import used only by JSX and
// made type-only is a hit; whether that breaks depends on the JSX runtime. For each such hit the
// file is compiled with ts.transpileModule and the `jsx` setting of its own tsconfig chain:
// `reactWithoutImport` is true when the output still calls React (React.createElement,
// React.Fragment) and no longer imports it (the classic runtime, `jsx: "react"`), which throws
// ReferenceError when the component renders. With `react-jsx` the output imports react/jsx-runtime
// and nothing breaks.
//
// Usage: TYPE_IMPORTS_TMP=<scratch> node research/corpus/scripts/type-imports-fix-bugs.cjs [--repos react-aria]
// Writes results/type-imports/fix-bugs.json.
"use strict";

const { existsSync, mkdirSync, readFileSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const FIX_DIR = join(lib.TMP, "fixes");
const WORK = join(lib.TMP, "fix-bugs");

// Bindings marked type-only (declaration or inline) but used as values.
const valueMadeType = (text, rel) => {
  const inv = lib.inventory(text, rel, { variants: [] });
  if (inv.error) {
    return { error: inv.error };
  }
  const out = [];
  for (const imp of inv.imports) {
    for (const s of imp.specifiers) {
      if ((imp.importKind === "type" || s.inlineType) && s.refs.value > 0) {
        out.push({
          line: imp.line,
          local: s.local,
          source: imp.source,
          text: (imp.text ?? "").replace(/\s+/g, " ").slice(0, 200),
        });
      }
      // `import type { A, type B }`: TypeScript rejects it (TS2206), and so does Oxc
      if (imp.importKind === "type" && s.inlineType) {
        out.push({
          line: imp.line,
          local: "(type inside import type)",
          source: imp.source,
          text: (imp.text ?? "").replace(/\s+/g, " ").slice(0, 200),
        });
      }
    }
  }
  return { hits: out };
};

// A side-effect import (`import "x"`) that a fix merged into another import of the same module:
// where the module's first import sits among the file's import declarations before and after
// (an import evaluates in that order, so a module that moves down loads after the ones above it).
const importOrder = (text, rel) => {
  const sf = lib.ts.createSourceFile(
    rel,
    text,
    lib.ts.ScriptTarget.ESNext,
    true,
    /x$/.test(rel) ? lib.ts.ScriptKind.TSX : lib.ts.ScriptKind.TS
  );
  const decls = sf.statements.filter(
    (st) =>
      lib.ts.isImportDeclaration(st) &&
      lib.ts.isStringLiteral(st.moduleSpecifier)
  );
  return decls.map((d, i) => ({
    index: i,
    line: sf.getLineAndCharacterOfPosition(d.getStart()).line + 1,
    sideEffect: !d.importClause,
    spec: d.moduleSpecifier.text,
    typeOnly: Boolean(d.importClause?.isTypeOnly),
  }));
};
const mergedSideEffects = (before, after, rel) => {
  const a = importOrder(before, rel);
  const b = importOrder(after, rel);
  const out = [];
  for (const x of a.filter((d) => d.sideEffect)) {
    if (b.some((d) => d.sideEffect && d.spec === x.spec)) {
      continue;
    }
    const now = b.find((d) => d.spec === x.spec && !d.typeOnly);
    if (!now) {
      continue;
    }
    out.push({
      after: { index: now.index, line: now.line },
      before: { index: x.index, line: x.line },
      imports: b.length,
      spec: x.spec,
    });
  }
  return out;
};

const JSX_EMIT = {
  preserve: lib.ts.JsxEmit.Preserve,
  react: lib.ts.JsxEmit.React,
  "react-jsx": lib.ts.JsxEmit.ReactJSX,
  "react-jsxdev": lib.ts.JsxEmit.ReactJSXDev,
  "react-native": lib.ts.JsxEmit.ReactNative,
};
// The fixed file under its own tsconfig's jsx setting: does the output call React without
// importing it?
const jsxCheck = (root, rel, text) => {
  if (!/x$/.test(rel)) {
    return null;
  }
  const tsconfig = lib.nearestTsconfig(root, rel);
  const jsx = tsconfig
    ? lib.effectiveFlags(lib.tsconfigChain(tsconfig, root)).jsx
    : undefined;
  // preserve leaves JSX for the bundler, whose runtime setting isn't in the tsconfig
  if (
    !jsx ||
    !(String(jsx).toLowerCase() in JSX_EMIT) ||
    String(jsx).toLowerCase() === "preserve"
  ) {
    return { jsx: jsx ?? null, reactWithoutImport: null };
  }
  const js = lib.ts.transpileModule(text, {
    compilerOptions: {
      jsx: JSX_EMIT[String(jsx).toLowerCase()],
      module: lib.ts.ModuleKind.ESNext,
      target: lib.ts.ScriptTarget.ESNext,
    },
    fileName: rel,
  }).outputText;
  return {
    jsx,
    reactWithoutImport:
      /\bReact\.(?:createElement|Fragment)\b/.test(js) &&
      !/from\s*["']react["']/.test(js),
  };
};

const main = async () => {
  const names = lib.selectedRepos(lib.ALL);
  // --repos: update those repos in the existing results
  const file = join(lib.RESULTS_DIR, "fix-bugs.json");
  const out =
    existsSync(file) && names.length < lib.ALL.length
      ? lib.readJson(file)
      : { repos: {} };
  out.generated = new Date().toISOString();
  out.tools = lib.toolVersions();
  for (const name of names) {
    const rows = lib
      .readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`))
      .filter((r) => !r.error);
    const root = lib.getRepo(name).root;
    const repo = {};
    for (const path of ["oxlint", "eslint", "biome"]) {
      const fixedDir = join(FIX_DIR, name, path, "fixed");
      if (!existsSync(fixedDir)) {
        continue;
      }
      const files = [];
      const merged = [];
      let before = 0;
      for (const r of rows) {
        const orig = valueMadeType(
          readFileSync(join(root, r.rel), "utf8"),
          r.rel
        );
        before += orig.hits?.length ?? 0;
        const f = join(fixedDir, r.rel);
        if (!existsSync(f)) {
          continue;
        }
        const fixedText = readFileSync(f, "utf8");
        const fixed = valueMadeType(fixedText, r.rel);
        if (!fixed.error) {
          for (const m of mergedSideEffects(
            readFileSync(join(root, r.rel), "utf8"),
            fixedText,
            r.rel
          )) {
            merged.push({
              ...m,
              permalink: lib.permalink(name, r.rel, m.before.line),
              rel: r.rel,
            });
          }
        }
        // a fix that leaves the file unparsable counts too
        const extra =
          fixed.error && !orig.error
            ? [
                {
                  line: 0,
                  local: "(parse error)",
                  source: fixed.error.slice(0, 120),
                  text: fixed.error.slice(0, 200),
                },
              ]
            : (fixed.hits ?? []).filter(
                (h) =>
                  !(orig.hits ?? []).some(
                    (o) => o.local === h.local && o.source === h.source
                  )
              );
        if (extra.length) {
          files.push({
            hits: extra,
            jsx: extra.some((h) => h.local === "React")
              ? jsxCheck(root, r.rel, readFileSync(f, "utf8"))
              : null,
            permalink: lib.permalink(name, r.rel, extra[0].line),
            rel: r.rel,
            test: r.test,
          });
        }
      }
      // the whole preset, from the original, on the same files (and the files with a merged
      // side-effect import)
      let full = null;
      let fullMerged = null;
      const targets = [
        ...new Set([...files.map((f) => f.rel), ...merged.map((m) => m.rel)]),
      ];
      if (targets.length) {
        const dir = join(WORK, name, path);
        rmSync(dir, { force: true, recursive: true });
        lib.copyFiles(root, dir, targets);
        const tsx = targets.filter((rel) => /x$/.test(rel));
        const plain = targets.filter((rel) => !/x$/.test(rel));
        if (plain.length) {
          await lib.ultraciteFix({
            cwd: dir,
            files: plain,
            linter: path,
            presets: ["core"],
          });
        }
        if (tsx.length) {
          await lib.ultraciteFix({
            cwd: dir,
            files: tsx,
            linter: path,
            presets: ["core", "react"],
          });
        }
        full = files.map((f) => {
          const r = valueMadeType(
            readFileSync(join(dir, f.rel), "utf8"),
            f.rel
          );
          // as for the topic path: only what the fix added
          const orig =
            valueMadeType(readFileSync(join(root, f.rel), "utf8"), f.rel)
              .hits ?? [];
          return {
            hits: r.error
              ? [{ local: "(parse error)", text: r.error.slice(0, 200) }]
              : (r.hits ?? []).filter(
                  (h) =>
                    !orig.some(
                      (o) => o.local === h.local && o.source === h.source
                    )
                ),
            rel: f.rel,
          };
        });
        fullMerged = [...new Set(merged.map((m) => m.rel))].flatMap((rel) =>
          mergedSideEffects(
            readFileSync(join(root, rel), "utf8"),
            readFileSync(join(dir, rel), "utf8"),
            rel
          ).map((m) => ({ ...m, rel }))
        );
      }
      repo[path] = {
        files: files.length,
        filesSource: files.filter((f) => !f.test).length,
        fullPreset: full
          ? {
              files: full.filter((f) => f.hits.length).length,
              filesByKind: Object.fromEntries(
                [
                  ["value made type-only", (h) => !h.local.startsWith("(")],
                  [
                    "type inside import type (TS2206)",
                    (h) => h.local === "(type inside import type)",
                  ],
                  ["no longer parses", (h) => h.local === "(parse error)"],
                ].map(([k, test]) => [
                  k,
                  full.filter((f) => f.hits.some(test)).length,
                ])
              ),
              examples: full.filter((f) => f.hits.length).slice(0, 5),
            }
          : null,
        hits: files.reduce((s, f) => s + f.hits.length, 0),
        // files by what broke (a file can have more than one)
        filesByKind: Object.fromEntries(
          [
            ["value made type-only", (h) => !h.local.startsWith("(")],
            [
              "type inside import type (TS2206)",
              (h) => h.local === "(type inside import type)",
            ],
            ["no longer parses", (h) => h.local === "(parse error)"],
          ].map(([k, test]) => [
            k,
            files.filter((f) => f.hits.some(test)).length,
          ])
        ),
        // React imports used only by JSX and made type-only, by the file's jsx setting
        reactJsx: Object.entries(
          Object.groupBy(
            files.filter((f) => f.jsx),
            (f) =>
              `${f.jsx.jsx ?? "(no jsx setting found)"}: ${f.jsx.reactWithoutImport === null ? "not compiled here" : f.jsx.reactWithoutImport ? "calls React without importing it" : "doesn't need the import"}`
          )
        ).map(([k, v]) => ({ files: v.length, outcome: k })),
        parseErrors: files.filter((f) =>
          f.hits.some((h) => h.local === "(parse error)")
        ).length,
        examples: files.slice(0, 8),
        // side-effect imports merged into another import of the module, and where they moved
        mergedSideEffectImports: merged,
        mergedSideEffectImportsFullPreset: fullMerged,
        alreadyInOriginal: before,
      };
      console.log(
        `${name} ${path}: ${files.length} files with a value made type-only (${repo[path].hits} bindings); with the whole preset ${full ? repo[path].fullPreset.files : "n/a"}; side-effect imports merged ${merged.length} (whole preset ${fullMerged?.length ?? "n/a"})`
      );
    }
    out.repos[name] = repo;
  }
  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  lib.writeJson(file, lib.scrubDeep(out));
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
