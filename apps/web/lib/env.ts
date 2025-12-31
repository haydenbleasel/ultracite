import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  extends: [vercel()],
  server: {
    BETTERSTACK_API_KEY: z.string(),
  },
  client: {},
  runtimeEnv: {
    BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
  },
});
