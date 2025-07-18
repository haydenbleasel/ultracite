import { readFile, writeFile } from 'node:fs/promises';
import { aiRulesContent } from '../docs/lib/rules';
import { exists } from './utils';

const path = './.rules';

export const zedCopilot = {
  exists: () => exists(path),
  create: async () => {
    await writeFile(path, aiRulesContent);
  },
  update: async () => {
    if (!(await exists(path))) {
      // If the file doesn't exist, just create it with the rules
      await writeFile(path, aiRulesContent);
      return;
    }

    const existingContents = await readFile(path, 'utf-8');

    // Check if rules are already present to avoid duplicates
    if (existingContents.includes(aiRulesContent.trim())) {
      return;
    }

    await writeFile(path, `${existingContents}\n\n${aiRulesContent}`);
  },
};
