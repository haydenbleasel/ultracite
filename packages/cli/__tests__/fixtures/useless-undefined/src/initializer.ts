let cursor = undefined;

export const advance = (next: number) => {
  cursor = next;
  return cursor;
};
