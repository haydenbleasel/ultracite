import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { parseError } from "@/lib/error";

export async function createLintRun(
  organizationId: Id<"organizations">,
  repoId: Id<"repos">
) {
  "use step";

  const lintRunId = await convexClient
    .mutation(api.lintRuns.create, {
      organizationId,
      repoId,
      status: "RUNNING",
      startedAt: Date.now(),
    })
    .catch((error: unknown) => {
      throw new Error(`Failed to create lint run: ${parseError(error)}`);
    });

  return lintRunId;
}
