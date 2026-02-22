import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { env } from "./env";

export const convexClient = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
