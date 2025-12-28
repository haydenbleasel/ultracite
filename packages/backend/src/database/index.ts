import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const adapter = new PrismaPg({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});

export const database = new PrismaClient({ adapter });

export type * from "./generated/client";
