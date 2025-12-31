const isProduction = process.env.NODE_ENV === "production";

export const webUrl = isProduction
  ? "https://www.ultracite.ai"
  : "http://localhost:3000";

export const docsUrl = isProduction
  ? "https://docs.ultracite.ai"
  : "http://localhost:3001";

export const appUrl = isProduction
  ? "https://app.ultracite.ai"
  : "http://localhost:3002";

export const statusUrl = "https://status.ultracite.ai";
