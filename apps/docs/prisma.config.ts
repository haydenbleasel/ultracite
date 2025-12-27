import { defineConfig } from "prisma/config";
import "dotenv/config";

console.log(process.env.DATABASE_URL, "DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
