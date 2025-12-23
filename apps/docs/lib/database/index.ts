import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { env } from "@/lib/env";
import { PrismaClient } from "./generated/client";

const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });

export const database = new PrismaClient({ adapter });
