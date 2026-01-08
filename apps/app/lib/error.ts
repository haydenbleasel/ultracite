import { RetryableError } from "workflow";

export const parseError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

/**
 * Check if an error is a GitHub rate limit error and throw RetryableError if so.
 * Otherwise, re-throw the original error.
 */
export const handleGitHubError = (error: unknown, context: string): never => {
  // Check for rate limit errors (403 with rate limit message, or 429)
  if (error && typeof error === "object") {
    const status = "status" in error ? (error as { status: number }).status : 0;
    const message = parseError(error);

    // GitHub returns 403 for rate limits with specific messages, or 429
    if (status === 429 || (status === 403 && message.includes("rate limit"))) {
      // Check for retry-after header or x-ratelimit-reset
      let retryAfter: Date | undefined;

      if ("response" in error && error.response) {
        const response = error.response as { headers?: Record<string, string> };
        const resetTimestamp = response.headers?.["x-ratelimit-reset"];
        const retryAfterSecs = response.headers?.["retry-after"];

        if (resetTimestamp) {
          retryAfter = new Date(Number.parseInt(resetTimestamp, 10) * 1000);
        } else if (retryAfterSecs) {
          retryAfter = new Date(
            Date.now() + Number.parseInt(retryAfterSecs, 10) * 1000
          );
        }
      }

      // Default to 60 seconds if no retry info available
      throw new RetryableError(`${context}: GitHub rate limit exceeded`, {
        retryAfter: retryAfter ?? "60s",
      });
    }

    // Check for secondary rate limits (abuse detection)
    if (status === 403 && message.includes("abuse")) {
      throw new RetryableError(`${context}: GitHub abuse detection triggered`, {
        retryAfter: "60s",
      });
    }
  }

  // Not a rate limit error, re-throw
  throw new Error(`${context}: ${parseError(error)}`);
};
