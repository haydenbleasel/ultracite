// B06, by hand: depend on the primitive the effect reads.
import { useEffect, useState } from "react";

declare const log: (s: string) => void;

export const Subject = ({ id }: { id: string }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    log(`load ${id}`);
  }, [id]);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
};
