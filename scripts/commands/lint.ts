import { spawnSync } from 'node:child_process';
import process from 'node:process';

export const lint = (files: string[]) => {
  const args = ['@biomejs/biome', 'check'];

  // Add files or default to current directory
  if (files.length > 0) {
    args.push(...files);
  } else {
    args.push('./');
  }

  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    // biome-ignore lint/suspicious/noConsole: "We want to log the error to the console"
    console.error('Failed to run Ultracite:', result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};
