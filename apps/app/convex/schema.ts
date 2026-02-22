import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    githubOrgId: v.optional(v.float64()),
    githubOrgLogin: v.optional(v.string()),
    githubOrgType: v.optional(v.string()),
    githubInstallationId: v.optional(v.float64()),
    githubAccountLogin: v.optional(v.string()),
    installedAt: v.optional(v.float64()),
    stripeCustomerId: v.optional(v.string()),
  })
    .index("by_clerkOrgId", ["clerkOrgId"])
    .index("by_slug", ["slug"])
    .index("by_githubOrgId", ["githubOrgId"])
    .index("by_githubInstallationId", ["githubInstallationId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  repos: defineTable({
    organizationId: v.id("organizations"),
    githubRepoId: v.float64(),
    name: v.string(),
    fullName: v.string(),
    defaultBranch: v.string(),
    dailyRunsEnabled: v.boolean(),
    prReviewEnabled: v.boolean(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_githubRepoId", ["githubRepoId"]),

  lintRuns: defineTable({
    organizationId: v.id("organizations"),
    repoId: v.id("repos"),
    status: v.string(),
    startedAt: v.optional(v.float64()),
    completedAt: v.optional(v.float64()),
    issueFixed: v.optional(v.string()),
    prNumber: v.optional(v.float64()),
    prUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    sandboxCostUsd: v.float64(),
    aiCostUsd: v.optional(v.float64()),
  })
    .index("by_repoId", ["repoId"])
    .index("by_repoAndStatus", ["repoId", "status"])
    .index("by_repoAndPrNumber", ["repoId", "prNumber"]),

  referralCodes: defineTable({
    code: v.string(),
    organizationId: v.id("organizations"),
    timesUsed: v.float64(),
  })
    .index("by_code", ["code"])
    .index("by_organizationId", ["organizationId"]),

  referrals: defineTable({
    referrerOrganizationId: v.id("organizations"),
    referredOrganizationId: v.id("organizations"),
    status: v.string(),
    referrerCreditedAt: v.optional(v.float64()),
    referredCreditedAt: v.optional(v.float64()),
    paidInvoiceId: v.optional(v.string()),
  })
    .index("by_referrerOrganizationId", ["referrerOrganizationId"])
    .index("by_referredOrganizationId", ["referredOrganizationId"]),
});
