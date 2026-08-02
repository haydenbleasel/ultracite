import { describe, expect, mock, test } from "bun:test";

import { agentAdapters } from "../src/agent-fix/agents";
import { runAgent } from "../src/agent-fix/run-agent";

type Listener = (...args: unknown[]) => void;

/**
 * Minimal EventEmitter-shaped fake (on/once/emit/removeListener) — enough for
 * runAgent's listeners and node:events `once()` to work against. removeListener
 * replaces the handler array rather than mutating it, so emit's iteration over
 * a previously fetched array stays safe when a once-wrapper removes itself.
 */
const createEmitter = () => {
  const handlers = new Map<string, Listener[]>();

  const emitter = {
    emit: (event: string, ...args: unknown[]): void => {
      for (const handler of handlers.get(event) ?? []) {
        handler(...args);
      }
    },
    on: (event: string, listener: Listener): void => {
      handlers.set(event, [...(handlers.get(event) ?? []), listener]);
    },
    once: (event: string, listener: Listener): void => {
      const wrapper: Listener & { listener?: Listener } = (...args) => {
        emitter.removeListener(event, wrapper);
        listener(...args);
      };
      wrapper.listener = listener;
      emitter.on(event, wrapper);
    },
    removeListener: (event: string, listener: Listener): void => {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter(
          (handler) =>
            handler !== listener &&
            (handler as { listener?: Listener }).listener !== listener
        )
      );
    },
  };

  return emitter;
};

const createFakeChild = () => {
  const child = {
    ...createEmitter(),
    kill: (signal?: string): void => {
      child.killedWith = signal ?? "SIGTERM";
      setTimeout(() => child.emit("close", null), 0);
    },
    killedWith: null as string | null,
    stderr: createEmitter(),
    stdout: { resume: (): void => undefined },
  };

  return child;
};

type FakeChild = ReturnType<typeof createFakeChild>;

type SpawnFn = NonNullable<Parameters<typeof runAgent>[2]>["spawnFn"];

const fakeSpawn = (child: FakeChild) => {
  const spawnFn = mock(() => child);
  return { spawnFn: spawnFn as unknown as SpawnFn, spawnMock: spawnFn };
};

describe("runAgent", () => {
  test("resolves ok on exit code 0", async () => {
    const child = createFakeChild();
    const { spawnFn, spawnMock } = fakeSpawn(child);

    const resultPromise = runAgent(agentAdapters.claude, "prompt", { spawnFn });
    child.emit("close", 0);

    expect(await resultPromise).toEqual({
      ok: true,
      stderr: "",
      timedOut: false,
    });

    const [call] = spawnMock.mock.calls as unknown as [
      [string, string[], Record<string, unknown>],
    ];
    expect(call[0]).toBe("claude");
    expect(call[1]).toContain("-p");
    expect(call[2]).toMatchObject({ shell: false });
  });

  test("resolves not-ok with captured stderr on non-zero exit", async () => {
    const child = createFakeChild();
    const { spawnFn } = fakeSpawn(child);

    const resultPromise = runAgent(agentAdapters.codex, "prompt", { spawnFn });
    child.stderr.emit("data", "something broke");
    child.emit("close", 1);

    expect(await resultPromise).toEqual({
      ok: false,
      stderr: "something broke",
      timedOut: false,
    });
  });

  test("resolves not-ok when spawning fails", async () => {
    const child = createFakeChild();
    const { spawnFn } = fakeSpawn(child);

    const resultPromise = runAgent(agentAdapters.claude, "prompt", { spawnFn });
    child.emit("error", new Error("spawn claude ENOENT"));

    expect(await resultPromise).toEqual({
      ok: false,
      stderr: "spawn claude ENOENT",
      timedOut: false,
    });
  });

  test("kills the agent and reports a timeout when the deadline passes", async () => {
    const child = createFakeChild();
    const { spawnFn } = fakeSpawn(child);

    const result = await runAgent(agentAdapters.claude, "prompt", {
      spawnFn,
      timeoutMs: 5,
    });

    expect(child.killedWith).toBe("SIGTERM");
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});
