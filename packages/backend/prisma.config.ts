import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  datasource: {
    url: process.env.POSTGRES_PRISMA_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
});
