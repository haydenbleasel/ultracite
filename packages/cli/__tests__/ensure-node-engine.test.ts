import { describe, expect, test } from "bun:test";

import packageJson from "../package.json" with { type: "json" };
import { getUnsupportedNodeMessage } from "../src/ensure-node-engine";

describe("getUnsupportedNodeMessage", () => {
  test("returns null for a supported Node 22 version", () => {
    expect(getUnsupportedNodeMessage("22.22.2")).toBeNull();
    expect(getUnsupportedNodeMessage("22.23.5")).toBeNull();
  });

  test("returns null for a supported Node 24 version", () => {
    expect(getUnsupportedNodeMessage("24.15.0")).toBeNull();
    expect(getUnsupportedNodeMessage("24.16.0")).toBeNull();
  });

  test("returns a clear message for Node 20", () => {
    const message = getUnsupportedNodeMessage("20.20.0");

    expect(message).not.toBeNull();
    expect(message).toContain(packageJson.engines.node);
    expect(message).toContain("20.20.0");
    expect(message).toContain("Upgrade Node.js");
    expect(message).not.toContain("Set.union");
    expect(message).not.toContain("TEXT_ENCODINGS");
  });

  test("returns a clear message for Node 22 below the floor", () => {
    const message = getUnsupportedNodeMessage("22.18.0");

    expect(message).not.toBeNull();
    expect(message).toContain("22.18.0");
    expect(message).toContain(packageJson.engines.node);
  });
});
