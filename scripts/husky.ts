import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { exists, getPackageExecutor } from './utils';

const path = './.husky/pre-commit';

export const husky = {
  exists: () => exists(path),
  install: (packageManagerAdd: string) => {
    execSync(`${packageManagerAdd} -D husky`);
  },
  create: async (packageManagerAdd: string) => {
    const executor = getPackageExecutor(packageManagerAdd);
    const huskyCommand = `${executor} ultracite format`;
    await mkdir('.husky', { recursive: true });
    await writeFile(path, huskyCommand);
  },
  update: async (packageManagerAdd: string) => {
    const executor = getPackageExecutor(packageManagerAdd);
    const huskyCommand = `${executor} ultracite format`;
    const existingContents = await readFile(path, 'utf-8');

    await writeFile(path, `${existingContents}\n${huskyCommand}`);
  },
};
