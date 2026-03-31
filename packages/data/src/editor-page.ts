export type EditorFamily = "ai-vscode" | "native" | "vscode";

export interface EditorPageCapabilities {
  configFormat: "json" | "markdown";
  configPath: string;
  family: EditorFamily;
  hasExtensionInstall: boolean;
  hasHooks: boolean;
  hasRules: boolean;
  supportsAppendRules: boolean;
}

export interface EditorSetupFile {
  code: string;
  description: string;
  lang: "json" | "markdown";
  path: string;
  title: string;
}

export interface EditorPageSource {
  config: {
    code: string;
    extensionCommand?: string;
    path: string;
  };
  hooks?: {
    code: string;
    path: string;
  };
  id: string;
  name: string;
  rules?: {
    appendMode?: boolean;
    code: string;
    path: string;
  };
}

const getEditorFamily = (editor: EditorPageSource): EditorFamily => {
  if (editor.id === "zed") {
    return "native";
  }

  if (editor.hooks || editor.rules) {
    return "ai-vscode";
  }

  return "vscode";
};

const getConfigFormat = (path: string): "json" | "markdown" =>
  path.endsWith(".json") ? "json" : "markdown";

const getRulesDescription = (editor: EditorPageSource) => {
  if (editor.rules?.appendMode) {
    return `Append Ultracite's guidance into \`${editor.rules.path}\` so ${editor.name} keeps any existing project instructions and gains consistent repo standards.`;
  }

  return `Use \`${editor.rules?.path}\` to teach ${editor.name} how Ultracite expects code to be written before the formatter and linter run.`;
};

const getSettingsDescription = (editor: EditorPageSource) => {
  if (getEditorFamily(editor) === "native") {
    return `This native settings file keeps ${editor.name}'s formatter, code actions, and language tooling aligned with Ultracite.`;
  }

  return `This workspace settings file keeps ${editor.name} aligned with Ultracite for format on save, auto-fixes, and TypeScript defaults.`;
};

export const getEditorPageCapabilities = (
  editor: EditorPageSource
): EditorPageCapabilities => ({
  configFormat: getConfigFormat(editor.config.path),
  configPath: editor.config.path,
  family: getEditorFamily(editor),
  hasExtensionInstall: Boolean(editor.config.extensionCommand),
  hasHooks: Boolean(editor.hooks),
  hasRules: Boolean(editor.rules),
  supportsAppendRules: Boolean(editor.rules?.appendMode),
});

export const getEditorSetupFiles = (
  editor: EditorPageSource
): EditorSetupFile[] => {
  const files: EditorSetupFile[] = [
    {
      code: editor.config.code,
      description: getSettingsDescription(editor),
      lang: "json",
      path: editor.config.path,
      title: "Workspace settings",
    },
  ];

  if (editor.rules) {
    files.push({
      code: editor.rules.code,
      description: getRulesDescription(editor),
      lang: "markdown",
      path: editor.rules.path,
      title: "AI rules",
    });
  }

  if (editor.hooks) {
    files.push({
      code: editor.hooks.code,
      description: `Run Ultracite automatically after ${editor.name} edits files so generated code is formatted and safe fixes are applied right away.`,
      lang: "json",
      path: editor.hooks.path,
      title: "Post-edit hooks",
    });
  }

  return files;
};
