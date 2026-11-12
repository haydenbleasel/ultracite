// An arrow whose concise body is a nested ternary of JSX: the early return needs a block body.
export const Status = ({ state }: { state: "idle" | "busy" | "done" }) =>
  state === "idle" ? <span>Waiting</span> : state === "busy" ? <span>Working…</span> : <span>Done</span>;
