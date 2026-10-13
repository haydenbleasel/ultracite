// Lints the agent-experiment subjects in examples/import-cycles/ and checks the behaviour their
// headers claim, then writes examples/import-cycles/examples.json.
//
//   lint       Oxlint (the root config `ultracite init` writes: core + react, and with js-plugins),
//              ESLint (core, in a fresh process started in the subject directory), Biome (core +
//              type-aware, from a temp copy with biome.json at its root) and tsc
//              (examples/import-cycles/tsconfig.json). Every rule that fires is recorded per file;
//              the import-graph rules are listed first, with message, Oxlint help and note.
//   behaviour  each subject's files are transpiled (ts.transpileModule, the subject's
//              verbatimModuleSyntax) into a scratch directory, with a marker prepended to each module
//              that records its evaluation, and imported under Node:
//                ica  both import orders, with and without a configured toolbar placement
//                icb  which subject modules evaluate when each importer is loaded, through the
//                     barrel and (rewritten) straight from the declaring module
//              Only the subjects' own adapted copies are run, never a clone.
//
// Usage (from the repo root):
//   node research/corpus/scripts/import-cycles-examples.cjs
"use strict";

const { execFileSync } = require("node:child_process");
const {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join } = require("node:path");

const ic = require("./import-cycles-lib.cjs");

const { ts } = ic;
const SUBJECTS = [
  {
    analysis: {
      behaviourCheck:
        "Transpile both files, stub HTMLElement and localStorage, and import them in both orders with no placement, a valid one and an invalid one configured (globalThis.__astro_dev_toolbar__). The original throws ReferenceError (TDZ on `placements`) when window.ts loads first and any placement is configured; a correct fix throws in no combination, gives the same settings.config in the safe order, the same isValidPlacement answers, the same DevToolbarWindow default placement and invalid-placement logging, and keeps both modules' exports. Re-lint: no import/no-cycle, import-x/no-cycle or noImportCycles; tsc passes.",
      cycle:
        "settings.ts imports isValidPlacement (value) and Placement (type) from ui-library/window.ts; window.ts imports defaultSettings and settings (values) from settings.ts. settings.ts runs `export const settings = getSettings()` at module evaluation; getSettings calls isValidPlacement, which reads the const `placements` of window.ts.",
      expectedFix:
        "Extract placements, Placement and isValidPlacement into a module of their own (e.g. ui-library/placement.ts) imported by both. Ultracite's agent prompt forbids creating or editing other files; within settings.ts alone, a local copy of the list and check plus `import type { Placement }` breaks the cycle and the hazard.",
      handOff:
        "settings.ts (its import of ./ui-library/window.js); window.ts gets the same report",
      temptingFixes:
        "`import type` while still calling isValidPlacement (type error); dynamic import() inside getSettings (settings becomes async or the check runs later); dropping the check; copying window.ts's code into settings.ts and re-exporting it.",
    },
    analysisFile: "settings.ts",
    dir: "ica-astro-dev-toolbar",
    id: "ica",
    permalinks: [
      "https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/client/dev-toolbar/settings.ts#L1-L69",
      "https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/client/dev-toolbar/ui-library/window.ts#L1-L140",
    ],
    repo: "withastro/astro",
    role: "Subject A: a real two-file import cycle with a value read at module evaluation (latent TDZ); the right fix extracts the shared code",
    sha: "9050e3819c51b0383cced278c278bc6f45c63468",
  },
  {
    analysis: {
      behaviourCheck:
        "Transpile the subject with a marker per module and import each importer: through the barrel, prepare-response loads cookies.ts and the cookie and errors stubs; with the importers pointed at response.js it loads response.ts only. A correct fix keeps every name the nine Astro importers use importable with the same identity (AstroCookies === the class in cookies.ts), keeps the type re-exports, and makes the importers stop loading cookies.ts when they don't need it.",
      cost: "In Astro at this commit, importing getSetCookiesFromResponse or attachCookiesToResponse through the barrel evaluates 10 modules instead of 1; five of the nine importers only need response.ts.",
      expectedFix:
        "Point each importer at cookies.js or response.js and delete the barrel (or keep only its type re-exports). That edits the importers, which Ultracite's agent prompt forbids.",
      handOff:
        "core/cookies/index.ts with Biome's noBarrelFile (or ESLint's unicorn/no-barrel-files); Oxlint's default presets report nothing here",
      temptingFixes:
        "Re-declaring the names (export const x = …; export class AstroCookies extends …) silences the rule, keeps the cost, and a subclass changes AstroCookies' identity; `export *` still reports; emptying or deleting the file breaks nine importers.",
    },
    analysisFile: "core/cookies/index.ts",
    dir: "icb-astro-cookies",
    id: "icb",
    importers: [
      "packages/astro/src/core/app/prepare-response.ts:2",
      "packages/astro/src/core/app/base.ts:11",
      "packages/astro/src/core/errors/default-handler.ts:7",
      "packages/astro/src/core/fetch/fetch-state.ts:14",
      "packages/astro/src/core/middleware/astro-middleware.ts:5",
      "packages/astro/src/core/middleware/index.ts:11",
      "packages/astro/src/core/rewrites/handler.ts:5",
      "packages/astro/src/types/public/index.ts:31 (export type)",
      "packages/astro/src/vite-plugin-astro-server/response.ts:4",
    ],
    permalinks: [
      "https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/cookies/index.ts#L1-L6",
      "https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/errors/default-handler.ts#L164-L264",
    ],
    repo: "withastro/astro",
    role: "Subject B: an internal barrel Biome's noBarrelFile reports; the right fix is in its importers",
    sha: "9050e3819c51b0383cced278c278bc6f45c63468",
  },
];
const STRIP = [
  "Import-cycle subject",
  "Import-cycles subject",
  "Rules it hits",
  "The cycle",
  "Why it matters",
  "The cost",
  "Not a public entry point",
  "Behaviour to preserve",
  "Expected fix",
  "Tempting fixes",
];

const focus = (rule) =>
  /no-cycle|noImportCycles|no-self-import|barrel|Barrel|ReExportAll|no-wildcard-import|NamespaceImport|prefer-export-from|noExportedImports/.test(
    rule
  );

const lint = async (subjectDir) => {
  const files = ic.listFiles(subjectDir).filter((f) => !f.endsWith(".d.ts"));
  const out = {};
  for (const presets of [
    ["core", "react"],
    ["core", "react", "js-plugins"],
  ]) {
    out[`oxlint ${presets.join("+")}`] = ic
      .runOxlintFull({
        configFile: ic.oxlintConfig(presets),
        cwd: subjectDir,
        files,
      })
      .diagnostics.map((d) => ({
        file: d.file,
        help: d.help,
        line: d.line,
        message: d.message,
        note: d.note,
        rule: d.rule,
      }));
  }
  out["eslint core"] = JSON.parse(
    execFileSync(
      process.execPath,
      [__filename, "--eslint-dir", subjectDir, "--files", files.join(",")],
      {
        cwd: subjectDir,
        encoding: "utf8",
        maxBuffer: 1 << 26,
        stdio: ["ignore", "pipe", "ignore"],
      }
    )
  );
  const tmp = join(
    ic.BIOME_TMP,
    "examples",
    ic.EXTERNAL.length ? subjectDir.split("/").pop() : "x"
  );
  rmSync(tmp, { force: true, recursive: true });
  cpSync(subjectDir, tmp, { recursive: true });
  out["biome core+type-aware"] = ic.runBiomeProject({
    dir: tmp,
    files,
    mode: "ultracite",
  }).diagnostics;
  const tsc = join(
    dirname(require.resolve("typescript/package.json", { paths: [ic.CLI] })),
    "bin/tsc"
  );
  let tscOut = "";
  try {
    execFileSync(
      process.execPath,
      [tsc, "-p", join(ic.EXAMPLES_DIR, "tsconfig.json")],
      { encoding: "utf8" }
    );
  } catch (error) {
    tscOut = error.stdout;
  }
  out.tsc = tscOut
    .split("\n")
    .filter((l) => l.includes(subjectDir.split("/").pop()));
  const summary = {};
  for (const [config, rows] of Object.entries(out)) {
    if (config === "tsc") {
      continue;
    }
    summary[config] = {
      focus: rows.filter((r) => focus(r.rule)),
      otherRules: [
        ...new Set(rows.filter((r) => !focus(r.rule)).map((r) => r.rule)),
      ].sort(),
    };
  }
  return { summary, tsc: out.tsc };
};

// Transpiles a subject into `dest` as .mjs, rewriting relative specifiers and prepending a marker.
const stage = (subjectDir, dest, rewrite = (text) => text) => {
  rmSync(dest, { force: true, recursive: true });
  for (const f of ic.listFiles(subjectDir)) {
    const text = rewrite(readFileSync(join(subjectDir, f), "utf8"), f);
    const js = ts
      .transpileModule(text, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          verbatimModuleSyntax: true,
        },
        fileName: f,
      })
      .outputText.replaceAll(/(from\s+["']\.[^"']*?)\.js(["'])/g, "$1.mjs$2");
    const target = join(dest, f.replace(/\.ts$/, ".mjs"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      `(globalThis.__loaded ??= []).push(${JSON.stringify(f)});\n${js}`
    );
  }
};

const runNode = (cwd, code) =>
  execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd,
    encoding: "utf8",
  }).trim();

const behaviourIca = () => {
  const dest = join(
    tmpdir(),
    "ultracite-research-import-cycles",
    "behaviour",
    "ica"
  );
  stage(join(ic.EXAMPLES_DIR, "ica-astro-dev-toolbar"), dest);
  const rows = [];
  for (const order of ["settings-first", "window-first"]) {
    for (const placement of [null, "bottom-left", "nowhere"]) {
      const code = `
globalThis.HTMLElement = class {};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
${placement ? `globalThis.__astro_dev_toolbar__ = { placement: ${JSON.stringify(placement)} };` : ""}
try {
  ${order === "window-first" ? 'await import("./ui-library/window.mjs");' : ""}
  const s = await import("./settings.mjs");
  console.log(JSON.stringify({ config: s.settings.config, loaded: globalThis.__loaded }));
} catch (e) {
  console.log(JSON.stringify({ error: e.name + ": " + e.message, loaded: globalThis.__loaded }));
}`;
      rows.push({ order, placement, ...JSON.parse(runNode(dest, code)) });
    }
  }
  return rows;
};

const behaviourIcb = () => {
  const subject = join(ic.EXAMPLES_DIR, "icb-astro-cookies");
  const out = {};
  for (const variant of ["as-is", "direct"]) {
    const dest = join(
      tmpdir(),
      "ultracite-research-import-cycles",
      "behaviour",
      `icb-${variant}`
    );
    // "direct": the importers rewritten to import from the declaring module (the expected fix)
    stage(subject, dest, (text, f) =>
      variant === "direct" && !f.startsWith("core/cookies/")
        ? text.replaceAll("'../cookies/index.js'", "'../cookies/response.js'")
        : text
    );
    out[variant] = {};
    for (const importer of [
      "core/app/prepare-response.mjs",
      "core/errors/merge-responses.mjs",
      "core/cookies/index.mjs",
    ]) {
      out[variant][importer] = JSON.parse(
        runNode(
          dest,
          `await import("./${importer}"); console.log(JSON.stringify(globalThis.__loaded));`
        )
      );
    }
  }
  // the barrel's exports and AstroCookies' identity
  const dest = join(
    tmpdir(),
    "ultracite-research-import-cycles",
    "behaviour",
    "icb-as-is"
  );
  out.exports = JSON.parse(
    runNode(
      dest,
      `const b = await import("./core/cookies/index.mjs"); const c = await import("./core/cookies/cookies.mjs");
console.log(JSON.stringify({ names: Object.keys(b).sort(), sameAstroCookies: b.AstroCookies === c.AstroCookies }));`
    )
  );
  return out;
};

const eslintChild = async (dir, files) => {
  const rows = await ic.runEslint({ cwd: dir, files, presets: ["core"] });
  process.stdout.write(
    JSON.stringify(
      rows.map((d) => ({
        file: d.file,
        line: d.line,
        message: d.message,
        rule: d.rule,
      }))
    )
  );
};

const main = async () => {
  if (ic.flag("eslint-dir")) {
    await eslintChild(ic.arg("eslint-dir"), ic.arg("files").split(","));
    return;
  }
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Measured by scripts/import-cycles-examples.cjs. `lint` lists, per configuration, the import-graph rule hits (`focus`, with message, Oxlint help and note) and every other rule that fires. Oxlint = core + react as `ultracite init` writes it, then with js-plugins; ESLint = Ultracite's core preset; Biome = core + type-aware (noImportCycles is only in type-aware); tsc = examples/import-cycles/tsconfig.json. `behaviour` runs transpiled copies of the subjects, never a clone. Header lines starting with a stripFields name hold analysis and must be removed (through the end of that field) before an agent sees a subject.",
    stripFields: STRIP,
    subjects: [],
    tools: ic.toolVersions(),
  };
  for (const s of SUBJECTS) {
    const dir = join(ic.EXAMPLES_DIR, s.dir);
    const files = ic.listFiles(dir);
    result.subjects.push({
      ...s,
      files: files.map((f) => ({
        file: f,
        lines: readFileSync(join(dir, f), "utf8").split("\n").length,
      })),
      lint: await lint(dir),
    });
  }
  result.behaviour = { ica: behaviourIca(), icb: behaviourIcb() };
  ic.writeJson(join(ic.EXAMPLES_DIR, "examples.json"), result);
  for (const s of result.subjects) {
    for (const [config, v] of Object.entries(s.lint.summary)) {
      console.log(
        `${s.id} ${config}: ${v.focus.map((f) => `${f.rule} ${f.file}:${f.line}`).join("; ") || "-"} | other: ${v.otherRules.length}`
      );
    }
    console.log(`${s.id} tsc: ${s.lint.tsc.length} errors`);
  }
  console.log(
    JSON.stringify(
      result.behaviour.ica.map(
        (r) => `${r.order}/${r.placement}: ${r.error ?? "ok"}`
      )
    )
  );
  console.log(JSON.stringify(result.behaviour.icb));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
