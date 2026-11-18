// Shared definitions for the type-imports scripts (type-imports-*.cjs): how real code imports types,
// what the type-import rules report, and what their fixes change at runtime.
//
// The rules, and what Ultracite does with them (read from packages/cli/config by
// type-imports-rules.cjs, which fails if these settings drift):
//   typescript/consistent-type-imports       Oxlint core "error" (default options); off in the
//                                            nestjs and angular presets
//   typescript/consistent-type-exports       Oxlint core "error"; type-aware (tsgolint), so it only
//                                            runs with `options.typeAware`
//   typescript/no-import-type-side-effects   Oxlint core "error"
//   import/consistent-type-specifier-style   Oxlint core ["error", "prefer-top-level"]
//   import/no-duplicates                     Oxlint core "error"
//   @typescript-eslint/consistent-type-imports, no-import-type-side-effects
//                                            ESLint core (every non-deprecated typescript-eslint
//                                            rule at its defaults); consistent-type-exports needs
//                                            type information, so it's in the type-aware preset
//   import-x/consistent-type-specifier-style ESLint core ["error", "prefer-top-level"]
//   import-x/no-duplicates                   ESLint core (every non-deprecated import-x rule)
//   style/useImportType, style/useExportType Biome core "error" (default options: style "auto");
//                                            useImportType off in the nestjs and angular presets
//
// The inventory runs one ESLint `Linter` pass per file with the TypeScript parser and its scope
// analysis: every import and export declaration, and for every imported binding each reference
// classified the way consistent-type-imports classifies it (value, type, `typeof`, a type key, an
// export), plus whether a type reference sits where `emitDecoratorMetadata` serialises it. The real
// ESLint rules run in the same pass, so their reports join to the inventory exactly. A TypeScript
// program per repo (import-cycles-lib.cjs's resolution) adds what each binding is at its source (a
// value, a type or both), where each specifier resolves, and whether the target module has
// top-level side effects.
//
// Read-only with respect to the clones: files are parsed, never run. Linters, fix passes and
// compilers run on copies under TMP.
"use strict";

// The React codebases from the accessibility post are a separate set. Must be set before
// collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { builtinModules } = require("node:module");
const { tmpdir } = require("node:os");
const { dirname, join, relative, resolve, sep } = require("node:path");
const { pathToFileURL } = require("node:url");

const nt = require("./nested-ternaries-lib.cjs");
const ic = require("./import-cycles-lib.cjs");

const { dc } = nt;
const { ts } = dc;
const HERE = resolve(__dirname, "..");
const TOPIC = "type-imports";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
const HISTORY_DIR = join(HERE, "repos", "history");
// Copies the linters, fix passes and compilers work on. Ultracite's presets ignore `**/out`.
const TMP =
  process.env.TYPE_IMPORTS_TMP ??
  join(tmpdir(), "ultracite-research-type-imports");
const { CLI, ULTRACITE } = nt;
const BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

// ── tools ──────────────────────────────────────────────────────────────
const fromCli = (name) => require(require.resolve(name, { paths: [CLI] }));
const tsPluginModule = fromCli("@typescript-eslint/eslint-plugin");
const tsPlugin = tsPluginModule.default ?? tsPluginModule;
const importXModule = fromCli("eslint-plugin-import-x");
const importX = importXModule.importX ?? importXModule.default ?? importXModule;
const unusedImportsModule = fromCli("eslint-plugin-unused-imports");
const unusedImports = unusedImportsModule.default ?? unusedImportsModule;

// Compilers that work one file at a time, already in this repo's Bun store (dependencies of the
// docs site and the CLI's dev tools). Nothing is installed.
const STORE = join(ULTRACITE, "node_modules/.bun");
const storePackage = (prefix, name) => {
  if (!existsSync(STORE)) {
    return null;
  }
  const hit = readdirSync(STORE)
    .filter((d) => d.startsWith(`${prefix}@`))
    .sort()
    .at(-1);
  if (!hit) {
    return null;
  }
  const dir = join(STORE, hit, "node_modules", name);
  return existsSync(dir) ? dir : null;
};
const ESBUILD_DIR = storePackage("esbuild", "esbuild");
const ROLLDOWN_DIR = storePackage("rolldown", "rolldown");
const SUCRASE_DIR = storePackage("sucrase", "sucrase");
const versionAt = (dir) =>
  dir
    ? JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version
    : null;
let esbuild = null;
let rolldownExperimental = null;
let sucrase = null;
const loadCompilers = async () => {
  if (ESBUILD_DIR && !esbuild) {
    esbuild = require(ESBUILD_DIR);
  }
  if (ROLLDOWN_DIR && !rolldownExperimental) {
    rolldownExperimental = await import(
      pathToFileURL(join(ROLLDOWN_DIR, "dist/experimental-index.mjs")).href
    );
  }
  if (SUCRASE_DIR && !sucrase) {
    sucrase = require(SUCRASE_DIR);
  }
};
const bunVersion = () => {
  const r = nt.spawnSync("bun", ["--version"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};
const toolVersions = () => ({
  ...nt.toolVersions(),
  "eslint-plugin-import-x": dc.versionOf("eslint-plugin-import-x", CLI),
  "eslint-plugin-unused-imports": dc.versionOf(
    "eslint-plugin-unused-imports",
    CLI
  ),
  typescript: ts.version,
  "esbuild (Bun store)": versionAt(ESBUILD_DIR),
  "rolldown (Bun store; its Oxc transformer)": versionAt(ROLLDOWN_DIR),
  "sucrase (Bun store)": versionAt(SUCRASE_DIR),
  bun: bunVersion(),
  "node type stripping": process.features?.typescript ?? null,
});

// ── the rules ──────────────────────────────────────────────────────────
// Oxlint names, as the census and the single-rule runs use them.
const OXLINT_RULES = [
  "typescript/consistent-type-imports",
  "typescript/consistent-type-exports",
  "typescript/no-import-type-side-effects",
  "import/consistent-type-specifier-style",
  "import/no-duplicates",
];
// ESLint rules the census pass runs, by variant name. The first set is Ultracite's (core).
const ESLINT_VARIANTS = {
  "consistent-type-imports": {
    "@typescript-eslint/consistent-type-imports": "error",
  },
  "consistent-type-imports inline": {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { fixStyle: "inline-type-imports" },
    ],
  },
  "no-import-type-side-effects": {
    "@typescript-eslint/no-import-type-side-effects": "error",
  },
  "consistent-type-specifier-style": {
    "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
  },
  "consistent-type-specifier-style inline": {
    "import-x/consistent-type-specifier-style": ["error", "prefer-inline"],
  },
  "no-duplicates": { "import-x/no-duplicates": "error" },
  "no-duplicates prefer-inline": {
    "import-x/no-duplicates": ["error", { "prefer-inline": true }],
  },
};
const ULTRACITE_ESLINT = [
  "consistent-type-imports",
  "no-import-type-side-effects",
  "consistent-type-specifier-style",
  "no-duplicates",
];
// Biome rules and option variants (each runs alone).
const BIOME_VARIANTS = {
  useImportType: { style: { useImportType: "error" } },
  "useImportType inlineType": {
    style: {
      useImportType: { level: "error", options: { style: "inlineType" } },
    },
  },
  "useImportType separatedType": {
    style: {
      useImportType: { level: "error", options: { style: "separatedType" } },
    },
  },
  useExportType: { style: { useExportType: "error" } },
  noUnusedImports: { correctness: { noUnusedImports: "error" } },
};
const OXLINT_VARIANTS = {
  "consistent-type-imports": {
    "typescript/consistent-type-imports": "error",
  },
  "consistent-type-imports inline": {
    "typescript/consistent-type-imports": [
      "error",
      { fixStyle: "inline-type-imports" },
    ],
  },
  "no-import-type-side-effects": {
    "typescript/no-import-type-side-effects": "error",
  },
  "consistent-type-specifier-style": {
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
  },
  "consistent-type-specifier-style inline": {
    "import/consistent-type-specifier-style": ["error", "prefer-inline"],
  },
  "no-duplicates": { "import/no-duplicates": "error" },
  "no-duplicates prefer-inline": {
    "import/no-duplicates": ["error", { preferInline: true }],
  },
};

// ── reference classification ───────────────────────────────────────────
// Exactly typescript-eslint's consistent-type-imports (8.72.1, `onlyHasTypeReferences`), with the
// reason kept: "export" (an export specifier, `export default`, `export =`: keeps the import's
// kind), "typeof" (inside a type query), "typeKey" (a computed key of a type literal's property),
// "type", "value", "other" (neither a value nor a type reference).
const classifyRef = (ref) => {
  const id = ref.identifier;
  const p = id.parent;
  if (
    (p.type === "ExportSpecifier" ||
      p.type === "ExportDefaultDeclaration" ||
      p.type === "TSExportAssignment") &&
    ref.isValueReference &&
    ref.isTypeReference
  ) {
    return "export";
  }
  if (ref.isValueReference) {
    let parent = p;
    let child = id;
    while (parent) {
      switch (parent.type) {
        case "TSTypeQuery":
          return "typeof";
        case "TSQualifiedName":
          if (parent.left !== child) {
            return "value";
          }
          child = parent;
          parent = parent.parent;
          continue;
        case "TSPropertySignature":
          return parent.key === child ? "typeKey" : "value";
        case "MemberExpression":
          if (parent.object !== child) {
            return "value";
          }
          child = parent;
          parent = parent.parent;
          continue;
        default:
          return "value";
      }
    }
    return "value";
  }
  return ref.isTypeReference ? "type" : "other";
};
const TYPE_LIKE = new Set(["type", "typeof", "typeKey"]);
const isJsxRef = (id) =>
  /^JSX/.test(id.parent?.type ?? "") || id.type === "JSXIdentifier";

// Where `emitDecoratorMetadata` serialises a type: a parameter of a decorated class's constructor,
// of a method that is decorated or has a decorated parameter, a decorated property's or
// accessor's type, a decorated method's return type. TypeScript writes the runtime value of the
// annotation's type reference (its root name for `A.B`), so only a type reference at the top of
// the annotation (or in a union with null/undefined) puts the imported value in the metadata.
const NULLISH_TYPES = new Set([
  "TSNullKeyword",
  "TSUndefinedKeyword",
  "TSVoidKeyword",
]);
// A union with null or undefined serialises to the class only without strictNullChecks (TypeScript
// keeps those members under strictNullChecks, and the union becomes Object); `withUnions` decides.
const serialisedRoot = (typeNode, withUnions = false) => {
  let t = typeNode;
  if (t?.type === "TSUnionType") {
    if (!withUnions) {
      return null;
    }
    const rest = t.types.filter(
      (m) =>
        !NULLISH_TYPES.has(m.type) &&
        !(m.type === "TSLiteralType" && m.literal?.value === null)
    );
    if (rest.length !== 1) {
      return null;
    }
    [t] = rest;
  }
  if (t?.type !== "TSTypeReference") {
    return null;
  }
  let n = t.typeName;
  while (n.type === "TSQualifiedName") {
    n = n.left;
  }
  return n.type === "Identifier" ? n : null;
};
const hasDecorators = (n) => (n?.decorators?.length ?? 0) > 0;
// For a type-annotation owner, the metadata slot it fills (or null).
const metadataSlot = (owner) => {
  // owner: the node whose typeAnnotation holds the reference
  let param = owner;
  if (
    param.parent?.type === "AssignmentPattern" &&
    param.parent.left === param
  ) {
    param = param.parent;
  }
  if (param.parent?.type === "TSParameterProperty") {
    param = param.parent;
  }
  const fn = param.parent;
  if (
    fn &&
    (fn.type === "FunctionExpression" ||
      fn.type === "TSEmptyBodyFunctionExpression") &&
    fn.params?.includes(param)
  ) {
    const method = fn.parent;
    if (method?.type !== "MethodDefinition") {
      return null;
    }
    const klass = method.parent?.parent;
    const paramDecorated = fn.params.some(
      (q) => hasDecorators(q) || hasDecorators(q.parameter)
    );
    if (method.kind === "constructor") {
      return hasDecorators(klass) || paramDecorated
        ? "design:paramtypes (constructor)"
        : null;
    }
    return hasDecorators(method) || paramDecorated
      ? "design:paramtypes (method)"
      : null;
  }
  if (
    (owner.type === "PropertyDefinition" ||
      owner.type === "AccessorProperty") &&
    hasDecorators(owner)
  ) {
    return "design:type (property)";
  }
  if (
    owner.type === "FunctionExpression" &&
    owner.parent?.type === "MethodDefinition" &&
    hasDecorators(owner.parent)
  ) {
    return "design:returntype (method)";
  }
  return null;
};
// If this type reference is written into decorator metadata, the slot; else null.
const metadataOf = (id) => {
  // climb to the TSTypeAnnotation
  let n = id;
  while (n.parent && n.parent.type !== "TSTypeAnnotation") {
    n = n.parent;
    if (/Statement|Declaration$|^Program$/.test(n.type)) {
      return null;
    }
  }
  const annotation = n.parent;
  if (!annotation) {
    return null;
  }
  const root = serialisedRoot(annotation.typeAnnotation);
  if (root !== id) {
    return null;
  }
  const owner = annotation.parent;
  if (!owner) {
    return null;
  }
  if (owner.type === "FunctionExpression" && owner.returnType === annotation) {
    return metadataSlot(owner);
  }
  return metadataSlot(owner);
};

// ── the census rule ────────────────────────────────────────────────────
const lineCol = (node) => ({
  column: node.loc.start.column,
  endLine: node.loc.end.line,
  line: node.loc.start.line,
});
const nameOf = (n) =>
  n ? (n.type === "Identifier" ? n.name : String(n.value)) : null;
const specifierKind = (s) =>
  s.type === "ImportDefaultSpecifier"
    ? "default"
    : s.type === "ImportNamespaceSpecifier"
      ? "namespace"
      : "named";
// The import's shape, by its specifiers and type markers.
const formOf = (node) => {
  const specs = node.specifiers;
  if (node.importKind === "type") {
    return "type";
  }
  if (specs.length === 0) {
    return "side-effect";
  }
  const named = specs.filter((s) => s.type === "ImportSpecifier");
  const inline = named.filter((s) => s.importKind === "type");
  if (inline.length === 0) {
    return "value";
  }
  if (inline.length === specs.length) {
    return "inline";
  }
  return "mixed";
};
const usageOf = (counts) => {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return "unused";
  }
  const typeLike = counts.type + counts.typeof + counts.typeKey;
  if (typeLike === total) {
    return "type";
  }
  if (counts.export === total) {
    return "export";
  }
  if (counts.export > 0 && counts.value === 0 && counts.other === 0) {
    return "export+type";
  }
  return typeLike > 0 ? "both" : "value";
};

const makeCensusRule = (sink) => ({
  create(context) {
    const sc = context.sourceCode;
    const importTypes = [];
    const dynamicImports = [];
    const decorators = [];
    const requires = [];
    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments[0]?.type === "Literal" &&
          typeof node.arguments[0].value === "string"
        ) {
          requires.push({ ...lineCol(node), source: node.arguments[0].value });
        }
      },
      Decorator(node) {
        decorators.push({ ...lineCol(node), on: node.parent.type });
      },
      ImportExpression(node) {
        dynamicImports.push({
          ...lineCol(node),
          source:
            node.source.type === "Literal" ? String(node.source.value) : null,
        });
      },
      TSImportType(node) {
        const arg = node.argument;
        const literal =
          arg?.type === "TSLiteralType" ? arg.literal : (arg ?? null);
        importTypes.push({
          ...lineCol(node),
          qualifier: Boolean(node.qualifier),
          source:
            literal && typeof literal.value === "string" ? literal.value : null,
          typeof: node.parent?.type === "TSTypeQuery",
        });
      },
      "Program:exit"(program) {
        const imports = [];
        const exports = [];
        const importEquals = [];
        const declarations = {
          class: 0,
          decoratedClass: 0,
          enum: 0,
          constEnum: 0,
          exportedType: 0,
          exportedValue: 0,
          interface: 0,
          namespace: 0,
          typeAlias: 0,
        };
        const specRow = (spec, decl) => {
          const [variable] = sc.getDeclaredVariables(spec);
          const counts = {
            export: 0,
            other: 0,
            type: 0,
            typeKey: 0,
            typeof: 0,
            value: 0,
          };
          let jsx = 0;
          const metadata = [];
          const valueLines = [];
          for (const ref of variable?.references ?? []) {
            const k = classifyRef(ref);
            counts[k] += 1;
            if (k === "value" && isJsxRef(ref.identifier)) {
              jsx += 1;
            }
            if (k === "value" && valueLines.length < 3) {
              valueLines.push(ref.identifier.loc.start.line);
            }
            if (k === "type") {
              const slot = metadataOf(ref.identifier);
              if (slot) {
                metadata.push({ line: ref.identifier.loc.start.line, slot });
              }
            }
          }
          return {
            imported:
              spec.type === "ImportSpecifier" ? nameOf(spec.imported) : null,
            inlineType:
              spec.type === "ImportSpecifier" && spec.importKind === "type",
            jsx,
            kind: specifierKind(spec),
            line: spec.loc.start.line,
            local: spec.local.name,
            metadata,
            refs: counts,
            usage: usageOf(counts),
            valueLines,
            declTypeOnly: decl.importKind === "type",
          };
        };
        for (const st of program.body) {
          if (st.type === "ImportDeclaration") {
            imports.push({
              ...lineCol(st),
              attributes: (st.attributes ?? []).length,
              emptyBraces:
                st.specifiers.length === 0 &&
                /\{\s*\}/.test(
                  sc.getText(st).slice(0, sc.getText(st).indexOf(st.source.raw))
                ),
              form: formOf(st),
              importKind: st.importKind ?? "value",
              source: String(st.source.value),
              specifiers: st.specifiers.map((s) => specRow(s, st)),
              text: sc.getText(st).length <= 400 ? sc.getText(st) : null,
            });
          } else if (st.type === "TSImportEqualsDeclaration") {
            const ref = st.moduleReference;
            const [variable] = sc.getDeclaredVariables(st);
            const counts = {
              export: 0,
              other: 0,
              type: 0,
              typeKey: 0,
              typeof: 0,
              value: 0,
            };
            for (const r of variable?.references ?? []) {
              counts[classifyRef(r)] += 1;
            }
            importEquals.push({
              ...lineCol(st),
              importKind: st.importKind ?? "value",
              isExport: Boolean(st.isExport),
              kind:
                ref.type === "TSExternalModuleReference" ? "require" : "alias",
              local: st.id.name,
              refs: counts,
              source:
                ref.type === "TSExternalModuleReference"
                  ? String(ref.expression.value)
                  : null,
              usage: usageOf(counts),
            });
          } else if (st.type === "ExportAllDeclaration") {
            exports.push({
              ...lineCol(st),
              exportKind: st.exportKind ?? "value",
              kind: st.exported ? "star-as" : "star",
              source: String(st.source.value),
            });
          } else if (st.type === "ExportNamedDeclaration") {
            const d = st.declaration;
            if (d) {
              const typeDecl =
                d.type === "TSTypeAliasDeclaration" ||
                d.type === "TSInterfaceDeclaration" ||
                (d.type === "TSModuleDeclaration" && d.declare) ||
                d.declare === true;
              if (typeDecl) {
                declarations.exportedType += 1;
              } else {
                declarations.exportedValue += 1;
              }
              continue;
            }
            const scope = sc.getScope(st);
            const specs = st.specifiers.map((s) => {
              const local = nameOf(s.local);
              let binding = null;
              if (!st.source) {
                let variable = null;
                for (let sp = scope; sp && !variable; sp = sp.upper) {
                  variable = sp.set.get(local) ?? null;
                }
                const def = variable?.defs?.[0];
                if (def) {
                  if (def.type === "ImportBinding") {
                    const imp = def.parent;
                    binding = {
                      from: String(imp.source.value),
                      kind: "import",
                      typeOnly:
                        imp.importKind === "type" ||
                        def.node.importKind === "type",
                    };
                  } else {
                    const typeDef =
                      def.type === "Type" ||
                      def.node?.type === "TSInterfaceDeclaration" ||
                      def.node?.type === "TSTypeAliasDeclaration";
                    // a name that is both a value and a type (class, enum, merged declarations)
                    const valueDef = variable.defs.some(
                      (x) =>
                        x.type !== "Type" &&
                        x.node?.type !== "TSInterfaceDeclaration" &&
                        x.node?.type !== "TSTypeAliasDeclaration"
                    );
                    binding = {
                      kind: valueDef ? "value" : typeDef ? "type" : def.type,
                    };
                  }
                } else {
                  binding = { kind: "global-or-unknown" };
                }
              }
              return {
                binding,
                exportKind: s.exportKind ?? "value",
                local,
              };
            });
            exports.push({
              ...lineCol(st),
              exportKind: st.exportKind ?? "value",
              kind: st.source ? "named-from" : "named-local",
              source: st.source ? String(st.source.value) : null,
              specifiers: specs,
            });
          }
        }
        // declarations anywhere at top level (exported or not)
        const visitDecl = (d) => {
          if (!d) {
            return;
          }
          if (d.type === "ClassDeclaration" || d.type === "ClassExpression") {
            declarations.class += 1;
            if (
              hasDecorators(d) ||
              d.body.body.some(
                (m) =>
                  hasDecorators(m) ||
                  (m.value?.params ?? []).some(
                    (q) => hasDecorators(q) || hasDecorators(q.parameter)
                  )
              )
            ) {
              declarations.decoratedClass += 1;
            }
          } else if (d.type === "TSEnumDeclaration") {
            declarations.enum += 1;
            if (d.const) {
              declarations.constEnum += 1;
            }
          } else if (d.type === "TSInterfaceDeclaration") {
            declarations.interface += 1;
          } else if (d.type === "TSTypeAliasDeclaration") {
            declarations.typeAlias += 1;
          } else if (d.type === "TSModuleDeclaration") {
            declarations.namespace += 1;
          }
        };
        for (const st of program.body) {
          visitDecl(
            st.type === "ExportNamedDeclaration" ||
              st.type === "ExportDefaultDeclaration"
              ? st.declaration
              : st
          );
        }
        sink.result = {
          declarations,
          decorators,
          dynamicImports,
          exports,
          importEquals,
          importTypes,
          imports,
          lines: sc.lines.length,
          requires,
        };
      },
    };
  },
  meta: { schema: [], type: "problem" },
});

// ── the ESLint pass ────────────────────────────────────────────────────
const { Linter } = require(require.resolve("eslint", { paths: [CLI] }));
const linter = new Linter({ configType: "flat" });
const isTsFile = (rel) => /\.[cm]?tsx?$/.test(rel);
// `variants`: names from ESLINT_VARIANTS. The rules run in separate passes when two variants set the
// same rule (an ESLint config can't run one rule twice), each in its own Linter.verify.
const variantGroups = (variants) => {
  const groups = [];
  for (const v of variants) {
    const rules = ESLINT_VARIANTS[v];
    let g = groups.find((x) =>
      Object.keys(rules).every((r) => !(r in x.rules))
    );
    if (!g) {
      g = { names: [], rules: {} };
      groups.push(g);
    }
    g.names.push(v);
    Object.assign(g.rules, rules);
  }
  return groups;
};
const baseConfig = (rel, { inline, rules, census, sink, parserOptions }) => [
  {
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      parser: nt.tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: /\.[jt]sx$/.test(rel) || /\.[cm]?js$/.test(rel) },
        ...parserOptions,
      },
      sourceType: rel.endsWith(".cjs") ? "commonjs" : "module",
    },
    linterOptions: {
      noInlineConfig: !inline,
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      ...(census
        ? { census: { rules: { census: makeCensusRule(sink) } } }
        : {}),
      "import-x": importX,
    },
    rules: { ...(census ? { "census/census": "error" } : {}), ...rules },
    settings: {
      // no resolver: import-x/no-duplicates then compares the specifier strings (corpus files are
      // linted from mirrors without node_modules, where a resolver finds nothing either)
      "import-x/resolver-next": [],
    },
  },
];
const eslintMessage = (m, variant) => ({
  column: m.column - 1,
  endColumn: m.endColumn ? m.endColumn - 1 : null,
  endLine: m.endLine ?? null,
  fix: m.fix ? { range: m.fix.range, text: m.fix.text } : null,
  line: m.line,
  message: m.message,
  messageId: m.messageId ?? null,
  rule: m.ruleId,
  suggestions: (m.suggestions ?? []).map((s) => s.desc),
  variant,
});
// The typescript-eslint rules apply to TypeScript files only (as in Ultracite's ESLint preset); the
// import-x rules to every file.
const rulesFor = (rel, rules) =>
  Object.fromEntries(
    Object.entries(rules).filter(
      ([r]) => isTsFile(rel) || !r.startsWith("@typescript-eslint/")
    )
  );
// One file: the inventory and every report of the chosen variants. Returns { ...inventory,
// eslint: [...] } or { error }.
const inventory = (
  text,
  rel,
  { variants = Object.keys(ESLINT_VARIANTS), inline = false } = {}
) => {
  const sink = {};
  const eslint = [];
  const groups = variantGroups(variants);
  if (groups.length === 0) {
    // the census alone
    groups.push({ names: [], rules: {} });
  }
  try {
    groups.forEach((g, i) => {
      const messages = linter.verify(
        text,
        baseConfig(rel, {
          census: i === 0,
          inline,
          rules: rulesFor(rel, g.rules),
          sink,
        }),
        { filename: rel.replace(/^.*\//, "") }
      );
      const fatal = messages.find((m) => m.fatal);
      if (fatal) {
        throw new Error(fatal.message);
      }
      for (const m of messages) {
        if (
          !m.ruleId ||
          m.ruleId === "census/census" ||
          /^Definition for rule '.*' was not found\.$/.test(m.message)
        ) {
          continue;
        }
        const variant = g.names.find((n) => m.ruleId in ESLINT_VARIANTS[n]);
        eslint.push(eslintMessage(m, variant));
      }
    });
  } catch (error) {
    return { error: String(error?.message ?? error).slice(0, 300) };
  }
  if (!sink.result) {
    return { error: "no result" };
  }
  return { ...sink.result, eslint };
};
// ESLint with given rules on one file, with optional parser options (typed runs pass `programs`).
const lintText = (text, rel, rules, { parserOptions, inline = false } = {}) =>
  linter
    .verify(
      text,
      baseConfig(rel, {
        census: false,
        inline,
        parserOptions,
        rules: rulesFor(rel, rules),
      }),
      { filename: rel }
    )
    // a directive's "has no effect because you have 'noInlineConfig'" notice isn't a report
    .filter((m) => m.ruleId || !/noInlineConfig/.test(m.message))
    .map((m) => eslintMessage(m, null));
// ESLint's fix loop (up to 10 passes, as `eslint --fix`) with given rules on one file.
const fixText = (text, rel, rules, { parserOptions } = {}) => {
  const r = linter.verifyAndFix(
    text,
    baseConfig(rel, {
      census: false,
      inline: false,
      parserOptions,
      rules: rulesFor(rel, rules),
    }),
    { filename: rel }
  );
  return {
    fixed: r.fixed,
    messages: r.messages.map((m) => eslintMessage(m, null)),
    output: r.output,
  };
};

// ── tsconfig settings ──────────────────────────────────────────────────
const FLAGS = [
  "isolatedModules",
  "verbatimModuleSyntax",
  "importsNotUsedAsValues",
  "preserveValueImports",
  "emitDecoratorMetadata",
  "experimentalDecorators",
  "module",
  "moduleResolution",
  "jsx",
];
const stripJsonc = (text) => {
  // strings survive; comments and trailing commas go
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        j += text[j] === "\\" ? 2 : 1;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") {
        i += 1;
      }
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 2;
      if (i === 1) {
        break;
      }
    } else {
      out += c;
      i += 1;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
};
// The chain of tsconfig files from `file` through `extends`, each with its raw compilerOptions.
// Package names are resolved to workspace packages in the clone; a base outside the clone is
// recorded as missing.
const tsconfigChain = (file, root, packages = ic.findPackages(root)) => {
  const chain = [];
  const seen = new Set();
  const visit = (f) => {
    if (seen.has(f)) {
      return;
    }
    seen.add(f);
    let json;
    try {
      json = stripJsonc(readFileSync(f, "utf8"));
    } catch (error) {
      chain.push({
        error: String(error.message).slice(0, 120),
        file: relative(root, f),
      });
      return;
    }
    const ext = [json.extends].flat().filter(Boolean);
    // TypeScript applies bases first, then the file itself
    for (const e of ext) {
      let target = null;
      if (e.startsWith(".")) {
        target = resolve(dirname(f), e);
        if (!existsSync(target) && existsSync(`${target}.json`)) {
          target = `${target}.json`;
        }
      } else {
        const parts = e.startsWith("@")
          ? e.split("/").slice(0, 2)
          : e.split("/").slice(0, 1);
        const pkg = packages.find((p) => p.name === parts.join("/"));
        if (pkg) {
          const sub = e.slice(parts.join("/").length + 1) || "tsconfig.json";
          target = join(pkg.root, sub);
          if (!existsSync(target) && existsSync(`${target}.json`)) {
            target = `${target}.json`;
          }
        }
      }
      if (target && existsSync(target)) {
        visit(target);
      } else {
        chain.push({ file: null, missing: e });
      }
    }
    const co = json.compilerOptions ?? {};
    chain.push({
      file: relative(root, f).split(sep).join("/"),
      flags: Object.fromEntries(
        FLAGS.filter((k) => k in co).map((k) => [k, co[k]])
      ),
    });
  };
  visit(file);
  return chain;
};
const effectiveFlags = (chain) => {
  const out = {};
  for (const link of chain) {
    Object.assign(out, link.flags ?? {});
  }
  return out;
};
// The nearest tsconfig.json above a file, inside the clone.
const nearestTsconfig = (root, rel) => {
  let dir = dirname(join(root, rel));
  while (dir.startsWith(root)) {
    const f = join(dir, "tsconfig.json");
    if (existsSync(f)) {
      return f;
    }
    if (dir === root) {
      break;
    }
    dir = dirname(dir);
  }
  return null;
};

// ── side effects of a module (TypeScript AST) ──────────────────────────
// A top-level statement other than a declaration (imports, exports, functions, classes, variables,
// types, interfaces, enums, namespaces) is a side effect. Declarations whose evaluation runs code
// (a call or `new` outside a function, a decorated class, a class static block) are counted apart,
// as are side-effect imports (`import 'x'`), which pass the effect on.
const isFn = (n) =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) ||
  ts.isGetAccessorDeclaration(n) ||
  ts.isSetAccessorDeclaration(n) ||
  ts.isConstructorDeclaration(n);
const runsCode = (node) => {
  let hit = null;
  const visit = (n) => {
    if (hit) {
      return;
    }
    if (isFn(n) || ts.isTypeNode(n)) {
      return;
    }
    if (ts.isClassLike(n)) {
      if (ts.getDecorators?.(n)?.length) {
        hit = "decorated class";
        return;
      }
      for (const m of n.members) {
        if (ts.isClassStaticBlockDeclaration(m)) {
          hit = "static block";
          return;
        }
        if (
          ts.isPropertyDeclaration(m) &&
          m.initializer &&
          ts.getCombinedModifierFlags(m) & ts.ModifierFlags.Static
        ) {
          visit(m.initializer);
        }
        if (ts.getDecorators?.(m)?.length) {
          hit = "decorated member";
          return;
        }
      }
      if (n.heritageClauses) {
        for (const h of n.heritageClauses) {
          for (const t of h.types) {
            visit(t.expression);
          }
        }
      }
      return;
    }
    if (
      ts.isCallExpression(n) ||
      ts.isNewExpression(n) ||
      ts.isTaggedTemplateExpression(n)
    ) {
      hit = ts.isNewExpression(n) ? "new" : "call";
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return hit;
};
const sideEffectsOf = (sf) => {
  const out = {
    declarationsRunningCode: 0,
    examples: [],
    sideEffectImports: 0,
    statements: 0,
  };
  const note = (st, kind) => {
    if (out.examples.length < 3) {
      out.examples.push({
        kind,
        line: sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1,
        text: st.getText(sf).replace(/\s+/g, " ").slice(0, 100),
      });
    }
  };
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      if (!st.importClause) {
        out.sideEffectImports += 1;
      }
      continue;
    }
    if (
      ts.isInterfaceDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) ||
      ts.isImportEqualsDeclaration(st) ||
      ts.isExportDeclaration(st) ||
      (ts.isModuleDeclaration(st) &&
        (ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Ambient ||
          !ts.isModuleBlock(st.body ?? {}) ||
          ts.getModuleInstanceState?.(st) === 0))
    ) {
      continue;
    }
    if (ts.isExportAssignment(st)) {
      const why = runsCode(st.expression);
      if (why) {
        out.declarationsRunningCode += 1;
        note(st, why);
      }
      continue;
    }
    if (
      ts.isFunctionDeclaration(st) ||
      ts.isEnumDeclaration(st) ||
      ts.isClassDeclaration(st) ||
      ts.isVariableStatement(st) ||
      ts.isModuleDeclaration(st)
    ) {
      if (
        ts.isVariableStatement(st) &&
        ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Ambient
      ) {
        continue;
      }
      const why = ts.isFunctionDeclaration(st) ? null : runsCode(st);
      if (why) {
        out.declarationsRunningCode += 1;
        note(st, why);
      }
      continue;
    }
    if (ts.isEmptyStatement(st)) {
      continue;
    }
    // a directive prologue ("use client") is an expression statement, but no effect
    if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) {
      continue;
    }
    out.statements += 1;
    note(st, ts.SyntaxKind[st.kind]);
  }
  out.label =
    out.statements > 0
      ? "statements"
      : out.declarationsRunningCode > 0
        ? "declarations-run-code"
        : out.sideEffectImports > 0
          ? "side-effect-imports"
          : "none";
  return out;
};

// ── what a compiled file still imports ─────────────────────────────────
// Static imports, export-from statements and top-level require() calls in compiled JavaScript, in
// order: { kind, specifier, names }.
const importsOfJs = (js, file = "out.js") => {
  const sf = ts.createSourceFile(
    file,
    js,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS
  );
  const out = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const c = st.importClause;
      const names = [];
      if (c?.name) {
        names.push("default");
      }
      if (c?.namedBindings) {
        if (ts.isNamespaceImport(c.namedBindings)) {
          names.push("*");
        } else {
          for (const e of c.namedBindings.elements) {
            names.push((e.propertyName ?? e.name).text);
          }
        }
      }
      out.push({
        kind: names.length ? "import" : "side-effect",
        names,
        specifier: st.moduleSpecifier.text,
      });
    } else if (
      ts.isExportDeclaration(st) &&
      st.moduleSpecifier &&
      ts.isStringLiteral(st.moduleSpecifier)
    ) {
      const names =
        st.exportClause && ts.isNamedExports(st.exportClause)
          ? st.exportClause.elements.map((e) => (e.propertyName ?? e.name).text)
          : ["*"];
      out.push({
        kind: "export-from",
        names,
        specifier: st.moduleSpecifier.text,
      });
    }
  }
  const visit = (n) => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === "require" &&
      n.arguments[0] &&
      ts.isStringLiteralLike(n.arguments[0])
    ) {
      out.push({ kind: "require", names: [], specifier: n.arguments[0].text });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
};
// The specifiers a compiled file loads at runtime, as a sorted multiset string list.
const loadedSpecifiers = (rows) => rows.map((r) => r.specifier).sort();

// Compile one TypeScript file with a per-file compiler. `flags` are the tsconfig flags that change
// import elision (verbatimModuleSyntax, isolatedModules, emitDecoratorMetadata,
// experimentalDecorators). Returns { code, error }.
const isJsx = (file) => /x$/.test(file);
const compileOne = (tool, text, file, flags = {}) => {
  try {
    if (tool === "transpileModule") {
      const r = ts.transpileModule(text, {
        compilerOptions: {
          emitDecoratorMetadata: Boolean(flags.emitDecoratorMetadata),
          experimentalDecorators: Boolean(flags.experimentalDecorators),
          isolatedModules: Boolean(flags.isolatedModules),
          jsx: ts.JsxEmit.Preserve,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ESNext,
          useDefineForClassFields: true,
          verbatimModuleSyntax: Boolean(flags.verbatimModuleSyntax),
        },
        fileName: file,
        reportDiagnostics: true,
      });
      return {
        code: r.outputText,
        diagnostics: (r.diagnostics ?? []).map((d) => ({
          code: d.code,
          message: ts.flattenDiagnosticMessageText(d.messageText, " "),
        })),
      };
    }
    if (tool === "esbuild") {
      const r = esbuild.transformSync(text, {
        format: "esm",
        jsx: "preserve",
        loader: isJsx(file) ? "tsx" : "ts",
        sourcefile: file,
        target: "esnext",
        tsconfigRaw: {
          compilerOptions: {
            experimentalDecorators: Boolean(flags.experimentalDecorators),
            verbatimModuleSyntax: Boolean(flags.verbatimModuleSyntax),
          },
        },
      });
      return { code: r.code, diagnostics: r.warnings.map((w) => w.text) };
    }
    if (tool === "oxc") {
      const r = rolldownExperimental.transformSync(file, text, {
        jsx: "preserve",
        lang: isJsx(file) ? "tsx" : "ts",
        sourceType: "module",
        typescript: {
          onlyRemoveTypeImports: Boolean(flags.verbatimModuleSyntax),
        },
        ...(flags.experimentalDecorators
          ? {
              decorator: {
                emitDecoratorMetadata: Boolean(flags.emitDecoratorMetadata),
                legacy: true,
              },
            }
          : {}),
      });
      if (r.errors?.length) {
        return {
          code: r.code ?? null,
          error: r.errors.map((e) => e.message ?? String(e)).join("; "),
        };
      }
      return { code: r.code };
    }
    if (tool === "sucrase") {
      const r = sucrase.transform(text, {
        disableESTransforms: true,
        filePath: file,
        keepUnusedImports: Boolean(flags.verbatimModuleSyntax),
        transforms: isJsx(file) ? ["typescript", "jsx"] : ["typescript"],
        jsxRuntime: "preserve",
      });
      return { code: r.code };
    }
    if (tool === "node-strip") {
      // module.stripTypeScriptTypes is Node's own type stripper (the one `node file.ts` runs)
      const { stripTypeScriptTypes } = require("node:module");
      const warn = process.emitWarning;
      process.emitWarning = () => {};
      try {
        return { code: stripTypeScriptTypes(text, { mode: "strip" }) };
      } finally {
        process.emitWarning = warn;
      }
    }
    throw new Error(`unknown tool ${tool}`);
  } catch (error) {
    return {
      code: null,
      error: String(error?.message ?? error)
        .split("\n")[0]
        .slice(0, 300),
    };
  }
};
const PER_FILE_TOOLS = [
  "transpileModule",
  "esbuild",
  "oxc",
  "sucrase",
  "node-strip",
];
// Bun's transpiler (what `bun file.ts` and `bun build --no-bundle` run), in one process for a batch.
// `items`: [{ id, text, file }]. Returns Map(id -> { code, error }).
// `trim`: Bun.Transpiler's trimUnusedImports (off unless set; `bun build` and `bun file.ts` trim).
const bunCompile = (items, { verbatim = false, trim = null } = {}) => {
  const dir = join(TMP, "bun-batch");
  mkdirSync(dir, { recursive: true });
  const input = join(dir, "input.json");
  writeFileSync(input, JSON.stringify(items));
  const script = join(dir, "compile.mjs");
  writeFileSync(
    script,
    [
      "// Written by type-imports-lib.cjs: Bun's transpiler over a batch of files.",
      'import { readFileSync, writeFileSync } from "node:fs";',
      "const items = JSON.parse(readFileSync(process.argv[2], 'utf8'));",
      "const out = {};",
      "for (const it of items) {",
      "  try {",
      `    const t = new Bun.Transpiler({ loader: it.file.endsWith('x') ? 'tsx' : 'ts', target: 'node', ${trim === null ? "" : `trimUnusedImports: ${trim}, `}tsconfig: ${JSON.stringify(JSON.stringify({ compilerOptions: { jsx: "preserve", verbatimModuleSyntax: verbatim } }))} });`,
      "    out[it.id] = { code: t.transformSync(it.text) };",
      "  } catch (e) { out[it.id] = { code: null, error: String(e?.message ?? e).split('\\n')[0].slice(0, 300) }; }",
      "}",
      "writeFileSync(process.argv[3], JSON.stringify(out));",
      "",
    ].join("\n")
  );
  const output = join(dir, "output.json");
  const r = nt.spawnSync("bun", [script, input, output], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (r.status !== 0) {
    throw new Error(`bun failed: ${r.stderr.slice(0, 300)}`);
  }
  return new Map(Object.entries(JSON.parse(readFileSync(output, "utf8"))));
};

// ── one TypeScript program per repo ────────────────────────────────────
// The tsconfig that supplies compiler options (paths included), per repo. The corpus repos use
// import-cycles-lib.cjs's; the React set and Ultracite are added here.
const SETUP = {
  ...ic.SETUP,
  radix: { tsconfig: "packages/react/primitive/tsconfig.json" },
  "react-aria": { tsconfig: "tsconfig.json" },
  shadcn: { tsconfig: "apps/v4/tsconfig.json" },
  supabase: { tsconfig: "apps/studio/tsconfig.json" },
  ultracite: { tsconfig: "packages/cli/tsconfig.json" },
};
// Builds the program for one repo: the measured source and test files as roots, bundler
// resolution, and import-cycles-lib.cjs's fallbacks. `overlay`: Map(abs path -> text) replaces
// files (fixed copies), so a fixed version type-checks against the same program shape.
const repoProgram = (
  name,
  rels,
  { overlay = null, extraOptions = {} } = {}
) => {
  const root = resolve(nt.getRepo(name).root);
  const { options, parsed } = ic.compilerOptionsFor(root, SETUP[name].tsconfig);
  const opts = { ...options, ...extraOptions };
  const host = ts.createCompilerHost(opts, true);
  if (overlay) {
    const readFile = host.readFile.bind(host);
    const getSourceFile = host.getSourceFile.bind(host);
    host.readFile = (f) => overlay.get(resolve(f)) ?? readFile(f);
    host.getSourceFile = (f, lang, onError, create) => {
      const text = overlay.get(resolve(f));
      if (text !== undefined) {
        return ts.createSourceFile(f, text, lang, true);
      }
      return getSourceFile(f, lang, onError, create);
    };
  }
  const { packages, resolveSpec } = ic.makeResolver(root, opts, host);
  host.resolveModuleNameLiterals = (literals, containingFile) =>
    literals.map((lit) => {
      const r = resolveSpec(lit.text, containingFile);
      if (!r.file) {
        return { resolvedModule: undefined };
      }
      let extension;
      try {
        extension = ts.extensionFromPath(r.file);
      } catch {
        return { resolvedModule: undefined };
      }
      return {
        resolvedModule: {
          extension,
          isExternalLibraryImport: false,
          resolvedFileName: r.file,
        },
      };
    });
  const program = ts.createProgram({
    host,
    options: opts,
    rootNames: rels.map((r) => join(root, r)),
  });
  return { host, options: opts, packages, parsed, program, resolveSpec, root };
};
// What an imported binding is at its source: "value", "type", "both", "namespace-module",
// "unresolved". `decl`: the kind of its first declaration.
const symbolFacts = (checker, nameNode) => {
  const sym = checker.getSymbolAtLocation(nameNode);
  if (!sym) {
    return { decl: null, is: "unresolved" };
  }
  let target = sym;
  if (sym.flags & ts.SymbolFlags.Alias) {
    try {
      target = checker.getAliasedSymbol(sym);
    } catch {
      return { decl: null, is: "unresolved" };
    }
  }
  if (
    !target ||
    target.escapedName === "unknown" ||
    !target.declarations?.length
  ) {
    return { decl: null, is: "unresolved" };
  }
  const value = Boolean(target.flags & ts.SymbolFlags.Value);
  const type = Boolean(target.flags & ts.SymbolFlags.Type);
  const d = target.declarations[0];
  const kinds = target.declarations.map((x) => ts.SyntaxKind[x.kind]);
  const constEnum = Boolean(target.flags & ts.SymbolFlags.ConstEnum);
  return {
    ambient: target.declarations.every(
      (x) =>
        x.getSourceFile().isDeclarationFile ||
        Boolean(ts.getCombinedModifierFlags(x) & ts.ModifierFlags.Ambient)
    ),
    constEnum,
    decl: ts.SyntaxKind[d.kind],
    declFile: d.getSourceFile().fileName,
    is:
      target.flags & ts.SymbolFlags.ValueModule && !type
        ? "namespace-module"
        : value && type
          ? "both"
          : value
            ? "value"
            : type
              ? "type"
              : "unresolved",
    kinds: [...new Set(kinds)],
  };
};
// Package name of a bare specifier.
const packageOf = (spec) => {
  if (spec.startsWith(".") || spec.startsWith("/")) {
    return null;
  }
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};
// A workspace package's `sideEffects` (false, true, a list, or absent).
const packageSideEffects = (packages, spec) => {
  const name = packageOf(spec);
  if (!name) {
    return null;
  }
  if (BUILTINS.has(spec) || BUILTINS.has(name)) {
    return { how: "builtin" };
  }
  const pkg = packages.find((p) => p.name === name);
  if (!pkg) {
    return { how: "unknown (not in the clone)" };
  }
  return {
    how: "workspace",
    sideEffects:
      "sideEffects" in pkg.json ? pkg.json.sideEffects : "(not declared)",
  };
};

// ── linters on copies ──────────────────────────────────────────────────
// Each rule alone in Oxlint (every category off; the typescript and import plugins on).
const writeOxlintRules = (dir, name, rules) =>
  nt.writeOxlintRules(dir, name, rules, { plugins: ["typescript", "import"] });
const runOxlintRules = ({ cwd, files, configFile, typeAware = false }) => {
  if (!typeAware) {
    return nt.runOxlint({ configFile, cwd, files });
  }
  return dc.runOxlint({ configFile, cwd, files, typeAware: true });
};
const biomeVariantConfig = (dir, variant) =>
  nt.biomeRulesConfig(
    join(dir, `biome-${variant.replace(/\s+/g, "-")}`),
    BIOME_VARIANTS[variant]
  );

// ── mirrors and copies ─────────────────────────────────────────────────
const copyFiles = (fromRoot, toRoot, rels, transform = null) => {
  rmSync(toRoot, { force: true, recursive: true });
  for (const rel of rels) {
    const dest = join(toRoot, rel);
    mkdirSync(dirname(dest), { recursive: true });
    if (transform) {
      writeFileSync(dest, transform(readFileSync(join(fromRoot, rel), "utf8")));
    } else {
      copyFileSync(join(fromRoot, rel), dest);
    }
  }
  return toRoot;
};

// ── Ultracite's presets and the `ultracite fix` path, on copies ─────────
const CONFIG_DIR = join(TMP, "configs");
// The root config `ultracite init` writes for the given Oxlint presets (dead-code-lib.cjs).
const oxlintPresetConfig = (presets) =>
  dc.writeOxlintConfig(presets, CONFIG_DIR);
// Biome extending Ultracite's presets by absolute path, in its own directory under TMP. With
// `lintOnly`, the formatter and assist actions are off (for counting diagnostics).
const biomePresetConfig = (presets, { lintOnly = false } = {}) => {
  const dir = join(
    CONFIG_DIR,
    `biome-${presets.join("+")}${lintOnly ? "-lint" : ""}`
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "biome.json"),
    `${JSON.stringify(
      {
        extends: presets.map((p) =>
          join(CLI, "config/biome", p, "biome.jsonc")
        ),
        files: { ignoreUnknown: true, maxSize: 10_000_000 },
        root: true,
        vcs: { enabled: false },
        ...(lintOnly
          ? { assist: { enabled: false }, formatter: { enabled: false } }
          : {}),
      },
      null,
      2
    )}\n`
  );
  return dir;
};
const biomeRun = (args, { cwd, configDir }) =>
  nt.spawnSync(
    process.execPath,
    [nt.biomeBin, ...args, `--config-path=${configDir}`, "--colors=off"],
    { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
  );
// ESLint with Ultracite's preset modules (dead-code-lib.cjs's blocks: the shared ignores dropped),
// inline config ignored unless `inline`.
const eslintPreset = async ({
  cwd,
  presets = ["core"],
  fix = false,
  inline = false,
  extra = [],
}) => {
  const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
  const blocks = await dc.eslintBlocks({ presets });
  return new ESLint({
    cwd,
    errorOnUnmatchedPattern: false,
    fix,
    ignore: false,
    overrideConfig: [
      ...blocks,
      {
        linterOptions: {
          noInlineConfig: !inline,
          reportUnusedDisableDirectives: "off",
        },
      },
      ...extra,
    ],
    overrideConfigFile: true,
  });
};
// Formats files in place: Oxfmt with Ultracite's preset, or Prettier with Ultracite's config (its
// ignore patterns and tailwind option dropped), configs written under TMP.
const formatFiles = async ({ cwd, files, tool }) => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  if (tool === "oxfmt") {
    const config = join(CONFIG_DIR, "oxfmt.json");
    writeFileSync(
      config,
      `${JSON.stringify(await nt.oxfmtConfig(), null, 2)}\n`
    );
    return nt.spawnSync(
      process.execPath,
      [
        nt.oxfmtBin,
        `--config=${config}`,
        "--disable-nested-config",
        "--write",
        "--no-error-on-unmatched-pattern",
        ...files,
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
    );
  }
  const { tailwindFunctions: _tw, ...rest } = await nt.prettierConfig();
  const config = join(CONFIG_DIR, "prettier.json");
  writeFileSync(config, `${JSON.stringify(rest, null, 2)}\n`);
  return nt.spawnSync(
    process.execPath,
    [
      nt.prettierBin,
      "--config",
      config,
      "--no-editorconfig",
      "--ignore-path",
      join(CONFIG_DIR, "none"),
      "--write",
      "--log-level",
      "warn",
      ...files,
    ],
    { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
  );
};
// `ultracite fix` on a copy, per linter: Oxlint `--fix` (or `--fix-dangerously`) then Oxfmt;
// ESLint `--fix` then Prettier; Biome `check --write` (or `--unsafe`). Returns what each step
// printed (scrubbed).
const ultraciteFix = async ({
  cwd,
  files,
  linter,
  presets = ["core"],
  unsafe = false,
}) => {
  if (linter === "oxlint") {
    const config = oxlintPresetConfig(presets);
    const r = nt.spawnSync(
      process.execPath,
      [
        nt.oxlintBin,
        "-c",
        config,
        "--disable-nested-config",
        unsafe ? "--fix-dangerously" : "--fix",
        ...files,
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
    );
    const f = await formatFiles({ cwd, files, tool: "oxfmt" });
    return { format: f.status, lint: r.status };
  }
  if (linter === "eslint") {
    const eslint = await eslintPreset({ cwd, fix: true, presets });
    const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
    const results = await eslint.lintFiles(files);
    await ESLint.outputFixes(results);
    const f = await formatFiles({ cwd, files, tool: "prettier" });
    return { format: f.status, lint: 0 };
  }
  const configDir = biomePresetConfig(presets);
  const r = biomeRun(
    [
      "check",
      "--write",
      ...(unsafe ? ["--unsafe"] : []),
      "--max-diagnostics=none",
      ...files,
    ],
    {
      configDir,
      cwd,
    }
  );
  return { lint: r.status };
};

// ── misc ───────────────────────────────────────────────────────────────
const realTmp = (() => {
  try {
    return realpathSync(tmpdir());
  } catch {
    return tmpdir();
  }
})();
// Machine paths in tool output become placeholders.
const scrub = (s) => {
  if (typeof s !== "string") {
    return s;
  }
  // ANSI colour codes from tool output go too
  let out = s.replace(/\x1b\[[0-9;]*m/g, "");
  for (const p of [TMP, existsSync(TMP) ? realpathSync(TMP) : TMP]) {
    out = out.split(p).join("<tmp>");
  }
  return out
    .split(realTmp)
    .join("<tmp>")
    .split(tmpdir())
    .join("<tmp>")
    .split(ULTRACITE)
    .join("<repo>")
    .split(require("node:os").homedir())
    .join("<home>");
};
const scrubDeep = (v) =>
  typeof v === "string"
    ? scrub(v)
    : Array.isArray(v)
      ? v.map(scrubDeep)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v).map(([k, x]) => [k, scrubDeep(x)])
          )
        : v;
const sum = (xs, f = (x) => x) => xs.reduce((s, x) => s + f(x), 0);
const per10k = (n, lines) =>
  lines ? Math.round((n / lines) * 1e5) / 10 : null;
const isTestPath = (rel) =>
  /(?:^|\/)(?:__tests__|__test__|__tests_dts__|test|tests)\//.test(rel) ||
  /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel);

const esbuildApi = () => esbuild;

module.exports = {
  ...nt,
  CONFIG_DIR,
  biomePresetConfig,
  biomeRun,
  eslintPreset,
  formatFiles,
  oxlintPresetConfig,
  ultraciteFix,
  esbuildApi,
  storePackage,
  versionAt,
  BIOME_VARIANTS,
  BUILTINS,
  CALIBRATION_DIR,
  CLI,
  ESBUILD_DIR,
  ESLINT_VARIANTS,
  EXAMPLES_DIR,
  FLAGS,
  HERE,
  HISTORY_DIR,
  OUT_DIR,
  OXLINT_RULES,
  OXLINT_VARIANTS,
  PER_FILE_TOOLS,
  RESULTS_DIR,
  ROLLDOWN_DIR,
  SETUP,
  SUCRASE_DIR,
  TMP,
  TOPIC,
  ULTRACITE,
  ULTRACITE_ESLINT,
  biomeVariantConfig,
  bunCompile,
  classifyRef,
  compileOne,
  copyFiles,
  effectiveFlags,
  fixText,
  ic,
  importX,
  importsOfJs,
  inventory,
  isTestPath,
  isTsFile,
  lintText,
  loadCompilers,
  loadedSpecifiers,
  makeCensusRule,
  metadataOf,
  nearestTsconfig,
  packageOf,
  packageSideEffects,
  per10k,
  repoProgram,
  runOxlintRules,
  scrub,
  scrubDeep,
  sideEffectsOf,
  stripJsonc,
  sum,
  symbolFacts,
  toolVersions,
  ts,
  tsPlugin,
  tsconfigChain,
  unusedImports,
  usageOf,
  writeOxlintRules,
};
