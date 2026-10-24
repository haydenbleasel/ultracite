// B06: the dependency is an object built during render, so the effect runs after every render.
// Oxlint's dangerous fix removes it, which runs the effect once and misses id changes.
import { useEffect, useState } from "react";

declare const log: (s: string) => void;

export const Subject = ({ id }: { id: string }) => {
  const [n, setN] = useState(0);
  const opts = { id };
  useEffect(() => {
    log(`load ${opts.id}`);
  }, [opts]);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
};
