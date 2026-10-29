import path from "node:path";
import process from "node:process";

const CLI_ROOT = path.resolve(import.meta.dirname, "..");

// tsrs ships its native binary in an optional per-platform package, which can
// be missing (unsupported target, --no-optional install, node_modules copied
// from another platform). Probe the binary instead of guessing from the
// platform, and fall back to tsgo when it does not run.
const probe = Bun.spawnSync(["bun", "run", "tsrs", "--version"], {
  cwd: CLI_ROOT,
  stderr: "pipe",
  stdout: "pipe",
});

const usesTsrs = probe.exitCode === 0;

if (!usesTsrs) {
  console.warn(
    "tsrs is not available on this machine; type checking with tsgo instead. tsgo targets a different TypeScript version than tsrs, which CI uses, so results can differ."
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
