import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByReferrerOrganizationId = query({
  args: { referrerOrganizationId: v.id("organizations") },
  handler: async (ctx, { referrerOrganizationId }) => {
    return ctx.db
      .query("referrals")
      .withIndex("by_referrerOrganizationId", (q) =>
        q.eq("referrerOrganizationId", referrerOrganizationId)
      )
      .collect();
  },
});

export const getByReferredOrganizationId = query({
  args: { referredOrganizationId: v.id("organizations") },
  handler: async (ctx, { referredOrganizationId }) => {
    return ctx.db
      .query("referrals")
      .withIndex("by_referredOrganizationId", (q) =>
        q.eq("referredOrganizationId", referredOrganizationId)
      )
      .unique();
  },
});

export const create = mutation({
  args: {
    referrerOrganizationId: v.id("organizations"),
    referredOrganizationId: v.id("organizations"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("referrals", {
      referrerOrganizationId: args.referrerOrganizationId,
      referredOrganizationId: args.referredOrganizationId,
      status: args.status,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("referrals"),
    status: v.optional(v.string()),
    referrerCreditedAt: v.optional(v.float64()),
    referredCreditedAt: v.optional(v.float64()),
    paidInvoiceId: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    await ctx.db.patch(id, patch);
  },
});

export const claimReferredCredit = mutation({
  args: {
    id: v.id("referrals"),
    paidInvoiceId: v.string(),
  },
  handler: async (ctx, { id, paidInvoiceId }) => {
    const referral = await ctx.db.get(id);
    if (!referral || referral.referredCreditedAt || referral.status !== "PENDING") {
      return false;
    }
    await ctx.db.patch(id, {
      paidInvoiceId,
      referredCreditedAt: Date.now(),
    });
    return true;
  },
});

export const claimReferrerCredit = mutation({
  args: { id: v.id("referrals") },
  handler: async (ctx, { id }) => {
    const referral = await ctx.db.get(id);
    if (!referral || referral.referrerCreditedAt) {
      return false;
    }
    await ctx.db.patch(id, { referrerCreditedAt: Date.now() });
    return true;
  },
});

export const rollbackReferredCredit = mutation({
  args: { id: v.id("referrals") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      referredCreditedAt: undefined,
      paidInvoiceId: undefined,
    });
  },
});

export const rollbackReferrerCredit = mutation({
  args: { id: v.id("referrals") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { referrerCreditedAt: undefined });
  },
});

export const markCompleted = mutation({
  args: { id: v.id("referrals") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "COMPLETED" });
  },
});

export const processReferral = mutation({
  args: {
    referralCode: v.string(),
    referredOrganizationId: v.id("organizations"),
  },
  handler: async (ctx, { referralCode, referredOrganizationId }) => {
    // Find the referral code
    const code = await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", referralCode))
      .unique();

    if (!code) {
      return { success: false, error: "Invalid referral code" };
    }

    // Prevent self-referral
    if (code.organizationId === referredOrganizationId) {
      return { success: false, error: "Cannot refer yourself" };
    }

    // Check if already referred
    const existingReferral = await ctx.db
      .query("referrals")
      .withIndex("by_referredOrganizationId", (q) =>
        q.eq("referredOrganizationId", referredOrganizationId)
      )
      .unique();

    if (existingReferral) {
      return { success: false, error: "Organization already referred" };
    }

    // Check if already subscribed
    const referredOrg = await ctx.db.get(referredOrganizationId);
    if (referredOrg?.stripeCustomerId) {
      return { success: false, error: "Organization already subscribed" };
    }

    // Create referral
    await ctx.db.insert("referrals", {
      referrerOrganizationId: code.organizationId,
      referredOrganizationId,
      status: "PENDING",
    });

    // Increment times used
    await ctx.db.patch(code._id, { timesUsed: code.timesUsed + 1 });

    return { success: true };
  },
});

export const getPendingReferrerCredits = query({
  args: { referrerOrganizationId: v.id("organizations") },
  handler: async (ctx, { referrerOrganizationId }) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerOrganizationId", (q) =>
        q.eq("referrerOrganizationId", referrerOrganizationId)
      )
      .collect();

    return referrals.filter(
      (r) =>
        !r.referrerCreditedAt && r.paidInvoiceId && r.referredCreditedAt
    );
  },
});
