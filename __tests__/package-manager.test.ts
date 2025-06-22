import { select } from '@clack/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { packageManager } from '../scripts/package-manager';
import { exists } from '../scripts/utils';

vi.mock('../scripts/utils');
vi.mock('@clack/prompts');

describe('package-manager', () => {
  const mockExists = vi.mocked(exists);
  const mockSelect = vi.mocked(select);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return pnpm add when pnpm-lock.yaml exists', async () => {
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'pnpm-lock.yaml');
      });

      const result = await packageManager.get();

      expect(result).toBe('pnpm add');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
    });

    it('should return bun add when bun.lockb exists', async () => {
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'bun.lockb');
      });

      const result = await packageManager.get();

      expect(result).toBe('bun add');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
    });

    it('should return yarn add when yarn.lock exists', async () => {
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'yarn.lock');
      });

      const result = await packageManager.get();

      expect(result).toBe('yarn add');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
    });

    it('should return npm install when package-lock.json exists', async () => {
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path === 'package-lock.json');
      });

      const result = await packageManager.get();

      expect(result).toBe('npm install');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledWith('bun.lockb');
      expect(mockExists).toHaveBeenCalledWith('yarn.lock');
      expect(mockExists).toHaveBeenCalledWith('package-lock.json');
    });

    it('should return null when no lockfiles exist', async () => {
      mockExists.mockImplementation(() => {
        return Promise.resolve(false);
      });

      const result = await packageManager.get();

      expect(result).toBeNull();
      expect(mockExists).toHaveBeenCalledTimes(4);
    });

    it('should prioritize pnpm when multiple lockfiles exist', async () => {
      mockExists.mockImplementation(() => {
        return Promise.resolve(true);
      });

      const result = await packageManager.get();

      expect(result).toBe('pnpm add');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
      expect(mockExists).toHaveBeenCalledTimes(1); // Should stop after first match
    });

    it('should handle async errors by propagating them', async () => {
      mockExists.mockImplementation((path: string) => {
        if (path === 'pnpm-lock.yaml') {
          return Promise.reject(new Error('File system error'));
        }
        return Promise.resolve(false);
      });

      await expect(packageManager.get()).rejects.toThrow('File system error');
      expect(mockExists).toHaveBeenCalledWith('pnpm-lock.yaml');
    });
  });

  describe('select', () => {
    it('should return selected package manager command', async () => {
      mockSelect.mockResolvedValue('yarn add');

      const result = await packageManager.select();

      expect(result).toBe('yarn add');
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

    it('should default to pnpm as initial value', async () => {
      mockSelect.mockResolvedValue('pnpm add');

      await packageManager.select();

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          initialValue: 'pnpm',
        })
      );
    });

    it('should throw error when no package manager is selected', async () => {
      mockSelect.mockResolvedValue(null);

      await expect(packageManager.select()).rejects.toThrow(
        'No package manager selected'
      );
    });

    it('should throw error when undefined is returned', async () => {
      mockSelect.mockResolvedValue(undefined);

      await expect(packageManager.select()).rejects.toThrow(
        'No package manager selected'
      );
    });

    it('should throw error when non-string value is returned', async () => {
      mockSelect.mockResolvedValue(123);

      await expect(packageManager.select()).rejects.toThrow(
        'No package manager selected'
      );
    });

    it('should handle select function rejection', async () => {
      mockSelect.mockRejectedValue(new Error('User cancelled'));

      await expect(packageManager.select()).rejects.toThrow('User cancelled');
    });

    it('should include all package manager options', async () => {
      mockSelect.mockResolvedValue('npm install');

      await packageManager.select();

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            { label: 'pnpm', value: 'pnpm add' },
            { label: 'bun', value: 'bun add' },
            { label: 'yarn', value: 'yarn add' },
            { label: 'npm', value: 'npm install' },
          ]),
        })
      );
    });
  });
}); 