/**
 * Generates declaration files (.d.mts) for oxlint and oxfmt config exports,
 * and syncs biome/core's files.includes from the shared ignore patterns.
 * Run as part of the build to keep types and configs in sync.
 *
 * Each preset's default export is declared with the type TypeScript infers
 * for its defineConfig() call, which returns the type of the config it is
 * given. Declaring the generic OxlintConfig or OxfmtConfig instead makes
 * every field optional, so spreading one a preset always sets
 * (`...ultracite.sortTailwindcss`, `[...core.overrides]`) fails to type-check
 * in the configs that extend it (#874).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { applyEdits, modify } from "jsonc-parser";
import { format } from "oxfmt";
import ts from "typescript";

import oxfmtPreset from "../config/oxfmt/index.mjs";

interface Preset {
  /** The config type the preset's default export must satisfy. */
  base: "OxfmtConfig" | "OxlintConfig";
  directory: string;
  /** The preset's path under config/, such as `oxlint/next/js-plugins`. */
  name: string;
}

const configDir = path.join(import.meta.dirname, "../config");
const oxlintDir = path.join(configDir, "oxlint");

// Presets can nest one level deep (e.g. next/js-plugins), so include
// subdirectories that hold an index.mjs.
const oxlintPresets = readdirSync(oxlintDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const nested = readdirSync(path.join(oxlintDir, entry.name), {
      withFileTypes: true,
    })
      .filter((child) => child.isDirectory())
      .map((child) => `${entry.name}/${child.name}`);

    return [entry.name, ...nested];
  });

const presets: Preset[] = [
  {
    base: "OxfmtConfig",
    directory: path.join(configDir, "oxfmt"),
    name: "oxfmt",
  },
  ...oxlintPresets.map((preset): Preset => ({
    base: "OxlintConfig",
    directory: path.join(oxlintDir, preset),
    name: `oxlint/${preset}`,
  })),
];

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => "\n",
};

const program = ts.createProgram(
  presets.map((preset) => path.join(preset.directory, "index.mjs")),
  {
    allowJs: true,
    // Without checkJs, a defineConfig() argument that doesn't match the
    // config type reports nothing, and its type quietly falls back to the
    // generic config type.
    checkJs: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    types: ["node"],
  }
);

const checker = program.getTypeChecker();
const printer = ts.createPrinter();

const isDefineConfigCall = (
  expression: ts.Expression
): expression is ts.CallExpression =>
  ts.isCallExpression(expression) &&
  ts.isIdentifier(expression.expression) &&
  expression.expression.text === "defineConfig";

// Follows `export default config` to `const config = defineConfig(...)`.
const getDefaultExport = (
  sourceFile: ts.SourceFile
): ts.Expression | undefined => {
  const assignment = sourceFile.statements.find(
    (statement): statement is ts.ExportAssignment =>
      ts.isExportAssignment(statement) && !statement.isExportEquals
  );

  if (!(assignment && ts.isIdentifier(assignment.expression))) {
    return assignment?.expression;
  }

  const declaration = checker.getSymbolAtLocation(
    assignment.expression
  )?.valueDeclaration;

  return declaration && ts.isVariableDeclaration(declaration)
    ? declaration.initializer
    : assignment.expression;
};

// An array of object literals with different keys, like core's overrides,
// infers as a union whose members are padded with each other's keys as
// `?: undefined`. Under exactOptionalPropertyTypes those keys don't fit a
// rule map, so the preset stops being assignable to OxlintConfig. Presets
// never set a value to undefined, so every such member is padding.
const isPadding = (node: ts.Node): boolean =>
  ts.isPropertySignature(node) &&
  node.questionToken !== undefined &&
  node.type?.kind === ts.SyntaxKind.UndefinedKeyword;

// `{}` means any non-nullish value, so the empty rules maps of presets that
// only enable a plugin's rules elsewhere are declared as Record<string, never>.
const emptyObjectType = () =>
  ts.factory.createTypeReferenceNode("Record", [
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
  ]);

const tidyDeclaredType: ts.TransformerFactory<ts.TypeNode> = (context) => {
  const visit = (node: ts.Node): ts.Node | undefined => {
    if (isPadding(node)) {
      return;
    }

    const visited = ts.visitEachChild(node, visit, context);

    return ts.isTypeLiteralNode(visited) && visited.members.length === 0
      ? emptyObjectType()
      : visited;
  };

  return (node) => ts.visitEachChild(node, visit, context);
};

const inferDefaultExportType = (preset: Preset): string => {
  const sourceFile = program.getSourceFile(
    path.join(preset.directory, "index.mjs")
  );

  const expression = sourceFile && getDefaultExport(sourceFile);

  if (!(sourceFile && expression && isDefineConfigCall(expression))) {
    throw new Error(
      `${preset.name}: export the preset as a defineConfig() call, so its type can be inferred.`
    );
  }

  const errors = program
    .getSemanticDiagnostics(sourceFile)
    .filter(
      ({ start }) =>
        start !== undefined &&
        start >= expression.getStart(sourceFile) &&
        start < expression.end
    );

  if (errors.length > 0) {
    throw new Error(
      `${preset.name}: the defineConfig() argument doesn't type-check, so its type can't be inferred:\n${ts.formatDiagnostics(errors, formatHost)}`
    );
  }

  const typeNode = checker.typeToTypeNode(
    checker.getTypeAtLocation(expression),
    undefined,
    ts.NodeBuilderFlags.NoTruncation
  );

  if (!(typeNode && ts.isTypeLiteralNode(typeNode))) {
    throw new Error(
      `${preset.name}: TypeScript inferred ${typeNode ? printer.printNode(ts.EmitHint.Unspecified, typeNode, sourceFile) : "no type"} instead of an object type.`
    );
  }

  const [declaredType] = ts.transform(typeNode, [tidyDeclaredType]).transformed;

  return printer.printNode(ts.EmitHint.Unspecified, declaredType, sourceFile);
};

const renderDeclaration = (type: string) => `declare const config: ${type};

export default config;
`;

// js-plugins also exports the jsPluginSettings object and the
// selectJsPlugins helper that generated configs use to apply react-doctor's
// settings and enable a subset of the plugins. They are declared by hand.
const renderJsPluginsDeclaration = (
  type: string
) => `import type { OxlintConfig } from "oxlint";

${renderDeclaration(type)}
/** An Oxlint config whose \`jsPlugins\` is always set. */
export type OxlintConfigWithJsPlugins = OxlintConfig & {
  jsPlugins: NonNullable<OxlintConfig["jsPlugins"]>;
};

export type OxlintJsPluginName =
  | "github"
  | "jsdoc-js"
  | "sonarjs"
  | "tsdoc"
  | "react-doctor";

/**
 * react-doctor settings (the "curated" ported-rule mode). Oxlint does not
 * merge \`settings\` from extended configs, so apply these on the root
 * config: \`settings: jsPluginSettings\`.
 */
export declare const jsPluginSettings: NonNullable<OxlintConfig["settings"]>;

/**
 * Returns a copy of the js-plugins preset narrowed to the given plugin
 * names: only the selected jsPlugins entries are loaded and only their
 * rules (top-level and per-override) are kept.
 */
export declare const selectJsPlugins: (
  pluginNames: readonly OxlintJsPluginName[]
) => OxlintConfigWithJsPlugins;
`;

const writeDeclaration = async (preset: Preset) => {
  const type = inferDefaultExportType(preset);
  const declarationPath = path.join(preset.directory, "index.d.mts");

  const { code, errors } = await format(
    declarationPath,
    preset.name === "oxlint/js-plugins"
      ? renderJsPluginsDeclaration(type)
      : renderDeclaration(type),
    oxfmtPreset
  );

  if (errors.length > 0) {
    throw new Error(
      `${preset.name}: oxfmt couldn't format the declaration: ${JSON.stringify(errors)}`
    );
  }

  writeFileSync(declarationPath, code);
};

await Promise.all(presets.map(writeDeclaration));

// Type-check the written declarations the way a strict consumer would, so a
// preset whose declared type stops satisfying its config type fails the
// build instead of the configs that extend it.
const checkPath = path.join(configDir, "declarations-check.mts");

const checkSource = [
  'import type { OxfmtConfig } from "oxfmt";',
  'import type { OxlintConfig } from "oxlint";',
  ...presets.map(
    (preset, index) =>
      `import preset${String(index)} from "./${preset.name}/index.mjs";`
  ),
  ...presets.map(
    (preset, index) => `preset${String(index)} satisfies ${preset.base};`
  ),
].join("\n");

const checkOptions: ts.CompilerOptions = {
  exactOptionalPropertyTypes: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noEmit: true,
  noUncheckedIndexedAccess: true,
  strict: true,
  target: ts.ScriptTarget.ES2022,
  types: [],
};

const baseHost = ts.createCompilerHost(checkOptions);
const isCheckFile = (fileName: string) => path.resolve(fileName) === checkPath;

const checkHost: ts.CompilerHost = {
  ...baseHost,
  fileExists: (fileName) =>
    isCheckFile(fileName) || baseHost.fileExists(fileName),
  getSourceFile: (fileName, languageVersion, ...rest) =>
    isCheckFile(fileName)
      ? ts.createSourceFile(fileName, checkSource, languageVersion)
      : baseHost.getSourceFile(fileName, languageVersion, ...rest),
  readFile: (fileName) =>
    isCheckFile(fileName) ? checkSource : baseHost.readFile(fileName),
};

const checkProgram = ts.createProgram([checkPath], checkOptions, checkHost);

const declarationErrors = [
  checkPath,
  ...presets.map((preset) => path.join(preset.directory, "index.d.mts")),
].flatMap((file) => {
  const sourceFile = checkProgram.getSourceFile(file);

  return sourceFile
    ? [
        ...checkProgram.getSyntacticDiagnostics(sourceFile),
        ...checkProgram.getSemanticDiagnostics(sourceFile),
      ]
    : [];
});

if (declarationErrors.length > 0) {
  throw new Error(
    `The generated declarations don't type-check:\n${ts.formatDiagnostics(declarationErrors, formatHost)}`
  );
}

// Sync biome/core's files.includes from the shared ignore patterns. Inlined
// (rather than extended from a separate jsonc file) because Biome's extend
// merge doesn't carry files.includes through a transitive chain when the
// consumer defines its own — see issue #679.
const { ignorePatterns } = await import("../config/shared/ignores.mjs");
const biomeIncludes = ["**", ...ignorePatterns.map((p: string) => `!!${p}`)];
const biomeCorePath = path.join(configDir, "biome/core/biome.jsonc");
const biomeCoreSource = readFileSync(biomeCorePath, "utf-8");

const biomeCoreEdits = modify(
  biomeCoreSource,
  ["files", "includes"],
  biomeIncludes,
  { formattingOptions: { insertSpaces: true, tabSize: 2 } }
);

writeFileSync(biomeCorePath, applyEdits(biomeCoreSource, biomeCoreEdits));

console.log(
  `Generated declaration files for ${String(oxlintPresets.length)} oxlint presets, oxfmt, and synced biome/core includes`
);
