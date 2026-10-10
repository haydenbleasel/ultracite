/*
 * Example b-high-cognitive-low-cyclomatic: 5b: high cognitive, modest cyclomatic (deep nesting)
 *
 * Source:    vercel/next.js — packages/next/src/client/app-link-gc.ts, lines 4-64
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85 (2026-10-09T18:41:23-07:00)
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/client/app-link-gc.ts#L4-L64
 * Function:  callback (arrow, 61 lines)
 * Scores (measured in place, at the commit above):
 *   sonarjs/cognitive-complexity (eslint-plugin-sonarjs 4.2.2): 87
 *   ESLint core complexity, variant "classic" (eslint 10.12.0): 18
 *   Biome complexity/noExcessiveCognitiveComplexity (@biomejs/biome 2.5.15): 114
 * The function body (lines 4-64) is copied verbatim.
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

    const callback = (mutationList: MutationRecord[]) => {
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (
              'tagName' in node &&
              (node as HTMLLinkElement).tagName === 'LINK'
            ) {
              const link = node as HTMLLinkElement
              if (link.dataset.precedence?.startsWith('next')) {
                const href = link.getAttribute('href')
                if (href) {
                  const [resource, version] = href.split('?v=', 2)
                  if (version) {
                    const currentOrigin = window.location.origin
                    const allLinks = [
                      ...document.querySelectorAll(
                        'link[href^="' + resource + '"]'
                      ),
                      // It's possible that the resource is a full URL or only pathname,
                      // so we need to remove the alternative href as well.
                      ...document.querySelectorAll(
                        'link[href^="' +
                          (resource.startsWith(currentOrigin)
                            ? resource.slice(currentOrigin.length)
                            : currentOrigin + resource) +
                          '"]'
                      ),
                    ] as HTMLLinkElement[]

                    for (const otherLink of allLinks) {
                      if (otherLink.dataset.precedence?.startsWith('next')) {
                        const otherHref = otherLink.getAttribute('href')
                        if (otherHref) {
                          const [, otherVersion] = otherHref.split('?v=', 2)
                          if (!otherVersion || +otherVersion < +version) {
                            // Delay the removal of the stylesheet to avoid FOUC
                            // caused by `@font-face` rules, as they seem to be
                            // a couple of ticks delayed between the old and new
                            // styles being swapped even if the font is cached.
                            setTimeout(() => {
                              otherLink.remove()
                            }, 5)
                            const preloadLink = document.querySelector(
                              `link[rel="preload"][as="style"][href="${otherHref}"]`
                            )
                            if (preloadLink) {
                              preloadLink.remove()
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
