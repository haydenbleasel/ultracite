// C31: a declaration whose body is a single return (an arrow could drop the braces), and a block
// arrow with a single return.
export function area(r: number): number {
  return Math.PI * r * r;
}

export const perimeter = (r: number): number => {
  return 2 * Math.PI * r;
};

export const point = (x: number) => {
  return { x };
};
