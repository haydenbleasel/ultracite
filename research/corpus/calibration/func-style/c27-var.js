// C27: a `var` function expression called before its line (reads undefined).
let varError = null;
try {
  early();
} catch (e) {
  varError = String(e);
}
export const varCallError = varError;

var early = function early() {
  return 1;
};
