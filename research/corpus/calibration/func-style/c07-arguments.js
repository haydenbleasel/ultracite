// C07: a declaration that reads `arguments`.
function sumAll() {
  let s = 0;
  for (const x of arguments) {
    s += x;
  }
  return s;
}

export const summed = sumAll(1, 2, 3);
