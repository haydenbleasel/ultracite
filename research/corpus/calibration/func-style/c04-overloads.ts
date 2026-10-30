// C04: TypeScript overloads, exported and not.
export function parse(input: string): number;
export function parse(input: number): string;
export function parse(input: string | number): number | string {
  return typeof input === "string" ? Number(input) : String(input);
}

function local(input: string): number;
function local(input: number): string;
function local(input: string | number): number | string {
  return typeof input === "string" ? Number(input) : String(input);
}

export const both = [local("1"), local(1)];
