// C39: an ambient declaration and a declaration in a namespace.
declare function external(x: number): number;

export namespace Utils {
  export function twice(x: number): number {
    return external(x) * 2;
  }
}
