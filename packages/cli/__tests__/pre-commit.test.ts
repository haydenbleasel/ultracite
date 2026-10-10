import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { log } from "@clack/prompts";
import YAML from "yaml";

import { preCommit } from "../src/integrations/pre-commit";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  dlxCommand: mock(() => "npx ultracite fix"),
}));

// Updates a config whose content is `existing`; returns what's written.
const runUpdate = async (
  existing: string,
  packageManager: "npm" | "pnpm" | "yarn" = "npm"
): Promise<string | undefined> => {
  let written: string | undefined;
  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.resolve()),
    readFile: mock(() => Promise.resolve(existing)),
    writeFile: mock((_path: string, content: string) => {
      written = content;
      return Promise.resolve();
    }),
  }));

  await preCommit.update(packageManager);

  return written;
};

const FILES_PATTERN = String.raw`\.(js|jsx|mjs|cjs|ts|tsx|mts|cts|json|jsonc|css|scss|less|vue|svelte|astro|html|md|mdx|yaml|yml|graphql|gql)$`;

const hookIds = (config: string): string[] =>
  YAML.parse(config).repos.flatMap((repo: { hooks: { id: string }[] }) =>
    repo.hooks.map((hook) => hook.id)
  );

describe("pre-commit", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when .pre-commit-config.yaml exists", async () => {
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

      const result = await preCommit.exists();
      expect(result).toBe(true);
    });

    test("returns false when .pre-commit-config.yaml does not exist", async () => {
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

      const result = await preCommit.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates .pre-commit-config.yaml with correct content", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await preCommit.create("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./.pre-commit-config.yaml");
      expect(writeCall[1]).toContain("repos:");
      expect(writeCall[1]).toContain("repo: local");
      expect(writeCall[1]).toContain("id: ultracite");
      expect(writeCall[1]).toContain("npx ultracite fix");
      expect(writeCall[1]).toContain("language: system");
    });
  });

  describe("update", () => {
    test("skips update if ultracite hook already exists", async () => {
      const existingContent = `repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: npx ultracite fix
        language: system
`;
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await preCommit.update("npm");

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("adds ultracite hook to existing repos section", async () => {
      const existingContent = `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.0.0
    hooks:
      - id: trailing-whitespace
`;
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await preCommit.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("id: ultracite");
      expect(writeCall[1]).toContain("trailing-whitespace");
    });

    test("creates repos section if not present", async () => {
      const existingContent = "# pre-commit configuration\n";
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await preCommit.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("repos:");
      expect(writeCall[1]).toContain("id: ultracite");
    });
  });

  describe("update (regressions)", () => {
    test("keeps a zero-indent repos list (pre-commit sample-config) valid", async () => {
      const output =
        await runUpdate(`# See https://pre-commit.com for more information
repos:
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v3.2.0
    hooks:
    -   id: trailing-whitespace
`);

      expect(output).toBeDefined();
      expect(output).toContain("# See https://pre-commit.com");
      expect(output).toContain("\n- repo: local\n");
      expect(hookIds(output ?? "")).toEqual([
        "ultracite",
        "trailing-whitespace",
      ]);
    });

    test("keeps a four-space indented repos list valid", async () => {
      const output = await runUpdate(`repos:
    - repo: https://github.com/psf/black
      rev: 22.10.0
      hooks:
          - id: black
`);

      expect(hookIds(output ?? "")).toEqual(["ultracite", "black"]);
    });

    test("fills an empty inline repos list", async () => {
      const output = await runUpdate("repos: []\n");

      expect(hookIds(output ?? "")).toEqual(["ultracite"]);
      expect(YAML.parse(output ?? "").repos[0].hooks[0]).toMatchObject({
        require_serial: true,
      });
    });

    test("upgrades a dlx entry from an earlier init", async () => {
      const output = await runUpdate(
        `repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: yarn dlx ultracite fix
        language: system
`,
        "yarn"
      );

      expect(output).toContain("entry: yarn ultracite fix");
      expect(output).not.toContain("dlx");
    });

    test("leaves a hand-written ultracite entry alone", async () => {
      const output = await runUpdate(`repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: npx ultracite fix --unsafe
        language: system
`);

      expect(output).toBeUndefined();
    });

    test("warns instead of writing when the YAML can't be parsed", async () => {
      const warn = spyOn(log, "warn").mockImplementation(() => {});

      const output = await runUpdate("repos: [\n");

      expect(output).toBeUndefined();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    test("passes the staged files to a hook from an earlier init", async () => {
      const output = await runUpdate(`repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: npx ultracite fix
        language: system
        types_or: [javascript, jsx, ts, tsx, json, css]
        pass_filenames: false
`);

      const [hook] = YAML.parse(output ?? "").repos[0].hooks;
      expect(hook.pass_filenames).toBeUndefined();
      expect(hook.require_serial).toBe(true);
      expect(hook.entry).toBe("npx ultracite fix");
      // The old types_or becomes the files pattern, in the same place
      expect(hook.types_or).toBeUndefined();
      expect(Object.keys(hook)).toEqual([
        "id",
        "name",
        "entry",
        "language",
        "files",
        "require_serial",
      ]);
      expect(hook.files).toBe(FILES_PATTERN);
    });

    test("leaves types_or a user edited alone", async () => {
      const output = await runUpdate(`repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: npx ultracite fix
        language: system
        types_or: [javascript, ts]
`);

      expect(output).toBeUndefined();
    });

    test("matches every file type the toolchains handle", async () => {
      let written = "";
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock((_path: string, content: string) => {
          written = content;
          return Promise.resolve();
        }),
      }));

      await preCommit.create("npm");

      const [hook] = YAML.parse(written).repos[0].hooks;
      const pattern = new RegExp(hook.files, "u");
      const handled = [
        "a.js",
        "a.jsx",
        "a.mjs",
        "a.cjs",
        "a.ts",
        "src/a b.tsx",
        "a.mts",
        "a.cts",
        "a.json",
        "a.jsonc",
        "a.css",
        "a.scss",
        "a.less",
        "a.vue",
        "a.svelte",
        "a.astro",
        "a.html",
        "README.md",
        "a.mdx",
        "a.yaml",
        "a.yml",
        "a.graphql",
        "a.gql",
      ];
      expect(handled.filter((file) => !pattern.test(file))).toEqual([]);
      expect(
        ["Dockerfile", "a.js.map", "a.py"].filter((file) => pattern.test(file))
      ).toEqual([]);
      expect(hook.types_or).toBeUndefined();
    });

    test("leaves pass_filenames on a hand-written ultracite entry alone", async () => {
      const output = await runUpdate(`repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: npx ultracite fix --unsafe
        language: system
        pass_filenames: false
`);

      expect(output).toBeUndefined();
    });

    test("leaves a hook that already passes the staged files unchanged", async () => {
      let written: string | undefined;
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock((_path: string, content: string) => {
          written = content;
          return Promise.resolve();
        }),
      }));
      await preCommit.create("npm");

      expect(await runUpdate(written ?? "")).toBeUndefined();
    });

    test("creates a hook that runs the project's installed ultracite", async () => {
      let written = "";
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock((_path: string, content: string) => {
          written = content;
          return Promise.resolve();
        }),
      }));

      await preCommit.create("pnpm");

      expect(written).toContain("entry: pnpm exec ultracite fix");
      expect(hookIds(written)).toEqual(["ultracite"]);
      // Only the staged files, in a single run
      const [hook] = YAML.parse(written).repos[0].hooks;
      expect(hook.pass_filenames).toBeUndefined();
      expect(hook.require_serial).toBe(true);
    });
  });
});
