// Calibration cases for the floating-promises research post. Each case starts with a
// `// #ID: description` header; every diagnostic up to the next header belongs to that case.
// Run by scripts/async-linters.cjs through the TypeScript compiler, Oxlint (type-aware), ESLint
// (typescript-eslint, typed) and Biome. Under ./tsconfig.json the compiler itself rejects two
// cases, F17 and F18, and the script records that as a column of its own.

// ── stubs, so the file stands alone ────────────────────────────────────────────────────────
export declare function save(id?: number): Promise<void>;
export declare function load(): Promise<number>;
export declare function done(): void;
export declare function handle(error: unknown): void;
export declare function cleanup(): void;
export declare const items: number[];
export declare const button: HTMLButtonElement;
export declare const thenable: PromiseLike<void>;
export declare const stream: AsyncIterable<number>;
export declare function useEffect(
  effect: () => void | (() => void),
  deps?: unknown[]
): void;
export interface Emitter {
  on(event: string, listener: () => void): void;
}
export declare const emitter: Emitter;

// #F01: a bare call to an async function
export function f01(): void {
  save();
}

// #F02: `void` marks it as deliberately not awaited
export function f02(): void {
  void save();
}

// #F03: an empty rejection handler swallows the error
export function f03(): void {
  save().catch(() => {});
}

// #F04: a rejection handler that only logs
export function f04(): void {
  save().catch(console.error);
}

// #F05: `.then` with only a fulfilment handler
export function f05(): void {
  save().then(() => done());
}

// #F06: `.then` with both handlers
export function f06(): void {
  save().then(done, handle);
}

// #F07: `.finally` alone passes the rejection on, unhandled
export function f07(): void {
  save().finally(cleanup);
}

// #F08: `.catch` then `.finally`
export function f08(): void {
  save().catch(handle).finally(cleanup);
}

// #F09: a promise stored in a variable and never awaited
export function f09(): void {
  const pending = save();
  done();
  console.log(typeof pending);
}

// #F10: a promise assigned to a field and never observed
export class F10 {
  private pending?: Promise<void>;
  start(): void {
    this.pending = save();
  }
}

// #F11: `.map(async …)` as a statement: an array of promises, dropped
export function f11(): void {
  items.map(async (id) => {
    await save(id);
  });
}

// #F12: `.map(async …)` inside Promise.all
export async function f12(): Promise<void> {
  await Promise.all(
    items.map(async (id) => {
      await save(id);
    })
  );
}

// #F13: an async callback passed to forEach
export function f13(): void {
  items.forEach(async (id) => {
    await save(id);
  });
}

// #F14: an async event listener
export function f14(): void {
  button.addEventListener("click", async () => {
    await save();
  });
}

// #F15: an async setTimeout callback (DOM's TimerHandler is `string | Function`)
export function f15(): void {
  setTimeout(async () => {
    await save();
  }, 0);
}

// #F16: an async listener where the parameter type says `() => void`
export function f16(): void {
  emitter.on("change", async () => {
    await save();
  });
}

// #F17: an async effect callback (`() => void | (() => void)`)
export function f17(): void {
  useEffect(async () => {
    await save();
  }, []);
}

// #F18: a promise used as a condition is always truthy
export function f18(): void {
  if (save()) {
    done();
  }
}

// #F19: an async function assigned to a `() => void` variable
export function f19(): void {
  const callback: () => void = async () => {
    await save();
  };
  callback();
}

// #F20: an async Promise executor
export function f20(): Promise<void> {
  return new Promise(async (resolve) => {
    await save();
    resolve();
  });
}

// #F21: an executor arrow that returns a value (setTimeout's id)
export function f21(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

// #F22: an async IIFE as a statement
export function f22(): void {
  (async () => {
    await save();
  })();
}

// #F23: an async IIFE marked with `void`
export function f23(): void {
  void (async () => {
    await save();
  })();
}

// #F24: an async function that returns a value and never awaits
export async function f24(): Promise<number> {
  return 1;
}

// #F25: an async function that returns another promise without awaiting it
export async function f25(): Promise<void> {
  return save();
}

// #F26: a non-async function that returns a promise
export function f26(): Promise<void> {
  return save();
}

// #F27: `await` inside a for…of loop
export async function f27(): Promise<void> {
  for (const id of items) {
    await save(id);
  }
}

// #F28: `for await` over an async iterable
export async function f28(): Promise<number> {
  let total = 0;
  for await (const n of stream) {
    total += n;
  }
  return total;
}

// #F29: a PromiseLike (thenable), not a Promise, left floating
export function f29(): void {
  thenable.then(() => done());
}

// #F30: an async `.then` callback in a handled chain
export function f30(): void {
  load()
    .then(async (n) => {
      await save(n);
    })
    .catch(handle);
}

// #F31: returning a promise from inside try without awaiting it
export async function f31(): Promise<void> {
  try {
    return save();
  } catch (error) {
    handle(error);
  }
}

// #F32: awaiting a value that isn't a promise
export async function f32(): Promise<number> {
  const n = await 42;
  return n + (await load());
}

// #F33: an async method called from a sync method
export class F33 {
  async flush(): Promise<void> {
    await save();
  }
  close(): void {
    this.flush();
  }
}

// #F34: a bare Promise.reject
export function f34(): void {
  Promise.reject(new Error("never handled"));
}

// #F35: awaiting the array from `.map(async …)` instead of Promise.all
export async function f35(): Promise<void> {
  const results = await items.map(async (id) => {
    await save(id);
  });
  console.log(results.length);
}

// #F36: an async function passed where a Promise-returning callback is expected
export async function f36(
  run: (task: () => Promise<void>) => Promise<void>
): Promise<void> {
  await run(async () => {
    await save();
  });
}

// #F37: a promise returned from a sync callback slot that is typed to return unknown
export function f37(register: (callback: () => unknown) => void): void {
  register(async () => {
    await save();
  });
}

// #END
