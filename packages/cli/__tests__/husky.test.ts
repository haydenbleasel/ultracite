import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { PackageManager } from "nypm";

import { husky } from "../src/integrations/husky";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

const npmPm: PackageManager = { command: "npm", name: "npm" };

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
  removeDependency: mock(() => Promise.resolve()),
}));

// A project whose files are exactly `files`; returns what gets written.
const mockProject = (files: Record<string, string>) => {
  const written = new Map<string, string>();

  mock.module("node:fs/promises", () => ({
    access: mock((path: string) =>
      path in files ? Promise.resolve() : Promise.reject(new Error("ENOENT"))
    ),
    mkdir: mock(() => Promise.resolve()),
    readFile: mock((path: string) =>
      path in files
        ? Promise.resolve(files[path])
        : Promise.reject(new Error("ENOENT"))
    ),
    writeFile: mock((path: string, content: string) => {
      written.set(path, content);
      return Promise.resolve();
    }),
  }));
  mockFileSystem(files);

  return written;
};

const countMarkers = (script: string | undefined): number =>
  (script ?? "").split("\n").filter((line) => line === "# ultracite").length;

describe("husky", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when pre-commit hook exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await husky.exists();
      expect(result).toBe(true);
    });

    test("returns false when pre-commit hook does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await husky.exists();
      expect(result).toBe(false);
    });
  });

  describe("install", () => {
    test("installs husky dependency", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install(npmPm);

      expect(mockAddDep).toHaveBeenCalledWith("husky", expect.any(Object));
    });

    test("adds prepare script to package.json", async () => {
      const mockReadFile = mock((_path: string) =>
        Promise.resolve('{"name": "test"}')
      );
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mockReadFile,
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install(npmPm);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.scripts?.prepare).toBe("husky");
    });
  });

  describe("create", () => {
    test("creates .husky directory", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mockMkdir,
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      await husky.create("npm");

      expect(mockMkdir).toHaveBeenCalledWith(".husky", { recursive: true });
    });

    test("creates standalone hook when useLintStaged is false", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./.husky/pre-commit");
      expect(writeCall[1]).toContain("#!/bin/sh");
      expect(writeCall[1]).toContain("npx ultracite");
      expect(writeCall[1]).toContain("# ultracite");
    });

    test("creates lint-staged hook when useLintStaged is true", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));
      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.create("npm", true);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./.husky/pre-commit");
      expect(writeCall[1]).toContain("npx lint-staged");
      expect(writeCall[1]).not.toContain("npx ultracite");
    });

    test("standalone hook does not use git stash", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).not.toContain("git stash");
    });

    test("standalone hook terminates git add options before filenames", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain('git add -- "$file"');
    });
  });

  describe("update", () => {
    test("appends to existing hook that has no ultracite marker", async () => {
      const existingContent = '#!/bin/sh\necho "existing"';
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("existing");
      expect(writeCall[1]).toContain("npx ultracite");
      expect(writeCall[1]).toContain("# ultracite");
    });

    test("replaces existing ultracite section on re-run", async () => {
      const existingContent =
        '#!/bin/sh\necho "other"\n# ultracite\n#!/bin/sh\nnpx ultracite fix\n';
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      // Should contain the "other" line
      expect(written).toContain("other");
      // Should have exactly one ultracite start marker
      const markerCount = written
        .split("\n")
        .filter((line) => line === "# ultracite").length;
      expect(markerCount).toBe(1);
    });

    test("keeps user commands after the ultracite section on re-run", async () => {
      const existingContent = [
        '#!/bin/sh\necho "before"',
        "# ultracite",
        "#!/bin/sh",
        "npx ultracite fix",
        "# ultracite end",
        "npm test",
        "",
      ].join("\n");
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      expect(written).toContain('echo "before"');
      expect(written).toContain("npm test");
      const markerCount = written
        .split("\n")
        .filter((line) => line === "# ultracite").length;
      expect(markerCount).toBe(1);
      // npm test must come after the replaced section
      expect(written.indexOf("npm test")).toBeGreaterThan(
        written.indexOf("# ultracite end")
      );
    });

    test("keeps user commands after a legacy standalone section", async () => {
      const existingContent = [
        "# ultracite",
        "#!/bin/sh",
        "npx ultracite fix",
        'echo "✨ Files formatted by Ultracite"',
        "npm test",
        "",
      ].join("\n");
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      expect(written).toContain("npm test");
      expect(written.indexOf("npm test")).toBeGreaterThan(
        written.indexOf("# ultracite end")
      );
    });

    test("standalone hook captures formatter failures without set -e", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      // set -e would abort the script before the failure-handling block runs
      expect(written).not.toContain("set -e");
      expect(written).toContain("|| FORMAT_EXIT_CODE=$?");
      expect(written).toContain("exit $FORMAT_EXIT_CODE");
    });

    test("uses lint-staged hook when useLintStaged is true", async () => {
      const existingContent = "#!/bin/sh";
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.update("npm", true);

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("npx lint-staged");
      expect(writeCall[1]).not.toContain("npx ultracite");
    });
  });

  describe("regressions", () => {
    test("chains onto an existing prepare script", async () => {
      const written = mockProject({
        "package.json": JSON.stringify({
          scripts: { prepare: "svelte-kit sync || echo ''" },
        }),
      });

      await husky.install(npmPm);
      restoreFileSystemMock();

      expect(
        JSON.parse(written.get("package.json") ?? "{}").scripts.prepare
      ).toBe("svelte-kit sync || echo '' && husky");
    });

    test("keeps a prepare script that already runs husky", async () => {
      const written = mockProject({
        "package.json": JSON.stringify({
          scripts: { prepare: "lefthook install && husky" },
        }),
      });

      await husky.install(npmPm);
      restoreFileSystemMock();

      expect(
        JSON.parse(written.get("package.json") ?? "{}").scripts.prepare
      ).toBe("lefthook install && husky");
    });

    test("runs the project's installed tools with Yarn and pnpm", async () => {
      const written = mockProject({});

      await husky.create("yarn", true);
      expect(written.get("./.husky/pre-commit")).toContain(
        "\nyarn lint-staged\n"
      );

      await husky.create("pnpm", false);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).toContain("pnpm exec ultracite fix || FORMAT_EXIT_CODE");
      expect(script).not.toContain("dlx");
    });

    test("initializes husky with the installed binary", () => {
      const mockSpawn = mock(() => ({ status: 0 }));
      mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

      husky.init("pnpm");

      expect(mockSpawn).toHaveBeenCalledWith("pnpm", ["exec", "husky"], {
        stdio: "pipe",
      });
    });

    test("lets commands after the section run when nothing is staged", async () => {
      const written = mockProject({});

      await husky.create("npm", false);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).not.toContain("exit 0");
      expect(script).toContain('echo "No staged files to format"\nelse');
    });

    test("replaces the section of a CRLF hook instead of appending another", async () => {
      const written = mockProject({
        "./.husky/pre-commit":
          "npm test\r\n# ultracite\r\n#!/bin/sh\r\nnpx lint-staged\r\n# ultracite end\r\n",
      });

      await husky.update("npm", true);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit");
      expect(countMarkers(script)).toBe(1);
      expect(script).toContain("npm test\n# ultracite\n");
      expect(script).not.toContain("\r");
    });

    test("keeps the last line when the hook only mentions ultracite in a comment", async () => {
      const written = mockProject({
        "./.husky/pre-commit": "# ultracite runs below\nnpm test",
      });

      await husky.update("npm", true);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).toContain("# ultracite runs below\nnpm test\n");
      expect(countMarkers(script)).toBe(1);
    });

    test("keeps user commands after a legacy lint-staged section", async () => {
      const written = mockProject({
        "./.husky/pre-commit":
          "# ultracite\n#!/bin/sh\nyarn dlx lint-staged\nnpm test\n",
      });

      await husky.update("yarn", true);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).toContain("# ultracite end\nnpm test\n");
      expect(script).toContain("\nyarn lint-staged\n");
      expect(script).not.toContain("dlx");
    });
  });
});
