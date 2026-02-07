import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { addDevDependency, dlxCommand, type PackageManagerName } from "nypm";
import { exists, isMonorepo, updatePackageJson } from "../utils";

const PRE_COMMIT_JOBS_REGEX = /(pre-commit:\s*\n\s*jobs:\s*\n)/;
const PRE_COMMIT_REGEX = /(pre-commit:\s*\n)/;

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
  exists: () => exists(path),
  install: async (packageManager: PackageManagerName) => {
    await addDevDependency("lefthook", {
      packageManager,
      workspace: await isMonorepo(),
      silent: true,
      corepack: false,
    });

    // Add prepare script to package.json to ensure lefthook is initialized
    await updatePackageJson({
      scripts: {
        prepare: "lefthook install",
      },
    });

    const installCommand = dlxCommand(packageManager, "lefthook", {
      args: ["install"],
      short: packageManager === "npm",
    });

    execSync(installCommand, { stdio: "pipe" });
  },
  create: async (packageManager: PackageManagerName) => {
    const config = createLefthookConfig(packageManager);
    await writeFile(path, config);
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
      await writeFile(path, lefthookConfig);
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
          `$1${ultraciteJob}\n`
        );
        await writeFile(path, updatedConfig);
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
