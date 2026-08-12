import { isCancel, select, spinner } from "@clack/prompts";
import { dlxCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { spawnSync } from "./spawn-sync";

const ultraciteSkillRepo = "haydenbleasel/ultracite";
const ultraciteSkillName = "ultracite";

interface MaybeInstallUltraciteSkillOptions {
  packageManager: PackageManagerName;
  quiet?: boolean;
  shouldInstall?: boolean;
}

const buildUltraciteSkillInstallCommand = (
  packageManager: PackageManagerName
) =>
  dlxCommand(packageManager, "skills", {
    args: ["add", ultraciteSkillRepo],
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
    const installedSkills = JSON.parse(result.stdout) as {
      name?: string;
    }[];

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

  const fullCommand = buildUltraciteSkillInstallCommand(packageManager);
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
