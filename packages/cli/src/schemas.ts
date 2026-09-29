import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { parse } from "jsonc-parser";
import type { FormattingOptions, ParseError } from "jsonc-parser";
import { z } from "zod";

// -- Package.json --

export const packageJsonSchema = z.looseObject({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  "lint-staged": z.unknown().optional(),
  name: z.string().optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  prettier: z.unknown().optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  stylelint: z.unknown().optional(),
  type: z.string().optional(),
  version: z.string().optional(),
  workspace: z.unknown().optional(),
  workspaces: z
    .union([z.array(z.string()), z.record(z.string(), z.unknown())])
    .optional(),
});

export type PackageJson = z.infer<typeof packageJsonSchema>;

// zod emits the schema's keys first, so a parsed package.json written back as
// is would come out reordered (name after devDependencies, main at the end).
// Put the keys back in the order the document had them.
const inDocumentOrder = (
  data: PackageJson,
  documentKeys: string[]
): PackageJson => {
  const ordered = Object.fromEntries(
    documentKeys.filter((key) => key in data).map((key) => [key, data[key]])
  );

  // SAFETY: `ordered` holds exactly the entries of `data`, which zod just
  // validated against packageJsonSchema, only in a different key order.
  return Object.assign(ordered, data) as PackageJson;
};

export const parsePackageJson = (content: string): PackageJson | undefined => {
  const parsed = parse(content);
  const result = packageJsonSchema.safeParse(parsed);

  return result.success
    ? inDocumentOrder(result.data, Object.keys(parsed))
    : undefined;
};

export const readPackageJsonSync = (
  path = "package.json"
): PackageJson | undefined => {
  try {
    const content = readFileSync(path, "utf-8");
    return parsePackageJson(content);
  } catch {
    return undefined;
  }
};

export const readPackageJson = async (
  path = "package.json"
): Promise<PackageJson | undefined> => {
  try {
    const content = await readFile(path, "utf-8");
    return parsePackageJson(content);
  } catch {
    return undefined;
  }
};

// -- Config files --

// Biome's `extends` is a list of configs, or the string "//" in a nested
// monorepo config that inherits the root configuration.
export const biomeConfigSchema = z.looseObject({
  extends: z.union([z.string(), z.array(z.string())]).optional(),
});

export const tsConfigSchema = z.looseObject({
  compilerOptions: z
    .looseObject({
      strict: z.boolean().optional(),
      strictNullChecks: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Parse a JSONC document that is about to be edited and written back. Unlike
 * `parse`, which recovers what it can from a broken document, this returns
 * undefined on any syntax error: writing back a partial recovery would drop
 * whatever came after the error.
 */
export const parseJsoncStrict = <T>(
  content: string,
  schema: z.ZodType<T>
): T | undefined => {
  const errors: ParseError[] = [];
  const parsed = parse(content, errors, { allowTrailingComma: true });

  if (errors.length > 0) {
    return undefined;
  }

  const result = schema.safeParse(parsed);
  return result.success ? result.data : undefined;
};

const INDENTED_LINE_RE = /^(?<indent>[ \t]+)\S/mu;

/**
 * The indentation and line endings of an existing JSON document, so edits made
 * with jsonc-parser's `modify` match the rest of the file.
 */
export const detectJsonFormatting = (content: string): FormattingOptions => {
  const indent = INDENTED_LINE_RE.exec(content)?.groups?.indent ?? "  ";
  const eol = content.includes("\r\n") ? "\r\n" : "\n";

  return indent.startsWith("\t")
    ? { eol, insertSpaces: false, tabSize: 1 }
    : { eol, insertSpaces: true, tabSize: indent.length };
};

export const parseJsonc = <T>(
  content: string,
  schema: z.ZodType<T>
): T | undefined => {
  const parsed = parse(content);
  const result = schema.safeParse(parsed);
  return result.success ? result.data : undefined;
};
