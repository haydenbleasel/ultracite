import { beforeEach, describe, expect, mock, test } from "bun:test";

import { oxfmt } from "../src/linters/oxfmt";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("node:fs", () => ({
  accessSync: mock(() => {}),
  existsSync: mock(() => false),
  readFileSync: mock(() => "{}"),
}));

describe("oxfmt", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when oxfmt.config.ts exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return;
          }
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await oxfmt.exists();
      expect(result).toBe(true);
    });

    test("returns false when no oxfmt config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await oxfmt.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates oxfmt config that imports from ultracite/oxfmt", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxfmt.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, writtenContent] = writeCall;

      expect(writtenContent).toContain('import { defineConfig } from "oxfmt"');
      expect(writtenContent).toContain(
        'import ultracite from "ultracite/oxfmt"'
      );
      expect(writtenContent).toContain("defineConfig");
    });
  });

  describe("update", () => {
    test("writes config that imports from ultracite/oxfmt", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return;
          }
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxfmt.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, writtenContent] = writeCall;

      expect(writtenContent).toContain('import { defineConfig } from "oxfmt"');
      expect(writtenContent).toContain(
        'import ultracite from "ultracite/oxfmt"'
      );
      expect(writtenContent).toContain("defineConfig");
    });
  });
});

// A project whose files are given as path → contents; every other path is
// missing. Returns the mocks that record what update wrote and removed.
const mockOxfmtProject = (files: Record<string, string>) => {
  const writeFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );
  const rm = mock((_path: string) => Promise.resolve());
  const warn = mock((_message: string) => {});
  const has = (filePath: string) => String(filePath) in files;

  mock.module("node:fs/promises", () => ({
    readFile: mock((filePath: string) =>
      has(filePath)
        ? Promise.resolve(files[String(filePath)])
        : Promise.reject(new Error("ENOENT"))
    ),
    rm,
    writeFile,
  }));
  mock.module("node:fs", () => ({
    accessSync: mock((filePath: string) => {
      if (!has(filePath)) {
        throw new Error("ENOENT");
      }
    }),
    existsSync: mock(() => false),
    // package.json, read synchronously to pick the config's file name.
    readFileSync: mock((filePath: string) =>
      has(filePath) ? files[String(filePath)] : "{}"
    ),
  }));
  mock.module("@clack/prompts", () => ({
    log: { error: mock(), info: mock(), success: mock(), warn },
  }));

  return { rm, warn, writeFile };
};

describe("oxfmt update keeps user content", () => {
  test("carries over options and imports added to oxfmt.config.ts", async () => {
    const project = mockOxfmtProject({
      "./oxfmt.config.ts": `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";
import { printWidth } from "./shared-format.mjs";

export default defineConfig({
  ...ultracite,
  // wider lines for this repo
  printWidth,
  ignorePatterns: [...ultracite.ignorePatterns, "fixtures/**"],
});
`,
    });

    await oxfmt.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import { printWidth } from "./shared-format.mjs";'
    );
    expect(content).toContain(
      "  ...ultracite,\n  // wider lines for this repo\n  printWidth,"
    );
    expect(content).toContain(
      'ignorePatterns: [...ultracite.ignorePatterns, "fixtures/**"],'
    );
    expect(project.warn).not.toHaveBeenCalled();
  });

  test("migrates .oxfmtrc.json into the TS config and removes it", async () => {
    const project = mockOxfmtProject({
      "./.oxfmtrc.json": `{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "ignorePatterns": ["vendor/**"],
  "semi": false
}`,
    });

    expect(oxfmt.exists()).toBe(true);
    await oxfmt.update();

    const [[writtenPath, content]] = project.writeFile.mock.calls;
    expect(writtenPath).toBe("./oxfmt.config.mts");
    expect(content).toContain(
      'ignorePatterns: [\n    ...ultracite.ignorePatterns,\n    "vendor/**",\n  ],'
    );
    expect(content).toContain("semi: false,");
    expect(content).not.toContain("$schema");
    expect(project.rm.mock.calls.map(([filePath]) => filePath)).toEqual([
      "./.oxfmtrc.json",
    ]);
  });

  test("drops the empty ignorePatterns oxfmt --init writes", async () => {
    const project = mockOxfmtProject({
      "./.oxfmtrc.jsonc": '{ "ignorePatterns": [] }',
      "./oxfmt.config.ts": `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
});
`,
    });

    await oxfmt.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).not.toContain("ignorePatterns");
    expect(project.rm).toHaveBeenCalled();
  });

  test("leaves everything unchanged when .oxfmtrc.json can't be parsed", async () => {
    const project = mockOxfmtProject({ "./.oxfmtrc.json": '{ "semi": ' });

    await oxfmt.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.rm).not.toHaveBeenCalled();
    expect(project.warn).toHaveBeenCalled();
  });

  test("leaves an oxfmt.config.ts it can't parse unchanged", async () => {
    const project = mockOxfmtProject({
      "./oxfmt.config.ts": "export default defineConfig({",
    });

    await oxfmt.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn).toHaveBeenCalled();
  });
});

describe("oxfmt config file name", () => {
  const config = `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
});
`;

  test("writes oxfmt.config.mts in a package without a type", async () => {
    const project = mockOxfmtProject({ "package.json": '{"name": "app"}' });

    await oxfmt.create();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./oxfmt.config.mts");
  });

  test("writes oxfmt.config.ts in an ES module package", async () => {
    const project = mockOxfmtProject({ "package.json": '{"type": "module"}' });

    await oxfmt.create();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./oxfmt.config.ts");
  });

  test("keeps an existing config's name on re-run", async () => {
    const project = mockOxfmtProject({
      "./oxfmt.config.ts": config,
      "package.json": '{"name": "app"}',
    });

    await oxfmt.update();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./oxfmt.config.ts");
    expect(project.rm).not.toHaveBeenCalled();
  });

  test("moves a .ts config in a CommonJS package to .mts", async () => {
    const project = mockOxfmtProject({
      "./oxfmt.config.ts": config,
      "package.json": '{"type": "commonjs"}',
    });

    await oxfmt.update();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./oxfmt.config.mts");
    expect(project.rm.mock.calls.map(([filePath]) => filePath)).toEqual([
      "./oxfmt.config.ts",
    ]);
  });
});
