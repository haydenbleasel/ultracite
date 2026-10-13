export const loadA = async (): Promise<string> => (await import("./a")).name;
export const name = "b";
