/*
 * Source:    vitejs/vite — packages/vite/src/node/plugins/clientInjections.ts, L21-153 (the file up
 *            to the end of createClientConfigValueReplacer, without its imports)
 * Commit:    3b72997d42e7dd2b31898d0e68461e3025e836b6 (2026-10-10T00:29:11+08:00)
 * Permalink: https://github.com/vitejs/vite/blob/3b72997d42e7dd2b31898d0e68461e3025e836b6/packages/vite/src/node/plugins/clientInjections.ts#L82-L153
 * Function:  createClientConfigValueReplacer(config), in Vite's clientInjectionsPlugin, which
 *   injects config values into the dev server's browser client.
 * L21-153 are copied, with their formatting changed. The stubs above them replace its imports
 * (L1-19). Anything marked STUB is not part of the original source.
 *
 * License of the source repository (vitejs/vite/LICENSE at the commit above), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2019-present, VoidZero Inc. and Vite contributors
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

// STUB (not part of the original source): what L1-19 import, reduced to what L21-153 use. node:path is the real one. cleanUrl, normalizePath, isObject and perEnvironmentState are
// copied from packages/vite/src/shared/utils.ts, src/node/utils.ts and src/node/environment.ts at
// the same commit; serializeDefine from src/node/plugins/define.ts. resolveHostname is the same
// function without its DNS lookup for "localhost" (it returns "localhost"). The entry paths are
// constant strings instead of paths resolved from the installed package. replaceDefine reports its
// call instead of running esbuild. ResolvedConfig and Plugin are reduced to the fields used here.
import path from "node:path";

const CLIENT_ENTRY = "/vite/dist/client/client.mjs";
const BUNDLED_DEV_CLIENT_ENTRY = "/vite/dist/client/bundledDevClient.mjs";
const ENV_ENTRY = "/vite/dist/client/env.mjs";

interface ResolvedConfig {
  base: string;
  configFile: string | undefined;
  mode: string;
  webSocketToken: string;
  experimental: { hmrPartialAccept: boolean };
  server: {
    host?: string | boolean;
    port?: number;
    middlewareMode?: boolean;
    forwardConsole?: unknown;
    ws?:
      | false
      | {
          host?: string;
          protocol?: string;
          timeout?: number;
          server?: unknown;
          clientPort?: number;
          port?: number;
          path?: string;
        };
    hmr?: boolean | { overlay?: boolean };
  };
}
interface Environment {
  config: {
    consumer: "client" | "server";
    define?: Record<string, any>;
    isBundled?: boolean;
  };
}
interface PluginContext {
  environment: Environment;
}
interface Plugin {
  name: string;
  applyToEnvironment?: (environment: Environment) => boolean;
  buildStart?: () => Promise<void>;
  transform?: (this: PluginContext, code: string, id: string) => unknown;
}

const postfixRE = /[?#].*$/;
function cleanUrl(url: string): string {
  return url.replace(postfixRE, "");
}
function normalizePath(id: string): string {
  return path.posix.normalize(id);
}
function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === "[object Object]";
}
const wildcardHosts = new Set([
  "0.0.0.0",
  "::",
  "0000:0000:0000:0000:0000:0000:0000:0000",
]);
async function resolveHostname(
  optionsHost: string | boolean | undefined
): Promise<{ host: string | undefined; name: string }> {
  let host: string | undefined;
  if (optionsHost === undefined || optionsHost === false) {
    host = "localhost";
  } else if (optionsHost === true) {
    host = undefined;
  } else {
    host = optionsHost;
  }
  const name =
    host === undefined || wildcardHosts.has(host) ? "localhost" : host;
  return { host, name };
}
function perEnvironmentState<State>(
  initial: (environment: Environment) => State
): (context: PluginContext) => State {
  const stateMap = new WeakMap<Environment, State>();
  return function (context: PluginContext) {
    const { environment } = context;
    if (!stateMap.has(environment)) {
      stateMap.set(environment, initial(environment));
    }
    return stateMap.get(environment)!;
  };
}
function serializeDefine(define: Record<string, any>): string {
  let res = `{`;
  const keys = Object.keys(define).sort();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = define[key];
    const text =
      val === undefined
        ? "undefined"
        : typeof val === "string"
          ? val
          : JSON.stringify(val);
    res += `${JSON.stringify(key)}: ${text}`;
    if (i !== keys.length - 1) {
      res += `, `;
    }
  }
  return `${res}}`;
}
const replaceDefine = (
  ...args: [Environment, string, string, Record<string, string>]
): {
  code: string;
  replaceDefine: { id: string; define: Record<string, string> };
} => ({
  code: args[1],
  replaceDefine: { define: args[3], id: args[2] },
});
// ── end of STUB ────────────────────────────────────────────────────────

// ids in transform are normalized to unix style
const normalizedClientEntry = normalizePath(CLIENT_ENTRY);
const normalizedBundledDevClientEntry = normalizePath(BUNDLED_DEV_CLIENT_ENTRY);
const normalizedEnvEntry = normalizePath(ENV_ENTRY);

/**
 * some values used by the client needs to be dynamically injected by the server
 * @server-only
 */
export function clientInjectionsPlugin(config: ResolvedConfig): Plugin {
  let injectConfigValues: (code: string) => string;

  const getDefineReplacer = perEnvironmentState((environment) => {
    const userDefine: Record<string, any> = {};
    for (const key in environment.config.define) {
      // import.meta.env.* is handled in `importAnalysis` plugin
      if (!key.startsWith("import.meta.env.")) {
        userDefine[key] = environment.config.define[key];
      }
    }
    const serializedDefines = serializeDefine(userDefine);
    const definesReplacement = () => serializedDefines;
    return (code: string) => code.replace(`__DEFINES__`, definesReplacement);
  });

  return {
    applyToEnvironment(environment) {
      return !environment.config.isBundled;
    },
    async buildStart() {
      injectConfigValues = await createClientConfigValueReplacer(config);
    },
    name: "vite:client-inject",
    transform(code, id) {
      const ssr = this.environment.config.consumer === "server";
      const cleanId = cleanUrl(id);
      if (cleanId === normalizedClientEntry || cleanId === normalizedEnvEntry) {
        const defineReplacer = getDefineReplacer(this);
        return defineReplacer(injectConfigValues(code));
      } else if (!ssr && code.includes("process.env.NODE_ENV")) {
        // replace process.env.NODE_ENV instead of defining a global
        // for it to avoid shimming a `process` object during dev,
        // avoiding inconsistencies between dev and build
        const nodeEnv =
          this.environment.config.define?.["process.env.NODE_ENV"] ||
          JSON.stringify(process.env.NODE_ENV || config.mode);
        return replaceDefine(this.environment, code, id, {
          "global.process.env.NODE_ENV": nodeEnv,
          "globalThis.process.env.NODE_ENV": nodeEnv,
          "process.env.NODE_ENV": nodeEnv,
        });
      }
    },
  };
}

function escapeReplacement(value: string | number | boolean | null) {
  const jsonValue = JSON.stringify(value);
  return () => jsonValue;
}

function createHmrReplacements(
  config: ResolvedConfig,
  resolvedServerHostname: string,
  resolvedServerPort: number
) {
  const devBase = config.base;
  const wsConfig = isObject(config.server.ws) ? config.server.ws : undefined;
  const host = wsConfig?.host || null;
  const protocol = wsConfig?.protocol || null;
  const timeout = wsConfig?.timeout || 30_000;
  const isWsServerSpecified = !!wsConfig?.server;
  const hmrConfigName = path.basename(config.configFile || "vite.config.js");

  const hmrConfig = isObject(config.server.hmr) ? config.server.hmr : undefined;
  const overlay = hmrConfig?.overlay !== false;

  // ws.clientPort -> ws.port
  // -> (24678 if middleware mode and WS server is not specified) -> new URL(import.meta.url).port
  let port = wsConfig?.clientPort || wsConfig?.port || null;
  if (config.server.middlewareMode && !isWsServerSpecified) {
    port ||= 24_678;
  }

  let directTarget = wsConfig?.host || resolvedServerHostname;
  directTarget += `:${wsConfig?.port || resolvedServerPort}`;
  directTarget += devBase;

  let hmrBase = devBase;
  if (wsConfig?.path) {
    hmrBase = path.posix.join(hmrBase, wsConfig.path);
  }

  return {
    base: escapeReplacement(hmrBase),
    configName: escapeReplacement(hmrConfigName),
    directTarget: escapeReplacement(directTarget),
    enableOverlay: escapeReplacement(overlay),
    hostname: escapeReplacement(host),
    partialAccept: escapeReplacement(config.experimental.hmrPartialAccept),
    port: escapeReplacement(port),
    protocol: escapeReplacement(protocol),
    timeout: escapeReplacement(timeout),
  };
}

async function createClientConfigValueReplacer(
  config: ResolvedConfig
): Promise<(code: string) => string> {
  const resolvedServerHostname = (await resolveHostname(config.server.host))
    .name;
  const resolvedServerPort = config.server.port!;
  const devBase = config.base;

  const serverHost = `${resolvedServerHostname}:${resolvedServerPort}${devBase}`;

  const hmr = createHmrReplacements(
    config,
    resolvedServerHostname,
    resolvedServerPort
  );

  const modeReplacement = escapeReplacement(config.mode);
  const baseReplacement = escapeReplacement(devBase);
  const serverHostReplacement = escapeReplacement(serverHost);
  const wsTokenReplacement = escapeReplacement(config.webSocketToken);
  const serverForwardConsoleReplacement = escapeReplacement(
    config.server.forwardConsole as any
  );

  return (code) =>
    code
      .replace(`__MODE__`, modeReplacement)
      .replaceAll("__BASE__", baseReplacement)
      .replace(`__SERVER_HOST__`, serverHostReplacement)
      .replace(`__HMR_PROTOCOL__`, hmr.protocol)
      .replace(`__HMR_HOSTNAME__`, hmr.hostname)
      .replace(`__HMR_PORT__`, hmr.port)
      .replace(`__HMR_DIRECT_TARGET__`, hmr.directTarget)
      .replace(`__HMR_BASE__`, hmr.base)
      .replace(`__HMR_TIMEOUT__`, hmr.timeout)
      .replace(`__HMR_ENABLE_OVERLAY__`, hmr.enableOverlay)
      .replace(`__HMR_CONFIG_NAME__`, hmr.configName)
      .replace(`__HMR_PARTIAL_ACCEPT__`, hmr.partialAccept)
      .replace(`__WS_TOKEN__`, wsTokenReplacement)
      .replace(`__SERVER_FORWARD_CONSOLE__`, serverForwardConsoleReplacement);
}
