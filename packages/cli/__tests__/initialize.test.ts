import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import process from 'node:process';
import { initialize } from '../src/initialize';

mock.module('node:fs/promises', () => ({
  access: mock(() => Promise.reject(new Error('ENOENT'))),
  readFile: mock(() => Promise.resolve('{"name": "test"}')),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

mock.module('node:child_process', () => ({
  spawnSync: mock(() => ({ status: 0 })),
  execSync: mock(() => ''),
}));

mock.module('nypm', () => ({
  addDevDependency: mock(() => Promise.resolve()),
  dlxCommand: mock(() => 'npx ultracite fix'),
  detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
  removeDependency: mock(() => Promise.resolve()),
}));

mock.module('glob', () => ({
  glob: mock(() => Promise.resolve([])),
}));

mock.module('@clack/prompts', () => ({
  intro: mock(() => {}),
  outro: mock(() => {}),
  spinner: mock(() => ({
    start: mock(() => {}),
    stop: mock(() => {}),
    message: mock(() => {}),
  })),
  log: {
    info: mock(() => {}),
    success: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
  },
  multiselect: mock(() => Promise.resolve([])),
  isCancel: mock(() => false),
  cancel: mock(() => {}),
}));

describe('initialize', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('completes successfully with minimal options', async () => {
    const mockLog = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };

    mock.module('@clack/prompts', () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: 'npm',
      skipInstall: true,
      editors: [],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockLog.success).toHaveBeenCalled();
  });

  test('detects package manager when not provided', async () => {
    const mockDetect = mock(() => Promise.resolve({ name: 'pnpm', warnings: [] }));
    const mockLog = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };

    mock.module('nypm', () => ({
      addDevDependency: mock(() => Promise.resolve()),
      dlxCommand: mock(() => 'npx ultracite fix'),
      detectPackageManager: mockDetect,
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module('@clack/prompts', () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      skipInstall: true,
      editors: [],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockDetect).toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalled();
  });

  test('installs dependencies when skipInstall is false', async () => {
    const mockAddDep = mock(() => Promise.resolve());

    mock.module('nypm', () => ({
      addDevDependency: mockAddDep,
      dlxCommand: mock(() => 'npx ultracite fix'),
      detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module('@clack/prompts', () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: 'npm',
      skipInstall: false,
      editors: [],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockAddDep).toHaveBeenCalled();
  });

  test('creates editor configs when specified', async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module('node:fs/promises', () => ({
      access: mock(() => Promise.reject(new Error('ENOENT'))),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
      mkdir: mock(() => Promise.resolve()),
    }));

    mock.module('@clack/prompts', () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: 'npm',
      skipInstall: true,
      editors: ['vscode', 'zed'],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test('creates agent configs when specified', async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module('node:fs/promises', () => ({
      access: mock(() => Promise.reject(new Error('ENOENT'))),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
      mkdir: mock(() => Promise.resolve()),
    }));

    mock.module('@clack/prompts', () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: 'npm',
      skipInstall: true,
      editors: [],
      agents: ['cursor', 'windsurf'],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test('sets up integrations when specified', async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module('node:fs/promises', () => ({
      access: mock(() => Promise.reject(new Error('ENOENT'))),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
      mkdir: mock(() => Promise.resolve()),
    }));

    mock.module('@clack/prompts', () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: 'npm',
      skipInstall: true,
      editors: [],
      agents: [],
      integrations: ['husky', 'lint-staged'],
      frameworks: [],
      migrate: [],
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test('exits with error on failure', async () => {
    const mockExit = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    const mockLog = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };

    mock.module('@clack/prompts', () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    mock.module('nypm', () => ({
      addDevDependency: mock(() => Promise.reject(new Error('Install failed'))),
      dlxCommand: mock(() => 'npx ultracite fix'),
      detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await expect(async () => {
      await initialize({
        pm: 'npm',
        skipInstall: false,
        editors: [],
        agents: [],
        integrations: [],
        frameworks: [],
        migrate: [],
      });
    }).toThrow('process.exit called');

    expect(mockLog.error).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });
});
