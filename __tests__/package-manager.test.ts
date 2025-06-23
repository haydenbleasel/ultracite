import { select } from '@clack/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { packageManager } from '../scripts/package-manager';
import { exists, isMonorepo } from '../scripts/utils';

vi.mock('../scripts/utils');
vi.mock('@clack/prompts');

describe('package-manager', () => {
  const mockExists = vi.mocked(exists);
  const mockIsMonorepo = vi.mocked(isMonorepo);
  const mockSelect = vi.mocked(select);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return pnpm add when pnpm-lock.yaml exists and not a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(false);
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

    it('should return yarn add -W when yarn.lock exists and is a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(true);
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'yarn.lock');
      });

      const result = await packageManager.get();

      expect(result).toBe('yarn add -W');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
    });

    it('should return npm install when package-lock.json exists and not a monorepo', async () => {
      mockIsMonorepo.mockResolvedValue(false);
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
      mockSelect.mockResolvedValue('yarn add -W');

      const result = await packageManager.select();

      expect(result).toBe('yarn add -W');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalledWith({
        initialValue: 'pnpm',
        message: 'Which package manager do you use?',
        options: [
          { label: 'pnpm', value: 'pnpm add -w' },
          { label: 'bun', value: 'bun add ' },
          { label: 'yarn', value: 'yarn add -W' },
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

    it('should throw error when no package manager is selected', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue(null);

      await expect(packageManager.select()).rejects.toThrow(
        'No package manager selected'
      );
    });

    it('should throw error when undefined is returned', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue(undefined);

      await expect(packageManager.select()).rejects.toThrow(
        'No package manager selected'
      );
    });

    it('should throw error when non-string value is returned', async () => {
      mockIsMonorepo.mockResolvedValue(false);
      mockSelect.mockResolvedValue(123);

      await expect(packageManager.select()).rejects.toThrow(
        'No package manager selected'
      );
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
            { label: 'bun', value: 'bun add ' },
            { label: 'yarn', value: 'yarn add -W' },
            { label: 'npm', value: 'npm install --workspace .' },
          ]),
        })
      );
    });

    it('should handle isMonorepo rejection', async () => {
      mockIsMonorepo.mockRejectedValue(new Error('File system error'));

      await expect(packageManager.select()).rejects.toThrow('File system error');
      expect(mockIsMonorepo).toHaveBeenCalled();
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });
}); 