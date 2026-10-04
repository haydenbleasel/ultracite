import { describe, expect, mock, test } from "bun:test";

import { stylelint } from "../src/linters/stylelint";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("stylelint linter", () => {
  describe("exists", () => {
    test("returns true when stylelint key in package.json", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"stylelint": {}}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => '{"stylelint": {}}'),
      }));

      const result = await stylelint.exists();
      expect(result).toBe(true);
    });

    test("returns true when stylelint config file exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.stylelintrc.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./.stylelintrc.mjs") {
            return;
          }
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await stylelint.exists();
      expect(result).toBe(true);
    });

    test("returns false when no stylelint config exists", async () => {
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

      const result = await stylelint.exists();
      expect(result).toBe(false);
    });

    test("returns false when package.json read fails", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.reject(new Error("Read error"))),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => {
          throw new Error("Read error");
        }),
      }));

      const result = await stylelint.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates stylelint config file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await stylelint.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./stylelint.config.mjs");
      expect(writeCall[1]).toContain("ultracite/stylelint");
    });
  });

  describe("update", () => {
    test("updates stylelint config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await stylelint.update();

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});

// A project whose files are given as path → contents; every other path is
// missing. Returns the mocks that record writes, removals and warnings.
const mockProject = (files: Record<string, string>) => {
  const writeFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );
  const rm = mock((_path: string) => Promise.resolve());
  const warn = mock((_message: string) => {});
  const has = (filePath: string) => String(filePath) in files;
  const read = (filePath: string) => {
    if (!has(filePath)) {
      throw new Error("ENOENT");
    }
    return files[String(filePath)];
  };

  mock.module("node:fs/promises", () => ({
    readFile: mock((filePath: string) => Promise.resolve(read(filePath))),
    rm,
    writeFile,
  }));
  mock.module("node:fs", () => ({
    accessSync: mock((filePath: string) => {
      read(filePath);
    }),
    existsSync: mock(() => false),
    lstatSync: mock(() => ({ isSymbolicLink: () => false })),
    mkdirSync: mock(() => {}),
    readFileSync: mock(read),
    realpathSync: mock((filePath: string) => filePath),
  }));
  mock.module("@clack/prompts", () => ({
    log: { error: mock(), info: mock(), success: mock(), warn },
  }));

  return { rm, warn, writeFile };
};

describe("stylelint update keeps user content", () => {
  test("leaves a config that builds on Ultracite's unchanged", async () => {
    const project = mockProject({
      "./stylelint.config.mjs": `import ultracite from "ultracite/stylelint";

export default { ...ultracite, rules: { ...ultracite.rules, "color-named": null } };
`,
    });

    await stylelint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn).not.toHaveBeenCalled();
  });

  test("leaves a package.json key that extends Ultracite's config", async () => {
    const packageJson = '{"stylelint": {"extends": ["ultracite/stylelint"]}}';
    const project = mockProject({
      "./package.json": packageJson,
      "package.json": packageJson,
    });

    await stylelint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
  });

  test("replaces a config that doesn't use Ultracite and says so", async () => {
    const project = mockProject({
      "./.stylelintrc.json": '{ "extends": "stylelint-config-standard" }',
    });

    await stylelint.update();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./stylelint.config.mjs");
    expect(project.rm.mock.calls[0]?.[0]).toBe("./.stylelintrc.json");
    expect(project.warn.mock.calls[0]?.[0]).toContain(
      "Replaced .stylelintrc.json with stylelint.config.mjs"
    );
  });
});

describe("stylelint config precedence", () => {
  test("replaces the .stylelintrc.json Stylelint loads before stylelint.config.mjs", async () => {
    const project = mockProject({
      "./.stylelintrc.json": '{ "extends": "stylelint-config-standard" }',
      "./stylelint.config.mjs":
        'export { default } from "ultracite/stylelint";\n',
    });

    await stylelint.update();

    expect(project.rm.mock.calls.map(([filePath]) => filePath)).toEqual([
      "./.stylelintrc.json",
    ]);
  });
});
