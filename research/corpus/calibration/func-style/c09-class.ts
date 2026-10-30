// C09: class methods and class-field arrows (func-style ignores both).
export class Counter {
  count = 0;

  increment = (): void => {
    this.count++;
  };

  reset(): void {
    this.count = 0;
  }
}
