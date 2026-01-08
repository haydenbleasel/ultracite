import { parseError } from "@/lib/error";
import { database } from "@repo/backend/database";
import { env } from "../env";
import { stripe } from "../stripe";

export async function recordBillingUsage(
  lintRunId: string,
  stripeCustomerId: string
): Promise<void> {
  "use step";

  let lintRun;

  try {
    lintRun = await database.lintRun.findUnique({
      where: { id: lintRunId },
    });
  } catch (error) {
    throw new Error(`Failed to fetch lint run: ${parseError(error)}`);
  }

  if (!lintRun) {
    throw new Error(`Lint run not found: ${lintRunId}`);
  }

  const cost = lintRun.sandboxCostUsd.plus(lintRun.aiCostUsd ?? 0).toNumber();

  // Skip billing if there's no cost
  if (cost <= 0) {
    return;
  }

  // Report usage to Stripe meters
  // Convert USD to cents, rounding up to ensure we never undercharge
  const costCents = Math.ceil(cost * 100);

  try {
    await stripe.billing.meterEvents.create({
      event_name: env.STRIPE_METER_EVENT_NAME,
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: String(costCents),
      },
    });
  } catch (error) {
    throw new Error(`Failed to record billing usage: ${parseError(error)}`);
  }
}
