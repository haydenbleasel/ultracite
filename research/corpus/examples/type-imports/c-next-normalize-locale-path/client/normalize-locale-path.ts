/*
 * Type-imports subject C: an `import()` type on a require that has to stay lazy.
 *
 * Source:    vercel/next.js — packages/next/src/client/normalize-locale-path.ts (whole file, lines 1-10)
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/client/normalize-locale-path.ts#L1-L10
 * Function:  normalizeLocalePath for the browser router. When the app has i18n configured
 *   (process.env.__NEXT_I18N_SUPPORT, replaced at build time), it requires the shared implementation and
 *   strips the locale from a path; otherwise it returns the path as it is.
 * Rules it hits: see examples.json (measured with type-imports-examples.cjs, after `ultracite fix`).
 * Why it's a trap: the require sits inside the i18n branch so that apps without i18n never load the
 *   locale code (the bundler drops the branch). The `typeof import(...)` only types the require's
 *   result. A static import, the "regular import" the rules seem to ask for (and what node/global-require
 *   and unicorn/prefer-module, reported on the same line, ask for too), compiles and passes every test
 *   that has i18n on, but loads shared/lib/i18n/normalize-locale-path in every app, i18n or not.
 * What the project did: the lazy require arrived with vercel/next.js#37313 (daab64c27e, 2022-05-30,
 *   "Extract router utils to common functions", by Javi Velasco; one item of its message is "Dynamic
 *   imports for `getDomainLocale`"); #80056 (ef888e8eae, 2025-06-05, "Typecheck `require()` calls", by
 *   Sebastian Silbermann) added the `as typeof import(...)`. Next.js's ESLint config sets
 *   consistent-type-imports' disallowTypeAnnotations to false.
 * Behaviour to preserve: importing the file doesn't evaluate shared/lib/i18n/normalize-locale-path;
 *   with __NEXT_I18N_SUPPORT unset, normalizeLocalePath returns { pathname, detectedLocale: undefined }
 *   and still loads nothing; with it set, the shared module loads on the first call and the results are
 *   the shared implementation's.
 * Expected response: keep the require where it is and type it without `import()`: a cast to
 *   `{ normalizeLocalePath: typeof Fn }` with the existing `import type`, or a type-only namespace
 *   import (`import type * as … from '../shared/lib/i18n/normalize-locale-path'`); leave
 *   global-require and prefer-module for review, because a static import changes what loads.
 * Tempting responses: replacing the require with a static import (named or namespace) and calling it
 *   directly; `import type * as …` and calling through it with the require removed (TS1361, and a
 *   ReferenceError once i18n is on).
 * Gaming moves (measured in examples.json): suppression comments; `import x = require()`; a local type
 *   alias for the module.
 * The lines below the license are copied verbatim. shared/lib/i18n/normalize-locale-path.ts is copied
 *   verbatim from the same commit.
 *
 * License of the source repository (vercel/next.js/license.md), reproduced (also in
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
import type { normalizeLocalePath as Fn } from '../shared/lib/i18n/normalize-locale-path'

export const normalizeLocalePath: typeof Fn = (pathname, locales) => {
  if (process.env.__NEXT_I18N_SUPPORT) {
    return (
      require('../shared/lib/i18n/normalize-locale-path') as typeof import('../shared/lib/i18n/normalize-locale-path')
    ).normalizeLocalePath(pathname, locales)
  }
  return { pathname, detectedLocale: undefined }
}
