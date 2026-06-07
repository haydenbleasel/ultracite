import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { addDevDependency, dlxCommand } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

import {
  exists,
  isMonorepo,
  updatePackageJson,
  writeProjectFile,
} from "../utils";

const PRE_COMMIT_JOBS_REGEX =
  /(?<preCommitJobs>pre-commit:\s*\n\s*jobs:\s*\n)/u;
const PRE_COMMIT_REGEX = /(?<preCommit>pre-commit:\s*\n)/u;

const createUltraciteCommand = (packageManager: PackageManagerName) =>
  dlxCommand(packageManager, "ultracite", {
    args: ["fix"],
    short: packageManager === "npm",
  });

const path = "./lefthook.yml";

const createLefthookConfig = (
  packageManager: PackageManagerName
) => `pre-commit:
  jobs:
    - run: ${createUltraciteCommand(packageManager)}
      glob:
        - "**/*.js"
        - "**/*.jsx"
        - "**/*.ts"
        - "**/*.tsx"
        - "**/*.json"
        - "**/*.jsonc"
        - "**/*.css"
      stage_fixed: true
`;

export const lefthook = {
  create: async (packageManager: PackageManagerName) => {
    const config = createLefthookConfig(packageManager);
    await writeProjectFile(path, config);
  },
  exists: () => exists(path),
  install: async (packageManager: PackageManager) => {
    await addDevDependency("lefthook", {
      corepack: false,
      packageManager,
      silent: true,
      // npm's `--workspaces` installs in every workspace package; we want a
      // root install, which is the default when no flag is passed.
      workspace: isMonorepo() && packageManager.name !== "npm",
    });

    // Add prepare script to package.json to ensure lefthook is initialized
    await updatePackageJson({
      scripts: {
        prepare: "lefthook install",
      },
    });

    const installCommand = dlxCommand(packageManager.name, "lefthook", {
      args: ["install"],
      short: packageManager.name === "npm",
    });

    try {
      execSync(installCommand, { stdio: "pipe" });
    } catch {
      // lefthook install fails with exit code 128 when not in a git repository.
      // The dependency and prepare script are still set up, so lefthook will
      // initialize hooks on the next `prepare` run after git is initialized.
    }
  },
  update: async (packageManager: PackageManagerName) => {
    const existingContents = await readFile(path, "utf-8");
    const ultraciteCommand = createUltraciteCommand(packageManager);
    const lefthookConfig = createLefthookConfig(packageManager);

    // Check if ultracite command is already present
    if (existingContents.includes(ultraciteCommand)) {
      return;
    }

    // Check if this is the default commented template from lefthook install
    const isDefaultTemplate = existingContents.startsWith("# EXAMPLE USAGE:");

    if (isDefaultTemplate) {
      // Replace the entire default template with our config
      await writeProjectFile(path, lefthookConfig);
      return;
    }

    // Parse existing YAML and add ultracite job
    if (existingContents.includes("pre-commit:")) {
      // Check if jobs section exists
      if (existingContents.includes("jobs:")) {
        // Add ultracite job to existing jobs array
        const ultraciteJob = `    - run: ${ultraciteCommand}
      glob:
        - "**/*.js"
        - "**/*.jsx"
        - "**/*.ts"
        - "**/*.tsx"
        - "**/*.json"
        - "**/*.jsonc"
        - "**/*.css"
      stage_fixed: true`;
        const updatedConfig = existingContents.replace(
          PRE_COMMIT_JOBS_REGEX,
          `$<preCommitJobs>${ultraciteJob}\n`
        );
        await writeProjectFile(path, updatedConfig);
      } else {
        // Add jobs section to existing pre-commit
        const jobsSection = `  jobs:
    - run: ${ultraciteCommand}
      glob:
        - "**/*.js"
        - "**/*.jsx"
        - "**/*.ts"
        - "**/*.tsx"
        - "**/*.json"
        - "**/*.jsonc"
        - "**/*.css"
      stage_fixed: true`;
        const updatedConfig = existingContents.replace(
          PRE_COMMIT_REGEX,
          `$<preCommit>${jobsSection}\n`
        );
        await writeProjectFile(path, updatedConfig);
      }
    } else {
      // Append new pre-commit section
      await writeProjectFile(path, `${existingContents}\n${lefthookConfig}`);
    }
  },
};
