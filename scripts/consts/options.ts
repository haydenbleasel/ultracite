import { type PackageManagerName, packageManagers } from 'nypm';

export const options = {
  packageManagers: packageManagers.map((pm) => pm.name) as PackageManagerName[],
  editorConfigs: ['vscode', 'zed'],
  editorRules: [
    'vscode-copilot',
    'cursor',
    'windsurf',
    'zed',
    'claude',
    'codex',
    'kiro',
  ],
  integrations: ['husky', 'lefthook', 'lint-staged'],
};
