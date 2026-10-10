/*
 * Example c-alt-routing-strategy: 5c (alternate): 21-30 cognitive, pure, nested if/else decision tree
 *
 * Source:    withastro/astro — packages/astro/src/core/app/common.ts, lines 12-45
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/app/common.ts#L12-L45
 * Function:  toRoutingStrategy (declaration, 34 lines)
 * Scores (measured in place, at the commit above):
 *   sonarjs/cognitive-complexity (eslint-plugin-sonarjs 4.2.2): 24
 *   ESLint core complexity, variant "classic" (eslint 10.12.0): 10
 *   Biome complexity/noExcessiveCognitiveComplexity (@biomejs/biome 2.5.15): 20
 * The function body (lines 12-45) is copied verbatim.
 * Lines 4-11 of the same file are included above the function because it uses them.
 * Anything marked as a stub or wrapper is not part of the original source.
 *
 * License of the source repository (withastro/astro/LICENSE), reproduced in full:
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
 *
 * """
 * This license applies to parts of the `packages/create-astro` and `packages/astro` subdirectories originating from the https://github.com/sveltejs/kit repository:
 *
 * Copyright (c) 2020 [these people](https://github.com/sveltejs/kit/graphs/contributors)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * """
 *
 * """
 * This license applies to parts of the `packages/create-astro` and `packages/astro` subdirectories originating from the https://github.com/vitejs/vite repository:
 *
 * MIT License
 *
 * Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors
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
 * """
 */

// --- stubs (not in the original): a minimal stand-in for AstroConfig['i18n'] ---
type AstroConfig = {
	i18n?: {
		routing: 'manual' | { prefixDefaultLocale: boolean; redirectToDefaultLocale: boolean };
		domains?: Record<string, string>;
	};
};
// --- end stubs ---
// --- copied verbatim from lines 4-11 of the same file (needed by the function) ---
export type RoutingStrategies =
	| 'manual'
	| 'pathname-prefix-always'
	| 'pathname-prefix-other-locales'
	| 'pathname-prefix-always-no-redirect'
	| 'domains-prefix-always'
	| 'domains-prefix-other-locales'
	| 'domains-prefix-always-no-redirect';
// --- end ---

export function toRoutingStrategy(
	routing: NonNullable<AstroConfig['i18n']>['routing'],
	domains: NonNullable<AstroConfig['i18n']>['domains'],
): RoutingStrategies {
	let strategy: RoutingStrategies;
	const hasDomains = domains ? Object.keys(domains).length > 0 : false;
	if (routing === 'manual') {
		strategy = 'manual';
	} else {
		if (!hasDomains) {
			if (routing?.prefixDefaultLocale === true) {
				if (routing.redirectToDefaultLocale) {
					strategy = 'pathname-prefix-always';
				} else {
					strategy = 'pathname-prefix-always-no-redirect';
				}
			} else {
				strategy = 'pathname-prefix-other-locales';
			}
		} else {
			if (routing?.prefixDefaultLocale === true) {
				if (routing.redirectToDefaultLocale) {
					strategy = 'domains-prefix-always';
				} else {
					strategy = 'domains-prefix-always-no-redirect';
				}
			} else {
				strategy = 'domains-prefix-other-locales';
			}
		}
	}

	return strategy;
}
