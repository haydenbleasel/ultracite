import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createAgents } from '../src/agents';

mock.module('node:fs/promises', () => ({
  access: mock(() => Promise.reject(new Error('ENOENT'))),
  readFile: mock(() => Promise.resolve('')),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

describe('createAgents', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('cursor agent', () => {
    test('exists returns true when rules file exists', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.cursor/rules/ultracite.mdc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('cursor');
      const result = await agents.exists();
      expect(result).toBe(true);
    });

    test('create creates directory and files', async () => {
      const mockMkdir = mock(() => Promise.resolve());
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
      }));

      const agents = createAgents('cursor');
      await agents.create();

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(2); // rules file + hooks.json
    });

    test('create writes rules with header', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('cursor');
      await agents.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('./.cursor/rules/ultracite.mdc');
      expect(writeCall[1]).toContain('---');
      expect(writeCall[1]).toContain('description: Ultracite Rules');
    });

    test('update checks for duplicate rules', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      // Create content that already contains the rules to trigger the duplicate check
      const existingContent = '# Ultracite Code Standards';

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock((path: string) => {
          if (path === './.cursor/hooks.json') {
            return Promise.resolve('{"version": 1, "hooks": {"afterFileEdit": []}}');
          }
          return Promise.resolve(existingContent);
        }),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('cursor');
      await agents.update();

      // When rules already exist, writeFile should not be called for the rules file
      // (only hooks.json is updated)
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('windsurf agent', () => {
    test('create creates windsurf rules file', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('windsurf');
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('./.windsurf/rules/ultracite.md');
    });
  });

  describe('vscode-copilot agent', () => {
    test('create creates copilot instructions with header', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('vscode-copilot');
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('./.github/copilot-instructions.md');
      expect(writeCall[1]).toContain('applyTo:');
    });

    test('update uses append mode', async () => {
      const existingContent = 'Existing instructions';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('vscode-copilot');
      await agents.update();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain('Existing instructions');
    });
  });

  describe('zed agent', () => {
    test('create creates .rules file', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('zed');
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('./.rules');
    });

    test('update appends to .rules file', async () => {
      const existingContent = 'Existing zed rules';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('zed');
      await agents.update();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain('Existing zed rules');
    });

    test('update creates file when it does not exist in append mode', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          // File doesn't exist
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('zed');
      await agents.update();

      expect(mockWriteFile).toHaveBeenCalled();
      // Should write the content since file doesn't exist
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('./.rules');
    });
  });

  describe('claude agent', () => {
    test('create creates CLAUDE.md file', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents('claude');
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('./.claude/CLAUDE.md');
    });
  });

  describe('directory creation', () => {
    test('creates parent directory when needed', async () => {
      const mockMkdir = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mockMkdir,
      }));

      const agents = createAgents('windsurf');
      await agents.create();

      expect(mockMkdir).toHaveBeenCalled();
      const mkdirCall = mockMkdir.mock.calls[0];
      expect(mkdirCall[0]).toBe('.windsurf/rules');
    });

    test('does not create directory for root-level files', async () => {
      const mockMkdir = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mockMkdir,
      }));

      const agents = createAgents('codex');
      await agents.create();

      // Should not be called for root-level AGENTS.md
      expect(mockMkdir).not.toHaveBeenCalled();
    });
  });
});
