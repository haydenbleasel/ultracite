import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

if (!process.env.POSTGRES_PRISMA_URL) {
  throw new Error("POSTGRES_PRISMA_URL is not set");
}

const url = new URL(process.env.POSTGRES_PRISMA_URL);

// Patch issue: https://github.com/prisma/prisma/issues/19209#issuecomment-1575711892
url.searchParams.set("sslmode", "no-verify");

const adapter = new PrismaPg({
  connectionString: url.toString(),
  ssl: {
    rejectUnauthorized: false,
  },
});

export const database = new PrismaClient({ adapter });

export type * from "./generated/client";
