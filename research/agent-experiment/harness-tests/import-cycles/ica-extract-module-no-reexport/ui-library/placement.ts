/*
 * Source:    withastro/astro — packages/astro/src/runtime/client/dev-toolbar/ui-library/window.ts (lines 3-9, moved)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/client/dev-toolbar/ui-library/window.ts#L1-L140
 * Partner:   ../settings.ts (file 1 of 2), same commit.
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
// Hand-made mutant for the oracle self-test, not agent output: extract into ui-library/placement.ts as above, but window.ts no longer exports placements, Placement and isValidPlacement
export const placements = ['bottom-left', 'bottom-center', 'bottom-right'] as const;

export type Placement = (typeof placements)[number];

export function isValidPlacement(value: string): value is Placement {
	return placements.map(String).includes(value);
}
