import { describe, expect, test } from "bun:test";

import { getEditorFileTargets } from "../src/editors";

describe("getEditorFileTargets", () => {
  test("groups VS Code-based editors into a universal option", () => {
    const targets = getEditorFileTargets();
    const universalTarget = targets.find((target) => target.id === "universal");

    expect(universalTarget).toEqual(
      expect.objectContaining({
        displayName: "Universal",
        path: ".vscode/settings.json",
        representativeEditorId: "vscode",
      })
    );
    expect(universalTarget?.editorIds).toEqual(
      expect.arrayContaining(["vscode", "cursor", "codebuddy", "windsurf"])
    );
    expect(universalTarget?.promptLabel).toContain(
      "creates .vscode/settings.json"
    );
  });

  test("sorts the universal target to the front", () => {
    const targets = getEditorFileTargets();

    expect(targets[0].id).toBe("universal");
    for (let i = 1; i < targets.length; i += 1) {
      expect(targets[i].id).not.toBe("universal");
    }
  });

  test("keeps editor-specific files as dedicated options", () => {
    const targets = getEditorFileTargets();
    const zedTarget = targets.find((target) => target.id === "zed");

    expect(zedTarget).toEqual(
      expect.objectContaining({
        displayName: "Zed",
        path: ".zed/settings.json",
        promptLabel: "Zed (creates .zed/settings.json)",
        representativeEditorId: "zed",
      })
    );
  });
});
