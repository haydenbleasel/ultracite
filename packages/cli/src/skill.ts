import { isCancel, select, spinner } from "@clack/prompts";
import { dlxCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { runCommandSync } from "./run-command";

const ultraciteSkillRepo = "haydenbleasel/ultracite";

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

  const result = runCommandSync(command, args, {
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
