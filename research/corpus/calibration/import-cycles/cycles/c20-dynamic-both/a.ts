export const loadB = async (): Promise<string> => (await import("./b")).name;
export const name = "a";
