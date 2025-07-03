import { execSync } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'jsonc-parser';
import { exists } from './utils';

// Common Prettier configuration files
const prettierConfigFiles = [
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.config.js',
  'prettier.config.js',
  'prettier.config.mjs',
  '.prettierignore',
];

const detectPrettierPackages = async (): Promise<string[]> => {
  try {
    const packageJsonContent = await readFile('package.json', 'utf-8');
    const packageJson = parse(packageJsonContent) as Record<string, unknown> | undefined;
    
    if (!packageJson || typeof packageJson !== 'object') {
      return [];
    }

    const dependencies = packageJson.dependencies as Record<string, string> || {};
    const devDependencies = packageJson.devDependencies as Record<string, string> || {};
    
    const allDeps = { ...dependencies, ...devDependencies };
    
    return Object.keys(allDeps).filter(dep => 
      dep.startsWith('prettier') || 
      dep === 'eslint-config-prettier' ||
      dep === 'eslint-plugin-prettier'
    );
  } catch {
    return [];
  }
};

const removePrettierDependencies = (packageManagerRemove: string, packages: string[]) => {
  if (packages.length === 0) return;
  
  const packageList = packages.join(' ');
  
  try {
    execSync(`${packageManagerRemove} ${packageList}`, { stdio: 'pipe' });
  } catch (error) {
    // Silently handle errors - dependencies might already be removed
  }
};

const removePrettierConfigFiles = async (): Promise<string[]> => {
  const removedFiles: string[] = [];
  
  for (const file of prettierConfigFiles) {
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

const cleanVSCodePrettierSettings = async (): Promise<boolean> => {
  const settingsPath = './.vscode/settings.json';
  
  if (!(await exists(settingsPath))) {
    return false;
  }
  
  try {
    const existingContents = await readFile(settingsPath, 'utf-8');
    const existingConfig = parse(existingContents) as Record<string, unknown> | undefined;
    
    if (!existingConfig || typeof existingConfig !== 'object') {
      return false;
    }
    
    let changed = false;
    const newConfig = { ...existingConfig };
    
    // Remove Prettier-specific settings
    const prettierSettings = [
      'editor.defaultFormatter',
      'prettier.enable',
      'prettier.requireConfig',
      'prettier.configPath',
      'prettier.printWidth',
      'prettier.tabWidth',
      'prettier.useTabs',
      'prettier.semi',
      'prettier.singleQuote',
      'prettier.quoteProps',
      'prettier.trailingComma',
      'prettier.bracketSpacing',
      'prettier.arrowParens',
      'prettier.endOfLine',
    ];
    
    for (const setting of prettierSettings) {
      if (setting in newConfig) {
        if (setting === 'editor.defaultFormatter' && newConfig[setting] === 'esbenp.prettier-vscode') {
          delete newConfig[setting];
          changed = true;
        } else if (setting !== 'editor.defaultFormatter') {
          delete newConfig[setting];
          changed = true;
        }
      }
    }
    
    // Remove Prettier from language-specific formatters
    const languageKeys = Object.keys(newConfig).filter(key => key.startsWith('[') && key.includes('javascript'));
    
    for (const langKey of languageKeys) {
      const langConfig = newConfig[langKey] as Record<string, unknown>;
      if (langConfig && typeof langConfig === 'object' && 'editor.defaultFormatter' in langConfig) {
        if (langConfig['editor.defaultFormatter'] === 'esbenp.prettier-vscode') {
          delete langConfig['editor.defaultFormatter'];
          changed = true;
          
          // Remove the language key if it's now empty
          if (Object.keys(langConfig).length === 0) {
            delete newConfig[langKey];
          }
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

const hasPrettier = async (): Promise<boolean> => {
  // Check for dependencies
  const packages = await detectPrettierPackages();
  if (packages.length > 0) return true;
  
  // Check for config files
  for (const file of prettierConfigFiles) {
    if (await exists(file)) return true;
  }
  
  return false;
};

const getPackageManagerRemove = (packageManagerAdd: string): string => {
  if (packageManagerAdd.startsWith('npm')) {
    return 'npm uninstall';
  } else if (packageManagerAdd.startsWith('yarn')) {
    return 'yarn remove';
  } else if (packageManagerAdd.startsWith('pnpm')) {
    return 'pnpm remove';
  } else if (packageManagerAdd.startsWith('bun')) {
    return 'bun remove';
  }
  
  // Default fallback
  return 'npm uninstall';
};

export const prettierCleanup = {
  hasPrettier,
  
  remove: async (packageManagerAdd: string): Promise<{
    packagesRemoved: string[];
    filesRemoved: string[];
    vsCodeCleaned: boolean;
  }> => {
    const packages = await detectPrettierPackages();
    const packageManagerRemove = getPackageManagerRemove(packageManagerAdd);
    
    // Remove dependencies
    removePrettierDependencies(packageManagerRemove, packages);
    
    // Remove config files
    const filesRemoved = await removePrettierConfigFiles();
    
    // Clean VS Code settings
    const vsCodeCleaned = await cleanVSCodePrettierSettings();
    
    return {
      packagesRemoved: packages,
      filesRemoved,
      vsCodeCleaned,
    };
  },
};