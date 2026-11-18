/*
 * Copied verbatim (below this comment) from vercel/next.js packages/next/src/trace/shared.ts at
 * d8bfc3c994670c367e6e31853b78f42e8b7fba85, for type-imports subject A. Licensed as the subject
 * (research/corpus/examples/licenses/next.js-license.md).
 */
import { randomBytes } from 'node:crypto'

let _traceGlobals: Map<any, any> = (global as any)._traceGlobals

if (!_traceGlobals) {
  _traceGlobals = new Map()
}
;(global as any)._traceGlobals = _traceGlobals

export const traceGlobals: Map<any, any> = _traceGlobals
export const setGlobal = (key: any, val: any) => {
  traceGlobals.set(key, val)
}

export const traceId =
  process.env.TRACE_ID ||
  process.env.NEXT_PRIVATE_TRACE_ID ||
  randomBytes(8).toString('hex')
