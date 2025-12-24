import { Sandbox } from "@vercel/sandbox";

export async function stopSandbox(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.stop();
}
