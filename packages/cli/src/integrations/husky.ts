import { mkdir, readFile } from "node:fs/promises";

import { addDevDependency, dlxCommand } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

import { runCommandSync } from "../run-command";
import {
  exists,
  isMonorepo,
  updatePackageJson,
  writeProjectFile,
} from "../utils";

const createLintStagedHookScript = (lintStagedCommand: string) => `#!/bin/sh
${lintStagedCommand}
`;

const createStandaloneHookScript = (command: string) => `#!/bin/sh
# Check if there are any staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)
if [ -z "$STAGED_FILES" ]; then
  echo "No staged files to format"
  exit 0
fi

# Run formatter, capturing the exit code so we can still re-stage and report
FORMAT_EXIT_CODE=0
${command} || FORMAT_EXIT_CODE=$?

# Re-stage files that were already staged
echo "$STAGED_FILES" | while IFS= read -r file; do
  if [ -f "$file" ]; then
    git add -- "$file"
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
const ULTRACITE_END_MARKER = "# ultracite end";

const renderSection = (hookScript: string): string =>
  `${ULTRACITE_MARKER}\n${hookScript}${ULTRACITE_END_MARKER}`;

const findSectionEnd = (lines: string[], markerIndex: number): number => {
  // Sections written by current versions carry an explicit end marker
  const endIndex = lines.indexOf(ULTRACITE_END_MARKER, markerIndex + 1);
  if (endIndex !== -1) {
    return endIndex + 1;
  }

  // Legacy standalone sections end with the success message
  const successIndex = lines.findIndex(
    (line, index) =>
      index > markerIndex && line.includes("Files formatted by Ultracite")
  );
  if (successIndex !== -1) {
    return successIndex + 1;
  }

  // Unknown section shape — assume it runs to the end of the file
  return lines.length;
};

export const husky = {
  create: async (packageManager: PackageManagerName, useLintStaged = false) => {
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

    await writeProjectFile(path, `${renderSection(hookScript)}\n`);
  },
  exists: () => exists(path),
  init: (packageManager: PackageManagerName) => {
    // Initialize husky - this sets up git hooks infrastructure
    const [command, ...args] = dlxCommand(packageManager, "husky", {
      args: ["init"],
    }).split(" ");

    const result = runCommandSync(command, args, { stdio: "pipe" });

    if (result.error || (result.status !== null && result.status !== 0)) {
      // If init fails, it might be because it's already initialized
      // Continue anyway as we'll create the hook file next
    }
  },
  install: async (packageManager: PackageManager) => {
    await addDevDependency("husky", {
      corepack: false,
      packageManager,
      silent: true,
      // npm's `--workspaces` installs in every workspace package; we want a
      // root install, which is the default when no flag is passed.
      workspace: isMonorepo() && packageManager.name !== "npm",
    });

    // Add prepare script to package.json to ensure husky is initialized
    await updatePackageJson({
      scripts: {
        prepare: "husky",
      },
    });
  },
  update: async (packageManager: PackageManagerName, useLintStaged = false) => {
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

    // If the hook already contains an ultracite section, replace only that
    // section and keep whatever the user added before or after it
    if (existingContents.includes(ULTRACITE_MARKER)) {
      const lines = existingContents.split("\n");
      const markerIndex = lines.indexOf(ULTRACITE_MARKER);
      const sectionEnd = findSectionEnd(lines, markerIndex);
      const before = lines.slice(0, markerIndex).join("\n");
      const after = lines
        .slice(sectionEnd)
        .join("\n")
        .replace(/^\n+/u, "")
        .replace(/\n+$/u, "");

      const parts = [before, renderSection(hookScript), after].filter(
        (part) => part !== ""
      );
      await writeProjectFile(path, `${parts.join("\n")}\n`);
    } else {
      const trimmedContents = existingContents.replace(/\n+$/u, "");
      await writeProjectFile(
        path,
        `${trimmedContents}\n${renderSection(hookScript)}\n`
      );
    }
  },
};
