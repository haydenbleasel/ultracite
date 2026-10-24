// B09: the cleanup reads ref.current, which the rule warns may have changed by then.
import { useEffect, useRef } from "react";

export const Subject = ({ log }: { log: (s: string) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log(`setup ${ref.current ? "node" : "null"}`);
    return () => log(`cleanup ${ref.current ? "node" : "null"}`);
  }, [log]);
  return <div ref={ref} />;
};
