import { Sandbox } from "@vercel/sandbox";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function createSandbox(
  repoFullName: string,
  token: string
): Promise<string> {
  "use step";

  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${repoFullName}`,
      username: "x-access-token",
      password: token,
      depth: 1,
    },
    timeout: FIVE_MINUTES_MS,
  });

  // Return only the ID (serializable) instead of the Sandbox instance
  return sandbox.sandboxId;
}
