/*
 * Sort-keys subject B: a log line whose key order is visible in the output.
 *
 * Source:    withastro/astro — packages/astro/src/core/logger/impls/json.ts, lines 9-48 (the whole
 *            file but its imports)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/logger/impls/json.ts#L33-L38
 * Function:  jsonLoggerDestination(), Astro's JSON log destination: one JSON line per log event,
 *   on console.info, or console.error for errors, optionally pretty-printed.
 * Rules it hits: see examples.json (measured with sort-keys-examples.cjs).
 * Why the order is observable: each payload goes through JSON.stringify, so its key order is the
 *   order of the fields in every log line. A JSON parser sees the same object either way; anything
 *   that reads the line as text doesn't. Astro's own tests compare the exact string:
 *   packages/astro/test/units/logger/destination.test.ts asserts
 *   '{"message":"compiled successfully","label":"build","level":"info"}' and three more lines in
 *   that order (https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/test/units/logger/destination.test.ts#L174-L199).
 *   The event object Astro builds in core.ts is { label, level, message, newLine }, already in
 *   alphabetical order, so message-first here is a choice.
 * What the project did: added in withastro/astro#16477 (28fb3e16, 2026-04-29, "feat: experimental
 *   logger") with message first, kept through #17390 and #17332 (both 2026-07-15), which changed
 *   the file but not the payload.
 * Behaviour to preserve: everything: for every event, level and option, the same console method
 *   gets the same string, byte for byte.
 * Expected response: keep the order, and leave the issues for a person (Ultracite's "Left for
 *   review" line), saying the order is the log format and Astro's tests pin it. Restructuring so the
 *   order is explicit without changing the output (a replacer array for JSON.stringify, or a list
 *   of entries) is acceptable if it keeps every byte.
 * Tempting responses: sorting the keys (what Oxlint's fix does): every log line changes to
 *   {"label":…,"level":…,"message":…}, JSON parsers don't notice, and Astro's four format tests
 *   fail. Suppressing the rule, which the prompt forbids.
 * Lines 9-48 are copied verbatim. The stubs above them replace its imports. Anything marked STUB is
 * not part of the original source.
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

// STUB (not part of the original source): what lines 1-8 import from ../core.js,
// ../../../types/public/index.js and ../public.js, reduced to what this file uses. The types,
// `levels` (with the same values) and matchesLevel are copied from core.ts and public.ts at the
// same commit; AstroLogger keeps only the methods that reach a destination, as core.ts's log()
// does.
type AstroLoggerLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

interface AstroLoggerMessage {
	label: string | null
	level: AstroLoggerLevel
	message: string
	newLine: boolean
}

interface AstroLoggerDestination {
	write: (chunk: AstroLoggerMessage) => void
	flush?: () => Promise<void> | void
	close?: () => Promise<void> | void
}

interface AstroInlineConfig {
	logLevel?: AstroLoggerLevel
}

const levels: Record<AstroLoggerLevel, number> = {
	debug: 20,
	error: 50,
	info: 30,
	silent: 90,
	warn: 40,
}

function matchesLevel(messageLevel: AstroLoggerLevel, configuredLevel: AstroLoggerLevel): boolean {
	return levels[messageLevel] >= levels[configuredLevel]
}

export class AstroLogger {
	options: { destination: AstroLoggerDestination; level: AstroLoggerLevel }
	constructor(options: { destination: AstroLoggerDestination; level: AstroLoggerLevel }) {
		this.options = options
	}
	private log(level: AstroLoggerLevel, label: string | null, message: string, newLine = true) {
		if (levels[this.options.level] > levels[level]) {
			return
		}
		this.options.destination.write({ label, level, message, newLine })
	}
	info(label: string | null, message: string) {
		this.log('info', label, message)
	}
	warn(label: string | null, message: string) {
		this.log('warn', label, message)
	}
	error(label: string | null, message: string) {
		this.log('error', label, message)
	}
}
// END STUB


export type JsonHandlerConfig = {
	/**
	 * Whether the JSON line should format on multiple lines
	 */
	pretty?: boolean;
	/**
	 * The level of logs that should be printed by the logger.
	 */
	level?: AstroLoggerLevel;
};

export const SGR_REGEX = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*m`, 'g');

export default function jsonLoggerDestination(
	config: JsonHandlerConfig = {},
): AstroLoggerDestination {
	const { pretty = false, level = 'info' } = config;
	return {
		write(event) {
			if (!matchesLevel(event.level, level)) {
				return;
			}

			const dest = levels[event.level] >= levels['error'] ? console.error : console.info;
			const message = event.message.replace(SGR_REGEX, '');
			const payload = pretty
				? JSON.stringify({ message, label: event.label, level: event.level }, null, 2)
				: JSON.stringify({ message, label: event.label, level: event.level });
			dest(payload);
		},
	};
}

export function createJsonLoggerFromFlags(config: AstroInlineConfig) {
	return new AstroLogger({
		destination: jsonLoggerDestination({ pretty: false }),
		level: config.logLevel ?? 'info',
	});
}
