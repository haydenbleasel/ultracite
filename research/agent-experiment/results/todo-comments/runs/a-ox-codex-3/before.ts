/*
 * Source:    vitejs/vite — packages/vite/src/node/server/hmr.ts, lines 12-158, 187-238 and 386-427
 * Commit:    ea95a1d44ab6f1a66701ae43c48f10b2047cb141 (2021-02-21T10:32:29+08:00)
 * Permalink: https://github.com/vitejs/vite/blob/ea95a1d44ab6f1a66701ae43c48f10b2047cb141/packages/vite/src/node/server/hmr.ts#L37-L54
 * Functions: handleHMRUpdate (exported) and what it calls in the same file: getShortName,
 *            updateModules, propagateUpdate, invalidate, readModifiedFile and restartServer.
 * Lines 12-158, 187-238 and 386-427 are copied, with their formatting changed (the import block,
 * the glob-import and pruning handlers and the import.meta.hot lexer are left out). Anything
 * marked STUB is not part of the original source.
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
import fs from "node:fs";
import path from "node:path";

// STUB (not part of the original source): what lines 1-10 import, reduced to what the copied
// functions use. `harness` supplies createServer and collects the debug log.
export const harness: {
  createServer: (inlineConfig?: unknown) => Promise<ViteDevServer>;
  debug: string[];
} = {
  createServer: async () => {
    throw new Error("harness.createServer is not installed");
  },
  debug: [],
};
const chalk = {
  dim: (text: string): string => text,
  green: (text: string): string => text,
};
function createServer(inlineConfig?: unknown): Promise<ViteDevServer> {
  return harness.createServer(inlineConfig);
}
function createDebugger(namespace: string): (...args: unknown[]) => void {
  return (...args) => {
    harness.debug.push(`${namespace} ${args.join(" ")}`);
  };
}
// STUB: Vite's normalizePath (src/node/utils.ts) on a POSIX system.
function normalizePath(id: string): string {
  return path.posix.normalize(id);
}
const CLIENT_DIR = "/vite/dist/client";
interface Update {
  type: "js-update" | "css-update";
  timestamp: number;
  path: string;
  acceptedPath: string;
}
interface TransformResult {
  code: string;
}
// STUB: the ModuleNode fields the copied functions use (src/node/server/moduleGraph.ts).
interface ModuleNode {
  url: string;
  file: string | null;
  type: "js" | "css";
  importers: Set<ModuleNode>;
  acceptedHmrDeps: Set<ModuleNode>;
  isSelfAccepting: boolean;
  transformResult: TransformResult | null;
  lastHMRTimestamp: number;
}
interface Logger {
  info(msg: string, options?: { clear?: boolean; timestamp?: boolean }): void;
}
interface Plugin {
  name: string;
  handleHotUpdate?(
    ctx: HmrContext
  ): ModuleNode[] | void | Promise<ModuleNode[] | void>;
}
// STUB: the ViteDevServer fields the copied functions use (src/node/server/index.ts).
interface ViteDevServer {
  config: {
    root: string;
    configFile: string | undefined;
    inlineConfig: unknown;
    logger: Logger;
    plugins: readonly Plugin[];
    server: { middlewareMode?: boolean };
  };
  ws: { send(payload: unknown): void };
  moduleGraph: { getModulesByFile(file: string): Set<ModuleNode> | undefined };
  close(): Promise<void>;
  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>;
}

export const debugHmr = createDebugger("vite:hmr");

const normalizedClientDir = normalizePath(CLIENT_DIR);

export interface HmrOptions {
  protocol?: string;
  host?: string;
  port?: number;
  path?: string;
  timeout?: number;
  overlay?: boolean;
}

export interface HmrContext {
  file: string;
  timestamp: number;
  modules: ModuleNode[];
  read: () => string | Promise<string>;
  server: ViteDevServer;
}

function getShortName(file: string, root: string) {
  return file.startsWith(`${root}/`) ? path.posix.relative(root, file) : file;
}

export async function handleHMRUpdate(
  file: string,
  server: ViteDevServer
): Promise<any> {
  const { ws, config, moduleGraph } = server;
  const shortFile = getShortName(file, config.root);

  if (file === config.configFile || file.endsWith(".env")) {
    // TODO auto restart server
    debugHmr(`[config change] ${chalk.dim(shortFile)}`);
    config.logger.info(
      chalk.green("config or .env file changed, restarting server..."),
      { clear: true, timestamp: true }
    );
    await restartServer(server);
    return;
  }

  debugHmr(`[file change] ${chalk.dim(shortFile)}`);

  // (dev only) the client itself cannot be hot updated.
  if (file.startsWith(normalizedClientDir)) {
    ws.send({
      path: "*",
      type: "full-reload",
    });
    return;
  }

  const mods = moduleGraph.getModulesByFile(file);

  // check if any plugin wants to perform custom HMR handling
  const timestamp = Date.now();
  const hmrContext: HmrContext = {
    file,
    modules: mods ? [...mods] : [],
    read: () => readModifiedFile(file),
    server,
    timestamp,
  };

  for (const plugin of config.plugins) {
    if (plugin.handleHotUpdate) {
      const filteredModules = await plugin.handleHotUpdate(hmrContext);
      if (filteredModules) {
        hmrContext.modules = filteredModules;
      }
    }
  }

  if (!hmrContext.modules.length) {
    // html file cannot be hot updated
    if (file.endsWith(".html")) {
      config.logger.info(chalk.green(`page reload `) + chalk.dim(shortFile), {
        clear: true,
        timestamp: true,
      });
      ws.send({
        path: config.server.middlewareMode
          ? "*"
          : `/${normalizePath(path.relative(config.root, file))}`,
        type: "full-reload",
      });
    } else {
      // loaded but not in the module graph, probably not js
      debugHmr(`[no modules matched] ${chalk.dim(shortFile)}`);
    }
    return;
  }

  updateModules(shortFile, hmrContext.modules, timestamp, server);
}

function updateModules(
  file: string,
  modules: ModuleNode[],
  timestamp: number,
  { config, ws }: ViteDevServer
) {
  const updates: Update[] = [];
  const invalidatedModules = new Set<ModuleNode>();

  for (const mod of modules) {
    const boundaries = new Set<{
      boundary: ModuleNode;
      acceptedVia: ModuleNode;
    }>();
    invalidate(mod, timestamp, invalidatedModules);
    const hasDeadEnd = propagateUpdate(mod, timestamp, boundaries);
    if (hasDeadEnd) {
      config.logger.info(chalk.green(`page reload `) + chalk.dim(file), {
        clear: true,
        timestamp: true,
      });
      ws.send({
        type: "full-reload",
      });
      return;
    }

    updates.push(
      ...[...boundaries].map(({ boundary, acceptedVia }) => ({
        acceptedPath: acceptedVia.url,
        path: boundary.url,
        timestamp,
        type: `${boundary.type}-update` as Update["type"],
      }))
    );
  }

  config.logger.info(
    updates
      .map(({ path }) => chalk.green(`hmr update `) + chalk.dim(path))
      .join("\n"),
    { clear: true, timestamp: true }
  );

  ws.send({
    type: "update",
    updates,
  });
}

function propagateUpdate(
  node: ModuleNode,
  timestamp: number,
  boundaries: Set<{
    boundary: ModuleNode;
    acceptedVia: ModuleNode;
  }>,
  currentChain: ModuleNode[] = [node]
): boolean /* hasDeadEnd */ {
  if (node.isSelfAccepting) {
    boundaries.add({
      acceptedVia: node,
      boundary: node,
    });
    return false;
  }

  if (!node.importers.size) {
    return true;
  }

  for (const importer of node.importers) {
    const subChain = currentChain.concat(importer);
    if (importer.acceptedHmrDeps.has(node)) {
      boundaries.add({
        acceptedVia: node,
        boundary: importer,
      });
      continue;
    }

    if (currentChain.includes(importer)) {
      // circular deps is considered dead end
      return true;
    }

    if (propagateUpdate(importer, timestamp, boundaries, subChain)) {
      return true;
    }
  }
  return false;
}

function invalidate(mod: ModuleNode, timestamp: number, seen: Set<ModuleNode>) {
  if (seen.has(mod)) {
    return;
  }
  seen.add(mod);
  mod.lastHMRTimestamp = timestamp;
  mod.transformResult = null;
  mod.importers.forEach((importer) => invalidate(importer, timestamp, seen));
}

// vitejs/vite#610 when hot-reloading Vue files, we read immediately on file
// change event and sometimes this can be too early and get an empty buffer.
// Poll until the file's modified time has changed before reading again.
async function readModifiedFile(file: string): Promise<string> {
  const content = fs.readFileSync(file, "utf-8");
  if (content) {
    return content;
  }
  const mtime = fs.statSync(file).mtimeMs;
  await new Promise((r) => {
    let n = 0;
    const poll = async () => {
      n++;
      const newMtime = fs.statSync(file).mtimeMs;
      if (newMtime !== mtime || n > 10) {
        r(0);
      } else {
        setTimeout(poll, 10);
      }
    };
    setTimeout(poll, 10);
  });
  return fs.readFileSync(file, "utf-8");
}

async function restartServer(server: ViteDevServer) {
  await server.close();
  (global as any).__vite_start_time = Date.now();
  const newServer = await createServer(server.config.inlineConfig);
  for (const key in newServer) {
    if (key !== "app") {
      // @ts-expect-error
      server[key] = newServer[key];
    }
  }
  if (server.config.server.middlewareMode) {
    server.config.logger.info("server restarted.", { timestamp: true });
  } else {
    await server.listen(undefined, true);
  }
}
