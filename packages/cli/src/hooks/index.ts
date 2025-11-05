import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { options } from "../consts/options";
import { HOOKS } from "../consts/rules";
import { exists } from "../utils";

export const createHooks = (name: (typeof options.hooks)[number]) => {
  const config = HOOKS[name];

  const ensureDirectory = async () => {
    const dir = dirname(config.path);
    // Only create directory if it's not the current directory
    if (dir !== ".") {
      // Remove leading './' if present for consistency
      const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
      await mkdir(cleanDir, { recursive: true });
    }
  };

  return {
    exists: () => exists(config.path),

    create: async () => {
      await ensureDirectory();

      if (name === "cursor") {
        await writeFile(
          config.path,
          JSON.stringify(
            {
              version: 1,
              hooks: {
                afterFileEdit: [{ command: config.command }],
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

      if (name === "cursor") {
        if (!(await exists(config.path))) {
          // If hooks.json doesn't exist, create it
          await writeFile(
            config.path,
            JSON.stringify(
              {
                version: 1,
                hooks: {
                  afterFileEdit: [{ command: config.command }],
                },
              },
              null,
              2
            )
          );
          return;
        }

        const existingHooks = await readFile(config.path, "utf-8");
        const existingHooksJson = JSON.parse(existingHooks);

        // Check if ultracite hook already exists to avoid duplicates
        const hasUltraciteHook = existingHooksJson.hooks.afterFileEdit.some(
          (hook: { command: string }) => hook.command.includes("ultracite")
        );

        if (!hasUltraciteHook) {
          existingHooksJson.hooks.afterFileEdit.push({
            command: config.command,
          });
          await writeFile(config.path, JSON.stringify(existingHooksJson, null, 2));
        }
      }
    },
  };
};
