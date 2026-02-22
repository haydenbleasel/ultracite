import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { parseError } from "@/lib/error";

export async function trackCost(
  lintRunId: Id<"lintRuns"> | string,
  aiCostUsd: number
): Promise<void> {
  "use step";

  try {
    await convexClient.mutation(api.lintRuns.update, {
      id: lintRunId as Id<"lintRuns">,
      aiCostUsd,
    });
  } catch (error) {
    throw new Error(`Failed to track cost: ${parseError(error)}`);
  }
}
