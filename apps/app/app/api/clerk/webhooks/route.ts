import { Webhook } from "svix";
import { type NextRequest, NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { env } from "@/lib/env";

interface WebhookEvent {
  data: Record<string, unknown>;
  type: string;
}

export const POST = async (request: NextRequest) => {
  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!(svixId && svixTimestamp && svixSignature)) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "organization.created": {
      const { id, name, slug } = event.data as {
        id: string;
        name: string;
        slug: string;
      };
      await convexClient.mutation(api.organizations.upsertByClerkOrgId, {
        clerkOrgId: id,
        name,
        slug,
      });
      break;
    }
    case "organization.deleted": {
      const { id } = event.data as { id: string };
      const org = await convexClient.query(
        api.organizations.getByClerkOrgId,
        { clerkOrgId: id }
      );
      if (org) {
        await convexClient.mutation(api.repos.deleteByOrganizationId, {
          organizationId: org._id,
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
};
