/*
 * Source:    withastro/astro — packages/astro/src/core/cookies/index.ts (whole file)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/cookies/index.ts#L1-L6
 * Other files: core/cookies/cookies.ts and response.ts (the modules it re-exports), and two of its nine
 *   importers: core/app/prepare-response.ts (whole file) and core/errors/merge-responses.ts (an excerpt
 *   of core/errors/default-handler.ts). stubs/ holds STUB modules for code outside these files.
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
// Hand-made mutant for the oracle self-test, not agent output: the barrel imports the names and re-declares them as consts aliasing the same objects, plus a type alias for AstroCookies: same objects, same cost, no `export … from` left for values
import { AstroCookies as AstroCookiesClass } from './cookies.js';
import {
	attachCookiesToResponse as attach,
	getSetCookiesFromResponse as getSetCookies,
} from './response.js';

export type { AstroCookieGetOptions, AstroCookieSetOptions } from './cookies.js';
export const AstroCookies = AstroCookiesClass;
export type AstroCookies = AstroCookiesClass;
export const attachCookiesToResponse = attach;
export const getSetCookiesFromResponse = getSetCookies;
