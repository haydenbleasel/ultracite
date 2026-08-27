import { mock } from "bun:test";
import {
  readdirSync as _realReaddirSync,
  readFileSync as _realReadFileSync,
} from "node:fs";

import { spawnSync as _realSpawnSync } from "../src/spawn-sync";

// Typed globals for the real implementations captured below, so consumers
// (mock-fs.ts, spawn-sync.test.ts) can read them without type assertions.
declare global {
  var __realReaddirSync: typeof _realReaddirSync;
  var __realReadFileSync: typeof _realReadFileSync;
  var __realSpawnSync: typeof _realSpawnSync;
}

// Capture real fs functions before mocking so tests that need them can use them
globalThis.__realReaddirSync = _realReaddirSync;
globalThis.__realReadFileSync = _realReadFileSync;

// Capture the real spawn-sync adapter before any test file mocks the module,
// so spawn-sync.test.ts can exercise the actual implementation regardless of
// test-file order.
globalThis.__realSpawnSync = _realSpawnSync;

// Mock fast-glob before any imports that use it
// This is needed for tsconfig.test.ts and other tests that scan for files
mock.module("fast-glob", () => ({
  default: mock(() => Promise.resolve([])),
}));

// Mock find-workspaces (used by detectFrameworks) so tests never scan the real
// filesystem for monorepo members; utils.test.ts overrides this per test.
mock.module("find-workspaces", () => ({
  findWorkspaces: mock(() => []),
}));

// Mock node:fs to provide accessSync (used by the sync exists() helper)
// Individual tests can override this by calling mock.module("node:fs", ...) themselves
// readdirSync passes through to the real implementation because
// oxlint-config.test.ts needs it to read real config files from disk.
mock.module("node:fs", () => ({
  accessSync: mock(() => {
    throw new Error("ENOENT");
  }),
  existsSync: mock(() => false),
  lstatSync: mock(() => ({
    isSymbolicLink: () => false,
  })),
  mkdirSync: mock(() => {}),
  mkdtempSync: mock((prefix: string) => `${prefix}mock`),
  readFileSync: mock(() => "{}"),
  readdirSync: _realReaddirSync,
  realpathSync: mock((path: string) => path),
  rmSync: mock(() => {}),
  writeFileSync: mock(() => {}),
}));
