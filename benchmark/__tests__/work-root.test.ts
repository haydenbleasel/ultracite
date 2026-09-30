import { describe, expect, test } from "bun:test";
import path from "node:path";

import { getBenchmarkWorkRoot } from "../work-root";

describe("getBenchmarkWorkRoot", () => {
  test("places benchmark projects in a process-specific OS temp directory", () => {
    const tempDirectory = path.join("C:", "Users", "tester", "Temp");

    expect(getBenchmarkWorkRoot(tempDirectory, 42)).toBe(
      path.join(tempDirectory, "ultracite-benchmark-42")
    );
  });
});
