import { readFile, writeFile } from "node:fs/promises";
import { agents } from "@repo/data/agents";
import type { options } from "@repo/data/options";
import { getRules } from "@repo/data/rules";
import { dlxCommand, type PackageManagerName } from "nypm";
import { ensureDirectory, exists } from "./utils";

export const createAgents = (
  name: (typeof options.agents)[number],
  packageManager: PackageManagerName
) => {
  const agent = agents.find((agent) => agent.id === name);

  if (!agent) {
    throw new Error(`Agent "${name}" not found`);
  }

  const dlx = dlxCommand(packageManager, "");
  const rules = getRules(dlx);
  const content = agent.config.header
    ? `${agent.config.header}\n\n${rules}`
    : rules;

  return {
    exists: () => exists(agent.config.path),

    create: async () => {
      await ensureDirectory(agent.config.path);
      await writeFile(agent.config.path, content);
    },

    update: async () => {
      await ensureDirectory(agent.config.path);
      const doesExist = await exists(agent.config.path);

      if (!(agent.config.appendMode && doesExist)) {
        await writeFile(agent.config.path, content);
        return;
      }

      const existingContents = await readFile(agent.config.path, "utf-8");

      // Check if rules are already present to avoid duplicates
      if (existingContents.includes(rules.trim())) {
        return;
      }

      await writeFile(agent.config.path, `${existingContents}\n\n${rules}`);
    },
  };
};
