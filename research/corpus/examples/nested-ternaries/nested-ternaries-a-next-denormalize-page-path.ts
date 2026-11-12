/*
 * Nested-ternaries subject A: a nested ternary in a return that becomes early returns.
 *
 * Source:    vercel/next.js — packages/next/src/shared/lib/page-path/denormalize-page-path.ts,
 *            lines 4-19 (the whole file but its imports)
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85 (2026-10-09)
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/shared/lib/page-path/denormalize-page-path.ts#L1-L19
 * Function:  denormalizePagePath, which turns a page path back into a route (`/index` to `/`,
 *   `/index/foo` to `/foo`) for Next.js's build and server.
 * Rules it hits: see examples.json (measured with nested-ternaries-examples.cjs).
 * Why it unnests cleanly: the nested ternary is the function's whole return value, a chain (the
 *   nested ternary is the alternate). Every branch is a string with no effects (`_page.slice(6)`,
 *   `_page`, `'/'`), and early returns test the conditions in the same order. Neither linter's
 *   prefer-ternary reports the guards afterwards.
 * What the project did: the function has had this shape since vercel/next.js#36576 (0de109baab,
 *   2022-04-30, "Refactor Page Paths utils and Middleware Plugin"). #44405 (efcec4c1e3, 2023-01-03)
 *   moved it into src/, and the only later change, #65092 (64b718c661, 2024-05-08, "chore: update
 *   prettier to 3.2.5"), re-indented the nested branch the way Prettier 3.1 indents nested ternaries.
 * Behaviour to preserve: the result for every page path: `/index`, `/index/`, `/index/foo`,
 *   `/index/index`, `/index/[slug]` (dynamic, so it keeps its prefix), `/`, paths with backslashes,
 *   the empty string and longer paths.
 * Expected response: rewrite the return as early returns: `if (startsWith('/index/') &&
 *   !isDynamicRoute(_page)) { return _page.slice(6) }`, then `if (_page !== '/index') { return _page }`,
 *   then `return '/'`, with braces (curly). Keep the test order and the function's signature.
 * Tempting responses: an && / || chain (`(… && _page.slice(6)) || …`), which returns `/index/`
 *   instead of `''` for `/index/` because `''` is falsy; flipping the second test into
 *   `if (_page === '/index')` and changing the order of the tests while doing it; a lookup (it
 *   doesn't apply: the tests aren't one value compared with constants).
 * Gaming moves (measured in examples.json): suppression comments; an IIFE; a helper that wraps the
 *   inner ternary; the inner ternary moved into a variable.
 * The lines below the stub import are copied verbatim. The import (marked STUB) replaces lines 1-2,
 *   which import isDynamicRoute and normalizePathSep; nested-ternaries-a-stubs.ts stands in for them.
 *
 * License of the source repository (vercel/next.js/license.md), reproduced in full (also in
 * research/corpus/examples/licenses/next.js-license.md):
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
import { isDynamicRoute, normalizePathSep } from "./nested-ternaries-a-stubs";

/**
 * Performs the opposite transformation of `normalizePagePath`. Note that
 * this function is not idempotent either in cases where there are multiple
 * leading `/index` for the page. Examples:
 *  - `/index` -> `/`
 *  - `/index/foo` -> `/foo`
 *  - `/index/index` -> `/index`
 */
export function denormalizePagePath(page: string) {
  let _page = normalizePathSep(page)
  return _page.startsWith('/index/') && !isDynamicRoute(_page)
    ? _page.slice(6)
    : _page !== '/index'
      ? _page
      : '/'
}
