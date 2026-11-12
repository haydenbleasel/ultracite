// A nested ternary used as a statement (for its effects).
declare const log: { info: (s: string) => void; warn: (s: string) => void; error: (s: string) => void };
export const report = (level: number, message: string): void => {
  level > 1 ? log.error(message) : level > 0 ? log.warn(message) : log.info(message);
};
