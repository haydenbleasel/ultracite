export const parseCount = (input: string) => {
  const parsed: unknown = JSON.parse(input);

  // SAFETY: the caller only passes the output of JSON.stringify on a number.
  return parsed as number;
};
