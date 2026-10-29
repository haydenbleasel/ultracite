import path from "node:path";
import process from "node:process";

import { resolveCompilerExecutable, spawnCompiler } from "./typecheck-tools";

const CLI_ROOT = path.resolve(import.meta.dirname, "..");

const ciValue = process.env.CI?.trim().toLowerCase();

const isCi = Boolean(ciValue && !["false", "0", "no", "off"].includes(ciValue));

// Locally, missing tsrs JS/native packages fall back to tsgo. CI requires tsrs.
const tsrsCompiler = resolveCompilerExecutable("tsrs");
const usesTsrs = Boolean(tsrsCompiler);

if (!usesTsrs && isCi) {
  console.error(
    "The tsrs package or current platform binary is unavailable. CI type checks require tsrs, so this does not fall back to tsgo."
  );
  process.exit(1);
}

if (!usesTsrs) {
  console.warn(
    "The tsrs package or current platform binary is unavailable; type checking with tsgo instead. tsgo targets a different TypeScript version than tsrs, which CI uses, so results can differ."
  );
}

const compiler = tsrsCompiler ?? resolveCompilerExecutable("tsgo");

if (!compiler) {
  throw new Error("No compiler executable was resolved for type checking.");
}

const result = spawnCompiler(compiler, ["--noEmit"], CLI_ROOT, "inherit");

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1);
}
