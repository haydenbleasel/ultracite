import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { exists } from './utils';

const huskyCommand = 'npx ultracite format';
const path = '.husky/pre-commit';

export const husky = {
  exists: () => exists(path),
  install: (packageManagerAdd: string) => {
    execSync(`${packageManagerAdd} -D husky`);
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
