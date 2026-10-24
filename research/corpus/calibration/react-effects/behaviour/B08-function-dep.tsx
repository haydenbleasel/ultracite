// B08: the missing dependency is a function built during render that the button uses too. ESLint's
// first suggestion adds it (the effect then runs after every render); its next suggestion wraps the
// function in useCallback with no dependency array, which still returns a new function each render.
// (useCallback is imported, unused, because that suggestion doesn't add the import.)
import { useCallback, useEffect, useState } from "react";

export const Subject = ({ roomId, log }: { roomId: string; log: (s: string) => void }) => {
  const [n, setN] = useState(0);
  const connect = () => log(`connect ${roomId}`);
  useEffect(() => {
    connect();
  }, []);
  return (
    <button onClick={() => { connect(); setN(n + 1); }}>{n}</button>
  );
};
