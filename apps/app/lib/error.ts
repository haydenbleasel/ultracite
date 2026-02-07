import { RetryableError } from "workflow";

export const parseError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const getErrorStatus = (error: unknown): number => {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status;
  }
  return 0;
};

const parseRetryAfter = (error: unknown): Date | undefined => {
  if (
    !error ||
    typeof error !== "object" ||
    !("response" in error) ||
    !error.response
  ) {
    return undefined;
  }

  const response = error.response as { headers?: Record<string, string> };
  const resetTimestamp = response.headers?.["x-ratelimit-reset"];
  const retryAfterSecs = response.headers?.["retry-after"];

  if (resetTimestamp) {
    return new Date(Number.parseInt(resetTimestamp, 10) * 1000);
  }

  if (retryAfterSecs) {
    return new Date(Date.now() + Number.parseInt(retryAfterSecs, 10) * 1000);
  }

  return undefined;
};

/**
 * Check if an error is a GitHub rate limit error and throw RetryableError if so.
 * Otherwise, re-throw the original error.
 */
export const handleGitHubError = (error: unknown, context: string): never => {
  if (error && typeof error === "object") {
    const status = getErrorStatus(error);
    const message = parseError(error);

    if (status === 429 || (status === 403 && message.includes("rate limit"))) {
      const retryAfter = parseRetryAfter(error);
      throw new RetryableError(`${context}: GitHub rate limit exceeded`, {
        retryAfter: retryAfter ?? "60s",
      });
    }

    if (status === 403 && message.includes("abuse")) {
      throw new RetryableError(`${context}: GitHub abuse detection triggered`, {
        retryAfter: "60s",
      });
    }
  }

  throw new Error(`${context}: ${parseError(error)}`);
};
