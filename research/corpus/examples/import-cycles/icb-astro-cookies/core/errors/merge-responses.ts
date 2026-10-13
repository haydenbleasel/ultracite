/*
 * Import-cycles subject icb: an importer that takes one function through the barrel and another straight from response.ts.
 *
 * Source:    withastro/astro — packages/astro/src/core/errors/default-handler.ts
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/errors/default-handler.ts#L7-L8
 * Excerpt of default-handler.ts: its two cookie imports (lines 7-8) and mergeResponses (lines 164-264) verbatim, with `export` added to mergeResponses so the excerpt is a module. Permalink to the function: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/errors/default-handler.ts#L164-L264
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
import { attachCookiesToResponse } from '../cookies/index.js';
import { getCookiesFromResponse } from '../cookies/response.js';

// `export` added for the excerpt (not in the original).
export function mergeResponses(
	newResponse: Response,
	originalResponse?: Response,
	override?: {
		status: 404 | 500;
		removeContentEncodingHeaders: boolean;
	},
) {
	let newResponseHeaders = newResponse.headers;

	// In order to set the body of a remote response as the new response body, we need to remove
	// headers about encoding in transit, as Node's standard fetch implementation `undici`
	// currently does not do so.
	//
	// Also see https://github.com/nodejs/undici/issues/2514
	if (override?.removeContentEncodingHeaders) {
		// The original headers are immutable, so we need to clone them here.
		newResponseHeaders = new Headers(newResponseHeaders);

		newResponseHeaders.delete('Content-Encoding');
		newResponseHeaders.delete('Content-Length');
	}

	if (!originalResponse) {
		if (override !== undefined) {
			return new Response(newResponse.body, {
				status: override.status,
				statusText: newResponse.statusText,
				headers: newResponseHeaders,
			});
		}
		return newResponse;
	}

	// If the new response did not have a meaningful status, an override may have been provided
	// If the original status was 200 (default), override it with the new status (probably 404 or 500)
	// Otherwise, the user set a specific status while rendering and we should respect that one
	const status = override?.status
		? override.status
		: originalResponse.status === 200
			? newResponse.status
			: originalResponse.status;

	try {
		// this function could throw an error if the headers are immutable...
		originalResponse.headers.delete('Content-type');
		// Framing headers describe the original response's body encoding/size and must
		// not carry over to the error page response which has a different body.
		originalResponse.headers.delete('Content-Length');
		originalResponse.headers.delete('Transfer-Encoding');
	} catch {
		// Headers may be immutable (e.g. when the Response was constructed by a fetch).
		// In that case, the loop below still copies from originalResponse.headers,
		// so we need to filter out framing headers there instead.
	}
	// Build merged headers using append() to preserve multi-value headers (e.g. Set-Cookie).
	// Headers from the original response take priority over new response headers for
	// single-value headers, but we use append to avoid collapsing multi-value entries.
	const newHeaders = new Headers();
	const seen = new Set<string>();
	// Add original response headers first (they take priority)
	for (const [name, value] of originalResponse.headers) {
		newHeaders.append(name, value);
		seen.add(name.toLowerCase());
	}
	// Add new response headers that weren't already set by the original response,
	// but skip content-type since the error page must return text/html.
	// set-cookie is special: it's a multi-value header, so we always append.
	for (const [name, value] of newResponseHeaders) {
		const lower = name.toLowerCase();
		if (!seen.has(lower) || lower === 'set-cookie') {
			newHeaders.append(name, value);
		}
	}
	const mergedResponse = new Response(newResponse.body, {
		status,
		statusText: status === 200 ? newResponse.statusText : originalResponse.statusText,
		// If you're looking at here for possible bugs, it means that it's not a bug.
		// With the middleware, users can meddle with headers, and we should pass to the 404/500.
		// If users see something weird, it's because they are setting some headers they should not.
		//
		// Although, we don't want it to replace the content-type, because the error page must return `text/html`
		headers: newHeaders,
	});

	// Transfer AstroCookies from the original or new response so that
	// prepareResponse can read them when addCookieHeader is true.
	const originalCookies = getCookiesFromResponse(originalResponse);
	const newCookies = getCookiesFromResponse(newResponse);
	if (originalCookies) {
		// If both responses have cookies, merge new response cookies into original
		if (newCookies) {
			originalCookies.merge(newCookies);
		}
		attachCookiesToResponse(mergedResponse, originalCookies);
	} else if (newCookies) {
		attachCookiesToResponse(mergedResponse, newCookies);
	}

	return mergedResponse;
}
