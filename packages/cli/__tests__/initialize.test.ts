import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import process from 'node:process';
import {
  initialize,
  installDependencies,
  upsertTsConfig,
  upsertVsCodeSettings,
  upsertZedSettings,
  upsertBiomeConfig,
  initializePrecommitHook,
  initializeLefthook,
  initializeLintStaged,
  upsertAgents,
  removePrettier,
  removeEsLint,
} from '../src/initialize';

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

describe('helper functions', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('installDependencies', () => {
    test('installs dependencies when install is true', async () => {
      const mockAddDep = mock(() => Promise.resolve());
      mock.module('nypm', () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await installDependencies('npm', true);
      expect(mockAddDep).toHaveBeenCalled();
    });

    test('updates package.json when install is false', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await installDependencies('npm', false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('upsertTsConfig', () => {
    test('updates existing tsconfig', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './tsconfig.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"compilerOptions": {}}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('glob', () => ({
        glob: mock(() => Promise.resolve(['./tsconfig.json'])),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertTsConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('skips when no tsconfig found', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('glob', () => ({
        glob: mock(() => Promise.resolve([])),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertTsConfig();
    });
  });

  describe('upsertVsCodeSettings', () => {
    test('creates vscode settings when not exists', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('node:child_process', () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mock(() => ''),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertVsCodeSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('updates existing vscode settings', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.vscode/settings.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"editor.tabSize": 2}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertVsCodeSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('upsertZedSettings', () => {
    test('creates zed settings when not exists', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertZedSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('upsertBiomeConfig', () => {
    test('creates biome config with frameworks', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertBiomeConfig(['react']);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('updates existing biome config', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './biome.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"extends": ["ultracite/core"]}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertBiomeConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('initializePrecommitHook', () => {
    test('installs and creates husky hook', async () => {
      const mockAddDep = mock(() => Promise.resolve());
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('nypm', () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('node:child_process', () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mock(() => ''),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await initializePrecommitHook('npm', true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('updates existing husky hook', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === '.husky/pre-commit') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock((path: string) => {
          if (path === 'package.json') {
            return Promise.resolve('{"name": "test", "devDependencies": {}}');
          }
          return Promise.resolve('#!/bin/sh\necho test');
        }),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('node:child_process', () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mock(() => ''),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await initializePrecommitHook('npm', false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('initializeLefthook', () => {
    test('creates lefthook config', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const mockAddDep = mock(() => Promise.resolve());

      mock.module('nypm', () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await initializeLefthook('npm', true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('initializeLintStaged', () => {
    test('creates lint-staged config', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const mockAddDep = mock(() => Promise.resolve());

      mock.module('nypm', () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await initializeLintStaged('npm', true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('upsertAgents', () => {
    test('creates agent config when not exists', async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertAgents('cursor', 'Cursor');
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('removePrettier', () => {
    test('removes prettier packages and files', async () => {
      const mockUnlink = mock(() => Promise.resolve());
      const mockRemoveDep = mock(() => Promise.resolve());

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
        removeDependency: mockRemoveDep,
      }));

      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === '.prettierrc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"devDependencies": {"prettier": "2.0.0"}}')),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        unlink: mockUnlink,
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await removePrettier('npm');
      expect(mockRemoveDep).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe('removeEsLint', () => {
    test('removes eslint packages and files', async () => {
      const mockUnlink = mock(() => Promise.resolve());
      const mockRemoveDep = mock(() => Promise.resolve());

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm', warnings: [] })),
        removeDependency: mockRemoveDep,
      }));

      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === '.eslintrc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"devDependencies": {"eslint": "8.0.0"}}')),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        unlink: mockUnlink,
      }));

      mock.module('@clack/prompts', () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await removeEsLint('npm');
      expect(mockRemoveDep).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });
});
