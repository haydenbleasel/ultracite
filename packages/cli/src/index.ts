import { ensureSupportedNodeEngine } from "./ensure-node-engine";

// Gate on engines.node before loading the rest of the CLI. Several runtime
// dependencies (notably execa 10) crash on older Node with an opaque
// TypeError instead of explaining the version requirement. On an unsupported
// version nothing else loads, so the process exits with code 1 once the
// message has been written.
if (ensureSupportedNodeEngine()) {
  await import("./cli.js");
}
