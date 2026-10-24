// B09, by hand: copy the node into the effect, as the rule's message says.
import { useEffect, useRef } from "react";

export const Subject = ({ log }: { log: (s: string) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    log(`setup ${node ? "node" : "null"}`);
    return () => log(`cleanup ${node ? "node" : "null"}`);
  }, [log]);
  return <div ref={ref} />;
};
