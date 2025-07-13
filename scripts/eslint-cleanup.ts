import { execSync } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { parse } from 'jsonc-parser';
import { exists } from './utils';

// Common ESLint configuration files
const eslintConfigFiles = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  '.eslintrc.config.js',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  '.eslintignore',
];

const detectESLintPackages = async (): Promise<string[]> => {
  try {
    const packageJsonContent = await readFile('package.json', 'utf-8');
    const packageJson = parse(packageJsonContent) as
      | Record<string, unknown>
      | undefined;

    if (!packageJson || typeof packageJson !== 'object') {
      return [];
    }

    const dependencies =
      (packageJson.dependencies as Record<string, string>) || {};
    const devDependencies =
      (packageJson.devDependencies as Record<string, string>) || {};

    const allDeps = { ...dependencies, ...devDependencies };

    return Object.keys(allDeps).filter(
      (dep) =>
        dep.startsWith('eslint') ||
        dep === '@eslint/js' ||
        dep === '@typescript-eslint/parser' ||
        dep === '@typescript-eslint/eslint-plugin'
    );
  } catch {
    return [];
  }
};

const removeESLintDependencies = (
  packageManagerRemove: string,
  packages: string[]
) => {
  if (packages.length === 0) return;

  const packageList = packages.join(' ');

  try {
    execSync(`${packageManagerRemove} ${packageList}`, { stdio: 'pipe' });
  } catch (error) {
    // Silently handle errors - dependencies might already be removed
  }
};

const removeESLintConfigFiles = async (): Promise<string[]> => {
  const removedFiles: string[] = [];

  for (const file of eslintConfigFiles) {
    if (await exists(file)) {
      try {
        await unlink(file);
        removedFiles.push(file);
      } catch {
        // Silently handle errors - file might be read-only or already deleted
      }
    }
  }

  return removedFiles;
};

const cleanVSCodeESLintSettings = async (): Promise<boolean> => {
  const settingsPath = './.vscode/settings.json';

  if (!(await exists(settingsPath))) {
    return false;
  }

  try {
    const existingContents = await readFile(settingsPath, 'utf-8');
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    if (!existingConfig || typeof existingConfig !== 'object') {
      return false;
    }

    let changed = false;
    const newConfig = { ...existingConfig };

    // Remove ESLint-specific settings
    const eslintSettings = [
      'eslint.enable',
      'eslint.format.enable',
      'eslint.validate',
      'eslint.workingDirectories',
      'eslint.codeAction.showDocumentation',
      'eslint.run',
      'eslint.autoFixOnSave',
      'eslint.quiet',
      'eslint.packageManager',
      'eslint.options',
      'eslint.trace.server',
    ];

    for (const setting of eslintSettings) {
      if (setting in newConfig) {
        delete newConfig[setting];
        changed = true;
      }
    }

    // Clean up codeActionsOnSave to remove ESLint actions
    if ('editor.codeActionsOnSave' in newConfig) {
      const codeActions = newConfig['editor.codeActionsOnSave'] as Record<
        string,
        unknown
      >;
      if (codeActions && typeof codeActions === 'object') {
        const eslintActions = [
          'source.fixAll.eslint',
          'source.organizeImports.eslint',
        ];

        for (const action of eslintActions) {
          if (action in codeActions) {
            delete codeActions[action];
            changed = true;
          }
        }

        // Remove the entire codeActionsOnSave if it's now empty
        if (Object.keys(codeActions).length === 0) {
          delete newConfig['editor.codeActionsOnSave'];
        }
      }
    }

    if (changed) {
      await writeFile(settingsPath, JSON.stringify(newConfig, null, 2));
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const hasESLint = async (): Promise<boolean> => {
  // Check for dependencies
  const packages = await detectESLintPackages();
  if (packages.length > 0) return true;

  // Check for config files
  for (const file of eslintConfigFiles) {
    if (await exists(file)) return true;
  }

  return false;
};

const getPackageManagerRemove = (packageManagerAdd: string): string => {
  if (packageManagerAdd.startsWith('npm')) {
    return 'npm uninstall';
  }
  if (packageManagerAdd.startsWith('yarn')) {
    return 'yarn remove';
  }
  if (packageManagerAdd.startsWith('pnpm')) {
    return 'pnpm remove';
  }
  if (packageManagerAdd.startsWith('bun')) {
    return 'bun remove';
  }

  // Default fallback
  return 'npm uninstall';
};

export const eslintCleanup = {
  hasESLint,

  remove: async (
    packageManagerAdd: string
  ): Promise<{
    packagesRemoved: string[];
    filesRemoved: string[];
    vsCodeCleaned: boolean;
  }> => {
    const packages = await detectESLintPackages();
    const packageManagerRemove = getPackageManagerRemove(packageManagerAdd);

    // Remove dependencies
    removeESLintDependencies(packageManagerRemove, packages);

    // Remove config files
    const filesRemoved = await removeESLintConfigFiles();

    // Clean VS Code settings
    const vsCodeCleaned = await cleanVSCodeESLintSettings();

    return {
      packagesRemoved: packages,
      filesRemoved,
      vsCodeCleaned,
    };
  },
};
