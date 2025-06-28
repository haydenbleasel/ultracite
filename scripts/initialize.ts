import { execSync } from 'node:child_process';
import process from 'node:process';
import { intro, log, multiselect, spinner } from '@clack/prompts';
import { biome } from './biome';
import { claude } from './claude';
import { codex } from './codex';
import { cursor } from './cursor';
import { husky } from './husky';
import { lefthook } from './lefthook';
import { lintStaged } from './lint-staged';
import { packageManager } from './package-manager';
import { title } from './title';
import { tsconfig } from './tsconfig';
import { vscodeCopilot } from './vscode-copilot';
import { vscode } from './vscode-settings';
import { windsurf } from './windsurf';
import { zedCopilot } from './zed-copilot';
import { zed } from './zed-settings';

const installDependencies = (packageManagerAdd: string) => {
  const s = spinner();

  s.start('Installing dependencies...');
  execSync(`${packageManagerAdd} -D -E ultracite @biomejs/biome@2.0.5`);
  s.stop('Dependencies installed.');
};

const upsertTsConfig = async () => {
  const s = spinner();
  s.start('Checking for tsconfig.json...');

  if (await tsconfig.exists()) {
    s.message('tsconfig.json found, updating...');
    await tsconfig.update();
    s.stop('tsconfig.json updated.');
    return;
  }

  s.message('tsconfig.json not found, creating...');
  await tsconfig.create();
  s.stop('tsconfig.json created.');
};

const upsertVSCodeSettings = async () => {
  const s = spinner();
  s.start('Checking for .vscode/settings.json...');

  if (await vscode.exists()) {
    s.message('settings.json found, updating...');
    await vscode.update();
    s.stop('settings.json updated.');
    return;
  }

  s.message('settings.json not found, creating...');
  await vscode.create();
  s.stop('settings.json created.');
};

const upsertZedSettings = async () => {
  const s = spinner();
  s.start('Checking for .zed/settings.json...');

  if (await zed.exists()) {
    s.message('settings.json found, updating...');
    await zed.update();
    s.stop('settings.json updated.');
    return;
  }

  s.message('settings.json not found, creating...');
  await vscode.create();
  s.stop('settings.json created.');
};

const upsertBiomeConfig = async () => {
  const s = spinner();
  s.start('Checking for Biome configuration...');

  if (await biome.exists()) {
    s.message('Biome configuration found, updating...');
    await biome.update();
    s.stop('Biome configuration updated.');
    return;
  }

  s.message('Biome configuration not found, creating...');
  await biome.create();
  s.stop('Biome configuration created.');
};

const initializePrecommitHook = async (packageManagerAdd: string) => {
  const s = spinner();
  s.start('Initializing pre-commit hooks...');

  s.message('Installing Husky...');
  husky.install(packageManagerAdd);

  if (await husky.exists()) {
    s.message('Pre-commit hook found, updating...');
    await husky.update();
    s.stop('Pre-commit hook updated.');
    return;
  }

  s.message('Updating pre-commit hook...');

  s.message('Pre-commit hook not found, creating...');
  await husky.create();
  s.stop('Pre-commit hook created.');
};

const initializeLefthook = async (packageManagerAdd: string) => {
  const s = spinner();
  s.start('Initializing lefthook...');

  s.message('Installing lefthook...');
  lefthook.install(packageManagerAdd);

  if (await lefthook.exists()) {
    s.message('lefthook.yml found, updating...');
    await lefthook.update();
    s.stop('lefthook.yml updated.');
    return;
  }

  s.message('lefthook.yml not found, creating...');
  await lefthook.create();
  s.stop('lefthook.yml created.');
};

const initializeLintStaged = async (packageManagerAdd: string) => {
  const s = spinner();

  s.start('Initializing lint-staged...');

  s.message('Installing lint-staged...');
  lintStaged.install(packageManagerAdd);

  if (await lintStaged.exists()) {
    s.message('lint-staged found, updating...');
    await lintStaged.update();
    s.stop('lint-staged updated.');
    return;
  }

  s.message('lint-staged not found, creating...');
  await lintStaged.create();
  s.stop('lint-staged created.');
};

const upsertVSCodeCopilotRules = async () => {
  const s = spinner();
  s.start('Checking for GitHub Copilot rules...');

  if (await vscodeCopilot.exists()) {
    s.message('GitHub Copilot rules found, updating...');
    await vscodeCopilot.update();
    s.stop('GitHub Copilot rules updated.');
    return;
  }

  s.message('GitHub Copilot rules not found, creating...');
  await vscodeCopilot.create();
  s.stop('GitHub Copilot rules created.');
};

const upsertCursorRules = async () => {
  const s = spinner();
  s.start('Checking for Cursor rules...');

  if (await cursor.exists()) {
    s.message('Cursor rules found, updating...');
    await cursor.update();
    s.stop('Cursor rules updated.');
    return;
  }

  s.message('Cursor rules not found, creating...');
  await cursor.create();
  s.stop('Cursor rules created.');
};

const upsertWindsurfRules = async () => {
  const s = spinner();
  s.start('Checking for Windsurf rules...');

  if (await windsurf.exists()) {
    s.message('Windsurf rules found, updating...');
    await windsurf.update();
    s.stop('Windsurf rules updated.');
    return;
  }

  s.message('Windsurf rules not found, creating...');
  await windsurf.create();
  s.stop('Windsurf rules created.');
};

const upsertZedRules = async () => {
  const s = spinner();
  s.start('Checking for Zed rules...');

  if (await zedCopilot.exists()) {
    s.message('Zed rules found, updating...');
    await zedCopilot.update();
    s.stop('Zed rules updated.');
    return;
  }

  s.message('Zed rules not found, creating...');
  await zed.create();
  s.stop('Zed rules created.');
};

const upsertClaudeRules = async () => {
  const s = spinner();
  s.start('Checking for Claude Code rules...');

  if (await claude.exists()) {
    s.message('Claude Code rules found, updating...');
    await claude.update();
    s.stop('Claude Code rules updated.');
    return;
  }

  s.message('Claude Code rules not found, creating...');
  await claude.create();
  s.stop('Claude Code rules created.');
};

const upsertCodexRules = async () => {
  const s = spinner();
  s.start('Checking for OpenAI Codex rules...');

  if (await codex.exists()) {
    s.message('OpenAI Codex rules found, updating...');
    await codex.update();
    s.stop('OpenAI Codex rules updated.');
    return;
  }

  s.message('OpenAI Codex rules not found, creating...');
  await codex.create();
  s.stop('OpenAI Codex rules created.');
};

export const initialize = async () => {
  intro(title);

  try {
    let packageManagerAdd = await packageManager.get();

    if (packageManagerAdd) {
      log.info(`Detected lockfile, using ${packageManagerAdd}`);
    } else {
      packageManagerAdd = await packageManager.select();
    }

    // Validate that a package manager was selected
    if (!packageManagerAdd || typeof packageManagerAdd !== 'string') {
      throw new Error('No package manager selected');
    }

    const editorRules = await multiselect({
      message: 'Which editor rules do you want to enable (optional)?',
      options: [
        { label: 'GitHub Copilot (VSCode)', value: 'vscode-copilot' },
        { label: 'Cursor', value: 'cursor' },
        { label: 'Windsurf', value: 'windsurf' },
        { label: 'Zed', value: 'zed' },
        { label: 'Claude Code', value: 'claude' },
        { label: 'OpenAI Codex', value: 'codex' },
      ],
      required: false,
    });

    const extraFeatures = await multiselect({
      message: 'Would you like any of the following (optional)?',
      options: [
        { label: 'Husky pre-commit hook', value: 'precommit-hooks' },
        { label: 'Lefthook pre-commit hook', value: 'lefthook' },
        { label: 'Lint-staged', value: 'lint-staged' },
      ],
      required: false,
    });

    installDependencies(packageManagerAdd);
    await upsertTsConfig();
    await upsertBiomeConfig();

    if (Array.isArray(editorRules) && editorRules.includes('zed')) {
      await upsertZedSettings();
    } else {
      await upsertVSCodeSettings();
    }

    if (Array.isArray(editorRules)) {
      if (editorRules.includes('vscode-copilot')) {
        await upsertVSCodeCopilotRules();
      }
      if (editorRules.includes('cursor')) {
        await upsertCursorRules();
      }
      if (editorRules.includes('windsurf')) {
        await upsertWindsurfRules();
      }
      if (editorRules.includes('zed')) {
        await upsertZedRules();
      }
      if (editorRules.includes('claude')) {
        await upsertClaudeRules();
      }
      if (editorRules.includes('codex')) {
        await upsertCodexRules();
      }
    }

    if (Array.isArray(extraFeatures)) {
      if (extraFeatures.includes('precommit-hooks')) {
        await initializePrecommitHook(packageManagerAdd);
      }
      if (extraFeatures.includes('lefthook')) {
        await initializeLefthook(packageManagerAdd);
      }
      if (extraFeatures.includes('lint-staged')) {
        await initializeLintStaged(packageManagerAdd);
      }
    }

    log.success('Successfully initialized Ultracite configuration!');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    log.error(`Failed to initialize Ultracite configuration: ${message}`);
    process.exit(1);
  }
};
