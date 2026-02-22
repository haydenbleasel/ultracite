import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByRepoId = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return ctx.db
      .query("lintRuns")
      .withIndex("by_repoId", (q) => q.eq("repoId", repoId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("lintRuns") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const getRunningByRepoAndPR = query({
  args: {
    repoId: v.id("repos"),
    prNumber: v.float64(),
  },
  handler: async (ctx, { repoId, prNumber }) => {
    const runs = await ctx.db
      .query("lintRuns")
      .withIndex("by_repoAndPrNumber", (q) =>
        q.eq("repoId", repoId).eq("prNumber", prNumber)
      )
      .collect();
    return runs.find((r) => r.status === "PENDING" || r.status === "RUNNING") ??
      null;
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    repoId: v.id("repos"),
    status: v.string(),
    startedAt: v.optional(v.float64()),
    prNumber: v.optional(v.float64()),
    sandboxCostUsd: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("lintRuns", {
      organizationId: args.organizationId,
      repoId: args.repoId,
      status: args.status,
      startedAt: args.startedAt,
      prNumber: args.prNumber,
      sandboxCostUsd: args.sandboxCostUsd ?? 0.025,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("lintRuns"),
    status: v.optional(v.string()),
    startedAt: v.optional(v.float64()),
    completedAt: v.optional(v.float64()),
    issueFixed: v.optional(v.string()),
    prNumber: v.optional(v.float64()),
    prUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    aiCostUsd: v.optional(v.float64()),
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

export const createIfNoRunning = mutation({
  args: {
    organizationId: v.id("organizations"),
    repoId: v.id("repos"),
    prNumber: v.float64(),
  },
  handler: async (ctx, { organizationId, repoId, prNumber }) => {
    // Check for running review on this PR (atomic within mutation)
    const runs = await ctx.db
      .query("lintRuns")
      .withIndex("by_repoAndPrNumber", (q) =>
        q.eq("repoId", repoId).eq("prNumber", prNumber)
      )
      .collect();

    const running = runs.find(
      (r) => r.status === "PENDING" || r.status === "RUNNING"
    );

    if (running) {
      return null;
    }

    return ctx.db.insert("lintRuns", {
      organizationId,
      repoId,
      prNumber,
      status: "RUNNING",
      startedAt: Date.now(),
      sandboxCostUsd: 0.025,
    });
  },
});
