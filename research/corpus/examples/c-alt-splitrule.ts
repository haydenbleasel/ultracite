/*
 * Example c-alt-splitrule: 5c (alternate): 21-30 cognitive, pure, no dependencies (tokenizer loop)
 *
 * Source:    honojs/hono — src/jsx/dom/css.ts, lines 27-66
 * Commit:    f78a245abc393368583085e19c7f5b28b460bf51 (2026-10-08T15:25:23+09:00)
 * Permalink: https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/jsx/dom/css.ts#L27-L66
 * Function:  splitRule (arrow, 40 lines)
 * Scores (measured in place, at the commit above):
 *   sonarjs/cognitive-complexity (eslint-plugin-sonarjs 4.2.2): 21
 *   ESLint core complexity, variant "classic" (eslint 10.12.0): 10
 *   Biome complexity/noExcessiveCognitiveComplexity (@biomejs/biome 2.5.15): 22
 * The function body (lines 27-66) is copied verbatim.
 * Anything marked as a stub or wrapper is not part of the original source.
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

const splitRule = (rule: string): string[] => {
  const result: string[] = []
  let startPos = 0
  let depth = 0
  for (let i = 0, len = rule.length; i < len; i++) {
    const char = rule[i]

    // consume quote

    if (char === "'" || char === '"') {
      const quote = char
      i++
      for (; i < len; i++) {
        if (rule[i] === '\\') {
          i++
          continue
        }
        if (rule[i] === quote) {
          break
        }
      }
      continue
    }

    // comments are removed from the rule in advance
    if (char === '{') {
      depth++
      continue
    }
    if (char === '}') {
      depth--
      if (depth === 0) {
        result.push(rule.slice(startPos, i + 1))
        startPos = i + 1
      }
      continue
    }
  }
  return result
}

export { splitRule }
