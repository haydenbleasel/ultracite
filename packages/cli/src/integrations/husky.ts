import { mkdir, readFile } from "node:fs/promises";

import { addDevDependency } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

import { getRootInstallOptions } from "../package-manager";
import { readPackageJson } from "../schemas";
import { spawnSync } from "../spawn-sync";
import { exists, updatePackageJson, writeProjectFile } from "../utils";
import {
  chainScript,
  localBinCommand,
  ultraciteFixCommand,
} from "./project-command";

const createLintStagedHookScript = (lintStagedCommand: string) => `#!/bin/sh
${lintStagedCommand}
`;

// No early `exit 0`: commands a user keeps after the ultracite section must
// still run when nothing is staged (e.g. `git commit --amend` or an empty
// commit). A fix failure still exits non-zero to block the commit.
const createStandaloneHookScript = (command: string) => `#!/bin/sh
# Check if there are any staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)
if [ -z "$STAGED_FILES" ]; then
  echo "No staged files to format"
else
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
fi
`;

const path = "./.husky/pre-commit";

const ULTRACITE_MARKER = "# ultracite";
const ULTRACITE_END_MARKER = "# ultracite end";
const SHEBANG = "#!/bin/sh";
const LINT_STAGED_LINE_RE = /\blint-staged$/u;

const renderSection = (hookScript: string): string =>
  `${ULTRACITE_MARKER}\n${hookScript}${ULTRACITE_END_MARKER}`;

// Hooks run the project's installed tools: `yarn dlx` does not exist in
// Yarn 1 (so every commit failed there) and `pnpm dlx` downloads the latest
// release instead of the version the project pins.
const createHookScript = (
  packageManager: PackageManagerName,
  useLintStaged: boolean
): string =>
  useLintStaged
    ? createLintStagedHookScript(localBinCommand(packageManager, "lint-staged"))
    : createStandaloneHookScript(ultraciteFixCommand(packageManager));

const findSectionEnd = (lines: string[], markerIndex: number): number => {
  // Sections written by current versions carry an explicit end marker
  const endIndex = lines.indexOf(ULTRACITE_END_MARKER, markerIndex + 1);
  if (endIndex !== -1) {
    return endIndex + 1;
  }

  // Legacy lint-staged sections are the shebang plus one lint-staged line
  if (
    lines[markerIndex + 1] === SHEBANG &&
    LINT_STAGED_LINE_RE.test(lines[markerIndex + 2] ?? "")
  ) {
    return markerIndex + 3;
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

    await writeProjectFile(
      path,
      `${renderSection(createHookScript(packageManager, useLintStaged))}\n`
    );
  },
  exists: () => exists(path),
  init: (packageManager: PackageManagerName) => {
    // Set up the git hooks infrastructure by running plain `husky` — NOT
    // `husky init`, which unconditionally overwrites .husky/pre-commit with
    // `npm test`, destroying any existing user hook.
    const [command, ...args] = localBinCommand(packageManager, "husky").split(
      " "
    );

    const result = spawnSync(command, args, { stdio: "pipe" });

    if (result.error || (result.status !== null && result.status !== 0)) {
      // If setup fails (e.g. not a git repository yet), continue anyway —
      // the prepare script will initialize hooks on the next install
    }
  },
  install: async (packageManager: PackageManager) => {
    await addDevDependency("husky", {
      corepack: false,
      silent: true,
      ...getRootInstallOptions(packageManager),
    });

    // Initialize husky on install, keeping any prepare script the project
    // already has (e.g. `svelte-kit sync`, or lefthook's).
    const packageJson = await readPackageJson();
    await updatePackageJson({
      scripts: {
        prepare: chainScript(
          packageJson?.scripts?.prepare,
          "husky",
          /\bhusky\b/u
        ),
      },
    });
  },
  update: async (packageManager: PackageManagerName, useLintStaged = false) => {
    const existingContents = await readFile(path, "utf-8");
    const section = renderSection(
      createHookScript(packageManager, useLintStaged)
    );

    // CRLF line endings would break the shell script anyway; splitting on
    // both lets the marker be found so a re-run replaces the section instead
    // of appending another one.
    const lines = existingContents.split(/\r?\n/u);
    const markerIndex = lines.indexOf(ULTRACITE_MARKER);

    // If the hook already contains an ultracite section, replace only that
    // section and keep whatever the user added before or after it
    if (markerIndex !== -1) {
      const sectionEnd = findSectionEnd(lines, markerIndex);
      const before = lines.slice(0, markerIndex).join("\n");
      const after = lines
        .slice(sectionEnd)
        .join("\n")
        .replace(/^\n+/u, "")
        .replace(/\n+$/u, "");

      const parts = [before, section, after].filter((part) => part !== "");
      await writeProjectFile(path, `${parts.join("\n")}\n`);
      return;
    }

    const trimmedContents = lines.join("\n").replace(/\n+$/u, "");
    await writeProjectFile(
      path,
      trimmedContents === ""
        ? `${section}\n`
        : `${trimmedContents}\n${section}\n`
    );
  },
};
