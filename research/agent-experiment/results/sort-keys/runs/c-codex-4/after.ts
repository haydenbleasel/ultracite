/*
 * Source:    honojs/hono — src/middleware/serve-static/index.ts, lines 13-131 (the whole file but its
 *            module comment and imports)
 * Commit:    f78a245abc393368583085e19c7f5b28b460bf51 (2026-10-08T11:55:23+05:30)
 * Permalink: https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/middleware/serve-static/index.ts#L25-L30
 * Function:  serveStatic(), the middleware behind Hono's static file serving on each runtime. With
 *   `precompressed: true` it serves a precompressed copy (.br, .zst, .gz) when the client accepts
 *   that encoding and the file exists.
 * Lines 13-131 are copied, with their formatting changed. The stubs above them replace its
 * imports. Anything marked STUB is not part of the original source.
 *
 * License of the source repository (honojs/hono/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2021 - present, Yusuke Wada and Hono contributors
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

// STUB (not part of the original source): what lines 6-11 import, reduced to what this file uses.
// COMPRESSIBLE_CONTENT_TYPE_REGEX is copied from src/utils/compress.ts, tryDecode and
// tryDecodeURI from src/utils/url.ts, defaultJoin from ./path.ts and getMimeType from
// src/utils/mime.ts, all at the same commit; getMimeType's default table is cut down to six
// types. The types keep only the members this file touches.
type Data = string | ArrayBuffer | ReadableStream | Uint8Array;

interface Environment {
  Bindings?: object;
  Variables?: object;
}

// E is unused here, so every Context<E> is the same type, as Hono's MiddlewareHandler (whose E
// defaults to any) makes it for this file.
interface Context<_E extends Environment = Environment> {
  finalized: boolean;
  req: { path: string; header: (name: string) => string | undefined };
  header: (name: string, value: string, options?: { append?: boolean }) => void;
  body: (data: Data) => Response;
  newResponse: (body: ReadableStream | null, init?: ResponseInit) => Response;
}

type MiddlewareHandler = (
  c: Context,
  next: () => Promise<void>
) => Promise<Response | void>;

export const COMPRESSIBLE_CONTENT_TYPE_REGEX =
  /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|msgpack|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|vnd\.msgpack|wasm|x-httpd-php|x-javascript|x-msgpack|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml|msgpack))(?:[;\s]|$)/i;

const tryDecode = (
  string_: string,
  decoder: (string__: string) => string
): string => {
  try {
    return decoder(string_);
  } catch {
    return string_.replaceAll(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
};
const tryDecodeURI = (string_: string): string => tryDecode(string_, decodeURI);

const defaultJoin = (...paths: string[]): string => {
  // Join non-empty paths with '/'
  let result = paths.filter((p) => p !== "").join("/");

  // Normalize multiple slashes to single slash
  result = result.replaceAll(/(?<=\/)\/+/g, "");

  // Handle path resolution (. and ..)
  const segments = result.split("/");
  const resolved = [];

  for (const segment of segments) {
    if (segment === ".." && resolved.length > 0 && resolved.at(-1) !== "..") {
      resolved.pop();
    } else if (segment !== ".") {
      resolved.push(segment);
    }
  }

  return resolved.join("/") || ".";
};

const baseMimes: Record<string, string> = {
  css: "text/css; charset=utf-8",
  html: "text/html; charset=utf-8",
  jpg: "image/jpeg",
  js: "text/javascript; charset=utf-8",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
};

const getMimeType = (
  filename: string,
  mimes: Record<string, string> = baseMimes
): string | undefined => {
  const regexp = /\.([a-zA-Z0-9]+?)$/;
  const match = filename.match(regexp);
  if (!match) {
    return;
  }
  return mimes[match[1].toLowerCase()];
};
// END STUB

export interface ServeStaticOptions<E extends Environment = Environment> {
  root?: string;
  path?: string;
  precompressed?: boolean;
  /**
  Allow percent signs in the routed request path. Defaults to false.
  */
  allowPercentInPath?: boolean;
  mimes?: Record<string, string>;
  rewriteRequestPath?: (path: string) => string;
  onFound?: (path: string, c: Context<E>) => void | Promise<void>;
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>;
}

const ENCODINGS = {
  br: ".br",
  gzip: ".gz",
  zstd: ".zst",
} as const;
const ENCODINGS_ORDERED_KEYS: (keyof typeof ENCODINGS)[] = [
  "br",
  "zstd",
  "gzip",
];

const DEFAULT_DOCUMENT = "index.html";

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Environment = Environment>(
  options: ServeStaticOptions<E> & {
    getContent: (
      path: string,
      c: Context<E>
    ) => Promise<Data | Response | null>;
    /**
     *
     * `join` option according to the runtime. Example `import { join } from 'node:path`. If not specified, it will fall back to the default join function.`
     */
    join?: (...paths: string[]) => string;
    /**
     * @deprecated Currently, `pathResolve` is no longer used.
     */
    pathResolve?: (path: string) => string;
    isDir?: (
      path: string
    ) => boolean | undefined | Promise<boolean | undefined>;
  }
): MiddlewareHandler => {
  const root = options.root ?? "./";
  const optionPath = options.path;
  const join = options.join ?? defaultJoin;

  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      return next();
    }

    let filename: string;

    if (options.path) {
      filename = options.path;
    } else {
      try {
        if (!options.allowPercentInPath && c.req.path.includes("%")) {
          throw new Error();
        }
        filename = tryDecodeURI(c.req.path);
        if (/(?:^|[\/\\])\.{1,2}(?:$|[\/\\])|[\/\\]{2,}|\\/.test(filename)) {
          throw new Error();
        }
      } catch {
        await options.onNotFound?.(c.req.path, c);
        return next();
      }
    }

    let path = join(
      root,
      !optionPath && options.rewriteRequestPath
        ? options.rewriteRequestPath(filename)
        : filename
    );

    if (options.isDir && (await options.isDir(path))) {
      path = join(path, DEFAULT_DOCUMENT);
    }

    const { getContent } = options;
    let content = await getContent(path, c);

    if (content instanceof Response) {
      return c.newResponse(content.body, content);
    }

    if (content != null) {
      const mimeType =
        (options.mimes && getMimeType(path, options.mimes)) ||
        getMimeType(path);
      c.header("Content-Type", mimeType || "application/octet-stream");

      if (
        options.precompressed &&
        (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))
      ) {
        const acceptEncodingSet = new Set(
          c.req
            .header("Accept-Encoding")
            ?.split(",")
            .map((encoding) => encoding.trim())
        );

        for (const encoding of ENCODINGS_ORDERED_KEYS) {
          if (!acceptEncodingSet.has(encoding)) {
            continue;
          }
          const compressedContent = (await getContent(
            path + ENCODINGS[encoding],
            c
          )) as Data | null;

          if (compressedContent) {
            content = compressedContent;
            c.header("Content-Encoding", encoding);
            c.header("Vary", "Accept-Encoding", { append: true });
            break;
          }
        }
      }
      await options.onFound?.(path, c);
      return c.body(content);
    }

    await options.onNotFound?.(path, c);
    await next();
  };
};
