// c01 rewritten as early returns (braced, as curly wants): what do the presets say about it?
export const sizeLabel = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1_048_576) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${Math.round(bytes / 1_048_576)} MB`;
};
// two branches only: one guard and a final return
export const twoWay = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};
