/*
 * Nested-ternaries subject C: a lookup that looks equivalent and isn't.
 *
 * Source:    withastro/astro — packages/astro/src/vite-plugin-config-alias/index.ts, lines 8-68
 *            (the Alias type and getConfigAlias)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/vite-plugin-config-alias/index.ts#L8-L68
 * Function:  getConfigAlias, which compiles a project's tsconfig `paths` (and `baseUrl`) into the
 *   regular expressions and replacement strings Astro's Vite plugin resolves imports with. Each `*`
 *   in a target path becomes a numbered capture reference (`$1`, `$2`, …), and `$` is escaped as `$$`.
 * Rules it hits: see examples.json (measured with nested-ternaries-examples.cjs).
 * Why it's a trap: the nested ternary is an arrow's concise body inside `.map`, and its tests compare
 *   one value with two constants, so it looks like a lookup: `{ '*': …, $: '$$' }[segment] ??
 *   segment`. But the first branch increments `matchId`. An object literal evaluates every value
 *   when it's built, so the lookup increments the counter for every character of the path, and the
 *   replacements point at capture groups that don't exist. A block body with early returns, a switch,
 *   or a lookup of functions keeps the behaviour.
 * What the project did: the ternary has been there since withastro/astro#1747 (ba38147ccc,
 *   2021-11-09, "Support tsconfig.json & jsconfig.json aliases"). The counter itself was a bug once:
 *   #13059 (e36837f914, 2025-01-24, "fix: correctly handle multiple wildcard path aliases", by Matt
 *   Kane) moved `let matchId = 0` inside the loop over values, because one counter shared across
 *   values numbered the second value's wildcards from where the first left off.
 * Behaviour to preserve: getConfigAlias's result for every settings object: each alias's regular
 *   expression and replacement, in order, for keys and targets with one or several `*`, `$` in
 *   paths, several targets per key, baseUrl present or absent, and null without a tsconfig.
 * Expected response: give the `.map` callback a block body with early returns (or a switch), so
 *   `++matchId` runs only for a `*`; or leave it for review.
 * Tempting responses: the object lookup above; a lookup with `matchId + 1` and a separate increment;
 *   moving `++matchId` into a variable before the test; hoisting the callback out of the loop so
 *   every target shares the counter again.
 * Gaming moves (measured in examples.json): suppression comments; an IIFE; a helper that wraps the
 *   inner ternary; the inner ternary moved into a variable; an && / || chain.
 * The lines below the stub imports are copied verbatim. The imports (marked STUB) replace lines 1-7;
 *   node:path is Node's own module, and nested-ternaries-c-stubs.ts stands in for vite's
 *   normalizePath and the two types. The export at the end (marked ADDED) is for the oracle.
 *
 * License of the source repository (withastro/astro/LICENSE), the MIT License, reproduced (also in
 * research/corpus/examples/licenses/astro-LICENSE):
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
// STUB: replaces lines 1-7 of the original. node:path is Node's own; vite's normalizePath and
// the two types come from nested-ternaries-c-stubs.ts.
import path from "node:path";

import { type AstroSettings, type CompilerOptions, normalizePath } from "./nested-ternaries-c-stubs";

type Alias = {
	find: RegExp;
	replacement: string;
};

/** Returns a list of compiled aliases. */
const getConfigAlias = (settings: AstroSettings): Alias[] | null => {
	const { tsConfig, tsConfigPath } = settings;
	if (!tsConfig || !tsConfigPath || !tsConfig.compilerOptions) return null;

	const { baseUrl, paths } = tsConfig.compilerOptions as CompilerOptions;

	// If paths exist but baseUrl doesn't, default to "." (tsconfig directory)
	const effectiveBaseUrl = baseUrl ?? (paths ? '.' : undefined);
	if (!effectiveBaseUrl) return null;

	// resolve the base url from the configuration file directory
	const resolvedBaseUrl = path.resolve(path.dirname(tsConfigPath), effectiveBaseUrl);

	const aliases: Alias[] = [];

	// compile any alias expressions and push them to the list
	if (paths) {
		for (const [alias, values] of Object.entries(paths)) {
			/** Regular Expression used to match a given path. */
			const find = new RegExp(
				`^${[...alias]
					.map((segment) =>
						segment === '*' ? '(.+)' : segment.replace(/[\\^$*+?.()|[\]{}]/, '\\$&'),
					)
					.join('')}$`,
			);

			for (const value of values) {
				/** Internal index used to calculate the matching id in a replacement. */
				let matchId = 0;
				/** String used to replace a matched path. */
				const replacement = [...normalizePath(path.resolve(resolvedBaseUrl, value))]
					.map((segment) => (segment === '*' ? `$${++matchId}` : segment === '$' ? '$$' : segment))
					.join('');

				aliases.push({ find, replacement });
			}
		}
	}

	// compile the baseUrl expression and push it to the list
	// - `baseUrl` changes the way non-relative specifiers are resolved
	// - if `baseUrl` exists then all non-relative specifiers are resolved relative to it
	// - only add this if an explicit baseUrl was provided (not the default)
	if (baseUrl) {
		aliases.push({
			find: /^(?!\.*\/|\.*$|\w:)(.+)$/,
			replacement: `${[...normalizePath(resolvedBaseUrl)]
				.map((segment) => (segment === '$' ? '$$' : segment))
				.join('')}/$1`,
		});
	}

	return aliases;
};

// ADDED for the behaviour oracle (not in the original, where getConfigAlias is module-private).
export { getConfigAlias };
