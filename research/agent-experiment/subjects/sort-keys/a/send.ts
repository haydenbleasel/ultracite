/*
 * Source:    vitejs/vite — packages/vite/src/node/server/send.ts, lines 13-101 (the whole file but its
 *            imports)
 * Commit:    3b72997d42e7dd2b31898d0e68461e3025e836b6 (2026-10-10T00:29:11+08:00)
 * Permalink: https://github.com/vitejs/vite/blob/3b72997d42e7dd2b31898d0e68461e3025e836b6/packages/vite/src/node/server/send.ts#L18-L23
 * Function:  send(), which Vite's dev server uses to answer a request with a transformed module:
 *   Content-Type, Cache-Control and Etag headers, a 304 for a matching If-None-Match, and an
 *   inline source map for JS and CSS.
 * Lines 13-101 are copied, with their formatting changed. The stubs above them replace its
 * imports. Anything marked STUB is not part of the original source.
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

// STUB (not part of the original source): what lines 1-12 import. node:http's types and node:path
// are the real ones. convert-source-map's regex is copied from convert-source-map 2.0.0, and
// genSourceMapUrl and getCodeWithSourcemap from packages/vite/src/node/server/sourcemap.ts at the
// same commit, without its debug output. etag, magic-string, createDebugger and
// removeTimestampQuery are reduced to what send() uses, and report their calls to `harness`.
import path from "node:path";
import type {
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from "node:http";

interface SourceMap {
  mappings: string;
  version: number;
}

export const harness = {
  calls: [] as unknown[][],
};

const convertSourceMap = {
  get mapFileCommentRegex(): RegExp {
    return /(?:\/\/[@#][ \t]+?sourceMappingURL=([^\s'"`]+?)[ \t]*?$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*?(?:\*\/){1}[ \t]*?$)/gm;
  },
};

const getEtag = (
  content: string | Buffer,
  options: { weak: boolean }
): string => {
  harness.calls.push(["etag", options.weak]);
  return `${options.weak ? "W/" : ""}"${content.length.toString(16)}"`;
};

class MagicString {
  private code: string;
  constructor(code: string) {
    this.code = code;
  }
  generateMap(options: {
    hires?: boolean | "boundary";
    includeContent?: boolean;
    source?: string;
  }): SourceMap {
    harness.calls.push([
      "generateMap",
      options.source,
      options.hires,
      options.includeContent,
    ]);
    return {
      mappings: `AAAA;${this.code.split("\n").length}`,
      version: 3,
    };
  }
}

const createDebugger = (
  namespace: string,
  _options: { onlyWhenFocused?: boolean }
): ((message: string) => void) | undefined => {
  harness.calls.push(["createDebugger", namespace]);
  return (message: string) => {
    harness.calls.push(["debug", message]);
  };
};

const timestampRE = /(\?|&)t=\d{13}(?:&|$)/;
const trailingSeparatorRE = /[?&]$/;
const removeTimestampQuery = (url: string): string =>
  url.replace(timestampRE, "$1").replace(trailingSeparatorRE, "");

const genSourceMapUrl = (map: SourceMap | string): string => {
  if (typeof map !== "string") {
    map = JSON.stringify(map);
  }
  return `data:application/json;base64,${Buffer.from(map).toString("base64")}`;
};

const getCodeWithSourcemap = (
  type: "js" | "css",
  code: string,
  map: SourceMap
): string => {
  if (type === "js") {
    code += `\n//# sourceMappingURL=${genSourceMapUrl(map)}`;
  } else if (type === "css") {
    code += `\n/*# sourceMappingURL=${genSourceMapUrl(map)} */`;
  }
  return code;
};
// END STUB

const debug = createDebugger("vite:send", {
  onlyWhenFocused: true,
});

const alias: Record<string, string | undefined> = {
  js: "text/javascript",
  css: "text/css",
  html: "text/html",
  json: "application/json",
};

export interface SendOptions {
  etag?: string;
  cacheControl?: string;
  headers?: OutgoingHttpHeaders;
  map?: SourceMap | { mappings: "" } | null;
}

export function send(
  request: IncomingMessage,
  res: ServerResponse,
  content: string | Buffer,
  type: string,
  options: SendOptions
): void {
  const {
    etag = getEtag(content, { weak: true }),
    cacheControl = "no-cache",
    headers,
    map,
  } = options;

  if (res.writableEnded) {
    return;
  }

  if (request.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }

  res.setHeader("Content-Type", alias[type] || type);
  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Etag", etag);

  if (headers) {
    for (const name in headers) {
      res.setHeader(name, headers[name]!);
    }
  }

  // inject source map reference
  if (map && "version" in map && map.mappings) {
    if (type === "js" || type === "css") {
      content = getCodeWithSourcemap(type, content.toString(), map);
    }
  }
  // inject fallback sourcemap for js for improved debugging
  // https://github.com/vitejs/vite/pull/13514#issuecomment-1592431496
  else if (type === "js" && (!map || map.mappings !== "")) {
    const code = content.toString();
    // if the code has existing inline sourcemap, assume it's correct and skip
    if (convertSourceMap.mapFileCommentRegex.test(code)) {
      debug?.(`Skipped injecting fallback sourcemap for ${request.url}`);
    } else {
      const urlWithoutTimestamp = removeTimestampQuery(request.url!);
      const ms = new MagicString(code);
      content = getCodeWithSourcemap(
        type,
        code,
        ms.generateMap({
          source: path.basename(urlWithoutTimestamp),
          hires: "boundary",
          includeContent: true,
        }) as SourceMap
      );
    }
  }

  res.statusCode = 200;
  if (request.method === "HEAD") {
    res.end();
  } else {
    res.end(content);
  }
}
