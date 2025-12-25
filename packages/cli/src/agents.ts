import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { agents } from "@ultracite/data/agents";
import type { options } from "@ultracite/data/options";
import { getRules } from "@ultracite/data/rules";
import { dlxCommand, type PackageManagerName } from "nypm";
import { exists } from "./utils";

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

  const ensureDirectory = async () => {
    const dir = dirname(agent.config.path);
    // Only create directory if it's not the current directory
    if (dir !== ".") {
      // Remove leading './' if present for consistency with test expectations
      const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
      await mkdir(cleanDir, { recursive: true });
    }
  };

  return {
    exists: () => exists(agent.config.path),

    create: async () => {
      await ensureDirectory();
      await writeFile(agent.config.path, content);
    },

    update: async () => {
      await ensureDirectory();

      if (agent.config.appendMode) {
        if (!(await exists(agent.config.path))) {
          await writeFile(agent.config.path, content);
          return;
        }

        const existingContents = await readFile(agent.config.path, "utf-8");

        // Check if rules are already present to avoid duplicates
        if (existingContents.includes(rules.trim())) {
          return;
        }

        await writeFile(agent.config.path, `${existingContents}\n\n${rules}`);
      } else {
        await writeFile(agent.config.path, content);
      }
    },
  };
};
