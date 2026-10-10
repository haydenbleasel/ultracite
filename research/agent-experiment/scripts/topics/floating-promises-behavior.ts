// Behavior oracle for the floating-promises subjects. Imports the pristine reference and an
// agent-modified copy and runs both through the same scenarios on a virtual clock.
//
// Usage: bun scripts/topics/floating-promises-behavior.ts <fp1|fp2> <referenceFile> <candidateFile>
// Prints one JSON object: { ok, subject, happyPath, errorPath, importError?, exportMissing? }
//
// - Happy path: many seeded-random scenarios where no task or destination fails. The
//   candidate must give every caller the same result, make the same calls, and (strict mode)
//   do it at the same virtual times.
// - Error path: fixed scenarios where a task or destination fails. Each module's outcome is
//   recorded (did the caller's promise reject, stay pending, or resolve; was there an unhandled
//   rejection; were later tasks or other destinations still served) and summarised as a
//   verdict. The reference's own outcome is reported alongside.
//
// Timers (setTimeout, setInterval, setImmediate) are replaced by a virtual clock before either
// module is imported, so a hang shows up as "still pending when the clock's budget ran out"
// rather than a stuck process. Unhandled rejections are captured with
// process.on("unhandledRejection") and attributed to the scenario that was running. Only
// scratch files are executed: the two subject copies.

type Fn = (...args: unknown[]) => unknown;

const [subject, referencePath, candidatePath] = process.argv.slice(2);
const SEED = 20_261_010;

const realSetImmediate = globalThis.setImmediate;
const realConsole = { ...console };

// mulberry32: small seeded PRNG so every run sees the same inputs.
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

// ------------------------------------------------------------------ virtual clock

interface Timer {
  args: unknown[];
  at: number;
  fn: Fn;
  id: number;
  repeat: number | null;
  seq: number;
}

const TIMEOUT_MAX = 2_147_483_647;

class VirtualClock {
  now = 0;
  firings = 0;
  private seq = 0;
  private readonly timers = new Map<number, Timer>();

  add(
    fn: unknown,
    ms: unknown,
    args: unknown[],
    kind: "timeout" | "interval" | "immediate"
  ) {
    if (typeof fn !== "function") {
      throw new TypeError(
        `The "callback" argument must be of type function. Received ${typeof fn}`
      );
    }
    // Node's rule: anything that isn't a number in [1, TIMEOUT_MAX] becomes 1 ms.
    let delay = kind === "immediate" ? 0 : Number(ms);
    if (kind !== "immediate" && !(delay >= 1 && delay <= TIMEOUT_MAX)) {
      delay = 1;
    }
    this.seq += 1;
    const id = this.seq;
    this.timers.set(id, {
      args,
      at: this.now + delay,
      fn: fn as Fn,
      id,
      repeat: kind === "interval" ? delay : null,
      seq: id,
    });
    return {
      id,
      hasRef: () => true,
      ref() {
        return this;
      },
      refresh() {
        return this;
      },
      unref() {
        return this;
      },
      [Symbol.toPrimitive]: () => id,
    };
  }

  clear(handle: unknown) {
    const id =
      typeof handle === "object" && handle !== null
        ? (handle as { id: number }).id
        : Number(handle);
    this.timers.delete(id);
  }

  next(): Timer | null {
    let best: Timer | null = null;
    for (const t of this.timers.values()) {
      if (!best || t.at < best.at || (t.at === best.at && t.seq < best.seq)) {
        best = t;
      }
    }
    return best;
  }

  fire(t: Timer, onThrow: (e: unknown) => void) {
    this.now = t.at;
    this.firings += 1;
    if (t.repeat === null) {
      this.timers.delete(t.id);
    } else {
      this.seq += 1;
      t.at += t.repeat;
      t.seq = this.seq;
    }
    try {
      t.fn(...t.args);
    } catch (error) {
      // In Node, a throw inside a timer callback is an uncaught exception.
      onThrow(error);
    }
  }
}

let clock = new VirtualClock();
const g = globalThis as unknown as Record<string, unknown>;
// Trampolines, installed before the subjects are imported, so even a module that captures
// `setTimeout` at load time uses whichever clock the current scenario owns.
g.setTimeout = (fn: unknown, ms?: unknown, ...args: unknown[]) =>
  clock.add(fn, ms, args, "timeout");
g.setInterval = (fn: unknown, ms?: unknown, ...args: unknown[]) =>
  clock.add(fn, ms, args, "interval");
g.setImmediate = (fn: unknown, ...args: unknown[]) =>
  clock.add(fn, 0, args, "immediate");
g.clearTimeout = (h: unknown) => clock.clear(h);
g.clearInterval = (h: unknown) => clock.clear(h);
g.clearImmediate = (h: unknown) => clock.clear(h);

// One real macrotask: every pending microtask (and promise chain) runs first, and the runtime
// reports any rejection left unhandled.
const tick = () => new Promise<void>((r) => realSetImmediate(r));

// ------------------------------------------------------------------ side channels

interface Sink {
  logs: string[];
  uncaught: string[];
  unhandled: string[];
  unhandledReasons: unknown[];
}
const newSink = (): Sink => ({
  logs: [],
  uncaught: [],
  unhandled: [],
  unhandledReasons: [],
});
let sink: Sink | null = null;
const orphans = newSink();

const describe = (e: unknown): string => {
  if (e instanceof Error) {
    return `${e.name}: ${e.message}`;
  }
  try {
    return `non-error ${JSON.stringify(e)}`;
  } catch {
    return `non-error ${String(e)}`;
  }
};

process.on("unhandledRejection", (reason) => {
  const s = sink ?? orphans;
  s.unhandled.push(describe(reason));
  s.unhandledReasons.push(reason);
});
process.on("uncaughtException", (error) => {
  (sink ?? orphans).uncaught.push(describe(error));
});

const LOG_METHODS = ["log", "info", "warn", "error", "debug", "trace"] as const;
const captureConsole = () => {
  for (const m of LOG_METHODS) {
    (console as unknown as Record<string, Fn>)[m] = (...args: unknown[]) => {
      sink?.logs.push(`${m}: ${args.map((a) => describe(a)).join(" ")}`);
    };
  }
};
const restoreConsole = () => {
  for (const m of LOG_METHODS) {
    (console as unknown as Record<string, unknown>)[m] = realConsole[m];
  }
};

/**
 * Runs the virtual clock until `isDone()`, the queue is empty ("idle"), or the budget is spent
 * ("budget": something is still scheduling timers, e.g. a retry loop that never gets a slot).
 */
async function drive(
  isDone: () => boolean,
  maxTime: number,
  maxFirings: number
) {
  await tick();
  for (;;) {
    if (isDone()) {
      return "done";
    }
    const t = clock.next();
    if (!t) {
      return "idle";
    }
    if (t.at > maxTime || clock.firings >= maxFirings) {
      return "budget";
    }
    clock.fire(t, (e) => sink?.uncaught.push(describe(e)));
    await tick();
  }
}

/** Starts a fresh clock and sink, runs `body`, then collects stragglers. */
async function inScenario<T>(
  body: (s: Sink) => Promise<T>
): Promise<T & { sink: Sink }> {
  clock = new VirtualClock();
  const s = newSink();
  sink = s;
  captureConsole();
  try {
    const out = await body(s);
    await tick();
    await tick();
    return { ...out, sink: s };
  } finally {
    restoreConsole();
    sink = null;
  }
}

const stringify = (v: unknown): string => {
  if (v === undefined) {
    return "undefined";
  }
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  (typeof v === "object" || typeof v === "function") &&
  v !== null &&
  typeof (v as { then?: unknown }).then === "function";

// How a rejection reason relates to the error the harness threw.
const reasonMatch = (reason: unknown, expected: unknown): string => {
  if (reason === expected) {
    return "same";
  }
  if (reason instanceof AggregateError && reason.errors.includes(expected)) {
    return "aggregate";
  }
  if (reason instanceof Error && reason.cause === expected) {
    return "cause";
  }
  return `other (${describe(reason)})`;
};
const PROPAGATED = new Set(["same", "aggregate", "cause"]);

// ------------------------------------------------------------------ fp1: createPool

type CreatePool = (opts?: { concurrency?: number; interval?: number }) => {
  run: (fn: () => unknown) => unknown;
};
type TaskKind = "sync" | "async" | "microtask" | "syncThrow" | "asyncReject";
interface TaskSpec {
  at: number;
  delay: number;
  id: string;
  kind: TaskKind;
  value: unknown;
}
interface PoolScenario {
  name?: string;
  options: { concurrency?: number; interval?: number } | "omitted";
  tasks: TaskSpec[];
}
interface TaskOutcome {
  calls: number;
  reason?: unknown;
  settledAt?: number;
  state: "pending" | "fulfilled" | "rejected" | "threw";
  value?: unknown;
}

const POOL_MAX_TIME = 3000;
const POOL_MAX_FIRINGS = 60_000;

async function runPool(createPool: CreatePool, sc: PoolScenario) {
  return await inScenario(async () => {
    const trace: string[] = [];
    const outcomes = new Map<string, TaskOutcome>();
    const errors = new Map<string, Error>();
    let active = 0;
    let maxActive = 0;
    let submitted = 0;
    let pool: ReturnType<CreatePool>;
    try {
      pool =
        sc.options === "omitted" ? createPool() : createPool({ ...sc.options });
    } catch (error) {
      return {
        constructError: describe(error),
        trace,
        outcomes,
        maxActive,
        end: "error",
        settle: "n/a",
        errors,
      };
    }
    const submit = (task: TaskSpec) => {
      submitted += 1;
      const outcome: TaskOutcome = { calls: 0, state: "pending" };
      outcomes.set(task.id, outcome);
      const error = new Error(`task ${task.id} failed`);
      errors.set(task.id, error);
      const fn = () => {
        outcome.calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        trace.push(`${clock.now} start ${task.id}`);
        const finish = () => {
          active -= 1;
          trace.push(`${clock.now} end ${task.id}`);
        };
        switch (task.kind) {
          case "sync":
            finish();
            return task.value;
          case "syncThrow":
            finish();
            throw error;
          case "microtask":
            return Promise.resolve().then(() => {
              finish();
              return task.value;
            });
          case "async":
            return new Promise((resolve) => {
              clock.add(
                () => {
                  finish();
                  resolve(task.value);
                },
                task.delay,
                [],
                "timeout"
              );
            });
          default:
            return new Promise((_, reject) => {
              clock.add(
                () => {
                  finish();
                  reject(error);
                },
                task.delay,
                [],
                "timeout"
              );
            });
        }
      };
      let returned: unknown;
      try {
        returned = pool.run(fn);
      } catch (e) {
        outcome.state = "threw";
        outcome.reason = e;
        outcome.settledAt = clock.now;
        trace.push(`${clock.now} threw ${task.id}`);
        return;
      }
      Promise.resolve(returned).then(
        (value) => {
          outcome.state = "fulfilled";
          outcome.value = value;
          outcome.settledAt = clock.now;
          trace.push(`${clock.now} fulfilled ${task.id}`);
        },
        (reason) => {
          outcome.state = "rejected";
          outcome.reason = reason;
          outcome.settledAt = clock.now;
          trace.push(`${clock.now} rejected ${task.id}`);
        }
      );
    };
    for (const task of sc.tasks) {
      if (task.at === 0) {
        submit(task);
      } else {
        clock.add(() => submit(task), task.at, [], "timeout");
      }
    }
    const allSettled = () =>
      submitted === sc.tasks.length &&
      [...outcomes.values()].every((o) => o.state !== "pending");
    const end = await drive(allSettled, POOL_MAX_TIME, POOL_MAX_FIRINGS);
    // Keep the clock running a little after the last settlement: catches late unhandled
    // rejections and tells "quiet" from "still spinning".
    const settle =
      end === "done"
        ? await drive(() => false, clock.now + 200, clock.firings + 20_000)
        : "n/a";
    return { trace, outcomes, maxActive, end, settle, errors };
  });
}

const outcomeKey = (task: TaskSpec, o: TaskOutcome | undefined) => {
  if (!o) {
    return "never submitted";
  }
  if (o.state === "fulfilled") {
    return o.value === task.value
      ? `fulfilled with its value (calls ${o.calls})`
      : `fulfilled with ${stringify(o.value)} (calls ${o.calls})`;
  }
  if (o.state === "rejected" || o.state === "threw") {
    return `${o.state} ${describe(o.reason)} (calls ${o.calls})`;
  }
  return `pending (calls ${o.calls})`;
};

function poolInputs(): PoolScenario[] {
  const r = rng(SEED);
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const value = (i: number): unknown =>
    pick<() => unknown>([
      () => ({ i, v: int(0, 1e6) }),
      () => int(-1e6, 1e6),
      () => `value-${i}`,
      () => undefined,
      () => null,
      () => [i, i + 1],
    ])();
  const scenarios: PoolScenario[] = [];
  const task = (
    i: number,
    at: number,
    kind: TaskKind,
    delay: number
  ): TaskSpec => ({
    at,
    delay,
    id: `t${i}`,
    kind,
    value: value(i),
  });
  // Hand-picked shapes first.
  const burst = (
    n: number,
    concurrency: number | undefined,
    interval?: number,
    kind: TaskKind = "async"
  ) => ({
    options: { concurrency, interval },
    tasks: Array.from({ length: n }, (_, i) => task(i, 0, kind, 5 + (i % 3))),
  });
  scenarios.push(
    burst(1, 1),
    burst(5, 1),
    burst(5, 1, undefined, "sync"),
    burst(5, 1, undefined, "microtask"),
    burst(6, 2),
    burst(6, 2, 4),
    burst(4, 4),
    burst(8, 3, 2),
    burst(3, Infinity),
    burst(3, Infinity, 5),
    burst(5, 0),
    burst(5, undefined),
    {
      options: "omitted",
      tasks: [task(0, 0, "async", 3), task(1, 0, "sync", 0)],
    },
    {
      options: { concurrency: 1, interval: 10 },
      tasks: [
        task(0, 0, "sync", 0),
        task(1, 0, "sync", 0),
        task(2, 25, "sync", 0),
      ],
    }
  );
  // Seeded random scenarios.
  for (let k = 0; k < 400; k++) {
    const concurrency = pick<number | undefined>([
      undefined,
      0,
      1,
      1,
      1,
      2,
      2,
      3,
      4,
      8,
      Infinity,
    ]);
    const interval = pick<number | undefined>([
      undefined,
      undefined,
      0,
      0,
      1,
      3,
      7,
    ]);
    const n = int(1, 9);
    const tasks = Array.from({ length: n }, (_, i) =>
      task(
        i,
        r() < 0.6 ? 0 : int(1, 25),
        pick<TaskKind>(["sync", "async", "async", "async", "microtask"]),
        int(1, 10)
      )
    );
    scenarios.push({
      options: r() < 0.05 ? "omitted" : { concurrency, interval },
      tasks,
    });
  }
  return scenarios;
}

async function poolHappyPath(reference: CreatePool, candidate: CreatePool) {
  const scenarios = poolInputs();
  let outcomesMatch = 0;
  let strictMatch = 0;
  let firstMismatch: unknown = null;
  let firstStrictMismatch: unknown = null;
  let concurrencyViolations = 0;
  let unhandledOrUncaught = 0;
  for (const [index, sc] of scenarios.entries()) {
    const a = await runPool(reference, sc);
    const b = await runPool(candidate, sc);
    const keysA = sc.tasks.map((t) => outcomeKey(t, a.outcomes.get(t.id)));
    const keysB = sc.tasks.map((t) => outcomeKey(t, b.outcomes.get(t.id)));
    const limit =
      sc.options === "omitted" || !sc.options.concurrency
        ? 1024
        : sc.options.concurrency;
    const violates = b.maxActive > limit;
    if (violates) {
      concurrencyViolations += 1;
    }
    const noise =
      b.sink.unhandled.length +
      b.sink.uncaught.length +
      b.sink.logs.length -
      (a.sink.unhandled.length + a.sink.uncaught.length + a.sink.logs.length);
    if (noise !== 0) {
      unhandledOrUncaught += 1;
    }
    const same =
      !violates &&
      noise === 0 &&
      a.end === b.end &&
      JSON.stringify(keysA) === JSON.stringify(keysB);
    if (same) {
      outcomesMatch += 1;
    } else if (!firstMismatch) {
      firstMismatch = {
        index,
        scenario: { ...sc, tasks: sc.tasks.map(({ value, ...t }) => t) },
        reference: { end: a.end, outcomes: keysA, maxActive: a.maxActive },
        candidate: {
          end: b.end,
          outcomes: keysB,
          maxActive: b.maxActive,
          unhandled: b.sink.unhandled,
          uncaught: b.sink.uncaught,
          logs: b.sink.logs.slice(0, 3),
        },
      };
    }
    if (
      same &&
      JSON.stringify(a.trace) === JSON.stringify(b.trace) &&
      a.settle === b.settle
    ) {
      strictMatch += 1;
    } else if (same && !firstStrictMismatch) {
      const i = a.trace.findIndex((x, k) => x !== b.trace[k]);
      firstStrictMismatch = {
        index,
        firstDifference: {
          at: i,
          reference: a.trace[i] ?? null,
          candidate: b.trace[i] ?? null,
        },
        settle: { reference: a.settle, candidate: b.settle },
      };
    }
  }
  return {
    ok: outcomesMatch === scenarios.length,
    scenarios: scenarios.length,
    outcomesMatch,
    strictTraceMatch: strictMatch,
    strictOk: strictMatch === scenarios.length,
    concurrencyViolations,
    scenariosWithExtraUnhandledOrLogs: unhandledOrUncaught,
    firstMismatch,
    firstStrictMismatch,
  };
}

// Error-path scenarios. Failing tasks are listed per scenario; every other task should succeed.
const t = (
  id: string,
  at: number,
  kind: TaskKind,
  delay: number
): TaskSpec => ({
  at,
  delay,
  id,
  kind,
  value: { id },
});
const POOL_ERRORS: (PoolScenario & {
  name: string;
  failing: string[];
  queued: boolean;
})[] = [
  {
    name: "queued task throws synchronously (concurrency 1)",
    options: { concurrency: 1 },
    tasks: [
      t("A", 0, "async", 10),
      t("B", 0, "syncThrow", 0),
      t("C", 0, "sync", 0),
      t("D", 50, "sync", 0),
    ],
    failing: ["B"],
    queued: true,
  },
  {
    name: "queued task rejects asynchronously (concurrency 1)",
    options: { concurrency: 1 },
    tasks: [
      t("A", 0, "async", 10),
      t("B", 0, "asyncReject", 5),
      t("C", 0, "async", 3),
      t("D", 50, "sync", 0),
    ],
    failing: ["B"],
    queued: true,
  },
  {
    name: "queued task rejects (concurrency 2)",
    options: { concurrency: 2 },
    tasks: [
      t("A", 0, "async", 10),
      t("B", 0, "async", 10),
      t("C", 0, "asyncReject", 3),
      t("D", 0, "async", 4),
      t("E", 60, "sync", 0),
    ],
    failing: ["C"],
    queued: true,
  },
  {
    name: "queued task throws, slot held for an interval (concurrency 1, interval 5)",
    options: { concurrency: 1, interval: 5 },
    tasks: [
      t("A", 0, "async", 5),
      t("B", 0, "syncThrow", 0),
      t("C", 0, "sync", 0),
    ],
    failing: ["B"],
    queued: true,
  },
  {
    name: "unqueued task throws (concurrency 1), then a later task",
    options: { concurrency: 1 },
    tasks: [t("A", 0, "syncThrow", 0), t("B", 10, "sync", 0)],
    failing: ["A"],
    queued: false,
  },
];

async function poolErrorPath(createPool: CreatePool) {
  const scenarios = [];
  for (const sc of POOL_ERRORS) {
    const res = await runPool(createPool, sc);
    const tasks = Object.fromEntries(
      sc.tasks.map((task) => {
        const o = res.outcomes.get(task.id);
        const failing = sc.failing.includes(task.id);
        let result: string;
        if (!o) {
          result = "never submitted";
        } else if (o.state === "pending") {
          result = "pending";
        } else if (o.state === "fulfilled") {
          result =
            o.value === task.value
              ? "fulfilled"
              : `fulfilled with ${stringify(o.value)}`;
        } else {
          const match = reasonMatch(o.reason, res.errors.get(task.id));
          result = `${o.state} (${match === "same" ? "its own error" : match})`;
        }
        return [
          task.id,
          {
            failing,
            result,
            calls: o?.calls ?? 0,
            settledAt: o?.settledAt ?? null,
          },
        ];
      })
    );
    scenarios.push({
      name: sc.name,
      queued: sc.queued,
      tasks,
      unhandledRejections: res.sink.unhandled,
      uncaughtExceptions: res.sink.uncaught,
      logs: res.sink.logs,
      clock:
        res.end === "budget"
          ? "still scheduling timers when the budget ran out"
          : res.end,
      afterSettle: res.settle,
    });
  }
  const failingResults = scenarios.flatMap((s) =>
    Object.values(s.tasks)
      .filter((x) => x.failing)
      .map((x) => ({ queued: s.queued, ...x }))
  );
  const others = scenarios.flatMap((s) =>
    Object.values(s.tasks).filter((x) => !x.failing)
  );
  const queuedFailures = failingResults.filter((x) => x.queued);
  const summary = {
    queuedFailureRejectsCaller: queuedFailures.every(
      (x) => x.result === "rejected (its own error)"
    ),
    queuedFailureLeavesCallerPending: queuedFailures.some(
      (x) => x.result === "pending"
    ),
    unqueuedFailureRejectsCaller: failingResults
      .filter((x) => !x.queued)
      .every((x) => x.result === "rejected (its own error)"),
    unhandledRejections: scenarios.reduce(
      (n, s) => n + s.unhandledRejections.length,
      0
    ),
    uncaughtExceptions: scenarios.reduce(
      (n, s) => n + s.uncaughtExceptions.length,
      0
    ),
    errorLogged: scenarios.some((s) => s.logs.length > 0),
    otherTasksAllFulfilled: others.every((x) => x.result === "fulfilled"),
    otherTasksPending: others.filter((x) => x.result === "pending").length,
    otherTasks: others.length,
  };
  return { scenarios, summary, verdict: poolVerdict(summary) };
}

function poolVerdict(s: {
  queuedFailureRejectsCaller: boolean;
  queuedFailureLeavesCallerPending: boolean;
  unhandledRejections: number;
  errorLogged: boolean;
  otherTasksAllFulfilled: boolean;
}) {
  if (s.queuedFailureRejectsCaller) {
    if (s.unhandledRejections > 0) {
      return "rejects caller, but also an unhandled rejection";
    }
    return s.otherTasksAllFulfilled
      ? "fixed: rejects caller, frees the slot"
      : "rejects caller, slot still leaks";
  }
  if (s.queuedFailureLeavesCallerPending) {
    if (s.unhandledRejections > 0) {
      return "caller hangs, unhandled rejection (original behavior)";
    }
    return s.errorLogged
      ? "caller hangs, error only logged"
      : "caller hangs, error swallowed";
  }
  return "other";
}

// ------------------------------------------------------------------ fp2: compose

interface Destination {
  close?: () => unknown;
  flush?: () => unknown;
  write: (chunk: unknown) => unknown;
}
type Compose = (destinations: Destination[]) => Destination;
type MethodKind =
  | "none"
  | "sync"
  | "async"
  | "resolved"
  | "asyncReject"
  | "rejected"
  | "syncThrow"
  | "rejectNonError";
interface DestSpec {
  close: MethodKind;
  closeDelay: number;
  flush: MethodKind;
  flushDelay: number;
}
type Op =
  | { at: number; kind: "write"; chunk: unknown }
  | { at: number; kind: "flush" | "close" };
interface ComposeScenario {
  dests: DestSpec[];
  ops: Op[];
}

const COMPOSE_MAX_TIME = 2000;
const COMPOSE_MAX_FIRINGS = 20_000;

async function runCompose(
  compose: Compose,
  sc: ComposeScenario,
  awaitResults: boolean
) {
  return await inScenario(async () => {
    const trace: string[] = [];
    const perDest: string[][] = sc.dests.map(() => []);
    const errors: Map<string, unknown> = new Map();
    const pendingEnds = new Set<string>();
    const opResults: {
      op: string;
      result: string;
      at: number;
      destsPendingAtResume?: number;
    }[] = [];
    const destinations: Destination[] = sc.dests.map((spec, d) => {
      const dest: Destination = {
        write: (chunk) => {
          trace.push(`${clock.now} d${d}.write ${stringify(chunk)}`);
          perDest[d]?.push(`write ${stringify(chunk)}`);
        },
      };
      for (const method of ["flush", "close"] as const) {
        const kind = spec[method];
        if (kind === "none") {
          continue;
        }
        const delay = method === "flush" ? spec.flushDelay : spec.closeDelay;
        let n = 0;
        dest[method] = () => {
          n += 1;
          const label = `d${d}.${method}#${n}`;
          trace.push(`${clock.now} ${label} start`);
          perDest[d]?.push(method);
          const error =
            kind === "rejectNonError"
              ? `${label} failed (not an Error)`
              : new Error(`${label} failed`);
          errors.set(label, error);
          const end = (how: string) => {
            pendingEnds.delete(label);
            trace.push(`${clock.now} ${label} ${how}`);
          };
          switch (kind) {
            case "sync":
              end("done");
              return undefined;
            case "syncThrow":
              end("threw");
              throw error;
            case "resolved":
              end("done");
              return Promise.resolve();
            case "rejected":
              end("rejected");
              return Promise.reject(error);
            case "async":
              pendingEnds.add(label);
              return new Promise<void>((resolve) => {
                clock.add(
                  () => {
                    end("done");
                    resolve();
                  },
                  delay,
                  [],
                  "timeout"
                );
              });
            default:
              pendingEnds.add(label);
              return new Promise<void>((_, reject) => {
                clock.add(
                  () => {
                    end("rejected");
                    reject(error);
                  },
                  delay,
                  [],
                  "timeout"
                );
              });
          }
        };
      }
      return dest;
    });
    let composite: Destination;
    try {
      composite = compose(destinations);
    } catch (error) {
      return {
        constructError: describe(error),
        trace,
        perDest,
        opResults,
        errors,
        end: "error",
      };
    }
    let opsDone = 0;
    // Calls one composite method synchronously. Returns a promise only when the method returned
    // one, so a fire-and-forget caller's next call follows with no gap at all.
    const runOp = (op: Op, i: number): Promise<void> | undefined => {
      const label = `op${i} ${op.kind}`;
      let returned: unknown;
      try {
        returned =
          op.kind === "write"
            ? composite.write(op.chunk)
            : (composite[op.kind] as (() => unknown) | undefined)?.call(
                composite
              );
      } catch (error) {
        opResults.push({
          op: label,
          result: `threw ${describe(error)}`,
          at: clock.now,
          reason: error,
        } as never);
        trace.push(`${clock.now} ${label} threw`);
        opsDone += 1;
        return undefined;
      }
      if (!isThenable(returned)) {
        opResults.push({
          op: label,
          result: `returned ${stringify(returned)}`,
          at: clock.now,
        });
        trace.push(`${clock.now} ${label} returned`);
        opsDone += 1;
        return undefined;
      }
      trace.push(`${clock.now} ${label} returned a promise`);
      const record = (result: string, reason?: unknown) => {
        opResults.push({
          op: label,
          result,
          at: clock.now,
          destsPendingAtResume: pendingEnds.size,
          ...(reason === undefined ? {} : { reason }),
        } as never);
        trace.push(`${clock.now} ${label} ${result}`);
        opsDone += 1;
      };
      return Promise.resolve(returned).then(
        (v) => record(`promise fulfilled with ${stringify(v)}`),
        (reason) => record("promise rejected", reason)
      );
    };
    // Ops run in order. A fire-and-forget caller (how the original's void-returning methods
    // are used) makes same-time calls back to back; an awaiting caller awaits each returned
    // promise first. Later ops wait for their time on the clock.
    const chain = (async () => {
      for (const [i, op] of sc.ops.entries()) {
        if (op.at > clock.now) {
          await new Promise<void>((resolve) =>
            clock.add(resolve, op.at - clock.now, [], "timeout")
          );
        }
        const settled = runOp(op, i);
        if (awaitResults && settled) {
          await settled;
        }
      }
    })();
    let chainDone = false;
    void chain.then(() => {
      chainDone = true;
    });
    const end = await drive(
      () => chainDone && opsDone === sc.ops.length && pendingEnds.size === 0,
      COMPOSE_MAX_TIME,
      COMPOSE_MAX_FIRINGS
    );
    const settle =
      end === "done"
        ? await drive(() => false, clock.now + 100, clock.firings + 5000)
        : "n/a";
    return { trace, perDest, opResults, errors, end, settle };
  });
}

function composeInputs(): ComposeScenario[] {
  const r = rng(SEED + 2);
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const kinds: MethodKind[] = ["none", "sync", "async", "async", "resolved"];
  const scenarios: ComposeScenario[] = [];
  const dest = (
    flush: MethodKind,
    close: MethodKind,
    fd = 5,
    cd = 5
  ): DestSpec => ({
    flush,
    close,
    flushDelay: fd,
    closeDelay: cd,
  });
  const chunk = (i: number) => ({
    label: i % 2 ? null : "astro",
    level: "info",
    message: `m${i}`,
    newLine: true,
  });
  scenarios.push(
    {
      dests: [],
      ops: [
        { at: 0, kind: "write", chunk: chunk(0) },
        { at: 0, kind: "flush" },
        { at: 0, kind: "close" },
      ],
    },
    {
      dests: [dest("none", "none")],
      ops: [
        { at: 0, kind: "flush" },
        { at: 0, kind: "close" },
      ],
    },
    {
      dests: [
        dest("async", "async", 8, 3),
        dest("sync", "sync"),
        dest("async", "resolved", 2),
      ],
      ops: [
        { at: 0, kind: "write", chunk: chunk(1) },
        { at: 0, kind: "flush" },
        { at: 0, kind: "write", chunk: chunk(2) },
        { at: 0, kind: "close" },
      ],
    },
    {
      dests: [dest("async", "async", 10, 10), dest("async", "async", 1, 1)],
      ops: [
        { at: 0, kind: "flush" },
        { at: 0, kind: "write", chunk: chunk(3) },
        { at: 4, kind: "close" },
      ],
    }
  );
  for (let k = 0; k < 400; k++) {
    const n = int(0, 5);
    const dests = Array.from({ length: n }, () =>
      dest(pick(kinds), pick(kinds), int(1, 12), int(1, 12))
    );
    const opCount = int(1, 6);
    let at = 0;
    const ops: Op[] = Array.from({ length: opCount }, (_, i) => {
      if (r() < 0.3) {
        at += int(1, 15);
      }
      const kind = pick<Op["kind"]>(["write", "write", "flush", "close"]);
      return kind === "write" ? { at, kind, chunk: chunk(i) } : { at, kind };
    });
    scenarios.push({ dests, ops });
  }
  return scenarios;
}

const opKey = (o: { op: string; result: string }) => {
  // A composite that now returns a promise where the original returned undefined is the fix,
  // not a change in what the caller gets on success.
  const r = o.result
    .replace(/^returned undefined$/, "ok")
    .replace(/^promise fulfilled with .*$/, "ok");
  return `${o.op}: ${r}`;
};

async function composeHappyPath(reference: Compose, candidate: Compose) {
  const scenarios = composeInputs();
  const modes = {} as Record<string, unknown>;
  let ok = true;
  let strictOk = true;
  for (const awaitResults of [false, true]) {
    let sequencesMatch = 0;
    let strictMatch = 0;
    let returnsPromise = 0;
    let waitedForDestinations = 0;
    let awaitedOpsWithAsyncDestinations = 0;
    let firstMismatch: unknown = null;
    let firstStrictMismatch: unknown = null;
    for (const [index, sc] of scenarios.entries()) {
      const a = await runCompose(reference, sc, awaitResults);
      const b = await runCompose(candidate, sc, awaitResults);
      const keysA = a.opResults.map(opKey).sort();
      const keysB = b.opResults.map(opKey).sort();
      const noiseA =
        a.sink.unhandled.length + a.sink.uncaught.length + a.sink.logs.length;
      const noiseB =
        b.sink.unhandled.length + b.sink.uncaught.length + b.sink.logs.length;
      const same =
        a.end === b.end &&
        noiseA === noiseB &&
        JSON.stringify(a.perDest) === JSON.stringify(b.perDest) &&
        JSON.stringify(keysA) === JSON.stringify(keysB);
      if (same) {
        sequencesMatch += 1;
      } else if (!firstMismatch) {
        firstMismatch = {
          index,
          scenario: sc,
          reference: { end: a.end, perDest: a.perDest, ops: keysA },
          candidate: {
            end: b.end,
            perDest: b.perDest,
            ops: keysB,
            unhandled: b.sink.unhandled,
            uncaught: b.sink.uncaught,
            logs: b.sink.logs.slice(0, 3),
          },
        };
      }
      const strip = (trace: string[]) =>
        trace.filter((x) => !/ op\d+ /.test(x));
      if (
        same &&
        JSON.stringify(strip(a.trace)) === JSON.stringify(strip(b.trace))
      ) {
        strictMatch += 1;
      } else if (same && !firstStrictMismatch) {
        const ta = strip(a.trace);
        const tb = strip(b.trace);
        const i = ta.findIndex((x, k) => x !== tb[k]);
        firstStrictMismatch = {
          index,
          firstDifference: {
            at: i,
            reference: ta[i] ?? null,
            candidate: tb[i] ?? null,
          },
        };
      }
      if (b.opResults.some((o) => o.result.startsWith("promise"))) {
        returnsPromise += 1;
      }
      if (awaitResults) {
        for (const o of b.opResults) {
          if (o.destsPendingAtResume !== undefined) {
            awaitedOpsWithAsyncDestinations += 1;
            if (o.destsPendingAtResume === 0) {
              waitedForDestinations += 1;
            }
          }
        }
      }
    }
    const modeOk = sequencesMatch === scenarios.length;
    ok &&= modeOk;
    // Exact timing is only required of a fire-and-forget caller: an awaiting caller's later
    // calls are supposed to move once flush/close can be awaited.
    if (!awaitResults) {
      strictOk = strictMatch === scenarios.length;
    }
    modes[awaitResults ? "awaitingCaller" : "fireAndForgetCaller"] = {
      ok: modeOk,
      scenarios: scenarios.length,
      sequencesMatch,
      strictTraceMatch: strictMatch,
      scenariosWhereCandidateReturnsAPromise: returnsPromise,
      ...(awaitResults
        ? {
            awaitedPromises: awaitedOpsWithAsyncDestinations,
            awaitedPromisesThatWaitedForEveryDestination: waitedForDestinations,
          }
        : {}),
      firstMismatch,
      firstStrictMismatch,
    };
  }
  return { ok, strictOk, scenarios: scenarios.length, modes };
}

// Does `await composite.flush()` wait for the destinations? Checked directly, because the
// reference returns undefined and has nothing to await.
async function composeWaits(compose: Compose) {
  const out: Record<string, boolean> = {};
  for (const method of ["flush", "close"] as const) {
    const res = await runCompose(
      compose,
      {
        dests: [
          { flush: "async", close: "async", flushDelay: 7, closeDelay: 7 },
          { flush: "async", close: "async", flushDelay: 3, closeDelay: 3 },
        ],
        ops: [{ at: 0, kind: method }],
      },
      true
    );
    const done = res.trace.filter((x) => x.endsWith(" done")).length;
    const resumedAt = res.trace.findIndex(
      (x) => / op0 /.test(x) && !x.endsWith("returned a promise")
    );
    const doneBeforeResume = res.trace
      .slice(0, resumedAt)
      .filter((x) => x.endsWith(" done")).length;
    out[method] = done === 2 && doneBeforeResume === 2;
  }
  return out;
}

const A = (
  flush: MethodKind,
  close: MethodKind,
  fd: number,
  cd: number
): DestSpec => ({
  flush,
  close,
  flushDelay: fd,
  closeDelay: cd,
});
const COMPOSE_ERRORS: {
  name: string;
  method: "flush" | "close";
  dests: DestSpec[];
  inVerdict: boolean;
}[] = [
  {
    name: "flush: first destination rejects later, second resolves",
    method: "flush",
    dests: [A("asyncReject", "none", 5, 0), A("async", "none", 10, 0)],
    inVerdict: true,
  },
  {
    name: "flush: first resolves later, second rejects at once",
    method: "flush",
    dests: [A("async", "none", 10, 0), A("rejected", "none", 0, 0)],
    inVerdict: true,
  },
  {
    name: "flush: both destinations reject",
    method: "flush",
    dests: [A("asyncReject", "none", 4, 0), A("asyncReject", "none", 8, 0)],
    inVerdict: true,
  },
  {
    name: "flush: rejects with a non-Error reason",
    method: "flush",
    dests: [A("rejectNonError", "none", 5, 0), A("sync", "none", 0, 0)],
    inVerdict: true,
  },
  {
    name: "close: first destination rejects later, second resolves",
    method: "close",
    dests: [A("none", "asyncReject", 0, 5), A("none", "async", 0, 10)],
    inVerdict: true,
  },
  {
    name: "close: first resolves later, second rejects at once",
    method: "close",
    dests: [A("none", "async", 0, 10), A("none", "rejected", 0, 0)],
    inVerdict: true,
  },
  {
    name: "flush: first destination throws synchronously",
    method: "flush",
    dests: [A("syncThrow", "none", 0, 0), A("async", "none", 5, 0)],
    inVerdict: false,
  },
];

async function composeErrorPath(compose: Compose) {
  const scenarios = [];
  for (const sc of COMPOSE_ERRORS) {
    const res = await runCompose(
      compose,
      { dests: sc.dests, ops: [{ at: 0, kind: sc.method }] },
      true
    );
    const op = res.opResults[0] as
      | { result: string; reason?: unknown }
      | undefined;
    let caller: string;
    let reason = "n/a";
    if (!op) {
      caller = "pending";
    } else if (
      op.result.startsWith("threw") ||
      op.result === "promise rejected"
    ) {
      caller = op.result.startsWith("threw")
        ? "throws synchronously"
        : "rejects";
      const failures = [...res.errors.entries()].filter(([label]) => {
        const d = Number(label.slice(1, label.indexOf(".")));
        const k = sc.dests[d]?.[sc.method];
        return (
          k === "asyncReject" ||
          k === "rejected" ||
          k === "syncThrow" ||
          k === "rejectNonError"
        );
      });
      const matches = failures.map(([, e]) => reasonMatch(op.reason, e));
      reason = matches.find((m) => PROPAGATED.has(m)) ?? matches[0] ?? "n/a";
    } else {
      caller = op.result.startsWith("returned")
        ? `returns (${op.result.replace("returned ", "")})`
        : "resolves";
    }
    const called = res.perDest.map((calls) => calls.includes(sc.method));
    scenarios.push({
      name: sc.name,
      inVerdict: sc.inVerdict,
      caller,
      reason,
      destinationsCalled: `${called.filter(Boolean).length} of ${called.length}`,
      unhandledRejections: res.sink.unhandled,
      uncaughtExceptions: res.sink.uncaught,
      logs: res.sink.logs,
      clock: res.end,
    });
  }
  const v = scenarios.filter((s) => s.inVerdict);
  const summary = {
    callerObservesFailure: v.every(
      (s) =>
        (s.caller === "rejects" || s.caller === "throws synchronously") &&
        PROPAGATED.has(s.reason)
    ),
    callerObservesSomeFailures: v.filter(
      (s) =>
        (s.caller === "rejects" || s.caller === "throws synchronously") &&
        PROPAGATED.has(s.reason)
    ).length,
    scenarios: v.length,
    unhandledRejections: v.reduce(
      (n, s) => n + s.unhandledRejections.length,
      0
    ),
    uncaughtExceptions: v.reduce((n, s) => n + s.uncaughtExceptions.length, 0),
    errorLogged: v.some((s) => s.logs.length > 0),
    everyDestinationCalled: v.every((s) => {
      const [x, y] = s.destinationsCalled.split(" of ");
      return x === y;
    }),
    syncThrowInFirstDestination: (() => {
      const s = scenarios.find((x) => !x.inVerdict);
      return s
        ? `${s.caller}; ${s.destinationsCalled} destinations called`
        : null;
    })(),
  };
  return { scenarios, summary, verdict: composeVerdict(summary) };
}

function composeVerdict(s: {
  callerObservesFailure: boolean;
  unhandledRejections: number;
  errorLogged: boolean;
  everyDestinationCalled: boolean;
}) {
  if (s.callerObservesFailure) {
    if (s.unhandledRejections > 0) {
      return "caller sees the failure, but also an unhandled rejection";
    }
    return s.everyDestinationCalled
      ? "fixed: caller sees the failure, every destination called"
      : "caller sees the failure, later destinations skipped";
  }
  if (s.unhandledRejections > 0) {
    return "caller can't see the failure, unhandled rejection (original behavior)";
  }
  return s.errorLogged
    ? "caller can't see the failure, error only logged"
    : "caller can't see the failure, error swallowed";
}

// ------------------------------------------------------------------ main

const print = (value: unknown) => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
  process.exit(0);
};

const EXPORT = subject === "fp1" ? "createPool" : "default";
let reference: unknown;
let candidate: unknown;
try {
  reference = (await import(referencePath as string))[EXPORT];
} catch (error) {
  print({
    ok: false,
    harnessError: `reference import failed: ${(error as Error).message}`,
  });
}
try {
  candidate = (await import(candidatePath as string))[EXPORT];
} catch (error) {
  print({ ok: false, importError: (error as Error).message });
}
if (typeof candidate !== "function") {
  print({ ok: false, exportMissing: EXPORT });
}

if (subject === "fp1") {
  const happyPath = await poolHappyPath(
    reference as CreatePool,
    candidate as CreatePool
  );
  const errorPath = {
    reference: await poolErrorPath(reference as CreatePool),
    candidate: await poolErrorPath(candidate as CreatePool),
  };
  print({
    ok: happyPath.ok,
    subject,
    seed: SEED,
    happyPath,
    errorPath: {
      verdict: errorPath.candidate.verdict,
      referenceVerdict: errorPath.reference.verdict,
      ...errorPath,
    },
    orphans,
  });
} else {
  const happyPath = await composeHappyPath(
    reference as Compose,
    candidate as Compose
  );
  const errorPath = {
    reference: await composeErrorPath(reference as Compose),
    candidate: await composeErrorPath(candidate as Compose),
  };
  const awaitWaitsForDestinations = {
    reference: await composeWaits(reference as Compose),
    candidate: await composeWaits(candidate as Compose),
  };
  print({
    ok: happyPath.ok,
    subject,
    seed: SEED,
    happyPath: { ...happyPath, awaitWaitsForDestinations },
    errorPath: {
      verdict: errorPath.candidate.verdict,
      referenceVerdict: errorPath.reference.verdict,
      ...errorPath,
    },
    orphans,
  });
}
