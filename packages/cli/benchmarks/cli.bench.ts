import { mock } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { bench, group, run } from "mitata";

import { detectLinter, exists, isMonorepo } from "../src/utils";

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

  bench("biome config in cwd", async () => {
    await detectLinter(biomeDir);
  });

  bench("eslint config in cwd", async () => {
    await detectLinter(eslintDir);
  });

  bench("oxlint config in cwd", async () => {
    await detectLinter(oxlintDir);
  });

  bench("no config (full traversal to root)", async () => {
    await detectLinter(emptyDir);
  });
});

// ---------------------------------------------------------------------------
// 2. exists — the building block for config detection
// ---------------------------------------------------------------------------

group("exists", () => {
  const dir = tmpDir({ "test.txt": "hello" });
  const filePath = join(dir, "test.txt");
  const missingPath = join(dir, "missing.txt");

  bench("existing file", async () => {
    await exists(filePath);
  });

  bench("missing file", async () => {
    await exists(missingPath);
  });
});

// ---------------------------------------------------------------------------
// 3. check command dispatch (mocked child processes)
//    Measures overhead of linter detection + command dispatch, not the
//    linters themselves.
// ---------------------------------------------------------------------------

const mockSpawn = () => ({ status: 0, stderr: "", stdout: "" });

group("check command dispatch", () => {
  bench("biome check (mocked)", async () => {
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
      exists: () => Promise.resolve(true),
    }));
    const { check } = await import("../src/commands/check");
    await check();
    mock.restore();
  });

  bench("eslint check — 3 sequential tools (mocked)", async () => {
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: () => "eslint",
      exists: () => Promise.resolve(true),
    }));
    const { check } = await import("../src/commands/check");
    await check();
    mock.restore();
  });

  bench("oxlint check — 2 sequential tools (mocked)", async () => {
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
      exists: () => Promise.resolve(true),
    }));
    const { check } = await import("../src/commands/check");
    await check();
    mock.restore();
  });
});

// ---------------------------------------------------------------------------
// 4. doctor (mocked) — runs 8 sequential checks
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
// 5. isMonorepo detection
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

await run();

// Cleanup
for (const dir of dirs) {
  if (existsSync(dir)) {
    rmSync(dir, { force: true, recursive: true });
  }
}
