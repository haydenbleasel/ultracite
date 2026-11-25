import { assertSupportedNodeEngine } from "./ensure-node-engine";

// Gate on engines.node before loading the rest of the CLI. Several runtime
// dependencies (notably execa 10) crash on older Node with an opaque
// TypeError instead of explaining the version requirement.
assertSupportedNodeEngine();

await import("./cli.js");
