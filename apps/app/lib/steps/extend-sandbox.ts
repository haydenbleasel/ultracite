import { Sandbox } from "@vercel/sandbox";

const THREE_MINUTES_MS = 3 * 60 * 1000;

export async function extendSandbox(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  await sandbox.extendTimeout(THREE_MINUTES_MS);
}
