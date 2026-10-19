/*
 * Source:    vitejs/vite — packages/vite/src/shared/hmr.ts, lines 5-314 (the whole file but its
 *            type imports)
 * Commit:    6d6ae10f5d80a9c9b6737377333424fe76652b81 (2024-03-12T21:17:11+08:00)
 * Permalink: https://github.com/vitejs/vite/blob/6d6ae10f5d80a9c9b6737377333424fe76652b81/packages/vite/src/shared/hmr.ts#L232-L243
 * Classes:   HMRContext (what import.meta.hot is), HMRMessenger and HMRClient.
 * Lines 5-314 are copied, with their formatting changed. The types above them replace its three
 * type imports; they are copied from packages/vite/types/{hmrPayload,hot,customEvent}.d.ts at the
 * same commit, reduced to what this file uses. Anything marked STUB is not part of the original
 * source.
 *
 * License of the source repository (vitejs/vite/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// STUB (not part of the original source): the types lines 1-3 import, copied from
// packages/vite/types/hmrPayload.d.ts, hot.d.ts and customEvent.d.ts at the same commit and
// reduced to what this file uses.
interface Update {
  type: "js-update" | "css-update";
  path: string;
  acceptedPath: string;
  timestamp: number;
  /** @internal */
  explicitImportRequired?: boolean;
  /** @internal */
  isWithinCircularImport?: boolean;
  /** @internal */
  ssrInvalidates?: string[];
}
type ModuleNamespace = Record<string, any> & {
  [Symbol.toStringTag]: "Module";
};
interface ViteHotContext {
  readonly data: any;

  accept(): void;
  accept(cb: (mod: ModuleNamespace | undefined) => void): void;
  accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void;
  accept(
    deps: readonly string[],
    cb: (mods: (ModuleNamespace | undefined)[]) => void
  ): void;

  acceptExports(
    exportNames: string | readonly string[],
    cb?: (mod: ModuleNamespace | undefined) => void
  ): void;

  dispose(cb: (data: any) => void): void;
  prune(cb: (data: any) => void): void;
  invalidate(message?: string): void;

  on<T extends string>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void
  ): void;
  off<T extends string>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void
  ): void;
  send<T extends string>(event: T, data?: InferCustomEventPayload<T>): void;
}
interface CustomEventMap {
  "vite:beforePrune": { type: "prune"; paths: string[] };
  "vite:invalidate": { path: string; message: string | undefined };
}
type InferCustomEventPayload<T extends string> = T extends keyof CustomEventMap
  ? CustomEventMap[T]
  : any;

type CustomListenersMap = Map<string, ((data: any) => void)[]>;

interface HotModule {
  id: string;
  callbacks: HotCallback[];
}

interface HotCallback {
  // the dependencies must be fetchable paths
  deps: string[];
  fn: (modules: (ModuleNamespace | undefined)[]) => void;
}

export interface HMRLogger {
  error(msg: string | Error): void;
  debug(...msg: unknown[]): void;
}

export interface HMRConnection {
  /**
   * Checked before sending messages to the client.
   */
  isReady(): boolean;
  /**
   * Send message to the client.
   */
  send(messages: string): void;
}

export class HMRContext implements ViteHotContext {
  private newListeners: CustomListenersMap;

  constructor(
    private hmrClient: HMRClient,
    private ownerPath: string
  ) {
    if (!hmrClient.dataMap.has(ownerPath)) {
      hmrClient.dataMap.set(ownerPath, {});
    }

    // when a file is hot updated, a new context is created
    // clear its stale callbacks
    const mod = hmrClient.hotModulesMap.get(ownerPath);
    if (mod) {
      mod.callbacks = [];
    }

    // clear stale custom event listeners
    const staleListeners = hmrClient.ctxToListenersMap.get(ownerPath);
    if (staleListeners) {
      for (const [event, staleFns] of staleListeners) {
        const listeners = hmrClient.customListenersMap.get(event);
        if (listeners) {
          hmrClient.customListenersMap.set(
            event,
            listeners.filter((l) => !staleFns.includes(l))
          );
        }
      }
    }

    this.newListeners = new Map();
    hmrClient.ctxToListenersMap.set(ownerPath, this.newListeners);
  }

  get data(): any {
    return this.hmrClient.dataMap.get(this.ownerPath);
  }

  accept(deps?: any, callback?: any): void {
    if (typeof deps === "function" || !deps) {
      // self-accept: hot.accept(() => {})
      this.acceptDeps([this.ownerPath], ([mod]) => deps?.(mod));
    } else if (typeof deps === "string") {
      // explicit deps
      this.acceptDeps([deps], ([mod]) => callback?.(mod));
    } else if (Array.isArray(deps)) {
      this.acceptDeps(deps, callback);
    } else {
      throw new TypeError(`invalid hot.accept() usage.`);
    }
  }

  // export names (first arg) are irrelevant on the client side, they're
  // extracted in the server for propagation
  acceptExports(
    _: string | readonly string[],
    callback: (data: any) => void
  ): void {
    this.acceptDeps([this.ownerPath], ([mod]) => callback?.(mod));
  }

  dispose(cb: (data: any) => void): void {
    this.hmrClient.disposeMap.set(this.ownerPath, cb);
  }

  prune(cb: (data: any) => void): void {
    this.hmrClient.pruneMap.set(this.ownerPath, cb);
  }

  // Kept for backward compatibility (#11036)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  decline(): void {}

  invalidate(message: string): void {
    this.hmrClient.notifyListeners("vite:invalidate", {
      message,
      path: this.ownerPath,
    });
    this.send("vite:invalidate", { message, path: this.ownerPath });
    this.hmrClient.logger.debug(
      `[vite] invalidate ${this.ownerPath}${message ? `: ${message}` : ""}`
    );
  }

  on<T extends string>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void
  ): void {
    const addToMap = (map: Map<string, any[]>) => {
      const existing = map.get(event) || [];
      existing.push(cb);
      map.set(event, existing);
    };
    addToMap(this.hmrClient.customListenersMap);
    addToMap(this.newListeners);
  }

  off<T extends string>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void
  ): void {
    const removeFromMap = (map: Map<string, any[]>) => {
      const existing = map.get(event);
      if (existing === undefined) {
        return;
      }
      const pruned = existing.filter((l) => l !== cb);
      if (pruned.length === 0) {
        map.delete(event);
        return;
      }
      map.set(event, pruned);
    };
    removeFromMap(this.hmrClient.customListenersMap);
    removeFromMap(this.newListeners);
  }

  send<T extends string>(event: T, data?: InferCustomEventPayload<T>): void {
    this.hmrClient.messenger.send(
      JSON.stringify({ data, event, type: "custom" })
    );
  }

  private acceptDeps(
    deps: string[],
    callback: HotCallback["fn"] = () => {}
  ): void {
    const mod: HotModule = this.hmrClient.hotModulesMap.get(this.ownerPath) || {
      callbacks: [],
      id: this.ownerPath,
    };
    mod.callbacks.push({
      deps,
      fn: callback,
    });
    this.hmrClient.hotModulesMap.set(this.ownerPath, mod);
  }
}

class HMRMessenger {
  constructor(private connection: HMRConnection) {}

  private queue: string[] = [];

  public send(message: string): void {
    this.queue.push(message);
    this.flush();
  }

  public flush(): void {
    if (this.connection.isReady()) {
      this.queue.forEach((msg) => this.connection.send(msg));
      this.queue = [];
    }
  }
}

export class HMRClient {
  public hotModulesMap = new Map<string, HotModule>();
  public disposeMap = new Map<string, (data: any) => void | Promise<void>>();
  public pruneMap = new Map<string, (data: any) => void | Promise<void>>();
  public dataMap = new Map<string, any>();
  public customListenersMap: CustomListenersMap = new Map();
  public ctxToListenersMap = new Map<string, CustomListenersMap>();

  public messenger: HMRMessenger;

  constructor(
    public logger: HMRLogger,
    connection: HMRConnection,
    // This allows implementing reloading via different methods depending on the environment
    private importUpdatedModule: (update: Update) => Promise<ModuleNamespace>
  ) {
    this.messenger = new HMRMessenger(connection);
  }

  public async notifyListeners<T extends string>(
    event: T,
    data: InferCustomEventPayload<T>
  ): Promise<void>;
  public async notifyListeners(event: string, data: any): Promise<void> {
    const cbs = this.customListenersMap.get(event);
    if (cbs) {
      await Promise.allSettled(cbs.map((cb) => cb(data)));
    }
  }

  public clear(): void {
    this.hotModulesMap.clear();
    this.disposeMap.clear();
    this.pruneMap.clear();
    this.dataMap.clear();
    this.customListenersMap.clear();
    this.ctxToListenersMap.clear();
  }

  // After an HMR update, some modules are no longer imported on the page
  // but they may have left behind side effects that need to be cleaned up
  // (.e.g style injections)
  public prunePaths(paths: string[]): void {
    paths.forEach((path) => {
      const fn = this.pruneMap.get(path);
      if (fn) {
        fn(this.dataMap.get(path));
      }
    });
  }

  protected warnFailedUpdate(err: Error, path: string | string[]): void {
    if (!err.message.includes("fetch")) {
      this.logger.error(err);
    }
    this.logger.error(
      `[hmr] Failed to reload ${path}. ` +
        `This could be due to syntax errors or importing non-existent ` +
        `modules. (see errors above)`
    );
  }

  private updateQueue: Promise<(() => void) | undefined>[] = [];
  private pendingUpdateQueue = false;

  /**
   * buffer multiple hot updates triggered by the same src change
   * so that they are invoked in the same order they were sent.
   * (otherwise the order may be inconsistent because of the http request round trip)
   */
  public async queueUpdate(payload: Update): Promise<void> {
    this.updateQueue.push(this.fetchUpdate(payload));
    if (!this.pendingUpdateQueue) {
      this.pendingUpdateQueue = true;
      await Promise.resolve();
      this.pendingUpdateQueue = false;
      const loading = [...this.updateQueue];
      this.updateQueue = [];
      (await Promise.all(loading)).forEach((fn) => fn && fn());
    }
  }

  private async fetchUpdate(update: Update): Promise<(() => void) | undefined> {
    const { path, acceptedPath } = update;
    const mod = this.hotModulesMap.get(path);
    if (!mod) {
      // In a code-splitting project,
      // it is common that the hot-updating module is not loaded yet.
      // https://github.com/vitejs/vite/issues/721
      return;
    }

    let fetchedModule: ModuleNamespace | undefined;
    const isSelfUpdate = path === acceptedPath;

    // determine the qualified callbacks before we re-import the modules
    const qualifiedCallbacks = mod.callbacks.filter(({ deps }) =>
      deps.includes(acceptedPath)
    );

    if (isSelfUpdate || qualifiedCallbacks.length > 0) {
      const disposer = this.disposeMap.get(acceptedPath);
      if (disposer) {
        await disposer(this.dataMap.get(acceptedPath));
      }
      try {
        fetchedModule = await this.importUpdatedModule(update);
      } catch (error) {
        this.warnFailedUpdate(error, acceptedPath);
      }
    }

    return () => {
      for (const { deps, fn } of qualifiedCallbacks) {
        fn(
          deps.map((dep) => (dep === acceptedPath ? fetchedModule : undefined))
        );
      }
      const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
      this.logger.debug(`[vite] hot updated: ${loggedPath}`);
    };
  }
}
