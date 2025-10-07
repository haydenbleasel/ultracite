import { mkdir, readFile, writeFile } from "node:fs/promises";
import { addDevDependency, dlxCommand, type PackageManagerName } from "nypm";
import { exists, isMonorepo } from "../utils";

const createHookScript = (command: string) => `#!/bin/sh
# Exit on any error
set -e

# Check if there are any staged files
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "No staged files to format"
  exit 0
fi

# Store the hash of staged changes to detect modifications
STAGED_HASH=$(git diff --cached | sha256sum | cut -d' ' -f1)

# Save list of staged files (handling all file states)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)
PARTIALLY_STAGED=$(git diff --name-only)

# Stash unstaged changes to preserve working directory
# --keep-index keeps staged changes in working tree
git stash push --quiet --keep-index --message "pre-commit-stash" || true
STASHED=$?

# Run formatter on the staged files
${command}
FORMAT_EXIT_CODE=$?

# Restore working directory state
if [ $STASHED -eq 0 ]; then
  # Re-stage the formatted files
  if [ -n "$STAGED_FILES" ]; then
    echo "$STAGED_FILES" | while IFS= read -r file; do
      if [ -f "$file" ]; then
        git add "$file"
      fi
    done
  fi
  
  # Restore unstaged changes
  git stash pop --quiet || true
  
  # Restore partial staging if files were partially staged
  if [ -n "$PARTIALLY_STAGED" ]; then
    for file in $PARTIALLY_STAGED; do
      if [ -f "$file" ] && echo "$STAGED_FILES" | grep -q "^$file$"; then
        # File was partially staged - need to unstage the unstaged parts
        git restore --staged "$file" 2>/dev/null || true
        git add -p "$file" < /dev/null 2>/dev/null || git add "$file"
      fi
    done
  fi
else
  # No stash was created, just re-add the formatted files
  if [ -n "$STAGED_FILES" ]; then
    echo "$STAGED_FILES" | while IFS= read -r file; do
      if [ -f "$file" ]; then
        git add "$file"
      fi
    done
  fi
fi

# Check if staged files actually changed
NEW_STAGED_HASH=$(git diff --cached | sha256sum | cut -d' ' -f1)
if [ "$STAGED_HASH" != "$NEW_STAGED_HASH" ]; then
  echo "✨ Files formatted by Ultracite"
fi

exit $FORMAT_EXIT_CODE
`;

const path = "./.husky/pre-commit";

export const husky = {
  exists: () => exists(path),
  install: async (packageManager: PackageManagerName) => {
    await addDevDependency("husky", {
      packageManager,
      workspace: await isMonorepo(),
    });
  },
  create: async (packageManager: PackageManagerName) => {
    await mkdir(".husky", { recursive: true });

    const command = dlxCommand(packageManager, "ultracite", {
      args: ["fix"],
      short: packageManager === "npm",
    });

    // Create a pre-commit hook that preserves staging state robustly
    const hookScript = createHookScript(command);

    await writeFile(path, hookScript);
  },
  update: async (packageManager: PackageManagerName) => {
    const existingContents = await readFile(path, "utf-8");

    const command = dlxCommand(packageManager, "ultracite", {
      args: ["fix"],
      short: packageManager === "npm",
    });

    // Create a pre-commit hook that preserves staging state robustly
    const hookScript = createHookScript(command);

    await writeFile(path, `${existingContents}\n${hookScript}`);
  },
};
