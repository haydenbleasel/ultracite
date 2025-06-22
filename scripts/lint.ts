import { execSync } from 'node:child_process';
import process from 'node:process';

export const lint = (files: string[]) => {
  try {
    const target = files.length > 0 ? files.join(' ') : './';
    execSync(`npx biome check ${target}`, { stdio: 'inherit' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // biome-ignore lint/suspicious/noConsole: "We want to log the error to the console"
    console.error('Failed to run Ultracite:', message);
    process.exit(1);
  }
};
