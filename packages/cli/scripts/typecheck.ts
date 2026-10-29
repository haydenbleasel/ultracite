import path from "node:path";
import process from "node:process";

import { combineProcessOutput } from "./typecheck-output";

const CLI_ROOT = path.resolve(import.meta.dirname, "..");

// tsrs ships its native binary in an optional per-platform package, which can
// be missing (unsupported target, --no-optional install, node_modules copied
// from another platform). Probe the binary instead of guessing from the
// platform. Locally, fall back only when the probe says the optional native
// binary is unavailable; treat other failures as a broken install. Any
// non-empty CI value makes tsrs authoritative and a failed probe an error.
const probe = Bun.spawnSync(["bun", "run", "tsrs", "--version"], {
  cwd: CLI_ROOT,
  stderr: "pipe",
  stdout: "pipe",
});

const usesTsrs = probe.exitCode === 0;

if (!usesTsrs) {
  const reason = combineProcessOutput(probe.stderr, probe.stdout);

  const details = reason ? `\n${reason}` : "";
  const exitCode = probe.exitCode ?? "none";
  const isCi = Boolean(process.env.CI);

  const missingNativeBinary =
    reason.includes("Cannot find the optional dependency @tsrs/") ||
    reason.includes("This platform is not supported. Supported:");

  if (isCi || !missingNativeBinary) {
    const requirement = isCi
      ? "CI type checks require tsrs, so this does not fall back to tsgo."
      : "The failure did not indicate a missing native binary, so this does not fall back to tsgo.";

    console.error(
      `tsrs --version failed with exit code ${exitCode}. ${requirement}${details}`
    );
    process.exit(1);
  }

  console.warn(
    `tsrs native binary is unavailable; type checking with tsgo instead. tsgo targets a different TypeScript version than tsrs, which CI uses, so results can differ.${details}`
  );
}

const compiler = usesTsrs ? "tsrs" : "tsgo";

const result = Bun.spawnSync(["bun", "run", compiler, "--noEmit"], {
  cwd: CLI_ROOT,
  stderr: "inherit",
  stdout: "inherit",
});

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1);
}
