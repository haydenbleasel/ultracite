import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  addDevDependency,
  dlxCommand,
  type PackageManager,
  type PackageManagerName,
} from "nypm";
import { exists, isMonorepo, updatePackageJson } from "../utils";

const createLintStagedHookScript = (lintStagedCommand: string) => `#!/bin/sh
${lintStagedCommand}
`;

const createStandaloneHookScript = (command: string) => `#!/bin/sh
# Exit on any error
set -e

# Check if there are any staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)
if [ -z "$STAGED_FILES" ]; then
  echo "No staged files to format"
  exit 0
fi

# Run formatter
${command}
FORMAT_EXIT_CODE=$?

# Re-stage files that were already staged
echo "$STAGED_FILES" | while IFS= read -r file; do
  if [ -f "$file" ]; then
    git add "$file"
  fi
done

if [ $FORMAT_EXIT_CODE -ne 0 ]; then
  echo "Ultracite found issues that could not be auto-fixed."
  exit $FORMAT_EXIT_CODE
fi

echo "✨ Files formatted by Ultracite"
`;

const path = "./.husky/pre-commit";

const ULTRACITE_MARKER = "# ultracite";

export const husky = {
  exists: () => exists(path),
  install: async (packageManager: PackageManager) => {
    await addDevDependency("husky", {
      packageManager,
      workspace: await isMonorepo(),
      silent: true,
      corepack: false,
    });

    // Add prepare script to package.json to ensure husky is initialized
    await updatePackageJson({
      scripts: {
        prepare: "husky",
      },
    });
  },
  init: (packageManager: PackageManagerName) => {
    // Initialize husky - this sets up git hooks infrastructure
    const initCommand = dlxCommand(packageManager, "husky", {
      args: ["init"],
    });

    try {
      execSync(initCommand, { stdio: "pipe" });
    } catch (_error) {
      // If init fails, it might be because it's already initialized
      // Continue anyway as we'll create the hook file next
    }
  },
  create: async (
    packageManager: PackageManagerName,
    useLintStaged = false
  ) => {
    await mkdir(".husky", { recursive: true });

    let hookScript: string;

    if (useLintStaged) {
      const lintStagedCommand = dlxCommand(packageManager, "lint-staged", {
        short: packageManager === "npm",
      });
      hookScript = createLintStagedHookScript(lintStagedCommand);
    } else {
      const command = dlxCommand(packageManager, "ultracite", {
        args: ["fix"],
        short: packageManager === "npm",
      });
      hookScript = createStandaloneHookScript(command);
    }

    await writeFile(path, `${ULTRACITE_MARKER}\n${hookScript}`);
  },
  update: async (
    packageManager: PackageManagerName,
    useLintStaged = false
  ) => {
    const existingContents = await readFile(path, "utf-8");

    let hookScript: string;

    if (useLintStaged) {
      const lintStagedCommand = dlxCommand(packageManager, "lint-staged", {
        short: packageManager === "npm",
      });
      hookScript = createLintStagedHookScript(lintStagedCommand);
    } else {
      const command = dlxCommand(packageManager, "ultracite", {
        args: ["fix"],
        short: packageManager === "npm",
      });
      hookScript = createStandaloneHookScript(command);
    }

    // If the hook already contains an ultracite section, replace it
    if (existingContents.includes(ULTRACITE_MARKER)) {
      const lines = existingContents.split("\n");
      const markerIndex = lines.indexOf(ULTRACITE_MARKER);
      const before = lines.slice(0, markerIndex).join("\n");
      await writeFile(
        path,
        before
          ? `${before}\n${ULTRACITE_MARKER}\n${hookScript}`
          : `${ULTRACITE_MARKER}\n${hookScript}`
      );
    } else {
      await writeFile(
        path,
        `${existingContents}\n${ULTRACITE_MARKER}\n${hookScript}`
      );
    }
  },
};
