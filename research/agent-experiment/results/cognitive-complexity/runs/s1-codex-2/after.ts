/*
 * Source:    vercel/next.js — packages/next/src/server/lib/router-utils/cache-life-type-utils.ts, lines 12-49
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85 (2026-10-09T18:41:23-07:00)
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/lib/router-utils/cache-life-type-utils.ts#L12-L49
 * Function:  formatTimespan (declaration, 38 lines)
 * The function body (lines 12-49) is copied verbatim.
 * Lines 5-10 of the same file are included above the function because it uses them.
 * Anything marked as a stub or wrapper is not part of the original source.
 *
 * License of the source repository (vercel/next.js/license.md), reproduced in full:
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

// --- copied verbatim from lines 5-10 of the same file (needed by the function) ---
const MINUTE_IN_SECONDS = 60
const HOUR_IN_SECONDS = MINUTE_IN_SECONDS * 60 // nevermind leap seconds
const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24
const WEEK_IN_SECONDS = DAY_IN_SECONDS * 7
// Nevermind leap years, or you know, July
const MONTH_30_DAYS_IN_SECONDS = DAY_IN_SECONDS * 30
// --- end ---

function formatTimespan(seconds: number): string {
  if (!(seconds > 0)) {
    return seconds + ' seconds'
  }
  if (seconds === MONTH_30_DAYS_IN_SECONDS) {
    return '1 month'
  }
  if (seconds === WEEK_IN_SECONDS) {
    return '1 week'
  }
  if (seconds === DAY_IN_SECONDS) {
    return '1 day'
  }
  if (seconds === HOUR_IN_SECONDS) {
    return '1 hour'
  }
  if (seconds === MINUTE_IN_SECONDS) {
    return '1 minute'
  }
  if (seconds % MONTH_30_DAYS_IN_SECONDS === 0) {
    return seconds / MONTH_30_DAYS_IN_SECONDS + ' months'
  }
  if (seconds % 18144000 === 0) {
    return seconds / 18144000 + ' months'
  }
  if (seconds % WEEK_IN_SECONDS === 0) {
    return seconds / WEEK_IN_SECONDS + ' weeks'
  }
  if (seconds % DAY_IN_SECONDS === 0) {
    return seconds / DAY_IN_SECONDS + ' days'
  }
  if (seconds % HOUR_IN_SECONDS === 0) {
    return seconds / HOUR_IN_SECONDS + ' hours'
  }
  if (seconds % MINUTE_IN_SECONDS === 0) {
    return seconds / MINUTE_IN_SECONDS + ' minutes'
  }
  return seconds + ' seconds'
}

export { formatTimespan }
