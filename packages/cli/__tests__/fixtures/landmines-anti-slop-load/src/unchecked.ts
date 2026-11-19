export const parseName = (input: string) => {
  const parsed: unknown = JSON.parse(input);

  return parsed as string;
};
