// import { polar } from "../polar";

export interface RecordBillingUsageContext {
  installationId: number;
  costUsd: number;
  type: string;
  context: Record<string, unknown>;
}

export async function recordBillingUsage(
  context: RecordBillingUsageContext
): Promise<void> {
  "use step";

  // TODO: Track usage
  console.log("Tracking usage:", context);

  return await Promise.resolve();
}
