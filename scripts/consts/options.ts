import { type PackageManagerName, packageManagers } from "nypm";

export const options = {
  packageManagers: packageManagers.map((pm) => pm.name) as PackageManagerName[],
  editorConfigs: ["vscode", "zed"] as const,
  editorRules: [
    "vscode-copilot",
    "cursor",
    "windsurf",
    "zed",
    "claude",
    "codex",
    "kiro",
    "cline",
    "amp",
    "aider",
    "firebase-studio",
    "open-hands",
    "gemini-cli",
    "junie",
    "augmentcode",
    "kilo-code",
    "goose",
  ] as const,
  integrations: ["husky", "lefthook", "lint-staged"] as const,
};
