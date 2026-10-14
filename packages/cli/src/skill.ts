import { spinner } from "@clack/prompts";
import { dlxCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { spawnSync } from "./spawn-sync";
import { exists } from "./utils";

const ultraciteSkillRepo = "haydenbleasel/ultracite";
const ultraciteSkillName = "ultracite";

interface InstallUltraciteSkillOptions {
  /** The agents chosen in `init --agents`, by CLI id. */
  agents?: readonly string[];
  packageManager: PackageManagerName;
  quiet?: boolean;
}

// skills agents that read skills from their own project directory rather
// than the shared `.agents/skills`, keyed by that directory. init has written
// some of these by the time the skill is installed (`.claude`, `.codebuddy`),
// so the list follows the user's choices. Devin Desktop and Devin Local also
// read `.agents/skills`, so the `.devin` folder init writes for Devin's hook
// needs no entry; `.windsurf` is for projects set up before Windsurf became
// Devin Desktop.
const projectAgentDirectories = new Map([
  [".adal", "adal"],
  [".augment", "augment"],
  [".bob", "bob"],
  [".claude", "claude-code"],
  [".codebuddy", "codebuddy"],
  [".crush", "crush"],
  [".goose", "goose"],
  [".junie", "junie"],
  [".kiro", "kiro-cli"],
  [".openhands", "openhands"],
  [".qoder", "qoder"],
  [".qwen", "qwen-code"],
  [".trae", "trae"],
  [".windsurf", "windsurf"],
]);

// init agents that read skills only from their own directory, never from
// `.agents/skills`, by CLI id and skills agent. They get the skill when chosen,
// even in a project that doesn't have their directory yet.
const ownDirectoryAgents = new Map([
  ["adal", "adal"],
  ["bob", "bob"],
  ["qoder", "qoder"],
]);

/**
 * The skills agents to install to: `universal` (`.agents/skills`, read by
 * Codex, Cursor, GitHub Copilot, Gemini CLI, Amp, Cline, OpenCode and more),
 * each agent above whose directory the project has, and each chosen agent
 * that only reads its own directory. Naming them keeps `skills add --yes` from
 * falling back to "all agents" when it detects none, which also wrote a
 * `.claude/skills` link and a second copy under a top-level `agent/`
 * directory (for the Eve framework).
 */
const skillAgents = (chosenAgents: readonly string[] = []): string[] => [
  ...new Set([
    "universal",
    ...[...projectAgentDirectories].flatMap(([directory, agent]) =>
      exists(directory) ? [agent] : []
    ),
    ...chosenAgents.flatMap((id) => {
      const agent = ownDirectoryAgents.get(id);

      return agent ? [agent] : [];
    }),
  ]),
];

// `skills add` asks which agents to install to and where, which it can only
// do on a terminal. init runs it with piped stdio, so without `--yes` it
// either exits 1 ("Interactive prompt required") or cancels the prompt and
// exits 0 with nothing installed — which init reported as installed. With
// `--yes` and explicit agents it installs into the project without asking.
const buildUltraciteSkillInstallCommand = (
  packageManager: PackageManagerName,
  nonInteractive = false,
  chosenAgents: readonly string[] = []
) =>
  dlxCommand(packageManager, "skills", {
    args: nonInteractive
      ? [
          "add",
          ultraciteSkillRepo,
          "--yes",
          "--agent",
          ...skillAgents(chosenAgents),
        ]
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

/** Whether the skill is installed in the project or globally. */
export const hasUltraciteSkillInstalled = (
  packageManager: PackageManagerName
): boolean =>
  isUltraciteSkillInstalledInScope(packageManager) ||
  isUltraciteSkillInstalledInScope(packageManager, true);

export const getUltraciteSkillInstallCommand = (
  packageManager: PackageManagerName
) => buildUltraciteSkillInstallCommand(packageManager);

/**
 * Install the skill for the agents the project uses. init asks whether to
 * with its other questions and installs it last, once it has written the
 * agent directories the install looks for.
 */
export const installUltraciteSkill = ({
  agents = [],
  packageManager,
  quiet = false,
}: InstallUltraciteSkillOptions): boolean => {
  const fullCommand = buildUltraciteSkillInstallCommand(
    packageManager,
    true,
    agents
  );

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
