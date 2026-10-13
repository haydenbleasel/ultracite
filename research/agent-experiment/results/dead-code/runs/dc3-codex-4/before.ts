/*
 * Source:    trpc/trpc — packages/upgrade/src/lib/git.ts, lines 1-54 (the whole file)
 * Commit:    796700d8653b3832409fff997e6f5789519b9ea7 (2026-10-10T09:02:16Z)
 * Permalink: https://github.com/trpc/trpc/blob/796700d8653b3832409fff997e6f5789519b9ea7/packages/upgrade/src/lib/git.ts#L1-L54
 * Function:  filterIgnored (exported declaration) and assertCleanGitTree, the other function in the
 *            file. The imports on lines 2-4 (@clack/prompts, typescript and ./execa) are replaced
 *            by stubs marked STUB.
 * Lines 1 and 6-54 are copied verbatim. Anything marked STUB is not part of the original source.
 *
 * License of the source repository (trpc/trpc/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2023 Alex Johansson
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
import { resolve } from 'path';

// STUB (not part of the original source): what lines 2-4 import from @clack/prompts, typescript
// and ./execa (`promisify(exec)` from node:child_process), reduced to what the file uses. Each
// call goes to a handler the test harness installs.
interface SourceFile {
  readonly fileName: string;
}
type ExecResult = { stdout: string; stderr: string };
export const harness: {
  cancel: (message: string) => void;
  execa: (command: string) => Promise<ExecResult>;
  log: (level: 'error' | 'info', args: unknown[]) => void;
} = {
  cancel: (message) => harness.log('error', [message]),
  execa: (command) => Promise.resolve({ stdout: command, stderr: '' }),
  log: (level, args) => console[level](...args),
};
const cancel = (message: string): void => harness.cancel(message);
const log = {
  error: (...args: unknown[]): void => harness.log('error', args),
  info: (...args: unknown[]): void => harness.log('info', args),
};
const execa = (command: string): Promise<ExecResult> => harness.execa(command);

// Verbatim: packages/upgrade/src/lib/git.ts lines 6-54
export async function assertCleanGitTree() {
  const { stdout } = await execa('git status');
  if (!stdout.includes('nothing to commit')) {
    cancel(
      'Git tree is not clean, please commit your changes and try again, or run with `--force`',
    );
    process.exit(1);
  }
}

export async function filterIgnored(files: readonly SourceFile[]) {
  let stdout = '';
  let stderr = '';
  try {
    const result = await execa('git check-ignore **/*');
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    log.error('Error executing git check-ignore:', error);
    stdout = '';
  }

  const ignores = stdout.split('\n');

  if (process.env['VERBOSE']) {
    log.info(`cwd: ${process.cwd()}`);
    log.info(
      `All files in program: ${files.map((file) => file.fileName).join(', ')}`,
    );
    log.info(`Ignored files: ${ignores.join(', ')}`);
  }

  // Ignore "common files"
  const filteredSourcePaths = files
    .filter(
      (source) =>
        source.fileName.startsWith(resolve()) && // only look ahead of current directory
        !source.fileName.includes('/trpc/packages/') && // relative paths when running codemod locally
        !source.fileName.includes('/node_modules/') && // always ignore node_modules
        !ignores.includes(source.fileName), // ignored files
    )
    .map((source) => source.fileName);

  if (process.env['VERBOSE']) {
    log.info(`Filtered files: ${filteredSourcePaths.join(', ')}`);
  }

  return filteredSourcePaths;
}
