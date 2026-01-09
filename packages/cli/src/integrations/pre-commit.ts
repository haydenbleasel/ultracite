import { readFile, writeFile } from "node:fs/promises";
import { dlxCommand, type PackageManagerName } from "nypm";

import { exists } from "../utils";

const path = "./.pre-commit-config.yaml";
const REPOS_REGEX = /^repos:\s*\n/m;

const createUltraciteCommand = (packageManager: PackageManagerName) =>
  dlxCommand(packageManager, "ultracite", {
    args: ["fix"],
    short: packageManager === "npm",
  });

const createPreCommitConfig = (packageManager: PackageManagerName) => `repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: ${createUltraciteCommand(packageManager)}
        language: system
        types_or: [javascript, jsx, ts, tsx, json, css]
        pass_filenames: false
`;

export const preCommit = {
  create: async (packageManager: PackageManagerName) => {
    const config = createPreCommitConfig(packageManager);
    await writeFile(path, config);
  },
  exists: () => exists(path),
  update: async (packageManager: PackageManagerName) => {
    const existingContents = await readFile(path, "utf8");
    const ultraciteCommand = createUltraciteCommand(packageManager);

    // Check if ultracite hook is already present
    if (existingContents.includes("id: ultracite")) {
      return;
    }

    // Add ultracite hook to existing config
    const ultraciteHook = `  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: ${ultraciteCommand}
        language: system
        types_or: [javascript, jsx, ts, tsx, json, css]
        pass_filenames: false
`;

    // Check if repos section exists
    if (existingContents.includes("repos:")) {
      // Append to existing repos section
      const updatedConfig = existingContents.replace(
        REPOS_REGEX,
        `repos:\n${ultraciteHook}`
      );
      await writeFile(path, updatedConfig);
    } else {
      // Create new repos section
      await writeFile(path, `${existingContents}\nrepos:\n${ultraciteHook}`);
    }
  },
};
