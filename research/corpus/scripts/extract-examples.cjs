// Copies the chosen example functions out of the pinned clones into ../examples/, each as its own
// file with attribution, scores, permalink and the full license of the source repo, and writes
// examples/examples.json. Afterwards run:
//   node analyze.cjs --files examples-check ../examples <files…>   (done by this script)
// to confirm each extracted copy reproduces its in-repo sonarjs and cyclomatic scores.
//
// Usage: node extract-examples.cjs
"use strict";

const { execFileSync } = require("node:child_process");
const {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { extname, join, resolve } = require("node:path");
const config = require("./repos.json");

const HERE = resolve(__dirname, "..");
const OUT = join(HERE, "out");
const EX = join(HERE, "examples");

/**
 * The picks. `stubs` are extra lines (verbatim from the same file, or minimal type stubs) needed
 * to paste the function into a standalone file; `wrap` wraps a method in a class/object shell.
 */
const PICKS = [
  {
    id: "a-high-cyclomatic-low-cognitive",
    role: "5a: high cyclomatic, low cognitive (flat switch)",
    repo: "vscode",
    file: "src/vs/editor/common/languages.ts",
    name: "toLabel",
    startLine: 436,
    stubs: {
      before: [
        "// --- stubs (not in the original): minimal declarations so this file type-checks on its own ---",
        "declare function localize(key: string, message: string): string;",
        "declare const enum CompletionItemKind { Method, Function, Constructor, Field, Variable, Class, Struct, Interface, Module, Property, Event, Operator, Unit, Value, Constant, Enum, EnumMember, Keyword, Text, Color, File, Reference, Customcolor, Folder, TypeParameter, User, Issue, Tool, Snippet }",
        "// --- end stubs ---",
      ],
    },
  },
  {
    id: "a-alt-and-chain-equals",
    role: "5a (alternate): high cyclomatic, low cognitive (one long && chain)",
    repo: "vscode",
    file: "src/vs/editor/common/viewLayout/viewLineRenderer.ts",
    name: "RenderLineInput.equals",
    startLine: 182,
    wrap: "class",
  },
  {
    id: "b-high-cognitive-low-cyclomatic",
    role: "5b: high cognitive, modest cyclomatic (deep nesting)",
    repo: "next.js",
    file: "packages/next/src/client/app-link-gc.ts",
    name: "callback",
    startLine: 4,
  },
  {
    id: "b-alt-nested-loops",
    role: "5b (alternate): high cognitive, modest cyclomatic (nested loops), compact",
    repo: "astro",
    file: "packages/astro/src/i18n/utils.ts",
    name: "computePreferredLocaleList",
    startLine: 117,
    stubs: {
      before: [
        "// --- stubs (not in the original): the helpers and types it calls ---",
        "type Locales = (string | { path: string; codes: string[] })[];",
        "declare function sortAndFilterLocales(list: { locale: string; qualityValue?: number }[], locales: Locales): { locale: string; qualityValue?: number }[];",
        "declare function parseLocale(header: string): { locale: string; qualityValue?: number }[];",
        "declare function getAllCodes(locales: Locales): string[];",
        "declare function normalizeTheLocale(locale: string): string;",
        "// --- end stubs ---",
      ],
    },
  },
  {
    id: "c-pure-21-30",
    role: "5c: 21-30 cognitive, self-contained, readable, pure",
    repo: "next.js",
    file: "packages/next/src/server/lib/router-utils/cache-life-type-utils.ts",
    name: "formatTimespan",
    startLine: 12,
    stubs: {
      verbatimBefore: [5, 10],
      after: ["", "export { formatTimespan }"],
    },
  },
  {
    id: "c-alt-splitrule",
    role: "5c (alternate): 21-30 cognitive, pure, no dependencies (tokenizer loop)",
    repo: "hono",
    file: "src/jsx/dom/css.ts",
    name: "splitRule",
    startLine: 27,
    stubs: { after: ["", "export { splitRule }"] },
  },
  {
    id: "c-alt-routing-strategy",
    role: "5c (alternate): 21-30 cognitive, pure, nested if/else decision tree",
    repo: "astro",
    file: "packages/astro/src/core/app/common.ts",
    name: "toRoutingStrategy",
    startLine: 12,
    stubs: {
      before: [
        "// --- stubs (not in the original): a minimal stand-in for AstroConfig['i18n'] ---",
        "type AstroConfig = {",
        "\ti18n?: {",
        "\t\trouting: 'manual' | { prefixDefaultLocale: boolean; redirectToDefaultLocale: boolean };",
        "\t\tdomains?: Record<string, string>;",
        "\t};",
        "};",
        "// --- end stubs ---",
      ],
      verbatimBefore: [4, 11],
    },
  },
  {
    id: "d-highest-scoring",
    role: "5d: the single highest-scoring function across all repos",
    repo: "next.js",
    file: "packages/next/src/lib/metadata/metadata-elements.tsx",
    name: "createMetadataElements",
    startLine: 83,
  },
];

const load = (name) => JSON.parse(readFileSync(join(OUT, name), "utf8"));
const comment = (lines) =>
  ["/*", ...lines.map((l) => ` * ${l}`.trimEnd()), " */"].join("\n");

mkdirSync(join(EX, "licenses"), { recursive: true });
const records = [];
const written = [];
for (const pick of PICKS) {
  const repoCfg = config.repos.find((r) => r.name === pick.repo);
  const data = load(`${pick.repo}.functions.json`);
  const fn = data.functions.find(
    (f) =>
      f.file === pick.file &&
      f.startLine === pick.startLine &&
      f.name === pick.name
  );
  if (!fn)
    throw new Error(
      `not found: ${pick.repo} ${pick.file}:${pick.startLine} ${pick.name}`
    );
  const biomeRows = load(`${pick.repo}.biome-compare.json`).rows;
  const b = biomeRows.find(
    (r) =>
      r.file === fn.file && r.startLine === fn.startLine && r.name === fn.name
  );
  const biome = b
    ? b.biome === null
      ? "<=1 (not reported)"
      : String(b.biome)
    : "n/a (file not parsed by Biome)";

  const src = readFileSync(join(data.root, fn.file), "utf8").split("\n");
  const body = src.slice(fn.startLine - 1, fn.endLine);
  const licensePath = join(data.root, repoCfg.license);
  const license = readFileSync(licensePath, "utf8").trimEnd().split("\n");
  copyFileSync(
    licensePath,
    join(EX, "licenses", `${pick.repo}-${repoCfg.license}`)
  );
  const permalink = `https://github.com/${data.github}/blob/${data.sha}/${fn.file}#L${fn.startLine}-L${fn.endLine}`;

  const notes = [];
  const before = [];
  const after = [];
  if (pick.stubs?.before) before.push(...pick.stubs.before);
  if (pick.stubs?.verbatimBefore) {
    const [a, z] = pick.stubs.verbatimBefore;
    before.push(
      `// --- copied verbatim from lines ${a}-${z} of the same file (needed by the function) ---`
    );
    before.push(...src.slice(a - 1, z));
    before.push("// --- end ---");
    notes.push(
      `Lines ${a}-${z} of the same file are included above the function because it uses them.`
    );
  }
  if (pick.stubs?.after) after.push(...pick.stubs.after);
  let code = body.join("\n");
  if (pick.wrap === "class") {
    const cls = fn.name.split(".")[0];
    code = `// --- wrapper (not in the original): the method lives in class ${cls} ---\nclass ${cls} {\n${code}\n}`;
    notes.push(
      `Wrapped in an empty class ${cls} so the method parses on its own; the class adds no complexity.`
    );
  }
  if (before.length || after.length || pick.wrap) {
    notes.push(
      "Anything marked as a stub or wrapper is not part of the original source."
    );
  }

  const header = comment([
    `Example ${pick.id}: ${pick.role}`,
    "",
    `Source:    ${data.github} — ${fn.file}, lines ${fn.startLine}-${fn.endLine}`,
    `Commit:    ${data.sha} (${data.commitDate})`,
    `Permalink: ${permalink}`,
    `Function:  ${fn.name} (${fn.kind}, ${fn.lines} lines)`,
    "Scores (measured in place, at the commit above):",
    `  sonarjs/cognitive-complexity (eslint-plugin-sonarjs ${data.tools["eslint-plugin-sonarjs"]}): ${fn.cognitive}`,
    `  ESLint core complexity, variant "classic" (eslint ${data.tools.eslint}): ${fn.cyclomatic}`,
    `  Biome complexity/noExcessiveCognitiveComplexity (@biomejs/biome ${data.tools["@biomejs/biome"]}): ${biome}`,
    `The function body (lines ${fn.startLine}-${fn.endLine}) is copied verbatim.`,
    ...notes,
    "",
    `License of the source repository (${data.github}/${repoCfg.license}), reproduced in full:`,
    "",
    ...license,
  ]);
  const ext = extname(fn.file);
  const outFile = `${pick.id}${ext}`;
  writeFileSync(
    join(EX, outFile),
    `${header}\n\n${[...before, ...(before.length ? [""] : []), code, ...after].join("\n")}\n`
  );
  written.push(outFile);
  records.push({
    id: pick.id,
    role: pick.role,
    repo: pick.repo,
    github: data.github,
    sha: data.sha,
    file: fn.file,
    name: fn.name,
    kind: fn.kind,
    startLine: fn.startLine,
    endLine: fn.endLine,
    lines: fn.lines,
    depth: fn.depth,
    cognitive: fn.cognitive,
    cyclomatic: fn.cyclomatic,
    biome: b ? b.biome : null,
    permalink,
    exampleFile: `examples/${outFile}`,
    license: `examples/licenses/${pick.repo}-${repoCfg.license}`,
    notes,
  });
}
writeFileSync(
  join(EX, "examples.json"),
  `${JSON.stringify(records, null, 2)}\n`
);

// Re-measure the extracted files and confirm the target function reproduces its scores.
execFileSync(
  process.execPath,
  [join(__dirname, "analyze.cjs"), "--files", "examples-check", EX, ...written],
  {
    stdio: "inherit",
  }
);
const check = load("examples-check.functions.json");
let ok = true;
for (const rec of records) {
  const file = rec.exampleFile.replace(/^examples\//, "");
  const shortName = rec.name.split(".").at(-1);
  const found = check.functions.filter(
    (f) =>
      f.file === file &&
      (f.name === rec.name ||
        f.name.endsWith(`.${shortName}`) ||
        f.name === shortName)
  );
  const match = found.find(
    (f) => f.cognitive === rec.cognitive && f.cyclomatic === rec.cyclomatic
  );
  rec.reproducedStandalone = Boolean(match);
  if (!match) ok = false;
  console.log(
    `${rec.id}: in repo cognitive=${rec.cognitive} cyclomatic=${rec.cyclomatic}; standalone ${found.map((f) => `${f.cognitive}/${f.cyclomatic}`).join(", ") || "(not found)"} ${match ? "OK" : "MISMATCH"}`
  );
}
writeFileSync(
  join(EX, "examples.json"),
  `${JSON.stringify(records, null, 2)}\n`
);
if (!ok) process.exitCode = 1;
