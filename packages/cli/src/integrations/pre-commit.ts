import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { dlxCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { exists, writeProjectFile } from "../utils";

const path = "./.pre-commit-config.yaml";
const REPOS_REGEX = /^repos:[^\S\n]*\n/mu;
const EMPTY_REPOS_REGEX = /^repos:[^\S\n]*\[[^\S\n]*\][^\S\n]*$/mu;

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
    await writeProjectFile(path, config);
  },
  exists: () => exists(path),
  update: async (packageManager: PackageManagerName) => {
    const existingContents = await readFile(path, "utf-8");
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

    // An empty inline list (`repos: []`) becomes a block list with our hook
    if (EMPTY_REPOS_REGEX.test(existingContents)) {
      const updatedConfig = existingContents.replace(
        EMPTY_REPOS_REGEX,
        `repos:\n${ultraciteHook.replace(/\n$/u, "")}`
      );
      await writeProjectFile(path, updatedConfig);
      return;
    }

    // Check if repos section exists
    if (REPOS_REGEX.test(existingContents)) {
      // Append to existing repos section
      const updatedConfig = existingContents.replace(
        REPOS_REGEX,
        `repos:\n${ultraciteHook}`
      );
      await writeProjectFile(path, updatedConfig);
      return;
    }

    if (existingContents.includes("repos:")) {
      // repos exists in a shape the regexes can't safely edit (e.g. an
      // inline non-empty list) — warn instead of silently doing nothing
      log.warn(
        `Could not add the Ultracite hook to ${path} automatically. Add a local repo entry running \`${ultraciteCommand}\`.`
      );
      return;
    }

    // Create new repos section
    await writeProjectFile(
      path,
      `${existingContents}\nrepos:\n${ultraciteHook}`
    );
  },
};
