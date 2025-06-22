import { access } from "node:fs/promises";
import { join } from "node:path";

export const exists = async (path: string) => {
  try {
    const relativePath = join(process.cwd(), path);
    
    await access(relativePath);
    return true;
  } catch {
    return false;
  }
};