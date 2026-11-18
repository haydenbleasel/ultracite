// Deliberately violates the landmines rules so the load test can assert the
// plugins' diagnostics actually fire (not just that they load).
export const add = (left: number, right: number): number => left + right;
