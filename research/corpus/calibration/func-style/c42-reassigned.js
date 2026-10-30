// C42: a declaration that's reassigned later (a const would throw).
function format(x) {
  return String(x);
}
format = (x) => `#${x}`;

export const formatted = format(1);
