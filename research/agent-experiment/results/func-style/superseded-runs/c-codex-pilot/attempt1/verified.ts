/*
 * Source:    withastro/astro — packages/astro/src/runtime/server/serialize.ts, lines 4-115 (the
 *            whole file but its two type imports)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/server/serialize.ts#L4-L115
 * Functions: serializeProps (exported), which Astro uses to serialize an island component's
 *   props into the HTML it renders, and the three functions it uses: serializeArray,
 *   serializeObject and convertToSerializedForm.
 * Lines 4-115 are copied, with their formatting changed. The import marked STUB replaces lines
 *   1-2, two type-only imports; stubs.ts copies the two types from Astro.
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
// STUB: replaces lines 1-2 of the original (two type-only imports).
import type { AstroComponentMetadata, ValueOf } from "./stubs";

const PROP_TYPE = {
  BigInt: 6,
  Date: 3,
  Infinity: 11,
  JSON: 1, // Actually means Array
  Map: 4,
  RegExp: 2,
  Set: 5,
  URL: 7,
  Uint16Array: 9,
  Uint32Array: 10,
  Uint8Array: 8,
  Value: 0,
};

const serializeArray = (
  serialize: typeof convertToSerializedForm,
  value: any[],
  metadata: AstroComponentMetadata | Record<string, any> = {},
  parents = new WeakSet<any>()
): any[] => {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = value.map((v) => serialize(v, metadata, parents));
  parents.delete(value);
  return serialized;
};

const serializeObject = (
  serialize: typeof convertToSerializedForm,
  value: Record<any, any>,
  metadata: AstroComponentMetadata | Record<string, any> = {},
  parents = new WeakSet<any>()
): Record<any, any> => {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, serialize(v, metadata, parents)])
  );
  parents.delete(value);
  return serialized;
};

const convertToSerializedForm = (
  value: any,
  metadata: AstroComponentMetadata | Record<string, any> = {},
  parents = new WeakSet<any>()
): [ValueOf<typeof PROP_TYPE>, any] | [ValueOf<typeof PROP_TYPE>] => {
  const tag = Object.prototype.toString.call(value);
  switch (tag) {
    case "[object Date]": {
      return [PROP_TYPE.Date, (value as Date).toISOString()];
    }
    case "[object RegExp]": {
      return [PROP_TYPE.RegExp, (value as RegExp).source];
    }
    case "[object Map]": {
      return [
        PROP_TYPE.Map,
        serializeArray(
          convertToSerializedForm,
          [...(value as Map<any, any>)],
          metadata,
          parents
        ),
      ];
    }
    case "[object Set]": {
      return [
        PROP_TYPE.Set,
        serializeArray(
          convertToSerializedForm,
          [...(value as Set<any>)],
          metadata,
          parents
        ),
      ];
    }
    case "[object BigInt]": {
      return [PROP_TYPE.BigInt, (value as bigint).toString()];
    }
    case "[object URL]": {
      return [PROP_TYPE.URL, (value as URL).toString()];
    }
    case "[object Array]": {
      return [
        PROP_TYPE.JSON,
        serializeArray(convertToSerializedForm, value, metadata, parents),
      ];
    }
    case "[object Uint8Array]": {
      return [PROP_TYPE.Uint8Array, [...(value as Uint8Array)]];
    }
    case "[object Uint16Array]": {
      return [PROP_TYPE.Uint16Array, [...(value as Uint16Array)]];
    }
    case "[object Uint32Array]": {
      return [PROP_TYPE.Uint32Array, [...(value as Uint32Array)]];
    }
    default: {
      if (value !== null && typeof value === "object") {
        return [
          PROP_TYPE.Value,
          serializeObject(convertToSerializedForm, value, metadata, parents),
        ];
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
};

export const serializeProps = (
  props: any,
  metadata?: AstroComponentMetadata
) => {
  const serialized = JSON.stringify(
    serializeObject(convertToSerializedForm, props, metadata)
  );
  return serialized;
};
