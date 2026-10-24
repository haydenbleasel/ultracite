/*
 * Source:    honojs/hono — src/jsx/hooks/index.ts, lines 397-425 (useSyncExternalStore)
 * Commit:    df653cea0450657977887d56a5188368387456c8 (2026-07-26T14:07:57+09:00)
 * Permalink: https://github.com/honojs/hono/blob/df653cea0450657977887d56a5188368387456c8/src/jsx/hooks/index.ts#L397-L425
 * Hook:      useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?), hono/jsx's version of
 *   React's hook of the same name.
 * Lines 397-425 are copied, with their formatting changed. The stubs above them replace what the
 * function uses from the rest of the file and from ../dom/render. Anything marked STUB is not part of
 * the original source.
 *
 * License of the source repository (honojs/hono/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2021 - present, Yusuke Wada and Hono contributors
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

// STUB (not part of the original source): useState and useEffect are hono/jsx's own (defined earlier in
// the same file); here they are React's, whose API hono/jsx follows. buildDataStack comes from
// ../dom/render, where each entry is [context, node] for the component being rendered and context[4]
// says whether it's hydrating; this stub always describes a client render that isn't hydrating, so the
// server-snapshot path never runs.
import { useEffect, useState } from "react";

type Context = [unknown, unknown, unknown, unknown, boolean];
const buildDataStack: [Context, unknown][] = [
  [[null, null, null, null, false], null],
];
// ── end of STUB ────────────────────────────────────────────────────────

export const useSyncExternalStore = <T>(
  subscribe: (callback: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T
): T => {
  const buildData = buildDataStack.at(-1) as [Context, unknown];
  if (!buildData) {
    // now a stringify process, maybe in server side
    if (!getServerSnapshot) {
      throw new Error(
        "getServerSnapshot is required for server side rendering"
      );
    }
    return getServerSnapshot();
  }

  const [serverSnapshotIsUsed] = useState<boolean>(
    !!(buildData[0][4] && getServerSnapshot)
  );
  const [state, setState] = useState(() =>
    serverSnapshotIsUsed ? (getServerSnapshot as () => T)() : getSnapshot()
  );
  useEffect(() => {
    if (serverSnapshotIsUsed) {
      setState(getSnapshot());
    }
    return subscribe(() => {
      setState(getSnapshot());
    });
  }, []);

  return state;
};
