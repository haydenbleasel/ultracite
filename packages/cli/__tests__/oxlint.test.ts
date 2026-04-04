import { describe, expect, mock, test } from "bun:test";

import { oxlint } from "../src/linters/oxlint";

// Helper to generate the expected oxlint config path
const getOxlintConfigPath = (name: string) =>
  `./node_modules/ultracite/config/oxlint/${name}/.oxlintrc.json`;

// Helper to build a valid oxlint.config.ts string for test mocks
const buildTsConfig = (extendsList: string[]): string => {
  const extendsStr = extendsList.map((p) => `    "${p}",`).join("\n");
  return `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
${extendsStr}
  ],
  jsPlugins: ["oxlint-plugin-complexity"],
  rules: {
    "complexity/cognitive-complexity": ["error", 20],
  },
});
`;
};

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve(buildTsConfig([]))),
  writeFile: mock(() => Promise.resolve()),
}));

describe("oxlint linter", () => {
  describe("exists", () => {
    test("returns true when oxlint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(buildTsConfig([]))),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await oxlint.exists();
      expect(result).toBe(true);
    });

    test("returns false when no oxlint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve(buildTsConfig([]))),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await oxlint.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates oxlint config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve(buildTsConfig([]))),
        writeFile: mockWriteFile,
      }));

      await oxlint.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./oxlint.config.ts");
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("core")}"`);
      expect(content).toContain("defineConfig");
      expect(content).toContain("oxlint-plugin-complexity");
    });

    test("creates oxlint config with frameworks", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve(buildTsConfig([]))),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("react")}"`);
      expect(content).toContain(`"${getOxlintConfigPath("next")}"`);
    });

    test("creates oxlint config with test framework", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve(buildTsConfig([]))),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({ frameworks: ["vitest"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("vitest")}"`);
      expect(content).not.toContain(`"${getOxlintConfigPath("jest")}"`);
    });
  });

  describe("update", () => {
    test("updates oxlint config file with existing extends", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = buildTsConfig(["some-other-config"]);

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxlint.config.ts") return Promise.resolve();
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("core")}"`);
      expect(content).toContain('"some-other-config"');
    });

    test("updates oxlint config with unrecognised content gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxlint.config.ts") return Promise.resolve();
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("// empty")),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("core")}"`);
    });

    test("skips adding ultracite config if already present", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = buildTsConfig([getOxlintConfigPath("core")]);

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxlint.config.ts") return Promise.resolve();
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      // Should only appear once
      const occurrences = (
        content.match(
          new RegExp(
            getOxlintConfigPath("core").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
          )
        ) ?? []
      ).length;
      expect(occurrences).toBe(1);
    });

    test("adds framework configs during update", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = buildTsConfig([getOxlintConfigPath("core")]);

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxlint.config.ts") return Promise.resolve();
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update({ frameworks: ["react"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("react")}"`);
    });

    test("adds test framework configs during update", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = buildTsConfig([getOxlintConfigPath("core")]);

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxlint.config.ts") return Promise.resolve();
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update({ frameworks: ["jest"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("jest")}"`);
      expect(content).not.toContain(`"${getOxlintConfigPath("vitest")}"`);
    });

    test("migrates from legacy .oxlintrc.json to oxlint.config.ts", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const legacyConfig = JSON.stringify({
        extends: ["some-other-config"],
        rules: { "no-console": "warn" },
      });

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.oxlintrc.json") return Promise.resolve();
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve(legacyConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./oxlint.config.ts");
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("core")}"`);
      expect(content).toContain('"some-other-config"');
      expect(content).toContain("defineConfig");
    });

    test("handles config without extends array", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = buildTsConfig([]);

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxlint.config.ts") return Promise.resolve();
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const content = writeCall[1] as string;
      expect(content).toContain(`"${getOxlintConfigPath("core")}"`);
    });
  });
});

