import { describe, expect, mock, test } from "bun:test";

import { oxlint } from "../src/linters/oxlint";

// Helper to generate the expected oxlint config path
const getOxlintConfigPath = (name: string) => `ultracite/oxlint/${name}`;

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("oxlint linter", () => {
  describe("exists", () => {
    test("returns true when oxlint config exists", async () => {
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
      expect(writeCall[0]).toBe("./oxlint.config.ts");
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
      expect(content).toMatch(
        /extends: \[[\s\S]*nextJsPlugins,[\s\S]*tanstackJsPlugins,[\s\S]*selectJsPlugins\(\["react-doctor"\]\)/u
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
      expect(content).toContain('selectJsPlugins(["github", "sonarjs"])');
      // The filtering logic lives inside ultracite, not the generated file,
      // so user-side lint presets (e.g. anti-slop) cannot flag it — see #770.
      expect(content).not.toContain("typeof");
      // A blank line must separate the imports from the config so the file
      // is born compliant with import/newline-after-import.
      expect(content).toContain('";\n\nexport default defineConfig({');
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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

    test("preserves a selectJsPlugins selection during update", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      const existingConfig = `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  extends: [core, selectJsPlugins(["react-doctor"])],
  ignorePatterns: core.ignorePatterns,
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const [, content] = writeCall;
      expect(content).toContain('selectJsPlugins(["react-doctor"])');
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
        accessSync: mock(() => {}),
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

    test("warns when file mentions ultracite but extends cannot be parsed", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      const consoleWarnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = consoleWarnSpy;

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
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await oxlint.update();

      expect(consoleWarnSpy).toHaveBeenCalled();
      console.warn = originalWarn;
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
        accessSync: mock(() => {}),
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
        accessSync: mock(() => {}),
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
