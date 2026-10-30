// C11: a const arrow with inline types, and a declaration with the same types.
export const lengthOf = (input: string): number => input.length;

export function lengthOfDeclared(input: string): number {
  return input.length;
}
