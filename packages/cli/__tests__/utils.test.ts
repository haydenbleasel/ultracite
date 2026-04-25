import { beforeEach, describe, expect, mock, test } from "bun:test";

import {
  detectFrameworks,
  ensureDirectory,
  exists,
  isMonorepo,
  updatePackageJson,
  validateFrameworkName,
} from "../src/utils";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("node:fs", () => ({
  accessSync: mock(() => {}),
  existsSync: mock(() => false),
  readFileSync: mock(() => "{}"),
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

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
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

    mock.module("node:fs", () => ({
      accessSync: mock(() => {
        throw new Error("ENOENT");
      }),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
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

    mock.module("node:fs", () => ({
      accessSync: mock((path: string) => {
        if (path === "pnpm-workspace.yaml") {
          return;
        }
        throw new Error("ENOENT");
      }),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
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

    mock.module("node:fs", () => ({
      accessSync: mock(() => {
        throw new Error("ENOENT");
      }),
      existsSync: mock(() => false),
      readFileSync: mock(() => '{"workspaces": ["packages/*"]}'),
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

    mock.module("node:fs", () => ({
      accessSync: mock(() => {
        throw new Error("ENOENT");
      }),
      existsSync: mock(() => false),
      readFileSync: mock(() => '{"workspace": true}'),
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

    mock.module("node:fs", () => ({
      accessSync: mock(() => {
        throw new Error("ENOENT");
      }),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
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

    mock.module("node:fs", () => ({
      accessSync: mock(() => {
        throw new Error("ENOENT");
      }),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
    }));

    const result = await isMonorepo();
    expect(result).toBe(false);
  });
});

describe("updatePackageJson", () => {
  test("updates devDependencies", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() =>
        Promise.resolve('{"name": "test", "devDependencies": {"old": "1.0.0"}}')
      ),
      writeFile: mockWriteFile,
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
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
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() =>
        Promise.resolve('{"name": "test", "dependencies": {"old": "1.0.0"}}')
      ),
      writeFile: mockWriteFile,
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
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

  test("updates type field", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
    }));

    await updatePackageJson({ type: "module" });

    expect(mockWriteFile).toHaveBeenCalled();
    const [writeCall] = mockWriteFile.mock.calls;
    const writtenContent = JSON.parse(writeCall[1]);
    expect(writtenContent.type).toBe("module");
  });

  test("updates scripts", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() =>
        Promise.resolve('{"name": "test", "scripts": {"test": "echo test"}}')
      ),
      writeFile: mockWriteFile,
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
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

    mock.module("node:fs", () => ({
      accessSync: mock(() => {
        throw new Error("ENOENT");
      }),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
    }));

    const result = await isMonorepo();
    expect(result).toBe(false);
  });
});

describe("ensureDirectory", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("creates parent directory for nested paths", async () => {
    const mockMkdirSync = mock(() => {});
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      mkdirSync: mockMkdirSync,
      readFileSync: mock(() => "{}"),
    }));

    await ensureDirectory("some/nested/file.txt");
    expect(mockMkdirSync).toHaveBeenCalledWith("some/nested", {
      recursive: true,
    });
  });

  test("strips leading ./ from directory path", async () => {
    const mockMkdirSync = mock(() => {});
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      mkdirSync: mockMkdirSync,
      readFileSync: mock(() => "{}"),
    }));

    await ensureDirectory("./some/file.txt");
    expect(mockMkdirSync).toHaveBeenCalledWith("some", { recursive: true });
  });

  test("does not create directory for root-level files", async () => {
    const mockMkdirSync = mock(() => {});
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      mkdirSync: mockMkdirSync,
      readFileSync: mock(() => "{}"),
    }));

    await ensureDirectory("file.txt");
    expect(mockMkdirSync).not.toHaveBeenCalled();
  });
});

describe("updatePackageJson error handling", () => {
  test("throws when readPackageJson returns null", () => {
    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve("null")),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "null"),
    }));

    expect(
      updatePackageJson({ devDependencies: { test: "1.0.0" } })
    ).rejects.toThrow("Failed to parse package.json");
  });
});

describe("validateFrameworkName", () => {
  test("returns valid framework names", () => {
    expect(validateFrameworkName("react")).toBe("react");
    expect(validateFrameworkName("next")).toBe("next");
    expect(validateFrameworkName("solid-js")).toBe("solid-js");
  });

  test("throws for names with uppercase characters", () => {
    expect(() => validateFrameworkName("React")).toThrow(
      "Invalid framework name"
    );
  });

  test("throws for names starting with a number", () => {
    expect(() => validateFrameworkName("123start")).toThrow(
      "Invalid framework name"
    );
  });

  test("throws for names with special characters", () => {
    expect(() => validateFrameworkName("react@latest")).toThrow(
      "Invalid framework name"
    );
  });
});

describe("detectFrameworks", () => {
  beforeEach(() => {
    mock.restore();
  });

  const mockFs = (
    files: Record<string, string>,
    globResults: string[] = []
  ) => {
    mock.module("node:fs/promises", () => ({
      access: mock((path: string) =>
        path in files ? Promise.resolve() : Promise.reject(new Error("ENOENT"))
      ),
      readFile: mock((path: string) =>
        path in files
          ? Promise.resolve(files[path])
          : Promise.reject(new Error("ENOENT"))
      ),
      writeFile: mock(() => Promise.resolve()),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock((path: string) => {
        if (!(path in files)) {
          throw new Error("ENOENT");
        }
      }),
      existsSync: mock((path: string) => path in files),
      readFileSync: mock((path: string) => {
        if (path in files) {
          return files[path];
        }
        throw new Error("ENOENT");
      }),
    }));
    mock.module("glob", () => ({
      glob: mock(() => Promise.resolve(globResults)),
    }));
  };

  test("detects frameworks from root package.json deps", async () => {
    mockFs({
      "package.json": JSON.stringify({
        dependencies: { next: "^15.0.0" },
        devDependencies: { vitest: "^2.0.0" },
      }),
    });

    const result = await detectFrameworks();
    expect(new Set(result)).toEqual(new Set(["next", "react", "vitest"]));
  });

  test("expands meta-framework deps to implied frameworks", async () => {
    mockFs({
      "package.json": JSON.stringify({
        dependencies: { "@remix-run/react": "^2.0.0" },
      }),
    });

    const result = await detectFrameworks();
    expect(new Set(result)).toEqual(new Set(["react", "remix"]));
  });

  test("handles peerDependencies", async () => {
    mockFs({
      "package.json": JSON.stringify({
        peerDependencies: { svelte: "^5.0.0" },
      }),
    });

    const result = await detectFrameworks();
    expect(result).toEqual(["svelte"]);
  });

  test("returns empty array when no known framework deps present", async () => {
    mockFs({
      "package.json": JSON.stringify({
        dependencies: { lodash: "^4.0.0" },
      }),
    });

    const result = await detectFrameworks();
    expect(result).toEqual([]);
  });

  test("returns empty array when package.json is missing", async () => {
    mockFs({});
    const result = await detectFrameworks();
    expect(result).toEqual([]);
  });

  test("scans workspace package.jsons in npm/yarn/bun monorepos", async () => {
    mockFs(
      {
        "apps/web/package.json": JSON.stringify({
          dependencies: { next: "^15.0.0" },
        }),
        "package.json": JSON.stringify({ workspaces: ["apps/*"] }),
        "packages/ui/package.json": JSON.stringify({
          devDependencies: { vitest: "^2.0.0" },
        }),
      },
      ["apps/web/package.json", "packages/ui/package.json"]
    );

    const result = await detectFrameworks();
    expect(new Set(result)).toEqual(new Set(["next", "react", "vitest"]));
  });

  test("handles workspaces declared as object form (yarn classic)", async () => {
    mockFs(
      {
        "apps/web/package.json": JSON.stringify({
          dependencies: { astro: "^4.0.0" },
        }),
        "package.json": JSON.stringify({
          workspaces: { packages: ["apps/*"] },
        }),
      },
      ["apps/web/package.json"]
    );

    const result = await detectFrameworks();
    expect(result).toEqual(["astro"]);
  });

  test("scans workspace package.jsons in pnpm monorepos", async () => {
    mockFs(
      {
        "apps/web/package.json": JSON.stringify({
          dependencies: { vue: "^3.0.0" },
        }),
        "package.json": JSON.stringify({ name: "root" }),
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      },
      ["apps/web/package.json"]
    );

    const result = await detectFrameworks();
    expect(result).toEqual(["vue"]);
  });

  test("deduplicates frameworks across workspaces", async () => {
    mockFs(
      {
        "apps/a/package.json": JSON.stringify({
          dependencies: { next: "^15.0.0" },
        }),
        "apps/b/package.json": JSON.stringify({
          dependencies: { next: "^15.0.0" },
        }),
        "package.json": JSON.stringify({ workspaces: ["apps/*"] }),
      },
      ["apps/a/package.json", "apps/b/package.json"]
    );

    const result = await detectFrameworks();
    expect(new Set(result)).toEqual(new Set(["next", "react"]));
  });
});

// Note: detectLinter tests live in detect-linter.test.ts to avoid mock leaking
// from fix.test.ts and check.test.ts which replace the ../src/utils module.
