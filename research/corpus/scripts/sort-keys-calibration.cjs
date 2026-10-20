// Calibration for the key-sorting rules: hand-written cases (calibration/sort-keys/) through every
// configuration Ultracite ships and through every fix, with each case's behaviour checked by
// running it.
//
//   lint       Oxlint as `ultracite init` writes its root config (core + react) and with
//              sort-keys alone; ESLint core + react (Ultracite's preset modules); Biome core (the
//              preset) and with useSortedKeys alone. Every diagnostic of the sort rules with its
//              message and the help the agent handoff carries (Oxlint's help; ESLint's docs
//              description; Biome's terminal notes), plus Biome's other sorting actions
//              (interfaces, type fields, JSX attributes), which fire on cases sort-keys skips.
//   fix        each fix pass on a copy: `oxlint --fix` with sort-keys alone and with init's
//              config, `biome check --write` with useSortedKeys alone and with the core preset,
//              `eslint --fix` (sort-keys has no fix), and a hand sort by ESLint's own grouping
//              (what clearing ESLint's rule by hand takes). For every object in every case: the
//              key order before and after, where its comments went, and what's still reported.
//   behaviour  behaviour.ts / behaviour.js run before and after each fix in a fresh Node
//              process (transpiled with TypeScript); inference.ts type-checked before and after;
//              the style objects in cases.tsx rendered with React 19 (renderToStaticMarkup) and
//              their effective declarations computed with Lightning CSS (both from the repo's Bun
//              store; nothing is installed).
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/sort-keys-calibration.cjs
// Writes results/sort-keys/calibration.json.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  cpSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const { dc } = lib;
const ts = dc.ts;
const SRC = lib.CALIBRATION_DIR;
const WORK = join(lib.TMP, "calibration");
const CONFIGS = join(lib.TMP, "configs");
const FILES = [
  "cases.ts",
  "cases.js",
  "cases.tsx",
  "comments-edge.ts",
  "behaviour.ts",
  "behaviour.js",
  "inference.ts",
];

const STORE = join(lib.ULTRACITE, "node_modules/.bun");
const storePackage = (prefix, name) => {
  const dir = readdirSync(STORE).find(
    (d) => d === prefix || d.startsWith(`${prefix}+`)
  );
  if (!dir) {
    throw new Error(`${prefix} not found in ${STORE}`);
  }
  return join(STORE, dir, "node_modules", name);
};
const REACT = storePackage("react@19.3.0", "react");
const REACT_DOM = storePackage("react-dom@19.3.0", "react-dom");
const LIGHTNINGCSS = storePackage("lightningcss@1.33.0", "lightningcss");

const CASES = {
  K01: "case: a, B, c (ESLint and Oxlint put capitals first; Biome interleaves A a B b)",
  K02: "numbers inside names: a10, a2, a1 (only Biome is natural)",
  K03: "_ and $ prefixes: b, _a, $c, a",
  K04: "numeric keys: 1, 10, 2",
  K05: "numeric and named keys mixed: b, 2, a, 1",
  K06: 'quoted keys: "b-c", a, "a-b", A',
  K07: "a computed [identifier] key between named keys: b, [key], a",
  K08: 'a computed literal key: b, ["a"]',
  K09: "a computed template key between named keys: c, [`x${y}`], b, a",
  K10: "a spread in the middle: b, a, ...rest, d, c",
  K11: "a spread first: ...base, b, a",
  K12: "a spread last: b, a, ...overrides",
  K13: "a line comment above each of two keys",
  K14: "a JSDoc block above each of two keys",
  K15: "a trailing // comment after each comma",
  K16: "section comments that head groups of keys (// Colours, // Sizes)",
  K17: "blank-line groups",
  K18: "methods",
  K19: "a setter before its getter, then a plain key",
  K20: "shorthand properties: name, age, id",
  K21: "__proto__ first: __proto__, b, a",
  K22: "duplicate keys: b, a, b (JavaScript)",
  K22b: "duplicate keys a twice among others (JavaScript)",
  K23: "a nested object, both unsorted",
  K24: "a TypeScript type literal (not an object literal)",
  K25: "a TypeScript interface (not an object literal)",
  K26: "a destructuring pattern (not an object literal)",
  K27: "as const",
  K28: "satisfies",
  K29: "JSX attributes (not an object literal)",
  K30: "a style={{…}} object",
  K30b: "a style object with marginTop before margin",
  K30c: "a style object with borderColor before border",
  K31: "an enum (not an object literal)",
  K32: "one key (below minKeys)",
  K33: "a spread and one key (two members)",
  K34: "non-ASCII and case: é, z, Z",
  K35: "names that differ only by case: a, A",
  K36: 'empty and space keys: "", a, " "',
  K37: "a computed template key without expressions: [`b`], a",
  K38: "a block comment before the first key, on the line of {",
  K39: "a block comment after the last key",
  K40: "multi-line arrow function values",
  K41: "irregular whitespace between keys",
  K42: "async and generator methods",
  K43: 'numeric-looking string keys: "10", "9", "1e3"',
  K44: "numeric keys spelled 0x10, 2, 1e3",
  K45: "a computed key with groups of unsorted keys on both sides",
  K46: "a trailing comment on one key and a leading comment on the next",
  K47: 'B, _, a, "-", "0": punctuation and digits against letters',
  K48: "item2, item10, item1, Item3: natural numbers with case",
  K49: "userId, user_id, userid, UserId",
  K52: "duplicate keys in a 23-key object, where Oxlint's unstable sort swaps them (JavaScript)",
  K50: "a trailing // comment on a key that moves last, with } on the same line",
  K51: "a trailing // comment on a key that moves last, the object's trailing comma after the last key",
  B01: "side-effecting values: { b: note('b'), a: note('a') }",
  B02: "computed [identifier] keys with side-effecting values",
  B03: "++ in values: { b: i++, a: i++ }",
  B04: "a getter with side effects read twice: { second: src.next, first: src.next }",
  B05: "a spread that overrides, keys on both sides: { size, ...defaults, color, align }",
  B06: "duplicate keys, the later wins: { a: 1, b: 2, a: 3 }",
  B06b: "duplicate keys among others: { z, a: 1, c, a: 3, b }",
  B06c: "duplicate keys in a 23-key object: which value wins after the fix",
  B07: "JSON.stringify of { type, path, timestamp }",
  B08: "Object.keys of { zebra, apple, mango }",
  B09: "a for-in first match over route prefixes",
  B10: "a package exports-style condition map, first match wins",
  B11: "a Map built from Object.entries",
  B12: "integer-like keys enumerate first, in numeric order, wherever they're written",
  B13: "__proto__ in the middle of an object",
  B14: "await in two values",
  B16: "URLSearchParams from an object",
  B17: "spread copies the order",
  B18: "a getter that reads keys declared after it",
  B20: "a sha256 of JSON.stringify (a cache key)",
  I01: "TanStack Query-style mutation options: onError reads the context onMutate returns",
  I02: "TanStack Router-style route options: head and component read the loader's data",
  I03: "a store whose render reads the state's type",
  I04: "control: the loader takes no parameters, so it isn't context-sensitive",
  I05: "control: the later callback's parameter is annotated",
};

// ── reading cases ──────────────────────────────────────────────────────
// Each case is a top-level export; returns { id: { text, objects: [{ path, sigs }] } }.
const casesIn = (text, rel) => {
  const { ast, error } = lib.safeParse(text, rel);
  const out = {};
  if (!ast) {
    // A fix left the file unparsable: cut the cases out of the text instead.
    const parts = text.split(/\n(?=export )/);
    let line = 1;
    for (const part of parts) {
      const name = /^export (?:const|type|interface|enum) (\w+)/.exec(
        part
      )?.[1];
      if (name && CASES[name]) {
        out[name] = {
          line,
          objects: [],
          parseError: error,
          text: part.replace(/\n$/, ""),
        };
      }
      line += part.split("\n").length;
    }
    return out;
  }
  for (const stmt of ast.body) {
    const decl =
      stmt.type === "ExportNamedDeclaration" ? stmt.declaration : null;
    if (!decl) {
      continue;
    }
    const name = decl.id?.name ?? decl.declarations?.[0]?.id?.name;
    if (!name || !CASES[name]) {
      continue;
    }
    const objects = [];
    lib.walk(decl, (n) => {
      if (n.type === "ObjectExpression") {
        objects.push({ line: n.loc.start.line, sigs: lib.propSigs(n, text) });
      }
    });
    out[name] = {
      line: stmt.loc.start.line,
      objects,
      text: text.slice(stmt.range[0], stmt.range[1]),
    };
  }
  return out;
};
const lineToCase = (cases, line) => {
  let best = null;
  for (const [id, c] of Object.entries(cases)) {
    const end = c.line + c.text.split("\n").length - 1;
    if (line >= c.line && line <= end) {
      best = id;
    }
  }
  return best;
};

// ── lint every case ────────────────────────────────────────────────────
const eslintDocs = () => {
  const { builtinRules } = require(
    require.resolve("eslint/use-at-your-own-risk", { paths: [lib.CLI] })
  );
  const meta = builtinRules.get("sort-keys").meta;
  return {
    description: meta.docs.description,
    fixable: meta.fixable ?? null,
    frozen: meta.docs.frozen ?? false,
    hasSuggestions: meta.hasSuggestions ?? false,
    url: meta.docs.url,
  };
};
const lintDir = async (dir) => {
  const cases = {};
  for (const f of FILES) {
    cases[f] = casesIn(readFileSync(join(dir, f), "utf8"), f);
  }
  const at = (file, line) => lineToCase(cases[file], line);
  const oxInit = lib.oxlintInitConfig(join(CONFIGS, "calibration"));
  const oxAlone = lib.oxlintSortKeysConfig(join(CONFIGS, "calibration"));
  const bioCore = lib.biomeUltraciteConfig(join(CONFIGS, "calibration"));
  const bioAlone = lib.biomeAssistConfig(join(CONFIGS, "calibration"));
  const sortRules = (r) =>
    /^(?:sort-keys|assist\/source\/useSorted\w+|react\/jsx-sort-props|perfectionist\/.+)$/.test(
      r
    );
  const runs = {
    "biome core": lib.runBiome({
      configDir: bioCore,
      cwd: dir,
      files: FILES,
      keep: sortRules,
    }),
    "biome useSortedKeys alone": lib.runBiome({
      configDir: bioAlone,
      cwd: dir,
      files: FILES,
      keep: sortRules,
    }),
    "eslint core + react": await lib.runEslint({
      cwd: dir,
      files: FILES,
      keep: null,
      presets: ["core", "react"],
    }),
    "oxlint init (core + react)": lib.runOxlint({
      configFile: oxInit,
      cwd: dir,
      files: FILES,
      keep: sortRules,
    }),
    "oxlint sort-keys alone": lib.runOxlint({
      configFile: oxAlone,
      cwd: dir,
      files: FILES,
    }),
  };
  runs["eslint core + react"] = runs["eslint core + react"].filter(
    (d) => sortRules(d.rule) || d.rule.startsWith("parse")
  );
  const notes = lib
    .biomeConsole({ configDir: bioCore, cwd: dir, files: FILES })
    .filter((d) => sortRules(d.rule));
  const out = {};
  for (const [config, diags] of Object.entries(runs)) {
    for (const d of diags) {
      const id = at(d.file, d.line) ?? `${d.file}:${d.line}`;
      const entry = (out[id] ??= {});
      const list = (entry[config] ??= []);
      list.push({
        fix: config.startsWith("oxlint")
          ? Boolean(d.help)
          : config.startsWith("eslint")
            ? d.fix
            : true,
        help: d.help ?? null,
        line: d.line,
        message: d.message,
        notes:
          config === "biome core"
            ? (notes.find(
                (n) =>
                  n.file === d.file && n.line === d.line && n.rule === d.rule
              )?.notes ?? null)
            : undefined,
        rule: d.rule,
        suggestions: d.suggestions?.length ? d.suggestions : undefined,
      });
    }
  }
  return { byCase: out, cases };
};

// ── fixes ──────────────────────────────────────────────────────────────
const copyCases = (name) => {
  const dir = join(WORK, name);
  rmSync(dir, { force: true, recursive: true });
  cpSync(SRC, dir, { recursive: true });
  return dir;
};
const FIXES = {
  "biome core --write": (dir) =>
    lib.biomeWrite({
      configDir: lib.biomeUltraciteConfig(join(CONFIGS, "calibration")),
      cwd: dir,
      files: FILES,
    }),
  "biome useSortedKeys alone --write": (dir) =>
    lib.biomeWrite({
      configDir: lib.biomeAssistConfig(join(CONFIGS, "calibration")),
      cwd: dir,
      files: FILES,
    }),
  "eslint core + react --fix": async (dir) => {
    const { ESLint } = require(require.resolve("eslint", { paths: [lib.CLI] }));
    const blocks = await dc.eslintBlocks({ presets: ["core", "react"] });
    const eslint = new ESLint({
      cwd: dir,
      errorOnUnmatchedPattern: false,
      fix: true,
      ignore: false,
      overrideConfig: [
        ...blocks,
        {
          linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: "off",
          },
        },
      ],
      overrideConfigFile: true,
    });
    await ESLint.outputFixes(await eslint.lintFiles(FILES));
  },
  "hand sort by ESLint's grouping": (dir) => {
    for (const f of FILES) {
      const p = join(dir, f);
      writeFileSync(p, lib.handSortEslint(readFileSync(p, "utf8"), f));
    }
  },
  "oxlint init --fix": (dir) =>
    lib.oxlintFix({
      configFile: lib.oxlintInitConfig(join(CONFIGS, "calibration")),
      cwd: dir,
      files: FILES,
    }),
  "oxlint sort-keys alone --fix": (dir) =>
    lib.oxlintFix({
      configFile: lib.oxlintSortKeysConfig(join(CONFIGS, "calibration")),
      cwd: dir,
      files: FILES,
    }),
};

// Where each comment inside a case's objects sits: the property signature it precedes (on its own
// line) or follows (on the same line), or the object edge.
const commentAnchors = (text, rel) => {
  const { ast } = lib.safeParse(text, rel);
  const out = [];
  if (!ast) {
    return out;
  }
  lib.walk(ast, (n) => {
    if (n.type !== "ObjectExpression" || n.properties.length === 0) {
      return;
    }
    const sigs = lib.propSigs(n, text);
    for (const c of ast.comments) {
      if (c.range[0] < n.range[0] || c.range[1] > n.range[1]) {
        continue;
      }
      if (
        n.properties.some(
          (p) => c.range[0] >= p.range[0] && c.range[1] <= p.range[1]
        )
      ) {
        continue;
      }
      const before = [...n.properties]
        .reverse()
        .find((p) => p.range[1] <= c.range[0]);
      const after = n.properties.find((p) => p.range[0] >= c.range[1]);
      const sameLine =
        before && !text.slice(before.range[1], c.range[0]).includes("\n");
      out.push({
        anchor: sameLine
          ? `after ${sigs[n.properties.indexOf(before)]}`
          : after
            ? `before ${sigs[n.properties.indexOf(after)]}`
            : "at the end",
        comment:
          `${c.type === "Line" ? "//" : "/*"}${c.value}${c.type === "Line" ? "" : "*/"}`.trim(),
        line: c.loc.start.line,
      });
    }
  });
  return out;
};

// ── behaviour ──────────────────────────────────────────────────────────
const runBehaviour = (dir) => {
  const script = `
const { createRequire } = require("node:module");
const req = createRequire(${JSON.stringify(join(dir, "x.js"))});
const results = {};
const load = (file) => {
  const ts = require(${JSON.stringify(join(lib.dirs.typescript, "lib/typescript.js"))});
  const src = require("node:fs").readFileSync(file, "utf8");
  const { outputText } = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } , fileName: file });
  const m = { exports: {} };
  const fakeRequire = (id) => id === "react/jsx-runtime" ? require(${JSON.stringify(join(REACT, "jsx-runtime"))}) : req(id);
  new Function("module", "exports", "require", outputText)(m, m.exports, fakeRequire);
  return m.exports;
};
(async () => {
  for (const f of ["behaviour.ts", "behaviour.js"]) {
    const mod = load(require("node:path").join(${JSON.stringify(dir)}, f));
    for (const [id, fn] of Object.entries(mod)) {
      try { results[id] = { value: await fn() }; } catch (e) { results[id] = { error: String(e.message) }; }
    }
  }
  const { renderToStaticMarkup } = require(${JSON.stringify(join(REACT_DOM, "server"))});
  const { transformStyleAttribute } = require(${JSON.stringify(LIGHTNINGCSS)});
  const cases = load(require("node:path").join(${JSON.stringify(dir)}, "cases.tsx"));
  for (const id of ["K30", "K30b", "K30c"]) {
    const html = renderToStaticMarkup(cases[id]());
    const style = /style="([^"]*)"/.exec(html)?.[1] ?? "";
    const effective = transformStyleAttribute({ code: Buffer.from(style), minify: true }).code.toString();
    results[id] = { value: { html, effective } };
  }
  process.stdout.write(JSON.stringify(results));
})();
`;
  const file = join(dir, "run-behaviour.cjs");
  writeFileSync(file, script);
  const stdout = execFileSync(process.execPath, [file], { encoding: "utf8" });
  rmSync(file);
  return JSON.parse(stdout);
};
const typecheck = (dir) => {
  const { config } = ts.readConfigFile(
    join(dir, "tsconfig.json"),
    ts.sys.readFile
  );
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dir);
  const program = ts.createProgram({
    options: parsed.options,
    rootNames: [join(dir, "inference.ts")],
  });
  const casesText = readFileSync(join(dir, "inference.ts"), "utf8");
  const cases = casesIn(casesText, "inference.ts");
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const pos = d.file.getLineAndCharacterOfPosition(d.start);
    return {
      case: lineToCase(cases, pos.line + 1),
      code: d.code,
      line: pos.line + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
    };
  });
};

// ── Oxlint's unstable sort and duplicate keys ──────────────────────────
// Oxlint sorts the keys with sort_unstable_by, so keys that compare equal can swap once a list is
// longer than its small-sort threshold. With duplicate keys, the later one wins, so a swap changes
// the object. 300 seeded objects of 21 to 50 distinct keys plus one duplicated key, fixed with
// sort-keys alone and imported: which of the two values survives?
const unstableSortProbe = () => {
  const random = lib.rng(7);
  const dir = join(WORK, "unstable-sort");
  rmSync(dir, { force: true, recursive: true });
  require("node:fs").mkdirSync(dir, { recursive: true });
  const lines = [];
  for (let t = 0; t < 300; t++) {
    const n = 21 + Math.floor(random() * 30);
    const keys = new Set();
    while (keys.size < n) {
      keys.add(`k${Math.floor(random() * 100_000).toString(36)}`);
    }
    const props = [...keys].map((k, i) => `${k}: ${i}`);
    const first = Math.floor(random() * props.length);
    props.splice(first, 0, 'dup: "first"');
    const second = first + 1 + Math.floor(random() * (props.length - first));
    props.splice(second, 0, 'dup: "second"');
    lines.push(`exports.T${t} = { ${props.join(", ")} };`);
  }
  writeFileSync(join(dir, "probe.js"), `${lines.join("\n")}\n`);
  lib.oxlintFix({
    configFile: lib.oxlintSortKeysConfig(join(CONFIGS, "calibration")),
    cwd: dir,
    files: ["probe.js"],
  });
  const mod = {};
  new Function("exports", readFileSync(join(dir, "probe.js"), "utf8"))(mod);
  const values = Object.values(mod).map((o) => o.dup);
  return {
    objects: values.length,
    secondWins: values.filter((v) => v === "second").length,
    swapped: values.filter((v) => v === "first").length,
  };
};

// ── main ───────────────────────────────────────────────────────────────
const main = async () => {
  rmSync(WORK, { force: true, recursive: true });
  const originalDir = copyCases("original");
  const lint = await lintDir(originalDir);
  const behaviour = { original: runBehaviour(originalDir) };
  const types = { original: typecheck(originalDir) };
  const originalAnchors = {};
  for (const f of FILES) {
    originalAnchors[f] = commentAnchors(
      readFileSync(join(originalDir, f), "utf8"),
      f
    );
  }
  const fixes = {};
  for (const [name, run] of Object.entries(FIXES)) {
    const dir = copyCases(name.replace(/[^a-z0-9]+/gi, "-"));
    await run(dir);
    const after = await lintDir(dir);
    const perCase = {};
    for (const f of FILES) {
      const before = lint.cases[f];
      const now = after.cases[f];
      for (const [id, c] of Object.entries(before)) {
        const a = now[id];
        if (!a) {
          perCase[id] = { missing: true };
          continue;
        }
        const orders = c.objects.map((o, i) => ({
          after: a.objects[i]?.sigs ?? null,
          before: o.sigs,
          changed:
            JSON.stringify(a.objects[i]?.sigs) !== JSON.stringify(o.sigs),
        }));
        perCase[id] = {
          changedText: a.text !== c.text,
          parseError: a.parseError ?? undefined,
          objects: orders.filter((o) => o.changed),
          stillReported: Object.fromEntries(
            Object.entries(after.byCase[id] ?? {}).map(([cfg, ds]) => [
              cfg,
              ds.map((d) => d.rule),
            ])
          ),
          text: a.text !== c.text ? a.text : undefined,
        };
      }
      const anchorsAfter = commentAnchors(
        readFileSync(join(dir, f), "utf8"),
        f
      );
      for (const o of originalAnchors[f]) {
        const now = anchorsAfter.find((x) => x.comment === o.comment);
        const id = lineToCase(lint.cases[f], o.line);
        if (!id) {
          continue;
        }
        ((perCase[id] ??= {}).comments ??= []).push({
          after: now?.anchor ?? "removed",
          before: o.anchor,
          comment: o.comment,
        });
      }
    }
    behaviour[name] = runBehaviour(dir);
    types[name] = typecheck(dir);
    fixes[name] = perCase;
    console.log(
      `${name}: ${Object.values(perCase).filter((c) => c.changedText).length} cases changed`
    );
  }
  // Behaviour: which fixes change which case's result.
  const behaviourChanges = {};
  for (const id of Object.keys(behaviour.original)) {
    const base = JSON.stringify(behaviour.original[id]);
    behaviourChanges[id] = Object.fromEntries(
      Object.keys(FIXES).map((name) => [
        name,
        JSON.stringify(behaviour[name][id]) === base ? "same" : "changed",
      ])
    );
  }
  const typeChanges = {};
  for (const id of Object.keys(CASES).filter((k) => k.startsWith("I"))) {
    typeChanges[id] = Object.fromEntries(
      ["original", ...Object.keys(FIXES)].map((name) => [
        name,
        types[name]
          .filter((d) => d.case === id)
          .map((d) => `TS${d.code}: ${d.message}`),
      ])
    );
  }
  const unstableSort = unstableSortProbe();
  console.log(`unstable sort probe: ${JSON.stringify(unstableSort)}`);
  const result = {
    behaviour,
    behaviourChanges,
    cases: CASES,
    eslintRule: eslintDocs(),
    fixes,
    generated: new Date().toISOString().slice(0, 10),
    lint: lint.byCase,
    note: "Cases are calibration/sort-keys/*. `lint` lists every sort rule's diagnostic per case and configuration; `fixes` the key order and comment anchors each fix pass leaves, with what's still reported; `behaviour` each runnable case's result before and after each fix; `types` the inference cases' TypeScript diagnostics.",
    tools: {
      ...lib.toolVersions(),
      lightningcss: require(join(LIGHTNINGCSS, "package.json")).version,
      react: require(join(REACT, "package.json")).version,
    },
    typeChanges,
    types,
    unstableSort,
  };
  lib.writeJson(join(lib.RESULTS_DIR, "calibration.json"), result);
  for (const [id, c] of Object.entries(behaviourChanges)) {
    console.log(id, JSON.stringify(c));
  }
  for (const [id, c] of Object.entries(typeChanges)) {
    console.log(
      id,
      JSON.stringify(
        Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.length]))
      )
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
