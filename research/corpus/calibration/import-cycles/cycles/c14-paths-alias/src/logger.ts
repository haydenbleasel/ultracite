import { loadConfig } from "@/config";

export const log = (message: string): string =>
  loadConfig().verbose ? `${message}\n` : "";
