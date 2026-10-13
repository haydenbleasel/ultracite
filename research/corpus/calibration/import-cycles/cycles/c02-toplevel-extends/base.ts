import { Circle } from "./circle";

export class Shape {
  static unit(): Shape {
    return new Circle(1);
  }

  area(): number {
    return 0;
  }
}
