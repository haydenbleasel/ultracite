import { execSync } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prettierCleanup } from '../scripts/migrations/prettier';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('prettier-cleanup', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockUnlink = vi.mocked(unlink);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasPrettier', () => {
    it('should return true when prettier dependencies exist', async () => {
      const packageJson = {
        devDependencies: {
          prettier: '^2.0.0',
          'eslint-plugin-prettier': '^4.0.0',
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(true);
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should return true when prettier-prefixed packages exist', async () => {
      const packageJson = {
        devDependencies: {
          'prettier-plugin-tailwindcss': '^0.1.0',
          'prettier-plugin-svelte': '^2.0.0',
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(true);
    });

    it('should return false when prettier is in package name but not at start', async () => {
      const packageJson = {
        devDependencies: {
          'remark-preset-prettier': '^1.0.0',
          'some-other-prettier-tool': '^1.0.0',
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExists.mockResolvedValue(false);

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(false);
    });

    it('should return true when prettier config files exist', async () => {
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation(async (path: string) => {
        return path === '.prettierrc';
      });

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(true);
    });

    it('should return false when no prettier dependencies or config files exist', async () => {
      const packageJson = {
        devDependencies: {
          typescript: '^4.0.0',
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExists.mockResolvedValue(false);

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove prettier dependencies and config files', async () => {
      const packageJson = {
        devDependencies: {
          prettier: '^2.0.0',
          'eslint-plugin-prettier': '^4.0.0',
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
        return path === '.prettierrc' || path === '.prettierignore';
      });

      mockUnlink.mockResolvedValue();
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await prettierCleanup.remove('npm install');

      expect(result.packagesRemoved).toEqual([
        'prettier',
        'eslint-plugin-prettier',
      ]);
      expect(result.filesRemoved).toEqual(['.prettierrc', '.prettierignore']);
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm uninstall prettier eslint-plugin-prettier',
        { stdio: 'pipe' }
      );
      expect(mockUnlink).toHaveBeenCalledWith('.prettierrc');
      expect(mockUnlink).toHaveBeenCalledWith('.prettierignore');
    });

    it('should only remove packages that start with prettier', async () => {
      const packageJson = {
        devDependencies: {
          prettier: '^2.0.0',
          'prettier-plugin-tailwindcss': '^0.1.0',
          'remark-preset-prettier': '^1.0.0', // Should NOT be removed
          'eslint-plugin-prettier': '^4.0.0',
          typescript: '^4.0.0',
        },
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === 'package.json') {
          return JSON.stringify(packageJson);
        }
        return '{}';
      });

      mockExists.mockResolvedValue(false);
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await prettierCleanup.remove('npm install');

      // Should only include packages that start with 'prettier' or are in the specific exceptions list
      expect(result.packagesRemoved).toEqual([
        'prettier',
        'prettier-plugin-tailwindcss',
        'eslint-plugin-prettier',
      ]);
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm uninstall prettier prettier-plugin-tailwindcss eslint-plugin-prettier',
        { stdio: 'pipe' }
      );
    });

    it('should handle different package managers', async () => {
      mockReadFile.mockResolvedValue(
        '{"devDependencies":{"prettier":"^2.0.0"}}'
      );
      mockExists.mockResolvedValue(false);

      await prettierCleanup.remove('pnpm add');

      expect(mockExecSync).toHaveBeenCalledWith('pnpm remove prettier', {
        stdio: 'pipe',
      });
    });

    it('should clean VS Code settings', async () => {
      const vscodeSettings = {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'prettier.enable': true,
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

      const result = await prettierCleanup.remove('npm install');

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        JSON.stringify(
          {
            'typescript.tsdk': 'node_modules/typescript/lib',
          },
          null,
          2
        )
      );
    });

    it('should handle execution errors gracefully', async () => {
      mockReadFile.mockResolvedValue(
        '{"devDependencies":{"prettier":"^2.0.0"}}'
      );
      mockExists.mockResolvedValue(false);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await prettierCleanup.remove('npm install');

      expect(result.packagesRemoved).toEqual(['prettier']);
      expect(result.filesRemoved).toEqual([]);
      expect(result.vsCodeCleaned).toBe(false);
    });
  });
});
