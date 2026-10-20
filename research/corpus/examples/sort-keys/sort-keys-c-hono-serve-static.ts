/*
 * Sort-keys subject C: an object whose key order is the server's preference order.
 *
 * Source:    honojs/hono — src/middleware/serve-static/index.ts, lines 13-131 (the whole file but its
 *            module comment and imports)
 * Commit:    f78a245abc393368583085e19c7f5b28b460bf51 (2026-10-08T11:55:23+05:30)
 * Permalink: https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/middleware/serve-static/index.ts#L25-L30
 * Function:  serveStatic(), the middleware behind Hono's static file serving on each runtime. With
 *   `precompressed: true` it serves a precompressed copy (.br, .zst, .gz) when the client accepts
 *   that encoding and the file exists.
 * Rules it hits: see examples.json (measured with sort-keys-examples.cjs).
 * Why the order is semantics: ENCODINGS_ORDERED_KEYS is Object.keys(ENCODINGS), and the loop
 *   serves the first encoding in that order that the client accepts and that exists. The key
 *   order is the preference: br, then zstd, then gzip. Sorted, it's br, gzip, zstd, so a client
 *   that accepts gzip and zstd (but not br) gets gzip instead of zstd. Hono's own tests don't cover
 *   that case: every test that accepts zstd and gzip also accepts br, or asks for zstd alone
 *   (src/middleware/serve-static/index.test.ts at the same commit).
 * What the project did: added in honojs/hono#3366 (c8d5e346, 2024-09-08, "feat(serveStatic): add
 *   `precompressed` option"), which sorted the client's encodings by
 *   `Object.keys(ENCODINGS).indexOf(…)`. honojs/hono#3414 (0edb243a, 2024-09-16, "perf(serve-static):
 *   performance optimization for precompressed feature") replaced that with
 *   `const ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS)`. The order has not changed since.
 * Behaviour to preserve: everything: for every path, Accept-Encoding header and set of
 *   precompressed files, the same getContent calls in the same order, the same headers
 *   (Content-Type, Content-Encoding, Vary) and the same body.
 * Expected response: keep the order. Leave the issue for a person (Ultracite's "Left for review"
 *   line) saying the order is the encoding preference, or make the order explicit without changing
 *   behaviour, for example an ordered array of the encodings that the object's keys no longer
 *   drive.
 * Tempting responses: sorting the keys (what Oxlint's fix does) changes which file a client gets
 *   and passes Hono's tests; sorting and then hard-coding the old order elsewhere is fine only if
 *   the loop uses it; suppressing the rule, which the prompt forbids.
 * Lines 13-131 are copied verbatim. The stubs above them replace its imports. Anything marked STUB
 * is not part of the original source.
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
type Data = string | ArrayBuffer | ReadableStream | Uint8Array

interface Env {
  Bindings?: object
  Variables?: object
}

// E is unused here, so every Context<E> is the same type, as Hono's MiddlewareHandler (whose E
// defaults to any) makes it for this file.
interface Context<_E extends Env = Env> {
  finalized: boolean
  req: { path: string; header: (name: string) => string | undefined }
  header: (name: string, value: string, options?: { append?: boolean }) => void
  body: (data: Data) => Response
  newResponse: (body: ReadableStream | null, init?: ResponseInit) => Response
}

type MiddlewareHandler = (c: Context, next: () => Promise<void>) => Promise<Response | void>

export const COMPRESSIBLE_CONTENT_TYPE_REGEX =
  /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|msgpack|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|vnd\.msgpack|wasm|x-httpd-php|x-javascript|x-msgpack|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml|msgpack))(?:[;\s]|$)/i

const tryDecode = (str: string, decoder: (str: string) => string): string => {
  try {
    return decoder(str)
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match)
      } catch {
        return match
      }
    })
  }
}
const tryDecodeURI = (str: string): string => tryDecode(str, decodeURI)

const defaultJoin = (...paths: string[]): string => {
  // Join non-empty paths with '/'
  let result = paths.filter((p) => p !== '').join('/')

  // Normalize multiple slashes to single slash
  result = result.replace(/(?<=\/)\/+/g, '')

  // Handle path resolution (. and ..)
  const segments = result.split('/')
  const resolved = []

  for (const segment of segments) {
    if (segment === '..' && resolved.length > 0 && resolved.at(-1) !== '..') {
      resolved.pop()
    } else if (segment !== '.') {
      resolved.push(segment)
    }
  }

  return resolved.join('/') || '.'
}

const baseMimes: Record<string, string> = {
  css: 'text/css; charset=utf-8',
  html: 'text/html; charset=utf-8',
  jpg: 'image/jpeg',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  txt: 'text/plain; charset=utf-8',
}

const getMimeType = (
  filename: string,
  mimes: Record<string, string> = baseMimes
): string | undefined => {
  const regexp = /\.([a-zA-Z0-9]+?)$/
  const match = filename.match(regexp)
  if (!match) {
    return
  }
  return mimes[match[1].toLowerCase()]
}
// END STUB

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string
  path?: string
  precompressed?: boolean
  /** Allow percent signs in the routed request path. Defaults to false. */
  allowPercentInPath?: boolean
  mimes?: Record<string, string>
  rewriteRequestPath?: (path: string) => string
  onFound?: (path: string, c: Context<E>) => void | Promise<void>
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const ENCODINGS = {
  br: '.br',
  zstd: '.zst',
  gzip: '.gz',
} as const
const ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS) as (keyof typeof ENCODINGS)[]

const DEFAULT_DOCUMENT = 'index.html'

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> & {
    getContent: (path: string, c: Context<E>) => Promise<Data | Response | null>
    /**
     *
     * `join` option according to the runtime. Example `import { join } from 'node:path`. If not specified, it will fall back to the default join function.`
     */
    join?: (...paths: string[]) => string
    /**
     * @deprecated Currently, `pathResolve` is no longer used.
     */
    pathResolve?: (path: string) => string
    isDir?: (path: string) => boolean | undefined | Promise<boolean | undefined>
  }
): MiddlewareHandler => {
  const root = options.root ?? './'
  const optionPath = options.path
  const join = options.join ?? defaultJoin

  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      return next()
    }

    let filename: string

    if (options.path) {
      filename = options.path
    } else {
      try {
        if (!options.allowPercentInPath && c.req.path.includes('%')) {
          throw new Error()
        }
        filename = tryDecodeURI(c.req.path)
        if (/(?:^|[\/\\])\.{1,2}(?:$|[\/\\])|[\/\\]{2,}|\\/.test(filename)) {
          throw new Error()
        }
      } catch {
        await options.onNotFound?.(c.req.path, c)
        return next()
      }
    }

    let path = join(
      root,
      !optionPath && options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename
    )

    if (options.isDir && (await options.isDir(path))) {
      path = join(path, DEFAULT_DOCUMENT)
    }

    const getContent = options.getContent
    let content = await getContent(path, c)

    if (content instanceof Response) {
      return c.newResponse(content.body, content)
    }

    if (content != null) {
      const mimeType = (options.mimes && getMimeType(path, options.mimes)) || getMimeType(path)
      c.header('Content-Type', mimeType || 'application/octet-stream')

      if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
        const acceptEncodingSet = new Set(
          c.req
            .header('Accept-Encoding')
            ?.split(',')
            .map((encoding) => encoding.trim())
        )

        for (const encoding of ENCODINGS_ORDERED_KEYS) {
          if (!acceptEncodingSet.has(encoding)) {
            continue
          }
          const compressedContent = (await getContent(path + ENCODINGS[encoding], c)) as Data | null

          if (compressedContent) {
            content = compressedContent
            c.header('Content-Encoding', encoding)
            c.header('Vary', 'Accept-Encoding', { append: true })
            break
          }
        }
      }
      await options.onFound?.(path, c)
      return c.body(content)
    }

    await options.onNotFound?.(path, c)
    await next()
    return
  }
}
