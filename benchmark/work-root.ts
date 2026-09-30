import path from "node:path";

export const getBenchmarkWorkRoot = (
  tempDirectory: string,
  processId: number
): string => path.join(tempDirectory, `ultracite-benchmark-${processId}`);
