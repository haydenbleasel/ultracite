import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lefthook } from '../scripts/lefthook';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('lefthook configuration', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when lefthook.yml exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await lefthook.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./lefthook.yml');
    });

    it('should return false when lefthook.yml does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await lefthook.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./lefthook.yml');
    });
  });

  describe('install', () => {
    it('should install lefthook as dev dependency and run install', () => {
      const packageManagerAdd = 'npm install';

      lefthook.install(packageManagerAdd);

      expect(mockExecSync).toHaveBeenCalledWith('npm install -D lefthook');
      expect(mockExecSync).toHaveBeenCalledWith('npx lefthook install');
    });

    it('should work with different package managers', () => {
      const packageManagerAdd = 'yarn add';

      lefthook.install(packageManagerAdd);

      expect(mockExecSync).toHaveBeenCalledWith('yarn add -D lefthook');
      expect(mockExecSync).toHaveBeenCalledWith('npx lefthook install');
    });
  });

  describe('create', () => {
    it('should create lefthook.yml with ultracite format command', async () => {
      await lefthook.create();

      expect(mockWriteFile).toHaveBeenCalledWith(
        './lefthook.yml',
        `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`
      );
    });
  });

  describe('update', () => {
    it('should not modify config if ultracite command already exists', async () => {
      const existingContent = `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
    - run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update();

      expect(mockReadFile).toHaveBeenCalledWith('./lefthook.yml', 'utf-8');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should add ultracite job to existing pre-commit jobs section', async () => {
      const existingContent = `pre-commit:
  jobs:
    - run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update();

      expect(mockReadFile).toHaveBeenCalledWith('./lefthook.yml', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './lefthook.yml',
        `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
    - run: npm run lint`
      );
    });

    it('should add jobs section to existing pre-commit without jobs', async () => {
      const existingContent = `pre-commit:
  commands:
    lint:
      run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update();

      expect(mockReadFile).toHaveBeenCalledWith('./lefthook.yml', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './lefthook.yml',
        `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
  commands:
    lint:
      run: npm run lint`
      );
    });

    it('should append new pre-commit section if none exists', async () => {
      const existingContent = `commit-msg:
  commands:
    lint:
      run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update();

      expect(mockReadFile).toHaveBeenCalledWith('./lefthook.yml', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './lefthook.yml',
        `commit-msg:
  commands:
    lint:
      run: npm run lint
pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`
      );
    });

    it('should handle empty existing content', async () => {
      mockReadFile.mockResolvedValue('');

      await lefthook.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        './lefthook.yml',
        `
pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`
      );
    });
  });
});
