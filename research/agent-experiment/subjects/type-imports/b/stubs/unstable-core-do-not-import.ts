/*
 * STUB: stands in for '@trpc/server/unstable-core-do-not-import' at
 * trpc/trpc@796700d8653b3832409fff997e6f5789519b9ea7: isObject is copied from
 * packages/server/src/unstable-core-do-not-import/utils.ts (MIT, as
 * TRPCClientError.ts), and the types are reduced to what TRPCClientError.ts needs to type-check (the real
 * ones are generic over routers and procedures). Not part of the source.
 */
export type Maybe<TType> = TType | null | undefined;
export interface DefaultErrorShape {
  code: number;
  data: { code: string; httpStatus: number; path?: string; stack?: string };
  message: string;
}
// The real type is a union of routers, procedures and client type maps; `any` stands in for it so the
// generic error class type-checks the way it does against the real one.
// biome-ignore lint/suspicious/noExplicitAny: stub
export type InferrableClientTypes = any;
// biome-ignore lint/suspicious/noExplicitAny: stub
export type inferClientTypes<_TInferrable extends InferrableClientTypes> = any;
// biome-ignore lint/suspicious/noExplicitAny: stub
export interface TRPCErrorResponse<TError = any> {
  error: TError;
  id?: number | string | null;
}

/**
 * Check that value is object
 * @internal
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && !Array.isArray(value) && typeof value === "object";
}
