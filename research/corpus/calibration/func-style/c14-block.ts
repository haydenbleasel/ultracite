// C14: a declaration inside a block (if).
export const pick = (flag: boolean): number => {
  if (flag) {
    function one(): number {
      return 1;
    }
    return one();
  }
  return 0;
};
