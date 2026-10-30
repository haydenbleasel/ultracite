// C36: an IIFE and a callback (func-style ignores both), reading a const defined below.
export const fromIife = (() => {
  try {
    return LIMIT;
  } catch (e) {
    return String(e);
  }
})();

export const later = [1].map(function multiply(n) {
  return n * 2;
});

const LIMIT = 5;
