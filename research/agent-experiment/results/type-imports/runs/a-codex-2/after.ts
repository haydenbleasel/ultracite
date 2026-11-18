/*
 * Source:    vercel/next.js — packages/next/src/telemetry/flush-telemetry.ts (whole file, lines 1-10)
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/telemetry/flush-telemetry.ts#L1-L10
 * Function:  flushTelemetry, which Next.js calls on exit: it reads the Telemetry instance a build or dev
 *   server stored in traceGlobals, if any, and awaits its flush().
 * The lines below the license come from that commit, edited since by automated tooling. trace/shared.ts
 *   is copied from the same commit, edited the same way; telemetry/storage.ts is a STUB (the real
 *   module imports conf, ci-info and other compiled packages) that keeps the Telemetry class's
 *   flush().
 *
 * License of the source repository (vercel/next.js/license.md), reproduced:
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
import { traceGlobals } from "../trace/shared";
import type { Telemetry } from "./storage";

export async function flushTelemetry() {
  const telemetry = traceGlobals.get("telemetry") as
    | InstanceType<typeof Telemetry>
    | undefined;
  if (telemetry) {
    await telemetry.flush();
  }
}
