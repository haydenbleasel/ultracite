import { env } from "../env";
import { stripe } from "../stripe";

export interface RecordBillingUsageContext {
  cost: number;
  stripeCustomerId: string;
}

export async function recordBillingUsage(
  context: RecordBillingUsageContext
): Promise<void> {
  "use step";

  const { cost, stripeCustomerId } = context;

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
