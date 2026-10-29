import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const CLI_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(CLI_ROOT, "..", "..");
const require = createRequire(import.meta.url);

// Resolve tsrs's current platform package without spawning a version probe.
// Locally, a missing optional native package falls back to tsgo. Other tsrs
// failures surface from the actual type check instead of selecting tsgo.
const ciValue = process.env.CI?.trim().toLowerCase();

const isCi = Boolean(ciValue && !["false", "0", "no", "off"].includes(ciValue));

const tsrsPackageJson = require.resolve("tsrs/package.json");
const tsrsPackageRoot = path.dirname(tsrsPackageJson);

const tsrsRequire = createRequire(
  path.join(tsrsPackageRoot, "lib", "getExePath.js")
);

// SAFETY: tsrs 0.20.1-ts7.1.0-beta ships this internal module and export.
const platformModule = (await import(
  path.join(tsrsPackageRoot, "lib", "platform.js")
)) as { getPlatformPackageName: () => string };

const nativePackageName = platformModule.getPlatformPackageName();
const hasBinaryOverride = Boolean(process.env.TSRS_BINARY);
let hasNativeBinary = hasBinaryOverride;

if (!hasBinaryOverride) {
  try {
    tsrsRequire.resolve(`${nativePackageName}/package.json`);
    hasNativeBinary = true;
  } catch {
    hasNativeBinary = false;
  }
}

const usesTsrs = hasNativeBinary;

if (!usesTsrs && isCi) {
  console.error(
    `The tsrs native package ${nativePackageName} is unavailable. CI type checks require tsrs, so this does not fall back to tsgo.`
  );
  process.exit(1);
}

if (!usesTsrs) {
  console.warn(
    `The tsrs native package ${nativePackageName} is unavailable; type checking with tsgo instead. tsgo targets a different TypeScript version than tsrs, which CI uses, so results can differ.`
  );
}

const compilerBinary = usesTsrs
  ? path.join(REPO_ROOT, "node_modules", "tsrs", "bin", "tsrs")
  : path.join(
      REPO_ROOT,
      "node_modules",
      "@typescript",
      "native-preview",
      "bin",
      "tsgo"
    );

const result = Bun.spawnSync([process.execPath, compilerBinary, "--noEmit"], {
  cwd: CLI_ROOT,
  stderr: "inherit",
  stdout: "inherit",
});

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1);
}
