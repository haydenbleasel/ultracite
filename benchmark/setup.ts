import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

import { FIXTURE_COPIES } from "./config";
import type { Provider } from "./config";

const FIXTURES_SRC = path.join(import.meta.dirname, "fixtures", "src");

const CLI_PACKAGE_JSON = path.join(
  import.meta.dirname,
  "..",
  "packages",
  "cli",
  "package.json"
);

/**
 * The ESLint toolchain needs a few packages the generated config uses: the
 * stylelint config packages its stylelint config extends (`stylelint` alone
 * can't resolve them) and `storybook`, a required peer of the unconditionally
 * imported `eslint-plugin-storybook`. Newer `ultracite init --linter eslint`
 * installs these, but a `base` build predating that fix does not, so we install
 * them here to keep both builds runnable. Versions come from the CLI's own
 * package.json so they never drift. Benchmark-only setup — it does not change
 * what ultracite ships, and it is harmless when init already added them.
 */
const extraDevDependencies = (provider: Provider): Record<string, string> => {
  if (provider !== "eslint") {
    return {};
  }
  const cliPackageJson = JSON.parse(
    readFileSync(CLI_PACKAGE_JSON, "utf-8")
  ) as {
    devDependencies?: Record<string, string>;
  };
  const devDependencies = cliPackageJson.devDependencies ?? {};
  const names = [
    "storybook",
    "stylelint-config-standard",
    "stylelint-config-idiomatic-order",
    "stylelint-prettier",
  ];
  const result: Record<string, string> = {};
  for (const name of names) {
    const version = devDependencies[name];
    if (version) {
      result[name] = version;
    }
  }
  return result;
};

export interface PreparedProject {
  readonly buildLabel: string;
  readonly provider: Provider;
  /** Absolute path to the project directory the linter runs in. */
  readonly dir: string;
  /** Directory holding the pristine fixture tree, used to reset before `fix`. */
  readonly pristineDir: string;
  /** node_modules/.bin prepended onto PATH so the CLI resolves tool binaries. */
  readonly binPath: string;
}

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

const run = (
  command: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv
): RunResult => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
  };
};

const runOrThrow = (
  label: string,
  command: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv
): void => {
  const result = run(command, args, cwd, env);
  if (result.status !== 0) {
    throw new Error(
      `${label} failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`
    );
  }
};

const copyFixtures = (projectDir: string): void => {
  const srcDir = path.join(projectDir, "src");
  rmSync(srcDir, { force: true, recursive: true });
  mkdirSync(srcDir, { recursive: true });
  for (let copy = 0; copy < FIXTURE_COPIES; copy += 1) {
    cpSync(FIXTURES_SRC, path.join(srcDir, `copy-${copy}`), {
      recursive: true,
    });
  }
};

/** Restore the fixture tree from the pristine snapshot (used between `fix` runs). */
export const resetSrc = (project: PreparedProject): void => {
  const srcDir = path.join(project.dir, "src");
  rmSync(srcDir, { force: true, recursive: true });
  cpSync(path.join(project.pristineDir, "src"), srcDir, { recursive: true });
};

/**
 * Build one self-contained project: install the given ultracite tarball, run
 * the real `ultracite init` to generate the provider config, install the
 * provider's tools, and lay down the fixture tree. Everything here is
 * untimed — only the lint invocations in the harness are measured.
 */
export const prepareProject = (options: {
  workRoot: string;
  buildLabel: string;
  provider: Provider;
  tarball: string;
}): PreparedProject => {
  const { workRoot, buildLabel, provider, tarball } = options;
  const dir = path.join(workRoot, buildLabel, provider);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });

  const tarballAbsolute = path.resolve(tarball);
  const npmEnv: NodeJS.ProcessEnv = { CI: "1" };

  writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify(
      {
        name: `bench-${buildLabel}-${provider}`,
        private: true,
        version: "0.0.0",
      },
      null,
      2
    )}\n`
  );

  // Some ESLint plugins (e.g. eslint-plugin-github) declare older ESLint peer
  // ranges than the preset pins, so npm needs legacy peer resolution to
  // install the provider tools without erroring on the conflict.
  const npmInstallFlags = [
    "--no-audit",
    "--no-fund",
    "--loglevel=error",
    "--legacy-peer-deps",
  ];

  // 1. Install the ultracite build under test from its packed tarball.
  runOrThrow(
    "install ultracite tarball",
    "npm",
    ["install", tarballAbsolute, ...npmInstallFlags],
    dir,
    npmEnv
  );

  // 2. Generate the real provider config via `ultracite init` (no install —
  //    it records the provider's tool devDependencies into package.json).
  const ultraciteBin = path.join(
    dir,
    "node_modules",
    "ultracite",
    "dist",
    "index.js"
  );
  runOrThrow(
    "ultracite init",
    "node",
    [
      ultraciteBin,
      "init",
      "--linter",
      provider,
      "--pm",
      "npm",
      "--skip-install",
      "--quiet",
    ],
    dir,
    npmEnv
  );

  // 3. Keep ultracite pinned to the tarball (init records a version range for
  //    it); then install the provider tools it wrote into package.json.
  const packageJsonPath = path.join(dir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (packageJson.devDependencies) {
    delete packageJson.devDependencies.ultracite;
  }
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    ...extraDevDependencies(provider),
  };
  packageJson.dependencies = {
    ...packageJson.dependencies,
    ultracite: `file:${tarballAbsolute}`,
  };
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  runOrThrow(
    "install provider tools",
    "npm",
    ["install", ...npmInstallFlags],
    dir,
    npmEnv
  );

  // 4. Lay down the fixtures and snapshot a pristine copy for `fix` resets.
  copyFixtures(dir);
  const pristineDir = path.join(workRoot, buildLabel, `${provider}-pristine`);
  rmSync(pristineDir, { force: true, recursive: true });
  mkdirSync(pristineDir, { recursive: true });
  cpSync(path.join(dir, "src"), path.join(pristineDir, "src"), {
    recursive: true,
  });

  return {
    binPath: path.join(dir, "node_modules", ".bin"),
    buildLabel,
    dir,
    pristineDir,
    provider,
  };
};
