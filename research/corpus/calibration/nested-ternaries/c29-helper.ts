// A nested ternary in a call argument, extracted into a helper defined above its use.
const unitFor = (bytes: number): string => {
  if (bytes < 1024) {
    return "B";
  }
  if (bytes < 1_048_576) {
    return "KB";
  }
  return "MB";
};
export const report = (bytes: number): string => ["size", unitFor(bytes)].join(" ");
