// Re-export Prisma from the backend package
// This file exists because @workflow/swc-plugin incorrectly transforms
// @repo/* imports in workflow files. Importing from @/lib/* works correctly.
export { Prisma } from "@repo/backend/database";
