// B08, by hand: memoise the function on what it reads.
import { useCallback, useEffect, useState } from "react";

export const Subject = ({ roomId, log }: { roomId: string; log: (s: string) => void }) => {
  const [n, setN] = useState(0);
  const connect = useCallback(() => log(`connect ${roomId}`), [roomId, log]);
  useEffect(() => {
    connect();
  }, [connect]);
  return (
    <button onClick={() => { connect(); setN(n + 1); }}>{n}</button>
  );
};
