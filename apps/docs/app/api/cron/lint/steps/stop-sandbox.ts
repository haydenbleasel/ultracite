import type { Sandbox } from "@vercel/sandbox";

export async function stopSandbox(sandbox: Sandbox): Promise<void> {
  "use step";

  await sandbox.stop();
}
