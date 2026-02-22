import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { parseError } from "@/lib/error";

export async function updateLintRun(
  lintRunId: Id<"lintRuns"> | string,
  data: {
    status?: string;
    completedAt?: Date;
    prNumber?: number;
    prUrl?: string;
    errorMessage?: string;
  }
): Promise<void> {
  "use step";

  try {
    await convexClient.mutation(api.lintRuns.update, {
      id: lintRunId as Id<"lintRuns">,
      status: data.status,
      completedAt: data.completedAt?.getTime(),
      prNumber: data.prNumber,
      prUrl: data.prUrl,
      errorMessage: data.errorMessage,
    });
  } catch (error) {
    throw new Error(`Failed to update lint run: ${parseError(error)}`);
  }
}
