// Nesting in a test and in the alternate at once.
export const route = (admin: boolean, beta: boolean, path: string): string =>
  (admin ? beta : false) ? "/beta" : path === "/" ? "/home" : path;
