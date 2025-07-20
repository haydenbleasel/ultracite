import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { husky } from '../scripts/husky';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
  getPackageExecutor: vi.fn().mockImplementation((packageManagerAdd: string) => {
    if (packageManagerAdd.startsWith('pnpm')) {
      return 'pnpm exec';
    }
    if (packageManagerAdd.startsWith('bun')) {
      return 'bunx';
    }
    if (packageManagerAdd.startsWith('yarn')) {
      return 'yarn';
    }
    return 'npx';
  }),
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
      const packageManagerAdd = 'npm install';

      husky.install(packageManagerAdd);

      expect(mockExecSync).toHaveBeenCalledWith('npm install -D husky');
    });

    it('should work with different package managers', () => {
      const packageManagerAdd = 'yarn add';

      husky.install(packageManagerAdd);

      expect(mockExecSync).toHaveBeenCalledWith('yarn add -D husky');
    });
  });

  describe('create', () => {
    it('should create .husky/pre-commit with npm command', async () => {
      await husky.create('npm install');

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        'npx ultracite format'
      );
    });

    it('should create .husky/pre-commit with pnpm command', async () => {
      await husky.create('pnpm add');

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        'pnpm exec ultracite format'
      );
    });

    it('should create .husky/pre-commit with yarn command', async () => {
      await husky.create('yarn add');

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        'yarn ultracite format'
      );
    });

    it('should create .husky/pre-commit with bun command', async () => {
      await husky.create('bun add');

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        'bunx ultracite format'
      );
    });
  });

  describe('update', () => {
    it('should append npm ultracite format command to existing pre-commit hook', async () => {
      const existingContent = '#!/bin/sh\nnpm test';
      mockReadFile.mockResolvedValue(existingContent);

      await husky.update('npm install');

      expect(mockReadFile).toHaveBeenCalledWith('./.husky/pre-commit', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        '#!/bin/sh\nnpm test\nnpx ultracite format'
      );
    });

    it('should append pnpm ultracite format command to existing pre-commit hook', async () => {
      const existingContent = '#!/bin/sh\npnpm test';
      mockReadFile.mockResolvedValue(existingContent);

      await husky.update('pnpm add');

      expect(mockReadFile).toHaveBeenCalledWith('./.husky/pre-commit', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        '#!/bin/sh\npnpm test\npnpm exec ultracite format'
      );
    });

    it('should handle empty existing content', async () => {
      mockReadFile.mockResolvedValue('');

      await husky.update('yarn add');

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.husky/pre-commit',
        '\nyarn ultracite format'
      );
    });
  });
});
