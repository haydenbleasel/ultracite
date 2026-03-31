const isProduction = process.env.NODE_ENV === "production";

export const docsUrl = isProduction
  ? "https://docs.ultracite.ai"
  : "http://localhost:3001";
