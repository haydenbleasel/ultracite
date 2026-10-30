// C28: a callback that runs at module evaluation (Array#map) reads a const defined below.
let callbackError: string | null = null;
try {
  [1, 2].map((n) => double(n));
} catch (e) {
  callbackError = String(e);
}
export const mapError = callbackError;

const double = (n: number): number => n * 2;
