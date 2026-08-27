import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { addDevDependency, dlxCommand } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

import { getRootInstallOptions } from "../package-manager";
import { spawnSync } from "../spawn-sync";
import { exists, updatePackageJson, writeProjectFile } from "../utils";

// The top-level pre-commit hook and its indented block (including blank
// lines) — the ultracite job must be inserted inside this block, not
// wherever a `jobs:` key happens to appear elsewhere in the file.
const PRE_COMMIT_BLOCK_REGEX =
  /^pre-commit:[^\S\n]*\n(?<block>(?:[ \t]+[^\n]*\n?|[ \t]*\n)*)/mu;
const JOBS_LINE_REGEX = /^(?<indent>[ \t]+)jobs:[^\S\n]*\n/mu;

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
      silent: true,
      ...getRootInstallOptions(packageManager),
    });

    // Add prepare script to package.json to ensure lefthook is initialized
    await updatePackageJson({
      scripts: {
        prepare: "lefthook install",
      },
    });

    // dlxCommand returns a full command line, e.g. "npx lefthook install" —
    // split it so spawn gets a real binary and never a shell.
    const [command, ...args] = dlxCommand(packageManager.name, "lefthook", {
      args: ["install"],
      short: packageManager.name === "npm",
    }).split(" ");

    // The result is deliberately ignored: lefthook install fails with exit
    // code 128 when not in a git repository. The dependency and prepare script
    // are still set up, so lefthook will initialize hooks on the next
    // `prepare` run after git is initialized.
    spawnSync(command, args, { stdio: "pipe" });
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

    const blockMatch = PRE_COMMIT_BLOCK_REGEX.exec(existingContents);

    if (!blockMatch) {
      // No pre-commit hook yet — append a new pre-commit section
      await writeProjectFile(path, `${existingContents}\n${lefthookConfig}`);
      return;
    }

    const block = blockMatch.groups?.block ?? "";
    const blockStart = blockMatch.index + blockMatch[0].length - block.length;
    const jobsMatch = JOBS_LINE_REGEX.exec(block);

    const renderJob = (indent: string) =>
      [
        `${indent}- run: ${ultraciteCommand}`,
        `${indent}  glob:`,
        `${indent}    - "**/*.js"`,
        `${indent}    - "**/*.jsx"`,
        `${indent}    - "**/*.ts"`,
        `${indent}    - "**/*.tsx"`,
        `${indent}    - "**/*.json"`,
        `${indent}    - "**/*.jsonc"`,
        `${indent}    - "**/*.css"`,
        `${indent}  stage_fixed: true`,
        "",
      ].join("\n");

    if (jobsMatch) {
      // Insert the ultracite job right below the pre-commit block's own
      // jobs: line, matching its indentation
      const insertAt =
        blockStart + (jobsMatch.index ?? 0) + jobsMatch[0].length;
      const jobsIndent = jobsMatch.groups?.indent ?? "  ";
      const updatedConfig = `${existingContents.slice(0, insertAt)}${renderJob(`${jobsIndent}  `)}${existingContents.slice(insertAt)}`;
      await writeProjectFile(path, updatedConfig);
      return;
    }

    if (block.includes("jobs:")) {
      // A jobs: key exists but not in a shape we can safely edit (e.g. an
      // inline value) — don't risk producing invalid YAML or silently
      // writing the file back unchanged.
      log.warn(
        `Could not add the Ultracite job to ${path} automatically. Add this to the pre-commit jobs list:\n  - run: ${ultraciteCommand}`
      );
      return;
    }

    // pre-commit block exists but has no jobs: yet — add the section at the
    // top of the block
    const updatedConfig = `${existingContents.slice(0, blockStart)}  jobs:\n${renderJob("    ")}${existingContents.slice(blockStart)}`;
    await writeProjectFile(path, updatedConfig);
  },
};
