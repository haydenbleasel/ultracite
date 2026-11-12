import { describe, expect, test } from "bun:test";

import {
  arrayEntries,
  parseConfigModule,
  renderEntries,
  renderImport,
  renderJsonProperty,
  stringArrayValues,
} from "../src/linters/config-module";

const source = `// Oxlint config
import { defineConfig, type OxlintConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import effect from "@effect/tsgo/oxlint"; // Effect diagnostics

const jsPlugins = selectJsPlugins(["github"]);

export default defineConfig({
  extends: [core, effect],
  // project-specific
  rules: { "no-console": "off" }, // noisy
  ...shared,
  // plugins: [],
} satisfies OxlintConfig);
`;

describe("parseConfigModule", () => {
  test("splits imports, statements and the exported config", () => {
    const parsed = parseConfigModule(source);

    if (parsed.kind !== "module") {
      throw new Error(`expected a module, got ${parsed.kind}`);
    }

    const { module } = parsed;
    expect(module.callee).toBe("defineConfig");
    expect(module.container).toBe("object");
    expect(module.imports.map((item) => item.source)).toEqual([
      "oxlint",
      "ultracite/oxlint/core",
      "@effect/tsgo/oxlint",
    ]);
    expect(module.imports[0]?.text).toBe(
      '// Oxlint config\nimport { defineConfig, type OxlintConfig } from "oxlint";'
    );
    expect(module.imports[0]?.namedSpecifiers.map((item) => item.text)).toEqual(
      ["defineConfig", "type OxlintConfig"]
    );
    expect(module.imports[2]?.text).toBe(
      'import effect from "@effect/tsgo/oxlint"; // Effect diagnostics'
    );
    expect(module.statements).toEqual([
      {
        declaredNames: ["jsPlugins"],
        initCallee: "selectJsPlugins",
        names: ["selectJsPlugins"],
        sources: new Map([["jsPlugins", []]]),
        text: 'const jsPlugins = selectJsPlugins(["github"]);',
      },
    ]);
    expect(
      module.entries.map(({ comment, key, spreadOf, text }) => ({
        comment,
        key,
        spreadOf,
        text,
      }))
    ).toEqual([
      {
        comment: null,
        key: "extends",
        spreadOf: null,
        text: "extends: [core, effect]",
      },
      {
        comment: "// noisy",
        key: "rules",
        spreadOf: null,
        text: '// project-specific\n  rules: { "no-console": "off" }',
      },
      { comment: null, key: null, spreadOf: "shared", text: "...shared" },
    ]);
    expect(module.danglingComments).toEqual(["// plugins: [],"]);
  });

  test("reads array and argument-list configs", () => {
    const array = parseConfigModule("export default [...core, { rules: {} }];");

    const args = parseConfigModule(
      "export default tseslint.config(...core, { rules: {} });"
    );

    expect(array.kind === "module" && array.module.container).toBe("array");
    expect(args.kind === "module" && args.module.container).toBe("arguments");
    expect(
      args.kind === "module" &&
        args.module.entries.map((entry) => entry.spreadOf)
    ).toEqual(["core", null]);
  });

  test("tells syntax errors apart from configs without a default export", () => {
    expect(parseConfigModule("export default {").kind).toBe("unparseable");
    expect(parseConfigModule("module.exports = {};").kind).toBe("unrecognized");
  });

  test("reads the names code uses, not property keys, comments or strings", () => {
    const parsed =
      parseConfigModule(`const local = { ...shared, rules: base.rules };

export default defineConfig({
  // Not selectJsPlugins.
  jsPlugins: ["jsPluginSettings"],
  rules: { ...local, [key]: \`\${level}\` },
  settings,
});
`);

    if (parsed.kind !== "module") {
      throw new Error(`expected a module, got ${parsed.kind}`);
    }

    expect(parsed.module.statements.map((item) => item.names)).toEqual([
      ["shared", "base"],
    ]);
    expect(parsed.module.entries.map((entry) => entry.names)).toEqual([
      [],
      ["local", "key", "level"],
      ["settings"],
    ]);
  });

  test("doesn't read the names code declares or the keys of types and classes", () => {
    const parsed =
      parseConfigModule(`const pick = (list, { core } = defaults) =>
  list.map((jsPlugins) => [jsPlugins, core, outer]);
type Options = { fullPlugins(): void; rules: Linter.Rules };
enum Level { jsPluginSettings }
class Cache { #core = 1; read() { return this.#core; } }
function wrap(config) { try { return config; } catch (error) { return error; } }

export default {};
`);

    if (parsed.kind !== "module") {
      throw new Error(`expected a module, got ${parsed.kind}`);
    }

    expect(parsed.module.statements.map((item) => item.names)).toEqual([
      ["defaults", "outer"],
      ["Linter"],
      [],
      [],
      [],
    ]);
  });

  test("reads what each const and entry takes its whole value from", () => {
    const config = `const a = [], b = core, c = { ...jsPlugins, rules: react.rules };

export default defineConfig({
  extends: [b, jp.default, { ...c }, preset.rules],
});
`;

    const parsed = parseConfigModule(config);

    if (parsed.kind !== "module") {
      throw new Error(`expected a module, got ${parsed.kind}`);
    }

    expect(parsed.module.statements[0]?.sources).toEqual(
      new Map([
        ["a", []],
        ["b", ["core"]],
        ["c", ["jsPlugins"]],
      ])
    );

    const [extendsEntry] = parsed.module.entries;

    expect(
      arrayEntries(config, extendsEntry?.value ?? null)?.map(
        (entry) => entry.sources
      )
    ).toEqual([["b"], ["jp.default"], ["c"], []]);
  });
});

describe("rendering", () => {
  test("renders entries with their comments", () => {
    expect(
      renderEntries(
        [
          { comment: null, text: "...core" },
          { comment: "// noisy", text: '\n  rules: { "a": "off" }' },
        ],
        ["// dangling"]
      )
    ).toBe('  ...core,\n  rules: { "a": "off" }, // noisy\n  // dangling');
  });

  test("renders imports and JSON properties", () => {
    expect(renderImport("oxlint", ["defineConfig", "type X"])).toBe(
      'import { defineConfig, type X } from "oxlint";'
    );
    expect(renderJsonProperty("no-console", "off").text).toBe(
      '"no-console": "off"'
    );
    expect(renderJsonProperty("rules", { a: 1 }).text).toBe(
      'rules: {\n    "a": 1\n  }'
    );
  });

  test("reads string arrays only when every element is a string", () => {
    const parsed = parseConfigModule(
      'export default { a: ["x", "y"], b: ["x", y] };'
    );

    const values =
      parsed.kind === "module"
        ? parsed.module.entries.map((entry) => stringArrayValues(entry.value))
        : [];

    expect(values).toEqual([["x", "y"], null]);
  });
});
