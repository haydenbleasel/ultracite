import { beforeEach, describe, expect, mock, test } from "bun:test";
import nodePath from "node:path";
import process from "node:process";

import { parse } from "jsonc-parser";

import { addMissingBiomeJsxRuntime, biome } from "../src/linters/biome";

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

// Point biome.update at ./biome.jsonc with the given contents.
const mockBiomeConfig = (
  contents: string,
  writeFile: (path: string, content: string) => Promise<void>
) => {
  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.resolve()),
    readFile: mock(() => Promise.resolve(contents)),
    writeFile,
  }));
  mock.module("node:fs", () => ({
    accessSync: mock((path: string) => {
      if (path !== "./biome.jsonc") {
        throw new Error("ENOENT");
      }
    }),
    existsSync: mock(() => false),
    readFileSync: mock(() => "{}"),
  }));
};

const classicTsConfig =
  '{\n  // React 16\n  "compilerOptions": { "jsx": "react", },\n}\n';

// A project with a .gitignore and these files, keyed by the path the CLI
// reads them from; `./biome.jsonc` is the Biome config.
const mockProject = (files: Record<string, string>) => {
  const mockWriteFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );

  const present = new Map(
    Object.entries({ ".gitignore": "node_modules\n", ...files })
  );

  const read = (path: string): string => {
    const content = present.get(String(path));

    if (content === undefined) {
      throw new Error("ENOENT");
    }

    return content;
  };

  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.resolve()),
    readFile: mock((path: string) => Promise.resolve(read(path))),
    writeFile: mockWriteFile,
  }));
  mock.module("node:fs", () => ({
    accessSync: mock((path: string) => {
      read(path);
    }),
    existsSync: mock(() => false),
    readFileSync: mock(read),
  }));

  return mockWriteFile;
};

// Biome reads ignore files only from its config's folder, and stops when
// that folder has no .git, .gitignore or .ignore.
const mockProjectFiles = (present: (path: string) => boolean) => {
  const mockWriteFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );

  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.reject(new Error("ENOENT"))),
    readFile: mock(() => Promise.resolve("{}")),
    writeFile: mockWriteFile,
  }));
  mock.module("node:fs", () => ({
    accessSync: mock((path: string) => {
      if (!present(path)) {
        throw new Error("ENOENT");
      }
    }),
    existsSync: mock(() => false),
    readFileSync: mock(() => "{}"),
  }));

  return mockWriteFile;
};

describe("biome", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when biome.json exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.json") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.json") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await biome.exists();
      expect(result).toBe(true);
    });

    test("returns true when biome.jsonc exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await biome.exists();
      expect(result).toBe(true);
    });

    test("returns false when no biome config exists", async () => {
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

      const result = await biome.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates biome config with default extends", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await biome.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual(["ultracite/biome/core"]);
      expect(writtenContent.$schema).toBe(
        "./node_modules/@biomejs/biome/configuration_schema.json"
      );
    });

    test("creates biome config with framework extends", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await biome.create({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/react",
        "ultracite/biome/next",
      ]);
    });

    test("creates biome config with type-aware extends", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await biome.create({ typeAware: true });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/type-aware",
      ]);
    });

    test("creates biome config with type-aware and frameworks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await biome.create({ frameworks: ["react"], typeAware: true });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/type-aware",
        "ultracite/biome/react",
      ]);
    });

    test("resolves the .biome.json dotfile when present", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./.biome.json") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await biome.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./.biome.json");
    });

    test("leaves version control alone when the project has a .gitignore", async () => {
      const mockWriteFile = mockProjectFiles((path) => path === ".gitignore");

      await biome.create();

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWriteFile.mock.calls[0][1]).vcs).toBeUndefined();
    });

    test("points Biome at the repository root from a package below it", async () => {
      const gitDirectory = nodePath.join(
        nodePath.dirname(process.cwd()),
        ".git"
      );

      const mockWriteFile = mockProjectFiles((path) => path === gitDirectory);

      await biome.create();

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWriteFile.mock.calls[0][1]).vcs).toEqual({
        root: "..",
      });
    });

    test("writes a .gitignore outside any repository", async () => {
      const mockWriteFile = mockProjectFiles(() => false);

      await biome.create();

      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      expect(JSON.parse(mockWriteFile.mock.calls[0][1]).vcs).toBeUndefined();
      expect(mockWriteFile.mock.calls[1]).toEqual([
        ".gitignore",
        "node_modules\n",
      ]);
    });
  });

  describe("update", () => {
    test("points an existing config below the repository root at that root", async () => {
      const gitDirectory = nodePath.join(
        nodePath.dirname(process.cwd()),
        ".git"
      );

      const mockWriteFile = mockProjectFiles((path) => path === gitDirectory);

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWriteFile.mock.calls[0][1]).vcs).toEqual({
        root: "..",
      });
    });

    test("writes a .gitignore for an existing config outside any repository", async () => {
      const mockWriteFile = mockProjectFiles(() => false);

      await biome.update();

      expect(mockWriteFile.mock.calls[1]).toEqual([
        ".gitignore",
        "node_modules\n",
      ]);
    });

    test("leaves version control alone when the config or project settles it", async () => {
      const withIgnoreFile = mockProjectFiles((path) => path === ".gitignore");

      await biome.update();

      expect(withIgnoreFile).toHaveBeenCalledTimes(1);
      expect(JSON.parse(withIgnoreFile.mock.calls[0][1]).vcs).toBeUndefined();

      const withVcs = mockProjectFiles(() => false);

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve('{"vcs":{"enabled":false}}')),
        writeFile: withVcs,
      }));

      await biome.update();

      expect(withVcs).toHaveBeenCalledTimes(1);
      expect(JSON.parse(withVcs.mock.calls[0][1]).vcs).toEqual({
        enabled: false,
      });
    });

    test("adds ultracite/biome/core to existing config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve('{"formatter": {"indentStyle": "tab"}}')
        ),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toContain("ultracite/biome/core");
      expect(writtenContent.formatter.indentStyle).toBe("tab");
    });

    test("does not duplicate ultracite/biome/core in extends", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve('{"extends": ["ultracite/biome/core"]}')
        ),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual(["ultracite/biome/core"]);
    });

    test("adds framework extends without duplicates", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve(
            '{"extends": ["ultracite/biome/core", "ultracite/biome/react"]}'
          )
        ),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await biome.update({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/react",
        "ultracite/biome/next",
      ]);
    });

    test("migrates all legacy ultracite/<name> entries to ultracite/biome/<name>", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve(
            '{"extends": ["ultracite/core", "ultracite/react", "ultracite/type-aware"]}'
          )
        ),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/react",
        "ultracite/biome/type-aware",
      ]);
    });

    test("does not remap already-correct ultracite/biome/* entries", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve(
            '{"extends": ["ultracite/biome/core", "ultracite/biome/react"]}'
          )
        ),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/react",
      ]);
    });

    test("dedupes when both legacy and new forms coexist", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }

          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve(
            '{"extends": ["ultracite/core", "ultracite/biome/core", "ultracite/react"]}'
          )
        ),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return;
          }

          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/react",
      ]);
    });

    test("leaves a config it can't parse unchanged", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mockBiomeConfig(
        '{\n  "linter": { "enabled": true },\n  "files": {',
        mockWriteFile
      );

      await biome.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("leaves a nested config that extends the root config unchanged", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mockBiomeConfig(
        '{\n  "root": false,\n  "extends": "//",\n  "linter": { "rules": { "style": { "noNonNullAssertion": "off" } } }\n}\n',
        mockWriteFile
      );

      await biome.update({ frameworks: ["react"] });

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("turns a string extends into a list", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mockBiomeConfig('{ "extends": "./shared.json" }', mockWriteFile);

      await biome.update();

      const [[, written]] = mockWriteFile.mock.calls;
      expect(JSON.parse(written).extends).toEqual([
        "./shared.json",
        "ultracite/biome/core",
      ]);
    });

    test("keeps comments and unrelated settings when updating", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mockBiomeConfig(
        [
          "{",
          "  // Shared settings for the app",
          '  "extends": ["ultracite"],',
          '  "files": { "includes": ["src/**"] } // only src',
          "}",
          "",
        ].join("\n"),
        mockWriteFile
      );

      await biome.update({ frameworks: ["react"] });

      const [[, written]] = mockWriteFile.mock.calls;
      expect(written).toContain("// Shared settings for the app");
      expect(written).toContain("// only src");
      expect(written).toContain('"files": { "includes": ["src/**"] }');
      expect(written).toContain('"ultracite/biome/react"');
      expect(written.indexOf('"$schema"')).toBeLessThan(
        written.indexOf('"extends"')
      );
    });
  });

  describe("classic JSX runtime", () => {
    test("create sets jsxRuntime when the tsconfig compiles JSX with the classic runtime", async () => {
      const mockWriteFile = mockProject({ "tsconfig.json": classicTsConfig });

      await biome.create({ frameworks: ["react"] });

      const [[writtenPath, written]] = mockWriteFile.mock.calls;
      expect(writtenPath).toBe("./biome.jsonc");
      expect(JSON.parse(written)).toEqual({
        $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
        extends: ["ultracite/biome/core", "ultracite/biome/react"],
        javascript: { jsxRuntime: "reactClassic" },
      });
    });

    test("create reads a jsconfig.json too", async () => {
      const mockWriteFile = mockProject({
        "jsconfig.json": '{ "compilerOptions": { "jsx": "react" } }',
      });

      await biome.create();

      expect(JSON.parse(mockWriteFile.mock.calls[0][1]).javascript).toEqual({
        jsxRuntime: "reactClassic",
      });
    });

    test.each([
      [
        "the automatic runtime",
        { "tsconfig.json": '{ "compilerOptions": { "jsx": "react-jsx" } }' },
      ],
      [
        "a jsx left for another tool",
        { "tsconfig.json": '{ "compilerOptions": { "jsx": "preserve" } }' },
      ],
      ["no tsconfig", {}],
    ])("create leaves javascript out with %s", async (_name, files) => {
      const mockWriteFile = mockProject(files);

      await biome.create();

      expect(JSON.parse(mockWriteFile.mock.calls[0][1])).not.toHaveProperty(
        "javascript"
      );
    });

    test("update adds jsxRuntime to a config without a javascript section", async () => {
      const mockWriteFile = mockProject({
        "./biome.jsonc": '{\n  "extends": ["ultracite/biome/core"]\n}\n',
        "tsconfig.json": classicTsConfig,
      });

      await biome.update();

      const [[, written]] = mockWriteFile.mock.calls;
      expect(JSON.parse(written).javascript).toEqual({
        jsxRuntime: "reactClassic",
      });
      expect(written.indexOf('"extends"')).toBeLessThan(
        written.indexOf('"javascript"')
      );
    });

    test("update adds jsxRuntime beside the javascript settings already there", async () => {
      const mockWriteFile = mockProject({
        "./biome.jsonc": [
          "{",
          '  "extends": ["ultracite/biome/core"],',
          '  "javascript": {',
          "    // browser extension",
          '    "globals": ["chrome"],',
          '    "formatter": { "quoteStyle": "single" }',
          "  }",
          "}",
          "",
        ].join("\n"),
        "tsconfig.json": classicTsConfig,
      });

      await biome.update();

      const [[, written]] = mockWriteFile.mock.calls;
      expect(written).toContain("// browser extension");
      expect(written).toContain('"globals": ["chrome"],');
      expect(written).toContain('"formatter": { "quoteStyle": "single" }');
      // jsonc-parser reads the comments the document keeps.
      expect(parse(written).javascript).toEqual({
        formatter: { quoteStyle: "single" },
        globals: ["chrome"],
        jsxRuntime: "reactClassic",
      });
    });

    test.each(["transparent", "reactClassic"])(
      "update leaves a jsxRuntime of %s the config already sets",
      async (runtime) => {
        const mockWriteFile = mockProject({
          "./biome.jsonc": `{ "extends": ["ultracite/biome/core"], "javascript": { "jsxRuntime": "${runtime}" } }`,
          "tsconfig.json": classicTsConfig,
        });

        await biome.update();

        expect(JSON.parse(mockWriteFile.mock.calls[0][1]).javascript).toEqual({
          jsxRuntime: runtime,
        });
      }
    );

    test("update adds nothing under the automatic runtime", async () => {
      const mockWriteFile = mockProject({
        "./biome.jsonc": '{ "extends": ["ultracite/biome/core"] }',
        "tsconfig.json": '{ "compilerOptions": { "jsx": "react-jsx" } }',
      });

      await biome.update();

      expect(JSON.parse(mockWriteFile.mock.calls[0][1])).not.toHaveProperty(
        "javascript"
      );
    });

    test("addMissingBiomeJsxRuntime sets it and names the config", async () => {
      const mockWriteFile = mockProject({
        "./biome.jsonc":
          '{\n  // ours\n  "extends": ["ultracite/biome/core"]\n}\n',
        "tsconfig.json": classicTsConfig,
      });

      await expect(addMissingBiomeJsxRuntime()).resolves.toBe("biome.jsonc");

      const [[writtenPath, written]] = mockWriteFile.mock.calls;
      expect(writtenPath).toBe("./biome.jsonc");
      // Only the one key is added: no $schema, no new presets.
      expect(written).toContain("// ours");
      expect(parse(written)).toEqual({
        extends: ["ultracite/biome/core"],
        javascript: { jsxRuntime: "reactClassic" },
      });
    });

    const coreConfig = '{ "extends": ["ultracite/biome/core"] }';

    test.each([
      [
        "under the automatic runtime",
        {
          "./biome.jsonc": coreConfig,
          "tsconfig.json": '{ "compilerOptions": { "jsx": "react-jsx" } }',
        },
      ],
      ["without a tsconfig", { "./biome.jsonc": coreConfig }],
      [
        "when the config sets a jsxRuntime",
        {
          "./biome.jsonc":
            '{ "extends": ["ultracite/biome/core"], "javascript": { "jsxRuntime": "transparent" } }',
          "tsconfig.json": classicTsConfig,
        },
      ],
      ["without a Biome config", { "tsconfig.json": classicTsConfig }],
      [
        "to a config that inherits the root's",
        {
          "./biome.jsonc": '{ "root": false, "extends": "//" }',
          "tsconfig.json": classicTsConfig,
        },
      ],
      [
        "to a config that doesn't parse",
        { "./biome.jsonc": '{ "extends": [', "tsconfig.json": classicTsConfig },
      ],
    ])("addMissingBiomeJsxRuntime writes nothing %s", async (_name, files) => {
      const mockWriteFile = mockProject(files);

      await expect(addMissingBiomeJsxRuntime()).resolves.toBeNull();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
