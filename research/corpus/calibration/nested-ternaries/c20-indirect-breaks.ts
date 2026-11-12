// A conditional inside an array, an object, a function or a JSX container breaks sonarjs's nesting.
export const flags = (a: boolean, b: boolean) => (a ? [b ? 1 : 2] : []);
export const options = (a: boolean, b: boolean) => (a ? { level: b ? 1 : 2 } : null);
export const later = (a: boolean, b: boolean) => (a ? () => (b ? 1 : 2) : null);
