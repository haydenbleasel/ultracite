import { mock } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { bench, group, run } from "mitata";

import {
  detectLinter,
  ensureDirectory,
  exists,
  isMonorepo,
  updatePackageJson,
} from "../src/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-empty-function -- noop stub for mocks
const noop = () => {};

const makeTmpDir = (files: Record<string, string> = {}): string => {
  const dir = join(
    tmpdir(),
    `ultracite-bench-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, content);
  }
  return dir;
};

const dirs: string[] = [];
const tmpDir = (files: Record<string, string> = {}): string => {
  const dir = makeTmpDir(files);
  dirs.push(dir);
  return dir;
};

// ---------------------------------------------------------------------------
// 1. detectLinter — called on every `check` and `fix` invocation
// ---------------------------------------------------------------------------

group("detectLinter", () => {
  const biomeDir = tmpDir({ "biome.json": "{}" });
  const eslintDir = tmpDir({ "eslint.config.mjs": "" });
  const oxlintDir = tmpDir({ "oxlint.config.ts": "" });
  const emptyDir = tmpDir();

  bench("biome config in cwd", () => {
    detectLinter(biomeDir);
  });

  bench("eslint config in cwd", () => {
    detectLinter(eslintDir);
  });

  bench("oxlint config in cwd", () => {
    detectLinter(oxlintDir);
  });

  bench("no config (full traversal to root)", () => {
    detectLinter(emptyDir);
  });
});

// ---------------------------------------------------------------------------
// 2. exists
// ---------------------------------------------------------------------------

group("exists", () => {
  const dir = tmpDir({ "test.txt": "hello" });
  const filePath = join(dir, "test.txt");
  const missingPath = join(dir, "missing.txt");

  bench("existing file", () => {
    exists(filePath);
  });

  bench("missing file", () => {
    exists(missingPath);
  });
});

// ---------------------------------------------------------------------------
// 3. Config file lookups
// ---------------------------------------------------------------------------

group("config lookups", () => {
  const prettierNoneDir = tmpDir({ "package.json": JSON.stringify({}) });
  const prettierHitDir = tmpDir({
    "package.json": JSON.stringify({ prettier: {} }),
  });

  bench("prettier config — miss (18 checks)", async () => {
    const origCwd = process.cwd();
    process.chdir(prettierNoneDir);
    try {
      const { prettier } = await import("../src/linters/prettier");
      prettier.exists();
    } finally {
      process.chdir(origCwd);
    }
  });

  bench("prettier config — hit (package.json key)", async () => {
    const origCwd = process.cwd();
    process.chdir(prettierHitDir);
    try {
      const { prettier } = await import("../src/linters/prettier");
      prettier.exists();
    } finally {
      process.chdir(origCwd);
    }
  });

  const stylelintNoneDir = tmpDir({ "package.json": JSON.stringify({}) });
  const stylelintHitDir = tmpDir({
    "package.json": JSON.stringify({ stylelint: {} }),
  });

  bench("stylelint config — miss (11 checks)", async () => {
    const origCwd = process.cwd();
    process.chdir(stylelintNoneDir);
    try {
      const { stylelint } = await import("../src/linters/stylelint");
      stylelint.exists();
    } finally {
      process.chdir(origCwd);
    }
  });

  bench("stylelint config — hit (package.json key)", async () => {
    const origCwd = process.cwd();
    process.chdir(stylelintHitDir);
    try {
      const { stylelint } = await import("../src/linters/stylelint");
      stylelint.exists();
    } finally {
      process.chdir(origCwd);
    }
  });

  const eslintNoneDir = tmpDir({ "package.json": JSON.stringify({}) });
  const eslintHitDir = tmpDir({ "eslint.config.mjs": "" });

  bench("eslint config — miss (6 checks)", async () => {
    const origCwd = process.cwd();
    process.chdir(eslintNoneDir);
    try {
      const { eslint } = await import("../src/linters/eslint");
      eslint.exists();
    } finally {
      process.chdir(origCwd);
    }
  });

  bench("eslint config — hit (first path)", async () => {
    const origCwd = process.cwd();
    process.chdir(eslintHitDir);
    try {
      const { eslint } = await import("../src/linters/eslint");
      eslint.exists();
    } finally {
      process.chdir(origCwd);
    }
  });

  const lintStagedNoneDir = tmpDir({ "package.json": JSON.stringify({}) });

  bench("lint-staged config — miss (11 checks)", async () => {
    const origCwd = process.cwd();
    process.chdir(lintStagedNoneDir);
    try {
      const { lintStaged } = await import("../src/integrations/lint-staged");
      lintStaged.exists();
    } finally {
      process.chdir(origCwd);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. check command dispatch (mocked child processes)
// ---------------------------------------------------------------------------

const mockSpawn = () => ({ status: 0, stderr: "", stdout: "" });

group("check command dispatch", () => {
  bench("biome check (mocked)", async () => {
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
      exists: () => true,
    }));
    const { check } = await import("../src/commands/check");
    await check();
    mock.restore();
  });

  bench("eslint check — 3 sequential tools (mocked)", async () => {
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: () => "eslint",
      exists: () => true,
    }));
    const { check } = await import("../src/commands/check");
    await check();
    mock.restore();
  });

  bench("oxlint check — 2 sequential tools (mocked)", async () => {
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
      exists: () => true,
    }));
    const { check } = await import("../src/commands/check");
    await check();
    mock.restore();
  });
});

// ---------------------------------------------------------------------------
// 5. doctor (mocked)
// ---------------------------------------------------------------------------

group("doctor", () => {
  const fullDir = tmpDir({
    "biome.json": JSON.stringify({ extends: ["ultracite/biome/core"] }),
    "eslint.config.mjs": 'import core from "ultracite/eslint/core";',
    "oxlint.config.ts": 'import core from "ultracite/oxlint/core";',
    "package.json": JSON.stringify({
      devDependencies: { ultracite: "^7.0.0" },
    }),
  });

  bench("full doctor run (mocked)", async () => {
    const origCwd = process.cwd();
    try {
      process.chdir(fullDir);
    } catch {
      return;
    }
    try {
      mock.module("cross-spawn", () => ({
        sync: () => ({ status: 0, stderr: "", stdout: "1.0.0\n" }),
      }));
      mock.module("@clack/prompts", () => ({
        intro: noop,
        log: {
          error: noop,
          info: noop,
          success: noop,
          warn: noop,
        },
        outro: noop,
        spinner: () => ({
          message: noop,
          start: noop,
          stop: noop,
        }),
      }));
      const { doctor } = await import("../src/commands/doctor");
      await doctor();
    } finally {
      process.chdir(origCwd);
      mock.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// 6. isMonorepo detection
// ---------------------------------------------------------------------------

group("isMonorepo", () => {
  const pnpmDir = tmpDir({
    "pnpm-workspace.yaml": "packages:\n  - packages/*",
  });
  const npmDir = tmpDir({
    "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
  });
  const plainDir = tmpDir({ "package.json": JSON.stringify({}) });

  bench("pnpm workspace", async () => {
    const origCwd = process.cwd();
    process.chdir(pnpmDir);
    try {
      await isMonorepo();
    } finally {
      process.chdir(origCwd);
    }
  });

  bench("npm workspaces", async () => {
    const origCwd = process.cwd();
    process.chdir(npmDir);
    try {
      await isMonorepo();
    } finally {
      process.chdir(origCwd);
    }
  });

  bench("plain project (no workspaces)", async () => {
    const origCwd = process.cwd();
    process.chdir(plainDir);
    try {
      await isMonorepo();
    } finally {
      process.chdir(origCwd);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. updatePackageJson — called 2-3x during installDependencies
// ---------------------------------------------------------------------------

group("updatePackageJson", () => {
  const dir = tmpDir({
    "package.json": JSON.stringify({
      devDependencies: {},
      name: "test",
      scripts: {},
    }),
  });

  bench("single call", async () => {
    const origCwd = process.cwd();
    process.chdir(dir);
    try {
      await updatePackageJson({
        scripts: { check: "ultracite check", fix: "ultracite fix" },
      });
    } finally {
      process.chdir(origCwd);
    }
  });

  bench("two sequential calls (current init pattern)", async () => {
    const origCwd = process.cwd();
    process.chdir(dir);
    try {
      await updatePackageJson({
        devDependencies: { ultracite: "^7.0.0" },
      });
      await updatePackageJson({
        scripts: { check: "ultracite check", fix: "ultracite fix" },
      });
    } finally {
      process.chdir(origCwd);
    }
  });

  bench("three sequential calls (oxlint init pattern)", async () => {
    const origCwd = process.cwd();
    process.chdir(dir);
    try {
      await updatePackageJson({
        devDependencies: { ultracite: "^7.0.0" },
      });
      await updatePackageJson({
        scripts: { check: "ultracite check", fix: "ultracite fix" },
      });
      await updatePackageJson({ type: "module" });
    } finally {
      process.chdir(origCwd);
    }
  });
});

// ---------------------------------------------------------------------------
// 8. ensureDirectory
// ---------------------------------------------------------------------------

group("ensureDirectory", () => {
  const baseDir = tmpDir();

  bench("shallow path", async () => {
    await ensureDirectory(join(baseDir, "a/file.txt"));
  });

  bench("deep nested path", async () => {
    await ensureDirectory(join(baseDir, "a/b/c/d/file.txt"));
  });
});

// ---------------------------------------------------------------------------

await run();

// Cleanup
for (const dir of dirs) {
  if (existsSync(dir)) {
    rmSync(dir, { force: true, recursive: true });
  }
}
