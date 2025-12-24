import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  extends: [vercel()],
  server: {
    CRON_SECRET: z.string(),

    // Clerk
    CLERK_SECRET_KEY: z.string(),

    // Database
    DATABASE_URL: z.string(),

    // GitHub App
    GITHUB_APP_ID: z.string(),
    GITHUB_APP_PRIVATE_KEY: z.string(),
    GITHUB_APP_WEBHOOK_SECRET: z.string(),

    // Vercel Sandbox (optional - uses OIDC on Vercel)
    VERCEL_TEAM_ID: z.string().optional(),
    VERCEL_PROJECT_ID: z.string().optional(),

    // Anthropic
    ANTHROPIC_API_KEY: z.string(),
  },
  client: {
    // Clerk
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: z.string(),

    // GitHub App
    NEXT_PUBLIC_GITHUB_APP_SLUG: z.string(),
  },
  runtimeEnv: {
    CRON_SECRET: process.env.CRON_SECRET,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL:
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL:
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    GITHUB_APP_WEBHOOK_SECRET: process.env.GITHUB_APP_WEBHOOK_SECRET,
    NEXT_PUBLIC_GITHUB_APP_SLUG: process.env.NEXT_PUBLIC_GITHUB_APP_SLUG,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
});
