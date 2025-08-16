import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_RULES } from '../scripts/consts/rules';
import { createEditorRules } from '../scripts/editor-rules';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('editor rules configurations', () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockReadFile = vi.mocked(readFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('existing content');
  });

  const editorConfigs = Object.entries(EDITOR_RULES).map(([name, config]) => ({
    name,
    ...config,
  }));

  describe.each(editorConfigs)(
    '$name configuration',
    ({ name, path, header, appendMode }) => {
      const editor = createEditorRules(name as keyof typeof EDITOR_RULES);
      const expectedContent = header
        ? `${header}\n\nmock rules content`
        : 'mock rules content';
      const expectedDir = path.includes('/')
        ? path.substring(0, path.lastIndexOf('/'))
        : '.';
      const cleanDir = expectedDir.startsWith('./')
        ? expectedDir.slice(2)
        : expectedDir;

      describe('exists', () => {
        it(`should return true when ${path} exists`, async () => {
          mockExists.mockResolvedValue(true);

          const result = await editor.exists();

          expect(result).toBe(true);
          expect(mockExists).toHaveBeenCalledWith(path);
        });

        it(`should return false when ${path} does not exist`, async () => {
          mockExists.mockResolvedValue(false);

          const result = await editor.exists();

          expect(result).toBe(false);
          expect(mockExists).toHaveBeenCalledWith(path);
        });
      });

      describe('create', () => {
        it(`should create ${path} with rules content`, async () => {
          await editor.create();

          if (cleanDir !== '.') {
            expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
              recursive: true,
            });
          }
          expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
        });

        if (cleanDir !== '.') {
          it('should handle mkdir errors gracefully', async () => {
            mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

            await expect(editor.create()).rejects.toThrow('Permission denied');
            expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
              recursive: true,
            });
          });
        }

        it('should handle writeFile errors gracefully', async () => {
          mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));

          await expect(editor.create()).rejects.toThrow('Permission denied');
          expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
        });
      });

      describe('update', () => {
        if (appendMode) {
          it(`should append to ${path} when file exists and content not present`, async () => {
            mockExists.mockResolvedValue(true);
            mockReadFile.mockResolvedValue('existing content');

            await editor.update();

            if (cleanDir !== '.') {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }
            expect(mockReadFile).toHaveBeenCalledWith(path, 'utf-8');
            expect(mockWriteFile).toHaveBeenCalledWith(
              path,
              'existing content\n\nmock rules content'
            );
          });

          it(`should not duplicate content in ${path} when already present`, async () => {
            mockExists.mockResolvedValue(true);
            mockReadFile.mockResolvedValue(
              'existing content\n\nmock rules content'
            );

            await editor.update();

            if (cleanDir !== '.') {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }
            expect(mockReadFile).toHaveBeenCalledWith(path, 'utf-8');
            expect(mockWriteFile).not.toHaveBeenCalled();
          });

          it(`should create ${path} when file does not exist`, async () => {
            mockExists.mockResolvedValue(false);

            await editor.update();

            if (cleanDir !== '.') {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }
            expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
          });
        } else {
          it(`should overwrite ${path} with rules content`, async () => {
            await editor.update();

            if (cleanDir !== '.') {
              expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
                recursive: true,
              });
            }
            expect(mockWriteFile).toHaveBeenCalledWith(path, expectedContent);
          });
        }

        if (cleanDir !== '.') {
          it('should handle mkdir errors gracefully', async () => {
            mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

            await expect(editor.update()).rejects.toThrow('Permission denied');
            expect(mockMkdir).toHaveBeenCalledWith(cleanDir, {
              recursive: true,
            });
          });
        }

        it('should handle writeFile errors gracefully', async () => {
          mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));

          await expect(editor.update()).rejects.toThrow('Permission denied');
        });
      });
    }
  );
});
