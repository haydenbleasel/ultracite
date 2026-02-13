import { beforeEach, describe, expect, mock, test } from "bun:test";
import { husky } from "../src/integrations/husky";

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ status: 0 })),
  execSync: mock(() => ""),
}));

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  removeDependency: mock(() => Promise.resolve()),
}));

describe("husky", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when pre-commit hook exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const result = await husky.exists();
      expect(result).toBe(true);
    });

    test("returns false when pre-commit hook does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
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
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install("npm");

      expect(mockAddDep).toHaveBeenCalledWith("husky", expect.any(Object));
    });

    test("adds prepare script to package.json", async () => {
      const mockReadFile = mock(() => Promise.resolve('{"name": "test"}'));
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mockReadFile,
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.scripts?.prepare).toBe("husky");
    });
  });

  describe("create", () => {
    test("creates .husky directory", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mockMkdir,
      }));

      await husky.create("npm");

      expect(mockMkdir).toHaveBeenCalledWith(".husky", { recursive: true });
    });

    test("creates standalone hook when useLintStaged is false", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      await husky.create("npm", false);

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.husky/pre-commit");
      expect(writeCall[1]).toContain("#!/bin/sh");
      expect(writeCall[1]).toContain("npx ultracite");
      expect(writeCall[1]).toContain("# ultracite");
    });

    test("creates lint-staged hook when useLintStaged is true", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));
      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.create("npm", true);

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.husky/pre-commit");
      expect(writeCall[1]).toContain("npx lint-staged");
      expect(writeCall[1]).not.toContain("npx ultracite");
    });

    test("standalone hook does not use git stash", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      await husky.create("npm", false);

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).not.toContain("git stash");
    });
  });

  describe("update", () => {
    test("appends to existing hook that has no ultracite marker", async () => {
      const existingContent = '#!/bin/sh\necho "existing"';
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      await husky.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("existing");
      expect(writeCall[1]).toContain("npx ultracite");
      expect(writeCall[1]).toContain("# ultracite");
    });

    test("replaces existing ultracite section on re-run", async () => {
      const existingContent =
        '#!/bin/sh\necho "other"\n# ultracite\n#!/bin/sh\nnpx ultracite fix\n';
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      await husky.update("npm");

      const writeCall = mockWriteFile.mock.calls[0];
      const written = writeCall[1] as string;
      // Should contain the "other" line
      expect(written).toContain("other");
      // Should have exactly one ultracite marker
      const markerCount = (written.match(/# ultracite/g) || []).length;
      expect(markerCount).toBe(1);
    });

    test("uses lint-staged hook when useLintStaged is true", async () => {
      const existingContent = "#!/bin/sh";
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));
      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.update("npm", true);

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("npx lint-staged");
      expect(writeCall[1]).not.toContain("npx ultracite");
    });
  });
});
