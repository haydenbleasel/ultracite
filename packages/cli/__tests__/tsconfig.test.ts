import { describe, expect, mock, test } from "bun:test";
import path from "node:path";

import { tsconfig } from "../src/tsconfig";

mock.module("fast-glob", () => ({
  default: mock(() => Promise.resolve([])),
}));

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("tsconfig", () => {
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  describe("exists", () => {
    test("returns true when tsconfig files are found", async () => {
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["tsconfig.json"])),
      }));

      const result = await tsconfig.exists();
      expect(result).toBe(true);
    });

    test("returns false when no tsconfig files are found", async () => {
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve([])),
      }));

      const result = await tsconfig.exists();
      expect(result).toBe(false);
    });

    test("returns false when glob throws an error", async () => {
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.reject(new Error("Glob error"))),
      }));

      const result = await tsconfig.exists();
      expect(result).toBe(false);
    });
  });

  describe("update", () => {
    test("skips modification when strict: true is already set", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"compilerOptions": {"strict": true}}')
        ),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      // Should not write because strict: true already enables strictNullChecks
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("skips modification when strictNullChecks: true is already set", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"compilerOptions": {"strictNullChecks": true}}')
        ),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      // Should not write because strictNullChecks is already true
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("adds strictNullChecks when not present", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"compilerOptions": {"target": "ES2020"}}')
        ),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.compilerOptions.strictNullChecks).toBe(true);
      expect(writtenContent.compilerOptions.target).toBe("ES2020");
    });

    test("preserves comments when modifying tsconfig", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      const tsconfigWithComments = `{
  // This is a comment
  "compilerOptions": {
    "target": "ES2020"
  }
}`;
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(tsconfigWithComments)),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, writtenContent] = writeCall;
      // Comments should be preserved
      expect(writtenContent).toContain("// This is a comment");
    });

    test("updates multiple tsconfig files", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("fast-glob", () => ({
        default: mock(() =>
          Promise.resolve(["tsconfig.json", "tsconfig.base.json"])
        ),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    test("skips files with invalid JSON instead of replacing them", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("invalid json")),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      // An unparseable tsconfig must not be replaced — that would wipe the
      // user's compiler options
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("handles write error gracefully", async () => {
      const mockWriteFile = mock(() =>
        Promise.reject(new Error("Permission denied"))
      );
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"compilerOptions": {"target": "ES2020"}}')
        ),
        writeFile: mockWriteFile,
      }));

      // Should not throw - logs warning instead
      await tsconfig.update();
    });

    test("does nothing when no tsconfig files found", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve([])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});

// tsconfig files on disk as path → contents (paths relative to the cwd, like
// fast-glob returns them), of which `updated` are the ones the glob finds.
// Returns the writeFile and warn mocks.
const mockTsConfigs = (
  files: Record<string, string>,
  updated = ["tsconfig.json"]
) => {
  const writeFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );
  const warn = mock((_message: string) => {});
  const byPath = new Map(
    Object.entries(files).map(([file, content]) => [
      path.resolve(file),
      content,
    ])
  );
  const read = (filePath: string) => {
    const content = byPath.get(path.resolve(String(filePath)));
    if (content === undefined) {
      throw new Error("ENOENT");
    }
    return content;
  };

  mock.module("fast-glob", () => ({
    default: mock(() => Promise.resolve(updated)),
  }));
  mock.module("node:fs/promises", () => ({
    readFile: mock((filePath: string) => Promise.resolve(read(filePath))),
    writeFile,
  }));
  mock.module("node:fs", () => ({
    accessSync: mock((filePath: string) => {
      read(filePath);
    }),
    existsSync: mock(() => false),
    lstatSync: mock(() => ({ isSymbolicLink: () => false })),
    mkdirSync: mock(() => {}),
    readFileSync: mock(() => "{}"),
    realpathSync: mock((filePath: string) => filePath),
  }));
  mock.module("@clack/prompts", () => ({
    log: { error: mock(), info: mock(), success: mock(), warn },
  }));

  return { warn, writeFile };
};

describe("strictNullChecks decisions", () => {
  test("leaves an explicit strictNullChecks: false alone", async () => {
    const project = mockTsConfigs({
      "tsconfig.json": '{ "compilerOptions": { "strictNullChecks": false } }',
    });

    await tsconfig.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn.mock.calls[0]?.[0]).toContain(
      "turns strictNullChecks off"
    );
  });

  test("skips a config that inherits strict from a relative base", async () => {
    const project = mockTsConfigs(
      {
        "packages/app/tsconfig.json": '{ "extends": "../../tsconfig.base" }',
        "tsconfig.base.json": '{ "compilerOptions": { "strict": true } }',
      },
      ["packages/app/tsconfig.json"]
    );

    await tsconfig.update();

    expect(project.writeFile).not.toHaveBeenCalled();
  });

  test("skips a config that inherits strict from a package", async () => {
    const project = mockTsConfigs({
      "node_modules/@tsconfig/strictest/tsconfig.json":
        '{ "compilerOptions": { "strict": true } }',
      "tsconfig.json": '{ "extends": ["@tsconfig/strictest/tsconfig.json"] }',
    });

    await tsconfig.update();

    expect(project.writeFile).not.toHaveBeenCalled();
  });

  test("still enables strictNullChecks when the base doesn't", async () => {
    const project = mockTsConfigs({
      "tsconfig.base.json": '{ "compilerOptions": { "target": "es2022" } }',
      "tsconfig.json": '{ "extends": "./tsconfig.base.json" }',
    });

    await tsconfig.update();

    const [[writtenPath, content]] = project.writeFile.mock.calls;
    expect(writtenPath).toBe("tsconfig.json");
    expect(JSON.parse(content).compilerOptions.strictNullChecks).toBe(true);
  });
});
