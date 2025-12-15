import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dlxCommand, type PackageManagerName } from "nypm";
import type { options } from "../consts/options";
import { HOOKS } from "../consts/rules";
import { exists } from "../utils";

const createCursorConfig = (command: string) => ({
  version: 1,
  hooks: {
    afterFileEdit: [{ command }],
  },
});

const createClaudeConfig = (command: string) => ({
  hooks: {
    PostToolUse: [
      {
        matcher: "Edit|Write",
        hooks: [
          {
            type: "command",
            command,
          },
        ],
      },
    ],
  },
});

const updateCursorConfig = async (
  configPath: string,
  command: string
): Promise<void> => {
  if (!(await exists(configPath))) {
    await writeFile(
      configPath,
      JSON.stringify(createCursorConfig(command), null, 2)
    );
    return;
  }

  const existingHooks = await readFile(configPath, "utf-8");
  const existingHooksJson = JSON.parse(existingHooks);

  const hasUltraciteHook = existingHooksJson.hooks.afterFileEdit.some(
    (hook: { command: string }) => hook.command.includes("ultracite")
  );

  if (!hasUltraciteHook) {
    existingHooksJson.hooks.afterFileEdit.push({ command });
    await writeFile(configPath, JSON.stringify(existingHooksJson, null, 2));
  }
};

const updateClaudeConfig = async (
  configPath: string,
  command: string
): Promise<void> => {
  if (!(await exists(configPath))) {
    await writeFile(
      configPath,
      JSON.stringify(createClaudeConfig(command), null, 2)
    );
    return;
  }

  const existingSettings = await readFile(configPath, "utf-8");
  const existingSettingsJson = JSON.parse(existingSettings);

  if (!existingSettingsJson.hooks) {
    existingSettingsJson.hooks = {};
  }
  if (!existingSettingsJson.hooks.PostToolUse) {
    existingSettingsJson.hooks.PostToolUse = [];
  }

  const hasUltraciteHook = existingSettingsJson.hooks.PostToolUse.some(
    (hookConfig: { matcher: string; hooks: Array<{ command: string }> }) =>
      hookConfig.hooks?.some((hook: { command: string }) =>
        hook.command.includes("ultracite")
      )
  );

  if (!hasUltraciteHook) {
    existingSettingsJson.hooks.PostToolUse.push({
      matcher: "Edit|Write",
      hooks: [{ type: "command", command }],
    });
    await writeFile(configPath, JSON.stringify(existingSettingsJson, null, 2));
  }
};

export const createHooks = (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName
) => {
  const config = HOOKS[name];
  const command = dlxCommand(packageManager, "ultracite", {
    args: ["fix"],
    short: packageManager === "npm",
  });

  const ensureDirectory = async () => {
    const dir = dirname(config.path);
    if (dir !== ".") {
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
          JSON.stringify(createCursorConfig(command), null, 2)
        );
      } else if (name === "claude") {
        await writeFile(
          config.path,
          JSON.stringify(createClaudeConfig(command), null, 2)
        );
      }
    },

    update: async () => {
      await ensureDirectory();

      if (name === "cursor") {
        await updateCursorConfig(config.path, command);
      } else if (name === "claude") {
        await updateClaudeConfig(config.path, command);
      }
    },
  };
};
