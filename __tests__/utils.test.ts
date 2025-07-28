import { access, readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, isMonorepo, escapeShellPath } from '../scripts/utils';

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
      mockReadFile.mockResolvedValue(
        JSON.stringify({ workspaces: ['packages/*'] })
      );

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

    it('should handle JSONC files with comments in package.json', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve(undefined);
      });

      const packageJsonWithComments = `{
  // Package configuration with comments
  "name": "test-package",
  "version": "1.0.0",
  
  /* Workspaces configuration */
  "workspaces": [
    // Package directories
    "packages/*",
    "apps/*"
  ]
}`;

      mockReadFile.mockResolvedValue(packageJsonWithComments);

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('pnpm-workspace.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should handle JSONC files with comments but no workspaces', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === 'pnpm-workspace.yaml') {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve(undefined);
      });

      const packageJsonWithComments = `{
  // Package configuration with comments
  "name": "test-package",
  "version": "1.0.0",
  
  /* Dependencies */
  "dependencies": {
    // Core dependencies
    "react": "^18.0.0"
  }
}`;

      mockReadFile.mockResolvedValue(packageJsonWithComments);

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

  describe('escapeShellPath', () => {
    it('should escape dollar signs to prevent variable interpolation', () => {
      const path = '/Users/user/file$variable.tsx';
      const result = escapeShellPath(path);
      expect(result).toBe('/Users/user/file\\$variable.tsx');
    });

    it('should escape multiple dollar signs', () => {
      const path = '$var1/file$var2/$var3.txt';
      const result = escapeShellPath(path);
      expect(result).toBe('\\$var1/file\\$var2/\\$var3.txt');
    });

    it('should escape backticks to prevent command substitution', () => {
      const path = '/path/with`command`.txt';
      const result = escapeShellPath(path);
      expect(result).toBe('/path/with\\`command\\`.txt');
    });

    it('should escape backslashes', () => {
      const path = 'C:\\Users\\user\\file.txt';
      const result = escapeShellPath(path);
      expect(result).toBe('C:\\\\Users\\\\user\\\\file.txt');
    });

    it('should escape double quotes', () => {
      const path = '/path/with"quotes"in.txt';
      const result = escapeShellPath(path);
      expect(result).toBe('/path/with\\"quotes\\"in.txt');
    });

    it('should handle paths with multiple special characters', () => {
      const path = '/path/$var/with"quotes"/and`backticks`/and\\backslashes.txt';
      const result = escapeShellPath(path);
      expect(result).toBe('/path/\\$var/with\\"quotes\\"/and\\`backticks\\`/and\\\\backslashes.txt');
    });

    it('should handle the specific case from the bug report', () => {
      const path = '/Users/epogue/Code/apps/team/app/routes/_app/appointments/$appointmentId.tsx';
      const result = escapeShellPath(path);
      expect(result).toBe('/Users/epogue/Code/apps/team/app/routes/_app/appointments/\\$appointmentId.tsx');
    });

    it('should return the same string for paths without special characters', () => {
      const path = '/simple/path/file.txt';
      const result = escapeShellPath(path);
      expect(result).toBe('/simple/path/file.txt');
    });

    it('should handle empty string', () => {
      const path = '';
      const result = escapeShellPath(path);
      expect(result).toBe('');
    });
  });
});
