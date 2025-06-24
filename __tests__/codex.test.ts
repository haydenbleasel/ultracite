import { writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { codex } from '../scripts/codex';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('codex configuration', () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('exists', () => {
    it('should return true when AGENTS.md exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await codex.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./AGENTS.md');
    });

    it('should return false when AGENTS.md does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await codex.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./AGENTS.md');
    });
  });

  describe('create', () => {
    it('should create AGENTS.md with rules content', async () => {
      await codex.create();

      expect(mockWriteFile).toHaveBeenCalledWith(
        './AGENTS.md',
        'mock rules content'
      );
    });

    it('should handle writeFile errors gracefully', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(codex.create()).rejects.toThrow('Permission denied');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './AGENTS.md',
        'mock rules content'
      );
    });
  });

  describe('update', () => {
    it('should update AGENTS.md with rules content', async () => {
      await codex.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        './AGENTS.md',
        'mock rules content'
      );
    });

    it('should handle writeFile errors gracefully', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(codex.update()).rejects.toThrow('Permission denied');
      expect(mockWriteFile).toHaveBeenCalledWith(
        './AGENTS.md',
        'mock rules content'
      );
    });
  });
});
