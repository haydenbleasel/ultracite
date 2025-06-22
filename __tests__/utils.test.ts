import { access } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');

describe('utils', () => {
  const mockAccess = vi.mocked(access);

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
});
