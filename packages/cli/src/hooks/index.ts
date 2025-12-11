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
      } else if (name === "claude") {
        await writeFile(
          config.path,
          JSON.stringify(
            {
              hooks: {
                PostToolUse: [
                  {
                    matcher: "Edit|Write",
                    hooks: [
                      {
                        type: "command",
                        command: config.command,
                      },
                    ],
                  },
                ],
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
          await writeFile(
            config.path,
            JSON.stringify(existingHooksJson, null, 2)
          );
        }
      } else if (name === "claude") {
        if (!(await exists(config.path))) {
          // If settings.json doesn't exist, create it
          await writeFile(
            config.path,
            JSON.stringify(
              {
                hooks: {
                  PostToolUse: [
                    {
                      matcher: "Edit|Write",
                      hooks: [
                        {
                          type: "command",
                          command: config.command,
                        },
                      ],
                    },
                  ],
                },
              },
              null,
              2
            )
          );
          return;
        }

        const existingSettings = await readFile(config.path, "utf-8");
        const existingSettingsJson = JSON.parse(existingSettings);

        // Initialize hooks structure if it doesn't exist
        if (!existingSettingsJson.hooks) {
          existingSettingsJson.hooks = {};
        }
        if (!existingSettingsJson.hooks.PostToolUse) {
          existingSettingsJson.hooks.PostToolUse = [];
        }

        // Check if ultracite hook already exists to avoid duplicates
        const hasUltraciteHook = existingSettingsJson.hooks.PostToolUse.some(
          (hookConfig: {
            matcher: string;
            hooks: Array<{ command: string }>;
          }) =>
            hookConfig.hooks?.some((hook: { command: string }) =>
              hook.command.includes("ultracite")
            )
        );

        if (!hasUltraciteHook) {
          existingSettingsJson.hooks.PostToolUse.push({
            matcher: "Edit|Write",
            hooks: [
              {
                type: "command",
                command: config.command,
              },
            ],
          });
          await writeFile(
            config.path,
            JSON.stringify(existingSettingsJson, null, 2)
          );
        }
      }
    },
  };
};
