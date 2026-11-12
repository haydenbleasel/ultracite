/*
 * Source:    vercel/next.js — packages/next/src/shared/lib/page-path/denormalize-page-path.ts,
 *            lines 4-19 (the whole file but its imports)
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85 (2026-10-09)
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/shared/lib/page-path/denormalize-page-path.ts#L1-L19
 * Function:  denormalizePagePath, which turns a page path back into a route (`/index` to `/`,
 *   `/index/foo` to `/foo`) for Next.js's build and server.
 * The lines below the stub import are copied, with their formatting changed. The import marked
 *   STUB replaces lines 1-2, which import isDynamicRoute and normalizePathSep; stubs.ts stands in
 *   for them.
 *
 * License of the source repository (vercel/next.js/license.md), reproduced in full:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2025 Vercel, Inc.
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
// STUB: replaces lines 1-2 of the original (the two imports below, from ../router/utils and
// ./normalize-path-sep).
import { isDynamicRoute, normalizePathSep } from "./stubs";

/**
 * Performs the opposite transformation of `normalizePagePath`. Note that
 * this function is not idempotent either in cases where there are multiple
 * leading `/index` for the page. Examples:
 *  - `/index` -> `/`
 *  - `/index/foo` -> `/foo`
 *  - `/index/index` -> `/index`
 */
export function denormalizePagePath(page: string) {
  const _page = normalizePathSep(page);
  return _page.startsWith("/index/") && !isDynamicRoute(_page)
    ? _page.slice(6)
    : _page === "/index"
      ? "/"
      : _page;
}
