// A branch that throws for the other branches' inputs.
export const calls: string[] = [];
export const inputs = [
  ["number", "42"],
  ["json", '{"a":1}'],
  ["number", "not json"],
  ["text", "plain"],
];
export const original = ([kind, raw]: [string, string]): unknown =>
  kind === "number" ? Number(raw) : kind === "json" ? JSON.parse(raw) : raw;
export const rewrites = {
  lookup: ([kind, raw]: [string, string]): unknown =>
    ({ json: JSON.parse(raw), number: Number(raw) })[kind] ?? raw,
  switch: ([kind, raw]: [string, string]): unknown => {
    switch (kind) {
      case "number": {
        return Number(raw);
      }
      case "json": {
        return JSON.parse(raw);
      }
      default: {
        return raw;
      }
    }
  },
};
