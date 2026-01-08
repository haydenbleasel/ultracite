import { parseError } from "@/lib/error";
import { database } from "@repo/backend/database";
import { Decimal } from "decimal.js";

export async function trackCost(
  lintRunId: string,
  aiCostUsd: number
): Promise<void> {
  "use step";

  try {
    await database.lintRun.update({
      where: { id: lintRunId },
      data: { aiCostUsd: new Decimal(aiCostUsd) },
    });
  } catch (error) {
    throw new Error(`Failed to track cost: ${parseError(error)}`);
  }
}
