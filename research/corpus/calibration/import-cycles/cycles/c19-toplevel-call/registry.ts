import { defaultPlugin } from "./plugins";

const plugins: string[] = [];

export const register = (name: string): number => plugins.push(name);

export const all = (): string[] => [defaultPlugin, ...plugins];
