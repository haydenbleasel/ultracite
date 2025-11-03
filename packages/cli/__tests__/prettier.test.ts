import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { prettierCleanup } from '../src/migrations/prettier';

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

describe('prettierCleanup', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('hasPrettier', () => {
    test('returns true when prettier is in dependencies', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{"devDependencies": {"prettier": "2.0.0"}}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.hasPrettier();
      expect(result).toBe(true);
    });

    test('returns true when prettier config file exists', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === '.prettierrc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.hasPrettier();
      expect(result).toBe(true);
    });

    test('returns false when prettier is not found', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.hasPrettier();
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    test('removes prettier packages', async () => {
      const mockRemoveDep = mock(() => Promise.resolve());
      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mockRemoveDep,
      }));

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{"devDependencies": {"prettier": "2.0.0", "prettier-plugin-tailwind": "1.0.0"}}')),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.remove('npm');

      expect(result.packagesRemoved).toContain('prettier');
      expect(result.packagesRemoved).toContain('prettier-plugin-tailwind');
      expect(mockRemoveDep).toHaveBeenCalled();
    });

    test('removes prettier config files', async () => {
      const mockUnlink = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === '.prettierrc') {
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

      const result = await prettierCleanup.remove('npm');

      expect(result.filesRemoved).toContain('.prettierrc');
      expect(mockUnlink).toHaveBeenCalled();
    });

    test('cleans VSCode prettier settings', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.vscode/settings.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock((path: string) => {
          if (path === './.vscode/settings.json') {
            return Promise.resolve('{"editor.defaultFormatter": "esbenp.prettier-vscode"}');
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

      const result = await prettierCleanup.remove('npm');

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

      const result = await prettierCleanup.remove('npm');

      expect(result.vsCodeCleaned).toBe(false);
    });
  });
});
