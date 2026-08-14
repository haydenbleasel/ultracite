// Deliberately violates anti-slop rules so the load test can assert the
// vendored plugin's diagnostics actually fire (not just that it loads).
export const read = (target: object, key: string): unknown =>
  Reflect.get(target, key);

export const parse = (input: string) => JSON.parse(input) as { id: string };
