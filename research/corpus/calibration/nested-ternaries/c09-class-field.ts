// A nested ternary in a class field initializer that reads `this`.
export class Job {
  constructor(
    public done: boolean,
    public failed: boolean
  ) {}
  readonly state = this.done ? "done" : this.failed ? "failed" : "running";
}
