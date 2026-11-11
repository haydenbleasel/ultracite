import { afterEach, describe, expect, mock, test } from "bun:test";

import { findLoadedJsPlugins, oxlint } from "../src/linters/oxlint";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

// Helper to generate the expected oxlint config path
const getOxlintConfigPath = (name: string) => `ultracite/oxlint/${name}`;

// The node:fs/promises every test starts from: no config exists yet.
const defaultFsPromisesMock = () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  rm: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
});

mock.module("node:fs/promises", defaultFsPromisesMock);

// mock.module is global and never undone, so each test's file system mocks
// are put back before the next test (or the next test file) runs.
afterEach(() => {
  restoreFileSystemMock();
  mock.module("node:fs/promises", defaultFsPromisesMock);
});

// Every path exists except an .oxlintrc.json, which init would migrate, and
// an oxlint.config.mts, which would sit next to the oxlint.config.ts.
const onlyOxlintConfig = (filePath: string) => {
  if (
    String(filePath).includes("oxlintrc") ||
    String(filePath).endsWith(".mts")
  ) {
    throw new Error("ENOENT");
  }
};

describe("oxlint linter", () => {
  describe("exists", () => {
    test("returns true when oxlint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await oxlint.exists();
      expect(result).toBe(true);
    });

    test("returns false when no oxlint config exists", async () => {
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

      const result = await oxlint.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates oxlint config file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      // No "type": "module" in package.json, so the config is .mts.
      expect(writeCall[0]).toBe("./oxlint.config.mts");
      const [, content] = writeCall;
      expect(content).toContain('import { defineConfig } from "oxlint"');
      // oxlint carries neither through `extends`, so both are re-declared.
      expect(content).toContain("env: core.env,");
      expect(content).toContain("ignorePatterns: core.ignorePatterns,");
      expect(content).toContain(getOxlintConfigPath("core"));
      expect(content).not.toContain(getOxlintConfigPath("github"));
      expect(content).not.toContain(getOxlintConfigPath("sonarjs"));
    });

    test("creates oxlint config with frameworks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(getOxlintConfigPath("react"));
      expect(content).toContain(getOxlintConfigPath("next"));
    });

    test("adds framework js-plugins add-ons when react-doctor is selected", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        frameworks: ["react", "next", "tanstack"],
        jsPlugins: ["oxlint-plugin-react-doctor"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import nextJsPlugins from "ultracite/oxlint/next/js-plugins";'
      );
      expect(content).toContain(
        'import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";'
      );
      expect(content).toContain(
        'const jsPlugins = selectJsPlugins(["react-doctor"]);'
      );
      // The selection takes the full preset's place, ahead of the add-ons.
      expect(content).toMatch(
        /extends: \[[\s\S]*jsPlugins,\s*nextJsPlugins,\s*tanstackJsPlugins,?\s*\]/u
      );
    });

    test("applies jsPluginSettings on the root config when react-doctor is selected", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        jsPlugins: ["oxlint-plugin-react-doctor"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      // oxlint does not merge `settings` from extended configs, so the
      // react-doctor settings must be emitted on the root config (#771).
      expect(content).toContain(
        'import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";'
      );
      expect(content).toContain("settings: jsPluginSettings,");
    });

    test("wraps a subset selection in selectJsPlugins", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        jsPlugins: ["eslint-plugin-github", "eslint-plugin-sonarjs"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import { selectJsPlugins } from "ultracite/oxlint/js-plugins";'
      );
      expect(content).toContain(
        'const jsPlugins = selectJsPlugins(["github", "sonarjs"]);'
      );
      expect(content).toContain("extends: [core, jsPlugins],");
      // Knip and similar tools only read `jsPlugins` off the root config, so
      // the selection is hoisted there too (#784).
      expect(content).toContain("jsPlugins: jsPlugins.jsPlugins,");
      // The filtering logic lives inside ultracite, not the generated file,
      // so user-side lint presets (e.g. anti-slop) cannot flag it — see #770.
      expect(content).not.toContain("typeof");
      // Blank lines must separate the imports, the selection, and the config
      // so the file is born compliant with import/newline-after-import.
      expect(content).toContain('";\n\nconst jsPlugins = ');
      expect(content).toContain(");\n\nexport default defineConfig({");
    });

    test("maps TSDoc package selections to their Oxlint plugin aliases", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        jsPlugins: ["eslint-plugin-jsdoc", "eslint-plugin-tsdoc"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'const jsPlugins = selectJsPlugins(["jsdoc-js", "tsdoc"]);'
      );
      expect(content).toContain(
        'import { selectJsPlugins } from "ultracite/oxlint/js-plugins";'
      );
    });

    test("does not hoist jsPlugins without a js-plugins preset", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({ jsPlugins: ["anti-slop"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).not.toContain("jsPlugins:");
    });

    test("adds the vendored anti-slop preset as a plain extend", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        jsPlugins: ["anti-slop"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import antiSlop from "ultracite/oxlint/anti-slop";'
      );
      expect(content).toMatch(/extends: \[[\s\S]*antiSlop[\s\S]*\]/u);
      // anti-slop is vendored, not an npm plugin — it must not pull in the
      // selectJsPlugins machinery on its own.
      expect(content).not.toContain("selectJsPlugins");
      expect(content).not.toContain('"ultracite/oxlint/js-plugins"');
    });

    test("combines anti-slop with npm js-plugins", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        jsPlugins: ["anti-slop", "eslint-plugin-github"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import antiSlop from "ultracite/oxlint/anti-slop";'
      );
      expect(content).toContain('selectJsPlugins(["github"])');
      expect(content).not.toContain('selectJsPlugins(["anti-slop"');
    });

    test("adds the shadcn preset as a plain extend and hoists its jsPlugins", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        jsPlugins: ["@shadcn/lint"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import shadcn from "ultracite/oxlint/shadcn";'
      );
      expect(content).toContain("extends: [core, shadcn],");
      // The preset declares the @shadcn/lint package itself, so it is
      // re-declared on the root config for dependency analyzers (#784).
      expect(content).toContain("jsPlugins: shadcn.jsPlugins,");
      // @shadcn/lint is not part of the ESLint-parity js-plugins preset.
      expect(content).not.toContain("selectJsPlugins");
      expect(content).not.toContain('"ultracite/oxlint/js-plugins"');
      expect(content).not.toContain("jsPluginSettings");
    });

    test("combines the shadcn preset with npm js-plugins and anti-slop", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        jsPlugins: ["@shadcn/lint", "anti-slop", "eslint-plugin-github"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import shadcn from "ultracite/oxlint/shadcn";'
      );
      expect(content).toContain('selectJsPlugins(["github"])');
      expect(content).not.toContain('selectJsPlugins(["shadcn"');
      // The js-plugins selection takes the full preset's place and anti-slop
      // comes last, so its core-rule overrides win.
      expect(content).toContain(
        "extends: [core, jsPlugins, shadcn, antiSlop],"
      );
      expect(content).toContain(
        "jsPlugins: [...jsPlugins.jsPlugins, ...shadcn.jsPlugins],"
      );
    });

    test("does not add framework js-plugins add-ons without react-doctor", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        frameworks: ["react", "next"],
        jsPlugins: ["eslint-plugin-github", "eslint-plugin-sonarjs"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).not.toContain("ultracite/oxlint/next/js-plugins");
      expect(content).not.toContain("ultracite/oxlint/tanstack/js-plugins");
    });

    test("does not add framework js-plugins add-ons without the framework", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({
        frameworks: ["react"],
        jsPlugins: ["oxlint-plugin-react-doctor"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).not.toContain("ultracite/oxlint/next/js-plugins");
      expect(content).not.toContain("ultracite/oxlint/tanstack/js-plugins");
    });

    test("creates oxlint config with test framework", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxlint.create({ frameworks: ["vitest"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(getOxlintConfigPath("vitest"));
      expect(content).not.toContain(getOxlintConfigPath("jest"));
    });
  });

  describe("update", () => {
    test("updates oxlint config file with existing extends", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
    "some-other-config",
  ],
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(getOxlintConfigPath("core"));
      expect(content).not.toContain(getOxlintConfigPath("github"));
      expect(content).not.toContain(getOxlintConfigPath("sonarjs"));
      expect(content).toContain("some-other-config");
    });

    test("updates oxlint config with empty file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(getOxlintConfigPath("core"));
      expect(content).not.toContain(getOxlintConfigPath("github"));
      expect(content).not.toContain(getOxlintConfigPath("sonarjs"));
    });

    test("skips adding ultracite config if already present", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
    "${getOxlintConfigPath("core")}",
  ],
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;

      // Should only appear once
      const coreMatches = content.match(
        new RegExp(
          getOxlintConfigPath("core").replaceAll(
            /[.*+?^${}()|[\]\\]/gu,
            "\\$&"
          ),
          "gu"
        )
      );

      expect(coreMatches?.length).toBe(1);
    });

    test("adds framework configs during update", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
    "${getOxlintConfigPath("core")}",
  ],
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update({ frameworks: ["react"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(getOxlintConfigPath("react"));
    });

    test("adds test framework configs during update", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
    "${getOxlintConfigPath("core")}",
  ],
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update({ frameworks: ["jest"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(getOxlintConfigPath("jest"));
      expect(content).not.toContain(getOxlintConfigPath("vitest"));
    });

    test("parses JS import statements for ultracite configs", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";

import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [
    core,
    react,
  ],
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update({ frameworks: ["next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      // Should preserve existing imports and add next
      expect(content).toContain(getOxlintConfigPath("core"));
      expect(content).not.toContain(getOxlintConfigPath("github"));
      expect(content).not.toContain(getOxlintConfigPath("sonarjs"));
      expect(content).toContain(getOxlintConfigPath("react"));
      expect(content).toContain(getOxlintConfigPath("next"));
    });

    test("does not duplicate js-plugins import when updating a config that already has it", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import jsPlugins from "ultracite/oxlint/js-plugins";

export default defineConfig({
  extends: [core, next, nextJsPlugins, jsPlugins],
  ignorePatterns: core.ignorePatterns,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update({
        frameworks: ["next"],
        jsPlugins: ["oxlint-plugin-react-doctor"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      // The legacy full-preset default import is migrated to the named
      // selectJsPlugins helper rather than kept alongside it.
      expect(content).not.toContain(
        'import jsPlugins from "ultracite/oxlint/js-plugins";'
      );

      const selectImports = content.match(
        /import \{ jsPluginSettings, selectJsPlugins \} from "ultracite\/oxlint\/js-plugins";/gu
      );

      expect(selectImports?.length).toBe(1);

      const nextAddOnImports = content.match(
        /import nextJsPlugins from "ultracite\/oxlint\/next\/js-plugins";/gu
      );

      expect(nextAddOnImports?.length).toBe(1);
    });

    test("preserves an existing shadcn extend during update and keeps its jsPlugins hoisted", async () => {
      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import shadcn from "ultracite/oxlint/shadcn";

export default defineConfig({
  extends: [core, shadcn],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: shadcn.jsPlugins,
});
`;

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      // No explicit selection: the previously enabled preset must survive.
      await oxlint.update({ frameworks: ["react"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(
        content.match(/import shadcn from "ultracite\/oxlint\/shadcn";/gu)
          ?.length
      ).toBe(1);
      expect(content).toContain("extends: [core, react, shadcn],");
      expect(content).toContain("jsPlugins: shadcn.jsPlugins,");
    });

    test("preserves an existing anti-slop extend during update without duplicating it", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core, antiSlop],
  ignorePatterns: core.ignorePatterns,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      // Re-running with an explicit anti-slop selection (e.g. re-selecting it
      // in the init prompt) must not add the extend a second time.
      await oxlint.update({ jsPlugins: ["anti-slop"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;

      const antiSlopImports = content.match(
        /import antiSlop from "ultracite\/oxlint\/anti-slop";/gu
      );

      expect(antiSlopImports?.length).toBe(1);
      const antiSlopExtends = content.match(/antiSlop/gu);
      // One import identifier plus one extends entry.
      expect(antiSlopExtends?.length).toBe(2);
      // The fixture's imports are sorted, as `ultracite fix` leaves them;
      // anti-slop still comes after core (#863).
      expect(content).toContain("extends: [core, antiSlop],");
    });

    test("preserves a legacy inline js-plugins selection during update", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";
const selectedJsPluginNames = new Set(["github","sonarjs"]);
const selectedJsPluginRulePrefixes = new Set(["github","sonarjs"]);

const selectedJsPlugins = {
  ...jsPlugins,
  jsPlugins: jsPlugins.jsPlugins?.filter((plugin) =>
    selectedJsPluginNames.has(typeof plugin === "string" ? plugin : plugin.name)
  ),
};

export default defineConfig({
  extends: [core, selectedJsPlugins],
  ignorePatterns: core.ignorePatterns,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain('selectJsPlugins(["github", "sonarjs"])');
      expect(content).not.toContain("selectedJsPluginNames");
      expect(content).not.toContain("typeof");
      // The full preset's import fed only the legacy consts, which are gone.
      expect(content).toContain(
        'import { selectJsPlugins } from "ultracite/oxlint/js-plugins";'
      );
      expect(content).toContain(
        'const jsPlugins = selectJsPlugins(["github", "sonarjs"]);'
      );
    });

    test("hoists jsPlugins when the full js-plugins preset is extended", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";

export default defineConfig({
  extends: [core, jsPlugins],
  ignorePatterns: core.ignorePatterns,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";'
      );
      expect(content).toContain("extends: [core, jsPlugins],");
      expect(content).toContain("jsPlugins: jsPlugins.jsPlugins,");
      // The full preset includes react-doctor, so its settings must be
      // applied on the root config (#771).
      expect(content).toContain("settings: jsPluginSettings,");
      expect(content).not.toContain("selectJsPlugins");
    });

    test("recognises a default-plus-named js-plugins import during update", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      // The documented manual form. Previously the import parser only
      // matched `import x from`, so the preset was silently dropped from
      // extends on update.
      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";

export default defineConfig({
  extends: [core, next, jsPlugins, nextJsPlugins],
  ignorePatterns: core.ignorePatterns,
  settings: jsPluginSettings,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";'
      );
      expect(content).toContain(
        'import nextJsPlugins from "ultracite/oxlint/next/js-plugins";'
      );
      expect(content).toContain(
        "extends: [core, next, jsPlugins, nextJsPlugins],"
      );
      expect(content).toContain("jsPlugins: jsPlugins.jsPlugins,");
      expect(content).toContain("settings: jsPluginSettings,");
      expect(content).not.toContain("selectJsPlugins");
    });

    test("adds a selection on top of the full js-plugins preset", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  extends: [core, jsPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: jsPlugins.jsPlugins,
  settings: jsPluginSettings,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update({
        jsPlugins: ["eslint-plugin-tsdoc", "eslint-plugin-jsdoc"],
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      // The preset's plugins and react-doctor's settings survive the new
      // selection instead of being replaced by it.
      expect(content).toContain(
        'selectJsPlugins(["github", "sonarjs", "react-doctor", "tsdoc", "jsdoc-js"])'
      );
      expect(content).toContain("settings: jsPluginSettings,");
    });

    test("preserves a selectJsPlugins selection during update", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  extends: [core, selectJsPlugins(["react-doctor", "jsdoc-js", "tsdoc"])],
  ignorePatterns: core.ignorePatterns,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'selectJsPlugins(["react-doctor", "jsdoc-js", "tsdoc"])'
      );
    });

    test("preserves a selection reformatted across multiple lines", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  extends: [
    core,
    selectJsPlugins([
      "github",
      "sonarjs",
      "react-doctor",
    ]),
  ],
  ignorePatterns: core.ignorePatterns,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(
        'selectJsPlugins(["github", "sonarjs", "react-doctor"])'
      );
    });

    test("keeps unrelated statements in a config without Ultracite presets", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `// This config references ultracite/oxlint but has no valid imports or extends
const config = "ultracite/oxlint";
export default {};
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      const [[, content]] = mockWriteFile.mock.calls;
      expect(content).toContain('const config = "ultracite/oxlint";');
      expect(content).toContain(
        `import core from "${getOxlintConfigPath("core")}";`
      );
    });

    test("adds ignorePatterns when migrating old config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
    "${getOxlintConfigPath("core")}",
  ],
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain("ignorePatterns: core.ignorePatterns,");
    });

    test("handles config without extends array", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      const existingConfig = `import { defineConfig } from "oxlint";

export default defineConfig({});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(onlyOxlintConfig),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain(getOxlintConfigPath("core"));
      expect(content).not.toContain(getOxlintConfigPath("github"));
      expect(content).not.toContain(getOxlintConfigPath("sonarjs"));
    });
  });
});

// A project whose files are given as path → contents; every other path is
// missing. Returns the mocks that record what update wrote and removed.
const mockProject = (files: Record<string, string>) => {
  const writeFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );

  const rm = mock((_path: string) => Promise.resolve());
  const warn = mock((_message: string) => {});
  const info = mock((_message: string) => {});
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
  mockFileSystem(files);
  mock.module("@clack/prompts", () => ({
    log: { error: mock(), info, success: mock(), warn },
  }));

  return { info, rm, warn, writeFile };
};

// The project files init writes for several jsPlugins sources. Updates must
// recognise the combined jsPlugins value it generates, or they keep it as a
// user override.
const createCombinedJsPluginsConfig = async () => {
  const created = mockProject({});
  await oxlint.create({
    jsPlugins: ["@shadcn/lint", "eslint-plugin-github"],
  });
  const [[configPath, content]] = created.writeFile.mock.calls;

  return { [configPath]: content };
};

describe("oxlint update keeps user content", () => {
  test("carries over custom rules, extends, imports and comments", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import effect from "@effect/tsgo/oxlint"; // Effect diagnostics

const localRules = { "no-console": "off" };

export default defineConfig({
  extends: [core, react, effect],
  // generated code lives in generated/
  ignorePatterns: [...core.ignorePatterns, "generated/**"],
  rules: {
    ...localRules,
    "eqeqeq": "off",
  },
});
`,
    });

    await oxlint.update({ frameworks: ["vitest"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import effect from "@effect/tsgo/oxlint"; // Effect diagnostics'
    );
    expect(content).toContain('const localRules = { "no-console": "off" };');
    expect(content).toContain("    effect,");
    expect(content).toContain("vitest,");
    expect(content).toContain("// generated code lives in generated/");
    expect(content).toContain(
      'ignorePatterns: [...core.ignorePatterns, "generated/**"],'
    );
    expect(content).not.toContain("ignorePatterns: core.ignorePatterns");
    expect(content).toContain('"eqeqeq": "off",');
    expect(project.warn).not.toHaveBeenCalled();
  });

  test("leaves a config it can't parse unchanged", async () => {
    const project = mockProject({
      "./oxlint.config.ts": "export default defineConfig({ extends: [core,",
    });

    await oxlint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn).toHaveBeenCalled();
  });

  test("migrates .oxlintrc.json into the TS config and removes it", async () => {
    const project = mockProject({
      "./.oxlintrc.json": `{
  // from oxlint --init
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/ultracite/config/oxlint/react/.oxlintrc.json", "./base.json"],
  "ignorePatterns": ["vendor/**"],
  "rules": { "no-console": "off" },
  "settings": { "react": { "version": "19" } },
  "env": { "builtin": true },
}`,
    });

    expect(oxlint.exists()).toBe(true);
    await oxlint.update();

    const [[writtenPath, content]] = project.writeFile.mock.calls;
    expect(writtenPath).toBe("./oxlint.config.mts");
    expect(content).toContain('import react from "ultracite/oxlint/react";');
    expect(content).toContain("...core.ignorePatterns,");
    expect(content).toContain('"vendor/**",');
    expect(content).toContain('rules: {\n    "no-console": "off"\n  },');
    expect(content).toContain("settings: {");
    expect(content).toContain('"version": "19"');
    expect(content).toContain("env: {");
    expect(content).not.toContain("$schema");
    expect(project.rm.mock.calls.map(([filePath]) => filePath)).toEqual([
      "./.oxlintrc.json",
    ]);
    expect(project.warn.mock.calls.at(-1)?.[0]).toContain("./base.json");
  });

  test("merges .oxlintrc.json settings with the react-doctor settings", async () => {
    const project = mockProject({
      "./.oxlintrc.json": '{ "settings": { "next": { "rootDir": "app" } } }',
    });

    await oxlint.update({ jsPlugins: ["oxlint-plugin-react-doctor"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("settings: {\n    ...jsPluginSettings,");
    expect(content).toContain('"rootDir": "app"');
  });

  test("keeps oxlint.config.ts settings over .oxlintrc.json when both exist", async () => {
    const project = mockProject({
      "./.oxlintrc.json":
        '{ "rules": { "eqeqeq": "error" }, "env": { "node": true } }',
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: { "eqeqeq": "off" },
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain('rules: { "eqeqeq": "off" },');
    expect(content).not.toContain('"eqeqeq": "error"');
    expect(content).toContain(
      "env: {\n    ...core.env,\n    node: true,\n  },"
    );
    expect(project.rm).toHaveBeenCalled();
  });

  test("regenerates a combined jsPlugins value when the selection shrinks", async () => {
    const project = mockProject(await createCombinedJsPluginsConfig());

    await oxlint.update({ jsPlugins: ["@shadcn/lint"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("jsPlugins: shadcn.jsPlugins,");
    expect(content).not.toContain("selectJsPlugins");
    expect(content).not.toContain("jsPlugins.jsPlugins");
  });

  test("adds .oxlintrc.json jsPlugins to a combined jsPlugins value", async () => {
    const project = mockProject({
      ...(await createCombinedJsPluginsConfig()),
      "./.oxlintrc.json": '{ "jsPlugins": ["eslint-plugin-foo"] }',
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'jsPlugins: [\n    ...jsPlugins.jsPlugins,\n    ...shadcn.jsPlugins,\n    "eslint-plugin-foo",\n  ],'
    );
    expect(project.rm).toHaveBeenCalled();
  });

  test("leaves everything unchanged when .oxlintrc.json can't be parsed", async () => {
    const project = mockProject({ "./.oxlintrc.json": '{ "rules": ' });

    await oxlint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.rm).not.toHaveBeenCalled();
    expect(project.warn.mock.calls[0]?.[0]).toContain(".oxlintrc.json");
  });

  test("keeps the name a preset is imported under", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import ultraciteCore from "ultracite/oxlint/core";

export default defineConfig({
  env: ultraciteCore.env,
  extends: [ultraciteCore],
  ignorePatterns: [...ultraciteCore.ignorePatterns, "generated/**"],
});
`,
    });

    await oxlint.update({ frameworks: ["react"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import ultraciteCore from "ultracite/oxlint/core";'
    );
    expect(content).not.toContain("import core from");
    expect(content).toContain("env: ultraciteCore.env,");
    expect(content).toContain("extends: [ultraciteCore, react],");
    expect(content).toContain(
      'ignorePatterns: [...ultraciteCore.ignorePatterns, "generated/**"],'
    );
  });

  test("leaves a preset that is imported but not extended out of extends", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";

export default defineConfig({
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: { ...antiSlop.rules },
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import antiSlop from "ultracite/oxlint/anti-slop";'
    );
    expect(content).toContain("extends: [core],");
    expect(content).toContain("rules: { ...antiSlop.rules },");
  });

  test("leaves a config that imports a preset as a namespace unchanged", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import * as core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core.default],
  ignorePatterns: core.default.ignorePatterns,
});
`,
    });

    await oxlint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn.mock.calls[0]?.[0]).toContain("import * as core");
  });

  test("migrates .oxlintrc.json onto the name core is imported under", async () => {
    const project = mockProject({
      "./.oxlintrc.json":
        '{ "env": { "node": true }, "ignorePatterns": ["dist/**"] }',
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import ultraciteCore from "ultracite/oxlint/core";

export default defineConfig({
  env: ultraciteCore.env,
  extends: [ultraciteCore],
  ignorePatterns: ultraciteCore.ignorePatterns,
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("...ultraciteCore.env,");
    expect(content).toContain("...ultraciteCore.ignorePatterns,");
    expect(content).not.toMatch(/\bcore\./u);
  });

  test("keeps an imported full js-plugins preset next to a new selection", async () => {
    const githubRules = `// The full preset's github rules, without extending the whole preset.
const githubRules = Object.fromEntries(
  Object.entries(jsPlugins.rules ?? {}).filter(([rule]) =>
    rule.startsWith("github/")
  )
);`;

    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";

${githubRules}

export default defineConfig({
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: githubRules,
});
`,
    });

    await oxlint.update({ jsPlugins: ["eslint-plugin-github"] });

    const [[configPath, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import jsPlugins, { selectJsPlugins } from "ultracite/oxlint/js-plugins";'
    );
    expect(content).toContain(githubRules);
    // The project's binding keeps `jsPlugins`, so the selection takes
    // another name.
    expect(content).toContain(
      'const ultraciteJsPlugins = selectJsPlugins(["github"]);'
    );
    expect(content).toContain("extends: [core, ultraciteJsPlugins],");
    expect(content).toContain("jsPlugins: ultraciteJsPlugins.jsPlugins,");

    const rerun = mockProject({ [configPath]: content });

    await oxlint.update();

    const [[, rerunContent]] = rerun.writeFile.mock.calls;
    expect(rerunContent).toBe(content);
  });

  test("keeps an extended full js-plugins preset the project's code uses", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import fullPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  env: core.env,
  extends: [core, fullPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: fullPlugins.jsPlugins,
  rules: { ...fullPlugins.rules },
  settings: jsPluginSettings,
});
`,
    });

    await oxlint.update({ jsPlugins: ["eslint-plugin-jsdoc"] });

    const [[configPath, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import fullPlugins, { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";'
    );
    expect(content).toContain("const jsPlugins = selectJsPlugins([");
    expect(content).toContain("extends: [core, jsPlugins],");
    expect(content).toContain("rules: { ...fullPlugins.rules },");

    const rerun = mockProject({ [configPath]: content });

    await oxlint.update();

    const [[, rerunContent]] = rerun.writeFile.mock.calls;
    expect(rerunContent).toBe(content);
  });

  test("drops an extended full js-plugins preset a new selection replaces", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import fullPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  env: core.env,
  extends: [core, fullPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: fullPlugins.jsPlugins,
  settings: jsPluginSettings,
});
`,
    });

    await oxlint.update({ jsPlugins: ["eslint-plugin-jsdoc"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";'
    );
    expect(content).not.toContain("fullPlugins");
  });

  test("doesn't count property keys, comments or strings as uses of a preset", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  env: core.env,
  extends: [core, jsPlugins],
  ignorePatterns: core.ignorePatterns,
  // Loaded next to jsPlugins and selectJsPlugins.
  jsPlugins: ["./local-plugin.js", "jsPlugins"],
  settings: jsPluginSettings,
});
`,
    });

    await oxlint.update({ jsPlugins: ["eslint-plugin-jsdoc"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";'
    );
    expect(content).toContain("const jsPlugins = selectJsPlugins([");
    expect(content).toContain('jsPlugins: ["./local-plugin.js", "jsPlugins"],');
    expect(content).not.toContain("ultraciteJsPlugins");
  });

  test("doesn't keep a replaced preset's import for a parameter with its name", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import fullPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";

const off = (names) => Object.fromEntries(names.map((fullPlugins) => [fullPlugins, "off"]));

export default defineConfig({
  env: core.env,
  extends: [core, fullPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: fullPlugins.jsPlugins,
  rules: off(["github/no-then"]),
  settings: jsPluginSettings,
});
`,
    });

    await oxlint.update({ jsPlugins: ["eslint-plugin-jsdoc"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";'
    );
    expect(content).not.toContain("import fullPlugins");
  });

  test("doesn't import a helper a comment names", async () => {
    const config = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";

const jsPlugins = selectJsPlugins(["github"]);

export default defineConfig({
  env: core.env,
  extends: [core, jsPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: jsPlugins.jsPlugins,
  // No jsPluginSettings without react-doctor.
  rules: { "github/no-then": "off" },
});
`;

    const project = mockProject({ "./oxlint.config.ts": config });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toBe(config);
  });

  test("keeps the full preset an older release's selection spread when the project's code uses it", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";
const selectedJsPluginNames = new Set(["github"]);

const selectedJsPlugins = {
  ...jsPlugins,
  jsPlugins: jsPlugins.jsPlugins?.filter((plugin) =>
    selectedJsPluginNames.has(typeof plugin === "string" ? plugin : plugin.name)
  ),
};

export default defineConfig({
  extends: [core, selectedJsPlugins],
  ignorePatterns: core.ignorePatterns,
  rules: { ...jsPlugins.rules },
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import jsPlugins, { selectJsPlugins } from "ultracite/oxlint/js-plugins";'
    );
    expect(content).toContain(
      'const ultraciteJsPlugins = selectJsPlugins(["github"]);'
    );
    expect(content).toContain("rules: { ...jsPlugins.rules },");
  });

  test("keeps a jsPlugins const the project's own selectJsPlugins declares", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

import { selectJsPlugins } from "./oxlint.plugins.ts";

const jsPlugins = selectJsPlugins(["custom"]);

export default defineConfig({
  env: core.env,
  extends: [core, jsPlugins],
  ignorePatterns: core.ignorePatterns,
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import { selectJsPlugins } from "./oxlint.plugins.ts";'
    );
    expect(content).toContain('const jsPlugins = selectJsPlugins(["custom"]);');
    expect(content).toContain("  extends: [\n    core,\n    jsPlugins,\n  ],");
    expect(content).not.toContain("ultracite/oxlint/js-plugins");
  });

  test("gives a preset another name when the project's code uses its own", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

import react from "./oxlint.react.ts";

export default defineConfig({
  env: core.env,
  extends: [core, react],
  ignorePatterns: core.ignorePatterns,
});
`,
    });

    await oxlint.update({ frameworks: ["react"] });

    const [[configPath, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import ultraciteReact from "ultracite/oxlint/react";'
    );
    expect(content).toContain('import react from "./oxlint.react.ts";');
    expect(content).toContain(
      "  extends: [\n    core,\n    ultraciteReact,\n    react,\n  ],"
    );

    const rerun = mockProject({ [configPath]: content });

    await oxlint.update({ frameworks: ["react"] });

    const [[, rerunContent]] = rerun.writeFile.mock.calls;
    expect(rerunContent).toBe(content);
  });

  test("doesn't reuse the name another preset is imported under", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import react from "ultracite/oxlint/core";

export default defineConfig({
  env: react.env,
  extends: [react],
  ignorePatterns: react.ignorePatterns,
});
`,
    });

    await oxlint.update({ frameworks: ["react"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain('import react from "ultracite/oxlint/core";');
    expect(content).toContain(
      'import ultraciteReact from "ultracite/oxlint/react";'
    );
    expect(content).toContain("extends: [react, ultraciteReact],");
  });

  test("keeps the project's own extend named like a legacy selection", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

import selectedJsPlugins from "./oxlint.plugins.ts";

export default defineConfig({
  env: core.env,
  extends: [core, selectedJsPlugins],
  ignorePatterns: core.ignorePatterns,
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import selectedJsPlugins from "./oxlint.plugins.ts";'
    );
    expect(content).toContain(
      "  extends: [\n    core,\n    selectedJsPlugins,\n  ],"
    );
  });

  test("keeps a const of the project's own named like a legacy selection", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

import shared from "./oxlint.shared.ts";

const selectedJsPlugins = shared.plugins;

export default defineConfig({
  env: core.env,
  extends: [core, selectedJsPlugins],
  ignorePatterns: core.ignorePatterns,
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("const selectedJsPlugins = shared.plugins;");
    expect(content).toContain(
      "  extends: [\n    core,\n    selectedJsPlugins,\n  ],"
    );
  });

  test("keeps a second import of a preset under its own name", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import base from "ultracite/oxlint/core";

export default defineConfig({
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: { ...base.rules },
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain('import core from "ultracite/oxlint/core";');
    expect(content).toContain('import base from "ultracite/oxlint/core";');
    expect(content).toContain("extends: [core],");
    expect(content).toContain("rules: { ...base.rules },");
  });

  // A selectJsPlugins helper of the project's own, not Ultracite's.
  const ownSelectJsPluginsConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

import { selectJsPlugins } from "./oxlint.helpers.ts";

const jsPlugins = selectJsPlugins(["github"]);

export default defineConfig({
  env: core.env,
  extends: [core, jsPlugins],
  ignorePatterns: core.ignorePatterns,
});
`;

  test("doesn't read a selectJsPlugins of the project's own as a selection", async () => {
    const project = mockProject({
      "./oxlint.config.ts": ownSelectJsPluginsConfig,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import { selectJsPlugins } from "./oxlint.helpers.ts";'
    );
    expect(content).toContain('const jsPlugins = selectJsPlugins(["github"]);');
    expect(content).toContain("  extends: [\n    core,\n    jsPlugins,\n  ],");
    expect(content).not.toContain("ultracite/oxlint/js-plugins");
  });

  test("leaves a config unchanged when it declares a name the Ultracite config needs", async () => {
    const project = mockProject({
      "./oxlint.config.ts": ownSelectJsPluginsConfig,
    });

    await oxlint.update({ jsPlugins: ["eslint-plugin-github"] });

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn.mock.calls[0]?.[0]).toContain(
      "declares its own `selectJsPlugins`"
    );
  });

  test("keeps the env of a `core` that isn't the core preset", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";

import shared from "./oxlint.shared.ts";

const core = shared.core;

export default defineConfig({
  env: core.env,
  extends: [shared],
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import ultraciteCore from "ultracite/oxlint/core";'
    );
    expect(content).toContain("env: core.env,");
    expect(content).not.toContain("ultraciteCore.env");
  });

  test("keeps the js-plugins helpers the project's own code uses", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  settings: { ...jsPluginSettings },
});
`,
    });

    await oxlint.update();

    const [[configPath, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      'import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";'
    );
    expect(content).toContain("settings: { ...jsPluginSettings },");

    const rerun = mockProject({ [configPath]: content });

    await oxlint.update();

    const [[, rerunContent]] = rerun.writeFile.mock.calls;
    expect(rerunContent).toBe(content);
  });
});

const importSource = (line: string) => line.slice(line.lastIndexOf(" from "));

// What `ultracite fix` does to a config's imports: sorts them by source.
const sortImports = (content: string): string => {
  const lines = content.split("\n");
  const importCount = lines.findIndex((line) => !line.startsWith("import "));

  const sorted = lines
    .slice(0, importCount)
    .toSorted((left, right) =>
      importSource(left).localeCompare(importSource(right))
    );

  return [...sorted, ...lines.slice(importCount)].join("\n");
};

describe("oxlint preset order", () => {
  // A config init wrote, once `ultracite fix` has sorted its imports.
  const sortedConfig = `import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import astro from "ultracite/oxlint/astro";
import core from "ultracite/oxlint/core";

export default defineConfig({
  env: core.env,
  extends: [core, astro, antiSlop],
  ignorePatterns: core.ignorePatterns,
});
`;

  test("follows extends rather than the sorted imports on update (#863)", async () => {
    const project = mockProject({ "./oxlint.config.ts": sortedConfig });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("extends: [core, astro, antiSlop],");
    expect(project.info).not.toHaveBeenCalled();
  });

  test("keeps anti-slop last when it is selected again", async () => {
    const project = mockProject({ "./oxlint.config.ts": sortedConfig });

    await oxlint.update({ jsPlugins: ["anti-slop"] });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("extends: [core, astro, antiSlop],");
    expect(project.info).not.toHaveBeenCalled();
  });

  test("puts presets that are out of order back in order, and says so", async () => {
    const project = mockProject({
      "./oxlint.config.ts": sortedConfig.replace(
        "extends: [core, astro, antiSlop],",
        "extends: [antiSlop, astro, core],"
      ),
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("extends: [core, astro, antiSlop],");
    expect(project.info.mock.calls[0]?.[0]).toContain(
      "to [core, astro, antiSlop]"
    );
  });

  test("leaves its own config unchanged once the imports are sorted", async () => {
    const created = mockProject({});

    await oxlint.create({
      frameworks: ["react", "next"],
      jsPlugins: ["oxlint-plugin-react-doctor", "anti-slop"],
    });

    const [[configPath, content]] = created.writeFile.mock.calls;
    const project = mockProject({ [configPath]: sortImports(content) });

    await oxlint.update();

    const [[, updated]] = project.writeFile.mock.calls;
    expect(updated).toBe(content);
    expect(project.info).not.toHaveBeenCalled();
  });

  test("keeps the project's own extends entries where they were", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import effect from "@effect/tsgo/oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

import base from "./oxlint.base.ts";
import local from "./oxlint.local.ts";

export default defineConfig({
  env: core.env,
  extends: [base, core, effect, react, local],
  ignorePatterns: core.ignorePatterns,
});
`,
    });

    await oxlint.update({ frameworks: ["next"], jsPlugins: ["anti-slop"] });

    const [[, content]] = project.writeFile.mock.calls;
    // base stays under the presets and local over them; effect stays right
    // after core.
    expect(content).toContain(`  extends: [
    base,
    core,
    effect,
    react,
    next,
    antiSlop,
    local,
  ],`);
  });

  test("puts the js-plugins selection ahead of anti-slop", async () => {
    const project = mockProject({
      "./oxlint.config.ts": `import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";

const jsPlugins = selectJsPlugins(["github"]);

export default defineConfig({
  env: core.env,
  extends: [core, antiSlop, jsPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: jsPlugins.jsPlugins,
});
`,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("extends: [core, jsPlugins, antiSlop],");
    expect(project.info.mock.calls[0]?.[0]).toContain(
      "to [core, jsPlugins, antiSlop]"
    );
  });

  test("doesn't count .oxlintrc.json presets as part of the config's order", async () => {
    const project = mockProject({
      "./.oxlintrc.json":
        '{ "extends": ["./node_modules/ultracite/config/oxlint/react/.oxlintrc.json"] }',
      "./oxlint.config.ts": sortedConfig,
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("extends: [core, react, astro, antiSlop],");
    expect(
      project.info.mock.calls.some(([message]) => message.includes("Reordered"))
    ).toBe(false);
  });
});

describe("oxlint config file name", () => {
  const config = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: core.ignorePatterns,
});
`;

  test("writes oxlint.config.mts in a package without a type", async () => {
    const project = mockProject({ "package.json": '{"name": "app"}' });

    await oxlint.create();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./oxlint.config.mts");
  });

  test("writes oxlint.config.ts in an ES module package", async () => {
    const project = mockProject({ "package.json": '{"type": "module"}' });

    await oxlint.create();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./oxlint.config.ts");
  });

  test("keeps an existing config's name on re-run", async () => {
    const typeless = mockProject({
      "./oxlint.config.ts": config,
      "package.json": '{"name": "app"}',
    });

    await oxlint.update();
    expect(typeless.writeFile.mock.calls[0]?.[0]).toBe("./oxlint.config.ts");
    expect(typeless.rm).not.toHaveBeenCalled();

    const esm = mockProject({
      "./oxlint.config.mts": config,
      "package.json": '{"type": "module"}',
    });

    await oxlint.update();
    expect(esm.writeFile.mock.calls[0]?.[0]).toBe("./oxlint.config.mts");
  });

  test("moves a .ts config in a CommonJS package to .mts", async () => {
    const project = mockProject({
      "./oxlint.config.ts": config,
      "package.json": '{"type": "commonjs"}',
    });

    await oxlint.update();

    expect(project.writeFile.mock.calls[0]?.[0]).toBe("./oxlint.config.mts");
    expect(project.rm.mock.calls.map(([filePath]) => filePath)).toEqual([
      "./oxlint.config.ts",
    ]);
    expect(project.info.mock.calls[0]?.[0]).toContain(
      "Renamed oxlint.config.ts to oxlint.config.mts"
    );
  });

  test("leaves both names alone when .ts and .mts exist", async () => {
    const project = mockProject({
      "./oxlint.config.mts": config,
      "./oxlint.config.ts": config,
    });

    await oxlint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.warn).toHaveBeenCalled();
  });
});

describe("oxlint type-aware option", () => {
  const plainConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: core.ignorePatterns,
});
`;

  test("create turns type-aware linting on in the config", async () => {
    const project = mockProject({});

    await oxlint.create({ typeAware: true });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("  options: { typeAware: true },");
  });

  test("create leaves it off by default", async () => {
    const project = mockProject({});

    await oxlint.create();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).not.toContain("typeAware");
  });

  test("update adds it to a config without options", async () => {
    const project = mockProject({ "./oxlint.config.ts": plainConfig });

    await oxlint.update({ typeAware: true });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("  options: { typeAware: true },");
    expect(project.warn).not.toHaveBeenCalled();
  });

  test("update keeps it when re-run without the flag", async () => {
    const project = mockProject({
      "./oxlint.config.ts": plainConfig.replace(
        "  ignorePatterns",
        "  options: { typeAware: true },\n  ignorePatterns"
      ),
    });

    await oxlint.update();

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain("options: { typeAware: true }");
  });

  test("update leaves a project's own options as written and says so", async () => {
    const project = mockProject({
      "./oxlint.config.ts": plainConfig.replace(
        "  ignorePatterns",
        "  options: { reportUnusedDisableDirectives: true },\n  ignorePatterns"
      ),
    });

    await oxlint.update({ typeAware: true });

    const [[, content]] = project.writeFile.mock.calls;
    expect(content).toContain(
      "options: { reportUnusedDisableDirectives: true }"
    );
    expect(content).not.toContain("typeAware");
    expect(project.warn).toHaveBeenCalled();
  });
});

// An oxlint.config.ts that extends core plus the given lines.
const coreConfigWith = (...lines: string[]): string =>
  ['import core from "ultracite/oxlint/core";', ...lines].join("\n");

describe("findLoadedJsPlugins", () => {
  test("finds nothing in a config that extends core alone", () => {
    expect(findLoadedJsPlugins(coreConfigWith())).toEqual([]);
  });

  test("reads a selectJsPlugins selection", () => {
    expect(
      findLoadedJsPlugins(
        coreConfigWith(
          'import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";',
          'const jsPlugins = selectJsPlugins(["react-doctor", "tsdoc"]);'
        )
      )
    ).toEqual(["oxlint-plugin-react-doctor", "eslint-plugin-tsdoc"]);
  });

  test("expands the full js-plugins preset", () => {
    expect(
      findLoadedJsPlugins(
        coreConfigWith(
          'import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";'
        )
      )
    ).toEqual([
      "eslint-plugin-github",
      "eslint-plugin-sonarjs",
      "oxlint-plugin-react-doctor",
    ]);
  });

  test("counts the React Doctor add-ons and the shadcn preset", () => {
    expect(
      findLoadedJsPlugins(
        coreConfigWith(
          'import nextJsPlugins from "ultracite/oxlint/next/js-plugins";',
          'import shadcn from "ultracite/oxlint/shadcn";'
        )
      )
    ).toEqual(["oxlint-plugin-react-doctor", "@shadcn/lint"]);
  });

  test("finds plugin packages a config names itself", () => {
    expect(
      findLoadedJsPlugins(
        coreConfigWith(
          "export default {",
          "  jsPlugins: [{ name: 'sonarjs', specifier: 'eslint-plugin-sonarjs' }],",
          "};"
        )
      )
    ).toEqual(["eslint-plugin-sonarjs"]);
  });

  test("ignores a selectJsPlugins of the project's own", () => {
    expect(
      findLoadedJsPlugins(`import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

import { selectJsPlugins } from "./lint.ts";

const plugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({ extends: [core, plugins] });
`)
    ).toEqual([]);
  });

  test("counts a preset extended through a const of the project's own", () => {
    expect(
      findLoadedJsPlugins(`import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";

const rules = { "sonarjs/todo-tag": "off" };
const plugins = { ...jsPlugins, rules: { ...jsPlugins.rules, ...rules } };

export default defineConfig({ extends: [core, plugins] });
`)
    ).toEqual([
      "eslint-plugin-github",
      "eslint-plugin-sonarjs",
      "oxlint-plugin-react-doctor",
    ]);
  });

  test("counts a preset extended through an `import * as`", () => {
    expect(
      findLoadedJsPlugins(`import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import * as nextPlugins from "ultracite/oxlint/next/js-plugins";

export default defineConfig({ extends: [core, nextPlugins.default] });
`)
    ).toEqual(["oxlint-plugin-react-doctor"]);
  });

  test("doesn't count a preset only the project's other properties use", () => {
    expect(
      findLoadedJsPlugins(`import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";

const githubRules = { ...jsPlugins.rules };

export default defineConfig({ extends: [core], rules: githubRules });
`)
    ).toEqual([]);
  });

  test("doesn't count a preset an extends entry only reads a property of", () => {
    expect(
      findLoadedJsPlugins(`import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";

const mine = { rules: { ...jsPlugins.rules } };

export default defineConfig({ extends: [core, mine] });
`)
    ).toEqual([]);
  });

  test("follows only the const an extends entry names", () => {
    expect(
      findLoadedJsPlugins(`import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";

const mine = {}, other = jsPlugins;
const rules = Object.fromEntries([other].map((jsPlugins) => [jsPlugins, 1]));

export default defineConfig({ extends: [core, mine, { rules }] });
`)
    ).toEqual([]);
  });

  test("never reports the vendored anti-slop plugin", () => {
    expect(
      findLoadedJsPlugins(
        coreConfigWith('import antiSlop from "ultracite/oxlint/anti-slop";')
      )
    ).toEqual([]);
  });
});
