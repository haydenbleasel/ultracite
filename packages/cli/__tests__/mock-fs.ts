import { mock } from "bun:test";

/**
 * Scoped node:fs mocking for tests that need a project layout on disk.
 *
 * Bun's mock.module is global and mock.restore() doesn't undo it, so a mock
 * installed by one test file bleeds into the next. `restoreFileSystemMock`
 * puts back the defaults the test preload installs, keeping the blast radius
 * to the test that opted in.
 */
const realReaddirSync = (
  globalThis as unknown as Record<string, (...args: unknown[]) => unknown>
).__realReaddirSync;

export const mockFileSystem = (files: Record<string, string>): void => {
  mock.module("node:fs", () => ({
    accessSync: mock((filePath: string) => {
      if (!(String(filePath) in files)) {
        throw new Error("ENOENT");
      }
    }),
    existsSync: mock((filePath: string) => String(filePath) in files),
    lstatSync: mock(() => ({ isSymbolicLink: () => false })),
    mkdirSync: mock(() => {}),
    readFileSync: mock((filePath: string) => {
      const content = files[String(filePath)];

      if (content === undefined) {
        throw new Error("ENOENT");
      }

      return content;
    }),
    readdirSync: (...args: unknown[]) => realReaddirSync(...args),
    realpathSync: mock((filePath: string) => filePath),
    writeFileSync: mock(() => {}),
  }));
};

export const restoreFileSystemMock = (): void => {
  mock.module("node:fs", () => ({
    accessSync: mock(() => {
      throw new Error("ENOENT");
    }),
    existsSync: mock(() => false),
    lstatSync: mock(() => ({ isSymbolicLink: () => false })),
    mkdirSync: mock(() => {}),
    readFileSync: mock(() => "{}"),
    readdirSync: (...args: unknown[]) => realReaddirSync(...args),
    realpathSync: mock((filePath: string) => filePath),
    writeFileSync: mock(() => {}),
  }));
};
