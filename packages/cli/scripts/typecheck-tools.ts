import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

export type CompilerName = "tsgo" | "tsrs";

export interface CompilerExecutable {
  path: string;
  useNodeRuntime: boolean;
}

const require = createRequire(import.meta.url);

const resolvePackageJson = (packageName: string): string | undefined => {
  try {
    return require.resolve(`${packageName}/package.json`);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "MODULE_NOT_FOUND"
    ) {
      return undefined;
    }

    throw error;
  }
};

const isMusl = (): boolean => {
  try {
    if (readFileSync("/usr/bin/ldd", "utf-8").includes("musl")) {
      return true;
    }
  } catch {
    // Some Linux images do not install ldd at this path.
  }

  let processReport: ReturnType<typeof process.report.getReport> | undefined;

  try {
    processReport = process.report?.getReport();
  } catch {
    return false;
  }

  if (!processReport) {
    return false;
  }

  // SAFETY: Node's process report documents these fields for libc detection.
  const report = processReport as {
    header: { glibcVersionRuntime?: string };
    sharedObjects?: string[];
  };

  if (report?.header.glibcVersionRuntime) {
    return false;
  }

  return (
    report?.sharedObjects?.some(
      (file) => file.includes("libc.musl-") || file.includes("ld-musl-")
    ) ?? false
  );
};

const resolveTsrsExecutable = (): CompilerExecutable | undefined => {
  const binaryOverride = process.env.TSRS_BINARY;

  if (binaryOverride) {
    return { path: binaryOverride, useNodeRuntime: false };
  }

  const tsrsPackageJson = resolvePackageJson("tsrs");

  if (!tsrsPackageJson) {
    return undefined;
  }

  // SAFETY: this manifest path resolves the pinned tsrs package installed by the workspace lockfile.
  const manifest = JSON.parse(readFileSync(tsrsPackageJson, "utf-8")) as {
    optionalDependencies?: Record<string, string>;
  };

  const platformSuffix =
    process.platform === "linux" ? `-${isMusl() ? "musl" : "gnu"}` : "";

  const nativePackageName = `@tsrs/${process.platform}-${process.arch}${platformSuffix}`;

  if (!manifest.optionalDependencies?.[nativePackageName]) {
    return undefined;
  }

  const tsrsRequire = createRequire(tsrsPackageJson);
  let nativePackageJson: string;

  try {
    nativePackageJson = tsrsRequire.resolve(
      `${nativePackageName}/package.json`
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "MODULE_NOT_FOUND"
    ) {
      return undefined;
    }

    throw error;
  }

  const binaryName = process.platform === "win32" ? "tsrs.exe" : "tsrs";

  return {
    path: path.join(path.dirname(nativePackageJson), binaryName),
    useNodeRuntime: false,
  };
};

export const resolveCompilerExecutable = (
  compiler: CompilerName
): CompilerExecutable | undefined => {
  if (compiler === "tsrs") {
    return resolveTsrsExecutable();
  }

  const packageJson = resolvePackageJson("@typescript/native-preview");

  if (!packageJson) {
    throw new Error("The @typescript/native-preview package is not installed.");
  }

  return {
    path: path.join(path.dirname(packageJson), "bin", "tsgo"),
    useNodeRuntime: true,
  };
};

export const spawnCompiler = (
  executable: CompilerExecutable,
  args: string[],
  cwd: string,
  stdio: "inherit" | "pipe"
) =>
  Bun.spawnSync(
    executable.useNodeRuntime
      ? [process.execPath, executable.path, ...args]
      : [executable.path, ...args],
    {
      cwd,
      env: process.env,
      stderr: stdio,
      stdout: stdio,
    }
  );
