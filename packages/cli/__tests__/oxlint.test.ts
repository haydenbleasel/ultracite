import { describe, expect, mock, test } from "bun:test";

import { oxlint } from "../src/linters/oxlint";

// Helper to generate the expected oxlint config path
const getOxlintConfigPath = (name: string) =>
  `./node_modules/ultracite/config/oxlint/${name}/.oxlintrc.json`;

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("oxlint linter", () => {
  describe("exists", () => {
    test("returns true when oxlint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await oxlint.exists();
      expect(result).toBe(true);
    });

    test("returns false when no oxlint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
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
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.oxlintrc.json");
      const content = JSON.parse(writeCall[1] as string);
      expect(content.extends).toContain(getOxlintConfigPath("core"));
    });

    test("creates oxlint config with frameworks", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = JSON.parse(writeCall[1] as string);
      expect(content.extends).toContain(getOxlintConfigPath("react"));
      expect(content.extends).toContain(getOxlintConfigPath("next"));
    });
  });

  describe("update", () => {
    test("updates oxlint config file with existing extends", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = JSON.stringify({
        extends: ["some-other-config"],
        rules: { "no-console": "warn" },
      });

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = JSON.parse(writeCall[1] as string);
      expect(content.extends).toContain(getOxlintConfigPath("core"));
      expect(content.extends).toContain("some-other-config");
    });

    test("updates oxlint config with invalid JSON", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("invalid json")),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = JSON.parse(writeCall[1] as string);
      expect(content.extends).toContain(getOxlintConfigPath("core"));
    });

    test("skips adding ultracite config if already present (new format)", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = JSON.stringify({
        extends: [getOxlintConfigPath("core")],
      });

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = JSON.parse(writeCall[1] as string);
      // Should only appear once
      expect(
        content.extends.filter((e: string) => e === getOxlintConfigPath("core"))
          .length
      ).toBe(1);
    });

    test("adds framework configs during update", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = JSON.stringify({
        extends: [getOxlintConfigPath("core")],
      });

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update({ frameworks: ["react"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = JSON.parse(writeCall[1] as string);
      expect(content.extends).toContain(getOxlintConfigPath("react"));
    });

    test("handles config without extends array", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = JSON.stringify({
        rules: { "no-console": "warn" },
      });

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = JSON.parse(writeCall[1] as string);
      expect(content.extends).toContain(getOxlintConfigPath("core"));
    });
  });
});
