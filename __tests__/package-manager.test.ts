import { readFile } from 'node:fs/promises';
import { select } from '@clack/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { packageManager } from '../scripts/package-manager';
import { exists, isMonorepo } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils');
vi.mock('@clack/prompts');

describe('package-manager', () => {
  const mockExists = vi.mocked(exists);
  const mockIsMonorepo = vi.mocked(isMonorepo);
  const mockSelect = vi.mocked(select);
  const mockReadFile = vi.mocked(readFile);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should prioritize packageManager field over lockfile detection for pnpm', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: 'pnpm@10.12.2' })
      );
      mockExists.mockResolvedValue(false); // No lockfiles

      const result = await packageManager.get();

      expect(result).toBe('pnpm add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
      expect(mockExists).not.toHaveBeenCalled(); // Should not check lockfiles
    });

    it('should prioritize packageManager field over lockfile detection for bun', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: 'bun@1.0.0' })
      );
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'pnpm-lock.yaml'); // pnpm lockfile exists but should be ignored
      });

      const result = await packageManager.get();

      expect(result).toBe('bun add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should use packageManager field with monorepo suffix when in monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: 'pnpm@8.0.0' })
      );

      const result = await packageManager.get();

      expect(result).toBe('pnpm add -w');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should handle bun packageManager in monorepo (no suffix)', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: 'bun@1.0.0' })
      );

      const result = await packageManager.get();

      expect(result).toBe('bun add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should handle yarn packageManager in monorepo (no suffix)', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: 'yarn@3.0.0' })
      );

      const result = await packageManager.get();

      expect(result).toBe('yarn add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should handle npm packageManager in monorepo (with workspace suffix)', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: 'npm@9.0.0' })
      );

      const result = await packageManager.get();

      expect(result).toBe('npm install --workspace .');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should fall back to lockfile detection when packageManager is unknown', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: 'unknown@1.0.0' })
      );
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'yarn.lock');
      });

      const result = await packageManager.get();

      expect(result).toBe('yarn add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
    });

    it('should fall back to lockfile detection when package.json cannot be read', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'bun.lockb');
      });

      const result = await packageManager.get();

      expect(result).toBe('bun add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
    });

    it('should fall back to lockfile detection when packageManager field is missing', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockResolvedValue(JSON.stringify({ name: 'test-package' }));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'package-lock.json');
      });

      const result = await packageManager.get();

      expect(result).toBe('npm install');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
      expect(mockExists).toHaveBeenCalledWith('package-lock.json');
    });

    it('should fall back to lockfile detection when packageManager field is not a string', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ packageManager: { name: 'pnpm' } })
      );
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'yarn.lock');
      });

      const result = await packageManager.get();

      expect(result).toBe('yarn add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
    });

    it('should handle JSONC package.json with comments', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      const packageJsonWithComments = `{
  // Package configuration
  "name": "test-package",
  "packageManager": "bun@1.0.0" // Using bun
}`;
      mockReadFile.mockResolvedValue(packageJsonWithComments);

      const result = await packageManager.get();

      expect(result).toBe('bun add');
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf-8');
    });

    it('should return pnpm add when pnpm-lock.yaml exists and not a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'pnpm-lock.yaml');
      });

      const result = await packageManager.get();

      expect(result).toBe('pnpm add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
    });

    it('should return pnpm add -w when pnpm-lock.yaml exists and is a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'pnpm-lock.yaml');
      });

      const result = await packageManager.get();

      expect(result).toBe('pnpm add -w');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
    });

    it('should return bun add when bun.lockb exists and not a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'bun.lockb');
      });

      const result = await packageManager.get();

      expect(result).toBe('bun add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
    });

    it('should return bun add when bun.lockb exists and is a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'bun.lockb');
      });

      const result = await packageManager.get();

      expect(result).toBe('bun add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
    });

    it('should return yarn add when yarn.lock exists and not a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'yarn.lock');
      });

      const result = await packageManager.get();

      expect(result).toBe('yarn add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
    });

    it('should return yarn add when yarn.lock exists and is a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'yarn.lock');
      });

      const result = await packageManager.get();

      expect(result).toBe('yarn add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
    });

    it('should not add -W flag to yarn for monorepo (regression test for issue #179)', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'yarn.lock');
      });

      const result = await packageManager.get();

      // Yarn should not have the -W flag even in monorepos
      expect(result).toBe('yarn add');
      expect(result).not.toContain('-W');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
    });

    it('should return npm install when package-lock.json exists and not a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'package-lock.json');
      });

      const result = await packageManager.get();

      expect(result).toBe('npm install');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
      expect(mockExists).toHaveBeenCalledWith('package-lock.json');
    });

    it('should return npm install --workspace . when package-lock.json exists and is a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'package-lock.json');
      });

      const result = await packageManager.get();

      expect(result).toBe('npm install --workspace .');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
      expect(mockExists).toHaveBeenCalledWith('package-lock.json');
    });

    it('should return null when no lockfiles exist', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation(() => {
        return Promise.resolve(false);
      });

      const result = await packageManager.get();

      expect(result).toBeNull();
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledTimes(4);
    });

    it('should prioritize pnpm when multiple lockfiles exist', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation(() => {
        return Promise.resolve(true);
      });

      const result = await packageManager.get();

      expect(result).toBe('pnpm add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledTimes(1); // Should stop after first match
    });

    it('should handle async errors by propagating them', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockReadFile.mockRejectedValue(new Error('No package.json'));
      mockExists.mockImplementation((path: string) => {
        if (path === 'pnpm-lock.yaml') {
          return Promise.reject(new Error('File system error'));
        }
        return Promise.resolve(false);
      });

      await expect(packageManager.get()).rejects.toThrow('File system error');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
    });
  });

  describe('select', () => {
    it('should return selected package manager command for non-monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue('yarn add');

      const result = await packageManager.select();

      expect(result).toBe('yarn add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalledWith({
        initialValue: 'pnpm',
        message: 'Which package manager do you use?',
        options: [
          { label: 'pnpm', value: 'pnpm add' },
          { label: 'bun', value: 'bun add' },
          { label: 'yarn', value: 'yarn add' },
          { label: 'npm', value: 'npm install' },
        ],
      });
    });

    it('should return selected package manager command for monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockSelect.mockResolvedValue('yarn add');

      const result = await packageManager.select();

      expect(result).toBe('yarn add');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalledWith({
        initialValue: 'pnpm',
        message: 'Which package manager do you use?',
        options: [
          { label: 'pnpm', value: 'pnpm add -w' },
          { label: 'bun', value: 'bun add' },
          { label: 'yarn', value: 'yarn add' },
          { label: 'npm', value: 'npm install --workspace .' },
        ],
      });
    });

    it('should default to pnpm as initial value', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue('pnpm add');

      await packageManager.select();

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          initialValue: 'pnpm',
        })
      );
    });

    it('should return null when no package manager is selected', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue(null);

      const result = await packageManager.select();
      expect(result).toBeNull();
    });

    it('should return null when undefined is returned', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue(undefined);

      const result = await packageManager.select();
      expect(result).toBeNull();
    });

    it('should return null when non-string value is returned', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue(123);

      const result = await packageManager.select();
      expect(result).toBeNull();
    });

    it('should handle select function rejection', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockRejectedValue(new Error('User cancelled'));

      await expect(packageManager.select()).rejects.toThrow('User cancelled');
    });

    it('should include all package manager options for monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockSelect.mockResolvedValue('npm install --workspace .');

      await packageManager.select();

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            { label: 'pnpm', value: 'pnpm add -w' },
            { label: 'bun', value: 'bun add' },
            { label: 'yarn', value: 'yarn add' },
            { label: 'npm', value: 'npm install --workspace .' },
          ]),
        })
      );
    });

    it('should handle isMonorepo rejection', async () => {
      mockIsMonorepo.mockRejectedValue(new Error('File system error'));

      await expect(packageManager.select()).rejects.toThrow(
        'File system error'
      );
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });
});
