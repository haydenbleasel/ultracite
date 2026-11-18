/*
 * STUB for type-imports subject A. Stands in for vercel/next.js packages/next/src/telemetry/storage.ts
 * at d8bfc3c994670c367e6e31853b78f42e8b7fba85, which imports conf, is-docker, ci-info and the payload
 * code. It keeps the Telemetry class's async flush(), and counts calls on the instance so the oracle
 * can see them. Not part of the source.
 */
export class Telemetry {
  flushes = 0;

  flush = async (): Promise<void> => {
    this.flushes += 1;
  };
}
