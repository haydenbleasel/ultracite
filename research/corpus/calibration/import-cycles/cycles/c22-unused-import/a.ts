// `b` is imported and never used, so TypeScript drops the import when it compiles.
import { b } from "./b";

export const a = (): string => "a";
