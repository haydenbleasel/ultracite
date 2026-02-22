import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByOrganizationId = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return ctx.db
      .query("repos")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
  },
});

export const getByGithubRepoId = query({
  args: { githubRepoId: v.float64() },
  handler: async (ctx, { githubRepoId }) => {
    return ctx.db
      .query("repos")
      .withIndex("by_githubRepoId", (q) => q.eq("githubRepoId", githubRepoId))
      .unique();
  },
});

export const getFirstByOrganizationId = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return ctx.db
      .query("repos")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .first();
  },
});

export const getWithLatestLintRun = query({
  args: {
    organizationId: v.id("organizations"),
    repoName: v.string(),
  },
  handler: async (ctx, { organizationId, repoName }) => {
    const repos = await ctx.db
      .query("repos")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    const repo = repos.find((r) => r.name === repoName);
    if (!repo) {
      return null;
    }

    const lintRuns = await ctx.db
      .query("lintRuns")
      .withIndex("by_repoId", (q) => q.eq("repoId", repo._id))
      .order("desc")
      .collect();

    return { ...repo, lintRuns };
  },
});

export const getByOrgWithLatestLintRuns = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const repos = await ctx.db
      .query("repos")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    return Promise.all(
      repos.map(async (repo) => {
        const latestRun = await ctx.db
          .query("lintRuns")
          .withIndex("by_repoId", (q) => q.eq("repoId", repo._id))
          .order("desc")
          .first();
        return { ...repo, latestLintRun: latestRun };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("repos") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const upsertByGithubRepoId = mutation({
  args: {
    organizationId: v.id("organizations"),
    githubRepoId: v.float64(),
    name: v.string(),
    fullName: v.string(),
    defaultBranch: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repos")
      .withIndex("by_githubRepoId", (q) =>
        q.eq("githubRepoId", args.githubRepoId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        fullName: args.fullName,
        defaultBranch: args.defaultBranch,
      });
      return existing._id;
    }

    return ctx.db.insert("repos", {
      organizationId: args.organizationId,
      githubRepoId: args.githubRepoId,
      name: args.name,
      fullName: args.fullName,
      defaultBranch: args.defaultBranch,
      dailyRunsEnabled: true,
      prReviewEnabled: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("repos"),
    defaultBranch: v.optional(v.string()),
    dailyRunsEnabled: v.optional(v.boolean()),
    prReviewEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...data }) => {
    const patch: Record<string, unknown> = {};
    if (data.defaultBranch !== undefined) {
      patch.defaultBranch = data.defaultBranch;
    }
    if (data.dailyRunsEnabled !== undefined) {
      patch.dailyRunsEnabled = data.dailyRunsEnabled;
    }
    if (data.prReviewEnabled !== undefined) {
      patch.prReviewEnabled = data.prReviewEnabled;
    }
    await ctx.db.patch(id, patch);
  },
});

export const deleteByGithubRepoId = mutation({
  args: { githubRepoId: v.float64() },
  handler: async (ctx, { githubRepoId }) => {
    const repo = await ctx.db
      .query("repos")
      .withIndex("by_githubRepoId", (q) =>
        q.eq("githubRepoId", githubRepoId)
      )
      .unique();
    if (repo) {
      await ctx.db.delete(repo._id);
    }
  },
});

export const deleteByOrganizationId = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const repos = await ctx.db
      .query("repos")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    for (const repo of repos) {
      await ctx.db.delete(repo._id);
    }
  },
});

export const disableByFullName = mutation({
  args: { fullName: v.string() },
  handler: async (ctx, { fullName }) => {
    const repos = await ctx.db.query("repos").collect();
    const matching = repos.filter((r) => r.fullName === fullName);
    for (const repo of matching) {
      await ctx.db.patch(repo._id, {
        dailyRunsEnabled: false,
        prReviewEnabled: false,
      });
    }
  },
});
