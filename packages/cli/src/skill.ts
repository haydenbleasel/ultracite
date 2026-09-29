import { isCancel, select, spinner } from "@clack/prompts";
import { dlxCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { spawnSync } from "./spawn-sync";
import { exists } from "./utils";

const ultraciteSkillRepo = "haydenbleasel/ultracite";
const ultraciteSkillName = "ultracite";

interface MaybeInstallUltraciteSkillOptions {
  packageManager: PackageManagerName;
  quiet?: boolean;
  shouldInstall?: boolean;
}

// skills agents that read skills from their own project directory rather
// than the shared `.agents/skills`, keyed by that directory. init has written
// some of these by the time the skill is installed (`.claude`, `.windsurf`,
// `.codebuddy`, `.roo`), so the list follows the user's choices.
const projectAgentDirectories = new Map([
  [".augment", "augment"],
  [".claude", "claude-code"],
  [".codebuddy", "codebuddy"],
  [".continue", "continue"],
  [".crush", "crush"],
  [".goose", "goose"],
  [".junie", "junie"],
  [".kiro", "kiro-cli"],
  [".openhands", "openhands"],
  [".qwen", "qwen-code"],
  [".roo", "roo"],
  [".trae", "trae"],
  [".windsurf", "windsurf"],
]);

/**
 * The skills agents to install to: `universal` (`.agents/skills`, read by
 * Codex, Cursor, GitHub Copilot, Gemini CLI, Amp, Cline, OpenCode and more)
 * plus each agent above whose directory the project has. Naming them keeps
 * `skills add --yes` from falling back to "all agents" when it detects none,
 * which also wrote a `.claude/skills` link and a second copy under a
 * top-level `agent/` directory (for the Eve framework).
 */
const skillAgents = (): string[] => [
  "universal",
  ...[...projectAgentDirectories]
    .filter(([directory]) => exists(directory))
    .map(([, agent]) => agent),
];

// `skills add` asks which agents to install to and where, which it can only
// do on a terminal. init runs it with piped stdio, so without `--yes` it
// either exits 1 ("Interactive prompt required") or cancels the prompt and
// exits 0 with nothing installed — which init reported as installed. With
// `--yes` and explicit agents it installs into the project without asking.
const buildUltraciteSkillInstallCommand = (
  packageManager: PackageManagerName,
  nonInteractive = false
) =>
  dlxCommand(packageManager, "skills", {
    args: nonInteractive
      ? ["add", ultraciteSkillRepo, "--yes", "--agent", ...skillAgents()]
      : ["add", ultraciteSkillRepo],
    short: packageManager === "npm",
  });

const buildUltraciteSkillListCommand = (
  packageManager: PackageManagerName,
  global = false
) =>
  dlxCommand(packageManager, "skills", {
    args: global ? ["list", "-g", "--json"] : ["list", "--json"],
    short: packageManager === "npm",
  });

const isUltraciteSkillInstalledInScope = (
  packageManager: PackageManagerName,
  global = false
) => {
  const fullCommand = buildUltraciteSkillListCommand(packageManager, global);
  const [command, ...args] = fullCommand.split(" ");
  const result = spawnSync(command, args, {
    stdio: "pipe",
  });

  if (result.error || result.status !== 0 || !result.stdout) {
    return false;
  }

  try {
    // JSON.parse output is untyped; `skills list --json` prints an array of
    // skill records, and a mismatched payload throws below and is caught.
    const installedSkills: { name?: string }[] = JSON.parse(result.stdout);

    return installedSkills.some((skill) => skill.name === ultraciteSkillName);
  } catch {
    return false;
  }
};

const hasUltraciteSkillInstalled = (packageManager: PackageManagerName) =>
  isUltraciteSkillInstalledInScope(packageManager) ||
  isUltraciteSkillInstalledInScope(packageManager, true);

const promptToInstallUltraciteSkill = async () => {
  const installSkillResult = await select({
    message: "Do you want to install the Ultracite skill?",
    options: [
      {
        label: "Yes, install it",
        value: "install",
      },
      {
        label: "No, I'll do it later",
        value: "skip",
      },
    ],
  });

  return !isCancel(installSkillResult) && installSkillResult === "install";
};

export const getUltraciteSkillInstallCommand = (
  packageManager: PackageManagerName
) => buildUltraciteSkillInstallCommand(packageManager);

export const maybeInstallUltraciteSkill = async ({
  packageManager,
  quiet = false,
  shouldInstall,
}: MaybeInstallUltraciteSkillOptions) => {
  if (
    shouldInstall === undefined &&
    !quiet &&
    hasUltraciteSkillInstalled(packageManager)
  ) {
    return true;
  }

  const wantsInstall =
    shouldInstall ?? (!quiet && (await promptToInstallUltraciteSkill()));

  if (!wantsInstall) {
    return false;
  }

  const fullCommand = buildUltraciteSkillInstallCommand(packageManager, true);
  const [command, ...args] = fullCommand.split(" ");
  const s = spinner();

  if (!quiet) {
    s.start("Installing the Ultracite skill...");
  }

  const result = spawnSync(command, args, {
    stdio: "pipe",
  });
  const didInstall = !result.error && result.status === 0;

  if (!quiet) {
    s.stop(
      didInstall
        ? "Ultracite skill installed."
        : "Couldn't install the Ultracite skill automatically."
    );
  }

  return didInstall;
};
