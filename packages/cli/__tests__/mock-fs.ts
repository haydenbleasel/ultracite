import { mock } from "bun:test";

/**
 * Scoped node:fs mocking for tests that need a project layout on disk.
 *
 * Bun's mock.module is global and mock.restore() doesn't undo it, so a mock
 * installed by one test file bleeds into the next. `restoreFileSystemMock`
 * puts back the defaults the test preload installs, keeping the blast radius
 * to the test that opted in.
 */
/**
 * `links` maps a path to the path its symbolic link points at: reads and
 * existence checks follow it, `lstatSync` reports it as a link, and
 * `realpathSync` resolves it.
 */
export const mockFileSystem = (
  files: Record<string, string>,
  links: Record<string, string> = {}
): void => {
  const resolve = (filePath: string): string =>
    links[String(filePath)] ?? String(filePath);

  mock.module("node:fs", () => ({
    accessSync: mock((filePath: string) => {
      if (!(resolve(filePath) in files)) {
        throw new Error("ENOENT");
      }
    }),
    existsSync: mock((filePath: string) => resolve(filePath) in files),
    lstatSync: mock((filePath: string) => ({
      isSymbolicLink: () => String(filePath) in links,
    })),
    mkdirSync: mock(() => {}),
    readFileSync: mock((filePath: string) => {
      const content = files[resolve(filePath)];

      if (content === undefined) {
        throw new Error("ENOENT");
      }

      return content;
    }),
    // The real readdirSync, captured (and typed via `declare global`) by the
    // test preload before it installs the default node:fs mock.
    readdirSync: globalThis.__realReaddirSync,
    realpathSync: mock(resolve),
    writeFileSync: mock(() => {}),
  }));
};

/**
 * The node:fs mock the test preload installs: every path is missing and
 * writes do nothing. readdirSync stays real because oxlint-config.test.ts
 * reads the real config files.
 */
export const defaultFileSystemMock = () => ({
  accessSync: mock(() => {
    throw new Error("ENOENT");
  }),
  existsSync: mock(() => false),
  lstatSync: mock(() => ({ isSymbolicLink: () => false })),
  mkdirSync: mock(() => {}),
  mkdtempSync: mock((prefix: string) => `${prefix}mock`),
  readFileSync: mock(() => "{}"),
  readdirSync: globalThis.__realReaddirSync,
  realpathSync: mock((filePath: string) => filePath),
  rmSync: mock(() => {}),
  writeFileSync: mock(() => {}),
});

export const restoreFileSystemMock = (): void => {
  mock.module("node:fs", defaultFileSystemMock);
};
