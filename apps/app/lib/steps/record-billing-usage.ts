import { database } from "@repo/backend/database";
import { env } from "../env";
import { stripe } from "../stripe";

export async function recordBillingUsage(
  lintRunId: string,
  stripeCustomerId: string
): Promise<void> {
  "use step";

  const lintRun = await database.lintRun.findUnique({
    where: { id: lintRunId },
  });

  if (!lintRun) {
    throw new Error("Lint run not found");
  }

  const cost = lintRun.sandboxCostUsd.plus(lintRun.aiCostUsd ?? 0).toNumber();

  // Skip billing if there's no cost
  if (cost <= 0) {
    return;
  }

  // Report usage to Stripe meters
  // Convert USD to cents, rounding up to ensure we never undercharge
  const costCents = Math.ceil(cost * 100);

  await stripe.billing.meterEvents.create({
    event_name: env.STRIPE_METER_EVENT_NAME,
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: String(costCents),
    },
  });
}
