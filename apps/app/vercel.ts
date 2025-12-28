import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  bunVersion: "1.x",
  crons: [
    {
      path: "/api/cron/lint",
      schedule: "0 6 * * *",
    },
  ],
};
