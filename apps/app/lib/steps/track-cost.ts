import { database } from "@repo/backend/database";
import { Decimal } from "decimal.js";

export async function trackCost(
  lintRunId: string,
  aiCostUsd: number
): Promise<void> {
  "use step";

  await database.lintRun.update({
    where: { id: lintRunId },
    data: { aiCostUsd: new Decimal(aiCostUsd) },
  });
}
