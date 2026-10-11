/*
 * Source:    vercel/next.js — packages/next/src/client/script.tsx, lines 318-336 and 350-359
 *            (the beforeInteractive branch of the Script component), plus
 *            packages/next/src/shared/lib/htmlescape.ts, lines 1-12 and 24-26
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85 (2026-10-10T01:41:23Z)
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/client/script.tsx#L318-L359
 *            https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/shared/lib/htmlescape.ts#L1-L26
 * Function:  the inline `<script>` that queues a beforeInteractive script on
 *            self.__next_s, rendered with dangerouslySetInnerHTML
 * Adaptations (not part of the original source):
 *   - the wrapper component BeforeInteractiveScript and its Props type, which stand in
 *     for the Script component's own destructuring of props (script.tsx L200-L217);
 *   - ReactDOM.preload(…) in the src branch (script.tsx L338-L349) is omitted, because it
 *     needs react-dom's resource APIs and doesn't affect the rendered element;
 *   - htmlescape.ts's export of ESCAPE_REGEX is kept, its attribute-escaping half
 *     (L14-L22, L28-L33) is not used and is left out.
 * Everything inside the marked regions is copied verbatim.
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
 *
 * htmlescape.ts says it is based on zertosh/htmlescape; that project's license
 * (https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE),
 * reproduced in full:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Andres Suarez
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import type { JSX, ScriptHTMLAttributes } from 'react'

// ── verbatim: packages/next/src/shared/lib/htmlescape.ts L1-L12 ──
// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE

const ESCAPE_LOOKUP: { [match: string]: string } = {
  '&': '\\u0026',
  '>': '\\u003e',
  '<': '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

export const ESCAPE_REGEX = /[&><\u2028\u2029]/g
// ── end verbatim ──

// ── verbatim: packages/next/src/shared/lib/htmlescape.ts L24-L26 ──
export function htmlEscapeJsonString(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match])
}
// ── end verbatim ──

// ── wrapper (not part of the original source) ──
interface Props extends ScriptHTMLAttributes<HTMLScriptElement> {
  id?: string
}

export function BeforeInteractiveScript(props: Props): JSX.Element {
  const { id, nonce, src, ...restProps } = props
  // ── verbatim: packages/next/src/client/script.tsx L318-L337 ──
      if (!src) {
        // For inlined scripts, we put the content in `children`.
        if (restProps.dangerouslySetInnerHTML) {
          // Casting since lib.dom.d.ts doesn't have TrustedHTML yet.
          restProps.children = restProps.dangerouslySetInnerHTML
            .__html as string
          delete restProps.dangerouslySetInnerHTML
        }

        return (
          <script
            nonce={nonce}
          >
            {`(self.__next_s=self.__next_s||[]).push(${htmlEscapeJsonString(
                JSON.stringify([0, { ...restProps, id }])
              )})`}
          </script>
        )
      } else {
  // ── end verbatim (L338-L349, ReactDOM.preload, omitted) ──
  // ── verbatim: packages/next/src/client/script.tsx L350-L360 ──
        return (
          <script
            nonce={nonce}
          >
            {`(self.__next_s=self.__next_s||[]).push(${htmlEscapeJsonString(
                JSON.stringify([src, { ...restProps, id }])
              )})`}
          </script>
        )
      }
  // ── end verbatim ──
}
