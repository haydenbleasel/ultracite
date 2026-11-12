/*
 * STUB for nested-ternaries subject C. Stands in for what the original file imports from vite
 * (normalizePath: backslashes to slashes, as Vite does on Windows paths) and the two types it uses
 * (TypeScript's CompilerOptions and Astro's AstroSettings, reduced to the fields getConfigAlias
 * reads) at withastro/astro@9050e3819c51b0383cced278c278bc6f45c63468. Not part of the source.
 */
export const normalizePath = (id: string): string => id.replace(/\\/g, "/");

export interface CompilerOptions {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

export interface AstroSettings {
  tsConfig?: { compilerOptions?: CompilerOptions };
  tsConfigPath?: string;
}
