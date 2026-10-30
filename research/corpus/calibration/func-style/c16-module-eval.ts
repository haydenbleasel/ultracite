// C16: at module evaluation, a hoisted declaration called above its definition (works), and a
// const arrow called above its definition (throws at import).
export const early = hoisted(2);

function hoisted(x: number): number {
  return x * 2;
}

export const crashes = (() => {
  try {
    return tooEarly(2);
  } catch (error) {
    return String(error);
  }
})();

const tooEarly = (x: number): number => x * 3;
