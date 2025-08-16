import { type PackageManagerName, packageManagers } from 'nypm';

export const options = {
  packageManagers: packageManagers.map((pm) => pm.name) as PackageManagerName[],
  editorConfigs: ['vscode', 'zed'] as const,
  editorRules: [
    'vscode-copilot',
    'cursor',
    'windsurf',
    'zed',
    'claude',
    'codex',
    'kiro',
  ] as const,
  integrations: ['husky', 'lefthook', 'lint-staged'] as const,
};
