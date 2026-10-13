/*
 * Import-cycles subject icb (the file an agent gets): an internal barrel that Biome's noBarrelFile
 * reports, where the right fix is in the files that import it.
 *
 * Source:    withastro/astro — packages/astro/src/core/cookies/index.ts (whole file)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/cookies/index.ts#L1-L6
 * Other files: core/cookies/cookies.ts and response.ts (the modules it re-exports), and two of its nine
 *   importers: core/app/prepare-response.ts (whole file) and core/errors/merge-responses.ts (an excerpt
 *   of core/errors/default-handler.ts). stubs/ holds STUB modules for code outside the subject.
 * Rules it hits (measured with import-cycles-examples.cjs, see examples.json): Biome noBarrelFile
 *   ("Avoid barrel files, they slow down performance, and cause large module graphs with modules that
 *   go unused.") and ESLint unicorn/no-barrel-files on this file. Nothing in Oxlint's default presets:
 *   oxc/no-barrel-file only counts `export *` and fires above 100 modules.
 * The cost: importing getSetCookiesFromResponse or attachCookiesToResponse through this file also
 *   evaluates cookies.ts and everything it imports. In Astro at this commit that is 10 modules instead
 *   of 1 (import-cycles-graph.cjs, fan-out); five of the nine importers only need response.ts.
 * Not a public entry point: package.json's exports don't map to it, and it isn't Astro API.
 * Behaviour to preserve: every name the importers use stays importable with the same identity
 *   (AstroCookies is the same class object, so instanceof and Symbol-keyed lookups still work);
 *   attachCookiesToResponse/getCookiesFromResponse/getSetCookiesFromResponse behave the same; the
 *   type exports stay available to type-only importers (types/public/index.ts re-exports them).
 *   Measure which subject modules evaluate when an importer loads (cookies.ts should not, for
 *   prepare-response.ts, after a good fix).
 * Expected fix: point each importer at the module that declares what it uses (cookies.js or
 *   response.js) and delete this file, or keep it only for the type re-exports. That means editing
 *   the importers, which Ultracite's agent prompt forbids ("Edit only the file above").
 * Tempting fixes: re-declaring the names here (`export const attachCookiesToResponse = …`,
 *   `export class AstroCookies extends Base {}`) silences the rule, keeps the cost, and the subclass
 *   changes AstroCookies' identity; `export *` still reports; deleting the file breaks nine importers;
 *   emptying it silences the rule and breaks them too.
 * Verbatim.
 *
 * License of the source repository (withastro/astro/LICENSE, the part covering this code):
 *
 * MIT License
 *
 * Copyright (c) 2021 Fred K. Schott
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
export type { AstroCookieGetOptions, AstroCookieSetOptions } from './cookies.js';
export { AstroCookies } from './cookies.js';
export {
	attachCookiesToResponse,
	getSetCookiesFromResponse,
} from './response.js';
