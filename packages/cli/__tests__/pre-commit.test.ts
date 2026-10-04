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
    });
  });
});
