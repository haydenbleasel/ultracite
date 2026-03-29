import { describe, expect, test } from "bun:test";

const decoder = new TextDecoder();

const loadEditorSummary = () => {
  const result = Bun.spawnSync({
    cmd: [
      "bun",
      "-e",
      `
        import { editors, getEditorPageData } from "./packages/data/src/editors.ts";

        const summary = editors.map((editor) => ({
          differentiatorKey: editor.differentiators.map((item) => item.title).join("|"),
          id: editor.id,
          metaDescription: getEditorPageData(editor).metaDescription,
          relatedEditors: getEditorPageData(editor).relatedEditors.map((item) => item.id),
          title: getEditorPageData(editor).title,
        }));

        console.log(JSON.stringify(summary));
      `,
    ],
    cwd: process.cwd(),
    stderr: "pipe",
    stdout: "pipe",
  });

  expect(result.exitCode).toBe(0);

  return JSON.parse(decoder.decode(result.stdout)) as Array<{
    differentiatorKey: string;
    id: string;
    metaDescription: string;
    relatedEditors: string[];
    title: string;
  }>;
};

describe("editor page content", () => {
  test("every editor has unique titles, meta descriptions, and differentiator sets", () => {
    const summary = loadEditorSummary();

    expect(new Set(summary.map((item) => item.title)).size).toBe(summary.length);
    expect(new Set(summary.map((item) => item.metaDescription)).size).toBe(
      summary.length
    );
    expect(
      new Set(summary.map((item) => item.differentiatorKey)).size
    ).toBe(summary.length);
  });

  test("related editors never include the current editor", () => {
    const summary = loadEditorSummary();

    for (const item of summary) {
      expect(item.relatedEditors).toHaveLength(3);
      expect(item.relatedEditors.includes(item.id)).toBeFalse();
    }
  });
});
