const decoder = new TextDecoder();

export const combineProcessOutput = (
  stderr: Uint8Array,
  stdout: Uint8Array
): string =>
  [decoder.decode(stderr).trim(), decoder.decode(stdout).trim()]
    .filter(Boolean)
    .join("\n");
