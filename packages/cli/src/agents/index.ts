import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { options } from "../consts/options";
import { AGENTS } from "../consts/rules";
import { exists } from "../utils";
import {
  angular,
  core,
  next,
  qwik,
  react,
  remix,
  solid,
  svelte,
  vue,
} from "./rules";

const generateRulesFile = (
  frameworks?: (typeof options.frameworks)[number][]
): string => {
  const rules = [...core];

  if (frameworks) {
    if (frameworks.includes("react")) {
      rules.push(...react);
    }
    if (frameworks.includes("next")) {
      rules.push(...next);
    }
    if (frameworks.includes("qwik")) {
      rules.push(...qwik);
    }
    if (frameworks.includes("solid")) {
      rules.push(...solid);
    }
    if (frameworks.includes("svelte")) {
      rules.push(...svelte);
    }
    if (frameworks.includes("vue")) {
      rules.push(...vue);
    }
    if (frameworks.includes("angular")) {
      rules.push(...angular);
    }
    if (frameworks.includes("remix")) {
      rules.push(...remix);
    }
  }

  return rules.join("\n");
};

export const createAgents = (
  name: (typeof options.agents)[number],
  frameworks?: (typeof options.frameworks)[number][]
) => {
  const config = AGENTS[name];
  const rulesFile = generateRulesFile(frameworks);
  const content = config.header
    ? `${config.header}\n\n${rulesFile}`
    : rulesFile;

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
        if (existingContents.includes(rulesFile.trim())) {
          return;
        }

        await writeFile(config.path, `${existingContents}\n\n${rulesFile}`);
      } else {
        await writeFile(config.path, content);
      }
    },
  };
};
