// c01 rewritten as an if/else-if/else chain of returns.
export const sizeLabel = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1_048_576) {
    return `${Math.round(bytes / 1024)} KB`;
  } else {
    return `${Math.round(bytes / 1_048_576)} MB`;
  }
};
