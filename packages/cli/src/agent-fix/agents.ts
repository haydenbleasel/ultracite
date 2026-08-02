import { UltraciteSetupError } from "../config-resolution";
import type { FixAgent } from "../linter-args";
import { runCommandSync } from "../run-command";

export interface AgentAdapter {
  buildArgs: (prompt: string) => string[];
  command: string;
  id: FixAgent;
  installHint: string;
  label: string;
}

export const agentAdapters: Record<FixAgent, AgentAdapter> = {
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
    // --full-auto runs non-interactively in the workspace-write sandbox.
    buildArgs: (prompt) => ["exec", "--full-auto", prompt],
    command: "codex",
    id: "codex",
    installHint: "npm install -g @openai/codex",
    label: "Codex",
  },
};

export const assertAgentAvailable = (adapter: AgentAdapter): void => {
  const result = runCommandSync(adapter.command, ["--version"], {
    encoding: "utf-8",
  });

  if (result.status === 0 && result.stdout) {
    return;
  }

  throw new UltraciteSetupError(
    `The ${adapter.label} CLI (\`${adapter.command}\`) is not installed or not on your PATH. Install it with \`${adapter.installHint}\` and try again.`
  );
};
