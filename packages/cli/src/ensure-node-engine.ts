import process from "node:process";

import { satisfies } from "semver";

import packageJson from "../package.json" with { type: "json" };

/**
 * Return an error message when the running Node.js version is outside the
 * package `engines.node` range, otherwise null.
 *
 * Kept free of dependencies that themselves require a newer Node (for example
 * execa 10 uses `Set.prototype.union`, which only exists on Node 22+). Callers
 * must run this before importing those modules.
 */
export const getUnsupportedNodeMessage = (
  nodeVersion = process.versions.node
): string | null => {
  const range = packageJson.engines.node;

  if (satisfies(nodeVersion, range)) {
    return null;
  }

  return [
    `Ultracite requires Node.js ${range}.`,
    `You are running Node.js ${nodeVersion}.`,
    "Upgrade Node.js and try again (for example: nvm install 22 && nvm use 22).",
  ].join("\n");
};

/** Exit process 1 with a clear message when Node is below the supported range. */
export const assertSupportedNodeEngine = (): void => {
  const message = getUnsupportedNodeMessage();

  if (message) {
    console.error(message);
    process.exit(1);
  }
};
