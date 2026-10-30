// C37: object methods, object properties holding functions, and an assigned function.
export const api = {
  get(id: string): string {
    return id;
  },
  list: (): string[] => [],
  old: function (): number {
    return 1;
  },
};

export const target: { run?: () => number } = {};
target.run = function run(): number {
  return 2;
};
