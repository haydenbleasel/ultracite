import { agents } from "@ultracite/data/agents";
import type { options } from "./options";

export interface EditorRuleConfig {
  path: string;
  header?: string;
  appendMode?: boolean;
}

export interface HookConfig {
  path: string;
}

// Build AGENTS record from shared data
export const AGENTS: Record<(typeof options.agents)[number], EditorRuleConfig> =
  Object.fromEntries(
    agents.map((agent) => [
      agent.id,
      {
        path: `./${agent.configPath}`,
        header: agent.config.header,
        appendMode: agent.config.appendMode,
      } satisfies EditorRuleConfig,
    ])
  ) as Record<(typeof options.agents)[number], EditorRuleConfig>;

export const HOOKS: Record<(typeof options.hooks)[number], HookConfig> = {
  cursor: {
    path: "./.cursor/hooks.json",
  },
  claude: {
    path: "./.claude/settings.json",
  },
} as const;
