// C29: a top-level call of a declaration whose body reads a const defined below it.
let indirectError: string | null = null;
try {
  configure();
} catch (e) {
  indirectError = String(e);
}
export const configureError = indirectError;

function configure(): number {
  return DEFAULTS.size;
}

const DEFAULTS = { size: 3 };
