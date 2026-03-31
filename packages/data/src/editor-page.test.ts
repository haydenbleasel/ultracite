import { describe, expect, test } from "bun:test";

import {
  getEditorPageCapabilities,
  getEditorSetupFiles,
} from "./editor-page.ts";

describe("editor page helpers", () => {
  test("derives a settings-only VS Code page shape", () => {
    const source = {
      config: {
        code: "{}",
        extensionCommand: "code --install-extension",
        path: ".vscode/settings.json",
      },
      id: "vscode",
      name: "Visual Studio Code",
    };

    expect(getEditorPageCapabilities(source)).toEqual({
      configFormat: "json",
      configPath: ".vscode/settings.json",
      family: "vscode",
      hasExtensionInstall: true,
      hasHooks: false,
      hasRules: false,
      supportsAppendRules: false,
    });
    expect(getEditorSetupFiles(source).map((item) => item.title)).toEqual([
      "Workspace settings",
    ]);
  });

  test("derives rules and hooks for ai-vscode editors", () => {
    const source = {
      config: {
        code: "{}",
        extensionCommand: "code --install-extension",
        path: ".vscode/settings.json",
      },
      hooks: {
        code: '{"hooks":{}}',
        path: ".cursor/hooks.json",
      },
      id: "cursor",
      name: "Cursor",
      rules: {
        code: "# Rules",
        path: ".cursor/rules/ultracite.mdc",
      },
    };

    expect(getEditorPageCapabilities(source).family).toBe("ai-vscode");
    expect(getEditorSetupFiles(source).map((item) => item.title)).toEqual([
      "Workspace settings",
      "AI rules",
      "Post-edit hooks",
    ]);
  });

  test("derives native append-mode behavior for zed", () => {
    const source = {
      config: {
        code: "{}",
        path: ".zed/settings.json",
      },
      id: "zed",
      name: "Zed",
      rules: {
        appendMode: true,
        code: "# Rules",
        path: ".rules",
      },
    };

    expect(getEditorPageCapabilities(source)).toEqual({
      configFormat: "json",
      configPath: ".zed/settings.json",
      family: "native",
      hasExtensionInstall: false,
      hasHooks: false,
      hasRules: true,
      supportsAppendRules: true,
    });
    expect(getEditorSetupFiles(source).map((item) => item.path)).toEqual([
      ".zed/settings.json",
      ".rules",
    ]);
  });

  test("derives CodeBuddy rules and hooks for ai-vscode editors", () => {
    const source = {
      config: {
        code: "{}",
        extensionCommand: "code --install-extension",
        path: ".vscode/settings.json",
      },
      hooks: {
        code: '{"hooks":{"PostToolUse":[]}}',
        path: ".codebuddy/settings.json",
      },
      id: "codebuddy",
      name: "CodeBuddy",
      rules: {
        appendMode: true,
        code: "# Rules",
        path: "CODEBUDDY.md",
      },
    };

    expect(getEditorPageCapabilities(source)).toEqual({
      configFormat: "json",
      configPath: ".vscode/settings.json",
      family: "ai-vscode",
      hasExtensionInstall: true,
      hasHooks: true,
      hasRules: true,
      supportsAppendRules: true,
    });
    expect(getEditorSetupFiles(source).map((item) => item.path)).toEqual([
      ".vscode/settings.json",
      "CODEBUDDY.md",
      ".codebuddy/settings.json",
    ]);
  });
});
