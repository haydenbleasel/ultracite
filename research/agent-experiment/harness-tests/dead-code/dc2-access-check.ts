/*
 * Source:    vitejs/vite — packages/vite/src/node/server/middlewares/static.ts, lines 125-208
 * Commit:    3b72997d42e7dd2b31898d0e68461e3025e836b6 (2026-10-09T16:29:11Z)
 * Permalink: https://github.com/vitejs/vite/blob/3b72997d42e7dd2b31898d0e68461e3025e836b6/packages/vite/src/node/server/middlewares/static.ts#L125-L208
 * Function:  serveStaticMiddleware (exported declaration) and applyStaticAlias, the next function in
 *            the file, which it calls.
 * Lines 125-208 are copied verbatim. The helpers below the license are copied verbatim from the files
 * named on each; anything marked STUB is not part of the original source.
 *
 * License of the source repository (vitejs/vite/LICENSE), reproduced in full:
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

// Hand-made mutant for the oracle self-test, not agent output: "use" `fileUrl` in an access check against the root. A no-op: fileUrl is path.resolve(dir, <relative path>) after the URL parser has removed `..`, so it never leaves the root.
import type { ServerResponse } from 'node:http'
import path from 'node:path'

// STUB (not part of the original source): the types the middleware names, reduced to what it uses.
interface Alias {
  find: string | RegExp
  replacement: string
}
type NextFunction = (err?: unknown) => void
interface IncomingMessage {
  url?: string
}
declare namespace Connect {
  type NextHandleFunction = (
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFunction,
  ) => void
}
interface ViteDevServer {
  config: {
    root: string
    resolve: { alias: Alias[] }
    server: { headers?: Record<string, string> }
  }
}

// STUB (not part of the original source): sirv and sirvOptions. Vite's sirvOptions installs a
// shouldServe hook that throws an error with code ERR_DENIED_FILE for files outside server.fs.allow.
// The stub hands each request to a handler the test harness installs.
type Handler = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void
export const harness: {
  denied: string[]
  roots: string[]
  served: { status: number; url: string | undefined }[]
  serve: Handler
} = {
  denied: [],
  roots: [],
  served: [],
  serve: (req, res, next) => {
    harness.served.push({ status: res.statusCode, url: req.url })
    next()
  },
}
const sirv = (dir: string, options: unknown): Handler => {
  harness.roots.push(dir)
  void options
  return (req, res, next) => harness.serve(req, res, next)
}
const sirvOptions = (options: {
  config: ViteDevServer['config']
  getHeaders: () => Record<string, string> | undefined
}): unknown => options
function respondWithAccessDenied(
  id: string,
  _server: ViteDevServer,
  res: ServerResponse,
): void {
  harness.denied.push(id)
  res.statusCode = 403
  res.end()
}

// Verbatim: packages/vite/src/node/server/middlewares/static.ts line 31
const ERR_DENIED_FILE = 'ERR_DENIED_FILE'

// Verbatim: packages/vite/src/shared/utils.ts lines 31-34 and 48-53
const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}
export function withTrailingSlash(path: string): string {
  if (path.at(-1) !== '/') {
    return `${path}/`
  }
  return path
}

// Verbatim: packages/vite/src/node/utils.ts lines 312-322 (internal prefixes inlined from
// src/node/constants.ts L115-118 and src/shared/constants.ts L4: STUB values, same strings)
const FS_PREFIX = `/@fs/`
const VALID_ID_PREFIX = `/@id/`
const CLIENT_PUBLIC_PATH = `/@vite/client`
const ENV_PUBLIC_PATH = `/@vite/env`
const internalPrefixes = [
  FS_PREFIX,
  VALID_ID_PREFIX,
  CLIENT_PUBLIC_PATH,
  ENV_PUBLIC_PATH,
]
const InternalPrefixRE = new RegExp(`^(?:${internalPrefixes.join('|')})`)
export const isInternalRequest = (url: string): boolean =>
  InternalPrefixRE.test(url)

// Verbatim: packages/vite/src/node/utils.ts lines 1759-1761 and 1915-1922
export function removeLeadingSlash(str: string): string {
  return str[0] === '/' ? str.slice(1) : str
}

export function decodeURIIfPossible(input: string): string | undefined {
  try {
    return decodeURI(input)
  } catch {
    // url is malformed, probably a interpolate syntax of template engines
    return
  }
}

export function serveStaticMiddleware(
  server: ViteDevServer,
): Connect.NextHandleFunction {
  const dir = server.config.root
  const serve = sirv(
    dir,
    sirvOptions({
      config: server.config,
      getHeaders: () => server.config.server.headers,
    }),
  )

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function viteServeStaticMiddleware(req, res, next) {
    // only serve the file if it's not an html request or ends with `/`
    // so that html requests can fallthrough to our html middleware for
    // special processing
    // also skip internal requests `/@fs/ /@vite-client` etc...
    const cleanedUrl = cleanUrl(req.url!)
    if (
      cleanedUrl.endsWith('/') ||
      path.extname(cleanedUrl) === '.html' ||
      isInternalRequest(req.url!) ||
      // skip url starting with // as these will be interpreted as
      // scheme relative URLs by new URL() and will not be a valid file path
      req.url?.startsWith('//')
    ) {
      return next()
    }

    const url = new URL(req.url!, 'http://example.com')
    const pathname = decodeURIIfPossible(url.pathname)
    if (pathname === undefined) {
      return next()
    }

    // apply aliases to static requests as well
    let redirectedPathname = applyStaticAlias(
      pathname,
      server.config.resolve.alias,
    )
    if (redirectedPathname) {
      // dir is pre-normalized to posix style
      if (redirectedPathname.startsWith(withTrailingSlash(dir))) {
        redirectedPathname = redirectedPathname.slice(dir.length)
      }
    }

    const resolvedPathname = redirectedPathname || pathname
    let fileUrl = path.resolve(dir, removeLeadingSlash(resolvedPathname))
    if (resolvedPathname.endsWith('/') && fileUrl.at(-1) !== '/') {
      fileUrl = withTrailingSlash(fileUrl)
    }
    if (!fileUrl.startsWith(withTrailingSlash(dir))) {
      respondWithAccessDenied(fileUrl, server, res)
      return
    }
    if (redirectedPathname) {
      url.pathname = encodeURI(redirectedPathname)
      req.url = url.href.slice(url.origin.length)
    }

    try {
      serve(req, res, next)
    } catch (e) {
      if (e && 'code' in e && e.code === ERR_DENIED_FILE) {
        respondWithAccessDenied(e.path, server, res)
        return
      }
      throw e
    }
  }
}

export function applyStaticAlias(
  pathname: string,
  aliases: Alias[],
): string | undefined {
  for (const { find, replacement } of aliases) {
    const matches =
      typeof find === 'string'
        ? pathname === find || pathname.startsWith(`${find}/`)
        : find.test(pathname)
    if (matches) {
      return pathname.replace(find, replacement)
    }
  }
}
