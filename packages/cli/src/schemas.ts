import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { parse } from "jsonc-parser";
import { z } from "zod";

// -- Package.json --

const packageJsonSchema = z.looseObject({
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

export const parsePackageJson = (content: string): PackageJson | undefined => {
  const parsed = parse(content);
  const result = packageJsonSchema.safeParse(parsed);
  return result.success ? result.data : undefined;
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

export const biomeConfigSchema = z.looseObject({
  extends: z.array(z.string()).optional(),
});

export const tsConfigSchema = z.looseObject({
  compilerOptions: z
    .looseObject({
      strict: z.boolean().optional(),
      strictNullChecks: z.boolean().optional(),
    })
    .optional(),
});

export const parseJsonc = <T>(
  content: string,
  schema: z.ZodType<T>
): T | undefined => {
  const parsed = parse(content);
  const result = schema.safeParse(parsed);
  return result.success ? result.data : undefined;
};
