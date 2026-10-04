import { describe, expect, mock, test } from "bun:test";

import { oxlint } from "../src/linters/oxlint";

// Helper to generate the expected oxlint config path
const getOxlintConfigPath = (name: string) => `ultracite/oxlint/${name}`;

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

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
      expect(content).toMatch(
        /extends: \[[\s\S]*nextJsPlugins,[\s\S]*tanstackJsPlugins,\s*jsPlugins,?\s*\]/u
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
      // shadcn sits before anti-slop so anti-slop's core-rule overrides
      // stay last; the js-plugins selection follows the plain extends.
      expect(content).toContain(
        "extends: [core, shadcn, antiSlop, jsPlugins],"
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

      // No explicit selection: the previously enabled preset must survive.
      await oxlint.update({ frameworks: ["react"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(
        content.match(/import shadcn from "ultracite\/oxlint\/shadcn";/gu)
          ?.length
      ).toBe(1);
      expect(content).toContain("extends: [core, shadcn, react],");
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
    log: { error: mock(), info, success: mock(), warn },
  }));

  return { info, rm, warn, writeFile };
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
    expect(content).toContain('"node": true');
    expect(project.rm).toHaveBeenCalled();
  });

  test("leaves everything unchanged when .oxlintrc.json can't be parsed", async () => {
    const project = mockProject({ "./.oxlintrc.json": '{ "rules": ' });

    await oxlint.update();

    expect(project.writeFile).not.toHaveBeenCalled();
    expect(project.rm).not.toHaveBeenCalled();
    expect(project.warn.mock.calls[0]?.[0]).toContain(".oxlintrc.json");
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
