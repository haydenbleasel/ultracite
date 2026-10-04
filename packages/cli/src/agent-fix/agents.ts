import { UltraciteSetupError } from "../config-resolution";
import type { FixAgent } from "../linter-args";
import { spawnSync } from "../spawn-sync";

export interface AgentAdapter {
  /**
   * Arguments for a non-interactive run. The prompt is written to stdin, not
   * passed as an argument: it spans many lines, and on Windows an npm-installed
   * CLI is a `.cmd` shim run through cmd.exe, which cuts an argument at its
   * first newline.
   */
  args: readonly string[];
  command: string;
  id: FixAgent;
  installHint: string;
  label: string;
}

export const agentAdapters = {
  claude: {
    // -p with no prompt argument reads the prompt from stdin. acceptEdits
    // auto-approves file edits; the allowed-tools list keeps the agent to
    // reading and editing — Bash and network tools are denied.
    args: [
      "-p",
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
    // exec is non-interactive and reads the prompt from stdin for `-`; the
    // workspace-write sandbox lets the agent edit files without prompting.
    // (--full-auto was removed from recent Codex CLIs.) exec refuses to run
    // outside a git repository unless told otherwise, which failed every file
    // of a project that isn't one.
    args: [
      "exec",
      "--sandbox",
      "workspace-write",
      "--skip-git-repo-check",
      "-",
    ],
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
