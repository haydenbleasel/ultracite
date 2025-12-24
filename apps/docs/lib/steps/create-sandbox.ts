import { Sandbox } from "@vercel/sandbox";

const TEN_MINUTES_MS = 10 * 60 * 1000;

export async function createSandbox(
  repoFullName: string,
  token: string
): Promise<Sandbox> {
  "use step";

  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${repoFullName}`,
      username: "x-access-token",
      password: token,
      depth: 1,
    },
    timeout: TEN_MINUTES_MS,
  });

  return sandbox;
}
