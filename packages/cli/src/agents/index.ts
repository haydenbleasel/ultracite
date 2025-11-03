import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { options } from "../consts/options";
import { AGENTS } from "../consts/rules";
import { exists } from "../utils";
import {
  angular,
  astro,
  core,
  next,
  qwik,
  react,
  remix,
  solid,
  svelte,
  vue,
} from "./rules";

const generateAgentsContext = (
  frameworks?: (typeof options.frameworks)[number][]
) => {
  const context = [...core];

  if (frameworks) {
    if (frameworks.includes("react")) {
      context.push(...react);
    }
    if (frameworks.includes("next")) {
      context.push(...next);
    }
    if (frameworks.includes("qwik")) {
      context.push(...qwik);
    }
    if (frameworks.includes("solid")) {
      context.push(...solid);
    }
    if (frameworks.includes("svelte")) {
      context.push(...svelte);
    }
    if (frameworks.includes("vue")) {
      context.push(...vue);
    }
    if (frameworks.includes("angular")) {
      context.push(...angular);
    }
    if (frameworks.includes("remix")) {
      context.push(...remix);
    }
    if (frameworks.includes("astro")) {
      context.push(...astro);
    }
  }

  return context.join("\n");
};

export const createAgents = (
  name: (typeof options.agents)[number],
  frameworks?: (typeof options.frameworks)[number][]
) => {
  const config = AGENTS[name];
  const rulesFile = generateAgentsContext(frameworks);
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

      if (name === "cursor") {
        await writeFile(
          "./.cursor/hooks.json",
          JSON.stringify(
            {
              version: 1,
              hooks: {
                afterFileEdit: [{ command: "npx ultracite fix" }],
              },
            },
            null,
            2
          )
        );
      }
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

      if (name === "cursor") {
        const existingHooks = await readFile("./.cursor/hooks.json", "utf-8");
        const existingHooksJson = JSON.parse(existingHooks);

        // Check if ultracite hook already exists to avoid duplicates
        const hasUltraciteHook = existingHooksJson.hooks.afterFileEdit.some(
          (hook: { command: string }) => hook.command.includes("ultracite")
        );

        if (!hasUltraciteHook) {
          existingHooksJson.hooks.afterFileEdit.push({
            command: "npx ultracite fix",
          });
          await writeFile(
            "./.cursor/hooks.json",
            JSON.stringify(existingHooksJson, null, 2)
          );
        }
      }
    },
  };
};
