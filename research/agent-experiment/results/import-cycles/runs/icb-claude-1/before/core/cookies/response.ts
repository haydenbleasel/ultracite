/*
 * Source:    withastro/astro — packages/astro/src/core/cookies/response.ts
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/cookies/response.ts#L1-L28
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
import type { AstroCookies } from './cookies.js';

const astroCookiesSymbol = Symbol.for('astro.cookies');

export function attachCookiesToResponse(response: Response, cookies: AstroCookies) {
	Reflect.set(response, astroCookiesSymbol, cookies);
}

export function getCookiesFromResponse(response: Response): AstroCookies | undefined {
	let cookies = Reflect.get(response, astroCookiesSymbol);
	if (cookies != null) {
		return cookies as AstroCookies;
	} else {
		return undefined;
	}
}

export function* getSetCookiesFromResponse(response: Response): Generator<string, string[]> {
	const cookies = getCookiesFromResponse(response);
	if (!cookies) {
		return [];
	}
	for (const headerValue of cookies.consume()) {
		yield headerValue;
	}

	return [];
}
