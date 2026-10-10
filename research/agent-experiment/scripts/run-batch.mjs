// Runs experiment runs strictly one after another (concurrency 1), measuring each.
// Usage: node scripts/run-batch.mjs s1:claude:2 s1:codex:1 ...
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const HERE = new URL("..", import.meta.url).pathname;
for (const spec of process.argv.slice(2)) {
  const [subject, agent, n] = spec.split(":");
  const id = `${subject}-${agent}-${n}`;
  console.log(`\n=== ${id} ${new Date().toISOString()}`);
  const run = spawnSync(
    "node",
    [join(HERE, "scripts/run-one.mjs"), subject, agent, n],
    { stdio: "inherit" }
  );
  if (run.status !== 0) {
    console.log(`!!! ${id}: harness exited ${run.status}; skipping measure`);
    continue;
  }
  spawnSync("node", [join(HERE, "scripts/measure.cjs"), id], {
    stdio: "inherit",
  });
}
console.log(`\n=== batch done ${new Date().toISOString()}`);
