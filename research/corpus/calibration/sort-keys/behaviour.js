// Calibration cases where key order can change what a program does, in plain JavaScript because
// TypeScript rejects duplicate keys. See behaviour.ts.

export const B06 = () => {
  const o = { a: 1, b: 2, a: 3 };
  return { a: o.a, keys: Object.keys(o) };
};
export const B06b = () => {
  const o = { z: 0, a: 1, c: 2, a: 3, b: 4 };
  return { a: o.a, keys: Object.keys(o) };
};
export const B06c = () => {
  const o = { k1clb: 0, kh7j: 1, k1f2r: 2, kl73: 3, ko7j: 4, klld: 5, ksny: 6, k4ht: 7, kg9u: 8, k251n: 9, kkuw: 10, kubt: 11, dup: "first", k23fp: 12, k5a1: 13, k41: 14, k1e8p: 15, k1v93: 16, dup: "second", k15kn: 17, k1e6h: 18, k4ky: 19, k1aac: 20 };
  return o.dup;
};
