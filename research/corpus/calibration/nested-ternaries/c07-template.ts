// A nested ternary inside a template literal: no statement can go here.
export const summary = (n: number): string =>
  `Found ${n === 0 ? "no files" : n === 1 ? "one file" : `${n} files`} to format`;
