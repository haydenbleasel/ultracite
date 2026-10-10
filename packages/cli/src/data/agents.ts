import type { HooksConfig } from "./types";

/**
 * A settings file the agent needs before it loads AGENTS.md (Aider reads no
 * instructions file on its own; Gemini CLI reads only GEMINI.md by default).
 * init adds AGENTS.md to the list at `readKey`, keeping `defaultRead`, what
 * the agent loads while that key is unset, and with `lintKey` points that key
 * at the project's `ultracite fix`, which the agent runs on each file it edits.
 * YAML or JSON, by the file's extension.
 */
export interface AgentSettings {
  defaultRead?: string[];
  lintKey?: string[];
  path: string;
  readKey: string[];
}

/**
 * Every agent reads Ultracite's rules from AGENTS.md. The optional fields are
 * the extra step a few of them need to see those rules; the rest are an ID
 * and a name.
 */
export interface Agent {
  hooks?: HooksConfig;
  id: string;
  /**
   * Instructions files the agent reads instead of AGENTS.md when the project
   * has one. init adds an `@AGENTS.md` import to the first that exists.
   */
  imports?: string[];
  /**
   * Files earlier versions wrote the rules into. init takes Ultracite's block
   * out of them, and removes a file left with nothing else in it.
   */
  legacyRules?: string[];
  name: string;
  /** Another file that gets its own copy of the rules. */
  rulesCopy?: string;
  settings?: AgentSettings;
}

export const agents: Agent[] = [
  {
    // Claude Code reads AGENTS.md only when the project has no CLAUDE.md of
    // its own; a CLAUDE.md that imports AGENTS.md loads both.
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
    imports: ["CLAUDE.md", ".claude/CLAUDE.md"],
    legacyRules: [".claude/CLAUDE.md"],
    name: "Claude Code",
  },
  {
    id: "codex",
    name: "Codex",
  },
  {
    id: "jules",
    name: "Jules",
  },
  {
    // Replit Agent reads only replit.md, which it also writes itself, so it
    // gets its own copy of the rules.
    id: "replit",
    name: "Replit Agent",
    rulesCopy: "replit.md",
  },
  {
    id: "devin",
    name: "Devin",
  },
  {
    id: "lovable",
    name: "Lovable",
  },
  {
    id: "zencoder",
    name: "Zencoder",
  },
  {
    id: "ona",
    name: "Ona",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
  },
  {
    id: "snowflake-cortex",
    name: "Snowflake CoCo",
  },
  {
    id: "deepagents",
    name: "Deep Agents",
  },
  {
    id: "qoder",
    name: "Qoder",
  },
  {
    id: "kimi-cli",
    name: "Kimi Code CLI",
  },
  {
    id: "xum",
    name: "Xum",
  },
  {
    id: "pi",
    name: "Pi",
  },
  {
    id: "adal",
    name: "AdaL",
  },
  {
    hooks: {
      // The Copilot CLI and cloud agent read `.github/hooks/*.json` only in
      // this format (numeric `version`, camelCase events); VS Code maps it
      // onto its own. Neither applies matchers the same way, so `fix --hook`
      // itself skips tools that don't edit files.
      getContent: (command) => ({
        hooks: {
          postToolUse: [
            {
              command,
              type: "command",
            },
          ],
        },
        version: 1,
      }),
      getLegacyContent: (command) => ({
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
    id: "cline",
    name: "Cline",
  },
  {
    id: "amp",
    name: "Amp",
  },
  {
    // Aider loads only what .aider.conf.yml lists under `read`, and runs
    // `lint-cmd` on every file it edits, asking the model to fix what's left.
    id: "aider",
    legacyRules: ["ultracite.md"],
    name: "Aider",
    settings: {
      lintKey: ["lint-cmd"],
      path: ".aider.conf.yml",
      readKey: ["read"],
    },
  },
  {
    id: "open-hands",
    name: "OpenHands",
  },
  {
    // Gemini CLI reads GEMINI.md unless .gemini/settings.json names other
    // context files.
    id: "gemini",
    legacyRules: ["GEMINI.md"],
    name: "Gemini CLI",
    settings: {
      defaultRead: ["GEMINI.md"],
      path: ".gemini/settings.json",
      readKey: ["context", "fileName"],
    },
  },
  {
    id: "junie",
    name: "Junie",
  },
  {
    id: "augmentcode",
    name: "Augment Code",
  },
  {
    id: "bob",
    name: "IBM Bob",
  },
  {
    id: "kilo-code",
    name: "Kilo Code",
  },
  {
    id: "goose",
    name: "goose",
  },
  {
    id: "warp",
    name: "Warp",
  },
  {
    id: "droid",
    name: "Droid",
  },
  {
    id: "opencode",
    name: "OpenCode",
  },
  {
    id: "crush",
    name: "Crush",
  },
  {
    id: "qwen",
    name: "Qwen Code",
  },
  {
    id: "kiro-cli",
    name: "Kiro CLI",
  },
  {
    id: "firebender",
    legacyRules: [".firebender/rules/ultracite.mdc", "firebender.json"],
    name: "Firebender",
  },
  {
    id: "cursor-cli",
    name: "Cursor CLI",
  },
  {
    id: "mistral-vibe",
    name: "Mistral Vibe",
  },
  {
    id: "vercel",
    name: "Vercel Agent",
  },
];
