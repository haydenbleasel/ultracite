// Calibration cases that TypeScript rejects (duplicate keys), as plain JavaScript.
// See cases.ts for how cases are named and read.

export const K22 = { b: 1, a: 2, b: 3 };
export const K22b = { z: 0, a: 1, c: 2, a: 3, b: 4 };
export const K52 = { k1clb: 0, kh7j: 1, k1f2r: 2, kl73: 3, ko7j: 4, klld: 5, ksny: 6, k4ht: 7, kg9u: 8, k251n: 9, kkuw: 10, kubt: 11, dup: "first", k23fp: 12, k5a1: 13, k41: 14, k1e8p: 15, k1v93: 16, dup: "second", k15kn: 17, k1e6h: 18, k4ky: 19, k1aac: 20 };
