import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  extends: [vercel()],
  server: {
    CRON_SECRET: z.string(),

    // Database
    POSTGRES_PRISMA_URL: z.string(),

    // GitHub App
    GITHUB_APP_ID: z.string(),
    GITHUB_APP_PRIVATE_KEY: z.string(),
    GITHUB_APP_WEBHOOK_SECRET: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    GITHUB_REDIRECT_URI: z.string(),

    // Vercel Sandbox (optional - uses OIDC on Vercel)
    VERCEL_TEAM_ID: z.string().optional(),
    VERCEL_PROJECT_ID: z.string().optional(),

    // Anthropic
    ANTHROPIC_API_KEY: z.string(),

    // Stripe
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_PRICE_ID: z.string(),
    STRIPE_METER_EVENT_NAME: z.string(),
  },
  client: {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),

    // GitHub App
    NEXT_PUBLIC_GITHUB_APP_SLUG: z.string(),
  },
  runtimeEnv: {
    CRON_SECRET: process.env.CRON_SECRET,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    GITHUB_APP_WEBHOOK_SECRET: process.env.GITHUB_APP_WEBHOOK_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
    NEXT_PUBLIC_GITHUB_APP_SLUG: process.env.NEXT_PUBLIC_GITHUB_APP_SLUG,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    STRIPE_METER_EVENT_NAME: process.env.STRIPE_METER_EVENT_NAME,
  },
});
