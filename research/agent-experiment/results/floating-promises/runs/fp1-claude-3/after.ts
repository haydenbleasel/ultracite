/*
 * Source:    honojs/hono — src/utils/concurrent.ts, lines 1-55
 * Commit:    f78a245abc393368583085e19c7f5b28b460bf51 (2026-10-08T15:25:23+09:00)
 * Permalink: https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/utils/concurrent.ts#L1-L55
 * Function:  createPool (arrow (exported const), with its module)
 * The source (lines 1-55) is copied verbatim.
 * Anything marked as a stub is not part of the original source.
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
// STUB (not part of the original source): Node's setTimeout signature from @types/node,
// which hono's tsconfig includes.
declare function setTimeout(callback: (...args: unknown[]) => void, ms?: number): unknown

/**
 * @module
 * Concurrent utility.
 */

const DEFAULT_CONCURRENCY = 1024

export interface Pool {
  run<T>(fn: () => T): Promise<T>
}

export const createPool = ({
  concurrency,
  interval,
}: {
  concurrency?: number
  interval?: number
} = {}): Pool => {
  concurrency ||= DEFAULT_CONCURRENCY

  if (concurrency === Infinity) {
    // unlimited
    return {
      run: async (fn) => fn(),
    }
  }

  const pool: Set<{}> = new Set()
  const run = async <T>(
    fn: () => T,
    promise?: Promise<T>,
    resolve?: (result: T) => void
  ): Promise<T> => {
    if (pool.size >= (concurrency as number)) {
      promise ||= new Promise<T>((r) => (resolve = r))
      setTimeout(() => {
        run(fn, promise, resolve).catch((error: unknown) => {
          throw error
        })
      })
      return promise
    }
    const marker = {}
    pool.add(marker)
    const result = await fn()
    if (interval) {
      setTimeout(() => pool.delete(marker), interval)
    } else {
      pool.delete(marker)
    }
    if (resolve) {
      resolve(result)
      return promise as Promise<T>
    } else {
      return result
    }
  }
  return { run }
}
