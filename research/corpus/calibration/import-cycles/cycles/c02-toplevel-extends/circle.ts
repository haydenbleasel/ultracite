import { Shape } from "./base";

export class Circle extends Shape {
  readonly radius: number;

  constructor(radius: number) {
    super();
    this.radius = radius;
  }

  override area(): number {
    return Math.PI * this.radius ** 2;
  }
}
