import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { FatalError, getStepMetadata } from "workflow";
import { convexClient } from "../convex";
import { parseError } from "@/lib/error";
import { env } from "../env";
import { stripe } from "../stripe";

export async function recordBillingUsage(
  lintRunId: Id<"lintRuns"> | string,
  stripeCustomerId: string
): Promise<void> {
  "use step";

  const { stepId } = getStepMetadata();

  const lintRun = await convexClient
    .query(api.lintRuns.getById, {
      id: lintRunId as Id<"lintRuns">,
    })
    .catch((error: unknown) => {
      throw new Error(`Failed to fetch lint run: ${parseError(error)}`);
    });

  if (!lintRun) {
    throw new FatalError(`Lint run not found: ${lintRunId}`);
  }

  const cost = lintRun.sandboxCostUsd + (lintRun.aiCostUsd ?? 0);

  if (cost <= 0) {
    return;
  }

  const costCents = Math.ceil(cost * 100);

  try {
    await stripe.billing.meterEvents.create(
      {
        event_name: env.STRIPE_METER_EVENT_NAME,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: String(costCents),
        },
      },
      {
        idempotencyKey: stepId,
      }
    );
  } catch (error) {
    throw new Error(`Failed to record billing usage: ${parseError(error)}`);
  }
}
