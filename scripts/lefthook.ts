import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { exists } from './utils';

const lefthookCommand = 'npx ultracite format';
const path = './lefthook.yml';

const lefthookConfig = `pre-commit:
  commands:
    ultracite:
      run: ${lefthookCommand}
`;

export const lefthook = {
  exists: () => exists(path),
  install: (packageManagerAdd: string) => {
    execSync(`${packageManagerAdd} -D lefthook`);
    execSync('npx lefthook install');
  },
  create: async () => {
    await writeFile(path, lefthookConfig);
  },
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');
    
    // Check if ultracite command is already present
    if (existingContents.includes(lefthookCommand)) {
      return;
    }

    // Parse existing YAML and add ultracite command
    if (existingContents.includes('pre-commit:')) {
      // Add ultracite command to existing pre-commit section
      const updatedConfig = existingContents.replace(
        /(pre-commit:\s*\n\s*commands:\s*\n)/,
        `$1    ultracite:\n      run: ${lefthookCommand}\n`
      );
      await writeFile(path, updatedConfig);
    } else {
      // Append new pre-commit section
      await writeFile(path, `${existingContents}\n${lefthookConfig}`);
    }
  },
};