/*
 * Function-style subject A: function declarations that convert cleanly.
 *
 * Source:    vercel/next.js — packages/next/src/build/duration-to-string.ts (the whole file)
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85 (2026-10-09)
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/duration-to-string.ts#L1-L99
 * Functions: durationToString, durationToStringWithNanoseconds, hrtimeToSeconds,
 *   hrtimeBigIntDurationToString and hrtimeDurationToString, which format build and request
 *   durations for Next.js's terminal output (seconds, hrtime tuples and bigint nanoseconds).
 * Rules it hits: see examples.json (measured with func-style-examples.cjs).
 * Why it converts cleanly: every function is defined above its first use (the file is written
 *   bottom-up), none reads this, arguments or new.target or is called with new, none is a
 *   generator, overloaded, generic, an assertion or never-returning, and nothing calls them while
 *   the module loads. Three of the five bodies are a single return.
 * What the project did: the history clone shows the file from vercel/next.js#84602 (cb92e8dfbb,
 *   2025-10-07, "Build: Add time to logline of every step"), then #84905, #84906, #84945, #85136,
 *   #88313 ("Time logs: Show full millisecond instead of 1 decimal"), #94813 ("Format
 *   submillisecond durations as milliseconds") and #94811. Every version uses declarations.
 * Behaviour to preserve: the five functions' results for every input (each threshold, just above
 *   and below it, fractions, zero, negatives, NaN, the infinities; bigints of every magnitude;
 *   hrtime tuples), the four exports and their names, and the JSDoc on each function.
 * Expected response: rewrite each declaration as a const arrow function (export const for the
 *   exported four), keeping the parameter and return types and the JSDoc. The single-return bodies
 *   (hrtimeToSeconds, hrtimeBigIntDurationToString, hrtimeDurationToString) can drop their braces.
 *   Nothing moves.
 * Tempting responses: turning the if/else chains into nested ternaries; changing a comparison
 *   while rewriting (durationToString compares with >, durationToStringWithNanoseconds with >=);
 *   dropping the return types or the JSDoc; reordering the file.
 * Gaming moves (measured in examples.json): a suppression comment; function expressions; the
 *   helpers as methods of an exported object; var.
 * The file is copied verbatim below this comment. Nothing is stubbed.
 *
 * License of the source repository (vercel/next.js/license.md), reproduced in full (also in
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
// Time thresholds in seconds
const SECONDS_IN_MINUTE = 60
const MINUTES_THRESHOLD_SECONDS = 120 // 2 minutes
const SECONDS_THRESHOLD_HIGH = 40
const SECONDS_THRESHOLD_LOW = 2
const MILLISECONDS_PER_SECOND = 1000

// Time thresholds and conversion factors for nanoseconds
const NANOSECONDS_PER_SECOND = 1_000_000_000
const NANOSECONDS_PER_MILLISECOND = 1_000_000
const NANOSECONDS_IN_MINUTE = 60_000_000_000 // 60 * 1_000_000_000
const MINUTES_THRESHOLD_NANOSECONDS = 120_000_000_000 // 2 minutes in nanoseconds
const SECONDS_THRESHOLD_HIGH_NANOSECONDS = 40_000_000_000 // 40 seconds in nanoseconds
const SECONDS_THRESHOLD_LOW_NANOSECONDS = 2_000_000_000 // 2 seconds in nanoseconds
const MILLISECONDS_THRESHOLD_NANOSECONDS = 2_000_000 // 2 milliseconds in nanoseconds

/**
 * Converts a duration in seconds to a human-readable string format.
 * Formats duration based on magnitude for optimal readability:
 * - >= 2 minutes: show in minutes with 1 decimal place (e.g., "2.5min")
 * - >= 40 seconds: show in whole seconds (e.g., "45s")
 * - >= 2 seconds: show in seconds with 1 decimal place (e.g., "3.2s")
 * - < 2 seconds: show in whole milliseconds (e.g., "1500ms")
 *
 * @deprecated Use hrtimeBigIntDurationToString instead, collect time in nanoseconds using process.hrtime.bigint().
 * @param compilerDuration - Duration in seconds as a number
 * @returns Formatted duration string with appropriate unit and precision
 */
export function durationToString(compilerDuration: number) {
  if (compilerDuration > MINUTES_THRESHOLD_SECONDS) {
    return `${(compilerDuration / SECONDS_IN_MINUTE).toFixed(1)}min`
  } else if (compilerDuration > SECONDS_THRESHOLD_HIGH) {
    return `${compilerDuration.toFixed(0)}s`
  } else if (compilerDuration > SECONDS_THRESHOLD_LOW) {
    return `${compilerDuration.toFixed(1)}s`
  } else {
    return `${(compilerDuration * MILLISECONDS_PER_SECOND).toFixed(0)}ms`
  }
}

/**
 * Converts a nanosecond duration to a human-readable string format.
 * Formats duration based on magnitude for optimal readability:
 * - >= 2 minutes: show in minutes with 1 decimal place (e.g., "2.5min")
 * - >= 40 seconds: show in whole seconds (e.g., "45s")
 * - >= 2 seconds: show in seconds with 1 decimal place (e.g., "3.2s")
 * - >= 2 milliseconds: show in whole milliseconds (e.g., "250ms")
 * - < 2 milliseconds: show in milliseconds with 1 decimal place (e.g., "0.5ms")
 *
 * @param durationBigInt - Duration in nanoseconds as a BigInt
 * @returns Formatted duration string with appropriate unit and precision
 */
function durationToStringWithNanoseconds(durationBigInt: bigint): string {
  const duration = Number(durationBigInt)
  if (duration >= MINUTES_THRESHOLD_NANOSECONDS) {
    return `${(duration / NANOSECONDS_IN_MINUTE).toFixed(1)}min`
  } else if (duration >= SECONDS_THRESHOLD_HIGH_NANOSECONDS) {
    return `${(duration / NANOSECONDS_PER_SECOND).toFixed(0)}s`
  } else if (duration >= SECONDS_THRESHOLD_LOW_NANOSECONDS) {
    return `${(duration / NANOSECONDS_PER_SECOND).toFixed(1)}s`
  } else if (duration >= MILLISECONDS_THRESHOLD_NANOSECONDS) {
    return `${(duration / NANOSECONDS_PER_MILLISECOND).toFixed(0)}ms`
  } else {
    return `${(duration / NANOSECONDS_PER_MILLISECOND).toFixed(1)}ms`
  }
}

/**
 * Converts a high-resolution time tuple to seconds.
 *
 * @param hrtime - High-resolution time tuple of [seconds, nanoseconds]
 * @returns Duration in seconds as a floating-point number
 */
export function hrtimeToSeconds(hrtime: [number, number]): number {
  // hrtime is a tuple of [seconds, nanoseconds]
  return hrtime[0] + hrtime[1] / NANOSECONDS_PER_SECOND
}

/**
 * Converts a BigInt nanosecond duration to a human-readable string format.
 * This is the preferred method for formatting high-precision durations.
 *
 * @param hrtime - Duration in nanoseconds as a BigInt (typically from process.hrtime.bigint())
 * @returns Formatted duration string with appropriate unit and precision
 */
export function hrtimeBigIntDurationToString(hrtime: bigint) {
  return durationToStringWithNanoseconds(hrtime)
}

/**
 * Converts a high-resolution time tuple to a human-readable string format.
 *
 * @deprecated Use hrtimeBigIntDurationToString with process.hrtime.bigint() for better precision.
 * @param hrtime - High-resolution time tuple of [seconds, nanoseconds]
 * @returns Formatted duration string with appropriate unit and precision
 */
export function hrtimeDurationToString(hrtime: [number, number]): string {
  return durationToString(hrtimeToSeconds(hrtime))
}
