import type { Doc, Id } from "../convex/_generated/dataModel";

export type Organization = Doc<"organizations">;
export type Repo = Doc<"repos">;
export type LintRun = Doc<"lintRuns">;
export type ReferralCode = Doc<"referralCodes">;
export type Referral = Doc<"referrals">;

export type OrganizationId = Id<"organizations">;
export type RepoId = Id<"repos">;
export type LintRunId = Id<"lintRuns">;
export type ReferralCodeId = Id<"referralCodes">;
export type ReferralId = Id<"referrals">;

export type LintRunStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS_NO_ISSUES"
  | "SUCCESS_PR_CREATED"
  | "FAILED"
  | "SKIPPED";

export type ReferralStatus = "PENDING" | "COMPLETED" | "INVALID";
