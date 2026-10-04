import { parseModule } from "magicast";
import type { ASTNode } from "magicast";

import type { JsonValue } from "../data/types";

/**
 * Reads a generated JS/TS config module (oxlint.config.ts, eslint.config.mjs,
 * prettier.config.mjs, ...) into the pieces init regenerates and the pieces a
 * user added, so an update can rewrite the Ultracite-owned parts and carry
 * everything else over as written, comments included.
 */

type NodeOfType<T extends ASTNode["type"]> = Extract<ASTNode, { type: T }>;

export interface ImportSpecifierText {
  imported: string;
  local: string;
  text: string;
}

export interface ModuleImport {
  defaultLocal: string | null;
  namedSpecifiers: ImportSpecifierText[];
  source: string;
  text: string;
  typeOnly: boolean;
}

export interface ModuleStatement {
  declaredNames: string[];
  initCallee: string | null;
  text: string;
}

export interface ConfigEntry {
  comment: string | null;
  identifier: string | null;
  key: string | null;
  spreadOf: string | null;
  text: string;
  value: ASTNode | null;
  valueText: string | null;
}

interface EntryList {
  danglingComments: string[];
  entries: ConfigEntry[];
}

export interface ConfigModule {
  callee: string | null;
  danglingComments: string[];
  entries: ConfigEntry[];
  imports: ModuleImport[];
  container: "arguments" | "array" | "object";
  statements: ModuleStatement[];
}

export type ParsedConfigModule =
  | { kind: "module"; module: ConfigModule }
  | { kind: "unparseable" }
  | { kind: "unrecognized" };

export interface RenderedEntry {
  comment: string | null;
  text: string;
}

const textOf = (source: string, node: ASTNode): string =>
  source.slice(node.start ?? 0, node.end ?? 0);

const startLine = (node: ASTNode): number => node.loc?.start.line ?? 0;

const endLine = (node: ASTNode): number => node.loc?.end.line ?? 0;

// Where a node's text starts once the comments above it (but below the
// previous sibling) are included.
const leadingStart = (node: ASTNode, afterLine: number): number =>
  node.leadingComments?.find(
    (comment) => (comment.loc?.start.line ?? 0) > afterLine
  )?.start ??
  node.start ??
  0;

// A `// comment` on the same line as the end of a node. Babel attaches a
// comment that follows a separator (`a: 1, // note`) to the next sibling, so
// that sibling's leading comments are checked too.
const findSameLineComment = (
  node: ASTNode,
  next: ASTNode | undefined
): NonNullable<ASTNode["trailingComments"]>[number] | undefined => {
  const line = endLine(node);
  const onLine = (comment: { loc?: { start: { line: number } } | null }) =>
    (comment.loc?.start.line ?? -1) === line;

  return (
    node.trailingComments?.find(onLine) ?? next?.leadingComments?.find(onLine)
  );
};

const sameLineComment = (
  source: string,
  node: ASTNode,
  next: ASTNode | undefined
): string | null => {
  const comment = findSameLineComment(node, next);

  return comment
    ? source.slice(comment.start ?? 0, comment.end ?? comment.start ?? 0)
    : null;
};

const unwrapExpression = (node: ASTNode): ASTNode => {
  let current = node;

  while (
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "TSNonNullExpression" ||
    current.type === "ParenthesizedExpression"
  ) {
    current = current.expression;
  }

  return current;
};

const propertyKey = (node: ASTNode): string | null => {
  if (node.type !== "ObjectProperty" && node.type !== "ObjectMethod") {
    return null;
  }

  if (node.computed) {
    return null;
  }

  if (node.key.type === "Identifier") {
    return node.key.name;
  }

  return node.key.type === "StringLiteral" ? node.key.value : null;
};

const readEntry = (
  source: string,
  node: ASTNode,
  afterLine: number,
  next: ASTNode | undefined
): ConfigEntry => {
  const unwrapped = unwrapExpression(node);
  const value = node.type === "ObjectProperty" ? node.value : null;

  return {
    comment: sameLineComment(source, node, next),
    identifier: unwrapped.type === "Identifier" ? unwrapped.name : null,
    key: propertyKey(node),
    spreadOf:
      node.type === "SpreadElement" && node.argument.type === "Identifier"
        ? node.argument.name
        : null,
    text: source.slice(leadingStart(node, afterLine), node.end ?? 0),
    value,
    valueText: value ? textOf(source, value) : null,
  };
};

const readEntries = (
  source: string,
  nodes: ASTNode[],
  containerLine: number
): EntryList => {
  const entries: ConfigEntry[] = [];
  let afterLine = containerLine;

  for (const [index, node] of nodes.entries()) {
    entries.push(readEntry(source, node, afterLine, nodes[index + 1]));
    afterLine = endLine(node);
  }

  const last = nodes.at(-1);
  const danglingComments =
    last?.trailingComments
      ?.filter((comment) => (comment.loc?.start.line ?? 0) > endLine(last))
      .map((comment) =>
        source.slice(comment.start ?? 0, comment.end ?? comment.start ?? 0)
      ) ?? [];

  return { danglingComments, entries };
};

type ContainerNode = NodeOfType<"ArrayExpression" | "ObjectExpression">;

const readContainer = (source: string, container: ContainerNode): EntryList => {
  const nodes: ASTNode[] =
    container.type === "ObjectExpression"
      ? container.properties
      : container.elements.filter((element) => element !== null);

  const result = readEntries(source, nodes, startLine(container));
  const innerComments =
    container.innerComments?.map((comment) =>
      source.slice(comment.start ?? 0, comment.end ?? comment.start ?? 0)
    ) ?? [];

  return {
    danglingComments: [...innerComments, ...result.danglingComments],
    entries: result.entries,
  };
};

type ConfigExport = Pick<
  ConfigModule,
  "callee" | "container" | "danglingComments" | "entries"
>;

const readConfigExport = (
  source: string,
  declaration: ASTNode
): ConfigExport | null => {
  const node = unwrapExpression(declaration);

  if (node.type === "ObjectExpression" || node.type === "ArrayExpression") {
    return {
      callee: null,
      container: node.type === "ObjectExpression" ? "object" : "array",
      ...readContainer(source, node),
    };
  }

  if (node.type !== "CallExpression") {
    return null;
  }

  const callee = textOf(source, node.callee);
  const [onlyArgument] = node.arguments;
  const argument =
    node.arguments.length === 1 && onlyArgument
      ? unwrapExpression(onlyArgument)
      : null;

  if (
    argument?.type === "ObjectExpression" ||
    argument?.type === "ArrayExpression"
  ) {
    return {
      callee,
      container: argument.type === "ObjectExpression" ? "object" : "array",
      ...readContainer(source, argument),
    };
  }

  return {
    callee,
    container: "arguments",
    ...readEntries(source, node.arguments, startLine(node)),
  };
};

const statementText = (
  source: string,
  node: ASTNode,
  afterLine: number,
  next: ASTNode | undefined
): string => {
  const comment = findSameLineComment(node, next);

  return source.slice(
    leadingStart(node, afterLine),
    comment?.end ?? node.end ?? 0
  );
};

const readImport = (
  source: string,
  node: NodeOfType<"ImportDeclaration">,
  afterLine: number,
  next: ASTNode | undefined
): ModuleImport => {
  let defaultLocal: string | null = null;
  const namedSpecifiers: ImportSpecifierText[] = [];

  for (const specifier of node.specifiers) {
    if (specifier.type === "ImportDefaultSpecifier") {
      defaultLocal = specifier.local.name;
    } else if (specifier.type === "ImportSpecifier") {
      namedSpecifiers.push({
        imported:
          specifier.imported.type === "Identifier"
            ? specifier.imported.name
            : specifier.imported.value,
        local: specifier.local.name,
        text: textOf(source, specifier),
      });
    }
  }

  return {
    defaultLocal,
    namedSpecifiers,
    source: node.source.value,
    text: statementText(source, node, afterLine, next),
    typeOnly: node.importKind === "type",
  };
};

const readStatement = (
  source: string,
  node: ASTNode,
  afterLine: number,
  next: ASTNode | undefined
): ModuleStatement => {
  const declaration =
    node.type === "ExportNamedDeclaration" ? node.declaration : node;
  const declarations =
    declaration?.type === "VariableDeclaration" ? declaration.declarations : [];
  const [first] = declarations;
  const init = first?.init ? unwrapExpression(first.init) : null;

  return {
    declaredNames: declarations.flatMap((declarator) =>
      declarator.id.type === "Identifier" ? [declarator.id.name] : []
    ),
    initCallee:
      declarations.length === 1 &&
      init?.type === "CallExpression" &&
      init.callee.type === "Identifier"
        ? init.callee.name
        : null,
    text: statementText(source, node, afterLine, next),
  };
};

const parseProgram = (source: string): ASTNode | null => {
  try {
    return parseModule(source).$ast;
  } catch {
    return null;
  }
};

export const parseConfigModule = (source: string): ParsedConfigModule => {
  const program = parseProgram(source);

  if (program?.type !== "Program") {
    return { kind: "unparseable" };
  }

  const imports: ModuleImport[] = [];
  const statements: ModuleStatement[] = [];
  let configExport: ConfigExport | null = null;
  let afterLine = 0;

  for (const [index, node] of program.body.entries()) {
    const next = program.body[index + 1];

    if (node.type === "ImportDeclaration") {
      imports.push(readImport(source, node, afterLine, next));
    } else if (node.type === "ExportDefaultDeclaration") {
      configExport = readConfigExport(source, node.declaration);
    } else {
      statements.push(readStatement(source, node, afterLine, next));
    }

    afterLine = endLine(node);
  }

  if (!configExport) {
    return { kind: "unrecognized" };
  }

  return {
    kind: "module",
    module: { ...configExport, imports, statements },
  };
};

// The text of a node that is an identifier, or null.
export const identifierName = (node: ASTNode | null): string | null => {
  const unwrapped = node ? unwrapExpression(node) : null;
  return unwrapped?.type === "Identifier" ? unwrapped.name : null;
};

// The elements of an array literal, as entries.
export const arrayEntries = (
  source: string,
  node: ASTNode | null
): ConfigEntry[] | null => {
  const unwrapped = node ? unwrapExpression(node) : null;

  if (unwrapped?.type !== "ArrayExpression") {
    return null;
  }

  return readContainer(source, unwrapped).entries;
};

// String literal values of an array literal, or null when any element is not
// a plain string.
export const stringArrayValues = (node: ASTNode | null): string[] | null => {
  const unwrapped = node ? unwrapExpression(node) : null;

  if (unwrapped?.type !== "ArrayExpression") {
    return null;
  }

  const values: string[] = [];

  for (const element of unwrapped.elements) {
    if (element?.type !== "StringLiteral") {
      return null;
    }
    values.push(element.value);
  }

  return values;
};

// `a.b` member access as its dotted text, or null.
export const memberPath = (node: ASTNode | null): string | null => {
  const unwrapped = node ? unwrapExpression(node) : null;

  if (
    unwrapped?.type !== "MemberExpression" ||
    unwrapped.computed ||
    unwrapped.object.type !== "Identifier" ||
    unwrapped.property.type !== "Identifier"
  ) {
    return null;
  }

  return `${unwrapped.object.name}.${unwrapped.property.name}`;
};

export const renderEntries = (
  entries: RenderedEntry[],
  danglingComments: string[] = [],
  indent = "  "
): string =>
  [
    ...entries.map(
      ({ comment, text }) =>
        `${indent}${text.trimStart()},${comment ? ` ${comment}` : ""}`
    ),
    ...danglingComments.map((comment) => `${indent}${comment}`),
  ].join("\n");

export const renderImport = (
  source: string,
  specifiers: string[],
  defaultLocal: string | null = null
): string => {
  const named = specifiers.length > 0 ? `{ ${specifiers.join(", ")} }` : "";
  const clause = [defaultLocal, named].filter(Boolean).join(", ");
  return `import ${clause} from "${source}";`;
};

const IDENTIFIER_KEY_RE = /^[A-Za-z_$][\w$]*$/u;

const renderKey = (key: string): string =>
  IDENTIFIER_KEY_RE.test(key) ? key : JSON.stringify(key);

// A JSON value as JS source nested one level inside an object literal.
export const renderJsonValue = (value: JsonValue, indent = "  "): string =>
  JSON.stringify(value, null, 2).replaceAll("\n", `\n${indent}`);

export const renderJsonProperty = (
  key: string,
  value: JsonValue,
  indent = "  "
): RenderedEntry => ({
  comment: null,
  text: `${renderKey(key)}: ${renderJsonValue(value, indent)}`,
});
