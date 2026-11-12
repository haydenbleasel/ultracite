// A nested ternary initializer rewritten as `let` plus if/else assignments.
export const describe = (n: number): string => {
  let word: string;
  if (n === 0) {
    word = "none";
  } else if (n === 1) {
    word = "one";
  } else {
    word = "many";
  }
  return `${word} left`;
};
// the same with only two branches left after a guard
export const describe2 = (n: number): string => {
  let word = "many";
  if (n === 1) {
    word = "one";
  }
  return `${word} left`;
};
