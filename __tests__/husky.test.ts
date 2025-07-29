import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import type { PackageManagerName } from 'nypm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { husky } from '../scripts/husky';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('husky configuration', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when .husky/pre-commit exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await husky.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./.husky/pre-commit');
    });

    it('should return false when .husky/pre-commit does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await husky.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./.husky/pre-commit');
    });
  });

  describe('install', () => {
    it('should install husky as dev dependency', () => {
      const packageManager: PackageManagerName = 'npm';

      husky.install(packageManager);

      expect(mockExecSync).toHaveBeenCalledWith('npm install -D husky');
    });

    it('should work with different package managers', () => {
      const packageManager: PackageManagerName = 'yarn';

      husky.install(packageManager);

      expect(mockExecSync).toHaveBeenCalledWith('yarn add -D husky');
    });
  });

  describe('create', () => {
    it('should create .husky/pre-commit with ultracite format command', async () => {
      await husky.create();

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        'npx ultracite format'
      );
    });
  });

  describe('update', () => {
    it('should append ultracite format command to existing pre-commit hook', async () => {
      const existingContent = '#!/bin/sh\nnpm test';
      mockReadFile.mockResolvedValue(existingContent);

      await husky.update();

      expect(mockReadFile).toHaveBeenCalledWith('./.husky/pre-commit', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        '#!/bin/sh\nnpm test\nnpx ultracite format'
      );
    });

    it('should handle empty existing content', async () => {
      mockReadFile.mockResolvedValue('');

      await husky.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        '\nnpx ultracite format'
      );
    });
  });
});
