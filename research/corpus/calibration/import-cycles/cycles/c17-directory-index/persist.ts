import { save } from "./store";

export const persist = (key: string): string => (key ? key : save("default"));
