// B07: a dependency the effect never reads, used as a trigger (refetch when refreshKey changes).
// Biome reports it as unnecessary and its unsafe fix removes it.
import { useEffect } from "react";

export const Subject = ({ id, refreshKey, log }: { id: string; refreshKey: number; log: (s: string) => void }) => {
  useEffect(() => {
    log(`refetch ${id}`);
  }, [id, refreshKey, log]);
  return null;
};
