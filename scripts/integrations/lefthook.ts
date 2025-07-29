import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { addDependency, dlxCommand, type PackageManagerName } from 'nypm';
import { exists } from '../utils';

const lefthookCommand = 'npx ultracite format';
const path = './lefthook.yml';

const lefthookConfig = `pre-commit:
  jobs:
    - run: ${lefthookCommand}
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`;

export const lefthook = {
  exists: () => exists(path),
  install: async (packageManager: PackageManagerName) => {
    await addDependency('lefthook', {
      dev: true,
      packageManager,
    });

    const result = dlxCommand(packageManager, 'lefthook install', {
      args: [],
    });

    execSync(result, { stdio: 'pipe' });
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

    // Parse existing YAML and add ultracite job
    if (existingContents.includes('pre-commit:')) {
      // Check if jobs section exists
      if (existingContents.includes('jobs:')) {
        // Add ultracite job to existing jobs array
        const ultraciteJob = `    - run: ${lefthookCommand}
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true`;
        const updatedConfig = existingContents.replace(
          /(pre-commit:\s*\n\s*jobs:\s*\n)/,
          `$1${ultraciteJob}\n`
        );
        await writeFile(path, updatedConfig);
      } else {
        // Add jobs section to existing pre-commit
        const jobsSection = `  jobs:
    - run: ${lefthookCommand}
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true`;
        const updatedConfig = existingContents.replace(
          /(pre-commit:\s*\n)/,
          `$1${jobsSection}\n`
        );
        await writeFile(path, updatedConfig);
      }
    } else {
      // Append new pre-commit section
      await writeFile(path, `${existingContents}\n${lefthookConfig}`);
    }
  },
};
