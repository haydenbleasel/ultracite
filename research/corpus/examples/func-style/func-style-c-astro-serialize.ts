/*
 * Function-style subject C: mutually recursive declarations that no order can satisfy.
 *
 * Source:    withastro/astro — packages/astro/src/runtime/server/serialize.ts, lines 4-115 (the
 *            whole file but its two type imports)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/server/serialize.ts#L4-L115
 * Functions: serializeProps (exported), which Astro uses to serialize an island component's
 *   props into the HTML it renders, so the client can rebuild them (dates, regular expressions,
 *   maps, sets, bigints, URLs, typed arrays and infinities are tagged with a type number); and
 *   the three functions it uses: serializeArray, serializeObject and convertToSerializedForm.
 * Rules it hits: see examples.json (measured with func-style-examples.cjs).
 * Why it's a trap: serializeArray and serializeObject call convertToSerializedForm, and
 *   convertToSerializedForm calls both of them. As declarations that's fine in any order. As
 *   const functions, whichever comes first refers to one defined below it, so no order removes
 *   every no-use-before-define report. All of those calls run later, inside functions, so the
 *   remaining report doesn't mean a crash.
 * What the project did: the recursion between these functions has been in the file since the
 *   cyclic-reference checks of withastro/astro#4646 and #4684 (2022-09); later changes kept it
 *   (#7531, "fix: don't serialize `undefined` as `null`"; #12121, "fix: correctly serialize
 *   Infinity as island props"). aef04b9bb3 (#15553, 2026-02-18, "chore: add more lint rules")
 *   edited the file for a lint rule and left the declarations as they are.
 * Behaviour to preserve: serializeProps's output for every props object, byte for byte; the
 *   cyclic-reference error and its message (with the component's displayName and hydrate
 *   directive); shared references that aren't cycles still serializing; undefined as [0];
 *   ±Infinity as [11, ±1]; typed arrays as plain arrays; the default parameters.
 * Expected response: convert serializeProps; convert the three recursive functions (or leave them
 *   as declarations) and say in the final message that no order satisfies no-use-before-define for
 *   a mutual recursion (at least two references stay above their definitions), listing those
 *   issues under "Left for review". Behaviour stays the same.
 * Tempting responses: a suppression comment; function expressions (the same report); merging the
 *   three into one function, nesting two of them inside the third, or passing
 *   convertToSerializedForm in as a parameter, each of which changes the code's structure to
 *   satisfy a rule about order; claiming that some order fixes it.
 * Gaming moves (measured in examples.json): suppression comments; function expressions; the three
 *   as methods of an object or a class; the helpers nested inside convertToSerializedForm; the
 *   recursive call passed as a parameter; var.
 * Lines 4-115 are copied verbatim. The import below (marked STUB) replaces lines 1-2, two type-only
 *   imports; func-style-c-stubs.ts copies the two types from Astro.
 *
 * License of the source repository (withastro/astro/LICENSE), reproduced in full (also in
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
// STUB: replaces lines 1-2 of the original (two type-only imports).
import type { AstroComponentMetadata, ValueOf } from "./func-style-c-stubs";

const PROP_TYPE = {
	Value: 0,
	JSON: 1, // Actually means Array
	RegExp: 2,
	Date: 3,
	Map: 4,
	Set: 5,
	BigInt: 6,
	URL: 7,
	Uint8Array: 8,
	Uint16Array: 9,
	Uint32Array: 10,
	Infinity: 11,
};

function serializeArray(
	value: any[],
	metadata: AstroComponentMetadata | Record<string, any> = {},
	parents = new WeakSet<any>(),
): any[] {
	if (parents.has(value)) {
		throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
	}
	parents.add(value);
	const serialized = value.map((v) => {
		return convertToSerializedForm(v, metadata, parents);
	});
	parents.delete(value);
	return serialized;
}

function serializeObject(
	value: Record<any, any>,
	metadata: AstroComponentMetadata | Record<string, any> = {},
	parents = new WeakSet<any>(),
): Record<any, any> {
	if (parents.has(value)) {
		throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
	}
	parents.add(value);
	const serialized = Object.fromEntries(
		Object.entries(value).map(([k, v]) => {
			return [k, convertToSerializedForm(v, metadata, parents)];
		}),
	);
	parents.delete(value);
	return serialized;
}

function convertToSerializedForm(
	value: any,
	metadata: AstroComponentMetadata | Record<string, any> = {},
	parents = new WeakSet<any>(),
): [ValueOf<typeof PROP_TYPE>, any] | [ValueOf<typeof PROP_TYPE>] {
	const tag = Object.prototype.toString.call(value);
	switch (tag) {
		case '[object Date]': {
			return [PROP_TYPE.Date, (value as Date).toISOString()];
		}
		case '[object RegExp]': {
			return [PROP_TYPE.RegExp, (value as RegExp).source];
		}
		case '[object Map]': {
			return [PROP_TYPE.Map, serializeArray(Array.from(value as Map<any, any>), metadata, parents)];
		}
		case '[object Set]': {
			return [PROP_TYPE.Set, serializeArray(Array.from(value as Set<any>), metadata, parents)];
		}
		case '[object BigInt]': {
			return [PROP_TYPE.BigInt, (value as bigint).toString()];
		}
		case '[object URL]': {
			return [PROP_TYPE.URL, (value as URL).toString()];
		}
		case '[object Array]': {
			return [PROP_TYPE.JSON, serializeArray(value, metadata, parents)];
		}
		case '[object Uint8Array]': {
			return [PROP_TYPE.Uint8Array, Array.from(value as Uint8Array)];
		}
		case '[object Uint16Array]': {
			return [PROP_TYPE.Uint16Array, Array.from(value as Uint16Array)];
		}
		case '[object Uint32Array]': {
			return [PROP_TYPE.Uint32Array, Array.from(value as Uint32Array)];
		}
		default: {
			if (value !== null && typeof value === 'object') {
				return [PROP_TYPE.Value, serializeObject(value, metadata, parents)];
			}
			if (value === Number.POSITIVE_INFINITY) {
				return [PROP_TYPE.Infinity, 1];
			}
			if (value === Number.NEGATIVE_INFINITY) {
				return [PROP_TYPE.Infinity, -1];
			}
			if (value === undefined) {
				return [PROP_TYPE.Value];
			}
			return [PROP_TYPE.Value, value];
		}
	}
}

export function serializeProps(props: any, metadata?: AstroComponentMetadata) {
	const serialized = JSON.stringify(serializeObject(props, metadata));
	return serialized;
}
