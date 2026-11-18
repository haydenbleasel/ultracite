// What the type-import rules report on the corpus, in each linter, and where the implementations
// disagree.
//
//   Oxlint   each variant in type-imports-lib.cjs OXLINT_VARIANTS alone (every category off), on a
//            mirror with disable directives neutralised (raw) and one as written (reported), with
//            every message, help text and note; and typescript/consistent-type-exports with
//            --type-aware (tsgolint), on the raw mirror with a generated tsconfig.json (nothing
//            resolves outside the measured files, so it's a lower bound).
//   ESLint   the census pass (type-imports-census.cjs: every variant in ESLINT_VARIANTS, inline
//            config ignored, which is raw), rerun with inline config honoured on files with a
//            directive (reported); and typescript-eslint's consistent-type-exports and
//            consistent-type-imports with type information (the census's TypeScript program
//            through `parserOptions.programs`).
//   Biome    each variant in BIOME_VARIANTS alone, raw and reported, with the terminal reporter's
//            notes (which carry the fix's description).
//   tsc      the census's program with verbatimModuleSyntax on (TS1484, TS1485 and the other
//            import-syntax errors), and with isolatedModules on (TS1205 and the re-export
//            errors), joined to the import or export they point at; with each repo's share of
//            resolved imports, since an unresolved import can't be checked.
// Every diagnostic is joined to the declaration it points at (the inventory's import, import-equals,
// export or `import()` type), and every declaration one implementation reports and another
// doesn't gets a reason from the inventory.
//
// Usage: TYPE_IMPORTS_TMP=<scratch> node --max-old-space-size=16384 research/corpus/scripts/type-imports-linters.cjs [--repos zod] [--skip-typed]
// Writes results/type-imports/linters.json and out/type-imports/linters/<repo>.json.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join, relative, sep } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const { ts } = lib;
const MIRROR = join(lib.TMP, "mirror");
const CONFIGS = join(lib.TMP, "configs");

// Oxlint with every field of each diagnostic kept.
const oxlintRun = ({
  cwd,
  files,
  configFile,
  typeAware = false,
  tsconfig = null,
}) => {
  const out = [];
  const CHUNK = 300;
  const env = typeAware
    ? { ...process.env, OXLINT_TSGOLINT_PATH: lib.dc.tsgolintPath() }
    : process.env;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    const r = lib.spawnSync(
      process.execPath,
      [
        lib.oxlintBin,
        "-c",
        configFile,
        "--disable-nested-config",
        ...(typeAware
          ? ["--type-aware", ...(tsconfig ? ["--tsconfig", tsconfig] : [])]
          : []),
        "--format",
        "json",
        ...chunk,
      ],
      { cwd, encoding: "utf8", env, maxBuffer: 1 << 30 }
    );
    const start = r.stdout.indexOf("{");
    if (start === -1) {
      throw new Error(`oxlint printed no JSON: ${r.stderr.slice(0, 500)}`);
    }
    const report = JSON.parse(r.stdout.slice(start));
    if (report.number_of_files !== chunk.length) {
      throw new Error(
        `oxlint linted ${report.number_of_files} of ${chunk.length} files`
      );
    }
    for (const d of report.diagnostics) {
      const span = d.labels?.[0]?.span ?? {};
      out.push({
        column: span.column ?? null,
        file: d.filename.replace(/^\.\//, ""),
        help: d.help ?? null,
        label: d.labels?.[0]?.label ?? null,
        line: span.line ?? null,
        message: d.message,
        note: d.note ?? null,
        rule: d.code ? lib.dc.oxlintRule(d.code) : "oxlint",
        url: d.url ?? null,
      });
    }
  }
  return out;
};

// The inventory item a diagnostic at `line` points at, in a census row.
const itemAt = (row, line, rule) => {
  const inRange = (x) => x.line <= line && line <= (x.endLine ?? x.line);
  if (/import\(\)|`import\(\)`/.test(rule ?? "")) {
    const t = row.importTypes.find(inRange);
    if (t) {
      return { item: t, kind: "importType" };
    }
  }
  const imp = row.imports.find(inRange);
  if (imp) {
    return { item: imp, kind: "import" };
  }
  const ie = row.importEquals.find(inRange);
  if (ie) {
    return { item: ie, kind: "importEquals" };
  }
  const ex = row.exports.find(inRange);
  if (ex) {
    return { item: ex, kind: "export" };
  }
  const t = row.importTypes.find(inRange);
  if (t) {
    return { item: t, kind: "importType" };
  }
  return { item: null, kind: null };
};
const keyOf = (rel, kind, item) => `${rel}:${kind}:${item?.line}`;

// A short description of an import for disagreement reasons.
const describeImport = (imp) => {
  const usages = [...new Set(imp.specifiers.map((s) => s.usage))].sort();
  const bits = [`form ${imp.form}`, `uses ${usages.join("+") || "none"}`];
  if (imp.specifiers.some((s) => s.refs.typeof)) {
    bits.push("typeof");
  }
  if (imp.specifiers.some((s) => s.refs.typeKey)) {
    bits.push("type key");
  }
  if (imp.specifiers.some((s) => s.refs.export)) {
    bits.push("exported");
  }
  if (imp.specifiers.some((s) => s.jsx)) {
    bits.push("jsx");
  }
  if (imp.specifiers.some((s) => s.metadata.length)) {
    bits.push("decorator metadata position");
  }
  if (imp.specifiers.some((s) => s.kind === "default")) {
    bits.push("default");
  }
  if (imp.specifiers.some((s) => s.kind === "namespace")) {
    bits.push("namespace");
  }
  if (imp.attributes) {
    bits.push("attributes");
  }
  return bits.join(", ");
};

// Rules compared by concept: which linter rule (and which of its messages) covers what.
const conceptOf = (linter, rule, message) => {
  if (linter === "biome") {
    if (rule === "style/useImportType") {
      if (/^All these imports are only used as types/.test(message)) {
        return "type-import (all)";
      }
      if (/only used as (?:a )?types?\./.test(message)) {
        // "Some named imports …", "These named imports …", "The default import …", "The default
        // import and some named imports …"
        return /^The default import/.test(message)
          ? "type-import (some, default)"
          : "type-import (some)";
      }
      if (/^Use import \{ type \} instead of import type/.test(message)) {
        return "style: wants inline";
      }
      if (/^Separate type imports from other imports/.test(message)) {
        return "style: wants top-level";
      }
      return `useImportType: ${message}`;
    }
    if (rule === "style/useExportType") {
      return "type-export";
    }
    if (rule === "correctness/noUnusedImports") {
      return "unused-import";
    }
    return rule;
  }
  if (/consistent-type-imports$/.test(rule)) {
    if (/`import\(\)` type annotations/.test(message)) {
      return "import() type annotation";
    }
    if (/All imports in the declaration/.test(message)) {
      return "type-import (all)";
    }
    if (/only used as type/.test(message)) {
      return "type-import (some)";
    }
    return `consistent-type-imports: ${message}`;
  }
  if (/no-import-type-side-effects$/.test(rule)) {
    return "inline-only";
  }
  if (/consistent-type-specifier-style$/.test(rule)) {
    return /inline .* instead of a top-level/i.test(message)
      ? "style: wants inline"
      : "style: wants top-level";
  }
  if (/no-duplicates$/.test(rule)) {
    return "duplicate";
  }
  if (/consistent-type-exports$/.test(rule)) {
    return "type-export";
  }
  if (linter === "tsc") {
    return rule;
  }
  return rule;
};

const VERBATIM_CODES = new Set([
  1484, 1485, 1286, 1287, 1288, 1289, 1290, 1291, 1292, 1293, 1295, 2748, 1361,
  1362,
]);
const ISOLATED_CODES = new Set([
  1205, 1448, 1269, 2748, 18055, 18056, 1203, 1208,
]);

const main = async () => {
  const names = lib.selectedRepos(lib.ALL);
  lib.checkPinned(names);
  mkdirSync(CONFIGS, { recursive: true });
  const oxConfigs = Object.fromEntries(
    Object.entries(lib.OXLINT_VARIANTS).map(([v, rules]) => [
      v,
      lib.writeOxlintRules(CONFIGS, v.replace(/\W+/g, "-"), rules),
    ])
  );
  const oxExportsConfig = lib.writeOxlintRules(
    CONFIGS,
    "consistent-type-exports",
    {
      "typescript/consistent-type-exports": "error",
    }
  );
  const biomeConfigs = Object.fromEntries(
    Object.keys(lib.BIOME_VARIANTS).map((v) => [
      v,
      lib.biomeVariantConfig(CONFIGS, v),
    ])
  );
  const out = {
    generated: new Date().toISOString(),
    messages: {},
    repos: {},
    tools: lib.toolVersions(),
  };
  // messages with names in them are grouped by their shape
  const normalise = (m) =>
    m
      .replace(/'[^']*'/g, "'…'")
      .replace(/"[^"]*"/g, '"…"')
      .replace(
        /Imports .* are only used as type/,
        "Imports … are only used as type"
      )
      .replace(/Type exports? .* (are|is) not/, "Type export(s) … $1 not")
      .replace(/Module .* is imported/, "Module … is imported")
      .replace(/`type [^`]+`/g, "`type …`");
  const messageBook = (linter, rule, message, help, note) => {
    const k = `${linter} | ${rule} | ${normalise(message)}`;
    out.messages[k] ??= {
      count: 0,
      help: lib.scrub(help ?? null),
      note: lib.scrub(note ?? null),
    };
    out.messages[k].count += 1;
  };
  for (const name of names) {
    const t0 = Date.now();
    const censusFile = join(lib.OUT_DIR, "census", `${name}.jsonl`);
    const rows = lib.readJsonl(censusFile).filter((r) => !r.error);
    const byRel = new Map(rows.map((r) => [r.rel, r]));
    const rels = rows.map((r) => r.rel);
    const testOf = new Map(rows.map((r) => [r.rel, r.test]));
    const mirrors = {};
    for (const mode of ["raw", "reported"]) {
      mirrors[mode] = lib.writeMirror(MIRROR, name, rels, mode);
    }
    const diags = []; // { linter, variant, mode, rel, line, rule, message, help, note }
    // Oxlint
    for (const [variant, configFile] of Object.entries(oxConfigs)) {
      for (const mode of ["raw", "reported"]) {
        for (const d of oxlintRun({
          configFile,
          cwd: mirrors[mode].root,
          files: rels,
        })) {
          diags.push({ ...d, linter: "oxlint", mode, rel: d.file, variant });
        }
      }
    }
    // Oxlint type-aware consistent-type-exports
    if (!lib.flag("skip-typed")) {
      const tsconfig = join(mirrors.raw.root, "tsconfig.json");
      writeFileSync(
        tsconfig,
        JSON.stringify({
          compilerOptions: {
            allowJs: true,
            jsx: "preserve",
            module: "esnext",
            moduleResolution: "bundler",
            noEmit: true,
            skipLibCheck: true,
            target: "esnext",
            types: [],
          },
          include: ["**/*"],
        })
      );
      try {
        for (const d of oxlintRun({
          configFile: oxExportsConfig,
          cwd: mirrors.raw.root,
          files: rels,
          tsconfig,
          typeAware: true,
        })) {
          diags.push({
            ...d,
            linter: "oxlint",
            mode: "raw",
            rel: d.file,
            variant: "consistent-type-exports (type-aware)",
          });
        }
      } catch (error) {
        out.repos[name] = {
          oxlintTypeAwareError: lib.scrub(String(error.message).slice(0, 300)),
        };
      }
    }
    // Biome (its own parse errors and unused-suppression notes are counted apart)
    const biomeOther = {};
    for (const [variant, configDir] of Object.entries(biomeConfigs)) {
      for (const mode of ["raw", "reported"]) {
        const ds = lib.runBiome({
          configDir,
          cwd: mirrors[mode].root,
          files: rels,
        });
        let notes = [];
        if (mode === "raw" && ds.length) {
          const filesWith = [...new Set(ds.map((d) => d.file))];
          notes = lib.biomeNotes({
            configDir,
            cwd: mirrors[mode].root,
            files: filesWith,
          });
        }
        const noteAt = new Map(
          notes.map((n) => [
            `${n.file}:${n.line}:${n.column}:${n.rule}`,
            n.notes,
          ])
        );
        for (const d of ds) {
          if (/^(?:suppressions\/|parse$)/.test(d.rule)) {
            biomeOther[`${variant}|${mode}|${d.rule}: ${d.message}`] =
              (biomeOther[`${variant}|${mode}|${d.rule}: ${d.message}`] ?? 0) +
              1;
            continue;
          }
          const n =
            noteAt.get(`${d.file}:${d.line}:${d.column}:${d.rule}`) ?? [];
          diags.push({
            column: d.column,
            fix: n.find((x) => /fix:/i.test(x)) ?? null,
            help: n.filter((x) => !/fix:/i.test(x)).join(" ") || null,
            line: d.line,
            linter: "biome",
            message: d.message,
            mode,
            note: null,
            rel: d.file,
            rule: d.rule,
            variant,
          });
        }
      }
    }
    // ESLint: raw from the census; reported reruns files with a directive
    for (const r of rows) {
      for (const m of r.eslint) {
        diags.push({
          column: m.column,
          fix: m.fix ? "fix" : null,
          help: null,
          line: m.line,
          linter: "eslint",
          message: m.message,
          mode: "raw",
          note: null,
          rel: r.rel,
          rule: m.rule,
          variant: m.variant,
        });
      }
    }
    const root = lib.getRepo(name).root;
    const directiveFiles = rels.filter((rel) =>
      /(?:eslint|oxlint)-disable|biome-ignore/.test(
        readFileSync(join(root, rel), "utf8")
      )
    );
    const directiveSet = new Set(directiveFiles);
    for (const r of rows) {
      if (!directiveSet.has(r.rel)) {
        for (const m of r.eslint) {
          diags.push({
            column: m.column,
            fix: m.fix ? "fix" : null,
            help: null,
            line: m.line,
            linter: "eslint",
            message: m.message,
            mode: "reported",
            note: null,
            rel: r.rel,
            rule: m.rule,
            variant: m.variant,
          });
        }
        continue;
      }
      const inv = lib.inventory(
        readFileSync(join(root, r.rel), "utf8"),
        r.rel,
        { inline: true }
      );
      for (const m of inv.eslint ?? []) {
        diags.push({
          column: m.column,
          fix: m.fix ? "fix" : null,
          help: null,
          line: m.line,
          linter: "eslint",
          message: m.message,
          mode: "reported",
          note: null,
          rel: r.rel,
          rule: m.rule,
          variant: m.variant,
        });
      }
    }
    // typed: typescript-eslint with the census program, and tsc's own errors
    const typed = { resolution: null, tsc: {} };
    if (!lib.flag("skip-typed")) {
      const { program, root: progRoot } = lib.repoProgram(name, rels);
      const { Linter } = require(
        require.resolve("eslint", { paths: [lib.CLI] })
      );
      const typedLinter = new Linter({ configType: "flat", cwd: progRoot });
      const typedRules = {
        "@typescript-eslint/consistent-type-exports": "error",
        "@typescript-eslint/consistent-type-imports": "error",
      };
      for (const r of rows) {
        if (!lib.isTsFile(r.rel) || /\.d\.[cm]?ts$/.test(r.rel)) {
          continue;
        }
        const abs = join(progRoot, r.rel);
        const sf = program.getSourceFile(abs);
        if (!sf) {
          continue;
        }
        let messages;
        try {
          messages = typedLinter.verify(
            sf.text,
            [
              {
                files: ["**/*.{ts,tsx,mts,cts}"],
                languageOptions: {
                  parser: lib.tsParser,
                  parserOptions: { programs: [program] },
                },
                linterOptions: {
                  noInlineConfig: true,
                  reportUnusedDisableDirectives: "off",
                },
                plugins: { "@typescript-eslint": lib.tsPlugin },
                rules: typedRules,
              },
            ],
            { filename: abs }
          );
        } catch (error) {
          typed.errors = (typed.errors ?? 0) + 1;
          typed.firstError ??= lib.scrub(String(error.message).slice(0, 200));
          continue;
        }
        for (const m of messages) {
          if (!m.ruleId) {
            typed.fatal = (typed.fatal ?? 0) + 1;
            typed.fatalMessages ??= {};
            const fm = lib.scrub(m.message).slice(0, 160);
            typed.fatalMessages[fm] = (typed.fatalMessages[fm] ?? 0) + 1;
            continue;
          }
          diags.push({
            column: m.column - 1,
            fix: m.fix ? "fix" : null,
            help: null,
            line: m.line,
            linter: "eslint",
            message: m.message,
            mode: "raw",
            note: null,
            rel: r.rel,
            rule: m.ruleId,
            variant: `${m.ruleId.replace("@typescript-eslint/", "")} (typed)`,
          });
        }
      }
      // resolution: import specifiers in measured files that resolve to a file or declaration
      let resolved = 0;
      let total = 0;
      for (const r of rows) {
        for (const imp of r.imports) {
          total += 1;
          if (
            imp.target ||
            imp.specifiers.some((s) => s.source && s.source.is !== "unresolved")
          ) {
            resolved += 1;
          }
        }
      }
      typed.resolution = { resolved, share: lib.pct(resolved, total), total };
      // tsc with verbatimModuleSyntax, and with isolatedModules
      for (const [mode, extra, codes] of [
        [
          "verbatimModuleSyntax",
          { isolatedModules: true, verbatimModuleSyntax: true },
          VERBATIM_CODES,
        ],
        [
          "isolatedModules",
          { isolatedModules: true, verbatimModuleSyntax: false },
          ISOLATED_CODES,
        ],
      ]) {
        const p = lib.repoProgram(name, rels, { extraOptions: extra }).program;
        const byCode = {};
        for (const rel of rels) {
          const sf = p.getSourceFile(join(progRoot, rel));
          if (!sf || !lib.isTsFile(rel)) {
            continue;
          }
          for (const d of p.getSemanticDiagnostics(sf)) {
            if (!codes.has(d.code)) {
              continue;
            }
            const line = sf.getLineAndCharacterOfPosition(d.start).line + 1;
            const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
            byCode[d.code] = (byCode[d.code] ?? 0) + 1;
            diags.push({
              column: sf.getLineAndCharacterOfPosition(d.start).character,
              fix: null,
              help: null,
              line,
              linter: "tsc",
              message: msg.replace(/'[^']+'/g, "'X'"),
              messageFull: msg,
              mode: "raw",
              note: null,
              rel,
              rule: `TS${d.code}`,
              variant: mode,
            });
          }
        }
        typed.tsc[mode] = byCode;
      }
    }
    // join to the inventory
    const items = new Map(); // key -> { rel, kind, item, test, by: { "<linter>|<variant>|<mode>": concept[] } }
    const unjoined = [];
    for (const d of diags) {
      messageBook(d.linter, d.rule, d.message, d.help, d.note);
      const row = byRel.get(d.rel);
      if (!row) {
        unjoined.push({ ...d, why: "file not in the census" });
        continue;
      }
      const { item, kind } = itemAt(row, d.line, d.message);
      if (!item) {
        unjoined.push({
          line: d.line,
          linter: d.linter,
          message: d.message,
          rel: d.rel,
          rule: d.rule,
        });
        continue;
      }
      const concept = conceptOf(d.linter, d.rule, d.message);
      // no-duplicates: the unit is the module imported twice, since linters report different
      // declarations of it
      const key =
        concept === "duplicate" && kind === "import"
          ? `${d.rel}:dup:${item.source}`
          : keyOf(d.rel, kind, item);
      if (!items.has(key)) {
        items.set(key, {
          by: {},
          kind,
          line: item.line,
          rel: d.rel,
          test: testOf.get(d.rel),
        });
      }
      const k = `${d.linter}|${d.variant}|${d.mode}`;
      const entry = items.get(key);
      entry.by[k] ??= [];
      entry.by[k].push(concept);
    }
    // counts per linter, variant, mode and concept (source and tests apart)
    const counts = {};
    for (const d of diags) {
      const t = testOf.get(d.rel) ? "tests" : "source";
      const k = `${d.linter}|${d.variant}|${d.mode}`;
      counts[t] ??= {};
      counts[t][k] ??= {};
      const c = conceptOf(d.linter, d.rule, d.message);
      counts[t][k][c] = (counts[t][k][c] ?? 0) + 1;
    }
    // agreement on the units each pair of rules reports (raw mode)
    const PAIRS = [
      [
        "type-import",
        "eslint|consistent-type-imports|raw",
        "oxlint|consistent-type-imports|raw",
        /^type-import/,
      ],
      [
        "type-import",
        "eslint|consistent-type-imports|raw",
        "biome|useImportType|raw",
        /^type-import/,
      ],
      [
        "type-import",
        "oxlint|consistent-type-imports|raw",
        "biome|useImportType|raw",
        /^type-import/,
      ],
      [
        "import() type",
        "eslint|consistent-type-imports|raw",
        "oxlint|consistent-type-imports|raw",
        /^import\(\)/,
      ],
      [
        "inline-only",
        "eslint|no-import-type-side-effects|raw",
        "oxlint|no-import-type-side-effects|raw",
        /^inline-only/,
      ],
      [
        "style",
        "eslint|consistent-type-specifier-style|raw",
        "oxlint|consistent-type-specifier-style|raw",
        /^style/,
      ],
      [
        "style inline",
        "eslint|consistent-type-specifier-style inline|raw",
        "oxlint|consistent-type-specifier-style inline|raw",
        /^style/,
      ],
      [
        "duplicate",
        "eslint|no-duplicates|raw",
        "oxlint|no-duplicates|raw",
        /^duplicate/,
      ],
      [
        "duplicate prefer-inline",
        "eslint|no-duplicates prefer-inline|raw",
        "oxlint|no-duplicates prefer-inline|raw",
        /^duplicate/,
      ],
      [
        "style vs Biome separatedType",
        "eslint|consistent-type-specifier-style|raw",
        "biome|useImportType separatedType|raw",
        /^style/,
      ],
      [
        "style inline vs Biome inlineType",
        "eslint|consistent-type-specifier-style inline|raw",
        "biome|useImportType inlineType|raw",
        /^style/,
      ],
      [
        "type-export",
        "eslint|consistent-type-exports (typed)|raw",
        "biome|useExportType|raw",
        /^type-export/,
      ],
      [
        "type-export",
        "eslint|consistent-type-exports (typed)|raw",
        "oxlint|consistent-type-exports (type-aware)|raw",
        /^type-export/,
      ],
      [
        "type-import vs TS1484",
        "eslint|consistent-type-imports|raw",
        "tsc|verbatimModuleSyntax|raw",
        /^(?:type-import|TS1484)/,
      ],
      [
        "type-export vs TS1205",
        "eslint|consistent-type-exports (typed)|raw",
        "tsc|isolatedModules|raw",
        /^(?:type-export|TS1205)/,
      ],
      [
        "type-import typed vs untyped",
        "eslint|consistent-type-imports|raw",
        "eslint|consistent-type-imports (typed)|raw",
        /^type-import/,
      ],
    ];
    const agreement = [];
    for (const [concept, a, b, re] of PAIRS) {
      const has = (it, k) => (it.by[k] ?? []).some((c) => re.test(c));
      const res = {
        a,
        b,
        both: 0,
        concept,
        onlyA: 0,
        onlyB: 0,
        reasonsA: {},
        reasonsB: {},
        examplesA: [],
        examplesB: [],
      };
      for (const it of items.values()) {
        if (it.test) {
          continue;
        }
        const ha = has(it, a);
        const hb = has(it, b);
        if (ha && hb) {
          res.both += 1;
        } else if (ha || hb) {
          const row = byRel.get(it.rel);
          const item =
            it.kind === "import"
              ? row.imports.find((x) => x.line === it.line)
              : null;
          const why = item ? describeImport(item) : it.kind;
          const side = ha ? "A" : "B";
          res[`only${side}`] += 1;
          res[`reasons${side}`][why] = (res[`reasons${side}`][why] ?? 0) + 1;
          if (res[`examples${side}`].length < 5) {
            res[`examples${side}`].push({
              permalink: lib.permalink(name, it.rel, it.line),
              text: item?.text ?? null,
              why,
            });
          }
        }
      }
      agreement.push(res);
    }
    const detail = { agreement, items: [...items.values()], unjoined };
    mkdirSync(join(lib.OUT_DIR, "linters"), { recursive: true });
    lib.writeJson(
      join(lib.OUT_DIR, "linters", `${name}.json`),
      lib.scrubDeep(detail)
    );
    out.repos[name] = {
      ...(out.repos[name] ?? {}),
      agreement: agreement.map(({ examplesA, examplesB, ...rest }) => ({
        ...rest,
        examplesA,
        examplesB,
      })),
      counts,
      biomeOther,
      directiveFiles: directiveFiles.length,
      neutralised: mirrors.raw.neutralised,
      typed: { ...typed },
      unjoined: unjoined.length,
      unjoinedExamples: unjoined.slice(0, 5),
    };
    console.log(
      `${name}: ${diags.length} diagnostics, ${items.size} items, ${unjoined.length} unjoined (${Math.round((Date.now() - t0) / 1000)} s)`
    );
  }
  const file = join(lib.RESULTS_DIR, "linters.json");
  const prev =
    lib.selectedRepos(lib.ALL).length < lib.ALL.length && existsSync(file)
      ? lib.readJson(file)
      : null;
  if (prev) {
    out.repos = { ...prev.repos, ...out.repos };
  }
  lib.writeJson(file, lib.scrubDeep(out));
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
