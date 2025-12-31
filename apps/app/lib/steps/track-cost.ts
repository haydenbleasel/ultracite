import { database } from "@repo/backend/database";
import { Decimal } from "@repo/backend/src/database/generated/client/runtime/client";

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
