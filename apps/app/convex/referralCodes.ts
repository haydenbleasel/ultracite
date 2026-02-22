import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
  },
});

export const getByOrganizationId = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return ctx.db
      .query("referralCodes")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique();
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("referralCodes", {
      code: args.code,
      organizationId: args.organizationId,
      timesUsed: 0,
    });
  },
});

export const incrementTimesUsed = mutation({
  args: { id: v.id("referralCodes") },
  handler: async (ctx, { id }) => {
    const code = await ctx.db.get(id);
    if (code) {
      await ctx.db.patch(id, { timesUsed: code.timesUsed + 1 });
    }
  },
});
