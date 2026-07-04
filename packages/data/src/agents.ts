import { getRules } from "./rules";
import type { HooksConfig } from "./types";

export interface AgentConfig {
  appendMode?: boolean;
  header?: string;
  path: string;
}

export interface Agent {
  config: AgentConfig;
  hooks?: HooksConfig;
  id: string;
  name: string;
}

export interface AgentSetupFacts {
  configPath: string;
  hasHeader: boolean;
  hookPath?: string;
  hookSupport: boolean;
  writeMode: "append" | "replace";
}

const defaultRulesRunner = "npx";
const defaultRulesProviderName = "Biome";
const defaultHookPackageManager = "npm";
const defaultHookLinter = "biome";

const runPackageScript = (
  packageManager: string,
  script: string,
  args: string[] = []
) => {
  const parts = [packageManager];

  if (packageManager === "npm") {
    parts.push("run");
  }

  parts.push(script);

  if (args.length > 0) {
    if (packageManager === "npm") {
      parts.push("--");
    }

    parts.push(...args);
  }

  return parts.join(" ");
};

export const getDefaultAgentHookCommand = () => {
  const args =
    defaultHookLinter === "biome" ? ["--skip=correctness/noUnusedImports"] : [];

  return runPackageScript(defaultHookPackageManager, "fix", args);
};

export const getDefaultAgentRulesContent = (agent: Agent) => {
  const rules = getRules(defaultRulesRunner, defaultRulesProviderName);

  return agent.config.header ? `${agent.config.header}\n\n${rules}` : rules;
};

export const getDefaultAgentHookContent = (agent: Agent) => {
  if (!agent.hooks) {
    return null;
  }

  return JSON.stringify(
    agent.hooks.getContent(getDefaultAgentHookCommand()),
    null,
    2
  );
};

export const getAgentSetupFacts = (agent: Agent): AgentSetupFacts => ({
  configPath: agent.config.path,
  hasHeader: Boolean(agent.config.header),
  hookPath: agent.hooks?.path,
  hookSupport: Boolean(agent.hooks),
  writeMode: agent.config.appendMode ? "append" : "replace",
});

export const agents: Agent[] = [
  {
    config: {
      appendMode: true,
      path: ".claude/CLAUDE.md",
    },
    hooks: {
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  command,
                  type: "command",
                },
              ],
              matcher: "Write|Edit",
            },
          ],
        },
      }),
      path: ".claude/settings.json",
    },
    id: "claude",
    name: "Claude Code",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "codex",
    name: "Codex",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "jules",
    name: "Jules",
  },
  {
    config: {
      appendMode: true,
      path: "replit.md",
    },
    id: "replit",
    name: "Replit Agent",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "devin",
    name: "Devin",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "lovable",
    name: "Lovable",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "zencoder",
    name: "Zencoder",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "ona",
    name: "Ona",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "openclaw",
    name: "OpenClaw",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "continue",
    name: "Continue",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "snowflake-cortex",
    name: "Snowflake Cortex",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "deepagents",
    name: "Deepagents",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "qoder",
    name: "Qoder",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "kimi-cli",
    name: "Kimi CLI",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "mcpjam",
    name: "MCPJam",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "mux",
    name: "Mux",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "pi",
    name: "Pi",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "adal",
    name: "AdaL",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    hooks: {
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              command,
              type: "command",
            },
          ],
        },
      }),
      path: ".github/hooks/ultracite.json",
    },
    id: "copilot",
    name: "GitHub Copilot",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "cline",
    name: "Cline",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "amp",
    name: "AMP",
  },
  {
    config: {
      path: "ultracite.md",
    },
    id: "aider",
    name: "Aider",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "firebase-studio",
    name: "Firebase Studio",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "open-hands",
    name: "OpenHands",
  },
  {
    config: {
      appendMode: true,
      path: "GEMINI.md",
    },
    id: "gemini",
    name: "Gemini",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "junie",
    name: "Junie",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "augmentcode",
    name: "Augment Code",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "bob",
    name: "IBM Bob",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "kilo-code",
    name: "Kilo Code",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "goose",
    name: "Goose",
  },
  {
    config: {
      appendMode: true,
      path: ".roo/rules/ultracite.md",
    },
    id: "roo-code",
    name: "Roo Code",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "warp",
    name: "Warp",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "droid",
    name: "Droid",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "opencode",
    name: "OpenCode",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "crush",
    name: "Crush",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "qwen",
    name: "Qwen Code",
  },
  {
    config: {
      appendMode: true,
      path: ".amazonq/rules/ultracite.md",
    },
    id: "amazon-q-cli",
    name: "Amazon Q CLI",
  },
  {
    config: {
      path: "firebender.json",
    },
    id: "firebender",
    name: "Firebender",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "cursor-cli",
    name: "Cursor CLI",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "mistral-vibe",
    name: "Mistral Vibe",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    id: "vercel",
    name: "Vercel Agent",
  },
];
