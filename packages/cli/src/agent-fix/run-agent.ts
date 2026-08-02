import { spawn as nodeSpawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";

import type { AgentAdapter } from "./agents";

export const AGENT_TIMEOUT_MS = 5 * 60 * 1000;

const STDERR_CAP = 8192;

export interface AgentRunResult {
  ok: boolean;
  stderr: string;
  timedOut: boolean;
}

interface RunAgentOptions {
  cwd?: string;
  /** Injectable for tests — node:child_process cannot be module-mocked here. */
  spawnFn?: typeof nodeSpawn;
  timeoutMs?: number;
}

export const runAgent = async (
  adapter: AgentAdapter,
  prompt: string,
  {
    cwd = process.cwd(),
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

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
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
  }
};
