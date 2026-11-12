// Gaming: the inner ternary turned into an IIFE.
export const sizeLabel = (bytes: number): string =>
  bytes < 1024
    ? `${bytes} B`
    : (() => {
        if (bytes < 1_048_576) {
          return `${Math.round(bytes / 1024)} KB`;
        }
        return `${Math.round(bytes / 1_048_576)} MB`;
      })();
