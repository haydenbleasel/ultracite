// Shared definitions for the import-cycles scripts: paths, the import-graph rules this topic
// covers, the module resolution used to build each repo's file graph (adapted from
// dead-code-exports.cjs: TypeScript's own resolution, then workspace package names and `dist/`
// paths mapped back to source), and runners for Ultracite's Oxlint, ESLint and Biome presets.
//
// The Oxlint and ESLint runners are dead-code-lib.cjs's, which keep each linter's full message,
// help text and (for Oxlint) the `note` field that carries the cycle path. Biome's project rules
// (noImportCycles) only see files under the directory that holds biome.json, so runBiomeProject
// writes the config into the root of the tree it lints, which is always a copy made by these
// scripts, never a clone.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, relative, resolve, sep } = require("node:path");
const { pathToFileURL } = require("node:url");

const dc = require("./dead-code-lib.cjs");
const { collect, getRepo } = require("./collect-files.cjs");

const { ts } = dc;
const HERE = resolve(__dirname, "..");
const TOPIC = "import-cycles";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
// Biome's Ultracite preset ignores `**/out`; trees Biome lints live outside the repo.
const BIOME_TMP = join(tmpdir(), "ultracite-research-import-cycles");

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const only = () => (arg("repos", "") || "").split(",").filter(Boolean);

const EXTERNAL = dc.EXTERNAL;
const SHAS = Object.fromEntries(
  require("./repos.json").repos.map((r) => [r.name, null])
);

// ── the rules this topic covers ────────────────────────────────────────
// Oxlint names. rule-census.cjs refuses focus rules the presets don't enable, so the census
// wrapper filters this list.
const OXLINT_FOCUS = [
  "import/no-cycle",
  "import/no-self-import",
  "oxc/no-barrel-file",
  "import/no-namespace",
  "no-restricted-imports",
  "unicorn/prefer-export-from",
  "unicorn/import-style",
  "sonarjs/no-wildcard-import",
  "react-doctor/no-barrel-import",
  "import/namespace",
  "import/no-duplicates",
  "import/first",
  "import/no-empty-named-blocks",
  "import/no-mutable-exports",
  "import/consistent-type-specifier-style",
  "typescript/consistent-type-imports",
  "typescript/consistent-type-exports",
  "typescript/no-import-type-side-effects",
  "import/max-dependencies",
  "import/no-relative-parent-imports",
  "import/export",
  "import/named",
];

// Rules compared across linters, by concept. ESLint names keep their own spelling.
const CONCEPTS = {
  cycle: {
    biome: ["suspicious/noImportCycles"],
    eslint: ["import-x/no-cycle"],
    oxlint: ["import/no-cycle"],
  },
  selfImport: {
    biome: [],
    eslint: ["import-x/no-self-import"],
    oxlint: ["import/no-self-import"],
  },
  barrel: {
    biome: ["performance/noBarrelFile"],
    eslint: [],
    oxlint: ["oxc/no-barrel-file"],
  },
  reExportAll: {
    biome: ["performance/noReExportAll"],
    eslint: ["sonarjs/no-wildcard-import"],
    oxlint: ["sonarjs/no-wildcard-import"],
  },
  namespaceImport: {
    biome: ["performance/noNamespaceImport"],
    eslint: ["import-x/no-namespace", "sonarjs/no-wildcard-import"],
    oxlint: ["import/no-namespace", "sonarjs/no-wildcard-import"],
  },
  barrelImport: {
    biome: [],
    eslint: ["react-doctor/no-barrel-import"],
    oxlint: ["react-doctor/no-barrel-import"],
  },
  exportedImport: {
    biome: ["style/noExportedImports"],
    eslint: ["unicorn/prefer-export-from"],
    oxlint: ["unicorn/prefer-export-from"],
  },
};

const BIOME_RULES = {
  performance: [
    "noBarrelFile",
    "noReExportAll",
    "noNamespaceImport",
    "noDynamicNamespaceImportAccess",
  ],
  style: ["noExportedImports", "useImportType", "useExportType"],
  suspicious: ["noImportCycles"],
};
const BIOME_RULE_NAMES = new Set(
  Object.entries(BIOME_RULES).flatMap(([g, names]) =>
    names.map((n) => `${g}/${n}`)
  )
);
const isEslintImportRule = (rule) =>
  /^(?:import-x\/|sonarjs\/no-wildcard-import$|unicorn\/(?:prefer-export-from|import-style|no-useless-re-export|no-barrel-files)$|no-restricted-imports$|@typescript-eslint\/(?:consistent-type-imports|consistent-type-exports|no-import-type-side-effects|no-restricted-imports)$|react-doctor\/no-barrel-import$)/.test(
    rule
  );

const oxlintEnabled = async (presets) => {
  const rules = {};
  for (const name of presets) {
    const mod = await import(
      pathToFileURL(join(dc.CLI, "config/oxlint", name, "index.mjs")).href
    );
    Object.assign(rules, mod.default.rules ?? {});
  }
  const sev = (v) => (Array.isArray(v) ? v[0] : v);
  return new Set(
    Object.keys(rules).filter((r) => !["off", 0].includes(sev(rules[r])))
  );
};

// ── per-repo graph setup ───────────────────────────────────────────────
// The tsconfig that supplies compiler options (paths included) for each measured package. Next.js
// and VS Code are sparse clones of one directory: their graphs cover that directory only, so
// cycles through the rest of the repository are invisible (a lower bound).
const SETUP = {
  astro: { tsconfig: "packages/astro/tsconfig.json" },
  excalidraw: { tsconfig: "tsconfig.json" },
  hono: { tsconfig: "tsconfig.json" },
  "next.js": { tsconfig: "packages/next/tsconfig.json" },
  trpc: { tsconfig: "tsconfig.json" },
  vite: { tsconfig: "packages/vite/src/node/tsconfig.json" },
  vscode: { tsconfig: "src/tsconfig.json" },
  zod: { tsconfig: "packages/zod/tsconfig.json" },
};
// Entry points the package.json mapping can't infer, read from each repo's build config.
const ENTRY_EXTRA = {
  vite: [
    // packages/vite/rolldown.config.ts: node entries and the module runner
    "packages/vite/src/node/index.ts",
    "packages/vite/src/node/cli.ts",
    "packages/vite/src/node/internal.ts",
    "packages/vite/src/module-runner/index.ts",
    // served to the browser by path (CLIENT_ENTRY / ENV_ENTRY in src/node/constants.ts)
    "packages/vite/src/client/client.ts",
    "packages/vite/src/client/env.ts",
  ],
};
const SPARSE = {
  "next.js":
    "sparse clone of packages/next/src: package.json is present, the rest of the monorepo is not",
  vscode:
    "sparse clone of src/vs/editor/common (plus src/*.json): imports of src/vs/base and src/vs/platform don't resolve, so cycles through them are invisible",
};

// ── resolution helpers (from dead-code-exports.cjs) ────────────────────
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".astro",
  ".turbo",
  "out",
]);
const TS_EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const probe = (base) => {
  const stem = base.replace(/\.d\.[cm]?ts$/, "").replace(/\.[cm]?[jt]sx?$/, "");
  for (const candidate of [
    ...TS_EXTS.map((x) => stem + x),
    ...TS_EXTS.map((x) => join(stem, `index${x}`)),
  ]) {
    if (
      existsSync(candidate) &&
      statSync(candidate).isFile() &&
      !/\.d\.[cm]?ts$/.test(candidate)
    ) {
      return candidate;
    }
  }
  return null;
};
const toSource = (pkgRoot, target) => {
  if (typeof target !== "string" || target.includes("*")) {
    return null;
  }
  const rel = target.replace(/^\.\//, "");
  const direct = probe(join(pkgRoot, rel));
  if (direct && !/(?:^|\/)dist\//.test(rel)) {
    return direct;
  }
  const stripped = rel.replace(
    /^dist\/(?:types\/|cjs\/|esm\/|prod\/|dev\/|node\/)?/,
    ""
  );
  const nodeKept = rel.replace(/^dist\//, "");
  for (const base of [
    join(pkgRoot, "src", stripped),
    join(pkgRoot, "src", nodeKept),
    join(pkgRoot, stripped),
    join(dirname(pkgRoot), stripped),
  ]) {
    const hit = probe(base);
    if (hit) {
      return hit;
    }
  }
  return null;
};
const exportTargets = (exp) => {
  const out = [];
  const visit = (v, key) => {
    if (typeof v === "string") {
      out.push({ key, target: v });
    } else if (Array.isArray(v)) {
      for (const x of v) {
        visit(x, key);
      }
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        visit(x, k.startsWith(".") ? k : key);
      }
    }
  };
  visit(exp, ".");
  return out;
};
const findPackages = (root) => {
  const pkgs = [];
  const visit = (dir, depth) => {
    if (depth > 4) {
      return;
    }
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (
        e.isSymbolicLink() ||
        SKIP_DIRS.has(e.name) ||
        e.name.startsWith(".")
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        visit(abs, depth + 1);
      } else if (e.name === "package.json") {
        try {
          const json = JSON.parse(readFileSync(abs, "utf8"));
          if (json.name) {
            pkgs.push({ json, name: json.name, root: dir });
          }
        } catch {
          // not JSON
        }
      }
    }
  };
  visit(root, 0);
  return pkgs;
};
const walkCode = (dir, out = []) => {
  if (!existsSync(dir)) {
    return out;
  }
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink() || SKIP_DIRS.has(e.name)) {
      continue;
    }
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      walkCode(abs, out);
    } else if (/\.(?:[cm]?[jt]sx?)$/.test(e.name)) {
      out.push(abs);
    }
  }
  return out;
};
// Every source file a package.json entry (exports, main, module, types, bin) maps to.
const entryFiles = (pkg) => {
  const files = new Set();
  const wildcard = new Set();
  const targets = [
    ...exportTargets(pkg.json.exports ?? {}),
    ...["main", "module", "types", "typings", "browser"]
      .filter((k) => typeof pkg.json[k] === "string")
      .map((k) => ({ key: k, target: pkg.json[k] })),
    ...Object.values(
      typeof pkg.json.bin === "object"
        ? pkg.json.bin
        : pkg.json.bin
          ? { bin: pkg.json.bin }
          : {}
    ).map((t) => ({ key: "bin", target: t })),
  ];
  for (const { target } of targets) {
    if (/package\.json$|\.css$|\.json$/.test(target)) {
      continue;
    }
    if (target.includes("*")) {
      const dirTarget = target
        .slice(0, target.indexOf("*"))
        .replace(/^\.\//, "");
      const strippedDir = dirTarget.replace(/^dist\/(?:types\/)?/, "");
      for (const base of [
        join(pkg.root, "src", strippedDir),
        join(pkg.root, strippedDir),
      ]) {
        if (existsSync(base) && statSync(base).isDirectory()) {
          for (const f of walkCode(base)) {
            if (!/\.d\.[cm]?ts$/.test(f)) {
              wildcard.add(f);
            }
          }
          break;
        }
      }
      continue;
    }
    const src = toSource(pkg.root, target);
    if (src) {
      files.add(src);
    }
  }
  return { files: [...files], wildcard: [...wildcard] };
};

// Compiler options for one repo, from its tsconfig, forced to bundler resolution (as in
// dead-code-exports.cjs). `verbatimModuleSyntax` and the decorator flags are kept, because they
// decide which imports survive to runtime.
const compilerOptionsFor = (root, tsconfigRel) => {
  const tsconfigPath = join(root, tsconfigRel);
  const { config: raw } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    raw ?? {},
    ts.sys,
    dirname(tsconfigPath)
  );
  const options = {
    ...parsed.options,
    allowImportingTsExtensions: true,
    allowJs: true,
    checkJs: false,
    composite: false,
    declaration: false,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    types: [],
  };
  delete options.incremental;
  delete options.tsBuildInfoFile;
  delete options.rootDir;
  delete options.outDir;
  return { options, parsed: parsed.options };
};

// A resolver with TypeScript's module resolution, then workspace package names through their
// package.json `exports` (dist -> src), then relative imports of built output back to src.
const makeResolver = (root, options, host) => {
  const packages = findPackages(root);
  const byName = new Map(packages.map((p) => [p.name, p]));
  const fallback = (spec) => {
    const parts = spec.startsWith("@")
      ? spec.split("/").slice(0, 2)
      : spec.split("/").slice(0, 1);
    const pkgName = parts.join("/");
    const pkg = byName.get(pkgName);
    if (!pkg) {
      return null;
    }
    const sub = spec.slice(pkgName.length);
    const subKey = sub ? `.${sub}` : ".";
    const exp = pkg.json.exports;
    let target = null;
    if (exp && typeof exp === "object") {
      const entry =
        exp[subKey] ??
        (subKey === "." && typeof exp.import === "string" ? exp : null);
      if (entry) {
        const t = exportTargets(entry).map((x) => x.target);
        target =
          t.find((x) => /src\//.test(x)) ??
          t.find((x) => /\.d\.[cm]?ts$/.test(x)) ??
          t[0];
      } else {
        for (const [k, v] of Object.entries(exp)) {
          if (k.includes("*")) {
            const prefix = k.slice(0, k.indexOf("*"));
            if (subKey.startsWith(prefix)) {
              const rest = subKey.slice(prefix.length);
              const t = exportTargets(v).map((x) => x.target)[0];
              if (t) {
                target = t.replace("*", rest);
              }
            }
          }
        }
      }
    } else if (typeof exp === "string" && subKey === ".") {
      target = exp;
    }
    if (!target && subKey === ".") {
      target =
        pkg.json.source ??
        pkg.json.types ??
        pkg.json.module ??
        pkg.json.main ??
        "./src/index.ts";
    }
    if (!target) {
      target = `./src${sub}`;
    }
    return (
      toSource(pkg.root, target) ??
      probe(join(pkg.root, "src", sub)) ??
      probe(join(pkg.root, sub))
    );
  };
  const distToSource = (spec, containingFile) => {
    const abs = resolve(dirname(containingFile), spec);
    const m = /^(.*?)[\\/]dist[\\/](.*)$/.exec(abs);
    if (!m) {
      return null;
    }
    return toSource(m[1], `./dist/${m[2].split(sep).join("/")}`);
  };
  const cache = new Map();
  // -> { file, how: resolved|fallback|dist|external|unresolved }
  const resolveSpec = (spec, containingFile) => {
    const key = `${containingFile}\0${spec}`;
    const hit = cache.get(key);
    if (hit) {
      return hit;
    }
    let out;
    const r = ts.resolveModuleName(spec, containingFile, options, host);
    const file = r.resolvedModule?.resolvedFileName;
    if (file && file.includes(`${sep}node_modules${sep}`)) {
      out = { file: null, how: "external" };
    } else if (file && !file.startsWith(root + sep)) {
      out = { file: null, how: "external" };
    } else if (file) {
      out = { file, how: "resolved" };
    } else if (spec.startsWith(".")) {
      const mapped = distToSource(spec, containingFile);
      out = mapped
        ? { file: mapped, how: "dist" }
        : { file: null, how: "unresolved" };
    } else if (!spec.startsWith("/")) {
      const fb = fallback(spec);
      out = fb
        ? { file: fb, how: "fallback" }
        : { file: null, how: "external" };
    } else {
      out = { file: null, how: "unresolved" };
    }
    cache.set(key, out);
    return out;
  };
  return { packages, resolveSpec };
};

// ── Tarjan's strongly connected components (iterative) ─────────────────
const scc = (nodes, succ) => {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const out = [];
  for (const start of nodes) {
    if (idx.has(start)) {
      continue;
    }
    const work = [[start, 0]];
    idx.set(start, index);
    low.set(start, index);
    index++;
    stack.push(start);
    onStack.add(start);
    while (work.length > 0) {
      const frame = work.at(-1);
      const [v] = frame;
      const next = succ(v);
      if (frame[1] < next.length) {
        const w = next[frame[1]++];
        if (!idx.has(w)) {
          idx.set(w, index);
          low.set(w, index);
          index++;
          stack.push(w);
          onStack.add(w);
          work.push([w, 0]);
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v), idx.get(w)));
        }
      } else {
        work.pop();
        if (work.length > 0) {
          const u = work.at(-1)[0];
          low.set(u, Math.min(low.get(u), low.get(v)));
        }
        if (low.get(v) === idx.get(v)) {
          const comp = [];
          let w;
          do {
            w = stack.pop();
            onStack.delete(w);
            comp.push(w);
          } while (w !== v);
          out.push(comp);
        }
      }
    }
  }
  return out;
};

// ── linters ────────────────────────────────────────────────────────────
// Oxlint, wired as `ultracite init` writes the root config.
const oxlintConfig = (presets) =>
  dc.writeOxlintConfig(presets, join(OUT_DIR, "configs"));

// Oxlint with every diagnostic field kept, including `note` (no-cycle prints the cycle path there;
// Ultracite's agent handoff keeps it in the diagnostic's `raw` object).
const runOxlintFull = ({
  cwd,
  files,
  configFile,
  keep = null,
  extraArgs = [],
}) => {
  const out = [];
  let linted = 0;
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    let stdout;
    try {
      stdout = execFileSync(
        process.execPath,
        [
          dc.oxlintBin,
          "-c",
          configFile,
          "--disable-nested-config",
          "--format",
          "json",
          ...extraArgs,
          ...chunk,
        ],
        {
          cwd,
          encoding: "utf8",
          maxBuffer: 1 << 30,
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
      const rule = dc.oxlintRule(d.code);
      if (keep && !keep(rule)) {
        continue;
      }
      const span = d.labels?.[0]?.span ?? {};
      out.push({
        column: span.column,
        file: d.filename,
        help: d.help ?? null,
        labels: (d.labels ?? []).map((l) => l.label ?? null),
        line: span.line,
        message: d.message,
        note: d.note ?? null,
        rule,
      });
    }
  }
  return { diagnostics: out, linted };
};

// "╭──▶ ./b (src/b.ts)\n│ ⬇ imports\n│ ./c (src/c.ts)…" -> ["src/b.ts", "src/c.ts"]
const parseCycleNote = (note) =>
  [...(note ?? "").matchAll(/^(?:╭──▶|│)\s+\S.*\(([^()]+)\)\s*$/gm)].map(
    (m) => m[1]
  );

// Biome with its config at the root of `dir` (a copy). mode "ultracite" extends the published
// core and type-aware presets (noImportCycles lives in type-aware); mode "rules" turns on exactly
// BIOME_RULES with Ultracite's severity and no options, recommended off.
const writeBiomeRootConfig = (dir, mode) => {
  const base = {
    $schema: undefined,
    assist: { enabled: false },
    files: { ignoreUnknown: true, maxSize: 10_000_000 },
    formatter: { enabled: false },
    javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
    root: true,
    vcs: { enabled: false },
  };
  let body;
  if (mode === "ultracite") {
    body = {
      ...base,
      extends: [
        join(dc.CLI, "config/biome/core/biome.jsonc"),
        join(dc.CLI, "config/biome/type-aware/biome.jsonc"),
      ],
    };
  } else if (mode === "ultracite-core") {
    body = {
      ...base,
      extends: [join(dc.CLI, "config/biome/core/biome.jsonc")],
    };
  } else {
    const rules = { recommended: false };
    for (const [group, names] of Object.entries(BIOME_RULES)) {
      rules[group] = Object.fromEntries(names.map((n) => [n, "error"]));
    }
    body = { ...base, linter: { enabled: true, rules } };
  }
  delete body.$schema;
  writeFileSync(join(dir, "biome.json"), JSON.stringify(body, null, 2));
};

const runBiomeProject = ({
  dir,
  files = ["."],
  mode = "rules",
  keep = null,
}) => {
  writeBiomeRootConfig(dir, mode);
  let stdout;
  const started = Date.now();
  try {
    stdout = execFileSync(
      process.execPath,
      [
        dc.biomeBin,
        "lint",
        "--reporter=json",
        "--max-diagnostics=none",
        ...files,
      ],
      {
        cwd: dir,
        encoding: "utf8",
        maxBuffer: 1 << 30,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = error.stdout;
  }
  const report = JSON.parse(stdout);
  const out = [];
  for (const d of report.diagnostics ?? []) {
    const rule = (d.category ?? "").replace(/^lint\//, "");
    if (keep && !keep(rule)) {
      continue;
    }
    const path = d.location?.path;
    out.push({
      column: d.location?.start?.column,
      file: typeof path === "string" ? path : (path?.file ?? null),
      line: d.location?.start?.line,
      message: typeof d.message === "string" ? d.message : null,
      rule,
    });
  }
  return {
    diagnostics: out,
    seconds: (Date.now() - started) / 1000,
    summary: report.summary,
  };
};

// Biome's terminal reporter carries the advice text its JSON reporter leaves out.
const biomeProjectAdvices = ({ dir, files = ["."], mode = "ultracite" }) => {
  writeBiomeRootConfig(dir, mode);
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [dc.biomeBin, "lint", "--colors=off", "--max-diagnostics=none", ...files],
      {
        cwd: dir,
        encoding: "utf8",
        maxBuffer: 1 << 29,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
  const out = [];
  for (const block of stdout.split(/\n(?=\S+:\d+:\d+ lint\/)/)) {
    const head = /^(\S+):(\d+):(\d+) lint\/(\S+)/.exec(block.trim());
    if (!head) {
      continue;
    }
    out.push({
      column: Number(head[3]),
      file: head[1],
      line: Number(head[2]),
      notes: [...block.matchAll(/^\s+[iℹ] (.+)$/gm)].map((m) => m[1].trim()),
      rule: head[4],
    });
  }
  return out;
};

// Copies files (relative to `from`) into a fresh `to`, optionally rewriting text.
const copyTree = (from, to, rels, transform = null) => {
  rmSync(to, { force: true, recursive: true });
  for (const rel of rels) {
    const dest = join(to, rel);
    mkdirSync(dirname(dest), { recursive: true });
    if (transform && /\.(?:[cm]?[jt]sx?)$/.test(rel)) {
      writeFileSync(dest, transform(readFileSync(join(from, rel), "utf8")));
    } else {
      copyFileSync(join(from, rel), dest);
    }
  }
};

// Same-length neutralisation of inline disable directives (as rule-census.cjs's raw mode).
const DIRECTIVE = /\b(eslint|oxlint)-(disable|enable)/g;
const neutralise = (text) =>
  text.replace(
    DIRECTIVE,
    (_, tool, verb) => `${"x".repeat(tool.length)}-${verb}`
  );

const listFiles = (dir, re = /\.(?:[cm]?[jt]sx?)$/) => {
  const out = [];
  const visit = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const abs = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules") {
          visit(abs);
        }
      } else if (re.test(e.name)) {
        out.push(relative(dir, abs).split(sep).join("/"));
      }
    }
  };
  visit(dir);
  return out.sort();
};

const readJson = (path, fallback = null) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const median = (xs) => {
  if (xs.length === 0) {
    return null;
  }
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (xs, q) => {
  if (xs.length === 0) {
    return null;
  }
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

module.exports = {
  ...dc,
  BIOME_RULES,
  BIOME_RULE_NAMES,
  BIOME_TMP,
  CALIBRATION_DIR,
  CONCEPTS,
  ENTRY_EXTRA,
  EXAMPLES_DIR,
  EXTERNAL,
  HERE,
  OUT_DIR,
  OXLINT_FOCUS,
  RESULTS_DIR,
  SETUP,
  SHAS,
  SPARSE,
  TOPIC,
  arg,
  biomeProjectAdvices,
  collect,
  compilerOptionsFor,
  copyTree,
  entryFiles,
  findPackages,
  flag,
  getRepo,
  isEslintImportRule,
  listFiles,
  makeResolver,
  median,
  neutralise,
  only,
  oxlintConfig,
  oxlintEnabled,
  parseCycleNote,
  quantile,
  readJson,
  runBiomeProject,
  runOxlintFull,
  scc,
  writeBiomeRootConfig,
  writeJson,
};
