import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dlxCommand, type PackageManagerName } from "nypm";
import type { options } from "../consts/options";
import { AGENTS } from "../consts/rules";
import { exists } from "../utils";
import { getRules } from "./rules";

export const createAgents = (
  name: (typeof options.agents)[number],
  packageManager: PackageManagerName
) => {
  const config = AGENTS[name];
  const dlx = dlxCommand(packageManager, "");
  const rules = getRules(dlx);
  const content = config.header ? `${config.header}\n\n${rules}` : rules;

  const ensureDirectory = async () => {
    const dir = dirname(config.path);
    // Only create directory if it's not the current directory
    if (dir !== ".") {
      // Remove leading './' if present for consistency with test expectations
      const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
      await mkdir(cleanDir, { recursive: true });
    }
  };

  return {
    exists: () => exists(config.path),

    create: async () => {
      await ensureDirectory();
      await writeFile(config.path, content);
    },

    update: async () => {
      await ensureDirectory();

      if (config.appendMode) {
        if (!(await exists(config.path))) {
          await writeFile(config.path, content);
          return;
        }

        const existingContents = await readFile(config.path, "utf-8");

        // Check if rules are already present to avoid duplicates
        if (existingContents.includes(rules.trim())) {
          return;
        }

        await writeFile(config.path, `${existingContents}\n\n${rules}`);
      } else {
        await writeFile(config.path, content);
      }
    },
  };
};
