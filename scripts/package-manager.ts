import { select } from '@clack/prompts';
import { exists } from './utils';

const options = [
  {
    hint: 'Recommended',
    label: 'pnpm',
    value: 'pnpm add',
    lockfile: 'pnpm-lock.yaml',
  },
  { label: 'bun', value: 'bun add', lockfile: 'bun.lockb' },
  { label: 'yarn', value: 'yarn add', lockfile: 'yarn.lock' },
  { label: 'npm', value: 'npm install', lockfile: 'package-lock.json' },
];

export const packageManager = {
  get: async () => {
    for (const option of options) {
      // biome-ignore lint/nursery/noAwaitInLoop: "this is fine."
      if (await exists(option.lockfile)) {
        return option.value;
      }
    }

    return null;
  },

  select: async () => {
    const value = await select({
      initialValue: 'pnpm',
      message: 'Which package manager do you use?',
      options: options.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    });

    if (typeof value !== 'string') {
      throw new Error('No package manager selected');
    }

    return value;
  },
};
