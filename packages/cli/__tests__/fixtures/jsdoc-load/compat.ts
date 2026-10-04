declare function wrap<T>(fn: T): T;

/**
 * Formats a greeting.
 *
 * @remarks
 * Uses the name as given.
 *
 * @param options - The greeting options.
 * @returns The greeting.
 * @throws {@link RangeError} When the name is empty.
 */
export const greet = ({ name }: { name: string }): string => {
  if (!name) {
    throw new RangeError("name is empty");
  }
  return `Hello, ${name}`;
};

/**
 * Counts up from one.
 *
 * @returns The counter.
 */
export function* count(): Generator<number> {
  yield 1;
}

/**
 * Returns its input.
 *
 * @typeParam T - The value type.
 * @param value - The value.
 * @returns The value.
 */
export const identity = <T>(value: T): T => value;

/** Runs a wrapped handler. */
export const handler = wrap((value: string): string => value);

/** A documented service. */
export class Service {
  #name = "";

  /**
   * The service name.
   *
   * @returns The name.
   */
  get name(): string {
    return this.#name;
  }

  set name(value: string) {
    this.#name = value;
  }

  /** Runs the service. */
  run(): void {}
}
