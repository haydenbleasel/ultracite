import { readFile, writeFile } from 'node:fs/promises';
import { rulesFile } from '../docs/lib/rules';
import { exists } from './utils';

const path = './.rules';

export const zed = {
  exists: () => exists(path),
  create: async () => {
    await writeFile(path, rulesFile);
  },
  update: async () => {
    if (!(await exists(path))) {
      // If the file doesn't exist, just create it with the rules
      await writeFile(path, rulesFile);
      return;
    }

    const existingContents = await readFile(path, 'utf-8');

    // Check if rules are already present to avoid duplicates
    if (existingContents.includes(rulesFile.trim())) {
      return;
    }

    await writeFile(path, `${existingContents}\n\n${rulesFile}`);
  },
};
