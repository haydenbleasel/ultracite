// B07, by hand: read the trigger in the effect so every linter sees why it's there.
import { useEffect } from "react";

export const Subject = ({ id, refreshKey, log }: { id: string; refreshKey: number; log: (s: string) => void }) => {
  useEffect(() => {
    log(`refetch ${id} (${refreshKey})`);
  }, [id, refreshKey, log]);
  return null;
};
