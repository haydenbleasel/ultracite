// C33: a declaration that shares its name with a type alias, and one with an interface.
export type output<T> = { value: T };
export function output<T>(value: T): output<T> {
  return { value };
}

interface Table {
  rows: number;
}
export function Table(rows: number): Table {
  return { rows };
}
