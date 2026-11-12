// A one-discriminant chain and its lookup-object rewrite.
type Kind = "info" | "warn" | "error";
export const icon = (kind: Kind): string =>
  kind === "info" ? "i" : kind === "warn" ? "!" : kind === "error" ? "x" : "?";
const ICONS: Record<string, string> = { error: "x", info: "i", warn: "!" };
export const iconLookup = (kind: Kind): string => ICONS[kind] ?? "?";
