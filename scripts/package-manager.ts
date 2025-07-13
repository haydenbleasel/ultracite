import { readFile } from 'node:fs/promises';
import { log, select } from '@clack/prompts';
import { parse } from 'jsonc-parser';
import { exists, isMonorepo } from './utils';

const options = [
  {
    hint: 'Recommended',
    label: 'pnpm',
    value: 'pnpm add',
    lockfile: 'pnpm-lock.yaml',
    monorepoSuffix: '-w',
  },
  { label: 'bun', value: 'bun add', lockfile: 'bun.lockb', monorepoSuffix: '' },
  {
    label: 'yarn',
    value: 'yarn add',
    lockfile: 'yarn.lock',
    monorepoSuffix: '',
  },
  {
    label: 'npm',
    value: 'npm install',
    lockfile: 'package-lock.json',
    monorepoSuffix: '--workspace .',
  },
];

export const packageManager = {
  get: async () => {
    const monorepo = await isMonorepo();

    if (monorepo) {
      log.info(
        'Monorepo detected, updating install command to include workspace flag'
      );
    }

    // First, check for explicit packageManager field in package.json
    try {
      const packageJsonContent = await readFile('package.json', 'utf-8');
      const packageJson = parse(packageJsonContent) as Record<string, unknown> | undefined;
      
      if (packageJson?.packageManager && typeof packageJson.packageManager === 'string') {
        const packageManagerSpec = packageJson.packageManager;
        
        // Extract package manager name (e.g., "pnpm@10.12.2" -> "pnpm")
        const packageManagerName = packageManagerSpec.split('@')[0];
        
        // Find matching option based on package manager name
        const option = options.find(opt => opt.label === packageManagerName);
        
        if (option) {
          return monorepo && option.monorepoSuffix
            ? `${option.value} ${option.monorepoSuffix}`
            : option.value;
        }
      }
    } catch {
      // If we can't read package.json or parse it, fall back to lockfile detection
    }

    // Fall back to lockfile detection
    for (const option of options) {
      // biome-ignore lint/nursery/noAwaitInLoop: "this is fine."
      if (await exists(option.lockfile)) {
        return monorepo && option.monorepoSuffix
          ? `${option.value} ${option.monorepoSuffix}`
          : option.value;
      }
    }

    return null;
  },

  select: async () => {
    const monorepo = await isMonorepo();

    const value = await select({
      initialValue: 'pnpm',
      message: 'Which package manager do you use?',
      options: options.map((option) => ({
        label: option.label,
        value:
          monorepo && option.monorepoSuffix
            ? `${option.value} ${option.monorepoSuffix}`
            : option.value,
      })),
    });

    if (typeof value !== 'string') {
      return null;
    }

    return value;
  },
};
