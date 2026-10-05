declare function wrap<T>(fn: T): T;

export const undocumented = (value: string): string => value;

export declare function undocumentedDeclaration(): void;

export interface PublicOptions {
  value: string;
}

export type PublicId = string;

export enum PublicStatus {
  Active = 1,
  Disabled = 2,
}

/**
 * Returns a value.
 * @param value Description without the TSDoc separator
 * @returns The supplied value.
 */
export const malformedTSDoc = (value: string): string => value;

/**
 * Returns the supplied value.
 *
 * @param value - Value to return.
 * @returns The supplied value.
 */
export const documented = (value: string): string => value;

const internalHelper = (value: string): string => value;

export class PublicService {
  run(): void {}

  get label(): string {
    return "";
  }

  set label(_value: string) {}

  static create(): PublicService {
    return new PublicService();
  }

  private hidden(): void {}
}

export const wrapped = wrap((value: string): string => value);

export default wrap((): number => 1);
