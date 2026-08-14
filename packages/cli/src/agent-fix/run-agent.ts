import process from "node:process";

import { execa } from "execa";

import type { AgentAdapter } from "./agents";

export const AGENT_TIMEOUT_MS = 5 * 60 * 1000;

// Grace period after SIGTERM before escalating to SIGKILL — an agent CLI that
// traps or ignores SIGTERM would otherwise hang the run forever.
export const KILL_GRACE_MS = 10 * 1000;

const STDERR_CAP = 8192;

export interface AgentRunResult {
  ok: boolean;
  stderr: string;
  timedOut: boolean;
}

interface RunAgentOptions {
  cwd?: string;
  /** Injectable for tests — the real execa spawns actual processes. */
  execaFn?: typeof execa;
  killGraceMs?: number;
  timeoutMs?: number;
}

export const runAgent = async (
  adapter: AgentAdapter,
  prompt: string,
  {
    cwd = process.cwd(),
    execaFn = execa,
    killGraceMs = KILL_GRACE_MS,
    timeoutMs = AGENT_TIMEOUT_MS,
  }: RunAgentOptions = {}
): Promise<AgentRunResult> => {
  // reject: false — a failed run (non-zero exit, timeout, missing CLI) is an
  // expected outcome reported through the result, not an exception.
  const result = await execaFn(adapter.command, adapter.buildArgs(prompt), {
    cwd,
    forceKillAfterDelay: killGraceMs,
    reject: false,
    stderr: "pipe",
    stdin: "ignore",
    // stdout must be discarded or the child stalls once the pipe buffer fills.
    stdout: "ignore",
    timeout: timeoutMs,
  });

  // No stderr usually means the process never ran (e.g. the CLI is missing) —
  // surface execa's failure summary instead.
  const failureSummary = (result.failed && result.shortMessage) || "";
  const stderrText = result.stderr || failureSummary;

  return {
    ok: !result.failed,
    stderr: stderrText.slice(-STDERR_CAP),
    timedOut: result.timedOut === true,
  };
};
