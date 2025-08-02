import { execSync } from 'node:child_process';
import process from 'node:process';

type FixOptions = {
  unsafe?: boolean;
};

export const fix = (files: string[], options: FixOptions = {}) => {
  try {
    const target =
      files.length > 0 ? files.map((file) => `"${file}"`).join(' ') : './';
    const unsafeFlag = options.unsafe ? ' --unsafe' : '';
    execSync(`npx @biomejs/biome check --write${unsafeFlag} ${target}`, {
      stdio: 'inherit',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // biome-ignore lint/suspicious/noConsole: "We want to log the error to the console"
    console.error('Failed to run Ultracite:', message);
    process.exit(1);
  }
};
