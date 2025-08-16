import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { addDevDependency, dlxCommand, type PackageManagerName } from 'nypm';
import { exists, isMonorepo } from '../utils';

const path = './.husky/pre-commit';

export const husky = {
  exists: () => exists(path),
  install: async (packageManager: PackageManagerName) => {
    await addDevDependency('husky', {
      packageManager,
      workspace: await isMonorepo(),
    });
  },
  create: async (packageManager: PackageManagerName) => {
    await mkdir('.husky', { recursive: true });

    const command = dlxCommand(packageManager, 'ultracite', {
      args: ['format'],
      short: packageManager === 'npm',
    });

    await writeFile(path, command);
  },
  update: async (packageManager: PackageManagerName) => {
    const existingContents = await readFile(path, 'utf-8');

    const command = dlxCommand(packageManager, 'ultracite', {
      args: ['format'],
      short: packageManager === 'npm',
    });

    await writeFile(path, `${existingContents}\n${command}`);
  },
};
