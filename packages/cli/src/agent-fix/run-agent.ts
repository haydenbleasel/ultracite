import { spawn as nodeSpawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";

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
  killGraceMs?: number;
  /** Injectable for tests — node:child_process cannot be module-mocked here. */
  spawnFn?: typeof nodeSpawn;
  timeoutMs?: number;
}

export const runAgent = async (
  adapter: AgentAdapter,
  prompt: string,
  {
    cwd = process.cwd(),
    killGraceMs = KILL_GRACE_MS,
    spawnFn = nodeSpawn,
    timeoutMs = AGENT_TIMEOUT_MS,
  }: RunAgentOptions = {}
): Promise<AgentRunResult> => {
  const child = spawnFn(adapter.command, adapter.buildArgs(prompt), {
    cwd,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  let timedOut = false;

  // stdout must be drained or the child stalls once the pipe buffer fills.
  child.stdout?.resume();
  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderr = (stderr + String(chunk)).slice(-STDERR_CAP);
  });

  let killTimer: ReturnType<typeof setTimeout> | null = null;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    killTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, killGraceMs);
  }, timeoutMs);

  try {
    // once() rejects if the child emits "error" (e.g. the CLI is missing).
    const [code] = (await once(child, "close")) as [number | null];
    return { ok: !timedOut && code === 0, stderr, timedOut };
  } catch (error) {
    return {
      ok: false,
      stderr: error instanceof Error ? error.message : String(error),
      timedOut,
    };
  } finally {
    clearTimeout(timer);
    if (killTimer) {
      clearTimeout(killTimer);
    }
  }
};
