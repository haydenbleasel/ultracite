import { beforeEach, describe, expect, mock, test } from "bun:test";

import { exists, isMonorepo, updatePackageJson } from "../src/utils";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("exists", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("returns true when file exists", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await exists("./test.txt");
    expect(result).toBe(true);
  });

  test("returns false when file does not exist", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await exists("./nonexistent.txt");
    expect(result).toBe(false);
  });
});

describe("isMonorepo", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("returns true when pnpm-workspace.yaml exists", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock((path: string) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.resolve();
        }
        return Promise.reject(new Error("ENOENT"));
      }),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await isMonorepo();
    expect(result).toBe(true);
  });

  test("returns true when package.json has workspaces", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve('{"workspaces": ["packages/*"]}')),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await isMonorepo();
    expect(result).toBe(true);
  });

  test("returns true when package.json has workspace field", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve('{"workspace": true}')),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await isMonorepo();
    expect(result).toBe(true);
  });

  test("returns false for non-monorepo", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await isMonorepo();
    expect(result).toBe(false);
  });

  test("returns false when package.json parses to null", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve("null")),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await isMonorepo();
    expect(result).toBe(false);
  });
});

describe("updatePackageJson", () => {
  test("updates devDependencies", async () => {
    const mockWriteFile = mock((_path: string, _content: string) => Promise.resolve());
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() =>
        Promise.resolve('{"name": "test", "devDependencies": {"old": "1.0.0"}}')
      ),
      writeFile: mockWriteFile,
    }));

    await updatePackageJson({
      devDependencies: {
        "new-package": "2.0.0",
      },
    });

    expect(mockWriteFile).toHaveBeenCalled();
    const [writeCall] = mockWriteFile.mock.calls;
    const writtenContent = JSON.parse(writeCall[1]);
    expect(writtenContent.devDependencies).toEqual({
      "new-package": "2.0.0",
      old: "1.0.0",
    });
  });

  test("updates dependencies", async () => {
    const mockWriteFile = mock((_path: string, _content: string) => Promise.resolve());
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() =>
        Promise.resolve('{"name": "test", "dependencies": {"old": "1.0.0"}}')
      ),
      writeFile: mockWriteFile,
    }));

    await updatePackageJson({
      dependencies: {
        "new-package": "2.0.0",
      },
    });

    expect(mockWriteFile).toHaveBeenCalled();
    const [writeCall] = mockWriteFile.mock.calls;
    const writtenContent = JSON.parse(writeCall[1]);
    expect(writtenContent.dependencies).toEqual({
      "new-package": "2.0.0",
      old: "1.0.0",
    });
  });

  test("updates scripts", async () => {
    const mockWriteFile = mock((_path: string, _content: string) => Promise.resolve());
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() =>
        Promise.resolve('{"name": "test", "scripts": {"test": "echo test"}}')
      ),
      writeFile: mockWriteFile,
    }));

    await updatePackageJson({
      scripts: {
        build: "tsc",
      },
    });

    expect(mockWriteFile).toHaveBeenCalled();
    const [writeCall] = mockWriteFile.mock.calls;
    const writtenContent = JSON.parse(writeCall[1]);
    expect(writtenContent.scripts).toEqual({
      build: "tsc",
      test: "echo test",
    });
  });
});

describe("isMonorepo error handling", () => {
  test("returns false when readFile throws an error", async () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.reject(new Error("ENOENT"))),
      writeFile: mock(() => Promise.resolve()),
    }));

    const result = await isMonorepo();
    expect(result).toBe(false);
  });
});
