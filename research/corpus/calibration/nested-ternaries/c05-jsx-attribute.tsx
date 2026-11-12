// A nested ternary in a JSX attribute.
export const Badge = ({ status }: { status: "ok" | "warn" | "error" }) => (
  <span className={status === "ok" ? "badge-green" : status === "warn" ? "badge-amber" : "badge-red"}>{status}</span>
);
