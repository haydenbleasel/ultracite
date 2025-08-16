import { log, select } from '@clack/prompts';
import { detectPackageManager } from 'nypm';
import { isMonorepo } from './utils';

const options = [
  {
    hint: 'Recommended',
    label: 'pnpm',
    value: 'pnpm add',
    lockfiles: ['pnpm-lock.yaml'],
    monorepoSuffix: '-w',
  },
  {
    label: 'bun',
    value: 'bun add',
    lockfiles: ['bun.lockb', 'bun.lock'],
    monorepoSuffix: '',
  },
  {
    label: 'yarn',
    value: 'yarn add',
    lockfiles: ['yarn.lock'],
    monorepoSuffix: '',
  },
  {
    label: 'npm',
    value: 'npm install --legacy-peer-deps',
    lockfiles: ['package-lock.json'],
    monorepoSuffix: '--workspace .',
  },
];

export const packageManager = {
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
  isMonorepo,
  options,
};
