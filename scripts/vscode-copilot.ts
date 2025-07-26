import { mkdir, writeFile } from 'node:fs/promises';
import { rulesFile } from '../docs/lib/rules';
import { exists } from './utils';

const path = './.github/copilot-instructions.md';
const content = `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

${rulesFile}`;

export const vscodeCopilot = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.github', { recursive: true });
    await writeFile(path, content);
  },
  update: async () => {
    await mkdir('.github', { recursive: true });
    await writeFile(path, content);
  },
};
