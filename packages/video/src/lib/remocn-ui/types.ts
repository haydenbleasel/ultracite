export interface Step<S extends string = string> {
  at: number;
  state: S;
  duration?: number;
}
