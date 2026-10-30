// C05: a generator declaration and an async generator.
function* range(n: number): Generator<number> {
  for (let i = 0; i < n; i++) {
    yield i;
  }
}

async function* ticks(n: number): AsyncGenerator<number> {
  for (const i of range(n)) {
    yield i;
  }
}

export const values = [...range(3)];
export { ticks };
