// Gaming: a helper that only wraps the same inner ternary.
const inner = (bytes: number): string => (bytes < 1_048_576 ? `${Math.round(bytes / 1024)} KB` : `${Math.round(bytes / 1_048_576)} MB`);
export const sizeLabel = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : inner(bytes));
