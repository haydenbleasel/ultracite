// How each toolchain runs in an editor, read from the settings `ultracite init`
// writes (the CLI's own getVscodeConfig and getZedConfig), for the /editors
// pages.
import {
  getVscodeConfig,
  getZedConfig,
} from "../../../packages/cli/src/data/editors";
import { providers } from "../../../packages/cli/src/data/providers";
import type { ProviderId } from "../../../packages/cli/src/data/providers";

export interface ToolchainSettings {
  /** The VS Code extensions `init` installs, or what Zed needs. */
  extensions: string[];
  /** What formats TypeScript files. */
  formatter: string;
  /** The code actions that run when a file is saved. */
  onSave: string[];
  providerId: ProviderId;
  providerName: string;
}

/** The toolchains in the order the pages show them, the default first. */
export const toolchainOrder: ProviderId[] = [
  "oxlint",
  "biome",
  "bun",
  "eslint",
];

// Zed doesn't run VS Code extensions: the toolchain's language servers come
// from Zed extensions (Oxc: oxc-project/oxc-zed, Biome: biomejs/biome-zed,
// both in zed-industries/extensions) or ship with Zed (ESLint, Prettier),
// checked on 2026-10-10. Bun has no language server, so a Bun project uses
// the Oxc extension, which runs oxlint and oxfmt on the same configs.
export const zedNeeds: Record<ProviderId, string> = {
  biome: "Biome extension",
  bun: "Oxc extension",
  eslint: "Built in",
  oxlint: "Oxc extension",
};

const providerFor = (providerId: ProviderId) =>
  providers.find((candidate) => candidate.id === providerId);

/** What `init` sets up for each toolchain in VS Code and its forks. */
export const vscodeToolchains = (): ToolchainSettings[] =>
  toolchainOrder.flatMap((providerId) => {
    const provider = providerFor(providerId);

    if (!provider) {
      return [];
    }

    const settings = getVscodeConfig(providerId);

    const formatter =
      "[typescript]" in settings
        ? settings["[typescript]"]["editor.defaultFormatter"]
        : settings["editor.defaultFormatter"];

    return [
      {
        extensions: [
          provider.vscodeExtensionId,
          ...(formatter === provider.vscodeExtensionId ? [] : [formatter]),
        ],
        formatter,
        onSave:
          "editor.codeActionsOnSave" in settings
            ? Object.keys(settings["editor.codeActionsOnSave"])
            : [],
        providerId,
        providerName: provider.name,
      },
    ];
  });

// Zed's `formatter` setting is either a formatter's name or a
// { language_server } object naming one.
const zedFormatterName = (
  formatter: string | { language_server: { name: string } }
): string => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Zed's formatter setting is a name or a { language_server } object
  if (typeof formatter === "string") {
    return formatter === "prettier" ? "Prettier" : formatter;
  }

  return `${formatter.language_server.name} language server`;
};

/** What `init` sets up for each toolchain in Zed. */
export const zedToolchains = (): ToolchainSettings[] =>
  toolchainOrder.flatMap((providerId) => {
    const provider = providerFor(providerId);
    const settings = getZedConfig(providerId);

    if (!(provider && "languages" in settings)) {
      return [];
    }

    const { code_actions_on_format: onSave, formatter } =
      settings.languages.TypeScript;

    return [
      {
        extensions: [zedNeeds[providerId]],
        formatter: zedFormatterName(formatter),
        onSave: Object.keys(onSave),
        providerId,
        providerName: provider.name,
      },
    ];
  });
