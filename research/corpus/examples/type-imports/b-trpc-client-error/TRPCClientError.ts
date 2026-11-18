/*
 * Type-imports subject B: a mixed import next to an `import type` of the same module, which two rules
 * pull apart and back together.
 *
 * Source:    trpc/trpc — packages/client/src/TRPCClientError.ts (whole file, lines 1-118)
 * Commit:    796700d8653b3832409fff997e6f5789519b9ea7
 * Permalink: https://github.com/trpc/trpc/blob/796700d8653b3832409fff997e6f5789519b9ea7/packages/client/src/TRPCClientError.ts#L1-L118
 * Function:  TRPCClientError, the error class tRPC's client throws, its static from() that turns any
 *   failure (a TRPCClientError, an error response envelope, an Error, a string) into one, and
 *   isTRPCClientError.
 * Rules it hits: see examples.json (measured with type-imports-examples.cjs, after `ultracite fix`).
 * Why it needs a choice: the file imports five types with `import type` and, in a second declaration
 *   from the same module, the value isObject next to an inline `type DefaultErrorShape`.
 *   consistent-type-specifier-style ("prefer-top-level") moves DefaultErrorShape into its own `import
 *   type`, which import/no-duplicates and no-duplicate-imports then report as a second type import of
 *   the module; Oxlint's no-duplicates fix merges the declarations back with inline `type` specifiers.
 *   The fix pass never settles (measured in fixes.json), so the reports reach the agent.
 * What the project did: trpc/trpc#5274 (b93149c63, 2024-01-07, "chore: add
 *   `consistent-type-(imports|exports)` lint rules", by Alex / KATT) turned consistent-type-imports on
 *   across 218 files. The next day #5275 (ab22b41f7, "refactor: flatten(?) core package, remove
 *   `@trpc/client/shared`", by Julius Marminge) moved DefaultErrorShape from the file's `import type`
 *   into the value import as an inline `type`, which is how it stands. tRPC's ESLint config sets no
 *   specifier style.
 * Behaviour to preserve: the module from which isObject comes still evaluates and isObject is a real
 *   function at runtime; from() returns the same TRPCClientError (message, shape, data, meta, cause,
 *   name, prototype) for every kind of input; isTRPCClientError gives the same answers.
 * Expected response: one value import, `import { isObject } from '@trpc/server/unstable-core-do-not-import'`,
 *   and one `import type` with all six types.
 * Tempting responses: everything in one `import type { …, isObject }` (what import-x's no-duplicates
 *   fix writes when it runs alone: isObject becomes type-only and the module no longer evaluates, so
 *   every call throws); everything in one import with inline `type` specifiers (no-duplicates is
 *   satisfied, prefer-top-level reports again); three declarations.
 * Gaming moves (measured in examples.json): suppression comments; `import x = require()`; local copies
 *   of the types.
 * The lines below the license are copied verbatim. '@trpc/server/unstable-core-do-not-import' resolves
 *   to stubs/unstable-core-do-not-import.ts (STUB) through the examples' tsconfig paths and the oracle.
 *
 * License of the source repository (trpc/trpc/LICENSE), the MIT License, reproduced (also in
 * research/corpus/examples/licenses/trpc-LICENSE):
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
import type {
  inferClientTypes,
  InferrableClientTypes,
  Maybe,
  TRPCErrorResponse,
} from '@trpc/server/unstable-core-do-not-import';
import {
  isObject,
  type DefaultErrorShape,
} from '@trpc/server/unstable-core-do-not-import';

type inferErrorShape<TInferrable extends InferrableClientTypes> =
  inferClientTypes<TInferrable>['errorShape'];
export interface TRPCClientErrorBase<TShape extends DefaultErrorShape> {
  readonly message: string;
  readonly shape: Maybe<TShape>;
  readonly data: Maybe<TShape['data']>;
}
export type TRPCClientErrorLike<TInferrable extends InferrableClientTypes> =
  TRPCClientErrorBase<inferErrorShape<TInferrable>>;

export function isTRPCClientError<TInferrable extends InferrableClientTypes>(
  cause: unknown,
): cause is TRPCClientError<TInferrable> {
  return cause instanceof TRPCClientError;
}

function isTRPCErrorResponse(obj: unknown): obj is TRPCErrorResponse<any> {
  return (
    isObject(obj) &&
    isObject(obj['error']) &&
    typeof obj['error']['code'] === 'number' &&
    typeof obj['error']['message'] === 'string'
  );
}

function getMessageFromUnknownError(err: unknown, fallback: string): string {
  if (typeof err === 'string') {
    return err;
  }
  if (isObject(err) && typeof err['message'] === 'string') {
    return err['message'];
  }
  return fallback;
}

export class TRPCClientError<TRouterOrProcedure extends InferrableClientTypes>
  extends Error
  implements TRPCClientErrorBase<inferErrorShape<TRouterOrProcedure>>
{
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override doesn't work in all environments due to "This member cannot have an 'override' modifier because it is not declared in the base class 'Error'"
  public override readonly cause;
  public readonly shape: Maybe<inferErrorShape<TRouterOrProcedure>>;
  public readonly data: Maybe<inferErrorShape<TRouterOrProcedure>['data']>;

  /**
   * Additional meta data about the error
   * In the case of HTTP-errors, we'll have `response` and potentially `responseJSON` here
   */
  public meta;

  constructor(
    message: string,
    opts?: {
      result?: Maybe<TRPCErrorResponse<inferErrorShape<TRouterOrProcedure>>>;
      cause?: Error;
      meta?: Record<string, unknown>;
    },
  ) {
    const cause = opts?.cause;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore https://github.com/tc39/proposal-error-cause
    super(message, { cause });

    this.meta = opts?.meta;

    this.cause = cause;
    this.shape = opts?.result?.error;
    this.data = opts?.result?.error.data;
    this.name = 'TRPCClientError';

    Object.setPrototypeOf(this, TRPCClientError.prototype);
  }

  public static from<TRouterOrProcedure extends InferrableClientTypes>(
    _cause: Error | TRPCErrorResponse<any> | object,
    opts: { meta?: Record<string, unknown>; cause?: Error } = {},
  ): TRPCClientError<TRouterOrProcedure> {
    const cause = _cause as unknown;

    if (isTRPCClientError(cause)) {
      if (opts.meta) {
        // Decorate with meta error data
        cause.meta = {
          ...cause.meta,
          ...opts.meta,
        };
      }
      return cause;
    }
    if (isTRPCErrorResponse(cause)) {
      return new TRPCClientError(cause.error.message, {
        ...opts,
        result: cause,
        cause: opts.cause,
      });
    }
    return new TRPCClientError(
      getMessageFromUnknownError(cause, 'Unknown error'),
      {
        ...opts,
        cause: cause as any,
      },
    );
  }
}
