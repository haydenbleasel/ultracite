// The chained shape in a return: the else-if chain written as a ternary.
export const sizeLabel = (bytes: number): string => {
  return bytes < 1024 ? `${bytes} B` : bytes < 1_048_576 ? `${Math.round(bytes / 1024)} KB` : `${Math.round(bytes / 1_048_576)} MB`;
};
