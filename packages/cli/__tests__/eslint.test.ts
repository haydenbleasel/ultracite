import { describe, expect, mock, test } from "bun:test";

import { eslint } from "../src/linters/eslint";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("eslint linter", () => {
  describe("exists", () => {
    test("returns true when eslint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./eslint.config.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === "./eslint.config.mjs") {
            return;
          }
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await eslint.exists();
      expect(result).toBe(true);
    });

    test("returns false when no eslint config exists", async () => {
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

      const result = await eslint.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates eslint config file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await eslint.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./eslint.config.mjs");
      expect(writeCall[1]).toContain("ultracite");
    });

    test("creates eslint config with frameworks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await eslint.create({ frameworks: ["react", "next", "tanstack"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain(
        'import react from "ultracite/eslint/react"'
      );
      expect(writeCall[1]).toContain(
        'import next from "ultracite/eslint/next"'
      );
      expect(writeCall[1]).toContain(
        'import tanstack from "ultracite/eslint/tanstack"'
      );
      expect(writeCall[1]).toContain("...react");
      expect(writeCall[1]).toContain("...next");
      expect(writeCall[1]).toContain("...tanstack");
    });
  });

  describe("update", () => {
    test("updates eslint config file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await eslint.update();

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

describe("eslint update keeps user content", () => {
  test("keeps existing presets, extra config objects and imports", async () => {
    const project = mockProject({
      "./eslint.config.mjs": `import core from "ultracite/eslint/core";
import react from "ultracite/eslint/react";
import storybook from "eslint-plugin-storybook";

export default [
  ...core,
  ...react,
  ...storybook.configs["flat/recommended"],
  // generated code
  { ignores: ["generated/**"] },
];
`,
      "package.json": '{"type": "module"}',
    });

    await eslint.update({ frameworks: ["vitest"] });

    const [[writtenPath, content]] = project.writeFile.mock.calls;
    expect(writtenPath).toBe("./eslint.config.mjs");
    expect(content).toBe(`import core from "ultracite/eslint/core";
import react from "ultracite/eslint/react";
import vitest from "ultracite/eslint/vitest";
import storybook from "eslint-plugin-storybook";

export default [
  ...core,
  ...react,
  ...vitest,
  ...storybook.configs["flat/recommended"],
  // generated code
  { ignores: ["generated/**"] },
];
`);
    expect(project.warn).not.toHaveBeenCalled();
  });

  test("keeps a defineConfig wrapper", async () => {
    const project = mockProject({
      "./eslint.config.mjs": `import { defineConfig } from "eslint/config";
import core from "ultracite/eslint/core";

export default defineConfig([...core, { rules: { eqeqeq: "off" } }]);
`,
    });

    await eslint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain('import { defineConfig } from "eslint/config";');
    expect(content).toContain(
      'export default defineConfig([\n  ...core,\n  { rules: { eqeqeq: "off" } },\n]);'
    );
  });

  test("replaces a config that doesn't use Ultracite and says so", async () => {
    const project = mockProject({
      "./eslint.config.mjs": "export default [{ rules: {} }];\n",
    });

    await eslint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toBe(
      'import core from "ultracite/eslint/core";\n\nexport default [\n  ...core,\n];\n'
    );
    expect(project.warn.mock.calls[0]?.[0]).toContain(
      "Replaced eslint.config.mjs"
    );
  });

  test("leaves a config it can't parse unchanged", async () => {
    const project = mockProject({
      "./eslint.config.mjs": "export default [...core,",
    });

    await eslint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn).toHaveBeenCalled();
  });
});

describe("eslint config precedence", () => {
  test("updates the config ESLint loads when several exist", async () => {
    const config =
      'import core from "ultracite/eslint/core";\n\nexport default [\n  ...core,\n];\n';
    const project = mockProject({
      "./eslint.config.js": config,
      "./eslint.config.mjs": config,
      "package.json": '{"type": "module"}',
    });

    await eslint.update();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./eslint.config.js");
  });
});

describe("eslint type-aware presets", () => {
  test("adds the type-aware preset after core and add-ons after their frameworks", async () => {
    const project = mockProject({});

    await eslint.create({ frameworks: ["react", "jest"], typeAware: true });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toBe(`import core from "ultracite/eslint/core";
import typeAware from "ultracite/eslint/type-aware";
import react from "ultracite/eslint/react";
import jest from "ultracite/eslint/jest";
import jestTypeAware from "ultracite/eslint/jest/type-aware";

export default [
  ...core,
  ...typeAware,
  ...react,
  ...jest,
  ...jestTypeAware,
];
`);
  });

  test("leaves type-aware presets out by default", async () => {
    const project = mockProject({});

    await eslint.create({ frameworks: ["vitest"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).not.toContain("type-aware");
  });

  test("keeps a type-aware config type-aware without the option", async () => {
    const project = mockProject({
      "./eslint.config.mjs": `import core from "ultracite/eslint/core";
import typeAware from "ultracite/eslint/type-aware";
import vitest from "ultracite/eslint/vitest";
import vitestTypeAware from "ultracite/eslint/vitest/type-aware";

export default [
  ...core,
  ...typeAware,
  ...vitest,
  ...vitestTypeAware,
];
`,
      "package.json": '{"type": "module"}',
    });

    await eslint.update({ frameworks: ["nestjs"], typeAware: false });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toBe(`import core from "ultracite/eslint/core";
import typeAware from "ultracite/eslint/type-aware";
import vitest from "ultracite/eslint/vitest";
import vitestTypeAware from "ultracite/eslint/vitest/type-aware";
import nestjs from "ultracite/eslint/nestjs";
import nestjsTypeAware from "ultracite/eslint/nestjs/type-aware";

export default [
  ...core,
  ...typeAware,
  ...vitest,
  ...vitestTypeAware,
  ...nestjs,
  ...nestjsTypeAware,
];
`);
  });

  test("makes an existing config type-aware when asked", async () => {
    const project = mockProject({
      "./eslint.config.mjs": `import core from "ultracite/eslint/core";
import angular from "ultracite/eslint/angular";

export default [
  ...core,
  ...angular,
  { rules: { eqeqeq: "off" } },
];
`,
      "package.json": '{"type": "module"}',
    });

    await eslint.update({ typeAware: true });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toBe(`import core from "ultracite/eslint/core";
import typeAware from "ultracite/eslint/type-aware";
import angular from "ultracite/eslint/angular";
import angularTypeAware from "ultracite/eslint/angular/type-aware";

export default [
  ...core,
  ...typeAware,
  ...angular,
  ...angularTypeAware,
  { rules: { eqeqeq: "off" } },
];
`);
  });

  test("gives a workspace config the add-ons of a type-aware root config", async () => {
    const project = mockProject({
      "./eslint.config.mjs": `import core from "ultracite/eslint/core";
import typeAware from "ultracite/eslint/type-aware";

export default [
  ...core,
  ...typeAware,
];
`,
    });

    await eslint.createWorkspace({
      dir: "apps/api",
      frameworks: ["nestjs", "react"],
    });

    const [[writtenPath, content]] = project.writeFile.mock.calls;
    expect(writtenPath).toBe("./apps/api/eslint.config.mjs");
    expect(content).toContain(
      'import nestjsTypeAware from "ultracite/eslint/nestjs/type-aware";'
    );
    expect(content).toContain(
      "  ...nestjs,\n  ...nestjsTypeAware,\n  ...react,"
    );
    expect(content).not.toContain("react/type-aware");
  });
});
