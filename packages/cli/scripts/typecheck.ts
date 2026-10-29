import path from "node:path";
import process from "node:process";

const CLI_ROOT = path.resolve(import.meta.dirname, "..");

// tsrs ships its native binary in an optional per-platform package, which can
// be missing (unsupported target, --no-optional install, node_modules copied
// from another platform). Probe the binary instead of guessing from the
// platform, and fall back to tsgo locally when it does not run. CI treats tsrs
// as the authoritative checker, so there a failed probe is an error instead.
const probe = Bun.spawnSync(["bun", "run", "tsrs", "--version"], {
  cwd: CLI_ROOT,
  stderr: "pipe",
  stdout: "pipe",
});

const usesTsrs = probe.exitCode === 0;

if (!usesTsrs) {
  const decoder = new TextDecoder();

  const reason = [
    decoder.decode(probe.stderr).trim(),
    decoder.decode(probe.stdout).trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const details = reason ? `\n${reason}` : "";

  if (process.env.CI === "true" || process.env.CI === "1") {
    console.error(
      `tsrs --version failed with exit code ${probe.exitCode}. CI type checks require tsrs, so this does not fall back to tsgo.${details}`
    );
    process.exit(1);
  }

  console.warn(
    `tsrs is not available on this machine; type checking with tsgo instead. tsgo targets a different TypeScript version than tsrs, which CI uses, so results can differ.${details}`
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
