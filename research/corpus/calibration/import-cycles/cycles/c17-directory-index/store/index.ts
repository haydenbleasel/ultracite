import { persist } from "../persist";

export const save = (key: string): string => persist(key);
