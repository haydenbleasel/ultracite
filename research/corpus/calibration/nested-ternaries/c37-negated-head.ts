// A chain whose first test is negated: no-negated-condition's fix flips it, moving the nesting.
export const status = (ready: boolean, failed: boolean): string =>
  !ready ? "waiting" : failed ? "failed" : "ready";
