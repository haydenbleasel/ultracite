import { execSync } from 'node:child_process';
import process from 'node:process';

export const format = (files: string[]) => {
  try {
    const target = files.length > 0 ? files.join(' ') : './';
    execSync(`npx biome check --write ${target}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to run Ultracite:', error.message);
    process.exit(1);
  }
};
