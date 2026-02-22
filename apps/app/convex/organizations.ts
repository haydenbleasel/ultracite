import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, { clerkOrgId }) => {
    return ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
      .unique();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    // Try by slug first
    const bySlug = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (bySlug) {
      return bySlug;
    }
    // Fall back to githubOrgLogin match
    const all = await ctx.db.query("organizations").collect();
    return all.find((o) => o.githubOrgLogin === slug) ?? null;
  },
});

export const getByGithubOrgId = query({
  args: { githubOrgId: v.float64() },
  handler: async (ctx, { githubOrgId }) => {
    return ctx.db
      .query("organizations")
      .withIndex("by_githubOrgId", (q) => q.eq("githubOrgId", githubOrgId))
      .unique();
  },
});

export const getByGithubInstallationId = query({
  args: { installationId: v.float64() },
  handler: async (ctx, { installationId }) => {
    return ctx.db
      .query("organizations")
      .withIndex("by_githubInstallationId", (q) =>
        q.eq("githubInstallationId", installationId)
      )
      .unique();
  },
});

export const getSubscribedWithInstallation = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    return orgs.filter(
      (o) =>
        o.githubInstallationId !== undefined && o.stripeCustomerId !== undefined
    );
  },
});

export const getWithRepos = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const org = await ctx.db.get(orgId);
    if (!org) {
      return null;
    }
    const repos = await ctx.db
      .query("repos")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    const reposWithLatestRun = await Promise.all(
      repos.map(async (repo) => {
        const latestRun = await ctx.db
          .query("lintRuns")
          .withIndex("by_repoId", (q) => q.eq("repoId", repo._id))
          .order("desc")
          .first();
        return { ...repo, latestLintRun: latestRun };
      })
    );

    return { ...org, repos: reposWithLatestRun };
  },
});

export const upsertByClerkOrgId = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    githubOrgId: v.optional(v.float64()),
    githubOrgLogin: v.optional(v.string()),
    githubOrgType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        githubOrgId: args.githubOrgId ?? existing.githubOrgId,
        githubOrgLogin: args.githubOrgLogin ?? existing.githubOrgLogin,
        githubOrgType: args.githubOrgType ?? existing.githubOrgType,
      });
      return existing._id;
    }

    return ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      githubOrgId: args.githubOrgId,
      githubOrgLogin: args.githubOrgLogin,
      githubOrgType: args.githubOrgType,
    });
  },
});

export const upsertByGithubOrgId = mutation({
  args: {
    githubOrgId: v.float64(),
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    githubOrgLogin: v.optional(v.string()),
    githubOrgType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_githubOrgId", (q) => q.eq("githubOrgId", args.githubOrgId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        clerkOrgId: args.clerkOrgId,
        githubOrgLogin: args.githubOrgLogin ?? existing.githubOrgLogin,
        githubOrgType: args.githubOrgType ?? existing.githubOrgType,
      });
      return existing._id;
    }

    return ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      githubOrgId: args.githubOrgId,
      githubOrgLogin: args.githubOrgLogin,
      githubOrgType: args.githubOrgType,
    });
  },
});

export const updateInstallation = mutation({
  args: {
    orgId: v.id("organizations"),
    githubInstallationId: v.float64(),
    githubAccountLogin: v.string(),
    installedAt: v.float64(),
  },
  handler: async (ctx, { orgId, ...data }) => {
    await ctx.db.patch(orgId, data);
  },
});

export const clearInstallation = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await ctx.db.patch(orgId, {
      githubInstallationId: undefined,
      githubAccountLogin: undefined,
      installedAt: undefined,
    });
  },
});

export const setStripeCustomerId = mutation({
  args: {
    orgId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { orgId, stripeCustomerId }) => {
    await ctx.db.patch(orgId, { stripeCustomerId });
  },
});

export const clearStripeCustomerIdByCustomer = mutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId)
      )
      .unique();
    if (org) {
      await ctx.db.patch(org._id, { stripeCustomerId: undefined });
    }
  },
});

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return ctx.db
      .query("organizations")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId)
      )
      .unique();
  },
});
