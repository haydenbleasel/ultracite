// The version the homepage announces is the CLI package's own. Importing its
// package.json lets Vite inline the value at build time, so the lookup no
// longer depends on the build's working directory. The docs build lists the
// file as a turbo input, so a version bump invalidates the cached site.
import cliPackage from "../../../packages/cli/package.json";

export const latestVersion: string = cliPackage.version;
