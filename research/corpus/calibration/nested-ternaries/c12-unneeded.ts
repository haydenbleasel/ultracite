// Ternaries no-unneeded-ternary rewrites.
export const isSet = (value: unknown): boolean => (value ? true : false);
export const notSet = (value: unknown): boolean => (value ? false : true);
export const orDefault = (value: number, other: number): number => (value ? value : other);
