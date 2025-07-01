import { execSync } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eslintCleanup } from '../scripts/eslint-cleanup';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('eslint-cleanup', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockUnlink = vi.mocked(unlink);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasESLint', () => {
    it('should return true when eslint dependencies exist', async () => {
      const packageJson = {
        devDependencies: {
          eslint: '^8.0.0',
          '@typescript-eslint/parser': '^5.0.0',
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(true);
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should return true when eslint config files exist', async () => {
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation(async (path: string) => {
        return path === '.eslintrc.js';
      });

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(true);
    });

    it('should return false when no eslint dependencies or config files exist', async () => {
      const packageJson = {
        devDependencies: {
          typescript: '^4.0.0',
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExists.mockResolvedValue(false);

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove eslint dependencies and config files', async () => {
      const packageJson = {
        devDependencies: {
          eslint: '^8.0.0',
          '@typescript-eslint/parser': '^5.0.0',
          typescript: '^4.0.0',
        },
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === 'package.json') {
          return JSON.stringify(packageJson);
        }
        return '{}';
      });

      mockExists.mockImplementation(async (path: string) => {
        return path === '.eslintrc.js' || path === '.eslintignore';
      });

      mockUnlink.mockResolvedValue();
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await eslintCleanup.remove('npm install');

      expect(result.packagesRemoved).toEqual(['eslint', '@typescript-eslint/parser']);
      expect(result.filesRemoved).toEqual(['.eslintrc.js', '.eslintignore']);
      expect(mockExecSync).toHaveBeenCalledWith('npm uninstall eslint @typescript-eslint/parser', { stdio: 'pipe' });
      expect(mockUnlink).toHaveBeenCalledWith('.eslintrc.js');
      expect(mockUnlink).toHaveBeenCalledWith('.eslintignore');
    });

    it('should handle different package managers', async () => {
      mockReadFile.mockResolvedValue('{"devDependencies":{"eslint":"^8.0.0"}}');
      mockExists.mockResolvedValue(false);

      await eslintCleanup.remove('yarn add');

      expect(mockExecSync).toHaveBeenCalledWith('yarn remove eslint', { stdio: 'pipe' });
    });

    it('should clean VS Code settings', async () => {
      const vscodeSettings = {
        'eslint.enable': true,
        'eslint.format.enable': true,
        'editor.codeActionsOnSave': {
          'source.fixAll.eslint': true,
          'source.organizeImports.biome': 'explicit',
        },
        'typescript.tsdk': 'node_modules/typescript/lib',
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === 'package.json') {
          return '{}';
        }
        if (path === './.vscode/settings.json') {
          return JSON.stringify(vscodeSettings);
        }
        return '{}';
      });

      mockExists.mockImplementation(async (path: string) => {
        return path === './.vscode/settings.json';
      });

      const result = await eslintCleanup.remove('npm install');

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        JSON.stringify({
          'editor.codeActionsOnSave': {
            'source.organizeImports.biome': 'explicit',
          },
          'typescript.tsdk': 'node_modules/typescript/lib',
        }, null, 2)
      );
    });

    it('should handle execution errors gracefully', async () => {
      mockReadFile.mockResolvedValue('{"devDependencies":{"eslint":"^8.0.0"}}');
      mockExists.mockResolvedValue(false);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await eslintCleanup.remove('npm install');

      expect(result.packagesRemoved).toEqual(['eslint']);
      expect(result.filesRemoved).toEqual([]);
      expect(result.vsCodeCleaned).toBe(false);
    });
  });
});