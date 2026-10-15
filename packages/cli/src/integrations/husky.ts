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

// Fixes only the staged files, and re-stages only the ones with no unstaged
// changes: `git add` on a partially staged file would commit the hunks the
// user left out. The fix itself gets its file list from `git diff -z` through
// `xargs -0`, so names with spaces or non-ASCII characters stay intact; the
// empty check comes first because GNU xargs runs the command once with no
// arguments on empty input, which would fix the whole project. No early
// `exit 0`: commands a user keeps after the ultracite section must still run
// when nothing is staged (e.g. `git commit --amend` or an empty commit). A
// fix failure still exits non-zero to block the commit. Husky runs the hook
// with `sh -e`, so every command that can fail in a normal run (grep finding
// no match, the fix itself) carries its own `||`.
const createStandaloneHookScript = (command: string) => `#!/bin/sh
# Fix only the staged files
STAGED_FILES=$(git -c core.quotePath=false diff --cached --name-only --diff-filter=ACMR)
if [ -z "$STAGED_FILES" ]; then
  echo "No staged files to format"
else
  # Staged files that also have unstaged changes, found before fixing
  UNSTAGED_FILES=$(git -c core.quotePath=false diff --name-only)
  PARTIALLY_STAGED=""
  FULLY_STAGED=$STAGED_FILES
  if [ -n "$UNSTAGED_FILES" ]; then
    PARTIALLY_STAGED=$(printf '%s\\n' "$STAGED_FILES" | grep -Fx -- "$UNSTAGED_FILES" || true)
  fi
  if [ -n "$PARTIALLY_STAGED" ]; then
    FULLY_STAGED=$(printf '%s\\n' "$STAGED_FILES" | grep -Fxv -- "$PARTIALLY_STAGED" || true)
  fi

  # Run the fixer on the staged files, capturing the exit code so we can
  # still re-stage and report
  FORMAT_EXIT_CODE=0
  git diff --cached --name-only -z --diff-filter=ACMR | xargs -0 ${command} || FORMAT_EXIT_CODE=$?

  # Re-stage the fully staged files; staging the others would add their
  # unstaged changes to the commit
  printf '%s\\n' "$FULLY_STAGED" | while IFS= read -r file; do
    if [ -f "$file" ]; then
      git add -- "$file"
    fi
  done

  if [ -n "$PARTIALLY_STAGED" ]; then
    echo "These files also have unstaged changes, so Ultracite's fixes to them were left unstaged. Review and stage them:"
    printf '%s\\n' "$PARTIALLY_STAGED" | sed 's/^/  /'
  fi

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

// `bun lint --staged` and `bun fmt --staged` find the staged files and stage
// the ones they fix again themselves. A staged file with unstaged changes too
// isn't fixed: Bun names it and exits 2, which stops the commit.
const createBunStagedHookScript = (fixCommand: string) => `#!/bin/sh
${fixCommand} --staged
`;

/**
 * How the hook finds the staged files: through lint-staged, through Bun's own
 * `--staged` mode (the Bun provider), or with the shell script above.
 */
export type HuskyHookMode = "bun" | "lint-staged" | "script";

// Hooks run the project's installed tools: `yarn dlx` does not exist in
// Yarn 1 (so every commit failed there) and `pnpm dlx` downloads the latest
// release instead of the version the project pins.
const createHookScript = (
  packageManager: PackageManagerName,
  mode: HuskyHookMode
): string => {
  switch (mode) {
    case "bun": {
      return createBunStagedHookScript(ultraciteFixCommand(packageManager));
    }

    case "lint-staged": {
      return createLintStagedHookScript(
        localBinCommand(packageManager, "lint-staged")
      );
    }

    case "script": {
      return createStandaloneHookScript(ultraciteFixCommand(packageManager));
    }

    default: {
      throw new Error(`Unknown hook mode: ${String(mode satisfies never)}`);
    }
  }
};

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
  create: async (
    packageManager: PackageManagerName,
    mode: HuskyHookMode = "script"
  ) => {
    await mkdir(".husky", { recursive: true });

    await writeProjectFile(
      path,
      `${renderSection(createHookScript(packageManager, mode))}\n`
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
  update: async (
    packageManager: PackageManagerName,
    mode: HuskyHookMode = "script"
  ) => {
    const existingContents = await readFile(path, "utf-8");

    const section = renderSection(createHookScript(packageManager, mode));

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
