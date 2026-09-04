import { UltraciteSetupError } from "../config-resolution";
import type { FixAgent } from "../linter-args";
import { spawnSync } from "../spawn-sync";

export interface AgentAdapter {
  buildArgs: (prompt: string) => string[];
  command: string;
  id: FixAgent;
  installHint: string;
  label: string;
}

export const agentAdapters = {
  claude: {
    // acceptEdits auto-approves file edits; the allowed-tools list keeps the
    // agent to reading and editing — Bash and network tools are denied.
    buildArgs: (prompt) => [
      "-p",
      prompt,
      "--permission-mode",
      "acceptEdits",
      "--allowedTools",
      "Read,Edit,Write,Grep,Glob",
    ],
    command: "claude",
    id: "claude",
    installHint: "npm install -g @anthropic-ai/claude-code",
    label: "Claude Code",
  },
  codex: {
    // exec is non-interactive; the workspace-write sandbox lets the agent edit
    // files without prompting. (--full-auto was removed from recent Codex CLIs.)
    buildArgs: (prompt) => ["exec", "--sandbox", "workspace-write", prompt],
    command: "codex",
    id: "codex",
    installHint: "npm install -g @openai/codex",
    label: "Codex",
  },
} satisfies Record<FixAgent, AgentAdapter>;

export const assertAgentAvailable = (adapter: AgentAdapter): void => {
  const result = spawnSync(adapter.command, ["--version"]);

  // A clean exit is enough — some CLIs print the version to stderr. A missing
  // binary surfaces as a spawn error with a null status, not an exit code.
  if (result.status === 0) {
    return;
  }

  throw new UltraciteSetupError(
    `The ${adapter.label} CLI (\`${adapter.command}\`) is not installed or not on your PATH. Install it with \`${adapter.installHint}\` and try again.`
  );
};
