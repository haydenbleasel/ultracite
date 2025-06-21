import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { exists } from './utils';

const huskyCommand = 'npx ultracite format';
const path = '.husky/pre-commit';

export const husky = {
  exists: async () => {
    try {
      await exists(path);
      return true;
    } catch {
      return false;
    }
  },
  install: (packageManagerAdd: string) => {
    execSync(`${packageManagerAdd} -D husky`);
  },
  create: async () => {
    await writeFile(path, huskyCommand);
  },
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');

    await writeFile(path, `${existingContents}\n${huskyCommand}`);
  },
};
