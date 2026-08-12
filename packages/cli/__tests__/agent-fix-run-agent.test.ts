import { describe, expect, mock, test } from "bun:test";
import process from "node:process";

import type { execa } from "execa";

import type { AgentAdapter } from "../src/agent-fix/agents";
import { agentAdapters } from "../src/agent-fix/agents";
import { runAgent } from "../src/agent-fix/run-agent";

const STDERR_CAP = 8192;

/** Adapter that runs the current runtime binary instead of a real agent CLI. */
const scriptAdapter = (script: string): AgentAdapter => ({
  buildArgs: () => ["-e", script],
  command: process.execPath,
  id: "claude",
  installHint: "",
  label: "Test",
});

type ExecaFn = typeof execa;

const fakeExeca = (result: Record<string, unknown>) => {
  const execaMock = mock(() => Promise.resolve(result));
  return { execaFn: execaMock as unknown as ExecaFn, execaMock };
};

describe("runAgent", () => {
  test("resolves ok on exit code 0", async () => {
    const result = await runAgent(scriptAdapter("process.exit(0)"), "prompt");

    expect(result).toEqual({ ok: true, stderr: "", timedOut: false });
  });

  test("resolves not-ok with captured stderr on non-zero exit", async () => {
    const result = await runAgent(
      scriptAdapter("console.error('something broke'); process.exit(1)"),
      "prompt"
    );

    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("something broke");
    expect(result.timedOut).toBe(false);
  });

  test("resolves not-ok when spawning fails", async () => {
    const missing: AgentAdapter = {
      ...agentAdapters.claude,
      command: "definitely-not-a-real-agent-cli",
    };

    const result = await runAgent(missing, "prompt");

    expect(result.ok).toBe(false);
    expect(result.stderr).not.toBe("");
    expect(result.timedOut).toBe(false);
  });

  test("kills the agent and reports a timeout when the deadline passes", async () => {
    const result = await runAgent(
      scriptAdapter("setTimeout(() => {}, 60_000)"),
      "prompt",
      { timeoutMs: 100 }
    );

    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  test("passes the adapter command, prompt args, and kill options to execa", async () => {
    const { execaFn, execaMock } = fakeExeca({
      failed: false,
      stderr: "",
      timedOut: false,
    });

    const result = await runAgent(agentAdapters.claude, "prompt", {
      cwd: "/some/project",
      execaFn,
      killGraceMs: 1234,
      timeoutMs: 5678,
    });

    expect(result).toEqual({ ok: true, stderr: "", timedOut: false });

    const [call] = execaMock.mock.calls as unknown as [
      [string, string[], Record<string, unknown>],
    ];
    expect(call[0]).toBe("claude");
    expect(call[1]).toContain("-p");
    expect(call[1]).toContain("prompt");
    expect(call[2]).toMatchObject({
      cwd: "/some/project",
      forceKillAfterDelay: 1234,
      reject: false,
      timeout: 5678,
    });
  });

  test("caps captured stderr at the tail", async () => {
    const { execaFn } = fakeExeca({
      failed: true,
      stderr: `${"x".repeat(STDERR_CAP)}tail`,
      timedOut: false,
    });

    const result = await runAgent(agentAdapters.claude, "prompt", { execaFn });

    expect(result.ok).toBe(false);
    expect(result.stderr).toHaveLength(STDERR_CAP);
    expect(result.stderr.endsWith("tail")).toBe(true);
  });

  test("falls back to execa's failure summary when stderr is empty", async () => {
    const { execaFn } = fakeExeca({
      failed: true,
      shortMessage: "Command failed with ENOENT: claude",
      stderr: "",
      timedOut: false,
    });

    const result = await runAgent(agentAdapters.claude, "prompt", { execaFn });

    expect(result).toEqual({
      ok: false,
      stderr: "Command failed with ENOENT: claude",
      timedOut: false,
    });
  });
});
