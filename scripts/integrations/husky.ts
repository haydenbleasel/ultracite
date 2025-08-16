import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { addDevDependency, type PackageManagerName } from 'nypm';
import { exists } from '../utils';

const huskyCommand = 'npx ultracite format';
const path = './.husky/pre-commit';

export const husky = {
  exists: () => exists(path),
  install: async (packageManager: PackageManagerName) => {
    await addDevDependency('husky', { packageManager });
  },
  create: async () => {
    await mkdir('.husky', { recursive: true });
    await writeFile(path, huskyCommand);
  },
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');

    await writeFile(path, `${existingContents}\n${huskyCommand}`);
  },
};
