import { mock } from "bun:test";
import {
  readdirSync as _realReaddirSync,
  readFileSync as _realReadFileSync,
} from "node:fs";

// Eagerly link nypm (and its transitive tinyexec, which does
// `import { spawn, spawnSync } from "node:child_process"`) against the real
// node:child_process before any test installs a partial mock of it. Several
// tests mock node:child_process with only a subset of exports (e.g. just
// spawnSync); because Bun's mock.module is global, whichever partial mock is
// active when tinyexec first links determines whether `spawn` resolves. Test
// file order differs between platforms, so on CI (Linux) a spawn-less mock can
// be active first, throwing "Export named 'spawn' not found in module
// 'node:child_process'". Linking it here makes resolution order-independent.
import "nypm";

// Capture real fs functions before mocking so tests that need them can use them
(globalThis as Record<string, unknown>).__realReaddirSync = _realReaddirSync;
(globalThis as Record<string, unknown>).__realReadFileSync = _realReadFileSync;

// Mock glob module before any imports that use it
// This is needed for tsconfig.test.ts and other tests that use glob
mock.module("glob", () => ({
  glob: mock(() => Promise.resolve([])),
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
  readFileSync: mock(() => "{}"),
  readdirSync: (...args: unknown[]) =>
    (
      globalThis as unknown as Record<string, (...a: unknown[]) => unknown>
    ).__realReaddirSync(...args),
  realpathSync: mock((path: string) => path),
  writeFileSync: mock(() => {}),
}));
