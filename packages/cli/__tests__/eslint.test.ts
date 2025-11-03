import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { eslintCleanup } from '../src/migrations/eslint';

mock.module('node:fs/promises', () => ({
  access: mock(() => Promise.reject(new Error('ENOENT'))),
  readFile: mock(() => Promise.resolve('{}')),
  writeFile: mock(() => Promise.resolve()),
  unlink: mock(() => Promise.resolve()),
}));

mock.module('nypm', () => ({
  addDevDependency: mock(() => Promise.resolve()),
  dlxCommand: mock(() => 'npx ultracite fix'),
  detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
  removeDependency: mock(() => Promise.resolve()),
}));

describe('eslintCleanup', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('hasEsLint', () => {
    test('returns true when eslint is in dependencies', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{"devDependencies": {"eslint": "8.0.0"}}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.hasEsLint();
      expect(result).toBe(true);
    });

    test('returns true when eslint config file exists', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === '.eslintrc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.hasEsLint();
      expect(result).toBe(true);
    });

    test('returns false when eslint is not found', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.hasEsLint();
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    test('removes eslint packages', async () => {
      const mockRemoveDep = mock(() => Promise.resolve());
      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mockRemoveDep,
      }));

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{"devDependencies": {"eslint": "8.0.0", "eslint-plugin-react": "7.0.0"}}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove('npm');

      expect(result.packagesRemoved).toContain('eslint');
      expect(result.packagesRemoved).toContain('eslint-plugin-react');
      expect(mockRemoveDep).toHaveBeenCalled();
    });

    test('removes eslint config files', async () => {
      const mockUnlink = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === '.eslintrc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mockUnlink,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove('npm');

      expect(result.filesRemoved).toContain('.eslintrc');
      expect(mockUnlink).toHaveBeenCalled();
    });

    test('cleans VSCode eslint settings', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.vscode/settings.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock((path: string) => {
          if (path === './.vscode/settings.json') {
            return Promise.resolve('{"eslint.enable": true, "editor.codeActionsOnSave": {"source.fixAll.eslint": true}}');
          }
          return Promise.resolve('{}');
        }),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove('npm');

      expect(result.vsCodeCleaned).toBe(true);
    });

    test('handles missing VSCode settings gracefully', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove('npm');

      expect(result.vsCodeCleaned).toBe(false);
    });
  });
});
