/*
 * Source:    withastro/astro — packages/astro/src/core/logger/impls/compose.ts, lines 3-26
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/logger/impls/compose.ts#L3-L26
 * Function:  compose (declaration (default export))
 * The source (lines 3-26) is copied verbatim.
 * Anything marked as a stub is not part of the original source.
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
// STUB (not part of the original source): AstroLoggerMessage, simplified.
type AstroLoggerMessage = { label: string | null; level: string; message: string; newLine: boolean }

// Copied verbatim from packages/astro/src/core/logger/core.ts, lines 4-19, at the same commit.
export interface AstroLoggerDestination {
	/**
	 * It receives a message and writes it into a destination
	 */
	write: (chunk: AstroLoggerMessage) => void;
	/**
	 * It dumps logs without closing the connection to the destination.
	 * Method that can be used by specialized loggers.
	 */
	flush?: () => Promise<void> | void;
	/**
	 * It dumps logs and closes the connection to the destination.
	 * Method that can be used by specialized loggers.
	 */
	close?: () => Promise<void> | void;
}

export default function compose(destinations: AstroLoggerDestination[]): AstroLoggerDestination {
	return {
		write(chunk) {
			for (const logger of destinations) {
				logger.write(chunk);
			}
		},
		flush() {
			for (const destination of destinations) {
				if (destination.flush) {
					destination.flush();
				}
			}
		},
		close() {
			for (const destination of destinations) {
				if (destination.close) {
					destination.close();
				}
			}
		},
	};
}

