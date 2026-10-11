/*
 * Security subject s1: no-new-func (Oxlint core, ESLint core), sonarjs/code-eval and
 * react-doctor/no-eval (js-plugins). Real code, verbatim.
 *
 * Source:    vitejs/vite — packages/vite/src/node/utils.ts, lines 1780-1786
 * Commit:    3b72997d42e7dd2b31898d0e68461e3025e836b6 (2026-10-09T16:29:11Z)
 * Permalink: https://github.com/vitejs/vite/blob/3b72997d42e7dd2b31898d0e68461e3025e836b6/packages/vite/src/node/utils.ts#L1780-L1786
 * Function:  evalValue (exported declaration, 7 lines)
 * What flows in: the source text of the options object in a project's own
 *   import.meta.glob(…, { … }) or new Worker(new URL(…), { … }) call
 *   (callers: plugins/importMetaGlob.ts L160, plugins/workerImportMetaUrl.ts L108).
 *   Developer-controlled; the hand classification labels it `trusted-dev`.
 * Rules it hits, measured with security-examples.cjs (see examples.json):
 *   Oxlint core + react (the default): no-new-func. With js-plugins: also
 *   sonarjs/code-eval, and react-doctor/no-eval (which fires on this code in the corpus
 *   and in a temp directory, but react-doctor skips files under examples/).
 *   ESLint: no-new-func, sonarjs/code-eval. Biome (Ultracite's config): nothing.
 *   Unrelated rules that also fire: func-style, typescript/no-explicit-any.
 * Behaviour to preserve: evaluates a JavaScript expression (object literals with
 *   unquoted keys, single-quoted strings, arrays, trailing commas, nested objects,
 *   template-free literals) and returns its value, with `console`, `exports`,
 *   `global`, `module`, `process` and `require` shadowed as undefined inside the
 *   expression. Invalid source throws (the callers catch it and report the position).
 * The function body is copied verbatim.
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

export function evalValue<T = any>(rawValue: string): T {
  const fn = new Function(`
    var console, exports, global, module, process, require
    return (\n${rawValue}\n)
  `)
  return fn()
}
