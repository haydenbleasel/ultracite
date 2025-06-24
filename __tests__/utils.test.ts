import { access, readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, isMonorepo } from '../scripts/utils';

vi.mock('node:fs/promises');

describe('utils', () => {
  const mockAccess = vi.mocked(access);
  const mockReadFile = vi.mocked(readFile);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await exists('existing-file.txt');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('existing-file.txt');
    });

    it('should return false when file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await exists('non-existing-file.txt');

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('non-existing-file.txt');
    });

    it('should return false when access throws any error', async () => {
      mockAccess.mockRejectedValue(new Error('Permission denied'));

      const result = await exists('protected-file.txt');

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('protected-file.txt');
    });
  });

  describe('isMonorepo', () => {
    it('should return true when pnpm-workspace.yaml exists', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
    });

    it('should return true when package.json has workspaces', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue(JSON.stringify({ workspaces: ['packages/*'] }));

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should return true when package.json has empty workspaces array', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue(JSON.stringify({ workspaces: [] }));

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should return false when package.json has no workspaces', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue(JSON.stringify({ name: 'test-package' }));

      const result = await isMonorepo();

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should return false when package.json cannot be read', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await isMonorepo();

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should return false when package.json is invalid JSON', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue('invalid json');

      const result = await isMonorepo();

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should prioritize pnpm-workspace.yaml over package.json workspaces', async () => {
      mockAccess.mockResolvedValue(undefined);
      // mockReadFile should not be called when pnpm-workspace.yaml exists

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });
});
