import path from "node:path";
import process from "node:process";

const CLI_ROOT = path.resolve(import.meta.dirname, "..");

const usesTsrs =
  (process.platform === "darwin" &&
    (process.arch === "arm64" || process.arch === "x64")) ||
  (process.platform === "linux" &&
    (process.arch === "arm64" || process.arch === "x64")) ||
  (process.platform === "win32" && process.arch === "x64");

const compiler = usesTsrs ? "tsrs" : "tsgo";

const result = Bun.spawnSync(["bun", "run", compiler, "--noEmit"], {
  cwd: CLI_ROOT,
  stderr: "inherit",
  stdout: "inherit",
});

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1);
}
