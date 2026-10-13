// The same cases in a test file, where Ultracite turns sonarjs/no-duplicate-string off. Each case starts with a `// ID: description`
// line. sonarjs/no-duplicate-string counts across the whole file, so each case uses its own string.

declare function log(...args: unknown[]): void;

// X01: a 10+ character string repeated 3 times
export function t01(): void {
  log("repeated three times");
  log("repeated three times");
  log("repeated three times");
}

// X02: a 10+ character string repeated twice
export function t02(): void {
  log("only repeated twice");
  log("only repeated twice");
}

// X03: a short string (under 10 characters) repeated 3 times
export function t03(): void {
  log("short");
  log("short");
  log("short");
}

// X04: a repeated string used as an object key and in a comparison
export function t04(record: Record<string, number>, key: string): number {
  if (key === "content-length") {
    return record["content-length"] ?? record["content-length"] ?? 0;
  }
  return 0;
}

// X05: the same string in an import path and a type position is not counted
export function t05(kind: "repeated-literal-type" | "other"): string {
  return kind === "repeated-literal-type" ? "repeated-literal-type" : "x";
}

// END
