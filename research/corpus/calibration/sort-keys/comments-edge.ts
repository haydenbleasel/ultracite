// Calibration cases where a fix moves a key's trailing // comment to the last place. Kept apart
// from cases.ts because a fix can leave this file unparsable. See cases.ts for how cases are named.

export const K50 = { b: 1, // trailing on b
  a: 2 };
export const K51 = {
  m: 1,
  z: 1, // trailing on z
  a: 2,
};
