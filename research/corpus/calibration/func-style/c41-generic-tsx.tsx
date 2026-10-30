// C41: generic declarations in a .tsx file (an arrow needs `<T,>`), and with a constraint.
export function first<T>(items: T[]): T | undefined {
  return items[0];
}

export function keyOf<T extends object>(value: T): (keyof T)[] {
  return Object.keys(value) as (keyof T)[];
}
