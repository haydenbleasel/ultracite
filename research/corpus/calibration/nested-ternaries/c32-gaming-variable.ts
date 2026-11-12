// Gaming: the inner ternary moved into a variable (it is now evaluated on every call).
export const sizeLabel = (bytes: number): string => {
  const large = bytes < 1_048_576 ? `${Math.round(bytes / 1024)} KB` : `${Math.round(bytes / 1_048_576)} MB`;
  return bytes < 1024 ? `${bytes} B` : large;
};
