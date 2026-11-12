// The early-return shape, with and without braces, under curly and useBlockStatements.
export const sizeLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / 1_048_576)} MB`;
};
export const sizeLabelBraced = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1_048_576) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${Math.round(bytes / 1_048_576)} MB`;
};
