import { log, select } from '@clack/prompts';
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
    monorepoSuffix: '-W',
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
        value: monorepo
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
