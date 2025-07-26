import { mkdir, writeFile } from 'node:fs/promises';
import { rulesFile } from '../docs/lib/rules';
import { exists } from './utils';

const path = './.cursor/rules/ultracite.mdc';
const content = `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: true
---

${rulesFile}`;

export const cursor = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.cursor/rules', { recursive: true });
    await writeFile(path, content);
  },
  update: async () => {
    await mkdir('.cursor/rules', { recursive: true });
    await writeFile(path, rulesFile);
  },
};
