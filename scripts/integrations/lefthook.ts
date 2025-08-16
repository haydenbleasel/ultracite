import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { addDevDependency, dlxCommand, type PackageManagerName } from 'nypm';
import { exists, isMonorepo } from '../utils';

const createLefthookCommand = (packageManager: PackageManagerName) =>
  dlxCommand(packageManager, 'lefthook', {
    args: ['install'],
  });

const path = './lefthook.yml';

const createLefthookConfig = (
  packageManager: PackageManagerName
) => `pre-commit:
  jobs:
    - run: ${createLefthookCommand(packageManager)}
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
    await addDevDependency('lefthook', {
      packageManager,
      workspace: await isMonorepo(),
    });

    const installCommand = dlxCommand(packageManager, 'lefthook', {
      args: ['install'],
    });

    execSync(installCommand);
  },
  create: async (packageManager: PackageManagerName) => {
    const config = createLefthookConfig(packageManager);
    await writeFile(path, config);
  },
  update: async (packageManager: PackageManagerName) => {
    const existingContents = await readFile(path, 'utf-8');
    const lefthookCommand = createLefthookCommand(packageManager);
    const lefthookConfig = createLefthookConfig(packageManager);

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
