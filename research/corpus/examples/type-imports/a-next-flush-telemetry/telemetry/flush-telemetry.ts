/*
 * Type-imports subject A: an `import()` type that converts to `import type` with nothing else changing.
 *
 * Source:    vercel/next.js — packages/next/src/telemetry/flush-telemetry.ts (whole file, lines 1-10)
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/telemetry/flush-telemetry.ts#L1-L10
 * Function:  flushTelemetry, which Next.js calls on exit: it reads the Telemetry instance a build or dev
 *   server stored in traceGlobals, if any, and awaits its flush().
 * Rules it hits: see examples.json (measured with type-imports-examples.cjs, after `ultracite fix`).
 * Why it converts cleanly: the only reference to ./storage is a type (`InstanceType<typeof
 *   import('./storage').Telemetry>`), so the module never loads from this file. `import type {
 *   Telemetry } from './storage'` plus `InstanceType<typeof Telemetry>` keeps it that way under every
 *   compiler: Next.js compiles with verbatimModuleSyntax, and an `import type` is erased everywhere.
 * What the project did: the file arrived with vercel/next.js#84847 (27821674a6, 2025-10-14, "improve next
 *   config schema validation errors"), written this way. Next.js's ESLint config sets
 *   consistent-type-imports' disallowTypeAnnotations to false, so the project allows `import()` types.
 * Behaviour to preserve: importing the file evaluates trace/shared and not telemetry/storage (or any
 *   module storage imports); flushTelemetry() awaits the stored telemetry's flush() exactly once when
 *   one is stored, does nothing otherwise, and resolves to undefined.
 * Expected response: `import type { Telemetry } from './storage'` and `InstanceType<typeof Telemetry>`
 *   (or a type-only namespace import).
 * Tempting responses: a value import, `import { Telemetry } from './storage'`, which loads storage.ts
 *   and its dependencies (conf, ci-info, the telemetry payload code) whenever this file loads, because
 *   Next.js keeps value imports as written; a local interface with a flush() method in place of the
 *   import.
 * Gaming moves (measured in examples.json): suppression comments; `import x = require()`; `import type`
 *   plus a value import of the same module; a local declaration of the type.
 * The lines below the license are copied verbatim. trace/shared.ts is copied verbatim from the same
 *   commit; telemetry/storage.ts is a STUB (the real module imports conf, ci-info and other compiled
 *   packages) that keeps the Telemetry class's flush().
 *
 * License of the source repository (vercel/next.js/license.md), reproduced (also in
 * research/corpus/examples/licenses/next.js-license.md):
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2025 Vercel, Inc.
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
import { traceGlobals } from '../trace/shared'

export async function flushTelemetry() {
  let telemetry = traceGlobals.get('telemetry') as
    | InstanceType<typeof import('./storage').Telemetry>
    | undefined
  if (telemetry) {
    await telemetry.flush()
  }
}
