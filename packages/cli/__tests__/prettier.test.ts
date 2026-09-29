import { describe, expect, mock, test } from "bun:test";

import { prettier } from "../src/linters/prettier";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("prettier linter", () => {
  describe("exists", () => {
    test("returns true when prettier key in package.json", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"prettier": {"semi": true}}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => '{"prettier": {"semi": true}}'),
      }));

      const result = await prettier.exists();
      expect(result).toBe(true);
    });

    test("returns true when prettier config file exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.prettierrc.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./.prettierrc.mjs") {
            return;
          }
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await prettier.exists();
      expect(result).toBe(true);
    });

    test("returns false when no prettier config exists", async () => {
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

      const result = await prettier.exists();
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

      const result = await prettier.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates prettier config with tailwindcss plugin by default", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./prettier.config.mjs");
      expect(writeCall[1]).toContain("ultracite/prettier");
      expect(writeCall[1]).toContain("prettier-plugin-tailwindcss");
    });

    test("creates prettier config with svelte plugin when svelte framework selected", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create({ frameworks: ["svelte"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("prettier-plugin-svelte");
      expect(writeCall[1]).toContain("prettier-plugin-tailwindcss");
    });

    test("creates prettier config with astro plugin when astro framework selected", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create({ frameworks: ["astro"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("prettier-plugin-astro");
      expect(writeCall[1]).toContain("prettier-plugin-tailwindcss");
    });

    test("does not include framework plugins for frameworks without prettier plugins", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).not.toContain("prettier-plugin-svelte");
      expect(writeCall[1]).not.toContain("prettier-plugin-astro");
      expect(writeCall[1]).toContain("prettier-plugin-tailwindcss");
    });

    test("tailwindcss plugin is always last in plugins array", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create({ frameworks: ["svelte", "astro"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [[, content]] = mockWriteFile.mock.calls;
      const tailwindIndex = content.indexOf("prettier-plugin-tailwindcss");
      const svelteIndex = content.indexOf("prettier-plugin-svelte");
      const astroIndex = content.indexOf("prettier-plugin-astro");
      expect(tailwindIndex).toBeGreaterThan(svelteIndex);
      expect(tailwindIndex).toBeGreaterThan(astroIndex);
    });
  });

  describe("update", () => {
    test("updates prettier config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.update();

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

describe("prettier update keeps user content", () => {
  test("keeps options and plugins added to an Ultracite config", async () => {
    const project = mockProject({
      "./prettier.config.mjs": `import config from "ultracite/prettier";

export default {
  ...config,
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  printWidth: 120, // wide screens
};
`,
    });

    await prettier.update({ frameworks: ["svelte"] });

    const [[writtenPath, content]] = project.writeFile.mock.calls;
    expect(writtenPath).toBe("./prettier.config.mjs");
    expect(content).toBe(`import config from "ultracite/prettier";

export default {
  ...config,
  plugins: ["prettier-plugin-svelte", "prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  printWidth: 120, // wide screens
};
`);
    expect(project.warn).not.toHaveBeenCalled();
  });

  test("replaces a config that doesn't build on Ultracite's and says so", async () => {
    const project = mockProject({
      "./prettier.config.mjs": "export default { semi: false };\n",
    });

    await prettier.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).not.toContain("semi");
    expect(project.warn.mock.calls[0]?.[0]).toContain(
      "Replaced prettier.config.mjs"
    );
  });

  test("moves a package.json key to prettier.config.mjs", async () => {
    const packageJson = '{"name": "app", "prettier": {"semi": false}}';
    const project = mockProject({
      "./package.json": packageJson,
      "package.json": packageJson,
    });

    await prettier.update();

    const writes = new Map(project.writeFile.mock.calls);
    expect(writes.get("./prettier.config.mjs")).toContain("...config");
    expect(JSON.parse(writes.get("package.json") ?? "{}")).toEqual({
      name: "app",
    });
    expect(project.warn.mock.calls[0]?.[0]).toContain(
      'the "prettier" key in package.json'
    );
  });

  test("replaces a JSON .prettierrc and removes it", async () => {
    const project = mockProject({ "./.prettierrc": '{ "semi": false }' });

    await prettier.update();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./prettier.config.mjs");
    expect(project.rm.mock.calls[0]?.[0]).toBe("./.prettierrc");
    expect(project.warn.mock.calls[0]?.[0]).toContain("Replaced .prettierrc");
  });
});
