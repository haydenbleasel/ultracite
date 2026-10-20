/*
 * Source:    withastro/astro — packages/astro/src/core/logger/impls/json.ts, lines 9-48 (the whole
 *            file but its imports)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/logger/impls/json.ts#L33-L38
 * Function:  jsonLoggerDestination(), Astro's JSON log destination: one JSON line per log event,
 *   on console.info, or console.error for errors, optionally pretty-printed.
 * Lines 9-48 are copied, with their formatting changed. The stubs above them replace its
 * imports. Anything marked STUB is not part of the original source.
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
type AstroLoggerLevel = "debug" | "info" | "warn" | "error" | "silent";

interface AstroLoggerMessage {
  label: string | null;
  level: AstroLoggerLevel;
  message: string;
  newLine: boolean;
}

interface AstroLoggerDestination {
  write: (chunk: AstroLoggerMessage) => void;
  flush?: () => Promise<void> | void;
  close?: () => Promise<void> | void;
}

interface AstroInlineConfig {
  logLevel?: AstroLoggerLevel;
}

const levels: Record<AstroLoggerLevel, number> = {
  debug: 20,
  error: 50,
  info: 30,
  silent: 90,
  warn: 40,
};

function matchesLevel(
  messageLevel: AstroLoggerLevel,
  configuredLevel: AstroLoggerLevel
): boolean {
  return levels[messageLevel] >= levels[configuredLevel];
}

export class AstroLogger {
  options: { destination: AstroLoggerDestination; level: AstroLoggerLevel };
  constructor(options: {
    destination: AstroLoggerDestination;
    level: AstroLoggerLevel;
  }) {
    this.options = options;
  }
  private log(
    level: AstroLoggerLevel,
    label: string | null,
    message: string,
    newLine = true
  ) {
    if (levels[this.options.level] > levels[level]) {
      return;
    }
    this.options.destination.write({ label, level, message, newLine });
  }
  info(label: string | null, message: string) {
    this.log("info", label, message);
  }
  warn(label: string | null, message: string) {
    this.log("warn", label, message);
  }
  error(label: string | null, message: string) {
    this.log("error", label, message);
  }
}
// END STUB

export interface JsonHandlerConfig {
  /**
   * Whether the JSON line should format on multiple lines
   */
  pretty?: boolean;
  /**
   * The level of logs that should be printed by the logger.
   */
  level?: AstroLoggerLevel;
}

export const SGR_REGEX = new RegExp(
  `${String.fromCharCode(0x1b)}\\[[0-9;]*m`,
  "g"
);

export default function jsonLoggerDestination(
  config: JsonHandlerConfig = {}
): AstroLoggerDestination {
  const { pretty = false, level = "info" } = config;
  return {
    write(event) {
      if (!matchesLevel(event.level, level)) {
        return;
      }

      const destination =
        levels[event.level] >= levels["error"] ? console.error : console.info;
      const message = event.message.replace(SGR_REGEX, "");
      const payload = pretty
        ? JSON.stringify(
            { label: event.label, level: event.level, message },
            ["message", "label", "level"],
            2
          )
        : JSON.stringify(
            { label: event.label, level: event.level, message },
            ["message", "label", "level"]
          );
      destination(payload);
    },
  };
}

export function createJsonLoggerFromFlags(config: AstroInlineConfig) {
  return new AstroLogger({
    destination: jsonLoggerDestination({ pretty: false }),
    level: config.logLevel ?? "info",
  });
}
