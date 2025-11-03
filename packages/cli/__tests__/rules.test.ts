import { mkdir, readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAgents } from "../src/agents";
import { AGENTS } from "../src/consts/rules";
import { exists } from "../src/utils";

vi.mock("node:fs/promises");
vi.mock("../src/utils", () => ({
  exists: vi.fn(),
}));
vi.mock("../src/agents/rules", () => ({
  core: ["core rule 1", "core rule 2"],
  react: ["react rule 1"],
  next: ["next rule 1"],
  qwik: ["qwik rule 1"],
  solid: ["solid rule 1"],
  svelte: ["svelte rule 1"],
  vue: ["vue rule 1"],
  angular: [],
  remix: [],
  astro: ["astro rule 1"],
}));

describe("agent configurations", () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockReadFile = vi.mocked(readFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    // Default mock for non-cursor files
    mockReadFile.mockResolvedValue("existing content");
  });

  const editorConfigs = Object.entries(AGENTS).map(([name, config]) => ({
    name,
    ...config,
  }));

  describe.each(editorConfigs)(
    "$name configuration",
    ({ name, path, header, appendMode }) => {
      const editor = createAgents(name as keyof typeof AGENTS);
      const mockRulesContent = "core rule 1\ncore rule 2";
      const isCursor = name === "cursor";
      const expectedCursorContent = JSON.stringify(
        {
          version: 1,
          hooks: {
            afterFileEdit: [{ command: "npx ultracite fix" }],
          },
        },
        null,
        2
      );
      const expectedContent = isCursor
        ? expectedCursorContent
        : header
          ? `${header}\n\n${mockRulesContent}`
          : mockRulesContent;
      const expectedDir = path.includes("/")
        ? path.substring(0, path.lastIndexOf("/"))
        : ".";
      const cleanDir = expectedDir.startsWith("./")
        ? expectedDir.slice(2)
        : expectedDir;

      describe("exists", () => {
        it(`should return true when ${path} exists`, async () => {
          mockExists.mockResolvedValue(true);

          const result = await editor.exists();

          expect(result).toBe(true);
          expect(mockExists).toHaveBeenCalledWith(path);
        });

        it(`should return false when ${path} does not exist`, async () => {
          mockExists.mockResolvedValue(false);

          const result = await editor.exists();

          expect(result).toBe(false);
          expect(mockExists).toHaveBeenCalledWith(path);
        });
      });

      describe("create", () => {
        it(`should create ${path} with rules content`, async () => {
          await editor.create();

          if (cleanDir !== ".") {
            expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
              recursive: true,
            });
          }

          if (isCursor) {
            // Cursor writes both the rules file and hooks file
            expect(mockWriteFile).toHaveBeenCalledTimes(2);
            expect(mockWriteFile).toHaveBeenNthCalledWith(
              1,
              path,
              header ? `${header}\n\n${mockRulesContent}` : mockRulesContent
            );
            expect(mockWriteFile).toHaveBeenNthCalledWith(
              2,
              "./.cursor/hooks.json",
              expectedCursorContent
            );
          } else {
            expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
          }
        });

        if (cleanDir !== ".") {
          it("should handle mkdir errors gracefully", async () => {
            mockMkdir.mockRejectedValueOnce(new Error("Permission denied"));

            await expect(editor.create()).rejects.toThrow("Permission denied");
            expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
              recursive: true,
            });
          });
        }

        it("should handle writeFile errors gracefully", async () => {
          mockWriteFile.mockRejectedValueOnce(new Error("Permission denied"));

          await expect(editor.create()).rejects.toThrow("Permission denied");

          if (isCursor) {
            // For cursor, the first writeFile call is for the rules file
            expect(mockWriteFile).toHaveBeenCalledWith(
              path,
              header ? `${header}\n\n${mockRulesContent}` : mockRulesContent
            );
          } else {
            expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
          }
        });
      });

      describe("update", () => {
        if (appendMode) {
          it(`should append to ${path} when file exists and content not present`, async () => {
            mockExists.mockResolvedValue(true);
            mockReadFile.mockResolvedValue("existing content");

            await editor.update();

            if (cleanDir !== ".") {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }
            expect(mockReadFile).toHaveBeenCalledWith(path, "utf-8");
            expect(mockWriteFile).toHaveBeenCalledWith(
              path,
              `existing content\n\n${mockRulesContent}`
            );
          });

          it(`should not duplicate content in ${path} when already present`, async () => {
            mockExists.mockResolvedValue(true);
            mockReadFile.mockResolvedValue(
              `existing content\n\n${mockRulesContent}`
            );

            await editor.update();

            if (cleanDir !== ".") {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }
            expect(mockReadFile).toHaveBeenCalledWith(path, "utf-8");
            expect(mockWriteFile).not.toHaveBeenCalled();
          });

          it(`should create ${path} when file does not exist`, async () => {
            mockExists.mockResolvedValue(false);

            await editor.update();

            if (cleanDir !== ".") {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }
            expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
          });
        } else {
          it(`should overwrite ${path} with rules content`, async () => {
            // For cursor, mock the hooks.json file read
            if (isCursor) {
              mockReadFile.mockResolvedValueOnce(
                JSON.stringify({
                  version: 1,
                  hooks: { afterFileEdit: [] },
                })
              );
            }

            await editor.update();

            if (cleanDir !== ".") {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }

            if (isCursor) {
              // Cursor writes both the rules file and hooks file
              expect(mockWriteFile).toHaveBeenCalledTimes(2);
              expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                path,
                header ? `${header}\n\n${mockRulesContent}` : mockRulesContent
              );
              expect(mockWriteFile).toHaveBeenNthCalledWith(
                2,
                "./.cursor/hooks.json",
                expect.stringContaining('"afterFileEdit"')
              );
            } else {
              expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
            }
          });
        }

        if (cleanDir !== ".") {
          it("should handle mkdir errors gracefully", async () => {
            mockMkdir.mockRejectedValueOnce(new Error("Permission denied"));

            await expect(editor.update()).rejects.toThrow("Permission denied");
            expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
              recursive: true,
            });
          });
        }

        it("should handle writeFile errors gracefully", async () => {
          mockWriteFile.mockRejectedValueOnce(new Error("Permission denied"));

          await expect(editor.update()).rejects.toThrow("Permission denied");
        });
      });
    }
  );
});
