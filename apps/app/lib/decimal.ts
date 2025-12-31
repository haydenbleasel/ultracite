// Re-export Decimal for workflow files.
// We use decimal.js directly instead of Prisma.Decimal because
// @workflow/swc-plugin incorrectly transforms @repo/* imports in monorepos.
// See: https://github.com/vercel/workflow/issues/419
// decimal.js is what Prisma uses internally, so they're compatible.
export { Decimal } from "decimal.js";
