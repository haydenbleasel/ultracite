import { agents } from "@ultracite/data/agents";
import type { options } from "@ultracite/data/options";

export interface EditorRuleConfig {
  path: string;
  header?: string;
  appendMode?: boolean;
}

// Build AGENTS record from shared data
export const AGENTS: Record<(typeof options.agents)[number], EditorRuleConfig> =
  Object.fromEntries(
    agents.map((agent) => [
      agent.id,
      {
        path: `./${agent.config.path}`,
        header: agent.config.header,
        appendMode: agent.config.appendMode,
      } satisfies EditorRuleConfig,
    ])
  ) as Record<(typeof options.agents)[number], EditorRuleConfig>;
